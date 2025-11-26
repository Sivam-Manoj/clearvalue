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
        <div className="flex items-center gap-2 p-2 rounded border border-gray-200 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={URL.createObjectURL(mapImage)} alt="Map" className="h-10 w-10 rounded border border-gray-200 object-cover" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 truncate">{mapImage.name}</p>
            <p className="text-[10px] text-gray-500">{(mapImage.size / 1024).toFixed(0)} KB</p>
          </div>
          <button type="button" onClick={onRemoveMapImage} className="rounded-full bg-red-100 p-1 text-red-600 hover:bg-red-200">
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="rounded border-2 border-dashed border-gray-200 bg-gray-50/50 p-3 text-center">
          <MapPin className="mx-auto h-6 w-6 text-gray-400" />
          <p className="text-[11px] text-gray-500 mt-1">Optional location image</p>
          <button type="button" onClick={() => mapInputRef.current?.click()} className="mt-2 inline-flex items-center gap-1 rounded bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800">
            <Upload className="h-3 w-3" /> Select
          </button>
        </div>
      )}
    </CollapsibleSection>
  );
}
