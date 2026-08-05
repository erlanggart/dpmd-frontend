import React, {
	useState,
	useEffect,
	useCallback,
	
} from "react";
import { useForm, Controller, useController } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDropzone } from "react-dropzone";

import {
	Trash2, User, Briefcase, Shield, FileText, Upload, Heart,
	AlertCircle, Loader2, Camera, CreditCard, Users, GraduationCap,
	Calendar, Hash, MapPin, ChevronDown
} from "lucide-react";
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

/* ---------- Section wrapper ---------- */
const Section = ({ icon: Icon, title, color = "teal", children }) => {
	const colors = {
		teal: "border-slate-500 bg-slate-50 text-slate-700",
		blue: "border-slate-500 bg-slate-50 text-slate-700",
		purple: "border-slate-500 bg-slate-50 text-slate-700",
		amber: "border-amber-500 bg-amber-50 text-amber-700",
	};
	return (
		<div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
			<div className={`flex items-center gap-2 px-5 py-3 border-l-4 ${colors[color]}`}>
				<Icon className="w-4.5 h-4.5" />
				<h3 className="font-semibold text-sm">{title}</h3>
			</div>
			<div className="p-5">{children}</div>
		</div>
	);
};

/* ---------- Field wrapper ---------- */
const Field = ({ label, required, error, children }) => (
	<div>
		<label className="block text-sm font-medium text-slate-700 mb-1.5">
			{label}
			{required && <span className="text-rose-500 ml-0.5">*</span>}
		</label>
		{children}
		{error && (
			<p className="mt-1 text-xs text-rose-500 flex items-center gap-1">
				<AlertCircle className="w-3 h-3 flex-shrink-0" />
				{error}
			</p>
		)}
	</div>
);

