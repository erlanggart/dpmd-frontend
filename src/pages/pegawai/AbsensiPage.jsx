// src/pages/pegawai/AbsensiPage.jsx
// ═══════════════════════════════════════════════════════════════
// Simple & Clean Attendance — minimal, UX-friendly, Lottie icons
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
	FiCheckCircle, FiXCircle, FiCalendar,
	FiChevronLeft, FiChevronRight, FiAlertCircle, FiMapPin,
	FiCamera, FiSmartphone,
} from "react-icons/fi";
import {
	LuLogIn, LuLogOut, LuClipboardList, LuFileText, LuHeartPulse, LuCalendarOff,
	LuCircleCheckBig, LuShieldCheck,
} from "react-icons/lu";
import Lottie from "lottie-react";
import manWaitingCarAnim from "../../assets/lottie/man-waiting-car.json";
import workFromHomeAnim from "../../assets/lottie/work-from-home.json";
import workFromAnywhereAnim from "../../assets/lottie/work-from-anywhere.json";
import bellAnim from "../../assets/lottie/bell.json";
import api from "../../api";
import { getAvatarUrl } from "../../utils/avatarUtils";
import { pressAnimation, listItemVariants, slideUp } from "../../utils/animations";
import AbsensiSuccessPopup from "../../components/AbsensiSuccessPopup";
import { showAlert } from "../../components/AlertPopup";

// ─── Constants ───────────────────────────────────────────────
const STATUS_COLORS = {
	hadir:      { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-500" },
	izin:       { bg: "bg-amber-50",   text: "text-amber-600",   dot: "bg-amber-500" },
	sakit:      { bg: "bg-rose-50",    text: "text-rose-600",    dot: "bg-rose-500" },
	alpha:      { bg: "bg-slate-100",  text: "text-slate-500",   dot: "bg-slate-400" },
	cuti:       { bg: "bg-sky-50",     text: "text-sky-600",     dot: "bg-sky-500" },
	dinas_luar: { bg: "bg-violet-50",  text: "text-violet-600",  dot: "bg-violet-500" },
	wfh:        { bg: "bg-teal-50",    text: "text-teal-600",    dot: "bg-teal-500" },
	wfa:        { bg: "bg-indigo-50",  text: "text-indigo-600",  dot: "bg-indigo-500" },
};

const STATUS_LABELS = {
	hadir: "Hadir", izin: "Izin", sakit: "Sakit", alpha: "Alpha", cuti: "Cuti",
	dinas_luar: "Dinas Luar", wfh: "WFH", wfa: "WFA",
};

const fmt = (t) => {
	if (!t) return "--:--";
	const d = new Date(t);
	return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
};

const isPWA = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

const getDeviceId = () => {
	let id = localStorage.getItem("dpmd_device_id");
	if (!id) {
		id = crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
			const r = (Math.random() * 16) | 0;
			return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
		});
		localStorage.setItem("dpmd_device_id", id);
	}
	return id;
};

const getDeviceType = () => {
	const ua = navigator.userAgent;
	if (/iPhone/i.test(ua)) return "iPhone";
	if (/iPad/i.test(ua)) return "iPad";
	if (/Android/i.test(ua)) {
		const match = ua.match(/;\s*([^;)]+)\s*Build/);
		return match ? match[1].trim() : "Android";
	}
	if (/Windows/i.test(ua)) return "Windows PC";
	if (/Mac/i.test(ua)) return "Mac";
	return "Unknown Device";
};

