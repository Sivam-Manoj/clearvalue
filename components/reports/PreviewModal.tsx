"use client";

import React, { useState, useEffect } from "react";
import { Save, Send, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";
import { getPreviewData, updatePreviewData, submitForApproval } from "@/services/assets";
import BottomDrawer from "@/components/BottomDrawer";

interface PreviewModalProps {
  reportId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}


export default function PreviewModal({
  reportId,
  isOpen,
  onClose,
  onSuccess,
}: PreviewModalProps) {
  // Single-page layout (tabs removed)
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [declineReason, setDeclineReason] = useState<string>("");
  const [previewData, setPreviewData] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [groupingMode, setGroupingMode] = useState<string | undefined>(undefined);
  const [imageCount, setImageCount] = useState<number | undefined>(undefined);

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
      setGroupingMode(response.data.grouping_mode);
      setImageCount(response.data.image_count);
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

  // Valuation editors (nested)
  const updateValuationBase = (base: number) => {
    setPreviewData((prev: any) => {
      const vd = { ...(prev?.valuation_data || {}) };
      vd.baseFMV = isNaN(base as any) ? vd.baseFMV : base;
      // Optionally sync percentages when base changes (keep values as-is)
      return { ...prev, valuation_data: vd };
    });
    setHasChanges(true);
  };

  const updateValuationMethod = (
    index: number,
    field: "fullName" | "description" | "value" | "saleConditions" | "timeline" | "useCase",
    value: any
  ) => {
    setPreviewData((prev: any) => {
      const vd = { ...(prev?.valuation_data || {}) } as any;
      const methods = Array.isArray(vd.methods) ? [...vd.methods] : [];
      const m = { ...(methods[index] || {}) } as any;
      m[field] = value;
      if (field === "value") {
        const base = Number(vd.baseFMV) || 0;
        const numVal = Number(value);
        if (base > 0 && isFinite(numVal)) {
          m.percentage = Math.round((numVal / base) * 100);
        }
      }
      methods[index] = m;
      return { ...prev, valuation_data: { ...vd, methods } };
    });
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

  const deleteLot = (index: number) => {
    setPreviewData((prev: any) => {
      const lots = Array.isArray(prev?.lots) ? [...prev.lots] : [];
      lots.splice(index, 1);
      return { ...prev, lots };
    });
    setHasChanges(true);
  };

  const updateLotItem = (
    lotIndex: number,
    itemIndex: number,
    field: string,
    value: any
  ) => {
    setPreviewData((prev: any) => {
      const newLots = [...(prev.lots || [])];
      const lot = { ...(newLots[lotIndex] || {}) } as any;
      const items = Array.isArray(lot.items) ? [...lot.items] : [];
      items[itemIndex] = { ...(items[itemIndex] || {}), [field]: value };
      lot.items = items;
      newLots[lotIndex] = lot;
      return { ...prev, lots: newLots };
    });
    setHasChanges(true);
  };

  // Group lots by mixed_group_index and determine sub-mode label
  const lotsArray: any[] = Array.isArray(previewData?.lots) ? previewData.lots : [];
  const groupMap = new Map<number, { idx: number; lot: any }[]>();
  for (let i = 0; i < lotsArray.length; i++) {
    const lot = lotsArray[i];
    const gi = Number(lot?.mixed_group_index) || 0;
    if (!groupMap.has(gi)) groupMap.set(gi, []);
    groupMap.get(gi)!.push({ idx: i, lot });
  }
  const groupIds = Array.from(groupMap.keys()).sort((a, b) => a - b);
  const labelForSubMode = (m?: string) => {
    const sm = String(m || "").trim();
    if (sm === "per_item") return "Per Item";
    if (sm === "per_photo") return "Per Photo";
    if (sm === "single_lot") return "Bundle";
    // fallback to groupingMode string
    const gm = String(groupingMode || previewData?.grouping_mode || "mixed");
    if (gm === "per_item") return "Per Item";
    if (gm === "per_photo") return "Per Photo";
    if (gm === "single_lot") return "Bundle";
    return "Assets";
  };
  const groupedLots = groupIds.map((gid) => {
    const items = groupMap.get(gid) || [];
    const first = items[0]?.lot || {};
    const inferredMode =
      first?.sub_mode ||
      ((first?.tags || []).find?.((t: string) => typeof t === "string" && t.startsWith("mode:"))?.split?.(":")?.[1] || undefined);
    return { gid, subMode: inferredMode, items };
  });

  return (
    <BottomDrawer open={isOpen} onClose={onClose} title="Preview & Edit Report">
      {status === "declined" && declineReason && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Report Declined</p>
            <p className="text-sm text-red-700 mt-1">{declineReason}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-rose-600 border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <>
          {/* Report Details */}
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

            {/* AI narrative fields removed to match DOCX inputs */}

            {/* Quick Stats */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4">
              <h4 className="text-sm font-bold text-gray-900 mb-3">📊 Report Statistics</h4>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
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
                <div className="text-center">
                  <div className="text-sm font-semibold text-blue-700">{(groupingMode || previewData?.grouping_mode || "mixed").toString()}</div>
                  <div className="text-xs text-gray-600">Grouping</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-600">{imageCount ?? "-"}</div>
                  <div className="text-xs text-gray-600">Images</div>
                </div>
              </div>
            </div>
          </div>

          {/* Assets/Lots */}
          <div className="mt-6 space-y-4 max-w-5xl mx-auto">
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Assets / Lots</h3>
            {groupedLots.length ? (
              <>
                {/* Mobile: card list grouped by sub-mode */}
                <div className="md:hidden space-y-5">
                  {groupedLots.map((group) => (
                    <div key={group.gid}>
                      <div className="mb-2 text-sm font-semibold text-gray-900">
                        Group {group.gid || 1} — {labelForSubMode(group.subMode)} ({group.items.length})
                      </div>
                      <div className="space-y-3">
                        {group.items.map(({ lot, idx }) => (
                          <div key={idx} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-sm font-semibold text-gray-900">Lot {String(lot.lot_id || idx + 1)}</div>
                              <button
                                onClick={() => deleteLot(idx)}
                                aria-label={`Delete lot ${idx + 1}`}
                                className="px-2 py-1 rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 text-xs"
                              >
                                Delete
                              </button>
                            </div>
                            <div className="space-y-2">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Title</label>
                                <input
                                  type="text"
                                  value={lot.title || ""}
                                  onChange={(e) => updateLot(idx, "title", e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
                                  placeholder="Title"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Description</label>
                                <textarea
                                  value={lot.description || ""}
                                  onChange={(e) => updateLot(idx, "description", e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm leading-5 resize-none min-h-[72px]"
                                  placeholder="Short description"
                                  rows={3}
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Details</label>
                                <textarea
                                  value={lot.details || ""}
                                  onChange={(e) => updateLot(idx, "details", e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm leading-5 resize-none min-h-[72px]"
                                  placeholder="Specs / notes / attributes"
                                  rows={3}
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Value</label>
                                <input
                                  type="text"
                                  value={lot.estimated_value || ""}
                                  onChange={(e) => updateLot(idx, "estimated_value", e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
                                  placeholder="e.g., $25,000"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: table per group */}
                <div className="hidden md:block space-y-6">
                  {groupedLots.map((group) => (
                    <div key={group.gid} className="overflow-x-auto">
                      <div className="mb-2 text-sm font-semibold text-gray-900">
                        Group {group.gid || 1} — {labelForSubMode(group.subMode)} ({group.items.length})
                      </div>
                      <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                        <thead className="bg-gray-50 text-gray-700">
                          <tr>
                            <th className="px-3 py-2 text-left">Lot #</th>
                            <th className="px-3 py-2 text-left">Title</th>
                            <th className="px-3 py-2 text-left">Description</th>
                            <th className="px-3 py-2 text-left">Details</th>
                            <th className="px-3 py-2 text-left">Value</th>
                            <th className="px-3 py-2 text-left">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.items.map(({ lot, idx }, i) => (
                            <tr key={idx} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <td className="px-3 py-2 text-gray-800 font-medium">{String(lot.lot_id || idx + 1)}</td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={lot.title || ""}
                                  onChange={(e) => updateLot(idx, "title", e.target.value)}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
                                  placeholder="Title"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <textarea
                                  value={lot.description || ""}
                                  onChange={(e) => updateLot(idx, "description", e.target.value)}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm leading-5 resize-none min-h-[56px]"
                                  placeholder="Short description"
                                  rows={2}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <textarea
                                  value={lot.details || ""}
                                  onChange={(e) => updateLot(idx, "details", e.target.value)}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm leading-5 resize-none min-h-[56px]"
                                  placeholder="Specs / notes / attributes"
                                  rows={2}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={lot.estimated_value || ""}
                                  onChange={(e) => updateLot(idx, "estimated_value", e.target.value)}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
                                  placeholder="e.g., $25,000"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  onClick={() => deleteLot(idx)}
                                  aria-label={`Delete lot ${idx + 1}`}
                                  className="px-2.5 py-1.5 rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 text-xs"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <div className="text-6xl mb-4">📦</div>
                <p className="text-gray-600 font-medium">No lots data available</p>
                <p className="text-sm text-gray-500 mt-1">AI analysis didn't extract any lot information</p>
              </div>
            )}
          </div>

          {/* Valuation */}
          <div className="mt-6 space-y-4 max-w-5xl mx-auto">
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Valuation</h3>
            <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
              <input
                id="include-valuation"
                type="checkbox"
                checked={!!previewData?.include_valuation_table}
                onChange={(e) => updateField("include_valuation_table", e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="include-valuation" className="text-sm text-gray-800">Include Valuation Comparison Table</label>
            </div>
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
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Base Fair Market Value
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">{previewData?.currency || "CAD"}</span>
                      <input
                        type="number"
                        min={0}
                        value={Number(previewData.valuation_data.baseFMV || 0)}
                        onChange={(e) => updateValuationBase(Number(e.target.value))}
                        className="w-56 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all tabular-nums"
                      />
                    </div>
                  </div>
                )}
                {Array.isArray(previewData?.valuation_data?.methods) && previewData.valuation_data.methods.length > 0 && (
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">Comparison Table</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full table-fixed text-sm border border-gray-200 rounded-md overflow-hidden">
                        <thead className="bg-gray-50 text-gray-700">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium w-[26%]">Method</th>
                            <th className="px-3 py-2 text-left font-medium w-[16%]">Value</th>
                            <th className="px-3 py-2 text-left font-medium w-[24%]">Conditions</th>
                            <th className="px-3 py-2 text-left font-medium w-[18%]">Timeline</th>
                            <th className="px-3 py-2 text-left font-medium w-[16%]">Use Case</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.valuation_data.methods.map((m: any, i: number) => (
                            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <td className="px-3 py-2 align-top">
                                <div className="mb-1">
                                  <input
                                    type="text"
                                    value={m.fullName || ""}
                                    onChange={(e) => updateValuationMethod(i, "fullName", e.target.value)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
                                    placeholder="Full method name"
                                  />
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="inline-flex items-center rounded-md bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 text-[11px] font-semibold">{m.method || "—"}</span>
                                  <span className="text-[11px] text-gray-500">Code</span>
                                </div>
                                <textarea
                                  value={m.description || ""}
                                  onChange={(e) => updateValuationMethod(i, "description", e.target.value)}
                                  className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent text-xs leading-5 resize-none min-h-[56px]"
                                  placeholder="Short description"
                                  rows={2}
                                />
                              </td>
                              <td className="px-3 py-2 align-top">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-600">{previewData?.currency || 'CAD'}</span>
                                  <input
                                    type="number"
                                    min={0}
                                    value={Number(m.value || 0)}
                                    onChange={(e) => updateValuationMethod(i, "value", Number(e.target.value))}
                                    className="w-44 px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm tabular-nums"
                                  />
                                </div>
                              </td>
                              <td className="px-3 py-2 align-top">
                                <textarea
                                  value={m.saleConditions || ""}
                                  onChange={(e) => updateValuationMethod(i, "saleConditions", e.target.value)}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent text-xs leading-5 resize-none min-h-[56px]"
                                  placeholder="Conditions"
                                  rows={2}
                                />
                              </td>
                              <td className="px-3 py-2 align-top">
                                <input
                                  type="text"
                                  value={m.timeline || ""}
                                  onChange={(e) => updateValuationMethod(i, "timeline", e.target.value)}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
                                  placeholder="Timeline"
                                />
                              </td>
                              <td className="px-3 py-2 align-top">
                                <input
                                  type="text"
                                  value={m.useCase || ""}
                                  onChange={(e) => updateValuationMethod(i, "useCase", e.target.value)}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
                                  placeholder="Use Case"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No valuation data selected for this report
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="mt-6 space-y-6 max-w-5xl mx-auto">
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
                  <p className="text-sm text-gray-600">Owner</p>
                  <p className="font-semibold text-gray-900">
                    {previewData?.owner_name || "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Effective Date</p>
                  <p className="font-semibold text-gray-900">
                    {previewData?.effective_date?.split("T")[0] || "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Inspection Date</p>
                  <p className="font-semibold text-gray-900">
                    {previewData?.inspection_date?.split("T")[0] || "Not set"}
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

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Next Steps</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                <li>Review the data</li>
                <li>Make any necessary edits</li>
                <li>Save your changes</li>
                <li>Submit for admin approval</li>
              </ol>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-gray-200 pt-4">
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
                aria-label="Save changes"
                className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all shadow-md hover:shadow-lg text-sm sm:text-base"
              >
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">{saving ? "Saving..." : "Save Changes"}</span>
                <span className="sm:hidden">{saving ? "Save..." : "Save"}</span>
              </button>
              <button
                onClick={handleSubmitForApproval}
                disabled={hasChanges || submitting || loading}
                aria-label="Submit for approval"
                className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg hover:from-rose-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-rose-500/30 transition-all hover:shadow-xl text-sm sm:text-base"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">{submitting ? "Submitting..." : "Submit for Approval"}</span>
                <span className="sm:hidden">{submitting ? "Submit..." : "Submit"}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </BottomDrawer>
  );
}
