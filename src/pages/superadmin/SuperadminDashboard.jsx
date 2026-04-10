// src/pages/superadmin/SuperadminDashboard.jsx
import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
	FiShield,
	FiUsers,
	FiMap,
	FiMapPin,
	FiHome,
	FiBriefcase,
	FiFileText,
	FiCalendar,
	FiMail,
	FiBarChart2,
	FiActivity,
	FiCheckCircle,
	FiClock,
	FiTrendingUp,
	FiDatabase,
	FiUserCheck,
	FiBookOpen,
	FiAlertCircle,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import api from "../../api";
import OnlineUsersSidebar from "../../components/users/OnlineUsersSidebar";

const StatCard = ({ icon: Icon, label, value, gradient, accent, delay = 0, subtext }) => (
	<motion.div
		initial={{ opacity: 0, y: 20 }}
		animate={{ opacity: 1, y: 0 }}
		transition={{ delay, duration: 0.4 }}
		className="group relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-5 shadow-sm hover:shadow-lg transition-all duration-300"
	>
		<div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
			<div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-[0.03]`} />
		</div>
		<div className="relative flex items-start gap-4">
			<div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}>
				<Icon className="h-5 w-5 text-white" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
				<p className={`text-2xl font-bold ${accent} mt-0.5`}>
					{value !== null && value !== undefined ? value.toLocaleString('id-ID') : (
						<span className="inline-block h-7 w-16 animate-pulse rounded-lg bg-gray-200" />
					)}
				</p>
				{subtext && <p className="text-[11px] text-gray-400 mt-0.5">{subtext}</p>}
			</div>
		</div>
	</motion.div>
);

const MiniStatRow = ({ icon: Icon, label, value, color }) => (
	<div className="flex items-center justify-between py-2">
		<div className="flex items-center gap-2.5">
			<div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
				<Icon className="h-3.5 w-3.5" />
			</div>
			<span className="text-sm text-gray-600">{label}</span>
		</div>
		<span className="text-sm font-bold text-gray-800">
			{value !== null && value !== undefined ? value.toLocaleString('id-ID') : '—'}
		</span>
	</div>
);

const SuperadminDashboard = () => {
	const { user } = useAuth();
	const [generalStats, setGeneralStats] = useState(null);
	const [userStats, setUserStats] = useState(null);
	const [beritaStats, setBeritaStats] = useState(null);
	const [absensiStats, setAbsensiStats] = useState(null);
	const [loading, setLoading] = useState(true);
	const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

	useEffect(() => {
		const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	const fetchAllStats = useCallback(async () => {
		setLoading(true);
		try {
			const [generalRes, userRes, beritaRes, absensiRes] = await Promise.allSettled([
				api.get('/chatbot/stats'),
				api.get('/users/stats'),
				api.get('/berita/admin/stats'),
				api.get('/absensi/admin/dashboard-hari-ini'),
			]);

			if (generalRes.status === 'fulfilled' && generalRes.value.data.success) {
				setGeneralStats(generalRes.value.data.data);
			}
			if (userRes.status === 'fulfilled' && userRes.value.data.success) {
				setUserStats(userRes.value.data.data);
			}
			if (beritaRes.status === 'fulfilled' && beritaRes.value.data.success) {
				setBeritaStats(beritaRes.value.data.data);
			}
			if (absensiRes.status === 'fulfilled' && absensiRes.value.data.success) {
				setAbsensiStats(absensiRes.value.data.data);
			}
		} catch (err) {
			console.error('Failed to fetch dashboard stats:', err);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchAllStats();
	}, [fetchAllStats]);

	const currentHour = new Date().getHours();
	const greeting = currentHour < 12 ? "Selamat Pagi" : currentHour < 15 ? "Selamat Siang" : currentHour < 18 ? "Selamat Sore" : "Selamat Malam";

	return (
		<div className="min-h-screen p-4 md:p-6 lg:p-8">
			<div className={`flex gap-6 ${isDesktop ? '' : 'flex-col'}`}>
				{/* Main Content */}
				<div className="flex-1 min-w-0">
					{/* Welcome Banner */}
					<motion.div
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-6 md:p-8 shadow-xl mb-6"
					>
						<div className="absolute inset-0 opacity-20">
							<div className="absolute top-6 left-6 w-24 h-24 bg-white rounded-full blur-3xl" />
							<div className="absolute bottom-4 right-8 w-32 h-32 bg-white rounded-full blur-3xl" />
						</div>
						<div className="relative z-10 flex items-center gap-5">
							<div className="hidden md:flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm shadow-lg">
								<FiShield className="h-8 w-8 text-white" />
							</div>
							<div>
								<p className="text-blue-200 text-sm font-semibold tracking-wide">{greeting}</p>
								<h1 className="text-2xl md:text-3xl font-bold text-white mt-0.5">
									{user?.name || user?.nama || 'Superadmin'}
								</h1>
								<p className="text-blue-200/80 text-sm mt-1">
									Super Administrator · Full System Access
								</p>
							</div>
						</div>
					</motion.div>

					{/* Overview Stats Grid */}
					<div className="mb-6">
						<h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3 px-1">
							Ringkasan Data
						</h2>
						<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
							<StatCard
								icon={FiHome}
								label="Desa / Kelurahan"
								value={generalStats?.totalDesaDanKelurahan}
								gradient="from-emerald-500 to-teal-600"
								accent="text-emerald-700"
								delay={0}
								subtext={generalStats ? `${generalStats.totalDesa} desa · ${generalStats.totalKelurahan} kelurahan` : null}
							/>
							<StatCard
								icon={FiMapPin}
								label="Kecamatan"
								value={generalStats?.totalKecamatan}
								gradient="from-violet-500 to-indigo-600"
								accent="text-violet-700"
								delay={0.05}
							/>
							<StatCard
								icon={FiUsers}
								label="Pegawai DPMD"
								value={generalStats?.totalPegawai}
								gradient="from-orange-500 to-amber-600"
								accent="text-orange-700"
								delay={0.1}
							/>
							<StatCard
								icon={FiUserCheck}
								label="Aparatur Desa"
								value={generalStats?.totalAparatur}
								gradient="from-blue-500 to-cyan-600"
								accent="text-blue-700"
								delay={0.15}
							/>
							<StatCard
								icon={FiBriefcase}
								label="BUMDes"
								value={generalStats?.totalBumdes}
								gradient="from-amber-500 to-yellow-600"
								accent="text-amber-700"
								delay={0.2}
							/>
							<StatCard
								icon={FiBookOpen}
								label="Produk Hukum"
								value={generalStats?.totalProdukHukum}
								gradient="from-indigo-500 to-blue-600"
								accent="text-indigo-700"
								delay={0.25}
							/>
							<StatCard
								icon={FiCalendar}
								label="Kegiatan"
								value={generalStats?.totalKegiatan}
								gradient="from-cyan-500 to-blue-600"
								accent="text-cyan-700"
								delay={0.3}
							/>
							<StatCard
								icon={FiMail}
								label="Surat Masuk"
								value={generalStats?.totalSurat}
								gradient="from-rose-500 to-pink-600"
								accent="text-rose-700"
								delay={0.35}
							/>
						</div>
					</div>

					{/* Detail Panels Row */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
						{/* User Breakdown */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.4 }}
							className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
						>
							<div className="flex items-center gap-2 mb-4">
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
									<FiUsers className="h-4 w-4" />
								</div>
								<h3 className="text-sm font-bold text-gray-800">Pengguna Sistem</h3>
								{userStats?.total != null && (
									<span className="ml-auto text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
										{userStats.total}
									</span>
								)}
							</div>
							<div className="divide-y divide-gray-50">
								<MiniStatRow icon={FiShield} label="Super Admin" value={userStats?.superadmin} color="bg-rose-50 text-rose-600" />
								<MiniStatRow icon={FiBarChart2} label="Kepala Dinas" value={userStats?.kepala_dinas} color="bg-blue-50 text-blue-600" />
								<MiniStatRow icon={FiActivity} label="Sekretaris Dinas" value={userStats?.sekretaris_dinas} color="bg-indigo-50 text-indigo-600" />
								<MiniStatRow icon={FiBriefcase} label="Kepala Bidang" value={userStats?.kepala_bidang} color="bg-emerald-50 text-emerald-600" />
								<MiniStatRow icon={FiUserCheck} label="Ketua Tim" value={userStats?.ketua_tim} color="bg-teal-50 text-teal-600" />
								<MiniStatRow icon={FiUsers} label="Pegawai" value={userStats?.pegawai} color="bg-slate-50 text-slate-600" />
								<MiniStatRow icon={FiHome} label="Desa" value={userStats?.desa} color="bg-green-50 text-green-600" />
								<MiniStatRow icon={FiMapPin} label="Kecamatan" value={userStats?.kecamatan} color="bg-violet-50 text-violet-600" />
							</div>
						</motion.div>

						{/* Berita Stats */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.5 }}
							className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
						>
							<div className="flex items-center gap-2 mb-4">
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-100 text-pink-600">
									<FiFileText className="h-4 w-4" />
								</div>
								<h3 className="text-sm font-bold text-gray-800">Berita & Publikasi</h3>
								{beritaStats?.total_berita != null && (
									<span className="ml-auto text-xs font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">
										{beritaStats.total_berita}
									</span>
								)}
							</div>
							<div className="space-y-3">
								{/* Published vs Draft donut-like display */}
								<div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
									<div className="relative h-20 w-20 flex-shrink-0">
										<svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
											<circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3" />
											{beritaStats && beritaStats.total_berita > 0 && (
												<circle
													cx="18" cy="18" r="15.5" fill="none"
													stroke="#10b981" strokeWidth="3"
													strokeDasharray={`${(beritaStats.published / beritaStats.total_berita) * 97.4} 97.4`}
													strokeLinecap="round"
												/>
											)}
										</svg>
										<div className="absolute inset-0 flex items-center justify-center">
											<span className="text-xs font-bold text-gray-700">
												{beritaStats ? `${Math.round((beritaStats.published / (beritaStats.total_berita || 1)) * 100)}%` : '—'}
											</span>
										</div>
									</div>
									<div className="space-y-2 flex-1">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
												<span className="text-xs text-gray-600">Published</span>
											</div>
											<span className="text-sm font-bold text-gray-800">{beritaStats?.published ?? '—'}</span>
										</div>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
												<span className="text-xs text-gray-600">Draft</span>
											</div>
											<span className="text-sm font-bold text-gray-800">{beritaStats?.draft ?? '—'}</span>
										</div>
									</div>
								</div>
								{/* By category */}
								{beritaStats?.by_kategori && beritaStats.by_kategori.length > 0 && (
									<div>
										<p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Per Kategori</p>
										<div className="space-y-1.5">
											{beritaStats.by_kategori.slice(0, 5).map((kat, i) => (
												<div key={i} className="flex items-center justify-between">
													<span className="text-xs text-gray-600 truncate max-w-[160px]">{kat.kategori || 'Umum'}</span>
													<div className="flex items-center gap-2">
														<div className="h-1.5 rounded-full bg-gray-100 w-16">
															<div
																className="h-1.5 rounded-full bg-gradient-to-r from-pink-400 to-rose-500"
																style={{ width: `${Math.min((kat._count.id / (beritaStats.total_berita || 1)) * 100, 100)}%` }}
															/>
														</div>
														<span className="text-xs font-bold text-gray-700 w-8 text-right">{kat._count.id}</span>
													</div>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						</motion.div>

						{/* Absensi Hari Ini */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.6 }}
							className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
						>
							<div className="flex items-center gap-2 mb-4">
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600">
									<FiClock className="h-4 w-4" />
								</div>
								<h3 className="text-sm font-bold text-gray-800">Absensi Hari Ini</h3>
								{absensiStats?.total_records != null && (
									<span className="ml-auto text-xs font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full">
										{absensiStats.total_records}
									</span>
								)}
							</div>
							{absensiStats?.summary ? (
								<div className="space-y-2">
									{[
										{ label: 'Hadir', value: absensiStats.summary.hadir, icon: FiCheckCircle, color: 'bg-emerald-50 text-emerald-600', barColor: 'from-emerald-400 to-emerald-500' },
										{ label: 'Sakit', value: absensiStats.summary.sakit, icon: FiAlertCircle, color: 'bg-amber-50 text-amber-600', barColor: 'from-amber-400 to-amber-500' },
										{ label: 'Izin', value: absensiStats.summary.izin, icon: FiFileText, color: 'bg-blue-50 text-blue-600', barColor: 'from-blue-400 to-blue-500' },
										{ label: 'Cuti', value: absensiStats.summary.cuti, icon: FiCalendar, color: 'bg-violet-50 text-violet-600', barColor: 'from-violet-400 to-violet-500' },
										{ label: 'DL', value: absensiStats.summary.dinas_luar, icon: FiTrendingUp, color: 'bg-cyan-50 text-cyan-600', barColor: 'from-cyan-400 to-cyan-500' },
									].map((item, i) => {
										const total = absensiStats.total_records || 1;
										const pct = Math.round((item.value / total) * 100);
										return (
											<div key={i} className="flex items-center gap-3">
												<div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.color} flex-shrink-0`}>
													<item.icon className="h-3.5 w-3.5" />
												</div>
												<div className="flex-1 min-w-0">
													<div className="flex items-center justify-between mb-0.5">
														<span className="text-xs text-gray-600">{item.label}</span>
														<span className="text-xs font-bold text-gray-800">{item.value ?? 0}</span>
													</div>
													<div className="h-1.5 rounded-full bg-gray-100">
														<div
															className={`h-1.5 rounded-full bg-gradient-to-r ${item.barColor} transition-all duration-500`}
															style={{ width: `${pct}%` }}
														/>
													</div>
												</div>
											</div>
										);
									})}
									{absensiStats.belum_absen != null && (
										<div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
											<span className="text-xs text-gray-500">Belum absen</span>
											<span className="text-sm font-bold text-red-500">{Array.isArray(absensiStats.belum_absen) ? absensiStats.belum_absen.length : absensiStats.belum_absen} orang</span>
										</div>
									)}
								</div>
							) : (
								<div className="py-6 text-center">
									<FiClock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
									<p className="text-xs text-gray-400">Data absensi belum tersedia</p>
								</div>
							)}
						</motion.div>
					</div>

					{/* System Overview Cards */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.7 }}
						className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
					>
						<div className="flex items-center gap-2 mb-4">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
								<FiDatabase className="h-4 w-4" />
							</div>
							<h3 className="text-sm font-bold text-gray-800">Sistem Overview</h3>
						</div>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
							{[
								{ label: 'Total Desa', value: generalStats?.totalDesa, color: 'text-emerald-600 bg-emerald-50' },
								{ label: 'Total Kelurahan', value: generalStats?.totalKelurahan, color: 'text-teal-600 bg-teal-50' },
								{ label: 'Total Berita', value: generalStats?.totalBerita, color: 'text-pink-600 bg-pink-50' },
								{ label: 'Total User', value: userStats?.total, color: 'text-blue-600 bg-blue-50' },
								{ label: 'Pegawai DPMD', value: userStats?.total_pegawai_dpmd, color: 'text-orange-600 bg-orange-50' },
								{ label: 'User Desa', value: userStats?.desa, color: 'text-green-600 bg-green-50' },
								{ label: 'User Kecamatan', value: userStats?.kecamatan, color: 'text-violet-600 bg-violet-50' },
								{ label: 'User Kelurahan', value: userStats?.kelurahan, color: 'text-indigo-600 bg-indigo-50' },
							].map((item, i) => (
								<div key={i} className={`rounded-xl p-3 ${item.color.split(' ')[1]} border border-transparent`}>
									<p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{item.label}</p>
									<p className={`text-xl font-bold mt-1 ${item.color.split(' ')[0]}`}>
										{item.value != null ? item.value.toLocaleString('id-ID') : '—'}
									</p>
								</div>
							))}
						</div>
					</motion.div>
				</div>

				{/* Online Users Sidebar (Desktop only) */}
				{isDesktop && <OnlineUsersSidebar />}
			</div>
		</div>
	);
};

export default SuperadminDashboard;
