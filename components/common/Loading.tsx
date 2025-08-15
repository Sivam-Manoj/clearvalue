"use client";

import Lottie from "lottie-react";
import loadingAnimation from "@/public/loadingAnimation.json";
import React from "react";

type LoadingProps = {
  message?: string;
  height?: number;
  width?: number;
  className?: string;
};

export default function Loading({
  message = "Loading...",
  height = 200,
  width = 200,
  className = "",
}: LoadingProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-6 ${className}`}>
      <Lottie
        animationData={loadingAnimation}
        loop
        autoplay
        style={{ height, width }}
      />
      {message && (
        <p className="mt-3 text-sm font-medium text-rose-800/80">{message}</p>
      )}
    </div>
  );
}
