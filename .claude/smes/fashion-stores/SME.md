# Nomi Fashion Store SME
# Subject Matter Expert: Store Knowledge & Recommendation Rules
# Place this file at: .claude/smes/fashion-stores/SME.md

## Purpose
This SME gives Nomi accurate, opinionated store knowledge so every recommendation is shoppable, specific, and appropriate to the user's taste and budget. Read this before generating any store recommendation in chat or matching.

---

## Hard Rules
- NEVER recommend DSW — links consistently fail
- NEVER recommend Mejuri — links consistently fail  
- NEVER use the same store twice in one response
- NEVER say a specific item "is in stock" — inventory rotates constantly
- ALWAYS include color + style descriptor in item names (e.g. "black satin slip midi dress" not "slip dress")
- ALWAYS phrase as "[item] at [store]" or "[store] has [item]" — never indirect phrasing like "store tends to carry it"
- ALWAYS spread recommendations across different stores — cross-store variety is Nomi's core value

---

## Store Tiers

### Budget (under $50 avg item)
- Forever 21
- H&M
- Macy's (for basics)
- Brandy Melville
- Hollister
- Urban Outfitters (sale section)
- Uniqlo (basics, knitwear)
- Quince
- ASOS
- Princess Polly
- Meshki

### Mid-Market ($50–$200 avg item)
- Zara
- Mango
- Banana Republic
- J.Crew
- Abercrombie
- Anthropologie
- Free People
- Aritzia
- COS
- Reformation
- Everlane
- Sézane
- Massimo Dutti
- & Other Stories
- Lacoste
- Urban Outfitters

### Contemporary Designer ($200–$800 avg item)
- Ganni
- Jacquemus
- Acne Studios
- Sandy Liang
- Self-Portrait
- Nanushka
- Coperni
- Diesel
- Represent
- Theory
- Vince
- Toteme
- A.P.C.
- Madhappy
- Sporty & Rich

### Luxury ($800+ avg item)
- Prada
- Dior
- Chanel
- Louis Vuitton
- Gucci
- Bottega Veneta
- Celine
- Loewe
- Miu Miu
- Fendi
- Balenciaga
- Valentino
- Hermès
- Burberry
- Dolce & Gabbana
- Saint Laurent
- Moncler
- Brunello Cucinelli
- Loro Piana
- Max Mara
- The Row
- Khaite
- Toteme
- Ralph Lauren (Purple Label)
- Ferragamo
- Jimmy Choo

---

## Category Expertise

### Tops & Dresses
Best: Zara, Mango, Aritzia, Reformation, Free People, Anthropologie, ASOS, Sézane, Ganni, Self-Portrait, Jacquemus

### Bottoms (Jeans, Trousers, Skirts)
Best: Zara, Mango, Abercrombie, Reformation, Aritzia, Acne Studios, Diesel, COS, Massimo Dutti, A.P.C., Toteme

### Knitwear & Sweaters
Best: Uniqlo, COS, Sézane, Massimo Dutti, Toteme, A.P.C., Everlane, Banana Republic, & Other Stories

### Coats & Outerwear
Best: Zara, Mango, COS, Sézane, Aritzia, Nanushka, Toteme, Max Mara, Moncler, Burberry

### Activewear
Best: Lululemon, Alo Yoga, Vuori, Set Active, Gymshark, Nike, Adidas, On, New Balance, Varley

### Streetwear
Best: Supreme, Stüssy, Kith, Carhartt WIP, Madhappy, Sporty & Rich, Aimé Leon Dore, Fear of God Essentials, Represent, Palace

### Shoes — Casual & Sneakers
Best: Nike, Adidas, New Balance, On, Veja, Golden Goose, Converse, Vans, Birkenstock, ASICS

### Shoes — Heels & Mules
Best: Steve Madden, Sam Edelman, Tony Bianco, Aeyde, Dear Frances, Jimmy Choo, Manolo Blahnik, Christian Louboutin, Zara, Mango

### Shoes — Boots
Best: Steve Madden, Dr. Martens, UGG, Sam Edelman, Tony Bianco, Aeyde, Dear Frances, Zara

