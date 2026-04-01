// src/pages/pegawai/AbsensiPage.jsx
// Clean white redesign — slate palette, smooth spring press effects
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
	FiCheckCircle, FiXCircle, FiCalendar,
	FiChevronLeft, FiChevronRight, FiAlertCircle, FiMapPin,
	FiCamera, FiSmartphone, FiHome, FiClock as FiClockIcon,
} from "react-icons/fi";
import {
	LuLogIn, LuLogOut, LuClipboardList, LuFileText, LuHeartPulse, LuCalendarOff,
	LuBuilding2, LuCircleCheckBig, LuClock, LuShieldCheck, LuHistory,
} from "react-icons/lu";
import Lottie from "lottie-react";
import manWaitingCarAnim from "../../assets/lottie/man-waiting-car.json";
import workFromHomeAnim from "../../assets/lottie/work-from-home.json";
import workFromAnywhereAnim from "../../assets/lottie/work-from-anywhere.json";
import bellAnim from "../../assets/lottie/bell.json";
import api from "../../api";
import { getAvatarUrl } from "../../utils/avatarUtils";
import { pressAnimation, cardPress, chipPress, listItemVariants, fadeUp, scalePop, slideUp } from "../../utils/animations";
import AbsensiSuccessPopup from "../../components/AbsensiSuccessPopup";
import { showAlert } from "../../components/AlertPopup";

// ─── Constants ───────────────────────────────────────────────
const STATUS_COLORS = {
	hadir:      { bg: "bg-emerald-50",  text: "text-emerald-600", dot: "bg-emerald-500", ring: "ring-emerald-200",  icon: "text-emerald-500" },
	izin:       { bg: "bg-amber-50",    text: "text-amber-600",   dot: "bg-amber-500",   ring: "ring-amber-200",    icon: "text-amber-500" },
	sakit:      { bg: "bg-rose-50",     text: "text-rose-600",    dot: "bg-rose-500",    ring: "ring-rose-200",     icon: "text-rose-500" },
	alpha:      { bg: "bg-slate-100",   text: "text-slate-500",   dot: "bg-slate-400",   ring: "ring-slate-200",    icon: "text-slate-400" },
	cuti:       { bg: "bg-sky-50",      text: "text-sky-600",     dot: "bg-sky-500",     ring: "ring-sky-200",      icon: "text-sky-500" },
	dinas_luar: { bg: "bg-violet-50",   text: "text-violet-600",  dot: "bg-violet-500",  ring: "ring-violet-200",   icon: "text-violet-500" },
	wfh:        { bg: "bg-teal-50",     text: "text-teal-600",    dot: "bg-teal-500",    ring: "ring-teal-200",     icon: "text-teal-500" },
	wfa:        { bg: "bg-indigo-50",   text: "text-indigo-600",  dot: "bg-indigo-500",  ring: "ring-indigo-200",   icon: "text-indigo-500" },
};

const STATUS_LABELS = {
	hadir: "Hadir", izin: "Izin", sakit: "Sakit", alpha: "Alpha", cuti: "Cuti",
	dinas_luar: "Dinas Luar", wfh: "WFH", wfa: "WFA",
};

const formatTime = (timeStr) => {
	if (!timeStr) return "--:--";
	const d = new Date(timeStr);
	return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
};

const isPWA = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

const getDeviceId = () => {
	let deviceId = localStorage.getItem("dpmd_device_id");
	if (!deviceId) {
		deviceId = crypto.randomUUID ? crypto.randomUUID() : (
			"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
				const r = (Math.random() * 16) | 0;
				return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
			})
		);
		localStorage.setItem("dpmd_device_id", deviceId);
	}
	return deviceId;
};

