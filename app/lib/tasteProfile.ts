// Shared taste-profile store: the single source of truth for `nomi_taste_profile`.
// Explore and Results used to each keep their own inline updateTasteProfile(),
// which drifted (one wrote `categories`, the other `savedCategories`) and neither
// was ever read back — this consolidates both into one schema plus a scoring
// helper so the signal can actually drive personalization.

export type OnboardingProfile = {
  styles?: string[];
  styleDescription?: string;
  gender?: string;
  neverWear?: string;
  budgetMin?: number;
  budgetMax?: number;
  styleInfluencers?: string;
  lifeStage?: string;
  lifeStageDescription?: string;
  shoppingTier?: string;
  shoppingTierDescription?: string;
  fitPreferences?: string;
  sizing?: Record<string, string>;
};

type Counts = Record<string, number>;

export type TasteProfile = OnboardingProfile & {
  aesthetics?: Counts;
  categories?: Counts;
  colors?: Counts;
  stores?: Counts;
};

export type FeedbackSignal = { store?: string; category?: string; price?: string; aesthetic?: string };
export type FeedbackStore  = { positive?: FeedbackSignal[]; negative?: FeedbackSignal[] };

const PROFILE_KEY  = "nomi_taste_profile";
const FEEDBACK_KEY = "nomi_feedback_signals";

export function getTasteProfile(): TasteProfile {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "{}"); } catch { return {}; }
}

export function getFeedbackSignals(): FeedbackStore {
  try {
    const raw = JSON.parse(localStorage.getItem(FEEDBACK_KEY) ?? "{}");
    return { positive: raw.positive ?? [], negative: raw.negative ?? [] };
  } catch { return { positive: [], negative: [] }; }
}

function incCount(bucket: Counts | undefined, key?: string): Counts | undefined {
  if (!key) return bucket;
  return { ...(bucket ?? {}), [key]: (bucket?.[key] ?? 0) + 1 };
}

type TasteSignal = { aesthetic?: string; category?: string; color?: string; store?: string };

/** Canonical signal recorder — call this instead of writing to `nomi_taste_profile` directly. */
export function recordTasteSignal(signal: TasteSignal): TasteProfile {
  return recordTasteSignals([signal]);
}

/** Batch form — reads and writes localStorage once regardless of how many signals are passed. */
export function recordTasteSignals(signals: TasteSignal[]): TasteProfile {
  let profile = getTasteProfile();
  for (const signal of signals) {
    profile = {
      ...profile,
      aesthetics: incCount(profile.aesthetics, signal.aesthetic),
      categories: incCount(profile.categories, signal.category),
      colors:     incCount(profile.colors, signal.color),
      stores:     incCount(profile.stores, signal.store),
    };
  }
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* storage quota */ }
  return profile;
}

/** One-time fold of the legacy `savedCategories` key into `categories` so old signal isn't lost. */
export function migrateLegacyTasteProfile(): void {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return;
    const profile = JSON.parse(raw);
    if (!profile.savedCategories) return;
    const merged: Counts = { ...(profile.categories ?? {}) };
    for (const [k, v] of Object.entries(profile.savedCategories as Counts)) {
      merged[k] = (merged[k] ?? 0) + (v as number);
    }
    const rest = { ...profile };
    delete rest.savedCategories;
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...rest, categories: merged }));
  } catch { /* ignore */ }
}

// ─── Prompt builders ───────────────────────────────────────────────────────
// Shared by /api/analyze and /api/for-you so taste/feedback are described to
// the model identically in both places rather than two copies drifting apart.

export function buildFeedbackSection(fb?: FeedbackStore | null): string {
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

export function buildTasteSection(tp?: TasteProfile | null): string {
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
  if (tp.aesthetics && Object.keys(tp.aesthetics).length > 0) {
    const top = Object.entries(tp.aesthetics).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k);
    lines.push(`Frequently saved aesthetics/tags: ${top.join(", ")}.`);
  }
  if (tp.categories && Object.keys(tp.categories).length > 0) {
    const top = Object.entries(tp.categories).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k);
    lines.push(`Frequently saved categories: ${top.join(", ")}.`);
  }
  if (tp.colors && Object.keys(tp.colors).length > 0) {
    const top = Object.entries(tp.colors).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k);
    lines.push(`Frequently saved colors: ${top.join(", ")}.`);
  }
  return lines.length > 0 ? `\n${lines.join("\n")}` : "";
}

