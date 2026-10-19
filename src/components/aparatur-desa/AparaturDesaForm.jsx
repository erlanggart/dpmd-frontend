import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useForm, Controller, useController } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";

import {
	User, Briefcase, Shield, FileText, Upload, AlertCircle, Loader2, Camera,
	CreditCard, Users, GraduationCap, Check, ChevronDown, ExternalLink, RefreshCw,
	Save, X,
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

/**
 * API mengirim nilai apa adanya dari database: enum Prisma memakai garis bawah
 * ("Laki_laki", "Tidak_Aktif") dan tanggal berupa ISO lengkap
 * ("1983-05-27T00:00:00.000Z"). Keduanya tidak cocok dengan isi <option> dan
 * <input type="date"> di form ini — akibatnya, saat mengubah data yang sudah
 * ada, pilihan tampil kosong dan validasi selalu menolak ("wajib diisi").
 * Karena itu nilai dari server dinormalkan dulu ke bentuk yang dipakai form.
 */
const keTanggalInput = (nilai) => {
	if (!nilai) return "";
	if (typeof nilai === "string" && /^\d{4}-\d{2}-\d{2}$/.test(nilai)) return nilai;
	const d = new Date(nilai);
	if (Number.isNaN(d.getTime())) return "";
	// Pakai komponen UTC: tanggalnya disimpan sebagai DATE polos, jadi menggeser
	// ke zona waktu lokal bisa memundurkannya sehari.
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
		d.getUTCDate()
	).padStart(2, "0")}`;
};

const dariServer = (data) => {
	if (!data) return data;
	return {
		...data,
		jenis_kelamin: data.jenis_kelamin ? String(data.jenis_kelamin).replace(/_/g, "-") : "",
		status: data.status ? String(data.status).replace(/_/g, " ") : "",
		tanggal_lahir: keTanggalInput(data.tanggal_lahir),
		tanggal_pengangkatan: keTanggalInput(data.tanggal_pengangkatan),
		tanggal_pemberhentian: keTanggalInput(data.tanggal_pemberhentian),
	};
};

// Pilihan baku. Ditulis sebagai data, bukan markup berulang, supaya bisa dipakai
// juga untuk memeriksa apakah nilai yang tersimpan dikenali.
const OPSI_JABATAN = [
	{
		grup: "Pemerintah Desa",
		nilai: [
			"Kepala Desa",
			"Sekretaris Desa",
			"Kepala Urusan Tata Usaha dan Umum",
			"Kepala Urusan Keuangan",
			"Kepala Urusan Perencanaan",
			"Kepala Seksi Pemerintahan",
			"Kepala Seksi Kesejahteraan",
			"Kepala Seksi Pelayanan",
		],
	},
	// Staf perangkat hanya didata — tidak mendapat NIPD.
	{
		grup: "Staf Perangkat Desa",
		nilai: [
			"Staf Sekretariat",
			"Staf Seksi Pemerintahan",
			"Staf Seksi Pelayanan",
			"Staf Seksi Kesejahteraan",
			"Staf Urusan Tata Usaha dan Umum",
			"Staf Urusan Keuangan",
			"Staf Urusan Perencanaan",
			"Staf Kewilayahan",
			"Staf Desa",
		],
	},
	{
		grup: "Kepala Dusun",
		nilai: ["Kadus I", "Kadus II", "Kadus III", "Kadus IV", "Kadus V", "Kadus VI", "Kadus VII", "Kadus VIII", "Kadus IX", "Kadus X"],
	},
	{
		grup: "Badan Permusyawaratan Desa (BPD)",
		nilai: ["Ketua BPD", "Wakil Ketua BPD", "Sekretaris BPD", "Anggota BPD"],
	},
];
const SEMUA_JABATAN = OPSI_JABATAN.flatMap((g) => g.nilai);
const OPSI_PENDIDIKAN = ["Tidak Sekolah", "SD", "SMP", "SMA/SMK", "D1", "D2", "D3", "S1", "S2", "S3"];
const OPSI_AGAMA = ["Islam", "Kristen Protestan", "Katolik", "Hindu", "Buddha", "Konghucu", "Kepercayaan"];

/**
 * Sebagian besar data hasil merge arsip Dapur Desa memakai kosakata lain —
 * "KEPALA DESA", "SLTA/Sederajat", "KATOLIK". Nilai itu sah dan tersimpan di
 * database, tapi tidak ada di daftar opsi, sehingga <select> menampilkannya
 * sebagai pilihan kosong: operator melihat kolom seolah belum terisi padahal
 * datanya ada. Nilai tersimpan karena itu ditambahkan sebagai opsi tersendiri.
 */
const OpsiTersimpan = ({ nilai, dikenal }) =>
	nilai && !dikenal.includes(nilai) ? <option value={nilai}>{nilai} (data tersimpan)</option> : null;

const aparaturSchema = z.object({
	// Biodata
	nama_lengkap: z.string().min(1, "Nama lengkap wajib diisi"),
	jabatan: z.string().min(1, "Jabatan wajib diisi"),
	// NIPD tidak diisi di sini: diterbitkan sistem setelah DPMD menyatakan data
	// valid. NIAP & pangkat/golongan dihapus dari isian (kolom lama dibiarkan).
	tempat_lahir: z.string().min(1, "Tempat lahir wajib diisi"),
	tanggal_lahir: z.string().min(1, "Tanggal lahir wajib diisi"),
	jenis_kelamin: z.enum(["Laki-laki", "Perempuan"]),
	pendidikan_terakhir: z.string().min(1, "Pendidikan terakhir wajib diisi"),
	agama: z.string().min(1, "Agama wajib diisi"),
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
	file_sk_terakhir: z.any().optional(),
});

const FILE_KEYS = [
	"file_sk_terakhir",
	"file_bpjs_kesehatan",
	"file_bpjs_ketenagakerjaan",
	"file_pas_foto",
	"file_ktp",
	"file_kk",
	"file_akta_kelahiran",
	"file_ijazah_terakhir",
];

// Berkas selain pas foto — pas foto punya tempat sendiri di kartu biodata.
// `wajib` = dibutuhkan agar data bisa dinyatakan valid oleh DPMD (selaras
// dengan ITEM_VERIFIKASI di backend utils/aparaturNipd.js).
const BERKAS_LAMPIRAN = [
	{ name: "file_sk_terakhir", label: "SK Terakhir", icon: Briefcase, wajib: true },
	{ name: "file_ktp", label: "KTP", icon: CreditCard, wajib: true },
	{ name: "file_kk", label: "Kartu Keluarga", icon: Users },
	{ name: "file_akta_kelahiran", label: "Akta Kelahiran", icon: FileText },
	{ name: "file_ijazah_terakhir", label: "Ijazah Terakhir", icon: GraduationCap },
	{ name: "file_bpjs_kesehatan", label: "Kartu BPJS Kesehatan", icon: Shield },
	{ name: "file_bpjs_ketenagakerjaan", label: "Kartu BPJS Ketenagakerjaan", icon: Shield },
];

/**
 * Susunan seksi beserta kolom wajibnya. Satu daftar ini menggerakkan tiga hal
 * sekaligus — penghitung di kepala kartu, navigasi samping, dan bilah progres
 * di bawah — jadi ketiganya tidak mungkin menghitung angka yang berbeda.
 */
const SEKSI = [
	{
		id: "seksi-biodata",
		judul: "Biodata",
		keterangan: "Identitas diri dan jabatan",
		icon: User,
		wajib: ["nama_lengkap", "jabatan", "tempat_lahir", "tanggal_lahir", "jenis_kelamin", "pendidikan_terakhir", "agama", "status"],
	},
	{
		id: "seksi-kepegawaian",
		judul: "Kepegawaian",
		keterangan: "SK pengangkatan dan masa tugas",
		icon: Briefcase,
		wajib: ["nomor_sk_pengangkatan", "tanggal_pengangkatan"],
		opsional: ["produk_hukum_id"],
	},
	{
		id: "seksi-bpjs",
		judul: "BPJS",
		keterangan: "Jaminan kesehatan dan ketenagakerjaan",
		icon: Shield,
		wajib: [],
		opsional: ["bpjs_kesehatan_nomor", "bpjs_ketenagakerjaan_nomor"],
	},
	{
		id: "seksi-lampiran",
		judul: "Lampiran",
		keterangan: "Pindaian dokumen pendukung",
		icon: FileText,
		wajib: [],
		opsional: BERKAS_LAMPIRAN.map((b) => b.name),
	},
];
const SEMUA_WAJIB = SEKSI.flatMap((s) => s.wajib);

const terisi = (nilai) =>
	nilai instanceof File || nilai instanceof Blob || (nilai !== null && nilai !== undefined && String(nilai).trim() !== "");

const LABEL_KOLOM = {
	nama_lengkap: "Nama lengkap",
	jabatan: "Jabatan",
	tempat_lahir: "Tempat lahir",
	tanggal_lahir: "Tanggal lahir",
	jenis_kelamin: "Jenis kelamin",
	pendidikan_terakhir: "Pendidikan terakhir",
	agama: "Agama",
	status: "Status",
	tanggal_pengangkatan: "Tanggal pengangkatan",
	nomor_sk_pengangkatan: "Nomor SK pengangkatan",
};

const naikMasuk = {
	hidden: { opacity: 0, y: 16 },
	show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] } }),
};

/* ---------- Kartu seksi ---------- */
const KartuSeksi = ({ seksi, nomor, isi, total, children }) => {
	const Icon = seksi.icon;
	const lengkap = total > 0 && isi === total;
	return (
		<motion.section
			id={seksi.id}
			variants={naikMasuk}
			initial="hidden"
			animate="show"
			custom={nomor}
			className="scroll-mt-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]"
		>
			<header className="flex items-center gap-3.5 border-b border-slate-100 px-5 py-4 sm:px-6">
				<span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
					<Icon className="h-[18px] w-[18px]" />
					<span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-900 ring-1 ring-slate-200">
						{nomor + 1}
					</span>
				</span>
				<div className="min-w-0 flex-1">
					<h3 className="text-[15px] font-semibold tracking-tight text-slate-900">{seksi.judul}</h3>
					<p className="text-xs text-slate-500">{seksi.keterangan}</p>
				</div>
				{total > 0 && (
					<motion.span
						key={lengkap ? "lengkap" : "proses"}
						initial={{ scale: 0.85, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums ${
							lengkap ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
						}`}
					>
						{lengkap && <Check className="h-3.5 w-3.5" />}
						{isi}/{total} {seksi.wajib.length ? "wajib" : "terisi"}
					</motion.span>
				)}
			</header>
			<div className="p-5 sm:p-6">{children}</div>
		</motion.section>
	);
};

