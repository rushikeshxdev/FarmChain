const logger = require('../config/logger');

// In-memory cache store (consider using Redis in production)
const cacheStore = new Map();
const CACHE_TTL = {
  analytics: 5 * 60 * 1000, // 5 minutes
  verification: 10 * 60 * 1000, // 10 minutes
};

/**
 * Generate cache key from request
 */
const generateCacheKey = (req, prefix = '') => {
  const userId = req.user?.userId || 'anonymous';
  const queryString = JSON.stringify(req.query);
  const params = JSON.stringify(req.params);
  return `${prefix}:${userId}:${queryString}:${params}`;
};

/**
 * Check if cached data exists and is valid
 */
const getFromCache = (key) => {
  const cached = cacheStore.get(key);
  
  if (!cached) {
    return null;
  }
  
  // Check if cache has expired
  if (Date.now() > cached.expiry) {
    cacheStore.delete(key);
    return null;
  }
  
  return cached.data;
};

/**
 * Store data in cache with TTL
 */
const setInCache = (key, data, ttl) => {
  cacheStore.set(key, {
    data,
    expiry: Date.now() + ttl
  });
};

/**
 * Clear cache by pattern
 */
const clearCacheByPattern = (pattern) => {
  const keys = Array.from(cacheStore.keys());
  const matchingKeys = keys.filter(key => key.includes(pattern));
  matchingKeys.forEach(key => cacheStore.delete(key));
  logger.info(`Cleared ${matchingKeys.length} cache entries matching pattern: ${pattern}`);
};

// ============================================================
// Analytics Cache Middleware
// ============================================================

/**
 * Check analytics cache before processing request
 */
const checkAnalyticsCache = (req, res, next) => {
  try {
    const cacheKey = generateCacheKey(req, 'analytics');
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      logger.info(`Analytics cache hit: ${cacheKey}`);
      return res.status(200).json({
        status: 'success',
        cached: true,
        data: cached
      });
    }
    
    // Store cache key in request for later use
    req.cacheKey = cacheKey;
    next();
  } catch (error) {
    logger.error('Analytics cache check error:', error);
    next(); // Continue without cache on error
  }
};

/**
 * Store analytics result in cache
 */
const storeAnalyticsResult = (req, res, next) => {
  // Intercept the response to cache it
  const originalJson = res.json.bind(res);
  
  res.json = (data) => {
    try {
      if (req.cacheKey && data.status === 'success') {
        setInCache(req.cacheKey, data.data, CACHE_TTL.analytics);
        logger.info(`Stored analytics result in cache: ${req.cacheKey}`);
      }
    } catch (error) {
      logger.error('Error storing analytics cache:', error);
    }
    
    return originalJson(data);
  };
  
  next();
};

// ============================================================
// Verification Cache Middleware
// ============================================================

/**
 * Check verification cache before processing request
 */
const checkVerificationCache = (req, res, next) => {
  try {
    const batchId = req.params.batchId;
    const cacheKey = `verification:${batchId}`;
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      logger.info(`Verification cache hit: ${cacheKey}`);
      return res.status(200).json({
        status: 'success',
        cached: true,
        data: cached
      });
    }
    
    // Store cache key in request for later use
    req.cacheKey = cacheKey;
    next();
  } catch (error) {
    logger.error('Verification cache check error:', error);
    next(); // Continue without cache on error
  }
};

/**
 * Store verification result in cache
 */
const storeVerificationResult = (req, res, next) => {
  // Intercept the response to cache it
  const originalJson = res.json.bind(res);
  
  res.json = (data) => {
    try {
      if (req.cacheKey && data.status === 'success') {
        setInCache(req.cacheKey, data.data, CACHE_TTL.verification);
        logger.info(`Stored verification result in cache: ${req.cacheKey}`);
      }
    } catch (error) {
      logger.error('Error storing verification cache:', error);
    }
    
    return originalJson(data);
  };
  
  next();
};

// ============================================================
// Cache Management Functions
// ============================================================

/**
 * Clear all cache
 */
const clearAllCache = () => {
  const size = cacheStore.size;
  cacheStore.clear();
  logger.info(`Cleared all cache: ${size} entries`);
  return size;
};

/**
 * Get cache statistics
 */
const getCacheStats = () => {
  const entries = Array.from(cacheStore.entries());
  const now = Date.now();
  
  return {
    totalEntries: cacheStore.size,
    validEntries: entries.filter(([_, value]) => now < value.expiry).length,
    expiredEntries: entries.filter(([_, value]) => now >= value.expiry).length,
    analyticsEntries: entries.filter(([key]) => key.startsWith('analytics:')).length,
    verificationEntries: entries.filter(([key]) => key.startsWith('verification:')).length
  };
};

module.exports = {
  checkAnalyticsCache,
  storeAnalyticsResult,
  checkVerificationCache,
  storeVerificationResult,
  clearCacheByPattern,
  clearAllCache,
  getCacheStats
};
