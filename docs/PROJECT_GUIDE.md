# Project Guide

A complete end-to-end explanation of how Tanso works, from the backend API clients to the frontend React components. This document covers every layer of the application and includes full-flow examples tracing user actions through the entire system.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Backend Layer — API Clients](#2-backend-layer--api-clients)
   - [MangaDex Client](#mangadex-client-srclibmangadexts)
   - [AniList Client](#anilist-client-srclibanilistts)
3. [API Routes Layer — Backend Proxy](#3-api-routes-layer--backend-proxy)
4. [Frontend Layer — Pages and Components](#4-frontend-layer--pages-and-components)
   - [Root Layout](#root-layout)
   - [Home Page](#home-page)
   - [Search Page](#search-page)
   - [Manga Detail Page](#manga-detail-page)
   - [Chapter Reader Page](#chapter-reader-page)
   - [Shared Components](#shared-components)
5. [Full Flow Examples](#5-full-flow-examples)
   - [Example 1: User Opens Home Page](#example-1-user-opens-home-page)
   - [Example 2: User Searches "Naruto" with Action Genre](#example-2-user-searches-naruto-with-action-genre)
   - [Example 3: User Opens a Manga Detail Page](#example-3-user-opens-a-manga-detail-page)
   - [Example 4: User Reads a Chapter](#example-4-user-reads-a-chapter)
6. [Reading Progress, Library & History](#6-reading-progress-library--history)
7. [Data Types](#7-data-types)
8. [Theming — How Dark Mode Works](#8-theming--how-dark-mode-works)

---

## 1. Overview

Tanso is a web application for discovering and exploring manga, anime, and more. It is built with **Next.js 16** (App Router) and **TypeScript**, styled with **Tailwind CSS v4** and **shadcn/ui** components.

The app does not host any manga content itself. Instead, it aggregates data from multiple external sources:

- **MangaDex API** (`https://api.mangadex.org`) — The primary data source. Provides manga titles, chapters, cover images, chapter page images, tags, and author information. MangaDex is an ad-free, community-driven manga platform.

- **AniList GraphQL API** (`https://graphql.anilist.co`) — A supplementary data source. Provides richer metadata than MangaDex: community scores, detailed descriptions, banner images, and recommendations. Used on the manga detail page to enrich the experience.

- **MangaPill** (via `@consumet/extensions`) — A secondary chapter source. When MangaDex has limited chapters (e.g., due to DMCA takedowns), MangaPill provides an alternative source. Accessed through the Consumet scraping library.

**Why multiple sources?** MangaDex has the best metadata and community but some manga have chapters removed due to licensing. MangaPill fills those gaps. AniList provides rich metadata that neither MangaDex nor MangaPill have. The provider registry pattern makes adding future sources trivial.

---

## 2. Backend Layer — API Clients

The backend logic lives in `src/lib/`. These files contain functions that call the external APIs and normalize the responses into our TypeScript types. They run on the server (inside Next.js API route handlers).

### Provider Registry (`src/lib/providers/`)

The provider registry is an abstraction layer that wraps all content sources behind a common `ContentProvider` interface. This allows API routes to look up a provider by name and call its methods without knowing the implementation details.

**Key files:**
- `types.ts` — Defines `ContentProvider` and `ProviderSearchResult` interfaces
- `index.ts` — Registry with `registerProvider()`, `getProvider()`, `listProviders()` functions
- `mangadex.ts` — MangaDex provider wrapping existing `src/lib/mangadex.ts` functions
- `mangareader.ts` — MangaPill provider wrapping `@consumet/extensions` with 5-second timeouts

**Adding a new provider** requires only creating a new file that implements `ContentProvider` and calling `registerProvider()` in `index.ts`. No other files need changes.

### Cache Layer (`src/lib/cache.ts`)

A simple TTL-based LRU cache used to avoid redundant API calls:
- **Source discovery cache** — key: manga ID, TTL: 30 min, max 500 entries
- **Chapter list cache** — key: `provider:sourceId`, TTL: 1 hr, max 200 entries

### Title Matching (`src/lib/matching.ts`)

A scoring algorithm used during source discovery to match manga across providers:
- Title similarity (exact, contains, Levenshtein): 0-50 pts
- Chapter count proximity to expected: 0-30 pts
- Status match: 0-10 pts
- Edition keyword penalty: -20 pts
- Threshold: only results scoring >= 40 are returned

### MangaDex Client (`src/lib/mangadex.ts`)

This is the largest and most important file in the backend. It contains all functions for communicating with the MangaDex API.

#### Internal Types and Helpers

The file defines internal interfaces (`MdMangaAttributes`, `MdChapterAttributes`, `MdRelationship`) that mirror the raw MangaDex response shape. These are never exported — they exist only to type the normalization functions.

**`pickTitle(titles, altTitles)`** — Resolves the best title from MangaDex's multilingual title map:
- Priority: English → Japanese romanized (`ja-ro`) → Japanese (`ja`) → first available
- If both English and Japanese exist and differ, Japanese becomes the `altTitle`
- This ensures English-speaking users always see a readable title, while preserving the original title as a subtitle

**`normalizeManga(item)`** — Transforms a raw MangaDex manga object into our `Manga` type:
- Extracts the best title via `pickTitle()`
- Finds `cover_art`, `author`, and `artist` entities from the `relationships[]` array
- Pulls `fileName` from cover art and `name` from author/artist
- Maps tags from nested `{ attributes: { name: { en } } }` to flat `{ id, name, group }`

**`normalizeChapter(item)`** — Transforms a raw chapter object into our `Chapter` type:
- Extracts the scanlation group name from `relationships[]`
- Flattens the chapter attributes

#### Public Functions

**`searchManga(query, options)`**
- Calls: `GET /manga?title={query}&limit={limit}&offset={offset}&includes[]=cover_art&includes[]=author&includes[]=artist&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic&order[relevance]=desc`
- Optional: appends `includedTags[]` for genre filtering
- Returns: `PaginatedResponse<Manga>` with `data`, `total`, `offset`, `limit`

**`getMangaDetails(id)`**
- Calls: `GET /manga/{id}?includes[]=cover_art&includes[]=author&includes[]=artist`
- Returns: a single `Manga` object
- The `includes[]` params tell MangaDex to embed related entities in the response, avoiding separate API calls for cover art and author data

**`getMangaChapters(id, options)`**
- Calls: `GET /manga/{id}/feed?limit={limit}&offset={offset}&translatedLanguage[]=en&order[chapter]=desc&includes[]=scanlation_group`
- Returns: `PaginatedResponse<Chapter>`
- Defaults to English chapters in descending order (newest first)

**`getChapterPages(chapterId)`**
- Calls: `GET /at-home/server/{chapterId}`
- Returns: `ChapterPages` containing `baseUrl`, `hash`, `data[]` (original filenames), `dataSaver[]` (compressed filenames)
- The client constructs full image URLs from these components

**`getMangaTags()`**
- Calls: `GET /manga/tag`
- Returns: `MangaTag[]` — all available tags with `id`, `name`, `group`
- **Cached in memory:** The result is stored in a module-level variable. Subsequent calls return the cached value without hitting MangaDex. This is safe because tags almost never change.

**`getPopularManga(limit, includedTags)`** / **`getLatestManga(...)`** / **`getTrendingManga(...)`**
- All three call `GET /manga` with different `order` parameters:
  - Popular: `order[followedCount]=desc` (most bookmarked)
  - Latest: `order[latestUploadedChapter]=desc` (most recently updated)
  - Trending: `order[rating]=desc` (highest community rating)
- All include all content ratings (`safe`, `suggestive`, `erotica`, `pornographic`) via the shared `appendContentRatings()` helper
- All include cover art, author, and artist relationships
- All accept optional `includedTags[]` for genre filtering
- Return: `Manga[]`

**`getCoverUrl(mangaId, coverFileName, size)`**
- Pure function (no API call). Constructs a cover image URL:
  ```
  https://uploads.mangadex.org/covers/{mangaId}/{coverFileName}.256.jpg
  ```
- Sizes: `"256"` (thumbnail), `"512"` (medium), `"original"` (full resolution)

---

### AniList Client (`src/lib/anilist.ts`)

A single-function module that queries AniList's GraphQL API.

**`searchAniListManga(title)`**
- Sends a `POST` request to `https://graphql.anilist.co` with a GraphQL query
- Variables: `{ search: title }` — searches by the manga title obtained from MangaDex
- The query fetches: `id`, `title` (romaji/english/native), `description`, `averageScore`, `meanScore`, `genres`, `tags`, `bannerImage`, `coverImage`, `status`, `chapters`, `volumes`, `startDate`, and `recommendations` (top 6 by rating)
- Returns: `AniListMedia | null` — null if the request fails or no match is found
- Wrapped in try/catch so AniList failures never break the manga detail page (it just shows MangaDex data without enrichment)

---

## 3. API Routes Layer — Backend Proxy

API routes live in `src/app/api/`. Each `route.ts` file exports a `GET` function that handles incoming requests, calls the appropriate API client function, and returns JSON.

### `/api/manga/trending` — Trending Manga Feed

**File:** `src/app/api/manga/trending/route.ts`

- Reads `tags` query parameter (repeatable, for genre filtering)
- Calls `getTrendingManga(20, tags)` — fetches 20 manga ordered by rating
- Returns: `{ data: Manga[] }`

The `/api/manga/popular` and `/api/manga/latest` routes follow the exact same pattern, differing only in which function they call (`getPopularManga` or `getLatestManga`).

### `/api/manga/tags` — Genre/Theme Tag List

**File:** `src/app/api/manga/tags/route.ts`

- No query parameters
- Calls `getMangaTags()` — returns the full tag list (cached after first call)
- Returns: `{ data: MangaTag[] }`

### `/api/manga/[id]` — Manga Details (Merged)

**File:** `src/app/api/manga/[id]/route.ts`

This is the most interesting route because it merges two API sources:

1. Calls `getMangaDetails(id)` to get the manga from MangaDex
2. Takes the manga's `title` and calls `searchAniListManga(title)` to find the matching AniList entry
3. Returns both: `{ manga: Manga, anilist: AniListMedia | null }`

The client receives a single response containing all the data it needs for the detail page. If AniList doesn't find a match (or fails), `anilist` is `null` and the page falls back to MangaDex data only.

### `/api/manga/[id]/chapters` — Chapter List (Multi-Source)

**File:** `src/app/api/manga/[id]/chapters/route.ts`

- Reads `source` (default "mangadex"), `sourceId`, `page` (default 1), and `lang` (default "en") query parameters
- **MangaDex path:** Uses server-side pagination (30 per page) via `getMangaChapters()`
- **Other sources:** Looks up provider in registry, calls `provider.getChapters(sourceId)`, returns full chapter list (client does pagination). Results are cached in `chapterCache`.
- Returns: `{ data: Chapter[], total: number }`

### `/api/manga/[id]/sources` — Source Discovery

**File:** `src/app/api/manga/[id]/sources/route.ts`

- Reads `title` (required), `lastChapter`, `anilistId`, `status` query parameters
- Always includes MangaDex as a source (chapter count fetched from the API)
- For each non-MangaDex provider, searches by title and scores results using `matching.ts`
- Results cached in `sourceCache` (30 min TTL)
- Returns: `{ sources: MangaSource[] }`

### `/api/chapter/[id]` — MangaDex Chapter Page Images

**File:** `src/app/api/chapter/[id]/route.ts`

- No query parameters. MangaDex-only route.
- Calls `getChapterPages(id)` and returns `ChapterPagesResponse` with `source: "mangadex"`, `baseUrl`, `hash`, `data[]`, `dataSaver[]`

### `/api/chapter/resolve` — Consumet Chapter Page Images

**File:** `src/app/api/chapter/resolve/route.ts`

- Reads `source` and `chapterId` query parameters (query-param based to handle `/` in Consumet chapter IDs)
- Looks up provider in registry, calls `provider.getChapterPages(chapterId)`
- Returns: `ChapterPagesResponse` with `source`, `pages[]`

### `/api/proxy-image` — Secured Image Proxy

**File:** `src/app/api/proxy-image/route.ts`

- Reads `url` and `source` query parameters
- **Security:** Domain whitelist (rejects unknown hosts), HTTPS-only, server-side referer mapping (no arbitrary referers), rate limiting (100 req/min per IP)
- Streams the upstream image response to the client with cache headers

### `/api/search` — Search Proxy (with AniList-Augmented Results)

**File:** `src/app/api/search/route.ts`

- Reads `q` (search query), `page` (default 1), and `genres` (repeatable) query parameters
- Computes `offset = (page - 1) * 20`
- Runs **two calls in parallel**: `searchManga(q, ...)` against MangaDex and `searchAniListManga(q)` against AniList
- **Fast path:** If AniList finds no match or its titles are the same as the user's query, MangaDex results are returned directly
- **Augmented path:** If AniList discovers a different canonical title (romaji or English), a secondary MangaDex search is performed with that title. The results are **merged** — AniList-guided results first (higher relevance), followed by unique results from the original search, capped at the page limit.
- **Empty path:** If MangaDex returns 0 results for the original query but AniList's canonical title yields results, those are returned entirely.
- Returns: `PaginatedResponse<Manga>` with `data`, `total`, `offset`, `limit`

**Why this matters:** MangaDex's `title` parameter only searches primary titles, not `altTitles`. Searching "Please Leave Me Alone (For Some Reason…)" may return 0 results or irrelevant partial matches, because the primary title is a Japanese romanized string. AniList's search works across all title variants, so it discovers the canonical title (e.g., "Douka Ore o Houtte Oitekure…") which MangaDex can then match accurately. Even when MangaDex returns some results for the original query, the AniList-guided results are prepended to ensure the most relevant manga appears first.

### Error Handling Pattern

Every route follows the same try/catch pattern:
```typescript
try {
  // ... call API client
  return NextResponse.json(result);
} catch {
  return NextResponse.json({ error: "..." }, { status: 500 });
}
```
This ensures the client always gets a valid JSON response, even on failure.

---

## 4. Frontend Layer — Pages and Components

### Root Layout

**File:** `src/app/layout.tsx`

The root layout wraps every page in the application. It:

1. Loads **Geist** fonts (sans and mono) from Google Fonts via `next/font`
2. Wraps everything in a `ThemeProvider` from `next-themes`:
   - `attribute="class"` — applies a `.dark` class to `<html>` for Tailwind's dark mode
   - `defaultTheme="system"` — respects the user's OS preference on first visit
   - `enableSystem` — auto-switches if the OS preference changes
   - `disableTransitionOnChange` — prevents a flash when toggling themes
3. Renders the `Navbar` component (always visible, sticky at top)
4. Renders `{children}` inside a `<main>` tag with `max-w-7xl` (1280px max width) and horizontal padding

The `suppressHydrationWarning` on `<html>` prevents React from complaining about the theme class being added before hydration.

---

### Home Page

**File:** `src/app/page.tsx`

The entry point of the application. Displays three sections of manga (Trending, Most Popular, Latest Updates) with a genre filter bar at the top.

**State management:**
- `selectedTags: string[]` — currently active genre tag IDs, controlled by the `GenreChips` component
- A custom hook `useMangaSection(section, tags)` encapsulates the fetch logic for each section. It calls `/api/manga/{section}?tags=...` whenever the section name or selected tags change.

**Data flow:**
1. On mount, `GenreChips` fetches `/api/manga/tags` and renders genre pills
2. Three instances of `useMangaSection` fetch trending, popular, and latest manga
3. When the user toggles a genre chip, `selectedTags` updates, all three hooks re-fetch with the new tags
4. Each section renders a `MangaGrid` (or `MangaGridSkeleton` while loading)

---

### Search Page

**File:** `src/app/search/page.tsx`

A full-featured search interface with text input, tag filtering (genres, themes, demographics, content ratings), and dual pagination modes.

**URL-driven state:**
- `q` — search query text
- `tags` — selected tag IDs for genres/themes/demographics (repeatable param)
- `ratings` — content rating filters (safe, suggestive, erotica, pornographic)
- `page` — current page number (paginated mode only)

All state is derived from URL search params (`useSearchParams`). When the user types a query, selects filters, or clicks a pagination button, the URL is updated via `router.push()`, which triggers a re-render and a new API fetch.

**View modes:**
- **Scroll (infinite)** — Results load automatically as the user scrolls down. Uses IntersectionObserver to detect when the bottom is reached.
- **Pages (paginated)** — Traditional prev/next navigation with a page number input for direct jumps. Page input navigates on Enter or blur.

**Why URL state?** This makes search results bookmarkable and shareable. The browser's back/forward buttons work naturally. If someone shares a URL like `/search?q=naruto&tags=action-tag-id&page=2`, the recipient sees the exact same results.

**Data flow:**
1. User types "Naruto" and clicks Search (or presses Enter)
2. URL updates to `/search?q=naruto`
3. `useEffect` fires, calls `GET /api/search?q=naruto&page=1`
4. Results render in a `MangaGrid`
5. User clicks "Action" tag in TagFilter
6. URL updates to `/search?q=naruto&tags=action-tag-id`
7. `useEffect` fires again with the new params

The page is wrapped in a `<Suspense>` boundary because `useSearchParams()` requires it in Next.js App Router. A scroll-to-top button appears after scrolling 300px.

---

### Manga Detail Page

**File:** `src/app/manga/[id]/page.tsx`

Displays comprehensive information about a single manga with merged data from MangaDex and AniList.

**Data flow:**
1. Page receives `params.id` (the MangaDex manga UUID)
2. Fetches `GET /api/manga/{id}` which returns `{ manga: Manga, anilist: AniListMedia | null }`
3. Renders:
   - **Banner image** from AniList (wide cinematic image at the top, if available)
   - **Cover image** from MangaDex at 512px quality
   - **Title** and **alt title** (English + Japanese)
   - **Author/artist** names, **year**, **status** badge
   - **AniList score** badge (if available)
   - **Genre tags** as badges (filtered from MangaDex tags where `group === "genre"`)
   - **Description** — prefers AniList (richer, longer) with MangaDex as fallback
   - **Chapter list** via the `ChapterList` component

**Data merging strategy:**
The page makes the best use of both API sources:
| Field | Source | Reasoning |
|---|---|---|
| Cover image | MangaDex | MangaDex covers are the canonical manga covers |
| Banner image | AniList | MangaDex doesn't have banner images |
| Title, author, status | MangaDex | Primary source of truth for manga metadata |
| Score | AniList | Community rating from a large user base |
| Description | AniList (preferred), MangaDex (fallback) | AniList descriptions are typically more detailed |
| Genre tags | MangaDex | Consistent with the genre chips used for filtering |
| Chapters | MangaDex | Only source with actual chapter data |

---

### Chapter Reader Page

**Files:** `src/app/read/[chapterId]/page.tsx` (MangaDex entry), `src/app/read/ext/page.tsx` (Consumet entry)

The core reading experience. Displays one manga page at a time with multiple navigation methods. Both entry points render the shared `ReaderContent` component.

**Dual entry points:**
- `/read/{chapterId}?manga={mangaId}` — MangaDex chapters (path-based, UUIDs are safe)
- `/read/ext?manga={mangaId}&source={provider}&chapterId={id}` — Consumet chapters (query-param based to handle `/` in chapter IDs)

**State:**
- `pages: ChapterPagesResponse | null` — discriminated union: MangaDex variant has `hash`/`baseUrl`/`data`/`dataSaver`, other sources have `pages[]` with direct image URLs
- `currentPage: number` — 0-indexed current page
- `quality: "data" | "data-saver"` — image quality setting (MangaDex only)

**Data flow:**
1. MangaDex: fetches `GET /api/chapter/{chapterId}`, constructs URLs from `baseUrl/quality/hash/filename`
2. Consumet: fetches `GET /api/chapter/resolve?source={provider}&chapterId={id}`, uses direct image URLs from `pages[].img`

**Navigation methods (5 ways to navigate):**
1. **Arrow keys** — Left/Right arrows for previous/next page
2. **A/D keys** — Alternative keyboard shortcuts
3. **Click on image** — Click left half for previous, right half for next
4. **Buttons** — Previous/Next buttons below the image
5. **Page selector** — Dropdown to jump to any page

**Image preloading:**
When the current page changes, the component creates `new Image()` objects for the next 3 pages. Works identically for both MangaDex and Consumet sources.

**Quality toggle:**
Only shown for MangaDex chapters (which have two quality tiers). Hidden for Consumet chapters (single quality). The `isMangaDex` flag is determined by checking `"hash" in pages` for proper TypeScript narrowing.

---

### Shared Components

**`Navbar`** (`src/components/navbar.tsx`)
- Sticky header with `bg-background/80 backdrop-blur-sm` for a frosted glass effect
- Contains: Logo (book icon + "Tanso" text), centered SearchBar, ThemeToggle
- Logo links to home page

**`SearchBar`** (`src/components/search-bar.tsx`)
- Form with a search icon and text input
- On submit, navigates to `/search?q={query}`
- Max width of `sm` (384px)

**`ThemeToggle`** (`src/components/theme-toggle.tsx`)
- Ghost button with sun/moon icon
- Calls `setTheme("dark" | "light")` from `useTheme()`
- Renders a placeholder during SSR to avoid hydration mismatch

**`GenreChips`** (`src/components/genre-chips.tsx`)
- Fetches tags from `/api/manga/tags` on mount
- Filters to `group === "genre"`, sorts alphabetically
- Renders horizontally scrollable pill buttons
- "All" button clears selection
- Each genre chip toggles its ID in the parent's selected array
- Shows animated pulse placeholders while loading

**`MangaCard`** (`src/components/manga-card.tsx`)
- Links to `/manga/{id}`
- Shows cover image (aspect 3:4), title (2 lines max), author name
- "Suggestive" badge for non-safe content
- Hover: slight scale-up and title color change

**`MangaGrid`** (`src/components/manga-grid.tsx`)
- Responsive CSS grid: 2 columns (mobile) → 3 → 4 → 5 columns (desktop)
- Maps over `Manga[]` and renders `MangaCard` for each
- Shows "No manga found" message if the array is empty

**`MangaCardSkeleton` / `MangaGridSkeleton`**
- Animated pulse placeholders matching the card/grid layout
- Used while data is being fetched

**`ChapterList`** (`src/components/chapter-list.tsx`)
- Takes `mangaId`, `mangaTitle`, `lastChapter`, and optional `anilistId` props
- Progressive source loading: MangaDex tab shown immediately, Consumet sources discovered in background
- Source tabs display provider name, matched title (for non-MangaDex), and chapter count
- AbortController cancels pending fetches when switching source tabs
- MangaDex chapters use server-side pagination; other sources use client-side pagination
- MangaDex chapters link to `/read/{chapterId}?manga={mangaId}`
- Consumet chapters link to `/read/ext?manga={mangaId}&source={provider}&chapterId={encodedId}`
- Loading, error, empty, and retry states per source

---

## 5. Full Flow Examples

### Example 1: User Opens Home Page

**User action:** Opens `http://localhost:3000` in their browser.

**Step-by-step trace:**

1. **Next.js renders `layout.tsx`:** Loads Geist fonts, wraps page in ThemeProvider, renders Navbar.

2. **`page.tsx` mounts (client-side):** Initializes `selectedTags = []`.

3. **`GenreChips` mounts:** Calls `GET /api/manga/tags`.
   - API route calls `getMangaTags()` → `GET https://api.mangadex.org/manga/tag`
   - MangaDex returns ~70 tags across groups: genre, theme, format, content
   - `getMangaTags()` normalizes and caches them in memory
   - Response: `{ data: [{ id: "391b", name: "Action", group: "genre" }, ...] }`
   - Component filters to `group === "genre"` (~25 tags), sorts alphabetically, renders chips

4. **Three `useMangaSection` hooks fire in parallel:**
   - `GET /api/manga/trending?` → `getTrendingManga(20)` → MangaDex `GET /manga?order[rating]=desc&limit=20&...`
   - `GET /api/manga/popular?` → `getPopularManga(20)` → MangaDex `GET /manga?order[followedCount]=desc&limit=20&...`
   - `GET /api/manga/latest?` → `getLatestManga(20)` → MangaDex `GET /manga?order[latestUploadedChapter]=desc&limit=20&...`

5. **Each response** contains 20 manga objects with embedded cover art, author, and artist data.
   - `normalizeManga()` runs on each, producing clean `Manga` objects
   - Each hook updates its `data` state and sets `loading = false`

6. **`MangaGrid` renders** for each section, showing a 5-column grid of `MangaCard` components with cover images loaded from `https://uploads.mangadex.org/covers/{id}/{file}.256.jpg`.

**Total API calls from the browser:** 4 (`tags` + `trending` + `popular` + `latest`)
**Total external API calls from the server:** 4 (1 MangaDex tag call + 3 MangaDex manga list calls)

---

### Example 2: User Searches "Naruto" with Action Genre

**User action:** Types "Naruto" in the search bar, presses Enter, then clicks the "Action" genre chip.

**Step-by-step trace:**

1. **SearchBar form submits:** `router.push("/search?q=naruto")` — navigates to the search page.

2. **Search page mounts:** Reads URL params: `q = "naruto"`, `genres = []`, `page = 1`.

3. **First fetch fires:**
   - `GET /api/search?q=naruto&page=1`
   - API route: `searchManga("naruto", { limit: 20, offset: 0 })`
   - MangaDex: `GET /manga?title=naruto&limit=20&offset=0&includes[]=cover_art&includes[]=author&includes[]=artist&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic&order[relevance]=desc`
   - Response: `{ data: [20 manga], total: 47, offset: 0, limit: 20 }`

4. **Page renders:** "47 results found", grid of 20 manga cards, pagination showing "Page 1 of 3".

5. **User clicks "Action" genre chip:**
   - `handleGenreChange(["391b-action-tag-id"])` fires
   - `router.push("/search?q=naruto&genres=391b-action-tag-id")` updates the URL

6. **URL change triggers re-fetch:**
   - `GET /api/search?q=naruto&page=1&genres=391b-action-tag-id`
   - API route: `searchManga("naruto", { limit: 20, offset: 0, includedTags: ["391b-action-tag-id"] })`
   - MangaDex: `GET /manga?title=naruto&...&includedTags[]=391b-action-tag-id`
   - Response: fewer results (only Naruto manga tagged as Action)

7. **Page re-renders** with filtered results and updated count.

**Total browser API calls:** 2 (initial search + filtered search). Tags are fetched separately by `GenreChips`.

---

### Example 2b: User Searches an English Alt Title — AniList Fallback

**User action:** Types "Please Leave Me Alone For Some Reason She Wants To Change" and presses Enter.

**Step-by-step trace:**

1. **URL updates** to `/search?q=Please%20Leave%20Me%20Alone%20...`.

2. **`/api/search` route runs two calls in parallel:**
   - `searchManga("Please Leave Me Alone...")` → MangaDex `GET /manga?title=...` → **0 results** (the English name is only an alt title, the primary title is the Japanese romanized string)
   - `searchAniListManga("Please Leave Me Alone...")` → AniList `POST /graphql` → finds the manga and returns `title.romaji = "Douka Ore o Houtte Oitekure..."`

3. **Fallback triggers:** MangaDex returned 0 results, so the route tries the AniList romaji title:
   - `searchManga("Douka Ore o Houtte Oitekure...")` → MangaDex `GET /manga?title=Douka%20Ore...` → **2 results** (the primary title now matches)

4. **Page renders** with the 2 results found via the fallback. From the user's perspective, the search "just works."

**Total browser API calls:** 1 (`/api/search?q=...`)
**Total external API calls from server:** 3 (MangaDex search #1 + AniList search + MangaDex search #2 with romaji title)

---

### Example 3: User Opens a Manga Detail Page

**User action:** Clicks on "Naruto" manga card from search results.

**Step-by-step trace:**

1. **Navigation:** `<Link href="/manga/abc123">` triggers client-side navigation.

2. **Detail page mounts:** Shows `MangaDetailSkeleton` (animated placeholders).

3. **Data fetch:**
   - `GET /api/manga/abc123`
   - API route does two things sequentially:
     - `getMangaDetails("abc123")` → MangaDex `GET /manga/abc123?includes[]=cover_art&includes[]=author&includes[]=artist`
     - MangaDex returns: title "Naruto", author "Kishimoto Masashi", status "completed", year 1999, tags, cover art filename
     - `normalizeManga()` produces a clean `Manga` object
     - `searchAniListManga("Naruto")` → AniList `POST /graphql` with `{ search: "Naruto", type: MANGA }`
     - AniList returns: averageScore 84, genres ["Action", "Adventure"], bannerImage URL, description (detailed synopsis), recommendations
   - Response: `{ manga: { id: "abc123", title: "Naruto", ... }, anilist: { averageScore: 84, bannerImage: "https://...", ... } }`

4. **Page renders with merged data:**
   - Banner image from AniList (wide image at top with gradient overlay)
   - Cover from MangaDex at 512px
   - Title "Naruto", alt title (Japanese romanized)
   - "By Kishimoto Masashi · 1999 · Completed · ★ 84%"
   - Genre badges: Action, Adventure, ...
   - Description from AniList (longer, more detailed than MangaDex)

5. **ChapterList mounts:**
   - `GET /api/manga/abc123/chapters?page=1`
   - Returns 30 chapters (descending order): Ch. 700, Ch. 699, ..., Ch. 671
   - Each row shows: "Vol. 72 Ch. 700 — The Uzumaki Naruto!! — Viz Media — 12/08/2014"
   - Pagination: "Page 1 of 24" with Next button

**Total browser API calls:** 2 (`/api/manga/abc123` + `/api/manga/abc123/chapters?page=1`)
**Total external API calls from server:** 3 (MangaDex details + AniList search + MangaDex chapter feed)

---

### Example 4: User Reads a Chapter

**User action:** Clicks "Ch. 700" from the chapter list on the Naruto detail page.

**Step-by-step trace:**

1. **Navigation:** `<Link href="/read/ch-700-uuid?manga=abc123">` navigates to the reader.

2. **Reader mounts:** Shows loading spinner.

3. **Chapter pages fetch:**
   - `GET /api/chapter/ch-700-uuid`
   - API route: `getChapterPages("ch-700-uuid")` → MangaDex `GET /at-home/server/ch-700-uuid`
   - MangaDex responds:
     ```json
     {
       "baseUrl": "https://uploads.mangadex.org",
       "chapter": {
         "hash": "a1b2c3d4...",
         "data": ["page1.jpg", "page2.png", "page3.jpg", ...],
         "dataSaver": ["page1-saver.jpg", "page2-saver.png", ...]
       }
     }
     ```
   - Normalized to `ChapterPagesResponse`: `{ source: "mangadex", baseUrl, hash, data: [...], dataSaver: [...] }`

4. **First page renders:**
   - Quality defaults to `"data"` (original)
   - URL constructed: `https://uploads.mangadex.org/data/a1b2c3d4.../page1.jpg`
   - `<Image>` loads and displays the first manga page
   - Page indicator shows "Page 1 of 18"

5. **Preloading kicks in:**
   - `new Image().src = ".../page2.jpg"` (prefetch page 2)
   - `new Image().src = ".../page3.jpg"` (prefetch page 3)
   - `new Image().src = ".../page4.jpg"` (prefetch page 4)

6. **User presses → arrow key:**
   - `handleKey` fires, calls `goTo(1)`
   - `currentPage` updates to 1
   - Image URL changes to `.../page2.jpg` (already cached from preload — instant display)
   - `window.scrollTo(0, 0)` scrolls to top
   - Preloading shifts: now prefetches pages 3, 4, 5

7. **User toggles quality to "Lite":**
   - `quality` changes from `"data"` to `"data-saver"`
   - File list switches from `pages.data` to `pages.dataSaver`
   - Image URL becomes: `.../data-saver/a1b2c3d4.../page2-saver.jpg`
   - Smaller file, faster load on slow connections

8. **User clicks right half of the image:**
   - Click handler calculates: `clickX > imageWidth / 2` → next page
   - Same effect as pressing → arrow key

**Total browser API calls:** 1 (`/api/chapter/ch-700-uuid`)
**Image loads:** 1 visible + 3 preloaded = 4 concurrent image requests initially

---

## 6. Reading Progress, Library & History

Tanso provides client-side persistence for tracking reading progress without requiring user authentication. All data is stored in the browser's localStorage.

### Reading Progress

**Storage key:** `tanso:progress`

Reading progress is automatically saved when reading chapters:

1. **Auto-save on page turn:** The `useReadingProgress` hook saves progress with debouncing (1 second delay) to avoid excessive writes
2. **Flush on exit:** When leaving a chapter, `flushProgress()` is called to ensure the final position is saved
3. **Chapter completion:** When reaching the last page, the chapter is marked as read in `tanso:chapters_read`

**Data flow:**
```
User turns page → updateProgress() → debounce 1s → saveProgress() → localStorage
User leaves page → flushProgress() → immediate save → localStorage
User reaches last page → markChapterAsRead() → localStorage
```

### Library (Bookmarks)

**Storage key:** `tanso:library`

Users can add manga to their library with status tracking:

- **Reading:** Currently reading
- **Plan to Read:** Want to read later
- **Completed:** Finished reading
- **On Hold:** Paused
- **Dropped:** Stopped reading

**UI components:**
- `LibraryButton` (manga detail page) — dropdown to add/update status
- `/library` page — grid view with status tabs
- Visual badges on library cards showing current status

### Reading History

**Storage key:** `tanso:history`

Automatically tracks the last 100 manga read:

- Added when entering any chapter
- Updated with latest chapter info
- Grouped by date in the history page (Today, Yesterday, This Week, etc.)

**UI components:**
- `/history` page — timeline view with date groupings
- "Continue" link to resume reading
- Clear all button with confirmation

### Continue Reading

**Storage key:** `tanso:progress` (same as reading progress)

The home page displays a "Continue Reading" section showing manga with saved progress:

- Shows cover, title, chapter number, and progress percentage
- Progress bar visualization
- Click to resume at the saved page position

### Chapter Read Indicators

**Storage key:** `tanso:chapters_read`

The chapter list shows visual indicators for read status:

- **Checkmark icon:** Chapter completed (reached last page)
- **Book icon:** Currently reading (has saved progress)
- **No icon:** Unread
- **Background colors:** Reading chapters have highlighted backgrounds

---

## 7. Data Types

### `Manga` (`src/types/manga.ts`)

The core type representing a manga title.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | MangaDex UUID |
| `title` | `string` | Best available English title |
| `altTitle` | `string?` | Japanese/alternative title (shown as subtitle) |
| `description` | `string` | Synopsis text |
| `status` | `string` | "ongoing", "completed", "hiatus", "cancelled" |
| `year` | `number | null` | Year of first publication |
| `contentRating` | `string` | "safe", "suggestive", "erotica" |
| `tags` | `MangaTag[]` | Genre and theme tags |
| `coverId` | `string | null` | Cover art relationship ID |
| `coverFileName` | `string | null` | Filename for constructing cover URL |
| `authorName` | `string | null` | Author name |
| `artistName` | `string | null` | Artist name (may differ from author) |
| `lastChapter` | `string | null` | Latest chapter number |
| `lastVolume` | `string | null` | Latest volume number |

### `MangaTag` (`src/types/manga.ts`)

| Field | Type | Description |
|---|---|---|
| `id` | `string` | MangaDex tag UUID |
| `name` | `string` | English tag name (e.g., "Action") |
| `group` | `string` | Tag category: "genre", "theme", "format", "content" |

### `Chapter` (`src/types/manga.ts`)

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Chapter ID (MangaDex UUID or Consumet slug) |
| `title` | `string | null` | Chapter title (may be null) |
| `chapter` | `string | null` | Chapter number (string, e.g., "24.5") |
| `volume` | `string | null` | Volume number |
| `pages` | `number` | Number of pages in the chapter (0 = unknown for Consumet) |
| `translatedLanguage` | `string` | Language code (e.g., "en") |
| `publishAt` | `string` | ISO timestamp of when the chapter was published |
| `scanlationGroup` | `string | null` | Name of the group that scanlated this chapter |
| `source` | `string` | Provider name: "mangadex", "mangareader", etc. |

### `MangaSource` (`src/types/manga.ts`)

| Field | Type | Description |
|---|---|---|
| `provider` | `string` | Provider name (e.g., "mangadex", "mangareader") |
| `displayName` | `string` | Human-readable name (e.g., "MangaDex", "MangaReader") |
| `sourceId` | `string` | ID of the manga on this provider |
| `matchedTitle` | `string` | Title as it appears on this provider |
| `chapterCount` | `number` | Number of chapters available |
| `confidence` | `number` | Match confidence 0-100 (100 = exact match) |

### `ChapterPagesResponse` (`src/types/manga.ts`)

A discriminated union type. Check `"hash" in response` to narrow:

**MangaDex variant:**

| Field | Type | Description |
|---|---|---|
| `source` | `"mangadex"` | Discriminator |
| `baseUrl` | `string` | CDN base URL (valid ~15 min) |
| `hash` | `string` | Chapter image hash |
| `data` | `string[]` | Original quality filenames |
| `dataSaver` | `string[]` | Compressed quality filenames |

**External source variant:**

| Field | Type | Description |
|---|---|---|
| `source` | `string` | Provider name |
| `pages` | `{ img: string; page: number }[]` | Direct image URLs with page numbers |

### `PaginatedResponse<T>` (`src/types/manga.ts`)

| Field | Type | Description |
|---|---|---|
| `data` | `T[]` | Array of items for the current page |
| `total` | `number` | Total number of items across all pages |
| `offset` | `number` | Current offset |
| `limit` | `number` | Items per page |

### `AniListMedia` (`src/types/anilist.ts`)

| Field | Type | Description |
|---|---|---|
| `id` | `number` | AniList media ID |
| `title` | `{ romaji, english, native }` | Titles in different scripts |
| `description` | `string | null` | Synopsis (plain text) |
| `averageScore` | `number | null` | Community score (0-100) |
| `meanScore` | `number | null` | Mean score |
| `genres` | `string[]` | Genre list |
| `tags` | `{ name, rank }[]` | Ranked tags |
| `bannerImage` | `string | null` | Wide banner image URL |
| `coverImage` | `{ extraLarge, large } | null` | Cover image URLs |
| `status` | `string | null` | Publication status |
| `chapters` | `number | null` | Total chapter count |
| `volumes` | `number | null` | Total volume count |
| `startDate` | `{ year, month, day } | null` | Publication start date |
| `recommendations` | `{ nodes: [...] } | null` | Related manga recommendations |

---

## 8. Theming — How Dark Mode Works

Dark mode is implemented using three technologies working together:

### 1. next-themes (Theme State Management)

The `ThemeProvider` in `layout.tsx` manages the current theme:

```tsx
<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
```

- `attribute="class"` — When the theme is "dark", a `.dark` class is added to the `<html>` element. When "light", the class is removed.
- `defaultTheme="system"` — On first visit, the theme matches the user's OS preference.
- `enableSystem` — If the user has their OS set to auto dark mode (e.g., dark after sunset), the app follows it.
- The theme preference is stored in `localStorage` under the key `theme`, so it persists across sessions.

### 2. Tailwind CSS v4 (Dark Variant)

In `globals.css`:

```css
@custom-variant dark (&:is(.dark *));
```

This tells Tailwind that `dark:` utilities should apply when the element is inside a `.dark` parent. Since `next-themes` adds `.dark` to `<html>`, all `dark:` variants throughout the app activate.

### 3. shadcn/ui CSS Variables

The `globals.css` defines CSS variables for both themes:

```css
:root {
  --background: oklch(1 0 0);          /* white */
  --foreground: oklch(0.145 0 0);      /* near-black */
  --card: oklch(1 0 0);                /* white */
  /* ... */
}

.dark {
  --background: oklch(0.145 0 0);      /* near-black */
  --foreground: oklch(0.985 0 0);      /* near-white */
  --card: oklch(0.205 0 0);            /* dark gray */
  /* ... */
}
```

All shadcn/ui components and custom components use these variables (e.g., `bg-background`, `text-foreground`, `bg-card`), so they automatically adapt when the `.dark` class toggles.

### 4. ThemeToggle Component

The `ThemeToggle` button reads the current theme via `useTheme()` and calls `setTheme()` on click:

- Shows a **sun icon** in dark mode (click to switch to light)
- Shows a **moon icon** in light mode (click to switch to dark)
- During server rendering, shows an empty placeholder to avoid hydration mismatch (the theme isn't known on the server)

### Complete flow when the user clicks the theme toggle:

1. `ThemeToggle` calls `setTheme("dark")`
2. `next-themes` adds class `.dark` to `<html>`
3. `next-themes` stores `"dark"` in `localStorage.theme`
4. All CSS variables switch to their `.dark` values
5. All Tailwind `dark:` variants activate
6. The entire UI re-renders with dark colors — no page reload needed
