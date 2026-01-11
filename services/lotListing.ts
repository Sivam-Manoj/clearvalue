import API from "@/lib/api";

export interface LotListingLot {
  lot_id: string;
  lot_number: number;
  title?: string;
  description?: string;
  details?: string;
  estimated_value?: string;
  quantity?: number;
  must_take?: boolean;
  categories?: string;
  serial_number?: string;
  show_on_website?: boolean;
  close_date?: string;
  bid_increment?: number;
  location?: string;
  opening_bid?: number;
  latitude?: number;
  longitude?: number;
  item_condition?: string;
  image_indexes: number[];
  image_urls?: string[];
  extra_image_indexes?: number[];
  extra_image_urls?: string[];
  sub_mode?: string;
  tags?: string[];
}

export interface LotListingPreviewFiles {
  excel?: string;
  images?: string;
}

export interface LotListing {
  _id: string;
  user: string;
  status: "processing" | "preview" | "pending_approval" | "approved" | "declined";
  progress?: {
    phase: string;
    percent: number;
    message?: string;
  };
  details?: {
    contract_no?: string;
    sales_date?: string;
    location?: string;
    currency?: string;
  };
  lots?: LotListingLot[];
  imageUrls?: string[];
  preview_data?: {
    contract_no?: string;
    sales_date?: string;
    location?: string;
    currency?: string;
    lots?: LotListingLot[];
    total_value?: number;
  };
  preview_files?: LotListingPreviewFiles;
  decline_reason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LotListingProgress {
  phase: string;
  percent: number;
  message?: string;
}

// Get all lot listings for current user
export async function getLotListings(): Promise<{ data: LotListing[] }> {
  const response = await API.get<LotListing[]>("/lot-listings");
  return { data: response.data };
}

// Get lot listing by ID
export async function getLotListingById(id: string): Promise<LotListing> {
  const response = await API.get<LotListing>(`/lot-listings/${id}`);
  return response.data;
}

// Get lot listing progress
export async function getLotListingProgress(id: string): Promise<LotListingProgress> {
  const response = await API.get<LotListingProgress>(`/lot-listings/progress/${id}`);
  return response.data;
}

// Get lot listing preview
export async function getLotListingPreview(id: string): Promise<LotListing> {
  const response = await API.get<LotListing>(`/lot-listings/${id}/preview`);
  return response.data;
}

// Update lot listing preview
export async function updateLotListingPreview(
  id: string,
  data: { lots?: LotListingLot[]; details?: LotListing["details"] }
): Promise<LotListing> {
  const response = await API.put<LotListing>(`/lot-listings/${id}/preview`, data);
  return response.data;
}

// Submit lot listing for approval
export async function submitLotListingForApproval(id: string): Promise<LotListing> {
  const response = await API.post<LotListing>(`/lot-listings/${id}/submit-approval`);
  return response.data;
}

// Resubmit lot listing (regenerate files)
export async function resubmitLotListing(id: string): Promise<LotListing> {
  const response = await API.post<LotListing>(`/lot-listings/${id}/resubmit`);
  return response.data;
}

// Delete lot listing
export async function deleteLotListing(id: string): Promise<void> {
  await API.delete(`/lot-listings/${id}`);
}

// Get submitted lot listings (pending_approval and approved)
export async function getSubmittedLotListings(): Promise<{ data: LotListing[] }> {
  const response = await API.get<LotListing[]>("/lot-listings");
  const submitted = response.data.filter(
    (r) => r.status === "pending_approval" || r.status === "approved"
  );
  return { data: submitted };
}

export const LotListingService = {
  getLotListings,
  getLotListingById,
  getLotListingProgress,
  getLotListingPreview,
  updateLotListingPreview,
  submitLotListingForApproval,
  resubmitLotListing,
  deleteLotListing,
  getSubmittedLotListings,
};

export default LotListingService;
