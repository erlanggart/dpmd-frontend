// src/components/EditRoleModal.jsx
import React, { useState, useEffect } from "react";
import { LuX, LuShield, LuSave } from "react-icons/lu";
import api from "../api";
import Swal from "sweetalert2";

const EditRoleModal = ({ isOpen, onClose, onRoleUpdated, userData }) => {
	const [selectedRole, setSelectedRole] = useState("");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (isOpen && userData) {
			setSelectedRole(userData.role || "");
		}
	}, [isOpen, userData]);

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!selectedRole) {
			Swal.fire({
				title: "Perhatian!",
				text: "Pilih role terlebih dahulu",
				icon: "warning",
				confirmButtonText: "OK",
			});
			return;
		}

		setLoading(true);
		try {
			await api.put(`/users/${userData.id}`, {
				role: selectedRole,
			});

			Swal.fire({
				title: "Berhasil!",
				text: `Role untuk ${userData.name} berhasil diupdate!`,
				icon: "success",
				timer: 2000,
				showConfirmButton: false,
			});

			onRoleUpdated();
		} catch (error) {
			console.error("Error updating role:", error);
			Swal.fire({
				title: "Gagal!",
				text: error.response?.data?.message || "Gagal mengupdate role.",
				icon: "error",
				confirmButtonText: "OK",
			});
		} finally {
			setLoading(false);
		}
	};

	if (!isOpen) return null;

	// ⚠️ ROLE OPTIONS - SINKRON 100% DENGAN schema.prisma enum users_role
	// Jangan tambah/kurang role tanpa update schema.prisma!
	const roleOptions = [
		{ value: "superadmin", label: "Super Admin", color: "red" },
		{ value: "kepala_dinas", label: "Kepala Dinas", color: "blue" },
		{ value: "sekretaris_dinas", label: "Sekretaris Dinas", color: "indigo" },
		{ value: "kepala_bidang", label: "Kepala Bidang", color: "green" },
		{ value: "ketua_tim", label: "Ketua Tim", color: "teal" },
		{ value: "pegawai", label: "Pegawai/Staff", color: "gray" },
		{ value: "sekretariat", label: "Sekretariat", color: "purple" },
		{ value: "sarana_prasarana", label: "Sarana Prasarana", color: "cyan" },
		{ value: "kekayaan_keuangan", label: "Kekayaan Keuangan", color: "pink" },
		{ value: "pemberdayaan_masyarakat", label: "Pemberdayaan Masyarakat", color: "yellow" },
		{ value: "pemerintahan_desa", label: "Pemerintahan Desa", color: "indigo" },
		{ value: "desa", label: "Admin Desa", color: "emerald" },
		{ value: "kecamatan", label: "Admin Kecamatan", color: "violet" },
	];

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
					<div className="flex items-center gap-3">
						<div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
							<LuShield className="h-6 w-6 text-white" />
						</div>
						<div>
							<h3 className="text-xl font-bold text-gray-900">Edit Role</h3>
							<p className="text-sm text-gray-600">Ubah role user</p>
						</div>
					</div>
					<button
						onClick={onClose}
						disabled={loading}
						className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-white/50 transition-colors disabled:opacity-50"
					>
						<LuX className="h-5 w-5 text-gray-500" />
					</button>
				</div>

				{/* Content */}
				<form onSubmit={handleSubmit} className="p-6">
					{/* User Info */}
					<div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
						<p className="text-sm text-gray-600 mb-1">User</p>
						<p className="font-bold text-gray-900 text-lg">{userData?.name}</p>
						<p className="text-sm text-gray-500">{userData?.email}</p>
					</div>

					{/* Role Selection */}
					<div className="mb-6">
						<label className="block text-sm font-semibold text-gray-700 mb-3">
							<LuShield className="inline w-4 h-4 mr-1" />
							Pilih Role Baru
						</label>
						<select
							value={selectedRole}
							onChange={(e) => setSelectedRole(e.target.value)}
							className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base font-medium"
							disabled={loading}
							required
						>
							<option value="">-- Pilih Role --</option>
							{roleOptions.map((role) => (
								<option key={role.value} value={role.value}>
									{role.label}
								</option>
							))}
						</select>
					</div>

					{/* Info Box */}
					<div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
						<div className="flex items-start gap-2">
							<LuShield className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
							<div className="text-sm text-yellow-800">
								<p className="font-semibold mb-1">Perhatian!</p>
								<p>
									Perubahan role akan mengubah hak akses user di sistem. Pastikan
									role yang dipilih sudah sesuai.
								</p>
							</div>
						</div>
					</div>

					{/* Action Buttons */}
					<div className="flex gap-3">
						<button
							type="button"
							onClick={onClose}
							disabled={loading}
							className="flex-1 px-5 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
						>
							Batal
						</button>
						<button
							type="submit"
							disabled={loading}
							className="flex-1 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/30 font-semibold flex items-center justify-center gap-2"
						>
							{loading ? (
								<>
									<div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
									Menyimpan...
								</>
							) : (
								<>
									<LuSave className="h-5 w-5" />
									Simpan Perubahan
								</>
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default EditRoleModal;
