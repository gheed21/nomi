"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = "inventory" | "looks";

export default function BottomNav({ active }: { active?: Tab }) {
  const pathname = usePathname();
  const current: Tab = active ?? (pathname.startsWith("/looks") ? "looks" : "inventory");

  const tabs: { key: Tab; label: string; href: string; icon: React.ReactNode }[] = [
    { key: "inventory", label: "Inventory", href: "/inventory", icon: <GridIcon /> },
    { key: "looks",     label: "Looks",     href: "/looks",     icon: <SparkleIcon /> },
  ];

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "#fff", borderTop: "1px solid #e8e8e8",
      display: "flex", justifyContent: "center",
      zIndex: 50,
    }}>
      <div style={{ display: "flex", width: "100%", maxWidth: "480px" }}>
        {tabs.map(({ key, label, href, icon }) => {
          const on = current === key;
          return (
            <Link key={key} href={href} style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: "4px", padding: "10px 0 16px",
              textDecoration: "none",
              color: on ? "#c9a96e" : "#aaa",
              transition: "color 0.12s",
            }}>
              {icon}
              <span style={{ fontSize: "11px", fontWeight: on ? 600 : 400, color: on ? "#000" : "#aaa" }}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function GridIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="2" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="2" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2" y="11" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="11" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 2.5l2.163 4.383 4.837.703-3.5 3.41.826 4.814L10 13.5l-4.326 2.31.826-4.814-3.5-3.41 4.837-.703L10 2.5z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
