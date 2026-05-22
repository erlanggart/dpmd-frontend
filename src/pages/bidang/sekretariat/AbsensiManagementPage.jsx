import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Navigate } from "react-router-dom";
import {
  FiSearch, FiEdit2, FiTrash2, FiCalendar, FiClock,
  FiUsers, FiX, FiSmartphone, FiImage, FiSave,
  FiToggleLeft, FiToggleRight, FiUpload, FiSettings,
  FiChevronDown, FiChevronLeft, FiChevronRight, FiFilter, FiArrowLeft, FiEye, FiUser, FiBell, FiSend,
} from "react-icons/fi";
import { LuDownload, LuRefreshCw, LuShieldCheck, LuWifi, LuWifiOff, LuLayoutGrid, LuList, LuFileSpreadsheet, LuChartColumn, LuLayoutDashboard, LuArrowUpDown, LuSlidersHorizontal } from "react-icons/lu";
import Lottie from "lottie-react";
import tableTennisAnimation from "../../../assets/table-tennis.json";
import api from "../../../api";
import { showAlert } from "../../../components/AlertPopup";
import { useAuth } from "../../../context/AuthContext";
import { getAvatarUrl } from "../../../utils/avatarUtils";

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

const POPUP_TYPE_LABELS = {
  masuk: "Absen Masuk", pulang: "Absen Pulang", wfh: "WFH",
  dinas_luar: "Dinas Luar", wfa: "WFA", izin: "Izin", sakit: "Sakit", cuti: "Cuti",
};

