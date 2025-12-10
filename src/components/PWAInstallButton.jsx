// src/components/PWAInstallButton.jsx
import React, { useEffect, useState } from 'react';
import { FiDownload } from 'react-icons/fi';

const PWAInstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  useEffect(() => {
    console.log('[PWA] Component mounted');
    
    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone 
      || document.referrer.includes('android-app://');

    console.log('[PWA] Is standalone:', isStandalone);

    if (isStandalone) {
      console.log('[PWA] App already installed');
      return;
    }

    // Detect mobile or tablet device
    const checkMobileOrTablet = () => {
      const ua = navigator.userAgent;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      const isTablet = /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua);
      return isMobile || isTablet;
    };

    const isMobileDevice = checkMobileOrTablet();
    setIsMobileOrTablet(isMobileDevice);
    console.log('[PWA] Is mobile/tablet:', isMobileDevice);

    const handler = (e) => {
      console.log('[PWA] beforeinstallprompt event fired', e);
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    console.log('[PWA] Event listener added');

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      console.log('[PWA] Event listener removed');
    };
  }, []);

  const handleInstall = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[PWA] Install button clicked');
    console.log('[PWA] deferredPrompt available:', !!deferredPrompt);

    if (!deferredPrompt) {
      console.warn('[PWA] No install prompt available');
      alert('Install prompt belum tersedia. Pastikan:\n1. Menggunakan HTTPS\n2. Ada manifest.json\n3. Ada service worker\n4. Browser mendukung PWA install');
      return;
    }

    try {
      console.log('[PWA] Showing install prompt');
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;

      console.log(`[PWA] User response: ${outcome}`);

      if (outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt');
      } else {
        console.log('[PWA] User dismissed the install prompt');
      }

      // Clear the deferredPrompt and hide button
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error('[PWA] Error during install:', error);
      alert('Gagal menginstall aplikasi. Silakan coba lagi.');
    }
  };

  // Show button if:
  // 1. PWA is installable (beforeinstallprompt fired) OR
  // 2. User is on mobile/tablet device (always show for awareness)
  if (!isInstallable && !isMobileOrTablet) return null;

  return (
    <button
      onClick={handleInstall}
      disabled={!deferredPrompt}
      className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 w-full lg:w-auto touch-manipulation active:scale-95 ${
        deferredPrompt 
          ? 'bg-secondary hover:bg-secondary/90 text-white shadow-md hover:shadow-lg cursor-pointer pointer-events-auto' 
          : 'bg-gray-400 text-gray-200 cursor-not-allowed'
      }`}
      style={{ WebkitTapHighlightColor: 'transparent' }}
      title={deferredPrompt ? 'Install Aplikasi' : 'Gunakan browser yang mendukung PWA'}
    >
      <FiDownload className="w-4 h-4" />
      <span className="lg:hidden">Install Aplikasi</span>
      <span className="hidden lg:inline">Install App</span>
    </button>
  );
};


export default PWAInstallButton;
