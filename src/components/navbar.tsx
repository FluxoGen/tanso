"use client";

import Link from "next/link";
import { Suspense } from "react";
import { SearchBar } from "./search-bar";
import { ThemeToggle } from "./theme-toggle";

export function Navbar() {
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

        <div className="flex-1 flex justify-center">
          <Suspense>
            <SearchBar />
          </Suspense>
        </div>

        <ThemeToggle />
      </div>
    </header>
  );
}
