import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BIDANG_ROUTES } from '../../layouts/DPMDStaffLayout';
import {
  Search as LuSearch,
  FileText as LuFileText,
  User as LuUser,
  Archive as LuArchive,
  ChevronLeft as LuChevronLeft,
  ChevronRight as LuChevronRight,
  X as LuX,
  Eye as LuEye,
  ArrowUpDown as LuArrowUpDown,
  ArrowUp as LuArrowUp,
  ArrowDown as LuArrowDown,
  Inbox as LuInbox,
  Send as LuSend,
  CircleCheckBig as LuCheckCircle2,
  Clock as LuClock,
  RefreshCw as LuRefreshCw,
  FileSpreadsheet as LuFileSpreadsheet,
  SlidersHorizontal as LuSlidersHorizontal,
  BookOpen as LuBookOpen,
  ExternalLink as LuExternalLink,
  Trash2 as LuTrash2,
  Hash as LuHash
} from 'lucide-react';
import api from '../../api';
import { toast } from 'react-hot-toast';
import NomorSuratTab from './NomorSuratTab';

// ─── XLSX Helper (client-side Excel export) ────────────────────────
const exportToExcel = async (data, filename) => {
  try {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(data);

    // Auto-fit column widths
    const maxWidths = {};
    const keys = Object.keys(data[0] || {});
    keys.forEach((key, colIdx) => {
      maxWidths[colIdx] = Math.max(
        key.length,
        ...data.map(row => String(row[key] || '').length)
      );
    });
    ws['!cols'] = keys.map((_, i) => ({ wch: Math.min(maxWidths[i] + 2, 50) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bank Surat');
    XLSX.writeFile(wb, filename);
    toast.success('File Excel berhasil diunduh!');
  } catch {
    toast.error('Gagal export. Install xlsx: npm i xlsx');
  }
};

// ─── Status & Jenis ─────────────────────────────────────────────────
// Warna hanya dipakai sebagai titik penanda, bukan latar.
const STATUS_MAP = {
  draft:   { label: 'Draft',   dot: 'bg-slate-300' },
  dikirim: { label: 'Dikirim', dot: 'bg-sky-500' },
  selesai: { label: 'Selesai', dot: 'bg-emerald-500' },
};

const JENIS_MAP = {
  biasa:   { label: 'Biasa',   dot: 'bg-slate-300' },
  penting: { label: 'Penting', dot: 'bg-amber-500' },
  segera:  { label: 'Segera',  dot: 'bg-rose-500' },
  rahasia: { label: 'Rahasia', dot: 'bg-slate-900' },
};

const Chip = ({ dot, children }) => (
  <span className="inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
    {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
    {children}
  </span>
);

const StatusBadge = ({ status }) => {
  const s = STATUS_MAP[status] || STATUS_MAP.draft;
  return <Chip dot={s.dot}>{s.label}</Chip>;
};

// ─── PDF Viewer Modal ───────────────────────────────────────────────
const PdfModal = ({ url, onClose }) => {
  if (!url) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
              <LuFileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900">Dokumen Surat</h3>
              <p className="text-xs text-slate-500">Pratinjau berkas PDF</p>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <LuExternalLink className="h-3.5 w-3.5" /> Tab baru
            </a>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              aria-label="Tutup"
            >
              <LuX className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-slate-100">
          <iframe src={url} className="h-full w-full border-0" title="PDF Viewer" />
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function BankSuratPage() {
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);
  const userRole = user?.role;
  const userBidangId = Number(user?.bidang_id);

  const navigate = useNavigate();
  const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api').replace('/api', '');

  // Tab state
  const [activeTab, setActiveTab] = useState('bank-surat');

  // Data
  const [suratList, setSuratList] = useState([]);
  const [statistik, setStatistik] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterJenis, setFilterJenis] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [tanggalDari, setTanggalDari] = useState('');
  const [tanggalSampai, setTanggalSampai] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState('tanggal_surat');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  // PDF preview
  const [pdfUrl, setPdfUrl] = useState('');

  // ─── Fetch Data ─────────────────────────────────────────────────
  const fetchSurat = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterJenis) params.set('jenis_surat', filterJenis);
      if (filterStatus) params.set('status', filterStatus);
      if (tanggalDari) params.set('tanggal_dari', tanggalDari);
      if (tanggalSampai) params.set('tanggal_sampai', tanggalSampai);
      params.set('sort_by', sortBy);
      params.set('sort_order', sortOrder);
      params.set('page', page);
      params.set('limit', limit);

      const res = await api.get(`/bank-surat?${params.toString()}`);
      setSuratList(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotal(res.data.pagination?.total || 0);
    } catch (err) {
      toast.error('Gagal memuat data surat');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, filterJenis, filterStatus, tanggalDari, tanggalSampai, sortBy, sortOrder, page]);

  const fetchStatistik = useCallback(async () => {
    try {
      const res = await api.get('/bank-surat/statistik');
      setStatistik(res.data.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { fetchSurat(); }, [fetchSurat]);
  useEffect(() => { fetchStatistik(); }, [fetchStatistik]);

  const canDeleteSurat = userRole === 'superadmin' || userBidangId === 2;

  const handleDeleteSurat = (suratId) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
            <LuTrash2 className="h-4 w-4" />
          </div>
          <p className="text-sm font-medium text-slate-800">Yakin ingin menghapus surat ini?</p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await api.delete(`/bank-surat/${suratId}`);
                toast.success('Surat berhasil dihapus');
                fetchSurat();
                fetchStatistik();
              } catch (err) {
                toast.error(err.response?.data?.message || 'Gagal menghapus surat');
              }
            }}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-rose-700"
          >
            Hapus
          </button>
        </div>
      </div>
    ), { duration: 10000, position: 'top-center', style: { maxWidth: '360px' } });
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ─── Export Handler ─────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterJenis) params.set('jenis_surat', filterJenis);
      if (filterStatus) params.set('status', filterStatus);
      if (tanggalDari) params.set('tanggal_dari', tanggalDari);
      if (tanggalSampai) params.set('tanggal_sampai', tanggalSampai);

      const res = await api.get(`/bank-surat/export?${params.toString()}`);
      const data = res.data.data || [];

      if (data.length === 0) {
        toast.error('Tidak ada data untuk diekspor');
        return;
      }

      const dateStr = new Date().toLocaleDateString('id-ID').replace(/\//g, '-');
      await exportToExcel(data, `Bank_Surat_DPMD_${dateStr}.xlsx`);
    } catch (err) {
      toast.error('Gagal ekspor data');
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  // ─── Sort Toggle ────────────────────────────────────────────────
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <LuArrowUpDown className="h-3.5 w-3.5 text-slate-300" />;
    return sortOrder === 'asc'
      ? <LuArrowUp className="h-3.5 w-3.5 text-slate-700" />
      : <LuArrowDown className="h-3.5 w-3.5 text-slate-700" />;
  };

  const SortableTh = ({ field, label, className = '' }) => (
    <th className={`px-4 py-3 text-left ${className}`}>
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 transition hover:text-slate-700"
      >
        {label} <SortIcon field={field} />
      </button>
    </th>
  );

  // ─── Clear Filters ──────────────────────────────────────────────
  const activeFilterCount = [filterJenis, filterStatus, tanggalDari, tanggalSampai].filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0;
  const clearFilters = () => {
    setFilterJenis('');
    setFilterStatus('');
    setTanggalDari('');
    setTanggalSampai('');
    setPage(1);
  };

  // ─── Format Date ────────────────────────────────────────────────
  const fmtDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Posisi terakhir surat: kepala/sekdis → jabatan saja, kabid/ketim/pegawai → + bidang.
  const posisiSuratLabel = (surat) => {
    const bidang = BIDANG_ROUTES[surat.penerima_terakhir_bidang_id]?.name;
    let jabatan = surat.penerima_terakhir_jabatan;
    if (!jabatan) return bidang || '';
    if (jabatan === 'kepala_dinas') return 'Kepala Dinas';
    if (jabatan === 'sekretaris_dinas') return 'Sekretaris Dinas';
    if (jabatan === 'kepala_bidang') return bidang ? `Kabid ${bidang}` : 'Kepala Bidang';
    if (jabatan === 'ketua_tim') return bidang ? `Ketua Tim ${bidang}` : 'Ketua Tim';
    if (jabatan === 'pegawai') return bidang ? `Pegawai ${bidang}` : 'Pegawai';
    jabatan = jabatan.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return bidang ? `${jabatan} ${bidang}` : jabatan;
  };

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10';

  const summaryTiles = statistik ? [
    { label: 'Total surat', value: statistik.total || 0, icon: LuArchive },
    { label: 'Dikirim', value: statistik.by_status?.dikirim || 0, icon: LuSend },
    { label: 'Selesai', value: statistik.by_status?.selesai || 0, icon: LuCheckCircle2 },
    { label: 'Draft', value: statistik.by_status?.draft || 0, icon: LuClock },
  ] : [];

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-50 pb-20 lg:pb-8">
      {/* ─── Header ────────────────────────────── */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                <LuBookOpen className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Bank Surat</h1>
                <p className="mt-0.5 text-sm text-slate-500">Arsip surat masuk DPMD Kabupaten Bogor</p>
              </div>
            </div>

            {activeTab === 'bank-surat' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { fetchSurat(); fetchStatistik(); }}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <LuRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                <button
                  onClick={handleExport}
                  disabled={exporting || total === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {exporting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Mengekspor...
                    </>
                  ) : (
                    <>
                      <LuFileSpreadsheet className="h-4 w-4" />
                      Export Excel
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* ─── Tab ─────────────────────── */}
          <nav className="mt-5 flex gap-1 rounded-xl bg-slate-100 p-1 sm:max-w-md">
            {[
              { id: 'bank-surat', label: 'Bank Surat', icon: LuBookOpen },
              { id: 'nomor-surat', label: 'Nomor Surat', icon: LuHash },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  activeTab === id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] space-y-4 px-4 py-5 sm:px-6 lg:px-8">
        {activeTab === 'nomor-surat' ? (
          <NomorSuratTab />
        ) : (
          <>
            {/* ─── Ringkasan ───────────────────── */}
            {statistik && (
              <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-4">
                {summaryTiles.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-white px-4 py-3.5">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Icon className="h-3.5 w-3.5" />
                      <span className="truncate text-xs font-medium">{label}</span>
                    </div>
                    <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
                      {Number(value).toLocaleString('id-ID')}
                    </p>
                  </div>
                ))}
              </section>
            )}

            {/* ─── Pencarian & Filter ──────────── */}
            <section className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nomor surat, pengirim, atau perihal..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10"
                  />
                  {searchInput && (
                    <button
                      onClick={() => { setSearchInput(''); setSearch(''); }}
                      className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Bersihkan pencarian"
                    >
                      <LuX className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition ${
                    showFilters || hasActiveFilters
                      ? 'border-slate-300 bg-slate-100 text-slate-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <LuSlidersHorizontal className="h-4 w-4" />
                  Filter
                  {hasActiveFilters && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-semibold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>

              {showFilters && (
                <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Jenis surat
                    </label>
                    <select
                      value={filterJenis}
                      onChange={(e) => { setFilterJenis(e.target.value); setPage(1); }}
                      className={inputClass}
                    >
                      <option value="">Semua</option>
                      <option value="biasa">Biasa</option>
                      <option value="penting">Penting</option>
                      <option value="segera">Segera</option>
                      <option value="rahasia">Rahasia</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Status
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                      className={inputClass}
                    >
                      <option value="">Semua</option>
                      <option value="draft">Draft</option>
                      <option value="dikirim">Dikirim</option>
                      <option value="selesai">Selesai</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Dari tanggal
                    </label>
                    <input
                      type="date"
                      value={tanggalDari}
                      onChange={(e) => { setTanggalDari(e.target.value); setPage(1); }}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Sampai tanggal
                    </label>
                    <input
                      type="date"
                      value={tanggalSampai}
                      onChange={(e) => { setTanggalSampai(e.target.value); setPage(1); }}
                      className={inputClass}
                    />
                  </div>
                  {hasActiveFilters && (
                    <div className="flex justify-end sm:col-span-2 lg:col-span-4">
                      <button
                        onClick={clearFilters}
                        className="text-xs font-medium text-slate-500 underline-offset-2 transition hover:text-slate-900 hover:underline"
                      >
                        Reset semua filter
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ─── Tabel ──────────────────────── */}
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="text-xs text-slate-500">
                  Menampilkan <span className="font-semibold text-slate-800">{suratList.length}</span> dari{' '}
                  <span className="font-semibold text-slate-800">{total.toLocaleString('id-ID')}</span> surat
                </p>
              </div>

              {loading ? (
                <div className="divide-y divide-slate-100">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex animate-pulse items-center gap-4 px-4 py-4">
                      <div className="h-3 w-6 rounded bg-slate-100" />
                      <div className="h-3 flex-1 rounded bg-slate-100" />
                      <div className="hidden h-3 w-24 rounded bg-slate-100 sm:block" />
                      <div className="hidden h-3 w-32 rounded bg-slate-100 md:block" />
                      <div className="h-6 w-20 rounded-full bg-slate-100" />
                    </div>
                  ))}
                </div>
              ) : suratList.length === 0 ? (
                <div className="flex min-h-[20rem] flex-col items-center justify-center px-6 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                    <LuInbox className="h-6 w-6" />
                  </div>
                  <p className="font-medium text-slate-800">Tidak ada surat ditemukan</p>
                  <p className="mt-1 text-sm text-slate-500">Coba ubah kata kunci atau filter pencarian.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70">
                        <th className="w-12 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          No
                        </th>
                        <SortableTh field="nomor_surat" label="Nomor Surat" />
                        <SortableTh field="tanggal_surat" label="Tanggal" />
                        <SortableTh field="pengirim" label="Pengirim" />
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Posisi Surat
                        </th>
                        <th className="w-24 px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {suratList.map((surat, idx) => {
                        const jenis = JENIS_MAP[surat.jenis_surat];
                        const hasDisposisi = surat.total_disposisi > 0;

                        return (
                          <tr key={surat.id} className="transition hover:bg-slate-50">
                            <td className="px-4 py-3 font-mono text-xs text-slate-400">
                              {(page - 1) * limit + idx + 1}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[13px] font-medium text-slate-900">{surat.nomor_surat}</span>
                                {jenis && surat.jenis_surat !== 'biasa' && (
                                  <Chip dot={jenis.dot}>{jenis.label}</Chip>
                                )}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-600">
                              {fmtDate(surat.tanggal_surat)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
                                  <LuUser className="h-3.5 w-3.5" />
                                </span>
                                <span
                                  className="max-w-[200px] truncate text-[13px] text-slate-700"
                                  title={surat.pengirim}
                                >
                                  {surat.pengirim}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {hasDisposisi && (surat.penerima_terakhir_jabatan || surat.penerima_terakhir_bidang_id) ? (
                                <span className="text-[13px] font-medium text-slate-700">
                                  {posisiSuratLabel(surat)}
                                </span>
                              ) : surat.status === 'dikirim' ? (
                                <Chip dot="bg-amber-500">Menunggu disposisi</Chip>
                              ) : (
                                <StatusBadge status={surat.status} />
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                {surat.file_path && (
                                  <button
                                    onClick={() => setPdfUrl(`${apiBase}/${surat.file_path}`)}
                                    title="Lihat PDF"
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                                  >
                                    <LuEye className="h-4 w-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => { if (hasDisposisi) navigate(`/dpmd/disposisi/${surat.id}`); }}
                                  title={hasDisposisi ? 'Lihat track disposisi' : 'Belum ada disposisi'}
                                  disabled={!hasDisposisi}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300 disabled:hover:bg-transparent"
                                >
                                  <LuFileText className="h-4 w-4" />
                                </button>
                                {canDeleteSurat && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteSurat(surat.id); }}
                                    title="Hapus surat"
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                                  >
                                    <LuTrash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">
                    Halaman <span className="font-semibold text-slate-800">{page}</span> dari {totalPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Halaman sebelumnya"
                    >
                      <LuChevronLeft className="h-4 w-4" />
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (page <= 3) pageNum = i + 1;
                      else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = page - 2 + i;

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`h-8 w-8 rounded-lg text-sm font-medium tabular-nums transition ${
                            page === pageNum
                              ? 'bg-slate-900 text-white'
                              : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Halaman berikutnya"
                    >
                      <LuChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* PDF Modal */}
      <PdfModal url={pdfUrl} onClose={() => setPdfUrl('')} />
    </div>
  );
}
