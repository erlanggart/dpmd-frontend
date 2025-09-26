// src/components/dinas/DinasDashboard.jsx
import React, { useState, useEffect } from "react";
import { 
    FiGrid, 
    FiUsers, 
    FiFileText, 
    FiDollarSign,
    FiMapPin,
    FiHome,
    FiActivity 
} from 'react-icons/fi';

const DinasDashboard = () => {
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
            title: 'Dashboard Admin Dinas',
            stats: [
                { title: 'Kecamatan', value: '28', icon: <FiMapPin />, color: 'bg-blue-500' },
                { title: 'Total Desa', value: '416', icon: <FiHome />, color: 'bg-green-500' },
                { title: 'Pegawai Dinas', value: '156', icon: <FiUsers />, color: 'bg-purple-500' },
                { title: 'Anggaran', value: 'Rp 125M', icon: <FiDollarSign />, color: 'bg-yellow-500' }
            ],
            recentActivities: [
                'Koordinasi dengan seluruh kecamatan',
                'Laporan triwulan telah diselesaikan',
                'Program strategis tahun ini berjalan sesuai target',
                'Evaluasi kinerja kecamatan dan desa',
                'Rapat koordinasi dengan pemerintah kabupaten'
            ],
            quickActions: [
                { title: 'Monitoring Kecamatan', path: '/dinas/monitoring-kecamatan', icon: <FiMapPin /> },
                { title: 'Data Desa', path: '/dinas/data-desa', icon: <FiHome /> },
                { title: 'Laporan Strategis', path: '/dinas/laporan-strategis', icon: <FiFileText /> },
                { title: 'Program Dinas', path: '/dinas/program-dinas', icon: <FiActivity /> }
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
                        <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin Dinas</h1>
                        <p className="text-gray-600 mt-1">
                            Selamat datang, {userData?.name || 'Admin Dinas'}
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

export default DinasDashboard;
