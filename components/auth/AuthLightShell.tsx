"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
};

type Edge = {
  from: number;
  to: number;
  color: string;
  pulseOffset: number;
  pulseSpeed: number;
};

function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame = 0;
    let particles: Particle[] = [];
    let edges: Edge[] = [];
    let tick = 0;

    const palette = {
      red: "rgba(220, 38, 38, 0.98)",
      blue: "rgba(29, 78, 216, 0.98)",
      redLine: "rgba(220, 38, 38, 0.24)",
      blueLine: "rgba(29, 78, 216, 0.24)",
      redGlow: "rgba(248, 113, 113, 0.9)",
      blueGlow: "rgba(96, 165, 250, 0.9)",
    };

    const getEdgeColor = (index: number) => (index % 2 === 0 ? palette.redLine : palette.blueLine);
    const getPulseColor = (index: number) => (index % 2 === 0 ? palette.redGlow : palette.blueGlow);

    const rebuildEdges = () => {
      const nextEdges: Edge[] = [];
      const thresholdSq = 190 * 190;

      for (let i = 0; i < particles.length; i += 1) {
        const ranked: Array<{ index: number; distance: number }> = [];

        for (let j = 0; j < particles.length; j += 1) {
          if (i === j) continue;
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distanceSq = dx * dx + dy * dy;
          if (distanceSq <= thresholdSq) {
            ranked.push({ index: j, distance: distanceSq });
          }
        }

        ranked.sort((a, b) => a.distance - b.distance);

        for (const neighbor of ranked.slice(0, 3)) {
          if (neighbor.index < i) continue;
          nextEdges.push({
            from: i,
            to: neighbor.index,
            color: getEdgeColor(i),
            pulseOffset: Math.random(),
            pulseSpeed: 0.0016 + Math.random() * 0.0026,
          });
        }
      }

      edges = nextEdges;
    };

    const resize = () => {
      const { innerWidth, innerHeight, devicePixelRatio } = window;
      const ratio = Math.min(devicePixelRatio || 1, 1.5);

      canvas.width = innerWidth * ratio;
      canvas.height = innerHeight * ratio;
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const count = Math.max(34, Math.min(76, Math.floor(innerWidth / 16)));
      particles = Array.from({ length: count }, (_, index) => ({
        x: Math.random() * innerWidth,
        y: Math.random() * innerHeight,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        radius: 1.6 + Math.random() * 2.3,
        color: index % 2 === 0 ? palette.red : palette.blue,
      }));
      rebuildEdges();
    };

    const draw = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      tick += 1;

      context.clearRect(0, 0, width, height);

      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.998;
        particle.vy *= 0.998;

        if (particle.x <= 0 || particle.x >= width) particle.vx *= -1;
        if (particle.y <= 0 || particle.y >= height) particle.vy *= -1;

        particle.vx += Math.sin((tick + particle.y) * 0.002) * 0.002;
        particle.vy += Math.cos((tick + particle.x) * 0.0022) * 0.002;
      }

      if (tick % 90 === 0) {
        rebuildEdges();
      }

      for (const edge of edges) {
        const from = particles[edge.from];
        const to = particles[edge.to];
        const dx = from.x - to.x;
        const dy = from.y - to.y;
        const distanceSq = dx * dx + dy * dy;

        if (distanceSq > 220 * 220) continue;
        const distance = Math.sqrt(distanceSq);
        const opacity = 1 - distance / 220;

        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.strokeStyle = edge.color.replace(/[\d.]+\)$/u, `${Math.max(0.04, opacity)})`);
        context.lineWidth = 1;
        context.stroke();

        const progress = (edge.pulseOffset + tick * edge.pulseSpeed) % 1;
        const pulseX = from.x + (to.x - from.x) * progress;
        const pulseY = from.y + (to.y - from.y) * progress;

        context.beginPath();
        context.arc(pulseX, pulseY, 1.8, 0, Math.PI * 2);
        context.fillStyle = getPulseColor(edge.from);
        context.fill();
      }

      for (const particle of particles) {
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = particle.color;
        context.fill();
      }

      animationFrame = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full opacity-95" />;
}

export default function AuthLightShell({
  eyebrow,
  title,
  description,
  features,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  features: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-slate-100 text-slate-950">
      <ParticleField />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(37,99,235,0.16),_transparent_26%),linear-gradient(135deg,_rgba(255,255,255,0.96),_rgba(241,245,249,0.84))]" />

      <div className="relative z-10 grid min-h-full lg:min-h-screen lg:grid-cols-[1.04fr_0.96fr]">
        <section className="flex items-center px-6 py-12 sm:px-10 lg:px-16 xl:px-24">
          <div className="max-w-2xl">
            <div className="mb-10 inline-flex items-center gap-5">
              <div className="relative h-28 w-28 overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_50px_rgba(15,23,42,0.10)]">
                <Image src="/assentInsightLogo.jpeg" alt="Asset Insight logo" fill className="object-cover" priority />
              </div>
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.38em] text-slate-500">
                  Asset Insight
                </p>
                <p className="text-sm font-medium text-slate-700">{eyebrow}</p>
              </div>
            </div>

            <div className="space-y-5">
              <h1 className="hidden max-w-lg text-5xl font-semibold leading-none tracking-[-0.05em] sm:block sm:text-6xl">
                {title}
              </h1>
              <p className="hidden max-w-lg text-base leading-7 text-slate-600 sm:block sm:text-lg">
                {description}
              </p>
              <div className="flex max-w-2xl flex-wrap gap-3 pt-2">
                {features.map((feature) => (
                  <span
                    key={feature}
                    className="rounded-full border border-white/70 bg-white/55 px-4 py-2 text-sm font-medium text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center px-6 pb-12 sm:px-10 lg:px-12 lg:py-12 xl:px-16">
          <div className="w-full">{children}</div>
        </section>
      </div>
    </div>
  );
}
