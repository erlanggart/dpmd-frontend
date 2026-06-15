import React, { useEffect, useState, useMemo } from 'react';
import api from '../../../../api';
import Swal from 'sweetalert2';
import { Eye, Check, X, RefreshCw, MessageSquare, Filter, FileText, Info, Building2 } from 'lucide-react';

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const STATUS_LABELS = { pending: 'Pending', verified: 'Disetujui', rejected: 'Ditolak', revision: 'Revisi' };
const STATUS_STYLES = {
  pending:  'bg-amber-50 text-amber-700 border-amber-200',
  verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  revision: 'bg-orange-50 text-orange-700 border-orange-200',
};

const inputCls = 'px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-shadow';

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

  const STAT_TILES = [
    { key: 'total_files', label: 'Total File', accent: 'text-slate-800', dot: 'bg-slate-300' },
    { key: 'total_desa',  label: 'Total Desa', accent: 'text-indigo-600', dot: 'bg-indigo-400' },
    { key: 'pending',     label: 'Pending', accent: 'text-amber-600', dot: 'bg-amber-400' },
    { key: 'verified',    label: 'Disetujui', accent: 'text-emerald-600', dot: 'bg-emerald-400' },
    { key: 'rejected',    label: 'Ditolak', accent: 'text-rose-600', dot: 'bg-rose-400' },
    { key: 'revision',    label: 'Revisi', accent: 'text-orange-600', dot: 'bg-orange-400' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header + stats */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 flex-shrink-0 rounded-xl bg-indigo-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Monitoring LPJ Bankeu Perubahan</h2>
                <p className="text-sm text-slate-500 mt-0.5">Laporan pertanggungjawaban per desa</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select value={tahun} onChange={e => setTahun(parseInt(e.target.value))} className={inputCls}>
                <option value="2026">TA 2026</option>
                <option value="2027">TA 2027</option>
              </select>
              <button
                onClick={fetchData}
                title="Muat ulang"
                className="inline-flex items-center justify-center w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-5">
            {STAT_TILES.map(t => (
              <div key={t.key} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} /> {t.label}
                </div>
                <div className={`text-2xl font-bold mt-1.5 tabular-nums ${t.accent}`}>{stats[t.key] || 0}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
            <Filter className="w-4 h-4 text-slate-400" /> Filter
          </span>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={inputCls}>
            <option value="all">Semua Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Disetujui</option>
            <option value="rejected">Ditolak</option>
            <option value="revision">Revisi</option>
          </select>
          <span className="ml-auto text-xs text-slate-500">
            {filtered.length} file dari {lpjList.length}
          </span>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-slate-400">Memuat…</div>
        ) : groupedByDesa.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
            <div className="inline-flex h-14 w-14 rounded-2xl bg-slate-100 items-center justify-center mb-3">
              <Info className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium">Tidak ada LPJ yang sesuai filter</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedByDesa.map(group => (
              <div key={group.desa_id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
                  <div className="h-9 w-9 flex-shrink-0 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 text-sm truncate">Desa {group.desa_nama}</h3>
                    <p className="text-xs text-slate-500">Kec. {group.kecamatan_nama} · {group.items.length} file</p>
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {group.items.map(item => (
                    <div key={item.id} className="px-4 py-3 flex items-start justify-between gap-3 flex-wrap hover:bg-slate-50/60 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <FileText className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                          <span className="font-semibold text-slate-800 text-sm truncate">{item.nama_file}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full border ${STATUS_STYLES[item.status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                            {STATUS_LABELS[item.status] || item.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {new Date(item.created_at).toLocaleString('id-ID')}
                          {item.file_size && ` · ${(item.file_size / 1024 / 1024).toFixed(2)} MB`}
                        </div>
                        {item.keterangan && <div className="text-xs text-slate-600 mt-1">{item.keterangan}</div>}
                        {item.dpmd_catatan && (
                          <div className="text-xs bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1.5 mt-2 text-indigo-800">
                            <strong>Catatan DPMD:</strong> {item.dpmd_catatan}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0 flex-wrap">
                        <a
                          href={`${imageBaseUrl}/storage/uploads/${item.file_path}`}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> Lihat
                        </a>
                        {item.status === 'pending' && (
                          <>
                            <button onClick={() => openVerify(item, 'verified')} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors">
                              <Check className="w-3.5 h-3.5" /> Setujui
                            </button>
                            <button onClick={() => openVerify(item, 'revision')} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold rounded-lg transition-colors">
                              <MessageSquare className="w-3.5 h-3.5" /> Revisi
                            </button>
                            <button onClick={() => openVerify(item, 'rejected')} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg transition-colors">
                              <X className="w-3.5 h-3.5" /> Tolak
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
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-900">
                  {verifyModal.status === 'verified' ? 'Setujui LPJ' : verifyModal.status === 'revision' ? 'Minta Revisi LPJ' : 'Tolak LPJ'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 truncate">{verifyModal.item.nama_file}</p>
              </div>
              <div className="px-6 py-4">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Catatan {verifyModal.status !== 'verified' && <span className="text-rose-500">*</span>}
                </label>
                <textarea
                  value={verifyModal.catatan}
                  onChange={e => setVerifyModal({ ...verifyModal, catatan: e.target.value })}
                  rows={4}
                  placeholder={verifyModal.status === 'verified' ? 'Catatan (opsional)…' : 'Tuliskan alasan / hal yang perlu diperbaiki…'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                />
              </div>
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
                <button onClick={() => setVerifyModal(null)} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-100 transition-colors">Batal</button>
                <button
                  onClick={submitVerify}
                  className={`px-4 py-2 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors ${
                    verifyModal.status === 'verified' ? 'bg-emerald-600 hover:bg-emerald-700' :
                    verifyModal.status === 'revision' ? 'bg-orange-600 hover:bg-orange-700' :
                    'bg-rose-600 hover:bg-rose-700'
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

export default DpmdBankeuPerubahanLpjMonitoringPage;
