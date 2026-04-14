"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Surface from "./Surface";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function CallToAction() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.65, ease: EASE_OUT }}
      className="mt-20 relative z-10"
    >
      <Surface
        className="overflow-hidden rounded-[34px] p-6 sm:p-8 lg:p-10 backdrop-blur-xl"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--app-panel) 80%, transparent) 0%, color-mix(in srgb, var(--app-accent) 8%, var(--app-panel-alt) 92%) 100%)",
        }}
      >
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em]" style={{ color: "var(--app-accent)" }}>
              Ready to launch
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">
              Open a cleaner, stronger first impression for your platform.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 sm:text-base" style={{ color: "var(--app-text-muted)" }}>
              Welcome users with a refined product front door that feels premium, responsive,
              and professionally managed by McDougall Auctioneers.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
            <Link
              href="/signup"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl px-6 text-sm font-extrabold text-white transition duration-200 hover:-translate-y-1"
              style={{
                background:
                  "linear-gradient(135deg, color-mix(in srgb, var(--app-accent) 88%, #ffffff 12%) 0%, #9f1239 100%)",
                boxShadow: "0 20px 55px rgba(225, 29, 72, 0.28)",
              }}
            >
              Start your workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-14 items-center justify-center rounded-xl border px-6 text-sm font-bold transition duration-200 hover:-translate-y-1"
              style={{
                borderColor: "var(--app-border)",
                background: "color-mix(in srgb, var(--app-panel) 84%, transparent)",
                color: "var(--app-text)",
              }}
            >
              Sign in
            </Link>
          </div>
        </div>
      </Surface>
    </motion.section>
  );
}