const POPUP_TYPE_COLORS = {
  masuk: "from-emerald-500 to-emerald-600", pulang: "from-blue-500 to-blue-600",
  wfh: "from-teal-500 to-teal-600", dinas_luar: "from-violet-500 to-violet-600",
  wfa: "from-indigo-500 to-indigo-600", izin: "from-amber-500 to-amber-600",
  sakit: "from-rose-500 to-rose-600", cuti: "from-sky-500 to-sky-600",
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

const getStorageUrl = (imagePath) => {
  if (!imagePath) return null;
  const base = import.meta.env.VITE_IMAGE_BASE_URL || "http://127.0.0.1:3001";
  // If path already starts with /storage/, just prepend base
  if (imagePath.startsWith('/storage/')) {
    return `${base}${imagePath}`;
  }
  return `${base}/storage/${imagePath}`;
};

const formatTelat = (menit) => {
  if (!menit || menit <= 0) return null;
  if (menit >= 60) {
    const jam = Math.floor(menit / 60);
    const m = menit % 60;
    return m > 0 ? `${jam}j ${m}m` : `${jam}j`;
  }
  return `${menit}m`;
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

// ─── Main Component ───────────────────────────────────────────
const getDateKey = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
};

const getDailyStatusTone = (status) => {
  if (!status) {
    return {
      box: "bg-white border-slate-200 text-slate-300",
      text: "text-slate-300",
      badge: "bg-slate-100 text-slate-400",
    };
  }
  if (PRESENT_STATUSES.includes(status)) {
    return {
      box: "bg-emerald-50 border-emerald-200 text-emerald-800 shadow-emerald-100/60",
      text: "text-emerald-700",
      badge: "bg-emerald-100 text-emerald-700",
    };
  }
  if (status === "alpha") {
    return {
      box: "bg-slate-50 border-slate-200 text-slate-700",
      text: "text-slate-700",
      badge: "bg-slate-200 text-slate-700",
    };
  }
  return {
    box: "bg-amber-50 border-amber-200 text-amber-800 shadow-amber-100/60",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-700",
  };
};

const formatDailyRecord = (record, { multiline = false } = {}) => {
  if (!record) return "-";
  const label = STATUS_MAP[record.status]?.label || record.status || "-";
  const masuk = formatTime(record.jam_masuk);
  const keluar = formatTime(record.jam_keluar);
  const hasTime = record.jam_masuk || record.jam_keluar;
  const timeText = hasTime ? `${masuk} - ${keluar}` : "";
  const telatText = record.telat_masuk_menit > 0 ? `Telat ${formatTelat(record.telat_masuk_menit)}` : "";

  if (multiline) {
    return [label, timeText, telatText].filter(Boolean);
  }
  return [label, timeText, telatText ? `(${telatText})` : ""].filter(Boolean).join(" ");
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
    else if (activeTab === "pegawai") fetchPegawai();
    else if (activeTab === "settings") fetchSettings();
    else if (activeTab === "popup") fetchPopupMessages();
    else if (activeTab === "reminder") fetchReminderTemplates();
  }, [activeTab, fetchDashboard, fetchRekap, fetchRekapPegawai, fetchPegawai, fetchSettings, fetchPopupMessages, fetchReminderTemplates]);

  // Refetch user history when period changes
  useEffect(() => {
    if (historyUser) fetchUserHistory(historyUser.id);
  }, [historyPeriode, filterMonth, filterYear, filterDate]); // eslint-disable-line

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab === "dashboard") await fetchDashboard();
    else if (activeTab === "rekap") await fetchRekap();
    else if (activeTab === "rekap-pegawai") await fetchRekapPegawai();
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

  const tabs = [
    { key: "dashboard", label: "Dashboard", icon: LuLayoutDashboard },
    { key: "rekap-pegawai", label: "Rekap Pegawai", icon: LuChartColumn },
    { key: "rekap", label: "Rekap Harian", icon: FiCalendar, count: records.length },
    { key: "pegawai", label: "Daftar Pegawai", icon: FiUsers, count: pegawai.length },
    { key: "popup", label: "Popup", icon: FiImage, count: popupMessages.length },
    { key: "reminder", label: "Reminder", icon: FiBell },
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

  const handleExportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const data = getExportData();
      const ws = XLSX.utils.json_to_sheet(data.map(d => ({
        "No": d.no, "Nama Pegawai": d.nama, "Jabatan": d.jabatan,
        "Tanggal": d.tanggal, "Status": d.status, "Jam Masuk": d.jamMasuk,
        "Jam Keluar": d.jamKeluar, "Jarak": d.jarak, "Keterangan": d.keterangan,
      })));
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

  const handleExportRekapPegawai = async () => {
    if (!rekapPegawaiData?.pegawai?.length) return;
    try {
      const XLSX = await import("xlsx");
      const dayHeaders = rekapCalendarDays.map((day) => day.label || `${String(day.day).padStart(2, "0")} ${day.day_label}`);
      const headers = [
        "No",
        "Nama Pegawai",
        "NIP",
        "Jabatan",
        ...dayHeaders,
        "Total Masuk",
        "Tidak Masuk",
        "Telat",
        "Total",
      ];

      const data = [
        headers,
        ...filteredRekapPegawai.map((p, i) => {
          const daily = p.daily || {};
          const masuk = PRESENT_STATUSES.reduce((sum, k) => sum + (p.summary?.[k] || 0), 0);
          const tidakMasuk = ABSENT_STATUSES.reduce((sum, k) => sum + (p.summary?.[k] || 0), 0);
          return [
            i + 1,
            p.user?.pegawai?.nama_pegawai || p.user?.name || "-",
            p.user?.pegawai?.nip || "-",
            p.user?.pegawai?.jabatan || p.user?.pegawai?.status_kepegawaian?.replace(/_/g, " ") || "-",
            ...rekapCalendarDays.map((day) => formatDailyRecord(daily[getDateKey(day.date)])),
            masuk,
            tidakMasuk,
            p.summary?.telat || 0,
            p.total_records || 0,
          ];
        }),
      ];

      if (filteredRekapPegawai.length) {
        const gs = rekapPegawaiData.global_summary || {};
        data.push([
          "",
          "TOTAL",
          "",
          "",
          ...rekapCalendarDays.map(() => ""),
          PRESENT_STATUSES.reduce((sum, k) => sum + (gs[k] || 0), 0),
          ABSENT_STATUSES.reduce((sum, k) => sum + (gs[k] || 0), 0),
          gs.telat || 0,
          gs.total || 0,
        ]);
      }

      const ws = XLSX.utils.aoa_to_sheet(data);
      ws["!cols"] = [
        { wch: 4 },
        { wch: 28 },
        { wch: 20 },
        { wch: 24 },
        ...rekapCalendarDays.map(() => ({ wch: 14 })),
        { wch: 12 },
        { wch: 12 },
        { wch: 8 },
        { wch: 8 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Rekap Pegawai");
      const fileName = `Rekap_Pegawai_${rekapPegawaiData.periode_label?.replace(/\s+/g, "_") || rekapPeriode}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert({ icon: "success", title: "Export Berhasil", text: `File ${fileName} berhasil diunduh`, timer: 2000 });
    } catch (err) {
      console.error("Export rekap pegawai error:", err);
      showAlert({ icon: "error", title: "Gagal Export", text: "Terjadi kesalahan saat mengexport Excel" });
    }
  };

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/30">
      {/* ═══ Hero Header ════════════════════════════════════ */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700" />
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/15 backdrop-blur-sm rounded-2xl border border-white/20">
                <LuShieldCheck className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Kelola Absensi</h1>
                <p className="text-orange-100 text-sm mt-1">Manajemen presensi pegawai DPMD</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleRefresh} disabled={refreshing}
                className="p-2.5 bg-white/15 backdrop-blur-sm text-white rounded-xl border border-white/20 hover:bg-white/25 transition-all disabled:opacity-50">
                <LuRefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={() => setShowSettingsModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/15 backdrop-blur-sm text-white rounded-xl border border-white/20 hover:bg-white/25 transition-all text-sm font-semibold">
                <FiSettings className="h-4 w-4" /> <span className="hidden sm:inline">Pengaturan</span>
              </button>
            </div>
          </div>

          {/* Tabs - Pill Style */}
          <div className="mt-6 flex gap-1.5 bg-black/10 backdrop-blur-sm p-1.5 rounded-2xl border border-white/10 max-w-fit">
            {tabs.map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  activeTab === tab.key
                    ? "bg-white text-orange-700 shadow-lg shadow-black/10"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}>
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {activeTab === tab.key && tab.count > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-100 text-orange-700">{tab.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ Main Content ═══════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 -mt-2">

        {/* ─── TAB: DASHBOARD ──────────────────────────────── */}
        {activeTab === "dashboard" && (
          <div className="space-y-5">
            {/* Period Selector */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4 sm:p-5">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex bg-slate-100 rounded-xl p-0.5">
                  {[
                    { key: "hari", label: "Hari Ini" },
                    { key: "minggu", label: "Minggu Ini" },
                    { key: "bulan", label: "Bulan Ini" },
                    { key: "tahun", label: "Tahun Ini" },
                  ].map(p => (
                    <button key={p.key} onClick={() => setDashboardPeriode(p.key)}
                      className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                        dashboardPeriode === p.key ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      }`}>{p.label}</button>
                  ))}
                </div>
                {(dashboardPeriode === 'hari' || dashboardPeriode === 'minggu') && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tanggal</label>
                    <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
                  </div>
                )}
                {dashboardPeriode === 'bulan' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Bulan</label>
                      <select value={filterMonth} onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400">
                        {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tahun</label>
                      <input type="number" value={filterYear} onChange={(e) => setFilterYear(parseInt(e.target.value))}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm w-24 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
                    </div>
                  </>
                )}
                {dashboardPeriode === 'tahun' && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tahun</label>
                    <input type="number" value={filterYear} onChange={(e) => setFilterYear(parseInt(e.target.value))}
                      className="px-3 py-2 border border-slate-200 rounded-xl text-sm w-24 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
                  </div>
                )}
              </div>
            </div>

            {dashboardLoading ? (
              <div className="flex flex-col justify-center items-center py-20 gap-3">
                <div className="relative h-12 w-12">
                  <div className="absolute inset-0 rounded-full border-4 border-orange-200" />
                  <div className="absolute inset-0 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
                </div>
                <p className="text-sm text-slate-400 font-medium">Memuat dashboard...</p>
              </div>
            ) : dashboardData ? (
              <>
                {/* Hero Card - Kehadiran */}
                {dashboardPeriode === 'hari' && (() => {
                  const s = dashboardData.summary || {};
                  const totalMasuk = PRESENT_STATUSES.reduce((sum, k) => sum + (s[k] || 0), 0);
                  const totalTidakMasuk = ABSENT_STATUSES.reduce((sum, k) => sum + (s[k] || 0), 0);
                  const totalBelum = dashboardData.belum_absen?.length || 0;
                  const totalPegawai = totalMasuk + totalTidakMasuk + totalBelum;
                  const pct = totalPegawai > 0 ? Math.round((totalMasuk / totalPegawai) * 100) : 0;
                  return (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Kehadiran Hari Ini</p>
                          <div className="flex items-baseline gap-1.5 mt-2">
                            <span className="text-4xl sm:text-5xl font-black text-slate-800 tabular-nums">{totalMasuk}</span>
                            <span className="text-xl text-slate-300 font-light">/</span>
                            <span className="text-xl text-slate-400 font-semibold tabular-nums">{totalPegawai}</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1.5">pegawai masuk hari ini</p>
                          {/* Breakdown masuk */}
                          <div className="flex flex-wrap gap-2 mt-3">
                            {PRESENT_STATUSES.map(k => {
                              const count = s[k] || 0;
                              if (count === 0) return null;
                              const st = STATUS_MAP[k];
                              const c = colorMap[st.color];
                              return (
                                <span key={k} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${c.badge}`}>
                                  {st.icon} {st.label} {count}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="7" />
                            <circle cx="50" cy="50" r="42" fill="none" stroke="url(#pctGrad)" strokeWidth="7" strokeLinecap="round"
                              strokeDasharray={`${pct * 2.64} 264`} className="transition-all duration-700" />
                            <defs><linearGradient id="pctGrad"><stop offset="0%" stopColor="#f97316"/><stop offset="100%" stopColor="#f59e0b"/></linearGradient></defs>
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xl font-black text-slate-700">{pct}<span className="text-xs font-bold">%</span></span>
                          </div>
                        </div>
                      </div>
                      {/* Mini summary: masuk vs tidak masuk vs belum */}
                      {totalPegawai > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100">
                            {totalMasuk > 0 && <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${(totalMasuk / totalPegawai) * 100}%` }} />}
                            {totalTidakMasuk > 0 && <div className="bg-amber-400 transition-all duration-500" style={{ width: `${(totalTidakMasuk / totalPegawai) * 100}%` }} />}
                            {totalBelum > 0 && <div className="bg-red-300 transition-all duration-500" style={{ width: `${(totalBelum / totalPegawai) * 100}%` }} />}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"/><span className="text-[11px] text-slate-500">Masuk <strong className="text-slate-700">{totalMasuk}</strong></span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-400"/><span className="text-[11px] text-slate-500">Izin/Sakit/Cuti <strong className="text-slate-700">{totalTidakMasuk}</strong></span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-300"/><span className="text-[11px] text-slate-500">Belum Absen <strong className="text-slate-700">{totalBelum}</strong></span></div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Total Masuk / Tidak Masuk overview for non-hari modes */}
                {dashboardPeriode !== 'hari' && (() => {
                  const s = dashboardData.summary || {};
                  const totalMasuk = PRESENT_STATUSES.reduce((sum, k) => sum + (s[k] || 0), 0);
                  const totalTidakMasuk = ABSENT_STATUSES.reduce((sum, k) => sum + (s[k] || 0), 0);
                  const total = s.total || 0;
                  return total > 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Ringkasan Kehadiran</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="flex items-center gap-3 bg-emerald-50 rounded-xl p-3.5 ring-1 ring-emerald-200">
                          <div className="w-11 h-11 bg-emerald-500 rounded-xl flex items-center justify-center text-white text-xl font-black shrink-0">✓</div>
                          <div>
                            <p className="text-3xl font-black text-emerald-700 leading-none tabular-nums">{totalMasuk}</p>
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-0.5">Total Masuk</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 bg-amber-50 rounded-xl p-3.5 ring-1 ring-amber-200">
                          <div className="w-11 h-11 bg-amber-400 rounded-xl flex items-center justify-center text-white text-xl font-black shrink-0">!</div>
                          <div>
                            <p className="text-3xl font-black text-amber-700 leading-none tabular-nums">{totalTidakMasuk}</p>
                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mt-0.5">Tidak Masuk</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3.5 ring-1 ring-slate-200 col-span-2 sm:col-span-1">
                          <div className="w-11 h-11 bg-slate-500 rounded-xl flex items-center justify-center text-white text-xl font-black shrink-0">#</div>
                          <div>
                            <p className="text-3xl font-black text-slate-700 leading-none tabular-nums">{total}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Total Rekap</p>
                          </div>
                        </div>
                      </div>
                      {/* Bar */}
                      <div className="mt-3 flex h-2.5 rounded-full overflow-hidden bg-slate-100">
                        {totalMasuk > 0 && <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${(totalMasuk / total) * 100}%` }} />}
                        {totalTidakMasuk > 0 && <div className="bg-amber-400 transition-all duration-500" style={{ width: `${(totalTidakMasuk / total) * 100}%` }} />}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                        {PRESENT_STATUSES.map(k => {
                          const count = s[k] || 0;
                          if (count === 0) return null;
                          const st = STATUS_MAP[k];
                          const c = colorMap[st.color];
                          return (
                            <div key={k} className="flex items-center gap-1.5">
                              <span className="text-sm">{st.icon}</span>
                              <span className="text-[11px] text-slate-500">{st.label} <strong className="text-slate-700">{count}</strong></span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                  {Object.entries(STATUS_MAP).map(([key, { label, color, icon }]) => {
                    const c = colorMap[color];
                    const count = dashboardData.summary?.[key] || 0;
                    return (
                      <button key={key} onClick={() => { setActiveTab("rekap"); setFilterStatus(key); }}
                        className={`flex items-center gap-2.5 rounded-xl p-3 sm:p-3.5 ${c.bg} ring-1 ${c.ring} transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer text-left`}>
                        <span className="text-xl sm:text-2xl leading-none shrink-0">{icon}</span>
                        <div className="min-w-0">
                          <p className="text-lg sm:text-xl font-black text-slate-800 leading-none tabular-nums">{count}</p>
                          <p className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${c.text} mt-0.5 truncate`}>{label}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Telat Alert */}
                {(dashboardData.summary?.telat || 0) > 0 && (
                  <button onClick={() => { setActiveTab("rekap"); setFilterStatus("telat"); }}
                    className="w-full bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5 flex items-center justify-between hover:bg-amber-100/60 hover:shadow-md transition-all cursor-pointer text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                        <FiClock className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-bold text-amber-800 text-sm">Pegawai Terlambat</p>
                        <p className="text-[11px] text-amber-600">Masuk melebihi batas waktu + toleransi</p>
                      </div>
                    </div>
                    <span className="text-2xl font-black text-amber-700 tabular-nums">{dashboardData.summary.telat}</span>
                  </button>
                )}

                {/* Belum Absen Section (hanya untuk mode harian) */}
                {dashboardPeriode === 'hari' && dashboardData.belum_absen?.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-red-200/60 overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-red-100 bg-red-50/30">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                          <FiUsers className="h-4 w-4 text-red-500" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-red-700 text-sm">Belum Absen Hari Ini</h3>
                          <p className="text-[11px] text-red-400">Pegawai yang belum melakukan presensi</p>
                        </div>
                        <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full tabular-nums">{dashboardData.belum_absen.length}</span>
                      </div>
                    </div>
                    <div className="p-4 flex flex-wrap gap-2">
                      {dashboardData.belum_absen.map((u) => (
                        <div key={u.id} className="flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 bg-white border border-red-200 rounded-full hover:shadow-sm transition-all">
                          <div className="w-7 h-7 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-[10px] font-bold">
                            {(u.pegawai?.nama_pegawai || u.name || "?")[0].toUpperCase()}
                          </div>
                          <span className="text-xs font-semibold text-slate-700">{u.pegawai?.nama_pegawai || u.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grouped by Status */}
                <div className="space-y-3">
                  {Object.entries(STATUS_MAP)
                    .filter(([sk]) => (dashboardData.grouped?.[sk] || []).length > 0)
                    .sort((a, b) => (dashboardData.grouped?.[b[0]]?.length || 0) - (dashboardData.grouped?.[a[0]]?.length || 0))
                    .map(([statusKey, { label, color, icon, gradient }]) => {
                    const people = dashboardData.grouped[statusKey];
                    return (
                      <div key={statusKey} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                        <div className={`px-5 py-3 bg-gradient-to-r ${gradient} flex items-center justify-between`}>
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">{icon}</span>
                            <span className="text-white font-bold">{label}</span>
                          </div>
                          <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-bold tabular-nums">{people.length} orang</span>
                        </div>
                        <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                          {people.map((r) => (
                            <div key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50 transition-colors">
                              <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center text-[11px] font-bold text-slate-500 shrink-0">
                                {(r.user?.pegawai?.nama_pegawai || r.user?.name || "?")[0].toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-700 text-sm truncate">{r.user?.pegawai?.nama_pegawai || r.user?.name || "-"}</p>
                                <p className="text-[11px] text-slate-400 truncate">{r.user?.pegawai?.jabatan || "-"}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {r.telat_masuk_menit > 0 && (
                                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">Telat {formatTelat(r.telat_masuk_menit)}</span>
                                )}
                                {r.jam_masuk && (
                                  <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{formatTime(r.jam_masuk)}</span>
                                )}
                                {r.tujuan_dinas && (
                                  <span className="text-[11px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md truncate max-w-[120px]">📍 {r.tujuan_dinas}</span>
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
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-12 text-center">
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

        {/* ─── TAB: REKAP PEGAWAI ─────────────────────────── */}
        {activeTab === "rekap-pegawai" && (
          <div className="space-y-5">
            {/* Period Selector */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4 sm:p-5">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex bg-slate-100 rounded-xl p-0.5">
                  {[
                    { key: "minggu", label: "Mingguan" },
                    { key: "bulan", label: "Bulanan" },
                    { key: "tahun", label: "Tahunan" },
                  ].map(p => (
                    <button key={p.key} onClick={() => setRekapPeriode(p.key)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                        rekapPeriode === p.key ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      }`}>{p.label}</button>
                  ))}
                </div>
                {rekapPeriode === 'minggu' && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tanggal Referensi</label>
                    <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
                  </div>
                )}
                {rekapPeriode === 'bulan' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Bulan</label>
                      <select value={filterMonth} onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400">
                        {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tahun</label>
                      <input type="number" value={filterYear} onChange={(e) => setFilterYear(parseInt(e.target.value))}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm w-24 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
                    </div>
                  </>
                )}
                {rekapPeriode === 'tahun' && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tahun</label>
                    <input type="number" value={filterYear} onChange={(e) => setFilterYear(parseInt(e.target.value))}
                      className="px-3 py-2 border border-slate-200 rounded-xl text-sm w-24 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
                  </div>
                )}
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Cari Pegawai</label>
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input type="text" value={rekapSearch} onChange={(e) => setRekapSearch(e.target.value)}
                      placeholder="Ketik nama..."
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
                  </div>
                </div>
              </div>
            </div>

            {rekapLoading ? (
              <div className="flex flex-col justify-center items-center py-20 gap-3">
                <div className="relative h-12 w-12">
                  <div className="absolute inset-0 rounded-full border-4 border-orange-200" />
                  <div className="absolute inset-0 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
                </div>
                <p className="text-sm text-slate-400 font-medium">Memuat rekap pegawai...</p>
              </div>
            ) : rekapPegawaiData ? (
              <>
                {/* Periode Label + Global Summary */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">Periode: {rekapPegawaiData.periode_label}</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">{rekapPegawaiData.total_pegawai} pegawai terdaftar</p>
                    </div>
                    <button onClick={handleExportRekapPegawai} disabled={!rekapPegawaiData?.pegawai?.length}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-all text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed">
                      <LuFileSpreadsheet className="h-4 w-4" /> Ekspor Excel
                    </button>
                  </div>
                  {/* Total Masuk highlight */}
                  {(() => {
                    const gs = rekapPegawaiData.global_summary || {};
                    const totalMasuk = PRESENT_STATUSES.reduce((sum, k) => sum + (gs[k] || 0), 0);
                    const totalTidakMasuk = ABSENT_STATUSES.reduce((sum, k) => sum + (gs[k] || 0), 0);
                    return (
                      <div className="grid grid-cols-2 gap-2.5 mb-3">
                        <div className="flex items-center gap-3 bg-emerald-50 rounded-xl p-3 ring-1 ring-emerald-200">
                          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white text-lg font-black shrink-0">✓</div>
                          <div>
                            <p className="text-2xl font-black text-emerald-700 leading-none tabular-nums">{totalMasuk}</p>
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-0.5">Total Masuk</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 bg-amber-50 rounded-xl p-3 ring-1 ring-amber-200">
                          <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center text-white text-lg font-black shrink-0">!</div>
                          <div>
                            <p className="text-2xl font-black text-amber-700 leading-none tabular-nums">{totalTidakMasuk}</p>
                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mt-0.5">Tidak Masuk</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                    {Object.entries(STATUS_MAP).map(([key, { label, color, icon }]) => {
                      const c = colorMap[color];
                      const count = rekapPegawaiData.global_summary?.[key] || 0;
                      return (
                        <div key={key} className={`flex items-center gap-2 rounded-xl p-2.5 ${c.bg} ring-1 ${c.ring}`}>
                          <span className="text-lg leading-none shrink-0">{icon}</span>
                          <div className="min-w-0">
                            <p className="text-lg font-black text-slate-800 leading-none tabular-nums">{count}</p>
                            <p className={`text-[9px] font-bold uppercase tracking-wider ${c.text} truncate`}>{label}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Monthly Calendar Recap */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 bg-white">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h3 className="font-black text-slate-800 text-sm">Kalender Presensi Bulanan</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Setiap kolom hari kerja menampilkan jam masuk dan jam keluar per pegawai
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                        <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-700">Hadir/WFH/WFA/DL</span>
                        <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-700">Izin/Sakit/Cuti/Alpha</span>
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-500">Belum ada data</span>
                      </div>
                    </div>
                  </div>

                  {rekapCalendarDays.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-max text-sm border-separate border-spacing-0">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="sticky left-0 z-20 bg-slate-50 text-left px-4 py-3.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest min-w-[230px] border-r border-slate-200">
                              Pegawai
                            </th>
                            {rekapCalendarDays.map((day) => (
                              <th key={day.date} className="px-2 py-3 text-center min-w-[76px] border-r border-slate-100">
                                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{day.day_label}</div>
                                <div className="mt-1 mx-auto h-6 min-w-6 px-2 rounded-lg bg-orange-100 text-orange-700 inline-flex items-center justify-center text-[11px] font-black tabular-nums">
                                  {String(day.day).padStart(2, "0")}
                                </div>
                              </th>
                            ))}
                            <th className="px-3 py-3.5 text-center min-w-[76px] font-bold text-[11px] text-emerald-600 uppercase tracking-widest">Masuk</th>
                            <th className="px-3 py-3.5 text-center min-w-[86px] font-bold text-[11px] text-amber-600 uppercase tracking-widest">Tidak Masuk</th>
                            <th className="px-3 py-3.5 text-center min-w-[72px] font-bold text-[11px] text-slate-500 uppercase tracking-widest">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRekapPegawai.map((p) => {
                            const masuk = PRESENT_STATUSES.reduce((sum, k) => sum + (p.summary?.[k] || 0), 0);
                            const tidakMasuk = ABSENT_STATUSES.reduce((sum, k) => sum + (p.summary?.[k] || 0), 0);
                            return (
                              <tr key={p.user.id} className="group">
                                <td className="sticky left-0 z-10 bg-white group-hover:bg-orange-50/40 px-4 py-3.5 min-w-[230px] border-r border-b border-slate-100">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                                      {(p.user?.pegawai?.nama_pegawai || p.user?.name || "?")[0].toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-bold text-slate-800 text-sm truncate">{p.user?.pegawai?.nama_pegawai || p.user?.name || "-"}</p>
                                      <p className="text-[11px] text-slate-400 truncate">{p.user?.pegawai?.jabatan || p.user?.pegawai?.status_kepegawaian?.replace(/_/g, " ") || "-"}</p>
                                    </div>
                                  </div>
                                </td>
                                {rekapCalendarDays.map((day) => {
                                  const record = p.daily?.[getDateKey(day.date)];
                                  const tone = getDailyStatusTone(record?.status);
                                  const lines = formatDailyRecord(record, { multiline: true });
                                  return (
                                    <td key={`${p.user.id}-${day.date}`} className="px-1.5 py-2 border-b border-slate-100">
                                      <div className={`h-[58px] w-[68px] mx-auto rounded-lg border ${tone.box} flex flex-col items-center justify-center text-center leading-tight shadow-sm`}>
                                        {record ? (
                                          <>
                                            <span className={`text-[9px] font-black uppercase ${tone.text}`}>{lines[0]}</span>
                                            {lines[1] && <span className="mt-0.5 text-[10px] font-mono font-bold text-slate-700">{lines[1]}</span>}
                                            {lines[2] && <span className={`mt-1 px-1.5 py-0.5 rounded text-[8px] font-black ${tone.badge}`}>{lines[2]}</span>}
                                          </>
                                        ) : (
                                          <span className="text-sm font-bold text-slate-300">-</span>
                                        )}
                                      </div>
                                    </td>
                                  );
                                })}
                                <td className="px-3 py-3.5 text-center border-b border-slate-100">
                                  <span className="inline-flex items-center justify-center min-w-[34px] h-8 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-black tabular-nums">{masuk}</span>
                                </td>
                                <td className="px-3 py-3.5 text-center border-b border-slate-100">
                                  <span className="inline-flex items-center justify-center min-w-[34px] h-8 rounded-lg bg-amber-100 text-amber-700 text-xs font-black tabular-nums">{tidakMasuk}</span>
                                </td>
                                <td className="px-3 py-3.5 text-center border-b border-slate-100">
                                  <button onClick={() => openUserHistory(p.user)}
                                    className="inline-flex items-center justify-center w-8 h-8 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 transition-all"
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
                      <p className="text-sm font-semibold text-slate-600">Kalender harian tersedia untuk periode bulanan.</p>
                      <p className="text-xs text-slate-400 mt-1">Pilih tab Bulanan untuk melihat format kalender selama 1 bulan.</p>
                    </div>
                  )}

                  <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <p className="text-xs text-slate-500">Total: <strong className="text-slate-700">{filteredRekapPegawai.length}</strong> pegawai</p>
                    <p className="text-xs text-slate-400">{rekapCalendarDays.length} hari kerja</p>
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
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4 sm:p-5">
              <div className="flex flex-wrap items-end gap-3">
                {/* Filter Mode Toggle */}
                <div className="flex bg-slate-100 rounded-xl p-0.5">
                  {["harian", "bulanan"].map(m => (
                    <button key={m} onClick={() => setFilterMode(m)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                        filterMode === m ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      }`}>{m}</button>
                  ))}
                </div>

                {filterMode === "harian" ? (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tanggal</label>
                    <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all" />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Bulan</label>
                      <select value={filterMonth} onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400">
                        {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tahun</label>
                      <input type="number" value={filterYear} onChange={(e) => setFilterYear(parseInt(e.target.value))}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm w-24 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
                    </div>
                  </>
                )}

                <div className="flex-1 min-w-[180px]">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Cari Pegawai</label>
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Ketik nama pegawai..."
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all" />
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Urutkan</label>
                  <div className="relative">
                    <LuArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                      className="pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 appearance-none bg-white transition-all">
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
                <div className="flex bg-slate-100 rounded-xl p-0.5">
                  <button onClick={() => setViewMode("table")}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    <LuList className="h-4 w-4" />
                  </button>
                  <button onClick={() => setViewMode("card")}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'card' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    <LuLayoutGrid className="h-4 w-4" />
                  </button>
                </div>

                {/* Export Button */}
                <button onClick={handleExportExcel} disabled={filteredRecords.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200 hover:bg-emerald-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  <LuFileSpreadsheet className="h-4 w-4" /> Excel
                </button>
              </div>
            </div>

            {/* ══ Quick Filter Chips ══ */}
            <div className="flex flex-wrap gap-2">
              {/* Semua */}
              <button onClick={() => setFilterStatus("semua")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all duration-200 ${
                  filterStatus === "semua"
                    ? "bg-slate-800 text-white border-slate-800 shadow-md shadow-slate-300/50 scale-[1.02]"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}>
                <LuSlidersHorizontal className="h-3.5 w-3.5" />
                Semua
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums ${filterStatus === "semua" ? "bg-white/20" : "bg-slate-100"}`}>
                  {rekapSummary.total}
                </span>
              </button>

              {/* Divider */}
              <div className="w-px h-8 bg-slate-200 self-center mx-0.5" />

              {/* Masuk Group */}
              <button onClick={() => setFilterStatus("masuk")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all duration-200 ${
                  filterStatus === "masuk"
                    ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-300/50 scale-[1.02]"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-100"
                }`}>
                ✓ Masuk
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums ${filterStatus === "masuk" ? "bg-white/20" : "bg-emerald-100"}`}>
                  {rekapSummary.masuk}
                </span>
              </button>

              {/* Tidak Masuk Group */}
              <button onClick={() => setFilterStatus("tidak_masuk")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all duration-200 ${
                  filterStatus === "tidak_masuk"
                    ? "bg-red-500 text-white border-red-500 shadow-md shadow-red-300/50 scale-[1.02]"
                    : "bg-red-50 text-red-700 border-red-200 hover:border-red-300 hover:bg-red-100"
                }`}>
                ✗ Tidak Masuk
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums ${filterStatus === "tidak_masuk" ? "bg-white/20" : "bg-red-100"}`}>
                  {rekapSummary.tidak_masuk}
                </span>
              </button>

              {/* Terlambat */}
              {rekapSummary.telat > 0 && (
                <button onClick={() => setFilterStatus("telat")}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all duration-200 ${
                    filterStatus === "telat"
                      ? "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-300/50 scale-[1.02]"
                      : "bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-300 hover:bg-amber-100"
                  }`}>
                  <FiClock className="h-3.5 w-3.5" /> Terlambat
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums ${filterStatus === "telat" ? "bg-white/20" : "bg-amber-100"}`}>
                    {rekapSummary.telat}
                  </span>
                </button>
              )}

              {/* Divider */}
              <div className="w-px h-8 bg-slate-200 self-center mx-0.5" />

              {/* Individual Status */}
              {Object.entries(STATUS_MAP).map(([key, { label, color, icon }]) => {
                const count = rekapSummary[key] || 0;
                const isActive = filterStatus === key;
                const c = colorMap[color];
                return (
                  <button key={key} onClick={() => setFilterStatus(prev => prev === key ? "semua" : key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all duration-200 ${
                      isActive
                        ? `${c.badge} border-current shadow-md scale-[1.02]`
                        : `bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50 ${count === 0 ? "opacity-40" : ""}`
                    }`}
                    disabled={count === 0 && !isActive}>
                    <span className="text-sm leading-none">{icon}</span>
                    <span className="hidden sm:inline">{label}</span>
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums ${isActive ? "bg-black/10" : "bg-slate-100"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ══ Active Filter Info Bar ══ */}
            {filterStatus !== "semua" && (
              <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <FiFilter className="h-3.5 w-3.5 text-orange-500" />
                  <span className="text-xs text-orange-700 font-semibold">
                    Filter aktif: <strong className="text-orange-800">
                      {filterStatus === "masuk" ? "Masuk (Hadir+WFH+WFA+Dinas Luar)" :
                       filterStatus === "tidak_masuk" ? "Tidak Masuk (Izin+Sakit+Alpha+Cuti)" :
                       filterStatus === "telat" ? "Terlambat" :
                       STATUS_MAP[filterStatus]?.label || filterStatus}
                    </strong>
                  </span>
                  <span className="text-[11px] text-orange-500">— {filteredRecords.length} dari {rekapSummary.total} data</span>
                </div>
                <button onClick={() => setFilterStatus("semua")}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-orange-600 bg-orange-100 hover:bg-orange-200 rounded-lg transition-colors">
                  <FiX className="h-3 w-3" /> Hapus Filter
                </button>
              </div>
            )}

            {/* ══ Records Content ══ */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
              {loading ? (
                <div className="flex flex-col justify-center items-center py-20 gap-3">
                  <div className="relative h-12 w-12">
                    <div className="absolute inset-0 rounded-full border-4 border-orange-200" />
                    <div className="absolute inset-0 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
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
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-orange-50 text-orange-600 border border-orange-200 rounded-xl text-xs font-bold hover:bg-orange-100 transition-all">
                      <FiX className="h-3 w-3" /> Hapus Filter
                    </button>
                  )}
                </div>
              ) : viewMode === "table" ? (
                /* ── TABLE VIEW ── */
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200 sticky top-0 z-10">
                        <th className="text-left px-4 py-3.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest w-[30%]">Pegawai</th>
                        <th className="text-left px-3 py-3.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Tanggal</th>
                        <th className="text-center px-3 py-3.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Status</th>
                        <th className="text-center px-3 py-3.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Jam Masuk</th>
                        <th className="text-center px-3 py-3.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Jam Keluar</th>
                        <th className="text-center px-3 py-3.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Jarak</th>
                        <th className="text-left px-3 py-3.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Keterangan</th>
                        {canManageAbsensiRecords && (
                          <th className="text-center px-3 py-3.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest w-20">Aksi</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedRecords.map((record) => {
                        const st = STATUS_MAP[record.status] || STATUS_MAP.alpha;
                        const c = colorMap[st.color];
                        const avatarUrl = getAvatarUrl(record.user?.avatar);
                        return (
                          <tr key={record.id} className="hover:bg-orange-50/30 transition-colors group">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {avatarUrl ? (
                                  <img src={avatarUrl} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0 ring-2 ring-white shadow-sm" />
                                ) : (
                                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${st.gradient} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}>
                                    {(record.user?.pegawai?.nama_pegawai || record.user?.name || "?")[0].toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-800 text-sm truncate">{record.user?.pegawai?.nama_pegawai || record.user?.name || "-"}</p>
                                  <p className="text-[11px] text-slate-400 truncate">{record.user?.pegawai?.jabatan || record.user?.pegawai?.status_kepegawaian?.replace(/_/g, " ") || ""}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-slate-600 whitespace-nowrap text-xs">{formatDate(record.tanggal)}</td>
                            <td className="px-3 py-3 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${c.badge}`}>
                                <span className="text-xs">{st.icon}</span> {st.label}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <div className="inline-flex flex-col items-center gap-0.5">
                                <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">{formatTime(record.jam_masuk)}</span>
                                {record.telat_masuk_menit > 0 && (
                                  <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md animate-pulse">
                                    ⏰ Telat {formatTelat(record.telat_masuk_menit)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">{formatTime(record.jam_keluar)}</span>
                            </td>
                            <td className="px-3 py-3 text-center text-xs text-slate-500">
                              {record.jarak_masuk != null ? (
                                <span className={`font-mono ${record.jarak_masuk > 100 ? "text-amber-600 font-bold" : "text-slate-500"}`}>
                                  {record.jarak_masuk}m
                                </span>
                              ) : "-"}
                            </td>
                            <td className="px-3 py-3 text-slate-500 max-w-[200px] text-xs">
                              <div className="truncate">
                                {record.tujuan_dinas && <span className="text-purple-600 font-medium">📍 {record.tujuan_dinas} </span>}
                                {record.keterangan || ""}
                              </div>
                            </td>
                            {canManageAbsensiRecords && (
                              <td className="px-3 py-3 text-center">
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
                      <div key={record.id} className={`rounded-2xl border-2 p-4 hover:shadow-lg transition-all duration-300 relative group ${
                        record.telat_masuk_menit > 0 ? "border-amber-200 bg-amber-50/30" : "border-slate-200 hover:border-orange-200"
                      }`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0 ring-2 ring-white shadow-sm" />
                            ) : (
                              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${st.gradient} flex items-center justify-center text-white text-lg font-bold shadow-sm`}>
                                {(record.user?.pegawai?.nama_pegawai || record.user?.name || "?")[0].toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 text-sm truncate">{record.user?.pegawai?.nama_pegawai || record.user?.name || "-"}</p>
                              <p className="text-[11px] text-slate-400">{formatDate(record.tanggal)}</p>
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${c.badge}`}>{st.icon} {st.label}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs bg-slate-50 rounded-xl p-2.5">
                          <div className="flex items-center gap-1.5 text-slate-600">
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
                        {record.telat_masuk_menit > 0 && (
                          <div className="mt-2 flex items-center gap-1.5 text-amber-700 bg-amber-100 rounded-lg px-2.5 py-1.5">
                            <FiClock className="h-3 w-3 animate-pulse" />
                            <span className="text-[11px] font-bold">Terlambat {formatTelat(record.telat_masuk_menit)}</span>
                          </div>
                        )}
                        {(record.tujuan_dinas || record.keterangan) && (
                          <p className="mt-2 text-[11px] text-slate-400 truncate">
                            {record.tujuan_dinas && <span className="text-purple-500 font-medium">📍 {record.tujuan_dinas} </span>}
                            {record.keterangan || ""}
                          </p>
                        )}
                        {canManageAbsensiRecords && (
                          <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <button onClick={() => setEditingRecord(record)} className="p-1.5 bg-white text-blue-600 hover:bg-blue-50 rounded-lg shadow-md border border-slate-200">
                              <FiEdit2 className="h-3 w-3" />
                            </button>
                            <button onClick={() => handleDeleteRecord(record.id)} className="p-1.5 bg-white text-red-500 hover:bg-red-50 rounded-lg shadow-md border border-slate-200">
                              <FiTrash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Pagination Footer ── */}
              {!loading && filteredRecords.length > 0 && (
                <div className="px-5 py-3.5 border-t border-slate-100 bg-gradient-to-r from-slate-50/50 to-white flex items-center justify-between gap-4">
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
                                ? "bg-orange-500 text-white shadow-sm shadow-orange-200"
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
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-100 rounded-xl">
                  <FiUsers className="h-5 w-5 text-orange-600" />
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
                  <div key={p.id} className="flex items-center gap-4 p-3.5 rounded-xl border border-slate-200 hover:border-orange-200 hover:shadow-sm transition-all group">
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
                  <div className="absolute inset-0 rounded-full border-4 border-orange-200" />
                  <div className="absolute inset-0 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
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
                  const colors = POPUP_TYPE_COLORS[type];
                  return (
                    <div key={type}
                      className={`bg-white rounded-2xl shadow-sm border-2 transition-all duration-300 overflow-hidden ${
                        isEditing ? "border-orange-400 shadow-orange-100" : "border-slate-200/60 hover:shadow-md hover:border-slate-300"
                      }`}>
                      {/* Card Header */}
                      <div className={`bg-gradient-to-r ${colors} px-4 py-3 flex items-center justify-between`}>
                        <div className="flex items-center gap-2.5">
                          <span className="text-white font-bold text-sm">{POPUP_TYPE_LABELS[type]}</span>
                          {msg.is_active ? (
                            <span className="bg-white/25 text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Aktif</span>
                          ) : (
                            <span className="bg-black/25 text-white/60 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Off</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => togglePopupActive(msg)}
                            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white" title={msg.is_active ? "Nonaktifkan" : "Aktifkan"}>
                            {msg.is_active ? <FiToggleRight className="h-5 w-5" /> : <FiToggleLeft className="h-5 w-5" />}
                          </button>
                          {!isEditing && (
                            <button onClick={() => startPopupEdit(msg)} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white">
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
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Gambar Popup</label>
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
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Judul</label>
                              <input type="text" value={popupEditForm.title} onChange={(e) => setPopupEditForm(f => ({ ...f, title: e.target.value }))}
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" placeholder="Judul popup..." />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Pesan</label>
                              <textarea value={popupEditForm.message} onChange={(e) => setPopupEditForm(f => ({ ...f, message: e.target.value }))}
                                rows={3} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 resize-none" placeholder="Pesan popup..." />
                            </div>
                            <div className="flex gap-2 justify-end pt-1">
                              <button onClick={cancelPopupEdit} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50 font-semibold transition-all">Batal</button>
                              <button onClick={handlePopupSave} disabled={popupSaving}
                                className="px-5 py-2 text-sm bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 font-bold shadow-sm shadow-orange-200 transition-all disabled:opacity-50 flex items-center gap-1.5">
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
                  <div className="absolute inset-0 rounded-full border-4 border-orange-200" />
                  <div className="absolute inset-0 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
                </div>
                <p className="text-sm text-slate-400 font-medium">Memuat template...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reminderTemplates.map((tmpl) => {
                  const isEditing = reminderEditingType === tmpl.type;
                  const isMasuk = tmpl.type === 'reminder_masuk';
                  const colors = isMasuk ? 'from-emerald-500 to-green-600' : 'from-blue-500 to-indigo-600';
                  const label = isMasuk ? 'Reminder Masuk' : 'Reminder Pulang';
                  const desc = isMasuk
                    ? `Dikirim 5 menit sebelum jam masuk (${settings.jam_masuk || '08:00'} WIB)`
                    : `Dikirim 5 menit sebelum jam pulang (${settings.jam_pulang || '16:00'} WIB)`;

                  return (
                    <div key={tmpl.type}
                      className={`bg-white rounded-2xl shadow-sm border-2 transition-all duration-300 overflow-hidden ${
                        isEditing ? "border-orange-400 shadow-orange-100" : "border-slate-200/60 hover:shadow-md hover:border-slate-300"
                      }`}>
                      {/* Card Header */}
                      <div className={`bg-gradient-to-r ${colors} px-4 py-3 flex items-center justify-between`}>
                        <div className="flex items-center gap-2.5">
                          <FiBell className="h-4 w-4 text-white" />
                          <div>
                            <span className="text-white font-bold text-sm">{label}</span>
                            <p className="text-white/70 text-[10px]">{desc}</p>
                          </div>
                          {tmpl.is_active ? (
                            <span className="bg-white/25 text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Aktif</span>
                          ) : (
                            <span className="bg-black/25 text-white/60 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Off</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={async () => {
                            try {
                              await api.put(`/absensi/admin/reminder-templates/${tmpl.type}`, { is_active: !tmpl.is_active });
                              await fetchReminderTemplates();
                            } catch { showAlert({ icon: "error", title: "Gagal", text: "Gagal mengubah status" }); }
                          }}
                            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white" title={tmpl.is_active ? "Nonaktifkan" : "Aktifkan"}>
                            {tmpl.is_active ? <FiToggleRight className="h-5 w-5" /> : <FiToggleLeft className="h-5 w-5" />}
                          </button>
                          {!isEditing && (
                            <button onClick={() => {
                              setReminderEditingType(tmpl.type);
                              setReminderEditForm({ title: tmpl.title || '', message: tmpl.message || '', is_active: tmpl.is_active });
                            }} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white">
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
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Judul Notifikasi</label>
                              <input type="text" value={reminderEditForm.title} onChange={(e) => setReminderEditForm(f => ({ ...f, title: e.target.value }))}
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" placeholder="Judul notifikasi..." />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Pesan Notifikasi</label>
                              <textarea value={reminderEditForm.message} onChange={(e) => setReminderEditForm(f => ({ ...f, message: e.target.value }))}
                                rows={3} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 resize-none" placeholder="Pesan notifikasi..." />
                            </div>
                            <div className="flex gap-2 justify-end pt-1">
                              <button onClick={() => { setReminderEditingType(null); setReminderEditForm({ title: "", message: "", is_active: true }); }}
                                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50 font-semibold transition-all">Batal</button>
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
                                className="px-5 py-2 text-sm bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 font-bold shadow-sm shadow-orange-200 transition-all disabled:opacity-50 flex items-center gap-1.5">
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
      </div>

      {/* ═══ Modals ═════════════════════════════════════════ */}
      {canManageAbsensiRecords && editingRecord && (
        <EditAbsensiModal record={editingRecord} onClose={() => setEditingRecord(null)} onSave={handleUpdateRecord} />
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
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-lg">Edit Absensi</h3>
              <p className="text-orange-100 text-sm">{nama}</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors text-white">
              <FiX className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-slate-50 rounded-xl px-4 py-2.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tanggal</p>
              <p className="text-sm font-semibold text-slate-700">{formatDate(record.tanggal)}</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400">
                {Object.entries(STATUS_MAP).map(([key, { label, icon }]) => (
                  <option key={key} value={key}>{icon} {label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Jam Masuk</label>
                <input type="time" value={jamMasuk} onChange={(e) => setJamMasuk(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Jam Keluar</label>
                <input type="time" value={jamKeluar} onChange={(e) => setJamKeluar(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
              </div>
            </div>

            {status === "dinas_luar" && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tujuan Dinas</label>
                <input type="text" value={tujuanDinas} onChange={(e) => setTujuanDinas(e.target.value)}
                  placeholder="Tujuan dinas luar..." className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Keterangan</label>
              <textarea value={keterangan} onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Keterangan tambahan..." rows={2}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 bg-white text-slate-600 rounded-xl font-semibold border border-slate-200 hover:bg-slate-50 transition-all">Batal</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold shadow-sm shadow-orange-200 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 transition-all">
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
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/15 rounded-xl">
                <FiSettings className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white">Pengaturan Absensi</h3>
                <p className="text-slate-300 text-xs">Atur jam masuk, pulang & toleransi</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors text-white">
              <FiX className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Jam Buka & Tutup Absensi */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  <FiClock className="inline h-3 w-3 mr-1" />Jam Buka Absen
                </label>
                <input type="time" value={jamBukaAbsen} onChange={(e) => setJamBukaAbsen(e.target.value)}
                  className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm font-mono text-center font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
                <p className="text-[10px] text-slate-400 mt-1.5 text-center">Absen bisa dimulai</p>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  <FiClock className="inline h-3 w-3 mr-1" />Jam Tutup Absen
                </label>
                <input type="time" value={jamTutupAbsen} onChange={(e) => setJamTutupAbsen(e.target.value)}
                  className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm font-mono text-center font-bold focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
                <p className="text-[10px] text-slate-400 mt-1.5 text-center">Absen ditutup</p>
              </div>
            </div>

            {/* Jam Masuk & Pulang */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  <FiClock className="inline h-3 w-3 mr-1" />Jam Masuk
                </label>
                <input type="time" value={jamMasuk} onChange={(e) => setJamMasuk(e.target.value)}
                  className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm font-mono text-center font-bold focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
                <p className="text-[10px] text-slate-400 mt-1.5 text-center">Wajib hadir</p>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  <FiClock className="inline h-3 w-3 mr-1" />Jam Pulang
                </label>
                <input type="time" value={jamPulang} onChange={(e) => setJamPulang(e.target.value)}
                  className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm font-mono text-center font-bold focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
                <p className="text-[10px] text-slate-400 mt-1.5 text-center">Boleh pulang</p>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Toleransi Terlambat (menit)</label>
              <div className="relative">
                <input type="number" value={toleransi} onChange={(e) => setToleransi(e.target.value)} min="0" max="120"
                  className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm font-mono font-bold text-center focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 text-center">Menit dispensasi setelah jam masuk</p>
            </div>

            {/* Preview */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200/50">
              <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-2">Preview Konfigurasi</p>
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
            <button onClick={onClose} className="flex-1 py-2.5 bg-white text-slate-600 rounded-xl font-semibold border border-slate-200 hover:bg-slate-50 transition-all">Batal</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold shadow-sm shadow-orange-200 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 transition-all">
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
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-5 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white text-xl font-bold border border-white/10">
                  {nama[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{nama}</h3>
                  <p className="text-orange-100 text-sm">{jabatan}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!loading && data && (
                  <div className="hidden sm:flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10">
                    <span className="text-white/70 text-xs">Kehadiran</span>
                    <span className="text-white font-black text-lg tabular-nums">{pct}%</span>
                  </div>
                )}
                <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white">
                  <FiX className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Period Filter */}
          <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex bg-slate-100 rounded-xl p-0.5">
                {[
                  { key: "minggu", label: "Mingguan" },
                  { key: "bulan", label: "Bulanan" },
                ].map(p => (
                  <button key={p.key} onClick={() => onPeriodeChange(p.key)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      periode === p.key ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}>{p.label}</button>
                ))}
              </div>
              {periode === 'minggu' && (
                <input type="date" value={filterDate} onChange={(e) => onFilterDateChange(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
              )}
              {periode === 'bulan' && (
                <>
                  <select value={filterMonth} onChange={(e) => onFilterMonthChange(parseInt(e.target.value))}
                    className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400">
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                  <input type="number" value={filterYear} onChange={(e) => onFilterYearChange(parseInt(e.target.value))}
                    className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm w-24 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
                </>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {loading ? (
              <div className="flex flex-col justify-center items-center py-16 gap-3">
                <div className="relative h-10 w-10">
                  <div className="absolute inset-0 rounded-full border-4 border-orange-200" />
                  <div className="absolute inset-0 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
                </div>
                <p className="text-sm text-slate-400">Memuat riwayat...</p>
              </div>
            ) : data ? (
              <>
                {/* Total Masuk / Tidak Masuk Overview */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 bg-emerald-50 rounded-xl p-3.5 ring-1 ring-emerald-200">
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white text-lg font-black shrink-0">✓</div>
                    <div>
                      <p className="text-2xl font-black text-emerald-700 leading-none tabular-nums">{totalMasuk}</p>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-0.5">Total Masuk</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-amber-50 rounded-xl p-3.5 ring-1 ring-amber-200">
                    <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center text-white text-lg font-black shrink-0">!</div>
                    <div>
                      <p className="text-2xl font-black text-amber-700 leading-none tabular-nums">{totalAbsen - totalMasuk}</p>
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mt-0.5">Tidak Masuk</p>
                    </div>
                  </div>
                </div>

                {/* Summary Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  {Object.entries(STATUS_MAP).map(([key, { label, color, icon }]) => {
                    const c = colorMap[color];
                    const count = data.summary?.[key] || 0;
                    return (
                      <div key={key} className={`flex items-center gap-2 rounded-xl p-2.5 ${c.bg} ring-1 ${c.ring}`}>
                        <span className="text-lg leading-none shrink-0">{icon}</span>
                        <div className="min-w-0">
                          <p className="text-lg font-black text-slate-800 leading-none tabular-nums">{count}</p>
                          <p className={`text-[9px] font-bold uppercase tracking-wider ${c.text} truncate`}>{label}</p>
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
                          <th className="text-left px-4 py-3 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Tanggal</th>
                          <th className="text-center px-3 py-3 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Status</th>
                          <th className="text-center px-3 py-3 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Masuk</th>
                          <th className="text-center px-3 py-3 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Keluar</th>
                          <th className="text-center px-3 py-3 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Jarak</th>
                          <th className="text-left px-3 py-3 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.records.map((r) => {
                          const st = STATUS_MAP[r.status] || STATUS_MAP.alpha;
                          const c = colorMap[st.color];
                          return (
                            <tr key={r.id} className="hover:bg-orange-50/30 transition-colors">
                              <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{formatDate(r.tanggal)}</td>
                              <td className="text-center px-3 py-3">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${c.badge}`}>
                                  {st.icon} {st.label}
                                </span>
                              </td>
                              <td className="text-center px-3 py-3">
                                <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">{formatTime(r.jam_masuk)}</span>
                                {r.telat_masuk_menit > 0 && (
                                  <span className="ml-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md">Telat {formatTelat(r.telat_masuk_menit)}</span>
                                )}
                              </td>
                              <td className="text-center px-3 py-3">
                                <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">{formatTime(r.jam_keluar)}</span>
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
