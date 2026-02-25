interface CacheEntry<T> {
	value: T;
	expiresAt: number;
}

export class TTLCache<T> {
	private cache = new Map<string, CacheEntry<T>>();

	constructor(
		private maxSize: number,
		private ttlMs: number
	) {}

	get(key: string): T | undefined {
		const entry = this.cache.get(key);
		if (!entry) return undefined;
		if (Date.now() > entry.expiresAt) {
			this.cache.delete(key);
			return undefined;
		}
		return entry.value;
	}

	set(key: string, value: T): void {
		if (this.cache.size >= this.maxSize) {
			const oldest = this.cache.keys().next().value;
			if (oldest !== undefined) this.cache.delete(oldest);
		}
		this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs });
	}

	clear(): void {
		this.cache.clear();
	}
}

const THIRTY_MINUTES = 30 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

export const sourceCache = new TTLCache<import('@/types/manga').MangaSource[]>(500, THIRTY_MINUTES);
export const chapterCache = new TTLCache<import('@/types/manga').Chapter[]>(200, ONE_HOUR);
