import API from "@/lib/api";

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
};

export type AssetCreateResponse = {
  message: string;
  filePath: string;
  data?: any;
};

export const AssetService = {
  async create(details: AssetCreateDetails, images: File[]): Promise<AssetCreateResponse> {
    const fd = new FormData();
    fd.append("details", JSON.stringify(details));
    images.slice(0, 10).forEach((file) => fd.append("images", file));

    const { data } = await API.post<AssetCreateResponse>("/asset", fd);
    return data;
  },

  async listMyReports() {
    const { data } = await API.get("/asset");
    return data;
  },
};
