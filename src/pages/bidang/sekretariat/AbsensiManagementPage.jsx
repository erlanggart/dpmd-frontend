import React, { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import {
  FiSearch, FiFilter, FiChevronLeft, FiChevronRight,
  FiEdit2, FiTrash2, FiSettings, FiCalendar, FiClock,
  FiMapPin, FiCamera, FiUsers, FiX, FiSmartphone,
} from "react-icons/fi";
import { LuDownload } from "react-icons/lu";
import api from "../../../api";
import Swal from "sweetalert2";
import { useAuth } from "../../../context/AuthContext";

const STATUS_COLORS = {
  hadir: "bg-emerald-100 text-emerald-700",
  izin: "bg-amber-100 text-amber-700",
  sakit: "bg-red-100 text-red-700",
  alpha: "bg-gray-100 text-gray-700",
  cuti: "bg-blue-100 text-blue-700",
  dinas_luar: "bg-purple-100 text-purple-700",
  wfh: "bg-teal-100 text-teal-700",
  wfa: "bg-indigo-100 text-indigo-700",
};

const STATUS_LABELS = {
  hadir: "Hadir", izin: "Izin", sakit: "Sakit", alpha: "Alpha", cuti: "Cuti",
  dinas_luar: "Dinas Luar", wfh: "WFH", wfa: "WFA",
};

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

const AbsensiManagementPage = () => {
  const { user } = useAuth();

  // Hanya superadmin atau pegawai bidang Sekretariat (bidang_id=2) yang bisa akses
  if (user?.role !== 'superadmin' && Number(user?.bidang_id) !== 2) {
    return <Navigate to="/forbidden" replace />;
  }

  const [activeTab, setActiveTab] = useState("rekap");
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

  const fetchRekap = useCallback(async () => {
    try {
      setLoading(true);
      let url = "/absensi/admin/rekap?";
      if (filterMode === "harian") {
        url += `tanggal=${filterDate}`;
      } else {
        url += `bulan=${filterMonth}&tahun=${filterYear}`;
      }
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

  useEffect(() => {
    if (activeTab === "rekap") fetchRekap();
    else if (activeTab === "pegawai") fetchPegawai();
    else if (activeTab === "settings") fetchSettings();
  }, [activeTab, fetchRekap, fetchPegawai, fetchSettings]);

  const handleDeleteRecord = async (id) => {
    const confirm = await Swal.fire({
      title: "Hapus Data Absensi?",
      text: "Data yang dihapus tidak dapat dikembalikan",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonText: "Batal",
      confirmButtonText: "Hapus",
    });
    if (!confirm.isConfirmed) return;

    try {
      await api.delete(`/absensi/admin/${id}`);
      Swal.fire({ icon: "success", title: "Berhasil", text: "Data absensi berhasil dihapus", timer: 1500, showConfirmButton: false });
      fetchRekap();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Gagal", text: err.response?.data?.message || "Gagal menghapus data" });
    }
  };

  const handleUpdateRecord = async (id, data) => {
    try {
      await api.put(`/absensi/admin/${id}`, data);
      Swal.fire({ icon: "success", title: "Berhasil", text: "Data absensi berhasil diupdate", timer: 1500, showConfirmButton: false });
      setEditingRecord(null);
      fetchRekap();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Gagal", text: err.response?.data?.message || "Gagal update data" });
    }
  };

  const handleSaveSettings = async (newSettings) => {
    try {
      await api.put("/absensi/admin/settings", newSettings);
      Swal.fire({ icon: "success", title: "Berhasil", text: "Settings berhasil disimpan", timer: 1500, showConfirmButton: false });
      setShowSettingsModal(false);
      fetchSettings();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Gagal", text: err.response?.data?.message || "Gagal menyimpan settings" });
    }
  };

  // Device management for pegawai
  const handleSetDevice = async (user) => {
    if (user.device_id) {
      // Device already registered — show info with option to reset
      const result = await Swal.fire({
        title: "Device Absensi",
        html:
          `<p class="text-sm text-gray-600 mb-2">Pegawai: <strong>${user.pegawai?.nama_pegawai || user.name}</strong></p>` +
          `<p class="text-xs text-emerald-600 mb-1">✅ Device terdaftar</p>` +
          `<p class="text-[10px] text-gray-400 mb-3 break-all"><code>${user.device_id}</code></p>` +
          `<p class="text-xs text-gray-500">Device otomatis terdaftar saat pegawai login. Hapus jika pegawai ganti HP.</p>`,
        showCancelButton: true,
        cancelButtonText: "Tutup",
        confirmButtonText: "Hapus Device",
        confirmButtonColor: "#ef4444",
      });
      if (!result.isConfirmed) return;
      try {
        await api.put(`/absensi/admin/set-device/${user.id}`, { device_id: null });
        Swal.fire({ icon: "success", title: "Berhasil", text: "Device berhasil dihapus. Pegawai perlu login ulang untuk mendaftarkan device baru.", timer: 2000, showConfirmButton: false });
        fetchPegawai();
      } catch (err) {
        Swal.fire({ icon: "error", title: "Gagal", text: err.response?.data?.message || "Gagal menghapus device" });
      }
    } else {
      // Not registered — just inform
      Swal.fire({
        icon: "info",
        title: "Device Belum Terdaftar",
        html:
          `<p class="text-sm text-gray-600 mb-2">Pegawai: <strong>${user.pegawai?.nama_pegawai || user.name}</strong></p>` +
          `<p class="text-xs text-gray-500">Device akan otomatis terdaftar saat pegawai <b>login</b> atau membuka halaman <b>Absensi</b> dari HP-nya.</p>`,
        confirmButtonText: "OK",
      });
    }
  };

  const filteredRecords = records.filter((r) => {
    if (!searchQuery) return true;
    const name = r.user?.name || r.user?.pegawai?.nama_pegawai || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const rekapSummary = {
    total: filteredRecords.length,
    hadir: filteredRecords.filter((r) => r.status === "hadir").length,
    dinas_luar: filteredRecords.filter((r) => r.status === "dinas_luar").length,
    wfh: filteredRecords.filter((r) => r.status === "wfh").length,
    wfa: filteredRecords.filter((r) => r.status === "wfa").length,
    izin: filteredRecords.filter((r) => r.status === "izin").length,
    sakit: filteredRecords.filter((r) => r.status === "sakit").length,
    alpha: filteredRecords.filter((r) => r.status === "alpha").length,
    cuti: filteredRecords.filter((r) => r.status === "cuti").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800">Kelola Absensi</h1>
              <p className="text-sm text-gray-500 mt-0.5">Kelola data presensi pegawai</p>
            </div>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 border border-orange-200 rounded-xl text-sm font-semibold hover:bg-orange-100 transition-colors"
            >
              <FiSettings className="h-4 w-4" /> Pengaturan
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {[
              { key: "rekap", label: "Rekap Absensi", icon: FiCalendar },
              { key: "pegawai", label: "Daftar Pegawai", icon: FiUsers },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? "bg-white text-orange-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <tab.icon className="h-4 w-4" /> {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === "rekap" && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-xl border p-4 mb-4">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Mode Filter</label>
                  <select
                    value={filterMode}
                    onChange={(e) => setFilterMode(e.target.value)}
                    className="px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="harian">Harian</option>
                    <option value="bulanan">Bulanan</option>
                  </select>
                </div>
                {filterMode === "harian" ? (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Tanggal</label>
                    <input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Bulan</label>
                      <select
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                        className="px-3 py-2 border rounded-lg text-sm"
                      >
                        {["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"].map((m, i) => (
                          <option key={i} value={i + 1}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Tahun</label>
                      <input
                        type="number"
                        value={filterYear}
                        onChange={(e) => setFilterYear(parseInt(e.target.value))}
                        className="px-3 py-2 border rounded-lg text-sm w-24"
                      />
                    </div>
                  </>
                )}
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Cari Pegawai</label>
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Nama pegawai..."
                      className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <div key={key} className={`${STATUS_COLORS[key]} rounded-xl p-3 text-center`}>
                  <p className="text-xl font-bold">{rekapSummary[key] || 0}</p>
                  <p className="text-[10px] font-medium uppercase opacity-70">{label}</p>
                </div>
              ))}
            </div>

            {/* Records Table */}
            <div className="bg-white rounded-xl border overflow-hidden">
              {loading ? (
                <div className="flex justify-center items-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="text-center py-16">
                  <FiCalendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Tidak ada data absensi</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Pegawai</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Tanggal</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600">Masuk</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600">Keluar</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600">Jarak</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Keterangan</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-800">
                              {record.user?.pegawai?.nama_pegawai || record.user?.name || "-"}
                            </p>
                            <p className="text-xs text-gray-400">
                              {record.user?.pegawai?.jabatan || record.user?.pegawai?.status_kepegawaian?.replace(/_/g, " ") || ""}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {formatDate(record.tanggal)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[record.status]}`}>
                              {STATUS_LABELS[record.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-gray-700">
                            {formatTime(record.jam_masuk)}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-gray-700">
                            {formatTime(record.jam_keluar)}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-500">
                            {record.jarak_masuk != null ? `${record.jarak_masuk}m` : "-"}
                          </td>
                          <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                            {record.tujuan_dinas && <span className="text-purple-600">📍 {record.tujuan_dinas} </span>}
                            {record.keterangan || ""}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setEditingRecord(record)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <FiEdit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(record.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Hapus"
                              >
                                <FiTrash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "pegawai" && (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-800">Daftar Pegawai Wajib Absensi</h3>
              <p className="text-xs text-gray-500 mt-0.5">Pegawai dengan status PPPK Paruh Waktu, Tenaga Alih Daya, Tenaga Keamanan, Tenaga Kebersihan. Klik tombol device untuk mendaftarkan perangkat pegawai.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">No</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Nama</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Jabatan</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Device</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pegawai.map((p, i) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {p.pegawai?.nama_pegawai || p.name}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {p.pegawai?.jabatan || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {p.pegawai?.status_kepegawaian?.replace(/_/g, " ") || "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.device_id ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                            Terdaftar
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                            Belum
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleSetDevice(p)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            p.device_id
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                              : "bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200"
                          }`}
                          title={p.device_id ? "Kelola Device" : "Daftarkan Device"}
                        >
                          <FiSmartphone className="h-3.5 w-3.5" />
                          {p.device_id ? "Kelola" : "Daftarkan"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Edit Record Modal */}
      {editingRecord && (
        <EditAbsensiModal
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSave={handleUpdateRecord}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          settings={settings}
          onClose={() => setShowSettingsModal(false)}
          onSave={handleSaveSettings}
        />
      )}
    </div>
  );
};

// ─── Edit Absensi Modal ──────────────────────────────────────
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
      status,
      keterangan: keterangan || null,
      tujuan_dinas: status === "dinas_luar" ? tujuanDinas : null,
      jam_masuk: jamMasuk || null,
      jam_keluar: jamKeluar || null,
    });
    setSaving(false);
  };

  const nama = record.user?.pegawai?.nama_pegawai || record.user?.name || "-";

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h3 className="font-bold text-gray-800">Edit Absensi - {nama}</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
              <FiX className="h-5 w-5 text-gray-400" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Tanggal</label>
              <p className="text-sm text-gray-600">{formatDate(record.tanggal)}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Jam Masuk</label>
                <input type="time" value={jamMasuk} onChange={(e) => setJamMasuk(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Jam Keluar</label>
                <input type="time" value={jamKeluar} onChange={(e) => setJamKeluar(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>
            {status === "dinas_luar" && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tujuan Dinas</label>
                <input
                  type="text"
                  value={tujuanDinas}
                  onChange={(e) => setTujuanDinas(e.target.value)}
                  placeholder="Tujuan dinas luar..."
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Keterangan</label>
              <textarea
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Keterangan tambahan..."
                rows={2}
                className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
              />
            </div>
          </div>
          <div className="px-6 py-4 border-t flex gap-3">
            <button onClick={onClose} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg font-semibold hover:bg-gray-200">
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Settings Modal ──────────────────────────────────────────
const SettingsModal = ({ settings, onClose, onSave }) => {
  const [jamMasuk, setJamMasuk] = useState(settings.jam_masuk || "08:00");
  const [jamPulang, setJamPulang] = useState(settings.jam_pulang || "16:00");
  const [toleransi, setToleransi] = useState(settings.toleransi_terlambat || "15");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      jam_masuk: jamMasuk,
      jam_pulang: jamPulang,
      toleransi_terlambat: toleransi,
    });
    setSaving(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h3 className="font-bold text-gray-800">Pengaturan Absensi</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
              <FiX className="h-5 w-5 text-gray-400" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                <FiClock className="inline h-4 w-4 mr-1" /> Jam Masuk
              </label>
              <input
                type="time"
                value={jamMasuk}
                onChange={(e) => setJamMasuk(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">Jam mulai pegawai wajib hadir</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                <FiClock className="inline h-4 w-4 mr-1" /> Jam Pulang
              </label>
              <input
                type="time"
                value={jamPulang}
                onChange={(e) => setJamPulang(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">Jam pegawai diperbolehkan absen pulang</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Toleransi Terlambat (menit)</label>
              <input
                type="number"
                value={toleransi}
                onChange={(e) => setToleransi(e.target.value)}
                min="0"
                max="120"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">Menit toleransi setelah jam masuk</p>
            </div>
          </div>
          <div className="px-6 py-4 border-t flex gap-3">
            <button onClick={onClose} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg font-semibold hover:bg-gray-200">
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AbsensiManagementPage;
