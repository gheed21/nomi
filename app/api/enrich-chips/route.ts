import { NextRequest, NextResponse } from "next/server";

const SERPAPI_KEY = process.env.SERPAPI_KEY ?? "";

type EnrichResult = { verified: boolean; image: string | null; productLink: string | null };

type SerpResult = {
  title?: string;
  source?: string;
  thumbnail?: string;
  link?: string;
  product_link?: string;
};

// Returns true if at least one content word from the extracted item name
// actually appears in the result title. This prevents a store match from
// passing verification just because the store name is in the query —
// e.g. "Banana Republic" @ Mango returns Mango results, but the titles
// won't contain "banana" or "republic", so the chip is correctly suppressed.
const TITLE_STOP = new Set([
  "the","a","an","at","in","on","for","of","and","or","with","from","by","to",
  "its","is","are","was","were","not","but","this","that","has","have","had",
]);

function itemAppearsInTitle(item: string, title: string): boolean {
  const contentWords = item.toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 2 && !TITLE_STOP.has(w));
  if (!contentWords.length) return false;
  const t = title.toLowerCase();
  return contentWords.some(w => t.includes(w));
}

// Reads width/height from raw JPEG/PNG/WebP bytes without fetching an image library.
// WebP support matters here specifically because Google's gstatic thumbnail CDN
// (the source of Shopping thumbnails) serves WebP by default to non-browser clients.
function getImageDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset + 8 < buf.length) {
      if (buf[offset] !== 0xff) break;
      const marker = buf[offset + 1];
      if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
      const segLen = buf.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
      }
      offset += 2 + segLen;
    }
  }
  if (buf.length > 30 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const fourCC = buf.toString("ascii", 12, 16);
    if (fourCC === "VP8 " && buf[23] === 0x9d && buf[24] === 0x01 && buf[25] === 0x2a) {
      return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    }
    if (fourCC === "VP8L" && buf[20] === 0x2f) {
      const bits = buf.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (fourCC === "VP8X") {
      const width  = (buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1;
      const height = (buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1;
      return { width, height };
    }
  }
  return null;
}

// Google Shopping thumbnails are sometimes a retailer's full-outfit lifestyle
// photo rather than an isolated product shot (e.g. a model wearing the
// recommended shoe as one small part of a head-to-toe look). Genuine isolated
// product photos from Shopping listings come back consistently near-square;
// lifestyle/editorial shots are noticeably taller (portrait) or wider
// (landscape). This is a heuristic, not a guarantee — it won't catch every
// mismatch, but it filters the common case.
async function isLikelyProductPhoto(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    const dims = getImageDimensions(buf);
    if (!dims || !dims.width || !dims.height) return true; // couldn't parse — don't block on it
    const ratio = dims.width / dims.height;
    return ratio >= 0.8 && ratio <= 1.25;
  } catch {
    return true; // fetch failed — don't block the chip on this check
  }
}

// HEAD-checks a product URL before surfacing it. Returns the productLink if
// live, or falls back to the store's own search URL if the link is dead (404,
// 403, network error, or timeout). 3s timeout so happy-path adds minimal latency.
async function checkLink(productLink: string | null, searchUrl: string): Promise<string | null> {
  if (!productLink) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);
  try {
    const res = await fetch(productLink, { method: "HEAD", signal: ctrl.signal, redirect: "follow" });
    clearTimeout(timer);
    return res.ok ? productLink : searchUrl;
  } catch {
    clearTimeout(timer);
    return searchUrl;
  }
}

async function verifyChip(item: string, store: string, searchUrl: string): Promise<EnrichResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    const q   = encodeURIComponent(`${item} ${store}`.trim());
    const url = `https://serpapi.com/search.json?engine=google_shopping&q=${q}&num=3&api_key=${SERPAPI_KEY}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return { verified: false, image: null, productLink: null };

    const data = await res.json() as { shopping_results?: SerpResult[] };
    const storeNorm = store.toLowerCase().replace(/[^a-z0-9]/g, "");

    for (const r of data.shopping_results ?? []) {
      const sourceNorm = (r.source ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const storeMatch = storeNorm.length >= 2 && sourceNorm.includes(storeNorm);
      const titleMatch = itemAppearsInTitle(item, r.title ?? "");
      if (storeMatch && titleMatch) {
        const rawLink = r.link ?? r.product_link ?? null;
        const productLink = await checkLink(rawLink, searchUrl);
        const thumbnailOk = r.thumbnail ? await isLikelyProductPhoto(r.thumbnail) : false;
        return {
          verified:    true,
          image:       thumbnailOk ? r.thumbnail! : null,
          productLink,
        };
      }
    }
    return { verified: false, image: null, productLink: null };
  } catch {
    clearTimeout(timer);
    return { verified: false, image: null, productLink: null };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { chips } = await req.json() as { chips: { item: string; store: string; searchUrl?: string }[] };
    if (!Array.isArray(chips) || !chips.length) {
      return NextResponse.json({ results: [] });
    }

    // No SerpAPI key: pass all chips through so they still render (old behaviour).
    if (!SERPAPI_KEY) {
      return NextResponse.json({
        results: chips.map(() => ({ verified: true, image: null, productLink: null })),
      });
    }

    const settled = await Promise.allSettled(chips.map(c => verifyChip(c.item, c.store, c.searchUrl ?? "")));
    const results: EnrichResult[] = settled.map(r =>
      r.status === "fulfilled" ? r.value : { verified: false, image: null, productLink: null },
    );

    console.log("[enrich-chips]", results.map((r, i) =>
      `"${chips[i].item}" @ ${chips[i].store} → verified:${r.verified} image:${!!r.image}`
    ));

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[enrich-chips] error:", err);
    return NextResponse.json({ results: [] });
  }
}
