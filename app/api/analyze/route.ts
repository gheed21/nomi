import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { STORE_SEARCH, FALLBACK_STORES } from "@/app/lib/storeSearch";

// ─── SerpAPI image enrichment ─────────────────────────────────────────────────

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

type RawMatch = {
  name: string;
  store?: string;
  price?: string;
  searchUrl?: string;
  [key: string]: unknown;
};

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
// STORE_SEARCH is imported from @/app/lib/storeSearch (shared with chat).

function buildStoreSearchUrl(store: string, name: string): string {
  const key = store.toLowerCase().trim();
  const q   = encodeURIComponent(name);
  if (STORE_SEARCH[key]) return STORE_SEARCH[key](q);
  // First alphanumeric token, e.g. "zara" from "zara usa" — used for fuzzy
  // matching below. Must be >= 3 chars so short/symbol fragments (the "&" in
  // "& other stories" splitting to just "&") can't false-match unrelated
  // stores like "h&m" that merely happen to contain that character.
  const storeRootMatch = key.match(/[a-z0-9]{3,}/);
  const storeRoot = storeRootMatch ? storeRootMatch[0] : null;
  // Partial match handles "Zara USA", "shop.mango.com", "H&M Store", etc.
  if (storeRoot) {
    for (const [pattern, builder] of Object.entries(STORE_SEARCH)) {
      if (key.includes(pattern) || pattern.includes(storeRoot)) return builder(q);
    }
  }
  // Known store, just no reliable direct search URL (e.g. Mango, Everlane) —
  // include the store name in the query so results aren't a random grab-bag
  // of every retailer that carries a similar item.
  const known = FALLBACK_STORES.find(s => key.includes(s.key) || (storeRoot && s.key.includes(storeRoot)));
  if (known) return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(`${name} ${known.displayName}`)}`;
  // Genuinely unrecognized store name (e.g. AI hallucination): drop it from the
  // query rather than risk a zero-result search on Google Shopping's stricter matching.
  return `https://www.google.com/search?tbm=shop&q=${q}`;
}

