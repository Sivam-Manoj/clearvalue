"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileSpreadsheet,
  Layers3,
  MoonStar,
  ShieldCheck,
  Smartphone,
  SunMedium,
  Users,
} from "lucide-react";
import { useColorMode } from "@/components/providers/ColorModeProvider";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const reveal: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: EASE_OUT, delay },
  }),
};

const featureCards = [
  {
    title: "Structured appraisal reporting",
    description:
      "Build polished valuation outputs with clean sections, method visibility, and export-ready presentation.",
    icon: FileSpreadsheet,
  },
  {
    title: "Auction and lot management",
    description:
      "Organize assets, lot groupings, and operational details in one workspace built for auction delivery.",
    icon: Layers3,
  },
  {
    title: "Operational oversight",
    description:
      "Keep teams aligned with activity tracking, workflow visibility, and faster handoffs between staff.",
    icon: Users,
  },
  {
    title: "Secure client delivery",
    description:
      "Maintain confidence with protected access, clear status control, and dependable document handling.",
    icon: ShieldCheck,
  },
];

const workflowPillars = [
  "Prepare valuations with consistent data structure and approval-ready outputs.",
  "Track team actions, reminders, and progress without losing operational context.",
  "Support desktop and mobile usage with responsive workflows and clear navigation.",
  "Present a more credible front to clients with sharper reporting and delivery tools.",
];

const trustStats = [
  { value: "4", label: "valuation tracks" },
  { value: "6+", label: "core workflow areas" },
  { value: "24/7", label: "team visibility" },
  { value: "Web + mobile", label: "responsive access" },
];

const commandRows = [
  { label: "New valuation requests", value: "18", tone: "#e11d48" },
  { label: "Reports in review", value: "07", tone: "#2563eb" },
  { label: "Auction lots queued", value: "42", tone: "#7c3aed" },
  { label: "Follow-ups today", value: "13", tone: "#059669" },
];

