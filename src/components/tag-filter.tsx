'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useMangaTags } from '@/hooks/useMangaTags';
import type { MangaTag } from '@/types/manga';
import { ErrorState } from '@/components/error-state';

export type TagGroup = 'genre' | 'theme' | 'format' | 'demographic';

const CONTENT_RATINGS = [
	{ id: 'safe', name: 'Safe' },
	{ id: 'suggestive', name: 'Suggestive' },
	{ id: 'erotica', name: 'Erotica' },
	{ id: 'pornographic', name: '18+' },
] as const;

const TAG_GROUP_LABELS: Record<TagGroup, string> = {
	genre: 'Genres',
	theme: 'Themes',
	format: 'Format',
	demographic: 'Demographic',
};

const TAG_GROUP_DESCRIPTIONS: Record<string, string> = {
	genre: 'Story categories',
	theme: 'Featured topics',
	demographic: 'Target audience',
	format: 'Publication style',
	rating: 'Content maturity',
};

const TAG_GROUP_ORDER: TagGroup[] = ['genre', 'theme', 'demographic', 'format'];

interface TagFilterProps {
	selectedTags: string[];
	selectedRatings: string[];
	onTagsChange: (tags: string[]) => void;
	onRatingsChange: (ratings: string[]) => void;
	compact?: boolean;
}

export function TagFilter({
	selectedTags,
	selectedRatings,
	onTagsChange,
	onRatingsChange,
	compact = false,
}: TagFilterProps) {
	const { tags, isLoading, error, refetch } = useMangaTags();
	const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['genre']));

	const toggleTag = useCallback(
		(id: string) => {
			if (selectedTags.includes(id)) {
				onTagsChange(selectedTags.filter((s) => s !== id));
			} else {
				onTagsChange([...selectedTags, id]);
			}
		},
		[selectedTags, onTagsChange]
	);

	const toggleRating = useCallback(
		(id: string) => {
			if (selectedRatings.includes(id)) {
				onRatingsChange(selectedRatings.filter((s) => s !== id));
			} else {
				onRatingsChange([...selectedRatings, id]);
			}
		},
		[selectedRatings, onRatingsChange]
	);

	const toggleGroup = (group: string) => {
		const newExpanded = new Set(expandedGroups);
		if (newExpanded.has(group)) {
			newExpanded.delete(group);
		} else {
			newExpanded.add(group);
		}
		setExpandedGroups(newExpanded);
	};

	const clearAll = () => {
		onTagsChange([]);
		onRatingsChange([]);
	};

	const tagsByGroup = TAG_GROUP_ORDER.reduce(
		(acc, group) => {
			acc[group] = tags
				.filter((t) => t.group === group)
				.sort((a, b) => a.name.localeCompare(b.name));
			return acc;
		},
		{} as Record<TagGroup, MangaTag[]>
	);

	const hasActiveFilters = selectedTags.length > 0 || selectedRatings.length > 0;

	if (error) {
		return <ErrorState error={error} onRetry={refetch} showHomeLink={false} />;
	}

	if (isLoading) {
		return (
			<div className="space-y-4">
				{['Genres', 'Rating'].map((label) => (
					<div key={label} className="space-y-2">
						<div className="bg-muted h-5 w-24 animate-pulse rounded" />
						<div className="flex gap-2 overflow-hidden">
							{Array.from({ length: 8 }).map((_, i) => (
								<div key={i} className="bg-muted h-8 w-20 shrink-0 animate-pulse rounded-full" />
							))}
						</div>
					</div>
				))}
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{/* Active filters summary */}
			{hasActiveFilters && (
				<div className="flex flex-wrap items-center gap-2 pb-2">
					<span className="text-muted-foreground text-sm">Active filters:</span>
					{selectedRatings.map((id) => {
						const rating = CONTENT_RATINGS.find((r) => r.id === id);
						return (
							<button
								key={id}
								onClick={() => toggleRating(id)}
								className="bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
							>
								{rating?.name}
								<X className="h-3 w-3" />
							</button>
						);
					})}
					{selectedTags.map((id) => {
						const tag = tags.find((t) => t.id === id);
						return (
							<button
								key={id}
								onClick={() => toggleTag(id)}
								className="bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
							>
								{tag?.name}
								<X className="h-3 w-3" />
							</button>
						);
					})}
					<button
						onClick={clearAll}
						className="text-muted-foreground hover:text-foreground ml-1 text-xs transition-colors"
					>
						Clear all
					</button>
				</div>
			)}

			{/* Content Rating Row */}
			<FilterRow
				label="Rating"
				description={TAG_GROUP_DESCRIPTIONS.rating}
				isExpanded={expandedGroups.has('rating')}
				onToggle={() => toggleGroup('rating')}
				compact={compact}
			>
				{CONTENT_RATINGS.map((rating) => (
					<FilterChip
						key={rating.id}
						label={rating.name}
						isSelected={selectedRatings.includes(rating.id)}
						onClick={() => toggleRating(rating.id)}
						variant={
							rating.id === 'pornographic'
								? 'danger'
								: rating.id === 'erotica'
									? 'warning'
									: rating.id === 'suggestive'
										? 'caution'
										: undefined
						}
					/>
				))}
			</FilterRow>

			{/* Tag Groups */}
			{TAG_GROUP_ORDER.map((group) => {
				const groupTags = tagsByGroup[group];
				if (!groupTags?.length) return null;

				return (
					<FilterRow
						key={group}
						label={TAG_GROUP_LABELS[group]}
						description={TAG_GROUP_DESCRIPTIONS[group]}
						isExpanded={expandedGroups.has(group)}
						onToggle={() => toggleGroup(group)}
						compact={compact}
						selectedCount={groupTags.filter((t) => selectedTags.includes(t.id)).length}
					>
						{groupTags.map((tag) => (
							<FilterChip
								key={tag.id}
								label={tag.name}
								isSelected={selectedTags.includes(tag.id)}
								onClick={() => toggleTag(tag.id)}
							/>
						))}
					</FilterRow>
				);
			})}
		</div>
	);
}

