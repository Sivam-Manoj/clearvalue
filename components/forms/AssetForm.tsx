"use client";

import {
  useEffect,
  useRef,
  useState,
  Fragment,
  useImperativeHandle,
  forwardRef,
} from "react";
import dynamic from "next/dynamic";
import {
  AssetService,
  type AssetCreateDetails,
  type AssetGroupingMode,
} from "@/services/asset";
import {
  SavedInputService,
  type SavedInput,
  type AssetFormData,
} from "@/services/savedInputs";
import { Check, Save } from "lucide-react";
import { toast } from "react-toastify";
import { useAuthContext } from "@/context/AuthContext";

// // Code-split the CatalogueSection for camera-based lot capture (disabled for Mixed-only)
// const CatalogueSection = dynamic(() => import("./catalogue/CatalogueSection"), {
//   ssr: false,
// });
// const CombinedCamera = dynamic(() => import("./capture/CombinedCamera"), {
//   ssr: false,
// });
const MixedSection = dynamic(() => import("./mixed/MixedSection"), {
  ssr: false,
});

type Props = {
  onSuccess?: (message?: string) => void;
  onCancel?: () => void;
};

export type AssetFormHandle = {
  loadSavedInput: (savedInput: SavedInput) => void;
};

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

const DRAFT_KEY = "cv_asset_draft";
// Removed MAX_NON_CAT_IMAGES - no limits on image uploads
// AI analysis limited to 50 images per lot on backend

// const GROUPING_OPTIONS: {
//   value: AssetGroupingMode;
//   label: string;
//   desc: string;
// }[] = [
//   {
//     value: "mixed" as any,
//     label: "Mixed Mode",
//     desc: "Create multiple lots; pick mode per lot (Bundle, Per Item, Per Photo). 20 images max per lot.",
//   },
// ];

