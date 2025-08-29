"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Camera,
  Image as ImageIcon,
  Trash2,
  Plus,
  X,
} from "lucide-react";
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

export default function CatalogueSection({
  value,
  onChange,
  maxImagesPerLot = 20,
  maxTotalImages = 500,
}: Props) {
  const [lots, setLots] = useState<CatalogueLot[]>(value || []);
  const [activeIdx, setActiveIdx] = useState<number>(
    value?.length ? value.length - 1 : -1
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => setLots(value || []), [value]);
  useEffect(() => onChange(lots), [lots]);
  useEffect(() => {
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      if (videoRef.current) (videoRef.current as any).srcObject = null;
    };
  }, []);

  const totalImages = useMemo(
    () => lots.reduce((s, l) => s + l.files.length, 0),
    [lots]
  );

  function createLot() {
    const id = `lot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const nextLots = [...lots, { id, files: [], coverIndex: 0 }];
    setLots(nextLots);
    setActiveIdx(nextLots.length - 1);
    // do not trigger native file input anymore; in-app camera will be used
  }

  function removeLot(idx: number) {
    const next = lots.filter((_, i) => i !== idx);
    setLots(next);
    if (activeIdx === idx) setActiveIdx(next.length ? next.length - 1 : -1);
  }

  function setCover(idx: number, imgIdx: number) {
    setLots((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, coverIndex: imgIdx } : l))
    );
  }

  function removeImage(idx: number, imgIdx: number) {
    setLots((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        const files = l.files.filter((_, j) => j !== imgIdx);
        const coverIndex = Math.max(
          0,
          Math.min(files.length - 1, l.coverIndex)
        );
        return { ...l, files, coverIndex };
      })
    );
  }

  function appendToActiveLot(newFiles: File[]) {
    if (activeIdx < 0 || newFiles.length === 0) return;
    setLots((prev) => {
      const out = [...prev];
      const cur = out[activeIdx];
      if (!cur) return prev;
      const prevTotal = prev.reduce((s, l) => s + l.files.length, 0);
      const remainingTotal = Math.max(0, maxTotalImages - prevTotal);
      const remainingLot = Math.max(0, maxImagesPerLot - cur.files.length);
      const allowed = Math.min(remainingTotal, remainingLot, newFiles.length);
      if (allowed <= 0) {
        toast.warn(
          `Limit reached (caps: ${maxImagesPerLot}/lot, ${maxTotalImages} total).`
        );
        return prev;
      }
      if (allowed < newFiles.length) {
        toast.warn(
          `Only ${allowed} images allowed (caps: ${maxImagesPerLot}/lot, ${maxTotalImages} total).`
        );
      }
      const toAdd = newFiles.slice(0, allowed);
      out[activeIdx] = { ...cur, files: [...cur.files, ...toAdd] };
      return out;
    });
  }

  function handleFilesSelected(files: FileList | null) {
    if (files == null) return;
    const incoming = Array.from(files);
    appendToActiveLot(incoming);
  }

  function startManualUpload(createIfNone: boolean = true) {
    if (createIfNone && activeIdx < 0) {
      // Create a lot first so uploads have a destination
      createLot();
      // Defer click so state updates before selection dialog returns
      setTimeout(() => fileInputRef.current?.click(), 0);
      return;
    }
    fileInputRef.current?.click();
  }

  async function startInAppCamera() {
    try {
      setCameraError(null);
      setCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream as any;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      setCameraError(
        err?.message || "Unable to access camera. Using file capture instead."
      );
      setCameraOpen(false);
      setTimeout(() => fileInputRef.current?.click(), 50);
    }
  }

  function stopInAppCamera() {
    try {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      if (videoRef.current) (videoRef.current as any).srcObject = null;
    } finally {
      setCameraOpen(false);
    }
  }

  async function captureFromStream() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    // Respect caps before drawing
    const cur = lots[activeIdx];
    if (!cur) return;
    const totalCount = lots.reduce((s, l) => s + l.files.length, 0);
    if (cur.files.length >= maxImagesPerLot || totalCount >= maxTotalImages) {
      toast.warn(
        `Limit reached (caps: ${maxImagesPerLot}/lot, ${maxTotalImages} total).`
      );
      return;
    }
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, vw, vh);
    await new Promise<void>((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve();
          const file = new File([blob], `lot-${activeIdx + 1}-${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          appendToActiveLot([file]);
          resolve();
        },
        "image/jpeg",
        0.92
      );
    });
  }

  function goPrevLot() {
    setActiveIdx((i) => Math.max(0, i - 1));
  }

  function goNextLot() {
    if (activeIdx >= lots.length - 1) {
      createLot();
    } else {
      setActiveIdx((i) => Math.min(i + 1, lots.length - 1));
    }
  }

  const activeLot = lots[activeIdx];

  return (
    <div className="space-y-4">
      {/* Summary/header */}
      <div className="flex items-center justify-between rounded-2xl border border-rose-100 bg-gradient-to-br from-white to-rose-50/60 p-3 shadow-lg ring-1 ring-black/5">
        <div>
          <div className="text-sm font-medium text-gray-900">Lots</div>
          <div className="text-xs text-gray-600">
            {lots.length} lot(s), {totalImages} image(s) total
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              createLot();
              startInAppCamera();
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-b from-rose-500 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_0_0_rgba(190,18,60,0.5)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(190,18,60,0.5)] hover:from-rose-400 hover:to-rose-600"
          >
            <Plus className="h-4 w-4" /> Add Lot Camera
          </button>
          <button
            type="button"
            onClick={() => startManualUpload(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-b from-rose-500 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_0_0_rgba(190,18,60,0.5)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(190,18,60,0.5)] hover:from-rose-400 hover:to-rose-600"
          >
            <ImageIcon className="h-4 w-4" /> Upload from device
          </button>
        </div>
      </div>

      {/* Hidden camera/file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          handleFilesSelected(e.target.files);
          // reset input so selecting same files again still triggers
          e.currentTarget.value = "";
        }}
        className="sr-only"
      />

      {/* Active capture panel */}
      {activeIdx >= 0 && (
        <div className="rounded-2xl border border-rose-100 bg-white/80 p-3 shadow-xl ring-1 ring-black/5 backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-900">
              Lot #{activeIdx + 1}
            </div>
            <div className="text-xs text-gray-600">
              {activeLot?.files.length}/{maxImagesPerLot} images
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startInAppCamera}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_0_0_rgba(190,18,60,0.5)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(190,18,60,0.5)] hover:from-rose-400 hover:to-rose-600"
            >
              <Camera className="h-4 w-4" /> Open Camera
            </button>
            <button
              type="button"
              onClick={() => startManualUpload(false)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_0_0_rgba(190,18,60,0.5)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(190,18,60,0.5)] hover:from-rose-400 hover:to-rose-600"
            >
              <ImageIcon className="h-4 w-4" /> Upload from device
            </button>
            <button
              type="button"
              onClick={() => {
                createLot();
                startInAppCamera();
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_0_0_rgba(190,18,60,0.5)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(190,18,60,0.5)] hover:from-rose-400 hover:to-rose-600"
            >
              Add Lot
            </button>
            <button
              type="button"
              onClick={() => setActiveIdx(-1)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_0_0_rgba(190,18,60,0.5)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(190,18,60,0.5)] hover:from-rose-400 hover:to-rose-600"
            >
              Done
            </button>
          </div>

          {activeLot?.files.length ? (
            <div className="mt-3 rounded-2xl border border-gray-200/70 bg-white/70 p-2 shadow ring-1 ring-black/5 backdrop-blur">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {activeLot.files.map((file, i) => {
                  const url = URL.createObjectURL(file);
                  const isCover = i === activeLot.coverIndex;
                  return (
                    <div
                      key={i}
                      className="relative group overflow-hidden rounded-xl shadow-md transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-xl"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={file.name}
                        className="h-28 w-full object-cover"
                        onLoad={() => URL.revokeObjectURL(url)}
                      />
                      <div className="absolute inset-x-1 bottom-1 flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => setCover(activeIdx, i)}
                          className={`rounded-md px-2 py-1 text-[10px] font-semibold shadow-lg backdrop-blur-sm ${
                            isCover
                              ? "bg-rose-600/90 text-white"
                              : "bg-black/50 text-white"
                          }`}
                        >
                          {isCover ? "Cover" : "Set cover"}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImage(activeIdx, i)}
                          className="rounded-full bg-black/60 p-1.5 text-white shadow-lg hover:bg-black/70 transition"
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
            <div className="mt-3 rounded-2xl border-2 border-dashed border-gray-300/70 bg-gradient-to-br from-white/70 to-gray-50/50 p-5 text-center backdrop-blur shadow-inner">
              <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-700">No images yet</p>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={startInAppCamera}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_0_0_rgba(190,18,60,0.5)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(190,18,60,0.5)] hover:from-rose-400 hover:to-rose-600"
                >
                  <Camera className="h-4 w-4" /> Open Camera
                </button>
                <button
                  type="button"
                  onClick={() => startManualUpload(false)}
                  className="ml-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_0_0_rgba(190,18,60,0.5)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(190,18,60,0.5)] hover:from-rose-400 hover:to-rose-600"
                >
                  <ImageIcon className="h-4 w-4" /> Upload from device
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                PNG, JPG. Up to {maxImagesPerLot} images in this lot.
              </p>
            </div>
          )}

          <div className="mt-2 text-[11px] text-gray-500">
            Tip: Use "Open Camera" or "Upload from device" to add images.
            Use "Add Lot" to start a new lot. Use "Done" to finish catalogue capture.
          </div>
        </div>
      )}

      {/* Lots summary */}
      {lots.length > 0 && (
        <div className="rounded-2xl border border-gray-200/70 bg-white/70 p-3 shadow ring-1 ring-black/5 backdrop-blur">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {lots.map((lot, idx) => {
              const cover = lot.files[lot.coverIndex];
              const coverUrl = cover ? URL.createObjectURL(cover) : undefined;
              return (
                <div
                  key={lot.id}
                  className={`flex items-center gap-3 rounded-xl border p-2 bg-white/80 shadow-sm transition active:translate-y-0.5 ${
                    idx === activeIdx ? "border-rose-300" : "border-gray-200"
                  } hover:shadow-md`}
                >
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverUrl}
                      alt={`Lot ${idx + 1}`}
                      className="h-16 w-16 rounded-xl object-cover shadow"
                      onLoad={() => coverUrl && URL.revokeObjectURL(coverUrl)}
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-100 text-gray-400 shadow-inner">
                      #{idx + 1}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      Lot #{idx + 1}
                    </div>
                    <div className="text-xs text-gray-600">
                      {lot.files.length} image(s)
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveIdx(idx)}
                      className="rounded-lg border border-gray-200 bg-white/80 px-2.5 py-1.5 text-xs text-gray-700 shadow hover:bg-white transition"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLot(idx)}
                      className="rounded-lg border border-red-200 bg-white/80 px-2.5 py-1.5 text-xs text-red-600 shadow hover:bg-red-50 transition"
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
      <div className="text-xs text-gray-500">
        Limits: up to {maxImagesPerLot} images per lot; {maxTotalImages} images
        total per report.
      </div>

      {/* In-app camera overlay */}
      {cameraOpen &&
        createPortal(
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto p-4">
            <div className="relative w-[94%] max-w-sm max-h-[96vh] overflow-y-auto flex flex-col rounded-2xl border border-rose-200/30 bg-black/30 ring-1 ring-black/50 shadow-2xl">
              <button
                type="button"
                onClick={stopInAppCamera}
                className="absolute right-2 top-2 z-10 rounded-full bg-white/90 p-1.5 text-gray-900 shadow hover:bg-white"
                aria-label="Done"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="overflow-hidden rounded-t-2xl">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="block h-auto w-full aspect-[3/4] object-cover pointer-events-none"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {cameraError && (
                <div className="m-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                  {cameraError}
                </div>
              )}

              <div className="p-3">
                <div className="flex items-center justify-between text-[12px] text-white/90">
                  <div className="font-medium">Lot #{activeIdx + 1}</div>
                  <div>
                    {(lots[activeIdx]?.files.length ?? 0)}/{maxImagesPerLot} images
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={goPrevLot}
                    disabled={activeIdx <= 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-[0_4px_0_0_rgba(190,18,60,0.5)] active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(190,18,60,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Prev Lot
                  </button>

                  <button
                    type="button"
                    onClick={captureFromStream}
                    className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-xl active:scale-95"
                    aria-label="Capture photo"
                  >
                    <span className="absolute inset-1 rounded-full border-4 border-black/30"></span>
                  </button>

                  <button
                    type="button"
                    onClick={goNextLot}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-[0_4px_0_0_rgba(190,18,60,0.5)] active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(190,18,60,0.5)]"
                  >
                    Next Lot
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={stopInAppCamera}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_0_0_rgba(190,18,60,0.5)] active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(190,18,60,0.5)] hover:from-rose-400 hover:to-rose-600"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
