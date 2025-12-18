"use client";

import { useEffect, useState } from "react";
import {
  Eye,
  Edit,
  Send,
  AlertCircle,
  Loader2,
  Building2,
  Package,
  RefreshCw,
  Clock,
  CheckCircle,
  FileText,
  Download,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { getAssetReports, getSubmittedReports, resubmitReport, deleteAssetReport, type AssetReport } from "@/services/assets";
import {
  RealEstateService,
  type RealEstateReport,
} from "@/services/realEstate";
import { toast } from "react-toastify";
import StatusBadge from "@/components/reports/StatusBadge";
import PreviewModal from "@/components/reports/PreviewModal";
import RealEstatePreviewModal from "@/components/reports/RealEstatePreviewModal";

type CombinedReport =
  | (AssetReport & { reportType: "asset" })
  | (RealEstateReport & { reportType: "realEstate" });

type TabType = "new" | "submitted";

export default function PreviewsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("new");
  const [newReports, setNewReports] = useState<CombinedReport[]>([]);
  const [submittedReports, setSubmittedReports] = useState<CombinedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [resubmitting, setResubmitting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [realEstateModalOpen, setRealEstateModalOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isResubmitMode, setIsResubmitMode] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Load all reports
  const loadReports = async () => {
    try {
      setLoading(true);

      // Fetch all in parallel
      const [assetResponse, realEstateResponse, submittedAssetResponse] = await Promise.all([
        getAssetReports().catch(() => ({ data: [] })),
        RealEstateService.getReports().catch(() => ({ data: [] })),
        getSubmittedReports().catch(() => ({ data: [] })),
      ]);

      // Filter preview and declined reports for "New" tab
      const assetPreviews: CombinedReport[] = (assetResponse.data || [])
        .filter((r) => r.status === "preview" || r.status === "declined")
        .map((r) => ({ ...r, reportType: "asset" as const }));

      const realEstatePreviews: CombinedReport[] = (realEstateResponse.data || [])
        .filter((r) => r.status === "preview" || r.status === "declined")
        .map((r) => ({ ...r, reportType: "realEstate" as const }));

      // Combine new previews
      const combinedNew = [...assetPreviews, ...realEstatePreviews].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Submitted reports (pending_approval and approved)
      const submittedAssets: CombinedReport[] = (submittedAssetResponse.data || [])
        .map((r) => ({ ...r, reportType: "asset" as const }));

      // Also include real estate submitted reports
      const realEstateSubmitted: CombinedReport[] = (realEstateResponse.data || [])
        .filter((r) => r.status === "pending_approval" || r.status === "approved")
        .map((r) => ({ ...r, reportType: "realEstate" as const }));

      const combinedSubmitted = [...submittedAssets, ...realEstateSubmitted].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setNewReports(combinedNew);
      setSubmittedReports(combinedSubmitted);
    } catch (err: any) {
      console.error("Failed to load reports:", err);
      toast.error(err.response?.data?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleOpenPreview = (report: CombinedReport, resubmitMode = false) => {
    setSelectedReportId(report._id);
    setIsResubmitMode(resubmitMode);
    if (report.reportType === "realEstate") {
      setRealEstateModalOpen(true);
    } else {
      setPreviewModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setPreviewModalOpen(false);
    setRealEstateModalOpen(false);
    setSelectedReportId(null);
    setIsResubmitMode(false);
  };

  const handleSuccess = () => {
    loadReports();
    toast.success("Report submitted for approval!");
  };

  const handleQuickResubmit = async (reportId: string) => {
    try {
      setResubmitting(reportId);
      await resubmitReport(reportId);
      toast.success("Report resubmitted! Files are being regenerated.");
      loadReports();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to resubmit report");
    } finally {
      setResubmitting(null);
    }
  };

  const handleDeleteReport = async (reportId: string, reportType: string) => {
    try {
      setDeleting(reportId);
      if (reportType === "asset") {
        await deleteAssetReport(reportId);
      } else {
        await RealEstateService.deleteReport(reportId);
      }
      toast.success("Report deleted successfully");
      setDeleteConfirmId(null);
      loadReports();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete report");
    } finally {
      setDeleting(null);
    }
  };

  const reports = activeTab === "new" ? newReports : submittedReports;

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
            Review, edit, and manage your reports
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex gap-6">
            <button
              onClick={() => setActiveTab("new")}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "new"
                  ? "border-rose-500 text-rose-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Eye className="h-4 w-4" />
              New Previews
              {newReports.length > 0 && (
                <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                  activeTab === "new" ? "bg-rose-100 text-rose-600" : "bg-gray-100 text-gray-600"
                }`}>
                  {newReports.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("submitted")}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "submitted"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Send className="h-4 w-4" />
              Submitted Previews
              {submittedReports.length > 0 && (
                <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                  activeTab === "submitted" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
                }`}>
                  {submittedReports.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Empty State */}
        {reports.length === 0 && (
          <div className="mt-12 text-center p-12 bg-white rounded-2xl border-2 border-dashed border-gray-300">
            {activeTab === "new" ? (
              <>
                <Eye className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No New Previews
                </h3>
                <p className="text-gray-600 mb-4">
                  Submit a new report to see previews here.
                </p>
                <a
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg hover:from-rose-600 hover:to-pink-700 font-medium shadow-lg transition-all"
                >
                  Create New Report
                </a>
              </>
            ) : (
              <>
                <Send className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Submitted Reports
                </h3>
                <p className="text-gray-600 mb-4">
                  Submit a preview for approval to see it here.
                </p>
              </>
            )}
          </div>
        )}

        {/* Preview Cards */}
        {reports.length > 0 && (
          <div className="space-y-4">
            {reports.map((report) => {
              const isRealEstate = report.reportType === "realEstate";
              const title = isRealEstate
                ? (report as any).property_details?.address ||
                  (report as any).preview_data?.property_details?.address ||
                  "Real Estate Report"
                : (report as any).client_name || "Asset Report";
              const typeLabel = isRealEstate ? "Real Estate" : "Asset";
              const typeIcon = isRealEstate ? (
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
              ) : (
                <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              );

              return (
                <div
                  key={report._id}
                  className={`bg-white rounded-xl sm:rounded-2xl border transition-all shadow-sm hover:shadow-md overflow-hidden ${
                    isRealEstate
                      ? "border-emerald-200 hover:border-emerald-400"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <div className="p-4 sm:p-6">
                    {/* Mobile: Stack layout / Desktop: Row layout */}
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      {/* Report Info */}
                      <div className="flex-1 min-w-0">
                        {/* Header with type, title, status */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                          <span className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-lg bg-gray-100 text-xs font-medium text-gray-700">
                            {typeIcon}
                            <span className="hidden xs:inline">{typeLabel}</span>
                          </span>
                          <h3 className="text-base sm:text-xl font-bold text-gray-900 truncate max-w-[200px] sm:max-w-none">
                            {title}
                          </h3>
                          <StatusBadge status={report.status} />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
                          {isRealEstate ? (
                            <>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">
                                  Property Type
                                </p>
                                <p className="text-sm font-medium text-gray-700 capitalize">
                                  {(report as any).property_type || 
                                   (report as any).preview_data?.property_type || "—"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">
                                  Market Value
                                </p>
                                <p className="text-sm font-bold text-emerald-600">
                                  {(report as any).preview_data?.valuation?.fair_market_value || 
                                   (report as any).valuation?.fair_market_value || "—"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">
                                  {(report as any).property_type === 'farmland' ? 'Total Acres' : 'Square Feet'}
                                </p>
                                <p className="text-sm font-medium text-gray-700">
                                  {(report as any).property_type === 'farmland' 
                                    ? ((report as any).preview_data?.farmland_details?.total_title_acres || 
                                       (report as any).farmland_details?.total_title_acres || "—")
                                    : ((report as any).preview_data?.house_details?.square_footage || 
                                       (report as any).house_details?.square_footage || "—")}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">
                                  Images
                                </p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {report.imageUrls?.length || 0}
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">
                                  Total Assets
                                </p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {(report as any).lots?.length || 0}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">
                                  Grouping Mode
                                </p>
                                <p className="text-sm font-medium text-gray-700 capitalize">
                                  {(report as any).grouping_mode?.replace(
                                    /_/g,
                                    " "
                                  ) || "—"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">
                                  Industry
                                </p>
                                <p className="text-sm font-medium text-gray-700">
                                  {report.preview_data?.industry ||
                                    "Not specified"}
                                </p>
                              </div>
                            </>
                          )}
                          <div>
                            <p className="text-xs text-gray-500 mb-1">
                              Created
                            </p>
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

                        {/* Preview Data Summary - Hidden on very small screens */}
                        {report.preview_data && (
                          <div className={`hidden sm:grid gap-3 p-3 rounded-lg ${isRealEstate ? 'grid-cols-2 lg:grid-cols-4 bg-emerald-50' : 'grid-cols-2 bg-gray-50'}`}>
                            <div>
                              <p className="text-xs text-gray-500">
                                {isRealEstate ? "Owner" : "Client"}
                              </p>
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {(report as any).owner_name ||
                                  report.preview_data?.owner_name ||
                                  report.preview_data?.property_details?.owner_name ||
                                  report.preview_data?.client_name ||
                                  "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Appraiser</p>
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {(report as any).inspector_name ||
                                  report.preview_data?.inspector_name ||
                                  report.preview_data?.inspector_info?.inspector_name ||
                                  report.preview_data?.appraiser ||
                                  "—"}
                              </p>
                            </div>
                            {isRealEstate && (
                              <>
                                <div>
                                  <p className="text-xs text-gray-500">
                                    {(report as any).property_type === 'farmland' ? 'Cultivated Acres' : 'Bedrooms'}
                                  </p>
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {(report as any).property_type === 'farmland'
                                      ? (report.preview_data as any)?.farmland_details?.cultivated_acres || "—"
                                      : (report.preview_data as any)?.house_details?.number_of_rooms || "—"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">
                                    {(report as any).property_type === 'farmland' ? 'Soil Class' : 'Bathrooms'}
                                  </p>
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {(report as any).property_type === 'farmland'
                                      ? (report.preview_data as any)?.farmland_details?.soil_class || "—"
                                      : `${(report.preview_data as any)?.house_details?.number_of_full_bathrooms || 0} Full, ${(report.preview_data as any)?.house_details?.number_of_half_bathrooms || 0} Half`}
                                  </p>
                                </div>
                              </>
                            )}
                            <div>
                              <p className="text-xs text-gray-500">
                                {isRealEstate ? "Effective Date" : "Currency"}
                              </p>
                              <p className="text-sm font-medium text-gray-900">
                                {isRealEstate
                                  ? report.preview_data.report_dates
                                      ?.effective_date || "—"
                                  : report.preview_data.currency || "CAD"}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons - Responsive grid on mobile */}
                      <div className="flex-shrink-0">
                        <div className="flex flex-wrap gap-2 lg:flex-col">
                          {/* New Preview Actions */}
                          {report.status === "preview" && (
                            <button
                              onClick={() => handleOpenPreview(report)}
                              className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-white rounded-lg sm:rounded-xl font-semibold shadow-lg transition-all hover:scale-105 text-sm sm:text-base flex-1 lg:flex-none ${
                                isRealEstate
                                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-500/30"
                                  : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/30"
                              }`}
                            >
                              <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                              <span className="hidden sm:inline">Review & Submit</span>
                              <span className="sm:hidden">Review</span>
                            </button>
                          )}
                          {report.status === "declined" && (
                            <button
                              onClick={() => handleOpenPreview(report)}
                              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-lg sm:rounded-xl hover:from-rose-600 hover:to-rose-700 font-semibold shadow-lg shadow-rose-500/30 transition-all hover:scale-105 text-sm sm:text-base flex-1 lg:flex-none"
                            >
                              <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
                              <span className="hidden sm:inline">Edit & Resubmit</span>
                              <span className="sm:hidden">Edit</span>
                            </button>
                          )}

                          {/* Submitted Report Actions */}
                          {(report.status === "pending_approval" || report.status === "approved") && (
                            <>
                              <button
                                onClick={() => handleOpenPreview(report, true)}
                                className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg sm:rounded-xl hover:from-indigo-600 hover:to-indigo-700 font-semibold shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 text-sm flex-1 lg:flex-none"
                              >
                                <Edit className="h-4 w-4" />
                                <span className="hidden sm:inline">Edit & Resubmit</span>
                                <span className="sm:hidden">Edit</span>
                              </button>
                              <button
                                onClick={() => handleQuickResubmit(report._id)}
                                disabled={resubmitting === report._id}
                                className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-white border-2 border-indigo-300 text-indigo-700 rounded-lg sm:rounded-xl hover:bg-indigo-50 font-medium transition-all disabled:opacity-50 text-sm flex-1 lg:flex-none"
                              >
                                {resubmitting === report._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                                <span className="hidden sm:inline">Quick Resubmit</span>
                                <span className="sm:hidden">Resubmit</span>
                              </button>
                              {/* Download Links for submitted reports */}
                              {(report as any).preview_files?.docx && (
                                <a
                                  href={(report as any).preview_files.docx}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                  <Download className="h-4 w-4" />
                                  <span className="hidden sm:inline">Download DOCX</span>
                                  <span className="sm:hidden">DOCX</span>
                                </a>
                              )}
                            </>
                          )}

                          {/* Delete Button */}
                          {deleteConfirmId === report._id ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDeleteReport(report._id, report.reportType)}
                                disabled={deleting === report._id}
                                className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                              >
                                {deleting === report._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(report._id)}
                              className="flex items-center justify-center gap-2 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors text-sm"
                              title="Delete report"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="hidden sm:inline">Delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status Footer */}
                  {report.status === "preview" && (
                    <div className="px-6 pb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Send className="h-4 w-4" />
                        <span>Ready to submit for admin approval</span>
                      </div>
                    </div>
                  )}
                  {report.status === "pending_approval" && (
                    <div className="px-6 pb-4">
                      <div className="flex items-center gap-2 text-sm text-amber-600">
                        <Clock className="h-4 w-4" />
                        <span>Awaiting admin approval</span>
                      </div>
                    </div>
                  )}
                  {report.status === "approved" && (
                    <div className="px-6 pb-4">
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>Approved - You can still edit and resubmit if needed</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Asset Preview Modal */}
      {selectedReportId && previewModalOpen && (
        <PreviewModal
          reportId={selectedReportId}
          isOpen={previewModalOpen}
          onClose={handleModalClose}
          onSuccess={handleSuccess}
          isResubmitMode={isResubmitMode}
        />
      )}

      {/* Real Estate Preview Modal */}
      {selectedReportId && realEstateModalOpen && (
        <RealEstatePreviewModal
          reportId={selectedReportId}
          isOpen={realEstateModalOpen}
          onClose={handleModalClose}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
