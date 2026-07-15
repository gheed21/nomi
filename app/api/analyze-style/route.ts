import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

// Lightweight sibling of /api/analyze — used for onboarding's "upload outfits
// you've worn" step. Only extracts taste signal (category/color/aesthetic)
// from a photo of the user, not shoppable matches, so it skips the matching
// prompt and SerpAPI image enrichment entirely to keep the per-photo cost low.
const SYSTEM_PROMPT = `You are looking at a photo of an outfit someone has worn, purely to learn their personal style — not to find or suggest products.

Describe the outfit's dominant garment, color, and overall aesthetic. Respond with ONLY this JSON, nothing else:
{ "category": string, "color": string, "aesthetic": string }

- category: the single dominant garment type shown (e.g. "dress", "trouser", "jacket", "skirt")
- color: the dominant color, specific and searchable (e.g. "cream", "olive green", "black") — never vague terms like "neutral" or "dark"
- aesthetic: one or two words for the overall style (e.g. "minimalist", "boho", "streetwear", "old money", "romantic")`;

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json() as { image?: string };
    if (!image) return NextResponse.json({ error: "Image required" }, { status: 400 });

    const match = image.match(/^data:(.+);base64,(.+)$/);
    if (!match) return NextResponse.json({ error: "Invalid image format" }, { status: 400 });
    const mediaType  = match[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    const base64Data = match[2];

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 150,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } },
          { type: "text", text: "Describe this outfit's category, color, and aesthetic." },
        ],
      }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "Could not parse response" }, { status: 500 });

    const parsed = JSON.parse(jsonMatch[0]) as { category?: string; color?: string; aesthetic?: string };
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Analyze-style error:", err);
    return NextResponse.json({ error: "Failed to analyze photo" }, { status: 500 });
  }
}
