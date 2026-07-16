import React, { useState, useEffect, useCallback, useMemo } from "react";
import { MapContainer, Marker, Circle, TileLayer, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  FiMapPin, FiPlus, FiX, FiTrash2, FiEdit2, FiSearch, FiCrosshair,
  FiCalendar, FiSave, FiInfo, FiToggleLeft, FiToggleRight,
} from "react-icons/fi";
import { LuRefreshCw } from "react-icons/lu";
import api from "../../../api";
import { showAlert } from "../../../components/AlertPopup";

// Marker default Leaflet tidak muncul tanpa ini (bundler tidak ikut membawa asetnya).
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const KANTOR = { lat: -6.47553948391432, lng: 106.8276556221009 };
const RADIUS_DEFAULT = 500;

const FORM_KOSONG = {
  user_id: "",
  latitude: "",
  longitude: "",
  radius_meter: RADIUS_DEFAULT,
  berlaku_mulai: "",
  berlaku_sampai: "",
};

const STATUS_CHIP = {
  berlaku: { label: "Berlaku", cls: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  belum_mulai: { label: "Belum Mulai", cls: "bg-sky-50 text-sky-600 border-sky-200" },
  kedaluwarsa: { label: "Kedaluwarsa", cls: "bg-amber-50 text-amber-600 border-amber-200" },
  nonaktif: { label: "Nonaktif", cls: "bg-slate-100 text-slate-500 border-slate-200" },
};

/** Klik peta untuk memindahkan titik. */
const PemilihTitik = ({ onPilih }) => {
  useMapEvents({
    click(e) {
      onPilih(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

/** Geser peta saat koordinat diubah lewat input teks. */
const PusatkanPeta = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (Number.isFinite(lat) && Number.isFinite(lng)) map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
};

const LokasiKhususTab = () => {
  const [items, setItems] = useState([]);
  const [pegawaiList, setPegawaiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(FORM_KOSONG);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/absensi/admin/lokasi-khusus", { params: q.trim() ? { q: q.trim() } : {} });
      if (res.data.success) setItems(res.data.data || []);
    } catch (error) {
      console.error("Error memuat lokasi khusus:", error);
      showAlert({ icon: "error", title: "Gagal", text: "Tidak bisa memuat daftar lokasi khusus" });
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    const t = setTimeout(fetchData, 350);
    return () => clearTimeout(t);
  }, [fetchData]);

  useEffect(() => {
    const muatPegawai = async () => {
      try {
        const res = await api.get("/absensi/admin/pegawai-absensi");
        const data = res.data?.data;
        if (Array.isArray(data)) setPegawaiList(data);
      } catch (error) {
        console.error("Error memuat pegawai:", error);
      }
    };
    muatPegawai();
  }, []);

  const bukaTambah = () => {
    setEditId(null);
    setForm({ ...FORM_KOSONG, latitude: KANTOR.lat, longitude: KANTOR.lng });
    setModalOpen(true);
  };

  const bukaEdit = (item) => {
    setEditId(item.id);
    setForm({
      user_id: item.user_id,
      latitude: item.latitude,
      longitude: item.longitude,
      radius_meter: item.radius_meter,
      berlaku_mulai: item.berlaku_mulai || "",
      berlaku_sampai: item.berlaku_sampai || "",
    });
    setModalOpen(true);
  };

  const pilihTitik = (lat, lng) => {
    setForm((f) => ({ ...f, latitude: Number(lat.toFixed(7)), longitude: Number(lng.toFixed(7)) }));
  };

  const pakaiLokasiSaya = () => {
    if (!navigator.geolocation) {
      showAlert({ icon: "error", title: "Tidak didukung", text: "Perangkat ini tidak mendukung GPS" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => pilihTitik(pos.coords.latitude, pos.coords.longitude),
      () => showAlert({ icon: "error", title: "Gagal", text: "Tidak bisa mengambil lokasi. Izinkan akses lokasi di browser." }),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const simpan = async (e) => {
    e.preventDefault();

    if (!editId && !form.user_id) {
      showAlert({ icon: "error", title: "Belum lengkap", text: "Pilih pegawai terlebih dahulu" });
      return;
    }

    try {
      setSaving(true);
      const body = {
        latitude: form.latitude,
        longitude: form.longitude,
        radius_meter: form.radius_meter,
        berlaku_mulai: form.berlaku_mulai || "",
        berlaku_sampai: form.berlaku_sampai || "",
      };

      const res = editId
        ? await api.put(`/absensi/admin/lokasi-khusus/${editId}`, body)
        : await api.post("/absensi/admin/lokasi-khusus", { ...body, user_id: form.user_id });

      if (res.data.success) {
        showAlert({ icon: "success", title: "Tersimpan", text: res.data.message, timer: 2200 });
        setModalOpen(false);
        fetchData();
      }
    } catch (error) {
      showAlert({
        icon: "error",
        title: "Gagal menyimpan",
        text: error.response?.data?.message || "Terjadi kesalahan",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleAktif = async (item) => {
    try {
      await api.put(`/absensi/admin/lokasi-khusus/${item.id}`, { is_active: !item.is_active });
      fetchData();
    } catch (error) {
      showAlert({ icon: "error", title: "Gagal", text: error.response?.data?.message || "Tidak bisa mengubah status" });
    }
  };

  const hapus = async (item) => {
    const konfirm = await showAlert({
      icon: "warning",
      title: "Hapus titik lokasi?",
      text: `Titik ${item.koordinat} untuk ${item.pegawai.nama} akan dihapus. Pegawai tidak bisa lagi absen reguler dari titik ini. Riwayat absensi yang sudah ada tetap tersimpan.`,
      showCancel: true,
      confirmText: "Hapus",
      cancelText: "Batal",
    });
    if (!konfirm?.isConfirmed) return;

    try {
      await api.delete(`/absensi/admin/lokasi-khusus/${item.id}`);
      showAlert({ icon: "success", title: "Terhapus", timer: 1600 });
      fetchData();
    } catch (error) {
      showAlert({ icon: "error", title: "Gagal", text: error.response?.data?.message || "Tidak bisa menghapus" });
    }
  };

  const lat = parseFloat(form.latitude);
  const lng = parseFloat(form.longitude);
  const titikValid = Number.isFinite(lat) && Number.isFinite(lng);

  const jarakKeKantor = useMemo(() => {
    if (!titikValid) return null;
    const R = 6371000;
    const dLat = ((lat - KANTOR.lat) * Math.PI) / 180;
    const dLng = ((lng - KANTOR.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((KANTOR.lat * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }, [lat, lng, titikValid]);

  const labelInput = "block text-xs font-semibold text-slate-600 mb-1.5";
  const gayaInput =
    "w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm";

  return (
    <div className="space-y-4">
      {/* Penjelasan singkat: fitur ini jarang dipakai, admin perlu konteksnya */}
      <div className="bg-cyan-50 border border-cyan-100 rounded-2xl p-4 flex gap-3">
        <FiInfo className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-slate-600 leading-relaxed">
          <p className="font-semibold text-slate-700 mb-1">Titik absen reguler di luar kantor</p>
          Untuk pegawai yang bertugas rutin di luar kantor tapi absensinya tetap{" "}
          <strong>reguler</strong> (bukan WFH/WFA/dinas luar). Pegawai yang diberi titik di sini{" "}
          <strong>tetap bisa absen dari kantor</strong> seperti biasa — titik ini sifatnya menambah.
        </div>
      </div>

      {/* Aksi */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama pegawai..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 text-sm"
          />
        </div>
        <button
          onClick={fetchData}
          className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
          title="Muat ulang"
        >
          <LuRefreshCw className={`w-4 h-4 text-slate-500 ${loading ? "animate-spin" : ""}`} />
        </button>
        <button
          onClick={bukaTambah}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-cyan-500/25 hover:shadow-xl transition"
        >
          <FiPlus className="w-4 h-4" />
          Tambah Titik
        </button>
      </div>

      {/* Daftar */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-9 h-9 border-[3px] border-cyan-200 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 text-center py-14 px-4">
          <FiMapPin className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">
            {q ? "Tidak ada yang cocok" : "Belum ada titik lokasi khusus"}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {q ? "Coba kata kunci lain." : "Semua pegawai saat ini hanya bisa absen reguler dari kantor DPMD."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((item) => {
            const chip = STATUS_CHIP[item.status_berlaku] || STATUS_CHIP.berlaku;
            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border p-4 transition ${
                  item.berlaku_hari_ini ? "border-slate-100" : "border-slate-100 opacity-70"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate">{item.pegawai.nama}</p>
                    <p className="text-xs text-slate-400 truncate">{item.pegawai.jabatan || item.pegawai.email}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border flex-shrink-0 ${chip.cls}`}>
                    {chip.label}
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                  {/* Titik tidak bernama — koordinat inilah identitasnya */}
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <FiMapPin className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                    <span className="font-mono font-semibold truncate">{item.koordinat}</span>
                    <span className="text-xs text-slate-400 flex-shrink-0">radius {item.radius_meter} m</span>
                  </div>

                  <a
                    href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-[11px] text-cyan-600 hover:underline"
                  >
                    Lihat di Google Maps
                  </a>

                  {(item.berlaku_mulai || item.berlaku_sampai) && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <FiCalendar className="w-3.5 h-3.5" />
                      {item.berlaku_mulai || "kapan pun"} s.d. {item.berlaku_sampai || "tanpa batas"}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => toggleAktif(item)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-lg transition"
                  >
                    {item.is_active ? (
                      <FiToggleRight className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <FiToggleLeft className="w-4 h-4 text-slate-400" />
                    )}
                    {item.is_active ? "Aktif" : "Nonaktif"}
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => bukaEdit(item)}
                    className="p-2 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition"
                    title="Edit"
                  >
                    <FiEdit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => hapus(item)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Hapus"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal form */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[1000]">
          <form
            onSubmit={simpan}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white flex items-center justify-between p-5 border-b border-slate-100 z-10">
              <h3 className="font-bold text-slate-800">
                {editId ? "Edit Titik Lokasi" : "Tambah Titik Lokasi Khusus"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition"
              >
                <FiX className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className={labelInput}>
                  Pegawai <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.user_id}
                  onChange={(e) => setForm((f) => ({ ...f, user_id: e.target.value }))}
                  disabled={Boolean(editId)}
                  className={`${gayaInput} disabled:bg-slate-100 disabled:text-slate-400`}
                >
                  <option value="">— Pilih Pegawai —</option>
                  {pegawaiList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.pegawai?.nama_pegawai || p.name}
                      {p.pegawai?.jabatan ? ` — ${p.pegawai.jabatan}` : ""}
                    </option>
                  ))}
                </select>
                {editId && <p className="text-[11px] text-slate-400 mt-1">Pegawai tidak bisa diganti saat edit</p>}
              </div>

              {/* Peta pemilih titik */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`${labelInput} mb-0`}>Titik Lokasi — klik peta untuk memindahkan</label>
                  <button
                    type="button"
                    onClick={pakaiLokasiSaya}
                    className="flex items-center gap-1.5 text-xs font-semibold text-cyan-600 hover:text-cyan-700"
                  >
                    <FiCrosshair className="w-3.5 h-3.5" />
                    Pakai lokasi saya
                  </button>
                </div>

                <div className="h-64 rounded-xl overflow-hidden border border-slate-200">
                  {titikValid && (
                    <MapContainer center={[lat, lng]} zoom={15} className="w-full h-full">
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="&copy; OpenStreetMap"
                      />
                      <Marker position={[lat, lng]} />
                      <Circle
                        center={[lat, lng]}
                        radius={Number(form.radius_meter) || RADIUS_DEFAULT}
                        pathOptions={{ color: "#06b6d4", fillColor: "#06b6d4", fillOpacity: 0.15 }}
                      />
                      <PemilihTitik onPilih={pilihTitik} />
                      <PusatkanPeta lat={lat} lng={lng} />
                    </MapContainer>
                  )}
                </div>

                {jarakKeKantor !== null && (
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Sekitar {jarakKeKantor.toLocaleString("id-ID")} m dari Kantor DPMD
                    {jarakKeKantor <= 500 && " — titik ini masih di dalam radius kantor, pegawai sudah bisa absen di sini tanpa titik khusus."}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelInput}>Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
                    className={`${gayaInput} font-mono`}
                  />
                </div>
                <div>
                  <label className={labelInput}>Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
                    className={`${gayaInput} font-mono`}
                  />
                </div>
                <div>
                  <label className={labelInput}>Radius (meter)</label>
                  <input
                    type="number"
                    min="20"
                    max="10000"
                    value={form.radius_meter}
                    onChange={(e) => setForm((f) => ({ ...f, radius_meter: e.target.value }))}
                    className={gayaInput}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelInput}>Berlaku Mulai</label>
                  <input
                    type="date"
                    value={form.berlaku_mulai}
                    onChange={(e) => setForm((f) => ({ ...f, berlaku_mulai: e.target.value }))}
                    className={gayaInput}
                  />
                </div>
                <div>
                  <label className={labelInput}>Berlaku Sampai</label>
                  <input
                    type="date"
                    value={form.berlaku_sampai}
                    onChange={(e) => setForm((f) => ({ ...f, berlaku_sampai: e.target.value }))}
                    className={gayaInput}
                  />
                </div>
                <p className="sm:col-span-2 text-[11px] text-slate-400 -mt-2">
                  Kosongkan keduanya bila berlaku terus sampai dinonaktifkan.
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white flex items-center justify-end gap-3 p-5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-xl text-sm font-semibold transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/25 disabled:opacity-60 transition"
              >
                <FiSave className="w-4 h-4" />
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default LokasiKhususTab;
