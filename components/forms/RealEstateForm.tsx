"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthContext } from "@/context/AuthContext";
import {
  RealEstateService,
  type RealEstateDetails,
} from "@/services/realEstate";
import { X, Upload, Mic, Square, Camera, Check, Download } from "lucide-react";
import { AIService, type RealEstateDetailsPatch } from "@/services/ai";
import { toast } from "react-toastify";
import RealEstateCamera from "./real-estate/RealEstateCamera";
import JSZip from "jszip";

type Props = {
  onSuccess?: (message?: string) => void;
  onCancel?: () => void;
};

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

const PROG_WEIGHTS = {
  client_upload: 0.25,
  r2_upload: 0.18,
  ai_analysis: 0.2,
  find_comparables: 0.12,
  valuation: 0.08,
  market_trend: 0.05,
  generate_outputs: 0.07,
  finalize: 0.05,
} as const;

const STEPS = [
  { key: "client_upload", label: "Uploading images" },
  { key: "r2_upload", label: "Storing images" },
  { key: "ai_analysis", label: "Analyzing with AI" },
  { key: "find_comparables", label: "Finding comparables" },
  { key: "valuation", label: "Calculating valuation" },
  { key: "market_trend", label: "Fetching market trends" },
  { key: "generate_outputs", label: "Generating files" },
  { key: "finalize", label: "Finalizing" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

const makeInitialStepStates = (): Record<StepKey, "pending" | "active" | "done"> => {
  return STEPS.reduce((acc, step) => {
    acc[step.key] = "pending";
    return acc;
  }, {} as Record<StepKey, "pending" | "active" | "done">);
};

const deriveStepStates = (
  percent: number
): Record<StepKey, "pending" | "active" | "done"> => {
  const states = makeInitialStepStates();
  let previousBoundary = 0;
  STEPS.forEach((step) => {
    const weight = PROG_WEIGHTS[step.key];
    const boundary = previousBoundary + weight * 100;
    if (percent >= boundary - 0.1) {
      states[step.key] = "done";
    } else if (percent >= previousBoundary) {
      states[step.key] = "active";
    }
    previousBoundary = boundary;
  });
  return states;
};

export default function RealEstateForm({ onSuccess, onCancel }: Props) {
  const { user } = useAuthContext();
  const [details, setDetails] = useState<RealEstateDetails>({
    language: "en",
    property_details: {
      owner_name: "",
      address: "",
      land_description: "",
      municipality: "",
      title_number: "",
      parcel_number: "",
      land_area_acres: "",
      source_quarter_section: "",
    },
    report_dates: {
      report_date: isoDate(new Date()),
      effective_date: isoDate(new Date()),
      inspection_date: isoDate(new Date()),
    },
    house_details: {
      year_built: "",
      square_footage: "",
      lot_size_sqft: "",
      number_of_rooms: "",
      number_of_full_bathrooms: "",
      number_of_half_bathrooms: "",
      known_issues: [],
    },
    inspector_info: {
      inspector_name: "",
      company_name: "",
      contact_email: "",
      contact_phone: "",
      credentials: "",
    },
  });

  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const specInputRef = useRef<HTMLInputElement>(null);
  const [specFile, setSpecFile] = useState<File | null>(null);
  const [notesText, setNotesText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressPhase, setProgressPhase] = useState<"idle" | "upload" | "processing" | "done" | "error">("idle");
  const [stepStates, setStepStates] = useState<Record<StepKey, "pending" | "active" | "done">>(makeInitialStepStates);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const jobIdRef = useRef<string | null>(null);
  const pollStartedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (progressPhase === "idle") return;
    setStepStates(deriveStepStates(progressPercent));
  }, [progressPercent, progressPhase]);

  function handleChange<
    K1 extends keyof RealEstateDetails,
    K2 extends keyof RealEstateDetails[K1] & string
  >(section: K1, field: K2, value: string) {
    setDetails((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [field]: value,
      } as any,
    }));
  }

  function handleKnownIssuesChange(value: string) {
    const issues = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setDetails((prev) => ({
      ...prev,
      house_details: {
        ...prev.house_details,
        known_issues: issues,
      },
    }));
  }

  function handleImagesChange(files: FileList | null) {
    if (!files) return;
    const incoming = Array.from(files);
    setImages((prev) => {
      const combined = [...prev, ...incoming];
      if (combined.length > 10) {
        setError("You can upload up to 10 images. Extra files were ignored.");
      } else {
        setError(null);
      }
      return combined.slice(0, 10);
    });
  }

  function addCapturedImages(files: File[]) {
    if (!files || files.length === 0) return;
    setImages((prev) => {
      const combined = [...prev, ...files];
      if (combined.length > 10) {
        toast.warn("Reached maximum of 10 images. Some captures were not added.");
      }
      return combined.slice(0, 10);
    });
  }

  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [images]);

  async function downloadAllImagesZip() {
    try {
      if (images.length === 0) return;
      const zip = new JSZip();
      for (const f of images) zip.file(f.name, f);
      const blob = await zip.generateAsync({ type: "blob" });
      const safePrefix = (details?.property_details?.address || 'real-estate').replace(/[^a-zA-Z0-9_-]/g, '-');
      const zipName = `${safePrefix}-images-${Date.now()}.zip`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = zipName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
    } catch {}
  }

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function mergeNonEmpty<T extends Record<string, any>>(
    prev: T,
    patch?: Partial<T>
  ): T {
    if (!patch) return prev;
    const out: T = { ...prev };
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === undefined) continue;
      if (Array.isArray(value)) {
        if (value.length > 0) (out as any)[key] = value;
        continue;
      }
      if (typeof value === "string") {
        if (value.trim() !== "") (out as any)[key] = value;
        continue;
      }
      (out as any)[key] = value;
    }
    return out;
  }

  function applyPatch(patch: RealEstateDetailsPatch) {
    setDetails((prev) => {
      // Normalize known_issues if it accidentally comes as a string
      let housePatch = patch.house_details;
      const ki: any = (housePatch as any)?.known_issues;
      if (typeof ki === "string") {
        const arr = ki
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);
        housePatch = { ...housePatch, known_issues: arr } as any;
      }

      const merged: RealEstateDetails = {
        ...prev,
        property_details: mergeNonEmpty(
          prev.property_details,
          patch.property_details
        ),
        report_dates: mergeNonEmpty(prev.report_dates, patch.report_dates),
        house_details: mergeNonEmpty(prev.house_details, housePatch),
        inspector_info: mergeNonEmpty(
          prev.inspector_info,
          patch.inspector_info
        ),
      };

      return merged;
    });
  }

  function handleSpecChange(files: FileList | null) {
    if (!files || files.length === 0) {
      setSpecFile(null);
      return;
    }
    setSpecFile(files[0]);
  }

  async function analyzeSpec() {
    if (!specFile) return;
    try {
      setAiLoading(true);
      const patch = await AIService.fillFromSpecSheet(specFile);
      applyPatch(patch);
    } catch (e: any) {
      setError(e?.message || "Failed to analyze spec sheet");
    } finally {
      setAiLoading(false);
    }
  }

  async function fillFromText() {
    const text = notesText.trim();
    if (!text) return;
    try {
      setAiLoading(true);
      const patch = await AIService.fillFromText(text);
      applyPatch(patch);
    } catch (e: any) {
      setError(e?.message || "Failed to process text");
    } finally {
      setAiLoading(false);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
        chunksRef.current = [];
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setError(null);
      setAudioBlob(null);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
      setIsRecording(true);
    } catch (e: any) {
      setError(e?.message || "Unable to access microphone");
    }
  }

  function stopRecording() {
    const mr = mediaRecorderRef.current;
    if (mr && (mr.state === "recording" || mr.state === "paused")) {
      mr.stop();
    }
    setIsRecording(false);
  }

  function clearRecording() {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
  }

  async function useRecording() {
    if (!audioBlob) return;
    try {
      setAiLoading(true);
      const file = new File([audioBlob], "audio.webm", { type: "audio/webm" });
      const patch = await AIService.fillFromAudio(file);
      applyPatch(patch);
    } catch (e: any) {
      setError(e?.message || "Failed to process audio");
    } finally {
      setAiLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!details.property_details.address) {
      setError("Address is required.");
      toast.error("Address is required.");
      return;
    }
    try {
      if (images.length === 0) {
        const msg = "Please add at least one image.";
        setError(msg);
        toast.error(msg);
        return;
      }

      setSubmitting(true);
      setError(null);
      setProgressPhase("upload");
      setProgressPercent(0);
      setStepStates(() => {
        const initial = makeInitialStepStates();
        initial.client_upload = "active";
        return initial;
      });
      pollStartedRef.current = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

      const jobId =
        typeof crypto !== "undefined" && (crypto as any)?.randomUUID
          ? (crypto as any).randomUUID()
          : `cv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      jobIdRef.current = jobId;

      const inspector = {
        inspector_name: (user as any)?.username || (user as any)?.name || "",
        company_name: (user as any)?.companyName || "",
        contact_email: (user as any)?.contactEmail || user?.email || "",
        contact_phone: (user as any)?.contactPhone || "",
        credentials: "",
      };
      const payload: RealEstateDetails = {
        ...details,
        report_dates: {
          report_date: details.report_dates.report_date,
          effective_date: details.report_dates.effective_date,
          inspection_date: details.report_dates.inspection_date,
        },
        inspector_info: inspector,
      };
      payload.progress_id = jobId;

      const startPolling = () => {
        if (!jobIdRef.current || pollStartedRef.current) return;
        pollStartedRef.current = true;
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = setInterval(async () => {
          try {
            const rec = await RealEstateService.progress(jobIdRef.current!);
            const clientWeight = PROG_WEIGHTS.client_upload;
            const server01 = Math.max(0, Math.min(1, rec?.serverProgress01 ?? 0));
            const overall = (clientWeight + server01 * (1 - clientWeight)) * 100;
            setProgressPhase(
              rec.phase === "error"
                ? "error"
                : rec.phase === "done"
                ? "done"
                : "processing"
            );
            setProgressPercent((prev) => (overall > prev ? overall : prev));
            if (rec.message) setError(rec.message);
            if (rec.phase === "done" || rec.phase === "error") {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
            }
          } catch (err) {
            // Ignore early 404/network hiccups
          }
        }, 800);
      };

      const res = await RealEstateService.create(payload, images, {
        onUploadProgress: (fraction: number) => {
          const pct = Math.max(0, Math.min(1, fraction));
          const weighted = pct * PROG_WEIGHTS.client_upload * 100;
          setProgressPhase("upload");
          setProgressPercent((prev) => (weighted > prev ? weighted : prev));
          if (weighted >= PROG_WEIGHTS.client_upload * 100 - 0.5) {
            setStepStates((prev) => ({
              ...prev,
              client_upload: "done",
              r2_upload: prev.r2_upload === "pending" ? "active" : prev.r2_upload,
            }));
            startPolling();
          }
        },
      });

      startPolling();

      const successMsg =
        res?.message ||
        "Your report is being processed. You will receive an email when it's ready.";
      toast.info(successMsg);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("cv:report-created"));
      }
      onSuccess?.(res?.message);
      setProgressPhase("done");
      setProgressPercent((prev) => (prev < 100 ? 100 : prev));
    } catch (err: any) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setProgressPhase("error");
      const msg =
        err?.response?.data?.message || err?.message || "Failed to create report";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="relative">
        {error && (
          <div className="rounded-xl border border-red-200/70 bg-red-50/80 p-3 text-sm text-red-700 shadow ring-1 ring-black/5 backdrop-blur">
            {error}
          </div>
        )}

        {/* Language Selection */}
        <section className="space-y-2">
          <label className="block text-xs font-medium text-gray-700">Language</label>
          <select
            className="mt-1 w-full max-w-xs rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
            value={details.language || "en"}
            onChange={(e) => setDetails((prev) => ({ ...prev, language: e.target.value as any }))}
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="es">Español</option>
          </select>
        </section>

        {/* Smart Fill (AI) */}
        <section className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700">
                Spec Sheet Image
              </label>
              <input
                ref={specInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleSpecChange(e.target.files)}
                className="sr-only"
              />
              <div className="rounded-2xl border-2 border-dashed border-gray-300/70 bg-gradient-to-br from-white/70 to-gray-50/50 p-5 text-center backdrop-blur shadow-inner">
                <p className="text-xs text-gray-600">
                  {specFile ? specFile.name : "No file selected"}
                </p>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => specInputRef.current?.click()}
                    className="rounded-xl border border-gray-200 bg-white/80 px-4 py-2.5 text-sm text-gray-700 shadow hover:bg-white transition active:translate-y-0.5"
                  >
                    Select Image
                  </button>
                  <button
                    type="button"
                    onClick={analyzeSpec}
                    disabled={!specFile || aiLoading}
                    className="rounded-xl bg-gradient-to-b from-gray-900 to-black px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_0_0_rgba(0,0,0,0.5)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(0,0,0,0.5)] disabled:opacity-50 focus:outline-none"
                  >
                    {aiLoading ? "Analyzing..." : "Analyze Image"}
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700">
                Notes / Transcript
              </label>
              <textarea
                className="mt-1 h-28 w-full rounded-2xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fillFromText}
                  disabled={!notesText.trim() || aiLoading}
                  className="rounded-xl bg-gradient-to-b from-gray-900 to-black px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_0_0_rgba(0,0,0,0.5)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(0,0,0,0.5)] disabled:opacity-50 focus:outline-none"
                >
                  {aiLoading ? "Filling..." : "Fill From Text"}
                </button>
              </div>
            </div>
          </div>

          {/* Voice record */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700">
              Voice Record
            </label>
            <div className="flex items-center gap-2">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="rounded-xl bg-gradient-to-b from-gray-900 to-black px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_0_0_rgba(0,0,0,0.5)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(0,0,0,0.5)]"
                >
                  <Mic className="mr-1 inline h-4 w-4" /> Start Recording
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="rounded-xl bg-gradient-to-b from-red-500 to-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_0_0_rgba(220,38,38,0.5)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(220,38,38,0.5)]"
                >
                  <Square className="mr-1 inline h-4 w-4" /> Stop
                </button>
              )}
              <button
                type="button"
                onClick={useRecording}
                disabled={!audioBlob || aiLoading}
                className="rounded-xl bg-gradient-to-b from-gray-900 to-black px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_0_0_rgba(0,0,0,0.5)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(0,0,0,0.5)] disabled:opacity-50"
              >
                {aiLoading ? "Processing..." : "Use Recording to Fill"}
              </button>
              <button
                type="button"
                onClick={clearRecording}
                disabled={!audioBlob}
                className="rounded-xl border border-gray-200 bg-white/80 px-4 py-2.5 text-sm text-gray-700 shadow hover:bg-white transition active:translate-y-0.5 disabled:opacity-50"
              >
                Clear
              </button>
            </div>
            {audioUrl && (
              <audio src={audioUrl} controls className="mt-2 w-full" />
            )}
          </div>
        </section>

        {/* Property Details */}
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900">Property Details</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Owner Name
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
                value={details.property_details.owner_name}
                onChange={(e) =>
                  handleChange("property_details", "owner_name", e.target.value)
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700">
                Address
              </label>
              <input
                required
                className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
                value={details.property_details.address}
                onChange={(e) =>
                  handleChange("property_details", "address", e.target.value)
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700">
                Land Description
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
                value={details.property_details.land_description}
                onChange={(e) =>
                  handleChange(
                    "property_details",
                    "land_description",
                    e.target.value
                  )
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Municipality
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
                value={details.property_details.municipality}
                onChange={(e) =>
                  handleChange("property_details", "municipality", e.target.value)
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Title Number
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
                value={details.property_details.title_number}
                onChange={(e) =>
                  handleChange("property_details", "title_number", e.target.value)
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Parcel Number
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
                value={details.property_details.parcel_number}
                onChange={(e) =>
                  handleChange(
                    "property_details",
                    "parcel_number",
                    e.target.value
                  )
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Land Area (acres)
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
                value={details.property_details.land_area_acres}
                onChange={(e) =>
                  handleChange(
                    "property_details",
                    "land_area_acres",
                    e.target.value
                  )
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Source Quarter Section
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
                value={details.property_details.source_quarter_section}
                onChange={(e) =>
                  handleChange(
                    "property_details",
                    "source_quarter_section",
                    e.target.value
                  )
                }
              />
            </div>
            
        </div>
      </section>

      {/* Report Dates */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900">Report Dates</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Report Date
            </label>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={details.report_dates.report_date}
              onChange={(e) =>
                handleChange("report_dates", "report_date", e.target.value)
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Effective Date
            </label>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={details.report_dates.effective_date}
              onChange={(e) =>
                handleChange("report_dates", "effective_date", e.target.value)
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Inspection Date
            </label>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={details.report_dates.inspection_date}
              onChange={(e) =>
                handleChange("report_dates", "inspection_date", e.target.value)
              }
            />
          </div>
        </div>
      </section>

      {/* House Details */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900">House Details</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Year Built
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={details.house_details.year_built}
              onChange={(e) =>
                handleChange("house_details", "year_built", e.target.value)
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Square Footage
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={details.house_details.square_footage}
              onChange={(e) =>
                handleChange("house_details", "square_footage", e.target.value)
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Lot Size (sqft)
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={details.house_details.lot_size_sqft}
              onChange={(e) =>
                handleChange("house_details", "lot_size_sqft", e.target.value)
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Rooms
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={details.house_details.number_of_rooms}
              onChange={(e) =>
                handleChange("house_details", "number_of_rooms", e.target.value)
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Full Bathrooms
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={details.house_details.number_of_full_bathrooms}
              onChange={(e) =>
                handleChange(
                  "house_details",
                  "number_of_full_bathrooms",
                  e.target.value
                )
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Half Bathrooms
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={details.house_details.number_of_half_bathrooms}
              onChange={(e) =>
                handleChange(
                  "house_details",
                  "number_of_half_bathrooms",
                  e.target.value
                )
              }
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">
            Known Issues (comma separated)
          </label>
          <input
            className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
            value={details.house_details.known_issues.join(", ")}
            onChange={(e) => handleKnownIssuesChange(e.target.value)}
          />
        </div>
      </section>

      {/* Inspector Info is auto-filled from profile on submit */}

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
        <div className="rounded-2xl border-2 border-dashed border-gray-300/70 bg-gradient-to-br from-white/70 to-gray-50/50 p-5 text-center backdrop-blur shadow-inner">
          <Upload className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-700">Add images</p>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-gray-900 to-black px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_0_0_rgba(0,0,0,0.5)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(0,0,0,0.5)] focus:outline-none"
            >
              <Upload className="h-4 w-4" />
              Select Images
            </button>
            <button
              type="button"
              onClick={() => setCameraOpen(true)}
              className="ml-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_0_0_rgba(190,18,60,0.5)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(190,18,60,0.5)] focus:outline-none"
            >
              <Camera className="h-4 w-4" />
              Open Camera
            </button>
            <button
              type="button"
              onClick={downloadAllImagesZip}
              disabled={images.length === 0}
              className="ml-2 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 border border-gray-200 shadow disabled:opacity-50"
              title="Download images as ZIP"
            >
              <Download className="h-4 w-4" />
              Download ZIP
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            PNG, JPG. Up to 10 images.
          </p>
        </div>
        <p className="text-xs text-gray-500">
          Selected: {images.length} file(s)
        </p>
        {images.length > 0 && (
          <div className="rounded-2xl border border-gray-200/70 bg-white/70 p-2 shadow ring-1 ring-black/5 backdrop-blur">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {previews.map((src, idx) => (
                <div
                  key={idx}
                  className="relative group overflow-hidden rounded-xl shadow-md transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-xl"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={images[idx]?.name || `image-${idx + 1}`}
                    className="h-28 w-full object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={() => removeImage(idx)}
                    className="absolute right-1 top-1 rounded-full bg-black/70 p-1.5 text-white shadow-lg hover:bg-black/80 transition"
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
            className="rounded-xl border border-gray-200 bg-white/80 px-4 py-2.5 text-sm text-gray-700 shadow hover:bg-white transition active:translate-y-0.5"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_0_0_rgba(190,18,60,0.5)] hover:from-rose-400 hover:to-rose-600 transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(190,18,60,0.5)] disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? "Creating..." : "Create Report"}
          </button>
        </div>
        {submitting && (
          <div className="mb-3">
            <div className="w-full max-w-xl mx-auto rounded-2xl border border-rose-100/70 bg-white/80 p-4 shadow-2xl ring-1 ring-black/5 backdrop-blur">
              <div className="mb-3 text-sm font-semibold text-gray-900">
                Creating report...
              </div>
              <div className="mb-4 flex items-center justify-between">
                {STEPS.map((s, idx) => {
                  const state = stepStates[s.key];
                  const isDone = state === "done";
                  const isActive = state === "active";
                  return (
                    <div key={s.key} className="flex flex-1 items-center">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold shadow ${
                          isDone
                            ? "border-rose-600 bg-rose-600 text-white shadow-[0_3px_0_0_rgba(190,18,60,0.5)]"
                            : isActive
                            ? "border-rose-600 text-rose-600 ring-2 ring-rose-300 animate-pulse"
                            : "border-gray-300 text-gray-400"
                        }`}
                        title={s.label}
                      >
                        {isDone ? <Check className="h-4 w-4" /> : idx + 1}
                      </div>
                      {idx < STEPS.length - 1 && (
                        <div className="mx-2 h-0.5 flex-1 rounded bg-gradient-to-r from-gray-200 to-gray-100">
                          <div
                            className={`h-0.5 rounded ${
                              isDone
                                ? "bg-gradient-to-r from-rose-500 to-rose-600"
                                : isActive
                                ? "bg-gradient-to-r from-rose-300 to-rose-400"
                                : "bg-transparent"
                            }`}
                          ></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div>
                <div className="h-2 w-full overflow-hidden rounded bg-gray-200">
                  <div
                    className="h-2 rounded bg-gradient-to-r from-rose-500 to-rose-600 transition-all duration-300 shadow-inner"
                    style={{
                      width: `${Math.min(100, Math.max(0, progressPercent)).toFixed(0)}%`,
                    }}
                  ></div>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  {progressPhase === "upload"
                    ? "Uploading images..."
                    : progressPhase === "processing"
                    ? "Analyzing images and generating outputs..."
                    : progressPhase === "done"
                    ? "Finalizing..."
                    : progressPhase === "error"
                    ? "Encountered an error."
                    : "Starting..."}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Camera Overlay */}
      <RealEstateCamera
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onAdd={(files) => addCapturedImages(files)}
        downloadPrefix={(details?.property_details?.address || 'real-estate').replace(/[^a-zA-Z0-9_-]/g, '-')}
        maxCount={10}
      />
    </form>
  );
}