async function enrichMatchesWithImages(matches: RawMatch[]): Promise<RawMatch[]> {
  if (!SERPAPI_KEY) {
    console.log("[serp] SERPAPI_KEY not set — skipping image enrichment");
    return matches;
  }

  // All 3 run in parallel; each chains tier-1 → tier-2 internally if needed.
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

const client = new Anthropic();

type Filters = {
  colors?:              string[];
  customColor?:         string;
  priceRange?:          [number, number];
  sortOrder?:           "low-high" | "high-low";
  itemCategories?:      string[];   // multi-select (new)
  itemCategory?:        string;     // legacy single-select fallback
  itemSubcategories?:   string[];
  secondhandOnly?:      boolean;
  recommendationStyle?: "specific" | "direction";
  description?:         string;
  gender?:              string;     // "Women's" | "Men's" | "Kids" | "Unisex" | ""
};

type TasteProfile = {
  styles?:            string[];
  styleDescription?:  string;
  gender?:            string;
  neverWear?:         string;
  budgetMin?:         number;
  budgetMax?:         number;
  styleInfluencers?:       string;
  lifeStage?:              string;
  lifeStageDescription?:   string;
  shoppingTier?:           string;
  shoppingTierDescription?: string;
  fitPreferences?:    string;
  sizing?:            Record<string, string>;
};

type FeedbackSignal = { store?: string; category?: string; price?: string; aesthetic?: string };
type FeedbackStore  = { positive?: FeedbackSignal[]; negative?: FeedbackSignal[] };

function buildFeedbackSection(fb?: FeedbackStore | null): string {
  if (!fb) return "";
  const lines: string[] = [];

  function summarise(signals: FeedbackSignal[]): string {
    const recent = signals.slice(0, 5);
    const parts: string[] = [];
    const stores     = [...new Set(recent.map(s => s.store).filter(Boolean))] as string[];
    const categories = [...new Set(recent.map(s => s.category).filter(Boolean))] as string[];
    const aesthetics = [...new Set(recent.map(s => s.aesthetic).filter(Boolean))] as string[];
    if (stores.length)     parts.push(`stores like ${stores.join(", ")}`);
    if (categories.length) parts.push(`${categories.join(", ")} items`);
    if (aesthetics.length) parts.push(`${aesthetics.join(", ")} aesthetic`);
    return parts.join("; ");
  }

  const pos = (fb.positive ?? []).filter(s => s.store || s.category || s.aesthetic);
  const neg = (fb.negative ?? []).filter(s => s.store || s.category || s.aesthetic);
  if (pos.length) lines.push(`User prefers more of: ${summarise(pos)}.`);
  if (neg.length) lines.push(`User wants less of: ${summarise(neg)}.`);
  if (!lines.length) return "";
  return `\n${lines.join("\n")}\nWeight recommendations accordingly.`;
}

function buildTasteSection(tp?: TasteProfile | null): string {
  if (!tp) return "";
  const lines: string[] = [];
  if (tp.gender && tp.gender !== "All") {
    lines.push(`Shopping for: ${tp.gender} clothing only. Only suggest items from the ${tp.gender.toLowerCase()} section.`);
  }
  if (tp.neverWear && tp.neverWear.trim()) {
    lines.push(`Never suggest: ${tp.neverWear.trim()}. The user does not wear these under any circumstances — exclude them from every recommendation.`);
  }
  if (tp.styles && tp.styles.length > 0 && !tp.styles.includes("I have no idea")) {
    lines.push(`User's style aesthetic: ${tp.styles.join(", ")}.`);
  }
  if (tp.styleDescription) {
    lines.push(`User's own style description: "${tp.styleDescription}"`);
  }
  if (tp.lifeStage && tp.lifeStage !== "Prefer not to say") {
    lines.push(`Life stage: ${tp.lifeStage}.`);
  }
  if (tp.lifeStageDescription) {
    lines.push(`Life stage (own words): "${tp.lifeStageDescription}"`);
  }
  if (tp.shoppingTier) {
    lines.push(`Shopping tier: ${tp.shoppingTier}.`);
  }
  if (tp.shoppingTierDescription) {
    lines.push(`Shopping habit (own words): "${tp.shoppingTierDescription}"`);
  }
  if (tp.styleInfluencers) {
    lines.push(`Style inspirations: ${tp.styleInfluencers}`);
  }
  if (tp.fitPreferences) {
    lines.push(`Fit preferences: ${tp.fitPreferences}`);
  }
  if (tp.sizing && Object.keys(tp.sizing).length > 0) {
    const sizeStr = Object.entries(tp.sizing).map(([cat, size]) => `${cat}: ${size}`).join(", ");
    lines.push(`Sizing: ${sizeStr}.`);
  }
  return lines.length > 0 ? `\n${lines.join("\n")}` : "";
}

function buildCategoryGlossary(filters?: Filters): string {
  const hasCat = (filters?.itemCategories?.length ?? 0) > 0 || !!filters?.itemCategory;
  if (!hasCat) return "";
  return `
CATEGORY DEFINITIONS — use these exact definitions when matching:
TOPS:
TOPS includes all types listed. If the user mentions a specific type like halter, off-the-shoulder, turtleneck, wrap top, or peplum, match precisely rather than defaulting to a generic blouse or tee.
- Tank top: sleeveless, thin straps, fitted or loose, no collar
- Sleeveless top: no sleeves, may have wider straps or fitted armholes, distinct from a tank
- Short sleeve top: sleeves ending above or at the elbow
- Long sleeve top: sleeves extending to the wrist
- Blouse: lightweight, often flowy or semi-structured, frequently button or tie front, dressier than a casual tee
- Button-down: collared shirt with a full button placket down the front
- Sweatshirt: heavier knit, crew or round neck, casual, no hood
- Hoodie: sweatshirt with an attached hood, may have a drawstring
- Crop top: any top style cut short, ending above the natural waist
- Bodysuit: one-piece fitted garment covering torso, snaps or closes at the crotch
- Corset: structured, boned or seamed bodice, often laced or with visible structure, fitted through the waist
- Halter top: top that ties or fastens around the neck, leaving shoulders and back exposed
- Off-the-shoulder top: neckline sits below the shoulders, no straps over the shoulder
- Turtleneck: high, close-fitting neckline that folds over, covering the neck
- Wrap top: fabric crosses and ties at the front or side, often V-neck shaped
- Peplum top: fitted through the bodice with a flared ruffle at the waist

BOTTOMS:
BOTTOMS includes all types listed. If the user mentions a specific type like bootcut, skinny, pencil skirt, or joggers, match precisely rather than defaulting to a generic jeans, trousers, or skirt category.
- Jeans: denim fabric, any cut, base category
- Straight leg jeans: denim with a consistent leg width from hip to hem
- Wide leg jeans: denim with a wide, loose silhouette through the leg
- Bootcut jeans: denim that's fitted through the thigh and flares slightly at the hem
- Skinny jeans: denim fitted closely through the entire leg
- Cargo trousers: trousers with multiple utility pockets, often with flaps
- Tailored trousers: structured, creased, dressier trousers, not denim
- Wide leg trousers: loose, flowing trousers, not denim, dressier than cargo
- Shorts: any bottom ending above the knee
- Bermuda shorts: longer shorts ending at or just above the knee
- Mini skirt: skirt ending well above the knee
- Midi skirt: skirt ending between knee and ankle, typically mid-calf
- Maxi skirt: skirt reaching the ankle or floor
- Pencil skirt: fitted, straight-cut skirt, typically knee-length, no flare
- A-line skirt: skirt that flares gently from waist to hem in a triangular shape
- Leggings: stretch fabric, fitted to the leg, no structured waistband or pockets typically
- Sweatpants or joggers: relaxed fit, elastic or drawstring waist, casual knit fabric

DRESSES:
DRESSES includes all types listed. Match the specific subtype precisely when mentioned, rather than defaulting to a generic dress.
- Mini dress: dress ending well above the knee
- Midi dress: dress ending between knee and ankle, typically mid-calf
- Maxi dress: dress reaching the ankle or floor
- Slip dress: simple, often silky, thin straps, minimal structure
- Wrap dress: fabric crosses and ties at the front or side, V-neck shaped
- Bodycon dress: fitted, stretch fabric, hugs the body closely
- Shirt dress: button-front, collared, shirt-like structure in dress form
- Sweater dress: knit fabric, casual, often longer sleeves
- Halter dress: ties or fastens around the neck, shoulders and back exposed
- Off-the-shoulder dress: neckline sits below the shoulders
- A-line dress: fitted through the bodice, flares gently from waist to hem

JUMPSUITS AND ROMPERS:
JUMPSUITS AND ROMPERS includes all types listed. Match the specific subtype precisely when mentioned, rather than defaulting to a generic jumpsuit.
- Jumpsuit: one-piece garment combining top and full-length pants
- Romper: one-piece garment combining top and shorts, shorter than a jumpsuit
- Wide leg jumpsuit: jumpsuit with a loose, flowing pant leg
- Skinny jumpsuit: jumpsuit fitted closely through the leg
- Strapless jumpsuit: no straps, structured top portion
- Halter jumpsuit: ties or fastens around the neck, shoulders exposed
- Utility jumpsuit: workwear-inspired, multiple pockets, often belted
- Culotte jumpsuit: wide, cropped pant leg with a flowing, skirt-like appearance

SHOES:
- Heels: any shoe with an elevated heel, structured. HEELS includes all heel types — stiletto, kitten, wedge, platform, slingback, sandal heels, and espadrille heels. If the user's free text or selection mentions any of these specific heel types, match to that specific type precisely rather than defaulting to a generic heel.
  - Stiletto heels: thin, tall heel
  - Kitten heels: very short, thin heel, under 2 inches
  - Wedge heels: solid triangular heel, no gap between sole and heel
  - Platform heels: thick raised sole under the entire foot plus a heel
  - Slingback heels: open back with a thin strap around the ankle
  - Sandal heels: open-toe, strappy, with a heel
  - Espadrille heels: heel wrapped in jute or rope material
- Block heels: heels with a thick, stable heel shape rather than a thin stiletto
- Mules: backless shoes, no strap around the heel
- Sneakers: athletic or casual rubber-soled shoes
- Loafers: slip-on flat or low-heeled shoes, no laces, often with a moccasin-style construction
- Boots: footwear covering the ankle or higher
- Ankle boots: boots ending at or just above the ankle
- Sandals: open-toed, strappy, minimal coverage
- Flip flops: minimal sandal, thong-style toe strap
- Flats: flat-soled shoes, no heel, fully enclosed
- Platform shoes: shoes with a thick raised sole under the entire foot, not just the heel

BAGS:
BAGS includes all bag types listed. If the user's free text or selection mentions a specific bag type like bucket bag, baguette, belt bag, or top handle, match precisely to that type rather than defaulting to a generic bag category.
- Tote: large, open-top, structured or soft bag with two handles, often no closure
- Crossbody: bag worn with a long strap across the body, smaller to medium size
- Clutch: small, handheld, no strap or a very minimal wrist strap, often for evening
- Shoulder bag: medium bag with a single shoulder-length strap, worn on or under the arm
- Mini bag: any small-format bag regardless of style, smaller than typical handbag size
- Backpack: two-strap bag worn on the back
- Bucket bag: round-bottomed, drawstring-close, wider at top
- Baguette bag: small, narrow, structured bag worn under the arm, named for its loaf-like shape
- Belt bag: small bag worn around the waist or across the body on a thin strap, also called a fanny pack
- Top handle bag: structured bag with a short, rigid handle on top, often no shoulder strap

OUTERWEAR:
OUTERWEAR includes all types listed. If the user mentions a specific outerwear type like bomber, shacket, vest, or wool coat, match precisely rather than defaulting to a generic jacket or coat.
- Blazer: structured, tailored jacket, often with lapels, single or double breasted
- Leather jacket: jacket made of or styled like leather, typically moto or bomber style
- Denim jacket: jacket made of denim fabric, classic trucker style or oversized
- Coat: longer outerwear piece, knee-length or longer, structured
- Trench coat: belted, longer coat, classic collar, double-breasted front, often water-resistant fabric
- Puffer: quilted, insulated jacket, filled with down or synthetic fill
- Cardigan: knit, open-front sweater layer, buttoned or open
- Bomber jacket: short, fitted waist and cuffs, zip front, often ribbed trim
- Shacket: shirt-jacket hybrid, flannel or heavier fabric, button front, mid-weight layer
- Vest: sleeveless outerwear layer, puffer or quilted style
- Wool coat: structured coat made of wool or wool-blend fabric, dressier than a casual coat

ACCESSORIES:
ACCESSORIES includes all types listed. If the user mentions a specific accessory type like a claw clip, headband, or watch, match precisely rather than defaulting to jewelry or a generic accessory.
- Belt: waist accessory, can be thin, wide, statement buckle, or simple
- Hat: head covering of any style — beanie, baseball cap, bucket hat, wide-brim, beret
- Scarf: neck or head fabric accessory, can be silk, knit, or lightweight
- Sunglasses: eyewear, any frame style
- Jewelry: necklaces, earrings, bracelets, rings, anklets
- Hair accessories: clips, scrunchies, headbands, claw clips
- Watch: wrist accessory with a clock face
- Gloves: hand covering accessory
- Tights or socks: legwear accessory layer

When a subcategory is selected, only suggest items that match this definition precisely. Do not substitute a similar but technically different subcategory — for example, do not suggest a tank top when sleeveless top was selected, even though they're related.
`;
}

function buildColorGlossary(filters?: Filters): string {
  const hasColor = (filters?.colors?.length ?? 0) > 0 || !!filters?.customColor?.trim();
  if (!hasColor) return "";
  return `
COLOR DEFINITIONS — match precisely, do not substitute a nearby color:
- White: pure white, no warmth
- Cream: warm off-white, ivory tones
- Black: true black
- Grey: neutral grey, no warm or cool tint
- Navy: deep blue with high black content, not bright blue
- Brown: medium to deep brown, no red undertone
- Camel: warm tan-brown, classic camel coat color
- Tan: light warm brown, lighter than camel
- Burgundy: deep red with brown/purple undertone, wine-colored
- Forest: deep, saturated green, not bright or pastel
- Olive: muted yellow-green, military-adjacent tone
- Sage: muted, greyish-green, soft and desaturated
- Pink: clear, medium-saturation pink, not pastel, not neon
- Blush: very light, soft pink with warm undertone
- Red: true, saturated red, no orange or pink undertone
- Orange: true orange, warm and saturated
- Yellow: clear, saturated yellow
- Cobalt: vivid, saturated blue, brighter and more saturated than navy
- Lavender: light, soft purple
- Purple: deep, saturated purple

When the user selects a color, only suggest items whose primary color matches this definition. Do not suggest a similar-but-different shade — for example do not suggest tan when camel was selected, do not suggest navy when black was selected, do not suggest forest when olive was selected.
`;
}

// Resolves the active categories from either the new multi-select field or the legacy single field.
function resolveCategories(filters?: Filters): string[] {
  if (filters?.itemCategories?.length) return filters.itemCategories;
  if (filters?.itemCategory) return [filters.itemCategory];
  return [];
}

// Returns a hard exclusive constraint if the description says "only X" / "just X".
// Maps keyword → human-readable category label for the prompt.
const EXCLUSIVE_PROMPT_MAP: Array<[string[], string]> = [
  [["shoe", "boot", "sneaker", "heel", "sandal", "loafer", "flat", "mule", "pump", "footwear", "wedge", "stiletto", "slingback", "espadrille"], "shoes (heels, sneakers, boots, sandals, loafers, flats, mules, pumps — all footwear types)"],
  [["bag", "purse", "tote", "clutch", "backpack", "crossbody", "handbag"], "bags (totes, crossbodies, clutches, backpacks, shoulder bags, etc.)"],
  [["top", "blouse", "shirt", "hoodie", "sweatshirt", "bodysuit", "tee", "tank"], "tops (blouses, shirts, tanks, hoodies, bodysuits, etc.)"],
  [["pant", "trouser", "jean", "skirt", "short", "legging"], "bottoms (pants, jeans, skirts, shorts, leggings, etc.)"],
  [["dress", "gown"], "dresses"],
  [["jumpsuit", "romper"], "jumpsuits and rompers"],
  [["earring", "necklace", "jewelry", "accessory", "accessories", "bracelet", "watch", "belt", "hat", "scarf"], "accessories (jewelry, belts, hats, scarves, etc.)"],
  [["jacket", "coat", "blazer", "puffer", "cardigan", "bomber", "vest", "trench"], "outerwear (jackets, coats, blazers, cardigans, etc.)"],
];

function detectExclusiveConstraint(filters?: Filters): string {
  if (!filters?.description) return "";
  const desc = filters.description.toLowerCase();
  if (!/\bonly\b|\bjust\b|\bsolely\b|\bexclusively\b|\bnothing but\b/.test(desc)) return "";
  for (const [words, label] of EXCLUSIVE_PROMPT_MAP) {
    if (words.some(w => desc.includes(w))) {
      return `\nEXCLUSIVE CATEGORY — CRITICAL OVERRIDE: The user asked for ${label} ONLY. ALL 3 suggestions must be ${label}. Do not suggest bags, accessories, dresses, tops, or any other category in any position. Every single result must be a ${label} item. This constraint cannot be overridden by any other instruction.\n`;
    }
  }
  return "";
}

// Per-request gender filter — overrides the global tasteProfile.gender from onboarding.
// Injected after tasteSection so it supersedes any earlier gender instruction in the prompt.
function buildGenderSection(filters?: Filters): string {
  const g = filters?.gender?.trim();
  if (!g || g === "All") return "";
  return `\nDEPARTMENT (overrides any earlier gender instruction): Suggest only items from the ${g} section. Every recommended piece — all 3 — must be marketed to ${g} shoppers. Do not suggest items from men's, women's, or kids' sections that don't match this.\n`;
}

function buildSystemPrompt(filters?: Filters, tasteProfile?: TasteProfile | null, feedbackSignals?: FeedbackStore | null): string {
  const isDirection = filters?.recommendationStyle === "direction";

  const allColors = [
    ...(filters?.colors ?? []),
    ...(filters?.customColor?.trim() ? [filters.customColor.trim()] : []),
  ];
  const colorSection = allColors.length
    ? `\nColor direction: Suggest pieces in or compatible with these colors: ${allColors.join(", ")}.`
    : "";

  const budgetSection = (() => {
    const [lo, hi] = filters?.priceRange ?? [0, 1000];
    const isDefault = lo === 0 && hi === 1000;
    if (isDefault) return "";
    let s = "\nBudget: Each suggested piece must be priced";
    if (lo === 0)  s += ` under $${hi}`;
    else if (hi >= 1000) s += ` over $${lo}`;
    else s += ` between $${lo} and $${hi}`;
    s += ". Only suggest stores that carry items at this price point.";
    if (filters?.sortOrder === "low-high") s += " Order suggestions from lowest to highest price.";
    if (filters?.sortOrder === "high-low") s += " Order suggestions from highest to lowest price.";
    return s;
  })();

  const mandatorySection = filters?.description?.trim()
    ? `MANDATORY REQUIREMENT: The user has specifically requested: "${filters.description.trim()}". If this text names a specific item, garment, or accessory type, your first suggestion (position 1) MUST be that exact item type. This overrides all other styling logic. Do not suggest a substitute category — if they ask for a black belt, suggestion 1 must be a black belt, not boots or trousers or a blouse.\n\n`
    : "";

  const descSection = filters?.description?.trim()
    ? `\nUsers may phrase requests in varied natural language. Interpret intent accordingly:
- Negations ("no heels," "not a dress," "nothing sleeveless," "don't suggest jeans") — exclude that category or attribute entirely from all 3 results
- Possession statements ("I already have a bag," "I have shoes that work," "don't need a top") — exclude that category from suggestions since the user already owns something suitable
- Singular category asks ("just a top," "only shoes," "looking for one bag") — all 3 results must be from that single category
- Comparative/modifier requests ("something cheaper," "a dressier version," "more casual," "less flashy") — adjust price, formality, or styling tone accordingly while keeping category logic from other filters
- Occasion framing ("for a wedding," "something for work," "going to the beach") — treat as styling context, adjust all 3 suggestions to fit that occasion
- Specific constraints ("no logos," "nothing tight," "natural fabrics only," "size inclusive brands") — apply as hard constraints across all suggestions
- Vague vibe words ("something edgy," "make it pop," "more elevated") — adjust style direction of suggestions, and explicitly reference this vibe in the reasoning text for each piece
Always prioritize explicit negations and exclusions as hard constraints that cannot be violated, even if they conflict with other softer styling logic.
If the user's free text request names a specific category that conflicts with the category filter selection, prioritize the free text request — it represents the user's most current and specific intent.
If the user's free text doesn't clearly map to a specific category, exclusion, or constraint, treat it as general styling guidance and incorporate the sentiment naturally into your reasoning without forcing a category change.
User's specific request: "${filters.description.trim()}". For each suggested piece, explicitly reference the user's words or vibe in the reason field — explain how this item delivers on their request. Do not describe the item in isolation.`
    : "";

  const categorySection = (() => {
    const cats = resolveCategories(filters);
    if (!cats.length) return "";
    const subs = filters?.itemSubcategories ?? [];
    if (cats.length === 1) {
      const subStr = subs.length ? `, specifically: ${subs.join(", ")}` : "";
      return `\nItem type: The user is looking for ${cats[0]}${subStr}. All 3 of your suggestions must be ${cats[0]}.`;
    }
    // Multiple categories: distribute suggestions across them
    const catDetails = cats.map(cat => {
      const catSubs = subs.filter(s => {
        // Sub belongs to a category if its name appears in that category's typical items
        // (subcategory names are globally unique across categories in this app)
        return true; // model knows which subs map to which category
      });
      return catSubs.length ? `${cat} (e.g. ${catSubs.join(", ")})` : cat;
    });
    return `\nMultiple item types requested: The user wants suggestions spanning MULTIPLE categories — ${cats.join(" AND ")}${subs.length ? `, with these specific preferences: ${subs.join(", ")}` : ""}. Distribute your 3 suggestions to include at least one item from each requested category. Do not put all 3 suggestions into a single category.`;
  })();

  const exclusiveConstraint = detectExclusiveConstraint(filters);

  const secondhandSection = filters?.secondhandOnly
    ? "\nPrioritize secondhand and resale platforms like Depop, Vinted, Poshmark, ThredUp. Use new retail as a fallback only if no secondhand option fits."
    : "";

  const tasteSection        = buildTasteSection(tasteProfile);
  const genderSection       = buildGenderSection(filters);
  const feedbackSection     = buildFeedbackSection(feedbackSignals);
  const glossarySection     = buildCategoryGlossary(filters);
  const colorGlossarySection = buildColorGlossary(filters);

  if (isDirection) {
    return `${mandatorySection}${exclusiveConstraint}You are Nomi, an expert fashion stylist. Analyze the clothing item in the image and identify its key style attributes: color, category, silhouette, fabric feel, and overall aesthetic. Then suggest exactly 3 complementary style directions that would complete an outfit with this item.
${glossarySection}${colorGlossarySection}${colorSection}${budgetSection}${categorySection}${secondhandSection}${descSection}${tasteSection}${genderSection}${feedbackSection}

Return style guidance and aesthetic direction — NOT specific product names, brands, or store names. For each suggestion provide:

name: a descriptive style name using silhouette, fabric, and color terms only — no brand names, no invented product titles. Examples: "wide-leg high-waisted dark trouser, relaxed fit" or "structured camel leather shoulder bag, mid-size" or "pointed-toe kitten heel mule in nude leather."

direction: 2–3 sentences of detailed styling guidance explaining exactly how to wear this piece with the uploaded item — hem lengths, proportions, tucking, layering, etc.

reason: one concise sentence on why this style direction works with the uploaded piece.

price: an estimated price range as a string covering what this style typically costs at mid-market stores. Use a range, not a single number. Examples: "$40–$80" or "$60–$120" or "$25–$45."

searchUrl: a Google Shopping search URL built from 3–5 key descriptive style terms only — no brand names, no store names. Format: https://www.google.com/search?tbm=shop&q=term1+term2+term3+term4. Example: "wide-leg dark trouser relaxed fit" → https://www.google.com/search?tbm=shop&q=wide+leg+dark+trouser+relaxed+fit

category: exactly one of: top, bottom, shoes, bag, dress, jumpsuit, outerwear, accessory — choose the one that best describes the suggested item.

For the analysis object describing the UPLOADED piece:
- analysis.color: a short color word only — e.g. "white", "navy", "camel". Not a sentence.
- analysis.category: a short garment type only — e.g. "dress", "blouse", "jeans". Not a sentence.
- analysis.aesthetic: the one place for a full evocative sentence about the overall style vibe.
- analysis.detectedBrand: the brand or store name if it is clearly visible on a label, tag, or logo in the image. Return null if not visible or uncertain.

Return JSON only, no markdown:
{ "analysis": { "color": string, "category": string, "aesthetic": string, "detectedBrand": string | null }, "matches": [ { "name": string, "direction": string, "reason": string, "price": string, "searchUrl": string, "category": string } ] }`;
  }

  return `${mandatorySection}${exclusiveConstraint}You are Nomi, an expert fashion stylist. Analyze the clothing item in the image and identify its key style attributes: color, category, silhouette, fabric feel, and overall aesthetic. Then suggest exactly 3 complementary pieces that would complete an outfit with this item.

Store selection rules:
- Only suggest stores that genuinely carry that item type at the stated price range. Never suggest luxury brands (Louis Vuitton, Gucci, Prada, Bottega) for items under $150.
- Price tier mapping: $0–$60 → ASOS, Zara, H&M, Urban Outfitters, Mango, PrettyLittleThing, Princess Polly; $60–$150 → Anthropologie, Free People, Revolve, Nordstrom, Madewell, Reformation; $150–$400 → Saks, Bloomingdales, AllSaints, ba&sh, Veronica Beard; $400+ → Net-a-Porter, Matches, luxury department stores.
- Be specific: use the actual product line or style name when possible (e.g. "Levi's 501 Original" not "jeans").
${glossarySection}${colorGlossarySection}${colorSection}${budgetSection}${categorySection}${secondhandSection}${descSection}${tasteSection}${genderSection}${feedbackSection}

For each piece return: a specific item name, the store or brand, an estimated price range, one sentence explaining why it works stylistically, a Google Shopping search URL, and a category field.

searchUrl format: https://www.google.com/search?tbm=shop&q=item+name+store+name — replace every space with + and concatenate item name and store name. Example: "Black Ribbed Crop Top" at "ASOS" → https://www.google.com/search?tbm=shop&q=Black+Ribbed+Crop+Top+ASOS

category must be exactly one of: top, bottom, shoes, bag, dress, jumpsuit, outerwear, accessory — choose the one that best describes the suggested item.

Return JSON only, no markdown:
{ "analysis": { "color": string, "category": string, "aesthetic": string, "detectedBrand": string | null }, "matches": [ { "name": string, "store": string, "price": string, "reason": string, "searchUrl": string, "category": string } ] }`;
}

function buildSimilarStylesPrompt(filters?: Filters, tasteProfile?: TasteProfile | null, feedbackSignals?: FeedbackStore | null, scope?: "same" | "any"): string {
  const tasteSection         = buildTasteSection(tasteProfile);
  const genderSection        = buildGenderSection(filters);
  const feedbackSection      = buildFeedbackSection(feedbackSignals);
  const glossarySection      = buildCategoryGlossary(filters);
  const colorGlossarySection = buildColorGlossary(filters);

  const allColors = [
    ...(filters?.colors ?? []),
    ...(filters?.customColor?.trim() ? [filters.customColor.trim()] : []),
  ];
  const colorSection = allColors.length
    ? `\nColor direction: Focus on similar items in or compatible with these colors: ${allColors.join(", ")}.`
    : "";

  const budgetSection = (() => {
    const [lo, hi] = filters?.priceRange ?? [0, 1000];
    if (lo === 0 && hi === 1000) return "";
    let s = "\nBudget: Each suggested piece must be priced";
    if (lo === 0)       s += ` under $${hi}`;
    else if (hi >= 1000) s += ` over $${lo}`;
    else                s += ` between $${lo} and $${hi}`;
    s += ". Only suggest stores that carry items at this price point.";
    return s;
  })();

  const secondhandSection = filters?.secondhandOnly
    ? "\nPrioritize secondhand and resale platforms like Depop, Vinted, Poshmark, ThredUp." : "";

  const mandatorySection = filters?.description?.trim()
    ? `MANDATORY REQUIREMENT: The user has specifically requested: "${filters.description.trim()}". If this text names a specific item, garment, or accessory type, your first suggestion (position 1) MUST be that exact item type. This overrides all other styling logic. Do not suggest a substitute category — if they ask for a black belt, suggestion 1 must be a black belt, not boots or trousers or a blouse.\n\n`
    : "";

  const descSection = filters?.description?.trim()
    ? `\nUsers may phrase requests in varied natural language. Interpret intent accordingly:
- Negations ("no heels," "not a dress," "nothing sleeveless," "don't suggest jeans") — exclude that category or attribute entirely from all 3 results
- Possession statements ("I already have a bag," "I have shoes that work," "don't need a top") — exclude that category from suggestions since the user already owns something suitable
- Singular category asks ("just a top," "only shoes," "looking for one bag") — all 3 results must be from that single category
- Comparative/modifier requests ("something cheaper," "a dressier version," "more casual," "less flashy") — adjust price, formality, or styling tone accordingly while keeping category logic from other filters
- Occasion framing ("for a wedding," "something for work," "going to the beach") — treat as styling context, adjust all 3 suggestions to fit that occasion
- Specific constraints ("no logos," "nothing tight," "natural fabrics only," "size inclusive brands") — apply as hard constraints across all suggestions
- Vague vibe words ("something edgy," "make it pop," "more elevated") — adjust style direction of suggestions, and explicitly reference this vibe in the reasoning text for each piece
Always prioritize explicit negations and exclusions as hard constraints that cannot be violated, even if they conflict with other softer styling logic.
If the user's free text request names a specific category that conflicts with the category filter selection, prioritize the free text request — it represents the user's most current and specific intent.
If the user's free text doesn't clearly map to a specific category, exclusion, or constraint, treat it as general styling guidance and incorporate the sentiment naturally into your reasoning without forcing a category change.
User's specific request: "${filters.description.trim()}". For each suggested piece, explicitly reference the user's words or vibe in the reason field — explain how this item delivers on their request. Do not describe the item in isolation.`
    : "";

  const resolvedCats = scope === "any" ? resolveCategories(filters) : [];

  const criticalConstraint = (() => {
    if (scope !== "any") return "";
    if (!resolvedCats.length) return "";
    const subs = filters?.itemSubcategories ?? [];
    const catLabel = resolvedCats.length === 1
      ? (subs.length ? subs.join(", ") : resolvedCats[0])
      : resolvedCats.join(" and ");
    return `CRITICAL CONSTRAINT: You must ONLY suggest items from these categories: ${catLabel}. Do not suggest items from any other category under any circumstances, even if the uploaded image is a different category. Translate the style of the uploaded piece into the requested category/categories. Every suggestion must belong to one of: ${resolvedCats.join(", ")}. This is non-negotiable.\n\n`;
  })();

  const exclusiveConstraint = detectExclusiveConstraint(filters);

  const detailsInstruction = "If the uploaded piece has a standout, distinctive design detail beyond its basic silhouette — decorative hardware, charms, embellishments, appliqués, unusual trims or beading — call it out specifically in analysis.details. Leave analysis.details as an empty string for plain/basic pieces with nothing distinctive. When analysis.details is non-empty, that detail is the defining trait of the piece — prioritize suggesting items that share it, not just the base garment shape and color, and mention it explicitly in the reason for each match.";

  const scopeInstruction = scope !== "any"
    ? "Suggest exactly 3 similar items in the exact same category as the uploaded piece — same type of garment, similar silhouette, cut, and aesthetic, from different stores or brands."
    : resolvedCats.length
      ? "Suggest exactly 3 items that share the same style DNA as the uploaded piece — silhouette, neckline, aesthetic, or design details. Translate the style into the requested category. Explain the style connection clearly in the reason for each."
      : "Suggest exactly 3 items from DIFFERENT garment categories than the uploaded piece. First identify what type of item was uploaded (e.g. top, dress, shoes), then suggest complementary pieces from other categories — such as bottoms, shoes, bags, outerwear, or accessories — that share the same aesthetic, color story, and design details. Do NOT suggest another item of the same type as the uploaded piece. Explain how each suggested piece connects to the style of the uploaded item.";

  return `${mandatorySection}${criticalConstraint}${exclusiveConstraint}You are Nomi, an expert fashion stylist. Analyze the clothing item in the image and identify its key style attributes: silhouette, neckline, cut, fabric, color, and overall aesthetic. ${scopeInstruction}
${detailsInstruction}
${glossarySection}${colorGlossarySection}${colorSection}${budgetSection}${secondhandSection}${descSection}${tasteSection}${genderSection}${feedbackSection}

For each match also include a category field: exactly one of top, bottom, shoes, bag, dress, jumpsuit, outerwear, accessory — describing the type of item suggested.

Before you output the JSON: check the uploaded piece one more time for a standout, distinctive design detail (decorative hardware, charms, embellishments, appliqués, unusual trims or beading) beyond its basic silhouette. If one is present, it is the single most important thing to preserve in your 3 suggestions — every reason must name it specifically, not just describe the general garment shape and color.

Return JSON only in this format:
{ "analysis": { "color": string, "category": string, "silhouette": string, "aesthetic": string, "details": string, "detectedBrand": string | null }, "matches": [ { "name": string, "store": string, "price": string, "reason": string, "category": string } ] }`;
}

function buildTextSystemPrompt(filters?: Filters, tasteProfile?: TasteProfile | null, feedbackSignals?: FeedbackStore | null): string {
  const allColors = [
    ...(filters?.colors ?? []),
    ...(filters?.customColor?.trim() ? [filters.customColor.trim()] : []),
  ];
  const colorSection = allColors.length
    ? `\nColor direction: Suggest pieces in or compatible with these colors: ${allColors.join(", ")}.`
    : "";

  const budgetSection = (() => {
    const [lo, hi] = filters?.priceRange ?? [0, 1000];
    if (lo === 0 && hi === 1000) return "";
    let s = "\nBudget: Each suggested piece must be priced";
    if (lo === 0)       s += ` under $${hi}`;
    else if (hi >= 1000) s += ` over $${lo}`;
    else                s += ` between $${lo} and $${hi}`;
    s += ". Only suggest stores that carry items at this price point.";
    if (filters?.sortOrder === "low-high") s += " Order suggestions from lowest to highest price.";
    if (filters?.sortOrder === "high-low") s += " Order suggestions from highest to lowest price.";
    return s;
  })();

  const categorySection = (() => {
    if (!filters?.itemCategory) return "";
    const subs = filters.itemSubcategories?.length
      ? `, specifically: ${filters.itemSubcategories.join(", ")}` : "";
    return `\nItem type: The user is looking for ${filters.itemCategory}${subs}. At least one suggestion must match this type.`;
  })();

  const secondhandSection = filters?.secondhandOnly
    ? "\nPrioritize secondhand and resale platforms like Depop, Vinted, Poshmark, ThredUp. Use new retail as a fallback only if no secondhand option fits." : "";

  const tasteSection    = buildTasteSection(tasteProfile);
  const genderSection   = buildGenderSection(filters);
  const feedbackSection = buildFeedbackSection(feedbackSignals);

  return `You are Nomi, an expert fashion stylist. Based on the item description provided, suggest exactly 3 complementary pieces that complete an outfit with it.

Store selection rules:
- Only suggest stores that genuinely carry that item type at the stated price range.
- Price tier mapping: $0–$60 → ASOS, Zara, H&M, Urban Outfitters, Mango; $60–$150 → Anthropologie, Free People, Revolve, Nordstrom, Madewell, Reformation; $150–$400 → Saks, Bloomingdales, AllSaints, ba&sh; $400+ → Net-a-Porter, Matches.
- Be specific: use actual product line or style names when possible.
${colorSection}${budgetSection}${categorySection}${secondhandSection}${tasteSection}${genderSection}${feedbackSection}

For each piece return: a specific item name, the store or brand, an estimated price range, one sentence explaining why it works stylistically, and a Google Shopping search URL.
searchUrl format: https://www.google.com/search?tbm=shop&q=item+name+store+name

Also infer "analysis" fields from the description: color (dominant color of the described item), category (item type), aesthetic (one evocative sentence about the overall style). Set detectedBrand to null (no image to read from).

category for each match must be exactly one of: top, bottom, shoes, bag, dress, jumpsuit, outerwear, accessory.

Return JSON only, no markdown:
{ "analysis": { "color": string, "category": string, "aesthetic": string, "detectedBrand": null }, "matches": [ { "name": string, "store": string, "price": string, "reason": string, "searchUrl": string, "category": string } ] }`;
}

// ─── Analysis classification consistency check ────────────────────────────────
// The vision call produces analysis.category and analysis.aesthetic in one
// response. The model can backward-infer a wrong category from whatever
// recommendations it has decided to make — e.g. classifying a legging as "top"
// so that its bottom recommendations seem logical. These two functions detect
// that inconsistency by cross-checking the model's own description against the
// category token it assigned, then triggering a one-shot correction retry.

function normalizeAnalysisCategory(cat: string): string {
  const t = (cat ?? "").toLowerCase().trim();
  if (["legging", "pant", "trouser", "jean", "denim", "skirt", "short", "jogger", "sweatpant", "bottom"].some(w => t.includes(w))) return "bottom";
  if (["dress", "gown"].some(w => t.includes(w))) return "dress";
  if (["jumpsuit", "romper"].some(w => t.includes(w))) return "jumpsuit";
  if (["jacket", "coat", "blazer", "puffer", "cardigan", "bomber", "vest", "trench"].some(w => t.includes(w))) return "outerwear";
  if (["shoe", "boot", "sneaker", "heel", "sandal", "loafer", "flat", "mule", "pump", "wedge"].some(w => t.includes(w))) return "shoes";
  if (["bag", "purse", "tote", "clutch", "backpack", "crossbody", "handbag"].some(w => t.includes(w))) return "bag";
  if (["earring", "necklace", "jewelry", "bracelet", "watch", "belt", "hat", "scarf", "accessory"].some(w => t.includes(w))) return "accessory";
  if (["top", "blouse", "shirt", "hoodie", "sweatshirt", "bodysuit", "tee", "tank", "crop", "sweater"].some(w => t.includes(w))) return "top";
  return t;
}

// Conservative: only fires on specific garment keywords that unambiguously
// name the uploaded piece. Generic words like "top" or "shirt" are omitted
// because they appear too often in recommendations-adjacent context.
function inferCategoryFromAesthetic(aesthetic: string): string | null {
  const t = (aesthetic ?? "").toLowerCase();
  // Bottoms first — catches the legging-misclassified-as-top case
  if (t.includes("legging")) return "bottom";
  if (t.includes("jogger") || t.includes("sweatpant")) return "bottom";
  if (t.includes("trouser") || t.includes("trousers")) return "bottom";
  if (t.includes("jeans") || t.includes("denim pant")) return "bottom";
  if (t.includes(" skirt")) return "bottom";
  // Dress / jumpsuit — use word boundary for "dress" to avoid matching "dressing"
  if (/\bdress\b/.test(t) && !t.includes("dress shoe")) return "dress";
  if (t.includes("gown")) return "dress";
  if (t.includes("jumpsuit") || t.includes("romper")) return "jumpsuit";
  // Outerwear — use compound forms to avoid partial matches
  if (t.includes("blazer") || t.includes("trench coat") || t.includes("leather jacket") ||
      t.includes("denim jacket") || t.includes("puffer jacket") || t.includes("cardigan") ||
      t.includes("bomber jacket") || t.includes("wool coat")) return "outerwear";
  // Tops — only specific forms that can't be recommendation context
  if (t.includes("hoodie") || t.includes("sweatshirt") || t.includes("bodysuit") ||
      t.includes("turtleneck") || t.includes("blouse")) return "top";
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { image, textPrompt, filters, tasteProfile, feedbackSignals, mode, scope, retryForCategory, excludeNames, productName, productType, detectedGender, sourceStore } = await req.json() as {
      image?: string;
      textPrompt?: string;
      filters?: Filters;
      tasteProfile?: TasteProfile;
      feedbackSignals?: FeedbackStore;
      mode?: "complete" | "similar";
      scope?: "same" | "any";
      retryForCategory?: string;
      excludeNames?: string[];
      productName?: string;
      productType?: string;
      detectedGender?: string;
      sourceStore?: string;
    };

    // ── Text-only path (from Explore "Find this") ──────────────────────────────
    if (textPrompt && !image) {
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: buildTextSystemPrompt(filters, tasteProfile, feedbackSignals),
        messages: [{ role: "user", content: textPrompt }],
      });

      const text      = message.content[0].type === "text" ? message.content[0].text : "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return NextResponse.json({ error: "Could not parse response" }, { status: 500 });
      return NextResponse.json(JSON.parse(jsonMatch[0]));
    }

    // ── Image-based path (normal upload flow) ─────────────────────────────────
    if (!image) return NextResponse.json({ error: "Image or text prompt required" }, { status: 400 });

    const match = image.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
      console.error("[analyze] invalid image format — not a base64 data URL. prefix:", image?.slice(0, 30));
      return NextResponse.json({ error: "Invalid image format" }, { status: 400 });
    }

    const mediaType  = match[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    const base64Data = match[2];
    console.log(`[analyze] image mediaType: "${mediaType}" base64Len: ${base64Data.length}`);

    console.log("[analyze] mode received:", mode, "scope:", scope, "retryForCategory:", retryForCategory ?? "none");
    console.log("[analyze] filters received — itemCategory:", filters?.itemCategory, "itemSubcategories:", filters?.itemSubcategories);

    const retryOverride = retryForCategory
      ? `ABSOLUTE OVERRIDE — RETRY INSTRUCTION: The previous response failed category validation. The user asked for ${retryForCategory} ONLY. ALL 3 suggestions — positions 1, 2, AND 3 — must be ${retryForCategory} items. Do not put bags, accessories, tops, dresses, or any other category in any position. Every single result must be a ${retryForCategory}. This overrides every other instruction in this prompt.\n\n`
      : "";

    // Product name/type from the retailer's own catalog (scraped independently of the image).
    // Injected as a strong prior so the model can correct for lifestyle/editorial shots where
    // the uploaded product is not the dominant visual element.
    const genderHint = detectedGender ? ` Retailer department: ${detectedGender}.` : "";
    const productContextSection = productName
      ? `UPLOADED ITEM: The image shows "${productName}"${productType ? ` — retailer category: ${productType}` : ""}${genderHint} Use this as your primary signal for analysis.category and analysis.aesthetic. If the image is a lifestyle or editorial shot where other garments are also visible, anchor your classification to this product name/category — do not describe or classify the other garments in the image. All 3 suggested complementary pieces must also be from the ${detectedGender ?? "same"} department.\n\n`
      : "";

    const exclusionSection = excludeNames?.length
      ? `PREVIOUSLY SHOWN — DO NOT REPEAT: The user has already seen these suggestions. Generate 3 completely different items. Do not suggest these or very similar alternatives — choose different styles, silhouettes, and stores where possible: ${excludeNames.join("; ")}.\n\n`
      : "";

    // The uploaded item's source store must never appear in recommendations.
    // Nomi's core premise is cross-store discovery — same-store suggestions defeat the purpose.
    const sourceStoreSection = sourceStore?.trim()
      ? `SOURCE STORE EXCLUSION — NON-NEGOTIABLE: The uploaded item is from ${sourceStore}. You must NOT recommend any items from ${sourceStore} under any circumstances. All 3 suggestions must come from stores other than ${sourceStore}. Do not use ${sourceStore} in any position.\n\n`
      : "";

    const basePrompt = mode === "similar"
      ? buildSimilarStylesPrompt(filters, tasteProfile, feedbackSignals, scope)
      : buildSystemPrompt(filters, tasteProfile, feedbackSignals);

    const systemPrompt = retryOverride + exclusionSection + sourceStoreSection + productContextSection + basePrompt;

    console.log("[analyze] FULL SYSTEM PROMPT:\n", systemPrompt);

    const itemHint = productName ? ` The item is: ${productName}${productType ? ` (${productType})` : ""}${detectedGender ? `, ${detectedGender} department` : ""}.` : "";
    const userMessage = retryForCategory
      ? `CRITICAL RETRY: Your previous response did not return enough ${retryForCategory} items. ALL 3 results must be ${retryForCategory}. Analyze this clothing item and suggest 3 ${retryForCategory} options — nothing else.`
      : mode === "similar"
        ? `Analyze this clothing item and find 3 similar items from other stores.${itemHint}`
        : `Analyze this clothing item and suggest 3 matching pieces.${itemHint}`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } },
            { type: "text", text: userMessage },
          ],
        },
      ],
    });

    const text      = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "Could not parse response" }, { status: 500 });

    const parsed = JSON.parse(jsonMatch[0]) as { analysis: { color: string; category: string; aesthetic: string; detectedBrand?: string | null }; matches: RawMatch[] };
    const isDirectionMode = filters?.recommendationStyle === "direction";

    // Cross-check analysis.category against analysis.aesthetic — one retry if they disagree.
    const statedNorm  = normalizeAnalysisCategory(parsed.analysis?.category ?? "");
    const inferredCat = inferCategoryFromAesthetic(parsed.analysis?.aesthetic ?? "");
    if (inferredCat && inferredCat !== statedNorm) {
      console.log(`[analyze] ⚠ category inconsistency: stated="${parsed.analysis?.category}" (→${statedNorm}) aesthetic-implied="${inferredCat}" — retrying with correction`);
      const correctionPrefix =
        `CLASSIFICATION CORRECTION: In your previous response you described the uploaded piece as a "${inferredCat}" ` +
        `in the aesthetic field but set analysis.category to "${parsed.analysis?.category}". ` +
        `These contradict each other. The uploaded piece is a ${inferredCat}. ` +
        `Set analysis.category to a value consistent with ${inferredCat}, and recommend pieces that complement a ${inferredCat} — not a ${parsed.analysis?.category}.\n\n`;
      const correctedMsg = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: correctionPrefix + systemPrompt,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } },
            { type: "text", text: userMessage },
          ],
        }],
      });
      const correctedText = correctedMsg.content[0].type === "text" ? correctedMsg.content[0].text : "";
      const correctedJson = correctedText.match(/\{[\s\S]*\}/);
      if (correctedJson) {
        const correctedParsed = JSON.parse(correctedJson[0]) as { analysis: unknown; matches: RawMatch[] };
        const enriched = isDirectionMode ? (correctedParsed.matches ?? []) : await enrichMatchesWithImages(correctedParsed.matches ?? []);
        return NextResponse.json({ ...correctedParsed, matches: enriched });
      }
      console.warn("[analyze] correction parse failed — using original response");
    }

    const enrichedMatches = isDirectionMode
      ? (parsed.matches ?? [])
      : await enrichMatchesWithImages(parsed.matches ?? []);
    return NextResponse.json({ ...parsed, matches: enrichedMatches });
  } catch (err) {
    console.error("Analyze error:", err);
    return NextResponse.json({ error: "Failed to analyze" }, { status: 500 });
  }
}
