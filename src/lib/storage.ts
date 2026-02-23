/**
 * Type-safe localStorage utilities for reading progress, history, and library.
 * All data is stored in the browser's localStorage with "tanso:" prefix.
 */

// Storage keys
const STORAGE_KEYS = {
  PROGRESS: "tanso:progress",
  HISTORY: "tanso:history",
  LIBRARY: "tanso:library",
} as const;

// Types
export type LibraryStatus = "reading" | "plan_to_read" | "completed" | "on_hold" | "dropped";

export interface ReadingProgress {
  mangaId: string;
  mangaTitle: string;
  coverUrl: string | null;
  chapterId: string;
  chapterNumber: string | null;
  chapterTitle: string | null;
  page: number;
  totalPages: number;
  source: string;
  timestamp: number;
}

export interface HistoryEntry {
  mangaId: string;
  title: string;
  coverUrl: string | null;
  lastChapterId: string;
  lastChapterNumber: string | null;
  lastChapterTitle: string | null;
  source: string;
  lastReadAt: number;
}

export interface LibraryEntry {
  mangaId: string;
  title: string;
  coverUrl: string | null;
  addedAt: number;
  updatedAt: number;
  status: LibraryStatus;
}

// Helper to check if we're in a browser environment
function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

// Generic storage helpers
function getStorageItem<T>(key: string, defaultValue: T): T {
  if (!isBrowser()) return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStorageItem<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or other error - silently fail
  }
}

// ============================================
// Reading Progress
// ============================================

type ProgressMap = Record<string, ReadingProgress>;

export function getProgress(mangaId: string): ReadingProgress | null {
  const progressMap = getStorageItem<ProgressMap>(STORAGE_KEYS.PROGRESS, {});
  return progressMap[mangaId] ?? null;
}

export function getAllProgress(): ReadingProgress[] {
  const progressMap = getStorageItem<ProgressMap>(STORAGE_KEYS.PROGRESS, {});
  return Object.values(progressMap).sort((a, b) => b.timestamp - a.timestamp);
}

export function getLatestProgress(): ReadingProgress | null {
  const all = getAllProgress();
  return all.length > 0 ? all[0] : null;
}

export function saveProgress(progress: ReadingProgress): void {
  const progressMap = getStorageItem<ProgressMap>(STORAGE_KEYS.PROGRESS, {});
  progressMap[progress.mangaId] = {
    ...progress,
    timestamp: Date.now(),
  };
  setStorageItem(STORAGE_KEYS.PROGRESS, progressMap);
}

export function clearProgress(mangaId: string): void {
  const progressMap = getStorageItem<ProgressMap>(STORAGE_KEYS.PROGRESS, {});
  delete progressMap[mangaId];
  setStorageItem(STORAGE_KEYS.PROGRESS, progressMap);
}

export function clearAllProgress(): void {
  setStorageItem(STORAGE_KEYS.PROGRESS, {});
}

// ============================================
// Reading History
// ============================================

const MAX_HISTORY_ENTRIES = 100;

export function getHistory(): HistoryEntry[] {
  return getStorageItem<HistoryEntry[]>(STORAGE_KEYS.HISTORY, []);
}

export function addToHistory(entry: Omit<HistoryEntry, "lastReadAt">): void {
  let history = getHistory();
  
  // Remove existing entry for this manga if present
  history = history.filter((h) => h.mangaId !== entry.mangaId);
  
  // Add new entry at the beginning
  history.unshift({
    ...entry,
    lastReadAt: Date.now(),
  });
  
  // Limit history size
  if (history.length > MAX_HISTORY_ENTRIES) {
    history = history.slice(0, MAX_HISTORY_ENTRIES);
  }
  
  setStorageItem(STORAGE_KEYS.HISTORY, history);
}

export function removeFromHistory(mangaId: string): void {
  const history = getHistory().filter((h) => h.mangaId !== mangaId);
  setStorageItem(STORAGE_KEYS.HISTORY, history);
}

