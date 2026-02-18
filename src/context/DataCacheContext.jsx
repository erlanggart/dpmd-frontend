// src/context/DataCacheContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';

const DataCacheContext = createContext();

// Default TTL: 5 menit (dalam ms)
const DEFAULT_TTL = 5 * 60 * 1000;

export const useDataCache = () => {
  const context = useContext(DataCacheContext);
  if (!context) {
    throw new Error('useDataCache must be used within DataCacheProvider');
  }
  return context;
};

export const DataCacheProvider = ({ children }) => {
  const [cache, setCache] = useState({});
  const [loadingStates, setLoadingStates] = useState({});

  const getCachedData = useCallback((key) => {
    return cache[key];
  }, [cache]);

  const setCachedData = useCallback((key, data) => {
    setCache(prev => ({
      ...prev,
      [key]: {
        data,
        timestamp: Date.now()
      }
    }));
  }, []);

  // Cek cache dengan TTL — data expired otomatis dihapus
  const isCached = useCallback((key, ttl = DEFAULT_TTL) => {
    const entry = cache[key];
    if (!entry) return false;
    if (Date.now() - entry.timestamp > ttl) {
      // Expired — hapus dari cache
      setCache(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return false;
    }
    return true;
  }, [cache]);

  const clearCache = useCallback((key) => {
    if (key) {
      setCache(prev => {
        const newCache = { ...prev };
        delete newCache[key];
        return newCache;
      });
    } else {
      setCache({});
    }
  }, []);

  const setLoading = useCallback((key, isLoading) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: isLoading
    }));
  }, []);

  const isLoading = useCallback((key) => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  const value = {
    getCachedData,
    setCachedData,
    isCached,
    clearCache,
    setLoading,
    isLoading,
  };

  return (
    <DataCacheContext.Provider value={value}>
      {children}
    </DataCacheContext.Provider>
  );
};
