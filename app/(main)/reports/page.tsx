"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Download, Trash2 } from "lucide-react";
import { ReportsService, type PdfReport } from "@/services/reports";
import { getAssetReports, type AssetReport } from "@/services/assets";
import { toast } from "react-toastify";
import StatusBadge from "@/components/reports/StatusBadge";

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

  // Asset reports state (approved and pending approval)
  const [assetReports, setAssetReports] = useState<AssetReport[]>([]);
  const [assetReportsLoading, setAssetReportsLoading] = useState(true);

  // Load asset reports (approved and pending)
  useEffect(() => {
    let cancelled = false;
    setAssetReportsLoading(true);
    getAssetReports()
      .then((response) => {
        if (!cancelled) {
          // Show approved and pending_approval reports
          const visibleReports = response.data.filter(
            (report) =>
              report.status === "approved" ||
              report.status === "pending_approval"
          );
          setAssetReports(visibleReports);
        }
      })
      .catch((err: any) => {
        console.error("Failed to load asset reports:", err);
      })
      .finally(() => {
        if (!cancelled) setAssetReportsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handler = () => {
      setLoading(true);
      setAssetReportsLoading(true);
      Promise.allSettled([
        ReportsService.getMyReports().then((data) => setReports(data)),
        getAssetReports().then((response) => {
          const visible = response.data.filter(
            (report) => report.status === "approved" || report.status === "pending_approval"
          );
          setAssetReports(visible);
        }),
      ]).finally(() => {
        setLoading(false);
        setAssetReportsLoading(false);
      });
    };
    if (typeof window !== "undefined") {
      window.addEventListener("cv:report-created", handler as any);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("cv:report-created", handler as any);
      }
    };
  }, []);

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

  type ReportGroup = {
    key: string;
    address: string;
    filename?: string;
    fairMarketValue: string;
    createdAt: string;
    contract_no?: string;
    approvalStatus?: "pending" | "approved" | "rejected";
    type?: string;
    variants: {
      pdf?: PdfReport;
      docx?: PdfReport;
      xlsx?: PdfReport;
      images?: PdfReport;
    };
  };

  const groups = useMemo<ReportGroup[]>(() => {
    const map = new Map<string, ReportGroup>();
    
    // Get all AssetReport IDs to filter out their PdfReports
    const assetReportIds = new Set(assetReports.map(ar => ar._id));
    
    for (const r of reports) {
      const reportRef = (r as any).report as string | undefined;
      
      // SKIP PdfReports that belong to AssetReports - we'll show AssetReports with preview_files instead
      if (reportRef && assetReportIds.has(reportRef)) {
        continue;
      }
      
      const key = String(reportRef || r._id);
      let g = map.get(key);
      if (!g) {
        g = {
          key,
          address: r.address || "",
          filename: r.filename,
          fairMarketValue: r.fairMarketValue || "",
          createdAt: r.createdAt,
          contract_no: (r as any).contract_no,
          approvalStatus: r.approvalStatus,
          type: (r as any).type,
          variants: {},
        };
        map.set(key, g);
      }

      if (!g.filename) g.filename = r.filename;
      if (!g.contract_no && (r as any).contract_no)
        g.contract_no = (r as any).contract_no;
      if (!g.approvalStatus && r.approvalStatus)
        g.approvalStatus = r.approvalStatus;
      if (!g.type && (r as any).type) g.type = (r as any).type;
      if (new Date(r.createdAt).getTime() > new Date(g.createdAt).getTime())
        g.createdAt = r.createdAt;
      const ft = (
        (r.fileType ||
          String(r.filename || "")
            .split(".")
            .pop() ||
          "") as string
      ).toLowerCase();
      if (ft === "pdf") g.variants.pdf = r;
      else if (ft === "docx") g.variants.docx = r;
      else if (ft === "xlsx") g.variants.xlsx = r;
      else if (ft === "images" || ft === "zip") g.variants.images = r;
    }

    // Add/merge asset reports to the list without overwriting existing variants
    for (const ar of assetReports) {
      const status = ar.status as string;
      const statusText =
        ar.status === "pending_approval"
          ? "Pending Approval"
          : status === "approved"
          ? "Approved"
          : "";
      const key = ar._id;
      const existing = map.get(key);

      // Compute FMV from asset preview data if available
      const currency = String(
        (ar as any)?.preview_data?.currency || (ar as any)?.currency || "CAD"
      ).toUpperCase();
      const baseFMV = (ar as any)?.preview_data?.valuation_data?.baseFMV as
        | number
        | undefined;
      const lots: any[] = Array.isArray((ar as any)?.preview_data?.lots)
        ? ((ar as any).preview_data.lots as any[])
        : Array.isArray((ar as any)?.lots)
        ? ((ar as any).lots as any[])
        : [];
      const sumFromLots = (lots || []).reduce((acc: number, lot: any) => {
        const raw = typeof lot?.estimated_value === "string" ? lot.estimated_value : "";
        const num = parseFloat(String(raw).replace(/[^0-9.-]+/g, ""));
        return acc + (Number.isFinite(num) ? num : 0);
      }, 0);
      const total = Number.isFinite(baseFMV as any) ? (baseFMV as number) : sumFromLots;
      const fmvStr = total > 0
        ? new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(total)
        : "";

      const addressBase = (ar as any).client_name || (ar as any).preview_data?.client_name || "Asset Report";
      
      // Extract preview_files URLs and create pseudo-reports for download functionality
      const previewFiles = (ar as any).preview_files || {};
      const createPseudoReport = (url: string, fileType: string): PdfReport => ({
        _id: `${ar._id}-${fileType}`,
        filename: `${addressBase}.${fileType}`,
        fileType,
        url,
        address: addressBase,
        fairMarketValue: fmvStr,
        createdAt: ar.createdAt,
        approvalStatus: (ar as any).status === "approved" ? "approved" : "pending",
      } as PdfReport);
      
      const variants: ReportGroup["variants"] = {};
      if (previewFiles.docx) variants.docx = createPseudoReport(previewFiles.docx, "docx");
      if (previewFiles.excel) variants.xlsx = createPseudoReport(previewFiles.excel, "xlsx");
      if (previewFiles.images) variants.images = createPseudoReport(previewFiles.images, "zip");
      
      let merged: ReportGroup;
      if (existing) {
        merged = {
          ...existing,
          address: `${addressBase} ${statusText ? `(${statusText})` : ""}`,
          filename: existing.filename || `${addressBase}.docx`,
          contract_no:
            existing.contract_no ||
            (ar as any).contract_no ||
            (ar as any).preview_data?.contract_no,
          approvalStatus:
            (ar as any).status === "approved"
              ? "approved"
              : existing.approvalStatus || "pending",
          type: existing.type || "Asset",
          fairMarketValue: existing.fairMarketValue || fmvStr || currency,
          variants: {
            ...existing.variants,
            ...variants, // Merge AssetReport download links
          },
        };
      } else {
        merged = {
          key,
          address: `${addressBase} ${statusText ? `(${statusText})` : ""}`,
          filename: `${addressBase}.docx`,
          fairMarketValue: fmvStr || currency,
          createdAt: ar.createdAt,
          contract_no:
            (ar as any).contract_no || (ar as any).preview_data?.contract_no,
          approvalStatus:
            (ar as any).status === "approved" ? "approved" : "pending",
          type: "Asset",
          variants,
        };
      }
      map.set(key, merged);
    }

    return Array.from(map.values());
  }, [reports, assetReports]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = groups as ReportGroup[];

    if (q) {
      arr = arr.filter((g) => {
        const address = String(g.address ?? "").toLowerCase();
        const filename = String(g.filename ?? "").toLowerCase();
        const id = String(g.key ?? "").toLowerCase();
        const fmv = String(g.fairMarketValue ?? "").toLowerCase();
        const dateStr = new Date(g.createdAt)
          .toLocaleDateString()
          .toLowerCase();
        const contractNo = String(g.contract_no ?? "").toLowerCase();
        return [address, filename, id, fmv, dateStr, contractNo].some((s) =>
          s.includes(q)
        );
      });
    }

    if (typeFilter) {
      arr = arr.filter(
        (g) => String((g as any).type ?? "") === String(typeFilter)
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
  }, [groups, query, typeFilter, sortBy]);

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
  const totalItems = filteredGroups.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const startIndex = totalItems === 0 ? 0 : (clampedPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedGroups = useMemo(
    () => filteredGroups.slice(startIndex, endIndex),
    [filteredGroups, startIndex, endIndex]
  );

  // Reset/clamp page when filters or page size change
  useEffect(() => {
    setPage(1);
  }, [query, typeFilter]);

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(filteredGroups.length / pageSize));
    if (page > tp) setPage(tp);
  }, [filteredGroups.length, pageSize, page]);

  async function handleDownload(id: string) {
    try {
      setDownloadingId(id);
      
      // Find the report - could be in legacy reports or in group variants (AssetReport preview_files)
      let reportWithUrl: PdfReport | undefined = reports.find((x) => x._id === id);
      
      // If not found in legacy reports, search in group variants for AssetReport pseudo-reports
      if (!reportWithUrl) {
        for (const group of groups) {
          const found = Object.values(group.variants).find((v) => v && v._id === id);
          if (found) {
            reportWithUrl = found;
            break;
          }
        }
      }
      
      if (reportWithUrl && (reportWithUrl as any).url) {
        // Direct download from URL (AssetReport preview_files)
        const directUrl = (reportWithUrl as any).url as string;
        const fileName = reportWithUrl.filename || `report-${id}.${reportWithUrl.fileType}`;
        
        // Fetch and download from direct URL
        const response = await fetch(directUrl);
        if (!response.ok) throw new Error("Failed to fetch file");
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 500);
        toast.success(`Download started: ${fileName}`);
      } else if (reportWithUrl) {
        // Legacy download through backend API
        const { blob, filename } = await ReportsService.downloadReport(id);
        const fileName = filename || reportWithUrl.filename || `report-${id}.docx`;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 500);
        toast.success(`Download started: ${fileName}`);
      } else {
        throw new Error("Report not found");
      }
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

  async function handleDeleteGroup(g: ReportGroup) {
    if (!confirm("Delete this report (all variants)? This cannot be undone."))
      return;
    try {
      setDeletingId(g.key);
      const ids: string[] = [
        g.variants.pdf?._id,
        g.variants.docx?._id,
        g.variants.xlsx?._id,
        g.variants.images?._id,
      ].filter(Boolean) as string[];
      if (ids.length === 0) return;
      await Promise.allSettled(
        ids.map((id) => ReportsService.deleteReport(id))
      );
      setReports((prev) =>
        prev.filter((r) => {
          const grp = String(
            ((r as any).report as string | undefined) || r._id
          );
          return grp !== g.key;
        })
      );
      toast.success("Report deleted");
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
              <label htmlFor="sort-by-top" className="sr-only">
                Sort by
              </label>
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
                <label htmlFor="type-filter-top" className="sr-only">
                  Type
                </label>
                <select
                  id="type-filter-top"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500/30 focus:border-sky-500 cursor-pointer"
                >
                  <option value="">All types</option>
                  {availableTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-center gap-1">
              <label htmlFor="page-size-top" className="sr-only">
                Page size
              </label>
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
          ) : (filteredGroups.length === 0 && assetReports.length === 0) ? (
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
              {filteredGroups.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-700">
                  <div>
                    Showing {totalItems === 0 ? 0 : startIndex + 1}–{endIndex}{" "}
                    of {totalItems}
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
                      Page {clampedPage} /{" "}
                      {Math.max(1, Math.ceil(totalItems / pageSize))}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
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
                {filteredGroups.length === 0 && reports.length > 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 shadow-sm">
                    No matches for "{query}".
                  </div>
                ) : (
                  <div className="max-h-[70vh] overflow-y-auto pr-1">
                    <div className="space-y-2">
                      {paginatedGroups.map((g) => {
                        const acc = accentFor((g as any).type);
                        return (
                          <div
                            key={g.key}
                            className="rounded-xl bg-white ring-1 ring-slate-100 px-3 py-2 shadow-sm"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`flex h-7 w-7 items-center justify-center rounded-xl ${acc.iconBg} ${acc.iconText} ${acc.iconRing} ring-1 shadow-inner`}
                              >
                                <FileText className="h-3 w-3" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-slate-900 truncate">
                                  {(() => {
                                    const t = String(
                                      (g as any).type || ""
                                    ).toLowerCase();
                                    const base =
                                      t === "realestate"
                                        ? "Real Estate"
                                        : t === "salvage"
                                        ? "Salvage"
                                        : "Asset";
                                    return g.contract_no
                                      ? `${base} - ${g.contract_no}`
                                      : g.address || base;
                                  })()}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {/* PDF button hidden - not needed anymore */}
                                {/* <button
                                  onClick={() => g.variants.pdf && handleDownload(g.variants.pdf._id)}
                                  disabled={!g.variants.pdf || downloadingId === g.variants.pdf?._id || (!!g.variants.pdf?.approvalStatus && g.variants.pdf?.approvalStatus !== 'approved')}
                                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white shadow hover:bg-blue-500 disabled:opacity-60 cursor-pointer"
                                  title="Download PDF"
                                >
                                  PDF
                                </button> */}
                                <button
                                  onClick={() =>
                                    g.variants.docx &&
                                    handleDownload(g.variants.docx._id)
                                  }
                                  disabled={
                                    !g.variants.docx ||
                                    downloadingId === g.variants.docx?._id ||
                                    (!!g.variants.docx?.approvalStatus &&
                                      g.variants.docx?.approvalStatus !==
                                        "approved")
                                  }
                                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white shadow hover:bg-blue-500 disabled:opacity-60 cursor-pointer"
                                  title="Download DOCX"
                                >
                                  DOCX
                                </button>
                                <button
                                  onClick={() =>
                                    g.variants.xlsx &&
                                    handleDownload(g.variants.xlsx._id)
                                  }
                                  disabled={
                                    !g.variants.xlsx ||
                                    downloadingId === g.variants.xlsx?._id ||
                                    (!!g.variants.xlsx?.approvalStatus &&
                                      g.variants.xlsx?.approvalStatus !==
                                        "approved")
                                  }
                                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white shadow hover:bg-blue-500 disabled:opacity-60 cursor-pointer"
                                  title="Download Excel"
                                >
                                  Excel
                                </button>
                                <button
                                  onClick={() =>
                                    g.variants.images &&
                                    handleDownload(g.variants.images._id)
                                  }
                                  disabled={
                                    !g.variants.images ||
                                    downloadingId === g.variants.images?._id ||
                                    (!!g.variants.images?.approvalStatus &&
                                      g.variants.images?.approvalStatus !==
                                        "approved")
                                  }
                                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white shadow hover:bg-blue-500 disabled:opacity-60 cursor-pointer"
                                  title="Download Images Zip"
                                >
                                  Images
                                </button>
                              </div>
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
                              Contract No
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
                          {filteredGroups.length === 0 && reports.length > 0 ? (
                            <tr>
                              <td
                                colSpan={6}
                                className="px-3 py-5 text-center text-sm text-slate-700/80"
                              >
                                No matches for "{query}".
                              </td>
                            </tr>
                          ) : (
                            paginatedGroups.map((g) => {
                              const acc = accentFor((g as any).type);
                              return (
                                <tr key={g.key} className={acc.rowHover}>
                                  <td className="px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={`flex h-7 w-7 items-center justify-center rounded-xl ${acc.iconBg} ${acc.iconText} ${acc.iconRing} ring-1 shadow-inner`}
                                      >
                                        <FileText className="h-3 w-3" />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-xs font-semibold text-slate-900 truncate">
                                          {(() => {
                                            const t = String(
                                              (g as any).type || ""
                                            ).toLowerCase();
                                            const base =
                                              t === "realestate"
                                                ? "Real Estate"
                                                : t === "salvage"
                                                ? "Salvage"
                                                : "Asset";
                                            return g.contract_no
                                              ? `${base} - ${g.contract_no}`
                                              : g.address || base;
                                          })()}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-xs text-slate-900 truncate max-w-[14rem]">
                                    {g.contract_no || "—"}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-slate-900">
                                    {new Date(g.createdAt).toLocaleDateString()}
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ring-1 shadow-sm bg-emerald-50 text-emerald-700 ring-emerald-200">
                                      {String(g.fairMarketValue ?? "")}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">
                                    {(() => {
                                      const st = (g as any).approvalStatus as
                                        | "pending"
                                        | "approved"
                                        | "rejected"
                                        | undefined;
                                      const label =
                                        st === "approved"
                                          ? "Approved"
                                          : st === "rejected"
                                          ? "Rejected"
                                          : "Waiting approval";
                                      const cls =
                                        st === "approved"
                                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                          : st === "rejected"
                                          ? "bg-rose-50 text-rose-700 ring-rose-200"
                                          : "bg-amber-50 text-amber-700 ring-amber-200";
                                      return (
                                        <span
                                          className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ring-1 shadow-sm ${cls}`}
                                        >
                                          {label}
                                        </span>
                                      );
                                    })()}
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="flex justify-end gap-2">
                                      {/* PDF button hidden - not needed anymore */}
                                      {/* <button
                                      onClick={() => g.variants.pdf && handleDownload(g.variants.pdf._id)}
                                      disabled={!g.variants.pdf || downloadingId === g.variants.pdf?._id || (!!g.variants.pdf?.approvalStatus && g.variants.pdf?.approvalStatus !== 'approved')}
                                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-blue-500 hover:shadow-lg active:translate-y-[1px] disabled:opacity-60 cursor-pointer"
                                      title="Download PDF"
                                    >
                                      PDF
                                    </button> */}
                                      <button
                                        onClick={() =>
                                          g.variants.docx &&
                                          handleDownload(g.variants.docx._id)
                                        }
                                        disabled={
                                          !g.variants.docx ||
                                          downloadingId ===
                                            g.variants.docx?._id ||
                                          (!!g.variants.docx?.approvalStatus &&
                                            g.variants.docx?.approvalStatus !==
                                              "approved")
                                        }
                                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-blue-500 hover:shadow-lg active:translate-y-[1px] disabled:opacity-60 cursor-pointer"
                                        title="Download DOCX"
                                      >
                                        DOCX
                                      </button>
                                      <button
                                        onClick={() =>
                                          g.variants.xlsx &&
                                          handleDownload(g.variants.xlsx._id)
                                        }
                                        disabled={
                                          !g.variants.xlsx ||
                                          downloadingId ===
                                            g.variants.xlsx?._id ||
                                          (!!g.variants.xlsx?.approvalStatus &&
                                            g.variants.xlsx?.approvalStatus !==
                                              "approved")
                                        }
                                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-blue-500 hover:shadow-lg active:translate-y-[1px] disabled:opacity-60 cursor-pointer"
                                        title="Download Excel"
                                      >
                                        Excel
                                      </button>
                                      <button
                                        onClick={() =>
                                          g.variants.images &&
                                          handleDownload(g.variants.images._id)
                                        }
                                        disabled={
                                          !g.variants.images ||
                                          downloadingId ===
                                            g.variants.images?._id ||
                                          (!!g.variants.images
                                            ?.approvalStatus &&
                                            g.variants.images
                                              ?.approvalStatus !== "approved")
                                        }
                                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-blue-500 hover:shadow-lg active:translate-y-[1px] disabled:opacity-60 cursor-pointer"
                                        title="Download Images Zip"
                                      >
                                        Images
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
              {filteredGroups.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-700">
                  <div>
                    Showing {totalItems === 0 ? 0 : startIndex + 1}–{endIndex}{" "}
                    of {totalItems}
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
                      Page {clampedPage} /{" "}
                      {Math.max(1, Math.ceil(totalItems / pageSize))}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
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