export function clearHistory(): void {
  setStorageItem(STORAGE_KEYS.HISTORY, []);
}

// ============================================
// Library (Bookmarks)
// ============================================

type LibraryMap = Record<string, LibraryEntry>;

export function getLibrary(): LibraryEntry[] {
  const libraryMap = getStorageItem<LibraryMap>(STORAGE_KEYS.LIBRARY, {});
  return Object.values(libraryMap).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getLibraryByStatus(status: LibraryStatus): LibraryEntry[] {
  return getLibrary().filter((entry) => entry.status === status);
}

export function getLibraryEntry(mangaId: string): LibraryEntry | null {
  const libraryMap = getStorageItem<LibraryMap>(STORAGE_KEYS.LIBRARY, {});
  return libraryMap[mangaId] ?? null;
}

export function isInLibrary(mangaId: string): boolean {
  return getLibraryEntry(mangaId) !== null;
}

export function addToLibrary(
  mangaId: string,
  title: string,
  coverUrl: string | null,
  status: LibraryStatus = "plan_to_read"
): void {
  const libraryMap = getStorageItem<LibraryMap>(STORAGE_KEYS.LIBRARY, {});
  const now = Date.now();
  
  libraryMap[mangaId] = {
    mangaId,
    title,
    coverUrl,
    status,
    addedAt: libraryMap[mangaId]?.addedAt ?? now,
    updatedAt: now,
  };
  
  setStorageItem(STORAGE_KEYS.LIBRARY, libraryMap);
}

export function updateLibraryStatus(mangaId: string, status: LibraryStatus): void {
  const libraryMap = getStorageItem<LibraryMap>(STORAGE_KEYS.LIBRARY, {});
  
  if (libraryMap[mangaId]) {
    libraryMap[mangaId] = {
      ...libraryMap[mangaId],
      status,
      updatedAt: Date.now(),
    };
    setStorageItem(STORAGE_KEYS.LIBRARY, libraryMap);
  }
}

export function removeFromLibrary(mangaId: string): void {
  const libraryMap = getStorageItem<LibraryMap>(STORAGE_KEYS.LIBRARY, {});
  delete libraryMap[mangaId];
  setStorageItem(STORAGE_KEYS.LIBRARY, libraryMap);
}

export function clearLibrary(): void {
  setStorageItem(STORAGE_KEYS.LIBRARY, {});
}

// ============================================
// Chapter Read Status
// ============================================

type ChapterReadMap = Record<string, Set<string>>;
const CHAPTER_READ_KEY = "tanso:chapters_read";

function getChapterReadMap(): Record<string, string[]> {
  return getStorageItem<Record<string, string[]>>(CHAPTER_READ_KEY, {});
}

export function isChapterRead(mangaId: string, chapterId: string): boolean {
  const readMap = getChapterReadMap();
  return readMap[mangaId]?.includes(chapterId) ?? false;
}

export function getReadChapters(mangaId: string): string[] {
  const readMap = getChapterReadMap();
  return readMap[mangaId] ?? [];
}

export function markChapterAsRead(mangaId: string, chapterId: string): void {
  const readMap = getChapterReadMap();
  
  if (!readMap[mangaId]) {
    readMap[mangaId] = [];
  }
  
  if (!readMap[mangaId].includes(chapterId)) {
    readMap[mangaId].push(chapterId);
    setStorageItem(CHAPTER_READ_KEY, readMap);
  }
}

export function markChapterAsUnread(mangaId: string, chapterId: string): void {
  const readMap = getChapterReadMap();
  
  if (readMap[mangaId]) {
    readMap[mangaId] = readMap[mangaId].filter((id) => id !== chapterId);
    setStorageItem(CHAPTER_READ_KEY, readMap);
  }
}

export function clearReadChapters(mangaId: string): void {
  const readMap = getChapterReadMap();
  delete readMap[mangaId];
  setStorageItem(CHAPTER_READ_KEY, readMap);
}
