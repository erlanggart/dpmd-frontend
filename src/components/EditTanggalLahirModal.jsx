// src/components/EditTanggalLahirModal.jsx
import React, { useState, useEffect } from "react";
import { LuX, LuCalendar, LuSave, LuMapPin } from "react-icons/lu";
import api from "../api";
import Swal from "sweetalert2";

const EditTanggalLahirModal = ({ isOpen, onClose, onUpdated, userData }) => {
	const [tanggalLahir, setTanggalLahir] = useState("");
	const [tempatLahir, setTempatLahir] = useState("");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (isOpen && userData) {
			// Format existing date for input[type="date"]
			if (userData.tanggal_lahir) {
				const date = new Date(userData.tanggal_lahir);
				const formatted = date.toISOString().split("T")[0];
				setTanggalLahir(formatted);
			} else {
				setTanggalLahir("");
			}
			setTempatLahir(userData.tempat_lahir || "");
		}
	}, [isOpen, userData]);

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!tanggalLahir) {
			Swal.fire({
				title: "Perhatian!",
				text: "Tanggal lahir wajib diisi",
				icon: "warning",
				confirmButtonText: "OK",
			});
			return;
		}

		setLoading(true);
		try {
			await api.put(`/users/${userData.id}`, {
				tanggal_lahir: tanggalLahir,
				tempat_lahir: tempatLahir,
			});

			Swal.fire({
				title: "Berhasil!",
				text: `Tanggal lahir untuk ${userData.name} berhasil diupdate!`,
				icon: "success",
				timer: 2000,
				showConfirmButton: false,
			});

			onUpdated();
		} catch (error) {
			console.error("Error updating tanggal lahir:", error);
			Swal.fire({
				title: "Gagal!",
				text: error.response?.data?.message || "Gagal mengupdate tanggal lahir.",
				icon: "error",
				confirmButtonText: "OK",
			});
		} finally {
			setLoading(false);
		}
	};

	if (!isOpen) return null;

	// z-[70]: di atas panel rincian pengguna (z-[60]) dan bilah nav HP (z-50)
	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
			<div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50">
					<div className="flex items-center gap-3">
						<div className="h-12 w-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
							<LuCalendar className="h-6 w-6 text-white" />
						</div>
						<div>
					<h3 className="text-xl font-bold text-gray-900">Edit Tempat & Tanggal Lahir</h3>
						<p className="text-sm text-gray-600">Ubah tempat dan tanggal lahir pegawai</p>
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
						<p className="text-sm text-gray-600 mb-1">Pegawai</p>
						<p className="font-bold text-gray-900 text-lg">{userData?.name}</p>
						<p className="text-sm text-gray-500">{userData?.email}</p>
						{userData?.tanggal_lahir && (
							<div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
								<LuCalendar className="h-3 w-3" />
								{new Date(userData.tanggal_lahir).toLocaleDateString("id-ID", {
									day: "numeric",
									month: "long",
									year: "numeric",
								})}
							</div>
						)}
					</div>

					{/* Date Input */}
					<div className="mb-6">
						<label className="block text-sm font-semibold text-gray-700 mb-3">
							<LuMapPin className="inline w-4 h-4 mr-1" />
							Tempat Lahir
						</label>
						<input
							type="text"
							value={tempatLahir}
							onChange={(e) => setTempatLahir(e.target.value)}
							className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-base font-medium"
							disabled={loading}
							placeholder="Contoh: Bogor"
						/>
					</div>

					{/* Date Input */}
					<div className="mb-6">
						<label className="block text-sm font-semibold text-gray-700 mb-3">
							<LuCalendar className="inline w-4 h-4 mr-1" />
							Tanggal Lahir
						</label>
						<input
							type="date"
							value={tanggalLahir}
							onChange={(e) => setTanggalLahir(e.target.value)}
							className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-base font-medium"
							disabled={loading}
							max={new Date().toISOString().split("T")[0]}
							required
						/>
					</div>

					{/* Action Buttons */}
					<div className="flex gap-3">
						<button
							type="button"
							onClick={onClose}
							disabled={loading}
							className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all disabled:opacity-50"
						>
							Batal
						</button>
						<button
							type="submit"
							disabled={loading}
							className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
						>
							{loading ? (
								<>
									<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
									<span>Menyimpan...</span>
								</>
							) : (
								<>
									<LuSave className="h-5 w-5" />
									<span>Simpan</span>
								</>
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default EditTanggalLahirModal;
