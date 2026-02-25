'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { buildMangaUrl } from '@/lib/manga-urls';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Redirects /manga/[id] to /manga/[id]/[slug] for backward compatibility.
 * Fetches manga to get title, then redirects to SEO-friendly URL.
 */
export default function MangaIdRedirect() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    fetch(`/api/manga/${id}`)
      .then((r) => r.json())
      .then((json) => {
        const manga = json?.manga;
        if (manga?.title) {
          router.replace(buildMangaUrl(manga.id, manga.title));
        }
      })
      .catch(() => {
        router.replace(`/manga/${id}/manga`);
      });
  }, [id, router]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 sm:flex-row">
        <Skeleton className="aspect-[3/4] w-40 shrink-0 rounded-lg sm:w-48" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
    </div>
  );
}
