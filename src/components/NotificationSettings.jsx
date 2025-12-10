import { useState, useEffect } from 'react';
import { FiBell, FiBellOff, FiCheck, FiX, FiInfo } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import {
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getNotificationPermissionStatus,
  isPushNotificationSupported,
  showLocalNotification
} from '../utils/pushNotifications';

export default function NotificationSettings() {
  const [permissionStatus, setPermissionStatus] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    // Check if push notifications are supported
    if (!isPushNotificationSupported()) {
      setSupported(false);
      return;
    }

    // Check permission status
    const status = getNotificationPermissionStatus();
    setPermissionStatus(status);

    // Check if already subscribed
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const handleEnableNotifications = async () => {
    setLoading(true);
    try {
      // Request permission
      const granted = await requestNotificationPermission();
      
      if (!granted) {
        toast.error('Izin notifikasi ditolak. Silakan aktifkan di pengaturan browser Anda.');
        setLoading(false);
        return;
      }

      // Subscribe to push notifications
      const subscription = await subscribeToPushNotifications();
      
      if (subscription) {
        setIsSubscribed(true);
        setPermissionStatus('granted');
        toast.success('Notifikasi push berhasil diaktifkan!');
        
        // Show test notification
        await showLocalNotification('Notifikasi Aktif!', {
          body: 'Anda akan menerima notifikasi untuk disposisi baru',
          requireInteraction: false
        });
      } else {
        toast.error('Gagal mengaktifkan notifikasi push');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('Terjadi kesalahan saat mengaktifkan notifikasi');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setLoading(true);
    try {
      const success = await unsubscribeFromPushNotifications();
      
      if (success) {
        setIsSubscribed(false);
        toast.success('Notifikasi push berhasil dinonaktifkan');
      } else {
        toast.error('Gagal menonaktifkan notifikasi push');
      }
    } catch (error) {
      console.error('Error disabling notifications:', error);
      toast.error('Terjadi kesalahan saat menonaktifkan notifikasi');
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await showLocalNotification('Test Notifikasi', {
        body: 'Ini adalah notifikasi percobaan dari DPMD',
        requireInteraction: false,
        data: {
          url: '/dashboard/disposisi'
        }
      });
      toast.success('Notifikasi test dikirim!');
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Gagal mengirim notifikasi test');
    }
  };

  if (!supported) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-yellow-50 rounded-lg">
            <FiInfo className="text-2xl text-yellow-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Notifikasi Push Tidak Didukung
            </h3>
            <p className="text-sm text-gray-600">
              Browser Anda tidak mendukung notifikasi push. Silakan gunakan browser modern seperti Chrome, Firefox, atau Edge.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
            <FiBell className="text-2xl text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Notifikasi Push</h3>
            <p className="text-sm text-white/80">Kelola notifikasi disposisi real-time</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            {isSubscribed ? (
              <div className="p-2 bg-green-100 rounded-lg">
                <FiCheck className="text-xl text-green-600" />
              </div>
            ) : (
              <div className="p-2 bg-gray-100 rounded-lg">
                <FiBellOff className="text-xl text-gray-600" />
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900">
                {isSubscribed ? 'Notifikasi Aktif' : 'Notifikasi Nonaktif'}
              </p>
              <p className="text-sm text-gray-600">
                {isSubscribed 
                  ? 'Anda akan menerima notifikasi untuk disposisi baru' 
                  : 'Aktifkan untuk menerima notifikasi disposisi'}
              </p>
            </div>
          </div>
          
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
            permissionStatus === 'granted' 
              ? 'bg-green-100 text-green-800'
              : permissionStatus === 'denied'
              ? 'bg-red-100 text-red-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {permissionStatus === 'granted' ? 'Diizinkan' :
             permissionStatus === 'denied' ? 'Ditolak' : 'Belum Diatur'}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {!isSubscribed ? (
            <button
              onClick={handleEnableNotifications}
              disabled={loading || permissionStatus === 'denied'}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all ${
                loading || permissionStatus === 'denied'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
              }`}
            >
              <FiBell className="text-lg" />
              {loading ? 'Mengaktifkan...' : 'Aktifkan Notifikasi'}
            </button>
          ) : (
            <>
              <button
                onClick={handleDisableNotifications}
                disabled={loading}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all ${
                  loading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600'
                }`}
              >
                <FiBellOff className="text-lg" />
                {loading ? 'Menonaktifkan...' : 'Nonaktifkan'}
              </button>
              
              <button
                onClick={handleTestNotification}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
              >
                <FiBell className="text-lg" />
                Test Notifikasi
              </button>
            </>
          )}
        </div>

        {/* Info */}
        {permissionStatus === 'denied' && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
            <div className="flex items-start gap-3">
              <FiX className="text-red-600 text-xl flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-semibold mb-1">Izin Notifikasi Ditolak</p>
                <p>
                  Untuk mengaktifkan notifikasi, silakan ubah pengaturan izin notifikasi di browser Anda:
                </p>
                <ul className="mt-2 ml-4 list-disc space-y-1">
                  <li>Chrome: Settings → Privacy and security → Site Settings → Notifications</li>
                  <li>Firefox: Settings → Privacy & Security → Permissions → Notifications</li>
                  <li>Edge: Settings → Cookies and site permissions → Notifications</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="border-t pt-6">
          <h4 className="font-semibold text-gray-900 mb-3">Fitur Notifikasi:</h4>
          <ul className="space-y-2">
            <li className="flex items-start gap-3">
              <FiCheck className="text-green-500 mt-1 flex-shrink-0" />
              <span className="text-sm text-gray-700">Notifikasi real-time saat menerima disposisi baru</span>
            </li>
            <li className="flex items-start gap-3">
              <FiCheck className="text-green-500 mt-1 flex-shrink-0" />
              <span className="text-sm text-gray-700">Bekerja bahkan saat browser ditutup</span>
            </li>
            <li className="flex items-start gap-3">
              <FiCheck className="text-green-500 mt-1 flex-shrink-0" />
              <span className="text-sm text-gray-700">Suara dan getaran untuk notifikasi penting</span>
            </li>
            <li className="flex items-start gap-3">
              <FiCheck className="text-green-500 mt-1 flex-shrink-0" />
              <span className="text-sm text-gray-700">Akses cepat ke disposisi dari notifikasi</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
