"use client";

import React, { CSSProperties, useEffect, useMemo, useState } from "react";
import Lottie from "lottie-react";

export type LottiePlayerProps = {
  // Pass a public path like "/signinAnimation.json"
  src?: any;
  // Or pass already-imported animation data
  animationData?: any;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  style?: CSSProperties;
  // Optional fixed sizes
  width?: number;
  height?: number;
};

export default function LottiePlayer({
  src,
  animationData,
  loop = true,
  autoplay = true,
  className,
  style,
  width,
  height,
}: LottiePlayerProps) {
  const [data, setData] = useState<any | null>(animationData ?? null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!src || data) return;
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error(`Failed to load animation: ${res.status}`);
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setErrored(true);
        // eslint-disable-next-line no-console
        console.error("LottiePlayer: failed to load src", src, e);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const mergedStyle = useMemo<CSSProperties>(() => {
    const base: CSSProperties = { display: "block" };
    if (width) base.width = width;
    if (height) base.height = height;
    return { ...base, ...style };
  }, [style, width, height]);

  if (errored) {
    return null;
  }

  if (!data) {
    // Lightweight placeholder to preserve layout
    return (
      <div
        className={className}
        style={{ ...mergedStyle, background: "transparent" }}
        aria-hidden
      />
    );
  }

  return (
    <Lottie
      animationData={data}
      loop={loop}
      autoplay={autoplay}
      className={className}
      style={mergedStyle}
    />
  );
}