### Bags — Everyday
Best: Zara, Mango, Coach, Longchamp, Marc Jacobs, Staud, JW Pei, Polène, Strathberry, DeMellier

### Bags — Luxury
Best: Louis Vuitton, Chanel, Dior, Bottega Veneta, Celine, Loewe, Prada, Gucci, Fendi, Hermès, Coach (outlet), Telfar

### Jewelry — Everyday
Best: Missoma, Monica Vinader, Jenny Bird, Pandora, Heaven Mayhem, Vivienne Westwood, Zara, Mango

### Jewelry — Fine & Luxury
Best: Tiffany & Co., Cartier, Van Cleef & Arpels

### Sunglasses
Best: Ray-Ban, Gentle Monster, Le Specs, Quay, Celine, Saint Laurent, Prada, Miu Miu

### Watches
Budget: Casio, Seiko, Citizen
Mid: Tissot, Longines, TAG Heuer
Luxury: Cartier, Rolex, Omega, Audemars Piguet

---

## Multi-Brand Retailers
Use these when recommending a category where the user needs variety or when a specific brand isn't known:
- Nordstrom — wide range, all tiers, great for shoes and bags
- Revolve — contemporary and contemporary designer, great for dresses and going-out looks
- Shopbop — contemporary designer, great for elevated everyday
- SSENSE — contemporary designer and luxury, great for streetwear crossover
- Net-a-Porter — luxury and contemporary designer, women's focus
- Farfetch — luxury, global inventory
- Bloomingdale's — mid-market to luxury
- Saks Fifth Avenue — luxury
- Neiman Marcus — luxury

---

## Secondhand / Resale
Recommend these when: user mentions budget, sustainability, or finding specific sold-out luxury pieces
- The RealReal — authenticated luxury resale
- Vestiaire Collective — authenticated luxury resale, European brands strong
- Depop — vintage, Y2K, indie brands
- Poshmark — broad, good for mid-market
- Grailed — streetwear and menswear resale
- ThredUp — budget secondhand, everyday brands

---

## Verified Search URL Formats
Use these exact formats when building chip links. {query} = URL-encoded search term.

- ASOS: https://www.asos.com/us/search/?q={query}
- Zara: https://www.zara.com/us/en/search?searchTerm={query}
- H&M: https://www2.hm.com/en_us/search-results.html?q={query}
- Mango: https://shop.mango.com/us/search?query={query}
- Anthropologie: https://www.anthropologie.com/search?q={query}
- Free People: https://www.freepeople.com/search/?q={query}
- Urban Outfitters: https://www.urbanoutfitters.com/search?q={query}
- Abercrombie: https://www.abercrombie.com/shop/us/search?q={query}
- Banana Republic: https://bananarepublic.gap.com/browse/search.do?searchText={query}
- Uniqlo: https://www.uniqlo.com/us/en/search?q={query}
- COS: https://www.cosstores.com/en_usd/search.html?q={query}
- Reformation: https://www.thereformation.com/search?q={query}
- Everlane: https://www.everlane.com/search?query={query}
- Aritzia: https://www.aritzia.com/us/en/search?q={query}
- Nordstrom: https://www.nordstrom.com/sr?origin=keywordsearch&keyword={query}
- Revolve: https://www.revolve.com/r/Search.jsp?q={query}
- Shopbop: https://www.shopbop.com/search/ref=sr_kw?search={query}
- Steve Madden: https://www.stevemadden.com/search?q={query}
- Sam Edelman: https://www.samedelman.com/search?q={query}
- Coach: https://www.coach.com/search?q={query}
- Lululemon: https://shop.lululemon.com/search?Ntt={query}
- Nike: https://www.nike.com/w?q={query}
- Adidas: https://www.adidas.com/us/search?q={query}
- New Balance: https://www.newbalance.com/search?q={query}
- Converse: https://www.converse.com/search?q={query}
- Dr. Martens: https://www.drmartens.com/us/en_us/search?q={query}
- Vans: https://www.vans.com/en-us/search?q={query}
- Lacoste: https://www.lacoste.com/us/search/?Ntt={query}
- Princess Polly: https://us.princesspolly.com/search?q={query}
- Meshki: https://us.meshki.com.au/search?q={query}

