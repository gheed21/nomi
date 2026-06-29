"use client";

import { useEffect, useRef, useState } from "react";
import NomiNav from "../components/NomiNav";
import ShareToExploreModal, { type CommunityLook } from "../components/ShareToExploreModal";
import ItemThumbnail from "../components/ItemThumbnail";

// ─── Types ────────────────────────────────────────────────────────────────────

// Legacy flat item (read-only, for migration)
type SavedItem = {
  id: string; name: string; store?: string; price?: string;
  reason: string; searchUrl?: string; direction?: string;
  image?: string;
  attributes?: { color?: string; category?: string; aesthetic?: string };
  savedAt: number;
};

// Grouped look (current model)
type LookItem = {
  id: string; name: string; store?: string; price?: string;
  reason?: string; searchUrl?: string; direction?: string;
  image?: string; isOriginal?: boolean;
  imageTier?: "confident" | "broad";
  attributes?: { color?: string; category?: string; aesthetic?: string };
};
type SavedLook = { id: string; savedAt: number; uploadedImage?: string; items: LookItem[] };

type Board = {
  id: string;
  name: string;
  itemIds: string[];    // legacy
  lookIds?: string[];   // new
  createdAt: number;
};

type LongPressTarget = { look: SavedLook; boardId: string };
type MoveTarget      = { look: SavedLook; fromBoardId: string };
type ShareTarget     = { boardName: string; looks: SavedLook[] };

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
  const [looks,          setLooks]         = useState<SavedLook[]>([]);
  const [boards,         setBoards]        = useState<Board[]>([]);
  const [activeBoardId,  setActiveBoardId] = useState<string | null>(null);
  const [createOpen,     setCreateOpen]    = useState(false);
  const [newBoardName,   setNewBoardName]  = useState("");
  const [detailLook,     setDetailLook]    = useState<SavedLook | null>(null);
  const [longPressTarget, setLP]           = useState<LongPressTarget | null>(null);
  const [moveTarget,     setMoveTarget]    = useState<MoveTarget | null>(null);
  const [shareTarget,    setShareTarget]   = useState<ShareTarget | null>(null);
  const [shareConfirmed, setShareConfirmed] = useState(false);
  const [savedTab,       setSavedTab]       = useState<"boards" | "posts">("boards");
  const [myPosts,        setMyPosts]        = useState<CommunityLook[]>([]);

  function load() {
    const storedLooks: SavedLook[] = JSON.parse(localStorage.getItem("nomi_saved_looks") ?? "[]");

    // Migration: wrap any legacy flat SavedItems as single-item looks on first load
    const legacyItems: SavedItem[] = JSON.parse(localStorage.getItem("nomi_saved_items") ?? "[]");
    if (legacyItems.length > 0 && storedLooks.length === 0) {
      const migrated: SavedLook[] = legacyItems.map(item => ({
        id: uid(),
        savedAt: item.savedAt,
        uploadedImage: item.image,
        items: [{
          id: item.id, name: item.name, store: item.store, price: item.price,
          reason: item.reason, searchUrl: item.searchUrl, direction: item.direction,
          image: item.image, isOriginal: false, attributes: item.attributes,
        }],
      }));
      try {
        localStorage.setItem("nomi_saved_looks", JSON.stringify(migrated));
      } catch { /* ignore */ }
      setLooks(migrated);
    } else {
      setLooks(storedLooks);
    }

    setBoards(JSON.parse(localStorage.getItem("nomi_boards") ?? "[]"));
  }

  function reloadMyPosts() {
    const myIds: string[] = JSON.parse(localStorage.getItem("nomi_my_post_ids") ?? "[]");
    const all: CommunityLook[] = JSON.parse(localStorage.getItem("nomi_community_looks") ?? "[]");
    setMyPosts(all.filter(l => myIds.includes(l.id)));
  }

  function removePost(id: string) {
    const all: CommunityLook[] = JSON.parse(localStorage.getItem("nomi_community_looks") ?? "[]");
    localStorage.setItem("nomi_community_looks", JSON.stringify(all.filter(l => l.id !== id)));
    setMyPosts(prev => prev.filter(l => l.id !== id));
  }

  useEffect(() => { load(); reloadMyPosts(); }, []);

  // ── Board helpers ────────────────────────────────────────────────────────────

  function boardLooks(boardId: string): SavedLook[] {
    if (boardId === "all") return looks;
    const b = boards.find(b => b.id === boardId);
    const ids = b?.lookIds ?? [];
    return ids.map(id => looks.find(l => l.id === id)).filter(Boolean) as SavedLook[];
  }

  function createBoard() {
    if (!newBoardName.trim()) return;
    const board: Board = { id: uid(), name: newBoardName.trim(), itemIds: [], lookIds: [], createdAt: Date.now() };
    const next = [...boards, board];
    localStorage.setItem("nomi_boards", JSON.stringify(next));
    setBoards(next);
    setCreateOpen(false);
    setNewBoardName("");
  }

  function removeLook(look: SavedLook, fromBoardId: string) {
    if (fromBoardId === "all") {
      const nextLooks = looks.filter(l => l.id !== look.id);
      const nextBoards = boards.map(b => ({ ...b, lookIds: (b.lookIds ?? []).filter(id => id !== look.id) }));
      localStorage.setItem("nomi_saved_looks", JSON.stringify(nextLooks));
      localStorage.setItem("nomi_boards",      JSON.stringify(nextBoards));
      setLooks(nextLooks); setBoards(nextBoards);
    } else {
      const nextBoards = boards.map(b =>
        b.id === fromBoardId ? { ...b, lookIds: (b.lookIds ?? []).filter(id => id !== look.id) } : b
      );
      localStorage.setItem("nomi_boards", JSON.stringify(nextBoards));
      setBoards(nextBoards);
    }
    if (detailLook?.id === look.id) setDetailLook(null);
  }

  function moveToBoard(target: MoveTarget, toBoardId: string) {
    const nextBoards = boards.map(b => {
      if (b.id === target.fromBoardId) return { ...b, lookIds: (b.lookIds ?? []).filter(id => id !== target.look.id) };
      if (b.id === toBoardId)          return { ...b, lookIds: [target.look.id, ...(b.lookIds ?? [])] };
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
          <div style={{ position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 0" }}>
              {activeBoardId !== null ? (
                <>
                  <button onClick={() => setActiveBoardId(null)} style={iconBtn}><BackArrow /></button>
                  <span style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "-0.3px" }}>{activeName}</span>
                  <div style={{ width: "32px" }} />
                </>
              ) : (
                <>
                  <span style={{ fontSize: "22px", fontWeight: 600, letterSpacing: "-0.5px" }}>Saved</span>
                  {savedTab === "boards" && (
                    <button onClick={() => setCreateOpen(true)} style={iconBtn}><PlusIcon /></button>
                  )}
                  {savedTab === "posts" && <div style={{ width: "32px" }} />}
                </>
              )}
            </div>
            {/* Boards / Your posts tabs */}
            {activeBoardId === null && (
              <div style={{ display: "flex", gap: "24px", padding: "12px 20px 0" }}>
                {(["boards", "posts"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setSavedTab(tab)}
                    style={{
                      background: "none", border: "none", padding: "0 0 10px", cursor: "pointer",
                      fontSize: "14px", fontWeight: savedTab === tab ? 600 : 400,
                      color: savedTab === tab ? "#000" : "#aaa",
                      borderBottom: savedTab === tab ? "2px solid #c9a96e" : "2px solid transparent",
                      transition: "color 0.12s, border-color 0.12s",
                    }}
                  >
                    {tab === "boards" ? "Boards" : "Your posts"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Boards grid ── */}
          {activeBoardId === null && savedTab === "boards" && (
            <div style={{ padding: "20px" }}>
              {looks.length === 0 && boards.length === 0 ? (
                <EmptyState />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <BoardCard
                    name="All saved"
                    count={looks.length}
                    collageLooks={looks.slice(0, 4)}
                    onTap={() => setActiveBoardId("all")}
                    onShare={() => setShareTarget({ boardName: "All saved", looks })}
                  />
                  {boards.map(board => {
                    const bl = boardLooks(board.id);
                    return (
                      <BoardCard
                        key={board.id}
                        name={board.name}
                        count={bl.length}
                        collageLooks={bl.slice(0, 4)}
                        onTap={() => setActiveBoardId(board.id)}
                        onShare={() => setShareTarget({ boardName: board.name, looks: bl })}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Your posts ── */}
          {activeBoardId === null && savedTab === "posts" && (
            <div style={{ padding: "16px 20px 80px" }}>
              {myPosts.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "60px", gap: "10px", textAlign: "center" }}>
                  <p style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "-0.2px" }}>Nothing shared yet.</p>
                  <p style={{ fontSize: "13px", color: "#aaa", lineHeight: 1.6, maxWidth: "220px" }}>Share a board or a saved look to Explore and it will appear here.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {myPosts.map(look => (
                    <MyPostCard key={look.id} look={look} onRemove={() => removePost(look.id)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Board detail ── */}
          {activeBoardId !== null && (() => {
            const visibleLooks = boardLooks(activeBoardId);
            return (
              <div style={{ padding: "16px 20px 0" }}>
                {visibleLooks.length === 0 ? (
                  <div style={{ textAlign: "center", paddingTop: "60px" }}>
                    <p style={{ fontSize: "14px", color: "#aaa" }}>No looks in this board yet.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {visibleLooks.map(look => (
                      <LookCard
                        key={look.id}
                        look={look}
                        onTap={() => setDetailLook(look)}
                        onLongPress={() => setLP({ look, boardId: activeBoardId })}
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

      {/* ── Share to Explore modal ── */}
      {shareTarget && (() => {
        const itemsWithImages = shareTarget.looks.flatMap(l => l.items).filter(i => !!i.image).slice(0, 4);
        return (
        <ShareToExploreModal
          images={itemsWithImages.map(i => i.image as string)}
          tiers={itemsWithImages.map(i => i.imageTier ?? "confident")}
          pieces={shareTarget.looks.flatMap(l =>
            l.items
              .filter(i => !i.isOriginal)
              .map(i => ({ name: i.name, store: i.store, price: i.price, searchUrl: i.searchUrl, category: i.attributes?.category }))
          )}
          onClose={() => setShareTarget(null)}
          onShared={() => {
            setShareTarget(null);
            setShareConfirmed(true);
            reloadMyPosts();
            setTimeout(() => setShareConfirmed(false), 2500);
          }}
        />
        );
      })()}

      {/* ── Share confirmation toast ── */}
      {shareConfirmed && (
        <div style={{ position: "fixed", bottom: "90px", left: "50%", transform: "translateX(-50%)", background: "#000", color: "#fff", fontSize: "13px", fontWeight: 500, padding: "10px 20px", borderRadius: "99px", zIndex: 400, whiteSpace: "nowrap", pointerEvents: "none" }}>
          Shared to Explore.
        </div>
      )}

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

      {/* ── Look detail overlay ── */}
      {detailLook && (
        <LookDetail
          look={detailLook}
          onClose={() => setDetailLook(null)}
          onShare={() => setShareTarget({ boardName: "Saved look", looks: [detailLook] })}
          onRemove={() => {
            removeLook(detailLook, activeBoardId ?? "all");
            setDetailLook(null);
          }}
        />
      )}

      {/* ── Long press action sheet ── */}
      {longPressTarget && (
        <Sheet onClose={() => setLP(null)}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#aaa", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "8px" }}>
            {longPressTarget.look.items.find(i => i.isOriginal)?.name ?? "Saved look"}
          </p>
          <ActionRow
            label="Move to another board"
            onClick={() => { setMoveTarget({ look: longPressTarget.look, fromBoardId: longPressTarget.boardId }); setLP(null); }}
          />
          <ActionRow
            label={longPressTarget.boardId === "all" ? "Remove look" : "Remove from board"}
            destructive
            onClick={() => { removeLook(longPressTarget.look, longPressTarget.boardId); setLP(null); }}
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

// Collage picks the first image from each look, up to 4 slots
function lookCollageImages(collageLooks: SavedLook[]): (string | undefined)[] {
  const images: (string | undefined)[] = [];
  for (const look of collageLooks.slice(0, 4)) {
    const img = look.items.find(i => i.image)?.image;
    images.push(img);
  }
  while (images.length < 4) images.push(undefined);
  return images;
}

function BoardCard({ name, count, collageLooks, onTap, onShare }: {
  name: string;
  count: number;
  collageLooks: SavedLook[];
  onTap: () => void;
  onShare?: () => void;
}) {
  const collageImgs = lookCollageImages(collageLooks);
  return (
    <div style={{ borderRadius: "16px", background: "#f7f6f3", overflow: "hidden", textAlign: "left" }}>
      <div onClick={onTap} style={{ cursor: "pointer" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px", aspectRatio: "1", overflow: "hidden" }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ background: PLACEHOLDER_COLORS[i], overflow: "hidden" }}>
              {collageImgs[i] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={collageImgs[i]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              )}
            </div>
          ))}
        </div>
        <div style={{ padding: "10px 12px 8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
            <BookmarkSmall />
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#000", letterSpacing: "-0.1px" }}>{name}</p>
          </div>
          <p style={{ fontSize: "11px", color: "#aaa" }}>{count} {count === 1 ? "look" : "looks"}</p>
        </div>
      </div>
      {onShare && count > 0 && (
        <div style={{ padding: "0 12px 12px" }}>
          <button
            onClick={onShare}
            style={{ width: "100%", padding: "7px 0", borderRadius: "10px", border: "1px solid #e0dbd4", background: "transparent", color: "#aaa", fontSize: "12px", fontWeight: 500, cursor: "pointer" }}
          >
            Share to Explore
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Look Card ────────────────────────────────────────────────────────────────

function LookCard({ look, onTap, onLongPress }: {
  look: SavedLook; onTap: () => void; onLongPress: () => void;
}) {
  const lp = useLongPress(onLongPress);
  const originalItem  = look.items.find(i => i.isOriginal);
  const matchItems    = look.items.filter(i => !i.isOriginal);
  const matchStores   = [...new Set(matchItems.map(i => i.store).filter(Boolean))] as string[];
  const storeLabel    = matchStores.length === 1 ? matchStores[0] : null;

  return (
    <button
      onPointerDown={lp.onPointerDown} onPointerUp={lp.onPointerUp}
      onPointerLeave={lp.onPointerLeave} onContextMenu={lp.onContextMenu}
      onClick={() => { if (lp.didFire()) return; onTap(); }}
      style={{ width: "100%", border: "1px solid #ebebeb", borderRadius: "16px", background: "#f7f6f3", cursor: "pointer", padding: 0, textAlign: "left", overflow: "hidden" }}
    >
      {/* Thumbnail row — all items in the look */}
      <div style={{ display: "flex", gap: "4px", padding: "12px 12px 8px" }}>
        {look.items.slice(0, 5).map((item, i) => (
          <div key={i} style={{ flex: 1, aspectRatio: "1", borderRadius: "8px", overflow: "hidden", background: PLACEHOLDER_COLORS[i % 4] }}>
            <ItemThumbnail src={item.image} imageTier={item.imageTier} />
          </div>
        ))}
      </div>
      {/* Info */}
      <div style={{ padding: "0 12px 12px" }}>
        <p style={{ fontSize: "12px", fontWeight: 600, color: "#000", lineHeight: 1.3, marginBottom: "3px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
          {originalItem?.name ?? "Saved look"}
        </p>
        <p style={{ fontSize: "11px", color: "#aaa" }}>
          {matchItems.length} {matchItems.length === 1 ? "piece" : "pieces"} saved
          {storeLabel ? ` · ${storeLabel}` : ""}
        </p>
      </div>
    </button>
  );
}

// ─── Look Detail ──────────────────────────────────────────────────────────────

function LookDetail({ look, onClose, onShare, onRemove }: {
  look: SavedLook; onClose: () => void; onShare: () => void; onRemove: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const originalItem = look.items.find(i => i.isOriginal);
  const matchItems   = look.items.filter(i => !i.isOriginal);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 60, display: "flex", flexDirection: "column", alignItems: "center", overflowY: "auto" }}>
      <div style={{ width: "100%", maxWidth: "420px", padding: "0 20px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "20px 0 24px" }}>
          <button onClick={onClose} style={iconBtn}><BackArrow /></button>
          <span style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "-0.3px", marginLeft: "10px" }}>Saved look</span>
        </div>

        {/* Original piece */}
        {originalItem && (
          <div style={{ marginBottom: "20px" }}>
            <p style={{ fontSize: "10px", fontWeight: 600, color: "#bbb", letterSpacing: "0.6px", textTransform: "uppercase", marginBottom: "8px" }}>Your piece</p>
            <div style={{ borderRadius: "14px", overflow: "hidden", background: "#f7f6f3", border: "1px solid #ebebeb" }}>
              {originalItem.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={originalItem.image} alt="" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", objectPosition: "top center", display: "block" }} />
              )}
              {(originalItem.name || originalItem.store) && (
                <div style={{ padding: "12px 14px" }}>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "#000" }}>{originalItem.name}</p>
                  {originalItem.store && <p style={{ fontSize: "12px", color: "#aaa", marginTop: "2px" }}>{originalItem.store}</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Matched items */}
        {matchItems.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <p style={{ fontSize: "10px", fontWeight: 600, color: "#bbb", letterSpacing: "0.6px", textTransform: "uppercase", marginBottom: "8px" }}>Saved with this look</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {matchItems.map((item, i) => (
                <div key={i} style={{ borderRadius: "14px", border: "1px solid #ebebeb", background: "#f7f6f3", padding: "14px 16px", display: "flex", gap: "12px", alignItems: "center" }}>
                  {item.image && (
                    <div style={{ width: "52px", height: "52px", borderRadius: "10px", overflow: "hidden", flexShrink: 0, background: "#ede9e3" }}>
                      <ItemThumbnail src={item.image} imageTier={item.imageTier} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#000", lineHeight: 1.3, marginBottom: "3px" }}>{item.name}</p>
                    {item.store && <p style={{ fontSize: "11px", color: "#aaa" }}>{item.store}</p>}
                    {item.price && <p style={{ fontSize: "12px", fontWeight: 600, color: "#c9a96e", marginTop: "2px" }}>{item.price}</p>}
                  </div>
                  {item.searchUrl && (
                    <a href={item.searchUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "#c9a96e", fontWeight: 500, textDecoration: "none", flexShrink: 0 }}>
                      Shop →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            onClick={onShare}
            style={{ width: "100%", padding: "13px", borderRadius: "16px", border: "none", background: "#c9a96e", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
          >
            Share to Explore
          </button>
          {confirming ? (
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setConfirming(false)} style={{ flex: 1, padding: "13px", borderRadius: "16px", border: "1.5px solid #e8e8e8", background: "#fff", color: "#444", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>Cancel</button>
              <button onClick={onRemove} style={{ flex: 1, padding: "13px", borderRadius: "16px", border: "none", background: "#ef4444", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>Remove</button>
            </div>
          ) : (
            <button onClick={() => setConfirming(true)} style={{ width: "100%", padding: "13px", borderRadius: "16px", border: "1.5px solid #e8e8e8", background: "#fff", color: "#ef4444", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>
              Remove look
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


// ─── My Post Card ────────────────────────────────────────────────────────────

function MyPostCard({ look, onRemove }: { look: CommunityLook; onRemove: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const date      = new Date(look.sharedAt).toLocaleDateString([], { month: "short", day: "numeric" });
  const allImages = look.images?.length ? look.images : (look.image ? [look.image] : []);
  const slots     = allImages.slice(0, 4);

  return (
    <div style={{ borderRadius: "16px", border: "1px solid #ebebeb", overflow: "hidden" }}>
      {slots.length > 0 && (
        <div style={{ display: "flex", gap: "4px", padding: "12px 12px 8px" }}>
          {slots.map((img, i) => (
            <div key={i} style={{ flex: 1, aspectRatio: "1", borderRadius: "8px", overflow: "hidden", background: PLACEHOLDER_COLORS[i % 4] }}>
              <ItemThumbnail src={img} imageTier={look.imageTiers?.[i]} />
            </div>
          ))}
        </div>
      )}
      <div style={{ padding: "14px 16px 16px" }}>
        {look.tags[0] && (
          <span style={{ display: "inline-block", marginBottom: "8px", fontSize: "11px", color: "#888", border: "1px solid #e0dbd4", padding: "3px 10px", borderRadius: "99px" }}>
            {look.tags[0]}
          </span>
        )}
        {look.caption && (
          <p style={{ fontSize: "14px", color: "#000", lineHeight: 1.55, marginBottom: "10px", fontStyle: "italic" }}>
            &ldquo;{look.caption}&rdquo;
          </p>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ fontSize: "12px", color: "#aaa" }}>
            {look.savedCount === 1 ? "1 save" : `${look.savedCount} saves`}
          </span>
          <span style={{ fontSize: "12px", color: "#aaa" }}>{date}</span>
        </div>
        {confirming ? (
          <div style={{ background: "#fff9f9", borderRadius: "12px", padding: "12px" }}>
            <p style={{ fontSize: "13px", color: "#444", marginBottom: "10px" }}>Remove this look from Explore?</p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={onRemove} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "none", background: "#ef4444", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Remove</button>
              <button onClick={() => setConfirming(false)} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1.5px solid #e8e8e8", background: "#fff", color: "#444", fontSize: "13px", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid #e0dbd4", background: "transparent", color: "#aaa", fontSize: "13px", cursor: "pointer" }}>
            Remove from Explore
          </button>
        )}
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
