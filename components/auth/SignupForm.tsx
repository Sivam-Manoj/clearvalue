"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/services/auth";
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react";

export default function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
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
      className="mx-auto w-full max-w-xl space-y-5 rounded-xl border border-gray-200 bg-white/90 p-6 shadow-lg backdrop-blur"
    >
      <div className="flex justify-center">
        <div
          dangerouslySetInnerHTML={{
            __html:
              '<lottie-player src="/signupAnimation.json" background="transparent" speed="1" style="width: 180px; height: 180px;" loop autoplay></lottie-player>',
          }}
        />
      </div>
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Create account</h1>
        <p className="text-sm text-gray-600">Join to get started</p>
      </div>
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-md border border-green-300 bg-green-50 p-2 text-sm text-green-700">
          {message}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>
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
        <div className="space-y-1 sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pl-10 pr-10 text-sm shadow-sm placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
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
          <p className="text-xs text-gray-500">Minimum 6 characters.</p>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Company Name
          </label>
          <input
            type="text"
            placeholder="Your company"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
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
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
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
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Company Address
          </label>
          <textarea
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            rows={3}
            value={companyAddress}
            onChange={(e) => setCompanyAddress(e.target.value)}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-red-500 disabled:opacity-50"
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
          className="text-red-600 hover:underline"
          onClick={() => router.push("/login")}
        >
          Sign in
        </button>
      </div>
    </form>
  );
}
