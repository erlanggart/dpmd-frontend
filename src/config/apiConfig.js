// API Configuration - All routes now use Express backend
// Auto-detect development vs production
const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';

export const API_ENDPOINTS = {
  // Express Backend - use env variable or default based on environment
  EXPRESS_BASE: import.meta.env.VITE_API_BASE_URL || 
    (isDevelopment ? 'http://localhost:3001/api' : 'https://api.dpmdbogorkab.id/api'),
};

/**
 * Get the base URL for all endpoints (Express only)
 * @param {string} endpoint - The API endpoint path
 * @returns {string} - The Express base URL
 */
export const getBaseURL = (endpoint) => {
  return API_ENDPOINTS.EXPRESS_BASE;
};

/**
 * All endpoints now use Express
 * @param {string} endpoint - The API endpoint path
 * @returns {boolean}
 */
export const isExpressEndpoint = (endpoint) => {
  return true; // All endpoints are Express now
};
