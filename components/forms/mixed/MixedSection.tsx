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
  X,
  Download,
} from "lucide-react";
import JSZip from "jszip";
import ImageAnnotator, { AnnBox } from "./ImageAnnotator";

export type MixedMode = "single_lot" | "per_item" | "per_photo";
export type MixedLot = {
  id: string;
  files: File[]; // Main images for AI (max 30)
  extraFiles: File[]; // Extra images for report only (max 100)
  coverIndex: number; // 0-based within files
  mode?: MixedMode;
  videoFiles?: File[]; // Videos (report-only; zipped with originals)
  annotations?: Record<string, AnnBox[]>; // normalized boxes per file key
};

type Props = {
  value: MixedLot[];
  onChange: (lots: MixedLot[]) => void;
  maxImagesPerLot?: number; // default 30 (main AI images)
  maxExtraImagesPerLot?: number; // default 100 (extra report images)
  maxTotalImages?: number; // default 500
  downloadPrefix?: string; // optional: used for saving captured images locally
};

export default function MixedSection({
  value,
  onChange,
  maxImagesPerLot = 30,
  maxExtraImagesPerLot = 100,
  maxTotalImages = 500,
  downloadPrefix,
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
  // Track files captured in this camera session for zipping on Done
  const sessionFilesRef = useRef<File[]>([]);
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
  const extraFileInputRef = useRef<HTMLInputElement>(null);
  const videoUploadInputRef = useRef<HTMLInputElement>(null);
  // Video recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recMillis, setRecMillis] = useState<number>(0);
  const recIntervalRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  // Image annotation editor state
  const [editing, setEditing] = useState<{
    lotIdx: number;
    imgIdx: number;
    url: string;
  } | null>(null);

  const getFileKey = (f: File) => `${f.name}|${f.size}|${(f as any).lastModified || 0}`;

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
    const next: MixedLot[] = [
      ...lots,
      { id, files: [], extraFiles: [], videoFiles: [], coverIndex: 0 },
    ];
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
    selectedMode?: MixedMode,
    isExtra: boolean = false
  ) {
    setLots((prev) => {
      const out = [...prev];
      const lot = out[idx];
      if (!lot) return prev;

      if (isExtra) {
        // Add to extra files (no mode check needed)
        const current = out[idx];
        const roomInLot = Math.max(
          0,
          maxExtraImagesPerLot - current.extraFiles.length
        );
        if (roomInLot <= 0) {
          toast.error(
            `This lot already has ${maxExtraImagesPerLot} extra images.`
          );
          return prev;
        }
        const allowedCount = Math.min(roomInLot, incoming.length);
        const accepted = incoming.slice(0, allowedCount);
        if (accepted.length < incoming.length) {
          toast.warn("Some extra images were not added due to limits.");
        }
        out[idx] = {
          ...current,
          extraFiles: [...current.extraFiles, ...accepted],
        };
        return out;
      }

      // Main files handling
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

  // Videos: report-only, per-lot
  function addVideosToLot(idx: number, incoming: File[]) {
    setLots((prev) => {
      const out = [...prev];
      const lot = out[idx];
      if (!lot) return prev;
      const videoFiles = [...(lot.videoFiles || []), ...incoming];
      out[idx] = { ...lot, videoFiles } as MixedLot;
      return out;
    });
  }

  function removeVideo(idx: number, vidIdx: number) {
    setLots((prev) => {
      const out = [...prev];
      const lot = out[idx];
      if (!lot) return prev;
      const videoFiles = (lot.videoFiles || []).filter((_, i) => i !== vidIdx);
      out[idx] = { ...lot, videoFiles } as MixedLot;
      return out;
    });
  }

  function removeImage(idx: number, imgIdx: number) {
    setLots((prev) => {
      const out = [...prev];
      const lot = out[idx];
      if (!lot) return prev;
      const fileToRemove = lot.files[imgIdx];
      const key = fileToRemove ? getFileKey(fileToRemove) : null;
      const files = lot.files.filter((_, i) => i !== imgIdx);
      const coverIndex = Math.max(
        0,
        Math.min(files.length - 1, lot.coverIndex)
      );
      const annotations = { ...(lot.annotations || {}) };
      if (key && annotations[key]) delete annotations[key];
      out[idx] = { ...lot, files, coverIndex, annotations };
      return out;
    });
  }

  function removeExtraImage(idx: number, imgIdx: number) {
    setLots((prev) => {
      const out = [...prev];
      const lot = out[idx];
      if (!lot) return prev;
      const extraFiles = (lot.extraFiles || []).filter((_, i) => i !== imgIdx);
      out[idx] = { ...lot, extraFiles } as MixedLot;
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

  function openEditor(lotIdx: number, imgIdx: number) {
    try {
      const file = lots[lotIdx]?.files?.[imgIdx];
      if (!file) return;
      const url = URL.createObjectURL(file);
      setEditing({ lotIdx, imgIdx, url });
    } catch {}
  }

  function closeEditor() {
    try {
      if (editing?.url) URL.revokeObjectURL(editing.url);
    } catch {}
    setEditing(null);
  }

  function handleSaveAnnotations(boxes: AnnBox[]) {
    if (!editing) return;
    const { lotIdx, imgIdx } = editing;
    setLots((prev) => {
      const out = [...prev];
      const lot = out[lotIdx];
      if (!lot) return prev;
      const file = lot.files?.[imgIdx];
      if (!file) return prev;
      const key = getFileKey(file);
      const annotations = { ...(lot.annotations || {}) };
      annotations[key] = boxes;
      out[lotIdx] = { ...lot, annotations };
      return out;
    });
    closeEditor();
  }

  // Manual upload
  function onManualUpload(files: FileList | null) {
    if (activeIdx < 0) createLot();
    if (!files) return;
    const incoming = Array.from(files);
    addFilesToLot(activeIdx < 0 ? 0 : activeIdx, incoming);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Manual upload for Extra images (report-only)
  function onManualUploadExtra(files: FileList | null) {
    if (activeIdx < 0) createLot();
    if (!files) return;
    const incoming = Array.from(files);
    addFilesToLotWithMode(
      activeIdx < 0 ? 0 : activeIdx,
      incoming,
      undefined,
      true
    );
    if (extraFileInputRef.current) extraFileInputRef.current.value = "";
  }

  // Manual upload for Videos (report-only)
  function onManualUploadVideo(files: FileList | null) {
    if (activeIdx < 0) createLot();
    if (!files) return;
    const incoming = Array.from(files);
    addVideosToLot(activeIdx < 0 ? 0 : activeIdx, incoming);
    if (videoUploadInputRef.current) videoUploadInputRef.current.value = "";
  }

  // Camera overlay logic
  async function openCamera() {
    try {
      setCameraError(null);
      setZoom(1);
      sessionFilesRef.current = [];
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
        },
        audio: true,
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

  async function finishAndClose() {
    closeCamera();
  }

  // Recording helpers
  function formatTimer(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  async function startRecording() {
    try {
      if (!streamRef.current) return;
      if (isRecording) return;
      recordedChunksRef.current = [];
      const mimeCandidates = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
      ];
      let chosen: string | undefined;
      for (const m of mimeCandidates) {
        if (
          (window as any).MediaRecorder &&
          (MediaRecorder as any).isTypeSupported?.(m)
        ) {
          chosen = m;
          break;
        }
      }
      const mr = new MediaRecorder(
        streamRef.current,
        chosen ? { mimeType: chosen } : undefined
      );
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        if (recordedChunksRef.current.length) {
          const blob = new Blob(recordedChunksRef.current, {
            type: mr.mimeType || "video/webm",
          });
          const idx = activeIdx < 0 ? 0 : activeIdx;
          const safePrefix = (downloadPrefix || "asset").replace(
            /[^a-zA-Z0-9_-]/g,
            "-"
          );
          const lotLabel = String(idx + 1).padStart(2, "0");
          const ext =
            mr.mimeType && mr.mimeType.includes("mp4") ? ".mp4" : ".webm";
          const file = new File(
            [blob],
            `${safePrefix}-lot-${lotLabel}-${Date.now()}${ext}`,
            { type: mr.mimeType || "video/webm" }
          );
          addVideosToLot(idx, [file]);
        }
      };
      mr.start(250);
      setIsRecording(true);
      setRecMillis(0);
      const startedAt = Date.now();
      recIntervalRef.current = setInterval(
        () => setRecMillis(Date.now() - startedAt),
        250
      );
    } catch (e: any) {
      toast.error(e?.message || "Unable to start recording");
    }
  }

  function stopRecording() {
    try {
      if (!isRecording) return;
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== "inactive") mr.stop();
    } catch {}
    setIsRecording(false);
    if (recIntervalRef.current) {
      clearInterval(recIntervalRef.current);
      recIntervalRef.current = null;
    }
  }

  // Manual per-lot ZIP download
  async function downloadLotZip(idx: number) {
    try {
      const lot = lots[idx];
      if (!lot || lot.files.length === 0) return;
      const zip = new JSZip();
      for (const f of lot.files) zip.file(f.name, f);
      const safePrefix = (downloadPrefix || "asset").replace(
        /[^a-zA-Z0-9_-]/g,
        "-"
      );
      const lotLabel = String(idx + 1).padStart(2, "0");
      const blob = await zip.generateAsync({ type: "blob" });
      const zipName = `${safePrefix}-lot-${lotLabel}-images-${Date.now()}.zip`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = zipName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
      }, 2000);
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

  // Simple tone helper for UI sounds
  function playBeep(
    freq: number,
    duration: number = 0.12,
    type: OscillatorType = "sine",
    vol: number = 0.25,
    delay: number = 0
  ) {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    const start = ctx.currentTime + Math.max(0, delay);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(Math.max(0.001, vol), start + 0.01);
    g.gain.exponentialRampToValueAtTime(
      0.0009,
      start + Math.max(0.02, duration)
    );
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + Math.max(0.03, duration));
  }

  // Distinct sounds per action
  function playRecordStart() {
    // Low -> High
    playBeep(440, 0.12, "sine", 0.28, 0);
    playBeep(660, 0.12, "sine", 0.28, 0.12);
  }
  function playRecordStop() {
    // High -> Low
    playBeep(700, 0.12, "sine", 0.28, 0);
    playBeep(440, 0.14, "sine", 0.28, 0.12);
  }
  function playBundleSound() {
    // Two medium beeps
    playBeep(520, 0.12, "triangle", 0.24, 0);
    playBeep(520, 0.12, "triangle", 0.24, 0.12);
  }
  function playItemSound() {
    // Three short ascending beeps
    playBeep(500, 0.08, "square", 0.22, 0);
    playBeep(600, 0.08, "square", 0.22, 0.09);
    playBeep(720, 0.1, "square", 0.22, 0.18);
  }
  function playExtraSound() {
    // Single short high chirp
    playBeep(900, 0.09, "sawtooth", 0.2, 0);
  }
  function playCaptureSound(mode: MixedMode, isExtra: boolean) {
    if (isExtra) return playExtraSound();
    if (mode === "single_lot") return playBundleSound();
    if (mode === "per_item") return playItemSound();
    return playShutterClick(); // per_photo
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

  async function captureFromStream(
    selectedMode?: MixedMode,
    isExtra: boolean = false
  ) {
    const idx = activeIdx < 0 ? 0 : activeIdx;
    const lot = lots[idx];
    if (!lot) return;

    if (isExtra) {
      // Check extra images limit
      if (lot.extraFiles.length >= maxExtraImagesPerLot) {
        toast.warn(`Extra images limit reached (${maxExtraImagesPerLot}/lot).`);
        return;
      }
    } else {
      // Check main images limit
      const totalSoFar = lots.reduce((s, l) => s + l.files.length, 0);
      if (lot.files.length >= maxImagesPerLot || totalSoFar >= maxTotalImages) {
        toast.warn(
          `Limit reached (caps: ${maxImagesPerLot}/lot, ${maxTotalImages} total).`
        );
        return;
      }
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
    if (flashOn && !isTorchSupported) {
      setIsSimulatingFlash(true);
      setTimeout(() => setIsSimulatingFlash(false), 120);
    }
    ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, outW, outH);
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92)
    );
    if (!blob) return;
    const safePrefix = (downloadPrefix || "asset").replace(
      /[^a-zA-Z0-9_-]/g,
      "-"
    );
    const lotLabel = String(idx + 1).padStart(2, "0");
    const filename = `${safePrefix}-lot-${lotLabel}-${Date.now()}.jpg`;
    const file = new File([blob], filename, {
      type: "image/jpeg",
    });
    // Do not download per-shot; accumulate and zip on Done
    sessionFilesRef.current.push(file);
    addFilesToLotWithMode(idx, [file], selectedMode, isExtra);
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
        const next = [
          ...prev,
          { id, files: [], extraFiles: [], coverIndex: 0 } as MixedLot,
        ];
        setActiveIdx(next.length - 1);
        return next;
      } else {
        const nextIdx = Math.min(activeIdx + 1, prev.length - 1);
        setActiveIdx(nextIdx);
        return prev;
      }
    });
  }

  function handleCapture(mode: MixedMode, isExtra: boolean = false) {
    const idx = activeIdx < 0 ? 0 : activeIdx;
    const lot = lots[idx];
    if (!lot) return;
    if (!isExtra && lot.mode && lot.mode !== mode) {
      toast.warn(
        `This lot is already set to ${lot.mode.replace(
          "_",
          " "
        )}. Go to next lot to capture a different mode.`
      );
      return;
    }
    try {
      playCaptureSound(mode, isExtra);
    } catch {}
    captureFromStream(mode, isExtra);
  }

  const totalImages = lots.reduce((s, l) => s + l.files.length, 0);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="grid grid-cols-2 grid-flow-dense gap-2 sm:flex sm:flex-wrap sm:items-center">
        <button
          type="button"
          className="w-full sm:w-auto inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-gray-900 to-black px-3 py-2 text-sm font-semibold text-white shadow"
          onClick={createLot}
        >
          <Plus className="h-4 w-4" /> New Lot
        </button>
        <button
          type="button"
          className="w-full sm:w-auto inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 px-3 py-2 text-sm font-semibold text-white shadow"
          onClick={openCamera}
        >
          <Camera className="h-4 w-4" /> Open Camera
        </button>
        <button
          type="button"
          className="w-full sm:w-auto inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-gray-800 border border-gray-200 shadow"
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
        <button
          type="button"
          className="w-full sm:w-auto inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 px-3 py-2 text-sm font-semibold text-white shadow"
          onClick={() => extraFileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4" /> Upload Extra
        </button>
        <input
          ref={extraFileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => onManualUploadExtra(e.target.files)}
        />
        <button
          type="button"
          className="w-full sm:w-auto inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow"
          onClick={() => videoUploadInputRef.current?.click()}
        >
          <Upload className="h-4 w-4" /> Upload Video
        </button>
        <input
          ref={videoUploadInputRef}
          type="file"
          accept="video/*"
          multiple
          className="sr-only"
          onChange={(e) => onManualUploadVideo(e.target.files)}
        />
        <div className="justify-self-end sm:ml-auto text-xs text-gray-600">
          Total: {totalImages} image(s)
        </div>
      </div>

      {/* Lots selector */}
      {lots.length > 0 && (
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
                  AI: {lot.files.length} | Extra: {lot.extraFiles?.length || 0}{" "}
                  | Video: {lot.videoFiles?.length || 0}
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
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadLotZip(activeIdx)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-800 hover:bg-gray-50"
                    title="Download this lot as ZIP"
                  >
                    <Download className="h-4 w-4" /> Download ZIP
                  </button>
                  <button
                    type="button"
                    onClick={() => removeLot(activeIdx)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" /> Remove Lot
                  </button>
                </div>
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

              {/* Images grid (AI processing images) */}
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {lots[activeIdx].files.map((f, i) => {
                  const url = URL.createObjectURL(f);
                  const isCover = lots[activeIdx].coverIndex === i;
                  const key = getFileKey(f);
                  const annCount = (lots[activeIdx].annotations?.[key] || []).length;
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
                      {annCount > 0 && (
                        <div className="absolute right-1 top-1 rounded bg-red-600/80 px-1.5 py-0.5 text-[10px] text-white shadow">
                          {annCount} box{annCount > 1 ? "es" : ""}
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
                          className="rounded bg-white/90 px-2 py-0.5 text-[10px] shadow"
                          onClick={() => openEditor(activeIdx, i)}
                        >
                          Edit
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

              {/* Extra Images (Report Only) with divider */}
              {(lots[activeIdx]?.extraFiles?.length ?? 0) > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-gray-200" />
                    <div className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      Extra Images (Report Only)
                    </div>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {lots[activeIdx].extraFiles.map((f, i) => {
                      const url = URL.createObjectURL(f);
                      return (
                        <div
                          key={i}
                          className="relative group rounded-xl overflow-hidden border border-blue-200"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={f.name}
                            className="h-28 w-full object-cover"
                            onLoad={() => URL.revokeObjectURL(url)}
                          />
                          <div className="absolute left-1 top-1 rounded bg-blue-600/80 px-1.5 py-0.5 text-[10px] text-white shadow">
                            Extra
                          </div>
                          <div className="absolute inset-x-0 bottom-1 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition">
                            <button
                              type="button"
                              className="rounded bg-white/90 px-2 py-0.5 text-[10px] shadow text-red-600"
                              onClick={() => removeExtraImage(activeIdx, i)}
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

              {/* Videos (Report Only) with divider */}
              {(lots[activeIdx]?.videoFiles?.length ?? 0) > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-gray-200" />
                    <div className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      Videos (Report Only)
                    </div>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {lots[activeIdx].videoFiles!.map((f, i) => {
                      const url = URL.createObjectURL(f);
                      return (
                        <div
                          key={i}
                          className="relative group rounded-xl overflow-hidden border border-indigo-200"
                          onClick={(e) => {
                            const video = e.currentTarget.querySelector(
                              "video"
                            ) as HTMLVideoElement | null;
                            video?.play?.();
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <video
                            src={url}
                            controls
                            className="h-36 w-full object-cover bg-black"
                            onLoadedData={() => URL.revokeObjectURL(url)}
                          />
                          <div className="absolute left-1 top-1 rounded bg-indigo-600/80 px-1.5 py-0.5 text-[10px] text-white shadow">
                            Video
                          </div>
                          <div className="absolute inset-x-0 bottom-1 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition">
                            <button
                              type="button"
                              className="rounded bg-white/90 px-2 py-0.5 text-[10px] shadow text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeVideo(activeIdx, i);
                              }}
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
          )}
        </div>
      )}

      {/* Camera Overlay (portal) */}
      {cameraOpen &&
        createPortal(
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-sm overflow-hidden touch-none overscroll-contain select-none">
            <div className="relative w-full h-full max-w-none max-h-full overflow-hidden flex flex-col rounded-none border-0 bg-black/30 ring-0 shadow-none">
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
                  className="absolute inset-0 h-full w-full object-cover pointer-events-none"
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
                <div className="pointer-events-auto absolute top-2 left-2 right-2 z-20 flex flex-wrap items-center justify-between gap-2 text-[13px] sm:text-[16px] text-white/90 font-semibold">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={finishAndClose}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-white/10 px-2 py-1 backdrop-blur ring-1 ring-white/20 hover:bg-white/15"
                      title="Exit"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Exit</span>
                    </button>
                    <div>
                      Total: {lots.reduce((s, l) => s + l.files.length, 0)}/
                      {maxTotalImages}
                    </div>
                    <div>
                      Lot {activeIdx + 1}: {lots[activeIdx]?.files.length ?? 0}/
                      {maxImagesPerLot} (AI)
                    </div>
                    <div>
                      Extra: {lots[activeIdx]?.extraFiles.length ?? 0}/
                      {maxExtraImagesPerLot}
                    </div>
                    <div>
                      Mode: {" "}
                      {lots[activeIdx]?.mode === "single_lot"
                        ? "Bundle"
                        : lots[activeIdx]?.mode === "per_item"
                        ? "Per Item"
                        : lots[activeIdx]?.mode === "per_photo"
                        ? "Per Photo"
                        : "—"}
                    </div>
                    {isRecording && (
                      <div className="ml-2 inline-flex items-center gap-1 rounded bg-red-600/80 px-2 py-0.5 text-white font-semibold">
                        <span className="inline-block h-2 w-2 rounded-full bg-white animate-pulse" />
                        REC {formatTimer(recMillis)}
                      </div>
                    )}
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
                    <div className="flex items-stretch gap-1">
                      <button
                        type="button"
                        onClick={() => handleCapture("single_lot")}
                        className="h-10 min-w-[88px] inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-gradient-to-b from-rose-500 to-rose-600 px-3 text-xs font-semibold text-white shadow-[0_4px_0_0_rgba(190,18,60,0.45)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(190,18,60,0.45)] hover:from-rose-400 hover:to-rose-600"
                        title="Capture - Bundle (AI)"
                      >
                        <Camera className="h-4 w-4" /> Bundle
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCapture("single_lot", true)}
                        className="h-10 min-w-[88px] inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 px-3 text-xs font-semibold text-white shadow-[0_4px_0_0_rgba(29,78,216,0.45)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(29,78,216,0.45)] hover:from-blue-400 hover:to-blue-600"
                        title="Capture - Bundle Extra (Report Only)"
                      >
                        Extra
                      </button>
                    </div>
                    <div className="flex items-stretch gap-1">
                      <button
                        type="button"
                        onClick={() => handleCapture("per_item")}
                        className="h-10 min-w-[88px] inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-gradient-to-b from-rose-500 to-rose-600 px-3 text-xs font-semibold text-white shadow-[0_4px_0_0_rgba(190,18,60,0.45)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(190,18,60,0.45)] hover:from-rose-400 hover:to-rose-600"
                        title="Capture - Item (AI)"
                      >
                        <Camera className="h-4 w-4" /> Item
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCapture("per_item", true)}
                        className="h-10 min-w-[88px] inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 px-3 text-xs font-semibold text-white shadow-[0_4px_0_0_rgba(29,78,216,0.45)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(29,78,216,0.45)] hover:from-blue-400 hover:to-blue-600"
                        title="Capture - Item Extra (Report Only)"
                      >
                        Extra
                      </button>
                    </div>
                    <div className="flex items-stretch gap-1">
                      <button
                        type="button"
                        onClick={() => handleCapture("per_photo")}
                        className="h-10 min-w-[88px] inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-gradient-to-b from-rose-500 to-rose-600 px-3 text-xs font-semibold text-white shadow-[0_4px_0_0_rgba(190,18,60,0.45)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(190,18,60,0.45)] hover:from-rose-400 hover:to-rose-600"
                        title="Capture - Photo (AI)"
                      >
                        <Camera className="h-4 w-4" /> Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCapture("per_photo", true)}
                        className="h-10 min-w-[88px] inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 px-3 text-xs font-semibold text-white shadow-[0_4px_0_0_rgba(29,78,216,0.45)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(29,78,216,0.45)] hover:from-blue-400 hover:to-blue-600"
                        title="Capture - Photo Extra (Report Only)"
                      >
                        Extra
                      </button>
                    </div>
                    {/* 4th control: Record/Stop video */}
                    <div className="flex items-stretch gap-1">
                      <button
                        type="button"
                        disabled={!lots[activeIdx]?.mode}
                        onClick={() => {
                          if (!lots[activeIdx]?.mode) return;
                          if (isRecording) {
                            try {
                              playRecordStop();
                            } catch {}
                            stopRecording();
                          } else {
                            try {
                              playRecordStart();
                            } catch {}
                            startRecording();
                          }
                        }}
                        className={`h-10 min-w-[88px] inline-flex cursor-pointer items-center justify-center rounded-full px-3 text-xs font-semibold ring-1 ring-white/20 ${
                          isRecording
                            ? "bg-blue-900 text-white hover:bg-blue-800"
                            : "bg-blue-600 text-white hover:bg-blue-500"
                        } ${
                          !lots[activeIdx]?.mode
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                        title={
                          isRecording ? "Stop Recording" : "Start Recording"
                        }
                      >
                        {isRecording ? "Stop" : "Record"}
                      </button>
                    </div>
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
                  <div className="mx-auto w-full max-w-[560px] sm:max-w-[780px]">
                    {/* Portrait: zoom above controls. Landscape: zoom moves inline to the right */}
                    {orientation !== "landscape" && (
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
                        <div className="ml-2 w-8 text-right text-[10px] text-white/90">{zoom.toFixed(1)}x</div>
                      </div>
                    )}
                    {/* Controls row: 3 cols portrait, 4 cols (zoom at left) landscape */}
                    <div className={`grid items-center gap-2 w-full ${orientation === "landscape" ? "grid-cols-[auto_2fr_1fr_2fr]" : "grid-cols-[2fr_1fr_2fr]"}`}>
                      {orientation === "landscape" && (
                        <div className="justify-self-start flex items-center gap-2 rounded-lg bg-white/10 px-2 py-1 ring-1 ring-white/15 backdrop-blur">
                          <ZoomOut className="h-3.5 w-3.5 text-white/90" />
                          <input
                            type="range"
                            min={1}
                            max={5}
                            step={0.1}
                            value={zoom}
                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                            className="w-[140px] sm:w-[200px] accent-rose-500 cursor-pointer text-[16px]"
                          />
                          <ZoomIn className="h-3.5 w-3.5 text-white/90" />
                          <div className="ml-1 w-8 text-right text-[10px] text-white/90">{zoom.toFixed(1)}x</div>
                        </div>
                      )}
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
                        onClick={finishAndClose}
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
                      <div className="mt-2 grid grid-cols-4 gap-2 w-full">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => handleCapture("single_lot")}
                            className="h-7 inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-gradient-to-b from-rose-500 to-rose-600 px-2 text-[10px] font-semibold text-white shadow-[0_3px_0_0_rgba(190,18,60,0.45)] transition active:translate-y-0.5 active:shadow-[0_1px_0_0_rgba(190,18,60,0.45)] hover:from-rose-400 hover:to-rose-600"
                            title="Capture - Bundle (AI)"
                          >
                            <Camera className="h-4 w-4" /> Bundle
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCapture("single_lot", true)}
                            className="h-7 inline-flex cursor-pointer items-center justify-center gap-1 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 px-2 text-[10px] font-semibold text-white shadow-[0_3px_0_0_rgba(29,78,216,0.45)] transition active:translate-y-0.5 active:shadow-[0_1px_0_0_rgba(29,78,216,0.45)] hover:from-blue-400 hover:to-blue-600"
                            title="Capture - Bundle Extra (Report Only)"
                          >
                            + Extra
                          </button>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => handleCapture("per_item")}
                            className="h-7 inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-gradient-to-b from-rose-500 to-rose-600 px-2 text-[10px] font-semibold text-white shadow-[0_3px_0_0_rgba(190,18,60,0.45)] transition active:translate-y-0.5 active:shadow-[0_1px_0_0_rgba(190,18,60,0.45)] hover:from-rose-400 hover:to-rose-600"
                            title="Capture - Item (AI)"
                          >
                            <Camera className="h-4 w-4" /> Item
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCapture("per_item", true)}
                            className="h-7 inline-flex cursor-pointer items-center justify-center gap-1 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 px-2 text-[10px] font-semibold text-white shadow-[0_3px_0_0_rgba(29,78,216,0.45)] transition active:translate-y-0.5 active:shadow-[0_1px_0_0_rgba(29,78,216,0.45)] hover:from-blue-400 hover:to-blue-600"
                            title="Capture - Item Extra (Report Only)"
                          >
                            + Extra
                          </button>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => handleCapture("per_photo")}
                            className="h-7 inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-gradient-to-b from-rose-500 to-rose-600 px-2 text-[10px] font-semibold text-white shadow-[0_3px_0_0_rgba(190,18,60,0.45)] transition active:translate-y-0.5 active:shadow-[0_1px_0_0_rgba(190,18,60,0.45)] hover:from-rose-400 hover:to-rose-600"
                            title="Capture - Photo (AI)"
                          >
                            <Camera className="h-4 w-4" /> Photo
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCapture("per_photo", true)}
                            className="h-7 inline-flex cursor-pointer items-center justify-center gap-1 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 px-2 text-[10px] font-semibold text-white shadow-[0_3px_0_0_rgba(29,78,216,0.45)] transition active:translate-y-0.5 active:shadow-[0_1px_0_0_rgba(29,78,216,0.45)] hover:from-blue-400 hover:to-blue-600"
                            title="Capture - Photo Extra (Report Only)"
                          >
                            + Extra
                          </button>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            disabled={!lots[activeIdx]?.mode}
                            onClick={() => {
                              if (!lots[activeIdx]?.mode) return;
                              if (isRecording) {
                                try {
                                  playRecordStop();
                                } catch {}
                                stopRecording();
                              } else {
                                try {
                                  playRecordStart();
                                } catch {}
                                startRecording();
                              }
                            }}
                            className={`h-7 inline-flex cursor-pointer items-center justify-center rounded-full px-2 text-[10px] font-semibold ring-1 ring-white/20 ${
                              isRecording
                                ? "bg-blue-900 text-white hover:bg-blue-800"
                                : "bg-blue-600 text-white hover:bg-blue-500"
                            } ${
                              !lots[activeIdx]?.mode
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                            title={
                              isRecording ? "Stop Recording" : "Start Recording"
                            }
                          >
                            {isRecording ? "Stop" : "Record"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
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
        {editing && (
          <ImageAnnotator
            imageUrl={editing.url}
            initialBoxes={(() => {
              const lot = lots[editing.lotIdx];
              const file = lot?.files?.[editing.imgIdx];
              if (!lot || !file) return [] as AnnBox[];
              const key = getFileKey(file);
              return (lot.annotations?.[key] || []) as AnnBox[];
            })()}
            onSave={handleSaveAnnotations}
            onCancel={closeEditor}
          />
        )}
    </div>
  );
}
