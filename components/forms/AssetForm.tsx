"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  AssetService,
  type AssetCreateDetails,
  type AssetGroupingMode,
} from "@/services/asset";
import { X, Upload, Check } from "lucide-react";
import { toast } from "react-toastify";
import { useAuthContext } from "@/context/AuthContext";

// Code-split the CatalogueSection for camera-based lot capture
const CatalogueSection = dynamic(() => import("./catalogue/CatalogueSection"), {
  ssr: false,
});
const CombinedCamera = dynamic(() => import("./capture/CombinedCamera"), { ssr: false });

type Props = {
  onSuccess?: (message?: string) => void;
  onCancel?: () => void;
};

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

const DRAFT_KEY = "cv_asset_draft";
const MAX_NON_CAT_IMAGES = 10;

const GROUPING_OPTIONS: {
  value: AssetGroupingMode;
  label: string;
  desc: string;
}[] = [
  {
    value: "single_lot",
    label: "Single Lot",
    desc: "All images are treated as one lot.",
  },
  {
    value: "per_item",
    label: "Per Item",
    desc: "Each item as a distinct lot.",
  },
  {
    value: "per_photo",
    label: "Per Photo",
    desc: "Each image as a distinct lot.",
  },
  {
    value: "catalogue",
    label: "Catalogue Listing",
    desc: "Capture images per lot (max 20 per lot).",
  },
  {
    value: "combined",
    label: "Combined",
    desc: "Capture with in-app camera, then generate Single Lot + Per Item + Per Photo DOCX in one report.",
  },
];

