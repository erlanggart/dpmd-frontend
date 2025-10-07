import React, {
	useState,
	useEffect,
	useCallback,
	useMemo,
	useRef,
} from "react";
import { useForm, Controller, useController } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDropzone } from "react-dropzone";
import api from "../../api"; // Asumsi Anda punya file konfigurasi axios
import { FaTrash } from "react-icons/fa";
import SearchableProdukHukumSelect from "../shared/SearchableProdukHukumSelect";

// Build base host to preview existing uploaded files
const getBaseHost = () => {
	const apiBase =
		import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
	return apiBase.replace(/\/?api\/?$/, "");
};
const fileUrl = (filename) =>
	filename ? `${getBaseHost()}/uploads/aparatur_desa_files/${filename}` : null;

// Helpers: treat empty string or null as undefined for optional fields
const emptyToUndef = (schema) =>
	z.preprocess((v) => (v === "" || v === null ? undefined : v), schema);
const emptyToNull = (schema) =>
	z.preprocess((v) => (v === "" ? null : v), schema);

const aparaturSchema = z.object({
	// Biodata
	nama_lengkap: z.string().min(1, "Nama lengkap wajib diisi"),
	jabatan: z.string().min(1, "Jabatan wajib diisi"),
	nipd: emptyToUndef(z.string().optional()),
	tempat_lahir: z.string().min(1, "Tempat lahir wajib diisi"),
	tanggal_lahir: z.string().min(1, "Tanggal lahir wajib diisi"),
	jenis_kelamin: z.enum(["Laki-laki", "Perempuan"]),
	pendidikan_terakhir: z.string().min(1, "Pendidikan terakhir wajib diisi"),
	agama: z.string().min(1, "Agama wajib diisi"),
	pangkat_golongan: emptyToUndef(z.string().optional()),
	tanggal_pengangkatan: z.string().min(1, "Tanggal pengangkatan wajib diisi"),
	nomor_sk_pengangkatan: z.string().min(1, "Nomor SK pengangkatan wajib diisi"),
	tanggal_pemberhentian: emptyToNull(z.string().optional().nullable()),
	nomor_sk_pemberhentian: emptyToNull(z.string().optional().nullable()),
	keterangan: emptyToUndef(z.string().optional()),
	status: z.enum(["Aktif", "Tidak Aktif"]),

	// Data Terhubung
	produk_hukum_id: emptyToNull(z.string().optional().nullable()),
	bpjs_kesehatan_nomor: emptyToUndef(z.string().optional()),
	bpjs_ketenagakerjaan_nomor: emptyToUndef(z.string().optional()),

	// Files (opsional saat update, bisa jadi required saat create)
	file_bpjs_kesehatan: z.any().optional(),
	file_bpjs_ketenagakerjaan: z.any().optional(),
	file_pas_foto: z.any().optional(),
	file_ktp: z.any().optional(),
	file_kk: z.any().optional(),
	file_akta_kelahiran: z.any().optional(),
	file_ijazah_terakhir: z.any().optional(),
});

