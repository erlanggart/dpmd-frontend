// src/components/AttendanceLeaderboardModal.jsx
// Modal "Peringkat Absen Terbaik" untuk halaman absensi pegawai (read-only).
// Mengambil data dari GET /absensi/leaderboard (akses semua pegawai).
import React, { useCallback, useEffect, useState } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { FiX, FiSearch, FiAward } from "react-icons/fi";
import { LuTrophy, LuCrown } from "react-icons/lu";
import api from "../api";
import { getAvatarUrl } from "../utils/avatarUtils";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const PERIODES = [
  { key: "minggu", label: "Mingguan" },
  { key: "bulan", label: "Bulanan" },
  { key: "tahun", label: "Tahunan" },
];

// Gaya per peringkat untuk podium.
const RANK_META = {
  1: { medal: "🥇", label: "Juara 1", ring: "ring-amber-400", bar: "from-amber-300 to-yellow-500", text: "text-amber-600", avatar: "h-16 w-16", pillar: "h-20", num: "text-amber-700" },
  2: { medal: "🥈", label: "Juara 2", ring: "ring-slate-300", bar: "from-slate-200 to-slate-400", text: "text-slate-500", avatar: "h-14 w-14", pillar: "h-14", num: "text-slate-600" },
  3: { medal: "🥉", label: "Juara 3", ring: "ring-orange-300", bar: "from-orange-300 to-amber-600", text: "text-orange-600", avatar: "h-14 w-14", pillar: "h-10", num: "text-orange-700" },
};

const Avatar = ({ name, avatar, className }) => (
  <div className={`relative overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-amber-500 ${className}`}>
    <span className="flex h-full w-full items-center justify-center font-black text-white">
      {(name || "?").charAt(0).toUpperCase()}
    </span>
    {avatar && (
      <img src={getAvatarUrl(avatar)} alt={name}
        className="absolute inset-0 h-full w-full object-cover"
        onError={(e) => { e.currentTarget.style.display = "none"; }} />
    )}
  </div>
);

