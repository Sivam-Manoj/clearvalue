"use client";

import { useEffect, useState } from "react";
import { Eye, Edit, Send, AlertCircle, Loader2 } from "lucide-react";
import { getAssetReports, type AssetReport } from "@/services/assets";
import { toast } from "react-toastify";
import StatusBadge from "@/components/reports/StatusBadge";
import PreviewModal from "@/components/reports/PreviewModal";

export default function PreviewsPage() {
  const [reports, setReports] = useState<AssetReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // Load asset reports
  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await getAssetReports();
      // Filter only preview and declined reports
      const previewReports = response.data.filter(
        (report) => report.status === "preview" || report.status === "declined"
      );
      setReports(previewReports);
    } catch (err: any) {
      console.error("Failed to load preview reports:", err);
      toast.error(
        err.response?.data?.message || "Failed to load preview reports"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleOpenPreview = (reportId: string) => {
    setSelectedReportId(reportId);
    setPreviewModalOpen(true);
  };

  const handleModalClose = () => {
    setPreviewModalOpen(false);
    setSelectedReportId(null);
  };

  const handleSuccess = () => {
    // Reload reports after successful submission
    loadReports();
    toast.success("Report submitted for approval!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-rose-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading previews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative isolate">
      <div
        className="pointer-events-none absolute inset-x-0 -top-8 -z-10 h-40 bg-gradient-to-b from-blue-100/60 via-purple-100/40 to-transparent"
        aria-hidden
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent drop-shadow-sm">
            Report Previews
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            Review data and submit for approval
          </p>
        </div>

        {/* Empty State */}
        {reports.length === 0 && (
          <div className="mt-12 text-center p-12 bg-white rounded-2xl border-2 border-dashed border-gray-300">
            <Eye className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Previews Available
            </h3>
            <p className="text-gray-600 mb-4">
              Submit a new asset report to see AI-generated previews here.
            </p>
            <a
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg hover:from-rose-600 hover:to-pink-700 font-medium shadow-lg transition-all"
            >
              Create New Report
            </a>
          </div>
        )}

        {/* Preview Cards */}
        {reports.length > 0 && (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report._id}
                className="bg-white rounded-2xl border border-gray-200 hover:border-blue-300 transition-all shadow-sm hover:shadow-md overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    {/* Report Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold text-gray-900 truncate">
                          {report.client_name || "Untitled Report"}
                        </h3>
                        <StatusBadge status={report.status} />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Total Assets
                          </p>
                          <p className="text-lg font-semibold text-gray-900">
                            {report.lots?.length || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Grouping Mode
                          </p>
                          <p className="text-sm font-medium text-gray-700 capitalize">
                            {report.grouping_mode?.replace(/_/g, " ")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Industry</p>
                          <p className="text-sm font-medium text-gray-700">
                            {report.preview_data?.industry || "Not specified"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Created</p>
                          <p className="text-sm font-medium text-gray-700">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Decline Reason */}
                      {report.status === "declined" &&
                        report.decline_reason && (
                          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-red-900 text-sm">
                                Declined by Admin
                              </p>
                              <p className="text-sm text-red-700 mt-1">
                                {report.decline_reason}
                              </p>
                            </div>
                          </div>
                        )}

                      {/* Preview Data Summary */}
                      {report.preview_data && (
                        <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-xs text-gray-500">Client</p>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {report.preview_data.client_name || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Owner</p>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {report.preview_data.owner_name || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Appraiser</p>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {report.preview_data.appraiser || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Currency</p>
                            <p className="text-sm font-medium text-gray-900">
                              {report.preview_data.currency || "CAD"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="flex-shrink-0">
                      {report.status === "preview" && (
                        <button
                          onClick={() => handleOpenPreview(report._id)}
                          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 font-semibold shadow-lg shadow-blue-500/30 transition-all hover:scale-105"
                        >
                          <Eye className="h-5 w-5" />
                          Review & Submit
                        </button>
                      )}
                      {report.status === "declined" && (
                        <button
                          onClick={() => handleOpenPreview(report._id)}
                          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-xl hover:from-rose-600 hover:to-rose-700 font-semibold shadow-lg shadow-rose-500/30 transition-all hover:scale-105"
                        >
                          <Edit className="h-5 w-5" />
                          Edit & Resubmit
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress Bar (if preview) */}
                {report.status === "preview" && (
                  <div className="px-6 pb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Send className="h-4 w-4" />
                      <span>Ready to submit for admin approval</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {selectedReportId && (
        <PreviewModal
          reportId={selectedReportId}
          isOpen={previewModalOpen}
          onClose={handleModalClose}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
