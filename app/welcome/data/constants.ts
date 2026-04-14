import {
  FileSpreadsheet,
  Layers3,
  Users,
  ShieldCheck,
  BellRing,
  Smartphone,
  Building2,
  BarChart3,
} from "lucide-react";

export const featureCards = [
  {
    title: "Structured appraisal reporting",
    description:
      "Build polished valuation outputs with clean sections, method visibility, and export-ready presentation.",
    icon: FileSpreadsheet,
  },
  {
    title: "Auction and lot management",
    description:
      "Organize assets, lot groupings, and operational details in one workspace built for auction delivery.",
    icon: Layers3,
  },
  {
    title: "Operational oversight",
    description:
      "Keep teams aligned with activity tracking, workflow visibility, and faster handoffs between staff.",
    icon: Users,
  },
  {
    title: "Secure client delivery",
    description:
      "Maintain confidence with protected access, clear status control, and dependable document handling.",
    icon: ShieldCheck,
  },
];

export const workflowPillars = [
  "Prepare valuations with consistent data structure and approval-ready outputs.",
  "Track team actions, reminders, and progress without losing operational context.",
  "Support desktop and mobile usage with responsive workflows and clear navigation.",
  "Present a more credible front to clients with sharper reporting and delivery tools.",
];

export const trustStats = [
  { value: "4", label: "valuation tracks" },
  { value: "6+", label: "core workflow areas" },
  { value: "24/7", label: "team visibility" },
  { value: "Web + mobile", label: "responsive access" },
];

export const commandRows = [
  { label: "New valuation requests", value: "18", tone: "#e11d48" },
  { label: "Reports in review", value: "07", tone: "#2563eb" },
  { label: "Auction lots queued", value: "42", tone: "#7c3aed" },
  { label: "Follow-ups today", value: "13", tone: "#059669" },
];

export const credibilityFeatures = [
  {
    icon: BellRing,
    title: "Faster response rhythm",
    body: "Stay on top of reviews, next actions, and delivery timing with less friction.",
  },
  {
    icon: Smartphone,
    title: "Responsive everywhere",
    body: "The experience is designed to read cleanly across mobile, tablet, and desktop.",
  },
  {
    icon: Building2,
    title: "Sharper market presence",
    body: "A better landing page improves first impressions before users ever reach the dashboard.",
  },
  {
    icon: BarChart3,
    title: "Executive visual language",
    body: "Depth, motion, and structured panels create a stronger enterprise feel without being noisy.",
  },
];
