import { useState, useEffect } from 'react';

// Custom hook untuk localStorage dengan error handling
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  const removeValue = () => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue, removeValue];
};

// Hook khusus untuk file localStorage dengan validasi
export const useFileLocalStorage = (key) => {
  const [fileInfo, setFileInfoState] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : {};
    } catch (error) {
      console.warn(`Error reading file localStorage key "${key}":`, error);
      return {};
    }
  });

  const setFileInfo = (fieldName, file) => {
    try {
      if (file) {
        const fileData = {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          // Store timestamp when file was selected
          selectedAt: Date.now()
        };
        
        const updatedFileInfo = {
          ...fileInfo,
          [fieldName]: fileData
        };
        
        setFileInfoState(updatedFileInfo);
        window.localStorage.setItem(key, JSON.stringify(updatedFileInfo));
      } else {
        // Remove file info if null
        const updatedFileInfo = { ...fileInfo };
        delete updatedFileInfo[fieldName];
        setFileInfoState(updatedFileInfo);
        window.localStorage.setItem(key, JSON.stringify(updatedFileInfo));
      }
    } catch (error) {
      console.warn(`Error setting file localStorage:`, error);
    }
  };

  const removeFileInfo = (fieldName) => {
    try {
      const updatedFileInfo = { ...fileInfo };
      delete updatedFileInfo[fieldName];
      setFileInfoState(updatedFileInfo);
      window.localStorage.setItem(key, JSON.stringify(updatedFileInfo));
    } catch (error) {
      console.warn(`Error removing file localStorage:`, error);
    }
  };

  const clearAllFiles = () => {
    try {
      setFileInfoState({});
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Error clearing file localStorage:`, error);
    }
  };

  // Validate if stored file info is still relevant (not too old)
  const isFileInfoValid = (fieldName, maxAgeHours = 24) => {
    const file = fileInfo[fieldName];
    if (!file || !file.selectedAt) return false;
    
    const ageInHours = (Date.now() - file.selectedAt) / (1000 * 60 * 60);
    return ageInHours < maxAgeHours;
  };

  return [fileInfo, setFileInfo, removeFileInfo, clearAllFiles, isFileInfoValid];
};