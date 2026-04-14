"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { BriefcaseBusiness, SunMedium, MoonStar, ArrowRight } from "lucide-react";
import { useColorMode } from "@/components/providers/ColorModeProvider";
import Surface from "./Surface";

interface WelcomeHeaderProps {
  reveal: Variants;
}

export default function WelcomeHeader({ reveal }: WelcomeHeaderProps) {
  const { resolvedTheme, toggleMode } = useColorMode();
  const isDark = resolvedTheme === "dark";

  return (
    <motion.header
      initial="hidden"
      animate="visible"
      variants={reveal}
      custom={0}
      className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between relative z-10"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Surface className="rounded-2xl p-3 flex-shrink-0">
          <Image src="/icon.png" alt="Asset Insight" width={116} height={36} className="h-9 w-auto" priority />
        </Surface>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 font-semibold whitespace-nowrap"
            style={{
              borderColor: "var(--app-border)",
              background: "color-mix(in srgb, var(--app-panel) 76%, transparent)",
              color: "var(--app-text-muted)",
            }}
          >
            <BriefcaseBusiness className="h-4 w-4" />
            Managed by McDougall Auctioneers
          </span>
          <span
            className="inline-flex items-center rounded-xl border px-3 py-2 font-medium whitespace-nowrap"
            style={{
              borderColor: "var(--app-border)",
              background: "color-mix(in srgb, var(--app-panel) 68%, transparent)",
              color: "var(--app-text-muted)",
            }}
          >
            Valuation and auction operations platform
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <button
          type="button"
          onClick={toggleMode}
          className="inline-flex h-12 w-12 items-center justify-center rounded-xl border transition duration-200 hover:-translate-y-0.5"
          style={{
            borderColor: "var(--app-border)",
            background: "color-mix(in srgb, var(--app-panel) 82%, transparent)",
            color: "var(--app-text)",
          }}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <SunMedium className="h-5 w-5" /> : <MoonStar className="h-5 w-5" />}
        </button>
        <Link
          href="/login"
          className="inline-flex h-12 items-center rounded-xl border px-5 text-sm font-semibold transition duration-200 hover:-translate-y-0.5"
          style={{
            borderColor: "var(--app-border)",
            background: "color-mix(in srgb, var(--app-panel) 84%, transparent)",
            color: "var(--app-text)",
          }}
        >
          Login
        </Link>
        <Link
          href="/signup"
          className="inline-flex h-12 items-center gap-2 rounded-xl px-5 text-sm font-bold text-white transition duration-200 hover:-translate-y-0.5"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--app-accent) 88%, #ffffff 12%) 0%, #9f1239 100%)",
            boxShadow: "0 18px 50px rgba(225, 29, 72, 0.28)",
          }}
        >
          Start workspace
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.header>
  );
}
