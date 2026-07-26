import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Search, FileText, Eye, Edit2, Trash2,
  Calendar, Package, Building2, CheckCircle2,
  Clock, AlertCircle, Loader2, RefreshCw, Archive, ArchiveRestore,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../../api';
import { confirmDialog } from '../../../../utils/confirmDialog';

const formatRupiah = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

const StatusBadge = ({ status }) => {
  const config = {
    draft: { label: 'Draft', icon: Clock, color: 'bg-amber-100 text-amber-700 border-amber-200' },
    finalized: { label: 'Final', icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    cancelled: { label: 'Diarsipkan', icon: Archive, color: 'bg-gray-100 text-gray-600 border-gray-200' },
  }[status] || { label: status, icon: AlertCircle, color: 'bg-gray-100 text-gray-700 border-gray-200' };
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10.5px] font-semibold ${config.color}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
};

const PencairanAtkListPage = () => {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = { jenis: 'atk' };
      if (filterStatus !== 'all') params.status = filterStatus;
      const res = await api.get('/pencairan', { params });
      setList(res.data.data || []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal memuat daftar pencairan');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const filtered = useMemo(() => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(p =>
      (p.no_pesanan_b || '').toLowerCase().includes(q) ||
      (p.uraian_kegiatan || '').toLowerCase().includes(q) ||
      (p.penyedia?.nama || '').toLowerCase().includes(q)
    );
  }, [search, list]);

  const totalNilai = useMemo(() => filtered.reduce((s, p) => s + (p.total_nilai || 0), 0), [filtered]);

  const handleDelete = async (p) => {
    const ok = await confirmDialog({
      title: `Hapus pencairan ${p.no_pesanan_b || `#${p.id}`}?`,
      text: 'Tindakan ini permanen dan tidak bisa dibatalkan.',
      icon: 'warning',
      confirmText: 'Ya, Hapus',
      confirmColor: '#dc2626',
    });
    if (!ok) return;
    try {
      await api.delete(`/pencairan/${p.id}`);
      toast.success('Pencairan berhasil dihapus');
      fetchList();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menghapus');
    }
  };

  const handleArchive = async (p) => {
    const ok = await confirmDialog({
      title: `Arsipkan pencairan ${p.no_pesanan_b || `#${p.id}`}?`,
      text: 'Data tetap tersimpan dan bisa dipulihkan kapan saja.',
      icon: 'warning',
      confirmText: 'Ya, Arsipkan',
      confirmColor: '#d97706',
    });
    if (!ok) return;
    try {
      await api.post(`/pencairan/${p.id}/cancel`);
      toast.success('Pencairan diarsipkan');
      fetchList();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal mengarsipkan');
    }
  };

  const handleRestore = async (p) => {
    const ok = await confirmDialog({
      title: `Pulihkan pencairan ${p.no_pesanan_b || `#${p.id}`}?`,
      text: 'Pencairan akan dikembalikan dari arsip ke status semula.',
      icon: 'question',
      confirmText: 'Ya, Pulihkan',
      confirmColor: '#059669',
    });
    if (!ok) return;
    try {
      const res = await api.post(`/pencairan/${p.id}/restore`);
      toast.success(res.data?.message || 'Pencairan dipulihkan');
      fetchList();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal memulihkan');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/30 via-white to-emerald-50/30 p-4 sm:p-6">
      <div className="w-full">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-teal-700 mb-3 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-md shadow-teal-200/50">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Pencairan ATK</h1>
              </div>
              <p className="text-sm text-gray-500 ml-13">
                Realisasi belanja Alat Tulis Kantor — dari pesanan hingga serah terima
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchList}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:border-teal-300 transition disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => navigate('../penyedia', { relative: 'path' })}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:border-teal-300 hover:text-teal-700 transition-colors"
              >
                <Building2 className="h-4 w-4" />
                Master Penyedia
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl bg-white border border-gray-100 p-4 shadow-sm">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-gray-500">Total Pencairan</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{filtered.length}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100 p-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-teal-700">Total Nilai</p>
            <p className="text-lg font-bold text-teal-800 mt-1">{formatRupiah(totalNilai)}</p>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-amber-700">Draft</p>
            <p className="text-2xl font-bold text-amber-800 mt-1">{list.filter(p => p.status === 'draft').length}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-emerald-700">Final</p>
            <p className="text-2xl font-bold text-emerald-800 mt-1">{list.filter(p => p.status === 'finalized').length}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-3 mb-4 flex items-center gap-2 flex-wrap shadow-sm">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nomor, kegiatan, atau penyedia…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition"
          >
            <option value="all">Semua Status</option>
            <option value="draft">Draft</option>
            <option value="finalized">Final</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm mb-4">
                {search || filterStatus !== 'all' ? 'Tidak ada pencairan yang sesuai filter' : 'Belum ada pencairan ATK'}
              </p>
              {!search && filterStatus === 'all' && (
                <p className="text-[12px] text-gray-400">
                  Buat pencairan dari halaman detail sub kegiatan
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Nomor & Tgl Pesanan</th>
                    <th className="px-4 py-3 text-left">Kegiatan</th>
                    <th className="px-4 py-3 text-left">Penyedia</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-center">Item</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(p => (
                    <tr key={p.id} className="hover:bg-teal-50/40 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-mono text-[12.5px] text-gray-800 font-semibold">
                          {p.no_pesanan_b || `#${p.id}`}
                        </p>
                        <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {p.tgl_pesanan
                            ? new Date(p.tgl_pesanan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                            : 'Belum diisi'}
                        </p>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-gray-800 leading-snug line-clamp-2">
                          {p.uraian_kegiatan || p.master_kegiatan?.nama_sub_kegiatan || '—'}
                        </p>
                        <p className="text-[10.5px] text-gray-400 mt-0.5">{p.bidang?.nama}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{p.penyedia?.nama || '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">{formatRupiah(p.total_nilai)}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{p.jumlah_item || 0}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`${p.id}`)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-teal-700 hover:bg-teal-50 transition"
                            title="Detail"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => navigate(`${p.id}/edit`)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-700 hover:bg-blue-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
                            title={p.status === 'draft' ? 'Edit' : 'Hanya draft yang bisa diedit'}
                            disabled={p.status !== 'draft'}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          {p.status === 'cancelled' ? (
                            <button
                              onClick={() => handleRestore(p)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 transition"
                              title="Pulihkan dari arsip"
                            >
                              <ArchiveRestore className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleArchive(p)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-amber-700 hover:bg-amber-50 transition"
                              title="Arsipkan"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(p)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-rose-700 hover:bg-rose-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
                            title={p.status === 'finalized' || p.finalized_at ? 'Pencairan final tidak bisa dihapus — arsipkan saja' : 'Hapus'}
                            disabled={p.status === 'finalized' || !!p.finalized_at}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PencairanAtkListPage;
