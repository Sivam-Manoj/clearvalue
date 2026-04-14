"use client";

import { motion, type Variants } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import Surface from "./Surface";
import { workflowPillars, credibilityFeatures } from "../data/constants";

interface CredibilitySectionProps {
  reveal: Variants;
}

export default function CredibilitySection({ reveal }: CredibilitySectionProps) {
  return (
    <section className="mt-20 grid gap-6 lg:grid-cols-[0.95fr_1.05fr] relative z-10">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        variants={reveal}
        custom={0.06}
      >
        <Surface className="h-full rounded-[30px] p-6 sm:p-7 backdrop-blur-xl">
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
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--app-accent)" }} />
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
        <Surface className="rounded-[28px] p-5 sm:col-span-2 backdrop-blur-xl">
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

        {credibilityFeatures.map((item, index) => (
          <motion.div key={item.title} whileHover={{ y: -6 }}>
            <Surface className="h-full rounded-[24px] p-5 backdrop-blur-xl">
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
  );
}
