// src/pages/pegawai/AbsensiPage.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
	FiClock, FiCheckCircle, FiXCircle, FiCalendar,
	FiChevronLeft, FiChevronRight, FiAlertCircle, FiMapPin,
	FiCamera, FiSmartphone, FiWifiOff,
} from "react-icons/fi";
import { LuLogIn, LuLogOut, LuClipboardList, LuFileText, LuHeartPulse, LuCalendarOff } from "react-icons/lu";
import api from "../../api";
import { getAvatarUrl } from "../../utils/avatarUtils";
import Swal from "sweetalert2";

const STATUS_COLORS = {
	hadir: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
	izin: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
	sakit: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
	alpha: { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" },
	cuti: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
	dinas_luar: { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
	wfh: { bg: "bg-teal-100", text: "text-teal-700", dot: "bg-teal-500" },
	wfa: { bg: "bg-indigo-100", text: "text-indigo-700", dot: "bg-indigo-500" },
};

const STATUS_LABELS = {
	hadir: "Hadir", izin: "Izin", sakit: "Sakit", alpha: "Alpha", cuti: "Cuti",
	dinas_luar: "Dinas Luar", wfh: "WFH", wfa: "WFA",
};

const formatTime = (timeStr) => {
	if (!timeStr) return "-";
	const d = new Date(timeStr);
	return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
};

// Check if running as PWA (standalone mode)
const isPWA = () => {
	return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
};

// Get or create device ID
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

const AbsensiPage = () => {
	const [user] = useState(JSON.parse(localStorage.getItem("user") || "{}"));
	const [todayData, setTodayData] = useState(null);
	const [history, setHistory] = useState({ records: [], summary: {} });
	const [loading, setLoading] = useState(true);
	const [clockLoading, setClockLoading] = useState(false);
	const [eligible, setEligible] = useState(null);
	const [currentTime, setCurrentTime] = useState(new Date());
	const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
	const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
	const [showIzinModal, setShowIzinModal] = useState(false);
	const [showCameraModal, setShowCameraModal] = useState(null); // 'masuk' | 'keluar' | null
	const [showDinasLuarModal, setShowDinasLuarModal] = useState(false);
	const [absensiMode, setAbsensiMode] = useState('hadir');
	const [tujuanDinas, setTujuanDinas] = useState('');
	const [gpsStatus, setGpsStatus] = useState({ loading: false, coords: null, error: null });
	const avatarUrl = getAvatarUrl(user.avatar);
	const deviceId = useRef(getDeviceId()).current;

	// Live clock
	useEffect(() => {
		const timer = setInterval(() => setCurrentTime(new Date()), 1000);
		return () => clearInterval(timer);
	}, []);

	// Check eligibility & auto-register device
	useEffect(() => {
		const check = async () => {
			try {
				const res = await api.get("/absensi/check-eligible");
				const data = res.data.data;
				setEligible(data);

				// Auto-register device if eligible but device not registered yet
				if (data?.eligible && !data?.device_registered && deviceId) {
					try {
						await api.post("/absensi/register-device", { device_id: deviceId });
						// Re-check eligibility after registration
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

	// Fetch today's absensi
	const fetchToday = useCallback(async () => {
		try {
			const res = await api.get("/absensi/today");
			setTodayData(res.data.data);
		} catch (err) {
			console.error("Error fetching today:", err);
		}
	}, []);

	// Fetch history
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

	// Check device before absensi
	const checkDevice = () => {
		if (!eligible?.device_registered) {
			Swal.fire({
				icon: "warning",
				title: "Device Belum Terdaftar",
				text: "Hubungi admin untuk mendaftarkan perangkat Anda sebelum bisa melakukan absensi.",
				confirmButtonColor: "#f97316",
			});
			return false;
		}
		return true;
	};

	// Absen masuk hadir (di kantor)
	const startHadir = () => {
		if (!checkDevice()) return;
		setAbsensiMode("hadir");
		setTujuanDinas("");
		setShowCameraModal("masuk");
	};

	// Absen WFH
	const startWFH = () => {
		if (!checkDevice()) return;
		setAbsensiMode("wfh");
		setTujuanDinas("");
		setShowCameraModal("masuk");
	};

	// Absen WFA
	const startWFA = () => {
		if (!checkDevice()) return;
		setAbsensiMode("wfa");
		setTujuanDinas("");
		setShowCameraModal("masuk");
	};

	// Absen Dinas Luar — buka modal tujuan dulu
	const startDinasLuar = () => {
		if (!checkDevice()) return;
		setShowDinasLuarModal(true);
	};

	// Setelah isi tujuan dinas luar, lanjut ke camera
	const handleDinasLuarConfirm = (tujuan) => {
		setAbsensiMode("dinas_luar");
		setTujuanDinas(tujuan);
		setShowDinasLuarModal(false);
		setShowCameraModal("masuk");
	};

	// Absen pulang
	const startPulang = () => {
		if (!checkDevice()) return;
		setShowCameraModal("keluar");
	};

	// Handle submitted photo + GPS from camera modal
	const handleAbsensiSubmit = async (type, foto, coords) => {
		setShowCameraModal(null);
		setClockLoading(true);
		try {
			const endpoint = type === "masuk" ? "/absensi/clock-in" : "/absensi/clock-out";
			const body = {
				foto,
				latitude: coords.latitude,
				longitude: coords.longitude,
				device_id: deviceId,
			};
			if (type === "masuk") {
				body.mode = absensiMode;
				if (absensiMode === "dinas_luar") body.tujuan_dinas = tujuanDinas;
			}
			const res = await api.post(endpoint, body);
			await fetchToday();
			await fetchHistory();
			const modeLabels = { hadir: "Masuk", dinas_luar: "Dinas Luar", wfh: "WFH", wfa: "WFA" };
			Swal.fire({
				icon: "success",
				title: type === "masuk" ? `Absen ${modeLabels[absensiMode] || "Masuk"} Berhasil!` : "Absen Pulang Berhasil!",
				text: res.data.message,
				timer: 2500,
				showConfirmButton: false,
			});
			// Reset mode
			setAbsensiMode("hadir");
			setTujuanDinas("");
		} catch (err) {
			Swal.fire({ icon: "error", title: "Gagal", text: err.response?.data?.message || "Gagal absensi" });
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
			Swal.fire({ icon: "success", title: "Berhasil!", text: `${STATUS_LABELS[status]} berhasil disubmit`, timer: 2000, showConfirmButton: false });
		} catch (err) {
			Swal.fire({ icon: "error", title: "Gagal", text: err.response?.data?.message || "Gagal submit" });
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

	if (loading) {
		return (
			<div className="flex justify-center items-center min-h-screen">
				<div className="flex flex-col items-center gap-3">
					<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
					<p className="text-gray-500 text-sm">Memuat data absensi...</p>
				</div>
			</div>
		);
	}

	// PWA-only check
	if (!isPWA()) {
		return (
			<div className="min-h-screen bg-gray-50 p-4">
				<div className="max-w-lg mx-auto pt-12 text-center">
					<div className="w-20 h-20 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-4">
						<FiSmartphone className="h-10 w-10 text-orange-500" />
					</div>
					<h2 className="text-xl font-bold text-gray-800 mb-2">Buka di Aplikasi PWA</h2>
					<p className="text-gray-500 mb-6">Fitur absensi hanya dapat digunakan melalui aplikasi PWA. Silakan buka aplikasi dari ikon di home screen perangkat Anda.</p>
					<div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-left text-sm text-gray-600">
						<p className="font-semibold text-orange-700 mb-2">Cara Install PWA:</p>
						<ol className="list-decimal list-inside space-y-1">
							<li>Buka website di Chrome / Safari</li>
							<li>Tap menu (⋮) atau Share</li>
							<li>Pilih "Add to Home Screen"</li>
							<li>Buka dari ikon di home screen</li>
						</ol>
					</div>
				</div>
			</div>
		);
	}

	if (eligible && !eligible.eligible) {
		return (
			<div className="min-h-screen bg-gray-50 p-4">
				<div className="max-w-lg mx-auto pt-12 text-center">
					<div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
						<FiAlertCircle className="h-10 w-10 text-gray-400" />
					</div>
					<h2 className="text-xl font-bold text-gray-800 mb-2">Fitur Tidak Tersedia</h2>
					<p className="text-gray-500">Fitur absensi hanya tersedia untuk pegawai dengan status PPPK Paruh Waktu, Tenaga Alih Daya, Tenaga Keamanan, atau Tenaga Kebersihan.</p>
				</div>
			</div>
		);
	}

	const hasClockIn = !!todayData?.jam_masuk;
	const hasClockOut = !!todayData?.jam_keluar;
	const todayStatus = todayData?.status || null;
	const isNonHadir = todayStatus && ['izin', 'sakit', 'cuti'].includes(todayStatus) && !hasClockIn;
	const isDinasMode = todayStatus && ['dinas_luar', 'wfh', 'wfa'].includes(todayStatus);

	return (
		<div className="min-h-screen bg-gradient-to-b from-orange-50 to-gray-50 pb-24">
			{/* Header */}
			<div className="bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 px-5 pt-12 pb-8 rounded-b-3xl shadow-lg">
				<div className="max-w-lg mx-auto">
					<div className="flex items-center gap-4 mb-6">
						<div className="w-14 h-14 rounded-2xl ring-2 ring-white/30 overflow-hidden bg-white/20">
							{avatarUrl ? (
								<img src={avatarUrl} alt={user.name} className="w-full h-full object-cover" />
							) : (
								<div className="w-full h-full flex items-center justify-center">
									<span className="text-white font-bold text-xl">{user.name?.charAt(0) || "P"}</span>
								</div>
							)}
						</div>
						<div className="flex-1">
							<h1 className="text-white font-bold text-lg">{eligible?.nama || user.name}</h1>
							<p className="text-orange-100 text-sm">{eligible?.jabatan || eligible?.status_kepegawaian?.replace(/_/g, " ")}</p>
						</div>
						{/* Device status indicator */}
						<div className={`w-3 h-3 rounded-full ${eligible?.device_registered ? "bg-emerald-400" : "bg-red-400"}`} title={eligible?.device_registered ? "Device terdaftar" : "Device belum terdaftar"} />
					</div>

					{/* Live Clock */}
					<div className="text-center">
						<div className="text-white/60 text-sm font-medium mb-1">
							{currentTime.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
						</div>
						<div className="text-white text-5xl font-mono font-bold tracking-wider">
							{currentTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
						</div>
					</div>
				</div>
			</div>

			<div className="max-w-lg mx-auto px-4 -mt-6">
				{/* Device Not Registered Warning */}
				{eligible && !eligible.device_registered && (
				<div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
					<FiSmartphone className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
					<div>
						<p className="text-sm font-semibold text-orange-700">Device Belum Terdaftar</p>
						<p className="text-xs text-orange-600 mt-1">Silakan logout lalu login kembali dari perangkat ini untuk mendaftarkan device secara otomatis.</p>
						<p className="text-[10px] text-orange-400 mt-2 font-mono break-all">Device ID: {deviceId}</p>
					</div>
				</div>
				)}

				{/* Today Status Card */}
				<div className="bg-white rounded-2xl shadow-lg p-5 mb-5">
					{isNonHadir ? (
						<div className="text-center py-4">
							<div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${STATUS_COLORS[todayStatus]?.bg} ${STATUS_COLORS[todayStatus]?.text} font-semibold text-sm mb-3`}>
								<div className={`w-2 h-2 rounded-full ${STATUS_COLORS[todayStatus]?.dot}`} />
								{STATUS_LABELS[todayStatus]}
							</div>
							{todayData?.keterangan && (
								<p className="text-gray-500 text-sm">{todayData.keterangan}</p>
							)}
						</div>
					) : (
						<>
							{/* Clock In / Out Status */}
							<div className="grid grid-cols-2 gap-4 mb-5">
								<div className={`p-4 rounded-xl border-2 ${hasClockIn ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-gray-50"}`}>
									<div className="flex items-center gap-2 mb-2">
										<LuLogIn className={`h-5 w-5 ${hasClockIn ? "text-emerald-600" : "text-gray-400"}`} />
										<span className="text-xs font-semibold text-gray-500 uppercase">Masuk</span>
									</div>
									<p className={`text-2xl font-bold ${hasClockIn ? "text-emerald-700" : "text-gray-300"}`}>
										{formatTime(todayData?.jam_masuk)}
									</p>
									{todayData?.jarak_masuk != null && (
										<p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
											<FiMapPin className="h-3 w-3" /> {todayData.jarak_masuk}m dari kantor
										</p>
									)}
									{todayData?.tujuan_dinas && (
										<p className="text-[10px] text-purple-500 mt-1 truncate">📍 {todayData.tujuan_dinas}</p>
									)}
									{isDinasMode && hasClockIn && (
										<span className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[9px] font-semibold ${STATUS_COLORS[todayStatus]?.bg} ${STATUS_COLORS[todayStatus]?.text}`}>
											{STATUS_LABELS[todayStatus]}
										</span>
									)}
								</div>
								<div className={`p-4 rounded-xl border-2 ${hasClockOut ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-gray-50"}`}>
									<div className="flex items-center gap-2 mb-2">
										<LuLogOut className={`h-5 w-5 ${hasClockOut ? "text-blue-600" : "text-gray-400"}`} />
										<span className="text-xs font-semibold text-gray-500 uppercase">Pulang</span>
									</div>
									<p className={`text-2xl font-bold ${hasClockOut ? "text-blue-700" : "text-gray-300"}`}>
										{formatTime(todayData?.jam_keluar)}
									</p>
									{todayData?.jarak_keluar != null && (
										<p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
											<FiMapPin className="h-3 w-3" /> {todayData.jarak_keluar}m dari kantor
										</p>
									)}
								</div>
							</div>

							{/* Action Buttons */}
							{!hasClockIn ? (
								<div className="space-y-3">
									{/* Primary: Absen Masuk di Kantor */}
									<button
										onClick={startHadir}
										disabled={clockLoading}
										className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-bold text-base shadow-lg shadow-emerald-500/30 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 transition-all active:scale-[0.98]"
									>
										{clockLoading && absensiMode === "hadir" ? (
											<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
										) : (
											<><span className="text-lg">🏢</span> Absen Masuk</>                                    
										)}
									</button>

									{/* Secondary: Dinas Luar, WFH, WFA */}
									<div className="grid grid-cols-3 gap-2">
										<button
											onClick={startDinasLuar}
											disabled={clockLoading}
											className="flex flex-col items-center gap-1.5 py-3 px-2 bg-purple-50 border-2 border-purple-200 text-purple-700 rounded-xl font-semibold text-xs hover:bg-purple-100 hover:border-purple-300 disabled:opacity-50 transition-all active:scale-[0.97]"
										>
											<span className="text-xl">🚗</span>
											<span>Dinas Luar</span>
										</button>
										<button
											onClick={startWFH}
											disabled={clockLoading}
											className="flex flex-col items-center gap-1.5 py-3 px-2 bg-teal-50 border-2 border-teal-200 text-teal-700 rounded-xl font-semibold text-xs hover:bg-teal-100 hover:border-teal-300 disabled:opacity-50 transition-all active:scale-[0.97]"
										>
											<span className="text-xl">🏠</span>
											<span>WFH</span>
										</button>
										<button
											onClick={startWFA}
											disabled={clockLoading}
											className="flex flex-col items-center gap-1.5 py-3 px-2 bg-indigo-50 border-2 border-indigo-200 text-indigo-700 rounded-xl font-semibold text-xs hover:bg-indigo-100 hover:border-indigo-300 disabled:opacity-50 transition-all active:scale-[0.97]"
										>
											<span className="text-xl">🌍</span>
											<span>WFA</span>
										</button>
									</div>

									{/* Izin / Sakit / Cuti */}
									{!isNonHadir && (
										<button
											onClick={() => setShowIzinModal(true)}
											className="w-full flex items-center justify-center gap-2 py-3 bg-amber-50 text-amber-700 border-2 border-amber-200 rounded-xl font-semibold text-sm hover:bg-amber-100 transition-colors"
										>
											<LuClipboardList className="h-4 w-4" /> Izin / Sakit / Cuti
										</button>
									)}
								</div>
							) : !hasClockOut ? (
								<button
									onClick={startPulang}
									disabled={clockLoading}
									className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold text-base shadow-lg shadow-blue-500/30 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all active:scale-[0.98]"
								>
									{clockLoading ? (
										<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
									) : (
										<><FiCamera className="h-5 w-5" /> Absen Pulang</>
									)}
								</button>
							) : (
								<div className="w-full flex items-center justify-center gap-2 py-4 bg-gray-100 text-gray-500 rounded-xl font-semibold">
									<FiCheckCircle className="h-5 w-5 text-emerald-500" />
									Absensi hari ini selesai
								</div>
							)}
						</>
					)}
				</div>

				{/* Summary Stats */}
				<div className="grid grid-cols-4 gap-2 mb-5">
					{['hadir', 'dinas_luar', 'wfh', 'wfa', 'izin', 'sakit', 'cuti', 'alpha'].map((key) => (
						<div key={key} className={`${STATUS_COLORS[key].bg} rounded-xl p-3 text-center`}>
							<p className={`text-xl font-bold ${STATUS_COLORS[key].text}`}>
								{history.summary?.[key] || 0}
							</p>
							<p className="text-[10px] font-medium text-gray-500 uppercase">{STATUS_LABELS[key]}</p>
						</div>
					))}
				</div>

				{/* Month Navigation */}
				<div className="flex items-center justify-between mb-4">
					<button onClick={prevMonth} className="p-2 rounded-xl hover:bg-white transition-colors">
						<FiChevronLeft className="h-5 w-5 text-gray-600" />
					</button>
					<h3 className="font-bold text-gray-800">
						{monthNames[selectedMonth - 1]} {selectedYear}
					</h3>
					<button onClick={nextMonth} className="p-2 rounded-xl hover:bg-white transition-colors">
						<FiChevronRight className="h-5 w-5 text-gray-600" />
					</button>
				</div>

				{/* History List */}
				<div className="space-y-2">
					{history.records?.length === 0 ? (
						<div className="bg-white rounded-xl p-8 text-center">
							<FiCalendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
							<p className="text-gray-500 text-sm">Belum ada data absensi bulan ini</p>
						</div>
					) : (
						history.records?.map((record) => {
							const sc = STATUS_COLORS[record.status] || STATUS_COLORS.alpha;
							const tgl = new Date(record.tanggal);
							return (
								<div key={record.id} className="bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm">
									<div className="w-12 h-12 rounded-xl bg-gray-50 flex flex-col items-center justify-center flex-shrink-0">
										<span className="text-lg font-bold text-gray-800 leading-none">{tgl.getDate()}</span>
										<span className="text-[10px] text-gray-400 uppercase">
											{tgl.toLocaleDateString("id-ID", { weekday: "short" })}
										</span>
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-1 flex-wrap">
											<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${sc.bg} ${sc.text}`}>
												<div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
												{STATUS_LABELS[record.status]}
											</span>
											{record.jarak_masuk != null && (
												<span className="text-[10px] text-gray-400 flex items-center gap-0.5">
													<FiMapPin className="h-2.5 w-2.5" />{record.jarak_masuk}m
												</span>
											)}
										</div>
										{record.tujuan_dinas && (
											<p className="text-xs text-purple-500 truncate">📍 {record.tujuan_dinas}</p>
										)}
										{record.keterangan && (
											<p className="text-xs text-gray-400 truncate">{record.keterangan}</p>
										)}
									</div>
									<div className="text-right flex-shrink-0">
										{record.jam_masuk && (
											<p className="text-sm font-semibold text-gray-700">{formatTime(record.jam_masuk)}</p>
										)}
										{record.jam_keluar && (
											<p className="text-xs text-gray-400">{formatTime(record.jam_keluar)}</p>
										)}
									</div>
								</div>
							);
						})
					)}
				</div>
			</div>

			{/* Dinas Luar Modal — input tujuan */}
			{showDinasLuarModal && (
				<DinasLuarModal
					onClose={() => setShowDinasLuarModal(false)}
					onConfirm={handleDinasLuarConfirm}
				/>
			)}

			{/* Camera & GPS Modal */}
			{showCameraModal && (
				<CameraGPSModal
					type={showCameraModal}
					onClose={() => setShowCameraModal(null)}
					onSubmit={handleAbsensiSubmit}
				/>
			)}

			{/* Izin Modal */}
			{showIzinModal && <IzinModal onClose={() => setShowIzinModal(false)} onSubmit={handleSubmitIzin} />}
		</div>
	);
};

// ─── Dinas Luar Modal (input tujuan) ─────────────────────────
const DinasLuarModal = ({ onClose, onConfirm }) => {
	const [tujuan, setTujuan] = useState("");

	const handleConfirm = () => {
		if (!tujuan.trim()) {
			Swal.fire({ icon: "warning", title: "Tujuan Wajib Diisi", text: "Silakan isi tujuan dinas luar Anda." });
			return;
		}
		onConfirm(tujuan.trim());
	};

	return (
		<>
			<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
			<div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 animate-slideUp">
				<div className="max-w-lg mx-auto p-6">
					<div className="flex justify-center mb-4">
						<div className="w-12 h-1.5 bg-gray-300 rounded-full" />
					</div>

					<div className="flex items-center gap-3 mb-5">
						<div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
							<span className="text-2xl">🚗</span>
						</div>
						<div>
							<h3 className="text-lg font-bold text-gray-800">Dinas Luar</h3>
							<p className="text-xs text-gray-500">Isi tujuan dinas luar Anda sebelum absen</p>
						</div>
					</div>

					<div className="mb-5">
						<label className="block text-sm font-semibold text-gray-700 mb-2">Tujuan Dinas Luar <span className="text-red-500">*</span></label>
						<input
							type="text"
							value={tujuan}
							onChange={(e) => setTujuan(e.target.value)}
							placeholder="Contoh: Rapat di Kecamatan Cibinong"
							className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-400 focus:outline-none"
							autoFocus
						/>
						<p className="text-[10px] text-gray-400 mt-1.5">Lokasi GPS akan otomatis tercatat saat foto selfie</p>
					</div>

					<div className="flex gap-3">
						<button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200">
							Batal
						</button>
						<button onClick={handleConfirm} className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:from-purple-600 hover:to-purple-700 active:scale-[0.98]">
							Lanjut ke Kamera
						</button>
					</div>
				</div>
			</div>
			<style>{`
				@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
				.animate-slideUp { animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
			`}</style>
		</>
	);
};

// ─── Camera + GPS Modal ──────────────────────────────────────
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

	// Start camera
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
				if (videoRef.current) {
					videoRef.current.srcObject = stream;
				}
			} catch (err) {
				if (mounted) setCameraError("Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.");
			}
		};
		startCamera();
		return () => {
			mounted = false;
			streamRef.current?.getTracks().forEach(t => t.stop());
		};
	}, []);

	// Get GPS
	useEffect(() => {
		if (!navigator.geolocation) {
			setGpsError("GPS tidak tersedia di perangkat ini");
			setGpsLoading(false);
			return;
		}
		const watchId = navigator.geolocation.watchPosition(
			(pos) => {
				setGpsCoords({
					latitude: pos.coords.latitude,
					longitude: pos.coords.longitude,
					accuracy: pos.coords.accuracy,
				});
				setGpsLoading(false);
				setGpsError(null);
			},
			(err) => {
				setGpsError(
					err.code === 1 ? "Izin lokasi ditolak. Aktifkan GPS dan izinkan akses lokasi." :
					err.code === 2 ? "Lokasi tidak tersedia. Pastikan GPS aktif." :
					"Waktu permintaan lokasi habis. Coba lagi."
				);
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
		// Mirror the image for selfie
		ctx.translate(canvas.width, 0);
		ctx.scale(-1, 1);
		ctx.drawImage(video, 0, 0);
		const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
		setCapturedPhoto(dataUrl);
		// Stop camera after capture
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
			<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" onClick={handleClose} />
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
				<div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-slideUp">
					{/* Header */}
					<div className={`px-5 py-4 ${isMasuk ? "bg-emerald-600" : "bg-blue-600"} text-white`}>
						<div className="flex items-center justify-between">
							<h3 className="font-bold text-lg">
								{isMasuk ? "Absen Masuk" : "Absen Pulang"}
							</h3>
							<button onClick={handleClose} className="p-1 rounded-full hover:bg-white/20">
								<FiXCircle className="h-6 w-6" />
							</button>
						</div>
					</div>

					<div className="p-5">
						{/* Camera / Photo */}
						<div className="relative rounded-2xl overflow-hidden bg-black mb-4 aspect-[4/3]">
							{cameraError ? (
								<div className="absolute inset-0 flex items-center justify-center text-white text-center p-4">
									<div>
										<FiCamera className="h-12 w-12 mx-auto mb-3 opacity-50" />
										<p className="text-sm">{cameraError}</p>
									</div>
								</div>
							) : capturedPhoto ? (
								<img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
							) : (
								<video
									ref={videoRef}
									autoPlay
									playsInline
									muted
									className="w-full h-full object-cover"
									style={{ transform: "scaleX(-1)" }}
								/>
							)}
							<canvas ref={canvasRef} className="hidden" />
						</div>

						{/* Capture / Retake Button */}
						{!cameraError && (
							<div className="flex justify-center mb-4">
								{!capturedPhoto ? (
									<button
										onClick={capturePhoto}
										className="w-16 h-16 rounded-full bg-white border-4 border-gray-300 shadow-lg flex items-center justify-center hover:border-orange-400 transition-colors active:scale-95"
									>
										<div className="w-12 h-12 rounded-full bg-red-500" />
									</button>
								) : (
									<button
										onClick={retakePhoto}
										className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200"
									>
										Ulangi Foto
									</button>
								)}
							</div>
						)}

						{/* GPS Status */}
						<div className={`rounded-xl p-3 mb-4 ${gpsError ? "bg-red-50 border border-red-200" : gpsCoords ? "bg-emerald-50 border border-emerald-200" : "bg-gray-50 border border-gray-200"}`}>
							<div className="flex items-center gap-2">
								<FiMapPin className={`h-4 w-4 ${gpsError ? "text-red-500" : gpsCoords ? "text-emerald-600" : "text-gray-400"}`} />
								{gpsLoading ? (
									<div className="flex items-center gap-2">
										<div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
										<span className="text-sm text-gray-500">Mengambil lokasi GPS...</span>
									</div>
								) : gpsError ? (
									<span className="text-sm text-red-600">{gpsError}</span>
								) : (
									<div className="flex-1">
										<span className="text-sm text-emerald-700 font-medium">Lokasi terdeteksi</span>
										<span className="text-[10px] text-gray-400 ml-2">akurasi ~{Math.round(gpsCoords.accuracy)}m</span>
									</div>
								)}
							</div>
						</div>

						{/* Submit */}
						<button
							onClick={handleSubmit}
							disabled={!capturedPhoto || !gpsCoords || submitting}
							className={`w-full py-4 rounded-xl font-bold text-white text-base flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all active:scale-[0.98] ${
								isMasuk
									? "bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/30"
									: "bg-gradient-to-r from-blue-500 to-blue-600 shadow-blue-500/30"
							}`}
						>
							{submitting ? (
								<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
							) : (
								<>
									<FiCheckCircle className="h-5 w-5" />
									{isMasuk ? "Konfirmasi Absen Masuk" : "Konfirmasi Absen Pulang"}
								</>
							)}
						</button>
					</div>
				</div>
			</div>
			<style>{`
				@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
				.animate-slideUp { animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
			`}</style>
		</>
	);
};

// ─── Izin Modal ──────────────────────────────────────────────
const IzinModal = ({ onClose, onSubmit }) => {
	const [status, setStatus] = useState("");
	const [keterangan, setKeterangan] = useState("");
	const [loading, setLoading] = useState(false);

	const options = [
		{ value: "izin", label: "Izin", icon: LuFileText, color: "amber" },
		{ value: "sakit", label: "Sakit", icon: LuHeartPulse, color: "red" },
		{ value: "cuti", label: "Cuti", icon: LuCalendarOff, color: "blue" },
	];

	const handleSubmit = async () => {
		if (!status) return;
		setLoading(true);
		await onSubmit(status, keterangan);
		setLoading(false);
	};

	return (
		<>
			<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
			<div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 animate-slideUp">
				<div className="max-w-lg mx-auto p-6">
					<div className="flex justify-center mb-4">
						<div className="w-12 h-1.5 bg-gray-300 rounded-full" />
					</div>
					<h3 className="text-lg font-bold text-gray-800 mb-4">Pengajuan Izin / Sakit / Cuti</h3>

					<div className="grid grid-cols-3 gap-3 mb-5">
						{options.map((opt) => {
							const Icon = opt.icon;
							const isSelected = status === opt.value;
							return (
								<button
									key={opt.value}
									onClick={() => setStatus(opt.value)}
									className={`p-4 rounded-xl border-2 text-center transition-all ${
										isSelected
											? `border-${opt.color}-400 bg-${opt.color}-50 shadow-md`
											: "border-gray-200 hover:border-gray-300"
									}`}
								>
									<Icon className={`h-6 w-6 mx-auto mb-1 ${isSelected ? `text-${opt.color}-600` : "text-gray-400"}`} />
									<span className={`text-sm font-semibold ${isSelected ? `text-${opt.color}-700` : "text-gray-600"}`}>{opt.label}</span>
								</button>
							);
						})}
					</div>

					<textarea
						value={keterangan}
						onChange={(e) => setKeterangan(e.target.value)}
						placeholder="Keterangan (opsional)..."
						rows={3}
						className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-sm"
					/>

					<div className="flex gap-3 mt-5">
						<button onClick={onClose} className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50">
							Batal
						</button>
						<button
							onClick={handleSubmit}
							disabled={!status || loading}
							className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold shadow-lg shadow-orange-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
						>
							{loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Submit"}
						</button>
					</div>
				</div>
			</div>
			<style>{`
				@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
				.animate-slideUp { animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
			`}</style>
		</>
	);
};

export default AbsensiPage;
