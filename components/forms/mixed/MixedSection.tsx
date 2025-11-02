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
  Lock,
  Unlock,
} from "lucide-react";
import JSZip from "jszip";
import ImageAnnotator, { AnnBox } from "./ImageAnnotator";

export type MixedMode = "single_lot" | "per_item" | "per_photo";
export type MixedLot = {
  id: string;
  files: File[]; // Main images for processing (max 30)
  extraFiles: File[]; // Extra images for report only (max 100)
  coverIndex: number; // 0-based within files
  mode?: MixedMode;
  videoFiles?: File[]; // Videos (report-only; zipped with originals)
  annotations?: Record<string, AnnBox[]>; // normalized boxes per file key
};

type Props = {
  value: MixedLot[];
  onChange: (lots: MixedLot[]) => void;
  maxImagesPerLot?: number; // default 30 (main images for processing)
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
  const [focusOn, setFocusOn] = useState<boolean>(false);
  const FOCUS_BOX_FRACTION = 0.62; // fraction of min(image width/height)
  const [focusBoxFrac, setFocusBoxFrac] = useState<number>(0.62);
  const [focusBoxFW, setFocusBoxFW] = useState<number>(0.62);
  const [focusBoxFH, setFocusBoxFH] = useState<number>(0.62);
  const [focusBoxCX, setFocusBoxCX] = useState<number>(0.5);
  const [focusBoxCY, setFocusBoxCY] = useState<number>(0.5);
  const pinchStateRef = useRef<{
    active: boolean;
    startDist: number;
    startFW: number;
    startFH: number;
  } | null>(null);
  const [focusLockAR, setFocusLockAR] = useState<boolean>(false);
  const focusARRef = useRef<number>(1);
  const dragStateRef = useRef<{
    type: "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
    startX: number;
    startY: number;
    startCx: number;
    startCy: number;
    startW: number;
    startH: number;
    anchorX: number;
    anchorY: number;
    startCornerX: number;
    startCornerY: number;
  } | null>(null);
  const bottomControlsRef = useRef<HTMLDivElement>(null);
  const [controlsHeight, setControlsHeight] = useState<number>(0);
  const cameraViewRef = useRef<HTMLDivElement>(null);
  const [cameraViewSize, setCameraViewSize] = useState<{
    w: number;
    h: number;
  }>({ w: 0, h: 0 });
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

  const getFileKey = (f: File) =>
    `${f.name}|${f.size}|${(f as any).lastModified || 0}`;

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

  useEffect(() => {
    if (!cameraOpen) return;
    setZoom(1);
  }, [orientation, cameraOpen]);

  // Measure bottom controls height to keep focus box fully visible above it
  useEffect(() => {
    if (!cameraOpen) {
      setControlsHeight(0);
      return;
    }
    const measure = () => {
      try {
        const el = bottomControlsRef.current;
        const h = el ? el.offsetHeight || 0 : 0;
        setControlsHeight(h);
      } catch {}
    };
    measure();
    let ro: ResizeObserver | null = null;
    try {
      // @ts-ignore - ResizeObserver available in browser
      ro = new ResizeObserver(measure);
      if (bottomControlsRef.current) ro.observe(bottomControlsRef.current);
    } catch {}
    window.addEventListener("resize", measure);
    return () => {
      try {
        ro?.disconnect();
      } catch {}
      window.removeEventListener("resize", measure);
    };
  }, [cameraOpen, orientation]);

  useEffect(() => {
    if (!cameraOpen) {
      setCameraViewSize({ w: 0, h: 0 });
      return;
    }
    const measure = () => {
      try {
        const el = cameraViewRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        setCameraViewSize({ w: Math.round(r.width), h: Math.round(r.height) });
      } catch {}
    };
    measure();
    let ro: ResizeObserver | null = null;
    try {
      // @ts-ignore
      ro = new ResizeObserver(measure);
      if (cameraViewRef.current) ro.observe(cameraViewRef.current);
    } catch {}
    window.addEventListener("resize", measure);
    return () => {
      try {
        ro?.disconnect();
      } catch {}
      window.removeEventListener("resize", measure);
    };
  }, [cameraOpen, orientation]);

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

  type DragType = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
  function startDrag(type: DragType, e: React.PointerEvent | PointerEvent) {
    try {
      const dispW = cameraViewSize.w;
      const dispH = cameraViewSize.h;
      if (!(dispW > 0 && dispH > 0)) return;
      const minDisp = Math.min(dispW, dispH);
      const startW = Math.round(
        (typeof focusBoxFW === "number"
          ? focusBoxFW
          : focusBoxFrac || FOCUS_BOX_FRACTION) * Math.max(1, dispW)
      );
      const startH = Math.round(
        (typeof focusBoxFH === "number"
          ? focusBoxFH
          : focusBoxFrac || FOCUS_BOX_FRACTION) * Math.max(1, dispH)
      );
      const cx = Math.round(
        (typeof focusBoxCX === "number" ? focusBoxCX : 0.5) * dispW
      );
      const cy = Math.round(
        (typeof focusBoxCY === "number" ? focusBoxCY : 0.5) * dispH
      );
      let anchorX = cx;
      let anchorY = cy;
      let startCornerX = cx;
      let startCornerY = cy;
      const halfW = startW / 2;
      const halfH = startH / 2;
      switch (type) {
        case "ne":
          anchorX = cx - halfW;
          anchorY = cy + halfH;
          startCornerX = cx + halfW;
          startCornerY = cy - halfH;
          break;
        case "nw":
          anchorX = cx + halfW;
          anchorY = cy + halfH;
          startCornerX = cx - halfW;
          startCornerY = cy - halfH;
          break;
        case "se":
          anchorX = cx - halfW;
          anchorY = cy - halfH;
          startCornerX = cx + halfW;
          startCornerY = cy + halfH;
          break;
        case "sw":
          anchorX = cx + halfW;
          anchorY = cy - halfH;
          startCornerX = cx - halfW;
          startCornerY = cy + halfH;
          break;
        case "n":
          anchorX = cx;
          anchorY = cy + halfH;
          startCornerX = cx;
          startCornerY = cy - halfH;
          break;
        case "s":
          anchorX = cx;
          anchorY = cy - halfH;
          startCornerX = cx;
          startCornerY = cy + halfH;
          break;
        case "e":
          anchorX = cx - halfW;
          anchorY = cy;
          startCornerX = cx + halfW;
          startCornerY = cy;
          break;
        case "w":
          anchorX = cx + halfW;
          anchorY = cy;
          startCornerX = cx - halfW;
          startCornerY = cy;
          break;
        default:
          anchorX = cx;
          anchorY = cy;
          startCornerX = cx;
          startCornerY = cy;
      }
      dragStateRef.current = {
        type,
        startX: (e as PointerEvent).clientX,
        startY: (e as PointerEvent).clientY,
        startCx: cx,
        startCy: cy,
        startW,
        startH,
        anchorX,
        anchorY,
        startCornerX,
        startCornerY,
      };
      const onMove = (ev: PointerEvent) => {
        const s = dragStateRef.current;
        if (!s) return;
        const dx = ev.clientX - s.startX;
        const dy = ev.clientY - s.startY;
        let newCx = s.startCx;
        let newCy = s.startCy;
        let newW = s.startW;
        let newH = s.startH;

        const minDim = Math.max(40, Math.floor(0.08 * minDisp));
        const maxW = Math.max(minDim, Math.floor(0.98 * dispW));
        const maxH = Math.max(minDim, Math.floor(0.98 * dispH));

        const px = s.startCornerX + dx;
        const py = s.startCornerY + dy;

        switch (s.type) {
          case "move": {
            newCx = s.startCx + dx;
            newCy = s.startCy + dy;
            newW = s.startW;
            newH = s.startH;
            let l = newCx - newW / 2;
            let t = newCy - newH / 2;
            l = Math.max(0, Math.min(dispW - newW, Math.floor(l)));
            t = Math.max(0, Math.min(dispH - newH, Math.floor(t)));
            newCx = Math.floor(l + newW / 2);
            newCy = Math.floor(t + newH / 2);
            break;
          }
          case "ne": {
            const clampedX = Math.max(0, Math.min(dispW, px));
            const clampedY = Math.max(0, Math.min(dispH, py));
            const w = Math.max(minDim, Math.min(maxW, clampedX - s.anchorX));
            const h = Math.max(minDim, Math.min(maxH, s.anchorY - clampedY));
            newW = Math.min(w, dispW - s.anchorX);
            newH = Math.min(h, s.anchorY);
            if (focusLockAR) {
              const ar = Math.max(0.0001, focusARRef.current || 1);
              const maxWLimit = Math.min(dispW - s.anchorX, maxW);
              const maxHLimit = Math.min(s.anchorY, maxH);
              const wCand = Math.min(w, maxWLimit);
              const hCand = Math.min(h, maxHLimit);
              let wFinal = Math.max(
                minDim,
                Math.min(wCand, hCand * ar, maxWLimit, maxHLimit * ar)
              );
              let hFinal = Math.max(
                minDim,
                Math.min(hCand, wCand / ar, maxHLimit, maxWLimit / ar)
              );
              wFinal = Math.min(wFinal, hFinal * ar);
              hFinal = Math.min(hFinal, wFinal / ar);
              newW = wFinal;
              newH = hFinal;
            }
            newCx = s.anchorX + newW / 2;
            newCy = s.anchorY - newH / 2;
            break;
          }
          case "nw": {
            const clampedX = Math.max(0, Math.min(dispW, px));
            const clampedY = Math.max(0, Math.min(dispH, py));
            const w = Math.max(minDim, Math.min(maxW, s.anchorX - clampedX));
            const h = Math.max(minDim, Math.min(maxH, s.anchorY - clampedY));
            newW = Math.min(w, s.anchorX);
            newH = Math.min(h, s.anchorY);
            if (focusLockAR) {
              const ar = Math.max(0.0001, focusARRef.current || 1);
              const maxWLimit = Math.min(s.anchorX, maxW);
              const maxHLimit = Math.min(s.anchorY, maxH);
              const wCand = Math.min(w, maxWLimit);
              const hCand = Math.min(h, maxHLimit);
              let wFinal = Math.max(
                minDim,
                Math.min(wCand, hCand * ar, maxWLimit, maxHLimit * ar)
              );
              let hFinal = Math.max(
                minDim,
                Math.min(hCand, wCand / ar, maxHLimit, maxWLimit / ar)
              );
              wFinal = Math.min(wFinal, hFinal * ar);
              hFinal = Math.min(hFinal, wFinal / ar);
              newW = wFinal;
              newH = hFinal;
            }
            newCx = s.anchorX - newW / 2;
            newCy = s.anchorY - newH / 2;
            break;
          }
          case "se": {
            const clampedX = Math.max(0, Math.min(dispW, px));
            const clampedY = Math.max(0, Math.min(dispH, py));
            const w = Math.max(minDim, Math.min(maxW, clampedX - s.anchorX));
            const h = Math.max(minDim, Math.min(maxH, clampedY - s.anchorY));
            newW = Math.min(w, dispW - s.anchorX);
            newH = Math.min(h, dispH - s.anchorY);
            if (focusLockAR) {
              const ar = Math.max(0.0001, focusARRef.current || 1);
              const maxWLimit = Math.min(dispW - s.anchorX, maxW);
              const maxHLimit = Math.min(dispH - s.anchorY, maxH);
              const wCand = Math.min(w, maxWLimit);
              const hCand = Math.min(h, maxHLimit);
              let wFinal = Math.max(
                minDim,
                Math.min(wCand, hCand * ar, maxWLimit, maxHLimit * ar)
              );
              let hFinal = Math.max(
                minDim,
                Math.min(hCand, wCand / ar, maxHLimit, maxWLimit / ar)
              );
              wFinal = Math.min(wFinal, hFinal * ar);
              hFinal = Math.min(hFinal, wFinal / ar);
              newW = wFinal;
              newH = hFinal;
            }
            newCx = s.anchorX + newW / 2;
            newCy = s.anchorY + newH / 2;
            break;
          }
          case "sw": {
            const clampedX = Math.max(0, Math.min(dispW, px));
            const clampedY = Math.max(0, Math.min(dispH, py));
            const w = Math.max(minDim, Math.min(maxW, s.anchorX - clampedX));
            const h = Math.max(minDim, Math.min(maxH, clampedY - s.anchorY));
            newW = Math.min(w, s.anchorX);
            newH = Math.min(h, dispH - s.anchorY);
            if (focusLockAR) {
              const ar = Math.max(0.0001, focusARRef.current || 1);
              const maxWLimit = Math.min(s.anchorX, maxW);
              const maxHLimit = Math.min(dispH - s.anchorY, maxH);
              const wCand = Math.min(w, maxWLimit);
              const hCand = Math.min(h, maxHLimit);
              let wFinal = Math.max(
                minDim,
                Math.min(wCand, hCand * ar, maxWLimit, maxHLimit * ar)
              );
              let hFinal = Math.max(
                minDim,
                Math.min(hCand, wCand / ar, maxHLimit, maxWLimit / ar)
              );
              wFinal = Math.min(wFinal, hFinal * ar);
              hFinal = Math.min(hFinal, wFinal / ar);
              newW = wFinal;
              newH = hFinal;
            }
            newCx = s.anchorX - newW / 2;
            newCy = s.anchorY + newH / 2;
            break;
          }
          case "n": {
            const clampedY = Math.max(0, Math.min(dispH, py));
            const h = Math.max(minDim, Math.min(maxH, s.anchorY - clampedY));
            newH = Math.min(h, s.anchorY);
            newW = s.startW;
            if (focusLockAR) {
              const ar = Math.max(0.0001, focusARRef.current || 1);
              const horiz = Math.min(
                2 * Math.min(s.anchorX, dispW - s.anchorX),
                maxW
              );
              let wFromH = Math.max(minDim, Math.min(horiz, newH * ar));
              let hFromW = Math.max(minDim, Math.min(newH, wFromH / ar));
              newW = wFromH;
              newH = hFromW;
            }
            newCx = s.anchorX;
            newCy = s.anchorY - newH / 2;
            break;
          }
          case "s": {
            const clampedY = Math.max(0, Math.min(dispH, py));
            const h = Math.max(minDim, Math.min(maxH, clampedY - s.anchorY));
            newH = Math.min(h, dispH - s.anchorY);
            newW = s.startW;
            if (focusLockAR) {
              const ar = Math.max(0.0001, focusARRef.current || 1);
              const horiz = Math.min(
                2 * Math.min(s.anchorX, dispW - s.anchorX),
                maxW
              );
              let wFromH = Math.max(minDim, Math.min(horiz, newH * ar));
              let hFromW = Math.max(minDim, Math.min(newH, wFromH / ar));
              newW = wFromH;
              newH = hFromW;
            }
            newCx = s.anchorX;
            newCy = s.anchorY + newH / 2;
            break;
          }
          case "e": {
            const clampedX = Math.max(0, Math.min(dispW, px));
            const w = Math.max(minDim, Math.min(maxW, clampedX - s.anchorX));
            newW = Math.min(w, dispW - s.anchorX);
            newH = s.startH;
            if (focusLockAR) {
              const ar = Math.max(0.0001, focusARRef.current || 1);
              const vert = Math.min(
                2 * Math.min(s.anchorY, dispH - s.anchorY),
                maxH
              );
              let hFromW = Math.max(minDim, Math.min(vert, newW / ar));
              let wFromH = Math.max(minDim, Math.min(newW, hFromW * ar));
              newW = wFromH;
              newH = hFromW;
            }
            newCx = s.anchorX + newW / 2;
            newCy = s.anchorY;
            break;
          }
          case "w": {
            const clampedX = Math.max(0, Math.min(dispW, px));
            const w = Math.max(minDim, Math.min(maxW, s.anchorX - clampedX));
            newW = Math.min(w, s.anchorX);
            newH = s.startH;
            if (focusLockAR) {
              const ar = Math.max(0.0001, focusARRef.current || 1);
              const vert = Math.min(
                2 * Math.min(s.anchorY, dispH - s.anchorY),
                maxH
              );
              let hFromW = Math.max(minDim, Math.min(vert, newW / ar));
              let wFromH = Math.max(minDim, Math.min(newW, hFromW * ar));
              newW = wFromH;
              newH = hFromW;
            }
            newCx = s.anchorX - newW / 2;
            newCy = s.anchorY;
            break;
          }
        }

        let l = newCx - newW / 2;
        let t = newCy - newH / 2;
        l = Math.max(0, Math.min(dispW - newW, Math.floor(l)));
        t = Math.max(0, Math.min(dispH - newH, Math.floor(t)));
        newCx = Math.floor(l + newW / 2);
        newCy = Math.floor(t + newH / 2);

        setFocusBoxFW(newW / Math.max(1, dispW));
        setFocusBoxFH(newH / Math.max(1, dispH));
        setFocusBoxCX(newCx / Math.max(1, dispW));
        setFocusBoxCY(newCy / Math.max(1, dispH));
        try {
          ev.preventDefault();
        } catch {}
      };
      const onUp = () => {
        try {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
        } catch {}
        dragStateRef.current = null;
      };
      window.addEventListener("pointermove", onMove, { passive: false });
      window.addEventListener("pointerup", onUp, { passive: true });
    } catch {}
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
    if (focusOn) {
      let fw = Math.floor(
        (focusBoxFW || focusBoxFrac || FOCUS_BOX_FRACTION) * outW
      );
      let fh = Math.floor(
        (focusBoxFH || focusBoxFrac || FOCUS_BOX_FRACTION) * outH
      );
      let fx = Math.floor((outW - fw) / 2);
      let fy = Math.floor((outH - fh) / 2);
      try {
        const dispW = cameraViewSize.w;
        const dispH = cameraViewSize.h;
        if (dispW > 0 && dispH > 0 && vw > 0 && vh > 0) {
          const s = Math.max(dispW / vw, dispH / vh);
          const scaledW = vw * s;
          const scaledH = vh * s;
          const offsetX = Math.max(0, (scaledW - dispW) / 2);
          const offsetY = Math.max(0, (scaledH - dispH) / 2);
          const boxWDisp =
            (focusBoxFW || focusBoxFrac || FOCUS_BOX_FRACTION) * dispW;
          const boxHDisp =
            (focusBoxFH || focusBoxFrac || FOCUS_BOX_FRACTION) * dispH;
          fw = Math.max(1, Math.floor(boxWDisp / s));
          fh = Math.max(1, Math.floor(boxHDisp / s));
          const cxDisp =
            (typeof focusBoxCX === "number" ? focusBoxCX : 0.5) * dispW;
          const cyDisp =
            (typeof focusBoxCY === "number" ? focusBoxCY : 0.5) * dispH;
          const cxVid = (cxDisp + offsetX) / s;
          const cyVid = (cyDisp + offsetY) / s;
          fx = Math.max(0, Math.min(outW - fw, Math.floor(cxVid - fw / 2)));
          fy = Math.max(0, Math.min(outH - fh, Math.floor(cyVid - fh / 2)));
        }
      } catch {}
      ctx.save();
      ctx.lineWidth = Math.max(3, Math.floor(outW * 0.01));
      ctx.strokeStyle = "#ef4444";
      ctx.strokeRect(fx, fy, fw, fh);
      ctx.restore();
    }
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
                  Main: {lot.files.length} | Extra:{" "}
                  {lot.extraFiles?.length || 0} | Video:{" "}
                  {lot.videoFiles?.length || 0}
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

              {!lots[activeIdx]?.mode && (
                <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
                  <span className="font-medium">Required:</span> Select a mode
                  for this lot
                </div>
              )}
              {(lots[activeIdx]?.files?.length ?? 0) === 0 && (
                <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
                  <span className="font-medium">Required:</span> Add 1–30 images
                </div>
              )}

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

              {/* Images grid (main images for processing) */}
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {lots[activeIdx].files.map((f, i) => {
                  const url = URL.createObjectURL(f);
                  const isCover = lots[activeIdx].coverIndex === i;
                  const key = getFileKey(f);
                  const annCount = (lots[activeIdx].annotations?.[key] || [])
                    .length;
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
                      <div className="absolute inset-x-0 bottom-1 flex justify-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
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
                          <div className="absolute inset-x-0 bottom-1 flex justify-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
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
                          <div className="absolute inset-x-0 bottom-1 flex justify-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
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
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 overflow-hidden touch-none overscroll-contain select-none">
            <div className="relative w-full h-full max-w-none max-h-full overflow-hidden flex flex-col rounded-none border-0 bg-black/30 ring-0 shadow-none">
              <div
                className="relative flex-1 min-h-0 bg-black"
                ref={cameraViewRef}
              >
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

                {focusOn && (
                  <div
                    className="pointer-events-auto absolute inset-0 z-10"
                    style={{ touchAction: "none" }}
                    onTouchStart={(e) => {
                      if (e.touches.length >= 2) {
                        const dx = e.touches[0].clientX - e.touches[1].clientX;
                        const dy = e.touches[0].clientY - e.touches[1].clientY;
                        const dist = Math.hypot(dx, dy) || 1;
                        pinchStateRef.current = {
                          active: true,
                          startDist: dist,
                          startFW:
                            focusBoxFW || focusBoxFrac || FOCUS_BOX_FRACTION,
                          startFH:
                            focusBoxFH || focusBoxFrac || FOCUS_BOX_FRACTION,
                        };
                      }
                    }}
                    onTouchMove={(e) => {
                      const s = pinchStateRef.current;
                      if (!s?.active || e.touches.length < 2) return;
                      const dx = e.touches[0].clientX - e.touches[1].clientX;
                      const dy = e.touches[0].clientY - e.touches[1].clientY;
                      const dist = Math.hypot(dx, dy) || 1;
                      const ratio = dist / (s.startDist || 1);
                      const dispW = cameraViewSize.w || 1;
                      const dispH = cameraViewSize.h || 1;
                      const cx =
                        (typeof focusBoxCX === "number" ? focusBoxCX : 0.5) *
                        dispW;
                      const cy =
                        (typeof focusBoxCY === "number" ? focusBoxCY : 0.5) *
                        dispH;
                      const startFW = s.startFW || 0.62;
                      const startFH = s.startFH || 0.62;
                      if (focusLockAR) {
                        const maxHalfW = Math.min(cx, dispW - cx);
                        const maxHalfH = Math.min(cy, dispH - cy);
                        const maxFW = Math.max(
                          0,
                          (2 * maxHalfW) / Math.max(1, dispW)
                        );
                        const maxFH = Math.max(
                          0,
                          (2 * maxHalfH) / Math.max(1, dispH)
                        );
                        const minScaleByW = 40 / Math.max(1, startFW * dispW);
                        const minScaleByH = 40 / Math.max(1, startFH * dispH);
                        const sMin = Math.max(minScaleByW, minScaleByH);
                        const sMaxW =
                          (maxFW > 0 ? maxFW : 0.98) /
                          Math.max(0.0001, startFW);
                        const sMaxH =
                          (maxFH > 0 ? maxFH : 0.98) /
                          Math.max(0.0001, startFH);
                        const sMax = Math.max(0.0001, Math.min(sMaxW, sMaxH));
                        const sClamped = Math.max(sMin, Math.min(sMax, ratio));
                        const nextFW = Math.max(
                          40 / dispW,
                          Math.min(0.98, startFW * sClamped)
                        );
                        const nextFH = Math.max(
                          40 / dispH,
                          Math.min(0.98, startFH * sClamped)
                        );
                        setFocusBoxFW(nextFW);
                        setFocusBoxFH(nextFH);
                      } else {
                        let nextFW = startFW * ratio;
                        let nextFH = startFH * ratio;
                        const minW = 40 / Math.max(1, dispW);
                        const minH = 40 / Math.max(1, dispH);
                        const maxWByCenter =
                          (2 * Math.min(cx, dispW - cx)) / Math.max(1, dispW);
                        const maxHByCenter =
                          (2 * Math.min(cy, dispH - cy)) / Math.max(1, dispH);
                        nextFW = Math.max(
                          minW,
                          Math.min(0.98, Math.min(nextFW, maxWByCenter || 0.98))
                        );
                        nextFH = Math.max(
                          minH,
                          Math.min(0.98, Math.min(nextFH, maxHByCenter || 0.98))
                        );
                        setFocusBoxFW(nextFW);
                        setFocusBoxFH(nextFH);
                      }
                    }}
                    onTouchEnd={(e) => {
                      if (e.touches.length < 2) pinchStateRef.current = null;
                    }}
                  >
                    <div
                      onPointerDown={(e) => startDrag("move", e)}
                      className="absolute border-4 border-red-500 rounded-sm"
                      style={{
                        width:
                          cameraViewSize.w > 0
                            ? Math.round(
                                (focusBoxFW ||
                                  focusBoxFrac ||
                                  FOCUS_BOX_FRACTION) * cameraViewSize.w
                              )
                            : undefined,
                        height:
                          cameraViewSize.h > 0
                            ? Math.round(
                                (focusBoxFH ||
                                  focusBoxFrac ||
                                  FOCUS_BOX_FRACTION) * cameraViewSize.h
                              )
                            : undefined,
                        left:
                          cameraViewSize.w > 0
                            ? Math.round(
                                (typeof focusBoxCX === "number"
                                  ? focusBoxCX
                                  : 0.5) *
                                  cameraViewSize.w -
                                  ((focusBoxFW ||
                                    focusBoxFrac ||
                                    FOCUS_BOX_FRACTION) *
                                    cameraViewSize.w) /
                                    2
                              )
                            : undefined,
                        top:
                          cameraViewSize.h > 0
                            ? Math.round(
                                (typeof focusBoxCY === "number"
                                  ? focusBoxCY
                                  : 0.5) *
                                  cameraViewSize.h -
                                  ((focusBoxFH ||
                                    focusBoxFrac ||
                                    FOCUS_BOX_FRACTION) *
                                    cameraViewSize.h) /
                                    2
                              )
                            : undefined,
                        cursor: "move",
                      }}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        const dispW = cameraViewSize.w;
                        const dispH = cameraViewSize.h;
                        if (!(dispW > 0 && dispH > 0)) return;
                        const step = e.shiftKey ? 5 : 1;
                        const w =
                          (focusBoxFW || focusBoxFrac || FOCUS_BOX_FRACTION) *
                          dispW;
                        const h =
                          (focusBoxFH || focusBoxFrac || FOCUS_BOX_FRACTION) *
                          dispH;
                        let cx =
                          (typeof focusBoxCX === "number" ? focusBoxCX : 0.5) *
                          dispW;
                        let cy =
                          (typeof focusBoxCY === "number" ? focusBoxCY : 0.5) *
                          dispH;
                        if (e.key === "ArrowLeft") cx -= step;
                        else if (e.key === "ArrowRight") cx += step;
                        else if (e.key === "ArrowUp") cy -= step;
                        else if (e.key === "ArrowDown") cy += step;
                        else return;
                        cx = Math.max(
                          w / 2,
                          Math.min(dispW - w / 2, Math.round(cx))
                        );
                        cy = Math.max(
                          h / 2,
                          Math.min(dispH - h / 2, Math.round(cy))
                        );
                        setFocusBoxCX(cx / Math.max(1, dispW));
                        setFocusBoxCY(cy / Math.max(1, dispH));
                        try {
                          e.preventDefault();
                          e.stopPropagation();
                        } catch {}
                      }}
                    >
                      <div
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          startDrag("nw", e);
                        }}
                        style={{
                          position: "absolute",
                          left: -8,
                          top: -8,
                          width: 16,
                          height: 16,
                          background: "#fff",
                          border: "2px solid #ef4444",
                          borderRadius: 4,
                          cursor: "nwse-resize",
                          touchAction: "none",
                        }}
                      />
                      <div
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          startDrag("ne", e);
                        }}
                        style={{
                          position: "absolute",
                          right: -8,
                          top: -8,
                          width: 16,
                          height: 16,
                          background: "#fff",
                          border: "2px solid #ef4444",
                          borderRadius: 4,
                          cursor: "nesw-resize",
                          touchAction: "none",
                        }}
                      />
                      <div
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          startDrag("se", e);
                        }}
                        style={{
                          position: "absolute",
                          right: -8,
                          bottom: -8,
                          width: 16,
                          height: 16,
                          background: "#fff",
                          border: "2px solid #ef4444",
                          borderRadius: 4,
                          cursor: "nwse-resize",
                          touchAction: "none",
                        }}
                      />
                      <div
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          startDrag("sw", e);
                        }}
                        style={{
                          position: "absolute",
                          left: -8,
                          bottom: -8,
                          width: 16,
                          height: 16,
                          background: "#fff",
                          border: "2px solid #ef4444",
                          borderRadius: 4,
                          cursor: "nesw-resize",
                          touchAction: "none",
                        }}
                      />
                      <div
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          startDrag("n", e);
                        }}
                        style={{
                          position: "absolute",
                          left: "50%",
                          top: -8,
                          transform: "translateX(-50%)",
                          width: 24,
                          height: 12,
                          background: "#fff",
                          border: "2px solid #ef4444",
                          borderRadius: 4,
                          cursor: "ns-resize",
                          touchAction: "none",
                        }}
                      />
                      <div
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          startDrag("s", e);
                        }}
                        style={{
                          position: "absolute",
                          left: "50%",
                          bottom: -8,
                          transform: "translateX(-50%)",
                          width: 24,
                          height: 12,
                          background: "#fff",
                          border: "2px solid #ef4444",
                          borderRadius: 4,
                          cursor: "ns-resize",
                          touchAction: "none",
                        }}
                      />
                      <div
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          startDrag("e", e);
                        }}
                        style={{
                          position: "absolute",
                          top: "50%",
                          right: -8,
                          transform: "translateY(-50%)",
                          width: 12,
                          height: 24,
                          background: "#fff",
                          border: "2px solid #ef4444",
                          borderRadius: 4,
                          cursor: "ew-resize",
                          touchAction: "none",
                        }}
                      />
                      <div
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          startDrag("w", e);
                        }}
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: -8,
                          transform: "translateY(-50%)",
                          width: 12,
                          height: 24,
                          background: "#fff",
                          border: "2px solid #ef4444",
                          borderRadius: 4,
                          cursor: "ew-resize",
                          touchAction: "none",
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Top overlay: counters / flash */}
                <div className="pointer-events-auto absolute top-0 left-0 right-0 z-30">
                  <div
                    className={`w-full px-1.5 sm:px-2`}
                    style={{
                      paddingTop: "calc(env(safe-area-inset-top) + 2px)",
                      paddingBottom: 0,
                    }}
                  >
                    <div className="sm:hidden text-white">
                      {orientation !== "landscape" ? (
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={finishAndClose}
                              className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg bg-white/10 px-2 py-1 ring-1 ring-white/20 hover:bg-white/15"
                              title="Exit"
                            >
                              <X className="h-5 w-5" />
                              <span className="text-[13px]">Exit</span>
                            </button>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={async () => {
                                  setFlashOn((v) => !v);
                                  try {
                                    const stream = videoRef.current
                                      ?.srcObject as MediaStream | null;
                                    const track =
                                      stream?.getVideoTracks?.()[0] as any;
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
                                className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg bg-white/10 px-2 py-1 ring-1 ring-white/20 hover:bg-white/15"
                                title="Flash"
                              >
                                {flashOn ? (
                                  <Zap className="h-5 w-5 text-yellow-300" />
                                ) : (
                                  <ZapOff className="h-5 w-5" />
                                )}
                                <span className="text-[12px]">
                                  {flashOn ? "On" : "Off"}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setFocusOn((v) => !v)}
                                className={`inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg px-2 py-1 ring-1 ring-white/20 hover:bg-white/15 ${
                                  focusOn
                                    ? "bg-red-600/80 text-white"
                                    : "bg-white/10 text-white"
                                }`}
                                title="Focus"
                              >
                                <span className="text-[13px]">Focus</span>
                                <span className="text-[11px] ml-1 opacity-90">
                                  {focusOn ? "On" : "Off"}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const dispW = cameraViewSize.w;
                                  const dispH = cameraViewSize.h;
                                  setFocusLockAR((prev) => {
                                    const next = !prev;
                                    if (next) {
                                      const fw =
                                        (focusBoxFW ||
                                          focusBoxFrac ||
                                          FOCUS_BOX_FRACTION) * (dispW || 1);
                                      const fh =
                                        (focusBoxFH ||
                                          focusBoxFrac ||
                                          FOCUS_BOX_FRACTION) * (dispH || 1);
                                      const ar = Math.max(
                                        0.0001,
                                        fw / Math.max(1, fh)
                                      );
                                      focusARRef.current = ar;
                                    }
                                    return next;
                                  });
                                }}
                                className={`inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg px-2 py-1 ring-1 ring-white/20 hover:bg-white/15 ${
                                  focusLockAR
                                    ? "bg-red-600/80 text-white"
                                    : "bg-white/10 text-white"
                                }`}
                                title="Aspect Lock"
                                aria-label="Aspect Lock"
                              >
                                {focusLockAR ? (
                                  <Lock className="h-4 w-4" />
                                ) : (
                                  <Unlock className="h-4 w-4" />
                                )}
                                <span className="text-[12px] ml-1">
                                  {focusLockAR ? "Lock On" : "Lock Off"}
                                </span>
                              </button>
                            </div>
                          </div>
                          <div className="mt-0.5 text-center text-[12px] font-medium truncate">
                            Total:{" "}
                            {lots.reduce((s, l) => s + l.files.length, 0)}/
                            {maxTotalImages}
                            {" | "}Lot {activeIdx + 1}:{" "}
                            {lots[activeIdx]?.files.length ?? 0}/
                            {maxImagesPerLot} (Main)
                            {" | "}Extra:{" "}
                            {lots[activeIdx]?.extraFiles.length ?? 0}/
                            {maxExtraImagesPerLot}
                            {" | "}Mode:{" "}
                            {lots[activeIdx]?.mode === "single_lot"
                              ? "Bundle"
                              : lots[activeIdx]?.mode === "per_item"
                              ? "Per Item"
                              : lots[activeIdx]?.mode === "per_photo"
                              ? "Per Photo"
                              : "—"}
                            {isRecording && (
                              <>
                                {" | "}REC {formatTimer(recMillis)}
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-row flex-nowrap items-center justify-between gap-2 w-full">
                          <button
                            type="button"
                            onClick={finishAndClose}
                            className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg bg-white/10 px-2 py-1 ring-1 ring-white/20 hover:bg-white/15 shrink-0"
                            title="Exit"
                            aria-label="Exit"
                          >
                            <X className="h-5 w-5" />
                            <span className="text-[14px] leading-none font-medium whitespace-nowrap">
                              Exit
                            </span>
                          </button>
                          <div className="min-w-0 flex-1 text-center overflow-hidden px-2">
                            <span
                              className="block truncate whitespace-nowrap leading-none font-semibold tracking-tight"
                              style={{ fontSize: "clamp(14px, 3vw, 18px)" }}
                            >
                              Total:{" "}
                              {lots.reduce((s, l) => s + l.files.length, 0)}/
                              {maxTotalImages}
                              {" | "}Lot {activeIdx + 1}:{" "}
                              {lots[activeIdx]?.files.length ?? 0}/
                              {maxImagesPerLot} (Main)
                              {" | "}Extra:{" "}
                              {lots[activeIdx]?.extraFiles.length ?? 0}/
                              {maxExtraImagesPerLot}
                              {" | "}Mode:{" "}
                              {lots[activeIdx]?.mode === "single_lot"
                                ? "Bundle"
                                : lots[activeIdx]?.mode === "per_item"
                                ? "Per Item"
                                : lots[activeIdx]?.mode === "per_photo"
                                ? "Per Photo"
                                : "—"}
                              {isRecording &&
                                ` | REC ${formatTimer(recMillis)}`}
                            </span>
                          </div>
                          <div className="flex items-center justify-end gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={async () => {
                                setFlashOn((v) => !v);
                                try {
                                  const stream = videoRef.current
                                    ?.srcObject as MediaStream | null;
                                  const track =
                                    stream?.getVideoTracks?.()[0] as any;
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
                              className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg bg-white/10 px-2 py-1 ring-1 ring-white/20 hover:bg-white/15 whitespace-nowrap"
                              title="Flash"
                              aria-label="Flash"
                            >
                              {flashOn ? (
                                <Zap className="h-5 w-5 text-yellow-300" />
                              ) : (
                                <ZapOff className="h-5 w-5" />
                              )}
                              <span className="text-[13px] leading-none whitespace-nowrap">
                                {flashOn ? "On" : "Off"}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setFocusOn((v) => !v)}
                              className={`inline-flex h-9 cursor-pointer items-center rounded-lg px-2 ring-1 ring-white/20 hover:bg-white/15 whitespace-nowrap ${
                                focusOn
                                  ? "bg-red-600/80 text-white"
                                  : "bg-white/10 text-white"
                              }`}
                              title="Focus"
                              aria-label="Focus"
                            >
                              <span className="text-[13px] leading-none whitespace-nowrap">
                                Focus
                              </span>
                              <span className="text-[12px] ml-1 opacity-90 whitespace-nowrap">
                                {focusOn ? "On" : "Off"}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const dispW = cameraViewSize.w;
                                const dispH = cameraViewSize.h;
                                setFocusLockAR((prev) => {
                                  const next = !prev;
                                  if (next) {
                                    const fw =
                                      (focusBoxFW ||
                                        focusBoxFrac ||
                                        FOCUS_BOX_FRACTION) * (dispW || 1);
                                    const fh =
                                      (focusBoxFH ||
                                        focusBoxFrac ||
                                        FOCUS_BOX_FRACTION) * (dispH || 1);
                                    const ar = Math.max(
                                      0.0001,
                                      fw / Math.max(1, fh)
                                    );
                                    focusARRef.current = ar;
                                  }
                                  return next;
                                });
                              }}
                              className={`inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg px-2 ring-1 ring-white/20 hover:bg-white/15 whitespace-nowrap ${
                                focusLockAR
                                  ? "bg-red-600/80 text-white"
                                  : "bg-white/10 text-white"
                              }`}
                              title="Aspect Lock"
                              aria-label="Aspect Lock"
                            >
                              {focusLockAR ? (
                                <Lock className="h-4 w-4" />
                              ) : (
                                <Unlock className="h-4 w-4" />
                              )}
                              <span className="text-[12px] ml-1 whitespace-nowrap">
                                {focusLockAR ? "Lock On" : "Lock Off"}
                              </span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="hidden sm:flex flex-row flex-nowrap w-full items-center justify-between gap-2 text-[15px] leading-tight text-white">
                      <button
                        type="button"
                        onClick={finishAndClose}
                        className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg bg-white/10 px-2 py-0 ring-1 ring-white/20 hover:bg-white/15 shrink-0"
                        title="Exit"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Exit</span>
                      </button>
                      <div className="min-w-0 flex-1 text-center overflow-hidden px-2">
                        <span
                          className="block truncate leading-none text-white/95"
                          title={`Total: ${lots.reduce(
                            (s, l) => s + l.files.length,
                            0
                          )}/${maxTotalImages} | Lot ${activeIdx + 1}: ${
                            lots[activeIdx]?.files.length ?? 0
                          }/${maxImagesPerLot} (Main) | Extra: ${
                            lots[activeIdx]?.extraFiles.length ?? 0
                          }/${maxExtraImagesPerLot} | Mode: ${
                            lots[activeIdx]?.mode === "single_lot"
                              ? "Bundle"
                              : lots[activeIdx]?.mode === "per_item"
                              ? "Per Item"
                              : lots[activeIdx]?.mode === "per_photo"
                              ? "Per Photo"
                              : "—"
                          }${
                            isRecording
                              ? ` | REC ${formatTimer(recMillis)}`
                              : ""
                          }`}
                        >
                          Total: {lots.reduce((s, l) => s + l.files.length, 0)}/
                          {maxTotalImages}
                          {" | "}Lot {activeIdx + 1}:{" "}
                          {lots[activeIdx]?.files.length ?? 0}/{maxImagesPerLot}{" "}
                          (Main)
                          {" | "}Extra:{" "}
                          {lots[activeIdx]?.extraFiles.length ?? 0}/
                          {maxExtraImagesPerLot}
                          {" | "}Mode:{" "}
                          {lots[activeIdx]?.mode === "single_lot"
                            ? "Bundle"
                            : lots[activeIdx]?.mode === "per_item"
                            ? "Per Item"
                            : lots[activeIdx]?.mode === "per_photo"
                            ? "Per Photo"
                            : "—"}
                          {isRecording && (
                            <>
                              {" | "}REC {formatTimer(recMillis)}
                            </>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={async () => {
                            setFlashOn((v) => !v);
                            try {
                              const stream = videoRef.current
                                ?.srcObject as MediaStream | null;
                              const track =
                                stream?.getVideoTracks?.()[0] as any;
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
                          className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg bg-white/10 px-2 py-0 ring-1 ring-white/20 hover:bg-white/15"
                          title="Flash"
                        >
                          {flashOn ? (
                            <Zap className="h-3.5 w-3.5 text-yellow-300" />
                          ) : (
                            <ZapOff className="h-3.5 w-3.5" />
                          )}
                          <span>{flashOn ? "On" : "Off"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFocusOn((v) => !v)}
                          className={`inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg px-2 py-0 ring-1 ring-white/20 hover:bg-white/15 ${
                            focusOn
                              ? "bg-red-600/80 text-white"
                              : "bg-white/10 text-white"
                          }`}
                          title="Focus"
                        >
                          <span>Focus</span>
                          <span className="text-[12px] ml-1 opacity-90">
                            {focusOn ? "On" : "Off"}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const dispW = cameraViewSize.w;
                            const dispH = cameraViewSize.h;
                            setFocusLockAR((prev) => {
                              const next = !prev;
                              if (next) {
                                const fw =
                                  (focusBoxFW ||
                                    focusBoxFrac ||
                                    FOCUS_BOX_FRACTION) * (dispW || 1);
                                const fh =
                                  (focusBoxFH ||
                                    focusBoxFrac ||
                                    FOCUS_BOX_FRACTION) * (dispH || 1);
                                const ar = Math.max(
                                  0.0001,
                                  fw / Math.max(1, fh)
                                );
                                focusARRef.current = ar;
                              }
                              return next;
                            });
                          }}
                          className={`inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg px-2 py-0 ring-1 ring-white/20 hover:bg-white/15 ${
                            focusLockAR
                              ? "bg-red-600/80 text-white"
                              : "bg-white/10 text-white"
                          }`}
                          title="Aspect Lock"
                        >
                          {focusLockAR ? (
                            <Lock className="h-3.5 w-3.5" />
                          ) : (
                            <Unlock className="h-3.5 w-3.5" />
                          )}
                          <span className="text-[12px] ml-1">
                            {focusLockAR ? "Lock On" : "Lock Off"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Landscape: All controls on right side */}
                {orientation === "landscape" && (
                  <div className="pointer-events-auto absolute right-0 z-30 flex flex-col justify-between py-1" style={{ top: 'calc(env(safe-area-inset-top) + 45px)', bottom: 'max(env(safe-area-inset-bottom), 4px)', height: 'calc(100vh - env(safe-area-inset-top) - max(env(safe-area-inset-bottom), 4px) - 45px)' }}>
                    {/* Zoom controls at top */}
                    <div className="flex items-center gap-1 rounded-lg bg-black/40 px-1.5 py-0.5 ring-1 ring-white/10 backdrop-blur flex-shrink-0">
                      <ZoomOut className="h-3 w-3 text-white/90" />
                      <input
                        type="range"
                        min={1}
                        max={5}
                        step={0.1}
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="w-[65px] accent-rose-500 cursor-pointer text-[16px]"
                      />
                      <ZoomIn className="h-3 w-3 text-white/90" />
                      <div className="w-6 text-right text-[9px] text-white/90">
                        {zoom.toFixed(1)}x
                      </div>
                    </div>
                    
                    {/* All buttons group - fills remaining space */}
                    <div className="flex flex-col gap-0.5 flex-1 min-h-0">
                    {/* Capture buttons */}
                    <div className="flex items-stretch gap-0.5 flex-1">
                      <button
                        type="button"
                        onClick={() => handleCapture("single_lot")}
                        className="h-11 flex-1 inline-flex cursor-pointer items-center justify-center gap-0.5 rounded-full bg-gradient-to-b from-rose-500/60 to-rose-600/60 text-[9px] font-semibold text-white shadow-[0_2px_0_0_rgba(190,18,60,0.25)] transition active:translate-y-0.5 active:shadow-[0_1px_0_0_rgba(190,18,60,0.25)] hover:from-rose-400/60 hover:to-rose-600/60"
                        title="Capture - Bundle"
                      >
                        <Camera className="h-3 w-3" /><span className="whitespace-nowrap">Bundle</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCapture("single_lot", true)}
                        className="h-11 flex-1 inline-flex cursor-pointer items-center justify-center rounded-full bg-gradient-to-b from-blue-500/60 to-blue-600/60 text-[9px] font-semibold text-white shadow-[0_2px_0_0_rgba(29,78,216,0.25)] transition active:translate-y-0.5 active:shadow-[0_1px_0_0_rgba(29,78,216,0.25)] hover:from-blue-400/60 hover:to-blue-600/60"
                        title="Capture - Bundle Extra (Report Only)"
                      >
                        <span className="whitespace-nowrap">Extra</span>
                      </button>
                    </div>
                    <div className="flex items-stretch gap-0.5 flex-1">
                      <button
                        type="button"
                        onClick={() => handleCapture("per_item")}
                        className="h-11 flex-1 inline-flex cursor-pointer items-center justify-center gap-0.5 rounded-full bg-gradient-to-b from-rose-500/60 to-rose-600/60 text-[9px] font-semibold text-white shadow-[0_2px_0_0_rgba(190,18,60,0.25)] transition active:translate-y-0.5 active:shadow-[0_1px_0_0_rgba(190,18,60,0.25)] hover:from-rose-400/60 hover:to-rose-600/60"
                        title="Capture - Item"
                      >
                        <Camera className="h-3 w-3" /><span className="whitespace-nowrap">Item</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCapture("per_item", true)}
                        className="h-11 flex-1 inline-flex cursor-pointer items-center justify-center rounded-full bg-gradient-to-b from-blue-500/60 to-blue-600/60 text-[9px] font-semibold text-white shadow-[0_2px_0_0_rgba(29,78,216,0.25)] transition active:translate-y-0.5 active:shadow-[0_1px_0_0_rgba(29,78,216,0.25)] hover:from-blue-400/60 hover:to-blue-600/60"
                        title="Capture - Item Extra (Report Only)"
                      >
                        <span className="whitespace-nowrap">Extra</span>
                      </button>
                    </div>
                    <div className="flex items-stretch gap-0.5 flex-1">
                      <button
                        type="button"
                        onClick={() => handleCapture("per_photo")}
                        className="h-11 flex-1 inline-flex cursor-pointer items-center justify-center gap-0.5 rounded-full bg-gradient-to-b from-rose-500/60 to-rose-600/60 text-[9px] font-semibold text-white shadow-[0_2px_0_0_rgba(190,18,60,0.25)] transition active:translate-y-0.5 active:shadow-[0_1px_0_0_rgba(190,18,60,0.25)] hover:from-rose-400/60 hover:to-rose-600/60"
                        title="Capture - Photo"
                      >
                        <Camera className="h-3 w-3" /><span className="whitespace-nowrap">Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCapture("per_photo", true)}
                        className="h-11 flex-1 inline-flex cursor-pointer items-center justify-center rounded-full bg-gradient-to-b from-blue-500/60 to-blue-600/60 text-[9px] font-semibold text-white shadow-[0_2px_0_0_rgba(29,78,216,0.25)] transition active:translate-y-0.5 active:shadow-[0_1px_0_0_rgba(29,78,216,0.25)] hover:from-blue-400/60 hover:to-blue-600/60"
                        title="Capture - Photo Extra (Report Only)"
                      >
                        <span className="whitespace-nowrap">Extra</span>
                      </button>
                    </div>
                    
                    {/* Record button */}
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
                      className={`h-9 w-full inline-flex cursor-pointer items-center justify-center rounded-full px-1.5 text-[9px] font-semibold ring-1 ring-white/10 ${
                        isRecording
                          ? "bg-yellow-600/60 text-white hover:bg-yellow-700/60"
                          : "bg-yellow-500/60 text-white hover:bg-yellow-600/60"
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
                    
                    {/* Previous/Next navigation buttons */}
                    <div className="flex items-stretch gap-0.5 flex-1">
                      <button
                        type="button"
                        onClick={goPrevLot}
                        disabled={activeIdx <= 0}
                        className="h-8 flex-1 inline-flex items-center justify-center gap-0.5 rounded-md bg-blue-600/60 px-1.5 text-[9px] font-semibold text-white ring-1 ring-white/10 hover:bg-blue-500/60 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                        aria-label="Previous lot"
                      >
                        <ChevronLeft className="h-2.5 w-2.5" />
                        <span>Prev</span>
                      </button>
                      <button
                        type="button"
                        onClick={goNextLot}
                        className="h-8 flex-1 inline-flex items-center justify-center gap-0.5 rounded-md bg-green-600/60 px-1.5 text-[9px] font-semibold text-white ring-1 ring-white/10 hover:bg-green-500/60 cursor-pointer"
                        aria-label="Next lot"
                      >
                        <span>Next</span>
                        <ChevronRight className="h-2.5 w-2.5" />
                      </button>
                    </div>
                    
                    {/* Done button at bottom */}
                    <button
                      type="button"
                      onClick={finishAndClose}
                      className="h-9 w-full inline-flex items-center justify-center gap-1 rounded-xl bg-gradient-to-b from-rose-500/60 to-rose-600/60 text-white shadow-[0_4px_0_0_rgba(190,18,60,0.25)] ring-2 ring-rose-300/30 hover:from-rose-400/60 hover:to-rose-600/60 active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(190,18,60,0.25)] focus:outline-none cursor-pointer flex-shrink-0"
                      aria-label="Done"
                      title="Done"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold">Done</span>
                    </button>
                    </div>
                  </div>
                )}

                {/* Bottom controls - hidden in landscape */}
                {orientation !== "landscape" && (
                  <div
                    ref={bottomControlsRef}
                    className="pointer-events-auto absolute inset-x-0 z-20 border-t border-white/10 bg-black/40 px-2 sm:px-3 py-2 backdrop-blur"
                    style={{
                      bottom: 0,
                      paddingBottom: "calc(env(safe-area-inset-bottom) + 6px)",
                    }}
                  >
                    <div className="mx-auto w-full max-w-[560px] sm:max-w-[780px]">
                      {/* Portrait: zoom above controls */}
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
                      {/* Portrait: 3 button controls */}
                      <div className="grid items-center gap-2 w-full grid-cols-[2fr_1fr_2fr]">
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
                      {/* Row 2: Capture buttons - bottom for portrait */}
                      <div className="mt-2 grid grid-cols-4 gap-2 w-full">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => handleCapture("single_lot")}
                            className="h-7 inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-gradient-to-b from-rose-500 to-rose-600 px-2 text-[10px] font-semibold text-white shadow-[0_3px_0_0_rgba(190,18,60,0.45)] transition active:translate-y-0.5 active:shadow-[0_1px_0_0_rgba(190,18,60,0.45)] hover:from-rose-400 hover:to-rose-600"
                            title="Capture - Bundle"
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
                            title="Capture - Item"
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
                            title="Capture - Photo"
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
                    </div>
                  </div>
                )}

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