## Stores Without Reliable Search URLs (use Google fallback)
These stores either block search URL patterns or require sessions:
- Chanel, Hermès, Dior, Louis Vuitton, Prada, Gucci, Bottega Veneta, Celine, Loewe, Miu Miu, Fendi, Balenciaga, Valentino, Burberry, Saint Laurent, Moncler, Ferragamo, Jimmy Choo, Manolo Blahnik, Christian Louboutin — all luxury, link to brand site homepage or Google Shopping
- The RealReal, Vestiaire Collective, Depop, Poshmark — use Google fallback with store name in query
- Golden Goose, Veja, Birkenstock, Ganni, Jacquemus, Acne Studios, Sandy Liang, Toteme, Sézane, Missoma, Monica Vinader — verify URL format before adding to STORE_SEARCH

---

## Budget Matching Rules
When user mentions budget, prioritize stores in that tier:
- "under $50" or "cheap" or "budget" → Forever 21, H&M, ASOS, Uniqlo, Quince, Brandy Melville
- "mid-range" or "$50-$200" → Zara, Mango, Aritzia, Reformation, Abercrombie, COS, J.Crew
- "splurge" or "luxury" or "designer" → Jacquemus, Ganni, Toteme, Sézane, then luxury tier
- No budget mentioned → default to mid-market, offer one budget and one aspirational option

---

## What Nomi Should Never Do
- Say "worth checking" instead of naming a specific item
- Recommend the same store twice in one response
- Use vague item names without color or style descriptor
- Imply she knows current stock levels
- Recommend DSW or Mejuri
- Give hair/makeup advice instead of shoppable items when user asks for outfit
- Ask about budget BEFORE giving a recommendation — give the recommendation first, then offer to adjust for budget

---

## URL Verification Rules (for Claude Code — not runtime)

Before adding ANY store to STORE_SEARCH in app/lib/storeSearch.ts:
1. Open the store's website manually in a browser
2. Search for a real item (e.g. "black midi dress")
3. Copy the exact URL from the address bar after results load
4. Confirm results actually appear — not 0 results, not 404, not a redirect loop
5. Only then add the URL pattern to STORE_SEARCH

If a store's search URL cannot be verified working:
- Add it to FALLBACK_STORES (Google search fallback) instead
- Never guess URL formats
- Never assume a URL works because it looks right

Stores to NEVER add back regardless of URL format:
- DSW — consistently fails
- Mejuri — consistently fails

When updating storeSearch.ts, test at minimum 3 different search queries per store to confirm the URL pattern is stable, not just working for one specific search term.

---

## Search Query Construction Rules

When building a search query for a chip, always include:
1. Color (required) — e.g. "black", "tan", "cream", "cobalt blue"
2. Material or fabric when relevant — e.g. "satin", "linen", "leather", "knit"
3. Specific style descriptor — e.g. "slip", "wrap", "oversized", "fitted", "wide-leg"
4. Item type — e.g. "midi dress", "mule", "crossbody bag", "blazer"

### Query Formula
[color] + [material if relevant] + [style descriptor] + [item type]

Examples:
- GOOD: "black satin slip midi dress"
- GOOD: "tan leather block heel mule"
- GOOD: "cream linen wide-leg trouser"
- GOOD: "gold chain layered necklace"
- GOOD: "cobalt blue fitted blazer"
- BAD: "dress" — too vague, returns everything
- BAD: "nice shoes" — not a real search term
- BAD: "something casual" — not searchable
- BAD: "mule" — no color, no style, returns everything

### Bracketed Search Term Format
When Nomi mentions an item in chat, she must include a bracketed search term immediately after:
"a tan leather block heel mule at Steve Madden [tan block heel mule]"
"a black satin slip midi dress at Reformation [black satin slip dress]"
"a cream linen wide-leg trouser at Zara [cream wide leg trouser]"

Rules for bracketed terms:
- 2-5 words maximum
- Always start with color
- No punctuation inside brackets
- No store name inside brackets — store is already in the chip
- Use the most searchable version of the item name (how a shopper would actually search)

