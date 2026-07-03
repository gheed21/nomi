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
        return {
          verified:    true,
          image:       r.thumbnail ?? null,
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
