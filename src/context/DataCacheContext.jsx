// src/context/DataCacheContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';

const DataCacheContext = createContext();

export const useDataCache = () => {
  const context = useContext(DataCacheContext);
  if (!context) {
    throw new Error('useDataCache must be used within DataCacheProvider');
  }
  return context;
};

export const DataCacheProvider = ({ children }) => {
  // Cache untuk menyimpan data dari setiap halaman dashboard
  const [cache, setCache] = useState({});
  
  // Loading states untuk setiap halaman
  const [loadingStates, setLoadingStates] = useState({});

  // Fungsi untuk mendapatkan data dari cache
  const getCachedData = useCallback((key) => {
    return cache[key];
  }, [cache]);

  // Fungsi untuk menyimpan data ke cache
  const setCachedData = useCallback((key, data) => {
    setCache(prev => ({
      ...prev,
      [key]: {
        data,
        timestamp: Date.now()
      }
    }));
  }, []);

  // Fungsi untuk mengecek apakah data sudah ada di cache
  const isCached = useCallback((key) => {
    return !!cache[key];
  }, [cache]);

  // Fungsi untuk menghapus data dari cache (jika diperlukan refresh manual)
  const clearCache = useCallback((key) => {
    if (key) {
      setCache(prev => {
        const newCache = { ...prev };
        delete newCache[key];
        return newCache;
      });
    } else {
      // Clear all cache
      setCache({});
    }
  }, []);

  // Fungsi untuk set loading state
  const setLoading = useCallback((key, isLoading) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: isLoading
    }));
  }, []);

  // Fungsi untuk get loading state
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
