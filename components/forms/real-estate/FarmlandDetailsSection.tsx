"use client";

import { Wheat } from "lucide-react";
import CollapsibleSection from "./CollapsibleSection";
import type { RealEstateDetails } from "@/services/realEstate";

interface FarmlandDetailsSectionProps {
  details: RealEstateDetails;
  onChange: <K extends keyof NonNullable<RealEstateDetails["farmland_details"]>>(
    field: K,
    value: NonNullable<RealEstateDetails["farmland_details"]>[K]
  ) => void;
}

export default function FarmlandDetailsSection({ details, onChange }: FarmlandDetailsSectionProps) {
  const fd = details.farmland_details;
  const fields = [fd?.total_title_acres, fd?.cultivated_acres, fd?.rm_area, fd?.soil_class, fd?.crop_type, fd?.access_quality, fd?.distance_to_city_km];
  const filledCount = fields.filter((f) => f !== undefined && f !== null && f !== "").length;

  const inputClass = "w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-300";
  const labelClass = "block text-[11px] font-medium text-gray-600 mb-0.5";

  return (
    <CollapsibleSection title="Farmland" icon={<Wheat className="text-emerald-600" />} filledCount={filledCount} totalCount={fields.length} variant="success" required>
      <div className="grid gap-2 grid-cols-2">
        <div>
          <label className={labelClass}>Total Acres *</label>
          <input required type="number" className={inputClass} value={fd?.total_title_acres || ""} onChange={(e) => onChange("total_title_acres", e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="160" />
        </div>
        <div>
          <label className={labelClass}>Cultivated *</label>
          <input required type="number" className={inputClass} value={fd?.cultivated_acres || ""} onChange={(e) => onChange("cultivated_acres", e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="150" />
        </div>
        <div>
          <label className={labelClass}>RM *</label>
          <input required className={inputClass} value={fd?.rm_area || ""} onChange={(e) => onChange("rm_area", e.target.value)} placeholder="RM of..." />
        </div>
        <div>
          <label className={labelClass}>Soil *</label>
          <select required className={inputClass} value={fd?.soil_class || ""} onChange={(e) => onChange("soil_class", e.target.value)}>
            <option value="">Select</option>
            <option value="1">1-Excellent</option>
            <option value="2">2-Good</option>
            <option value="3">3-Average</option>
            <option value="4">4-Fair</option>
            <option value="5">5-Poor</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Crop *</label>
          <input required className={inputClass} value={fd?.crop_type || ""} onChange={(e) => onChange("crop_type", e.target.value)} placeholder="Wheat, Canola" />
        </div>
        <div>
          <label className={labelClass}>Access *</label>
          <select required className={inputClass} value={fd?.access_quality || "good"} onChange={(e) => onChange("access_quality", e.target.value as any)}>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Dist. to City (km) *</label>
          <input required type="number" className={inputClass} value={fd?.distance_to_city_km || ""} onChange={(e) => onChange("distance_to_city_km", e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="25" />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 text-[11px] text-gray-600 cursor-pointer">
            <input type="checkbox" className="h-3 w-3 rounded border-gray-300 text-emerald-600" checked={fd?.is_rented || false} onChange={(e) => onChange("is_rented", e.target.checked)} />
            Rented
          </label>
          <label className="flex items-center gap-1 text-[11px] text-gray-600 cursor-pointer">
            <input type="checkbox" className="h-3 w-3 rounded border-gray-300 text-emerald-600" checked={fd?.irrigation || false} onChange={(e) => onChange("irrigation", e.target.checked)} />
            Irrigation
          </label>
        </div>
        {fd?.is_rented && (
          <div className="col-span-2">
            <label className={labelClass}>Rent ($/ac)</label>
            <input type="number" className={inputClass} value={fd?.annual_rent_per_acre || ""} onChange={(e) => onChange("annual_rent_per_acre", e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="80" />
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}
