"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  Brain,
  Building2,
  Car,
  ClipboardCheck,
  FileSpreadsheet,
  Globe2,
  ListOrdered,
  Lock,
  Package,
  Sparkles,
  Users,
} from "lucide-react";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const reveal: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE_OUT, delay },
  }),
};

const coreModules = [
  {
    title: "Real Estate Reports",
    description:
      "Generate structured valuation reports with clear data sections and export-ready formatting.",
    icon: Building2,
    tone: "from-rose-500 to-red-600",
  },
  {
    title: "Salvage Workflows",
    description:
      "Handle salvage assets, evaluation notes, and fair value logic in one centralized flow.",
    icon: Car,
    tone: "from-red-500 to-rose-600",
  },
  {
    title: "Asset Appraisal",
    description:
      "Evaluate general assets with valuation methods and consistent audit-friendly structure.",
    icon: Package,
    tone: "from-rose-500 to-pink-600",
  },
  {
    title: "Lot Listing",
    description:
      "Build auction-ready lot listings with organized item details and contract-linked records.",
    icon: ListOrdered,
    tone: "from-pink-500 to-rose-600",
  },
  {
    title: "CRM Task Engine",
    description:
      "Track leads, schedule reminders, monitor overdue calls, and update outcomes quickly.",
    icon: ClipboardCheck,
    tone: "from-red-500 to-rose-700",
  },
  {
    title: "AI Productivity",
    description:
      "Use AI assistance for rewriting communication, summarizing updates, and faster execution.",
    icon: Brain,
    tone: "from-rose-500 to-red-500",
  },
];

const valuationMethods = [
  {
    short: "FMV",
    title: "Fair Market Value",
    details: "Primary market-based benchmark for transparent appraisals.",
  },
  {
    short: "OLV",
    title: "Orderly Liquidation Value",
    details: "Value estimate under an orderly sale timeline.",
  },
  {
    short: "FLV",
    title: "Forced Liquidation Value",
    details: "Rapid-sale valuation for distressed or urgent scenarios.",
  },
  {
    short: "TKV",
    title: "Turn Key Value",
    details: "Operational-ready valuation considering implementation state.",
  },
];