export default function AssetForm({ onSuccess, onCancel }: Props) {
  const { user } = useAuthContext();
  const [grouping, setGrouping] = useState<AssetGroupingMode>("single_lot");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  // Catalogue mode state
  const [catalogueLots, setCatalogueLots] = useState<
    { id: string; files: File[]; coverIndex: number }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Report metadata fields
  const [clientName, setClientName] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(isoDate(new Date())); // YYYY-MM-DD
  const [appraisalPurpose, setAppraisalPurpose] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [appraiser, setAppraiser] = useState(
    (user as any)?.username || (user as any)?.name || ""
  );
  const [appraisalCompany, setAppraisalCompany] = useState(
    (user as any)?.companyName || ""
  );
  const [industry, setIndustry] = useState("");
  const [inspectionDate, setInspectionDate] = useState(isoDate(new Date())); // YYYY-MM-DD

  // Progress UI state
  const PROG_WEIGHTS = {
    client_upload: 0.25,
    r2_upload: 0.15,
    ai_analysis: 0.35,
    generate_docx: 0.2,
    finalize: 0.05,
  } as const;
  const STEPS = [
    { key: "client_upload", label: "Uploading images" },
    { key: "r2_upload", label: "Storing images" },
    { key: "ai_analysis", label: "Analyzing with AI" },
    { key: "generate_docx", label: "Generating DOCX" },
    { key: "finalize", label: "Finalizing" },
  ] as const;
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressPhase, setProgressPhase] = useState<
    "idle" | "upload" | "processing" | "done" | "error"
  >("idle");
  const [stepStates, setStepStates] = useState<
    Record<string, "pending" | "active" | "done">
  >(() => Object.fromEntries(STEPS.map((s) => [s.key, "pending"])));
  const pollIntervalRef = useRef<any>(null);
  const pollStartedRef = useRef(false);
  const jobIdRef = useRef<string | null>(null);

  // Threshold-based step state updates driven by progressPercent
  useEffect(() => {
    if (progressPhase === "idle") return;
    setStepStates((prev) => {
      const next = { ...prev } as Record<string, "pending" | "active" | "done">;
      // Reset all to pending first
      for (const s of STEPS) next[s.key] = "pending";
      const p = progressPercent;
      if (p < 25) {
        next.client_upload = "active";
      } else if (p < 40) {
        next.client_upload = "done";
        next.r2_upload = "active";
      } else if (p < 75) {
        next.client_upload = "done";
        next.r2_upload = "done";
        next.ai_analysis = "active";
      } else if (p < 95) {
        next.client_upload = "done";
        next.r2_upload = "done";
        next.ai_analysis = "done";
        next.generate_docx = "active";
      } else if (p < 100) {
        next.client_upload = "done";
        next.r2_upload = "done";
        next.ai_analysis = "done";
        next.generate_docx = "done";
        next.finalize = "active";
      } else {
        for (const s of STEPS) next[s.key] = "done";
      }
      return next;
    });
  }, [progressPercent, progressPhase]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  function handleImagesChange(files: FileList | null) {
    if (!files) return;
    const incoming = Array.from(files);
    setImages((prev) => {
      const combined = [...prev, ...incoming];
      const trimmed = combined.slice(0, MAX_NON_CAT_IMAGES);
      if (combined.length > MAX_NON_CAT_IMAGES) {
        setError(
          `You can upload up to ${MAX_NON_CAT_IMAGES} images. Extra files were ignored.`
        );
        toast.warn(
          `You can upload up to ${MAX_NON_CAT_IMAGES} images. Extra files were ignored.`
        );
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

  // Backfill fields once user loads, without overwriting user edits
  useEffect(() => {
    if (!appraiser && user) {
      setAppraiser((user as any)?.username || (user as any)?.name || "");
    }
    if (!appraisalCompany && (user as any)?.companyName) {
      setAppraisalCompany((user as any)?.companyName || "");
    }
  }, [user]);

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function clearForm() {
    try {
      setGrouping("single_lot");
      setImages([]);
      setPreviews([]);
      setCatalogueLots([]);
      setError(null);
      setClientName("");
      setEffectiveDate(isoDate(new Date()));
      setAppraisalPurpose("");
      setOwnerName("");
      setAppraiser("");
      setAppraisalCompany("");
      setIndustry("");
      setInspectionDate(isoDate(new Date()));
      onCancel?.();
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.info("Form cleared.");
    } catch {}
  }

  function saveDraft() {
    try {
      const draft = {
        grouping,
        clientName,
        effectiveDate,
        appraisalPurpose,
        ownerName,
        appraiser,
        appraisalCompany,
        industry,
        inspectionDate,
        // Store catalogue meta (counts and covers) but not binary images
        catalogueLots: catalogueLots.map((l) => ({
          coverIndex: l.coverIndex,
          count: l.files.length,
        })),
        imagesCount: images.length,
        savedAt: new Date().toISOString(),
      };
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        toast.success("Draft saved for later.");
      }
    } catch (e) {
      toast.error("Failed to save draft.");
    }
  }

  // Restore a saved draft: only metadata (images are not persisted)
  function restoreDraft(draft: any) {
    try {
      if (!draft) return;
      if (draft.grouping) setGrouping(draft.grouping);
      if (typeof draft.clientName === "string") setClientName(draft.clientName);
      if (typeof draft.effectiveDate === "string")
        setEffectiveDate(draft.effectiveDate);
      if (typeof draft.appraisalPurpose === "string")
        setAppraisalPurpose(draft.appraisalPurpose);
      if (typeof draft.ownerName === "string") setOwnerName(draft.ownerName);
      if (typeof draft.appraiser === "string") setAppraiser(draft.appraiser);
      if (typeof draft.appraisalCompany === "string")
        setAppraisalCompany(draft.appraisalCompany);
      if (typeof draft.industry === "string") setIndustry(draft.industry);
      if (typeof draft.inspectionDate === "string")
        setInspectionDate(draft.inspectionDate);
      toast.success("Draft restored.");
    } catch {}
  }
  const restorePromptedRef = useRef(false);
  useEffect(() => {
    if (restorePromptedRef.current) return;
    try {
      if (typeof localStorage === "undefined") return;
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      restorePromptedRef.current = true;
      const draft = JSON.parse(raw);
      const savedAt = draft?.savedAt ? new Date(draft.savedAt) : null;
      const timeStr = savedAt ? savedAt.toLocaleString() : "";
      const tid = toast.info(
        <div className="space-y-2">
          <div className="text-sm">
            Found a saved draft {timeStr && `from ${timeStr}`}. Restore it?
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md border border-gray-200 bg-white/90 px-2 py-1 text-xs text-gray-700 shadow"
              onClick={() => {
                restoreDraft(draft);
                toast.dismiss(tid);
              }}
            >
              Restore
            </button>
            <button
              type="button"
              className="rounded-md border border-gray-200 bg-white/90 px-2 py-1 text-xs text-gray-700 shadow"
              onClick={() => {
                localStorage.removeItem(DRAFT_KEY);
                toast.dismiss(tid);
              }}
            >
              Discard
            </button>
          </div>
        </div>,
        { autoClose: false }
      ) as any;
    } catch {}
  }, []);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Prepare files + details depending on grouping
    let filesToSend: File[] = images;
    let extraDetails: Partial<AssetCreateDetails> = {};
    if (grouping === "catalogue") {
      const total = catalogueLots.reduce((s, l) => s + l.files.length, 0);
      if (total === 0) {
        const msg = "Please add at least one image (Catalogue).";
        setError(msg);
        toast.error(msg);
        return;
      }
      if (total > 100) {
        const msg = "Maximum 100 images allowed across all lots.";
        setError(msg);
        toast.error(msg);
        return;
      }
      const perLotOk = catalogueLots.every((l) => l.files.length <= 20);
      if (!perLotOk) {
        const msg = "Each lot can have up to 20 images.";
        setError(msg);
        toast.error(msg);
        return;
      }
      filesToSend = catalogueLots.flatMap((l) => l.files);
      extraDetails = {
        catalogue_lots: catalogueLots.map((l) => ({
          count: l.files.length,
          cover_index: Math.max(
            0,
            Math.min(l.files.length - 1, l.coverIndex || 0)
          ),
        })),
      } as Partial<AssetCreateDetails>;
    } else if (grouping === "combined") {
      // Combined: flat images only, max 20
      if (images.length === 0) {
        const msg = "Please add at least one image (Combined).";
        setError(msg);
        toast.error(msg);
        return;
      }
      if (images.length > 20) {
        const msg = "Maximum 20 images allowed in Combined mode.";
        setError(msg);
        toast.error(msg);
        return;
      }
      filesToSend = images;
    } else {
      if (images.length === 0) {
        const msg = "Please add at least one image.";
        setError(msg);
        toast.error(msg);
        return;
      }
      if (images.length > MAX_NON_CAT_IMAGES) {
        const msg = `Maximum ${MAX_NON_CAT_IMAGES} images allowed.`;
        setError(msg);
        toast.error(msg);
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);
      setProgressPhase("upload");
      setProgressPercent(0);
      setStepStates(() => ({
        client_upload: "active",
        r2_upload: "pending",
        ai_analysis: "pending",
        generate_docx: "pending",
        finalize: "pending",
      }));
      pollStartedRef.current = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

      // Generate a job/progress id for server-side tracking
      const jobId =
        typeof crypto !== "undefined" && (crypto as any)?.randomUUID
          ? (crypto as any).randomUUID()
          : `cv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      jobIdRef.current = jobId;

      const payload: AssetCreateDetails = {
        grouping_mode: grouping,
        ...(clientName.trim() && { client_name: clientName.trim() }),
        ...(effectiveDate && { effective_date: effectiveDate }),
        ...(appraisalPurpose.trim() && {
          appraisal_purpose: appraisalPurpose.trim(),
        }),
        ...(ownerName.trim() && { owner_name: ownerName.trim() }),
        ...(appraiser.trim() && { appraiser: appraiser.trim() }),
        ...(appraisalCompany.trim() && {
          appraisal_company: appraisalCompany.trim(),
        }),
        ...(industry.trim() && { industry: industry.trim() }),
        ...(inspectionDate && { inspection_date: inspectionDate }),
        progress_id: jobId,
        ...(grouping === "catalogue" ? extraDetails : {}),
      };

      // Helper to start polling server progress after upload completes
      const startPolling = () => {
        if (!jobIdRef.current) return;
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = setInterval(async () => {
          try {
            const rec = await AssetService.progress(jobIdRef.current!);
            // Map server 0..1 progress (server-side only) to overall 0..100 using client weight
            const clientW = PROG_WEIGHTS.client_upload;
            const server01 = Math.max(
              0,
              Math.min(1, rec?.serverProgress01 ?? 0)
            );
            const overall = (clientW + server01 * (1 - clientW)) * 100;
            setProgressPhase(
              rec.phase === "error"
                ? "error"
                : rec.phase === "done"
                ? "done"
                : "processing"
            );
            setProgressPercent((prev) => (overall > prev ? overall : prev));
            if (rec.phase === "done" || rec.phase === "error") {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          } catch (e: any) {
            // 404/Network during early phase: ignore and keep polling
          }
        }, 800);
      };

      const res = await AssetService.create(payload, filesToSend, {
        onUploadProgress: (fraction: number) => {
          const pct = Math.max(0, Math.min(1, fraction));
          const weighted = pct * PROG_WEIGHTS.client_upload * 100;
          setProgressPhase("upload");
          setProgressPercent((prev) => (weighted > prev ? weighted : prev));
        },
      });

      // Response received: notify and end. Backend will email when ready.
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      const msg =
        res?.message ||
        "Your report is being processed. You will receive an email when it's ready.";
      toast.info(msg);
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.removeItem(DRAFT_KEY);
        }
      } catch {}
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("cv:report-created"));
      }
      onSuccess?.(msg);
      setSubmitting(false);
    } catch (err: any) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setProgressPhase("error");
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create asset report";
      setError(msg);
      toast.error(msg);
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="relative">
        {!submitting && error && (
          <div className="rounded-xl border border-red-200/70 bg-red-50/80 p-3 text-sm text-red-700 shadow ring-1 ring-black/5 backdrop-blur">
            {error}
          </div>
        )}

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
                      width: `${Math.min(
                        100,
                        Math.max(0, progressPercent)
                      ).toFixed(0)}%`,
                    }}
                  ></div>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  {progressPhase === "upload"
                    ? "Uploading images..."
                    : progressPhase === "processing"
                    ? "Analyzing images and generating DOCX..."
                    : progressPhase === "done"
                    ? "Finalizing..."
                    : "Starting..."}
                </div>
              </div>
            </div>
          </div>
        )}

        {!submitting && (
          <>
            {/* Grouping */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900">
                Grouping Mode
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {GROUPING_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`relative flex cursor-pointer items-start gap-3 rounded-2xl border p-3 shadow-sm transition hover:shadow-md ring-1 ring-black/5 backdrop-blur ${
                      grouping === opt.value
                        ? "border-rose-300 ring-rose-200 bg-gradient-to-br from-white to-rose-50"
                        : "border-gray-200 bg-white/80"
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
                      <div className="text-sm font-medium text-gray-900">
                        {opt.label}
                      </div>
                      <div className="text-xs text-gray-600">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* Report Details */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900">
                Report Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Client Name</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g., Acme Corp"
                    className="w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">
                    Appraisal Purpose
                  </label>
                  <input
                    type="text"
                    value={appraisalPurpose}
                    onChange={(e) => setAppraisalPurpose(e.target.value)}
                    placeholder="e.g., Insurance"
                    className="w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Owner Name</label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g., John Doe"
                    className="w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Appraiser</label>
                  <input
                    type="text"
                    value={appraiser}
                    onChange={(e) => setAppraiser(e.target.value)}
                    placeholder="e.g., Jane Smith"
                    className="w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">
                    Appraisal Company
                  </label>
                  <input
                    type="text"
                    value={appraisalCompany}
                    onChange={(e) => setAppraisalCompany(e.target.value)}
                    placeholder="e.g., ClearValue Appraisals"
                    className="w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Industry</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g., Manufacturing"
                    className="w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">
                    Inspection Date
                  </label>
                  <input
                    type="date"
                    value={inspectionDate}
                    onChange={(e) => setInspectionDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
              </div>
            </section>

            {/* Images / Catalogue */}
            {grouping !== "catalogue" && grouping !== "combined" ? (
              <section className="space-y-3">
                <h3 className="text-sm font-medium text-gray-900">
                  Images (max 10)
                </h3>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    handleImagesChange(e.target.files);
                    e.currentTarget.value = "";
                  }}
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
            ) : grouping === "catalogue" ? (
              <section className="space-y-3">
                <h3 className="text-sm font-medium text-gray-900">
                  Catalogue Listing
                </h3>
                <CatalogueSection
                  value={catalogueLots}
                  onChange={setCatalogueLots}
                  maxImagesPerLot={20}
                  maxTotalImages={500}
                />
              </section>
            ) : (
              <section className="space-y-3">
                <h3 className="text-sm font-medium text-gray-900">Combined Capture</h3>
                <CombinedCamera value={images} onChange={setImages} maxImages={20} />
              </section>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                className="rounded-xl border cursor-pointer border-gray-200 bg-white/80 px-4 py-2.5 text-sm text-gray-700 shadow hover:bg-white transition active:translate-y-0.5"
                onClick={saveDraft}
                disabled={submitting}
              >
                Save for later
              </button>
              <button
                type="button"
                className="rounded-xl border cursor-pointer border-gray-200 bg-white/80 px-4 py-2.5 text-sm text-gray-700 shadow hover:bg-white transition active:translate-y-0.5"
                onClick={clearForm}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 cursor-pointer rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_0_0_rgba(190,18,60,0.5)] hover:from-rose-400 hover:to-rose-600 transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(190,18,60,0.5)] disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? "Creating..." : "Create Report"}
              </button>
            </div>
          </>
        )}
      </div>
    </form>
  );
}
