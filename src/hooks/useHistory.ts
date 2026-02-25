'use client';

import { useState, useEffect, useCallback } from 'react';
import {
	HistoryEntry,
	getHistory,
	addToHistory,
	removeFromHistory,
	clearHistory,
} from '@/lib/storage';

export function useHistory() {
	const [history, setHistory] = useState<HistoryEntry[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	const refresh = useCallback(() => {
		setHistory(getHistory());
	}, []);

	useEffect(() => {
		refresh();
		setIsLoading(false);
	}, [refresh]);

	const add = useCallback(
		(entry: Omit<HistoryEntry, 'lastReadAt'>) => {
			addToHistory(entry);
			refresh();
		},
		[refresh]
	);

	const remove = useCallback(
		(mangaId: string) => {
			removeFromHistory(mangaId);
			refresh();
		},
		[refresh]
	);

	const clear = useCallback(() => {
		clearHistory();
		setHistory([]);
	}, []);

	return {
		history,
		isLoading,
		refresh,
		add,
		remove,
		clear,
	};
}

// Helper to format relative time
export function formatRelativeTime(timestamp: number): string {
	const now = Date.now();
	const diff = now - timestamp;

	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);
	const weeks = Math.floor(days / 7);
	const months = Math.floor(days / 30);

	if (months > 0) {
		return months === 1 ? '1 month ago' : `${months} months ago`;
	}
	if (weeks > 0) {
		return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
	}
	if (days > 0) {
		return days === 1 ? 'Yesterday' : `${days} days ago`;
	}
	if (hours > 0) {
		return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
	}
	if (minutes > 0) {
		return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
	}
	return 'Just now';
}

// Group history by date for timeline display
export function groupHistoryByDate(history: HistoryEntry[]): Map<string, HistoryEntry[]> {
	const groups = new Map<string, HistoryEntry[]>();

	for (const entry of history) {
		const date = new Date(entry.lastReadAt);
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		let key: string;
		if (date.toDateString() === today.toDateString()) {
			key = 'Today';
		} else if (date.toDateString() === yesterday.toDateString()) {
			key = 'Yesterday';
		} else if (date > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
			key = 'This Week';
		} else if (date > new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)) {
			key = 'This Month';
		} else {
			key = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
		}

		if (!groups.has(key)) {
			groups.set(key, []);
		}
		groups.get(key)!.push(entry);
	}

	return groups;
}
