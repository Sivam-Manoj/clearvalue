"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { SalvageService, type SalvageDetails } from "@/services/salvage";
import { X, Upload } from "lucide-react";
import { toast } from "react-toastify";
import Loading from "@/components/common/Loading";

type Props = {
  onSuccess?: (message?: string) => void;
  onCancel?: () => void;
};

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export default function SalvageForm({ onSuccess, onCancel }: Props) {
  const { user } = useAuthContext();

  const [details, setDetails] = useState<SalvageDetails>({
    report_date: isoDate(new Date()),
    file_number: "",
    date_received: isoDate(new Date()),
    claim_number: "",
    policy_number: "",
    appraiser_name:
      (user as any)?.username || (user as any)?.name || "",
    appraiser_phone: (user as any)?.contactPhone || "",
    appraiser_email: (user as any)?.contactEmail || (user as any)?.email || "",
    adjuster_name: "",
    insured_name: "",
    company_name: (user as any)?.companyName || "",
    company_address: (user as any)?.companyAddress || "",
    appraiser_comments: "",
    next_report_due: isoDate(new Date()),
  });

  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleChange<K extends keyof SalvageDetails>(key: K, value: string) {
    setDetails((prev) => ({ ...prev, [key]: value }));
  }

  function handleImagesChange(files: FileList | null) {
    if (!files) return;
    const incoming = Array.from(files);
    setImages((prev) => {
      const combined = [...prev, ...incoming];
      if (combined.length > 10) {
        setError("You can upload up to 10 images. Extra files were ignored.");
      } else {
        setError(null);
      }
      return combined.slice(0, 10);
    });
  }

  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [images]);

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Basic required field checks mirroring backend required fields
    const required: (keyof SalvageDetails)[] = [
      "report_date",
      "file_number",
      "date_received",
      "claim_number",
      "policy_number",
      "appraiser_name",
      "appraiser_phone",
      "appraiser_email",
      "adjuster_name",
      "insured_name",
      "company_name",
      "company_address",
      "appraiser_comments",
      "next_report_due",
    ];

    const missing = required.filter((k) => !String(details[k] || "").trim());
    if (missing.length > 0) {
      const msg = `Please fill: ${missing.join(", ")}`;
      setError(msg);
      toast.error(msg);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload: SalvageDetails = {
        ...details,
        report_date: details.report_date,
        date_received: details.date_received,
        next_report_due: details.next_report_due,
      };

      const res = await SalvageService.create(payload, images);
      const successMsg = res?.message || "Report created successfully";
      toast.success(successMsg);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("cv:report-created"));
      }
      onSuccess?.(res?.message);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to create report";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="relative">
        {!submitting && error && (
          <div className="rounded-xl border border-red-200/70 bg-red-50/80 p-3 text-sm text-red-700 shadow ring-1 ring-black/5 backdrop-blur">
            {error}
          </div>
        )}

        {/* Report & File Info */}
        <section className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900">Report Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700">Report Date</label>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={details.report_date}
              onChange={(e) => handleChange("report_date", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Date Received</label>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={details.date_received}
              onChange={(e) => handleChange("date_received", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Next Report Due</label>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={details.next_report_due}
              onChange={(e) => handleChange("next_report_due", e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700">File Number</label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={details.file_number}
              onChange={(e) => handleChange("file_number", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Claim Number</label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={details.claim_number}
              onChange={(e) => handleChange("claim_number", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Policy Number</label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={details.policy_number}
              onChange={(e) => handleChange("policy_number", e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Parties & Contacts */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900">Contacts</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700">Appraiser Name</label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={details.appraiser_name}
              onChange={(e) => handleChange("appraiser_name", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Appraiser Phone</label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={details.appraiser_phone}
              onChange={(e) => handleChange("appraiser_phone", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Appraiser Email</label>
            <input
              type="email"
              className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={details.appraiser_email}
              onChange={(e) => handleChange("appraiser_email", e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700">Adjuster Name</label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={details.adjuster_name}
              onChange={(e) => handleChange("adjuster_name", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Insured Name</label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={details.insured_name}
              onChange={(e) => handleChange("insured_name", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Company Name</label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={details.company_name}
              onChange={(e) => handleChange("company_name", e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Company Address</label>
          <input
            className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
            value={details.company_address}
            onChange={(e) => handleChange("company_address", e.target.value)}
          />
        </div>
      </section>

      {/* Comments */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900">Comments</h3>
        <div>
          <label className="block text-xs font-medium text-gray-700">Appraiser Comments</label>
          <textarea
            className="mt-1 w-full rounded-xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-inner ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-rose-300"
            rows={3}
            value={details.appraiser_comments}
            onChange={(e) => handleChange("appraiser_comments", e.target.value)}
          />
        </div>
      </section>

      {/* Images */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900">Images (max 10)</h3>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            handleImagesChange(e.target.files);
            e.currentTarget.value = "";
          }}
          className="sr-only"
        />
        <div className="rounded-2xl border-2 border-dashed border-gray-300/70 bg-gradient-to-br from-white/70 to-gray-50/50 p-5 text-center backdrop-blur shadow-inner">
          <Upload className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-700">Add images</p>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-gray-900 to-black px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_0_0_rgba(0,0,0,0.5)] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(0,0,0,0.5)] focus:outline-none cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              Select Images
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">PNG, JPG. Up to 10 images.</p>
        </div>
        <p className="text-xs text-gray-500">Selected: {images.length} file(s)</p>
        {images.length > 0 && (
          <div className="rounded-2xl border border-gray-200/70 bg-white/70 p-2 shadow ring-1 ring-black/5 backdrop-blur">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {previews.map((src, idx) => (
                <div
                  key={idx}
                  className="relative group overflow-hidden rounded-xl shadow-md transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-xl"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={images[idx]?.name || `image-${idx + 1}`}
                    className="h-28 w-full object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={() => removeImage(idx)}
                    className="absolute right-1 top-1 rounded-full bg-black/70 p-1.5 text-white shadow-lg hover:bg-black/80 transition cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            className="rounded-xl border border-gray-200 bg-white/80 px-4 py-2.5 text-sm text-gray-700 shadow hover:bg-white transition active:translate-y-0.5 cursor-pointer"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_0_0_rgba(190,18,60,0.5)] hover:from-rose-400 hover:to-rose-600 transition active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(190,18,60,0.5)] disabled:opacity-50 cursor-pointer"
            disabled={submitting}
          >
            {submitting ? "Creating..." : "Create Report"}
          </button>
        </div>
        {submitting && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm">
            <Loading message="Creating your report..." height={220} width={220} />
          </div>
        )}
      </div>
    </form>
  );
}
