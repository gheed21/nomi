export const STORE_SEARCH: Record<string, (q: string) => string> = {
  // ── Mainstream / fast fashion ──────────────────────────────────────────────
  "asos":              q => `https://www.asos.com/search/?q=${q}`,
  "zara":              q => `https://www.zara.com/us/en/search?searchTerm=${q}`,
  "h&m":               q => `https://www2.hm.com/en_us/search-results.html?q=${q}`,
  "mango":             q => `https://shop.mango.com/us/search?query=${q}`,
  "target":            q => `https://www.target.com/s?searchTerm=${q}`,
  "abercrombie":       q => `https://www.abercrombie.com/shop/us/search-results?q=${q}`,
  // ── Mid-range / lifestyle ──────────────────────────────────────────────────
  "urban outfitters":  q => `https://www.urbanoutfitters.com/search?q=${q}`,
  "free people":       q => `https://www.freepeople.com/search/?q=${q}`,
  "anthropologie":     q => `https://www.anthropologie.com/search?q=${q}`,
  "madewell":          q => `https://www.madewell.com/search.html#q=${q}`,
  "everlane":          q => `https://www.everlane.com/search?query=${q}`,
  "uniqlo":            q => `https://www.uniqlo.com/us/en/search?q=${q}`,
  "& other stories":   q => `https://www.stories.com/en_usd/search.html?q=${q}`,
  // ── Workwear / classic ────────────────────────────────────────────────────
  "banana republic":   q => `https://bananarepublic.gap.com/browse/search.do?searchString=${q}`,
  "old navy":          q => `https://oldnavy.gap.com/browse/search.do?searchString=${q}`,
  "ralph lauren":      q => `https://www.ralphlauren.com/search?q=${q}`,
  // ── Premium denim ─────────────────────────────────────────────────────────
  "ag jeans":          q => `https://www.agjeans.com/search?q=${q}`,
  // ── Activewear ────────────────────────────────────────────────────────────
  "lululemon":         q => `https://shop.lululemon.com/search?q=${q}`,
  "athleta":           q => `https://athleta.gap.com/browse/search.do?searchString=${q}`,
  // ── Ultra-premium / luxury (search URLs verified via Node fetch) ──────────
  "toteme":            q => `https://toteme.com/search?q=${q}`,
  "totème":            q => `https://toteme.com/search?q=${q}`,
  "loro piana":        q => `https://us.loropiana.com/en/search?q=${q}`,
  "bottega veneta":    q => `https://www.bottegaveneta.com/en-us/search?q=${q}`,
  "bottega":           q => `https://www.bottegaveneta.com/en-us/search?q=${q}`,
  // ── Elevated / designer ───────────────────────────────────────────────────
  "revolve":           q => `https://www.revolve.com/r/Search.jsp?q=${q}`,
  "reformation":       q => `https://www.thereformation.com/search?query=${q}`,
  "nordstrom":         q => `https://www.nordstrom.com/sr?origin=keywordsearch&keyword=${q}`,
  "allsaints":         q => `https://www.allsaints.com/us/en/search?q=${q}`,
  "net-a-porter":      q => `https://www.net-a-porter.com/en-us/shop/search?q=${q}`,
  // ── Value / teen ──────────────────────────────────────────────────────────
  "prettylittlething": q => `https://us.prettylittlething.com/search?q=${q}`,
  "princess polly":    q => `https://www.princesspolly.com/pages/search-results-page?q=${q}`,
  // ── Secondhand ────────────────────────────────────────────────────────────
  "depop":             q => `https://www.depop.com/search/?q=${q}`,
  "vinted":            q => `https://www.vinted.com/catalog?search_text=${q}`,
  "poshmark":          q => `https://poshmark.com/search?query=${q}`,
};

