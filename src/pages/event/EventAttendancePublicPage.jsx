import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Download,
  Loader2,
  QrCode,
  FileSpreadsheet,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import api from "../../api";

const CATEGORIES = ["masyarakat", "ASN", "pelajar", "mahasiswa", "perangkat desa", "lainnya"];

const getDeviceId = () => {
  const key = "dpmd_hjb544_device_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const next = `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(key, next);
  return next;
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

export default function EventAttendancePublicPage({ mode = "scan" }) {
  const [config, setConfig] = React.useState(null);
  const [searchParams] = useSearchParams();
  const canExport = Boolean(localStorage.getItem("expressToken"));

  React.useEffect(() => {
    api
      .get("/event-attendance/public/config")
      .then((res) => setConfig(res.data.data))
      .catch(() => toast.error("Gagal memuat konfigurasi event"));
  }, []);

  if (!config) {
    return (
      <EventShell>
        <div className="grid min-h-[70vh] place-items-center">
          <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
        </div>
      </EventShell>
    );
  }

  if (mode === "form") {
    return <AttendanceForm config={config} canExport={canExport} scanPayload={searchParams.get("token") || config.qr_payload} />;
  }

  return (
    <EventShell>
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 items-center gap-8 px-4 py-16 lg:grid-cols-[.95fr_1.05fr] lg:px-8">
        <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="relative z-10">
          <div className="mb-8 flex flex-wrap gap-3">
            <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-bold text-slate-600 shadow-sm backdrop-blur-xl">
              <ArrowLeft className="h-4 w-4" />
              Beranda DPMD
            </Link>
            {canExport && (
              <button onClick={exportAttendanceExcel} className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700 shadow-sm backdrop-blur-xl">
                <FileSpreadsheet className="h-4 w-4" />
                Export Excel
              </button>
            )}
          </div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-4 py-2 text-sm font-bold text-teal-700">
            <Sparkles className="h-4 w-4" />
            Hari Jadi Bogor ke-544
          </div>
          <h1 className="max-w-4xl text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
            Daftar Hadir Booth DPMD
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Tampilkan QR ini di booth. Pengunjung cukup scan memakai kamera HP, lalu mengisi form daftar hadir digital.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {["Scan QR", "Isi Form", "Selesai"].map((item, index) => (
              <div key={item} className="rounded-3xl border border-white/70 bg-white/75 p-4 shadow-xl shadow-slate-200/60 backdrop-blur-xl">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 text-white">
                  {index + 1}
                </div>
                <p className="font-black text-slate-900">{item}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <QrDisplayPanel config={config} />
      </div>
    </EventShell>
  );
}

function QrDisplayPanel({ config }) {
  return (
    <motion.section initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 rounded-[2.5rem] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-teal-900/10 backdrop-blur-2xl md:p-7">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-600">QR Event</p>
          <h2 className="text-2xl font-black text-slate-950 md:text-3xl">QR Daftar Hadir</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">{config.event_name}</p>
        </div>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <QrCode className="h-7 w-7" />
        </div>
      </div>
      <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-inner">
        {config.qrDataUrl ? (
          <img src={config.qrDataUrl} alt="QR daftar hadir Booth DPMD" className="mx-auto aspect-square w-full max-w-[460px] object-contain" />
        ) : (
          <div className="grid aspect-square place-items-center rounded-3xl bg-slate-50">
            <QrCode className="h-24 w-24 text-slate-300" />
          </div>
        )}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button onClick={() => downloadQrCode(config)} className="flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-xl shadow-slate-900/15">
          <Download className="h-5 w-5" />
          Download QR
        </button>
        <Link to={`/hari-jadi-bogor-544/form?token=${encodeURIComponent(config.qr_payload)}`} className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-blue-600 px-5 py-4 text-sm font-black text-white shadow-xl shadow-teal-500/20">
          Buka Form
          <ChevronRight className="h-5 w-5" />
        </Link>
      </div>
      <p className="mt-4 text-center text-sm font-semibold leading-6 text-slate-500">
        QR ini bisa ditempel di banner, layar monitor, atau dicetak untuk akses daftar hadir.
      </p>
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

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await api.post("/event-attendance/public/register", {
        ...form,
        scan_payload: scanPayload,
        device_id: getDeviceId(),
      });
      setSuccess(response.data.data);
      playSuccessTone();
    } catch (error) {
      const message = error.response?.data?.message || "Gagal menyimpan daftar hadir";
      if (error.response?.status === 409) {
        toast.error(message);
        setSuccess(error.response.data.data || { full_name: form.full_name });
      } else {
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <EventShell>
      <div className="mx-auto grid min-h-screen max-w-5xl place-items-center px-4 py-24">
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="w-full max-w-xl rounded-[2rem] border border-white/70 bg-white/85 p-8 text-center shadow-2xl shadow-teal-900/10 backdrop-blur-2xl">
              <div className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-2xl shadow-emerald-500/30">
                <BadgeCheck className="h-12 w-12" />
              </div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-teal-600">Berhasil Tercatat</p>
              <h1 className="mt-3 text-4xl font-black text-slate-950">Terima kasih!</h1>
              <p className="mt-4 text-slate-600">
                Selamat datang di Booth DPMD Kabupaten Bogor, <span className="font-black text-slate-900">{success.full_name}</span>.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <Link to="/hari-jadi-bogor-544" className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white">Scan Lagi</Link>
                <Link to="/" className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700">Kembali</Link>
              </div>
            </motion.div>
          ) : (
            <motion.form key="form" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="w-full rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-teal-900/10 backdrop-blur-2xl md:p-8">
              <div className="mb-6 flex flex-wrap gap-3">
                <Link to="/hari-jadi-bogor-544" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600">
                  <ArrowLeft className="h-4 w-4" />
                  Scan ulang
                </Link>
                {canExport && (
                  <button type="button" onClick={exportAttendanceExcel} className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                    <FileSpreadsheet className="h-4 w-4" />
                    Export Excel
                  </button>
                )}
              </div>
              <div className="mb-8 flex items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 text-white">
                  <UserRoundCheck className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-600">Form Daftar Hadir</p>
                  <h1 className="mt-1 text-3xl font-black text-slate-950">{config.event_name}</h1>
                </div>
              </div>
              <div className="grid gap-5">
                <Field label="Nama Lengkap">
                  <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="event-input" placeholder="Masukkan nama lengkap" />
                </Field>
                <Field label="Asal / Instansi">
                  <input required value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} className="event-input" placeholder="Contoh: Desa Cibinong / SMAN 1 / Umum" />
                </Field>
                <Field label="Kategori Pengunjung">
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {CATEGORIES.map((category) => (
                      <button key={category} type="button" onClick={() => setForm({ ...form, category })} className={`rounded-2xl border px-3 py-3 text-sm font-black capitalize transition ${form.category === category ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 bg-white text-slate-600"}`}>
                        {category}
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
              <button disabled={submitting} className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-teal-500 via-blue-600 to-indigo-600 px-6 py-4 text-base font-black text-white shadow-xl shadow-teal-500/20 disabled:opacity-60">
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                Submit Daftar Hadir
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
      <style>{`
        .event-input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgb(226 232 240);
          background: rgba(255,255,255,.9);
          padding: .95rem 1rem;
          font-weight: 700;
          color: rgb(15 23 42);
          outline: none;
        }
        .event-input:focus {
          border-color: rgb(20 184 166);
          box-shadow: 0 0 0 4px rgba(20,184,166,.12);
        }
      `}</style>
    </EventShell>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function EventShell({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#f8fafc_0%,#ecfeff_42%,#eef2ff_100%)]">
      <div className="pointer-events-none absolute -left-24 top-20 h-80 w-80 rounded-full bg-teal-300/30 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-blue-300/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-fuchsia-200/30 blur-3xl" />
      {children}
    </div>
  );
}
