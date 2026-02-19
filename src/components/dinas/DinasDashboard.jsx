// src/components/dinas/DinasDashboard.jsx
import React, { useState, useEffect, useRef } from "react";
import { 
    FiCheckCircle, 
    FiClock,
    FiAlertCircle,
    FiRefreshCw,
    FiFileText,
    FiUsers,
    FiTrendingUp,
    FiHome,
    FiArrowRight,
    FiBriefcase,
    FiMapPin,
    FiShield,
    FiChevronDown
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

// Animated counter hook
const useCountUp = (end, duration = 800, shouldStart = true) => {
    const [count, setCount] = useState(0);
    const prevEnd = useRef(0);
    useEffect(() => {
        if (!shouldStart || end === 0) { setCount(end); return; }
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
    }, [end, shouldStart]);
    return count;
};

// Skeleton components
const StatCardSkeleton = () => (
    <div className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
        <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg" />
            <div className="h-3 w-20 bg-gray-100 rounded" />
        </div>
        <div className="h-7 w-12 bg-gray-200 rounded" />
    </div>
);

const VerifikatorRowSkeleton = () => (
    <div className="px-4 py-3.5 animate-pulse flex items-center gap-3">
        <div className="w-9 h-9 bg-gray-100 rounded-lg" />
        <div className="flex-1">
            <div className="h-3.5 w-40 bg-gray-200 rounded mb-1.5" />
            <div className="h-2 w-full bg-gray-100 rounded-full" />
        </div>
        <div className="h-3 w-16 bg-gray-100 rounded" />
    </div>
);

const DinasDashboard = () => {
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [dinasInfo, setDinasInfo] = useState(null);
    const [statistics, setStatistics] = useState(null);
    const [verifikatorStats, setVerifikatorStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [verifikatorLoading, setVerifikatorLoading] = useState(true);
    const [headerLoading, setHeaderLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUserData(JSON.parse(storedUser));
        }
        // Fire all loads independently (lazy)
        loadHeaderData();
        loadStats();
        loadVerifikatorStats();
    }, []);

    const loadHeaderData = async () => {
        try {
            const proposalsRes = await api.get('/dinas/bankeu/proposals');
            if (proposalsRes.data.success) {
                setDinasInfo(proposalsRes.data.dinas_info);
            }
        } catch (error) {
            console.error('Error loading header:', error);
        } finally {
            setHeaderLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const storedUser = JSON.parse(localStorage.getItem("user") || '{}');
            const dinasId = storedUser.dinas_id;

            let statsData = null;
            if (dinasId) {
                try {
                    const aggregateRes = await api.get(`/dinas/${dinasId}/verifikator/stats`);
                    if (aggregateRes.data.success) {
                        statsData = aggregateRes.data.data.aggregate;
                    }
                } catch (err) {
                    // fallback below
                }
            }

            if (!statsData) {
                const response = await api.get('/dinas/bankeu/statistics');
                if (response.data.success) {
                    statsData = response.data.data;
                }
            }
            setStatistics(statsData);
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setStatsLoading(false);
        }
    };

    const loadVerifikatorStats = async () => {
        try {
            const storedUser = JSON.parse(localStorage.getItem("user") || '{}');
            const dinasId = storedUser.dinas_id;
            if (!dinasId) return;

            const res = await api.get(`/dinas/${dinasId}/verifikator/stats`);
            if (res.data.success && res.data.data.per_verifikator?.length > 0) {
                setVerifikatorStats(res.data.data);
            }
        } catch (err) {
            // silently fail - section just won't render
        } finally {
            setVerifikatorLoading(false);
        }
    };

    const statsConfig = [
        { key: 'pending', title: 'Menunggu', icon: FiClock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500' },
        { key: 'in_review', title: 'Direview', icon: FiRefreshCw, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500' },
        { key: 'approved', title: 'Disetujui', icon: FiCheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
        { key: 'revision', title: 'Revisi', icon: FiAlertCircle, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', dot: 'bg-rose-500',
          getValue: (stats) => Number(stats?.rejected || 0) + Number(stats?.revision || 0)
        }
    ];

    const avatarColors = [
        'from-violet-500 to-purple-600',
        'from-blue-500 to-cyan-500',
        'from-emerald-500 to-teal-500',
        'from-orange-500 to-amber-500',
        'from-rose-500 to-pink-500',
        'from-indigo-500 to-blue-600',
    ];

    const totalProposals = statistics ? (Number(statistics.total || 0) || 
        (Number(statistics.pending || 0) + Number(statistics.in_review || 0) + 
         Number(statistics.approved || 0) + Number(statistics.rejected || 0) + 
         Number(statistics.revision || 0))) : 0;

    return (
        <div className="space-y-5 p-4 sm:p-6 max-w-6xl mx-auto">
            {/* Header - minimal */}
            <div>
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {dinasInfo ? (
                                <>{dinasInfo.nama_dinas} <span className="text-gray-300">·</span> {dinasInfo.singkatan}</>
                            ) : headerLoading ? (
                                <span className="inline-block h-4 w-48 bg-gray-100 rounded animate-pulse" />
                            ) : (
                                <>Selamat datang, {userData?.name || 'Admin Dinas'}</>
                            )}
                        </p>
                    </div>
                    <p className="text-xs text-gray-400">
                        {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {statsLoading ? (
                    <><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></>
                ) : (
                    statsConfig.map((stat, idx) => {
                        const val = stat.getValue ? stat.getValue(statistics) : (statistics?.[stat.key] || 0);
                        return <StatCard key={stat.key} stat={stat} value={val} total={totalProposals} delay={idx * 80} />;
                    })
                )}
            </div>

            {/* Verifikator Table */}
            {verifikatorLoading ? (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-50">
                        <div className="h-4 w-36 bg-gray-100 rounded animate-pulse" />
                    </div>
                    <VerifikatorRowSkeleton />
                    <VerifikatorRowSkeleton />
                    <VerifikatorRowSkeleton />
                </div>
            ) : verifikatorStats?.per_verifikator?.length > 0 ? (
                <VerifikatorTable 
                    verifikatorStats={verifikatorStats} 
                    avatarColors={avatarColors}
                    statsConfig={statsConfig}
                />
            ) : null}

            {/* Alur Proposal */}
            <div className="relative bg-gradient-to-br from-white via-white to-indigo-50/40 rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 overflow-hidden">
                {/* Decorative bg */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-indigo-100/30 to-transparent rounded-full -translate-y-36 translate-x-36 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-100/20 to-transparent rounded-full translate-y-24 -translate-x-24 pointer-events-none" />
                
                <div className="relative">
                    <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-1">Alur Verifikasi Proposal</h2>
                    <p className="text-xs text-gray-500 mb-4 sm:mb-6">Proposal melewati 4 tahap verifikasi berjenjang</p>
                    
                    {/* Mobile: vertical flow, md+: horizontal flow */}
                    <div className="hidden md:flex items-center justify-between gap-2">
                        {[
                            { icon: FiHome, label: 'Desa', sub: 'Pengajuan', gradient: 'from-blue-500 to-cyan-500', glow: 'shadow-blue-300/40', step: '1' },
                            { icon: FiBriefcase, label: 'Dinas Terkait', sub: 'Review Teknis', gradient: 'from-violet-500 to-purple-600', glow: 'shadow-violet-300/40', step: '2', active: true },
                            { icon: FiMapPin, label: 'Kecamatan', sub: 'Verifikasi', gradient: 'from-amber-500 to-orange-500', glow: 'shadow-amber-300/40', step: '3' },
                            { icon: FiShield, label: 'DPMD', sub: 'Persetujuan Final', gradient: 'from-emerald-500 to-teal-600', glow: 'shadow-emerald-300/40', step: '4' },
                        ].map((node, nIdx, arr) => (
                            <React.Fragment key={nIdx}>
                                <div className={`flex-1 group relative`}>
                                    <div className={`relative flex flex-col items-center text-center p-4 rounded-2xl border transition-all duration-500 ${
                                        node.active 
                                            ? 'bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200 shadow-lg shadow-violet-100/50 scale-105' 
                                            : 'bg-white/80 border-gray-200 hover:border-gray-300 hover:shadow-md'
                                    }`}>
                                        {/* Step badge */}
                                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-[10px] font-bold text-gray-500 shadow-sm">
                                            Tahap {node.step}
                                        </div>
                                        
                                        {/* Icon ring */}
                                        <div className={`relative mb-3 mt-2`}>
                                            {node.active && (
                                                <div className="absolute inset-0 w-14 h-14 -m-1 rounded-2xl bg-gradient-to-br from-violet-400/20 to-purple-400/20 animate-pulse" />
                                            )}
                                            <div className={`w-12 h-12 bg-gradient-to-br ${node.gradient} rounded-xl shadow-lg ${node.glow} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                                                <node.icon className="w-5 h-5 text-white" />
                                            </div>
                                        </div>
                                        
                                        <h3 className={`text-sm font-bold mb-0.5 ${node.active ? 'text-violet-700' : 'text-gray-800'}`}>{node.label}</h3>
                                        <p className="text-[11px] text-gray-500">{node.sub}</p>
                                    </div>
                                </div>
                                
                                {/* Arrow connector */}
                                {nIdx < arr.length - 1 && (
                                    <div className="flex-shrink-0 flex flex-col items-center gap-0.5 px-1">
                                        <div className="flex items-center gap-0.5">
                                            <div className="w-4 h-[2px] bg-gradient-to-r from-gray-300 to-gray-200 rounded-full" />
                                            <FiArrowRight className="w-3.5 h-3.5 text-gray-400 animate-pulse" />
                                            <div className="w-4 h-[2px] bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Mobile vertical flow */}
                    <div className="flex md:hidden flex-col gap-3">
                        {[
                            { icon: FiHome, label: 'Desa', sub: 'Pengajuan', gradient: 'from-blue-500 to-cyan-500', glow: 'shadow-blue-300/40', step: '1' },
                            { icon: FiBriefcase, label: 'Dinas Terkait', sub: 'Review Teknis', gradient: 'from-violet-500 to-purple-600', glow: 'shadow-violet-300/40', step: '2', active: true },
                            { icon: FiMapPin, label: 'Kecamatan', sub: 'Verifikasi', gradient: 'from-amber-500 to-orange-500', glow: 'shadow-amber-300/40', step: '3' },
                            { icon: FiShield, label: 'DPMD', sub: 'Persetujuan Final', gradient: 'from-emerald-500 to-teal-600', glow: 'shadow-emerald-300/40', step: '4' },
                        ].map((node, nIdx, arr) => (
                            <React.Fragment key={nIdx}>
                                <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                    node.active
                                        ? 'bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200 shadow-md'
                                        : 'bg-white/80 border-gray-200'
                                }`}>
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-[10px] font-bold text-gray-500 flex-shrink-0">
                                        {node.step}
                                    </div>
                                    <div className={`w-10 h-10 bg-gradient-to-br ${node.gradient} rounded-xl shadow-md ${node.glow} flex items-center justify-center flex-shrink-0`}>
                                        <node.icon className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className={`text-sm font-bold ${node.active ? 'text-violet-700' : 'text-gray-800'}`}>{node.label}</h3>
                                        <p className="text-[11px] text-gray-500">{node.sub}</p>
                                    </div>
                                </div>
                                {nIdx < arr.length - 1 && (
                                    <div className="flex justify-center">
                                        <div className="flex flex-col items-center">
                                            <div className="w-[2px] h-2 bg-gray-200 rounded-full" />
                                            <FiArrowRight className="w-3 h-3 text-gray-300 rotate-90" />
                                            <div className="w-[2px] h-2 bg-gray-200 rounded-full" />
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Clean Stat Card ──
const StatCard = ({ stat, value, total, delay }) => {
    const [visible, setVisible] = useState(false);
    const animatedValue = useCountUp(value, 800, visible);
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    const Icon = stat.icon;

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(t);
    }, [delay]);

    return (
        <div className={`bg-white rounded-xl border border-gray-100 p-4 sm:p-5 transition-all duration-500 hover:border-gray-200 hover:shadow-sm ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
        }`}>
            <div className="flex items-center gap-2.5 mb-3">
                <div className={`w-9 h-9 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center`}>
                    <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-gray-500">{stat.title}</span>
            </div>
            <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 tabular-nums leading-none">
                    {animatedValue}
                </p>
                {total > 0 && (
                    <span className={`text-xs font-semibold ${stat.color} tabular-nums`}>{pct}%</span>
                )}
            </div>
            {/* Thin progress line */}
            <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${stat.dot} transition-all duration-1000 ease-out`}
                    style={{ width: visible ? `${pct}%` : '0%' }} />
            </div>
        </div>
    );
};

// ── Verifikator Table ──
const VerifikatorTable = ({ verifikatorStats, avatarColors, statsConfig }) => {
    const [sectionVisible, setSectionVisible] = useState(false);
    const [expandedId, setExpandedId] = useState(null);
    const ref = useRef(null);

    useEffect(() => {
        const obs = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) setSectionVisible(true); },
            { threshold: 0.05 }
        );
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, []);

    return (
        <div ref={ref} className={`bg-white rounded-xl border border-gray-100 overflow-hidden transition-all duration-600 ${
            sectionVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}>
            {/* Table header */}
            <div className="px-4 sm:px-5 py-3 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FiUsers className="w-4 h-4 text-gray-400" />
                    <h2 className="text-sm font-semibold text-gray-700">Verifikator</h2>
                    <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full">
                        {verifikatorStats.per_verifikator.length}
                    </span>
                </div>
                {/* Column legend - desktop */}
                <div className="hidden sm:flex items-center gap-3 text-[10px] text-gray-400">
                    {statsConfig.map(s => (
                        <span key={s.key} className="flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                            {s.title}
                        </span>
                    ))}
                </div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-50">
                {verifikatorStats.per_verifikator.map((pv, idx) => {
                    const total = pv.stats.total;
                    const revisi = Number(pv.stats.rejected || 0) + Number(pv.stats.revision || 0);
                    const approvedPct = total > 0 ? Math.round((pv.stats.approved / total) * 100) : 0;
                    const colorClass = avatarColors[idx % avatarColors.length];
                    const initials = pv.nama.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
                    const isExpanded = expandedId === pv.id;

                    const segments = [
                        { val: pv.stats.approved, color: 'bg-emerald-500' },
                        { val: pv.stats.in_review, color: 'bg-blue-500' },
                        { val: pv.stats.pending, color: 'bg-amber-400' },
                        { val: revisi, color: 'bg-rose-400' },
                    ];

                    return (
                        <div key={pv.id?.toString()}
                            className={`transition-all duration-300 ${sectionVisible ? 'opacity-100' : 'opacity-0'}`}
                            style={{ transitionDelay: `${idx * 60}ms` }}
                        >
                            {/* Main row */}
                            <div 
                                className="px-4 sm:px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
                                onClick={() => setExpandedId(isExpanded ? null : pv.id)}
                            >
                                {/* Avatar */}
                                <div className={`flex-shrink-0 w-9 h-9 bg-gradient-to-br ${colorClass} rounded-lg flex items-center justify-center`}>
                                    <span className="text-white text-[11px] font-bold">{initials}</span>
                                </div>

                                {/* Name + bar */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <h3 className="text-sm font-semibold text-gray-800 truncate">{pv.nama}</h3>
                                        <span className="hidden sm:inline text-[10px] text-gray-400">{pv.jumlah_desa} desa</span>
                                    </div>
                                    {/* Stacked progress bar */}
                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                                        {total > 0 && segments.map((seg, si) => seg.val > 0 ? (
                                            <div key={si} className={`${seg.color} h-full transition-all duration-700 ease-out`}
                                                style={{ width: `${(seg.val / total) * 100}%`, transitionDelay: `${(idx * 60) + (si * 100)}ms` }} />
                                        ) : null)}
                                    </div>
                                </div>

                                {/* Stats numbers - desktop */}
                                <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                                    {[pv.stats.pending, pv.stats.in_review, pv.stats.approved, revisi].map((v, vi) => (
                                        <span key={vi} className={`w-7 text-center text-xs font-semibold tabular-nums ${v > 0 ? statsConfig[vi].color : 'text-gray-300'}`}>
                                            {v}
                                        </span>
                                    ))}
                                    <span className="text-xs text-gray-400 font-medium w-7 text-center tabular-nums">{total}</span>
                                </div>

                                {/* Mobile total + chevron */}
                                <div className="flex sm:hidden items-center gap-1.5 flex-shrink-0">
                                    <span className="text-xs font-semibold text-gray-500 tabular-nums">{total}</span>
                                    <FiChevronDown className={`w-3.5 h-3.5 text-gray-300 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                </div>

                                {/* Desktop chevron */}
                                <FiChevronDown className={`hidden sm:block w-3.5 h-3.5 text-gray-300 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>

                            {/* Expand panel */}
                            <div className={`overflow-hidden transition-all duration-300 ease-out ${isExpanded ? 'max-h-40' : 'max-h-0'}`}>
                                <div className="px-4 sm:px-5 pb-3 pt-0 ml-12">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {[
                                            { label: 'Menunggu', val: pv.stats.pending, s: statsConfig[0] },
                                            { label: 'Review', val: pv.stats.in_review, s: statsConfig[1] },
                                            { label: 'Disetujui', val: pv.stats.approved, s: statsConfig[2] },
                                            { label: 'Revisi', val: revisi, s: statsConfig[3] },
                                        ].map((item, ii) => (
                                            <div key={ii} className={`${item.s.bg} rounded-lg px-3 py-2 border ${item.s.border}`}>
                                                <p className="text-[10px] text-gray-500 mb-0.5">{item.label}</p>
                                                <p className={`text-lg font-bold ${item.s.color} tabular-nums leading-none`}>{item.val}</p>
                                                <p className="text-[10px] text-gray-400 tabular-nums">
                                                    {total > 0 ? Math.round((item.val / total) * 100) : 0}%
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                    {approvedPct > 0 && (
                                        <p className="text-[11px] text-emerald-600 font-medium mt-2">
                                            {approvedPct}% proposal telah selesai diverifikasi
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Unassigned */}
                {verifikatorStats.unassigned?.total > 0 && (
                    <div className="px-4 sm:px-5 py-3 flex items-center gap-3 bg-gray-50/30">
                        <div className="flex-shrink-0 w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                            <span className="text-gray-400 text-xs font-bold">?</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm text-gray-400 italic">Belum ditugaskan</h3>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                            {[
                                verifikatorStats.unassigned.pending,
                                verifikatorStats.unassigned.in_review,
                                verifikatorStats.unassigned.approved,
                                Number(verifikatorStats.unassigned.rejected || 0) + Number(verifikatorStats.unassigned.revision || 0)
                            ].map((v, vi) => (
                                <span key={vi} className={`w-7 text-center text-xs font-semibold tabular-nums ${v > 0 ? statsConfig[vi].color : 'text-gray-300'}`}>{v}</span>
                            ))}
                            <span className="text-xs text-gray-400 font-medium w-7 text-center tabular-nums">{verifikatorStats.unassigned.total}</span>
                        </div>
                        <span className="sm:hidden text-xs font-semibold text-gray-400 tabular-nums">{verifikatorStats.unassigned.total}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DinasDashboard;
