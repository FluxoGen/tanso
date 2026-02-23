"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, useRef, use, Suspense, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollToTop } from "@/components/scroll-to-top";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { addToHistory, markChapterAsRead } from "@/lib/storage";
import { ChevronLeft, ChevronRight, Keyboard } from "lucide-react";
import type { ChapterPagesResponse } from "@/types/manga";

type ReadingMode = "paged" | "longstrip";

interface ChapterNavInfo {
  prevChapterId: string | null;
  nextChapterId: string | null;
  chapterNumber: string | null;
  chapterTitle: string | null;
}

function ReaderContent({ chapterId, source, sourceId }: { chapterId: string; source: string; sourceId?: string | null }) {
  const searchParams = useSearchParams();
  const mangaId = searchParams.get("manga");
  const mangaTitle = searchParams.get("title") || "Manga";
  const coverUrl = searchParams.get("cover") || null;
  const initialPage = parseInt(searchParams.get("page") || "0", 10);
  const effectiveSourceId = sourceId || searchParams.get("sourceId");

  const [pages, setPages] = useState<ChapterPagesResponse | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [quality, setQuality] = useState<"data" | "data-saver">("data");
  const [loading, setLoading] = useState(true);
  const [readingMode, setReadingMode] = useState<ReadingMode>("paged");
  const [chapterNav, setChapterNav] = useState<ChapterNavInfo | null>(null);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const probeRef = useRef(false);

  // Reading progress hook
  const { updateProgress, flushProgress, completeChapter } = useReadingProgress(mangaId);

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
        // Keep initial page if provided, otherwise reset to 0
        if (initialPage === 0) {
          setCurrentPage(0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [chapterId, source, initialPage]);

  // Fetch chapter navigation info
  useEffect(() => {
    if (!mangaId) return;
    
    // Build URL with source info for non-MangaDex chapters
    let url = `/api/manga/${mangaId}/chapters?chapterId=${chapterId}`;
    if (source !== "mangadex") {
      url += `&source=${encodeURIComponent(source)}`;
      if (effectiveSourceId) {
        url += `&sourceId=${encodeURIComponent(effectiveSourceId)}`;
      }
    }
    
    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (json.nav) {
          setChapterNav(json.nav);
        }
      })
      .catch(() => {});
  }, [mangaId, chapterId, source, effectiveSourceId]);

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

  // Build chapter navigation URLs (must be computed before useEffect that uses them)
  const { prevChapterUrl, nextChapterUrl } = useMemo(() => {
    const buildChapterUrl = (targetChapterId: string) => {
      if (source === "mangadex") {
        return `/read/${targetChapterId}?manga=${mangaId}&title=${encodeURIComponent(mangaTitle)}&cover=${encodeURIComponent(coverUrl || "")}`;
      }
      const sourceIdParam = effectiveSourceId ? `&sourceId=${encodeURIComponent(effectiveSourceId)}` : "";
      return `/read/ext?manga=${mangaId}&source=${encodeURIComponent(source)}&chapterId=${encodeURIComponent(targetChapterId)}&title=${encodeURIComponent(mangaTitle)}&cover=${encodeURIComponent(coverUrl || "")}${sourceIdParam}`;
    };

    return {
      prevChapterUrl: chapterNav?.prevChapterId ? buildChapterUrl(chapterNav.prevChapterId) : null,
      nextChapterUrl: chapterNav?.nextChapterId ? buildChapterUrl(chapterNav.nextChapterId) : null,
    };
  }, [source, mangaId, mangaTitle, coverUrl, chapterNav, effectiveSourceId]);

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

        // Save progress only if user has read past page 1 (to avoid cluttering with accidental opens)
        if (mangaId && page > 0) {
          updateProgress({
            mangaId,
            mangaTitle,
            coverUrl,
            chapterId,
            chapterNumber: chapterNav?.chapterNumber || null,
            chapterTitle: chapterNav?.chapterTitle || null,
            page,
            totalPages,
            source,
          });
        }
      }
    },
    [totalPages, mangaId, mangaTitle, coverUrl, chapterId, chapterNav, source, updateProgress],
  );

  // Add to history when entering chapter
  useEffect(() => {
    if (mangaId && pages && totalPages > 0) {
      addToHistory({
        mangaId,
        title: mangaTitle,
        coverUrl,
        lastChapterId: chapterId,
        lastChapterNumber: chapterNav?.chapterNumber || null,
        lastChapterTitle: chapterNav?.chapterTitle || null,
        source,
      });
    }
  }, [mangaId, mangaTitle, coverUrl, chapterId, chapterNav, source, pages, totalPages]);

  // Mark chapter as read when reaching last page (paged mode)
  useEffect(() => {
    if (readingMode === "paged" && mangaId && currentPage >= totalPages - 1 && totalPages > 0) {
      completeChapter(chapterId);
      markChapterAsRead(mangaId, chapterId);
    }
  }, [readingMode, mangaId, currentPage, totalPages, chapterId, completeChapter]);

  // Track if chapter has been marked as read in longstrip mode
  const longstripReadRef = useRef(false);

  // Mark chapter as read when scrolling to end in longstrip mode
  useEffect(() => {
    if (readingMode !== "longstrip" || !mangaId || totalPages === 0 || longstripReadRef.current) return;

    const handleScroll = () => {
      // Check if we're near the bottom of the page (within 200px)
      const scrolledToBottom = 
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 200;
      
      if (scrolledToBottom && !longstripReadRef.current) {
        longstripReadRef.current = true;
        completeChapter(chapterId);
        markChapterAsRead(mangaId, chapterId);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [readingMode, mangaId, totalPages, chapterId, completeChapter]);

  // Save progress when leaving page
  useEffect(() => {
    return () => {
      flushProgress();
    };
  }, [flushProgress]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Show/hide keyboard help
      if (e.key === "?" || e.key === "h" || e.key === "H") {
        setShowKeyboardHelp((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        setShowKeyboardHelp(false);
        return;
      }

      if (readingMode !== "paged") return;
      
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        goTo(currentPage + 1);
      } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        goTo(currentPage - 1);
      }
      // Chapter navigation with brackets or shift+arrows
      if ((e.key === "]" || (e.shiftKey && e.key === "ArrowRight")) && nextChapterUrl) {
        window.location.href = nextChapterUrl;
      }
      if ((e.key === "[" || (e.shiftKey && e.key === "ArrowLeft")) && prevChapterUrl) {
        window.location.href = prevChapterUrl;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentPage, goTo, readingMode, nextChapterUrl, prevChapterUrl]);

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
    <div className="space-y-2">
      {/* Top row: Navigation and chapter info */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 sm:gap-2">
          {mangaId && (
            <Link href={`/manga/${mangaId}`}>
              <Button variant="ghost" size="sm" className="px-2 sm:px-3">
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </Link>
          )}

          {/* Chapter Navigation */}
          {prevChapterUrl && (
            <Link href={prevChapterUrl}>
              <Button variant="outline" size="sm" className="px-2 sm:px-3" title="Previous chapter ([)">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
          )}
          {nextChapterUrl && (
            <Link href={nextChapterUrl}>
              <Button variant="outline" size="sm" className="px-2 sm:px-3" title="Next chapter (])">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>

        {/* Chapter and page info - centered */}
        <div className="flex items-center gap-1 text-sm">
          {chapterNav?.chapterNumber && (
            <span className="font-medium">Ch. {chapterNav.chapterNumber}</span>
          )}
          {readingMode === "paged" && (
            <span className="text-muted-foreground">
              · {currentPage + 1}/{totalPages}
            </span>
          )}
          {readingMode === "longstrip" && (
            <span className="text-muted-foreground">
              · {totalPages} pg
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="px-2 hidden sm:flex"
            onClick={() => setShowKeyboardHelp(true)}
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="px-2 sm:px-3"
            onClick={() => setReadingMode((m) => (m === "paged" ? "longstrip" : "paged"))}
            title={readingMode === "paged" ? "Switch to scroll mode" : "Switch to page mode"}
          >
            {readingMode === "paged" ? "Scroll" : "Paged"}
          </Button>
          {isMangaDex && (
            <Button
              variant="outline"
              size="sm"
              className="px-2 sm:px-3"
              onClick={() => setQuality((q) => (q === "data" ? "data-saver" : "data"))}
            >
              {quality === "data" ? "HQ" : "Lite"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const keyboardHelpModal = showKeyboardHelp && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowKeyboardHelp(false)}>
      <div className="bg-popover rounded-lg shadow-xl p-6 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Keyboard className="h-5 w-5" />
          Keyboard Shortcuts
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Next page</span>
            <span className="font-mono">→ or D</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Previous page</span>
            <span className="font-mono">← or A</span>
          </div>
          <div className="border-t pt-3 flex justify-between">
            <span className="text-muted-foreground">Next chapter</span>
            <span className="font-mono">] or Shift+→</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Previous chapter</span>
            <span className="font-mono">[ or Shift+←</span>
          </div>
          <div className="border-t pt-3 flex justify-between">
            <span className="text-muted-foreground">Toggle this help</span>
            <span className="font-mono">? or H</span>
          </div>
        </div>
        <Button
          className="w-full mt-6"
          variant="outline"
          onClick={() => setShowKeyboardHelp(false)}
        >
          Close
        </Button>
      </div>
    </div>
  );

  if (readingMode === "longstrip") {
    return (
      <div className="space-y-4">
        {toolbar}
        {keyboardHelpModal}

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

        {/* End of Chapter Navigation */}
        <div className="flex flex-col items-center gap-4 py-8 border-t px-4">
          <p className="text-muted-foreground">End of chapter</p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {prevChapterUrl && (
              <Link href={prevChapterUrl}>
                <Button variant="outline" size="sm" className="sm:size-default">
                  <ChevronLeft className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Prev</span>
                </Button>
              </Link>
            )}
            {mangaId && (
              <Link href={`/manga/${mangaId}`}>
                <Button variant="outline" size="sm" className="sm:size-default">Back to manga</Button>
              </Link>
            )}
            {nextChapterUrl && (
              <Link href={nextChapterUrl}>
                <Button size="sm" className="sm:size-default">
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">Next</span>
                  <ChevronRight className="h-4 w-4 sm:ml-1" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        <ScrollToTop />
      </div>
    );
  }

  const isLastPage = currentPage >= totalPages - 1;

  return (
    <div className="space-y-4">
      {toolbar}
      {keyboardHelpModal}

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
        Use ← → arrow keys or click left/right side of the image to navigate · Press ? for shortcuts
      </p>

      {/* End of Chapter Navigation */}
      {isLastPage && (
        <div className="flex flex-col items-center gap-4 py-8 border-t px-4">
          <p className="text-lg font-medium">Chapter Complete!</p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {prevChapterUrl && (
              <Link href={prevChapterUrl}>
                <Button variant="outline" size="sm" className="sm:size-default">
                  <ChevronLeft className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Prev</span>
                </Button>
              </Link>
            )}
            {mangaId && (
              <Link href={`/manga/${mangaId}`}>
                <Button variant="outline" size="sm" className="sm:size-default">Back to manga</Button>
              </Link>
            )}
            {nextChapterUrl && (
              <Link href={nextChapterUrl}>
                <Button size="sm" className="sm:size-default">
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4 sm:ml-1" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
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