// ═══════════════════════════════════════════════════════════════
// ─── Main AbsensiPage Component ──────────────────────────────
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

	// Live clock
	useEffect(() => {
		const timer = setInterval(() => setCurrentTime(new Date()), 1000);
		return () => clearInterval(timer);
	}, []);

	// Sync tab with URL params
	useEffect(() => {
		const tab = searchParams.get("tab");
		if (tab === "riwayat") setActiveTab("riwayat");
		else setActiveTab("presensi");
	}, [searchParams]);

	// Check eligibility + auto-register device
	useEffect(() => {
		const check = async () => {
			try {
				const res = await api.get("/absensi/check-eligible");
				const data = res.data.data;
				setEligible(data);
				if (data?.eligible && !data?.device_registered && deviceId) {
					try {
						await api.post("/absensi/register-device", { device_id: deviceId });
						const res2 = await api.get("/absensi/check-eligible");
						setEligible(res2.data.data);
					} catch (err) {
						console.error("Auto device registration failed:", err);
					}
				}
			} catch {
				setEligible({ eligible: false });
			}
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
		} catch (err) {
			console.error("Error fetching today:", err);
		}
	}, []);

	const fetchHistory = useCallback(async () => {
		try {
			const res = await api.get(`/absensi/history?bulan=${selectedMonth}&tahun=${selectedYear}`);
			setHistory(res.data.data || { records: [], summary: {} });
		} catch (err) {
			console.error("Error fetching history:", err);
		}
	}, [selectedMonth, selectedYear]);

	useEffect(() => {
		const init = async () => {
			setLoading(true);
			await Promise.all([fetchToday(), fetchHistory()]);
			setLoading(false);
		};
		init();
	}, [fetchToday, fetchHistory]);

	// Fetch success messages for popups
	useEffect(() => {
		const fetchSuccessMessages = async () => {
			try {
				const res = await api.get("/absensi/success-messages");
				setSuccessMessages(res.data.data || {});
			} catch (err) {
				console.error("Error fetching success messages:", err);
			}
		};
		fetchSuccessMessages();
	}, []);

	const checkDevice = () => {
		if (!eligible?.device_registered) {
			showAlert({
				icon: "warning",
				title: "Perangkat Belum Terdaftar",
				text: "Perangkat ini belum terdaftar di sistem. Silakan hubungi admin untuk mendaftarkan perangkat Anda.",
			});
			return false;
		}
		return true;
	};

	const startHadir = () => { if (!checkDevice()) return; setAbsensiMode("hadir"); setTujuanDinas(""); setShowCameraModal("masuk"); };
	const startWFH = () => { if (!checkDevice()) return; setAbsensiMode("wfh"); setTujuanDinas(""); setShowCameraModal("masuk"); };
	const startWFA = () => { if (!checkDevice()) return; setAbsensiMode("wfa"); setTujuanDinas(""); setShowCameraModal("masuk"); };
	const startDinasLuar = () => { if (!checkDevice()) return; setShowDinasLuarModal(true); };
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
			const popupType = type === "masuk" ? absensiMode : "pulang";
			const msgData = successMessages[popupType];
			if (msgData) {
				setSuccessPopup({ show: true, data: { title: msgData.title, message: msgData.message, image_path: msgData.image_path } });
			} else {
				showAlert({
					icon: "success",
					title: type === "masuk" ? `Absen ${modeLabels[absensiMode] || "Masuk"} Berhasil!` : "Absen Pulang Berhasil!",
					text: res.data.message,
					timer: 2500,
				});
			}
			setAbsensiMode("hadir");
			setTujuanDinas("");
		} catch (err) {
			const errMsg = err.response?.data?.message || "Gagal absensi";
			const isJarak = errMsg.toLowerCase().includes("meter");
			showAlert({
				icon: "error",
				title: isJarak ? "Kejauhan Cuy! 🏃‍♂️💨" : "Absensi Gagal",
				text: isJarak ? `😅 Kamu masih jauh dari kantor nih!\n\n📍 Maksimal 500 meter dari kantor ya!\n\n🦶 Coba deketin dulu baru absen lagi~ 🫡` : errMsg,
			});
		} finally {
			setClockLoading(false);
		}
	};

	const handleSubmitIzin = async (status, keterangan) => {
		try {
			const today = new Date().toISOString().split("T")[0];
			await api.post("/absensi/izin", { tanggal: today, status, keterangan });
			await fetchToday();
			await fetchHistory();
			setShowIzinModal(false);
			const msgData = successMessages[status];
			if (msgData) {
				setSuccessPopup({ show: true, data: { title: msgData.title, message: msgData.message, image_path: msgData.image_path } });
			} else {
				showAlert({ icon: "success", title: "Berhasil!", text: `${STATUS_LABELS[status]} berhasil disubmit`, timer: 2000 });
			}
		} catch (err) {
			showAlert({ icon: "error", title: "Gagal", text: err.response?.data?.message || "Gagal submit" });
		}
	};

	const prevMonth = () => {
		if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1); }
		else setSelectedMonth(m => m - 1);
	};
	const nextMonth = () => {
		if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1); }
		else setSelectedMonth(m => m + 1);
	};

	const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

	// ─── Loading State ──────────────────────────────────────
	if (loading) {
		return (
			<div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
				<motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
					<div className="relative w-16 h-16">
						<div className="absolute inset-0 rounded-full border-[3px] border-slate-200" />
						<div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-slate-600 animate-spin" />
					</div>
					<p className="text-slate-400 text-sm font-medium tracking-wide">Memuat presensi...</p>
				</motion.div>
			</div>
		);
	}

	// ─── PWA-only gate ──────────────────────────────────────
	if (!isPWA()) {
		return (
			<div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex items-center justify-center p-6">
				<motion.div {...scalePop} className="max-w-sm w-full text-center">
					<motion.div
						animate={{ y: [0, -6, 0] }}
						transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
						className="w-20 h-20 mx-auto bg-white rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-slate-200/80 border border-slate-100"
					>
						<FiSmartphone className="h-10 w-10 text-slate-600" />
					</motion.div>
					<h2 className="text-xl font-bold text-slate-800 mb-3">Buka di Aplikasi PWA</h2>
					<p className="text-slate-400 text-sm mb-8 leading-relaxed">Fitur presensi hanya tersedia melalui aplikasi PWA. Buka dari ikon di home screen Anda.</p>
					<div className="bg-white rounded-2xl p-5 text-left shadow-sm border border-slate-100">
						<p className="font-semibold text-slate-700 text-sm mb-3">Cara Install PWA:</p>
						<ol className="text-slate-500 text-sm space-y-2">
							<li className="flex gap-2"><span className="text-slate-800 font-bold">1.</span> Buka website di Chrome / Safari</li>
							<li className="flex gap-2"><span className="text-slate-800 font-bold">2.</span> Tap menu (⋮) atau Share</li>
							<li className="flex gap-2"><span className="text-slate-800 font-bold">3.</span> Pilih &quot;Add to Home Screen&quot;</li>
							<li className="flex gap-2"><span className="text-slate-800 font-bold">4.</span> Buka dari ikon di home screen</li>
						</ol>
					</div>
				</motion.div>
			</div>
		);
	}

	// ─── Not Eligible ───────────────────────────────────────
	if (eligible && !eligible.eligible) {
		return (
			<div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex items-center justify-center p-6">
				<motion.div {...scalePop} className="text-center max-w-sm">
					<motion.div
						animate={{ y: [0, -6, 0] }}
						transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
						className="w-20 h-20 mx-auto bg-white rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-slate-100"
					>
						<FiAlertCircle className="h-10 w-10 text-slate-300" />
					</motion.div>
					<h2 className="text-xl font-bold text-slate-800 mb-3">Fitur Tidak Tersedia</h2>
					<p className="text-slate-400 text-sm leading-relaxed">Fitur presensi hanya tersedia untuk PPPK Paruh Waktu, Tenaga Alih Daya, Tenaga Keamanan, atau Tenaga Kebersihan.</p>
				</motion.div>
			</div>
		);
	}

	const hasClockIn = !!todayData?.jam_masuk;
	const hasClockOut = !!todayData?.jam_keluar;
	const todayStatus = todayData?.status || null;
	const isNonHadir = todayStatus && ["izin", "sakit", "cuti"].includes(todayStatus) && !hasClockIn;
	const isDinasMode = todayStatus && ["dinas_luar", "wfh", "wfa"].includes(todayStatus);

	// Stepper: 0 = belum masuk, 1 = sudah masuk, 2 = selesai
	const step = hasClockOut ? 2 : hasClockIn ? 1 : 0;

	return (
		<div className="h-[100dvh] bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-20 relative overflow-hidden flex flex-col">
			{/* ─── Decorative Background ─────────────── */}
			<div className="absolute inset-0 pointer-events-none overflow-hidden">
				<div className="absolute -top-32 -right-32 w-80 h-80 bg-emerald-100/40 rounded-full blur-3xl" />
				<div className="absolute top-1/3 -left-24 w-64 h-64 bg-violet-100/30 rounded-full blur-3xl" />
				<div className="absolute bottom-1/4 right-0 w-56 h-56 bg-sky-100/30 rounded-full blur-3xl" />
			</div>

			{/* ─── White Header with Shadow ─────────────── */}
			<div className="bg-white/80 backdrop-blur-xl shadow-[0_4px_24px_rgba(15,23,42,0.06)] rounded-b-[2rem] relative z-10">
				<div className="px-4 pt-[calc(env(safe-area-inset-top,8px)+8px)] pb-4">
					<div className="max-w-lg mx-auto">
						{/* Profile Row */}
						<motion.div {...fadeUp} className="flex items-center gap-3 mb-4">
							<div className="w-10 h-10 rounded-xl ring-2 ring-slate-100 overflow-hidden bg-slate-100 shadow-sm">
								{avatarUrl ? (
									<img src={avatarUrl} alt={user.name} className="w-full h-full object-cover" />
								) : (
									<div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-600 to-slate-700">
										<span className="text-white font-bold text-sm">{user.name?.charAt(0) || "P"}</span>
									</div>
								)}
							</div>
							<div className="flex-1 min-w-0">
								<h1 className="text-slate-800 font-bold text-xs truncate">{eligible?.nama || user.name}</h1>
								<p className="text-slate-400 text-[10px] truncate">{eligible?.jabatan || eligible?.status_kepegawaian?.replace(/_/g, " ")}</p>
							</div>
							<div className="flex items-center gap-2">
								{eligible?.device_registered ? (
									<motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
										<LuShieldCheck className="h-5 w-5 text-emerald-500" />
									</motion.div>
								) : (
									<motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
										<FiAlertCircle className="h-5 w-5 text-red-400" />
									</motion.div>
								)}
							</div>
						</motion.div>

						{/* Live Clock */}
						<motion.div
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
							className="text-center"
						>
							<p className="text-slate-400 text-xs font-medium tracking-wide mb-1">
								{currentTime.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
							</p>
							<div className="text-slate-800 text-4xl font-mono font-black tracking-wider tabular-nums">
								{currentTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
								<span className="text-2xl text-slate-300 ml-1">
									{currentTime.toLocaleTimeString("id-ID", { second: "2-digit" }).slice(-2)}
								</span>
							</div>

							{/* Progress Stepper */}
							<div className="flex items-center justify-center gap-2.5 mt-3">
								{[0, 1, 2].map((s, i) => (
									<React.Fragment key={s}>
										{i > 0 && (
											<motion.div
												initial={{ scaleX: 0 }}
												animate={{ scaleX: 1 }}
												transition={{ delay: 0.3 + i * 0.15, type: "spring", stiffness: 200 }}
												className={`h-0.5 w-10 rounded-full origin-left transition-colors duration-700 ${step >= s ? "bg-emerald-500" : "bg-slate-200"}`}
											/>
										)}
										<motion.div
											initial={{ scale: 0 }}
											animate={{ scale: 1 }}
											transition={{ delay: 0.2 + i * 0.15, type: "spring", stiffness: 400 }}
											className={`w-3.5 h-3.5 rounded-full transition-colors duration-700 border-2 ${step >= s ? "bg-emerald-500 border-emerald-500 shadow-md shadow-emerald-200" : "bg-white border-slate-200"}`}
										/>
									</React.Fragment>
								))}
							</div>
							<div className="flex justify-between max-w-[210px] mx-auto mt-2">
								{["Masuk", "Aktif", "Pulang"].map((label, i) => (
									<span key={label} className={`text-[10px] font-semibold ${step >= i ? "text-emerald-500" : "text-slate-300"}`}>{label}</span>
								))}
							</div>
						</motion.div>
					</div>
				</div>


			</div>

			{/* ─── Main Content ────────────────────────────── */}
			<div className="max-w-lg mx-auto px-4 mt-3 relative z-20 flex-1 overflow-y-auto">

				{/* Device Warning */}
				{eligible && !eligible.device_registered && (
					<motion.div {...fadeUp} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex items-start gap-3 shadow-sm">
						<motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
							<FiSmartphone className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
						</motion.div>
						<div>
							<p className="text-sm font-semibold text-amber-700">Device Belum Terdaftar</p>
							<p className="text-xs text-amber-500 mt-1">Logout lalu login kembali untuk mendaftarkan device otomatis.</p>
							<p className="text-[10px] text-amber-400/60 mt-2 font-mono break-all">ID: {deviceId}</p>
						</div>
					</motion.div>
				)}

				{/* ═══ PRESENSI TAB ═══ */}
				{activeTab === "presensi" && (
					<>
						{/* ─── Today Status Card ─────────────────── */}
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.15 }}
					className="bg-white rounded-3xl p-7 mb-4 shadow-[0_2px_16px_rgba(15,23,42,0.06)] border border-slate-100 -mx-1"
				>
					{isNonHadir ? (
						<div className="text-center py-4">
							<motion.div
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								transition={{ type: "spring", stiffness: 300, damping: 18 }}
								className="mx-auto w-28 h-28 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 border-[3px] border-emerald-300 flex items-center justify-center shadow-lg shadow-emerald-100/60 mb-3"
							>
								<LuCircleCheckBig className="w-14 h-14 text-emerald-500" />
							</motion.div>
							<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
								<div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full ${STATUS_COLORS[todayStatus]?.bg} ring-1 ${STATUS_COLORS[todayStatus]?.ring} mb-2`}>
									<span className={`w-2 h-2 rounded-full ${STATUS_COLORS[todayStatus]?.dot}`} />
									<span className={`font-bold text-sm ${STATUS_COLORS[todayStatus]?.text}`}>{STATUS_LABELS[todayStatus]}</span>
								</div>
								<p className="text-sm font-bold text-slate-700 mt-1">Presensi sudah tercatat ✅</p>
								{todayData?.keterangan && <p className="text-xs text-slate-400 mt-1">{todayData.keterangan}</p>}
								<p className="text-[10px] text-slate-300 mt-2">Hanya bisa 1x presensi per hari</p>
							</motion.div>
						</div>
					) : (
						<>
							{/* Schedule Info */}
							{absensiSettings?.jam_masuk && (
								<div className="flex items-center justify-center gap-3 mb-3 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
									<span className="text-[10px] text-slate-400 flex items-center gap-1">
										<LuClock className="h-3 w-3" /> Jam Kerja: <span className="font-bold text-slate-600">{absensiSettings.jam_masuk}</span> — <span className="font-bold text-slate-600">{absensiSettings.jam_pulang}</span>
									</span>
									<span className="text-[10px] text-slate-300">|</span>
									<span className="text-[10px] text-slate-400">Toleransi: <span className="font-bold text-slate-600">{absensiSettings.toleransi_terlambat}m</span></span>
								</div>
							)}
							{/* Clock In / Out Grid */}
							<div className="grid grid-cols-2 gap-3 mb-4">
								{/* Masuk Card */}
								<motion.div
									{...cardPress}
									className={`p-3 rounded-xl border transition-all duration-300 ${hasClockIn ? "border-emerald-200 bg-emerald-50/60" : "border-slate-100 bg-slate-50/50"}`}
								>
									<div className="flex items-center gap-2 mb-1.5">
										<motion.div
											animate={hasClockIn ? { rotate: [0, -10, 10, 0] } : {}}
											transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
											className={`w-7 h-7 rounded-lg flex items-center justify-center ${hasClockIn ? "bg-emerald-100" : "bg-slate-100"}`}
										>
											<LuLogIn className={`h-3.5 w-3.5 ${hasClockIn ? "text-emerald-600" : "text-slate-300"}`} />
										</motion.div>
										<span className={`text-[11px] font-semibold uppercase tracking-wider ${hasClockIn ? "text-emerald-500" : "text-slate-300"}`}>Masuk</span>
									</div>
									<p className={`text-xl font-black tabular-nums ${hasClockIn ? "text-emerald-600" : "text-slate-200"}`}>
										{formatTime(todayData?.jam_masuk)}
									</p>
									{hasClockIn && telatMasukMenit > 0 && (
										<motion.span
											initial={{ scale: 0 }}
											animate={{ scale: 1 }}
											transition={{ type: "spring", stiffness: 400, damping: 15 }}
											className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 text-[9px] font-bold ring-1 ring-rose-200"
										>
											⏰ Telat {telatMasukMenit} menit
										</motion.span>
									)}
									{hasClockIn && telatMasukMenit === 0 && (
										<span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 text-[9px] font-bold ring-1 ring-emerald-200">
											✅ Tepat Waktu
										</span>
									)}
									{todayData?.jarak_masuk != null && (
										<p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
											<FiMapPin className="h-3 w-3" /> {todayData.jarak_masuk}m
										</p>
									)}
									{todayData?.tujuan_dinas && <p className="text-[10px] text-violet-500 mt-1 truncate flex items-center gap-1"><FiMapPin className="h-3 w-3" /> {todayData.tujuan_dinas}</p>}
									{isDinasMode && hasClockIn && (
										<span className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-lg text-[9px] font-bold ${STATUS_COLORS[todayStatus]?.bg} ${STATUS_COLORS[todayStatus]?.text}`}>
											{STATUS_LABELS[todayStatus]}
										</span>
									)}
								</motion.div>

								{/* Pulang Card */}
								<motion.div
									{...cardPress}
									className={`p-3 rounded-xl border transition-all duration-300 ${hasClockOut ? "border-sky-200 bg-sky-50/60" : "border-slate-100 bg-slate-50/50"}`}
								>
									<div className="flex items-center gap-2 mb-1.5">
										<motion.div
											animate={hasClockOut ? { rotate: [0, 10, -10, 0] } : {}}
											transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
											className={`w-7 h-7 rounded-lg flex items-center justify-center ${hasClockOut ? "bg-sky-100" : "bg-slate-100"}`}
										>
											<LuLogOut className={`h-3.5 w-3.5 ${hasClockOut ? "text-sky-600" : "text-slate-300"}`} />
										</motion.div>
										<span className={`text-[11px] font-semibold uppercase tracking-wider ${hasClockOut ? "text-sky-500" : "text-slate-300"}`}>Pulang</span>
									</div>
									<p className={`text-xl font-black tabular-nums ${hasClockOut ? "text-sky-600" : "text-slate-200"}`}>
										{formatTime(todayData?.jam_keluar)}
									</p>
									{hasClockOut && pulangLebiahAwalMenit > 0 && (
										<motion.span
											initial={{ scale: 0 }}
											animate={{ scale: 1 }}
											transition={{ type: "spring", stiffness: 400, damping: 15 }}
											className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 text-[9px] font-bold ring-1 ring-amber-200"
										>
											⚡ {pulangLebiahAwalMenit} menit lebih awal
										</motion.span>
									)}
									{hasClockOut && pulangLebiahAwalMenit === 0 && (
										<span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-sky-100 text-sky-600 text-[9px] font-bold ring-1 ring-sky-200">
											✅ Tepat Waktu
										</span>
									)}
									{todayData?.jarak_keluar != null && (
										<p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
											<FiMapPin className="h-3 w-3" /> {todayData.jarak_keluar}m
										</p>
									)}
								</motion.div>
							</div>

							{/* ─── Action Buttons ───────────────── */}
							{isNonHadir ? (
								/* ─── Already submitted Izin/Sakit/Cuti — done icon ─── */
								<motion.div
									initial={{ opacity: 0, scale: 0.8 }}
									animate={{ opacity: 1, scale: 1 }}
									transition={{ type: "spring", stiffness: 300, damping: 20 }}
									className="flex flex-col items-center gap-3"
								>
									<motion.div
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										transition={{ type: "spring", stiffness: 300, damping: 18 }}
										className="w-36 h-36 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 border-[3px] border-emerald-300 flex items-center justify-center shadow-lg shadow-emerald-100/60"
									>
										<LuCircleCheckBig className="w-20 h-20 text-emerald-500" />
									</motion.div>
									<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-center">
										<div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full ${STATUS_COLORS[todayStatus]?.bg} ring-1 ${STATUS_COLORS[todayStatus]?.ring} mb-2`}>
											<span className={`w-2 h-2 rounded-full ${STATUS_COLORS[todayStatus]?.dot}`} />
											<span className={`font-bold text-sm ${STATUS_COLORS[todayStatus]?.text}`}>{STATUS_LABELS[todayStatus]}</span>
										</div>
										<p className="text-sm font-bold text-slate-700">Presensi sudah tercatat ✅</p>
										{todayData?.keterangan && <p className="text-xs text-slate-400 mt-1">{todayData.keterangan}</p>}
										<p className="text-[10px] text-slate-300 mt-2">Hanya bisa 1x presensi per hari</p>
									</motion.div>
								</motion.div>
							) : !hasClockIn ? (
								<motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="space-y-3">
									{/* Primary: Absen Masuk */}
									<motion.button
										{...pressAnimation}
										onClick={startHadir}
										disabled={clockLoading}
										className="mx-auto flex flex-col items-center justify-center bg-transparent text-emerald-600 font-bold text-base disabled:opacity-50 cursor-pointer transition-all"
									>
										{clockLoading && absensiMode === "hadir" ? (
											<div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
										) : (
											<>
										<div className="rounded-full bg-emerald-50 border-2 border-emerald-200 shadow-lg shadow-emerald-100 p-2 flex items-center justify-center" style={{ width: '200px', height: '200px' }}>
											<Lottie animationData={bellAnim} loop autoplay style={{ height: '180px', width: '180px' }} />
										</div>
										<span className="text-xs font-bold tracking-wide text-emerald-600 mt-2">Absen Masuk</span>
											</>
										)}
									</motion.button>

									{/* Secondary: Dinas Luar / WFH / WFA */}
									<div className="grid grid-cols-3 gap-2">
										<motion.button
											{...pressAnimation}
											onClick={startDinasLuar}
											disabled={clockLoading}
											className="flex flex-col items-center gap-0 py-1 px-1 bg-violet-50 border border-violet-200 text-violet-600 rounded-xl font-semibold text-[10px] disabled:opacity-50 cursor-pointer hover:bg-violet-100 active:bg-violet-100 transition-colors"
										>
											<Lottie animationData={manWaitingCarAnim} loop autoplay className="h-10 w-10" />
											<span>Dinas Luar</span>
										</motion.button>
										<motion.button
											{...pressAnimation}
											onClick={startWFH}
											disabled={clockLoading}
											className="flex flex-col items-center gap-0 py-1 px-1 bg-teal-50 border border-teal-200 text-teal-600 rounded-xl font-semibold text-[10px] disabled:opacity-50 cursor-pointer hover:bg-teal-100 active:bg-teal-100 transition-colors"
										>
											<Lottie animationData={workFromHomeAnim} loop autoplay className="h-10 w-10" />
											<span>WFH</span>
										</motion.button>
										<motion.button
											{...pressAnimation}
											onClick={startWFA}
											disabled={clockLoading}
											className="flex flex-col items-center gap-0 py-1 px-1 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl font-semibold text-[10px] disabled:opacity-50 cursor-pointer hover:bg-indigo-100 active:bg-indigo-100 transition-colors"
										>
											<Lottie animationData={workFromAnywhereAnim} loop autoplay className="h-10 w-10" />
											<span>WFA</span>
										</motion.button>
									</div>

									{/* Izin / Sakit / Cuti */}
									<motion.button
										{...pressAnimation}
										onClick={() => setShowIzinModal(true)}
										className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-50 border border-amber-200 text-amber-600 rounded-xl font-semibold text-xs hover:bg-amber-100 active:bg-amber-100 transition-colors cursor-pointer"
									>
										<LuClipboardList className="h-4 w-4" /> Izin / Sakit / Cuti
									</motion.button>
								</motion.div>
							) : !hasClockOut ? (
								<motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-4">
									{/* ✅ Absen Masuk — done checkmark */}
									<motion.div
										initial={{ scale: 0.8, opacity: 0 }}
										animate={{ scale: 1, opacity: 1 }}
										transition={{ type: "spring", stiffness: 300, damping: 20 }}
										className="mx-auto flex flex-col items-center"
									>
										<motion.div
											initial={{ scale: 0 }}
											animate={{ scale: 1 }}
											transition={{ type: "spring", stiffness: 300, damping: 18 }}
											className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 border-[3px] border-emerald-300 flex items-center justify-center shadow-md shadow-emerald-100/60"
										>
											<LuCircleCheckBig className="w-12 h-12 text-emerald-500" />
										</motion.div>
										<span className="text-[10px] font-bold tracking-wide text-emerald-500 mt-1.5">Masuk {formatTime(todayData?.jam_masuk)} ✅</span>
										{isDinasMode && (
											<span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-lg text-[9px] font-bold ${STATUS_COLORS[todayStatus]?.bg} ${STATUS_COLORS[todayStatus]?.text} ring-1 ${STATUS_COLORS[todayStatus]?.ring}`}>
												{STATUS_LABELS[todayStatus]}
											</span>
										)}
										{telatMasukMenit > 0 && (
											<span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 text-[9px] font-bold ring-1 ring-rose-200">
												⏰ Telat {telatMasukMenit} menit
											</span>
										)}
									</motion.div>

									{/* Absen Pulang button — only show when jam_pulang reached */}
									{(() => {
										const jamPulangStr = absensiSettings?.jam_pulang || "16:00";
										const jamMasukStr = absensiSettings?.jam_masuk || "08:00";
										const [hp, mp] = jamPulangStr.split(":").map(Number);
										const [hm, mm] = jamMasukStr.split(":").map(Number);
										const now = currentTime;
										const nowMinutes = now.getHours() * 60 + now.getMinutes();
										const pulangMinutes = hp * 60 + mp;
										const masukMinutes = hm * 60 + mm;
										const isOvernightShift = pulangMinutes <= masukMinutes;

										let canPulang;
										let diffMin;
										if (isOvernightShift) {
											// Shift malam (misal 22:00 - 06:00): boleh pulang jika sudah lewat tengah malam DAN >= jam_pulang
											canPulang = nowMinutes < masukMinutes && nowMinutes >= pulangMinutes;
											if (!canPulang) {
												// hitung sisa waktu
												if (nowMinutes >= masukMinutes) {
													// masih di "malam ini", hitung ke tengah malam + jam_pulang
													diffMin = (1440 - nowMinutes) + pulangMinutes;
												} else {
													// sudah lewat tengah malam tapi belum jam pulang
													diffMin = pulangMinutes - nowMinutes;
												}
											}
										} else {
											// Shift normal (misal 08:00 - 16:00)
											canPulang = nowMinutes >= pulangMinutes;
											diffMin = pulangMinutes - nowMinutes;
										}

										if (canPulang) {
											return (
												<motion.button
													{...pressAnimation}
													onClick={startPulang}
													disabled={clockLoading}
													className="mx-auto flex flex-col items-center justify-center bg-transparent text-sky-600 font-bold text-base disabled:opacity-50 cursor-pointer transition-all"
												>
													{clockLoading ? (
														<div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
													) : (
														<>
															<div className="rounded-full bg-sky-50 border-2 border-sky-200 shadow-lg shadow-sky-100 p-2 flex items-center justify-center" style={{ width: '140px', height: '140px' }}>
																<Lottie animationData={bellAnim} loop autoplay style={{ height: '120px', width: '120px' }} />
															</div>
															<span className="text-xs font-bold tracking-wide text-sky-600 mt-2">Absen Pulang</span>
														</>
													)}
												</motion.button>
											);
										}

										// Waiting state — show countdown
										// Belum jam pulang — cukup tampilkan info masuk saja (tidak ada tombol/countdown)
										return null;
									})()}
								</motion.div>
							) : (
								<motion.div
									initial={{ opacity: 0, scale: 0.8 }}
									animate={{ opacity: 1, scale: 1 }}
									transition={{ type: "spring", stiffness: 300, damping: 20 }}
									className="flex flex-col items-center gap-3"
								>
									<motion.div
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										transition={{ type: "spring", stiffness: 300, damping: 18 }}
										className="w-36 h-36 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 border-[3px] border-emerald-300 flex items-center justify-center shadow-lg shadow-emerald-100/60"
									>
										<LuCircleCheckBig className="w-20 h-20 text-emerald-500" />
									</motion.div>
									<div className="text-center">
										<p className="text-sm font-black text-emerald-600">Presensi Hari Ini Selesai 🎉</p>
										{isDinasMode && (
											<span className={`inline-flex items-center gap-1 mt-1 px-3 py-1 rounded-lg text-[10px] font-bold ${STATUS_COLORS[todayStatus]?.bg} ${STATUS_COLORS[todayStatus]?.text} ring-1 ${STATUS_COLORS[todayStatus]?.ring}`}>
												{STATUS_LABELS[todayStatus]}
											</span>
										)}
										<p className="text-[10px] text-slate-400 mt-0.5">
											Masuk {formatTime(todayData?.jam_masuk)} · Pulang {formatTime(todayData?.jam_keluar)}
										</p>
										<div className="flex flex-wrap justify-center gap-1 mt-1">
											{telatMasukMenit > 0 && (
												<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 text-[9px] font-bold ring-1 ring-rose-200">
													⏰ Masuk telat {telatMasukMenit}m
												</span>
											)}
											{pulangLebiahAwalMenit > 0 && (
												<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 text-[9px] font-bold ring-1 ring-amber-200">
													⚡ Pulang {pulangLebiahAwalMenit}m lebih awal
												</span>
											)}
										</div>
									</div>
								</motion.div>
							)}
						</>
					)}
				</motion.div>
				</>
				)}

				{/* ═══ RIWAYAT TAB ═══ */}
				{activeTab === "riwayat" && (
					<>
				{/* ─── Summary Stats ────────────────────── */}
				<motion.div
					initial={{ opacity: 0, y: 24 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
					className="grid grid-cols-4 gap-2 mb-5"
				>
					{["hadir", "dinas_luar", "wfh", "wfa", "izin", "sakit", "cuti", "alpha"].map((key, i) => (
						<motion.div
							key={key}
							{...chipPress}
							custom={i}
							initial="hidden"
							animate="visible"
							variants={listItemVariants}
							className={`${STATUS_COLORS[key].bg} border border-slate-100 rounded-2xl p-3 text-center cursor-default shadow-sm`}
						>
							<p className={`text-2xl font-black ${STATUS_COLORS[key].text}`}>
								{history.summary?.[key] || 0}
							</p>
							<p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{STATUS_LABELS[key]}</p>
						</motion.div>
					))}
				</motion.div>

				{/* ─── History Section ──────────────────── */}
				<motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
					{/* Month Nav */}
					<div className="flex items-center justify-between mb-4">
						<motion.button {...pressAnimation} onClick={prevMonth} className="p-2.5 rounded-xl bg-white border border-slate-100 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer shadow-sm">
							<FiChevronLeft className="h-5 w-5 text-slate-500" />
						</motion.button>
						<h3 className="font-bold text-slate-700 text-sm tracking-wide">
							{monthNames[selectedMonth - 1]} {selectedYear}
						</h3>
						<motion.button {...pressAnimation} onClick={nextMonth} className="p-2.5 rounded-xl bg-white border border-slate-100 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer shadow-sm">
							<FiChevronRight className="h-5 w-5 text-slate-500" />
						</motion.button>
					</div>

					{/* History List */}
					<div className="space-y-2.5">
						{history.records?.length === 0 ? (
							<div className="bg-white border border-slate-100 rounded-2xl p-10 text-center shadow-sm">
								<motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}>
									<FiCalendar className="h-10 w-10 text-slate-200 mx-auto mb-3" />
								</motion.div>
								<p className="text-slate-400 text-sm">Belum ada data presensi bulan ini</p>
							</div>
						) : (
							history.records?.map((record, i) => {
								const sc = STATUS_COLORS[record.status] || STATUS_COLORS.alpha;
								const tgl = new Date(record.tanggal);
								return (
									<motion.div
										key={record.id}
										custom={i}
										initial="hidden"
										animate="visible"
										variants={listItemVariants}
										className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow shadow-sm"
									>
										<div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center flex-shrink-0">
											<span className="text-lg font-black text-slate-700 leading-none">{tgl.getDate()}</span>
											<span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">
												{tgl.toLocaleDateString("id-ID", { weekday: "short" })}
											</span>
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 mb-1 flex-wrap">
												<span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${sc.bg} ${sc.text}`}>
													<span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
													{STATUS_LABELS[record.status]}
												</span>
												{record.jarak_masuk != null && (
													<span className="text-[10px] text-slate-300 flex items-center gap-0.5">
														<FiMapPin className="h-2.5 w-2.5" />{record.jarak_masuk}m
													</span>
												)}
											</div>
											{record.tujuan_dinas && <p className="text-xs text-violet-500 truncate flex items-center gap-1"><FiMapPin className="h-3 w-3" /> {record.tujuan_dinas}</p>}
											{record.keterangan && <p className="text-xs text-slate-400 truncate">{record.keterangan}</p>}
										</div>
										<div className="text-right flex-shrink-0">
											{record.jam_masuk && <p className="text-sm font-bold text-slate-600 tabular-nums">{formatTime(record.jam_masuk)}</p>}
											{record.jam_keluar ? (
												<p className="text-xs text-slate-400 tabular-nums">{formatTime(record.jam_keluar)}</p>
											) : record.jam_masuk && new Date(record.tanggal).toDateString() !== new Date().toDateString() && !['izin', 'sakit', 'cuti'].includes(record.status) ? (
												<span className="text-[9px] text-amber-500 font-bold">⚠️ Lupa pulang</span>
											) : null}
										</div>
									</motion.div>
								);
							})
						)}
					</div>
				</motion.div>
				</>
				)}
			</div>

			{/* ─── Modals ──────────────────────────────────── */}
			<AnimatePresence>
				{showDinasLuarModal && <DinasLuarModal onClose={() => setShowDinasLuarModal(false)} onConfirm={handleDinasLuarConfirm} />}
			</AnimatePresence>
			<AnimatePresence>
				{showCameraModal && <CameraGPSModal type={showCameraModal} onClose={() => setShowCameraModal(null)} onSubmit={handleAbsensiSubmit} />}
			</AnimatePresence>
			<AnimatePresence>
				{showIzinModal && <IzinModal onClose={() => setShowIzinModal(false)} onSubmit={handleSubmitIzin} />}
			</AnimatePresence>

			{/* Success Popup */}
			<AbsensiSuccessPopup
				show={successPopup.show}
				data={successPopup.data}
				onClose={() => setSuccessPopup({ show: false, data: null })}
			/>

			<style>{`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
			{/* z-index for modals */}
			<div className="relative z-50" />
		</div>
	);
};

// ═══════════════════════════════════════════════════════════════
// ─── Dinas Luar Modal ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
const DinasLuarModal = ({ onClose, onConfirm }) => {
	const [tujuan, setTujuan] = useState("");

	const handleConfirm = () => {
		if (!tujuan.trim()) {
			showAlert({ icon: "warning", title: "Tujuan Wajib Diisi", text: "Silakan isi tujuan dinas luar terlebih dahulu sebelum melanjutkan." });
			return;
		}
		onConfirm(tujuan.trim());
	};

	return (
		<>
			<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={onClose} />
			<motion.div {...slideUp} className="fixed bottom-0 left-0 right-0 z-50">
				<div className="bg-white rounded-t-3xl shadow-[0_-8px_32px_rgba(15,23,42,0.12)]">
					<div className="max-w-lg mx-auto p-6">
						<div className="flex justify-center mb-5">
							<div className="w-12 h-1.5 bg-slate-200 rounded-full" />
						</div>
						<div className="flex items-center gap-3 mb-6">
							<div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center border border-violet-100 overflow-hidden">
								<Lottie animationData={manWaitingCarAnim} loop autoplay className="h-20 w-20" />
							</div>
							<div>
								<h3 className="text-lg font-bold text-slate-800">Dinas Luar</h3>
								<p className="text-xs text-slate-400">Isi tujuan sebelum absen</p>
							</div>
						</div>
						<div className="mb-6">
							<label className="block text-sm font-semibold text-slate-500 mb-2">Tujuan Dinas Luar <span className="text-red-400">*</span></label>
							<div className="relative">
								<input
									type="text"
									value={tujuan}
									onChange={(e) => setTujuan(e.target.value)}
									onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
									placeholder="Contoh: Rapat di Kecamatan Cibinong"
									className="w-full px-4 py-3.5 pr-14 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-300 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 transition-all"
									autoFocus
								/>
								<motion.button
									whileTap={{ scale: 0.85 }}
									onClick={handleConfirm}
									className={`absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${tujuan.trim() ? 'bg-gradient-to-r from-violet-500 to-purple-500 shadow-md shadow-violet-200' : 'bg-slate-200'}`}
								>
									<FiChevronRight className={`h-4 w-4 ${tujuan.trim() ? 'text-white' : 'text-slate-400'}`} />
								</motion.button>
							</div>
							<p className="text-[10px] text-slate-300 mt-2">GPS otomatis tercatat saat selfie</p>
						</div>
						<div className="flex gap-3">
							<motion.button {...pressAnimation} onClick={onClose} className="flex-1 py-3.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl font-semibold hover:bg-slate-100 active:bg-slate-100 transition-colors cursor-pointer">
								Batal
							</motion.button>
							<motion.button {...pressAnimation} onClick={handleConfirm} className="flex-1 py-3.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-violet-200 cursor-pointer active:shadow-sm transition-shadow">
								Lanjut ke Kamera
							</motion.button>
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
	const [capturedPhoto, setCapturedPhoto] = useState(null);
	const [gpsCoords, setGpsCoords] = useState(null);
	const [gpsLoading, setGpsLoading] = useState(true);
	const [gpsError, setGpsError] = useState(null);
	const [cameraError, setCameraError] = useState(null);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		let mounted = true;
		const startCamera = async () => {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
					audio: false,
				});
				if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
				streamRef.current = stream;
				if (videoRef.current) videoRef.current.srcObject = stream;
			} catch {
				if (mounted) setCameraError("Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.");
			}
		};
		startCamera();
		return () => { mounted = false; streamRef.current?.getTracks().forEach(t => t.stop()); };
	}, []);

	useEffect(() => {
		if (!navigator.geolocation) { setGpsError("GPS tidak tersedia"); setGpsLoading(false); return; }
		const watchId = navigator.geolocation.watchPosition(
			(pos) => {
				setGpsCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy });
				setGpsLoading(false);
				setGpsError(null);
			},
			(err) => {
				setGpsError(err.code === 1 ? "Izin lokasi ditolak." : err.code === 2 ? "GPS tidak tersedia." : "Timeout GPS.");
				setGpsLoading(false);
			},
			{ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
		);
		return () => navigator.geolocation.clearWatch(watchId);
	}, []);

	const capturePhoto = () => {
		const video = videoRef.current;
		const canvas = canvasRef.current;
		if (!video || !canvas) return;
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		const ctx = canvas.getContext("2d");
		ctx.translate(canvas.width, 0);
		ctx.scale(-1, 1);
		ctx.drawImage(video, 0, 0);
		setCapturedPhoto(canvas.toDataURL("image/jpeg", 0.7));
		streamRef.current?.getTracks().forEach(t => t.stop());
	};

	const retakePhoto = async () => {
		setCapturedPhoto(null);
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
				audio: false,
			});
			streamRef.current = stream;
			if (videoRef.current) videoRef.current.srcObject = stream;
		} catch {
			setCameraError("Tidak dapat mengakses kamera");
		}
	};

	const handleSubmit = async () => {
		if (!capturedPhoto || !gpsCoords) return;
		setSubmitting(true);
		await onSubmit(type, capturedPhoto, gpsCoords);
		setSubmitting(false);
	};

	const handleClose = () => {
		streamRef.current?.getTracks().forEach(t => t.stop());
		onClose();
	};

	const isMasuk = type === "masuk";

	return (
		<>
			<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50" onClick={handleClose} />
			<motion.div
				initial={{ opacity: 0, scale: 0.9, y: 40 }}
				animate={{ opacity: 1, scale: 1, y: 0 }}
				exit={{ opacity: 0, scale: 0.9, y: 40 }}
				transition={{ type: "spring", stiffness: 300, damping: 25 }}
				className="fixed inset-0 z-50 flex items-center justify-center p-4"
			>
				<div className="bg-white border border-slate-100 rounded-3xl shadow-[0_8px_40px_rgba(15,23,42,0.12)] max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
					{/* Header */}
					<div className={`px-5 py-4 ${isMasuk ? "bg-gradient-to-r from-emerald-500 to-green-500" : "bg-gradient-to-r from-sky-500 to-blue-500"}`}>
						<div className="flex items-center justify-between">
							<h3 className="font-bold text-lg text-white">{isMasuk ? "Absen Masuk" : "Absen Pulang"}</h3>
							<motion.button {...pressAnimation} onClick={handleClose} className="p-1.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer">
								<FiXCircle className="h-6 w-6 text-white/80" />
							</motion.button>
						</div>
					</div>

					<div className="p-5">
						{/* Camera */}
						<div className="relative rounded-2xl overflow-hidden bg-slate-900 mb-4 aspect-[4/3]">
							{cameraError ? (
								<div className="absolute inset-0 flex items-center justify-center text-white text-center p-4">
									<div>
										<FiCamera className="h-12 w-12 mx-auto mb-3 opacity-30" />
										<p className="text-sm text-white/50">{cameraError}</p>
									</div>
								</div>
							) : capturedPhoto ? (
								<img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
							) : (
								<video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
							)}
							<canvas ref={canvasRef} className="hidden" />
						</div>

						{/* Capture/Retake */}
						{!cameraError && (
							<div className="flex justify-center mb-4">
								{!capturedPhoto ? (
									<motion.button
										{...pressAnimation}
										onClick={capturePhoto}
										className="w-16 h-16 rounded-full bg-slate-100 border-[3px] border-slate-200 shadow-lg flex items-center justify-center hover:border-slate-300 transition-colors cursor-pointer"
									>
										<div className="w-11 h-11 rounded-full bg-red-500 shadow-md shadow-red-200" />
									</motion.button>
								) : (
									<motion.button {...pressAnimation} onClick={retakePhoto} className="px-5 py-2.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl text-sm font-semibold hover:bg-slate-100 active:bg-slate-100 cursor-pointer transition-colors">
										Ulangi Foto
									</motion.button>
								)}
							</div>
						)}

						{/* GPS */}
						<div className={`rounded-xl p-3 mb-4 border ${gpsError ? "bg-red-50 border-red-200" : gpsCoords ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
							<div className="flex items-center gap-2">
								<FiMapPin className={`h-4 w-4 ${gpsError ? "text-red-400" : gpsCoords ? "text-emerald-500" : "text-slate-300"}`} />
								{gpsLoading ? (
									<div className="flex items-center gap-2">
										<div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
										<span className="text-sm text-slate-400">Mengambil lokasi GPS...</span>
									</div>
								) : gpsError ? (
									<span className="text-sm text-red-500">{gpsError}</span>
								) : (
									<div className="flex-1">
										<span className="text-sm text-emerald-600 font-medium">Lokasi terdeteksi</span>
										<span className="text-[10px] text-slate-300 ml-2">~{Math.round(gpsCoords.accuracy)}m</span>
									</div>
								)}
							</div>
						</div>

						{/* Submit */}
						<motion.button
							{...pressAnimation}
							onClick={handleSubmit}
							disabled={!capturedPhoto || !gpsCoords || submitting}
							className={`w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 cursor-pointer active:shadow-sm transition-shadow ${
								isMasuk ? "bg-gradient-to-r from-emerald-500 to-green-500 shadow-emerald-200" : "bg-gradient-to-r from-sky-500 to-blue-500 shadow-sky-200"
							}`}
						>
							{submitting ? (
								<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
							) : (
								<><FiCheckCircle className="h-5 w-5" /> {isMasuk ? "Konfirmasi Masuk" : "Konfirmasi Pulang"}</>
							)}
						</motion.button>
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

	const options = [
		{ value: "izin", label: "Izin", icon: LuFileText, color: "amber" },
		{ value: "sakit", label: "Sakit", icon: LuHeartPulse, color: "rose" },
		{ value: "cuti", label: "Cuti", icon: LuCalendarOff, color: "sky" },
	];

	const handleSubmit = async () => {
		if (!status) return;
		setLoading(true);
		await onSubmit(status, keterangan);
		setLoading(false);
	};

	const colorMap = {
		amber: { activeBg: "bg-amber-50", activeBorder: "border-amber-300", activeText: "text-amber-600", activeIcon: "text-amber-500" },
		rose: { activeBg: "bg-rose-50", activeBorder: "border-rose-300", activeText: "text-rose-600", activeIcon: "text-rose-500" },
		sky: { activeBg: "bg-sky-50", activeBorder: "border-sky-300", activeText: "text-sky-600", activeIcon: "text-sky-500" },
	};

	return (
		<>
			<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={onClose} />
			<motion.div {...slideUp} className="fixed bottom-0 left-0 right-0 z-50">
				<div className="bg-white rounded-t-3xl shadow-[0_-8px_32px_rgba(15,23,42,0.12)]">
					<div className="max-w-lg mx-auto p-6">
						<div className="flex justify-center mb-5">
							<div className="w-12 h-1.5 bg-slate-200 rounded-full" />
						</div>
						<h3 className="text-lg font-bold text-slate-800 mb-5">Pengajuan Izin / Sakit / Cuti</h3>

						<div className="grid grid-cols-3 gap-3 mb-5">
							{options.map((opt) => {
								const Icon = opt.icon;
								const isSelected = status === opt.value;
								const cm = colorMap[opt.color];
								return (
									<motion.button
										key={opt.value}
										{...pressAnimation}
										onClick={() => setStatus(opt.value)}
										className={`p-4 rounded-2xl border-2 text-center transition-all cursor-pointer ${
											isSelected ? `${cm.activeBorder} ${cm.activeBg} shadow-md` : "border-slate-100 bg-slate-50 hover:bg-slate-100"
										}`}
									>
										<motion.div animate={isSelected ? { scale: [1, 1.15, 1] } : {}} transition={{ repeat: Infinity, duration: 2 }}>
											<Icon className={`h-6 w-6 mx-auto mb-1.5 ${isSelected ? cm.activeIcon : "text-slate-300"}`} />
										</motion.div>
										<span className={`text-sm font-bold ${isSelected ? cm.activeText : "text-slate-400"}`}>{opt.label}</span>
									</motion.button>
								);
							})}
						</div>

						<textarea
							value={keterangan}
							onChange={(e) => setKeterangan(e.target.value)}
							placeholder="Keterangan (opsional)..."
							rows={3}
							className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 resize-none transition-all"
						/>

						<div className="flex gap-3 mt-5">
							<motion.button {...pressAnimation} onClick={onClose} className="flex-1 py-3.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl font-semibold hover:bg-slate-100 active:bg-slate-100 transition-colors cursor-pointer">
								Batal
							</motion.button>
							<motion.button
								{...pressAnimation}
								onClick={handleSubmit}
								disabled={!status || loading}
								className="flex-1 py-3.5 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-xl font-bold shadow-lg shadow-slate-300 disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer active:shadow-sm transition-shadow"
							>
								{loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Submit"}
							</motion.button>
						</div>
					</div>
				</div>
			</motion.div>
		</>
	);
};

export default AbsensiPage;
