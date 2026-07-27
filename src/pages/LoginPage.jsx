import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api";
import { FiEye, FiEyeOff, FiLoader, FiAlertCircle, FiLock, FiClock, FiMapPin } from "react-icons/fi";
import LoginImageSlider from "../components/login/LoginImageSlider";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

// Ambil posisi GPS sebagai Promise (lokasi WAJIB saat login).
const getCurrentPosition = (options = {}) =>
	new Promise((resolve, reject) => {
		if (!("geolocation" in navigator)) {
			reject(new Error("Perangkat tidak mendukung lokasi"));
			return;
		}
		navigator.geolocation.getCurrentPosition(resolve, reject, {
			enableHighAccuracy: true,
			timeout: 12000,
			maximumAge: 60000,
			...options,
		});
	});

const LoginPage = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState(null);
	// Pesan dari interceptor saat sesi dihentikan paksa (mis. role akun berubah).
	// Dibaca sekali lalu dibuang supaya tidak muncul lagi di kunjungan berikutnya.
	const [authNotice] = useState(() => {
		try {
			const notice = sessionStorage.getItem("authNotice");
			if (notice) sessionStorage.removeItem("authNotice");
			return notice;
		} catch {
			return null;
		}
	});
	const [emailError, setEmailError] = useState(null);
	const [passwordError, setPasswordError] = useState(null);
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();
	const [showPassword, setShowPassword] = useState(false);
	const { login } = useAuth();
	const [lockoutUntil, setLockoutUntil] = useState(null);
	const [lockoutRemaining, setLockoutRemaining] = useState(0);
	// Lokasi wajib saat login
	const [coords, setCoords] = useState(null);
	const [locationStatus, setLocationStatus] = useState('unknown'); // unknown | granted | denied | error
	const [gettingLocation, setGettingLocation] = useState(false);

	useEffect(() => {
		// Cek status izin lokasi (jika browser mendukung Permissions API).
		if (navigator.permissions?.query) {
			navigator.permissions.query({ name: 'geolocation' }).then((res) => {
				if (res.state === 'granted') setLocationStatus('granted');
				else if (res.state === 'denied') setLocationStatus('denied');
				res.onchange = () => {
					if (res.state === 'denied') setLocationStatus('denied');
				};
			}).catch(() => {});
		}
	}, []);

	// Minta izin & ambil lokasi. Mengembalikan koordinat bila berhasil.
	const handleRequestLocation = async () => {
		setGettingLocation(true);
		setError(null);
		try {
			const pos = await getCurrentPosition();
			const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
			setCoords(c);
			setLocationStatus('granted');
			toast.success('Lokasi aktif!', { duration: 3000 });
			return c;
		} catch (err) {
			const denied = err?.code === 1; // PERMISSION_DENIED
			setLocationStatus(denied ? 'denied' : 'error');
			setError(denied
				? 'Izin lokasi ditolak. Aktifkan lokasi di pengaturan browser/HP lalu coba lagi.'
				: 'Gagal mendapatkan lokasi. Pastikan GPS/lokasi menyala lalu coba lagi.');
			return null;
		} finally {
			setGettingLocation(false);
		}
	};

	// Countdown timer for lockout
	useEffect(() => {
		if (!lockoutUntil) return;

		const tick = () => {
			const remaining = Math.max(0, lockoutUntil - Date.now());
			setLockoutRemaining(remaining);
			if (remaining <= 0) {
				setLockoutUntil(null);
				setLockoutRemaining(0);
				setError(null);
			}
		};

		tick();
		const interval = setInterval(tick, 1000);
		return () => clearInterval(interval);
	}, [lockoutUntil]);

	const isLockedOut = lockoutUntil && lockoutRemaining > 0;
	const lockoutMinutes = Math.floor(lockoutRemaining / 60000);
	const lockoutSeconds = Math.floor((lockoutRemaining % 60000) / 1000);

	const handleLogin = async (e) => {
		e.preventDefault();

		// Block login if currently locked out
		if (isLockedOut) {
			setError(`Terlalu banyak percobaan login. Coba lagi dalam ${lockoutMinutes}:${lockoutSeconds.toString().padStart(2, '0')}`);
			return;
		}

		setLoading(true);
		setError(null);
		setEmailError(null);
		setPasswordError(null);

		// Lokasi WAJIB: pastikan koordinat tersedia sebelum login.
		let position = coords;
		if (!position) {
			position = await handleRequestLocation();
			if (!position) { setLoading(false); return; }
		}

		try {
			// Get device ID for auto-registration
			let deviceId = localStorage.getItem('dpmd_device_id');
			if (!deviceId) {
				deviceId = crypto.randomUUID ? crypto.randomUUID() : 
					'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
						const r = (Math.random() * 16) | 0;
						return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
					});
				localStorage.setItem('dpmd_device_id', deviceId);
			}

			// Login to Express backend (sertakan koordinat lokasi wajib)
			const response = await api.post("/auth/login", {
				email,
				password,
				device_id: deviceId,
				latitude: position.latitude,
				longitude: position.longitude,
			});

			const newUser = response.data.data.user;
			const expressToken = response.data.data.token;

			console.log('Login successful');

			// Reset lockout on successful login
			setLockoutUntil(null);
			setLockoutRemaining(0);

			// Save token and user using context
			login(newUser, null, expressToken);

			// Navigate based on role
			if (newUser.role === "desa") {
				navigate("/desa/dashboard");
			} else if (newUser.role === "admin_desa") {
				navigate("/admin-desa/akun");
			} else if (newUser.role === "kecamatan") {
				navigate("/kecamatan/dashboard");
			} else if (newUser.role === "dinas_terkait" || newUser.role === "verifikator_dinas") {
				navigate("/dinas/dashboard");
			} else if (newUser.role === "bpjs") {
				navigate("/bpjs/dashboard");
			} else if (newUser.role === "superadmin") {
				navigate("/superadmin/dashboard");
			} else if (["pegawai", "ketua_tim", "kepala_bidang", "kepala_dinas", "sekretaris_dinas", "bendahara"].includes(newUser.role)) {
				// All DPMD internal staff go to unified /dpmd route
				navigate("/dpmd/dashboard");
			} else {
				navigate("/dashboard");
			}
		} catch (error) {
			console.error("Login gagal:", error.response?.data || error.message);
			
			// Handle rate limit (429) response
			if (error.response?.status === 429) {
				const rateLimit = error.response.data?.rate_limit;
				if (rateLimit?.retry_after_ms) {
					setLockoutUntil(Date.now() + rateLimit.retry_after_ms);
				} else {
					setLockoutUntil(Date.now() + 5 * 60 * 1000);
				}
				setError(error.response.data?.message || 'Terlalu banyak percobaan login. Silakan coba lagi dalam 5 menit.');
			} else if (error.response?.data?.code === 'LOCATION_REQUIRED') {
				setLocationStatus('error');
				setCoords(null);
				setError(error.response.data?.message || 'Lokasi wajib diaktifkan untuk login.');
			} else if (error.response?.data?.error_type === 'email_not_found') {
				setEmailError('Email salah atau tidak ditemukan');
			} else if (error.response?.data?.error_type === 'wrong_password') {
				setPasswordError('Password salah');
			} else {
				setError(error.response?.data?.message || "Login gagal. Silakan coba lagi.");
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 sm:px-6 lg:flex lg:items-center lg:justify-center lg:px-8">
			<div className="relative z-10 flex w-full max-w-6xl overflow-hidden rounded-[1.75rem] border border-white/80 bg-white shadow-2xl shadow-slate-950/10 lg:min-h-[680px]">
				{/* Left Side - Image Slider */}
				<div className="relative hidden w-[52%] overflow-hidden bg-slate-950 lg:block">
					<LoginImageSlider />
					<div className="absolute inset-0 z-10 bg-slate-950/60"></div>
					<div className="absolute inset-0 z-10 flex flex-col justify-end p-10 text-white">
						<img
							src="/logo-bogor.png"
							alt="Logo Kabupaten Bogor"
							className="h-16 w-fit rounded-2xl bg-white/95 p-2 shadow-lg"
						/>
						<p className="mt-8 w-fit rounded-full border border-white/25 bg-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/85">
							Sistem Informasi Terpadu
						</p>
						<h1 className="mt-4 max-w-lg text-4xl font-bold leading-tight text-white">
							Dinas Pemberdayaan Masyarakat dan Desa
						</h1>
						<h2 className="mt-3 text-lg font-semibold text-white/80">
							Kabupaten Bogor
						</h2>
					</div>
				</div>

				{/* Right Side - Login Form */}
				<div className="w-full px-5 py-7 sm:px-8 sm:py-10 lg:w-[48%] lg:px-12">
					<div className="mb-7 flex items-center gap-3 lg:hidden">
						<img
							src="/logo-bogor.png"
							alt="Logo Kabupaten Bogor"
							className="h-12 w-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm"
						/>
						<div>
							<p className="text-sm font-semibold text-slate-950">DPMD Kabupaten Bogor</p>
							<p className="text-xs text-slate-500">Sistem Informasi Terpadu</p>
						</div>
					</div>
					<p className="text-sm font-semibold text-[rgb(var(--color-secondary))]">Masuk akun</p>
					<h2 className="mt-2 text-3xl font-bold tracking-normal text-slate-950 sm:text-4xl">Selamat datang</h2>
					<p className="mt-3 text-sm leading-6 text-slate-600">Gunakan akun DPMD, desa, kecamatan, atau dinas terkait untuk melanjutkan.</p>
					{authNotice && (
						<div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
							<p className="text-sm font-medium text-amber-900">{authNotice}</p>
						</div>
					)}

					{/* Hanya lokasi — izin notifikasi tidak lagi diminta di sini; langganan
					    push dibentuk setelah login oleh layout masing-masing peran. */}
					<div className="mt-7 grid gap-3">
						<div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
									<FiMapPin className="h-5 w-5" />
								</div>
								<p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">Lokasi</p>
							{locationStatus === 'granted' ? (
									<span className="flex-shrink-0 rounded-full bg-emerald-100 px-2.5 py-1.5 text-[11px] font-semibold leading-none text-emerald-700">
									✓ Siap
								</span>
							) : (
								<button
									type="button"
									onClick={handleRequestLocation}
									disabled={gettingLocation}
										className="flex flex-shrink-0 items-center rounded-xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
								>
									{gettingLocation ? <FiLoader className="h-4 w-4 animate-spin" /> : 'Aktifkan'}
								</button>
							)}
							</div>
							<p className="mt-3 text-xs leading-relaxed text-slate-500">
								{locationStatus === 'denied'
									? 'Izin lokasi belum aktif.'
									: 'Wajib saat login.'}
							</p>
						</div>
					</div>

					<form onSubmit={handleLogin} className="mt-8 space-y-5">
						<div>
							<label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
								Email
							</label>
							<input
								type="email"
								id="email"
								placeholder="nama@domain.go.id"
								className={`w-full rounded-2xl border bg-white px-4 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60 ${emailError ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-[rgb(var(--color-primary))] focus:ring-slate-200'}`}
								value={email}
								onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
								required
							/>
							{emailError && (
								<p className="mt-2 flex items-center gap-1.5 text-sm text-red-600">
									<FiAlertCircle className="h-4 w-4 flex-shrink-0" />
									{emailError}
								</p>
							)}
						</div>
						<div>
							<label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
								Password
							</label>
							<div className="relative">
								<input
									type={showPassword ? "text" : "password"}
									id="password"
									placeholder="Masukkan password"
									className={`w-full rounded-2xl border bg-white px-4 py-3.5 pr-12 text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60 ${passwordError ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-[rgb(var(--color-primary))] focus:ring-slate-200'}`}
									value={password}
									onChange={(e) => { setPassword(e.target.value); setPasswordError(null); }}
									required
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-500 transition hover:text-slate-800 focus:outline-none"
									aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
								>
									{showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
								</button>
							</div>
							{passwordError && (
								<p className="mt-2 flex items-center gap-1.5 text-sm text-red-600">
									<FiAlertCircle className="h-4 w-4 flex-shrink-0" />
									{passwordError}
								</p>
							)}
						</div>
						<button
							type="submit"
							disabled={loading || isLockedOut || locationStatus !== 'granted'}
							className={`flex min-h-12 w-full items-center justify-center rounded-2xl px-5 py-3.5 text-sm font-bold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-65 ${
								isLockedOut ? 'bg-red-500 shadow-red-500/20' : 'bg-[rgb(var(--color-primary))] shadow-slate-950/15 hover:bg-slate-800 disabled:bg-slate-400'
							}`}
						>
							{loading ? (
								<FiLoader className="h-5 w-5 animate-spin" />
							) : isLockedOut ? (
								<span className="flex items-center gap-2">
									<FiLock className="h-4 w-4" />
									Dikunci {lockoutMinutes}:{lockoutSeconds.toString().padStart(2, '0')}
								</span>
							) : locationStatus !== 'granted' ? (
								"Aktifkan Lokasi Dulu"
							) : (
								"Masuk"
							)}
						</button>

						{/* Lockout Warning Banner */}
						{isLockedOut && (
							<div className="rounded-2xl border border-red-200 bg-red-50 p-4">
								<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
									<div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-100">
										<FiLock className="h-5 w-5 text-red-600" />
									</div>
									<div className="flex-1">
										<p className="text-sm font-semibold text-red-800">Akun dikunci sementara</p>
										<p className="mt-0.5 text-xs leading-5 text-red-600">Terlalu banyak percobaan login gagal.</p>
									</div>
									<div className="inline-flex w-fit flex-shrink-0 items-center gap-1.5 rounded-xl bg-red-100 px-3 py-2 sm:ml-auto">
										<FiClock className="h-4 w-4 text-red-600" />
										<span className="text-sm font-bold text-red-700 tabular-nums">
											{lockoutMinutes}:{lockoutSeconds.toString().padStart(2, '0')}
										</span>
									</div>
								</div>
							</div>
						)}

						{error && !isLockedOut && (
							<div className="animate-shake rounded-2xl border border-red-200 bg-red-50 p-4">
								<div className="flex items-start gap-3">
									<FiAlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
									<p className="text-sm leading-5 text-red-700">{error}</p>
								</div>
							</div>
						)}
					</form>
				</div>
			</div>

		</div>
	);
};

export default LoginPage;
