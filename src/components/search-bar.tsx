"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getCoverUrl } from "@/lib/mangadex";
import { Loader2 } from "lucide-react";

interface Suggestion {
  id: string;
  title: string;
  coverFileName: string | null;
  authorName: string | null;
  year: number | null;
  status: string;
}

export function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (pathname === "/") {
      setValue("");
      setSuggestions([]);
    } else if (pathname === "/search") {
      setValue(searchParams.get("q") ?? "");
      setSuggestions([]);
    }
  }, [pathname, searchParams]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions with debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(trimmed)}`);
        const json = await res.json();
        setSuggestions(json.suggestions ?? []);
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (trimmed) {
        setShowSuggestions(false);
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      }
    },
    [value, router]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showSuggestions || suggestions.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        const selected = suggestions[selectedIndex];
        setShowSuggestions(false);
        router.push(`/manga/${selected.id}`);
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      }
    },
    [showSuggestions, suggestions, selectedIndex, router]
  );

  const handleSuggestionClick = (id: string) => {
    setShowSuggestions(false);
    router.push(`/manga/${id}`);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <Input
            ref={inputRef}
            type="search"
            placeholder="Search manga..."
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setShowSuggestions(true);
              setSelectedIndex(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            className="pl-9 h-9"
            autoComplete="off"
          />
          {isLoading && (
            <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        <Button type="submit" size="sm" className="h-9 shrink-0">
          Search
        </Button>
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover rounded-lg border shadow-lg overflow-hidden">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent transition-colors ${
                index === selectedIndex ? "bg-accent" : ""
              }`}
            >
              <div className="relative w-10 h-14 shrink-0 rounded overflow-hidden bg-muted">
                {suggestion.coverFileName ? (
                  <Image
                    src={getCoverUrl(suggestion.id, suggestion.coverFileName, "256")}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[8px] text-muted-foreground">
                    No Cover
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm line-clamp-1">{suggestion.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {[suggestion.authorName, suggestion.year, suggestion.status]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </button>
          ))}
          <div className="border-t px-3 py-2">
            <button
              onClick={handleSubmit as unknown as () => void}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View all results for "{value}"
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
