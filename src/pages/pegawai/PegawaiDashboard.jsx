// src/pages/pegawai/PegawaiDashboard.jsx
// Modern redesign — dark glassmorphism, spring press effects, staggered animations
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
	User, Briefcase, Calendar, Award,
	Phone, TrendingUp, FileText,
	Clock, Activity, Building, Info, X, ExternalLink,
	Fingerprint,
} from "lucide-react";
import api from "../../api";
import { getUserAvatarUrl } from "../../utils/avatarUtils";
import { pressAnimation, cardPress, listItemVariants, fadeUp, scalePop } from "../../utils/animations";

const PegawaiDashboard = () => {
	const navigate = useNavigate();
	const [pegawaiData, setPegawaiData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "{}"));
	const [informasiList, setInformasiList] = useState([]);
	const [currentInformasiIndex, setCurrentInformasiIndex] = useState(0);
	const [showInformasiModal, setShowInformasiModal] = useState(false);
	const [selectedInformasi, setSelectedInformasi] = useState(null);

	useEffect(() => {
		const handleProfileUpdate = () => {
			const updatedUser = JSON.parse(localStorage.getItem("user") || "{}");
			setUser(updatedUser);
		};
		window.addEventListener("userProfileUpdated", handleProfileUpdate);
		return () => window.removeEventListener("userProfileUpdated", handleProfileUpdate);
	}, []);

	useEffect(() => {
		fetchPegawaiProfile();
		fetchInformasi();
	}, []);

	const fetchInformasi = async () => {
		try {
			const response = await api.get("/informasi/public");
			if (response.data.success && response.data.data?.length > 0) {
				setInformasiList(response.data.data);
			}
		} catch (err) {
			console.error("Error fetching informasi:", err);
		}
	};

	useEffect(() => {
		if (informasiList.length <= 1) return;
		const interval = setInterval(() => {
			setCurrentInformasiIndex((prev) => (prev + 1) % informasiList.length);
		}, 5000);
		return () => clearInterval(interval);
	}, [informasiList.length]);

	const fetchPegawaiProfile = async () => {
		try {
			setLoading(true);
			const user = JSON.parse(localStorage.getItem("user"));
			if (!user) { setError("User tidak ditemukan. Silakan login kembali."); return; }
			if (!user.pegawai_id) { setError("Data pegawai tidak ditemukan untuk user ini"); return; }
			const response = await api.get(`/pegawai/${user.pegawai_id}`);
			const pegawai = response.data.data;
			if (!pegawai) { setError("Data pegawai tidak ditemukan untuk user ini"); return; }
			setPegawaiData(pegawai);
		} catch (err) {
			console.error("Error fetching pegawai data:", err);
			setError("Gagal memuat data pegawai: " + (err.response?.data?.message || err.message));
		} finally {
			setLoading(false);
		}
	};

	// ─── Loading ─────────────────────────────────────────────
	if (loading) {
		return (
			<div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
				<motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
					<div className="relative w-16 h-16 mx-auto mb-4">
						<div className="absolute inset-0 rounded-full border-[3px] border-emerald-500/20" />
						<div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-emerald-500 animate-spin" />
					</div>
					<p className="text-white/60 font-medium text-sm tracking-wide">Memuat Data Pegawai...</p>
				</motion.div>
			</div>
		);
	}

	// ─── Error ───────────────────────────────────────────────
	if (error) {
		return (
			<div className="min-h-screen bg-[#0f0f1a] p-4 flex items-center justify-center">
				<motion.div {...scalePop} className="bg-white/[0.05] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-6 max-w-md w-full text-center">
					<div className="h-16 w-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
						<Activity className="h-8 w-8 text-red-400" />
					</div>
					<h3 className="font-bold text-white text-xl mb-2">Oops!</h3>
					<p className="text-white/50 text-sm mb-6">{error}</p>
					<motion.button
						{...pressAnimation}
						onClick={fetchPegawaiProfile}
						className="w-full bg-gradient-to-r from-emerald-500 to-green-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-emerald-500/25 cursor-pointer"
					>
						Coba Lagi
					</motion.button>
				</motion.div>
			</div>
		);
	}

	const firstName = pegawaiData?.nama_pegawai?.split(" ")[0] || "Pegawai";

	const ABSENSI_ELIGIBLE_STATUS = ['PPPK Paruh Waktu', 'Tenaga Alih Daya', 'Tenaga Keamanan', 'Tenaga Kebersihan'];
	const isAbsensiEligible = ABSENSI_ELIGIBLE_STATUS.includes(user.status_kepegawaian);

	const quickActions = [
		...(isAbsensiEligible
			? [{ icon: Fingerprint, label: "Presensi", color: "rose", emoji: "🕐", onClick: () => navigate("/dpmd/absensi") }]
			: [{ icon: Briefcase, label: "Perjadin", color: "emerald", emoji: "💼", onClick: () => navigate("/pegawai/perjadin") }]
		),
		{ icon: Calendar, label: "Jadwal", color: "sky", emoji: "📅", onClick: () => navigate("/pegawai/jadwal-kegiatan") },
		{ icon: Info, label: "Informasi", color: "amber", emoji: "📰", onClick: () => navigate("/dpmd/informasi") },
	];

	const colorClasses = {
		emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", icon: "bg-emerald-500/20" },
		sky: { bg: "bg-sky-500/10", border: "border-sky-500/20", text: "text-sky-400", icon: "bg-sky-500/20" },
		amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", icon: "bg-amber-500/20" },
		rose: { bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-400", icon: "bg-rose-500/20" },
	};

	return (
		<div className="min-h-screen bg-[#0f0f1a] pb-20 lg:pb-4">
			{/* ─── Header ──────────────────────────────────── */}
			<div className="relative overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-green-700 to-teal-800" />
				<div className="absolute -top-20 -right-20 w-60 h-60 bg-emerald-400/15 rounded-full blur-3xl animate-pulse" />
				<div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

				<div className="relative">
					<div className="h-[env(safe-area-inset-top,0px)]" />
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
						<motion.div {...fadeUp} className="flex items-center gap-4">
							{/* Avatar */}
							<div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-sm ring-2 ring-white/20 overflow-hidden shadow-xl flex-shrink-0">
								{getUserAvatarUrl(user) ? (
									<img src={getUserAvatarUrl(user)} alt={user.name} className="h-full w-full object-cover" />
								) : (
									<div className="h-full w-full flex items-center justify-center">
										<span className="text-xl font-bold text-white">{(user.name || firstName).charAt(0).toUpperCase()}</span>
									</div>
								)}
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-white/50 text-xs font-medium">Selamat Datang</p>
								<h2 className="text-white text-lg font-bold truncate">{user.name || firstName}</h2>
								<p className="text-white/50 text-xs truncate mt-0.5">
									Pegawai{pegawaiData?.bidangs?.nama ? ` · ${pegawaiData.bidangs.nama}` : user.bidang_name ? ` · ${user.bidang_name}` : ""}
								</p>
							</div>
						</motion.div>
					</div>
				</div>
			</div>

			{/* ─── Main Content ────────────────────────────── */}
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 relative z-10">

				{/* Quick Actions */}
				<motion.div
					initial={{ opacity: 0, y: 24 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
					className="bg-white/[0.05] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-5 mb-5 shadow-2xl"
				>
					<div className="flex items-center gap-2 mb-4">
						<div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
							<Activity className="h-4 w-4 text-white/40" />
						</div>
						<div>
							<h3 className="text-sm font-bold text-white/80">Menu Utama</h3>
							<p className="text-[10px] text-white/30">Akses cepat fitur pegawai</p>
						</div>
					</div>
					<div className="grid grid-cols-3 gap-3">
						{quickActions.map((action, i) => {
							const cc = colorClasses[action.color];
							return (
								<motion.button
									key={action.label}
									{...pressAnimation}
									custom={i}
									initial="hidden"
									animate="visible"
									variants={listItemVariants}
									onClick={action.onClick}
									className={`flex flex-col items-center gap-2.5 py-4 px-3 ${cc.bg} border ${cc.border} rounded-2xl cursor-pointer hover:brightness-110 transition-all`}
								>
									<div className={`w-12 h-12 ${cc.icon} rounded-xl flex items-center justify-center`}>
										<span className="text-2xl">{action.emoji}</span>
									</div>
									<span className={`text-xs font-bold ${cc.text}`}>{action.label}</span>
								</motion.button>
							);
						})}
					</div>
				</motion.div>

				{/* Informasi Pegawai */}
				<motion.div
					initial={{ opacity: 0, y: 24 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.15 }}
					className="mb-5"
				>
					<div className="flex items-center gap-2 mb-3">
						<div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
							<User className="h-4 w-4 text-white/40" />
						</div>
						<div>
							<h3 className="text-sm font-bold text-white/80">Informasi Pegawai</h3>
							<p className="text-[10px] text-white/30">Data profil dan kontak</p>
						</div>
					</div>

					<div className="space-y-3">
						{/* Bidang */}
						{pegawaiData?.bidang?.nama_bidang && (
							<motion.div {...cardPress} className="bg-sky-500/8 backdrop-blur-xl border border-sky-500/15 rounded-2xl p-4">
								<div className="flex items-center gap-3">
									<div className="w-12 h-12 bg-sky-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
										<Building className="h-6 w-6 text-sky-400" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-[10px] text-sky-400 font-semibold uppercase tracking-wider">Bidang</p>
										<p className="text-sm font-bold text-white/90 truncate">{pegawaiData.bidang.nama_bidang}</p>
										<p className="text-[10px] text-white/30 mt-0.5">Unit Kerja</p>
									</div>
								</div>
							</motion.div>
						)}

						{/* Informasi Banner */}
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
											src={`${import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://127.0.0.1:3001"}/${informasiList[currentInformasiIndex].gambar}`}
											alt={informasiList[currentInformasiIndex].judul}
											className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
										/>
										<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
										<motion.div
											initial={{ y: 20, opacity: 0 }}
											animate={{ y: 0, opacity: 1 }}
											transition={{ delay: 0.15 }}
											className="absolute bottom-0 left-0 right-0 p-4 text-left"
										>
											<div className="flex items-center gap-1.5 mb-1.5">
												<span className="inline-flex items-center px-2 py-0.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white text-[10px] font-semibold rounded-full shadow-lg">
													<Info className="h-2.5 w-2.5 mr-0.5" /> Informasi
												</span>
												{informasiList.length > 1 && (
													<span className="text-white/70 text-[10px] font-medium bg-white/10 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
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

						{/* NIP */}
						{pegawaiData?.nip && (
							<motion.div {...cardPress} className="bg-emerald-500/8 backdrop-blur-xl border border-emerald-500/15 rounded-2xl p-4">
								<div className="flex items-center gap-3">
									<div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
										<FileText className="h-6 w-6 text-emerald-400" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">NIP</p>
										<p className="text-sm font-bold text-white/90">{pegawaiData.nip}</p>
										<p className="text-[10px] text-white/30 mt-0.5">Nomor Induk Pegawai</p>
									</div>
								</div>
							</motion.div>
						)}

						{/* No HP */}
						{pegawaiData?.no_hp && (
							<motion.div {...cardPress} className="bg-orange-500/8 backdrop-blur-xl border border-orange-500/15 rounded-2xl p-4">
								<div className="flex items-center gap-3">
									<div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
										<Phone className="h-6 w-6 text-orange-400" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-[10px] text-orange-400 font-semibold uppercase tracking-wider">No. HP</p>
										<p className="text-sm font-bold text-white/90">{pegawaiData.no_hp}</p>
										<p className="text-[10px] text-white/30 mt-0.5">Kontak pegawai</p>
									</div>
								</div>
							</motion.div>
						)}
					</div>
				</motion.div>

				{/* Pangkat & Golongan */}
				{(pegawaiData?.pangkat || pegawaiData?.golongan) && (
					<motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-5">
						<div className="flex items-center gap-2 mb-3">
							<div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
								<FileText className="h-4 w-4 text-white/40" />
							</div>
							<div>
								<h3 className="text-sm font-bold text-white/80">Informasi Tambahan</h3>
								<p className="text-[10px] text-white/30">Detail pegawai</p>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-3">
							{pegawaiData?.pangkat && (
								<motion.div {...cardPress} className="bg-indigo-500/8 backdrop-blur-xl border border-indigo-500/15 rounded-2xl p-4">
									<div className="flex flex-col items-center text-center">
										<div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-3">
											<Award className="h-6 w-6 text-indigo-400" />
										</div>
										<p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider mb-1">Pangkat</p>
										<p className="text-sm font-bold text-white/90 break-words">{pegawaiData.pangkat}</p>
									</div>
								</motion.div>
							)}
							{pegawaiData?.golongan && (
								<motion.div {...cardPress} className="bg-amber-500/8 backdrop-blur-xl border border-amber-500/15 rounded-2xl p-4">
									<div className="flex flex-col items-center text-center">
										<div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center mb-3">
											<TrendingUp className="h-6 w-6 text-amber-400" />
										</div>
										<p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider mb-1">Golongan</p>
										<p className="text-sm font-bold text-white/90">{pegawaiData.golongan}</p>
									</div>
								</motion.div>
							)}
						</div>
					</motion.div>
				)}

				{/* Activity Summary */}
				<motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mb-5">
					<div className="flex items-center gap-2 mb-3">
						<div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
							<Clock className="h-4 w-4 text-white/40" />
						</div>
						<div>
							<h3 className="text-sm font-bold text-white/80">Ringkasan Aktivitas</h3>
							<p className="text-[10px] text-white/30">Statistik bulan ini</p>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<motion.div {...cardPress} className="bg-sky-500/8 backdrop-blur-xl border border-sky-500/15 rounded-2xl p-4">
							<div className="flex flex-col items-center text-center">
								<div className="w-12 h-12 bg-sky-500/20 rounded-xl flex items-center justify-center mb-3">
									<Briefcase className="h-6 w-6 text-sky-400" />
								</div>
								<p className="text-3xl font-black text-white/90 mb-1">0</p>
								<p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Perjalanan Dinas</p>
								<p className="text-[9px] text-white/20 mt-0.5">Bulan ini</p>
							</div>
						</motion.div>
						<motion.div {...cardPress} className="bg-violet-500/8 backdrop-blur-xl border border-violet-500/15 rounded-2xl p-4">
							<div className="flex flex-col items-center text-center">
								<div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center mb-3">
									<Calendar className="h-6 w-6 text-violet-400" />
								</div>
								<p className="text-3xl font-black text-white/90 mb-1">0</p>
								<p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Kegiatan</p>
								<p className="text-[9px] text-white/20 mt-0.5">Terjadwal</p>
							</div>
						</motion.div>
					</div>
				</motion.div>

				{/* Footer */}
				<div className="text-center py-6">
					<p className="text-white/15 text-xs">Data pegawai dikelola oleh DPMD</p>
					<p className="text-white/15 text-xs mt-1">DPMD Kabupaten Bogor © 2025</p>
				</div>
			</div>

			{/* ─── Informasi Modal ──────────────────────────── */}
			<AnimatePresence>
				{showInformasiModal && selectedInformasi && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
						onClick={() => setShowInformasiModal(false)}
					>
						<motion.div
							initial={{ y: 100, opacity: 0, scale: 0.95 }}
							animate={{ y: 0, opacity: 1, scale: 1 }}
							exit={{ y: 100, opacity: 0, scale: 0.95 }}
							transition={{ type: "spring", damping: 25, stiffness: 300 }}
							className="bg-[#1a1a2e] border border-white/10 w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[90vh] overflow-hidden"
							onClick={(e) => e.stopPropagation()}
						>
							<div className="sm:hidden flex justify-center py-3">
								<div className="w-12 h-1.5 bg-white/20 rounded-full" />
							</div>

							{/* Image */}
							<div className="relative h-52 sm:h-64 overflow-hidden">
								<img
									src={`${import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://127.0.0.1:3001"}/${selectedInformasi.gambar}`}
									alt={selectedInformasi.judul}
									className="w-full h-full object-cover"
								/>
								<div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e] via-transparent to-transparent" />
								<motion.button
									{...pressAnimation}
									onClick={() => setShowInformasiModal(false)}
									className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors cursor-pointer"
								>
									<X className="h-5 w-5" />
								</motion.button>
								<div className="absolute bottom-4 left-4 right-4">
									<span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-teal-500 to-teal-600 text-white text-xs font-semibold rounded-full shadow-lg mb-2">
										<Info className="h-3 w-3 mr-1" /> Informasi DPMD
									</span>
								</div>
							</div>

							{/* Content */}
							<div className="p-6 max-h-[40vh] overflow-y-auto">
								<h2 className="text-xl font-bold text-white mb-4 leading-tight">{selectedInformasi.judul}</h2>
								{selectedInformasi.deskripsi ? (
									<p className="text-white/50 whitespace-pre-wrap leading-relaxed text-sm">{selectedInformasi.deskripsi}</p>
								) : (
									<p className="text-white/25 italic text-sm">Tidak ada detail informasi tambahan.</p>
								)}
								{selectedInformasi.link && (
									<motion.a
										{...pressAnimation}
										href={selectedInformasi.link}
										target="_blank"
										rel="noopener noreferrer"
										className="mt-5 flex items-center justify-center gap-2 w-full py-3 px-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 cursor-pointer"
									>
										<ExternalLink className="h-4 w-4" /> Buka Link
									</motion.a>
								)}
							</div>

							{/* Footer */}
							<div className="px-6 py-4 border-t border-white/[0.06]">
								<motion.button
									{...pressAnimation}
									onClick={() => setShowInformasiModal(false)}
									className="w-full py-3 px-4 bg-white/5 border border-white/10 text-white/60 font-medium rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
								>
									Tutup
								</motion.button>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default PegawaiDashboard;
