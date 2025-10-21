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
        if (!existing || new Date(r.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
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
            <p className="text-xs text-white/90">Create a new property record</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-700 text-white ring-2 ring-emerald-700 shadow">
            <Building2 className="h-5 w-5" />
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
            <p className="text-xs text-white/90">Start a new salvage entry</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-amber-400 to-amber-700 text-white ring-2 ring-amber-700 shadow">
            <Car className="h-5 w-5" />
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-sky-400 to-sky-700 text-white ring-2 ring-sky-700 shadow">
            <Package className="h-5 w-5" />
          </div>
        </button>
      </div>

      {/* Report stats (horizontal & responsive, even on small screens) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {statsLoading ? (
          <>
            <div className="min-h-[6rem] h-full w-full animate-pulse rounded-2xl border border-rose-200 bg-rose-50" />
            <div className="min-h-[6rem] h-full w-full animate-pulse rounded-2xl border border-rose-200 bg-rose-50" />
          </>
        ) : statsError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 col-span-2">
            {statsError}
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-rose-200 bg-white/85 backdrop-blur p-4 min-h-[6rem] h-full shadow ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <p className="text-sm text-gray-500">Total Reports</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {stats?.totalReports ?? 0}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-rose-400 to-rose-700 text-white ring-2 ring-rose-800 shadow-[inset_0_2px_0_rgba(255,255,255,0.35),0_8px_18px_rgba(244,63,94,0.35)]">
                  <FileBarChart2 className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-white/85 backdrop-blur p-4 min-h-[6rem] h-full shadow ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <p className="text-sm text-gray-500">Total FMV</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(stats?.totalFairMarketValue ?? 0)}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-rose-400 to-rose-700 text-white ring-2 ring-rose-800 shadow-[inset_0_2px_0_rgba(255,255,255,0.35),0_8px_18px_rgba(244,63,94,0.35)]">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-rose-200 bg-white/90 p-4 shadow ring-1 ring-black/5 backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Recent Reports</h2>
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
                        mounted ? new Date(r.createdAt).toLocaleString() : ""
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
                    <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 text-xs font-semibold">
                      {r.fairMarketValue ?? 0}
                    </span>
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
