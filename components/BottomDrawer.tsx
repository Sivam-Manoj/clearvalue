"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

export default function BottomDrawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // optional: prevent background scroll while open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  return (
    <div
      className={
        open
          ? "fixed inset-0 z-[60] block"
          : "fixed inset-0 z-[60] hidden"
      }
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={
          "absolute inset-x-0 bottom-0 rounded-t-2xl bg-white shadow-2xl transition-transform duration-300 ease-out " +
          (open ? "translate-y-0" : "translate-y-full")
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-200" />
            {title ? (
              <h3 className="text-base font-medium text-gray-900">{title}</h3>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-4 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
