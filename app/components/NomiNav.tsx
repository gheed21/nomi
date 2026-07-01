"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NomiNav() {
  const path = usePathname();
  const homeActive    = path === "/" || path.startsWith("/results");
  const exploreActive = path.startsWith("/explore");
  const savedActive   = path.startsWith("/saved");
  const chatActive    = path.startsWith("/chat");

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "#fff", borderTop: "1px solid #e8e8e8",
      display: "flex", justifyContent: "center", zIndex: 90,
    }}>
      <div style={{ display: "flex", width: "100%", maxWidth: "420px" }}>
        {([
          { href: "/",        label: "Home",    active: homeActive,    Icon: HomeIcon },
          { href: "/explore", label: "Explore", active: exploreActive, Icon: CompassIcon },
          { href: "/saved",   label: "Saved",   active: savedActive,   Icon: BookmarkOutlineIcon },
          { href: "/chat",    label: "Ask",     active: chatActive,    Icon: ChatBubbleIcon },
        ] as const).map(({ href, label, active, Icon }) => (
          <Link key={href} href={href} style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: "4px", padding: "10px 0 16px",
            textDecoration: "none",
            color: active ? "#c9a96e" : "#aaa",
            transition: "color 0.12s",
          }}>
            <Icon />
            <span style={{ fontSize: "11px", fontWeight: active ? 600 : 400, color: active ? "#000" : "#aaa" }}>
              {label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 8.5L10 3l7 5.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V8.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M7.5 18v-5h5v5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12.5 7.5L11 11.5l-4 1.5 1.5-4 4-1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="10" cy="10" r="1" fill="currentColor" />
    </svg>
  );
}

function BookmarkOutlineIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M5 3h10a1 1 0 011 1v13l-6-3.5L4 17V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function ChatBubbleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 4.5A1.5 1.5 0 014.5 3h11A1.5 1.5 0 0117 4.5v8A1.5 1.5 0 0115.5 14H8l-5 3V4.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
