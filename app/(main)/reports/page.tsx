"use client";

import { useEffect, useState } from "react";
import { FileText, Download, Trash2 } from "lucide-react";
import { ReportsService, type PdfReport } from "@/services/reports";
import { toast } from "react-toastify";

export default function ReportsPage() {
  const [reports, setReports] = useState<PdfReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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
            err?.response?.data?.message || err?.message || "Failed to load reports"
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-rose-600 to-rose-400 bg-clip-text text-transparent drop-shadow-sm">
              Reports
            </h1>
            <p className="mt-1 text-sm sm:text-base text-rose-800/70">
              Manage your valuation reports.
            </p>
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-36 rounded-2xl bg-white/80 ring-1 ring-rose-100 animate-pulse shadow-[0_8px_24px_rgba(244,63,94,0.15)]"
                />
              ))}
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
              <p className="text-sm sm:text-base text-rose-900">No reports yet.</p>
              <p className="mt-1 text-xs sm:text-sm text-rose-700/70">
                Create your first report to see it here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {reports.map((r) => (
                <div
                  key={r._id}
                  className="group relative rounded-2xl bg-white ring-1 ring-rose-100 shadow-[0_10px_30px_rgba(244,63,94,0.12)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(244,63,94,0.18)]"
                >
                  <div
                    className="absolute inset-x-0 -top-px h-1.5 rounded-t-2xl bg-gradient-to-r from-rose-400 via-rose-500 to-rose-600"
                    aria-hidden
                  />
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100 shadow-inner">
                            <FileText className="h-4 w-4" />
                          </div>
                          <h3 className="truncate text-sm sm:text-base font-semibold text-rose-900 drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]">
                            {r.address || "Untitled report"}
                          </h3>
                        </div>
                        <div className="mt-1 text-xs text-rose-700/70">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 ring-1 ring-rose-200 shadow-sm">
                          FMV: {String(r.fairMarketValue ?? "")}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleDownload(r._id)}
                        disabled={downloadingId === r._id}
                        className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200 shadow-sm transition-all hover:bg-rose-50 hover:shadow-md active:translate-y-[1px] disabled:opacity-60"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                        {downloadingId === r._id ? "Downloading..." : "Download"}
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
