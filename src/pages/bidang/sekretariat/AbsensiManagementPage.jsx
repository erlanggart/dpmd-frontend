import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Navigate } from "react-router-dom";
import {
  FiSearch, FiEdit2, FiTrash2, FiCalendar, FiClock,
  FiUsers, FiX, FiSmartphone, FiImage, FiSave,
  FiToggleLeft, FiToggleRight, FiUpload, FiSettings,
  FiChevronDown, FiChevronLeft, FiChevronRight, FiFilter, FiArrowLeft, FiEye, FiUser, FiBell, FiSend,
  FiUserPlus, FiMapPin,
} from "react-icons/fi";
import { LuDownload, LuRefreshCw, LuWifi, LuWifiOff, LuLayoutGrid, LuList, LuFileSpreadsheet, LuFileText, LuChartColumn, LuLayoutDashboard, LuArrowUpDown, LuSlidersHorizontal, LuTrophy, LuCrown } from "react-icons/lu";
import Lottie from "lottie-react";
import tableTennisAnimation from "../../../assets/table-tennis.json";
import api from "../../../api";
import { showAlert } from "../../../components/AlertPopup";
import { useAuth } from "../../../context/AuthContext";
import { getAvatarUrl } from "../../../utils/avatarUtils";

// Lazy: tab ini membawa Leaflet yang berat dan hanya dipakai superadmin.
const LokasiKhususTab = React.lazy(() => import("./LokasiKhususTab"));

// ─── Constants ────────────────────────────────────────────────
const STATUS_MAP = {
  hadir: { label: "Hadir", color: "emerald", icon: "✅", gradient: "from-emerald-500 to-green-600" },
  izin: { label: "Izin", color: "amber", icon: "📋", gradient: "from-amber-500 to-yellow-600" },
  sakit: { label: "Sakit", color: "red", icon: "🏥", gradient: "from-red-500 to-rose-600" },
  alpha: { label: "Alpha", color: "gray", icon: "❌", gradient: "from-gray-500 to-slate-600" },
  cuti: { label: "Cuti", color: "blue", icon: "🏖️", gradient: "from-blue-500 to-indigo-600" },
  dinas_luar: { label: "Dinas Luar", color: "purple", icon: "🚗", gradient: "from-purple-500 to-violet-600" },
  wfh: { label: "WFH", color: "teal", icon: "🏠", gradient: "from-teal-500 to-cyan-600" },
  wfa: { label: "WFA", color: "indigo", icon: "🌍", gradient: "from-indigo-500 to-blue-600" },
};

// Statuses yang dianggap "Masuk" (hadir bekerja)
const PRESENT_STATUSES = ['hadir', 'wfh', 'wfa', 'dinas_luar'];
// Statuses yang dianggap "Tidak Masuk"
const ABSENT_STATUSES = ['izin', 'sakit', 'alpha', 'cuti'];

// Kategori peringkat absensi (urutan = urutan tampil).
const ATTENDANCE_CATEGORIES = [
  { key: 'pppk_alihdaya', label: 'PPPK PW & Tenaga Alih Daya', short: 'PPPK & Alih Daya' },
  { key: 'kebersihan', label: 'Petugas Kebersihan', short: 'Kebersihan' },
  { key: 'keamanan', label: 'Petugas Keamanan', short: 'Keamanan' },
];

// Peran kebersihan/keamanan dikenali dari status_kepegawaian ATAU kata kunci jabatan
// (petugas kebersihan/keamanan sering berstatus Tenaga Alih Daya/PPPK PW).
const SECURITY_JABATAN_KEYWORDS = ['keamanan', 'security', 'satpam'];
const CLEANING_JABATAN_KEYWORDS = ['kebersih', 'cleaning', 'cleaning service'];
const categorizePegawai = (pegawai) => {
  const status = pegawai?.status_kepegawaian;
  const jabatan = (pegawai?.jabatan || '').toLowerCase();
  if (status === 'Tenaga_Keamanan' || SECURITY_JABATAN_KEYWORDS.some((k) => jabatan.includes(k))) return 'keamanan';
  if (status === 'Tenaga_Kebersihan' || CLEANING_JABATAN_KEYWORDS.some((k) => jabatan.includes(k))) return 'kebersihan';
  return 'pppk_alihdaya';
};

// Hitung jumlah hari Masuk & Tidak Masuk berdasarkan kalender hari kerja.
// Hari kerja yang sudah lewat (atau hari ini) tanpa record kehadiran "Masuk"
// dihitung sebagai Tidak Masuk — termasuk hari yang sama sekali tidak absen.
// Hari kerja yang belum lewat (masa depan) diabaikan agar tidak salah hitung.
const computeKehadiran = (pegawai, calendarDays, todayKey) => {
  let masuk = 0;
  let tidakMasuk = 0;
  (calendarDays || []).forEach((day) => {
    const key = getDateKey(day.date);
    if (todayKey && key > todayKey) return; // hari belum lewat, jangan dihitung
    const record = pegawai.daily?.[key];
    if (record && PRESENT_STATUSES.includes(record.status)) {
      masuk += 1;
    } else {
      tidakMasuk += 1;
    }
  });
  return { masuk, tidakMasuk };
};

// Date key hari ini dalam zona WIB (format YYYY-MM-DD), agar hari masa depan
// pada periode berjalan tidak ikut dihitung sebagai Tidak Masuk.
const getTodayKeyWIB = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

// jam_masuk disimpan sebagai Date('1970-01-01T{WIB}:00+07:00'). Konversi ke menit WIB.
const arrivalToWIBMinutes = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return wib.getUTCHours() * 60 + wib.getUTCMinutes();
};

const formatArrivalMinutes = (minutes) => {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return "-";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

// Skor absensi gabungan — MIRROR dari backend attendanceAward.service.scoreCandidate
// agar peringkat di tab ini konsisten dengan podium award mingguan.
const scoreFromStats = (s, lateThreshold) => {
  const earliness = s.averageArrival !== null ? Math.max(0, lateThreshold - s.averageArrival) : 0;
  return (
    s.completeDays * 10
    + s.onTimeDays * 6
    + s.presentDays * 4
    + earliness * 0.6
    - s.lateDays * 5
  );
};

// Bangun leaderboard dari data rekap-pegawai (semua pegawai wajib absen).
// Hanya pegawai dengan minimal 1 hari hadir yang masuk peringkat.
const buildLeaderboard = (pegawaiList, jamMasukSetting) => {
  const [jmH, jmM] = (jamMasukSetting || "08:00").split(":").map(Number);
  const lateThreshold = (jmH || 8) * 60 + (jmM || 0);

  const rows = (pegawaiList || []).map((p) => {
    const days = Object.values(p.daily || {});
    const present = days.filter((d) => PRESENT_STATUSES.includes(d.status));
    const withMasuk = present.filter((d) => d.jam_masuk);
    const arrivals = withMasuk
      .map((d) => arrivalToWIBMinutes(d.jam_masuk))
      .filter((n) => Number.isFinite(n));
    const lateDays = present.filter((d) => (d.telat_masuk_menit || 0) > 0).length;
    const stats = {
      presentDays: present.length,
      completeDays: present.filter((d) => d.jam_masuk && d.jam_keluar).length,
      lateDays,
      onTimeDays: Math.max(0, withMasuk.length - lateDays),
      averageArrival: arrivals.length
        ? arrivals.reduce((sum, v) => sum + v, 0) / arrivals.length
        : null,
    };
    return { pegawai: p, ...stats, score: scoreFromStats(stats, lateThreshold) };
  }).filter((r) => r.presentDays > 0);

  rows.sort((a, b) =>
    b.score - a.score
    || b.completeDays - a.completeDays
    || (a.averageArrival ?? Infinity) - (b.averageArrival ?? Infinity)
    || b.onTimeDays - a.onTimeDays
    || b.presentDays - a.presentDays
  );

  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
};

const POPUP_TYPE_LABELS = {
  masuk: "Absen Masuk", pulang: "Absen Pulang", wfh: "WFH",
  dinas_luar: "Dinas Luar", wfa: "WFA", izin: "Izin", sakit: "Sakit", cuti: "Cuti",
};

const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

const formatTime = (timeStr) => {
  if (!timeStr) return "-";
  const d = new Date(timeStr);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
};

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
};

// Telat bisa lewat sejam; "83 menit" lebih sulit dibaca daripada "1j 23m".
const formatTelat = (menit) => {
  const m = Number(menit) || 0;
  if (m <= 0) return "-";
  if (m < 60) return `${m} menit`;
  const jam = Math.floor(m / 60);
  const sisa = m % 60;
  return sisa ? `${jam}j ${sisa}m` : `${jam} jam`;
};

const getStorageUrl = (imagePath) => {
  if (!imagePath) return null;
  const base = import.meta.env.VITE_IMAGE_BASE_URL || "http://127.0.0.1:3001";
  // If path already starts with /storage/, just prepend base
  if (imagePath.startsWith('/storage/')) {
    return `${base}${imagePath}`;
  }
  return `${base}/storage/${imagePath}`;
};

const colorMap = {
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700", ring: "ring-emerald-500/20" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-600", badge: "bg-amber-100 text-amber-700", ring: "ring-amber-500/20" },
  red: { bg: "bg-red-500/10", text: "text-red-600", badge: "bg-red-100 text-red-700", ring: "ring-red-500/20" },
  gray: { bg: "bg-gray-500/10", text: "text-gray-600", badge: "bg-gray-100 text-gray-700", ring: "ring-gray-500/20" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-600", badge: "bg-blue-100 text-blue-700", ring: "ring-blue-500/20" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-600", badge: "bg-purple-100 text-purple-700", ring: "ring-purple-500/20" },
  teal: { bg: "bg-teal-500/10", text: "text-teal-600", badge: "bg-teal-100 text-teal-700", ring: "ring-teal-500/20" },
  indigo: { bg: "bg-indigo-500/10", text: "text-indigo-600", badge: "bg-indigo-100 text-indigo-700", ring: "ring-indigo-500/20" },
};

// Titik warna status (pengganti emoji) dan label pendek untuk sel kalender.
const STATUS_DOT = {
  emerald: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500", gray: "bg-slate-400",
  blue: "bg-blue-500", purple: "bg-purple-500", teal: "bg-teal-500", indigo: "bg-indigo-500",
};
const STATUS_SHORT = { izin: "Izin", sakit: "Sakit", alpha: "Alpha", cuti: "Cuti", dinas_luar: "DL", wfh: "WFH", wfa: "WFA" };

// ─── Main Component ───────────────────────────────────────────
const getDateKey = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
};

// Hex palette mirroring colorMap, untuk chart & PDF
const STATUS_HEX = {
  emerald: "#10b981", amber: "#f59e0b", red: "#ef4444", gray: "#64748b",
  blue: "#3b82f6", purple: "#a855f7", teal: "#14b8a6", indigo: "#6366f1",
};

// Format satu sel hari untuk PDF: hanya jam masuk / pulang, "-" jika tidak hadir
const formatDayCellPDF = (record) => {
  if (!record) return "-";
  const masuk = formatTime(record.jam_masuk);
  const keluar = formatTime(record.jam_keluar);
  if (masuk === "-" && keluar === "-") return "-";
  return `${masuk}\n${keluar}`;
};

const markExcelCellLate = (ws, XLSX, row, col) => {
  const ref = XLSX.utils.encode_cell({ r: row, c: col });
  if (!ws[ref]) return;
  ws[ref].s = {
    ...(ws[ref].s || {}),
    font: { ...((ws[ref].s || {}).font || {}), color: { rgb: "DC2626" }, bold: true },
    alignment: { ...((ws[ref].s || {}).alignment || {}), wrapText: true, vertical: "center" },
  };
};

// Render konfigurasi Chart.js ke data URL PNG (latar putih) untuk disisipkan ke PDF
const renderChartToImage = async (config, width, height) => {
  const { default: Chart } = await import("chart.js/auto");
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const whiteBg = {
    id: "whiteBg",
    beforeDraw: (chart) => {
      const { ctx } = chart;
      ctx.save();
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, chart.width, chart.height);
      ctx.restore();
    },
  };
  const chart = new Chart(canvas, {
    ...config,
    plugins: [whiteBg, ...(config.plugins || [])],
    options: { ...(config.options || {}), responsive: false, animation: false },
  });
  const img = canvas.toDataURL("image/png", 1.0);
  chart.destroy();
  return img;
};

