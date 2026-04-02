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
				const res = await api.get("/absensi/check-eligible");
				const data = res.data.data;
				setEligible(data);
				if (data?.eligible && !data?.device_registered && deviceId) {
					try {
						await api.post("/absensi/register-device", { device_id: deviceId });
						const res2 = await api.get("/absensi/check-eligible");
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
			showAlert({ icon: "warning", title: "Perangkat Belum Terdaftar", text: "Silakan hubungi admin untuk mendaftarkan perangkat Anda." });
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
			const isJarak = errMsg.toLowerCase().includes("meter");
			showAlert({
				icon: "error",
				title: isJarak ? "Kejauhan Cuy! 🏃‍♂️💨" : "Absensi Gagal",
				text: isJarak ? `😅 Kamu masih jauh dari kantor nih!\n\n📍 Maksimal 500 meter dari kantor ya!\n\n🦶 Coba deketin dulu baru absen lagi~ 🫡` : errMsg,
			});
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
		<div className="h-[100dvh] bg-white flex flex-col overflow-hidden pb-20">

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
								/* ── Completed (Masuk + Pulang) ── */
								<div className="flex-1 flex flex-col items-center justify-center">
									<motion.div
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										transition={{ type: "spring", stiffness: 300, damping: 18 }}
										className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-3"
									>
										<LuCircleCheckBig className="w-10 h-10 text-emerald-500" />
									</motion.div>
									<p className="text-base font-bold text-slate-800 mb-1">Selesai 🎉</p>
									{isDinasMode && (
										<span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold mb-1.5 ${STATUS_COLORS[todayStatus]?.bg} ${STATUS_COLORS[todayStatus]?.text}`}>
											{STATUS_LABELS[todayStatus]}
										</span>
									)}
									{/* Time pills */}
									<div className="flex items-center gap-2 mt-1">
										<div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-lg">
											<LuLogIn className="h-3 w-3 text-emerald-500" />
											<span className="text-xs font-bold text-emerald-600 tabular-nums">{fmt(todayData?.jam_masuk)}</span>
										</div>
										<span className="text-slate-200">→</span>
										<div className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 rounded-lg">
											<LuLogOut className="h-3 w-3 text-sky-500" />
											<span className="text-xs font-bold text-sky-600 tabular-nums">{fmt(todayData?.jam_keluar)}</span>
										</div>
									</div>
									{/* Tags */}
									<div className="flex flex-wrap justify-center gap-1 mt-2">
										{telatMasukMenit > 0 && (
											<span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-500 text-[9px] font-bold">Telat {telatMasukMenit}m</span>
										)}
										{pulangLebiahAwalMenit > 0 && (
											<span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-500 text-[9px] font-bold">{pulangLebiahAwalMenit}m lebih awal</span>
										)}
									</div>
								</div>
							) : hasIn ? (
								/* ── Waiting for Pulang ── */
								<div className="flex-1 flex flex-col items-center justify-center">
									<p className="text-xs text-emerald-600 font-bold tabular-nums mb-1">Masuk {fmt(todayData?.jam_masuk)}</p>
									{isDinasMode && (
										<span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold mb-2 ${STATUS_COLORS[todayStatus]?.bg} ${STATUS_COLORS[todayStatus]?.text}`}>
											{STATUS_LABELS[todayStatus]}
										</span>
									)}
									{telatMasukMenit > 0 && (
										<span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-500 text-[9px] font-bold mb-2">Telat {telatMasukMenit}m</span>
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
										<div className="flex flex-col items-center">
											<LuCircleCheckBig className="w-14 h-14 text-emerald-400 mb-2" />
											<p className="text-sm font-bold text-slate-600">Menunggu jam pulang</p>
										</div>
									)}
								</div>
							) : (
								/* ── Belum Absen — Action Buttons ── */
								<div className="flex-1 flex flex-col items-center justify-center gap-3">
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
				<div className="bg-white rounded-t-3xl shadow-xl">
					<div className="max-w-lg mx-auto p-5">
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
	];

	const submit = async () => { if (!status) return; setLoading(true); await onSubmit(status, keterangan); setLoading(false); };

	return (
		<>
			<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={onClose} />
			<motion.div {...slideUp} className="fixed bottom-0 left-0 right-0 z-50">
				<div className="bg-white rounded-t-3xl shadow-xl">
					<div className="max-w-lg mx-auto p-5">
						<div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
						<h3 className="font-bold text-slate-800 mb-3">Izin / Sakit / Cuti</h3>
						<div className="grid grid-cols-3 gap-2 mb-3">
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
