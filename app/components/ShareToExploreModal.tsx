"use client";

import { useState } from "react";

// ─── Shared types ─────────────────────────────────────────────────────────────

export type CommunityPiece = {
  name: string;
  store?: string;
  price?: string;
  searchUrl?: string;
  productLink?: string;
  category?: string;
};

export type CommunityLook = {
  id: string;
  posterName: string;
  caption: string;
  image?: string;       // first image — kept for backward compat with existing posts
  images?: string[];    // full set of look images (original + matched items)
  imageTiers?: ("confident" | "broad")[];  // parallel to images[]; absent index → confident
  pieces: CommunityPiece[];
  tags: string[];
  savedCount: number;
  sharedAt: number;
  isAnonymous?: boolean;
};

// ─── Occasion groups ──────────────────────────────────────────────────────────

export const OCCASION_GROUPS = [
  { label: "Everyday",   options: ["OOTD", "Casual", "Running errands", "Travel"] },
  { label: "Going out",  options: ["OOTN", "Date night", "Girls night", "Brunch"] },
  { label: "Events",     options: ["Graduation", "Birthday", "Baby shower", "Gala"] },
  { label: "Weddings",   options: ["Wedding guest", "Bride", "Bridesmaid", "Engagement"] },
  { label: "Work",       options: ["Office", "Business casual", "Work from home"] },
  { label: "Secondhand", options: ["Thrift find", "Vintage", "Depop find", "Resale"] },
] as const;

export function toTagSlug(option: string): string {
  return `#${option.toLowerCase().replace(/\s+/g, "")}`;
}

export function normalizeTag(tag: string): string {
  return tag.replace(/^#+/, "").toLowerCase().replace(/\s+/g, "").trim();
}

const COLLAGE_COLORS = ["#f0ede8", "#ece9e4", "#e8e4dd", "#ede9e3"];

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  images: (string | undefined)[];
  tiers?: ("confident" | "broad")[];
  pieces: CommunityPiece[];
  onClose: () => void;
  onShared: () => void;
};

