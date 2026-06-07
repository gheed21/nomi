"use client";

import { useEffect, useRef, useState } from "react";
import NomiNav from "../components/NomiNav";

// ─── Types ────────────────────────────────────────────────────────────────────

type Message = { role: "user" | "assistant"; content: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const OPENING_MSG =
  "Hey — what do you need today? An outfit, a recommendation, or just tell me what you're working with.";

const QUICK_PROMPTS = [
  "What should I wear this week?",
  "Help me shop on a budget",
  "I have nothing to wear",
];

// ─── Context builder ──────────────────────────────────────────────────────────

function buildUserContext(): string {
  const parts: string[] = [];

  try {
    const raw = localStorage.getItem("nomi_explore_profile");
    if (raw) {
      const profile: Record<string, number> = JSON.parse(raw);
      const top = Object.entries(profile)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([t]) => t);
      if (top.length) parts.push(`Style aesthetics they gravitate toward: ${top.join(", ")}.`);
    }
  } catch { /* quota / parse error */ }

  try {
    const raw = localStorage.getItem("nomi_saved_items");
    if (raw) {
      const items: { attributes?: { category?: string } }[] = JSON.parse(raw);
      const cats = [...new Set(items.flatMap(i => (i.attributes?.category ? [i.attributes.category] : [])))];
      if (cats.length) parts.push(`Saved item categories: ${cats.join(", ")}.`);
    }
  } catch { /* quota / parse error */ }

  try {
    const raw = localStorage.getItem("nomi_current_filters");
    if (raw) {
      const f = JSON.parse(raw);
      const [lo, hi]: [number, number] = f.priceRange ?? [0, 500];
      if (!(lo === 0 && hi === 500)) {
        if (lo === 0)       parts.push(`Budget preference: under $${hi}.`);
        else if (hi >= 500) parts.push(`Budget preference: over $${lo}.`);
        else                parts.push(`Budget preference: $${lo}–$${hi}.`);
      }
    }
  } catch { /* quota / parse error */ }

  return parts.length
    ? `User context (reference naturally when relevant):\n${parts.join("\n")}`
    : "";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: OPENING_MSG },
  ]);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [sentFirst, setSentFirst] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
      const userContext = buildUserContext();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          userContext: userContext || undefined,
        }),
      });
      const data = await res.json();
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: data.text || "Something went wrong — try again." },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Something went wrong — try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div style={{
        position: "fixed", inset: 0,
        background: "#fff",
        display: "flex",
        justifyContent: "center",
      }}>
        <div style={{
          width: "100%",
          maxWidth: "420px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          paddingBottom: "64px", // reserve space for NomiNav
        }}>

          {/* ── Header ── */}
          <div style={{
            padding: "22px 20px 14px",
            borderBottom: "1px solid #f0f0f0",
            flexShrink: 0,
          }}>
            <p style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.5px", color: "#000" }}>
              Nomi
            </p>
            <p style={{ fontSize: "13px", color: "#aaa", marginTop: "3px" }}>
              Your stylist
            </p>
          </div>

          {/* ── Messages ── */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div style={{
                    maxWidth: "78%",
                    padding: "11px 14px",
                    borderRadius: msg.role === "user"
                      ? "18px 18px 4px 18px"
                      : "18px 18px 18px 4px",
                    background: msg.role === "user" ? "#000" : "#f0ede8",
                    color:      msg.role === "user" ? "#fff" : "#000",
                    fontSize: "15px",
                    lineHeight: 1.55,
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* ── Quick prompts ── */}
              {!sentFirst && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingTop: "4px" }}>
                  {QUICK_PROMPTS.map(prompt => (
                    <button
                      key={prompt}
                      onClick={() => send(prompt)}
                      style={{
                        alignSelf: "flex-start",
                        padding: "9px 16px",
                        borderRadius: "99px",
                        border: "1.5px solid #e8e8e8",
                        background: "#fff",
                        color: "#000",
                        fontSize: "14px",
                        fontWeight: 500,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Typing indicator ── */}
              {loading && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{
                    padding: "13px 16px",
                    borderRadius: "18px 18px 18px 4px",
                    background: "#f0ede8",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}>
                    {[0, 1, 2].map(i => (
                      <span
                        key={i}
                        style={{
                          display: "block",
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: "#b0a899",
                          animation: "nomi-pulse 1.2s ease-in-out infinite",
                          animationDelay: `${i * 0.22}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* ── Input bar ── */}
          <div style={{
            padding: "10px 16px 12px",
            borderTop: "1px solid #f0f0f0",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input
                type="text"
                placeholder="Message Nomi..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: "24px",
                  border: "1.5px solid #e8e8e8",
                  fontSize: "15px",
                  background: "#f7f6f3",
                  color: "#000",
                  outline: "none",
                }}
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  border: "none",
                  background: input.trim() && !loading ? "#c9a96e" : "#e8e8e8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: input.trim() && !loading ? "pointer" : "default",
                  flexShrink: 0,
                  transition: "background 0.15s",
                }}
              >
                <SendIcon color={input.trim() && !loading ? "#fff" : "#bbb"} />
              </button>
            </div>
          </div>

        </div>
      </div>

      <NomiNav />
    </>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SendIcon({ color = "#fff" }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M3.5 9h11M10 4.5l4.5 4.5-4.5 4.5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
