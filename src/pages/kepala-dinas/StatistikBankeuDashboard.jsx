// src/pages/kepala-dinas/StatistikBankeuDashboard.jsx
// Statistik Bankeu untuk Core Dashboard - UI sama dengan landing page
// Menggunakan authenticated endpoint + export Excel

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Users, DollarSign, BarChart3,
  ChevronDown, ChevronUp, Search, Building2, CheckCircle2,
  Activity, FileText, Layers, ChevronRight, Landmark, X, Calendar,
  TrendingUp, ArrowUpRight, Globe, Eye,
  CheckCircle, XCircle, Info, Download, RefreshCw
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar
} from 'recharts';
import api from '../../api';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { useDataCache } from '../../context/DataCacheContext';

// ─── CONSTANTS ──────────────────────────────────────────────────────
const STAGE_CONFIG = {
  di_desa: { label: 'Di Desa', icon: MapPin, color: 'from-slate-500 to-gray-600', bg: 'bg-slate-100', text: 'text-slate-700', hex: '#64748b' },
  di_dinas: { label: 'Di Dinas Terkait', icon: Building2, color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', text: 'text-amber-700', hex: '#f59e0b' },
  di_kecamatan: { label: 'Di Kecamatan', icon: Landmark, color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50', text: 'text-blue-700', hex: '#3b82f6' },
  selesai: { label: 'Di DPMD', icon: CheckCircle2, color: 'from-emerald-500 to-green-600', bg: 'bg-emerald-50', text: 'text-emerald-700', hex: '#10b981' },
};

const STAGE_ORDER = ['di_desa', 'di_dinas', 'di_kecamatan', 'selesai'];
const PIE_COLORS = ['#64748b', '#f59e0b', '#3b82f6', '#10b981'];

// ─── HELPERS ────────────────────────────────────────────────────────
const formatRupiah = (value) => {
  if (!value || value === 0) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

const formatRupiahShort = (value) => {
  if (!value || value === 0) return 'Rp 0';
  if (value >= 1e12) return `Rp ${(value / 1e12).toFixed(2)} Triliun`;
  if (value >= 1e9) return `Rp ${(value / 1e9).toFixed(2)} Miliar`;
  if (value >= 1e6) return `Rp ${(value / 1e6).toFixed(0)} Juta`;
  if (value >= 1e3) return `Rp ${(value / 1e3).toFixed(0)} Ribu`;
  return formatRupiah(value);
};

const CountUp = ({ end, duration = 1.2 }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (typeof end !== 'number' || isNaN(end)) return;
    let start = 0;
    const increment = end / (duration * 60);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [end, duration]);
  return <>{typeof end === 'number' ? count : end}</>;
};

const getProposalStage = (proposal) => {
  if (proposal.dpmd_status === 'approved') return 'selesai';
  if (proposal.submitted_to_dpmd) return 'selesai';
  if (proposal.kecamatan_status === 'approved') return 'selesai';
  if (proposal.submitted_to_kecamatan && proposal.dinas_status === 'approved') return 'di_kecamatan';
  if (proposal.dinas_status === 'approved') return 'di_kecamatan';
  if (proposal.submitted_to_kecamatan) return 'di_kecamatan';
  if (proposal.submitted_to_dinas_at) return 'di_dinas';
  return 'di_desa';
};

// ─── EXECUTIVE HERO ─────────────────────────────────────────────────
const ExecutiveHero = ({ activeYear, setActiveYear, summary, totalAnggaran, totalProposals, showDetailAnggaran, setShowDetailAnggaran, onRefresh, onExport, loading }) => {
  const desaPct = summary?.total_desa ? Math.round((summary.desa_mengusulkan / summary.total_desa) * 100) : 0;

  return (
    <div className="relative overflow-hidden rounded-2xl mb-6">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]" />
      <div className="absolute inset-0">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-500/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-30%] left-[-5%] w-[500px] h-[500px] bg-emerald-500/6 rounded-full blur-[100px]" />
        <div className="absolute top-[20%] left-[40%] w-[300px] h-[300px] bg-amber-500/5 rounded-full blur-[80px]" />
      </div>
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
        {/* Top Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-blue-400 uppercase tracking-[0.15em]">Dashboard Statistik</p>
              <p className="text-xs text-slate-400">Bantuan Keuangan · Data Real-Time</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex bg-white/[0.06] backdrop-blur-md rounded-xl p-1 border border-white/10">
              {[2026, 2027].map((year) => (
                <button key={year} onClick={() => setActiveYear(year)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                    activeYear === year ? 'bg-white text-slate-900 shadow-lg shadow-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}>
                  <Calendar className="w-3.5 h-3.5" />
                  TA {year}
                </button>
              ))}
            </div>
            <button onClick={onRefresh} disabled={loading}
              className="w-10 h-10 rounded-xl bg-white/[0.06] backdrop-blur-md border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onExport}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-all text-sm font-semibold">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
          </div>
        </div>

        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-[1.1] mb-2">
            Rekapitulasi Bantuan
            <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Keuangan Desa
            </span>
          </h1>
          <p className="text-slate-400 text-sm max-w-xl mt-2 leading-relaxed">
            Monitoring pengajuan dan verifikasi bantuan keuangan infrastruktur desa Kabupaten Bogor.
          </p>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
          {/* Anggaran Card - Spans 2 */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="col-span-2 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-sm border border-emerald-500/20 rounded-2xl p-5 sm:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-emerald-400/80 text-xs font-semibold tracking-wide uppercase">Total Anggaran Usulan</p>
                    <button
                      onClick={() => setShowDetailAnggaran(!showDetailAnggaran)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                        showDetailAnggaran
                          ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                          : 'bg-white/10 text-slate-400 border border-white/10 hover:bg-white/15 hover:text-slate-300'
                      }`}
                    >
                      {showDetailAnggaran ? 'Singkat' : 'Detail'}
                    </button>
                  </div>
                  <p
                    onClick={() => setShowDetailAnggaran(!showDetailAnggaran)}
                    className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mt-2 tracking-tight cursor-pointer hover:text-emerald-100 transition-colors"
                    title={showDetailAnggaran ? 'Klik untuk tampilan singkat' : 'Klik untuk tampilan detail'}
                  >
                    {showDetailAnggaran ? formatRupiah(totalAnggaran) : formatRupiahShort(totalAnggaran)}
                  </p>
                  <p className="text-slate-400 text-xs mt-2">TA {activeYear} · {totalProposals} proposal aktif</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Total Proposal */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-400" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white"><CountUp end={totalProposals} /></p>
              <p className="text-slate-400 text-xs mt-1">Total Proposal</p>
            </div>
          </motion.div>

          {/* Partisipasi Desa */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                </div>
                <span className="text-xs font-bold text-amber-400">{desaPct}%</span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white"><CountUp end={summary?.desa_mengusulkan || 0} /></p>
              <p className="text-slate-400 text-xs mt-1">Desa Mengusulkan</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// ─── DESA PARTICIPATION GAUGE ───────────────────────────────────────
const DesaParticipationCard = ({ summary }) => {
  if (!summary) return null;
  const { total_desa = 0, desa_mengusulkan = 0, desa_belum_mengusulkan = 0 } = summary;
  const pct = total_desa > 0 ? Math.round((desa_mengusulkan / total_desa) * 100) : 0;

  const gaugeData = [{ name: 'Sudah', value: pct, fill: '#10b981' }];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Users className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">Partisipasi Desa</h3>
          <p className="text-[11px] text-gray-400">Desa yang sudah mengajukan ke dinas terkait</p>
        </div>
      </div>

      <div className="flex items-center justify-center -mt-2 mb-2">
        <div className="relative w-44 h-44">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="72%" outerRadius="100%" startAngle={90} endAngle={-270} data={gaugeData} barSize={14}>
              <RadialBar background={{ fill: '#f1f5f9' }} clockWise dataKey="value" cornerRadius={10} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-3xl font-black text-gray-900">{pct}%</p>
            <p className="text-[10px] text-gray-400 font-medium">Partisipasi</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="text-center bg-slate-50 rounded-xl p-3">
          <p className="text-lg font-black text-slate-800">{total_desa}</p>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">Total Desa</p>
        </div>
        <div className="text-center bg-emerald-50 rounded-xl p-3">
          <p className="text-lg font-black text-emerald-600">{desa_mengusulkan}</p>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Sudah</p>
        </div>
        <div className="text-center bg-red-50 rounded-xl p-3">
          <p className="text-lg font-black text-red-500">{desa_belum_mengusulkan}</p>
          <p className="text-[10px] text-red-500 font-medium mt-0.5">Belum</p>
        </div>
      </div>

      <p className="text-[10px] text-gray-400 text-center mt-3 italic">
        * Hanya Desa (bukan Kelurahan) · Total {total_desa} desa
      </p>
    </motion.div>
  );
};

// ─── DESA PARTISIPASI SECTION ───────────────────────────────────────
const DesaPartisipasiSection = ({ desaPartisipasi, summary }) => {
  const [activeTab, setActiveTab] = useState('belum');
  const [searchKec, setSearchKec] = useState('');
  const [expandedKec, setExpandedKec] = useState({});

  if (!desaPartisipasi || Object.keys(desaPartisipasi).length === 0) return null;

  const kecamatanList = Object.entries(desaPartisipasi)
    .map(([kecName, data]) => ({
      name: kecName,
      sudah: data.sudah || [],
      belum: data.belum || [],
    }))
    .filter(k => {
      if (!searchKec) return true;
      const q = searchKec.toLowerCase();
      return k.name.toLowerCase().includes(q) ||
        k.sudah.some(d => d.toLowerCase().includes(q)) ||
        k.belum.some(d => d.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      if (activeTab === 'belum') return b.belum.length - a.belum.length;
      return b.sudah.length - a.sudah.length;
    });

  const totalSudah = summary?.desa_mengusulkan || 0;
  const totalBelum = summary?.desa_belum_mengusulkan || 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 via-white to-slate-50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Partisipasi Desa per Kecamatan</h3>
              <p className="text-[11px] text-gray-400">Desa yang sudah mengirim proposal ke dinas terkait</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveTab('belum')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                activeTab === 'belum'
                  ? 'bg-red-50 text-red-700 border-red-200 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}>
              <XCircle className="w-3.5 h-3.5" />
              Belum Kirim <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold ml-0.5">{totalBelum}</span>
            </button>
            <button onClick={() => setActiveTab('sudah')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                activeTab === 'sudah'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}>
              <CheckCircle className="w-3.5 h-3.5" />
              Sudah Kirim <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold ml-0.5">{totalSudah}</span>
            </button>
          </div>
        </div>
        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari kecamatan atau desa..."
            value={searchKec}
            onChange={(e) => setSearchKec(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
          />
          {searchKec && (
            <button onClick={() => setSearchKec('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
        {kecamatanList.map((kec) => {
          const items = activeTab === 'sudah' ? kec.sudah : kec.belum;
          const isExpanded = expandedKec[kec.name];
          if (items.length === 0 && !searchKec) return null;

          return (
            <div key={kec.name}>
              <button
                onClick={() => setExpandedKec(prev => ({ ...prev, [kec.name]: !prev[kec.name] }))}
                className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50/80 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold ${
                    activeTab === 'belum'
                      ? items.length > 0 ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-gradient-to-br from-emerald-500 to-green-600'
                      : items.length > 0 ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-gradient-to-br from-gray-400 to-gray-500'
                  }`}>
                    {items.length}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 text-sm group-hover:text-violet-700 transition-colors">{kec.name}</p>
                    <p className="text-[11px] text-gray-400">
                      {activeTab === 'belum'
                        ? <><span className="text-red-500 font-medium">{kec.belum.length} belum</span> · <span className="text-emerald-600">{kec.sudah.length} sudah</span></>
                        : <><span className="text-emerald-600 font-medium">{kec.sudah.length} sudah</span> · <span className="text-red-500">{kec.belum.length} belum</span></>
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {items.length > 0 && (
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                      isExpanded ? 'bg-violet-100' : 'bg-gray-100 group-hover:bg-gray-200'
                    }`}>
                      {isExpanded ? <ChevronUp className="w-3 h-3 text-violet-600" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                    </div>
                  )}
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && items.length > 0 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="px-6 pb-3">
                      <div className="flex flex-wrap gap-1.5">
                        {items.sort().map((desaName, i) => (
                          <span key={i} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                            activeTab === 'sudah'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {activeTab === 'sudah'
                              ? <CheckCircle className="w-3 h-3" />
                              : <XCircle className="w-3 h-3" />
                            }
                            {desaName}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
        {kecamatanList.filter(k => (activeTab === 'sudah' ? k.sudah.length : k.belum.length) > 0).length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{activeTab === 'sudah' ? 'Belum ada desa yang mengirim' : 'Semua desa sudah mengirim'}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ─── FLOW PIPELINE ──────────────────────────────────────────────────
const FlowPipeline = ({ stageStats, total }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full">
    <div className="flex items-center gap-2 mb-5">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
        <Activity className="w-4 h-4 text-white" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-gray-900">Alur Verifikasi</h3>
        <p className="text-[11px] text-gray-400">Status real-time pengajuan bankeu</p>
      </div>
    </div>

    {/* Desktop */}
    <div className="hidden md:flex items-stretch gap-3">
      {STAGE_ORDER.map((stage, i) => {
        const config = STAGE_CONFIG[stage];
        const Icon = config.icon;
        const count = stageStats[stage] || 0;
        const pct = total > 0 ? ((count / total) * 100).toFixed(0) : 0;
        return (
          <React.Fragment key={stage}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}
              className="flex-1 relative group">
              <div className={`h-full bg-gradient-to-br ${config.color} rounded-xl p-4 text-white shadow-md group-hover:shadow-lg transition-all group-hover:scale-[1.02]`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-white/60 tracking-wider">TAHAP {String(i + 1).padStart(2, '0')}</span>
                </div>
                <p className="text-2xl font-black">{count}</p>
                <p className="text-xs font-medium text-white/70 mt-0.5">{config.label}</p>
                <div className="mt-3 bg-white/20 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-white/60 rounded-full transition-all duration-700" style={{ width: `${Math.max(pct, 3)}%` }} />
                </div>
                <p className="text-[10px] text-white/50 mt-1">{pct}%</p>
              </div>
            </motion.div>
            {i < STAGE_ORDER.length - 1 && (
              <div className="flex items-center -mx-1.5 z-10">
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>

    {/* Mobile */}
    <div className="md:hidden space-y-2">
      {STAGE_ORDER.map((stage, i) => {
        const config = STAGE_CONFIG[stage];
        const Icon = config.icon;
        const count = stageStats[stage] || 0;
        const pct = total > 0 ? ((count / total) * 100).toFixed(0) : 0;
        return (
          <motion.div key={stage} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center shadow-md flex-shrink-0`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{config.label}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full bg-gradient-to-r ${config.color}`} style={{ width: `${Math.max(pct, 3)}%` }} />
                </div>
                <span className="text-[10px] text-gray-500 font-medium">{pct}%</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xl font-black text-gray-900">{count}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  </motion.div>
);

// ─── PROCESS INFO ───────────────────────────────────────────────────
const ProcessInfoSection = () => {
  const steps = [
    { step: '01', title: 'Pengajuan Desa', desc: 'Desa menyusun proposal dan mengupload dokumen persyaratan bantuan keuangan.', icon: FileText, color: 'from-slate-500 to-gray-600' },
    { step: '02', title: 'Review Dinas Terkait', desc: 'Dinas terkait mereview kelayakan teknis dan kesesuaian proposal.', icon: Building2, color: 'from-amber-500 to-orange-600' },
    { step: '03', title: 'Verifikasi Kecamatan', desc: 'Tim verifikasi kecamatan memvalidasi kelengkapan dan kebenaran data.', icon: Landmark, color: 'from-blue-500 to-indigo-600' },
    { step: '04', title: 'Verifikasi DPMD', desc: 'DPMD Kab. Bogor melakukan verifikasi akhir dan persetujuan bantuan.', icon: CheckCircle2, color: 'from-emerald-500 to-green-600' },
  ];

  return (
    <div className="relative bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] rounded-3xl overflow-hidden mt-8">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-72 h-72 bg-blue-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/8 rounded-full blur-[100px]" />
      </div>
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="relative p-8 md:p-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-full px-4 py-1.5 mb-4">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-blue-400 text-xs font-semibold tracking-wide">ALUR PROSES</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-2">Bagaimana Bankeu Diproses?</h2>
          <p className="text-slate-400 text-sm max-w-lg mx-auto">4 tahapan verifikasi berjenjang untuk menjamin transparansi dan akuntabilitas.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div key={step.step} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6 hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-300 group">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 tracking-widest">TAHAP {step.step}</span>
                </div>
                <h4 className="text-white font-bold text-sm mb-2">{step.title}</h4>
                <p className="text-slate-400 text-xs leading-relaxed">{step.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// ─── MAIN COMPONENT ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
const StatistikBankeuDashboard = () => {
  const [activeYear, setActiveYear] = useState(2026);
  const [proposals, setProposals] = useState([]);
  const [summary, setSummary] = useState(null);
  const [desaPartisipasi, setDesaPartisipasi] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingPartisipasi, setLoadingPartisipasi] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPartisipasi, setShowPartisipasi] = useState(false);
  const [expandedKecamatan, setExpandedKecamatan] = useState({});
  const [expandedDesa, setExpandedDesa] = useState({});
  const [selectedStage, setSelectedStage] = useState(null);
  const [kecPage, setKecPage] = useState(1);
  const [kecPerPage, setKecPerPage] = useState(5);
  const [showDetailAnggaran, setShowDetailAnggaran] = useState(false);
  const { getCachedData, setCachedData, isCached, clearCache } = useDataCache();

  useEffect(() => {
    const cacheKey = `statistik-bankeu-${activeYear}`;
    if (isCached(cacheKey)) {
      const cached = getCachedData(cacheKey).data;
      setProposals(cached.proposals);
      setSummary(cached.summary);
      setDesaPartisipasi(cached.desaPartisipasi);
      setLoading(false);
    } else {
      fetchData();
    }
  }, [activeYear]);

  const fetchData = async () => {
    setLoading(true);
    setSearchQuery('');
    setSelectedStage(null);
    setExpandedKecamatan({});
    setExpandedDesa({});
    let processedProposals = [];
    let summaryData = null;
    let partisipasiData = {};
    try {
      // FASE 1: Fetch proposals (data utama) — tampilkan UI segera setelah ini
      const response = await api.get(`/dpmd/bankeu/tracking?tahun_anggaran=${activeYear}`);
      if (response.data.success) {
        const rawProposals = response.data.data || [];
        processedProposals = rawProposals.map(item => {
          const kecamatan = item.desas?.kecamatans?.nama || 'Tidak Diketahui';
          const desa = item.desas?.nama || 'Tidak Diketahui';
          const kegiatan = item.bankeu_master_kegiatan?.nama_kegiatan || item.nama_kegiatan_spesifik || '-';
          const dinas_terkait = item.bankeu_master_kegiatan?.dinas_terkait || '-';
          const anggaran = Number(item.anggaran_usulan) || 0;
          const stage = getProposalStage(item);
          return { ...item, kecamatan, desa, kegiatan, dinas_terkait, anggaran, stage };
        });
        setProposals(processedProposals);
      }
      // Tampilkan UI utama dulu
      setLoading(false);

      // FASE 2: Fetch partisipasi desa (secondary data, di background)
      setLoadingPartisipasi(true);
      try {
        const publicRes = await api.get(`/public/bankeu/tracking-summary?tahun_anggaran=${activeYear}`);
        if (publicRes.data.success) {
          summaryData = publicRes.data.summary || null;
          partisipasiData = publicRes.data.desa_partisipasi || {};
          setSummary(summaryData);
          setDesaPartisipasi(partisipasiData);
        } else {
          setSummary(null);
          setDesaPartisipasi({});
        }
      } catch {
        setSummary(null);
        setDesaPartisipasi({});
      } finally {
        setLoadingPartisipasi(false);
      }

      // Save to cache
      setCachedData(`statistik-bankeu-${activeYear}`, {
        proposals: processedProposals,
        summary: summaryData,
        desaPartisipasi: partisipasiData,
      });
    } catch (err) {
      console.error('Error fetching Bankeu data:', err);
      toast.error('Gagal memuat data Bantuan Keuangan');
      setProposals([]);
      setSummary(null);
      setDesaPartisipasi({});
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    const exportData = proposals.map(item => ({
      'Kecamatan': item.kecamatan,
      'Desa': item.desa,
      'Kegiatan': item.kegiatan,
      'Dinas Terkait': item.dinas_terkait,
      'Anggaran Usulan': item.anggaran,
      'Status Dinas': item.dinas_status || 'pending',
      'Status Kecamatan': item.kecamatan_status || 'pending',
      'Status DPMD': item.dpmd_status || 'pending',
      'Tahap': STAGE_CONFIG[item.stage]?.label || item.stage
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Bankeu ${activeYear}`);
    XLSX.writeFile(wb, `Bantuan_Keuangan_${activeYear}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Data berhasil diekspor ke Excel');
  };

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

  const stageStats = useMemo(() => {
    const stats = {};
    STAGE_ORDER.forEach(s => { stats[s] = 0; });
    proposals.forEach(p => { stats[p.stage] = (stats[p.stage] || 0) + 1; });
    return stats;
  }, [proposals]);

  const totalProposals = proposals.length;
  const totalAnggaran = useMemo(() => proposals.reduce((s, d) => s + (d.anggaran || 0), 0), [proposals]);
  const filteredAnggaran = useMemo(() => processed.reduce((s, d) => s + (d.anggaran || 0), 0), [processed]);
  const totalKecamatan = useMemo(() => new Set(processed.map(d => d.kecamatan)).size, [processed]);
  const totalDesa = useMemo(() => new Set(processed.map(d => d.desa)).size, [processed]);

  const kecamatanGroup = useMemo(() => {
    const map = {};
    processed.forEach(d => {
      if (!map[d.kecamatan]) map[d.kecamatan] = { total: 0, count: 0, desas: {} };
      map[d.kecamatan].total += (d.anggaran || 0);
      map[d.kecamatan].count += 1;
      const desaKey = d.desa;
      if (!map[d.kecamatan].desas[desaKey]) map[d.kecamatan].desas[desaKey] = { total: 0, count: 0, items: [] };
      map[d.kecamatan].desas[desaKey].total += (d.anggaran || 0);
      map[d.kecamatan].desas[desaKey].count += 1;
      map[d.kecamatan].desas[desaKey].items.push(d);
    });
    return Object.entries(map).map(([name, data]) => ({
      name, total: data.total, count: data.count,
      desas: Object.entries(data.desas).map(([desaName, desaData]) => ({ name: desaName, ...desaData })).sort((a, b) => b.total - a.total)
    })).sort((a, b) => b.total - a.total);
  }, [processed]);

  const barChartData = useMemo(() =>
    kecamatanGroup.slice(0, 10).map(k => ({ name: k.name, value: k.total })),
    [kecamatanGroup]
  );

  const pieChartData = useMemo(() =>
    STAGE_ORDER.map(s => ({ name: STAGE_CONFIG[s].label, value: stageStats[s] || 0 })).filter(d => d.value > 0),
    [stageStats]
  );

  const toggleKecamatan = useCallback((name) => {
    setExpandedKecamatan(prev => ({ ...prev, [name]: !prev[name] }));
  }, []);

  const toggleDesa = useCallback((key) => {
    setExpandedDesa(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const resetFilters = () => {
    setSelectedStage(null);
    setSearchQuery('');
    setExpandedKecamatan({});
    setExpandedDesa({});
    setKecPage(1);
  };

  // Reset page when filters change
  useEffect(() => { setKecPage(1); }, [searchQuery, selectedStage]);

  // Pagination for kecamatan detail
  const kecTotalPages = Math.max(1, Math.ceil(kecamatanGroup.length / kecPerPage));
  const paginatedKecamatan = useMemo(() => {
    const start = (kecPage - 1) * kecPerPage;
    return kecamatanGroup.slice(start, start + kecPerPage);
  }, [kecamatanGroup, kecPage, kecPerPage]);

  const getPageNumbers = useCallback((current, total) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [1];
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="relative mx-auto w-16 h-16 mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
            <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
          </div>
          <p className="text-gray-500 font-medium">Memuat data bantuan keuangan...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-0">
      {/* Hero */}
      <ExecutiveHero
        activeYear={activeYear}
        setActiveYear={setActiveYear}
        summary={summary}
        totalAnggaran={totalAnggaran}
        totalProposals={totalProposals}
        showDetailAnggaran={showDetailAnggaran}
        setShowDetailAnggaran={setShowDetailAnggaran}
        onRefresh={() => { clearCache(`statistik-bankeu-${activeYear}`); fetchData(); }}
        onExport={handleExportExcel}
        loading={loading}
      />

      {/* Pipeline + Partisipasi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <FlowPipeline stageStats={stageStats} total={totalProposals} />
        </div>
        {loadingPartisipasi ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full border-3 border-gray-200 border-t-violet-500 animate-spin" />
              <p className="text-xs text-gray-400">Memuat partisipasi...</p>
            </div>
          </div>
        ) : (
          <DesaParticipationCard summary={summary} />
        )}
      </div>

      {/* Partisipasi Desa per Kecamatan - Collapsible */}
      <div className="mb-6">
        <button
          onClick={() => setShowPartisipasi(prev => !prev)}
          className="w-full flex items-center justify-between px-6 py-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-violet-200 transition-colors group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-gray-900 text-sm">Partisipasi Desa per Kecamatan</h3>
              <p className="text-[11px] text-gray-400">Klik untuk {showPartisipasi ? 'menyembunyikan' : 'menampilkan'} detail partisipasi desa</p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-400 group-hover:text-violet-500 transition-transform duration-200 ${showPartisipasi ? 'rotate-180' : ''}`} />
        </button>
        {showPartisipasi && (
          <div className="mt-3">
            {loadingPartisipasi ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 mx-auto mb-2 rounded-full border-3 border-gray-200 border-t-violet-500 animate-spin" />
                  <p className="text-xs text-gray-400">Memuat data partisipasi desa...</p>
                </div>
              </div>
            ) : (
              <DesaPartisipasiSection desaPartisipasi={desaPartisipasi} summary={summary} />
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
              <button key={key} onClick={() => setSelectedStage(isActive ? null : key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                  isActive
                    ? `bg-gradient-to-r ${config.color} text-white border-transparent shadow-md scale-[1.02]`
                    : `bg-white ${config.text} border-gray-200 hover:shadow-sm hover:border-gray-300`
                }`}>
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{config.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-white/30' : config.bg}`}>{count}</span>
              </button>
            );
          })}
        </div>
        {(selectedStage || searchQuery) && (
          <button onClick={resetFilters} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors border border-red-200">
            <X className="w-3.5 h-3.5" /> Reset
          </button>
        )}
      </div>

      {/* Filter Summary */}
      {(selectedStage || searchQuery) && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <Eye className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <p className="text-xs text-blue-800">
            Menampilkan <span className="font-bold">{processed.length}</span> proposal
            {selectedStage && <> · Tahap: <span className="font-bold">{STAGE_CONFIG[selectedStage].label}</span></>}
            {searchQuery && <> · Pencarian: &quot;<span className="font-bold">{searchQuery}</span>&quot;</>}
            {' '}· Total: <span className="font-bold">{formatRupiah(filteredAnggaran)}</span>
          </p>
        </motion.div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Distribusi Tahapan</h3>
          </div>
          <div className="h-64">
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie data={pieChartData} cx="50%" cy="45%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value"
                    label={false}
                    labelLine={false}>
                    {pieChartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="white" strokeWidth={2} />)}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                    formatter={(value, name) => [`${value} proposal`, name]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400"><p>Belum ada data</p></div>
            )}
          </div>
          {/* Legend */}
          {pieChartData.length > 0 && (
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2">
              {pieChartData.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-[11px] text-gray-600 font-medium">{entry.name}</span>
                  <span className="text-[11px] text-gray-400 font-bold">{entry.value}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Top 10 Kecamatan</h3>
          </div>
          <div className="h-64">
            {barChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={barChartData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tickFormatter={(v) => formatRupiahShort(v)} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: '#475569' }} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                    formatter={(value) => [formatRupiah(value), 'Anggaran']} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {barChartData.map((_, i) => <Cell key={i} fill={i === 0 ? '#3b82f6' : i < 3 ? '#60a5fa' : '#93c5fd'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400"><p>Belum ada data</p></div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Kecamatan Detail */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Detail per Kecamatan &amp; Desa</h3>
                <p className="text-[11px] text-gray-400">{processed.length} proposal · {totalKecamatan} kecamatan · {totalDesa} desa</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Per-page selector */}
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-[11px] text-gray-400">Tampilkan</span>
                <select
                  value={kecPerPage}
                  onChange={(e) => { setKecPerPage(Number(e.target.value)); setKecPage(1); }}
                  className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer"
                >
                  {[5, 10, 20, 40].map(n => <option key={n} value={n}>{n} kecamatan</option>)}
                </select>
              </div>
              {processed.length > 0 && (
                <div className="hidden sm:block text-right">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Total Anggaran</p>
                  <p className="text-sm font-bold text-gray-800">{formatRupiahShort(filteredAnggaran)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {paginatedKecamatan.map((kec, i) => {
            const isKecExpanded = expandedKecamatan[kec.name];
            const allKecItems = kec.desas.flatMap(d => d.items);
            const globalIndex = (kecPage - 1) * kecPerPage + i;
            return (
              <div key={kec.name}>
                <button onClick={() => toggleKecamatan(kec.name)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50/80 transition-colors group">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm group-hover:scale-105 transition-transform">
                      {globalIndex + 1}
                    </span>
                    <div className="text-left">
                      <p className="font-bold text-gray-900 text-sm group-hover:text-indigo-700 transition-colors">{kec.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{kec.desas.length} desa · {kec.count} proposal · <span className="font-medium text-gray-600">{formatRupiahShort(kec.total)}</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex gap-1">
                      {STAGE_ORDER.map(s => {
                        const cnt = allKecItems.filter(d => d.stage === s).length;
                        if (cnt === 0) return null;
                        return (
                          <span key={s} className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${STAGE_CONFIG[s].bg} ${STAGE_CONFIG[s].text}`}>
                            {cnt}
                          </span>
                        );
                      })}
                    </div>
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${isKecExpanded ? 'bg-indigo-100' : 'bg-gray-100 group-hover:bg-gray-200'}`}>
                      {isKecExpanded ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                    </div>
                  </div>
                </button>

                <AnimatePresence>
                  {isKecExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="bg-gray-50/50 border-t border-gray-100 divide-y divide-gray-100/80">
                        {kec.desas.map((desa, di) => {
                          const desaKey = `${kec.name}__${desa.name}`;
                          const isDesaExpanded = expandedDesa[desaKey];
                          return (
                            <div key={desa.name}>
                              <button onClick={() => toggleDesa(desaKey)}
                                className="w-full pl-14 pr-6 py-3 flex items-center justify-between hover:bg-blue-50/50 transition-colors group">
                                <div className="flex items-center gap-3">
                                  <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                                    {di + 1}
                                  </span>
                                  <div className="text-left">
                                    <p className="font-semibold text-gray-800 text-sm group-hover:text-blue-700 transition-colors">{desa.name}</p>
                                    <p className="text-xs text-gray-400">{desa.count} proposal · {formatRupiah(desa.total)}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="hidden sm:flex gap-1">
                                    {STAGE_ORDER.map(s => {
                                      const cnt = desa.items.filter(d => d.stage === s).length;
                                      if (cnt === 0) return null;
                                      return (
                                        <span key={s} className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${STAGE_CONFIG[s].bg} ${STAGE_CONFIG[s].text}`}>
                                          {cnt}
                                        </span>
                                      );
                                    })}
                                  </div>
                                  {isDesaExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                                </div>
                              </button>

                              <AnimatePresence>
                                {isDesaExpanded && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                                    <div className="bg-white border-t border-gray-100 ml-14 mr-4 mb-3 rounded-xl overflow-hidden shadow-sm border border-gray-200">
                                      <div className="overflow-x-auto">
                                        <table className="w-full">
                                          <thead>
                                            <tr className="text-[11px] text-gray-500 uppercase tracking-wider bg-gray-50/80">
                                              <th className="px-4 py-2.5 text-left w-10">No</th>
                                              <th className="px-4 py-2.5 text-left">Kegiatan</th>
                                              <th className="px-4 py-2.5 text-left">Dinas Terkait</th>
                                              <th className="px-4 py-2.5 text-left">Tahap</th>
                                              <th className="px-4 py-2.5 text-right">Anggaran</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-50">
                                            {desa.items.map((p, j) => {
                                              const sc = STAGE_CONFIG[p.stage] || STAGE_CONFIG.di_desa;
                                              return (
                                                <tr key={j} className="hover:bg-blue-50/30 transition-colors">
                                                  <td className="px-4 py-2.5 text-xs text-gray-400 font-medium">{j + 1}</td>
                                                  <td className="px-4 py-2.5 text-sm text-gray-700 font-medium" title={p.kegiatan}>{p.kegiatan}</td>
                                                  <td className="px-4 py-2.5 text-xs text-gray-500">{p.dinas_terkait}</td>
                                                  <td className="px-4 py-2.5">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${sc.bg} ${sc.text}`}>
                                                      {sc.label}
                                                    </span>
                                                  </td>
                                                  <td className="px-4 py-2.5 text-xs font-bold text-gray-900 text-right whitespace-nowrap">{formatRupiah(p.anggaran)}</td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                          <tfoot>
                                            <tr className="bg-gray-50/80">
                                              <td colSpan={4} className="px-4 py-2.5 text-[11px] text-gray-500 text-right font-semibold">Total Anggaran Desa</td>
                                              <td className="px-4 py-2.5 text-xs font-black text-gray-900 text-right whitespace-nowrap">{formatRupiah(desa.total)}</td>
                                            </tr>
                                          </tfoot>
                                        </table>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
          {kecamatanGroup.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-semibold text-lg text-gray-500">Tidak ada data ditemukan</p>
              <p className="text-sm mt-2 text-gray-400 max-w-sm mx-auto">
                {proposals.length === 0
                  ? `Belum ada proposal bantuan keuangan untuk TA ${activeYear}`
                  : 'Coba ubah kata kunci pencarian atau reset filter'}
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {kecamatanGroup.length > kecPerPage && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gradient-to-r from-slate-50 via-white to-slate-50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Info text */}
              <p className="text-xs text-gray-500">
                Menampilkan <span className="font-bold text-gray-700">{(kecPage - 1) * kecPerPage + 1}</span>
                {' '}&ndash;{' '}
                <span className="font-bold text-gray-700">{Math.min(kecPage * kecPerPage, kecamatanGroup.length)}</span>
                {' '}dari <span className="font-bold text-gray-700">{kecamatanGroup.length}</span> kecamatan
              </p>

              {/* Page controls */}
              <div className="flex items-center gap-1">
                {/* Prev */}
                <button
                  onClick={() => setKecPage(p => Math.max(1, p - 1))}
                  disabled={kecPage === 1}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                    kecPage === 1
                      ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'
                  }`}
                >
                  <ChevronDown className="w-3.5 h-3.5 rotate-90" /> Prev
                </button>

                {/* Page numbers */}
                {getPageNumbers(kecPage, kecTotalPages).map((pg, idx) =>
                  pg === '...' ? (
                    <span key={`dots-${idx}`} className="px-2 py-2 text-xs text-gray-400">···</span>
                  ) : (
                    <button
                      key={pg}
                      onClick={() => setKecPage(pg)}
                      className={`min-w-[36px] h-9 rounded-lg text-xs font-bold border transition-colors ${
                        kecPage === pg
                          ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-transparent shadow-md'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'
                      }`}
                    >
                      {pg}
                    </button>
                  )
                )}

                {/* Next */}
                <button
                  onClick={() => setKecPage(p => Math.min(kecTotalPages, p + 1))}
                  disabled={kecPage === kecTotalPages}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                    kecPage === kecTotalPages
                      ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'
                  }`}
                >
                  Next <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      <ProcessInfoSection />
    </div>
  );
};

export default StatistikBankeuDashboard;
