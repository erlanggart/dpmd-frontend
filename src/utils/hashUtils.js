/**
 * Safe hash generation utility for Unicode data
 * Replaces btoa() which fails with non-Latin1 characters
 */

export const generateSafeHash = (data, length = 10) => {
  try {
    // Safe encoding for Unicode characters
    const jsonString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataArray = encoder.encode(jsonString);
    
    // Create simple hash from array buffer
    let hash = 0;
    const maxLength = Math.min(dataArray.length, 2000); // Limit for performance
    
    for (let i = 0; i < maxLength; i++) {
      hash = ((hash << 5) - hash + dataArray[i]) & 0xffffffff;
    }
    
    // Convert to base36 and ensure positive number
    const hashString = Math.abs(hash).toString(36);
    
    // Pad with additional entropy if too short
    if (hashString.length < length) {
      const extraEntropy = Date.now().toString(36);
      return (hashString + extraEntropy).slice(0, length);
    }
    
    return hashString.slice(0, length);
  } catch (error) {
    console.warn('⚠️ Safe Hash: Generation fallback to timestamp');
    return Date.now().toString(36).slice(-Math.max(length, 8));
  }
};

export const generateSafeDataHash = (data) => generateSafeHash(data, 10);
export const generateSafeDataHashLong = (data) => generateSafeHash(data, 16);

export default {
  generateSafeHash,
  generateSafeDataHash,
  generateSafeDataHashLong
};