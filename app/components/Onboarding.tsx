"use client";

import { useRef, useState } from "react";
import { recordTasteSignals } from "../lib/tasteProfile";

// ─── Types / constants ────────────────────────────────────────────────────────

type Props = { onComplete: () => void };

// Each gender has its own category list — not just different photos of the same
// 8 categories. Men's swaps out Soft & romantic / Boho / Old money for Formal /
// Workwear, matching the photo set actually provided.
type StyleOption = { key: string; label: string; image: string };

const WOMENS_STYLE_OPTIONS: StyleOption[] = [
  { key: "minimal",    label: "Less-is-more",              image: "/styles/minimal.png"    },
  { key: "streetwear", label: "Off-duty cool",              image: "/styles/streetwear.png" },
  { key: "romantic",   label: "Hopeless romantic",          image: "/styles/romantic.png"   },
  { key: "classic",    label: "Never goes out of style",    image: "/styles/classic.png"    },
  { key: "edgy",       label: "Rebel spirit",               image: "/styles/edgy.png"       },
  { key: "boho",       label: "Free spirit",                image: "/styles/boho.png"       },
  { key: "oldmoney",   label: "Quiet luxury",               image: "/styles/oldmoney.png"   },
  { key: "coastal",    label: "Beach day energy",           image: "/styles/coastal.png"    },
];

const MENS_STYLE_OPTIONS: StyleOption[] = [
  { key: "minimal",    label: "Less-is-more",              image: "/styles/mens-minimal.png"    },
  { key: "streetwear", label: "Off-duty cool",              image: "/styles/mens-streetwear.png" },
  { key: "classic",    label: "Never goes out of style",    image: "/styles/mens-classic.png"    },
  { key: "edgy",       label: "Rebel spirit",               image: "/styles/mens-edgy.png"       },
  { key: "coastal",    label: "Beach day energy",           image: "/styles/mens-coastal.png"    },
  { key: "formal",     label: "Suited & booted",            image: "/styles/mens-formal.png"     },
  { key: "workwear",   label: "Built to work",              image: "/styles/mens-workwear.png"   },
  { key: "sporty",     label: "Game day ready",            image: "/styles/mens-sporty.png"     },
];

// De-duplicated union for "All" — the 5 categories that exist in both lists
// (minimal/streetwear/classic/edgy) show once rather than twice for the same
// underlying key, plus each gender's unique categories. Coastal is dropped
// here (kept in the Women's/Men's lists) purely to land on an even 10 instead
// of an odd 11, which would leave the last tile alone in the 2-col grid.
const ALL_STYLE_OPTIONS: StyleOption[] = [
  { key: "minimal",    label: "Less-is-more",              image: "/styles/minimal.png"    },
  { key: "streetwear", label: "Off-duty cool",              image: "/styles/streetwear.png" },
  { key: "classic",    label: "Never goes out of style",    image: "/styles/classic.png"    },
  { key: "edgy",       label: "Rebel spirit",               image: "/styles/edgy.png"       },
  { key: "romantic",   label: "Hopeless romantic",          image: "/styles/romantic.png"   },
  { key: "boho",       label: "Free spirit",                image: "/styles/boho.png"       },
  { key: "oldmoney",   label: "Quiet luxury",               image: "/styles/oldmoney.png"   },
  { key: "formal",     label: "Suited & booted",            image: "/styles/mens-formal.png"     },
  { key: "workwear",   label: "Built to work",              image: "/styles/mens-workwear.png"   },
  { key: "sporty",     label: "Game day ready",             image: "/styles/mens-sporty.png"     },
];

function styleOptionsFor(gender: string): StyleOption[] {
  if (gender === "Men's")   return MENS_STYLE_OPTIONS;
  if (gender === "Women's") return WOMENS_STYLE_OPTIONS;
  return ALL_STYLE_OPTIONS; // "All" or unselected
}

const GENDER_OPTIONS = ["Women's", "Men's", "All"];

const TOTAL_SCREENS = 5;

const PRICE_MAX = 1000;

const LIFE_STAGE_OPTIONS  = ["Student", "Early career", "Established", "Prefer not to say"];
const SHOPPING_TIER_OPTIONS = ["Mostly mid-market", "Occasional luxury splurges", "Primarily luxury"];
const SIZING_CATEGORIES   = ["Tops", "Bottoms", "Dresses", "Jumpsuits", "Shoes", "Outerwear"];

