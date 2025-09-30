import React, { useState, useEffect } from 'react';
import { 
  CameraIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import * as faceapi from 'face-api.js';
import { toast } from 'react-hot-toast';

const FaceIDTester = () => {
  const [testResults, setTestResults] = useState({
    modelLoading: 'pending',
    cameraAccess: 'pending',
    faceDetection: 'pending',
    apiConnection: 'pending'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [currentTest, setCurrentTest] = useState('');

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    setIsLoading(true);
    
    // Test 1: Model Loading
    setCurrentTest('Loading face-api.js models...');
    await testModelLoading();
    
    // Test 2: Camera Access
    setCurrentTest('Testing camera access...');
    await testCameraAccess();
    
    // Test 3: Face Detection
    setCurrentTest('Testing face detection...');
    await testFaceDetection();
    
    // Test 4: API Connection
    setCurrentTest('Testing API connection...');
    await testApiConnection();
    
    setCurrentTest('Tests completed');
    setIsLoading(false);
  };

  const testModelLoading = async () => {
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
      
      setTestResults(prev => ({ ...prev, modelLoading: 'success' }));
    } catch (error) {
      console.error('Model loading failed:', error);
      setTestResults(prev => ({ ...prev, modelLoading: 'failed' }));
    }
  };

  const testCameraAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        } 
      });
      
      // Stop the stream immediately after testing
      stream.getTracks().forEach(track => track.stop());
      
      setTestResults(prev => ({ ...prev, cameraAccess: 'success' }));
    } catch (error) {
      console.error('Camera access failed:', error);
      setTestResults(prev => ({ ...prev, cameraAccess: 'failed' }));
    }
  };

  const testFaceDetection = async () => {
    try {
      // Create a test video element
      const video = document.createElement('video');
      video.width = 640;
      video.height = 480;
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      
      video.srcObject = stream;
      await video.play();
      
      // Wait a bit for video to initialize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test face detection
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
      
      // Stop the stream
      stream.getTracks().forEach(track => track.stop());
      
      if (detection) {
        setTestResults(prev => ({ ...prev, faceDetection: 'success' }));
      } else {
        setTestResults(prev => ({ ...prev, faceDetection: 'warning' }));
      }
    } catch (error) {
      console.error('Face detection failed:', error);
      setTestResults(prev => ({ ...prev, faceDetection: 'failed' }));
    }
  };

  const testApiConnection = async () => {
    try {
      const response = await fetch('/api/face/status', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || 'test'}`
        }
      });
      
      if (response.ok || response.status === 401) {
        // 401 is expected without proper token, but it means API is responding
        setTestResults(prev => ({ ...prev, apiConnection: 'success' }));
      } else {
        setTestResults(prev => ({ ...prev, apiConnection: 'failed' }));
      }
    } catch (error) {
      console.error('API connection failed:', error);
      setTestResults(prev => ({ ...prev, apiConnection: 'failed' }));
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />;
      case 'pending':
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'success':
        return 'Passed';
      case 'failed':
        return 'Failed';
      case 'warning':
        return 'Warning';
      case 'pending':
      default:
        return 'Pending';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'pending':
      default:
        return 'text-gray-500';
    }
  };

  const allTestsPassed = Object.values(testResults).every(status => 
    status === 'success' || status === 'warning'
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <CameraIcon className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Face ID System Test</h1>
          <p className="text-gray-600 mt-2">
            Verify that all Face ID components are working correctly
          </p>
        </div>

        {/* Test Progress */}
        {isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-blue-800 font-medium">{currentTest}</span>
            </div>
          </div>
        )}

        {/* Test Results */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Test Results</h2>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {/* Model Loading Test */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Face-api.js Models</h3>
                  <p className="text-sm text-gray-600">Loading TensorFlow.js face recognition models</p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(testResults.modelLoading)}
                  <span className={`font-medium ${getStatusColor(testResults.modelLoading)}`}>
                    {getStatusText(testResults.modelLoading)}
                  </span>
                </div>
              </div>

              {/* Camera Access Test */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Camera Access</h3>
                  <p className="text-sm text-gray-600">Browser camera permissions and access</p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(testResults.cameraAccess)}
                  <span className={`font-medium ${getStatusColor(testResults.cameraAccess)}`}>
                    {getStatusText(testResults.cameraAccess)}
                  </span>
                </div>
              </div>

              {/* Face Detection Test */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Face Detection</h3>
                  <p className="text-sm text-gray-600">Real-time face detection capabilities</p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(testResults.faceDetection)}
                  <span className={`font-medium ${getStatusColor(testResults.faceDetection)}`}>
                    {getStatusText(testResults.faceDetection)}
                  </span>
                </div>
              </div>

              {/* API Connection Test */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">API Connection</h3>
                  <p className="text-sm text-gray-600">Backend Face ID API endpoints</p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(testResults.apiConnection)}
                  <span className={`font-medium ${getStatusColor(testResults.apiConnection)}`}>
                    {getStatusText(testResults.apiConnection)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Overall Status */}
        <div className={`rounded-lg p-6 ${
          allTestsPassed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center gap-3">
            {allTestsPassed ? (
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
            ) : (
              <XCircleIcon className="w-8 h-8 text-red-600" />
            )}
            <div>
              <h3 className={`text-lg font-semibold ${
                allTestsPassed ? 'text-green-900' : 'text-red-900'
              }`}>
                {allTestsPassed ? 'System Ready' : 'System Issues Detected'}
              </h3>
              <p className={`text-sm ${
                allTestsPassed ? 'text-green-800' : 'text-red-800'
              }`}>
                {allTestsPassed 
                  ? 'Face ID authentication system is ready to use'
                  : 'Please resolve the failed tests before using Face ID'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={runTests}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <CameraIcon className="w-4 h-4" />
            )}
            {isLoading ? 'Testing...' : 'Run Tests Again'}
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back to Login
          </button>
        </div>

        {/* Debug Information */}
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Debug Information</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <div>Browser: {navigator.userAgent}</div>
            <div>WebRTC Support: {navigator.mediaDevices ? 'Yes' : 'No'}</div>
            <div>HTTPS: {window.location.protocol === 'https:' ? 'Yes' : 'No'}</div>
            <div>Camera API: {navigator.mediaDevices?.getUserMedia ? 'Available' : 'Not Available'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceIDTester;
