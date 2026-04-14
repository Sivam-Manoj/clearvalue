"use client";

import { type Variants } from "framer-motion";
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
  return (
    <main className="relative min-h-screen text-[var(--app-text)]">
      <AnimatedBackground />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col px-4 pb-20 pt-5 sm:px-6 lg:px-8 lg:pt-7 z-10">
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
