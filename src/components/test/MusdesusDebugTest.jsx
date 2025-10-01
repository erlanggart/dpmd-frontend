import React, { useState, useEffect } from 'react';
import api from '../../api';

const MusdesusDebugTest = () => {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    const results = {};

    // Test 1: Check musdesus list API
    try {
      const response = await api.get('/public/musdesus/files');
      results.filesList = {
        success: true,
        data: response.data,
        count: response.data.data?.length || 0
      };
    } catch (error) {
      results.filesList = {
        success: false,
        error: error.message,
        response: error.response?.data
      };
    }

    // Test 2: Check musdesus stats API
    try {
      const response = await api.get('/public/musdesus/stats');
      results.stats = {
        success: true,
        data: response.data
      };
    } catch (error) {
      results.stats = {
        success: false,
        error: error.message,
        response: error.response?.data
      };
    }

    // Test 3: Check kecamatan list
    try {
      const response = await api.get('/musdesus/kecamatan');
      results.kecamatan = {
        success: true,
        data: response.data,
        count: response.data.data?.length || 0
      };
    } catch (error) {
      results.kecamatan = {
        success: false,
        error: error.message
      };
    }

    // Test 4: Try to access a test file (if any exists)
    if (results.filesList.success && results.filesList.data.data?.length > 0) {
      const firstFile = results.filesList.data.data[0];
      try {
        const response = await fetch(`${api.defaults.baseURL}/musdesus/view/${firstFile.nama_file}`, {
          method: 'HEAD'
        });
        results.fileAccess = {
          success: response.ok,
          status: response.status,
          filename: firstFile.nama_file,
          url: `${api.defaults.baseURL}/musdesus/view/${firstFile.nama_file}`
        };
      } catch (error) {
        results.fileAccess = {
          success: false,
          error: error.message,
          filename: firstFile.nama_file
        };
      }
    } else {
      results.fileAccess = {
        success: false,
        error: 'No files available to test'
      };
    }

    setTestResults(results);
    setLoading(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Musdesus Debug Test</h1>
      
      <button 
        onClick={runTests}
        disabled={loading}
        className="mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Run Tests'}
      </button>

      <div className="space-y-6">
        {Object.entries(testResults).map(([testName, result]) => (
          <div key={testName} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold capitalize">{testName.replace(/([A-Z])/g, ' $1')}</h3>
              <span className={`px-3 py-1 rounded text-sm ${
                result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {result.success ? 'Success' : 'Failed'}
              </span>
            </div>

            {result.success ? (
              <div className="bg-green-50 p-3 rounded">
                <details>
                  <summary className="cursor-pointer font-medium">View Response Data</summary>
                  <pre className="mt-2 text-xs overflow-auto">
                    {JSON.stringify(result.data || result, null, 2)}
                  </pre>
                </details>
                {result.count !== undefined && (
                  <p className="mt-2 text-sm text-green-700">
                    Count: {result.count} items
                  </p>
                )}
                {result.url && (
                  <p className="mt-2 text-sm">
                    <a 
                      href={result.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Test URL: {result.url}
                    </a>
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-red-50 p-3 rounded">
                <p className="text-red-800 font-medium">Error: {result.error}</p>
                {result.response && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm">Error Details</summary>
                    <pre className="mt-1 text-xs overflow-auto">
                      {JSON.stringify(result.response, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-medium mb-2">Configuration Info:</h3>
        <div className="text-sm space-y-1">
          <div>API Base URL: {api.defaults.baseURL}</div>
          <div>Frontend: http://localhost:5174</div>
          <div>Backend: http://127.0.0.1:8000</div>
        </div>
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded">
        <h3 className="font-medium mb-2">Quick Actions:</h3>
        <div className="flex gap-2 flex-wrap">
          <a 
            href="/musdesus-upload" 
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Upload Test File
          </a>
          <a 
            href="/musdesus-stats" 
            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
          >
            View Musdesus Stats
          </a>
          <button 
            onClick={() => window.open(`${api.defaults.baseURL}/musdesus/kecamatan`, '_blank')}
            className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
          >
            Test Kecamatan API
          </button>
        </div>
      </div>
    </div>
  );
};

export default MusdesusDebugTest;
