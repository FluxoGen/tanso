/**
 * Converts a string to a URL-friendly slug.
 * Lowercase, replace spaces/special chars with hyphens, alphanumeric + hyphens only.
 */
export function slugify(text: string): string {
	return (
		text
			.toLowerCase()
			.trim()
			.replace(/[\s_]+/g, '-')
			.replace(/[^\p{L}\p{N}-]/gu, '')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '') || 'manga'
	);
}
