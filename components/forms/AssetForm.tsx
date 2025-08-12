"use client";

import { useEffect, useRef, useState } from "react";
import { AssetService, type AssetCreateDetails, type AssetGroupingMode } from "@/services/asset";
import { X, Upload } from "lucide-react";
import { toast } from "react-toastify";

type Props = {
  onSuccess?: (message?: string) => void;
  onCancel?: () => void;
};

const GROUPING_OPTIONS: { value: AssetGroupingMode; label: string; desc: string }[] = [
  {
    value: "single_lot",
    label: "Single Lot",
    desc: "All images are treated as one lot.",
  },
  {
    value: "per_item",
    label: "Per Item (AI groups)",
    desc: "AI groups the same item across photos into one lot.",
  },
  {
    value: "per_photo",
    label: "Per Photo",
    desc: "Each photo becomes its own lot.",
  },
];

export default function AssetForm({ onSuccess, onCancel }: Props) {
  const [grouping, setGrouping] = useState<AssetGroupingMode>("single_lot");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImagesChange(files: FileList | null) {
    if (!files) return;
    const incoming = Array.from(files);
    setImages((prev) => {
      const combined = [...prev, ...incoming];
      const trimmed = combined.slice(0, 10);
      if (combined.length > 10) {
        setError("You can upload up to 10 images. Extra files were ignored.");
        toast.warn("You can upload up to 10 images. Extra files were ignored.");
      } else {
        setError(null);
      }
      return trimmed;
    });
  }

  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [images]);

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (images.length === 0) {
      const msg = "Please add at least one image.";
      setError(msg);
      toast.error(msg);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload: AssetCreateDetails = { grouping_mode: grouping };
      const res = await AssetService.create(payload, images);

      toast.success(res?.message || "Asset report created");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("cv:report-created"));
      }
      onSuccess?.(res?.message);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to create asset report";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div>
      )}

      {/* Grouping */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900">Grouping Mode</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {GROUPING_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`relative flex cursor-pointer items-start gap-3 rounded-lg border p-3 shadow-sm transition hover:shadow ${
                grouping === opt.value ? "border-rose-300 ring-1 ring-rose-300 bg-white" : "border-gray-200 bg-white"
              }`}
            >
              <input
                type="radio"
                name="grouping"
                value={opt.value}
                checked={grouping === opt.value}
                onChange={() => setGrouping(opt.value)}
                className="mt-1 h-4 w-4 text-rose-600 focus:ring-rose-500"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                <div className="text-xs text-gray-600">{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Images */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900">Images (max 10)</h3>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleImagesChange(e.target.files)}
          className="sr-only"
        />
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white/50 p-4 text-center">
          <Upload className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-700">Add images</p>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white shadow hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
            >
              <Upload className="h-4 w-4" />
              Select Images
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">PNG, JPG. Up to 10 images.</p>
        </div>
        <p className="text-xs text-gray-500">Selected: {images.length} file(s)</p>
        {images.length > 0 && (
          <div className="rounded-md border border-gray-200 p-2">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {previews.map((src, idx) => (
                <div key={idx} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={images[idx]?.name || `image-${idx + 1}`}
                    className="h-24 w-full rounded object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={() => removeImage(idx)}
                    className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white shadow"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-rose-500 disabled:opacity-50"
          disabled={submitting}
        >
          {submitting ? "Creating..." : "Create Report"}
        </button>
      </div>
    </form>
  );
}
