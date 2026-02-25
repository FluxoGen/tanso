import { MangaCard, MangaCardSkeleton } from './manga-card';
import type { Manga } from '@/types/manga';

export function MangaGrid({ manga }: { manga: Manga[] }) {
  if (manga.length === 0) {
    return <p className="text-muted-foreground py-8 text-center">No manga found.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {manga.map((m) => (
        <MangaCard key={m.id} manga={m} />
      ))}
    </div>
  );
}

export function MangaGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <MangaCardSkeleton key={i} />
      ))}
    </div>
  );
}
