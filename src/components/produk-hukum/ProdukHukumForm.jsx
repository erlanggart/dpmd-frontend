import React, { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { z } from "zod";
import { LuFileText, LuCalendar, LuMapPin, LuUpload, LuFile } from "react-icons/lu";

// Skema validasi menggunakan Zod
const produkHukumSchema = z.object({
	judul: z.string().min(1, "Judul tidak boleh kosong"),
	nomor: z.string().min(1, "Nomor tidak boleh kosong"),
	tahun: z
		.string()
		.min(4, "Tahun harus 4 digit")
		.refine((val) => !isNaN(parseInt(val, 10)), {
			message: "Tahun harus berupa angka",
		})
		.refine(
			(val) =>
				parseInt(val, 10) >= 1900 &&
				parseInt(val, 10) <= new Date().getFullYear() + 1,
			{
				message: "Tahun tidak valid",
			}
		),
	jenis: z.enum([
		"Peraturan Desa",
		"Peraturan Kepala Desa",
		"Keputusan Kepala Desa",
	]),
	singkatan_jenis: z.enum(["PERDES", "PERKADES", "SK KADES"]),
	tempat_penetapan: z.string().min(1, "Tempat penetapan tidak boleh kosong"),
	tanggal_penetapan: z.string().min(1, "Tanggal penetapan tidak boleh kosong"),
	sumber: z.string().optional(),
	subjek: z.string().optional(),
	status_peraturan: z.enum(["berlaku", "dicabut"]),
	keterangan_status: z.string().optional(),
	file: z
		.any()
		.optional()
		.refine(
			(file) => !file || (file && file.size <= 10 * 1024 * 1024), // 10MB max size
			`Ukuran file maksimal adalah 10MB.`
		)
		.refine(
			(file) => !file || (file && file.type === "application/pdf"),
			`File harus berformat PDF.`
		),
});

const getTodayDateString = () => {
	const today = new Date();
	const year = today.getFullYear();
	const month = String(today.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
	const day = String(today.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

const ProdukHukumForm = ({ onSubmit, initialData }) => {
	const [formData, setFormData] = useState({
		judul: "",
		nomor: "",
		tahun: "",
		jenis: "Peraturan Desa",
		singkatan_jenis: "PERDES",
		tempat_penetapan: "",
		tanggal_penetapan: getTodayDateString(), // Default ke tanggal hari ini
		sumber: "",
		subjek: "",
		status_peraturan: "berlaku",
		keterangan_status: "",
		file: null,
	});
	const [errors, setErrors] = useState({});
	const [isSubmitting, setIsSubmitting] = useState(false);

	const onDrop = useCallback(
		(acceptedFiles) => {
			if (acceptedFiles.length > 0) {
				setFormData((prev) => ({ ...prev, file: acceptedFiles[0] }));
				if (errors.file) {
					setErrors((prevErrors) => ({ ...prevErrors, file: null }));
				}
			}
		},
		[errors.file]
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			"application/pdf": [".pdf"],
		},
		multiple: false,
	});

	useEffect(() => {
		if (initialData) {
			// Pastikan semua field ada dan dalam format string jika perlu
			setFormData({
				judul: initialData.judul || "",
				nomor: initialData.nomor || "",
				tahun: initialData.tahun ? String(initialData.tahun) : "",
				jenis: initialData.jenis || "Peraturan Desa",
				singkatan_jenis: initialData.singkatan_jenis || "PERDES",
				tempat_penetapan: initialData.tempat_penetapan || "",
				tanggal_penetapan:
					initialData.tanggal_penetapan || getTodayDateString(), // Gunakan data yang ada, atau default ke hari ini
				sumber: initialData.sumber || "",
				subjek: initialData.subjek || "",
				status_peraturan: initialData.status_peraturan || "berlaku",
				keterangan_status: initialData.keterangan_status || "",
				file: null, // File tidak diisi ulang untuk edit
			});
		} else {
			// Reset form untuk data baru, tapi pertahankan tanggal hari ini
			setFormData({
				judul: "",
				nomor: "",
				tahun: "",
				jenis: "Peraturan Desa",
				singkatan_jenis: "PERDES",
				tempat_penetapan: "",
				tanggal_penetapan: getTodayDateString(),
				sumber: "",
				subjek: "",
				status_peraturan: "berlaku",
				keterangan_status: "",
				file: null,
			});
		}
		// Bersihkan error setiap kali data awal berubah
		setErrors({});
	}, [initialData]);

	// Auto-select singkatan_jenis based on jenis
	useEffect(() => {
		const jenisToSingkatan = {
			"Peraturan Desa": "PERDES",
			"Peraturan Kepala Desa": "PERKADES",
			"Keputusan Kepala Desa": "SK KADES"
		};
		
		const newSingkatan = jenisToSingkatan[formData.jenis];
		if (newSingkatan && formData.singkatan_jenis !== newSingkatan) {
			setFormData(prev => ({ ...prev, singkatan_jenis: newSingkatan }));
		}
	}, [formData.jenis, formData.singkatan_jenis]);

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData({ ...formData, [name]: value });
		// Hapus pesan error untuk field yang sedang diubah
		if (errors[name]) {
			setErrors((prevErrors) => ({ ...prevErrors, [name]: null }));
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (isSubmitting) return; // Prevent double submission

		setIsSubmitting(true);
		const result = produkHukumSchema.safeParse(formData);

		if (!result.success) {
			console.log("Validation errors:", result.error);
			const newErrors = {};
			result.error.issues.forEach((err) => {
				newErrors[err.path[0]] = err.message;
			});
			setErrors(newErrors);
			setIsSubmitting(false);
			return; // Hentikan submit jika validasi gagal
		}

		try {
			// Jika validasi berhasil, bersihkan error dan kirim data
			setErrors({});
			await onSubmit(result.data); // Kirim data yang sudah divalidasi dan tunggu selesai
		} catch (error) {
			console.error("Error in form submission:", error);
			// Error akan ditangani di parent component, jadi kita hanya perlu reset loading
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6" noValidate>
			{/* Informasi Dasar */}
			<div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
				<h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
					<LuFileText className="w-5 h-5" />
					Informasi Dasar
				</h3>
				
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="md:col-span-2">
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Judul <span className="text-red-500">*</span>
						</label>
						<input
							type="text"
							name="judul"
							value={formData.judul}
							onChange={handleChange}
							placeholder="Masukkan judul produk hukum"
							className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
								errors.judul ? "border-red-400 bg-red-50" : "border-gray-300"
							}`}
						/>
						{errors.judul && (
							<p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">
								<span className="text-red-500">⚠</span> {errors.judul}
							</p>
						)}
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Nomor <span className="text-red-500">*</span>
						</label>
						<input
							type="text"
							name="nomor"
							value={formData.nomor}
							onChange={handleChange}
							placeholder="contoh: 123/XYZ/2023"
							className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
								errors.nomor ? "border-red-400 bg-red-50" : "border-gray-300"
							}`}
						/>
						{errors.nomor && (
							<p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">
								<span className="text-red-500">⚠</span> {errors.nomor}
							</p>
						)}
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Tahun <span className="text-red-500">*</span>
						</label>
						<input
							type="text"
							name="tahun"
							value={formData.tahun}
							onChange={handleChange}
							className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
								errors.tahun ? "border-red-400 bg-red-50" : "border-gray-300"
							}`}
							maxLength="4"
							placeholder="contoh: 2023"
						/>
						{errors.tahun && (
							<p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">
								<span className="text-red-500">⚠</span> {errors.tahun}
							</p>
						)}
					</div>
				</div>
			</div>

			{/* Jenis dan Singkatan */}
			<div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
				<h3 className="font-semibold text-purple-900 mb-4 flex items-center gap-2">
					<LuFile className="w-5 h-5" />
					Jenis Produk Hukum
				</h3>
				
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Jenis <span className="text-red-500">*</span>
						</label>
						<select
							name="jenis"
							value={formData.jenis}
							onChange={handleChange}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
						>
							<option value="Peraturan Desa">Peraturan Desa</option>
							<option value="Peraturan Kepala Desa">Peraturan Kepala Desa</option>
							<option value="Keputusan Kepala Desa">Keputusan Kepala Desa</option>
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Singkatan <span className="text-gray-500 text-xs">(otomatis)</span>
						</label>
						<input
							type="text"
							name="singkatan_jenis"
							value={formData.singkatan_jenis}
							disabled
							className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
						/>
						<p className="text-xs text-gray-500 mt-1">Terisi otomatis berdasarkan jenis</p>
					</div>
				</div>
			</div>

			{/* Lokasi dan Tanggal */}
			<div className="bg-gradient-to-r from-green-50 to-teal-50 p-4 rounded-lg border border-green-200">
				<h3 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
					<LuMapPin className="w-5 h-5" />
					Lokasi dan Tanggal
				</h3>
				
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Tempat Penetapan <span className="text-red-500">*</span>
						</label>
						<input
							type="text"
							name="tempat_penetapan"
							value={formData.tempat_penetapan}
							onChange={handleChange}
							placeholder="contoh: Desa Sukamaju"
							className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
								errors.tempat_penetapan ? "border-red-400 bg-red-50" : "border-gray-300"
							}`}
						/>
						{errors.tempat_penetapan && (
							<p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">
								<span className="text-red-500">⚠</span> {errors.tempat_penetapan}
							</p>
						)}
					</div>

					<div>
						<label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
							<LuCalendar className="w-4 h-4" />
							Tanggal Penetapan <span className="text-red-500">*</span>
						</label>
						<input
							type="date"
							name="tanggal_penetapan"
							value={formData.tanggal_penetapan}
							onChange={handleChange}
							className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
								errors.tanggal_penetapan ? "border-red-400 bg-red-50" : "border-gray-300"
							}`}
						/>
						{errors.tanggal_penetapan && (
							<p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">
								<span className="text-red-500">⚠</span> {errors.tanggal_penetapan}
							</p>
						)}
					</div>
				</div>
			</div>

			{/* Informasi Tambahan */}
			<div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
				<h3 className="font-semibold text-amber-900 mb-4">Informasi Tambahan</h3>
				
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Sumber <span className="text-gray-500 text-xs">(opsional)</span>
						</label>
						<input
							type="text"
							name="sumber"
							value={formData.sumber}
							onChange={handleChange}
							placeholder="contoh: LDes Sukamaju Tahun 2025 Nomor 5"
							className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Subjek <span className="text-gray-500 text-xs">(opsional)</span>
						</label>
						<input
							type="text"
							name="subjek"
							value={formData.subjek}
							onChange={handleChange}
							placeholder="contoh: Kependudukan, Pembangunan, dll"
							className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Status Peraturan <span className="text-red-500">*</span>
						</label>
						<select
							name="status_peraturan"
							value={formData.status_peraturan}
							onChange={handleChange}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
						>
							<option value="berlaku">Berlaku</option>
							<option value="dicabut">Dicabut</option>
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Keterangan Status <span className="text-gray-500 text-xs">(opsional)</span>
						</label>
						<input
							type="text"
							name="keterangan_status"
							value={formData.keterangan_status}
							onChange={handleChange}
							placeholder="Masukkan keterangan status jika ada"
							className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
						/>
					</div>
				</div>
			</div>

			{/* Upload File */}
			<div className="bg-gradient-to-r from-slate-50 to-gray-50 p-4 rounded-lg border border-slate-200">
				<h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
					<LuUpload className="w-5 h-5" />
					Upload Dokumen {!initialData && <span className="text-red-500 text-sm">*</span>}
				</h3>
				
				<div
					{...getRootProps()}
					className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
						isDragActive
							? "border-blue-500 bg-blue-50 scale-[1.02]"
							: errors.file
							? "border-red-400 bg-red-50"
							: "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
					}`}
				>
					<input {...getInputProps()} name="file" />
					{isDragActive ? (
						<div className="flex flex-col items-center justify-center text-blue-600">
							<LuUpload className="w-12 h-12 mb-3 animate-bounce" />
							<p className="font-medium">Lepaskan file di sini ...</p>
						</div>
					) : formData.file ? (
						<div className="flex flex-col items-center justify-center text-green-600">
							<LuFile className="w-12 h-12 mb-3" />
							<p className="font-medium mb-1">File terpilih:</p>
							<p className="text-gray-700">{formData.file.name}</p>
							<p className="text-sm text-gray-500 mt-1">
								({(formData.file.size / 1024).toFixed(2)} KB)
							</p>
						</div>
					) : (
						<div className="flex flex-col items-center justify-center text-gray-500">
							<LuUpload className="w-12 h-12 mb-3 text-gray-400" />
							<p className="mb-2 font-medium text-gray-700">
								Seret & lepas file PDF di sini, atau klik untuk memilih file
							</p>
							<p className="text-sm text-gray-500">
								Maksimal ukuran file: 10MB | Format: PDF
							</p>
						</div>
					)}
				</div>
				{errors.file && (
					<p className="text-red-500 text-sm mt-2 flex items-center gap-1">
						<span className="text-red-500">⚠</span> {errors.file}
					</p>
				)}
			</div>

			{/* Submit Button */}
			<div className="flex justify-end pt-4 border-t">
				<button
					type="submit"
					className={`px-8 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg ${
						isSubmitting
							? "bg-gray-400 cursor-not-allowed"
							: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 active:scale-95 shadow-blue-500/50"
					} text-white`}
					disabled={isSubmitting}
				>
					{isSubmitting && (
						<svg
							className="animate-spin h-5 w-5 text-white"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								className="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								strokeWidth="4"
							></circle>
							<path
								className="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
					)}
					{isSubmitting ? "Menyimpan..." : initialData ? "Update Produk Hukum" : "Simpan Produk Hukum"}
				</button>
			</div>
		</form>
	);
};

export default ProdukHukumForm;
