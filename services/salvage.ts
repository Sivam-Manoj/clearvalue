import API from "@/lib/api";

export type SalvageDetails = {
  report_date: string; // ISO date string (yyyy-mm-dd)
  file_number: string;
  date_received: string; // ISO date string
  claim_number: string;
  policy_number: string;
  appraiser_name: string;
  appraiser_phone: string;
  appraiser_email: string;
  adjuster_name: string;
  insured_name: string;
  company_name: string;
  company_address: string;
  appraiser_comments: string;
  next_report_due: string; // ISO date string
};

export const SalvageService = {
  async create(details: SalvageDetails, images: File[]): Promise<{ message: string; filePath: string }> {
    const fd = new FormData();
    fd.append("details", JSON.stringify(details));
    images.slice(0, 10).forEach((file) => fd.append("images", file));

    const { data } = await API.post<{ message: string; filePath: string }>(
      "/salvage",
      fd
    );
    return data;
  },
};
