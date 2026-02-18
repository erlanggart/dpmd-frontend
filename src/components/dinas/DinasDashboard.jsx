// src/components/dinas/DinasDashboard.jsx
import React, { useState, useEffect } from "react";
import { 
    FiCheckCircle, 
    FiClock,
    FiAlertCircle,
    FiRefreshCw,
    FiFileText
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const DinasDashboard = () => {
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [dinasInfo, setDinasInfo] = useState(null);
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Ambil data user dari localStorage
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            const user = JSON.parse(storedUser);
            setUserData(user);
        }
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const response = await api.get('/dinas/bankeu/statistics');
            if (response.data.success) {
                setStatistics(response.data.data);
            }
            
            const proposalsRes = await api.get('/dinas/bankeu/proposals');
            if (proposalsRes.data.success) {
                setDinasInfo(proposalsRes.data.dinas_info);
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const statsConfig = [
        { 
            key: 'pending', 
            title: 'Menunggu Review', 
            icon: <FiClock className="w-6 h-6" />, 
            color: 'bg-yellow-500',
            textColor: 'text-yellow-600',
            bgLight: 'bg-yellow-50'
        },
        { 
            key: 'in_review', 
            title: 'Sedang Direview', 
            icon: <FiRefreshCw className="w-6 h-6" />, 
            color: 'bg-blue-500',
            textColor: 'text-blue-600',
            bgLight: 'bg-blue-50'
        },
        { 
            key: 'approved', 
            title: 'Disetujui', 
            icon: <FiCheckCircle className="w-6 h-6" />, 
            color: 'bg-green-500',
            textColor: 'text-green-600',
            bgLight: 'bg-green-50'
        },
        { 
            key: 'revision', 
            title: 'Perlu Revisi', 
            icon: <FiAlertCircle className="w-6 h-6" />, 
            color: 'bg-orange-500',
            textColor: 'text-orange-600',
            bgLight: 'bg-orange-50',
            // Merge rejected + revision counts
            getValue: (stats) => Number(stats?.rejected || 0) + Number(stats?.revision || 0)
        }
    ];

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Dashboard Verifikasi
                        </h1>
                        <p className="text-gray-600 mt-2 text-lg">
                            {dinasInfo ? (
                                <>
                                    <span className="font-semibold text-indigo-600">{dinasInfo.nama_dinas}</span>
                                    <span className="text-gray-400 mx-2">•</span>
                                    <span className="text-sm">{dinasInfo.singkatan}</span>
                                </>
                            ) : (
                                <span>Selamat datang, {userData?.name || 'Admin Dinas'}</span>
                            )}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">
                            {new Date().toLocaleDateString('id-ID', { 
                                weekday: 'long', 
                                day: 'numeric',
                                month: 'long', 
                                year: 'numeric'
                            })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="text-gray-500 mt-4">Memuat data...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {statsConfig.map((stat) => (
                        <div key={stat.key} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-3 rounded-xl ${stat.color} text-white`}>
                                    {stat.icon}
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-gray-900 mb-1">
                                {stat.getValue ? stat.getValue(statistics) : (statistics?.[stat.key] || 0)}
                            </p>
                            <p className="text-sm text-gray-600">{stat.title}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Aksi Cepat</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => navigate('/dinas/bankeu')}
                        className="flex items-center gap-4 p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                    >
                        <FiFileText className="w-8 h-8" />
                        <div className="text-left">
                            <p className="font-semibold text-lg">Verifikasi Bantuan Keuangan</p>
                            <p className="text-sm text-indigo-100">Lihat & Review Proposal</p>
                        </div>
                    </button>
                    
                    <button
                        onClick={() => navigate('/dinas/bankeu?status=pending')}
                        className="flex items-center gap-4 p-6 bg-gradient-to-br from-yellow-500 to-orange-600 text-white rounded-xl hover:from-yellow-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl"
                    >
                        <FiClock className="w-8 h-8" />
                        <div className="text-left">
                            <p className="font-semibold text-lg">Menunggu Review</p>
                            <p className="text-sm text-yellow-100">{statistics?.pending || 0} Proposal</p>
                        </div>
                    </button>

                    <button
                        onClick={() => navigate('/dinas/bankeu?status=approved')}
                        className="flex items-center gap-4 p-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
                    >
                        <FiCheckCircle className="w-8 h-8" />
                        <div className="text-left">
                            <p className="font-semibold text-lg">Telah Disetujui</p>
                            <p className="text-sm text-green-100">{statistics?.approved || 0} Proposal</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* Info Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-500 text-white rounded-xl">
                        <FiAlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Informasi Verifikasi</h3>
                        <ul className="text-sm text-gray-700 space-y-1">
                            <li>• Verifikasi proposal bantuan keuangan sesuai bidang dinas Anda</li>
                            <li>• Isi questionnaire verifikasi untuk setiap proposal</li>
                            <li>• Proposal yang disetujui akan otomatis diteruskan ke Kecamatan</li>
                            <li>• Proposal yang perlu direvisi akan dikembalikan ke Desa untuk diperbaiki</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DinasDashboard;
