// ─── Types ────────────────────────────────────────────────────────────────────

export type OutfitPiece = {
  name: string;
  category: string;
  description: string;
};

export type Look = {
  id: string;
  title: string;
  tags: string[];       // used for filtering + taste profile
  gradient: string;     // CSS gradient — editorial placeholder image
  height: number;       // masonry card height
  pieces: OutfitPiece[];
};

// ─── Seed content — 15 curated editorial looks ────────────────────────────────

export const LOOKS: Look[] = [
  {
    id: "1",
    title: "Clean slate",
    tags: ["Minimal", "Trending"],
    gradient: "linear-gradient(160deg, #f5f0e8 0%, #ede5d5 100%)",
    height: 300,
    pieces: [
      { name: "Ribbed white tank top",       category: "Tops",        description: "Slim fit, scoop neck, cotton-modal blend" },
      { name: "High-waist linen trousers",   category: "Bottoms",     description: "Wide-leg, cream, elasticated waist" },
      { name: "Tan leather loafers",         category: "Shoes",       description: "Classic slip-on, horsebit detail, cognac" },
      { name: "Simple gold hoop earrings",   category: "Accessories", description: "14k gold-tone, 2.5cm diameter" },
    ],
  },
  {
    id: "2",
    title: "Quiet luxury",
    tags: ["Minimal", "Work"],
    gradient: "linear-gradient(140deg, #c8b89a 0%, #a89273 100%)",
    height: 240,
    pieces: [
      { name: "Cashmere turtleneck in oatmeal", category: "Tops",    description: "Fine-knit, slim fit, ribbed cuffs" },
      { name: "Tailored wide-leg trousers",     category: "Bottoms", description: "Camel wool-blend, high-rise, pressed crease" },
      { name: "Pointed leather mules",          category: "Shoes",   description: "Kitten heel, cream leather, square toe" },
      { name: "Mini structured tote",           category: "Bags",    description: "Top-handle, tan leather, gold clasp" },
    ],
  },
  {
    id: "3",
    title: "Off-duty cool",
    tags: ["Street", "Trending"],
    gradient: "linear-gradient(160deg, #1a1a2e 0%, #16213e 100%)",
    height: 300,
    pieces: [
      { name: "Oversized graphic tee",     category: "Tops",    description: "Washed black, vintage band print, boxy fit" },
      { name: "Straight-leg dark jeans",   category: "Bottoms", description: "Rigid denim, raw hem, ankle length" },
      { name: "White Nike Air Force 1s",   category: "Shoes",   description: "Low-top, triple white, leather upper" },
      { name: "Black mini crossbody",      category: "Bags",    description: "Chain strap, zip-around, adjustable" },
    ],
  },
  {
    id: "4",
    title: "Urban drift",
    tags: ["Street"],
    gradient: "linear-gradient(135deg, #2d3748 0%, #4a5568 100%)",
    height: 220,
    pieces: [
      { name: "Vintage leather jacket",  category: "Outerwear", description: "Boxy fit, worn-in patina, silver hardware" },
      { name: "Olive cargo trousers",    category: "Bottoms",   description: "Utility pockets, straight leg, drawstring hem" },
      { name: "Chunky black boots",      category: "Shoes",     description: "Lug sole, lace-up, combat silhouette" },
      { name: "Vintage band tee",        category: "Tops",      description: "Faded print, cropped, distressed hem" },
    ],
  },
  {
    id: "5",
    title: "Soft morning",
    tags: ["Minimal", "Summer"],
    gradient: "linear-gradient(160deg, #fdf0e0 0%, #f5d9b5 100%)",
    height: 260,
    pieces: [
      { name: "Linen co-ord set",        category: "Tops",    description: "Sage green, relaxed shirt and shorts" },
      { name: "Woven leather mules",     category: "Shoes",   description: "Espadrille sole, cream leather upper" },
      { name: "Natural raffia bag",      category: "Bags",    description: "Top-handle, structured, woven detailing" },
      { name: "Delicate gold necklace",  category: "Accessories", description: "18k gold-tone, thin chain, pendant drop" },
    ],
  },
  {
    id: "6",
    title: "Saturday night",
    tags: ["Going out"],
    gradient: "linear-gradient(160deg, #0d0221 0%, #240046 100%)",
    height: 300,
    pieces: [
      { name: "Satin bias slip dress",   category: "Tops",        description: "Champagne, adjustable straps, midi length" },
      { name: "Strappy stiletto heels",  category: "Shoes",       description: "Barely-there, ankle-wrap, gold hardware" },
      { name: "Crystal mini bag",        category: "Bags",        description: "Beaded frame, hard-case, wrist strap" },
      { name: "Gold hoop earrings",      category: "Accessories", description: "Polished gold-tone, 4cm, statement size" },
    ],
  },
  {
    id: "7",
    title: "Golden hour",
    tags: ["Going out", "Trending"],
    gradient: "linear-gradient(140deg, #b8860b 0%, #daa520 50%, #f0c030 100%)",
    height: 240,
    pieces: [
      { name: "Gold sequin mini dress",  category: "Tops",        description: "All-over sequin, A-line, above knee" },
      { name: "Nude strappy heels",      category: "Shoes",       description: "Thin heel, ankle tie, barely-there" },
      { name: "Simple gold clutch",      category: "Bags",        description: "Structured envelope, chain strap detachable" },
      { name: "Diamond ear studs",       category: "Accessories", description: "Round cut, pavé setting, gold post" },
    ],
  },
  {
    id: "8",
    title: "Board meeting",
    tags: ["Work"],
    gradient: "linear-gradient(160deg, #1b2a3b 0%, #2c4564 100%)",
    height: 300,
    pieces: [
      { name: "Double-breasted navy blazer", category: "Outerwear", description: "Slim fit, gold buttons, peak lapel" },
      { name: "Matching straight trousers",  category: "Bottoms",   description: "High-rise, front crease, ankle crop" },
      { name: "Crisp white Oxford shirt",    category: "Tops",      description: "Poplin cotton, spread collar, fitted" },
      { name: "Block-heel pumps in black",   category: "Shoes",     description: "Pointed toe, 6cm heel, leather sole" },
    ],
  },
  {
    id: "9",
    title: "Smart casual",
    tags: ["Work", "Minimal"],
    gradient: "linear-gradient(135deg, #7b6b5a 0%, #9a8575 100%)",
    height: 220,
    pieces: [
      { name: "Camel oversized blazer",  category: "Outerwear", description: "Relaxed fit, notch lapel, unstructured" },
      { name: "Light-wash straight jeans", category: "Bottoms", description: "High-rise, clean wash, ankle length" },
      { name: "White leather sneakers",  category: "Shoes",     description: "Minimal low-top, clean cup sole" },
      { name: "Silk neck scarf",         category: "Accessories", description: "Ivory, printed, tied at collar or bag" },
    ],
  },
  {
    id: "10",
    title: "Vintage sunday",
    tags: ["Secondhand", "Trending"],
    gradient: "linear-gradient(160deg, #6b3a2a 0%, #8b5e3c 100%)",
    height: 260,
    pieces: [
      { name: "90s denim jacket",        category: "Outerwear", description: "Mid-wash, boxy, contrast stitching" },
      { name: "Floral midi skirt",       category: "Bottoms",   description: "Satin-finish, bias-cut, vintage print" },
      { name: "White canvas Converse",   category: "Shoes",     description: "Low-top Chuck Taylor, classic sole" },
      { name: "Vintage straw bucket hat",category: "Accessories", description: "Natural woven, floppy wide brim" },
    ],
  },
  {
    id: "11",
    title: "Thrift flip",
    tags: ["Secondhand"],
    gradient: "linear-gradient(135deg, #4a3728 0%, #7a5c42 100%)",
    height: 300,
    pieces: [
      { name: "Vintage plaid blazer",    category: "Outerwear", description: "Green tartan, single-button, 90s cut" },
      { name: "High-waist corduroy trousers", category: "Bottoms", description: "Wide-wale, relaxed straight leg, brown" },
      { name: "Chunky suede loafers",    category: "Shoes",     description: "Platform sole, tassel trim, tan" },
      { name: "Ribbed knit tank",        category: "Tops",      description: "Oatmeal, cropped, cami length" },
    ],
  },
  {
    id: "12",
    title: "Coastal blue",
    tags: ["Summer", "Trending"],
    gradient: "linear-gradient(160deg, #0f4c75 0%, #1b6ca8 50%, #74b9e7 100%)",
    height: 220,
    pieces: [
      { name: "Linen wide-leg trousers", category: "Bottoms", description: "White, high-rise, elasticated waist" },
      { name: "Crochet bandeau top",     category: "Tops",    description: "Open weave, cream, adjustable ties" },
      { name: "Platform wedge sandals",  category: "Shoes",   description: "Espadrille wedge, leather straps, tan" },
      { name: "Woven shoulder bag",      category: "Bags",    description: "Rattan, round shape, leather handle" },
    ],
  },
  {
    id: "13",
    title: "Sun-drenched",
    tags: ["Summer"],
    gradient: "linear-gradient(135deg, #e67e22 0%, #f39c12 50%, #f1c40f 100%)",
    height: 260,
    pieces: [
      { name: "Yellow linen maxi dress", category: "Tops",        description: "Butter yellow, square neck, A-line" },
      { name: "Leather flat sandals",    category: "Shoes",       description: "Tan, toe-post, single ankle strap" },
      { name: "Natural straw hat",       category: "Accessories", description: "Wide brim, ribbon tie, packable" },
      { name: "Shell layered necklace",  category: "Accessories", description: "Mixed cowrie shells, adjustable cord" },
    ],
  },
  {
    id: "14",
    title: "Stone cold",
    tags: ["Minimal"],
    gradient: "linear-gradient(160deg, #b2a8a0 0%, #928880 100%)",
    height: 300,
    pieces: [
      { name: "Knit midi dress in stone",  category: "Tops",    description: "Monochrome, ribbed, long-sleeve, fitted" },
      { name: "Matching longline cardigan",category: "Outerwear","description": "Fine-knit, open front, same shade" },
      { name: "Square-toe ankle boots",    category: "Shoes",   description: "Black leather, block heel, zip detail" },
      { name: "Minimal leather clutch",    category: "Bags",    description: "Stone colour, envelope shape, no hardware" },
    ],
  },
  {
    id: "15",
    title: "Street luxe",
    tags: ["Street", "Trending"],
    gradient: "linear-gradient(140deg, #1a1a1a 0%, #2d2d2d 100%)",
    height: 240,
    pieces: [
      { name: "Oversized leather blazer",    category: "Outerwear", description: "Black, boxy, statement shoulder" },
      { name: "Black biker shorts",          category: "Bottoms",   description: "High-rise, 8-inch inseam, matte stretch" },
      { name: "Chunky platform trainers",    category: "Shoes",     description: "Thick sole, white leather, retro shape" },
      { name: "Crossbody chain bag",         category: "Bags",      description: "Mini, black leather, gold chain strap" },
    ],
  },
];
