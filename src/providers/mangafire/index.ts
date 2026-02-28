/**
 * MangaFire Provider
 *
 * Hybrid approach implementation:
 * - AJAX endpoints for browse, chapter lists (fast, no VRF needed)
 * - Playwright fallback for search and chapter pages (VRF protected)
 *
 * This provider is designed to be easily extracted into a microservice.
 */

export { MangaFireProvider } from './provider';
export { mangafire } from './provider';
export * from './types';
