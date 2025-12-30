import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
	getPengurusById,
	updatePengurusStatus,
} from "../../../services/pengurus";
import { getProdukHukums } from "../../../services/api";
import { 
	getRw, 
	getRt, 
	getPosyandu, 
	getKarangTaruna, 
	getLpm, 
	getPkk, 
	getSatlinmas 
} from "../../../services/kelembagaan";
import { useAuth } from "../../../context/AuthContext";
import { useEditMode } from "../../../context/EditModeContext";
import {
	FaArrowLeft,
	FaEdit,
	FaUser,
	FaPhone,
	FaMapMarkerAlt,
	FaCalendarAlt,
	FaFileAlt,
	FaExternalLinkAlt,
	FaChevronRight,
	FaHome,
	FaLock,
	FaLockOpen,
} from "react-icons/fa";
import Swal from "sweetalert2";

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

// Helper function to convert pengurusable_type (table name) to route type
const getRouteType = (pengurusableType) => {
	const mapping = {
		'rws': 'rw',
		'rts': 'rt',
		'posyandus': 'posyandu',
		'karang_tarunas': 'karang-taruna',
		'lpms': 'lpm',
		'pkks': 'pkk',
		'satlinmas': 'satlinmas'
	};
	return mapping[pengurusableType] || pengurusableType;
};

// Helper function to get display name
const getDisplayName = (pengurusableType) => {
	const mapping = {
		'rws': 'RW',
		'rts': 'RT',
		'posyandus': 'Posyandu',
		'karang_tarunas': 'Karang Taruna',
		'lpms': 'LPM',
		'pkks': 'PKK',
		'satlinmas': 'Satlinmas'
	};
	return mapping[pengurusableType] || pengurusableType;
};

// Helper function to determine correct routing based on user role
const getPengurusRoutePath = (user, pengurusId, action = "") => {
	const isSuperAdmin = user?.role === "superadmin";
	const isAdminBidang = ["pemberdayaan_masyarakat", "pmd"].includes(user?.role);

	if (isSuperAdmin || isAdminBidang) {
		return `/dashboard/pengurus/${pengurusId}${action ? `/${action}` : ""}`;
	}

	// Default for desa users
	return `/desa/pengurus/${pengurusId}${action ? `/${action}` : ""}`;
};

