import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Edit2, Trash2, Search, Building2, X, Save,
  MapPin, User, CreditCard, RefreshCw, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../../api';

const formatRupiah = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

const EMPTY_FORM = {
  nama: '',
  alamat: '',
  npwp: '',
  nama_direktur: '',
  jabatan_direktur: 'Direktur',
  no_rekening: '',
  nama_bank: '',
  telepon: '',
  email: '',
};

const PenyediaModal = ({ open, onClose, data, onSaved }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(data ? { ...EMPTY_FORM, ...data } : EMPTY_FORM);
    }
  }, [open, data]);

  const handleSubmit = async () => {
    if (!form.nama?.trim()) {
      toast.error('Nama perusahaan wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (data?.id) {
        await api.put(`/penyedia/${data.id}`, payload);
        toast.success('Penyedia berhasil diperbarui');
      } else {
        await api.post('/penyedia', payload);
        toast.success('Penyedia berhasil ditambahkan');
      }
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan penyedia');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-cyan-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-md">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{data ? 'Edit Penyedia' : 'Tambah Penyedia'}</h3>
              <p className="text-[11px] text-gray-500">Master data pihak ketiga / vendor</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/60 transition">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-[11.5px] font-semibold text-gray-700 mb-1.5 block">Nama Perusahaan *</label>
            <input
              type="text"
              value={form.nama}
              onChange={e => setForm({ ...form, nama: e.target.value })}
              placeholder="CV. Vertinova Group"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>
          <div>
            <label className="text-[11.5px] font-semibold text-gray-700 mb-1.5 block">Alamat Lengkap</label>
            <textarea
              value={form.alamat || ''}
              onChange={e => setForm({ ...form, alamat: e.target.value })}
              rows="2"
              placeholder="Jl. ..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11.5px] font-semibold text-gray-700 mb-1.5 block">NPWP</label>
              <input
                type="text"
                value={form.npwp || ''}
                onChange={e => setForm({ ...form, npwp: e.target.value })}
                placeholder="01.234.567.8-404.000"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <div>
              <label className="text-[11.5px] font-semibold text-gray-700 mb-1.5 block">Nama Direktur</label>
              <input
                type="text"
                value={form.nama_direktur || ''}
                onChange={e => setForm({ ...form, nama_direktur: e.target.value })}
                placeholder="Nama Direktur"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11.5px] font-semibold text-gray-700 mb-1.5 block">No. Rekening</label>
              <input
                type="text"
                value={form.no_rekening || ''}
                onChange={e => setForm({ ...form, no_rekening: e.target.value })}
                placeholder="0131422555001"
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <div>
              <label className="text-[11.5px] font-semibold text-gray-700 mb-1.5 block">Nama Bank</label>
              <input
                type="text"
                value={form.nama_bank || ''}
                onChange={e => setForm({ ...form, nama_bank: e.target.value })}
                placeholder="Bank Jabar Banten"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11.5px] font-semibold text-gray-700 mb-1.5 block">Telepon</label>
              <input
                type="text"
                value={form.telepon || ''}
                onChange={e => setForm({ ...form, telepon: e.target.value })}
                placeholder="0251xxxxxx"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <div>
              <label className="text-[11.5px] font-semibold text-gray-700 mb-1.5 block">Email</label>
              <input
                type="email"
                value={form.email || ''}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="info@perusahaan.com"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50">
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
};

const PenyediaPage = () => {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/penyedia');
      setList(res.data.data || []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal memuat daftar penyedia');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  const filtered = useMemo(() => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(p =>
      (p.nama || '').toLowerCase().includes(q) ||
      (p.nama_direktur || '').toLowerCase().includes(q)
    );
  }, [search, list]);

  const handleDelete = async (p) => {
    if (!window.confirm(`Hapus penyedia "${p.nama}"?`)) return;
    try {
      await api.delete(`/penyedia/${p.id}`);
      toast.success('Penyedia berhasil dihapus');
      fetchList();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menghapus penyedia');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-white to-cyan-50/30 p-4 sm:p-6">
      <div className="w-full">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-700 mb-3 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-md shadow-blue-200/50">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Master Penyedia</h1>
            </div>
            <p className="text-sm text-gray-500 ml-13">
              Daftar pihak ketiga / vendor rekanan DPMD
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchList}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:border-blue-300 transition disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => { setEditData(null); setModalOpen(true); }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-200/50 hover:shadow-lg transition-all"
            >
              <Plus className="h-4 w-4" />
              Tambah Penyedia
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-3 mb-4 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama perusahaan atau direktur…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {search ? 'Tidak ada penyedia yang cocok' : 'Belum ada penyedia. Tambahkan yang pertama!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(p => (
              <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-sm shrink-0">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-[15px] leading-tight">{p.nama}</h3>
                      {p.npwp && <p className="text-[10.5px] text-gray-400 font-mono mt-0.5">NPWP {p.npwp}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditData(p); setModalOpen(true); }}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-blue-700 hover:bg-blue-50"
                      title="Edit"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-rose-700 hover:bg-rose-50"
                      title="Hapus"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5 text-[11.5px]">
                  {p.alamat && (
                    <div className="flex items-start gap-2 text-gray-600">
                      <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                      <span className="leading-snug">{p.alamat}</span>
                    </div>
                  )}
                  {p.nama_direktur && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span><span className="text-gray-400">{p.jabatan_direktur || 'Direktur'}:</span> <span className="font-semibold text-gray-800">{p.nama_direktur}</span></span>
                    </div>
                  )}
                  {p.no_rekening && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <CreditCard className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="font-mono">{p.no_rekening}</span>
                      {p.nama_bank && <><span className="text-gray-400">•</span><span>{p.nama_bank}</span></>}
                    </div>
                  )}
                </div>
                {p.total_transaksi !== undefined && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px]">
                    <span className="text-gray-500">
                      <span className="font-bold text-gray-800">{p.total_transaksi}</span> transaksi
                    </span>
                    {!p.is_active && (
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Nonaktif</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <PenyediaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        data={editData}
        onSaved={fetchList}
      />
    </div>
  );
};

export default PenyediaPage;
