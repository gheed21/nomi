import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

type Filters = {
  colors?:              string[];
  customColor?:         string;
  priceRange?:          [number, number];
  sortOrder?:           "low-high" | "high-low";
  itemCategory?:        string;
  itemSubcategories?:   string[];
  secondhandOnly?:      boolean;
  recommendationStyle?: "specific" | "direction";
  description?:         string;
};

function buildSystemPrompt(filters?: Filters): string {
  const isDirection = filters?.recommendationStyle === "direction";

  const allColors = [
    ...(filters?.colors ?? []),
    ...(filters?.customColor?.trim() ? [filters.customColor.trim()] : []),
  ];
  const colorSection = allColors.length
    ? `\nColor direction: Suggest pieces in or compatible with these colors: ${allColors.join(", ")}.`
    : "";

  const budgetSection = (() => {
    const [lo, hi] = filters?.priceRange ?? [0, 500];
    const isDefault = lo === 0 && hi === 500;
    if (isDefault) return "";
    let s = "\nBudget: Each suggested piece must be priced";
    if (lo === 0)  s += ` under $${hi}`;
    else if (hi >= 500) s += ` over $${lo}`;
    else s += ` between $${lo} and $${hi}`;
    s += ". Only suggest stores that carry items at this price point.";
    if (filters?.sortOrder === "low-high") s += " Order suggestions from lowest to highest price.";
    if (filters?.sortOrder === "high-low") s += " Order suggestions from highest to lowest price.";
    return s;
  })();

  const descSection = filters?.description?.trim()
    ? `\nUser's specific request — incorporate this word for word: "${filters.description.trim()}"`
    : "";

  const categorySection = (() => {
    if (!filters?.itemCategory) return "";
    const subs = filters.itemSubcategories?.length
      ? `, specifically: ${filters.itemSubcategories.join(", ")}`
      : "";
    return `\nItem type: The user is looking for ${filters.itemCategory}${subs}. At least one of your suggestions must match this item type.`;
  })();

  const secondhandSection = filters?.secondhandOnly
    ? "\nSecondhand only: ONLY suggest items available on secondhand or resale platforms — Depop, ThredUp, Poshmark, or Vinted. Do not suggest any retail or brand-direct stores."
    : "";

  if (isDirection) {
    return `You are Nomi, an expert fashion stylist. Analyze the clothing item in the image and identify its key style attributes: color, category, silhouette, fabric feel, and overall aesthetic. Then suggest exactly 3 complementary pieces that would complete an outfit with this item.
${colorSection}${budgetSection}${categorySection}${secondhandSection}${descSection}

Return style guidance and aesthetic direction — not specific product links. For each suggestion provide: a style descriptor name (e.g. "oversized camel trench coat"), a direction field with 2–3 sentences of detailed styling guidance explaining how to wear it with the uploaded piece, and a reason field with one concise sentence on why it works.

Return JSON only, no markdown:
{ "analysis": { "color": string, "category": string, "aesthetic": string }, "matches": [ { "name": string, "direction": string, "reason": string } ] }`;
  }

  return `You are Nomi, an expert fashion stylist. Analyze the clothing item in the image and identify its key style attributes: color, category, silhouette, fabric feel, and overall aesthetic. Then suggest exactly 3 complementary pieces that would complete an outfit with this item.

Store selection rules:
- Only suggest stores that genuinely carry that item type at the stated price range. Never suggest luxury brands (Louis Vuitton, Gucci, Prada, Bottega) for items under $150.
- Price tier mapping: $0–$60 → ASOS, Zara, H&M, Urban Outfitters, Mango, PrettyLittleThing, Princess Polly; $60–$150 → Anthropologie, Free People, Revolve, Nordstrom, Madewell, Reformation; $150–$400 → Saks, Bloomingdales, AllSaints, ba&sh, Veronica Beard; $400+ → Net-a-Porter, Matches, luxury department stores.
- Be specific: use the actual product line or style name when possible (e.g. "Levi's 501 Original" not "jeans").
${colorSection}${budgetSection}${categorySection}${secondhandSection}${descSection}

For each piece return: a specific item name, the store or brand, an estimated price range, one sentence explaining why it works stylistically, and a Google Shopping search URL.

searchUrl format: https://www.google.com/search?tbm=shop&q=item+name+store+name — replace every space with + and concatenate item name and store name. Example: "Black Ribbed Crop Top" at "ASOS" → https://www.google.com/search?tbm=shop&q=Black+Ribbed+Crop+Top+ASOS

Return JSON only, no markdown:
{ "analysis": { "color": string, "category": string, "aesthetic": string }, "matches": [ { "name": string, "store": string, "price": string, "reason": string, "searchUrl": string } ] }`;
}

function buildTextSystemPrompt(filters?: Filters): string {
  const allColors = [
    ...(filters?.colors ?? []),
    ...(filters?.customColor?.trim() ? [filters.customColor.trim()] : []),
  ];
  const colorSection = allColors.length
    ? `\nColor direction: Suggest pieces in or compatible with these colors: ${allColors.join(", ")}.`
    : "";

  const budgetSection = (() => {
    const [lo, hi] = filters?.priceRange ?? [0, 500];
    if (lo === 0 && hi === 500) return "";
    let s = "\nBudget: Each suggested piece must be priced";
    if (lo === 0)       s += ` under $${hi}`;
    else if (hi >= 500) s += ` over $${lo}`;
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
    ? "\nSecondhand only: ONLY suggest items on Depop, ThredUp, Poshmark, or Vinted." : "";

  return `You are Nomi, an expert fashion stylist. Based on the item description provided, suggest exactly 3 complementary pieces that complete an outfit with it.

Store selection rules:
- Only suggest stores that genuinely carry that item type at the stated price range.
- Price tier mapping: $0–$60 → ASOS, Zara, H&M, Urban Outfitters, Mango; $60–$150 → Anthropologie, Free People, Revolve, Nordstrom, Madewell, Reformation; $150–$400 → Saks, Bloomingdales, AllSaints, ba&sh; $400+ → Net-a-Porter, Matches.
- Be specific: use actual product line or style names when possible.
${colorSection}${budgetSection}${categorySection}${secondhandSection}

For each piece return: a specific item name, the store or brand, an estimated price range, one sentence explaining why it works stylistically, and a Google Shopping search URL.
searchUrl format: https://www.google.com/search?tbm=shop&q=item+name+store+name

Also infer "analysis" fields from the description: color (dominant color of the described item), category (item type), aesthetic (one evocative sentence about the overall style).

Return JSON only, no markdown:
{ "analysis": { "color": string, "category": string, "aesthetic": string }, "matches": [ { "name": string, "store": string, "price": string, "reason": string, "searchUrl": string } ] }`;
}

export async function POST(req: NextRequest) {
  try {
    const { image, textPrompt, filters, tasteProfile: _tasteProfile } = await req.json() as {
      image?: string;
      textPrompt?: string;
      filters?: Filters;
      tasteProfile?: unknown;
    };

    // ── Text-only path (from Explore "Find this") ──────────────────────────────
    if (textPrompt && !image) {
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: buildTextSystemPrompt(filters),
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
    if (!match) return NextResponse.json({ error: "Invalid image format" }, { status: 400 });

    const mediaType  = match[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    const base64Data = match[2];

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: buildSystemPrompt(filters),
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } },
            { type: "text", text: "Analyze this clothing item and suggest 3 matching pieces." },
          ],
        },
      ],
    });

    const text      = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "Could not parse response" }, { status: 500 });
    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error("Analyze error:", err);
    return NextResponse.json({ error: "Failed to analyze" }, { status: 500 });
  }
}