const AttendanceLeaderboardModal = ({ open, onClose, highlightUserId }) => {
  const now = new Date();
  const [periode, setPeriode] = useState("bulan");
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [katIndex, setKatIndex] = useState(0);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      let url = `/absensi/leaderboard?periode=${periode}`;
      if (periode === "tahun") url += `&tahun=${tahun}`;
      else if (periode === "bulan") url += `&bulan=${bulan}&tahun=${tahun}`;
      const res = await api.get(url);
      setData(res.data?.data || null);
      setKatIndex(0);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [periode, bulan, tahun]);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  if (!open) return null;

  const categories = data?.categories || [];
  const current = categories[katIndex] || null;
  const ranking = current?.ranking || [];
  const podium = current?.winners || [];
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean); // J2 - J1 - J3
  const filtered = search
    ? ranking.filter((r) => (r.name || "").toLowerCase().includes(search.toLowerCase()))
    : ranking;

  return (
    <AnimatePresence>
      <Motion.div
        className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <Motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        >
          {/* Header */}
          <div className="relative shrink-0 bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-4 text-white">
            <button onClick={onClose} aria-label="Tutup"
              className="absolute right-3 top-3 rounded-full bg-white/20 p-1.5 transition hover:bg-white/30">
              <FiX className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <LuTrophy className="h-6 w-6" />
              <div>
                <h2 className="text-lg font-black leading-tight">Peringkat Absen Terbaik</h2>
                <p className="text-[11px] text-white/80">{data?.periode_label || "Memuat..."}</p>
              </div>
            </div>
          </div>

          {/* Filter periode */}
          <div className="shrink-0 space-y-2.5 border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex flex-1 rounded-xl bg-slate-100 p-0.5">
                {PERIODES.map((p) => (
                  <button key={p.key} onClick={() => setPeriode(p.key)}
                    className={`flex-1 rounded-lg py-1.5 text-[11px] font-bold uppercase tracking-wide transition ${
                      periode === p.key ? "bg-white text-orange-600 shadow-sm" : "text-slate-500"
                    }`}>{p.label}</button>
                ))}
              </div>
            </div>
            {periode !== "minggu" && (
              <div className="flex items-center gap-2">
                {periode === "bulan" && (
                  <select value={bulan} onChange={(e) => setBulan(parseInt(e.target.value))}
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20">
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                )}
                <input type="number" value={tahun} onChange={(e) => setTahun(parseInt(e.target.value))}
                  className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20" />
              </div>
            )}
            {/* Tab kategori */}
            {categories.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {categories.map((c, i) => (
                  <button key={c.key} onClick={() => { setKatIndex(i); setSearch(""); }}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
                      i === katIndex
                        ? "bg-orange-500 text-white shadow-sm"
                        : "bg-slate-100 text-slate-500 hover:bg-orange-50"
                    }`}>
                    {c.label} <span className="opacity-70">({c.total})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Konten */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16">
                <div className="relative h-10 w-10">
                  <div className="absolute inset-0 rounded-full border-4 border-orange-200" />
                  <div className="absolute inset-0 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
                </div>
                <p className="text-sm text-slate-400">Memuat peringkat...</p>
              </div>
            ) : !current || ranking.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <FiAward className="h-10 w-10 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">Belum ada data peringkat</p>
                <p className="text-xs text-slate-400">Coba kategori atau periode lain.</p>
              </div>
            ) : (
              <>
                {/* Podium */}
                <div className="relative mb-4 overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-b from-amber-50 to-white p-4">
                  <div className="mb-3 text-center text-[11px] font-black uppercase tracking-widest text-amber-600">
                    🏆 Podium {current.label}
                  </div>
                  <div className="flex items-end justify-center gap-2">
                    {podiumOrder.map((w) => {
                      const meta = RANK_META[w.rank];
                      const champ = w.rank === 1;
                      return (
                        <div key={w.rank} className={`flex w-1/3 max-w-[120px] flex-col items-center ${champ ? "z-10" : ""}`}>
                          {champ && <LuCrown className="mb-1 h-5 w-5 text-amber-400" />}
                          <div className={`relative ${meta.avatar} rounded-full bg-white p-[2px] shadow ring-4 ${meta.ring}`}>
                            <Avatar name={w.name} avatar={w.avatar} className="h-full w-full text-base" />
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-lg">{meta.medal}</div>
                          </div>
                          <p className={`mt-2 line-clamp-2 text-center font-bold leading-tight text-slate-800 ${champ ? "text-xs" : "text-[11px]"}`}>{w.name}</p>
                          <p className={`text-[10px] font-black ${meta.text}`}>{w.score} poin</p>
                          <div className={`mt-1.5 flex w-full ${meta.pillar} flex-col items-center justify-center rounded-t-lg bg-gradient-to-b ${meta.bar}`}>
                            <span className={`text-lg font-black ${meta.num}`}>{w.rank}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pencarian */}
                <div className="relative mb-3">
                  <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nama..."
                    className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20" />
                </div>

                {/* Daftar peringkat */}
                <div className="space-y-1.5">
                  {filtered.map((r) => {
                    const isMe = highlightUserId && Number(r.user_id) === Number(highlightUserId);
                    const medal = r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : null;
                    return (
                      <div key={r.user_id}
                        className={`flex items-center gap-3 rounded-xl border p-2.5 ${
                          isMe ? "border-orange-300 bg-orange-50" : r.rank <= 3 ? "border-amber-100 bg-amber-50/40" : "border-slate-100 bg-white"
                        }`}>
                        <div className="flex w-7 shrink-0 items-center justify-center">
                          {medal ? <span className="text-lg">{medal}</span>
                            : <span className="text-xs font-black text-slate-400">{r.rank}</span>}
                        </div>
                        <Avatar name={r.name} avatar={r.avatar} className="h-9 w-9 shrink-0 text-xs" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-800">
                            {r.name}{isMe && <span className="ml-1 text-[10px] font-black text-orange-500">(Anda)</span>}
                          </p>
                          <p className="truncate text-[11px] text-slate-400">
                            {r.attendance_days} hari hadir • datang {r.average_arrival}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-lg bg-amber-100 px-2 py-1 text-xs font-black tabular-nums text-amber-700">{r.score}</span>
                      </div>
                    );
                  })}
                  {filtered.length === 0 && (
                    <p className="py-8 text-center text-sm text-slate-400">Tidak ada nama yang cocok.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </Motion.div>
      </Motion.div>
    </AnimatePresence>
  );
};

export default AttendanceLeaderboardModal;
