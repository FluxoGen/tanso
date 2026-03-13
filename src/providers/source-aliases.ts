/**
 * Source Display Aliases
 *
 * Maps internal provider IDs to user-facing display names.
 * This hides the actual source names from users while maintaining
 * internal consistency for debugging and development.
 *
 * Theme: Mythical Creatures
 */

export interface SourceAlias {
	display: string;
	description: string;
	icon?: string;
}

export const SOURCE_ALIASES: Record<string, SourceAlias> = {
	mangadex: {
		display: 'Phoenix',
		description: 'Community-driven, official API',
		icon: '🔥',
	},
	mangapill: {
		display: 'Griffin',
		description: 'Alternative source via Consumet',
		icon: '🦅',
	},
	comick: {
		display: 'Sphinx',
		description: 'High-quality scans',
		icon: '🦁',
	},
	mangakakalot: {
		display: 'Hydra',
		description: 'Multi-language support',
		icon: '🐍',
	},
	manganato: {
		display: 'Cerberus',
		description: 'Quick updates',
		icon: '🐺',
	},
};

/**
 * Get display name for a source ID
 */
export function getDisplayName(sourceId: string): string {
	return SOURCE_ALIASES[sourceId]?.display ?? sourceId;
}

/**
 * Get internal source ID from display name
 */
export function getInternalId(displayName: string): string | undefined {
	const entry = Object.entries(SOURCE_ALIASES).find(([, alias]) => alias.display === displayName);
	return entry?.[0];
}

/**
 * Get source alias info
 */
export function getSourceAlias(sourceId: string): SourceAlias | undefined {
	return SOURCE_ALIASES[sourceId];
}

/**
 * Get all registered source IDs
 */
export function getAllSourceIds(): string[] {
	return Object.keys(SOURCE_ALIASES);
}

/**
 * Check if a source ID is registered
 */
export function isRegisteredSource(sourceId: string): boolean {
	return sourceId in SOURCE_ALIASES;
}

/**
 * Format source for API response (hides internal ID)
 */
export function formatSourceForResponse(sourceId: string): {
	id: string;
	name: string;
	description?: string;
} {
	const alias = SOURCE_ALIASES[sourceId];
	return {
		id: sourceId,
		name: alias?.display ?? sourceId,
		description: alias?.description,
	};
}
