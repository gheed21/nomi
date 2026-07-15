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
 * Recency gate: the script extracts page_age metadata from the API's
 * web_search_tool_result blocks and cross-checks every cited source URL.
 * Sources older than MAX_ARTICLE_AGE_DAYS are flagged. A secondary check
 * fetches article:published_time from HTML metadata for any URL that
 * wasn't matched in the API data.
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

const MAX_ARTICLE_AGE_DAYS = 10;

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
  } catch { /* ignore */ }
}

loadEnvLocal();

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Error: ANTHROPIC_API_KEY is not set.");
  console.error("Add it to .env.local or export it before running.");
  process.exit(1);
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function todayString() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

// Parse page_age string → days (number) or null if unparseable.
// Handles two formats the API uses:
//   Relative: "3 days ago", "2 weeks ago", "12 hours ago", "yesterday"
//   Absolute: "May 22, 2026", "June 3, 2026"
function parsePageAgeDays(pageAge) {
  if (!pageAge) return null;
  const s = pageAge.trim();

  // Relative formats
  const lower = s.toLowerCase();
  if (lower === "just now" || lower === "today" || lower.includes("hour") || lower.includes("minute") || lower.includes("second")) return 0;
  if (lower === "yesterday") return 1;
  const rel = lower.match(/^(\d+)\s+(day|week|month|year)/);
  if (rel) {
    const n = parseInt(rel[1], 10);
    if (rel[2] === "day")   return n;
    if (rel[2] === "week")  return n * 7;
    if (rel[2] === "month") return n * 30;
    if (rel[2] === "year")  return n * 365;
  }

  // Absolute date format: "May 22, 2026" or "Jun 3, 2026" etc.
  const abs = Date.parse(s);
  if (!isNaN(abs)) {
    return Math.floor((Date.now() - abs) / 86_400_000);
  }

  return null;
}

// ── API metadata extraction ───────────────────────────────────────────────────

// Walks all web_search_tool_result blocks in the response and returns
// a Map of url → { pageAge: string, ageDays: number|null }.
function extractSearchResultAges(responseContent) {
  const map = new Map();
  for (const block of responseContent) {
    if (block.type !== "web_search_tool_result") continue;
    for (const result of block.content ?? []) {
      if (result.type !== "web_search_result" || !result.url) continue;
      const ageDays = parsePageAgeDays(result.page_age ?? null);
      map.set(result.url, { pageAge: result.page_age ?? null, ageDays });
    }
  }
  return map;
}

// Best-effort URL match: exact first, then same hostname + common path prefix.
function findAgeForUrl(url, ageMap) {
  if (ageMap.has(url)) return ageMap.get(url);
  try {
    const u = new URL(url);
    for (const [candidateUrl, data] of ageMap.entries()) {
      try {
        const c = new URL(candidateUrl);
        if (c.hostname === u.hostname &&
            (c.pathname.startsWith(u.pathname.slice(0, 20)) ||
             u.pathname.startsWith(c.pathname.slice(0, 20)))) {
          return data;
        }
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
  return null;
}

// ── Independent HTML publish-date fetch ──────────────────────────────────────
// For sources we couldn't match via API metadata, fetch the page and look for
// article:published_time or datePublished in JSON-LD.

async function fetchPublishDate(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NomiTrendBot/1.0)" },
      signal: AbortSignal.timeout(6000),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Open Graph article date
    const ogMatch = html.match(/<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i)
                 ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']article:published_time["']/i);
    if (ogMatch) return new Date(ogMatch[1]);

    // JSON-LD datePublished
    const ldMatch = html.match(/"datePublished"\s*:\s*"([^"]+)"/);
    if (ldMatch) return new Date(ldMatch[1]);

    // <time datetime="..."> (common in editorial sites)
    const timeMatch = html.match(/<time[^>]+datetime=["']([0-9T:\-+Z]+)["']/i);
    if (timeMatch) return new Date(timeMatch[1]);

    return null;
  } catch {
    return null;
  }
}

