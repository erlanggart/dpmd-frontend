// src/components/NotificationSettingsGuide.jsx
import React, { useState } from 'react';
import { FiBell, FiX, FiChrome, FiSmartphone, FiSettings, FiCheckCircle } from 'react-icons/fi';

const NotificationSettingsGuide = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isChrome = /Chrome/i.test(navigator.userAgent);
  const isFirefox = /Firefox/i.test(navigator.userAgent);

  const steps = [
    {
      title: 'Izinkan Notifikasi',
      icon: FiBell,
      description: 'Pastikan Anda sudah mengizinkan notifikasi dari browser',
      instructions: [
        'Klik ikon gembok/info di address bar',
        'Cari pengaturan "Notifications" atau "Notifikasi"',
        'Ubah menjadi "Allow" atau "Izinkan"',
        'Refresh halaman jika diperlukan'
      ]
    },
    {
      title: 'Pengaturan Browser',
      icon: FiChrome,
      description: 'Pastikan browser tidak memblokir notifikasi di background',
      instructions: isChrome ? [
        'Buka Settings > Privacy and Security > Site Settings',
        'Klik "Notifications"',
        'Pastikan dpmd.bogorkab.go.id atau localhost dalam daftar "Allowed"',
        'Aktifkan "Sites can ask to send notifications"'
      ] : isFirefox ? [
        'Buka Settings > Privacy & Security',
        'Scroll ke "Permissions" > Notifications',
        'Klik "Settings..." dan pastikan situs ini tidak diblokir',
        'Centang "Block new requests asking to allow notifications" jika ingin'
      ] : [
        'Buka pengaturan browser Anda',
        'Cari bagian "Notifications" atau "Site Settings"',
        'Pastikan situs ini diizinkan untuk mengirim notifikasi',
        'Aktifkan notifikasi di background jika tersedia'
      ]
    },
    {
      title: 'Pengaturan Sistem',
      icon: FiSmartphone,
      description: 'Izinkan browser berjalan di background pada sistem operasi',
      instructions: isAndroid ? [
        'Buka Settings > Apps > Chrome/Browser Anda',
        'Pilih "Battery" atau "Battery optimization"',
        'Ubah menjadi "Don\'t optimize" atau "Unrestricted"',
        'Ini memastikan notifikasi tetap berjalan di background'
      ] : isIOS ? [
        '⚠️ iOS memiliki keterbatsan untuk notifikasi PWA',
        'Untuk notifikasi yang lebih baik, gunakan Chrome/Firefox di desktop',
        'Atau install aplikasi native iOS jika tersedia',
        'Push notification di iOS Safari masih terbatas'
      ] : [
        'Windows: Settings > System > Notifications',
        'Pastikan "Get notifications from apps and senders" aktif',
        'Izinkan Chrome/Firefox untuk mengirim notifikasi',
        'Nonaktifkan "Focus Assist" jika perlu notifikasi segera'
      ]
    },
    {
      title: 'Install sebagai App',
      icon: FiSettings,
      description: 'Install aplikasi untuk pengalaman terbaik',
      instructions: [
        'Klik tombol "Install" di address bar browser',
        'Atau gunakan menu "Install DPMD" di Chrome',
        'Aplikasi yang terinstall lebih stabil untuk notifikasi',
        'Notifikasi akan tetap berfungsi walaupun browser ditutup'
      ]
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FiBell className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Panduan Notifikasi</h2>
                <p className="text-blue-100 text-sm">Agar notifikasi tetap aktif di background</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between mb-2">
            {steps.map((_, index) => (
              <div key={index} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    index <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {index < currentStep ? (
                    <FiCheckCircle className="w-6 h-6" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 rounded ${
                      index < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              {React.createElement(steps[currentStep].icon, {
                className: 'w-12 h-12 text-blue-600'
              })}
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {steps[currentStep].title}
                </h3>
                <p className="text-gray-600">{steps[currentStep].description}</p>
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg">
              <ul className="space-y-3">
                {steps[currentStep].instructions.map((instruction, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-semibold">
                      {index + 1}
                    </span>
                    <span className="text-gray-700 flex-1 pt-0.5">{instruction}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Platform Warning */}
          {isIOS && currentStep === 2 && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-lg">
              <p className="text-amber-800 text-sm">
                <strong>⚠️ Catatan iOS:</strong> Safari di iOS memiliki keterbatasan untuk notifikasi PWA. 
                Untuk pengalaman terbaik, gunakan aplikasi di desktop atau perangkat Android.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-2xl border-t border-gray-200 flex justify-between items-center">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Sebelumnya
          </button>

          <div className="text-sm text-gray-500">
            Langkah {currentStep + 1} dari {steps.length}
          </div>

          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              Selanjutnya →
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <FiCheckCircle className="w-5 h-5" />
              Selesai
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationSettingsGuide;
