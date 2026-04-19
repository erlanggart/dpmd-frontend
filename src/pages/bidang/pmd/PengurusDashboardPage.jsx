import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useBidangPath } from "../../../hooks/useBidangPath";
import {
  LuUsers,
  LuShieldCheck,
  LuShieldAlert,
  LuSearch,
  LuRefreshCw,
  LuArrowLeft,
  LuChevronDown,
  LuChevronRight,
  LuChevronLeft,
  LuTriangleAlert,
  LuFilter,
  LuX,
  LuGraduationCap,
  LuCalendarDays,
  LuMapPin,
  LuBuilding2,
  LuExternalLink,
  LuDownload,
  LuHeart,
} from "react-icons/lu";
import { FaMars, FaVenus } from "react-icons/fa";
import * as XLSX from "xlsx";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import api from "../../../api";
import toast from "react-hot-toast";

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const TYPE_FILTER_OPTIONS = [
  { value: "rw", label: "RW" },
  { value: "rt", label: "RT" },
  { value: "posyandu", label: "Posyandu" },
  { value: "karang_taruna", label: "Karang Taruna" },
  { value: "lpm", label: "LPM" },
  { value: "pkk", label: "PKK" },
  { value: "satlinmas", label: "Satlinmas" },
  { value: "lembaga-lainnya", label: "Lembaga Lainnya" },
];

const TYPE_QUERY_MAP = {
  rw: "rws",
  rt: "rts",
  posyandu: "posyandus",
  karang_taruna: "karang_tarunas",
  lpm: "lpms",
  pkk: "pkks",
  satlinmas: "satlinmas",
  "lembaga-lainnya": "lembaga-lainnya",
};

const TYPE_LABELS = {
  rw: "RW",
  rws: "RW",
  rt: "RT",
  rts: "RT",
  posyandu: "Posyandu",
  posyandus: "Posyandu",
  karang_taruna: "Karang Taruna",
  karang_tarunas: "Karang Taruna",
  lpm: "LPM",
  lpms: "LPM",
  pkk: "PKK",
  pkks: "PKK",
  satlinmas: "Satlinmas",
  "lembaga-lainnya": "Lembaga Lainnya",
  lembaga_lainnyas: "Lembaga Lainnya",
};

const EDUCATION_ORDER = [
  "TIDAK SEKOLAH", "SD/MI", "SMP/MTS", "SMA/SMK/MA", "D1", "D2", "D3", "D4", "S1", "S2", "S3",
];

const AGE_RANGE_LABELS = {
  "<20": "< 20 Tahun",
  "20-30": "20 - 30 Tahun",
  "31-40": "31 - 40 Tahun",
  "41-50": "41 - 50 Tahun",
  "51-60": "51 - 60 Tahun",
  ">60": "> 60 Tahun",
  unknown: "Tidak Diketahui",
};

