import { useState, useEffect, useCallback } from 'react';

const ARCHIVED_VIEW_KEY = 'fluxos-sg-archived-view-global';

/**
 * Persists archived view state globally in localStorage (persists across board switches)
 */
export function useArchivedViewState(_boardId: string | null) {
  const [showArchivedView, setShowArchivedView] = useState(() => {
    try {
      const stored = localStorage.getItem(ARCHIVED_VIEW_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  });

  // Sync state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(ARCHIVED_VIEW_KEY, String(showArchivedView));
    } catch {
      // Ignore storage errors
    }
  }, [showArchivedView]);

  // Toggle archived view
  const toggleArchivedView = useCallback(() => {
    setShowArchivedView((prev) => !prev);
  }, []);

  // Reset archived view
  const resetArchivedView = useCallback(() => {
    setShowArchivedView(false);
  }, []);

  return { showArchivedView, toggleArchivedView, resetArchivedView };
}
