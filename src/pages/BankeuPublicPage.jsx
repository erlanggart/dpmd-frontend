// src/pages/BankeuPublicPage.jsx
// Halaman publik Bantuan Keuangan - TANPA LOGIN
// Menampilkan data bankeu 2026 dan 2027 (proposal tracking) seperti di SPKED tapi read-only

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, MapPin, Users, DollarSign, BarChart3,
  ChevronDown, ChevronUp, Search, Building2, Shield, CheckCircle2,
  Activity, FileText, Info, Layers, ChevronRight, Landmark, X, Calendar
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import Footer from '../components/landingpage/Footer';
import { API_ENDPOINTS } from '../config/apiConfig';

// ─── CONSTANTS ──────────────────────────────────────────────────────
const STAGE_CONFIG = {
  di_desa: { label: 'Di Desa', icon: MapPin, color: 'from-slate-500 to-gray-600', bg: 'bg-slate-100', text: 'text-slate-700', hex: '#64748b' },
  di_dinas: { label: 'Di Dinas Terkait', icon: Building2, color: 'from-orange-500 to-amber-500', bg: 'bg-orange-100', text: 'text-orange-700', hex: '#f97316' },
  di_kecamatan: { label: 'Di Kecamatan', icon: Landmark, color: 'from-blue-500 to-indigo-500', bg: 'bg-blue-100', text: 'text-blue-700', hex: '#3b82f6' },
  di_dpmd: { label: 'Di DPMD', icon: Shield, color: 'from-purple-500 to-violet-600', bg: 'bg-purple-100', text: 'text-purple-700', hex: '#8b5cf6' },
  selesai: { label: 'Selesai', icon: CheckCircle2, color: 'from-emerald-500 to-green-500', bg: 'bg-emerald-100', text: 'text-emerald-700', hex: '#22c55e' },
};

const STAGE_ORDER = ['di_desa', 'di_dinas', 'di_kecamatan', 'di_dpmd', 'selesai'];

const PIE_COLORS = ['#64748b', '#f97316', '#3b82f6', '#8b5cf6', '#22c55e'];

