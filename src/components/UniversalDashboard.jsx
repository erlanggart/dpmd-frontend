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
    TbUserPentagon,
    TbCoin
} from 'react-icons/tb';
import AnimatedCounter from '../components/AnimatedCounter'; // Import komponen AnimatedCounter yang baru
import { getUserRole, getDisposisiMenuPath, getDisposisiMenuLabel } from '../utils/roleUtils';

const UniversalDashboard = () => {
    const [userRole, setUserRole] = useState(null);
    const [userData, setUserData] = useState(null);
    const [dashboardData, setDashboardData] = useState({
        title: '', // Tambahkan default title
        stats: [],
        recentActivities: [],
        quickActions: []
    });

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        
        if (storedUser) {
            const regularUser = JSON.parse(storedUser);
            
            const allowedRoles = [
                'superadmin', 
                'sekretariat', 
                'sarana_prasarana', 
                'kekayaan_keuangan', 
                'pemberdayaan_masyarakat', 
                'pemerintahan_desa'
            ];
            
            let detectedRole = null;
            
            if (regularUser.bidangRole && allowedRoles.includes(regularUser.bidangRole)) {
                detectedRole = regularUser.bidangRole;
            } 
            else if (regularUser.role && allowedRoles.includes(regularUser.role)) {
                detectedRole = regularUser.role;
            }
            
            if (detectedRole) {
                setUserRole(detectedRole);
                setUserData(regularUser);
            } else {
                if (regularUser.role === 'desa') {
                    window.location.href = '/desa/dashboard';
                } else if (regularUser.role === 'kecamatan') {
                    window.location.href = '/kecamatan/dashboard';
                } else if (regularUser.role === 'dinas') {
                    window.location.href = '/dinas/dashboard';
                } else {
                    window.location.href = '/';
                }
            }
        } else {
            window.location.href = '/';
        }
    }, []);

    useEffect(() => {
        if (userRole) {
            loadDashboardData();
        }
    }, [userRole]);



    const loadDashboardData = async () => {
        const dashboardConfigs = {
            'superadmin': {
                title: 'Dashboard Super Admin',
                stats: [
                    { title: 'Total Desa', value: '416', icon: <FiMapPin />, color: 'bg-indigo-700' }, // Ubah warna di sini
                    { title: 'Total User', value: '1250', icon: <FiUsers />, color: 'bg-indigo-700' }, // Ubah warna di sini
                    { title: 'Dokumen', value: '3420', icon: <FiFileText />, color: 'bg-indigo-700' }, // Ubah warna di sini
                    { title: 'Anggaran', value: 'Rp 15.2M', icon: <FiDollarSign />, color: 'bg-indigo-700' } // Ubah warna di sini
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
                    { title: 'Kelembagaan', path: '/bidang/pmd/kelembagaan', icon: <TbUserPentagon /> },
                    { title: 'Data BUMDes', path: '/dashboard/bumdes', icon: <TbBuildingBank /> }
                ]
            },
            'admin': {
                title: 'Dashboard Admin',
                stats: [
                    { title: 'Total Desa', value: '416', icon: <FiMapPin />, color: 'bg-indigo-700' },
                    { title: 'Total User', value: '1250', icon: <FiUsers />, color: 'bg-indigo-700' },
                    { title: 'Dokumen', value: '3420', icon: <FiFileText />, color: 'bg-indigo-700' },
                    { title: 'Anggaran', value: 'Rp 15.2M', icon: <FiDollarSign />, color: 'bg-indigo-700' }
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
                    { title: 'Kelembagaan', path: '/bidang/pmd/kelembagaan', icon: <TbUserPentagon /> },
                    { title: 'Data BUMDes', path: '/dashboard/bumdes', icon: <TbBuildingBank /> }
                ]
            },
            'sekretariat': {
                title: 'Dashboard Sekretariat',
                stats: [
                    { title: 'Pegawai Aktif', value: '124', icon: <FiUsers />, color: 'bg-indigo-700' },
                    { title: 'Perjalanan Dinas', value: '18', icon: <FiCalendar />, color: 'bg-indigo-700' },
                    { title: 'Dokumen', value: '856', icon: <FiFileText />, color: 'bg-indigo-700' },
                    { title: 'Anggaran', value: 'Rp 2.8M', icon: <FiDollarSign />, color: 'bg-indigo-700' }
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
                    { title: getDisposisiMenuLabel(getUserRole()), path: getDisposisiMenuPath(getUserRole()), icon: <FiFileText /> },
                    { title: 'Kelola User', path: '/dashboard/users', icon: <FiUsers /> },
                    { title: 'Hero Gallery', path: '/dashboard/hero-gallery', icon: <FiGrid /> }
                ]
            },
            'sarana_prasarana': {
                title: 'Dashboard Sarana Prasarana',
                stats: [
                    { title: 'Total BUMDes', value: '89', icon: <TbBuildingBank />, color: 'bg-indigo-700' },
                    { title: 'Infrastruktur', value: '156', icon: <TbMap />, color: 'bg-indigo-700' },
                    { title: 'Proyek Aktif', value: '23', icon: <FiActivity />, color: 'bg-indigo-700' },
                    { title: 'Anggaran', value: 'Rp 8.5M', icon: <FiDollarSign />, color: 'bg-indigo-700' }
                ],
                recentActivities: [
                    'Data BUMDes Desa Sukamaju telah diperbarui',
                    'Proyek jalan desa Ciawi 70% selesai',
                    'Pembangunan posyandu dimulai',
                    'Survey infrastruktur desa terpencil'
                ],
                quickActions: [
                    { title: 'Data BUMDes', path: '/dashboard/bumdes', icon: <TbBuildingBank /> },
                    { title: 'Bantuan Keuangan', path: '/dashboard/bankeu', icon: <TbCoin /> },
                    { title: getDisposisiMenuLabel(getUserRole()), path: getDisposisiMenuPath(getUserRole()), icon: <FiFileText /> },
                    { title: 'Hero Gallery', path: '/dashboard/hero-gallery', icon: <FiGrid /> }
                ]
            },
            'kekayaan_keuangan': {
                title: 'Dashboard Kekayaan & Keuangan',
                stats: [
                    { title: 'Dana Desa', value: 'Rp 12.4M', icon: <TbHomeDollar />, color: 'bg-indigo-700' },
                    { title: 'APBD', value: 'Rp 45.2M', icon: <FiDollarSign />, color: 'bg-indigo-700' },
                    { title: 'BHPRD', value: 'Rp 8.7M', icon: <TbHomeDollar />, color: 'bg-indigo-700' },
                    { title: 'Realisasi', value: '78%', icon: <FiTrendingUp />, color: 'bg-indigo-700' }
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
                    { title: getDisposisiMenuLabel(getUserRole()), path: getDisposisiMenuPath(getUserRole()), icon: <FiFileText /> }
                ]
            },
            'pemberdayaan_masyarakat': {
                title: 'Dashboard Pemberdayaan Masyarakat',
                stats: [
                    { title: 'Program PKK', value: '125', icon: <FiUsers />, color: 'bg-indigo-700' },
                    { title: 'UMKM Aktif', value: '234', icon: <TbBuildingBank />, color: 'bg-indigo-700' },
                    { title: 'Kegiatan Sosial', value: '67', icon: <FiActivity />, color: 'bg-indigo-700' },
                    { title: 'Peserta', value: '2450', icon: <FiUsers />, color: 'bg-indigo-700' }
                ],
                recentActivities: [
                    'Pelatihan UMKM batch 3 telah selesai',
                    'Program PKK desa binaan aktif',
                    'Bantuan sosial telah disalurkan',
                    'Workshop keterampilan menjahit'
                ],
                quickActions: [
                    { title: 'Kelembagaan', path: '/bidang/pmd/kelembagaan', icon: <TbUserPentagon /> },
                    { title: getDisposisiMenuLabel(getUserRole()), path: getDisposisiMenuPath(getUserRole()), icon: <FiFileText /> },
                    { title: 'Hero Gallery', path: '/dashboard/hero-gallery', icon: <FiGrid /> },
                    { title: 'Kelola User', path: '/dashboard/users', icon: <FiUsers /> }
                ]
            },
            'pemerintahan_desa': {
                title: 'Dashboard Pemerintahan Desa',
                stats: [
                    { title: 'Total Desa', value: '416', icon: <FiMapPin />, color: 'bg-indigo-700' },
                    { title: 'Aparatur Desa', value: '1248', icon: <FiUsers />, color: 'bg-indigo-700' },
                    { title: 'BPD Aktif', value: '398', icon: <TbUserPentagon />, color: 'bg-indigo-700' },
                    { title: 'Layanan Publik', value: '156', icon: <FiFileText />, color: 'bg-indigo-700' }
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
                    { title: getDisposisiMenuLabel(getUserRole()), path: getDisposisiMenuPath(getUserRole()), icon: <FiFileText /> },
                    { title: 'Hero Gallery', path: '/dashboard/hero-gallery', icon: <FiGrid /> }
                ]
            },
            'admin_desa': {
                title: 'Dashboard Admin Desa',
                stats: [
                    { title: 'Jumlah RW', value: '12', icon: <FiMapPin />, color: 'bg-indigo-700' },
                    { title: 'Jumlah RT', value: '48', icon: <FiHome />, color: 'bg-indigo-700' },
                    { title: 'Penduduk', value: '3245', icon: <FiUsers />, color: 'bg-indigo-700' },
                    { title: 'Dana Desa', value: 'Rp 850M', icon: <FiDollarSign />, color: 'bg-indigo-700' }
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
                    { title: 'Aparatur Desa', path: '/dashboard/aparatur-desa', icon: <FiUsers /> }
                ]
            },
            'admin_kecamatan': {
                title: 'Dashboard Admin Kecamatan',
                stats: [
                    { title: 'Jumlah Desa', value: '15', icon: <FiMapPin />, color: 'bg-indigo-700' },
                    { title: 'Total Penduduk', value: '45678', icon: <FiUsers />, color: 'bg-indigo-700' },
                    { title: 'Aparatur', value: '234', icon: <FiUserCheck />, color: 'bg-indigo-700' },
                    { title: 'Program Aktif', value: '28', icon: <FiActivity />, color: 'bg-indigo-700' }
                ],
                recentActivities: [
                    'Koordinasi dengan 15 desa se-kecamatan',
                    'Laporan bulanan telah dikirim ke kabupaten',
                    'Program pemberdayaan masyarakat berjalan',
                    'Monitoring pembangunan infrastruktur'
                ],
                quickActions: [
                    { title: 'Data Desa', path: '/dashboard/data-desa', icon: <FiMapPin /> },
                    { title: 'Program Kecamatan', path: '/dashboard/program-kecamatan', icon: <FiActivity /> },
                    { title: 'Koordinasi', path: '/dashboard/koordinasi', icon: <FiUsers /> }
                ]
            },
            'admin_dinas': {
                title: 'Dashboard Admin Dinas',
                stats: [
                    { title: 'Kecamatan', value: '28', icon: <FiMapPin />, color: 'bg-indigo-700' },
                    { title: 'Total Desa', value: '416', icon: <FiHome />, color: 'bg-indigo-700' },
                    { title: 'Pegawai Dinas', value: '156', icon: <FiUsers />, color: 'bg-indigo-700' },
                    { title: 'Anggaran', value: 'Rp 125M', icon: <FiDollarSign />, color: 'bg-indigo-700' }
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
        <div className="space-y-6 -m-2">
            {/* Header */}
            <div className="bg-primary rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">{dashboardData.title}</h1>
                        <p className="text-gray-200 mt-1">
                            Selamat datang, {userData?.name}
                        </p>
                    </div>
                    <div className="flex items-center space-x-3">
                    
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

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {dashboardData.stats.map((stat, index) => (
                    <div 
                        key={index} 
                        className="bg-white rounded-lg shadow-md border border-gray-200 p-6 flex items-center transition-transform transform hover:scale-105" // Menambahkan hover effect
                    >
                        <div className={`p-3 rounded-lg bg-primary text-white mr-4 flex-shrink-0`}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                <AnimatedCounter endValue={stat.value} /> {/* Menggunakan AnimatedCounter */}
                            </p>
                            <p className="text-gray-600 text-sm">{stat.title}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow-sm  p-6">
                    <h2 className="text-lg font-semibold text-primary mb-4">Aksi Cepat</h2>
                    <div className="grid grid-cols-2 gap-3">
                        {dashboardData.quickActions.map((action, index) => (
                            <a
                                key={index}
                                href={action.path}
                                className="flex items-center bg-primary p-3 border border-gray-300 border-opacity-30 rounded-lg hover:bg-primary hover:bg-opacity-10 transition-colors group"
                            >
                                <div className="text-white  mr-3 group-hover:scale-110 transition-transform">
                                    {action.icon}
                                </div>
                                <span className="text-sm font-medium text-white">{action.title}</span>
                            </a>
                        ))}
                    </div>
                </div>

                {/* Recent Activities */}
                <div className="bg-white rounded-lg shadow-sm  p-6">
                    <h2 className="text-lg font-semibold text-primary mb-4">Aktivitas Terbaru</h2>
                    <div className="space-y-3">
                        {dashboardData.recentActivities.map((activity, index) => (
                            <div key={index} className="flex items-start hover:bg-white hover:bg-opacity-10 p-2 rounded-lg transition-colors">
                                <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                <p className="text-sm bg-primary text-white p-2 rounded">{activity}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UniversalDashboard;