function Surface({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`border shadow-[var(--app-shadow-card)] ${className}`}
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

export default function WelcomePage() {
  const { resolvedTheme, toggleMode } = useColorMode();
  const isDark = resolvedTheme === "dark";

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at top left, color-mix(in srgb, var(--app-accent) 10%, transparent) 0%, transparent 28%), radial-gradient(circle at top right, rgba(37,99,235,0.12) 0%, transparent 26%), linear-gradient(180deg, var(--app-bg) 0%, color-mix(in srgb, var(--app-bg) 92%, #000000 8%) 100%)",
        color: "var(--app-text)",
      }}
    >
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

      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-24 h-80 w-80 rounded-full blur-3xl"
        animate={{ x: [0, 36, 0], y: [0, -18, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: isDark ? "rgba(225,29,72,0.16)" : "rgba(225,29,72,0.12)" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-20 top-40 h-96 w-96 rounded-full blur-3xl"
        animate={{ x: [0, -28, 0], y: [0, 22, 0], scale: [1, 1.06, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: isDark ? "rgba(37,99,235,0.18)" : "rgba(37,99,235,0.11)" }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--app-border) 1px, transparent 1px), linear-gradient(to bottom, var(--app-border) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(circle at center, rgba(0,0,0,0.9), rgba(0,0,0,0.18) 62%, transparent 88%)",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col px-4 pb-20 pt-5 sm:px-6 lg:px-8 lg:pt-7">
        <motion.header
          initial="hidden"
          animate="visible"
          variants={reveal}
          custom={0}
          className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Surface className="rounded-2xl p-3">
              <Image src="/icon.png" alt="Asset Insight" width={116} height={36} className="h-9 w-auto" />
            </Surface>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span
                className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 font-semibold"
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
                className="inline-flex items-center rounded-xl border px-3 py-2 font-medium"
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

        <section className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={reveal}
            custom={0.08}
            className="space-y-6"
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
              <h1 className="max-w-4xl text-4xl font-black leading-[0.95] tracking-[-0.05em] sm:text-5xl xl:text-7xl">
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

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

          <motion.div
            initial="hidden"
            animate="visible"
            variants={reveal}
            custom={0.18}
            className="relative"
          >
            <Surface className="relative overflow-hidden rounded-[28px] p-4 sm:p-5">
              <motion.div
                aria-hidden
                className="pointer-events-none absolute -right-10 top-0 h-48 w-48 rounded-full blur-3xl"
                animate={{ x: [0, -20, 0], y: [0, 16, 0], scale: [1, 1.08, 1] }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  background: isDark ? "rgba(124,58,237,0.24)" : "rgba(124,58,237,0.12)",
                }}
              />

              <div className="relative space-y-4">
                <div className="flex items-center justify-between rounded-2xl border px-4 py-3"
                  style={{
                    borderColor: "var(--app-border)",
                    background: "color-mix(in srgb, var(--app-panel) 88%, transparent)",
                  }}
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--app-text-muted)" }}>
                      Command view
                    </p>
                    <h2 className="mt-1 text-xl font-black tracking-[-0.03em]">
                      Operations cockpit
                    </h2>
                  </div>
                  <div
                    className="rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.18em]"
                    style={{
                      background: "color-mix(in srgb, var(--app-accent) 12%, transparent)",
                      color: "var(--app-accent)",
                    }}
                  >
                    Live
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {commandRows.map((item, index) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: 0.22 + index * 0.06 }}
                      whileHover={{ y: -6 }}
                    >
                      <Surface className="rounded-2xl p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--app-text-muted)" }}>
                              {item.label}
                            </p>
                            <p className="mt-3 text-3xl font-black tracking-[-0.05em]">{item.value}</p>
                          </div>
                          <div className="h-3 w-3 rounded-[4px]" style={{ background: item.tone }} />
                        </div>
                      </Surface>
                    </motion.div>
                  ))}
                </div>

                <div className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
                  <Surface className="rounded-2xl p-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" style={{ color: "var(--app-accent)" }} />
                      <p className="text-sm font-bold">Status cadence</p>
                    </div>
                    <div className="mt-5 space-y-4">
                      {[
                        { label: "Reports finalized", width: "82%" },
                        { label: "Reviews completed", width: "68%" },
                        { label: "Auction lots assembled", width: "74%" },
                      ].map((row) => (
                        <div key={row.label}>
                          <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--app-text-muted)" }}>
                            <span>{row.label}</span>
                            <span>{row.width}</span>
                          </div>
                          <div className="h-2.5 rounded-full" style={{ background: "color-mix(in srgb, var(--app-border) 70%, transparent)" }}>
                            <motion.div
                              className="h-2.5 rounded-full"
                              animate={{ width: [row.width, `calc(${row.width} - 6%)`, row.width] }}
                              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                              style={{
                                width: row.width,
                                background:
                                  "linear-gradient(90deg, color-mix(in srgb, var(--app-accent) 84%, #ffffff 16%) 0%, #2563eb 100%)",
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Surface>

                  <Surface className="rounded-2xl p-4">
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4" style={{ color: "var(--app-accent)" }} />
                      <p className="text-sm font-bold">Priority timeline</p>
                    </div>
                    <div className="mt-4 space-y-3">
                      {[
                        "New intake logged",
                        "Review queue prepared",
                        "Client-ready output delivered",
                      ].map((item, index) => (
                        <div key={item} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div
                              className="h-3.5 w-3.5 rounded-[4px]"
                              style={{
                                background: index === 2 ? "#059669" : "var(--app-accent)",
                              }}
                            />
                            {index < 2 ? (
                              <div
                                className="mt-1 h-10 w-px"
                                style={{ background: "var(--app-border)" }}
                              />
                            ) : null}
                          </div>
                          <p className="pt-[-2px] text-sm leading-6" style={{ color: "var(--app-text-muted)" }}>
                            {item}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Surface>
                </div>
              </div>
            </Surface>
          </motion.div>
        </section>

        <section className="mt-20 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featureCards.map((item, index) => (
            <motion.div
              key={item.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              variants={reveal}
              custom={0.04 + index * 0.05}
              whileHover={{ y: -8 }}
            >
              <Surface className="group h-full rounded-[26px] p-5 transition duration-300">
                <div
                  className="mb-5 inline-flex rounded-2xl p-3 transition duration-300 group-hover:scale-105"
                  style={{
                    background:
                      "linear-gradient(135deg, color-mix(in srgb, var(--app-accent) 16%, transparent) 0%, rgba(37,99,235,0.12) 100%)",
                    color: "var(--app-accent)",
                  }}
                >
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-black tracking-[-0.03em]">{item.title}</h3>
                <p className="mt-3 text-sm leading-7" style={{ color: "var(--app-text-muted)" }}>
                  {item.description}
                </p>
              </Surface>
            </motion.div>
          ))}
        </section>

        <section className="mt-20 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={reveal}
            custom={0.06}
          >
            <Surface className="h-full rounded-[30px] p-6 sm:p-7">
              <div className="max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.26em]" style={{ color: "var(--app-accent)" }}>
                  Why it lands better
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                  Built to feel credible in front of teams, clients, and auction operations.
                </h2>
                <p className="mt-4 text-sm leading-7 sm:text-base" style={{ color: "var(--app-text-muted)" }}>
                  The welcome experience should set the tone before a user signs in. This redesign
                  positions Asset Insight as a premium operational platform with McDougall
                  Auctioneers standing behind the experience.
                </p>
              </div>

              <div className="mt-8 grid gap-3">
                {workflowPillars.map((item) => (
                  <motion.div
                    key={item}
                    whileHover={{ x: 6 }}
                    className="flex items-start gap-3 rounded-2xl border px-4 py-4"
                    style={{
                      borderColor: "var(--app-border)",
                      background: "color-mix(in srgb, var(--app-panel) 76%, transparent)",
                    }}
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5" style={{ color: "var(--app-accent)" }} />
                    <p className="text-sm leading-7" style={{ color: "var(--app-text-muted)" }}>
                      {item}
                    </p>
                  </motion.div>
                ))}
              </div>
            </Surface>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={reveal}
            custom={0.12}
            className="grid gap-4 sm:grid-cols-2"
          >
            <Surface className="rounded-[28px] p-5 sm:col-span-2">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--app-text-muted)" }}>
                    Managed operations
                  </p>
                  <h3 className="mt-2 text-2xl font-black tracking-[-0.03em]">
                    McDougall-backed execution
                  </h3>
                </div>
                <div
                  className="rounded-2xl px-3 py-2 text-xs font-bold uppercase tracking-[0.18em]"
                  style={{
                    background: "color-mix(in srgb, #2563eb 12%, transparent)",
                    color: "#2563eb",
                  }}
                >
                  Trusted
                </div>
              </div>
              <p className="mt-4 text-sm leading-7" style={{ color: "var(--app-text-muted)" }}>
                Present the platform as professionally run, operationally strong, and ready for
                teams that need clear reporting and dependable workflow control.
              </p>
            </Surface>

            {[
              {
                icon: BellRing,
                title: "Faster response rhythm",
                body: "Stay on top of reviews, next actions, and delivery timing with less friction.",
              },
              {
                icon: Smartphone,
                title: "Responsive everywhere",
                body: "The experience is designed to read cleanly across mobile, tablet, and desktop.",
              },
              {
                icon: Building2,
                title: "Sharper market presence",
                body: "A better landing page improves first impressions before users ever reach the dashboard.",
              },
              {
                icon: BarChart3,
                title: "Executive visual language",
                body: "Depth, motion, and structured panels create a stronger enterprise feel without being noisy.",
              },
            ].map((item, index) => (
              <motion.div key={item.title} whileHover={{ y: -6 }}>
                <Surface className="h-full rounded-[24px] p-5">
                  <item.icon className="h-5 w-5" style={{ color: index % 2 === 0 ? "var(--app-accent)" : "#2563eb" }} />
                  <h4 className="mt-4 text-lg font-black tracking-[-0.02em]">{item.title}</h4>
                  <p className="mt-2 text-sm leading-7" style={{ color: "var(--app-text-muted)" }}>
                    {item.body}
                  </p>
                </Surface>
              </motion.div>
            ))}
          </motion.div>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.65, ease: EASE_OUT }}
          className="mt-20"
        >
          <Surface
            className="overflow-hidden rounded-[34px] p-6 sm:p-8 lg:p-10"
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
      </div>
    </main>
  );
}