// ═══════════════════════════════════════════════════════════════
const AbsensiPage = () => {
	const [searchParams] = useSearchParams();
	const [user] = useState(JSON.parse(localStorage.getItem("user") || "{}"));
	const [todayData, setTodayData] = useState(null);
	const [absensiSettings, setAbsensiSettings] = useState({});
	const [telatMasukMenit, setTelatMasukMenit] = useState(0);
	const [pulangLebiahAwalMenit, setPulangLebihAwalMenit] = useState(0);
	const [history, setHistory] = useState({ records: [], summary: {} });
	const [loading, setLoading] = useState(true);
	const [clockLoading, setClockLoading] = useState(false);
	const [eligible, setEligible] = useState(null);
	const [currentTime, setCurrentTime] = useState(new Date());
	const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
	const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
	const [showIzinModal, setShowIzinModal] = useState(false);
	const [showCameraModal, setShowCameraModal] = useState(null);
	const [showDinasLuarModal, setShowDinasLuarModal] = useState(false);
	const [absensiMode, setAbsensiMode] = useState("hadir");
	const [tujuanDinas, setTujuanDinas] = useState("");
	const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "presensi");
	const avatarUrl = getAvatarUrl(user.avatar);
	const deviceId = useRef(getDeviceId()).current;
	const [successMessages, setSuccessMessages] = useState({});
	const [successPopup, setSuccessPopup] = useState({ show: false, data: null });

	useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(t); }, []);

	useEffect(() => {
		const tab = searchParams.get("tab");
		if (tab === "riwayat") setActiveTab("riwayat");
		else setActiveTab("presensi");
	}, [searchParams]);

	useEffect(() => {
		const check = async () => {
			try {
				// Cache-bust agar service worker tidak serve response lama
				const res = await api.get(`/absensi/check-eligible?_t=${Date.now()}`);
				const data = res.data.data;
				setEligible(data);
				if (data?.eligible && !data?.device_registered && deviceId) {
					try {
						await api.post("/absensi/register-device", { device_id: deviceId, device_type: getDeviceType() });
						const res2 = await api.get(`/absensi/check-eligible?_t=${Date.now()}`);
						setEligible(res2.data.data);
					} catch (err) { console.error("Auto device registration failed:", err); }
				}
			} catch { setEligible({ eligible: false }); }
		};
		check();
	}, [deviceId]);

	const fetchToday = useCallback(async () => {
		try {
			const res = await api.get("/absensi/today");
			setTodayData(res.data.data);
			if (res.data.settings) setAbsensiSettings(res.data.settings);
			setTelatMasukMenit(res.data.telat_masuk_menit || 0);
			setPulangLebihAwalMenit(res.data.pulang_lebih_awal_menit || 0);
		} catch (err) { console.error("Error fetching today:", err); }
	}, []);

	const fetchHistory = useCallback(async () => {
		try {
			const res = await api.get(`/absensi/history?bulan=${selectedMonth}&tahun=${selectedYear}`);
			setHistory(res.data.data || { records: [], summary: {} });
		} catch (err) { console.error("Error fetching history:", err); }
	}, [selectedMonth, selectedYear]);

	useEffect(() => {
		const init = async () => { setLoading(true); await Promise.all([fetchToday(), fetchHistory()]); setLoading(false); };
		init();
	}, [fetchToday, fetchHistory]);

	useEffect(() => {
		const fetchSuccessMessages = async () => {
			try { const res = await api.get("/absensi/success-messages"); setSuccessMessages(res.data.data || {}); }
			catch (err) { console.error("Error fetching success messages:", err); }
		};
		fetchSuccessMessages();
	}, []);

	const checkDevice = () => {
		if (!eligible?.device_registered) {
			showAlert({ icon: "warning", title: "Perangkat Belum Terdaftar", text: "Silakan refresh halaman untuk mendaftarkan perangkat secara otomatis." });
			return false;
		}
		return true;
	};

	const handleRemoveDevice = async () => {
		const confirm = await showAlert({
			icon: "warning",
			title: "Hapus Perangkat Lama?",
			text: "Perangkat lama akan dihapus dan perangkat ini akan didaftarkan sebagai perangkat baru.",
			showCancel: true,
			confirmText: "Ya, Hapus & Daftarkan",
			cancelText: "Batal",
		});
		if (!confirm?.isConfirmed) return;
		try {
			await api.delete("/absensi/remove-device");
			await api.post("/absensi/register-device", { device_id: deviceId, device_type: getDeviceType() });
			const res = await api.get("/absensi/check-eligible");
			setEligible(res.data.data);
			showAlert({ icon: "success", title: "Berhasil!", text: "Perangkat baru berhasil didaftarkan. Silakan coba absen kembali.", timer: 2500 });
		} catch (err) {
			showAlert({ icon: "error", title: "Gagal", text: err.response?.data?.message || "Gagal menghapus perangkat" });
		}
	};

	const isAbsensiOpen = () => {
		const jamBuka = absensiSettings?.jam_buka_absen || "06:00";
		const jamTutup = absensiSettings?.jam_tutup_absen || "17:00";
		const now = new Date();
		const currentMinutes = now.getHours() * 60 + now.getMinutes();
		const [bH, bM] = jamBuka.split(":").map(Number);
		const [tH, tM] = jamTutup.split(":").map(Number);
		const bukaMinutes = bH * 60 + bM;
		const tutupMinutes = tH * 60 + tM;
		if (currentMinutes < bukaMinutes) {
			return { open: false, message: `Absensi belum dibuka. Jam buka: ${jamBuka} WIB` };
		}
		if (currentMinutes > tutupMinutes) {
			return { open: false, message: `Absensi sudah ditutup. Jam tutup: ${jamTutup} WIB` };
		}
		return { open: true };
	};

	const checkAbsensiTime = () => {
		const status = isAbsensiOpen();
		if (!status.open) {
			showAlert({ icon: "warning", title: "Absensi Belum Dibuka", text: status.message });
			return false;
		}
		return true;
	};

	const startHadir = () => { if (!checkDevice() || !checkAbsensiTime()) return; setAbsensiMode("hadir"); setTujuanDinas(""); setShowCameraModal("masuk"); };
	const startWFH = () => { if (!checkDevice() || !checkAbsensiTime()) return; setAbsensiMode("wfh"); setTujuanDinas(""); setShowCameraModal("masuk"); };
	const startWFA = () => { if (!checkDevice() || !checkAbsensiTime()) return; setAbsensiMode("wfa"); setTujuanDinas(""); setShowCameraModal("masuk"); };
	const startDinasLuar = () => { if (!checkDevice() || !checkAbsensiTime()) return; setShowDinasLuarModal(true); };
	const handleDinasLuarConfirm = (tujuan) => { setAbsensiMode("dinas_luar"); setTujuanDinas(tujuan); setShowDinasLuarModal(false); setShowCameraModal("masuk"); };
	const startPulang = () => { if (!checkDevice()) return; setShowCameraModal("keluar"); };

	const handleAbsensiSubmit = async (type, foto, coords) => {
		setShowCameraModal(null);
		setClockLoading(true);
		try {
			const endpoint = type === "masuk" ? "/absensi/clock-in" : "/absensi/clock-out";
			const body = { foto, latitude: coords.latitude, longitude: coords.longitude, device_id: deviceId };
			if (type === "masuk") {
				body.mode = absensiMode;
				if (absensiMode === "dinas_luar") body.tujuan_dinas = tujuanDinas;
			}
			const res = await api.post(endpoint, body);
			await fetchToday();
			await fetchHistory();
			const modeLabels = { hadir: "Masuk", dinas_luar: "Dinas Luar", wfh: "WFH", wfa: "WFA" };
			const popupType = type === "masuk" ? (absensiMode === "hadir" ? "masuk" : absensiMode) : "pulang";
			const msgData = successMessages[popupType];
			if (msgData) {
				setSuccessPopup({ show: true, data: { title: msgData.title, message: msgData.message, image_path: msgData.image_path } });
			} else {
				showAlert({ icon: "success", title: type === "masuk" ? `Absen ${modeLabels[absensiMode] || "Masuk"} Berhasil!` : "Absen Pulang Berhasil!", text: res.data.message, timer: 2500 });
			}
			setAbsensiMode("hadir");
			setTujuanDinas("");
		} catch (err) {
			const errMsg = err.response?.data?.message || "Gagal absensi";
			const errCode = err.response?.data?.code;
			const isJarak = errMsg.toLowerCase().includes("meter");
			if (errCode === "DEVICE_MISMATCH") {
				const registeredDevice = err.response?.data?.registered_device || "Tidak dikenal";
				const confirm = await showAlert({
					icon: "error",
					title: "Perangkat Berbeda",
					text: `Perangkat terdaftar: ${registeredDevice}.\n\nHapus perangkat lama dan daftarkan perangkat ini?`,
					showCancel: true,
					confirmText: "Hapus & Daftarkan",
					cancelText: "Batal",
				});
				if (confirm?.isConfirmed) {
					await handleRemoveDevice();
				}
			} else {
				showAlert({
					icon: "error",
					title: isJarak ? "Kejauhan Cuy! 🏃‍♂️💨" : "Absensi Gagal",
					text: isJarak ? `😅 Kamu masih jauh dari kantor nih!\n\n📍 Maksimal 500 meter dari kantor ya!\n\n🦶 Coba deketin dulu baru absen lagi~ 🫡` : errMsg,
				});
			}
		} finally { setClockLoading(false); }
	};

	const handleSubmitIzin = async (status, keterangan) => {
		try {
			const today = new Date().toISOString().split("T")[0];
			await api.post("/absensi/izin", { tanggal: today, status, keterangan });
			await fetchToday(); await fetchHistory(); setShowIzinModal(false);
			const msgData = successMessages[status];
			if (msgData) {
				setSuccessPopup({ show: true, data: { title: msgData.title, message: msgData.message, image_path: msgData.image_path } });
			} else {
				showAlert({ icon: "success", title: "Berhasil!", text: `${STATUS_LABELS[status]} berhasil disubmit`, timer: 2000 });
			}
		} catch (err) { showAlert({ icon: "error", title: "Gagal", text: err.response?.data?.message || "Gagal submit" }); }
	};

	const prevMonth = () => { if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1); } else setSelectedMonth(m => m - 1); };
	const nextMonth = () => { if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1); } else setSelectedMonth(m => m + 1); };
	const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

	// ─── Loading ─────────────────────────────────────────────
	if (loading) {
		return (
			<div className="h-[100dvh] bg-white flex items-center justify-center pb-20">
				<div className="flex flex-col items-center gap-3">
					<div className="w-10 h-10 border-[3px] border-orange-200 border-t-orange-500 rounded-full animate-spin" />
					<p className="text-xs text-slate-400">Memuat data...</p>
				</div>
			</div>
		);
	}

	// ─── PWA gate ────────────────────────────────────────────
	if (!isPWA()) {
		return (
			<div className="h-[100dvh] bg-white flex items-center justify-center p-6 pb-20">
				<div className="max-w-xs text-center">
					<div className="w-16 h-16 mx-auto bg-orange-50 rounded-2xl flex items-center justify-center mb-4">
						<FiSmartphone className="h-8 w-8 text-orange-400" />
					</div>
					<h2 className="text-lg font-bold text-slate-800 mb-1">Buka di Aplikasi PWA</h2>
					<p className="text-slate-400 text-xs leading-relaxed">
						Fitur presensi hanya tersedia melalui aplikasi PWA. Buka dari ikon di home screen.
					</p>
				</div>
			</div>
		);
	}

	// ─── Not Eligible ────────────────────────────────────────
	if (eligible && !eligible.eligible) {
		return (
			<div className="h-[100dvh] bg-white flex items-center justify-center p-6 pb-20">
				<div className="text-center max-w-xs">
					<FiAlertCircle className="h-12 w-12 mx-auto text-slate-200 mb-3" />
					<h2 className="text-lg font-bold text-slate-800 mb-1">Tidak Tersedia</h2>
					<p className="text-slate-400 text-xs leading-relaxed">
						Fitur presensi hanya untuk PPPK Paruh Waktu, Tenaga Alih Daya, Tenaga Keamanan, atau Tenaga Kebersihan.
					</p>
				</div>
			</div>
		);
	}

	// ─── Holiday / Weekend ────────────────────────────────────
	if (eligible?.is_holiday) {
		const isWeekend = eligible.holiday_reason === "Hari Minggu" || eligible.holiday_reason === "Hari Sabtu";
		return (
			<div className="h-[100dvh] bg-gradient-to-b from-cyan-50 via-white to-teal-50 flex flex-col overflow-hidden pb-20">
				{/* Floating decorations */}
				<div className="absolute inset-0 overflow-hidden pointer-events-none">
					{[...Array(20)].map((_, i) => (
						<motion.div
							key={i}
							className="absolute rounded-full"
							style={{
								width: Math.random() * 60 + 20,
								height: Math.random() * 60 + 20,
								background: `radial-gradient(circle, ${['rgba(6,182,212,0.1)', 'rgba(20,184,166,0.1)', 'rgba(34,211,238,0.08)', 'rgba(45,212,191,0.08)'][i % 4]} 0%, transparent 70%)`,
								left: `${Math.random() * 100}%`,
								top: `${Math.random() * 100}%`,
							}}
							animate={{
								y: [0, -30, 0],
								x: [0, Math.random() * 20 - 10, 0],
								scale: [1, 1.1, 1],
							}}
							transition={{
								duration: 5 + Math.random() * 3,
								repeat: Infinity,
								delay: Math.random() * 2,
								ease: "easeInOut",
							}}
						/>
					))}
				</div>

				<div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
					{/* Main illustration container */}
					<motion.div
						initial={{ scale: 0.8, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						transition={{ type: "spring", stiffness: 200, damping: 20 }}
						className="relative mb-6"
					>
						{/* Outer glow ring */}
						<div className="absolute -inset-4 bg-gradient-to-r from-cyan-400/20 via-teal-400/20 to-emerald-400/20 rounded-full blur-2xl animate-pulse" />
						
						{/* Main circle with icon */}
						<div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-cyan-100 via-teal-50 to-emerald-100 flex items-center justify-center shadow-xl shadow-cyan-200/30">
							{/* Inner decorative ring */}
							<div className="absolute inset-2 rounded-full border-2 border-dashed border-cyan-200/50 animate-[spin_20s_linear_infinite]" />
							
							{/* Lottie or Icon */}
							{isWeekend ? (
								<Lottie 
									animationData={workFromHomeAnim} 
									loop 
									autoplay 
									style={{ width: 90, height: 90 }} 
								/>
							) : (
								<motion.div
									animate={{ y: [0, -5, 0] }}
									transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
								>
									<LuCalendarOff className="w-14 h-14 text-cyan-500" />
								</motion.div>
							)}
						</div>

						{/* Floating mini icons */}
						{[
							{ Icon: FiCalendar, color: "text-teal-400", pos: "-top-2 -right-2", delay: 0 },
							{ Icon: LuHeartPulse, color: "text-rose-400", pos: "-bottom-1 -left-3", delay: 0.5 },
							{ Icon: LuCircleCheckBig, color: "text-emerald-400", pos: "top-1/2 -right-4", delay: 1 },
						].map(({ Icon, color, pos, delay }, idx) => (
							<motion.div
								key={idx}
								className={`absolute ${pos} w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center`}
								initial={{ scale: 0 }}
								animate={{ scale: 1, y: [0, -4, 0] }}
								transition={{ 
									scale: { delay: 0.3 + delay, type: "spring" },
									y: { duration: 2, repeat: Infinity, delay }
								}}
							>
								<Icon className={`w-4 h-4 ${color}`} />
							</motion.div>
						))}
					</motion.div>

					{/* Text content */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3 }}
						className="text-center max-w-xs"
					>
						{/* Badge */}
						<motion.div
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{ delay: 0.4, type: "spring" }}
							className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-xs font-bold mb-4 shadow-lg shadow-cyan-500/30"
						>
							<span className="w-2 h-2 rounded-full bg-white animate-pulse" />
							{isWeekend ? "AKHIR PEKAN" : "HARI LIBUR"}
						</motion.div>

						{/* Holiday name */}
						<h1 className="text-2xl font-black text-slate-800 mb-2">
							{eligible.holiday_reason}
						</h1>

						{/* Description */}
						<p className="text-sm text-slate-500 leading-relaxed mb-6">
							{isWeekend 
								? "Waktunya istirahat dan menghabiskan waktu bersama keluarga. Sampai jumpa di hari kerja!"
								: "Selamat menikmati hari libur! Tidak ada jadwal presensi untuk hari ini."
							}
						</p>

						{/* Date card */}
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.5 }}
							className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/80 backdrop-blur-sm border border-cyan-100 shadow-lg"
						>
							<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex flex-col items-center justify-center text-white shadow-md shadow-cyan-500/30">
								<span className="text-[10px] font-bold uppercase leading-none">
									{currentTime.toLocaleDateString("id-ID", { month: "short" })}
								</span>
								<span className="text-lg font-black leading-none">
									{currentTime.getDate()}
								</span>
							</div>
							<div className="text-left">
								<p className="text-sm font-bold text-slate-800">
									{currentTime.toLocaleDateString("id-ID", { weekday: "long" })}
								</p>
								<p className="text-xs text-slate-400">
									{currentTime.toLocaleDateString("id-ID", { year: "numeric", month: "long" })}
								</p>
							</div>
						</motion.div>
					</motion.div>

					{/* Bottom wave decoration */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.6 }}
						className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
					>
						<svg viewBox="0 0 1440 120" className="absolute bottom-0 w-full h-full" preserveAspectRatio="none">
							<path
								fill="url(#waveGradient)"
								d="M0,60 C360,100 720,20 1080,60 C1260,80 1350,40 1440,60 L1440,120 L0,120 Z"
							>
								<animate
									attributeName="d"
									dur="10s"
									repeatCount="indefinite"
									values="
										M0,60 C360,100 720,20 1080,60 C1260,80 1350,40 1440,60 L1440,120 L0,120 Z;
										M0,80 C360,40 720,100 1080,40 C1260,60 1350,80 1440,40 L1440,120 L0,120 Z;
										M0,60 C360,100 720,20 1080,60 C1260,80 1350,40 1440,60 L1440,120 L0,120 Z
									"
								/>
							</path>
							<defs>
								<linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
									<stop offset="0%" stopColor="rgba(6,182,212,0.1)" />
									<stop offset="50%" stopColor="rgba(20,184,166,0.15)" />
									<stop offset="100%" stopColor="rgba(52,211,153,0.1)" />
								</linearGradient>
							</defs>
						</svg>
					</motion.div>
				</div>
			</div>
		);
	}

	const hasIn = !!todayData?.jam_masuk;
	const hasOut = !!todayData?.jam_keluar;
	const todayStatus = todayData?.status || null;
	const isNonHadir = todayStatus && ["izin", "sakit", "cuti"].includes(todayStatus) && !hasIn;
	const isDinasMode = todayStatus && ["dinas_luar", "wfh", "wfa"].includes(todayStatus);

	// Can clock out?
	const canClockOut = (() => {
		if (!hasIn || hasOut) return false;
		const jp = absensiSettings?.jam_pulang || "16:00";
		const jm = absensiSettings?.jam_masuk || "08:00";
		const [hp, mp] = jp.split(":").map(Number);
		const [hm, mm] = jm.split(":").map(Number);
		const now = currentTime.getHours() * 60 + currentTime.getMinutes();
		const pm = hp * 60 + mp;
		const masukM = hm * 60 + mm;
		if (pm <= masukM) return now < masukM && now >= pm;
		return now >= pm;
	})();

	return (
		<div className="fixed inset-0 bg-white flex flex-col pb-20">

			{/* ══ Header + Clock ═══════════════════════════════ */}
			<div className="flex-shrink-0 px-5 pt-[calc(env(safe-area-inset-top,8px)+8px)] pb-4 rounded-b-[28px] shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
				<div className="max-w-lg mx-auto flex items-center justify-between mb-3">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-9 h-9 rounded-xl overflow-hidden bg-orange-50 flex-shrink-0">
							{avatarUrl ? (
								<img src={avatarUrl} alt="" className="w-full h-full object-cover" />
							) : (
								<div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-400 to-orange-500">
									<span className="text-white font-bold text-xs">{user.name?.charAt(0) || "U"}</span>
								</div>
							)}
						</div>
						<div className="min-w-0">
							<p className="text-sm font-bold text-slate-800 truncate leading-tight">{eligible?.nama || user.name}</p>
							<p className="text-[10px] text-slate-400 truncate">{eligible?.jabatan || eligible?.status_kepegawaian?.replace(/_/g, " ")}</p>
						</div>
					</div>
					{eligible?.device_registered ? (
						<span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 rounded-lg text-[9px] font-bold text-emerald-600 flex-shrink-0">
							<LuShieldCheck className="h-3 w-3" />
						</span>
					) : (
						<span className="flex items-center gap-1 px-2 py-0.5 bg-red-50 rounded-lg text-[9px] font-bold text-red-500 flex-shrink-0">
							<FiAlertCircle className="h-3 w-3" /> Belum
						</span>
					)}
				</div>
				<div className="text-center">
				<p className="text-[10px] text-slate-400 font-medium tracking-wide">
					{currentTime.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
				</p>
				<div className="flex items-center justify-center gap-1 mt-1">
					{/* Hours */}
					<div className="bg-slate-800 rounded-xl px-3 py-1.5 min-w-[52px]">
						<span className="text-[36px] font-black text-white tabular-nums tracking-tight leading-none font-mono">
							{String(currentTime.getHours()).padStart(2, "0")}
						</span>
					</div>
					{/* Colon */}
					<motion.div
						animate={{ opacity: [1, 0.2, 1] }}
						transition={{ repeat: Infinity, duration: 1 }}
						className="flex flex-col gap-1.5 mx-0.5"
					>
						<div className="w-2 h-2 rounded-full bg-orange-400" />
						<div className="w-2 h-2 rounded-full bg-orange-400" />
					</motion.div>
					{/* Minutes */}
					<div className="bg-slate-800 rounded-xl px-3 py-1.5 min-w-[52px]">
						<span className="text-[36px] font-black text-white tabular-nums tracking-tight leading-none font-mono">
							{String(currentTime.getMinutes()).padStart(2, "0")}
						</span>
					</div>
					{/* Seconds */}
					<motion.div
						animate={{ opacity: [1, 0.3, 1] }}
						transition={{ repeat: Infinity, duration: 1 }}
						className="bg-orange-500 rounded-lg px-1.5 py-1 min-w-[32px] self-end mb-0.5"
					>
						<span className="text-sm font-black text-white tabular-nums leading-none font-mono">
							{String(currentTime.getSeconds()).padStart(2, "0")}
						</span>
					</motion.div>
				</div>
				{absensiSettings?.jam_masuk && (
					<p className="text-[10px] text-slate-300 mt-1 text-center">
						{absensiSettings.jam_masuk} — {absensiSettings.jam_pulang}
					</p>
				)}
				</div>
			</div>

			{/* ══ Content ═════════════════════════════════════ */}
			<div className="flex-1 overflow-hidden px-5">
				<div className="max-w-lg mx-auto h-full flex flex-col">

					{/* ── Device Warning ── */}
					{eligible && !eligible.device_registered && (
						<div className="bg-amber-50 rounded-xl p-2.5 mb-2 flex items-center gap-2 flex-shrink-0">
							<FiSmartphone className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
							<p className="text-[10px] text-amber-700 font-medium">Device belum terdaftar — logout lalu login kembali</p>
						</div>
					)}

					{/* ══════════════════════════════════════════ */}
					{/* ══ PRESENSI ═════════════════════════════ */}
					{/* ══════════════════════════════════════════ */}
					{activeTab === "presensi" && (
						<div className="flex-1 flex flex-col">
							{isNonHadir ? (
								/* ── Already Izin/Sakit/Cuti ── */
								<div className="flex-1 flex flex-col items-center justify-center">
									<div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
										<LuCircleCheckBig className="w-8 h-8 text-emerald-500" />
									</div>
									<span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mb-1 ${STATUS_COLORS[todayStatus]?.bg} ${STATUS_COLORS[todayStatus]?.text}`}>
										<span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[todayStatus]?.dot}`} />
										{STATUS_LABELS[todayStatus]}
									</span>
									<p className="text-sm font-bold text-slate-700">Tercatat hari ini</p>
									{todayData?.keterangan && <p className="text-[10px] text-slate-400 mt-0.5 text-center">{todayData.keterangan}</p>}
								</div>
							) : hasOut ? (
								/* ── Completed (Masuk + Pulang) — Premium Design ── */
								<div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
									{/* Floating particles background */}
									<div className="absolute inset-0 pointer-events-none">
										{[...Array(12)].map((_, i) => (
											<motion.div
												key={i}
												className="absolute w-2 h-2 rounded-full"
												style={{
													background: ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899'][i % 5],
													left: `${10 + (i * 7) % 80}%`,
													top: `${15 + (i * 11) % 70}%`,
												}}
												animate={{
													y: [0, -15, 0],
													x: [0, i % 2 === 0 ? 8 : -8, 0],
													scale: [0.8, 1.2, 0.8],
													opacity: [0.3, 0.6, 0.3],
												}}
												transition={{
													duration: 3 + (i % 3),
													repeat: Infinity,
													delay: i * 0.2,
													ease: "easeInOut",
												}}
											/>
										))}
									</div>

									{/* Success ring with animated gradient */}
									<motion.div
										initial={{ scale: 0, rotate: -180 }}
										animate={{ scale: 1, rotate: 0 }}
										transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
										className="relative mb-5"
									>
										{/* Outer glow */}
										<div className="absolute -inset-3 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 rounded-full blur-xl opacity-30 animate-pulse" />
										
										{/* Ring container */}
										<div className="relative w-24 h-24">
											{/* Animated rotating ring */}
											<svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
												<defs>
													<linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="100%">
														<stop offset="0%" stopColor="#10b981" />
														<stop offset="50%" stopColor="#06b6d4" />
														<stop offset="100%" stopColor="#8b5cf6" />
													</linearGradient>
												</defs>
												<circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="6" />
												<motion.circle
													cx="50" cy="50" r="45"
													fill="none"
													stroke="url(#successGradient)"
													strokeWidth="6"
													strokeLinecap="round"
													strokeDasharray={283}
													initial={{ strokeDashoffset: 283 }}
													animate={{ strokeDashoffset: 0 }}
													transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
												/>
											</svg>
											
											{/* Center icon */}
											<motion.div
												initial={{ scale: 0 }}
												animate={{ scale: 1 }}
												transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.6 }}
												className="absolute inset-0 flex items-center justify-center"
											>
												<div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
													<LuCircleCheckBig className="w-8 h-8 text-white" />
												</div>
											</motion.div>
										</div>
									</motion.div>

									{/* Success text with gradient */}
									<motion.div
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ duration: 0.5, delay: 0.4 }}
										className="text-center mb-4"
									>
										<h2 className="text-xl font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
											Presensi Selesai
										</h2>
										<p className="text-xs text-slate-400 mt-0.5">Kerja bagus hari ini!</p>
									</motion.div>

									{/* Mode badge */}
									{isDinasMode && (
										<motion.span
											initial={{ opacity: 0, scale: 0.8 }}
											animate={{ opacity: 1, scale: 1 }}
											transition={{ delay: 0.5 }}
											className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-4 ${STATUS_COLORS[todayStatus]?.bg} ${STATUS_COLORS[todayStatus]?.text} ring-2 ring-offset-2 ring-offset-white ${STATUS_COLORS[todayStatus]?.text.replace('text-', 'ring-')}/20`}
										>
											<span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[todayStatus]?.dot} animate-pulse`} />
											{STATUS_LABELS[todayStatus]}
										</motion.span>
									)}

									{/* Time card with glassmorphism */}
									<motion.div
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ duration: 0.5, delay: 0.6 }}
										className="relative w-full max-w-xs"
									>
										<div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 rounded-2xl blur-xl" />
										<div className="relative bg-white/80 backdrop-blur-xl border border-slate-100 rounded-2xl p-4 shadow-xl shadow-slate-200/50">
											{/* Timeline visualization */}
											<div className="flex items-center justify-between mb-4">
												<motion.div
													initial={{ x: -20, opacity: 0 }}
													animate={{ x: 0, opacity: 1 }}
													transition={{ delay: 0.7 }}
													className="flex flex-col items-center"
												>
													<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-2">
														<LuLogIn className="w-5 h-5 text-white" />
													</div>
													<span className="text-lg font-black text-slate-800 tabular-nums">{fmt(todayData?.jam_masuk)}</span>
													<span className="text-[10px] text-slate-400 font-medium">Masuk</span>
												</motion.div>

												{/* Animated connector */}
												<div className="flex-1 mx-3 relative h-1">
													<div className="absolute inset-0 bg-slate-100 rounded-full" />
													<motion.div
														initial={{ scaleX: 0 }}
														animate={{ scaleX: 1 }}
														transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
														className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 rounded-full origin-left"
													/>
													<motion.div
														initial={{ opacity: 0 }}
														animate={{ opacity: 1 }}
														transition={{ delay: 1.2 }}
														className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-teal-400 shadow-sm"
													/>
												</div>

												<motion.div
													initial={{ x: 20, opacity: 0 }}
													animate={{ x: 0, opacity: 1 }}
													transition={{ delay: 0.9 }}
													className="flex flex-col items-center"
												>
													<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 mb-2">
														<LuLogOut className="w-5 h-5 text-white" />
													</div>
													<span className="text-lg font-black text-slate-800 tabular-nums">{fmt(todayData?.jam_keluar)}</span>
													<span className="text-[10px] text-slate-400 font-medium">Pulang</span>
												</motion.div>
											</div>

											{/* Status tags */}
											{(telatMasukMenit > 0 || pulangLebiahAwalMenit > 0) && (
												<motion.div
													initial={{ opacity: 0 }}
													animate={{ opacity: 1 }}
													transition={{ delay: 1 }}
													className="flex flex-wrap justify-center gap-2 pt-3 border-t border-slate-100"
												>
													{telatMasukMenit > 0 && (
														<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 text-[10px] font-bold">
															<span className="w-1 h-1 rounded-full bg-rose-400" />
															Telat {telatMasukMenit >= 60 ? `${Math.floor(telatMasukMenit / 60)} jam ${telatMasukMenit % 60} menit` : `${telatMasukMenit} menit`}
														</span>
													)}
													{pulangLebiahAwalMenit > 0 && (
														<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 text-[10px] font-bold">
															<span className="w-1 h-1 rounded-full bg-amber-400" />
															{pulangLebiahAwalMenit} menit lebih awal
														</span>
													)}
												</motion.div>
											)}
										</div>
									</motion.div>
								</div>
							) : hasIn ? (
								/* ── Waiting for Pulang — Premium Design ── */
								<div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
									{/* Subtle animated background particles */}
									<div className="absolute inset-0 pointer-events-none">
										{[...Array(8)].map((_, i) => (
											<motion.div
												key={i}
												className="absolute rounded-full"
												style={{
													width: 6 + (i % 3) * 4,
													height: 6 + (i % 3) * 4,
													background: ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b'][i % 4],
													left: `${12 + (i * 11) % 76}%`,
													top: `${18 + (i * 13) % 64}%`,
												}}
												animate={{
													y: [0, -10, 0],
													opacity: [0.15, 0.35, 0.15],
													scale: [0.8, 1.1, 0.8],
												}}
												transition={{
													duration: 4 + (i % 3),
													repeat: Infinity,
													delay: i * 0.4,
													ease: "easeInOut",
												}}
											/>
										))}
									</div>

									{/* Check-in time badge */}
									<motion.div
										initial={{ opacity: 0, y: -10 }}
										animate={{ opacity: 1, y: 0 }}
										className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 shadow-sm mb-4"
									>
										<div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
											<LuLogIn className="w-3.5 h-3.5 text-white" />
										</div>
										<div>
											<p className="text-[10px] text-emerald-500 font-semibold leading-none">Masuk</p>
											<p className="text-sm font-black text-emerald-700 tabular-nums leading-tight">{fmt(todayData?.jam_masuk)}</p>
										</div>
									</motion.div>

									{/* Mode badge */}
									{isDinasMode && (
										<motion.span
											initial={{ opacity: 0, scale: 0.9 }}
											animate={{ opacity: 1, scale: 1 }}
											className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold mb-3 ${STATUS_COLORS[todayStatus]?.bg} ${STATUS_COLORS[todayStatus]?.text} ring-1 ${STATUS_COLORS[todayStatus]?.text.replace('text-', 'ring-')}/20`}
										>
											<span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[todayStatus]?.dot} animate-pulse`} />
											{STATUS_LABELS[todayStatus]}
										</motion.span>
									)}

									{/* Late badge */}
									{telatMasukMenit > 0 && (
										<motion.span
											initial={{ opacity: 0, scale: 0.9 }}
											animate={{ opacity: 1, scale: 1 }}
											className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold mb-3 ring-1 ring-rose-200"
										>
											<span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
											Telat {telatMasukMenit >= 60 ? `${Math.floor(telatMasukMenit / 60)} jam ${telatMasukMenit % 60} menit` : `${telatMasukMenit} menit`}
										</motion.span>
									)}

									{canClockOut ? (
										<motion.button
											{...pressAnimation}
											onClick={startPulang}
											disabled={clockLoading}
											className="flex flex-col items-center cursor-pointer disabled:opacity-50"
										>
											<div className="relative w-40 h-40 flex items-center justify-center">
												<div className="absolute inset-0 rounded-full bg-gradient-to-br from-sky-100 via-blue-50 to-sky-100 shadow-[0_0_25px_rgba(14,165,233,0.15)]" />
												<div className="absolute inset-1 rounded-full border-2 border-dashed border-sky-200/60 animate-[spin_20s_linear_infinite]" />
												{clockLoading ? (
													<div className="w-12 h-12 border-[3px] border-sky-200 border-t-sky-500 rounded-full animate-spin" />
												) : (
													<Lottie animationData={bellAnim} loop autoplay className="relative z-10" style={{ height: 120, width: 120 }} />
												)}
											</div>
											<p className="text-base font-bold text-sky-600 mt-2">Absen Pulang</p>
										</motion.button>
									) : (
										<motion.div
											initial={{ scale: 0.9, opacity: 0 }}
											animate={{ scale: 1, opacity: 1 }}
											transition={{ type: "spring", stiffness: 200, damping: 15 }}
											className="flex flex-col items-center"
										>
											{/* Animated progress ring */}
											<div className="relative w-28 h-28 mb-4">
												{/* Outer glow */}
												<div className="absolute -inset-2 bg-gradient-to-r from-emerald-400/20 via-teal-400/20 to-cyan-400/20 rounded-full blur-xl animate-pulse" />

												<svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
													<circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="5" />
													<motion.circle
														cx="50" cy="50" r="42"
														fill="none"
														stroke="url(#waitGrad)"
														strokeWidth="5"
														strokeLinecap="round"
														strokeDasharray={264}
														initial={{ strokeDashoffset: 264 }}
														animate={{ strokeDashoffset: 66 }}
														transition={{ duration: 1.5, ease: "easeOut" }}
													/>
													<defs>
														<linearGradient id="waitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
															<stop offset="0%" stopColor="#10b981" />
															<stop offset="100%" stopColor="#06b6d4" />
														</linearGradient>
													</defs>
												</svg>

												{/* Center icon */}
												<motion.div
													className="absolute inset-0 flex items-center justify-center"
													animate={{ y: [0, -3, 0] }}
													transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
												>
													<div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
														<LuCircleCheckBig className="w-8 h-8 text-white" />
													</div>
												</motion.div>
											</div>

											<motion.p
												initial={{ opacity: 0, y: 5 }}
												animate={{ opacity: 1, y: 0 }}
												transition={{ delay: 0.3 }}
												className="text-base font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent"
											>
												Sedang Bekerja
											</motion.p>
											<motion.p
												initial={{ opacity: 0, y: 5 }}
												animate={{ opacity: 1, y: 0 }}
												transition={{ delay: 0.4 }}
												className="text-[11px] text-slate-400 mt-1"
											>
												Menunggu jam pulang ({absensiSettings?.jam_pulang || "16:00"})
											</motion.p>

											{/* Time remaining card */}
											<motion.div
												initial={{ opacity: 0, y: 10 }}
												animate={{ opacity: 1, y: 0 }}
												transition={{ delay: 0.5 }}
												className="mt-4 px-5 py-3 rounded-2xl bg-white border border-slate-100 shadow-lg shadow-slate-200/50"
											>
												<div className="flex items-center gap-3">
													<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
														<span className="text-white font-bold text-sm tabular-nums font-mono">
															{String(currentTime.getHours()).padStart(2, "0")}:{String(currentTime.getMinutes()).padStart(2, "0")}
														</span>
													</div>
													<div>
														<p className="text-xs font-bold text-slate-700">Waktu saat ini</p>
														<p className="text-[10px] text-slate-400">
															Pulang pukul {absensiSettings?.jam_pulang || "16:00"} WIB
														</p>
													</div>
												</div>
											</motion.div>
										</motion.div>
									)}
								</div>
							) : (
								/* ── Belum Absen — Action Buttons ── */
								<div className="flex-1 flex flex-col items-center justify-center gap-3">
									{/* Info: Absensi belum/sudah dibuka */}
									{!isAbsensiOpen().open && (
										<div className="w-full px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-center">
											<p className="text-xs font-bold text-amber-700">{isAbsensiOpen().message}</p>
										</div>
									)}
									{/* Main: Absen Masuk — Big Bell */}
									<div className="w-full flex justify-center bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.07)] p-4">
									<motion.button
										{...pressAnimation}
										onClick={startHadir}
										disabled={clockLoading}
										className="flex flex-col items-center cursor-pointer disabled:opacity-50"
									>
										<div className="relative w-40 h-40 flex items-center justify-center">
											<div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-100 via-amber-50 to-orange-100 shadow-[0_0_25px_rgba(249,115,22,0.15)]" />
											<div className="absolute inset-1 rounded-full border-2 border-dashed border-orange-200/60 animate-[spin_20s_linear_infinite]" />
											{clockLoading && absensiMode === "hadir" ? (
												<div className="w-12 h-12 border-[3px] border-orange-200 border-t-orange-500 rounded-full animate-spin" />
											) : (
												<Lottie animationData={bellAnim} loop autoplay className="relative z-10" style={{ height: 120, width: 120 }} />
											)}
										</div>
										<p className="text-base font-bold text-orange-600 mt-2">Absen Masuk</p>
									</motion.button>
									</div>

									{/* Mode buttons */}
									<div className="w-full bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.07)] p-3">
									<div className="grid grid-cols-3 gap-2">
										<motion.button
											{...pressAnimation}
											onClick={startDinasLuar}
											disabled={clockLoading}
											className="flex flex-col items-center gap-1 py-2.5 bg-violet-50/50 border border-violet-100 rounded-xl disabled:opacity-50 cursor-pointer"
										>
											<Lottie animationData={manWaitingCarAnim} loop autoplay className="h-7 w-7" />
											<span className="text-[9px] font-bold text-violet-600">Dinas Luar</span>
										</motion.button>
										<motion.button
											{...pressAnimation}
											onClick={startWFH}
											disabled={clockLoading}
											className="flex flex-col items-center gap-1 py-2.5 bg-teal-50/50 border border-teal-100 rounded-xl disabled:opacity-50 cursor-pointer"
										>
											<Lottie animationData={workFromHomeAnim} loop autoplay className="h-7 w-7" />
											<span className="text-[9px] font-bold text-teal-600">WFH</span>
										</motion.button>
										<motion.button
											{...pressAnimation}
											onClick={startWFA}
											disabled={clockLoading}
											className="flex flex-col items-center gap-1 py-2.5 bg-indigo-50/50 border border-indigo-100 rounded-xl disabled:opacity-50 cursor-pointer"
										>
											<Lottie animationData={workFromAnywhereAnim} loop autoplay className="h-7 w-7" />
											<span className="text-[9px] font-bold text-indigo-600">WFA</span>
										</motion.button>
									</div>
									</div>

									{/* Izin / Sakit / Cuti */}
									<div className="w-full bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
									<button
										onClick={() => setShowIzinModal(true)}
										className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-slate-50 text-slate-500 rounded-2xl font-bold text-[11px] active:bg-slate-100 cursor-pointer"
									>
										<LuClipboardList className="h-3.5 w-3.5" /> Izin / Sakit / Cuti
									</button>
									</div>
								</div>
							)}
						</div>
					)}

					{/* ══════════════════════════════════════════ */}
					{/* ══ RIWAYAT TAB ═════════════════════════= */}
					{/* ══════════════════════════════════════════ */}
					{activeTab === "riwayat" && (
						<motion.div
							key="riwayat"
							initial={{ opacity: 0, x: 10 }}
							animate={{ opacity: 1, x: 0 }}
							className="flex-1 flex flex-col min-h-0"
						>
							{/* Summary chips */}
							<div className="flex-shrink-0 mb-2">
								<div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
									{["hadir", "izin", "sakit", "alpha", "cuti", "dinas_luar", "wfh", "wfa"].map((key) => (
										<div key={key} className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg ${STATUS_COLORS[key].bg}`}>
											<span className={`text-sm font-bold ${STATUS_COLORS[key].text} tabular-nums`}>
												{history.summary?.[key] || 0}
											</span>
											<span className="text-[8px] text-slate-400 font-bold uppercase">{STATUS_LABELS[key]}</span>
										</div>
									))}
								</div>
							</div>

							{/* Month nav */}
							<div className="flex items-center justify-between mb-2 flex-shrink-0">
								<button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
									<FiChevronLeft className="h-4 w-4 text-slate-400" />
								</button>
								<span className="font-bold text-slate-700 text-xs">{monthNames[selectedMonth - 1]} {selectedYear}</span>
								<button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
									<FiChevronRight className="h-4 w-4 text-slate-400" />
								</button>
							</div>

							{/* List */}
							<div className="flex-1 overflow-y-auto min-h-0 space-y-1 scrollbar-none">
								{history.records?.length === 0 ? (
									<div className="flex flex-col items-center justify-center py-12">
										<FiCalendar className="h-8 w-8 text-slate-200 mb-2" />
										<p className="text-xs text-slate-400">Belum ada data</p>
									</div>
								) : (
									history.records?.map((r, i) => {
										const sc = STATUS_COLORS[r.status] || STATUS_COLORS.alpha;
										const tgl = new Date(r.tanggal);
										return (
											<motion.div
												key={r.id}
												custom={i}
												initial="hidden"
												animate="visible"
												variants={listItemVariants}
												className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-100 hover:border-slate-200 transition-colors"
											>
												{/* Date */}
												<div className="w-9 h-9 rounded-lg bg-slate-50 flex flex-col items-center justify-center flex-shrink-0">
													<span className="text-sm font-black text-slate-700 leading-none">{tgl.getDate()}</span>
													<span className="text-[7px] text-slate-400 uppercase font-bold leading-none">
														{tgl.toLocaleDateString("id-ID", { weekday: "short" })}
													</span>
												</div>

												{/* Info */}
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-1">
														<span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${sc.bg} ${sc.text}`}>
															<span className={`w-1 h-1 rounded-full ${sc.dot}`} />
															{STATUS_LABELS[r.status]}
														</span>
														{r.jarak_masuk != null && (
															<span className="text-[8px] text-slate-300"><FiMapPin className="inline h-2 w-2" /> {r.jarak_masuk}m</span>
														)}
													</div>
													{r.tujuan_dinas && <p className="text-[9px] text-violet-500 truncate mt-0.5">{r.tujuan_dinas}</p>}
													{r.keterangan && <p className="text-[9px] text-slate-400 truncate mt-0.5">{r.keterangan}</p>}
												</div>

												{/* Times */}
												<div className="text-right flex-shrink-0">
													{r.jam_masuk && <p className="text-[11px] font-bold text-slate-700 tabular-nums">{fmt(r.jam_masuk)}</p>}
													{r.jam_keluar ? (
														<p className="text-[10px] text-slate-400 tabular-nums">{fmt(r.jam_keluar)}</p>
													) : r.jam_masuk && new Date(r.tanggal).toDateString() !== new Date().toDateString() && !["izin", "sakit", "cuti"].includes(r.status) ? (
														<span className="text-[8px] text-amber-500 font-bold">Lupa pulang</span>
													) : null}
												</div>
											</motion.div>
										);
									})
								)}
							</div>
						</motion.div>
					)}
				</div>
			</div>

			{/* ══ Modals ══════════════════════════════════════ */}
			<AnimatePresence>
				{showDinasLuarModal && <DinasLuarModal onClose={() => setShowDinasLuarModal(false)} onConfirm={handleDinasLuarConfirm} />}
			</AnimatePresence>
			<AnimatePresence>
				{showCameraModal && <CameraGPSModal type={showCameraModal} onClose={() => setShowCameraModal(null)} onSubmit={handleAbsensiSubmit} />}
			</AnimatePresence>
			<AnimatePresence>
				{showIzinModal && <IzinModal onClose={() => setShowIzinModal(false)} onSubmit={handleSubmitIzin} />}
			</AnimatePresence>

			<AbsensiSuccessPopup show={successPopup.show} data={successPopup.data} onClose={() => setSuccessPopup({ show: false, data: null })} />

			<style>{`.scrollbar-none::-webkit-scrollbar{display:none}.scrollbar-none{-ms-overflow-style:none;scrollbar-width:none}`}</style>
		</div>
	);
};