const STORE_DISPLAY: Record<string, string> = {
  "asos":              "ASOS",
  "zara":              "Zara",
  "h&m":               "H&M",
  "mango":             "Mango",
  "target":            "Target",
  "abercrombie":       "Abercrombie",
  "urban outfitters":  "Urban Outfitters",
  "free people":       "Free People",
  "anthropologie":     "Anthropologie",
  "madewell":          "Madewell",
  "everlane":          "Everlane",
  "uniqlo":            "Uniqlo",
  "& other stories":   "& Other Stories",
  "banana republic":   "Banana Republic",
  "old navy":          "Old Navy",
  "ralph lauren":      "Ralph Lauren",
  "ag jeans":          "AG Jeans",
  "lululemon":         "Lululemon",
  "athleta":           "Athleta",
  "toteme":            "Totème",
  "totème":            "Totème",
  "loro piana":        "Loro Piana",
  "bottega veneta":    "Bottega Veneta",
  "bottega":           "Bottega Veneta",
  "revolve":           "Revolve",
  "reformation":       "Reformation",
  "nordstrom":         "Nordstrom",
  "allsaints":         "AllSaints",
  "net-a-porter":      "Net-A-Porter",
  "prettylittlething": "PrettyLittleThing",
  "princess polly":    "Princess Polly",
  "depop":             "Depop",
  "vinted":            "Vinted",
  "poshmark":          "Poshmark",
};

// Stores commonly mentioned by Nomi that don't have a direct search URL.
// Matched case-insensitively; chips link to a plain Google web search instead.
const FALLBACK_STORES: { key: string; displayName: string }[] = [
  // ── Luxury / designer ─────────────────────────────────────────────────────
  // toteme / loro piana / bottega veneta — moved to STORE_SEARCH (search URLs verified)
  { key: "max mara",       displayName: "Max Mara"        },
  { key: "polene",         displayName: "Polène"          },
  { key: "polène",         displayName: "Polène"          },
  // "the row" omitted — too generic a phrase, causes false matches in price comparisons
  { key: "celine",         displayName: "Celine"          },
  { key: "céline",         displayName: "Celine"          },
  { key: "prada",          displayName: "Prada"           },
  { key: "gucci",          displayName: "Gucci"           },
  { key: "saint laurent",  displayName: "Saint Laurent"   },
  { key: "hermes",         displayName: "Hermès"          },
  { key: "hermès",         displayName: "Hermès"          },
  { key: "chanel",         displayName: "Chanel"          },
  { key: "louis vuitton",  displayName: "Louis Vuitton"   },
  { key: "loewe",          displayName: "Loewe"           },
  { key: "jacquemus",      displayName: "Jacquemus"       },
  { key: "a.p.c",          displayName: "A.P.C."          },
  { key: "isabel marant",  displayName: "Isabel Marant"   },
  { key: "ganni",          displayName: "Ganni"           },
  { key: "zimmermann",     displayName: "Zimmermann"      },
  { key: "staud",          displayName: "Staud"           },
  { key: "ulla johnson",   displayName: "Ulla Johnson"    },
  { key: "sandro",         displayName: "Sandro"          },
  { key: "maje",           displayName: "Maje"            },
  { key: "ba&sh",          displayName: "Ba&sh"           },
  { key: "rouje",          displayName: "Rouje"           },
  { key: "sezane",         displayName: "Sézane"          },
  { key: "sézane",         displayName: "Sézane"          },
  { key: "ami paris",      displayName: "Ami Paris"       },
  { key: "farm rio",       displayName: "Farm Rio"        },
  { key: "reiss",          displayName: "Reiss"           },
  { key: "massimo dutti", displayName: "Massimo Dutti"  },
  { key: "arket",         displayName: "Arket"           },
  // ── Mid-market gaps ───────────────────────────────────────────────────────
  { key: "j.crew",         displayName: "J.Crew"          },
  { key: "american eagle", displayName: "American Eagle"  },
  { key: "forever 21",     displayName: "Forever 21"      },
  { key: "hollister",      displayName: "Hollister"       },
  { key: "express",        displayName: "Express"         },
  { key: "ann taylor",     displayName: "Ann Taylor"      },
  { key: "shein",          displayName: "Shein"           },
  // "cos" omitted — 3 chars, matches inside "costs", "because", etc.
  { key: "aritzia",        displayName: "Aritzia"         },
  { key: "spanx",          displayName: "Spanx"           },
  // ── Activewear ────────────────────────────────────────────────────────────
  { key: "alo yoga",       displayName: "Alo Yoga"        },
  { key: "vuori",          displayName: "Vuori"           },
  { key: "outdoor voices", displayName: "Outdoor Voices"  },
  { key: "gymshark",       displayName: "Gymshark"        },
  { key: "nike",           displayName: "Nike"            },
  { key: "adidas",         displayName: "Adidas"          },
  { key: "sweaty betty",   displayName: "Sweaty Betty"    },
  // ── Shoes / accessories ───────────────────────────────────────────────────
  { key: "new balance",    displayName: "New Balance"     },
  { key: "sam edelman",    displayName: "Sam Edelman"     },
  { key: "steve madden",   displayName: "Steve Madden"    },
  { key: "birkenstock",    displayName: "Birkenstock"     },
  { key: "converse",       displayName: "Converse"        },
  { key: "sperry",         displayName: "Sperry"          },
  { key: "vans",           displayName: "Vans"            },
  // ── Jewelry ───────────────────────────────────────────────────────────────
  { key: "mejuri",         displayName: "Mejuri"          },
  { key: "gorjana",        displayName: "Gorjana"         },
  // ── Denim ─────────────────────────────────────────────────────────────────
  { key: "levis",          displayName: "Levi's"          },
  { key: "levi's",         displayName: "Levi's"          },
];

