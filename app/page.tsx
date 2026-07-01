"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import NomiNav from "./components/NomiNav";
import Onboarding from "./components/Onboarding";

// ─── Types ────────────────────────────────────────────────────────────────────

type RecStyle = "specific" | "direction";

export type Filters = {
  colors:              string[];
  customColor:         string;
  priceRange:          [number, number];
  sortOrder:           "low-high" | "high-low";
  itemCategories:      string[];
  itemSubcategories:   string[];
  secondhandOnly:      boolean;
  recommendationStyle: RecStyle;
  description:         string;
  gender:              string;   // "Women's" | "Men's" | "Kids" | "Unisex" | ""
};

const PRICE_MAX = 1000;

const DEFAULT_FILTERS: Filters = {
  colors:              [],
  customColor:         "",
  priceRange:          [0, PRICE_MAX],
  sortOrder:           "low-high",
  itemCategories:      [],
  itemSubcategories:   [],
  secondhandOnly:      false,
  recommendationStyle: "specific",
  description:         "",
  gender:              "",
};

const GENDER_OPTIONS = ["Women's", "Men's", "Kids", "Unisex"] as const;

const SUBCATEGORIES: Record<string, string[]> = {
  Tops:       ["Tank top", "Sleeveless top", "Short sleeve top", "Long sleeve top", "Blouse", "Button-down", "Sweatshirt", "Hoodie", "Crop top", "Bodysuit", "Corset"],
  Bottoms:    ["Jeans", "Straight leg jeans", "Wide leg jeans", "Cargo trousers", "Tailored trousers", "Shorts", "Mini skirt", "Midi skirt", "Maxi skirt", "Leggings"],
  Dresses:    ["Mini dress", "Midi dress", "Maxi dress", "Slip dress", "Wrap dress", "Bodycon dress", "Shirt dress", "Sweater dress", "Halter dress", "Off-the-shoulder dress", "A-line dress"],
  Jumpsuits:  ["Jumpsuit", "Romper", "Wide leg jumpsuit", "Skinny jumpsuit", "Strapless jumpsuit", "Halter jumpsuit", "Utility jumpsuit", "Culotte jumpsuit"],
  Shoes:      ["Heels", "Block heels", "Mules", "Sneakers", "Loafers", "Boots", "Ankle boots", "Sandals", "Flip flops", "Flats", "Platform shoes"],
  Bags:       ["Tote", "Crossbody", "Clutch", "Shoulder bag", "Mini bag", "Backpack"],
  Outerwear:  ["Blazer", "Leather jacket", "Denim jacket", "Coat", "Trench coat", "Puffer", "Cardigan"],
  Accessories:["Belt", "Hat", "Scarf", "Sunglasses", "Jewelry"],
};
const CATEGORIES = Object.keys(SUBCATEGORIES);

const SWATCHES = [
  { name: "White",     hex: "#FFFFFF" },
  { name: "Cream",     hex: "#FFF8E7" },
  { name: "Black",     hex: "#111111" },
  { name: "Grey",      hex: "#9E9E9E" },
  { name: "Navy",      hex: "#1A237E" },
  { name: "Brown",     hex: "#6D4C41" },
  { name: "Camel",     hex: "#C8A96E" },
  { name: "Tan",       hex: "#D4A76A" },
  { name: "Burgundy",  hex: "#7B1C2A" },
  { name: "Forest",    hex: "#2E7D32" },
  { name: "Olive",     hex: "#827717" },
  { name: "Sage",      hex: "#8A9A73" },
  { name: "Pink",      hex: "#F48FB1" },
  { name: "Blush",     hex: "#FFCDD2" },
  { name: "Red",       hex: "#C62828" },
  { name: "Orange",    hex: "#E64A19" },
  { name: "Yellow",    hex: "#F9A825" },
  { name: "Cobalt",    hex: "#1565C0" },
  { name: "Lavender",  hex: "#CE93D8" },
  { name: "Purple",    hex: "#6A1B9A" },
];

function isLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 140;
}

type Analysis    = { color: string; category: string; aesthetic: string };
type Match       = { name: string; store?: string; price?: string; reason: string; searchUrl?: string; direction?: string };
type Result      = { analysis: Analysis; matches: Match[] };
type RecentSearch = { id: string; image: string; result: Result; searchedAt: number; saved: boolean };

