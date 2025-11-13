// src/components/kecamatan/KecamatanDashboard.jsx
import React, { useState, useEffect } from "react";
import { 
    FiGrid, 
    FiUsers, 
    FiFileText, 
    FiMapPin,
    FiActivity,
    FiUserCheck 
} from 'react-icons/fi';

const KecamatanDashboard = () => {
    const [userData, setUserData] = useState(null);
    const [dashboardData, setDashboardData] = useState({
        stats: [],
        recentActivities: [],
        quickActions: []
    });

    useEffect(() => {
        // Ambil data user dari localStorage
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            const user = JSON.parse(storedUser);
            setUserData(user);
            loadDashboardData();
        }
    }, []);

    const loadDashboardData = () => {
        const config = {
            title: 'Dashboard Admin Kecamatan',
            stats: [
                { title: 'Jumlah Desa', value: '15', icon: <FiMapPin />, color: 'bg-blue-500' },
                { title: 'Total Penduduk', value: '45,678', icon: <FiUsers />, color: 'bg-green-500' },
                { title: 'Aparatur', value: '234', icon: <FiUserCheck />, color: 'bg-purple-500' },
                { title: 'Program Aktif', value: '28', icon: <FiActivity />, color: 'bg-yellow-500' }
            ],
            recentActivities: [
                'Koordinasi dengan 15 desa se-kecamatan',
                'Laporan bulanan telah dikirim ke kabupaten',
                'Program pemberdayaan masyarakat berjalan',
                'Monitoring pembangunan infrastruktur',
                'Evaluasi kinerja desa-desa'
            ],
            quickActions: [
                { title: 'Data Desa', path: '/kecamatan/data-desa', icon: <FiMapPin /> },
                { title: 'Program Kecamatan', path: '/kecamatan/program', icon: <FiActivity /> },
                { title: 'Koordinasi', path: '/kecamatan/koordinasi', icon: <FiUsers /> }
            ]
        };
        setDashboardData(config);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin Kecamatan</h1>
                        <p className="text-gray-600 mt-1">
                            Selamat datang, {userData?.name || 'Admin Kecamatan'}
                        </p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                        {new Date().toLocaleDateString('id-ID', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {dashboardData.stats.map((stat, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-sm border p-6">
                        <div className="flex items-center">
                            <div className={`p-3 rounded-lg ${stat.color} text-white mr-4`}>
                                {stat.icon}
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                                <p className="text-gray-600 text-sm">{stat.title}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Aksi Cepat</h2>
                    <div className="grid grid-cols-2 gap-3">
                        {dashboardData.quickActions.map((action, index) => (
                            <a
                                key={index}
                                href={action.path}
                                className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <div className="text-primary mr-3">
                                    {action.icon}
                                </div>
                                <span className="text-sm font-medium text-gray-700">{action.title}</span>
                            </a>
                        ))}
                    </div>
                </div>

                {/* Recent Activities */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Aktivitas Terbaru</h2>
                    <div className="space-y-3">
                        {dashboardData.recentActivities.map((activity, index) => (
                            <div key={index} className="flex items-start">
                                <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                <p className="text-sm text-gray-600">{activity}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KecamatanDashboard;
