"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthContext } from "@/context/AuthContext";
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { login } = useAuthContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@clearvalue.com";

  // Safely read search params after mount to avoid hydration issues
  useEffect(() => {
    const emailParam = search.get("email");
    if (emailParam && !email) {
      setEmail(emailParam);
    }
  }, [search]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      const next = search.get("next");
      router.replace(next || "/");
    } catch (err: any) {
      setError(err?.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  const isBlocked = (error || "").toLowerCase().includes("blocked");

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto w-full max-w-md space-y-5 rounded-xl border border-gray-200 bg-white/90 p-6 shadow-lg backdrop-blur"
    >
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Welcome back</h1>
        <p className="text-sm text-gray-600">Sign in to continue</p>
      </div>
      {error && (
        isBlocked ? (
          <div className="rounded-xl border border-red-300 bg-red-50/90 p-3 text-sm text-red-800 shadow-sm">
            <div className="font-medium">Your account is blocked.</div>
            <div className="mt-1 text-[13px] text-red-900/80">
              Please contact our support team at
              {" "}
              <a
                className="font-medium text-red-700 underline underline-offset-2 hover:text-red-800 cursor-pointer"
                href={`mailto:${supportEmail}`}
              >
                {supportEmail}
              </a>
              {" "}
              for assistance.
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700">
            {error}
          </div>
        )
      )}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pl-10 text-sm shadow-sm placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pl-10 pr-10 text-sm shadow-sm placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-red-500 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
          </>
        ) : (
          "Sign in"
        )}
      </button>
      <div className="flex justify-between text-sm">
        <button
          type="button"
          className="text-red-600 hover:underline"
          onClick={() => router.push("/signup")}
        >
          Create account
        </button>
        <button
          type="button"
          className="text-red-600 hover:underline"
          onClick={() => router.push("/forgot-password")}
        >
          Forgot password?
        </button>
      </div>
    </form>
  );
}
