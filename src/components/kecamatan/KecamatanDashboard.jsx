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
        },
        {
            title: 'Data Desa Wilayah',
            description: 'Kelola dan pantau data seluruh desa dalam wilayah kecamatan',
            icon: LuMapPin,
            path: '/kecamatan/data-desa',
            gradient: 'from-blue-500 to-cyan-600',
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-violet-50/30">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Welcome Section */}
                <div className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-violet-700 to-purple-800 rounded-3xl opacity-90"></div>
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-10"></div>
                    
                    <div className="relative px-8 py-10">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-2xl border border-white/30">
                                        <LuMapPin className="text-4xl text-white" />
                                    </div>
                                    <div>
                                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">
                                            Selamat Datang
                                        </h1>
                                        <p className="text-violet-100 text-lg font-medium">
                                            {user?.name}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-white/90">
                                    <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                                        <LuBuilding2 className="text-lg" />
                                        <span className="font-medium">{user?.kecamatan?.nama || 'Kecamatan'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                                        <LuCalendar className="text-lg" />
                                        <span className="font-medium">
                                            {new Date().toLocaleDateString('id-ID', { 
                                                weekday: 'long', 
                                                day: 'numeric',
                                                month: 'long', 
                                                year: 'numeric' 
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="hidden lg:block">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-white/20 rounded-3xl blur-2xl"></div>
                                    <div className="relative w-40 h-40 bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-xl rounded-3xl border border-white/30 flex items-center justify-center shadow-2xl">
                                        <LuMapPin className="text-8xl text-white/90" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {statCards.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <div 
                                key={index} 
                                className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:scale-105"
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                                
                                <div className="relative p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                                {stat.title}
                                            </p>
                                            <p className="text-4xl font-bold text-gray-900 mb-1">
                                                {stat.value}
                                            </p>
                                            <p className="text-xs text-gray-500 font-medium">
                                                {stat.trend}
                                            </p>
                                        </div>
                                        <div className={`p-4 rounded-2xl ${stat.iconBg} shadow-lg ${stat.pulse ? 'animate-pulse' : ''}`}>
                                            <Icon className="text-3xl text-white" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Quick Actions */}
                <div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-1 h-8 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full"></div>
                        <h2 className="text-2xl font-bold text-gray-900">Aksi Cepat</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {quickActions.map((action, index) => {
                            const Icon = action.icon;
                            return (
                                <button
                                    key={index}
                                    onClick={() => navigate(action.path)}
                                    className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:scale-105"
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                                    
                                    <div className="relative p-8">
                                        <div className="flex items-start gap-6">
                                            <div className={`flex-shrink-0 w-20 h-20 bg-gradient-to-br ${action.gradient} rounded-2xl flex items-center justify-center shadow-xl transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                                                <Icon className="text-4xl text-white" />
                                            </div>
                                            
                                            <div className="flex-1 text-left">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-violet-600 transition-colors">
                                                        {action.title}
                                                    </h3>
                                                    {action.badge && (
                                                        <span className={`${action.badgeColor} text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg animate-pulse`}>
                                                            {action.badge}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-gray-600 mb-4 leading-relaxed">
                                                    {action.description}
                                                </p>
                                                <div className="flex items-center gap-2 text-violet-600 font-semibold group-hover:gap-4 transition-all">
                                                    <span>Buka Sekarang</span>
                                                    <LuArrowRight className="text-xl" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Recent Activities */}
                <div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-cyan-600 rounded-full"></div>
                        <h2 className="text-2xl font-bold text-gray-900">Aktivitas Terkini</h2>
                    </div>
                    
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="divide-y divide-gray-100">
                            {activities.map((activity, index) => {
                                const Icon = activity.icon;
                                return (
                                    <div 
                                        key={index} 
                                        className="p-6 hover:bg-gray-50 transition-all duration-200 group cursor-pointer"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`flex-shrink-0 w-12 h-12 ${activity.bgColor} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                                                <Icon className={`text-2xl ${activity.color}`} />
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-4 mb-1">
                                                    <h3 className="font-bold text-gray-900 group-hover:text-violet-600 transition-colors">
                                                        {activity.title}
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-gray-400 text-sm flex-shrink-0">
                                                        <LuClock className="text-base" />
                                                        <span>{activity.time}</span>
                                                    </div>
                                                </div>
                                                <p className="text-gray-600 text-sm leading-relaxed">
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
