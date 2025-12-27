import { useState, useEffect } from 'react';
import api from '../api';
import { 
  requestNotificationPermission, 
  subscribeToPushNotifications, 
  unsubscribeFromPushNotifications 
} from '../utils/pushNotifications';

/**
 * Debug page untuk testing push notification functionality
 * Akses via: /push-debug
 */
export default function PushNotificationDebug() {
  const [status, setStatus] = useState({
    swRegistered: false,
    swReady: false,
    permission: 'default',
    subscribed: false,
    subscription: null,
    vapidKey: null
  });
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Check status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      // Check service worker
      const swRegistered = 'serviceWorker' in navigator;
      let swReady = false;
      let subscribed = false;
      let subscription = null;

      if (swRegistered) {
        const registration = await navigator.serviceWorker.getRegistration();
        swReady = !!registration;

        if (swReady) {
          subscription = await registration.pushManager.getSubscription();
          subscribed = !!subscription;
        }
      }

      // Check notification permission
      const permission = 'Notification' in window ? Notification.permission : 'not-supported';

      // Get VAPID key from backend
      let vapidKey = null;
      try {
        const response = await api.get('/push-notification/vapid-public-key');
        vapidKey = response.data.publicKey;
      } catch (err) {
        console.error('Failed to get VAPID key:', err);
      }

      setStatus({
        swRegistered,
        swReady,
        permission,
        subscribed,
        subscription: subscription ? {
          endpoint: subscription.endpoint.substring(0, 50) + '...',
          keys: subscription.toJSON().keys
        } : null,
        vapidKey
      });
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const handleRequestPermission = async () => {
    setLoading(true);
    try {
      const granted = await requestNotificationPermission();
      setTestResult(granted ? '✅ Permission granted!' : '❌ Permission denied');
      await checkStatus();
    } catch (error) {
      setTestResult('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const subscription = await subscribeToPushNotifications();
      setTestResult(subscription ? '✅ Subscribed successfully!' : '❌ Subscription failed');
      await checkStatus();
    } catch (error) {
      setTestResult('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    try {
      const success = await unsubscribeFromPushNotifications();
      setTestResult(success ? '✅ Unsubscribed successfully!' : '❌ Unsubscribe failed');
      await checkStatus();
    } catch (error) {
      setTestResult('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setLoading(true);
    try {
      const response = await api.post('/push-notification/test');

      setTestResult('✅ Test notification sent! Check your device for popup notification.');
      console.log('Test notification response:', response.data);
    } catch (error) {
      setTestResult('❌ Error: ' + (error.response?.data?.message || error.message));
      console.error('Test notification error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleForceReload = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.unregister();
        setTestResult('✅ Service Worker unregistered. Page will reload...');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">
          🔔 Push Notification Debug
        </h1>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Service Worker Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">Service Worker</h2>
            <div className="space-y-2">
              <StatusRow 
                label="Supported" 
                value={status.swRegistered} 
              />
              <StatusRow 
                label="Registered" 
                value={status.swReady} 
              />
            </div>
          </div>

          {/* Notification Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">Notification</h2>
            <div className="space-y-2">
              <StatusRow 
                label="Permission" 
                value={status.permission}
                isText={true}
              />
              <StatusRow 
                label="Subscribed" 
                value={status.subscribed} 
              />
            </div>
          </div>

          {/* VAPID Key */}
          <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">VAPID Public Key</h2>
            <div className="bg-gray-100 p-3 rounded text-xs font-mono break-all">
              {status.vapidKey || 'Loading...'}
            </div>
          </div>

          {/* Subscription Details */}
          {status.subscription && (
            <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
              <h2 className="text-lg font-semibold mb-4 text-gray-700">Subscription Details</h2>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-semibold">Endpoint:</span>
                  <div className="bg-gray-100 p-2 rounded mt-1 text-xs font-mono break-all">
                    {status.subscription.endpoint}
                  </div>
                </div>
                <div>
                  <span className="font-semibold">Keys:</span>
                  <pre className="bg-gray-100 p-2 rounded mt-1 text-xs overflow-auto">
                    {JSON.stringify(status.subscription.keys, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <button
              onClick={checkStatus}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              🔄 Refresh Status
            </button>
            
            <button
              onClick={handleRequestPermission}
              disabled={loading || status.permission === 'granted'}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              ✅ Request Permission
            </button>
            
            <button
              onClick={handleSubscribe}
              disabled={loading || status.permission !== 'granted'}
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
            >
              📲 Subscribe
            </button>
            
            <button
              onClick={handleUnsubscribe}
              disabled={loading || !status.subscribed}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
            >
              🚫 Unsubscribe
            </button>
            
            <button
              onClick={handleTestNotification}
              disabled={loading || !status.subscribed}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            >
              🧪 Send Test
            </button>
            
            <button
              onClick={handleForceReload}
              disabled={loading}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            >
              🔥 Force Reload SW
            </button>
          </div>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">Result</h2>
            <div className={`p-4 rounded ${
              testResult.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {testResult}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h2 className="text-lg font-semibold mb-3 text-blue-800">📝 Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-900">
            <li>Click "Refresh Status" to check current state</li>
            <li>If permission is "default", click "Request Permission"</li>
            <li>Once permission is "granted", click "Subscribe"</li>
            <li>After subscribed, click "Send Test" to test notification</li>
            <li>You should see a browser notification pop up</li>
            <li>If Service Worker not working, click "Force Reload SW" then refresh page</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, value, isText = false }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-600">{label}:</span>
      {isText ? (
        <span className={`font-semibold ${
          value === 'granted' ? 'text-green-600' : 
          value === 'denied' ? 'text-red-600' : 
          'text-yellow-600'
        }`}>
          {value}
        </span>
      ) : (
        <span className={`text-lg ${value ? 'text-green-500' : 'text-red-500'}`}>
          {value ? '✅' : '❌'}
        </span>
      )}
    </div>
  );
}