// Build a plain Google web-search URL — used for fallback chips where no
// direct store search URL is known. Plain search (not Google Shopping) tends
// to surface the brand's own site faster for single-brand queries.
function buildWebSearchUrl(item: string, displayName: string): string {
  const q = encodeURIComponent(item ? `${item} ${displayName}` : displayName);
  return `https://www.google.com/search?q=${q}`;
}

export type StoreLink = { displayName: string; item: string; url: string; fallback?: boolean; image?: string | null; productLink?: string | null; };

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Words that commonly appear BEFORE the actual item noun in Nomi responses
// ("you can grab a great [item] at Zara") and must be stripped from the left.
const FILLER_LEFT = new Set([
  // subjects / pronouns
  "you","i","we","they","she","he","it","your","my","their","our","its",
  // modals & auxiliaries
  "can","could","should","would","will","might","may","must","have","has","had",
  // intro verbs (base + common inflected forms)
  "grab","get","try","find","pick","add","wear","pair","paired","go","look","opt","check",
  "love","like","want","need","use","see","think","consider","suggest","recommend",
  "worn","styled","layered","matched","finish","complete","round","top",
  // particles & prepositions that prefix item phrases
  "up","out","on","for","of","about","with","to",
  // gerunds that appear before "at/from [store]" but aren't products
  "shopping","browsing","wearing","looking","buying","finding",
  // generic adjectives that aren't distinctive product descriptors
  "great","perfect","good","nice","cute","cool","amazing","classic","simple",
  "basic","easy","versatile","staple","solid","clean","fresh","new","other","some",
  // articles / determiners / possessives / stand-alone pronouns
  "the","a","an","this","that","these","those","one","own","very",
  // intensifiers & fillers
  "really","very","so","quite","super","truly","also","even","just","any","either","neither",
]);

// Words that mark where a post-store item phrase ends.
const STOP_AFTER = new Set([
  "is","are","was","were","will","would","can","could","and","or","but",
  "for","in","on","by","a","an","the","from","to","of","with","about","around",
  "has","have","do","does","did","run","runs","go","goes","sit","sits","which","that","fit","fits","holds",
  "comes","works","looks","shows","appears","tends","skews","leans","means",
  "hits","takes","makes","gets","keeps","sets","puts","feels","reads","pulls",
  "wins","beats","excels","usually","typically","often","currently","actually",
  "so","if","they","their","price","moment","angle","vibe","aesthetic","approach",
  "right","now","—","–",
]);

