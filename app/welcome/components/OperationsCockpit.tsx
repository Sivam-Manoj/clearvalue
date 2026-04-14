"use client";

import { motion, type Variants } from "framer-motion";
import { BarChart3, Clock3 } from "lucide-react";
import { useColorMode } from "@/components/providers/ColorModeProvider";
import Surface from "./Surface";
import { commandRows } from "../data/constants";

interface OperationsCockpitProps {
  reveal: Variants;
}

export default function OperationsCockpit({ reveal }: OperationsCockpitProps) {
  const { resolvedTheme } = useColorMode();
  const isDark = resolvedTheme === "dark";

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={reveal}
      custom={0.18}
      className="relative z-10 w-full"
    >
      <Surface className="relative overflow-hidden rounded-[28px] p-4 sm:p-5 w-full backdrop-blur-xl">
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
                <Surface className="rounded-2xl p-4 h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--app-text-muted)" }}>
                        {item.label}
                      </p>
                      <p className="mt-3 text-3xl font-black tracking-[-0.05em]">{item.value}</p>
                    </div>
                    <div className="h-3 w-3 rounded-[4px] shrink-0" style={{ background: item.tone }} />
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
                    <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "color-mix(in srgb, var(--app-border) 70%, transparent)" }}>
                      <motion.div
                        className="h-full rounded-full"
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
                        className="h-3.5 w-3.5 rounded-[4px] shrink-0"
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
  );
}
