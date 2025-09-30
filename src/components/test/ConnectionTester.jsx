import React, { useState, useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

const ConnectionTester = () => {
  const [tests, setTests] = useState({
    backend: 'pending',
    models: 'pending',
    cors: 'pending'
  });

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    // Test 1: Backend Connection
    try {
      const response = await fetch('http://127.0.0.1:8000/api/dashboard', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      setTests(prev => ({ 
        ...prev, 
        backend: response.status === 401 ? 'success' : (response.ok ? 'success' : 'failed')
      }));
    } catch (error) {
      setTests(prev => ({ ...prev, backend: 'failed' }));
    }

    // Test 2: Models Accessibility
    try {
      const response = await fetch('/models/tiny_face_detector_model-weights_manifest.json');
      setTests(prev => ({ 
        ...prev, 
        models: response.ok ? 'success' : 'failed'
      }));
    } catch (error) {
      setTests(prev => ({ ...prev, models: 'failed' }));
    }

    // Test 3: CORS Test
    try {
      const response = await fetch('http://127.0.0.1:8000/api/face/status', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer test'
        }
      });
      
      setTests(prev => ({ 
        ...prev, 
        cors: response.status === 401 ? 'success' : (response.ok ? 'success' : 'failed')
      }));
    } catch (error) {
      setTests(prev => ({ ...prev, cors: 'failed' }));
    }
  };

  const getIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'failed': return <XCircleIcon className="w-5 h-5 text-red-600" />;
      default: return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  const allPassed = Object.values(tests).every(status => status === 'success');

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">Connection Test</h2>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <h3 className="font-medium">Backend API (127.0.0.1:8000)</h3>
            <p className="text-sm text-gray-600">Laravel server connection</p>
          </div>
          <div className="flex items-center gap-2">
            {getIcon(tests.backend)}
            <span className={getColor(tests.backend)}>
              {tests.backend === 'success' ? 'Connected' : tests.backend === 'failed' ? 'Failed' : 'Testing...'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <h3 className="font-medium">Face API Models</h3>
            <p className="text-sm text-gray-600">Model files accessibility</p>
          </div>
          <div className="flex items-center gap-2">
            {getIcon(tests.models)}
            <span className={getColor(tests.models)}>
              {tests.models === 'success' ? 'Accessible' : tests.models === 'failed' ? 'Failed' : 'Testing...'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <h3 className="font-medium">CORS Configuration</h3>
            <p className="text-sm text-gray-600">Cross-origin requests</p>
          </div>
          <div className="flex items-center gap-2">
            {getIcon(tests.cors)}
            <span className={getColor(tests.cors)}>
              {tests.cors === 'success' ? 'Working' : tests.cors === 'failed' ? 'Failed' : 'Testing...'}
            </span>
          </div>
        </div>
      </div>

      <div className={`mt-6 p-4 rounded-lg ${allPassed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex items-center gap-2">
          {allPassed ? (
            <CheckCircleIcon className="w-6 h-6 text-green-600" />
          ) : (
            <XCircleIcon className="w-6 h-6 text-red-600" />
          )}
          <span className={`font-medium ${allPassed ? 'text-green-800' : 'text-red-800'}`}>
            {allPassed ? 'All tests passed!' : 'Some tests failed'}
          </span>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button 
          onClick={runTests}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Test Again
        </button>
        <a 
          href="/login"
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Go to Login
        </a>
      </div>

      <div className="mt-4 p-3 bg-gray-100 rounded text-sm">
        <p><strong>Frontend:</strong> http://localhost:5174</p>
        <p><strong>Backend:</strong> http://127.0.0.1:8000</p>
        <p><strong>Models:</strong> /models/*.json</p>
      </div>
    </div>
  );
};

export default ConnectionTester;
