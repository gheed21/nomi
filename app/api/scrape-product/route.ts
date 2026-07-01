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

// ─── Bot-block detection ──────────────────────────────────────────────────────

// Only user-facing block messages — NOT vendor script names (perimeterx, datadome,
// cloudflare, akamai etc.) since those appear in every page from sites using those
// services, even when the content loads successfully. False-positiving on vendor names
// was blocking ASOS product pages that had loaded completely.
const BLOCK_SIGNALS = [
  "access denied",
  "you have been blocked",
  "please verify you are human",
  "prove you are human",
  "403 forbidden",
  "enable javascript and cookies to continue",
  "checking your browser before accessing",
  "ray id",           // Cloudflare challenge page signature
  "please complete the security check",
];

function isBlockedPage(html: string, status: number): boolean {
  if (status === 403 || status === 429 || status === 503) return true;
  // A full product page is always large. If we got > 100KB back with a 200,
  // it's not a block page — don't scan vendor script names that appear in real content.
  if (status === 200 && html.length > 100_000) return false;
  const lower = html.toLowerCase();
  return BLOCK_SIGNALS.some(s => lower.includes(s));
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let targetUrl = "";
  try {
    const { url } = await req.json() as { url: string };
    targetUrl = url;
    if (!url) { console.error("[scrape] no URL provided"); return NextResponse.json({ success: false }); }

    console.log(`[scrape] ── START ── url: ${url}`);
    console.log(`[scrape] BEE_KEY present: ${!!BEE_KEY} length: ${BEE_KEY.length}`);

    // ── Fetch rendered HTML via ScrapingBee ───────────────────────────────────
    const bee = new ScrapingBeeClient(BEE_KEY);
    let beeRes: Awaited<ReturnType<typeof bee.get>>;
    try {
      beeRes = await bee.get({ url, params: { render_js: true, premium_proxy: true, country_code: "us" } });
    } catch (beeErr: unknown) {
      const e = beeErr as { response?: { status?: number; data?: unknown }; message?: string; code?: string };
      const errStatus = e.response?.status ?? "no-status";
      const errBody   = e.response?.data != null
        ? Buffer.isBuffer(e.response.data)
          ? e.response.data.toString("utf-8").slice(0, 500)
          : String(e.response.data).slice(0, 500)
        : "no-body";
      console.error(`[scrape] ScrapingBee threw — status:${errStatus} code:${e.code ?? "n/a"} message:"${e.message ?? "n/a"}" body:"${errBody}"`);
      return NextResponse.json({ success: false, blocked: false });
    }

    const beeStatus: number = (beeRes as { status?: number }).status ?? 200;
    // ScrapingBee passes the target site's original status in a header
    const beeHeaders = (beeRes as { headers?: Record<string, string> }).headers ?? {};
    const originalStatus = beeHeaders["spb-initial-status-code"] ?? beeHeaders["x-status-code"] ?? "unknown";
    const creditsUsed    = beeHeaders["spb-cost"] ?? "unknown";
    const resolvedUrl    = beeHeaders["spb-resolved-url"] ?? "unknown";
    const html = beeRes.data.toString("utf-8");

    console.log(`[scrape] ScrapingBee HTTP status: ${beeStatus}`);
    console.log(`[scrape] Target original status: ${originalStatus}  Credits used: ${creditsUsed}`);
    console.log(`[scrape] Resolved URL: ${resolvedUrl}`);
    console.log(`[scrape] Response body length: ${html.length} chars`);
    console.log(`[scrape] Body first 500 chars: "${html.slice(0, 500).replace(/\n/g, " ")}"`);

    if (beeStatus === 401 || beeStatus === 402) {
      console.error(`[scrape] ScrapingBee API key issue — status: ${beeStatus}. Check account credits or key validity.`);
      return NextResponse.json({ success: false, blocked: false });
    }
    if (beeStatus === 429) {
      console.error(`[scrape] ScrapingBee rate-limited — status: 429.`);
      return NextResponse.json({ success: false, blocked: false });
    }

    if (isBlockedPage(html, beeStatus)) {
      console.error(`[scrape] bot-blocked — status:${beeStatus} url:${url} html_snippet:"${html.slice(0, 200)}"`);
      return NextResponse.json({ success: false, blocked: true });
    }

    // ── 1. OpenGraph extraction ───────────────────────────────────────────────
    let name  = extractMeta(html, "og:title");
    let image = extractMeta(html, "og:image");
    let price = extractMeta(html, "product:price:amount") || extractMeta(html, "og:price:amount");
    let store = extractMeta(html, "og:site_name");
    console.log(`[scrape] OG → name:"${name}" image:"${image?.slice(0,60)}" price:"${price}" store:"${store}"`);

    // ── 1b. Shopify product JSON — 0 credits, returns product_type + cleaner image ─
    // og:image on Shopify is the featured/hero image, which for lifestyle brands is
    // often an editorial shot showing a full outfit rather than the isolated product.
    // images[1] from the product JSON is typically a secondary angle that shows the
    // product alone. product_type ("Women:Bottoms:Leggings") is used as textual context
    // for the vision model so it can correct for bad image selection.
    let productType = "";
    // Detect Shopify by page URL path (/products/ is Shopify-specific) or CDN hostname.
    // Custom-domain Shopify stores (e.g. aloyoga.com) serve og:image from their own domain
    // with the path cdn/shop/files — not from cdn.shopify.com — so check both signals.
    const isShopify = url.includes("/products/") &&
      (image.includes("cdn.shopify.com") || image.includes("cdn/shop/files") || image.includes("shopify"));
    if (isShopify) {
      try {
        const urlObj    = new URL(url);
        const hMatch    = urlObj.pathname.match(/\/products\/([^/?#]+)/);
        if (hMatch) {
          const jsonUrl = `${urlObj.origin}/products/${hMatch[1]}.json`;
          console.log(`[scrape] Shopify JSON → ${jsonUrl.slice(0, 80)}`);
          const jr = await fetch(jsonUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; Nomi/1.0)" },
            signal:  AbortSignal.timeout(4000),
          });
          if (jr.ok) {
            const pd = await jr.json() as { product?: { product_type?: string; images?: { src: string }[] } };
            const prod = pd.product;
            productType = prod?.product_type ?? "";
            if (prod?.images && prod.images.length >= 2) {
              image = prod.images[1].src;   // secondary angle — product-isolated
              console.log(`[scrape] Shopify JSON → type:"${productType}" images[1]:"${image.slice(0, 80)}"`);
            } else {
              console.log(`[scrape] Shopify JSON → type:"${productType}" (only 1 image, keeping og:image)`);
            }
          }
        }
      } catch (se: unknown) {
        console.warn(`[scrape] Shopify JSON fetch failed: ${se instanceof Error ? se.message : String(se)}`);
      }
    }

    // ── 1c. Gender/department detection ──────────────────────────────────────
    // Primary: Shopify product_type prefix ("Women:Bottoms:Leggings" → "Women's").
    // Fallback: URL path segment (/womens/, /mens/, /kids/) — works for any retailer.
    // Canonical values match Onboarding's GENDER_OPTIONS: "Women's" | "Men's" | "Kids" | "Unisex".
    let detectedGender = "";
    if (productType) {
      const prefix = productType.split(":")[0].trim().toLowerCase();
      if (prefix === "women" || prefix === "woman")                              detectedGender = "Women's";
      else if (prefix === "men" || prefix === "man")                             detectedGender = "Men's";
      else if (["kids", "children", "boys", "girls", "baby"].includes(prefix))  detectedGender = "Kids";
      else if (prefix === "unisex" || prefix === "gender neutral")               detectedGender = "Unisex";
    }
    if (!detectedGender) {
      const pathname = (() => { try { return new URL(url).pathname.toLowerCase(); } catch { return ""; } })();
      // Allow /, ., -, or end-of-string after the keyword so we catch /women/, /woman/, /women.html etc.
      const seg = (word: string) => new RegExp(`(?:^|/)${word}(?:/|\\.|\\-|$)`);
      if      (seg("wom(?:en|an)s?").test(pathname))                              detectedGender = "Women's";
      else if (seg("m(?:en|an)s?").test(pathname))                                detectedGender = "Men's";
      else if (seg("kids?|children|boys?|girls?|baby").test(pathname))            detectedGender = "Kids";
      else if (seg("unisex").test(pathname))                                       detectedGender = "Unisex";
    }
    if (detectedGender) console.log(`[scrape] detected gender: "${detectedGender}" (from ${productType ? "product_type" : "URL path"})`);

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
    console.log(`[scrape] after fallbacks → name:"${name}" price:"${price}" store:"${store}"`);

    if (!name && !image) {
      console.error(`[scrape] no name or image found after parsing — possible partial block or unsupported page structure. html_snippet:"${html.slice(0, 200)}"`);
      return NextResponse.json({ success: false, blocked: false });
    }

    // ── 4. Resolve and fetch image ────────────────────────────────────────────
    const imageUrl = resolveImageUrl(image, url);
    if (!imageUrl) { console.error("[scrape] could not resolve image URL"); return NextResponse.json({ success: false }); }
    console.log(`[scrape] fetching image: ${imageUrl.slice(0, 80)}`);

    const imgRes = await fetch(imageUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Nomi/1.0)" },
      redirect: "follow",
    });
    if (!imgRes.ok) {
      console.error(`[scrape] image fetch failed: ${imgRes.status} ${imgRes.statusText}`);
      return NextResponse.json({ success: false });
    }

    const buffer = await imgRes.arrayBuffer();
    console.log(`[scrape] image buffer size: ${buffer.byteLength} bytes`);
    if (buffer.byteLength > 4 * 1024 * 1024) {
      console.error("[scrape] image too large (> 4MB)");
      return NextResponse.json({ success: false });
    }

    // Normalize content-type and validate it's actually an image
    const rawCT = (imgRes.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const VALID = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    let mimeType = VALID.includes(rawCT) ? rawCT : "";
    console.log(`[scrape] image content-type: "${rawCT}" → mimeType: "${mimeType}"`);

    // Detect from magic bytes when content-type is missing or generic (e.g. CDN returns HTML)
    if (!mimeType) {
      const b = new Uint8Array(buffer.slice(0, 12));
      if      (b[0] === 0xFF && b[1] === 0xD8)                         mimeType = "image/jpeg";
      else if (b[0] === 0x89 && b[1] === 0x50)                         mimeType = "image/png";
      else if (b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57 && b[9] === 0x45) mimeType = "image/webp";
      else if (b[0] === 0x47 && b[1] === 0x49)                         mimeType = "image/gif";
      console.log(`[scrape] magic-byte detection → mimeType: "${mimeType}"`);
    }

    if (!mimeType) {
      console.error("[scrape] image is not a valid image type (possibly HTML/bot-block response)");
      return NextResponse.json({ success: false });
    }

    const imageData = `data:${mimeType};base64,${Buffer.from(buffer).toString("base64")}`;
    console.log(`[scrape] success — name:"${name}" store:"${store}" price:"${price}" imageDataLen:${imageData.length}`);

    return NextResponse.json({
      success:        true,
      name:           name  || "Product",
      image:          imageData,
      price:          cleanPrice(price),
      store:          store  || host.replace("www.", ""),
      productType:    productType    || undefined,
      detectedGender: detectedGender || undefined,
    });
  } catch (err: unknown) {
    const e = err as { message?: string; stack?: string; code?: string; response?: { status?: number } };
    console.error(`[scrape] unhandled error for "${targetUrl}" — message:"${e.message ?? "n/a"}" code:"${e.code ?? "n/a"}" httpStatus:${e.response?.status ?? "n/a"}`);
    if (e.stack) console.error(`[scrape] stack: ${e.stack.split("\n").slice(0, 4).join(" | ")}`);
    return NextResponse.json({ success: false });
  }
}
