/**
 * Avatar URL Utility Functions
 * Handles proper avatar URL construction for different environments
 */

/**
 * Get the base URL for avatar storage
 * @returns {string} Base URL for avatar storage
 */
export const getAvatarBaseUrl = () => {
  // In production, use the API domain without /api suffix
  if (import.meta.env.PROD) {
    return 'https://api.dpmdbogorkab.id';
  }
  
  // In development, use local server
  return 'http://127.0.0.1:3001';
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
