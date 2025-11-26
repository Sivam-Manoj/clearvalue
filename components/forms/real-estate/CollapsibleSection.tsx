"use client";

import { Check, AlertCircle } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  filledCount?: number;
  totalCount?: number;
  variant?: "default" | "success" | "warning" | "info";
  required?: boolean;
}

export default function CollapsibleSection({
  title,
  icon,
  children,
  filledCount = 0,
  totalCount = 0,
  variant = "default",
  required = false,
}: CollapsibleSectionProps) {
  const isComplete = totalCount > 0 && filledCount === totalCount;
  const hasPartial = filledCount > 0 && filledCount < totalCount;

  const variantStyles = {
    default: "border-gray-300 bg-gradient-to-b from-white to-gray-50/80",
    success: "border-emerald-300 bg-gradient-to-b from-emerald-50/50 to-emerald-100/30",
    warning: "border-amber-300 bg-gradient-to-b from-amber-50/50 to-amber-100/30",
    info: "border-blue-300 bg-gradient-to-b from-blue-50/50 to-blue-100/30",
  };

  return (
    <div className={`rounded-xl border shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] overflow-hidden ${variantStyles[variant]}`}>
      {/* Header - Always visible, not clickable */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-gray-100/80 to-gray-50/50 border-b border-gray-200/60">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0 text-gray-600 [&>svg]:h-4 [&>svg]:w-4 drop-shadow-sm">{icon}</span>
          <span className="font-semibold text-sm text-gray-800 truncate">{title}</span>
          {required && (
            <span className="flex-shrink-0 text-[9px] font-medium text-rose-500 bg-rose-50 px-1 py-0.5 rounded shadow-sm">
              *
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {totalCount > 0 && (
            <>
              {isComplete ? (
                <span className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full shadow-sm">
                  <Check className="h-2.5 w-2.5" />
                  Complete
                </span>
              ) : hasPartial ? (
                <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full shadow-sm">
                  {filledCount}/{totalCount}
                </span>
              ) : (
                <span className="flex items-center gap-0.5 text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full shadow-sm">
                  <AlertCircle className="h-2.5 w-2.5" />
                  {totalCount} fields
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content - Always expanded */}
      <div className="px-3 py-3">{children}</div>
    </div>
  );
}
