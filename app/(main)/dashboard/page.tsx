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
  Calendar,
  Clock,
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
      const sorted = [...data].sort(
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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-600">
            {greetingText},{" "}
            <span className="font-medium">
              {user?.username || user?.email || "there"}
            </span>
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight bg-gradient-to-r from-rose-600 to-red-500 bg-clip-text text-transparent drop-shadow-sm">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Overview of your ClearValue activity and insights.
          </p>
        </div>

        {/* Date/Time card */}
        <div suppressHydrationWarning className="group relative overflow-hidden rounded-2xl border border-rose-200 bg-white/70 px-4 py-3 shadow ring-1 ring-black/5 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(244,63,94,0.18)]">
          <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br from-rose-500/20 to-red-500/20 blur-2xl" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 ring-1 ring-rose-200">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">{mounted ? dayName : "—"}</p>
                <p className="text-sm font-medium text-gray-900 leading-tight">
                  {mounted ? dateFull : "—"}
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 text-[10px] font-semibold">
              Local Time
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 ring-1 ring-rose-200">
              <Clock className="h-4 w-4" />
            </div>
            <p className="text-base font-semibold text-gray-900">{mounted ? timeStr : "—"}</p>
            <span className="text-xs text-gray-500">{mounted ? tzShort : ""}</span>
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
          className="group flex items-center justify-between rounded-2xl border border-emerald-800 bg-emerald-600 px-4 py-3 text-left shadow-[0_10px_30px_rgba(16,185,129,0.12)] ring-1 ring-black/5 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(16,185,129,0.25)] active:translate-y-0.5 active:shadow-[0_6px_0_0_rgba(16,185,129,0.35)] cursor-pointer"
        >
          <div>
            <p className="text-xl font-bold text-white">Real Estate</p>
            <p className="text-xs text-white">Create a new property record</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 ring-1 ring-emerald-800 transition duration-300 group-hover:bg-emerald-500/15 group-hover:scale-110">
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
          className="group flex items-center justify-between rounded-2xl border border-amber-800 bg-amber-600 px-4 py-3 text-left shadow-[0_10px_30px_rgba(245,158,11,0.14)] ring-1 ring-black/5 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(245,158,11,0.28)] active:translate-y-0.5 active:shadow-[0_6px_0_0_rgba(245,158,11,0.4)] cursor-pointer"
        >
          <div>
            <p className="text-xl font-bold text-white">Salvage</p>
            <p className="text-xs text-white">Start a new salvage entry</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-600 ring-1 ring-amber-800 transition duration-300 group-hover:bg-amber-500/15 group-hover:scale-110">
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
          className="group flex items-center justify-between rounded-2xl border border-sky-800 bg-sky-600 px-4 py-3 text-left shadow-[0_10px_30px_rgba(14,165,233,0.14)] ring-1 ring-black/5 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(14,165,233,0.3)] active:translate-y-0.5 active:shadow-[0_6px_0_0_rgba(14,165,233,0.4)] cursor-pointer"
        >
          <div>
            <p className="text-xl font-bold text-white">Asset</p>
            <p className="text-xs text-white">Add a general asset</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600 ring-1 ring-sky-800 transition duration-300 group-hover:bg-sky-500/15 group-hover:scale-110">
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
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 ring-1 ring-rose-800">
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
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 ring-1 ring-rose-800">
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
                      title={mounted ? new Date(r.createdAt).toLocaleString() : ""}
                    >
                      {mounted ? new Date(r.createdAt).toLocaleDateString("en-US") : "—"}
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
  );
}