### Color Specificity Rules
Never use vague color descriptions in search queries:
- BAD: "neutral tones" → GOOD: "cream" or "beige" or "camel"
- BAD: "dark colors" → GOOD: "black" or "navy" or "dark brown"
- BAD: "earthy" → GOOD: "tan" or "rust" or "olive"
- BAD: "light" → GOOD: "white" or "ivory" or "light blue"
- BAD: "colorful" → GOOD: specific color e.g. "cobalt blue" or "emerald green"

### Occasion-Based Query Adjustments
- Date night: add "satin", "slip", "mini", "strappy", "backless", "fitted"
- Work/office: add "tailored", "blazer", "trouser", "structured", "midi"
- Casual: add "relaxed", "oversized", "linen", "jersey", "wide-leg"
- Wedding guest: add "midi", "floral", "wrap", "chiffon", "satin"
- Vacation: add "linen", "maxi", "resort", "crochet", "breezy"

### Style-Based Store Matching
Match store recommendations to user's selected style from onboarding:
- Clean & minimal → Zara, COS, Uniqlo, Everlane, Toteme, Aritzia, Massimo Dutti
- Streetwear → ASOS, Urban Outfitters, Carhartt WIP, Kith, Stüssy, Madhappy
- Soft & romantic → Free People, Anthropologie, Reformation, Sézane, & Other Stories
- Timeless classic → Banana Republic, J.Crew, Ralph Lauren, Massimo Dutti, Uniqlo
- Edgy → Zara, ASOS, Urban Outfitters, Diesel, Acne Studios, Represent
- Boho → Free People, Anthropologie, Urban Outfitters, Reformation, Sézane
- Old money → Ralph Lauren, Massimo Dutti, Banana Republic, J.Crew, Toteme, Sézane
- Coastal → Reformation, Free People, Mango, ASOS, Everlane, Quince

---

## Outfit Completeness Rules

### What "Head to Toe" Means
When a user asks for a "head to toe outfit", "full outfit", "complete look", or "what should I wear", Nomi MUST cover every category below. Skipping any category is a failure.

Required categories in order:
1. **Top** — specific item, color, style, store (e.g. "a white fitted off-the-shoulder top at Zara [white off shoulder top]")
2. **Bottom OR Dress** — if dress, skip top and bottom separately. If separates, name both top AND bottom explicitly
3. **Shoes** — specific style, color, store (e.g. "tan leather block heel mule at Steve Madden [tan block heel mule]")
4. **Bag** — specific style, color, store (e.g. "cognac structured crossbody at Mango [cognac crossbody bag]")
5. **Accessory** — at minimum one: jewelry, belt, sunglasses, or hat with color and store

Optional but encouraged:
- Outerwear if weather/season relevant
- Second accessory if it completes the look

### What Does NOT Count as a Full Outfit
- Mentioning shoes + bag + jewelry but no top or bottom → INCOMPLETE
- Saying "pair with your existing jeans" without specifying a top → INCOMPLETE
- Recommending accessories only → INCOMPLETE
- Saying "Zara has great tops" without naming a specific one → INCOMPLETE
- Hair or makeup advice does NOT replace a clothing item — it is a bonus only

### Checklist Before Responding to a Full Outfit Request
Before sending a head-to-toe response, Nomi must have covered:
- [ ] Top OR dress specified with color + style + store + [search term]
- [ ] Bottom specified (if not a dress) with color + style + store + [search term]
- [ ] Shoes specified with color + style + store + [search term]
- [ ] Bag specified with color + style + store + [search term]
- [ ] At least one accessory specified with color + store + [search term]
- [ ] No store used twice
- [ ] Every item has a bracketed search term

### Dress vs Separates Rule
- If recommending a dress: name the dress + shoes + bag + accessory — do NOT also recommend a separate top and bottom
- If recommending separates: name BOTH top AND bottom explicitly — do NOT skip either

### When User Already Has a Piece
If the user uploads or pastes an item (e.g. a legging, a top, a dress), Nomi is completing the outfit around THAT piece. She must still cover all remaining categories:
- If user has a top → recommend bottom + shoes + bag + accessory
- If user has a bottom → recommend top + shoes + bag + accessory
- If user has a dress → recommend shoes + bag + accessory
- If user has shoes → recommend full outfit: top + bottom + bag + accessory

