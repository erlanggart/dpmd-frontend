import React, { useEffect, useState, useMemo } from 'react';
import api from '../../../../api';
import Swal from 'sweetalert2';
import { Eye, Check, X, RefreshCw, MessageSquare, Filter, FileText, Info } from 'lucide-react';

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const STATUS_LABELS = { pending: 'Pending', verified: 'Disetujui', rejected: 'Ditolak', revision: 'Revisi' };
const STATUS_STYLES = {
  pending:  'bg-amber-100 text-amber-700 border-amber-300',
  verified: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  rejected: 'bg-red-100 text-red-700 border-red-300',
  revision: 'bg-orange-100 text-orange-700 border-orange-300',
};

const DpmdBankeuPerubahanLpjMonitoringPage = () => {
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [lpjList, setLpjList] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [verifyModal, setVerifyModal] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        api.get('/dpmd/bankeu-perubahan-lpj', { params: { tahun } }),
        api.get('/dpmd/bankeu-perubahan-lpj/statistics', { params: { tahun } }),
      ]);
      setLpjList(listRes.data?.data || []);
      setStats(statsRes.data?.data || {});
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [tahun]);

  const filtered = useMemo(() => {
    return lpjList.filter(l => filterStatus === 'all' || l.status === filterStatus);
  }, [lpjList, filterStatus]);

  // Group by desa
  const groupedByDesa = useMemo(() => {
    const groups = {};
    filtered.forEach(l => {
      const key = l.desa_id;
      if (!groups[key]) groups[key] = { desa_id: l.desa_id, desa_nama: l.desa_nama, kecamatan_nama: l.kecamatan_nama, items: [] };
      groups[key].items.push(l);
    });
    return Object.values(groups);
  }, [filtered]);

  const openVerify = (item, status) => setVerifyModal({ item, status, catatan: '' });

  const submitVerify = async () => {
    if (!verifyModal) return;
    const { item, status, catatan } = verifyModal;
    if ((status === 'rejected' || status === 'revision') && !catatan.trim()) {
      return Swal.fire('Validasi', 'Catatan wajib diisi', 'warning');
    }
    try {
      await api.patch(`/dpmd/bankeu-perubahan-lpj/${item.id}/verify`, { status, catatan });
      Swal.fire('Berhasil', 'Verifikasi LPJ tersimpan', 'success');
      setVerifyModal(null);
      fetchData();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal verifikasi', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-600" />
              Monitoring LPJ Bankeu Perubahan
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={tahun}
                onChange={e => setTahun(parseInt(e.target.value))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="2026">TA 2026</option>
                <option value="2027">TA 2027</option>
              </select>
              <button onClick={fetchData} className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-4">
            <StatCard label="Total File" value={stats.total_files || 0} color="bg-gray-50 text-gray-700" />
            <StatCard label="Total Desa" value={stats.total_desa || 0} color="bg-blue-50 text-blue-700" />
            <StatCard label="Pending" value={stats.pending || 0} color="bg-amber-50 text-amber-700" />
            <StatCard label="Verified" value={stats.verified || 0} color="bg-emerald-50 text-emerald-700" />
            <StatCard label="Rejected" value={stats.rejected || 0} color="bg-red-50 text-red-700" />
            <StatCard label="Revision" value={stats.revision || 0} color="bg-orange-50 text-orange-700" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-5 flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
            <option value="revision">Revision</option>
          </select>
          <span className="ml-auto text-xs text-gray-500">
            {filtered.length} file dari {lpjList.length}
          </span>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">Memuat...</div>
        ) : groupedByDesa.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <Info className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600 font-medium">Tidak ada LPJ yang sesuai filter</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedByDesa.map(group => (
              <div key={group.desa_id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                <div className="mb-3">
                  <h3 className="font-bold text-gray-800">Desa {group.desa_nama}</h3>
                  <p className="text-xs text-gray-500">Kecamatan {group.kecamatan_nama} · {group.items.length} file</p>
                </div>
                <div className="space-y-2">
                  {group.items.map(item => (
                    <div key={item.id} className="border border-gray-100 rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <FileText className="w-5 h-5 text-orange-500 flex-shrink-0" />
                          <span className="font-semibold text-gray-800 text-sm truncate">{item.nama_file}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border ${STATUS_STYLES[item.status] || 'bg-gray-100 border-gray-300'}`}>
                            {STATUS_LABELS[item.status] || item.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(item.created_at).toLocaleString('id-ID')}
                          {item.file_size && ` · ${(item.file_size / 1024 / 1024).toFixed(2)} MB`}
                        </div>
                        {item.keterangan && <div className="text-xs text-gray-600 mt-1">{item.keterangan}</div>}
                        {item.dpmd_catatan && (
                          <div className="text-xs bg-purple-50 border border-purple-200 rounded p-1.5 mt-2 text-purple-800">
                            <strong>Catatan:</strong> {item.dpmd_catatan}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0 flex-wrap">
                        <a
                          href={`${imageBaseUrl}/storage/uploads/${item.file_path}`}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </a>
                        {item.status === 'pending' && (
                          <>
                            <button onClick={() => openVerify(item, 'verified')} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => openVerify(item, 'revision')} className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold rounded-lg">
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => openVerify(item, 'rejected')} className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {verifyModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-800">
                  {verifyModal.status === 'verified' ? 'Setujui' : verifyModal.status === 'revision' ? 'Minta Revisi' : 'Tolak'} LPJ
                </h3>
                <p className="text-xs text-gray-500 mt-1">{verifyModal.item.nama_file}</p>
              </div>
              <div className="px-6 py-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Catatan {verifyModal.status !== 'verified' && '*'}</label>
                <textarea
                  value={verifyModal.catatan}
                  onChange={e => setVerifyModal({ ...verifyModal, catatan: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
                <button onClick={() => setVerifyModal(null)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-100">Batal</button>
                <button
                  onClick={submitVerify}
                  className={`px-4 py-2 text-white font-semibold rounded-xl shadow-sm ${
                    verifyModal.status === 'verified' ? 'bg-emerald-600 hover:bg-emerald-700' :
                    verifyModal.status === 'revision' ? 'bg-orange-600 hover:bg-orange-700' :
                    'bg-red-600 hover:bg-red-700'
                  }`}
                >Simpan</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ label, value, color }) => (
  <div className={`rounded-xl p-3 ${color}`}>
    <div className="text-xs font-semibold opacity-70">{label}</div>
    <div className="text-2xl font-bold mt-1">{value}</div>
  </div>
);

export default DpmdBankeuPerubahanLpjMonitoringPage;
