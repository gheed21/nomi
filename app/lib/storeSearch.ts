export const STORE_SEARCH: Record<string, (q: string) => string> = {
  // ── Mainstream / fast fashion ──────────────────────────────────────────────
  "asos":              q => `https://www.asos.com/us/search/?q=${q}`,
  "zara":              q => `https://www.zara.com/us/en/search?searchTerm=${q}`,
  "h&m":               q => `https://www2.hm.com/en_us/search-results.html?q=${q}`,
  "mango":             q => `https://shop.mango.com/us/search?query=${q}`,
  "target":            q => `https://www.target.com/s?searchTerm=${q}`,
  "abercrombie":       q => `https://www.abercrombie.com/shop/us/search-results?q=${q}`,
  // ── Mid-range / lifestyle ──────────────────────────────────────────────────
  "urban outfitters":  q => `https://www.urbanoutfitters.com/search?q=${q}`,
  "free people":       q => `https://www.freepeople.com/search/?q=${q}`,
  "anthropologie":     q => `https://www.anthropologie.com/search?q=${q}`,
  "madewell":          q => `https://www.madewell.com/search.html?q=${q}`,
  "everlane":          q => `https://www.everlane.com/search?query=${q}`,
  "uniqlo":            q => `https://www.uniqlo.com/us/en/search?q=${q}`,
  "& other stories":   q => `https://www.stories.com/en_usd/search.html?q=${q}`,
  // ── Workwear / classic ────────────────────────────────────────────────────
  "banana republic":   q => `https://bananarepublic.gap.com/browse/search.do?searchText=${q}`,
  "old navy":          q => `https://oldnavy.gap.com/browse/search.do?searchString=${q}`,
  "ralph lauren":      q => `https://www.ralphlauren.com/search?q=${q}`,
  // ── Premium denim ─────────────────────────────────────────────────────────
  "ag jeans":          q => `https://www.agjeans.com/search?q=${q}`,
  // ── Activewear ────────────────────────────────────────────────────────────
  "athleta":           q => `https://athleta.gap.com/browse/search.do?searchString=${q}`,
  // ── Ultra-premium / luxury (search URLs verified via Node fetch) ──────────
  "toteme":            q => `https://toteme.com/search?q=${q}`,
  "totème":            q => `https://toteme.com/search?q=${q}`,
  "bottega veneta":    q => `https://www.bottegaveneta.com/en-us/search?q=${q}`,
  "bottega":           q => `https://www.bottegaveneta.com/en-us/search?q=${q}`,
  // ── Elevated / designer ───────────────────────────────────────────────────
  "reformation":       q => `https://www.thereformation.com/search?query=${q}`,
  "nordstrom":         q => `https://www.nordstrom.com/sr?origin=keywordsearch&keyword=${q}`,
  "allsaints":         q => `https://www.allsaints.com/us/en/search?q=${q}`,
  "net-a-porter":      q => `https://www.net-a-porter.com/en-us/shop/search?q=${q}`,
  // ── Value / teen ──────────────────────────────────────────────────────────
  "prettylittlething": q => `https://www.prettylittlething.com/search?q=${q}`,
  "forever 21":        q => `https://www.forever21.com/search?q=${q}`,
  // ── Department / multi-brand ─────────────────────────────────────────────
  "dsw":              q => `https://www.dsw.com/search?searchtext=${q}`,
  "amazon":           q => `https://www.amazon.com/s?k=${q}`,
  "ann taylor":        q => `https://www.anntaylor.com/search?q=${q}`,
  // ── Shoes / accessories ───────────────────────────────────────────────────
  "steve madden":      q => `https://www.stevemadden.com/search?q=${q}`,
  // ── Jewelry ───────────────────────────────────────────────────────────────
  "mejuri":            q => `https://mejuri.com/search?q=${q}`,
  // ── Activewear ────────────────────────────────────────────────────────────
  "alo yoga":          q => `https://www.aloyoga.com/search?q=${q}`,
  "gymshark":          q => `https://www.gymshark.com/search?q=${q}`,
  "vuori":             q => `https://www.vuoriclothing.com/search?q=${q}`,
  "nike":              q => `https://www.nike.com/w?q=${q}`,
  // ── Global / lifestyle ────────────────────────────────────────────────────
  "farm rio":          q => `https://www.farmrio.com/search?q=${q}`,
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
  "athleta":           "Athleta",
  "toteme":            "Totème",
  "totème":            "Totème",
  "bottega veneta":    "Bottega Veneta",
  "bottega":           "Bottega Veneta",
  "reformation":       "Reformation",
  "nordstrom":         "Nordstrom",
  "allsaints":         "AllSaints",
  "net-a-porter":      "Net-A-Porter",
  "prettylittlething": "PrettyLittleThing",
  "forever 21":        "Forever 21",
  "dsw":              "DSW",
  "amazon":           "Amazon",
  "ann taylor":        "Ann Taylor",
  "steve madden":      "Steve Madden",
  "mejuri":            "Mejuri",
  "alo yoga":          "Alo Yoga",
  "gymshark":          "Gymshark",
  "vuori":             "Vuori",
  "nike":              "Nike",
  "farm rio":          "Farm Rio",
  "depop":             "Depop",
  "vinted":            "Vinted",
  "poshmark":          "Poshmark",
};