const FileInput = ({
	control,
	name,
	label,
	existingFilename,
	isImage = false,
}) => {
	const { field } = useController({ control, name });
	const [fileName, setFileName] = useState(field.value?.name || "");

	const onDrop = useCallback(
		(acceptedFiles) => {
			if (acceptedFiles.length > 0) {
				field.onChange(acceptedFiles[0]);
				setFileName(acceptedFiles[0].name);
			}
		},
		[field]
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		multiple: false,
	});

	return (
		<div>
			<label className="block mb-1">{label}</label>
			{existingFilename && (
				<div className="flex items-center justify-between mb-2 text-sm">
					<div className="text-gray-600">File sebelumnya:</div>
					<div className="flex items-center gap-3">
						{isImage ? (
							<img
								src={fileUrl(existingFilename) || "/user-default.svg"}
								alt="preview"
								className="h-12 w-12 object-cover rounded border"
								onError={(e) => (e.currentTarget.src = "/user-default.svg")}
							/>
						) : null}
						<a
							href={fileUrl(existingFilename) || "#"}
							target="_blank"
							rel="noopener noreferrer"
							className="text-primary hover:underline"
						>
							Lihat
						</a>
					</div>
				</div>
			)}
			<div
				{...getRootProps()}
				className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer ${
					isDragActive
						? "border-primary bg-blue-50"
						: "border-gray-300 hover:border-primary"
				}`}
			>
				<input {...getInputProps()} />
				<p>
					{fileName ||
						"Seret & lepas file baru, atau klik untuk memilih (opsional)"}
				</p>
			</div>
		</div>
	);
};

const AparaturDesaForm = ({
	onSubmit,
	initialData,
	produkHukumList,
	onCancel,
}) => {
	const {
		register,
		handleSubmit,
		control,
		formState: { errors, isSubmitting },
		reset,
	} = useForm({
		resolver: zodResolver(aparaturSchema),
		defaultValues: initialData || {
			status: "Aktif",
			jenis_kelamin: "Laki-laki",
		},
	});

	useEffect(() => {
		const defaultValues = {
			status: "Aktif",
			jenis_kelamin: "Laki-laki",
			...initialData,
			// Ensure IDs are strings for select compatibility
			produk_hukum_id: initialData?.produk_hukum_id?.toString() || "",
		};

		// Coerce required string fields from null to "" so Zod string().min works and RHF controls are happy
		const requiredStringFields = [
			"nama_lengkap",
			"jabatan",
			"tempat_lahir",
			"tanggal_lahir",
			"jenis_kelamin",
			"pendidikan_terakhir",
			"agama",
			"tanggal_pengangkatan",
			"nomor_sk_pengangkatan",
			"status",
		];
		requiredStringFields.forEach((key) => {
			if (defaultValues[key] === null || defaultValues[key] === undefined) {
				defaultValues[key] = "";
			}
		});

		// Remove file fields from default values so RHF doesn't treat existing filenames as values to submit
		[
			"file_bpjs_kesehatan",
			"file_bpjs_ketenagakerjaan",
			"file_pas_foto",
			"file_ktp",
			"file_kk",
			"file_akta_kelahiran",
			"file_ijazah_terakhir",
		].forEach((k) => {
			if (k in defaultValues) delete defaultValues[k];
		});
		reset(defaultValues);
	}, [initialData, reset]);

	// Local lock to prevent rapid double submits even if parent onSubmit doesn't return a Promise
	const [submitLock, setSubmitLock] = useState(false);

	// Build FormData on submit: only append files if they are actual File objects
	const buildAndSubmit = async (values) => {
		const fd = new FormData();

		const fileKeys = new Set([
			"file_bpjs_kesehatan",
			"file_bpjs_ketenagakerjaan",
			"file_pas_foto",
			"file_ktp",
			"file_kk",
			"file_akta_kelahiran",
			"file_ijazah_terakhir",
		]);

		// Append non-file fields
		Object.entries(values).forEach(([key, val]) => {
			if (fileKeys.has(key)) return;
			if (val === undefined) return; // skip undefined
			// For optional nullables, allow empty string; backend normalizes "" -> null
			fd.append(key, val === null ? "" : val);
		});

		// Append only actual files
		fileKeys.forEach((k) => {
			const v = values[k];
			if (
				v &&
				typeof v === "object" &&
				(v instanceof File || v instanceof Blob)
			) {
				fd.append(k, v);
			}
		});

		// Engage a short lock to prevent double clicks
		setSubmitLock(true);
		const clearLock = setTimeout(() => setSubmitLock(false), 1200);

		try {
			const maybePromise = onSubmit(fd);
			if (maybePromise && typeof maybePromise.then === "function") {
				await maybePromise;
			}
		} finally {
			clearTimeout(clearLock);
			setSubmitLock(false);
		}
	};

	return (
		<form
			onSubmit={handleSubmit(buildAndSubmit)}
			className="space-y-6 bg-white p-6 rounded-lg shadow-md"
			aria-busy={isSubmitting}
		>
			{/* Error summary */}
			{Object.keys(errors).length > 0 && (
				<div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
					<p className="font-medium mb-1">Periksa kembali isian berikut:</p>
					<ul className="list-disc list-inside">
						{Object.entries(errors).map(([key, err]) => (
							<li key={key}>{err?.message || key}</li>
						))}
					</ul>
				</div>
			)}
			<h3 className="text-xl font-semibold border-b pb-2">
				Biodata Perangkat Desa
			</h3>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label>
						Nama Lengkap <span className="text-red-500">*</span>
					</label>
					<div className="input-group">
						<input {...register("nama_lengkap")} className="w-full" />
					</div>
					{errors.nama_lengkap && (
						<p className="text-red-500 text-sm">
							{errors.nama_lengkap.message}
						</p>
					)}
				</div>
				<div>
					<label>
						Jabatan <span className="text-red-500">*</span>
					</label>
					<div className="input-group">
						<select {...register("jabatan")} className="w-full">
							<option value="">Pilih Jabatan</option>
							<option value="Kepala Desa">Kepala Desa</option>
							<option value="Sekretaris Desa">Sekretaris Desa</option>
							<option value="Kaur Umum dan Perencanaan">
								Kaur Umum dan Perencanaan
							</option>
							<option value="Kaur Keuangan">Kaur Keuangan</option>
							<option value="Kasi Pemerintahan">Kasi Pemerintahan</option>
							<option value="Kasi Kesejahteraan">Kasi Kesejahteraan</option>
							<option value="Kasi Pelayanan">Kasi Pelayanan</option>
							<option value="Kepala Dusun">Kepala Dusun</option>
							<option value="Staf Desa">Staf Desa</option>
							<option value="Lainnya">Lainnya</option>
						</select>
					</div>
					{errors.jabatan && (
						<p className="text-red-500 text-sm">{errors.jabatan.message}</p>
					)}
				</div>
				<div>
					<label>
						Tempat Lahir <span className="text-red-500">*</span>
					</label>
					<div className="input-group">
						<input {...register("tempat_lahir")} className="w-full" />
					</div>
					{errors.tempat_lahir && (
						<p className="text-red-500 text-sm">
							{errors.tempat_lahir.message}
						</p>
					)}
				</div>
				<div>
					<label>
						Tanggal Lahir <span className="text-red-500">*</span>
					</label>
					<div className="input-group">
						<input
							type="date"
							{...register("tanggal_lahir")}
							className="w-full"
						/>
					</div>
					{errors.tanggal_lahir && (
						<p className="text-red-500 text-sm">
							{errors.tanggal_lahir.message}
						</p>
					)}
				</div>
				<div>
					<label>
						Jenis Kelamin <span className="text-red-500">*</span>
					</label>
					<div className="input-group">
						<select {...register("jenis_kelamin")} className="w-full">
							<option value="Laki-laki">Laki-laki</option>
							<option value="Perempuan">Perempuan</option>
						</select>
					</div>
					{errors.jenis_kelamin && (
						<p className="text-red-500 text-sm">
							{errors.jenis_kelamin.message}
						</p>
					)}
				</div>
				<div>
					<label>
						Pendidikan Terakhir <span className="text-red-500">*</span>
					</label>
					<div className="input-group">
						<select {...register("pendidikan_terakhir")} className="w-full">
							<option value="">Pilih Pendidikan Terakhir</option>
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
					{errors.pendidikan_terakhir && (
						<p className="text-red-500 text-sm">
							{errors.pendidikan_terakhir.message}
						</p>
					)}
				</div>
				<div>
					<label>
						Agama <span className="text-red-500">*</span>
					</label>
					<div className="input-group">
						<select {...register("agama")} className="w-full">
							<option value="">Pilih Agama</option>
							<option value="Islam">Islam</option>
							<option value="Kristen Protestan">Kristen Protestan</option>
							<option value="Katolik">Katolik</option>
							<option value="Hindu">Hindu</option>
							<option value="Buddha">Buddha</option>
							<option value="Konghucu">Konghucu</option>
							<option value="Kepercayaan">Kepercayaan</option>
						</select>
					</div>
					{errors.agama && (
						<p className="text-red-500 text-sm">{errors.agama.message}</p>
					)}
				</div>
				<div>
					<label>
						Status <span className="text-red-500">*</span>
					</label>
					<div className="input-group">
						<select {...register("status")} className="w-full">
							<option value="Aktif">Aktif</option>
							<option value="Tidak Aktif">Tidak Aktif</option>
						</select>
					</div>
					{errors.status && (
						<p className="text-red-500 text-sm">{errors.status.message}</p>
					)}
				</div>
			</div>

			<h3 className="text-xl font-semibold border-b pb-2 mt-6">
				Informasi Kepegawaian
			</h3>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label>NIPD</label>
					<div className="input-group">
						<input {...register("nipd")} className="w-full" />
					</div>
				</div>
				<div>
					<label>Pangkat/Golongan</label>
					<div className="input-group">
						<input {...register("pangkat_golongan")} className="w-full" />
					</div>
				</div>
				<div>
					<label>
						Nomor SK Pengangkatan <span className="text-red-500">*</span>
					</label>
					<div className="input-group">
						<input {...register("nomor_sk_pengangkatan")} className="w-full" />
					</div>
					{errors.nomor_sk_pengangkatan && (
						<p className="text-red-500 text-sm">
							{errors.nomor_sk_pengangkatan.message}
						</p>
					)}
				</div>
				<div>
					<label>
						Tanggal Pengangkatan <span className="text-red-500">*</span>
					</label>
					<div className="input-group">
						<input
							type="date"
							{...register("tanggal_pengangkatan")}
							className="w-full"
						/>
					</div>
					{errors.tanggal_pengangkatan && (
						<p className="text-red-500 text-sm">
							{errors.tanggal_pengangkatan.message}
						</p>
					)}
				</div>
				<div>
					<label>SK Pengangkatan (dari Produk Hukum)</label>
					<Controller
						control={control}
						name="produk_hukum_id"
						render={({ field: { value, onChange } }) => (
							<SearchableProdukHukumSelect
								value={value}
								onChange={onChange}
								produkHukumList={produkHukumList}
							/>
						)}
					/>
				</div>
			</div>

			<h3 className="text-xl font-semibold border-b pb-2 mt-6">
				Informasi BPJS
			</h3>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label>Nomor BPJS Kesehatan</label>
					<div className="input-group">
						<input {...register("bpjs_kesehatan_nomor")} className="w-full" />
					</div>
				</div>
				<div>
					<label>Nomor BPJS Ketenagakerjaan</label>
					<div className="input-group">
						<input
							{...register("bpjs_ketenagakerjaan_nomor")}
							className="w-full"
						/>
					</div>
				</div>
			</div>

			<h3 className="text-xl font-semibold border-b pb-2 mt-6">
				Lampiran File
			</h3>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				<FileInput
					control={control}
					name="file_pas_foto"
					label="Pas Foto"
					existingFilename={initialData?.file_pas_foto}
					isImage
				/>
				<FileInput
					control={control}
					name="file_ktp"
					label="KTP"
					existingFilename={initialData?.file_ktp}
				/>
				<FileInput
					control={control}
					name="file_kk"
					label="KK"
					existingFilename={initialData?.file_kk}
				/>
				<FileInput
					control={control}
					name="file_akta_kelahiran"
					label="Akta Kelahiran"
					existingFilename={initialData?.file_akta_kelahiran}
				/>
				<FileInput
					control={control}
					name="file_ijazah_terakhir"
					label="Ijazah Terakhir"
					existingFilename={initialData?.file_ijazah_terakhir}
				/>
				<FileInput
					control={control}
					name="file_bpjs_kesehatan"
					label="File BPJS Kesehatan"
					existingFilename={initialData?.file_bpjs_kesehatan}
				/>
				<FileInput
					control={control}
					name="file_bpjs_ketenagakerjaan"
					label="File BPJS Ketenagakerjaan"
					existingFilename={initialData?.file_bpjs_ketenagakerjaan}
				/>
			</div>

			<div className="flex justify-end space-x-4">
				<button
					type="button"
					onClick={onCancel}
					className="bg-gray-500 text-white px-4 py-2 rounded disabled:opacity-60"
					disabled={isSubmitting || submitLock}
				>
					Batal
				</button>
				<button
					type="submit"
					className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-60 flex items-center gap-2"
					disabled={isSubmitting || submitLock}
				>
					{isSubmitting && (
						<svg
							className="animate-spin h-4 w-4 text-white"
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
								d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
							></path>
						</svg>
					)}
					{isSubmitting ? "Menyimpan..." : "Simpan"}
				</button>
			</div>
		</form>
	);
};

export default AparaturDesaForm;
