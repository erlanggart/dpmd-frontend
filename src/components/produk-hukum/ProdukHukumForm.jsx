import React, { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { set, z } from "zod";

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
		<form onSubmit={handleSubmit} className="space-y-4" noValidate>
			<div>
				<label className="block mb-1">Judul</label>
				<div className="input-group">
					<input
						type="text"
						name="judul"
						value={formData.judul}
						onChange={handleChange}
						placeholder="Masukkan judul produk hukum"
						className="w-full"
					/>
				</div>
				{errors.judul && (
					<p className="text-red-500 text-sm mt-1">{errors.judul}</p>
				)}
			</div>
			<div>
				<label className="block mb-1">Nomor</label>
				<div className="input-group">
					<input
						type="text"
						name="nomor"
						value={formData.nomor}
						onChange={handleChange}
						placeholder="contoh: 123/XYZ/2023"
						className="w-full"
					/>
				</div>
				{errors.nomor && (
					<p className="text-red-500 text-sm mt-1">{errors.nomor}</p>
				)}
			</div>
			<div>
				<label className="block mb-1">Tahun</label>
				<div className="input-group">
					<input
						type="text" // Ubah ke text untuk validasi yang lebih baik
						name="tahun"
						value={formData.tahun}
						onChange={handleChange}
						className="w-full"
						maxLength="4"
						placeholder="contoh: 2023"
					/>
				</div>
				{errors.tahun && (
					<p className="text-red-500 text-sm mt-1">{errors.tahun}</p>
				)}
			</div>
			<div>
				<label className="block mb-1">Jenis</label>
				<div className="input-group">
					<select
						name="jenis"
						value={formData.jenis}
						onChange={handleChange}
						className="w-full"
					>
						<option value="Peraturan Desa">Peraturan Desa</option>
						<option value="Peraturan Kepala Desa">Peraturan Kepala Desa</option>
						<option value="Keputusan Kepala Desa">Keputusan Kepala Desa</option>
					</select>
				</div>
			</div>
			<div>
				<label className="block mb-1">Singkatan Jenis</label>
				<div className="input-group">
					<select
						name="singkatan_jenis"
						value={formData.singkatan_jenis}
						onChange={handleChange}
						className="w-full"
					>
						<option value="PERDES">PERDES</option>
						<option value="PERKADES">PERKADES</option>
						<option value="SK KADES">SK KADES</option>
					</select>
				</div>
			</div>
			<div>
				<label className="block mb-1">Tempat Penetapan</label>
				<div className="input-group">
					<input
						type="text"
						name="tempat_penetapan"
						value={formData.tempat_penetapan}
						onChange={handleChange}
						placeholder="contoh : Desa Sukamaju"
						className="w-full"
					/>
				</div>
				{errors.tempat_penetapan && (
					<p className="text-red-500 text-sm mt-1">{errors.tempat_penetapan}</p>
				)}
			</div>
			<div>
				<label className="block mb-1">Tanggal Penetapan</label>
				<div className="input-group">
					<input
						type="date"
						name="tanggal_penetapan"
						value={formData.tanggal_penetapan}
						onChange={handleChange}
						className="w-full"
					/>
				</div>
				{errors.tanggal_penetapan && (
					<p className="text-red-500 text-sm mt-1">
						{errors.tanggal_penetapan}
					</p>
				)}
			</div>
			<div>
				<label className="block mb-1">Sumber</label>
				<div className="input-group">
					<input
						type="text"
						name="sumber"
						value={formData.sumber}
						onChange={handleChange}
						placeholder="contoh: LDes Sukamaju Tahun 2025 Nomor 5"
						className="w-full"
					/>
				</div>
			</div>
			<div>
				<label className="block mb-1">Subjek</label>
				<div className="input-group">
					<input
						type="text"
						name="subjek"
						value={formData.subjek}
						onChange={handleChange}
						placeholder="contoh: Kependudukan, Pembangunan, dll"
						className="w-full"
					/>
				</div>
			</div>
			<div>
				<label className="block mb-1">Status Peraturan</label>
				<div className="input-group">
					<select
						name="status_peraturan"
						value={formData.status_peraturan}
						onChange={handleChange}
						className="w-full"
					>
						<option value="berlaku">Berlaku</option>
						<option value="dicabut">Dicabut</option>
					</select>
				</div>
			</div>
			<div>
				<label className="block mb-1">Keterangan Status</label>
				<div className="input-group">
					<input
						type="text"
						name="keterangan_status"
						value={formData.keterangan_status}
						onChange={handleChange}
						placeholder="Masukkan keterangan status jika ada"
						className="w-full"
					/>
				</div>
			</div>
			<div>
				<label className="block mb-1">File (PDF)</label>
				<div
					{...getRootProps()}
					className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${
						isDragActive
							? "border-primary bg-blue-50"
							: "border-gray-300 hover:border-primary"
					}`}
				>
					<input {...getInputProps()} name="file" />
					{isDragActive ? (
						<p>Lepaskan file di sini ...</p>
					) : formData.file ? (
						<p>
							File terpilih: {formData.file.name} (
							{(formData.file.size / 1024).toFixed(2)} KB)
						</p>
					) : (
						<div>
							<p className="mb-2">
								Seret & lepas file PDF di sini, atau klik untuk memilih file
							</p>
							<p className="text-sm text-gray-500">
								Maksimal ukuran file: 10MB
							</p>
						</div>
					)}
				</div>
				{errors.file && (
					<p className="text-red-500 text-sm mt-1">{errors.file}</p>
				)}
			</div>
			<button
				type="submit"
				className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
					isSubmitting
						? "bg-gray-400 cursor-not-allowed"
						: "bg-blue-500 hover:bg-blue-600 active:scale-95"
				} text-white`}
				disabled={isSubmitting}
			>
				{isSubmitting && (
					<svg
						className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
				{isSubmitting ? "Menyimpan..." : "Simpan"}
			</button>
		</form>
	);
};

export default ProdukHukumForm;
