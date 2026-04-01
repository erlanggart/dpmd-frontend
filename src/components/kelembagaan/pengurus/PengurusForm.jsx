import React, { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
	FaUserCircle,
	FaExclamationCircle,
	FaTimes,
	FaSave,
	FaUpload,
	FaCheck,
	FaSpinner,
} from "react-icons/fa";
import {
	LuChevronDown,
	LuSearch,
	LuCheck,
	LuLock,
	LuFileText,
	LuBookOpen,
} from "react-icons/lu";
import Swal from "sweetalert2";
import { getProdukHukums } from "../../../services/api";
import { getJabatanOptions } from "../../../constants/jabatanMapping";

// Helper function for optional fields
const emptyToUndef = (schema) =>
	z.preprocess((v) => (v === "" || v === null ? undefined : v), schema);

const toUppercaseString = (value) =>
	typeof value === "string" ? value.toUpperCase() : value;

const normalizeJenisKelaminValue = (value) => {
	if (!value) return "";
	const normalized = String(value).replace(/_/g, "-").toUpperCase();
	return ["LAKI-LAKI", "PEREMPUAN"].includes(normalized) ? normalized : "";
};

const normalizePengurusFormValues = (values = {}) => ({
	...values,
	nama_lengkap: toUppercaseString(values.nama_lengkap || ""),
	tempat_lahir: toUppercaseString(values.tempat_lahir || ""),
	jenis_kelamin: normalizeJenisKelaminValue(values.jenis_kelamin),
	status_perkawinan: toUppercaseString(values.status_perkawinan || ""),
	alamat: toUppercaseString(values.alamat || ""),
	pendidikan: toUppercaseString(values.pendidikan || ""),
	agama: toUppercaseString(values.agama || ""),
	golongan_darah: toUppercaseString(values.golongan_darah || ""),
	jabatan: toUppercaseString(values.jabatan || ""),
	nomor_buku_nikah: toUppercaseString(values.nomor_buku_nikah || ""),
});

const forceUppercaseInput = (event) => {
	event.target.value = event.target.value.toUpperCase();
};

// Zod validation schema with comprehensive frontend validation
const pengurusSchema = z.object({
	nama_lengkap: z
		.string()
		.min(1, "Nama lengkap wajib diisi")
		.min(2, "Nama lengkap minimal 2 karakter")
		.max(255, "Nama lengkap maksimal 255 karakter"),
	nik: z
		.string()
		.min(1, "NIK wajib diisi")
		.length(16, "NIK harus 16 digit")
		.regex(/^\d+$/, "NIK hanya boleh berisi angka"),
	tempat_lahir: z
		.string()
		.min(1, "Tempat lahir wajib diisi")
		.max(255, "Tempat lahir maksimal 255 karakter"),
	tanggal_lahir: z
		.string()
		.min(1, "Tanggal lahir wajib diisi")
		.refine((date) => {
			const birthDate = new Date(date);
			const today = new Date();
			const age = today.getFullYear() - birthDate.getFullYear();
			return age >= 17 && age <= 100;
		}, "Usia harus antara 17-100 tahun"),
	jenis_kelamin: z.enum(["LAKI-LAKI", "PEREMPUAN"], { required_error: "Jenis kelamin wajib diisi" }),
	status_perkawinan: z.string().min(1, "Status perkawinan wajib diisi"),
	alamat: emptyToUndef(
		z.string().max(1000, "Alamat maksimal 1000 karakter").optional()
	),
	no_telepon: z
		.string()
		.min(1, "Nomor telepon wajib diisi")
		.regex(
			/^(\+62|62|0)[0-9]{8,13}$/,
			"Format nomor telepon tidak valid (contoh: 081234567890)"
		)
		.max(32, "Nomor telepon maksimal 32 karakter"),
	pendidikan: emptyToUndef(z.string().optional()),
	agama: z.string().min(1, "Agama wajib diisi"),
	golongan_darah: z.string().min(1, "Golongan darah wajib diisi"),
	jabatan: z.string().min(1, "Jabatan wajib diisi"),
	tanggal_mulai_jabatan: z
		.string()
		.min(1, "Tanggal mulai jabatan wajib diisi")
		.refine((date) => {
			const selectedDate = new Date(date);
			const today = new Date();
			return selectedDate <= today;
		}, "Tanggal mulai jabatan tidak boleh di masa depan"),
	tanggal_akhir_jabatan: z.string().min(1, "Tanggal akhir jabatan wajib diisi"),
	status_jabatan: z.enum(["aktif", "nonaktif"]).default("aktif"),
	produk_hukum_id: emptyToUndef(z.string().optional()),
	nomor_buku_nikah: emptyToUndef(z.string().max(100, "Nomor buku nikah maksimal 100 karakter").optional()),
}).refine(
	(data) => {
		// Cross-field validation: end date must be after start date
		const endDate = new Date(data.tanggal_akhir_jabatan);
		const startDate = new Date(data.tanggal_mulai_jabatan);
		return endDate > startDate;
	},
	{
		message: "Tanggal akhir harus setelah tanggal mulai jabatan",
		path: ["tanggal_akhir_jabatan"],
	}
).refine(
	(data) => {
		// Nomor buku nikah wajib diisi untuk Ketua RT/RW yang menikah
		const isKetuaRtRw = data.jabatan === "KETUA RT" || data.jabatan === "KETUA RW";
		if (isKetuaRtRw && data.status_perkawinan === "MENIKAH") {
			return !!data.nomor_buku_nikah;
		}
		return true;
	},
	{
		message: "Nomor buku nikah wajib diisi untuk Ketua RT/RW yang sudah menikah",
		path: ["nomor_buku_nikah"],
	}
);

