import { useEffect as useEffectOrig } from 'react';
import { getUserRole } from '../../utils/roleUtils';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BIDANG_ROUTES } from '../../layouts/DPMDStaffLayout';
import {
  Search as LuSearch,
  Filter as LuFilter,
  Download as LuDownload,
  FileText as LuFileText,
  Calendar as LuCalendar,
  User as LuUser,
  Mail as LuMail,
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
  CheckCircle2 as LuCheckCircle2,
  Clock as LuClock,
  AlertTriangle,
  Zap as LuZap,
  Shield as LuShield,
  RefreshCw as LuRefreshCw,
  FileSpreadsheet as LuFileSpreadsheet,
  SlidersHorizontal as LuSlidersHorizontal,
  BookOpen as LuBookOpen,
  ExternalLink as LuExternalLink
} from 'lucide-react';
import api from '../../api';
import { toast } from 'react-hot-toast';

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

// ─── Status & Jenis Badge Components ────────────────────────────────
const STATUS_MAP = {
  draft:    { label: 'Draft',    bg: 'bg-slate-100',   text: 'text-slate-700',   dot: 'bg-slate-400' },
  dikirim:  { label: 'Dikirim',  bg: 'bg-blue-50',     text: 'text-blue-700',    dot: 'bg-blue-500' },
  selesai:  { label: 'Selesai',  bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500' },
};

const JENIS_MAP = {
  biasa:   { label: 'Biasa',   bg: 'bg-gray-50',    text: 'text-gray-600',   icon: LuMail },
  penting: { label: 'Penting', bg: 'bg-amber-50',   text: 'text-amber-700',  icon: AlertTriangle },
  segera:  { label: 'Segera',  bg: 'bg-red-50',     text: 'text-red-700',    icon: LuZap },
  rahasia: { label: 'Rahasia', bg: 'bg-purple-50',  text: 'text-purple-700', icon: LuShield },
};

const DISPOSISI_STATUS_MAP = {
  pending:   { label: 'Pending',     color: 'text-amber-600' },
  dibaca:    { label: 'Dibaca',      color: 'text-blue-600' },
  proses:    { label: 'Diproses',    color: 'text-indigo-600' },
  selesai:   { label: 'Selesai',     color: 'text-emerald-600' },
  teruskan:  { label: 'Diteruskan',  color: 'text-purple-600' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_MAP[status] || STATUS_MAP.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};

const JenisBadge = ({ jenis }) => {
  const j = JENIS_MAP[jenis] || JENIS_MAP.biasa;
  const Icon = j.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${j.bg} ${j.text}`}>
      <Icon className="w-3 h-3" />
      {j.label}
    </span>
  );
};

// ─── Stat Card ──────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color, gradient }) => (
  <div className={`relative overflow-hidden rounded-2xl border border-white/60 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300`}>
    <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10 ${gradient}`} />
    <div className="flex items-center gap-4">
      <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${gradient} flex items-center justify-center shadow-lg`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
      </div>
    </div>
  </div>
);

// ─── PDF Viewer Modal ───────────────────────────────────────────────
const PdfModal = ({ url, onClose }) => {
  if (!url) return null;
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-slate-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
              <LuFileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Dokumen Surat</h3>
              <p className="text-xs text-slate-500">Preview file PDF</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition flex items-center gap-1.5">
              <LuExternalLink className="w-4 h-4" /> Buka Tab Baru
            </a>
            <button onClick={onClose}
              className="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center transition">
              <LuX className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>
        <div className="flex-1">
          <iframe src={url} className="w-full h-full border-0" title="PDF Viewer" />
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function BankSuratPage() {
    // User info
    const [user, setUser] = useState(() => {
      try {
        return JSON.parse(localStorage.getItem('user') || '{}');
      } catch {
        return {};
      }
    });
    const userRole = user?.role;
    const userBidangId = Number(user?.bidang_id);

  const navigate = useNavigate();
  const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api').replace('/api', '');

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
    if (sortBy !== field) return <LuArrowUpDown className="w-3.5 h-3.5 text-slate-300" />;
    return sortOrder === 'asc'
      ? <LuArrowUp className="w-3.5 h-3.5 text-blue-600" />
      : <LuArrowDown className="w-3.5 h-3.5 text-blue-600" />;
  };

  // ─── Clear Filters ──────────────────────────────────────────────
  const hasActiveFilters = filterJenis || filterStatus || tanggalDari || tanggalSampai;
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

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ─── Header ────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center shadow-xl shadow-indigo-200/50">
              <LuBookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Bank Surat</h1>
              <p className="text-sm text-slate-500">Arsip surat masuk DPMD Kabupaten Bogor</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { fetchSurat(); fetchStatistik(); }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-sm font-medium flex items-center gap-2 transition shadow-sm">
              <LuRefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button onClick={handleExport} disabled={exporting || total === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-emerald-200/50 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
              {exporting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Mengekspor...</>
              ) : (
                <><LuFileSpreadsheet className="w-4 h-4" /> Export Excel</>
              )}
            </button>
          </div>
        </div>

        {/* ─── Statistik Cards ───────────────────── */}
        {statistik && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={LuArchive} label="Total Surat" value={statistik.total} gradient="bg-gradient-to-br from-indigo-500 to-blue-600" />
            <StatCard icon={LuSend} label="Dikirim" value={statistik.by_status?.dikirim || 0} gradient="bg-gradient-to-br from-blue-500 to-cyan-500" />
            <StatCard icon={LuCheckCircle2} label="Selesai" value={statistik.by_status?.selesai || 0} gradient="bg-gradient-to-br from-emerald-500 to-green-600" />
            <StatCard icon={LuClock} label="Draft" value={statistik.by_status?.draft || 0} gradient="bg-gradient-to-br from-slate-400 to-gray-500" />
          </div>
        )}

        {/* ─── Search & Filters ──────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nomor surat, pengirim, perihal..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition text-sm"
              />
              {searchInput && (
                <button onClick={() => { setSearchInput(''); setSearch(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition">
                  <LuX className="w-3.5 h-3.5 text-slate-500" />
                </button>
              )}
            </div>

            {/* Toggle Filters */}
            <button onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-xl border-2 text-sm font-medium flex items-center gap-2 transition ${
                showFilters || hasActiveFilters
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}>
              <LuSlidersHorizontal className="w-4 h-4" />
              Filter
              {hasActiveFilters && (
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {[filterJenis, filterStatus, tanggalDari, tanggalSampai].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Jenis Surat</label>
                <select value={filterJenis} onChange={(e) => { setFilterJenis(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400">
                  <option value="">Semua</option>
                  <option value="biasa">Biasa</option>
                  <option value="penting">Penting</option>
                  <option value="segera">Segera</option>
                  <option value="rahasia">Rahasia</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Status</label>
                <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400">
                  <option value="">Semua</option>
                  <option value="draft">Draft</option>
                  <option value="dikirim">Dikirim</option>
                  <option value="selesai">Selesai</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Dari Tanggal</label>
                <input type="date" value={tanggalDari} onChange={(e) => { setTanggalDari(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Sampai Tanggal</label>
                <input type="date" value={tanggalSampai} onChange={(e) => { setTanggalSampai(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400" />
              </div>
              {hasActiveFilters && (
                <div className="col-span-2 md:col-span-4 flex justify-end">
                  <button onClick={clearFilters}
                    className="text-xs font-medium text-red-600 hover:text-red-700 flex items-center gap-1">
                    <LuX className="w-3.5 h-3.5" /> Reset semua filter
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Table ──────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          {/* Table Header Info */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Menampilkan <span className="font-semibold text-slate-800">{suratList.length}</span> dari <span className="font-semibold text-slate-800">{total}</span> surat
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
              </div>
              <p className="text-sm text-slate-400 font-medium">Memuat data surat...</p>
            </div>
          ) : suratList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <LuInbox className="w-10 h-10 text-slate-400" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-slate-700 text-lg">Tidak ada surat ditemukan</h3>
                <p className="text-sm text-slate-400 mt-1">Coba ubah kata kunci atau filter pencarian</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-blue-50/50">
                    <th className="px-4 py-3.5 text-left font-semibold text-slate-500 text-xs uppercase tracking-wider w-12">No</th>
                    <th className="px-4 py-3.5 text-left">
                      <button onClick={() => handleSort('nomor_surat')} className="flex items-center gap-1.5 font-semibold text-slate-500 text-xs uppercase tracking-wider hover:text-slate-700 transition">
                        Nomor Surat <SortIcon field="nomor_surat" />
                      </button>
                    </th>
                    <th className="px-4 py-3.5 text-left">
                      <button onClick={() => handleSort('tanggal_surat')} className="flex items-center gap-1.5 font-semibold text-slate-500 text-xs uppercase tracking-wider hover:text-slate-700 transition">
                        Tanggal <SortIcon field="tanggal_surat" />
                      </button>
                    </th>
                    <th className="px-4 py-3.5 text-left">
                      <button onClick={() => handleSort('pengirim')} className="flex items-center gap-1.5 font-semibold text-slate-500 text-xs uppercase tracking-wider hover:text-slate-700 transition">
                        Pengirim <SortIcon field="pengirim" />
                      </button>
                    </th>
                    <th className="px-4 py-3.5 text-center font-semibold text-slate-500 text-xs uppercase tracking-wider">Posisi Surat</th>
                    <th className="px-4 py-3.5 text-center font-semibold text-slate-500 text-xs uppercase tracking-wider w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {suratList.map((surat, idx) => (
                    <tr key={surat.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">{(page - 1) * limit + idx + 1}</td>
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-800 text-[13px]">{surat.nomor_surat}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <LuCalendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="text-[13px]">{fmtDate(surat.tanggal_surat)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                            <LuUser className="w-3.5 h-3.5 text-indigo-600" />
                          </div>
                          <span className="text-slate-700 text-[13px] truncate max-w-[180px]" title={surat.pengirim}>{surat.pengirim}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {/* Posisi Surat: kepala_bidang/ketua_tim → nama bidang saja. Pegawai → 'Pegawai' + bidang. Lainnya: jabatan + bidang. Fallback status label. */}
                        {surat.total_disposisi > 0 && (surat.penerima_terakhir_jabatan || surat.penerima_terakhir_bidang_id) ? (
                          <span className="inline-flex flex-col items-center gap-0.5">
                            <span className="text-xs font-bold text-slate-700">
                              {(() => {
                                const bidang = BIDANG_ROUTES[surat.penerima_terakhir_bidang_id]?.name;
                                let jabatan = surat.penerima_terakhir_jabatan;
                                if (!jabatan) return bidang || '';
                                if (jabatan === 'sekretaris_dinas') return 'Sekretaris Dinas';
                                if (["kepala_bidang", "ketua_tim"].includes(jabatan)) {
                                  return bidang || '';
                                }
                                if (jabatan === 'pegawai') {
                                  return bidang ? `Pegawai ${bidang}` : 'Pegawai';
                                }
                                // Default: jabatan + bidang
                                jabatan = jabatan.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                                return bidang ? `${jabatan} ${bidang}` : jabatan;
                              })()}
                            </span>
                          </span>
                        ) : (
                          <StatusBadge status={surat.status} />
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {surat.file_path && (
                            <button
                              onClick={() => setPdfUrl(`${apiBase}/${surat.file_path}`)}
                              title="Lihat PDF"
                              className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition opacity-0 group-hover:opacity-100">
                              <LuEye className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              // Navigate to disposisi detail based on the first disposisi
                              if (surat.total_disposisi > 0) {
                                navigate(`/dpmd/disposisi/${surat.id}`);
                              }
                            }}
                            title="Detail"
                            className="w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition opacity-0 group-hover:opacity-100">
                            <LuFileText className="w-4 h-4" />
                          </button>
                          {/* Tombol Delete: hanya superadmin atau pegawai bidang sekretariat */}
                          {/* Fitur delete dihapus, gunakan fitur tarik di disposisi */}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Halaman {page} dari {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition">
                  <LuChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button key={pageNum} onClick={() => setPage(pageNum)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
                        page === pageNum
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}>
                      {pageNum}
                    </button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition">
                  <LuChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PDF Modal */}
      <PdfModal url={pdfUrl} onClose={() => setPdfUrl('')} />
    </div>
  );
}
