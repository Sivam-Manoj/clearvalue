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
      <div className="flex min-h-screen items-center justify-center p-2 sm:p-4">
        <div className="relative w-full max-w-7xl max-h-[95vh] bg-white rounded-xl sm:rounded-2xl shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gradient-to-r from-rose-50 to-pink-50">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Preview & Edit Report</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                Review AI-extracted data • Make edits • Submit for approval
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 hover:bg-white rounded-lg transition-colors flex-shrink-0 ml-2"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500" />
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
          <div className="flex gap-1 px-2 sm:px-6 pt-2 sm:pt-4 border-b border-gray-200 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? "text-rose-600 border-b-2 border-rose-600 bg-rose-50/50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                } rounded-t-lg`}
              >
                <span className="text-base sm:text-lg">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin h-8 w-8 border-4 border-rose-600 border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <>
                {/* Metadata Tab */}
                {activeTab === "metadata" && (
                  <div className="space-y-6 max-w-5xl mx-auto">
                    {/* Basic Information Section */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-blue-600">👤</span>
                        Basic Information
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                            Client Name *
                          </label>
                          <input
                            type="text"
                            value={previewData?.client_name || ""}
                            onChange={(e) => updateField("client_name", e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                            placeholder="e.g., ABC Corporation"
                          />
                          {!previewData?.client_name && (
                            <p className="text-xs text-amber-600 mt-1">⚠️ Required field</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                            Owner Name
                          </label>
                          <input
                            type="text"
                            value={previewData?.owner_name || ""}
                            onChange={(e) => updateField("owner_name", e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                            placeholder="e.g., John Smith"
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                            Contract Number
                          </label>
                          <input
                            type="text"
                            value={previewData?.contract_no || ""}
                            onChange={(e) => updateField("contract_no", e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                            placeholder="e.g., C-2024-001"
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                            Industry
                          </label>
                          <input
                            type="text"
                            value={previewData?.industry || ""}
                            onChange={(e) => updateField("industry", e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                            placeholder="e.g., Construction, Manufacturing"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Dates & Financial Section */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-green-600">📅</span>
                        Dates & Financial
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                            Effective Date
                          </label>
                          <input
                            type="date"
                            value={previewData?.effective_date?.split("T")[0] || ""}
                            onChange={(e) => updateField("effective_date", e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                            Inspection Date
                          </label>
                          <input
                            type="date"
                            value={previewData?.inspection_date?.split("T")[0] || ""}
                            onChange={(e) => updateField("inspection_date", e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                            Currency
                          </label>
                          <select
                            value={previewData?.currency || "CAD"}
                            onChange={(e) => updateField("currency", e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                          >
                            <option value="CAD">CAD - Canadian Dollar</option>
                            <option value="USD">USD - US Dollar</option>
                            <option value="EUR">EUR - Euro</option>
                            <option value="GBP">GBP - British Pound</option>
                            <option value="INR">INR - Indian Rupee</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                            Total Appraised Value
                          </label>
                          <input
                            type="text"
                            value={previewData?.total_appraised_value || previewData?.total_value || ""}
                            onChange={(e) => updateField("total_appraised_value", e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                            placeholder="e.g., $100,000 or CAD 100,000"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Appraisal Details Section */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-purple-600">📋</span>
                        Appraisal Details
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                            Appraisal Purpose
                          </label>
                          <input
                            type="text"
                            value={previewData?.appraisal_purpose || ""}
                            onChange={(e) => updateField("appraisal_purpose", e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                            placeholder="e.g., Insurance, Sale, Financing, Internal Review"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                              Appraiser Name
                            </label>
                            <input
                              type="text"
                              value={previewData?.appraiser || ""}
                              onChange={(e) => updateField("appraiser", e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                              placeholder="e.g., John Appraiser, CPA"
                            />
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                              Appraisal Company
                            </label>
                            <input
                              type="text"
                              value={previewData?.appraisal_company || ""}
                              onChange={(e) => updateField("appraisal_company", e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                              placeholder="e.g., ClearValue Appraisals"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI-Generated Analysis Section */}
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4 sm:p-6">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <span className="text-purple-600">🤖</span>
                        AI-Generated Analysis
                        <span className="text-xs font-normal text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">Editable</span>
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mb-4">
                        AI has analyzed the images and generated the following insights. You can review and edit all content below.
                      </p>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                            <span className="text-amber-500">📊</span>
                            Market Overview
                          </label>
                          <textarea
                            value={previewData?.market_overview || ""}
                            onChange={(e) => updateField("market_overview", e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2.5 text-sm border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white"
                            placeholder="Example: The market for [asset type] has shown steady growth... Current demand is driven by... Regional factors include..."
                          />
                          <p className="text-xs text-gray-500 mt-1">📝 {previewData?.market_overview?.length || 0} characters</p>
                        </div>

                        <div>
                          <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                            <span className="text-blue-500">💎</span>
                            Valuation Explanation
                          </label>
                          <textarea
                            value={previewData?.valuation_explanation || ""}
                            onChange={(e) => updateField("valuation_explanation", e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2.5 text-sm border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white"
                            placeholder="Example: Valuation methodology applied... Factors considered include age, condition, market comparables... Adjustments made for..."
                          />
                          <p className="text-xs text-gray-500 mt-1">📝 {previewData?.valuation_explanation?.length || 0} characters</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                              <span className="text-green-500">✓</span>
                              Condition Notes
                            </label>
                            <textarea
                              value={previewData?.condition_notes || ""}
                              onChange={(e) => updateField("condition_notes", e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2.5 text-sm border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white"
                              placeholder="Example: Overall condition is good/fair/excellent... Notable wear and tear... Maintenance history..."
                            />
                            <p className="text-xs text-gray-500 mt-1">📝 {previewData?.condition_notes?.length || 0} characters</p>
                          </div>

                          <div>
                            <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                              <span className="text-orange-500">💡</span>
                              Recommendations
                            </label>
                            <textarea
                              value={previewData?.recommendations || ""}
                              onChange={(e) => updateField("recommendations", e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2.5 text-sm border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white"
                              placeholder="Example: Recommended actions... Maintenance suggestions... Future considerations..."
                            />
                            <p className="text-xs text-gray-500 mt-1">📝 {previewData?.recommendations?.length || 0} characters</p>
                          </div>
                        </div>

                        <div>
                          <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                            <span className="text-red-500">📈</span>
                            Comparable Sales
                          </label>
                          <textarea
                            value={previewData?.comparable_sales || ""}
                            onChange={(e) => updateField("comparable_sales", e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2.5 text-sm border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white"
                            placeholder="Example: Similar asset sold for... Recent market transactions... Comparable item features..."
                          />
                          <p className="text-xs text-gray-500 mt-1">📝 {previewData?.comparable_sales?.length || 0} characters</p>
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4">
                      <h4 className="text-sm font-bold text-gray-900 mb-3">📊 Report Statistics</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{previewData?.lots?.length || 0}</div>
                          <div className="text-xs text-gray-600">Total Lots</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{previewData?.currency || "CAD"}</div>
                          <div className="text-xs text-gray-600">Currency</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">{previewData?.language?.toUpperCase() || "EN"}</div>
                          <div className="text-xs text-gray-600">Language</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-rose-600">{previewData?.total_appraised_value ? "✓" : "-"}</div>
                          <div className="text-xs text-gray-600">Value Set</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lots Tab */}
                {activeTab === "lots" && (
                  <div className="space-y-4 max-w-5xl mx-auto">
                    {previewData?.lots?.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 mb-4">
                        <p className="text-sm text-blue-900 font-medium">
                          📦 {previewData.lots.length} Lot{previewData.lots.length !== 1 ? 's' : ''} Found • Review and edit each lot below
                        </p>
                      </div>
                    )}
                    
                    {previewData?.lots?.map((lot: any, index: number) => (
                      <div
                        key={index}
                        className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-6 hover:border-rose-300 hover:shadow-md transition-all"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                            <span className="bg-rose-100 text-rose-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </span>
                            Lot {index + 1}
                          </h4>
                          {lot.estimated_value && (
                            <span className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                              {lot.estimated_value}
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                              Title / Name
                            </label>
                            <input
                              type="text"
                              value={lot.title || ""}
                              onChange={(e) => updateLot(index, "title", e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                              placeholder="e.g., 2020 Caterpillar 320 Excavator"
                            />
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                              Description
                            </label>
                            <textarea
                              value={lot.description || ""}
                              onChange={(e) =>
                                updateLot(index, "description", e.target.value)
                              }
                              rows={3}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                              placeholder="e.g., Heavy-duty excavator with hydraulic arm, good working condition..."
                            />
                            <p className="text-xs text-gray-500 mt-1">📝 {lot.description?.length || 0} characters</p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                                Condition
                              </label>
                              <select
                                value={lot.condition || "Good"}
                                onChange={(e) => updateLot(index, "condition", e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                              >
                                <option value="Excellent">Excellent</option>
                                <option value="Very Good">Very Good</option>
                                <option value="Good">Good</option>
                                <option value="Fair">Fair</option>
                                <option value="Poor">Poor</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                                Estimated Value
                              </label>
                              <input
                                type="text"
                                value={lot.estimated_value || ""}
                                onChange={(e) =>
                                  updateLot(index, "estimated_value", e.target.value)
                                }
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                                placeholder="e.g., $25,000 or CAD 35,000"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!previewData?.lots || previewData.lots.length === 0) && (
                      <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                        <div className="text-6xl mb-4">📦</div>
                        <p className="text-gray-600 font-medium">No lots data available</p>
                        <p className="text-sm text-gray-500 mt-1">AI analysis didn't extract any lot information</p>
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <button
              onClick={onClose}
              className="order-2 sm:order-1 px-4 py-2.5 text-gray-700 hover:text-gray-900 font-medium transition-colors hover:bg-white rounded-lg"
            >
              Cancel
            </button>
            <div className="order-1 sm:order-2 flex flex-col sm:flex-row gap-2 sm:gap-3">
              {hasChanges && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Unsaved changes
                </div>
              )}
              <button
                onClick={handleSaveChanges}
                disabled={!hasChanges || saving}
                className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all shadow-md hover:shadow-lg text-sm sm:text-base"
              >
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">{saving ? "Saving..." : "Save Changes"}</span>
                <span className="sm:hidden">{saving ? "Save..." : "Save"}</span>
              </button>
              <button
                onClick={handleSubmitForApproval}
                disabled={hasChanges || submitting || loading}
                className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg hover:from-rose-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-rose-500/30 transition-all hover:shadow-xl text-sm sm:text-base"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">{submitting ? "Submitting..." : "Submit for Approval"}</span>
                <span className="sm:hidden">{submitting ? "Submit..." : "Submit"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
