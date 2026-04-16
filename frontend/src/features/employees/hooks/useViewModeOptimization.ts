import { useState, useCallback, useRef, useEffect } from 'react';

interface UseViewModeOptimizationOptions {
  onViewChange?: (mode: 'list' | 'skill' | 'update-skills') => void;
  debounceMs?: number;
}

/**
 * Custom hook to optimize view mode switching with debouncing
 * Prevents hanging when switching between List/Skill-Wise/Update Skills views
 * Reusable across features for consistent performance optimization
 */
export function useViewModeOptimization(options: UseViewModeOptimizationOptions = {}) {
  const { onViewChange, debounceMs = 300 } = options;
  
  const [viewMode, setViewMode] = useState<'list' | 'skill' | 'update-skills'>('list');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Debounced view mode change handler
   * Prevents rapid consecutive switches that cause performance issues
   */
  const handleViewModeChange = useCallback((newMode: 'list' | 'skill' | 'update-skills') => {
    // Clear any pending transitions
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    // Prevent switching to same mode
    if (newMode === viewMode) return;

    // Mark as transitioning
    setIsTransitioning(true);

    // Debounce the actual change
    transitionTimeoutRef.current = setTimeout(() => {
      setViewMode(newMode);
      setIsTransitioning(false);
      onViewChange?.(newMode);
    }, debounceMs);
  }, [viewMode, debounceMs, onViewChange]);

  /**
   * Force immediate mode change (for manual user actions)
   */
  const forceViewModeChange = useCallback((newMode: 'list' | 'skill' | 'update-skills') => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    setViewMode(newMode);
    setIsTransitioning(false);
    onViewChange?.(newMode);
  }, [onViewChange]);

  /**
   * Cleanup timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  return {
    viewMode,
    isTransitioning,
    handleViewModeChange,
    forceViewModeChange,
  };
}
