import fs from "fs";
import path from "path";

// Pulls the "Category Expertise" section out of the fashion-stores SME doc and
// injects it into the actual runtime prompts. Without this, SME.md is just a
// reference file Claude Code reads when hand-editing prompts — corrections
// made there (e.g. "Reformation doesn't carry jeans") never reach the live
// model, and can silently drift out of sync with what prompts actually say.
// Only this one section is injected (not the whole ~600-line doc) to keep the
// added prompt/token cost small — this is the section that directly prevents
// wrong-store-for-category recommendations.

const SME_PATH = path.join(process.cwd(), ".claude", "smes", "fashion-stores", "SME.md");

function extractSection(content: string, heading: string): string {
  const marker = `## ${heading}`;
  const start = content.indexOf(marker);
  if (start === -1) return "";
  const rest = content.slice(start + marker.length);
  const nextHeadingIdx = rest.search(/\n## /);
  const body = nextHeadingIdx === -1 ? rest : rest.slice(0, nextHeadingIdx);
  return body.trim();
}

let cached: string | null = null;

export function getCategoryExpertise(): string {
  if (cached !== null) return cached;
  try {
    const content = fs.readFileSync(SME_PATH, "utf-8");
    cached = extractSection(content, "Category Expertise");
    if (!cached) console.warn("[sme] 'Category Expertise' section not found in SME.md");
  } catch (err) {
    console.warn("[sme] could not read SME.md, skipping category expertise injection:", err);
    cached = "";
  }
  return cached;
}

// Wraps getCategoryExpertise() into the system-prompt block shared by every
// route that injects it (analyze, for-you, trend-picks, chat) — was
// previously copy-pasted identically in all four, which is how this rule
// would have silently drifted if added to only one.
//
// The "Best:" lists in SME.md are ordered by fit, not by how often a store
// should be recommended — but list position still reads as a ranking to the
// model, and Zara/Steve Madden happen to lead nearly every apparel/shoe
// category (Tops & Dresses, Denim, Trousers, Coats all start with Zara;
// both shoe categories start with Steve Madden). With nothing telling the
// model to look past the first name, that ordering plus their general
// brand-name prominence made them the default pick far more than the doc's
// other equally-valid options — hence the explicit rotation instruction.
export function getCategoryExpertiseSection(): string {
  const body = getCategoryExpertise();
  if (!body) return "";
  return `\nSTORE CATEGORY KNOWLEDGE (authoritative — a store listed as NOT carrying a category means never recommend it for that category, even if it fits the general vibe):\n${body}\n\nStore variety matters as much as category fit: within a "Best:" list, don't default to whichever store happens to be listed first — treat the full list as equally valid and rotate through it. In particular, don't lean on Zara for apparel or Steve Madden for shoes by default; only pick them when the user's stated style or budget specifically points there, or when the rest of that category's list has already been used recently.\n`;
}