// Intro verbs that connect a store to an item ("Zara has/sells/carries [item]").
// Skipped before the STOP_AFTER scan so the item can still be extracted.
const SKIP_INTRO_VERBS = new Set([
  "has","have","carries","carry","sells","sell","offers","offer","stocks","stock",
]);

function stripFillerLeft(phrase: string): string {
  const words = phrase.trim().split(/\s+/);
  let i = 0;
  while (i < words.length && FILLER_LEFT.has(words[i].toLowerCase().replace(/[^a-z]/g, ""))) i++;
  return words.slice(i).join(" ");
}

// Strip trailing verbs / stop-words from the right of a preMatch capture.
// Handles "cargo pants run at Zara" → captures "cargo pants run" → strips "run" → "cargo pants".
function stripStopRight(phrase: string): string {
  const words = phrase.trim().split(/\s+/);
  let i = words.length - 1;
  while (i >= 0 && STOP_AFTER.has(words[i].toLowerCase().replace(/[^a-z—–]/g, ""))) i--;
  return words.slice(0, i + 1).join(" ");
}

function isPlausibleItem(s: string): boolean {
  if (!s || s.length < 3) return false;
  const words = s.split(/\s+/);
  const first = words[0].toLowerCase().replace(/[^a-z]/g, "");
  // Reject if the first word is still a filler
  if (FILLER_LEFT.has(first)) return false;
  // Reject if ANY word is a catch-all noun (handles "current inventory", "outfit looks like")
  const TOO_GENERIC = new Set([
    "clothes","clothing","stuff","items","things","pieces","options","looks","styles",
    "fits","outfits","outfit","something","com","inventory","selection","stock","ones",
  ]);
  if (words.some(w => TOO_GENERIC.has(w.toLowerCase().replace(/[^a-z]/g, "")))) return false;
  return /^[A-Za-z]/.test(s);
}