export default function ShareToExploreModal({ images, tiers, pieces, onClose, onShared }: Props) {
  const [caption,     setCaption]     = useState("");
  const [tagInput,    setTagInput]    = useState("");
  const [customTags,  setCustomTags]  = useState<string[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [userName] = useState(() => {
    try { return localStorage.getItem("nomi_user_name") ?? ""; } catch { return ""; }
  });

  const isCollage = images.filter(Boolean).length > 1;
  const singleImg = images.find(Boolean);

  function finaliseTag(raw: string) {
    const word = raw.trim();
    if (!word) return;
    const tag = word.startsWith("#") ? word.toLowerCase() : `#${word.toLowerCase()}`;
    setCustomTags(prev => prev.includes(tag) ? prev : [...prev, tag]);
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      finaliseTag(tagInput);
      setTagInput("");
    } else if (e.key === "Backspace" && tagInput === "" && customTags.length > 0) {
      setCustomTags(prev => prev.slice(0, -1));
    }
  }

  function handleTagChange(value: string) {
    // auto-finalise on space within the string
    if (value.includes(" ")) {
      const parts = value.split(" ");
      parts.slice(0, -1).forEach(p => finaliseTag(p));
      setTagInput(parts[parts.length - 1]);
    } else {
      setTagInput(value);
    }
  }

  function removeTag(tag: string) {
    setCustomTags(prev => prev.filter(t => t !== tag));
  }

  function handleShare() {
    const displayName = isAnonymous ? "Anonymous" : (userName.trim() || "Anonymous");
    if (userName.trim()) {
      try { localStorage.setItem("nomi_user_name", userName.trim()); } catch { /* ignore */ }
    }
    // Finalise any partially-typed tag
    const pendingTags = tagInput.trim() ? [tagInput.trim().startsWith("#") ? tagInput.trim().toLowerCase() : `#${tagInput.trim().toLowerCase()}`] : [];
    const allImages = images.filter((img): img is string => !!img);
    const look: CommunityLook = {
      id:          Math.random().toString(36).slice(2, 10),
      posterName:  displayName,
      caption:     caption.trim(),
      image:       singleImg,       // first image (backward compat)
      images:      allImages,       // full set
      imageTiers:  tiers?.slice(0, allImages.length),
      pieces,
      tags:        [...customTags, ...pendingTags],
      savedCount:  0,
      sharedAt:    Date.now(),
      isAnonymous,
    };
    try {
      const existing: CommunityLook[] = JSON.parse(localStorage.getItem("nomi_community_looks") ?? "[]");
      localStorage.setItem("nomi_community_looks", JSON.stringify([look, ...existing]));
      const myIds: string[] = JSON.parse(localStorage.getItem("nomi_my_post_ids") ?? "[]");
      localStorage.setItem("nomi_my_post_ids", JSON.stringify([...myIds, look.id]));
    } catch { /* ignore */ }
    onShared();
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 300 }}
    >
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: "420px", maxHeight: "88vh", display: "flex", flexDirection: "column" }}>
        <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "#e0e0e0", margin: "12px auto 0", flexShrink: 0 }} />

        <div style={{ overflowY: "auto", padding: "16px 20px 44px" }}>
          <p style={{ fontSize: "17px", fontWeight: 600, letterSpacing: "-0.3px", marginBottom: "16px" }}>Share to Explore</p>

          {/* Preview */}
          {isCollage ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px", borderRadius: "14px", overflow: "hidden", marginBottom: "18px", height: "160px" }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{ background: COLLAGE_COLORS[i], overflow: "hidden" }}>
                  {images[i] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={images[i]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }} />
                  )}
                </div>
              ))}
            </div>
          ) : singleImg ? (
            <div style={{ borderRadius: "14px", overflow: "hidden", marginBottom: "18px", height: "160px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={singleImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }} />
            </div>
          ) : null}

          {/* Caption */}
          <FieldLabel>Add a caption</FieldLabel>
          <input
            type="text" placeholder="e.g. my go-to Sunday outfit"
            value={caption} onChange={e => setCaption(e.target.value)}
            style={{ width: "100%", padding: "12px 14px", borderRadius: "12px", border: `1.5px solid ${caption ? "#c9a96e" : "#e8e8e8"}`, fontSize: "14px", outline: "none", fontFamily: "inherit", marginBottom: "14px", boxSizing: "border-box", transition: "border-color 0.15s" } as React.CSSProperties}
          />

          {/* Tags */}
          <FieldLabel>Add tags</FieldLabel>
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", marginBottom: "10px", paddingBottom: "2px", scrollbarWidth: "none" } as React.CSSProperties}>
            {OCCASION_GROUPS.flatMap(g => [...g.options]).map(opt => {
              const slug = toTagSlug(opt);
              const active = customTags.includes(slug);
              return (
                <button
                  key={opt}
                  onClick={() => active ? removeTag(slug) : setCustomTags(prev => [...prev, slug])}
                  style={{
                    flexShrink: 0, padding: "5px 12px", borderRadius: "99px",
                    border: `1px solid ${active ? "#c9a96e" : "#e0dbd4"}`,
                    background: active ? "#f7f0e4" : "none",
                    color: active ? "#c9a96e" : "#aaa",
                    fontSize: "12px", fontWeight: active ? 600 : 400,
                    cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit",
                    transition: "color 0.12s, border-color 0.12s, background 0.12s",
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          <div style={{
            borderRadius: "12px", border: `1.5px solid ${customTags.length > 0 || tagInput ? "#c9a96e" : "#e8e8e8"}`,
            padding: "10px 12px", display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center",
            marginBottom: "18px", transition: "border-color 0.15s", cursor: "text",
          }}
            onClick={e => (e.currentTarget.querySelector("input") as HTMLInputElement)?.focus()}
          >
            {customTags.map(tag => (
              <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "99px", border: "1px solid #e0dbd4", background: "#f7f6f3", fontSize: "12px", color: "#c9a96e", fontWeight: 500 }}>
                {tag}
                <button onClick={() => removeTag(tag)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#bbb", lineHeight: 1, fontSize: "14px", display: "flex", alignItems: "center" }}>×</button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={e => handleTagChange(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder={customTags.length === 0 ? "#minimal #denim #datenight" : ""}
              style={{ border: "none", outline: "none", fontSize: "14px", fontFamily: "inherit", flex: 1, minWidth: "120px", padding: "2px 0", background: "transparent", color: "#000" }}
            />
          </div>

          {/* Anonymous toggle */}
          <label style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={e => setIsAnonymous(e.target.checked)}
              style={{ width: "16px", height: "16px", accentColor: "#c9a96e", cursor: "pointer" }}
            />
            <span style={{ fontSize: "13px", color: "#555" }}>Post anonymously</span>
          </label>

          <button
            onClick={handleShare}
            style={{ width: "100%", padding: "15px", borderRadius: "14px", border: "none", background: "#c9a96e", color: "#fff", fontSize: "15px", fontWeight: 600, cursor: "pointer" }}
          >
            Share
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: "11px", fontWeight: 600, color: "#bbb", letterSpacing: "0.6px", textTransform: "uppercase", marginBottom: "8px" }}>
      {children}
    </p>
  );
}