const AbsensiManagementPage = () => {
  const { user } = useAuth();
  const canManageAbsensiRecords = user?.role === "superadmin";

  if (user?.role !== 'superadmin' && Number(user?.bidang_id) !== 2) {
    return <Navigate to="/forbidden" replace />;
  }

  // Maintenance mode: DISABLED - fitur kelola absensi sudah aktif kembali
  // if (user?.role !== 'superadmin') {
  //   return (
  //     <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-4">
  //       <div className="text-center max-w-lg">
  //         <div className="mb-2">
  //           <span className="inline-block px-4 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold tracking-wide">
  //             🏓 Maintenance Mode
  //           </span>
  //         </div>
  //         <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-3">
  //           Maaf, Kita Sedang Main
  //         </h1>
  //        
  //         <div className="w-72 md:w-96 mx-auto">
  //           <Lottie animationData={tableTennisAnimation} loop autoplay />
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  const [activeTab, setActiveTab] = useState("dashboard");
  const [records, setRecords] = useState([]);
  const [pegawai, setPegawai] = useState([]);
  const [settings, setSettings] = useState({ jam_masuk: "08:00", jam_pulang: "16:00", toleransi_terlambat: "15" });
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMode, setFilterMode] = useState("harian");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingRecord, setEditingRecord] = useState(null);
  const [showManualAttendanceModal, setShowManualAttendanceModal] = useState(false);
  const [manualAttendanceDefaults, setManualAttendanceDefaults] = useState({ date: "", employeeId: "" });
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // table | card
  const [filterStatus, setFilterStatus] = useState("semua"); // semua, masuk, tidak_masuk, telat, or specific status
  const [sortBy, setSortBy] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);
  const RECORDS_PER_PAGE = 25;

  // Dashboard state
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardPeriode, setDashboardPeriode] = useState("hari");
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // Rekap Pegawai state
  const [rekapPegawaiData, setRekapPegawaiData] = useState(null);
  const [rekapPeriode, setRekapPeriode] = useState("bulan");
  const [rekapLoading, setRekapLoading] = useState(false);
  const [rekapSearch, setRekapSearch] = useState("");

  // Peringkat (leaderboard juara absensi) state
  const [peringkatData, setPeringkatData] = useState(null);
  const [peringkatPeriode, setPeringkatPeriode] = useState("bulan");
  const [peringkatLoading, setPeringkatLoading] = useState(false);
  const [peringkatSearch, setPeringkatSearch] = useState("");
  const [peringkatKategori, setPeringkatKategori] = useState(ATTENDANCE_CATEGORIES[0].key);

  // User History Modal state
  const [historyUser, setHistoryUser] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [historyPeriode, setHistoryPeriode] = useState("bulan");
  const [historyLoading, setHistoryLoading] = useState(false);

  // Popup management state
  const [popupMessages, setPopupMessages] = useState([]);
  const [popupLoading, setPopupLoading] = useState(false);
  const [popupEditingType, setPopupEditingType] = useState(null);
  const [popupEditForm, setPopupEditForm] = useState({ title: "", message: "", is_active: true });
  const [popupPreviewImage, setPopupPreviewImage] = useState(null);
  const [popupImageBase64, setPopupImageBase64] = useState(null);
  const [popupSaving, setPopupSaving] = useState(false);
  const popupFileInputRef = useRef(null);

  // Reminder template state
  const [reminderTemplates, setReminderTemplates] = useState([]);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderEditingType, setReminderEditingType] = useState(null);
  const [reminderEditForm, setReminderEditForm] = useState({ title: "", message: "", is_active: true });
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderTesting, setReminderTesting] = useState(null);

  // ─── Data Fetchers ────────────────────────────────────────
  const fetchRekap = useCallback(async () => {
    try {
      setLoading(true);
      let url = "/absensi/admin/rekap?";
      if (filterMode === "harian") url += `tanggal=${filterDate}`;
      else url += `bulan=${filterMonth}&tahun=${filterYear}`;
      const res = await api.get(url);
      setRecords(res.data.data || []);
    } catch (err) {
      console.error("Error fetching rekap:", err);
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterMonth, filterYear, filterMode]);

  const fetchPegawai = useCallback(async () => {
    try {
      const res = await api.get("/absensi/admin/pegawai-absensi");
      setPegawai(res.data.data || []);
    } catch (err) {
      console.error("Error fetching pegawai:", err);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get("/absensi/admin/settings");
      setSettings(res.data.data || {});
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  }, []);

  const fetchPopupMessages = useCallback(async () => {
    try {
      setPopupLoading(true);
      const res = await api.get("/absensi/admin/success-messages");
      setPopupMessages(res.data.data || []);
    } catch (err) {
      console.error("Error fetching popup messages:", err);
    } finally {
      setPopupLoading(false);
    }
  }, []);

  const fetchReminderTemplates = useCallback(async () => {
    try {
      setReminderLoading(true);
      const res = await api.get("/absensi/admin/reminder-templates");
      setReminderTemplates(res.data.data || []);
    } catch (err) {
      console.error("Error fetching reminder templates:", err);
    } finally {
      setReminderLoading(false);
    }
  }, []);

  // ─── Dashboard Fetcher ────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    try {
      setDashboardLoading(true);
      let url = `/absensi/admin/dashboard-hari-ini?periode=${dashboardPeriode}`;
      if (dashboardPeriode === 'minggu') url += `&tanggal=${filterDate}`;
      else if (dashboardPeriode === 'bulan') url += `&bulan=${filterMonth}&tahun=${filterYear}`;
      else if (dashboardPeriode === 'tahun') url += `&tahun=${filterYear}`;
      else url += `&tanggal=${filterDate}`;
      const res = await api.get(url);
      setDashboardData(res.data.data || null);
    } catch (err) {
      console.error("Error fetching dashboard:", err);
    } finally {
      setDashboardLoading(false);
    }
  }, [dashboardPeriode, filterDate, filterMonth, filterYear]);

  // ─── Rekap Pegawai Fetcher ────────────────────────────────
  const fetchRekapPegawai = useCallback(async () => {
    try {
      setRekapLoading(true);
      let url = `/absensi/admin/rekap-pegawai?periode=${rekapPeriode}`;
      if (rekapPeriode === 'minggu') url += `&tanggal=${filterDate}`;
      else if (rekapPeriode === 'tahun') url += `&tahun=${filterYear}`;
      else url += `&bulan=${filterMonth}&tahun=${filterYear}`;
      const res = await api.get(url);
      setRekapPegawaiData(res.data.data || null);
    } catch (err) {
      console.error("Error fetching rekap pegawai:", err);
    } finally {
      setRekapLoading(false);
    }
  }, [rekapPeriode, filterDate, filterMonth, filterYear]);

  const fetchPeringkat = useCallback(async () => {
    try {
      setPeringkatLoading(true);
      let url = `/absensi/admin/rekap-pegawai?periode=${peringkatPeriode}`;
      if (peringkatPeriode === 'minggu') url += `&tanggal=${filterDate}`;
      else if (peringkatPeriode === 'tahun') url += `&tahun=${filterYear}`;
      else url += `&bulan=${filterMonth}&tahun=${filterYear}`;
      const res = await api.get(url);
      setPeringkatData(res.data.data || null);
    } catch (err) {
      console.error("Error fetching peringkat:", err);
    } finally {
      setPeringkatLoading(false);
    }
  }, [peringkatPeriode, filterDate, filterMonth, filterYear]);

  // ─── User History Fetcher ─────────────────────────────────
  const fetchUserHistory = useCallback(async (userId) => {
    try {
      setHistoryLoading(true);
      let url = `/absensi/admin/history/${userId}?periode=${historyPeriode}`;
      if (historyPeriode === 'minggu') url += `&tanggal=${filterDate}`;
      else url += `&bulan=${filterMonth}&tahun=${filterYear}`;
      const res = await api.get(url);
      setHistoryData(res.data.data || null);
    } catch (err) {
      console.error("Error fetching user history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPeriode, filterDate, filterMonth, filterYear]);

  useEffect(() => {
    if (activeTab === "dashboard") fetchDashboard();
    else if (activeTab === "rekap") fetchRekap();
    else if (activeTab === "rekap-pegawai") fetchRekapPegawai();
    else if (activeTab === "peringkat") fetchPeringkat();
    else if (activeTab === "pegawai") fetchPegawai();
    else if (activeTab === "settings") fetchSettings();
    else if (activeTab === "popup") fetchPopupMessages();
    else if (activeTab === "reminder") fetchReminderTemplates();
  }, [activeTab, fetchDashboard, fetchRekap, fetchRekapPegawai, fetchPeringkat, fetchPegawai, fetchSettings, fetchPopupMessages, fetchReminderTemplates]);

  // Refetch user history when period changes
  useEffect(() => {
    if (historyUser) fetchUserHistory(historyUser.id);
  }, [historyPeriode, filterMonth, filterYear, filterDate]); // eslint-disable-line

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab === "dashboard") await fetchDashboard();
    else if (activeTab === "rekap") await fetchRekap();
    else if (activeTab === "rekap-pegawai") await fetchRekapPegawai();
    else if (activeTab === "peringkat") await fetchPeringkat();
    else if (activeTab === "pegawai") await fetchPegawai();
    else if (activeTab === "popup") await fetchPopupMessages();
    else if (activeTab === "reminder") await fetchReminderTemplates();
    setRefreshing(false);
  };

  // ─── CRUD Handlers ────────────────────────────────────────
  const handleDeleteRecord = async (id) => {
    if (!canManageAbsensiRecords) {
      showAlert({ icon: "warning", title: "Akses Ditolak", text: "Hanya super admin yang dapat menghapus data absensi." });
      return;
    }

    const confirm = await showAlert({
      title: "Hapus Data Absensi?", text: "Data yang dihapus tidak dapat dikembalikan",
      icon: "warning", showCancelButton: true, cancelButtonText: "Batal", confirmButtonText: "Hapus",
    });
    if (!confirm.isConfirmed) return;
    try {
      await api.delete(`/absensi/admin/${id}`);
      showAlert({ icon: "success", title: "Berhasil", text: "Data absensi berhasil dihapus", timer: 1500 });
      fetchRekap();
    } catch (err) {
      showAlert({ icon: "error", title: "Gagal", text: err.response?.data?.message || "Gagal menghapus data" });
    }
  };

  const handleUpdateRecord = async (id, data) => {
    if (!canManageAbsensiRecords) {
      showAlert({ icon: "warning", title: "Akses Ditolak", text: "Hanya super admin yang dapat mengedit data absensi." });
      return;
    }

    try {
      await api.put(`/absensi/admin/${id}`, data);
      showAlert({ icon: "success", title: "Berhasil", text: "Data absensi berhasil diupdate", timer: 1500 });
      setEditingRecord(null);
      fetchRekap();
    } catch (err) {
      showAlert({ icon: "error", title: "Gagal", text: err.response?.data?.message || "Gagal update data" });
    }
  };

  const handleOpenManualAttendance = async (record = null) => {
    await fetchSettings();
    const missingRecord = record?.is_missing ? record : null;
    setManualAttendanceDefaults({
      date: missingRecord ? getDateKey(missingRecord.tanggal) : filterDate,
      employeeId: missingRecord ? String(missingRecord.user_id || missingRecord.user?.id) : "",
    });
    setShowManualAttendanceModal(true);
  };

  const handleCreateManualAttendance = async (data) => {
    try {
      await api.post("/absensi/admin/manual", data);
      showAlert({
        icon: "success",
        title: "Berhasil",
        text: "Presensi pegawai berhasil diisi",
        timer: 1600,
      });
      setShowManualAttendanceModal(false);
      setManualAttendanceDefaults({ date: "", employeeId: "" });
      await fetchRekap();
      return true;
    } catch (err) {
      showAlert({
        icon: "error",
        title: "Gagal Mengisi Presensi",
        text: err.response?.data?.message || "Gagal mengisi presensi pegawai",
      });
      return false;
    }
  };

  const handleSaveSettings = async (newSettings) => {
    try {
      await api.put("/absensi/admin/settings", newSettings);
      showAlert({ icon: "success", title: "Berhasil", text: "Settings berhasil disimpan", timer: 1500 });
      setShowSettingsModal(false);
      fetchSettings();
    } catch (err) {
      showAlert({ icon: "error", title: "Gagal", text: err.response?.data?.message || "Gagal menyimpan settings" });
    }
  };

  // ─── Popup Handlers ───────────────────────────────────────
  const startPopupEdit = (msg) => {
    setPopupEditingType(msg.type);
    setPopupEditForm({ title: msg.title || "", message: msg.message || "", is_active: msg.is_active });
    setPopupPreviewImage(msg.image_path ? getStorageUrl(msg.image_path) : null);
    setPopupImageBase64(null);
  };
  const cancelPopupEdit = () => {
    setPopupEditingType(null); setPopupEditForm({ title: "", message: "", is_active: true });
    setPopupPreviewImage(null); setPopupImageBase64(null);
  };
  const handlePopupImageChange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showAlert({ icon: "warning", title: "File Terlalu Besar", text: "Maks 5MB" }); return; }
    const reader = new FileReader();
    reader.onloadend = () => { setPopupImageBase64(reader.result); setPopupPreviewImage(reader.result); };
    reader.readAsDataURL(file);
  };
  const handlePopupSave = async () => {
    if (!popupEditingType) return; setPopupSaving(true);
    try {
      const body = { title: popupEditForm.title, message: popupEditForm.message, is_active: popupEditForm.is_active };
      if (popupImageBase64) body.image_base64 = popupImageBase64;
      await api.put(`/absensi/admin/success-messages/${popupEditingType}`, body);
      await fetchPopupMessages(); cancelPopupEdit();
      showAlert({ icon: "success", title: "Berhasil!", text: "Popup berhasil diupdate", timer: 1500 });
    } catch (err) { showAlert({ icon: "error", title: "Gagal", text: err.response?.data?.message || "Gagal menyimpan" }); }
    finally { setPopupSaving(false); }
  };
  const handlePopupRemoveImage = async () => {
    if (!popupEditingType) return;
    const result = await showAlert({ title: "Hapus Gambar?", text: "Gambar popup akan dihapus", icon: "warning", showCancelButton: true, confirmButtonText: "Ya, Hapus", cancelButtonText: "Batal" });
    if (!result.isConfirmed) return; setPopupSaving(true);
    try {
      await api.put(`/absensi/admin/success-messages/${popupEditingType}`, { remove_image: true });
      await fetchPopupMessages(); setPopupPreviewImage(null); setPopupImageBase64(null);
      showAlert({ icon: "success", title: "Berhasil!", text: "Gambar berhasil dihapus", timer: 1500 });
    } catch (err) { showAlert({ icon: "error", title: "Gagal", text: "Gagal menghapus gambar" }); }
    finally { setPopupSaving(false); }
  };
  const togglePopupActive = async (msg) => {
    try { await api.put(`/absensi/admin/success-messages/${msg.type}`, { is_active: !msg.is_active }); await fetchPopupMessages(); }
    catch (err) { showAlert({ icon: "error", title: "Gagal", text: "Gagal mengubah status" }); }
  };

  // ─── Device Management ────────────────────────────────────
  const handleSetDevice = async (pegawaiUser) => {
    if (pegawaiUser.device_id) {
      const result = await showAlert({
        title: "Device Absensi",
        text: `Pegawai: ${pegawaiUser.pegawai?.nama_pegawai || pegawaiUser.name}\n\n✅ Device terdaftar\n\nDevice otomatis terdaftar saat pegawai login. Hapus jika pegawai ganti HP.`,
        icon: "info", showCancelButton: true, cancelButtonText: "Tutup", confirmButtonText: "Hapus Device",
      });
      if (!result.isConfirmed) return;
      try {
        await api.put(`/absensi/admin/set-device/${pegawaiUser.id}`, { device_id: null });
        showAlert({ icon: "success", title: "Berhasil", text: "Device berhasil dihapus.", timer: 2000 }); fetchPegawai();
      } catch (err) { showAlert({ icon: "error", title: "Gagal", text: err.response?.data?.message || "Gagal menghapus device" }); }
    } else {
      showAlert({ icon: "info", title: "Device Belum Terdaftar", text: `Pegawai: ${pegawaiUser.pegawai?.nama_pegawai || pegawaiUser.name}\n\nDevice akan otomatis terdaftar saat pegawai login.` });
    }
  };

  // ─── Computed ─────────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    let filtered = records.filter((r) => {
      if (filterStatus === "masuk") {
        if (!PRESENT_STATUSES.includes(r.status)) return false;
      } else if (filterStatus === "tidak_masuk") {
        if (!ABSENT_STATUSES.includes(r.status)) return false;
      } else if (filterStatus === "telat") {
        if (!r.telat_masuk_menit || r.telat_masuk_menit <= 0) return false;
      } else if (filterStatus !== "semua") {
        if (r.status !== filterStatus) return false;
      }
      if (searchQuery) {
        const name = r.user?.name || r.user?.pegawai?.nama_pegawai || "";
        if (!name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      }
      return true;
    });
    if (sortBy !== "default") {
      filtered = [...filtered].sort((a, b) => {
        const nameA = (a.user?.pegawai?.nama_pegawai || a.user?.name || "").toLowerCase();
        const nameB = (b.user?.pegawai?.nama_pegawai || b.user?.name || "").toLowerCase();
        if (sortBy === "nama_asc") return nameA.localeCompare(nameB);
        if (sortBy === "nama_desc") return nameB.localeCompare(nameA);
        if (sortBy === "jam_masuk_asc") return new Date(a.jam_masuk || 0) - new Date(b.jam_masuk || 0);
        if (sortBy === "jam_masuk_desc") return new Date(b.jam_masuk || 0) - new Date(a.jam_masuk || 0);
        if (sortBy === "telat_desc") return (b.telat_masuk_menit || 0) - (a.telat_masuk_menit || 0);
        return 0;
      });
    }
    return filtered;
  }, [records, searchQuery, filterStatus, sortBy]);

  const rekapSummary = useMemo(() => {
    const s = { total: records.length };
    Object.keys(STATUS_MAP).forEach(k => { s[k] = records.filter(r => r.status === k).length; });
    s.masuk = PRESENT_STATUSES.reduce((sum, k) => sum + (s[k] || 0), 0);
    s.tidak_masuk = ABSENT_STATUSES.reduce((sum, k) => sum + (s[k] || 0), 0);
    s.telat = records.filter(r => r.telat_masuk_menit > 0).length;
    return s;
  }, [records]);
  const showRecordActions = canManageAbsensiRecords || records.some(record => record.is_missing);

  const totalPages = Math.ceil(filteredRecords.length / RECORDS_PER_PAGE);
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * RECORDS_PER_PAGE;
    return filteredRecords.slice(start, start + RECORDS_PER_PAGE);
  }, [filteredRecords, currentPage, RECORDS_PER_PAGE]);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [filterStatus, searchQuery, filterDate, filterMonth, filterYear, filterMode]);

  // ─── Open User History ─────────────────────────────────────
  const openUserHistory = async (userData) => {
    setHistoryUser(userData);
    setHistoryPeriode("bulan");
    setHistoryData(null);
    setHistoryLoading(true);
    try {
      let url = `/absensi/admin/history/${userData.id}?periode=bulan&bulan=${filterMonth}&tahun=${filterYear}`;
      const res = await api.get(url);
      setHistoryData(res.data.data || null);
    } catch (err) {
      console.error("Error fetching user history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Dua kelompok: Pantau (lihat data) dan Atur (kelola); pemisah digambar dari field group.
  const tabs = [
    { key: "dashboard", label: "Ringkasan", icon: LuLayoutDashboard, group: "pantau" },
    { key: "rekap-pegawai", label: "Rekap Pegawai", icon: LuChartColumn, group: "pantau" },
    { key: "rekap", label: "Rekap Harian", icon: FiCalendar, count: records.length, group: "pantau" },
    { key: "peringkat", label: "Peringkat", icon: LuTrophy, group: "pantau" },
    { key: "pegawai", label: "Daftar Pegawai", icon: FiUsers, count: pegawai.length, group: "atur" },
    { key: "popup", label: "Popup", icon: FiImage, count: popupMessages.length, group: "atur" },
    { key: "reminder", label: "Reminder", icon: FiBell, group: "atur" },
    // Menentukan titik absen menyangkut keabsahan presensi — superadmin saja.
    ...(canManageAbsensiRecords ? [{ key: "lokasi", label: "Lokasi Khusus", icon: FiMapPin, group: "atur" }] : []),
  ];

  // ─── Export Functions ─────────────────────────────────────
  const getExportTitle = () => {
    if (filterMode === "harian") return `Rekap Absensi - ${new Date(filterDate).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`;
    return `Rekap Absensi - ${MONTHS[filterMonth - 1]} ${filterYear}`;
  };

  const getExportData = () => filteredRecords.map((r, i) => ({
    no: i + 1,
    nama: r.user?.pegawai?.nama_pegawai || r.user?.name || "-",
    jabatan: r.user?.pegawai?.jabatan || r.user?.pegawai?.status_kepegawaian?.replace(/_/g, " ") || "-",
    tanggal: r.tanggal ? new Date(r.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-",
    status: STATUS_MAP[r.status]?.label || r.status || "-",
    jamMasuk: formatTime(r.jam_masuk),
    jamKeluar: formatTime(r.jam_keluar),
    jarak: r.jarak_masuk != null ? `${r.jarak_masuk}m` : "-",
    keterangan: [r.tujuan_dinas, r.keterangan].filter(Boolean).join(" - ") || "-",
  }));

  const filteredRekapPegawai = useMemo(() => {
    const list = rekapPegawaiData?.pegawai || [];
    if (!rekapSearch) return list;
    const keyword = rekapSearch.toLowerCase();
    return list.filter((p) => {
      const name = p.user?.pegawai?.nama_pegawai || p.user?.name || "";
      const nip = p.user?.pegawai?.nip || "";
      return `${name} ${nip}`.toLowerCase().includes(keyword);
    });
  }, [rekapPegawaiData, rekapSearch]);

  const rekapCalendarDays = rekapPegawaiData?.calendar_days || [];

  // Leaderboard juara absensi per kategori (status kepegawaian), skor gabungan.
  const leaderboardByCategory = useMemo(() => {
    const all = peringkatData?.pegawai || [];
    const jamMasuk = peringkatData?.settings?.jam_masuk;
    const map = {};
    ATTENDANCE_CATEGORIES.forEach((cat) => {
      const inCat = all.filter((p) => categorizePegawai(p.user?.pegawai) === cat.key);
      map[cat.key] = buildLeaderboard(inCat, jamMasuk);
    });
    return map;
  }, [peringkatData]);
  const leaderboard = useMemo(
    () => leaderboardByCategory[peringkatKategori] || [],
    [leaderboardByCategory, peringkatKategori]
  );
  const podiumTop3 = leaderboard.slice(0, 3);
  const activeKategori = ATTENDANCE_CATEGORIES.find((c) => c.key === peringkatKategori) || ATTENDANCE_CATEGORIES[0];
  const filteredLeaderboard = useMemo(() => {
    if (!peringkatSearch) return leaderboard;
    const keyword = peringkatSearch.toLowerCase();
    return leaderboard.filter((r) => {
      const name = r.pegawai?.user?.pegawai?.nama_pegawai || r.pegawai?.user?.name || "";
      const nip = r.pegawai?.user?.pegawai?.nip || "";
      return `${name} ${nip}`.toLowerCase().includes(keyword);
    });
  }, [leaderboard, peringkatSearch]);

  const handleExportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const data = getExportData();
      const ws = XLSX.utils.json_to_sheet(data.map(d => ({
        "No": d.no, "Nama Pegawai": d.nama, "Jabatan": d.jabatan,
        "Tanggal": d.tanggal, "Status": d.status, "Jam Masuk": d.jamMasuk,
        "Jam Keluar": d.jamKeluar, "Jarak": d.jarak, "Keterangan": d.keterangan,
      })));
      filteredRecords.forEach((record, i) => {
        if (record.telat_masuk_menit > 0) markExcelCellLate(ws, XLSX, i + 1, 5);
      });
      // Auto column width
      const colWidths = [
        { wch: 4 }, { wch: 28 }, { wch: 22 }, { wch: 14 },
        { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 30 },
      ];
      ws["!cols"] = colWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Rekap Absensi");
      const fileName = `Rekap_Absensi_${filterMode === "harian" ? filterDate : `${MONTHS[filterMonth-1]}_${filterYear}`}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert({ icon: "success", title: "Export Berhasil", text: `File ${fileName} berhasil diunduh`, timer: 2000 });
    } catch (err) {
      console.error("Export Excel error:", err);
      showAlert({ icon: "error", title: "Gagal Export", text: "Terjadi kesalahan saat mengexport Excel" });
    }
  };

  // Satu sumber angka & grafik untuk PDF dan Excel, supaya keduanya mustahil berbeda isi.
  const siapkanRekapEkspor = () => {
    const todayKey = getTodayKeyWIB();
    const gs = rekapPegawaiData.global_summary || {};
    const statusLabels = [];
    const statusData = [];
    const statusColors = [];
    Object.entries(STATUS_MAP).forEach(([key, v]) => {
      const c = gs[key] || 0;
      if (c > 0) {
        statusLabels.push(v.label);
        statusData.push(c);
        statusColors.push(STATUS_HEX[v.color] || "#94a3b8");
      }
    });
    const now = new Date();
    return {
      periodeLabel: rekapPegawaiData.periode_label || rekapPeriode,
      gs,
      dayCount: rekapCalendarDays.length,
      totalMasuk: filteredRekapPegawai.reduce((s, p) => s + computeKehadiran(p, rekapCalendarDays, todayKey).masuk, 0),
      totalTidakMasuk: filteredRekapPegawai.reduce((s, p) => s + computeKehadiran(p, rekapCalendarDays, todayKey).tidakMasuk, 0),
      dicetak: `${now.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })} ${now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`,
      // Tren kehadiran harian (jumlah pegawai masuk per hari)
      dailyMasuk: rekapCalendarDays.map((day) => {
        const key = getDateKey(day.date);
        return filteredRekapPegawai.reduce((c, p) => {
          const r = p.daily?.[key];
          return c + (r && PRESENT_STATUSES.includes(r.status) ? 1 : 0);
        }, 0);
      }),
      dayLabels: rekapCalendarDays.map((d) => String(d.day).padStart(2, "0")),
      statusLabels,
      statusData,
      statusColors,
    };
  };

  const grafikRekap = async ({ dayCount, dayLabels, dailyMasuk, statusLabels, statusData, statusColors }) => ({
    trendImg: dayCount > 0 ? await renderChartToImage(
      {
        type: "bar",
        data: {
          labels: dayLabels,
          datasets: [{ label: "Pegawai Masuk", data: dailyMasuk, backgroundColor: "#10b981", borderRadius: 4, maxBarThickness: 26 }],
        },
        options: {
          plugins: {
            legend: { display: false },
            title: { display: true, text: "Tren Kehadiran Harian (Jumlah Pegawai Masuk)", font: { size: 18, weight: "bold" }, color: "#1e293b", padding: { bottom: 10 } },
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 12 }, color: "#475569" } },
            y: { beginAtZero: true, ticks: { precision: 0, font: { size: 12 }, color: "#475569" }, grid: { color: "#e2e8f0" } },
          },
        },
      },
      1080, 320
    ) : null,
    doughImg: statusData.length > 0 ? await renderChartToImage(
      {
        type: "doughnut",
        data: { labels: statusLabels, datasets: [{ data: statusData, backgroundColor: statusColors, borderColor: "#ffffff", borderWidth: 2 }] },
        options: {
          cutout: "55%",
          plugins: {
            legend: { position: "right", labels: { font: { size: 13 }, color: "#334155", boxWidth: 14, padding: 8 } },
            title: { display: true, text: "Distribusi Kehadiran", font: { size: 18, weight: "bold" }, color: "#1e293b", padding: { bottom: 6 } },
          },
        },
      },
      560, 320
    ) : null,
  });

  const handleExportRekapPegawai = async () => {
    if (!rekapPegawaiData?.pegawai?.length) return;
    try {
      const prep = siapkanRekapEkspor();
      const todayKey = getTodayKeyWIB();
      let grafik = {};
      try {
        grafik = await grafikRekap(prep);
      } catch (chartErr) {
        console.error("Chart render error:", chartErr); // tetap lanjut tanpa grafik, seperti PDF
      }
      const { eksporRekapExcel } = await import("./rekapPegawaiExcel");
      const fileName = await eksporRekapExcel({
        periode: prep.periodeLabel,
        dicetak: prep.dicetak,
        grafik,
        hari: rekapCalendarDays.map((d) => ({ kepala: `${d.day_label}\n${String(d.day).padStart(2, "0")}` })),
        baris: filteredRekapPegawai.map((p) => {
          const { masuk, tidakMasuk } = computeKehadiran(p, rekapCalendarDays, todayKey);
          return {
            nama: p.user?.pegawai?.nama_pegawai || p.user?.name || "-",
            nip: p.user?.pegawai?.nip || "-",
            jabatan: p.user?.pegawai?.jabatan || p.user?.pegawai?.status_kepegawaian?.replace(/_/g, " ") || "-",
            sel: rekapCalendarDays.map((day) => {
              const record = p.daily?.[getDateKey(day.date)];
              return { teks: formatDayCellPDF(record), telat: record?.telat_masuk_menit > 0 };
            }),
            masuk,
            tidakMasuk,
            telat: p.summary?.telat || 0,
            totalCatatan: p.total_records || 0,
          };
        }),
        total: { masuk: prep.totalMasuk, tidakMasuk: prep.totalTidakMasuk, telat: prep.gs.telat || 0, catatan: prep.gs.total || 0 },
      });
      showAlert({ icon: "success", title: "Export Berhasil", text: `File ${fileName} berhasil diunduh`, timer: 2000 });
    } catch (err) {
      console.error("Export rekap pegawai error:", err);
      showAlert({ icon: "error", title: "Gagal Export", text: "Terjadi kesalahan saat mengexport Excel" });
    }
  };

  const handleExportRekapPegawaiPDF = async () => {
    if (!rekapPegawaiData?.pegawai?.length) return;
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const doc = new jsPDF("l", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      const usableWidth = pageWidth - margin * 2;

      const prep = siapkanRekapEkspor();
      const { periodeLabel, totalMasuk, totalTidakMasuk, dayCount, dicetak } = prep;

      // ── Header band ──
      doc.setFillColor(194, 65, 12); // orange-700
      doc.rect(0, 0, pageWidth, 22, "F");
      doc.setFillColor(245, 158, 11); // amber-500 accent
      doc.rect(0, 0, pageWidth, 2.5, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.text("REKAP ABSENSI PEGAWAI", margin, 11);
      doc.setFontSize(9);
      doc.setFont(undefined, "normal");
      doc.setTextColor(255, 237, 213); // orange-100
      doc.text("Dinas Pemberdayaan Masyarakat dan Desa", margin, 17);
      doc.setFontSize(9);
      doc.setFont(undefined, "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(`Periode: ${periodeLabel}`, pageWidth - margin, 11, { align: "right" });
      doc.setFontSize(7.5);
      doc.setFont(undefined, "normal");
      doc.setTextColor(255, 237, 213);
      doc.text(`Dicetak: ${dicetak}`, pageWidth - margin, 17, { align: "right" });

      // ── Analisis chart kehadiran ──
      const chartTop = 26;
      const chartHeight = 50;
      let tableStartY = chartTop + chartHeight + 6;

      try {
        const { trendImg, doughImg } = await grafikRekap(prep);
        if (trendImg) doc.addImage(trendImg, "PNG", margin, chartTop, usableWidth * 0.62, chartHeight);
        if (doughImg) doc.addImage(doughImg, "PNG", margin + usableWidth * 0.64, chartTop, usableWidth * 0.36, chartHeight);
      } catch (chartErr) {
        console.error("Chart render error:", chartErr);
        tableStartY = chartTop; // tetap lanjut tanpa chart
      }

      // ── Tabel kalender presensi ──
      const head = [[
        "Nama Pegawai",
        ...rekapCalendarDays.map((d) => `${d.day_label}\n${String(d.day).padStart(2, "0")}`),
        "Masuk",
        "Tdk\nMasuk",
      ]];

      const todayKeyPDF = getTodayKeyWIB();
      const body = filteredRekapPegawai.map((p) => {
        const { masuk, tidakMasuk } = computeKehadiran(p, rekapCalendarDays, todayKeyPDF);
        return [
          p.user?.pegawai?.nama_pegawai || p.user?.name || "-",
          ...rekapCalendarDays.map((day) => formatDayCellPDF(p.daily?.[getDateKey(day.date)])),
          String(masuk),
          String(tidakMasuk),
        ];
      });

      const foot = [[
        "TOTAL",
        ...rekapCalendarDays.map(() => ""),
        String(totalMasuk),
        String(totalTidakMasuk),
      ]];

      const nameWidth = 34;
      const masukWidth = 11;
      const tidakWidth = 13;
      const dayWidth = dayCount > 0 ? (usableWidth - nameWidth - masukWidth - tidakWidth) / dayCount : 12;

      const columnStyles = {
        0: { halign: "left", cellWidth: nameWidth, fontStyle: "bold", fontSize: 6, overflow: "linebreak" },
      };
      rekapCalendarDays.forEach((_, i) => {
        columnStyles[i + 1] = { halign: "center", cellWidth: dayWidth, fontSize: 5.4 };
      });
      columnStyles[dayCount + 1] = { halign: "center", cellWidth: masukWidth, fontStyle: "bold", textColor: [5, 150, 105] };
      columnStyles[dayCount + 2] = { halign: "center", cellWidth: tidakWidth, fontStyle: "bold", textColor: [217, 119, 6] };

      autoTable(doc, {
        head,
        body,
        foot,
        startY: tableStartY,
        margin: { left: margin, right: margin, top: 14 },
        theme: "grid",
        styles: {
          fontSize: 5.6,
          cellPadding: { top: 1, right: 0.5, bottom: 1, left: 0.5 },
          valign: "middle",
          halign: "center",
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
          textColor: [51, 65, 85],
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [194, 65, 12],
          textColor: [255, 255, 255],
          fontSize: 6,
          fontStyle: "bold",
          halign: "center",
          valign: "middle",
          lineColor: [194, 65, 12],
          lineWidth: 0.2,
        },
        footStyles: {
          fillColor: [255, 247, 237],
          textColor: [154, 52, 18],
          fontStyle: "bold",
          fontSize: 6,
          halign: "center",
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles,
        showHead: "everyPage",
        showFoot: "lastPage",
        didParseCell: (data) => {
          // Warnai sel jam: merah jika telat, hijau jika tepat waktu, abu jika kosong.
          if (data.section === "body" && data.column.index >= 1 && data.column.index <= dayCount) {
            const raw = Array.isArray(data.cell.raw) ? data.cell.raw.join("") : String(data.cell.raw ?? "");
            if (raw.trim() === "-") {
              data.cell.styles.textColor = [203, 213, 225];
            } else {
              const person = filteredRekapPegawai[data.row.index];
              const day = rekapCalendarDays[data.column.index - 1];
              const record = person?.daily?.[getDateKey(day?.date)];
              data.cell.styles.textColor = record?.telat_masuk_menit > 0 ? [220, 38, 38] : [4, 120, 87];
              data.cell.styles.fontStyle = "bold";
            }
          }
          if (data.section === "head" && data.column.index === 0) {
            data.cell.styles.halign = "left";
          }
        },
        didDrawPage: () => {
          const pageNum = doc.internal.getNumberOfPages();
          doc.setFontSize(7);
          doc.setFont(undefined, "normal");
          doc.setTextColor(148, 163, 184);
          doc.text("Format jam: baris atas = jam masuk, baris bawah = jam pulang. Jam masuk merah menandakan terlambat.", margin, pageHeight - 5);
          doc.text(`Halaman ${pageNum}`, pageWidth - margin, pageHeight - 5, { align: "right" });
        },
      });

      const fileName = `Rekap_Absensi_${String(periodeLabel).replace(/\s+/g, "_")}.pdf`;
      doc.save(fileName);
      showAlert({ icon: "success", title: "Export Berhasil", text: `File ${fileName} berhasil diunduh`, timer: 2000 });
    } catch (err) {
      console.error("Export rekap pegawai PDF error:", err);
      showAlert({ icon: "error", title: "Gagal Export", text: "Terjadi kesalahan saat mengexport PDF" });
    }
  };

  const handleExportPeringkatPDF = async () => {
    if (!leaderboard.length) return;
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;
      const periodeLabel = peringkatData?.periode_label || peringkatPeriode;
      const kategoriLabel = activeKategori.label;

      // ── Header band ──
      doc.setFillColor(194, 65, 12);
      doc.rect(0, 0, pageWidth, 22, "F");
      doc.setFillColor(245, 158, 11);
      doc.rect(0, 0, pageWidth, 2.5, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.text(`PERINGKAT ABSENSI — ${kategoriLabel.toUpperCase()}`, margin, 11);
      doc.setFontSize(8.5);
      doc.setFont(undefined, "normal");
      doc.setTextColor(255, 237, 213);
      doc.text("Dinas Pemberdayaan Masyarakat dan Desa", margin, 17);
      doc.setFontSize(9);
      doc.setFont(undefined, "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(`Periode: ${periodeLabel}`, pageWidth - margin, 11, { align: "right" });
      const now = new Date();
      doc.setFontSize(7.5);
      doc.setFont(undefined, "normal");
      doc.setTextColor(255, 237, 213);
      doc.text(
        `Dicetak: ${now.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })} ${now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`,
        pageWidth - margin, 17, { align: "right" }
      );

      // ── Podium juara (3 teratas) ──
      let tableStartY = 30;
      const top3 = leaderboard.slice(0, 3);
      if (top3.length) {
        doc.setFontSize(9);
        doc.setFont(undefined, "bold");
        doc.setTextColor(180, 83, 9);
        doc.text("PODIUM JUARA", margin, 28);
        const medals = ["1.", "2.", "3."];
        doc.setFontSize(8);
        top3.forEach((r, i) => {
          const u = r.pegawai?.user;
          const nama = u?.pegawai?.nama_pegawai || u?.name || "-";
          doc.setFont(undefined, "bold");
          doc.setTextColor(51, 65, 85);
          doc.text(`${medals[i]} ${nama}`, margin, 33.5 + i * 4.5);
          doc.setFont(undefined, "normal");
          doc.setTextColor(120, 113, 108);
          doc.text(`${Math.round(r.score)} poin`, margin + 70, 33.5 + i * 4.5);
        });
        tableStartY = 33.5 + top3.length * 4.5 + 3;
      }

      // ── Tabel peringkat lengkap ──
      const head = [["#", "Nama Pegawai", "Jabatan", "Hadir", "Lengkap", "Tepat\nWaktu", "Terlambat", "Rata²\nDatang", "Skor"]];
      const body = filteredLeaderboard.map((r) => {
        const u = r.pegawai?.user;
        return [
          String(r.rank),
          u?.pegawai?.nama_pegawai || u?.name || "-",
          u?.pegawai?.jabatan || u?.pegawai?.status_kepegawaian?.replace(/_/g, " ") || "-",
          String(r.presentDays),
          String(r.completeDays),
          String(r.onTimeDays),
          String(r.lateDays),
          formatArrivalMinutes(r.averageArrival),
          String(Math.round(r.score)),
        ];
      });

      autoTable(doc, {
        head,
        body,
        startY: tableStartY,
        margin: { left: margin, right: margin, top: 14 },
        theme: "grid",
        styles: {
          fontSize: 7.5,
          cellPadding: { top: 1.6, right: 1.5, bottom: 1.6, left: 1.5 },
          valign: "middle",
          halign: "center",
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
          textColor: [51, 65, 85],
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [194, 65, 12],
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: "bold",
          halign: "center",
          valign: "middle",
          lineColor: [194, 65, 12],
          lineWidth: 0.2,
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { halign: "center", cellWidth: 9, fontStyle: "bold" },
          1: { halign: "left", cellWidth: 48, fontStyle: "bold", overflow: "linebreak" },
          2: { halign: "left", cellWidth: 36, fontSize: 6.6, overflow: "linebreak" },
          3: { halign: "center", cellWidth: 14, textColor: [5, 150, 105], fontStyle: "bold" },
          4: { halign: "center", cellWidth: 16 },
          5: { halign: "center", cellWidth: 16 },
          6: { halign: "center", cellWidth: 18 },
          7: { halign: "center", cellWidth: 16, font: "courier" },
          8: { halign: "center", cellWidth: 14, textColor: [180, 83, 9], fontStyle: "bold" },
        },
        showHead: "everyPage",
        didParseCell: (data) => {
          // Sorot 3 besar dengan latar amber lembut
          if (data.section === "body" && data.row.index < 3) {
            data.cell.styles.fillColor = [254, 243, 199];
          }
          if (data.section === "head" && (data.column.index === 1 || data.column.index === 2)) {
            data.cell.styles.halign = "left";
          }
        },
        didDrawPage: () => {
          const pageNum = doc.internal.getNumberOfPages();
          doc.setFontSize(7);
          doc.setFont(undefined, "normal");
          doc.setTextColor(148, 163, 184);
          doc.text("Skor = (lengkap x10) + (tepat waktu x6) + (hadir x4) + bonus datang awal - (terlambat x5)", margin, pageHeight - 5);
          doc.text(`Halaman ${pageNum}`, pageWidth - margin, pageHeight - 5, { align: "right" });
        },
      });

      const fileName = `Peringkat_${kategoriLabel.replace(/\s+/g, "_")}_${String(periodeLabel).replace(/\s+/g, "_")}.pdf`;
      doc.save(fileName);
      showAlert({ icon: "success", title: "Export Berhasil", text: `File ${fileName} berhasil diunduh`, timer: 2000 });
    } catch (err) {
      console.error("Export peringkat PDF error:", err);
      showAlert({ icon: "error", title: "Gagal Export", text: "Terjadi kesalahan saat mengexport PDF" });
    }
  };

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* ═══ Header ═════════════════════════════════════════ */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 py-4">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900">Kelola Absensi</h1>
              <p className="text-sm text-slate-500">
                {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={handleRefresh} disabled={refreshing} title="Muat ulang" aria-label="Muat ulang"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                <LuRefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={() => setShowSettingsModal(true)}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <FiSettings className="h-4 w-4" /> Jam Kerja
              </button>
            </div>
          </div>

          {/* Navigasi tab: Pantau | Atur */}
          <nav className="flex gap-1 overflow-x-auto -mb-px [scrollbar-width:none]">
            {tabs.map((tab, i) => (
              <React.Fragment key={tab.key}>
                {i > 0 && tabs[i - 1].group !== tab.group && <span className="mx-1 my-2 w-px shrink-0 bg-slate-200" />}
                <button onClick={() => setActiveTab(tab.key)}
                  className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold ${
                    activeTab === tab.key
                      ? "border-orange-600 text-slate-900"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}>
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {activeTab === tab.key && tab.count > 0 && (
                    <span className="rounded-full bg-orange-100 px-1.5 text-[11px] font-bold text-orange-700">{tab.count}</span>
                  )}
                </button>
              </React.Fragment>
            ))}
          </nav>
        </div>
      </header>

      {/* ═══ Main Content ═══════════════════════════════════ */}
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ─── TAB: DASHBOARD ──────────────────────────────── */}
        {activeTab === "dashboard" && (
          <div className="space-y-5">
            {/* Period Selector */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex bg-slate-100 rounded-lg p-1">
                  {[
                    { key: "hari", label: "Hari Ini" },
                    { key: "minggu", label: "Minggu Ini" },
                    { key: "bulan", label: "Bulan Ini" },
                    { key: "tahun", label: "Tahun Ini" },
                  ].map(p => (
                    <button key={p.key} onClick={() => setDashboardPeriode(p.key)}
                      className={`px-2 sm:px-3 h-8 whitespace-nowrap rounded-md text-xs sm:text-sm font-medium transition-colors ${
                        dashboardPeriode === p.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      }`}>{p.label}</button>
                  ))}
                </div>
                {(dashboardPeriode === 'hari' || dashboardPeriode === 'minggu') && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Tanggal</label>
                    <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
                      className="px-3 h-10 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
                  </div>
                )}
                {dashboardPeriode === 'bulan' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Bulan</label>
                      <select value={filterMonth} onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                        className="px-3 h-10 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500">
                        {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Tahun</label>
                      <input type="number" value={filterYear} onChange={(e) => setFilterYear(parseInt(e.target.value))}
                        className="px-3 h-10 border border-slate-200 rounded-lg bg-white text-sm w-24 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
                    </div>
                  </>
                )}
                {dashboardPeriode === 'tahun' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Tahun</label>
                    <input type="number" value={filterYear} onChange={(e) => setFilterYear(parseInt(e.target.value))}
                      className="px-3 h-10 border border-slate-200 rounded-lg bg-white text-sm w-24 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
                  </div>
                )}
              </div>
            </div>

            {dashboardLoading ? (
              <div className="flex flex-col justify-center items-center py-20 gap-3">
                <div className="relative h-12 w-12">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-600 animate-spin" />
                </div>
                <p className="text-sm text-slate-400 font-medium">Memuat dashboard...</p>
              </div>
            ) : dashboardData ? (
              <>
                {(() => {
                  const s = dashboardData.summary || {};
                  const isHari = dashboardPeriode === 'hari';
                  const totalMasuk = PRESENT_STATUSES.reduce((sum, k) => sum + (s[k] || 0), 0);
                  const totalTidakMasuk = ABSENT_STATUSES.reduce((sum, k) => sum + (s[k] || 0), 0);
                  const totalBelum = isHari ? (dashboardData.belum_absen?.length || 0) : 0;
                  const totalPegawai = isHari ? totalMasuk + totalTidakMasuk + totalBelum : (s.total || 0);
                  const pct = totalPegawai > 0 ? Math.round((totalMasuk / totalPegawai) * 100) : 0;

                  // Data telat tersebar di semua status (hadir/wfh/dinas_luar), jadi dikumpulkan
                  // dari seluruh grouped lalu diurutkan dari yang paling telat.
                  const daftarTelat = Object.values(dashboardData.grouped || {})
                    .flat()
                    .filter((r) => (r.telat_masuk_menit || 0) > 0)
                    .sort((a, b) => (b.telat_masuk_menit || 0) - (a.telat_masuk_menit || 0));
                  const jamMasuk = dashboardData.settings?.jam_masuk || "08:00";
                  const daftarBelum = isHari ? (dashboardData.belum_absen || []) : [];

                  const kpis = totalPegawai === 0 ? [] : isHari ? [
                    { label: "Kehadiran", value: `${pct}%`, sub: `${totalMasuk} dari ${totalPegawai} pegawai`, progress: pct },
                    { label: "Masuk", value: totalMasuk, sub: `dari ${totalPegawai} pegawai` },
                    { label: "Tidak Masuk", value: totalTidakMasuk, sub: "izin, sakit, alpha, cuti" },
                    { label: "Belum Absen", value: totalBelum, sub: "belum presensi" },
                  ] : [
                    { label: "Kehadiran", value: `${pct}%`, sub: `${totalMasuk} dari ${totalPegawai} rekap`, progress: pct },
                    { label: "Total Masuk", value: totalMasuk, sub: "hadir, WFH, WFA, dinas luar" },
                    { label: "Tidak Masuk", value: totalTidakMasuk, sub: "izin, sakit, alpha, cuti" },
                    { label: "Terlambat", value: daftarTelat.length, sub: "kejadian terlambat" },
                  ];

                  const distTotal = Object.keys(STATUS_MAP).reduce((sum, k) => sum + (s[k] || 0), 0);
                  const showTelat = daftarTelat.length > 0;
                  const showBelum = daftarBelum.length > 0;

                  return (
                    <>
                      {kpis.length > 0 && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                          {kpis.map((k) => (
                            <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                              <p className="text-sm text-slate-500">{k.label}</p>
                              <p className="mt-1 text-3xl font-bold text-slate-900 tabular-nums">{k.value}</p>
                              {k.progress != null && (
                                <div className="mt-2 h-1 rounded-full bg-slate-100 overflow-hidden">
                                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${k.progress}%` }} />
                                </div>
                              )}
                              <p className="mt-2 text-xs text-slate-500">{k.sub}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {distTotal > 0 && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-sm font-semibold text-slate-900">Distribusi status</p>
                          <div className="mt-3 flex h-2.5 rounded-full overflow-hidden bg-slate-100">
                            {Object.entries(STATUS_MAP).map(([key, { color }]) => {
                              const count = s[key] || 0;
                              if (count === 0) return null;
                              return <div key={key} className={STATUS_DOT[color]} style={{ width: `${(count / distTotal) * 100}%` }} />;
                            })}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1">
                            {Object.entries(STATUS_MAP).map(([key, { label, color }]) => {
                              const count = s[key] || 0;
                              if (count === 0) return null;
                              return (
                                <button key={key} onClick={() => { setActiveTab("rekap"); setFilterStatus(key); }}
                                  className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-slate-50 text-left">
                                  <span className={`h-2 w-2 rounded-full ${STATUS_DOT[color]}`} />
                                  <span className="text-slate-600">{label}</span>
                                  <span className="font-semibold text-slate-900 tabular-nums">{count}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {(showTelat || showBelum) && (
                        <div className={`grid gap-4 ${showTelat && showBelum ? "lg:grid-cols-2" : ""}`}>
                          {showTelat && (
                            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-200">
                                <FiClock className="h-4 w-4 text-slate-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-sm font-semibold text-slate-900">Pegawai Terlambat</h3>
                                  <p className="text-xs text-slate-500">Masuk melebihi jam {jamMasuk}</p>
                                </div>
                                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full tabular-nums shrink-0">
                                  {daftarTelat.length}
                                </span>
                              </div>

                              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                                {daftarTelat.map((r) => (
                                  <div key={r.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50">
                                    <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center text-xs font-semibold shrink-0">
                                      {(r.user?.pegawai?.nama_pegawai || r.user?.name || "?")[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-slate-900 text-sm truncate">
                                        {r.user?.pegawai?.nama_pegawai || r.user?.name || "-"}
                                      </p>
                                      <p className="text-xs text-slate-500 truncate">
                                        {/* Di mode minggu/bulan/tahun satu pegawai bisa muncul beberapa kali,
                                            jadi tanggal wajib ikut agar barisnya tidak ambigu. */}
                                        {dashboardPeriode !== "hari" && (
                                          <span className="text-slate-600 font-medium">{formatDateShort(r.tanggal)} · </span>
                                        )}
                                        {r.user?.pegawai?.jabatan || "-"}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 text-xs tabular-nums">
                                      <span className="font-semibold text-red-600">{formatTime(r.jam_masuk)}</span>
                                      <span className="text-slate-500 whitespace-nowrap">+{formatTelat(r.telat_masuk_menit)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <button
                                onClick={() => { setActiveTab("rekap"); setFilterStatus("telat"); }}
                                className="w-full px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 border-t border-slate-200"
                              >
                                Buka di Rekap Harian
                              </button>
                            </div>
                          )}

                          {showBelum && (
                            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-200">
                                <FiUsers className="h-4 w-4 text-slate-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-sm font-semibold text-slate-900">Belum Absen Hari Ini</h3>
                                  <p className="text-xs text-slate-500">Pegawai yang belum melakukan presensi</p>
                                </div>
                                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full tabular-nums shrink-0">{daftarBelum.length}</span>
                              </div>
                              <div className="p-4 flex flex-wrap gap-2 max-h-80 overflow-y-auto">
                                {daftarBelum.map((u) => (
                                  <div key={u.id} className="flex items-center gap-2 pl-1.5 pr-3 py-1 bg-white border border-slate-200 rounded-full">
                                    <div className="w-6 h-6 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center text-[11px] font-semibold">
                                      {(u.pegawai?.nama_pegawai || u.name || "?")[0].toUpperCase()}
                                    </div>
                                    <span className="text-xs font-medium text-slate-700">{u.pegawai?.nama_pegawai || u.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Grouped by Status */}
                <div className="space-y-3">
                  {Object.entries(STATUS_MAP)
                    .filter(([sk]) => (dashboardData.grouped?.[sk] || []).length > 0)
                    .sort((a, b) => (dashboardData.grouped?.[b[0]]?.length || 0) - (dashboardData.grouped?.[a[0]]?.length || 0))
                    .map(([statusKey, { label, color }]) => {
                    const people = dashboardData.grouped[statusKey];
                    return (
                      <div key={statusKey} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className={`h-2 w-2 rounded-full ${STATUS_DOT[color]}`} />
                            <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
                          </div>
                          <span className="text-xs text-slate-500 tabular-nums">{people.length} orang</span>
                        </div>
                        <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                          {people.map((r) => (
                            <div key={r.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50">
                              <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-semibold text-slate-600 shrink-0">
                                {(r.user?.pegawai?.nama_pegawai || r.user?.name || "?")[0].toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-900 text-sm truncate">{r.user?.pegawai?.nama_pegawai || r.user?.name || "-"}</p>
                                <p className="text-xs text-slate-500 truncate">{r.user?.pegawai?.jabatan || "-"}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {r.jam_masuk && (
                                  <span className={`text-xs tabular-nums ${r.telat_masuk_menit > 0 ? "text-red-600 font-semibold" : "text-slate-600"}`}>{formatTime(r.jam_masuk)}</span>
                                )}
                                {r.tujuan_dinas && (
                                  <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md truncate max-w-[120px]">📍 {r.tujuan_dinas}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Empty state if all grouped are empty */}
                {Object.values(dashboardData.grouped || {}).every(arr => arr.length === 0) && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <LuLayoutDashboard className="h-7 w-7 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium">Belum ada data absensi</p>
                    <p className="text-slate-400 text-sm mt-1">Periode ini belum ada pegawai yang absen</p>
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}

        {/* ─── TAB: PERINGKAT (JUARA ABSENSI) ─────────────── */}
        {activeTab === "peringkat" && (
          <div className="space-y-5">
            {/* Period Selector */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex bg-slate-100 rounded-lg p-1">
                  {[
                    { key: "minggu", label: "Mingguan" },
                    { key: "bulan", label: "Bulanan" },
                    { key: "tahun", label: "Tahunan" },
                  ].map(p => (
                    <button key={p.key} onClick={() => setPeringkatPeriode(p.key)}
                      className={`px-2 sm:px-3 h-8 whitespace-nowrap rounded-md text-xs sm:text-sm font-medium transition-colors ${
                        peringkatPeriode === p.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      }`}>{p.label}</button>
                  ))}
                </div>
                {peringkatPeriode === 'minggu' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Tanggal Referensi</label>
                    <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
                      className="px-3 h-10 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
                  </div>
                )}
                {peringkatPeriode === 'bulan' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Bulan</label>
                      <select value={filterMonth} onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                        className="px-3 h-10 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500">
                        {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Tahun</label>
                      <input type="number" value={filterYear} onChange={(e) => setFilterYear(parseInt(e.target.value))}
                        className="px-3 h-10 border border-slate-200 rounded-lg bg-white text-sm w-24 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
                    </div>
                  </>
                )}
                {peringkatPeriode === 'tahun' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Tahun</label>
                    <input type="number" value={filterYear} onChange={(e) => setFilterYear(parseInt(e.target.value))}
                      className="px-3 h-10 border border-slate-200 rounded-lg bg-white text-sm w-24 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
                  </div>
                )}
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Cari Pegawai</label>
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input type="text" value={peringkatSearch} onChange={(e) => setPeringkatSearch(e.target.value)}
                      placeholder="Ketik nama..."
                      className="w-full pl-9 pr-3 h-10 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Pemilih Kategori */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {ATTENDANCE_CATEGORIES.map((cat) => {
                const count = (leaderboardByCategory[cat.key] || []).length;
                const active = peringkatKategori === cat.key;
                return (
                  <button key={cat.key} onClick={() => setPeringkatKategori(cat.key)}
                    className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-all ${
                      active
                        ? "border-orange-500 bg-orange-50 text-slate-900"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}>
                    <span className="text-sm font-semibold">{cat.label}</span>
                    <span className={`mt-1 text-xs text-slate-500`}>
                      {count} pegawai
                    </span>
                  </button>
                );
              })}
            </div>

            {peringkatLoading ? (
              <div className="flex flex-col justify-center items-center py-20 gap-3">
                <div className="relative h-12 w-12">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-600 animate-spin" />
                </div>
                <p className="text-sm text-slate-400 font-medium">Memuat peringkat...</p>
              </div>
            ) : leaderboard.length > 0 ? (
              <>
                {/* Periode + info skor + export */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">
                      {activeKategori.label} — {peringkatData?.periode_label}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {leaderboard.length} pegawai masuk peringkat • skor = kelengkapan + datang awal + tepat waktu
                    </p>
                  </div>
                  <button onClick={handleExportPeringkatPDF} disabled={!leaderboard.length}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
                    <LuFileText className="h-4 w-4" />
                    Export PDF
                  </button>
                </div>

                {/* PODIUM JUARA 1-2-3 */}
                {(() => {
                  const RANK_META = {
                    1: { medal: "🥇", label: "Juara 1", ring: "ring-amber-400", bar: "bg-amber-300", text: "text-amber-600", avatar: "h-20 w-20 sm:h-24 sm:w-24", pillar: "h-24 sm:h-28", num: "text-amber-700" },
                    2: { medal: "🥈", label: "Juara 2", ring: "ring-slate-300", bar: "bg-slate-300", text: "text-slate-500", avatar: "h-16 w-16 sm:h-20 sm:w-20", pillar: "h-16 sm:h-20", num: "text-slate-600" },
                    3: { medal: "🥉", label: "Juara 3", ring: "ring-orange-300", bar: "bg-orange-300", text: "text-orange-600", avatar: "h-16 w-16 sm:h-20 sm:w-20", pillar: "h-12 sm:h-16", num: "text-orange-700" },
                  };
                  // Urutan tampilan: Juara 2 (kiri) - Juara 1 (tengah) - Juara 3 (kanan)
                  const order = [podiumTop3[1], podiumTop3[0], podiumTop3[2]].filter(Boolean);
                  return (
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                      <div className="relative mb-5 text-center">
                        <div className="inline-flex items-center gap-2 text-sm font-semibold text-amber-700">
                          <LuTrophy className="h-4 w-4" /> Podium Juara Absensi <LuTrophy className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="relative flex items-end justify-center gap-3 sm:gap-6">
                        {order.map((row) => {
                          const meta = RANK_META[row.rank];
                          const u = row.pegawai?.user;
                          const nama = u?.pegawai?.nama_pegawai || u?.name || "-";
                          const jabatan = u?.pegawai?.jabatan || u?.pegawai?.status_kepegawaian?.replace(/_/g, " ") || "-";
                          const isChampion = row.rank === 1;
                          return (
                            <div key={row.rank} className={`flex w-1/3 max-w-[180px] flex-col items-center ${isChampion ? "z-10" : ""}`}>
                              {isChampion && <LuCrown className="mb-1 h-6 w-6 text-amber-400" />}
                              <div className={`relative ${meta.avatar} rounded-full bg-white p-[3px] ring-4 ${meta.ring}`}>
                                <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-orange-100 text-lg font-bold text-orange-700">
                                  {nama.charAt(0).toUpperCase()}
                                  {u?.avatar && (
                                    <img src={getAvatarUrl(u.avatar)} alt={nama}
                                      className="absolute inset-0 h-full w-full object-cover"
                                      onError={(e) => { e.currentTarget.style.display = "none"; }} />
                                  )}
                                </div>
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xl drop-shadow sm:text-2xl">{meta.medal}</div>
                              </div>
                              <p className={`mt-3 text-center font-extrabold leading-tight text-slate-800 ${isChampion ? "text-sm sm:text-base" : "text-xs sm:text-sm"} line-clamp-2`}>{nama}</p>
                              <p className="mt-0.5 max-w-full truncate text-[10px] text-slate-400">{jabatan}</p>
                              <p className={`mt-1 text-xs font-black ${meta.text}`}>{Math.round(row.score)} poin</p>
                              <div className={`mt-2 flex w-full ${meta.pillar} flex-col items-center justify-start rounded-t-xl ${meta.bar}`}>
                                <span className={`mt-1.5 text-2xl font-black ${meta.num} sm:text-3xl`}>{row.rank}</span>
                                <span className={`text-[11px] font-semibold ${meta.num} opacity-80`}>{meta.label}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* TABEL PERINGKAT LENGKAP */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-max text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                          <th className="px-4 py-3.5 text-center font-bold w-16">Rank</th>
                          <th className="px-4 py-3.5 text-left font-bold min-w-[220px]">Pegawai</th>
                          <th className="px-3 py-3.5 text-center font-bold text-emerald-600">Hadir</th>
                          <th className="px-3 py-3.5 text-center font-bold text-sky-600">Lengkap</th>
                          <th className="px-3 py-3.5 text-center font-bold text-indigo-600">Tepat Waktu</th>
                          <th className="px-3 py-3.5 text-center font-bold text-rose-600">Terlambat</th>
                          <th className="px-3 py-3.5 text-center font-bold text-slate-500">Rata² Datang</th>
                          <th className="px-4 py-3.5 text-center font-bold text-amber-600">Skor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLeaderboard.map((r) => {
                          const u = r.pegawai?.user;
                          const nama = u?.pegawai?.nama_pegawai || u?.name || "-";
                          const jabatan = u?.pegawai?.jabatan || u?.pegawai?.status_kepegawaian?.replace(/_/g, " ") || "-";
                          const medal = r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : null;
                          return (
                            <tr key={u?.id || r.rank} className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${r.rank <= 3 ? "bg-amber-50/40" : ""}`}>
                              <td className="px-4 py-3 text-center">
                                {medal ? (
                                  <span className="text-xl">{medal}</span>
                                ) : (
                                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-black text-slate-500">{r.rank}</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-orange-100 text-xs font-bold text-orange-700">
                                    <span className="flex h-full w-full items-center justify-center">{nama.charAt(0).toUpperCase()}</span>
                                    {u?.avatar && (
                                      <img src={getAvatarUrl(u.avatar)} alt={nama}
                                        className="absolute inset-0 h-full w-full object-cover"
                                        onError={(e) => { e.currentTarget.style.display = "none"; }} />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-slate-800">{nama}</p>
                                    <p className="truncate text-[11px] text-slate-400">{jabatan}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-center font-bold text-slate-700 tabular-nums">{r.presentDays}</td>
                              <td className="px-3 py-3 text-center text-slate-600 tabular-nums">{r.completeDays}</td>
                              <td className="px-3 py-3 text-center text-slate-600 tabular-nums">{r.onTimeDays}</td>
                              <td className="px-3 py-3 text-center tabular-nums">
                                <span className={r.lateDays > 0 ? "font-bold text-rose-600" : "text-slate-400"}>{r.lateDays}</span>
                              </td>
                              <td className="px-3 py-3 text-center font-mono text-xs text-slate-600">{formatArrivalMinutes(r.averageArrival)}</td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex min-w-[44px] items-center justify-center rounded-lg bg-amber-100 px-2 py-1 text-xs font-black text-amber-700 tabular-nums">{Math.round(r.score)}</span>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredLeaderboard.length === 0 && (
                          <tr>
                            <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">Tidak ada pegawai yang cocok dengan pencarian.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3">
                    <p className="text-[11px] text-slate-400">
                      Skor = (hari lengkap ×10) + (tepat waktu ×6) + (total hadir ×4) + bonus datang awal − (terlambat ×5)
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                <LuTrophy className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">Belum ada pegawai {activeKategori.label} yang absen pada periode ini.</p>
                <p className="mt-1 text-xs text-slate-400">Coba kategori atau periode lain untuk melihat peringkat.</p>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: REKAP PEGAWAI ─────────────────────────── */}
        {activeTab === "rekap-pegawai" && (
          <div className="space-y-4">
            {/* Filter */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex bg-slate-100 rounded-lg p-1">
                  {[
                    { key: "minggu", label: "Mingguan" },
                    { key: "bulan", label: "Bulanan" },
                    { key: "tahun", label: "Tahunan" },
                  ].map(p => (
                    <button key={p.key} onClick={() => setRekapPeriode(p.key)}
                      className={`px-2 sm:px-3 h-8 whitespace-nowrap rounded-md text-xs sm:text-sm font-medium transition-colors ${
                        rekapPeriode === p.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      }`}>{p.label}</button>
                  ))}
                </div>
                {rekapPeriode === 'minggu' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Tanggal Referensi</label>
                    <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
                      className="px-3 h-10 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
                  </div>
                )}
                {rekapPeriode === 'bulan' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Bulan</label>
                      <select value={filterMonth} onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                        className="px-3 h-10 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500">
                        {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Tahun</label>
                      <input type="number" value={filterYear} onChange={(e) => setFilterYear(parseInt(e.target.value))}
                        className="px-3 h-10 border border-slate-200 rounded-lg bg-white text-sm w-24 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
                    </div>
                  </>
                )}
                {rekapPeriode === 'tahun' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Tahun</label>
                    <input type="number" value={filterYear} onChange={(e) => setFilterYear(parseInt(e.target.value))}
                      className="px-3 h-10 border border-slate-200 rounded-lg bg-white text-sm w-24 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
                  </div>
                )}
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Cari Pegawai</label>
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input type="text" value={rekapSearch} onChange={(e) => setRekapSearch(e.target.value)}
                      placeholder="Ketik nama..."
                      className="w-full pl-9 pr-3 h-10 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <button onClick={handleExportRekapPegawaiPDF} disabled={!rekapPegawaiData?.pegawai?.length}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                    <LuFileText className="h-4 w-4" /> Ekspor PDF
                  </button>
                  <button onClick={handleExportRekapPegawai} disabled={!rekapPegawaiData?.pegawai?.length}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                    <LuFileSpreadsheet className="h-4 w-4" /> Ekspor Excel
                  </button>
                </div>
              </div>
            </div>

            {rekapLoading ? (
              <div className="flex flex-col justify-center items-center py-20 gap-3">
                <div className="relative h-12 w-12">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-600 animate-spin" />
                </div>
                <p className="text-sm text-slate-500 font-medium">Memuat rekap pegawai...</p>
              </div>
            ) : rekapPegawaiData ? (
              <>
                {/* Ringkasan periode */}
                {(() => {
                  const todayKey = getTodayKeyWIB();
                  const totalMasuk = filteredRekapPegawai.reduce((sum, p) => sum + computeKehadiran(p, rekapCalendarDays, todayKey).masuk, 0);
                  const totalTidakMasuk = filteredRekapPegawai.reduce((sum, p) => sum + computeKehadiran(p, rekapCalendarDays, todayKey).tidakMasuk, 0);
                  return (
                    <div className="bg-white rounded-2xl border border-slate-200 px-5 py-3 flex flex-wrap items-center gap-x-8 gap-y-3">
                      <div>
                        <h3 className="font-semibold text-slate-900 text-sm">Periode: {rekapPegawaiData.periode_label}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{rekapPegawaiData.total_pegawai} pegawai terdaftar</p>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-emerald-700 tabular-nums">{totalMasuk}</span>
                        <span className="text-sm text-slate-500">Total Masuk</span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-amber-700 tabular-nums">{totalTidakMasuk}</span>
                        <span className="text-sm text-slate-500">Tidak Masuk</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {Object.entries(STATUS_MAP).map(([key, { label, color }]) => {
                          const count = rekapPegawaiData.global_summary?.[key] || 0;
                          if (count === 0) return null;
                          return (
                            <div key={key} className="flex items-center gap-1.5 text-sm">
                              <span className={`h-2 w-2 rounded-full ${STATUS_DOT[color]}`} />
                              <span className="text-slate-600">{label}</span>
                              <span className="font-semibold text-slate-900 tabular-nums">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Calendar Recap */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-200">
                    <h3 className="font-semibold text-slate-900 text-sm">
                      Kalender Presensi {rekapPeriode === 'minggu' ? 'Mingguan' : rekapPeriode === 'bulan' ? 'Bulanan' : 'Tahunan'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Jam masuk di atas, jam keluar di bawah. Merah berarti terlambat.
                    </p>
                  </div>

                  {rekapCalendarDays.length > 0 ? (
                    <div className="overflow-auto max-h-[70vh]">
                      <table className="w-full min-w-max text-sm border-separate border-spacing-0">
                        <thead>
                          <tr>
                            <th className="sticky left-0 top-0 z-30 bg-slate-50 text-left px-2 sm:px-4 py-2.5 text-xs font-medium text-slate-500 min-w-[7.5rem] sm:min-w-[14rem] border-r border-b border-slate-200">
                              Pegawai
                            </th>
                            {rekapCalendarDays.map((day) => (
                              <th key={day.date} className="sticky top-0 z-20 bg-slate-50 px-1 py-2 text-center min-w-[3.5rem] border-b border-slate-200">
                                <div className="text-[11px] font-medium text-slate-500">{day.day_label}</div>
                                <div className="text-xs font-semibold text-slate-900 tabular-nums">{String(day.day).padStart(2, "0")}</div>
                              </th>
                            ))}
                            <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2.5 text-center min-w-[3.5rem] text-xs font-medium text-emerald-700 border-b border-slate-200">Masuk</th>
                            <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2.5 text-center min-w-[3.5rem] text-xs font-medium text-amber-700 border-b border-slate-200" title="Tidak masuk">Tdk</th>
                            <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2.5 text-center min-w-[3.5rem] text-xs font-medium text-slate-500 border-b border-slate-200">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRekapPegawai.map((p) => {
                            const { masuk, tidakMasuk } = computeKehadiran(p, rekapCalendarDays, getTodayKeyWIB());
                            return (
                              <tr key={p.user.id} className="group">
                                <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 px-2 sm:px-4 py-2 min-w-[7.5rem] max-w-[7.5rem] sm:max-w-none sm:min-w-[14rem] border-r border-b border-slate-100">
                                  <div className="flex items-center gap-3">
                                    <div className="hidden sm:flex w-8 h-8 bg-slate-100 text-slate-600 rounded-full items-center justify-center text-xs font-semibold shrink-0">
                                      {(p.user?.pegawai?.nama_pegawai || p.user?.name || "?")[0].toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-semibold text-slate-900 text-xs sm:text-sm truncate sm:max-w-[11rem]">{p.user?.pegawai?.nama_pegawai || p.user?.name || "-"}</p>
                                      <p className="text-[11px] sm:text-xs text-slate-500 truncate sm:max-w-[11rem]">{p.user?.pegawai?.jabatan || p.user?.pegawai?.status_kepegawaian?.replace(/_/g, " ") || "-"}</p>
                                    </div>
                                  </div>
                                </td>
                                {rekapCalendarDays.map((day) => {
                                  const record = p.daily?.[getDateKey(day.date)];
                                  const pendek = record && STATUS_SHORT[record.status];
                                  return (
                                    <td key={`${p.user.id}-${day.date}`} className="px-1 py-1.5 text-center border-b border-slate-100 text-[11px] leading-tight tabular-nums group-hover:bg-slate-50">
                                      {!record ? (
                                        <span className="text-slate-300">–</span>
                                      ) : (
                                        <>
                                          {pendek && (
                                            <div className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold ${colorMap[STATUS_MAP[record.status].color].badge}`}>{pendek}</div>
                                          )}
                                          {(!pendek || record.jam_masuk) && (
                                            <div className={record.telat_masuk_menit > 0 ? "text-red-600 font-semibold" : "text-slate-700"}>{formatTime(record.jam_masuk)}</div>
                                          )}
                                          {!pendek && <div className="text-slate-700">{formatTime(record.jam_keluar)}</div>}
                                        </>
                                      )}
                                    </td>
                                  );
                                })}
                                <td className="px-3 py-2 text-center border-b border-slate-100 font-semibold text-emerald-700 tabular-nums">{masuk}</td>
                                <td className="px-3 py-2 text-center border-b border-slate-100 font-semibold text-amber-700 tabular-nums">{tidakMasuk}</td>
                                <td className="px-3 py-2 text-center border-b border-slate-100">
                                  <button onClick={() => openUserHistory(p.user)}
                                    className="inline-flex items-center justify-center h-8 w-8 text-slate-600 bg-white hover:bg-slate-50 rounded-lg border border-slate-200"
                                    title="Detail pegawai">
                                    <FiEye className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <p className="text-sm font-semibold text-slate-600">
                        {rekapPeriode === 'tahun'
                          ? 'Kalender harian tidak ditampilkan untuk periode tahunan.'
                          : 'Tidak ada hari kerja pada periode yang dipilih.'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {rekapPeriode === 'tahun'
                          ? 'Pilih Mingguan atau Bulanan untuk melihat rincian presensi harian.'
                          : 'Silakan pilih tanggal referensi atau periode lain.'}
                      </p>
                    </div>
                  )}

                  <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between">
                    <p className="text-xs text-slate-500">Total: <strong className="text-slate-700 tabular-nums">{filteredRekapPegawai.length}</strong> pegawai</p>
                    <p className="text-xs text-slate-500 tabular-nums">{rekapCalendarDays.length} hari kerja</p>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ─── TAB: REKAP ──────────────────────────────────── */}
        {activeTab === "rekap" && (
          <div className="space-y-4">
            {/* ══ Filter Bar ══ */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-end gap-3">
                {/* Filter Mode Toggle */}
                <div className="flex bg-slate-100 rounded-lg p-1">
                  {["harian", "bulanan"].map(m => (
                    <button key={m} onClick={() => setFilterMode(m)}
                      className={`px-2 sm:px-3 h-8 whitespace-nowrap rounded-md text-xs sm:text-sm font-medium capitalize transition-colors ${
                        filterMode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      }`}>{m}</button>
                  ))}
                </div>

                {filterMode === "harian" ? (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Tanggal</label>
                    <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
                      className="px-3 h-10 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Bulan</label>
                      <select value={filterMonth} onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                        className="px-3 h-10 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500">
                        {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Tahun</label>
                      <input type="number" value={filterYear} onChange={(e) => setFilterYear(parseInt(e.target.value))}
                        className="px-3 h-10 border border-slate-200 rounded-lg bg-white text-sm w-24 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
                    </div>
                  </>
                )}

                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Cari Pegawai</label>
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Ketik nama pegawai..."
                      className="w-full pl-9 pr-3 h-10 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Urutkan</label>
                  <div className="relative">
                    <LuArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                      className="pl-9 pr-8 h-10 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 appearance-none">
                      <option value="default">Default</option>
                      <option value="nama_asc">Nama A → Z</option>
                      <option value="nama_desc">Nama Z → A</option>
                      <option value="jam_masuk_asc">Masuk Paling Awal</option>
                      <option value="jam_masuk_desc">Masuk Paling Akhir</option>
                      <option value="telat_desc">Telat Terbanyak</option>
                    </select>
                  </div>
                </div>

                {/* View Toggle */}
                <div className="flex bg-slate-100 rounded-lg p-1">
                  <button onClick={() => setViewMode("table")}
                    className={`inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                    <LuList className="h-4 w-4" />
                  </button>
                  <button onClick={() => setViewMode("card")}
                    className={`inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors ${viewMode === 'card' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                    <LuLayoutGrid className="h-4 w-4" />
                  </button>
                </div>

                {/* Export Button */}
                <button onClick={handleExportExcel} disabled={filteredRecords.length === 0}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  <LuFileSpreadsheet className="h-4 w-4" /> Excel
                </button>
                <button
                  onClick={handleOpenManualAttendance}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700"
                >
                  <FiUserPlus className="h-4 w-4" /> Isi Presensi Kosong
                </button>
              </div>
            </div>

            {/* ══ Quick Filter Chips ══ */}
            {(() => {
              const chipBase = "inline-flex items-center gap-2 h-8 px-3 rounded-full text-sm font-medium border transition-colors";
              const chipOn = "bg-slate-900 text-white border-slate-900";
              const chipOff = "bg-white text-slate-600 border-slate-200 hover:bg-slate-50";
              const cnt = (active, n) => (
                <span className={`text-xs tabular-nums ${active ? "text-white/70" : "text-slate-400"}`}>{n}</span>
              );
              return (
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setFilterStatus("semua")}
                    className={`${chipBase} ${filterStatus === "semua" ? chipOn : chipOff}`}>
                    <LuSlidersHorizontal className="h-3.5 w-3.5" />
                    Semua
                    {cnt(filterStatus === "semua", rekapSummary.total)}
                  </button>

                  <div className="w-px h-8 bg-slate-200 self-center mx-0.5" />

                  <button onClick={() => setFilterStatus("masuk")}
                    className={`${chipBase} ${filterStatus === "masuk" ? chipOn : chipOff}`}>
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Masuk
                    {cnt(filterStatus === "masuk", rekapSummary.masuk)}
                  </button>

                  <button onClick={() => setFilterStatus("tidak_masuk")}
                    className={`${chipBase} ${filterStatus === "tidak_masuk" ? chipOn : chipOff}`}>
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    Tidak Masuk
                    {cnt(filterStatus === "tidak_masuk", rekapSummary.tidak_masuk)}
                  </button>

                  {rekapSummary.telat > 0 && (
                    <button onClick={() => setFilterStatus("telat")}
                      className={`${chipBase} ${filterStatus === "telat" ? chipOn : chipOff}`}>
                      <FiClock className="h-3.5 w-3.5" /> Terlambat
                      {cnt(filterStatus === "telat", rekapSummary.telat)}
                    </button>
                  )}

                  <div className="w-px h-8 bg-slate-200 self-center mx-0.5" />

                  {/* Status individual: yang bernilai 0 disembunyikan kecuali sedang aktif */}
                  {Object.entries(STATUS_MAP).map(([key, { label, color }]) => {
                    const count = rekapSummary[key] || 0;
                    const isActive = filterStatus === key;
                    if (count === 0 && !isActive) return null;
                    return (
                      <button key={key} onClick={() => setFilterStatus(prev => prev === key ? "semua" : key)}
                        className={`${chipBase} ${isActive ? chipOn : chipOff}`}>
                        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[color]}`} />
                        {label}
                        {cnt(isActive, count)}
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            {/* ══ Active Filter Info Bar ══ */}
            {filterStatus !== "semua" && (
              <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <FiFilter className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-sm text-slate-600">
                    Filter aktif: <strong className="text-slate-900">
                      {filterStatus === "masuk" ? "Masuk (Hadir+WFH+WFA+Dinas Luar)" :
                       filterStatus === "tidak_masuk" ? "Tidak Masuk (Izin+Sakit+Alpha+Cuti)" :
                       filterStatus === "telat" ? "Terlambat" :
                       STATUS_MAP[filterStatus]?.label || filterStatus}
                    </strong>
                  </span>
                  <span className="text-xs text-slate-500 tabular-nums">— {filteredRecords.length} dari {rekapSummary.total} data</span>
                </div>
                <button onClick={() => setFilterStatus("semua")}
                  className="flex shrink-0 items-center gap-1 px-2.5 h-8 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg">
                  <FiX className="h-3 w-3" /> Hapus Filter
                </button>
              </div>
            )}

            {/* ══ Records Content ══ */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {loading ? (
                <div className="flex flex-col justify-center items-center py-20 gap-3">
                  <div className="relative h-12 w-12">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-600 animate-spin" />
                  </div>
                  <p className="text-sm text-slate-400 font-medium">Memuat data...</p>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiCalendar className="h-7 w-7 text-slate-300" />
                  </div>
                  <p className="text-slate-500 font-medium">Tidak ada data absensi</p>
                  <p className="text-slate-400 text-sm mt-1">
                    {filterStatus !== "semua" ? "Coba ubah filter atau hapus filter aktif" : "Ubah periode untuk melihat data lain"}
                  </p>
                  {filterStatus !== "semua" && (
                    <button onClick={() => setFilterStatus("semua")}
                      className="mt-4 inline-flex h-10 items-center gap-1.5 px-4 bg-white text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50">
                      <FiX className="h-3 w-3" /> Hapus Filter
                    </button>
                  )}
                </div>
              ) : viewMode === "table" ? (
                /* ── TABLE VIEW ── */
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                        <th className="text-left px-4 py-2.5 font-medium text-xs text-slate-500 w-[30%]">Pegawai</th>
                        <th className="text-left px-3 py-2.5 font-medium text-xs text-slate-500">Tanggal</th>
                        <th className="text-center px-3 py-2.5 font-medium text-xs text-slate-500">Status</th>
                        <th className="text-center px-3 py-2.5 font-medium text-xs text-slate-500">Jam Masuk</th>
                        <th className="text-center px-3 py-2.5 font-medium text-xs text-slate-500">Jam Keluar</th>
                        <th className="text-center px-3 py-2.5 font-medium text-xs text-slate-500">Jarak</th>
                        <th className="text-left px-3 py-2.5 font-medium text-xs text-slate-500">Keterangan</th>
                        {showRecordActions && (
                          <th className="text-center px-3 py-2.5 font-medium text-xs text-slate-500 w-20">Aksi</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedRecords.map((record) => {
                        const st = STATUS_MAP[record.status] || STATUS_MAP.alpha;
                        const c = colorMap[st.color];
                        const avatarUrl = getAvatarUrl(record.user?.avatar);
                        return (
                          <tr key={record.id} className="hover:bg-slate-50 group">
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-3">
                                {avatarUrl ? (
                                  <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                                ) : (
                                  <div className={`w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-semibold shrink-0`}>
                                    {(record.user?.pegawai?.nama_pegawai || record.user?.name || "?")[0].toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-800 text-sm truncate">{record.user?.pegawai?.nama_pegawai || record.user?.name || "-"}</p>
                                  <p className="text-[11px] text-slate-400 truncate">{record.user?.pegawai?.jabatan || record.user?.pegawai?.status_kepegawaian?.replace(/_/g, " ") || ""}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap text-xs">{formatDate(record.tanggal)}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold ${c.badge}`}>
                                <span className={`h-2 w-2 rounded-full ${STATUS_DOT[st.color]}`} /> {st.label}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`text-sm tabular-nums ${record.telat_masuk_menit > 0 ? "text-red-600 font-semibold" : "text-slate-700"}`}>{formatTime(record.jam_masuk)}</span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className="text-sm tabular-nums text-slate-700">{formatTime(record.jam_keluar)}</span>
                            </td>
                            <td className="px-3 py-2 text-center text-xs text-slate-500">
                              {record.jarak_masuk != null ? (
                                <span className={`font-mono ${record.jarak_masuk > 100 ? "text-amber-600 font-bold" : "text-slate-500"}`}>
                                  {record.jarak_masuk}m
                                </span>
                              ) : "-"}
                            </td>
                            <td className="px-3 py-2 text-slate-500 max-w-[200px] text-xs">
                              <div className="truncate">
                                {record.tujuan_dinas && <span className="text-purple-600 font-medium">📍 {record.tujuan_dinas} </span>}
                                {record.keterangan || ""}
                              </div>
                            </td>
                            {showRecordActions && (
                              <td className="px-3 py-2 text-center">
                                {record.is_missing ? (
                                  <button
                                    onClick={() => handleOpenManualAttendance(record)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2.5 py-1.5 text-[11px] font-bold text-orange-600 ring-1 ring-orange-200 transition hover:bg-orange-100"
                                    title="Isi presensi yang kosong"
                                  >
                                    <FiUserPlus className="h-3.5 w-3.5" /> Isi
                                  </button>
                                ) : canManageAbsensiRecords ? (
                                  <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingRecord(record)}
                                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                      <FiEdit2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button onClick={() => handleDeleteRecord(record.id)}
                                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                                      <FiTrash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ) : null}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* ── CARD VIEW ── */
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {paginatedRecords.map((record) => {
                    const st = STATUS_MAP[record.status] || STATUS_MAP.alpha;
                    const c = colorMap[st.color];
                    const avatarUrl = getAvatarUrl(record.user?.avatar);
                    return (
                      <div key={record.id} className={`rounded-2xl border bg-white p-4 relative group ${
                        record.telat_masuk_menit > 0 ? "border-amber-300" : "border-slate-200 hover:border-slate-300"
                      }`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className={`w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-base font-semibold`}>
                                {(record.user?.pegawai?.nama_pegawai || record.user?.name || "?")[0].toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 text-sm truncate">{record.user?.pegawai?.nama_pegawai || record.user?.name || "-"}</p>
                              <p className="text-[11px] text-slate-400">{formatDate(record.tanggal)}</p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold ${c.badge}`}><span className={`h-2 w-2 rounded-full ${STATUS_DOT[st.color]}`} /> {st.label}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs bg-slate-50 rounded-xl p-2.5">
                          <div className={`flex items-center gap-1.5 ${record.telat_masuk_menit > 0 ? "text-red-600" : "text-slate-600"}`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="font-mono font-bold">{formatTime(record.jam_masuk)}</span>
                          </div>
                          <span className="text-slate-300 font-medium">→</span>
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span className="font-mono font-bold">{formatTime(record.jam_keluar)}</span>
                          </div>
                          {record.jarak_masuk != null && (
                            <span className="text-slate-400 ml-auto text-[11px]">{record.jarak_masuk}m</span>
                          )}
                        </div>
                        {(record.tujuan_dinas || record.keterangan) && (
                          <p className="mt-2 text-[11px] text-slate-400 truncate">
                            {record.tujuan_dinas && <span className="text-purple-500 font-medium">📍 {record.tujuan_dinas} </span>}
                            {record.keterangan || ""}
                          </p>
                        )}
                        {(record.is_missing || canManageAbsensiRecords) && (
                          <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                            {record.is_missing ? (
                              <button onClick={() => handleOpenManualAttendance(record)} className="flex items-center gap-1 rounded-lg border border-orange-200 bg-white px-2 py-1.5 text-[10px] font-bold text-orange-600 shadow-md">
                                <FiUserPlus className="h-3 w-3" /> Isi
                              </button>
                            ) : (
                              <>
                                <button onClick={() => setEditingRecord(record)} className="p-1.5 bg-white text-blue-600 hover:bg-blue-50 rounded-lg shadow-md border border-slate-200">
                                  <FiEdit2 className="h-3 w-3" />
                                </button>
                                <button onClick={() => handleDeleteRecord(record.id)} className="p-1.5 bg-white text-red-500 hover:bg-red-50 rounded-lg shadow-md border border-slate-200">
                                  <FiTrash2 className="h-3 w-3" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Pagination Footer ── */}
              {!loading && filteredRecords.length > 0 && (
                <div className="px-5 py-3.5 border-t border-slate-100 bg-white flex items-center justify-between gap-4">
                  <p className="text-xs text-slate-500">
                    Menampilkan <strong className="text-slate-700">{Math.min((currentPage - 1) * RECORDS_PER_PAGE + 1, filteredRecords.length)}</strong>
                    {" - "}<strong className="text-slate-700">{Math.min(currentPage * RECORDS_PER_PAGE, filteredRecords.length)}</strong>
                    {" dari "}<strong className="text-slate-700">{filteredRecords.length}</strong> data
                    {filterStatus !== "semua" && <span className="text-orange-500"> (difilter)</span>}
                  </p>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                        <FiChevronLeft className="h-4 w-4" />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                        .reduce((acc, p, i, arr) => {
                          if (i > 0 && p - arr[i - 1] > 1) acc.push("...");
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, i) => p === "..." ? (
                          <span key={`dots-${i}`} className="px-1 text-slate-300 text-xs">...</span>
                        ) : (
                          <button key={p} onClick={() => setCurrentPage(p)}
                            className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all ${
                              currentPage === p
                                ? "bg-orange-600 text-white"
                                : "text-slate-500 hover:bg-slate-100 border border-slate-200"
                            }`}>{p}</button>
                        ))}
                      <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                        <FiChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: PEGAWAI ────────────────────────────────── */}
        {activeTab === "pegawai" && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-100 rounded-lg">
                  <FiUsers className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Daftar Pegawai Wajib Absensi</h3>
                  <p className="text-xs text-slate-400 mt-0.5">PPPK Paruh Waktu, Tenaga Alih Daya, Keamanan, Kebersihan</p>
                </div>
              </div>
            </div>

            {/* Pegawai Cards - Mobile friendly */}
            <div className="p-4 sm:p-5 space-y-3">
              {pegawai.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FiUsers className="h-6 w-6 text-slate-300" />
                  </div>
                  <p className="text-slate-500 font-medium text-sm">Tidak ada pegawai</p>
                </div>
              ) : (
                pegawai.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-4 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 group">
                    {/* Number Badge */}
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                      {i + 1}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{p.pegawai?.nama_pegawai || p.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[11px] text-slate-400 truncate">{p.pegawai?.jabatan || "-"}</p>
                        <span className="text-slate-200">•</span>
                        <p className="text-[11px] text-slate-400 truncate">{p.pegawai?.status_kepegawaian?.replace(/_/g, " ") || "-"}</p>
                      </div>
                    </div>

                    {/* Device Status */}
                    <div className="flex items-center gap-2 shrink-0">
                      {p.device_id ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[11px] font-bold">
                          <LuWifi className="h-3.5 w-3.5" /> Terdaftar
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 text-red-600 rounded-lg text-[11px] font-bold">
                          <LuWifiOff className="h-3.5 w-3.5" /> Belum
                        </span>
                      )}
                      <button onClick={() => handleSetDevice(p)}
                        className={`p-2 rounded-xl transition-all ${
                          p.device_id
                            ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                            : "text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200"
                        }`} title={p.device_id ? "Kelola Device" : "Info Device"}>
                        <FiSmartphone className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {pegawai.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Total: <strong className="text-slate-700">{pegawai.length}</strong> pegawai</span>
                  <span className="text-emerald-600 font-semibold">
                    {pegawai.filter(p => p.device_id).length} device terdaftar
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: POPUP ──────────────────────────────────── */}
        {activeTab === "popup" && (
          <div>
            {popupLoading ? (
              <div className="flex flex-col justify-center items-center py-20 gap-3">
                <div className="relative h-12 w-12">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-600 animate-spin" />
                </div>
                <p className="text-sm text-slate-400 font-medium">Memuat popup...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(POPUP_TYPE_LABELS).map((type) => {
                  const msg = popupMessages.find((m) => m.type === type) || {
                    type, title: POPUP_TYPE_LABELS[type] + " Berhasil!", message: "", image_path: null, is_active: true,
                  };
                  const isEditing = popupEditingType === type;
                  return (
                    <div key={type}
                      className={`bg-white rounded-2xl border overflow-hidden ${
                        isEditing ? "border-orange-500" : "border-slate-200"
                      }`}>
                      {/* Card Header */}
                      <div className={`px-4 py-3 flex items-center justify-between border-b border-slate-200`}>
                        <div className="flex items-center gap-2.5">
                          <span className="text-slate-900 font-semibold text-sm">{POPUP_TYPE_LABELS[type]}</span>
                          {msg.is_active ? (
                            <span className="bg-emerald-100 text-emerald-700 text-[11px] px-2 py-0.5 rounded-full font-semibold">Aktif</span>
                          ) : (
                            <span className="bg-slate-100 text-slate-500 text-[11px] px-2 py-0.5 rounded-full font-semibold">Off</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => togglePopupActive(msg)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600" title={msg.is_active ? "Nonaktifkan" : "Aktifkan"}>
                            {msg.is_active ? <FiToggleRight className="h-5 w-5" /> : <FiToggleLeft className="h-5 w-5" />}
                          </button>
                          {!isEditing && (
                            <button onClick={() => startPopupEdit(msg)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600">
                              <FiEdit2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-4">
                        {isEditing ? (
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Gambar Popup</label>
                              {popupPreviewImage ? (
                                <div className="relative">
                                  <img src={popupPreviewImage} alt="Preview" className="w-full h-40 object-contain rounded-xl bg-slate-50 border border-slate-100" />
                                  <button onClick={handlePopupRemoveImage}
                                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-lg hover:bg-red-600 transition-colors shadow-sm">
                                    <FiTrash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button onClick={() => popupFileInputRef.current?.click()}
                                  className="w-full h-32 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-orange-400 hover:text-orange-500 transition-colors">
                                  <FiUpload className="h-6 w-6" /><span className="text-xs font-medium">Upload Gambar (max 5MB)</span>
                                </button>
                              )}
                              <input ref={popupFileInputRef} type="file" accept="image/*" onChange={handlePopupImageChange} className="hidden" />
                              {popupPreviewImage && (
                                <button onClick={() => popupFileInputRef.current?.click()} className="mt-2 text-xs text-orange-600 hover:text-orange-700 font-semibold">Ganti Gambar</button>
                              )}
                            </div>
                            <div>
                              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Judul</label>
                              <input type="text" value={popupEditForm.title} onChange={(e) => setPopupEditForm(f => ({ ...f, title: e.target.value }))}
                                className="w-full px-3 h-10 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" placeholder="Judul popup..." />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Pesan</label>
                              <textarea value={popupEditForm.message} onChange={(e) => setPopupEditForm(f => ({ ...f, message: e.target.value }))}
                                rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 resize-none" placeholder="Pesan popup..." />
                            </div>
                            <div className="flex gap-2 justify-end pt-1">
                              <button onClick={cancelPopupEdit} className="h-10 px-4 text-sm text-slate-700 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 font-semibold">Batal</button>
                              <button onClick={handlePopupSave} disabled={popupSaving}
                                className="h-10 px-4 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold disabled:opacity-50 flex items-center gap-1.5">
                                {popupSaving ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <FiSave className="h-4 w-4" />}
                                Simpan
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {msg.image_path ? (
                              <img src={getStorageUrl(msg.image_path)} alt={msg.title} className="w-full h-32 object-contain rounded-xl bg-slate-50 border border-slate-100 mb-3" />
                            ) : (
                              <div className="w-full h-20 rounded-xl bg-slate-50 border border-slate-100 mb-3 flex items-center justify-center">
                                <FiImage className="h-8 w-8 text-slate-200" />
                              </div>
                            )}
                            <h4 className="font-bold text-slate-800 text-sm mb-1">{msg.title || "-"}</h4>
                            <p className="text-slate-400 text-xs leading-relaxed">{msg.message || "Belum ada pesan"}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ Reminder Templates Tab ═══════════════════════ */}
        {activeTab === "reminder" && (
          <div>
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
              <div className="flex items-start gap-3">
                <FiBell className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-800">Auto Reminder Absensi</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Notifikasi otomatis dikirim 5 menit sebelum jam masuk dan jam pulang kepada semua pegawai yang wajib absen.
                    Anda bisa mengkustomisasi judul dan pesan notifikasi di bawah ini.
                  </p>
                </div>
              </div>
            </div>

            {reminderLoading ? (
              <div className="flex flex-col justify-center items-center py-20 gap-3">
                <div className="relative h-12 w-12">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-600 animate-spin" />
                </div>
                <p className="text-sm text-slate-400 font-medium">Memuat template...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reminderTemplates.map((tmpl) => {
                  const isEditing = reminderEditingType === tmpl.type;
                  const isMasuk = tmpl.type === 'reminder_masuk';
                  const label = isMasuk ? 'Reminder Masuk' : 'Reminder Pulang';
                  const desc = isMasuk
                    ? `Dikirim 5 menit sebelum jam masuk (${settings.jam_masuk || '08:00'} WIB)`
                    : `Dikirim 5 menit sebelum jam pulang (${settings.jam_pulang || '16:00'} WIB)`;

                  return (
                    <div key={tmpl.type}
                      className={`bg-white rounded-2xl border overflow-hidden ${
                        isEditing ? "border-orange-500" : "border-slate-200"
                      }`}>
                      {/* Card Header */}
                      <div className={`px-4 py-3 flex items-center justify-between border-b border-slate-200`}>
                        <div className="flex items-center gap-2.5">
                          <FiBell className="h-4 w-4 text-slate-500" />
                          <div>
                            <span className="text-slate-900 font-semibold text-sm">{label}</span>
                            <p className="text-slate-500 text-xs">{desc}</p>
                          </div>
                          {tmpl.is_active ? (
                            <span className="bg-emerald-100 text-emerald-700 text-[11px] px-2 py-0.5 rounded-full font-semibold">Aktif</span>
                          ) : (
                            <span className="bg-slate-100 text-slate-500 text-[11px] px-2 py-0.5 rounded-full font-semibold">Off</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={async () => {
                            try {
                              await api.put(`/absensi/admin/reminder-templates/${tmpl.type}`, { is_active: !tmpl.is_active });
                              await fetchReminderTemplates();
                            } catch { showAlert({ icon: "error", title: "Gagal", text: "Gagal mengubah status" }); }
                          }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600" title={tmpl.is_active ? "Nonaktifkan" : "Aktifkan"}>
                            {tmpl.is_active ? <FiToggleRight className="h-5 w-5" /> : <FiToggleLeft className="h-5 w-5" />}
                          </button>
                          {!isEditing && (
                            <button onClick={() => {
                              setReminderEditingType(tmpl.type);
                              setReminderEditForm({ title: tmpl.title || '', message: tmpl.message || '', is_active: tmpl.is_active });
                            }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600">
                              <FiEdit2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-4">
                        {isEditing ? (
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Judul Notifikasi</label>
                              <input type="text" value={reminderEditForm.title} onChange={(e) => setReminderEditForm(f => ({ ...f, title: e.target.value }))}
                                className="w-full px-3 h-10 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" placeholder="Judul notifikasi..." />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Pesan Notifikasi</label>
                              <textarea value={reminderEditForm.message} onChange={(e) => setReminderEditForm(f => ({ ...f, message: e.target.value }))}
                                rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 resize-none" placeholder="Pesan notifikasi..." />
                            </div>
                            <div className="flex gap-2 justify-end pt-1">
                              <button onClick={() => { setReminderEditingType(null); setReminderEditForm({ title: "", message: "", is_active: true }); }}
                                className="h-10 px-4 text-sm text-slate-700 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 font-semibold">Batal</button>
                              <button onClick={async () => {
                                setReminderSaving(true);
                                try {
                                  await api.put(`/absensi/admin/reminder-templates/${reminderEditingType}`, {
                                    title: reminderEditForm.title,
                                    message: reminderEditForm.message,
                                  });
                                  await fetchReminderTemplates();
                                  setReminderEditingType(null);
                                  setReminderEditForm({ title: "", message: "", is_active: true });
                                  showAlert({ icon: "success", title: "Berhasil", text: "Template berhasil diupdate", timer: 1500 });
                                } catch { showAlert({ icon: "error", title: "Gagal", text: "Gagal update template" }); }
                                finally { setReminderSaving(false); }
                              }} disabled={reminderSaving}
                                className="h-10 px-4 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold disabled:opacity-50 flex items-center gap-1.5">
                                {reminderSaving ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <FiSave className="h-4 w-4" />}
                                Simpan
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm mb-1">{tmpl.title || "-"}</h4>
                            <p className="text-slate-400 text-xs leading-relaxed mb-3">{tmpl.message || "Belum ada pesan"}</p>
                            <button onClick={async () => {
                              setReminderTesting(tmpl.type);
                              try {
                                const res = await api.post(`/absensi/admin/test-reminder/${tmpl.type}`);
                                showAlert({ icon: "success", title: "Berhasil", text: `Test reminder terkirim ke ${res.data.data?.total || 0} pegawai`, timer: 2000 });
                              } catch { showAlert({ icon: "error", title: "Gagal", text: "Gagal mengirim test reminder" }); }
                              finally { setReminderTesting(null); }
                            }} disabled={reminderTesting === tmpl.type}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all disabled:opacity-50">
                              {reminderTesting === tmpl.type ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-500 border-t-transparent" />
                              ) : (
                                <FiSend className="h-3 w-3" />
                              )}
                              Test Kirim
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "lokasi" && canManageAbsensiRecords && (
          <React.Suspense
            fallback={
              <div className="flex justify-center py-16">
                <div className="w-9 h-9 border-[3px] border-slate-200 border-t-orange-600 rounded-full animate-spin" />
              </div>
            }
          >
            <LokasiKhususTab />
          </React.Suspense>
        )}
      </div>

      {/* ═══ Modals ═════════════════════════════════════════ */}
      {canManageAbsensiRecords && editingRecord && (
        <EditAbsensiModal record={editingRecord} onClose={() => setEditingRecord(null)} onSave={handleUpdateRecord} />
      )}
      {showManualAttendanceModal && (
        <ManualAttendanceModal
          initialDate={manualAttendanceDefaults.date || filterDate}
          initialEmployeeId={manualAttendanceDefaults.employeeId}
          settings={settings}
          onClose={() => {
            setShowManualAttendanceModal(false);
            setManualAttendanceDefaults({ date: "", employeeId: "" });
          }}
          onSave={handleCreateManualAttendance}
        />
      )}
      {showSettingsModal && (
        <SettingsModal settings={settings} onClose={() => setShowSettingsModal(false)} onSave={handleSaveSettings} />
      )}
      {/* User History Modal */}
      {historyUser && (
        <UserHistoryModal
          user={historyUser}
          data={historyData}
          loading={historyLoading}
          periode={historyPeriode}
          onPeriodeChange={setHistoryPeriode}
          filterDate={filterDate}
          filterMonth={filterMonth}
          filterYear={filterYear}
          onFilterDateChange={setFilterDate}
          onFilterMonthChange={setFilterMonth}
          onFilterYearChange={setFilterYear}
          onClose={() => { setHistoryUser(null); setHistoryData(null); }}
        />
      )}
    </div>
  );
};

// ═══ Edit Absensi Modal ═══════════════════════════════════════
const ManualAttendanceModal = ({ initialDate, initialEmployeeId, settings, onClose, onSave }) => {
  const [date, setDate] = useState(initialDate);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [employeeId, setEmployeeId] = useState(initialEmployeeId || "");
  const [status, setStatus] = useState("hadir");
  const [jamMasuk, setJamMasuk] = useState(settings.jam_masuk || "08:00");
  const [jamKeluar, setJamKeluar] = useState(settings.jam_pulang || "16:00");
  const [keterangan, setKeterangan] = useState("");
  const [tujuanDinas, setTujuanDinas] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const loadMissingEmployees = async () => {
      setLoadingEmployees(true);
      setEmployeeId("");
      try {
        const response = await api.get("/absensi/admin/presensi-kosong", {
          params: { tanggal: date },
        });
        if (active) {
          const missingEmployees = response.data.data || [];
          setEmployees(missingEmployees);
          setEmployeeId((currentId) => {
            const preferredId = initialEmployeeId || currentId;
            return missingEmployees.some(employee => String(employee.id) === String(preferredId))
              ? String(preferredId)
              : "";
          });
        }
      } catch (error) {
        if (active) {
          setEmployees([]);
          showAlert({
            icon: "error",
            title: "Gagal Memuat Pegawai",
            text: error.response?.data?.message || "Daftar presensi kosong gagal dimuat",
          });
        }
      } finally {
        if (active) setLoadingEmployees(false);
      }
    };

    loadMissingEmployees();
    return () => { active = false; };
  }, [date, initialEmployeeId]);

  const isPresent = PRESENT_STATUSES.includes(status);
  const filteredEmployees = employees.filter((employee) => {
    const name = employee.pegawai?.nama_pegawai || employee.name || "";
    const role = employee.pegawai?.jabatan || employee.pegawai?.status_kepegawaian || "";
    return `${name} ${role}`.toLowerCase().includes(search.toLowerCase());
  });

  const handleSave = async () => {
    if (!employeeId) {
      showAlert({ icon: "warning", title: "Pilih Pegawai", text: "Pegawai wajib dipilih." });
      return;
    }
    if (isPresent && !jamMasuk) {
      showAlert({ icon: "warning", title: "Jam Masuk Kosong", text: "Jam masuk wajib diisi untuk status kehadiran." });
      return;
    }
    if (status === "dinas_luar" && !tujuanDinas.trim()) {
      showAlert({ icon: "warning", title: "Tujuan Dinas Kosong", text: "Tujuan dinas luar wajib diisi." });
      return;
    }

    setSaving(true);
    const success = await onSave({
      user_id: employeeId,
      tanggal: date,
      status,
      jam_masuk: isPresent ? jamMasuk || null : null,
      jam_keluar: isPresent ? jamKeluar || null : null,
      keterangan: keterangan.trim() || null,
      tujuan_dinas: status === "dinas_luar" ? tujuanDinas.trim() : null,
    });
    if (!success) setSaving(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
        <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 text-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <FiUserPlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold">Isi Presensi Kosong</h3>
                <p className="text-xs text-slate-500">{formatDate(`${date}T00:00:00`)}</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100">
              <FiX className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-5 p-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Tanggal Presensi</label>
              <input
                type="date"
                value={date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(event) => setDate(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              />
            </div>

            {loadingEmployees ? (
              <div className="flex items-center justify-center gap-3 rounded-2xl bg-slate-50 px-5 py-8 text-sm text-slate-500">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-orange-600" />
                Memuat pegawai yang belum absen...
              </div>
            ) : employees.length === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl">✓</div>
                <p className="font-bold text-emerald-800">Semua pegawai sudah tercatat</p>
                <p className="mt-1 text-xs text-emerald-600">Tidak ada presensi kosong pada tanggal ini.</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Cari Pegawai</label>
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input value={search} onChange={(event) => setSearch(event.target.value)}
                      placeholder="Cari nama atau jabatan..."
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">
                    Pegawai Belum Absen ({filteredEmployees.length})
                  </label>
                  <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500">
                    <option value="">Pilih pegawai</option>
                    {filteredEmployees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.pegawai?.nama_pegawai || employee.name} — {employee.pegawai?.jabatan || employee.pegawai?.status_kepegawaian?.replace(/_/g, " ") || "Pegawai"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Status Presensi</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {Object.entries(STATUS_MAP).map(([key, item]) => (
                      <button key={key} type="button" onClick={() => setStatus(key)}
                        className={`rounded-lg border px-2 h-10 text-sm font-medium transition ${
                          status === key
                            ? "border-orange-500 bg-orange-50 text-slate-900"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}>
                        <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${STATUS_DOT[item.color]}`} />{item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {isPresent && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-500">Jam Masuk *</label>
                      <input type="time" value={jamMasuk} onChange={(event) => setJamMasuk(event.target.value)}
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-500">Jam Keluar</label>
                      <input type="time" value={jamKeluar} onChange={(event) => setJamKeluar(event.target.value)}
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
                    </div>
                  </div>
                )}

                {status === "dinas_luar" && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">Tujuan Dinas *</label>
                    <input value={tujuanDinas} onChange={(event) => setTujuanDinas(event.target.value)}
                      placeholder="Lokasi atau tujuan dinas luar"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Keterangan</label>
                  <textarea value={keterangan} onChange={(event) => setKeterangan(event.target.value)}
                    placeholder="Alasan atau catatan pengisian manual..." rows={3}
                    className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
                </div>
              </>
            )}
          </div>

          <div className="sticky bottom-0 flex gap-3 border-t border-slate-100 bg-white px-5 py-4">
            <button onClick={onClose} className="flex-1 h-10 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50">Batal</button>
            {!loadingEmployees && employees.length > 0 && (
              <button onClick={handleSave} disabled={saving}
                className="flex-1 h-10 rounded-lg bg-orange-600 font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
                {saving ? "Menyimpan..." : "Simpan Presensi"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

const EditAbsensiModal = ({ record, onClose, onSave }) => {
  const [status, setStatus] = useState(record.status);
  const [keterangan, setKeterangan] = useState(record.keterangan || "");
  const [tujuanDinas, setTujuanDinas] = useState(record.tujuan_dinas || "");
  const [jamMasuk, setJamMasuk] = useState(record.jam_masuk ? new Date(record.jam_masuk).toTimeString().slice(0, 5) : "");
  const [jamKeluar, setJamKeluar] = useState(record.jam_keluar ? new Date(record.jam_keluar).toTimeString().slice(0, 5) : "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(record.id, {
      status, keterangan: keterangan || null,
      tujuan_dinas: status === "dinas_luar" ? tujuanDinas : null,
      jam_masuk: jamMasuk || null, jam_keluar: jamKeluar || null,
    });
    setSaving(false);
  };

  const nama = record.user?.pegawai?.nama_pegawai || record.user?.name || "-";

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          {/* Modal Header */}
          <div className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Edit Absensi</h3>
              <p className="text-slate-500 text-sm">{nama}</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
              <FiX className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-slate-50 rounded-xl px-4 py-2.5">
              <p className="text-xs font-medium text-slate-500">Tanggal</p>
              <p className="text-sm font-semibold text-slate-700">{formatDate(record.tanggal)}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 h-10 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500">
                {Object.entries(STATUS_MAP).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Jam Masuk</label>
                <input type="time" value={jamMasuk} onChange={(e) => setJamMasuk(e.target.value)}
                  className="w-full px-3 h-10 border border-slate-200 rounded-lg bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Jam Keluar</label>
                <input type="time" value={jamKeluar} onChange={(e) => setJamKeluar(e.target.value)}
                  className="w-full px-3 h-10 border border-slate-200 rounded-lg bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
              </div>
            </div>

            {status === "dinas_luar" && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Tujuan Dinas</label>
                <input type="text" value={tujuanDinas} onChange={(e) => setTujuanDinas(e.target.value)}
                  placeholder="Tujuan dinas luar..." className="w-full px-3 h-10 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Keterangan</label>
              <textarea value={keterangan} onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Keterangan tambahan..." rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3">
            <button onClick={onClose} className="flex-1 h-10 bg-white text-slate-700 rounded-lg font-semibold border border-slate-200 hover:bg-slate-50">Batal</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 h-10 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50">
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// ═══ Settings Modal ═══════════════════════════════════════════
const SettingsModal = ({ settings, onClose, onSave }) => {
  const [jamMasuk, setJamMasuk] = useState(settings.jam_masuk || "08:00");
  const [jamPulang, setJamPulang] = useState(settings.jam_pulang || "16:00");
  const [toleransi, setToleransi] = useState(settings.toleransi_terlambat || "15");
  const [jamBukaAbsen, setJamBukaAbsen] = useState(settings.jam_buka_absen || "06:00");
  const [jamTutupAbsen, setJamTutupAbsen] = useState(settings.jam_tutup_absen || "17:00");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      jam_masuk: jamMasuk,
      jam_pulang: jamPulang,
      toleransi_terlambat: toleransi,
      jam_buka_absen: jamBukaAbsen,
      jam_tutup_absen: jamTutupAbsen,
    });
    setSaving(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          {/* Modal Header */}
          <div className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <FiSettings className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Pengaturan Absensi</h3>
                <p className="text-slate-500 text-xs">Atur jam masuk, pulang & toleransi</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
              <FiX className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Jam Buka & Tutup Absensi */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  <FiClock className="inline h-3 w-3 mr-1" />Jam Buka Absen
                </label>
                <input type="time" value={jamBukaAbsen} onChange={(e) => setJamBukaAbsen(e.target.value)}
                  className="w-full px-3 h-10 border border-slate-200 rounded-lg bg-white text-sm font-mono text-center font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
                <p className="text-[10px] text-slate-400 mt-1.5 text-center">Absen bisa dimulai</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  <FiClock className="inline h-3 w-3 mr-1" />Jam Tutup Absen
                </label>
                <input type="time" value={jamTutupAbsen} onChange={(e) => setJamTutupAbsen(e.target.value)}
                  className="w-full px-3 h-10 border border-slate-200 rounded-lg bg-white text-sm font-mono text-center font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
                <p className="text-[10px] text-slate-400 mt-1.5 text-center">Absen ditutup</p>
              </div>
            </div>

            {/* Jam Masuk & Pulang */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  <FiClock className="inline h-3 w-3 mr-1" />Jam Masuk
                </label>
                <input type="time" value={jamMasuk} onChange={(e) => setJamMasuk(e.target.value)}
                  className="w-full px-3 h-10 border border-slate-200 rounded-lg bg-white text-sm font-mono text-center font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
                <p className="text-[10px] text-slate-400 mt-1.5 text-center">Wajib hadir</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  <FiClock className="inline h-3 w-3 mr-1" />Jam Pulang
                </label>
                <input type="time" value={jamPulang} onChange={(e) => setJamPulang(e.target.value)}
                  className="w-full px-3 h-10 border border-slate-200 rounded-lg bg-white text-sm font-mono text-center font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
                <p className="text-[10px] text-slate-400 mt-1.5 text-center">Boleh pulang</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Toleransi Terlambat (menit)</label>
              <div className="relative">
                <input type="number" value={toleransi} onChange={(e) => setToleransi(e.target.value)} min="0" max="120"
                  className="w-full px-3 h-10 border border-slate-200 rounded-lg bg-white text-sm font-mono font-bold text-center focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 text-center">Menit dispensasi setelah jam masuk</p>
            </div>

            {/* Preview */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-xs font-medium text-slate-500 mb-2">Preview Konfigurasi</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Absen Dibuka</span>
                <span className="font-mono font-bold text-emerald-600">{jamBukaAbsen} WIB</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-slate-500">Masuk</span>
                <span className="font-mono font-bold text-slate-800">{jamMasuk} WIB</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-slate-500">Telat Mulai</span>
                <span className="font-mono font-bold text-amber-600">
                  {(() => {
                    const [h, m] = jamMasuk.split(":").map(Number);
                    const total = h * 60 + m + 1;
                    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")} WIB`;
                  })()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-slate-500">Pulang</span>
                <span className="font-mono font-bold text-slate-800">{jamPulang} WIB</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-slate-500">Absen Ditutup</span>
                <span className="font-mono font-bold text-red-600">{jamTutupAbsen} WIB</span>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3">
            <button onClick={onClose} className="flex-1 h-10 bg-white text-slate-700 rounded-lg font-semibold border border-slate-200 hover:bg-slate-50">Batal</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 h-10 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50">
              {saving ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// ═══ User History Modal ═══════════════════════════════════════
const UserHistoryModal = ({ user, data, loading, periode, onPeriodeChange, filterDate, filterMonth, filterYear, onFilterDateChange, onFilterMonthChange, onFilterYearChange, onClose }) => {
  const nama = user?.pegawai?.nama_pegawai || user?.name || "-";
  const jabatan = user?.pegawai?.jabatan || user?.pegawai?.status_kepegawaian?.replace(/_/g, " ") || "-";
  const totalAbsen = data?.summary?.total || 0;
  const totalMasuk = PRESENT_STATUSES.reduce((sum, k) => sum + (data?.summary?.[k] || 0), 0);
  const pct = totalAbsen > 0 ? Math.round((totalMasuk / totalAbsen) * 100) : 0;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="border-b border-slate-200 bg-white px-6 py-4 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 text-lg font-semibold">
                  {nama[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{nama}</h3>
                  <p className="text-slate-500 text-sm">{jabatan}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!loading && data && (
                  <div className="hidden sm:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-xs">Kehadiran</span>
                    <span className="text-slate-900 font-bold text-lg tabular-nums">{pct}%</span>
                  </div>
                )}
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                  <FiX className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Period Filter */}
          <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex bg-slate-100 rounded-lg p-1">
                {[
                  { key: "minggu", label: "Mingguan" },
                  { key: "bulan", label: "Bulanan" },
                ].map(p => (
                  <button key={p.key} onClick={() => onPeriodeChange(p.key)}
                    className={`px-2 sm:px-3 h-8 whitespace-nowrap rounded-md text-xs sm:text-sm font-medium transition-colors ${
                      periode === p.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}>{p.label}</button>
                ))}
              </div>
              {periode === 'minggu' && (
                <input type="date" value={filterDate} onChange={(e) => onFilterDateChange(e.target.value)}
                  className="px-3 h-10 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
              )}
              {periode === 'bulan' && (
                <>
                  <select value={filterMonth} onChange={(e) => onFilterMonthChange(parseInt(e.target.value))}
                    className="px-3 h-10 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500">
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                  <input type="number" value={filterYear} onChange={(e) => onFilterYearChange(parseInt(e.target.value))}
                    className="px-3 h-10 border border-slate-200 rounded-lg bg-white text-sm w-24 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
                </>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {loading ? (
              <div className="flex flex-col justify-center items-center py-16 gap-3">
                <div className="relative h-10 w-10">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-600 animate-spin" />
                </div>
                <p className="text-sm text-slate-400">Memuat riwayat...</p>
              </div>
            ) : data ? (
              <>
                {/* Total Masuk / Tidak Masuk Overview */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                    <p className="text-sm text-slate-500">Total Masuk</p>
                    <p className="text-2xl font-bold text-emerald-700 tabular-nums">{totalMasuk}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                    <p className="text-sm text-slate-500">Tidak Masuk</p>
                    <p className="text-2xl font-bold text-amber-700 tabular-nums">{totalAbsen - totalMasuk}</p>
                  </div>
                </div>

                {/* Summary Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  {Object.entries(STATUS_MAP).map(([key, { label, color }]) => {
                    const count = data.summary?.[key] || 0;
                    return (
                      <div key={key} className={`flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5`}>
                        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${STATUS_DOT[color]}`} />
                        <div className="min-w-0">
                          <p className="text-lg font-bold text-slate-900 leading-none tabular-nums">{count}</p>
                          <p className={`text-xs text-slate-500 truncate`}>{label}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Distribution Bar */}
                {data.summary?.total > 0 && (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="flex h-3 rounded-full overflow-hidden bg-slate-200">
                      {Object.entries(STATUS_MAP).map(([key, { color }]) => {
                        const count = data.summary?.[key] || 0;
                        if (count === 0) return null;
                        const widthPct = (count / data.summary.total) * 100;
                        const bgColors = { emerald: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500", gray: "bg-gray-400", blue: "bg-blue-500", purple: "bg-purple-500", teal: "bg-teal-500", indigo: "bg-indigo-500" };
                        return <div key={key} className={`${bgColors[color]} transition-all duration-500`} style={{ width: `${widthPct}%` }} />;
                      })}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                      {Object.entries(STATUS_MAP).map(([key, { label, color }]) => {
                        const count = data.summary?.[key] || 0;
                        if (count === 0) return null;
                        const dotColors = { emerald: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500", gray: "bg-gray-400", blue: "bg-blue-500", purple: "bg-purple-500", teal: "bg-teal-500", indigo: "bg-indigo-500" };
                        return (
                          <div key={key} className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${dotColors[color]}`} />
                            <span className="text-[10px] text-slate-500">{label} <strong className="text-slate-700">{count}</strong></span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Records Table */}
                {data.records?.length > 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left px-4 py-3 font-medium text-xs text-slate-500">Tanggal</th>
                          <th className="text-center px-3 py-3 font-medium text-xs text-slate-500">Status</th>
                          <th className="text-center px-3 py-3 font-medium text-xs text-slate-500">Masuk</th>
                          <th className="text-center px-3 py-3 font-medium text-xs text-slate-500">Keluar</th>
                          <th className="text-center px-3 py-3 font-medium text-xs text-slate-500">Jarak</th>
                          <th className="text-left px-3 py-3 font-medium text-xs text-slate-500">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.records.map((r) => {
                          const st = STATUS_MAP[r.status] || STATUS_MAP.alpha;
                          const c = colorMap[st.color];
                          return (
                            <tr key={r.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{formatDate(r.tanggal)}</td>
                              <td className="text-center px-3 py-3">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold ${c.badge}`}>
                                  <span className={`h-2 w-2 rounded-full ${STATUS_DOT[st.color]}`} /> {st.label}
                                </span>
                              </td>
                              <td className="text-center px-3 py-3">
                                <span className={`text-sm tabular-nums ${r.telat_masuk_menit > 0 ? "text-red-600 font-semibold" : "text-slate-700"}`}>{formatTime(r.jam_masuk)}</span>
                              </td>
                              <td className="text-center px-3 py-3">
                                <span className="text-sm tabular-nums text-slate-700">{formatTime(r.jam_keluar)}</span>
                              </td>
                              <td className="text-center px-3 py-3 text-xs text-slate-500">
                                {r.jarak_masuk != null ? `${r.jarak_masuk}m` : "-"}
                              </td>
                              <td className="px-3 py-3 text-xs text-slate-500 max-w-[200px] truncate">
                                {r.tujuan_dinas && <span className="text-purple-600 font-medium">📍 {r.tujuan_dinas} </span>}
                                {r.keterangan || ""}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FiCalendar className="h-6 w-6 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium text-sm">Tidak ada data pada periode ini</p>
                  </div>
                )}

                {/* Total footer */}
                {data.records?.length > 0 && (
                  <div className="text-right">
                    <span className="text-xs text-slate-500">Total: <strong className="text-slate-700">{data.records.length}</strong> hari tercatat</span>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};

export default AbsensiManagementPage;
