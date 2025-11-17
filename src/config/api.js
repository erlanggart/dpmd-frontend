// API Configuration - Express backend only
const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api',
  
  // Storage URL for Express backend uploads
  STORAGE_URL: `${import.meta.env.VITE_IMAGE_BASE_URL || 'http://127.0.0.1:3001'}/uploads`,
};

export default API_CONFIG;
