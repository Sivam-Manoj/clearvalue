import React from "react";

export type ReportStatus = 'draft' | 'processing' | 'preview' | 'pending_approval' | 'approved' | 'declined';

interface StatusBadgeProps {
  status: ReportStatus;
  className?: string;
}

const statusConfig = {
  draft: {
    label: "Draft",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
    borderColor: "border-gray-300",
    icon: "📝",
  },
  processing: {
    label: "Processing",
    bgColor: "bg-slate-50",
    textColor: "text-slate-700",
    borderColor: "border-slate-300",
    icon: "⚙️",
  },
  preview: {
    label: "Ready for Review",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    borderColor: "border-blue-300",
    icon: "👁️",
  },
  pending_approval: {
    label: "Awaiting Approval",
    bgColor: "bg-yellow-50",
    textColor: "text-yellow-700",
    borderColor: "border-yellow-300",
    icon: "⏳",
  },
  approved: {
    label: "Approved",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
    borderColor: "border-green-300",
    icon: "✓",
  },
  declined: {
    label: "Declined",
    bgColor: "bg-red-50",
    textColor: "text-red-700",
    borderColor: "border-red-300",
    icon: "✕",
  },
};

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor} ${className}`}
    >
      <span className="text-base">{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
