// src/pages/pegawai/PegawaiDashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { 
	User, Briefcase, Mail, Calendar, Award, 
	Phone, MapPin, TrendingUp, FileText,
	Clock, Activity, Users, Building, Info
} from "lucide-react";
import api from "../../api";
import MobileHeader from '../../components/mobile/MobileHeader';
import InfoCard from '../../components/mobile/InfoCard';
import SectionHeader from '../../components/mobile/SectionHeader';
import ServiceGrid from '../../components/mobile/ServiceGrid';
import { getUserAvatarUrl } from '../../utils/avatarUtils';

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

			// Check if user has pegawai_id
			if (!user.pegawai_id) {
				setError("Data pegawai tidak ditemukan untuk user ini");
				return;
			}

			// Fetch pegawai data by ID
			const response = await api.get(`/pegawai/${user.pegawai_id}`);
			const pegawai = response.data.data;

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

	// Quick Actions Menu - Simplified to 3 items
	const quickActions = [
		{
			icon: Briefcase,
			label: 'Perjadin',
			color: 'green',
			onClick: () => navigate('/pegawai/perjadin')
		},
		{
			icon: Calendar,
			label: 'Jadwal',
			color: 'blue',
			onClick: () => navigate('/pegawai/jadwal-kegiatan')
		},
		{
			icon: Info,
			label: 'Informasi',
			color: 'orange',
			onClick: () => navigate('/dpmd/informasi')
		}
	];

	return (
		<div className="min-h-screen bg-gray-50 pb-20 lg:pb-4">
			{/* Mobile Header - GoJek Style */}
			<MobileHeader
				userName={user.name || firstName}
				userRole="Pegawai"
				greeting="Selamat Datang"
				gradient="from-green-600 via-green-700 to-green-800"
				avatar={getUserAvatarUrl(user)}
			/>

		{/* Main Content */}
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
			{/* Quick Actions Section */}
			<div className="bg-white rounded-[24px] sm:rounded-[28px] shadow-lg shadow-gray-200/60 p-5 sm:p-6 mb-5 border border-gray-100">
				<SectionHeader 
					title="Menu Utama" 
					subtitle="Akses cepat fitur pegawai"
					icon={Activity}
				/>
				<ServiceGrid services={quickActions} columns={3} />
			</div>				{/* Info Section */}
				<div className="mb-5">
					<SectionHeader 
						title="Informasi Pegawai" 
						subtitle="Data profil dan kontak"
						icon={User}
					/>
					<div className="space-y-3">
						{/* Bidang */}
						{pegawaiData?.bidang?.nama_bidang && (
							<div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200">
								<div className="flex items-center gap-3">
									<div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
										<Building className="h-6 w-6 text-white" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-xs text-blue-600 font-medium mb-0.5">Bidang</p>
										<p className="text-sm font-bold text-gray-900 truncate">{pegawaiData.bidang.nama_bidang}</p>
										<p className="text-xs text-gray-500 mt-0.5">Unit Kerja</p>
									</div>
								</div>
							</div>
						)}

						{/* Email */}
						<div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 border border-purple-200">
							<div className="flex items-center gap-3">
								<div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
									<Mail className="h-6 w-6 text-white" />
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-xs text-purple-600 font-medium mb-0.5">Email</p>
									<p className="text-sm font-bold text-gray-900 truncate break-all">{pegawaiData?.users?.[0]?.email || user.email || '-'}</p>
									<p className="text-xs text-gray-500 mt-0.5">Email resmi</p>
								</div>
							</div>
						</div>

						{/* NIP - Only show if exists */}
						{pegawaiData?.nip && (
							<div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 border border-green-200">
								<div className="flex items-center gap-3">
									<div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
										<FileText className="h-6 w-6 text-white" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-xs text-green-600 font-medium mb-0.5">NIP</p>
										<p className="text-sm font-bold text-gray-900">{pegawaiData.nip}</p>
										<p className="text-xs text-gray-500 mt-0.5">Nomor Induk Pegawai</p>
									</div>
								</div>
							</div>
						)}

						{/* No HP - Only show if exists */}
						{pegawaiData?.no_hp && (
							<div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-4 border border-orange-200">
								<div className="flex items-center gap-3">
									<div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
										<Phone className="h-6 w-6 text-white" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-xs text-orange-600 font-medium mb-0.5">No. HP</p>
										<p className="text-sm font-bold text-gray-900">{pegawaiData.no_hp}</p>
										<p className="text-xs text-gray-500 mt-0.5">Kontak pegawai</p>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Additional Info Cards - Only show if data exists */}
				{(pegawaiData?.pangkat || pegawaiData?.golongan) && (
					<div className="mb-5">
						<SectionHeader 
							title="Informasi Tambahan" 
							subtitle="Detail pegawai"
							icon={FileText}
						/>
						<div className="grid grid-cols-2 gap-3">
							{pegawaiData?.pangkat && (
								<div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-4 border border-indigo-200">
									<div className="flex flex-col items-center text-center">
										<div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-3">
											<Award className="h-6 w-6 text-white" />
										</div>
										<p className="text-xs text-indigo-600 font-medium mb-1">Pangkat</p>
										<p className="text-sm font-bold text-gray-900 break-words">{pegawaiData.pangkat}</p>
									</div>
								</div>
							)}
							{pegawaiData?.golongan && (
								<div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-4 border border-orange-200">
									<div className="flex flex-col items-center text-center">
										<div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center mb-3">
											<TrendingUp className="h-6 w-6 text-white" />
										</div>
										<p className="text-xs text-orange-600 font-medium mb-1">Golongan</p>
										<p className="text-sm font-bold text-gray-900">{pegawaiData.golongan}</p>
									</div>
								</div>
							)}
						</div>
					</div>
				)}

				{/* Activity Summary */}
				<div className="mb-5">
					<SectionHeader 
						title="Ringkasan Aktivitas" 
						subtitle="Statistik bulan ini"
						icon={Clock}
					/>
					<div className="grid grid-cols-2 gap-3">
						<div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200">
							<div className="flex flex-col items-center text-center">
								<div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-3">
									<Briefcase className="h-6 w-6 text-white" />
								</div>
								<p className="text-2xl font-bold text-gray-900 mb-1">0</p>
								<p className="text-xs text-gray-600 font-medium">Perjalanan Dinas</p>
								<p className="text-xs text-gray-400 mt-0.5">Bulan ini</p>
							</div>
						</div>
						<div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 border border-purple-200">
							<div className="flex flex-col items-center text-center">
								<div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mb-3">
									<Calendar className="h-6 w-6 text-white" />
								</div>
								<p className="text-2xl font-bold text-gray-900 mb-1">0</p>
								<p className="text-xs text-gray-600 font-medium">Kegiatan</p>
								<p className="text-xs text-gray-400 mt-0.5">Terjadwal</p>
							</div>
						</div>
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
