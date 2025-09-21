import API from "@/lib/api";

export type RealEstateDetails = {
  language?: "en" | "fr" | "es";
  property_details: {
    owner_name: string;
    address: string;
    land_description: string;
    municipality: string;
    title_number: string;
    parcel_number: string;
    land_area_acres: string;
    source_quarter_section: string;
  };
  report_dates: {
    report_date: string; // ISO date string
    effective_date: string; // ISO date string
    inspection_date: string; // ISO date string
  };
  house_details: {
    year_built: string;
    square_footage: string;
    lot_size_sqft: string;
    number_of_rooms: string;
    number_of_full_bathrooms: string;
    number_of_half_bathrooms: string;
    known_issues: string[];
  };
  inspector_info: {
    inspector_name: string;
    company_name: string;
    contact_email: string;
    contact_phone: string;
    credentials: string;
  };
};

export type RealEstateCreateResponse = {
  message: string;
  // Background job ack fields (202 Accepted)
  jobId?: string;
  phase?: "upload" | "processing" | "done" | "error";
  // Legacy immediate response fields (sync path)
  filePath?: string;
  docxPath?: string;
  xlsxPath?: string;
};

export type RealEstateProgress = {
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

export const RealEstateService = {
  async create(
    details: RealEstateDetails,
    images: File[]
  ): Promise<RealEstateCreateResponse> {
    const fd = new FormData();
    fd.append("details", JSON.stringify(details));
    // Limit max images to 10 as per backend middleware
    images.slice(0, 10).forEach((file) => fd.append("images", file));

    const { data } = await API.post<RealEstateCreateResponse>("/real-estate", fd);
    return data;
  },
  async progress(id: string): Promise<RealEstateProgress> {
    const { data } = await API.get(`/real-estate/progress/${id}`);
    return data as RealEstateProgress;
  },
};