/* ---------- File input ---------- */
const FileInput = ({
	control,
	name,
	label,
	existingFilename,
	isImage = false,
	icon: IconComp = FileText,
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
			<label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
			{existingFilename && (
				<div className="flex items-center gap-3 mb-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
					{isImage ? (
						<img
							src={fileUrl(existingFilename) || "/user-default.svg"}
							alt="preview"
							className="h-10 w-10 object-cover rounded-lg border border-slate-200"
							onError={(e) => (e.currentTarget.src = "/user-default.svg")}
						/>
					) : (
						<div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center">
							<IconComp className="w-5 h-5 text-slate-600" />
						</div>
					)}
					<span className="text-xs text-slate-500 flex-1 truncate">{existingFilename}</span>
					<a
						href={fileUrl(existingFilename) || "#"}
						target="_blank"
						rel="noopener noreferrer"
						className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline"
					>
						Lihat
					</a>
				</div>
			)}
			<div
				{...getRootProps()}
				className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
					isDragActive
						? "border-slate-500 bg-slate-50"
						: fileName
						? "border-slate-300 bg-slate-50/50"
						: "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
				}`}
			>
				<input {...getInputProps()} />
				{fileName ? (
					<div className="flex items-center justify-center gap-2 text-sm text-slate-700">
						<FileText className="w-4 h-4" />
						<span className="truncate max-w-[200px]">{fileName}</span>
					</div>
				) : (
					<div className="flex flex-col items-center gap-1">
						<Upload className="w-5 h-5 text-slate-400" />
						<span className="text-xs text-slate-400">Seret file atau klik untuk memilih</span>
					</div>
				)}
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

	const inputCls = "w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all";
	const selectCls = `${inputCls} appearance-none`;

	return (
		<form
			onSubmit={handleSubmit(buildAndSubmit)}
			className="space-y-5"
			aria-busy={isSubmitting}
		>
			{/* Error summary */}
			{Object.keys(errors).length > 0 && (
				<div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
					<AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
					<div className="text-sm text-rose-700">
						<p className="font-semibold mb-1">Periksa kembali isian berikut:</p>
						<ul className="list-disc list-inside space-y-0.5">
							{Object.entries(errors).map(([key, err]) => (
								<li key={key}>{err?.message || key}</li>
							))}
						</ul>
					</div>
				</div>
			)}

			{/* Biodata */}
			<Section icon={User} title="Biodata Aparatur" color="teal">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Field label="Nama Lengkap" required error={errors.nama_lengkap?.message}>
						<input {...register("nama_lengkap")} className={inputCls} placeholder="Masukkan nama lengkap" />
					</Field>
					<Field label="Jabatan" required error={errors.jabatan?.message}>
						<select {...register("jabatan")} className={selectCls}>
							<option value="">Pilih Jabatan</option>
							<optgroup label="Pemerintah Desa">
								<option value="Kepala Desa">Kepala Desa</option>
								<option value="Sekretaris Desa">Sekretaris Desa</option>
								<option value="Kepala Urusan Tata Usaha dan Umum">Kepala Urusan Tata Usaha dan Umum</option>
								<option value="Kepala Urusan Keuangan">Kepala Urusan Keuangan</option>
								<option value="Kepala Urusan Perencanaan">Kepala Urusan Perencanaan</option>
								<option value="Kepala Seksi Pemerintahan">Kepala Seksi Pemerintahan</option>
								<option value="Kepala Seksi Kesejahteraan">Kepala Seksi Kesejahteraan</option>
								<option value="Kepala Seksi Pelayanan">Kepala Seksi Pelayanan</option>
								<option value="Staf Desa">Staf Desa</option>
							</optgroup>
							<optgroup label="Kepala Dusun">
								<option value="Kadus I">Kadus I</option>
								<option value="Kadus II">Kadus II</option>
								<option value="Kadus III">Kadus III</option>
								<option value="Kadus IV">Kadus IV</option>
								<option value="Kadus V">Kadus V</option>
								<option value="Kadus VI">Kadus VI</option>
								<option value="Kadus VII">Kadus VII</option>
								<option value="Kadus VIII">Kadus VIII</option>
								<option value="Kadus IX">Kadus IX</option>
								<option value="Kadus X">Kadus X</option>
							</optgroup>
							<optgroup label="Badan Permusyawaratan Desa (BPD)">
								<option value="Ketua BPD">Ketua BPD</option>
								<option value="Wakil Ketua BPD">Wakil Ketua BPD</option>
								<option value="Sekretaris BPD">Sekretaris BPD</option>
								<option value="Anggota BPD">Anggota BPD</option>
							</optgroup>
						</select>
					</Field>
					<Field label="Tempat Lahir" required error={errors.tempat_lahir?.message}>
						<input {...register("tempat_lahir")} className={inputCls} placeholder="Masukkan tempat lahir" />
					</Field>
					<Field label="Tanggal Lahir" required error={errors.tanggal_lahir?.message}>
						<input type="date" {...register("tanggal_lahir")} className={inputCls} />
					</Field>
					<Field label="Jenis Kelamin" required error={errors.jenis_kelamin?.message}>
						<select {...register("jenis_kelamin")} className={selectCls}>
							<option value="Laki-laki">Laki-laki</option>
							<option value="Perempuan">Perempuan</option>
						</select>
					</Field>
					<Field label="Pendidikan Terakhir" required error={errors.pendidikan_terakhir?.message}>
						<select {...register("pendidikan_terakhir")} className={selectCls}>
							<option value="">Pilih Pendidikan</option>
							<option value="Tidak Sekolah">Tidak Sekolah</option>
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
					</Field>
					<Field label="Agama" required error={errors.agama?.message}>
						<select {...register("agama")} className={selectCls}>
							<option value="">Pilih Agama</option>
							<option value="Islam">Islam</option>
							<option value="Kristen Protestan">Kristen Protestan</option>
							<option value="Katolik">Katolik</option>
							<option value="Hindu">Hindu</option>
							<option value="Buddha">Buddha</option>
							<option value="Konghucu">Konghucu</option>
							<option value="Kepercayaan">Kepercayaan</option>
						</select>
					</Field>
					<Field label="Status" required error={errors.status?.message}>
						<select {...register("status")} className={selectCls}>
							<option value="Aktif">Aktif</option>
							<option value="Tidak Aktif">Tidak Aktif</option>
						</select>
					</Field>
				</div>
			</Section>

			{/* Kepegawaian */}
			<Section icon={Briefcase} title="Informasi Kepegawaian" color="blue">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Field label="NIPD">
						<input {...register("nipd")} className={inputCls} placeholder="Masukkan NIPD" />
					</Field>
					<Field label="Pangkat/Golongan">
						<input {...register("pangkat_golongan")} className={inputCls} placeholder="Masukkan pangkat/golongan" />
					</Field>
					<Field label="Nomor SK Pengangkatan" required error={errors.nomor_sk_pengangkatan?.message}>
						<input {...register("nomor_sk_pengangkatan")} className={inputCls} placeholder="Masukkan nomor SK" />
					</Field>
					<Field label="Tanggal Pengangkatan" required error={errors.tanggal_pengangkatan?.message}>
						<input type="date" {...register("tanggal_pengangkatan")} className={inputCls} />
					</Field>
					<Field label="Nomor SK Pemberhentian">
						<input {...register("nomor_sk_pemberhentian")} className={inputCls} placeholder="Jika ada" />
					</Field>
					<Field label="Tanggal Pemberhentian">
						<input type="date" {...register("tanggal_pemberhentian")} className={inputCls} />
					</Field>
					<div className="md:col-span-2">
						<Field label="SK Pengangkatan (dari Produk Hukum)">
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
						</Field>
					</div>
					<div className="md:col-span-2">
						<Field label="Keterangan">
							<textarea {...register("keterangan")} className={`${inputCls} min-h-[80px]`} placeholder="Keterangan tambahan (opsional)" rows={3} />
						</Field>
					</div>
				</div>
			</Section>

			{/* BPJS */}
			<Section icon={Shield} title="Informasi BPJS" color="purple">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Field label="Nomor BPJS Kesehatan">
						<input {...register("bpjs_kesehatan_nomor")} className={inputCls} placeholder="Masukkan nomor BPJS Kesehatan" />
					</Field>
					<Field label="Nomor BPJS Ketenagakerjaan">
						<input {...register("bpjs_ketenagakerjaan_nomor")} className={inputCls} placeholder="Masukkan nomor BPJS Ketenagakerjaan" />
					</Field>
				</div>
			</Section>

			{/* Lampiran */}
			<Section icon={FileText} title="Lampiran Dokumen" color="amber">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					<FileInput
						control={control}
						name="file_pas_foto"
						label="Pas Foto"
						existingFilename={initialData?.file_pas_foto}
						isImage
						icon={Camera}
					/>
					<FileInput
						control={control}
						name="file_ktp"
						label="KTP"
						existingFilename={initialData?.file_ktp}
						icon={CreditCard}
					/>
					<FileInput
						control={control}
						name="file_kk"
						label="Kartu Keluarga"
						existingFilename={initialData?.file_kk}
						icon={Users}
					/>
					<FileInput
						control={control}
						name="file_akta_kelahiran"
						label="Akta Kelahiran"
						existingFilename={initialData?.file_akta_kelahiran}
						icon={FileText}
					/>
					<FileInput
						control={control}
						name="file_ijazah_terakhir"
						label="Ijazah Terakhir"
						existingFilename={initialData?.file_ijazah_terakhir}
						icon={GraduationCap}
					/>
					<FileInput
						control={control}
						name="file_bpjs_kesehatan"
						label="File BPJS Kesehatan"
						existingFilename={initialData?.file_bpjs_kesehatan}
						icon={Shield}
					/>
					<FileInput
						control={control}
						name="file_bpjs_ketenagakerjaan"
						label="File BPJS Ketenagakerjaan"
						existingFilename={initialData?.file_bpjs_ketenagakerjaan}
						icon={Shield}
					/>
				</div>
			</Section>

			{/* Actions */}
			<div className="flex justify-end gap-3 pt-2">
				<button
					type="button"
					onClick={onCancel}
					className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-60"
					disabled={isSubmitting || submitLock}
				>
					Batal
				</button>
				<button
					type="submit"
					className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-slate-700 to-slate-900 rounded-lg hover:from-slate-800 hover:to-slate-950 shadow-sm transition-all disabled:opacity-60 flex items-center gap-2"
					disabled={isSubmitting || submitLock}
				>
					{isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
					{isSubmitting ? "Menyimpan..." : "Simpan"}
				</button>
			</div>
		</form>
	);
};

export default AparaturDesaForm;