const INPUT_CLS =
	"h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/[0.06]";
const GALAT_CLS = " border-rose-300 bg-rose-50/40 focus:border-rose-500 focus:ring-rose-500/10";

/**
 * <select> bergaya. Berdiri di tingkat modul, bukan di dalam formulir: komponen
 * yang didefinisikan di dalam render dipasang ulang tiap ketikan (watch() memicu
 * render ulang), dan pilihan yang sedang dibuka tertutup sendiri.
 */
const KotakPilih = ({ daftar, galat, children }) => (
	<div className="relative">
		<select {...daftar} className={`${INPUT_CLS} cursor-pointer appearance-none pr-10${galat ? GALAT_CLS : ""}`}>
			{children}
		</select>
		<ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
	</div>
);

/* ---------- Field wrapper ---------- */
const Field = ({ label, required, error, hint, className = "", children }) => (
	<div className={className}>
		<label className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px] font-medium text-slate-700">
			<span>
				{label}
				{required && <span className="ml-0.5 text-brand-600">*</span>}
			</span>
			{hint && <span className="text-[11px] font-normal text-slate-400">{hint}</span>}
		</label>
		{children}
		<AnimatePresence initial={false}>
			{error && (
				<motion.p
					initial={{ opacity: 0, height: 0, y: -4 }}
					animate={{ opacity: 1, height: "auto", y: 0 }}
					exit={{ opacity: 0, height: 0 }}
					className="mt-1.5 flex items-center gap-1 overflow-hidden text-xs font-medium text-rose-600"
				>
					<AlertCircle className="h-3.5 w-3.5 shrink-0" />
					{error}
				</motion.p>
			)}
		</AnimatePresence>
	</div>
);

