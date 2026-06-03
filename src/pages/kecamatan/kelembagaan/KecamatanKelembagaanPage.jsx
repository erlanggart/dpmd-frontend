import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api";
import {
  LuBuilding2,
  LuMapPin,
  LuClock,
  LuCircleCheck,
  LuRefreshCw,
  LuSearch,
  LuChevronDown,
  LuChevronUp,
  LuChevronRight,
  LuArrowRight,
  LuCheck,
  LuX,
  LuEye,
  LuShield,
} from "react-icons/lu";

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_VER = {
  verified:   { label: "Terverifikasi",      bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500" },
  unverified: { label: "Belum Diverifikasi",  bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
  ditolak:    { label: "Ditolak",             bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500" },
};

function VerBadge({ status }) {
  const cfg = STATUS_VER[status] || STATUS_VER.unverified;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Summary top-bar ────────────────────────────────────────────────────────

function SummaryCards({ summary }) {
  if (!summary) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: "Total Desa",          val: summary.total_desa,       color: "text-violet-600", bg: "bg-white",     border: "border-gray-100" },
        { label: "Total Lembaga",       val: summary.total_lembaga,    color: "text-gray-800",   bg: "bg-white",     border: "border-gray-100" },
        { label: "Belum Diverifikasi",  val: summary.total_unverified, color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-100" },
        { label: "Terverifikasi",       val: summary.total_verified,   color: "text-green-600",  bg: "bg-green-50",  border: "border-green-100" },
      ].map((s) => (
        <div key={s.label} className={`${s.bg} rounded-xl border ${s.border} shadow-sm p-4 text-center`}>
          <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
          <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Progress bar ────────────────────────────────────────────────────────────

function VerifikasiProgressBar({ desaStats }) {
  const total   = desaStats.length;
  const inputted = desaStats.filter((d) => d.total_lembaga > 0).length;
  const started  = desaStats.filter((d) => d.total_lembaga > 0 && d.total_verified > 0).length;
  const done     = desaStats.filter((d) => d.total_lembaga > 0 && d.total_unverified === 0 && d.total_verified > 0).length;

  const steps = [
    { label: "Input Desa",            done: inputted, icon: LuBuilding2,    color: { bg: "bg-violet-600", bar: "bg-violet-500", light: "bg-violet-50", text: "text-violet-700" } },
    { label: "Verifikasi Kecamatan",  done: started,  icon: LuShield,       color: { bg: "bg-blue-600",   bar: "bg-blue-500",   light: "bg-blue-50",   text: "text-blue-700"   } },
    { label: "Selesai Verifikasi",    done: done,     icon: LuCircleCheck,  color: { bg: "bg-green-600",  bar: "bg-green-500",  light: "bg-green-50",  text: "text-green-700"  } },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Progress Verifikasi</p>
      <div className="flex items-stretch gap-1">
        {steps.map((s, i) => {
          const pct = total > 0 ? Math.round((s.done / total) * 100) : 0;
          const Icon = s.icon;
          const c = s.color;
          return (
            <React.Fragment key={i}>
              <div className={`flex-1 rounded-xl p-3.5 ${c.light} min-w-0`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg ${c.bg} text-white`}><Icon className="w-3.5 h-3.5" /></div>
                  <p className={`text-xs font-semibold ${c.text} truncate`}>{s.label}</p>
                  {pct === 100 && <span className="ml-auto text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">✓</span>}
                </div>
                <div className="h-1.5 bg-white/60 rounded-full overflow-hidden mb-1">
                  <div className={`h-full ${c.bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <p className={`text-[11px] font-bold ${c.text}`}>{s.done}/{total} desa</p>
              </div>
              {i < steps.length - 1 && <LuArrowRight className="w-4 h-4 text-gray-300 self-center flex-shrink-0" />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ─── RW/RT Tab ───────────────────────────────────────────────────────────────

function RwRtTab({ rwList, desaId, navigate }) {
  const [openRw, setOpenRw] = useState({});

  if (!rwList || rwList.length === 0) {
    return <EmptyTab label="RW" desc="Belum ada data RW yang diinput oleh desa ini." />;
  }

  return (
    <div className="space-y-2">
      {rwList.map((rw) => {
        const isOpen = !!openRw[rw.id];
        const rtTotal   = rw.rts?.length ?? 0;
        const rtVerif   = rw.rts?.filter((r) => r.status_verifikasi === "verified").length ?? 0;
        const rtUnverif = rw.rts?.filter((r) => r.status_verifikasi !== "verified").length ?? 0;

        return (
          <div key={rw.id} className="rounded-xl border border-blue-100 overflow-hidden">
            {/* RW header row */}
            <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100/70 transition-colors">
              <button
                onClick={() => setOpenRw((p) => ({ ...p, [rw.id]: !p[rw.id] }))}
                className="flex items-center gap-2 flex-1 text-left min-w-0"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {String(rw.nomor).padStart(2, "0")}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-blue-900 text-sm">RW {rw.nomor}</p>
                  <p className="text-[11px] text-blue-600">
                    {rtTotal} RT
                    {rtTotal > 0 && ` · ${rtVerif} terverif`}
                    {rtUnverif > 0 && ` · ${rtUnverif} pending`}
                  </p>
                </div>
                {isOpen ? <LuChevronUp className="w-4 h-4 text-blue-400 ml-auto flex-shrink-0" /> : <LuChevronDown className="w-4 h-4 text-blue-400 ml-auto flex-shrink-0" />}
              </button>

              <VerBadge status={rw.status_verifikasi} />

              <button
                onClick={() => navigate(`/kecamatan/kelembagaan/${desaId}/rw/${rw.id}`)}
                className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium transition-colors"
              >
                <LuEye className="w-3.5 h-3.5" /> Detail
              </button>
            </div>

            {/* RT rows */}
            {isOpen && (
              <div className="bg-white">
                {rw.rts && rw.rts.length > 0 ? (
                  rw.rts.map((rt) => (
                    <div
                      key={rt.id}
                      className="flex items-center gap-3 px-4 py-2.5 border-t border-blue-50 hover:bg-gray-50/80 cursor-pointer"
                      onClick={() => navigate(`/kecamatan/kelembagaan/${desaId}/rt/${rt.id}`)}
                    >
                      <div className="w-7 h-7 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs flex-shrink-0 ml-4">
                        {String(rt.nomor).padStart(2, "0")}
                      </div>
                      <p className="text-sm text-gray-700 flex-1">RT {rt.nomor}</p>
                      <VerBadge status={rt.status_verifikasi} />
                      <LuChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  ))
                ) : (
                  <p className="px-6 py-3 text-xs text-gray-400 italic">Belum ada RT terdaftar</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Posyandu Tab ────────────────────────────────────────────────────────────

function PosyanduTab({ posyanduList, desaId, navigate }) {
  if (!posyanduList || posyanduList.length === 0) {
    return <EmptyTab label="Posyandu" desc="Belum ada data Posyandu yang diinput oleh desa ini." />;
  }

  return (
    <div className="space-y-2">
      {posyanduList.map((p) => (
        <div
          key={p.id}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-pink-100 bg-pink-50/40 hover:bg-pink-50 transition-colors cursor-pointer"
          onClick={() => navigate(`/kecamatan/kelembagaan/${desaId}/posyandu/${p.id}`)}
        >
          <div className="w-9 h-9 rounded-xl bg-pink-500 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">
            P
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 text-sm truncate">{p.nama}</p>
            <p className="text-[11px] text-gray-500">Posyandu</p>
          </div>
          <VerBadge status={p.status_verifikasi} />
          <LuChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ─── Lembaga Lain Tab ────────────────────────────────────────────────────────

const SINGLETON_CONFIG = [
  { key: "karang_taruna", label: "Karang Taruna", color: "orange", route: "karang-taruna" },
  { key: "lpm",           label: "LPM",           color: "purple", route: "lpm"           },
  { key: "pkk",           label: "PKK",            color: "rose",   route: "pkk"           },
  { key: "satlinmas",     label: "Satlinmas",      color: "teal",   route: "satlinmas"     },
];

const COLOR_MAP = {
  orange: { bg: "bg-orange-50", border: "border-orange-200", icon: "bg-orange-500", text: "text-orange-700" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", icon: "bg-purple-500", text: "text-purple-700" },
  rose:   { bg: "bg-rose-50",   border: "border-rose-200",   icon: "bg-rose-500",   text: "text-rose-700"   },
  teal:   { bg: "bg-teal-50",   border: "border-teal-200",   icon: "bg-teal-500",   text: "text-teal-700"   },
};

function LembagaLainTab({ singletons, lembagaLainnyaList, desaId, navigate }) {
  return (
    <div className="space-y-4">
      {/* Singleton grid */}
      <div className="grid grid-cols-2 gap-3">
        {SINGLETON_CONFIG.map((cfg) => {
          const data = singletons?.[cfg.key];
          const terbentuk = !!data;
          const c = COLOR_MAP[cfg.color];

          return (
            <div
              key={cfg.key}
              className={`rounded-xl border p-3.5 transition-all ${c.bg} ${c.border} ${terbentuk ? "cursor-pointer hover:brightness-95" : ""}`}
              onClick={terbentuk && data?.id ? () => navigate(`/kecamatan/kelembagaan/${desaId}/${cfg.route}/${data.id}`) : undefined}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-lg ${c.icon} text-white flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                  {cfg.label.charAt(0)}
                </div>
                <p className={`font-semibold text-sm ${c.text} truncate`}>{cfg.label}</p>
                {terbentuk && <LuChevronRight className={`w-3.5 h-3.5 ml-auto ${c.text} flex-shrink-0`} />}
              </div>

              {terbentuk ? (
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                    <LuCheck className="w-3 h-3" /> Terbentuk
                  </span>
                  <VerBadge status={data.status_verifikasi} />
                </div>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                  <LuX className="w-3 h-3" /> Belum terbentuk
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Lembaga Lainnya */}
      {lembagaLainnyaList && lembagaLainnyaList.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Lembaga Lainnya</p>
          <div className="space-y-2">
            {lembagaLainnyaList.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => navigate(`/kecamatan/kelembagaan/${desaId}/lembaga-lainnya/${l.id}`)}
              >
                <div className="w-8 h-8 rounded-lg bg-gray-400 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  L
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{l.nama}</p>
                  <p className="text-[11px] text-gray-400">Lembaga Lainnya</p>
                </div>
                <VerBadge status={l.status_verifikasi} />
                <LuChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* all empty */}
      {SINGLETON_CONFIG.every((c) => !singletons?.[c.key]) &&
       (!lembagaLainnyaList || lembagaLainnyaList.length === 0) && (
        <EmptyTab label="Lembaga Lain" desc="Belum ada data lembaga lain yang diinput." />
      )}
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyTab({ label, desc }) {
  return (
    <div className="py-10 text-center">
      <LuBuilding2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
      <p className="text-sm font-medium text-gray-500">{label} belum ada</p>
      {desc && <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">{desc}</p>}
    </div>
  );
}

// ─── Desa card dengan tabs ───────────────────────────────────────────────────

const TABS = [
  { key: "rw_rt",       label: "RW & RT",       color: "blue"   },
  { key: "posyandu",    label: "Posyandu",       color: "pink"   },
  { key: "lembaga_lain",label: "Lembaga Lain",   color: "gray"   },
];

const TAB_ACTIVE = {
  blue: "border-blue-500   text-blue-600   bg-blue-50",
  pink: "border-pink-500   text-pink-600   bg-pink-50",
  gray: "border-gray-500   text-gray-600   bg-gray-50",
};
const TAB_INACTIVE = "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50";

function DesaGroupCard({ group, expanded, onToggle, navigate }) {
  const { desa, total_lembaga, total_verified, total_unverified } = group;

  const [activeTab, setActiveTab]   = useState("rw_rt");
  const [detail, setDetail]         = useState(null);
  const [loadingDetail, setLoading] = useState(false);

  // Fetch detail when first expanded
  useEffect(() => {
    if (!expanded || detail) return;
    setLoading(true);
    api.get(`/kecamatan/kelembagaan/desa/${desa.id}/detail`)
      .then((r) => setDetail(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [expanded, desa.id, detail]);

  const pct          = total_lembaga > 0 ? Math.round((total_verified / total_lembaga) * 100) : 0;
  const allVerified  = total_unverified === 0 && total_lembaga > 0;
  const hasUnverified = total_unverified > 0;

  const borderColor = hasUnverified ? "border-yellow-200" : allVerified ? "border-green-200" : "border-gray-200";
  const headerBg    = hasUnverified ? "from-yellow-50 to-amber-50" : allVerified ? "from-green-50 to-emerald-50" : "from-gray-50 to-slate-50";

  return (
    <div className={`rounded-2xl border ${borderColor} shadow-sm overflow-hidden`}>
      {/* ── Accordion header ── */}
      <button
        onClick={onToggle}
        className={`w-full bg-gradient-to-r ${headerBg} px-5 py-4 flex items-center justify-between hover:brightness-95 transition-all`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-xl shadow-sm">
            <LuMapPin className="w-5 h-5 text-violet-600" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-gray-800">Desa {desa.nama}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              {hasUnverified && (
                <span className="text-[11px] font-semibold text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <LuClock className="w-3 h-3" /> {total_unverified} Menunggu
                </span>
              )}
              {allVerified && total_lembaga > 0 && (
                <span className="text-[11px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <LuCircleCheck className="w-3 h-3" /> Selesai
                </span>
              )}
              {total_lembaga === 0 && (
                <span className="text-[11px] text-gray-400">Belum ada data</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {total_lembaga > 0 && (
            <div className="hidden sm:flex flex-col items-end gap-1">
              <div className="w-20 h-1.5 bg-white/80 rounded-full overflow-hidden shadow-inner">
                <div
                  className={`h-full rounded-full transition-all ${allVerified ? "bg-green-500" : "bg-violet-500"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[11px] text-gray-500">{pct}% terverif</span>
            </div>
          )}
          {expanded ? <LuChevronUp className="w-5 h-5 text-gray-400" /> : <LuChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </button>

      {/* ── Expanded content ── */}
      {expanded && (
        <div className="bg-white">
          {/* Tab bar */}
          <div className="flex border-b border-gray-100 px-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 sm:flex-none px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                  activeTab === tab.key ? TAB_ACTIVE[tab.color] : TAB_INACTIVE
                }`}
              >
                {tab.label}
                {tab.key === "rw_rt" && detail && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                    {(detail.rw_list?.length ?? 0)}
                  </span>
                )}
                {tab.key === "posyandu" && detail && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-pink-100 text-pink-700 text-[10px] font-bold">
                    {(detail.posyandu_list?.length ?? 0)}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-4">
            {loadingDetail ? (
              <div className="flex items-center justify-center py-10 gap-3">
                <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-400">Memuat data...</span>
              </div>
            ) : detail ? (
              <>
                {activeTab === "rw_rt" && (
                  <RwRtTab rwList={detail.rw_list} desaId={desa.id} navigate={navigate} />
                )}
                {activeTab === "posyandu" && (
                  <PosyanduTab posyanduList={detail.posyandu_list} desaId={desa.id} navigate={navigate} />
                )}
                {activeTab === "lembaga_lain" && (
                  <LembagaLainTab
                    singletons={detail.singletons}
                    lembagaLainnyaList={detail.lembaga_lainnya_list}
                    desaId={desa.id}
                    navigate={navigate}
                  />
                )}
              </>
            ) : (
              <div className="py-8 text-center text-gray-400 text-sm">Gagal memuat data desa.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function KecamatanKelembagaanPage() {
  const navigate = useNavigate();
  const [desaGroups, setDesaGroups]     = useState([]);
  const [summary, setSummary]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [expandedDesa, setExpandedDesa] = useState({});
  const [searchQuery, setSearchQuery]   = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [lembagaRes, summaryRes] = await Promise.all([
        api.get("/kecamatan/kelembagaan/lembaga-per-desa"),
        api.get("/kecamatan/kelembagaan/lembaga-per-desa/summary"),
      ]);
      setDesaGroups(lembagaRes.data.data || []);
      setSummary(summaryRes.data.data || null);
    } catch (error) {
      console.error("Error fetching kelembagaan data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filteredGroups = searchQuery
    ? desaGroups.filter((g) => g.desa.nama.toLowerCase().includes(searchQuery.toLowerCase()))
    : desaGroups;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Memuat data kelembagaan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <LuBuilding2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Verifikasi Kelembagaan</h1>
              <p className="text-violet-100 text-sm mt-0.5">
                Pantau dan verifikasi data lembaga desa di wilayah kecamatan
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-all disabled:opacity-60"
          >
            <LuRefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{refreshing ? "Memuat..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <SummaryCards summary={summary} />

      {/* ── Progress bar ── */}
      {desaGroups.length > 0 && <VerifikasiProgressBar desaStats={desaGroups} />}

      {/* ── Desa list ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Search + controls */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama desa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          {filteredGroups.length > 0 && (
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  const all = {};
                  filteredGroups.forEach((g) => { all[g.desa.id] = true; });
                  setExpandedDesa(all);
                }}
                className="text-xs text-violet-600 hover:underline whitespace-nowrap"
              >
                Buka Semua
              </button>
              <span className="text-gray-300 text-xs">·</span>
              <button
                onClick={() => setExpandedDesa({})}
                className="text-xs text-gray-500 hover:underline whitespace-nowrap"
              >
                Tutup
              </button>
            </div>
          )}
        </div>

        {filteredGroups.length === 0 ? (
          <div className="py-16 text-center">
            <LuBuilding2 className="w-14 h-14 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-medium">
              {searchQuery ? "Tidak ada desa yang sesuai pencarian" : "Belum ada data kelembagaan"}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <p className="text-xs text-gray-400">{filteredGroups.length} desa</p>
            {filteredGroups.map((group) => (
              <DesaGroupCard
                key={group.desa.id}
                group={group}
                expanded={!!expandedDesa[group.desa.id]}
                onToggle={() => {
                  const id = group.desa.id;
                  setExpandedDesa((prev) => ({ ...prev, [id]: !prev[id] }));
                }}
                navigate={navigate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