// Stores commonly mentioned by Nomi that don't have a direct search URL.
// Matched case-insensitively; chips link to a plain Google web search instead.
const FALLBACK_STORES: { key: string; displayName: string }[] = [
  // ── Luxury / designer ─────────────────────────────────────────────────────
  // toteme / bottega veneta — moved to STORE_SEARCH (search URLs verified)
  // lululemon / loro piana — ERR_HTTP2_PROTOCOL_ERROR on all subdomains, fallback to Google
  { key: "lululemon",    displayName: "Lululemon"   },
  { key: "loro piana",   displayName: "Loro Piana"  },
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
  { key: "reiss",          displayName: "Reiss"           },
  { key: "massimo dutti", displayName: "Massimo Dutti"  },
  { key: "arket",         displayName: "Arket"           },
  // ── Mid-market gaps ───────────────────────────────────────────────────────
  { key: "j.crew",         displayName: "J.Crew"          },
  { key: "american eagle", displayName: "American Eagle"  },
  { key: "revolve",        displayName: "Revolve"         },
  { key: "princess polly", displayName: "Princess Polly" },
  { key: "hollister",      displayName: "Hollister"       },
  { key: "express",        displayName: "Express"         },
  { key: "shein",          displayName: "Shein"           },
  // "cos" omitted — 3 chars, matches inside "costs", "because", etc.
  { key: "aritzia",        displayName: "Aritzia"         },
  { key: "spanx",          displayName: "Spanx"           },
  // ── Activewear ────────────────────────────────────────────────────────────
  { key: "outdoor voices", displayName: "Outdoor Voices"  },
  { key: "adidas",         displayName: "Adidas"          },
  { key: "sweaty betty",   displayName: "Sweaty Betty"    },
  // ── Shoes / accessories ───────────────────────────────────────────────────
  { key: "new balance",    displayName: "New Balance"     },
  { key: "sam edelman",    displayName: "Sam Edelman"     },
  { key: "birkenstock",    displayName: "Birkenstock"     },
  { key: "converse",       displayName: "Converse"        },
  { key: "sperry",         displayName: "Sperry"          },
  { key: "vans",           displayName: "Vans"            },
  // ── Jewelry ───────────────────────────────────────────────────────────────
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
  "up","out","on","for","from","of","about","with","to",
  // gerunds that appear before "at/from [store]" but aren't products
  "shopping","browsing","wearing","looking","buying","finding",
  // generic adjectives that aren't distinctive product descriptors
  "great","perfect","good","nice","cute","cool","amazing","classic","simple",
  "basic","easy","versatile","staple","solid","clean","fresh","new","other","some",
  // articles / determiners / possessives / stand-alone pronouns
  "the","a","an","this","that","these","those","one","own","very",
  // intensifiers & fillers
  "really","very","so","quite","super","truly","also","even","just","any","either","neither",
  "especially","particularly","specifically","mainly","mostly","definitely",
]);

// Words that mark where a post-store item phrase ends.
const STOP_AFTER = new Set([
  "is","are","was","were","will","would","can","could","and","or","but",
  "for","in","on","by","a","an","the","from","to","of","with","about","around",
  "has","have","do","does","did","run","runs","go","goes","sit","sits","which","that","fit","fits","holds",
  "comes","works","looks","shows","appears","tends","skews","leans","means",
  "hits","takes","makes","gets","keeps","sets","puts","feels","reads","pulls",
  "wins","beats","excels","usually","typically","often","currently","actually","tend","seem","almost","always",
  "so","if","they","their","price","moment","angle","vibe","aesthetic","approach",
  "right","now","without","try","skip","check","find","look","—","–",
]);

// Intro verbs that connect a store to an item ("Zara has/sells/carries [item]").
// Skipped before the STOP_AFTER scan so the item can still be extracted.
const SKIP_INTRO_VERBS = new Set([
  "has","have","carries","carry","sells","sell","offers","offer","stocks","stock",
]);

