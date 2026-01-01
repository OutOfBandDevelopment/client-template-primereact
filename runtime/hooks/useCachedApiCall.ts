import { useState, useEffect, useCallback } from 'react';
import { masterDataCache, CacheKey } from '@/utils/masterDataCache';

interface UseCachedApiCallOptions {
  enabled?: boolean;
  ttl?: number; // Time to live in milliseconds
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

/**
 * Custom hook for cached API calls with automatic caching and loading states
 */
export function useCachedApiCall<T>(
  cacheKey: CacheKey,
  apiCall: () => Promise<T>,
  options: UseCachedApiCallOptions = {}
) {
  const { enabled = true, ttl, onSuccess, onError } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = masterDataCache.get<T>(cacheKey);
      if (cachedData) {
        setData(cachedData);
        setError(null);
        onSuccess?.(cachedData);
        return cachedData;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const result = await apiCall();
      
      // Cache the result
      masterDataCache.set(cacheKey, result, ttl);
      
      setData(result);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [cacheKey, apiCall, enabled, ttl, onSuccess, onError]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Manual refresh function
  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  // Clear cache for this key
  const clearCache = useCallback(() => {
    masterDataCache.remove(cacheKey);
  }, [cacheKey]);

  return {
    data,
    loading,
    error,
    refresh,
    clearCache
  };
}