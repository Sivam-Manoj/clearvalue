"use client";

import { useRef } from "react";
import { MapPin, Upload, X } from "lucide-react";
import CollapsibleSection from "./CollapsibleSection";

interface MapUploadSectionProps {
  mapImage: File | null;
  onMapImageChange: (files: FileList | null) => void;
  onRemoveMapImage: () => void;
}

export default function MapUploadSection({
  mapImage,
  onMapImageChange,
  onRemoveMapImage,
}: MapUploadSectionProps) {
  const mapInputRef = useRef<HTMLInputElement>(null);

  return (
    <CollapsibleSection title="Map Image" icon={<MapPin className="text-rose-600" />} filledCount={mapImage ? 1 : 0} totalCount={1}>
      <input ref={mapInputRef} type="file" accept="image/*" onChange={(e) => onMapImageChange(e.target.files)} className="sr-only" />

      {mapImage ? (
        <div className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-300 bg-gradient-to-b from-white to-gray-50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={URL.createObjectURL(mapImage)} alt="Map" className="h-12 w-12 rounded-lg border border-gray-200 object-cover shadow-sm" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 truncate">{mapImage.name}</p>
            <p className="text-[10px] text-gray-500">{(mapImage.size / 1024).toFixed(0)} KB</p>
          </div>
          <button type="button" onClick={onRemoveMapImage} className="rounded-full bg-gradient-to-b from-red-100 to-red-200 p-1.5 text-red-600 hover:from-red-200 hover:to-red-300 shadow-sm transition-all cursor-pointer">
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gradient-to-b from-gray-50/50 to-gray-100/30 p-4 text-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
          <MapPin className="mx-auto h-6 w-6 text-gray-400 drop-shadow-sm" />
          <p className="text-[11px] text-gray-500 mt-1">Optional location image</p>
          <button type="button" onClick={() => mapInputRef.current?.click()} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-gradient-to-b from-gray-800 to-gray-900 px-3 py-1.5 text-xs font-medium text-white shadow-[0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] hover:from-gray-700 hover:to-gray-800 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] transition-all cursor-pointer">
            <Upload className="h-3 w-3" /> Select
          </button>
        </div>
      )}
    </CollapsibleSection>
  );
}
