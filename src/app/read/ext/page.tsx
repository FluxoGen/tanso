'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { buildMangaUrl } from '@/lib/manga-urls';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { ReaderContent } from '@/app/read/[chapterId]/page';

function ExtReaderContent() {
  const searchParams = useSearchParams();
  const chapterId = searchParams.get('chapterId');
  const source = searchParams.get('source');
  const mangaId = searchParams.get('manga');
  const sourceId = searchParams.get('sourceId');

  if (!chapterId || !source) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-muted-foreground">Chapter not found — return to manga page.</p>
        {mangaId && (
          <Link href={buildMangaUrl(mangaId, 'Manga')}>
            <Button variant="outline" size="sm">
              Return to manga page
            </Button>
          </Link>
        )}
      </div>
    );
  }

  return <ReaderContent chapterId={chapterId} source={source} sourceId={sourceId} />;
}

export default function ExtReaderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="border-muted border-t-primary h-8 w-8 animate-spin rounded-full border-4" />
        </div>
      }
    >
      <ExtReaderContent />
    </Suspense>
  );
}
