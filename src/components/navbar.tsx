"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { SearchBar } from "./search-bar";
import { ThemeToggle } from "./theme-toggle";
import { BookOpen, Clock, Library, Menu, Sparkles, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/latest", label: "Latest", icon: Sparkles },
  { href: "/library", label: "Library", icon: Library },
  { href: "/history", label: "History", icon: Clock },
];

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
          <svg viewBox="0 0 100 100" fill="none" className="h-8 w-8">
            <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="2" />
            <rect x="20" y="58" width="60" height="3" className="fill-[#E63946]" />
            <rect x="46" y="25" width="8" height="45" fill="currentColor" />
            <rect x="30" y="25" width="40" height="8" fill="currentColor" />
            <circle cx="50" cy="18" r="3" className="fill-[#E63946]" />
          </svg>
          <span className="hidden sm:inline">Tanso</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 ml-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex-1 flex justify-center">
          <Suspense>
            <SearchBar />
          </Suspense>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-md hover:bg-accent transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <nav className="md:hidden border-t bg-background/95 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 py-2 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