/* ---------- Pilihan bersegmen (jenis kelamin, status) ---------- */
const Segmen = ({ control, name, opsi, idGrup }) => (
	<Controller
		control={control}
		name={name}
		render={({ field: { value, onChange } }) => (
			<div className="relative grid h-11 grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
				{opsi.map(([nilai, teks, nada]) => {
					const aktif = value === nilai;
					return (
						<button
							key={nilai}
							type="button"
							onClick={() => onChange(nilai)}
							className={`relative z-10 rounded-lg text-sm font-medium transition-colors ${
								aktif ? "text-white" : "text-slate-500 hover:text-slate-800"
							}`}
						>
							{aktif && (
								<motion.span
									layoutId={`segmen-${idGrup}`}
									transition={{ type: "spring", stiffness: 500, damping: 38 }}
									className={`absolute inset-0 -z-10 rounded-lg shadow-sm ${nada || "bg-slate-900"}`}
								/>
							)}
							{teks}
						</button>
					);
				})}
			</div>
		)}
	/>
);

/* ---------- Pratinjau berkas yang baru dipilih ---------- */
const usePratinjau = (nilai) => {
	const [url, setUrl] = useState(null);
	useEffect(() => {
		if (!(nilai instanceof File) || !nilai.type?.startsWith("image/")) {
			setUrl(null);
			return undefined;
		}
		const objek = URL.createObjectURL(nilai);
		setUrl(objek);
		return () => URL.revokeObjectURL(objek);
	}, [nilai]);
	return url;
};

