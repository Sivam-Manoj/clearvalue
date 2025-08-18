import API from "@/lib/api";
import type { AxiosProgressEvent } from "axios";

export type AssetGroupingMode = "single_lot" | "per_item" | "per_photo";

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
  // Real-time progress
  progress_id?: string;
};

export type AssetCreateResponse = {
  message: string;
  filePath: string;
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
    images.slice(0, 10).forEach((file) => fd.append("images", file));

    const { data } = await API.post<AssetCreateResponse>("/asset", fd, {
      onUploadProgress: (e: AxiosProgressEvent) => {
        if (!options?.onUploadProgress) return;
        let fraction = typeof e.progress === "number" ? e.progress : 0;
        if (!fraction && typeof e.loaded === "number" && typeof e.total === "number" && e.total > 0) {
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
