"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import {
  Plus,
  Trash2,
  Camera,
  Upload,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Zap,
  ZapOff,
  Check,
} from "lucide-react";

export type MixedMode = "single_lot" | "per_item" | "per_photo";
export type MixedLot = {
  id: string;
  files: File[];
  coverIndex: number; // 0-based within files
  mode?: MixedMode;
};

type Props = {
  value: MixedLot[];
  onChange: (lots: MixedLot[]) => void;
  maxImagesPerLot?: number; // default 20
  maxTotalImages?: number; // default 500
};

export default function MixedSection({
  value,
  onChange,
  maxImagesPerLot = 20,
  maxTotalImages = 500,
}: Props) {
  const [lots, setLots] = useState<MixedLot[]>(value || []);
  const [activeIdx, setActiveIdx] = useState<number>(
    value?.length ? value.length - 1 : -1
  );

  // Camera overlay state
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [flashOn, setFlashOn] = useState<boolean>(false);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    "portrait"
  );
  const [isTorchSupported, setIsTorchSupported] = useState<boolean>(false);
  const [isSimulatingFlash, setIsSimulatingFlash] = useState<boolean>(false);
  const [videoAR, setVideoAR] = useState<number | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setLots(value || []), [value]);
  useEffect(() => onChange(lots), [lots]);

  // Removed: no re-applying constraints or zoom reset on orientation change; UI only adapts

  // Auto-detect device/viewport orientation while camera is open
  useEffect(() => {
    if (!cameraOpen) return;
    if (typeof window === "undefined") return;
    // Prefer Media Query orientation
    const mql = window.matchMedia("(orientation: landscape)");
    const apply = () => setOrientation(mql.matches ? "landscape" : "portrait");
    apply();
    const handler = (e: MediaQueryListEvent | MediaQueryList) =>
      setOrientation((e as MediaQueryList).matches ? "landscape" : "portrait");
    try {
      mql.addEventListener("change", handler as any);
    } catch {
      // Safari
      // @ts-ignore
      mql.addListener(handler as any);
    }
    // Fallback to window resize heuristic
    const onResize = () => {
      try {
        const isLandscape = window.innerWidth >= window.innerHeight;
        setOrientation(isLandscape ? "landscape" : "portrait");
      } catch {}
    };
    window.addEventListener("resize", onResize);
    return () => {
      try {
        mql.removeEventListener("change", handler as any);
      } catch {
        // @ts-ignore
        mql.removeListener(handler as any);
      }
      window.removeEventListener("resize", onResize);
    };
  }, [cameraOpen]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      try {
        const stream = videoRef.current?.srcObject as MediaStream | null;
        stream?.getTracks()?.forEach((t) => t.stop());
        if (videoRef.current) (videoRef.current as any).srcObject = null;
      } catch {}
    };
  }, []);

  function createLot() {
    const id = `lot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const next: MixedLot[] = [...lots, { id, files: [], coverIndex: 0 }];
    setLots(next);
    setActiveIdx(next.length - 1);
  }

  function removeLot(idx: number) {
    const next = lots.filter((_, i) => i !== idx);
    setLots(next);
    if (activeIdx >= next.length) setActiveIdx(next.length - 1);
  }

  function setLotMode(idx: number, mode: MixedMode) {
    setLots((prev) => {
      const out = [...prev];
      const lot = out[idx];
      if (!lot) return prev;
      if (lot.mode && lot.mode !== mode && lot.files.length > 0) {
        toast.warn("Cannot change mode after images are added to this lot.");
        return prev;
      }
      out[idx] = { ...lot, mode };
      return out;
    });
  }

  function addFilesToLot(idx: number, incoming: File[]) {
    setLots((prev) => {
      const out = [...prev];
      const lot = out[idx];
      if (!lot) return prev;
      if (!lot.mode) {
        toast.warn("Select a mode for this lot first.");
        return prev;
      }
      const totalSoFar = prev.reduce((s, l) => s + l.files.length, 0);
      const remainingTotal = Math.max(0, maxTotalImages - totalSoFar);
      if (remainingTotal <= 0) {
        toast.error("Reached maximum total images limit.");
        return prev;
      }
      const roomInLot = Math.max(0, maxImagesPerLot - lot.files.length);
      if (roomInLot <= 0) {
        toast.error(`This lot already has ${maxImagesPerLot} images.`);
        return prev;
      }
      const allowedCount = Math.min(remainingTotal, roomInLot, incoming.length);
      const accepted = incoming.slice(0, allowedCount);
      if (accepted.length < incoming.length) {
        toast.warn("Some images were not added due to limits.");
      }
      out[idx] = { ...lot, files: [...lot.files, ...accepted] };
      return out;
    });
  }

  // Add files and set mode in one atomic update when capturing via camera
  function addFilesToLotWithMode(
    idx: number,
    incoming: File[],
    selectedMode?: MixedMode
  ) {
    setLots((prev) => {
      const out = [...prev];
      const lot = out[idx];
      if (!lot) return prev;
      // If no mode set yet and a desiredMode was provided, set it now
      let mode = lot.mode;
      if (!mode && selectedMode) {
        mode = selectedMode;
        out[idx] = { ...lot, mode: selectedMode };
      }
      if (!mode) {
        toast.warn("Select a mode for this lot first.");
        return prev;
      }
      const totalSoFar = prev.reduce((s, l) => s + l.files.length, 0);
      const remainingTotal = Math.max(0, maxTotalImages - totalSoFar);
      if (remainingTotal <= 0) {
        toast.error("Reached maximum total images limit.");
        return prev;
      }
      const current = out[idx];
      const roomInLot = Math.max(0, maxImagesPerLot - current.files.length);
      if (roomInLot <= 0) {
        toast.error(`This lot already has ${maxImagesPerLot} images.`);
        return prev;
      }
      const allowedCount = Math.min(remainingTotal, roomInLot, incoming.length);
      const accepted = incoming.slice(0, allowedCount);
      if (accepted.length < incoming.length) {
        toast.warn("Some images were not added due to limits.");
      }
      out[idx] = { ...current, files: [...current.files, ...accepted] };
      return out;
    });
  }

  function removeImage(idx: number, imgIdx: number) {
    setLots((prev) => {
      const out = [...prev];
      const lot = out[idx];
      if (!lot) return prev;
      const files = lot.files.filter((_, i) => i !== imgIdx);
      const coverIndex = Math.max(
        0,
        Math.min(files.length - 1, lot.coverIndex)
      );
      out[idx] = { ...lot, files, coverIndex };
      return out;
    });
  }

  function setCover(idx: number, imgIdx: number) {
    setLots((prev) => {
      const out = [...prev];
      const lot = out[idx];
      if (!lot) return prev;
      out[idx] = { ...lot, coverIndex: imgIdx };
      return out;
    });
  }

  // Manual upload
  function onManualUpload(files: FileList | null) {
    if (activeIdx < 0) createLot();
    if (!files) return;
    const incoming = Array.from(files);
    addFilesToLot(activeIdx < 0 ? 0 : activeIdx, incoming);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Camera overlay logic
  async function openCamera() {
    try {
      setCameraError(null);
      setZoom(1);
      // Open overlay first so the <video> element mounts
      setCameraOpen(true);
      // Wait a tick to ensure portal mounts and ref is available
      await new Promise((r) => setTimeout(r, 0));
      // Determine current device orientation and sync state before requesting media
      try {
        const isLandscape =
          typeof window !== "undefined" &&
          window.matchMedia &&
          window.matchMedia("(orientation: landscape)").matches;
        setOrientation(isLandscape ? "landscape" : "portrait");
      } catch {}
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(orientation: landscape)").matches) ? 1920 : 1080 },
          height: { ideal: (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(orientation: landscape)").matches) ? 1080 : 1920 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream as any;
        await videoRef.current.play().catch(() => {});
      }
      // Torch/zoom capabilities
      try {
        const track = (stream.getVideoTracks?.() || [])[0] as any;
        const caps = track?.getCapabilities?.() || {};
        const torchSupported = !!caps?.torch;
        setIsTorchSupported(torchSupported);
        // Reset lens zoom to 1x if supported
        const zoomSupported =
          typeof (caps as any).zoom !== "undefined" ||
          typeof (caps as any)?.zoom?.min !== "undefined";
        if (zoomSupported) {
          await track?.applyConstraints?.({ advanced: [{ zoom: 1 }] });
        }
        if (flashOn && torchSupported) {
          await track?.applyConstraints?.({ advanced: [{ torch: true }] });
        }
      } catch {}

      // After camera is running, ensure destination lot: if none, create; if exists, advance to next
      if (activeIdx < 0) {
        createLot();
      } else {
        goNextLot();
      }
    } catch (e: any) {
      setCameraError(e?.message || "Unable to access camera.");
      toast.error(e?.message || "Unable to access camera.");
      // Ensure overlay is closed and stream cleared on failure
      closeCamera();
    }
  }

  function closeCamera() {
    setCameraOpen(false);
    try {
      const tracks = streamRef.current?.getTracks();
      tracks?.forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) (videoRef.current as any).srcObject = null;
    } catch {}
  }

  // Audio helpers for shutter
  function ensureAudioContext(): AudioContext | null {
    try {
      if (!audioCtxRef.current) {
        const Ctx: any =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return null;
        audioCtxRef.current = new Ctx();
      }
      audioCtxRef.current?.resume?.();
      return audioCtxRef.current;
    } catch {
      return null;
    }
  }
  function playShutterClick() {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.type = "square";
    osc1.frequency.setValueAtTime(900, now);
    g1.gain.setValueAtTime(0, now);
    g1.gain.linearRampToValueAtTime(0.28, now + 0.01);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc1.connect(g1);
    g1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.08);
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(600, now + 0.06);
    g2.gain.setValueAtTime(0, now + 0.06);
    g2.gain.linearRampToValueAtTime(0.22, now + 0.08);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc2.connect(g2);
    g2.connect(ctx.destination);
    osc2.start(now + 0.06);
    osc2.stop(now + 0.16);
  }

  async function captureFromStream(selectedMode?: MixedMode) {
    const idx = activeIdx < 0 ? 0 : activeIdx;
    const lot = lots[idx];
    if (!lot) return;
    const totalSoFar = lots.reduce((s, l) => s + l.files.length, 0);
    if (lot.files.length >= maxImagesPerLot || totalSoFar >= maxTotalImages) {
      toast.warn(
        `Limit reached (caps: ${maxImagesPerLot}/lot, ${maxTotalImages} total).`
      );
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    // Capture full frame; only crop when zoom > 1 to simulate digital zoom
    const cropW = vw / (zoom > 1 ? zoom : 1);
    const cropH = vh / (zoom > 1 ? zoom : 1);
    const sx = Math.max(0, (vw - cropW) / 2);
    const sy = Math.max(0, (vh - cropH) / 2);
    const outW = vw;
    const outH = vh;
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    try {
      navigator.vibrate?.(30);
    } catch {}
    try {
      playShutterClick();
    } catch {}
    if (flashOn && !isTorchSupported) {
      setIsSimulatingFlash(true);
      setTimeout(() => setIsSimulatingFlash(false), 120);
    }
    ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, outW, outH);
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92)
    );
    if (!blob) return;
    const file = new File([blob], `lot-${idx + 1}-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    addFilesToLotWithMode(idx, [file], selectedMode);
  }

  function goPrevLot() {
    setActiveIdx((i) => Math.max(0, i - 1));
  }
  function goNextLot() {
    setLots((prev) => {
      if (activeIdx >= prev.length - 1) {
        const id = `lot-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}`;
        const next = [...prev, { id, files: [], coverIndex: 0 } as MixedLot];
        setActiveIdx(next.length - 1);
        return next;
      } else {
        const nextIdx = Math.min(activeIdx + 1, prev.length - 1);
        setActiveIdx(nextIdx);
        return prev;
      }
    });
  }

  function handleCapture(mode: MixedMode) {
    const idx = activeIdx < 0 ? 0 : activeIdx;
    const lot = lots[idx];
    if (!lot) return;
    if (lot.mode && lot.mode !== mode) {
      toast.warn(
        `This lot is already set to ${lot.mode.replace(
          "_",
          " "
        )}. Go to next lot to capture a different mode.`
      );
      return;
    }
    captureFromStream(mode);
  }

  const totalImages = lots.reduce((s, l) => s + l.files.length, 0);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-gray-900 to-black px-3 py-2 text-sm font-semibold text-white shadow"
          onClick={createLot}
        >
          <Plus className="h-4 w-4" /> New Lot
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 px-3 py-2 text-sm font-semibold text-white shadow"
          onClick={openCamera}
        >
          <Camera className="h-4 w-4" /> Open Camera
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-gray-800 border border-gray-200 shadow"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4" /> Manual Upload
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => onManualUpload(e.target.files)}
        />
        <div className="ml-auto text-xs text-gray-600">
          Total: {totalImages} image(s)
        </div>
      </div>

      {/* Lots selector */}
      {lots.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {lots.map((lot, i) => (
              <button
                key={lot.id}
                type="button"
                onClick={() => setActiveIdx(i)}
                className={`rounded-xl border px-3 py-2 text-xs shadow min-w-[120px] text-left ${
                  i === activeIdx
                    ? "border-rose-300 bg-rose-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="font-semibold">Lot {i + 1}</div>
                <div className="text-[11px] text-gray-600">
                  {lot.mode ? lot.mode.replace("_", " ") : "Select mode"}
                </div>
                <div className="text-[11px] text-gray-600">
                  {lot.files.length} image(s)
                </div>
              </button>
            ))}
          </div>

          {/* Active lot panel */}
          {activeIdx >= 0 && lots[activeIdx] && (
            <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-gray-900">
                  Lot {activeIdx + 1}
                </div>
                <button
                  type="button"
                  onClick={() => removeLot(activeIdx)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" /> Remove Lot
                </button>
              </div>

              {/* Mode selection */}
              <div className="mt-3 flex flex-wrap gap-2">
                {(["single_lot", "per_item", "per_photo"] as MixedMode[]).map(
                  (m) => {
                    const sel = lots[activeIdx]?.mode;
                    const disabled =
                      !!sel &&
                      sel !== m &&
                      (lots[activeIdx]?.files.length ?? 0) > 0;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setLotMode(activeIdx, m)}
                        disabled={disabled}
                        className={`rounded-xl border px-3 py-1.5 text-xs shadow ${
                          sel === m
                            ? "border-rose-300 bg-rose-50"
                            : "border-gray-200 bg-white"
                        } ${disabled ? "opacity-60" : ""}`}
                      >
                        {m === "single_lot"
                          ? "Bundle"
                          : m === "per_item"
                          ? "Per Item"
                          : "Per Photo"}
                      </button>
                    );
                  }
                )}
              </div>

              {/* Images grid */}
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {lots[activeIdx].files.map((f, i) => {
                  const url = URL.createObjectURL(f);
                  const isCover = lots[activeIdx].coverIndex === i;
                  return (
                    <div
                      key={i}
                      className="relative group rounded-xl overflow-hidden border border-gray-200"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={f.name}
                        className="h-28 w-full object-cover"
                        onLoad={() => URL.revokeObjectURL(url)}
                      />
                      {isCover && (
                        <div className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white shadow">
                          Cover
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-1 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition">
                        <button
                          type="button"
                          className="rounded bg-white/90 px-2 py-0.5 text-[10px] shadow"
                          onClick={() => setCover(activeIdx, i)}
                        >
                          Set Cover
                        </button>
                        <button
                          type="button"
                          className="rounded bg-white/90 px-2 py-0.5 text-[10px] shadow text-red-600"
                          onClick={() => removeImage(activeIdx, i)}
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
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-gray-300/70 bg-gradient-to-br from-white/70 to-gray-50/50 p-5 text-center backdrop-blur shadow-inner">
          <div className="mb-2 text-sm text-gray-700">
            Create your first lot
          </div>
          <button
            type="button"
            onClick={createLot}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-gray-900 to-black px-4 py-2.5 text-sm font-semibold text-white shadow"
          >
            <Plus className="h-4 w-4" /> New Lot
          </button>
        </div>
      )}

      {/* Camera Overlay (portal) */}
      {cameraOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-sm overflow-hidden touch-none overscroll-contain select-none"
            style={{
              paddingTop: "max(env(safe-area-inset-top), 8px)",
              paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
              paddingLeft: "max(env(safe-area-inset-left), 8px)",
              paddingRight: "max(env(safe-area-inset-right), 8px)",
            }}
          >
            <div className="relative w-full sm:w-[98%] max-w-none sm:max-w-2xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl h-full max-h-full overflow-hidden flex flex-col rounded-none sm:rounded-2xl border-0 sm:border border-rose-200/30 bg-black/30 ring-0 sm:ring-1 ring-black/50 shadow-2xl">
              <div className="relative flex-1 min-h-0 bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={() => {
                    const v = videoRef.current;
                    if (!v) return;
                    const w = v.videoWidth || 0;
                    const h = v.videoHeight || 0;
                    if (w > 0 && h > 0) setVideoAR(w / h);
                  }}
                  className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                  style={
                    zoom > 1
                      ? {
                          transform: `scale(${zoom})`,
                          transformOrigin: "center",
                        }
                      : undefined
                  }
                />
                {isSimulatingFlash && (
                  <div className="absolute inset-0 bg-white/80 animate-pulse" />
                )}

                {/* Top overlay: counters / flash */}
                <div className="pointer-events-auto absolute top-2 left-2 right-2 z-20 flex flex-wrap items-center justify-between gap-2 text-[12px] text-white/90">
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      Total: {lots.reduce((s, l) => s + l.files.length, 0)}/
                      {maxTotalImages}
                    </div>
                    <div>
                      Lot {activeIdx + 1}: {lots[activeIdx]?.files.length ?? 0}/
                      {maxImagesPerLot}
                    </div>
                    <div>
                      Mode:{" "}
                      {lots[activeIdx]?.mode === "single_lot"
                        ? "Bundle"
                        : lots[activeIdx]?.mode === "per_item"
                        ? "Per Item"
                        : lots[activeIdx]?.mode === "per_photo"
                        ? "Per Photo"
                        : "—"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setFlashOn((v) => !v);
                      try {
                        const stream = videoRef.current
                          ?.srcObject as MediaStream | null;
                        const track = stream?.getVideoTracks?.()[0] as any;
                        if (track?.getCapabilities?.()?.torch) {
                          await track.applyConstraints({
                            advanced: [{ torch: !flashOn }],
                          });
                          setIsTorchSupported(true);
                        } else {
                          setIsTorchSupported(false);
                        }
                      } catch {}
                    }}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-white/10 px-2 py-1 backdrop-blur ring-1 ring-white/20 hover:bg-white/15"
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

                {/* Landscape capture overlay (right side) */}
                {orientation === "landscape" && (
                  <div className="pointer-events-auto absolute right-2 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleCapture("single_lot")}
                      className="h-11 inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-b from-rose-500 to-rose-600 px-3 text-sm font-semibold text-white shadow-[0_5px_0_0_rgba(190,18,60,0.45)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(190,18,60,0.45)] hover:from-rose-400 hover:to-rose-600"
                      title="Capture - Single Lot"
                    >
                      <Camera className="h-5 w-5" /> Bundle
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCapture("per_item")}
                      className="h-11 inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-b from-rose-500 to-rose-600 px-3 text-sm font-semibold text-white shadow-[0_5px_0_0_rgba(190,18,60,0.45)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(190,18,60,0.45)] hover:from-rose-400 hover:to-rose-600"
                      title="Capture - Per Item"
                    >
                      <Camera className="h-5 w-5" /> Item
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCapture("per_photo")}
                      className="h-11 inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-b from-rose-500 to-rose-600 px-3 text-sm font-semibold text-white shadow-[0_5px_0_0_rgba(190,18,60,0.45)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(190,18,60,0.45)] hover:from-rose-400 hover:to-rose-600"
                      title="Capture - Per Photo"
                    >
                      <Camera className="h-5 w-5" /> Photo
                    </button>
                  </div>
                )}

                {/* Bottom controls */}
                <div
                  className="pointer-events-auto absolute inset-x-0 z-20 border-t border-white/10 bg-black/40 px-2 sm:px-3 py-2 backdrop-blur"
                  style={{
                    bottom: 0,
                    paddingBottom: "calc(env(safe-area-inset-bottom) + 6px)",
                  }}
                >
                  {/* Zoom: above controls for clarity (compact) */}
                  <div className="mb-1 flex items-center gap-2 rounded-lg bg-white/10 px-2 py-1 ring-1 ring-white/15 backdrop-blur">
                    <ZoomOut className="h-3.5 w-3.5 text-white/90" />
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={0.1}
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="flex-1 min-w-[100px] accent-rose-500 cursor-pointer text-[16px]"
                    />
                    <ZoomIn className="h-3.5 w-3.5 text-white/90" />
                    <div className="ml-2 w-8 text-right text-[10px] text-white/90">
                      {zoom.toFixed(1)}x
                    </div>
                  </div>
                  {/* Controls: 40% | 20% | 40% */}
                  <div className="grid grid-cols-[2fr_1fr_2fr] items-center gap-2 w-full">
                    <button
                      type="button"
                      onClick={goPrevLot}
                      disabled={activeIdx <= 0}
                      className="h-8 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-2 text-[10px] font-semibold text-white ring-1 ring-white/10 hover:bg-blue-500 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                      aria-label="Previous lot"
                    >
                      <ChevronLeft className="h-3 w-3" />
                      <span className="text-[10px]">Previous</span>
                    </button>
                    <button
                      type="button"
                      onClick={closeCamera}
                      className="h-12 sm:h-14 w-full inline-flex items-center justify-center rounded-2xl bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-[0_6px_0_0_rgba(190,18,60,0.45)] ring-2 ring-rose-300/60 hover:from-rose-400 hover:to-rose-600 active:translate-y-0.5 active:shadow-[0_3px_0_0_rgba(190,18,60,0.45)] focus:outline-none cursor-pointer"
                      aria-label="Done"
                      title="Done"
                    >
                      <Check className="h-7 w-7" />
                    </button>
                    <button
                      type="button"
                      onClick={goNextLot}
                      className="h-8 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-green-600 px-2 text-[10px] font-semibold text-white ring-1 ring-white/10 hover:bg-green-500 cursor-pointer"
                      aria-label="Next lot"
                    >
                      <span className="text-[10px]">Next</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                  {/* Row 2: Capture buttons - right side for landscape, bottom for portrait */}
                  {orientation !== "landscape" && (
                    <div className="mt-2 grid grid-cols-3 gap-2 w-full">
                      <button
                        type="button"
                        onClick={() => handleCapture("single_lot")}
                        className="h-11 inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-b from-rose-500 to-rose-600 px-3 text-sm font-semibold text-white shadow-[0_5px_0_0_rgba(190,18,60,0.45)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(190,18,60,0.45)] hover:from-rose-400 hover:to-rose-600"
                        title="Capture - Single Lot"
                      >
                        <Camera className="h-5 w-5" /> Bundle
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCapture("per_item")}
                        className="h-11 inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-b from-rose-500 to-rose-600 px-3 text-sm font-semibold text-white shadow-[0_5px_0_0_rgba(190,18,60,0.45)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(190,18,60,0.45)] hover:from-rose-400 hover:to-rose-600"
                        title="Capture - Per Item"
                      >
                        <Camera className="h-5 w-5" /> Item
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCapture("per_photo")}
                        className="h-11 inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-b from-rose-500 to-rose-600 px-3 text-sm font-semibold text-white shadow-[0_5px_0_0_rgba(190,18,60,0.45)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(190,18,60,0.45)] hover:from-rose-400 hover:to-rose-600"
                        title="Capture - Per Photo"
                      >
                        <Camera className="h-5 w-5" /> Photo
                      </button>
                    </div>
                  )}
                </div>

                {/* Error overlay */}
                {cameraError && (
                  <div className="pointer-events-auto absolute left-2 right-2 top-14 z-30 rounded-lg border border-red-200 bg-red-50/95 p-2 text-xs text-red-700">
                    {cameraError}
                  </div>
                )}

                <canvas ref={canvasRef} className="hidden" />
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
