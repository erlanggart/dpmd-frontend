import React, { useState } from "react";
import { useUserProfile } from "../../hooks/useUserProfile";
import { FiUser, FiLock, FiEye, FiEyeOff, FiSave, FiSettings } from "react-icons/fi";
import DesaPageHeader from "../../components/desa/DesaPageHeader";
import { useAuth } from "../../context/AuthContext";
import api from "../../api";
import Swal from "sweetalert2";

// Halaman ini dipakai dua role: Admin Desa (pengelola akun) dan operator desa.
const ROLE_LABELS = {
	admin_desa: "Admin Desa (pengelola akun)",
	desa: "Operator Desa",
};

const DesaSettings = () => {
	const user = useUserProfile(); // Fetch profile with desa data
	const { updateUser } = useAuth();
	// Identitas petugas: nama asli, jabatan, nomor HP yang bisa dihubungi DPMD.
	const [identitas, setIdentitas] = useState({ name: "", jabatan_desa: "", no_hp: "" });
	const [savingIdentitas, setSavingIdentitas] = useState(false);

	// Sinkronkan form setiap kali profil selesai dimuat/berubah.
	React.useEffect(() => {
		setIdentitas({
			name: user?.name || "",
			jabatan_desa: user?.jabatan_desa || "",
			no_hp: user?.no_hp || "",
		});
	}, [user?.name, user?.jabatan_desa, user?.no_hp]);

	const handleSubmitIdentitas = async (e) => {
		e.preventDefault();
		if (savingIdentitas) return;

		setSavingIdentitas(true);
		try {
			const res = await api.put("/auth/desa-profile", identitas);
			const data = res.data?.data;
			updateUser({
				name: data.name,
				jabatan_desa: data.jabatan_desa,
				no_hp: data.no_hp,
				must_complete_profile: data.must_complete_profile,
			});
			Swal.fire({
				icon: "success",
				title: "Identitas tersimpan",
				timer: 1600,
				showConfirmButton: false,
			});
		} catch (error) {
			const payload = error.response?.data;
			// Backend mengirim errors per-field; gabungkan supaya jelas mana yang salah.
			const detail = payload?.errors
				? Object.values(payload.errors).join("\n")
				: payload?.message || "Terjadi kesalahan.";
			Swal.fire({ icon: "error", title: "Gagal menyimpan", text: detail });
		} finally {
			setSavingIdentitas(false);
		}
	};
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

	const tabs = [
		{ id: "profile", label: "Profil", icon: FiUser },
		{ id: "password", label: "Ubah Password", icon: FiLock },
	];

	return (
		<div className="space-y-5">
			<DesaPageHeader
				icon={FiSettings}
				eyebrow="Akun"
				title="Pengaturan Akun"
				description="Kelola identitas petugas, informasi akun, dan keamanan kata sandi Anda."
			>
				<div className="flex flex-wrap items-center gap-1">
					{tabs.map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
								activeTab === tab.id
									? "bg-slate-900 text-white"
									: "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
							}`}
						>
							<tab.icon className="h-4 w-4" />
							{tab.label}
						</button>
					))}
				</div>
			</DesaPageHeader>

			{/* Content */}
			<div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
				{/* Profile Tab */}
				{activeTab === "profile" && (
					<div className="space-y-6">
						{/* Identitas petugas — wajib dan boleh diperbarui sendiri, mis. saat ganti nomor HP */}
						<form onSubmit={handleSubmitIdentitas} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
							<div className="mb-1 flex items-center gap-2">
								<FiUser className="h-4 w-4 text-slate-400" />
								<h3 className="text-sm font-semibold text-slate-900">Identitas Petugas</h3>
							</div>
							<p className="mb-4 text-sm text-slate-500">
								Dipakai DPMD untuk menghubungi Anda. Pastikan selalu terbaru.
							</p>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div>
									<label className="mb-1.5 block text-sm font-medium text-slate-700">Nama Lengkap</label>
									<input
										type="text"
										value={identitas.name}
										onChange={(e) => setIdentitas({ ...identitas, name: e.target.value })}
										placeholder="Nama asli petugas"
										className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
									/>
								</div>
								<div>
									<label className="mb-1.5 block text-sm font-medium text-slate-700">Jabatan</label>
									<input
										type="text"
										value={identitas.jabatan_desa}
										onChange={(e) => setIdentitas({ ...identitas, jabatan_desa: e.target.value })}
										placeholder="Contoh: Sekretaris Desa"
										className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
									/>
								</div>
								<div>
									<label className="mb-1.5 block text-sm font-medium text-slate-700">Nomor HP</label>
									<input
										type="tel"
										value={identitas.no_hp}
										onChange={(e) => setIdentitas({ ...identitas, no_hp: e.target.value })}
										placeholder="081234567890"
										className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
									/>
								</div>
							</div>

							<button
								type="submit"
								disabled={savingIdentitas}
								className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
							>
								<FiSave className="h-4 w-4" />
								{savingIdentitas ? "Menyimpan..." : "Simpan Identitas"}
							</button>
						</form>

						<div className="rounded-xl border border-slate-200 bg-white p-4">
							<p className="text-sm leading-6 text-slate-500">
								<strong>Informasi:</strong> Data di bawah ini dikelola administrator.
								Untuk mengubahnya, silakan hubungi administrator.
							</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label className="mb-1.5 block text-sm font-medium text-slate-700">
									Email
								</label>
								<input
									type="email"
									value={user?.email || ""}
									disabled
									className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500"
								/>
							</div>

							<div>
								<label className="mb-1.5 block text-sm font-medium text-slate-700">
									Role
								</label>
								<input
									type="text"
									value={ROLE_LABELS[user?.role] || user?.role || ""}
									disabled
									className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500"
								/>
							</div>

							<div>
								<label className="mb-1.5 block text-sm font-medium text-slate-700">
									Desa/Kelurahan
								</label>
								<input
									type="text"
									value={user?.desa?.nama || "-"}
									disabled
									className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500"
								/>
							</div>

							<div className="md:col-span-2">
								<label className="mb-1.5 block text-sm font-medium text-slate-700">
									Kecamatan
								</label>
								<input
									type="text"
									value={user?.desa?.kecamatan?.nama || "-"}
									disabled
									className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500"
								/>
							</div>
						</div>
					</div>
				)}

				{/* Password Tab */}
				{activeTab === "password" && (
					<div className="max-w-2xl">
						<div className="mb-6 rounded-xl border border-amber-100 bg-amber-50 p-4">
							<p className="text-sm leading-6 text-amber-800">
								<strong>Perhatian:</strong> Pastikan password baru minimal 6 karakter
								dan mudah diingat. Jangan bagikan password Anda kepada siapapun.
							</p>
						</div>

						<form onSubmit={handleSubmitPassword} className="space-y-6">
							{/* Current Password */}
							<div>
								<label className="mb-1.5 block text-sm font-medium text-slate-700">
									Password Saat Ini <span className="text-rose-500">*</span>
								</label>
								<div className="relative">
									<input
										type={showPasswords.current ? "text" : "password"}
										name="currentPassword"
										value={passwordData.currentPassword}
										onChange={handlePasswordChange}
										className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
										placeholder="Masukkan password saat ini"
										required
									/>
									<button
										type="button"
										onClick={() => togglePasswordVisibility("current")}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
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
								<label className="mb-1.5 block text-sm font-medium text-slate-700">
									Password Baru <span className="text-rose-500">*</span>
								</label>
								<div className="relative">
									<input
										type={showPasswords.new ? "text" : "password"}
										name="newPassword"
										value={passwordData.newPassword}
										onChange={handlePasswordChange}
										className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
										placeholder="Masukkan password baru (min. 6 karakter)"
										required
										minLength={6}
									/>
									<button
										type="button"
										onClick={() => togglePasswordVisibility("new")}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
									>
										{showPasswords.new ? (
											<FiEyeOff className="h-5 w-5" />
										) : (
											<FiEye className="h-5 w-5" />
										)}
									</button>
								</div>
								<p className="mt-1 text-xs text-slate-400">
									Password minimal 6 karakter
								</p>
							</div>

							{/* Confirm Password */}
							<div>
								<label className="mb-1.5 block text-sm font-medium text-slate-700">
									Konfirmasi Password Baru <span className="text-rose-500">*</span>
								</label>
								<div className="relative">
									<input
										type={showPasswords.confirm ? "text" : "password"}
										name="confirmPassword"
										value={passwordData.confirmPassword}
										onChange={handlePasswordChange}
										className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
										placeholder="Ulangi password baru"
										required
									/>
									<button
										type="button"
										onClick={() => togglePasswordVisibility("confirm")}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
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
									className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
									disabled={loading}
								>
									Reset
								</button>
								<button
									type="submit"
									disabled={loading}
									className="flex items-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
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

export default DesaSettings;
