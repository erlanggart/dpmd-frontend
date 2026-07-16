import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBidangPath } from '../../../../hooks/useBidangPath';
import {
  ArrowLeft, Plus, Search, Package, QrCode, ScanLine, MapPin, ChevronLeft, ChevronRight,
  CheckCircle2, AlertTriangle, XCircle, Archive, ImageOff, Filter, X
} from 'lucide-react';
import api from '../../../../api';
import toast from 'react-hot-toast';
import { fotoUrl, KONDISI, formatRupiah } from './arsipBarangUtils';

const ArsipBarangPage = () => {
  const navigate = useNavigate();
  const { getPath } = useBidangPath();

  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [kategoriList, setKategoriList] = useState([]);
  const [lokasiList, setLokasiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });
  const [filterTerbuka, setFilterTerbuka] = useState(false);

  const [q, setQ] = useState('');
  const [cari, setCari] = useState(''); // nilai yang benar-benar dikirim (debounced)
  const [filter, setFilter] = useState({ kategori_id: '', kondisi: '', status: 'aktif', lokasi: '' });

  // Debounce: jangan tembak API tiap ketukan tombol
  useEffect(() => {
    const t = setTimeout(() => {
      setCari(q);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [q]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (cari.trim()) params.q = cari.trim();
      Object.entries(filter).forEach(([k, v]) => {
        if (v) params[k] = v;
      });

      const res = await api.get('/arsip-barang', { params });
      if (res.data.success) {
        setItems(res.data.data || []);
        setPagination(res.data.pagination || { total: 0, total_pages: 1 });
      }
    } catch (error) {
      console.error('Error fetching arsip barang:', error);
      toast.error('Gagal memuat data barang');
    } finally {
      setLoading(false);
    }
  }, [page, cari, filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const fetchPendukung = async () => {
      try {
        const [s, k, l] = await Promise.all([
          api.get('/arsip-barang/stats'),
          api.get('/arsip-barang/kategori'),
          api.get('/arsip-barang/lokasi')
        ]);
        if (s.data.success) setStats(s.data.data);
        if (k.data.success) setKategoriList(k.data.data || []);
        if (l.data.success) setLokasiList(l.data.data || []);
      } catch (error) {
        console.error('Error fetching pendukung:', error);
      }
    };
    fetchPendukung();
  }, []);

  const resetFilter = () => {
    setFilter({ kategori_id: '', kondisi: '', status: 'aktif', lokasi: '' });
    setQ('');
    setPage(1);
  };

  const filterAktif =
    filter.kategori_id || filter.kondisi || filter.lokasi || filter.status !== 'aktif' || cari;

  const kartuStat = [
    { label: 'Total Barang', nilai: stats?.total ?? 0, Icon: Package, warna: 'from-purple-500 to-purple-600' },
    { label: 'Kondisi Baik', nilai: stats?.kondisi?.baik ?? 0, Icon: CheckCircle2, warna: 'from-emerald-500 to-emerald-600' },
    { label: 'Rusak Ringan', nilai: stats?.kondisi?.rusak_ringan ?? 0, Icon: AlertTriangle, warna: 'from-amber-500 to-amber-600' },
    { label: 'Rusak Berat', nilai: stats?.kondisi?.rusak_berat ?? 0, Icon: XCircle, warna: 'from-red-500 to-red-600' },
    { label: 'Total Scan', nilai: stats?.total_scan ?? 0, Icon: ScanLine, warna: 'from-blue-500 to-blue-600' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate(getPath('/sekretariat'))}
            className="mb-4 flex items-center gap-2 text-purple-100 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Kembali
          </button>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Package className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Arsip Barang</h1>
                <p className="text-purple-100 mt-1">Inventaris aset dengan label QR untuk pelacakan</p>
              </div>
            </div>

            <button
              onClick={() => navigate(getPath('/sekretariat/arsip-barang/baru'))}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-purple-700 hover:bg-purple-50 rounded-xl font-semibold transition-colors shadow-lg"
            >
              <Plus className="h-5 w-5" />
              Tambah Barang
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Statistik */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {kartuStat.map(({ label, nilai, Icon, warna }) => (
            <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${warna} flex items-center justify-center mb-3 shadow-md`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-gray-800">{nilai}</p>
              <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {stats?.total_nilai_perolehan > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm text-gray-500">Total nilai perolehan barang aktif</span>
            <span className="text-lg font-bold text-gray-800">{formatRupiah(stats.total_nilai_perolehan)}</span>
          </div>
        )}

        {/* Pencarian & filter */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari nama, kode barang, merk, nomor seri, atau lokasi..."
                className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
            </div>

            <button
              onClick={() => setFilterTerbuka((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                filterTerbuka || filterAktif
                  ? 'bg-purple-50 border-purple-300 text-purple-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filter
            </button>

            {filterAktif && (
              <button
                onClick={resetFilter}
                className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
              >
                <X className="h-4 w-4" />
                Reset
              </button>
            )}
          </div>

          {filterTerbuka && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
              <select
                value={filter.kategori_id}
                onChange={(e) => { setFilter((f) => ({ ...f, kategori_id: e.target.value })); setPage(1); }}
                className="px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm"
              >
                <option value="">Semua Kategori</option>
                {kategoriList.map((k) => (
                  <option key={k.id} value={k.id}>{k.nama}</option>
                ))}
              </select>

              <select
                value={filter.kondisi}
                onChange={(e) => { setFilter((f) => ({ ...f, kondisi: e.target.value })); setPage(1); }}
                className="px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm"
              >
                <option value="">Semua Kondisi</option>
                {Object.entries(KONDISI).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>

              <select
                value={filter.lokasi}
                onChange={(e) => { setFilter((f) => ({ ...f, lokasi: e.target.value })); setPage(1); }}
                className="px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm"
              >
                <option value="">Semua Lokasi</option>
                {lokasiList.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>

              <select
                value={filter.status}
                onChange={(e) => { setFilter((f) => ({ ...f, status: e.target.value })); setPage(1); }}
                className="px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm"
              >
                <option value="aktif">Status: Aktif</option>
                <option value="dihapuskan">Status: Dihapuskan</option>
                <option value="">Semua Status</option>
              </select>
            </div>
          )}
        </div>

        {/* Daftar barang */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-16 px-4">
            <Archive className="h-14 w-14 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-700 font-semibold text-lg">
              {filterAktif ? 'Tidak ada barang yang cocok' : 'Belum ada barang terdaftar'}
            </p>
            <p className="text-gray-500 text-sm mt-1 mb-5">
              {filterAktif
                ? 'Coba ubah kata kunci atau reset filter.'
                : 'Mulai dengan mendaftarkan barang pertama, foto, lalu cetak label QR-nya.'}
            </p>
            {!filterAktif && (
              <button
                onClick={() => navigate(getPath('/sekretariat/arsip-barang/baru'))}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
              >
                <Plus className="h-5 w-5" />
                Tambah Barang
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((b) => {
              const kondisi = KONDISI[b.kondisi] || KONDISI.baik;
              return (
                <button
                  key={b.id}
                  onClick={() => navigate(getPath(`/sekretariat/arsip-barang/${b.id}`))}
                  className="group bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 hover:border-purple-200 overflow-hidden text-left transition-all duration-300 hover:-translate-y-0.5"
                >
                  <div className="relative h-40 bg-gray-100 overflow-hidden">
                    {b.foto ? (
                      <img
                        src={fotoUrl(b.foto)}
                        alt={b.nama}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                        <ImageOff className="h-9 w-9 mb-1" />
                        <span className="text-xs">Tanpa foto</span>
                      </div>
                    )}

                    <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-semibold border backdrop-blur-sm ${kondisi.chip}`}>
                      {kondisi.label}
                    </span>

                    {b.status === 'dihapuskan' && (
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-800/80 text-white backdrop-blur-sm">
                        Dihapuskan
                      </span>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-center gap-1.5 text-purple-600 mb-1.5">
                      <QrCode className="h-3.5 w-3.5" />
                      <span className="text-xs font-mono font-semibold">{b.kode_barang}</span>
                    </div>

                    <h3 className="font-bold text-gray-800 line-clamp-1 group-hover:text-purple-700 transition-colors">
                      {b.nama}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">
                      {b.merk_tipe || b.kategori?.nama || '-'}
                    </p>

                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="line-clamp-1">{b.lokasi || 'Lokasi belum diisi'}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Paginasi */}
        {!loading && pagination.total_pages > 1 && (
          <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-3">
            <p className="text-sm text-gray-500">
              Halaman {page} dari {pagination.total_pages} · {pagination.total} barang
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                disabled={page >= pagination.total_pages}
                className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArsipBarangPage;
