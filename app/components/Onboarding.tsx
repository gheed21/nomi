"use client";

import { useState } from "react";

// ─── Types / constants ────────────────────────────────────────────────────────

type Props = { onComplete: () => void };

const STYLE_OPTIONS = [
  { key: "minimal",    label: "Clean & minimal", image: "/styles/minimal.png"    },
  { key: "streetwear", label: "Streetwear",       image: "/styles/streetwear.png" },
  { key: "romantic",   label: "Soft & romantic",  image: "/styles/romantic.png"   },
  { key: "classic",    label: "Timeless classic", image: "/styles/classic.png"    },
  { key: "edgy",       label: "Edgy",             image: "/styles/edgy.png"       },
  { key: "boho",       label: "Boho",             image: "/styles/boho.png"       },
  { key: "oldmoney",   label: "Old money",        image: "/styles/oldmoney.png"   },
  { key: "coastal",    label: "Coastal",          image: "/styles/coastal.png"    },
];

const GENDER_OPTIONS = ["Women's", "Men's", "Kids", "All"];

const PRICE_MAX = 1000;

const LIFE_STAGE_OPTIONS  = ["Student", "Early career", "Established", "Prefer not to say"];
const SHOPPING_TIER_OPTIONS = ["Mostly mid-market", "Occasional luxury splurges", "Primarily luxury"];
const SIZING_CATEGORIES   = ["Tops", "Bottoms", "Dresses", "Jumpsuits", "Shoes", "Outerwear"];

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

  function toggleStyle(s: string) {
    setStyles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  function finish() {
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
    localStorage.setItem("nomi_taste_profile", JSON.stringify(profile));
    const existing = JSON.parse(localStorage.getItem("nomi_current_filters") ?? "{}");
    localStorage.setItem("nomi_current_filters", JSON.stringify({ ...existing, priceRange }));
    localStorage.setItem("nomi-onboarded", "true");
    onComplete();
  }

  const primaryLabel = screen === 0 ? "Get started" : screen < 3 ? "Next" : "Start styling";

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
            width: "400%",
            height: "100%",
            transform: `translateX(${-screen * 25}%)`,
            transition: "transform 0.38s cubic-bezier(0.4, 0, 0.2, 1)",
          }}>

            {/* ── Screen 1 — What Nomi does ── */}
            <div style={{ width: "25%", height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", padding: "52px 28px 16px" }}>
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
            <div style={{ width: "25%", height: "100%", overflowY: "auto", padding: "60px 28px 120px" }}>
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

            {/* ── Screen 3 — Make it yours ── */}
            <div style={{ width: "25%", height: "100%", overflowY: "auto", padding: "52px 28px 32px" }}>
              <p style={{ fontSize: "12px", color: "#bbb", marginBottom: "10px", letterSpacing: "0.2px", lineHeight: 1.5 }}>
                Optional — helps Nomi match your taste from day one.
              </p>
              <h2 style={{ fontSize: "26px", fontWeight: 700, letterSpacing: "-0.6px", color: "#000", marginBottom: "22px", lineHeight: 1.2 }}>
                What&apos;s your style?
              </h2>

              {/* 1 — Style image grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                {STYLE_OPTIONS.map(({ key, image, label }) => {
                  const on = styles.includes(key);
                  return (
                    <button key={key} onClick={() => toggleStyle(key)} style={{
                      position: "relative", aspectRatio: "1", borderRadius: "12px",
                      border: `${on ? "2.5px" : "0.5px"} solid ${on ? "#c9a96e" : "var(--border)"}`,
                      padding: 0, overflow: "hidden", cursor: "pointer", background: "#f7f6f3",
                      transition: "border-color 0.12s",
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      {on && (
                        <div style={{
                          position: "absolute", top: "6px", right: "6px",
                          width: "20px", height: "20px", borderRadius: "50%",
                          background: "#c9a96e", display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                            <path d="M2 5.5l2.5 2.5L9 3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

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

              {/* 3 — Who are you shopping for? */}
              <FieldLabel>Who are you shopping for?</FieldLabel>
              <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
                {GENDER_OPTIONS.map(opt => {
                  const on = gender === opt;
                  return (
                    <button key={opt} onClick={() => setGender(on ? "" : opt)} style={{
                      padding: "9px 18px", borderRadius: "20px",
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

              {/* 4 — Anything you never wear? */}
              <FieldLabel>Anything you never wear?</FieldLabel>
              <textarea
                placeholder="e.g. heels, crop tops, anything sleeveless, loud prints..."
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

              {/* 5 — Budget slider */}
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

            {/* ── Screen 4 — A little more about you ── */}
            <div style={{ width: "25%", height: "100%", overflowY: "auto", padding: "52px 28px 32px" }}>
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
              <textarea
                placeholder="Any fits you feel most confident in? (e.g. fitted waist, relaxed fit, highlighting shoulders)"
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {SIZING_CATEGORIES.map(cat => (
                  <div key={cat}>
                    <p style={{ fontSize: "12px", color: "#888", marginBottom: "5px", fontWeight: 500 }}>{cat}</p>
                    <input
                      type="text"
                      placeholder={cat === "Shoes" ? "e.g. 9" : "e.g. M"}
                      value={sizing[cat] ?? ""}
                      onChange={e => setSizing(prev => ({ ...prev, [cat]: e.target.value }))}
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: "12px",
                        border: `1.5px solid ${sizing[cat] ? "#c9a96e" : "#e8e8e8"}`,
                        fontSize: "14px", color: "#000", background: "#fff",
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
            {[0, 1, 2, 3].map(i => (
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
            onClick={() => screen < 3 ? setScreen(s => s + 1) : finish()}
            style={{
              width: "100%", padding: "16px", borderRadius: "16px", border: "none",
              background: "#c9a96e", color: "#fff",
              fontSize: "15px", fontWeight: 600, cursor: "pointer", letterSpacing: "-0.1px",
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
