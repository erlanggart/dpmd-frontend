// src/pages/BankeuPublicPage.jsx
// Dashboard Eksekutif Bantuan Keuangan - Premium Design for Bupati
// Clean, Elegant, Easy to Understand

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, MapPin, Users, DollarSign, BarChart3,
  ChevronDown, ChevronUp, Building2, CheckCircle2,
  FileText, Layers, ChevronRight, Landmark, Calendar,
  Briefcase, Search, AlertCircle, Eye
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip
} from 'recharts';
import Footer from '../components/landingpage/Footer';
import { API_ENDPOINTS } from '../config/apiConfig';

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS & HELPERS
// ═══════════════════════════════════════════════════════════════════
const STAGE_CONFIG = {
  di_desa: { label: 'Desa', fullLabel: 'Di Desa', icon: MapPin, color: '#64748b', gradient: 'from-slate-500 to-slate-600' },
  di_dinas: { label: 'Dinas', fullLabel: 'Di Dinas Terkait', icon: Building2, color: '#f59e0b', gradient: 'from-amber-500 to-orange-500' },
  di_kecamatan: { label: 'Kecamatan', fullLabel: 'Di Kecamatan', icon: Landmark, color: '#3b82f6', gradient: 'from-blue-500 to-indigo-500' },
  selesai: { label: 'DPMD', fullLabel: 'Di DPMD (Final)', icon: CheckCircle2, color: '#10b981', gradient: 'from-emerald-500 to-teal-500' },
};
const STAGE_ORDER = ['di_desa', 'di_dinas', 'di_kecamatan', 'selesai'];

const formatRupiah = (value) => {
  if (!value || value === 0) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

const formatRupiahShort = (value) => {
  if (!value || value === 0) return 'Rp 0';
  if (value >= 1e12) return `Rp ${(value / 1e12).toFixed(2)} T`;
  if (value >= 1e9) return `Rp ${(value / 1e9).toFixed(2)} M`;
  if (value >= 1e6) return `Rp ${(value / 1e6).toFixed(1)} Jt`;
  return formatRupiah(value);
};

// Helper to format based on mode: 'short' or 'full'
const formatAnggaran = (value, mode = 'short') => {
  return mode === 'short' ? formatRupiahShort(value) : formatRupiah(value);
};

// Smooth number animation with requestAnimationFrame (optimized)
const AnimatedNumber = React.memo(({ value, duration = 1.2 }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (typeof value !== 'number' || isNaN(value) || value === 0) {
      setDisplay(value || 0);
      return;
    }
    let startTime = null;
    let animationId = null;
    
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      // Easing function for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(eased * value));
      
      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      } else {
        setDisplay(value);
      }
    };
    
    animationId = requestAnimationFrame(animate);
    return () => animationId && cancelAnimationFrame(animationId);
  }, [value, duration]);
  return <>{display.toLocaleString('id-ID')}</>;
});

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
};

