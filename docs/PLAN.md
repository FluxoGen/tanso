# Project Plan

Living document tracking the current state, completed work, upcoming features, and design decisions for Tanso. Updated every time the codebase changes.

**Last updated:** February 2026

---

## Table of Contents

1. [Current Status](#1-current-status)
2. [Tech Stack](#2-tech-stack)
3. [Completed Milestones](#3-completed-milestones)
4. [Upcoming / Future Work](#4-upcoming--future-work)
5. [Design Decisions Log](#5-design-decisions-log)

---

## 1. Current Status

**Phase:** MVP + Full-Featured Client (no database, no authentication)

The application is a fully functional manga reader powered by MangaDex, AniList, and MangaPill (via @consumet/extensions). Users can discover manga through trending/popular/latest feeds, filter by genre/theme/demographic/content rating, search by title with typeahead suggestions, view manga detail pages with enriched metadata and alternate titles, choose from multiple chapter sources, and read chapters in either paged mode or vertical scroll (webtoon) mode with keyboard navigation, quality selection, and automatic progress tracking.

**What works:**
- Home page with tag filtering (genres, themes, demographics, content ratings) and three curated manga sections
- Continue Reading section showing manga with saved progress
- Dedicated Latest page with infinite scroll/pagination toggle and filters
- Search page with infinite scroll/pagination toggle, typeahead suggestions (6 visible, scroll for more), and content rating filters
- Library page to organize manga by status (Reading, Plan to Read, Completed, On Hold, Dropped)
- History page showing recently read manga grouped by date
- Manga detail page merging MangaDex content with AniList metadata (scores, banners, descriptions)
- All tag groups displayed on detail page: Genres, Themes, Demographic, Format
- Add to Library button with status dropdown on detail pages
- Multi-source chapter integration: source selector tabs showing MangaDex and MangaPill with chapter counts (shows `?` when unknown, updates on load)
- Progressive source discovery (MangaDex loads instantly, MangaPill appears as it loads)
- Fallback alt-title search: sources API tries AniList romaji/English/native titles if primary MangaDex title yields no matches
- Chapter reader with two modes: **paged** (page-by-page with keyboard/click nav) and **long-strip** (vertical scroll for webtoons)
- Auto-detection of webtoon format (height/width ratio > 3 triggers long-strip mode), with manual Paged/Scroll toggle
- Chapter navigation: Previous/Next chapter buttons in toolbar, end-of-chapter navigation panel, keyboard shortcuts (`[`/`]`)
- Auto-save reading progress with debouncing, marks chapters as read on completion
- Visual chapter read indicators: checkmark (completed), book icon (in-progress)
- Keyboard shortcuts help modal (press `?` in reader)
- HQ/Lite quality toggle for MangaDex chapters
- Scroll-to-top button on Latest, Search, and Reader (longstrip mode) pages
- Direct page number input for navigation on Latest and Search pages
- Secured image proxy with domain whitelist for MangaPill images (CDN requires Referer header)
- Provider registry pattern for future extensibility (anime, light novels)
- In-memory LRU caching for source discovery and chapter lists
- API retry mechanism with exponential backoff for resilience
- Expandable description with sanitized HTML rendering (keeps `<i>`, `<b>`, `<br>`) and "Read full description" / "Show less" toggle
- Alternate Titles section on detail page collecting MangaDex + AniList title variants as styled chips
- Robust title matching with romanization normalization (`wo`→`o`, `ou`→`o`), prefix similarity, and concatenated-title handling
- Content rating badges on manga cards: Suggestive, Erotica (orange), 18+ (red)
- Dark mode with system preference detection
- Responsive mobile layouts for reader toolbar, chapter list, and navigation
- Loading skeletons on all pages
- Error states for failed API calls
- Footer with FluxoGen attribution and logo

**What is not built yet:**
- User authentication
- Database (server-side persistence layer)
- Server-side reading progress / library sync

---

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.1.6 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS v4 + shadcn/ui | 4.2.0 |
| Theming | next-themes | 0.4.6 |
| Primary API | MangaDex REST API | v5 |
| Secondary Sources | @consumet/extensions (MangaPill) | 1.8.8 |
| Metadata API | AniList GraphQL API | v2 |
| Package Manager | pnpm | 10.22.0 |
| Runtime | Node.js | 18.17+ |

---

## 3. Completed Milestones

### Milestone 1: Project Setup
- Initialized Next.js 15 with App Router, TypeScript, Tailwind CSS v4, ESLint
- Configured shadcn/ui with Button, Badge, Input, Skeleton, ScrollArea, Separator components
- Set up next-themes for dark mode support
- Configured `next.config.ts` with image remote patterns for MangaDex and AniList CDN domains

### Milestone 2: TypeScript Types
- Defined `Manga`, `MangaTag`, `Chapter`, `PaginatedResponse` in `src/types/manga.ts`
- Defined `AniListMedia`, `AniListResponse` in `src/types/anilist.ts`

### Milestone 3: MangaDex API Client
- Built `src/lib/mangadex.ts` with functions: `searchManga`, `getMangaDetails`, `getMangaChapters`, `getChapterPages`, `getMangaTags`, `getPopularManga`, `getLatestManga`, `getTrendingManga`, `getCoverUrl`
- Implemented data normalization (`normalizeManga`, `normalizeChapter`) to transform raw API responses into clean TypeScript types
- Implemented multilingual title resolution with English preferred, Japanese fallback
- Added in-memory caching for tag list

### Milestone 4: AniList API Client
- Built `src/lib/anilist.ts` with `searchAniListManga` function
- GraphQL query fetches: scores, genres, tags, descriptions, banner images, cover images, recommendations, publication metadata

### Milestone 5: API Routes (Backend Proxy)
- Created 8 API route handlers under `src/app/api/`
- `/api/manga/trending`, `/api/manga/popular`, `/api/manga/latest` — curated feeds with optional tag filtering
- `/api/manga/tags` — cached tag list
- `/api/manga/[id]` — merged MangaDex + AniList response
- `/api/manga/[id]/chapters` — paginated chapter list
- `/api/chapter/[id]` — chapter image metadata
- `/api/search` — search with query + genre filters

### Milestone 6: Layout and Navigation
- Root layout with ThemeProvider, Geist fonts, responsive max-width container
- Sticky Navbar with logo, centered SearchBar, ThemeToggle
- SearchBar submits to `/search?q=...`
- ThemeToggle switches between dark/light with sun/moon icons

### Milestone 7: Genre Chips Component
- Reusable `GenreChips` component fetches tags from `/api/manga/tags`
- Filters to `group === "genre"` tags, sorts alphabetically
- Horizontal scrollable chip bar with "All" default option
- Multi-select toggle (filled for active, outline for inactive)
- Loading skeleton while tags load

### Milestone 8: Home Page
- Genre chip bar at top for filtering all sections
- Three sections: Trending, Most Popular, Latest Updates
- Each section fetches from its respective API route with selected tags
- Custom `useMangaSection` hook manages fetch state per section
- `MangaGrid` renders responsive grid (2-5 columns), `MangaCard` shows cover, title, author, content rating badge

### Milestone 9: Search Page
- Full search form with text input and Search button
- Genre chips for filtering
- URL-driven state (`?q=...&genres=...&page=1`)
- Paginated results with Previous/Next buttons and page indicator
- Result count display
- Wrapped in Suspense for `useSearchParams` compatibility

### Milestone 10: Manga Detail Page
- AniList banner image with gradient overlay (when available)
- Cover image from MangaDex (512px quality)
- Title + alt title, author/artist, year, status badge, AniList score badge
- Genre tags as badges
- Description (AniList preferred, MangaDex fallback)
- ChapterList component with paginated chapter rows (volume, chapter number, title, scanlation group, date)
- Full loading skeleton

### Milestone 11: Chapter Reader
- Page-by-page reading with single image display
- Keyboard navigation: Arrow keys and A/D keys
- Click navigation: left half = previous, right half = next
- Page selector dropdown for jumping to any page
- Previous/Next buttons
- Quality toggle (HQ = original quality, Lite = data-saver compressed)
- Image preloading (next 3 pages)
- Back button linking to manga detail page
- Loading spinner and empty state handling

### Milestone 12: Dark Mode
- `next-themes` with `attribute="class"` and `enableSystem`
- System preference detection (auto dark/light based on OS setting)
- Manual toggle via ThemeToggle component
- `suppressHydrationWarning` on `<html>` to prevent flash
- All components use Tailwind `dark:` variants via shadcn/ui CSS variables

### Milestone 13: Remove Content Rating Filter
- Removed content rating restrictions from all MangaDex API calls
- All functions (`searchManga`, `getPopularManga`, `getLatestManga`, `getTrendingManga`) now include all four content ratings: `safe`, `suggestive`, `erotica`, `pornographic`
- Extracted a shared `appendContentRatings()` helper to avoid duplication
- Previously, search only returned `safe` manga, and feeds only returned `safe` + `suggestive`, causing manga like "Kusozako Boukou Oshii-san" (rated `erotica`) to be invisible

### Milestone 14: Documentation
- Created `docs/` folder with 4 documentation files
- `ARCHITECTURE.md` — system diagrams, data flows, design rationale
- `COMMANDS.md` — all development and maintenance commands
- `PLAN.md` — this living plan document
- `PROJECT_GUIDE.md` — end-to-end project walkthrough with examples
- Rewrote `README.md` as concise overview with links to docs

### Milestone 15: AniList-Augmented Search
- MangaDex's `title` parameter only matches primary titles, not alt titles. This means searching an English name (e.g., "Please Leave Me Alone…") fails when the primary title is a Japanese romanized string. Even when MangaDex returns some results, they may be irrelevant partial matches rather than the manga the user intended.
- Enhanced `/api/search` to run MangaDex and AniList searches in parallel on every query
- When AniList identifies a canonical title (romaji or English) that differs from the user's query, a secondary MangaDex search is performed with that title
- **Merge strategy:** AniList-guided results are placed first (higher relevance), followed by unique results from the original MangaDex search, capped at the page limit. When MangaDex returns 0 results, the AniList-guided results are returned entirely.
- When AniList's titles match the user's query (or AniList finds no match), the original MangaDex results are returned directly — no extra work

### Milestone 16: Multi-Source Chapter Integration
- Installed `@consumet/extensions` and `got-scraping` for scraping support
- Created **Provider Registry** (`src/lib/providers/`) with `ContentProvider` interface, `MangaDexProvider`, and `MangaPillProvider` wrappers
- Switched from MangaReader (502 errors) to MangaPill as the secondary provider
- Added `TTLCache` (`src/lib/cache.ts`) — LRU cache with TTL for source discovery (30 min) and chapter lists (1 hr)
- Added `scoreMatch` algorithm (`src/lib/matching.ts`) — title similarity, chapter count proximity, status matching, edition keyword penalties
- Extended types: `MangaSource`, `ChapterPagesResponse` (discriminated union), `source` field on `Chapter`
- Created `/api/manga/[id]/sources` route for progressive source discovery (MangaDex + Consumet providers)
- Updated `/api/manga/[id]/chapters` to handle `source` and `sourceId` params via provider registry
- Created `/api/chapter/resolve` route for Consumet chapter page fetching (query-param based to handle `/` in chapter IDs)
- Created `/api/proxy-image` route with domain whitelist, server-side referer mapping, HTTPS-only validation, and rate limiting (SSRF prevention)
- Rewrote `ChapterList` component with progressive source tabs, AbortController for race conditions, loading/error states for each source
- Updated manga detail page to pass `mangaTitle`, `lastChapter`, `anilistId` to `ChapterList`
- Updated reader to handle both MangaDex (`ChapterPagesResponse` with `hash`) and Consumet (direct image URLs) page formats
- Created `/read/ext` entry point for Consumet chapters (query-param URL structure)
- Quality toggle (HQ/Lite) only shown for MangaDex chapters
- Added MangaPill CDN domains to `next.config.ts` `remotePatterns`
- Configured `serverExternalPackages` for `@consumet/extensions` and `got-scraping`
- Removed dead `getPageUrl` export and relocated `ChapterPages` interface to internal `MangaDexChapterPages` type

### Milestone 17: Reader & UX Improvements
- **MangaPill image proxy:** Set `needsImageProxy = true` on MangaPill provider. Reader routes MangaPill images through `/api/proxy-image` (CDN requires `Referer: https://mangapill.com/` header). Added `PROXIED_SOURCES` set in reader for source-aware proxy routing.
- **Webtoon long-strip mode:** Added `ReadingMode = "paged" | "longstrip"` to the reader. Auto-detects webtoon format by probing the second image's aspect ratio (height/width > 3). Long-strip mode stacks all images vertically at full width with lazy loading. Manual toggle between "Paged" and "Scroll" via toolbar button.
- **Expandable description:** `ExpandableDescription` component sanitizes AniList HTML (keeps `<i>`, `<b>`, `<em>`, `<strong>`, `<br>`, strips all others), renders via `dangerouslySetInnerHTML`, clamps to 4 lines with "Read full description" / "Show less" toggle. Uses `useCallback` ref to detect overflow.
- **Alternate Titles section:** Detail page collects unique titles from MangaDex `altTitle` and AniList `title.romaji`, `title.english`, `title.native` (excluding primary title). Displayed as bordered chips under an "Alternate Titles" heading. Replaced old single `altTitle` subtitle.
- **Source tab improvements:** Chapter count displays `?` when unknown (instead of misleading `0`), updates to real count after chapters load. Removed matched title from tab capsules. Removed "Matched as..." subtitle from chapter list.
- **Robust title matching:** Added `normalizeRomanization()` for common Japanese romanization variants (`wo`→`o`, `ou`→`o`, `uu`→`u`, smart quotes, dashes). Extracted `titleScore()` helper. Added prefix similarity (Levenshtein on prefix substring) to handle providers that concatenate multiple title variants without separators. Scoring uses `Math.max(raw, normalized)`.
- **Fallback alt-title search:** Sources API now accepts `altTitles` param (pipe-separated). `ChapterList` passes AniList alternate titles. Source discovery tries alternate titles sequentially if primary MangaDex title yields no external matches — fixes cases where romanization differences or provider-specific naming caused missed matches.

### Milestone 18: Reading Progress, Library & History
- **LocalStorage utilities** (`src/lib/storage.ts`) — Type-safe functions for reading progress, history, library, and chapter read status. All data stored under `tanso:*` keys.
- **React hooks** (`src/hooks/`) — `useReadingProgress` (debounced auto-save), `useLibrary` / `useLibraryStatus` (bookmark management), `useHistory` (reading history with date grouping).
- **Reading progress tracking** — Auto-saves page position on every page turn with 1-second debounce. Flushes on page exit. Marks chapters as read when reaching the last page.
- **Library system** — Add manga to library with status (Reading, Plan to Read, Completed, On Hold, Dropped). `LibraryButton` component on manga detail pages. `/library` page with status tabs.
- **Reading history** — Automatically tracks last 100 manga read. `/history` page with timeline grouping (Today, Yesterday, This Week, etc.).
- **Continue Reading section** — Home page shows manga with saved progress. Cover, title, chapter, progress bar. Click to resume.
- **Chapter read indicators** — Visual indicators in chapter list: checkmark (completed), book icon (in-progress), highlighted background (currently reading).

### Milestone 19: Enhanced Filtering & Navigation
- **Tag Filter component** (`src/components/tag-filter.tsx`) — Collapsible sections for Genres, Themes, Demographic, and Content Rating. Active filter badges with clear all button.
- **Content rating filter** — Filter manga by Safe, Suggestive, Erotica, 18+ ratings. Integrated into home page and latest page.
- **URL state for filters** — Home page filter selections persisted in URL (`?tag=...&rating=...`) for shareable/refreshable state.
- **Latest page** (`/latest`) — Dedicated page with infinite scroll pagination. Uses tag and rating filters.
- **Navbar updates** — Added Latest, Library, History navigation links. Mobile hamburger menu for smaller screens.
- **Footer** — Added copyright and FluxoGen attribution with logo.

### Milestone 20: Search & Reader Enhancements
- **Search suggestions** — Debounced typeahead dropdown showing top 6 results with cover, title, author, year. Keyboard navigation support. `/api/suggest` endpoint.
- **Chapter navigation in reader** — Previous/Next chapter buttons in toolbar. End-of-chapter navigation panel. Keyboard shortcuts (`[`/`]` or `Shift+←`/`→`).
- **Keyboard shortcuts help** — Press `?` or `H` in reader to show keyboard shortcuts modal.
- **fetchWithRetry utility** — Retry logic with exponential backoff for API calls. Applied to all MangaDex and AniList fetch calls.
- **Genre-only search fix** — When searching with only genre filters (no text), omit empty title param and use `followedCount` sort for better results.
- **All tag groups on manga detail** — Show Genres, Themes, Demographic, and Format tags in separate labeled sections.
- **Content rating badges** — Color-coded badges on manga cards: Suggestive (default), Erotica (orange), 18+ (red).

### Milestone 21: UI/UX Polish & Mobile Improvements
- **View mode toggle** — Latest and Search pages have Scroll (infinite) / Pages (paginated) toggle with smooth transitions.
- **Page number input** — Direct page navigation by typing page number (Enter or blur to navigate) on Latest and Search pages.
- **Scroll-to-top button** — Floating button appears after scrolling 300px on Latest, Search, and Reader (longstrip mode) pages.
- **Search suggestions infinite scroll** — Shows 6 suggestions initially, loads more on scroll (up to 20 total from API).
- **Search filters fix** — Content rating filters now properly passed to MangaDex API for search results.
- **MangaPill keyboard navigation fix** — Detected descending chapter order and swapped prev/next for correct `[`/`]` behavior.
- **Compact filter UI** — Tag filter component with collapsible sections, descriptions, and responsive layout.
- **Mobile reader toolbar** — Reorganized for better spacing, hidden keyboard shortcut button (not useful on mobile), shorter labels.
- **Mobile chapter list** — Stacked layout with proper alignment: chapter number + date on first line, title below, scanlation group below.
- **Mobile end-of-chapter navigation** — Buttons wrap properly on narrow screens with smaller sizes and shorter text.
- **External reader sourceId** — Properly passes sourceId through URL chain for correct chapter navigation on external sources.

---

## 4. Upcoming / Future Work

These features are not yet implemented. They are listed in rough priority order.

### Phase 2: Server-Side Persistence
- **Database setup** — Add PostgreSQL (or SQLite for simplicity) with an ORM like Prisma or Drizzle
- **User authentication** — Email/password or OAuth (GitHub, Google) sign-up and login
- **Server-side sync** — Sync client-side reading progress, library, and history to user accounts

> **Note:** Client-side persistence (localStorage) for bookmarks, reading history, and reading progress is already implemented in Milestone 18. Phase 2 focuses on server-side sync for cross-device access.

### Phase 3: Enhanced Reader
- ~~**Long strip mode**~~ — ✅ Implemented in Milestone 17 (auto-detects webtoons, manual toggle)
- ~~**Chapter navigation**~~ — ✅ Implemented in Milestone 20 (prev/next buttons, keyboard shortcuts)
- **Chapter preloading** — When nearing the end of a chapter, preload the next chapter's metadata
- **Base URL refresh** — Automatically re-fetch image metadata when the MangaDex@Home base URL expires (403 handling)
- **Fullscreen mode** — Distraction-free reading
- **Reading settings** — Configurable background color, image fit mode, reading direction (LTR/RTL)

### Phase 4: Discovery & Social
- **Recommendations section** — Show AniList recommendations on the detail page
- **Related manga** — Display related manga from MangaDex relationships
- ~~**Advanced filters**~~ — ✅ Implemented in Milestone 19 (genre, theme, demographic, content rating filters)
- ~~**Infinite scroll**~~ — ✅ Implemented on Latest and Search pages with view mode toggle in Milestone 21

### Phase 5: Performance & Polish
- **Server-side caching** — Cache MangaDex responses with TTL (trending/popular change slowly)
- **ISR (Incremental Static Regeneration)** — Pre-render popular manga detail pages
- **Image optimization** — Use Next.js Image optimization for cover images (currently `unoptimized` for reader pages)
- **SEO** — Add proper meta tags, Open Graph images, structured data
- **PWA support** — Offline reading capability with service workers

---

## 5. Design Decisions Log

### Decision: Client-side rendering for all pages
**Choice:** All page components use `"use client"`.
**Rationale:** Every page involves interactive state (genre filtering, page navigation, search input). Server Components would require lifting all interactivity into client component islands, adding complexity without meaningful benefit since all data comes from external APIs (no database queries to optimize).

### Decision: API proxy through Next.js route handlers
**Choice:** All external API calls go through `/api/*` routes instead of being called directly from client components.
**Rationale:** MangaDex blocks CORS from browsers. Additionally, the proxy enables data merging (MangaDex + AniList on the detail page), server-side caching, and keeps API orchestration logic out of React components.

### Decision: MangaDex as primary API, AniList as supplement
**Choice:** MangaDex provides all content (chapters, images, search). AniList only enriches the detail page.
**Rationale:** MangaDex is the only free API that provides actual chapter images for reading. AniList has richer metadata (scores, descriptions, banners) but no chapter content. Using both gives the best user experience.

### Decision: URL-driven state for search
**Choice:** Search query, genre filters, and page number are stored in URL search params, not React state.
**Rationale:** Makes search results shareable via URL, supports browser back/forward navigation naturally, and allows deep-linking to specific search results.

### Decision: pnpm over npm/yarn
**Choice:** pnpm as the package manager.
**Rationale:** Faster installs via content-addressable storage, stricter dependency resolution (prevents phantom dependencies), and disk space efficiency through hard linking.

### Decision: Tailwind CSS v4 + shadcn/ui
**Choice:** Tailwind for utility styling, shadcn/ui for pre-built accessible components.
**Rationale:** Tailwind v4 is faster and requires less configuration. shadcn/ui components are copied into the project (not a dependency), so they can be customized freely. The combination provides a modern, consistent UI with minimal CSS authoring.

### Decision: next-themes for dark mode
**Choice:** `next-themes` library with class-based theme switching.
**Rationale:** Handles SSR/hydration correctly (no flash of wrong theme), supports system preference detection, and integrates cleanly with Tailwind's `dark:` variant via the `.dark` class on `<html>`.
