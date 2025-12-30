// src/pages/pegawai/PegawaiDashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { 
	User, Briefcase, Mail, Calendar, Award, 
	Phone, MapPin, TrendingUp, FileText,
	Clock, Activity, Users, Building
} from "lucide-react";
import api from "../../api";
import MobileHeader from '../../components/mobile/MobileHeader';
import InfoCard from '../../components/mobile/InfoCard';
import SectionHeader from '../../components/mobile/SectionHeader';
import ServiceGrid from '../../components/mobile/ServiceGrid';

const PegawaiDashboard = () => {
	const navigate = useNavigate();
	const [pegawaiData, setPegawaiData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));

	useEffect(() => {
		const handleProfileUpdate = () => {
			const updatedUser = JSON.parse(localStorage.getItem('user') || '{}');
			setUser(updatedUser);
		};
		window.addEventListener('userProfileUpdated', handleProfileUpdate);
		return () => window.removeEventListener('userProfileUpdated', handleProfileUpdate);
	}, []);

	useEffect(() => {
		fetchPegawaiProfile();
	}, []);

	const fetchPegawaiProfile = async () => {
		try {
			setLoading(true);
			const user = JSON.parse(localStorage.getItem("user"));
			
			if (!user) {
				setError("User tidak ditemukan. Silakan login kembali.");
				return;
			}

			// Cari pegawai berdasarkan email user
			const allPegawaiResponse = await api.get('/pegawai');
			const pegawaiList = allPegawaiResponse.data.data;
			
			// Find pegawai by matching user email
			const pegawai = pegawaiList.find(p => 
				p.users && p.users.length > 0 && p.users[0].email === user.email
			);

			if (!pegawai) {
				setError("Data pegawai tidak ditemukan untuk user ini");
				return;
			}

			setPegawaiData(pegawai);
		} catch (err) {
			console.error("Error fetching pegawai data:", err);
			setError("Gagal memuat data pegawai: " + (err.response?.data?.message || err.message));
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-green-600 via-green-700 to-green-800 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
					<p className="text-white font-semibold text-lg">Memuat Data Pegawai...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-green-600 via-green-700 to-green-800 p-4 flex items-center justify-center">
				<div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full">
					<div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<Activity className="h-8 w-8 text-red-600" />
					</div>
					<h3 className="text-center font-bold text-gray-800 text-xl mb-2">Oops!</h3>
					<p className="text-center text-gray-600 text-sm mb-6">{error}</p>
					<button
						onClick={fetchPegawaiProfile}
						className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg active:scale-95 transition-all"
					>
						Coba Lagi
					</button>
				</div>
			</div>
		);
	}

	const firstName = pegawaiData?.nama_pegawai?.split(' ')[0] || "Pegawai";

	// Quick Actions Menu
	const quickActions = [
		{
			icon: Briefcase,
			label: 'Perjadin',
			color: 'blue',
			onClick: () => navigate('/pegawai/perjadin')
		},
		{
			icon: Calendar,
			label: 'Jadwal',
			color: 'purple',
			onClick: () => navigate('/pegawai/jadwal')
		},
		{
			icon: User,
			label: 'Profil',
			color: 'green',
			onClick: () => navigate('/pegawai/profil')
		},
		{
			icon: Activity,
			label: 'Aktivitas',
			color: 'orange',
			onClick: () => navigate('/pegawai/aktivitas')
		}
	];

	return (
		<div className="min-h-screen bg-gray-50 pb-20">
			{/* Mobile Header - GoJek Style */}
			<MobileHeader
				userName={firstName}
				userRole="Pegawai DPMD"
				greeting="Halo"
				gradient="from-green-600 via-green-700 to-green-800"
				notificationCount={0}
				onNotificationClick={() => navigate('/pegawai/notifikasi')}
				onSettingsClick={() => navigate('/pegawai/profil')}
				avatar={user.avatar ? `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://127.0.0.1:3001'}${user.avatar}` : null}
			/>

			{/* Main Content */}
			<div className="px-4 -mt-4">
				{/* Profile Card */}
				<div className="bg-white rounded-3xl shadow-lg p-5 mb-5">
					<div className="flex items-center gap-4 mb-4">
						<div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md">
							{firstName.charAt(0).toUpperCase()}
						</div>
						<div className="flex-1">
							<h3 className="text-lg font-bold text-gray-900">{pegawaiData?.nama_pegawai}</h3>
							<p className="text-sm text-gray-600">{pegawaiData?.jabatan || 'Pegawai'}</p>
							<p className="text-xs text-gray-500 mt-1">NIP: {pegawaiData?.nip || '-'}</p>
						</div>
					</div>
				</div>

				{/* Quick Actions Section */}
				<div className="bg-white rounded-3xl shadow-lg p-5 mb-5">
					<SectionHeader 
						title="Menu Utama" 
						subtitle="Akses cepat fitur pegawai"
						icon={Activity}
					/>
					<ServiceGrid services={quickActions} columns={4} />
				</div>

				{/* Info Section */}
				<div className="mb-5">
					<SectionHeader 
						title="Informasi Pegawai" 
						subtitle="Data profil dan kontak"
						icon={User}
					/>
					<div className="space-y-3">
						<InfoCard
							icon={Building}
							title="Bidang"
							value={pegawaiData?.bidang?.nama_bidang || '-'}
							subtitle="Unit Kerja"
							color="blue"
						/>
						<InfoCard
							icon={Mail}
							title="Email"
							value={pegawaiData?.users?.[0]?.email || '-'}
							subtitle="Email resmi"
							color="purple"
						/>
						{pegawaiData?.no_hp && (
							<InfoCard
								icon={Phone}
								title="No. HP"
								value={pegawaiData.no_hp}
								subtitle="Kontak pegawai"
								color="green"
							/>
						)}
					</div>
				</div>

				{/* Additional Info Cards */}
				<div className="mb-5">
					<SectionHeader 
						title="Informasi Tambahan" 
						subtitle="Detail pegawai"
						icon={FileText}
					/>
					<div className="grid grid-cols-2 gap-3">
						{pegawaiData?.pangkat && (
							<InfoCard
								icon={Award}
								title="Pangkat"
								value={pegawaiData.pangkat}
								color="indigo"
							/>
						)}
						{pegawaiData?.golongan && (
							<InfoCard
								icon={TrendingUp}
								title="Golongan"
								value={pegawaiData.golongan}
								color="orange"
							/>
						)}
					</div>
				</div>

				{/* Activity Summary */}
				<div className="mb-5">
					<SectionHeader 
						title="Ringkasan Aktivitas" 
						subtitle="Statistik bulan ini"
						icon={Clock}
					/>
					<div className="grid grid-cols-2 gap-3">
						<InfoCard
							icon={Briefcase}
							title="Perjalanan Dinas"
							value="0"
							subtitle="Bulan ini"
							color="blue"
						/>
						<InfoCard
							icon={Calendar}
							title="Kegiatan"
							value="0"
							subtitle="Terjadwal"
							color="purple"
						/>
					</div>
				</div>

				{/* Footer Info */}
				<div className="text-center py-6">
					<p className="text-gray-400 text-xs">
						Data pegawai dikelola oleh DPMD
					</p>
					<p className="text-gray-400 text-xs mt-1">
						DPMD Kabupaten Bogor © 2025
					</p>
				</div>
			</div>
		</div>
	);
};

export default PegawaiDashboard;
