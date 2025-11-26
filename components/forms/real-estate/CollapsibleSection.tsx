"use client";

import { useState } from "react";
import { ChevronDown, Check, AlertCircle } from "lucide-react";

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
  defaultOpen = false,
  filledCount = 0,
  totalCount = 0,
  variant = "default",
  required = false,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const isComplete = totalCount > 0 && filledCount === totalCount;
  const hasPartial = filledCount > 0 && filledCount < totalCount;

  const variantStyles = {
    default: "border-gray-200 bg-white",
    success: "border-emerald-200 bg-emerald-50/30",
    warning: "border-amber-200 bg-amber-50/30",
    info: "border-blue-200 bg-blue-50/30",
  };

  const headerStyles = {
    default: "hover:bg-gray-50",
    success: "hover:bg-emerald-50",
    warning: "hover:bg-amber-50",
    info: "hover:bg-blue-50",
  };

  return (
    <div className={`rounded-lg border shadow-sm overflow-hidden ${variantStyles[variant]}`}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${headerStyles[variant]}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0 text-gray-500 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
          <span className="font-medium text-sm text-gray-900 truncate">{title}</span>
          {required && (
            <span className="flex-shrink-0 text-[9px] font-medium text-rose-500 bg-rose-50 px-1 py-0.5 rounded">
              *
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!isOpen && totalCount > 0 && (
            <>
              {isComplete ? (
                <span className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                  <Check className="h-2.5 w-2.5" />
                </span>
              ) : hasPartial ? (
                <span className="text-[10px] font-medium text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">
                  {filledCount}/{totalCount}
                </span>
              ) : (
                <span className="flex items-center text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                  <AlertCircle className="h-2.5 w-2.5" />
                </span>
              )}
            </>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Content */}
      <div className={`transition-all duration-200 ${isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}>
        <div className="border-t border-gray-100 px-3 py-2">{children}</div>
      </div>
    </div>
  );
}
