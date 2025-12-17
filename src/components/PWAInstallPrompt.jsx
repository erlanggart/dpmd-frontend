// src/components/PWAInstallPrompt.jsx
import React, { useEffect, useState } from 'react';
import { FiX, FiDownload } from 'react-icons/fi';

const PWAInstallPrompt = ({ showOnLanding = false }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone 
      || document.referrer.includes('android-app://');

    if (isStandalone) {
      // App already installed, don't show prompt
      console.log('App already installed');
      return;
    }

    const handler = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      
      // Check if user hasn't dismissed it before
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      const now = Date.now();
      
      if (dismissed && parseInt(dismissed) > now) {
        // Still in dismiss period
        return;
      }

      // Clear expired dismiss flag
      if (dismissed) {
        localStorage.removeItem('pwa-install-dismissed');
      }

      // Show prompt with different timing based on page
      if (showOnLanding) {
        // On landing page, show immediately after short delay
        setTimeout(() => {
          setShowPrompt(true);
        }, 2000);
      } else {
        // On other pages, show after 5 seconds
        setTimeout(() => {
          setShowPrompt(true);
        }, 5000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Cleanup
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [showOnLanding]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    console.log(`User response to the install prompt: ${outcome}`);

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Remember user dismissed for 7 days
    const dismissedUntil = Date.now() + (7 * 24 * 60 * 60 * 1000);
    localStorage.setItem('pwa-install-dismissed', dismissedUntil.toString());
  };

  if (!showPrompt || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-slide-up">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Tutup"
        >
          <FiX className="w-5 h-5" />
        </button>
        
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <img 
              src="/icon-192x192.png" 
              alt="DPMD Icon" 
              className="w-12 h-12 rounded-lg"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Install Aplikasi DPMD
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Akses lebih cepat dengan install aplikasi di perangkat Anda. Dapatkan notifikasi disposisi walaupun aplikasi tidak dibuka.
            </p>
            
            <button
              onClick={handleInstall}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
            >
              <FiDownload className="w-4 h-4 mr-2" />
              Install Sekarang
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
