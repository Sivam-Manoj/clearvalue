"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/services/auth";
import { ArrowRight, Building2, Eye, EyeOff, Lock, Mail, MapPin, Phone, User } from "lucide-react";
import AuthLightShell from "@/components/auth/AuthLightShell";

const SIGNUP_FEATURES = [
  "Client onboarding",
  "Company profile",
  "Secure verification",
  "Report access",
];

export default function SignupForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
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

  const canContinueStepOne = email.trim().length > 0 && password.trim().length >= 6;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nativeEvent = e.nativeEvent as SubmitEvent;
    const submitter = nativeEvent.submitter as HTMLButtonElement | null;

    if (step === 1) {
      if (canContinueStepOne) {
        setStep(2);
      }
      return;
    }

    if (submitter?.dataset.signupSubmit !== "true") {
      return;
    }

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
      setMessage(res.message || "Signup successful. Check your email for verification code.");
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
    <AuthLightShell
      eyebrow="Client onboarding"
      title="Create your Asset Insight account."
      description="Set up your profile, company details, and contact information to start using the client workspace."
      features={SIGNUP_FEATURES}
    >
      <form
        onSubmit={onSubmit}
        noValidate
        className="ml-auto w-full max-w-[34rem] rounded-[1.75rem] border border-white/60 bg-white/78 p-4 shadow-[0_24px_90px_rgba(15,23,42,0.12)] backdrop-blur-2xl sm:rounded-[2rem] sm:p-5 lg:p-6"
      >
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
            Create account
          </p>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-[2rem]">
              Create your client workspace.
            </h2>
            <p className="hidden max-w-lg text-sm leading-6 text-slate-600 sm:block sm:text-base">
              Join the platform with your company details and verify your account to continue.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-[1.25rem] border border-slate-200/80 bg-white/70 p-2 shadow-[0_10px_20px_rgba(15,23,42,0.05)] sm:mt-5 sm:rounded-[1.5rem] sm:p-2.5">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`rounded-xl px-3 py-2.5 text-left transition sm:rounded-2xl sm:px-4 sm:py-3 ${
                step === 1
                  ? "bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]"
                  : "bg-white/75 text-slate-600 hover:bg-white"
              }`}
            >
              <div className="text-[0.68rem] font-semibold uppercase tracking-[0.28em]">1 Credentials</div>
              <div className={`mt-0.5 text-xs sm:mt-1 sm:text-sm ${step === 1 ? "text-slate-200" : "text-slate-500"}`}>
                Email and password
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                if (canContinueStepOne) setStep(2);
              }}
              className={`rounded-xl px-3 py-2.5 text-left transition sm:rounded-2xl sm:px-4 sm:py-3 ${
                step === 2
                  ? "bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]"
                  : "bg-white/75 text-slate-600 hover:bg-white"
              }`}
            >
              <div className="text-[0.68rem] font-semibold uppercase tracking-[0.28em]">2 Details</div>
              <div className={`mt-0.5 text-xs sm:mt-1 sm:text-sm ${step === 2 ? "text-slate-200" : "text-slate-500"}`}>
                Profile and company
              </div>
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mt-6 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="mt-5 grid grid-cols-1 gap-3">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <span className="relative block">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="h-13 w-full rounded-[1.15rem] border border-slate-200/80 bg-white/90 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 sm:h-14 sm:rounded-2xl sm:pl-12"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </span>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Password</span>
              <span className="relative block">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Enter your password"
                  className="h-13 w-full rounded-[1.15rem] border border-slate-200/80 bg-white/90 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 sm:h-14 sm:rounded-2xl sm:pl-12 sm:pr-14"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-900/5 hover:text-slate-700 sm:right-3 sm:h-9 sm:w-9"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
              <p className="text-xs text-slate-500">Minimum 6 characters.</p>
            </label>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block space-y-2 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Username</span>
              <span className="relative block">
                <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Your username"
                  className="h-13 w-full rounded-[1.15rem] border border-slate-200/80 bg-white/90 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 sm:h-14 sm:rounded-2xl sm:pl-12"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </span>
            </label>

            <label className="block space-y-2 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Company name</span>
              <span className="relative block">
                <Building2 className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Your company"
                  className="h-13 w-full rounded-[1.15rem] border border-slate-200/80 bg-white/90 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 sm:h-14 sm:rounded-2xl sm:pl-12"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </span>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Contact email</span>
              <span className="relative block">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  placeholder="contact@company.com"
                  className="h-13 w-full rounded-[1.15rem] border border-slate-200/80 bg-white/90 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 sm:h-14 sm:rounded-2xl sm:pl-12"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </span>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Contact phone</span>
              <span className="relative block">
                <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  placeholder="(555) 123-4567"
                  className="h-13 w-full rounded-[1.15rem] border border-slate-200/80 bg-white/90 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 sm:h-14 sm:rounded-2xl sm:pl-12"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </span>
            </label>

            <label className="block space-y-2 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Company address</span>
              <span className="relative block">
                <MapPin className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-slate-400" />
                <textarea
                  rows={2}
                  className="w-full rounded-[1.15rem] border border-slate-200/80 bg-white/90 pl-11 pr-4 pt-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 sm:rounded-2xl sm:pl-12 sm:pt-4"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                />
              </span>
            </label>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              className="text-left text-sm text-slate-600 transition hover:text-blue-600"
              onClick={() => router.push("/login")}
            >
              Already have an account? Sign in
            </button>
            {step === 2 ? (
              <button
                type="button"
                className="text-sm text-slate-600 transition hover:text-slate-950"
                onClick={() => setStep(1)}
              >
                Back to credentials
              </button>
            ) : null}
          </div>

          {step === 1 ? (
            <button
              type="button"
              disabled={!canContinueStepOne}
              onClick={() => setStep(2)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:scale-[1.01] hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 sm:h-14 sm:px-6"
            >
              <span>Continue</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              data-signup-submit="true"
              disabled={loading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:scale-[1.01] hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 sm:h-14 sm:px-6"
            >
              <span>{loading ? "Creating..." : "Create account"}</span>
              <ArrowRight className={`h-4 w-4 ${loading ? "animate-pulse" : ""}`} />
            </button>
          )}
        </div>
      </form>
    </AuthLightShell>
  );
}
