"use client";

import { motion } from "framer-motion";
import { useColorMode } from "@/components/providers/ColorModeProvider";

export default function AnimatedBackground() {
  const { resolvedTheme } = useColorMode();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="fixed inset-0 z-[0] overflow-hidden pointer-events-none" style={{
      background:
        "radial-gradient(circle at top left, color-mix(in srgb, var(--app-accent) 10%, transparent) 0%, transparent 28%), radial-gradient(circle at top right, rgba(37,99,235,0.12) 0%, transparent 26%), linear-gradient(180deg, var(--app-bg) 0%, color-mix(in srgb, var(--app-bg) 92%, #000000 8%) 100%)",
    }}>
      {/* Dynamic gradients */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        animate={{
          backgroundPosition: [
            "0% 0%, 100% 0%, 50% 50%",
            "6% 4%, 94% 4%, 52% 54%",
            "0% 0%, 100% 0%, 50% 50%",
          ],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        style={{
          backgroundImage:
            "radial-gradient(circle at 14% 18%, rgba(225,29,72,0.16), transparent 24%), radial-gradient(circle at 84% 14%, rgba(37,99,235,0.14), transparent 22%), radial-gradient(circle at 52% 78%, rgba(124,58,237,0.12), transparent 24%)",
        }}
      />

      {/* Floating orbs */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-24 h-[400px] w-[400px] rounded-full blur-3xl"
        animate={{ x: [0, 50, 0], y: [0, -30, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: isDark ? "rgba(225,29,72,0.16)" : "rgba(225,29,72,0.12)" }}
      />
      
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-20 top-40 h-[500px] w-[500px] rounded-full blur-[100px]"
        animate={{ x: [0, -40, 0], y: [0, 40, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: isDark ? "rgba(37,99,235,0.18)" : "rgba(37,99,235,0.11)" }}
      />

      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-10 left-1/3 h-[300px] w-[300px] rounded-full blur-3xl"
        animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.3, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        style={{ background: isDark ? "rgba(124,58,237,0.15)" : "rgba(124,58,237,0.08)" }}
      />

      {/* Grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--app-border) 1px, transparent 1px), linear-gradient(to bottom, var(--app-border) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.2) 60%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.2) 60%, transparent 85%)",
        }}
      />
    </div>
  );
}