const VERIFICATION_STATUS = {
  verified: {
    label: "Terverifikasi",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  unverified: {
    label: "Belum Verifikasi",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  ditolak: {
    label: "Ditolak",
    className: "bg-rose-100 text-rose-700 border-rose-200",
  },
};

const getVerificationStatus = (status) => (
  VERIFICATION_STATUS[status] || {
    label: status || "Tidak diketahui",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  }
);

const VERIFICATION_SCOPE_OPTIONS = [
  {
    id: "verified",
    label: "Terverifikasi",
    description: "Hanya data yang lolos verifikasi masuk ke tabel dan statistik.",
    icon: LuShieldCheck,
    activeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    id: "unverified",
    label: "Belum Verifikasi",
    description: "Lihat data aktif yang masih menunggu proses verifikasi.",
    icon: LuShieldAlert,
    activeClass: "border-amber-200 bg-amber-50 text-amber-700",
  },
  {
    id: "ditolak",
    label: "Ditolak",
    description: "Lihat pengurus aktif yang verifikasinya ditolak seperti pada modul kelembagaan.",
    icon: LuX,
    activeClass: "border-rose-200 bg-rose-50 text-rose-700",
  },
];

export default function PengurusDashboardPage() {
  const navigate = useNavigate();
  const { getPath } = useBidangPath();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, per_page: 25, total: 0, total_pages: 1 });
  const [unverified, setUnverified] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [filters, setFilters] = useState({ kecamatans: [], desas: [] });
  const [exporting, setExporting] = useState(false);

  // Filter state
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKecamatan, setSelectedKecamatan] = useState("");
  const [selectedDesa, setSelectedDesa] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedJabatan, setSelectedJabatan] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [verificationScope, setVerificationScope] = useState("verified");
  const [showFilters, setShowFilters] = useState(false);
  const [showUnverified, setShowUnverified] = useState(false);
  const [showRejected, setShowRejected] = useState(false);
  const tableRef = useRef(null);

  // Debounce search input — reset page on new search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const buildParams = useCallback((overrides = {}) => {
    const params = new URLSearchParams();
    const mappedSelectedType = TYPE_QUERY_MAP[selectedType] || selectedType;
    if (selectedKecamatan) params.append("kecamatan_id", selectedKecamatan);
    if (selectedDesa) params.append("desa_id", selectedDesa);
    if (mappedSelectedType) params.append("pengurusable_type", mappedSelectedType);
    if (searchQuery.trim()) params.append("search", searchQuery.trim());
    if (selectedJabatan) params.append("jabatan", selectedJabatan);
    params.append("verification_scope", verificationScope);
    params.append("page", String(overrides.page || currentPage));
    params.append("per_page", "25");
    Object.entries(overrides).forEach(([k, v]) => { if (k !== 'page') params.set(k, String(v)); });
    return params;
  }, [selectedKecamatan, selectedDesa, selectedType, selectedJabatan, searchQuery, verificationScope, currentPage]);

  // Fetch summary/stats — only depends on verificationScope (no filters/search)
  const fetchSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.append("verification_scope", verificationScope);
      params.append("page", "1");
      params.append("per_page", "1");
      const res = await api.get(`/kelembagaan/pengurus-dashboard?${params}`);
      if (res.data.success) {
        setSummary(res.data.summary || null);
        setUnverified(res.data.unverified || []);
        setRejected(res.data.ditolak || []);
        setFilters(res.data.filters || { kecamatans: [], desas: [] });
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
    }
  }, [verificationScope]);

  // Fetch table data — depends on all filters/search/pagination
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = buildParams();
      const qs = params.toString();
      const res = await api.get(`/kelembagaan/pengurus-dashboard${qs ? `?${qs}` : ""}`);
      if (res.data.success) {
        setData(res.data.data || []);
        setPagination(res.data.pagination || { page: 1, per_page: 25, total: 0, total_pages: 1 });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Gagal memuat data pengurus");
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [buildParams]);

  // Summary: re-fetch only when verificationScope changes
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Table data: re-fetch when any filter/search/pagination/scope changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Scroll to table after pagination
  const [shouldScrollToTable, setShouldScrollToTable] = useState(false);
  useEffect(() => {
    if (!loading && shouldScrollToTable) {
      setShouldScrollToTable(false);
      tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading, shouldScrollToTable]);

  const handlePageChange = (newPage) => {
    setShouldScrollToTable(true);
    setCurrentPage(newPage);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const params = buildParams({ page: 1 });
      params.set("export_all", "1");
      const qs = params.toString();
      const res = await api.get(`/kelembagaan/pengurus-dashboard?${qs}`);
      if (!res.data.success) { toast.error("Gagal export data"); return; }
      const rows = (res.data.data || []).map((p, i) => {
        const gender = p.jenis_kelamin === 'Laki_laki' ? 'Laki-laki' : p.jenis_kelamin === 'Perempuan' ? 'Perempuan' : '-';
        const tipeLabel = TYPE_LABELS[p.pengurusable_type] || p.pengurusable_type;
        const lembaga = p.lembaga_label || tipeLabel;
        const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
        const phParts = [p.produk_hukum_nomor, p.produk_hukum_tahun].filter(Boolean);
        return {
          No: i + 1,
          NIK: p.nik || '-',
          Nama: p.nama_lengkap || '-',
          'Tempat Lahir': p.tempat_lahir || '-',
          'Tanggal Lahir': fmtDate(p.tanggal_lahir),
          'Jenis Kelamin': gender,
          Agama: p.agama || '-',
          'Status Perkawinan': p.status_perkawinan || '-',
          'Golongan Darah': p.golongan_darah || '-',
          'No HP/Telepon': p.no_telepon || '-',
          Alamat: p.alamat || '-',
          Jabatan: p.jabatan || '-',
          Lembaga: lembaga,
          Desa: p.desa_nama || '-',
          Kecamatan: p.kecamatan_nama || '-',
          'Tanggal Mulai Jabatan': fmtDate(p.tanggal_mulai_jabatan),
          'Tanggal Akhir Jabatan': fmtDate(p.tanggal_akhir_jabatan),
          'Produk Hukum (Nomor, Tahun)': phParts.length ? phParts.join(', ') : '-',
          'Nama Bank': p.nama_bank || '-',
          'Nomor Rekening': p.nomor_rekening || '-',
          'Nama Pemilik Rekening': p.nama_rekening || '-',
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Pengurus");
      const filterLabel = [selectedKecamatan && filters.kecamatans.find(k => String(k.id) === String(selectedKecamatan))?.nama, selectedDesa && filters.desas.find(d => String(d.id) === String(selectedDesa))?.nama].filter(Boolean).join('_') || 'Semua';
      XLSX.writeFile(wb, `Pengurus_${filterLabel}_${new Date().toISOString().slice(0,10)}.xlsx`);
      toast.success(`Berhasil export ${rows.length} data`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Gagal export data");
    } finally {
      setExporting(false);
    }
  };

  // Filter desas based on selected kecamatan
  const filteredDesas = useMemo(() => {
    if (!selectedKecamatan) return filters.desas;
    return filters.desas.filter((d) => String(d.kecamatan_id) === String(selectedKecamatan));
  }, [filters.desas, selectedKecamatan]);

  const jabatanList = summary?.jabatanList || [];
  const maxAgamaCount = summary ? Math.max(...Object.values(summary.agamaStats || {}), 1) : 1;

  const resetFilters = () => {
    setSearchInput("");
    setSearchQuery("");
    setSelectedKecamatan("");
    setSelectedDesa("");
    setSelectedType("");
    setSelectedJabatan("");
    setCurrentPage(1);
    setVerificationScope("verified");
    setShowUnverified(false);
    setShowRejected(false);
  };

  const hasActiveFilters = searchInput || selectedKecamatan || selectedDesa || selectedType || selectedJabatan || verificationScope !== "verified";
  const hasTypeStats = Boolean(summary && Object.keys(summary.typeStats || {}).length > 0);
  const hasYearlyStats = Boolean(summary && Object.keys(summary.yearlyStats || {}).length > 0);
  const matchingCounts = summary?.matchingCounts || { all: 0, verified: 0, unverified: 0, ditolak: 0 };
  const pendingVerificationCount = summary?.pendingVerificationCount ?? matchingCounts.unverified;
  const rejectedVerificationCount = summary?.rejectedVerificationCount ?? matchingCounts.ditolak;
  const currentScopeOption = VERIFICATION_SCOPE_OPTIONS.find((option) => option.id === verificationScope) || VERIFICATION_SCOPE_OPTIONS[0];
  const tableTitle = verificationScope === "verified"
    ? "Daftar Pengurus Terverifikasi"
    : verificationScope === "unverified"
      ? "Daftar Pengurus Belum Verifikasi"
      : "Daftar Pengurus Ditolak";
  const emptyTableText = verificationScope === "verified"
    ? "Tidak ada data pengurus terverifikasi"
    : verificationScope === "unverified"
      ? "Tidak ada data pengurus yang belum verifikasi"
      : "Tidak ada data pengurus yang ditolak";

  useEffect(() => {
    if (pendingVerificationCount === 0 && showUnverified) {
      setShowUnverified(false);
    }
  }, [pendingVerificationCount, showUnverified]);

  useEffect(() => {
    if (rejectedVerificationCount === 0 && showRejected) {
      setShowRejected(false);
    }
  }, [rejectedVerificationCount, showRejected]);

  // Compute max value for bar charts
  const maxAgeCount = summary ? Math.max(...Object.values(summary.ageRanges), 1) : 1;
  const maxEduCount = summary
    ? Math.max(...Object.values(summary.educationStats), 1)
    : 1;

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <LuRefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-gray-500">Memuat data pengurus...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 p-8 ">
      {/* Header */}
      <header className="flex rounded-xl shadow-sm border border-gray-200 bg-white items-center justify-between p-6">
              
                
                  <div className="flex items-center gap-3">
                    
                    <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-md">
                      <LuBuilding2 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                        Dashboard Pengurus
                      </h1>
                      <p className="hidden sm:block text-xs sm:text-sm text-gray-500">
                        {currentScopeOption.description}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { fetchSummary(); fetchData(); }}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors"
                  >
                    <LuRefreshCw className="h-4 w-4" />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                
              
            </header>

      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Mode Agregat
            </p>
            <h2 className="mt-1 text-lg font-semibold text-gray-900">
              Tentukan status verifikasi yang masuk ke statistik
            </h2>
            <p className="mt-2 text-sm text-gray-500 max-w-2xl">
              Statistik, grafik, dan tabel mengikuti status verifikasi yang dipilih. Default dashboard memakai data terverifikasi agar sesuai proses validasi.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:min-w-[560px]">
            {VERIFICATION_SCOPE_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = verificationScope === option.id;
              const count = matchingCounts[option.id] ?? 0;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => { setVerificationScope(option.id); setCurrentPage(1); }}
                  className={`rounded-xl border px-4 py-3 text-left transition-all ${
                    isActive
                      ? `${option.activeClass} shadow-sm`
                      : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-semibold">{option.label}</span>
                    </div>
                    <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-gray-700">
                      {count}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 bg-white rounded-xl border border-gray-200 p-5">
          <SummaryCard
            icon={<LuUsers className="w-6 h-6 text-blue-600" />}
            label="Total Ditampilkan"
            value={summary.total}
            bgColor="bg-blue-50"
            borderColor="border-blue-200"
          />
          <SummaryCard
            icon={<LuShieldCheck className="w-6 h-6 text-emerald-600" />}
            label="Terverifikasi"
            value={matchingCounts.verified}
            bgColor="bg-emerald-50"
            borderColor="border-emerald-200"
          />
          <SummaryCard
            icon={<LuShieldAlert className="w-6 h-6 text-amber-600" />}
            label="Belum Verifikasi"
            value={pendingVerificationCount}
            bgColor="bg-amber-50"
            borderColor="border-amber-200"
            onClick={() => setShowUnverified(!showUnverified)}
            clickable={verificationScope !== "unverified" && pendingVerificationCount > 0}
          />
          <SummaryCard
            icon={<LuX className="w-6 h-6 text-rose-600" />}
            label="Ditolak"
            value={rejectedVerificationCount}
            bgColor="bg-rose-50"
            borderColor="border-rose-200"
            onClick={() => setShowRejected(!showRejected)}
            clickable={verificationScope !== "ditolak" && rejectedVerificationCount > 0}
          />
          <SummaryCard
            icon={
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <FaMars className="w-4 h-4 text-blue-500" />
                  <span className="text-lg font-bold text-blue-600">
                    {summary.genderStats.L}
                  </span>
                </div>
                <span className="text-gray-300">|</span>
                <div className="flex items-center gap-1.5">
                  <FaVenus className="w-4 h-4 text-pink-500" />
                  <span className="text-lg font-bold text-pink-600">
                    {summary.genderStats.P}
                  </span>
                </div>
                {summary.genderStats.unknown > 0 && (
                  <>
                    <span className="text-gray-300">|</span>
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
                        ?
                      </span>
                      <span className="text-lg font-bold text-slate-600">
                        {summary.genderStats.unknown}
                      </span>
                    </div>
                  </>
                )}
              </div>
            }
            label="Jenis Kelamin"
            value=""
            bgColor="bg-purple-50"
            borderColor="border-purple-200"
            isCustomIcon
          />
        </div>
      )}

      {/* Status Detail Panels */}
      {verificationScope !== "unverified" && showUnverified && unverified.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <LuTriangleAlert className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-amber-800">
                Pengurus Belum Terverifikasi ({pendingVerificationCount})
              </h3>
            </div>
            <button
              onClick={() => setShowUnverified(false)}
              className="p-1 hover:bg-amber-100 rounded"
            >
              <LuX className="w-4 h-4 text-amber-600" />
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {unverified.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(getPath(`/bidang/pmd/pengurus/${p.id}`))}
                className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-amber-100 hover:border-amber-300 hover:shadow-sm transition-all text-left"
              >
                <div>
                  <p className="font-medium text-gray-800">{p.nama_lengkap}</p>
                  <p className="text-xs text-gray-500">
                    {p.jabatan} — {TYPE_LABELS[p.pengurusable_type] || p.pengurusable_type}
                  </p>
                  <p className="text-xs text-gray-400">
                    {p.desa_nama}, {p.kecamatan_nama}
                  </p>
                </div>
                <LuExternalLink className="w-4 h-4 text-amber-500 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {verificationScope !== "ditolak" && showRejected && rejected.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <LuX className="w-5 h-5 text-rose-600" />
              <h3 className="font-semibold text-rose-800">
                Pengurus Ditolak ({rejectedVerificationCount})
              </h3>
            </div>
            <button
              onClick={() => setShowRejected(false)}
              className="p-1 hover:bg-rose-100 rounded"
            >
              <LuX className="w-4 h-4 text-rose-600" />
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {rejected.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(getPath(`/bidang/pmd/pengurus/${p.id}`))}
                className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-rose-100 hover:border-rose-300 hover:shadow-sm transition-all text-left"
              >
                <div>
                  <p className="font-medium text-gray-800">{p.nama_lengkap}</p>
                  <p className="text-xs text-gray-500">
                    {p.jabatan} — {TYPE_LABELS[p.pengurusable_type] || p.pengurusable_type}
                  </p>
                  <p className="text-xs text-gray-400">
                    {p.desa_nama}, {p.kecamatan_nama}
                  </p>
                </div>
                <LuExternalLink className="w-4 h-4 text-rose-500 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Infographics */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Gender Pie Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <LuUsers className="w-4 h-4 text-purple-500" />
              Jenis Kelamin
            </h3>
            <GenderChart
              male={summary.genderStats.L}
              female={summary.genderStats.P}
              unknown={summary.genderStats.unknown}
            />
          </div>

          {/* Age Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <LuCalendarDays className="w-4 h-4 text-orange-500" />
              Rentang Umur
            </h3>
            <div className="space-y-2">
              {Object.entries(summary.ageRanges)
                .filter(([key]) => key !== "unknown")
                .map(([range, count]) => (
                  <BarRow
                    key={range}
                    label={AGE_RANGE_LABELS[range] || range}
                    value={count}
                    max={maxAgeCount}
                    color="bg-orange-400"
                  />
                ))}
              {summary.ageRanges.unknown > 0 && (
                <BarRow
                  label="Tidak Diketahui"
                  value={summary.ageRanges.unknown}
                  max={maxAgeCount}
                  color="bg-gray-300"
                />
              )}
            </div>
          </div>

          {/* Education Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <LuGraduationCap className="w-4 h-4 text-indigo-500" />
              Pendidikan
            </h3>
            <div className="space-y-2">
              {Object.entries(summary.educationStats)
                .sort((a, b) => {
                  const ia = EDUCATION_ORDER.indexOf(a[0]);
                  const ib = EDUCATION_ORDER.indexOf(b[0]);
                  if (ia === -1 && ib === -1) return a[0].localeCompare(b[0]);
                  if (ia === -1) return 1;
                  if (ib === -1) return -1;
                  return ia - ib;
                })
                .map(([edu, count]) => (
                  <BarRow
                    key={edu}
                    label={edu}
                    value={count}
                    max={maxEduCount}
                    color="bg-indigo-400"
                  />
                ))}
            </div>
          </div>

          {/* Religion Distribution */}
          {summary.agamaStats && Object.keys(summary.agamaStats).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <LuHeart className="w-4 h-4 text-rose-500" />
                Agama
              </h3>
              <div className="space-y-2">
                {Object.entries(summary.agamaStats)
                  .sort((a, b) => b[1] - a[1])
                  .map(([agama, count]) => (
                    <BarRow
                      key={agama}
                      label={agama}
                      value={count}
                      max={maxAgamaCount}
                      color="bg-rose-400"
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Kelembagaan Charts */}
      {summary && (hasTypeStats || hasYearlyStats) && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12" style={{ alignItems: 'stretch' }}>
          {hasTypeStats && (
            <TypeDistributionChart
              typeStats={summary.typeStats}
              className={hasYearlyStats ? "xl:col-span-4 flex flex-col" : "xl:col-span-12"}
            />
          )}
          {hasYearlyStats && (
            <YearlyPengurusChart
              yearlyStats={summary.yearlyStats}
              className={hasTypeStats ? "xl:col-span-8 flex flex-col" : "xl:col-span-12"}
            />
          )}
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama, jabatan, atau NIK..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm rounded-lg border transition-colors ${
              showFilters || hasActiveFilters
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <LuFilter className="w-4 h-4" />
            Filter
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LuX className="w-4 h-4" />
              Reset
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 text-sm bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg transition-colors disabled:opacity-50"
          >
            <LuDownload className="w-4 h-4" />
            {exporting ? "Mengexport..." : "Export Excel"}
          </button>
        </div>

        {/* Filter dropdowns */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-100">
            <select
              value={selectedKecamatan}
              onChange={(e) => {
                setSelectedKecamatan(e.target.value);
                setSelectedDesa("");
                setCurrentPage(1);
              }}
              className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Kecamatan</option>
              {filters.kecamatans.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
            <select
              value={selectedDesa}
              onChange={(e) => { setSelectedDesa(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Desa</option>
              {filteredDesas.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nama}
                </option>
              ))}
            </select>
            <select
              value={selectedType}
              onChange={(e) => { setSelectedType(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Kelembagaan</option>
              {TYPE_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={selectedJabatan}
              onChange={(e) => { setSelectedJabatan(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Jabatan</option>
              {jabatanList.map((jab) => (
                <option key={jab} value={jab}>
                  {jab}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Pengurus Table */}
      <div ref={tableRef} className="bg-white rounded-xl border border-gray-200 overflow-hidden scroll-mt-4">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">
            {tableTitle}
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({pagination.total} orang)
            </span>
          </h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">
            <LuRefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
            <p className="text-sm">Memuat data...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <LuUsers className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>{emptyTableText}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-left px-4 py-3 font-medium">No</th>
                  <th className="text-left px-4 py-3 font-medium">Nama</th>
                  <th className="text-left px-4 py-3 font-medium">Jabatan</th>
                  <th className="text-left px-4 py-3 font-medium">Kelembagaan</th>
                  <th className="text-left px-4 py-3 font-medium">Desa</th>
                  <th className="text-left px-4 py-3 font-medium">Kecamatan</th>
                  <th className="text-left px-4 py-3 font-medium">Verifikasi</th>
                  <th className="text-center px-4 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((p, idx) => {
                  const verificationStatus = getVerificationStatus(p.status_verifikasi);
                  const rowNum = (pagination.page - 1) * pagination.per_page + idx + 1;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                      onClick={() => navigate(getPath(`/bidang/pmd/pengurus/${p.id}`))}
                    >
                      <td className="px-4 py-3 text-gray-500">{rowNum}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {p.nama_lengkap}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.jabatan}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 text-xs font-medium bg-teal-100 text-teal-700 rounded-full">
                          {p.lembaga_label || TYPE_LABELS[p.pengurusable_type] || p.pengurusable_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.desa_nama}</td>
                      <td className="px-4 py-3 text-gray-600">{p.kecamatan_nama}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${verificationStatus.className}`}>
                          {verificationStatus.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(getPath(`/bidang/pmd/pengurus/${p.id}`));
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Lihat Detail"
                        >
                          <LuExternalLink className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Menampilkan {(pagination.page - 1) * pagination.per_page + 1}–{Math.min(pagination.page * pagination.per_page, pagination.total)} dari {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <LuChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(pagination.total_pages, 7) }, (_, i) => {
                let pageNum;
                if (pagination.total_pages <= 7) {
                  pageNum = i + 1;
                } else if (pagination.page <= 4) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.total_pages - 3) {
                  pageNum = pagination.total_pages - 6 + i;
                } else {
                  pageNum = pagination.page - 3 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                      pageNum === pagination.page
                        ? "bg-blue-500 text-white"
                        : "hover:bg-gray-100 text-gray-600"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.total_pages}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <LuChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ========================
   Sub-components
   ======================== */

function SummaryCard({ icon, label, value, bgColor, borderColor, onClick, clickable, isCustomIcon }) {
  const Wrapper = clickable ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={`${bgColor} border ${borderColor} rounded-xl p-4 ${
        clickable ? "cursor-pointer hover:shadow-md transition-shadow text-left w-full" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        {isCustomIcon ? icon : <div>{icon}</div>}
        {clickable && <LuChevronRight className="w-4 h-4 text-gray-400" />}
      </div>
      {value !== "" && (
        <p className="text-2xl font-bold text-gray-800 mt-2">{value.toLocaleString()}</p>
      )}
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </Wrapper>
  );
}

function GenderChart({ male, female, unknown = 0 }) {
  const total = male + female + unknown;

  if (total === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-400">
        Belum ada data jenis kelamin yang bisa divisualisasikan.
      </div>
    );
  }

  const malePct = Math.round((male / total) * 100);
  const femalePct = Math.round((female / total) * 100);
  const unknownPct = Math.max(0, 100 - malePct - femalePct);

  return (
    <div>
      {/* Visual bar */}
      <div className="flex rounded-full overflow-hidden h-6 mb-3">
        {malePct > 0 && (
          <div
            className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium transition-all duration-500"
            style={{ width: `${malePct}%` }}
          >
            {malePct > 10 ? `${malePct}%` : ""}
          </div>
        )}
        {femalePct > 0 && (
          <div
            className="bg-pink-500 flex items-center justify-center text-white text-xs font-medium transition-all duration-500"
            style={{ width: `${femalePct}%` }}
          >
            {femalePct > 10 ? `${femalePct}%` : ""}
          </div>
        )}
        {unknownPct > 0 && (
          <div
            className="bg-slate-400 flex items-center justify-center text-white text-xs font-medium transition-all duration-500"
            style={{ width: `${unknownPct}%` }}
          >
            {unknownPct > 10 ? `${unknownPct}%` : ""}
          </div>
        )}
      </div>
      <div className="flex justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-gray-600">Laki-laki ({male})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-pink-500" />
          <span className="text-gray-600">Perempuan ({female})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-slate-400" />
          <span className="text-gray-600">Tidak diketahui ({unknown})</span>
        </div>
      </div>
    </div>
  );
}

function BarRow({ label, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-28 flex-shrink-0 truncate" title={label}>
        {label}
      </span>
      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
        <div
          className={`${color} h-full rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-8 text-right">{value}</span>
    </div>
  );
}

const TYPE_DOUGHNUT_COLORS = [
  "#3b82f6", "#06b6d4", "#9333ea", "#ea580c", "#4f46e5", "#ec4899", "#16a34a", "#eab308",
];

function TypeDistributionChart({ typeStats, className = "" }) {
  const MAIN_TYPES = ["RW", "RT", "Posyandu", "Karang Taruna", "LPM", "PKK", "Satlinmas"];
  const merged = {};
  let lainnya = 0;
  Object.entries(typeStats).forEach(([type, count]) => {
    if (MAIN_TYPES.includes(type)) {
      merged[type] = count;
    } else {
      lainnya += count;
    }
  });
  if (lainnya > 0) merged["Lainnya"] = lainnya;

  const sorted = Object.entries(merged).sort((a, b) => b[1] - a[1]);
  const labels = sorted.map(([t]) => t);
  const values = sorted.map(([, v]) => v);
  const total = values.reduce((a, b) => a + b, 0);

  const chartData = {
    labels,
    datasets: [{
      data: values,
      backgroundColor: TYPE_DOUGHNUT_COLORS.slice(0, labels.length),
      borderColor: "#fff",
      borderWidth: 2,
      hoverOffset: 6,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "60%",
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.85)",
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => {
            const pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
            return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 ${className}`.trim()}>
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <LuBuilding2 className="w-4 h-4 text-teal-500" />
        Distribusi per Kelembagaan
      </h3>
      <p className="mb-5 text-xs text-gray-400">
        Komposisi pengurus berdasarkan jenis kelembagaan pada hasil filter dan status verifikasi yang sedang aktif.
      </p>
      <div className="grid grid-cols-1 gap-5">
        <div className="mx-auto h-56 w-56 max-w-full">
          <Doughnut data={chartData} options={chartOptions} />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
          {sorted.map(([type, count], i) => (
            <div
              key={type}
              className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2"
            >
              <span
                className="h-3 w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: TYPE_DOUGHNUT_COLORS[i] }}
              />
              <span className="text-sm text-gray-700 flex-1">{type}</span>
              <span className="text-sm font-bold text-gray-900">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const YEARLY_COLORS = {
  RW: "#3b82f6",
  RT: "#06b6d4",
  Posyandu: "#9333ea",
  "Karang Taruna": "#ea580c",
  LPM: "#4f46e5",
  PKK: "#ec4899",
  Satlinmas: "#16a34a",
  Lainnya: "#eab308",
};

function YearlyPengurusChart({ yearlyStats, className = "" }) {
  const MAIN_TYPES = ["RW", "RT", "Posyandu", "Karang Taruna", "LPM", "PKK", "Satlinmas"];
  const years = Object.keys(yearlyStats).sort();

  // Collect all types across years, merge non-main into "Lainnya"
  const allTypes = new Set();
  years.forEach((y) => {
    Object.keys(yearlyStats[y]).forEach((t) => {
      if (MAIN_TYPES.includes(t)) allTypes.add(t);
      else allTypes.add("Lainnya");
    });
  });
  const types = [...allTypes].sort((a, b) => {
    const ia = MAIN_TYPES.indexOf(a);
    const ib = MAIN_TYPES.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  const datasets = types.map((type) => ({
    label: type,
    data: years.map((y) => {
      if (type === "Lainnya") {
        return Object.entries(yearlyStats[y] || {})
          .filter(([t]) => !MAIN_TYPES.includes(t))
          .reduce((sum, [, v]) => sum + v, 0);
      }
      return yearlyStats[y]?.[type] || 0;
    }),
    backgroundColor: YEARLY_COLORS[type] || "#94a3b8",
    borderColor: YEARLY_COLORS[type] || "#94a3b8",
    borderWidth: 1,
    borderRadius: 4,
    barPercentage: 0.7,
    categoryPercentage: 0.8,
  }));

  const chartData = { labels: years, datasets };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          padding: 16,
          usePointStyle: true,
          pointStyle: "rectRounded",
          font: { size: 11, weight: "500" },
          boxWidth: 10,
        },
      },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.85)",
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y} pengurus`,
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { font: { size: 12, weight: "600" } },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        grid: { color: "rgba(0,0,0,0.04)" },
        ticks: { font: { size: 11 }, precision: 0 },
        title: { display: true, text: "Jumlah Pengurus", font: { size: 12 } },
      },
    },
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 ${className}`.trim()}>
      <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
        <LuCalendarDays className="w-4 h-4 text-blue-500" />
        Jumlah Pengurus per Kelembagaan per Tahun
      </h3>
      <p className="text-xs text-gray-400 mb-4">Pengurus aktif sesuai filter dan status verifikasi yang sedang dipilih</p>
      <div className="flex-1 min-h-[320px]">
        <Bar data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}
