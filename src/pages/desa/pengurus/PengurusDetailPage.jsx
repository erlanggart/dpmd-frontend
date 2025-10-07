import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
	getPengurusById,
	updatePengurusStatus,
} from "../../../services/pengurus";
import { useAuth } from "../../../context/AuthContext";
import {
	FaArrowLeft,
	FaEdit,
	FaUser,
	FaPhone,
	FaMapMarkerAlt,
	FaCalendarAlt,
	FaFileAlt,
} from "react-icons/fa";
import Swal from "sweetalert2";

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const PengurusDetailPage = () => {
	const { pengurusId } = useParams();
	const navigate = useNavigate();
	const { user } = useAuth();

	const [pengurus, setPengurus] = useState(null);
	const [loading, setLoading] = useState(true);
	const [updating, setUpdating] = useState(false);

	// Check permissions
	const isAdmin = user?.role === "admin_kabupaten";
	const isUserDesa = user?.role === "desa";
	const isAdminBidang = user?.role === "pemberdayaan_masyarakat";
	const isSuperAdmin = user?.role === "superadmin";
	const canManage = isAdmin || isUserDesa || isAdminBidang || isSuperAdmin;

	useEffect(() => {
		loadPengurusDetail();
	}, [pengurusId]);

	const loadPengurusDetail = async () => {
		if (!pengurusId) return;

		setLoading(true);
		try {
			const response = await getPengurusById(pengurusId);
			setPengurus(response?.data?.data || null);
		} catch (error) {
			console.error("Error loading pengurus detail:", error);
			Swal.fire({
				icon: "error",
				title: "Gagal",
				text: "Gagal memuat detail pengurus",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleStatusUpdate = async (newStatus) => {
		const result = await Swal.fire({
			title: `${
				newStatus === "selesai" ? "Nonaktifkan" : "Aktifkan"
			} Pengurus?`,
			text: `Apakah Anda yakin ingin ${
				newStatus === "selesai" ? "menonaktifkan" : "mengaktifkan"
			} pengurus ini?`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Ya, lanjutkan",
			cancelButtonText: "Batal",
			confirmButtonColor: newStatus === "selesai" ? "#dc2626" : "#059669",
		});

		if (!result.isConfirmed) return;

		setUpdating(true);
		try {
			await updatePengurusStatus(pengurusId, newStatus);

			await Swal.fire({
				icon: "success",
				title: "Berhasil",
				text: `Status pengurus berhasil ${
					newStatus === "selesai" ? "dinonaktifkan" : "diaktifkan"
				}`,
				timer: 2000,
				showConfirmButton: false,
			});

			// Reload data
			loadPengurusDetail();
		} catch (error) {
			console.error("Error updating status:", error);
			Swal.fire({
				icon: "error",
				title: "Gagal",
				text: "Gagal mengubah status pengurus",
			});
		} finally {
			setUpdating(false);
		}
	};

	const handleEdit = () => {
		// Navigate to edit page or show edit modal
		navigate(`/desa/pengurus/${pengurusId}/edit`);
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Memuat detail pengurus...</p>
				</div>
			</div>
		);
	}

	if (!pengurus) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<p className="text-gray-600 mb-4">Data pengurus tidak ditemukan</p>
					<button
						onClick={() => navigate(-1)}
						className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
					>
						Kembali
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="bg-white shadow">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between py-4">
						<div className="flex items-center space-x-4">
							<button
								onClick={() => navigate(-1)}
								className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
								title="Kembali"
							>
								<FaArrowLeft className="text-gray-600" />
							</button>
							<div>
								<h1 className="text-2xl font-bold text-gray-900">
									Detail Pengurus
								</h1>
								<p className="text-sm text-gray-500">
									Informasi lengkap pengurus kelembagaan
								</p>
							</div>
						</div>

						{canManage && (
							<div className="flex items-center space-x-3">
								<button
									onClick={handleEdit}
									className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
								>
									<FaEdit className="text-sm" />
									<span>Edit</span>
								</button>

								<button
									onClick={() =>
										handleStatusUpdate(
											pengurus.status_jabatan === "aktif" ? "selesai" : "aktif"
										)
									}
									disabled={updating}
									className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
										pengurus.status_jabatan === "aktif"
											? "bg-red-100 text-red-700 hover:bg-red-200"
											: "bg-green-100 text-green-700 hover:bg-green-200"
									}`}
								>
									{updating
										? "Memproses..."
										: pengurus.status_jabatan === "aktif"
										? "Nonaktifkan"
										: "Aktifkan"}
								</button>
							</div>
						)}
					</div>
				</div>
			</div>

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Profile Card */}
					<div className="lg:col-span-1">
						<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
							<div className="text-center">
								<div className="relative inline-block">
									{pengurus.avatar ? (
										<img
											src={`${imageBaseUrl}/uploads/${pengurus.avatar}`}
											alt={pengurus.nama_lengkap}
											className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-white shadow-lg"
										/>
									) : (
										<div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center mx-auto border-4 border-white shadow-lg">
											<FaUser className="text-gray-400 text-4xl" />
										</div>
									)}

									<div
										className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-2 border-white ${
											pengurus.status_jabatan === "aktif"
												? "bg-green-500"
												: "bg-red-500"
										}`}
										title={`Status: ${pengurus.status_jabatan}`}
									></div>
								</div>

								<div className="mt-4">
									<h2 className="text-2xl font-bold text-gray-900">
										{pengurus.nama_lengkap}
									</h2>
									<p className="text-lg text-indigo-600 font-medium mt-1">
										{pengurus.jabatan}
									</p>
									<div className="mt-2">
										<span
											className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
												pengurus.status_jabatan === "aktif"
													? "bg-green-100 text-green-800"
													: "bg-red-100 text-red-800"
											}`}
										>
											{pengurus.status_jabatan === "aktif"
												? "Aktif"
												: "Selesai"}
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Details */}
					<div className="lg:col-span-2 space-y-6">
						{/* Personal Information */}
						<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
							<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
								<FaUser className="mr-2 text-indigo-600" />
								Informasi Pribadi
							</h3>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										NIK
									</label>
									<p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
										{pengurus.nik || "-"}
									</p>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Jenis Kelamin
									</label>
									<p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
										{pengurus.jenis_kelamin || "-"}
									</p>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Tempat Lahir
									</label>
									<p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
										{pengurus.tempat_lahir || "-"}
									</p>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Tanggal Lahir
									</label>
									<p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
										{pengurus.tanggal_lahir
											? new Date(pengurus.tanggal_lahir).toLocaleDateString(
													"id-ID"
											  )
											: "-"}
									</p>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Status Perkawinan
									</label>
									<p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
										{pengurus.status_perkawinan || "-"}
									</p>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Pendidikan
									</label>
									<p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
										{pengurus.pendidikan || "-"}
									</p>
								</div>
							</div>
						</div>

						{/* Contact Information */}
						<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
							<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
								<FaPhone className="mr-2 text-indigo-600" />
								Informasi Kontak
							</h3>

							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										No. Telepon
									</label>
									<p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
										{pengurus.no_telepon || "-"}
									</p>
								</div>

								<div>
									<label className="flex items-center text-sm font-medium text-gray-700 mb-1">
										<FaMapMarkerAlt className="mr-1" />
										Alamat
									</label>
									<p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
										{pengurus.alamat || "-"}
									</p>
								</div>
							</div>
						</div>

						{/* Position Information */}
						<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
							<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
								<FaCalendarAlt className="mr-2 text-indigo-600" />
								Informasi Jabatan
							</h3>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Tanggal Mulai Jabatan
									</label>
									<p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
										{pengurus.tanggal_mulai_jabatan
											? new Date(
													pengurus.tanggal_mulai_jabatan
											  ).toLocaleDateString("id-ID")
											: "-"}
									</p>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Tanggal Akhir Jabatan
									</label>
									<p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
										{pengurus.tanggal_akhir_jabatan
											? new Date(
													pengurus.tanggal_akhir_jabatan
											  ).toLocaleDateString("id-ID")
											: "-"}
									</p>
								</div>

								<div className="md:col-span-2">
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Status Verifikasi
									</label>
									<div className="flex items-center space-x-2">
										<span
											className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
												pengurus.status_verifikasi === "verified"
													? "bg-green-100 text-green-800"
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
						</div>

						{/* Legal Document */}
						{pengurus.sk_produk_hukum && (
							<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
								<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
									<FaFileAlt className="mr-2 text-indigo-600" />
									Dokumen Hukum
								</h3>

								<div className="space-y-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Nomor SK
										</label>
										<p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
											{pengurus.sk_produk_hukum.nomor}/
											{pengurus.sk_produk_hukum.tahun}
										</p>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Judul SK
										</label>
										<p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
											{pengurus.sk_produk_hukum.judul}
										</p>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default PengurusDetailPage;
