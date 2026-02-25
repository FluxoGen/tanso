'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MangaCard, MangaCardSkeleton } from '@/components/manga-card';
import { TagFilter } from '@/components/tag-filter';
import { ScrollToTop } from '@/components/scroll-to-top';
import { Button } from '@/components/ui/button';
import type { Manga } from '@/types/manga';
import { Loader2, List, Infinity } from 'lucide-react';

const ITEMS_PER_PAGE = 20;

type ViewMode = 'infinite' | 'paginated';

function LatestContent() {
	const searchParams = useSearchParams();
	const router = useRouter();

	const [manga, setManga] = useState<Manga[]>([]);
	const [total, setTotal] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [offset, setOffset] = useState(0);
	const [currentPage, setCurrentPage] = useState(1);
	const [viewMode, setViewMode] = useState<ViewMode>('infinite');
	const [selectedTags, setSelectedTags] = useState<string[]>(() => searchParams.getAll('tags'));
	const [selectedRatings, setSelectedRatings] = useState<string[]>(() =>
		searchParams.getAll('ratings')
	);
	const observerRef = useRef<IntersectionObserver | null>(null);
	const loadMoreRef = useRef<HTMLDivElement>(null);

	const fetchManga = useCallback(
		async (newOffset: number, reset = false) => {
			if (reset) {
				setIsLoading(true);
			} else {
				setIsLoadingMore(true);
			}

			try {
				const params = new URLSearchParams({
					limit: String(ITEMS_PER_PAGE),
					offset: String(newOffset),
				});

				if (selectedTags.length > 0) {
					selectedTags.forEach((tag) => params.append('tags', tag));
				}

				if (selectedRatings.length > 0) {
					selectedRatings.forEach((rating) => params.append('ratings', rating));
				}

				const res = await fetch(`/api/manga/latest?${params}`);
				const json = await res.json();

				if (reset) {
					setManga(json.data);
				} else {
					// Deduplicate manga by ID when appending
					setManga((prev) => {
						const existingIds = new Set(prev.map((m) => m.id));
						const newManga = json.data.filter((m: Manga) => !existingIds.has(m.id));
						return [...prev, ...newManga];
					});
				}

				setTotal(json.total ?? 0);
				setHasMore(
					json.data.length === ITEMS_PER_PAGE && newOffset + json.data.length < json.total
				);
				setOffset(newOffset + json.data.length);
			} catch (error) {
				console.error('Error fetching latest manga:', error);
			} finally {
				setIsLoading(false);
				setIsLoadingMore(false);
			}
		},
		[selectedTags, selectedRatings]
	);

	// Initial load and filter changes
	useEffect(() => {
		setManga([]);
		setOffset(0);
		setCurrentPage(1);
		setHasMore(true);
		fetchManga(0, true);
	}, [selectedTags, selectedRatings, fetchManga]);

	// Handle page change in paginated mode
	const handlePageChange = useCallback(
		(newPage: number) => {
			setCurrentPage(newPage);
			const newOffset = (newPage - 1) * ITEMS_PER_PAGE;
			setManga([]);
			fetchManga(newOffset, true);
			window.scrollTo({ top: 0, behavior: 'smooth' });
		},
		[fetchManga]
	);

	// Toggle view mode
	const handleViewModeChange = (mode: ViewMode) => {
		if (mode === viewMode) return;
		setViewMode(mode);
		setManga([]);
		setOffset(0);
		setCurrentPage(1);
		setHasMore(true);
		fetchManga(0, true);
	};

	const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

	const updateUrl = useCallback(
		(tags: string[], ratings: string[]) => {
			const params = new URLSearchParams();
			tags.forEach((t) => params.append('tags', t));
			ratings.forEach((r) => params.append('ratings', r));
			const queryString = params.toString();
			router.push(queryString ? `/latest?${queryString}` : '/latest', {
				scroll: false,
			});
		},
		[router]
	);

	// Infinite scroll observer (only active in infinite mode)
	useEffect(() => {
		if (viewMode !== 'infinite' || isLoading || isLoadingMore || !hasMore) return;

		observerRef.current = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
					fetchManga(offset);
				}
			},
			{ threshold: 0.1 }
		);

		if (loadMoreRef.current) {
			observerRef.current.observe(loadMoreRef.current);
		}

		return () => {
			if (observerRef.current) {
				observerRef.current.disconnect();
			}
		};
	}, [viewMode, isLoading, isLoadingMore, hasMore, offset, fetchManga]);

	return (
		<main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
			<div className="space-y-2">
				<h1 className="text-2xl font-bold">Latest Updates</h1>
				<p className="text-muted-foreground">Discover the most recently updated manga</p>
			</div>

			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<TagFilter
					selectedTags={selectedTags}
					selectedRatings={selectedRatings}
					onTagsChange={(tags) => {
						setSelectedTags(tags);
						updateUrl(tags, selectedRatings);
					}}
					onRatingsChange={(ratings) => {
						setSelectedRatings(ratings);
						updateUrl(selectedTags, ratings);
					}}
					compact
				/>

				{/* View mode toggle */}
				<div className="flex shrink-0 items-center gap-2">
					<span className="text-muted-foreground text-sm">View:</span>
					<div className="flex rounded-md border">
						<button
							onClick={() => handleViewModeChange('infinite')}
							aria-label={`Switch to infinite scroll view${viewMode === 'infinite' ? ', currently active' : ''}`}
							className={`flex items-center gap-1.5 rounded-l-md px-3 py-1.5 text-sm transition-colors ${
								viewMode === 'infinite' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
							}`}
							title="Infinite scroll"
						>
							<Infinity className="h-4 w-4" />
							<span className="hidden sm:inline">Scroll</span>
						</button>
						<button
							onClick={() => handleViewModeChange('paginated')}
							aria-label={`Switch to paginated view${viewMode === 'paginated' ? ', currently active' : ''}`}
							className={`flex items-center gap-1.5 rounded-r-md border-l px-3 py-1.5 text-sm transition-colors ${
								viewMode === 'paginated' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
							}`}
							title="Page navigation"
						>
							<List className="h-4 w-4" />
							<span className="hidden sm:inline">Pages</span>
						</button>
					</div>
				</div>
			</div>

			{isLoading ? (
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
					{Array.from({ length: 20 }).map((_, i) => (
						<MangaCardSkeleton key={i} />
					))}
				</div>
			) : manga.length === 0 ? (
				<div className="py-12 text-center">
					<p className="text-muted-foreground">No manga found with the selected filters</p>
				</div>
			) : (
				<>
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
						{manga.map((m) => (
							<MangaCard key={m.id} manga={m} />
						))}
					</div>

					{/* Infinite scroll trigger */}
					{viewMode === 'infinite' && (
						<div ref={loadMoreRef} className="flex justify-center py-8">
							{isLoadingMore && (
								<div className="text-muted-foreground flex items-center gap-2">
									<Loader2 className="h-5 w-5 animate-spin" />
									<span>Loading more...</span>
								</div>
							)}
							{!hasMore && manga.length > 0 && (
								<p className="text-muted-foreground">No more manga to load</p>
							)}
						</div>
					)}

					{/* Pagination controls */}
					{viewMode === 'paginated' && totalPages > 1 && (
						<div className="flex items-center justify-center gap-4 py-8">
							<Button
								variant="outline"
								size="sm"
								disabled={currentPage <= 1}
								onClick={() => handlePageChange(currentPage - 1)}
							>
								Previous
							</Button>

							<div className="flex items-center gap-2">
								<span className="text-muted-foreground text-sm">Page</span>
								<input
									type="number"
									min={1}
									max={totalPages}
									aria-label="Go to page number"
									defaultValue={currentPage}
									key={currentPage}
									onKeyDown={(e) => {
										if (e.key === 'Enter') {
											const page = parseInt((e.target as HTMLInputElement).value, 10);
											if (page >= 1 && page <= totalPages) {
												handlePageChange(page);
											}
										}
									}}
									onBlur={(e) => {
										const page = parseInt(e.target.value, 10);
										if (page >= 1 && page <= totalPages && page !== currentPage) {
											handlePageChange(page);
										}
									}}
									className="bg-background h-9 w-16 rounded-md border px-2 text-center text-sm"
								/>
								<span className="text-muted-foreground text-sm">of {totalPages}</span>
							</div>

							<Button
								variant="outline"
								size="sm"
								disabled={currentPage >= totalPages}
								onClick={() => handlePageChange(currentPage + 1)}
							>
								Next
							</Button>
						</div>
					)}
				</>
			)}

			<ScrollToTop />
		</main>
	);
}

export default function LatestPage() {
	return (
		<Suspense
			fallback={
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
					{Array.from({ length: 20 }).map((_, i) => (
						<MangaCardSkeleton key={i} />
					))}
				</div>
			}
		>
			<LatestContent />
		</Suspense>
	);
}
