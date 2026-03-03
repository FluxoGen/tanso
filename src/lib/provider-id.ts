/**
 * Composite Provider ID utilities.
 *
 * Format: "provider:sourceId" for non-MangaDex, bare UUID for MangaDex.
 * Examples:
 *   "a1b2c3d4-e5f6-7890-abcd-ef1234567890" -> { provider: "mangadex", sourceId: "a1b2c3d4-..." }
 *   "mangapill:one-piece-123"               -> { provider: "mangapill", sourceId: "one-piece-123" }
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ProviderId {
	provider: string;
	sourceId: string;
}

/**
 * Parse a composite ID into provider + sourceId.
 * MangaDex UUIDs are auto-detected; other providers use "provider:sourceId" format.
 */
export function parseProviderId(compositeId: string): ProviderId {
	if (UUID_PATTERN.test(compositeId)) {
		return { provider: 'mangadex', sourceId: compositeId };
	}

	const colonIdx = compositeId.indexOf(':');
	if (colonIdx > 0) {
		return {
			provider: compositeId.slice(0, colonIdx),
			sourceId: compositeId.slice(colonIdx + 1),
		};
	}

	// No colon and not a UUID — assume MangaDex (backward compat for non-standard IDs)
	return { provider: 'mangadex', sourceId: compositeId };
}

/**
 * Build a composite ID from provider + sourceId.
 * MangaDex IDs are returned bare (no prefix) for clean URLs.
 */
export function buildProviderId(provider: string, sourceId: string): string {
	if (provider === 'mangadex') return sourceId;
	return `${provider}:${sourceId}`;
}

/**
 * Check if a composite ID belongs to MangaDex.
 */
export function isMangaDexId(compositeId: string): boolean {
	return parseProviderId(compositeId).provider === 'mangadex';
}