interface FilterRowProps {
	label: string;
	description?: string;
	isExpanded: boolean;
	onToggle: () => void;
	children: React.ReactNode;
	compact?: boolean;
	selectedCount?: number;
}

function FilterRow({
	label,
	description,
	isExpanded,
	onToggle,
	children,
	compact,
	selectedCount = 0,
}: FilterRowProps) {
	return (
		<div className="space-y-2">
			<button
				onClick={onToggle}
				className="text-muted-foreground hover:text-foreground group flex items-center gap-2 text-sm font-medium transition-colors"
			>
				{isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
				{label}
				{description && (
					<span className="text-muted-foreground/60 hidden text-xs sm:inline">— {description}</span>
				)}
				{selectedCount > 0 && (
					<span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[10px] font-medium">
						{selectedCount}
					</span>
				)}
			</button>
			{isExpanded && (
				<div
					className={cn(
						'flex gap-2 pb-1',
						compact ? 'flex-wrap' : 'scrollbar-none overflow-x-auto'
					)}
				>
					{children}
				</div>
			)}
		</div>
	);
}

interface FilterChipProps {
	label: string;
	isSelected: boolean;
	onClick: () => void;
	variant?: 'default' | 'caution' | 'warning' | 'danger';
}

function FilterChip({ label, isSelected, onClick, variant = 'default' }: FilterChipProps) {
	return (
		<button
			onClick={onClick}
			aria-label={`Filter by ${label}, currently ${isSelected ? 'active' : 'inactive'}`}
			className={cn(
				'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
				isSelected
					? variant === 'danger'
						? 'bg-red-500 text-white'
						: variant === 'warning'
							? 'bg-orange-500 text-white'
							: variant === 'caution'
								? 'bg-yellow-500 text-black'
								: 'bg-primary text-primary-foreground'
					: variant === 'danger'
						? 'bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400'
						: variant === 'warning'
							? 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 dark:text-orange-400'
							: variant === 'caution'
								? 'bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 dark:text-yellow-400'
								: 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
			)}
		>
			{label}
		</button>
	);
}
