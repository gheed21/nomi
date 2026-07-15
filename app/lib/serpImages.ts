import { STORE_SEARCH, FALLBACK_STORES } from "@/app/lib/storeSearch";

// SerpAPI-backed product image lookup. Shared by /api/analyze (outfit matches)
// and /api/for-you (personalized picks) so both enrich items with real photos
// through the same confidence/fallback pipeline instead of two copies drifting.

const SERPAPI_KEY = process.env.SERPAPI_KEY ?? "";

type SerpShoppingResult = {
  title?: string;
  source?: string;
  link?: string;         // direct store URL — present on paid SerpAPI plans
  product_link?: string; // Google Shopping product page — present on free plan
  thumbnail?: string;
  price?: string;
  extracted_price?: number;
};

export type RawMatch = {
  name: string;
  store?: string;
  price?: string;
  searchUrl?: string;
  [key: string]: unknown;
};

// Shared by /api/for-you and /api/trend-picks, which both ask the model for
// lines in the controlled format "... at <Store> [<search term>]" rather than
// scanning free-form chat text the way extractStoreLinks() does. Store name
// uses [^\[\]] rather than a Latin-only class so accented names (Polène,
// Sézane, Totème) still match — an earlier ASCII-only class silently dropped
// every pick at those stores.
const ITEM_SENTENCE_PATTERN = /^(.*?)\s+at\s+([^[\]]+?)\s*\[([^\]]{2,40})\]\s*$/i;

export function parseItemSentence(itemSentence: string): { name: string; store: string } | null {
  const m = itemSentence.match(ITEM_SENTENCE_PATTERN);
  if (!m) return null;
  const [, , storeName, searchTerm] = m;
  return { name: searchTerm.trim(), store: storeName.trim() };
}

function normalizeStoreName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseAiPriceLow(price?: string): number | null {
  if (!price) return null;
  const nums = price.match(/\d+(?:\.\d+)?/g);
  if (!nums?.length) return null;
  return parseFloat(nums[0]); // lower bound of range
}

function passesConfidence(result: SerpShoppingResult, match: RawMatch): boolean {
  // Signal 1: store name appears in result source
  const storeNorm  = normalizeStoreName(match.store ?? "");
  const sourceNorm = normalizeStoreName(result.source ?? "");
  const storeMatch = storeNorm.length >= 2 && sourceNorm.includes(storeNorm);

  // Signal 2: price within 20% of AI lower bound
  const aiLow    = parseAiPriceLow(match.price);
  const serpPrice = result.extracted_price ?? null;
  const priceMatch =
    aiLow !== null && serpPrice !== null && aiLow > 0 &&
    Math.abs(serpPrice - aiLow) / aiLow <= 0.20;

  return storeMatch || priceMatch;
}

