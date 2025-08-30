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

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-600">
          Hello {user?.username || user?.email || "there"}
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight bg-gradient-to-r from-rose-600 to-red-500 bg-clip-text text-transparent drop-shadow-sm">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Overview of your ClearValue activity and insights.
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        {/* Real Estate (emerald) */}
        <button
          type="button"
          onClick={() => {
            setDrawerType("real-estate");
            setDrawerOpen(true);
          }}
          className="group flex items-center justify-between rounded-2xl border border-emerald-200 bg-gradient-to-b from-white/90 to-emerald-50/60 px-4 py-3 text-left shadow-[0_10px_30px_rgba(16,185,129,0.12)] ring-1 ring-black/5 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(16,185,129,0.25)] active:translate-y-0.5 active:shadow-[0_6px_0_0_rgba(16,185,129,0.35)] cursor-pointer"
        >
          <div>
            <p className="text-xl font-bold text-gray-900">Real Estate</p>
            <p className="text-xs text-gray-500">
              Create a new property record
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-200 transition-colors duration-300 group-hover:bg-emerald-500/15">
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
          className="group flex items-center justify-between rounded-2xl border border-amber-200 bg-gradient-to-b from-white/90 to-amber-50/60 px-4 py-3 text-left shadow-[0_10px_30px_rgba(245,158,11,0.14)] ring-1 ring-black/5 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(245,158,11,0.28)] active:translate-y-0.5 active:shadow-[0_6px_0_0_rgba(245,158,11,0.4)] cursor-pointer"
        >
          <div>
            <p className="text-xl font-bold text-gray-900">Salvage</p>
            <p className="text-xs text-gray-500">Start a new salvage entry</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 ring-1 ring-amber-200 transition-colors duration-300 group-hover:bg-amber-500/15">
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
          className="group flex items-center justify-between rounded-2xl border border-sky-200 bg-gradient-to-b from-white/90 to-sky-50/60 px-4 py-3 text-left shadow-[0_10px_30px_rgba(14,165,233,0.14)] ring-1 ring-black/5 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(14,165,233,0.3)] active:translate-y-0.5 active:shadow-[0_6px_0_0_rgba(14,165,233,0.4)] cursor-pointer"
        >
          <div>
            <p className="text-xl font-bold text-gray-900">Asset</p>
            <p className="text-xs text-gray-500">Add a general asset</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 ring-1 ring-sky-200 transition-colors duration-300 group-hover:bg-sky-500/15">
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
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 ring-1 ring-rose-200">
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
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 ring-1 ring-rose-200">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-rose-200 bg-white/90 p-4 shadow ring-1 ring-black/5 backdrop-blur">
        <h2 className="text-lg font-medium text-gray-900">Recent Reports</h2>
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
          <p className="mt-2 text-sm text-gray-600">
            No recent reports. Create one to see it here.
          </p>
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
                    <p className="text-xs text-gray-500">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-sm text-rose-700">
                    {r.fairMarketValue}
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
