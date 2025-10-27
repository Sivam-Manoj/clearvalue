import API from "@/lib/api";

export type SavedInputFormData = {
  clientName?: string;
  effectiveDate?: string;
  appraisalPurpose?: string;
  ownerName?: string;
  appraiser?: string;
  appraisalCompany?: string;
  industry?: string;
  inspectionDate?: string;
  contractNo?: string;
  language?: "en" | "fr" | "es";
  currency?: string;
  includeValuationTable?: boolean;
  selectedValuationMethods?: Array<"FML" | "TKV" | "OLV" | "FLV">;
  groupingMode?: "single_lot" | "per_item" | "per_photo" | "catalogue" | "combined" | "mixed";
  combinedModes?: Array<"single_lot" | "per_item" | "per_photo">;
};

export type SavedInput = {
  _id: string;
  user: string;
  name: string;
  formData: SavedInputFormData;
  createdAt: string;
  updatedAt: string;
};

export type CreateSavedInputPayload = {
  name: string;
  formData: SavedInputFormData;
};

export type UpdateSavedInputPayload = {
  name?: string;
  formData?: SavedInputFormData;
};

export const SavedInputService = {
  async create(payload: CreateSavedInputPayload): Promise<SavedInput> {
    const { data } = await API.post<{ message: string; data: SavedInput }>(
      "/saved-inputs",
      payload
    );
    return data.data;
  },

  async getAll(): Promise<SavedInput[]> {
    const { data } = await API.get<{ message: string; data: SavedInput[] }>(
      "/saved-inputs"
    );
    return data.data;
  },

  async getById(id: string): Promise<SavedInput> {
    const { data } = await API.get<{ message: string; data: SavedInput }>(
      `/saved-inputs/${id}`
    );
    return data.data;
  },

  async update(id: string, payload: UpdateSavedInputPayload): Promise<SavedInput> {
    const { data } = await API.put<{ message: string; data: SavedInput }>(
      `/saved-inputs/${id}`,
      payload
    );
    return data.data;
  },

  async delete(id: string): Promise<void> {
    await API.delete(`/saved-inputs/${id}`);
  },
};
