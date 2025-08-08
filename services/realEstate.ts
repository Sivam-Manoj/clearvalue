import API from "@/lib/api";

export type RealEstateDetails = {
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

export const RealEstateService = {
  async create(details: RealEstateDetails, images: File[]): Promise<{ message: string; filePath: string }> {
    const fd = new FormData();
    fd.append("details", JSON.stringify(details));
    // Limit max images to 10 as per backend middleware
    images.slice(0, 10).forEach((file) => fd.append("images", file));

    const { data } = await API.post<{ message: string; filePath: string }>(
      "/real-estate",
      fd
    );
    return data;
  },
};