/* ---------- Pas foto ---------- */
const PasFoto = ({ control, existingFilename, nama }) => {
	const { field } = useController({ control, name: "file_pas_foto" });
	const pratinjau = usePratinjau(field.value);
	const [rusak, setRusak] = useState(false);
	const src = pratinjau || (!rusak && fileUrl(existingFilename)) || null;

	const onDrop = useCallback((berkas) => berkas[0] && field.onChange(berkas[0]), [field]);
	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		multiple: false,
		accept: { "image/*": [] },
	});

	const inisial =
		String(nama || "")
			.trim()
			.split(/\s+/)
			.slice(0, 2)
			.map((kata) => kata[0] || "")
			.join("")
			.toUpperCase() || null;

	return (
		<div className="flex flex-col items-center gap-3">
			<motion.div
				{...getRootProps()}
				whileHover={{ scale: 1.03 }}
				whileTap={{ scale: 0.98 }}
				className={`group relative h-36 w-36 cursor-pointer overflow-hidden rounded-[2rem] ring-4 transition-shadow ${
					isDragActive ? "ring-slate-900/30" : "ring-slate-100"
				} bg-gradient-to-br from-slate-100 to-slate-200 shadow-inner`}
			>
				<input {...getInputProps()} />
				<AnimatePresence mode="wait">
					{src ? (
						<motion.img
							key={src}
							src={src}
							alt="Pas foto"
							onError={() => setRusak(true)}
							initial={{ opacity: 0, scale: 1.08 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0 }}
							className="h-full w-full object-cover object-top"
						/>
					) : (
						<motion.div
							key="kosong"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="flex h-full w-full flex-col items-center justify-center text-slate-400"
						>
							{inisial ? (
								<span className="text-3xl font-bold text-slate-500">{inisial}</span>
							) : (
								<User className="h-12 w-12" strokeWidth={1.5} />
							)}
						</motion.div>
					)}
				</AnimatePresence>
				<div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-gradient-to-t from-slate-950/80 to-transparent pb-2.5 pt-8 text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
					<Camera className="h-3.5 w-3.5" />
					{src ? "Ganti foto" : "Unggah foto"}
				</div>
			</motion.div>
			<div className="text-center">
				<p className="text-xs font-semibold text-slate-700">Pas Foto</p>
				<p className="text-[11px] text-slate-400">
					{field.value instanceof File ? field.value.name : "JPG/PNG, maks. 2 MB"}
				</p>
			</div>
		</div>
	);
};

