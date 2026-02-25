import type { ContentProvider } from './types';
import { MangaDexProvider } from './mangadex';
import { MangaReaderProvider } from './mangareader';

const providers = new Map<string, ContentProvider>();

export function registerProvider(provider: ContentProvider): void {
	providers.set(provider.name, provider);
}

export function getProvider(name: string): ContentProvider | undefined {
	return providers.get(name);
}

export function listProviders(type?: 'manga' | 'anime' | 'lightnovel'): ContentProvider[] {
	const all = Array.from(providers.values());
	return type ? all.filter((p) => p.type === type) : all;
}

registerProvider(new MangaDexProvider());
registerProvider(new MangaReaderProvider());
