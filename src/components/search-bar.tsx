'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getCoverUrl } from '@/lib/mangadex';
import { buildMangaUrl } from '@/lib/manga-urls';
import { Loader2, X } from 'lucide-react';

interface Suggestion {
  id: string;
  title: string;
  coverFileName: string | null;
  authorName: string | null;
  year: number | null;
  status: string;
}

const VISIBLE_SUGGESTIONS = 6;

export function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [visibleCount, setVisibleCount] = useState(VISIBLE_SUGGESTIONS);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (pathname === '/') {
      setValue('');
      setSuggestions([]);
    } else if (pathname === '/search') {
      setValue(searchParams.get('q') ?? '');
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

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    setVisibleCount(VISIBLE_SUGGESTIONS);
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

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        const selected = suggestions[selectedIndex];
        setShowSuggestions(false);
        router.push(buildMangaUrl(selected.id, selected.title));
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    },
    [showSuggestions, suggestions, selectedIndex, router]
  );

  const handleSuggestionClick = (id: string, title: string) => {
    setShowSuggestions(false);
    router.push(buildMangaUrl(id, title));
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
            className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search manga..."
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setShowSuggestions(true);
              setSelectedIndex(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            className={`h-9 pl-9 ${value || isLoading ? 'pr-9' : ''}`}
            autoComplete="off"
          />
          {isLoading ? (
            <Loader2 className="text-muted-foreground absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 animate-spin" />
          ) : value ? (
            <button
              type="button"
              onClick={() => {
                setValue('');
                setSuggestions([]);
                setShowSuggestions(false);
                inputRef.current?.focus();
              }}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <Button type="submit" size="sm" className="h-9 shrink-0">
          Search
        </Button>
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="bg-popover absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-lg border shadow-lg">
          <div
            ref={suggestionsRef}
            className="max-h-[360px] overflow-y-auto"
            onScroll={(e) => {
              const el = e.currentTarget;
              if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
                setVisibleCount((prev) => Math.min(prev + VISIBLE_SUGGESTIONS, suggestions.length));
              }
            }}
          >
            {suggestions.slice(0, visibleCount).map((suggestion, index) => (
              <button
                key={suggestion.id}
                onClick={() => handleSuggestionClick(suggestion.id, suggestion.title)}
                className={`hover:bg-accent flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                  index === selectedIndex ? 'bg-accent' : ''
                }`}
              >
                <div className="bg-muted relative h-14 w-10 shrink-0 overflow-hidden rounded">
                  {suggestion.coverFileName ? (
                    <Image
                      src={getCoverUrl(suggestion.id, suggestion.coverFileName, '256')}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  ) : (
                    <div className="text-muted-foreground flex h-full w-full items-center justify-center text-[8px]">
                      No Cover
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium">{suggestion.title}</p>
                  <p className="text-muted-foreground line-clamp-1 text-xs">
                    {[suggestion.authorName, suggestion.year, suggestion.status]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
              </button>
            ))}
            {visibleCount < suggestions.length && (
              <div className="text-muted-foreground py-2 text-center text-xs">
                Scroll for more...
              </div>
            )}
          </div>
          <div className="border-t px-3 py-2">
            <button
              onClick={handleSubmit as unknown as () => void}
              className="text-muted-foreground hover:text-foreground text-xs transition-colors"
            >
              View all results for "{value}"
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
