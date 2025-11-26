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
        <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-300/80 bg-gradient-to-b from-gray-50 via-white to-gray-100 shadow-[inset_0_3px_6px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.08)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={URL.createObjectURL(mapImage)} alt="Map" className="h-14 w-14 rounded-lg border-2 border-gray-200 object-cover shadow-[0_2px_6px_rgba(0,0,0,0.15)]" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 truncate">{mapImage.name}</p>
            <p className="text-[10px] text-gray-500">{(mapImage.size / 1024).toFixed(0)} KB</p>
          </div>
          <button type="button" onClick={onRemoveMapImage} className="rounded-full bg-gradient-to-b from-red-100 via-red-150 to-red-200 p-2 text-red-600 shadow-[0_2px_4px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.8)] hover:from-red-200 hover:to-red-300 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] transition-all cursor-pointer border border-red-200">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gradient-to-b from-gray-50 via-white to-gray-100 p-5 text-center shadow-[inset_0_4px_8px_rgba(0,0,0,0.04)]">
          <MapPin className="mx-auto h-7 w-7 text-gray-400 drop-shadow-sm" />
          <p className="text-[11px] text-gray-500 mt-1.5 font-medium">Optional location image</p>
          <button type="button" onClick={() => mapInputRef.current?.click()} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900 px-4 py-2 text-xs font-semibold text-white shadow-[0_4px_6px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.15),inset_0_-1px_0_rgba(0,0,0,0.2)] hover:from-gray-600 hover:via-gray-700 hover:to-gray-800 active:shadow-[inset_0_3px_6px_rgba(0,0,0,0.3)] transition-all cursor-pointer border border-gray-600">
            <Upload className="h-3.5 w-3.5" /> Select
          </button>
        </div>
      )}
    </CollapsibleSection>
  );
}
