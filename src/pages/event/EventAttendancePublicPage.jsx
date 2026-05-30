import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  MapPin,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import api from "../../api";

const CATEGORIES = ["masyarakat", "ASN", "pelajar", "mahasiswa", "perangkat desa", "lainnya"];

const CATEGORY_META = {
  masyarakat: "Warga umum",
  ASN: "Aparatur sipil",
  pelajar: "Siswa sekolah",
  mahasiswa: "Perguruan tinggi",
  "perangkat desa": "Pemerintah desa",
  lainnya: "Kategori custom",
};

const getDeviceId = () => {
  const key = "dpmd_hjb544_device_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const next = `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(key, next);
  return next;
};

// Persisted config so the page tetap terbuka walau koneksi buruk/putus.
const CONFIG_CACHE_KEY = "dpmd_hjb544_config";

// Label default agar form bisa langsung tampil tanpa menunggu API config.
const FALLBACK_CONFIG = {
  event_name: "Booth DPMD Kabupaten Bogor",
  location: "Booth DPMD Kabupaten Bogor",
  event_date: null,
  qr_payload: "",
  qrDataUrl: null,
};

const readCachedConfig = () => {
  try {
    const raw = localStorage.getItem(CONFIG_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCachedConfig = (config) => {
  try {
    localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(config));
  } catch {
    /* abaikan kuota localStorage penuh */
  }
};

const playSuccessTone = () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  [523.25, 659.25, 783.99].forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + index * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + index * 0.08 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + index * 0.08 + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + index * 0.08);
    osc.stop(ctx.currentTime + index * 0.08 + 0.18);
  });
};

