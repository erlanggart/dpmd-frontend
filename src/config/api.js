// API Configuration - Menggunakan konfigurasi environment yang sudah ada
const API_CONFIG = {
  // Menggunakan VITE_API_BASE_URL dari file .env (dpmd.test untuk dev, dpmdbogorkab.id untuk prod)
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  
  // Storage URL menggunakan VITE_IMAGE_BASE_URL + /storage (sesuai backend Laravel)
  STORAGE_URL: (import.meta.env.VITE_IMAGE_BASE_URL || 'http://localhost:8000') + '/storage',
};

export default API_CONFIG;
