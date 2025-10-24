"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Send, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";
import { getPreviewData, updatePreviewData, submitForApproval } from "@/services/assets";

interface PreviewModalProps {
  reportId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type TabType = "metadata" | "lots" | "valuation" | "summary";

export default function PreviewModal({
  reportId,
  isOpen,
  onClose,
  onSuccess,
}: PreviewModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("metadata");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [declineReason, setDeclineReason] = useState<string>("");
  const [previewData, setPreviewData] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen && reportId) {
      loadPreviewData();
    }
  }, [isOpen, reportId]);

  const loadPreviewData = async () => {
    try {
      setLoading(true);
      const response = await getPreviewData(reportId);
      setStatus(response.data.status);
      setDeclineReason(response.data.decline_reason || "");
      setPreviewData(response.data.preview_data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load preview data");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      await updatePreviewData(reportId, previewData);
      setHasChanges(false);
      toast.success("Changes saved successfully!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!previewData) {
      toast.error("No preview data available");
      return;
    }

    if (hasChanges) {
      toast.warning("Please save your changes before submitting");
      return;
    }

    try {
      setSubmitting(true);
      await submitForApproval(reportId);
      toast.success("Report submitted for approval successfully!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to submit for approval");
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setPreviewData((prev: any) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const updateLot = (index: number, field: string, value: any) => {
    setPreviewData((prev: any) => {
      const newLots = [...(prev.lots || [])];
      newLots[index] = { ...newLots[index], [field]: value };
      return { ...prev, lots: newLots };
    });
    setHasChanges(true);
  };

  if (!isOpen) return null;

  const tabs = [
    { id: "metadata" as TabType, label: "Report Details", icon: "📄" },
    { id: "lots" as TabType, label: "Assets/Lots", icon: "📦" },
    { id: "valuation" as TabType, label: "Valuation", icon: "💰" },
    { id: "summary" as TabType, label: "Summary", icon: "📋" },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-sm">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Preview & Edit Report</h2>
              <p className="text-sm text-gray-500 mt-1">
                Review AI-extracted data and make changes before submitting
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-6 w-6 text-gray-500" />
            </button>
          </div>

          {/* Decline Reason Alert */}
          {status === "declined" && declineReason && (
            <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Report Declined</p>
                <p className="text-sm text-red-700 mt-1">{declineReason}</p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 px-6 pt-4 border-b border-gray-200 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "text-rose-600 border-b-2 border-rose-600 bg-rose-50/50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                } rounded-t-lg`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin h-8 w-8 border-4 border-rose-600 border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <>
                {/* Metadata Tab */}
                {activeTab === "metadata" && (
                  <div className="space-y-4 max-w-3xl">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Client Name
                        </label>
                        <input
                          type="text"
                          value={previewData?.client_name || ""}
                          onChange={(e) => updateField("client_name", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                          placeholder="Enter client name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Owner Name
                        </label>
                        <input
                          type="text"
                          value={previewData?.owner_name || ""}
                          onChange={(e) => updateField("owner_name", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                          placeholder="Enter owner name"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Effective Date
                        </label>
                        <input
                          type="date"
                          value={previewData?.effective_date?.split("T")[0] || ""}
                          onChange={(e) => updateField("effective_date", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Currency
                        </label>
                        <select
                          value={previewData?.currency || "CAD"}
                          onChange={(e) => updateField("currency", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                        >
                          <option value="CAD">CAD - Canadian Dollar</option>
                          <option value="USD">USD - US Dollar</option>
                          <option value="EUR">EUR - Euro</option>
                          <option value="GBP">GBP - British Pound</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Appraisal Purpose
                      </label>
                      <input
                        type="text"
                        value={previewData?.appraisal_purpose || ""}
                        onChange={(e) => updateField("appraisal_purpose", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                        placeholder="e.g., Insurance, Sale, Financing"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Appraiser
                        </label>
                        <input
                          type="text"
                          value={previewData?.appraiser || ""}
                          onChange={(e) => updateField("appraiser", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                          placeholder="Appraiser name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Appraisal Company
                        </label>
                        <input
                          type="text"
                          value={previewData?.appraisal_company || ""}
                          onChange={(e) => updateField("appraisal_company", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                          placeholder="Company name"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Industry
                      </label>
                      <input
                        type="text"
                        value={previewData?.industry || ""}
                        onChange={(e) => updateField("industry", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                        placeholder="e.g., Construction, Manufacturing"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Contract Number
                        </label>
                        <input
                          type="text"
                          value={previewData?.contract_no || ""}
                          onChange={(e) => updateField("contract_no", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                          placeholder="Enter contract number"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Inspection Date
                        </label>
                        <input
                          type="date"
                          value={previewData?.inspection_date?.split("T")[0] || ""}
                          onChange={(e) => updateField("inspection_date", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Total Appraised Value
                      </label>
                      <input
                        type="text"
                        value={previewData?.total_appraised_value || ""}
                        onChange={(e) => updateField("total_appraised_value", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                        placeholder="e.g., $100,000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Market Overview
                      </label>
                      <textarea
                        value={previewData?.market_overview || ""}
                        onChange={(e) => updateField("market_overview", e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                        placeholder="AI-generated market overview (editable)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Valuation Explanation
                      </label>
                      <textarea
                        value={previewData?.valuation_explanation || ""}
                        onChange={(e) => updateField("valuation_explanation", e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                        placeholder="AI-generated valuation methodology (editable)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Condition Notes
                      </label>
                      <textarea
                        value={previewData?.condition_notes || ""}
                        onChange={(e) => updateField("condition_notes", e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                        placeholder="AI-generated condition assessment (editable)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Recommendations
                      </label>
                      <textarea
                        value={previewData?.recommendations || ""}
                        onChange={(e) => updateField("recommendations", e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                        placeholder="AI-generated recommendations (editable)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Comparable Sales
                      </label>
                      <textarea
                        value={previewData?.comparable_sales || ""}
                        onChange={(e) => updateField("comparable_sales", e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                        placeholder="AI-generated comparable sales data (editable)"
                      />
                    </div>
                  </div>
                )}

                {/* Lots Tab */}
                {activeTab === "lots" && (
                  <div className="space-y-4">
                    {previewData?.lots?.map((lot: any, index: number) => (
                      <div
                        key={index}
                        className="p-4 border border-gray-200 rounded-lg hover:border-rose-300 transition-colors"
                      >
                        <h4 className="font-semibold text-gray-900 mb-3">
                          Lot {index + 1}
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Title
                            </label>
                            <input
                              type="text"
                              value={lot.title || ""}
                              onChange={(e) => updateLot(index, "title", e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Description
                            </label>
                            <textarea
                              value={lot.description || ""}
                              onChange={(e) =>
                                updateLot(index, "description", e.target.value)
                              }
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Condition
                            </label>
                            <input
                              type="text"
                              value={lot.condition || ""}
                              onChange={(e) => updateLot(index, "condition", e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Estimated Value
                            </label>
                            <input
                              type="text"
                              value={lot.estimated_value || ""}
                              onChange={(e) =>
                                updateLot(index, "estimated_value", e.target.value)
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!previewData?.lots || previewData.lots.length === 0) && (
                      <div className="text-center py-12 text-gray-500">
                        No lots data available
                      </div>
                    )}
                  </div>
                )}

                {/* Valuation Tab */}
                {activeTab === "valuation" && (
                  <div className="space-y-4 max-w-3xl">
                    {previewData?.include_valuation_table ? (
                      <>
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="font-semibold text-blue-900 mb-2">
                            Valuation Methods Selected
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {previewData?.valuation_methods?.map((method: string) => (
                              <span
                                key={method}
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                              >
                                {method}
                              </span>
                            ))}
                          </div>
                        </div>
                        {previewData?.valuation_data && (
                          <div className="p-4 border border-gray-200 rounded-lg">
                            <h4 className="font-semibold text-gray-900 mb-3">
                              Base Fair Market Value
                            </h4>
                            <p className="text-2xl font-bold text-rose-600">
                              ${previewData.valuation_data.baseFMV?.toLocaleString()}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        No valuation data selected for this report
                      </div>
                    )}
                  </div>
                )}

                {/* Summary Tab */}
                {activeTab === "summary" && (
                  <div className="space-y-6 max-w-3xl">
                    <div className="p-6 bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-xl">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">
                        Report Summary
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Client</p>
                          <p className="font-semibold text-gray-900">
                            {previewData?.client_name || "Not specified"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Industry</p>
                          <p className="font-semibold text-gray-900">
                            {previewData?.industry || "Not specified"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Lots</p>
                          <p className="font-semibold text-gray-900">
                            {previewData?.lots?.length || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Currency</p>
                          <p className="font-semibold text-gray-900">
                            {previewData?.currency || "CAD"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {hasChanges && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-yellow-900">Unsaved Changes</p>
                          <p className="text-sm text-yellow-700 mt-1">
                            You have unsaved changes. Please save before submitting.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-2">Next Steps</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                        <li>Review all data in the tabs above</li>
                        <li>Make any necessary edits</li>
                        <li>Save your changes</li>
                        <li>Submit for admin approval</li>
                      </ol>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              Cancel
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleSaveChanges}
                disabled={!hasChanges || saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={handleSubmitForApproval}
                disabled={hasChanges || submitting || loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg hover:from-rose-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-rose-500/30 transition-all"
              >
                <Send className="h-4 w-4" />
                {submitting ? "Submitting..." : "Submit for Approval"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
