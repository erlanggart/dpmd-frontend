import React, { useEffect, useState, useMemo } from 'react';
import api from '../../api';
import {
  LuFolder, LuChartColumn, LuSearch, LuFilter, LuRefreshCw, LuEye,
  LuFileText, LuStamp, LuPackage, LuMapPin, LuDollarSign, LuBuilding2,
  LuHouse, LuCircleCheck, LuClock, LuCircleX, LuRotateCcw, LuArrowLeft,
  LuInbox,
} from 'react-icons/lu';

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

/* ─── Meta status & kategori (selaras dgn halaman DPMD) ─────────────── */
const STATUS_LABELS = {
  pending: 'Pending', in_review: 'Review',
  approved: 'Disetujui', rejected: 'Ditolak', revision: 'Revisi',
};
const STATUS_STYLES = {
  pending:   'bg-amber-50 text-amber-700 border-amber-200',
  in_review: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  approved:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected:  'bg-rose-50 text-rose-700 border-rose-200',
  revision:  'bg-orange-50 text-orange-700 border-orange-200',
};
const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${STATUS_STYLES[status] || 'bg-slate-100 text-slate-700 border-slate-300'}`}>
    {STATUS_LABELS[status] || status}
  </span>
);

const KATEGORI_META = {
  wajib:                     { label: 'Wajib', badge: 'bg-rose-50 text-rose-700 border-rose-200', bar: 'bg-rose-500' },
  pilihan_infrastruktur:     { label: 'Pilihan Infrastruktur', badge: 'bg-orange-50 text-orange-700 border-orange-200', bar: 'bg-orange-500' },
  pilihan_non_infrastruktur: { label: 'Pilihan Non-Infrastruktur', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', bar: 'bg-indigo-500' },
};

const rupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

/* ─── Kartu statistik ringkas ──────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, tone }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
    <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tone}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-slate-500 truncate">{label}</p>
      <p className="text-lg font-bold text-slate-800 truncate">{value}</p>
    </div>
  </div>
);

const DinasBankeuPerubahanArsipPage = () => {
  const [selectedYear, setSelectedYear] = useState(null);
  const [activeTab, setActiveTab] = useState('archive');
  const [proposals, setProposals] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter arsip
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterKecamatan, setFilterKecamatan] = useState('all');
  const [filterKategori, setFilterKategori] = useState('all');

  const loadData = async (tahun) => {
    setLoading(true);
    setError(null);
    try {
      const [proposalsRes, statsRes] = await Promise.all([
        api.get('/dinas/bankeu-perubahan/proposals', { params: { tahun } }),
        api.get('/dinas/bankeu-perubahan/statistics', { params: { tahun } }),
      ]);
      setProposals(proposalsRes.data?.data || []);
      setStats(statsRes.data?.data || {});
    } catch (err) {
      console.error('Gagal memuat arsip Bankeu Perubahan:', err);
      setError(err.response?.data?.message || 'Gagal memuat data arsip.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedYear) loadData(selectedYear);
  }, [selectedYear]);

  /* Opsi kecamatan untuk filter */
  const kecamatanOptions = useMemo(() => {
    const map = new Map();
    proposals.forEach(p => { if (p.kecamatan_nama) map.set(p.kecamatan_nama, p.kecamatan_nama); });
    return Array.from(map.keys()).sort();
  }, [proposals]);

  /* Arsip terfilter */
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return proposals.filter(p => {
      if (filterStatus !== 'all' && (p.dpmd_status || 'pending') !== filterStatus) return false;
      if (filterKecamatan !== 'all' && p.kecamatan_nama !== filterKecamatan) return false;
      if (filterKategori !== 'all' && p.jenis_kegiatan !== filterKategori) return false;
      if (q) {
        const hay = `${p.judul_proposal || ''} ${p.desa_nama || ''} ${p.kecamatan_nama || ''} ${p.nama_kegiatan_spesifik || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [proposals, searchQuery, filterStatus, filterKecamatan, filterKategori]);

  /* Agregasi untuk tab statistik */
  const perKategori = useMemo(() => {
    const base = {};
    Object.keys(KATEGORI_META).forEach(k => { base[k] = { total: 0, anggaran: 0, approved: 0 }; });
    proposals.forEach(p => {
      const k = p.jenis_kegiatan;
      if (!base[k]) return;
      base[k].total += 1;
      base[k].anggaran += Number(p.anggaran_usulan || 0);
      if (p.dpmd_status === 'approved') base[k].approved += 1;
    });
    return base;
  }, [proposals]);

  const perKecamatan = useMemo(() => {
    const map = new Map();
    proposals.forEach(p => {
      const key = p.kecamatan_nama || '(Tanpa Kecamatan)';
      if (!map.has(key)) map.set(key, { total: 0, anggaran: 0, approved: 0 });
      const row = map.get(key);
      row.total += 1;
      row.anggaran += Number(p.anggaran_usulan || 0);
      if (p.dpmd_status === 'approved') row.approved += 1;
    });
    return Array.from(map.entries())
      .map(([nama, v]) => ({ nama, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [proposals]);

  const maxKecTotal = useMemo(() => Math.max(1, ...perKecamatan.map(r => r.total)), [perKecamatan]);

  /* ─── Layar pilih tahun ─────────────────────────────────────────── */
  if (!selectedYear) {
    return (
      <div className="min-h-[70vh] bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <div className="inline-flex h-16 w-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl items-center justify-center mb-5 shadow-lg shadow-amber-500/30">
              <LuFolder className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              Arsip Bankeu Perubahan
            </h1>
            <p className="text-slate-500 mt-2">Dinas / OPD · lihat arsip proposal & statistik (hanya baca)</p>
          </div>

          <button
            onClick={() => setSelectedYear(2026)}
            className="group w-full flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:border-amber-300 hover:shadow-md"
          >
            <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-amber-50 flex items-center justify-center transition-colors group-hover:bg-amber-100">
              <LuFolder className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-900">TA 2026</h3>
              <p className="text-sm text-slate-500">Proposal Perubahan Tahun Anggaran 2026</p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'archive', label: 'Arsip Proposal', icon: LuFolder },
    { id: 'statistics', label: 'Statistik', icon: LuChartColumn },
  ];

  return (
    <div className="relative bg-slate-50 min-h-screen">
      {/* Header + tab */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="w-full px-4 sm:px-6">
          <div className="flex items-center gap-2 h-14 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setSelectedYear(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
            >
              <LuArrowLeft className="w-4 h-4" />
              <span>TA {selectedYear}</span>
            </button>
            <div className="h-5 w-px bg-slate-200 flex-shrink-0" />
            {tabs.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                    active ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
            <button
              onClick={() => loadData(selectedYear)}
              disabled={loading}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0 disabled:opacity-50"
            >
              <LuRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Muat ulang
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Banner read-only */}
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800">
          <LuEye className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>Mode <strong>hanya-baca</strong>. Anda dapat melihat & mengunduh dokumen proposal, namun tidak dapat memverifikasi atau mengubah data.</span>
        </div>

        {/* Kartu statistik (selalu tampil) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatCard icon={LuFolder}       label="Total Proposal" value={stats.total ?? 0}            tone="bg-slate-100 text-slate-600" />
          <StatCard icon={LuCircleCheck}  label="Disetujui"      value={stats.approved ?? 0}         tone="bg-emerald-50 text-emerald-600" />
          <StatCard icon={LuClock}        label="Menunggu"       value={stats.pending ?? 0}          tone="bg-amber-50 text-amber-600" />
          <StatCard icon={LuRotateCcw}    label="Revisi"         value={stats.revision ?? 0}         tone="bg-orange-50 text-orange-600" />
          <StatCard icon={LuCircleX}      label="Ditolak"        value={stats.rejected ?? 0}         tone="bg-rose-50 text-rose-600" />
          <StatCard icon={LuDollarSign}   label="Total Anggaran" value={rupiah(stats.total_anggaran)} tone="bg-amber-50 text-amber-600" />
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <LuRefreshCw className="w-6 h-6 animate-spin mr-2" /> Memuat data…
          </div>
        ) : activeTab === 'archive' ? (
          <>
            {/* Filter */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 mb-4 flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari judul, desa, kecamatan…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200">
                <option value="all">Semua Status</option>
                {Object.entries(STATUS_LABELS).filter(([k]) => k !== 'in_review').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={filterKategori} onChange={e => setFilterKategori(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200">
                <option value="all">Semua Kategori</option>
                {Object.entries(KATEGORI_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select value={filterKecamatan} onChange={e => setFilterKecamatan(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200">
                <option value="all">Semua Kecamatan</option>
                {kecamatanOptions.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            <p className="text-xs text-slate-500 mb-2 flex items-center gap-1.5">
              <LuFilter className="w-3.5 h-3.5" /> Menampilkan {filtered.length} dari {proposals.length} proposal
            </p>

            {/* Daftar proposal */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <LuInbox className="w-10 h-10 mb-2" />
                <p className="text-sm">Tidak ada proposal yang cocok.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(p => <ArchiveRow key={p.id} proposal={p} />)}
              </div>
            )}
          </>
        ) : (
          /* ─── Tab Statistik ─────────────────────────────────────── */
          <div className="space-y-6">
            {/* Per kategori */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Rekap per Kategori Kegiatan</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(KATEGORI_META).map(([k, meta]) => {
                  const d = perKategori[k] || { total: 0, anggaran: 0, approved: 0 };
                  return (
                    <div key={k} className="rounded-xl border border-slate-100 p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full border ${meta.badge}`}>{meta.label}</span>
                      <p className="text-2xl font-bold text-slate-800 mt-3">{d.total}</p>
                      <p className="text-xs text-slate-500">proposal · {d.approved} disetujui</p>
                      <p className="text-xs text-amber-700 font-semibold mt-1">{rupiah(d.anggaran)}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Per kecamatan */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Rekap per Kecamatan</h3>
              {perKecamatan.length === 0 ? (
                <p className="text-sm text-slate-400">Belum ada data.</p>
              ) : (
                <div className="space-y-2.5">
                  {perKecamatan.map(row => (
                    <div key={row.nama} className="flex items-center gap-3">
                      <div className="w-40 flex-shrink-0 text-xs font-medium text-slate-600 truncate">{row.nama}</div>
                      <div className="flex-1 h-6 bg-slate-100 rounded-lg overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-lg flex items-center justify-end px-2"
                          style={{ width: `${Math.max(8, (row.total / maxKecTotal) * 100)}%` }}>
                          <span className="text-[11px] font-bold text-white">{row.total}</span>
                        </div>
                      </div>
                      <div className="w-32 flex-shrink-0 text-right text-[11px] text-slate-500">{rupiah(row.anggaran)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Baris arsip (read-only) ──────────────────────────────────────── */
const ArchiveRow = ({ proposal: p }) => {
  const firstKegiatan = p.kegiatan_list?.[0];
  const fileUrl = p.file_proposal
    ? `${imageBaseUrl}/storage/uploads/bankeu-perubahan/${p.file_proposal}`
    : null;
  const baUrl = p.berita_acara_path
    ? `${imageBaseUrl}${p.berita_acara_path.startsWith('/') ? '' : '/'}${p.berita_acara_path}`
    : null;
  const spUrl = p.surat_pengantar_kecamatan_path
    ? `${imageBaseUrl}${p.surat_pengantar_kecamatan_path.startsWith('/') ? '' : '/'}${p.surat_pengantar_kecamatan_path}`
    : null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <StatusBadge status={p.dpmd_status || 'pending'} />
            {KATEGORI_META[p.jenis_kegiatan] && (
              <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full border ${KATEGORI_META[p.jenis_kegiatan].badge}`}>
                {KATEGORI_META[p.jenis_kegiatan].label}
              </span>
            )}
          </div>
          <h4 className="font-bold text-slate-800 text-sm md:text-base leading-tight">{p.judul_proposal}</h4>

          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1"><LuHouse className="w-3.5 h-3.5 text-slate-400" /> {p.desa_nama || '-'}</span>
            <span className="inline-flex items-center gap-1"><LuBuilding2 className="w-3.5 h-3.5 text-slate-400" /> {p.kecamatan_nama || '-'}</span>
            <span>Diajukan: {fmtDate(p.submitted_to_dpmd_at || p.submitted_at || p.created_at)}</span>
          </div>

          {firstKegiatan && <p className="text-xs text-slate-600 mt-1"><span className="font-semibold">Kegiatan:</span> {firstKegiatan.nama_kegiatan}</p>}
          {p.nama_kegiatan_spesifik && <p className="text-sm text-slate-600 mt-0.5">{p.nama_kegiatan_spesifik}</p>}

          <div className="flex flex-wrap gap-1.5 mt-2 text-xs">
            {p.volume && (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-slate-600">
                <LuPackage className="w-3.5 h-3.5 text-slate-400" /> Vol: <strong className="text-slate-700">{p.volume}</strong>
              </span>
            )}
            {p.lokasi && (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-slate-600">
                <LuMapPin className="w-3.5 h-3.5 text-slate-400" /> {p.lokasi}
              </span>
            )}
            {p.anggaran_usulan && (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-100 rounded-lg text-amber-700 font-semibold">
                <LuDollarSign className="w-3.5 h-3.5" /> {rupiah(p.anggaran_usulan)}
              </span>
            )}
          </div>

          {p.kecamatan_catatan && (
            <div className="mt-2 text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-600"><strong className="text-slate-700">Catatan Kecamatan:</strong> {p.kecamatan_catatan}</div>
          )}
          {p.dpmd_catatan && (
            <div className="mt-2 text-xs bg-indigo-50 border border-indigo-100 rounded-lg p-2 text-indigo-800"><strong>Catatan DPMD:</strong> {p.dpmd_catatan}</div>
          )}
        </div>

        {/* Dokumen (read-only) */}
        <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0 md:justify-end">
          {fileUrl && (
            <a href={fileUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-colors" title="Lihat/unduh proposal">
              <LuEye className="w-3.5 h-3.5" /> Proposal
            </a>
          )}
          {baUrl && (
            <a href={baUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-colors" title="Berita Acara Kecamatan">
              <LuFileText className="w-3.5 h-3.5" /> BA
            </a>
          )}
          {spUrl && (
            <a href={spUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-colors" title="Surat Pengantar Kecamatan">
              <LuStamp className="w-3.5 h-3.5" /> SP
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default DinasBankeuPerubahanArsipPage;
