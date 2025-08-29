"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, Camera, Image as ImageIcon, Trash2, Star, StarOff, Plus } from "lucide-react";
import { toast } from "react-toastify";

export type CatalogueLot = {
  id: string;
  files: File[];
  coverIndex: number; // 0-based within files
};

type Props = {
  value: CatalogueLot[];
  onChange: (lots: CatalogueLot[]) => void;
  // caps (defaults align with backend today)
  maxImagesPerLot?: number; // default 20
  maxTotalImages?: number; // default 100 (server upload limit)
};

export default function CatalogueSection({ value, onChange, maxImagesPerLot = 20, maxTotalImages = 100 }: Props) {
  const [lots, setLots] = useState<CatalogueLot[]>(value || []);
  const [activeIdx, setActiveIdx] = useState<number>(value?.length ? value.length - 1 : -1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setLots(value || []), [value]);
  useEffect(() => onChange(lots), [lots]);

  const totalImages = useMemo(() => lots.reduce((s, l) => s + l.files.length, 0), [lots]);

  function createLot(openCamera = true) {
    const id = `lot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const nextLots = [...lots, { id, files: [], coverIndex: 0 }];
    setLots(nextLots);
    setActiveIdx(nextLots.length - 1);
    if (openCamera) fileInputRef.current?.click();
  }

  function removeLot(idx: number) {
    const next = lots.filter((_, i) => i !== idx);
    setLots(next);
    if (activeIdx === idx) setActiveIdx(next.length ? next.length - 1 : -1);
  }

  function setCover(idx: number, imgIdx: number) {
    setLots((prev) => prev.map((l, i) => (i === idx ? { ...l, coverIndex: imgIdx } : l)));
  }

  function removeImage(idx: number, imgIdx: number) {
    setLots((prev) => prev.map((l, i) => {
      if (i !== idx) return l;
      const files = l.files.filter((_, j) => j !== imgIdx);
      const coverIndex = Math.max(0, Math.min(files.length - 1, l.coverIndex));
      return { ...l, files, coverIndex };
    }));
  }

  function handleFilesSelected(files: FileList | null) {
    if (files == null || activeIdx < 0) return;
    const incoming = Array.from(files);

    if (incoming.length === 0) return;

    setLots((prev) => {
      const out = [...prev];
      const cur = out[activeIdx];
      if (!cur) return prev;

      const remainingTotal = Math.max(0, maxTotalImages - totalImages);
      const remainingLot = Math.max(0, maxImagesPerLot - cur.files.length);
      const allowed = Math.min(remainingTotal, remainingLot, incoming.length);
      if (allowed < incoming.length) {
        toast.warn(`Only ${allowed} images allowed (caps: ${maxImagesPerLot}/lot, ${maxTotalImages} total).`);
      }
      const toAdd = incoming.slice(0, allowed);
      const filesNew = [...cur.files, ...toAdd];
      out[activeIdx] = { ...cur, files: filesNew };
      return out;
    });
  }

  const activeLot = lots[activeIdx];

  return (
    <div className="space-y-4">
      {/* Summary/header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-gray-900">Lots</div>
          <div className="text-xs text-gray-600">{lots.length} lot(s), {totalImages} image(s) total</div>
        </div>
        <button
          type="button"
          onClick={() => createLot(true)}
          className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-rose-500"
        >
          <Plus className="h-4 w-4" /> Add Lot
        </button>
      </div>

      {/* Hidden camera/file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        onChange={(e) => {
          handleFilesSelected(e.target.files);
          // reset input so selecting same files again still triggers
          e.currentTarget.value = "";
        }}
        className="sr-only"
      />

      {/* Active capture panel */}
      {activeIdx >= 0 && (
        <div className="rounded-lg border border-rose-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-900">Lot #{activeIdx + 1}</div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span>{activeLot?.files.length}/{maxImagesPerLot} images</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              <Camera className="h-4 w-4" /> Add Photos
            </button>
            <button
              type="button"
              onClick={() => createLot(true)}
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Next Lot
            </button>
            <button
              type="button"
              onClick={() => setActiveIdx(-1)}
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Done
            </button>
          </div>

          {activeLot?.files.length ? (
            <div className="mt-3 rounded-md border border-gray-200 p-2">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {activeLot.files.map((file, i) => {
                  const url = URL.createObjectURL(file);
                  const isCover = activeLot.coverIndex === i;
                  return (
                    <div key={i} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={file.name} className="h-24 w-full rounded object-cover" onLoad={() => URL.revokeObjectURL(url)} />
                      <div className="absolute inset-x-1 bottom-1 flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => setCover(activeIdx, i)}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium shadow ${isCover ? "bg-rose-600 text-white" : "bg-black/60 text-white"}`}
                        >
                          {isCover ? "Cover" : "Set cover"}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImage(activeIdx, i)}
                          className="rounded bg-black/60 p-1 text-white"
                          aria-label="Remove image"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-lg border-2 border-dashed border-gray-300 bg-white/50 p-4 text-center">
              <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-700">No images yet</p>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
                >
                  <Upload className="h-4 w-4" /> Capture / Upload
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">PNG, JPG. Up to {maxImagesPerLot} images in this lot.</p>
            </div>
          )}

          <div className="mt-2 text-[11px] text-gray-500">Tip: Click "Next Lot" to continue capturing for a new lot. Use "Done" to finish catalogue capture.</div>
        </div>
      )}

      {/* Lots summary */}
      {lots.length > 0 && (
        <div className="rounded-md border border-gray-200 p-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {lots.map((lot, idx) => {
              const cover = lot.files[lot.coverIndex];
              const coverUrl = cover ? URL.createObjectURL(cover) : undefined;
              return (
                <div key={lot.id} className={`flex items-center gap-3 rounded-md border p-2 ${idx === activeIdx ? "border-rose-300" : "border-gray-200"}`}>
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverUrl} alt={`Lot ${idx + 1}`} className="h-16 w-16 rounded object-cover" onLoad={() => coverUrl && URL.revokeObjectURL(coverUrl)} />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded bg-gray-100 text-gray-400">#{idx + 1}</div>
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">Lot #{idx + 1}</div>
                    <div className="text-xs text-gray-600">{lot.files.length} image(s)</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveIdx(idx)}
                      className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLot(idx)}
                      className="rounded-md border border-red-200 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500">Limits: up to {maxImagesPerLot} images per lot; {maxTotalImages} images total per report.</div>
    </div>
  );
}