function activeCount(f: Filters, mode: "complete" | "similar", scope: "same" | "any"): number {
  const colors     = ((f.colors?.length ?? 0) > 0 || (f.customColor?.trim().length ?? 0) > 0) ? 1 : 0;
  const budget     = ((f.priceRange?.[0] ?? 0) > 0 || (f.priceRange?.[1] ?? PRICE_MAX) < PRICE_MAX) ? 1 : 0;
  const secondhand = f.secondhandOnly ? 1 : 0;
  const gender     = (f.gender?.trim().length ?? 0) > 0 ? 1 : 0;
  if (mode === "similar") {
    return colors + budget + secondhand + gender
      + (scope !== "same" ? 1 : 0)
      + (scope === "any" && (f.itemCategories?.length ?? 0) > 0 ? 1 : 0)
      + ((f.description?.trim().length ?? 0) > 0 ? 1 : 0);
  }
  return colors + budget + secondhand + gender
    + ((f.itemCategories?.length ?? 0) > 0 ? 1 : 0)
    + (f.recommendationStyle !== "specific" ? 1 : 0)
    + ((f.description?.trim().length ?? 0) > 0 ? 1 : 0);
}

// Migrates persisted filter objects from old shape → current shape.
// Handles the itemCategory (string) → itemCategories (string[]) rename.
function normalizeFilters(raw: Partial<Filters> & { itemCategory?: string }): Filters {
  const base: Filters = { ...DEFAULT_FILTERS, ...raw };
  if (!Array.isArray(base.itemCategories)) {
    // old single-select string field → wrap in array (or empty if blank)
    const legacy = (raw as { itemCategory?: string }).itemCategory ?? "";
    base.itemCategories = legacy ? [legacy] : [];
  }
  return base;
}