function stripFillerLeft(phrase: string): string {
  const words = phrase.trim().split(/\s+/);
  let i = 0;
  // Split on first non-alpha char so contractions like "I'd" → "i" hit the filler set
  while (i < words.length && FILLER_LEFT.has(words[i].toLowerCase().split(/[^a-z]/)[0])) i++;
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
    "fits","outfits","outfit","something","com","inventory","selection","stock","ones","range",
    "them","these","those","it","one","some","any",
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

      // Bracketed search term — highest priority. Nomi is instructed to always
      // append [search term] after store mentions, e.g. "sandals at ASOS [black strappy sandals]".
      // Check after the store first, then before (handles both word orders).
      const bracketAfter  = after.match(/^\s*\[([^\]]{3,40})\]/);
      const bracketBefore = before.match(/\[([^\]]{3,40})\]\s+(?:at|from|by)\s*$/i);
      if (bracketAfter)  item = bracketAfter[1].trim();
      else if (bracketBefore) item = bracketBefore[1].trim();

      // "[anything] from/at/by [store]" — capture everything before the preposition,
      // then strip leading filler left-to-right to isolate the actual noun phrase.
      const preMatch = before.match(
        /(?:^|[\s,])([A-Za-z][A-Za-z0-9''\- ]{2,50}?)\s+(?:from|at|by)\s*$/i
      );
      if (!item && preMatch) {
        // Take the last 6 words of the capture, then split on internal conjunctions/
        // prepositions so "Zara and some straight-leg jeans from H&M" → "straight-leg jeans".
        const captureWords = preMatch[1].trim().split(/\s+/);
        const last6        = captureWords.slice(-6).join(" ");
        const lastClause   = last6.split(/\s+(?:and|or|but|from|at|by)\s+/i).pop() ?? last6;
        item = stripStopRight(stripFillerLeft(lastClause));
      }

      // "[store]'s [item]" or "[store] [item word(s)]"
      // Word-based: take next words, stop at STOP_AFTER words or punctuation.
      // Skip a leading intro verb ("Zara has/sells/carries [item]") before scanning.
      if (!item) {
        const raw   = after.replace(/^'s\s*/, "").trimStart().split(/[,!?]/)[0]; // clip at comma/punctuation
        const words = raw.split(/\s+/).slice(0, 8);
        // Skip intro verb ("has", "sells" …) then any leading articles ("a", "an", "the")
        // so "has a great linen shirt" → scan starts at "great linen shirt"
        let offset = (words.length > 0 && (SKIP_INTRO_VERBS.has(words[0].toLowerCase()) || words[0].toLowerCase() === "for")) ? 1 : 0;
        while (offset < words.length && /^(a|an|the|their)$/i.test(words[offset])) offset++;
        const scan    = words.slice(offset);
        const stopIdx = scan.findIndex(w => STOP_AFTER.has(w.toLowerCase().replace(/[^a-z—–]/g, "")));
        const taken   = stopIdx === 0 ? [] : stopIdx > 0 ? scan.slice(0, stopIdx) : scan.slice(0, 4);
        if (taken.length > 0) item = stripStopRight(stripFillerLeft(taken.join(" ")));
      }

      // Cap at 5 words, clean up punctuation, then validate
      if (item) item = item.split(/\s+/).slice(0, 5).join(" ");
      // Remove double-quote chars from anywhere — Nomi wraps item names in "quotes" and
      // the extraction window often captures only one half of the pair.
      if (item) item = item.replace(/["""]/g, "").trim();
      // Strip other stray punctuation from both ends only (preserve interior apostrophes)
      if (item) item = item.replace(/^['''.,;:!?\-–—]+|['''.,;:!?\-–—]+$/g, "").trim();
      if (!isPlausibleItem(item)) item = "";

      if (!item) continue; // no item = no useful search URL, skip the chip

      const displayName = STORE_DISPLAY[key] ?? key;
      const dedupKey = `${displayName}:${item.toLowerCase()}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      const q = encodeURIComponent(item);
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

      const bracketAfter2  = after.match(/^\s*\[([^\]]{3,40})\]/);
      const bracketBefore2 = before.match(/\[([^\]]{3,40})\]\s+(?:at|from|by)\s*$/i);
      if (bracketAfter2)  item = bracketAfter2[1].trim();
      else if (bracketBefore2) item = bracketBefore2[1].trim();

      const preMatch = before.match(
        /(?:^|[\s,])([A-Za-z][A-Za-z0-9''\- ]{2,50}?)\s+(?:from|at|by)\s*$/i
      );
      if (!item && preMatch) {
        const lastClause = preMatch[1].trim().split(/,\s*|\s+or\s+/i).pop() ?? "";
        item = stripStopRight(stripFillerLeft(lastClause));
      }

      if (!item) {
        const raw   = after.replace(/^'s\s*/, "").trimStart().split(/[,!?]/)[0]; // clip at comma/punctuation
        const words = raw.split(/\s+/).slice(0, 8);
        let offset  = (words.length > 0 && (SKIP_INTRO_VERBS.has(words[0].toLowerCase()) || words[0].toLowerCase() === "for")) ? 1 : 0;
        while (offset < words.length && /^(a|an|the|their)$/i.test(words[offset])) offset++;
        const scan    = words.slice(offset);
        const stopIdx = scan.findIndex(w => STOP_AFTER.has(w.toLowerCase().replace(/[^a-z—–]/g, "")));
        const taken   = stopIdx === 0 ? [] : stopIdx > 0 ? scan.slice(0, stopIdx) : scan.slice(0, 4);
        if (taken.length > 0) item = stripStopRight(stripFillerLeft(taken.join(" ")));
      }

      if (item) item = item.split(/\s+/).slice(0, 5).join(" ");
      if (item) item = item.replace(/["""]/g, "").trim();
      if (item) item = item.replace(/^['''.,;:!?\-–—]+|['''.,;:!?\-–—]+$/g, "").trim();
      if (!isPlausibleItem(item)) item = "";

      if (!item) continue; // no item = no useful search URL, skip the chip

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
