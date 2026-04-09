"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthContext } from "@/context/AuthContext";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
};

function ParticleField({ theme }: { theme: "light" | "dark" }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame = 0;
    let particles: Particle[] = [];

    const palette =
      theme === "dark"
        ? {
            red: "rgba(248, 113, 113, 0.95)",
            blue: "rgba(96, 165, 250, 0.95)",
            redLine: "rgba(248, 113, 113, 0.18)",
            blueLine: "rgba(96, 165, 250, 0.18)",
          }
        : {
            red: "rgba(220, 38, 38, 0.9)",
            blue: "rgba(37, 99, 235, 0.9)",
            redLine: "rgba(220, 38, 38, 0.12)",
            blueLine: "rgba(37, 99, 235, 0.12)",
          };

    const resize = () => {
      const { innerWidth, innerHeight, devicePixelRatio } = window;
      const ratio = devicePixelRatio || 1;

      canvas.width = innerWidth * ratio;
      canvas.height = innerHeight * ratio;
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const count = Math.max(26, Math.min(72, Math.floor(innerWidth / 22)));
      particles = Array.from({ length: count }, (_, index) => {
        const isRed = index % 2 === 0;
        return {
          x: Math.random() * innerWidth,
          y: Math.random() * innerHeight,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          radius: 1.2 + Math.random() * 2.2,
          color: isRed ? palette.red : palette.blue,
        };
      });
    };

    const draw = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      context.clearRect(0, 0, width, height);

      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x <= 0 || particle.x >= width) particle.vx *= -1;
        if (particle.y <= 0 || particle.y >= height) particle.vy *= -1;
      }

      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 150) continue;

          const opacity = 1 - distance / 150;
          const stroke =
            i % 2 === 0
              ? palette.redLine.replace(/[\d.]+\)$/u, `${opacity * 0.9})`)
              : palette.blueLine.replace(/[\d.]+\)$/u, `${opacity * 0.9})`);

          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.strokeStyle = stroke;
          context.lineWidth = 1;
          context.stroke();
        }
      }

      for (const particle of particles) {
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = particle.color;
        context.shadowBlur = 14;
        context.shadowColor = particle.color;
        context.fill();
      }

      context.shadowBlur = 0;
      animationFrame = window.requestAnimationFrame(draw);
    };

    resize();
    draw();

    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full opacity-90"
    />
  );
}

export default function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { login } = useAuthContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@assetinsightvaluation.com";

  useEffect(() => {
    const emailParam = search.get("email");
    if (emailParam && !email) {
      setEmail(emailParam);
    }
  }, [search, email]);

  useEffect(() => {
    const updateTheme = () => {
      if (typeof document === "undefined") return;
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      const next = search.get("next");
      router.replace(next || "/dashboard");
    } catch (err: any) {
      setError(err?.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  const isBlocked = (error || "").toLowerCase().includes("blocked");

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-slate-100 text-slate-950 transition-colors dark:bg-slate-950 dark:text-slate-50">
      <ParticleField theme={theme} />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.22),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(37,99,235,0.2),_transparent_26%),linear-gradient(135deg,_rgba(255,255,255,0.84),_rgba(241,245,249,0.68))] dark:bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.28),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(37,99,235,0.24),_transparent_26%),linear-gradient(135deg,_rgba(2,6,23,0.88),_rgba(15,23,42,0.74))]" />

      <div className="relative z-10 grid min-h-full lg:min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        <section className="flex items-center px-6 py-12 sm:px-10 lg:px-16 xl:px-24">
          <div className="max-w-2xl">
            <div className="mb-8 inline-flex items-center gap-4 rounded-full border border-white/50 bg-white/55 px-4 py-3 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
              <div className="relative h-11 w-11 overflow-hidden rounded-2xl bg-white/80 ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10">
                <Image
                  src="/assentInsightLogo.jpeg"
                  alt="Asset Insight logo"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.38em] text-slate-500 dark:text-slate-400">
                  Asset Insight
                </p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Connected property intelligence
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <p className="inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-300">
                Responsive motion system
              </p>
              <h1 className="max-w-xl text-5xl font-semibold leading-none tracking-[-0.05em] text-balance sm:text-6xl">
                Login that finally feels premium, not generic.
              </h1>
              <p className="max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                The whole screen now works as the experience: animated particle links, cleaner spacing, stronger typography, and a form that stays crisp across desktop and mobile in both themes.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center px-6 pb-12 sm:px-10 lg:px-12 lg:py-12 xl:px-16">
          <form
            onSubmit={onSubmit}
            className="ml-auto w-full max-w-xl rounded-[2rem] border border-white/50 bg-white/72 p-6 shadow-[0_30px_120px_rgba(15,23,42,0.16)] backdrop-blur-2xl transition-colors dark:border-white/10 dark:bg-slate-900/55 dark:shadow-[0_30px_120px_rgba(2,6,23,0.55)] sm:p-8"
          >
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                Sign in
              </p>
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-4xl">
                  Welcome back to your dashboard.
                </h2>
                <p className="max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
                  Access valuations, workflows, and account tools from one clean entry point designed around clarity instead of bulky panels.
                </p>
              </div>
            </div>

            {error ? (
              <div
                className={`mt-6 rounded-2xl px-4 py-3 text-sm ${
                  isBlocked
                    ? "border border-red-500/25 bg-red-500/10 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200"
                    : "border border-red-500/25 bg-red-500/10 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200"
                }`}
              >
                {isBlocked ? (
                  <div className="space-y-1.5">
                    <div className="font-semibold">Your account is blocked.</div>
                    <div className="text-sm">
                      Please contact{" "}
                      <a
                        className="font-medium underline underline-offset-4"
                        href={`mailto:${supportEmail}`}
                      >
                        {supportEmail}
                      </a>{" "}
                      for assistance.
                    </div>
                  </div>
                ) : (
                  error
                )}
              </div>
            ) : null}

            <div className="mt-8 space-y-5">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Email address</span>
                <span className="relative block">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="h-14 w-full rounded-2xl border border-slate-200/80 bg-white/90 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-red-400 dark:focus:ring-red-400/10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </span>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Password</span>
                <span className="relative block">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="h-14 w-full rounded-2xl border border-slate-200/80 bg-white/90 pl-12 pr-14 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-900/5 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-300">
                <button
                  type="button"
                  className="transition hover:text-red-600 dark:hover:text-red-300"
                  onClick={() => router.push("/signup")}
                >
                  Create account
                </button>
                <button
                  type="button"
                  className="transition hover:text-blue-600 dark:hover:text-blue-300"
                  onClick={() => router.push("/forgot-password")}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:scale-[1.01] hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                <span>{loading ? "Signing in..." : "Open dashboard"}</span>
                <ArrowRight className={`h-4 w-4 ${loading ? "animate-pulse" : ""}`} />
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
