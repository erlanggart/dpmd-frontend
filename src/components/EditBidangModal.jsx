// src/components/EditBidangModal.jsx
import React, { useState, useEffect } from "react";
import { LuX, LuBuilding2, LuSave } from "react-icons/lu";
import api from "../api";
import Swal from "sweetalert2";

const EditBidangModal = ({ isOpen, onClose, onBidangUpdated, userData }) => {
	const [selectedBidang, setSelectedBidang] = useState("");
	const [bidangList, setBidangList] = useState([]);
	const [loading, setLoading] = useState(false);
	const [loadingBidang, setLoadingBidang] = useState(true);

	useEffect(() => {
		if (isOpen) {
			fetchBidangList();
			if (userData) {
				setSelectedBidang(userData.bidang_id ? userData.bidang_id.toString() : "");
			}
		}
	}, [isOpen, userData]);

	const fetchBidangList = async () => {
		try {
			setLoadingBidang(true);
			const response = await api.get("/bidang");
			// Handle both response.data and response.data.data formats
			const data = response.data?.data || response.data || [];
			setBidangList(Array.isArray(data) ? data : []);
		} catch (error) {
			console.error("Error fetching bidang list:", error);
			setBidangList([]); // Set empty array on error
			Swal.fire({
				title: "Gagal!",
				text: "Gagal memuat daftar bidang",
				icon: "error",
				confirmButtonText: "OK",
			});
		} finally {
			setLoadingBidang(false);
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!selectedBidang) {
			Swal.fire({
				title: "Perhatian!",
				text: "Pilih bidang terlebih dahulu atau pilih 'Tidak Ada' jika user tidak memiliki bidang",
				icon: "warning",
				confirmButtonText: "OK",
			});
			return;
		}

		setLoading(true);
		try {
			const bidangId = selectedBidang === "null" ? null : parseInt(selectedBidang);
			
			await api.put(`/users/${userData.id}`, {
				bidang_id: bidangId,
			});

			Swal.fire({
				title: "Berhasil!",
				text: `Bidang untuk ${userData.name} berhasil diupdate!`,
				icon: "success",
				timer: 2000,
				showConfirmButton: false,
			});

			onBidangUpdated();
		} catch (error) {
			console.error("Error updating bidang:", error);
			Swal.fire({
				title: "Gagal!",
				text: error.response?.data?.message || "Gagal mengupdate bidang.",
				icon: "error",
				confirmButtonText: "OK",
			});
		} finally {
			setLoading(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
					<div className="flex items-center gap-3">
						<div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
							<LuBuilding2 className="h-6 w-6 text-white" />
						</div>
						<div>
							<h3 className="text-xl font-bold text-gray-900">Edit Bidang</h3>
							<p className="text-sm text-gray-600">Ubah bidang user</p>
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
						{userData?.bidang && (
							<div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
								<LuBuilding2 className="h-3 w-3" />
								{userData.bidang.nama}
							</div>
						)}
					</div>

					{/* Bidang Selection */}
					<div className="mb-6">
						<label className="block text-sm font-semibold text-gray-700 mb-3">
							<LuBuilding2 className="inline w-4 h-4 mr-1" />
							Pilih Bidang
						</label>
						{loadingBidang ? (
							<div className="flex items-center justify-center py-8">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
							</div>
						) : (
							<select
								value={selectedBidang}
								onChange={(e) => setSelectedBidang(e.target.value)}
								className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-base font-medium"
								disabled={loading}
								required
							>
								<option value="">-- Pilih Bidang --</option>
								<option value="null">Tidak Ada Bidang</option>
								{bidangList.map((bidang) => (
									<option key={bidang.id} value={bidang.id}>
										{bidang.nama}
									</option>
								))}
							</select>
						)}
					</div>

					{/* Info Box */}
					<div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-xl">
						<div className="flex items-start gap-2">
							<LuBuilding2 className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
							<div className="text-sm text-purple-800">
								<p className="font-semibold mb-1">Informasi</p>
								<p>
									Bidang menentukan unit kerja dari pegawai DPMD. Jika user adalah admin desa/kecamatan, pilih "Tidak Ada Bidang".
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
							className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all disabled:opacity-50"
						>
							Batal
						</button>
						<button
							type="submit"
							disabled={loading || loadingBidang}
							className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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

export default EditBidangModal;