function timeAgo(ts: number): string {
  const d = Date.now() - ts, m = Math.floor(d / 60000);
  if (m < 2)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo,           setPhoto]           = useState<string | null>(null);
  const [url,             setUrl]             = useState("");
  const [dragOver,        setDragOver]        = useState(false);
  const [recentSearches,  setRecentSearches]  = useState<RecentSearch[]>([]);
  const [filters,         setFilters]         = useState<Filters>(DEFAULT_FILTERS);
  const [filtersOpen,     setFiltersOpen]     = useState(false);
  const [showOnboarding,  setShowOnboarding]  = useState(false);

  const [urlLoading,       setUrlLoading]       = useState(false);
  const [scrapeError,      setScrapeError]      = useState(false);
  const [scrapeBlocked,    setScrapeBlocked]    = useState(false);
  const [hasRestoredState, setHasRestoredState] = useState(false);
  const [confirmReset,     setConfirmReset]     = useState(false);
  const [mode,        setMode]        = useState<"complete" | "similar">("complete");
  const [scope,       setScope]       = useState<"same" | "any">("same");
  // Gates the save effect — prevents overwriting sessionStorage with pre-restore defaults
  const [sessionRestored, setSessionRestored] = useState(false);

  const hasInput = !!photo || url.trim().length > 0;
  const count    = activeCount(filters, mode, scope);

  // Restore on every mount from sessionStorage (survives tab-switches within a session;
  // cleared on tab close so fresh opens start blank).
  useEffect(() => {
    if (!localStorage.getItem("nomi-onboarded")) setShowOnboarding(true);
    setRecentSearches(JSON.parse(localStorage.getItem("nomi_recent_searches") ?? "[]"));

    try {
      const raw = sessionStorage.getItem("nomi_home_state");
      const s = raw ? JSON.parse(raw) : null;
      if (s) {
        if (s.inputType === "photo") {
          const img = localStorage.getItem("nomi_current_upload");
          if (img) setPhoto(img);
        } else if (s.url) {
          setUrl(s.url);
        }
        if (s.mode)        setMode(s.mode);
        if (s.scope)       setScope(s.scope);
        if (s.filters)     setFilters(normalizeFilters(s.filters));
        if (s.filtersOpen) setFiltersOpen(true);
        setHasRestoredState(true);
      }
    } catch { /* ignore */ }

    // Mark restoration complete — React 18 batches all setState calls above into one
    // re-render, so the save effect below sees the restored values on its first run.
    setSessionRestored(true);
  }, []);

  // Persist home state to sessionStorage on every change so tab-switching doesn't lose it.
  // Gated on sessionRestored to avoid saving pre-restore defaults on the initial mount.
  useEffect(() => {
    if (!sessionRestored) return;
    sessionStorage.setItem("nomi_home_state", JSON.stringify({
      inputType: photo ? "photo" : url ? "url" : null,
      url:       url || undefined,
      mode, scope, filters, filtersOpen,
    }));
  }, [sessionRestored, photo, url, mode, scope, filters, filtersOpen]);

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setPhoto(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleFindMatches() {
    console.log("[nomi] Find matches clicked — mode:", mode, "scope:", scope);
    console.log("[nomi] filters at click time — itemCategories:", filters.itemCategories, "itemSubcategories:", filters.itemSubcategories);
    console.log("[nomi] description at submit time:", JSON.stringify(filters.description));
    if (photo) {
      localStorage.removeItem("nomi_scraped_product");
      localStorage.setItem("nomi_current_upload", photo);
      localStorage.setItem("nomi_current_filters", JSON.stringify(filters));
      localStorage.setItem("nomi_current_mode", mode);
      localStorage.setItem("nomi_current_scope", scope);
      localStorage.setItem("nomi_home_return_state", JSON.stringify({ inputType: "photo", mode, scope, filters, filtersOpen }));
      console.log("[nomi] wrote to localStorage nomi_current_mode:", mode, "nomi_current_scope:", scope);
      router.push("/results");
    } else if (url.trim()) {
      setUrlLoading(true);
      setScrapeError(false);
      setScrapeBlocked(false);
      try {
        const res  = await fetch("/api/scrape-product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim() }),
        });
        const data = await res.json();
        if (!data.success) {
          if (data.blocked) setScrapeBlocked(true);
          else setScrapeError(true);
          return;
        }
        // Pre-fill gender filter from detected department so subsequent calls stay consistent.
        // Also ensure productType is persisted here — it was previously dropped.
        const filtersWithGender = data.detectedGender
          ? { ...filters, gender: data.detectedGender }
          : filters;
        if (data.detectedGender) setFilters(f => ({ ...f, gender: data.detectedGender }));
        localStorage.setItem("nomi_current_upload",   data.image);
        localStorage.setItem("nomi_current_filters",  JSON.stringify(filtersWithGender));
        localStorage.setItem("nomi_current_mode",     mode);
        localStorage.setItem("nomi_current_scope",    scope);
        localStorage.setItem("nomi_scraped_product",  JSON.stringify({
          name: data.name, price: data.price, store: data.store,
          productType:    data.productType    ?? undefined,
          detectedGender: data.detectedGender ?? undefined,
        }));
        localStorage.setItem("nomi_home_return_state", JSON.stringify({ inputType: "url", url: url.trim(), mode, scope, filters: filtersWithGender, filtersOpen }));
        router.push("/results");
      } catch {
        setScrapeError(true);
      } finally {
        setUrlLoading(false);
      }
    }
  }

  function openSearch(s: RecentSearch) {
    localStorage.setItem("nomi_current_upload", s.image);
    localStorage.setItem("nomi_current_result", JSON.stringify(s));
    router.push("/results");
  }

  function toggleColor(name: string) {
    setFilters(f => ({
      ...f,
      colors: f.colors.includes(name)
        ? f.colors.filter(c => c !== name)
        : [...f.colors, name],
    }));
  }

  function toggleCategory(cat: string) {
    setFilters(f => {
      const removing = f.itemCategories.includes(cat);
      return {
        ...f,
        itemCategories:    removing ? f.itemCategories.filter(c => c !== cat) : [...f.itemCategories, cat],
        itemSubcategories: removing ? f.itemSubcategories.filter(s => !SUBCATEGORIES[cat].includes(s)) : f.itemSubcategories,
      };
    });
  }

  function toggleSubcategory(sub: string) {
    setFilters(f => ({
      ...f,
      itemSubcategories: f.itemSubcategories.includes(sub)
        ? f.itemSubcategories.filter(s => s !== sub)
        : [...f.itemSubcategories, sub],
    }));
  }

  return (
    <>
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 20px 80px" }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>

        {/* Wordmark */}
        <header style={{ textAlign: "center", padding: "56px 0 44px" }}>
          <p style={{ fontSize: "38px", fontWeight: 500, letterSpacing: "-1.5px", color: "#c9a96e", lineHeight: 1 }}>nomi</p>
          <p style={{ fontSize: "14px", color: "#6b6b6b", marginTop: "10px", letterSpacing: "-0.1px" }}>
            Find matching pieces from any store
          </p>
          {hasRestoredState && (
            <button onClick={() => setConfirmReset(true)} style={{ marginTop: "12px", background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "#bbb", textDecoration: "underline", textUnderlineOffset: "2px", padding: 0 }}>
              Start over
            </button>
          )}
        </header>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

          {/* Upload */}
          <button
            onClick={() => { if (!photo) fileRef.current?.click(); }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            style={{
              width: "100%", height: photo ? "auto" : "196px",
              minHeight: photo ? "160px" : undefined,
              borderRadius: "16px",
              border: `1.5px dashed ${dragOver || scrapeError ? "#c9a96e" : photo ? "#c9a96e" : "#d8d8d8"}`,
              background: dragOver || scrapeError ? "#f7f0e4" : photo ? "#f7f6f3" : "#fafafa",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: "12px", cursor: photo ? "default" : "pointer",
              transition: "border-color 0.15s, background 0.15s",
              padding: 0, overflow: "hidden",
            }}
          >
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="Uploaded piece" style={{ width: "100%", maxHeight: "300px", objectFit: "cover", display: "block" }} />
            ) : (
              <>
                <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "#f0ede8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CameraIcon />
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "15px", fontWeight: 500, color: "#000", letterSpacing: "-0.2px" }}>Upload a photo of any piece</p>
                  <p style={{ fontSize: "12px", color: "#aaa", marginTop: "4px" }}>JPG, PNG or HEIC · tap or drag</p>
                </div>
              </>
            )}
          </button>

          {photo && (
            <button onClick={() => setPhoto(null)} style={{ alignSelf: "flex-start", fontSize: "12px", color: "#aaa", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline", textUnderlineOffset: "2px" }}>
              Remove photo
            </button>
          )}

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "2px 0" }}>
            <div style={{ flex: 1, height: "1px", background: "#ebebeb" }} />
            <span style={{ fontSize: "12px", color: "#bbb" }}>or</span>
            <div style={{ flex: 1, height: "1px", background: "#ebebeb" }} />
          </div>

          {/* URL */}
          <div>
            <input type="url" placeholder="Paste a product link" value={url}
              onChange={(e) => { setUrl(e.target.value); setScrapeError(false); setScrapeBlocked(false); }}
              style={{ width: "100%", padding: "15px 16px", borderRadius: "16px", border: `1.5px solid ${scrapeError || scrapeBlocked ? "#c9a96e" : url ? "#000" : "#e8e8e8"}`, fontSize: "15px", color: "#000", background: "#fff", transition: "border-color 0.15s" }} />
            {(scrapeBlocked || scrapeError) && (
              <p style={{ fontSize: "13px", color: "#b8966a", marginTop: "8px", lineHeight: 1.5 }}>
                Link reading is temporarily limited — uploading a photo works perfectly and gives even better results.
              </p>
            )}
          </div>

          {/* Mode selector */}
          <div style={{ display: "flex", gap: "10px" }}>
            {([
              { key: "complete" as const, label: "Complete the outfit", sub: "Find pieces that pair with this",         icon: <OutfitIcon selected={mode === "complete"} /> },
              { key: "similar"  as const, label: "Find similar styles",  sub: "Find more like this, from other stores", icon: <SimilarIcon selected={mode === "similar"} /> },
            ]).map(({ key, label, sub, icon }) => {
              const on = mode === key;
              return (
                <button key={key} onClick={() => setMode(key)} style={{
                  flex: 1, background: "#f7f6f3", cursor: "pointer", textAlign: "left",
                  border: `${on ? "2px" : "1.5px"} solid ${on ? "#c9a96e" : "#e8e8e8"}`,
                  borderRadius: "16px", padding: "16px 14px",
                  transition: "border-color 0.15s",
                }}>
                  <div>{icon}</div>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: on ? "#c9a96e" : "#000", marginTop: "10px", letterSpacing: "-0.1px", lineHeight: 1.3 }}>{label}</p>
                  <p style={{ fontSize: "11px", color: "#aaa", marginTop: "5px", lineHeight: 1.4 }}>{sub}</p>
                </button>
              );
            })}
          </div>

          {/* ── Filters ────────────────────────────────────────────────────── */}
          <div>
            <button
              onClick={() => setFiltersOpen(o => !o)}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "8px 14px", borderRadius: "99px",
                border: `1.5px solid ${count > 0 ? "#c9a96e" : "#e8e8e8"}`,
                background: count > 0 ? "#f7f0e4" : "#fff",
                color: count > 0 ? "#c9a96e" : "#6b6b6b",
                fontSize: "13px", fontWeight: 500, cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <FilterIcon />
              Filters
              {count > 0 && (
                <span style={{ background: "#c9a96e", color: "#fff", borderRadius: "99px", padding: "1px 7px", fontSize: "10px", fontWeight: 700 }}>
                  {count}
                </span>
              )}
              <ChevronDown open={filtersOpen} />
            </button>

            <div style={{ maxHeight: filtersOpen ? "3000px" : "0px", overflow: "hidden", transition: "max-height 0.35s ease" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingTop: "20px" }}>

                {/* ── Secondhand toggle ── */}
                <div style={{ background: "#f7f6f3", borderRadius: "12px", padding: "14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: 500, color: "#000", marginBottom: "3px" }}>Secondhand</p>
                    <p style={{ fontSize: "12px", color: "#aaa", lineHeight: 1.4 }}>Prioritize items from Depop, Vinted, Poshmark, ThredUp</p>
                  </div>
                  <button
                    onClick={() => setFilters(f => ({ ...f, secondhandOnly: !f.secondhandOnly }))}
                    style={{
                      width: "44px", height: "26px", borderRadius: "13px", flexShrink: 0,
                      background: filters.secondhandOnly ? "#c9a96e" : "#d0cdc9",
                      border: "none", cursor: "pointer", position: "relative",
                      transition: "background 0.2s",
                    }}
                  >
                    <div style={{
                      width: "20px", height: "20px", borderRadius: "50%",
                      background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      position: "absolute", top: "3px",
                      left: filters.secondhandOnly ? "21px" : "3px",
                      transition: "left 0.2s",
                    }} />
                  </button>
                </div>

                {/* ── Gender / department ── */}
                <div>
                  <FilterLabel>Department</FilterLabel>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {GENDER_OPTIONS.map(opt => {
                      const on = filters.gender === opt;
                      return (
                        <button
                          key={opt}
                          onClick={() => setFilters(f => ({ ...f, gender: f.gender === opt ? "" : opt }))}
                          style={{
                            flex: 1, padding: "8px 4px", borderRadius: "99px",
                            border: `1.5px solid ${on ? "#c9a96e" : "#e8e8e8"}`,
                            background: on ? "#f7f0e4" : "#fff",
                            color: on ? "#c9a96e" : "#6b6b6b",
                            fontSize: "12px", fontWeight: on ? 600 : 400,
                            cursor: "pointer", transition: "all 0.1s", fontFamily: "inherit",
                          }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Color swatches ── */}
                <div>
                  <FilterLabel>Color</FilterLabel>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px", marginBottom: "12px" }}>
                    {SWATCHES.map(s => {
                      const selected = filters.colors.includes(s.name);
                      const light    = isLight(s.hex);
                      return (
                        <button
                          key={s.name}
                          onClick={() => toggleColor(s.name)}
                          title={s.name}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}
                        >
                          <div style={{
                            width: "44px", height: "44px", borderRadius: "50%",
                            background: s.hex,
                            border: selected
                              ? "2.5px solid #c9a96e"
                              : light ? "1.5px solid #ddd" : "1.5px solid transparent",
                            boxShadow: selected ? "0 0 0 3px #f7f0e4" : "none",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.1s",
                            transform: selected ? "scale(1.08)" : "scale(1)",
                          }}>
                            {selected && (
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M2.5 7l3 3L11.5 4" stroke={light ? "#333" : "#fff"} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <span style={{ fontSize: "9px", color: "#999", lineHeight: 1, textAlign: "center" }}>
                            {s.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    placeholder="Other color..."
                    value={filters.customColor}
                    onChange={(e) => setFilters(f => ({ ...f, customColor: e.target.value }))}
                    style={{
                      width: "100%", padding: "11px 14px", borderRadius: "12px",
                      border: `1.5px solid ${filters.customColor ? "#000" : "#e8e8e8"}`,
                      fontSize: "13px", color: "#000", background: "#fff",
                      transition: "border-color 0.15s",
                    }}
                  />
                </div>

                {/* ── Price range ── */}
                <div>
                  <FilterLabel>Budget</FilterLabel>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "18px" }}>
                    <span style={{ fontSize: "16px", fontWeight: 600, color: "#000", letterSpacing: "-0.3px" }}>
                      ${filters.priceRange[0]}
                    </span>
                    <span style={{ fontSize: "13px", color: "#aaa", margin: "0 2px" }}>—</span>
                    <span style={{ fontSize: "16px", fontWeight: 600, color: "#000", letterSpacing: "-0.3px" }}>
                      {filters.priceRange[1] >= PRICE_MAX ? "$1000+" : `$${filters.priceRange[1]}`}
                    </span>
                  </div>

                  <PriceRangeSlider value={filters.priceRange} onChange={(v) => setFilters(f => ({ ...f, priceRange: v }))} />

                  {/* Sort toggle */}
                  <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                    {(["low-high", "high-low"] as const).map((s) => {
                      const on = filters.sortOrder === s;
                      return (
                        <button key={s} onClick={() => setFilters(f => ({ ...f, sortOrder: s }))} style={{
                          flex: 1, padding: "8px 0", borderRadius: "99px", border: "1.5px solid",
                          borderColor: on ? "#c9a96e" : "#e8e8e8",
                          background: on ? "#f7f0e4" : "#fff",
                          color: on ? "#c9a96e" : "#6b6b6b",
                          fontSize: "12px", fontWeight: 500, cursor: "pointer", transition: "all 0.1s",
                        }}>
                          {s === "low-high" ? "Low to high" : "High to low"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Complete the outfit: category picker + rec style + free text ── */}
                {mode === "complete" && (<>
                  <CategoryPicker
                    itemCategories={filters.itemCategories}
                    itemSubcategories={filters.itemSubcategories}
                    onToggleCategory={toggleCategory}
                    onToggleSubcategory={toggleSubcategory}
                    label="What are you looking for?"
                  />

                  <div>
                    <FilterLabel>Recommendation style</FilterLabel>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {([
                        { key: "specific",  label: "Take me to a specific product" },
                        { key: "direction", label: "Show me the general direction" },
                      ] as { key: RecStyle; label: string }[]).map(({ key, label }) => {
                        const on = filters.recommendationStyle === key;
                        return (
                          <button key={key} onClick={() => setFilters(f => ({ ...f, recommendationStyle: key }))} style={{
                            display: "flex", alignItems: "center", gap: "12px",
                            padding: "13px 14px", borderRadius: "12px", border: "1.5px solid",
                            borderColor: on ? "#c9a96e" : "#e8e8e8",
                            background: on ? "#f7f0e4" : "#fff",
                            cursor: "pointer", textAlign: "left", transition: "all 0.1s",
                          }}>
                            <div style={{
                              width: "16px", height: "16px", borderRadius: "50%", flexShrink: 0,
                              border: `2px solid ${on ? "#c9a96e" : "#ccc"}`,
                              background: on ? "#c9a96e" : "#fff", transition: "all 0.1s",
                            }} />
                            <span style={{ fontSize: "13px", fontWeight: 500, color: on ? "#c9a96e" : "#444" }}>
                              {label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <FilterLabel>Describe what you want</FilterLabel>
                    <textarea
                      placeholder="e.g. no heels, I already have a bag, just a top, something for a wedding, more casual, no logos"
                      value={filters.description}
                      onChange={(e) => { console.log("[nomi] description typed:", e.target.value); setFilters(f => ({ ...f, description: e.target.value })); }}
                      rows={3}
                      style={{
                        width: "100%", padding: "13px 16px", borderRadius: "12px",
                        border: `1.5px solid ${filters.description ? "#000" : "#e8e8e8"}`,
                        fontSize: "14px", color: "#000", background: "#fff",
                        transition: "border-color 0.15s", resize: "none",
                        fontFamily: "inherit", lineHeight: 1.5,
                      }}
                    />
                  </div>
                </>)}

                {/* ── Find similar styles: scope picker + category picker for any ── */}
                {mode === "similar" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div>
                      <FilterLabel>Search within</FilterLabel>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {([
                          { key: "same" as const, label: "Same category" },
                          { key: "any"  as const, label: "Other categories" },
                        ]).map(({ key, label }) => {
                          const on = scope === key;
                          return (
                            <button key={key} onClick={() => setScope(key)} style={{
                              padding: "8px 16px", borderRadius: "99px", border: "1.5px solid",
                              borderColor: on ? "#c9a96e" : "#e8e8e8",
                              background:  on ? "#f7f0e4" : "#fff",
                              color:       on ? "#c9a96e" : "#6b6b6b",
                              fontSize: "13px", fontWeight: 500, cursor: "pointer", transition: "all 0.1s",
                            }}>
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {scope === "any" && (
                      <CategoryPicker
                        itemCategories={filters.itemCategories}
                        itemSubcategories={filters.itemSubcategories}
                        onToggleCategory={toggleCategory}
                        onToggleSubcategory={toggleSubcategory}
                        label="What are you looking for?"
                      />
                    )}

                    <div>
                      <FilterLabel>Describe what you want</FilterLabel>
                      <textarea
                        placeholder="e.g. no heels, I already have a bag, just a top, something for a wedding, more casual, no logos"
                        value={filters.description}
                        onChange={(e) => { console.log("[nomi] description typed:", e.target.value); setFilters(f => ({ ...f, description: e.target.value })); }}
                        rows={3}
                        style={{
                          width: "100%", padding: "13px 16px", borderRadius: "12px",
                          border: `1.5px solid ${filters.description ? "#000" : "#e8e8e8"}`,
                          fontSize: "14px", color: "#000", background: "#fff",
                          transition: "border-color 0.15s", resize: "none",
                          fontFamily: "inherit", lineHeight: 1.5,
                        }}
                      />
                    </div>
                  </div>
                )}

                {count > 0 && (
                  <button onClick={() => { setFilters(DEFAULT_FILTERS); setScope("same"); }} style={{ alignSelf: "flex-start", fontSize: "12px", color: "#aaa", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline", textUnderlineOffset: "2px" }}>
                    Reset filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* CTA */}
          <button onClick={handleFindMatches} disabled={!hasInput || urlLoading} style={{
            width: "100%", padding: "16px", borderRadius: "16px", border: "none",
            background: hasInput && !urlLoading ? "#000" : "#e8e8e8",
            color: hasInput && !urlLoading ? "#fff" : "#aaa",
            fontSize: "15px", fontWeight: 600,
            cursor: hasInput && !urlLoading ? "pointer" : "default",
            letterSpacing: "-0.1px", transition: "background 0.15s, color 0.15s", marginTop: "4px",
            animation: urlLoading ? "nomi-pulse 1.4s ease-in-out infinite" : "none",
          }}>
            {urlLoading ? "Reading product..." : "Find matches"}
          </button>
        </div>

        {/* Recent searches */}
        <section style={{ marginTop: "44px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 600, letterSpacing: "-0.2px" }}>Recent searches</h2>
            {recentSearches.length > 0 && (
              <button onClick={() => { localStorage.removeItem("nomi_recent_searches"); setRecentSearches([]); }}
                style={{ fontSize: "12px", color: "#bbb", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                Clear
              </button>
            )}
          </div>
          {recentSearches.length === 0 ? (
            <div style={{ borderRadius: "16px", border: "1px solid #ebebeb", padding: "36px 20px", textAlign: "center", background: "#fafafa" }}>
              <p style={{ fontSize: "13px", color: "#bbb", lineHeight: 1.6 }}>Your recent searches will appear here.</p>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "4px", marginLeft: "-20px", marginRight: "-20px", paddingLeft: "20px", paddingRight: "20px" }}>
              {recentSearches.map((s) => (
                <button key={s.id} onClick={() => openSearch(s)} style={{ flexShrink: 0, width: "136px", borderRadius: "16px", border: "1px solid #ebebeb", background: "#f7f6f3", cursor: "pointer", padding: 0, overflow: "hidden", textAlign: "left" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.image} alt="" style={{ width: "100%", height: "136px", objectFit: "cover", objectPosition: "top center", display: "block" }} />
                  <div style={{ padding: "10px 11px 12px" }}>
                    <p style={{ fontSize: "11px", fontWeight: 600, color: "#000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "3px" }}>
                      {s.result.analysis.category}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <p style={{ fontSize: "10px", color: "#bbb" }}>{timeAgo(s.searchedAt)}</p>
                      {s.saved && <span style={{ fontSize: "10px", color: "#c9a96e", fontWeight: 600 }}>★</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
    <NomiNav />
    {showOnboarding && <Onboarding onComplete={() => setShowOnboarding(false)} />}

    {/* Start over confirmation */}
    {confirmReset && (
      <div onClick={() => setConfirmReset(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 300 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: "420px" }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "#e0e0e0", margin: "12px auto 0" }} />
          <div style={{ padding: "20px 20px 44px" }}>
            <p style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "-0.2px", marginBottom: "6px" }}>Clear this search and start over?</p>
            <p style={{ fontSize: "14px", color: "#888", lineHeight: 1.5, marginBottom: "24px" }}>This will clear your uploaded photo, mode selection, and all filters.</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setConfirmReset(false)} style={{ flex: 1, padding: "14px", borderRadius: "14px", border: "1.5px solid #e8e8e8", background: "#fff", color: "#444", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={() => {
                setPhoto(null);
                setUrl("");
                setMode("complete");
                setScope("same");
                setFilters(DEFAULT_FILTERS);
                setFiltersOpen(false);
                setHasRestoredState(false);
                setConfirmReset(false);
                localStorage.removeItem("nomi_home_return_state");
                localStorage.removeItem("nomi_current_upload");
                sessionStorage.removeItem("nomi_home_state");
              }} style={{ flex: 1, padding: "14px", borderRadius: "14px", border: "none", background: "#000", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                Start over
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
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
      {/* Track */}
      <div style={{ position: "absolute", left: 0, right: 0, height: "4px", borderRadius: "2px", background: "#ebebeb", pointerEvents: "none" }}>
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
        onChange={(e) => onChange([Math.min(Number(e.target.value), hi - 20), hi])}
      />
      {/* Hi thumb */}
      <input
        type="range" min={0} max={PRICE_MAX} step={5} value={hi}
        className="nomi-range"
        style={{ zIndex: 4 }}
        onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo + 20)])}
      />
    </div>
  );
}

// ─── Small components ─────────────────────────────────────────────────────────

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0 }}
    >
      <span style={{ fontSize: "13px", fontWeight: 500, color: "#000" }}>{label}</span>
      <div style={{ width: "44px", height: "26px", borderRadius: "13px", background: value ? "#c9a96e" : "#d0cdc9", position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
        <div style={{
          width: "20px", height: "20px", borderRadius: "50%",
          background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          position: "absolute", top: "3px",
          left: value ? "21px" : "3px",
          transition: "left 0.2s",
        }} />
      </div>
    </button>
  );
}

function CategoryPicker({ itemCategories, itemSubcategories, onToggleCategory, onToggleSubcategory, label }: {
  itemCategories: string[];
  itemSubcategories: string[];
  onToggleCategory: (cat: string) => void;
  onToggleSubcategory: (sub: string) => void;
  label: string;
}) {
  return (
    <div>
      <FilterLabel>{label}</FilterLabel>
      <p style={{ fontSize: "11px", color: "#bbb", marginTop: "-8px", marginBottom: "12px", letterSpacing: "-0.1px" }}>
        Select one or more categories
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: itemCategories.length > 0 ? "12px" : "0" }}>
        {CATEGORIES.map(cat => {
          const on = itemCategories.includes(cat);
          return (
            <button key={cat} onClick={() => onToggleCategory(cat)} style={{
              padding: "7px 14px", borderRadius: "99px", border: "1.5px solid",
              borderColor: on ? "#000" : "#e8e8e8",
              background: on ? "#000" : "#fff",
              color: on ? "#fff" : "#6b6b6b",
              fontSize: "13px", fontWeight: 500, cursor: "pointer", transition: "all 0.1s",
            }}>
              {cat}
            </button>
          );
        })}
      </div>
      {/* Subcategory panel per selected category, stacked vertically */}
      {itemCategories.map(cat => (
        <div key={cat} style={{ background: "#f7f6f3", borderRadius: "14px", padding: "12px 14px 14px", marginBottom: "8px" }}>
          <p style={{ fontSize: "10px", fontWeight: 600, color: "#bbb", letterSpacing: "0.6px", textTransform: "uppercase", marginBottom: "10px" }}>
            {cat}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
            {SUBCATEGORIES[cat].map(sub => {
              const on = itemSubcategories.includes(sub);
              return (
                <button key={sub} onClick={() => onToggleSubcategory(sub)} style={{
                  padding: "6px 12px", borderRadius: "99px", border: "1.5px solid",
                  borderColor: on ? "#c9a96e" : "#e0dbd4",
                  background: on ? "#f7f0e4" : "#fff",
                  color: on ? "#c9a96e" : "#6b6b6b",
                  fontSize: "12px", fontWeight: 500, cursor: "pointer", transition: "all 0.1s",
                }}>
                  {sub}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: "11px", fontWeight: 600, color: "#bbb", letterSpacing: "0.6px", textTransform: "uppercase", marginBottom: "12px" }}>
      {children}
    </p>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function CameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ color: "#999" }}>
      <path d="M8.5 4L7 6H4a1.5 1.5 0 00-1.5 1.5v9A1.5 1.5 0 004 18h14a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0018 6h-3l-1.5-2h-5z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      <circle cx="11" cy="11.5" r="3" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M1.5 3.5h10M3.5 6.5h6M5.5 9.5h2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
      style={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function OutfitIcon({ selected }: { selected: boolean }) {
  const c = selected ? "#c9a96e" : "#bbb";
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M8 3L3 7.5l3 1.5V19h10V9l3-1.5L14 3a3 3 0 01-6 0z"
        stroke={c} strokeWidth="1.25" strokeLinejoin="round"
        fill={selected ? "#f7f0e4" : "none"} />
    </svg>
  );
}

function SimilarIcon({ selected }: { selected: boolean }) {
  const c = selected ? "#c9a96e" : "#bbb";
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="10" cy="10" r="6"
        stroke={c} strokeWidth="1.25"
        fill={selected ? "#f7f0e4" : "none"} />
      <path d="M14.5 14.5L18.5 18.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7.5 10h5M10 7.5v5" stroke={c} strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}