/* ---------- Ubin berkas ---------- */
const UbinBerkas = ({ control, name, label, existingFilename, icon: Icon, wajib = false }) => {
	const { field } = useController({ control, name });
	const baru = field.value instanceof File ? field.value : null;

	const onDrop = useCallback((berkas) => berkas[0] && field.onChange(berkas[0]), [field]);
	const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: false });

	const keadaan = baru ? "baru" : existingFilename ? "ada" : "kosong";
	const RUPA = {
		baru: { chip: "Siap diunggah", nadaChip: "bg-sky-50 text-sky-700", kartu: "border-sky-200 bg-sky-50/40", ikon: "bg-sky-600 text-white" },
		ada: { chip: "Terunggah", nadaChip: "bg-emerald-50 text-emerald-700", kartu: "border-emerald-200 bg-white", ikon: "bg-emerald-600 text-white" },
		kosong: { chip: "Belum ada", nadaChip: "bg-slate-100 text-slate-500", kartu: "border-dashed border-slate-300 bg-white", ikon: "bg-slate-100 text-slate-500" },
	}[keadaan];

	return (
		<motion.div
			layout
			{...getRootProps()}
			whileHover={{ y: -2 }}
			className={`group relative flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 transition-colors ${RUPA.kartu} ${
				isDragActive ? "border-slate-900 bg-slate-50 ring-4 ring-slate-900/5" : "hover:border-slate-400"
			}`}
		>
			<input {...getInputProps()} />
			<span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${RUPA.ikon}`}>
				{keadaan === "kosong" ? <Icon className="h-5 w-5" /> : <Check className="h-5 w-5" />}
			</span>
			<span className="min-w-0 flex-1">
				<span className="block truncate text-sm font-semibold text-slate-900">
					{label}
					{wajib && <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-brand-600">wajib</span>}
				</span>
				<span className="mt-0.5 block truncate text-[11px] text-slate-500">
					{baru ? baru.name : existingFilename ? existingFilename : isDragActive ? "Lepaskan di sini…" : "Seret berkas atau klik"}
				</span>
			</span>
			<span className="flex shrink-0 flex-col items-end gap-1.5">
				<span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${RUPA.nadaChip}`}>{RUPA.chip}</span>
				{keadaan === "ada" ? (
					<a
						href={fileUrl(existingFilename) || "#"}
						target="_blank"
						rel="noopener noreferrer"
						onClick={(event) => event.stopPropagation()}
						className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:underline"
					>
						<ExternalLink className="h-3 w-3" />
						Lihat
					</a>
				) : keadaan === "baru" ? (
					<button
						type="button"
						onClick={(event) => {
							event.stopPropagation();
							field.onChange(undefined);
						}}
						className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600"
					>
						<X className="h-3 w-3" />
						Batal
					</button>
				) : (
					<Upload className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-600" />
				)}
			</span>
			{keadaan === "ada" && (
				<span className="pointer-events-none absolute right-3.5 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white opacity-0 shadow transition-opacity group-hover:opacity-100 sm:inline-flex">
					<RefreshCw className="h-3 w-3" />
					Ganti
				</span>
			)}
		</motion.div>
	);
};

/* ---------- Navigasi seksi ---------- */
const NavigasiSeksi = ({ hitungan, aktif, onPilih }) => (
	<nav className="sticky top-6 space-y-1.5">
		<p className="px-3 pb-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">Bagian formulir</p>
		{SEKSI.map((seksi, index) => {
			const { isi, total } = hitungan[seksi.id];
			const lengkap = total > 0 && isi === total;
			const sedang = aktif === seksi.id;
			return (
				<button
					key={seksi.id}
					type="button"
					onClick={() => onPilih(seksi.id)}
					className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
						sedang ? "text-slate-900" : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
					}`}
				>
					{sedang && (
						<motion.span
							layoutId="nav-seksi-aktif"
							transition={{ type: "spring", stiffness: 420, damping: 36 }}
							className="absolute inset-0 -z-0 rounded-xl bg-white shadow-sm ring-1 ring-slate-200"
						/>
					)}
					<span
						className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
							lengkap ? "bg-emerald-500 text-white" : sedang ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-600"
						}`}
					>
						{lengkap ? <Check className="h-3.5 w-3.5" /> : index + 1}
					</span>
					<span className="relative min-w-0 flex-1">
						<span className="block text-sm font-semibold">{seksi.judul}</span>
						<span className="block text-[11px] tabular-nums text-slate-400">
							{total ? `${isi} dari ${total} ${seksi.wajib.length ? "wajib" : "terisi"}` : "Opsional"}
						</span>
					</span>
				</button>
			);
		})}
	</nav>
);

