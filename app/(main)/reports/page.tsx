"use client";

import { useEffect, useState } from "react";
import { FileText, Download, Trash2 } from "lucide-react";
import { ReportsService, type PdfReport } from "@/services/reports";

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
    } catch (e) {
      console.error("Download failed", e);
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this report? This cannot be undone.")) return;
    try {
      setDeletingId(id);
      await ReportsService.deleteReport(id);
      setReports((prev) => prev.filter((r) => r._id !== id));
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Reports
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            manage your valuation reports.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        {loading ? (
          <div className="p-10">
            <div className="h-6 w-40 animate-pulse rounded bg-gray-100" />
            <div className="mt-4 h-24 w-full animate-pulse rounded bg-gray-100" />
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-red-700">{error}</div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-10 text-center text-gray-600">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <FileText className="h-6 w-6" />
            </div>
            <p className="text-sm">No reports yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    FMV
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {reports.map((r) => (
                  <tr key={r._id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{r.address}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{r.fairMarketValue}</td>
                    <td className="px-4 py-3 text-right text-sm">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => handleDownload(r._id)}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          disabled={downloadingId === r._id}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                          {downloadingId === r._id ? "Downloading..." : "Download"}
                        </button>
                        <button
                          onClick={() => handleDelete(r._id)}
                          className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
                          disabled={deletingId === r._id}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                          {deletingId === r._id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
