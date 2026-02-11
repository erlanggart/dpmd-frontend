import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "../api";
import { FiEye, FiEyeOff, FiLoader, FiAlertCircle, FiBell, FiInfo } from "react-icons/fi";
import LoginImageSlider from "../components/login/LoginImageSlider";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { requestNotificationPermission, registerServiceWorker } from "../utils/pushNotifications";
import NotificationSettingsGuide from "../components/NotificationSettingsGuide";

const LoginPage = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();
	const [showPassword, setShowPassword] = useState(false);
	const [showNotificationGuide, setShowNotificationGuide] = useState(false);
	const { login } = useAuth();
	const [notificationPermission, setNotificationPermission] = useState('default');
	const [checkingNotification, setCheckingNotification] = useState(false);

	// Auto check notification permission on mount
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
				toast.success('Notifikasi diizinkan!', {
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

	const handleLogin = async (e) => {
		e.preventDefault();
		
		// Update notification permission state
		if ('Notification' in window) {
			setNotificationPermission(Notification.permission);
		}

		setLoading(true);
		setError(null);
		try {
			// Login to Express backend
			const response = await api.post("/auth/login", { email, password });

			const newUser = response.data.data.user;
			const expressToken = response.data.data.token;

			console.log('✅ Login successful');

			// Save token and user using context
			login(newUser, null, expressToken);

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
				navigate("/ketua-tim/dashboard");
			} else if (newUser.role === "kepala_dinas") {
				navigate("/kepala-dinas/dashboard");
			} else if (newUser.role === "kepala_bidang") {
				navigate("/kepala-bidang/dashboard");
			} else if (newUser.role === "sekretaris_dinas") {
				navigate("/sekretaris-dinas/dashboard");
			} else if (newUser.role === "superadmin") {
				navigate("/superadmin/dashboard");
			} else {
				navigate("/dashboard");
			}
		} catch (error) {
			console.error("Login gagal:", error.response?.data || error.message);
			setError(error.response?.data?.message || "Login gagal. Silakan coba lagi.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="relative flex min-h-screen items-center justify-center bg-gray-300 p-4">
			<div className="relative z-10 flex w-full max-w-5xl overflow-hidden rounded-2xl bg-white/60 shadow-2xl p-4 border-2 border-white">
				{/* Left Side - Image Slider */}
				<div className="relative hidden w-1/2 lg:block rounded-2xl">
					<LoginImageSlider />
					<div className="absolute inset-0 z-10 bg-black/50 rounded-2xl"></div>
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

				{/* Right Side - Login Form */}
				<div className="w-full p-8 lg:w-1/2 lg:p-12">
					<h2 className="text-3xl font-bold text-gray-800">Selamat Datang!</h2>
					<p className="mt-2 text-gray-600">Silakan masuk untuk melanjutkan.</p>

					{/* Notification Permission */}
					{notificationPermission !== 'granted' && (
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
					{notificationPermission === 'granted' && (
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
								aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
							>
								{showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
							</button>
						</div>
						<button
							type="submit"
							disabled={loading}
							className="flex w-full items-center justify-center rounded-lg bg-[rgb(var(--color-primary))] py-3 font-semibold text-white transition-colors hover:bg-[rgb(var(--color-primary))]/90 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-60 shadow-xl"
						>
							{loading ? <FiLoader className="animate-spin" /> : "Sign In"}
						</button>
						{error && (
							<div className="rounded-lg bg-red-50 border border-red-200 p-4 animate-shake">
								<div className="flex items-start gap-3">
									<FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
									<div className="flex-1">
										<h3 className="text-sm font-semibold text-red-800 mb-1">
											Login Gagal
										</h3>
										<p className="text-sm text-red-700 mb-2">
											{error}
										</p>
										<div className="text-xs text-red-600 space-y-1 pt-2 border-t border-red-200">
											<p className="font-medium">Pastikan:</p>
											<ul className="list-disc list-inside space-y-0.5 ml-1">
												<li>Email yang dimasukkan sudah benar</li>
												<li>Password yang dimasukkan sudah benar</li>
												<li>Password default: <strong>password</strong></li>
											</ul>
										</div>
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
