"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { JSX, useEffect, useState } from "react";
import {
  Home,
  FileText,
  Settings as SettingsIcon,
  Menu,
  X,
  Eye,
  Clock,
} from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";

const InputsHistoryModal = dynamic(
  () => import("@/components/modals/InputsHistoryModal"),
  {
    ssr: false,
  }
);

type NavItem = {
  label: string;
  href: string;
  icon: (props: { className?: string }) => JSX.Element;
};

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (p) => <Home className={p.className} />,
  },
  {
    label: "Previews",
    href: "/previews",
    icon: (p) => <Eye className={p.className} />,
  },

  {
    label: "Reports",
    href: "/reports",
    icon: (p) => <FileText className={p.className} />,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: (p) => <SettingsIcon className={p.className} />,
  },
];

function classNames(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [showInputsHistory, setShowInputsHistory] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/");

  // Close on ESC and lock body scroll when sidebar is open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) {
      document.addEventListener("keydown", onKey);
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("overflow-hidden");
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-rose-100 bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Image
            src="/clearvalueIcon.png"
            alt="Logo"
            width={100}
            height={100}
          />

          <span className="text-lg font-semibold tracking-tight text-rose-700">
            ClearValue
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.slice(0, 3).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={classNames(
                "group inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                isActive(item.href)
                  ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                  : "text-gray-700 hover:bg-rose-50 hover:text-rose-700"
              )}
            >
              <div
                className={classNames(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
                  isActive(item.href)
                    ? "bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-md shadow-rose-500/30"
                    : "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 group-hover:from-rose-400 group-hover:to-rose-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-rose-500/30"
                )}
              >
                {item.icon({
                  className: "h-4 w-4",
                })}
              </div>
              <span>{item.label}</span>
            </Link>
          ))}

          <button
            onClick={() => setShowInputsHistory(true)}
            className="group inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200 text-gray-700 hover:bg-rose-50 hover:text-rose-700"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 group-hover:from-rose-400 group-hover:to-rose-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-rose-500/30">
              <Clock className="h-4 w-4" />
            </div>
            <span>Drafts</span>
          </button>

          {navItems.slice(3).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={classNames(
                "group inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                isActive(item.href)
                  ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                  : "text-gray-700 hover:bg-rose-50 hover:text-rose-700"
              )}
            >
              <div
                className={classNames(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
                  isActive(item.href)
                    ? "bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-md shadow-rose-500/30"
                    : "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 group-hover:from-rose-400 group-hover:to-rose-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-rose-500/30"
                )}
              >
                {item.icon({
                  className: "h-4 w-4",
                })}
              </div>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Mobile menu button */}
        <button
          type="button"
          aria-label="Toggle menu"
          className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-lg shadow-rose-500/40 hover:shadow-xl hover:scale-105 transition-all duration-200"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Accent bar (desktop) */}
      <div className="hidden md:block h-[2px] w-full bg-gradient-to-r from-rose-200 via-rose-400 to-rose-200" />

      {/* Mobile overlay + left sidebar */}
      <div className="md:hidden">
        {/* Overlay */}
        <div
          className={classNames(
            "fixed inset-0 z-40 bg-black/50 transition-opacity duration-300",
            open
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          )}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
        {/* Sidebar */}
        <aside
          className={classNames(
            "fixed inset-y-0 left-0 z-50 w-72 max-w-[85%] border-r border-rose-100 bg-white text-rose-800 shadow-2xl ring-1 ring-black/5 transition-transform duration-300",
            open ? "translate-x-0" : "-translate-x-full"
          )}
          role="dialog"
          aria-modal="true"
        >
          <div className="px-4 py-3 flex items-center justify-between border-b border-rose-100">
            <div className="flex items-center gap-2">
              <Image
                src="/clearvalueIcon.png"
                alt="Logo"
                width={100}
                height={100}
              />
              <span className="text-sm font-semibold tracking-tight text-rose-700">
                ClearValue
              </span>
            </div>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-lg shadow-rose-500/40 hover:shadow-xl hover:scale-105 transition-all duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="px-4 py-3 flex flex-col gap-1">
            {navItems.slice(0, 3).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={classNames(
                  "group inline-flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                  isActive(item.href)
                    ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                    : "text-gray-700 hover:bg-rose-50 hover:text-rose-700"
                )}
              >
                <div
                  className={classNames(
                    "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200",
                    isActive(item.href)
                      ? "bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-lg shadow-rose-500/40"
                      : "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 group-hover:from-rose-400 group-hover:to-rose-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-rose-500/40"
                  )}
                >
                  {item.icon({
                    className: "h-5 w-5",
                  })}
                </div>
                <span>{item.label}</span>
              </Link>
            ))}

            <button
              onClick={() => {
                setShowInputsHistory(true);
                setOpen(false);
              }}
              className="group inline-flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 text-gray-700 hover:bg-rose-50 hover:text-rose-700"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 group-hover:from-rose-400 group-hover:to-rose-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-rose-500/40">
                <Clock className="h-5 w-5" />
              </div>
              <span>Drafts</span>
            </button>

            {navItems.slice(3).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={classNames(
                  "group inline-flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                  isActive(item.href)
                    ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                    : "text-gray-700 hover:bg-rose-50 hover:text-rose-700"
                )}
              >
                <div
                  className={classNames(
                    "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200",
                    isActive(item.href)
                      ? "bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-lg shadow-rose-500/40"
                      : "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 group-hover:from-rose-400 group-hover:to-rose-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-rose-500/40"
                  )}
                >
                  {item.icon({
                    className: "h-5 w-5",
                  })}
                </div>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>
      </div>

      {/* Inputs History Modal */}
      <InputsHistoryModal
        isOpen={showInputsHistory}
        onClose={() => setShowInputsHistory(false)}
        onLoadInput={() => {
          // This will be handled in AssetForm
        }}
      />
    </header>
  );
}
