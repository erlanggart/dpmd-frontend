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
	getSatlinmas 
} from "../../../services/kelembagaan";
import { useAuth } from "../../../context/AuthContext";
import { FaArrowLeft, FaSave, FaFileAlt, FaChevronRight, FaHome } from "react-icons/fa";
import SearchableProdukHukumSelect from "../../../components/shared/SearchableProdukHukumSelect";
import Swal from "sweetalert2";

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
	const isAdminBidang = user?.role === "pemberdayaan_masyarakat" || 
						   (user?.role === "kepala_bidang" && user?.bidang_id === 5) ||
						   (user?.role === "pegawai" && user?.bidang_id === 5);
	const isUserDesa = user?.role === "desa";
	const canEdit = isSuperAdmin || isAdminBidang || isUserDesa;

	// Determine base path based on role
	const getBasePath = () => {
		if (isSuperAdmin || isAdminBidang) {
			return "/bidang/pmd";
		}
		return "/desa";
	};

	const loadProdukHukumList = useCallback(async () => {
		try {
			const response = await getProdukHukums(1, "");
			const allData = response?.data?.data || [];
			setProdukHukumList(allData.data || []);
		} catch (error) {
			console.error("Error loading produk hukum:", error);
			setProdukHukumList([]);
		}
	}, []);

	const loadKelembagaanInfo = useCallback(async (pengurusableType, pengurusableId) => {
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
	}, []);

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
					tanggal_lahir: data.tanggal_lahir || "",
					jenis_kelamin: data.jenis_kelamin || "",
					status_perkawinan: data.status_perkawinan || "",
					alamat: data.alamat || "",
					no_telepon: data.no_telepon || "",
					pendidikan: data.pendidikan || "",
					jabatan: data.jabatan || "",
					tanggal_mulai_jabatan: data.tanggal_mulai_jabatan || "",
					tanggal_akhir_jabatan: data.tanggal_akhir_jabatan || "",
					produk_hukum_id: data.produk_hukum_id || "",				status_verifikasi: data.status_verifikasi || "unverified",				});
				
				// Load kelembagaan info if available
				if (data.pengurusable_type && data.pengurusable_id) {
					await loadKelembagaanInfo(data.pengurusable_type, data.pengurusable_id);
				}
			}
		} catch (error) {
			console.error("Error loading pengurus detail:", error);
			Swal.fire({
				icon: "error",
				title: "Gagal",
				text: "Gagal memuat detail pengurus",
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
		if (file) {
			setAvatarFile(file);
			const reader = new FileReader();
			reader.onload = (e) => setAvatarPreview(e.target.result);
			reader.readAsDataURL(file);
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
			const submitData = new FormData();

			// Add form data
			Object.entries(formData).forEach(([key, value]) => {
				if (value) {
					submitData.append(key, value);
				}
			});

			// Add avatar if selected
			if (avatarFile) {
				submitData.append("avatar", avatarFile);
			}

			await updatePengurus(pengurusId, submitData, { multipart: true });

			await Swal.fire({
				icon: "success",
				title: "Berhasil",
				text: "Data pengurus berhasil diperbarui",
				timer: 2000,
				showConfirmButton: false,
			});

			navigate(`${getBasePath()}/pengurus/${pengurusId}`);
		} catch (error) {
			console.error("Error updating pengurus:", error);
			Swal.fire({
				icon: "error",
				title: "Gagal",
				text: "Gagal memperbarui data pengurus",
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
							{kelembagaanInfo?.nomor || kelembagaanInfo?.nama || 'Detail'}
						</Link>
						<FaChevronRight className="text-gray-400 text-xs" />
						<Link
							to={`${basePath}/pengurus/${pengurusId}`}
							className="text-gray-500 hover:text-indigo-600 transition-colors"
						>
							{pengurus.nama_lengkap}
						</Link>
						<FaChevronRight className="text-gray-400 text-xs" />
						<span className="text-gray-900 font-medium">
							Edit
						</span>
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
					{/* Avatar Upload */}
					<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">
							Foto Profil
						</h3>

						<div className="flex items-center space-x-6">
							<div className="relative">
								{avatarPreview ? (
									<img
										src={avatarPreview}
										alt="Preview"
										className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
									/>
								) : pengurus.avatar ? (
									<img
										src={`${import.meta.env.VITE_IMAGE_BASE_URL}/uploads/${
											pengurus.avatar
										}`}
										alt={pengurus.nama_lengkap}
										className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
									/>
								) : (
									<div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300">
										<span className="text-gray-400 text-2xl font-semibold">
											{formData.nama_lengkap.charAt(0).toUpperCase() || "?"}
										</span>
									</div>
								)}
							</div>

							<div>
								<input
									type="file"
									id="avatar"
									accept="image/*"
									onChange={handleAvatarChange}
									className="hidden"
								/>
								<label
									htmlFor="avatar"
									className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
								>
									Pilih Foto
								</label>
								<p className="mt-1 text-xs text-gray-500">
									JPG, PNG hingga 5MB
								</p>
							</div>
						</div>
					</div>

					{/* Personal Information */}
					<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">
							Informasi Pribadi
						</h3>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Nama Lengkap *
								</label>
								<input
									type="text"
									name="nama_lengkap"
									value={formData.nama_lengkap}
									onChange={handleInputChange}
									className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
									required
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									NIK
								</label>
								<input
									type="text"
									name="nik"
									value={formData.nik}
									onChange={handleInputChange}
									className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Tempat Lahir
								</label>
								<input
									type="text"
									name="tempat_lahir"
									value={formData.tempat_lahir}
									onChange={handleInputChange}
									className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Tanggal Lahir
								</label>
								<input
									type="date"
									name="tanggal_lahir"
									value={formData.tanggal_lahir}
									onChange={handleInputChange}
									className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Jenis Kelamin
								</label>
								<select
									name="jenis_kelamin"
									value={formData.jenis_kelamin}
									onChange={handleInputChange}
									className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
								>
									<option value="">Pilih Jenis Kelamin</option>
									<option value="Laki-laki">Laki-laki</option>
									<option value="Perempuan">Perempuan</option>
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Status Perkawinan
								</label>
								<select
									name="status_perkawinan"
									value={formData.status_perkawinan}
									onChange={handleInputChange}
									className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
								>
									<option value="">Pilih Status</option>
									<option value="Belum Kawin">Belum Kawin</option>
									<option value="Kawin">Kawin</option>
									<option value="Cerai Hidup">Cerai Hidup</option>
									<option value="Cerai Mati">Cerai Mati</option>
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Pendidikan
								</label>
								<input
									type="text"
									name="pendidikan"
									value={formData.pendidikan}
									onChange={handleInputChange}
									placeholder="Contoh: S1 Komputer"
									className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									No. Telepon
								</label>
								<input
									type="tel"
									name="no_telepon"
									value={formData.no_telepon}
									onChange={handleInputChange}
									placeholder="Contoh: 081234567890"
									className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
								/>
							</div>

							<div className="md:col-span-2">
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Alamat
								</label>
								<textarea
									name="alamat"
									value={formData.alamat}
									onChange={handleInputChange}
									rows={3}
									className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
								/>
							</div>
						</div>
					</div>

					{/* Position Information */}
					<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">
							Informasi Jabatan
						</h3>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Jabatan
								</label>
								<input
									type="text"
									name="jabatan"
									value={formData.jabatan}
									onChange={handleInputChange}
									className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Tanggal Mulai Jabatan
								</label>
								<input
									type="date"
									name="tanggal_mulai_jabatan"
									value={formData.tanggal_mulai_jabatan}
									onChange={handleInputChange}
									className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Tanggal Akhir Jabatan
								</label>
								<input
									type="date"
									name="tanggal_akhir_jabatan"
									value={formData.tanggal_akhir_jabatan}
									onChange={handleInputChange}
									className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
								/>
							</div>
						</div>
					</div>

					{/* Status Verifikasi - Only for Admin Bidang */}
					{(isSuperAdmin() || isAdminBidang()) && (
						<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
							<h3 className="text-lg font-semibold text-gray-900 mb-4">
								Status Verifikasi
							</h3>

							<div className="space-y-4">
								<div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
									<div className="flex items-center space-x-3">
										<div className={`w-3 h-3 rounded-full ${
											formData.status_verifikasi === "verified" 
												? "bg-green-500" 
												: "bg-yellow-500"
										}`}></div>
										<div>
											<p className="font-medium text-gray-900">
												{formData.status_verifikasi === "verified" 
													? "Terverifikasi" 
													: "Belum Terverifikasi"
												}
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
												setFormData(prev => ({
													...prev,
													status_verifikasi: e.target.checked ? "verified" : "unverified"
												}));
											}}
											className="sr-only peer"
										/>
										<div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
									</label>
								</div>
								
								<div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
									<p className="text-xs text-blue-800">
										<strong>Info:</strong> Toggle ini hanya dapat diubah oleh Admin Bidang. 
										Status verifikasi menandakan bahwa data pengurus telah diperiksa dan divalidasi oleh admin.
									</p>
								</div>
							</div>
						</div>
					)}

					{/* SK Pengangkatan */}
					<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
							<FaFileAlt className="mr-2 text-indigo-600" />
							SK Pengangkatan Pengurus
						</h3>

						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Pilih SK Produk Hukum
									<span className="text-xs text-gray-500 ml-2">
										(Surat Keputusan Pengangkatan)
									</span>
								</label>
								<SearchableProdukHukumSelect
									value={formData.produk_hukum_id}
									onChange={(value) =>
										setFormData((prev) => ({ ...prev, produk_hukum_id: value }))
									}
									produkHukumList={
										Array.isArray(produkHukumList) ? produkHukumList : []
									}
								/>
								<p className="text-xs text-gray-500 mt-1">
									Pilih Surat Keputusan (SK) sebagai dasar hukum pengangkatan
									pengurus ini. SK ini akan menjadi rujukan legal untuk posisi
									jabatan yang dipegang.
								</p>
							</div>

							{/* Preview SK yang dipilih */}
							{formData.produk_hukum_id &&
								produkHukumList.find(
									(ph) => ph.id === formData.produk_hukum_id
								) && (
									<div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
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
												<h4 className="font-semibold text-emerald-800 text-sm mb-1">
													SK Terpilih:
												</h4>
												{(() => {
													const ph = produkHukumList.find(
														(ph) => ph.id === formData.produk_hukum_id
													);
													return (
														<div className="space-y-1">
															<p className="text-emerald-700 font-medium text-sm">
																Nomor {ph.nomor} Tahun {ph.tahun}
															</p>
															<p className="text-gray-600 text-sm leading-relaxed">
																{ph.judul}
															</p>
															<p className="text-xs text-emerald-600 font-medium">
																Jenis: {ph.jenis}
															</p>
														</div>
													);
												})()}
											</div>
										</div>
									</div>
								)}
						</div>
					</div>

					{/* Submit Buttons */}
					<div className="flex justify-end space-x-4">
						<button
							type="button"
							onClick={() => navigate(-1)}
							className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
						>
							Batal
						</button>
						<button
							type="submit"
							disabled={saving}
							className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
						>
							<FaSave />
							<span>{saving ? "Menyimpan..." : "Simpan Perubahan"}</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default PengurusEditPage;