export function extractStoreLinks(text: string): StoreLink[] {
  const results: StoreLink[] = [];
  const seen = new Set<string>();

  for (const [key, builder] of Object.entries(STORE_SEARCH)) {
    const storePat = new RegExp(escapeRegex(key), "gi");
    let m: RegExpExecArray | null;

    while ((m = storePat.exec(text)) !== null) {
      const start  = m.index;
      const end    = start + m[0].length;
      const before = text.slice(Math.max(0, start - 100), start);
      const after  = text.slice(end, Math.min(text.length, end + 100));

      let item = "";

      // "[anything] from/at/by [store]" — capture everything before the preposition,
      // then strip leading filler left-to-right to isolate the actual noun phrase.
      const preMatch = before.match(
        /(?:^|[\s,])([A-Za-z][A-Za-z0-9''\- ]{2,50}?)\s+(?:from|at|by)\s*$/i
      );
      if (preMatch) {
        // Split on commas and take the last clause — handles "if you want activewear,
        // the Align leggings from Lululemon" capturing "activewear, the Align leggings"
        const lastClause = preMatch[1].trim().split(/,\s*|\s+or\s+/i).pop() ?? "";
        item = stripStopRight(stripFillerLeft(lastClause));
      }

      // "[store]'s [item]" or "[store] [item word(s)]"
      // Word-based: take next words, stop at STOP_AFTER words or punctuation.
      // Skip a leading intro verb ("Zara has/sells/carries [item]") before scanning.
      if (!item) {
        const raw   = after.replace(/^'s\s*/, "").trimStart();
        const words = raw.split(/\s+/).slice(0, 8);
        // Skip intro verb ("has", "sells" …) then any leading articles ("a", "an", "the")
        // so "has a great linen shirt" → scan starts at "great linen shirt"
        let offset = words.length > 0 && SKIP_INTRO_VERBS.has(words[0].toLowerCase()) ? 1 : 0;
        while (offset < words.length && /^(a|an|the|their)$/i.test(words[offset])) offset++;
        const scan    = words.slice(offset);
        const stopIdx = scan.findIndex(w => STOP_AFTER.has(w.toLowerCase().replace(/[^a-z—–]/g, "")));
        const taken   = stopIdx === 0 ? [] : stopIdx > 0 ? scan.slice(0, stopIdx) : scan.slice(0, 4);
        if (taken.length > 0) item = stripFillerLeft(taken.join(" "));
      }

      // Cap at 5 words, clean up punctuation, then validate
      if (item) item = item.split(/\s+/).slice(0, 5).join(" ");
      // Remove double-quote chars from anywhere — Nomi wraps item names in "quotes" and
      // the extraction window often captures only one half of the pair.
      if (item) item = item.replace(/["""]/g, "").trim();
      // Strip other stray punctuation from both ends only (preserve interior apostrophes)
      if (item) item = item.replace(/^['''.,;:!?\-–—]+|['''.,;:!?\-–—]+$/g, "").trim();
      if (!isPlausibleItem(item)) item = "";

      const displayName = STORE_DISPLAY[key] ?? key;
      const dedupKey = `${displayName}:${item.toLowerCase()}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      const q = encodeURIComponent(item || key);
      results.push({ displayName, item, url: builder(q) });
    }
  }

  // ── Fallback scan: stores not in STORE_SEARCH ──────────────────────────────
  for (const { key, displayName } of FALLBACK_STORES) {
    const storePat = new RegExp(escapeRegex(key), "gi");
    let m: RegExpExecArray | null;

    while ((m = storePat.exec(text)) !== null) {
      const start  = m.index;
      const end    = start + m[0].length;
      const before = text.slice(Math.max(0, start - 100), start);
      const after  = text.slice(end, Math.min(text.length, end + 100));

      let item = "";

      const preMatch = before.match(
        /(?:^|[\s,])([A-Za-z][A-Za-z0-9''\- ]{2,50}?)\s+(?:from|at|by)\s*$/i
      );
      if (preMatch) {
        const lastClause = preMatch[1].trim().split(/,\s*|\s+or\s+/i).pop() ?? "";
        item = stripStopRight(stripFillerLeft(lastClause));
      }

      if (!item) {
        const raw   = after.replace(/^'s\s*/, "").trimStart();
        const words = raw.split(/\s+/).slice(0, 8);
        let offset  = words.length > 0 && SKIP_INTRO_VERBS.has(words[0].toLowerCase()) ? 1 : 0;
        while (offset < words.length && /^(a|an|the|their)$/i.test(words[offset])) offset++;
        const scan    = words.slice(offset);
        const stopIdx = scan.findIndex(w => STOP_AFTER.has(w.toLowerCase().replace(/[^a-z—–]/g, "")));
        const taken   = stopIdx === 0 ? [] : stopIdx > 0 ? scan.slice(0, stopIdx) : scan.slice(0, 4);
        if (taken.length > 0) item = stripFillerLeft(taken.join(" "));
      }

      if (item) item = item.split(/\s+/).slice(0, 5).join(" ");
      if (item) item = item.replace(/["""]/g, "").trim();
      if (item) item = item.replace(/^['''.,;:!?\-–—]+|['''.,;:!?\-–—]+$/g, "").trim();
      if (!isPlausibleItem(item)) item = "";

      const dedupKey = `${displayName}:${item.toLowerCase()}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      results.push({
        displayName,
        item,
        url: buildWebSearchUrl(item, displayName),
        fallback: true,
      });
    }
  }

  // If a store has any item-specific chip, drop its no-item fallback chip.
  const storesWithItems = new Set(results.filter(r => r.item).map(r => r.displayName));
  return results.filter(r => r.item || !storesWithItems.has(r.displayName));
}
