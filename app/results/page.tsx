"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NomiNav from "../components/NomiNav";
import ShareToExploreModal from "../components/ShareToExploreModal";
import ItemThumbnail from "../components/ItemThumbnail";
import { STORE_SEARCH } from "../lib/storeSearch";
import { recordTasteSignal } from "../lib/tasteProfile";

// Direct-to-retailer link for known stores, falling back to a Google Shopping
// search (item name only, no store keyword) for stores without a search URL.
// Mirrors the same STORE_SEARCH table the chat feature uses, so mock/fallback
// items don't send users to Google Shopping's mixed-reseller results.
function directStoreLink(name: string, store: string): string {
  const builder = STORE_SEARCH[store.toLowerCase().trim()];
  const q = encodeURIComponent(name);
  return builder ? builder(q) : `https://www.google.com/search?tbm=shop&q=${q}`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeThumbnail(dataUrl: string, maxPx = 320, quality = 0.55): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio  = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function uid() { return Math.random().toString(36).slice(2, 10); }

function parsePrice(price?: string): number {
  if (!price) return Infinity;
  const nums = price.match(/\d+(?:\.\d+)?/g);
  if (!nums || nums.length === 0) return Infinity;
  return parseFloat(nums[0]);
}

// Returns {lo, hi} from a price string like "$35–$55", "$45", "$150+"
function parsePriceBounds(price?: string): { lo: number; hi: number } | null {
  if (!price) return null;
  const nums = price.match(/\d+(?:\.\d+)?/g)?.map(Number);
  if (!nums?.length) return null;
  return { lo: Math.min(...nums), hi: Math.max(...nums) };
}

// Midpoint of a price string's range
function priceMidpoint(price?: string): number | null {
  const b = parsePriceBounds(price);
  if (!b) return null;
  return (b.lo + b.hi) / 2;
}

// Infer a match's parent category from its name using the subcategory lookup,
// falling back to the keyword lists. Returns null if nothing matches.
function inferMatchCategory(name: string): string | null {
  const lower = name.toLowerCase();
  const sortedKeys = Object.keys(SUBCATEGORY_TO_PARENT).sort((a, b) => b.length - a.length);
  for (const sub of sortedKeys) {
    if (lower.includes(sub)) return SUBCATEGORY_TO_PARENT[sub];
  }
  for (const [cat, keywords] of Object.entries(REQUESTED_CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return cat;
  }
  return null;
}

// Returns the price summary to display for a set of matches.
// "similar" mode → always a range (alternatives, not worn together).
// "complete" mode → sum if all 3 are from distinct, different categories (outfit);
//                   range otherwise (alternatives within the same/overlapping category).
function buildPriceSummary(
  matches: Match[],
  mode: "complete" | "similar",
): { label: string; value: string } | null {
  const priced = matches.filter(m => parsePriceBounds(m.price));
  if (priced.length < 2) return null; // need at least 2 prices to say anything useful

  // Similar mode: always range
  if (mode === "similar") return rangeLabel(priced);

  // Complete mode: sum only when all 3 matches are from distinct categories
  if (priced.length === 3) {
    const cats = matches.map(m => inferMatchCategory(m.name));
    const known = cats.filter(Boolean) as string[];
    const unique = new Set(known);
    if (known.length === 3 && unique.size === 3) {
      // All 3 identified and all different → outfit sum
      const mids = matches.map(m => priceMidpoint(m.price)).filter((v): v is number => v !== null);
      if (mids.length === 3) {
        const total = Math.round(mids.reduce((a, b) => a + b, 0));
        return { label: "Estimated look", value: `~$${total}` };
      }
    }
  }

  // Same/overlapping category, or couldn't determine categories → range
  return rangeLabel(priced);
}

function rangeLabel(priced: Match[]): { label: string; value: string } | null {
  const bounds = priced.map(m => parsePriceBounds(m.price)).filter((b): b is { lo: number; hi: number } => b !== null);
  if (!bounds.length) return null;
  const lo = Math.min(...bounds.map(b => b.lo));
  const hi = Math.max(...bounds.map(b => b.hi));
  return { label: "Price range", value: lo === hi ? `$${lo}` : `$${lo}–$${hi}` };
}

// ─── Category request detection & retry helpers ───────────────────────────────

const REQUESTED_CATEGORY_KEYWORDS: Record<string, string[]> = {
  shoes:       ["shoe", "shoes", "boot", "boots", "sneaker", "sneakers", "heel", "heels", "stiletto", "stilettos", "kitten heel", "kitten heels", "wedge", "wedges", "slingback", "slingbacks", "espadrille", "espadrilles", "sandal", "sandals", "loafer", "loafers", "flat", "flats", "mule", "mules", "platform", "footwear", "pump", "pumps"],
  bags:        ["bag", "bags", "purse", "tote", "backpack", "clutch", "crossbody", "handbag", "shoulder bag", "mini bag", "bucket bag", "baguette", "belt bag", "fanny pack", "top handle"],
  tops:        ["top", "tops", "blouse", "shirt", "shirts", "tank", "hoodie", "sweatshirt", "bodysuit", "tee", "crop top", "camisole", "halter", "off-the-shoulder", "turtleneck", "wrap top", "peplum", "button-down", "corset"],
  bottoms:     ["pant", "pants", "trouser", "trousers", "jean", "jeans", "skirt", "skirts", "shorts", "legging", "leggings", "cargo", "bootcut", "skinny jeans", "wide leg", "bermuda", "pencil skirt", "a-line", "sweatpants", "joggers", "midi skirt", "maxi skirt", "mini skirt"],
  dresses:     ["dress", "dresses", "gown", "mini dress", "midi dress", "maxi dress", "slip dress", "wrap dress", "bodycon", "shirt dress", "sweater dress", "halter dress", "off-the-shoulder dress", "a-line dress"],
  jumpsuits:   ["jumpsuit", "jumpsuits", "romper", "rompers", "wide leg jumpsuit", "skinny jumpsuit", "strapless jumpsuit", "halter jumpsuit", "utility jumpsuit", "culotte jumpsuit"],
  outerwear:   ["jacket", "jackets", "coat", "coats", "blazer", "blazers", "puffer", "trench", "cardigan", "bomber", "shacket", "vest", "wool coat", "leather jacket", "denim jacket"],
  accessories: ["belt", "belts", "scarf", "scarves", "hat", "hats", "sunglasses", "jewelry", "earring", "earrings", "necklace", "bracelet", "ring", "anklet", "watch", "gloves", "tights", "socks", "hair clip", "claw clip", "scrunchie", "headband", "beanie", "beret"],
};

// Maps every subcategory term → its parent category so we can validate by category tree,
// not just literal keyword matching. Sorted longest-first at lookup time to avoid partial matches.
const SUBCATEGORY_TO_PARENT: Record<string, string> = {
  // shoes
  "ankle boot": "shoes", "kitten heel": "shoes", "block heel": "shoes", "wedge heel": "shoes",
  "platform heel": "shoes", "slingback heel": "shoes", "sandal heel": "shoes", "espadrille heel": "shoes",
  "stiletto": "shoes", "platform shoe": "shoes", "flip flop": "shoes", "footwear": "shoes",
  "sneaker": "shoes", "loafer": "shoes", "sandal": "shoes", "wedge": "shoes",
  "slingback": "shoes", "espadrille": "shoes", "mule": "shoes", "pump": "shoes",
  "heel": "shoes", "boot": "shoes", "flat": "shoes",
  // accessories
  "earring": "accessories", "necklace": "accessories", "bracelet": "accessories",
  "anklet": "accessories", "claw clip": "accessories", "hair clip": "accessories",
  "scrunchie": "accessories", "headband": "accessories", "sunglasses": "accessories",
  "watch": "accessories", "gloves": "accessories", "tights": "accessories",
  "socks": "accessories", "beanie": "accessories", "beret": "accessories",
  "scarf": "accessories", "belt": "accessories",
  // bags
  "bucket bag": "bags", "belt bag": "bags", "top handle": "bags", "shoulder bag": "bags",
  "mini bag": "bags", "crossbody": "bags", "baguette": "bags", "backpack": "bags",
  "clutch": "bags", "handbag": "bags", "purse": "bags", "tote": "bags",
  // tops
  "tank top": "tops", "crop top": "tops", "wrap top": "tops", "peplum top": "tops",
  "halter top": "tops", "off-the-shoulder top": "tops", "turtleneck": "tops",
  "button-down": "tops", "sweatshirt": "tops", "bodysuit": "tops", "hoodie": "tops",
  "corset": "tops", "blouse": "tops",
  // bottoms
  "straight leg jeans": "bottoms", "wide leg jeans": "bottoms", "bootcut jeans": "bottoms",
  "skinny jeans": "bottoms", "cargo trousers": "bottoms", "tailored trousers": "bottoms",
  "wide leg trousers": "bottoms", "bermuda shorts": "bottoms", "pencil skirt": "bottoms",
  "a-line skirt": "bottoms", "mini skirt": "bottoms", "midi skirt": "bottoms",
  "maxi skirt": "bottoms", "sweatpants": "bottoms", "joggers": "bottoms",
  "leggings": "bottoms", "trousers": "bottoms", "shorts": "bottoms", "skirt": "bottoms",
  "jeans": "bottoms",
  // dresses
  "mini dress": "dresses", "midi dress": "dresses", "maxi dress": "dresses",
  "slip dress": "dresses", "wrap dress": "dresses", "bodycon dress": "dresses",
  "shirt dress": "dresses", "sweater dress": "dresses", "halter dress": "dresses",
  "off-the-shoulder dress": "dresses", "a-line dress": "dresses", "dress": "dresses",
  // jumpsuits
  "wide leg jumpsuit": "jumpsuits", "skinny jumpsuit": "jumpsuits", "utility jumpsuit": "jumpsuits",
  "culotte jumpsuit": "jumpsuits", "strapless jumpsuit": "jumpsuits", "halter jumpsuit": "jumpsuits",
  "jumpsuit": "jumpsuits", "romper": "jumpsuits",
  // outerwear
  "trench coat": "outerwear", "wool coat": "outerwear", "leather jacket": "outerwear",
  "denim jacket": "outerwear", "bomber jacket": "outerwear", "puffer jacket": "outerwear",
  "blazer": "outerwear", "cardigan": "outerwear", "shacket": "outerwear",
  "puffer": "outerwear", "trench": "outerwear", "jacket": "outerwear", "coat": "outerwear",
};

// Category-aware check: does this match name belong to the target category?
// Tries keyword list first, then subcategory→parent lookup (longest keys first).
function matchBelongsToCategory(matchName: string, targetCategory: string, keywords: string[]): boolean {
  const lower = matchName.toLowerCase();
  if (keywords.some(kw => lower.includes(kw))) return true;
  const sortedKeys = Object.keys(SUBCATEGORY_TO_PARENT).sort((a, b) => b.length - a.length);
  for (const sub of sortedKeys) {
    if (lower.includes(sub) && SUBCATEGORY_TO_PARENT[sub] === targetCategory) return true;
  }
  return false;
}

const EXCLUSIVE_PATTERNS = [/\bonly\b/, /\bjust\b/, /\bsolely\b/, /\bexclusively\b/, /\bnothing but\b/];

function detectRequestedCategory(description: string): { category: string; keywords: string[]; itemCount: number; exclusive: boolean } | null {
  if (!description.trim()) return null;
  const lower = description.toLowerCase();
  const exclusive = EXCLUSIVE_PATTERNS.some(p => p.test(lower));
  let best: { category: string; keywords: string[]; itemCount: number; exclusive: boolean } | null = null;

  for (const [cat, keywords] of Object.entries(REQUESTED_CATEGORY_KEYWORDS)) {
    const found = new Set<string>();
    for (const kw of keywords) {
      if (lower.includes(kw)) found.add(kw.replace(/s$/, ""));
    }
    if (found.size > 0 && (!best || found.size > best.itemCount)) {
      best = { category: cat, keywords, itemCount: found.size, exclusive };
    }
  }
  return best;
}

// Validates that enough matches belong to the requested category.
// When exclusive ("shoes only", "just a top"), ALL 3 must match — not just 1 or 2.
function hasEnoughMatchesInCategory(
  matches: Match[],
  keywords: string[],
  targetCategory: string,
  itemCount: number,
  exclusive: boolean,
): boolean {
  const matchingCount = matches.filter(m => matchBelongsToCategory(m.name, targetCategory, keywords)).length;
  const required = exclusive ? matches.length : (itemCount >= 2 ? 2 : 1);
  console.log(`[nomi] category check — target: ${targetCategory}, exclusive: ${exclusive}, required: ${required}, matched: ${matchingCount}/${matches.length}`);
  return matchingCount >= required;
}

// Fallback suggestions used when retry still returns wrong-category items.
const CATEGORY_FALLBACK_ITEMS: Record<string, Omit<Match, "searchUrl">[]> = {
  shoes: [
    { name: "White Leather Sneakers", store: "ASOS", price: "$35–$55", reason: "A clean white sneaker is the most versatile shoe option — pairs with almost anything." },
    { name: "Black Strappy Sandals", store: "Zara", price: "$30–$50", reason: "Strappy sandals keep the look elevated without overpowering the rest of the outfit." },
    { name: "Tan Block Heel Mules", store: "H&M", price: "$25–$45", reason: "Block heel mules offer height and comfort — an easy, wearable shoe option." },
  ],
  bags: [
    { name: "Mini Leather Crossbody Bag", store: "Mango", price: "$40–$60", reason: "A sleek mini crossbody keeps the look polished without adding bulk." },
    { name: "Classic Canvas Tote", store: "Madewell", price: "$50–$75", reason: "A structured canvas tote works for everyday carry and complements most outfits." },
    { name: "Structured Shoulder Bag", store: "ASOS", price: "$30–$50", reason: "A simple shoulder bag adds function without competing for visual attention." },
  ],
  tops: [
    { name: "White Fitted Ribbed Top", store: "Zara", price: "$20–$35", reason: "A clean ribbed top is the easiest layering piece and works with nearly any bottom." },
    { name: "Black Satin Slip Top", store: "ASOS", price: "$25–$40", reason: "A satin slip top reads effortlessly dressy and pairs with both denim and tailoring." },
    { name: "Oversized Linen Button-Down", store: "Mango", price: "$30–$50", reason: "An oversized linen shirt works tucked, untucked, or as a lightweight layer." },
  ],
};

const CATEGORY_FALLBACKS: Record<string, Match[]> = Object.fromEntries(
  Object.entries(CATEGORY_FALLBACK_ITEMS).map(([cat, items]) => [
    cat,
    items.map(m => ({ ...m, searchUrl: directStoreLink(m.name, m.store ?? "") })),
  ]),
);

// After a failed retry, replace any non-matching items with known-good fallbacks
// so the user never sees a wrong-category result.
function applyFallbacksForCategory(
  matches: Match[],
  keywords: string[],
  targetCategory: string,
): Match[] {
  const fallbacks = CATEGORY_FALLBACKS[targetCategory] ?? [];
  let fbIndex = 0;
  return matches.map(m => {
    if (matchBelongsToCategory(m.name, targetCategory, keywords)) return m;
    const fb = fallbacks[fbIndex % (fallbacks.length || 1)];
    fbIndex++;
    console.log(`[nomi] fallback: replacing "${m.name}" with "${fb?.name ?? "fallback"}"`);
    return fb ?? m;
  });
}

// ─── Validation signal helpers ────────────────────────────────────────────────

const COLOR_FAMILIES: string[][] = [
  ["white", "cream", "ivory", "off-white"],
  ["black", "charcoal"],
  ["grey", "gray", "silver"],
  ["navy", "midnight"],
  ["brown", "tan", "camel", "khaki", "sand", "nude", "beige"],
  ["burgundy", "wine", "maroon", "red", "crimson"],
  ["green", "forest", "olive", "sage", "emerald"],
  ["pink", "blush", "rose", "mauve"],
  ["purple", "lavender", "violet", "lilac"],
  ["blue", "cobalt", "royal", "sky", "teal"],
  ["orange", "rust", "terracotta", "peach", "coral"],
  ["yellow", "mustard", "gold", "lemon"],
];

function colorFamilyIndex(color?: string): number {
  if (!color) return -1;
  const l = color.toLowerCase();
  return COLOR_FAMILIES.findIndex(fam => fam.some(f => l.includes(f)));
}

function similarCategory(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const groups = [
    ["top", "blouse", "shirt", "tee", "tank", "crop", "sweater", "hoodie", "sweatshirt", "bodysuit", "corset", "cardigan"],
    ["bottom", "jean", "trouser", "pant", "short", "skirt", "legging"],
    ["shoe", "heel", "sneaker", "boot", "loafer", "sandal", "flat", "mule", "platform"],
    ["bag", "tote", "clutch", "purse", "backpack", "crossbody"],
    ["outerwear", "jacket", "coat", "blazer", "puffer", "trench"],
    ["accessory", "belt", "hat", "scarf", "sunglasses", "jewelry"],
    ["dress"],
  ];
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  return groups.some(g => g.some(k => al.includes(k)) && g.some(k => bl.includes(k)));
}

type MatchSignal = { saved: boolean; feedback: boolean };

function computeMatchSignals(
  matches: Match[],
  analysis: Analysis | undefined,
  savedItems: SavedItem[],
  positiveFeedback: Array<{ store?: string; category?: string; aesthetic?: string }>,
): MatchSignal[] {
  const analysisColorFam = colorFamilyIndex(analysis?.color);
  const analysisCategory = analysis?.category;

  return matches.map(match => {
    const saved = savedItems.some(s =>
      similarCategory(analysisCategory, s.attributes?.category) &&
      analysisColorFam !== -1 &&
      colorFamilyIndex(s.attributes?.color) === analysisColorFam
    );

    const feedback = positiveFeedback.some(f =>
      (match.store && f.store && match.store.toLowerCase() === f.store.toLowerCase()) ||
      similarCategory(analysisCategory, f.category)
    );

    return { saved, feedback };
  });
}

function sortMatches(matches: Match[], sortOrder?: string): Match[] {
  if (!sortOrder || sortOrder === "low-high") {
    return [...matches].sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
  }
  if (sortOrder === "high-low") {
    return [...matches].sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
  }
  return matches;
}

function updateTasteProfile(match: Match, analysis?: Analysis) {
  recordTasteSignal({
    color:     analysis?.color,
    category:  analysis?.category,
    aesthetic: analysis?.aesthetic,
    store:     match.store,
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Analysis     = { color: string; category: string; aesthetic: string; detectedBrand?: string | null };
type Match        = { name: string; store?: string; price?: string; reason: string; searchUrl?: string; direction?: string; category?: string; image?: string | null; productLink?: string | null; imageTier?: "confident" | "broad" | null };
type Result       = { analysis: Analysis; matches: Match[] };
type RecentSearch = { id: string; image: string; result: Result; searchedAt: number; saved: boolean };

type SavedItem = {
  id: string; name: string; store?: string; price?: string;
  reason: string; searchUrl?: string; direction?: string;
  image?: string;
  attributes?: { color?: string; category?: string; aesthetic?: string };
  savedAt: number;
};

// Grouped save model — one look = one save action (original + chosen matches)
type LookItem = {
  id: string; name: string; store?: string; price?: string;
  reason?: string; searchUrl?: string; direction?: string;
  image?: string; isOriginal?: boolean;
  imageTier?: "confident" | "broad";
  attributes?: { color?: string; category?: string; aesthetic?: string };
};
type SavedLook = { id: string; savedAt: number; uploadedImage?: string; items: LookItem[] };

type Board = { id: string; name: string; itemIds: string[]; lookIds?: string[]; createdAt: number };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const router = useRouter();
  const [image,           setImage]           = useState<string | null>(null);
  const [itemSaveCounts,  setItemSaveCounts]  = useState<Record<string, number>>({});
  const [matchSignals,    setMatchSignals]    = useState<MatchSignal[]>([]);
  const [categoryMismatch, setCategoryMismatch] = useState<string | null>(null);
  const [result,          setResult]          = useState<Result | null>(null);
  const [error,           setError]           = useState<string | null>(null);
  const [mode,            setMode]            = useState<"complete" | "similar">("complete");
  const [lookSaved,       setLookSaved]       = useState(false);
  const [searchId,        setSearchId]        = useState<string | null>(null);
  const [selectedMatch,   setSelectedMatch]   = useState<Match | null>(null);
  const [savedMatchNames, setSavedMatchNames] = useState<Set<string>>(new Set());
  const [textPiece,       setTextPiece]       = useState<{ name: string; category: string; description: string } | null>(null);
  const [scrapedProduct,  setScrapedProduct]  = useState<{ name: string; price: string; store: string; productType?: string; detectedGender?: string } | null>(null);
  const [shareOpen,       setShareOpen]       = useState(false);
  const [shareConfirmed,  setShareConfirmed]  = useState(false);
  const [confirmReset,    setConfirmReset]    = useState(false);
  const [loadingMore,     setLoadingMore]     = useState(false);
  const [seenNames,       setSeenNames]       = useState<string[]>([]);

  useEffect(() => {
    // Pre-load saved names from looks (new model) + legacy flat items for backward compat
    const savedLooks: SavedLook[] = JSON.parse(localStorage.getItem("nomi_saved_looks") ?? "[]");
    const legacyItems: SavedItem[] = JSON.parse(localStorage.getItem("nomi_saved_items") ?? "[]");
    setSavedMatchNames(new Set([
      ...savedLooks.flatMap(l => l.items.filter(i => !i.isOriginal).map(i => i.name)),
      ...legacyItems.map(s => s.name),
    ]));
    setItemSaveCounts(JSON.parse(localStorage.getItem("nomi_item_save_counts") ?? "{}"));

    // Scraped product metadata (cleared after reading to avoid stale state)
    const scraped = localStorage.getItem("nomi_scraped_product");
    const scrapedData = scraped
      ? JSON.parse(scraped) as { name: string; price: string; store: string; productType?: string; detectedGender?: string }
      : null;
    if (scrapedData) {
      setScrapedProduct(scrapedData);
      localStorage.removeItem("nomi_scraped_product");
    }

    // ── Text-only path (from Explore "Find this" via query params) ────────────
    const params   = new URLSearchParams(window.location.search);
    const pName    = params.get("name");
    const pCat     = params.get("category");
    const pDesc    = params.get("description");

    if (pName && pCat && pDesc) {
      setTextPiece({ name: pName, category: pCat, description: pDesc });
      const textPrompt   = `Find matching pieces for this item: ${pName}, ${pCat}, described as ${pDesc}. Suggest 3 complementary pieces to complete the outfit.`;
      const tasteProfile    = JSON.parse(localStorage.getItem("nomi_taste_profile")    ?? "{}");
      const feedbackSignals = JSON.parse(localStorage.getItem("nomi_feedback_signals") ?? "{}");
      fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textPrompt, tasteProfile, feedbackSignals }),
      })
        .then((r) => r.json())
        .then((data: Result & { error?: string }) => {
          if (data.error) throw new Error(data.error);
          setResult(data);
        })
        .catch((e: Error) => setError(e.message ?? "Something went wrong"));
      return;
    }

    // ── Image-based path (normal upload flow) ────────────────────────────────
    const stored = localStorage.getItem("nomi_current_upload");
    if (!stored) { router.replace("/"); return; }
    setImage(stored);

    const currentMode  = (localStorage.getItem("nomi_current_mode")  ?? "complete") as "complete" | "similar";
    const currentScope = (localStorage.getItem("nomi_current_scope") ?? "same")    as "same" | "any";
    setMode(currentMode);

    // Defined here so it's available for both the preloaded-restore path and finaliseResult.
    function normStore(s: string): string { return s.toLowerCase().replace(/[^a-z0-9]/g, ""); }
    function dropSourceStore(matches: Match[], detectedBrand?: string | null): Match[] {
      const src = (scrapedData?.store ?? detectedBrand ?? "").trim();
      if (!src) return matches;
      const srcNorm = normStore(src);
      return matches.filter(m => !m.store || normStore(m.store) !== srcNorm);
    }

    const preloaded = localStorage.getItem("nomi_current_result");
    if (preloaded) {
      localStorage.removeItem("nomi_current_result");
      const s: RecentSearch = JSON.parse(preloaded);
      setResult({ ...s.result, matches: dropSourceStore(s.result.matches, s.result.analysis.detectedBrand) });
      setSearchId(s.id);
      setLookSaved(s.saved ?? false);
      return;
    }

    const filters         = JSON.parse(localStorage.getItem("nomi_current_filters")    ?? "{}");
    const tasteProfile    = JSON.parse(localStorage.getItem("nomi_taste_profile")      ?? "{}");
    const feedbackSignals = JSON.parse(localStorage.getItem("nomi_feedback_signals")   ?? "{}");

    console.log("[nomi] mode from localStorage:", currentMode, "scope:", currentScope);
    console.log("[nomi] filters from localStorage — itemCategories:", filters.itemCategories, "itemSubcategories:", filters.itemSubcategories);
    console.log("[nomi] description from localStorage:", JSON.stringify(filters.description));

    const requestedCat = detectRequestedCategory(filters.description ?? "");
    console.log("[nomi] detected requested category:", requestedCat?.category ?? "none");

    const callAnalyze = (retryForCategory?: string) =>
      fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: stored, filters, tasteProfile, feedbackSignals,
          mode: currentMode, scope: currentScope, retryForCategory,
          productName:    scrapedData?.name,
          productType:    scrapedData?.productType,
          detectedGender: scrapedData?.detectedGender,
          sourceStore:    scrapedData?.store,
        }),
      }).then(r => r.json());

    function finaliseResult(result: Result, mismatch: string | null) {
      const allSaved: SavedItem[] = JSON.parse(localStorage.getItem("nomi_saved_items") ?? "[]");
      const fb = JSON.parse(localStorage.getItem("nomi_feedback_signals") ?? "{}");
      const filtered = { ...result, matches: dropSourceStore(result.matches, result.analysis.detectedBrand) };
      setResult(filtered);
      setCategoryMismatch(mismatch);
      setMatchSignals(computeMatchSignals(filtered.matches, filtered.analysis, allSaved, fb.positive ?? []));
      const id = uid();
      setSearchId(id);
      makeThumbnail(stored!).then(thumb => {
        const entry: RecentSearch = { id, image: thumb, result: filtered, searchedAt: Date.now(), saved: false };
        const prev: RecentSearch[] = JSON.parse(localStorage.getItem("nomi_recent_searches") ?? "[]");
        try {
          localStorage.setItem("nomi_recent_searches", JSON.stringify([entry, ...prev].slice(0, 6)));
        } catch {
          try { localStorage.setItem("nomi_recent_searches", JSON.stringify([entry])); } catch { /* ignore */ }
        }
      });
    }

    (async () => {
      try {
        const data: Result & { error?: string } = await callAnalyze();
        if (data.error) throw new Error(data.error);
        const sorted = { ...data, matches: sortMatches(data.matches, filters.sortOrder) };

        if (requestedCat && !hasEnoughMatchesInCategory(sorted.matches, requestedCat.keywords, requestedCat.category, requestedCat.itemCount, requestedCat.exclusive)) {
          console.log(`[nomi] category validation FAILED — wanted: "${requestedCat.category}" exclusive:${requestedCat.exclusive}, got: ${sorted.matches.map(m => m.name).join(" | ")}. Retrying...`);
          const data2: Result & { error?: string } = await callAnalyze(requestedCat.category);
          if (!data2.error) {
            const sorted2 = { ...data2, matches: sortMatches(data2.matches, filters.sortOrder) };
            const stillMissing = !hasEnoughMatchesInCategory(sorted2.matches, requestedCat.keywords, requestedCat.category, requestedCat.itemCount, requestedCat.exclusive);
            console.log(`[nomi] retry result — category still missing: ${stillMissing}. matches: ${sorted2.matches.map(m => m.name).join(" | ")}`);
            if (stillMissing) {
              // Replace any non-category items with known-good fallbacks so nothing wrong shows
              const fixed = applyFallbacksForCategory(sorted2.matches, requestedCat.keywords, requestedCat.category);
              console.log(`[nomi] after fallback replacement: ${fixed.map(m => m.name).join(" | ")}`);
              finaliseResult({ ...sorted2, matches: fixed }, null);
            } else {
              finaliseResult(sorted2, null);
            }
            return;
          }
        }

        finaliseResult(sorted, null);
      } catch (e: unknown) {
        setError((e as Error).message ?? "Something went wrong");
      }
    })();
  }, [router]);

  function handleStartOver() {
    localStorage.removeItem("nomi_home_return_state");
    localStorage.removeItem("nomi_current_upload");
    localStorage.removeItem("nomi_current_filters");
    localStorage.removeItem("nomi_current_mode");
    localStorage.removeItem("nomi_current_scope");
    // do NOT set nomi_from_results — home screen must load blank
    router.push("/");
  }

  async function handleSaveLook() {
    if (!result || lookSaved) return;
    setLookSaved(true);

    // Mark as saved in recent searches (for home screen history)
    if (searchId) {
      const recent: RecentSearch[] = JSON.parse(localStorage.getItem("nomi_recent_searches") ?? "[]");
      localStorage.setItem("nomi_recent_searches", JSON.stringify(
        recent.map(s => s.id === searchId ? { ...s, saved: true } : s)
      ));
    }

    // Build grouped look: original piece + all matched items
    const thumb = image ? await makeThumbnail(image) : undefined;
    const lookItems: LookItem[] = [];

    // Original piece
    lookItems.push({
      id: uid(),
      name: scrapedProduct?.name ?? (result.analysis.detectedBrand ? `${result.analysis.detectedBrand} ${result.analysis.category}` : result.analysis.category),
      store: scrapedProduct?.store,
      price: scrapedProduct?.price,
      image: thumb,
      isOriginal: true,
      attributes: { color: result.analysis.color, category: result.analysis.category, aesthetic: result.analysis.aesthetic },
    });

    // All matched items
    for (const m of result.matches) {
      lookItems.push({
        id: uid(), name: m.name, store: m.store, price: m.price,
        reason: m.reason, searchUrl: m.searchUrl, direction: m.direction,
        image: m.image ?? undefined,
        imageTier: m.imageTier ?? undefined,
        attributes: { category: m.category, color: result.analysis.color, aesthetic: result.analysis.aesthetic },
      });
    }

    const look: SavedLook = { id: uid(), savedAt: Date.now(), uploadedImage: thumb, items: lookItems };
    const prev: SavedLook[] = JSON.parse(localStorage.getItem("nomi_saved_looks") ?? "[]");
    try {
      localStorage.setItem("nomi_saved_looks", JSON.stringify([look, ...prev]));
    } catch { /* quota exceeded */ }
  }

  // Returns true when a new match name shares 3+ significant words with an excluded name.
  // Catches near-duplicates like "Wide Leg Trousers Black" vs "Black Wide Leg Trouser."
  function isNearDuplicate(a: string, b: string): boolean {
    const sig = (s: string) => new Set(s.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const wa = sig(a); const wb = sig(b);
    let n = 0; for (const w of wa) if (wb.has(w)) n++;
    return n >= 3;
  }

  function hasExclusionOverlap(matches: Match[], excluded: string[]): boolean {
    const overlapping = matches.filter(m => excluded.some(ex => isNearDuplicate(m.name, ex)));
    return overlapping.length >= 2;
  }

  async function handleSeeMore() {
    if (!image || !result || loadingMore) return;
    // Accumulate all names shown so far so nothing ever repeats across multiple taps
    const toExclude = [...seenNames, ...result.matches.map(m => m.name)];
    setSeenNames(toExclude);
    setLoadingMore(true);

    const filters         = JSON.parse(localStorage.getItem("nomi_current_filters")    ?? "{}");
    const tasteProfile    = JSON.parse(localStorage.getItem("nomi_taste_profile")      ?? "{}");
    const feedbackSignals = JSON.parse(localStorage.getItem("nomi_feedback_signals")   ?? "{}");
    const currentScope    = (localStorage.getItem("nomi_current_scope") ?? "same") as "same" | "any";

    function applyResult(r: Result) {
      const allSaved: SavedItem[] = JSON.parse(localStorage.getItem("nomi_saved_items") ?? "[]");
      const fb = JSON.parse(localStorage.getItem("nomi_feedback_signals") ?? "{}");
      const normS = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
      // URL-paste path: scrapedProduct.store. Photo path: model-detected brand from analysis.
      const src = (scrapedProduct?.store ?? r.analysis.detectedBrand ?? "").trim();
      const filtered = src
        ? { ...r, matches: r.matches.filter(m => !m.store || normS(m.store) !== normS(src)) }
        : r;
      setResult(filtered);
      setMatchSignals(computeMatchSignals(filtered.matches, filtered.analysis, allSaved, fb.positive ?? []));
      setCategoryMismatch(null);
      setLookSaved(false);
    }

    const callWith = (excludeNames: string[]) =>
      fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image, filters, tasteProfile, feedbackSignals, mode, scope: currentScope, excludeNames,
          productName:    scrapedProduct?.name,
          productType:    scrapedProduct?.productType,
          detectedGender: scrapedProduct?.detectedGender,
          sourceStore:    scrapedProduct?.store,
        }),
      }).then(r => r.json() as Promise<Result & { error?: string }>);

    try {
      const data = await callWith(toExclude);
      if (data.error) throw new Error(data.error);
      const sorted = { ...data, matches: sortMatches(data.matches, filters.sortOrder) };

      // Overlap check: if ≥2 of 3 new items are near-duplicates of excluded ones, retry once.
      if (hasExclusionOverlap(sorted.matches, toExclude)) {
        console.log("[nomi] see more overlap detected — retrying with extended exclusion list");
        const retryExclude = [...toExclude, ...sorted.matches.map(m => m.name)];
        const data2 = await callWith(retryExclude);
        if (!data2.error) {
          applyResult({ ...data2, matches: sortMatches(data2.matches, filters.sortOrder) });
          return;
        }
      }

      applyResult(sorted);
    } catch (e: unknown) {
      console.error("[nomi] see more failed:", (e as Error).message);
      // silently keep existing results visible rather than showing an error
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <>
      <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: "100%", maxWidth: "420px", padding: "0 20px 80px" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", padding: "20px 0 28px" }}>
            <button onClick={() => { sessionStorage.setItem("nomi_from_results", "1"); router.push("/"); }} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", marginLeft: "-4px", color: "#000", lineHeight: 0 }}>
              <BackArrow />
            </button>
            <span style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "-0.3px", marginLeft: "10px" }}>Your outfit</span>
          </div>

          {/* Your piece */}
          {image && (
            <div style={{ marginBottom: "28px" }}>
              <SectionLabel>Your piece</SectionLabel>
              <div style={{ borderRadius: "16px", overflow: "hidden", border: "1px solid #ebebeb", background: "#f7f6f3" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="Your piece" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", objectPosition: "top center", display: "block" }} />
                <div style={{ padding: "14px 16px 16px" }}>
                  {scrapedProduct && (
                    <div style={{ marginBottom: result ? "12px" : "0" }}>
                      <p style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "-0.3px", color: "#000", marginBottom: "4px", lineHeight: 1.3 }}>
                        {scrapedProduct.name}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {scrapedProduct.store && (
                          <span style={{ fontSize: "12px", color: "#aaa" }}>{scrapedProduct.store}</span>
                        )}
                        {scrapedProduct.store && scrapedProduct.price && (
                          <span style={{ fontSize: "12px", color: "#ddd" }}>·</span>
                        )}
                        {scrapedProduct.price && (
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "#c9a96e" }}>{scrapedProduct.price}</span>
                        )}
                      </div>
                      {result && <div style={{ height: "1px", background: "#e8e4dd", margin: "12px 0 10px" }} />}
                    </div>
                  )}
                  {result ? (
                    <>
                      <div style={{ display: "flex", gap: "7px", marginBottom: "10px", flexWrap: "wrap" }}>
                        <Chip>{result.analysis.category}</Chip>
                        <Chip>{result.analysis.color}</Chip>
                      </div>
                      <p style={{ fontSize: "13px", color: "#6b6b6b", lineHeight: 1.6, fontStyle: "italic" }}>&ldquo;{result.analysis.aesthetic}&rdquo;</p>
                    </>
                  ) : !error && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <div style={{ ...shimmer, height: "22px", width: "80px", borderRadius: "99px" }} />
                        <div style={{ ...shimmer, height: "22px", width: "60px", borderRadius: "99px" }} />
                      </div>
                      <div style={{ ...shimmer, height: "13px", borderRadius: "6px" }} />
                      <div style={{ ...shimmer, height: "13px", borderRadius: "6px", width: "70%" }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Your piece — text mode (from Explore "Find this") */}
          {textPiece && (
            <div style={{ marginBottom: "28px" }}>
              <SectionLabel>Your piece</SectionLabel>
              <div style={{ borderRadius: "16px", border: "1px solid #ebebeb", background: "#f7f6f3", padding: "18px 18px 20px" }}>
                <div style={{ display: "flex", gap: "7px", marginBottom: "10px" }}>
                  <Chip>{textPiece.category}</Chip>
                </div>
                <p style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "-0.3px", color: "#000", marginBottom: "8px" }}>
                  {textPiece.name}
                </p>
                <p style={{ fontSize: "13px", color: "#6b6b6b", lineHeight: 1.6, fontStyle: "italic" }}>
                  {textPiece.description}
                </p>
                {result && (
                  <>
                    <div style={{ height: "1px", background: "#e8e4dd", margin: "12px 0" }} />
                    <p style={{ fontSize: "13px", color: "#6b6b6b", lineHeight: 1.6, fontStyle: "italic" }}>
                      &ldquo;{result.analysis.aesthetic}&rdquo;
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Loading */}
          {!result && !error && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ fontSize: "13px", fontWeight: 500, color: "#c9a96e", marginBottom: "4px", animation: "nomi-pulse 1.8s ease-in-out infinite" }}>
                Nomi is styling this...
              </p>
              <SkeletonCard /><SkeletonCard /><SkeletonCard />
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ borderRadius: "16px", border: "1px solid #fecaca", background: "#fef2f2", padding: "20px", fontSize: "14px", color: "#b91c1c", lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          {/* Match cards */}
          {result && (
            <>
              {categoryMismatch && (
                <p style={{ fontSize: "12px", color: "#b8966a", lineHeight: 1.5, marginBottom: "10px", padding: "10px 14px", background: "#f7f0e4", borderRadius: "10px" }}>
                  Note: results may not perfectly match your request for {categoryMismatch}.
                </p>
              )}
              {mode === "complete" && image && !loadingMore && (
                <StyleItWithCarousel
                  image={image}
                  matches={result.matches}
                  analysis={result.analysis}
                />
              )}
              <SectionLabel>{mode === "similar" ? "Similar styles" : "Complete the look"}</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {loadingMore
                  ? <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
                  : result.matches.map((match, i) => (
                      <MatchCard
                        key={i} match={match} index={i}
                        isSaved={savedMatchNames.has(match.name)}
                        onTap={() => setSelectedMatch(match)}
                        analysis={result.analysis}
                        saveCount={itemSaveCounts[`${match.name}|${match.store ?? ""}`] ?? 0}
                        signal={matchSignals[i]}
                      />
                    ))
                }
              </div>

              {/* Price summary — hidden while loading more so stale totals don't flicker */}
              {!loadingMore && (() => {
                const summary = buildPriceSummary(result.matches, mode);
                if (!summary) return null;
                return (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                    <span style={{ fontSize: "12px", color: "#b8966a" }}>
                      {summary.label}:&nbsp;<strong style={{ fontWeight: 600 }}>{summary.value}</strong>
                    </span>
                  </div>
                );
              })()}

              {/* See more — only shown for image-based results, hidden while loading or after saving */}
              {image && !loadingMore && !lookSaved && (
                <button onClick={handleSeeMore} style={{
                  display: "block", width: "100%", padding: "14px 0 2px",
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: "13px", color: "#bbb", textAlign: "center",
                  letterSpacing: "-0.1px",
                }}>
                  Not feeling these? See more suggestions
                </button>
              )}

              <button onClick={handleSaveLook} style={{
                marginTop: "28px", width: "100%", padding: "16px",
                borderRadius: "16px", border: "none",
                background: lookSaved ? "#f0ede8" : "#c9a96e",
                color: lookSaved ? "#aaa" : "#fff",
                fontSize: "15px", fontWeight: 600,
                cursor: lookSaved ? "default" : "pointer",
                letterSpacing: "-0.1px", transition: "background 0.3s, color 0.3s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              }}>
                {lookSaved ? <><CheckIcon /> Saved to your looks</> : "Save this look"}
              </button>

              <button onClick={() => setShareOpen(true)} style={{
                marginTop: "10px", width: "100%", padding: "14px",
                borderRadius: "16px", border: "1.5px solid #e8e8e8",
                background: "#fff", color: "#555",
                fontSize: "14px", fontWeight: 500,
                cursor: "pointer", letterSpacing: "-0.1px",
              }}>
                Share to Explore
              </button>

              {lookSaved && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
                  <button onClick={() => router.push("/saved")} style={{
                    width: "100%", padding: "16px", borderRadius: "16px", border: "none",
                    background: "#c9a96e", color: "#fff",
                    fontSize: "15px", fontWeight: 600, cursor: "pointer", letterSpacing: "-0.1px",
                  }}>
                    View saved looks
                  </button>
                  <button onClick={() => setConfirmReset(true)} style={{
                    width: "100%", padding: "16px", borderRadius: "16px", border: "none",
                    background: "#000", color: "#fff",
                    fontSize: "15px", fontWeight: 600, cursor: "pointer", letterSpacing: "-0.1px",
                  }}>
                    Start new search
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <NomiNav />

      {/* Start over confirmation */}
      {confirmReset && (
        <div onClick={() => setConfirmReset(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 300 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: "420px" }}>
            <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "#e0e0e0", margin: "12px auto 0" }} />
            <div style={{ padding: "20px 20px 44px" }}>
              <p style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "-0.2px", marginBottom: "6px" }}>Start over?</p>
              <p style={{ fontSize: "14px", color: "#888", lineHeight: 1.5, marginBottom: "24px" }}>This will clear your uploaded photo, mode, and all filters.</p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => setConfirmReset(false)} style={{ flex: 1, padding: "14px", borderRadius: "14px", border: "1.5px solid #e8e8e8", background: "#fff", color: "#444", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={handleStartOver} style={{ flex: 1, padding: "14px", borderRadius: "14px", border: "none", background: "#000", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                  Start over
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share to Explore */}
      {shareOpen && result && (() => {
        const sharePairs = [
          { img: image, tier: "confident" as const },
          ...result.matches.map(m => ({ img: m.image ?? undefined, tier: (m.imageTier ?? "confident") as "confident" | "broad" })),
        ].filter(p => !!p.img);
        return (
          <ShareToExploreModal
            images={sharePairs.map(p => p.img as string)}
            tiers={sharePairs.map(p => p.tier)}
            pieces={result.matches.map(m => ({ name: m.name, store: m.store, price: m.price, searchUrl: m.searchUrl, productLink: m.productLink ?? undefined, category: m.category }))}
            onClose={() => setShareOpen(false)}
            onShared={() => {
              setShareOpen(false);
              setShareConfirmed(true);
              setTimeout(() => setShareConfirmed(false), 2500);
            }}
          />
        );
      })()}

      {shareConfirmed && (
        <div style={{ position: "fixed", bottom: "90px", left: "50%", transform: "translateX(-50%)", background: "#000", color: "#fff", fontSize: "13px", fontWeight: 500, padding: "10px 20px", borderRadius: "99px", zIndex: 400, whiteSpace: "nowrap", pointerEvents: "none" }}>
          Shared to Explore.
        </div>
      )}

      {/* Item detail overlay */}
      {selectedMatch && (
        <ItemDetail
          match={selectedMatch}
          onBack={() => setSelectedMatch(null)}
          searchImage={image ?? undefined}
          analysis={result?.analysis}
          originalMeta={scrapedProduct ?? undefined}
          onSaved={() => setSavedMatchNames(prev => new Set([...prev, selectedMatch.name]))}
        />
      )}
    </>
  );
}

// ─── Match Card ───────────────────────────────────────────────────────────────

function MatchCard({ match, index, isSaved, onTap, analysis, saveCount = 0, signal }: {
  match: Match; index: number; isSaved: boolean; onTap: () => void; analysis?: Analysis; saveCount?: number; signal?: MatchSignal;
}) {
  const [feedback, setFeedback] = useState<"positive" | "negative" | null>(null);
  const isDirection = !!match.direction;

  function handleFeedback(type: "positive" | "negative") {
    const signal = { store: match.store, category: analysis?.category, price: match.price, aesthetic: analysis?.aesthetic };
    const raw = localStorage.getItem("nomi_feedback_signals");
    const existing: { positive: typeof signal[]; negative: typeof signal[] } =
      raw ? JSON.parse(raw) : { positive: [], negative: [] };
    existing[type] = [signal, ...existing[type]].slice(0, 20);
    localStorage.setItem("nomi_feedback_signals", JSON.stringify(existing));
    setFeedback(type);
  }

  return (
    <div onClick={onTap} style={{ borderRadius: "16px", border: "1px solid #ebebeb", background: "#f7f6f3", padding: "18px", display: "flex", flexDirection: "column", gap: "10px", cursor: "pointer", textAlign: "left", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ width: "20px", height: "20px", borderRadius: "6px", background: isDirection ? "#f7f0e4" : "#000", color: isDirection ? "#c9a96e" : "#fff", fontSize: "10px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {index + 1}
            </span>
            <p style={{ fontSize: "15px", fontWeight: 600, letterSpacing: "-0.2px", lineHeight: 1.3 }}>{match.name}</p>
          </div>
          {match.store && <p style={{ fontSize: "13px", color: "#6b6b6b", paddingLeft: "28px" }}>{match.store}</p>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "2px", flexShrink: 0 }}>
          {match.price && <span style={{ fontSize: "13px", fontWeight: 600, color: "#c9a96e" }}>{match.price}</span>}
          {isSaved ? <BookmarkFillIcon /> : <ChevronRight />}
        </div>
      </div>
      {(saveCount >= 3 || signal?.saved || signal?.feedback) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {saveCount >= 3 && (
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#c9a96e", flexShrink: 0, display: "inline-block" }} />
              <span style={{ fontSize: "11px", color: "#b8966a" }}>Saved {saveCount} times this week</span>
            </div>
          )}
          {(signal?.saved || signal?.feedback) && (
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              {signal?.saved ? <SignalCheckIcon /> : <SignalHeartIcon />}
              <span style={{ fontSize: "11px", color: "#b8966a" }}>
                {signal?.saved ? "Similar to something you saved" : "You've liked pieces like this before"}
              </span>
            </div>
          )}
        </div>
      )}
      <p style={{ fontSize: "13px", color: "#555", lineHeight: 1.6, borderTop: "1px solid #e8e4dd", paddingTop: "10px", fontStyle: "italic" }}>
        &ldquo;{match.reason}&rdquo;
      </p>

      {/* Feedback */}
      {feedback ? (
        <p style={{ fontSize: "12px", color: "#aaa", marginTop: "2px" }}>
          {feedback === "positive" ? "Got it — Nomi will suggest more like this." : "Got it — noted."}
        </p>
      ) : (
        <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
          <FeedbackPill label="More like this" onClick={() => handleFeedback("positive")} />
          <FeedbackPill label="Recommend less" onClick={() => handleFeedback("negative")} />
        </div>
      )}
    </div>
  );
}

function FeedbackPill({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      style={{
        padding: "5px 11px", borderRadius: "20px",
        border: "1px solid #e0dbd4", background: "#faf9f7",
        color: "#999", fontSize: "12px", fontWeight: 400,
        cursor: "pointer", lineHeight: 1, flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

// ─── Item Detail ──────────────────────────────────────────────────────────────

function ItemDetail({ match, onBack, searchImage, analysis, originalMeta, onSaved }: {
  match: Match;
  onBack: () => void;
  searchImage?: string;
  analysis?: Analysis;
  originalMeta?: { name?: string; store?: string; price?: string };
  onSaved: () => void;
}) {
  const [itemSaved,     setItemSaved]     = useState(false);
  const [saveSheetOpen, setSaveSheetOpen] = useState(false);

  useEffect(() => {
    const saved: SavedItem[] = JSON.parse(localStorage.getItem("nomi_saved_items") ?? "[]");
    setItemSaved(saved.some(s => s.name === match.name && s.store === match.store));
  }, [match.name, match.store]);

  function handleShop() {
    const url = match.productLink
      ?? match.searchUrl
      ?? `https://www.google.com/search?tbm=shop&q=${match.name.replace(/\s+/g, "+")}${match.store ? "+" + match.store.replace(/\s+/g, "+") : ""}`;
    window.open(url, "_blank", "noopener");
  }

  function handleSaved() {
    setItemSaved(true);
    setSaveSheetOpen(false);
    onSaved();
  }

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 50, display: "flex", flexDirection: "column", alignItems: "center", overflowY: "auto" }}>
        <div style={{ width: "100%", maxWidth: "420px", padding: "0 20px 80px" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", padding: "20px 0 32px" }}>
            <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", marginLeft: "-4px", color: "#000", lineHeight: 0 }}>
              <BackArrow />
            </button>
            <span style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "-0.3px", marginLeft: "10px" }}>Item detail</span>
          </div>

          {/* Card */}
          <div style={{ borderRadius: "20px", border: "1px solid #ebebeb", background: "#f7f6f3", padding: "24px", marginBottom: "20px" }}>
            {(match.store || match.price) && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                {match.store && <span style={{ fontSize: "11px", fontWeight: 600, color: "#bbb", letterSpacing: "0.6px", textTransform: "uppercase" }}>{match.store}</span>}
                {match.price && <span style={{ fontSize: "18px", fontWeight: 700, color: "#c9a96e", letterSpacing: "-0.5px" }}>{match.price}</span>}
              </div>
            )}
            <h1 style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1.25, color: "#000", marginBottom: "20px" }}>{match.name}</h1>
            <div style={{ height: "1px", background: "#e8e4dd", marginBottom: "20px" }} />
            {match.direction && <p style={{ fontSize: "14px", color: "#444", lineHeight: 1.75, marginBottom: "14px" }}>{match.direction}</p>}
            <p style={{ fontSize: "14px", color: "#6b6b6b", lineHeight: 1.7, fontStyle: "italic" }}>&ldquo;{match.reason}&rdquo;</p>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {(match.searchUrl || match.store) && (
              <button onClick={handleShop} style={{ width: "100%", padding: "16px", borderRadius: "16px", border: "none", background: "#000", color: "#fff", fontSize: "15px", fontWeight: 600, cursor: "pointer", letterSpacing: "-0.1px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <SearchIcon /> Shop this look
              </button>
            )}

            <button
              onClick={() => { if (!itemSaved) setSaveSheetOpen(true); }}
              style={{
                width: "100%", padding: "16px", borderRadius: "16px", border: "none",
                background: itemSaved ? "#f0ede8" : "#c9a96e",
                color: itemSaved ? "#aaa" : "#fff",
                fontSize: "15px", fontWeight: 600,
                cursor: itemSaved ? "default" : "pointer",
                letterSpacing: "-0.1px", transition: "background 0.3s, color 0.3s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              }}
            >
              {itemSaved ? <><BookmarkFillIcon /> Saved</> : "Save item"}
            </button>
          </div>
        </div>
      </div>

      {/* Save to sheet */}
      {saveSheetOpen && (
        <SaveToSheet
          match={match}
          searchImage={searchImage}
          analysis={analysis}
          originalMeta={originalMeta}
          onSaved={handleSaved}
          onClose={() => setSaveSheetOpen(false)}
        />
      )}
    </>
  );
}

// ─── Save To Sheet ────────────────────────────────────────────────────────────

function SaveToSheet({ match, searchImage, analysis, originalMeta, onSaved, onClose }: {
  match: Match;
  searchImage?: string;
  analysis?: Analysis;
  originalMeta?: { name?: string; store?: string; price?: string };
  onSaved: () => void;
  onClose: () => void;
}) {
  const [boards,       setBoards]       = useState<Board[]>([]);
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set(["all"]));
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [newName,      setNewName]      = useState("");

  useEffect(() => {
    setBoards(JSON.parse(localStorage.getItem("nomi_boards") ?? "[]"));
  }, []);

  function toggle(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function createBoard() {
    if (!newName.trim()) return;
    const board: Board = { id: uid(), name: newName.trim(), itemIds: [], createdAt: Date.now() };
    const existing: Board[] = JSON.parse(localStorage.getItem("nomi_boards") ?? "[]");
    const updated = [...existing, board];
    localStorage.setItem("nomi_boards", JSON.stringify(updated));
    setBoards(updated);
    setSelectedIds(prev => new Set([...prev, board.id]));
    setNewName("");
    setShowNewBoard(false);
  }

  async function handleSave() {
    if (selectedIds.size === 0) return;

    // Dedup: skip if this match is already in any saved look
    const prevLooks: SavedLook[] = JSON.parse(localStorage.getItem("nomi_saved_looks") ?? "[]");
    const alreadySaved = prevLooks.some(l =>
      l.items.some(i => !i.isOriginal && i.name === match.name && i.store === match.store)
    );
    if (alreadySaved) { onSaved(); return; }

    // Build grouped look: original piece + only this one chosen match
    const thumb = searchImage ? await makeThumbnail(searchImage) : undefined;
    const lookItems: LookItem[] = [
      // Original piece
      {
        id: uid(),
        name: originalMeta?.name ?? (analysis?.detectedBrand ? `${analysis.detectedBrand} ${analysis.category}` : analysis?.category ?? "Your piece"),
        store: originalMeta?.store,
        price: originalMeta?.price,
        image: thumb,
        isOriginal: true,
        attributes: { color: analysis?.color, category: analysis?.category, aesthetic: analysis?.aesthetic },
      },
      // The one chosen match only — siblings are excluded by design
      {
        id: uid(), name: match.name, store: match.store, price: match.price,
        reason: match.reason, searchUrl: match.searchUrl, direction: match.direction,
        image: match.image ?? undefined,
        imageTier: match.imageTier ?? undefined,
        attributes: { category: match.category, color: analysis?.color, aesthetic: analysis?.aesthetic },
      },
    ];

    const look: SavedLook = { id: uid(), savedAt: Date.now(), uploadedImage: thumb, items: lookItems };
    try {
      localStorage.setItem("nomi_saved_looks", JSON.stringify([look, ...prevLooks]));
    } catch { /* quota exceeded */ }

    // Add look ID to selected boards
    const boardIds = [...selectedIds].filter(id => id !== "all");
    if (boardIds.length > 0) {
      const existing: Board[] = JSON.parse(localStorage.getItem("nomi_boards") ?? "[]");
      try {
        localStorage.setItem("nomi_boards", JSON.stringify(
          existing.map(b => boardIds.includes(b.id)
            ? { ...b, lookIds: [look.id, ...(b.lookIds ?? [])] }
            : b
          )
        ));
      } catch { /* ignore */ }
    }

    updateTasteProfile(match, analysis);
    incrementSaveCount();
    onSaved();
  }

  function incrementSaveCount() {
    const counts: Record<string, number> = JSON.parse(localStorage.getItem("nomi_item_save_counts") ?? "{}");
    const key = `${match.name}|${match.store ?? ""}`;
    counts[key] = (counts[key] ?? 0) + 1;
    localStorage.setItem("nomi_item_save_counts", JSON.stringify(counts));
  }

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: "420px" }}>
        <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "#e0e0e0", margin: "12px auto 0" }} />
        <div style={{ padding: "16px 20px 32px" }}>
          <p style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "-0.2px", marginBottom: "12px" }}>Save to...</p>

          {/* All saved */}
          <SheetBoardRow name="All saved" isDefault checked={selectedIds.has("all")} onToggle={() => toggle("all")} />

          {/* User boards */}
          {boards.map(b => (
            <SheetBoardRow key={b.id} name={b.name} checked={selectedIds.has(b.id)} onToggle={() => toggle(b.id)} />
          ))}

          {/* New board */}
          {showNewBoard ? (
            <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
              <input
                autoFocus type="text" placeholder="Board name..."
                value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createBoard()}
                style={{ flex: 1, padding: "11px 14px", borderRadius: "12px", border: "1.5px solid #e8e8e8", fontSize: "14px", outline: "none" }}
              />
              <button onClick={createBoard} style={{ padding: "11px 16px", borderRadius: "12px", border: "none", background: "#000", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                Add
              </button>
            </div>
          ) : (
            <button onClick={() => setShowNewBoard(true)} style={{ width: "100%", padding: "14px 0", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", color: "#c9a96e" }}>
              <span style={{ fontSize: "20px", fontWeight: 300, lineHeight: 1 }}>+</span>
              <span style={{ fontSize: "14px", fontWeight: 500 }}>New board</span>
            </button>
          )}

          {/* Confirm */}
          <button
            onClick={handleSave}
            disabled={selectedIds.size === 0}
            style={{
              marginTop: "16px", width: "100%", padding: "15px",
              borderRadius: "14px", border: "none",
              background: selectedIds.size > 0 ? "#000" : "#e8e8e8",
              color: selectedIds.size > 0 ? "#fff" : "#aaa",
              fontSize: "15px", fontWeight: 600,
              cursor: selectedIds.size > 0 ? "pointer" : "default",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            Save{selectedIds.size > 1 ? ` to ${selectedIds.size} boards` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

function SheetBoardRow({ name, isDefault, checked, onToggle }: {
  name: string; isDefault?: boolean; checked: boolean; onToggle: () => void;
}) {
  return (
    <button onClick={onToggle} style={{ width: "100%", padding: "12px 0", background: "none", border: "none", borderBottom: "1px solid #f5f5f5", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", textAlign: "left" }}>
      <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: isDefault ? "#f7f0e4" : "#f7f6f3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M4 2.5h10a.5.5 0 01.5.5v12.5L9 12.5 3.5 15.5V3a.5.5 0 01.5-.5z" fill={isDefault ? "#c9a96e" : "#bbb"} />
        </svg>
      </div>
      <span style={{ flex: 1, fontSize: "14px", fontWeight: 500, color: "#000" }}>{name}</span>
      <div style={{
        width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0,
        border: `2px solid ${checked ? "#c9a96e" : "#ddd"}`,
        background: checked ? "#c9a96e" : "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s",
      }}>
        {checked && (
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M2 5.5l2.5 2.5L9 3" stroke="#fff" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </button>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{ borderRadius: "16px", border: "1px solid #ebebeb", background: "#f7f6f3", padding: "18px", display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <div style={{ ...shimmer, width: "20px", height: "20px", borderRadius: "6px", flexShrink: 0 }} />
        <div style={{ ...shimmer, height: "16px", borderRadius: "6px", flex: 1 }} />
        <div style={{ ...shimmer, width: "56px", height: "16px", borderRadius: "6px" }} />
      </div>
      <div style={{ ...shimmer, height: "13px", borderRadius: "6px", width: "40%" }} />
      <div style={{ borderTop: "1px solid #e8e4dd", paddingTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ ...shimmer, height: "13px", borderRadius: "6px" }} />
        <div style={{ ...shimmer, height: "13px", borderRadius: "6px", width: "75%" }} />
      </div>
    </div>
  );
}

const shimmer: React.CSSProperties = {
  background: "linear-gradient(90deg, #ede9e3 0%, #e2ddd7 50%, #ede9e3 100%)",
  backgroundSize: "800px 100%",
  animation: "nomi-shimmer 1.4s ease-in-out infinite",
};

// ─── Shared small components ──────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: "11px", fontWeight: 600, color: "#bbb", letterSpacing: "0.7px", textTransform: "uppercase", marginBottom: "12px" }}>{children}</p>;
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: "11px", fontWeight: 500, padding: "4px 10px", borderRadius: "99px", background: "#ece9e4", color: "#6b6b6b", display: "inline-block" }}>{children}</span>;
}

// ─── Style it with ───────────────────────────────────────────────────────────

// Normalise category strings from both API format ("top") and inferred format ("tops").
function normaliseCat(raw: string | null | undefined): string {
  if (!raw) return "default";
  const map: Record<string, string> = {
    tops: "top", bottoms: "bottom", bags: "bag",
    dresses: "dress", jumpsuits: "jumpsuit", accessories: "accessory",
  };
  return map[raw] ?? raw;
}

function CategoryIcon({ category }: { category: string }) {
  const s = { stroke: "#c9a96e", strokeWidth: "1.4", fill: "none", strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  const cat = normaliseCat(category);
  switch (cat) {
    case "top":
      return <svg width="26" height="26" viewBox="0 0 22 22" fill="none"><path d="M8 3L3 7.5l3 1.5V19h10V9l3-1.5L14 3a3 3 0 01-6 0z" {...s}/></svg>;
    case "bottom":
      return <svg width="26" height="26" viewBox="0 0 22 22" fill="none"><path d="M5 3h12v5H5V3zM5 8h5v13H5V8zM12 8h5v13h-5V8z" {...s}/></svg>;
    case "shoes":
      return (
        <svg width="26" height="26" viewBox="0 0 22 22" fill="none">
          <path d="M2 17h18v2H2z" {...s}/>
          <path d="M2 17c0-3 3-5 8-5h5l3 5" {...s}/>
          <path d="M15 12V8" {...s}/>
        </svg>
      );
    case "bag":
      return (
        <svg width="26" height="26" viewBox="0 0 22 22" fill="none">
          <rect x="4" y="9" width="14" height="11" rx="2" {...s}/>
          <path d="M8 9V7a3 3 0 016 0v2" {...s}/>
        </svg>
      );
    case "dress":
      return <svg width="26" height="26" viewBox="0 0 22 22" fill="none"><path d="M9 3h4c2 0 3 2 4 5l2 13H3l2-13c1-3 2-5 4-5z" {...s}/></svg>;
    case "jumpsuit":
      return (
        <svg width="26" height="26" viewBox="0 0 22 22" fill="none">
          <path d="M8 3L3 7.5l3 1.5V13h10V9l3-1.5L14 3a3 3 0 01-6 0z" {...s}/>
          <path d="M6 13h4v8H6zM12 13h4v8h-4z" {...s}/>
        </svg>
      );
    case "outerwear":
      return <svg width="26" height="26" viewBox="0 0 22 22" fill="none"><path d="M7 3L3 7l4 2v11h4V9l1 2h1l1-2v11h4V9l4-2-4-4c-1 0-2 2-3 2s-2-2-3-2z" {...s}/></svg>;
    case "accessory":
      return (
        <svg width="26" height="26" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="6" {...s}/>
          <circle cx="11" cy="11" r="3" {...s}/>
        </svg>
      );
    default:
      return <svg width="26" height="26" viewBox="0 0 22 22" fill="none"><path d="M8 3L3 7.5l3 1.5V19h10V9l3-1.5L14 3a3 3 0 01-6 0z" {...s}/></svg>;
  }
}

// Shows a real product image when available; falls back to category icon on error or absence.
// Own state per instance so a broken image for card 2 doesn't affect cards 1 or 3.

function StyleItWithCarousel({ image, matches, analysis }: {
  image: string;
  matches: Match[];
  analysis: Analysis;
}) {
  const [shopSheetOpen, setShopSheetOpen] = useState(false);

  return (
    <div style={{ marginBottom: "24px" }}>
      <SectionLabel>Style it with</SectionLabel>
      <div style={{
        display: "flex", gap: "10px",
        overflowX: "auto",
        margin: "0 -20px",
        padding: "2px 20px 10px",
        scrollbarWidth: "none",
      }}>
        {/* Your piece — plain div, no link */}
        <div style={{ flexShrink: 0, width: "96px" }}>
          <div style={{
            width: "96px", height: "96px", borderRadius: "14px",
            overflow: "hidden", border: "1px solid #e8e4dd",
            background: "#f7f6f3", position: "relative",
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="Your piece"
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }}
            />
            <div style={{ position: "absolute", bottom: "5px", left: "5px", background: "rgba(0,0,0,0.5)", borderRadius: "4px", padding: "2px 5px" }}>
              <span style={{ fontSize: "9px", fontWeight: 600, color: "#fff", letterSpacing: "0.3px" }}>YOU</span>
            </div>
          </div>
          <p style={{ fontSize: "10px", color: "#bbb", marginTop: "6px", lineHeight: 1.3, letterSpacing: "-0.1px" }}>
            {analysis.category}
          </p>
        </div>

        {/* Each match card is its own <a> — direct user gesture, never popup-blocked */}
        {matches.slice(0, 3).map((match, i) => {
          const cat      = normaliseCat(match.category ?? inferMatchCategory(match.name));
          const hasImage = !!match.image;
          const href     = match.productLink ?? match.searchUrl;
          return (
            <a
              key={i}
              href={href ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flexShrink: 0, width: "96px",
                textDecoration: "none", color: "inherit",
                display: "block",
              }}
            >
              {/* Image or icon square */}
              <div style={{
                width: "96px", height: "96px", borderRadius: "14px",
                background: hasImage ? "#f0ede8" : "#f7f0e4",
                border: `1px solid ${hasImage ? "#e0dbd4" : "#ecddc8"}`,
                overflow: "hidden", position: "relative",
              }}>
                <ItemThumbnail src={match.image ?? undefined} imageTier={match.imageTier} fallback={<CategoryIcon category={cat} />} />
                <div style={{
                  position: "absolute", top: "6px", right: "6px",
                  width: "18px", height: "18px", borderRadius: "5px",
                  background: "rgba(0,0,0,0.6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#fff", lineHeight: 1 }}>{i + 1}</span>
                </div>
              </div>
              {/* Text */}
              <div style={{ marginTop: "6px" }}>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "#000", lineHeight: 1.35, letterSpacing: "-0.1px", overflow: "hidden", maxHeight: "30px" }}>
                  {match.name}
                </p>
                {match.store && (
                  <p style={{ fontSize: "10px", color: "#aaa", marginTop: "2px", letterSpacing: "-0.1px", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {match.store}
                  </p>
                )}
                {match.price && (
                  <p style={{ fontSize: "11px", fontWeight: 600, color: "#c9a96e", marginTop: "2px" }}>
                    {match.price}
                  </p>
                )}
              </div>
            </a>
          );
        })}
      </div>

      {/* Shop The Look — opens a sheet so each item is its own direct tap */}
      <button
        onClick={() => setShopSheetOpen(true)}
        style={{
          display: "block", width: "100%", marginTop: "4px",
          padding: "11px 0", borderRadius: "12px",
          border: "1.5px solid #e8e8e8", background: "#fff",
          fontSize: "13px", fontWeight: 500, color: "#444",
          cursor: "pointer", letterSpacing: "-0.1px",
          textAlign: "center",
        }}
      >
        Shop The Look →
      </button>

      {/* Bottom sheet — each row is a direct <a>, never popup-blocked */}
      {shopSheetOpen && (
        <div
          onClick={() => setShopSheetOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 300 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: "420px" }}
          >
            <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "#e0e0e0", margin: "12px auto 0" }} />
            <div style={{ padding: "16px 20px 44px" }}>
              <p style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "-0.2px", marginBottom: "16px" }}>Shop The Look</p>
              {matches.slice(0, 3).map((match, i) => {
                const href = match.productLink ?? match.searchUrl;
                if (!href) return null;
                return (
                  <a
                    key={i}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: "14px", padding: "13px 0", borderBottom: i < 2 ? "1px solid #f5f5f5" : "none", textDecoration: "none" }}
                  >
                    <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#f7f0e4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#c9a96e" }}>{i + 1}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "14px", fontWeight: 500, color: "#000", letterSpacing: "-0.1px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                        {match.name}
                      </p>
                      <p style={{ fontSize: "12px", color: "#aaa", marginTop: "2px" }}>
                        {[match.store, match.price].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: "#bbb" }}>
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function BackArrow() {
  return <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 4L7 10l5.5 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function ChevronRight() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "#ccc" }}><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function CheckIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function SearchIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" /><path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
}
function BookmarkFillIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3.5 2.5h9a.5.5 0 01.5.5v11l-5-3-5 3V3a.5.5 0 01.5-.5z" fill="#c9a96e" /></svg>;
}
function SignalCheckIcon() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ flexShrink: 0 }}><circle cx="5.5" cy="5.5" r="5" fill="#c9a96e" /><path d="M3 5.5l1.8 1.8L8 3.5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function SignalHeartIcon() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ flexShrink: 0 }}><path d="M5.5 9S1 6.2 1 3.5A2.5 2.5 0 015.5 2.2 2.5 2.5 0 0110 3.5C10 6.2 5.5 9 5.5 9z" fill="#c9a96e" /></svg>;
}
