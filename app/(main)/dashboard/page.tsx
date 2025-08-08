"use client";

import { useEffect, useState } from "react";
import BottomDrawer from "@/components/BottomDrawer";
import { ReportsService, type ReportStats } from "@/services/reports";
import { useAuthContext } from "@/context/AuthContext";
import {
  FileBarChart2,
  Building2,
  Car,
  Package,
  DollarSign,
} from "lucide-react";
import dynamic from "next/dynamic";

const RealEstateForm = dynamic(
  () => import("@/components/forms/RealEstateForm"),
  { ssr: false, loading: () => (
    <div className="text-sm text-gray-600">Loading form...</div>
  ) }
);

export default function DashboardPage() {
  const { user } = useAuthContext();
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

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-600">
          Hello {user?.username || user?.email || "there"}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Overview of your ClearValue activity and insights.
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => {
            setDrawerType("real-estate");
            setDrawerOpen(true);
          }}
          className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left hover:bg-gray-50"
        >
          <div>
            <p className="text-sm font-medium text-gray-900">Real Estate</p>
            <p className="text-xs text-gray-500">
              Create a new property record
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-500/10 text-blue-700">
            <Building2 className="h-5 w-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setDrawerType("salvage");
            setDrawerOpen(true);
          }}
          className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left hover:bg-gray-50"
        >
          <div>
            <p className="text-sm font-medium text-gray-900">Salvage</p>
            <p className="text-xs text-gray-500">Start a new salvage entry</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-700">
            <Car className="h-5 w-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setDrawerType("asset");
            setDrawerOpen(true);
          }}
          className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left hover:bg-gray-50"
        >
          <div>
            <p className="text-sm font-medium text-gray-900">Asset</p>
            <p className="text-xs text-gray-500">Add a general asset</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-500/10 text-amber-700">
            <Package className="h-5 w-5" />
          </div>
        </button>
      </div>

      {/* Report stats (horizontal & responsive, even on small screens) */}
      <div className="grid auto-rows-fr grid-cols-2 gap-4">
        {statsLoading ? (
          <>
            <div className="min-h-[6rem] h-full w-full animate-pulse rounded-lg border border-gray-200 bg-gray-100" />
            <div className="min-h-[6rem] h-full w-full animate-pulse rounded-lg border border-gray-200 bg-gray-100" />
          </>
        ) : statsError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 col-span-2">
            {statsError}
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-gray-200 bg-white p-4 min-h-[6rem] h-full">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <p className="text-sm text-gray-500">Total Reports</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {stats?.totalReports ?? 0}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-500/10 text-blue-700">
                  <FileBarChart2 className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 min-h-[6rem] h-full">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <p className="text-sm text-gray-500">
                    Total FMV
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(stats?.totalFairMarketValue ?? 0)}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-700">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
        <p className="mt-2 text-sm text-gray-600">
          No recent activity. Start by creating or importing reports.
        </p>
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
        ) : drawerType ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setDrawerOpen(false);
            }}
          >
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {titles[drawerType]} Field
              </label>
              <input
                type="text"
                placeholder={placeholders[drawerType]}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-blue-500"
            >
              Continue
            </button>
          </form>
        ) : null}
      </BottomDrawer>
    </div>
  );
}
