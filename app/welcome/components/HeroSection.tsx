"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { Building2, ArrowRight, ChevronRight } from "lucide-react";
import Surface from "./Surface";
import { trustStats } from "../data/constants";

interface HeroSectionProps {
  reveal: Variants;
}

export default function HeroSection({ reveal }: HeroSectionProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={reveal}
      custom={0.08}
      className="space-y-6 relative z-10"
    >
      <div
        className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em]"
        style={{
          borderColor: "var(--app-border)",
          background: "color-mix(in srgb, var(--app-accent) 10%, var(--app-panel) 90%)",
          color: "var(--app-accent)",
        }}
      >
        <Building2 className="h-4 w-4" />
        Premium workflow control
      </div>

      <div className="space-y-4">
        <h1 className="max-w-4xl text-4xl font-black leading-[1.05] tracking-[-0.03em] sm:text-5xl xl:text-7xl">
          A sharper front door for modern valuation and auction operations.
        </h1>
        <p
          className="max-w-2xl text-base leading-7 sm:text-lg"
          style={{ color: "var(--app-text-muted)" }}
        >
          Asset Insight brings reporting, review flow, auction readiness, and team visibility
          into one executive-grade workspace, managed by McDougall Auctioneers for dependable
          day-to-day delivery.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/signup"
          className="inline-flex min-h-14 items-center gap-2 rounded-xl px-6 text-sm font-extrabold text-white transition duration-200 hover:-translate-y-1"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--app-accent) 88%, #ffffff 12%) 0%, #9f1239 100%)",
            boxShadow: "0 22px 60px rgba(225, 29, 72, 0.28)",
          }}
        >
          Create account
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/login"
          className="inline-flex min-h-14 items-center gap-2 rounded-xl border px-6 text-sm font-bold transition duration-200 hover:-translate-y-1"
          style={{
            borderColor: "var(--app-border)",
            background: "color-mix(in srgb, var(--app-panel) 82%, transparent)",
            color: "var(--app-text)",
          }}
        >
          View sign in
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 pt-4">
        {trustStats.map((item, index) => (
          <motion.div
            key={item.label}
            initial="hidden"
            animate="visible"
            variants={reveal}
            custom={0.14 + index * 0.05}
            whileHover={{ y: -6 }}
          >
            <Surface className="rounded-2xl p-4">
              <div className="text-2xl font-black tracking-[-0.04em]" style={{ color: "var(--app-text)" }}>
                {item.value}
              </div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--app-text-muted)" }}>
                {item.label}
              </div>
            </Surface>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
