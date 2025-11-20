// API Configuration - All routes now use Express backend
const isDevelopment = import.meta.env.DEV;

export const API_ENDPOINTS = {
  // Express Backend (Port 3001) - ONLY BACKEND
  EXPRESS_BASE: isDevelopment 
    ? 'http://127.0.0.1:3001/api'
    : 'https://api.dpmdbogorkab.id/api',
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
