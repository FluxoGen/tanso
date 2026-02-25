'use client';

import { useState, useEffect, useCallback } from 'react';
import {
	LibraryEntry,
	LibraryStatus,
	getLibrary,
	getLibraryByStatus,
	getLibraryEntry,
	addToLibrary,
	updateLibraryStatus,
	removeFromLibrary,
} from '@/lib/storage';

// Hook for checking and managing a single manga's library status
export function useLibraryStatus(mangaId: string | null) {
	const [entry, setEntry] = useState<LibraryEntry | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		if (mangaId) {
			setEntry(getLibraryEntry(mangaId));
		} else {
			setEntry(null);
		}
		setIsLoading(false);
	}, [mangaId]);

	const add = useCallback(
		(title: string, coverUrl: string | null, status: LibraryStatus = 'plan_to_read') => {
			if (!mangaId) return;
			addToLibrary(mangaId, title, coverUrl, status);
			setEntry(getLibraryEntry(mangaId));
		},
		[mangaId]
	);

	const updateStatus = useCallback(
		(status: LibraryStatus) => {
			if (!mangaId) return;
			updateLibraryStatus(mangaId, status);
			setEntry(getLibraryEntry(mangaId));
		},
		[mangaId]
	);

	const remove = useCallback(() => {
		if (!mangaId) return;
		removeFromLibrary(mangaId);
		setEntry(null);
	}, [mangaId]);

	const toggle = useCallback(
		(title: string, coverUrl: string | null) => {
			if (!mangaId) return;
			if (entry) {
				removeFromLibrary(mangaId);
				setEntry(null);
			} else {
				addToLibrary(mangaId, title, coverUrl, 'plan_to_read');
				setEntry(getLibraryEntry(mangaId));
			}
		},
		[mangaId, entry]
	);

	return {
		entry,
		isInLibrary: entry !== null,
		status: entry?.status ?? null,
		isLoading,
		add,
		updateStatus,
		remove,
		toggle,
	};
}

// Hook for getting the full library
export function useLibrary(filterStatus?: LibraryStatus) {
	const [library, setLibrary] = useState<LibraryEntry[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	const refresh = useCallback(() => {
		if (filterStatus) {
			setLibrary(getLibraryByStatus(filterStatus));
		} else {
			setLibrary(getLibrary());
		}
	}, [filterStatus]);

	useEffect(() => {
		refresh();
		setIsLoading(false);
	}, [refresh]);

	const removeItem = useCallback(
		(mangaId: string) => {
			removeFromLibrary(mangaId);
			refresh();
		},
		[refresh]
	);

	const updateItemStatus = useCallback(
		(mangaId: string, status: LibraryStatus) => {
			updateLibraryStatus(mangaId, status);
			refresh();
		},
		[refresh]
	);

	return {
		library,
		isLoading,
		refresh,
		removeItem,
		updateItemStatus,
	};
}

// Status labels for UI
export const LIBRARY_STATUS_LABELS: Record<LibraryStatus, string> = {
	reading: 'Reading',
	plan_to_read: 'Plan to Read',
	completed: 'Completed',
	on_hold: 'On Hold',
	dropped: 'Dropped',
};

// Status colors for badges
export const LIBRARY_STATUS_COLORS: Record<LibraryStatus, string> = {
	reading: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
	plan_to_read: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
	completed: 'bg-green-500/20 text-green-600 dark:text-green-400',
	on_hold: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
	dropped: 'bg-red-500/20 text-red-600 dark:text-red-400',
};
