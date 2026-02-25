'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useHistory, formatRelativeTime, groupHistoryByDate } from '@/hooks/useHistory';
import { resolveCoverUrl } from '@/lib/cover-utils';
import { buildMangaUrl } from '@/lib/manga-urls';
import { buildReadUrl } from '@/lib/read-urls';
import { Clock, ChevronRight, X } from 'lucide-react';
import type { HistoryEntry } from '@/lib/storage';

export default function HistoryPage() {
	const [mounted, setMounted] = useState(false);
	const { history, isLoading, remove, clear } = useHistory();
	const [showClearConfirm, setShowClearConfirm] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted || isLoading) {
		return (
			<main className="mx-auto max-w-7xl px-4 py-6">
				<div className="space-y-6">
					<div className="bg-muted h-8 w-48 animate-pulse rounded" />
					<div className="space-y-4">
						{Array.from({ length: 5 }).map((_, i) => (
							<div key={i} className="flex gap-4">
								<div className="bg-muted h-24 w-16 shrink-0 animate-pulse rounded" />
								<div className="flex-1 space-y-2">
									<div className="bg-muted h-5 w-3/4 animate-pulse rounded" />
									<div className="bg-muted h-4 w-1/2 animate-pulse rounded" />
								</div>
							</div>
						))}
					</div>
				</div>
			</main>
		);
	}

	const groupedHistory = groupHistoryByDate(history);

	return (
		<main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Clock className="h-7 w-7" />
					<h1 className="text-2xl font-bold">Reading History</h1>
				</div>
				{history.length > 0 && (
					<button
						onClick={() => setShowClearConfirm(true)}
						className="text-muted-foreground hover:text-destructive text-sm transition-colors"
					>
						Clear All
					</button>
				)}
			</div>

			{history.length === 0 ? (
				<EmptyState />
			) : (
				<div className="space-y-8">
					{Array.from(groupedHistory.entries()).map(([dateGroup, entries]) => (
						<section key={dateGroup} className="space-y-4">
							<h2 className="text-muted-foreground border-b pb-2 text-lg font-semibold">
								{dateGroup}
							</h2>
							<div className="space-y-3">
								{entries.map((entry) => (
									<HistoryCard
										key={entry.mangaId}
										entry={entry}
										onRemove={() => remove(entry.mangaId)}
									/>
								))}
							</div>
						</section>
					))}
				</div>
			)}

			{/* Clear Confirmation Modal */}
			{showClearConfirm && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
					<div className="bg-popover mx-4 max-w-sm rounded-lg p-6 shadow-xl">
						<h3 className="mb-2 text-lg font-semibold">Clear History</h3>
						<p className="text-muted-foreground mb-6">
							Are you sure you want to clear your entire reading history? This action cannot be
							undone.
						</p>
						<div className="flex justify-end gap-3">
							<button
								onClick={() => setShowClearConfirm(false)}
								className="hover:bg-accent rounded-md px-4 py-2 text-sm font-medium transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={() => {
									clear();
									setShowClearConfirm(false);
								}}
								className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md px-4 py-2 text-sm font-medium transition-colors"
							>
								Clear History
							</button>
						</div>
					</div>
				</div>
			)}
		</main>
	);
}

function EmptyState() {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center">
			<Clock className="text-muted-foreground/50 mb-4 h-16 w-16" />
			<h2 className="mb-2 text-lg font-medium">No reading history</h2>
			<p className="text-muted-foreground mb-6 max-w-sm">
				Your reading history will appear here as you read manga chapters.
			</p>
			<Link href="/" className="text-primary inline-flex items-center gap-2 hover:underline">
				Start reading
				<ChevronRight className="h-4 w-4" />
			</Link>
		</div>
	);
}

interface HistoryCardProps {
	entry: HistoryEntry;
	onRemove: () => void;
}

function HistoryCard({ entry, onRemove }: HistoryCardProps) {
	const coverUrl = resolveCoverUrl(entry.mangaId, entry.coverUrl, '256');

	const chapterText = entry.lastChapterNumber
		? `Ch. ${entry.lastChapterNumber}`
		: entry.lastChapterTitle || 'Chapter';

	return (
		<div className="group hover:bg-accent/50 flex gap-4 rounded-lg p-3 transition-colors">
			<Link href={buildMangaUrl(entry.mangaId, entry.title)} className="shrink-0">
				<div className="bg-muted relative h-24 w-16 overflow-hidden rounded-md">
					{coverUrl ? (
						<Image src={coverUrl} alt={entry.title} fill className="object-cover" sizes="64px" />
					) : (
						<div className="text-muted-foreground flex h-full items-center justify-center text-xs">
							No Cover
						</div>
					)}
				</div>
			</Link>

			<div className="flex min-w-0 flex-1 flex-col justify-center">
				<Link
					href={buildMangaUrl(entry.mangaId, entry.title)}
					className="hover:text-primary line-clamp-1 font-medium transition-colors"
				>
					{entry.title}
				</Link>
				<p className="text-muted-foreground line-clamp-1 text-sm">{chapterText}</p>
				<p className="text-muted-foreground mt-1 text-xs">{formatRelativeTime(entry.lastReadAt)}</p>
			</div>

			<div className="flex items-center gap-2">
				<Link
					href={
						entry.source === 'mangadex'
							? buildReadUrl({
									chapterId: entry.lastChapterId,
									mangaId: entry.mangaId,
								})
							: buildReadUrl({
									chapterId: entry.lastChapterId,
									mangaId: entry.mangaId,
									source: entry.source,
								})
					}
					className="text-primary shrink-0 text-sm font-medium hover:underline"
				>
					Continue
				</Link>
				<button
					onClick={onRemove}
					className="hover:bg-accent rounded-md p-1.5 opacity-0 transition-all group-hover:opacity-100"
					title="Remove from history"
				>
					<X className="text-muted-foreground h-4 w-4" />
				</button>
			</div>
		</div>
	);
}
