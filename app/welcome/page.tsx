"use client";

import Image from "next/image";
import Link from "next/link";
import { type Variants } from "framer-motion";
import { ArrowRight, BriefcaseBusiness, MoonStar, SunMedium } from "lucide-react";
import { useColorMode } from "@/components/providers/ColorModeProvider";
import AnimatedBackground from "./components/AnimatedBackground";
import WelcomeHeader from "./components/WelcomeHeader";
import HeroSection from "./components/HeroSection";
import OperationsCockpit from "./components/OperationsCockpit";
import FeatureGrid from "./components/FeatureGrid";
import CredibilitySection from "./components/CredibilitySection";
import CallToAction from "./components/CallToAction";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const reveal: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: EASE_OUT, delay },
  }),
};

export default function WelcomePage() {
  const { resolvedTheme, toggleMode } = useColorMode();
  const isDark = resolvedTheme === "dark";

  return (
    <main className="relative min-h-screen text-[var(--app-text)]">
      <AnimatedBackground />

      <div className="relative z-10 md:hidden">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-10 pt-5">
          <div className="flex items-center justify-between gap-3">
            <div
              className="flex min-h-[72px] flex-1 items-center rounded-3xl border px-4 py-3 shadow-[var(--app-shadow-card)]"
              style={{
                borderColor: "var(--app-border)",
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--app-panel) 94%, transparent) 0%, color-mix(in srgb, var(--app-panel-alt) 88%, transparent) 100%)",
              }}
            >
              <Image
                src="/assentInsightLogo.jpeg"
                alt="Asset Insight"
                width={168}
                height={42}
                className="h-10 w-auto rounded-md object-contain"
                priority
              />
            </div>
            <button
              type="button"
              onClick={toggleMode}
              className="inline-flex h-[72px] w-[72px] items-center justify-center rounded-3xl border shadow-[var(--app-shadow-card)]"
              style={{
                borderColor: "var(--app-border)",
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--app-panel) 94%, transparent) 0%, color-mix(in srgb, var(--app-panel-alt) 88%, transparent) 100%)",
                color: "var(--app-text)",
              }}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <SunMedium className="h-6 w-6" /> : <MoonStar className="h-6 w-6" />}
            </button>
          </div>

          <div
            className="mt-4 rounded-3xl border px-4 py-4 shadow-[var(--app-shadow-card)]"
            style={{
              borderColor: "var(--app-border)",
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--app-panel) 92%, transparent) 0%, color-mix(in srgb, var(--app-panel-alt) 86%, transparent) 100%)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl"
                style={{
                  background: "color-mix(in srgb, var(--app-accent) 10%, transparent)",
                  color: "var(--app-accent)",
                }}
              >
                <BriefcaseBusiness className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--app-text)" }}>
                  Managed by McDougall Auctioneers
                </p>
                <p className="text-xs" style={{ color: "var(--app-text-muted)" }}>
                  Valuation and auction operations platform
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <p
              className="text-xs font-semibold uppercase tracking-[0.24em]"
              style={{ color: "var(--app-accent)" }}
            >
              Key info
            </p>
            <h1 className="mt-3 text-4xl font-black leading-[1.02] tracking-[-0.05em]">
              One place for reports, lots, and team workflow.
            </h1>
            <p
              className="mt-4 text-base leading-7"
              style={{ color: "var(--app-text-muted)" }}
            >
              Asset Insight helps your team create valuation reports, manage auction lots,
              and keep delivery work organized from one clean workspace.
            </p>
          </div>

          <div className="mt-6 grid gap-3">
            {[
              "Reporting workspace",
              "Auction-ready lot management",
              "Responsive desktop and mobile access",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border px-4 py-3 text-sm font-semibold"
                style={{
                  borderColor: "var(--app-border)",
                  background: "color-mix(in srgb, var(--app-panel) 80%, transparent)",
                  color: "var(--app-text)",
                }}
              >
                {item}
              </div>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-[1fr_auto] gap-3">
            <Link
              href="/signup"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-5 text-base font-extrabold text-white shadow-[0_20px_50px_rgba(225,29,72,0.26)]"
              style={{
                background:
                  "linear-gradient(135deg, color-mix(in srgb, var(--app-accent) 88%, #ffffff 12%) 0%, #9f1239 100%)",
              }}
            >
              Start workspace
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-14 items-center justify-center rounded-2xl border px-5 text-base font-bold"
              style={{
                borderColor: "var(--app-border)",
                background: "color-mix(in srgb, var(--app-panel) 84%, transparent)",
                color: "var(--app-text)",
              }}
            >
              Login
            </Link>
          </div>
        </div>
      </div>

      <div className="relative mx-auto hidden w-full max-w-7xl flex-col px-4 pb-20 pt-5 sm:px-6 md:flex lg:px-8 lg:pt-7 z-10">
        <WelcomeHeader reveal={reveal} />

        <section className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <HeroSection reveal={reveal} />
          <OperationsCockpit reveal={reveal} />
        </section>

        <FeatureGrid reveal={reveal} />

        <CredibilitySection reveal={reveal} />

        <CallToAction />
      </div>
    </main>
  );
}
