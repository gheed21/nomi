import { ScrapingBeeClient } from "scrapingbee";
import { NextRequest, NextResponse } from "next/server";

const BEE_KEY = process.env.SCRAPINGBEE_API_KEY ?? "";

// ─── HTML helpers ─────────────────────────────────────────────────────────────

function extractMeta(html: string, property: string): string {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/:/g, ":");
  const m =
    html.match(new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i")) ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["']`, "i")) ??
    html.match(new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i")) ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escaped}["']`, "i"));
  return m?.[1]?.trim() ?? "";
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim();
}

// Finds an element with the given class, then the first <tag> inside it
function findChildTag(html: string, parentClass: string, childTag: string): string {
  const parent = html.match(
    new RegExp(`<[^>]+class=["'][^"']*\\b${parentClass}\\b[^"']*["'][^>]*>([\\s\\S]{0,4000})`, "i")
  );
  if (!parent) return "";
  const child = parent[1].match(new RegExp(`<${childTag}[^>]*>([\\s\\S]*?)<\\/${childTag}>`, "i"));
  return child ? stripHtml(child[1]) : "";
}

// Finds a tag with a specific data attribute value
function findByDataAttr(html: string, tag: string, attr: string, val: string): string {
  const m = html.match(
    new RegExp(`<${tag}[^>]+${attr}=["']${val}["'][^>]*>([\\s\\S]*?)<\\/${tag}>`, "i")
  );
  return m ? stripHtml(m[1]) : "";
}

// Finds a tag with a specific class
function findByTagClass(html: string, tag: string, className: string): string {
  const m = html.match(
    new RegExp(`<${tag}[^>]+class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/${tag}>`, "i")
  );
  return m ? stripHtml(m[1]) : "";
}

// Finds any element with a specific class
function findByClass(html: string, className: string): string {
  const m = html.match(
    new RegExp(`<[a-z]+[^>]+class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/[a-z]+>`, "i")
  );
  return m ? stripHtml(m[1]) : "";
}

function cleanPrice(raw: string): string {
  if (!raw) return "";
  const t = raw.trim();
  if (/^[$€£¥₹]/.test(t)) return t;
  if (/^\d/.test(t)) return `$${t}`;
  return t;
}

function resolveImageUrl(url: string, base: string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return `https:${url}`;
  try { return new URL(url, base).href; } catch { return url; }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json() as { url: string };
    if (!url) return NextResponse.json({ success: false });

    // Fetch rendered HTML via ScrapingBee
    const bee = new ScrapingBeeClient(BEE_KEY);
    const beeRes = await bee.get({ url, params: { render_js: true } });
    const html = beeRes.data.toString("utf-8");

    // ── 1. OpenGraph extraction ───────────────────────────────────────────────
    let name  = extractMeta(html, "og:title");
    let image = extractMeta(html, "og:image");
    let price = extractMeta(html, "product:price:amount") || extractMeta(html, "og:price:amount");
    let store = extractMeta(html, "og:site_name");

    // ── 2. Store-specific fallbacks ───────────────────────────────────────────
    const host = (() => { try { return new URL(url).hostname.toLowerCase(); } catch { return ""; } })();

    if (host.includes("zara")) {
      if (!name)  name  = findChildTag(html, "product-detail-info", "h1");
      if (!price) price = findByClass(html, "price");
      if (!store) store = "Zara";
    } else if (host.includes("asos")) {
      if (!name)  name  = findByDataAttr(html, "h1", "data-id", "product-title");
      if (!price) price = findByDataAttr(html, "span", "data-id", "current-price");
      if (!store) store = "ASOS";
    } else if (host.includes("hm.com") || host.includes("h-m.com")) {
      if (!name)  name  = findByTagClass(html, "h1", "product-item-headline");
      if (!price) price = findByClass(html, "product-item-price");
      if (!store) store = "H&M";
    }

    // ── 3. Generic fallbacks ──────────────────────────────────────────────────
    if (!name) name = html.match(/<title[^>]*>([^<|–-]+)/i)?.[1]?.trim() ?? "";
    if (!name) name = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]?.trim() ?? "";
    if (!price) price = extractMeta(html, "price");

    // Strip " | StoreName" or " - StoreName" suffixes OG titles often include
    if (name) name = name.split(/\s+[|–\-]\s+/)[0].trim();

    if (!name && !image) return NextResponse.json({ success: false });

    // ── 4. Resolve and fetch image ────────────────────────────────────────────
    const imageUrl = resolveImageUrl(image, url);
    if (!imageUrl) return NextResponse.json({ success: false });

    const imgRes = await fetch(imageUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Nomi/1.0)" },
    });
    if (!imgRes.ok) return NextResponse.json({ success: false });

    const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
    const buffer = await imgRes.arrayBuffer();
    if (buffer.byteLength > 4 * 1024 * 1024) return NextResponse.json({ success: false });

    const imageData = `data:${contentType};base64,${Buffer.from(buffer).toString("base64")}`;

    return NextResponse.json({
      success: true,
      name:  name  || "Product",
      image: imageData,
      price: cleanPrice(price),
      store: store  || host.replace("www.", ""),
    });
  } catch (err) {
    console.error("Scrape error:", err);
    return NextResponse.json({ success: false });
  }
}
