"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  anchorX: number;
  anchorY: number;
  phase: number;
  speed: number;
  orbit: number;
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
    let tick = 0;

    const RULES = {
      maxDistance: 190,
      maxNeighbors: 4,
      repelDistance: 34,
      spring: 0.055,
      pulseMin: 0.0022,
      pulseVariance: 0.003,
    };

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

    const resize = () => {
      const { innerWidth, innerHeight, devicePixelRatio } = window;
      const ratio = Math.min(devicePixelRatio || 1, 1.5);

      canvas.width = innerWidth * ratio;
      canvas.height = innerHeight * ratio;
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const count = Math.max(42, Math.min(88, Math.floor(innerWidth / 15)));
      const cols = Math.max(5, Math.ceil(Math.sqrt((count * innerWidth) / Math.max(innerHeight, 1))));
      const rows = Math.max(4, Math.ceil(count / cols));
      const cellWidth = innerWidth / cols;
      const cellHeight = innerHeight / rows;

      particles = Array.from({ length: count }, (_, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const anchorX = (col + 0.5) * cellWidth + (Math.random() - 0.5) * cellWidth * 0.35;
        const anchorY = (row + 0.5) * cellHeight + (Math.random() - 0.5) * cellHeight * 0.35;

        return {
          x: anchorX,
          y: anchorY,
          anchorX,
          anchorY,
          phase: Math.random() * Math.PI * 2,
          speed: 0.6 + Math.random() * 0.9,
          orbit: 10 + Math.random() * 24,
          radius: 1.8 + Math.random() * 2.2,
          color: index % 2 === 0 ? palette.red : palette.blue,
        };
      });
    };

    const draw = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      tick += 1;
      const t = tick * 0.012;

      context.clearRect(0, 0, width, height);

      for (const particle of particles) {
        const targetX =
          particle.anchorX +
          Math.cos(t * particle.speed + particle.phase) * particle.orbit;
        const targetY =
          particle.anchorY +
          Math.sin(t * (particle.speed * 0.82) + particle.phase) * particle.orbit * 0.75;

        particle.x += (targetX - particle.x) * RULES.spring;
        particle.y += (targetY - particle.y) * RULES.spring;
      }

      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const a = particles[i];
          const b = particles[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distanceSq = dx * dx + dy * dy;

          if (distanceSq < RULES.repelDistance * RULES.repelDistance && distanceSq > 0.01) {
            const distance = Math.sqrt(distanceSq);
            const force = (1 - distance / RULES.repelDistance) * 0.35;
            const pushX = (dx / distance) * force;
            const pushY = (dy / distance) * force;
            a.x -= pushX;
            a.y -= pushY;
            b.x += pushX;
            b.y += pushY;
          }
        }
      }

      const edges: Edge[] = [];
      const neighborCounts = new Array(particles.length).fill(0);

      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          if (neighborCounts[i] >= RULES.maxNeighbors || neighborCounts[j] >= RULES.maxNeighbors) {
            continue;
          }

          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distanceSq = dx * dx + dy * dy;

          if (distanceSq > RULES.maxDistance * RULES.maxDistance) continue;

          edges.push({
            from: i,
            to: j,
            color: getEdgeColor(i),
            pulseOffset: (i * 0.173 + j * 0.119) % 1,
            pulseSpeed: RULES.pulseMin + ((i + j) % 7) * (RULES.pulseVariance / 7),
          });

          neighborCounts[i] += 1;
          neighborCounts[j] += 1;
        }
      }

      for (const edge of edges) {
        const from = particles[edge.from];
        const to = particles[edge.to];
        const dx = from.x - to.x;
        const dy = from.y - to.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const opacity = 1 - distance / RULES.maxDistance;

        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.strokeStyle = edge.color.replace(/[\d.]+\)$/u, `${Math.max(0.04, opacity)})`);
        context.lineWidth = 1.05;
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
