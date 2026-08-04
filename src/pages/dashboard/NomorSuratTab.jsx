import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { BIDANG_ROUTES } from '../../layouts/DPMDStaffLayout';
import {
  Search, Hash, FileText, Send, Plus, ChevronLeft, ChevronRight,
  Copy, Check, Trash2, RefreshCw, CalendarDays, Building2, User,
  X, ChevronDown, Loader2, FolderOpen, Folder, FileCode, ArrowLeft,
  Home, ChevronRight as ChevronRightIcon, List
} from 'lucide-react';
import api from '../../api';
import { toast } from 'react-hot-toast';

// ═══════════════════════════════════════════════════════════════
// SEARCHABLE DROPDOWN COMPONENT
// ═══════════════════════════════════════════════════════════════
function SearchableSelect({ items, value, onChange, placeholder, icon: Icon, label, stepNumber, required, loading: externalLoading }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selected = items.find(i => i.kode === value);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(i =>
      i.kode.toLowerCase().includes(q) || i.nama.toLowerCase().includes(q)
    );
  }, [items, query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Focus search on open
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    if (!open) setQuery('');
  }, [open]);

  return (
    <div>
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          {stepNumber && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-semibold mr-1.5">{stepNumber}</span>
          )}
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div ref={containerRef} className="relative">
        {/* Trigger button */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left text-sm transition ${
            open
              ? 'border-slate-400 ring-2 ring-slate-900/10 bg-white'
              : value
                ? 'border-slate-300 bg-slate-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          {Icon && <Icon className={`w-4 h-4 flex-shrink-0 ${value ? 'text-slate-600' : 'text-slate-400'}`} />}
          <div className="flex-1 min-w-0">
            {selected ? (
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{selected.kode}</span>
                <span className="text-slate-700 truncate text-sm">{selected.nama}</span>
              </div>
            ) : (
              <span className="text-slate-400">{placeholder}</span>
            )}
          </div>
          {externalLoading ? (
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin flex-shrink-0" />
          ) : (
            <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
          )}
        </button>

        {/* Dropdown panel */}
        {open && (
          <div className="absolute z-50 mt-1.5 w-full bg-white rounded-xl border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden">
            {/* Search input */}
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Cari kode atau nama..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-sm focus:ring-1 focus:ring-slate-200 focus:border-slate-400 focus:bg-white outline-none transition placeholder:text-slate-400"
                />
                {query && (
                  <button type="button" onClick={() => setQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-200 transition">
                    <X className="w-3 h-3 text-slate-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Options list */}
            <div className="max-h-52 overflow-y-auto overscroll-contain">
              {filtered.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <Search className="w-6 h-6 text-slate-200 mx-auto mb-1.5" />
                  <p className="text-xs text-slate-400">{query ? 'Tidak ditemukan' : 'Tidak ada data'}</p>
                </div>
              ) : (
                filtered.map((item, idx) => (
                  <button
                    key={item.kode}
                    type="button"
                    onClick={() => { onChange(item.kode); setOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition ${
                      value === item.kode
                        ? 'bg-slate-50 border-l-[3px] border-l-slate-900'
                        : 'hover:bg-slate-50 border-l-[3px] border-l-transparent'
                    } ${idx < filtered.length - 1 ? 'border-b border-b-slate-50' : ''}`}
                  >
                    <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                      value === item.kode ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {item.kode}
                    </span>
                    <span className={`text-sm truncate flex-1 ${
                      value === item.kode ? 'text-slate-900 font-medium' : 'text-slate-700'
                    }`}>
                      {item.nama}
                    </span>
                    {value === item.kode && <Check className="w-4 h-4 text-slate-900 flex-shrink-0" />}
                  </button>
                ))
              )}
            </div>

            {/* Count footer */}
            {items.length > 5 && (
              <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 text-center">
                  {filtered.length === items.length
                    ? `${items.length} item`
                    : `${filtered.length} dari ${items.length} item`
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function NomorSuratTab() {
  const [user] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  });
  const userBidangId = Number(user?.bidang_id);
  const canDelete = user?.role === 'superadmin' || userBidangId === 2;

  // Data
  const [requests, setRequests] = useState([]);
  const [statistik, setStatistik] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ klasifikasi_kode: '', perihal: '', catatan: '' });
  const [submitting, setSubmitting] = useState(false);
  const [selectedKlasifikasi, setSelectedKlasifikasi] = useState(null);

  // Classification cascading dropdowns
  const [rootCategories, setRootCategories] = useState([]);     // Level 1: 000, 010, 100...
  const [subCategories, setSubCategories] = useState([]);       // Level 2: children of selected root
  const [detailCategories, setDetailCategories] = useState([]); // Level 3: children of selected sub
  const [selectedRoot, setSelectedRoot] = useState('');
  const [selectedSub, setSelectedSub] = useState('');
  const [selectedDetail, setSelectedDetail] = useState('');
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterBidang, setFilterBidang] = useState('');
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Copy state
  const [copiedId, setCopiedId] = useState(null);

  // ─── Fetch Requests ──────────────────────────────────────────
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = { tahun, page, limit: 15 };
      if (search) params.search = search;
      if (filterBidang) params.bidang_id = filterBidang;
      const res = await api.get('/nomor-surat/requests', { params });
      if (res.data.success) {
        setRequests(res.data.data);
        setTotal(res.data.meta.total);
        setTotalPages(res.data.meta.totalPages);
      }
    } catch {
      toast.error('Gagal memuat data nomor surat');
    } finally {
      setLoading(false);
    }
  }, [tahun, page, search, filterBidang]);

  const fetchStatistik = useCallback(async () => {
    try {
      const res = await api.get('/nomor-surat/statistik', { params: { tahun } });
      if (res.data.success) setStatistik(res.data.data);
    } catch { /* silent */ }
  }, [tahun]);

  useEffect(() => { fetchRequests(); fetchStatistik(); }, [fetchRequests, fetchStatistik]);

  // ─── Search debounce ─────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ─── Load root categories on mount ─────────────────────────
  useEffect(() => {
    const loadRoots = async () => {
      try {
        const res = await api.get('/nomor-surat/klasifikasi', { params: { roots: 'true' } });
        if (res.data.success) setRootCategories(res.data.data);
      } catch { /* silent */ }
    };
    loadRoots();
  }, []);

  // ─── Load sub-categories when root changes ───────────────
  useEffect(() => {
    if (!selectedRoot) { setSubCategories([]); setDetailCategories([]); return; }
    const loadSubs = async () => {
      try {
        setLoadingCategories(true);
        const res = await api.get('/nomor-surat/klasifikasi', { params: { parent_kode: selectedRoot } });
        if (res.data.success) setSubCategories(res.data.data);
      } catch { /* silent */ } finally { setLoadingCategories(false); }
    };
    loadSubs();
    setSelectedSub('');
    setSelectedDetail('');
    setDetailCategories([]);
    // If root has no children, auto-select that root as final
    const rootItem = rootCategories.find(r => r.kode === selectedRoot);
    if (rootItem && !rootItem.has_children) {
      setSelectedKlasifikasi(rootItem);
      setFormData(f => ({ ...f, klasifikasi_kode: rootItem.kode }));
    } else {
      setSelectedKlasifikasi(null);
      setFormData(f => ({ ...f, klasifikasi_kode: '' }));
    }
  }, [selectedRoot]);

  // ─── Load detail categories when sub changes ─────────────
  useEffect(() => {
    if (!selectedSub) { setDetailCategories([]); return; }
    const subItem = subCategories.find(s => s.kode === selectedSub);
    if (subItem && subItem.has_children) {
      const loadDetails = async () => {
        try {
          setLoadingCategories(true);
          const res = await api.get('/nomor-surat/klasifikasi', { params: { parent_kode: selectedSub } });
          if (res.data.success) setDetailCategories(res.data.data);
        } catch { /* silent */ } finally { setLoadingCategories(false); }
      };
      loadDetails();
      setSelectedDetail('');
      // Don't auto-select yet, wait for user to pick detail or this level
      setSelectedKlasifikasi(subItem);
      setFormData(f => ({ ...f, klasifikasi_kode: subItem.kode }));
    } else if (subItem) {
      // No children — this is the final selection
      setDetailCategories([]);
      setSelectedDetail('');
      setSelectedKlasifikasi(subItem);
      setFormData(f => ({ ...f, klasifikasi_kode: subItem.kode }));
    }
  }, [selectedSub]);

  // ─── When detail changes ─────────────────────────────────
  useEffect(() => {
    if (!selectedDetail) return;
    const detailItem = detailCategories.find(d => d.kode === selectedDetail);
    if (detailItem) {
      setSelectedKlasifikasi(detailItem);
      setFormData(f => ({ ...f, klasifikasi_kode: detailItem.kode }));
    }
  }, [selectedDetail]);

  // ─── Create Request ──────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.klasifikasi_kode) { toast.error('Pilih kode klasifikasi'); return; }
    if (!formData.perihal.trim()) { toast.error('Perihal wajib diisi'); return; }

    try {
      setSubmitting(true);
      const res = await api.post('/nomor-surat/request', formData);
      if (res.data.success) {
        toast.success(
          <div>
            <p className="font-bold">Nomor surat berhasil dibuat!</p>
            <p className="text-sm mt-1 font-mono bg-gray-100 px-2 py-1 rounded">{res.data.data.nomor_surat}</p>
          </div>,
          { duration: 6000 }
        );
        setShowForm(false);
        setFormData({ klasifikasi_kode: '', perihal: '', catatan: '' });
        setSelectedKlasifikasi(null);
        setSelectedRoot('');
        setSelectedSub('');
        setSelectedDetail('');
        fetchRequests();
        fetchStatistik();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membuat nomor surat');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Delete ──────────────────────────────────────────────────
  const handleDelete = async (id) => {
    toast((t) => (
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
          <Trash2 className="w-4 h-4" />
        </div>
        <p className="text-sm font-medium text-gray-800">Hapus nomor surat ini?</p>
        <div className="flex gap-2">
          <button onClick={() => toast.dismiss(t.id)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
            Batal
          </button>
          <button onClick={async () => {
            toast.dismiss(t.id);
            try {
              await api.delete(`/nomor-surat/${id}`);
              toast.success('Nomor surat berhasil dihapus');
              fetchRequests();
              fetchStatistik();
            } catch (err) {
              toast.error(err.response?.data?.message || 'Gagal menghapus');
            }
          }} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-rose-700">
            Hapus
          </button>
        </div>
      </div>
    ), { duration: 8000 });
  };

  // ─── Copy to clipboard ───────────────────────────────────────
  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      toast.success('Nomor surat disalin!', { duration: 1500 });
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const fmtDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4">
      {/* ─── Ringkasan ─────────────────────────── */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-4">
        <div className="bg-white px-4 py-3.5">
          <div className="flex items-center gap-2 text-slate-400">
            <Hash className="h-3.5 w-3.5" />
            <span className="truncate text-xs font-medium">Total {tahun}</span>
          </div>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
            {statistik?.total || 0}
          </p>
        </div>
        {Object.entries(statistik?.by_bidang || {}).slice(0, 3).map(([nama, count]) => (
          <div key={nama} className="bg-white px-4 py-3.5">
            <div className="flex items-center gap-2 text-slate-400">
              <Building2 className="h-3.5 w-3.5" />
              <span className="truncate text-xs font-medium">{nama}</span>
            </div>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{count}</p>
          </div>
        ))}
      </div>

      {/* ─── Actions & Filter Bar ──────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Cari nomor surat, perihal, pemohon..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          {/* Filter bidang */}
          <select
            value={filterBidang}
            onChange={e => { setFilterBidang(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10"
          >
            <option value="">Semua Bidang</option>
            {Object.entries(BIDANG_ROUTES).map(([id, b]) => (
              <option key={id} value={id}>{b.name}</option>
            ))}
          </select>

          {/* Year */}
          <select
            value={tahun}
            onChange={e => { setTahun(parseInt(e.target.value)); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10"
          >
            {[2026, 2025, 2024].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Refresh */}
          <button onClick={() => { fetchRequests(); fetchStatistik(); }}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50">
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* New Request */}
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 whitespace-nowrap rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-slate-800">
            <Plus className="w-4 h-4" /> Ajukan Nomor
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Menampilkan <span className="font-semibold text-slate-800">{requests.length}</span> dari <span className="font-semibold text-slate-800">{total}</span> nomor surat
        </p>
      </div>

      {/* ─── Table ─────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Hash className="w-12 h-12 text-slate-200 mb-3" />
            <p className="text-slate-500 font-medium">Belum ada nomor surat</p>
            <p className="text-xs text-slate-400 mt-1">Klik "Ajukan Nomor" untuk membuat nomor surat baru</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">No</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Nomor Surat</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Perihal</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Klasifikasi</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">Bidang</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Pemohon</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tanggal</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r, i) => (
                  <tr key={r.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3.5 text-sm text-slate-500">{(page - 1) * 15 + i + 1}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[13px] font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                          {r.nomor_surat}
                        </span>
                        <button
                          onClick={() => handleCopy(r.nomor_surat, r.id)}
                          className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                          title="Salin"
                        >
                          {copiedId === r.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-700 max-w-[200px] truncate" title={r.perihal}>
                      {r.perihal}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded" title={r.klasifikasi_nama}>
                        {r.klasifikasi_kode}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                        {r.bidang_nama}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50">
                          <User className="w-3 h-3 text-slate-400" />
                        </div>
                        <span className="text-sm text-slate-700 truncate max-w-[120px]">{r.requested_by_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {fmtDate(r.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleCopy(r.nomor_surat, r.id)}
                          title="Salin Nomor Surat"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                        >
                          {copiedId === r.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(r.id)}
                            title="Hapus"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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
            <p className="text-xs text-slate-400">Halaman {page} dari {totalPages}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) pageNum = i + 1;
                else if (page <= 3) pageNum = i + 1;
                else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = page - 2 + i;
                return (
                  <button key={pageNum} onClick={() => setPage(pageNum)}
                    className={`h-8 w-8 rounded-lg text-sm font-medium tabular-nums transition ${
                      page === pageNum
                        ? 'bg-slate-900 text-white'
                        : 'border border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}>
                    {pageNum}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* CREATE MODAL                                          */}
      {/* ═══════════════════════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
                    <Hash className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Ajukan Nomor Surat</h3>
                    <p className="text-xs text-slate-500">Bidang: {BIDANG_ROUTES[userBidangId]?.name || 'Sekretariat'}</p>
                  </div>
                </div>
                <button onClick={() => { setShowForm(false); setSelectedKlasifikasi(null); setSelectedRoot(''); setSelectedSub(''); setSelectedDetail(''); }}
                  className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">

              {/* ── Step 1: Kategori Utama ── */}
              <SearchableSelect
                items={rootCategories}
                value={selectedRoot}
                onChange={setSelectedRoot}
                placeholder="Pilih Kategori Utama..."
                icon={List}
                label="Kategori Utama"
                stepNumber="1"
                required
              />

              {/* ── Step 2: Sub-Kategori ── */}
              {selectedRoot && subCategories.length > 0 && (
                <SearchableSelect
                  items={subCategories}
                  value={selectedSub}
                  onChange={setSelectedSub}
                  placeholder="Pilih Sub-Kategori..."
                  icon={FolderOpen}
                  label="Sub-Kategori"
                  stepNumber="2"
                  loading={loadingCategories}
                />
              )}

              {/* ── Step 3: Detail / Kode Spesifik ── */}
              {selectedSub && detailCategories.length > 0 && (
                <SearchableSelect
                  items={detailCategories}
                  value={selectedDetail}
                  onChange={setSelectedDetail}
                  placeholder="Pilih Kode Spesifik..."
                  icon={FileCode}
                  label="Kode Spesifik"
                  stepNumber="3"
                />
              )}

              {/* ── Selected Preview ── */}
              {selectedKlasifikasi && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <p className="text-xs text-emerald-700 font-semibold">Kode Klasifikasi Terpilih</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                      <Hash className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-base font-semibold text-slate-900">{selectedKlasifikasi.kode}</p>
                      <p className="truncate text-xs text-slate-500">{selectedKlasifikasi.nama}</p>
                    </div>
                    <button type="button" onClick={() => {
                      setSelectedKlasifikasi(null);
                      setSelectedRoot('');
                      setSelectedSub('');
                      setSelectedDetail('');
                      setFormData(f => ({ ...f, klasifikasi_kode: '' }));
                    }} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-3 border-t border-slate-200 pt-3">
                    <p className="mb-1 text-[11px] font-medium text-slate-400">Preview Nomor Surat:</p>
                    <p className="font-mono font-bold text-sm text-slate-800">
                      {selectedKlasifikasi.kode}/<span className="text-slate-400">XXX</span>-{BIDANG_ROUTES[userBidangId]?.name || 'Sekretariat'}
                    </p>
                  </div>
                </div>
              )}

              {/* Perihal */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Perihal <span className="text-rose-500">*</span>
                </label>
                <input
                  value={formData.perihal}
                  onChange={e => setFormData(f => ({ ...f, perihal: e.target.value }))}
                  placeholder="Masukkan perihal surat..."
                  maxLength={500}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Catatan (opsional)</label>
                <textarea
                  value={formData.catatan}
                  onChange={e => setFormData(f => ({ ...f, catatan: e.target.value }))}
                  placeholder="Catatan tambahan..."
                  rows={2}
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setSelectedKlasifikasi(null); setSelectedRoot(''); setSelectedSub(''); setSelectedDetail(''); }}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
                  Batal
                </button>
                <button type="submit" disabled={submitting || !formData.klasifikasi_kode || !formData.perihal.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Buat Nomor Surat</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
