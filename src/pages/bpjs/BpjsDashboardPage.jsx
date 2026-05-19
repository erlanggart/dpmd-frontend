import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuArrowRight,
  LuShieldCheck,
  LuUsers,
  LuMapPin,
  LuCircleCheck,
  LuTriangleAlert,
  LuDatabase,
  LuRefreshCw,
} from "react-icons/lu";
import api from "../../api";

const useCountUp = (end, duration = 900, shouldStart = true) => {
  const [count, setCount] = useState(0);
  const prevEnd = useRef(0);
  useEffect(() => {
    if (!shouldStart || end === 0) {
      setCount(end);
      return;
    }
    let startTs = null;
    const startVal = prevEnd.current;
    prevEnd.current = end;
    const step = (ts) => {
      if (!startTs) startTs = ts;
      const progress = Math.min((ts - startTs) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(startVal + (end - startVal) * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, shouldStart, duration]);
  return count;
};

const formatNumber = (n) => new Intl.NumberFormat("id-ID").format(n || 0);

const StatCard = ({ icon: Icon, label, value, accent, hint, loading, delay = 0 }) => {
  const [visible, setVisible] = useState(false);
  const animated = useCountUp(value || 0, 900, visible && !loading);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-100 p-5 hover:border-slate-200 hover:shadow-md transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent.bg} ${accent.text}`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="flex items-end justify-between">
        {loading ? (
          <div className="h-8 w-20 bg-slate-100 rounded animate-pulse" />
        ) : (
          <p className="text-3xl font-bold text-slate-900 tabular-nums leading-none">
            {formatNumber(animated)}
          </p>
        )}
      </div>
      {hint && (
        <p className="text-[11px] text-slate-400 mt-2">{hint}</p>
      )}
    </div>
  );
};

const BpjsDashboardPage = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const loadSummary = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await api.get("/kelembagaan/rtrw-comparison");
      if (res.data?.processing) {
        // Cache being built — retry softly
        setTimeout(() => loadSummary(isRefresh), 3000);
        return;
      }
      if (res.data?.success) {
        setSummary(res.data.data?.summary || null);
      } else {
        throw new Error(res.data?.message || "Gagal memuat data");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Gagal memuat data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 11) return "Selamat Pagi";
    if (h < 15) return "Selamat Siang";
    if (h < 18) return "Selamat Sore";
    return "Selamat Malam";
  })();

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const totalMatchedWithBpjs =
    Number(summary?.totalAllThree || 0) +
    Number(summary?.totalDbBpjs || 0) +
    Number(summary?.totalAddBpjs || 0);

  return (
    <div className="space-y-6">
      {/* Hero / Welcome card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 text-white shadow-xl">
        {/* Decorative shapes */}
        <div className="absolute -top-24 -right-16 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-10 w-72 h-72 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.08),transparent_40%)] pointer-events-none" />

        <div className="relative p-6 sm:p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-4">
                <LuShieldCheck className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold tracking-wide uppercase">
                  Portal BPJS · DPMD Kab. Bogor
                </span>
              </div>

              <p className="text-emerald-50/90 text-sm font-medium">
                {greeting},
              </p>
              <h1 className="mt-1 text-3xl sm:text-4xl font-bold leading-tight">
                {user?.name || "Tim BPJS Ketenagakerjaan"}
              </h1>
              <p className="mt-3 text-emerald-50/85 text-sm sm:text-base max-w-2xl leading-relaxed">
                Selamat datang di portal kolaborasi BPJS &amp; Dinas Pemberdayaan
                Masyarakat dan Desa Kabupaten Bogor. Bandingkan data kepesertaan
                BPJS dengan basis data RT/RW desa dan penerima ADD.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => navigate("/bpjs/rtrw-comparison")}
                  className="group inline-flex items-center gap-2 px-6 py-3 bg-white text-emerald-700 hover:bg-emerald-50 font-semibold rounded-xl shadow-lg shadow-emerald-900/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                >
                  Buka RT/RW Comparison
                  <LuArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
                <button
                  onClick={() => loadSummary(true)}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white font-medium rounded-xl transition-all duration-300 disabled:opacity-60"
                >
                  <LuRefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                  Muat Ulang
                </button>
              </div>
            </div>

            {/* Right side: decorative icon */}
            <div className="hidden md:flex flex-shrink-0 items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-white/10 blur-2xl rounded-full" />
                <div className="relative w-32 h-32 rounded-3xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                  <LuShieldCheck className="w-16 h-16 text-white drop-shadow-lg" />
                </div>
              </div>
            </div>
          </div>

          {/* Date strip */}
          <div className="mt-6 pt-5 border-t border-white/15 flex items-center justify-between text-[11px] text-emerald-50/70">
            <span>{today}</span>
            <span className="font-mono">v1.0</span>
          </div>
        </div>
      </div>

      {/* Stats section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">Ringkasan Persandingan Data</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cuplikan singkat hasil komparasi RT/RW · Database DPMD vs ADD vs BPJS
          </p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3">
          <LuTriangleAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-rose-800">Gagal memuat ringkasan</p>
            <p className="text-xs text-rose-600 mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => loadSummary(true)}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={LuMapPin}
          label="Total Desa"
          value={summary?.totalDesa}
          accent={{ bg: "bg-emerald-50", text: "text-emerald-600" }}
          hint="Desa terdata di DPMD"
          loading={loading}
          delay={0}
        />
        <StatCard
          icon={LuUsers}
          label="Penerima BPJS"
          value={summary?.totalBpjsPenerima}
          accent={{ bg: "bg-teal-50", text: "text-teal-600" }}
          hint="Peserta dari data sumber BPJS"
          loading={loading}
          delay={80}
        />
        <StatCard
          icon={LuCircleCheck}
          label="Cocok dengan BPJS"
          value={totalMatchedWithBpjs}
          accent={{ bg: "bg-green-50", text: "text-green-600" }}
          hint="Match DB/ADD ↔ BPJS"
          loading={loading}
          delay={160}
        />
        <StatCard
          icon={LuTriangleAlert}
          label="NIK Berbeda"
          value={summary?.totalNikMismatch}
          accent={{ bg: "bg-amber-50", text: "text-amber-600" }}
          hint="Perlu klarifikasi NIK"
          loading={loading}
          delay={240}
        />
      </div>

      {/* Feature card / big CTA */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 group relative overflow-hidden rounded-2xl bg-white border border-slate-100 hover:border-emerald-200 hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-emerald-100/40 to-transparent rounded-full -translate-y-32 translate-x-32 pointer-events-none" />
          <div className="relative p-6 sm:p-7">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-200">
                <LuDatabase className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900">
                  RT/RW Comparison
                </h3>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Bandingkan kepesertaan BPJS dengan basis data pengurus RT/RW
                  DPMD dan daftar penerima ADD. Identifikasi kemiripan,
                  ketidakcocokan NIK, dan duplikasi penerima — siap diekspor ke
                  Excel.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <Pill color="emerald">DB + ADD + BPJS</Pill>
                  <Pill color="teal">DB ↔ BPJS</Pill>
                  <Pill color="amber">NIK Mismatch</Pill>
                  <Pill color="rose">Hanya BPJS</Pill>
                </div>

                <button
                  onClick={() => navigate("/bpjs/rtrw-comparison")}
                  className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-emerald-200/60 hover:shadow-lg transition-all duration-300 group-hover:-translate-y-0.5"
                >
                  Mulai Bandingkan Data
                  <LuArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Info / contact card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-6">
          <h3 className="text-sm font-bold text-slate-800">Akses Terbatas</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Akun BPJS dirancang untuk hanya mengakses fitur RT/RW Comparison.
            Hubungi admin DPMD jika memerlukan akses tambahan.
          </p>

          <div className="mt-5 space-y-2.5">
            <ListItem ok label="Membandingkan data RT/RW" />
            <ListItem ok label="Mengekspor hasil ke Excel" />
            <ListItem label="Mengubah data DPMD" />
            <ListItem label="Mengelola pengguna" />
          </div>
        </div>
      </div>
    </div>
  );
};

const Pill = ({ color, children }) => {
  const map = {
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    teal: "bg-teal-50 text-teal-700 ring-teal-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    rose: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 ${map[color]}`}
    >
      {children}
    </span>
  );
};

const ListItem = ({ ok, label }) => (
  <div className="flex items-center gap-2.5">
    <span
      className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
        ok ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
      }`}
    >
      {ok ? "✓" : "×"}
    </span>
    <span className={`text-xs ${ok ? "text-slate-700" : "text-slate-400 line-through"}`}>
      {label}
    </span>
  </div>
);

export default BpjsDashboardPage;