const PengurusDetailPage = () => {
	const params = useParams();
	const pengurusId = params.id; // Changed from destructuring to direct access
	const navigate = useNavigate();
	const { user } = useAuth();
	const { isEditMode } = useEditMode();

	console.log('🔧 All params:', params);
	console.log('🆔 Pengurus ID:', pengurusId);

	const [pengurus, setPengurus] = useState(null);
	const [kelembagaanInfo, setKelembagaanInfo] = useState(null);
	const [loading, setLoading] = useState(true);
	const [updating, setUpdating] = useState(false);
	const [produkHukumList, setProdukHukumList] = useState([]);

	// Check permissions
	const isAdmin = user?.role === "admin_kabupaten";
	const isUserDesa = user?.role === "desa";
	const isAdminBidang = user?.role === "pemberdayaan_masyarakat";
	const isSuperAdmin = user?.role === "superadmin";
	const canManage = isAdmin || isUserDesa || isAdminBidang || isSuperAdmin;

	const loadProdukHukumList = async () => {
		try {
			const response = await getProdukHukums(1, "");
			const allData = response?.data?.data || [];
			setProdukHukumList(allData.data || []);
		} catch (error) {
			console.error("Error loading produk hukum:", error);
			setProdukHukumList([]);
		}
	};

	const loadKelembagaanInfo = async (pengurusableType, pengurusableId) => {
		try {
			let response;
			// Map table name to appropriate getter function
			switch (pengurusableType) {
				case 'rws':
					response = await getRw(pengurusableId);
					break;
				case 'rts':
					response = await getRt(pengurusableId);
					break;
				case 'posyandus':
					response = await getPosyandu(pengurusableId);
					break;
				case 'karang_tarunas':
					response = await getKarangTaruna(pengurusableId);
					break;
				case 'lpms':
					response = await getLpm(pengurusableId);
					break;
				case 'pkks':
					response = await getPkk(pengurusableId);
					break;
				case 'satlinmas':
					response = await getSatlinmas(pengurusableId);
					break;
				default:
					console.warn('Unknown kelembagaan type:', pengurusableType);
					return;
			}
			
			const kelembagaanData = response?.data?.data;
			setKelembagaanInfo(kelembagaanData || null);
		} catch (error) {
			console.error('Error loading kelembagaan info:', error);
			setKelembagaanInfo(null);
		}
	};

	const loadPengurusDetail = async () => {
		if (!pengurusId) {
			console.log('⚠️ No pengurusId provided');
			return;
		}

		console.log('🔍 Loading pengurus detail for ID:', pengurusId);
		setLoading(true);
		try {
			const response = await getPengurusById(pengurusId);
			console.log('✅ Pengurus detail response:', response);
			const pengurusData = response?.data?.data;
			console.log('📦 Pengurus data:', pengurusData);
			setPengurus(pengurusData || null);
			
			// Load kelembagaan info if pengurus data is available
			if (pengurusData?.pengurusable_type && pengurusData?.pengurusable_id) {
				await loadKelembagaanInfo(pengurusData.pengurusable_type, pengurusData.pengurusable_id);
			}
		} catch (error) {
			console.error('❌ Error loading pengurus detail:', error);
			Swal.fire({
				icon: "error",
				title: "Gagal",
				text: "Gagal memuat detail pengurus",
			});
		} finally {
			console.log('✨ Loading complete, setting loading to false');
			setLoading(false);
		}
	};

	useEffect(() => {
		loadPengurusDetail();
		loadProdukHukumList();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pengurusId]); // Only depend on pengurusId to avoid infinite loop

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
		// Navigate to edit page using role-based routing
		navigate(getPengurusRoutePath(user, pengurusId, "edit"));
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
		<div className="min-h-screen">
			{/* Status Badge */}
			<div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 px-4 py-3">
				<div className="flex items-center justify-between gap-4">
					<span
						className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
							isEditMode
								? "bg-green-100 text-green-700 border border-green-300"
								: "bg-red-100 text-red-700 border border-red-300"
						}`}
					>
						{isEditMode ? (
							<>
								<FaLockOpen className="w-3 h-3" />
								<span>Aplikasi Dibuka</span>
							</>
						) : (
							<>
								<FaLock className="w-3 h-3" />
								<span>Aplikasi Ditutup</span>
							</>
						)}
					</span>
					<div className="text-sm text-gray-600 flex-1">
						{isEditMode ? (
							<span className="text-green-700">
								Fitur edit dan perubahan status pengurus aktif
							</span>
						) : (
							<span className="text-red-700">
								Fitur edit dan perubahan status pengurus ditutup
							</span>
						)}
					</div>
				</div>
			</div>

			{/* Breadcrumb */}
			<div className="bg-white p-2 mb-4 rounded-md shadow-sm">
				<nav className="flex items-center space-x-2 text-sm">
					<Link
						to="/desa/dashboard"
						className="flex items-center text-gray-500 hover:text-indigo-600 transition-colors"
					>
						<FaHome className="mr-1" />
						Dashboard
					</Link>
					<FaChevronRight className="text-gray-400 text-xs" />
					<Link
						to="/desa/kelembagaan"
						className="text-gray-500 hover:text-indigo-600 transition-colors"
					>
						Kelembagaan
					</Link>
					<FaChevronRight className="text-gray-400 text-xs" />
					<Link
						to={`/desa/kelembagaan/${getRouteType(pengurus.pengurusable_type)}`}
						className="text-gray-500 hover:text-indigo-600 transition-colors"
					>
						{getDisplayName(pengurus.pengurusable_type)}
					</Link>
					<FaChevronRight className="text-gray-400 text-xs" />
					<Link
						to={`/desa/kelembagaan/${getRouteType(pengurus.pengurusable_type)}/${pengurus.pengurusable_id}`}
						className="text-gray-500 hover:text-indigo-600 transition-colors"
					>
						{kelembagaanInfo?.nomor || kelembagaanInfo?.nama || 'Detail'}
					</Link>
					<FaChevronRight className="text-gray-400 text-xs" />
					<span className="text-gray-900 font-medium">
						{pengurus.nama_lengkap}
					</span>
				</nav>
			</div>

			{/* Header with Actions */}
			<div className="bg-white flex items-center justify-between p-4 mb-4 rounded-md shadow-sm">
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
							disabled={!isEditMode}
							className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
								isEditMode
									? "bg-indigo-600 text-white hover:bg-indigo-700"
									: "bg-gray-300 text-gray-500 cursor-not-allowed"
							}`}
							title={!isEditMode ? "Fitur edit ditutup" : "Edit pengurus"}
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
							disabled={updating || !isEditMode}
							className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
								!isEditMode
									? "bg-gray-300 text-gray-500"
									: pengurus.status_jabatan === "aktif"
									? "bg-red-100 text-red-700 hover:bg-red-200"
									: "bg-green-100 text-green-700 hover:bg-green-200"
							}`}
							title={!isEditMode ? "Fitur perubahan status ditutup" : ""}
						>
							{updating ? (
								<span>Memproses...</span>
							) : pengurus.status_jabatan === "aktif" ? (
								<span>Nonaktifkan</span>
							) : (
								<span>Aktifkan</span>
							)}
						</button>
					</div>
				)}
			</div>

			{/* Main Content */}
			<div>
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Profile Card */}
					<div className="lg:col-span-1 space-y-4">
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

						{/* SK Pengangkatan */}
						<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
							<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
								<FaFileAlt className="mr-2 text-indigo-600" />
								SK Pengangkatan Pengurus
							</h3>

							{pengurus.produk_hukum_id &&
							produkHukumList.find(
								(ph) => ph.id === pengurus.produk_hukum_id
							) ? (
								<div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-100 border border-emerald-200 hover:shadow-md transition-shadow duration-300">
									<div className="flex items-start space-x-3">
										<div className="mt-1">
											<svg
												className="w-5 h-5 text-emerald-600"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
												/>
											</svg>
										</div>
										<div className="flex-1">
											{(() => {
												const ph = produkHukumList.find(
													(ph) => ph.id === pengurus.produk_hukum_id
												);
												return (
													<div className="space-y-3">
														<div>
															<h4 className="font-semibold text-emerald-800 text-base mb-1">
																Nomor {ph.nomor} Tahun {ph.tahun}
															</h4>
															<p className="text-gray-700 leading-relaxed text-sm">
																{ph.judul}
															</p>
														</div>

														<div className="flex items-center justify-between pt-2 border-t border-emerald-200">
															<div className="text-xs text-emerald-600">
																<span className="font-medium">Jenis:</span>{" "}
																{ph.jenis}
															</div>
															<button
																onClick={() =>
																	navigate(
																		`/desa/produk-hukum/${pengurus.produk_hukum_id}`
																	)
																}
																className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors duration-200"
															>
																<FaExternalLinkAlt className="w-3 h-3" />
																<span>Lihat Detail SK</span>
															</button>
														</div>
													</div>
												);
											})()}
										</div>
									</div>
								</div>
							) : (
								<div className="p-4 rounded-xl bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200">
									<div className="flex items-start space-x-3">
										<div className="mt-1">
											<svg
												className="w-5 h-5 text-yellow-600"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"
												/>
											</svg>
										</div>
										<div className="flex-1">
											<h4 className="font-semibold text-yellow-800 text-sm mb-1">
												Belum Terhubung dengan SK Pengangkatan
											</h4>
											<p className="text-yellow-700 text-xs">
												Pengurus ini belum memiliki SK pengangkatan yang
												terdaftar. Silakan hubungi admin untuk melengkapi
												dokumen legal.
											</p>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default PengurusDetailPage;
