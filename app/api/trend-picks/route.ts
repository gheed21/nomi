import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getCategoryExpertise } from "@/app/lib/smeKnowledge";
import { buildTasteSection, buildFeedbackSection, type TasteProfile, type FeedbackStore } from "@/app/lib/tasteProfile";
import { enrichMatchesWithImages, parseItemSentence } from "@/app/lib/serpImages";

const client = new Anthropic();

const categoryExpertiseSection = getCategoryExpertise()
  ? `\nSTORE CATEGORY KNOWLEDGE (authoritative — a store listed as NOT carrying a category means never recommend it for that category, even if it fits the general vibe):\n${getCategoryExpertise()}\n`
  : "";

// Turns one trend digest item into "here's what this means for you" — the
// personalization half of the trend digest. The free half (does this trend
// even match the user's taste?) is scoreAffinity() against trend.tags,
// computed client-side with no API call; this route only runs once a user
// taps into a specific trend, and its result is cached per trend per day.
const SYSTEM_PROMPT = `You translate a fashion trend into personalized shopping picks and outfit ideas for one Nomi user. This is not a chat reply — output only the structured list described below, nothing else.
${categoryExpertiseSection}
Rules for each piece:
- Always include a color and a specific style descriptor — never a bare item name ("black satin slip midi dress", not "dress").
- Phrase as "[item] at [store]" — never "store tends to carry it" or "worth checking".
- Never use the same store twice across the whole list.
- Never imply current stock — no "is in stock" or "available now".
- Immediately after the store name, add a bracketed search term of 2-5 words, color first, no punctuation: "black satin slip midi dress at Reformation [black satin slip dress]".
- Never recommend DSW or Mejuri.
- Spread pieces across at least 2 different price tiers unless the taste profile clearly indicates one tier only.
- Root every piece in the trend described below, but the user's own taste profile and never-wear rules always take priority. If the trend genuinely clashes with their stated taste, lean toward their taste and only pull in the parts of the trend that are compatible — never force a piece that violates a stated preference just to match the trend.

Output format — exactly this structure, nothing else, no markdown fences:
PIECES
REASON | ITEM SENTENCE
(exactly 5 lines, one per piece)

OUTFITS
OUTFIT TITLE | comma-separated piece numbers, 1-indexed against the 5 PIECES lines above, 2-4 numbers per outfit
(exactly 2 lines, one per outfit idea)

- REASON is 3-8 words, plain language, second person, tying the piece to both the trend and the user's taste — e.g. "Fits the asymmetrical-neckline trend and your minimalist edge".
- OUTFIT TITLE is 2-5 words naming the look, e.g. "Weekend errands, elevated".
- If the taste profile below is thin or empty, default to broadly flattering picks that still root in the trend rather than refusing to answer.`;

export async function POST(req: NextRequest) {
  try {
    const { trend, tasteProfile, feedbackSignals } = await req.json() as {
      trend?: { title: string; summary: string; whyItMatters?: string; keywords?: string[] };
      tasteProfile?: TasteProfile;
      feedbackSignals?: FeedbackStore;
    };
    if (!trend) return NextResponse.json({ error: "Trend required" }, { status: 400 });

    const tasteSection    = buildTasteSection(tasteProfile);
    const feedbackSection = buildFeedbackSection(feedbackSignals);
    const trendSection = `\nTREND: "${trend.title}"\n${trend.summary}` +
      (trend.whyItMatters ? `\nWhy it matters: ${trend.whyItMatters}` : "") +
      (trend.keywords?.length ? `\nKey descriptive terms: ${trend.keywords.join(", ")}` : "");

    const system = `${SYSTEM_PROMPT}\n${tasteSection}${feedbackSection}${trendSection}`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      system,
      messages: [{ role: "user", content: `Generate personalized pieces and outfit ideas for the "${trend.title}" trend.` }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const piecesBlock  = text.match(/PIECES\s*([\s\S]*?)\s*OUTFITS/i)?.[1] ?? "";
    const outfitsBlock = text.match(/OUTFITS\s*([\s\S]*)/i)?.[1] ?? "";

    const parsedPieces = piecesBlock
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean)
      .map(line => {
        const parts = line.split("|").map(p => p.trim());
        if (parts.length < 2) return null;
        const [reason, itemSentence] = parts;
        const item = parseItemSentence(itemSentence);
        return item ? { reason, ...item } : null;
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    // Real product photos via the same SerpAPI pipeline /api/analyze and
    // /api/for-you use — falls back to a verified store search / Google
    // Shopping link (no image) when SERPAPI_KEY isn't set.
    const enriched = await enrichMatchesWithImages(parsedPieces);
    const picks = enriched.map(p => ({
      reason: p.reason,
      item: p.name,
      displayName: p.store,
      url: p.productLink,
      image: p.image,
      imageTier: p.imageTier,
    }));

    const outfits = outfitsBlock
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean)
      .map(line => {
        const parts = line.split("|").map(p => p.trim());
        if (parts.length < 2) return null;
        const [title, idxRaw] = parts;
        const pieceIndices = idxRaw
          .split(",")
          .map(s => parseInt(s.trim(), 10) - 1)
          .filter(i => i >= 0 && i < picks.length);
        return pieceIndices.length ? { title, pieceIndices } : null;
      })
      .filter((o): o is NonNullable<typeof o> => o !== null);

    return NextResponse.json({ picks, outfits });
  } catch (err) {
    console.error("Trend-picks error:", err);
    return NextResponse.json({ error: "Failed to generate trend picks" }, { status: 500 });
  }
}
