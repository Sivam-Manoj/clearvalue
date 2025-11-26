"use client";

import React, { useState, useEffect } from "react";
import { Save, Send, AlertCircle, Building2 } from "lucide-react";
import { toast } from "react-toastify";
import { RealEstateService } from "@/services/realEstate";
import BottomDrawer from "@/components/BottomDrawer";

interface RealEstatePreviewModalProps {
  reportId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function RealEstatePreviewModal({
  reportId,
  isOpen,
  onClose,
  onSuccess,
}: RealEstatePreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [declineReason, setDeclineReason] = useState<string>("");
  const [previewData, setPreviewData] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [propertyType, setPropertyType] = useState<string>("");
  const [language, setLanguage] = useState<string>("en");
  const [imageCount, setImageCount] = useState<number>(0);

  useEffect(() => {
    if (isOpen && reportId) {
      loadPreviewData();
    }
  }, [isOpen, reportId]);

  const loadPreviewData = async () => {
    try {
      setLoading(true);
      const response = await RealEstateService.getPreviewData(reportId);
      setStatus(response.data.status);
      setDeclineReason(response.data.decline_reason || "");
      setPreviewData(response.data.preview_data || {});
      setPropertyType(response.data.property_type || "residential");
      setLanguage(response.data.language || "en");
      setImageCount(response.data.image_count || 0);
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
      await RealEstateService.updatePreviewData(reportId, previewData);
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
      await RealEstateService.submitForApproval(reportId);
      toast.success("Report submitted for approval successfully!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to submit for approval");
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (path: string, value: any) => {
    setPreviewData((prev: any) => {
      const parts = path.split(".");
      const newData = { ...prev };
      let current: any = newData;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current[parts[i]] = { ...current[parts[i]] };
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
      return newData;
    });
    setHasChanges(true);
  };

  const getValue = (path: string) => {
    const parts = path.split(".");
    let current: any = previewData;
    for (const part of parts) {
      if (!current) return "";
      current = current[part];
    }
    return current || "";
  };

  return (
    <BottomDrawer open={isOpen} onClose={onClose} title="Real Estate Report Preview">
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
          <div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <>
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Report Type Badge */}
            <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <Building2 className="h-6 w-6 text-emerald-600" />
              <div>
                <p className="font-semibold text-emerald-900 capitalize">{propertyType} Property</p>
                <p className="text-sm text-emerald-700">Language: {language.toUpperCase()} | {imageCount} images</p>
              </div>
            </div>

            {/* Property Details Section */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-emerald-600">🏠</span>
                Property Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                    Address *
                  </label>
                  <input
                    type="text"
                    value={getValue("property_details.address")}
                    onChange={(e) => updateField("property_details.address", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="Property address"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                    Owner Name
                  </label>
                  <input
                    type="text"
                    value={getValue("property_details.owner_name")}
                    onChange={(e) => updateField("property_details.owner_name", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="Owner name"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                    Municipality
                  </label>
                  <input
                    type="text"
                    value={getValue("property_details.municipality")}
                    onChange={(e) => updateField("property_details.municipality", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="Municipality"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                    Title Number
                  </label>
                  <input
                    type="text"
                    value={getValue("property_details.title_number")}
                    onChange={(e) => updateField("property_details.title_number", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="Title number"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                    Land Area (Acres)
                  </label>
                  <input
                    type="text"
                    value={getValue("property_details.land_area_acres")}
                    onChange={(e) => updateField("property_details.land_area_acres", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="e.g., 160"
                  />
                </div>
              </div>
            </div>

            {/* Report Dates Section */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-blue-600">📅</span>
                Report Dates
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                    Report Date
                  </label>
                  <input
                    type="date"
                    value={getValue("report_dates.report_date")?.split("T")[0] || ""}
                    onChange={(e) => updateField("report_dates.report_date", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={getValue("report_dates.effective_date")?.split("T")[0] || ""}
                    onChange={(e) => updateField("report_dates.effective_date", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                    Inspection Date
                  </label>
                  <input
                    type="date"
                    value={getValue("report_dates.inspection_date")?.split("T")[0] || ""}
                    onChange={(e) => updateField("report_dates.inspection_date", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>

            {/* House Details Section */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-purple-600">🏢</span>
                Building Details
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                    Year Built
                  </label>
                  <input
                    type="text"
                    value={getValue("house_details.year_built")}
                    onChange={(e) => updateField("house_details.year_built", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="e.g., 2010"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                    Square Footage
                  </label>
                  <input
                    type="text"
                    value={getValue("house_details.square_footage")}
                    onChange={(e) => updateField("house_details.square_footage", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="e.g., 2500"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                    Lot Size (sqft)
                  </label>
                  <input
                    type="text"
                    value={getValue("house_details.lot_size_sqft")}
                    onChange={(e) => updateField("house_details.lot_size_sqft", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="e.g., 5000"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                    Rooms
                  </label>
                  <input
                    type="text"
                    value={getValue("house_details.number_of_rooms")}
                    onChange={(e) => updateField("house_details.number_of_rooms", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="e.g., 4"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                    Full Bathrooms
                  </label>
                  <input
                    type="text"
                    value={getValue("house_details.number_of_full_bathrooms")}
                    onChange={(e) => updateField("house_details.number_of_full_bathrooms", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="e.g., 2"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                    Half Bathrooms
                  </label>
                  <input
                    type="text"
                    value={getValue("house_details.number_of_half_bathrooms")}
                    onChange={(e) => updateField("house_details.number_of_half_bathrooms", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="e.g., 1"
                  />
                </div>
              </div>
            </div>

            {/* Valuation Section */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-green-600">💰</span>
                Valuation
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                    Fair Market Value
                  </label>
                  <input
                    type="text"
                    value={getValue("valuation.fair_market_value")}
                    onChange={(e) => updateField("valuation.fair_market_value", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="e.g., $500,000 CAD"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                    Value Source
                  </label>
                  <input
                    type="text"
                    value={getValue("valuation.value_source")}
                    onChange={(e) => updateField("valuation.value_source", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="e.g., Direct Comparison Approach"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                    Valuation Summary
                  </label>
                  <textarea
                    value={getValue("valuation.final_estimate_summary")}
                    onChange={(e) => updateField("valuation.final_estimate_summary", e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="Summary of valuation methodology..."
                  />
                </div>
              </div>
            </div>

            {/* Inspector Info Section */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-amber-600">👤</span>
                Inspector Info
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                    Inspector Name
                  </label>
                  <input
                    type="text"
                    value={getValue("inspector_info.inspector_name")}
                    onChange={(e) => updateField("inspector_info.inspector_name", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="Inspector name"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={getValue("inspector_info.company_name")}
                    onChange={(e) => updateField("inspector_info.company_name", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={getValue("inspector_info.contact_email")}
                    onChange={(e) => updateField("inspector_info.contact_email", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                    Credentials
                  </label>
                  <input
                    type="text"
                    value={getValue("inspector_info.credentials")}
                    onChange={(e) => updateField("inspector_info.credentials", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="e.g., CRA, AACI"
                  />
                </div>
              </div>
            </div>

            {/* Farmland Details Section (if farmland) */}
            {propertyType === 'farmland' && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-green-600">🌾</span>
                  Farmland Details
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                      Total Title Acres
                    </label>
                    <input
                      type="number"
                      value={getValue("farmland_details.total_title_acres")}
                      onChange={(e) => updateField("farmland_details.total_title_acres", parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      placeholder="160"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                      Cultivated Acres
                    </label>
                    <input
                      type="number"
                      value={getValue("farmland_details.cultivated_acres")}
                      onChange={(e) => updateField("farmland_details.cultivated_acres", parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      placeholder="150"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                      RM Area
                    </label>
                    <input
                      type="text"
                      value={getValue("farmland_details.rm_area")}
                      onChange={(e) => updateField("farmland_details.rm_area", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      placeholder="RM of Corman Park"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                      Soil Class
                    </label>
                    <input
                      type="text"
                      value={getValue("farmland_details.soil_class")}
                      onChange={(e) => updateField("farmland_details.soil_class", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      placeholder="Class 2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                      Crop Type
                    </label>
                    <input
                      type="text"
                      value={getValue("farmland_details.crop_type")}
                      onChange={(e) => updateField("farmland_details.crop_type", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      placeholder="Wheat, Canola"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                      Rent/Acre (if rented)
                    </label>
                    <input
                      type="number"
                      value={getValue("farmland_details.annual_rent_per_acre")}
                      onChange={(e) => updateField("farmland_details.annual_rent_per_acre", parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      placeholder="50"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* AI-Generated Sections */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-indigo-600">🤖</span>
                AI-Generated Report Sections
              </h3>
              <div className="space-y-4">
                <details className="border border-gray-200 rounded-lg p-3">
                  <summary className="font-semibold text-gray-900 cursor-pointer">Executive Summary</summary>
                  <textarea
                    value={getValue("ai_sections.exec_summary")}
                    onChange={(e) => updateField("ai_sections.exec_summary", e.target.value)}
                    rows={4}
                    className="mt-3 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="AI-generated executive summary..."
                  />
                </details>
                <details className="border border-gray-200 rounded-lg p-3">
                  <summary className="font-semibold text-gray-900 cursor-pointer">Property Description</summary>
                  <textarea
                    value={getValue("ai_sections.factual")}
                    onChange={(e) => updateField("ai_sections.factual", e.target.value)}
                    rows={4}
                    className="mt-3 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="Factual property description..."
                  />
                </details>
                <details className="border border-gray-200 rounded-lg p-3">
                  <summary className="font-semibold text-gray-900 cursor-pointer">Scope of Work</summary>
                  <textarea
                    value={getValue("ai_sections.scope")}
                    onChange={(e) => updateField("ai_sections.scope", e.target.value)}
                    rows={4}
                    className="mt-3 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="Scope of work..."
                  />
                </details>
                <details className="border border-gray-200 rounded-lg p-3">
                  <summary className="font-semibold text-gray-900 cursor-pointer">Market Analysis</summary>
                  <textarea
                    value={getValue("ai_sections.market")}
                    onChange={(e) => updateField("ai_sections.market", e.target.value)}
                    rows={4}
                    className="mt-3 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="Market conditions analysis..."
                  />
                </details>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
              <h4 className="text-sm font-bold text-gray-900 mb-3">📊 Report Statistics</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600 capitalize">{propertyType}</div>
                  <div className="text-xs text-gray-600">Property Type</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{language.toUpperCase()}</div>
                  <div className="text-xs text-gray-600">Language</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{imageCount}</div>
                  <div className="text-xs text-gray-600">Images</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">
                    {getValue("ai_sections.exec_summary") ? "✓" : "—"}
                  </div>
                  <div className="text-xs text-gray-600">AI Content</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-gray-200 pt-6">
            <button
              onClick={handleSaveChanges}
              disabled={saving || !hasChanges}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-all disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={handleSubmitForApproval}
              disabled={submitting || hasChanges}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 font-semibold shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50"
            >
              <Send className="h-5 w-5" />
              {submitting ? "Submitting..." : "Submit for Approval"}
            </button>
          </div>
        </>
      )}
    </BottomDrawer>
  );
}
