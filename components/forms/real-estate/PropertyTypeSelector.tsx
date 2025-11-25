"use client";

import React from "react";

export type PropertyType = "agricultural" | "commercial" | "residential";

type Props = {
  value?: PropertyType;
  onChange: (type: PropertyType) => void;
};

const PROPERTY_TYPES = [
  {
    type: "agricultural" as PropertyType,
    label: "Agricultural Land",
    description: "Direct Comparison Approach is the primary basis of value.",
    color: "emerald",
  },
  {
    type: "commercial" as PropertyType,
    label: "Commercial Property",
    description:
      "Income Capitalization Approach typically carries the greatest weight, supported by Direct Comparison.",
    color: "blue",
  },
  {
    type: "residential" as PropertyType,
    label: "Residential Property",
    description:
      "Direct Comparison is the principal approach, with the Cost Approach used for support when improvements are newer or unique.",
    color: "rose",
  },
];

export default function PropertyTypeSelector({ value, onChange }: Props) {
  const getColorClasses = (color: string, isSelected: boolean) => {
    const classes = {
      emerald: isSelected
        ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-300"
        : "border-gray-200 bg-white hover:border-emerald-300",
      blue: isSelected
        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-300"
        : "border-gray-200 bg-white hover:border-blue-300",
      rose: isSelected
        ? "border-rose-500 bg-rose-50 ring-2 ring-rose-300"
        : "border-gray-200 bg-white hover:border-rose-300",
    };
    return classes[color as keyof typeof classes] || classes.rose;
  };

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-gray-900">Property Type</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PROPERTY_TYPES.map((pt) => {
          const isSelected = value === pt.type;
          return (
            <button
              key={pt.type}
              type="button"
              onClick={() => onChange(pt.type)}
              className={`rounded-xl border-2 p-4 text-left transition-all ${getColorClasses(
                pt.color,
                isSelected
              )}`}
            >
              <div className="font-semibold text-gray-900">{pt.label}</div>
              <div className="mt-1 text-xs text-gray-600">{pt.description}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
