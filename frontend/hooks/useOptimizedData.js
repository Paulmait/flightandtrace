/**
 * FlightTrace Performance-Optimized Hooks
 *
 * Custom hooks with memoization, caching, and performance optimizations.
 */

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { AppState, InteractionManager } from 'react-native';
import pollingManager, { PRIORITY, usePolling } from '../utils/pollingManager';

/**
 * Debounced value hook
 * Delays updating value until after wait milliseconds have elapsed
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Throttled callback hook
 * Ensures callback is called at most once per interval
 */
export function useThrottle(callback, delay = 300) {
  const lastCall = useRef(0);
  const lastResult = useRef(null);

  return useCallback(
    (...args) => {
      const now = Date.now();
      if (now - lastCall.current >= delay) {
        lastCall.current = now;
        lastResult.current = callback(...args);
      }
      return lastResult.current;
    },
    [callback, delay]
  );
}

/**
 * Previous value hook
 * Returns the previous value of a variable
 */
export function usePrevious(value) {
  const ref = useRef();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Lazy loading hook
 * Defers expensive operations until after interactions complete
 */
export function useLazyLoad(loadFn, deps = []) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    // Wait for interactions to complete before loading
    InteractionManager.runAfterInteractions(async () => {
      try {
        const result = await loadFn();
        if (isMounted) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, deps);

  return { data, isLoading, error };
}

/**
 * Cached fetch hook
 * Fetches data with caching and stale-while-revalidate strategy
 */
export function useCachedFetch(key, fetchFn, options = {}) {
  const {
    ttl = 60000, // 1 minute default
    staleTime = 30000, // 30 seconds
    enabled = true,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const cache = useRef(new Map());

  const isStale = useMemo(() => {
    if (!lastUpdated) return true;
    return Date.now() - lastUpdated > staleTime;
  }, [lastUpdated, staleTime]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;

    // Check cache first
    const cached = cache.current.get(key);
    if (cached && !forceRefresh) {
      const { data: cachedData, timestamp } = cached;
      const age = Date.now() - timestamp;

      if (age < ttl) {
        setData(cachedData);
        setLastUpdated(timestamp);
        setIsLoading(false);

        // Revalidate in background if stale
        if (age > staleTime) {
          setIsRefetching(true);
        } else {
          return;
        }
      }
    }

    // Fetch fresh data
    try {
      const freshData = await fetchFn();

      // Update cache
      cache.current.set(key, {
        data: freshData,
        timestamp: Date.now(),
      });

      setData(freshData);
      setLastUpdated(Date.now());
      setError(null);
      onSuccess?.(freshData);
    } catch (err) {
      setError(err);
      onError?.(err);
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  }, [key, fetchFn, ttl, staleTime, enabled, onSuccess, onError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    setIsRefetching(true);
    return fetchData(true);
  }, [fetchData]);

  const invalidate = useCallback(() => {
    cache.current.delete(key);
    return fetchData(true);
  }, [key, fetchData]);

  return {
    data,
    isLoading,
    isRefetching,
    error,
    isStale,
    lastUpdated,
    refetch,
    invalidate,
  };
}

/**
 * Optimized flight list hook
 * Handles pagination, filtering, and sorting efficiently
 */
export function useFlightList(fetchFn, options = {}) {
  const {
    pageSize = 20,
    initialFilters = {},
    sortKey = 'callsign',
    sortOrder = 'asc',
  } = options;

  const [flights, setFlights] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState(initialFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Debounce filters
  const debouncedFilters = useDebounce(filters, 300);

  // Memoized sorted and filtered flights
  const processedFlights = useMemo(() => {
    let result = [...flights];

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortKey] || '';
      const bVal = b[sortKey] || '';
      const comparison = String(aVal).localeCompare(String(bVal));
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [flights, sortKey, sortOrder]);

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchFn({
        page: 1,
        pageSize,
        filters: debouncedFilters,
      });

      setFlights(data.flights || []);
      setHasMore((data.flights?.length || 0) >= pageSize);
      setPage(1);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, pageSize, debouncedFilters]);

  // Fetch more data (pagination)
  const fetchMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;

    setIsLoadingMore(true);

    try {
      const nextPage = page + 1;
      const data = await fetchFn({
        page: nextPage,
        pageSize,
        filters: debouncedFilters,
      });

      const newFlights = data.flights || [];
      setFlights((prev) => [...prev, ...newFlights]);
      setHasMore(newFlights.length >= pageSize);
      setPage(nextPage);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchFn, page, pageSize, hasMore, isLoadingMore, debouncedFilters]);

  // Refresh data
  const refresh = useCallback(async () => {
    await fetchInitialData();
  }, [fetchInitialData]);

  // Update filters
  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  // Initial fetch and refetch on filter change
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  return {
    flights: processedFlights,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    page,
    filters,
    fetchMore,
    refresh,
    updateFilters,
    resetFilters,
  };
}

/**
 * Real-time flight tracking hook
 * Combines polling with optimistic updates
 */
export function useFlightTracking(flightId, options = {}) {
  const { interval = 5000, enabled = true } = options;

  const [flight, setFlight] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const { refresh, isLoading: isPolling } = usePolling(
    `flight-${flightId}`,
    async () => {
      const { fetchFlightById } = require('../utils/api');
      const data = await fetchFlightById(flightId);

      setFlight(data);

      // Add to history if position changed
      if (data.latitude && data.longitude) {
        setHistory((prev) => {
          const lastPoint = prev[prev.length - 1];
          if (
            !lastPoint ||
            lastPoint.lat !== data.latitude ||
            lastPoint.lng !== data.longitude
          ) {
            return [
              ...prev.slice(-100), // Keep last 100 points
              {
                lat: data.latitude,
                lng: data.longitude,
                alt: data.altitude,
                ts: Date.now(),
              },
            ];
          }
          return prev;
        });
      }

      setIsLoading(false);
    },
    {
      priority: PRIORITY.HIGH,
      allowCellular: true,
    }
  );

  // Reset on flight change
  useEffect(() => {
    setHistory([]);
    setIsLoading(true);
  }, [flightId]);

  return {
    flight,
    history,
    isLoading: isLoading || isPolling,
    error,
    refresh,
  };
}

/**
 * App state aware hook
 * Pauses/resumes operations based on app state
 */
export function useAppStateAware(onForeground, onBackground) {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        onForeground?.();
      } else if (nextState.match(/inactive|background/)) {
        onBackground?.();
      }

      appState.current = nextState;
    });

    return () => subscription?.remove();
  }, [onForeground, onBackground]);

  return appState.current;
}

/**
 * Mount state hook
 * Safely check if component is still mounted
 */
export function useMountedState() {
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return useCallback(() => mountedRef.current, []);
}

/**
 * Safe state setter
 * Only updates state if component is mounted
 */
export function useSafeState(initialValue) {
  const [state, setState] = useState(initialValue);
  const isMounted = useMountedState();

  const setSafeState = useCallback(
    (value) => {
      if (isMounted()) {
        setState(value);
      }
    },
    [isMounted]
  );

  return [state, setSafeState];
}

/**
 * Intersection observer hook for lazy loading
 */
export function useInView(options = {}) {
  const [isInView, setIsInView] = useState(false);
  const [hasBeenInView, setHasBeenInView] = useState(false);
  const ref = useRef(null);

  // For React Native, we use a simpler visibility approach
  const onLayout = useCallback(() => {
    setIsInView(true);
    setHasBeenInView(true);
  }, []);

  return {
    ref,
    isInView,
    hasBeenInView,
    onLayout,
  };
}

export default {
  useDebounce,
  useThrottle,
  usePrevious,
  useLazyLoad,
  useCachedFetch,
  useFlightList,
  useFlightTracking,
  useAppStateAware,
  useMountedState,
  useSafeState,
  useInView,
};
