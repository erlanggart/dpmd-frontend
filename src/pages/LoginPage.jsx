import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "../api";
import { FiEye, FiEyeOff, FiLoader, FiAlertCircle, FiShield, FiBell, FiInfo } from "react-icons/fi";
import LoginImageSlider from "../components/login/LoginImageSlider";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { requestNotificationPermission, registerServiceWorker, subscribeToPushNotifications } from "../utils/pushNotifications";
import NotificationSettingsGuide from "../components/NotificationSettingsGuide";

const LoginPage = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(false);
	const [checkingVpn, setCheckingVpn] = useState(false);
	const [vpnMode, setVpnMode] = useState(false); // Toggle for VPN mode
	const [vpnSecret, setVpnSecret] = useState('');
	const navigate = useNavigate();
	const [showPassword, setShowPassword] = useState(false);
	const [showNotificationGuide, setShowNotificationGuide] = useState(false);
	const { login } = useAuth();
	const [notificationPermission, setNotificationPermission] = useState('default');
	const [checkingNotification, setCheckingNotification] = useState(false);

	// Auto check notification permission on mount and force modal if not granted
	useEffect(() => {
		if ('Notification' in window) {
			const currentPermission = Notification.permission;
			setNotificationPermission(currentPermission);
			
			// Jika permission belum granted, langsung force request
			if (currentPermission !== 'granted') {
				// Auto trigger notification request (modal akan muncul)
				setCheckingNotification(false); // Siap untuk request
			}
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
				toast.success('Notifikasi diizinkan! Selesaikan setting Android untuk lanjut.', {
					duration: 4000,
					icon: '📱',
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

	// State for auto-check tracking
	const [autoCheckAttempted, setAutoCheckAttempted] = React.useState(false);

	// Helper function to handle successful VPN verification
	const handleVpnSuccess = React.useCallback((vpnData) => {
		console.log('✅ VPN Verified Successfully:', vpnData);
		toast.success('Akses VPN terverifikasi! Silakan login.', {
			duration: 4000,
			icon: '✅',
			style: {
				background: '#10b981',
				color: '#fff',
				fontWeight: 'bold'
			}
		});
		
		// Store VPN verification status
		localStorage.setItem('vpn_verified', 'true');
		localStorage.setItem('vpn_ip', vpnData.ip || 'unknown');
		
		// Exit VPN mode to show login form
		setVpnMode(false);
		setError(null);
	}, []);

	// SMART VPN CHECK: Try IP first, fallback to secret key
	const smartVpnCheck = React.useCallback(async () => {
		try {
			setCheckingVpn(true);
			setError(null);
			
			console.log('🔍 Smart VPN Check: Step 1 - Trying IP-based authentication...');
			
			// Step 1: Try without secret (IP-based)
			try {
				const ipResponse = await api.get('/auth/check-vpn-tailscale', {
					params: { secret: '' },
					timeout: 5000
				});
				
				console.log('✅ IP Check Response:', ipResponse.data);
				
				if (ipResponse.data.success && ipResponse.data.data.isVpn) {
					console.log('✅ SUCCESS: Authenticated via Tailscale IP!');
					handleVpnSuccess(ipResponse.data.data);
					return;
				}
			} catch (ipError) {
				console.log('⚠️  IP-based auth failed, trying secret key...', ipError.response?.data);
			}
			
			// Step 2: IP failed, try with secret key
			if (vpnSecret && vpnSecret.trim()) {
				console.log('🔍 Smart VPN Check: Step 2 - Trying secret key authentication...');
				
				const secretResponse = await api.get('/auth/check-vpn-tailscale', {
					params: { secret: vpnSecret },
					timeout: 5000
				});
				
				console.log('✅ Secret Key Response:', secretResponse.data);
				
				if (secretResponse.data.success && secretResponse.data.data.isVpn) {
					console.log('✅ SUCCESS: Authenticated via secret key!');
					handleVpnSuccess(secretResponse.data.data);
					return;
				}
			}
			
			// Both failed
			throw new Error('VPN authentication failed with both IP and secret key');
			
		} catch (error) {
			console.error('❌ Smart VPN Check failed:', error);
			
			if (error.response?.status === 403) {
				const responseData = error.response.data?.data || {};
				const userIP = responseData.ip || 'unknown';
				const reason = responseData.reason || 'VPN access denied';
				
				// Debug: Log detailed error info
				console.error('🚫 VPN Access Denied:', {
					ip: userIP,
					reason: reason,
					fullResponse: error.response.data
				});
				
				setError(
					<div className="text-left">
						<div className="font-bold mb-2">🚫 Akses VPN Ditolak</div>
						<div className="space-y-1 text-sm">
							<div>📍 <strong>IP Terdeteksi:</strong> {userIP}</div>
							<div>⚠️ <strong>Alasan:</strong> {reason}</div>
							<div className="mt-2 text-xs text-gray-600">
								💡 Solusi:<br/>
								• Hubungkan ke Tailscale VPN, atau<br/>
								• Masukkan Kode Akses Internal yang valid
							</div>
						</div>
					</div>
				);
			} else {
				setError('Gagal memverifikasi akses. Pastikan kode akses benar atau Tailscale aktif.');
			}
		} finally {
			setCheckingVpn(false);
		}
	}, [vpnSecret, handleVpnSuccess]);

	// Auto check VPN when VPN mode is enabled
	React.useEffect(() => {
		if (vpnMode && !autoCheckAttempted) {
			setAutoCheckAttempted(true);
			smartVpnCheck();
		}
		if (!vpnMode) {
			setAutoCheckAttempted(false);
		}
	}, [vpnMode, autoCheckAttempted, smartVpnCheck]);

	// Manual VPN check (when button clicked)
	const checkVpnConnection = async () => {
		try {
			setCheckingVpn(true);
			setError(null);
			
			// DEBUG: Log request details
			console.log('🔍 Manual VPN Check Request:', {
				secret: vpnSecret,
				secretLength: vpnSecret.length,
				apiUrl: import.meta.env.VITE_API_BASE_URL
			});
			
			// HYBRID VERIFICATION: IP check + secret key fallback
			// Send secret key to backend for verification
			const response = await api.get('/auth/check-vpn-tailscale', {
				params: { secret: vpnSecret },
				timeout: 5000
			});
			
			// DEBUG: Log response
			console.log('✅ VPN Check Response:', response.data);
			
			if (response.data.success && response.data.data.isVpn) {
				// ✅ VPN VERIFIED - Use helper function
				handleVpnSuccess(response.data.data);
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
			console.error('❌ VPN verification failed:', error);
			console.error('Error details:', {
				status: error.response?.status,
				data: error.response?.data,
				message: error.message
			});
			
			if (error.response?.status === 403) {
				const responseData = error.response.data?.data || {};
				const userIP = responseData.ip || 'unknown';
				const reason = responseData.reason || 'VPN access denied';
				const errorMsg = error.response.data?.message || 'Akses ditolak';
				
				// Debug: Log detailed error info
				console.error('🚫 VPN Access Denied (Manual Check):', {
					ip: userIP,
					reason: reason,
					secretProvided: !!vpnSecret,
					secretLength: vpnSecret?.length || 0,
					fullResponse: error.response.data
				});
				
				setError(
					<div className="text-left">
						<div className="font-bold mb-2">🚫 {errorMsg}</div>
						<div className="space-y-1 text-sm">
							<div>📍 <strong>IP Terdeteksi:</strong> {userIP}</div>
							<div>⚠️ <strong>Alasan:</strong> {reason}</div>
							{vpnSecret && (
								<div>🔑 <strong>Kode:</strong> "{vpnSecret}" ({vpnSecret.length} karakter)</div>
							)}
							<div className="mt-2 text-xs text-gray-600">
								💡 Solusi:<br/>
								• Pastikan Tailscale VPN aktif dan terhubung, atau<br/>
								• Masukkan Kode Akses Internal yang benar<br/>
								• Kode harus: "DPMD-INTERNAL-2025" (19 karakter)
							</div>
						</div>
					</div>
				);
				
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
				setError(`Gagal memverifikasi akses. ${error.message || 'Network error'}`);
				toast.error('Verifikasi Gagal', { duration: 4000, icon: '❌' });
			}
		} finally {
			setCheckingVpn(false);
		}
	};

	const handleLogin = async (e) => {
		e.preventDefault();
		
		// Update notification permission state (informational only, not blocking)
		if ('Notification' in window) {
			setNotificationPermission(Notification.permission);
		}

		setLoading(true);
		setError(null);
		try {
			// Login to Express backend (single source of truth)
			const response = await api.post("/auth/login", { email, password });

			const newUser = response.data.data.user;
			const expressToken = response.data.data.token;

			console.log('✅ Express login successful');

			// Save token and user using context
			login(newUser, null, expressToken); // No Laravel token

			// Note: Push notification permission akan diminta via toggle button di dashboard
			// Tidak auto-request saat login untuk UX yang lebih baik

			// Navigate based on role
			if (newUser.role === "desa") {
				navigate("/desa/dashboard");
			} else if (newUser.role === "kecamatan") {
				navigate("/kecamatan/dashboard");
			} else if (newUser.role === "dinas_terkait" || newUser.role === "verifikator_dinas") {
				navigate("/dinas/dashboard");
			} else if (newUser.role === "pegawai") {
				navigate("/pegawai/dashboard");
			} else if (newUser.role === "ketua_tim") {
				// Ketua Tim gets dedicated dashboard
				console.log('✅ Navigating ketua_tim to /ketua-tim/dashboard');
				navigate("/ketua-tim/dashboard");
			} else if (newUser.role === "kepala_dinas") {
				// Kepala Dinas gets dedicated dashboard with sidebar
				console.log('✅ Navigating kepala_dinas to /kepala-dinas/dashboard');
				navigate("/kepala-dinas/dashboard");
			} else if (newUser.role === "kepala_bidang") {
				// Kepala Bidang gets dedicated dashboard
				console.log('✅ Navigating kepala_bidang to /kepala-bidang/dashboard');
				navigate("/kepala-bidang/dashboard");
			} else if (newUser.role === "sekretaris_dinas") {
				// Sekretaris Dinas gets dedicated dashboard
				console.log('✅ Navigating sekretaris_dinas to /sekretaris-dinas/dashboard');
				navigate("/sekretaris-dinas/dashboard");
			} else if (newUser.role === "superadmin") {
				// Superadmin gets dedicated dashboard
				console.log('✅ Navigating superadmin to /superadmin/dashboard');
				navigate("/superadmin/dashboard");
			} else if (
				newUser.role === "pemerintahan_desa" ||
				newUser.role === "sarana_prasarana" ||
				newUser.role === "kekayaan_keuangan" ||
				newUser.role === "pemberdayaan_masyarakat" ||
				newUser.role === "sekretariat" ||
				newUser.role === "dinas"
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
							src="/logo-bogor.png"
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

					{/* Notification Permission - Soft Prompt (not blocking login) */}
					{!vpnMode && notificationPermission !== 'granted' && (
						<div className="mt-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-4">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
									<FiBell className="w-5 h-5 text-blue-600" />
								</div>
								<div className="flex-1">
									<p className="text-sm font-semibold text-gray-800">
										Aktifkan Notifikasi
									</p>
									<p className="text-xs text-gray-600">
										Untuk menerima update disposisi real-time
									</p>
								</div>
								<button
									type="button"
									onClick={handleRequestNotification}
									disabled={checkingNotification}
									className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex-shrink-0"
								>
									{checkingNotification ? (
										<FiLoader className="animate-spin w-4 h-4" />
									) : (
										<>
											<FiBell className="w-4 h-4" />
											<span>Izinkan</span>
										</>
									)}
								</button>
							</div>
						</div>
					)}

					{/* Success Notification Badge */}
					{!vpnMode && notificationPermission === 'granted' && (
						<div className="mt-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 p-4">
							<div className="flex items-center justify-between">
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
								<button
									type="button"
									onClick={() => setShowNotificationGuide(true)}
									className="p-2 hover:bg-green-200 rounded-lg transition-colors"
									title="Panduan pengaturan notifikasi background"
								>
									<FiInfo className="w-5 h-5 text-green-700" />
								</button>
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
										className="w-full bg-white rounded-lg border border-gray-300 px-4 py-3 focus:border-[rgb(var(--color-primary))] focus:ring-1 focus:ring-[rgb(var(--color-primary))] focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
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
										className="w-full bg-white rounded-lg border border-gray-300 px-4 py-3 pr-10 focus:border-[rgb(var(--color-primary))] focus:ring-1 focus:ring-[rgb(var(--color-primary))] focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
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
										className="flex w-full items-center justify-center rounded-lg bg-[rgb(var(--color-primary))] py-3 font-semibold text-white transition-colors hover:bg-[rgb(var(--color-primary))]/90 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-60 shadow-xl relative group"
									>
										{loading ? (
											<FiLoader className="animate-spin" />
									) : (
										"Sign In"
									)}
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

			{/* Notification Settings Guide Modal */}
			{showNotificationGuide && (
				<NotificationSettingsGuide onClose={() => setShowNotificationGuide(false)} />
			)}
		</div>
	);
};

export default LoginPage;
