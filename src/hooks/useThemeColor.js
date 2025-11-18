// src/hooks/useThemeColor.js
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook untuk mengubah theme-color secara dinamis
 * berdasarkan halaman/route yang aktif
 */
export const useThemeColor = () => {
  const location = useLocation();

  useEffect(() => {
    // Ambil meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    
    // Tentukan warna berdasarkan route
    let themeColor = '#ffffff'; // Default: putih (background app)
    
    // Landing page dan halaman public - gradient navbar
    if (location.pathname === '/' || 
        location.pathname === '/berita' || 
        location.pathname.startsWith('/berita/')) {
      themeColor = '#112642'; // Biru tua navbar
    }
    // Dashboard pages - white background
    else if (location.pathname.startsWith('/dashboard') ||
             location.pathname.startsWith('/core-dashboard') ||
             location.pathname.startsWith('/desa-dashboard')) {
      themeColor = '#ffffff'; // Putih (background dashboard)
    }
    // Login page - gradient background
    else if (location.pathname === '/login') {
      themeColor = '#112642'; // Biru tua
    }
    
    // Update meta tag
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeColor);
    }
    
    // Update manifest theme_color juga (opsional, untuk PWA)
    // Ini tidak akan mengubah file manifest, tapi akan override di runtime
    
  }, [location.pathname]);
};
