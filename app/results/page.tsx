"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeThumbnail(dataUrl: string, maxPx = 320, quality = 0.55): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio  = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function uid() { return Math.random().toString(36).slice(2, 10); }

function updateTasteProfile(match: Match, analysis?: Analysis) {
  type TP = Record<string, Record<string, number>>;
  const profile: TP = JSON.parse(localStorage.getItem("nomi_taste_profile") ?? "{}");
  function inc(key: string, val?: string) {
    if (!val) return;
    profile[key] ??= {};
    profile[key][val] = (profile[key][val] ?? 0) + 1;
  }
  inc("colors",     analysis?.color);
  inc("categories", analysis?.category);
  inc("aesthetics", analysis?.aesthetic);
  inc("stores",     match.store);
  localStorage.setItem("nomi_taste_profile", JSON.stringify(profile));
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Analysis     = { color: string; category: string; aesthetic: string };
type Match        = { name: string; store?: string; price?: string; reason: string; searchUrl?: string; direction?: string };
type Result       = { analysis: Analysis; matches: Match[] };
type RecentSearch = { id: string; image: string; result: Result; searchedAt: number; saved: boolean };

type SavedItem = {
  id: string; name: string; store?: string; price?: string;
  reason: string; searchUrl?: string; direction?: string;
  image?: string;
  attributes?: { color?: string; category?: string; aesthetic?: string };
  savedAt: number;
};

type Board = { id: string; name: string; itemIds: string[]; createdAt: number };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const router = useRouter();
  const [image,           setImage]           = useState<string | null>(null);
  const [result,          setResult]          = useState<Result | null>(null);
  const [error,           setError]           = useState<string | null>(null);
  const [lookSaved,       setLookSaved]       = useState(false);
  const [searchId,        setSearchId]        = useState<string | null>(null);
  const [selectedMatch,   setSelectedMatch]   = useState<Match | null>(null);
  const [savedMatchNames, setSavedMatchNames] = useState<Set<string>>(new Set());
  const [textPiece,       setTextPiece]       = useState<{ name: string; category: string; description: string } | null>(null);

  useEffect(() => {
    // Always pre-load saved items
    const existing: SavedItem[] = JSON.parse(localStorage.getItem("nomi_saved_items") ?? "[]");
    setSavedMatchNames(new Set(existing.map(s => s.name)));

    // ── Text-only path (from Explore "Find this" via query params) ────────────
    const params   = new URLSearchParams(window.location.search);
    const pName    = params.get("name");
    const pCat     = params.get("category");
    const pDesc    = params.get("description");

    if (pName && pCat && pDesc) {
      setTextPiece({ name: pName, category: pCat, description: pDesc });
      const textPrompt   = `Find matching pieces for this item: ${pName}, ${pCat}, described as ${pDesc}. Suggest 3 complementary pieces to complete the outfit.`;
      const tasteProfile = JSON.parse(localStorage.getItem("nomi_taste_profile") ?? "{}");
      fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textPrompt, tasteProfile }),
      })
        .then((r) => r.json())
        .then((data: Result & { error?: string }) => {
          if (data.error) throw new Error(data.error);
          setResult(data);
        })
        .catch((e: Error) => setError(e.message ?? "Something went wrong"));
      return;
    }

    // ── Image-based path (normal upload flow) ────────────────────────────────
    const stored = localStorage.getItem("nomi_current_upload");
    if (!stored) { router.replace("/"); return; }
    setImage(stored);

    const preloaded = localStorage.getItem("nomi_current_result");
    if (preloaded) {
      localStorage.removeItem("nomi_current_result");
      const s: RecentSearch = JSON.parse(preloaded);
      setResult(s.result);
      setSearchId(s.id);
      setLookSaved(s.saved ?? false);
      return;
    }

    const filters      = JSON.parse(localStorage.getItem("nomi_current_filters") ?? "{}");
    const tasteProfile = JSON.parse(localStorage.getItem("nomi_taste_profile") ?? "{}");

    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: stored, filters, tasteProfile }),
    })
      .then((r) => r.json())
      .then((data: Result & { error?: string }) => {
        if (data.error) throw new Error(data.error);
        setResult(data);
        const id = uid();
        setSearchId(id);
        makeThumbnail(stored).then((thumb) => {
          const entry: RecentSearch = { id, image: thumb, result: data, searchedAt: Date.now(), saved: false };
          const prev: RecentSearch[] = JSON.parse(localStorage.getItem("nomi_recent_searches") ?? "[]");
          try {
            localStorage.setItem("nomi_recent_searches", JSON.stringify([entry, ...prev].slice(0, 6)));
          } catch {
            try { localStorage.setItem("nomi_recent_searches", JSON.stringify([entry])); } catch { /* ignore */ }
          }
        });
      })
      .catch((e: Error) => setError(e.message ?? "Something went wrong"));
  }, [router]);

  function handleSaveLook() {
    if (!result || lookSaved) return;
    setLookSaved(true);
    if (searchId) {
      const recent: RecentSearch[] = JSON.parse(localStorage.getItem("nomi_recent_searches") ?? "[]");
      localStorage.setItem("nomi_recent_searches", JSON.stringify(recent.map(s => s.id === searchId ? { ...s, saved: true } : s)));
    }
  }

  return (
    <>
      <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: "100%", maxWidth: "420px", padding: "0 20px 80px" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", padding: "20px 0 28px" }}>
            <button onClick={() => router.push("/")} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", marginLeft: "-4px", color: "#000", lineHeight: 0 }}>
              <BackArrow />
            </button>
            <span style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "-0.3px", marginLeft: "10px" }}>Your outfit</span>
          </div>

          {/* Your piece */}
          {image && (
            <div style={{ marginBottom: "28px" }}>
              <SectionLabel>Your piece</SectionLabel>
              <div style={{ borderRadius: "16px", overflow: "hidden", border: "1px solid #ebebeb", background: "#f7f6f3" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="Your piece" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", objectPosition: "top center", display: "block" }} />
                <div style={{ padding: "14px 16px 16px" }}>
                  {result ? (
                    <>
                      <div style={{ display: "flex", gap: "7px", marginBottom: "10px", flexWrap: "wrap" }}>
                        <Chip>{result.analysis.category}</Chip>
                        <Chip>{result.analysis.color}</Chip>
                      </div>
                      <p style={{ fontSize: "13px", color: "#6b6b6b", lineHeight: 1.6, fontStyle: "italic" }}>&ldquo;{result.analysis.aesthetic}&rdquo;</p>
                    </>
                  ) : !error && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <div style={{ ...shimmer, height: "22px", width: "80px", borderRadius: "99px" }} />
                        <div style={{ ...shimmer, height: "22px", width: "60px", borderRadius: "99px" }} />
                      </div>
                      <div style={{ ...shimmer, height: "13px", borderRadius: "6px" }} />
                      <div style={{ ...shimmer, height: "13px", borderRadius: "6px", width: "70%" }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Your piece — text mode (from Explore "Find this") */}
          {textPiece && (
            <div style={{ marginBottom: "28px" }}>
              <SectionLabel>Your piece</SectionLabel>
              <div style={{ borderRadius: "16px", border: "1px solid #ebebeb", background: "#f7f6f3", padding: "18px 18px 20px" }}>
                <div style={{ display: "flex", gap: "7px", marginBottom: "10px" }}>
                  <Chip>{textPiece.category}</Chip>
                </div>
                <p style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "-0.3px", color: "#000", marginBottom: "8px" }}>
                  {textPiece.name}
                </p>
                <p style={{ fontSize: "13px", color: "#6b6b6b", lineHeight: 1.6, fontStyle: "italic" }}>
                  {textPiece.description}
                </p>
                {result && (
                  <>
                    <div style={{ height: "1px", background: "#e8e4dd", margin: "12px 0" }} />
                    <p style={{ fontSize: "13px", color: "#6b6b6b", lineHeight: 1.6, fontStyle: "italic" }}>
                      &ldquo;{result.analysis.aesthetic}&rdquo;
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Loading */}
          {!result && !error && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ fontSize: "13px", fontWeight: 500, color: "#c9a96e", marginBottom: "4px", animation: "nomi-pulse 1.8s ease-in-out infinite" }}>
                Nomi is styling this...
              </p>
              <SkeletonCard /><SkeletonCard /><SkeletonCard />
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ borderRadius: "16px", border: "1px solid #fecaca", background: "#fef2f2", padding: "20px", fontSize: "14px", color: "#b91c1c", lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          {/* Match cards */}
          {result && (
            <>
              <SectionLabel>Complete the look</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {result.matches.map((match, i) => (
                  <MatchCard
                    key={i} match={match} index={i}
                    isSaved={savedMatchNames.has(match.name)}
                    onTap={() => setSelectedMatch(match)}
                  />
                ))}
              </div>

              <button onClick={handleSaveLook} style={{
                marginTop: "28px", width: "100%", padding: "16px",
                borderRadius: "16px", border: "none",
                background: lookSaved ? "#f0ede8" : "#c9a96e",
                color: lookSaved ? "#aaa" : "#fff",
                fontSize: "15px", fontWeight: 600,
                cursor: lookSaved ? "default" : "pointer",
                letterSpacing: "-0.1px", transition: "background 0.3s, color 0.3s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              }}>
                {lookSaved ? <><CheckIcon /> Saved to your looks</> : "Save this look"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Item detail overlay */}
      {selectedMatch && (
        <ItemDetail
          match={selectedMatch}
          onBack={() => setSelectedMatch(null)}
          searchImage={image ?? undefined}
          analysis={result?.analysis}
          onSaved={() => setSavedMatchNames(prev => new Set([...prev, selectedMatch.name]))}
        />
      )}
    </>
  );
}

// ─── Match Card ───────────────────────────────────────────────────────────────

function MatchCard({ match, index, isSaved, onTap }: { match: Match; index: number; isSaved: boolean; onTap: () => void }) {
  const isDirection = !!match.direction;
  return (
    <button onClick={onTap} style={{ borderRadius: "16px", border: "1px solid #ebebeb", background: "#f7f6f3", padding: "18px", display: "flex", flexDirection: "column", gap: "10px", cursor: "pointer", textAlign: "left", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ width: "20px", height: "20px", borderRadius: "6px", background: isDirection ? "#f7f0e4" : "#000", color: isDirection ? "#c9a96e" : "#fff", fontSize: "10px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {index + 1}
            </span>
            <p style={{ fontSize: "15px", fontWeight: 600, letterSpacing: "-0.2px", lineHeight: 1.3 }}>{match.name}</p>
          </div>
          {match.store && <p style={{ fontSize: "13px", color: "#6b6b6b", paddingLeft: "28px" }}>{match.store}</p>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "2px", flexShrink: 0 }}>
          {match.price && <span style={{ fontSize: "13px", fontWeight: 600, color: "#c9a96e" }}>{match.price}</span>}
          {isSaved ? <BookmarkFillIcon /> : <ChevronRight />}
        </div>
      </div>
      <p style={{ fontSize: "13px", color: "#555", lineHeight: 1.6, borderTop: "1px solid #e8e4dd", paddingTop: "10px", fontStyle: "italic" }}>
        &ldquo;{match.reason}&rdquo;
      </p>
    </button>
  );
}

// ─── Item Detail ──────────────────────────────────────────────────────────────

function ItemDetail({ match, onBack, searchImage, analysis, onSaved }: {
  match: Match;
  onBack: () => void;
  searchImage?: string;
  analysis?: Analysis;
  onSaved: () => void;
}) {
  const [itemSaved,     setItemSaved]     = useState(false);
  const [saveSheetOpen, setSaveSheetOpen] = useState(false);

  useEffect(() => {
    const saved: SavedItem[] = JSON.parse(localStorage.getItem("nomi_saved_items") ?? "[]");
    setItemSaved(saved.some(s => s.name === match.name && s.store === match.store));
  }, [match.name, match.store]);

  function handleShop() {
    const url = match.searchUrl
      ?? `https://www.google.com/search?tbm=shop&q=${match.name.replace(/\s+/g, "+")}${match.store ? "+" + match.store.replace(/\s+/g, "+") : ""}`;
    window.open(url, "_blank", "noopener");
  }

  function handleSaved() {
    setItemSaved(true);
    setSaveSheetOpen(false);
    onSaved();
  }

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 50, display: "flex", flexDirection: "column", alignItems: "center", overflowY: "auto" }}>
        <div style={{ width: "100%", maxWidth: "420px", padding: "0 20px 80px" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", padding: "20px 0 32px" }}>
            <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", marginLeft: "-4px", color: "#000", lineHeight: 0 }}>
              <BackArrow />
            </button>
            <span style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "-0.3px", marginLeft: "10px" }}>Item detail</span>
          </div>

          {/* Card */}
          <div style={{ borderRadius: "20px", border: "1px solid #ebebeb", background: "#f7f6f3", padding: "24px", marginBottom: "20px" }}>
            {(match.store || match.price) && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                {match.store && <span style={{ fontSize: "11px", fontWeight: 600, color: "#bbb", letterSpacing: "0.6px", textTransform: "uppercase" }}>{match.store}</span>}
                {match.price && <span style={{ fontSize: "18px", fontWeight: 700, color: "#c9a96e", letterSpacing: "-0.5px" }}>{match.price}</span>}
              </div>
            )}
            <h1 style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1.25, color: "#000", marginBottom: "20px" }}>{match.name}</h1>
            <div style={{ height: "1px", background: "#e8e4dd", marginBottom: "20px" }} />
            {match.direction && <p style={{ fontSize: "14px", color: "#444", lineHeight: 1.75, marginBottom: "14px" }}>{match.direction}</p>}
            <p style={{ fontSize: "14px", color: "#6b6b6b", lineHeight: 1.7, fontStyle: "italic" }}>&ldquo;{match.reason}&rdquo;</p>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {(match.searchUrl || match.store) && (
              <button onClick={handleShop} style={{ width: "100%", padding: "16px", borderRadius: "16px", border: "none", background: "#000", color: "#fff", fontSize: "15px", fontWeight: 600, cursor: "pointer", letterSpacing: "-0.1px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <SearchIcon /> Shop this look
              </button>
            )}

            <button
              onClick={() => { if (!itemSaved) setSaveSheetOpen(true); }}
              style={{
                width: "100%", padding: "16px", borderRadius: "16px", border: "none",
                background: itemSaved ? "#f0ede8" : "#c9a96e",
                color: itemSaved ? "#aaa" : "#fff",
                fontSize: "15px", fontWeight: 600,
                cursor: itemSaved ? "default" : "pointer",
                letterSpacing: "-0.1px", transition: "background 0.3s, color 0.3s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              }}
            >
              {itemSaved ? <><BookmarkFillIcon /> Saved</> : "Save item"}
            </button>
          </div>
        </div>
      </div>

      {/* Save to sheet */}
      {saveSheetOpen && (
        <SaveToSheet
          match={match}
          searchImage={searchImage}
          analysis={analysis}
          onSaved={handleSaved}
          onClose={() => setSaveSheetOpen(false)}
        />
      )}
    </>
  );
}

// ─── Save To Sheet ────────────────────────────────────────────────────────────

function SaveToSheet({ match, searchImage, analysis, onSaved, onClose }: {
  match: Match;
  searchImage?: string;
  analysis?: Analysis;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [boards,       setBoards]       = useState<Board[]>([]);
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [newName,      setNewName]      = useState("");

  useEffect(() => {
    setBoards(JSON.parse(localStorage.getItem("nomi_boards") ?? "[]"));
  }, []);

  function buildItem(): SavedItem {
    return {
      id: uid(), name: match.name, store: match.store, price: match.price,
      reason: match.reason, searchUrl: match.searchUrl, direction: match.direction,
      image: searchImage,
      attributes: { color: analysis?.color, category: analysis?.category, aesthetic: analysis?.aesthetic },
      savedAt: Date.now(),
    };
  }

  function saveToBoard(boardId: string | "all") {
    const item = buildItem();
    const prev: SavedItem[] = JSON.parse(localStorage.getItem("nomi_saved_items") ?? "[]");
    if (prev.some(s => s.name === match.name && s.store === match.store)) { onSaved(); return; }
    localStorage.setItem("nomi_saved_items", JSON.stringify([item, ...prev]));
    if (boardId !== "all") {
      const existing: Board[] = JSON.parse(localStorage.getItem("nomi_boards") ?? "[]");
      localStorage.setItem("nomi_boards", JSON.stringify(existing.map(b => b.id === boardId ? { ...b, itemIds: [item.id, ...b.itemIds] } : b)));
    }
    updateTasteProfile(match, analysis);
    onSaved();
  }

  function createAndSave() {
    if (!newName.trim()) return;
    const item  = buildItem();
    const board: Board = { id: uid(), name: newName.trim(), itemIds: [item.id], createdAt: Date.now() };
    const prev: SavedItem[] = JSON.parse(localStorage.getItem("nomi_saved_items") ?? "[]");
    localStorage.setItem("nomi_saved_items", JSON.stringify([item, ...prev]));
    const existing: Board[] = JSON.parse(localStorage.getItem("nomi_boards") ?? "[]");
    localStorage.setItem("nomi_boards", JSON.stringify([...existing, board]));
    updateTasteProfile(match, analysis);
    onSaved();
  }

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: "420px" }}>
        <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "#e0e0e0", margin: "12px auto 0" }} />
        <div style={{ padding: "16px 20px 44px" }}>
          <p style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "-0.2px", marginBottom: "12px" }}>Save to...</p>

          {/* All saved */}
          <SheetBoardRow name="All saved" isDefault onTap={() => saveToBoard("all")} />

          {/* User boards */}
          {boards.map(b => <SheetBoardRow key={b.id} name={b.name} onTap={() => saveToBoard(b.id)} />)}

          {/* New board */}
          {showNewBoard ? (
            <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
              <input
                autoFocus type="text" placeholder="Board name..."
                value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createAndSave()}
                style={{ flex: 1, padding: "11px 14px", borderRadius: "12px", border: "1.5px solid #e8e8e8", fontSize: "14px", outline: "none" }}
              />
              <button onClick={createAndSave} style={{ padding: "11px 16px", borderRadius: "12px", border: "none", background: "#000", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                Create
              </button>
            </div>
          ) : (
            <button onClick={() => setShowNewBoard(true)} style={{ width: "100%", padding: "14px 0", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", color: "#c9a96e" }}>
              <span style={{ fontSize: "20px", fontWeight: 300, lineHeight: 1 }}>+</span>
              <span style={{ fontSize: "14px", fontWeight: 500 }}>New board</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SheetBoardRow({ name, isDefault, onTap }: { name: string; isDefault?: boolean; onTap: () => void }) {
  return (
    <button onClick={onTap} style={{ width: "100%", padding: "12px 0", background: "none", border: "none", borderBottom: "1px solid #f5f5f5", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", textAlign: "left" }}>
      <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: isDefault ? "#f7f0e4" : "#f7f6f3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M4 2.5h10a.5.5 0 01.5.5v12.5L9 12.5 3.5 15.5V3a.5.5 0 01.5-.5z" fill={isDefault ? "#c9a96e" : "#bbb"} />
        </svg>
      </div>
      <span style={{ fontSize: "14px", fontWeight: 500, color: "#000" }}>{name}</span>
    </button>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{ borderRadius: "16px", border: "1px solid #ebebeb", background: "#f7f6f3", padding: "18px", display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <div style={{ ...shimmer, width: "20px", height: "20px", borderRadius: "6px", flexShrink: 0 }} />
        <div style={{ ...shimmer, height: "16px", borderRadius: "6px", flex: 1 }} />
        <div style={{ ...shimmer, width: "56px", height: "16px", borderRadius: "6px" }} />
      </div>
      <div style={{ ...shimmer, height: "13px", borderRadius: "6px", width: "40%" }} />
      <div style={{ borderTop: "1px solid #e8e4dd", paddingTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ ...shimmer, height: "13px", borderRadius: "6px" }} />
        <div style={{ ...shimmer, height: "13px", borderRadius: "6px", width: "75%" }} />
      </div>
    </div>
  );
}

const shimmer: React.CSSProperties = {
  background: "linear-gradient(90deg, #ede9e3 0%, #e2ddd7 50%, #ede9e3 100%)",
  backgroundSize: "800px 100%",
  animation: "nomi-shimmer 1.4s ease-in-out infinite",
};

// ─── Shared small components ──────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: "11px", fontWeight: 600, color: "#bbb", letterSpacing: "0.7px", textTransform: "uppercase", marginBottom: "12px" }}>{children}</p>;
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: "11px", fontWeight: 500, padding: "4px 10px", borderRadius: "99px", background: "#ece9e4", color: "#6b6b6b", display: "inline-block" }}>{children}</span>;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function BackArrow() {
  return <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 4L7 10l5.5 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function ChevronRight() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "#ccc" }}><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function CheckIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function SearchIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" /><path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
}
function BookmarkFillIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3.5 2.5h9a.5.5 0 01.5.5v11l-5-3-5 3V3a.5.5 0 01.5-.5z" fill="#c9a96e" /></svg>;
}