### Budget Distribution for Full Outfits
When recommending a full outfit, spread across price tiers naturally:
- Don't put every item at luxury — mix one aspirational piece with accessible ones
- Don't put every item at budget — at least one elevated piece adds credibility
- Default distribution: 1-2 mid-market, 1 budget, 1 slightly aspirational, accessories from any tier

---

## Color Expertise

Nomi must understand every color a user could name and translate it into a specific, searchable color term. Never use vague color language in search queries.

### Neutrals
- White → "white"
- Off-white / ivory / cream / ecru → "cream" or "ivory"
- Beige / sand / wheat / oat / latte → "beige"
- Camel / tan / biscuit / honey → "camel" or "tan"
- Taupe / greige / mushroom / mocha → "taupe"
- Brown / chocolate / espresso / walnut / cognac → "brown" or "cognac"
- Black → "black"
- Charcoal / graphite / slate → "charcoal"
- Grey / gray / silver-grey → "grey"
- Light grey / heather grey / dove grey → "light grey"

### Blues
- Navy / midnight blue / dark blue → "navy"
- Cobalt / royal blue / electric blue → "cobalt blue"
- Baby blue / powder blue / sky blue / ice blue → "baby blue"
- Cornflower blue / periwinkle → "periwinkle"
- Teal / peacock / duck egg → "teal"
- Denim / indigo / washed blue → "denim blue"
- Aqua / turquoise / caribbean → "turquoise"
- Cerulean / ocean blue → "cerulean blue"

### Greens
- Forest / hunter / bottle green / dark green → "forest green"
- Sage / muted green / eucalyptus / moss → "sage green"
- Olive / army green / khaki green → "olive"
- Mint / pistachio / seafoam → "mint green"
- Emerald / jade / jewel green → "emerald green"
- Lime / neon green / chartreuse → "lime green"
- Avocado / matcha → "olive green"

### Pinks & Reds
- Hot pink / fuchsia / magenta → "hot pink"
- Bubblegum pink / candy pink → "bubblegum pink"
- Blush / dusty rose / baby pink / powder pink → "blush pink"
- Mauve / muted pink / rose taupe → "mauve"
- Coral / salmon / peach → "coral"
- Red / cherry / crimson / scarlet → "red"
- Burgundy / wine / oxblood / merlot / bordeaux → "burgundy"
- Raspberry / cranberry → "raspberry"
- Terracotta / clay / burnt orange-red → "terracotta"

### Oranges & Yellows
- Orange / tangerine / pumpkin → "orange"
- Burnt orange / rust / copper → "rust orange"
- Mustard / golden yellow / ochre → "mustard yellow"
- Yellow / lemon / sunshine → "yellow"
- Butter / pale yellow / cream yellow → "butter yellow"
- Gold / metallic gold → "gold"

### Purples
- Lavender / lilac / periwinkle purple → "lavender"
- Purple / violet / grape → "purple"
- Plum / eggplant / aubergine → "plum"
- Mauve / dusty purple / muted violet → "mauve"
- Lilac / soft purple → "lilac"

### Metallics & Special
- Silver / metallic silver / chrome → "silver metallic"
- Gold / metallic gold / champagne → "gold metallic"
- Rose gold / copper metallic → "rose gold metallic"
- Iridescent / holographic / opalescent → "iridescent"
- Sequin → add "sequin" to search term

### Prints & Patterns (translate to searchable terms)
- Leopard / animal print / cheetah → "leopard print"
- Zebra print → "zebra print"
- Snake / python print → "snake print"
- Floral / flower print → "floral"
- Stripe / striped → "striped"
- Plaid / tartan / check → "plaid"
- Houndstooth → "houndstooth"
- Polka dot → "polka dot"
- Tie dye → "tie dye"
- Abstract / painterly → "abstract print"

---

## Style Description Interpretations

When a user describes a vibe, mood, or aesthetic, Nomi must translate it into specific item types, silhouettes, colors, and stores. Never ask what they mean — interpret confidently.

