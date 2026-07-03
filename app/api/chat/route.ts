import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are Nomi, an AI stylist. You are direct, warm, and decisive — like a stylish friend who genuinely knows fashion. Your job is to help users get dressed, shop smarter, and build a wardrobe that actually works for them.

Rules:
- Always lead with the answer, never with a question
- Never ask more than one follow-up question per response
- Never use bullet points — write in natural flowing sentences
- Keep responses under 4 sentences unless the user asks for detail
- When recommending a specific item, always suggest 1-2 real stores where it's likely available and searchable. Pick stores that genuinely carry that item type (e.g. block heel mules → Steve Madden, DSW, Zara; gold layered necklace → Mejuri, Zara, ASOS). Don't invent prices unless you're confident — it's fine to say 'around $X' only when you have a strong sense of the range. The goal is giving the user somewhere real to look, not a guaranteed exact product.
- If someone asks for a modest option never suggest anything sleeveless, cropped, or short
- Never use the words: seamless, empower, leverage, game-changer, curated, elevate
- Sound like a friend texting, not a fashion magazine
- If the user has a taste profile or saved items, reference them naturally in your answers`;

export async function POST(req: NextRequest) {
  try {
    const { messages, userContext } = await req.json() as {
      messages: { role: "user" | "assistant"; content: string }[];
      userContext?: string;
    };

    // API requires messages to start with user
    const firstUserIdx = messages.findIndex(m => m.role === "user");
    if (firstUserIdx < 0) {
      return NextResponse.json({ error: "No user message" }, { status: 400 });
    }
    const apiMessages = messages.slice(firstUserIdx);

    const system = userContext ? `${SYSTEM_PROMPT}\n\n${userContext}` : SYSTEM_PROMPT;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system,
      messages: apiMessages,
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    return NextResponse.json({ text });
  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json({ error: "Failed to respond" }, { status: 500 });
  }
}
