import React, { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDropzone } from "react-dropzone";
import api from "../../api"; // Asumsi Anda punya file konfigurasi axios

const aparaturSchema = z.object({
	// Biodata
	nama_lengkap: z.string().min(1, "Nama lengkap wajib diisi"),
	jabatan: z.string().min(1, "Jabatan wajib diisi"),
	nipd: z.string().optional(),
	niap: z.string().optional(),
	tempat_lahir: z.string().min(1, "Tempat lahir wajib diisi"),
	tanggal_lahir: z.string().min(1, "Tanggal lahir wajib diisi"),
	jenis_kelamin: z.enum(["Laki-laki", "Perempuan"]),
	pendidikan_terakhir: z.string().min(1, "Pendidikan terakhir wajib diisi"),
	agama: z.string().min(1, "Agama wajib diisi"),
	pangkat_golongan: z.string().optional(),
	tanggal_pengangkatan: z.string().min(1, "Tanggal pengangkatan wajib diisi"),
	nomor_sk_pengangkatan: z.string().min(1, "Nomor SK pengangkatan wajib diisi"),
	tanggal_pemberhentian: z.string().optional().nullable(),
	nomor_sk_pemberhentian: z.string().optional().nullable(),
	keterangan: z.string().optional(),
	status: z.enum(["Aktif", "Tidak Aktif"]),

	// Data Terhubung
	produk_hukum_id: z.string().optional().nullable(),
	bpjs_kesehatan_nomor: z.string().optional(),
	bpjs_ketenagakerjaan_nomor: z.string().optional(),

	// Files (opsional saat update, bisa jadi required saat create)
	file_bpjs_kesehatan: z.any().optional(),
	file_bpjs_ketenagakerjaan: z.any().optional(),
	file_pas_foto: z.any().optional(),
	file_ktp: z.any().optional(),
	file_kk: z.any().optional(),
	file_akta_kelahiran: z.any().optional(),
	file_ijazah_terakhir: z.any().optional(),
});