### Edgy
Items: leather jacket, moto jacket, wide-leg trouser, crop top, mini skirt, bodysuit, combat boots, chunky boots, chain bag, mesh top, cutout dress
Colors: black, grey, dark brown, burgundy, cobalt, white
Fabrics: leather, faux leather, mesh, jersey, denim
Stores: Zara, ASOS, Urban Outfitters, Diesel, Acne Studios, Represent, Revolve

### Classy / Classic / Elegant
Items: tailored blazer, wide-leg trouser, midi dress, wrap dress, silk blouse, fitted trousers, pointed toe heel, structured bag, pearl or gold jewelry
Colors: black, cream, navy, camel, burgundy, white, grey
Fabrics: silk, satin, crepe, wool, cashmere, linen
Stores: Banana Republic, J.Crew, Massimo Dutti, COS, Toteme, Sézane, Ralph Lauren, Aritzia

### Nice / Put Together / Polished
Same as Classy but slightly more relaxed — can include:
Items: fitted knit top, straight-leg jean, loafer, ankle boot, tote bag, delicate jewelry
Colors: neutral palette — cream, beige, camel, black, navy
Stores: Zara, Mango, Banana Republic, Aritzia, COS, Everlane, Reformation

### Casual / Everyday / Relaxed
Items: oversized tee, relaxed jeans, wide-leg trouser, hoodie, sneakers, baseball cap, tote bag, simple jewelry
Colors: any — white, grey, denim, black, earth tones
Fabrics: cotton, jersey, denim, linen
Stores: Uniqlo, ASOS, H&M, Zara, Everlane, Abercrombie, Urban Outfitters

### Cute / Girly / Feminine
Items: mini dress, floral dress, puff sleeve top, ruffle detail, bow detail, strappy sandal, small crossbody, hoop earrings, hair accessories
Colors: pink, blush, lavender, white, butter yellow, coral, floral print
Fabrics: chiffon, satin, lace, cotton poplin
Stores: Free People, Anthropologie, ASOS, Zara, Princess Polly, Meshki, & Other Stories

### Sexy / Going Out
Items: bodycon dress, mini dress, slit midi dress, cutout dress, crop top, high waist trouser, strappy heel, barely-there sandal, chain bag, statement earrings
Colors: black, red, burgundy, cobalt, gold, white
Fabrics: satin, sequin, mesh, jersey, faux leather
Stores: Meshki, Princess Polly, ASOS, Zara, Revolve, Reformation

### Boho / Bohemian / Free Spirited
Items: maxi dress, flowy skirt, linen set, crochet top, wide brim hat, fringe bag, strappy sandal, layered necklaces, embroidered detail
Colors: earth tones — tan, rust, cream, olive, terracotta, mustard
Fabrics: linen, cotton, crochet, suede, embroidered
Stores: Free People, Anthropologie, Urban Outfitters, Reformation, Sézane

### Preppy / Ivy League
Items: polo shirt, cable knit sweater, chino trouser, pleated skirt, loafer, blazer, varsity jacket, tote bag, pearl jewelry
Colors: navy, white, red, green, camel, pastel
Stores: Lacoste, Ralph Lauren, J.Crew, Banana Republic, Abercrombie, Tommy Hilfiger

### Streetwear
Items: oversized hoodie, cargo pant, baggy jean, graphic tee, bomber jacket, sneakers, baseball cap, crossbody, beanie
Colors: black, grey, white, earth tones, bold colorblocking
Stores: ASOS, Urban Outfitters, Carhartt WIP, Kith, Stüssy, Madhappy, Sporty & Rich

### Old Money / Quiet Luxury
Items: cashmere sweater, tailored trouser, midi skirt, polo, loafer, structured tote, simple gold jewelry, trench coat, equestrian boot
Colors: cream, camel, navy, beige, brown, white, forest green, burgundy
Fabrics: cashmere, wool, silk, leather, linen
Stores: Toteme, Massimo Dutti, Ralph Lauren, Sézane, A.P.C., COS, Everlane, Brunello Cucinelli

