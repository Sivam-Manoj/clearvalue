"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Download, Trash2 } from "lucide-react";
import { ReportsService, type PdfReport } from "@/services/reports";
import { toast } from "react-toastify";

export default function ReportsPage() {
  const [reports, setReports] = useState<PdfReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    ReportsService.getMyReports()
      .then((data) => {
        if (!cancelled) setReports(data);
      })
      .catch((err: any) => {
        if (!cancelled)
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "Failed to load reports"
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredReports = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((r) => {
      const address = String(r.address ?? "").toLowerCase();
      const filename = String((r as any).filename ?? "").toLowerCase();
      const id = String(r._id ?? "").toLowerCase();
      const fmv = String(r.fairMarketValue ?? "").toLowerCase();
      const dateStr = new Date(r.createdAt).toLocaleDateString().toLowerCase();
      return [address, filename, id, fmv, dateStr].some((s) => s.includes(q));
    });
  }, [reports, query]);

  async function handleDownload(id: string) {
    try {
      setDownloadingId(id);
      const { blob, filename } = await ReportsService.downloadReport(id);
      const r = reports.find((x) => x._id === id);
      const fileName = filename || r?.filename || `report-${id}.pdf`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 500);
      toast.success(`Download started: ${fileName}`);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Download failed";
      console.error("Download failed", e);
      toast.error(msg);
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this report? This cannot be undone.")) return;
    try {
      setDeletingId(id);
      const r = reports.find((x) => x._id === id);
      await ReportsService.deleteReport(id);
      setReports((prev) => prev.filter((r) => r._id !== id));
      toast.success(`Report deleted${r?.address ? `: ${r.address}` : ""}`);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Delete failed";
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="relative isolate">
      <div
        className="pointer-events-none absolute inset-x-0 -top-8 -z-10 h-40 bg-gradient-to-b from-rose-100/80 to-transparent"
        aria-hidden
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-rose-600 to-rose-400 bg-clip-text text-transparent drop-shadow-sm">
              Reports
            </h1>
            <p className="mt-1 text-sm sm:text-base text-rose-800/70">
              Manage your valuation reports.
            </p>
          </div>
          <div className="w-full sm:max-w-xs">
            <label htmlFor="report-search" className="sr-only">
              Search
            </label>
            <input
              id="report-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reports..."
              className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-rose-900 placeholder:text-rose-400 shadow-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="rounded-2xl bg-white ring-1 ring-rose-100 shadow-[0_8px_24px_rgba(244,63,94,0.06)]">
              <div className="divide-y divide-rose-100">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 p-4 animate-pulse"
                  >
                    <div className="h-4 w-1/3 rounded bg-rose-100" />
                    <div className="h-4 w-24 rounded bg-rose-100" />
                    <div className="h-6 w-24 rounded bg-rose-100" />
                    <div className="flex gap-2">
                      <div className="h-8 w-24 rounded bg-rose-100" />
                      <div className="h-8 w-20 rounded bg-rose-100" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-sm">
              {error}
            </div>
          ) : reports.length === 0 ? (
            <div className="relative overflow-hidden rounded-2xl border border-dashed border-rose-200 bg-white p-8 sm:p-10 text-center shadow-[0_10px_30px_rgba(244,63,94,0.08)]">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-inner">
                <FileText className="h-7 w-7" />
              </div>
              <p className="text-sm sm:text-base text-rose-900">
                No reports yet.
              </p>
              <p className="mt-1 text-xs sm:text-sm text-rose-700/70">
                Create your first report to see it here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mobile list view */}
              <div className="sm:hidden">
                {filteredReports.length === 0 && reports.length > 0 ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-sm">
                    No matches for "{query}".
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredReports.map((r) => (
                      <div
                        key={r._id}
                        className="rounded-2xl bg-white ring-1 ring-rose-100 p-4 shadow-[0_10px_30px_rgba(244,63,94,0.08)]"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100 shadow-inner">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-rose-900 truncate">
                              {r.address || "Untitled report"}
                            </div>
                            <div className="mt-0.5 text-xs text-rose-700/70 truncate">
                              {r.filename || r._id}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="text-xs text-rose-900">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </div>
                          <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 ring-1 ring-rose-200 shadow-sm">
                            {String(r.fairMarketValue ?? "")}
                          </span>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => handleDownload(r._id)}
                            disabled={downloadingId === r._id}
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200 shadow-sm transition-all hover:bg-rose-50 hover:shadow-md active:translate-y-[1px] disabled:opacity-60"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                            {downloadingId === r._id ? "Downloading..." : "Download"}
                          </button>
                          <button
                            onClick={() => handleDelete(r._id)}
                            disabled={deletingId === r._id}
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-rose-500 hover:shadow-lg active:translate-y-[1px] disabled:opacity-60"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                            {deletingId === r._id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Desktop/tablet table view */}
              <div className="hidden sm:block">
                <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-rose-100 shadow-[0_10px_30px_rgba(244,63,94,0.08)]">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-rose-100">
                      <thead className="bg-rose-50/50">
                        <tr>
                          <th
                            scope="col"
                            className="px-4 py-3 text-left text-xs font-semibold text-rose-800 uppercase tracking-wide"
                          >
                            Report
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-3 text-left text-xs font-semibold text-rose-800 uppercase tracking-wide"
                          >
                            Date
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-3 text-left text-xs font-semibold text-rose-800 uppercase tracking-wide"
                          >
                            FMV
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-3 text-right text-xs font-semibold text-rose-800 uppercase tracking-wide"
                          >
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100">
                        {filteredReports.length === 0 && reports.length > 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-4 py-6 text-center text-sm text-rose-700/80"
                            >
                              No matches for "{query}".
                            </td>
                          </tr>
                        ) : (
                          filteredReports.map((r) => (
                            <tr key={r._id} className="hover:bg-rose-50/40">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100 shadow-inner">
                                    <FileText className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-rose-900 truncate">
                                      {r.address || "Untitled report"}
                                    </div>
                                    <div className="text-xs text-rose-700/70 truncate">
                                      {r.filename || r._id}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-rose-900">
                                {new Date(r.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 ring-1 ring-rose-200 shadow-sm">
                                  {String(r.fairMarketValue ?? "")}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => handleDownload(r._id)}
                                    disabled={downloadingId === r._id}
                                    className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200 shadow-sm transition-all hover:bg-rose-50 hover:shadow-md active:translate-y-[1px] disabled:opacity-60"
                                    title="Download"
                                  >
                                    <Download className="h-4 w-4" />
                                    {downloadingId === r._id
                                      ? "Downloading..."
                                      : "Download"}
                                  </button>
                                  <button
                                    onClick={() => handleDelete(r._id)}
                                    disabled={deletingId === r._id}
                                    className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-rose-500 hover:shadow-lg active:translate-y-[1px] disabled:opacity-60"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    {deletingId === r._id ? "Deleting..." : "Delete"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