export default function WelcomePage() {
  return (
    <div className="relative -mx-4 -my-6 sm:-mx-6 lg:-mx-8 overflow-hidden bg-gradient-to-b from-rose-50 via-red-50 to-white text-slate-900">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(244,63,94,0.18),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(225,29,72,0.15),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(244,63,94,0.12),transparent_30%)]"
        aria-hidden
      />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={reveal}
          custom={0}
          className="mb-8 flex items-center justify-between"
        >
          <div className="inline-flex items-center gap-3 rounded-full border border-rose-200 bg-white/80 px-3 py-1.5 shadow-sm backdrop-blur">
            <Image src="/clearvalueIcon.png" alt="ClearValue" width={28} height={28} />
            <span className="text-sm font-semibold text-rose-800">Welcome to ClearValue</span>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-600 to-red-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-500/30 transition hover:from-rose-500 hover:to-red-600"
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>

        <section className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={reveal}
            custom={0.1}
            className="space-y-5"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-100/70 px-3 py-1 text-xs font-semibold text-rose-800">
              <Sparkles className="h-3.5 w-3.5" />
              Built for high-output appraisal and CRM teams
            </div>

            <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-rose-600 to-red-500 bg-clip-text text-transparent">
                ClearValue
              </span>
            </h1>

            <p className="max-w-2xl text-base text-slate-600 sm:text-lg">
              One system for valuation reports, CRM follow-ups, reminders, exports, and team
              productivity. Build reports faster, track every lead action, and keep your operations
              aligned from first contact to final document.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-rose-500/30 transition hover:translate-y-[-1px]"
              >
                Open Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/reports"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                View Reports
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
              {[
                ["4", "Valuation Modes"],
                ["6+", "Core Modules"],
                ["Real-time", "CRM Updates"],
                ["Export", "PDF & Docs"],
              ].map(([value, label], idx) => (
                <motion.div
                  key={label}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.35 }}
                  variants={reveal}
                  custom={0.16 + idx * 0.05}
                  className="rounded-2xl border border-rose-100 bg-white/90 px-3 py-3 shadow-sm"
                >
                  <p className="text-lg font-black text-rose-700">{value}</p>
                  <p className="text-xs font-medium text-slate-500">{label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={reveal}
            custom={0.22}
            className="relative rounded-3xl border border-rose-200/70 bg-white/80 p-5 shadow-[0_20px_70px_rgba(244,63,94,0.16)] backdrop-blur"
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-rose-300/45 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-red-300/45 blur-2xl" />

            <div className="relative space-y-3">
              {[
                { icon: BellRing, text: "Push alerts for upcoming and overdue CRM tasks" },
                {
                  icon: FileSpreadsheet,
                  text: "Structured report data with clean export-ready sections",
                },
                {
                  icon: Users,
                  text: "Role-based team flow for admins, appraisers, and CRM staff",
                },
                {
                  icon: Lock,
                  text: "Secure workflow with authenticated access and protected actions",
                },
              ].map((item, idx) => (
                <motion.div
                  key={item.text}
                  initial={{ opacity: 0, x: 14 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.45, delay: 0.18 + idx * 0.08 }}
                  className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-white/95 p-3"
                >
                  <div className="mt-0.5 rounded-lg bg-rose-100 p-2 text-rose-700">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="mt-16">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={reveal}
            custom={0.05}
            className="mb-6"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-700">
              What the system has
            </p>
            <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Everything you need in one platform
            </h2>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {coreModules.map((item, idx) => (
              <motion.div
                key={item.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={reveal}
                custom={0.08 + idx * 0.04}
                className="group relative overflow-hidden rounded-2xl border border-rose-100 bg-white/95 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div
                  className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${item.tone} opacity-20 blur-2xl transition group-hover:scale-125`}
                />
                <div className="relative flex items-start gap-3">
                  <div
                    className={`rounded-xl bg-gradient-to-br ${item.tone} p-2.5 text-white shadow-md`}
                  >
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {item.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-5 lg:grid-cols-4">
          {valuationMethods.map((method, idx) => (
            <motion.article
              key={method.short}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: 0.06 + idx * 0.06 }}
              className="rounded-2xl border border-rose-200 bg-gradient-to-br from-white to-rose-50 p-4 shadow-sm"
            >
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-700">
                {method.short}
              </p>
              <h3 className="mt-2 text-base font-extrabold text-slate-900">{method.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{method.details}</p>
            </motion.article>
          ))}
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-2">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={reveal}
            custom={0.05}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h3 className="text-2xl font-black text-slate-900">Operational flow that scales</h3>
            <div className="mt-4 space-y-3">
              {[
                "Create valuation reports with method-level data breakdown.",
                "Assign CRM leads using location and quadrant matching.",
                "Capture calls, reminders, updates, and timeline activity.",
                "Export and share polished report outputs with confidence.",
              ].map((step) => (
                <div
                  key={step}
                  className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-2.5"
                >
                  <BadgeCheck className="mt-0.5 h-4 w-4 text-rose-700" />
                  <p className="text-sm text-slate-700">{step}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={reveal}
            custom={0.14}
            className="rounded-3xl border border-rose-200 bg-gradient-to-br from-rose-600 to-red-700 p-6 text-white shadow-xl shadow-rose-500/25"
          >
            <h3 className="text-2xl font-black">Connected experience across web + mobile</h3>
            <p className="mt-3 text-sm text-rose-100">
              Keep your team aligned whether they are at the desk or on the road. ClearValue syncs
              workflows, status changes, and follow-up actions across your operating tools.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { icon: Globe2, text: "Web dashboard for reporting and analytics" },
                { icon: BellRing, text: "Mobile notifications for task urgency" },
                { icon: Brain, text: "AI-assisted drafting and message refinement" },
                { icon: Users, text: "Team-friendly assignment and oversight" },
              ].map((item) => (
                <div
                  key={item.text}
                  className="rounded-xl border border-white/20 bg-white/10 p-3"
                >
                  <item.icon className="h-4 w-4 text-rose-100" />
                  <p className="mt-2 text-xs font-medium text-rose-50">{item.text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        <motion.section
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.55, ease: EASE_OUT }}
          className="mt-16 rounded-3xl border border-rose-200 bg-white p-6 text-center shadow-[0_18px_65px_rgba(244,63,94,0.13)] sm:p-8"
        >
          <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Ready to get started?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
            Head to your dashboard to create reports, manage CRM tasks, and keep your team on track.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-rose-500/30"
            >
              Open Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/reports"
              className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
            >
              View Reports
            </Link>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
