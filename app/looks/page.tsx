"use client";

import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";

export default function LooksPage() {
  const [storeName, setStoreName] = useState("");

  useEffect(() => {
    setStoreName(localStorage.getItem("nomi_store_name") ?? "Your Store");
  }, []);

  return (
    <>
      <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", paddingBottom: "80px" }}>
        <header style={{
          display: "flex", alignItems: "center",
          padding: "20px", borderBottom: "1px solid #e8e8e8",
          position: "sticky", top: 0, background: "#fff", zIndex: 10,
        }}>
          <span style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "-0.2px" }}>
            {storeName}
          </span>
        </header>

        <main style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "24px 20px", textAlign: "center",
        }}>
          <div style={{
            width: "56px", height: "56px", borderRadius: "16px",
            background: "#f7f0e4", display: "flex", alignItems: "center",
            justifyContent: "center", marginBottom: "16px",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3l2.598 5.267 5.802.844-4.2 4.093.991 5.776L12 16.267l-5.191 2.713.991-5.776-4.2-4.093 5.802-.844L12 3z"
                stroke="#c9a96e" strokeWidth="1.5" strokeLinejoin="round"
              />
            </svg>
          </div>
          <p style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-0.3px", marginBottom: "8px" }}>
            Looks
          </p>
          <p style={{ fontSize: "14px", color: "#6b6b6b", lineHeight: 1.6, maxWidth: "240px" }}>
            AI-generated outfit looks are coming soon.
          </p>
        </main>
      </div>

      <BottomNav active="looks" />
    </>
  );
}