const exportAttendanceExcel = async () => {
  const toastId = toast.loading("Menyiapkan file Excel...");
  try {
    // Muat pustaka xlsx (~1 MB) hanya saat dibutuhkan, bukan saat halaman dibuka,
    // agar pengunjung di koneksi buruk tidak perlu mengunduhnya sama sekali.
    const XLSX = await import("xlsx");
    const response = await api.get("/event-attendance/admin/attendances", {
      params: { limit: 5000 },
    });
    const rows = response.data.data || [];
    const worksheet = XLSX.utils.json_to_sheet(
      rows.map((item, index) => ({
        No: index + 1,
        "Nama Lengkap": item.full_name,
        "Asal / Instansi": item.origin,
        Kategori: item.category_label || item.category,
        "Waktu Daftar": new Date(item.created_at).toLocaleString("id-ID"),
      })),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daftar Hadir");
    XLSX.writeFile(workbook, `Daftar_Hadir_Booth_DPMD_HJB_544_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Excel berhasil diunduh", { id: toastId });
  } catch (error) {
    toast.error(error.response?.status === 401 ? "Login sebagai staff DPMD untuk export data" : "Gagal export Excel", { id: toastId });
  }
};

const downloadQrCode = (config) => {
  if (!config?.qrDataUrl) return;
  const link = document.createElement("a");
  link.href = config.qrDataUrl;
  link.download = "QR-Daftar-Hadir-Booth-DPMD-HJB-544.png";
  link.click();
};

const getFormUrl = (config) => {
  if (config?.formUrl) return config.formUrl;
  // Halaman form ringan mandiri (lihat public/daftar-hadir-hjb544.html).
  return `${window.location.origin}/daftar-hadir-hjb544.html?token=${encodeURIComponent(config?.qr_payload || "")}`;
};

const copyFormUrl = async (config) => {
  try {
    await navigator.clipboard.writeText(getFormUrl(config));
    toast.success("Link form berhasil disalin");
  } catch (error) {
    toast.error("Gagal menyalin link form");
  }
};

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const printQrCode = (config) => {
  if (!config?.qrDataUrl) return;
  const win = window.open("", "_blank", "width=720,height=900");
  if (!win) {
    toast.error("Popup print diblokir browser");
    return;
  }

  win.document.write(`
    <html>
      <head>
        <title>QR Daftar Hadir DPMD</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 48px; color: #0f172a; text-align: center; }
          .sheet { border: 2px solid #0f766e; border-radius: 28px; padding: 40px; }
          h1 { margin: 0 0 8px; font-size: 32px; }
          p { margin: 8px 0; color: #475569; font-size: 16px; }
          img { width: 420px; max-width: 100%; margin: 28px auto 18px; display: block; }
          .tag { display: inline-block; margin-bottom: 18px; padding: 8px 14px; border-radius: 999px; background: #ccfbf1; color: #0f766e; font-weight: 800; }
          @media print { body { padding: 24px; } }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="tag">Hari Jadi Bogor ke-544</div>
          <h1>Daftar Hadir Booth DPMD</h1>
          <p>${escapeHtml(config.event_name || "DPMD Kabupaten Bogor")}</p>
          <img src="${config.qrDataUrl}" alt="QR Daftar Hadir" />
          <p>Scan QR ini untuk mengisi daftar hadir pengunjung booth.</p>
        </div>
        <script>window.onload = () => { window.print(); };</script>
      </body>
    </html>
  `);
  win.document.close();
};

const formatEventDate = (value) => {
  if (!value) return "Hari Jadi Bogor ke-544";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Hari Jadi Bogor ke-544";
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getCategoryLabel = (item) => item?.category_label || item?.custom_category || item?.category || "-";

const buildAttendanceStats = (rows, totalFromServer) => {
  const todayKey = new Date().toISOString().slice(0, 10);
  const categories = rows.reduce((acc, item) => {
    const label = getCategoryLabel(item);
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  return {
    total: Number(totalFromServer || rows.length || 0),
    today: rows.filter((item) => String(item.created_at || "").slice(0, 10) === todayKey).length,
    categories: Object.entries(categories)
      .map(([label, total]) => ({ label, total }))
      .sort((a, b) => b.total - a.total),
  };
};

export default function EventAttendancePublicPage({ mode = "scan" }) {
  // Mulai dari config yang tersimpan di perangkat — agar tampil instan walau offline.
  const [config, setConfig] = React.useState(() => readCachedConfig());
  const [attendanceOpen, setAttendanceOpen] = React.useState(false);
  const [searchParams] = useSearchParams();
  const canExport = Boolean(localStorage.getItem("expressToken"));

  React.useEffect(() => {
    let active = true;
    api
      // Timeout pendek: jangan biarkan pengunjung menatap loader 30 detik saat sinyal jelek.
      .get("/event-attendance/public/config", { timeout: 8000 })
      .then((res) => {
        if (!active) return;
        setConfig(res.data.data);
        writeCachedConfig(res.data.data);
      })
      .catch(() => {
        if (!active) return;
        // Koneksi buruk/putus: pakai config tersimpan, atau fallback agar halaman tetap terbuka.
        setConfig((prev) => prev || readCachedConfig() || (mode === "form" ? FALLBACK_CONFIG : null));
      });
    return () => {
      active = false;
    };
  }, [mode]);

  // Form pengunjung TIDAK butuh config dari server — token QR sudah ada di URL.
  // Jadi langsung tampilkan form tanpa menunggu jaringan.
  if (mode === "form") {
    const formConfig = config || FALLBACK_CONFIG;
    return <AttendanceForm config={formConfig} canExport={canExport} scanPayload={searchParams.get("token") || formConfig.qr_payload} />;
  }

  if (!config) {
    return (
      <EventShell>
        <div className="relative z-10 grid min-h-screen place-items-center">
          <div className="rounded-[2rem] border border-white/70 bg-white/80 p-8 text-center shadow-2xl shadow-teal-900/10 backdrop-blur-2xl">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-teal-500" />
            <p className="mt-4 text-sm font-black uppercase tracking-[0.22em] text-slate-400">Memuat QR Event</p>
          </div>
        </div>
      </EventShell>
    );
  }

  return (
    <EventShell>
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-white/70 bg-white/70 px-4 py-3 shadow-lg shadow-teal-900/5 backdrop-blur-2xl">
          <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm transition hover:border-teal-200 hover:text-teal-700">
            <ArrowLeft className="h-4 w-4" />
            Beranda DPMD
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-teal-700">
              <ShieldCheck className="h-4 w-4" />
              Booth Access
            </span>
            {canExport && (
              <>
                <button onClick={() => setAttendanceOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-black text-sky-700 shadow-sm transition hover:bg-sky-100">
                  <Eye className="h-4 w-4" />
                  Lihat Daftar Hadir
                </button>
                <button onClick={exportAttendanceExcel} className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700 shadow-sm transition hover:bg-emerald-100">
                  <FileSpreadsheet className="h-4 w-4" />
                  Export Excel
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 items-center gap-8 pb-10 lg:grid-cols-[.9fr_1.1fr]">
          <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="relative">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-100 bg-white/80 px-4 py-2 text-sm font-black text-teal-700 shadow-sm backdrop-blur-xl">
              <Sparkles className="h-4 w-4" />
              Hari Jadi Bogor ke-544
            </div>
            <h1 className="max-w-4xl text-5xl font-black leading-[0.94] tracking-tight text-slate-950 md:text-7xl">
              Daftar Hadir Booth DPMD
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-slate-600">
              Layar khusus booth untuk menampilkan QR daftar hadir. Pengunjung cukup scan QR memakai kamera HP dan mengisi form digital di perangkat masing-masing.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ["1", "Scan QR", "Kamera HP"],
                ["2", "Isi Form", "30 detik"],
                ["3", "Tercatat", "Anti double"],
              ].map(([number, title, subtitle]) => (
                <div key={title} className="rounded-[1.4rem] border border-white/70 bg-white/75 p-4 shadow-xl shadow-slate-200/60 backdrop-blur-xl">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 text-sm font-black text-white shadow-lg shadow-teal-500/20">
                    {number}
                  </div>
                  <p className="font-black text-slate-950">{title}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{subtitle}</p>
                </div>
              ))}
            </div>
          </motion.section>

          <QrDisplayPanel config={config} />
        </div>
      </div>
      <AttendanceListPanel open={attendanceOpen} onClose={() => setAttendanceOpen(false)} />
    </EventShell>
  );
}

function QrDisplayPanel({ config }) {
  return (
    <motion.section initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="relative overflow-hidden rounded-[2.3rem] border border-white/80 bg-white/90 p-4 shadow-[0_30px_90px_rgba(15,118,110,.18)] backdrop-blur-2xl md:p-6">
      <div className="absolute inset-x-8 top-0 h-1 rounded-full bg-gradient-to-r from-teal-400 via-sky-500 to-indigo-500" />
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-600">Display QR Booth</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 md:text-4xl">Scan untuk Daftar Hadir</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{config.event_name}</p>
        </div>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-xl shadow-slate-900/20">
          <QrCode className="h-7 w-7" />
        </div>
      </div>

      <div className="relative rounded-[2rem] bg-gradient-to-br from-slate-950 via-teal-950 to-blue-950 p-3 shadow-inner">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(45,212,191,.35),transparent_34%),radial-gradient(circle_at_82%_20%,rgba(96,165,250,.32),transparent_28%)]" />
        <div className="relative rounded-[1.55rem] border border-white/10 bg-white p-5">
          {config.qrDataUrl ? (
            <img src={config.qrDataUrl} alt="QR daftar hadir Booth DPMD" className="mx-auto aspect-square w-full max-w-[480px] object-contain" />
          ) : (
            <div className="grid aspect-square place-items-center rounded-3xl bg-slate-50">
              <QrCode className="h-24 w-24 text-slate-300" />
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button onClick={() => downloadQrCode(config)} className="flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-xl shadow-slate-900/15 transition hover:-translate-y-0.5">
          <Download className="h-5 w-5" />
          Download QR
        </button>
        <button onClick={() => printQrCode(config)} className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-800 shadow-lg shadow-slate-200/70 transition hover:-translate-y-0.5">
          <Printer className="h-5 w-5" />
          Print QR
        </button>
        <button onClick={() => copyFormUrl(config)} className="flex items-center justify-center gap-2 rounded-2xl border border-teal-100 bg-teal-50 px-5 py-4 text-sm font-black text-teal-800 shadow-lg shadow-teal-100/70 transition hover:-translate-y-0.5">
          <Copy className="h-5 w-5" />
          Copy Link
        </button>
        <a href={getFormUrl(config)} className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 via-sky-500 to-blue-600 px-5 py-4 text-sm font-black text-white shadow-xl shadow-teal-500/20 transition hover:-translate-y-0.5">
          Buka Form
          <ChevronRight className="h-5 w-5" />
        </a>
      </div>

      <div className="mt-5 rounded-[1.4rem] border border-slate-100 bg-slate-50/80 px-4 py-3 text-center">
        <p className="text-sm font-bold leading-6 text-slate-600">
          QR hanya ditampilkan di booth agar pengisian daftar hadir tetap berasal dari pengunjung yang hadir langsung.
        </p>
      </div>
    </motion.section>
  );
}

function AttendanceForm({ config, scanPayload, canExport }) {
  const [form, setForm] = React.useState({
    full_name: "",
    origin: "",
    category: "masyarakat",
    custom_category: "",
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(null);
  const [attendanceOpen, setAttendanceOpen] = React.useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await api.post(
        "/event-attendance/public/register",
        {
          ...form,
          scan_payload: scanPayload,
          device_id: getDeviceId(),
        },
        // Timeout pendek: jika koneksi macet, segera fall back ke antrian offline.
        { timeout: 12000 },
      );
      setSuccess(response.data.data);
      playSuccessTone();
    } catch (error) {
      // Server merespons (mis. 409 data double) → tangani normal.
      if (error.response) {
        const message = error.response.data?.message || "Gagal menyimpan daftar hadir";
        if (error.response.status === 409) {
          toast.error(message);
          setSuccess(error.response.data.data || { full_name: form.full_name });
        } else {
          toast.error(message);
        }
        return;
      }

      // Tidak ada respons = koneksi putus/macet. Bila service worker aktif, request
      // sudah diantri (Background Sync) dan akan terkirim otomatis saat online.
      const swActive = "serviceWorker" in navigator && navigator.serviceWorker.controller;
      if (swActive) {
        setSuccess({ full_name: form.full_name, queued: true });
        playSuccessTone();
      } else {
        toast.error("Koneksi terputus dan data belum tersimpan. Coba lagi saat ada sinyal.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <EventShell>
      <div className="relative z-10 mx-auto grid min-h-screen max-w-6xl place-items-center px-4 py-8 lg:py-12">
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="w-full max-w-2xl overflow-hidden rounded-[2.4rem] border border-white/75 bg-white/90 p-7 text-center shadow-[0_30px_90px_rgba(15,118,110,.18)] backdrop-blur-2xl md:p-10">
              <div className={`mx-auto mb-6 grid h-24 w-24 place-items-center rounded-full text-white shadow-2xl ${success.queued ? "bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 shadow-amber-500/30" : "bg-gradient-to-br from-emerald-400 via-teal-500 to-blue-600 shadow-emerald-500/30"}`}>
                {success.queued ? <Clock3 className="h-12 w-12" /> : <BadgeCheck className="h-12 w-12" />}
              </div>
              <p className={`text-sm font-black uppercase tracking-[0.24em] ${success.queued ? "text-amber-600" : "text-teal-600"}`}>
                {success.queued ? "Tersimpan di Perangkat" : "Berhasil Tercatat"}
              </p>
              <h1 className="mt-3 text-5xl font-black tracking-tight text-slate-950">Terima kasih!</h1>
              <p className="mx-auto mt-4 max-w-lg text-lg leading-8 text-slate-600">
                Selamat datang di Booth DPMD Kabupaten Bogor, <span className="font-black text-slate-900">{success.full_name}</span>.
              </p>
              {success.queued && (
                <p className="mx-auto mt-5 max-w-lg rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold leading-6 text-amber-700">
                  Koneksi internet sedang terputus. Data Anda <span className="font-black">aman tersimpan</span> di perangkat ini dan akan <span className="font-black">terkirim otomatis</span> begitu jaringan kembali. Tidak perlu mengisi ulang.
                </p>
              )}
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <Link to="/hari-jadi-bogor-544" className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-xl shadow-slate-900/15">Lihat QR</Link>
                <Link to="/" className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700 shadow-lg shadow-slate-200/60">Kembali</Link>
              </div>
            </motion.div>
          ) : (
            <motion.form key="form" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="grid w-full overflow-hidden rounded-[2.4rem] border border-white/75 bg-white/90 shadow-[0_30px_90px_rgba(15,118,110,.18)] backdrop-blur-2xl lg:grid-cols-[.8fr_1.2fr]">
              <aside className="relative overflow-hidden bg-slate-950 p-6 text-white md:p-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(45,212,191,.34),transparent_36%),radial-gradient(circle_at_88%_18%,rgba(59,130,246,.34),transparent_34%)]" />
                <div className="relative">
                  <Link to="/hari-jadi-bogor-544" className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white backdrop-blur-xl">
                    <ArrowLeft className="h-4 w-4" />
                    Lihat QR
                  </Link>
                  <div className="grid h-16 w-16 place-items-center rounded-3xl bg-white text-slate-950 shadow-2xl">
                    <UserRoundCheck className="h-8 w-8" />
                  </div>
                  <p className="mt-7 text-xs font-black uppercase tracking-[0.28em] text-teal-200">Form Daftar Hadir</p>
                  <h1 className="mt-3 text-3xl font-black leading-tight md:text-4xl">{config.event_name}</h1>
                  <div className="mt-8 space-y-3">
                    <SideFact icon={MapPin} label={config.location || "Booth DPMD Kabupaten Bogor"} />
                    <SideFact icon={CalendarDays} label={formatEventDate(config.event_date)} />
                    <SideFact icon={ShieldCheck} label="Validasi otomatis anti data double" />
                  </div>
                </div>
              </aside>

              <div className="p-5 md:p-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-600">Data Pengunjung</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">Isi identitas singkat</h2>
                  </div>
                  {canExport && (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setAttendanceOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-black text-sky-700">
                        <Eye className="h-4 w-4" />
                        Lihat Daftar Hadir
                      </button>
                      <button type="button" onClick={exportAttendanceExcel} className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                        <FileSpreadsheet className="h-4 w-4" />
                        Export Excel
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid gap-5">
                  <Field label="Nama Lengkap" icon={UsersRound}>
                    <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="event-input" placeholder="Masukkan nama lengkap" />
                  </Field>
                  <Field label="Asal / Instansi" icon={Building2}>
                    <input required value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} className="event-input" placeholder="Contoh: Desa Cibinong / SMAN 1 / Umum" />
                  </Field>
                  <Field label="Kategori Pengunjung">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {CATEGORIES.map((category) => (
                        <button key={category} type="button" onClick={() => setForm({ ...form, category })} className={`rounded-2xl border px-4 py-3 text-left transition ${form.category === category ? "border-teal-500 bg-teal-50 text-teal-800 shadow-lg shadow-teal-100/70" : "border-slate-200 bg-white text-slate-600 hover:border-teal-100 hover:bg-slate-50"}`}>
                          <span className="block text-sm font-black capitalize">{category}</span>
                          <span className="mt-1 block text-xs font-bold text-slate-400">{CATEGORY_META[category]}</span>
                        </button>
                      ))}
                    </div>
                  </Field>
                  {form.category === "lainnya" && (
                    <Field label="Kategori Lainnya">
                      <input required value={form.custom_category} onChange={(e) => setForm({ ...form, custom_category: e.target.value })} className="event-input" placeholder="Tulis kategori pengunjung" />
                    </Field>
                  )}
                </div>
                <button disabled={submitting} className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-teal-500 via-sky-500 to-blue-600 px-6 py-4 text-base font-black text-white shadow-xl shadow-teal-500/20 transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60">
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                  Submit Daftar Hadir
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
      <style>{`
        .event-input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgb(226 232 240);
          background: rgba(255,255,255,.95);
          padding: 1rem;
          font-weight: 800;
          color: rgb(15 23 42);
          outline: none;
          box-shadow: 0 10px 30px rgba(15,23,42,.04);
        }
        .event-input:focus {
          border-color: rgb(20 184 166);
          box-shadow: 0 0 0 4px rgba(20,184,166,.12), 0 12px 30px rgba(15,23,42,.08);
        }
      `}</style>
      <AttendanceListPanel open={attendanceOpen} onClose={() => setAttendanceOpen(false)} />
    </EventShell>
  );
}

function AttendanceListPanel({ open, onClose }) {
  const [rows, setRows] = React.useState([]);
  const [pagination, setPagination] = React.useState({ total: 0, page: 1, limit: 80 });
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [loading, setLoading] = React.useState(false);

  const fetchRows = React.useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const response = await api.get("/event-attendance/admin/attendances", {
        params: {
          search: search.trim() || undefined,
          category,
          limit: 80,
          page: 1,
        },
      });
      setRows(response.data.data || []);
      setPagination(response.data.pagination || { total: 0, page: 1, limit: 80 });
    } catch (error) {
      toast.error(error.response?.status === 401 ? "Silakan login sebagai pegawai DPMD" : "Gagal memuat daftar hadir");
    } finally {
      setLoading(false);
    }
  }, [category, open, search]);

  React.useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  React.useEffect(() => {
    if (!open) return undefined;
    const timer = window.setInterval(fetchRows, 15000);
    return () => window.clearInterval(timer);
  }, [fetchRows, open]);

  const stats = buildAttendanceStats(rows, pagination.total);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/45 px-3 py-4 backdrop-blur-xl md:px-6 md:py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.section
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            className="mx-auto min-h-[calc(100vh-2rem)] max-w-7xl overflow-hidden rounded-[2rem] border border-white/75 bg-white/95 shadow-[0_40px_110px_rgba(15,23,42,.35)] backdrop-blur-2xl md:min-h-0"
          >
            <div className="flex flex-col gap-4 border-b border-slate-100 bg-[linear-gradient(135deg,#ffffff_0%,#ecfeff_52%,#eff6ff_100%)] p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-600">Monitoring Pegawai</p>
                  <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Daftar Hadir Masuk</h2>
                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                    Data pengunjung yang sudah mengisi daftar hadir booth DPMD.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={fetchRows} disabled={loading} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:border-teal-200 hover:text-teal-700 disabled:opacity-60">
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                  <button onClick={exportAttendanceExcel} className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700 shadow-sm transition hover:bg-emerald-100">
                    <FileSpreadsheet className="h-4 w-4" />
                    Export Excel
                  </button>
                  <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-slate-950 text-white shadow-lg shadow-slate-900/20" aria-label="Tutup daftar hadir">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <AttendanceMetric icon={UsersRound} label="Total Data" value={stats.total} tone="dark" />
                <AttendanceMetric icon={TrendingUp} label="Tercatat Hari Ini" value={stats.today} tone="teal" />
                <AttendanceMetric icon={Clock3} label="Ditampilkan" value={rows.length} tone="blue" />
              </div>

              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cari nama, asal, atau kategori..."
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-bold text-slate-800 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                  />
                </label>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                >
                  <option value="all">Semua Kategori</option>
                  {CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 p-5 md:p-6 xl:grid-cols-[1fr_320px]">
              <div className="overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white shadow-sm">
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                      <tr>
                        {["Nama", "Asal / Instansi", "Kategori", "Waktu"].map((heading) => (
                          <th key={heading} className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((item) => (
                        <tr key={item.id} className="transition hover:bg-teal-50/40">
                          <td className="px-5 py-4">
                            <p className="font-black text-slate-950">{item.full_name}</p>
                            <p className="text-xs font-bold text-slate-400">ID #{item.id}</p>
                          </td>
                          <td className="px-5 py-4 text-sm font-bold text-slate-600">{item.origin}</td>
                          <td className="px-5 py-4">
                            <span className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-black capitalize text-teal-700">
                              {getCategoryLabel(item)}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm font-bold text-slate-500">{formatDateTime(item.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-3 p-3 md:hidden">
                  {rows.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-slate-950">{item.full_name}</p>
                          <p className="mt-1 text-sm font-bold text-slate-500">{item.origin}</p>
                        </div>
                        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black capitalize text-teal-700">
                          {getCategoryLabel(item)}
                        </span>
                      </div>
                      <p className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-400">
                        <Clock3 className="h-4 w-4" />
                        {formatDateTime(item.created_at)}
                      </p>
                    </div>
                  ))}
                </div>

                {!loading && rows.length === 0 && (
                  <div className="grid min-h-[260px] place-items-center px-6 text-center">
                    <div>
                      <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-slate-100 text-slate-400">
                        <Search className="h-8 w-8" />
                      </div>
                      <p className="mt-4 text-lg font-black text-slate-900">Belum ada data cocok</p>
                      <p className="mt-1 text-sm font-semibold text-slate-500">Coba ubah kata kunci atau filter kategori.</p>
                    </div>
                  </div>
                )}

                {loading && (
                  <div className="grid min-h-[260px] place-items-center px-6 text-center">
                    <div>
                      <Loader2 className="mx-auto h-10 w-10 animate-spin text-teal-500" />
                      <p className="mt-3 text-sm font-black uppercase tracking-[0.18em] text-slate-400">Memuat data</p>
                    </div>
                  </div>
                )}
              </div>

              <aside className="rounded-[1.5rem] border border-slate-100 bg-slate-950 p-5 text-white shadow-xl shadow-slate-900/20">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-200">Kategori Pengunjung</p>
                <div className="mt-5 space-y-3">
                  {stats.categories.length ? (
                    stats.categories.map((item) => (
                      <div key={item.label}>
                        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                          <span className="font-black capitalize text-white">{item.label}</span>
                          <span className="font-black text-teal-200">{item.total}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-gradient-to-r from-teal-300 to-sky-400" style={{ width: `${Math.max(8, Math.round((item.total / Math.max(1, rows.length)) * 100))}%` }} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-semibold leading-6 text-white/60">Statistik kategori akan muncul setelah ada data.</p>
                  )}
                </div>
              </aside>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AttendanceMetric({ icon: Icon, label, value, tone }) {
  const toneClass = {
    dark: "bg-slate-950 text-white",
    teal: "bg-teal-600 text-white",
    blue: "bg-blue-600 text-white",
  }[tone];

  return (
    <div className="flex items-center gap-4 rounded-[1.4rem] border border-white/70 bg-white/80 p-4 shadow-lg shadow-slate-200/60 backdrop-blur-xl">
      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${toneClass}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
      </div>
    </div>
  );
}

function SideFact({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-xl">
      <Icon className="h-5 w-5 shrink-0 text-teal-200" />
      <p className="text-sm font-bold leading-5 text-white/85">{label}</p>
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700">
        {Icon && <Icon className="h-4 w-4 text-teal-600" />}
        {label}
      </span>
      {children}
    </label>
  );
}

function EventShell({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#f8fafc_0%,#ecfeff_42%,#eef2ff_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(15,23,42,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,.035)_1px,transparent_1px)] bg-[size:42px_42px]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(20,184,166,.13),transparent_34%,rgba(59,130,246,.1)_70%,transparent)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-white/65 backdrop-blur-2xl" />
      {children}
    </div>
  );
}