// Bottoms sizing is genuinely ambiguous (letter vs numeric waist/inseam vary by
// gender and store), so it gets the same letter-size row as everything else -
// the free-text fallback below each row is what actually covers waist/inseam,
// EU/UK sizes, or anything else that doesn't fit a standard letter/number.
const SIZE_OPTIONS: Record<string, string[]> = {
  Tops:      ["XS", "S", "M", "L", "XL", "XXL"],
  Bottoms:   ["XS", "S", "M", "L", "XL", "XXL"],
  Dresses:   ["XS", "S", "M", "L", "XL", "XXL"],
  Jumpsuits: ["XS", "S", "M", "L", "XL", "XXL"],
  Shoes:     ["6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "12"],
  Outerwear: ["XS", "S", "M", "L", "XL", "XXL"],
};

// Both chip rows used to be one gender-agnostic list, which meant menswear
// profiles got womenswear-specific chips ("Mini skirts", "Bodycon", "Highlights
// shoulders", etc.) that don't apply. Split the same way styleOptionsFor()
// already splits style tiles, with the same "Women's, All, or unselected"
// fallback convention.
const WOMENS_FIT_CHIPS = [
  "Fitted waist", "Relaxed fit", "Oversized", "Tailored",
  "High-waisted", "Highlights shoulders", "Flowy", "Cropped",
];

const MENS_FIT_CHIPS = [
  "Relaxed fit", "Oversized", "Tailored", "Slim fit", "Straight leg", "Cropped",
];

function fitChipsFor(gender: string): string[] {
  if (gender === "Men's") return MENS_FIT_CHIPS;
  return WOMENS_FIT_CHIPS;
}

const WOMENS_NEVER_WEAR_CHIPS = [
  "Heels", "Crop tops", "Sleeveless", "Strapless", "Off shoulder",
  "Bodycon", "Mini skirts", "Plunging necklines", "Sequins", "Florals",
  "Loud prints", "Cutouts",
];

const MENS_NEVER_WEAR_CHIPS = [
  "Skinny fit", "Graphic tees", "Tank tops", "Shorts", "Sandals",
  "Logos", "Bright colors", "Cargo pants", "Sleeveless", "Loud prints",
];

function neverWearChipsFor(gender: string): string[] {
  if (gender === "Men's") return MENS_NEVER_WEAR_CHIPS;
  return WOMENS_NEVER_WEAR_CHIPS;
}

// Shared by the fit-preference and never-wear chip rows - both are free-text
// fields where chips are just a quick-tap shortcut, so toggling a chip means
// adding/removing its label from the comma-separated text rather than
// replacing the field with a fixed set of options.
function toggleChipInCsv(current: string, label: string): string {
  const segments = current.split(",").map(s => s.trim()).filter(Boolean);
  const has = segments.some(s => s.toLowerCase() === label.toLowerCase());
  const next = has
    ? segments.filter(s => s.toLowerCase() !== label.toLowerCase())
    : [...segments, label];
  return next.join(", ");
}

function isChipActive(current: string, label: string): boolean {
  return current.split(",").map(s => s.trim().toLowerCase()).includes(label.toLowerCase());
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Onboarding({ onComplete }: Props) {
  const [screen, setScreen] = useState(0);
  const [styles,           setStyles]           = useState<string[]>([]);
  const [styleDesc,        setStyleDesc]        = useState("");
  const [gender,           setGender]           = useState("");
  const [neverWear,        setNeverWear]        = useState("");
  const [priceRange,       setPriceRange]       = useState<[number, number]>([0, PRICE_MAX]);
  const [lifeStage,        setLifeStage]        = useState("");
  const [lifeStageDesc,    setLifeStageDesc]    = useState("");
  const [shoppingTier,     setShoppingTier]     = useState("");
  const [shoppingTierDesc, setShoppingTierDesc] = useState("");
  const [styleInfluencers, setStyleInfluencers] = useState("");
  const [fitPreferences,   setFitPreferences]   = useState("");
  const [sizing,           setSizing]           = useState<Record<string, string>>({});
  const [styleUploads,     setStyleUploads]     = useState<string[]>([]); // data URLs, capped at 5 — analyzed then discarded, never persisted
  const [analyzingStyle,   setAnalyzingStyle]   = useState(false);

  function addStyleUpload(file: File) {
    if (!file.type.startsWith("image/") || styleUploads.length >= 5) return;
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      setStyleUploads(prev => prev.length >= 5 ? prev : [...prev, dataUrl]);
    };
    reader.readAsDataURL(file);
  }

  function removeStyleUpload(i: number) {
    setStyleUploads(prev => prev.filter((_, idx) => idx !== i));
  }

  function likeStyle(s: string) {
    setStyles(prev => prev.includes(s) ? prev : [...prev, s]);
  }

  function removeStyle(s: string) {
    setStyles(prev => prev.filter(x => x !== s));
  }

  function toggleFitChip(label: string) {
    setFitPreferences(prev => toggleChipInCsv(prev, label));
  }

  function toggleNeverWearChip(label: string) {
    setNeverWear(prev => toggleChipInCsv(prev, label));
  }

  async function finish() {
    const filteredSizing = Object.fromEntries(
      Object.entries(sizing).filter(([, v]) => v.trim())
    );
    const profile = {
      styles,
      styleDescription: styleDesc.trim(),
      gender,
      neverWear: neverWear.trim(),
      budgetMin: priceRange[0],
      budgetMax: priceRange[1],
      ...(lifeStage                              && { lifeStage }),
      ...(lifeStageDesc.trim()                   && { lifeStageDescription: lifeStageDesc.trim() }),
      ...(shoppingTier                           && { shoppingTier }),
      ...(shoppingTierDesc.trim()                && { shoppingTierDescription: shoppingTierDesc.trim() }),
      ...(styleInfluencers.trim()                && { styleInfluencers: styleInfluencers.trim() }),
      ...(fitPreferences.trim()                  && { fitPreferences: fitPreferences.trim() }),
      ...(Object.keys(filteredSizing).length > 0 && { sizing: filteredSizing }),
    };
    // Write the explicit onboarding fields first — recordTasteSignals() below
    // does a read-modify-write on top of whatever's already in localStorage,
    // so it has to run after this or its merge would be overwritten.
    localStorage.setItem("nomi_taste_profile", JSON.stringify(profile));
    const existing = JSON.parse(localStorage.getItem("nomi_current_filters") ?? "{}");
    localStorage.setItem("nomi_current_filters", JSON.stringify({ ...existing, priceRange }));

    if (styleUploads.length > 0) {
      setAnalyzingStyle(true);
      const settled = await Promise.allSettled(
        styleUploads.map(image =>
          fetch("/api/analyze-style", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image }),
          }).then(r => r.json())
        )
      );
      const signals = settled
        .filter((r): r is PromiseFulfilledResult<{ category?: string; color?: string; aesthetic?: string }> => r.status === "fulfilled")
        .map(r => r.value)
        .filter(v => v.category || v.color || v.aesthetic);
      if (signals.length) recordTasteSignals(signals);
      setAnalyzingStyle(false);
    }

    localStorage.setItem("nomi-onboarded", "true");
    onComplete();
  }

  const primaryLabel = analyzingStyle
    ? "Analyzing your style…"
    : screen === 0 ? "Get started" : screen < TOTAL_SCREENS - 1 ? "Next" : "Start styling";

  return (
    <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 500, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ width: "100%", maxWidth: "420px", height: "100%", display: "flex", flexDirection: "column" }}>

        {/* ── Back button ── */}
        {screen > 0 && (
          <div style={{ flexShrink: 0, padding: "16px 20px 0" }}>
            <button
              onClick={() => setScreen(s => s - 1)}
              style={{ background: "none", border: "none", fontSize: "15px", color: "#aaa", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: "5px" }}
            >
              ← Back
            </button>
          </div>
        )}

        {/* ── Sliding screens ── */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          <div style={{
            display: "flex",
            width: `${TOTAL_SCREENS * 100}%`,
            height: "100%",
            transform: `translateX(${-screen * (100 / TOTAL_SCREENS)}%)`,
            transition: "transform 0.38s cubic-bezier(0.4, 0, 0.2, 1)",
          }}>

            {/* ── Screen 1 — What Nomi does ── */}
            <div style={{ width: "20%", height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", padding: "52px 28px 16px" }}>
              <p style={{ fontSize: "44px", fontWeight: 500, letterSpacing: "-2px", color: "#c9a96e", lineHeight: 1, marginBottom: "16px" }}>nomi.</p>
              <h1 style={{ fontSize: "32px", fontWeight: 700, letterSpacing: "-0.8px", color: "#000", textAlign: "center", marginBottom: "14px", lineHeight: 1.15 }}>
                Your AI stylist.
              </h1>
              <p style={{ fontSize: "16px", color: "#6b6b6b", textAlign: "center", lineHeight: 1.65, marginBottom: "44px", maxWidth: "280px" }}>
                Upload any piece. Get a full outfit from any store.
              </p>
              <PhoneIllustration />
            </div>

            {/* ── Screen 2 — How it works ── */}
            <div style={{ width: "20%", height: "100%", overflowY: "auto", padding: "60px 28px 120px" }}>
              <h2 style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.7px", color: "#000", marginBottom: "40px", lineHeight: 1.2 }}>
                How it works
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
                {[
                  { Icon: UploadIcon,   headline: "Upload a piece you love",                         subhead: "From any brand or store." },
                  { Icon: SparkleIcon,  headline: "Get a full outfit built around it",               subhead: "Nomi matches it with pieces from across the internet." },
                  { Icon: SearchIcon,   headline: "Find similar styles across brands",               subhead: "Compare silhouettes, alternatives, and price points across categories." },
                  { Icon: ChatIcon,     headline: "Chat with your AI stylist",                       subhead: "Get personalized suggestions based on your style, tastes, and what you've saved." },
                  { Icon: BookmarkIcon, headline: "Explore community inspiration and save looks",    subhead: "Browse how others style pieces, discover new looks, and save your favorites." },
                ].map(({ Icon, headline, subhead }, i) => (
                  <div key={i} style={{ display: "flex", gap: "18px", alignItems: "flex-start" }}>
                    <div style={{ width: "46px", height: "46px", borderRadius: "14px", background: "#f7f0e4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon />
                    </div>
                    <div style={{ paddingTop: "6px" }}>
                      <p style={{ fontSize: "15px", color: "#111", lineHeight: 1.4, fontWeight: 600, marginBottom: "4px" }}>
                        {headline}
                      </p>
                      <p style={{ fontSize: "13px", color: "#888", lineHeight: 1.55, fontWeight: 400 }}>
                        {subhead}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Screen 3 — Who are you shopping for? ── */}
            <div style={{ width: "20%", height: "100%", overflowY: "auto", padding: "52px 28px 32px" }}>
              <p style={{ fontSize: "12px", color: "#bbb", marginBottom: "10px", letterSpacing: "0.2px", lineHeight: 1.5 }}>
                Optional — helps Nomi show you the right styles.
              </p>
              <h2 style={{ fontSize: "26px", fontWeight: 700, letterSpacing: "-0.6px", color: "#000", marginBottom: "22px", lineHeight: 1.2 }}>
                Who are you shopping for?
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {GENDER_OPTIONS.map(opt => {
                  const on = gender === opt;
                  return (
                    <button key={opt} onClick={() => setGender(on ? "" : opt)} style={{
                      padding: "16px 18px", borderRadius: "16px", textAlign: "left",
                      border: `1.5px solid ${on ? "#c9a96e" : "#e8e8e8"}`,
                      background: on ? "#f7f0e4" : "#fff",
                      color: on ? "#c9a96e" : "#444",
                      fontSize: "15px", fontWeight: on ? 600 : 500,
                      cursor: "pointer", transition: "all 0.12s",
                    }}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Screen 4 — Make it yours ── */}
            <div style={{ width: "20%", height: "100%", overflowY: "auto", padding: "52px 28px 32px" }}>
              <p style={{ fontSize: "12px", color: "#bbb", marginBottom: "10px", letterSpacing: "0.2px", lineHeight: 1.5 }}>
                Optional — helps Nomi match your taste from day one.
              </p>
              <h2 style={{ fontSize: "26px", fontWeight: 700, letterSpacing: "-0.6px", color: "#000", marginBottom: "6px", lineHeight: 1.2 }}>
                What&apos;s your style?
              </h2>
              <p style={{ fontSize: "13px", color: "#aaa", marginBottom: "18px", lineHeight: 1.5 }}>
                Swipe right if it&apos;s you, left if it&apos;s not
              </p>

              {/* 1 — Swipe style cards */}
              <SwipeStyleCards
                key={gender}
                options={styleOptionsFor(gender)}
                liked={styles}
                onLike={likeStyle}
                onRemove={removeStyle}
              />

              {/* Skip for now */}
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <button
                  onClick={() => { setStyles([]); setScreen(s => s + 1); }}
                  style={{ background: "none", border: "none", fontSize: "13px", color: "#bbb", cursor: "pointer", padding: "4px 8px" }}
                >
                  Skip for now
                </button>
              </div>

              {/* 2 — Free-text description */}
              <FieldLabel>Or describe it yourself</FieldLabel>
              <textarea
                placeholder="e.g. I like oversized fits, earth tones, nothing too revealing"
                value={styleDesc}
                onChange={e => setStyleDesc(e.target.value)}
                rows={3}
                style={{
                  width: "100%", padding: "13px 16px", borderRadius: "14px",
                  border: `1.5px solid ${styleDesc ? "#c9a96e" : "#e8e8e8"}`,
                  fontSize: "14px", color: "#000", background: "#fff",
                  transition: "border-color 0.15s", resize: "none",
                  fontFamily: "inherit", lineHeight: 1.55, marginBottom: "24px", outline: "none",
                }}
              />

              {/* 2.5 — Upload outfits you've worn */}
              <FieldLabel>Upload outfits you&apos;ve worn and loved</FieldLabel>
              <p style={{ fontSize: "12px", color: "#aaa", marginTop: "-6px", marginBottom: "10px", lineHeight: 1.5 }}>
                Optional — up to 5 photos. We learn your style from them; the photos themselves aren&apos;t saved.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "24px" }}>
                {styleUploads.map((src, i) => (
                  <div key={i} style={{ position: "relative", width: "72px", height: "72px", borderRadius: "12px", overflow: "hidden", background: "#f0ede8" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    <button onClick={() => removeStyleUpload(i)} style={{
                      position: "absolute", top: "3px", right: "3px", width: "18px", height: "18px",
                      borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.55)", color: "#fff",
                      fontSize: "11px", lineHeight: "18px", textAlign: "center", cursor: "pointer", padding: 0,
                    }}>
                      ×
                    </button>
                  </div>
                ))}
                {styleUploads.length < 5 && (
                  <label style={{
                    width: "72px", height: "72px", borderRadius: "12px",
                    border: "1.5px dashed #e0dbd4", background: "#faf9f7",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "22px", color: "#c9a96e", cursor: "pointer",
                  }}>
                    +
                    <input
                      type="file" accept="image/*" style={{ display: "none" }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) addStyleUpload(f); e.target.value = ""; }}
                    />
                  </label>
                )}
              </div>

              {/* 3 — Anything you never wear? */}
              <FieldLabel>Anything you never wear?</FieldLabel>
              <p style={{ fontSize: "12px", color: "#aaa", marginTop: "-6px", marginBottom: "10px", lineHeight: 1.5 }}>
                Tell us what to leave out of your recommendations.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
                {neverWearChipsFor(gender).map(chip => {
                  const on = isChipActive(neverWear, chip);
                  return (
                    <button key={chip} onClick={() => toggleNeverWearChip(chip)} style={{
                      padding: "7px 14px", borderRadius: "99px", border: "none",
                      background: on ? "#c9a96e" : "#f0ede8",
                      color: on ? "#fff" : "#6b6b6b",
                      fontSize: "13px", fontWeight: on ? 600 : 400,
                      cursor: "pointer", whiteSpace: "nowrap",
                      transition: "background 0.15s, color 0.15s",
                      fontFamily: "inherit",
                    }}>
                      {chip}
                    </button>
                  );
                })}
              </div>
              <textarea
                placeholder={gender === "Men's" ? "e.g. skinny fit, graphic tees, loud prints..." : "e.g. heels, crop tops, anything sleeveless, loud prints..."}
                value={neverWear}
                onChange={e => setNeverWear(e.target.value)}
                rows={3}
                style={{
                  width: "100%", padding: "13px 16px", borderRadius: "14px",
                  border: `1.5px solid ${neverWear ? "#c9a96e" : "#e8e8e8"}`,
                  fontSize: "14px", color: "#000", background: "#fff",
                  transition: "border-color 0.15s", resize: "none",
                  fontFamily: "inherit", lineHeight: 1.55, marginBottom: "24px", outline: "none",
                }}
              />

              {/* 4 — Budget slider */}
              <FieldLabel>Budget</FieldLabel>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "14px" }}>
                <span style={{ fontSize: "17px", fontWeight: 600, color: "#000", letterSpacing: "-0.3px" }}>
                  ${priceRange[0]}
                </span>
                <span style={{ fontSize: "13px", color: "#aaa", margin: "0 3px" }}>—</span>
                <span style={{ fontSize: "17px", fontWeight: 600, color: "#000", letterSpacing: "-0.3px" }}>
                  {priceRange[1] >= PRICE_MAX ? "$1000+" : `$${priceRange[1]}`}
                </span>
              </div>
              <PriceRangeSlider value={priceRange} onChange={setPriceRange} />
            </div>

            {/* ── Screen 5 — A little more about you ── */}
            <div style={{ width: "20%", height: "100%", overflowY: "auto", padding: "52px 28px 32px" }}>
              <p style={{ fontSize: "12px", color: "#bbb", marginBottom: "10px", letterSpacing: "0.2px", lineHeight: 1.5 }}>
                Optional — skip anything that doesn&apos;t apply.
              </p>
              <h2 style={{ fontSize: "26px", fontWeight: 700, letterSpacing: "-0.6px", color: "#000", marginBottom: "22px", lineHeight: 1.2 }}>
                A little more about you
              </h2>

              {/* 1 — Life stage */}
              <FieldLabel>Where are you right now?</FieldLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
                {LIFE_STAGE_OPTIONS.map(opt => {
                  const on = lifeStage === opt;
                  return (
                    <button key={opt} onClick={() => setLifeStage(on ? "" : opt)} style={{
                      padding: "9px 16px", borderRadius: "20px",
                      border: `1.5px solid ${on ? "#c9a96e" : "#e8e8e8"}`,
                      background: on ? "#f7f0e4" : "#fff",
                      color: on ? "#c9a96e" : "#444",
                      fontSize: "14px", fontWeight: on ? 600 : 500,
                      cursor: "pointer", transition: "all 0.12s",
                    }}>
                      {opt}
                    </button>
                  );
                })}
              </div>
              <FieldLabel>Or write your own</FieldLabel>
              <textarea
                placeholder="e.g. career transition, grad school, freelancing..."
                value={lifeStageDesc}
                onChange={e => setLifeStageDesc(e.target.value)}
                rows={2}
                style={{
                  width: "100%", padding: "13px 16px", borderRadius: "14px",
                  border: `1.5px solid ${lifeStageDesc ? "#c9a96e" : "#e8e8e8"}`,
                  fontSize: "14px", color: "#000", background: "#fff",
                  transition: "border-color 0.15s", resize: "none",
                  fontFamily: "inherit", lineHeight: 1.55, marginBottom: "24px", outline: "none",
                }}
              />

              {/* 2 — Shopping tier */}
              <FieldLabel>How do you usually shop?</FieldLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
                {SHOPPING_TIER_OPTIONS.map(opt => {
                  const on = shoppingTier === opt;
                  return (
                    <button key={opt} onClick={() => setShoppingTier(on ? "" : opt)} style={{
                      padding: "9px 16px", borderRadius: "20px",
                      border: `1.5px solid ${on ? "#c9a96e" : "#e8e8e8"}`,
                      background: on ? "#f7f0e4" : "#fff",
                      color: on ? "#c9a96e" : "#444",
                      fontSize: "14px", fontWeight: on ? 600 : 500,
                      cursor: "pointer", transition: "all 0.12s",
                    }}>
                      {opt}
                    </button>
                  );
                })}
              </div>
              <FieldLabel>Or write your own</FieldLabel>
              <textarea
                placeholder="e.g. mostly thrifted, mix of high and low, investment pieces only..."
                value={shoppingTierDesc}
                onChange={e => setShoppingTierDesc(e.target.value)}
                rows={2}
                style={{
                  width: "100%", padding: "13px 16px", borderRadius: "14px",
                  border: `1.5px solid ${shoppingTierDesc ? "#c9a96e" : "#e8e8e8"}`,
                  fontSize: "14px", color: "#000", background: "#fff",
                  transition: "border-color 0.15s", resize: "none",
                  fontFamily: "inherit", lineHeight: 1.55, marginBottom: "24px", outline: "none",
                }}
              />

              {/* 3 — Style inspirations */}
              <FieldLabel>Style inspirations (optional)</FieldLabel>
              <textarea
                placeholder="e.g. Hailey Bieber, Sofia Richie, @username"
                value={styleInfluencers}
                onChange={e => setStyleInfluencers(e.target.value)}
                rows={2}
                style={{
                  width: "100%", padding: "13px 16px", borderRadius: "14px",
                  border: `1.5px solid ${styleInfluencers ? "#c9a96e" : "#e8e8e8"}`,
                  fontSize: "14px", color: "#000", background: "#fff",
                  transition: "border-color 0.15s", resize: "none",
                  fontFamily: "inherit", lineHeight: 1.55, marginBottom: "24px", outline: "none",
                }}
              />

              {/* 4 — Fit preferences */}
              <FieldLabel>Fits you feel confident in</FieldLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
                {fitChipsFor(gender).map(chip => {
                  const on = isChipActive(fitPreferences, chip);
                  return (
                    <button key={chip} onClick={() => toggleFitChip(chip)} style={{
                      padding: "7px 14px", borderRadius: "99px", border: "none",
                      background: on ? "#c9a96e" : "#f0ede8",
                      color: on ? "#fff" : "#6b6b6b",
                      fontSize: "13px", fontWeight: on ? 600 : 400,
                      cursor: "pointer", whiteSpace: "nowrap",
                      transition: "background 0.15s, color 0.15s",
                      fontFamily: "inherit",
                    }}>
                      {chip}
                    </button>
                  );
                })}
              </div>
              <textarea
                placeholder={gender === "Men's" ? "Any fits you feel most confident in? (e.g. relaxed fit, tailored, slim fit)" : "Any fits you feel most confident in? (e.g. fitted waist, relaxed fit, highlighting shoulders)"}
                value={fitPreferences}
                onChange={e => setFitPreferences(e.target.value)}
                rows={2}
                style={{
                  width: "100%", padding: "13px 16px", borderRadius: "14px",
                  border: `1.5px solid ${fitPreferences ? "#c9a96e" : "#e8e8e8"}`,
                  fontSize: "14px", color: "#000", background: "#fff",
                  transition: "border-color 0.15s", resize: "none",
                  fontFamily: "inherit", lineHeight: 1.55, marginBottom: "24px", outline: "none",
                }}
              />

              {/* 5 — Sizing */}
              <FieldLabel>Your sizes</FieldLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {SIZING_CATEGORIES.map(cat => (
                  <div key={cat}>
                    <p style={{ fontSize: "12px", color: "#888", marginBottom: "6px", fontWeight: 500 }}>{cat}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "6px" }}>
                      {SIZE_OPTIONS[cat].map(opt => {
                        const on = sizing[cat] === opt;
                        return (
                          <button key={opt} onClick={() => setSizing(prev => ({ ...prev, [cat]: on ? "" : opt }))} style={{
                            padding: "6px 13px", borderRadius: "20px",
                            border: `1.5px solid ${on ? "#c9a96e" : "#e8e8e8"}`,
                            background: on ? "#f7f0e4" : "#fff",
                            color: on ? "#c9a96e" : "#444",
                            fontSize: "13px", fontWeight: on ? 600 : 500,
                            cursor: "pointer", transition: "all 0.12s",
                          }}>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    <input
                      type="text"
                      placeholder="Or type your own (e.g. 32x30, EU 38)"
                      value={sizing[cat] ?? ""}
                      onChange={e => setSizing(prev => ({ ...prev, [cat]: e.target.value }))}
                      style={{
                        width: "100%", padding: "9px 14px", borderRadius: "12px",
                        border: `1.5px solid ${sizing[cat] ? "#c9a96e" : "#e8e8e8"}`,
                        fontSize: "13px", color: "#000", background: "#fff",
                        transition: "border-color 0.15s", fontFamily: "inherit",
                        outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ── Bottom controls ── */}
        <div style={{ padding: "12px 28px 44px", flexShrink: 0 }}>
          {/* Progress dots */}
          <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginBottom: "18px" }}>
            {Array.from({ length: TOTAL_SCREENS }, (_, i) => i).map(i => (
              <div key={i} style={{
                width: i === screen ? "22px" : "6px",
                height: "6px", borderRadius: "99px",
                background: i === screen ? "#c9a96e" : "#e0dbd4",
                transition: "width 0.25s, background 0.25s",
              }} />
            ))}
          </div>

          {/* Skip link */}
          {screen < 2 && (
            <div style={{ textAlign: "center", marginBottom: "8px" }}>
              <button
                onClick={finish}
                style={{ background: "none", border: "none", fontSize: "14px", color: "#bbb", cursor: "pointer", padding: "4px 12px" }}
              >
                Skip
              </button>
            </div>
          )}

          {/* Primary button */}
          <button
            onClick={() => screen < TOTAL_SCREENS - 1 ? setScreen(s => s + 1) : finish()}
            disabled={analyzingStyle}
            style={{
              width: "100%", padding: "16px", borderRadius: "16px", border: "none",
              background: "#c9a96e", color: "#fff", opacity: analyzingStyle ? 0.7 : 1,
              fontSize: "15px", fontWeight: 600, cursor: analyzingStyle ? "default" : "pointer", letterSpacing: "-0.1px",
            }}
          >
            {primaryLabel}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── Shared small components ─────────────────────────────────────────────────

// Tinder-style one-card-at-a-time style picker. Swipe right (or tap ♥) to
// like, swipe left (or tap ✕) to skip. After the last card, shows a recap
// of everything liked with tap-to-remove — no mid-swipe undo, so swiping
// stays fast, but nothing liked by accident is stuck.
function SwipeStyleCards({
  options, liked, onLike, onRemove,
}: {
  options: StyleOption[];
  liked: string[];
  onLike: (key: string) => void;
  onRemove: (key: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exitDir, setExitDir] = useState<"left" | "right" | null>(null);
  const startXRef = useRef(0);

  const current = options[index];
  const done = index >= options.length;
  const likedHere = liked.filter(key => options.some(o => o.key === key));

  function commit(dir: "left" | "right") {
    if (exitDir || !current) return;
    setExitDir(dir);
    setDragging(false);
    if (dir === "right") onLike(current.key);
    setTimeout(() => {
      setIndex(i => i + 1);
      setDragX(0);
      setExitDir(null);
    }, 200);
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (exitDir) return;
    setDragging(true);
    startXRef.current = e.clientX;
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging || exitDir) return;
    setDragX(e.clientX - startXRef.current);
  }
  function endDrag() {
    if (!dragging) return;
    setDragging(false);
    if (dragX > 90) commit("right");
    else if (dragX < -90) commit("left");
    else setDragX(0);
  }

  if (done) {
    return (
      <div style={{ marginBottom: "12px" }}>
        <p style={{ fontSize: "13px", fontWeight: 600, color: "#000", marginBottom: "2px" }}>
          {likedHere.length > 0 ? `You liked ${likedHere.length} style${likedHere.length === 1 ? "" : "s"}` : "No styles liked"}
        </p>
        {likedHere.length > 0 && (
          <p style={{ fontSize: "12px", color: "#aaa", marginBottom: "10px" }}>Tap one to remove it</p>
        )}
        {likedHere.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
            {likedHere.map(key => {
              const opt = options.find(o => o.key === key);
              if (!opt) return null;
              return (
                <button
                  key={key}
                  onClick={() => onRemove(key)}
                  style={{ width: "68px", border: "none", background: "none", padding: 0, cursor: "pointer", textAlign: "center" }}
                >
                  <div style={{ position: "relative", width: "68px", height: "68px", borderRadius: "10px", overflow: "hidden", background: "#f7f6f3" }}>
                    <StyleTileImage src={opt.image} label={opt.label} />
                    <div style={{
                      position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ color: "#fff", fontSize: "18px", lineHeight: 1 }}>&times;</span>
                    </div>
                  </div>
                  <p style={{ fontSize: "10px", color: "#888", marginTop: "3px" }}>{opt.label}</p>
                </button>
              );
            })}
          </div>
        )}
        <button
          onClick={() => setIndex(0)}
          style={{
            background: "none", border: "1.5px solid #e0dbd4", borderRadius: "99px",
            padding: "7px 16px", fontSize: "12px", color: "#c9a96e", cursor: "pointer", fontFamily: "inherit",
          }}
        >
          Swipe again
        </button>
      </div>
    );
  }

  const rotation = dragX / 18;
  const likeOpacity = Math.min(Math.max(dragX / 90, 0), 1);
  const skipOpacity = Math.min(Math.max(-dragX / 90, 0), 1);
  const transform = exitDir
    ? `translateX(${exitDir === "right" ? 500 : -500}px) rotate(${exitDir === "right" ? 22 : -22}deg)`
    : `translateX(${dragX}px) rotate(${rotation}deg)`;

  return (
    <div style={{ marginBottom: "12px" }}>
      <p style={{ fontSize: "12px", color: "#bbb", textAlign: "center", marginBottom: "8px" }}>
        {index + 1} of {options.length}
      </p>
      <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 4", marginBottom: "14px" }}>
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          style={{
            position: "absolute", inset: 0, borderRadius: "16px", overflow: "hidden",
            background: "#f7f6f3", cursor: dragging ? "grabbing" : "grab", touchAction: "pan-y",
            transform, transition: dragging ? "none" : "transform 0.22s ease", userSelect: "none",
          }}
        >
          <StyleTileImage src={current.image} label={current.label} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 42%)" }} />
          <p style={{ position: "absolute", bottom: "14px", left: "16px", right: "16px", color: "#fff", fontSize: "17px", fontWeight: 700 }}>
            {current.label}
          </p>
          <div style={{
            position: "absolute", top: "18px", left: "18px", padding: "5px 12px",
            border: "3px solid #c9a96e", borderRadius: "8px", color: "#c9a96e",
            fontSize: "14px", fontWeight: 700, letterSpacing: "1px", transform: "rotate(-12deg)",
            opacity: likeOpacity, background: "rgba(255,255,255,0.85)",
          }}>
            LIKE
          </div>
          <div style={{
            position: "absolute", top: "18px", right: "18px", padding: "5px 12px",
            border: "3px solid #999", borderRadius: "8px", color: "#999",
            fontSize: "14px", fontWeight: 700, letterSpacing: "1px", transform: "rotate(12deg)",
            opacity: skipOpacity, background: "rgba(255,255,255,0.85)",
          }}>
            SKIP
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: "20px" }}>
        <button
          onClick={() => commit("left")}
          aria-label="Skip"
          style={{
            width: "48px", height: "48px", borderRadius: "50%", border: "1.5px solid #e0dbd4",
            background: "#fff", cursor: "pointer", fontSize: "18px", color: "#999",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          &times;
        </button>
        <button
          onClick={() => commit("right")}
          aria-label="Like"
          style={{
            width: "48px", height: "48px", borderRadius: "50%", border: "none",
            background: "#c9a96e", cursor: "pointer", fontSize: "18px", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          &hearts;
        </button>
      </div>
    </div>
  );
}

// Falls back to a plain label tile instead of a broken-image icon when a
// gender-specific style photo (mens/*.png, kids/*.png) hasn't been added yet.
function StyleTileImage({ src, label }: { src: string; label: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "8px", textAlign: "center" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#999" }}>{label}</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={label} onError={() => setFailed(true)} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: "11px", fontWeight: 600, color: "#bbb", letterSpacing: "0.6px", textTransform: "uppercase", marginBottom: "10px" }}>
      {children}
    </p>
  );
}

// ─── Price range slider ───────────────────────────────────────────────────────

function PriceRangeSlider({ value, onChange }: {
  value: [number, number];
  onChange: (v: [number, number]) => void;
}) {
  const [lo, hi] = value;
  const loPct = (lo / PRICE_MAX) * 100;
  const hiPct = (hi / PRICE_MAX) * 100;

  return (
    <div style={{ position: "relative", height: "28px", display: "flex", alignItems: "center" }}>
      {/* Track background */}
      <div style={{ position: "absolute", left: 0, right: 0, height: "4px", borderRadius: "2px", background: "#ebebeb", pointerEvents: "none" }}>
        {/* Gold fill between handles */}
        <div style={{
          position: "absolute",
          left: `${loPct}%`, width: `${hiPct - loPct}%`,
          height: "100%", background: "#c9a96e", borderRadius: "2px",
        }} />
      </div>
      {/* Lo thumb */}
      <input
        type="range" min={0} max={PRICE_MAX} step={5} value={lo}
        className="nomi-range"
        style={{ zIndex: lo >= PRICE_MAX - 20 ? 5 : 3 }}
        onChange={e => onChange([Math.min(Number(e.target.value), hi - 20), hi])}
      />
      {/* Hi thumb */}
      <input
        type="range" min={0} max={PRICE_MAX} step={5} value={hi}
        className="nomi-range"
        style={{ zIndex: 4 }}
        onChange={e => onChange([lo, Math.max(Number(e.target.value), lo + 20)])}
      />
    </div>
  );
}

// ─── Phone illustration ───────────────────────────────────────────────────────

function PhoneIllustration() {
  return (
    <svg width="180" height="252" viewBox="0 0 180 252" fill="none" style={{ display: "block" }}>
      {/* Phone shadow */}
      <rect x="42" y="12" width="96" height="170" rx="20" fill="#f0ede8" />
      {/* Phone body */}
      <rect x="38" y="8" width="96" height="170" rx="20" fill="#fff" stroke="#e0dbd4" strokeWidth="1.5" />
      {/* Screen area */}
      <rect x="48" y="26" width="76" height="136" rx="8" fill="#faf9f7" />
      {/* Camera pill */}
      <rect x="72" y="14" width="28" height="6" rx="3" fill="#e8e4dd" />
      {/* Home bar */}
      <rect x="72" y="167" width="28" height="3" rx="1.5" fill="#e8e4dd" />

      {/* Clothing item — shirt */}
      <g transform="translate(86, 56)">
        {/* Hanger hook */}
        <path d="M0 -16 C0 -19 3 -21 3 -18" stroke="#c9a96e" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <line x1="0" y1="-16" x2="0" y2="-10" stroke="#c9a96e" strokeWidth="1.4" strokeLinecap="round" />
        {/* Hanger bar */}
        <path d="M-22 0 C-18 -8 -8 -10 0 -10 C8 -10 18 -8 22 0" stroke="#c9a96e" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        {/* Shirt body */}
        <path d="M-22 0 L-30 12 L-20 14 L-20 46 L20 46 L20 14 L30 12 L22 0 Z" fill="#f7f0e4" stroke="#c9a96e" strokeWidth="1.2" strokeLinejoin="round" />
      </g>

      {/* Divider line inside screen */}
      <line x1="56" y1="124" x2="124" y2="124" stroke="#ede9e4" strokeWidth="1" />

      {/* Shimmer lines — match preview inside screen */}
      <rect x="56" y="130" width="50" height="6" rx="3" fill="#e8e4dd" />
      <rect x="56" y="142" width="38" height="6" rx="3" fill="#ede9e4" />
      <rect x="56" y="154" width="46" height="6" rx="3" fill="#ede9e4" />
      <rect x="100" y="130" width="16" height="6" rx="3" fill="#c9a96e" opacity="0.4" />

      {/* Arrow down from phone */}
      <path d="M86 184 L86 196" stroke="#c9a96e" strokeWidth="2" strokeLinecap="round" />
      <path d="M80 191 L86 198 L92 191" stroke="#c9a96e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Match cards below */}
      {/* Card 1 */}
      <rect x="4"  y="202" width="172" height="15" rx="7.5" fill="#f7f0e4" />
      <rect x="12" y="206" width="36" height="7"  rx="3.5" fill="#c9a96e" opacity="0.5" />
      <rect x="54" y="206" width="84" height="7"  rx="3.5" fill="#e8e4dd" />
      {/* Card 2 */}
      <rect x="14" y="221" width="152" height="14" rx="7" fill="#f7f6f3" stroke="#ede9e4" strokeWidth="1" />
      <rect x="22" y="225" width="30" height="6"  rx="3"   fill="#c9a96e" opacity="0.3" />
      <rect x="58" y="225" width="72" height="6"  rx="3"   fill="#e8e4dd" />
      {/* Card 3 */}
      <rect x="24" y="239" width="132" height="13" rx="6.5" fill="#f7f6f3" stroke="#ede9e4" strokeWidth="1" />
      <rect x="32" y="243" width="26" height="5"  rx="2.5" fill="#c9a96e" opacity="0.2" />
      <rect x="64" y="243" width="64" height="5"  rx="2.5" fill="#e8e4dd" />
    </svg>
  );
}

// ─── Step icons ───────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="8.5" cy="8.5" r="5" stroke="#c9a96e" strokeWidth="1.6" />
      <path d="M12.5 12.5L16 16" stroke="#c9a96e" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6.5 8.5h4M8.5 6.5v4" stroke="#c9a96e" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v9a1 1 0 01-1 1H7l-4 3V4z" stroke="#c9a96e" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7 8h6M7 11h4" stroke="#c9a96e" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 13V4M10 4L7 7M10 4l3 3" stroke="#c9a96e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 14v1a2 2 0 002 2h10a2 2 0 002-2v-1" stroke="#c9a96e" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 2.5l1.8 5.2 5.2 1.3-5.2 1.3L10 15.5l-1.8-5.2-5.2-1.3 5.2-1.3L10 2.5z" stroke="#c9a96e" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="15.5" cy="4.5" r="1" fill="#c9a96e" />
      <circle cx="4.5"  cy="15" r="1" fill="#c9a96e" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M5 3h10a1 1 0 011 1v13l-6-3.5L4 17V4a1 1 0 011-1z" stroke="#c9a96e" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
