'use client';

import Image from 'next/image';
import { useEffect, useState, useCallback, use } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ChapterList } from '@/components/chapter-list';
import { LibraryButton } from '@/components/library-button';
import { getCoverUrl } from '@/lib/mangadex';
import type { Manga, MangaTag } from '@/types/manga';
import type { AniListMedia } from '@/types/anilist';

interface MangaDetailData {
	manga: Manga;
	anilist: AniListMedia | null;
}

export default function MangaDetailPage({
	params,
}: {
	params: Promise<{ id: string; slug: string }>;
}) {
	const { id } = use(params);
	const [data, setData] = useState<MangaDetailData | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch(`/api/manga/${id}`)
			.then((r) => r.json())
			.then((json) => setData(json))
			.catch(() => {})
			.finally(() => setLoading(false));
	}, [id]);

	if (loading) return <MangaDetailSkeleton />;
	if (!data?.manga)
		return <p className="text-muted-foreground py-12 text-center">Manga not found.</p>;

	const { manga, anilist } = data;
	const coverUrl = manga.coverFileName ? getCoverUrl(manga.id, manga.coverFileName, '512') : null;
	const bannerUrl = anilist?.bannerImage;
	const description = anilist?.description || manga.description;
	const score = anilist?.averageScore;

	const tagsByGroup = manga.tags.reduce(
		(acc, tag) => {
			if (!acc[tag.group]) acc[tag.group] = [];
			acc[tag.group].push(tag);
			return acc;
		},
		{} as Record<string, MangaTag[]>
	);

	const genres = tagsByGroup['genre'] || [];
	const themes = tagsByGroup['theme'] || [];
	const demographics = tagsByGroup['demographic'] || [];
	const formats = tagsByGroup['format'] || [];

	const altTitles = Array.from(
		new Set(
			[
				manga.altTitle,
				anilist?.title?.romaji,
				anilist?.title?.english,
				anilist?.title?.native,
			].filter((t): t is string => !!t && t !== manga.title)
		)
	);

	return (
		<div className="space-y-6">
			{bannerUrl && (
				<div className="relative -mx-4 -mt-6 h-40 w-[calc(100%+2rem)] overflow-hidden sm:h-48 md:h-64">
					<Image src={bannerUrl} alt="" fill className="object-cover object-center" priority />
					<div className="from-background absolute inset-0 bg-gradient-to-t to-transparent" />
				</div>
			)}

			<div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
				{coverUrl && (
					<div className="relative aspect-[3/4] w-36 shrink-0 overflow-hidden rounded-lg shadow-lg sm:w-48">
						<Image src={coverUrl} alt={manga.title} fill className="object-cover" priority />
					</div>
				)}

				<div className="flex-1 space-y-3 text-center sm:text-left">
					<div>
						<h1 className="text-2xl font-bold tracking-tight md:text-3xl">{manga.title}</h1>
					</div>

					<div className="flex flex-wrap items-center justify-center gap-2 text-sm sm:justify-start">
						{manga.authorName && (
							<span className="text-muted-foreground">
								By <span className="text-foreground font-medium">{manga.authorName}</span>
								{manga.artistName && manga.artistName !== manga.authorName && (
									<>
										{' '}
										&amp; <span className="text-foreground font-medium">{manga.artistName}</span>
									</>
								)}
							</span>
						)}
						{manga.year && <span className="text-muted-foreground">· {manga.year}</span>}
						<Badge variant="outline" className="capitalize">
							{manga.status}
						</Badge>
						{score && (
							<Badge className="border-yellow-500/20 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
								★ {score}%
							</Badge>
						)}
					</div>

					<div className="flex justify-center pt-2 sm:justify-start">
						<LibraryButton mangaId={manga.id} title={manga.title} coverUrl={manga.coverFileName} />
					</div>

					<TagSection label="Genres" tags={genres} variant="default" />
					<TagSection label="Themes" tags={themes} variant="outline" />
					{demographics.length > 0 && (
						<TagSection label="Demographic" tags={demographics} variant="secondary" />
					)}
					{formats.length > 0 && <TagSection label="Format" tags={formats} variant="outline" />}

					{description && <ExpandableDescription html={description} />}

					{altTitles.length > 0 && (
						<div className="space-y-1.5">
							<h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
								Alternate Titles
							</h3>
							<div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
								{altTitles.map((t) => (
									<span
										key={t}
										className="border-border bg-muted/50 text-muted-foreground inline-block rounded-md border px-2.5 py-1 text-xs"
									>
										{t}
									</span>
								))}
							</div>
						</div>
					)}
				</div>
			</div>

			<Separator />

			<section className="space-y-3">
				<h2 className="text-xl font-semibold tracking-tight">Chapters</h2>
				<ChapterList
					mangaId={id}
					mangaTitle={manga.title}
					coverUrl={manga.coverFileName}
					altTitles={altTitles}
					lastChapter={manga.lastChapter}
					anilistId={anilist?.id ? String(anilist.id) : undefined}
				/>
			</section>
		</div>
	);
}

