/**
 * useFilters Hook
 * Manages filter state with helpers for common operations
 */

import { useState, useCallback, useReducer } from 'react';

export interface FilterState {
  [key: string]: string | boolean | number;
}

export interface UseFiltersReturn<T extends FilterState> {
  filters: T;
  setFilter: (key: keyof T, value: any) => void;
  setFilters: (newFilters: Partial<T>) => void;
  resetFilters: () => void;
  clearFilter: (key: keyof T) => void;
  hasActiveFilters: boolean;
}

/**
 * Custom hook for managing filter state
 * @param initialFilters - Initial filter values
 * @returns Filter state and management methods
 */
export function useFilters<T extends FilterState>(
  initialFilters: T
): UseFiltersReturn<T> {
  const [filters, setFiltersState] = useState<T>(initialFilters);

  const setFilter = useCallback(
    (key: keyof T, value: any) => {
      setFiltersState(prev => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  const setFilters = useCallback((newFilters: Partial<T>) => {
    setFiltersState(prev => ({
      ...prev,
      ...newFilters,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(initialFilters);
  }, [initialFilters]);

  const clearFilter = useCallback((key: keyof T) => {
    setFiltersState(prev => ({
      ...prev,
      [key]: initialFilters[key],
    }));
  }, [initialFilters]);

  // Check if any filter differs from initial value
  const hasActiveFilters = Object.keys(filters).some(
    key => filters[key as keyof T] !== initialFilters[key as keyof T]
  );

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    clearFilter,
    hasActiveFilters,
  };
}

/**
 * Advanced hook using reducer for complex filter logic
 * Useful when filters have interdependencies or complex updates
 */
export function useFiltersReducer<T extends FilterState>(
  initialFilters: T,
  reducer?: (state: T, action: any) => T
) {
  const defaultReducer = (state: T, action: any) => {
    switch (action.type) {
      case 'SET_FILTER':
        return { ...state, [action.key]: action.value };
      case 'SET_FILTERS':
        return { ...state, ...action.payload };
      case 'RESET':
        return initialFilters;
      case 'CLEAR':
        return { ...state, [action.key]: initialFilters[action.key] };
      default:
        return state;
    }
  };

  const [filters, dispatch] = useReducer(
    reducer || defaultReducer,
    initialFilters
  );

  const setFilter = useCallback((key: keyof T, value: any) => {
    dispatch({ type: 'SET_FILTER', key, value });
  }, []);

  const setFilters = useCallback((newFilters: Partial<T>) => {
    dispatch({ type: 'SET_FILTERS', payload: newFilters });
  }, []);

  const resetFilters = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const clearFilter = useCallback((key: keyof T) => {
    dispatch({ type: 'CLEAR', key });
  }, []);

  const hasActiveFilters = Object.keys(filters).some(
    key => filters[key as keyof T] !== initialFilters[key as keyof T]
  );

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    clearFilter,
    hasActiveFilters,
    dispatch,
  };
}
