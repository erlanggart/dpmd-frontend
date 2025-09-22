import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { FiEye, FiEyeOff, FiLoader } from "react-icons/fi";
import LoginImageSlider from "../../components/login/LoginImageSlider";

const BidangLoginPage = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();
	const [showPassword, setShowPassword] = useState(false);

	const handleLogin = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		
		try {
			const response = await api.post("/login/bidang", { email, password });

			// Simpan data khusus bidang
			localStorage.setItem("bidangUserData", JSON.stringify(response.data.user));
			localStorage.setItem("bidangAuthToken", response.data.access_token);

			// Log untuk debugging
			console.log('BidangLogin: Saved user data =', response.data.user);
			console.log('BidangLogin: Saved token =', response.data.access_token);

			// Redirect ke dashboard universal
			navigate("/dashboard");
		} catch (err) {
			setError(err.response?.data?.message || "Login bidang gagal.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="relative flex min-h-screen items-center justify-center bg-gray-300 p-4">
			<div className="relative z-10 flex w-full max-w-5xl overflow-hidden rounded-2xl bg-white/60 shadow-2xl p-4 border-2 border-white">
				{/* Bagian Kiri - Image Slider */}
				<div className="relative hidden w-1/2 lg:block rounded-2xl">
					<LoginImageSlider />
					<div className="absolute inset-0 bg-black/30 rounded-2xl"></div>
					<div className="absolute bottom-8 left-8 text-white z-10">
						<h2 className="text-3xl font-bold mb-2">Portal Bidang DPMD</h2>
						<p className="text-lg opacity-90">
							Sistem Informasi Dashboard Bidang
						</p>
					</div>
				</div>

				{/* Bagian Kanan - Form Login */}
				<div className="flex w-full items-center justify-center p-8 lg:w-1/2">
					<div className="w-full max-w-md space-y-6">
						<div className="text-center">
							<h2 className="text-3xl font-bold text-gray-900">
								Login Bidang
							</h2>
							<p className="mt-2 text-gray-600">
								Masuk ke dashboard bidang DPMD
							</p>
						</div>

						<form className="space-y-4" onSubmit={handleLogin}>
							{error && (
								<div className="rounded-md bg-red-50 p-4 border border-red-200">
									<div className="text-sm text-red-700">{error}</div>
								</div>
							)}

							<div>
								<label className="block text-sm font-medium text-gray-700">
									Email Bidang
								</label>
								<input
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
									placeholder="Masukkan email bidang"
									required
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700">
									Password
								</label>
								<div className="relative mt-1">
									<input
										type={showPassword ? "text" : "password"}
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										className="block w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
										placeholder="Masukkan password"
										required
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
									>
										{showPassword ? <FiEyeOff /> : <FiEye />}
									</button>
								</div>
							</div>

							<button
								type="submit"
								disabled={loading}
								className="w-full flex justify-center items-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{loading ? (
									<>
										<FiLoader className="mr-2 h-4 w-4 animate-spin" />
										Memproses...
									</>
								) : (
									"Masuk ke Dashboard"
								)}
							</button>
						</form>

						<div className="text-center">
							<p className="text-sm text-gray-600">
								Bukan user bidang?{" "}
								<a href="/login" className="text-blue-600 hover:text-blue-500">
									Login sebagai Super Admin
								</a>
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default BidangLoginPage;