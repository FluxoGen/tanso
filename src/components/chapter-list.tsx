'use client';

import Link from 'next/link';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { buildReadUrl } from '@/lib/read-urls';
import { getReadChapters, getProgress } from '@/lib/storage';
import { ErrorState } from '@/components/error-state';
import { Check, BookOpen, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Chapter, MangaSource } from '@/types/manga';

interface SourceGroup {
	provider: string;
	displayName: string;
	primary: MangaSource;
	variations: MangaSource[];
}

interface ChapterListProps {
	mangaId: string;
	mangaTitle: string;
	coverUrl: string | null;
	altTitles?: string[];
	lastChapter: string | null;
	anilistId?: string;
}

const CHAPTERS_PER_PAGE = 30;

export function ChapterList({
	mangaId,
	mangaTitle,
	coverUrl,
	altTitles,
	lastChapter,
	anilistId,
}: ChapterListProps) {
	const [sources, setSources] = useState<MangaSource[]>([]);
	const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());

	// Derive source groups from sources (auto-updates when sources change)
	const sourceGroups = useMemo(() => groupSourcesByProvider(sources), [sources]);
	const [selectedSource, setSelectedSource] = useState<MangaSource | null>(null);
	const [chapters, setChapters] = useState<Chapter[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [sourcesLoading, setSourcesLoading] = useState(true);
	const [chapterError, setChapterError] = useState<string | null>(null);
	const [readChapters, setReadChapters] = useState<Set<string>>(new Set());
	const [currentReadingChapter, setCurrentReadingChapter] = useState<string | null>(null);
	const [currentSessionComplete, setCurrentSessionComplete] = useState(false);
	const abortRef = useRef<AbortController | null>(null);

	// Load read chapter status
	useEffect(() => {
		const loadReadStatus = () => {
			const readList = getReadChapters(mangaId);
			setReadChapters(new Set(readList));

			const progress = getProgress(mangaId);
			if (progress) {
				setCurrentReadingChapter(progress.chapterId);
				// Check if the current reading session is complete (at or past the last page)
				const isSessionComplete =
					progress.totalPages > 0 && progress.page >= progress.totalPages - 1;
				setCurrentSessionComplete(isSessionComplete);
			} else {
				setCurrentReadingChapter(null);
				setCurrentSessionComplete(false);
			}
		};

		loadReadStatus();

		// Listen for storage changes (cross-tab only)
		const handleStorageChange = (e: StorageEvent) => {
			if (e.key === 'tanso:chapters_read' || e.key === 'tanso:progress') {
				loadReadStatus();
			}
		};

		// Refresh when window gains focus (returning from reader)
		const handleFocus = () => {
			loadReadStatus();
		};

		// Refresh when page becomes visible (back/forward navigation)
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				loadReadStatus();
			}
		};

		// Refresh on pageshow event (bfcache restoration)
		const handlePageShow = (e: PageTransitionEvent) => {
			if (e.persisted) {
				loadReadStatus();
			}
		};

		window.addEventListener('storage', handleStorageChange);
		window.addEventListener('focus', handleFocus);
		document.addEventListener('visibilitychange', handleVisibilityChange);
		window.addEventListener('pageshow', handlePageShow);

		return () => {
			window.removeEventListener('storage', handleStorageChange);
			window.removeEventListener('focus', handleFocus);
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			window.removeEventListener('pageshow', handlePageShow);
		};
	}, [mangaId]);

	// Discover sources progressively
	useEffect(() => {
		const params = new URLSearchParams({ title: mangaTitle });
		if (lastChapter) params.set('lastChapter', lastChapter);
		if (anilistId) params.set('anilistId', anilistId);
		if (altTitles?.length) params.set('altTitles', altTitles.join('||'));

		fetch(`/api/manga/${mangaId}/sources?${params}`)
			.then((r) => r.json())
			.then((json) => {
				const fetched: MangaSource[] = json.sources ?? [];
				setSources(fetched);

				if (fetched.length > 0 && !selectedSource) {
					const best = pickDefaultSource(fetched, lastChapter);
					setSelectedSource(best);
				}
			})
			.catch(() => {})
			.finally(() => setSourcesLoading(false));
	}, [mangaId, mangaTitle, altTitles, lastChapter, anilistId]); // eslint-disable-line react-hooks/exhaustive-deps

	// Fetch chapters when source or page changes
	const fetchChapters = useCallback(
		(source: MangaSource, pg: number) => {
			abortRef.current?.abort();
			const controller = new AbortController();
			abortRef.current = controller;

			setChapterError(null);

			let url: string;
			if (source.provider === 'mangadex') {
				url = `/api/manga/${mangaId}/chapters?source=mangadex&page=${pg}`;
			} else {
				url = `/api/manga/${mangaId}/chapters?source=${source.provider}&sourceId=${encodeURIComponent(source.sourceId)}`;
			}

			fetch(url, { signal: controller.signal })
				.then((r) => r.json())
				.then((json) => {
					const data: Chapter[] = json.data ?? [];
					const fetchedTotal: number = json.total ?? 0;
					setChapters(data);
					setTotal(fetchedTotal);

					const realCount = source.provider === 'mangadex' ? fetchedTotal : data.length;
					if (realCount > 0) {
						setSources((prev) =>
							prev.map((s) =>
								s.provider === source.provider && s.sourceId === source.sourceId
									? { ...s, chapterCount: realCount }
									: s
							)
						);
					}
				})
				.catch((e) => {
					if (e.name !== 'AbortError') {
						setChapterError(`Failed to load chapters from ${source.displayName}.`);
					}
				})
				.finally(() => setLoading(false));
		},
		[mangaId]
	);

	// Use stable identifiers to avoid re-fetching when object reference changes
	const selectedSourceKey = selectedSource
		? `${selectedSource.provider}:${selectedSource.sourceId}`
		: null;

	useEffect(() => {
		if (selectedSource) {
			fetchChapters(selectedSource, page);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedSourceKey, page, fetchChapters]);

	// Reset page when switching source
	const handleSourceChange = (source: MangaSource) => {
		setSelectedSource(source);
		setPage(1);
	};

	// For non-MangaDex sources, do client-side pagination
	const isMangaDex = selectedSource?.provider === 'mangadex';
	const displayChapters = isMangaDex
		? chapters
		: chapters.slice((page - 1) * CHAPTERS_PER_PAGE, page * CHAPTERS_PER_PAGE);
	const totalPages = isMangaDex
		? Math.ceil(total / CHAPTERS_PER_PAGE)
		: Math.ceil(chapters.length / CHAPTERS_PER_PAGE);

	const toggleProviderExpanded = (provider: string) => {
		setExpandedProviders((prev) => {
			const next = new Set(prev);
			if (next.has(provider)) {
				next.delete(provider);
			} else {
				next.add(provider);
			}
			return next;
		});
	};

	return (
		<div className="space-y-4">
			{/* Source tabs */}
			<div className="flex flex-wrap items-center gap-2">
				{sourceGroups.map((group) => {
					const isExpanded = expandedProviders.has(group.provider);
					const hasVariations = group.variations.length > 0;
					const isPrimarySelected =
						selectedSource?.provider === group.provider &&
						selectedSource?.sourceId === group.primary.sourceId;
					const isProviderSelected = selectedSource?.provider === group.provider;
					const selectedVariation =
						isProviderSelected && !isPrimarySelected
							? [group.primary, ...group.variations].find(
									(s) => s.sourceId === selectedSource?.sourceId
								)
							: null;

					return (
						<div key={group.provider} className="flex items-center gap-1">
							<button
								onClick={() => handleSourceChange(group.primary)}
								className={cn(
									'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
									isPrimarySelected
										? 'bg-primary text-primary-foreground'
										: selectedVariation
											? 'bg-primary/20 text-primary hover:bg-primary/30'
											: 'bg-muted text-muted-foreground hover:bg-accent'
								)}
							>
								<span>{group.displayName}</span>
								<span className="opacity-75">
									({(selectedVariation ?? group.primary).chapterCount || '?'})
								</span>
							</button>
							{hasVariations && (
								<button
									onClick={() => toggleProviderExpanded(group.provider)}
									className={cn(
										'inline-flex items-center justify-center rounded-full p-1.5 text-sm transition-colors',
										isExpanded
											? 'bg-accent text-accent-foreground'
											: 'bg-muted text-muted-foreground hover:bg-accent'
									)}
									title={`${group.variations.length} other version${group.variations.length > 1 ? 's' : ''} available`}
								>
									<ChevronDown
										className={cn(
											'h-3.5 w-3.5 transition-transform',
											isExpanded && 'rotate-180'
										)}
									/>
								</button>
							)}
						</div>
					);
				})}

				{sourcesLoading && (
					<div className="flex items-center gap-2">
						<Skeleton className="h-8 w-32 rounded-full" />
						<span className="text-muted-foreground text-xs">Discovering sources...</span>
					</div>
				)}
			</div>

			{/* Expanded variations */}
			{sourceGroups.map((group) => {
				if (!expandedProviders.has(group.provider) || group.variations.length === 0) return null;

				return (
					<div
						key={`${group.provider}-variations`}
						className="bg-muted/50 rounded-lg p-3"
					>
						<p className="text-muted-foreground mb-2 text-xs">
							{group.displayName} versions:
						</p>
						<div className="space-y-1.5">
							{[group.primary, ...group.variations].map((s) => {
								const isSelected =
									selectedSource?.provider === s.provider &&
									selectedSource?.sourceId === s.sourceId;
								const label = getVariationLabel(s.matchedTitle);
								return (
									<button
										key={`${s.provider}:${s.sourceId}`}
										onClick={() => handleSourceChange(s)}
										className={cn(
											'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
											isSelected
												? 'bg-primary text-primary-foreground'
												: 'bg-background hover:bg-accent'
										)}
									>
										<span className="font-medium">{label}</span>
										<span
											className={cn(
												'shrink-0 text-xs',
												isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
											)}
										>
											{s.chapterCount || '?'} ch
										</span>
									</button>
								);
							})}
						</div>
					</div>
				);
			})}

			{!sourcesLoading && sourceGroups.length <= 1 && sourceGroups[0]?.provider === 'mangadex' && (
				<p className="text-muted-foreground text-xs">Only MangaDex available for this title.</p>
			)}

			{/* Chapter list */}
			{loading ? (
				<div className="space-y-2">
					{Array.from({ length: 8 }).map((_, i) => (
						<Skeleton key={i} className="h-12 w-full rounded-md" />
					))}
				</div>
			) : chapterError ? (
				<ErrorState
					error={chapterError}
					onRetry={() => selectedSource && fetchChapters(selectedSource, page)}
					showHomeLink={false}
				/>
			) : displayChapters.length === 0 ? (
				<p className="text-muted-foreground py-4">
					{selectedSource
						? `No chapters found on ${selectedSource.displayName}.`
						: 'No chapters available.'}
				</p>
			) : (
				<div className="space-y-1">
					{displayChapters.map((ch) => (
						<ChapterRow
							key={`${ch.source}:${ch.id}`}
							ch={ch}
							mangaId={mangaId}
							mangaTitle={mangaTitle}
							coverUrl={coverUrl}
							sourceId={selectedSource?.sourceId}
							isRead={readChapters.has(ch.id)}
							isReading={ch.id === currentReadingChapter}
							isCurrentSessionComplete={ch.id === currentReadingChapter && currentSessionComplete}
						/>
					))}
				</div>
			)}

			{/* Pagination */}
			{totalPages > 1 && !loading && !chapterError && (
				<div className="flex items-center justify-center gap-2 pt-2">
					<Button
						variant="outline"
						size="sm"
						disabled={page <= 1}
						onClick={() => setPage((p) => p - 1)}
					>
						Previous
					</Button>
					<span className="text-muted-foreground text-sm">
						Page {page} of {totalPages}
					</span>
					<Button
						variant="outline"
						size="sm"
						disabled={page >= totalPages}
						onClick={() => setPage((p) => p + 1)}
					>
						Next
					</Button>
				</div>
			)}
		</div>
	);
}

