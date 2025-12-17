// src/components/InstallPWA.jsx
import React, { useEffect, useState } from 'react';
import { FiDownload, FiCheck, FiInfo } from 'react-icons/fi';
import { IoLogoApple } from 'react-icons/io5';

const InstallPWA = ({ compact = false }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(window.__pwaInstallPrompt || null);
  const [isInstallable, setIsInstallable] = useState(!!window.__pwaInstallPrompt);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Debug state changes
  useEffect(() => {
    console.log('[PWA] State changed:', { 
      isInstallable, 
      isStandalone, 
      isIOS,
      hasDeferredPrompt: !!deferredPrompt,
      windowPrompt: !!window.__pwaInstallPrompt
    });
  }, [isInstallable, isStandalone, isIOS, deferredPrompt]);

  useEffect(() => {
    // Deteksi jika app sudah diinstall (standalone mode)
    const checkStandalone = () => {
      return window.matchMedia('(display-mode: standalone)').matches 
        || window.navigator.standalone 
        || document.referrer.includes('android-app://');
    };

    // Deteksi iOS
    const checkIOS = () => {
      return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    };

    // Deteksi Android
    const checkAndroid = () => {
      return /Android/i.test(navigator.userAgent);
    };

    const standalone = checkStandalone();
    const iosDevice = checkIOS();
    const androidDevice = checkAndroid();

    setIsStandalone(standalone);
    setIsIOS(iosDevice);

    console.log('[PWA] Platform detection:', { 
      isIOS: iosDevice, 
      isAndroid: androidDevice,
      isStandalone: standalone,
      userAgent: navigator.userAgent
    });

    // Jika sudah diinstall, tidak perlu show button install
    if (standalone) {
      console.log('[PWA] App already installed');
      return;
    }

    // Untuk iOS, selalu tampilkan button karena tidak ada beforeinstallprompt
    if (iosDevice) {
      setIsInstallable(true);
      console.log('[PWA] iOS detected - showing install guide button');
      return;
    }

    // Untuk Android, tampilkan button meskipun beforeinstallprompt belum fire
    // (akan ditangani oleh event listener)
    if (androidDevice) {
      console.log('[PWA] Android detected - waiting for beforeinstallprompt or showing fallback');
    }

    // Handler untuk beforeinstallprompt (desktop & Android)
    const handler = (e) => {
      console.log('[PWA] ✅ beforeinstallprompt event FIRED!', e);
      e.preventDefault();
      
      // Simpan ke window object agar persist antar remount
      window.__pwaInstallPrompt = e;
      
      // Force update state
      setDeferredPrompt(e);
      setIsInstallable(true);
      
      // Double check with timeout
      setTimeout(() => {
        console.log('[PWA] ⏰ Timeout check - forcing state update');
        setIsInstallable(true);
      }, 100);
      
      console.log('[PWA] State should be updated - isInstallable=true, deferredPrompt=', e);
    };

    // Handler untuk appinstalled event
    const installedHandler = () => {
      console.log('[PWA] App was installed');
      window.__pwaInstallPrompt = null;
      setIsStandalone(true);
      setDeferredPrompt(null);
      setIsInstallable(false);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    console.log('[PWA] Event listeners attached');

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
      console.log('[PWA] Event listeners removed');
    };
  }, []);

  // Handler untuk install di Desktop/Android
  const handleInstallDesktopAndroid = async () => {
    const prompt = deferredPrompt || window.__pwaInstallPrompt;
    
    if (!prompt) {
      console.warn('[PWA] No install prompt available - PWA criteria not met yet');
      return;
    }

    try {
      console.log('[PWA] Showing install prompt');
      await prompt.prompt();

      const { outcome } = await prompt.userChoice;
      console.log(`[PWA] User response: ${outcome}`);

      if (outcome === 'accepted') {
        console.log('[PWA] User accepted install');
        window.__pwaInstallPrompt = null;
        setIsStandalone(true);
        setIsInstallable(false);
      }

      setDeferredPrompt(null);
    } catch (error) {
      console.error('[PWA] Install error:', error);
    }
  };

  // Handler untuk iOS - tampilkan panduan
  const handleInstallIOS = () => {
    setShowIOSGuide(true);
  };

  // Handler klik button utama
  const handleInstallClick = () => {
    if (isIOS) {
      handleInstallIOS();
    } else {
      handleInstallDesktopAndroid();
    }
  };

  // Jangan tampilkan button jika sudah diinstall atau tidak installable
  if (isStandalone || !isInstallable) {
    console.log('[PWA] Not showing button:', { isStandalone, isInstallable, deferredPrompt: !!deferredPrompt });
    return null;
  }

  console.log('[PWA] Rendering install button');

  return (
    <>
      {/* Button Install */}
      <button
        onClick={handleInstallClick}
        className={`
          flex items-center justify-center gap-2 
          bg-primary hover:bg-primary/90 text-white 
          rounded-lg font-medium transition-all duration-200 
          shadow-md hover:shadow-lg active:scale-95
          ${compact ? 'px-3 py-2 text-sm' : 'px-4 py-2.5 w-full'}
        `}
        title={isIOS ? 'Panduan Install Aplikasi' : 'Install Aplikasi ke Perangkat'}
      >
        {isIOS ? (
          <>
            <IoLogoApple className="w-5 h-5" />
            <span>{compact ? 'Install' : 'Panduan Install'}</span>
          </>
        ) : (
          <>
            <FiDownload className="w-5 h-5" />
            <span>{compact ? 'Install' : 'Install Aplikasi'}</span>
          </>
        )}
      </button>

      {/* Modal Panduan iOS - Hanya muncul jika device iOS */}
      {isIOS && showIOSGuide && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-primary text-white p-4 rounded-t-lg sticky top-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IoLogoApple className="w-6 h-6" />
                  <h3 className="font-bold text-lg">Panduan Install di iOS</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-white hover:text-gray-200"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FiInfo className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    iOS tidak mendukung instalasi otomatis. Ikuti langkah berikut untuk menambahkan aplikasi ke Home Screen:
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Buka Safari</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Pastikan Anda membuka aplikasi ini menggunakan browser Safari
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Tap Icon Share</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Klik tombol <span className="font-semibold">Share</span> (ikon kotak dengan panah ke atas) di bagian bawah layar
                    </p>
                    <div className="mt-2 bg-gray-100 rounded p-2 text-center">
                      <span className="text-2xl">⬆️📤</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Pilih "Add to Home Screen"</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Scroll ke bawah dan tap <span className="font-semibold">"Add to Home Screen"</span>
                    </p>
                    <div className="mt-2 bg-gray-100 rounded p-2 text-center">
                      <span className="text-2xl">➕🏠</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    4
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Konfirmasi</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Tap tombol <span className="font-semibold">"Add"</span> di pojok kanan atas
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                    <FiCheck className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-green-700">Selesai!</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Icon aplikasi akan muncul di Home Screen Anda
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mt-6">
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="w-full bg-primary hover:bg-primary/90 text-white py-2.5 px-4 rounded-lg font-medium transition-colors"
                >
                  Mengerti
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallPWA;
