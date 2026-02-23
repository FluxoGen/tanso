"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, useRef, use, Suspense } from "react";
import { Button } from "@/components/ui/button";
import type { ChapterPagesResponse } from "@/types/manga";

type ReadingMode = "paged" | "longstrip";

function ReaderContent({ chapterId, source }: { chapterId: string; source: string }) {
  const searchParams = useSearchParams();
  const mangaId = searchParams.get("manga");

  const [pages, setPages] = useState<ChapterPagesResponse | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [quality, setQuality] = useState<"data" | "data-saver">("data");
  const [loading, setLoading] = useState(true);
  const [readingMode, setReadingMode] = useState<ReadingMode>("paged");
  const probeRef = useRef(false);

  useEffect(() => {
    let url: string;
    if (source === "mangadex") {
      url = `/api/chapter/${chapterId}`;
    } else {
      url = `/api/chapter/resolve?source=${encodeURIComponent(source)}&chapterId=${encodeURIComponent(chapterId)}`;
    }

    probeRef.current = false;

    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        setPages(json);
        setCurrentPage(0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [chapterId, source]);

  const isMangaDex = pages != null && "hash" in pages;
  const totalPages = (() => {
    if (!pages) return 0;
    if ("hash" in pages) return pages.data.length;
    return pages.pages.length;
  })();

  const PROXIED_SOURCES = new Set(["mangapill"]);

  const getImageUrl = useCallback(
    (idx: number): string => {
      if (!pages) return "";
      if ("hash" in pages) {
        const fileList = quality === "data" ? pages.data : pages.dataSaver;
        return `${pages.baseUrl}/${quality}/${pages.hash}/${fileList[idx]}`;
      }
      const directUrl = pages.pages[idx]?.img ?? "";
      if (!directUrl) return "";
      if (PROXIED_SOURCES.has(source)) {
        return `/api/proxy-image?url=${encodeURIComponent(directUrl)}&source=${encodeURIComponent(source)}`;
      }
      return directUrl;
    },
    [pages, quality, source],
  );

  // Auto-detect webtoon long-strip format by probing the second image's aspect ratio
  useEffect(() => {
    if (!pages || totalPages < 2 || probeRef.current) return;
    probeRef.current = true;

    const probeIdx = Math.min(1, totalPages - 1);
    const img = new window.Image();
    img.onload = () => {
      const ratio = img.naturalHeight / img.naturalWidth;
      if (ratio > 3) {
        setReadingMode("longstrip");
      }
    };
    img.onerror = () => {};
    img.src = getImageUrl(probeIdx);
  }, [pages, totalPages, getImageUrl]);

  const goTo = useCallback(
    (page: number) => {
      if (page >= 0 && page < totalPages) {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: "instant" });
      }
    },
    [totalPages],
  );

  useEffect(() => {
    if (readingMode !== "paged") return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        goTo(currentPage + 1);
      } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        goTo(currentPage - 1);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentPage, goTo, readingMode]);

  // Preload next pages (paged mode only)
  useEffect(() => {
    if (!pages || readingMode !== "paged") return;
    for (let i = 1; i <= 3; i++) {
      const idx = currentPage + i;
      if (idx < totalPages) {
        const img = new window.Image();
        img.src = getImageUrl(idx);
      }
    }
  }, [currentPage, pages, totalPages, getImageUrl, readingMode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading chapter...</p>
        </div>
      </div>
    );
  }

  if (!pages || totalPages === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-muted-foreground">No pages found for this chapter.</p>
        {mangaId && (
          <Link href={`/manga/${mangaId}`}>
            <Button variant="outline" size="sm">Return to manga page</Button>
          </Link>
        )}
      </div>
    );
  }

  const currentUrl = getImageUrl(currentPage);

  const toolbar = (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        {mangaId && (
          <Link href={`/manga/${mangaId}`}>
            <Button variant="ghost" size="sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1">
                <path d="m15 18-6-6 6-6" />
              </svg>
              Back
            </Button>
          </Link>
        )}
        {readingMode === "paged" && (
          <span className="text-sm text-muted-foreground">
            Page {currentPage + 1} of {totalPages}
          </span>
        )}
        {readingMode === "longstrip" && (
          <span className="text-sm text-muted-foreground">
            {totalPages} strips
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setReadingMode((m) => (m === "paged" ? "longstrip" : "paged"))}
          title={readingMode === "paged" ? "Switch to scroll mode" : "Switch to page mode"}
        >
          {readingMode === "paged" ? "Scroll" : "Paged"}
        </Button>
        {isMangaDex && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuality((q) => (q === "data" ? "data-saver" : "data"))}
          >
            {quality === "data" ? "HQ" : "Lite"}
          </Button>
        )}
      </div>
    </div>
  );

  if (readingMode === "longstrip") {
    return (
      <div className="space-y-4">
        {toolbar}

        <div className="flex flex-col items-center gap-0">
          {Array.from({ length: totalPages }).map((_, i) => (
            <Image
              key={getImageUrl(i)}
              src={getImageUrl(i)}
              alt={`Page ${i + 1}`}
              width={800}
              height={2000}
              className="w-full max-w-[800px] h-auto"
              unoptimized
              loading={i < 3 ? "eager" : "lazy"}
            />
          ))}
        </div>

        <div className="flex items-center justify-center py-4">
          {mangaId && (
            <Link href={`/manga/${mangaId}`}>
              <Button variant="outline" size="sm">Back to manga</Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {toolbar}

      <div
        className="relative flex items-center justify-center cursor-pointer select-none min-h-[50vh]"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          if (clickX < rect.width / 2) {
            goTo(currentPage - 1);
          } else {
            goTo(currentPage + 1);
          }
        }}
      >
        <Image
          key={currentUrl}
          src={currentUrl}
          alt={`Page ${currentPage + 1}`}
          width={800}
          height={1200}
          className="max-h-[85vh] w-auto object-contain mx-auto"
          priority
          unoptimized
        />
      </div>

      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 0}
          onClick={() => goTo(currentPage - 1)}
        >
          ← Previous
        </Button>

        <select
          value={currentPage}
          onChange={(e) => goTo(Number(e.target.value))}
          className="h-9 rounded-md border bg-background px-2 text-sm"
        >
          {Array.from({ length: totalPages }).map((_, i) => (
            <option key={i} value={i}>
              Page {i + 1}
            </option>
          ))}
        </select>

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages - 1}
          onClick={() => goTo(currentPage + 1)}
        >
          Next →
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Use ← → arrow keys or click left/right side of the image to navigate
      </p>
    </div>
  );
}

export { ReaderContent };

export default function ReaderPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = use(params);

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      }
    >
      <ReaderContent chapterId={chapterId} source="mangadex" />
    </Suspense>
  );
}
