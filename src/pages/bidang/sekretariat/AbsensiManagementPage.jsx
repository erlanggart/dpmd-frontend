import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Navigate } from "react-router-dom";
import {
  FiSearch, FiEdit2, FiTrash2, FiCalendar, FiClock,
  FiUsers, FiX, FiSmartphone, FiImage, FiSave,
  FiToggleLeft, FiToggleRight, FiUpload, FiSettings,
  FiChevronDown, FiFilter, FiArrowLeft, FiEye, FiUser,
} from "react-icons/fi";
import { LuDownload, LuRefreshCw, LuShieldCheck, LuWifi, LuWifiOff, LuLayoutGrid, LuList, LuFileSpreadsheet, LuChartColumn, LuLayoutDashboard } from "react-icons/lu";
import Lottie from "lottie-react";
import tableTennisAnimation from "../../../assets/table-tennis.json";
import api from "../../../api";
import { showAlert } from "../../../components/AlertPopup";
import { useAuth } from "../../../context/AuthContext";

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
const AbsensiManagementPage = () => {
  const { user } = useAuth();

  if (user?.role !== 'superadmin' && Number(user?.bidang_id) !== 2) {
    return <Navigate to="/forbidden" replace />;
  }

  // Maintenance mode: hanya superadmin yang bisa akses kelola absensi
  if (user?.role !== 'superadmin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-4">
        <div className="text-center max-w-lg">
          <div className="mb-2">
            <span className="inline-block px-4 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold tracking-wide">
              🏓 Maintenance Mode
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-3">
            Maaf, Kita Sedang Main
          </h1>
         
          <div className="w-72 md:w-96 mx-auto">
            <Lottie animationData={tableTennisAnimation} loop autoplay />
          </div>
        </div>
      </div>
    );
  }

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
  const [filterStatus, setFilterStatus] = useState("semua"); // semua or specific status

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
  }, [activeTab, fetchDashboard, fetchRekap, fetchRekapPegawai, fetchPegawai, fetchSettings, fetchPopupMessages]);

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
    setRefreshing(false);
  };

  // ─── CRUD Handlers ────────────────────────────────────────
  const handleDeleteRecord = async (id) => {
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
  const filteredRecords = useMemo(() => records.filter((r) => {
    if (filterStatus !== "semua" && r.status !== filterStatus) return false;
    if (!searchQuery) return true;
    const name = r.user?.name || r.user?.pegawai?.nama_pegawai || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  }), [records, searchQuery, filterStatus]);

  const rekapSummary = useMemo(() => {
    const s = { total: filteredRecords.length };
    Object.keys(STATUS_MAP).forEach(k => { s[k] = filteredRecords.filter(r => r.status === k).length; });
    return s;
  }, [filteredRecords]);

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
                  const totalAbsen = dashboardData.summary?.total || 0;
                  const totalBelum = dashboardData.belum_absen?.length || 0;
                  const totalPegawai = totalAbsen + totalBelum;
                  const pct = totalPegawai > 0 ? Math.round((totalAbsen / totalPegawai) * 100) : 0;
                  return (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Kehadiran Hari Ini</p>
                          <div className="flex items-baseline gap-1.5 mt-2">
                            <span className="text-4xl sm:text-5xl font-black text-slate-800 tabular-nums">{totalAbsen}</span>
                            <span className="text-xl text-slate-300 font-light">/</span>
                            <span className="text-xl text-slate-400 font-semibold tabular-nums">{totalPegawai}</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1.5">pegawai sudah tercatat</p>
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
                    </div>
                  );
                })()}

                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                  {Object.entries(STATUS_MAP).map(([key, { label, color, icon }]) => {
                    const c = colorMap[color];
                    const count = dashboardData.summary?.[key] || 0;
                    return (
                      <div key={key} className={`flex items-center gap-2.5 rounded-xl p-3 sm:p-3.5 ${c.bg} ring-1 ${c.ring} transition-all hover:shadow-sm`}>
                        <span className="text-xl sm:text-2xl leading-none shrink-0">{icon}</span>
                        <div className="min-w-0">
                          <p className="text-lg sm:text-xl font-black text-slate-800 leading-none tabular-nums">{count}</p>
                          <p className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${c.text} mt-0.5 truncate`}>{label}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Telat Alert */}
                {(dashboardData.summary?.telat || 0) > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5 flex items-center justify-between">
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
                  </div>
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
                  </div>
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

                {/* Per User Recap Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                          <th className="text-left px-4 py-3.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Pegawai</th>
                          <th className="text-left px-4 py-3.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Rekap Presensi</th>
                          <th className="text-center px-3 py-3.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest w-16">Total</th>
                          <th className="text-center px-3 py-3.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest w-20">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(rekapPegawaiData.pegawai || [])
                          .filter(p => {
                            if (!rekapSearch) return true;
                            const name = p.user?.pegawai?.nama_pegawai || p.user?.name || "";
                            return name.toLowerCase().includes(rekapSearch.toLowerCase());
                          })
                          .map((p) => (
                          <tr key={p.user.id} className="hover:bg-orange-50/30 transition-colors group">
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                                  {(p.user?.pegawai?.nama_pegawai || p.user?.name || "?")[0].toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-800 text-sm truncate">{p.user?.pegawai?.nama_pegawai || p.user?.name || "-"}</p>
                                  <p className="text-[11px] text-slate-400 truncate">{p.user?.pegawai?.jabatan || p.user?.pegawai?.status_kepegawaian?.replace(/_/g, " ") || "-"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex flex-wrap gap-1.5">
                                {Object.entries(STATUS_MAP).map(([key, { label, icon, color }]) => {
                                  const count = p.summary?.[key] || 0;
                                  if (count === 0) return null;
                                  const c = colorMap[color];
                                  return (
                                    <span key={key} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${c.badge}`} title={label}>
                                      <span className="text-xs">{icon}</span> {count}
                                    </span>
                                  );
                                })}
                                {(p.summary?.telat || 0) > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-700" title="Telat">
                                    <FiClock className="h-3 w-3" /> {p.summary.telat}x telat
                                  </span>
                                )}
                                {p.total_records === 0 && <span className="text-xs text-slate-300 italic">Belum ada data</span>}
                              </div>
                            </td>
                            <td className="text-center px-3 py-3.5">
                              <span className="inline-flex items-center justify-center min-w-[32px] h-8 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold tabular-nums">
                                {p.total_records}
                              </span>
                            </td>
                            <td className="text-center px-3 py-3.5">
                              <button onClick={() => openUserHistory(p.user)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg text-[11px] font-bold border border-orange-200 transition-all">
                                <FiEye className="h-3.5 w-3.5" /> Detail
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {rekapPegawaiData.pegawai?.length > 0 && (
                    <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                      <p className="text-xs text-slate-500">Total: <strong className="text-slate-700">{rekapPegawaiData.pegawai.length}</strong> pegawai</p>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ─── TAB: REKAP ──────────────────────────────────── */}
        {activeTab === "rekap" && (
          <div className="space-y-5">
            {/* Filter Bar */}
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
                      placeholder="Ketik nama..."
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all" />
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Status</label>
                  <div className="relative">
                    <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                      className="pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 appearance-none bg-white transition-all">
                      <option value="semua">Semua</option>
                      {Object.entries(STATUS_MAP).map(([key, { label }]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
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
                <div className="flex gap-1.5 ml-auto">
                  <button onClick={handleExportExcel} disabled={filteredRecords.length === 0}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200 hover:bg-emerald-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    <LuFileSpreadsheet className="h-4 w-4" /> Excel
                  </button>
                </div>
              </div>
            </div>

            {/* Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              {Object.entries(STATUS_MAP).map(([key, { label, color, icon }]) => {
                const c = colorMap[color];
                const count = rekapSummary[key] || 0;
                return (
                  <div key={key} className={`flex items-center gap-2.5 rounded-xl p-3 ${c.bg} ring-1 ${c.ring} transition-all hover:shadow-sm`}>
                    <span className="text-xl leading-none shrink-0">{icon}</span>
                    <div className="min-w-0">
                      <p className="text-lg sm:text-xl font-black text-slate-800 leading-none tabular-nums">{count}</p>
                      <p className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${c.text} mt-0.5 truncate`}>{label}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Records Content */}
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
                  <p className="text-slate-400 text-sm mt-1">Ubah filter untuk melihat data lain</p>
                </div>
              ) : viewMode === "table" ? (
                /* TABLE VIEW */
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                        <th className="text-left px-4 py-3.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Pegawai</th>
                        <th className="text-left px-4 py-3.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Tanggal</th>
                        <th className="text-center px-4 py-3.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Status</th>
                        <th className="text-center px-4 py-3.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Masuk</th>
                        <th className="text-center px-4 py-3.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Keluar</th>
                        <th className="text-center px-4 py-3.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Jarak</th>
                        <th className="text-left px-4 py-3.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Keterangan</th>
                        <th className="text-center px-4 py-3.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRecords.map((record) => {
                        const st = STATUS_MAP[record.status] || STATUS_MAP.alpha;
                        const c = colorMap[st.color];
                        return (
                          <tr key={record.id} className="hover:bg-orange-50/30 transition-colors group">
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center text-base shrink-0`}>
                                  {st.icon}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-800 truncate">{record.user?.pegawai?.nama_pegawai || record.user?.name || "-"}</p>
                                  <p className="text-[11px] text-slate-400 truncate">{record.user?.pegawai?.jabatan || record.user?.pegawai?.status_kepegawaian?.replace(/_/g, " ") || ""}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap text-xs">{formatDate(record.tanggal)}</td>
                            <td className="px-4 py-3.5 text-center">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold ${c.badge}`}>
                                {st.label}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">{formatTime(record.jam_masuk)}</span>
                              {record.telat_masuk_menit > 0 && (
                                <span className="ml-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md">Telat {formatTelat(record.telat_masuk_menit)}</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">{formatTime(record.jam_keluar)}</span>
                            </td>
                            <td className="px-4 py-3.5 text-center text-xs text-slate-500">
                              {record.jarak_masuk != null ? `${record.jarak_masuk}m` : "-"}
                            </td>
                            <td className="px-4 py-3.5 text-slate-500 max-w-[200px] truncate text-xs">
                              {record.tujuan_dinas && <span className="text-purple-600 font-medium">📍 {record.tujuan_dinas} </span>}
                              {record.keterangan || ""}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setEditingRecord(record)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title="Edit">
                                  <FiEdit2 className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => handleDeleteRecord(record.id)}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors" title="Hapus">
                                  <FiTrash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* CARD VIEW */
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredRecords.map((record) => {
                    const st = STATUS_MAP[record.status] || STATUS_MAP.alpha;
                    const c = colorMap[st.color];
                    return (
                      <div key={record.id} className={`rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all hover:border-orange-200 relative group`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${st.gradient} flex items-center justify-center text-white text-lg shadow-sm`}>
                              {st.icon}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 text-sm truncate">{record.user?.pegawai?.nama_pegawai || record.user?.name || "-"}</p>
                              <p className="text-[11px] text-slate-400">{formatDate(record.tanggal)}</p>
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${c.badge}`}>{st.label}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <FiClock className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="font-mono font-semibold">{formatTime(record.jam_masuk)}</span>
                            {record.telat_masuk_menit > 0 && (
                              <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md">Telat {formatTelat(record.telat_masuk_menit)}</span>
                            )}
                          </div>
                          <span className="text-slate-300">→</span>
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <FiClock className="h-3.5 w-3.5 text-blue-500" />
                            <span className="font-mono font-semibold">{formatTime(record.jam_keluar)}</span>
                          </div>
                          {record.jarak_masuk != null && (
                            <span className="text-slate-400 ml-auto">{record.jarak_masuk}m</span>
                          )}
                        </div>
                        {(record.tujuan_dinas || record.keterangan) && (
                          <p className="mt-2 text-[11px] text-slate-400 truncate">
                            {record.tujuan_dinas && <span className="text-purple-500">📍 {record.tujuan_dinas} </span>}
                            {record.keterangan || ""}
                          </p>
                        )}
                        {/* Hover Actions */}
                        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingRecord(record)} className="p-1.5 bg-white text-blue-600 hover:bg-blue-50 rounded-lg shadow-sm border border-slate-200">
                            <FiEdit2 className="h-3 w-3" />
                          </button>
                          <button onClick={() => handleDeleteRecord(record.id)} className="p-1.5 bg-white text-red-500 hover:bg-red-50 rounded-lg shadow-sm border border-slate-200">
                            <FiTrash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Footer Count */}
              {!loading && filteredRecords.length > 0 && (
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <p className="text-xs text-slate-500">Menampilkan <strong className="text-slate-700">{filteredRecords.length}</strong> data</p>
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
      </div>

      {/* ═══ Modals ═════════════════════════════════════════ */}
      {editingRecord && (
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
  const totalHadir = data?.summary?.hadir || 0;
  const pct = totalAbsen > 0 ? Math.round((totalHadir / totalAbsen) * 100) : 0;

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
