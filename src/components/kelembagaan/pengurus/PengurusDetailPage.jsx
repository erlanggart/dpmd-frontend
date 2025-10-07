import React, { useState, useEffect } from "react";
import {
	getPengurusDetail,
	updatePengurusStatus,
} from "../../../services/pengurus";
import { useAuth } from "../../../context/AuthContext";
import Swal from "sweetalert2";

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const PengurusDetailPage = ({
	pengurusId,
	onClose,
	onEdit,
	onStatusUpdate,
}) => {
	const { user } = useAuth();
	const [pengurus, setPengurus] = useState(null);
	const [loading, setLoading] = useState(true);
	const [updating, setUpdating] = useState(false);

	const isAdmin = user?.role === "admin_kabupaten";
	const isUserDesa = user?.role === "desa";
	const isAdminBidang = user?.role === "pemberdayaan_masyarakat";
	const isSuperAdmin = user?.role === "superadmin";

	const canManagePengurus =
		isAdmin || isUserDesa || isAdminBidang || isSuperAdmin;

	useEffect(() => {
		loadPengurusDetail();
	}, [pengurusId]);

	const loadPengurusDetail = async () => {
		if (!pengurusId) return;

		setLoading(true);
		try {
			const response = await getPengurusDetail(pengurusId);
			setPengurus(response?.data?.data || null);
		} catch (error) {
			console.error("Error loading pengurus detail:", error);
			Swal.fire({
				title: "Error!",
				text: "Gagal memuat detail pengurus",
				icon: "error",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleStatusChange = async (newStatus) => {
		if (!pengurus) return;

		const result = await Swal.fire({
			title: `${newStatus === "aktif" ? "Aktifkan" : "Nonaktifkan"} Pengurus?`,
			text: `Apakah Anda yakin ingin ${
				newStatus === "aktif" ? "mengaktifkan kembali" : "menonaktifkan"
			} ${pengurus.nama_lengkap}?`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Ya, Ubah Status",
			cancelButtonText: "Batal",
			confirmButtonColor: newStatus === "aktif" ? "#059669" : "#DC2626",
		});

		if (!result.isConfirmed) return;

		let endDate = null;
		if (newStatus === "selesai") {
			const { value: inputDate } = await Swal.fire({
				title: "Tanggal Berakhir Jabatan",
				html: '<input id="endDate" type="date" class="swal2-input" required>',
				focusConfirm: false,
				preConfirm: () => {
					const date = document.getElementById("endDate").value;
					if (!date) {
						Swal.showValidationMessage("Tanggal berakhir jabatan diperlukan");
					}
					return date;
				},
			});

			if (!inputDate) return;
			endDate = inputDate;
		}

		setUpdating(true);
		try {
			await updatePengurusStatus(pengurus.id, newStatus, endDate);

			Swal.fire({
				title: "Berhasil!",
				text: `Status pengurus berhasil diubah`,
				icon: "success",
			});

			// Reload data
			await loadPengurusDetail();

			// Notify parent component
			onStatusUpdate?.();
		} catch (error) {
			console.error("Error updating status:", error);
			Swal.fire({
				title: "Error!",
				text: "Gagal mengubah status pengurus",
				icon: "error",
			});
		} finally {
			setUpdating(false);
		}
	};

	const formatDate = (dateString) => {
		if (!dateString) return "-";
		return new Date(dateString).toLocaleDateString("id-ID", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	const calculateAge = (birthDate) => {
		if (!birthDate) return "-";
		const today = new Date();
		const birth = new Date(birthDate);
		let age = today.getFullYear() - birth.getFullYear();
		const monthDiff = today.getMonth() - birth.getMonth();

		if (
			monthDiff < 0 ||
			(monthDiff === 0 && today.getDate() < birth.getDate())
		) {
			age--;
		}

		return `${age} tahun`;
	};

	if (loading) {
		return (
			<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
				<div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
					<div className="p-6">
						<div className="animate-pulse">
							<div className="flex items-center space-x-4 mb-6">
								<div className="w-24 h-24 bg-gray-200 rounded-full"></div>
								<div className="flex-1">
									<div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
									<div className="h-4 bg-gray-200 rounded w-1/4"></div>
								</div>
							</div>
							<div className="grid grid-cols-2 gap-4">
								{[1, 2, 3, 4, 5, 6].map((i) => (
									<div key={i} className="space-y-2">
										<div className="h-4 bg-gray-200 rounded w-1/3"></div>
										<div className="h-6 bg-gray-200 rounded w-2/3"></div>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (!pengurus) {
		return (
			<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
				<div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">
						Data Tidak Ditemukan
					</h3>
					<p className="text-gray-600 mb-6">
						Pengurus yang Anda cari tidak ditemukan.
					</p>
					<button
						onClick={onClose}
						className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
					>
						Tutup
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-4">
							{pengurus.avatar ? (
								<img
									src={`${imageBaseUrl}/uploads/${pengurus.avatar}`}
									alt={pengurus.nama_lengkap}
									className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
								/>
							) : (
								<div className="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
									<span className="text-gray-600 font-bold text-2xl">
										{pengurus.nama_lengkap.charAt(0).toUpperCase()}
									</span>
								</div>
							)}
							<div>
								<h2 className="text-2xl font-bold text-gray-900">
									{pengurus.nama_lengkap}
								</h2>
								<p className="text-lg text-blue-600 font-semibold">
									{pengurus.jabatan}
								</p>
								<div className="flex items-center space-x-2 mt-1">
									<span
										className={`px-2 py-1 rounded-full text-xs font-medium ${
											pengurus.status_jabatan === "aktif"
												? "bg-green-100 text-green-800"
												: "bg-gray-100 text-gray-800"
										}`}
									>
										{pengurus.status_jabatan === "aktif" ? "Aktif" : "Selesai"}
									</span>
									<span
										className={`px-2 py-1 rounded-full text-xs font-medium ${
											pengurus.status_verifikasi === "verified"
												? "bg-blue-100 text-blue-800"
												: "bg-yellow-100 text-yellow-800"
										}`}
									>
										{pengurus.status_verifikasi === "verified"
											? "Terverifikasi"
											: "Belum Verifikasi"}
									</span>
								</div>
							</div>
						</div>
						<button
							onClick={onClose}
							className="text-gray-400 hover:text-gray-600 text-2xl"
						>
							×
						</button>
					</div>
				</div>

				{/* Content */}
				<div className="p-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* Personal Information */}
						<div className="space-y-4">
							<h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
								Informasi Pribadi
							</h3>

							<div className="space-y-3">
								<div>
									<label className="block text-sm font-medium text-gray-500">
										NIK
									</label>
									<p className="text-gray-900">{pengurus.nik || "-"}</p>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-500">
											Tempat Lahir
										</label>
										<p className="text-gray-900">
											{pengurus.tempat_lahir || "-"}
										</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-500">
											Tanggal Lahir
										</label>
										<p className="text-gray-900">
											{pengurus.tanggal_lahir ? (
												<>
													{formatDate(pengurus.tanggal_lahir)}
													<span className="text-gray-500 ml-2">
														({calculateAge(pengurus.tanggal_lahir)})
													</span>
												</>
											) : (
												"-"
											)}
										</p>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-500">
											Jenis Kelamin
										</label>
										<p className="text-gray-900">
											{pengurus.jenis_kelamin || "-"}
										</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-500">
											Status Perkawinan
										</label>
										<p className="text-gray-900">
											{pengurus.status_perkawinan || "-"}
										</p>
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-500">
										Pendidikan
									</label>
									<p className="text-gray-900">{pengurus.pendidikan || "-"}</p>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-500">
										No. Telepon
									</label>
									<p className="text-gray-900">{pengurus.no_telepon || "-"}</p>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-500">
										Alamat
									</label>
									<p className="text-gray-900">{pengurus.alamat || "-"}</p>
								</div>
							</div>
						</div>

						{/* Jabatan Information */}
						<div className="space-y-4">
							<h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
								Informasi Jabatan
							</h3>

							<div className="space-y-3">
								<div>
									<label className="block text-sm font-medium text-gray-500">
										Jabatan
									</label>
									<p className="text-gray-900 font-semibold">
										{pengurus.jabatan}
									</p>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-500">
											Mulai Jabatan
										</label>
										<p className="text-gray-900">
											{formatDate(pengurus.tanggal_mulai_jabatan)}
										</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-500">
											Akhir Jabatan
										</label>
										<p className="text-gray-900">
											{formatDate(pengurus.tanggal_akhir_jabatan)}
										</p>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-500">
											Status Jabatan
										</label>
										<p className="text-gray-900">
											<span
												className={`px-3 py-1 rounded-full text-sm font-medium ${
													pengurus.status_jabatan === "aktif"
														? "bg-green-100 text-green-800"
														: "bg-gray-100 text-gray-800"
												}`}
											>
												{pengurus.status_jabatan === "aktif"
													? "Aktif"
													: "Selesai"}
											</span>
										</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-500">
											Status Verifikasi
										</label>
										<p className="text-gray-900">
											<span
												className={`px-3 py-1 rounded-full text-sm font-medium ${
													pengurus.status_verifikasi === "verified"
														? "bg-blue-100 text-blue-800"
														: "bg-yellow-100 text-yellow-800"
												}`}
											>
												{pengurus.status_verifikasi === "verified"
													? "Terverifikasi"
													: "Belum Verifikasi"}
											</span>
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Action Buttons */}
				{canManagePengurus && (
					<div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
						<div className="flex justify-between">
							<button
								onClick={onClose}
								className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
							>
								Tutup
							</button>
							<div className="flex space-x-3">
								<button
									onClick={() => onEdit?.(pengurus)}
									className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
								>
									Edit Data
								</button>
								{pengurus.status_jabatan === "aktif" ? (
									<button
										onClick={() => handleStatusChange("selesai")}
										disabled={updating}
										className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
									>
										{updating ? "Memproses..." : "Nonaktifkan"}
									</button>
								) : (
									<button
										onClick={() => handleStatusChange("aktif")}
										disabled={updating}
										className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
									>
										{updating ? "Memproses..." : "Aktifkan Kembali"}
									</button>
								)}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default PengurusDetailPage;
