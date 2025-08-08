"use client";

import { useEffect, useRef, useState } from "react";
import {
  RealEstateService,
  type RealEstateDetails,
} from "@/services/realEstate";
import { X, Upload } from "lucide-react";

type Props = {
  onSuccess?: (message?: string) => void;
  onCancel?: () => void;
};

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export default function RealEstateForm({ onSuccess, onCancel }: Props) {
  const [details, setDetails] = useState<RealEstateDetails>({
    property_details: {
      owner_name: "",
      address: "",
      land_description: "",
      municipality: "",
      title_number: "",
      parcel_number: "",
      land_area_acres: "",
      source_quarter_section: "",
    },
    report_dates: {
      report_date: isoDate(new Date()),
      effective_date: isoDate(new Date()),
      inspection_date: isoDate(new Date()),
    },
    house_details: {
      year_built: "",
      square_footage: "",
      lot_size_sqft: "",
      number_of_rooms: "",
      number_of_full_bathrooms: "",
      number_of_half_bathrooms: "",
      known_issues: [],
    },
    inspector_info: {
      inspector_name: "",
      company_name: "",
      contact_email: "",
      contact_phone: "",
      credentials: "",
    },
  });

  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleChange<
    K1 extends keyof RealEstateDetails,
    K2 extends keyof RealEstateDetails[K1] & string
  >(section: K1, field: K2, value: string) {
    setDetails((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [field]: value,
      } as any,
    }));
  }

  function handleKnownIssuesChange(value: string) {
    const issues = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setDetails((prev) => ({
      ...prev,
      house_details: {
        ...prev.house_details,
        known_issues: issues,
      },
    }));
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
    if (!details.property_details.address) {
      setError("Address is required.");
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      const payload: RealEstateDetails = {
        ...details,
        report_dates: {
          report_date: details.report_dates.report_date,
          effective_date: details.report_dates.effective_date,
          inspection_date: details.report_dates.inspection_date,
        },
      };
      const res = await RealEstateService.create(payload, images);
      onSuccess?.(res?.message);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to create report"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Property Details */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900">Property Details</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Owner Name
            </label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={details.property_details.owner_name}
              onChange={(e) =>
                handleChange("property_details", "owner_name", e.target.value)
              }
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700">
              Address
            </label>
            <input
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={details.property_details.address}
              onChange={(e) =>
                handleChange("property_details", "address", e.target.value)
              }
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700">
              Land Description
            </label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={details.property_details.land_description}
              onChange={(e) =>
                handleChange(
                  "property_details",
                  "land_description",
                  e.target.value
                )
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Municipality
            </label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={details.property_details.municipality}
              onChange={(e) =>
                handleChange("property_details", "municipality", e.target.value)
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Title Number
            </label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={details.property_details.title_number}
              onChange={(e) =>
                handleChange("property_details", "title_number", e.target.value)
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Parcel Number
            </label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={details.property_details.parcel_number}
              onChange={(e) =>
                handleChange(
                  "property_details",
                  "parcel_number",
                  e.target.value
                )
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Land Area (acres)
            </label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={details.property_details.land_area_acres}
              onChange={(e) =>
                handleChange(
                  "property_details",
                  "land_area_acres",
                  e.target.value
                )
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Source Quarter Section
            </label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={details.property_details.source_quarter_section}
              onChange={(e) =>
                handleChange(
                  "property_details",
                  "source_quarter_section",
                  e.target.value
                )
              }
            />
          </div>
        </div>
      </section>

      {/* Report Dates */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900">Report Dates</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Report Date
            </label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={details.report_dates.report_date}
              onChange={(e) =>
                handleChange("report_dates", "report_date", e.target.value)
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Effective Date
            </label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={details.report_dates.effective_date}
              onChange={(e) =>
                handleChange("report_dates", "effective_date", e.target.value)
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Inspection Date
            </label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={details.report_dates.inspection_date}
              onChange={(e) =>
                handleChange("report_dates", "inspection_date", e.target.value)
              }
            />
          </div>
        </div>
      </section>

      {/* House Details */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900">House Details</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Year Built
            </label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={details.house_details.year_built}
              onChange={(e) =>
                handleChange("house_details", "year_built", e.target.value)
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Square Footage
            </label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={details.house_details.square_footage}
              onChange={(e) =>
                handleChange("house_details", "square_footage", e.target.value)
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Lot Size (sqft)
            </label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={details.house_details.lot_size_sqft}
              onChange={(e) =>
                handleChange("house_details", "lot_size_sqft", e.target.value)
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Rooms
            </label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={details.house_details.number_of_rooms}
              onChange={(e) =>
                handleChange("house_details", "number_of_rooms", e.target.value)
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Full Bathrooms
            </label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={details.house_details.number_of_full_bathrooms}
              onChange={(e) =>
                handleChange(
                  "house_details",
                  "number_of_full_bathrooms",
                  e.target.value
                )
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Half Bathrooms
            </label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={details.house_details.number_of_half_bathrooms}
              onChange={(e) =>
                handleChange(
                  "house_details",
                  "number_of_half_bathrooms",
                  e.target.value
                )
              }
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">
            Known Issues (comma separated)
          </label>
          <input
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={details.house_details.known_issues.join(", ")}
            onChange={(e) => handleKnownIssuesChange(e.target.value)}
          />
        </div>
      </section>

      {/* Inspector Info */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900">Inspector Info</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Inspector Name
            </label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={details.inspector_info.inspector_name}
              onChange={(e) =>
                handleChange("inspector_info", "inspector_name", e.target.value)
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Company Name
            </label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={details.inspector_info.company_name}
              onChange={(e) =>
                handleChange("inspector_info", "company_name", e.target.value)
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Contact Email
            </label>
            <input
              type="email"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={details.inspector_info.contact_email}
              onChange={(e) =>
                handleChange("inspector_info", "contact_email", e.target.value)
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Contact Phone
            </label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={details.inspector_info.contact_phone}
              onChange={(e) =>
                handleChange("inspector_info", "contact_phone", e.target.value)
              }
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700">
              Credentials
            </label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={details.inspector_info.credentials}
              onChange={(e) =>
                handleChange("inspector_info", "credentials", e.target.value)
              }
            />
          </div>
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
          onChange={(e) => handleImagesChange(e.target.files)}
          className="sr-only"
        />
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white/50 p-4 text-center">
          <Upload className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-700">Add images</p>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white shadow hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
            >
              <Upload className="h-4 w-4" />
              Select Images
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">PNG, JPG. Up to 10 images.</p>
        </div>
        <p className="text-xs text-gray-500">Selected: {images.length} file(s)</p>
        {images.length > 0 && (
          <div className="rounded-md border border-gray-200 p-2">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {previews.map((src, idx) => (
                <div key={idx} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={images[idx]?.name || `image-${idx + 1}`}
                    className="h-24 w-full rounded object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={() => removeImage(idx)}
                    className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white shadow"
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
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-blue-500 disabled:opacity-50"
          disabled={submitting}
        >
          {submitting ? "Creating..." : "Create Report"}
        </button>
      </div>
    </form>
  );
}