const AssetForm = forwardRef<AssetFormHandle, Props>(function AssetForm(
  { onSuccess, onCancel },
  ref
) {
  const { user } = useAuthContext();
  const [grouping, setGrouping] = useState<AssetGroupingMode>("mixed" as any);
  const [images, setImages] = useState<File[]>([]);
  // Combined mode selected sections
  const [combinedModes, setCombinedModes] = useState<
    Array<"single_lot" | "per_item" | "per_photo">
  >(["single_lot", "per_item", "per_photo"]);
  // Catalogue mode state
  const [catalogueLots, setCatalogueLots] = useState<
    { id: string; files: File[]; coverIndex: number }[]
  >([]);
  // Mixed mode state
  const [mixedLots, setMixedLots] = useState<
    {
      id: string;
      files: File[];
      extraFiles: File[];
      videoFiles?: File[];
      coverIndex: number;
      mode?: "single_lot" | "per_item" | "per_photo";
    }[]
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
  const [contractNo, setContractNo] = useState("");
  const [language, setLanguage] = useState<"en" | "fr" | "es">("en");
  const [currency, setCurrency] = useState<string>("");
  const [currencyTouched, setCurrencyTouched] = useState<boolean>(false);
  const [currencyLoading, setCurrencyLoading] = useState<boolean>(false);
  const currencyPromptedRef = useRef(false);
  const [preparedFor, setPreparedFor] = useState("");
  const [factorsAgeCondition, setFactorsAgeCondition] = useState("");
  const [factorsQuality, setFactorsQuality] = useState("");
  const [factorsAnalysis, setFactorsAnalysis] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const clearError = (k: string) =>
    setErrors((prev) => {
      const { [k]: _, ...rest } = prev;
      return rest;
    });
  function validateForm(): boolean {
    const e: Record<string, string> = {};
    if (!clientName.trim()) e.clientName = "Required";
    if (!effectiveDate) e.effectiveDate = "Required";
    if (!appraisalPurpose.trim()) e.appraisalPurpose = "Required";
    if (!appraiser.trim()) e.appraiser = "Required";
    if (!currency || !/^[A-Z]{3}$/.test(currency))
      e.currency = "Use 3-letter code (e.g., CAD)";
    if (includeValuationTable && selectedValuationMethods.length === 0)
      e.valuation_methods = "Select at least one method";
    setErrors(e);
    if (Object.keys(e).length > 0) {
      try {
        toast.error("Please fix required fields");
      } catch {}
      return false;
    }
    return true;
  }

  // Valuation methods selection (multiple methods)
  const [includeValuationTable, setIncludeValuationTable] =
    useState<boolean>(false);
  const [selectedValuationMethods, setSelectedValuationMethods] = useState<
    Array<"FML" | "TKV" | "OLV" | "FLV">
  >(["FML"]);

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
    { key: "ai_analysis", label: "Analyzing images" },
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

  // Mixed-only: no direct single-bucket images picker/preview

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
      setGrouping("mixed" as any);
      setImages([]);
      setCatalogueLots([]);
      setMixedLots([]);
      setCombinedModes(["single_lot", "per_item", "per_photo"]);
      setError(null);
      setClientName("");
      setEffectiveDate(isoDate(new Date()));
      setAppraisalPurpose("");
      setOwnerName("");
      setAppraiser("");
      setAppraisalCompany("");
      setIndustry("");
      setInspectionDate(isoDate(new Date()));
      setContractNo("");
      setLanguage("en");
      setCurrency("");
      setCurrencyTouched(false);
      setCurrencyLoading(false);
      currencyPromptedRef.current = false;
      setIncludeValuationTable(false);
      setSelectedValuationMethods(["FML"]);
      setPreparedFor("");
      setFactorsAgeCondition("");
      setFactorsQuality("");
      setFactorsAnalysis("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.info("Form cleared.");
    } catch {}
  }

  // Reset all fields after successful submission (keeps form open)
  function clearFieldsAfterSubmit() {
    try {
      setGrouping("mixed" as any);
      setImages([]);
      setCatalogueLots([]);
      setMixedLots([]);
      setCombinedModes(["single_lot", "per_item", "per_photo"]);
      setError(null);
      setClientName("");
      setEffectiveDate(isoDate(new Date()));
      setAppraisalPurpose("");
      setOwnerName("");
      setAppraiser("");
      setAppraisalCompany("");
      setIndustry("");
      setInspectionDate(isoDate(new Date()));
      setContractNo("");
      setLanguage("en");
      setCurrency("");
      setCurrencyTouched(false);
      setCurrencyLoading(false);
      currencyPromptedRef.current = false;
      setIncludeValuationTable(false);
      setSelectedValuationMethods(["FML"]);
      setPreparedFor("");
      setFactorsAgeCondition("");
      setFactorsQuality("");
      setFactorsAnalysis("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      // Reset progress UI state
      setProgressPhase("idle");
      setProgressPercent(0);
      setStepStates(
        () => Object.fromEntries(STEPS.map((s) => [s.key, "pending"])) as any
      );
      jobIdRef.current = null;
      pollStartedRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    } catch {}
  }

  async function saveInputs() {
    try {
      // Auto-generate name based on client name and date
      const baseName = clientName.trim() || "Unnamed";
      const dateStr = new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const autoName = `${baseName} - ${dateStr}`;

      const formData = {
        clientName,
        effectiveDate,
        appraisalPurpose,
        ownerName,
        appraiser,
        appraisalCompany,
        industry,
        inspectionDate,
        contractNo,
        language,
        currency,
        includeValuationTable,
        selectedValuationMethods,
        groupingMode: grouping,
        combinedModes,
        preparedFor,
        factorsAgeCondition,
        factorsQuality,
        factorsAnalysis,
      };

      await SavedInputService.create({
        name: autoName,
        formType: "asset",
        formData,
      });

      toast.success("Inputs saved successfully!");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save inputs");
    }
  }

  // Load saved input from history
  function loadSavedInput(savedInput: SavedInput) {
    try {
      const fd = savedInput.formData as AssetFormData;
      if (!fd) return;

      // For Mixed-only mode, ignore any saved grouping and force 'mixed'
      setGrouping("mixed" as any);
      if (typeof fd.clientName === "string") setClientName(fd.clientName);
      if (typeof fd.effectiveDate === "string")
        setEffectiveDate(fd.effectiveDate);
      if (typeof fd.appraisalPurpose === "string")
        setAppraisalPurpose(fd.appraisalPurpose);
      if (typeof fd.ownerName === "string") setOwnerName(fd.ownerName);
      if (typeof fd.appraiser === "string") setAppraiser(fd.appraiser);
      if (typeof fd.appraisalCompany === "string")
        setAppraisalCompany(fd.appraisalCompany);
      if (typeof fd.industry === "string") setIndustry(fd.industry);
      if (typeof fd.inspectionDate === "string")
        setInspectionDate(fd.inspectionDate);
      if (typeof fd.contractNo === "string") setContractNo(fd.contractNo);
      if (fd.language === "en" || fd.language === "fr" || fd.language === "es")
        setLanguage(fd.language);
      if (typeof fd.currency === "string" && fd.currency.trim())
        setCurrency(fd.currency.trim());
      if (typeof fd.includeValuationTable === "boolean")
        setIncludeValuationTable(fd.includeValuationTable);
      if (Array.isArray(fd.selectedValuationMethods))
        setSelectedValuationMethods(fd.selectedValuationMethods as any);
      if (Array.isArray(fd.combinedModes))
        setCombinedModes(fd.combinedModes as any);
      if (typeof fd.preparedFor === "string") setPreparedFor(fd.preparedFor);
      if (typeof fd.factorsAgeCondition === "string")
        setFactorsAgeCondition(fd.factorsAgeCondition);
      if (typeof fd.factorsQuality === "string")
        setFactorsQuality(fd.factorsQuality);
      if (typeof fd.factorsAnalysis === "string")
        setFactorsAnalysis(fd.factorsAnalysis);

      toast.success(`Loaded: ${savedInput.name}`);
    } catch (error) {
      toast.error("Failed to load saved input");
    }
  }

  // Expose loadSavedInput method to parent via ref
  useImperativeHandle(ref, () => ({
    loadSavedInput,
  }));

  // Listen for global event to load saved input (from Navbar)
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const savedInput = e.detail;
      if (savedInput) {
        loadSavedInput(savedInput);
      }
    };
    window.addEventListener("load-saved-input" as any, handler as any);
    return () => {
      window.removeEventListener("load-saved-input" as any, handler as any);
    };
  }, []);
  // Fallback helper: detect currency from browser locale
  const applyLocaleFallbackCurrency = () => {
    try {
      const lang =
        typeof navigator !== "undefined" && navigator.language
          ? navigator.language
          : "en-CA";
      const region = (lang.split("-")[1] || "").toUpperCase();
      const byRegion: Record<string, string> = {
        US: "USD",
        CA: "CAD",
        GB: "GBP",
        AU: "AUD",
        NZ: "NZD",
        IN: "INR",
        LK: "LKR",
        JP: "JPY",
        CN: "CNY",
        SG: "SGD",
        AE: "AED",
        SA: "SAR",
        PK: "PKR",
        BD: "BDT",
        ZA: "ZAR",
        NG: "NGN",
        PH: "PHP",
        MY: "MYR",
        TH: "THB",
        ID: "IDR",
        KR: "KRW",
        HK: "HKD",
        TW: "TWD",
        AR: "ARS",
        CL: "CLP",
        CO: "COP",
        PE: "PEN",
        VE: "VES",
        TR: "TRY",
        EG: "EGP",
        KE: "KES",
        GH: "GHS",
        VN: "VND",
        FR: "EUR",
        DE: "EUR",
        ES: "EUR",
        IT: "EUR",
        NL: "EUR",
        IE: "EUR",
        PT: "EUR",
        BE: "EUR",
      };
      const detected = byRegion[region] || "CAD";
      console.log("[CurrencyDetect] Locale fallback", {
        acceptLanguage: lang,
        region,
        detected,
      });
      if (!currencyTouched) setCurrency((prev) => prev || detected);
    } catch {}
  };

  // On first open, use browser geolocation to detect currency
  useEffect(() => {
    if (currencyPromptedRef.current) return;
    currencyPromptedRef.current = true;
    if (currencyTouched) return;
    setCurrencyLoading(true);
    try {
      console.log("[CurrencyDetect] Starting geolocation-based detection");
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        console.warn("[CurrencyDetect] Geolocation API not available");
        applyLocaleFallbackCurrency();
        setCurrencyLoading(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords || ({} as any);
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
              console.warn(
                "[CurrencyDetect] Invalid coordinates from geolocation",
                pos.coords
              );
              setCurrencyLoading(false);
              return;
            }
            console.log("[CurrencyDetect] Geolocation success", {
              latitude,
              longitude,
            });
            const res = await fetch("/api/ai/currency", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lat: latitude, lng: longitude }),
            });
            console.log("[CurrencyDetect] Currency API status", res.status);
            if (!res.ok) {
              console.warn("[CurrencyDetect] Currency API returned non-OK");
              applyLocaleFallbackCurrency();
              return;
            }
            const data = await res.json();
            console.log("[CurrencyDetect] Currency API response", data);
            const cc = String(data?.currency || "").toUpperCase();
            if (!currencyTouched && /^[A-Z]{3}$/.test(cc)) {
              setCurrency(cc);
              console.log("[CurrencyDetect] Currency chosen", cc);
              toast.success(`Currency detected: ${cc}`);
            } else {
              console.warn(
                "[CurrencyDetect] Invalid or missing currency from API, applying locale fallback"
              );
              applyLocaleFallbackCurrency();
            }
          } catch {
          } finally {
            setCurrencyLoading(false);
          }
        },
        (error) => {
          // User denied or error; rely on locale fallback above
          setCurrencyLoading(false);
          console.warn("[CurrencyDetect] Geolocation error", error);
          applyLocaleFallbackCurrency();
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
      );
    } catch {}
  }, [currencyTouched]);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      setError("Please fix required fields.");
      return;
    }

    // Prepare files + details depending on grouping
    let filesToSend: File[] = images;
    let videosToSend: File[] | undefined = undefined;
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
      if (!combinedModes || combinedModes.length === 0) {
        const msg =
          "Please select at least one section (Single Lot, Per Item, Per Lot).";
        setError(msg);
        toast.error(msg);
        return;
      }
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
      extraDetails = { combined_modes: combinedModes };
    } else if (grouping === "mixed") {
      // Mixed: multiple lots with per-lot mode, each lot 1-30 images (+ optional 0-100 extra), cannot be empty
      const total = mixedLots.reduce((s, l) => s + l.files.length, 0);
      if (total === 0) {
        const msg = "Please add at least one image (Mixed).";
        setError(msg);
        toast.error(msg);
        return;
      }
      const perLotOk = mixedLots.every(
        (l) => l.files.length > 0 && l.files.length <= 30 && !!l.mode
      );
      if (!perLotOk) {
        const msg = "Each lot must have 1-30 images and a selected mode.";
        setError(msg);
        toast.error(msg);
        return;
      }
      filesToSend = mixedLots.flatMap((l) => [
        ...l.files,
        ...(l.extraFiles || []),
      ]);
      videosToSend = mixedLots.flatMap((l) => l.videoFiles || []);
      extraDetails = {
        mixed_lots: mixedLots.map((l) => ({
          count: l.files.length,
          extra_count: (l.extraFiles || []).length,
          cover_index: Math.max(
            0,
            Math.min(l.files.length - 1, l.coverIndex || 0)
          ),
          mode: l.mode!,
        })),
      } as Partial<AssetCreateDetails>;
    } else {
      if (images.length === 0) {
        const msg = "Please add at least one image.";
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
        grouping_mode: "mixed" as any,
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
        ...(contractNo.trim() && { contract_no: contractNo.trim() }),
        language,
        ...(currency && { currency }),
        include_valuation_table: includeValuationTable,
        valuation_methods: includeValuationTable
          ? selectedValuationMethods
          : [],
        progress_id: jobId,
        ...(preparedFor.trim() && { prepared_for: preparedFor.trim() }),
        ...(factorsAgeCondition.trim() && {
          factors_age_condition: factorsAgeCondition.trim(),
        }),
        ...(factorsQuality.trim() && {
          factors_quality: factorsQuality.trim(),
        }),
        ...(factorsAnalysis.trim() && {
          factors_analysis: factorsAnalysis.trim(),
        }),
        ...(grouping === "catalogue" ||
        grouping === "combined" ||
        grouping === "mixed"
          ? extraDetails
          : {}),
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

      const res = await AssetService.create(
        payload,
        filesToSend,
        videosToSend,
        {
          onUploadProgress: (fraction: number) => {
            const pct = Math.max(0, Math.min(1, fraction));
            const weighted = pct * PROG_WEIGHTS.client_upload * 100;
            setProgressPhase("upload");
            setProgressPercent((prev) => (weighted > prev ? weighted : prev));
          },
        }
      );

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
      // Clear all fields after submit
      clearFieldsAfterSubmit();
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
          <Fragment>
            {/* Grouping selector removed: Mixed mode only */}

            {/* Report Details */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900">
                Report Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Client Name</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => {
                      setClientName(e.target.value);
                      if (errors.clientName) clearError("clientName");
                    }}
                    placeholder="e.g., Acme Corp"
                    className={`w-full rounded-lg border-2 border-gray-300/80 bg-gradient-to-b from-gray-50 via-white to-gray-100 px-3 py-2.5 text-sm text-gray-900 shadow-[inset_0_3px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.9),0_1px_3px_rgba(0,0,0,0.08)] focus:outline-none focus:ring-2 focus:ring-rose-500/60 focus:border-rose-400 focus:shadow-[inset_0_3px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.9),0_0_0_4px_rgba(251,113,133,0.15)] transition-all placeholder:text-gray-400 hover:border-gray-400 ${
                      errors.clientName
                        ? "border-red-300 focus:ring-red-300"
                        : ""
                    }`}
                  />
                  {errors.clientName && (
                    <p className="text-xs text-red-600 mt-1">
                      {errors.clientName}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => {
                      setEffectiveDate(e.target.value);
                      if (errors.effectiveDate) clearError("effectiveDate");
                    }}
                    className={`w-full rounded-lg border-2 border-gray-300/80 bg-gradient-to-b from-gray-50 via-white to-gray-100 px-3 py-2.5 text-sm text-gray-900 shadow-[inset_0_3px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.9),0_1px_3px_rgba(0,0,0,0.08)] focus:outline-none focus:ring-2 focus:ring-rose-500/60 focus:border-rose-400 focus:shadow-[inset_0_3px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.9),0_0_0_4px_rgba(251,113,133,0.15)] transition-all placeholder:text-gray-400 hover:border-gray-400 ${
                      errors.effectiveDate
                        ? "border-red-300 focus:ring-red-300"
                        : ""
                    }`}
                  />
                  {errors.effectiveDate && (
                    <p className="text-xs text-red-600 mt-1">
                      {errors.effectiveDate}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">
                    Appraisal Purpose
                  </label>
                  <input
                    type="text"
                    value={appraisalPurpose}
                    onChange={(e) => {
                      setAppraisalPurpose(e.target.value);
                      if (errors.appraisalPurpose)
                        clearError("appraisalPurpose");
                    }}
                    placeholder="e.g., Insurance"
                    className={`w-full rounded-lg border-2 border-gray-300/80 bg-gradient-to-b from-gray-50 via-white to-gray-100 px-3 py-2.5 text-sm text-gray-900 shadow-[inset_0_3px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.9),0_1px_3px_rgba(0,0,0,0.08)] focus:outline-none focus:ring-2 focus:ring-rose-500/60 focus:border-rose-400 focus:shadow-[inset_0_3px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.9),0_0_0_4px_rgba(251,113,133,0.15)] transition-all placeholder:text-gray-400 hover:border-gray-400 ${
                      errors.appraisalPurpose
                        ? "border-red-300 focus:ring-red-300"
                        : ""
                    }`}
                  />
                  {errors.appraisalPurpose && (
                    <p className="text-xs text-red-600 mt-1">
                      {errors.appraisalPurpose}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Owner Name</label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g., John Doe"
                    className="w-full rounded-lg border-2 border-gray-300/80 bg-gradient-to-b from-gray-50 via-white to-gray-100 px-3 py-2.5 text-sm text-gray-900 shadow-[inset_0_3px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.9),0_1px_3px_rgba(0,0,0,0.08)] focus:outline-none focus:ring-2 focus:ring-rose-500/60 focus:border-rose-400 focus:shadow-[inset_0_3px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.9),0_0_0_4px_rgba(251,113,133,0.15)] transition-all placeholder:text-gray-400 hover:border-gray-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Prepared For</label>
                  <input
                    type="text"
                    value={preparedFor}
                    onChange={(e) => setPreparedFor(e.target.value)}
                    placeholder="e.g., Client Contact / Company"
                    className="w-full rounded-lg border-2 border-gray-300/80 bg-gradient-to-b from-gray-50 via-white to-gray-100 px-3 py-2.5 text-sm text-gray-900 shadow-[inset_0_3px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.9),0_1px_3px_rgba(0,0,0,0.08)] focus:outline-none focus:ring-2 focus:ring-rose-500/60 focus:border-rose-400 focus:shadow-[inset_0_3px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.9),0_0_0_4px_rgba(251,113,133,0.15)] transition-all placeholder:text-gray-400 hover:border-gray-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Appraiser</label>
                  <input
                    type="text"
                    value={appraiser}
                    onChange={(e) => {
                      setAppraiser(e.target.value);
                      if (errors.appraiser) clearError("appraiser");
                    }}
                    placeholder="e.g., Jane Smith"
                    className={`w-full rounded-lg border-2 border-gray-300/80 bg-gradient-to-b from-gray-50 via-white to-gray-100 px-3 py-2.5 text-sm text-gray-900 shadow-[inset_0_3px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.9),0_1px_3px_rgba(0,0,0,0.08)] focus:outline-none focus:ring-2 focus:ring-rose-500/60 focus:border-rose-400 focus:shadow-[inset_0_3px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.9),0_0_0_4px_rgba(251,113,133,0.15)] transition-all placeholder:text-gray-400 hover:border-gray-400 ${
                      errors.appraiser
                        ? "border-red-300 focus:ring-red-300"
                        : ""
                    }`}
                  />
                  {errors.appraiser && (
                    <p className="text-xs text-red-600 mt-1">
                      {errors.appraiser}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">
                    Appraisal Company
                  </label>
                  <input
                    type="text"
                    value={appraisalCompany}
                    onChange={(e) => setAppraisalCompany(e.target.value)}
                    className="w-full rounded-lg border-2 border-gray-300/80 bg-gradient-to-b from-gray-50 via-white to-gray-100 px-3 py-2.5 text-sm text-gray-900 shadow-[inset_0_3px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.9),0_1px_3px_rgba(0,0,0,0.08)] focus:outline-none focus:ring-2 focus:ring-rose-500/60 focus:border-rose-400 focus:shadow-[inset_0_3px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.9),0_0_0_4px_rgba(251,113,133,0.15)] transition-all placeholder:text-gray-400 hover:border-gray-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Industry</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g., Manufacturing"
                    className="w-full rounded-lg border-2 border-gray-300/80 bg-gradient-to-b from-gray-50 via-white to-gray-100 px-3 py-2.5 text-sm text-gray-900 shadow-[inset_0_3px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.9),0_1px_3px_rgba(0,0,0,0.08)] focus:outline-none focus:ring-2 focus:ring-rose-500/60 focus:border-rose-400 focus:shadow-[inset_0_3px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.9),0_0_0_4px_rgba(251,113,133,0.15)] transition-all placeholder:text-gray-400 hover:border-gray-400"
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
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Contract No</label>
                  <input
                    type="text"
                    value={contractNo}
                    onChange={(e) => setContractNo(e.target.value)}
                    placeholder="e.g., CN-2025-001"
                    className="w-full rounded-lg border-2 border-gray-300/80 bg-gradient-to-b from-gray-50 via-white to-gray-100 px-3 py-2.5 text-sm text-gray-900 shadow-[inset_0_3px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.9),0_1px_3px_rgba(0,0,0,0.08)] focus:outline-none focus:ring-2 focus:ring-rose-500/60 focus:border-rose-400 focus:shadow-[inset_0_3px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.9),0_0_0_4px_rgba(251,113,133,0.15)] transition-all placeholder:text-gray-400 hover:border-gray-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="w-full rounded-lg border-2 border-gray-300/80 bg-gradient-to-b from-gray-50 via-white to-gray-100 px-3 py-2.5 text-sm text-gray-900 shadow-[inset_0_3px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.9),0_1px_3px_rgba(0,0,0,0.08)] focus:outline-none focus:ring-2 focus:ring-rose-500/60 focus:border-rose-400 focus:shadow-[inset_0_3px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.9),0_0_0_4px_rgba(251,113,133,0.15)] transition-all cursor-pointer hover:border-gray-400"
                  >
                    <option value="en">English (default)</option>
                    <option value="fr">Français</option>
                    <option value="es">Español</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">
                    Currency (ISO code){" "}
                    {currencyLoading && (
                      <span className="ml-1 text-[11px] text-gray-500">
                        Detecting…
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => {
                      setCurrencyTouched(true);
                      setCurrency(e.target.value.toUpperCase().slice(0, 3));
                      if (errors.currency) clearError("currency");
                    }}
                    disabled={currencyLoading && !currencyTouched}
                    placeholder={
                      currencyLoading ? "Detecting…" : "e.g., CAD, USD, EUR"
                    }
                    className={`w-full rounded-lg border-2 border-gray-300/80 bg-gradient-to-b from-gray-50 via-white to-gray-100 px-3 py-2.5 text-sm text-gray-900 shadow-[inset_0_3px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.9),0_1px_3px_rgba(0,0,0,0.08)] focus:outline-none focus:ring-2 focus:ring-rose-500/60 focus:border-rose-400 focus:shadow-[inset_0_3px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.9),0_0_0_4px_rgba(251,113,133,0.15)] transition-all placeholder:text-gray-400 hover:border-gray-400 ${
                      errors.currency ? "border-red-300 focus:ring-red-300" : ""
                    }`}
                  />
                  {errors.currency && (
                    <p className="text-xs text-red-600 mt-1">
                      {errors.currency}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Factors Affecting Value */}
            <section className="space-y-3 rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/50 to-indigo-50/30 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900">
                Factors Affecting Value
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">
                    Age & Condition
                  </label>
                  <textarea
                    value={factorsAgeCondition}
                    onChange={(e) => setFactorsAgeCondition(e.target.value)}
                    rows={3}
                    placeholder="Describe age and condition..."
                    className="w-full rounded-lg border-2 border-gray-300/80 bg-gradient-to-b from-gray-50 via-white to-gray-100 px-3 py-2.5 text-sm text-gray-900 shadow-[inset_0_3px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.9),0_1px_3px_rgba(0,0,0,0.08)] focus:outline-none focus:ring-2 focus:ring-rose-500/60 focus:border-rose-400 focus:shadow-[inset_0_3px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.9),0_0_0_4px_rgba(251,113,133,0.15)] transition-all placeholder:text-gray-400 hover:border-gray-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Quality</label>
                  <textarea
                    value={factorsQuality}
                    onChange={(e) => setFactorsQuality(e.target.value)}
                    rows={3}
                    placeholder="Describe quality..."
                    className="w-full rounded-lg border-2 border-gray-300/80 bg-gradient-to-b from-gray-50 via-white to-gray-100 px-3 py-2.5 text-sm text-gray-900 shadow-[inset_0_3px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.9),0_1px_3px_rgba(0,0,0,0.08)] focus:outline-none focus:ring-2 focus:ring-rose-500/60 focus:border-rose-400 focus:shadow-[inset_0_3px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.9),0_0_0_4px_rgba(251,113,133,0.15)] transition-all placeholder:text-gray-400 hover:border-gray-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Analysis</label>
                  <textarea
                    value={factorsAnalysis}
                    onChange={(e) => setFactorsAnalysis(e.target.value)}
                    rows={3}
                    placeholder="Provide overall analysis..."
                    className="w-full rounded-lg border-2 border-gray-300/80 bg-gradient-to-b from-gray-50 via-white to-gray-100 px-3 py-2.5 text-sm text-gray-900 shadow-[inset_0_3px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.9),0_1px_3px_rgba(0,0,0,0.08)] focus:outline-none focus:ring-2 focus:ring-rose-500/60 focus:border-rose-400 focus:shadow-[inset_0_3px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.9),0_0_0_4px_rgba(251,113,133,0.15)] transition-all placeholder:text-gray-400 hover:border-gray-400"
                  />
                </div>
              </div>
            </section>

            {/* Valuation Comparison Table */}
            <section className="space-y-3 rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50/50 to-blue-50/30 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Quick Comparison Table
                  </h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Compare multiple valuation methods with software
                    explanations
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setIncludeValuationTable(!includeValuationTable)
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    includeValuationTable ? "bg-sky-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      includeValuationTable ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {includeValuationTable && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-gray-700 font-medium">
                    Select valuation methods to compare:
                  </p>
                  {errors.valuation_methods && (
                    <p className="text-xs text-red-600">
                      {errors.valuation_methods}
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {/* FML */}
                    <label className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-white/80 p-3 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={selectedValuationMethods.includes("FML")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedValuationMethods([
                              ...selectedValuationMethods,
                              "FML",
                            ]);
                          } else {
                            // Prevent unchecking if it's the only selected method
                            if (selectedValuationMethods.length > 1) {
                              setSelectedValuationMethods(
                                selectedValuationMethods.filter(
                                  (m) => m !== "FML"
                                )
                              );
                            } else {
                              toast.warning(
                                "At least one valuation method must be selected"
                              );
                            }
                          }
                          if (errors.valuation_methods)
                            clearError("valuation_methods");
                        }}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-gray-900">
                          FML (Fair Market Value)
                        </div>
                        <div className="text-[11px] text-gray-600 mt-0.5">
                          Appraised retail value for insurance or estate
                          purposes
                        </div>
                      </div>
                    </label>

                    {/* TKV */}
                    <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-white/80 p-3 cursor-pointer hover:bg-amber-50/50 transition">
                      <input
                        type="checkbox"
                        checked={selectedValuationMethods.includes("TKV")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedValuationMethods([
                              ...selectedValuationMethods,
                              "TKV",
                            ]);
                          } else {
                            // Prevent unchecking if it's the only selected method
                            if (selectedValuationMethods.length > 1) {
                              setSelectedValuationMethods(
                                selectedValuationMethods.filter(
                                  (m) => m !== "TKV"
                                )
                              );
                            } else {
                              toast.warning(
                                "At least one valuation method must be selected"
                              );
                            }
                          }
                        }}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                      />
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-gray-900">
                          TKV (Trade Value)
                        </div>
                        <div className="text-[11px] text-gray-600 mt-0.5">
                          Dealer trade-in value for wholesale transactions
                        </div>
                      </div>
                    </label>

                    {/* OLV */}
                    <label className="flex items-start gap-2 rounded-lg border border-blue-200 bg-white/80 p-3 cursor-pointer hover:bg-blue-50/50 transition">
                      <input
                        type="checkbox"
                        checked={selectedValuationMethods.includes("OLV")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedValuationMethods([
                              ...selectedValuationMethods,
                              "OLV",
                            ]);
                          } else {
                            // Prevent unchecking if it's the only selected method
                            if (selectedValuationMethods.length > 1) {
                              setSelectedValuationMethods(
                                selectedValuationMethods.filter(
                                  (m) => m !== "OLV"
                                )
                              );
                            } else {
                              toast.warning(
                                "At least one valuation method must be selected"
                              );
                            }
                          }
                        }}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-gray-900">
                          OLV (Orderly Liquidation)
                        </div>
                        <div className="text-[11px] text-gray-600 mt-0.5">
                          Auction reserve value with reasonable marketing time
                        </div>
                      </div>
                    </label>

                    {/* FLV */}
                    <label className="flex items-start gap-2 rounded-lg border border-rose-200 bg-white/80 p-3 cursor-pointer hover:bg-rose-50/50 transition">
                      <input
                        type="checkbox"
                        checked={selectedValuationMethods.includes("FLV")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedValuationMethods([
                              ...selectedValuationMethods,
                              "FLV",
                            ]);
                          } else {
                            // Prevent unchecking if it's the only selected method
                            if (selectedValuationMethods.length > 1) {
                              setSelectedValuationMethods(
                                selectedValuationMethods.filter(
                                  (m) => m !== "FLV"
                                )
                              );
                            } else {
                              toast.warning(
                                "At least one valuation method must be selected"
                              );
                            }
                          }
                        }}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                      />
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-gray-900">
                          FLV (Forced Liquidation)
                        </div>
                        <div className="text-[11px] text-gray-600 mt-0.5">
                          Quick sale value under immediate liquidation pressure
                        </div>
                      </div>
                    </label>
                  </div>
                  {selectedValuationMethods.length === 0 && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      ⚠️ Select at least one valuation method
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* Mixed mode only (contained) */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900">Mixed Lots</h3>
              <MixedSection
                value={mixedLots}
                onChange={setMixedLots}
                maxImagesPerLot={50}
                maxExtraImagesPerLot={100}
                maxTotalImages={500}
                downloadPrefix={(contractNo || "asset").replace(
                  /[^a-zA-Z0-9_-]/g,
                  "-"
                )}
              />
            </section>
            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border cursor-pointer border-gray-200 bg-white/80 px-4 py-2.5 text-sm text-gray-700 shadow hover:bg-white transition active:translate-y-0.5"
                onClick={saveInputs}
              >
                <Save className="h-4 w-4" />
                Save Inputs
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
          </Fragment>
        )}
      </div>
    </form>
  );
});

export default AssetForm;