const FileInput = ({ control, name, label }) => {
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
			<div
				{...getRootProps()}
				className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer ${
					isDragActive
						? "border-primary bg-blue-50"
						: "border-gray-300 hover:border-primary"
				}`}
			>
				<input {...getInputProps()} />
				<p>{fileName || "Seret & lepas file, atau klik untuk memilih"}</p>
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
		formState: { errors },
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
		reset(defaultValues);
	}, [initialData, reset]);

	return (
		<form
			onSubmit={handleSubmit(onSubmit)}
			className="space-y-6 bg-white p-6 rounded-lg shadow-md"
		>
			<h3 className="text-xl font-semibold border-b pb-2">
				Biodata Perangkat Desa
			</h3>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label>Nama Lengkap</label>
					<input {...register("nama_lengkap")} className="w-full" />
					{errors.nama_lengkap && (
						<p className="text-red-500 text-sm">
							{errors.nama_lengkap.message}
						</p>
					)}
				</div>
				<div>
					<label>Jabatan</label>
					<input {...register("jabatan")} className="w-full" />
					{errors.jabatan && (
						<p className="text-red-500 text-sm">{errors.jabatan.message}</p>
					)}
				</div>
				<div>
					<label>Tempat Lahir</label>
					<input {...register("tempat_lahir")} className="w-full" />
					{errors.tempat_lahir && (
						<p className="text-red-500 text-sm">
							{errors.tempat_lahir.message}
						</p>
					)}
				</div>
				<div>
					<label>Tanggal Lahir</label>
					<input
						type="date"
						{...register("tanggal_lahir")}
						className="w-full"
					/>
					{errors.tanggal_lahir && (
						<p className="text-red-500 text-sm">
							{errors.tanggal_lahir.message}
						</p>
					)}
				</div>
				<div>
					<label>Jenis Kelamin</label>
					<select {...register("jenis_kelamin")} className="w-full">
						<option value="Laki-laki">Laki-laki</option>
						<option value="Perempuan">Perempuan</option>
					</select>
					{errors.jenis_kelamin && (
						<p className="text-red-500 text-sm">
							{errors.jenis_kelamin.message}
						</p>
					)}
				</div>
				<div>
					<label>Pendidikan Terakhir</label>
					<input {...register("pendidikan_terakhir")} className="w-full" />
					{errors.pendidikan_terakhir && (
						<p className="text-red-500 text-sm">
							{errors.pendidikan_terakhir.message}
						</p>
					)}
				</div>
				<div>
					<label>Agama</label>
					<input {...register("agama")} className="w-full" />
					{errors.agama && (
						<p className="text-red-500 text-sm">{errors.agama.message}</p>
					)}
				</div>
				<div>
					<label>Status</label>
					<select {...register("status")} className="w-full">
						<option value="Aktif">Aktif</option>
						<option value="Tidak Aktif">Tidak Aktif</option>
					</select>
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
					<input {...register("nipd")} className="w-full" />
				</div>
				<div>
					<label>NIAP</label>
					<input {...register("niap")} className="w-full" />
				</div>
				<div>
					<label>Pangkat/Golongan</label>
					<input {...register("pangkat_golongan")} className="w-full" />
				</div>
				<div>
					<label>Nomor SK Pengangkatan</label>
					<input {...register("nomor_sk_pengangkatan")} className="w-full" />
					{errors.nomor_sk_pengangkatan && (
						<p className="text-red-500 text-sm">
							{errors.nomor_sk_pengangkatan.message}
						</p>
					)}
				</div>
				<div>
					<label>Tanggal Pengangkatan</label>
					<input
						type="date"
						{...register("tanggal_pengangkatan")}
						className="w-full"
					/>
					{errors.tanggal_pengangkatan && (
						<p className="text-red-500 text-sm">
							{errors.tanggal_pengangkatan.message}
						</p>
					)}
				</div>
				<div>
					<label>SK Pengangkatan (dari Produk Hukum)</label>
					<select {...register("produk_hukum_id")} className="w-full">
						<option value="">Pilih SK</option>
						{produkHukumList?.map((ph) => (
							<option key={ph.id} value={ph.id}>
								{ph.judul}
							</option>
						))}
					</select>
				</div>
			</div>

			<h3 className="text-xl font-semibold border-b pb-2 mt-6">
				Informasi BPJS
			</h3>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label>Nomor BPJS Kesehatan</label>
					<input {...register("bpjs_kesehatan_nomor")} className="w-full" />
				</div>
				<div>
					<label>Nomor BPJS Ketenagakerjaan</label>
					<input
						{...register("bpjs_ketenagakerjaan_nomor")}
						className="w-full"
					/>
				</div>
			</div>

			<h3 className="text-xl font-semibold border-b pb-2 mt-6">
				Lampiran File
			</h3>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				<FileInput control={control} name="file_pas_foto" label="Pas Foto" />
				<FileInput control={control} name="file_ktp" label="KTP" />
				<FileInput control={control} name="file_kk" label="KK" />
				<FileInput
					control={control}
					name="file_akta_kelahiran"
					label="Akta Kelahiran"
				/>
				<FileInput
					control={control}
					name="file_ijazah_terakhir"
					label="Ijazah Terakhir"
				/>
				<FileInput
					control={control}
					name="file_bpjs_kesehatan"
					label="File BPJS Kesehatan"
				/>
				<FileInput
					control={control}
					name="file_bpjs_ketenagakerjaan"
					label="File BPJS Ketenagakerjaan"
				/>
			</div>

			<div className="flex justify-end space-x-4">
				<button
					type="button"
					onClick={onCancel}
					className="bg-gray-500 text-white px-4 py-2 rounded"
				>
					Batal
				</button>
				<button
					type="submit"
					className="bg-blue-500 text-white px-4 py-2 rounded"
				>
					Simpan
				</button>
			</div>
		</form>
	);
};

export default AparaturDesaForm;