const DESCRIPTION_CLAMP_LINES = 4;

function ExpandableDescription({ html }: { html: string }) {
	const [expanded, setExpanded] = useState(false);
	const [clamped, setClamped] = useState(false);
	const measuredRef = useCallback((node: HTMLDivElement | null) => {
		if (!node) return;
		setClamped(node.scrollHeight > node.clientHeight + 1);
	}, []);

	const SAFE_TAGS = /^(i|b|em|strong|br)$/i;
	const sanitized = html
		.replace(/<br\s*\/?>/gi, '<br/>')
		.replace(/<(\/?)([\w]+)([^>]*)>/g, (match, slash, tag) =>
			SAFE_TAGS.test(tag) ? `<${slash}${tag.toLowerCase()}>` : ''
		)
		.replace(/&nbsp;/g, ' ')
		.trim();

	return (
		<div className="max-w-prose">
			<div
				ref={!expanded ? measuredRef : undefined}
				className="text-muted-foreground text-sm leading-relaxed"
				style={
					!expanded
						? {
								WebkitLineClamp: DESCRIPTION_CLAMP_LINES,
								display: '-webkit-box',
								WebkitBoxOrient: 'vertical',
								overflow: 'hidden',
							}
						: undefined
				}
				dangerouslySetInnerHTML={{ __html: sanitized }}
			/>
			{(clamped || expanded) && (
				<Button
					variant="link"
					size="sm"
					className="mt-1 h-auto px-0 text-xs"
					onClick={() => setExpanded((e) => !e)}
				>
					{expanded ? 'Show less' : 'Read full description'}
				</Button>
			)}
		</div>
	);
}

function TagSection({
	label,
	tags,
	variant = 'default',
}: {
	label: string;
	tags: MangaTag[];
	variant?: 'default' | 'secondary' | 'outline';
}) {
	if (tags.length === 0) return null;

	return (
		<div className="space-y-1.5">
			<h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
				{label}
			</h3>
			<div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
				{tags.map((t) => (
					<Badge key={t.id} variant={variant} className="text-xs">
						{t.name}
					</Badge>
				))}
			</div>
		</div>
	);
}

function MangaDetailSkeleton() {
	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-6 sm:flex-row">
				<Skeleton className="aspect-[3/4] w-40 shrink-0 rounded-lg sm:w-48" />
				<div className="flex-1 space-y-3">
					<Skeleton className="h-8 w-2/3" />
					<Skeleton className="h-4 w-1/3" />
					<div className="flex gap-2">
						<Skeleton className="h-5 w-16 rounded-full" />
						<Skeleton className="h-5 w-20 rounded-full" />
						<Skeleton className="h-5 w-14 rounded-full" />
					</div>
					<Skeleton className="h-20 w-full" />
				</div>
			</div>
			<Skeleton className="h-px w-full" />
			<div className="space-y-2">
				<Skeleton className="h-6 w-32" />
				{Array.from({ length: 6 }).map((_, i) => (
					<Skeleton key={i} className="h-12 w-full rounded-md" />
				))}
			</div>
		</div>
	);
}
