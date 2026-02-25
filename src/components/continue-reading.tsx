'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAllReadingProgress } from '@/hooks/useReadingProgress';
import { resolveCoverUrl } from '@/lib/cover-utils';
import { buildMangaUrl } from '@/lib/manga-urls';
import { buildReadUrl } from '@/lib/read-urls';
import { clearProgress } from '@/lib/storage';
import { BookOpen, ChevronRight, Play, X } from 'lucide-react';
import type { ReadingProgress } from '@/lib/storage';

interface ContinueReadingProps {
	maxItems?: number;
}

export function ContinueReading({ maxItems = 6 }: ContinueReadingProps) {
	const [mounted, setMounted] = useState(false);
	const { progressList, isLoading, refresh } = useAllReadingProgress();

	useEffect(() => {
		setMounted(true);
	}, []);

	const handleRemove = useCallback(
		(mangaId: string, e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			clearProgress(mangaId);
			refresh();
		},
		[refresh]
	);

	if (!mounted || isLoading) {
		return (
			<section className="space-y-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<BookOpen className="h-5 w-5" />
						<h2 className="text-lg font-semibold">Continue Reading</h2>
					</div>
				</div>
				<div className="flex gap-4 overflow-hidden">
					{Array.from({ length: 4 }).map((_, i) => (
						<div key={i} className="w-40 shrink-0 space-y-2">
							<div className="bg-muted aspect-[3/4] animate-pulse rounded-lg" />
							<div className="bg-muted h-4 w-3/4 animate-pulse rounded" />
						</div>
					))}
				</div>
			</section>
		);
	}

	if (progressList.length === 0) {
		return null;
	}

	const items = progressList.slice(0, maxItems);

	return (
		<section className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<BookOpen className="text-primary h-5 w-5" />
					<h2 className="text-lg font-semibold">Continue Reading</h2>
				</div>
				{progressList.length > maxItems && (
					<Link
						href="/history"
						className="text-muted-foreground hover:text-primary flex items-center gap-1 text-sm transition-colors"
					>
						View all
						<ChevronRight className="h-4 w-4" />
					</Link>
				)}
			</div>

			<div className="scrollbar-none flex gap-4 overflow-x-auto pb-2">
				{items.map((progress) => (
					<ContinueReadingCard key={progress.mangaId} progress={progress} onRemove={handleRemove} />
				))}
			</div>
		</section>
	);
}

function ContinueReadingCard({
	progress,
	onRemove,
}: {
	progress: ReadingProgress;
	onRemove: (mangaId: string, e: React.MouseEvent) => void;
}) {
	const coverUrl = resolveCoverUrl(progress.mangaId, progress.coverUrl, '256');
	const percentComplete = Math.round((progress.page / progress.totalPages) * 100);
	const chapterText = progress.chapterNumber
		? `Ch. ${progress.chapterNumber}`
		: progress.chapterTitle || 'Chapter';

	const readUrl = buildReadUrl({
		chapterId: progress.chapterId,
		mangaId: progress.mangaId,
		source: progress.source,
		title: progress.mangaTitle,
		cover: progress.coverUrl,
		page: progress.page,
	});

	return (
		<div className="group w-36 shrink-0 sm:w-40">
			<Link href={readUrl} className="relative block">
				<div className="bg-muted relative aspect-[3/4] overflow-hidden rounded-lg">
					{coverUrl ? (
						<Image
							src={coverUrl}
							alt={progress.mangaTitle}
							fill
							className="object-cover transition-opacity group-hover:opacity-80"
							sizes="160px"
						/>
					) : (
						<div className="text-muted-foreground flex h-full items-center justify-center text-sm">
							No Cover
						</div>
					)}

					{/* Play overlay */}
					<div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
						<div className="bg-primary text-primary-foreground rounded-full p-3">
							<Play className="h-6 w-6 fill-current" />
						</div>
					</div>

					{/* Remove button */}
					<button
						onClick={(e) => onRemove(progress.mangaId, e)}
						className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/80"
						title="Remove from Continue Reading"
					>
						<X className="h-3.5 w-3.5" />
					</button>

					{/* Progress bar */}
					<div className="absolute right-0 bottom-0 left-0 h-1.5 bg-black/50">
						<div
							className="bg-primary h-full transition-all"
							style={{ width: `${percentComplete}%` }}
						/>
					</div>
				</div>
			</Link>

			<div className="mt-2 space-y-0.5">
				<Link
					href={buildMangaUrl(progress.mangaId, progress.mangaTitle)}
					className="hover:text-primary line-clamp-2 text-sm leading-tight font-medium transition-colors"
				>
					{progress.mangaTitle}
				</Link>
				<p className="text-muted-foreground text-xs">
					{chapterText} · {percentComplete}%
				</p>
			</div>
		</div>
	);
}
