import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getCategoryExpertise } from "@/app/lib/smeKnowledge";
import { buildTasteSection, buildFeedbackSection, type TasteProfile, type FeedbackStore } from "@/app/lib/tasteProfile";
import { enrichMatchesWithImages } from "@/app/lib/serpImages";

const client = new Anthropic();

const categoryExpertiseSection = getCategoryExpertise()
  ? `\nSTORE CATEGORY KNOWLEDGE (authoritative — a store listed as NOT carrying a category means never recommend it for that category, even if it fits the general vibe):\n${getCategoryExpertise()}\n`
  : "";

const SYSTEM_PROMPT = `You generate a short list of personalized shopping picks for Nomi's Explore "For you" feed. This is not a chat reply — output only the pick list, nothing else.
${categoryExpertiseSection}
Rules for each pick:
- Always include a color and a specific style descriptor — never a bare item name ("black satin slip midi dress", not "dress").
- Phrase as "[item] at [store]" — never "store tends to carry it" or "worth checking".
- Never use the same store twice across the whole list.
- Never imply current stock — no "is in stock" or "available now".
- Immediately after the store name, add a bracketed search term of 2-5 words, color first, no punctuation: "black satin slip midi dress at Reformation [black satin slip dress]".
- Never recommend DSW or Mejuri.
- Spread picks across at least 3 different price tiers unless the taste profile clearly indicates one tier only.

Output format — exactly one line per pick, nothing else, no numbering, no headers:
KIND | REASON | ITEM SENTENCE

- KIND is exactly "match" or "different".
- REASON is 3-8 words in plain language, second person, e.g. "Because you save a lot of minimalist pieces" or "Something a little different for you".
- ITEM SENTENCE is the "[item] at [store] [search term]" sentence described above.
- Produce 6 lines total: 4-5 "match" picks grounded in the taste signal below, and 1-2 "different" picks — adjacent to their taste but a genuine stretch, not just a repeat of the same aesthetic.
- If the taste signal below is thin or empty, default to broadly flattering, versatile picks across a few aesthetics rather than refusing to answer.`;

export async function POST(req: NextRequest) {
  try {
    const { tasteProfile, feedbackSignals, trendingTags } = await req.json() as {
      tasteProfile?: TasteProfile;
      feedbackSignals?: FeedbackStore;
      trendingTags?: string[];
    };

    const tasteSection    = buildTasteSection(tasteProfile);
    const feedbackSection = buildFeedbackSection(feedbackSignals);
    const trendsSection   = trendingTags && trendingTags.length > 0
      ? `\nCurrently trending tags among this user's own saved looks: ${trendingTags.join(", ")}. Nudge toward these where they fit the taste profile, but don't force a trend that clashes with it.`
      : "";

    const system = `${SYSTEM_PROMPT}\n${tasteSection}${feedbackSection}${trendsSection}`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      system,
      messages: [{ role: "user", content: "Generate today's For You picks." }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    // Item sentences are in our own controlled format — "... at <Store> [<search term>]" —
    // so parse the store + search term directly rather than scanning for known store names
    // the way extractStoreLinks does for free-form chat text. Store name uses [^\[\]]
    // rather than a Latin-only class so accented names (Polène, Sézane, Totème) still
    // match — an earlier ASCII-only class silently dropped every pick at those stores.
    const ITEM_PATTERN = /^(.*?)\s+at\s+([^[\]]+?)\s*\[([^\]]{2,40})\]\s*$/i;

    const parsed = text
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const parts = line.split("|").map(p => p.trim());
        if (parts.length < 3) return null;
        const [kindRaw, reason, itemSentence] = parts;
        const kind: "match" | "different" = kindRaw.toLowerCase() === "different" ? "different" : "match";

        const m = itemSentence.match(ITEM_PATTERN);
        if (!m) return null;
        const [, , storeName, searchTerm] = m;

        return { kind, reason, name: searchTerm.trim(), store: storeName.trim() };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    // Real product photos via the same SerpAPI pipeline /api/analyze uses for
    // outfit matches — falls back to a verified store search / Google Shopping
    // link (no image) when SERPAPI_KEY isn't set or no confident result is found.
    const enriched = await enrichMatchesWithImages(parsed);

    const picks = enriched.map(p => ({
      kind: p.kind,
      reason: p.reason,
      item: p.name,
      displayName: p.store,
      url: p.productLink,
      image: p.image,
      imageTier: p.imageTier,
    }));

    return NextResponse.json({ picks });
  } catch (err) {
    console.error("For-you error:", err);
    return NextResponse.json({ error: "Failed to generate picks" }, { status: 500 });
  }
}
