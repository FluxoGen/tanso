'use client';

import { useEffect, useState, useCallback } from 'react';

interface UseFetchOptions {
	enabled?: boolean;
}

export function useFetch<T>(
	url: string | null,
	options: UseFetchOptions = {}
): {
	data: T | null;
	loading: boolean;
	error: string | null;
	refetch: () => void;
} {
	const { enabled = true } = options;
	const [data, setData] = useState<T | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchData = useCallback(() => {
		if (!url || !enabled) {
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		fetch(url)
			.then((r) => r.json())
			.then((json) => {
				setData(json.data ?? json);
			})
			.catch(() => setError('Failed to fetch'))
			.finally(() => setLoading(false));
	}, [url, enabled]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	return { data, loading, error, refetch: fetchData };
}
