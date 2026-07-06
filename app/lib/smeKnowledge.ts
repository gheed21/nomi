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
