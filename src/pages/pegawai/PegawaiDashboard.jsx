// src/pages/pegawai/PegawaiDashboard.jsx
// Redesign tema terang ala SIKEPO — kartu profil, Presensi & Kinerja, grid Layanan.
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
	User, Briefcase, Calendar, Info, X, ExternalLink,
	Clock, LogIn, LogOut, Camera, ChevronRight, Activity,
} from "lucide-react";
import api from "../../api";
import { getUserAvatarUrl } from "../../utils/avatarUtils";
import { pressAnimation } from "../../utils/animations";

const ABSENSI_ELIGIBLE_STATUS = ['PPPK Paruh Waktu', 'Tenaga Alih Daya', 'Tenaga Keamanan', 'Tenaga Kebersihan'];

const fmtJam = (value) => {
	if (!value) return "--:--:--";
	// nilai bisa "08:15:46" atau "08:15" atau timestamp — ambil bagian jam saja
	const str = String(value);
	const match = str.match(/(\d{2}:\d{2}(:\d{2})?)/);
	return match ? match[1] : str;
};

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
	const [todayData, setTodayData] = useState(null);
	const [now, setNow] = useState(new Date());

	const isAbsensiEligible = ABSENSI_ELIGIBLE_STATUS.includes(user.status_kepegawaian);

	// Live clock
	useEffect(() => {
		const t = setInterval(() => setNow(new Date()), 1000);
		return () => clearInterval(t);
	}, []);

	useEffect(() => {
		const handleProfileUpdate = () => setUser(JSON.parse(localStorage.getItem("user") || "{}"));
		window.addEventListener("userProfileUpdated", handleProfileUpdate);
		return () => window.removeEventListener("userProfileUpdated", handleProfileUpdate);
	}, []);

	useEffect(() => {
		fetchPegawaiProfile();
		fetchInformasi();
		if (isAbsensiEligible) fetchToday();
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const fetchToday = async () => {
		try {
			const res = await api.get("/absensi/today");
			setTodayData(res.data?.data || null);
		} catch (err) {
			console.error("Error fetching today:", err);
		}
	};

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
			const u = JSON.parse(localStorage.getItem("user"));
			if (!u) { setError("User tidak ditemukan. Silakan login kembali."); return; }
			if (!u.pegawai_id) { setError("Data pegawai tidak ditemukan untuk user ini"); return; }
			const response = await api.get(`/pegawai/${u.pegawai_id}`);
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
			<div className="min-h-screen bg-slate-50 flex items-center justify-center">
				<div className="text-center">
					<div className="relative w-14 h-14 mx-auto mb-4">
						<div className="absolute inset-0 rounded-full border-[3px] border-emerald-500/20" />
						<div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-emerald-500 animate-spin" />
					</div>
					<p className="text-slate-400 font-medium text-sm">Memuat Data Pegawai...</p>
				</div>
			</div>
		);
	}

	// ─── Error ───────────────────────────────────────────────
	if (error) {
		return (
			<div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
				<div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 max-w-md w-full text-center">
					<div className="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
						<Activity className="h-8 w-8 text-red-400" />
					</div>
					<h3 className="font-bold text-slate-800 text-xl mb-2">Oops!</h3>
					<p className="text-slate-500 text-sm mb-6">{error}</p>
					<motion.button
						{...pressAnimation}
						onClick={fetchPegawaiProfile}
						className="w-full bg-gradient-to-r from-emerald-500 to-green-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-emerald-500/25 cursor-pointer"
					>
						Coba Lagi
					</motion.button>
				</div>
			</div>
		);
	}

	const firstName = pegawaiData?.nama_pegawai?.split(" ")[0] || "Pegawai";
	const namaLengkap = pegawaiData?.nama_pegawai || user.name || firstName;
	const pangkat = pegawaiData?.pangkat || "";
	const golongan = pegawaiData?.golongan || "";
	const jabatanLine = [pangkat, golongan ? `(${golongan})` : ""].filter(Boolean).join(" ") || "Pegawai DPMD";
	const bidangNama = pegawaiData?.bidang?.nama_bidang || pegawaiData?.bidangs?.nama || user.bidang_name || "";
	const avatarUrl = getUserAvatarUrl(user);

	const hariTanggal = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
	const jamSekarang = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

	const statusHari = todayData?.status;
	const sudahMasuk = !!todayData?.jam_masuk;
	const sudahPulang = !!todayData?.jam_keluar;

	// Layanan
	const services = [
		{ label: "Perjadin", icon: Briefcase, color: "emerald", onClick: () => navigate("/pegawai/perjadin") },
		{ label: "Jadwal", icon: Calendar, color: "sky", onClick: () => navigate("/pegawai/jadwal-kegiatan") },
		...(isAbsensiEligible
			? [{ label: "Presensi", icon: Clock, color: "rose", onClick: () => navigate("/dpmd/absensi") }]
			: [{ label: "Photo Booth", icon: Camera, color: "violet", onClick: () => navigate("/dpmd/photo-booth") }]
		),
		{ label: "Informasi", icon: Info, color: "amber", onClick: () => navigate("/dpmd/informasi") },
	];

	const colorClasses = {
		emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
		sky: { bg: "bg-sky-50", text: "text-sky-600" },
		amber: { bg: "bg-amber-50", text: "text-amber-600" },
		rose: { bg: "bg-rose-50", text: "text-rose-600" },
		violet: { bg: "bg-violet-50", text: "text-violet-600" },
	};

	const imgBase = import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://127.0.0.1:3001";

	return (
		<div className="min-h-screen bg-slate-50 pb-24 lg:pb-8">
			<div className="max-w-2xl mx-auto px-4 pt-5 space-y-4">

				{/* ─── Kartu Profil ─────────────────────────── */}
				<motion.div
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
				>
					{/* Logo */}
					<div className="px-5 pt-5 flex items-center gap-2.5">
						<img src="/logo-dpmd.png" alt="DPMD" className="h-9 w-9 object-contain" />
						<div className="leading-tight">
							<p className="text-base font-extrabold text-emerald-700 tracking-tight">DPMD</p>
							<p className="text-[10px] text-slate-400 -mt-0.5">Kabupaten Bogor</p>
						</div>
					</div>

					{/* Identitas + Foto */}
					<div className="px-5 pb-5 pt-4 flex items-stretch justify-between gap-4">
						<div className="min-w-0 flex-1 flex flex-col justify-center">
							<h1 className="text-xl font-extrabold text-slate-800 leading-snug uppercase break-words">{namaLengkap}</h1>
							<p className="text-sm text-slate-500 mt-1">{jabatanLine}</p>
							{bidangNama && <p className="text-xs text-slate-400 mt-0.5 truncate">{bidangNama}</p>}
							{pegawaiData?.nip && (
								<div className="flex items-center gap-1.5 mt-3 text-slate-500">
									<User className="h-3.5 w-3.5 flex-shrink-0" />
									<span className="text-xs font-semibold tracking-wide tabular-nums">{pegawaiData.nip}</span>
								</div>
							)}
						</div>
						<div className="flex-shrink-0 h-28 w-24 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-100 to-teal-100 ring-1 ring-slate-100 shadow-sm">
							{avatarUrl ? (
								<img src={avatarUrl} alt={namaLengkap} className="h-full w-full object-cover" />
							) : (
								<div className="h-full w-full flex items-center justify-center">
									<span className="text-3xl font-bold text-emerald-600">{namaLengkap.charAt(0).toUpperCase()}</span>
								</div>
							)}
						</div>
					</div>
				</motion.div>

				{/* ─── Presensi & Kinerja ───────────────────── */}
				<motion.div
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.05 }}
					className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5"
				>
					<div className="flex items-center justify-between gap-2">
						<p className="text-xs text-slate-400 font-medium">
							{hariTanggal} · <span className="tabular-nums text-slate-500 font-semibold">{jamSekarang}</span>
						</p>
						{isAbsensiEligible && statusHari && (
							<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 capitalize">
								{String(statusHari).replace(/_/g, " ")}
							</span>
						)}
					</div>

					<h3 className="text-base font-bold text-slate-800 mt-2 mb-4">Presensi &amp; Kinerja</h3>

					{isAbsensiEligible ? (
						<>
							<div className="grid grid-cols-2 gap-3">
								<div className="flex items-center gap-3 rounded-2xl bg-emerald-50/70 p-3">
									<div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
										<LogIn className="h-5 w-5 text-emerald-600" />
									</div>
									<div className="min-w-0">
										<p className="text-base font-extrabold text-slate-800 tabular-nums leading-none">{fmtJam(todayData?.jam_masuk)}</p>
										<p className="text-[11px] text-slate-400 mt-1">Jam Datang</p>
									</div>
								</div>
								<div className="flex items-center gap-3 rounded-2xl bg-rose-50/70 p-3">
									<div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
										<LogOut className="h-5 w-5 text-rose-500" />
									</div>
									<div className="min-w-0">
										<p className="text-base font-extrabold text-slate-800 tabular-nums leading-none">{fmtJam(todayData?.jam_keluar)}</p>
										<p className="text-[11px] text-slate-400 mt-1">Jam Pulang</p>
									</div>
								</div>
							</div>
							<motion.button
								{...pressAnimation}
								onClick={() => navigate("/dpmd/absensi")}
								className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/25 cursor-pointer"
							>
								<Clock className="h-4 w-4" />
								{!sudahMasuk ? "Absen Datang" : !sudahPulang ? "Absen Pulang" : "Lihat Presensi"}
							</motion.button>
						</>
					) : (
						<div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-center">
							<p className="text-sm text-slate-500">Presensi harian tidak berlaku untuk status kepegawaian Anda.</p>
							<p className="text-xs text-slate-400 mt-1">Gunakan layanan Perjadin &amp; Jadwal Kegiatan di bawah.</p>
						</div>
					)}
				</motion.div>

				{/* ─── Layanan Lainnya ──────────────────────── */}
				<motion.div
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5"
				>
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-base font-bold text-slate-800">Layanan Lainnya</h3>
					</div>
					<div className="grid grid-cols-4 gap-2">
						{services.map((s) => {
							const cc = colorClasses[s.color];
							const Icon = s.icon;
							return (
								<motion.button
									key={s.label}
									{...pressAnimation}
									onClick={s.onClick}
									className="flex flex-col items-center gap-2 py-2 cursor-pointer"
								>
									<div className={`w-14 h-14 ${cc.bg} rounded-2xl flex items-center justify-center`}>
										<Icon className={`h-6 w-6 ${cc.text}`} />
									</div>
									<span className="text-[11px] font-semibold text-slate-600 text-center leading-tight">{s.label}</span>
								</motion.button>
							);
						})}
					</div>
				</motion.div>

				{/* ─── Informasi ────────────────────────────── */}
				{informasiList.length > 0 && (
					<motion.div
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.15 }}
						className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5"
					>
						<div className="flex items-center justify-between mb-3">
							<h3 className="text-base font-bold text-slate-800">Informasi</h3>
							<button onClick={() => navigate("/dpmd/informasi")} className="flex items-center gap-0.5 text-xs text-emerald-600 font-semibold cursor-pointer">
								Lihat Semua <ChevronRight className="h-3.5 w-3.5" />
							</button>
						</div>
						<div className="relative w-full h-44 rounded-2xl overflow-hidden shadow-sm group">
							<AnimatePresence mode="wait">
								<motion.button
									key={currentInformasiIndex}
									initial={{ opacity: 0, x: 40 }}
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: -40 }}
									transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
									onClick={() => {
										setSelectedInformasi(informasiList[currentInformasiIndex]);
										setShowInformasiModal(true);
									}}
									className="absolute inset-0 w-full h-full cursor-pointer"
								>
									<img
										src={`${imgBase}/${informasiList[currentInformasiIndex].gambar}`}
										alt={informasiList[currentInformasiIndex].judul}
										className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
									/>
									<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
									<div className="absolute bottom-0 left-0 right-0 p-4 text-left">
										<div className="flex items-center gap-1.5 mb-1.5">
											<span className="inline-flex items-center px-2 py-0.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[10px] font-semibold rounded-full shadow">
												<Info className="h-2.5 w-2.5 mr-0.5" /> Informasi
											</span>
											{informasiList.length > 1 && (
												<span className="text-white/80 text-[10px] font-medium bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
													{currentInformasiIndex + 1}/{informasiList.length}
												</span>
											)}
										</div>
										<p className="text-white font-bold text-sm line-clamp-1 drop-shadow">{informasiList[currentInformasiIndex].judul}</p>
									</div>
								</motion.button>
							</AnimatePresence>
						</div>
					</motion.div>
				)}

				{/* Footer */}
				<div className="text-center py-4">
					<p className="text-slate-300 text-xs">DPMD Kabupaten Bogor © 2026</p>
				</div>
			</div>

			{/* ─── Informasi Modal ──────────────────────────── */}
			<AnimatePresence>
				{showInformasiModal && selectedInformasi && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
						onClick={() => setShowInformasiModal(false)}
					>
						<motion.div
							initial={{ y: 100, opacity: 0, scale: 0.95 }}
							animate={{ y: 0, opacity: 1, scale: 1 }}
							exit={{ y: 100, opacity: 0, scale: 0.95 }}
							transition={{ type: "spring", damping: 25, stiffness: 300 }}
							className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[90vh] overflow-hidden"
							onClick={(e) => e.stopPropagation()}
						>
							<div className="sm:hidden flex justify-center py-3">
								<div className="w-12 h-1.5 bg-slate-200 rounded-full" />
							</div>
							<div className="relative h-52 sm:h-64 overflow-hidden">
								<img src={`${imgBase}/${selectedInformasi.gambar}`} alt={selectedInformasi.judul} className="w-full h-full object-cover" />
								<motion.button
									{...pressAnimation}
									onClick={() => setShowInformasiModal(false)}
									className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors cursor-pointer"
								>
									<X className="h-5 w-5" />
								</motion.button>
								<div className="absolute bottom-4 left-4">
									<span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-semibold rounded-full shadow">
										<Info className="h-3 w-3 mr-1" /> Informasi DPMD
									</span>
								</div>
							</div>
							<div className="p-6 max-h-[40vh] overflow-y-auto">
								<h2 className="text-xl font-bold text-slate-800 mb-4 leading-tight">{selectedInformasi.judul}</h2>
								{selectedInformasi.deskripsi ? (
									<p className="text-slate-500 whitespace-pre-wrap leading-relaxed text-sm">{selectedInformasi.deskripsi}</p>
								) : (
									<p className="text-slate-400 italic text-sm">Tidak ada detail informasi tambahan.</p>
								)}
								{selectedInformasi.link && (
									<motion.a
										{...pressAnimation}
										href={selectedInformasi.link}
										target="_blank"
										rel="noopener noreferrer"
										className="mt-5 flex items-center justify-center gap-2 w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 cursor-pointer"
									>
										<ExternalLink className="h-4 w-4" /> Buka Link
									</motion.a>
								)}
							</div>
							<div className="px-6 py-4 border-t border-slate-100">
								<motion.button
									{...pressAnimation}
									onClick={() => setShowInformasiModal(false)}
									className="w-full py-3 px-4 bg-slate-50 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
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
