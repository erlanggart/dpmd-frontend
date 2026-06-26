import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, BookOpen, Layers, Tag, X, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../../../api';
import toast from 'react-hot-toast';

const formatRupiah = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const PAGE_SIZE = 100;

const ShtPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('ssh');
  const [items, setItems] = useState([]);
  const [kelompoks, setKelompoks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedKelompok, setSelectedKelompok] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [tahun, setTahun] = useState(2026);
  const debounceRef = useRef(null);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  useEffect(() => {
    setPage(1);
    setSelectedKelompok('');
    setSearch('');
    setDebouncedSearch('');
  }, [activeTab]);

  useEffect(() => {
    fetchKelompoks();
  }, [activeTab]);

  useEffect(() => {
    fetchItems();
  }, [activeTab, debouncedSearch, selectedKelompok, page]);

  const fetchKelompoks = async () => {
    try {
      const res = await api.get(`/anggaran/sht/kelompok?type=${activeTab}`);
      if (res.data.success) setKelompoks(res.data.data);
    } catch {
      // silently ignore
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: PAGE_SIZE });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (selectedKelompok) params.set('kelompok', selectedKelompok);

      const res = await api.get(`/anggaran/sht/${activeTab}?${params.toString()}`);
      if (res.data.success) {
        setItems(res.data.data);
        setTotal(res.data.total);
        setTahun(res.data.tahun);
      }
    } catch (err) {
      toast.error('Gagal memuat data SHT');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white">
        <div className=" px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-2 text-indigo-100 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Kembali
          </button>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <BookOpen className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Standar Harga Satuan (SHT)</h1>
              <p className="text-indigo-100 mt-1">
                Daftar acuan SSH, SBU, ASB &amp; HSPK Kab. Bogor Tahun {tahun}
              </p>
            </div>
          </div>

          {/* Tab */}
          <div className="mt-5 flex gap-2">
            {[
              { key: 'ssh', label: 'SSH', desc: 'Standar Harga Satuan' },
              { key: 'sbu', label: 'SBU', desc: 'Standar Biaya Umum' },
              { key: 'asb', label: 'ASB', desc: 'Analisis Standar Belanja' },
              { key: 'hspk', label: 'HSPK', desc: 'Harga Satuan Pokok Kegiatan' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === t.key
                    ? 'bg-white text-indigo-700 shadow-lg'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {t.label}
                <span className={`ml-2 text-xs font-normal hidden sm:inline ${activeTab === t.key ? 'text-indigo-500' : 'text-indigo-200'}`}>
                  {t.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-5">
        {/* Filter bar */}
        <div className="bg-white rounded-2xl shadow border border-gray-100 p-4 mb-5 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari uraian, spesifikasi, kode barang..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Kelompok filter */}
          <div className="relative sm:w-72">
            <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={selectedKelompok}
              onChange={e => { setSelectedKelompok(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none bg-white"
            >
              <option value="">Semua Kelompok</option>
              {kelompoks.map(k => (
                <option key={k.kode} value={k.kode}>{k.nama}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Info bar */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">
            {loading ? 'Memuat...' : (
              <>Menampilkan <span className="font-semibold text-gray-700">{items.length}</span> dari <span className="font-semibold text-gray-700">{total.toLocaleString('id-ID')}</span> item</>
            )}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1 text-sm">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 py-1 text-gray-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <BookOpen className="h-14 w-14 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Tidak ada data ditemukan</p>
              {(search || selectedKelompok) && (
                <button
                  onClick={() => { setSearch(''); setSelectedKelompok(''); }}
                  className="mt-3 text-indigo-600 text-sm hover:underline"
                >
                  Hapus filter
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 w-10">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Kode Barang</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 min-w-[220px]">Uraian</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 min-w-[200px]">Spesifikasi</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Kelompok</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Satuan</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600 min-w-[140px]">Harga Satuan</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Rek.</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-indigo-50/40 transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {item.kode_barang}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{item.uraian}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs leading-relaxed">{item.spesifikasi || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                          <Tag className="h-3 w-3" />
                          {item.kelompok}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{item.satuan}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800 whitespace-nowrap">
                        {formatRupiah(item.harga_satuan)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-400">{item.kode_rekening}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bottom pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-5">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Pertama
            </button>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-4 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg">
              Halaman {page} dari {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Terakhir
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShtPage;
