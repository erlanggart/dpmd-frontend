import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getPengurusById, updatePengurus } from "../../../services/pengurus";
import { getProdukHukums } from "../../../services/api";
import {
	getRw,
	getRt,
	getPosyandu,
	getKarangTaruna,
	getLpm,
	getPkk,
	getSatlinmas,
} from "../../../services/kelembagaan";
import { useAuth } from "../../../context/AuthContext";
import {
	FaArrowLeft,
	FaSave,
	FaFileAlt,
	FaChevronRight,
	FaHome,
} from "react-icons/fa";
import SearchableProdukHukumSelect from "../../../components/shared/SearchableProdukHukumSelect";
import Swal from "sweetalert2";

// Helper function to convert pengurusable_type (table name) to route type
const getRouteType = (pengurusableType) => {
	const mapping = {
		rws: "rw",
		rts: "rt",
		posyandus: "posyandu",
		karang_tarunas: "karang-taruna",
		lpms: "lpm",
		pkks: "pkk",
		satlinmas: "satlinmas",
		"lembaga-lainnya": "lembaga-lainnya",
	};
	return mapping[pengurusableType] || pengurusableType;
};

// Helper function to get display name
const getDisplayName = (pengurusableType) => {
	const mapping = {
		rws: "RW",
		rts: "RT",
		posyandus: "Posyandu",
		karang_tarunas: "Karang Taruna",
		lpms: "LPM",
		pkks: "PKK",
		satlinmas: "Satlinmas",
		"lembaga-lainnya": "Lembaga Lainnya",
	};
	return mapping[pengurusableType] || pengurusableType;
};

