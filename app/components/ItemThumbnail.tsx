"use client";

import { useState } from "react";

type Props = {
  src: string | undefined;
  imageTier?: "confident" | "broad" | null;
  fallback?: React.ReactNode;
};

export default function ItemThumbnail({ src, imageTier, fallback }: Props) {
  const [failed, setFailed] = useState(false);
  const isBroad = imageTier === "broad";

  if (!src || failed) {
    return fallback ? (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
        {fallback}
      </div>
    ) : null;
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block", opacity: isBroad ? 0.7 : 1 }}
      />
      {isBroad && (
        <div style={{ position: "absolute", bottom: "5px", left: "5px", background: "rgba(0,0,0,0.5)", borderRadius: "4px", padding: "2px 5px" }}>
          <span style={{ fontSize: "9px", fontWeight: 600, color: "#fff", letterSpacing: "0.3px" }}>similar</span>
        </div>
      )}
    </div>
  );
}