async function fetchSerpImage(
  match: RawMatch,
): Promise<{ image: string | null; productLink: string | null }> {
  if (!SERPAPI_KEY) return { image: null, productLink: null };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    const q   = encodeURIComponent(`${match.name} ${match.store ?? ""}`.trim());
    const url = `https://serpapi.com/search.json?engine=google_shopping&q=${q}&num=3&api_key=${SERPAPI_KEY}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[serp] non-200 for "${match.name}": ${res.status}`);
      return { image: null, productLink: null };
    }

    const data = await res.json() as { shopping_results?: SerpShoppingResult[] };
    const results = data.shopping_results ?? [];

    for (const r of results) {
      if (passesConfidence(r, match)) {
        // product_link = Google Shopping product page (free plan)
        // link         = direct store URL (paid plan only)
        // null         → enrichMatchesWithImages will use buildStoreSearchUrl
        const productLink = r.link ?? r.product_link ?? null;
        console.log(`[serp] ✓ "${match.name}" — source:"${r.source}" price:${r.extracted_price} productLink:${productLink?.slice(0, 60) ?? "null"}`);
        return {
          image:       r.thumbnail ?? null,
          productLink,
        };
      }
    }
    console.log(`[serp] ✗ "${match.name}" — no confident result from ${results.length} hits`);
    return { image: null, productLink: null };
  } catch (e: unknown) {
    clearTimeout(timer);
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[serp] error for "${match.name}": ${msg}`);
    return { image: null, productLink: null };
  }
}

// Tier-2: broader search using item name only, no store, no confidence check.
// Takes the first result with a thumbnail. Used when tier-1 confidence fails.
async function fetchSerpImageBroad(
  match: RawMatch,
): Promise<{ image: string | null; productLink: string | null }> {
  if (!SERPAPI_KEY) return { image: null, productLink: null };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    const q   = encodeURIComponent(match.name.trim());
    const url = `https://serpapi.com/search.json?engine=google_shopping&q=${q}&num=3&api_key=${SERPAPI_KEY}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return { image: null, productLink: null };

    const data = await res.json() as { shopping_results?: SerpShoppingResult[] };
    const results = data.shopping_results ?? [];

    for (const r of results) {
      if (r.thumbnail) {
        const productLink = r.link ?? r.product_link ?? null;
        console.log(`[serp] ~broad ✓ "${match.name}" — source:"${r.source}" thumb:${r.thumbnail.slice(0, 60)}`);
        return { image: r.thumbnail, productLink };
      }
    }
    console.log(`[serp] ~broad ✗ "${match.name}" — no thumbnail from ${results.length} hits`);
    return { image: null, productLink: null };
  } catch (e: unknown) {
    clearTimeout(timer);
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[serp] ~broad error for "${match.name}": ${msg}`);
    return { image: null, productLink: null };
  }
}

// Chains tier-1 (confident) → tier-2 (broad) per match, all 3 run in parallel.
async function fetchSerpImageWithFallback(
  match: RawMatch,
): Promise<{ image: string | null; productLink: string | null; imageTier: "confident" | "broad" | null }> {
  const t1 = await fetchSerpImage(match);
  if (t1.image) return { ...t1, imageTier: "confident" };

  const t2 = await fetchSerpImageBroad(match);
  if (t2.image) return { ...t2, imageTier: "broad" };

  return { image: null, productLink: null, imageTier: null };
}

// ─── Store-scoped search URL fallback ────────────────────────────────────────
// Used when SerpAPI confidence check fails so the card still links somewhere
// useful — the store's own search — rather than a generic Google query with
// the store name as a keyword (which returns results from every retailer).

export function buildStoreSearchUrl(store: string, name: string): string {
  const key = store.toLowerCase().trim();
  const q   = encodeURIComponent(name);
  if (STORE_SEARCH[key]) return STORE_SEARCH[key](q);
  // Partial match handles "Zara USA", "shop.mango.com", "H&M Store", etc. — only
  // the safe direction (does the AI's raw store string contain a known canonical
  // key?). The reverse direction (a short extracted root found inside some
  // unrelated longer key) used to run here too, but a 3-letter root like "pol"
  // (from "Polène") matches as a substring of "anthropologie" — a real false
  // match that sent Polène recommendations to Anthropologie's search page.
  for (const [pattern, builder] of Object.entries(STORE_SEARCH)) {
    if (key.includes(pattern)) return builder(q);
  }
  // Known store, just no reliable direct search URL (e.g. Mango, Everlane) —
  // include the store name in the query so results aren't a random grab-bag
  // of every retailer that carries a similar item.
  const known = FALLBACK_STORES.find(s => key.includes(s.key));
  if (known) return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(`${name} ${known.displayName}`)}`;
  // Genuinely unrecognized store name (e.g. AI hallucination): drop it from the
  // query rather than risk a zero-result search on Google Shopping's stricter matching.
  return `https://www.google.com/search?tbm=shop&q=${q}`;
}

type Enriched<T> = T & { image: string | null; imageTier: "confident" | "broad" | null; productLink: string };

export async function enrichMatchesWithImages<T extends RawMatch>(matches: T[]): Promise<Enriched<T>[]> {
  if (!SERPAPI_KEY) {
    console.log("[serp] SERPAPI_KEY not set — skipping image enrichment");
    // Still compute a real link for every match — callers without their own
    // searchUrl fallback (e.g. /api/for-you) would otherwise get an undefined URL.
    return matches.map(m => ({
      ...m,
      image: null,
      imageTier: null,
      productLink: buildStoreSearchUrl(m.store ?? "", m.name ?? ""),
    }));
  }

  // All run in parallel; each chains tier-1 → tier-2 internally if needed.
  const settled = await Promise.allSettled(matches.map(m => fetchSerpImageWithFallback(m)));

  return matches.map((m, i) => {
    const r = settled[i];
    const { image, productLink, imageTier } =
      r.status === "fulfilled" ? r.value : { image: null, productLink: null, imageTier: null };
    return {
      ...m,
      image,
      imageTier,
      productLink: productLink ?? buildStoreSearchUrl(m.store ?? "", m.name ?? ""),
    };
  });
}
