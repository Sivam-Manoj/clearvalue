"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/services/auth";
import { Eye, EyeOff, Mail, Lock, Loader2, User } from "lucide-react";

export default function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await AuthService.signup({
        email,
        password,
        companyName: companyName || undefined,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
        companyAddress: companyAddress || undefined,
        username,
      });
      setMessage(
        res.message ||
          "Signup successful. Check your email for verification code."
      );
      setTimeout(() => {
        router.replace(`/verify-email?email=${encodeURIComponent(email)}`);
      }, 800);
    } catch (err: any) {
      setError(err?.message || "Failed to sign up");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto w-full max-w-xl space-y-5 rounded-2xl ring-1 ring-rose-100 bg-white/90 p-6 sm:p-7 shadow-[0_20px_60px_rgba(244,63,94,0.10)] backdrop-blur"
    >
      <div className="flex justify-center">
        <div className="rounded-2xl bg-gradient-to-tr from-rose-100 via-rose-50 to-white ring-1 ring-rose-100 shadow-inner p-3">
          <div
            dangerouslySetInnerHTML={{
              __html:
                '<lottie-player src="/signupAnimation.json" background="transparent" speed="1" style="width: 180px; height: 180px;" loop autoplay></lottie-player>',
            }}
          />
        </div>
      </div>
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold text-rose-900">Create account</h1>
        <p className="text-sm text-rose-700/70">Join to get started</p>
      </div>
      {error && (
        <div className="rounded-md ring-1 ring-red-200 bg-red-50 p-2 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-md ring-1 ring-green-200 bg-green-50 p-2 text-sm text-green-700 shadow-sm">
          {message}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Username
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rose-400" />
            <input
              type="text"
              placeholder="Your username"
              className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 pl-10 text-sm text-rose-900 shadow-sm placeholder:text-rose-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rose-400" />
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 pl-10 text-sm text-rose-900 shadow-sm placeholder:text-rose-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rose-400" />
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 pl-10 pr-10 text-sm text-rose-900 shadow-sm placeholder:text-rose-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-rose-500 hover:text-rose-700"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-rose-700/70">Minimum 6 characters.</p>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Company Name
          </label>
          <input
            type="text"
            placeholder="Your company"
            className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-rose-900 shadow-sm placeholder:text-rose-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Contact Email
          </label>
          <input
            type="email"
            placeholder="contact@company.com"
            className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-rose-900 shadow-sm placeholder:text-rose-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Contact Phone
          </label>
          <input
            type="tel"
            placeholder="(555) 123-4567"
            className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-rose-900 shadow-sm placeholder:text-rose-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Company Address
          </label>
          <textarea
            className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-rose-900 shadow-sm placeholder:text-rose-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            rows={3}
            value={companyAddress}
            onChange={(e) => setCompanyAddress(e.target.value)}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white ring-1 ring-rose-200 shadow-md transition-all hover:bg-rose-500 hover:shadow-lg active:translate-y-[1px] disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Creating...
          </>
        ) : (
          "Sign up"
        )}
      </button>
      <div className="text-sm">
        Have an account?{" "}
        <button
          type="button"
          className="text-rose-600 hover:underline"
          onClick={() => router.push("/login")}
        >
          Sign in
        </button>
      </div>
    </form>
  );
}
