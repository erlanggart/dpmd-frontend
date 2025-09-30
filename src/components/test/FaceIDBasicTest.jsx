import React, { useState } from 'react';
import FaceLogin from '../face/FaceLogin';

const FaceIDBasicTest = () => {
  const [testMode, setTestMode] = useState('demo');

  const handleSuccess = (userData) => {
    console.log('Face login success:', userData);
    alert(`Face login berhasil!\nUser: ${userData.user?.name || 'Test User'}\nConfidence: ${userData.confidence || 'N/A'}`);
  };

  const handleError = (error) => {
    console.error('Face login error:', error);
    alert(`Face login gagal: ${error}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Face ID Basic Test</h1>
          <p className="text-gray-600">
            Test Face ID components tanpa database dependency
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Face Login Component */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Face Login Component</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Mode:
              </label>
              <select 
                value={testMode}
                onChange={(e) => setTestMode(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="demo">Demo Mode (No API)</option>
                <option value="api">API Mode (With Backend)</option>
              </select>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <FaceLogin
                onSuccess={handleSuccess}
                onError={handleError}
                demoMode={testMode === 'demo'}
              />
            </div>
          </div>

          {/* Test Information */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Test Information</h2>
            
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900">Demo Mode</h3>
                <p className="text-sm text-blue-800">
                  Test Face ID components tanpa koneksi ke backend API. 
                  Hanya test camera access dan face detection.
                </p>
              </div>
              
              <div className="p-3 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-900">API Mode</h3>
                <p className="text-sm text-green-800">
                  Test dengan koneksi penuh ke backend API untuk 
                  registrasi dan autentikasi face data.
                </p>
              </div>

              <div className="p-3 bg-yellow-50 rounded-lg">
                <h3 className="font-medium text-yellow-900">Requirements</h3>
                <ul className="text-sm text-yellow-800 list-disc list-inside">
                  <li>Camera access permission</li>
                  <li>Good lighting conditions</li>
                  <li>Face models loaded</li>
                  <li>HTTPS in production</li>
                </ul>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-medium mb-2">Test Actions</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => window.location.href = '/face-id-test'}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Full Face ID Test
                </button>
                <button 
                  onClick={() => window.location.href = '/api-test'}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  API Connection Test
                </button>
                <button 
                  onClick={() => window.location.href = '/login'}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Go to Login Page
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Debug Info */}
        <div className="mt-8 bg-gray-100 rounded-lg p-4">
          <h3 className="font-medium mb-2">Debug Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Frontend:</strong> http://localhost:5174<br/>
              <strong>Backend:</strong> http://127.0.0.1:8000<br/>
              <strong>Models:</strong> /models/
            </div>
            <div>
              <strong>Browser:</strong> {navigator.userAgent.split(' ')[0]}<br/>
              <strong>WebRTC:</strong> {navigator.mediaDevices ? 'Supported' : 'Not Supported'}<br/>
              <strong>HTTPS:</strong> {location.protocol === 'https:' ? 'Yes' : 'No (Dev)'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceIDBasicTest;
