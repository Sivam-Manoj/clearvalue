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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<
    "date-desc" | "date-asc" | "value-desc" | "value-asc"
  >("date-desc");
  const [typeFilter, setTypeFilter] = useState<string>("");

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
    let arr = reports as PdfReport[];

    if (q) {
      arr = arr.filter((r) => {
        const address = String(r.address ?? "").toLowerCase();
        const filename = String((r as any).filename ?? "").toLowerCase();
        const id = String(r._id ?? "").toLowerCase();
        const fmv = String(r.fairMarketValue ?? "").toLowerCase();
        const dateStr = new Date(r.createdAt)
          .toLocaleDateString()
          .toLowerCase();
        return [address, filename, id, fmv, dateStr].some((s) => s.includes(q));
      });
    }

    if (typeFilter) {
      arr = arr.filter(
        (r) => String((r as any).type ?? "") === String(typeFilter)
      );
    }

    const parseVal = (v: string) => {
      if (!v) return NaN;
      const num = Number(String(v).replace(/[^0-9.-]+/g, ""));
      return Number.isFinite(num) ? num : NaN;
    };

    const sorted = [...arr].sort((a, b) => {
      switch (sortBy) {
        case "date-asc":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "date-desc":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "value-asc": {
          const av = parseVal(a.fairMarketValue);
          const bv = parseVal(b.fairMarketValue);
          const aa = Number.isNaN(av) ? Infinity : av;
          const bb = Number.isNaN(bv) ? Infinity : bv;
          return aa - bb;
        }
        case "value-desc": {
          const av = parseVal(a.fairMarketValue);
          const bv = parseVal(b.fairMarketValue);
          const aa = Number.isNaN(av) ? -Infinity : av;
          const bb = Number.isNaN(bv) ? -Infinity : bv;
          return bb - aa;
        }
        default:
          return 0;
      }
    });

    return sorted;
  }, [reports, query, typeFilter, sortBy]);

  const availableTypes = useMemo(() => {
    const s = new Set<string>();
    for (const r of reports) {
      const t = (r as any)?.type;
      if (t) s.add(String(t));
    }
    return Array.from(s);
  }, [reports]);

  // Accent helpers for per-type theming (keeps classes explicit for Tailwind JIT)
  type Accent = {
    iconBg: string;
    iconText: string;
    iconRing: string;
    pillBg: string;
    pillText: string;
    pillRing: string;
    rowHover: string;
  };

  const accentFor = (t?: string): Accent => {
    const type = String(t || "").toLowerCase();
    if (type.includes("real")) {
      return {
        iconBg: "bg-emerald-50",
        iconText: "text-emerald-600",
        iconRing: "ring-emerald-100",
        pillBg: "bg-emerald-50",
        pillText: "text-emerald-700",
        pillRing: "ring-emerald-200",
        rowHover: "hover:bg-emerald-50/40",
      };
    }
    if (type.includes("salvage")) {
      return {
        iconBg: "bg-amber-50",
        iconText: "text-amber-600",
        iconRing: "ring-amber-100",
        pillBg: "bg-amber-50",
        pillText: "text-amber-700",
        pillRing: "ring-amber-200",
        rowHover: "hover:bg-amber-50/40",
      };
    }
    if (type.includes("asset") || type.includes("catalog")) {
      return {
        iconBg: "bg-sky-50",
        iconText: "text-sky-600",
        iconRing: "ring-sky-100",
        pillBg: "bg-sky-50",
        pillText: "text-sky-700",
        pillRing: "ring-sky-200",
        rowHover: "hover:bg-sky-50/40",
      };
    }
    // Fallback to rose
    return {
      iconBg: "bg-rose-50",
      iconText: "text-rose-600",
      iconRing: "ring-rose-100",
      pillBg: "bg-rose-50",
      pillText: "text-rose-700",
      pillRing: "ring-rose-200",
      rowHover: "hover:bg-rose-50/40",
    };
  };

  // Pagination derivations
  const totalItems = filteredReports.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const startIndex = totalItems === 0 ? 0 : (clampedPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedReports = useMemo(
    () => filteredReports.slice(startIndex, endIndex),
    [filteredReports, startIndex, endIndex]
  );

  // Reset/clamp page when filters or page size change
  useEffect(() => {
    setPage(1);
  }, [query, typeFilter]);

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(filteredReports.length / pageSize));
    if (page > tp) setPage(tp);
  }, [filteredReports.length, pageSize, page]);

  async function handleDownload(id: string) {
    try {
      setDownloadingId(id);
      const { blob, filename } = await ReportsService.downloadReport(id);
      const r = reports.find((x) => x._id === id);
      const fileName = filename || r?.filename || `report-${id}.docx`;
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
        className="pointer-events-none absolute inset-x-0 -top-8 -z-10 h-40 bg-gradient-to-b from-sky-100/60 via-violet-100/40 to-transparent"
        aria-hidden
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent drop-shadow-sm">
              Reports
            </h1>
            <p className="mt-1 text-sm sm:text-base text-slate-600">
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
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
        </div>
        {/* Top filters row */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <label htmlFor="sort-by-top" className="sr-only">Sort by</label>
              <select
                id="sort-by-top"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500/30 focus:border-sky-500 cursor-pointer"
              >
                <option value="date-desc">Date: Newest</option>
                <option value="date-asc">Date: Oldest</option>
                <option value="value-desc">Value: High → Low</option>
                <option value="value-asc">Value: Low → High</option>
              </select>
            </div>
            {availableTypes.length > 0 && (
              <div className="flex items-center gap-1">
                <label htmlFor="type-filter-top" className="sr-only">Type</label>
                <select
                  id="type-filter-top"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500/30 focus:border-sky-500 cursor-pointer"
                >
                  <option value="">All types</option>
                  {availableTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-center gap-1">
              <label htmlFor="page-size-top" className="sr-only">Page size</label>
              <select
                id="page-size-top"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500/30 focus:border-sky-500 cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="rounded-2xl bg-white ring-1 ring-slate-100 shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
              <div className="divide-y divide-slate-100">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 p-3 animate-pulse"
                  >
                    <div className="h-3 w-1/3 rounded bg-slate-100" />
                    <div className="h-3 w-24 rounded bg-slate-100" />
                    <div className="h-4 w-24 rounded bg-slate-100" />
                    <div className="flex gap-2">
                      <div className="h-7 w-24 rounded bg-slate-100" />
                      <div className="h-7 w-20 rounded bg-slate-100" />
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
            <div className="relative overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-white p-8 sm:p-10 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 ring-1 ring-sky-100 shadow-inner">
                <FileText className="h-7 w-7" />
              </div>
              <p className="text-sm sm:text-base text-slate-900">
                No reports yet.
              </p>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">
                Create your first report to see it here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReports.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-700">
                  <div>
                    Showing {totalItems === 0 ? 0 : startIndex + 1}–{endIndex} of {totalItems}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={clampedPage <= 1}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 shadow-sm transition enabled:hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                    >
                      Prev
                    </button>
                    <span className="text-[11px] text-slate-700/80">
                      Page {clampedPage} / {Math.max(1, Math.ceil(totalItems / pageSize))}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={clampedPage >= totalPages}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 shadow-sm transition enabled:hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
              {/* Mobile list view */}
              <div className="sm:hidden">
                {filteredReports.length === 0 && reports.length > 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 shadow-sm">
                    No matches for "{query}".
                  </div>
                ) : (
                  <div className="max-h-[70vh] overflow-y-auto pr-1">
                    <div className="space-y-3">
                      {paginatedReports.map((r) => {
                        const acc = accentFor((r as any).type);
                        return (
                          <div
                            key={r._id}
                            className="rounded-2xl bg-white ring-1 ring-slate-100 p-3 shadow-sm"
                          >
                            <div className="flex items-start gap-3">
                              <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${acc.iconBg} ${acc.iconText} ${acc.iconRing} ring-1 shadow-inner`}>
                                <FileText className="h-3 w-3" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-slate-900 truncate">
                                  {r.address || "Untitled report"}
                                </div>
                                <div className="mt-0.5 text-[11px] text-slate-600 truncate">
                                  {r.filename || r._id}
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                              <div className="text-[11px] text-slate-900">
                                {new Date(r.createdAt).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ring-1 shadow-sm bg-emerald-50 text-emerald-700 ring-emerald-200">
                                  {String(r.fairMarketValue ?? "")}
                                </span>
                                {(() => {
                                  const st = (r as any).approvalStatus as 'pending' | 'approved' | 'rejected' | undefined;
                                  const label = st === 'approved' ? 'Approved' : st === 'rejected' ? 'Rejected' : 'Waiting approval';
                                  const cls = st === 'approved'
                                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                    : st === 'rejected'
                                    ? 'bg-rose-50 text-rose-700 ring-rose-200'
                                    : 'bg-amber-50 text-amber-700 ring-amber-200';
                                  return (
                                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ring-1 shadow-sm ${cls}`}>
                                      {label}
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>
                            {((r as any).approvalStatus === 'rejected' && (r as any).approvalNote) ? (
                              <div className="mt-2 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">
                                Reason: {(r as any).approvalNote}
                              </div>
                            ) : null}
                            <div className="mt-3 flex gap-2">
                              <button
                                onClick={() => handleDownload(r._id)}
                                disabled={
                                  downloadingId === r._id ||
                                  (!!(r as any).approvalStatus && (r as any).approvalStatus !== 'approved')
                                }
                                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-blue-500 hover:shadow-lg active:translate-y-[1px] disabled:opacity-60 cursor-pointer"
                                title={(() => {
                                  const st = (r as any).approvalStatus as string | undefined;
                                  if (st === 'pending') return 'Waiting for approval';
                                  if (st === 'rejected') return 'Rejected';
                                  const ft = ((r as any).fileType || String(r.filename || '').split('.').pop() || '').toLowerCase();
                                  return ft === 'images' || ft === 'zip' ? 'Download Images' : 'Download';
                                })()}
                              >
                                <Download className="h-3.5 w-3.5" />
                                {downloadingId === r._id
                                  ? "Downloading..."
                                  : ((r as any).fileType || String(r.filename || '').split('.').pop() || '').toLowerCase() === 'images' ||
                                    ((r as any).fileType || String(r.filename || '').split('.').pop() || '').toLowerCase() === 'zip'
                                  ? "Download Images"
                                  : "Download"}
                              </button>
                              <button
                                onClick={() => handleDelete(r._id)}
                                disabled={deletingId === r._id}
                                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-rose-500 hover:shadow-lg active:translate-y-[1px] disabled:opacity-60 cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                {deletingId === r._id ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop/tablet table view */}
              <div className="hidden sm:block">
                <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100 shadow-sm">
                  <div className="max-h-[70vh] overflow-y-auto">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50/50">
                          <tr>
                            <th
                              scope="col"
                              className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700 uppercase tracking-wide"
                            >
                              Report
                            </th>
                            <th
                              scope="col"
                              className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700 uppercase tracking-wide"
                            >
                              Date
                            </th>
                            <th
                              scope="col"
                              className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700 uppercase tracking-wide"
                            >
                              FMV
                            </th>
                            <th
                              scope="col"
                              className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700 uppercase tracking-wide"
                            >
                              Status
                            </th>
                            <th
                              scope="col"
                              className="px-3 py-2 text-right text-[11px] font-semibold text-slate-700 uppercase tracking-wide"
                            >
                              Actions
                            </th>
                          </tr>
                        </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredReports.length === 0 && reports.length > 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-5 text-center text-sm text-slate-700/80"
                            >
                              No matches for "{query}".
                            </td>
                          </tr>
                        ) : (
                          paginatedReports.map((r) => {
                            const acc = accentFor((r as any).type);
                            return (
                              <tr key={r._id} className={acc.rowHover}>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <div className={`flex h-7 w-7 items-center justify-center rounded-xl ${acc.iconBg} ${acc.iconText} ${acc.iconRing} ring-1 shadow-inner`}>
                                      <FileText className="h-3 w-3" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-xs font-semibold text-slate-900 truncate">
                                        {r.address || "Untitled report"}
                                      </div>
                                      <div className="text-[11px] text-slate-600 truncate">
                                        {r.filename || r._id}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-xs text-slate-900">
                                  {new Date(r.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-3 py-2">
                                  <span className="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ring-1 shadow-sm bg-emerald-50 text-emerald-700 ring-emerald-200">
                                    {String(r.fairMarketValue ?? "")}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  {(() => {
                                    const st = (r as any).approvalStatus as 'pending' | 'approved' | 'rejected' | undefined;
                                    const label = st === 'approved' ? 'Approved' : st === 'rejected' ? 'Rejected' : 'Waiting approval';
                                    const cls = st === 'approved'
                                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                      : st === 'rejected'
                                      ? 'bg-rose-50 text-rose-700 ring-rose-200'
                                      : 'bg-amber-50 text-amber-700 ring-amber-200';
                                    return (
                                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ring-1 shadow-sm ${cls}`}>
                                        {label}
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex justify-end gap-2">
                                    <button
                                      onClick={() => handleDownload(r._id)}
                                      disabled={
                                        downloadingId === r._id ||
                                        (!!(r as any).approvalStatus && (r as any).approvalStatus !== 'approved')
                                      }
                                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-blue-500 hover:shadow-lg active:translate-y-[1px] disabled:opacity-60 cursor-pointer"
                                      title={(() => {
                                        const st = (r as any).approvalStatus as string | undefined;
                                        if (st === 'pending') return 'Waiting for approval';
                                        if (st === 'rejected') return 'Rejected';
                                        const ft = ((r as any).fileType || String(r.filename || '').split('.').pop() || '').toLowerCase();
                                        return ft === 'images' || ft === 'zip' ? 'Download Images' : 'Download';
                                      })()}
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                      {downloadingId === r._id
                                        ? "Downloading..."
                                        : ((r as any).fileType || String(r.filename || '').split('.').pop() || '').toLowerCase() === 'images' ||
                                          ((r as any).fileType || String(r.filename || '').split('.').pop() || '').toLowerCase() === 'zip'
                                        ? "Download Images"
                                        : "Download"}
                                    </button>
                                    <button
                                      onClick={() => handleDelete(r._id)}
                                      disabled={deletingId === r._id}
                                      className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-rose-500 hover:shadow-lg active:translate-y-[1px] disabled:opacity-60 cursor-pointer"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      {deletingId === r._id ? "Deleting..." : "Delete"}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                    </div>
                  </div>
                </div>
              </div>
              {filteredReports.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-700">
                  <div>
                    Showing {totalItems === 0 ? 0 : startIndex + 1}–{endIndex} of {totalItems}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={clampedPage <= 1}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 shadow-sm transition enabled:hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                    >
                      Prev
                    </button>
                    <span className="text-[11px] text-slate-700/80">
                      Page {clampedPage} / {Math.max(1, Math.ceil(totalItems / pageSize))}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={clampedPage >= totalPages}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 shadow-sm transition enabled:hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
