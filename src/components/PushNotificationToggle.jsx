import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X, Loader2 } from 'lucide-react';
import pushNotificationManager from '../utils/pushNotificationManager';

/**
 * PushNotificationToggle Component
 * Menampilkan toggle button untuk enable/disable push notifications
 */
const PushNotificationToggle = () => {
  const [status, setStatus] = useState({
    supported: false,
    subscribed: false,
    permission: 'default',
    loading: true
  });
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setStatus(prev => ({ ...prev, loading: true }));
    const statusData = await pushNotificationManager.getSubscriptionStatus();
    setStatus({ ...statusData, loading: false });
  };

  const handleToggle = async () => {
    setProcessing(true);
    setMessage(null);

    try {
      if (status.subscribed) {
        // Unsubscribe
        const result = await pushNotificationManager.unsubscribe();
        if (result.success) {
          setMessage({ type: 'success', text: 'Notifikasi push telah dinonaktifkan' });
          await checkStatus();
        } else {
          setMessage({ type: 'error', text: result.message || 'Gagal menonaktifkan notifikasi' });
        }
      } else {
        // Subscribe
        const initResult = await pushNotificationManager.initialize();
        if (!initResult.success && initResult.error) {
          setMessage({ type: 'error', text: initResult.error });
          setProcessing(false);
          return;
        }

        const result = await pushNotificationManager.subscribe();
        if (result.success) {
          setMessage({ type: 'success', text: 'Notifikasi push telah diaktifkan!' });
          await checkStatus();
        } else {
          setMessage({ type: 'error', text: result.message || 'Gagal mengaktifkan notifikasi' });
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setProcessing(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleTest = async () => {
    setProcessing(true);
    setMessage(null);

    try {
      const result = await pushNotificationManager.sendTestNotification();
      if (result.success) {
        setMessage({ type: 'success', text: 'Notifikasi test telah dikirim! Cek device Anda.' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Gagal mengirim test notifikasi' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setProcessing(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  if (status.loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Memuat...</span>
      </div>
    );
  }

  if (!status.supported) {
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <BellOff className="w-4 h-4" />
        <span className="text-sm">Browser tidak mendukung notifikasi push</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggle}
          disabled={processing}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
            ${status.subscribed 
              ? 'bg-green-500 hover:bg-green-600 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
            }
            ${processing ? 'opacity-50 cursor-not-allowed' : ''}
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {processing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : status.subscribed ? (
            <Bell className="w-4 h-4" />
          ) : (
            <BellOff className="w-4 h-4" />
          )}
          <span className="text-sm">
            {processing 
              ? 'Memproses...' 
              : status.subscribed 
                ? 'Notifikasi Aktif' 
                : 'Aktifkan Notifikasi'
            }
          </span>
        </button>

        {status.subscribed && (
          <button
            onClick={handleTest}
            disabled={processing}
            className="
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium
              bg-purple-500 hover:bg-purple-600 text-white transition-all
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            <Bell className="w-4 h-4" />
            <span className="text-sm">Test Notifikasi</span>
          </button>
        )}
      </div>

      {message && (
        <div className={`
          flex items-center gap-2 px-4 py-2 rounded-lg text-sm
          ${message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
          }
        `}>
          {message.type === 'success' ? (
            <Check className="w-4 h-4 flex-shrink-0" />
          ) : (
            <X className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {status.permission === 'denied' && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-yellow-50 text-yellow-700 border border-yellow-200">
          <X className="w-4 h-4 flex-shrink-0" />
          <span>
            Notifikasi diblokir. Silakan aktifkan di pengaturan browser Anda.
          </span>
        </div>
      )}
    </div>
  );
};

export default PushNotificationToggle;
