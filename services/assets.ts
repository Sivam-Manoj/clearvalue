import API from "@/lib/api";

export type ReportStatus = 'draft' | 'preview' | 'pending_approval' | 'approved' | 'declined';

export interface AssetReport {
  _id: string;
  user: string;
  grouping_mode: string;
  imageUrls: string[];
  status: ReportStatus;
  preview_data?: any;
  preview_submitted_at?: string;
  approval_requested_at?: string;
  approval_processed_at?: string;
  decline_reason?: string;
  lots: any[];
  client_name?: string;
  contract_no?: string;
  effective_date?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PreviewDataResponse {
  message: string;
  data: {
    status: ReportStatus;
    preview_data: any;
    decline_reason?: string;
    reportId: string;
  };
}

/**
 * Get preview data for editing
 */
export const getPreviewData = async (reportId: string): Promise<PreviewDataResponse> => {
  const { data } = await API.get<PreviewDataResponse>(`/asset/${reportId}/preview`);
  return data;
};

/**
 * Update preview data with user edits
 */
export const updatePreviewData = async (
  reportId: string,
  previewData: any
): Promise<{ message: string; data: any }> => {
  const { data } = await API.put<{ message: string; data: any }>(
    `/asset/${reportId}/preview`,
    { preview_data: previewData }
  );
  return data;
};

/**
 * Submit report for admin approval
 */
export const submitForApproval = async (
  reportId: string
): Promise<{ message: string; data: any }> => {
  const { data } = await API.post<{ message: string; data: any }>(
    `/asset/${reportId}/submit-approval`,
    {}
  );
  return data;
};

/**
 * Approve report (Admin only)
 */
export const approveReport = async (
  reportId: string
): Promise<{ message: string; data: any }> => {
  const { data } = await API.post<{ message: string; data: any }>(
    `/asset/${reportId}/approve`,
    {}
  );
  return data;
};

/**
 * Decline report (Admin only)
 */
export const declineReport = async (
  reportId: string,
  reason: string
): Promise<{ message: string; data: any }> => {
  const { data } = await API.post<{ message: string; data: any }>(
    `/asset/${reportId}/decline`,
    { reason }
  );
  return data;
};

/**
 * Get all asset reports
 */
export const getAssetReports = async (): Promise<{ message: string; data: AssetReport[] }> => {
  const { data } = await API.get<{ message: string; data: AssetReport[] }>(`/asset`);
  return data;
};
