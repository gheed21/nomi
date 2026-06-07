"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [storeName, setStoreName] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoData, setLogoData] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setLogoPreview(result);
      setLogoData(result);
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleGetStarted() {
    if (!storeName.trim()) return;
    localStorage.setItem("nomi_store_name", storeName.trim());
    if (logoData) localStorage.setItem("nomi_store_logo", logoData);
    router.push("/inventory");
  }

  const ready = storeName.trim().length > 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          display: "flex",
          flexDirection: "column",
          gap: "32px",
        }}
      >
        {/* Wordmark */}
        <div style={{ textAlign: "center" }}>
          <span
            style={{
              fontSize: "32px",
              fontWeight: 500,
              letterSpacing: "-0.5px",
              color: "var(--fg)",
            }}
          >
            nomi
          </span>
        </div>

        {/* Card */}
        <div
          style={{
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "20px",
                fontWeight: 600,
                letterSpacing: "-0.3px",
                marginBottom: "6px",
              }}
            >
              Set up your store
            </h1>
            <p style={{ fontSize: "14px", color: "var(--muted)", lineHeight: 1.5 }}>
              Get your boutique ready on Nomi in seconds.
            </p>
          </div>

          {/* Logo upload */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                marginBottom: "10px",
                color: "var(--fg)",
              }}
            >
              Store logo
              <span style={{ color: "var(--muted)", fontWeight: 400, marginLeft: "4px" }}>
                (optional)
              </span>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                width: "100%",
                height: "96px",
                borderRadius: "12px",
                border: `1.5px dashed ${dragOver ? "var(--accent)" : logoPreview ? "var(--fg)" : "var(--border)"}`,
                background: dragOver ? "var(--accent-light)" : logoPreview ? "#fafafa" : "#fff",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: "pointer",
                transition: "border-color 0.15s, background 0.15s",
              }}
            >
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoPreview}
                  alt="Store logo"
                  style={{
                    maxHeight: "64px",
                    maxWidth: "200px",
                    objectFit: "contain",
                    borderRadius: "8px",
                  }}
                />
              ) : (
                <>
                  <UploadIcon />
                  <span style={{ fontSize: "13px", color: "var(--muted)" }}>
                    Click or drag to upload
                  </span>
                </>
              )}
            </button>

            {logoPreview && (
              <button
                onClick={() => { setLogoPreview(null); setLogoData(null); }}
                style={{
                  marginTop: "8px",
                  fontSize: "12px",
                  color: "var(--muted)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  textDecoration: "underline",
                  textUnderlineOffset: "2px",
                }}
              >
                Remove logo
              </button>
            )}
          </div>

          {/* Store name */}
          <div>
            <label
              htmlFor="store-name"
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                marginBottom: "10px",
                color: "var(--fg)",
              }}
            >
              Store name
            </label>
            <input
              id="store-name"
              type="text"
              placeholder="e.g. Thread & Bloom"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGetStarted()}
              autoFocus
              style={{
                width: "100%",
                padding: "13px 16px",
                borderRadius: "12px",
                border: `1.5px solid ${storeName ? "var(--fg)" : "var(--border)"}`,
                fontSize: "15px",
                color: "var(--fg)",
                background: "#fff",
                transition: "border-color 0.15s",
              }}
            />
          </div>

          {/* CTA */}
          <button
            onClick={handleGetStarted}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "var(--radius)",
              border: "none",
              background: "var(--fg)",
              color: "#fff",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "-0.1px",
            }}
          >
            Get started
          </button>
        </div>

        {/* Gold accent line */}
        <div
          style={{
            width: "40px",
            height: "3px",
            borderRadius: "99px",
            background: "var(--accent)",
            margin: "0 auto",
          }}
        />
      </div>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: "var(--muted)" }}>
      <path
        d="M10 13V4M10 4L7 7M10 4l3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 14v1a2 2 0 002 2h10a2 2 0 002-2v-1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
