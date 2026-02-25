'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ReadingProgress,
  getProgress,
  getAllProgress,
  saveProgress,
  clearProgress,
  markChapterAsRead,
} from '@/lib/storage';

interface UseReadingProgressOptions {
  debounceMs?: number;
}

export function useReadingProgress(
  mangaId: string | null,
  options: UseReadingProgressOptions = {}
) {
  const { debounceMs = 1000 } = options;
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const pendingProgressRef = useRef<Partial<ReadingProgress> | null>(null);

  // Load initial progress
  useEffect(() => {
    if (mangaId) {
      setProgress(getProgress(mangaId));
    } else {
      setProgress(null);
    }
    setIsLoading(false);
  }, [mangaId]);

  // Save progress with debouncing
  const updateProgress = useCallback(
    (newProgress: Omit<ReadingProgress, 'timestamp'>) => {
      if (!mangaId) return;

      pendingProgressRef.current = newProgress;

      // Clear existing timeout
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Update local state immediately
      const progressWithTimestamp: ReadingProgress = {
        ...newProgress,
        timestamp: Date.now(),
      };
      setProgress(progressWithTimestamp);

      // Debounce the actual save
      debounceRef.current = setTimeout(() => {
        if (pendingProgressRef.current) {
          saveProgress(progressWithTimestamp);
          pendingProgressRef.current = null;
        }
      }, debounceMs);
    },
    [mangaId, debounceMs]
  );

  // Force save immediately (for when leaving page)
  const flushProgress = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (pendingProgressRef.current && mangaId) {
      saveProgress({
        ...pendingProgressRef.current,
        timestamp: Date.now(),
      } as ReadingProgress);
      pendingProgressRef.current = null;
    }
  }, [mangaId]);

  // Mark chapter as completed
  const completeChapter = useCallback(
    (chapterId: string) => {
      if (mangaId) {
        markChapterAsRead(mangaId, chapterId);
      }
    },
    [mangaId]
  );

  // Clear progress for this manga
  const resetProgress = useCallback(() => {
    if (mangaId) {
      clearProgress(mangaId);
      setProgress(null);
    }
  }, [mangaId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      // Save any pending progress
      if (pendingProgressRef.current && mangaId) {
        saveProgress({
          ...pendingProgressRef.current,
          timestamp: Date.now(),
        } as ReadingProgress);
      }
    };
  }, [mangaId]);

  return {
    progress,
    isLoading,
    updateProgress,
    flushProgress,
    completeChapter,
    resetProgress,
  };
}

// Hook for getting all reading progress (for Continue Reading section)
export function useAllReadingProgress() {
  const [progressList, setProgressList] = useState<ReadingProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setProgressList(getAllProgress());
    setIsLoading(false);
  }, []);

  const refresh = useCallback(() => {
    setProgressList(getAllProgress());
  }, []);

  return {
    progressList,
    isLoading,
    refresh,
  };
}
