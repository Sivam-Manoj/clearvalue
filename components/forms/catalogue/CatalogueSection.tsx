"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Camera,
  Image as ImageIcon,
  Trash2,
  Plus,
  X,
  Check,
  ZoomIn,
  ZoomOut,
  Zap,
  ZapOff,
  RotateCw,
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
  maxTotalImages?: number; // default 500
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
  // When true, after a manual device upload we should move to the next lot automatically
  const advanceAfterUploadRef = useRef(false);
  // Camera UX controls
  const [zoom, setZoom] = useState<number>(1); // 1x - 5x (digital zoom)
  const [flashOn, setFlashOn] = useState<boolean>(false);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    "portrait"
  );
  const [isTorchSupported, setIsTorchSupported] = useState<boolean>(false);
  const [isSimulatingFlash, setIsSimulatingFlash] = useState<boolean>(false);

  useEffect(() => setLots(value || []), [value]);
  useEffect(() => onChange(lots), [lots]);
  useEffect(() => {
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      if (videoRef.current) (videoRef.current as any).srcObject = null;
    };
  }, []);

  // Re-apply constraints when orientation changes while camera is open
  useEffect(() => {
    if (!cameraOpen) return;
    const stream = videoRef.current?.srcObject as MediaStream | null;
    const track = stream?.getVideoTracks?.()[0] as any;
    try {
      track?.applyConstraints({
        width: { ideal: orientation === "landscape" ? 1920 : 1080 },
        height: { ideal: orientation === "landscape" ? 1080 : 1920 },
        aspectRatio: { ideal: orientation === "landscape" ? 16 / 9 : 9 / 16 },
      });
    } catch {}
  }, [orientation, cameraOpen]);

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
    if (advanceAfterUploadRef.current) {
      // reset the flag and proceed to next lot
      advanceAfterUploadRef.current = false;
      goNextLot();
    }
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
      setZoom(1);
      if (activeIdx < 0) {
        // ensure there is a lot to receive captures
        createLot();
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: orientation === "landscape" ? 1920 : 1080 },
          height: { ideal: orientation === "landscape" ? 1080 : 1920 },
          aspectRatio: { ideal: orientation === "landscape" ? 16 / 9 : 9 / 16 },
        },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream as any;
        await videoRef.current.play().catch(() => {});
      }
      // Detect torch support and apply if flashOn
      try {
        const track = (stream.getVideoTracks?.() || [])[0];
        const caps = (track as any)?.getCapabilities?.() || {};
        const torchSupported = !!caps.torch;
        setIsTorchSupported(torchSupported);
        if (flashOn && torchSupported) {
          await (track as any)?.applyConstraints?.({ advanced: [{ torch: true }] });
        }
      } catch {}
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
    // Target aspect ratio based on orientation (portrait 9:16, landscape 16:9)
    const targetAR = orientation === "portrait" ? 9 / 16 : 16 / 9;
    const videoAR = vw / vh;

    // Determine crop size honoring zoom
    let cropW: number;
    let cropH: number;
    if (videoAR > targetAR) {
      // video is wider than target
      cropH = vh / zoom;
      cropW = cropH * targetAR;
    } else {
      // video is narrower/taller than target
      cropW = vw / zoom;
      cropH = cropW / targetAR;
    }
    const sx = Math.max(0, (vw - cropW) / 2);
    const sy = Math.max(0, (vh - cropH) / 2);

    // Output canvas at 1080p dimensions respecting orientation
    const outW = orientation === "landscape" ? 1920 : 1080;
    const outH = orientation === "landscape" ? 1080 : 1920;
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (flashOn && !isTorchSupported) {
      setIsSimulatingFlash(true);
      setTimeout(() => setIsSimulatingFlash(false), 120);
    }
    ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, outW, outH);
    await new Promise<void>((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve();
          const file = new File(
            [blob],
            `lot-${activeIdx + 1}-${Date.now()}.jpg`,
            {
              type: "image/jpeg",
            }
          );
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
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-rose-100 bg-gradient-to-br from-white to-rose-50/60 p-3 shadow-lg ring-1 ring-black/5">
        <div>
          <div className="text-sm font-medium text-gray-900">Lots</div>
          <div className="text-xs text-gray-600">
            {lots.length} lot(s), {totalImages}/{maxTotalImages} image(s) total
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              createLot();
              startInAppCamera();
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-b from-rose-500 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_0_0_rgba(190,18,60,0.5)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(190,18,60,0.5)] hover:from-rose-400 hover:to-rose-600"
          >
            <Plus className="h-4 w-4" /> Lot from camera
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

          <div className="flex flex-wrap items-center gap-2">
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
                advanceAfterUploadRef.current = true;
                startManualUpload(false);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_0_0_rgba(190,18,60,0.5)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(190,18,60,0.5)] hover:from-rose-400 hover:to-rose-600"
            >
              <ImageIcon className="h-4 w-4" /> Upload & Next
            </button>
            <button
              type="button"
              onClick={() => {
                createLot();
                startInAppCamera();
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_0_0_rgba(190,18,60,0.5)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(190,18,60,0.5)] hover:from-rose-400 hover:to-rose-600"
            >
              Add Lot from camera
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
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
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
              </div>
              <p className="mt-1 text-xs text-gray-500">
                PNG, JPG. Up to {maxImagesPerLot} images in this lot.
              </p>
            </div>
          )}

          <div className="mt-2 text-[11px] text-gray-500">
            Tip: Use "Open Camera" or "Upload from device" to add images. Use
            "Add Lot" to start a new lot. Use "Done" to finish catalogue
            capture.
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
          <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/80 backdrop-blur-sm overflow-hidden p-4 pt-6 sm:pt-8">
            <div className="relative w-full sm:w-[92%] max-w-none sm:max-w-2xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl max-h-[96vh] overflow-y-auto flex flex-col rounded-2xl border border-rose-200/30 bg-black/30 ring-1 ring-black/50 shadow-2xl">
              {/* Sticky top bar so Close is always accessible */}
              <div className="sticky top-0 z-20 flex items-center justify-end gap-2 rounded-t-2xl border-b border-white/10 bg-black/40 p-2 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={stopInAppCamera}
                  className="rounded-full bg-white/90 p-1.5 text-gray-900 shadow hover:bg-white"
                  aria-label="Done"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="relative overflow-hidden">
                <div className="relative w-full h-[72vh] sm:h-[78vh] overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 h-full w-full object-contain"
                    style={
                      zoom > 1
                        ? { transform: `scale(${zoom})`, transformOrigin: "center" }
                        : undefined
                    }
                  />
                  {/* Simulated flash overlay */}
                  {isSimulatingFlash && (
                    <div className="absolute inset-0 bg-white/80 animate-pulse" />
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {cameraError && (
                <div className="m-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                  {cameraError}
                </div>
              )}

              <div className="p-3">
                {/* Top control row: orientation, counters, flash */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-white/90">
                  <button
                    type="button"
                    onClick={() => setOrientation((o) => (o === "portrait" ? "landscape" : "portrait"))}
                    className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 backdrop-blur ring-1 ring-white/20 hover:bg-white/15"
                    title="Toggle orientation"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    <span className="capitalize">{orientation}</span>
                  </button>
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      Total: {totalImages}/{maxTotalImages}
                    </div>
                    <div>
                      Lot {activeIdx + 1}: {lots[activeIdx]?.files.length ?? 0}/{maxImagesPerLot}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setFlashOn((v) => !v);
                      try {
                        const stream = videoRef.current?.srcObject as MediaStream | null;
                        const track = stream?.getVideoTracks?.()[0] as any;
                        if (track?.getCapabilities?.()?.torch) {
                          await track.applyConstraints({ advanced: [{ torch: !flashOn }] });
                          setIsTorchSupported(true);
                        } else {
                          setIsTorchSupported(false);
                        }
                      } catch {}
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 backdrop-blur ring-1 ring-white/20 hover:bg-white/15"
                    title="Flash"
                  >
                    {flashOn ? (
                      <Zap className="h-3.5 w-3.5 text-yellow-300" />
                    ) : (
                      <ZapOff className="h-3.5 w-3.5" />
                    )}
                    <span>{flashOn ? "On" : "Off"}</span>
                  </button>
                </div>

                {/* Zoom control */}
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-white/10 p-2 ring-1 ring-white/20 backdrop-blur">
                  <ZoomOut className="h-4 w-4 text-white/90" />
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="flex-1 min-w-[140px] accent-rose-500"
                  />
                  <ZoomIn className="h-4 w-4 text-white/90" />
                  <div className="ml-2 w-10 text-right text-[11px] text-white/90">{zoom.toFixed(1)}x</div>
                </div>

                <div className="mt-3 flex items-center justify-between">
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

                <div className="mt-4 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={stopInAppCamera}
                    className="group relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-[0_8px_0_0_rgba(190,18,60,0.5)] ring-2 ring-rose-300/60 hover:from-rose-400 hover:to-rose-600 active:translate-y-0.5 active:shadow-[0_4px_0_0_rgba(190,18,60,0.5)] focus:outline-none"
                    aria-label="Done"
                    title="Done"
                  >
                    <Check className="h-7 w-7 sm:h-8 sm:w-8" />
                    <span className="sr-only">Done</span>
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