// ─── Text-based signal extraction ─────────────────────────────────────────
// Turns free text (Pinterest board names/descriptions, pin titles) into taste
// signals with zero extra API cost — no image analysis, just keyword matching.
// Aesthetic keys mirror the onboarding style tiles (Onboarding.tsx) so a
// Pinterest board named "Minimalist Outfits" reinforces the same "minimal"
// counter as picking "Clean & minimal" in the style quiz, rather than the two
// signals fragmenting into different dictionary keys.

const AESTHETIC_KEYWORDS: Record<string, string> = {
  minimalist: "minimal", minimal: "minimal", clean: "minimal",
  streetwear: "streetwear", street: "streetwear",
  romantic: "romantic", feminine: "romantic",
  classic: "classic", timeless: "classic",
  edgy: "edgy",
  boho: "boho", bohemian: "boho",
  "old money": "oldmoney", oldmoney: "oldmoney", "quiet luxury": "oldmoney",
  coastal: "coastal",
  formal: "formal",
  workwear: "workwear", office: "workwear", business: "workwear",
  preppy: "preppy",
  sporty: "sporty", athleisure: "sporty",
  cute: "cute", girly: "cute",
  colorful: "colorful",
  vintage: "vintage",
  grunge: "grunge",
};

const CATEGORY_KEYWORDS: Record<string, string> = {
  dress: "dress", dresses: "dress",
  trouser: "trouser", trousers: "trouser", pants: "trouser", pant: "trouser",
  jean: "jeans", jeans: "jeans", denim: "jeans",
  skirt: "skirt", skirts: "skirt",
  jacket: "jacket", coat: "jacket", outerwear: "jacket",
  sweater: "knitwear", knit: "knitwear", cardigan: "knitwear",
  top: "top", blouse: "top", shirt: "top",
  shoe: "shoes", shoes: "shoes", boot: "shoes", boots: "shoes", heel: "shoes", heels: "shoes", sneaker: "shoes", sneakers: "shoes",
  bag: "bag", purse: "bag", tote: "bag",
  jewelry: "jewelry", necklace: "jewelry", earring: "jewelry", earrings: "jewelry",
};

/** Scans free text for known aesthetic/category keywords — no AI call, just substring matching. */
export function extractTasteSignalsFromText(text: string): TasteSignal[] {
  const lower = text.toLowerCase();
  // Dedupe by resulting tag, not by matched keyword — several synonyms map to
  // the same tag (e.g. "minimalist"/"minimal"/"clean" → "minimal"), and one of
  // them is often a substring of another, so a single board mentioning both
  // would otherwise count "minimal" 2-3x for what is really one signal.
  const aesthetics = new Set<string>();
  const categories = new Set<string>();
  for (const [kw, tag] of Object.entries(AESTHETIC_KEYWORDS)) {
    if (lower.includes(kw)) aesthetics.add(tag);
  }
  for (const [kw, tag] of Object.entries(CATEGORY_KEYWORDS)) {
    if (lower.includes(kw)) categories.add(tag);
  }
  const signals: TasteSignal[] = [
    ...[...aesthetics].map(tag => ({ aesthetic: tag })),
    ...[...categories].map(tag => ({ category: tag })),
  ];
  return signals;
}

// ─── Affinity scoring ──────────────────────────────────────────────────────
// Ranks a candidate against the profile's counters plus explicit thumbs up/down
// feedback. Higher score = closer to the user's taste; used to re-rank saved
// looks/items and to weight AI-generated "For you" picks.

export type AffinityInput = {
  tags?: string[];
  category?: string;
  color?: string;
  store?: string;
};

export function scoreAffinity(input: AffinityInput, profile: TasteProfile, feedback?: FeedbackStore): number {
  const aesthetics = profile.aesthetics ?? {};
  const categories = profile.categories ?? {};
  const colors     = profile.colors ?? {};
  const stores     = profile.stores ?? {};

  let score = 0;
  (input.tags ?? []).forEach(tag => { score += aesthetics[tag] ?? 0; });
  if (input.category) score += (categories[input.category] ?? 0) * 1.5;
  if (input.color)    score += colors[input.color] ?? 0;
  if (input.store)    score += stores[input.store] ?? 0;

  if (feedback) {
    const matches = (f: FeedbackSignal) =>
      (!!f.category  && f.category === input.category) ||
      (!!f.aesthetic && !!input.tags?.includes(f.aesthetic)) ||
      (!!f.store     && f.store === input.store);
    if ((feedback.positive ?? []).some(matches)) score += 3;
    if ((feedback.negative ?? []).some(matches)) score -= 4;
  }
  return score;
}
