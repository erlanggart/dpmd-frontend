import React, { useState } from "react";
import { useUserProfile } from "../../hooks/useUserProfile";
import { FiUser, FiLock, FiEye, FiEyeOff, FiSave } from "react-icons/fi";
import api from "../../api";
import Swal from "sweetalert2";

const KecamatanSettings = () => {
	const user = useUserProfile();
	const [activeTab, setActiveTab] = useState("profile");
	const [loading, setLoading] = useState(false);

	// Password change state
	const [passwordData, setPasswordData] = useState({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});
	const [showPasswords, setShowPasswords] = useState({
		current: false,
		new: false,
		confirm: false,
	});

	const handlePasswordChange = (e) => {
		setPasswordData({
			...passwordData,
			[e.target.name]: e.target.value,
		});
	};

	const togglePasswordVisibility = (field) => {
		setShowPasswords({
			...showPasswords,
			[field]: !showPasswords[field],
		});
	};

	const handleSubmitPassword = async (e) => {
		e.preventDefault();

		// Validasi
		if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: "Semua field harus diisi!",
			});
			return;
		}

		if (passwordData.newPassword.length < 6) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: "Password baru minimal 6 karakter!",
			});
			return;
		}

		if (passwordData.newPassword !== passwordData.confirmPassword) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: "Password baru dan konfirmasi password tidak cocok!",
			});
			return;
		}

		setLoading(true);

		try {
			const response = await api.put("/users/change-password", {
				currentPassword: passwordData.currentPassword,
				newPassword: passwordData.newPassword,
			});

			Swal.fire({
				icon: "success",
				title: "Berhasil!",
				text: response.data.message || "Password berhasil diubah!",
			});

			// Reset form
			setPasswordData({
				currentPassword: "",
				newPassword: "",
				confirmPassword: "",
			});
		} catch (error) {
			console.error("Error changing password:", error);
			Swal.fire({
				icon: "error",
				title: "Gagal!",
				text: error.response?.data?.message || "Gagal mengubah password. Silakan coba lagi.",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="bg-white rounded-lg shadow-md">
			{/* Header */}
			<div className="border-b border-gray-200 px-6 py-4">
				<h2 className="text-2xl font-bold text-gray-800">Pengaturan Akun</h2>
				<p className="text-sm text-gray-500 mt-1">
					Kelola informasi akun dan keamanan Anda
				</p>
			</div>

			{/* Tabs */}
			<div className="border-b border-gray-200">
				<div className="flex px-6">
					<button
						onClick={() => setActiveTab("profile")}
						className={`flex items-center px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
							activeTab === "profile"
								? "border-violet-600 text-violet-600"
								: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
						}`}
					>
						<FiUser className="h-5 w-5 mr-2" />
						Profil
					</button>
					<button
						onClick={() => setActiveTab("password")}
						className={`flex items-center px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
							activeTab === "password"
								? "border-violet-600 text-violet-600"
								: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
						}`}
					>
						<FiLock className="h-5 w-5 mr-2" />
						Ubah Password
					</button>
				</div>
			</div>

			{/* Content */}
			<div className="p-6">
				{/* Profile Tab */}
				{activeTab === "profile" && (
					<div className="space-y-6">
						<div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
							<p className="text-sm text-violet-800">
								<strong>Informasi:</strong> Data profil dikelola oleh administrator.
								Untuk mengubah data profil, silakan hubungi administrator.
							</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Nama Lengkap
								</label>
								<input
									type="text"
									value={user?.name || ""}
									disabled
									className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Email
								</label>
								<input
									type="email"
									value={user?.email || ""}
									disabled
									className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Role
								</label>
								<input
									type="text"
									value={user?.role || ""}
									disabled
									className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed capitalize"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Kecamatan
								</label>
								<input
									type="text"
									value={user?.kecamatan_name || user?.kecamatan?.nama || "-"}
									disabled
									className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
								/>
							</div>
						</div>
					</div>
				)}

				{/* Password Tab */}
				{activeTab === "password" && (
					<div className="max-w-2xl">
						<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
							<p className="text-sm text-yellow-800">
								<strong>Perhatian:</strong> Pastikan password baru minimal 6 karakter
								dan mudah diingat. Jangan bagikan password Anda kepada siapapun.
							</p>
						</div>

						<form onSubmit={handleSubmitPassword} className="space-y-6">
							{/* Current Password */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Password Saat Ini <span className="text-red-500">*</span>
								</label>
								<div className="relative">
									<input
										type={showPasswords.current ? "text" : "password"}
										name="currentPassword"
										value={passwordData.currentPassword}
										onChange={handlePasswordChange}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 pr-10"
										placeholder="Masukkan password saat ini"
										required
									/>
									<button
										type="button"
										onClick={() => togglePasswordVisibility("current")}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
									>
										{showPasswords.current ? (
											<FiEyeOff className="h-5 w-5" />
										) : (
											<FiEye className="h-5 w-5" />
										)}
									</button>
								</div>
							</div>

							{/* New Password */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Password Baru <span className="text-red-500">*</span>
								</label>
								<div className="relative">
									<input
										type={showPasswords.new ? "text" : "password"}
										name="newPassword"
										value={passwordData.newPassword}
										onChange={handlePasswordChange}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 pr-10"
										placeholder="Masukkan password baru (min. 6 karakter)"
										required
										minLength={6}
									/>
									<button
										type="button"
										onClick={() => togglePasswordVisibility("new")}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
									>
										{showPasswords.new ? (
											<FiEyeOff className="h-5 w-5" />
										) : (
											<FiEye className="h-5 w-5" />
										)}
									</button>
								</div>
								<p className="text-xs text-gray-500 mt-1">
									Password minimal 6 karakter
								</p>
							</div>

							{/* Confirm Password */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Konfirmasi Password Baru <span className="text-red-500">*</span>
								</label>
								<div className="relative">
									<input
										type={showPasswords.confirm ? "text" : "password"}
										name="confirmPassword"
										value={passwordData.confirmPassword}
										onChange={handlePasswordChange}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 pr-10"
										placeholder="Ulangi password baru"
										required
									/>
									<button
										type="button"
										onClick={() => togglePasswordVisibility("confirm")}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
									>
										{showPasswords.confirm ? (
											<FiEyeOff className="h-5 w-5" />
										) : (
											<FiEye className="h-5 w-5" />
										)}
									</button>
								</div>
							</div>

							{/* Submit Button */}
							<div className="flex justify-end space-x-3 pt-4">
								<button
									type="button"
									onClick={() => {
										setPasswordData({
											currentPassword: "",
											newPassword: "",
											confirmPassword: "",
										});
									}}
									className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
									disabled={loading}
								>
									Reset
								</button>
								<button
									type="submit"
									disabled={loading}
									className="flex items-center px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{loading ? (
										<>
											<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
											Menyimpan...
										</>
									) : (
										<>
											<FiSave className="h-5 w-5 mr-2" />
											Simpan Perubahan
										</>
									)}
								</button>
							</div>
						</form>
					</div>
				)}
			</div>
		</div>
	);
};

export default KecamatanSettings;
