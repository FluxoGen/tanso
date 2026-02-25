'use client';

import { useEffect, useState, useCallback } from 'react';
import type { MangaTag } from '@/types/manga';

export function useMangaTags(): {
	tags: MangaTag[];
	isLoading: boolean;
	error: string | null;
	refetch: () => void;
} {
	const [tags, setTags] = useState<MangaTag[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchTags = useCallback(() => {
		setIsLoading(true);
		setError(null);
		fetch('/api/manga/tags')
			.then((r) => r.json())
			.then((json) => {
				if (json.data && Array.isArray(json.data)) {
					setTags(json.data as MangaTag[]);
				}
			})
			.catch(() => setError('Failed to load tags'))
			.finally(() => setIsLoading(false));
	}, []);

	useEffect(() => {
		fetchTags();
	}, [fetchTags]);

	return { tags, isLoading, error, refetch: fetchTags };
}
