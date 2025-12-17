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
import Swal from "sweetalert2";
import SearchableProdukHukumSelect from "../../shared/SearchableProdukHukumSelect";
import { getProdukHukumList } from "../../../api/aparaturDesaApi";
import { getJabatanOptions } from "../../../constants/jabatanMapping";

// Helper function for optional fields
const emptyToUndef = (schema) =>
	z.preprocess((v) => (v === "" || v === null ? undefined : v), schema);

// Zod validation schema with comprehensive frontend validation
const pengurusSchema = z.object({
	nama_lengkap: z
		.string()
		.min(1, "Nama lengkap wajib diisi")
		.min(2, "Nama lengkap minimal 2 karakter")
		.max(255, "Nama lengkap maksimal 255 karakter"),
	nik: emptyToUndef(
		z
			.string()
			.length(16, "NIK harus 16 digit")
			.regex(/^\d+$/, "NIK hanya boleh berisi angka")
			.optional()
	),
	tempat_lahir: emptyToUndef(
		z.string().max(255, "Tempat lahir maksimal 255 karakter").optional()
	),
	tanggal_lahir: emptyToUndef(
		z
			.string()
			.refine((date) => {
				if (!date) return true;
				const birthDate = new Date(date);
				const today = new Date();
				const age = today.getFullYear() - birthDate.getFullYear();
				return age >= 17 && age <= 100;
			}, "Usia harus antara 17-100 tahun")
			.optional()
	),
	jenis_kelamin: emptyToUndef(z.enum(["Laki-laki", "Perempuan"]).optional()),
	status_perkawinan: emptyToUndef(z.string().optional()),
	alamat: emptyToUndef(
		z.string().max(1000, "Alamat maksimal 1000 karakter").optional()
	),
	no_telepon: emptyToUndef(
		z
			.string()
			.regex(
				/^(\+62|62|0)[0-9]{8,13}$/,
				"Format nomor telepon tidak valid (contoh: 081234567890)"
			)
			.max(32, "Nomor telepon maksimal 32 karakter")
			.optional()
	),
	pendidikan: emptyToUndef(z.string().optional()),
	jabatan: z.string().min(1, "Jabatan wajib diisi"),
	tanggal_mulai_jabatan: z
		.string()
		.min(1, "Tanggal mulai jabatan wajib diisi")
		.refine((date) => {
			const selectedDate = new Date(date);
			const today = new Date();
			return selectedDate <= today;
		}, "Tanggal mulai jabatan tidak boleh di masa depan"),
	tanggal_akhir_jabatan: emptyToUndef(
		z
			.string()
			.refine((date, ctx) => {
				if (!date) return true;
				const endDate = new Date(date);
				const startDate = new Date(ctx.parent.tanggal_mulai_jabatan);
				return endDate > startDate;
			}, "Tanggal akhir harus setelah tanggal mulai jabatan")
			.optional()
	),
	status_jabatan: z.enum(["aktif", "selesai"]).default("aktif"),
	produk_hukum_id: emptyToUndef(z.string().optional()),
});

