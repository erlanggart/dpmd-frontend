import React, { useState, useEffect } from 'react';
import api from '../../../api';
import Swal from 'sweetalert2';
import { LuCheck, LuX, LuClock, LuEye, LuFileText, LuChevronDown, LuChevronRight, LuFilter } from 'react-icons/lu';

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const KecamatanReviewSuratPage = () => {
  const [suratList, setSuratList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected
  const [expandedRows, setExpandedRows] = useState([]);
  const [tahun, setTahun] = useState(2025);
  const [stats, setStats] = useState({
    total_surat: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    menunggu_review: 0
  });

  useEffect(() => {
    fetchData();
  }, [filter, tahun]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = { tahun };
      if (filter !== 'all') {
        params.status = filter;
      }

      const [suratRes, statsRes] = await Promise.all([
        api.get('/kecamatan/bankeu/surat', { params }),
        api.get('/kecamatan/bankeu/surat/statistics', { params: { tahun } })
      ]);

      setSuratList(suratRes.data.data || []);
      setStats(statsRes.data.data || {});
    } catch (error) {
      console.error('Error fetching surat:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Gagal memuat data surat'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (suratId, status, catatan = '') => {
    // Validasi catatan jika reject
    if (status === 'rejected' && !catatan.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Catatan Wajib',
        text: 'Silakan isi catatan penolakan terlebih dahulu'
      });
      return;
    }

    const actionText = status === 'approved' ? 'Setujui' : 'Tolak';
    const result = await Swal.fire({
      title: `${actionText} Surat?`,
      text: `Anda akan ${actionText.toLowerCase()} surat ini. Proses tidak dapat dibatalkan!`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: status === 'approved' ? '#10b981' : '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Ya, ${actionText}!`,
      cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) return;

    try {
      Swal.fire({
        title: `Memproses review...`,
        text: 'Mohon tunggu',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      await api.post(`/kecamatan/bankeu/surat/${suratId}/review`, {
        status,
        catatan: catatan || null
      });

      await fetchData();

      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: `Surat berhasil di-${actionText.toLowerCase()}`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error reviewing surat:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Gagal melakukan review'
      });
    }
  };

  const showReviewModal = (surat, action) => {
    const isApprove = action === 'approved';
    
    Swal.fire({
      title: `${isApprove ? 'Setujui' : 'Tolak'} Surat ${surat.nama_desa}?`,
      html: `
        <div class="text-left space-y-3">
          <div class="p-3 bg-gray-100 rounded-lg">
            <p class="text-sm font-semibold text-gray-700">Desa:</p>
            <p class="text-sm text-gray-900">${surat.nama_desa}</p>
          </div>
          ${!isApprove ? `
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Alasan Penolakan <span class="text-red-500">*</span>
              </label>
              <textarea 
                id="catatan-input" 
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" 
                rows="4" 
                placeholder="Jelaskan alasan penolakan..."
              ></textarea>
            </div>
          ` : ''}
        </div>
      `,
      icon: isApprove ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonColor: isApprove ? '#10b981' : '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: isApprove ? 'Ya, Setujui' : 'Ya, Tolak',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        if (!isApprove) {
          const catatan = document.getElementById('catatan-input').value;
          if (!catatan.trim()) {
            Swal.showValidationMessage('Catatan penolakan wajib diisi');
            return false;
          }
          return catatan;
        }
        return '';
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const catatan = result.value || '';
        handleReview(surat.id, action, catatan);
      }
    });
  };

  const toggleRow = (id) => {
    setExpandedRows(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { icon: LuClock, text: 'Menunggu Review', color: 'bg-amber-100 text-amber-700', iconColor: 'text-amber-600' },
      approved: { icon: LuCheck, text: 'Disetujui', color: 'bg-green-100 text-green-700', iconColor: 'text-green-600' },
      rejected: { icon: LuX, text: 'Ditolak', color: 'bg-red-100 text-red-700', iconColor: 'text-red-600' }
    };
    
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${badge.color}`}>
        <Icon className={`w-4 h-4 ${badge.iconColor}`} />
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Memuat data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Review Surat Desa</h1>
            <p className="text-gray-600">Review Surat Pengantar dan Surat Permohonan Proposal Bantuan Keuangan</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={tahun}
              onChange={(e) => setTahun(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
            <div className="text-sm font-semibold text-blue-700 mb-1">Total Surat</div>
            <div className="text-3xl font-bold text-blue-900">{stats.total_surat || 0}</div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200">
            <div className="text-sm font-semibold text-amber-700 mb-1">Menunggu Review</div>
            <div className="text-3xl font-bold text-amber-900">{stats.menunggu_review || 0}</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
            <div className="text-sm font-semibold text-green-700 mb-1">Disetujui</div>
            <div className="text-3xl font-bold text-green-900">{stats.approved || 0}</div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
            <div className="text-sm font-semibold text-red-700 mb-1">Ditolak</div>
            <div className="text-3xl font-bold text-red-900">{stats.rejected || 0}</div>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
            <div className="text-sm font-semibold text-gray-700 mb-1">Pending</div>
            <div className="text-3xl font-bold text-gray-900">{stats.pending || 0}</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mt-6 flex items-center gap-2 flex-wrap">
          <LuFilter className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700 mr-2">Filter:</span>
          {[
            { value: 'all', label: 'Semua', count: stats.total_surat },
            { value: 'pending', label: 'Menunggu Review', count: stats.menunggu_review },
            { value: 'approved', label: 'Disetujui', count: stats.approved },
            { value: 'rejected', label: 'Ditolak', count: stats.rejected }
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                filter === tab.value
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label} ({tab.count || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Surat List */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
        {suratList.length === 0 ? (
          <div className="p-12 text-center">
            <LuFileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Tidak Ada Surat</h3>
            <p className="text-sm text-gray-600">
              {filter === 'all' 
                ? 'Belum ada surat yang dikirim dari desa'
                : `Tidak ada surat dengan status "${filter}"`
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {suratList.map((surat) => {
              const isExpanded = expandedRows.includes(surat.id);
              return (
                <div key={surat.id} className="hover:bg-gray-50 transition-colors">
                  {/* Row Header */}
                  <div className="p-5 flex items-center justify-between cursor-pointer" onClick={() => toggleRow(surat.id)}>
                    <div className="flex items-center gap-4 flex-1">
                      <button className="text-gray-500 hover:text-gray-700">
                        {isExpanded ? <LuChevronDown className="w-5 h-5" /> : <LuChevronRight className="w-5 h-5" />}
                      </button>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">{surat.nama_desa}</h3>
                        <p className="text-sm text-gray-600">
                          Kode: {surat.kode_desa} | Dikirim: {new Date(surat.submitted_at).toLocaleString('id-ID')}
                        </p>
                      </div>
                      {getStatusBadge(surat.kecamatan_status)}
                    </div>
                  </div>

                  {/* Row Detail */}
                  {isExpanded && (
                    <div className="px-5 pb-5 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* Surat Pengantar */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-900">Surat Pengantar</h4>
                            {surat.surat_pengantar && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Tersedia</span>
                            )}
                          </div>
                          {surat.surat_pengantar ? (
                            <a
                              href={`${imageBaseUrl}/storage/uploads/bankeu/${surat.surat_pengantar}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                            >
                              <LuEye className="w-4 h-4" />
                              Lihat PDF
                            </a>
                          ) : (
                            <p className="text-sm text-gray-500 italic">Belum diupload</p>
                          )}
                        </div>

                        {/* Surat Permohonan */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-900">Surat Permohonan</h4>
                            {surat.surat_permohonan && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Tersedia</span>
                            )}
                          </div>
                          {surat.surat_permohonan ? (
                            <a
                              href={`${imageBaseUrl}/storage/uploads/bankeu/${surat.surat_permohonan}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
                            >
                              <LuEye className="w-4 h-4" />
                              Lihat PDF
                            </a>
                          ) : (
                            <p className="text-sm text-gray-500 italic">Belum diupload</p>
                          )}
                        </div>
                      </div>

                      {/* Review Info */}
                      {surat.kecamatan_status !== 'pending' && (
                        <div className={`p-4 rounded-lg border-2 mb-4 ${
                          surat.kecamatan_status === 'approved' 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-red-50 border-red-200'
                        }`}>
                          <p className="text-sm font-semibold text-gray-700 mb-1">
                            Direview oleh: {surat.reviewer_name || 'Kecamatan'}
                          </p>
                          <p className="text-sm text-gray-600 mb-2">
                            {new Date(surat.kecamatan_reviewed_at).toLocaleString('id-ID')}
                          </p>
                          {surat.kecamatan_catatan && (
                            <div className="mt-2 p-3 bg-white rounded border border-gray-200">
                              <p className="text-sm font-semibold text-gray-700 mb-1">Catatan:</p>
                              <p className="text-sm text-gray-600">{surat.kecamatan_catatan}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      {surat.kecamatan_status === 'pending' && (
                        <div className="flex gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              showReviewModal(surat, 'approved');
                            }}
                            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
                          >
                            <LuCheck className="w-5 h-5" />
                            Setujui Surat
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              showReviewModal(surat, 'rejected');
                            }}
                            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
                          >
                            <LuX className="w-5 h-5" />
                            Tolak Surat
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default KecamatanReviewSuratPage;
