"use client";

import { useEffect, useState, useCallback } from "react";
import BottomDrawer from "@/components/BottomDrawer";
import {
  ReportsService,
  type ReportStats,
  type PdfReport,
} from "@/services/reports";
import { useAuthContext } from "@/context/AuthContext";
import {
  FileBarChart2,
  Building2,
  Car,
  Package,
  DollarSign,
  ChevronRight,
  TrendingUp,
  PieChart,
  BarChart3,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Loading from "@/components/common/Loading";

const RealEstateForm = dynamic(
  () => import("@/components/forms/RealEstateForm"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-8 min-h-[220px]">
        <Loading message="Loading form..." height={140} width={140} />
      </div>
    ),
  }
);

const SalvageForm = dynamic(() => import("@/components/forms/SalvageForm"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-8 min-h-[220px]">
      <Loading message="Loading form..." height={140} width={140} />
    </div>
  ),
});

const AssetForm = dynamic(() => import("@/components/forms/AssetForm"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-8 min-h-[220px]">
      <Loading message="Loading form..." height={140} width={140} />
    </div>
  ),
});

export default function DashboardPage() {
  const { user } = useAuthContext();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState<
    "real-estate" | "salvage" | "asset" | null
  >(null);
  const titles: Record<NonNullable<typeof drawerType>, string> = {
    "real-estate": "Real Estate",
    salvage: "Salvage",
    asset: "Asset",
  };
  const placeholders: Record<NonNullable<typeof drawerType>, string> = {
    "real-estate": "Enter property address",
    salvage: "Enter VIN or ID",
    asset: "Enter asset name",
  };

  const [stats, setStats] = useState<ReportStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [recent, setRecent] = useState<PdfReport[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState<string | null>(null);

  // Live date/time for header card
  const [now, setNow] = useState<Date>(new Date());
  const [mounted, setMounted] = useState(false);

  // Listen for load-saved-input event to open asset drawer
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const savedInput = e.detail;
      if (savedInput) {
        setDrawerType("asset");
        setDrawerOpen(true);
      }
    };
    window.addEventListener("load-saved-input" as any, handler as any);
    return () => {
      window.removeEventListener("load-saved-input" as any, handler as any);
    };
  }, []);

  // Listen for load-realestate-input event to open real estate drawer
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const savedInput = e.detail;
      if (savedInput) {
        setDrawerType("real-estate");
        setDrawerOpen(true);
      }
    };
    window.addEventListener("load-realestate-input" as any, handler as any);
    return () => {
      window.removeEventListener("load-realestate-input" as any, handler as any);
    };
  }, []);

  const fetchRecent = useCallback(async () => {
    setRecentLoading(true);
    setRecentError(null);
    try {
      const data = await ReportsService.getMyReports();

      // Group by report ID to avoid showing duplicate reports (same report with multiple file types)
      const groupMap = new Map<string, PdfReport>();
      for (const r of data) {
        const key = String(((r as any).report as string | undefined) || r._id);
        const existing = groupMap.get(key);
        if (
          !existing ||
          new Date(r.createdAt).getTime() >
            new Date(existing.createdAt).getTime()
        ) {
          groupMap.set(key, r);
        }
      }

      // Convert to array and sort by date
      const grouped = Array.from(groupMap.values());
      const sorted = grouped.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setRecent(sorted.slice(0, 5));
    } catch (err: any) {
      setRecentError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load recent reports"
      );
    } finally {
      setRecentLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    setStatsError(null);
    ReportsService.getReportStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err: any) => {
        if (!cancelled)
          setStatsError(
            err?.response?.data?.message ||
              err?.message ||
              "Failed to load stats"
          );
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    fetchRecent();
    const handler = () => fetchRecent();
    window.addEventListener("cv:report-created", handler);
    return () => {
      window.removeEventListener("cv:report-created", handler);
    };
  }, [fetchRecent]);

  // Tick the clock every second
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Formatted date/time strings
  const dayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
    now
  );
  const dateFull = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(now);
  const timeStr = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(now);
  const tzShort =
    new Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
      .formatToParts(now)
      .find((p) => p.type === "timeZoneName")?.value || "";

  // Helper: relative time like "3h ago"
  const timeAgo = (input: Date) => {
    const divisors: [Intl.RelativeTimeFormatUnit, number][] = [
      ["year", 1000 * 60 * 60 * 24 * 365],
      ["month", 1000 * 60 * 60 * 24 * 30],
      ["week", 1000 * 60 * 60 * 24 * 7],
      ["day", 1000 * 60 * 60 * 24],
      ["hour", 1000 * 60 * 60],
      ["minute", 1000 * 60],
      ["second", 1000],
    ];
    const diff = input.getTime() - Date.now();
    const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
    for (const [unit, ms] of divisors) {
      if (Math.abs(diff) >= ms || unit === "second") {
        return rtf.format(Math.round(diff / ms), unit);
      }
    }
    return "just now";
  };

  // Dynamic greeting based on current hour
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const greetingText = mounted ? greeting : "Welcome";

  return (
    <div className="relative isolate">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="space-y-8">
          <div className="relative overflow-hidden rounded-3xl border border-rose-200 bg-white/80 p-5 sm:p-6 md:p-8 shadow ring-1 ring-black/5 backdrop-blur">
            <div className="pointer-events-none absolute -top-24 -left-16 h-48 w-48 rounded-full bg-gradient-to-br from-rose-500/10 to-red-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-16 h-56 w-56 rounded-full bg-gradient-to-tl from-rose-500/10 to-red-500/10 blur-3xl" />

            <div className="relative">
              <div className="max-w-2xl">
                <h1
                  className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-rose-600 to-red-500 bg-clip-text text-transparent drop-shadow-sm"
                  suppressHydrationWarning
                >
                  Dashboard
                </h1>
                <div className="mt-1 flex items-center justify-between">
                  <p
                    className="text-base md:text-lg text-gray-900 font-semibold"
                    suppressHydrationWarning
                  >
                    {greetingText},{" "}
                    <span className="font-medium">
                      {user?.username || user?.email || "there"}
                    </span>
                  </p>
                  <span
                    className="text-xs md:text-sm text-gray-700 tabular-nums whitespace-nowrap"
                    suppressHydrationWarning
                  >
                    {mounted
                      ? now.toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                    {" · "}
                    {mounted ? timeStr : ""}
                  </span>
                </div>
                <p className="mt-1 text-sm md:text-base text-gray-600">
                  Overview of your ClearValue activity and insights.
                </p>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Real Estate (emerald) */}
            <button
              type="button"
              onClick={() => {
                setDrawerType("real-estate");
                setDrawerOpen(true);
              }}
              aria-label="Create Real Estate report"
              className="group flex items-center justify-between rounded-2xl border border-emerald-800 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-left shadow-md ring-1 ring-black/5 transition cursor-pointer active:translate-y-[1px]"
            >
              <div>
                <p className="text-xl font-bold text-white">Real Estate</p>
                <p className="text-xs text-white/90">
                  Create a new property record
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 text-white ring-2 ring-white/30 shadow-lg shadow-emerald-500/50 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-xl group-hover:shadow-emerald-500/60">
                <Building2 className="h-7 w-7 drop-shadow-md" strokeWidth={2.5} />
              </div>
            </button>

            {/* Salvage (amber) */}
            <button
              type="button"
              onClick={() => {
                setDrawerType("salvage");
                setDrawerOpen(true);
              }}
              aria-label="Create Salvage report"
              className="group flex items-center justify-between rounded-2xl border border-amber-800 bg-gradient-to-b from-amber-500 to-amber-700 px-4 py-3 text-left shadow-md ring-1 ring-black/5 transition cursor-pointer active:translate-y-[1px]"
            >
              <div>
                <p className="text-xl font-bold text-white">Salvage</p>
                <p className="text-xs text-white/90">
                  Start a new salvage entry
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 text-white ring-2 ring-white/30 shadow-lg shadow-amber-500/50 transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6 group-hover:shadow-xl group-hover:shadow-amber-500/60">
                <Car className="h-7 w-7 drop-shadow-md" strokeWidth={2.5} />
              </div>
            </button>

            {/* Asset (sky) */}
            <button
              type="button"
              onClick={() => {
                setDrawerType("asset");
                setDrawerOpen(true);
              }}
              aria-label="Create Asset report"
              className="group flex items-center justify-between rounded-2xl border border-sky-800 bg-gradient-to-b from-sky-500 to-sky-700 px-4 py-3 text-left shadow-md ring-1 ring-black/5 transition cursor-pointer active:translate-y-[1px]"
            >
              <div>
                <p className="text-xl font-bold text-white">Asset</p>
                <p className="text-xs text-white/90">Add a general asset</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-white ring-2 ring-white/30 shadow-lg shadow-sky-500/50 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-xl group-hover:shadow-sky-500/60">
                <Package className="h-7 w-7 drop-shadow-md" strokeWidth={2.5} />
              </div>
            </button>
          </div>

          {/* Report stats with valuation breakdown - Professional Design */}
          <div className="space-y-4">
            {statsLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="h-32 w-full animate-pulse rounded-2xl bg-gradient-to-br from-rose-100 to-rose-50" />
                  <div className="h-32 w-full animate-pulse rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50" />
                </div>
                <div className="h-48 w-full animate-pulse rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50" />
              </div>
            ) : statsError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  {statsError}
                </div>
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Total Reports Card */}
                  <div className="group relative overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-br from-white via-rose-50/30 to-pink-50/50 p-6 shadow-lg ring-1 ring-black/5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-rose-500/20">
                    <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-rose-400/20 to-pink-500/20 blur-2xl transition-all duration-500 group-hover:scale-150" />
                    <div className="relative flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <FileBarChart2 className="h-5 w-5 text-rose-600" strokeWidth={2.5} />
                          <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Reports</p>
                        </div>
                        <p className="text-4xl font-black bg-gradient-to-br from-rose-600 via-rose-700 to-pink-600 bg-clip-text text-transparent">
                          {stats?.totalReports ?? 0}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">All-time generated</p>
                      </div>
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 via-rose-600 to-pink-600 text-white shadow-lg shadow-rose-500/50 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                        <BarChart3 className="h-9 w-9 drop-shadow-md" strokeWidth={2.5} />
                      </div>
                    </div>
                  </div>

                  {/* Total Value Card */}
                  <div className="group relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/50 p-6 shadow-lg ring-1 ring-black/5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/20">
                    <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-emerald-400/20 to-teal-500/20 blur-2xl transition-all duration-500 group-hover:scale-150" />
                    <div className="relative flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="h-5 w-5 text-emerald-600" strokeWidth={2.5} />
                          <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Value</p>
                        </div>
                        <p className="text-4xl font-black bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-600 bg-clip-text text-transparent">
                          {new Intl.NumberFormat("en-US", {
                            notation: "compact",
                            compactDisplay: "short",
                            maximumFractionDigits: 2,
                          }).format(stats?.totalFairMarketValue ?? 0)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                            minimumFractionDigits: 2,
                          }).format(stats?.totalFairMarketValue ?? 0)}
                        </p>
                      </div>
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/50 transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6">
                        <TrendingUp className="h-9 w-9 drop-shadow-md" strokeWidth={2.5} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Valuation Methods Breakdown */}
                <div className="relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-white via-blue-50/20 to-indigo-50/30 p-6 shadow-lg ring-1 ring-black/5 backdrop-blur">
                  <div className="pointer-events-none absolute -left-12 -top-12 h-48 w-48 rounded-full bg-gradient-to-br from-blue-400/10 to-indigo-500/10 blur-3xl" />
                  <div className="pointer-events-none absolute -right-12 -bottom-12 h-48 w-48 rounded-full bg-gradient-to-tl from-violet-400/10 to-purple-500/10 blur-3xl" />
                  
                  <div className="relative">
                    <div className="mb-6 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
                        <PieChart className="h-6 w-6" strokeWidth={2.5} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Valuation Methods Analysis</h3>
                        <p className="text-xs text-gray-500">Distribution across all reports</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Reports Type Breakdown */}
                      <div className="rounded-xl border border-gray-200 bg-white/80 p-5 shadow-sm backdrop-blur">
                        <div className="mb-4 flex items-center justify-between">
                          <h4 className="text-sm font-bold uppercase tracking-wide text-gray-700">Reports Type Count</h4>
                          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                            {(stats?.breakdown?.counts?.FMV ?? 0) + 
                             (stats?.breakdown?.counts?.OLV ?? 0) + 
                             (stats?.breakdown?.counts?.FLV ?? 0) + 
                             (stats?.breakdown?.counts?.TKV ?? 0)} Total
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: 'FMV', value: stats?.breakdown?.counts?.FMV ?? 0, gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-200', text: 'text-blue-700' },
                            { label: 'OLV', value: stats?.breakdown?.counts?.OLV ?? 0, gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', ring: 'ring-amber-200', text: 'text-amber-700' },
                            { label: 'FLV', value: stats?.breakdown?.counts?.FLV ?? 0, gradient: 'from-red-500 to-rose-600', bg: 'bg-red-50', ring: 'ring-red-200', text: 'text-red-700' },
                            { label: 'TKV', value: stats?.breakdown?.counts?.TKV ?? 0, gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', ring: 'ring-violet-200', text: 'text-violet-700' },
                          ].map((method) => (
                            <div
                              key={method.label}
                              className={`group relative overflow-hidden rounded-xl ${method.bg} border ${method.ring} p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md`}
                            >
                              <div className={`pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br ${method.gradient} opacity-10 blur-xl transition-all duration-500 group-hover:scale-150`} />
                              <div className="relative">
                                <p className={`text-xs font-bold uppercase tracking-wider ${method.text}`}>{method.label}</p>
                                <p className="mt-2 text-2xl font-black text-gray-900">{method.value}</p>
                                <div className={`mt-2 h-1.5 w-full rounded-full bg-gradient-to-r ${method.gradient} opacity-60`} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Reports Value Breakdown */}
                      <div className="rounded-xl border border-gray-200 bg-white/80 p-5 shadow-sm backdrop-blur">
                        <div className="mb-4 flex items-center justify-between">
                          <h4 className="text-sm font-bold uppercase tracking-wide text-gray-700">Reports Value Total</h4>
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            {new Intl.NumberFormat("en-US", {
                              notation: "compact",
                              compactDisplay: "short",
                            }).format(
                              (stats?.breakdown?.values?.FMV ?? 0) + 
                              (stats?.breakdown?.values?.OLV ?? 0) + 
                              (stats?.breakdown?.values?.FLV ?? 0) + 
                              (stats?.breakdown?.values?.TKV ?? 0)
                            )}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: 'FMV', value: stats?.breakdown?.values?.FMV ?? 0, gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-200', text: 'text-blue-700' },
                            { label: 'OLV', value: stats?.breakdown?.values?.OLV ?? 0, gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', ring: 'ring-amber-200', text: 'text-amber-700' },
                            { label: 'FLV', value: stats?.breakdown?.values?.FLV ?? 0, gradient: 'from-red-500 to-rose-600', bg: 'bg-red-50', ring: 'ring-red-200', text: 'text-red-700' },
                            { label: 'TKV', value: stats?.breakdown?.values?.TKV ?? 0, gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', ring: 'ring-violet-200', text: 'text-violet-700' },
                          ].map((method) => (
                            <div
                              key={method.label}
                              className={`group relative overflow-hidden rounded-xl ${method.bg} border ${method.ring} p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md`}
                            >
                              <div className={`pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br ${method.gradient} opacity-10 blur-xl transition-all duration-500 group-hover:scale-150`} />
                              <div className="relative">
                                <p className={`text-xs font-bold uppercase tracking-wider ${method.text}`}>{method.label}</p>
                                <p className="mt-2 text-xl font-black text-gray-900">
                                  {new Intl.NumberFormat("en-US", {
                                    notation: "compact",
                                    compactDisplay: "short",
                                    maximumFractionDigits: 1,
                                  }).format(method.value)}
                                </p>
                                <p className="mt-1 text-[10px] text-gray-500">
                                  {new Intl.NumberFormat("en-US", {
                                    style: "currency",
                                    currency: "USD",
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                  }).format(method.value)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-rose-200 bg-white/90 p-4 shadow ring-1 ring-black/5 backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                Recent Reports
              </h2>
              <button
                type="button"
                onClick={() => router.push("/reports")}
                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-all hover:bg-blue-100 hover:shadow-sm"
                title="View all reports"
              >
                View all
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            {recentLoading ? (
              <div className="mt-3 space-y-2">
                <div className="h-10 w-full animate-pulse rounded bg-rose-50" />
                <div className="h-10 w-full animate-pulse rounded bg-rose-50" />
                <div className="h-10 w-full animate-pulse rounded bg-rose-50" />
              </div>
            ) : recentError ? (
              <div className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                {recentError}
              </div>
            ) : recent.length === 0 ? (
              <div className="mt-2 text-sm text-gray-600">
                <p>No recent reports. Create one to see it here.</p>
                <button
                  type="button"
                  onClick={() => {
                    setDrawerType("real-estate");
                    setDrawerOpen(true);
                  }}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 hover:underline"
                >
                  Create your first report
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-rose-200">
                {recent.map((r) => (
                  <li key={r._id}>
                    <button
                      onClick={() => router.push("/reports")}
                      className="group w-full text-left px-3 py-3 rounded-xl flex items-center justify-between transition-all hover:bg-rose-50/70 focus:outline-none focus:ring-2 focus:ring-rose-500/20 hover:-translate-y-0.5 hover:shadow-md cursor-pointer ring-1 ring-transparent hover:ring-rose-200"
                      title="Go to reports"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">
                          {r.address}
                        </p>
                        <p
                          suppressHydrationWarning
                          className="text-xs text-gray-500"
                          title={
                            mounted
                              ? new Date(r.createdAt).toLocaleString()
                              : ""
                          }
                        >
                          {mounted
                            ? new Date(r.createdAt).toLocaleDateString("en-US")
                            : "—"}
                          {mounted && (
                            <>
                              {" · "}
                              {timeAgo(new Date(r.createdAt))}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.valuationMethods && r.valuationMethods.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {r.valuationMethods.map((vm, idx) => {
                              const method = String(vm.method || "").toUpperCase();
                              const colorMap: Record<string, { bg: string; text: string; border: string }> = {
                                FMV: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
                                FML: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
                                OLV: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
                                FLV: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
                                TKV: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
                              };
                              const colors = colorMap[method] || colorMap.FMV;
                              return (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center gap-1 rounded-full ${colors.bg} ${colors.text} border ${colors.border} px-2 py-0.5 text-[10px] font-bold uppercase`}
                                  title={`${method}: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(vm.value)}`}
                                >
                                  <span>{method}</span>
                                  <span className="opacity-75">
                                    {new Intl.NumberFormat('en-US', {
                                      notation: 'compact',
                                      compactDisplay: 'short',
                                      maximumFractionDigits: 1,
                                    }).format(vm.value)}
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 text-xs font-semibold">
                            {r.fairMarketValue ?? 0}
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 text-rose-400 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Bottom drawer */}
          <BottomDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            title={drawerType ? `${titles[drawerType]} Details` : undefined}
          >
            {drawerType === "real-estate" ? (
              <RealEstateForm
                onSuccess={() => setDrawerOpen(false)}
                onCancel={() => setDrawerOpen(false)}
              />
            ) : drawerType === "salvage" ? (
              <SalvageForm
                onSuccess={() => setDrawerOpen(false)}
                onCancel={() => setDrawerOpen(false)}
              />
            ) : drawerType === "asset" ? (
              <AssetForm
                onSuccess={() => setDrawerOpen(false)}
                onCancel={() => setDrawerOpen(false)}
              />
            ) : null}
          </BottomDrawer>
        </div>
      </div>
    </div>
  );
}