// ═══════════════════════════════════════════════════════════════
// ─── Dinas Luar Modal ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
const DinasLuarModal = ({ onClose, onConfirm }) => {
	const [tujuan, setTujuan] = useState("");
	const submit = () => {
		if (!tujuan.trim()) { showAlert({ icon: "warning", title: "Tujuan Wajib", text: "Isi tujuan dinas luar terlebih dahulu." }); return; }
		onConfirm(tujuan.trim());
	};

	return (
		<>
			<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={onClose} />
			<motion.div {...slideUp} className="fixed bottom-0 left-0 right-0 z-50">
				<div className="bg-white rounded-t-3xl shadow-xl" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
					<div className="max-w-lg mx-auto p-5 pb-28">
						<div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
						<div className="flex items-center gap-3 mb-4">
							<div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center overflow-hidden">
								<Lottie animationData={manWaitingCarAnim} loop autoplay className="h-12 w-12" />
							</div>
							<div>
								<h3 className="font-bold text-slate-800">Dinas Luar</h3>
								<p className="text-[10px] text-slate-400">Isi tujuan lalu lanjut ke kamera</p>
							</div>
						</div>
						<input
							type="text" value={tujuan} onChange={(e) => setTujuan(e.target.value)}
							onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
							placeholder="Contoh: Rapat di Kecamatan Cibinong"
							className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-300 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 mb-4"
							autoFocus
						/>
						<div className="flex gap-2">
							<button onClick={onClose} className="flex-1 py-3 bg-slate-50 text-slate-500 rounded-xl font-bold text-sm active:bg-slate-100 cursor-pointer">Batal</button>
							<button onClick={submit} className="flex-1 py-3 bg-violet-500 text-white rounded-xl font-bold text-sm active:bg-violet-600 cursor-pointer">Lanjut</button>
						</div>
					</div>
				</div>
			</motion.div>
		</>
	);
};

