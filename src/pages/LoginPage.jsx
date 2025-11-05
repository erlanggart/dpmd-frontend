import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { FiEye, FiEyeOff, FiLoader } from "react-icons/fi";
import LoginImageSlider from "../components/login/LoginImageSlider";
import { useAuth } from "../context/AuthContext";

const LoginPage = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();
	const [showPassword, setShowPassword] = useState(false);
	const { login } = useAuth();

	const handleLogin = async (e) => {
		e.preventDefault();
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

			// Routing based on user roles
			if (newUser.roles.includes("desa")) {
				navigate("/desa/dashboard");
			} else if (newUser.roles.includes("kecamatan")) {
				navigate("/kecamatan/dashboard");
			} else if (
				newUser.roles.includes("superadmin") ||
				newUser.roles.includes("pemerintahan_desa") ||
				newUser.roles.includes("sarana_prasarana") ||
				newUser.roles.includes("kekayaan_keuangan") ||
				newUser.roles.includes("pemberdayaan_masyarakat") ||
				newUser.roles.includes("sekretariat") ||
				newUser.roles.includes("prolap") ||
				newUser.roles.includes("keuangan") ||
				newUser.roles.includes("dinas") ||
				newUser.roles.includes("kepala_dinas") ||
				newUser.roles.includes("sekretaris_dinas")
			) {
				navigate("/dashboard");
			} else {
				navigate("/dashboard");
			}
		} catch (err) {
			setError(err.response?.data?.message || "Login gagal.");
		} finally {
			setLoading(false);
		}
	};

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

					<form onSubmit={handleLogin} className="mt-8 space-y-6">
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
						{error && (
							<p className="rounded-md bg-red-500/90 p-3 text-center text-sm text-white ">
								{error}
							</p>
						)}
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
					</form>
				</div>
			</div>
		</div>
	);
};

export default LoginPage;
