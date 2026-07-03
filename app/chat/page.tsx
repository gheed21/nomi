"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import NomiNav from "../components/NomiNav";
import { extractStoreLinks, StoreLink } from "../lib/storeSearch";

// ─── Types ────────────────────────────────────────────────────────────────────

type Message      = { role: "user" | "assistant"; content: string };
type Conversation = { id: string; title: string; messages: Message[]; savedAt: number };
type View         = "chat" | "history" | "conversation";

// ─── Constants ────────────────────────────────────────────────────────────────

const OPENING_MSG =
  "Hey — what do you need today? An outfit, a recommendation, or just tell me what you're working with.";
const OPENING: Message = { role: "assistant", content: OPENING_MSG };

const QUICK_PROMPTS = [
  "What should I wear this week?",
  "Help me shop on a budget",
  "I have nothing to wear",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 10); }

function formatDate(ts: number): string {
  const d   = new Date(ts);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === now.toDateString())       return `Today, ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + `, ${time}`;
}

function buildUserContext(): string {
  const parts: string[] = [];
  let hasBudgetSignal = false;

  try {
    const raw = localStorage.getItem("nomi_taste_profile");
    if (raw) {
      const tp = JSON.parse(raw) as {
        styles?: string[]; styleDescription?: string;
        gender?: string; neverWear?: string;
        budgetMin?: number; budgetMax?: number;
        styleInfluencers?: string; lifeStage?: string; lifeStageDescription?: string;
        shoppingTier?: string; shoppingTierDescription?: string; fitPreferences?: string;
        sizing?: Record<string, string>;
      };
      if (tp.gender && tp.gender !== "All")
        parts.push(`Shopping for: ${tp.gender} clothing only. Only suggest items from the ${tp.gender.toLowerCase()} section.`);
      if (tp.neverWear && tp.neverWear.trim())
        parts.push(`Never suggest: ${tp.neverWear.trim()}. The user does not wear these — never recommend them.`);
      if (tp.styles && tp.styles.length > 0 && !tp.styles.includes("I have no idea"))
        parts.push(`Style aesthetic: ${tp.styles.join(", ")}.`);
      if (tp.styleDescription)
        parts.push(`Their own style description: "${tp.styleDescription}"`);
      if (tp.lifeStage && tp.lifeStage !== "Prefer not to say")
        parts.push(`Life stage: ${tp.lifeStage}.`);
      if (tp.lifeStageDescription)
        parts.push(`Life stage (own words): "${tp.lifeStageDescription}"`);
      if (tp.shoppingTier) {
        parts.push(`Shopping tier: ${tp.shoppingTier}.`);
        hasBudgetSignal = true;
      }
      if (tp.shoppingTierDescription) {
        parts.push(`Shopping habit (own words): "${tp.shoppingTierDescription}"`);
        hasBudgetSignal = true;
      }
      if (tp.styleInfluencers)
        parts.push(`Style inspirations: ${tp.styleInfluencers}`);
      if (tp.fitPreferences)
        parts.push(`Fit preferences: ${tp.fitPreferences}`);
      if (tp.sizing && Object.keys(tp.sizing).length > 0) {
        const sizeStr = Object.entries(tp.sizing).map(([cat, size]) => `${cat}: ${size}`).join(", ");
        parts.push(`Sizing: ${sizeStr}.`);
      }
      if (tp.budgetMin !== undefined && tp.budgetMax !== undefined) {
        const [lo, hi] = [tp.budgetMin, tp.budgetMax];
        if (!(lo === 0 && hi === 1000)) {
          if (lo === 0)        parts.push(`Budget preference: under $${hi}.`);
          else if (hi >= 1000) parts.push(`Budget preference: over $${lo}.`);
          else                 parts.push(`Budget preference: $${lo}–$${hi}.`);
          hasBudgetSignal = true;
        }
      }
    }
  } catch { /* ignore */ }

  try {
    const raw = localStorage.getItem("nomi_saved_items");
    if (raw) {
      const cats = [...new Set((JSON.parse(raw) as { attributes?: { category?: string } }[])
        .flatMap(i => i.attributes?.category ? [i.attributes.category] : []))];
      if (cats.length) parts.push(`Saved item categories: ${cats.join(", ")}.`);
    }
  } catch { /* ignore */ }

  try {
    const raw = localStorage.getItem("nomi_current_filters");
    if (raw) {
      const [lo, hi]: [number, number] = (JSON.parse(raw) as { priceRange?: [number, number] }).priceRange ?? [0, 1000];
      if (!(lo === 0 && hi === 1000)) {
        if (lo === 0)        parts.push(`Budget preference: under $${hi}.`);
        else if (hi >= 1000) parts.push(`Budget preference: over $${lo}.`);
        else                 parts.push(`Budget preference: $${lo}–$${hi}.`);
        hasBudgetSignal = true;
      }
    }
  } catch { /* ignore */ }

  // No budget signal anywhere — instruct Nomi to ask rather than assume a price tier.
  if (!hasBudgetSignal) {
    parts.push(`Budget: unknown — don't assume a price tier. Give a recommendation, then use your one follow-up question to ask what budget they're working with if price hasn't come up yet.`);
  }

  return parts.length ? `User context (reference naturally when relevant):\n${parts.join("\n")}` : "";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [messages,       setMessages]       = useState<Message[]>([OPENING]);
  const [input,          setInput]          = useState("");
  const [loading,        setLoading]        = useState(false);
  const [sentFirst,      setSentFirst]      = useState(false);
  const [menuOpen,       setMenuOpen]       = useState(false);
  const [view,           setView]           = useState<View>("chat");
  const [conversations,  setConversations]  = useState<Conversation[]>([]);
  const [selectedConv,   setSelectedConv]   = useState<Conversation | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [confirmDeleteId,  setConfirmDeleteId]  = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const menuRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setConversations(JSON.parse(localStorage.getItem("nomi_conversations") ?? "[]"));
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  useEffect(() => {
    if (view === "chat") bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, view]);

  function saveCurrentConversation() {
    const userMsg = messages.find(m => m.role === "user");
    if (!userMsg) return;
    const conv: Conversation = {
      id: uid(),
      title: userMsg.content.slice(0, 60),
      messages,
      savedAt: Date.now(),
    };
    const prev: Conversation[] = JSON.parse(localStorage.getItem("nomi_conversations") ?? "[]");
    const next = [conv, ...prev];
    localStorage.setItem("nomi_conversations", JSON.stringify(next));
    setConversations(next);
  }

  function handleNewChat() {
    saveCurrentConversation();
    setMessages([OPENING]);
    setSentFirst(false);
    setInput("");
    setMenuOpen(false);
  }

  function handleClearAll() {
    localStorage.removeItem("nomi_conversations");
    setConversations([]);
    setMessages([OPENING]);
    setSentFirst(false);
    setInput("");
    setShowClearConfirm(false);
    setMenuOpen(false);
  }

  function deleteConversation(id: string) {
    const next = conversations.filter(c => c.id !== id);
    localStorage.setItem("nomi_conversations", JSON.stringify(next));
    setConversations(next);
    if (selectedConv?.id === id) setView("history");
  }

  function openHistory() {
    setConversations(JSON.parse(localStorage.getItem("nomi_conversations") ?? "[]"));
    setView("history");
    setMenuOpen(false);
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg: Message = { role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setSentFirst(true);
    setLoading(true);
    try {
      const res  = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, userContext: buildUserContext() || undefined }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.text || "Something went wrong — try again." }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong — try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div style={{ height: "100svh", overflow: "hidden", background: "#fff", display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: "420px", height: "100%", display: "flex", flexDirection: "column", paddingBottom: "64px" }}>

          {/* ── Chat view ── */}
          {view === "chat" && (
            <>
              {/* Header */}
              <div style={{ padding: "22px 20px 14px", borderBottom: "1px solid #f0f0f0", flexShrink: 0, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.5px", color: "#000" }}>Nomi</p>
                  <p style={{ fontSize: "13px", color: "#aaa", marginTop: "3px" }}>Your stylist</p>
                </div>
                {/* Three-dots menu */}
                <div ref={menuRef} style={{ position: "relative", marginTop: "4px" }}>
                  <button
                    onClick={() => setMenuOpen(o => !o)}
                    style={{ width: "36px", height: "36px", borderRadius: "50%", border: "none", background: menuOpen ? "#f0ede8" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}
                  >
                    <DotsIcon />
                  </button>
                  {menuOpen && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 6px)", right: 0,
                      background: "#fff", borderRadius: "12px",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)",
                      minWidth: "170px", overflow: "hidden", zIndex: 200,
                    }}>
                      <MenuRow label="New chat"  onClick={handleNewChat} />
                      <MenuRow label="History"   onClick={openHistory} />
                      <div style={{ height: "1px", background: "#f0f0f0" }} />
                      <MenuRow label="Clear all" onClick={() => { setMenuOpen(false); setShowClearConfirm(true); }} destructive />
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px", userSelect: "text" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {messages.map((msg, i) => (
                    <MessageBubble key={i} msg={msg} />
                  ))}

                  {!sentFirst && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingTop: "4px" }}>
                      {QUICK_PROMPTS.map(p => (
                        <button key={p} onClick={() => send(p)} style={{ alignSelf: "flex-start", padding: "9px 16px", borderRadius: "99px", border: "1.5px solid #e8e8e8", background: "#fff", color: "#000", fontSize: "14px", fontWeight: 500, cursor: "pointer", textAlign: "left" }}>
                          {p}
                        </button>
                      ))}
                    </div>
                  )}

                  {loading && (
                    <div style={{ display: "flex", justifyContent: "flex-start" }}>
                      <div style={{ padding: "13px 16px", borderRadius: "18px 18px 18px 4px", background: "#f0ede8", display: "flex", alignItems: "center", gap: "5px" }}>
                        {[0, 1, 2].map(i => (
                          <span key={i} style={{ display: "block", width: "6px", height: "6px", borderRadius: "50%", background: "#b0a899", animation: "nomi-pulse 1.2s ease-in-out infinite", animationDelay: `${i * 0.22}s` }} />
                        ))}
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              </div>

              {/* Input bar */}
              <div style={{ padding: "10px 16px 12px", borderTop: "1px solid #f0f0f0", flexShrink: 0 }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input
                    type="text" placeholder="Message Nomi..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                    style={{ flex: 1, padding: "12px 16px", borderRadius: "24px", border: "1.5px solid #e8e8e8", fontSize: "15px", background: "#f7f6f3", color: "#000", outline: "none" }}
                  />
                  <button
                    onClick={() => send(input)}
                    disabled={!input.trim() || loading}
                    style={{ width: "44px", height: "44px", borderRadius: "50%", border: "none", background: input.trim() && !loading ? "#c9a96e" : "#e8e8e8", display: "flex", alignItems: "center", justifyContent: "center", cursor: input.trim() && !loading ? "pointer" : "default", flexShrink: 0, transition: "background 0.15s" }}
                  >
                    <SendIcon color={input.trim() && !loading ? "#fff" : "#bbb"} />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── History view ── */}
          {view === "history" && (
            <>
              <div style={{ padding: "22px 20px 14px", borderBottom: "1px solid #f0f0f0", flexShrink: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                <button onClick={() => setView("chat")} style={iconBtn}><BackArrow /></button>
                <p style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-0.4px" }}>Conversations</p>
              </div>

              <div style={{ flex: 1, overflowY: "auto" }}>
                {conversations.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "80px", gap: "10px", textAlign: "center", padding: "80px 32px 0" }}>
                    <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "#f7f0e4", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "4px" }}>
                      <ChatHistoryIcon />
                    </div>
                    <p style={{ fontSize: "17px", fontWeight: 600, letterSpacing: "-0.3px" }}>No past conversations</p>
                    <p style={{ fontSize: "14px", color: "#aaa", lineHeight: 1.6 }}>Start a new chat and use &ldquo;New chat&rdquo; to save it here.</p>
                  </div>
                ) : (
                  <div style={{ padding: "8px 0" }}>
                    {conversations.map(conv => (
                      <div key={conv.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                        {confirmDeleteId === conv.id ? (
                          /* ── Inline delete confirmation ── */
                          <div style={{ display: "flex", alignItems: "center", padding: "14px 20px", gap: "12px", background: "#fff9f9" }}>
                            <p style={{ flex: 1, fontSize: "13px", color: "#444", lineHeight: 1.4 }}>Delete this conversation?</p>
                            <button
                              onClick={() => { deleteConversation(conv.id); setConfirmDeleteId(null); }}
                              style={{ padding: "6px 14px", borderRadius: "8px", border: "none", background: "#ef4444", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              style={{ background: "none", border: "none", fontSize: "13px", color: "#aaa", cursor: "pointer", padding: "6px 2px", flexShrink: 0 }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          /* ── Normal row ── */
                          <div style={{ display: "flex", alignItems: "center", padding: "14px 20px", cursor: "pointer" }}
                            onClick={() => { setSelectedConv(conv); setView("conversation"); }}>
                            <div style={{ flex: 1, minWidth: 0, marginRight: "12px" }}>
                              <p style={{ fontSize: "14px", fontWeight: 600, color: "#000", letterSpacing: "-0.1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {conv.title}
                              </p>
                              <p style={{ fontSize: "12px", color: "#aaa", marginTop: "3px" }}>{formatDate(conv.savedAt)}</p>
                            </div>
                            <button
                              onClick={e => { e.stopPropagation(); setConfirmDeleteId(conv.id); }}
                              style={{ width: "32px", height: "32px", borderRadius: "50%", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#ccc", flexShrink: 0 }}
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Read-only conversation view ── */}
          {view === "conversation" && selectedConv && (
            <>
              <div style={{ padding: "22px 20px 14px", borderBottom: "1px solid #f0f0f0", flexShrink: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                <button onClick={() => setView("history")} style={iconBtn}><BackArrow /></button>
                <p style={{ fontSize: "15px", fontWeight: 600, letterSpacing: "-0.3px", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {selectedConv.title}
                </p>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "16px", userSelect: "text" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {selectedConv.messages.map((msg, i) => (
                    <MessageBubble key={i} msg={msg} />
                  ))}
                </div>
              </div>

              <div style={{ padding: "12px 20px 14px", borderTop: "1px solid #f0f0f0", flexShrink: 0, textAlign: "center" }}>
                <p style={{ fontSize: "12px", color: "#bbb" }}>Read-only · {formatDate(selectedConv.savedAt)}</p>
              </div>
            </>
          )}

        </div>
      </div>

      {/* ── Clear all confirmation ── */}
      {showClearConfirm && (
        <div
          onClick={() => setShowClearConfirm(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: "24px" }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "20px", padding: "28px 24px", width: "100%", maxWidth: "320px" }}>
            <p style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.3px", marginBottom: "8px" }}>Delete all conversations?</p>
            <p style={{ fontSize: "14px", color: "#888", lineHeight: 1.55, marginBottom: "24px" }}>This can&apos;t be undone.</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setShowClearConfirm(false)} style={{ flex: 1, padding: "13px", borderRadius: "12px", border: "1.5px solid #e8e8e8", background: "#fff", color: "#444", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={handleClearAll} style={{ flex: 1, padding: "13px", borderRadius: "12px", border: "none", background: "#ef4444", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                Delete all
              </button>
            </div>
          </div>
        </div>
      )}

      <NomiNav />
    </>
  );
}

// ─── Small components ─────────────────────────────────────────────────────────

function ChipThumbnail({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src} alt=""
      onError={() => setFailed(true)}
      style={{
        width: "18px", height: "18px", borderRadius: "4px",
        objectFit: "cover", objectPosition: "top center",
        flexShrink: 0, display: "block", marginRight: "5px",
        opacity: 0.75,
      }}
    />
  );
}

// Splices verified product links inline into the message text.
// chip.item is a verbatim substring of the text (extracted by extractStoreLinks),
// so indexOf finds it reliably. When a chip.item appears multiple times we prefer
// the occurrence nearest to the store name mention.
function renderWithLinks(text: string, chips: StoreLink[]): ReactNode {
  type Span = { start: number; end: number; href: string };
  const spans: Span[] = [];
  const lower = text.toLowerCase();

  for (const chip of chips) {
    const href = chip.productLink ?? chip.url;
    const needle = chip.item.toLowerCase();
    const storeIdx = lower.indexOf(chip.displayName.toLowerCase());

    // Collect all positions where this item phrase appears
    const hits: number[] = [];
    let i = 0;
    while ((i = lower.indexOf(needle, i)) !== -1) { hits.push(i); i += needle.length; }
    if (!hits.length) continue;

    // Prefer the hit closest to the store mention
    const best = storeIdx === -1
      ? hits[0]
      : hits.reduce((a, b) => Math.abs(a - storeIdx) <= Math.abs(b - storeIdx) ? a : b);

    spans.push({ start: best, end: best + chip.item.length, href });
  }

  if (!spans.length) return text;

  // Sort then remove overlaps (first span wins)
  spans.sort((a, b) => a.start - b.start);
  const kept: Span[] = [];
  let cursor = 0;
  for (const s of spans) {
    if (s.start >= cursor) { kept.push(s); cursor = s.end; }
  }

  // Build React node array: plain text segments interleaved with <a> elements
  const nodes: ReactNode[] = [];
  let pos = 0;
  for (const { start, end, href } of kept) {
    if (start > pos) nodes.push(text.slice(pos, start));
    nodes.push(
      <a key={start} href={href} target="_blank" rel="noopener noreferrer"
        style={{ color: "#c9a96e", textDecoration: "underline", textDecorationColor: "#c9a96e" }}>
        {text.slice(start, end)}
      </a>
    );
    pos = end;
  }
  if (pos < text.length) nodes.push(text.slice(pos));
  return <>{nodes}</>;
}

function MessageBubble({ msg }: { msg: { role: "user" | "assistant"; content: string } }) {
  const allLinks = useMemo(
    () => msg.role === "assistant" ? extractStoreLinks(msg.content) : [],
    [msg.content, msg.role],
  );

  // Chips with no item name (e.g. "Shop at Zara →") render immediately —
  // there's no item+store pairing that can be wrong, so no gate needed.
  const noItemLinks = useMemo(() => allLinks.filter(l => !l.item), [allLinks]);

  // Chips with an item name are held until SerpAPI confirms the pairing is real.
  // null = pending (not yet verified); [] = done but all suppressed.
  const [verifiedLinks, setVerifiedLinks] = useState<StoreLink[] | null>(null);

  useEffect(() => {
    if (msg.role !== "assistant") return;

    const toVerify = allLinks.filter(l => !!l.item);
    setVerifiedLinks(null); // hold while in-flight

    if (!toVerify.length) { setVerifiedLinks([]); return; }

    let cancelled = false;
    fetch("/api/enrich-chips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chips: toVerify.map(l => ({ item: l.item, store: l.displayName, searchUrl: l.url })) }),
    })
      .then(r => r.json())
      .then(({ results }: { results: { verified: boolean; image: string | null; productLink: string | null }[] }) => {
        if (cancelled) return;
        const kept = toVerify
          .map((l, i) => {
            const e = results[i];
            if (!e?.verified) return null; // unverified → suppress entirely
            const enriched: StoreLink = { ...l };
            if (e.image)       enriched.image       = e.image;
            if (e.productLink) enriched.productLink = e.productLink;
            return enriched;
          })
          .filter((l): l is StoreLink => l !== null);
        setVerifiedLinks(kept);
      })
      .catch(() => setVerifiedLinks([])); // on error show nothing rather than wrong chips

    return () => { cancelled = true; };
  }, [allLinks, msg.role]);

  // While item chips are pending, show only no-item chips (avoids flash of wrong chips)
  const links = [...noItemLinks, ...(verifiedLinks ?? [])];

  return (
    <div style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
      <div style={{ maxWidth: "78%", display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{
          padding: "11px 14px",
          borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          background: msg.role === "user" ? "#000" : "#f0ede8",
          color:      msg.role === "user" ? "#fff" : "#000",
          fontSize: "15px", lineHeight: 1.55,
          userSelect: msg.role === "assistant" ? "text" : undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(msg.role === "assistant" && { WebkitUserSelect: "text", WebkitTouchCallout: "default" } as any),
        }}>
          {verifiedLinks?.length
            ? renderWithLinks(msg.content, verifiedLinks.filter(l => l.item && (l.productLink || l.url)))
            : msg.content}
        </div>
        {links.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {links.map((link, i) => (
              <a
                key={i}
                href={link.productLink ?? link.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center",
                  padding: link.image ? "5px 10px 5px 7px" : "5px 10px",
                  borderRadius: "99px",
                  border: `1.5px solid ${link.fallback ? "#d4c9be" : "#e8ddd0"}`,
                  background: link.fallback ? "#f5f2ef" : "#faf7f3",
                  color: link.fallback ? "#9a8070" : "#8b6b3d",
                  fontSize: "12px", fontWeight: 500,
                  textDecoration: "none", whiteSpace: "nowrap",
                }}
              >
                {link.image && <ChipThumbnail src={link.image} />}
                {link.fallback
                  ? (link.item ? `Search ${link.item} at ${link.displayName}` : `Search ${link.displayName}`)
                  : (link.item ? `Shop ${link.item} at ${link.displayName}` : `Shop at ${link.displayName}`)
                } →
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MenuRow({ label, onClick, destructive }: { label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{ width: "100%", padding: "13px 16px", background: "none", border: "none", textAlign: "left", fontSize: "14px", fontWeight: 500, color: destructive ? "#ef4444" : "#000", cursor: "pointer", display: "block" }}
    >
      {label}
    </button>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SendIcon({ color = "#fff" }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3.5 9h11M10 4.5l4.5 4.5-4.5 4.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="4"  r="1.4" fill="currentColor" />
      <circle cx="9" cy="9"  r="1.4" fill="currentColor" />
      <circle cx="9" cy="14" r="1.4" fill="currentColor" />
    </svg>
  );
}

function BackArrow() {
  return <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 4L7 10l5.5 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2.5 4.5h11M6 4.5V3h4v1.5M6.5 7v5M9.5 7v5M3.5 4.5l.75 8.5A1 1 0 005.25 14h5.5a1 1 0 001-.95l.75-8.55" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChatHistoryIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 5a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H8l-5 3V5z" stroke="#c9a96e" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

const iconBtn: React.CSSProperties = {
  width: "32px", height: "32px", background: "none", border: "none",
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  padding: 0, color: "#000", flexShrink: 0,
};
