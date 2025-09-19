import API from "@/lib/api";
import type { AxiosProgressEvent } from "axios";

export type AssetGroupingMode =
  | "single_lot"
  | "per_item"
  | "per_photo"
  | "catalogue"
  | "combined"
  | "mixed";

export type AssetCreateDetails = {
  grouping_mode: AssetGroupingMode;
  // Optional metadata fields
  client_name?: string;
  effective_date?: string; // ISO date string (YYYY-MM-DD)
  appraisal_purpose?: string;
  owner_name?: string;
  appraiser?: string;
  appraisal_company?: string;
  industry?: string;
  inspection_date?: string; // ISO date string (YYYY-MM-DD)
  // New optional fields
  contract_no?: string; // user-provided contract number
  language?: 'en' | 'fr' | 'es'; // report output language for DOCX (default 'en')
  // Real-time progress
  progress_id?: string;
  // Catalogue mode: describe how files map to lots (flattened in order)
  catalogue_lots?: Array<{
    count: number; // number of images in this lot (max 20)
    cover_index?: number; // 0-based index within this lot to use as cover (defaults to 0)
  }>;
  // Combined mode: which sections to include in the single DOCX report
  combined_modes?: Array<"single_lot" | "per_item" | "per_photo">;
  // Mixed mode: describe each lot's mode and image counts (flattened in order)
  mixed_lots?: Array<{
    count: number; // number of images in this lot (max 20)
    cover_index?: number; // 0-based within the lot
    mode: "single_lot" | "per_item" | "per_photo";
  }>;
};

export type AssetCreateResponse = {
  message: string;
  // Background job ack fields (202 Accepted)
  jobId?: string;
  phase?: "upload" | "processing" | "done" | "error";
  // Legacy immediate response fields (if any)
  filePath?: string;
  data?: any;
};

export type CreateOptions = {
  onUploadProgress?: (fraction: number) => void;
};

export type AssetProgress = {
  id: string;
  phase: "upload" | "processing" | "done" | "error";
  serverProgress01: number; // 0..1 for server-side portion
  steps: Array<{
    key: string;
    label: string;
    startedAt?: string;
    endedAt?: string;
    durationMs?: number;
  }>;
  message?: string;
};

export const AssetService = {
  async create(
    details: AssetCreateDetails,
    images: File[],
    options?: CreateOptions
  ): Promise<AssetCreateResponse> {
    const fd = new FormData();
    fd.append("details", JSON.stringify(details));
    const filesToSend =
      details.grouping_mode === "catalogue" ||
      details.grouping_mode === "combined" ||
      details.grouping_mode === "mixed"
        ? images
        : images.slice(0, 10);
    filesToSend.forEach((file) => fd.append("images", file));

    const { data } = await API.post<AssetCreateResponse>("/asset", fd, {
      onUploadProgress: (e: AxiosProgressEvent) => {
        if (!options?.onUploadProgress) return;
        let fraction = typeof e.progress === "number" ? e.progress : 0;
        if (
          !fraction &&
          typeof e.loaded === "number" &&
          typeof e.total === "number" &&
          e.total > 0
        ) {
          fraction = e.loaded / e.total;
        }
        options.onUploadProgress(Math.max(0, Math.min(1, fraction)));
      },
    });
    return data;
  },

  async listMyReports() {
    const { data } = await API.get("/asset");
    return data;
  },

  async progress(id: string): Promise<AssetProgress> {
    const { data } = await API.get(`/asset/progress/${id}`);
    return data as AssetProgress;
  },
};
