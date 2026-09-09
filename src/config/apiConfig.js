// API Configuration - All routes now use Express backend
// Auto-detect development vs production
const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';

// Apakah halaman ini dibuka DI komputer yang menjalankan server, atau dari
// perangkat lain di jaringan yang sama?
//
// Pembedaan ini menentukan, dan pernah membuat seluruh aplikasi tampak rusak di
// HP: 'http://localhost:3001' yang di laptop menunjuk backend, di HP menunjuk
// HP ITU SENDIRI — yang tidak menjalankan apa pun. Setiap panggilan API gagal,
// dan gejalanya terbaca sebagai "fiturnya cuma jalan di komputer".
//
// Vite sudah disetel host: true dan punya proxy '/api' ke localhost:3001 (lihat
// vite.config.js), jadi dari perangkat lain jalur yang benar adalah '/api'
// relatif — biarkan dev server yang meneruskannya.
const diMesinSendiri = typeof window !== 'undefined'
  && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);

export const API_ENDPOINTS = {
  // Express Backend - use env variable or default based on environment
  // Produksi memakai '/api' relatif, bukan domain absolut: origin-nya sama dengan
  // halaman yang dibuka, jadi perpindahan domain tidak menyentuh file ini.
  EXPRESS_BASE: import.meta.env.VITE_API_BASE_URL ||
    (isDevelopment && diMesinSendiri ? 'http://localhost:3001/api' : '/api'),
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
