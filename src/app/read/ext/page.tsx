"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { ReaderContent } from "@/app/read/[chapterId]/page";

function ExtReaderContent() {
  const searchParams = useSearchParams();
  const chapterId = searchParams.get("chapterId");
  const source = searchParams.get("source");
  const mangaId = searchParams.get("manga");

  if (!chapterId || !source) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-muted-foreground">
          Chapter not found — return to manga page.
        </p>
        {mangaId && (
          <Link href={`/manga/${mangaId}`}>
            <Button variant="outline" size="sm">Return to manga page</Button>
          </Link>
        )}
      </div>
    );
  }

  return <ReaderContent chapterId={chapterId} source={source} />;
}

export default function ExtReaderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      }
    >
      <ExtReaderContent />
    </Suspense>
  );
}
