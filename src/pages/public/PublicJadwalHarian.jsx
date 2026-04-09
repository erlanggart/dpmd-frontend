// src/pages/public/PublicJadwalHarian.jsx
// Halaman jadwal kegiatan harian (share link internal - requires login)
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api';
import { LuCalendar, LuMapPin, LuClock, LuUser, LuPhone, LuBuilding2, LuArrowLeft, LuShare2 } from 'react-icons/lu';

const PublicJadwalHarian = () => {
  const { tanggal } = useParams();
  const navigate = useNavigate();
  const [jadwals, setJadwals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
      setError('Format tanggal tidak valid');
      setLoading(false);
      return;
    }
    fetchJadwalHarian();
  }, [tanggal]);

  const fetchJadwalHarian = async () => {
    try {
      setLoading(true);
      const response = await api.get('/jadwal-kegiatan', {
        params: { tanggal, limit: 50 }
      });
      setJadwals(response.data.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching jadwal harian:', err);
      setError('Gagal memuat data jadwal kegiatan');
    } finally {
      setLoading(false);
    }
  };

  const formatTanggalHeader = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatWaktu = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTanggalWaktu = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Terjadwal' },
      ongoing: { bg: 'bg-green-100', text: 'text-green-700', label: 'Berlangsung' },
      completed: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Selesai' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Dibatalkan' }
    };
    const badge = badges[status] || badges.draft;
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getPriorityIndicator = (prioritas) => {
    const colors = {
      rendah: 'bg-green-400',
      sedang: 'bg-yellow-400',
      tinggi: 'bg-orange-400',
      urgent: 'bg-red-500'
    };
    return colors[prioritas] || colors.sedang;
  };

  const handleShare = () => {
    const url = window.location.href;
    const text = `📅 Jadwal Kegiatan DPMD - ${formatTanggalHeader(tanggal)}\n🔗 ${url}`;
    
    if (navigator.share) {
      navigator.share({ title: `Jadwal Kegiatan DPMD - ${formatTanggalHeader(tanggal)}`, url });
    } else {
      navigator.clipboard.writeText(text);
      alert('Link berhasil disalin!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-teal-200 border-t-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Memuat Jadwal Kegiatan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-800 font-medium"
          >
            <LuArrowLeft className="w-4 h-4" />
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <LuArrowLeft className="w-5 h-5" />
              </button>
              <div className="p-2 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl shadow">
                <LuCalendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-800">Jadwal Kegiatan DPMD</h1>
                <p className="text-xs text-slate-500">Kabupaten Bogor</p>
              </div>
            </div>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors font-medium"
            >
              <LuShare2 className="w-4 h-4" />
              <span className="hidden sm:inline">Bagikan</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Date Header */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl shadow-xl p-6 mb-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <LuCalendar className="w-8 h-8" />
            <div>
              <p className="text-teal-100 text-sm font-medium">Jadwal Kegiatan Hari</p>
              <h2 className="text-2xl sm:text-3xl font-bold">{formatTanggalHeader(tanggal)}</h2>
            </div>
          </div>
          <div className="mt-3 inline-flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5">
            <span className="text-sm font-semibold">{jadwals.length} kegiatan</span>
          </div>
        </div>

        {/* Activities List */}
        {jadwals.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Tidak Ada Kegiatan</h3>
            <p className="text-gray-500">Belum ada kegiatan terjadwal untuk tanggal ini.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jadwals.map((jadwal, index) => (
              <div
                key={jadwal.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Priority indicator bar */}
                <div className={`h-1.5 ${getPriorityIndicator(jadwal.prioritas)}`} />
                
                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded">
                          #{index + 1}
                        </span>
                        {jadwal.kategori && jadwal.kategori !== 'lainnya' && (
                          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded capitalize">
                            {jadwal.kategori}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">{jadwal.judul}</h3>
                    </div>
                    {getStatusBadge(jadwal.status)}
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    <div className="flex items-center gap-2.5 text-sm text-gray-600">
                      <LuClock className="w-4 h-4 text-teal-500 shrink-0" />
                      <div>
                        <span className="font-medium">{formatWaktu(jadwal.tanggal_mulai)}</span>
                        <span className="text-gray-400 mx-1">—</span>
                        <span className="font-medium">{formatWaktu(jadwal.tanggal_selesai)}</span>
                      </div>
                    </div>

                    {jadwal.lokasi && jadwal.lokasi !== '-' && (
                      <div className="flex items-center gap-2.5 text-sm text-gray-600">
                        <LuMapPin className="w-4 h-4 text-red-400 shrink-0" />
                        <span>{jadwal.lokasi}</span>
                      </div>
                    )}

                    {jadwal.bidang_nama && (
                      <div className="flex items-center gap-2.5 text-sm text-gray-600">
                        <LuBuilding2 className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>{jadwal.bidang_nama}</span>
                      </div>
                    )}

                    {jadwal.pic_name && jadwal.pic_name !== '-' && (
                      <div className="flex items-center gap-2.5 text-sm text-gray-600">
                        <LuUser className="w-4 h-4 text-purple-400 shrink-0" />
                        <span>{jadwal.pic_name}</span>
                        {jadwal.pic_contact && jadwal.pic_contact !== '-' && (
                          <span className="flex items-center gap-1 text-gray-400">
                            <LuPhone className="w-3 h-3" />
                            {jadwal.pic_contact}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {jadwal.deskripsi && jadwal.deskripsi !== '-' && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <p className="text-sm text-gray-600 leading-relaxed">{jadwal.deskripsi}</p>
                    </div>
                  )}

                  {/* Asal Kegiatan */}
                  {jadwal.asal_kegiatan && jadwal.asal_kegiatan !== '-' && (
                    <div className="mt-3">
                      <span className="text-xs text-gray-400">Asal kegiatan: </span>
                      <span className="text-xs font-medium text-gray-600">{jadwal.asal_kegiatan}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            DPMD Kabupaten Bogor &bull; Jadwal Kegiatan Harian
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicJadwalHarian;
