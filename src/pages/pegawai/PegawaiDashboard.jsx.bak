// src/pages/pegawai/PegawaiDashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
	User, Briefcase, Mail, Calendar, Award, 
	Phone, MapPin, TrendingUp, FileText,
	Clock, Activity, Users, Building, Info, Newspaper, ChevronRight, X, ExternalLink
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
	const [informasiList, setInformasiList] = useState([]);
	const [currentInformasiIndex, setCurrentInformasiIndex] = useState(0);
	const [showInformasiModal, setShowInformasiModal] = useState(false);
	const [selectedInformasi, setSelectedInformasi] = useState(null);

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
		fetchInformasi();
	}, []);

	const fetchInformasi = async () => {
		try {
			const response = await api.get('/informasi/public');
			if (response.data.success && response.data.data?.length > 0) {
				setInformasiList(response.data.data);
			}
		} catch (err) {
			console.error('Error fetching informasi:', err);
		}
	};

	// Rotate informasi every 5 seconds
	useEffect(() => {
		if (informasiList.length <= 1) return;
		const interval = setInterval(() => {
			setCurrentInformasiIndex(prev => (prev + 1) % informasiList.length);
		}, 5000);
		return () => clearInterval(interval);
	}, [informasiList.length]);

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
				bidangName={pegawaiData?.bidangs?.nama || user.bidang_name}
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

						{/* Informasi Banner with Smooth Animation */}
						{informasiList.length > 0 && (
							<div className="relative w-full h-44 rounded-2xl overflow-hidden shadow-lg group">
								<AnimatePresence mode="wait">
									<motion.button
										key={currentInformasiIndex}
										initial={{ opacity: 0, x: 50 }}
										animate={{ opacity: 1, x: 0 }}
										exit={{ opacity: 0, x: -50 }}
										transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
										onClick={() => {
											setSelectedInformasi(informasiList[currentInformasiIndex]);
											setShowInformasiModal(true);
										}}
										className="absolute inset-0 w-full h-full cursor-pointer"
									>
										<img
											src={`${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://127.0.0.1:3001'}/${informasiList[currentInformasiIndex].gambar}`}
											alt={informasiList[currentInformasiIndex].judul}
											className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
										/>
										<div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
										<div className="absolute inset-0 bg-gradient-to-r from-teal-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
										<motion.div 
											initial={{ y: 20, opacity: 0 }}
											animate={{ y: 0, opacity: 1 }}
											transition={{ delay: 0.15, duration: 0.4, ease: "easeOut" }}
											className="absolute bottom-0 left-0 right-0 p-3 text-left"
										>
											<div className="flex items-center gap-1.5 mb-1">
												<span className="inline-flex items-center px-2 py-0.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white text-[10px] font-semibold rounded-full shadow-lg">
													<Info className="h-2.5 w-2.5 mr-0.5" />
													Informasi
												</span>
												{informasiList.length > 1 && (
													<span className="text-white/80 text-[10px] font-medium bg-black/30 px-1.5 py-0.5 rounded-full">
														{currentInformasiIndex + 1}/{informasiList.length}
													</span>
												)}
											</div>
											<p className="text-white font-bold text-sm line-clamp-1 drop-shadow-lg">{informasiList[currentInformasiIndex].judul}</p>
										</motion.div>
									</motion.button>
								</AnimatePresence>
							</div>
						)}

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

				<div className="text-center py-6">
					<p className="text-gray-400 text-xs">
						Data pegawai dikelola oleh DPMD
					</p>
					<p className="text-gray-400 text-xs mt-1">
						DPMD Kabupaten Bogor © 2025
					</p>
				</div>
			</div>

			{/* Modal Detail Informasi */}
			<AnimatePresence>
				{showInformasiModal && selectedInformasi && (
					<motion.div 
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
						onClick={() => setShowInformasiModal(false)}
					>
						<motion.div 
							initial={{ y: 100, opacity: 0, scale: 0.95 }}
							animate={{ y: 0, opacity: 1, scale: 1 }}
							exit={{ y: 100, opacity: 0, scale: 0.95 }}
							transition={{ type: "spring", damping: 25, stiffness: 300 }}
							className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl shadow-2xl max-h-[90vh] overflow-hidden"
							onClick={(e) => e.stopPropagation()}
						>
							{/* Drag Handle for mobile */}
							<div className="sm:hidden flex justify-center py-3">
								<div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
							</div>
							
							{/* Image */}
							<div className="relative h-52 sm:h-64 overflow-hidden">
								<img
									src={`${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://127.0.0.1:3001'}/${selectedInformasi.gambar}`}
									alt={selectedInformasi.judul}
									className="w-full h-full object-cover"
								/>
								<div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
								<button
									onClick={() => setShowInformasiModal(false)}
									className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
								>
									<X className="h-5 w-5" />
								</button>
								<div className="absolute bottom-4 left-4 right-4">
									<span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-teal-500 to-teal-600 text-white text-xs font-semibold rounded-full shadow-lg mb-2">
										<Info className="h-3 w-3 mr-1" />
										Informasi DPMD
									</span>
								</div>
							</div>
							
							{/* Content */}
							<div className="p-6 max-h-[40vh] overflow-y-auto">
								<h2 className="text-xl font-bold text-gray-900 mb-4 leading-tight">
									{selectedInformasi.judul}
								</h2>
								
								{selectedInformasi.deskripsi ? (
									<div className="prose prose-sm max-w-none">
										<p className="text-gray-600 whitespace-pre-wrap leading-relaxed">
											{selectedInformasi.deskripsi}
										</p>
									</div>
								) : (
									<p className="text-gray-400 italic text-sm">Tidak ada detail informasi tambahan.</p>
								)}
								
								{selectedInformasi.link && (
									<a
										href={selectedInformasi.link}
										target="_blank"
										rel="noopener noreferrer"
										className="mt-5 flex items-center justify-center gap-2 w-full py-3 px-4 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
									>
										<ExternalLink className="h-4 w-4" />
										Buka Link
									</a>
								)}
							</div>
							
							{/* Footer */}
							<div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
								<button
									onClick={() => setShowInformasiModal(false)}
									className="w-full py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-xl transition-colors"
								>
									Tutup
								</button>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default PegawaiDashboard;