const PengurusEditPage = () => {
	const params = useParams();
	const pengurusId = params.id;
	const navigate = useNavigate();
	const { user } = useAuth();

	const [pengurus, setPengurus] = useState(null);
	const [kelembagaanInfo, setKelembagaanInfo] = useState(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [produkHukumList, setProdukHukumList] = useState([]);
	const [formData, setFormData] = useState({
		nama_lengkap: "",
		nik: "",
		tempat_lahir: "",
		tanggal_lahir: "",
		jenis_kelamin: "",
		status_perkawinan: "",
		alamat: "",
		no_telepon: "",
		pendidikan: "",
		agama: "",
		golongan_darah: "",
		jabatan: "",
		tanggal_mulai_jabatan: "",
		tanggal_akhir_jabatan: "",
		produk_hukum_id: "",
		status_verifikasi: "",
	});
	const [avatarFile, setAvatarFile] = useState(null);
	const [avatarPreview, setAvatarPreview] = useState(null);

	// Check permissions using role from useAuth
	const isSuperAdmin = user?.role === "superadmin";
	const isAdminBidangPMD =
		user?.role === "pemberdayaan_masyarakat" ||
		(user?.role === "kepala_bidang" && user?.bidang_id === 5) ||
		(user?.role === "pegawai" && user?.bidang_id === 5);
	const isUserDesa = user?.role === "desa";
	const canEdit = isSuperAdmin || isAdminBidangPMD || isUserDesa;

	// Determine base path based on role
	const getBasePath = () => {
		if (isSuperAdmin || isAdminBidangPMD) {
			return "/bidang/pmd";
		}
		return "/desa";
	};

	const loadProdukHukumList = useCallback(async () => {
		try {
			console.log("📚 Loading produk hukum list...");
			const response = await getProdukHukums(1, "");
			const allData = response?.data?.data || [];
			const list = allData.data || [];
			setProdukHukumList(list);
			console.log(`✓ Loaded ${list.length} produk hukum items`);
		} catch (error) {
			console.error("❌ Error loading produk hukum:", error);
			setProdukHukumList([]);
			// Don't show error alert, just log it (non-critical)
		}
	}, []);

	const loadKelembagaanInfo = useCallback(
		async (pengurusableType, pengurusableId) => {
			try {
				let response;
				// Map table name to appropriate getter function
				switch (pengurusableType) {
					case "rws":
						response = await getRw(pengurusableId);
						break;
					case "rts":
						response = await getRt(pengurusableId);
						break;
					case "posyandus":
						response = await getPosyandu(pengurusableId);
						break;
					case "karang_tarunas":
						response = await getKarangTaruna(pengurusableId);
						break;
					case "lpms":
						response = await getLpm(pengurusableId);
						break;
					case "pkks":
						response = await getPkk(pengurusableId);
						break;
					case "satlinmas":
						response = await getSatlinmas(pengurusableId);
						break;
					default:
						console.warn("Unknown kelembagaan type:", pengurusableType);
						return;
				}

				const kelembagaanData = response?.data?.data;
				setKelembagaanInfo(kelembagaanData || null);
			} catch (error) {
				console.error("❌ Error loading kelembagaan info:", {
					type: pengurusableType,
					id: pengurusableId,
					error: error?.message,
					status: error?.response?.status,
				});
				setKelembagaanInfo(null);
				// Don't show error to user, just log it (breadcrumb will still work)
			}
		},
		[],
	);

	// Helper function to format date for input[type="date"]
	const formatDateForInput = (dateString) => {
		// Handle null, undefined, or empty string
		if (!dateString || dateString === null || dateString === undefined) {
			return "";
		}

		try {
			// Handle if already in YYYY-MM-DD format
			if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
				return dateString;
			}

			// Try to parse the date
			const date = new Date(dateString);
			
			// Check if date is valid
			if (isNaN(date.getTime())) {
				console.warn(`⚠️ Invalid date format received: ${dateString}`);
				return "";
			}

			// Convert to YYYY-MM-DD format
			const formatted = date.toISOString().split('T')[0];
			return formatted;
		} catch (error) {
			console.error(`❌ Error formatting date: ${dateString}`, error);
			return "";
		}
	};

	const loadPengurusDetail = useCallback(async () => {
		if (!pengurusId) return;

		setLoading(true);
		try {
			const response = await getPengurusById(pengurusId);
			const data = response?.data?.data;

			if (data) {
				setPengurus(data);
				setFormData({
					nama_lengkap: data.nama_lengkap || "",
					nik: data.nik || "",
					tempat_lahir: data.tempat_lahir || "",
					tanggal_lahir: formatDateForInput(data.tanggal_lahir),
					jenis_kelamin: data.jenis_kelamin || "",
					status_perkawinan: data.status_perkawinan || "",
					alamat: data.alamat || "",
					no_telepon: data.no_telepon || "",
					pendidikan: data.pendidikan || "",
					agama: data.agama || "",
					golongan_darah: data.golongan_darah || "",
					jabatan: data.jabatan || "",
					tanggal_mulai_jabatan: formatDateForInput(data.tanggal_mulai_jabatan),
					tanggal_akhir_jabatan: formatDateForInput(data.tanggal_akhir_jabatan),
					produk_hukum_id: data.produk_hukum_id || "",
					status_verifikasi: data.status_verifikasi || "unverified",
				});

				// Load kelembagaan info if available
				if (data.pengurusable_type && data.pengurusable_id) {
					await loadKelembagaanInfo(
						data.pengurusable_type,
						data.pengurusable_id,
					);
				}
			}
		} catch (error) {
			console.error("❌ Error loading pengurus detail:", error);
			
			const errorMessage = error?.response?.data?.message 
				|| error?.message 
				|| "Gagal memuat detail pengurus";
			
			const statusCode = error?.response?.status;
			const detailMessage = statusCode === 404 
				? "Data pengurus tidak ditemukan"
				: statusCode === 403
				? "Anda tidak memiliki akses ke data ini"
				: errorMessage;
			
			Swal.fire({
				icon: "error",
				title: "Gagal Memuat Data",
				text: detailMessage,
				footer: statusCode ? `<small>Error Code: ${statusCode}</small>` : null,
			}).then(() => navigate(-1));
		} finally {
			setLoading(false);
		}
	}, [pengurusId, navigate, loadKelembagaanInfo]);

	useEffect(() => {
		if (!canEdit) {
			Swal.fire({
				icon: "error",
				title: "Akses Ditolak",
				text: "Anda tidak memiliki izin untuk mengedit pengurus",
			}).then(() => navigate(-1));
			return;
		}

		loadPengurusDetail();
		loadProdukHukumList();
	}, [loadPengurusDetail, loadProdukHukumList, canEdit, navigate]);

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handleAvatarChange = (e) => {
		const file = e.target.files[0];
		if (!file) return;

		try {
			// Validate file type
			const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml'];
			if (!allowedTypes.includes(file.type)) {
				Swal.fire({
					icon: 'warning',
					title: 'Format File Tidak Valid',
					text: 'Hanya file JPG, PNG, GIF, dan SVG yang diperbolehkan',
				});
				e.target.value = ''; // Reset input
				return;
			}

			// Validate file size (max 2MB)
			const maxSize = 2 * 1024 * 1024; // 2MB in bytes
			if (file.size > maxSize) {
				Swal.fire({
					icon: 'warning',
					title: 'File Terlalu Besar',
					html: `
						<p>Ukuran file: ${(file.size / 1024 / 1024).toFixed(2)}MB</p>
						<p>Maksimal: 2MB</p>
					`,
				});
				e.target.value = ''; // Reset input
				return;
			}

			// Set file and create preview
			setAvatarFile(file);
			console.log(`✓ Avatar selected: ${file.name} (${(file.size / 1024).toFixed(2)}KB)`);
			
			const reader = new FileReader();
			reader.onload = (e) => {
				setAvatarPreview(e.target.result);
				console.log('✓ Avatar preview created');
			};
			reader.onerror = (error) => {
				console.error('❌ Error reading file:', error);
				Swal.fire({
					icon: 'error',
					title: 'Gagal Membaca File',
					text: 'Terjadi kesalahan saat membaca file. Silakan coba lagi.',
				});
			};
			reader.readAsDataURL(file);
		} catch (error) {
			console.error('❌ Error handling avatar change:', error);
			Swal.fire({
				icon: 'error',
				title: 'Gagal Memproses File',
				text: 'Terjadi kesalahan saat memproses file. Silakan coba lagi.',
			});
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!formData.nama_lengkap.trim()) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: "Nama lengkap wajib diisi",
			});
			return;
		}

		setSaving(true);
		try {
			console.log("📝 Starting form submission...");
			
			const submitData = new FormData();

			// Add form data
			Object.entries(formData).forEach(([key, value]) => {
				if (value !== null && value !== undefined && value !== "") {
					submitData.append(key, value);
					console.log(`✓ Added field: ${key}`);
				}
			});

			// Add avatar if selected
			if (avatarFile) {
				submitData.append("avatar", avatarFile);
				console.log(`✓ Added avatar file: ${avatarFile.name}`);
			}

			console.log("🚀 Sending update request...");
			const response = await updatePengurus(pengurusId, submitData, { multipart: true });
			console.log("✅ Update successful:", response?.data);

			await Swal.fire({
				icon: "success",
				title: "Berhasil",
				text: "Data pengurus berhasil diperbarui",
				timer: 2000,
				showConfirmButton: false,
			});

			navigate(`${getBasePath()}/pengurus/${pengurusId}`);
		} catch (error) {
			console.error("❌ Error updating pengurus:", error);
			console.error("Error details:", {
				message: error?.message,
				response: error?.response?.data,
				status: error?.response?.status,
			});
			
			const errorMessage = error?.response?.data?.message 
				|| error?.response?.data?.error
				|| error?.message 
				|| "Gagal memperbarui data pengurus";
			
			const statusCode = error?.response?.status;
			let detailMessage = errorMessage;
			
			if (statusCode === 400) {
				detailMessage = "Data yang Anda masukkan tidak valid. Periksa kembali formulir.";
			} else if (statusCode === 403) {
				detailMessage = "Anda tidak memiliki izin untuk mengubah data ini.";
			} else if (statusCode === 404) {
				detailMessage = "Data pengurus tidak ditemukan.";
			} else if (statusCode === 413) {
				detailMessage = "File yang Anda upload terlalu besar. Maksimal 2MB.";
			} else if (statusCode >= 500) {
				detailMessage = "Terjadi kesalahan pada server. Silakan coba lagi nanti.";
			}
			
			Swal.fire({
				icon: "error",
				title: "Gagal Menyimpan",
				html: `
					<p class="mb-2">${detailMessage}</p>
					${statusCode ? `<small class="text-gray-500">Error Code: ${statusCode}</small>` : ''}
				`,
				showConfirmButton: true,
			});
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Memuat data pengurus...</p>
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

	const basePath = getBasePath();

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Breadcrumb */}
			<div className="bg-white border-b border-gray-200">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
					<nav className="flex items-center space-x-2 text-sm">
						<Link
							to={`${basePath}/dashboard`}
							className="flex items-center text-gray-500 hover:text-indigo-600 transition-colors"
						>
							<FaHome className="mr-1" />
							Dashboard
						</Link>
						<FaChevronRight className="text-gray-400 text-xs" />
						<Link
							to={`${basePath}/kelembagaan`}
							className="text-gray-500 hover:text-indigo-600 transition-colors"
						>
							Kelembagaan
						</Link>
						<FaChevronRight className="text-gray-400 text-xs" />
						<Link
							to={`${basePath}/kelembagaan/${getRouteType(pengurus.pengurusable_type)}`}
							className="text-gray-500 hover:text-indigo-600 transition-colors"
						>
							{getDisplayName(pengurus.pengurusable_type)}
						</Link>
						<FaChevronRight className="text-gray-400 text-xs" />
						<Link
							to={`${basePath}/kelembagaan/${getRouteType(pengurus.pengurusable_type)}/${pengurus.pengurusable_id}`}
							className="text-gray-500 hover:text-indigo-600 transition-colors"
						>
							{kelembagaanInfo?.nomor || kelembagaanInfo?.nama || "Detail"}
						</Link>
						<FaChevronRight className="text-gray-400 text-xs" />
						<Link
							to={`${basePath}/pengurus/${pengurusId}`}
							className="text-gray-500 hover:text-indigo-600 transition-colors"
						>
							{pengurus.nama_lengkap}
						</Link>
						<FaChevronRight className="text-gray-400 text-xs" />
						<span className="text-gray-900 font-medium">Edit</span>
					</nav>
				</div>
			</div>

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
									Edit Pengurus
								</h1>
								<p className="text-sm text-gray-500">
									Ubah informasi pengurus kelembagaan
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Section 1: Avatar & Basic Identity */}
					<div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 rounded-2xl shadow-sm border-2 border-blue-100 p-6">
						<div className="flex items-center gap-3 mb-6">
							<div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
								<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
								</svg>
							</div>
							<h3 className="text-lg font-bold text-gray-900">Foto & Identitas Dasar</h3>
						</div>

						<div className="flex flex-col md:flex-row items-start gap-8">
							{/* Avatar Upload */}
							<div className="flex-shrink-0">
								<div className="relative group">
									{avatarPreview ? (
										<img
											src={avatarPreview}
											alt="Preview"
											className="w-32 h-32 rounded-2xl object-cover border-4 border-white shadow-xl ring-4 ring-blue-200"
										/>
									) : pengurus.avatar ? (
										<img
											src={`${import.meta.env.VITE_IMAGE_BASE_URL}/uploads/${pengurus.avatar}`}
											alt={pengurus.nama_lengkap}
											className="w-32 h-32 rounded-2xl object-cover border-4 border-white shadow-xl ring-4 ring-blue-200"
										/>
									) : (
										<div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 flex items-center justify-center border-4 border-white shadow-xl ring-4 ring-blue-200">
											<span className="text-blue-400 text-4xl font-bold">
												{formData.nama_lengkap.charAt(0).toUpperCase() || "?"}
											</span>
										</div>
									)}
								</div>
								
								<div className="mt-4 text-center">
									<input
										type="file"
										id="avatar"
										accept="image/*"
										onChange={handleAvatarChange}
										className="hidden"
									/>
									<label
										htmlFor="avatar"
										className="cursor-pointer inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg text-sm font-semibold"
									>
										<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
										Pilih Foto Baru
									</label>
									<p className="mt-2 text-xs text-gray-600">JPG, PNG, GIF, SVG</p>
									<p className="text-xs text-blue-600 font-medium">Max 2MB</p>
								</div>
							</div>

							{/* Basic Identity Fields */}
							<div className="flex-1 space-y-4">
								<div>
									<label className="block text-sm font-semibold text-gray-800 mb-1.5">
										Nama Lengkap <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										name="nama_lengkap"
										value={formData.nama_lengkap}
										onChange={handleInputChange}
										className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80 backdrop-blur-sm transition-all duration-200"
										required
									/>
								</div>

								<div>
									<label className="block text-sm font-semibold text-gray-800 mb-1.5">
										NIK
									</label>
									<input
										type="text"
										name="nik"
										value={formData.nik}
										onChange={handleInputChange}
										maxLength="16"
										placeholder="16 digit angka"
										className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80 backdrop-blur-sm transition-all duration-200"
									/>
									<p className="text-xs text-blue-700 mt-1 font-medium">16 digit angka</p>
								</div>

								<div>
									<label className="block text-sm font-semibold text-gray-800 mb-1.5">
										No. Telepon
									</label>
									<input
										type="tel"
										name="no_telepon"
										value={formData.no_telepon}
										onChange={handleInputChange}
										placeholder="081234567890"
										className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80 backdrop-blur-sm transition-all duration-200"
									/>
									<p className="text-xs text-blue-700 mt-1 font-medium">Format: 08xxxxxxxxx atau +62xxxxxxxxx</p>
								</div>
							</div>
						</div>
					</div>

					{/* Section 2: Personal Information */}
					<div className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 rounded-2xl shadow-sm border-2 border-green-100 p-6">
						<div className="flex items-center gap-3 mb-6">
							<div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
								<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
								</svg>
							</div>
							<h3 className="text-lg font-bold text-gray-900">Informasi Personal</h3>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
							<div>
								<label className="block text-sm font-semibold text-gray-800 mb-1.5">
									Tempat Lahir
								</label>
								<input
									type="text"
									name="tempat_lahir"
									value={formData.tempat_lahir}
									onChange={handleInputChange}
									placeholder="Tempat lahir"
									className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/80 backdrop-blur-sm transition-all duration-200"
								/>
							</div>

							<div>
								<label className="block text-sm font-semibold text-gray-800 mb-1.5">
									Tanggal Lahir
								</label>
								<input
									type="date"
									name="tanggal_lahir"
									value={formData.tanggal_lahir}
									onChange={handleInputChange}
									className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/80 backdrop-blur-sm transition-all duration-200"
								/>
							</div>

							<div>
								<label className="block text-sm font-semibold text-gray-800 mb-1.5">
									Jenis Kelamin
								</label>
								<select
									name="jenis_kelamin"
									value={formData.jenis_kelamin}
									onChange={handleInputChange}
									className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/80 backdrop-blur-sm transition-all duration-200"
								>
									<option value="">Pilih Jenis Kelamin</option>
									<option value="Laki-laki">Laki-laki</option>
									<option value="Perempuan">Perempuan</option>
								</select>
							</div>

							<div>
								<label className="block text-sm font-semibold text-gray-800 mb-1.5">
									Status Perkawinan
								</label>
								<select
									name="status_perkawinan"
									value={formData.status_perkawinan}
									onChange={handleInputChange}
									className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/80 backdrop-blur-sm transition-all duration-200"
								>
									<option value="">Pilih Status</option>
									<option value="Belum Menikah">Belum Menikah</option>
									<option value="Menikah">Menikah</option>
									<option value="Cerai Hidup">Cerai Hidup</option>
									<option value="Cerai Mati">Cerai Mati</option>
								</select>
							</div>

							<div className="md:col-span-2">
								<label className="block text-sm font-semibold text-gray-800 mb-1.5">
									Pendidikan
								</label>
								<select
									name="pendidikan"
									value={formData.pendidikan}
									onChange={handleInputChange}
									className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/80 backdrop-blur-sm transition-all duration-200"
								>
									<option value="">Pilih pendidikan</option>
									<option value="SD">SD</option>
									<option value="SMP">SMP</option>
									<option value="SMA/SMK">SMA/SMK</option>
									<option value="D1">D1</option>
									<option value="D2">D2</option>
									<option value="D3">D3</option>
									<option value="S1">S1</option>
									<option value="S2">S2</option>
									<option value="S3">S3</option>
								</select>
							</div>

							<div>
								<label className="block text-sm font-semibold text-gray-800 mb-1.5">
									Agama
								</label>
								<select
									name="agama"
									value={formData.agama}
									onChange={handleInputChange}
									className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/80 backdrop-blur-sm transition-all duration-200"
								>
									<option value="">Pilih agama</option>
									<option value="Islam">Islam</option>
									<option value="Kristen">Kristen</option>
									<option value="Katolik">Katolik</option>
									<option value="Hindu">Hindu</option>
									<option value="Buddha">Buddha</option>
									<option value="Konghucu">Konghucu</option>
								</select>
							</div>

							<div>
								<label className="block text-sm font-semibold text-gray-800 mb-1.5">
									Golongan Darah
								</label>
								<select
									name="golongan_darah"
									value={formData.golongan_darah}
									onChange={handleInputChange}
									className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/80 backdrop-blur-sm transition-all duration-200"
								>
									<option value="">Pilih golongan darah</option>
									<option value="A">A</option>
									<option value="B">B</option>
									<option value="AB">AB</option>
									<option value="O">O</option>
								</select>
							</div>

							<div className="md:col-span-2">
								<label className="block text-sm font-semibold text-gray-800 mb-1.5">
									Alamat
								</label>
								<textarea
									name="alamat"
									value={formData.alamat}
									onChange={handleInputChange}
									rows={3}
									placeholder="Alamat lengkap"
									className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/80 backdrop-blur-sm transition-all duration-200"
								/>
							</div>
						</div>
					</div>

					{/* Section 3: Position Information */}
					<div className="bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50 rounded-2xl shadow-sm border-2 border-purple-100 p-6">
						<div className="flex items-center gap-3 mb-6">
							<div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
								<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
								</svg>
							</div>
							<h3 className="text-lg font-bold text-gray-900">Informasi Jabatan</h3>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
							<div className="md:col-span-2">
								<label className="block text-sm font-semibold text-gray-800 mb-1.5">
									Jabatan
								</label>
								<input
									type="text"
									name="jabatan"
									value={formData.jabatan}
									onChange={handleInputChange}
									placeholder="Contoh: Kepala Desa, Sekretaris Desa"
									className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/80 backdrop-blur-sm transition-all duration-200"
								/>
							</div>

							<div>
								<label className="block text-sm font-semibold text-gray-800 mb-1.5">
									Tanggal Mulai Jabatan
								</label>
								<input
									type="date"
									name="tanggal_mulai_jabatan"
									value={formData.tanggal_mulai_jabatan}
									onChange={handleInputChange}
									className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/80 backdrop-blur-sm transition-all duration-200"
								/>
							</div>

							<div>
								<label className="block text-sm font-semibold text-gray-800 mb-1.5">
									Tanggal Akhir Jabatan
								</label>
								<input
									type="date"
									name="tanggal_akhir_jabatan"
									value={formData.tanggal_akhir_jabatan}
									onChange={handleInputChange}
									className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/80 backdrop-blur-sm transition-all duration-200"
								/>
							</div>
						</div>
					</div>

					{/* Section 4: SK Produk Hukum */}
					<div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-2xl shadow-sm border-2 border-amber-100 p-6">
						<div className="flex items-center gap-3 mb-6">
							<div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
								<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
								</svg>
							</div>
							<div>
								<h3 className="text-lg font-bold text-gray-900">SK Pengangkatan</h3>
								<p className="text-sm text-gray-600">Produk hukum dasar jabatan</p>
							</div>
						</div>

						<div className="space-y-4">
							<SearchableProdukHukumSelect
								value={formData.produk_hukum_id}
								onChange={(value) => handleInputChange({ target: { name: 'produk_hukum_id', value } })}
								produkHukumList={Array.isArray(produkHukumList) ? produkHukumList : []}
							/>

							{formData.produk_hukum_id && (
								<div className="mt-3 p-4 bg-white/70 backdrop-blur-sm border-2 border-amber-200 rounded-xl">
									<div className="flex items-start gap-3">
										<div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
											<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
											</svg>
										</div>
										<div className="flex-1">
											<p className="text-sm font-semibold text-gray-900">SK Terpilih</p>
											<p className="text-xs text-gray-600 mt-1">Produk hukum telah dipilih sebagai dasar jabatan</p>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>

					{/* Status Verifikasi - Only for Admin Bidang */}
					{(isSuperAdmin || isAdminBidangPMD) && (
						<div className="bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 rounded-2xl shadow-sm border-2 border-gray-200 p-6">
							<div className="flex items-center gap-3 mb-6">
								<div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-gray-700 rounded-xl flex items-center justify-center shadow-lg">
									<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
									</svg>
								</div>
								<div>
									<h3 className="text-lg font-bold text-gray-900">Status Verifikasi</h3>
									<p className="text-sm text-gray-600">Khusus admin bidang PMD</p>
								</div>
							</div>

							<div className="space-y-4">
								<div className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm border-2 border-gray-200 rounded-xl">
									<div className="flex items-center space-x-3">
										<div
											className={`w-3 h-3 rounded-full ${
												formData.status_verifikasi === "verified"
													? "bg-green-500"
													: "bg-yellow-500"
											}`}
										></div>
										<div>
											<p className="font-medium text-gray-900">
												{formData.status_verifikasi === "verified"
													? "Terverifikasi"
													: "Belum Terverifikasi"}
											</p>
											<p className="text-sm text-gray-500">
												Status verifikasi data pengurus
											</p>
										</div>
									</div>

									<label className="relative inline-flex items-center cursor-pointer">
										<input
											type="checkbox"
											checked={formData.status_verifikasi === "verified"}
											onChange={(e) => {
												setFormData((prev) => ({
													...prev,
													status_verifikasi: e.target.checked
														? "verified"
														: "unverified",
												}));
											}}
											className="sr-only peer"
										/>
										<div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
									</label>
								</div>

								<div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
									<p className="text-xs text-blue-800">
										<strong>Info:</strong> Toggle ini hanya dapat diubah oleh
										Admin Bidang. Status verifikasi menandakan bahwa data
										pengurus telah diperiksa dan divalidasi oleh admin.
									</p>
								</div>
							</div>
						</div>
					)}

					{/* Submit Buttons */}
					<div className="flex justify-end gap-4 pt-6 border-t-2 border-gray-200">
						<button
							type="button"
							onClick={() => navigate(-1)}
							className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-semibold flex items-center gap-2 shadow-sm hover:shadow-md"
						>
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
							Batal
						</button>
						<button
							type="submit"
							disabled={saving}
							className="px-8 py-3 bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:via-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl"
						>
							{saving ? (
								<>
									<svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
										<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
									<span>Menyimpan...</span>
								</>
							) : (
								<>
									<FaSave className="w-5 h-5" />
									<span>Simpan Perubahan</span>
								</>
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default PengurusEditPage;
