// src/components/kecamatan/KecamatanDashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api";
import { 
    LuBuilding2, 
    LuUsers, 
    LuFileText, 
    LuMapPin,
    LuBanknote,
    LuClipboardCheck,
    LuTrendingUp,
    LuArrowRight,
    LuCalendar,
    LuClock,
    LuCheck,
    LuRefreshCw,
    LuX,
    LuLoader
} from 'react-icons/lu';

const KecamatanDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalDesa: 0,
        totalPenduduk: 0,
        total_proposals: 0,
        pending: 0,
        verified: 0,
        rejected: 0,
        revision: 0
    });
    const [desaData, setDesaData] = useState([]);

    useEffect(() => {
        loadDashboardData();
        loadDesaData();
    }, []);

    const loadDesaData = async () => {
        try {
            // Fetch data desa untuk kecamatan ini
            const response = await api.get("/desas");
            const allDesa = response.data.data || [];
            
            // Filter desa berdasarkan kecamatan_id user
            const desaDiKecamatan = allDesa.filter(d => d.kecamatan_id === user?.kecamatan_id);
            setDesaData(desaDiKecamatan);
            
            // Hitung total penduduk dari semua desa di kecamatan
            const totalPenduduk = desaDiKecamatan.reduce((sum, desa) => {
                return sum + (parseInt(desa.jumlah_penduduk) || 0);
            }, 0);
            
            setStats(prev => ({
                ...prev,
                totalDesa: desaDiKecamatan.length,
                totalPenduduk: totalPenduduk
            }));
        } catch (error) {
            console.error("Error loading desa data:", error);
        }
    };

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            // Fetch statistik dari API
            const response = await api.get("/kecamatan/bankeu/statistics");
            setStats(prev => ({
                ...prev,
                ...response.data.data
            }));
        } catch (error) {
            console.error("Error loading dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            title: 'Total Desa',
            value: stats.totalDesa || 0,
            icon: LuBuilding2,
            gradient: 'from-blue-500 via-blue-600 to-blue-700',
            bgGradient: 'from-blue-50 to-blue-100',
            iconBg: 'bg-blue-500',
            trend: 'Wilayah kecamatan'
        },
        {
            title: 'Total Penduduk',
            value: stats.totalPenduduk ? stats.totalPenduduk.toLocaleString('id-ID') : '0',
            icon: LuUsers,
            gradient: 'from-emerald-500 via-emerald-600 to-emerald-700',
            bgGradient: 'from-emerald-50 to-emerald-100',
            iconBg: 'bg-emerald-500',
            trend: 'Data dari semua desa'
        },
        {
            title: 'Total Proposal',
            value: stats.total_proposals || 0,
            icon: LuFileText,
            gradient: 'from-violet-500 via-violet-600 to-violet-700',
            bgGradient: 'from-violet-50 to-violet-100',
            iconBg: 'bg-violet-500',
            trend: `${stats.verified || 0} disetujui`
        },
        {
            title: 'Perlu Verifikasi',
            value: stats.pending || 0,
            icon: LuClipboardCheck,
            gradient: 'from-amber-500 via-amber-600 to-amber-700',
            bgGradient: 'from-amber-50 to-amber-100',
            iconBg: 'bg-amber-500',
            trend: stats.pending > 0 ? 'Segera proses' : 'Semua terproses',
            pulse: stats.pending > 0
        }
    ];

    const quickActions = [
        {
            title: 'Verifikasi Proposal Bankeu',
            description: 'Verifikasi dan setujui proposal bantuan keuangan dari desa-desa',
            icon: LuBanknote,
            path: '/kecamatan/bankeu',
            gradient: 'from-violet-500 to-purple-600',
            badge: stats.pending > 0 ? stats.pending : null,
            badgeColor: 'bg-red-500'
        }
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-violet-50/30 flex items-center justify-center">
                <div className="text-center">
                    <LuLoader className="text-6xl text-violet-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Memuat data dashboard...</p>
                </div>
            </div>
        );
    }

    const activities = [
        {
            title: stats.pending > 0 ? `${stats.pending} Proposal menunggu verifikasi` : 'Tidak ada proposal pending',
            description: stats.pending > 0 ? 'Segera verifikasi proposal yang masuk' : 'Semua proposal telah diproses',
            time: 'Sekarang',
            icon: LuFileText,
            color: stats.pending > 0 ? 'text-amber-600' : 'text-gray-600',
            bgColor: stats.pending > 0 ? 'bg-amber-50' : 'bg-gray-50',
            status: stats.pending > 0 ? 'warning' : 'info'
        },
        {
            title: `${stats.verified || 0} Proposal telah diverifikasi`,
            description: 'Berita acara telah digenerate otomatis',
            time: 'Bulan ini',
            icon: LuCheck,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            status: 'success'
        },
        {
            title: `${stats.revision || 0} Proposal perlu revisi`,
            description: stats.revision > 0 ? 'Catatan telah dikirim ke desa terkait' : 'Tidak ada proposal yang perlu revisi',
            time: 'Bulan ini',
            icon: LuRefreshCw,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50',
            status: 'warning'
        },
        {
            title: `${stats.rejected || 0} Proposal ditolak`,
            description: stats.rejected > 0 ? 'Proposal tidak memenuhi persyaratan' : 'Tidak ada proposal ditolak',
            time: 'Bulan ini',
            icon: LuX,
            color: 'text-red-600',
            bgColor: 'bg-red-50',
            status: 'error'
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Welcome Section - Redesigned */}
                <div className="relative overflow-hidden rounded-3xl shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-violet-700"></div>
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-10"></div>
                    
                    <div className="relative px-6 sm:px-8 py-8">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                            <div className="flex-1">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="w-14 h-14 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-xl border border-white/30 flex-shrink-0">
                                        <LuMapPin className="text-3xl text-white" />
                                    </div>
                                    <div>
                                        <p className="text-violet-100 text-sm font-medium mb-1">Dashboard Admin Kecamatan</p>
                                        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                                            Selamat Datang, {user?.name?.split(' ')[0]}
                                        </h1>
                                        <p className="text-violet-200 text-sm">
                                            {user?.kecamatan?.nama || 'Kecamatan'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 w-fit">
                                    <LuCalendar className="text-base text-white" />
                                    <span className="font-medium text-white text-sm">
                                        {new Date().toLocaleDateString('id-ID', { 
                                            weekday: 'long', 
                                            day: 'numeric',
                                            month: 'long', 
                                            year: 'numeric' 
                                        })}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="hidden lg:flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-violet-200 text-sm mb-1">Total Proposal Pending</p>
                                    <p className="text-4xl font-bold text-white">{stats.pending || 0}</p>
                                </div>
                                <div className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-xl border border-white/30">
                                    <LuClipboardCheck className="text-3xl text-white" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid - Improved Layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {statCards.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <div 
                                key={index} 
                                className="group relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200/50 hover:-translate-y-1"
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                                
                                <div className="relative p-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className={`p-3 rounded-xl ${stat.iconBg} shadow-md ${stat.pulse ? 'animate-pulse' : ''}`}>
                                            <Icon className="text-2xl text-white" />
                                        </div>
                                        {stat.pulse && (
                                            <span className="relative flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                            {stat.title}
                                        </p>
                                        <p className="text-3xl font-bold text-gray-900 mb-1">
                                            {stat.value}
                                        </p>
                                        <p className="text-xs text-gray-600 font-medium flex items-center gap-1">
                                            {stat.pulse && <span className="text-amber-600">⚠</span>}
                                            {stat.trend}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Quick Action - Redesigned untuk single item */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Action Card */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-1 h-6 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full"></div>
                            <h2 className="text-xl font-bold text-gray-900">Aksi Utama</h2>
                        </div>
                        
                        {quickActions.map((action, index) => {
                            const Icon = action.icon;
                            return (
                                <button
                                    key={index}
                                    onClick={() => navigate(action.path)}
                                    className="group relative w-full bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200/50 hover:-translate-y-1"
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                                    
                                    <div className="relative p-6">
                                        <div className="flex items-center gap-5">
                                            <div className={`flex-shrink-0 w-16 h-16 bg-gradient-to-br ${action.gradient} rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                                                <Icon className="text-3xl text-white" />
                                            </div>
                                            
                                            <div className="flex-1 text-left">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-violet-600 transition-colors">
                                                        {action.title}
                                                    </h3>
                                                    {action.badge && (
                                                        <span className={`${action.badgeColor} text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md animate-pulse`}>
                                                            {action.badge} Pending
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-gray-600 text-sm mb-3 leading-relaxed">
                                                    {action.description}
                                                </p>
                                                <div className="flex items-center gap-2 text-violet-600 font-semibold text-sm group-hover:gap-3 transition-all">
                                                    <span>Buka Halaman Verifikasi</span>
                                                    <LuArrowRight className="text-lg" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Info Summary Card */}
                    <div className="lg:col-span-1">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-600 rounded-full"></div>
                            <h2 className="text-xl font-bold text-gray-900">Ringkasan</h2>
                        </div>
                        
                        <div className="bg-white rounded-xl shadow-md border border-gray-200/50 overflow-hidden">
                            <div className="p-5 space-y-4">
                                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                            <LuBuilding2 className="text-white text-lg" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600 font-medium">Total Desa</p>
                                            <p className="text-xl font-bold text-gray-900">{stats.totalDesa || 0}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                                            <LuUsers className="text-white text-lg" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600 font-medium">Total Penduduk</p>
                                            <p className="text-xl font-bold text-gray-900">
                                                {stats.totalPenduduk ? stats.totalPenduduk.toLocaleString('id-ID') : '0'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-gray-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium text-gray-600">Status Verifikasi</span>
                                        <span className="text-xs font-bold text-violet-600">
                                            {stats.total_proposals || 0} Total
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600 flex items-center gap-1.5">
                                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                                Disetujui
                                            </span>
                                            <span className="font-bold text-green-600">{stats.verified || 0}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600 flex items-center gap-1.5">
                                                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                                                Pending
                                            </span>
                                            <span className="font-bold text-yellow-600">{stats.pending || 0}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600 flex items-center gap-1.5">
                                                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                                                Revisi
                                            </span>
                                            <span className="font-bold text-orange-600">{stats.revision || 0}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600 flex items-center gap-1.5">
                                                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                                Ditolak
                                            </span>
                                            <span className="font-bold text-red-600">{stats.rejected || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Activities - Improved */}
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-600 rounded-full"></div>
                        <h2 className="text-xl font-bold text-gray-900">Aktivitas Terkini</h2>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-md border border-gray-200/50 overflow-hidden">
                        <div className="divide-y divide-gray-100">
                            {activities.map((activity, index) => {
                                const Icon = activity.icon;
                                return (
                                    <div 
                                        key={index} 
                                        className="p-4 hover:bg-gray-50 transition-all duration-200 group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`flex-shrink-0 w-10 h-10 ${activity.bgColor} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                                                <Icon className={`text-lg ${activity.color}`} />
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-4 mb-0.5">
                                                    <h3 className="font-bold text-gray-900 text-sm group-hover:text-violet-600 transition-colors">
                                                        {activity.title}
                                                    </h3>
                                                    <div className="flex items-center gap-1.5 text-gray-400 text-xs flex-shrink-0">
                                                        <LuClock className="text-sm" />
                                                        <span>{activity.time}</span>
                                                    </div>
                                                </div>
                                                <p className="text-gray-600 text-xs leading-relaxed">
                                                    {activity.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KecamatanDashboard;
