"use client";

import { useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/politicians", label: "Politicians" },
  { href: "/parties", label: "Parties" },
  { href: "/leaderboards", label: "Leaderboards" },
  { href: "/about", label: "About" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-xl font-bold tracking-tight text-gray-900">
              ElectaBase
            </span>
            <span className="hidden text-xs text-gray-500 sm:inline">
              Political Transparency Database
            </span>
          </Link>

          {/* Desktop nav — hidden below md (768px) */}
          <nav className="hidden md:flex flex-1 items-center justify-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-lg font-bold text-gray-600 hover:text-gray-900"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/admin"
              className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
            >
              Admin
            </Link>
          </nav>

          {/* Hamburger — visible below md (768px) */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <nav className="px-4 py-3 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center min-h-[44px] px-3 py-2 text-base font-bold text-gray-700 rounded-md hover:bg-gray-50 hover:text-gray-900"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className="flex items-center min-h-[44px] px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-700"
            >
              Admin
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