// ═══════════════════════════════════════════════════════════════
// ─── Camera + GPS Modal ───────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
const CameraGPSModal = ({ type, onClose, onSubmit }) => {
	const videoRef = useRef(null);
	const canvasRef = useRef(null);
	const streamRef = useRef(null);
	const [photo, setPhoto] = useState(null);
	const [gps, setGps] = useState(null);
	const [gpsLoading, setGpsLoading] = useState(true);
	const [gpsError, setGpsError] = useState(null);
	const [camError, setCamError] = useState(null);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
				if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
				streamRef.current = stream;
				if (videoRef.current) videoRef.current.srcObject = stream;
			} catch { if (mounted) setCamError("Kamera tidak dapat diakses"); }
		})();
		return () => { mounted = false; streamRef.current?.getTracks().forEach(t => t.stop()); };
	}, []);

	useEffect(() => {
		if (!navigator.geolocation) { setGpsError("GPS tidak tersedia"); setGpsLoading(false); return; }
		const wid = navigator.geolocation.watchPosition(
			(pos) => { setGps({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }); setGpsLoading(false); setGpsError(null); },
			(err) => { setGpsError(err.code === 1 ? "Izin lokasi ditolak" : "GPS gagal"); setGpsLoading(false); },
			{ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
		);
		return () => navigator.geolocation.clearWatch(wid);
	}, []);

	const capture = () => {
		const v = videoRef.current, c = canvasRef.current;
		if (!v || !c) return;
		c.width = v.videoWidth; c.height = v.videoHeight;
		const ctx = c.getContext("2d");
		ctx.translate(c.width, 0); ctx.scale(-1, 1);
		ctx.drawImage(v, 0, 0);
		setPhoto(c.toDataURL("image/jpeg", 0.7));
		streamRef.current?.getTracks().forEach(t => t.stop());
	};

	const retake = async () => {
		setPhoto(null);
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
			streamRef.current = stream;
			if (videoRef.current) videoRef.current.srcObject = stream;
		} catch { setCamError("Kamera tidak dapat diakses"); }
	};

	const handleSubmit = async () => {
		if (!photo || !gps) return;
		setSubmitting(true);
		await onSubmit(type, photo, gps);
		setSubmitting(false);
	};

	const close = () => { streamRef.current?.getTracks().forEach(t => t.stop()); onClose(); };
	const isMasuk = type === "masuk";

	return (
		<>
			<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={close} />
			<motion.div
				initial={{ opacity: 0, y: 40 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: 40 }}
				transition={{ type: "spring", stiffness: 300, damping: 25 }}
				className="fixed inset-0 z-50 flex items-center justify-center p-4"
			>
				<div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
					{/* Header */}
					<div className={`px-4 py-3 ${isMasuk ? "bg-gradient-to-r from-orange-500 to-amber-500" : "bg-gradient-to-r from-sky-500 to-blue-500"}`}>
						<div className="flex items-center justify-between">
							<div>
								<h3 className="font-bold text-white">{isMasuk ? "Absen Masuk" : "Absen Pulang"}</h3>
								<p className="text-white/50 text-[10px]">Selfie & GPS</p>
							</div>
							<button onClick={close} className="p-1 rounded-full hover:bg-white/20 cursor-pointer">
								<FiXCircle className="h-5 w-5 text-white/60" />
							</button>
						</div>
					</div>

					<div className="p-4">
						{/* Camera */}
						<div className="relative rounded-xl overflow-hidden bg-slate-900 mb-3 aspect-[4/3]">
							{camError ? (
								<div className="absolute inset-0 flex items-center justify-center">
									<div className="text-center">
										<FiCamera className="h-8 w-8 mx-auto text-white/20 mb-1" />
										<p className="text-[10px] text-white/40">{camError}</p>
									</div>
								</div>
							) : photo ? (
								<img src={photo} alt="" className="w-full h-full object-cover" />
							) : (
								<video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
							)}
							<canvas ref={canvasRef} className="hidden" />
						</div>

						{/* Capture / Retake */}
						{!camError && (
							<div className="flex justify-center mb-3">
								{!photo ? (
									<button onClick={capture} className="w-14 h-14 rounded-full bg-slate-100 border-[3px] border-slate-200 flex items-center justify-center cursor-pointer">
										<div className="w-10 h-10 rounded-full bg-red-500" />
									</button>
								) : (
									<button onClick={retake} className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-lg text-xs font-bold cursor-pointer">Ulangi Foto</button>
								)}
							</div>
						)}

						{/* GPS */}
						<div className={`rounded-lg p-2.5 mb-3 ${gpsError ? "bg-red-50" : gps ? "bg-emerald-50" : "bg-slate-50"}`}>
							<div className="flex items-center gap-2">
								<FiMapPin className={`h-3.5 w-3.5 ${gpsError ? "text-red-400" : gps ? "text-emerald-500" : "text-slate-300"}`} />
								{gpsLoading ? (
									<div className="flex items-center gap-1.5">
										<div className="w-3 h-3 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
										<span className="text-[10px] text-slate-400">Mengambil lokasi...</span>
									</div>
								) : gpsError ? (
									<span className="text-[10px] text-red-500 font-medium">{gpsError}</span>
								) : (
									<span className="text-[10px] text-emerald-600 font-bold">Lokasi terdeteksi (~{Math.round(gps.accuracy)}m)</span>
								)}
							</div>
						</div>

						{/* Submit */}
						<button
							onClick={handleSubmit}
							disabled={!photo || !gps || submitting}
							className={`w-full py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer ${
								isMasuk ? "bg-gradient-to-r from-orange-500 to-amber-500" : "bg-gradient-to-r from-sky-500 to-blue-500"
							}`}
						>
							{submitting ? (
								<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
							) : (
								<><FiCheckCircle className="h-4 w-4" /> {isMasuk ? "Konfirmasi Masuk" : "Konfirmasi Pulang"}</>
							)}
						</button>
					</div>
				</div>
			</motion.div>
		</>
	);
};

