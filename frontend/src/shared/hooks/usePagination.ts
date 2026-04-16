/**
 * usePagination Hook
 * Manages pagination state and provides navigation helpers
 */

import { useState, useCallback } from 'react';

export interface PaginationState {
  page: number;
  pageSize: number;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface UsePaginationReturn {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  resetPage: () => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  canGoNext: (totalPages: number) => boolean;
  canGoPrev: () => boolean;
}

/**
 * Custom hook for managing pagination state
 * @param initialPage - Starting page number (default: 1)
 * @param initialPageSize - Starting page size (default: 50)
 * @returns Pagination state and navigation methods
 */
export function usePagination(
  initialPage: number = 1,
  initialPageSize: number = 50
): UsePaginationReturn {
  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const setPage = useCallback((newPage: number) => {
    if (newPage > 0) {
      setPageState(newPage);
      // Smooth scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const setPageSize = useCallback((newSize: number) => {
    if (newSize > 0) {
      setPageSizeState(newSize);
      // Reset to page 1 when changing page size
      setPageState(1);
    }
  }, []);

  const resetPage = useCallback(() => {
    setPageState(initialPage);
  }, [initialPage]);

  const goToNextPage = useCallback(() => {
    setPageState(p => p + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goToPreviousPage = useCallback(() => {
    setPageState(p => (p > 1 ? p - 1 : 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const canGoNext = useCallback((totalPages: number) => page < totalPages, [page]);

  const canGoPrev = useCallback(() => page > 1, [page]);

  return {
    page,
    pageSize,
    setPage,
    setPageSize,
    resetPage,
    goToNextPage,
    goToPreviousPage,
    canGoNext,
    canGoPrev,
  };
}
