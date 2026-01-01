/**
 * Master Data Cache Utility
 * Provides centralized caching for dropdown master data with TTL and memory management
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheConfig {
  defaultTTL: number; // Time to live in milliseconds
  maxSize: number;    // Maximum number of cache entries
}

class MasterDataCache {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig = {
    defaultTTL: 15 * 60 * 1000, // 15 minutes default TTL
    maxSize: 50 // Maximum 50 cached entries
  };

  /**
   * Get cached data if available and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set data in cache with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // If cache is at max size, remove oldest entry
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL
    });
  }

  /**
   * Check if data exists in cache and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove specific entry from cache
   */
  remove(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Create singleton instance
export const masterDataCache = new MasterDataCache();

// Cache key generators for different data types
export const CacheKeys = {
  allergens: () => 'allergens',
  categories: () => 'categories',
  subCategories: (categoryId?: number) => 
    categoryId ? `subcategories_${categoryId}` : 'subcategories_all',
  distributors: () => 'distributors',
  districts: (roleId?: number, districtId?: number) => 
    roleId && districtId ? `districts_${roleId}_${districtId}` : 'districts_all',
  schoolDistricts: () => 'school-districts',
  schoolCoops: (roleId?: number, districtId?: number) => 
    roleId && districtId ? `schoolcoops_${roleId}_${districtId}` : 'schoolcoops_all',
  manufacturers: () => 'manufacturers',
  iocCategories: () => 'ioc-categories',
  roles: () => 'roles',
  states: () => 'states',
  storageTypes: () => 'storage-types',
  ingredients: () => 'ingredients',
  
  // Generic key generator for custom cache keys
  custom: (type: string, ...params: (string | number)[]) => 
    `${type}_${params.join('_')}`
} as const;

// Export types for use in components
export type CacheKey = string;
export type CachedData<T> = T | null;