const AparaturDesaForm = ({
	onSubmit,
	initialData,
	produkHukumList,
	onCancel,
	// Navigasi seksi di samping — untuk tampilan lebar (panel layar penuh).
	denganNavigasi = false,
}) => {
	const {
		register,
		handleSubmit,
		control,
		watch,
		setFocus,
		formState: { errors, isSubmitting },
		reset,
	} = useForm({
		resolver: zodResolver(aparaturSchema),
		defaultValues: dariServer(initialData) || {
			status: "Aktif",
			jenis_kelamin: "Laki-laki",
		},
	});

	useEffect(() => {
		const defaultValues = {
			status: "Aktif",
			jenis_kelamin: "Laki-laki",
			...dariServer(initialData),
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
		FILE_KEYS.forEach((k) => {
			if (k in defaultValues) delete defaultValues[k];
		});
		reset(defaultValues);
	}, [initialData, reset]);

	// Local lock to prevent rapid double submits even if parent onSubmit doesn't return a Promise
	const [submitLock, setSubmitLock] = useState(false);

	// Build FormData on submit: only append files if they are actual File objects
	const buildAndSubmit = async (values) => {
		const fd = new FormData();
		const fileKeys = new Set(FILE_KEYS);

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
			if (v && typeof v === "object" && (v instanceof File || v instanceof Blob)) {
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

	// ── Kelengkapan per seksi ──────────────────────────────────────────────
	const nilai = watch();
	const hitungan = useMemo(() => {
		const hasil = {};
		for (const seksi of SEKSI) {
			const kolom = seksi.wajib.length ? seksi.wajib : seksi.opsional || [];
			const isi = kolom.filter((k) => terisi(nilai[k]) || (k.startsWith("file_") && initialData?.[k])).length;
			hasil[seksi.id] = { isi, total: kolom.length };
		}
		return hasil;
	}, [nilai, initialData]);
	const wajibTerisi = SEMUA_WAJIB.filter((k) => terisi(nilai[k])).length;
	const persenWajib = Math.round((wajibTerisi / SEMUA_WAJIB.length) * 100);

	// Seksi yang sedang terlihat — menggerakkan sorotan navigasi samping.
	const [seksiAktif, setSeksiAktif] = useState(SEKSI[0].id);
	useEffect(() => {
		if (!denganNavigasi) return undefined;
		const pengamat = new IntersectionObserver(
			(entri) => {
				const terlihat = entri.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
				if (terlihat[0]) setSeksiAktif(terlihat[0].target.id);
			},
			{ rootMargin: "-15% 0px -60% 0px" }
		);
		SEKSI.forEach((s) => {
			const el = document.getElementById(s.id);
			if (el) pengamat.observe(el);
		});
		return () => pengamat.disconnect();
	}, [denganNavigasi]);

	const lompatKe = (id) => {
		setSeksiAktif(id);
		document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
	};

	const sibuk = isSubmitting || submitLock;
	const daftarGalat = Object.entries(errors);

	const inputCls = INPUT_CLS;
	const galatCls = (kunci) => (errors[kunci] ? GALAT_CLS : "");

	const isiFormulir = (
		<div className="min-w-0 space-y-5">
			{/* Ringkasan galat — tiap butir bisa diklik untuk langsung ke kolomnya */}
			<AnimatePresence>
				{daftarGalat.length > 0 && (
					<motion.div
						initial={{ opacity: 0, y: -8, height: 0 }}
						animate={{ opacity: 1, y: 0, height: "auto" }}
						exit={{ opacity: 0, height: 0 }}
						className="overflow-hidden"
					>
						<div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-4">
							<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
								<AlertCircle className="h-5 w-5" />
							</span>
							<div className="min-w-0 text-sm text-rose-700">
								<p className="font-semibold">Masih ada {daftarGalat.length} isian yang perlu dibetulkan</p>
								<div className="mt-2 flex flex-wrap gap-1.5">
									{daftarGalat.map(([kunci]) => (
										<button
											key={kunci}
											type="button"
											onClick={() => setFocus(kunci)}
											className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-200 transition-colors hover:bg-rose-100"
										>
											{LABEL_KOLOM[kunci] || kunci}
										</button>
									))}
								</div>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* 1 · Biodata */}
			<KartuSeksi seksi={SEKSI[0]} nomor={0} {...hitungan[SEKSI[0].id]}>
				<div className="grid gap-6 md:grid-cols-[9rem_minmax(0,1fr)]">
					<PasFoto control={control} existingFilename={initialData?.file_pas_foto} nama={nilai.nama_lengkap} />
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<Field label="Nama Lengkap" required error={errors.nama_lengkap?.message} className="sm:col-span-2">
							<input {...register("nama_lengkap")} className={`${inputCls} text-[15px] font-medium${galatCls("nama_lengkap")}`} placeholder="Nama sesuai KTP" />
						</Field>
						<Field label="Jabatan" required error={errors.jabatan?.message} className="sm:col-span-2">
							<KotakPilih daftar={register("jabatan")} galat={Boolean(errors.jabatan)}>
								<option value="">Pilih jabatan</option>
								<OpsiTersimpan nilai={nilai.jabatan} dikenal={SEMUA_JABATAN} />
								{OPSI_JABATAN.map((g) => (
									<optgroup key={g.grup} label={g.grup}>
										{g.nilai.map((v) => (
											<option key={v} value={v}>
												{v}
											</option>
										))}
									</optgroup>
								))}
							</KotakPilih>
						</Field>
						<Field label="Tempat Lahir" required error={errors.tempat_lahir?.message}>
							<input {...register("tempat_lahir")} className={`${inputCls}${galatCls("tempat_lahir")}`} placeholder="Kota / kabupaten" />
						</Field>
						<Field label="Tanggal Lahir" required error={errors.tanggal_lahir?.message}>
							<input type="date" {...register("tanggal_lahir")} className={`${inputCls}${galatCls("tanggal_lahir")}`} />
						</Field>
					</div>
				</div>

				<div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
					<Field label="Jenis Kelamin" required error={errors.jenis_kelamin?.message}>
						<Segmen
							control={control}
							name="jenis_kelamin"
							idGrup="jk"
							opsi={[["Laki-laki", "Laki-laki"], ["Perempuan", "Perempuan"]]}
						/>
					</Field>
					<Field label="Status" required error={errors.status?.message}>
						<Segmen
							control={control}
							name="status"
							idGrup="status"
							opsi={[["Aktif", "Aktif", "bg-emerald-600"], ["Tidak Aktif", "Tidak Aktif", "bg-rose-600"]]}
						/>
					</Field>
					<Field label="Pendidikan Terakhir" required error={errors.pendidikan_terakhir?.message}>
						<KotakPilih daftar={register("pendidikan_terakhir")} galat={Boolean(errors.pendidikan_terakhir)}>
							<option value="">Pilih pendidikan</option>
							<OpsiTersimpan nilai={nilai.pendidikan_terakhir} dikenal={OPSI_PENDIDIKAN} />
							{OPSI_PENDIDIKAN.map((v) => (
								<option key={v} value={v}>
									{v}
								</option>
							))}
						</KotakPilih>
					</Field>
					<Field label="Agama" required error={errors.agama?.message}>
						<KotakPilih daftar={register("agama")} galat={Boolean(errors.agama)}>
							<option value="">Pilih agama</option>
							<OpsiTersimpan nilai={nilai.agama} dikenal={OPSI_AGAMA} />
							{OPSI_AGAMA.map((v) => (
								<option key={v} value={v}>
									{v}
								</option>
							))}
						</KotakPilih>
					</Field>
				</div>
			</KartuSeksi>

			{/* 2 · Kepegawaian */}
			<KartuSeksi seksi={SEKSI[1]} nomor={1} {...hitungan[SEKSI[1].id]}>
				{/* NIPD tidak diisi manual: diterbitkan sistem dari tanggal lahir,
				    kode wilayah, jenis kelamin, dan kode jabatan. */}
				<div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50/60 p-4">
					<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white">
						<CreditCard className="h-[18px] w-[18px]" />
					</span>
					<div className="min-w-0 text-[13px] text-slate-700">
						<p className="font-semibold text-slate-900">
							NIPD{" "}
							{initialData?.nipd ? (
								<span className="font-mono tracking-wider text-sky-700">{initialData.nipd}</span>
							) : (
								<span className="font-normal text-slate-500">— terbit otomatis setelah diverifikasi DPMD</span>
							)}
						</p>
						<p className="mt-0.5 text-xs text-slate-500">
							20 digit: tanggal lahir · kode kabupaten · kecamatan · desa · jenis kelamin · kode jabatan. Hanya untuk
							Sekdes, Kasi, Kaur, dan Kadus — kepala desa, staf, dan BPD tidak mendapat NIPD.
						</p>
					</div>
				</div>

				{/* Pengangkatan dan pemberhentian sebagai dua blok sejajar —
				    pasangan nomor & tanggal SK dibaca bersama. */}
				<div className="mt-5 grid gap-4 lg:grid-cols-2">
					<div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
						<p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
							<span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
							Pengangkatan
						</p>
						<div className="space-y-3">
							<Field label="Nomor SK" required error={errors.nomor_sk_pengangkatan?.message}>
								<input {...register("nomor_sk_pengangkatan")} className={`${inputCls}${galatCls("nomor_sk_pengangkatan")}`} placeholder="Nomor SK pengangkatan" />
							</Field>
							<Field label="Tanggal" required error={errors.tanggal_pengangkatan?.message}>
								<input type="date" {...register("tanggal_pengangkatan")} className={`${inputCls}${galatCls("tanggal_pengangkatan")}`} />
							</Field>
						</div>
					</div>
					<div className="rounded-2xl border border-dashed border-slate-200 p-4">
						<p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
							<span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
							Pemberhentian <span className="font-medium normal-case tracking-normal text-slate-400">— bila ada</span>
						</p>
						<div className="space-y-3">
							<Field label="Nomor SK">
								<input {...register("nomor_sk_pemberhentian")} className={inputCls} placeholder="Kosongkan bila masih menjabat" />
							</Field>
							<Field label="Tanggal">
								<input type="date" {...register("tanggal_pemberhentian")} className={inputCls} />
							</Field>
						</div>
					</div>
				</div>

				<div className="mt-5 grid gap-4">
					<Field label="SK Pengangkatan dari Produk Hukum Desa" hint={`${(produkHukumList || []).length} dokumen tersedia`}>
						<Controller
							control={control}
							name="produk_hukum_id"
							render={({ field: { value, onChange } }) => (
								<SearchableProdukHukumSelect value={value} onChange={onChange} produkHukumList={produkHukumList} />
							)}
						/>
					</Field>
					<Field label="Keterangan" hint="opsional">
						<textarea
							{...register("keterangan")}
							rows={3}
							className={`${inputCls} h-auto min-h-[88px] resize-y py-3`}
							placeholder="Catatan tambahan, misalnya alasan perubahan jabatan"
						/>
					</Field>
				</div>
			</KartuSeksi>

			{/* 3 · BPJS */}
			<KartuSeksi seksi={SEKSI[2]} nomor={2} {...hitungan[SEKSI[2].id]}>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Field label="Nomor BPJS Kesehatan">
						<input {...register("bpjs_kesehatan_nomor")} inputMode="numeric" className={`${inputCls} tabular-nums`} placeholder="13 digit" />
					</Field>
					<Field label="Nomor BPJS Ketenagakerjaan">
						<input {...register("bpjs_ketenagakerjaan_nomor")} inputMode="numeric" className={`${inputCls} tabular-nums`} placeholder="11 digit" />
					</Field>
				</div>
			</KartuSeksi>

			{/* 4 · Lampiran */}
			<KartuSeksi seksi={SEKSI[3]} nomor={3} {...hitungan[SEKSI[3].id]}>
				<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
					{BERKAS_LAMPIRAN.map((berkas) => (
						<UbinBerkas
							key={berkas.name}
							control={control}
							name={berkas.name}
							label={berkas.label}
							icon={berkas.icon}
							wajib={berkas.wajib}
							existingFilename={initialData?.[berkas.name]}
						/>
					))}
				</div>
				<p className="mt-3 text-[11px] text-slate-400">
					PDF atau gambar, maks. 2 MB per berkas. Berkas lama tetap tersimpan bila tidak diganti. SK Terakhir dan KTP
					wajib ada agar data bisa dinyatakan valid dan NIPD diterbitkan.
				</p>
			</KartuSeksi>

			{/* Bilah aksi lengket — progres isian wajib selalu terlihat */}
			{/* Inline di layout desa, ponsel punya navigasi bawah tetap setinggi
			    ±5rem (z-50) — bilah ini menempel di atasnya, bukan di baliknya. */}
			<div className={`sticky z-20 -mx-1 pb-1 pt-2 ${denganNavigasi ? "bottom-0" : "bottom-20 lg:bottom-0"}`}>
				<div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.25)] backdrop-blur-xl sm:flex-row sm:items-center sm:p-3.5">
					<div className="min-w-0 flex-1 px-1">
						<div className="flex items-baseline justify-between gap-2 text-xs">
							<span className="font-semibold text-slate-700">Isian wajib</span>
							<span className="tabular-nums text-slate-500">
								{wajibTerisi}/{SEMUA_WAJIB.length} · {persenWajib}%
							</span>
						</div>
						<div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
							<motion.div
								className={`h-full rounded-full ${persenWajib === 100 ? "bg-emerald-500" : "bg-slate-900"}`}
								initial={false}
								animate={{ width: `${persenWajib}%` }}
								transition={{ type: "spring", stiffness: 120, damping: 20 }}
							/>
						</div>
					</div>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={onCancel}
							disabled={sibuk}
							className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 sm:flex-none"
						>
							Batal
						</button>
						<motion.button
							type="submit"
							disabled={sibuk}
							whileTap={{ scale: 0.97 }}
							className="relative inline-flex h-11 flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-colors hover:bg-slate-800 disabled:opacity-70 sm:flex-none"
						>
							{sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
							{sibuk ? "Menyimpan…" : "Simpan Data"}
						</motion.button>
					</div>
				</div>
			</div>
		</div>
	);

	return (
		<form onSubmit={handleSubmit(buildAndSubmit)} aria-busy={isSubmitting} noValidate>
			{denganNavigasi ? (
				<div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
					<aside className="hidden lg:block">
						<NavigasiSeksi hitungan={hitungan} aktif={seksiAktif} onPilih={lompatKe} />
					</aside>
					{isiFormulir}
				</div>
			) : (
				isiFormulir
			)}
		</form>
	);
};

export default AparaturDesaForm;