interface ChapterRowProps {
	ch: Chapter;
	mangaId: string;
	mangaTitle: string;
	coverUrl: string | null;
	sourceId?: string;
	isRead: boolean;
	isReading: boolean;
	isCurrentSessionComplete: boolean;
}

function ChapterRow({
	ch,
	mangaId,
	mangaTitle,
	coverUrl,
	sourceId,
	isRead,
	isReading,
	isCurrentSessionComplete,
}: ChapterRowProps) {
	const href = buildReadUrl({
		chapterId: ch.id,
		mangaId,
		source: ch.source,
		title: mangaTitle,
		cover: coverUrl,
		sourceId: ch.source !== 'mangadex' ? sourceId : undefined,
	});

	// A chapter shows as "reading" (book icon) if:
	// 1. It's the current chapter being read (isReading), AND
	// 2. The current reading session is NOT complete (user hasn't reached the last page yet)
	//
	// A chapter shows as "completed" (checkmark) if:
	// 1. It was completed previously (isRead), OR
	// 2. It's the current chapter AND the current session is complete
	const effectiveIsReading = isReading && !isCurrentSessionComplete;
	const effectiveIsRead = isRead || (isReading && isCurrentSessionComplete);

	return (
		<Link
			href={href}
			className={cn(
				'relative block rounded-md px-3 py-2.5 text-sm transition-colors',
				effectiveIsReading
					? 'bg-primary/10 hover:bg-primary/15 border-primary border-l-2'
					: effectiveIsRead
						? 'bg-muted/50 hover:bg-accent'
						: 'hover:bg-accent'
			)}
		>
			{/* Mobile layout */}
			<div className="space-y-1 sm:hidden">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						{effectiveIsReading ? (
							<BookOpen className="text-primary h-4 w-4 shrink-0" />
						) : effectiveIsRead ? (
							<Check className="text-muted-foreground h-4 w-4 shrink-0" />
						) : (
							<span className="w-4 shrink-0" />
						)}
						<span className={cn('font-medium', effectiveIsRead && 'text-muted-foreground')}>
							{ch.volume ? `Vol. ${ch.volume} ` : ''}Ch. {ch.chapter ?? '—'}
						</span>
					</div>
					{ch.publishAt && (
						<span className="text-muted-foreground text-xs whitespace-nowrap">
							{new Date(ch.publishAt).toLocaleDateString()}
						</span>
					)}
				</div>
				{ch.title && (
					<p
						className={cn(
							'ml-6 text-sm',
							effectiveIsRead ? 'text-muted-foreground/70' : 'text-muted-foreground'
						)}
					>
						{ch.title}
					</p>
				)}
				{ch.scanlationGroup && (
					<p className="text-muted-foreground/70 ml-6 text-xs">{ch.scanlationGroup}</p>
				)}
			</div>

			{/* Desktop layout */}
			<div className="hidden items-center justify-between gap-4 sm:flex">
				<div className="flex min-w-0 flex-1 items-center gap-3">
					<div className="flex shrink-0 items-center gap-2">
						{effectiveIsReading ? (
							<BookOpen className="text-primary h-4 w-4" />
						) : effectiveIsRead ? (
							<Check className="text-muted-foreground h-4 w-4" />
						) : (
							<span className="w-4" />
						)}
						<span
							className={cn(
								'font-medium whitespace-nowrap',
								effectiveIsRead && 'text-muted-foreground'
							)}
						>
							{ch.volume ? `Vol. ${ch.volume} ` : ''}Ch. {ch.chapter ?? '—'}
						</span>
					</div>
					{ch.title && (
						<span
							className={cn(
								'truncate',
								effectiveIsRead ? 'text-muted-foreground/70' : 'text-muted-foreground'
							)}
						>
							{ch.title}
						</span>
					)}
				</div>
				<div className="text-muted-foreground flex shrink-0 items-center gap-3 text-xs">
					{ch.scanlationGroup && <span className="whitespace-nowrap">{ch.scanlationGroup}</span>}
					{ch.publishAt && (
						<span className="whitespace-nowrap">{new Date(ch.publishAt).toLocaleDateString()}</span>
					)}
				</div>
			</div>
		</Link>
	);
}

