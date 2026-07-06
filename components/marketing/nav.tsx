"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const LINKS = [
  { label: "For Agencies & Managers", href: "/agencies" },
  { label: "For Creators", href: "/creators" },
  { label: "Pricing", href: "/pricing" },
  { label: "Security", href: "/security" },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#F5F3EE]/90 backdrop-blur border-b border-[#111]/5">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="text-xl font-bold tracking-tight text-[#1D9E75] font-[family-name:var(--font-display)]">
          greenlit
        </Link>
        <nav className="hidden md:flex items-center gap-7">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-[#111]/70 hover:text-[#111] transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm text-[#111]/70 hover:text-[#111] transition-colors">
            Login
          </Link>
          <Link
            href="/signup"
            className="text-sm font-medium bg-[#111] text-[#F5F3EE] rounded-md px-4 py-2 hover:bg-[#111]/85 transition-colors"
          >
            Get early access
          </Link>
        </div>
        <button className="md:hidden text-[#111]" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {open && (
        <nav className="md:hidden border-t border-[#111]/5 px-5 py-4 space-y-3 bg-[#F5F3EE]">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block text-sm text-[#111]/80">
              {l.label}
            </Link>
          ))}
          <div className="flex gap-3 pt-2">
            <Link href="/login" className="text-sm text-[#111]/70 py-2">Login</Link>
            <Link href="/signup" className="text-sm font-medium bg-[#111] text-[#F5F3EE] rounded-md px-4 py-2">
              Get early access
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