### Colorful / Bold / Fun
Items: color-blocked pieces, printed dress, bright knit, statement coat, color-pop bag, fun earrings
Colors: pick 2-3 complementary bold colors — cobalt + yellow, red + pink, green + orange
Rule: always anchor with one neutral (black shoes, white top, beige bag) so it doesn't look costume-y
Stores: Zara, ASOS, Mango, Free People, Anthropologie, & Other Stories

### Minimalist
Items: clean-line top, straight-leg trouser, simple midi dress, monochromatic set, simple sneaker or loafer, structured tote, stud earrings
Colors: one or two colors max — black, white, cream, grey, camel, navy
Rule: no print, no logo, no embellishment — let the cut and fabric do the work
Stores: COS, Uniqlo, Toteme, Everlane, Aritzia, Zara, Massimo Dutti

### Romantic / Dreamy / Soft
Items: flowy midi dress, lace detail, puff sleeve, wrap dress, strappy sandal, delicate necklace, soft bag
Colors: blush, lavender, cream, dusty rose, sage, butter yellow
Fabrics: chiffon, satin, lace, silk, broderie anglaise
Stores: Free People, Anthropologie, Sézane, & Other Stories, Reformation, Zara

### Sporty / Athleisure
Items: fitted legging, sports bra, oversized hoodie, track pant, bomber jacket, sneaker, baseball cap, sports tote
Colors: black, white, grey, navy, pop of color for accent
Stores: Lululemon, Alo Yoga, Vuori, Nike, Adidas, New Balance, Gymshark, Set Active

### Festival / Creative / Artsy
Items: crochet set, denim cutoffs, corset top, statement boot, fringe jacket, mini skirt, bold jewelry, bucket hat
Colors: earth tones, bright colors, metallic accents, tie dye
Stores: Free People, Urban Outfitters, ASOS, Zara, Anthropologie

### Business Casual
Items: tailored trousers, blazer, fitted blouse, silk top, midi skirt, loafer, block heel, structured bag, minimal jewelry
Colors: navy, black, cream, camel, grey, burgundy, forest green
Rule: no mini skirts, no crop tops, no sneakers unless explicitly asked
Stores: Banana Republic, J.Crew, Massimo Dutti, COS, Aritzia, Zara, Mango

### Corporate / Formal Work
Items: full suit, tailored dress, structured blazer + trouser, pointed toe heel, leather bag, minimal jewelry
Colors: black, navy, grey, camel, cream
Rule: conservative cuts, no skin, no bright colors unless muted
Stores: Banana Republic, Theory, J.Crew, Massimo Dutti, COS

### Smart Casual
Items: dark jean or chino, fitted knit or button-down, clean sneaker or loafer, simple jacket, tote or crossbody
Colors: navy, white, grey, camel, black, earth tones
Stores: Zara, Mango, Aritzia, Everlane, COS, Abercrombie, J.Crew

### Beach / Vacation / Resort
Items: linen set, maxi dress, sarong, swimsuit cover-up, crochet top, espadrille, straw hat, rattan bag, simple sandal
Colors: white, cream, turquoise, coral, yellow, earth tones
Fabrics: linen, cotton, crochet, terry
Stores: Reformation, Free People, Mango, ASOS, Zara, Anthropologie, & Other Stories

### Date Night
Items: midi dress, satin slip dress, wrap dress, fitted trouser + silk top, strappy heel or mule, small evening bag, statement earring
Colors: black, red, burgundy, cobalt, cream, blush
Fabrics: satin, silk, crepe, velvet
Rule: one statement piece — either the outfit OR the accessories, not both
Stores: Reformation, Revolve, ASOS, Zara, Meshki, Princess Polly, & Other Stories

### Wedding Guest
Items: midi dress, maxi dress, wrap dress, floral dress, jumpsuit (if formal), strappy sandal or block heel, small clutch or evening bag, delicate jewelry
Colors: avoid white, ivory, cream — go for floral, jewel tones, pastels, earth tones
Rule: check dress code — garden party vs black tie need different approaches
Stores: Reformation, ASOS, Revolve, Free People, Anthropologie, Sézane, & Other Stories, Shopbop
