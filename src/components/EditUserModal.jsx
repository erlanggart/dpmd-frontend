// src/components/EditUserModal.jsx
import React, { useState, useEffect } from "react";
import { LuX, LuUser, LuMail, LuLock, LuMapPin, LuBuilding2 } from "react-icons/lu";
import api from "../api";
import { toast } from "react-hot-toast";

const EditUserModal = ({ isOpen, onClose, onUserEdited, userData }) => {
	const [formData, setFormData] = useState({
		name: "",
		email: "",
		role: "",
		kecamatan_id: "",
		desa_id: "",
		password: "", // Optional, jika ingin ubah password
	});
	const [loading, setLoading] = useState(false);
	const [kecamatanList, setKecamatanList] = useState([]);
	const [desaList, setDesaList] = useState([]);
	const [loadingKecamatan, setLoadingKecamatan] = useState(false);
	const [loadingDesa, setLoadingDesa] = useState(false);

	// Load user data saat modal dibuka
	useEffect(() => {
		if (isOpen && userData) {
			setFormData({
				name: userData.name || "",
				email: userData.email || "",
				role: userData.role || "",
				kecamatan_id: userData.kecamatan_id || "",
				desa_id: userData.desa_id || "",
				password: "", // Kosongkan password
			});
			
			// Load kecamatan list jika role kecamatan
			if (userData.role === "kecamatan") {
				fetchKecamatanList();
			}
			
			// Load desa list jika role desa
			if (userData.role === "desa") {
				fetchDesaList();
			}
		}
	}, [isOpen, userData]);

	// Fetch kecamatan list
	const fetchKecamatanList = async () => {
		setLoadingKecamatan(true);
		try {
			const response = await api.get("/kecamatan");
			setKecamatanList(response.data.data || []);
		} catch (error) {
			console.error("Error fetching kecamatan:", error);
			toast.error("Gagal memuat data kecamatan");
		} finally {
			setLoadingKecamatan(false);
		}
	};

	// Fetch desa list
	const fetchDesaList = async () => {
		setLoadingDesa(true);
		try {
			const response = await api.get("/desa");
			setDesaList(response.data.data || []);
		} catch (error) {
			console.error("Error fetching desa:", error);
			toast.error("Gagal memuat data desa");
		} finally {
			setLoadingDesa(false);
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		
		if (!formData.name || !formData.email) {
			toast.error("Nama dan email harus diisi");
			return;
		}

		// Validasi berdasarkan role
		if (formData.role === "kecamatan" && !formData.kecamatan_id) {
			toast.error("Pilih kecamatan terlebih dahulu");
			return;
		}

		if (formData.role === "desa" && !formData.desa_id) {
			toast.error("Pilih desa terlebih dahulu");
			return;
		}

		setLoading(true);
		try {
			const token = localStorage.getItem("expressToken");
			
			// Siapkan data untuk update
			const updateData = {
				name: formData.name,
				email: formData.email,
			};

			// Tambahkan kecamatan_id atau desa_id sesuai role
			if (formData.role === "kecamatan") {
				updateData.kecamatan_id = parseInt(formData.kecamatan_id);
			} else if (formData.role === "desa") {
				updateData.desa_id = parseInt(formData.desa_id);
			}

			// Tambahkan password jika diisi
			if (formData.password && formData.password.trim() !== "") {
				updateData.password = formData.password;
			}

			await api.put(`/users/${userData.id}`, updateData, {
				headers: { Authorization: `Bearer ${token}` },
			});

			toast.success("User berhasil diupdate");
			onUserEdited();
			handleClose();
		} catch (error) {
			console.error("Error updating user:", error);
			toast.error(
				error.response?.data?.message || "Gagal mengupdate user. Silakan coba lagi."
			);
		} finally {
			setLoading(false);
		}
	};

	const handleClose = () => {
		if (!loading) {
			setFormData({
				name: "",
				email: "",
				role: "",
				kecamatan_id: "",
				desa_id: "",
				password: "",
			});
			onClose();
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
			<div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
				{/* Header */}
				<div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-xl font-bold">Edit User</h2>
							<p className="text-blue-100 text-sm mt-1">
								Update informasi user {userData?.name}
							</p>
						</div>
						<button
							onClick={handleClose}
							disabled={loading}
							className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
						>
							<LuX className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="p-6 space-y-4">
					{/* Nama */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							<LuUser className="inline w-4 h-4 mr-1" />
							Nama Lengkap
						</label>
						<input
							type="text"
							value={formData.name}
							onChange={(e) =>
								setFormData({ ...formData, name: e.target.value })
							}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
							placeholder="Masukkan nama lengkap"
							required
							disabled={loading}
						/>
					</div>

					{/* Email */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							<LuMail className="inline w-4 h-4 mr-1" />
							Email
						</label>
						<input
							type="email"
							value={formData.email}
							onChange={(e) =>
								setFormData({ ...formData, email: e.target.value })
							}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
							placeholder="Masukkan email"
							required
							disabled={loading}
						/>
					</div>

					{/* Role - Disabled, tidak bisa diubah */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							<LuMapPin className="inline w-4 h-4 mr-1" />
							Role
						</label>
						<input
							type="text"
							value={
								formData.role === "kecamatan"
									? "Kecamatan"
									: formData.role === "desa"
									? "Desa"
									: formData.role
							}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
							disabled
						/>
						<p className="text-xs text-gray-500 mt-1">
							Role tidak dapat diubah
						</p>
					</div>

					{/* Kecamatan - Jika role kecamatan */}
					{formData.role === "kecamatan" && (
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								<LuBuilding2 className="inline w-4 h-4 mr-1" />
								Kecamatan
							</label>
							<select
								value={formData.kecamatan_id}
								onChange={(e) =>
									setFormData({ ...formData, kecamatan_id: e.target.value })
								}
								className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
								required
								disabled={loading || loadingKecamatan}
							>
								<option value="">
									{loadingKecamatan ? "Memuat..." : "Pilih Kecamatan"}
								</option>
								{kecamatanList.map((kec) => (
									<option key={kec.id} value={kec.id}>
										{kec.nama}
									</option>
								))}
							</select>
						</div>
					)}

					{/* Desa - Jika role desa */}
					{formData.role === "desa" && (
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								<LuBuilding2 className="inline w-4 h-4 mr-1" />
								Desa/Kelurahan
							</label>
							<select
								value={formData.desa_id}
								onChange={(e) =>
									setFormData({ ...formData, desa_id: e.target.value })
								}
								className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
								required
								disabled={loading || loadingDesa}
							>
								<option value="">
									{loadingDesa ? "Memuat..." : "Pilih Desa/Kelurahan"}
								</option>
								{desaList.map((desa) => (
									<option key={desa.id} value={desa.id}>
										{desa.nama} ({desa.status_pemerintahan || "Desa"})
									</option>
								))}
							</select>
						</div>
					)}

					{/* Password - Optional */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							<LuLock className="inline w-4 h-4 mr-1" />
							Password Baru (Opsional)
						</label>
						<input
							type="password"
							value={formData.password}
							onChange={(e) =>
								setFormData({ ...formData, password: e.target.value })
							}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
							placeholder="Kosongkan jika tidak ingin mengubah password"
							disabled={loading}
							minLength={6}
						/>
						<p className="text-xs text-gray-500 mt-1">
							Minimal 6 karakter. Kosongkan jika tidak ingin mengubah password.
						</p>
					</div>

					{/* Buttons */}
					<div className="flex gap-3 pt-4">
						<button
							type="button"
							onClick={handleClose}
							disabled={loading}
							className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
						>
							Batal
						</button>
						<button
							type="submit"
							disabled={loading}
							className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-blue-500/30"
						>
							{loading ? (
								<span className="flex items-center justify-center gap-2">
									<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
									Menyimpan...
								</span>
							) : (
								"Simpan Perubahan"
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default EditUserModal;
