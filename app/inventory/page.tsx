"use client";

import { useEffect, useRef, useState } from "react";
import BottomNav from "../components/BottomNav";

// ─── Types ───────────────────────────────────────────────────────────────────

type Item = {
  id: string;
  name: string;
  category: string;
  color: string;
  price: string;
  image: string | null;
};

const CATEGORIES = ["Top", "Bottom", "Dress", "Layer", "Shoes", "Accessory"];
const STORAGE_KEY = "nomi_inventory";

const COLOR_MAP: Record<string, string> = {
  ivory: "#FFFFF0", cream: "#FFFDD0", champagne: "#F7E7CE", nude: "#E8CBBF",
  camel: "#C19A6B", tan: "#D2B48C", sand: "#C2B280", stone: "#928E85",
  sage: "#87947A", olive: "#6B7143", forest: "#3A5A40", emerald: "#50C878",
  teal: "#008080", cobalt: "#0047AB", navy: "#001F5B", sky: "#87CEEB",
  blush: "#F4B8C1", rose: "#E8748A", mauve: "#C5899C", dustyrose: "#C4909A",
  burgundy: "#800020", wine: "#722F37", rust: "#B7410E", terracotta: "#E2725B",
  mustard: "#C9962A", gold: "#C9A96E", chocolate: "#7B3F00",
  charcoal: "#36454F", slate: "#708090", silver: "#A8A8A8",
};

function resolveColor(name: string): string {
  const key = name.toLowerCase().replace(/\s+/g, "");
  return COLOR_MAP[key] ?? name;
}

function loadItems(): Item[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); }
  catch { return []; }
}

function saveItems(items: Item[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [storeName, setStoreName] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [detail, setDetail] = useState<Item | null>(null);

  useEffect(() => {
    setStoreName(localStorage.getItem("nomi_store_name") ?? "Your Store");
    setItems(loadItems());
  }, []);

  function handleSave(item: Omit<Item, "id">) {
    setItems(prev => {
      const next = [...prev, { ...item, id: uid() }];
      saveItems(next);
      return next;
    });
    setAddOpen(false);
  }

  function handleRemove(id: string) {
    setItems(prev => {
      const next = prev.filter(i => i.id !== id);
      saveItems(next);
      return next;
    });
    setDetail(null);
  }

  return (
    <>
      <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", paddingBottom: "80px" }}>
        {/* Header */}
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 20px", borderBottom: "1px solid #e8e8e8",
          position: "sticky", top: 0, background: "#fff", zIndex: 10,
        }}>
          <span style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "-0.2px" }}>
            {storeName}
          </span>
          <button onClick={() => setAddOpen(true)} style={goldBtn}>
            + Add item
          </button>
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: "24px 20px" }}>
          {items.length === 0 ? (
            <EmptyState onAdd={() => setAddOpen(true)} />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {items.map(item => (
                <ItemCard key={item.id} item={item} onTap={() => setDetail(item)} />
              ))}
            </div>
          )}
        </main>
      </div>

      <BottomNav active="inventory" />

      {addOpen && (
        <Sheet onClose={() => setAddOpen(false)}>
          <AddItemForm onSave={handleSave} onClose={() => setAddOpen(false)} />
        </Sheet>
      )}

      {detail && (
        <Sheet onClose={() => setDetail(null)}>
          <DetailView
            item={detail}
            onRemove={() => handleRemove(detail.id)}
            onClose={() => setDetail(null)}
          />
        </Sheet>
      )}
    </>
  );
}

// ─── Item Card ───────────────────────────────────────────────────────────────

