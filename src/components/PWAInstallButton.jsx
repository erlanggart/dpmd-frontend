// src/components/PWAInstallButton.jsx
import React, { useEffect, useState } from 'react';
import { FiDownload, FiCheck } from 'react-icons/fi';

const PWAInstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const [isAlreadyInstalled, setIsAlreadyInstalled] = useState(false);

  useEffect(() => {
    console.log('[PWA] Component mounted');
    
    // Function to check if app is already installed
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
        || window.navigator.standalone 
        || document.referrer.includes('android-app://');
      return isStandalone;
    };

    const installed = checkIfInstalled();
    console.log('[PWA] Is app installed:', installed);
    setIsAlreadyInstalled(installed);

    // If already installed, show the button in "installed" state
    if (installed) {
      console.log('[PWA] App already installed - showing installed state button');
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
    
    // Also listen for app installed event
    const installedHandler = () => {
      console.log('[PWA] App was installed');
      setIsAlreadyInstalled(true);
      setDeferredPrompt(null);
      setIsInstallable(false);
    };
    
    window.addEventListener('appinstalled', installedHandler);
    console.log('[PWA] Event listeners added');

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
      console.log('[PWA] Event listeners removed');
    };
  }, []);

  const handleInstall = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[PWA] Install button clicked');
    
    // Double-check if app is already installed (real-time check)
    const isCurrentlyInstalled = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone 
      || document.referrer.includes('android-app://');
    
    console.log('[PWA] Real-time install check:', isCurrentlyInstalled);
    console.log('[PWA] State isAlreadyInstalled:', isAlreadyInstalled);
    console.log('[PWA] deferredPrompt available:', !!deferredPrompt);

    // Check if already installed (use real-time check)
    if (isCurrentlyInstalled || isAlreadyInstalled) {
      alert('✅ Aplikasi Sudah Terinstall!\n\nAnda sudah menginstall aplikasi ini sebelumnya.\nAnda dapat mengaksesnya dari home screen atau daftar aplikasi.');
      
      // Update state if not yet updated
      if (!isAlreadyInstalled) {
        setIsAlreadyInstalled(true);
      }
      return;
    }

    if (!deferredPrompt) {
      console.warn('[PWA] No install prompt available - this should not happen as button should be hidden');
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
        alert('✅ Aplikasi berhasil diinstall!\n\nAnda dapat mengaksesnya dari home screen atau daftar aplikasi.');
        setIsAlreadyInstalled(true);
      } else {
        console.log('[PWA] User dismissed the install prompt');
      }

      // Clear the deferredPrompt and hide button
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error('[PWA] Error during install:', error);
      alert('❌ Gagal menginstall aplikasi. Silakan coba lagi atau gunakan menu browser untuk install.');
    }
  };

  // Show button ONLY if:
  // 1. PWA is installable (beforeinstallprompt fired and deferredPrompt exists) OR
  // 2. App is already installed (show with installed state)
  // Do NOT show button if just on mobile without install prompt available
  if (!isInstallable && !isAlreadyInstalled) return null;

  return (
    <button
      onClick={handleInstall}
      className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 w-full lg:w-auto touch-manipulation active:scale-95 ${
        isAlreadyInstalled
          ? 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
          : 'bg-secondary hover:bg-secondary/90 text-white shadow-md hover:shadow-lg'
      }`}
      title={
        isAlreadyInstalled 
          ? 'Klik untuk melihat status instalasi' 
          : 'Klik untuk install aplikasi ke perangkat Anda'
      }
    >
      {isAlreadyInstalled ? (
        <>
          <FiCheck className="w-4 h-4" />
          <span className="lg:hidden">Sudah Terinstall</span>
          <span className="hidden lg:inline">Already Installed</span>
        </>
      ) : (
        <>
          <FiDownload className="w-4 h-4" />
          <span className="lg:hidden">Install Aplikasi</span>
          <span className="hidden lg:inline">Install App</span>
        </>
      )}
    </button>
  );
};


export default PWAInstallButton;