export default function PengurusForm({
	isOpen,
	onClose,
	onSubmit,
	editData = null,
	kelembagaanType,
	kelembagaanId,
	kelembagaanName,
	defaultJabatan,
}) {
	// Get image base URL from environment
	const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;
	// Form setup
	const {
		register,
		handleSubmit,
		control,
		reset,
		watch,
		setError,
		formState: { errors, isSubmitting },
	} = useForm({
		resolver: zodResolver(pengurusSchema),
		defaultValues: normalizePengurusFormValues({
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
			jabatan: defaultJabatan || "",
			tanggal_mulai_jabatan: "",
			tanggal_akhir_jabatan: "",
			status_jabatan: "aktif",
			produk_hukum_id: "",
			nomor_buku_nikah: "",
		}),
	});

	// State
	const [produkHukumList, setProdukHukumList] = useState([]);
	const [loadingPh, setLoadingPh] = useState(false);
	const [phSearchTerm, setPhSearchTerm] = useState("");
	const [showPhDropdown, setShowPhDropdown] = useState(false);
	const [avatar, setAvatar] = useState(null);
	const [avatarPreview, setAvatarPreview] = useState(null);
	const [avatarError, setAvatarError] = useState("");
	const fileInputRef = useRef(null);

	// Watch status_perkawinan and jabatan for conditional buku nikah field
	const watchedStatusPerkawinan = watch("status_perkawinan");
	const watchedJabatan = watch("jabatan");
	const isKetuaRtOrRw = ["KETUA RT", "KETUA RW"].includes(
		(watchedJabatan || "").toUpperCase()
	);
	const showBukuNikah =
		isKetuaRtOrRw && (watchedStatusPerkawinan || "").toUpperCase() === "MENIKAH";

	// Load Produk Hukum list - only SK type with status berlaku
	useEffect(() => {
		if (!isOpen) return;
		let mounted = true;
		const loadProdukHukum = async () => {
			setLoadingPh(true);
			try {
				const response = await getProdukHukums({
					all: true,
					jenis: "Keputusan Kepala Desa",
					status_peraturan: "berlaku",
				});
				if (mounted) {
					const data = response?.data?.data;
					setProdukHukumList(Array.isArray(data) ? data : []);
				}
			} catch (error) {
				console.error("Error loading produk hukum:", error);
				if (mounted) setProdukHukumList([]);
			} finally {
				if (mounted) setLoadingPh(false);
			}
		};
		loadProdukHukum();
		return () => { mounted = false; };
	}, [isOpen]); // Reset form when editData changes
	useEffect(() => {
		if (editData) {
			reset(normalizePengurusFormValues({
				nama_lengkap: editData.nama_lengkap || "",
				nik: editData.nik || "",
				tempat_lahir: editData.tempat_lahir || "",
				tanggal_lahir: editData.tanggal_lahir || "",
				jenis_kelamin: editData.jenis_kelamin || "",
				status_perkawinan: editData.status_perkawinan || "",
				alamat: editData.alamat || "",
				no_telepon: editData.no_telepon || "",
				pendidikan: editData.pendidikan || "",
				agama: editData.agama || "",
				golongan_darah: editData.golongan_darah || "",
				jabatan: editData.jabatan || "",
				tanggal_mulai_jabatan: editData.tanggal_mulai_jabatan || "",
				tanggal_akhir_jabatan: editData.tanggal_akhir_jabatan || "",
				status_jabatan: editData.status_jabatan || "aktif",
				produk_hukum_id: editData.produk_hukum_id || "",
				nomor_buku_nikah: editData.nomor_buku_nikah || "",
			}));

			if (editData.avatar) {
				setAvatarPreview(`${imageBaseUrl}/uploads/${editData.avatar}`);
			}
		} else {
			reset(normalizePengurusFormValues({
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
				jabatan: defaultJabatan || "",
				tanggal_mulai_jabatan: "",
				tanggal_akhir_jabatan: "",
				status_jabatan: "aktif",
				produk_hukum_id: "",
				nomor_buku_nikah: "",
			}));
			setAvatarPreview(null);
		}
		setAvatar(null);
		setPhSearchTerm("");
		setShowPhDropdown(false);
	}, [editData, reset, imageBaseUrl, defaultJabatan]);

	// Validate avatar file
	const validateAvatar = (file) => {
		// Check file size (2MB = 2048KB = 2,097,152 bytes)
		const maxSize = 2 * 1024 * 1024; // 2MB in bytes
		if (file.size > maxSize) {
			return `Ukuran file ${(file.size / (1024 * 1024)).toFixed(
				1
			)}MB melebihi batas maksimal 2MB`;
		}

		// Check file type
		const allowedTypes = [
			"image/jpeg",
			"image/jpg",
			"image/png",
			"image/gif",
			"image/svg+xml",
		];
		if (!allowedTypes.includes(file.type)) {
			return "Format file tidak didukung. Gunakan JPG, PNG, GIF, atau SVG";
		}

		return null; // No error
	};

	// Handle avatar file selection
	const handleAvatarChange = (event) => {
		const file = event.target.files[0];

		// Clear previous errors
		setAvatarError("");

		if (file) {
			// Validate file
			const validationError = validateAvatar(file);

			if (validationError) {
				// Set error state
				setAvatarError(validationError);

				// Reset file input
				if (event.target) {
					event.target.value = "";
				}

				// Clear avatar states
				setAvatar(null);
				setAvatarPreview(
					editData?.avatar ? `${imageBaseUrl}/uploads/${editData.avatar}` : null
				);
				return;
			}

			// File is valid
			setAvatar(file);
			const reader = new FileReader();
			reader.onloadend = () => {
				setAvatarPreview(reader.result);
			};
			reader.readAsDataURL(file);
		}
	};

	// Remove avatar
	const removeAvatar = () => {
		setAvatar(null);
		setAvatarError("");
		setAvatarPreview(
			editData?.avatar ? `${imageBaseUrl}/uploads/${editData.avatar}` : null
		);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	// Real-time validation helpers (removed as validation is handled by Zod schema)
	// const validateNIK = (nik) => {
	// 	if (!nik) return true; // Optional field
	// 	if (nik.length !== 16) return false;
	// 	return /^\d+$/.test(nik);
	// };

	// const validatePhoneNumber = (phone) => {
	// 	if (!phone) return true; // Optional field
	// 	return /^(\+62|62|0)[0-9]{8,13}$/.test(phone);
	// };

	// Validate all data before submit
	const validateBeforeSubmit = () => {
		// Check avatar validation
		if (avatarError) {
			Swal.fire({
				icon: "warning",
				title: "Validasi Error",
				text: `Avatar: ${avatarError}`,
				confirmButtonColor: "#f59e0b",
				confirmButtonText: "OK",
			});
			return false;
		}

		return true;
	};

	// Form submission
	const onFormSubmit = async (formData) => {
		console.log("🚀 Form submission started", new Date().toISOString());
		const startTime = performance.now();
		const normalizedFormData = normalizePengurusFormValues(formData);
		
		try {
			// Validate all data before submit
			console.log("🔍 Validating form data...");
			const validateStartTime = performance.now();
			
			if (!validateBeforeSubmit()) {
				console.log("❌ Validation failed");
				return; // Stop submission if validation fails
			}
			
			const validateEndTime = performance.now();
			console.log(`✅ Validation passed in ${(validateEndTime - validateStartTime).toFixed(2)}ms`);

			// Show loading alert
			Swal.fire({
				title: "Menyimpan Data...",
				text: "Mohon tunggu sebentar",
				allowOutsideClick: false,
				allowEscapeKey: false,
				showConfirmButton: false,
				willOpen: () => {
					Swal.showLoading();
				},
			});

			const formDataCreateStartTime = performance.now();
			console.log("📦 Creating FormData object...");
			console.log("📝 Form data info:", {
				hasAvatar: !!avatar,
				avatarSize: avatar?.size,
				fieldCount: Object.keys(normalizedFormData).length
			});

			const submitData = new FormData();

			// Map frontend field names to backend expected field names (if needed)
			const fieldMapping = {
				// No mapping needed anymore - backend now uses same field names as frontend
			};

			// Add form fields with proper mapping
			// Skip pengurusable_type and pengurusable_id as they will be added separately with proper mapping
			Object.keys(normalizedFormData).forEach((key) => {
				// Skip these fields - they will be added separately
				if (key === 'pengurusable_type' || key === 'pengurusable_id') {
					return;
				}
				
				if (
					normalizedFormData[key] !== "" &&
					normalizedFormData[key] !== null &&
					normalizedFormData[key] !== undefined
				) {
					const backendFieldName = fieldMapping[key] || key;
					submitData.append(backendFieldName, normalizedFormData[key]);
				}
			});

			// Add avatar if selected
			if (avatar) {
				submitData.append("avatar", avatar);
			}

			// Map kelembagaan type to backend table names (Prisma uses table names, not Laravel model classes)
			const kelembagaanTypeMapping = {
				rt: "rts",
				rw: "rws",
				posyandu: "posyandus",
				satlinmas: "satlinmas",
				lpm: "lpms",
				"karang-taruna": "karang_tarunas",
				pkk: "pkks",
				"lembaga-lainnya": "lembaga-lainnya",
			};

			const backendKelembagaanType =
				kelembagaanTypeMapping[kelembagaanType] || kelembagaanType;

			// Add kelembagaan info with correct field names for backend
			submitData.append("pengurusable_type", backendKelembagaanType);
			submitData.append("pengurusable_id", kelembagaanId);

			const formDataCreateEndTime = performance.now();
			console.log(`✅ FormData created in ${(formDataCreateEndTime - formDataCreateStartTime).toFixed(2)}ms`);

			// Submit to API
			const apiStartTime = performance.now();
			console.log("🌐 Sending API request...");
			
			await onSubmit(submitData);
			
			const apiEndTime = performance.now();
			console.log(`✅ API request completed in ${(apiEndTime - apiStartTime).toFixed(2)}ms`);

			const totalTime = performance.now() - startTime;
			console.log(`🎉 Total submission time: ${totalTime.toFixed(2)}ms`);

			// Show success alert
			Swal.fire({
				icon: "success",
				title: "Berhasil!",
				text: `Data pengurus berhasil ${editData ? "diperbarui" : "disimpan"}`,
				confirmButtonColor: "#4f46e5",
				confirmButtonText: "OK",
			}).then(() => {
				onClose(); // Close form after success
			});
		} catch (error) {
			console.error("Form submission error:", error);

			// Show error alert with specific handling for different error types
			let errorMessage = "Terjadi kesalahan saat menyimpan data";
			let errorTitle = "Gagal Menyimpan";

			if (error.response?.data?.message) {
				errorMessage = error.response.data.message;
			} else if (error.response?.data?.errors) {
				const errors = error.response.data.errors;

				// Handle avatar-specific errors
				if (errors.avatar) {
					const avatarError = Array.isArray(errors.avatar)
						? errors.avatar[0]
						: errors.avatar;
					errorTitle = "Error Upload Foto";

					if (avatarError.includes("2048 kilobytes")) {
						errorMessage =
							"Ukuran file foto terlalu besar. Maksimal 2MB (2048 KB).";
					} else if (avatarError.includes("image")) {
						errorMessage =
							"File yang dipilih harus berupa gambar (JPG, PNG, GIF, SVG).";
					} else {
						errorMessage = `Error foto: ${avatarError}`;
					}
				} else {
					// Handle other validation errors
					const firstError = Object.values(errors)[0];
					errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;

					// Customize message for common validation errors
					if (errorMessage.includes("required")) {
						errorTitle = "Data Tidak Lengkap";
						errorMessage = errorMessage.replace(
							"field is required",
							"field wajib diisi"
						);
					}
				}
			} else if (error.message) {
				errorMessage = error.message;
			}

			Swal.fire({
				icon: "error",
				title: errorTitle,
				text: errorMessage,
				confirmButtonColor: "#ef4444",
				confirmButtonText: "OK",
				customClass: {
					popup: "text-sm",
				},
			});

			// Set form validation errors if available
			if (error.response?.data?.errors) {
				const errors = error.response.data.errors;

				// Map backend field names back to frontend field names for error display (if needed)
				const backendToFrontendMapping = {
					// No mapping needed anymore - backend now uses same field names as frontend
				};

				Object.keys(errors).forEach((field) => {
					const frontendFieldName = backendToFrontendMapping[field] || field;
					setError(frontendFieldName, {
						type: "server",
						message: Array.isArray(errors[field])
							? errors[field][0]
							: errors[field],
					});
				});
			}
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
			<div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"  onClick={(e) => e.stopPropagation()}>
				{/* Fixed Header */}
				<div className="flex-shrink-0 bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
								<FaUserCircle className="w-7 h-7 text-white" />
							</div>
							<div>
								<h2 className="text-2xl font-bold">
									{editData ? "Edit Pengurus" : "Tambah Pengurus Baru"}
								</h2>
								<p className="text-indigo-100 text-sm mt-1">
									{kelembagaanName || kelembagaanType?.toUpperCase()} {defaultJabatan && !editData ? `— ${defaultJabatan}` : ""}
								</p>
							</div>
						</div>
						<button
							type="button"
							onClick={onClose}
							disabled={isSubmitting}
							className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
						>
							<FaTimes className="w-5 h-5 text-white" />
						</button>
					</div>
				</div>

				{/* Scrollable Content */}
				<div className="flex-1 overflow-y-auto"  style={{ scrollbarWidth: 'thin' }}>
					{/* Loading overlay */}
					{isSubmitting && (
						<div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex items-center justify-center rounded-xl">
							<div className="flex flex-col items-center gap-4 bg-white p-8 rounded-2xl shadow-2xl border-2 border-indigo-100">
								<div className="relative">
									<div className="w-20 h-20 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
									<FaSpinner className="w-8 h-8 text-indigo-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
								</div>
								<div className="text-center">
									<p className="text-lg font-semibold text-gray-900">Menyimpan Data Pengurus</p>
									<p className="text-sm text-gray-500 mt-1">Mohon tunggu, sedang memproses...</p>
								</div>
							</div>
						</div>
					)}
					
					<form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-6">
						{/* Section 1: Foto & Identitas Dasar */}
						<div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-100">
							<div className="flex items-center gap-2 mb-6">
								<div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
									<FaUserCircle className="w-5 h-5 text-white" />
								</div>
								<h3 className="text-lg font-bold text-gray-900">Foto & Identitas Dasar</h3>
							</div>
							
							<div className="flex flex-col md:flex-row items-start gap-8">
								{/* Avatar Upload Section */}
								<div className="flex-shrink-0">
									<div className="relative group">
										{avatarPreview ? (
											<>
												<img
													src={avatarPreview}
													alt="Avatar Preview"
													className="w-32 h-32 rounded-2xl object-cover border-4 border-white shadow-xl ring-4 ring-blue-200"
												/>
												<button
													type="button"
													onClick={removeAvatar}
													className="absolute -top-2 -right-2 w-9 h-9 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 transform hover:scale-110 hover:rotate-90"
													title="Hapus foto"
												>
													<FaTimes className="w-5 h-5" />
												</button>
											</>
										) : (
											<>
												<div 
													onClick={() => fileInputRef.current?.click()}
													className="w-32 h-32 rounded-2xl bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 flex items-center justify-center border-4 border-white shadow-xl cursor-pointer transition-all duration-300 hover:shadow-2xl group-hover:scale-105 ring-4 ring-blue-200"
												>
													<FaUserCircle className="w-16 h-16 text-blue-400 group-hover:text-indigo-500 transition-colors duration-300" />
												</div>
												<button
													type="button"
													onClick={() => fileInputRef.current?.click()}
													className="absolute -bottom-2 -right-2 w-11 h-11 bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-full flex items-center justify-center shadow-xl transition-all duration-200 transform hover:scale-110"
													title="Pilih foto"
												>
													<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
													</svg>
												</button>
											</>
										)}
										{editData?.status_verifikasi === "verified" && (
											<div className="absolute -top-2 -left-2 w-9 h-9 bg-green-500 rounded-full flex items-center justify-center border-3 border-white shadow-lg animate-pulse">
												<FaCheck className="w-5 h-5 text-white" />
											</div>
										)}
									</div>
									<div className="mt-4 text-center">
										<p className="text-sm font-semibold text-gray-700">
											{avatarPreview ? "Foto Profil" : "Upload Foto"}
										</p>
										<p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF, SVG</p>
										<p className="text-xs text-blue-600 font-medium mt-0.5">Max 2MB</p>
										{avatarError && (
											<div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
												<p className="text-red-600 text-xs font-medium flex items-center justify-center gap-1">
													<FaExclamationCircle className="w-3 h-3" />
													{avatarError}
												</p>
											</div>
										)}
									</div>
									<input
										ref={fileInputRef}
										type="file"
										accept="image/*"
										onChange={handleAvatarChange}
										className="hidden"
									/>
								</div>

								{/* Basic Identity Fields */}
								<div className="flex-1 space-y-4">
									{/* Nama Lengkap */}
									<div>
										<label className="block text-sm font-semibold text-gray-800 mb-1.5">
											Nama Lengkap <span className="text-red-500">*</span>
										</label>
										<div className="input-group">
											<input
												type="text"
												{...register("nama_lengkap")}
												onInput={forceUppercaseInput}
												className="w-full bg-white/80 backdrop-blur-sm uppercase"
												placeholder="Nama lengkap pengurus"
											/>
										</div>
										{errors.nama_lengkap && (
											<p className="text-red-500 text-sm mt-1 flex items-center gap-1">
												<FaExclamationCircle className="w-3 h-3" />
												{errors.nama_lengkap.message}
											</p>
										)}
									</div>

									{/* NIK */}
									<div>
										<label className="block text-sm font-semibold text-gray-800 mb-1.5">NIK <span className="text-red-500">*</span></label>
										<div className="input-group">
											<input
												type="text"
												{...register("nik")}
												className="w-full bg-white/80 backdrop-blur-sm"
												placeholder="1234567890123456"
												maxLength="16"
											/>
										</div>
										{errors.nik ? (
											<p className="text-red-500 text-sm mt-1 flex items-center gap-1">
												<FaExclamationCircle className="w-3 h-3" />
												{errors.nik.message}
											</p>
										) : (
											<p className="text-xs text-blue-700 mt-1 font-medium">16 digit angka</p>
										)}
									</div>

									{/* No Telepon */}
									<div>
										<label className="block text-sm font-semibold text-gray-800 mb-1.5">No. Telepon <span className="text-red-500">*</span></label>
										<div className="input-group">
											<input
												type="tel"
												{...register("no_telepon")}
												className="w-full bg-white/80 backdrop-blur-sm"
												placeholder="081234567890"
											/>
										</div>
										{errors.no_telepon ? (
											<p className="text-red-500 text-sm mt-1 flex items-center gap-1">
												<FaExclamationCircle className="w-3 h-3" />
												{errors.no_telepon.message}
											</p>
										) : (
											<p className="text-xs text-blue-700 mt-1 font-medium">
												Format: 08xxxxxxxxx atau +62xxxxxxxxx
											</p>
										)}
									</div>
								</div>
							</div>
						</div>

						{/* Section 2: Personal Information */}
						<div className="space-y-5 p-6 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 rounded-2xl border border-green-200 shadow-sm">
							<div className="flex items-center gap-3 mb-4">
								<div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
									<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
									</svg>
								</div>
								<h3 className="text-lg font-bold text-gray-900">Informasi Personal</h3>
							</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
							{/* Tempat Lahir */}
							<div>
								<label className="block text-sm font-semibold text-gray-800 mb-1.5">Tempat Lahir <span className="text-red-500">*</span></label>
								<div className="input-group">
									<input
										type="text"
										{...register("tempat_lahir")}
										onInput={forceUppercaseInput}
										className="w-full bg-white/80 backdrop-blur-sm uppercase"
										placeholder="Tempat lahir"
									/>
								</div>
								{errors.tempat_lahir && (
									<p className="text-red-500 text-sm mt-1 flex items-center gap-1">
										<FaExclamationCircle className="w-3 h-3" />
										{errors.tempat_lahir.message}
									</p>
								)}
							</div>

							{/* Tanggal Lahir */}
							<div>
								<label className="block text-sm font-semibold text-gray-800 mb-1.5">Tanggal Lahir <span className="text-red-500">*</span></label>
								<div className="input-group">
									<input
										type="date"
										{...register("tanggal_lahir")}
										className="w-full bg-white/80 backdrop-blur-sm"
									/>
								</div>
								{errors.tanggal_lahir && (
									<p className="text-red-500 text-sm mt-1 flex items-center gap-1">
										<FaExclamationCircle className="w-3 h-3" />
										{errors.tanggal_lahir.message}
									</p>
								)}
							</div>

							{/* Jenis Kelamin */}
							<div>
								<label className="block text-sm font-semibold text-gray-800 mb-1.5">Jenis Kelamin <span className="text-red-500">*</span></label>
								<div className="input-group">
									<select
										{...register("jenis_kelamin")}
										className="w-full bg-white/80 backdrop-blur-sm text-gray-900 focus:outline-none focus:ring-0 uppercase"
									>
										<option value="">PILIH JENIS KELAMIN</option>
										<option
											value="LAKI-LAKI"
											className="text-gray-900 bg-white"
										>
											LAKI-LAKI
										</option>
										<option
											value="PEREMPUAN"
											className="text-gray-900 bg-white"
										>
											PEREMPUAN
										</option>
									</select>
								</div>
								{errors.jenis_kelamin && (
									<p className="text-red-500 text-sm mt-1 flex items-center gap-1">
										<FaExclamationCircle className="w-3 h-3" />
										{errors.jenis_kelamin.message}
									</p>
								)}
							</div>

							{/* Status Perkawinan */}
							<div>
								<label className="block text-sm font-semibold text-gray-800 mb-1.5">Status Perkawinan <span className="text-red-500">*</span></label>
								<div className="input-group">
									<select
										{...register("status_perkawinan")}
										className="w-full bg-white/80 backdrop-blur-sm text-gray-900 focus:outline-none focus:ring-0 uppercase"
									>
										<option value="">PILIH STATUS PERKAWINAN</option>
										<option
											value="BELUM MENIKAH"
											className="text-gray-900 bg-white"
										>
											BELUM MENIKAH
										</option>
										<option value="MENIKAH" className="text-gray-900 bg-white">
											MENIKAH
										</option>
										<option
											value="CERAI HIDUP"
											className="text-gray-900 bg-white"
										>
											CERAI HIDUP
										</option>
										<option
											value="CERAI MATI"
											className="text-gray-900 bg-white"
										>
											CERAI MATI
										</option>
									</select>
								</div>
								{errors.status_perkawinan && (
									<p className="text-red-500 text-sm mt-1 flex items-center gap-1">
										<FaExclamationCircle className="w-3 h-3" />
										{errors.status_perkawinan.message}
									</p>
								)}
							</div>

							{/* Pendidikan */}
							<div>
								<label className="block text-sm font-semibold text-gray-800 mb-1.5">Pendidikan</label>
								<div className="input-group">
									<select
										{...register("pendidikan")}
										className="w-full bg-white/80 backdrop-blur-sm text-gray-900 focus:outline-none focus:ring-0 uppercase"
									>
										<option value="">PILIH PENDIDIKAN</option>
										<option value="SD" className="text-gray-900 bg-white">
											SD
										</option>
										<option value="SMP" className="text-gray-900 bg-white">
											SMP
										</option>
										<option value="SMA/SMK" className="text-gray-900 bg-white">
											SMA/SMK
										</option>
										<option value="D1" className="text-gray-900 bg-white">
											D1
										</option>
										<option value="D2" className="text-gray-900 bg-white">
											D2
										</option>
										<option value="D3" className="text-gray-900 bg-white">
											D3
										</option>
										<option value="S1" className="text-gray-900 bg-white">
											S1
										</option>
										<option value="S2" className="text-gray-900 bg-white">
											S2
										</option>
										<option value="S3" className="text-gray-900 bg-white">
											S3
										</option>
									</select>
								</div>
								{errors.pendidikan && (
									<p className="text-red-500 text-sm mt-1 flex items-center gap-1">
										<FaExclamationCircle className="w-3 h-3" />
										{errors.pendidikan.message}
									</p>
								)}
							</div>

							{/* Agama */}
							<div>
								<label className="block text-sm font-semibold text-gray-800 mb-1.5">Agama <span className="text-red-500">*</span></label>
								<div className="input-group">
									<select
										{...register("agama")}
										className="w-full bg-white/80 backdrop-blur-sm text-gray-900 focus:outline-none focus:ring-0 uppercase"
									>
										<option value="">PILIH AGAMA</option>
										<option value="ISLAM" className="text-gray-900 bg-white">ISLAM</option>
										<option value="KRISTEN" className="text-gray-900 bg-white">KRISTEN</option>
										<option value="KATOLIK" className="text-gray-900 bg-white">KATOLIK</option>
										<option value="HINDU" className="text-gray-900 bg-white">HINDU</option>
										<option value="BUDDHA" className="text-gray-900 bg-white">BUDDHA</option>
										<option value="KONGHUCU" className="text-gray-900 bg-white">KONGHUCU</option>
									</select>
								</div>
								{errors.agama && (
									<p className="text-red-500 text-sm mt-1 flex items-center gap-1">
										<FaExclamationCircle className="w-3 h-3" />
										{errors.agama.message}
									</p>
								)}
							</div>

							{/* Golongan Darah */}
							<div>
								<label className="block text-sm font-semibold text-gray-800 mb-1.5">Golongan Darah <span className="text-red-500">*</span></label>
								<div className="input-group">
									<select
										{...register("golongan_darah")}
										className="w-full bg-white/80 backdrop-blur-sm text-gray-900 focus:outline-none focus:ring-0 uppercase"
									>
										<option value="">PILIH GOLONGAN DARAH</option>
										<option value="A" className="text-gray-900 bg-white">A</option>
										<option value="B" className="text-gray-900 bg-white">B</option>
										<option value="AB" className="text-gray-900 bg-white">AB</option>
										<option value="O" className="text-gray-900 bg-white">O</option>
									</select>
								</div>
								{errors.golongan_darah && (
									<p className="text-red-500 text-sm mt-1 flex items-center gap-1">
										<FaExclamationCircle className="w-3 h-3" />
										{errors.golongan_darah.message}
									</p>
								)}
							</div>

							{/* Alamat */}
							<div className="md:col-span-2">
								<label className="block text-sm font-semibold text-gray-800 mb-1.5">Alamat Rumah</label>
								<div className="input-group">
									<textarea
										{...register("alamat")}
										onInput={forceUppercaseInput}
										className="w-full bg-white/80 backdrop-blur-sm uppercase"
										rows="3"
										placeholder="Alamat lengkap"
									/>
								</div>
								{errors.alamat && (
									<p className="text-red-500 text-sm mt-1 flex items-center gap-1">
										<FaExclamationCircle className="w-3 h-3" />
										{errors.alamat.message}
									</p>
								)}
							</div>
						</div>
						</div>

						{/* Section 3: Informasi Jabatan */}
						<div className="space-y-5 p-6 bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50 rounded-2xl border border-purple-200 shadow-sm">
							<div className="flex items-center gap-3 mb-4">
								<div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
									<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
									</svg>
								</div>
								<h3 className="text-lg font-bold text-gray-900">Informasi Jabatan</h3>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
								{/* Jabatan */}
								<div>
									<label className="block text-sm font-semibold text-gray-800 mb-1.5">
										Jabatan <span className="text-red-500">*</span>
									</label>
									{defaultJabatan && !editData ? (
										<>
											<input
												type="text"
												value={toUppercaseString(defaultJabatan)}
												readOnly
												className="w-full bg-gray-100 text-gray-700 font-medium px-3 py-2 rounded-lg border border-gray-300 cursor-not-allowed uppercase"
											/>
											<input type="hidden" {...register("jabatan")} />
											<p className="text-xs text-blue-600 mt-1 font-medium">Jabatan otomatis dipilih dari kolom jabatan</p>
										</>
									) : (
										<div className="input-group">
											<select
												{...register("jabatan")}
												className="w-full bg-white/80 backdrop-blur-sm text-gray-900 focus:outline-none focus:ring-0 uppercase"
											>
												<option value="">PILIH JABATAN</option>
												{getJabatanOptions(kelembagaanType).map((option) => (
													<option
														key={option.value}
														value={toUppercaseString(option.value)}
														className="text-gray-900 bg-white"
													>
														{toUppercaseString(option.label)}
													</option>
												))}
											</select>
										</div>
									)}
									{errors.jabatan && (
										<p className="text-red-500 text-sm mt-1 flex items-center gap-1">
											<FaExclamationCircle className="w-3 h-3" />
											{errors.jabatan.message}
										</p>
									)}
								</div>

								{/* Status Jabatan */}
								<div>
									<label className="block text-sm font-semibold text-gray-800 mb-1.5">Status Jabatan</label>
									<div className="input-group">
										<select
											{...register("status_jabatan")}
											className="w-full bg-white/80 backdrop-blur-sm text-gray-900 focus:outline-none focus:ring-0"
										>
											<option value="aktif" className="text-gray-900 bg-white">
												Aktif
											</option>
											<option
												value="nonaktif"
												className="text-gray-900 bg-white"
											>
												Nonaktif
											</option>
										</select>
									</div>
									{errors.status_jabatan && (
										<p className="text-red-500 text-sm mt-1 flex items-center gap-1">
											<FaExclamationCircle className="w-3 h-3" />
											{errors.status_jabatan.message}
										</p>
									)}
								</div>

								{/* Tanggal Mulai Jabatan */}
								<div>
									<label className="block text-sm font-semibold text-gray-800 mb-1.5">
										Tanggal Mulai Jabatan <span className="text-red-500">*</span>
									</label>
									<div className="input-group">
										<input
											type="date"
											{...register("tanggal_mulai_jabatan")}
											className="w-full bg-white/80 backdrop-blur-sm"
										/>
									</div>
									{errors.tanggal_mulai_jabatan && (
										<p className="text-red-500 text-sm mt-1 flex items-center gap-1">
											<FaExclamationCircle className="w-3 h-3" />
											{errors.tanggal_mulai_jabatan.message}
										</p>
									)}
								</div>

								{/* Tanggal Akhir Jabatan */}
								<div>
									<label className="block text-sm font-semibold text-gray-800 mb-1.5">Tanggal Akhir Jabatan <span className="text-red-500">*</span></label>
									<div className="input-group">
										<input
											type="date"
											{...register("tanggal_akhir_jabatan")}
											className="w-full bg-white/80 backdrop-blur-sm"
										/>
									</div>
									{errors.tanggal_akhir_jabatan && (
										<p className="text-red-500 text-sm mt-1 flex items-center gap-1">
											<FaExclamationCircle className="w-3 h-3" />
											{errors.tanggal_akhir_jabatan.message}
										</p>
									)}
								</div>
							</div>
						</div>

						{/* Section 4: SK Produk Hukum */}
						<div className="space-y-4 p-6 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 rounded-2xl border border-amber-200 shadow-sm">
							<div className="flex items-center gap-3 mb-4">
								<div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
									<LuFileText className="w-6 h-6 text-white" />
								</div>
								<h3 className="text-lg font-bold text-gray-900">SK Produk Hukum</h3>
							</div>

							<div>
								<label className="block text-sm font-semibold text-gray-800 mb-2">
									Pilih SK Pengangkatan <span className="text-red-500">*</span>
									<span className="text-xs text-amber-700 ml-2 font-normal">
										(Keputusan Kepala Desa yang berlaku)
									</span>
								</label>
								<Controller
									name="produk_hukum_id"
									control={control}
									render={({ field }) => (
										<div className="relative">
											<button
												type="button"
												className={`w-full text-left border rounded-lg px-3 py-2.5 text-sm flex items-center justify-between transition-colors ${field.value ? "border-amber-300 bg-amber-50" : "border-gray-300 bg-white"} ${isSubmitting ? "opacity-50 cursor-not-allowed" : "hover:border-amber-400"}`}
												onClick={() => !isSubmitting && setShowPhDropdown((v) => !v)}
												disabled={isSubmitting}
											>
												{field.value ? (
													<div className="flex-1 min-w-0">
														<p className="font-medium text-amber-700 truncate">{produkHukumList.find((p) => p.id === field.value)?.judul || "—"}</p>
														<p className="text-xs text-amber-500 mt-0.5">SK — No. {produkHukumList.find((p) => p.id === field.value)?.nomor}</p>
													</div>
												) : (
													<span className="text-gray-400">Pilih SK pengangkatan...</span>
												)}
												<LuChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 ml-2 transition-transform ${showPhDropdown ? "rotate-180" : ""}`} />
											</button>
											{showPhDropdown && (
												<div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
													<div className="p-2 border-b border-gray-100">
														<div className="relative">
															<LuSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
															<input
																className="w-full border border-gray-200 rounded-md pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
																placeholder="Cari judul atau nomor SK..."
																value={phSearchTerm}
																onChange={(e) => setPhSearchTerm(e.target.value)}
																autoFocus
															/>
														</div>
													</div>
													<div className="max-h-48 overflow-y-auto">
														{loadingPh ? (
															<div className="p-3 text-center text-sm text-gray-500">
																<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-500 mx-auto mb-1"></div>
																Memuat...
															</div>
														) : produkHukumList.filter((ph) =>
															!phSearchTerm || (ph.judul || "").toLowerCase().includes(phSearchTerm.toLowerCase()) || (ph.nomor || "").toLowerCase().includes(phSearchTerm.toLowerCase())
														).length === 0 ? (
															<div className="p-3 text-center text-sm text-gray-500">
																{phSearchTerm ? "Tidak ditemukan" : "Belum ada SK Kepala Desa berlaku"}
															</div>
														) : (
															produkHukumList
																.filter((ph) =>
																	!phSearchTerm || (ph.judul || "").toLowerCase().includes(phSearchTerm.toLowerCase()) || (ph.nomor || "").toLowerCase().includes(phSearchTerm.toLowerCase())
																)
																.map((ph) => (
																	<button
																		key={ph.id}
																		type="button"
																		className={`w-full text-left px-3 py-2 border-b border-gray-50 last:border-b-0 hover:bg-amber-50 transition-colors ${field.value === ph.id ? "bg-amber-50" : ""}`}
																		onClick={() => {
																			field.onChange(ph.id);
																			setShowPhDropdown(false);
																			setPhSearchTerm("");
																		}}
																	>
																		<div className="flex items-center justify-between">
																			<div className="flex-1 min-w-0">
																				<p className={`text-sm font-medium truncate ${field.value === ph.id ? "text-amber-700" : "text-gray-900"}`}>{ph.judul}</p>
																				<p className="text-xs text-gray-500">Keputusan Kepala Desa — No. {ph.nomor}</p>
																			</div>
																			{field.value === ph.id && <LuCheck className="w-4 h-4 text-amber-600 ml-2 flex-shrink-0" />}
																		</div>
																	</button>
																))
														)}
													</div>
												</div>
											)}
										</div>
									)}
								/>

								{errors.produk_hukum_id && (
									<p className="text-red-500 text-sm mt-1 flex items-center gap-1">
										<FaExclamationCircle className="w-3 h-3" />
										{errors.produk_hukum_id.message}
									</p>
								)}
								<div className="mt-2 p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-amber-200">
									<p className="text-xs text-gray-700 leading-relaxed">
										Pilih Surat Keputusan (SK) Kepala Desa sebagai dasar hukum pengangkatan
										pengurus ini. SK ini akan menjadi rujukan legal untuk posisi jabatan yang dipegang.
									</p>
								</div>
							</div>
						</div>

						{/* Section 5: Nomor Buku Nikah (conditional) */}
						{showBukuNikah && (
							<div className="space-y-4 p-6 bg-gradient-to-br from-pink-50 via-rose-50 to-red-50 rounded-2xl border border-pink-200 shadow-sm">
								<div className="flex items-center gap-3 mb-4">
									<div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
										<LuBookOpen className="w-6 h-6 text-white" />
									</div>
									<h3 className="text-lg font-bold text-gray-900">Data Pernikahan</h3>
								</div>
								<div>
									<label className="block text-sm font-semibold text-gray-800 mb-1.5">
										Nomor Buku Nikah <span className="text-red-500">*</span>
									</label>
									<div className="input-group">
										<input
											type="text"
											{...register("nomor_buku_nikah")}
											onInput={forceUppercaseInput}
											className="w-full bg-white/80 backdrop-blur-sm uppercase"
											placeholder="Masukkan nomor buku nikah"
										/>
									</div>
									{errors.nomor_buku_nikah && (
										<p className="text-red-500 text-sm mt-1 flex items-center gap-1">
											<FaExclamationCircle className="w-3 h-3" />
											{errors.nomor_buku_nikah.message}
										</p>
									)}
									<p className="text-xs text-pink-600 mt-1 font-medium">
										Wajib diisi untuk jabatan Ketua RT/RW dengan status menikah
									</p>
								</div>
							</div>
						)}

					{/* Footer - Action Buttons */}
					<div className="flex items-center justify-between p-6 border-t bg-gradient-to-r from-gray-50 via-white to-gray-50 rounded-b-2xl">
						<div className="text-sm text-gray-600 flex items-center gap-1.5">
							<span className="text-red-500 text-lg">*</span>
							<span className="font-medium">Field wajib diisi</span>
						</div>
						<div className="flex gap-3">
							<button
								type="button"
								onClick={onClose}
								disabled={isSubmitting}
								className="px-5 py-2.5 text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-sm hover:shadow flex items-center gap-2"
							>
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
								Batal
							</button>
							<button
								type="submit"
								disabled={isSubmitting}
								className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white rounded-xl hover:from-indigo-700 hover:via-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 min-w-[160px] justify-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
							>
								{isSubmitting ? (
									<>
										<FaSpinner className="w-5 h-5 animate-spin" />
										<span>Menyimpan...</span>
									</>
								) : (
									<>
										<FaSave className="w-5 h-5" />
										<span>{editData ? "Update Pengurus" : "Simpan Pengurus"}</span>
									</>
								)}
							</button>
						</div>
					</div>
				</form>
			</div>
			</div>
		</div>
	);
}