export default function PengurusForm({
	isOpen,
	onClose,
	onSubmit,
	editData = null,
	kelembagaanType,
	kelembagaanId,
}) {
	// Get image base URL from environment
	const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;
	// Form setup
	const {
		register,
		handleSubmit,
		control,
		reset,
		setError,
		formState: { errors, isSubmitting },
	} = useForm({
		resolver: zodResolver(pengurusSchema),
		defaultValues: {
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
			status_jabatan: "aktif",
			produk_hukum_id: "",
		},
	});

	// State
	const [produkHukumList, setProdukHukumList] = useState([]);
	const [avatar, setAvatar] = useState(null);
	const [avatarPreview, setAvatarPreview] = useState(null);
	const [avatarError, setAvatarError] = useState("");
	const fileInputRef = useRef(null);

	// Load Produk Hukum list
	useEffect(() => {
		const loadProdukHukum = async () => {
			try {
				const response = await getProdukHukumList();
				setProdukHukumList(response.data.data.data || []);
			} catch (error) {
				console.error("Error loading produk hukum:", error);
				setProdukHukumList([]); // Ensure it's always an array
			}
		};
		loadProdukHukum();
	}, []); // Reset form when editData changes
	useEffect(() => {
		if (editData) {
			reset({
				nama_lengkap: editData.nama_lengkap || "",
				nik: editData.nik || "",
				tempat_lahir: editData.tempat_lahir || "",
				tanggal_lahir: editData.tanggal_lahir || "",
				jenis_kelamin: editData.jenis_kelamin || "",
				status_perkawinan: editData.status_perkawinan || "",
				alamat: editData.alamat || "",
				no_telepon: editData.no_telepon || "",
				pendidikan: editData.pendidikan || "",
				jabatan: editData.jabatan || "",
				tanggal_mulai_jabatan: editData.tanggal_mulai_jabatan || "",
				tanggal_akhir_jabatan: editData.tanggal_akhir_jabatan || "",
				status_jabatan: editData.status_jabatan || "aktif",
				produk_hukum_id: editData.produk_hukum_id || "",
			});

			if (editData.avatar) {
				setAvatarPreview(`${imageBaseUrl}/uploads/${editData.avatar}`);
			}
		} else {
			reset();
			setAvatarPreview(null);
		}
		setAvatar(null);
	}, [editData, reset, imageBaseUrl]);

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
		try {
			// Validate all data before submit
			if (!validateBeforeSubmit()) {
				return; // Stop submission if validation fails
			}

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

			const submitData = new FormData();

			// Map frontend field names to backend expected field names (if needed)
			const fieldMapping = {
				// No mapping needed anymore - backend now uses same field names as frontend
			};

			// Add form fields with proper mapping
			// Skip pengurusable_type and pengurusable_id as they will be added separately with proper mapping
			Object.keys(formData).forEach((key) => {
				// Skip these fields - they will be added separately
				if (key === 'pengurusable_type' || key === 'pengurusable_id') {
					return;
				}
				
				if (
					formData[key] !== "" &&
					formData[key] !== null &&
					formData[key] !== undefined
				) {
					const backendFieldName = fieldMapping[key] || key;
					submitData.append(backendFieldName, formData[key]);
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
			};

			const backendKelembagaanType =
				kelembagaanTypeMapping[kelembagaanType] || kelembagaanType;

			// Add kelembagaan info with correct field names for backend
			submitData.append("pengurusable_type", backendKelembagaanType);
			submitData.append("pengurusable_id", kelembagaanId);

			await onSubmit(submitData);

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
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
			<div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
				{/* Loading overlay */}
				{isSubmitting && (
					<div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
						<div className="flex flex-col items-center gap-3">
							<FaSpinner className="w-8 h-8 text-indigo-600 animate-spin" />
							<p className="text-sm text-gray-600 font-medium">
								Menyimpan data pengurus...
							</p>
						</div>
					</div>
				)}
				<form onSubmit={handleSubmit(onFormSubmit)}>
					{/* Header */}
					<div className="flex items-center justify-between p-6 border-b">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
								<FaUserCircle className="w-6 h-6 text-indigo-600" />
							</div>
							<div>
								<h2 className="text-xl font-semibold text-gray-900">
									{editData ? "Edit Pengurus" : "Tambah Pengurus"}
								</h2>
								<p className="text-sm text-gray-500">
									{kelembagaanType?.toUpperCase()} - Kelola data pengurus
								</p>
							</div>
						</div>
						<button
							type="button"
							onClick={onClose}
							disabled={isSubmitting}
							className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							<FaTimes className="w-4 h-4 text-gray-500" />
						</button>
					</div>

					{/* Content */}
					<div className="p-6 space-y-6">
						{/* Avatar Upload Section */}
						<div className="flex items-start gap-6">
							<div className="flex flex-col items-center">
								<div className="relative group">
									{avatarPreview ? (
										<>
											<img
												src={avatarPreview}
												alt="Avatar Preview"
												className="w-28 h-28 rounded-full object-cover border-4 border-gray-200 shadow-md"
											/>
											{/* Remove Button Overlay */}
											<button
												type="button"
												onClick={removeAvatar}
												className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 transform hover:scale-110"
												title="Hapus foto"
											>
												<FaTimes className="w-4 h-4" />
											</button>
										</>
									) : (
										<>
											<div className="w-28 h-28 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-4 border-gray-200 shadow-md cursor-pointer transition-all duration-200 hover:shadow-lg group-hover:border-indigo-300">
												<FaUserCircle className="w-14 h-14 text-gray-400 group-hover:text-indigo-400 transition-colors duration-200" />
											</div>
											{/* Camera Button Overlay */}
											<button
												type="button"
												onClick={() => fileInputRef.current?.click()}
												className="absolute -bottom-1 -right-1 w-10 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 transform hover:scale-110"
												title="Pilih foto"
											>
												<svg
													className="w-5 h-5"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
													/>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
													/>
												</svg>
											</button>
										</>
									)}
									{editData?.status_verifikasi === "verified" && (
										<div className="absolute -top-2 -left-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-2 border-white shadow-md">
											<FaCheck className="w-4 h-4 text-white" />
										</div>
									)}
								</div>
								<div className="mt-3 text-center">
									<p className="text-sm text-gray-600">
										{avatarPreview ? "Foto Profil" : "Tambah Foto"}
									</p>
									<p className="text-xs text-gray-400 mt-1">
										Format: JPG, PNG, GIF, SVG
									</p>
									<p className="text-xs text-gray-500 font-medium">
										Maksimal 2MB
									</p>
									{avatarError && (
										<p className="text-red-500 text-xs mt-2 flex items-center justify-center gap-1">
											<FaExclamationCircle className="w-3 h-3" />
											{avatarError}
										</p>
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

							{/* Basic Info */}
							<div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
								{/* Nama Lengkap */}
								<div className="md:col-span-2">
									<label className="label-style">
										Nama Lengkap <span className="text-red-500">*</span>
									</label>
									<div className="input-group">
										<input
											type="text"
											{...register("nama_lengkap")}
											className="w-full"
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
									<label className="label-style">NIK</label>
									<div className="input-group">
										<input
											type="text"
											{...register("nik")}
											className="w-full"
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
										<p className="text-xs text-gray-400 mt-1">16 digit angka</p>
									)}
								</div>

								{/* No Telepon */}
								<div>
									<label className="label-style">No. Telepon</label>
									<div className="input-group">
										<input
											type="tel"
											{...register("no_telepon")}
											className="w-full"
											placeholder="081234567890"
										/>
									</div>
									{errors.no_telepon ? (
										<p className="text-red-500 text-sm mt-1 flex items-center gap-1">
											<FaExclamationCircle className="w-3 h-3" />
											{errors.no_telepon.message}
										</p>
									) : (
										<p className="text-xs text-gray-400 mt-1">
											Format: 08xxxxxxxxx atau +62xxxxxxxxx
										</p>
									)}
								</div>
							</div>
						</div>

						{/* Personal Information */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{/* Tempat Lahir */}
							<div>
								<label className="label-style">Tempat Lahir</label>
								<div className="input-group">
									<input
										type="text"
										{...register("tempat_lahir")}
										className="w-full"
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
								<label className="label-style">Tanggal Lahir</label>
								<div className="input-group">
									<input
										type="date"
										{...register("tanggal_lahir")}
										className="w-full"
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
								<label className="label-style">Jenis Kelamin</label>
								<div className="input-group">
									<select
										{...register("jenis_kelamin")}
										className="w-full bg-transparent text-gray-900 focus:outline-none focus:ring-0"
									>
										<option value="">Pilih jenis kelamin</option>
										<option
											value="Laki-laki"
											className="text-gray-900 bg-white"
										>
											Laki-laki
										</option>
										<option
											value="Perempuan"
											className="text-gray-900 bg-white"
										>
											Perempuan
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
								<label className="label-style">Status Perkawinan</label>
								<div className="input-group">
									<select
										{...register("status_perkawinan")}
										className="w-full bg-transparent text-gray-900 focus:outline-none focus:ring-0"
									>
										<option value="">Pilih status perkawinan</option>
										<option
											value="Belum Menikah"
											className="text-gray-900 bg-white"
										>
											Belum Menikah
										</option>
										<option value="Menikah" className="text-gray-900 bg-white">
											Menikah
										</option>
										<option
											value="Cerai Hidup"
											className="text-gray-900 bg-white"
										>
											Cerai Hidup
										</option>
										<option
											value="Cerai Mati"
											className="text-gray-900 bg-white"
										>
											Cerai Mati
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
							<div className="md:col-span-2">
								<label className="label-style">Pendidikan</label>
								<div className="input-group">
									<select
										{...register("pendidikan")}
										className="w-full bg-transparent text-gray-900 focus:outline-none focus:ring-0"
									>
										<option value="">Pilih pendidikan</option>
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
						</div>

						{/* Alamat */}
						<div>
							<label className="label-style">Alamat</label>
							<div className="input-group">
								<textarea
									{...register("alamat")}
									className="w-full"
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

						{/* Jabatan Information */}
						<div className="border-t pt-6">
							<h3 className="text-lg font-semibold text-gray-900 mb-4">
								Informasi Jabatan
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{/* Jabatan */}
								<div>
									<label className="label-style">
										Jabatan <span className="text-red-500">*</span>
									</label>
									<div className="input-group">
										<select
											{...register("jabatan")}
											className="w-full bg-transparent text-gray-900 focus:outline-none focus:ring-0"
										>
											<option value="">Pilih Jabatan</option>
											{getJabatanOptions(kelembagaanType).map((option) => (
												<option
													key={option.value}
													value={option.value}
													className="text-gray-900 bg-white"
												>
													{option.label}
												</option>
											))}
										</select>
									</div>
									{errors.jabatan && (
										<p className="text-red-500 text-sm mt-1 flex items-center gap-1">
											<FaExclamationCircle className="w-3 h-3" />
											{errors.jabatan.message}
										</p>
									)}
								</div>

								{/* Status Jabatan */}
								<div>
									<label className="label-style">Status Jabatan</label>
									<div className="input-group">
										<select
											{...register("status_jabatan")}
											className="w-full bg-transparent text-gray-900 focus:outline-none focus:ring-0"
										>
											<option value="aktif" className="text-gray-900 bg-white">
												Aktif
											</option>
											<option
												value="selesai"
												className="text-gray-900 bg-white"
											>
												Selesai
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
									<label className="label-style">
										Tanggal Mulai Jabatan{" "}
										<span className="text-red-500">*</span>
									</label>
									<div className="input-group">
										<input
											type="date"
											{...register("tanggal_mulai_jabatan")}
											className="w-full"
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
									<label className="label-style">Tanggal Akhir Jabatan</label>
									<div className="input-group">
										<input
											type="date"
											{...register("tanggal_akhir_jabatan")}
											className="w-full"
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

						{/* SK Produk Hukum */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								SK Produk Hukum
								<span className="text-xs text-gray-500 ml-2">
									(Surat Keputusan Pengangkatan)
								</span>
							</label>
							<Controller
								name="produk_hukum_id"
								control={control}
								render={({ field }) => (
									<SearchableProdukHukumSelect
										value={field.value}
										onChange={field.onChange}
										produkHukumList={
											Array.isArray(produkHukumList) ? produkHukumList : []
										}
									/>
								)}
							/>

							{errors.produk_hukum_id && (
								<p className="text-red-500 text-sm mt-1 flex items-center gap-1">
									<FaExclamationCircle className="w-3 h-3" />
									{errors.produk_hukum_id.message}
								</p>
							)}
							<p className="text-xs text-gray-500 mt-1">
								Pilih Surat Keputusan (SK) sebagai dasar hukum pengangkatan
								pengurus ini. SK ini akan menjadi rujukan legal untuk posisi
								jabatan yang dipegang.
							</p>
						</div>
					</div>

					{/* Footer */}
					<div className="flex items-center justify-between p-6 border-t bg-gray-50 rounded-b-lg">
						<div className="text-sm text-gray-500">
							<span className="text-red-500">*</span> Field wajib diisi
						</div>
						<div className="flex gap-3">
							<button
								type="button"
								onClick={onClose}
								disabled={isSubmitting}
								className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								Batal
							</button>
							<button
								type="submit"
								disabled={isSubmitting}
								className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 min-w-[140px] justify-center"
							>
								{isSubmitting ? (
									<>
										<FaSpinner className="w-4 h-4 animate-spin" />
										Menyimpan...
									</>
								) : (
									<>
										<FaSave className="w-4 h-4" />
										{editData ? "Update Pengurus" : "Simpan Pengurus"}
									</>
								)}
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}
