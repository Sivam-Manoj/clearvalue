"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { JSX, useState } from "react";
import {
  Home,
  FileText,
  Settings as SettingsIcon,
  Menu,
  X,
} from "lucide-react";

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

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-red-600 text-white font-semibold">
            CV
          </div>
          <span className="text-lg font-semibold tracking-tight">
            ClearValue
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={classNames(
                "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                isActive(item.href)
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              {item.icon({ className: "h-4 w-4" })}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Mobile menu button */}
        <button
          type="button"
          aria-label="Toggle menu"
          className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile nav panel */}
      {open && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <nav className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8 flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={classNames(
                  "inline-flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive(item.href)
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                {item.icon({ className: "h-5 w-5" })}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
