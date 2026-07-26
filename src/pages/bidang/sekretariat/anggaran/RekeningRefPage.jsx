import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Tag, Loader2, Save, Search, ListFilter, RotateCcw, Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../../api';
import { useAuth } from '../../../../context/AuthContext';

const formatRupiah = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

const RekeningRefPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = ['bendahara', 'superadmin'].includes(user?.role);
  const [searchParams] = useSearchParams();
  const paguId = searchParams.get('pagu_id');
  const label = searchParams.get('label') || '';

  const [scope, setScope] = useState(paguId ? 'pagu' : 'all'); // 'pagu' | 'all'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState([]);       // {kode_rekening, nama_default, item_count, plafon, nama (edit)}
  const [initial, setInitial] = useState({}); // kode -> nama_custom awal
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (scope === 'pagu' && paguId) params.pagu_id = paguId;
      const res = await api.get('/rekening-ref/catalog', { params });
      const data = res.data?.data || [];
      setRows(data.map(r => ({ ...r, nama: r.nama_custom || '' })));
      setInitial(Object.fromEntries(data.map(r => [r.kode_rekening, r.nama_custom || ''])));
    } catch {
      toast.error('Gagal memuat daftar rekening');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [scope, paguId]);

  useEffect(() => { load(); }, [load]);

  const setNama = (kode, nama) => {
    setRows(prev => prev.map(r => (r.kode_rekening === kode ? { ...r, nama } : r)));
  };

  const dirtyRows = useMemo(
    () => rows.filter(r => (r.nama || '') !== (initial[r.kode_rekening] || '')),
    [rows, initial],
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r =>
      r.kode_rekening.toLowerCase().includes(s) ||
      (r.nama || '').toLowerCase().includes(s) ||
      (r.nama_default || '').toLowerCase().includes(s));
  }, [rows, q]);

  const handleSave = async () => {
    if (dirtyRows.length === 0) return;
    setSaving(true);
    try {
      const payload = { rows: dirtyRows.map(r => ({ kode_rekening: r.kode_rekening, nama: r.nama })) };
      const res = await api.put('/rekening-ref', payload);
      toast.success(res.data?.message || 'Nama rekening tersimpan');
      setInitial(prev => {
        const next = { ...prev };
        dirtyRows.forEach(r => { next[r.kode_rekening] = r.nama || ''; });
        return next;
      });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 py-6 space-y-5 w-full">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate(-1)}
          className="mt-0.5 p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-amber-500" />
            <h1 className="text-base font-bold text-gray-900">Pengaturan Nama Rekening</h1>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Beri nama sendiri untuk tiap kode rekening. Nama ini dipakai di Anggaran Kas & laporan.
            {label && <> Konteks: <span className="font-semibold text-gray-700">{label}</span></>}
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-[12px] text-amber-800">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Kolom <b>Nama Bawaan</b> berasal dari Bagan Akun Standar (Permendagri 90/2019). Isi <b>Nama Custom</b>
          {' '}untuk menimpanya. Kosongkan Nama Custom lalu simpan untuk mengembalikan ke nama bawaan.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari kode / nama rekening…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-amber-400 focus:ring-1 focus:ring-amber-200 outline-none"
          />
        </div>
        {paguId && (
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden text-xs font-semibold">
            <button
              onClick={() => setScope('pagu')}
              className={`inline-flex items-center gap-1 px-3 py-2 transition-colors ${scope === 'pagu' ? 'bg-amber-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <ListFilter className="h-3.5 w-3.5" /> Sub Kegiatan Ini
            </button>
            <button
              onClick={() => setScope('all')}
              className={`px-3 py-2 transition-colors ${scope === 'all' ? 'bg-amber-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Semua Rekening
            </button>
          </div>
        )}
        <button
          onClick={load}
          className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
          title="Muat ulang"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        {canEdit && (
          <button
            onClick={handleSave}
            disabled={saving || dirtyRows.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan{dirtyRows.length > 0 ? ` (${dirtyRows.length})` : ''}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 text-gray-400 text-sm">
            <Tag className="h-8 w-8 mx-auto mb-2 opacity-30" />
            {rows.length === 0 ? 'Belum ada kode rekening pada data RKA' : 'Tidak ada yang cocok dengan pencarian'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-[10.5px] uppercase tracking-wider text-gray-500 font-semibold">
                <tr>
                  <th className="px-4 py-2.5 text-left">Kode Rekening</th>
                  <th className="px-4 py-2.5 text-left">Nama Bawaan</th>
                  <th className="px-4 py-2.5 text-left">Nama Custom</th>
                  <th className="px-4 py-2.5 text-center">Item</th>
                  <th className="px-4 py-2.5 text-right">Plafon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => {
                  const isDirty = (r.nama || '') !== (initial[r.kode_rekening] || '');
                  return (
                    <tr key={r.kode_rekening} className={`transition-colors ${isDirty ? 'bg-amber-50/40' : 'hover:bg-gray-50/60'}`}>
                      <td className="px-4 py-2.5 font-mono text-[11.5px] text-gray-700 whitespace-nowrap">{r.kode_rekening}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-[12px]">{r.nama_default || <span className="italic text-gray-300">—</span>}</td>
                      <td className="px-4 py-2.5">
                        <input
                          value={r.nama}
                          disabled={!canEdit}
                          onChange={(e) => setNama(r.kode_rekening, e.target.value)}
                          placeholder={r.nama_default || 'Beri nama…'}
                          className={`w-full min-w-[220px] px-3 py-1.5 text-[12.5px] rounded-md border transition ${
                            canEdit
                              ? 'bg-white border-gray-200 text-gray-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-200 outline-none'
                              : 'bg-gray-50 border-gray-100 text-gray-500'}`}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-center text-gray-600 text-[12px]">{r.item_count}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700 tabular-nums text-[12px]">{formatRupiah(r.plafon)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RekeningRefPage;
