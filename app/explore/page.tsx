"use client";

import { useEffect, useMemo, useState } from "react";
import NomiNav from "../components/NomiNav";
import { LOOKS, type Look, type OutfitPiece } from "./data";

// ─── Constants ────────────────────────────────────────────────────────────────

const FILTER_TABS = [
  "For you", "Trending", "Minimal", "Street",
  "Going out", "Work", "Secondhand", "Summer",
] as const;
type FilterTab = typeof FILTER_TABS[number];

// ─── Taste profile helpers ────────────────────────────────────────────────────

type Profile = Record<string, number>; // tag → interaction count

function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem("nomi_explore_profile");
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveProfile(p: Profile) {
  try { localStorage.setItem("nomi_explore_profile", JSON.stringify(p)); } catch { /* quota */ }
}

function rankByProfile(looks: Look[], profile: Profile): Look[] {
  if (Object.keys(profile).length === 0) return looks;
  return [...looks].sort((a, b) => {
    const sa = a.tags.reduce((n, t) => n + (profile[t] ?? 0), 0);
    const sb = b.tags.reduce((n, t) => n + (profile[t] ?? 0), 0);
    return sb - sa;
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExplorePage() {
  const [query,    setQuery]    = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("For you");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [profile,  setProfile]  = useState<Profile>({});
  const [selected, setSelected] = useState<Look | null>(null);

  useEffect(() => {
    setSavedIds(new Set(JSON.parse(localStorage.getItem("nomi_saved_looks") ?? "[]")));
    setProfile(loadProfile());
  }, []);

  const feed = useMemo(() => {
    let list = activeTab === "For you"
      ? rankByProfile(LOOKS, profile)
      : LOOKS.filter(l => l.tags.includes(activeTab));

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.tags.some(t => t.toLowerCase().includes(q)) ||
        l.pieces.some(p => p.name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activeTab, query, profile]);

  const leftCol  = feed.filter((_, i) => i % 2 === 0);
  const rightCol = feed.filter((_, i) => i % 2 !== 0);

  function track(look: Look) {
    setProfile(prev => {
      const next = { ...prev };
      look.tags.forEach(t => { next[t] = (next[t] ?? 0) + 1; });
      saveProfile(next);
      return next;
    });
  }

  function handleTap(look: Look) {
    track(look);
    setSelected(look);
  }

  function toggleSave(look: Look, e: React.MouseEvent) {
    e.stopPropagation();
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(look.id)) {
        next.delete(look.id);
      } else {
        next.add(look.id);
        track(look);
      }
      localStorage.setItem("nomi_saved_looks", JSON.stringify([...next]));
      return next;
    });
  }

  return (
    <>
      <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>

          {/* ── Sticky header ── */}
          <div style={{ position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>

            {/* Title + search */}
            <div style={{ padding: "20px 16px 12px" }}>
              <h1 style={{ fontSize: "22px", fontWeight: 600, letterSpacing: "-0.5px", marginBottom: "12px" }}>
                Explore
              </h1>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", color: "#aaa", lineHeight: 0, pointerEvents: "none" }}>
                  <SearchIcon />
                </div>
                <input
                  type="text"
                  placeholder="Search styles, aesthetics, items..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  style={{
                    width: "100%", padding: "11px 36px 11px 38px",
                    borderRadius: "14px", border: `1.5px solid ${query ? "#000" : "#e8e8e8"}`,
                    fontSize: "14px", color: "#000", background: "#f7f6f3",
                    transition: "border-color 0.15s",
                  }}
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#aaa", lineHeight: 0, padding: 0 }}
                  >
                    <XIcon />
                  </button>
                )}
              </div>
            </div>

            {/* Filter pills */}
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingLeft: "16px", paddingRight: "16px", paddingBottom: "12px", scrollbarWidth: "none" }}>
              {FILTER_TABS.map(tab => {
                const on = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      flexShrink: 0, padding: "7px 16px", borderRadius: "99px",
                      border: "none",
                      background: on ? "#c9a96e" : "#f0ede8",
                      color: on ? "#fff" : "#6b6b6b",
                      fontSize: "13px", fontWeight: on ? 600 : 400,
                      cursor: "pointer", whiteSpace: "nowrap",
                      transition: "background 0.15s, color 0.15s",
                    }}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            <div style={{ height: "1px", background: "#ebebeb" }} />
          </div>

          {/* ── Feed ── */}
          {feed.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 24px", textAlign: "center", gap: "8px" }}>
              <p style={{ fontSize: "15px", fontWeight: 600, color: "#000", letterSpacing: "-0.2px" }}>No looks here yet.</p>
              <p style={{ fontSize: "13px", color: "#aaa", lineHeight: 1.6 }}>
                {query ? "Try a different search." : "Check back soon."}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "8px", padding: "10px 16px 80px" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                {leftCol.map(look => (
                  <LookCard
                    key={look.id} look={look}
                    isSaved={savedIds.has(look.id)}
                    onTap={() => handleTap(look)}
                    onSave={e => toggleSave(look, e)}
                  />
                ))}
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                {rightCol.map(look => (
                  <LookCard
                    key={look.id} look={look}
                    isSaved={savedIds.has(look.id)}
                    onTap={() => handleTap(look)}
                    onSave={e => toggleSave(look, e)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <NomiNav />

      {selected && (
        <LookDetail
          look={selected}
          isSaved={savedIds.has(selected.id)}
          onSave={e => toggleSave(selected, e)}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

// ─── Look Card ────────────────────────────────────────────────────────────────

function LookCard({ look, isSaved, onTap, onSave }: {
  look: Look; isSaved: boolean; onTap: () => void; onSave: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onTap}
      style={{ borderRadius: "16px", overflow: "hidden", cursor: "pointer", position: "relative" }}
    >
      {/* Gradient "image" */}
      <div style={{ background: look.gradient, height: `${look.height}px`, position: "relative" }}>

        {/* Bookmark — top right */}
        <button
          onClick={onSave}
          style={{
            position: "absolute", top: "10px", right: "10px",
            width: "32px", height: "32px",
            background: "rgba(255,255,255,0.92)",
            border: "none", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          {isSaved ? <BookmarkFillSm /> : <BookmarkOutlineSm />}
        </button>

        {/* Bottom scrim — title + tag */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "48px 12px 12px",
          background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)",
        }}>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#fff", letterSpacing: "-0.2px", lineHeight: 1.3, marginBottom: "5px" }}>
            {look.title}
          </p>
          <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.9)", background: "rgba(255,255,255,0.18)", padding: "2px 8px", borderRadius: "4px", fontWeight: 500 }}>
            {look.tags[0]}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Look Detail ──────────────────────────────────────────────────────────────

function LookDetail({ look, isSaved, onSave, onClose }: {
  look: Look; isSaved: boolean; onSave: (e: React.MouseEvent) => void; onClose: () => void;
}) {
  function shopThis(piece: OutfitPiece) {
    const q = encodeURIComponent(`${piece.name}`);
    window.open(`https://www.google.com/search?tbm=shop&q=${q}`, "_blank", "noopener");
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 60, display: "flex", flexDirection: "column", alignItems: "center", overflowY: "auto" }}>
      <div style={{ width: "100%", maxWidth: "420px", paddingBottom: "80px" }}>

        {/* Hero gradient with floating header */}
        <div style={{ position: "relative" }}>
          {/* Full-width gradient hero */}
          <div style={{ background: look.gradient, height: "360px", position: "relative" }}>
            {/* Bottom scrim */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              padding: "80px 20px 24px",
              background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)",
            }}>
              <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#fff", letterSpacing: "-0.5px", lineHeight: 1.2 }}>
                {look.title}
              </h1>
            </div>
          </div>

          {/* Floating header buttons over gradient */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 0" }}>
            <button onClick={onClose} style={floatBtn}><BackArrow /></button>
            <button onClick={onSave} style={floatBtn}>
              {isSaved ? <BookmarkFillSm /> : <BookmarkOutlineSm />}
            </button>
          </div>
        </div>

        {/* Aesthetic tags */}
        <div style={{ display: "flex", gap: "6px", padding: "16px 20px 0", flexWrap: "wrap" }}>
          {look.tags.map(tag => (
            <span key={tag} style={{ fontSize: "11px", fontWeight: 500, padding: "4px 10px", borderRadius: "99px", background: "#f7f0e4", color: "#c9a96e" }}>
              {tag}
            </span>
          ))}
        </div>

        {/* Shop this look */}
        <div style={{ padding: "20px 20px 0" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, color: "#bbb", letterSpacing: "0.7px", textTransform: "uppercase", marginBottom: "12px" }}>
            Shop this look
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {look.pieces.map((piece, i) => (
              <div key={i} style={{ borderRadius: "16px", border: "1px solid #ebebeb", background: "#f7f6f3", padding: "16px" }}>
                <p style={{ fontSize: "10px", fontWeight: 600, color: "#bbb", letterSpacing: "0.6px", textTransform: "uppercase", marginBottom: "4px" }}>
                  {piece.category}
                </p>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#000", letterSpacing: "-0.2px", marginBottom: "4px" }}>
                  {piece.name}
                </p>
                <p style={{ fontSize: "12px", color: "#6b6b6b", lineHeight: 1.55, marginBottom: "12px" }}>
                  {piece.description}
                </p>
                <button
                  onClick={() => shopThis(piece)}
                  style={{ width: "100%", padding: "10px 16px", borderRadius: "12px", border: "none", background: "#000", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                >
                  <BagIcon /> Shop this
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const floatBtn: React.CSSProperties = {
  width: "36px", height: "36px",
  background: "rgba(255,255,255,0.9)",
  border: "none", borderRadius: "50%",
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", backdropFilter: "blur(4px)",
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function SearchIcon() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.4"/><path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
}
function XIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
}
function BookmarkOutlineSm() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 2h8a.5.5 0 01.5.5v10L7 10l-4.5 2.5V2.5A.5.5 0 013 2z" stroke="#c9a96e" strokeWidth="1.3" strokeLinejoin="round"/></svg>;
}
function BookmarkFillSm() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 2h8a.5.5 0 01.5.5v10L7 10l-4.5 2.5V2.5A.5.5 0 013 2z" fill="#c9a96e"/></svg>;
}
function BackArrow() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 3.5L6 9l5 5.5" stroke="#000" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function BagIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 4.5h9l-1 7h-7l-1-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M5 4.5V3a2 2 0 014 0v1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
}
