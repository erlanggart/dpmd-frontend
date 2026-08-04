/**
 * Avatar URL Utility Functions
 * Handles proper avatar URL construction for different environments
 */

/**
 * Get the base URL for avatar storage
 * @returns {string} Base URL for avatar storage
 */
export const getAvatarBaseUrl = () => {
  // Selalu ikut host yang sedang dibuka. Jangan hardcode domain — frontend dan
  // backend disajikan dari origin yang sama lewat nginx, dan domain sempat berpindah
  // (dpmdbogorkab.id → dpmd.bogorkab.go.id). Saat dev pun benar, karena Vite
  // mem-proxy /storage ke backend (lihat server.proxy di vite.config.js), jadi ini
  // juga tetap jalan saat diuji dari HP di jaringan lokal.
  //
  // JANGAN kembalikan cabang `import.meta.env.PROD ? origin : '127.0.0.1:3001'`:
  // sekali `npm run build` dijalankan dengan NODE_ENV bukan 'production', PROD
  // bernilai false dan seluruh avatar di produksi menunjuk localhost pengguna
  // (ERR_CONNECTION_REFUSED). Itu insiden 4 Agustus 2026.
  return window.location.origin;
};

/**
 * Convert avatar path to full URL
 * @param {string|null} avatarPath - Avatar path from database (e.g., /storage/avatars/avatar-123.png)
 * @returns {string|null} Full avatar URL or null if no avatar
 */
export const getAvatarUrl = (avatarPath) => {
  if (!avatarPath) return null;
  
  // If already a full URL, return as-is
  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
    return avatarPath;
  }
  
  // Construct full URL
  const baseUrl = getAvatarBaseUrl();
  
  // Ensure avatarPath starts with /
  const path = avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`;
  
  return `${baseUrl}${path}`;
};

/**
 * Get avatar URL for user object
 * @param {object} user - User object with avatar property
 * @returns {string|null} Full avatar URL or null
 */
export const getUserAvatarUrl = (user) => {
  return user?.avatar ? getAvatarUrl(user.avatar) : null;
};