// ─── HELPERS ────────────────────────────────────────────────────────
const formatRupiah = (value) => {
  if (!value || value === 0) return 'Rp 0';
  if (value >= 1e12) return `Rp ${(value / 1e12).toFixed(2)} T`;
  if (value >= 1e9) return `Rp ${(value / 1e9).toFixed(2)} M`;
  if (value >= 1e6) return `Rp ${(value / 1e6).toFixed(1)} Jt`;
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

const getStage = (p) => {
  if (p.dpmd_status === 'approved') return 'selesai';
  if (p.submitted_to_dpmd) return 'di_dpmd';
  if (p.kecamatan_status === 'approved') return 'di_dpmd';
  if (p.submitted_to_kecamatan && p.dinas_status === 'approved') return 'di_kecamatan';
  if (p.dinas_status === 'approved') return 'di_kecamatan';
  if (p.submitted_to_dinas_at) return 'di_dinas';
  return 'di_desa';
};

// ─── FLOW PIPELINE ──────────────────────────────────────────────────
const FlowPipeline = ({ stageStats, total }) => (
  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
        <Activity className="w-5 h-5 text-white" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-900">Alur Verifikasi Proposal</h3>
        <p className="text-sm text-gray-500">Status real-time pengajuan bantuan keuangan</p>
      </div>
    </div>

    {/* Desktop */}
    <div className="hidden md:flex items-center justify-between gap-2">
      {STAGE_ORDER.map((stage, i) => {
        const config = STAGE_CONFIG[stage];
        const Icon = config.icon;
        const count = stageStats[stage] || 0;
        const pct = total > 0 ? ((count / total) * 100).toFixed(0) : 0;
        return (
          <React.Fragment key={stage}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="flex-1 text-center">
              <div className={`mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br ${config.color} flex items-center justify-center shadow-lg mb-3`}>
                <Icon className="w-7 h-7 text-white" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-xs font-medium text-gray-500 mt-1">{config.label}</p>
              <div className="mt-2 mx-auto w-full max-w-[80px] bg-gray-200 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full bg-gradient-to-r ${config.color}`} style={{ width: `${Math.max(pct, 2)}%` }} />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">{pct}%</p>
            </motion.div>
            {i < STAGE_ORDER.length - 1 && <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0 mt-[-20px]" />}
          </React.Fragment>
        );
      })}
    </div>

    {/* Mobile */}
    <div className="md:hidden space-y-3">
      {STAGE_ORDER.map((stage, i) => {
        const config = STAGE_CONFIG[stage];
        const Icon = config.icon;
        const count = stageStats[stage] || 0;
        const pct = total > 0 ? ((count / total) * 100).toFixed(0) : 0;
        return (
          <motion.div key={stage} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
            className={`flex items-center gap-4 p-3 rounded-xl ${config.bg}`}>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center shadow-md flex-shrink-0`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{config.label}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-white/60 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full bg-gradient-to-r ${config.color}`} style={{ width: `${Math.max(pct, 2)}%` }} />
                </div>
                <span className="text-xs text-gray-500">{pct}%</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xl font-bold text-gray-900">{count}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  </div>
);

// ─── PROCESS INFO ───────────────────────────────────────────────────
const ProcessInfoSection = () => {
  const steps = [
    { step: '01', title: 'Pengajuan Desa', desc: 'Desa menyusun proposal dan mengupload dokumen persyaratan.', icon: FileText, color: 'from-slate-500 to-gray-600' },
    { step: '02', title: 'Review Dinas', desc: 'Dinas terkait mereview kelayakan teknis proposal.', icon: Building2, color: 'from-orange-500 to-amber-500' },
    { step: '03', title: 'Verifikasi Kecamatan', desc: 'Tim kecamatan memvalidasi kelengkapan dokumen.', icon: Landmark, color: 'from-blue-500 to-indigo-500' },
    { step: '04', title: 'Persetujuan DPMD', desc: 'DPMD Kab. Bogor melakukan approval akhir.', icon: Shield, color: 'from-purple-500 to-violet-600' },
    { step: '05', title: 'Pencairan Dana', desc: 'Dana dicairkan ke rekening pemerintah desa.', icon: CheckCircle2, color: 'from-emerald-500 to-green-500' },
  ];

  return (
    <div className="bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 rounded-3xl p-8 md:p-12 mt-8 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-72 h-72 bg-blue-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full blur-[120px]" />
      </div>
      <div className="relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-4">
            <Info className="w-4 h-4 text-blue-400" />
            <span className="text-blue-300 text-sm font-medium">Alur Proses</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Bagaimana Bantuan Keuangan Diproses?</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">5 tahapan verifikasi untuk transparansi dan akuntabilitas.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div key={step.step} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all group">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-xs font-bold text-gray-500 mb-1">TAHAP {step.step}</div>
                <h4 className="text-white font-semibold mb-2">{step.title}</h4>
                <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// ─── MAIN PAGE ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
const BankeuPublicPage = () => {
  const navigate = useNavigate();
  const [activeYear, setActiveYear] = useState(2026);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedKecamatan, setExpandedKecamatan] = useState({});
  const [selectedStage, setSelectedStage] = useState(null);

  // ─── Fetch Data ────────────────────────────────────────────────
  useEffect(() => {
    fetchData(activeYear);
  }, [activeYear]);

  const fetchData = async (tahun) => {
    setLoading(true);
    setSearchQuery('');
    setSelectedStage(null);
    setExpandedKecamatan({});
    try {
      const res = await fetch(`${API_ENDPOINTS.EXPRESS_BASE}/public/bankeu/tracking-summary?tahun_anggaran=${tahun}`);
      if (res.ok) {
        const json = await res.json();
        setProposals(json.proposals || []);
      } else {
        setProposals([]);
      }
    } catch {
      setProposals([]);
    } finally {
      setLoading(false);
    }
  };

  // ─── Process Data ──────────────────────────────────────────────
  const processed = useMemo(() => {
    let data = proposals;
    if (selectedStage) data = data.filter(d => d.stage === selectedStage);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(d =>
        d.desa?.toLowerCase().includes(q) ||
        d.kecamatan?.toLowerCase().includes(q) ||
        d.kegiatan?.toLowerCase().includes(q)
      );
    }
    return data;
  }, [proposals, selectedStage, searchQuery]);

  // Stage stats (always from all proposals, not filtered)
  const stageStats = useMemo(() => {
    const stats = {};
    STAGE_ORDER.forEach(s => { stats[s] = 0; });
    proposals.forEach(p => { stats[p.stage] = (stats[p.stage] || 0) + 1; });
    return stats;
  }, [proposals]);

  const totalProposals = proposals.length;
  const totalAnggaran = useMemo(() => processed.reduce((s, d) => s + (d.anggaran || 0), 0), [processed]);
  const totalKecamatan = useMemo(() => new Set(processed.map(d => d.kecamatan)).size, [processed]);
  const totalDesa = useMemo(() => new Set(processed.map(d => d.desa)).size, [processed]);

  // Kecamatan grouped
  const kecamatanGroup = useMemo(() => {
    const map = {};
    processed.forEach(d => {
      if (!map[d.kecamatan]) map[d.kecamatan] = { total: 0, count: 0, items: [] };
      map[d.kecamatan].total += (d.anggaran || 0);
      map[d.kecamatan].count += 1;
      map[d.kecamatan].items.push(d);
    });
    return Object.entries(map).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.total - a.total);
  }, [processed]);

  // Chart data - bar
  const barChartData = useMemo(() =>
    kecamatanGroup.slice(0, 10).map(k => ({ name: k.name, value: k.total })),
    [kecamatanGroup]
  );

  // Chart data - pie
  const pieChartData = useMemo(() =>
    STAGE_ORDER.map(s => ({ name: STAGE_CONFIG[s].label, value: stageStats[s] || 0 })).filter(d => d.value > 0),
    [stageStats]
  );

  const toggleKecamatan = useCallback((name) => {
    setExpandedKecamatan(prev => ({ ...prev, [name]: !prev[name] }));
  }, []);

  const resetFilters = () => {
    setSelectedStage(null);
    setSearchQuery('');
    setExpandedKecamatan({});
  };

  // ─── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="relative mx-auto w-16 h-16 mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-blue-200" />
            <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
          </div>
          <p className="text-gray-600 font-medium">Memuat data bantuan keuangan...</p>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      {/* ─── NAVBAR ──────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm">Beranda</span>
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo-bogor.png" alt="Logo" className="h-7" />
            <span className="hidden sm:inline text-sm font-bold text-gray-800">DPMD Kabupaten Bogor</span>
          </div>
        </div>
      </div>

      {/* ─── HERO ────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-[rgb(var(--color-primary))] via-blue-700 to-indigo-800 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-400/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4" />
        <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="px-3 py-1 bg-white/15 backdrop-blur-sm rounded-full border border-white/20 inline-block mb-4">
              <span className="text-cyan-200 text-xs font-semibold tracking-wide">TRANSPARANSI PUBLIK</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-3 leading-tight">
              Bantuan Keuangan<br className="hidden sm:block" /> Infrastruktur Desa
            </h1>
            <p className="text-blue-100/80 text-base md:text-lg max-w-2xl mb-8">
              Monitoring pengajuan dan verifikasi bantuan keuangan desa di Kabupaten Bogor.
            </p>

            {/* Year Tabs */}
            <div className="flex gap-2 bg-white/10 backdrop-blur-md rounded-2xl p-1.5 w-fit border border-white/15">
              {[2026, 2027].map((year) => (
                <button
                  key={year}
                  onClick={() => setActiveYear(year)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
                    activeYear === year ? 'bg-white text-gray-900 shadow-lg' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  TA {year}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ─── CONTENT ─────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Flow Pipeline */}
        <FlowPipeline stageStats={stageStats} total={totalProposals} />

        {/* Search + Stage Filters */}
        <div className="flex flex-wrap items-center gap-3 mt-6 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari kecamatan, desa, atau kegiatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 shadow-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {STAGE_ORDER.map((key) => {
              const config = STAGE_CONFIG[key];
              const Icon = config.icon;
              const isActive = selectedStage === key;
              const count = stageStats[key] || 0;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedStage(isActive ? null : key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    isActive
                      ? `bg-gradient-to-r ${config.color} text-white border-transparent shadow-md`
                      : `${config.bg} ${config.text} border-gray-200 hover:shadow-sm`
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {config.label}
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-white/30' : 'bg-white'}`}>{count}</span>
                </button>
              );
            })}
          </div>

          {(selectedStage || searchQuery) && (
            <button onClick={resetFilters} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
              <X className="w-3.5 h-3.5" /> Reset
            </button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Proposal', value: processed.length, icon: FileText, gradient: 'from-blue-500 to-indigo-600' },
            { label: 'Kecamatan', value: totalKecamatan, icon: MapPin, gradient: 'from-cyan-500 to-blue-600' },
            { label: 'Desa', value: totalDesa, icon: Users, gradient: 'from-violet-500 to-purple-600' },
            { label: 'Total Anggaran', isRupiah: true, rupiahValue: totalAnggaran, icon: DollarSign, gradient: 'from-emerald-500 to-green-600' },
          ].map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-5 shadow-lg`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white/80 text-xs font-medium">{card.label}</p>
                    <p className="text-xl md:text-2xl font-bold text-white truncate">
                      {card.isRupiah ? formatRupiah(card.rupiahValue) : card.value}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Pie Chart - Stage Distribution */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Distribusi Tahapan Verifikasi
            </h3>
            <div className="h-72">
              {pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieChartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip formatter={(value) => [`${value} proposal`, 'Jumlah']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400"><p>Belum ada data</p></div>
              )}
            </div>
          </div>

          {/* Bar Chart - Top Kecamatan */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              Top 10 Kecamatan - Anggaran Usulan
            </h3>
            <div className="h-72">
              {barChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tickFormatter={(v) => formatRupiah(v)} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                    <RechartsTooltip formatter={(value) => [formatRupiah(value), 'Anggaran']} />
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400"><p>Belum ada data</p></div>
              )}
            </div>
          </div>
        </div>

        {/* Kecamatan Detail Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-600" />
              Detail Proposal per Kecamatan
              <span className="text-xs font-normal text-gray-400 ml-1">
                {processed.length} proposal · {totalKecamatan} kecamatan
              </span>
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {kecamatanGroup.map((kec, i) => {
              const isExpanded = expandedKecamatan[kec.name];
              return (
                <div key={kec.name}>
                  <button
                    onClick={() => toggleKecamatan(kec.name)}
                    className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-gray-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm">
                        {i + 1}
                      </span>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900 text-sm">{kec.name}</p>
                        <p className="text-xs text-gray-500">{kec.count} proposal · {formatRupiah(kec.total)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* mini stage badges */}
                      <div className="hidden sm:flex gap-1">
                        {STAGE_ORDER.map(s => {
                          const cnt = kec.items.filter(d => d.stage === s).length;
                          if (cnt === 0) return null;
                          return (
                            <span key={s} className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${STAGE_CONFIG[s].bg} ${STAGE_CONFIG[s].text}`}>
                              {cnt}
                            </span>
                          );
                        })}
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                        <div className="bg-gray-50/50 border-t border-gray-100">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="text-xs text-gray-500 uppercase tracking-wider">
                                  <th className="px-5 py-2.5 text-left w-12">No</th>
                                  <th className="px-5 py-2.5 text-left">Desa</th>
                                  <th className="px-5 py-2.5 text-left">Kegiatan</th>
                                  <th className="px-5 py-2.5 text-left">Dinas Terkait</th>
                                  <th className="px-5 py-2.5 text-left">Tahap</th>
                                  <th className="px-5 py-2.5 text-right">Anggaran</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {kec.items.map((p, j) => {
                                  const sc = STAGE_CONFIG[p.stage] || STAGE_CONFIG.di_desa;
                                  return (
                                    <tr key={j} className="hover:bg-white transition-colors">
                                      <td className="px-5 py-2.5 text-xs text-gray-500">{j + 1}</td>
                                      <td className="px-5 py-2.5 text-sm font-medium text-gray-900">{p.desa}</td>
                                      <td className="px-5 py-2.5 text-sm text-gray-700 max-w-[200px] truncate" title={p.kegiatan}>{p.kegiatan}</td>
                                      <td className="px-5 py-2.5 text-xs text-gray-500">{p.dinas_terkait}</td>
                                      <td className="px-5 py-2.5">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>
                                          {sc.label}
                                        </span>
                                      </td>
                                      <td className="px-5 py-2.5 text-sm font-semibold text-gray-900 text-right">{formatRupiah(p.anggaran)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
            {kecamatanGroup.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium text-lg">Tidak ada data ditemukan</p>
                <p className="text-sm mt-1">
                  {proposals.length === 0
                    ? `Belum ada proposal untuk TA ${activeYear}`
                    : 'Coba ubah kata kunci atau reset filter'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Process Info */}
        <ProcessInfoSection />
      </div>

      <Footer />
    </div>
  );
};

export default BankeuPublicPage;
