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
  LuFilter,
  LuX,
  LuGraduationCap,
  LuCalendarDays,
  LuMapPin,
  LuBuilding2,
  LuExternalLink,
  LuDownload,
  LuHeart,
  LuFileSpreadsheet,
  LuUserX,
  LuChartPie,
} from "react-icons/lu";
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

// Label jenjang mengikuti rekap backend (src/utils/jenjangPendidikan.js), yang
// sudah menyatukan ejaan setara seperti "SD/MI" dengan "SD".
const EDUCATION_ORDER = [
  "Tidak Sekolah", "SD / Sederajat", "SMP / Sederajat", "SMA / SMK / Sederajat",
  "Diploma I-II", "Diploma III", "S1 / Diploma IV", "S2", "S3", "Tidak Diketahui",
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

const JABATAN_STATUS_BADGE = {
  aktif: { label: "Aktif", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  selesai: { label: "Selesai", className: "bg-slate-100 text-slate-600 border-slate-200" },
  nonaktif: { label: "Nonaktif", className: "bg-gray-200 text-gray-700 border-gray-300" },
};

const getJabatanStatus = (status) => (
  JABATAN_STATUS_BADGE[status] || {
    label: status || "Tidak diketahui",
    className: "bg-slate-100 text-slate-500 border-slate-200",
  }
);

const STAT_ACCENTS = {
  blue: { bg: "bg-blue-50/70", border: "border-blue-100", text: "text-blue-600", ring: "#3b82f6" },
  emerald: { bg: "bg-emerald-50/70", border: "border-emerald-100", text: "text-emerald-600", ring: "#10b981" },
  amber: { bg: "bg-amber-50/70", border: "border-amber-100", text: "text-amber-600", ring: "#f59e0b" },
  rose: { bg: "bg-rose-50/70", border: "border-rose-100", text: "text-rose-600", ring: "#f43f5e" },
  slate: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-600", ring: "#64748b" },
};

const formatNumber = (value) => Number(value || 0).toLocaleString("id-ID");

const toPercent = (value, total) => (total > 0 ? (Number(value || 0) / total) * 100 : 0);

const formatPercentValue = (percent) => `${Number(percent || 0).toLocaleString("id-ID", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})}%`;

const formatPercent = (value, total) => formatPercentValue(toPercent(value, total));

const getVerificationStatus = (status) => (
  VERIFICATION_STATUS[status] || {
    label: status || "Tidak diketahui",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  }
);

// Kartu statistik sekaligus tab: memilih kartu menentukan data di grafik dan tabel.
// Terverifikasi/Belum/Ditolak = pengurus aktif; Tidak Aktif = selesai + nonaktif.
const STAT_TABS = [
  {
    id: "all",
    label: "Total Keseluruhan",
    caption: "seluruh data pengurus",
    tableTitle: "Daftar Seluruh Pengurus",
    verification: "all",
    jabatan: "all",
    icon: LuUsers,
    accent: STAT_ACCENTS.blue,
  },
  {
    id: "verified",
    label: "Terverifikasi",
    caption: "pengurus aktif lolos verifikasi",
    tableTitle: "Daftar Pengurus Terverifikasi",
    verification: "verified",
    jabatan: "aktif",
    icon: LuShieldCheck,
    accent: STAT_ACCENTS.emerald,
  },
  {
    id: "unverified",
    label: "Belum Verifikasi",
    caption: "belum / sedang mengajukan verifikasi",
    tableTitle: "Daftar Pengurus Belum Verifikasi",
    verification: "unverified",
    jabatan: "aktif",
    icon: LuShieldAlert,
    accent: STAT_ACCENTS.amber,
  },
  {
    id: "ditolak",
    label: "Ditolak",
    caption: "verifikasi ditolak",
    tableTitle: "Daftar Pengurus Ditolak",
    verification: "ditolak",
    jabatan: "aktif",
    icon: LuX,
    accent: STAT_ACCENTS.rose,
  },
  {
    id: "tidak_aktif",
    label: "Tidak Aktif",
    caption: "dinonaktifkan / purna tugas",
    tableTitle: "Daftar Pengurus Tidak Aktif",
    verification: "all",
    jabatan: "tidak_aktif",
    icon: LuUserX,
    accent: STAT_ACCENTS.slate,
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
  const [yearlyStats, setYearlyStats] = useState({});
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [yearlyLoading, setYearlyLoading] = useState(true);
  // Nomor permintaan terakhir: respons lama yang datang belakangan (klik tab beruntun)
  // diabaikan supaya tidak menimpa data permintaan terbaru.
  const summaryReq = useRef(0);
  const dataReq = useRef(0);
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
  const [activeTab, setActiveTab] = useState("verified");
  const [selectedTahun, setSelectedTahun] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const tableRef = useRef(null);
  const currentTab = STAT_TABS.find((tab) => tab.id === activeTab) || STAT_TABS[0];
  const verificationScope = currentTab.verification;
  const jabatanScope = currentTab.jabatan;

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
    if (selectedTahun) params.append("tahun", selectedTahun);
    params.append("verification_scope", verificationScope);
    params.append("status_jabatan", jabatanScope);
    params.append("page", String(overrides.page || currentPage));
    params.append("per_page", "25");
    Object.entries(overrides).forEach(([k, v]) => { if (k !== 'page') params.set(k, String(v)); });
    return params;
  }, [selectedKecamatan, selectedDesa, selectedType, selectedJabatan, searchQuery, verificationScope, jabatanScope, selectedTahun, currentPage]);

  const fetchSummary = useCallback(async () => {
    const reqId = ++summaryReq.current;
    setSummaryLoading(true);
    try {
      // Statistik mengikuti tab kartu, kelembagaan, tahun, dan wilayah, tapi sengaja
      // mengabaikan kotak pencarian & filter jabatan agar angka agregat tidak melompat
      // saat mengetik.
      const params = new URLSearchParams();
      params.append("verification_scope", verificationScope);
      params.append("status_jabatan", jabatanScope);
      if (selectedTahun) params.append("tahun", selectedTahun);
      if (selectedType) params.append("pengurusable_type", TYPE_QUERY_MAP[selectedType] || selectedType);
      if (selectedKecamatan) params.append("kecamatan_id", selectedKecamatan);
      if (selectedDesa) params.append("desa_id", selectedDesa);
      params.append("summary_only", "1");
      params.append("page", "1");
      params.append("per_page", "1");
      const res = await api.get(`/kelembagaan/pengurus-dashboard?${params}`);
      if (reqId !== summaryReq.current) return;
      if (res.data.success) {
        setSummary(res.data.summary || null);
        setFilters(res.data.filters || { kecamatans: [], desas: [] });
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
    } finally {
      if (reqId === summaryReq.current) setSummaryLoading(false);
    }
  }, [verificationScope, jabatanScope, selectedTahun, selectedType, selectedKecamatan, selectedDesa]);

  // Tren per tahun sengaja tanpa filter apa pun: pengurus aktif terverifikasi.
  const fetchYearly = useCallback(async () => {
    setYearlyLoading(true);
    try {
      const res = await api.get("/kelembagaan/pengurus-dashboard?verification_scope=verified&status_jabatan=aktif&summary_only=1&page=1&per_page=1");
      if (res.data.success) setYearlyStats(res.data.summary?.yearlyStats || {});
    } catch (error) {
      console.error("Error fetching yearly stats:", error);
    } finally {
      setYearlyLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchYearly();
  }, [fetchYearly]);

  // Fetch table data — depends on all filters/search/pagination
  const fetchData = useCallback(async () => {
    const reqId = ++dataReq.current;
    try {
      setLoading(true);
      const params = buildParams();
      const qs = params.toString();
      const res = await api.get(`/kelembagaan/pengurus-dashboard${qs ? `?${qs}` : ""}`);
      if (reqId !== dataReq.current) return;
      if (res.data.success) {
        setData(res.data.data || []);
        setPagination(res.data.pagination || { page: 1, per_page: 25, total: 0, total_pages: 1 });
      }
    } catch (error) {
      if (reqId !== dataReq.current) return;
      console.error("Error fetching data:", error);
      toast.error("Gagal memuat data pengurus");
    } finally {
      if (reqId === dataReq.current) {
        setLoading(false);
        setInitialLoading(false);
      }
    }
  }, [buildParams]);

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
          'Status Jabatan': getJabatanStatus(p.status_jabatan).label,
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

  // Reset hanya filter tabel; tab kartu, kelembagaan & tahun selalu terlihat di atas.
  const resetFilters = () => {
    setSearchInput("");
    setSearchQuery("");
    setSelectedKecamatan("");
    setSelectedDesa("");
    setSelectedJabatan("");
    setCurrentPage(1);
  };

  const hasActiveFilters = searchInput || selectedKecamatan || selectedDesa || selectedJabatan;
  const hasYearlyStats = Object.keys(yearlyStats).length > 0;
  const cardCounts = summary?.cardCounts || { total: 0, verified: 0, unverified: 0, ditolak: 0, tidak_aktif: 0 };
  const cardValue = (tabId) => (tabId === "all" ? cardCounts.total : cardCounts[tabId]);
  const activeTotal = cardCounts.verified + cardCounts.unverified + cardCounts.ditolak;
  const availableYears = summary?.availableYears || [];
  const displayedTotal = summary?.total || 0;
  // Distribusi kelembagaan tidak berguna saat satu lembaga sudah dipilih (pasti 100%).
  const showTypeChart = !selectedType && Object.keys(summary?.typeStats || {}).length > 0;

  const selectTab = (tabId) => { setActiveTab(tabId); setCurrentPage(1); };
  const selectType = (type) => { setSelectedType(type); setCurrentPage(1); };

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
                        Data, statistik, dan tren pengurus kelembagaan desa.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(getPath("/bidang/pmd/pengurus/import"))}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-colors"
                    >
                      <LuFileSpreadsheet className="h-4 w-4" />
                      <span className="hidden sm:inline">Import Excel</span>
                    </button>
                    <button
                      onClick={() => { fetchYearly(); fetchSummary(); fetchData(); }}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors"
                    >
                      <LuRefreshCw className="h-4 w-4" />
                      <span className="hidden sm:inline">Refresh</span>
                    </button>
                  </div>
                
              
            </header>

      {/* Tren per tahun: tidak ikut filter di bawahnya */}
      {yearlyLoading ? (
        <LoadingPanel className="h-[380px]" text="Memuat tren pengurus per tahun..." />
      ) : hasYearlyStats && <YearlyPengurusChart yearlyStats={yearlyStats} />}

      {/* Filter statistik: kelembagaan (tab) + sejak tahun */}
      <section className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <LuChartPie className="h-3.5 w-3.5" />
              Statistik per Kelembagaan
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[{ value: "", label: "Semua" }, ...TYPE_FILTER_OPTIONS].map((option) => (
                <button
                  key={option.value || "all"}
                  type="button"
                  onClick={() => selectType(option.value)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    selectedType === option.value
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="w-full lg:w-48 flex-shrink-0">
            <FilterSelect
              label="Sejak Tahun"
              icon={LuCalendarDays}
              value={selectedTahun}
              onChange={(value) => { setSelectedTahun(value); setCurrentPage(1); }}
            >
              <option value="">Semua Tahun</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>{year} - sekarang</option>
              ))}
            </FilterSelect>
          </div>
        </div>
      </section>

      {/* Kartu statistik sekaligus tab tampilan grafik & tabel */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {STAT_TABS.map((tab) => (
          <StatCard
            key={tab.id}
            icon={tab.icon}
            label={tab.label}
            value={cardValue(tab.id)}
            // Persentase hanya untuk status verifikasi, terhadap total pengurus aktif.
            percent={tab.verification === "all" ? null : toPercent(cardValue(tab.id), activeTotal)}
            caption={tab.caption}
            accent={tab.accent}
            active={activeTab === tab.id}
            loading={summaryLoading}
            onClick={() => selectTab(tab.id)}
          />
        ))}
      </div>

      {/* Infographics: mengikuti kartu yang dipilih */}
      {(summaryLoading || !summary) ? (
        <LoadingPanel className="h-[420px]" text={`Memuat statistik ${currentTab.label.toLowerCase()}...`} />
      ) : (
        <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${showTypeChart ? "xl:grid-cols-3" : "xl:grid-cols-4"}`}>
          {/* Gender */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <ChartCardHeader
              icon={LuUsers}
              iconClass="text-purple-500"
              title="Jenis Kelamin"
              total={displayedTotal}
            />
            <GenderDonut
              male={summary.genderStats.L}
              female={summary.genderStats.P}
              unknown={summary.genderStats.unknown}
            />
          </div>

          {showTypeChart && (
            <TypeDistributionChart typeStats={summary.typeStats} className="xl:col-span-2" />
          )}

          {/* Age Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <ChartCardHeader
              icon={LuCalendarDays}
              iconClass="text-orange-500"
              title="Rentang Umur"
              total={displayedTotal}
            />
            <div className="space-y-2">
              {Object.entries(summary.ageRanges)
                .filter(([key]) => key !== "unknown")
                .map(([range, count]) => (
                  <BarRow
                    key={range}
                    label={AGE_RANGE_LABELS[range] || range}
                    value={count}
                    max={maxAgeCount}
                    total={displayedTotal}
                    color="bg-orange-400"
                  />
                ))}
              {summary.ageRanges.unknown > 0 && (
                <BarRow
                  label="Tidak Diketahui"
                  value={summary.ageRanges.unknown}
                  max={maxAgeCount}
                  total={displayedTotal}
                  color="bg-gray-300"
                />
              )}
            </div>
          </div>

          {/* Education Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <ChartCardHeader
              icon={LuGraduationCap}
              iconClass="text-indigo-500"
              title="Pendidikan"
              total={displayedTotal}
            />
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
                    total={displayedTotal}
                    color="bg-indigo-400"
                  />
                ))}
            </div>
          </div>

          {/* Religion Distribution */}
          <div className={`bg-white rounded-xl border border-gray-200 p-5 ${showTypeChart ? "md:col-span-2 xl:col-span-1" : ""}`}>
            <ChartCardHeader
              icon={LuHeart}
              iconClass="text-rose-500"
              title="Agama"
              total={displayedTotal}
            />
            <div className="space-y-2">
              {Object.entries(summary.agamaStats || {})
                .sort((a, b) => b[1] - a[1])
                .map(([agama, count]) => (
                  <BarRow
                    key={agama}
                    label={agama}
                    value={count}
                    max={maxAgamaCount}
                    total={displayedTotal}
                    color="bg-rose-400"
                  />
                ))}
            </div>
          </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-100">
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
          <div>
            <h3 className="font-semibold text-gray-800">
              {currentTab.tableTitle}
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({formatNumber(pagination.total)} orang)
              </span>
            </h3>
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">
            <LuRefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
            <p className="text-sm">Memuat data...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <LuUsers className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>Tidak ada data pada {currentTab.tableTitle.toLowerCase()}</p>
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
                  <th className="text-left px-4 py-3 font-medium">Status Jabatan</th>
                  <th className="text-center px-4 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((p, idx) => {
                  const verificationStatus = getVerificationStatus(p.status_verifikasi);
                  const jabatanStatus = getJabatanStatus(p.status_jabatan);
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
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${jabatanStatus.className}`}>
                          {jabatanStatus.label}
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

function FilterSelect({ label, icon: Icon, value, onChange, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-gray-500">{label}</span>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        )}
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pr-9 text-sm text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 ${Icon ? "pl-9" : "pl-3"}`}
        >
          {children}
        </select>
        <LuChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>
    </label>
  );
}

function DonutRing({ percent, color }) {
  const safe = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative h-16 w-16 flex-shrink-0">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="7" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - safe / 100)}
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-gray-700">
        {formatPercentValue(safe)}
      </span>
    </div>
  );
}

function LoadingPanel({ text, className = "" }) {
  return (
    <div className={`flex items-center justify-center rounded-xl border border-gray-200 bg-white ${className}`.trim()}>
      <div className="text-center text-gray-400">
        <LuRefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-blue-500" />
        <p className="text-sm">{text}</p>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, percent, caption, accent, onClick, active, loading }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`w-full rounded-2xl border ${accent.border} ${accent.bg} p-5 text-left transition-shadow hover:shadow-md ${
        active ? "ring-2 ring-offset-1 shadow-md" : ""
      }`}
      style={active ? { "--tw-ring-color": accent.ring } : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/80 ${accent.text}`}>
              <Icon className="h-4 w-4" />
            </span>
            <span className="truncate text-sm font-semibold text-gray-700">{label}</span>
          </div>
          {loading ? (
            <div className="mt-3 flex h-9 items-center">
              <LuRefreshCw className={`h-5 w-5 animate-spin ${accent.text}`} />
            </div>
          ) : (
            <p className="mt-3 text-3xl font-bold tracking-tight text-gray-900">
              {formatNumber(value)}
            </p>
          )}
          {caption && <p className="mt-1.5 text-xs text-gray-500">{caption}</p>}
        </div>
        {percent != null && !loading && <DonutRing percent={percent} color={accent.ring} />}
      </div>
    </button>
  );
}

function ChartCardHeader({ icon: Icon, iconClass, title, total, subtitle }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Icon className={`h-4 w-4 ${iconClass}`} />
          {title}
        </h3>
        {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
      </div>
      <span className="whitespace-nowrap text-xs text-gray-400">
        Total <span className="font-semibold text-gray-600">{formatNumber(total)}</span>
      </span>
    </div>
  );
}

const GENDER_SEGMENT_COLORS = {
  "Laki-laki": "#3b82f6",
  Perempuan: "#ec4899",
  "Tidak diketahui": "#94a3b8",
};

function GenderDonut({ male, female, unknown = 0 }) {
  const total = male + female + unknown;

  if (total === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-400">
        Belum ada data jenis kelamin yang bisa divisualisasikan.
      </div>
    );
  }

  const segments = [
    { label: "Laki-laki", value: male },
    { label: "Perempuan", value: female },
    { label: "Tidak diketahui", value: unknown },
  ].filter((segment) => segment.value > 0);

  const chartData = {
    labels: segments.map((segment) => segment.label),
    datasets: [{
      data: segments.map((segment) => segment.value),
      backgroundColor: segments.map((segment) => GENDER_SEGMENT_COLORS[segment.label]),
      borderColor: "#fff",
      borderWidth: 2,
      hoverOffset: 6,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "68%",
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.85)",
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${formatNumber(ctx.parsed)} (${formatPercent(ctx.parsed, total)})`,
        },
      },
    },
  };

  return (
    <div>
      <div className="relative mx-auto h-48 w-48 max-w-full">
        <Doughnut data={chartData} options={chartOptions} />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-gray-900">{formatNumber(total)}</span>
          <span className="text-[11px] text-gray-400">Total</span>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: GENDER_SEGMENT_COLORS[segment.label] }}
            />
            <span className="flex-1 truncate text-gray-600">{segment.label}</span>
            <span className="font-semibold text-gray-800">{formatNumber(segment.value)}</span>
            <span className="w-14 text-right text-xs tabular-nums text-gray-400">
              {formatPercent(segment.value, total)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarRow({ label, value, max, total, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-24 flex-shrink-0 truncate text-xs text-gray-600" title={label}>
        {label}
      </span>
      <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`${color} h-full rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-12 flex-shrink-0 text-right text-xs font-semibold tabular-nums text-gray-700">
        {formatNumber(value)}
      </span>
      <span className="w-14 flex-shrink-0 text-right text-[11px] tabular-nums text-gray-400">
        ({formatPercent(value, total)})
      </span>
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
    cutout: "66%",
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.85)",
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${formatNumber(ctx.parsed)} (${formatPercent(ctx.parsed, total)})`,
        },
      },
    },
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 ${className}`.trim()}>
      <ChartCardHeader
        icon={LuBuilding2}
        iconClass="text-teal-500"
        title="Distribusi per Kelembagaan"
        total={total}
        subtitle="Komposisi pengurus berdasarkan jenis kelembagaan."
      />
      <div className="grid grid-cols-1 items-center gap-5 sm:grid-cols-2">
        <div className="relative mx-auto h-56 w-56 max-w-full">
          <Doughnut data={chartData} options={chartOptions} />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900">{formatNumber(total)}</span>
            <span className="text-[11px] text-gray-400">Total</span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {sorted.map(([type, count], i) => (
            <div
              key={type}
              className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2"
            >
              <span
                className="h-3 w-3 flex-shrink-0 rounded-full"
                style={{ backgroundColor: TYPE_DOUGHNUT_COLORS[i % TYPE_DOUGHNUT_COLORS.length] }}
              />
              <span className="flex-1 truncate text-sm text-gray-700">{type}</span>
              <span className="text-sm font-bold tabular-nums text-gray-900">{formatNumber(count)}</span>
              <span className="w-14 text-right text-xs tabular-nums text-gray-400">
                {formatPercent(count, total)}
              </span>
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

// Tulis total tiap batang bertumpuk di atasnya; dataset yang disembunyikan lewat
// legend tidak ikut dijumlah.
const stackTotalsPlugin = {
  id: "stackTotals",
  afterDatasetsDraw(chart) {
    const { ctx, data } = chart;
    const visible = data.datasets.map((_, i) => i).filter((i) => chart.isDatasetVisible(i));
    if (!visible.length) return;
    ctx.save();
    ctx.font = "600 11px sans-serif";
    ctx.fillStyle = "#374151";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    data.labels.forEach((_, index) => {
      const total = visible.reduce((sum, i) => sum + (data.datasets[i].data[index] || 0), 0);
      if (!total) return;
      const bars = visible.map((i) => chart.getDatasetMeta(i).data[index]).filter(Boolean);
      const top = Math.min(...bars.map((bar) => bar.y));
      ctx.fillText(formatNumber(total), bars[0].x, top - 4);
    });
    ctx.restore();
  },
};

function YearlyPengurusChart({ yearlyStats, className = "" }) {
  const MAIN_TYPES = ["RW", "RT", "Posyandu", "Karang Taruna", "LPM", "PKK", "Satlinmas"];
  const allYears = Object.keys(yearlyStats).sort();
  const [selectedYear, setSelectedYear] = useState("all");
  // yearlyStats bisa berubah saat refresh, jadi tahun yang dipilih bisa saja hilang
  // dari data - jatuhkan kembali ke "semua tahun".
  const activeYear = allYears.includes(selectedYear) ? selectedYear : "all";
  const years = activeYear === "all" ? allYears : [activeYear];

  // Collect all types across years, merge non-main into "Lainnya"
  const allTypes = new Set();
  years.forEach((y) => {
    Object.keys(yearlyStats[y] || {}).forEach((t) => {
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
  const grandTotal = datasets.reduce((sum, ds) => sum + ds.data.reduce((a, b) => a + b, 0), 0);

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
          label: (ctx) => ` ${ctx.dataset.label}: ${formatNumber(ctx.parsed.y)} pengurus`,
          footer: (items) => `Total: ${formatNumber(items.reduce((sum, item) => sum + item.parsed.y, 0))} pengurus`,
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
        grace: "8%", // ruang untuk label total di atas batang
        grid: { color: "rgba(0,0,0,0.04)" },
        ticks: { font: { size: 11 }, precision: 0, callback: (value) => formatNumber(value) },
        title: { display: true, text: "Jumlah Pengurus", font: { size: 12 } },
      },
    },
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 ${className}`.trim()}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <LuCalendarDays className="h-4 w-4 text-blue-500" />
            Jumlah Pengurus per Kelembagaan per Tahun
          </h3>
          <p className="mt-1 text-xs text-gray-400">
            Tren pengurus aktif terverifikasi tiap kelembagaan berdasarkan tahun input data. Tidak terpengaruh filter di bawah.
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-3">
        <span className="whitespace-nowrap text-xs text-gray-400">
          Total <span className="text-base font-bold text-gray-800">{formatNumber(grandTotal)}</span>
        </span>
        {allYears.length > 1 && (
          <div className="relative flex-shrink-0">
            <select
              value={activeYear}
              onChange={(event) => setSelectedYear(event.target.value)}
              className="appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-9 text-sm text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Tahun</option>
              {allYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <LuChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        )}
        </div>
      </div>
      <div className="h-[300px]">
        <Bar data={chartData} options={chartOptions} plugins={[stackTotalsPlugin]} />
      </div>
    </div>
  );
}
