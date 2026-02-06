// src/components/InstallPWA.jsx
import React, { useEffect, useState } from 'react';
import { FiDownload, FiCheck, FiInfo, FiSmartphone } from 'react-icons/fi';
import { IoLogoApple } from 'react-icons/io5';

const InstallPWA = ({ compact = false }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(window.__pwaInstallPrompt || window.deferredPrompt || null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  // Debug state changes
  useEffect(() => {
    // console.log('[PWA] State changed:', { 
    //   isInstallable, 
    //   isStandalone, 
    //   isIOS,
    //   hasDeferredPrompt: !!deferredPrompt,
    //   windowPrompt: !!window.__pwaInstallPrompt
    // });
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
    setIsAndroid(androidDevice);

    // Jika sudah diinstall, tidak perlu show button install
    if (standalone) {
      console.log('[PWA] App already installed');
      return;
    }

    // Untuk iOS & Android, selalu tampilkan button
    // iOS tidak punya beforeinstallprompt, Android kadang terlambat fire
    if (iosDevice || androidDevice) {
      setIsInstallable(true);
      console.log(`[PWA] ${iosDevice ? 'iOS' : 'Android'} detected - showing install button`);
    }

    // Cek jika prompt sudah tersedia dari global listener
    if (window.__pwaInstallPrompt || window.deferredPrompt) {
      setDeferredPrompt(window.__pwaInstallPrompt || window.deferredPrompt);
      setIsInstallable(true);
    }

    // Handler untuk beforeinstallprompt (desktop & Android)
    const handler = (e) => {
      console.log('[PWA] ✅ beforeinstallprompt event FIRED!');
      e.preventDefault();
      
      // Simpan ke window object agar persist antar remount
      window.__pwaInstallPrompt = e;
      window.deferredPrompt = e;
      
      setDeferredPrompt(e);
      setIsInstallable(true);
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

    // console.log('[PWA] Event listeners attached');

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
      // console.log('[PWA] Event listeners removed');
    };
  }, []);

  // Handler untuk install di Desktop/Android
  const handleInstallDesktopAndroid = async () => {
    const prompt = deferredPrompt || window.__pwaInstallPrompt || window.deferredPrompt;
    
    if (!prompt) {
      // Tidak ada native prompt — tampilkan panduan manual
      console.log('[PWA] No native prompt - showing manual guide');
      setShowInstallGuide(true);
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
        window.deferredPrompt = null;
        setIsStandalone(true);
        setIsInstallable(false);
      }

      setDeferredPrompt(null);
    } catch (error) {
      console.error('[PWA] Install error:', error);
      // Jika prompt gagal, tampilkan panduan manual
      setShowInstallGuide(true);
    }
  };

  // Handler klik button utama
  const handleInstallClick = () => {
    if (isIOS) {
      setShowInstallGuide(true);
    } else {
      handleInstallDesktopAndroid();
    }
  };

  // Jangan tampilkan button jika sudah diinstall atau tidak installable
  if (isStandalone || !isInstallable) {
    // console.log('[PWA] Not showing button:', { isStandalone, isInstallable, deferredPrompt: !!deferredPrompt });
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

      {/* Modal Panduan Install */}
      {showInstallGuide && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-2xl sticky top-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isIOS ? <IoLogoApple className="w-6 h-6" /> : <FiSmartphone className="w-6 h-6" />}
                  <h3 className="font-bold text-lg">Install Aplikasi</h3>
                </div>
                <button
                  onClick={() => setShowInstallGuide(false)}
                  className="text-white/80 hover:text-white bg-white/20 rounded-full w-8 h-8 flex items-center justify-center"
                >
                  <span className="text-xl leading-none">&times;</span>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <div className="flex items-start gap-3">
                  <FiInfo className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    {isIOS 
                      ? 'Ikuti langkah berikut untuk install aplikasi di iPhone/iPad:'
                      : 'Ikuti langkah berikut untuk install aplikasi di perangkat Anda:'
                    }
                  </p>
                </div>
              </div>

              {isIOS ? (
                /* Panduan iOS */
                <div className="space-y-3">
                  <StepItem number={1} title="Buka di Safari" desc="Pastikan Anda membuka web ini menggunakan browser Safari" />
                  <StepItem number={2} title="Tap Tombol Share" desc='Tap ikon Share (kotak dengan panah ke atas) di bagian bawah layar' icon="⬆️" />
                  <StepItem number={3} title='Pilih "Add to Home Screen"' desc='Scroll ke bawah dan tap "Add to Home Screen"' icon="➕" />
                  <StepItem number={4} title="Konfirmasi" desc='Tap "Add" di pojok kanan atas' />
                </div>
              ) : (
                /* Panduan Android / Chrome */
                <div className="space-y-3">
                  <StepItem number={1} title="Tap Menu Browser" desc='Tap ikon titik tiga (⋮) di pojok kanan atas browser Chrome' icon="⋮" />
                  <StepItem number={2} title='Pilih "Install Aplikasi"' desc='Tap "Install aplikasi" atau "Tambahkan ke Layar utama"' icon="📲" />
                  <StepItem number={3} title="Konfirmasi Install" desc='Tap "Install" pada dialog yang muncul' />
                </div>
              )}

              <div className="flex items-start gap-3 bg-green-50 rounded-xl p-3">
                <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                  <FiCheck className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-green-700 text-sm">Selesai!</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Icon aplikasi DPMD akan muncul di Home Screen Anda
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowInstallGuide(false)}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-2.5 px-4 rounded-xl font-medium transition-all"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Reusable step item component
function StepItem({ number, title, desc, icon }) {
  return (
    <div className="flex items-start gap-3">
      <div className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center flex-shrink-0 text-sm font-bold">
        {number}
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900 text-sm">{title}</p>
        <p className="text-xs text-gray-600 mt-0.5">{desc}</p>
        {icon && (
          <div className="mt-1.5 bg-gray-100 rounded-lg py-1.5 px-3 inline-block">
            <span className="text-lg">{icon}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default InstallPWA;
