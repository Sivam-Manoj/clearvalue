import React from "react";

interface SurfaceProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function Surface({ children, className = "", style }: SurfaceProps) {
  return (
    <div
      className={`border shadow-[var(--app-shadow-card)] backdrop-blur-sm ${className}`}
      style={{
        borderColor: "var(--app-border)",
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--app-panel) 92%, transparent) 0%, color-mix(in srgb, var(--app-panel-alt) 88%, transparent) 100%)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
