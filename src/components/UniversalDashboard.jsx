import React, { useState, useEffect } from 'react';
import { 
    FiGrid, 
    FiUsers, 
    FiFileText, 
    FiDollarSign, 
    FiTrendingUp,
    FiCalendar,
    FiMapPin,
    FiActivity,
    FiHome,
    FiUserCheck
} from 'react-icons/fi';
import { 
    TbBuildingBank, 
    TbHomeDollar, 
    TbMap, 
    TbUserPentagon 
} from 'react-icons/tb';

const UniversalDashboard = () => {
    const [userRole, setUserRole] = useState(null);
    const [userData, setUserData] = useState(null);
    const [dashboardData, setDashboardData] = useState({
        stats: [],
        recentActivities: [],
        quickActions: []
    });

    useEffect(() => {
        // Deteksi user dan role - HANYA untuk role bidang tertentu
        const storedUser = localStorage.getItem("user");
        
        console.log('=== UNIVERSAL DASHBOARD DEBUG ===');
        console.log('storedUser:', storedUser);
        
        if (storedUser) {
            const regularUser = JSON.parse(storedUser);
            console.log('regularUser:', regularUser);
            console.log('regularUser.role:', regularUser.role);
            console.log('regularUser.bidangRole:', regularUser.bidangRole);
            
            // Daftar role yang BOLEH menggunakan UniversalDashboard
            const allowedRoles = [
                'superadmin', 
                'sekretariat', 
                'sarana_prasarana', 
                'kekayaan_keuangan', 
                'pemberdayaan_masyarakat', 
                'pemerintahan_desa'
            ];
            
            let detectedRole = null;
            
            // Cek bidangRole dulu (untuk user bidang)
            if (regularUser.bidangRole && allowedRoles.includes(regularUser.bidangRole)) {
                detectedRole = regularUser.bidangRole;
            } 
            // Cek role biasa (untuk superadmin)
            else if (regularUser.role && allowedRoles.includes(regularUser.role)) {
                detectedRole = regularUser.role;
            }
            
            if (detectedRole) {
                setUserRole(detectedRole);
                setUserData(regularUser);
                console.log('Setting allowed role for UniversalDashboard:', detectedRole);
            } else {
                console.log('Role not allowed for UniversalDashboard, redirecting...');
                // Redirect ke dashboard yang sesuai
                if (regularUser.role === 'desa') {
                    window.location.href = '/desa/dashboard';
                } else if (regularUser.role === 'kecamatan') {
                    window.location.href = '/kecamatan/dashboard';
                } else if (regularUser.role === 'dinas') {
                    window.location.href = '/dinas/dashboard';
                } else {
                    window.location.href = '/login';
                }
            }
        } else {
            console.log('No user data found, redirecting to login');
            window.location.href = '/login';
        }
        console.log('=== END UNIVERSAL DASHBOARD DEBUG ===');
    }, []);

    useEffect(() => {
        if (userRole) {
            loadDashboardData();
        }
    }, [userRole]);

    // Tambahan useEffect untuk debug role changes
    useEffect(() => {
        console.log('=== ROLE CHANGED ===');
        console.log('userRole now:', userRole);
        console.log('userData now:', userData);
    }, [userRole, userData]);

    const loadDashboardData = async () => {
        const dashboardConfigs = {
            'superadmin': {
                title: 'Dashboard Super Admin',
                stats: [
                    { title: 'Total Desa', value: '416', icon: <FiMapPin />, color: 'bg-blue-500' },
                    { title: 'Total User', value: '1,250', icon: <FiUsers />, color: 'bg-green-500' },
                    { title: 'Dokumen', value: '3,420', icon: <FiFileText />, color: 'bg-purple-500' },
                    { title: 'Anggaran', value: 'Rp 15.2M', icon: <FiDollarSign />, color: 'bg-yellow-500' }
                ],
                recentActivities: [
                    'User baru didaftarkan: Admin Desa Ciawi',
                    'Dokumen APBDes Desa Sukamaju telah diupload',
                    'Data BUMDes Desa Bojong telah diperbarui',
                    'Laporan bulanan telah digenerate'
                ],
                quickActions: [
                    { title: 'Kelola User', path: '/dashboard/users', icon: <FiUsers /> },
                    { title: 'Hero Gallery', path: '/dashboard/hero-gallery', icon: <FiGrid /> },
                    { title: 'Kelembagaan', path: '/dashboard/kelembagaan', icon: <TbUserPentagon /> },
                    { title: 'Data BUMDes', path: '/dashboard/bumdes', icon: <TbBuildingBank /> }
                ]
            },
            'admin': {
                title: 'Dashboard Admin',
                stats: [
                    { title: 'Total Desa', value: '416', icon: <FiMapPin />, color: 'bg-blue-500' },
                    { title: 'Total User', value: '1,250', icon: <FiUsers />, color: 'bg-green-500' },
                    { title: 'Dokumen', value: '3,420', icon: <FiFileText />, color: 'bg-purple-500' },
                    { title: 'Anggaran', value: 'Rp 15.2M', icon: <FiDollarSign />, color: 'bg-yellow-500' }
                ],
                recentActivities: [
                    'User baru didaftarkan: Admin Desa Ciawi',
                    'Dokumen APBDes Desa Sukamaju telah diupload',
                    'Data BUMDes Desa Bojong telah diperbarui',
                    'Laporan bulanan telah digenerate'
                ],
                quickActions: [
                    { title: 'Kelola User', path: '/dashboard/users', icon: <FiUsers /> },
                    { title: 'Hero Gallery', path: '/dashboard/hero-gallery', icon: <FiGrid /> },
                    { title: 'Kelembagaan', path: '/dashboard/kelembagaan', icon: <TbUserPentagon /> },
                    { title: 'Data BUMDes', path: '/dashboard/bumdes', icon: <TbBuildingBank /> }
                ]
            },
            'sekretariat': {
                title: 'Dashboard Sekretariat',
                stats: [
                    { title: 'Pegawai Aktif', value: '124', icon: <FiUsers />, color: 'bg-blue-500' },
                    { title: 'Perjalanan Dinas', value: '18', icon: <FiCalendar />, color: 'bg-green-500' },
                    { title: 'Dokumen', value: '856', icon: <FiFileText />, color: 'bg-purple-500' },
                    { title: 'Anggaran', value: 'Rp 2.8M', icon: <FiDollarSign />, color: 'bg-yellow-500' }
                ],
                recentActivities: [
                    'Perjalanan dinas ke Jakarta telah disetujui',
                    'Laporan keuangan bulan ini telah diselesaikan',
                    'Rapat koordinasi dengan bidang-bidang',
                    'Update data kepegawaian'
                ],
                quickActions: [
                    { title: 'Data Pegawai', path: '/dashboard/pegawai', icon: <FiUsers /> },
                    { title: 'Perjalanan Dinas', path: '/dashboard/perjalanan-dinas', icon: <FiCalendar /> },
                    { title: 'Kelola User', path: '/dashboard/users', icon: <FiUsers /> },
                    { title: 'Hero Gallery', path: '/dashboard/hero-gallery', icon: <FiGrid /> }
                ]
            },
            'sarana_prasarana': {
                title: 'Dashboard Sarana Prasarana',
                stats: [
                    { title: 'Total BUMDes', value: '89', icon: <TbBuildingBank />, color: 'bg-blue-500' },
                    { title: 'Infrastruktur', value: '156', icon: <TbMap />, color: 'bg-green-500' },
                    { title: 'Proyek Aktif', value: '23', icon: <FiActivity />, color: 'bg-purple-500' },
                    { title: 'Anggaran', value: 'Rp 8.5M', icon: <FiDollarSign />, color: 'bg-yellow-500' }
                ],
                recentActivities: [
                    'Data BUMDes Desa Sukamaju telah diperbarui',
                    'Proyek jalan desa Ciawi 70% selesai',
                    'Pembangunan posyandu dimulai',
                    'Survey infrastruktur desa terpencil'
                ],
                quickActions: [
                    { title: 'Data BUMDes', path: '/dashboard/bumdes', icon: <TbBuildingBank /> },
                    { title: 'Samisade', path: '/dashboard/samisade', icon: <TbMap /> },
                    { title: 'Kelembagaan', path: '/dashboard/kelembagaan', icon: <TbUserPentagon /> },
                    { title: 'Hero Gallery', path: '/dashboard/hero-gallery', icon: <FiGrid /> }
                ]
            },
            'kekayaan_keuangan': {
                title: 'Dashboard Kekayaan & Keuangan',
                stats: [
                    { title: 'Dana Desa', value: 'Rp 12.4M', icon: <TbHomeDollar />, color: 'bg-blue-500' },
                    { title: 'APBD', value: 'Rp 45.2M', icon: <FiDollarSign />, color: 'bg-green-500' },
                    { title: 'BHPRD', value: 'Rp 8.7M', icon: <TbHomeDollar />, color: 'bg-purple-500' },
                    { title: 'Realisasi', value: '78%', icon: <FiTrendingUp />, color: 'bg-yellow-500' }
                ],
                recentActivities: [
                    'Penyaluran dana desa tahap III telah selesai',
                    'Laporan APBD Q3 telah disubmit',
                    'Verifikasi BHPRD desa-desa',
                    'Rekonsiliasi keuangan bulanan'
                ],
                quickActions: [
                    { title: 'Dana Desa', path: '/dashboard/dana-desa', icon: <TbHomeDollar /> },
                    { title: 'APBD', path: '/dashboard/alokasi-dana-desa', icon: <FiDollarSign /> },
                    { title: 'BHPRD', path: '/dashboard/bhprd', icon: <TbHomeDollar /> },
                    { title: 'Data BUMDes', path: '/dashboard/bumdes', icon: <TbBuildingBank /> }
                ]
            },
            'pemberdayaan_masyarakat': {
                title: 'Dashboard Pemberdayaan Masyarakat',
                stats: [
                    { title: 'Program PKK', value: '125', icon: <FiUsers />, color: 'bg-blue-500' },
                    { title: 'UMKM Aktif', value: '234', icon: <TbBuildingBank />, color: 'bg-green-500' },
                    { title: 'Kegiatan Sosial', value: '67', icon: <FiActivity />, color: 'bg-purple-500' },
                    { title: 'Peserta', value: '2,450', icon: <FiUsers />, color: 'bg-yellow-500' }
                ],
                recentActivities: [
                    'Pelatihan UMKM batch 3 telah selesai',
                    'Program PKK desa binaan aktif',
                    'Bantuan sosial telah disalurkan',
                    'Workshop keterampilan menjahit'
                ],
                quickActions: [
                    { title: 'Kelembagaan', path: '/dashboard/kelembagaan', icon: <TbUserPentagon /> },
                    { title: 'Data BUMDes', path: '/dashboard/bumdes', icon: <TbBuildingBank /> },
                    { title: 'Hero Gallery', path: '/dashboard/hero-gallery', icon: <FiGrid /> },
                    { title: 'Kelola User', path: '/dashboard/users', icon: <FiUsers /> }
                ]
            },
            'pemerintahan_desa': {
                title: 'Dashboard Pemerintahan Desa',
                stats: [
                    { title: 'Total Desa', value: '416', icon: <FiMapPin />, color: 'bg-blue-500' },
                    { title: 'Aparatur Desa', value: '1,248', icon: <FiUsers />, color: 'bg-green-500' },
                    { title: 'BPD Aktif', value: '398', icon: <TbUserPentagon />, color: 'bg-purple-500' },
                    { title: 'Layanan Publik', value: '156', icon: <FiFileText />, color: 'bg-yellow-500' }
                ],
                recentActivities: [
                    'Pelantikan aparatur desa baru',
                    'Rapat koordinasi BPD se-kabupaten',
                    'Update data profil desa',
                    'Evaluasi pelayanan publik desa'
                ],
                quickActions: [
                    { title: 'Profil Desa', path: '/dashboard/profil-desa', icon: <FiMapPin /> },
                    { title: 'Aparatur Desa', path: '/dashboard/aparatur-desa', icon: <FiUsers /> },
                    { title: 'Kelembagaan', path: '/dashboard/kelembagaan', icon: <TbUserPentagon /> },
                    { title: 'Hero Gallery', path: '/dashboard/hero-gallery', icon: <FiGrid /> }
                ]
            },
            // Dashboard untuk Admin Desa
            'admin_desa': {
                title: 'Dashboard Admin Desa',
                stats: [
                    { title: 'Jumlah RW', value: '12', icon: <FiMapPin />, color: 'bg-blue-500' },
                    { title: 'Jumlah RT', value: '48', icon: <FiHome />, color: 'bg-green-500' },
                    { title: 'Penduduk', value: '3,245', icon: <FiUsers />, color: 'bg-purple-500' },
                    { title: 'Dana Desa', value: 'Rp 850M', icon: <FiDollarSign />, color: 'bg-yellow-500' }
                ],
                recentActivities: [
                    'Data kependudukan telah diperbarui',
                    'Laporan bulanan telah dikirim ke kecamatan',
                    'Rapat BPD terlaksana dengan baik',
                    'Pelayanan administratif berjalan lancar'
                ],
                quickActions: [
                    { title: 'Profil Desa', path: '/dashboard/profil-desa', icon: <FiMapPin /> },
                    { title: 'Data Penduduk', path: '/dashboard/penduduk', icon: <FiUsers /> },
                    { title: 'Aparatur Desa', path: '/dashboard/aparatur-desa', icon: <FiUsers /> },
                    { title: 'Laporan', path: '/dashboard/laporan-desa', icon: <FiFileText /> }
                ]
            },
            // Dashboard untuk Admin Kecamatan
            'admin_kecamatan': {
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
                    'Monitoring pembangunan infrastruktur'
                ],
                quickActions: [
                    { title: 'Data Desa', path: '/dashboard/data-desa', icon: <FiMapPin /> },
                    { title: 'Laporan Desa', path: '/dashboard/laporan-desa', icon: <FiFileText /> },
                    { title: 'Program Kecamatan', path: '/dashboard/program-kecamatan', icon: <FiActivity /> },
                    { title: 'Koordinasi', path: '/dashboard/koordinasi', icon: <FiUsers /> }
                ]
            },
            // Dashboard untuk Admin Dinas
            'admin_dinas': {
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
                    'Evaluasi kinerja kecamatan dan desa'
                ],
                quickActions: [
                    { title: 'Monitoring Kecamatan', path: '/dashboard/monitoring-kecamatan', icon: <FiMapPin /> },
                    { title: 'Data Desa', path: '/dashboard/data-desa', icon: <FiHome /> },
                    { title: 'Laporan Strategis', path: '/dashboard/laporan-strategis', icon: <FiFileText /> },
                    { title: 'Program Dinas', path: '/dashboard/program-dinas', icon: <FiActivity /> }
                ]
            }
        };

        const config = dashboardConfigs[userRole] || dashboardConfigs['superadmin'];
        setDashboardData(config);
    };

    const getRoleBadgeColor = (role) => {
        const colors = {
            'superadmin': 'bg-red-100 text-red-800',
            'admin': 'bg-red-100 text-red-800',
            'sekretariat': 'bg-blue-100 text-blue-800',
            'sarana_prasarana': 'bg-green-100 text-green-800',
            'kekayaan_keuangan': 'bg-yellow-100 text-yellow-800',
            'pemberdayaan_masyarakat': 'bg-purple-100 text-purple-800',
            'pemerintahan_desa': 'bg-indigo-100 text-indigo-800',
            'admin_desa': 'bg-cyan-100 text-cyan-800',
            'admin_kecamatan': 'bg-teal-100 text-teal-800',
            'admin_dinas': 'bg-pink-100 text-pink-800'
        };
        return colors[role] || 'bg-gray-100 text-gray-800';
    };

    if (!userRole) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-gray-600">Memuat dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{dashboardData.title}</h1>
                        <p className="text-gray-600 mt-1">
                            Selamat datang, {userData?.name}
                        </p>
                    </div>
                    <div className="flex items-center space-x-3">
                    
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

export default UniversalDashboard;