import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppProviders from "@/components/providers/AppProviders";
import "react-toastify/dist/ReactToastify.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ClearValue | Real Estate Valuation & Appraisal Reports",
    template: "%s | ClearValue",
  },
  description:
    "Generate professional real estate valuation and appraisal reports. Create, manage, and download property reports with fair market value insights.",
  keywords: [
    "real estate valuation",
    "property appraisal",
    "home valuation",
    "fair market value",
    "FMV report",
    "real estate report",
    "appraisal report",
    "property assessment",
    "real estate analytics",
    "ClearValue",
  ],
  applicationName: "ClearValue",
  category: "Real Estate",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ClearValue | Real Estate Valuation & Appraisal Reports",
    description:
      "Generate professional real estate valuation and appraisal reports. Create, manage, and download property reports with fair market value insights.",
    url: "/",
    siteName: "ClearValue",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClearValue | Real Estate Valuation & Appraisal Reports",
    description:
      "Generate professional real estate valuation and appraisal reports. Create, manage, and download property reports with fair market value insights.",
  },
  other: {
    tags: "real estate valuation, property appraisal, home valuation, fair market value, FMV report, real estate report, appraisal report, property assessment, real estate analytics, ClearValue",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
