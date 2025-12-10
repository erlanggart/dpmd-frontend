import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios"; // CRITICAL: Direct axios import for VPN check
import api from "../api";
import { FiEye, FiEyeOff, FiLoader, FiAlertCircle, FiShield, FiBell } from "react-icons/fi";
import LoginImageSlider from "../components/login/LoginImageSlider";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { requestNotificationPermission, registerServiceWorker, subscribeToPushNotifications } from "../utils/pushNotifications";

const LoginPage = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(false);
	const [checkingVpn, setCheckingVpn] = useState(false);
	const [vpnMode, setVpnMode] = useState(false); // Toggle for VPN mode
	const [vpnSecret, setVpnSecret] = useState(''); // VPN secret key input
	const navigate = useNavigate();
	const [showPassword, setShowPassword] = useState(false);
	const { login } = useAuth();
	const [notificationPermission, setNotificationPermission] = useState('default');
	const [checkingNotification, setCheckingNotification] = useState(false);

	// Check notification permission on mount
	useEffect(() => {
		if ('Notification' in window) {
			setNotificationPermission(Notification.permission);
		}
	}, []);

	const handleRequestNotification = async () => {
		setCheckingNotification(true);
		setError(null);
		
		try {
			// Register service worker first
			await registerServiceWorker();
			
			// Request notification permission
			const granted = await requestNotificationPermission();
			
			if (granted) {
				setNotificationPermission('granted');
				toast.success('Notifikasi diizinkan! Anda bisa login sekarang.', {
					duration: 3000,
					icon: '✅',
					style: {
						background: '#10b981',
						color: '#fff',
						fontWeight: 'bold'
					}
				});
			} else {
				setNotificationPermission(Notification.permission);
				setError('Izin notifikasi ditolak. Anda harus mengizinkan notifikasi untuk dapat login.');
				toast.error('Izin notifikasi ditolak!', {
					duration: 4000,
					icon: '❌'
				});
			}
		} catch (error) {
			console.error('Error requesting notification:', error);
			setError('Gagal meminta izin notifikasi. Coba lagi.');
		} finally {
			setCheckingNotification(false);
		}
	};

	const checkVpnConnection = async () => {
		try {
			setCheckingVpn(true);
			setError(null);
			
			// HYBRID VERIFICATION: IP check + secret key fallback
			// Send secret key to backend for verification
			const response = await api.get('/auth/check-vpn-tailscale', {
				params: { secret: vpnSecret },
				timeout: 5000
			});
			
			if (response.data.success && response.data.data.isVpn) {
				// ✅ VPN VERIFIED
				const accessMethod = response.data.data.accessMethod;
				const methodText = accessMethod === 'tailscale-ip' 
					? 'Tailscale IP' 
					: 'Secret Key';
				
				localStorage.setItem('expressToken', 'VPN_ACCESS_TOKEN');
				localStorage.setItem('user', JSON.stringify({
					id: 'vpn-user',
					name: 'VPN User - Internal DPMD',
					email: 'vpn@internal',
					role: 'vpn_access',
					roles: ['vpn_access'],
					vpnIp: response.data.data.ip,
					accessMethod
				}));
				
				// Store secret in session for subsequent requests
				if (accessMethod === 'secret-key') {
					sessionStorage.setItem('vpn_secret', vpnSecret);
				}
				
				toast.success(
					`🔒 Akses Diverifikasi via ${methodText}!`,
					{
						duration: 3000,
						icon: '✅',
						style: {
							background: '#10b981',
							color: '#fff',
							fontWeight: 'bold'
						}
					}
				);
				
				setTimeout(() => {
					// VPN users go to core-dashboard
					navigate('/core-dashboard/dashboard');
				}, 1500);
			} else {
				// ❌ VERIFICATION FAILED
				const userIP = response.data.data?.ip || 'unknown';
				setError(`Akses ditolak. IP: ${userIP}. Hubungkan Tailscale atau masukkan kode akses yang benar.`);
				toast.error('Verifikasi Gagal', {
					duration: 5000,
					icon: '❌',
					style: {
						background: '#ef4444',
						color: '#fff'
					}
				});
			}
		} catch (error) {
			console.error('VPN verification failed:', error);
			
			if (error.response?.status === 403) {
				const userIP = error.response.data?.data?.ip || 'unknown';
				setError(`Akses ditolak. IP Anda: ${userIP}. Hubungkan Tailscale ATAU masukkan Kode Akses Internal yang valid.`);
				toast.error('Akses Ditolak', {
					duration: 5000,
					icon: '🚫',
					style: {
						background: '#dc2626',
						color: '#fff',
						fontWeight: 'bold'
					}
				});
			} else {
				setError('Gagal memverifikasi akses. Periksa koneksi Tailscale atau Kode Akses Anda.');
				toast.error('Verifikasi Gagal', { duration: 4000, icon: '❌' });
			}
		} finally {
			setCheckingVpn(false);
		}
	};

	const handleLogin = async (e) => {
		e.preventDefault();
		
		// Check notification permission first
		if (!('Notification' in window)) {
			setError("Browser Anda tidak mendukung notifikasi. Gunakan browser modern seperti Chrome atau Firefox.");
			return;
		}

		const currentPermission = Notification.permission;
		setNotificationPermission(currentPermission);

		if (currentPermission !== 'granted') {
			setError("Anda harus mengizinkan notifikasi untuk dapat login. Klik tombol 'Izinkan Notifikasi' di bawah.");
			toast.error('Izinkan notifikasi terlebih dahulu!', {
				duration: 4000,
				icon: '🔔',
				style: {
					background: '#ef4444',
					color: '#fff',
					fontWeight: 'bold'
				}
			});
			return;
		}

		setLoading(true);
		setError(null);
		try {
			// Login to Express backend (single source of truth)
			const response = await api.post("/auth/login", { email, password });

			const newUser = response.data.data.user;
			const expressToken = response.data.data.token;

			console.log('✅ Express login successful');

			// Normalize role to roles array for compatibility
			if (newUser.role && !newUser.roles) {
				newUser.roles = [newUser.role];
			}

			// Save token and user using context
			login(newUser, null, expressToken); // No Laravel token

			// Auto-subscribe to push notifications after successful login
			try {
				console.log('🔔 Auto-subscribing to push notifications...');
				const subscription = await subscribeToPushNotifications();
				if (subscription) {
					console.log('✅ Push notification subscription successful');
					toast.success('Notifikasi aktif! Anda akan menerima update disposisi.', {
						duration: 3000,
						icon: '🔔'
					});
				}
			} catch (notifError) {
				console.error('Push notification subscription failed:', notifError);
				// Don't block login if notification fails
				toast('⚠️ Notifikasi gagal diaktifkan. Aktifkan manual di Settings.', {
					duration: 4000,
					icon: '⚠️'
				});
			}

			// Debug: Log user roles
			console.log('Login - User roles:', newUser.roles);
			console.log('Login - Role type:', typeof newUser.roles);
			console.log('Login - Is array?', Array.isArray(newUser.roles));
			console.log('Login - User role (single):', newUser.role);

			// Routing based on user roles - CHECK SINGLE role FIRST before roles array
			if (newUser.roles.includes("desa")) {
				navigate("/desa/dashboard");
			} else if (newUser.roles.includes("kecamatan")) {
				navigate("/kecamatan/dashboard");
			} else if (newUser.roles.includes("pegawai")) {
				navigate("/pegawai/dashboard");
			} else if (newUser.role === "kepala_dinas" || newUser.roles.includes("kepala_dinas")) {
				// Kepala Dinas gets dedicated dashboard with sidebar
				console.log('✅ Navigating kepala_dinas to /kepala-dinas/dashboard');
				navigate("/kepala-dinas/dashboard");
			} else if (
				newUser.role === "kabid_sekretariat" ||
				newUser.role === "kabid_pemerintahan_desa" ||
				newUser.role === "kabid_spked" ||
				newUser.role === "kabid_kekayaan_keuangan_desa" ||
				newUser.role === "kabid_pemberdayaan_masyarakat_desa" ||
				newUser.roles.includes("kabid_sekretariat") ||
				newUser.roles.includes("kabid_pemerintahan_desa") ||
				newUser.roles.includes("kabid_spked") ||
				newUser.roles.includes("kabid_kekayaan_keuangan_desa") ||
				newUser.roles.includes("kabid_pemberdayaan_masyarakat_desa")
			) {
				// Kepala Bidang gets dedicated dashboard
				console.log('✅ Navigating kepala_bidang to /kepala-bidang/dashboard');
				navigate("/kepala-bidang/dashboard");
			} else if (
				newUser.role === "sekretaris_dinas" ||
				newUser.roles.includes("sekretaris_dinas")
			) {
				// Sekretaris Dinas gets dedicated dashboard
				console.log('✅ Navigating sekretaris_dinas to /sekretaris-dinas/dashboard');
				navigate("/sekretaris-dinas/dashboard");
			} else if (
				newUser.roles.includes("superadmin") ||
				newUser.roles.includes("pemerintahan_desa") ||
				newUser.roles.includes("sarana_prasarana") ||
				newUser.roles.includes("kekayaan_keuangan") ||
				newUser.roles.includes("pemberdayaan_masyarakat") ||
				newUser.roles.includes("sekretariat") ||
				newUser.roles.includes("prolap") ||
				newUser.roles.includes("keuangan") ||
				newUser.roles.includes("dinas")
			) {
				navigate("/dashboard");
			} else {
				navigate("/dashboard");
			}
		} catch (err) {
			console.error('Login error:', err);
			
			// Handle different error types
			if (err.response) {
				// Server responded with error
				const status = err.response.status;
				const message = err.response?.data?.message;
				
				if (status === 401) {
					setError("Email atau password salah. Silakan coba lagi.");
				} else if (status === 404) {
					setError("Email tidak terdaftar dalam sistem.");
				} else if (status === 403) {
					setError("Akun Anda tidak memiliki akses. Hubungi admin.");
				} else {
					setError(message || "Login gagal. Silakan coba lagi.");
				}
			} else if (err.request) {
				// Request made but no response
				setError("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.");
			} else {
				// Something else happened
				setError("Terjadi kesalahan. Silakan coba lagi.");
			}
		} finally {
			setLoading(false);
		}
	};

	// Show loading screen while checking VPN
	if (checkingVpn) {
		return (
			<div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
				<div className="text-center">
					<div className="mb-6 flex justify-center">
						<div className="relative">
							<div className="h-20 w-20 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin"></div>
							<FiShield className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-emerald-600" />
						</div>
					</div>
					<h2 className="text-2xl font-bold text-gray-800 mb-2">Memeriksa Koneksi VPN</h2>
					<p className="text-gray-600">Mohon tunggu sebentar...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="relative flex min-h-screen items-center justify-center bg-gray-300 p-4">
			<div className="relative z-10 flex w-full max-w-5xl overflow-hidden rounded-2xl bg-white/60 shadow-2xl p-4 border-2 border-white">
				{/* --- BAGIAN KIRI YANG DIPERBARUI --- */}
				<div className="relative hidden w-1/2 lg:block rounded-2xl">
					{/* Komponen Slider sebagai Latar Belakang */}
					<LoginImageSlider />

					{/* Overlay Gelap */}
					<div className="absolute inset-0 z-10 bg-black/50 rounded-2xl"></div>

					{/* Konten Teks di Atas Overlay */}
					<div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 text-white rounded-2xl">
						<img
							src="/logo-kab.png"
							alt="Logo Kabupaten Bogor"
							className="h-24 w-auto drop-shadow-lg"
						/>
						<h1 className="mt-6 text-center text-3xl font-extrabold text-white">
							Dinas Pemberdayaan Masyarakat dan Desa
						</h1>
						<h2 className="mt-2 text-center text-xl font-semibold text-gray-200">
							Kabupaten Bogor
						</h2>
					</div>
				</div>

				{/* Bagian Kanan (Form Login) - Tidak ada perubahan */}
				<div className="w-full p-8 lg:w-1/2 lg:p-12">
					<h2 className="text-3xl font-bold text-gray-800">Selamat Datang!</h2>
					<p className="mt-2 text-gray-600">Silakan masuk untuk melanjutkan.</p>

					{/* VPN/Account Toggle Button */}
					<div className="mt-6 flex items-center justify-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
						<span className={`text-sm font-medium transition-colors ${!vpnMode ? 'text-[rgb(var(--color-primary))]' : 'text-gray-500'}`}>
							Login Akun
						</span>
						<button
							type="button"
							onClick={() => setVpnMode(!vpnMode)}
							className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
								vpnMode ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gray-300'
							}`}
							aria-label="Toggle VPN mode"
						>
							<span
								className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
									vpnMode ? 'translate-x-7' : 'translate-x-1'
								}`}
							>
								<FiShield className={`w-4 h-4 m-auto mt-1 transition-colors ${vpnMode ? 'text-emerald-600' : 'text-gray-400'}`} />
							</span>
						</button>
						<span className={`text-sm font-medium transition-colors ${vpnMode ? 'text-emerald-600' : 'text-gray-500'}`}>
							Login VPN
						</span>
					</div>

					{/* Notification Permission Warning/Button */}
					{!vpnMode && notificationPermission !== 'granted' && (
						<div className="mt-6 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 p-5 animate-pulse">
							<div className="flex items-start gap-4">
								<FiBell className="w-8 h-8 text-amber-600 flex-shrink-0 mt-1" />
								<div className="flex-1">
									<h3 className="text-lg font-bold text-gray-800 mb-2">
										Izinkan Notifikasi Diperlukan
									</h3>
									<p className="text-sm text-gray-700 mb-4">
										Anda harus mengizinkan notifikasi push untuk dapat login dan menerima update disposisi secara real-time.
									</p>
									<button
										type="button"
										onClick={handleRequestNotification}
										disabled={checkingNotification}
										className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-semibold shadow-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-70 disabled:cursor-not-allowed w-full sm:w-auto"
									>
										{checkingNotification ? (
											<>
												<FiLoader className="animate-spin w-5 h-5" />
												<span>Memproses...</span>
											</>
										) : (
											<>
												<FiBell className="w-5 h-5" />
												<span>Izinkan Notifikasi</span>
											</>
										)}
									</button>
								</div>
							</div>
						</div>
					)}

					{/* Success Notification Badge */}
					{!vpnMode && notificationPermission === 'granted' && (
						<div className="mt-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 p-4">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-green-100 rounded-lg">
									<FiBell className="w-6 h-6 text-green-600" />
								</div>
								<div>
									<p className="text-sm font-semibold text-gray-800">
										✅ Notifikasi Diizinkan
									</p>
									<p className="text-xs text-gray-600">
										Silakan login untuk melanjutkan
									</p>
								</div>
							</div>
						</div>
					)}

					<form onSubmit={handleLogin} className="mt-8 space-y-6">
						{vpnMode ? (
							// VPN Mode - Show VPN check button + Secret key input
							<div className="space-y-4">
								<div className="rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 p-6">
									<FiShield className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
									<h3 className="text-lg font-bold text-gray-800 mb-2 text-center">
										Mode Akses Internal
									</h3>
									<p className="text-sm text-gray-600 mb-4 text-center">
										Hubungkan Tailscale VPN atau masukkan Kode Akses Internal
									</p>
									
									{/* Secret Key Input */}
									<div className="mb-4">
										<label htmlFor="vpn-secret" className="block text-sm font-medium text-gray-700 mb-2">
											Kode Akses Internal (Opsional)
										</label>
										<input
											id="vpn-secret"
											type="password"
											value={vpnSecret}
											onChange={(e) => setVpnSecret(e.target.value)}
											placeholder="Masukkan kode jika tidak pakai Tailscale"
											className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 text-sm"
										/>
										<p className="text-xs text-gray-500 mt-1">
											💡 Kode akses didapat dari Admin DPMD via WhatsApp grup
										</p>
									</div>
									
									<button
										type="button"
										onClick={checkVpnConnection}
										disabled={checkingVpn}
										className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 py-3 px-6 font-semibold text-white transition-all hover:from-emerald-600 hover:to-green-700 disabled:cursor-not-allowed disabled:opacity-70 shadow-lg hover:shadow-xl"
									>
										{checkingVpn ? (
											<>
												<FiLoader className="animate-spin" />
												<span>Memeriksa VPN...</span>
											</>
										) : (
											<>
												<FiShield className="w-5 h-5" />
												<span>Verifikasi Koneksi VPN</span>
											</>
										)}
									</button>
								</div>
							</div>
						) : (
							// Normal Login Mode
							<>
								<div>
									<label htmlFor="email" className="sr-only">
										Alamat Email
									</label>
									<input
										type="email"
										id="email"
										placeholder="anda@email.com"
										className="w-full bg-white rounded-lg border border-gray-300 px-4 py-3 focus:border-[rgb(var(--color-primary))] focus:ring-1 focus:ring-[rgb(var(--color-primary))] focus:outline-none"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										required
									/>
								</div>
								<div className="relative">
									<label htmlFor="password" className="sr-only">
										Password
									</label>
									<input
										type={showPassword ? "text" : "password"}
										id="password"
										placeholder="Password"
										className="w-full bg-white rounded-lg border border-gray-300 px-4 py-3 pr-10 focus:border-[rgb(var(--color-primary))] focus:ring-1 focus:ring-[rgb(var(--color-primary))] focus:outline-none"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										required
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 focus:outline-none"
										aria-label={
											showPassword ? "Sembunyikan password" : "Tampilkan password"
										}
									>
										{showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
									</button>
								</div>
								<div className="text-right">
									<Link
										to="/"
										className="text-sm text-[rgb(var(--color-primary))] hover:underline"
									>
										Lupa Password? <strong>Hubungi Admin</strong>
									</Link>
								</div>
								<button
									type="submit"
									disabled={loading}
									className="flex w-full items-center justify-center rounded-lg bg-[rgb(var(--color-primary))] py-3 font-semibold text-white transition-colors hover:bg-[rgb(var(--color-primary))]/90 disabled:cursor-not-allowed disabled:bg-primary/70 shadow-xl"
								>
									{loading ? <FiLoader className="animate-spin" /> : "Sign In"}
								</button>
							</>
						)}
						{error && (
							<div className="rounded-lg bg-red-50 border border-red-200 p-4 animate-shake">
								<div className="flex items-start gap-3">
									<FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
									<div className="flex-1">
										<h3 className="text-sm font-semibold text-red-800 mb-1">
											{vpnMode ? 'VPN Error' : 'Login Gagal'}
										</h3>
										<p className="text-sm text-red-700">
											{error}
										</p>
									</div>
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