// ═══════════════════════════════════════════════════════════════
// ─── Izin Modal ───────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
const IzinModal = ({ onClose, onSubmit }) => {
	const [status, setStatus] = useState("");
	const [keterangan, setKeterangan] = useState("");
	const [loading, setLoading] = useState(false);

	const opts = [
		{ value: "izin", label: "Izin", icon: LuFileText, active: "bg-amber-50 border-amber-300 text-amber-600", iconActive: "text-amber-500" },
		{ value: "sakit", label: "Sakit", icon: LuHeartPulse, active: "bg-rose-50 border-rose-300 text-rose-600", iconActive: "text-rose-500" },
		{ value: "cuti", label: "Cuti", icon: LuCalendarOff, active: "bg-sky-50 border-sky-300 text-sky-600", iconActive: "text-sky-500" },
		{ value: "wfh", label: "WFH", icon: LuCircleCheckBig, active: "bg-teal-50 border-teal-300 text-teal-600", iconActive: "text-teal-500" },
		{ value: "wfa", label: "WFA", icon: LuCircleCheckBig, active: "bg-indigo-50 border-indigo-300 text-indigo-600", iconActive: "text-indigo-500" },
	];

	const submit = async () => {
		if (!status) return;
		// WFH/WFA need keterangan
		if ((status === 'wfh' || status === 'wfa') && !keterangan.trim()) {
			showAlert({ icon: "warning", title: "Keterangan Wajib", text: `Isi keterangan untuk ${status.toUpperCase()} (misal: lokasi/alasan)` });
			return;
		}
		setLoading(true);
		await onSubmit(status, keterangan);
		setLoading(false);
	};

	return (
		<>
			<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={onClose} />
			<motion.div {...slideUp} className="fixed bottom-0 left-0 right-0 z-50">
				<div className="bg-white rounded-t-3xl shadow-xl">
					<div className="max-w-lg mx-auto p-5">
						<div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
						<h3 className="font-bold text-slate-800 mb-3">Izin / Sakit / Cuti / WFH / WFA</h3>
						<div className="grid grid-cols-5 gap-1.5 mb-3">
							{opts.map((o) => {
								const Icon = o.icon;
								const sel = status === o.value;
								return (
									<button
										key={o.value}
										onClick={() => setStatus(o.value)}
										className={`p-3 rounded-xl border-2 text-center transition-all cursor-pointer ${
											sel ? o.active : "border-slate-100 bg-slate-50 text-slate-400"
										}`}
									>
										<Icon className={`h-5 w-5 mx-auto mb-0.5 ${sel ? o.iconActive : "text-slate-300"}`} />
										<span className="text-xs font-bold">{o.label}</span>
									</button>
								);
							})}
						</div>
						<textarea
							value={keterangan} onChange={(e) => setKeterangan(e.target.value)}
							placeholder="Keterangan (opsional)..." rows={2}
							className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-300 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 resize-none mb-4"
						/>
						<div className="flex gap-2">
							<button onClick={onClose} className="flex-1 py-3 bg-slate-50 text-slate-500 rounded-xl font-bold text-sm active:bg-slate-100 cursor-pointer">Batal</button>
							<button
								onClick={submit} disabled={!status || loading}
								className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2 active:bg-orange-600 cursor-pointer"
							>
								{loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Submit"}
							</button>
						</div>
					</div>
				</div>
			</motion.div>
		</>
	);
};

export default AbsensiPage;