function pickDefaultSource(sources: MangaSource[], lastChapter: string | null): MangaSource {
	const mdSource = sources.find((s) => s.provider === 'mangadex');
	const expected = lastChapter ? parseInt(lastChapter, 10) : 0;

	if (mdSource && expected > 0 && mdSource.chapterCount >= expected * 0.8) {
		return mdSource;
	}

	// Pick highest-confidence source with the most chapters
	const sorted = [...sources].sort((a, b) => {
		if (b.confidence !== a.confidence) return b.confidence - a.confidence;
		return b.chapterCount - a.chapterCount;
	});

	return sorted[0] ?? sources[0];
}

function getVariationLabel(title: string): string {
	// If title has multiple parts separated by comma, take the first meaningful one
	const parts = title.split(/[,،]/).map((p) => p.trim());
	let label = parts[0];

	// Clean up common suffixes/prefixes that make titles confusing
	label = label
		.replace(/\s*-\s*Digital Colored Comics$/i, ' (Colored)')
		.replace(/\s*:\s*Buddy Stories$/i, ': Buddy Stories')
		.replace(/\s*\(Full Color\)$/i, ' (Colored)')
		.replace(/\s*\(Official\)$/i, '')
		.replace(/\s*\(Digital\)$/i, '');

	// If label starts with numbers like "17-21:" or "22-26:", it's likely an author collection
	if (/^\d+-\d+:/.test(label)) {
		// Try to find a better name from the parts
		const betterName = parts.find(
			(p) => !p.includes('Fujimoto') && !p.includes('Tanpenshuu') && p.length > 3
		);
		if (betterName) {
			label = betterName.trim();
		}
	}

	return label || title;
}

function groupSourcesByProvider(sources: MangaSource[]): SourceGroup[] {
	const providerMap = new Map<string, MangaSource[]>();

	for (const source of sources) {
		const existing = providerMap.get(source.provider) ?? [];
		existing.push(source);
		providerMap.set(source.provider, existing);
	}

	const groups: SourceGroup[] = [];

	for (const [provider, providerSources] of providerMap) {
		// Sort by chapter count (desc), then confidence (desc)
		const sorted = [...providerSources].sort((a, b) => {
			if (b.chapterCount !== a.chapterCount) return b.chapterCount - a.chapterCount;
			return b.confidence - a.confidence;
		});

		const primary = sorted[0];
		const variations = sorted.slice(1);

		groups.push({
			provider,
			displayName: primary.displayName,
			primary,
			variations,
		});
	}

	// Sort groups: MangaDex first, then by primary's confidence
	return groups.sort((a, b) => {
		if (a.provider === 'mangadex') return -1;
		if (b.provider === 'mangadex') return 1;
		return b.primary.confidence - a.primary.confidence;
	});
}