// ═══════════════════════════════════════════════════════════════════
// HERO SECTION - Clean Executive Header
// ═══════════════════════════════════════════════════════════════════
const HeroSection = React.memo(({ activeYear, setActiveYear, totalAnggaran, totalProposals, summary, anggaranFinal }) => {
  const [formatMode, setFormatMode] = useState('short');
  const desaPct = summary?.total_desa ? Math.round((summary.desa_mengusulkan / summary.total_desa) * 100) : 0;

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Static background gradients (optimized - no animation) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl" />
      </div>
      
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.015]" 
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Header */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <motion.p 
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
              className="text-blue-400 text-xs font-bold tracking-[0.2em] uppercase mb-2"
            >
              Dashboard Eksekutif
            </motion.p>
            <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
              Bantuan Keuangan <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Desa</span>
            </h1>
            <p className="text-slate-400 text-sm mt-2">Kabupaten Bogor · Real-time Monitoring</p>
          </div>
          
          {/* Year Selector */}
          <div className="flex items-center gap-2 bg-white/5 backdrop-blur-xl rounded-2xl p-1.5 border border-white/10">
            {[2026, 2027].map((year) => (
              <motion.button
                key={year}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveYear(year)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  activeYear === year 
                    ? 'bg-white text-slate-900 shadow-xl shadow-white/20' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4" />
                TA {year}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Main KPI Cards */}
        <motion.div 
          variants={staggerContainer} 
          initial="hidden" 
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5"
        >
          {/* Total Anggaran Usulan */}
          <motion.div variants={scaleIn} className="md:col-span-2 lg:col-span-2">
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/20 to-teal-500/10 backdrop-blur-xl rounded-3xl p-6 border border-emerald-500/20 h-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-emerald-400" />
                    </div>
                    <span className="text-emerald-400/80 text-xs font-semibold uppercase tracking-wider">Total Usulan</span>
                  </div>
                  <button
                    onClick={() => setFormatMode(formatMode === 'short' ? 'full' : 'short')}
                    className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-semibold text-emerald-300 transition-colors"
                  >
                    {formatMode === 'short' ? 'Detail' : 'Singkat'}
                  </button>
                </div>
                <p className="text-3xl lg:text-4xl font-black text-white tracking-tight leading-none">
                  {formatAnggaran(totalAnggaran, formatMode)}
                </p>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10">
                  <span className="text-xs text-slate-400">Final di DPMD:</span>
                  <span className="text-sm font-bold text-emerald-400">{formatAnggaran(anggaranFinal, formatMode)}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Total Proposal */}
          <motion.div variants={scaleIn}>
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 h-full hover:bg-white/[0.08] transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <p className="text-3xl lg:text-4xl font-black text-white">
                <AnimatedNumber value={totalProposals} />
              </p>
              <p className="text-slate-400 text-sm mt-2">Total Proposal</p>
            </div>
          </motion.div>

          {/* Partisipasi Desa */}
          <motion.div variants={scaleIn}>
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 h-full hover:bg-white/[0.08] transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-amber-400" />
                </div>
                <span className="text-xs font-bold text-amber-400 bg-amber-500/20 px-2 py-1 rounded-lg">{desaPct}%</span>
              </div>
              <p className="text-3xl lg:text-4xl font-black text-white">
                <AnimatedNumber value={summary?.desa_mengusulkan || 0} />
              </p>
              <p className="text-slate-400 text-sm mt-2">Desa Mengusulkan</p>
              <p className="text-[11px] text-slate-500 mt-1">dari {summary?.total_desa || 0} desa</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════
// FLOW PIPELINE - Verification Progress
// ═══════════════════════════════════════════════════════════════════
const FlowPipeline = React.memo(({ stageStats, total }) => {
  return (
    <motion.div 
      variants={fadeInUp} 
      initial="hidden" 
      whileInView="visible" 
      viewport={{ once: true }}
      className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 lg:p-8"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Alur Verifikasi</h2>
          <p className="text-sm text-slate-500 mt-1">Progres pengajuan proposal bantuan keuangan</p>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden md:flex items-center justify-between gap-3">
        {STAGE_ORDER.map((stage, i) => {
          const config = STAGE_CONFIG[stage];
          const Icon = config.icon;
          const count = stageStats[stage] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const isLast = i === STAGE_ORDER.length - 1;

          return (
            <React.Fragment key={stage}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.02, y: -4 }}
                className="flex-1"
              >
                <div className={`relative bg-gradient-to-br ${config.gradient} rounded-2xl p-5 text-white shadow-lg overflow-hidden`}
                  style={{ boxShadow: `0 10px 40px -10px ${config.color}50` }}>
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold text-white/60 tracking-wider uppercase">Tahap {i + 1}</span>
                    </div>
                    <p className="text-3xl font-black mb-1">{count}</p>
                    <p className="text-sm font-medium text-white/80">{config.fullLabel}</p>
                    <div className="mt-4 bg-white/20 rounded-full h-2 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: `${Math.max(pct, 3)}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.3 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full bg-white/80 rounded-full"
                      />
                    </div>
                    <p className="text-xs text-white/50 mt-2">{pct}% dari total</p>
                  </div>
                </div>
              </motion.div>
              
              {!isLast && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex-shrink-0"
                >
                  <ChevronRight className="w-6 h-6 text-slate-300" />
                </motion.div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-3">
        {STAGE_ORDER.map((stage, i) => {
          const config = STAGE_CONFIG[stage];
          const Icon = config.icon;
          const count = stageStats[stage] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <motion.div
              key={stage}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r ${config.gradient} text-white`}
            >
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold">{config.fullLabel}</p>
                  <p className="text-xl font-black">{count}</p>
                </div>
                <div className="bg-white/20 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-white/80 rounded-full" style={{ width: `${Math.max(pct, 3)}%` }} />
                </div>
                <p className="text-[10px] text-white/60 mt-1">{pct}% dari total</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
});

// ═══════════════════════════════════════════════════════════════════
// PROGRAM BUDGET SECTION - Final Budget at DPMD (Grouped by Dinas)
// ═══════════════════════════════════════════════════════════════════
const ProgramBudgetSection = React.memo(({ anggaranPerProgram }) => {
  const [expandedDinas, setExpandedDinas] = useState({});
  const [formatMode, setFormatMode] = useState('short');
  
  if (!anggaranPerProgram?.programs?.length) return null;

  const { programs, total_anggaran_final, total_desa_final, total_proposal_final } = anggaranPerProgram;

  // Group by dinas
  const dinasGroups = useMemo(() => {
    const groups = {};
    programs.forEach(p => {
      const dinas = p.dinas_terkait || 'Lainnya';
      if (!groups[dinas]) groups[dinas] = { programs: [], total: 0, proposals: 0, desas: new Set() };
      groups[dinas].programs.push(p);
      groups[dinas].total += p.total_anggaran;
      groups[dinas].proposals += p.jumlah_proposal;
    });
    return Object.entries(groups)
      .map(([name, data]) => ({ name, programs: data.programs, total: data.total, proposals: data.proposals }))
      .sort((a, b) => b.total - a.total);
  }, [programs]);

  const colors = [
    { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
    { bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
    { bg: 'bg-violet-500', light: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100' },
    { bg: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
    { bg: 'bg-cyan-500', light: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-100' },
  ];

  const toggleDinas = (name) => {
    setExpandedDinas(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 lg:px-8 py-6 bg-gradient-to-r from-emerald-50 via-white to-teal-50 border-b border-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <motion.div 
              whileHover={{ rotate: 5, scale: 1.05 }}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25"
            >
              <Briefcase className="w-7 h-7 text-white" />
            </motion.div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Anggaran Final per Program</h2>
              <p className="text-sm text-slate-500 mt-0.5">Proposal yang sudah sampai di DPMD</p>
            </div>
          </div>

          {/* Summary Cards + Toggle */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setFormatMode(formatMode === 'short' ? 'full' : 'short')}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-600 transition-colors"
            >
              {formatMode === 'short' ? 'Detail' : 'Singkat'}
            </button>
            <div className="px-4 py-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl text-white shadow-lg shadow-emerald-500/25">
              <p className="text-lg font-black">{formatAnggaran(total_anggaran_final, formatMode)}</p>
              <p className="text-[10px] text-emerald-100 font-medium">Total Final</p>
            </div>
            <div className="px-4 py-3 bg-blue-50 rounded-2xl border border-blue-100 text-center">
              <p className="text-xl font-bold text-blue-600">{total_proposal_final}</p>
              <p className="text-[10px] text-blue-500">Proposal</p>
            </div>
            <div className="px-4 py-3 bg-amber-50 rounded-2xl border border-amber-100 text-center">
              <p className="text-xl font-bold text-amber-600">{total_desa_final}</p>
              <p className="text-[10px] text-amber-500">Desa</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dinas Groups */}
      <div className="divide-y divide-slate-100">
        {dinasGroups.map((dinas, di) => {
          const colorScheme = colors[di % colors.length];
          const isExpanded = expandedDinas[dinas.name] !== false; // Default expanded for first 2
          const pct = total_anggaran_final > 0 ? ((dinas.total / total_anggaran_final) * 100).toFixed(1) : 0;

          return (
            <div key={dinas.name}>
              {/* Dinas Header */}
              <motion.button
                whileHover={{ backgroundColor: 'rgba(248, 250, 252, 0.8)' }}
                onClick={() => toggleDinas(dinas.name)}
                className="w-full px-6 lg:px-8 py-5 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-12 rounded-full ${colorScheme.bg}`} />
                  <div className="text-left">
                    <h3 className="font-bold text-slate-900 text-lg">{dinas.name}</h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {dinas.programs.length} program · {dinas.proposals} proposal
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-lg font-black text-slate-900">{formatAnggaran(dinas.total, formatMode)}</p>
                    <p className="text-xs text-slate-400">{pct}% dari total</p>
                  </div>
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${isExpanded ? colorScheme.light : 'bg-slate-100'}`}
                  >
                    <ChevronDown className={`w-4 h-4 ${isExpanded ? colorScheme.text : 'text-slate-400'}`} />
                  </motion.div>
                </div>
              </motion.button>

              {/* Expanded Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 lg:px-8 pb-6">
                      {/* Progress Bar */}
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                          className={`h-full rounded-full ${colorScheme.bg}`}
                        />
                      </div>

                      {/* Programs Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {dinas.programs.map((prog, pi) => (
                          <motion.div
                            key={pi}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: pi * 0.03 }}
                            whileHover={{ scale: 1.02, y: -2 }}
                            className={`${colorScheme.light} rounded-xl p-4 border ${colorScheme.border} transition-all`}
                          >
                            <p className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug mb-3">
                              {prog.nama_program}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                  <Users className="w-3 h-3" /> {prog.jumlah_desa}
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                  <FileText className="w-3 h-3" /> {prog.jumlah_proposal}
                                </span>
                              </div>
                              <p className={`text-xs font-bold ${colorScheme.text}`}>{formatAnggaran(prog.total_anggaran, formatMode)}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Subtotal */}
                      <div className={`mt-4 p-4 ${colorScheme.light} rounded-xl border ${colorScheme.border} flex items-center justify-between`}>
                        <span className="text-sm font-semibold text-slate-600">Subtotal {dinas.name}</span>
                        <span className={`text-lg font-black ${colorScheme.text}`}>{formatAnggaran(dinas.total, formatMode)}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
        <p className="text-xs text-slate-400 text-center">
          * Data anggaran final proposal yang sudah sampai di DPMD. Nilai bersifat usulan dan dapat berubah.
        </p>
      </div>
    </motion.div>
  );
});

// ═══════════════════════════════════════════════════════════════════
// KECAMATAN OVERVIEW - Top Districts
// ═══════════════════════════════════════════════════════════════════
const KecamatanOverview = React.memo(({ kecamatanGroup, totalAnggaran }) => {
  const [formatMode, setFormatMode] = useState('short');
  const top5 = kecamatanGroup.slice(0, 5);
  
  if (top5.length === 0) return null;

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 lg:p-8"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Top 5 Kecamatan</h2>
          <p className="text-sm text-slate-500 mt-1">Berdasarkan nilai anggaran</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFormatMode(formatMode === 'short' ? 'full' : 'short')}
            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-semibold text-slate-600 transition-colors"
          >
            {formatMode === 'short' ? 'Detail' : 'Singkat'}
          </button>
          <BarChart3 className="w-5 h-5 text-slate-400" />
        </div>
      </div>

      <div className="space-y-5">
        {top5.map((kec, i) => {
          const pct = totalAnggaran > 0 ? ((kec.total / totalAnggaran) * 100).toFixed(1) : 0;
          const barWidth = totalAnggaran > 0 ? (kec.total / top5[0].total) * 100 : 0;

          return (
            <motion.div
              key={kec.name}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shadow-sm ${
                    i === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-500/30' :
                    i === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-slate-400/30' :
                    i === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-amber-600/30' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">{kec.name}</p>
                    <p className="text-xs text-slate-400">{kec.count} proposal</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{formatAnggaran(kec.total, formatMode)}</p>
                  <p className="text-xs text-slate-400">{pct}%</p>
                </div>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${barWidth}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.2 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className={`h-full rounded-full ${
                    i === 0 ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                    i === 1 ? 'bg-gradient-to-r from-blue-400 to-indigo-400' :
                    'bg-gradient-to-r from-blue-300 to-indigo-300'
                  }`}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
});

// ═══════════════════════════════════════════════════════════════════
// DESA PARTICIPATION - Circular Progress
// ═══════════════════════════════════════════════════════════════════
const DesaParticipation = React.memo(({ summary }) => {
  if (!summary) return null;

  const { total_desa, desa_mengusulkan, desa_belum_mengusulkan } = summary;
  const pct = total_desa > 0 ? Math.round((desa_mengusulkan / total_desa) * 100) : 0;
  const circumference = 2 * Math.PI * 42;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 lg:p-8"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Partisipasi Desa</h2>
          <p className="text-sm text-slate-500 mt-1">Sudah mengajukan proposal</p>
        </div>
        <Users className="w-5 h-5 text-slate-400" />
      </div>

      <div className="flex items-center justify-center mb-6">
        <div className="relative w-32 h-32">
          <svg width="128" height="128" viewBox="0 0 100 100" className="transform -rotate-90">
            {/* Background circle */}
            <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="10" />
            {/* Progress circle */}
            <motion.circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              whileInView={{ strokeDashoffset }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
            />
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.p 
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
              className="text-3xl font-black text-slate-900"
            >
              {pct}%
            </motion.p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-3 bg-slate-50 rounded-xl">
          <p className="text-xl font-black text-slate-800">{total_desa}</p>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">Total</p>
        </div>
        <div className="text-center p-3 bg-emerald-50 rounded-xl">
          <p className="text-xl font-black text-emerald-600">{desa_mengusulkan}</p>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Sudah</p>
        </div>
        <div className="text-center p-3 bg-rose-50 rounded-xl">
          <p className="text-xl font-black text-rose-500">{desa_belum_mengusulkan}</p>
          <p className="text-[10px] text-rose-500 font-medium mt-0.5">Belum</p>
        </div>
      </div>
    </motion.div>
  );
});

// ═══════════════════════════════════════════════════════════════════
// STAGE DISTRIBUTION CHART
// ═══════════════════════════════════════════════════════════════════
const StageDistribution = React.memo(({ stageStats, total }) => {
  const data = STAGE_ORDER.map(s => ({
    name: STAGE_CONFIG[s].label,
    value: stageStats[s] || 0,
    color: STAGE_CONFIG[s].color
  })).filter(d => d.value > 0);

  if (data.length === 0) return null;

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 lg:p-8"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Distribusi</h2>
          <p className="text-sm text-slate-500 mt-1">Per tahap verifikasi</p>
        </div>
        <Layers className="w-5 h-5 text-slate-400" />
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={70}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="white" strokeWidth={3} />
              ))}
            </Pie>
            <RechartsTooltip
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)' }}
              formatter={(value, name) => [`${value} proposal`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 mt-2">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-slate-600">{item.name} ({item.value})</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
});

// ═══════════════════════════════════════════════════════════════════
// DESA BELUM MENGUSULKAN - List of villages that haven't submitted
// ═══════════════════════════════════════════════════════════════════
const DesaBelumMengusulkan = React.memo(({ desaPartisipasi }) => {
  const [expandedKec, setExpandedKec] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  if (!desaPartisipasi) return null;

  // Sort kecamatan by number of desa belum
  const kecamatanList = Object.entries(desaPartisipasi)
    .map(([kec, data]) => ({
      nama: kec,
      belum: data.belum || [],
      sudah: data.sudah || []
    }))
    .filter(k => k.belum.length > 0)
    .sort((a, b) => b.belum.length - a.belum.length);

  const totalBelum = kecamatanList.reduce((s, k) => s + k.belum.length, 0);

  // Filter by search
  const filteredKecamatan = searchQuery
    ? kecamatanList.filter(k => 
        k.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.belum.some(d => d.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : kecamatanList;

  const toggleKec = (kec) => {
    setExpandedKec(prev => ({ ...prev, [kec]: !prev[kec] }));
  };

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 lg:px-8 py-6 bg-gradient-to-r from-rose-50 via-white to-orange-50 border-b border-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center shadow-lg shadow-rose-500/25">
              <AlertCircle className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Desa Belum Mengusulkan</h2>
              <p className="text-sm text-slate-500 mt-0.5">Daftar desa yang belum mengirim proposal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-3 bg-rose-100 rounded-2xl border border-rose-200">
              <p className="text-2xl font-black text-rose-600">{totalBelum}</p>
              <p className="text-[10px] text-rose-500">Desa Belum</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kecamatan atau desa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Kecamatan List */}
      <div className="max-h-[500px] overflow-y-auto">
        {filteredKecamatan.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            {searchQuery ? 'Tidak ditemukan hasil pencarian' : 'Semua desa sudah mengusulkan'}
          </div>
        ) : (
          filteredKecamatan.map((kec, i) => (
            <div key={kec.nama} className={`border-b border-slate-100 last:border-b-0 ${i % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}`}>
              <button
                onClick={() => toggleKec(kec.nama)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-100/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Landmark className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold text-slate-800">{kec.nama}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 bg-rose-100 text-rose-600 text-xs font-bold rounded-lg">
                    {kec.belum.length} desa
                  </span>
                  {expandedKec[kec.nama] ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>
              <AnimatePresence>
                {expandedKec[kec.nama] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-4">
                      <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex flex-wrap gap-2">
                          {kec.belum.map((desa, j) => (
                            <span
                              key={j}
                              className="px-3 py-1.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-lg"
                            >
                              {desa}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
});

// ═══════════════════════════════════════════════════════════════════
// DESA TRACKING TABLE - Full tracking status per desa
// ═══════════════════════════════════════════════════════════════════
const DesaTrackingTable = React.memo(({ kecamatanAgg }) => {
  const [expandedKec, setExpandedKec] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [formatMode, setFormatMode] = useState('short');

  if (!kecamatanAgg) return null;

  // Transform kecamatanAgg to list
  const kecamatanList = Object.entries(kecamatanAgg)
    .map(([kec, data]) => ({
      nama: kec,
      count: data.count,
      total: data.total,
      desas: Object.entries(data.desas || {}).map(([desaName, desaData]) => ({
        nama: desaName,
        count: desaData.count,
        total: desaData.total,
        stage: desaData.stage
      })).sort((a, b) => b.total - a.total)
    }))
    .filter(k => k.count > 0)
    .sort((a, b) => b.total - a.total);

  // Filter by search
  const filteredKecamatan = searchQuery
    ? kecamatanList.filter(k =>
        k.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.desas.some(d => d.nama.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : kecamatanList;

  const toggleKec = (kec) => {
    setExpandedKec(prev => ({ ...prev, [kec]: !prev[kec] }));
  };

  const getStageStyle = (stage) => {
    const config = STAGE_CONFIG[stage];
    if (!config) return { bg: 'bg-slate-100', text: 'text-slate-600' };
    return {
      bg: `bg-[${config.color}]/10`,
      text: `text-[${config.color}]`,
      color: config.color,
      label: config.label
    };
  };

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 lg:px-8 py-6 bg-gradient-to-r from-blue-50 via-white to-indigo-50 border-b border-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Eye className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Tracking Status Desa</h2>
              <p className="text-sm text-slate-500 mt-0.5">Status proposal per kecamatan dan desa</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFormatMode(formatMode === 'short' ? 'full' : 'short')}
              className="px-3 py-2 bg-blue-100 hover:bg-blue-200 rounded-xl text-xs font-semibold text-blue-600 transition-colors"
            >
              {formatMode === 'short' ? 'Detail' : 'Singkat'}
            </button>
            {STAGE_ORDER.map(stage => (
              <div key={stage} className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ backgroundColor: `${STAGE_CONFIG[stage].color}15` }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STAGE_CONFIG[stage].color }} />
                <span className="text-[10px] font-medium" style={{ color: STAGE_CONFIG[stage].color }}>{STAGE_CONFIG[stage].label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kecamatan atau desa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Kecamatan List */}
      <div className="max-h-[600px] overflow-y-auto">
        {filteredKecamatan.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            {searchQuery ? 'Tidak ditemukan hasil pencarian' : 'Belum ada data proposal'}
          </div>
        ) : (
          filteredKecamatan.map((kec, i) => (
            <div key={kec.nama} className={`border-b border-slate-100 last:border-b-0 ${i % 2 === 0 ? 'bg-slate-50/30' : 'bg-white'}`}>
              <button
                onClick={() => toggleKec(kec.nama)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-100/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Landmark className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold text-slate-800">{kec.nama}</span>
                  <span className="text-xs text-slate-400">({kec.desas.length} desa)</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-700">{formatAnggaran(kec.total, formatMode)}</span>
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-600 text-xs font-bold rounded-lg">
                    {kec.count} proposal
                  </span>
                  {expandedKec[kec.nama] ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>
              <AnimatePresence>
                {expandedKec[kec.nama] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-4">
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="text-left py-2.5 px-4 font-semibold text-slate-600">Desa</th>
                              <th className="text-center py-2.5 px-4 font-semibold text-slate-600">Proposal</th>
                              <th className="text-right py-2.5 px-4 font-semibold text-slate-600">Anggaran</th>
                              <th className="text-center py-2.5 px-4 font-semibold text-slate-600">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {kec.desas.map((desa, j) => {
                              const stageConfig = STAGE_CONFIG[desa.stage] || STAGE_CONFIG.di_desa;
                              return (
                                <tr key={j} className="hover:bg-slate-50">
                                  <td className="py-2.5 px-4 font-medium text-slate-700">{desa.nama}</td>
                                  <td className="py-2.5 px-4 text-center text-slate-600">{desa.count}</td>
                                  <td className="py-2.5 px-4 text-right font-medium text-slate-700 text-xs">{formatAnggaran(desa.total, formatMode)}</td>
                                  <td className="py-2.5 px-4 text-center">
                                    <span
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                                      style={{ backgroundColor: `${stageConfig.color}15`, color: stageConfig.color }}
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stageConfig.color }} />
                                      {stageConfig.label}
                                    </span>
                                  </td>
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
          ))
        )}
      </div>
    </motion.div>
  );
});

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════
const BankeuPublicPage = () => {
  const navigate = useNavigate();
  const [activeYear, setActiveYear] = useState(2026);
  const [proposals, setProposals] = useState([]);
  const [summary, setSummary] = useState(null);
  const [anggaranPerProgram, setAnggaranPerProgram] = useState(null);
  const [desaPartisipasi, setDesaPartisipasi] = useState(null);
  const [kecamatanAgg, setKecamatanAgg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData(activeYear);
  }, [activeYear]);

  const fetchData = async (tahun) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_ENDPOINTS.EXPRESS_BASE}/public/bankeu/tracking-summary?tahun_anggaran=${tahun}`);
      if (res.ok) {
        const json = await res.json();
        setProposals(json.proposals || []);
        setSummary(json.summary || null);
        setAnggaranPerProgram(json.anggaran_per_program || null);
        setDesaPartisipasi(json.desa_partisipasi || null);
        setKecamatanAgg(json.kecamatan || null);
      } else {
        setProposals([]);
        setSummary(null);
        setAnggaranPerProgram(null);
        setDesaPartisipasi(null);
        setKecamatanAgg(null);
      }
    } catch {
      setProposals([]);
      setSummary(null);
      setAnggaranPerProgram(null);
      setDesaPartisipasi(null);
      setKecamatanAgg(null);
    } finally {
      setLoading(false);
    }
  };

  const stageStats = useMemo(() => {
    const stats = {};
    STAGE_ORDER.forEach(s => { stats[s] = 0; });
    proposals.forEach(p => { stats[p.stage] = (stats[p.stage] || 0) + 1; });
    return stats;
  }, [proposals]);

  const totalProposals = proposals.length;
  const totalAnggaran = useMemo(() => proposals.reduce((s, d) => s + (d.anggaran || 0), 0), [proposals]);

  const kecamatanGroup = useMemo(() => {
    const map = {};
    proposals.forEach(d => {
      if (!map[d.kecamatan]) map[d.kecamatan] = { total: 0, count: 0 };
      map[d.kecamatan].total += (d.anggaran || 0);
      map[d.kecamatan].count += 1;
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [proposals]);

  // Simple Loading Screen (optimized with CSS animation)
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          {/* CSS-animated spinner */}
          <div className="relative mx-auto w-20 h-20 mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-slate-700" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin" />
          </div>
          <p className="text-white font-semibold text-lg mb-1">Memuat Dashboard</p>
          <p className="text-slate-400 text-sm">Bantuan Keuangan Desa TA {activeYear}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Bar */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-xl border-b border-white/5"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <motion.button
            whileHover={{ x: -4 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Beranda</span>
          </motion.button>
          <div className="flex items-center gap-3">
            <img src="/logo-bogor.png" alt="Logo" className="h-9" />
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-white">DPMD Kabupaten Bogor</p>
              <p className="text-[10px] text-slate-400">Dashboard Bantuan Keuangan</p>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <HeroSection
        activeYear={activeYear}
        setActiveYear={setActiveYear}
        totalAnggaran={totalAnggaran}
        totalProposals={totalProposals}
        summary={summary}
        anggaranFinal={anggaranPerProgram?.total_anggaran_final || 0}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 space-y-8">
        {/* Flow Pipeline */}
        <FlowPipeline stageStats={stageStats} total={totalProposals} />

        {/* Program Budget Section */}
        <ProgramBudgetSection anggaranPerProgram={anggaranPerProgram} />

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <KecamatanOverview kecamatanGroup={kecamatanGroup} totalAnggaran={totalAnggaran} />
          </div>
          <div className="space-y-6">
            <DesaParticipation summary={summary} />
            <StageDistribution stageStats={stageStats} total={totalProposals} />
          </div>
        </div>

        {/* Tracking Status per Desa */}
        <DesaTrackingTable kecamatanAgg={kecamatanAgg} />

        {/* Desa Belum Mengusulkan */}
        <DesaBelumMengusulkan desaPartisipasi={desaPartisipasi} />
      </div>

      <Footer />
    </div>
  );
};

export default BankeuPublicPage;
