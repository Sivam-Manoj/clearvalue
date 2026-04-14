"use client";

import { motion, type Variants } from "framer-motion";
import Surface from "./Surface";
import { featureCards } from "../data/constants";

interface FeatureGridProps {
  reveal: Variants;
}

export default function FeatureGrid({ reveal }: FeatureGridProps) {
  return (
    <section className="mt-20 grid gap-4 md:grid-cols-2 xl:grid-cols-4 relative z-10">
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
          <Surface className="group h-full rounded-[26px] p-5 transition duration-300 backdrop-blur-xl">
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
  );
}
