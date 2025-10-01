import React, { useState } from 'react';

const SimpleAPITest = () => {
  const [results, setResults] = useState({});
  const [testing, setTesting] = useState(false);

  const testEndpoints = async () => {
    setTesting(true);
    const endpoints = [
      { name: 'Backend Health', url: 'http://127.0.0.1:8000/api/health' },
      { name: 'System Info', url: 'http://127.0.0.1:8000/api/health/info' },
      { name: 'Face ID Status', url: 'http://127.0.0.1:8000/api/health/face-id' },
      { name: 'Models - Tiny Face', url: '/models/tiny_face_detector_model-weights_manifest.json' },
      { name: 'Models - Landmarks', url: '/models/face_landmark_68_model-weights_manifest.json' },
      { name: 'Models - Recognition', url: '/models/face_recognition_model-weights_manifest.json' }
    ];

    const testResults = {};

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url);
        const data = endpoint.url.includes('/api/') ? await response.json() : null;
        
        testResults[endpoint.name] = {
          status: response.status,
          ok: response.ok,
          error: null,
          data: data
        };
      } catch (error) {
        testResults[endpoint.name] = {
          status: 'ERROR',
          ok: false,
          error: error.message,
          data: null
        };
      }
    }

    setResults(testResults);
    setTesting(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Simple API & Models Test</h1>
      
      <button 
        onClick={testEndpoints}
        disabled={testing}
        className="mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {testing ? 'Testing...' : 'Run Tests'}
      </button>

      <div className="space-y-4">
        {Object.entries(results).map(([name, result]) => (
          <div key={name} className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-medium">{name}</span>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-sm ${
                  result.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {result.status}
                </span>
                {result.ok ? '✅' : '❌'}
              </div>
            </div>
            {result.error && (
              <div className="mt-2 text-sm text-red-600">
                Error: {result.error}
              </div>
            )}
            {result.data && (
              <div className="mt-2 text-sm text-gray-600">
                <details>
                  <summary className="cursor-pointer font-medium">Response Data</summary>
                  <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-medium mb-2">Current Configuration:</h3>
        <div className="text-sm space-y-1">
          <div>Frontend: http://localhost:5174</div>
          <div>Backend: http://127.0.0.1:8000</div>
          <div>API Base: {import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'}</div>
          <div>Models Path: /models/</div>
        </div>
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded">
        <h3 className="font-medium mb-2">Next Steps:</h3>
        <ol className="text-sm list-decimal list-inside space-y-1">
          <li>Ensure Laravel backend is running (php artisan serve)</li>
          <li>Check database connection if needed</li>
          <li>Test Face ID models loading</li>
          <li>Test Face ID authentication flow</li>
        </ol>
      </div>
    </div>
  );
};

export default SimpleAPITest;
