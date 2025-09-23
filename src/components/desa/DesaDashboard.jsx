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
import AnimatedCounter from '../AnimatedCounter';

const DesaDashboard = () => {
    const [userData, setUserData] = useState(null);
    const [dashboardData, setDashboardData] = useState({
        stats: [],
        recentActivities: [],
        quickActions: []
    });

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            const user = JSON.parse(storedUser);
            setUserData(user);
            loadDashboardData();
        }
    }, []);

    const loadDashboardData = () => {
        const config = {
            title: 'Dashboard Admin Desa',
            stats: [
                { title: 'Jumlah RW', value: '12', icon: <FiMapPin />, color: 'bg-indigo-700' },
                { title: 'Jumlah RT', value: '48', icon: <FiHome />, color: 'bg-indigo-700' },
                { title: 'Penduduk', value: '3,245', icon: <FiUsers />, color: 'bg-indigo-700' },
                { title: 'Dana Desa', value: 'Rp 850M', icon: <FiDollarSign />, color: 'bg-indigo-700' }
            ],
            recentActivities: [
                'Data kependudukan telah diperbarui',
                'Laporan bulanan telah dikirim ke kecamatan',
                'Rapat BPD terlaksana dengan baik',
                'Pelayanan administratif berjalan lancar',
                'Update profil desa selesai'
            ],
            quickActions: [
                { title: 'Profil Desa', path: '/desa/profil-desa', icon: <FiMapPin /> },
                { title: 'Produk Hukum', path: '/desa/produk-hukum', icon: <FiFileText /> },
                { title: 'Data Penduduk', path: '/desa/penduduk', icon: <FiUsers /> },
                { title: 'Laporan', path: '/desa/laporan', icon: <FiFileText /> }
            ]
        };
        setDashboardData(config);
    };

    return (
        <div className="space-y-6">
            <div className="bg-primary rounded-lg shadow-md border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center">
                            <FiHome className="mr-3 text-white" />
                            Dashboard Admin Desa
                        </h1>
                        <p className="text-gray-200 mt-1">
                            Selamat datang, {userData?.name || 'Admin Desa'}
                        </p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <div className="px-3 py-1 bg-white bg-opacity-20 text-white rounded-full text-xs font-semibold">
                            Admin Desa
                        </div>
                        <div className="text-right text-sm text-gray-200">
                            {new Date().toLocaleDateString('id-ID', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {dashboardData.stats.map((stat, index) => (
                    <div 
                        key={index} 
                        className="bg-white rounded-lg shadow-md border border-gray-200 p-6 flex items-center transition-transform transform hover:scale-105"
                    >
                        <div className="p-3 rounded-lg bg-primary text-white mr-4 flex-shrink-0">
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                <AnimatedCounter endValue={stat.value} />
                            </p>
                            <p className="text-gray-600 text-sm">{stat.title}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <FiGrid className="mr-2 text-blue-600" />
                        Aksi Cepat
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        {dashboardData.quickActions.map((action, index) => (
                            <a
                                key={index}
                                href={action.path}
                                className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 group"
                            >
                                <div className="text-blue-600 mr-3 group-hover:scale-110 transition-transform">
                                    {action.icon}
                                </div>
                                <span className="text-sm font-medium text-gray-700">{action.title}</span>
                            </a>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <FiActivity className="mr-2 text-blue-600" />
                        Aktivitas Terbaru
                    </h2>
                    <div className="space-y-3">
                        {dashboardData.recentActivities.map((activity, index) => (
                            <div key={index} className="flex items-start hover:bg-gray-50 p-2 rounded-lg transition-colors">
                                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                <p className="text-sm text-gray-600">{activity}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DesaDashboard;
