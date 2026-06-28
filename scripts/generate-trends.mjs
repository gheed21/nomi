/**
 * generate-trends.mjs
 *
 * Generates a fresh What's Hot trends digest and writes it to
 * app/data/trends.json. Run manually whenever you want to refresh:
 *
 *   node scripts/generate-trends.mjs
 *
 * Reads ANTHROPIC_API_KEY from .env.local automatically.
 * Uses claude-sonnet-4-6 with the web_search tool to research current
 * editorial fashion coverage, then outputs structured JSON.
 *
 * Cost note: each run makes one Anthropic API call with web search
 * enabled. Web search incurs a per-search charge on top of token costs.
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, "..");

// ── Load .env.local ──────────────────────────────────────────────────────────
function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(ROOT, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    // .env.local missing — rely on environment variables being set externally
  }
}

loadEnvLocal();

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Error: ANTHROPIC_API_KEY is not set.");
  console.error("Add it to .env.local or export it before running.");
  process.exit(1);
}

// ── Prompts ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a fashion industry researcher creating a weekly trend digest for a fashion app called Nomi.

Your task:
1. Use web search to research what fashion editors, critics, and publications are currently discussing — focus on runway themes, emerging designers, color and silhouette trends, and what is getting editorial attention right now.
2. Search reputable fashion sources: Vogue, Harper's Bazaar, The Cut, Business of Fashion, WWD, Refinery29, and runway review sites.
3. Synthesize your findings into 5–6 distinct, specific trend items. Each should feel fresh and concrete — name specific silhouettes, colors, garment types, or designers where relevant.

STRICT CONTENT RULES — follow exactly:
- PARAPHRASE everything in your own words. Do not reproduce article sentences or paragraphs verbatim.
- You may reference a publication by name (e.g. "Vogue noted that...") but never reproduce their text.
- Direct quotes must be under 15 words and used sparingly — only when exact wording adds real meaning.
- Never quote the same source twice across all trend items.

SOURCE ATTRIBUTION RULES — follow exactly:
- For each trend item, list the specific article(s) you actually drew information from.
- Each source must include the publication name AND the direct URL of the article you read.
- Use the exact URL from your search results — do not construct or guess URLs.
- If you referenced multiple articles for one trend, include all of them.
- If you cannot identify a specific article URL for a source, use that publication's homepage URL instead (e.g. "https://www.vogue.com").
- Never omit a source entry — if you used a publication, it must appear with whatever URL you have.

OUTPUT FORMAT — return ONLY valid JSON, no markdown fences, no explanation before or after:
{
  "trends": [
    {
      "title": "Short trend name (3–6 words)",
      "summary": "2–3 sentences paraphrasing the trend conversation. Be specific: mention garment types, colors, silhouettes, or designers drawing attention. Reference publications naturally within the text where relevant.",
      "sources": [
        { "name": "Publication Name", "url": "https://actual-article-url-from-search-results" }
      ]
    }
  ]
}`;

const USER_PROMPT = `Search for what fashion editors and critics are writing about right now — current season runway coverage, emerging designers getting buzz, recurring silhouettes and colors, and any cultural moments influencing style. For each trend item, note the exact URL of each article you draw from. Produce 5–6 trend items. Output only the JSON, nothing else.`;

// ── Run ──────────────────────────────────────────────────────────────────────

async function main() {
  const client = new Anthropic();

  console.log("Researching current fashion trends via web search…");
  console.log("(This may take 20–40 seconds while the model searches.)");

  const response = await client.messages.create({
    model:      "claude-sonnet-4-6",
    max_tokens: 4096,
    system:     SYSTEM_PROMPT,
    tools:      [{ type: "web_search_20250305", name: "web_search" }],
    messages:   [{ role: "user", content: USER_PROMPT }],
  });

  // Extract all text blocks — the JSON output is in the final text block.
  const textContent = response.content
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("\n");

  if (!textContent.trim()) {
    console.error("No text in response. Full response content blocks:");
    console.error(JSON.stringify(response.content, null, 2));
    process.exit(1);
  }

  // Parse JSON — handle the model wrapping it in markdown fences defensively.
  const jsonStr = textContent
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error("Could not parse JSON from response:");
      console.error(textContent);
      process.exit(1);
    }
    parsed = JSON.parse(match[0]);
  }

  if (!Array.isArray(parsed.trends) || parsed.trends.length === 0) {
    console.error("Unexpected response shape — 'trends' array missing or empty:");
    console.error(JSON.stringify(parsed, null, 2));
    process.exit(1);
  }

  // Normalise sources: accept both legacy string[] and new {name, url}[] shapes,
  // and coerce any plain string into {name, url: null}.
  parsed.trends = parsed.trends.map(trend => ({
    ...trend,
    sources: (trend.sources ?? []).map(s =>
      typeof s === "string"
        ? { name: s, url: null }
        : { name: s.name ?? s, url: s.url ?? null }
    ),
  }));

  const output = {
    generatedAt: new Date().toISOString(),
    trends:      parsed.trends,
  };

  const outPath = resolve(ROOT, "app/data/trends.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n", "utf8");

  console.log(`\n✓ Wrote ${output.trends.length} trends to app/data/trends.json`);
  output.trends.forEach((t, i) => {
    console.log(`\n  ${i + 1}. ${t.title}`);
    t.sources.forEach(s => {
      console.log(`     ${s.name}: ${s.url ?? "(no url)"}`);
    });
  });
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
