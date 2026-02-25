'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, Suspense, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { TagFilter } from '@/components/tag-filter';
import { MangaCard, MangaCardSkeleton } from '@/components/manga-card';
import { ScrollToTop } from '@/components/scroll-to-top';
import { Loader2, List, Infinity } from 'lucide-react';
import type { Manga } from '@/types/manga';

const ITEMS_PER_PAGE = 20;
type ViewMode = 'infinite' | 'paginated';

function SearchContent() {
	const searchParams = useSearchParams();
	const router = useRouter();

	const q = searchParams.get('q') ?? '';
	const pageParam = parseInt(searchParams.get('page') ?? '1', 10);
	const tagParams = searchParams.getAll('tags');
	const ratingParams = searchParams.getAll('ratings');

	const [selectedTags, setSelectedTags] = useState<string[]>(tagParams);
	const [selectedRatings, setSelectedRatings] = useState<string[]>(ratingParams);
	const [manga, setManga] = useState<Manga[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(pageParam);
	const [loading, setLoading] = useState(false);
	const [viewMode, setViewMode] = useState<ViewMode>('paginated');
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const observerRef = useRef<IntersectionObserver | null>(null);
	const loadMoreRef = useRef<HTMLDivElement>(null);

	const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

	const updateUrl = useCallback(
		(newQ: string, newTags: string[], newRatings: string[], newPage: number) => {
			const params = new URLSearchParams();
			if (newQ) params.set('q', newQ);
			if (newPage > 1) params.set('page', String(newPage));
			for (const t of newTags) params.append('tags', t);
			for (const r of newRatings) params.append('ratings', r);
			router.push(`/search?${params.toString()}`);
		},
		[router]
	);

	// Memoize tag/rating strings to avoid recreating on each render
	const tagKey = tagParams.join(',');
	const ratingKey = ratingParams.join(',');

	useEffect(() => {
		if (!q && tagParams.length === 0) return;

		setLoading(true);
		const params = new URLSearchParams();
		if (q) params.set('q', q);
		params.set('page', String(pageParam));
		for (const t of tagParams) params.append('tags', t);
		for (const r of ratingParams) params.append('ratings', r);

		fetch(`/api/search?${params}`)
			.then((r) => r.json())
			.then((json) => {
				setManga(json.data ?? []);
				setTotal(json.total ?? 0);
				setHasMore(pageParam * ITEMS_PER_PAGE < (json.total ?? 0));
			})
			.catch(() => setManga([]))
			.finally(() => setLoading(false));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [q, pageParam, tagKey, ratingKey]);

	// Track current page for infinite scroll via ref to avoid dependency issues
	const infinitePageRef = useRef(1);

	// Reset infinite page ref when search params change
	useEffect(() => {
		infinitePageRef.current = 1;
	}, [q, tagKey, ratingKey]);

	// Load more for infinite scroll
	const loadMore = useCallback(async () => {
		if (isLoadingMore || !hasMore) return;

		setIsLoadingMore(true);
		const nextPage = infinitePageRef.current + 1;

		const params = new URLSearchParams();
		if (q) params.set('q', q);
		params.set('page', String(nextPage));
		for (const t of tagParams) params.append('tags', t);
		for (const r of ratingParams) params.append('ratings', r);

		try {
			const res = await fetch(`/api/search?${params}`);
			const json = await res.json();
			const newData = json.data ?? [];
			const newTotal = json.total ?? 0;

			setManga((prev) => {
				const existingIds = new Set(prev.map((m) => m.id));
				const uniqueNew = newData.filter((m: Manga) => !existingIds.has(m.id));
				return [...prev, ...uniqueNew];
			});
			setTotal(newTotal);
			setHasMore(nextPage * ITEMS_PER_PAGE < newTotal);
			infinitePageRef.current = nextPage;
		} catch {
			// ignore
		} finally {
			setIsLoadingMore(false);
		}
	}, [isLoadingMore, hasMore, q, tagParams, ratingParams]);

	// Infinite scroll observer
	useEffect(() => {
		if (viewMode !== 'infinite' || loading || isLoadingMore || !hasMore) {
			if (observerRef.current) {
				observerRef.current.disconnect();
			}
			return;
		}

		observerRef.current = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					loadMore();
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
	}, [viewMode, loading, isLoadingMore, hasMore, loadMore]);

	const handleViewModeChange = (mode: ViewMode) => {
		if (mode === viewMode) return;
		setViewMode(mode);
		if (mode === 'paginated') {
			setPage(1);
			// Reset to first page - this will trigger the useEffect
			updateUrl(q, tagParams, ratingParams, 1);
		}
	};

	const handleTagsChange = (tags: string[]) => {
		setSelectedTags(tags);
		setPage(1);
		setManga([]);
		updateUrl(q, tags, selectedRatings, 1);
	};

	const handleRatingsChange = (ratings: string[]) => {
		setSelectedRatings(ratings);
		setPage(1);
		setManga([]);
		updateUrl(q, selectedTags, ratings, 1);
	};

	const handlePageChange = (newPage: number) => {
		setPage(newPage);
		updateUrl(q, tagParams, ratingParams, newPage);
	};

	return (
		<div className="space-y-6">
			<div className="space-y-4">
				<h1 className="text-2xl font-bold tracking-tight">
					{q ? `Results for "${q}"` : 'Search Manga'}
				</h1>

				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<TagFilter
						selectedTags={selectedTags}
						selectedRatings={selectedRatings}
						onTagsChange={handleTagsChange}
						onRatingsChange={handleRatingsChange}
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
									viewMode === 'paginated'
										? 'bg-primary text-primary-foreground'
										: 'hover:bg-accent'
								}`}
								title="Page navigation"
							>
								<List className="h-4 w-4" />
								<span className="hidden sm:inline">Pages</span>
							</button>
						</div>
					</div>
				</div>
			</div>

			{q || tagParams.length > 0 ? (
				<>
					<div className="flex items-center justify-between">
						<p className="text-muted-foreground text-sm">
							{total > 0 ? `${total} result${total === 1 ? '' : 's'} found` : 'No results'}
						</p>
					</div>

					{loading ? (
						<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
							{Array.from({ length: 20 }).map((_, i) => (
								<MangaCardSkeleton key={i} />
							))}
						</div>
					) : manga.length === 0 ? (
						<div className="py-12 text-center">
							<p className="text-muted-foreground">No manga found</p>
						</div>
					) : (
						<>
							<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
								{manga.map((m) => (
									<MangaCard key={m.id} manga={m} />
								))}
							</div>

							{/* Infinite scroll loader */}
							{viewMode === 'infinite' && (
								<div ref={loadMoreRef} className="flex justify-center py-8">
									{isLoadingMore ? (
										<Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
									) : hasMore ? (
										<span className="text-muted-foreground text-sm">Scroll for more</span>
									) : (
										<span className="text-muted-foreground text-sm">No more results</span>
									)}
								</div>
							)}

							{/* Pagination controls */}
							{viewMode === 'paginated' && totalPages > 1 && (
								<div className="flex flex-wrap items-center justify-center gap-2 pt-4">
									<Button
										variant="outline"
										size="sm"
										disabled={page <= 1}
										onClick={() => handlePageChange(page - 1)}
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
											defaultValue={page}
											key={page}
											onKeyDown={(e) => {
												if (e.key === 'Enter') {
													const val = parseInt((e.target as HTMLInputElement).value, 10);
													if (!isNaN(val) && val >= 1 && val <= totalPages) {
														handlePageChange(val);
													}
												}
											}}
											onBlur={(e) => {
												const val = parseInt(e.target.value, 10);
												if (!isNaN(val) && val >= 1 && val <= totalPages && val !== page) {
													handlePageChange(val);
												}
											}}
											className="bg-background h-8 w-16 rounded-md border px-2 text-center text-sm"
										/>
										<span className="text-muted-foreground text-sm">of {totalPages}</span>
									</div>
									<Button
										variant="outline"
										size="sm"
										disabled={page >= totalPages}
										onClick={() => handlePageChange(page + 1)}
									>
										Next
									</Button>
								</div>
							)}
						</>
					)}
				</>
			) : (
				<p className="text-muted-foreground py-12 text-center">
					Use the search bar above to find manga, or select a genre to browse.
				</p>
			)}

			<ScrollToTop />
		</div>
	);
}

export default function SearchPage() {
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
			<SearchContent />
		</Suspense>
	);
}
