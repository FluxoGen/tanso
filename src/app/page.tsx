'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TagFilter } from '@/components/tag-filter';
import { ContinueReading } from '@/components/continue-reading';
import { MangaGrid, MangaGridSkeleton } from '@/components/manga-grid';
import type { Manga } from '@/types/manga';

type Section = 'trending' | 'popular' | 'latest';

function useMangaSection(section: Section, tags: string[], ratings: string[]) {
	const [data, setData] = useState<Manga[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		setLoading(true);
		const params = new URLSearchParams();
		for (const t of tags) params.append('tags', t);
		for (const r of ratings) params.append('ratings', r);

		fetch(`/api/manga/${section}?${params}`)
			.then((r) => r.json())
			.then((json) => setData(json.data ?? []))
			.catch(() => setData([]))
			.finally(() => setLoading(false));
	}, [section, tags, ratings]);

	return { data, loading };
}

function HomeContent() {
	const router = useRouter();
	const searchParams = useSearchParams();

	// Read initial state from URL
	const [selectedTags, setSelectedTags] = useState<string[]>(() => searchParams.getAll('tags'));
	const [selectedRatings, setSelectedRatings] = useState<string[]>(() =>
		searchParams.getAll('ratings')
	);

	const trending = useMangaSection('trending', selectedTags, selectedRatings);
	const popular = useMangaSection('popular', selectedTags, selectedRatings);
	const latest = useMangaSection('latest', selectedTags, selectedRatings);

	// Update URL when filters change
	const updateUrl = useCallback(
		(tags: string[], ratings: string[]) => {
			const params = new URLSearchParams();
			tags.forEach((t) => params.append('tags', t));
			ratings.forEach((r) => params.append('ratings', r));

			const queryString = params.toString();
			router.push(queryString ? `/?${queryString}` : '/', { scroll: false });
		},
		[router]
	);

	const handleTagChange = useCallback(
		(tags: string[]) => {
			setSelectedTags(tags);
			updateUrl(tags, selectedRatings);
		},
		[selectedRatings, updateUrl]
	);

	const handleRatingsChange = useCallback(
		(ratings: string[]) => {
			setSelectedRatings(ratings);
			updateUrl(selectedTags, ratings);
		},
		[selectedTags, updateUrl]
	);

	return (
		<div className="space-y-8">
			{/* Continue Reading Section */}
			<ContinueReading maxItems={6} />

			<section className="space-y-4">
				<h1 className="text-2xl font-bold tracking-tight">Discover Manga</h1>
				<TagFilter
					selectedTags={selectedTags}
					selectedRatings={selectedRatings}
					onTagsChange={handleTagChange}
					onRatingsChange={handleRatingsChange}
					compact
				/>
			</section>

			<section className="space-y-3">
				<h2 className="text-xl font-semibold tracking-tight">Trending</h2>
				{trending.loading ? <MangaGridSkeleton count={5} /> : <MangaGrid manga={trending.data} />}
			</section>

			<section className="space-y-3">
				<h2 className="text-xl font-semibold tracking-tight">Most Popular</h2>
				{popular.loading ? <MangaGridSkeleton count={5} /> : <MangaGrid manga={popular.data} />}
			</section>

			<section className="space-y-3">
				<h2 className="text-xl font-semibold tracking-tight">Latest Updates</h2>
				{latest.loading ? <MangaGridSkeleton count={5} /> : <MangaGrid manga={latest.data} />}
			</section>
		</div>
	);
}

export default function HomePage() {
	return (
		<Suspense
			fallback={
				<div className="space-y-8">
					<div className="bg-muted h-32 animate-pulse rounded-lg" />
					<div className="space-y-4">
						<div className="bg-muted h-8 w-48 animate-pulse rounded" />
						<MangaGridSkeleton count={5} />
					</div>
					<MangaGridSkeleton count={5} />
					<MangaGridSkeleton count={5} />
				</div>
			}
		>
			<HomeContent />
		</Suspense>
	);
}