function ItemCard({ item, onTap }: { item: Item; onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      style={{
        display: "flex", flexDirection: "column",
        borderRadius: "16px", border: "none",
        overflow: "hidden", background: "#f7f6f3",
        cursor: "pointer", textAlign: "left", padding: 0,
      }}
    >
      <div style={{ width: "100%", paddingBottom: "100%", position: "relative", background: "#ede9e3" }}>
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image} alt={item.name}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PlaceholderIcon />
          </div>
        )}
      </div>

      <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: "6px" }}>
        <p style={{
          fontSize: "13px", fontWeight: 600, letterSpacing: "-0.1px",
          color: "#000", lineHeight: 1.3,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {item.name}
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{
            fontSize: "11px", fontWeight: 500, padding: "2px 8px",
            borderRadius: "99px", background: "#e8e4dd", color: "#6b6b6b",
          }}>
            {item.category}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {item.color && (
              <span style={{
                width: "10px", height: "10px", borderRadius: "50%",
                background: resolveColor(item.color),
                border: "1px solid rgba(0,0,0,0.12)",
                flexShrink: 0, display: "inline-block",
              }} />
            )}
            {item.price && (
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#000" }}>
                ${item.price}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", paddingTop: "80px", gap: "12px", textAlign: "center",
    }}>
      <div style={{
        width: "56px", height: "56px", borderRadius: "16px",
        background: "#f7f0e4", display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: "4px",
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="#c9a96e" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </div>
      <p style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-0.3px" }}>
        No items yet.
      </p>
      <p style={{ fontSize: "14px", color: "#6b6b6b", lineHeight: 1.6, maxWidth: "240px" }}>
        Add your first piece to get started.
      </p>
      <button onClick={onAdd} style={{ ...goldBtn, marginTop: "12px", padding: "14px 40px", fontSize: "15px", borderRadius: "16px" }}>
        Add item
      </button>
    </div>
  );
}

// ─── Sheet ───────────────────────────────────────────────────────────────────

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div style={{
        background: "#fff", borderRadius: "20px 20px 0 0",
        width: "100%", maxWidth: "480px",
        maxHeight: "92vh", overflowY: "auto",
      }}>
        <div style={{
          width: "36px", height: "4px", borderRadius: "2px",
          background: "#e0e0e0", margin: "12px auto 0",
        }} />
        <div style={{ padding: "16px 20px 48px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Add Item Form ────────────────────────────────────────────────────────────

function AddItemForm({ onSave, onClose }: {
  onSave: (item: Omit<Item, "id">) => void;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [price, setPrice] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const canSave = !!image && name.trim().length > 0 && category.length > 0;

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setImage(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <SheetHeader title="Add item" onClose={onClose} />

      {/* Photo */}
      <div>
        <Label>Photo</Label>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <button
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          style={{
            width: "100%",
            height: image ? "auto" : "100px",
            minHeight: image ? "120px" : undefined,
            borderRadius: "12px",
            border: `1.5px dashed ${dragOver ? "#c9a96e" : image ? "#c9a96e" : "#e8e8e8"}`,
            background: dragOver ? "#f7f0e4" : "#fafafa",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", overflow: "hidden",
            transition: "border-color 0.15s, background 0.15s",
            padding: 0,
          }}
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="Preview"
              style={{ width: "100%", maxHeight: "240px", objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              <UploadIcon />
              <span style={{ fontSize: "13px", color: "#aaa" }}>Click or drag to upload</span>
            </div>
          )}
        </button>
        {image && (
          <button onClick={() => setImage(null)} style={ghostLink}>Remove photo</button>
        )}
      </div>

      {/* Name */}
      <div>
        <Label>Item name</Label>
        <input type="text" placeholder="e.g. Linen Blazer" value={name}
          onChange={(e) => setName(e.target.value)} style={inputStyle(!!name)} />
      </div>

      {/* Category */}
      <div>
        <Label>Category</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {CATEGORIES.map(cat => {
            const sel = category === cat;
            return (
              <button key={cat} onClick={() => setCategory(cat)} style={{
                padding: "8px 16px", borderRadius: "99px", border: "1.5px solid",
                borderColor: sel ? "#000" : "#e8e8e8",
                background: sel ? "#000" : "#fff",
                color: sel ? "#fff" : "#444",
                fontSize: "13px", fontWeight: 500, cursor: "pointer", transition: "all 0.1s",
              }}>
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Color */}
      <div>
        <Label optional>Color</Label>
        <input type="text" placeholder="e.g. Ivory, Sage, Camel" value={color}
          onChange={(e) => setColor(e.target.value)} style={inputStyle(!!color)} />
      </div>

      {/* Price */}
      <div>
        <Label optional>Price</Label>
        <div style={{ position: "relative" }}>
          <span style={{
            position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)",
            fontSize: "15px", color: "#aaa", pointerEvents: "none",
          }}>$</span>
          <input type="number" placeholder="0" min="0" value={price}
            onChange={(e) => setPrice(e.target.value)}
            style={{ ...inputStyle(!!price), paddingLeft: "30px" }} />
        </div>
      </div>

      {/* Save */}
      <button
        onClick={() => {
          if (!canSave) return;
          onSave({ image, name: name.trim(), category, color: color.trim(), price: price.trim() });
        }}
        style={{
          width: "100%", padding: "15px", borderRadius: "16px", border: "none",
          background: canSave ? "#000" : "#e8e8e8",
          color: canSave ? "#fff" : "#aaa",
          fontSize: "15px", fontWeight: 600,
          cursor: canSave ? "pointer" : "not-allowed",
          transition: "background 0.12s",
        }}
      >
        Save item
      </button>
    </div>
  );
}

// ─── Detail View ──────────────────────────────────────────────────────────────

function DetailView({ item, onRemove, onClose }: {
  item: Item;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <SheetHeader title={item.name} onClose={onClose} />

      {item.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.image} alt={item.name}
          style={{ width: "100%", maxHeight: "320px", objectFit: "cover", borderRadius: "16px" }} />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <Row label="Category" value={item.category} />
        {item.color && <Row label="Color" value={item.color} />}
        {item.price && <Row label="Price" value={`$${item.price}`} />}
      </div>

      <div style={{ borderTop: "1px solid #e8e8e8", paddingTop: "20px" }}>
        {confirming ? (
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setConfirming(false)} style={secondaryBtn}>Cancel</button>
            <button onClick={onRemove} style={{ ...secondaryBtn, flex: 1, border: "none", background: "#ef4444", color: "#fff" }}>
              Remove
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} style={{ ...secondaryBtn, width: "100%", color: "#ef4444" }}>
            Remove item
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Shared small components ──────────────────────────────────────────────────

function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <h2 style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-0.3px" }}>{title}</h2>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", padding: "4px", lineHeight: 0 }}>
        <CloseIcon />
      </button>
    </div>
  );
}

function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "10px", color: "#000" }}>
      {children}
      {optional && <span style={{ color: "#aaa", fontWeight: 400, marginLeft: "4px" }}>(optional)</span>}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: "13px", color: "#6b6b6b" }}>{label}</span>
      <span style={{ fontSize: "14px", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const goldBtn: React.CSSProperties = {
  padding: "9px 18px", borderRadius: "99px", border: "none",
  background: "#c9a96e", color: "#fff",
  fontSize: "13px", fontWeight: 600, cursor: "pointer", letterSpacing: "-0.1px",
};

const secondaryBtn: React.CSSProperties = {
  flex: 1, padding: "13px", borderRadius: "16px",
  border: "1.5px solid #e8e8e8", background: "#fff",
  color: "#444", fontSize: "14px", fontWeight: 500, cursor: "pointer",
};

const ghostLink: React.CSSProperties = {
  marginTop: "6px", fontSize: "12px", color: "#aaa", background: "none",
  border: "none", cursor: "pointer", padding: 0,
  textDecoration: "underline", textUnderlineOffset: "2px",
  display: "inline-block",
};

function inputStyle(filled: boolean): React.CSSProperties {
  return {
    width: "100%", padding: "13px 16px", borderRadius: "12px",
    border: `1.5px solid ${filled ? "#000" : "#e8e8e8"}`,
    fontSize: "15px", color: "#000", background: "#fff",
    transition: "border-color 0.15s",
  };
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function UploadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: "#aaa" }}>
      <path d="M10 13V4M10 4L7 7M10 4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 13v.5A2.5 2.5 0 005 16h10a2.5 2.5 0 002.5-2.5V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PlaceholderIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="3" y="5" width="22" height="18" rx="4" stroke="#ccc" strokeWidth="1.5" />
      <circle cx="9.5" cy="11" r="2" stroke="#ccc" strokeWidth="1.25" />
      <path d="M3 19l6-5.5 4 4 3.5-3 5 4.5" stroke="#ccc" strokeWidth="1.25" strokeLinejoin="round" />
    </svg>
  );
}
