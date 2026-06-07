"use client";

import { useEffect, useRef, useState } from "react";
import NomiNav from "../components/NomiNav";

// ─── Types ────────────────────────────────────────────────────────────────────

type SavedItem = {
  id: string;
  name: string;
  store?: string;
  price?: string;
  reason: string;
  searchUrl?: string;
  direction?: string;
  image?: string;
  attributes?: { color?: string; category?: string; aesthetic?: string };
  savedAt: number;
};

type Board = {
  id: string;
  name: string;
  itemIds: string[];
  createdAt: number;
};

type LongPressTarget = { item: SavedItem; boardId: string };
type MoveTarget      = { item: SavedItem; fromBoardId: string };

const PLACEHOLDER_COLORS = ["#f0ede8", "#ece9e4", "#e8e4dd", "#ede9e3"];

// ─── Long press hook ──────────────────────────────────────────────────────────

function useLongPress(cb: () => void, delay = 600) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fired = useRef(false);
  const start = () => { fired.current = false; timer.current = setTimeout(() => { fired.current = true; cb(); }, delay); };
  const stop  = () => clearTimeout(timer.current);
  return {
    onPointerDown: start, onPointerUp: stop, onPointerLeave: stop,
    onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); cb(); },
    didFire: () => fired.current,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SavedPage() {
  const [items,          setItems]         = useState<SavedItem[]>([]);
  const [boards,         setBoards]        = useState<Board[]>([]);
  const [activeBoardId,  setActiveBoardId] = useState<string | null>(null); // null = boards grid
  const [createOpen,     setCreateOpen]    = useState(false);
  const [newBoardName,   setNewBoardName]  = useState("");
  const [detailItem,     setDetailItem]    = useState<SavedItem | null>(null);
  const [longPressTarget, setLP]           = useState<LongPressTarget | null>(null);
  const [moveTarget,     setMoveTarget]    = useState<MoveTarget | null>(null);

  function load() {
    setItems(JSON.parse(localStorage.getItem("nomi_saved_items") ?? "[]"));
    setBoards(JSON.parse(localStorage.getItem("nomi_boards") ?? "[]"));
  }
  useEffect(load, []);

  // ── Board helpers ────────────────────────────────────────────────────────────

  function boardItems(boardId: string): SavedItem[] {
    if (boardId === "all") return items;
    const b = boards.find(b => b.id === boardId);
    return (b?.itemIds ?? []).map(id => items.find(i => i.id === id)).filter(Boolean) as SavedItem[];
  }

  function createBoard() {
    if (!newBoardName.trim()) return;
    const board: Board = { id: uid(), name: newBoardName.trim(), itemIds: [], createdAt: Date.now() };
    const next = [...boards, board];
    localStorage.setItem("nomi_boards", JSON.stringify(next));
    setBoards(next);
    setCreateOpen(false);
    setNewBoardName("");
  }

  function removeItem(item: SavedItem, fromBoardId: string) {
    if (fromBoardId === "all") {
      // remove from global + all boards
      const nextItems = items.filter(i => i.id !== item.id);
      const nextBoards = boards.map(b => ({ ...b, itemIds: b.itemIds.filter(id => id !== item.id) }));
      localStorage.setItem("nomi_saved_items", JSON.stringify(nextItems));
      localStorage.setItem("nomi_boards",      JSON.stringify(nextBoards));
      setItems(nextItems); setBoards(nextBoards);
    } else {
      const nextBoards = boards.map(b => b.id === fromBoardId ? { ...b, itemIds: b.itemIds.filter(id => id !== item.id) } : b);
      localStorage.setItem("nomi_boards", JSON.stringify(nextBoards));
      setBoards(nextBoards);
    }
    if (detailItem?.id === item.id) setDetailItem(null);
  }

  function moveToBoard(target: MoveTarget, toBoardId: string) {
    const nextBoards = boards.map(b => {
      if (b.id === target.fromBoardId) return { ...b, itemIds: b.itemIds.filter(id => id !== target.item.id) };
      if (b.id === toBoardId)          return { ...b, itemIds: [target.item.id, ...b.itemIds] };
      return b;
    });
    localStorage.setItem("nomi_boards", JSON.stringify(nextBoards));
    setBoards(nextBoards);
    setMoveTarget(null);
  }

  // ── Active board ──────────────────────────────────────────────────────────────

  const activeName = activeBoardId === "all" ? "All saved"
    : boards.find(b => b.id === activeBoardId)?.name ?? "";

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: "80px" }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>

          {/* ── Header ── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "20px 20px 0", position: "sticky", top: 0, background: "#fff", zIndex: 10,
          }}>
            {activeBoardId !== null ? (
              <>
                <button onClick={() => setActiveBoardId(null)} style={iconBtn}>
                  <BackArrow />
                </button>
                <span style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "-0.3px" }}>{activeName}</span>
                <div style={{ width: "32px" }} />
              </>
            ) : (
              <>
                <span style={{ fontSize: "22px", fontWeight: 600, letterSpacing: "-0.5px" }}>Saved</span>
                <button onClick={() => setCreateOpen(true)} style={iconBtn}>
                  <PlusIcon />
                </button>
              </>
            )}
          </div>

          {/* ── Boards grid ── */}
          {activeBoardId === null && (
            <div style={{ padding: "20px" }}>
              {items.length === 0 && boards.length === 0 ? (
                <EmptyState />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  {/* All saved (always first) */}
                  <BoardCard
                    name="All saved"
                    count={items.length}
                    collageItems={items.slice(0, 4)}
                    onTap={() => setActiveBoardId("all")}
                  />
                  {boards.map(board => (
                    <BoardCard
                      key={board.id}
                      name={board.name}
                      count={board.itemIds.length}
                      collageItems={boardItems(board.id).slice(0, 4)}
                      onTap={() => setActiveBoardId(board.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Board detail ── */}
          {activeBoardId !== null && (() => {
            const visibleItems = boardItems(activeBoardId);
            return (
              <div style={{ padding: "16px 20px 0" }}>
                {visibleItems.length === 0 ? (
                  <div style={{ textAlign: "center", paddingTop: "60px" }}>
                    <p style={{ fontSize: "14px", color: "#aaa" }}>No items in this board yet.</p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    {visibleItems.map(item => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        boardId={activeBoardId}
                        onTap={() => setDetailItem(item)}
                        onLongPress={() => setLP({ item, boardId: activeBoardId })}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      <NomiNav />

      {/* ── Create board modal ── */}
      {createOpen && (
        <div
          onClick={() => { setCreateOpen(false); setNewBoardName(""); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "340px" }}>
            <p style={{ fontSize: "17px", fontWeight: 600, letterSpacing: "-0.3px", marginBottom: "16px" }}>New board</p>
            <input
              autoFocus type="text" placeholder="Board name"
              value={newBoardName}
              onChange={e => setNewBoardName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createBoard()}
              style={{ width: "100%", padding: "13px 16px", borderRadius: "12px", border: "1.5px solid #e8e8e8", fontSize: "15px", outline: "none" }}
            />
            <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
              <button onClick={() => { setCreateOpen(false); setNewBoardName(""); }} style={{ flex: 1, padding: "13px", borderRadius: "12px", border: "1.5px solid #e8e8e8", background: "#fff", color: "#444", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={createBoard} style={{ flex: 2, padding: "13px", borderRadius: "12px", border: "none", background: newBoardName.trim() ? "#000" : "#e8e8e8", color: newBoardName.trim() ? "#fff" : "#aaa", fontSize: "14px", fontWeight: 600, cursor: newBoardName.trim() ? "pointer" : "default" }}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Item detail overlay ── */}
      {detailItem && (
        <SavedItemDetail
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onRemove={() => {
            removeItem(detailItem, activeBoardId ?? "all");
            setDetailItem(null);
          }}
        />
      )}

      {/* ── Long press action sheet ── */}
      {longPressTarget && (
        <Sheet onClose={() => setLP(null)}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#aaa", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "8px" }}>
            {longPressTarget.item.name}
          </p>
          <ActionRow
            label="Move to another board"
            onClick={() => { setMoveTarget({ item: longPressTarget.item, fromBoardId: longPressTarget.boardId }); setLP(null); }}
          />
          <ActionRow
            label={longPressTarget.boardId === "all" ? "Remove item" : "Remove from board"}
            destructive
            onClick={() => { removeItem(longPressTarget.item, longPressTarget.boardId); setLP(null); }}
          />
        </Sheet>
      )}

      {/* ── Move to board sheet ── */}
      {moveTarget && (
        <Sheet onClose={() => setMoveTarget(null)}>
          <p style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "-0.2px", marginBottom: "8px" }}>
            Move to...
          </p>
          {boards.filter(b => b.id !== moveTarget.fromBoardId).map(board => (
            <button key={board.id} onClick={() => moveToBoard(moveTarget, board.id)} style={sheetRowBtn}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#f7f6f3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <BookmarkSmall />
              </div>
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#000" }}>{board.name}</span>
            </button>
          ))}
          {boards.filter(b => b.id !== moveTarget.fromBoardId).length === 0 && (
            <p style={{ fontSize: "13px", color: "#aaa", padding: "8px 0" }}>No other boards yet.</p>
          )}
        </Sheet>
      )}
    </>
  );
}

// ─── Board Card ───────────────────────────────────────────────────────────────

function BoardCard({ name, count, collageItems, onTap }: {
  name: string;
  count: number;
  collageItems: SavedItem[];
  onTap: () => void;
}) {
  return (
    <button onClick={onTap} style={{ borderRadius: "16px", border: "none", background: "#f7f6f3", cursor: "pointer", padding: 0, overflow: "hidden", textAlign: "left" }}>
      {/* 2×2 collage */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px", aspectRatio: "1", overflow: "hidden" }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ background: PLACEHOLDER_COLORS[i], overflow: "hidden" }}>
            {collageItems[i]?.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={collageItems[i].image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            )}
          </div>
        ))}
      </div>
      {/* Meta */}
      <div style={{ padding: "10px 12px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
          <BookmarkSmall />
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#000", letterSpacing: "-0.1px" }}>{name}</p>
        </div>
        <p style={{ fontSize: "11px", color: "#aaa" }}>{count} {count === 1 ? "item" : "items"}</p>
      </div>
    </button>
  );
}

// ─── Item Card ────────────────────────────────────────────────────────────────

function ItemCard({ item, boardId, onTap, onLongPress }: {
  item: SavedItem;
  boardId: string;
  onTap: () => void;
  onLongPress: () => void;
}) {
  const lp = useLongPress(onLongPress);
  return (
    <button
      onPointerDown={lp.onPointerDown}
      onPointerUp={lp.onPointerUp}
      onPointerLeave={lp.onPointerLeave}
      onContextMenu={lp.onContextMenu}
      onClick={() => { if (lp.didFire()) return; onTap(); }}
      style={{ borderRadius: "16px", border: "none", background: "#f7f6f3", cursor: "pointer", padding: 0, overflow: "hidden", textAlign: "left" }}
    >
      {/* Image */}
      <div style={{ width: "100%", aspectRatio: "1", background: "#ede9e3", overflow: "hidden" }}>
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PlaceholderIcon />
          </div>
        )}
      </div>
      {/* Info */}
      <div style={{ padding: "10px 11px 12px" }}>
        <p style={{ fontSize: "12px", fontWeight: 600, color: "#000", lineHeight: 1.3, marginBottom: "3px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {item.name}
        </p>
        {item.store && <p style={{ fontSize: "10px", color: "#aaa", marginBottom: "2px" }}>{item.store}</p>}
        {item.price && <p style={{ fontSize: "11px", fontWeight: 600, color: "#c9a96e" }}>{item.price}</p>}
      </div>
    </button>
  );
}

// ─── Saved Item Detail ────────────────────────────────────────────────────────

function SavedItemDetail({ item, onClose, onRemove }: {
  item: SavedItem;
  onClose: () => void;
  onRemove: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  function handleShop() {
    const url = item.searchUrl
      ?? `https://www.google.com/search?tbm=shop&q=${item.name.replace(/\s+/g, "+")}${item.store ? "+" + item.store.replace(/\s+/g, "+") : ""}`;
    window.open(url, "_blank", "noopener");
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 60, display: "flex", flexDirection: "column", alignItems: "center", overflowY: "auto" }}>
      <div style={{ width: "100%", maxWidth: "420px", padding: "0 20px 80px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", padding: "20px 0 28px" }}>
          <button onClick={onClose} style={iconBtn}><BackArrow /></button>
          <span style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "-0.3px", marginLeft: "10px" }}>Saved item</span>
        </div>

        {/* Item image */}
        {item.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt={item.name} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", objectPosition: "top center", borderRadius: "16px", marginBottom: "20px", display: "block" }} />
        )}

        {/* Card */}
        <div style={{ borderRadius: "20px", border: "1px solid #ebebeb", background: "#f7f6f3", padding: "24px", marginBottom: "20px" }}>
          {(item.store || item.price) && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              {item.store && <span style={{ fontSize: "11px", fontWeight: 600, color: "#bbb", letterSpacing: "0.6px", textTransform: "uppercase" }}>{item.store}</span>}
              {item.price && <span style={{ fontSize: "18px", fontWeight: 700, color: "#c9a96e", letterSpacing: "-0.5px" }}>{item.price}</span>}
            </div>
          )}
          <h1 style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-0.4px", lineHeight: 1.25, color: "#000", marginBottom: "16px" }}>
            {item.name}
          </h1>
          <div style={{ height: "1px", background: "#e8e4dd", marginBottom: "16px" }} />
          {item.direction && <p style={{ fontSize: "14px", color: "#444", lineHeight: 1.7, marginBottom: "12px" }}>{item.direction}</p>}
          <p style={{ fontSize: "14px", color: "#6b6b6b", lineHeight: 1.7, fontStyle: "italic" }}>
            &ldquo;{item.reason}&rdquo;
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {(item.searchUrl || item.store) && (
            <button onClick={handleShop} style={{ width: "100%", padding: "15px", borderRadius: "16px", border: "none", background: "#000", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <SearchIcon /> Shop this look
            </button>
          )}
          {confirming ? (
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setConfirming(false)} style={{ flex: 1, padding: "13px", borderRadius: "16px", border: "1.5px solid #e8e8e8", background: "#fff", color: "#444", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>Cancel</button>
              <button onClick={onRemove} style={{ flex: 1, padding: "13px", borderRadius: "16px", border: "none", background: "#ef4444", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>Remove</button>
            </div>
          ) : (
            <button onClick={() => setConfirming(true)} style={{ width: "100%", padding: "13px", borderRadius: "16px", border: "1.5px solid #e8e8e8", background: "#fff", color: "#ef4444", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>
              Remove item
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sheet / Action rows ──────────────────────────────────────────────────────

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 }}>
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: "420px" }}>
        <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "#e0e0e0", margin: "12px auto 0" }} />
        <div style={{ padding: "16px 20px 44px" }}>{children}</div>
      </div>
    </div>
  );
}

function ActionRow({ label, onClick, destructive }: { label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button onClick={onClick} style={{ width: "100%", padding: "15px 0", background: "none", border: "none", borderBottom: "1px solid #f0f0f0", cursor: "pointer", textAlign: "left", fontSize: "15px", fontWeight: 500, color: destructive ? "#ef4444" : "#000" }}>
      {label}
    </button>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "80px", gap: "12px", textAlign: "center" }}>
      <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "#f7f0e4", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "4px" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M5 3h14a1 1 0 011 1v17l-7.5-4.5L5 21V4a1 1 0 011-1z" stroke="#c9a96e" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
      <p style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-0.3px" }}>Nothing saved yet.</p>
      <p style={{ fontSize: "14px", color: "#6b6b6b", lineHeight: 1.6, maxWidth: "240px" }}>
        Save items from your outfit results to build boards.
      </p>
    </div>
  );
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 10); }

const iconBtn: React.CSSProperties = {
  width: "32px", height: "32px",
  background: "none", border: "none", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 0, color: "#000",
};

const sheetRowBtn: React.CSSProperties = {
  width: "100%", padding: "12px 0", background: "none", border: "none",
  borderBottom: "1px solid #f0f0f0", cursor: "pointer",
  display: "flex", alignItems: "center", gap: "12px", textAlign: "left",
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function BackArrow() {
  return <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 4L7 10l5.5 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function PlusIcon() {
  return <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" /></svg>;
}
function BookmarkSmall() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 2h7a.5.5 0 01.5.5v9L6 9.5 2 11.5V2.5a.5.5 0 01.5-.5z" fill="#c9a96e" /></svg>;
}
function SearchIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" /><path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
}
function PlaceholderIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="3" stroke="#ccc" strokeWidth="1.5" /><circle cx="8.5" cy="9.5" r="1.5" stroke="#ccc" strokeWidth="1.25" /><path d="M3 16l4.5-4 3 3 2.5-2.5L17 16" stroke="#ccc" strokeWidth="1.25" strokeLinejoin="round" /></svg>;
}