function dateDiffDays(date) {
  if (!date || isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

// ── Prompts ──────────────────────────────────────────────────────────────────

// Keep in sync with CANONICAL_AESTHETIC_TAGS in app/lib/tasteProfile.ts — this
// script runs standalone (plain Node, no build step) so it can't import that
// TS module directly. This is the vocabulary scoreAffinity() uses to match a
// trend against a user's taste profile, so "tags" must stick to this list.
const CANONICAL_AESTHETIC_TAGS = [
  "minimal", "streetwear", "romantic", "classic", "edgy", "boho", "oldmoney",
  "coastal", "formal", "workwear", "preppy", "sporty", "cute", "colorful",
  "vintage", "grunge",
];

function buildPrompts() {
  const today = todayString();

  const SYSTEM_PROMPT = `You are a fashion industry researcher creating a weekly trend digest for a fashion app called Nomi.

Today's date is ${today}.

Your task:
1. Use web search to research what fashion editors, critics, and publications are currently discussing — focus on runway themes, emerging designers, color and silhouette trends, and what is getting editorial attention right now.
2. Search reputable fashion sources: Vogue, Harper's Bazaar, The Cut, Business of Fashion, WWD, Refinery29, and runway review sites.
3. Synthesize your findings into up to 5–6 distinct, specific trend items.

RECENCY REQUIREMENT — this is critical:
- Only include trend items grounded in coverage published within the last 7–10 days of today (${today}).
- Before citing any article, check its publication date. If an article was published more than 10 days ago, discard it — do not cite it, even if it is highly relevant or widely known.
- If you cannot find enough genuinely recent coverage to fill 5–6 items, return FEWER items. Do not backfill with older articles to hit a target count. 3 high-quality, verifiably recent items are better than 6 items padded with stale coverage.
- A trend item with no recent source is worse than no trend item at all.

STRICT CONTENT RULES — follow exactly:
- PARAPHRASE everything in your own words. Do not reproduce article sentences or paragraphs verbatim.
- You may reference a publication by name (e.g. "Vogue noted that...") but never reproduce their text.
- Direct quotes must be under 15 words and used sparingly — only when exact wording adds real meaning.
- Never quote the same source twice across all trend items.

SOURCE ATTRIBUTION RULES — follow exactly:
- For each trend item, list the specific article(s) you actually drew information from, published within the last 10 days.
- Each source must include the publication name AND the direct URL of the article you read.
- Use the exact URL from your search results — do not construct or guess URLs.
- If you referenced multiple articles for one trend, include all of them.
- If you cannot identify a specific article URL for a source, use that publication's homepage URL instead (e.g. "https://www.vogue.com").
- Never omit a source entry — if you used a publication, it must appear with whatever URL you have.

EDITORIAL ANALYSIS FIELDS — this digest is not just article links; it's an editorial
intelligence layer that later gets matched against individual users' style profiles.
For each trend item, also produce:
- whyItMatters: ONE sentence explaining the significance of the trend — what it signals
  about where fashion is heading, not a restatement of the summary. This is the
  "so what" a stylist would tell a client, not more description of what was shown.
- themeType: exactly one of "silhouette" | "color" | "fabric" | "styling" | "designer" |
  "seasonal" | "cultural" — pick whichever is the DOMINANT axis of the trend.
- tags: 1–3 values from this exact fixed vocabulary (lowercase, no others allowed):
  ${CANONICAL_AESTHETIC_TAGS.join(", ")}
  Only include a tag if the trend genuinely fits that aesthetic — it's fine to return
  just 1 tag, or occasionally none, rather than forcing a weak match. These tags are
  used to programmatically match trends against users' taste profiles, so precision
  matters more than coverage.
- keywords: 2–5 freeform, specific descriptive terms (silhouette names, colors, fabrics,
  styling ideas) that don't fit the fixed tags vocabulary — e.g. "asymmetrical neckline",
  "earthy palette", "oversized tailoring". These add texture beyond the fixed tags.

OUTPUT FORMAT — return ONLY valid JSON, no markdown fences, no explanation before or after:
{
  "trends": [
    {
      "title": "Short trend name (3–6 words)",
      "summary": "2–3 sentences paraphrasing the trend conversation. Be specific: mention garment types, colors, silhouettes, or designers drawing attention. Reference publications naturally within the text where relevant.",
      "whyItMatters": "One sentence on why this matters / what it signals.",
      "themeType": "silhouette | color | fabric | styling | designer | seasonal | cultural",
      "tags": ["tag-from-fixed-vocabulary"],
      "keywords": ["freeform descriptive term"],
      "sources": [
        { "name": "Publication Name", "url": "https://actual-article-url-from-search-results" }
      ]
    }
  ]
}`;

  const USER_PROMPT = `Today is ${today}. Search for what fashion editors and critics have published in the last 7–10 days — recent runway reviews, emerging designers currently getting buzz, recurring silhouettes and colors this week, and any cultural moments influencing style right now. Check that every article you reference was published within the last 10 days before including it. If recent coverage is thin, return fewer than 6 items. Output only the JSON, nothing else.`;

  return { SYSTEM_PROMPT, USER_PROMPT };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const client = new Anthropic();
  const { SYSTEM_PROMPT, USER_PROMPT } = buildPrompts();

  console.log(`Today: ${todayString()}`);
  console.log("Researching current fashion trends via web search…");
  console.log("(This may take 20–40 seconds while the model searches.)");

  const response = await client.messages.create({
    model:      "claude-sonnet-4-6",
    max_tokens: 4096,
    system:     SYSTEM_PROMPT,
    tools:      [{ type: "web_search_20250305", name: "web_search" }],
    messages:   [{ role: "user", content: USER_PROMPT }],
  });

  // Extract page_age metadata from all search result blocks
  const ageMap = extractSearchResultAges(response.content);
  console.log(`\nSearch result URLs available for age-checking: ${ageMap.size}`);

  // Extract the JSON text output
  const textContent = response.content
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("\n");

  if (!textContent.trim()) {
    console.error("No text in response. Full response:");
    console.error(JSON.stringify(response.content, null, 2));
    process.exit(1);
  }

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
    console.error("Unexpected shape — 'trends' missing or empty:");
    console.error(JSON.stringify(parsed, null, 2));
    process.exit(1);
  }

  // Normalise sources: coerce plain strings → {name, url: null}
  parsed.trends = parsed.trends.map(trend => ({
    ...trend,
    sources: (trend.sources ?? []).map(s =>
      typeof s === "string"
        ? { name: s, url: null }
        : { name: s.name ?? s, url: s.url ?? null }
    ),
  }));

  // ── Recency verification ─────────────────────────────────────────────────

  console.log("\n── Source recency check ──────────────────────────────────────────");
  const staleWarnings = [];

  for (const trend of parsed.trends) {
    console.log(`\n  "${trend.title}"`);
    for (const src of trend.sources) {
      if (!src.url) { console.log(`    ${src.name}: (no URL)`); continue; }

      // 1. Try API metadata first
      const apiData = findAgeForUrl(src.url, ageMap);
      if (apiData) {
        const days = apiData.ageDays;
        const flag = days !== null && days > MAX_ARTICLE_AGE_DAYS ? " ⚠️  STALE" : " ✓";
        console.log(`    ${src.name}: page_age="${apiData.pageAge}" (${days ?? "?"}d)${flag}`);
        if (days !== null && days > MAX_ARTICLE_AGE_DAYS) {
          staleWarnings.push(`"${trend.title}" → ${src.name} (${src.url}) is ${days} days old`);
        }
        continue;
      }

      // 2. API didn't have this URL — fetch and parse HTML date
      process.stdout.write(`    ${src.name}: not in search results, fetching HTML… `);
      const pubDate = await fetchPublishDate(src.url);
      const days    = dateDiffDays(pubDate);
      if (pubDate && days !== null) {
        const flag = days > MAX_ARTICLE_AGE_DAYS ? " ⚠️  STALE" : " ✓";
        console.log(`article:published_time=${pubDate.toISOString().slice(0,10)} (${days}d)${flag}`);
        if (days > MAX_ARTICLE_AGE_DAYS) {
          staleWarnings.push(`"${trend.title}" → ${src.name} (${src.url}) is ${days} days old`);
        }
      } else {
        console.log("could not verify date");
      }
    }
  }

  if (staleWarnings.length > 0) {
    console.log("\n⚠️  STALE SOURCES DETECTED:");
    staleWarnings.forEach(w => console.log("  " + w));
    console.log("\nConsider re-running the script, or remove stale items manually.");
  } else {
    console.log("\n✓ All verifiable sources are within the recency window.");
  }

  // ── Write output ─────────────────────────────────────────────────────────

  const output = {
    generatedAt: new Date().toISOString(),
    trends:      parsed.trends,
  };

  const outPath = resolve(ROOT, "app/data/trends.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n", "utf8");

  console.log(`\n✓ Wrote ${output.trends.length} trends to app/data/trends.json`);
  output.trends.forEach((t, i) => {
    console.log(`\n  ${i + 1}. ${t.title}`);
    t.sources.forEach(s => console.log(`     ${s.name}: ${s.url ?? "(no url)"}`));
  });
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
