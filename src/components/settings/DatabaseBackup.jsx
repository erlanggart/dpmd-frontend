import { useState, useEffect } from 'react';
import { FiDatabase, FiDownload, FiHardDrive, FiRefreshCw, FiAlertCircle, FiCheck } from 'react-icons/fi';
import api from '../../api';

export default function DatabaseBackup() {
  const [dbInfo, setDbInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchDbInfo = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings/database/info');
      if (res.data.success) {
        setDbInfo(res.data.data);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Gagal mengambil informasi database' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDbInfo();
  }, []);

  const handleBackup = async () => {
    setDownloading(true);
    setMessage(null);

    try {
      const res = await api.get('/settings/database/backup', {
        responseType: 'blob',
        timeout: 300000 // 5 minutes for large databases
      });

      // Extract filename from Content-Disposition header
      const contentDisposition = res.headers['content-disposition'];
      let filename = 'backup_dpmd.sql';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
        if (match) filename = match[1];
      }

      // Create download link
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: `Backup berhasil diunduh: ${filename}` });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.status === 403
          ? 'Akses ditolak. Hanya superadmin yang dapat membuat backup.'
          : 'Gagal membuat backup database'
      });
    } finally {
      setDownloading(false);
    }
  };

  const formatSize = (mb) => {
    const num = Number(mb);
    if (num >= 1024) return `${(num / 1024).toFixed(2)} GB`;
    return `${num.toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Backup Action Card */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Backup Database</h2>
          <button
            onClick={fetchDbInfo}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            title="Refresh"
          >
            <FiRefreshCw className={`text-lg ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.type === 'success' ? <FiCheck className="text-lg flex-shrink-0" /> : <FiAlertCircle className="text-lg flex-shrink-0" />}
            {message.text}
          </div>
        )}

        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            Fitur ini akan membuat file <strong>.sql</strong> dari seluruh data di database server. 
            File backup dapat digunakan untuk import ke database lokal atau sebagai cadangan data.
          </p>
        </div>

        {/* DB Stats */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-50 rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
                <div className="h-6 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        ) : dbInfo ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <FiDatabase className="text-blue-500" />
                Database
              </div>
              <p className="text-lg font-bold text-gray-900">{dbInfo.database}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <FiHardDrive className="text-purple-500" />
                Total Tabel
              </div>
              <p className="text-lg font-bold text-gray-900">{dbInfo.table_count} tabel</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <FiHardDrive className="text-green-500" />
                Ukuran Data
              </div>
              <p className="text-lg font-bold text-gray-900">{formatSize(dbInfo.total_size_mb)}</p>
            </div>
          </div>
        ) : null}

        {/* Download Button */}
        <button
          onClick={handleBackup}
          disabled={downloading}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {downloading ? (
            <>
              <FiRefreshCw className="animate-spin" />
              Membuat backup...
            </>
          ) : (
            <>
              <FiDownload />
              Download Backup SQL
            </>
          )}
        </button>
      </div>

      {/* Table Details */}
      {dbInfo && dbInfo.tables && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Detail Tabel ({dbInfo.table_count})</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Nama Tabel</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Jumlah Baris</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Ukuran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dbInfo.tables.map((table, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-gray-800">{table.name}</td>
                    <td className="px-4 py-2 text-right text-gray-600">
                      {Number(table.rows).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-600">{table.size_mb} MB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
