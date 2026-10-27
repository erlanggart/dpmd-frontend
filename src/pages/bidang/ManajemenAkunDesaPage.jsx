// src/pages/bidang/ManajemenAkunDesaPage.jsx
//
// Staf bidang DPMD membuatkan akun operator desa.
//
// Halaman ini TIDAK punya daftar fitur sendiri. Katalog hak akses datang dari
// GET /bidang/akun-desa/meta, yang sudah disaring server sesuai bidang si
// pengguna — jadi satu berkas ini melayani PMD, SPKED, KKD, dan Pemdes tanpa
// percabangan per bidang. Menambah fitur desa baru cukup di
// backend/src/config/bidangDesaPermissions.js; halaman ini ikut sendiri.
//
// Alurnya sengaja dibuat bertahap "pilih desa dulu, baru kelola akunnya":
// tanpa itu staf dihadapkan pada ribuan akun se-kabupaten sekaligus, dan yang
// paling sering ia butuhkan — melihat apakah desa X sudah punya operator —
// justru paling sulit dijawab.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, MotionConfig, animate, motion, useReducedMotion } from "framer-motion";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import api from "../../api";
import escapeHtml from "../../utils/escapeHtml";
import AkunKecamatanPanel from "./AkunKecamatanPanel";
import {
	FiAlertCircle,
	FiCheck,
	FiChevronDown,
	FiClock,
	FiCopy,
	FiDownload,
	FiEdit2,
	FiEye,
	FiEyeOff,
	FiFilter,
	FiLock,
	FiMail,
	FiMapPin,
	FiPlus,
	FiPower,
	FiSearch,
	FiShield,
	FiUserCheck,
	FiUsers,
	FiX,
	FiZap,
} from "react-icons/fi";

const formKosong = {
	name: "",
	email: "",
	password: "",
	jabatan_desa: "",
	no_hp: "",
	is_active: true,
	permissions: [],
};

// Contoh bagian/jabatan untuk mempercepat pengisian; tetap boleh diketik bebas.
const JABATAN_SARAN = [
	"Operator",
	"Kesejahteraan",
	"Pemerintahan",
	"Pembangunan",
	"Pelayanan",
	"Keuangan",
	"Perencanaan",
	"Umum & Tata Usaha",
];

const pesanError = (error, cadangan) =>
	error?.response?.data?.message || error?.message || cadangan;

/** Sandi acak yang mudah dibacakan lewat telepon — tanpa karakter yang mirip (0/O, 1/l). */
const buatSandi = () => {
	const huruf = "abcdefghjkmnpqrstuvwxyz";
	const angka = "23456789";
	let hasil = "";
	for (let i = 0; i < 4; i += 1) hasil += huruf[Math.floor(Math.random() * huruf.length)];
	for (let i = 0; i < 4; i += 1) hasil += angka[Math.floor(Math.random() * angka.length)];
	return hasil;
};

// ── Gerak ───────────────────────────────────────────────────────────────────
//
// Satu pegas untuk seluruh halaman supaya kartu, panel, dan modal bergerak
// dengan "berat" yang sama. Seluruh halaman dibungkus MotionConfig
// reducedMotion="user": pengguna yang mematikan animasi di sistemnya
// mendapat perpindahan instan, bukan versi yang dipercepat.
const PEGAS = { type: "spring", stiffness: 420, damping: 32, mass: 0.8 };

/**
 * Kartu muncul bergelombang, tapi tundaannya dipatok di urutan ke-12: tanpa
 * batas itu, kartu ke-24 baru muncul hampir satu detik kemudian dan halaman
 * terasa lambat padahal datanya sudah tiba.
 */
const varianKartu = {
	awal: { opacity: 0, y: 16, scale: 0.98 },
	tampil: (i) => ({ opacity: 1, y: 0, scale: 1, transition: { ...PEGAS, delay: Math.min(i, 12) * 0.035 } }),
	keluar: { opacity: 0, scale: 0.96, transition: { duration: 0.15 } },
};

const varianLatarModal = {
	awal: { opacity: 0 },
	tampil: { opacity: 1, transition: { duration: 0.2 } },
	keluar: { opacity: 0, transition: { duration: 0.18 } },
};

const varianPanelModal = {
	awal: { opacity: 0, y: 48, scale: 0.97 },
	tampil: { opacity: 1, y: 0, scale: 1, transition: PEGAS },
	keluar: { opacity: 0, y: 32, scale: 0.98, transition: { duration: 0.16 } },
};

/** Lipat-buka setinggi isinya — dipakai panel yang muncul/hilang di tengah halaman. */
const LIPATAN = {
	initial: { opacity: 0, height: 0 },
	animate: { opacity: 1, height: "auto", transition: { ...PEGAS, opacity: { duration: 0.2 } } },
	exit: { opacity: 0, height: 0, transition: { duration: 0.18 } },
};

/** Angka yang berhitung naik/turun ke nilai barunya, bukan melompat. */
const AngkaBergerak = ({ nilai }) => {
	const ref = useRef(null);
	const sebelumnya = useRef(0);
	const kurangiGerak = useReducedMotion();

	useEffect(() => {
		const el = ref.current;
		const tujuan = Number(nilai) || 0;
		if (!el) return undefined;
		if (kurangiGerak) {
			el.textContent = tujuan.toLocaleString("id-ID");
			sebelumnya.current = tujuan;
			return undefined;
		}
		const kendali = animate(sebelumnya.current, tujuan, {
			duration: 0.9,
			ease: [0.16, 1, 0.3, 1],
			onUpdate: (v) => {
				el.textContent = Math.round(v).toLocaleString("id-ID");
			},
		});
		sebelumnya.current = tujuan;
		return () => kendali.stop();
	}, [nilai, kurangiGerak]);

	return (
		<span ref={ref} className="tabular-nums">
			{(Number(nilai) || 0).toLocaleString("id-ID")}
		</span>
	);
};

// ── Potongan tampilan ───────────────────────────────────────────────────────

/**
 * "Terakhir aktif" dalam bahasa sehari-hari. Pertanyaan yang paling sering
 * diajukan staf tentang satu akun bukan "kapan dibuat" melainkan "sudah
 * dipakai atau belum" — jawabannya ada di last_active_at.
 */
const waktuRelatif = (iso) => {
	if (!iso) return null;
	const selisih = Date.now() - new Date(iso).getTime();
	if (Number.isNaN(selisih)) return null;
	const menit = Math.floor(selisih / 60000);
	if (menit < 2) return "baru saja";
	if (menit < 60) return `${menit} menit lalu`;
	const jam = Math.floor(menit / 60);
	if (jam < 24) return `${jam} jam lalu`;
	const hari = Math.floor(jam / 24);
	if (hari === 1) return "kemarin";
	if (hari < 30) return `${hari} hari lalu`;
	return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

/** Dianggap sedang memakai aplikasi bila ada aktivitas dalam 15 menit terakhir. */
const sedangDaring = (iso) => Boolean(iso) && Date.now() - new Date(iso).getTime() < 15 * 60000;

/**
 * Saring cepat di atas daftar. Dihitung di klien dari akun yang sudah dimuat
 * — semuanya pertanyaan "mana yang perlu ditindaklanjuti" yang tidak perlu
 * ditanyakan ulang ke server.
 */
const SARING_STATUS = [
	{ id: "semua", label: "Semua", cocok: () => true },
	{ id: "aktif", label: "Aktif", cocok: (u) => u.is_active },
	{ id: "nonaktif", label: "Nonaktif", cocok: (u) => !u.is_active },
	{ id: "belum-login", label: "Belum pernah login", cocok: (u) => !u.last_active_at },
	{ id: "tanpa-akses", label: "Tanpa hak akses", cocok: (u) => !u.permissions?.length },
];

// Kartu yang dirender sekaligus. Se-kabupaten bisa 400+ akun; merender semuanya
// (masing-masing dengan animasi) membuat halaman tersendat di laptop kantor.
const UKURAN_HALAMAN = 24;

const sebutanDesa = (d) =>
	d ? `${d.status_pemerintahan === "kelurahan" ? "Kel." : "Desa"} ${d.nama}` : "";

const KELAS_INPUT =
	"w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 transition-shadow placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-900/5";

/** Dua huruf untuk avatar, diambil dari dua kata pertama nama. */
const inisialNama = (nama) => {
	const kata = String(nama || "?")
		.trim()
		.split(/\s+/)
		.filter(Boolean);
	if (kata.length === 0) return "?";
	if (kata.length === 1) return kata[0].slice(0, 2).toUpperCase();
	return (kata[0][0] + kata[1][0]).toUpperCase();
};

/**
 * Warna avatar diturunkan dari nama, bukan diacak.
 *
 * Alasannya praktis: staf menelusuri daftar ini berulang kali, dan orang yang
 * sama harus tampil dengan warna yang sama setiap kali halaman dibuka — warna
 * acak justru menghapus nilai bantunya sebagai penanda.
 */
const WARNA_AVATAR = [
	"bg-indigo-100 text-indigo-700",
	"bg-emerald-100 text-emerald-700",
	"bg-amber-100 text-amber-700",
	"bg-sky-100 text-sky-700",
	"bg-rose-100 text-rose-700",
	"bg-violet-100 text-violet-700",
	"bg-teal-100 text-teal-700",
];
const warnaAvatar = (nama) => {
	const teks = String(nama || "");
	let jumlah = 0;
	for (let i = 0; i < teks.length; i += 1) jumlah = (jumlah + teks.charCodeAt(i)) % 1000;
	return WARNA_AVATAR[jumlah % WARNA_AVATAR.length];
};

const KotakGalat = ({ pesan }) => (
	<div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
		<FiAlertCircle className="mx-auto h-8 w-8 text-amber-500" />
		<p className="mt-3 font-semibold text-amber-900">Halaman tidak dapat dibuka</p>
		<p className="mt-1 text-sm text-amber-800">{pesan}</p>
	</div>
);

/** Kerangka kartu selama akun dimuat — menahan tinggi daftar supaya tidak melompat. */
const KerangkaKartu = () => (
	<div className="animate-pulse rounded-2xl border border-slate-200/90 bg-white p-4">
		<div className="flex gap-3">
			<div className="h-11 w-11 shrink-0 rounded-full bg-slate-200" />
			<div className="min-w-0 flex-1 space-y-2 pt-1">
				<div className="h-3.5 w-2/5 rounded-full bg-slate-200" />
				<div className="h-3 w-3/5 rounded-full bg-slate-100" />
			</div>
		</div>
		<div className="mt-3 h-9 rounded-xl bg-slate-50" />
		<div className="mt-3 flex items-center justify-between">
			<div className="h-6 w-28 rounded-full bg-slate-100" />
			<div className="h-3 w-20 rounded-full bg-slate-100" />
		</div>
	</div>
);

/** Baris ringkas satu akun di dalam panel kondisi desa. */
const BarisAkunRingkas = ({ user, aksi }) => (
	<div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
		<div className="flex min-w-0 items-center gap-2.5">
			<span
				className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${warnaAvatar(user.name)}`}
				aria-hidden
			>
				{inisialNama(user.name)}
			</span>
			<div className="min-w-0">
				<div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
					<span className="text-[13px] font-semibold text-slate-800">{user.name}</span>
					{user.jabatan_desa && (
						<span className="text-[11px] text-slate-400">{user.jabatan_desa}</span>
					)}
					{!user.is_active && (
						<span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">
							Nonaktif
						</span>
					)}
				</div>
				<span className="block break-all text-[11.5px] leading-snug text-slate-500">
					{user.email}
				</span>
			</div>
		</div>
		{aksi}
	</div>
);

/**
 * Nama dan jabatan yang diketik HURUF BESAR SEMUA dirapikan untuk tampilan
 * saja ("AHMAD HAERUN" → "Ahmad Haerun"); isian di form tetap apa adanya.
 * Kata berisi titik atau ≤ 2 huruf (gelar seperti "SH", "S.Sos") dibiarkan.
 */
const rapikanHuruf = (teks) => {
	const s = String(teks || "").trim();
	if (!s || s !== s.toUpperCase() || !/[A-Z]/.test(s)) return s;
	return s
		.split(/\s+/)
		.map((k) => (k.includes(".") || k.length <= 2 ? k : k[0] + k.slice(1).toLowerCase()))
		.join(" ");
};

/**
 * Satu akun operator.
 *
 * Kartu ini dibaca sambil lalu di daftar ratusan akun, jadi yang ditonjolkan
 * hanya yang BERBEDA antar akun: siapa orangnya, desanya, emailnya, dan apakah
 * akunnya sudah dipakai. Versi sebelumnya memasang chip hitam per fitur di
 * setiap kartu — di halaman modul isinya selalu sama persis, sehingga deretan
 * chip identik itulah yang paling menarik mata. Sekarang hak akses bidang ini
 * diringkas jadi satu lencana "Akses lengkap", dan yang diberi warna justru
 * kekurangannya: fitur yang BELUM dipegang.
 *
 * Hak akses dari bidang LAIN tetap diringkas jadi satu tautan berpenghitung;
 * rinciannya tinggal diklik.
 */
// `ref` diteruskan ke motion.article: AnimatePresence mode="popLayout" butuh
// elemen aslinya untuk mengukur kartu yang sedang keluar.
const KartuAkun = ({ ref, user, urutan = 0, katalogKunci = [], labelPermission, onUbah, onUbahStatus }) => {
	const [rincianTerbuka, setRincianTerbuka] = useState(false);
	const [tersalin, setTersalin] = useState(false);

	const milikBidang = user.permissions_dikelola || [];
	const milikBidangLain = user.permissions_bidang_lain || [];
	const tanpaAkses = !user.permissions?.length;
	const kurang = katalogKunci.filter((k) => !milikBidang.includes(k));
	const lengkap = katalogKunci.length > 0 && kurang.length === 0;
	const daring = user.is_active && sedangDaring(user.last_active_at);
	const terakhirAktif = waktuRelatif(user.last_active_at);
	const nama = rapikanHuruf(user.name);
	const label = (k) => labelPermission.get(k) || k;

	// Email inilah yang paling sering dibacakan ke desa lewat telepon/WA.
	const salinEmail = async () => {
		try {
			await navigator.clipboard.writeText(user.email);
			setTersalin(true);
			setTimeout(() => setTersalin(false), 1400);
		} catch {
			toast.error("Gagal menyalin email");
		}
	};

	return (
		<motion.article
			ref={ref}
			layout="position"
			custom={urutan}
			variants={varianKartu}
			initial="awal"
			animate="tampil"
			exit="keluar"
			whileHover={{ y: -2 }}
			transition={PEGAS}
			className={`group relative flex flex-col rounded-2xl border p-4 transition-[border-color,box-shadow] duration-200 hover:shadow-[0_10px_30px_-14px_rgba(15,23,42,0.22)] ${
				user.is_active
					? "border-slate-200/90 bg-white hover:border-slate-300"
					: "border-dashed border-slate-300 bg-slate-50/70"
			}`}
		>
			{/* ── Identitas + aksi ── */}
			<div className="flex items-start gap-3">
				<span className="relative shrink-0" aria-hidden>
					<span
						className={`flex h-11 w-11 items-center justify-center rounded-full text-[13px] font-semibold ring-2 ring-white transition-transform duration-300 group-hover:scale-105 ${warnaAvatar(user.name)} ${user.is_active ? "" : "opacity-50 grayscale"}`}
					>
						{inisialNama(user.name)}
					</span>
					{daring && (
						<span className="absolute bottom-0 right-0 flex h-3 w-3">
							<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
							<span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
						</span>
					)}
				</span>

				<div className="min-w-0 flex-1 pt-0.5">
					<div className="flex items-center gap-2">
						<h3 className="truncate text-[15px] font-semibold leading-tight text-slate-900" title={user.name}>
							{nama}
						</h3>
						{!user.is_active && (
							<span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[10.5px] font-semibold text-slate-600">
								Nonaktif
							</span>
						)}
					</div>
					<p className="mt-1 truncate text-[12.5px] leading-snug text-slate-500">
						{user.jabatan_desa && (
							<span className="font-medium text-slate-600">{rapikanHuruf(user.jabatan_desa)}</span>
						)}
						{user.jabatan_desa && user.desa && <span className="mx-1.5 text-slate-300">•</span>}
						{user.desa && (
							<span title={user.desa.kecamatan ? `Kec. ${user.desa.kecamatan.nama}` : undefined}>
								{sebutanDesa(user.desa)}
								{user.desa.kecamatan && <span className="text-slate-400">, {user.desa.kecamatan.nama}</span>}
							</span>
						)}
					</p>
				</div>

				{/* Aksi berupa ikon bundar yang tenang; menguat saat kartu disorot. */}
				<div className="-mr-1 -mt-1 flex shrink-0 items-center">
					<motion.button
						whileTap={{ scale: 0.9 }}
						onClick={() => onUbah(user)}
						title="Ubah akun"
						aria-label="Ubah akun"
						className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-900 hover:text-white group-hover:text-slate-700"
					>
						<FiEdit2 className="h-[15px] w-[15px]" />
					</motion.button>
					<motion.button
						whileTap={{ scale: 0.9 }}
						onClick={() => onUbahStatus(user)}
						title={user.is_active ? "Nonaktifkan akun" : "Aktifkan akun"}
						aria-label={user.is_active ? "Nonaktifkan akun" : "Aktifkan akun"}
						className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
							user.is_active
								? "text-slate-300 hover:bg-red-50 hover:text-red-600 group-hover:text-slate-500"
								: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
						}`}
					>
						<FiPower className="h-[15px] w-[15px]" />
					</motion.button>
				</div>
			</div>

			{/* ── Email login: diperlakukan sebagai "kredensial", bisa disalin. ── */}
			<div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 py-1.5 pl-3 pr-1.5 ring-1 ring-inset ring-slate-100 transition-colors group-hover:bg-slate-100/70">
				<FiMail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
				<span className="min-w-0 flex-1 truncate text-[12.5px] text-slate-600" title={user.email}>
					{user.email}
				</span>
				<button
					type="button"
					onClick={salinEmail}
					title="Salin email"
					aria-label="Salin email"
					className="relative shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-slate-700 hover:shadow-sm"
				>
					<AnimatePresence mode="wait" initial={false}>
						<motion.span
							key={tersalin ? "ok" : "salin"}
							initial={{ scale: 0.4, opacity: 0, rotate: -30 }}
							animate={{ scale: 1, opacity: 1, rotate: 0 }}
							exit={{ scale: 0.4, opacity: 0 }}
							transition={{ duration: 0.15 }}
							className="block"
						>
							{tersalin ? <FiCheck className="h-3.5 w-3.5 text-emerald-600" /> : <FiCopy className="h-3.5 w-3.5" />}
						</motion.span>
					</AnimatePresence>
				</button>
			</div>

			{/* ── Status akses + terakhir aktif ── */}
			<div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
				<div className="flex min-w-0 flex-wrap items-center gap-1.5">
					{tanpaAkses ? (
						<span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11.5px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
							<FiAlertCircle className="h-3 w-3" />
							Belum ada hak akses
						</span>
					) : lengkap ? (
						<span
							title={milikBidang.map(label).join(", ")}
							className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11.5px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200/70"
						>
							<FiCheck className="h-3 w-3" />
							Akses lengkap
						</span>
					) : (
						<>
							{milikBidang.map((k) => (
								<span
									key={k}
									className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11.5px] font-medium text-slate-600"
								>
									<FiCheck className="h-3 w-3 text-emerald-600" />
									{label(k)}
								</span>
							))}
							{kurang.length > 0 && (
								<span
									title={`Belum dipegang: ${kurang.map(label).join(", ")}`}
									className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11.5px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200"
								>
									Belum: {kurang.map(label).join(", ")}
								</span>
							)}
						</>
					)}

					{milikBidangLain.length > 0 && (
						<button
							type="button"
							onClick={() => setRincianTerbuka((t) => !t)}
							aria-expanded={rincianTerbuka}
							className="inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-[11.5px] font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
						>
							+{milikBidangLain.length} bidang lain
							<motion.span animate={{ rotate: rincianTerbuka ? 180 : 0 }} transition={PEGAS} className="block">
								<FiChevronDown className="h-3 w-3" />
							</motion.span>
						</button>
					)}
				</div>

				<span
					className={`inline-flex shrink-0 items-center gap-1.5 text-[11.5px] ${
						daring ? "font-medium text-emerald-600" : terakhirAktif ? "text-slate-400" : "font-medium text-amber-600"
					}`}
					title={user.last_active_at ? new Date(user.last_active_at).toLocaleString("id-ID") : undefined}
				>
					<span
						className={`h-1.5 w-1.5 rounded-full ${daring ? "bg-emerald-500" : terakhirAktif ? "bg-slate-300" : "bg-amber-400"}`}
					/>
					{daring ? "Sedang daring" : terakhirAktif ? `Aktif ${terakhirAktif}` : "Belum pernah login"}
				</span>
			</div>

			{/* Hak akses bidang lain ditampilkan tapi tidak bisa disentuh — supaya
			    staf tahu akun ini juga dipakai untuk urusan di luar bidangnya. */}
			<AnimatePresence initial={false}>
				{rincianTerbuka && milikBidangLain.length > 0 && (
					<motion.div {...LIPATAN} className="overflow-hidden">
						<div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
							<p className="mb-1.5 text-[11px] font-medium text-slate-400">
								Diberikan bidang lain atau Admin Desa — tidak dapat Anda ubah
							</p>
							<div className="flex flex-wrap gap-1.5">
								{milikBidangLain.map((key, i) => (
									<motion.span
										key={key}
										initial={{ opacity: 0, y: 4 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: i * 0.025 }}
										className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-inset ring-slate-200"
									>
										<FiLock className="h-3 w-3" />
										{label(key)}
									</motion.span>
								))}
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.article>
	);
};

/**
 * Pembuatan akun operator secara massal.
 *
 * Dipakai ketika puluhan desa belum punya operator untuk satu fitur dan
 * membuatkannya satu per satu lewat form berarti ratusan kali mengetik hal yang
 * sama. Alurnya tiga langkah dan sengaja tidak bisa dipotong:
 *
 *   1. TEMPLATE — staf menyusun bentuk emailnya sendiri. Tidak ada bentuk baku
 *      yang dipaksakan karena tiap bidang punya kebiasaan penamaan sendiri.
 *   2. PRATINJAU — daftar desa sasaran beserta email yang akan dipakai, plus
 *      desa yang dilewati beserta alasannya. Template salah ketik paling mahal
 *      diperbaiki setelah ratusan akun terbentuk.
 *   3. HASIL — daftar email yang jadi, bisa disalin atau diunduh, karena inilah
 *      satu-satunya saat sandi dan email berkumpul di satu layar.
 *
 * Desa yang sudah punya operator TIDAK PERNAH disentuh. Penyaringannya dilakukan
 * server (lihat susunRencanaGenerate di bidangAkunDesa.controller.js), dihitung
 * ulang saat tombol ditekan — bukan dari daftar pratinjau yang bisa saja sudah
 * basi karena staf lain membuat akun di menit yang sama.
 */
// Jumlah desa per permintaan generate — cukup kecil untuk selesai jauh di bawah
// batas waktu klien maupun proxy.
const UKURAN_GELOMBANG = 40;

const ModalGenerateAkun = ({ meta, kecamatanTerpilih, modulSlug, onSelesai, onTutup }) => {
  const [template, setTemplate] = useState(meta?.template_bawaan || "");
  const [seKabupaten, setSeKabupaten] = useState(!kecamatanTerpilih);
  const [pratinjau, setPratinjau] = useState(null);
  const [memuat, setMemuat] = useState(false);
  const [menjalankan, setMenjalankan] = useState(false);
  const [hasil, setHasil] = useState(null);
  const [progres, setProgres] = useState(null); // { dibuat, target } selama berjalan

  const cakupanKecamatanId = seKabupaten ? null : kecamatanTerpilih?.id || null;

  const badanPermintaan = () => ({
    modul: modulSlug,
    template: template.trim(),
    ...(cakupanKecamatanId ? { kecamatan_id: cakupanKecamatanId } : {}),
  });

  const ambilPratinjau = async () => {
    setMemuat(true);
    try {
      const res = await api.post("/bidang/akun-desa/generate/pratinjau", badanPermintaan());
      setPratinjau(res.data?.data || null);
    } catch (error) {
      setPratinjau(null);
      Swal.fire({
        icon: "error",
        title: "Template belum bisa dipakai",
        text: pesanError(error, "Gagal menyusun pratinjau."),
      });
    } finally {
      setMemuat(false);
    }
  };

  const jalankan = async () => {
    const jumlah = pratinjau?.ringkasan?.baru || 0;
    const konfirmasi = await Swal.fire({
      icon: "question",
      title: `Buat ${jumlah} akun sekarang?`,
      html:
        `<div style="text-align:left;font-size:14px">` +
        `<p style="margin:0 0 8px">Semua akun memakai sandi <b>${escapeHtml(pratinjau?.sandi_default)}</b> dan wajib menggantinya saat login pertama.</p>` +
        `<p style="margin:0;color:#64748b;font-size:12.5px">Akun yang sudah ada tidak diubah; desa yang sudah punya operator mendapat akun tambahan.</p>` +
        `</div>`,
      showCancelButton: true,
      confirmButtonText: `Ya, buat ${jumlah} akun`,
      cancelButtonText: "Batal",
      confirmButtonColor: "#0f172a",
    });
    if (!konfirmasi.isConfirmed) return;

    // Dikirim per gelombang: ~416 desa dalam satu permintaan melewati batas
    // waktu 30 detik, sehingga se-kabupaten dulu tidak pernah selesai. Server
    // menghitung ulang rencananya setiap gelombang, jadi desa yang sudah
    // dibuatkan akun otomatis dilewati.
    setMenjalankan(true);
    setProgres({ dibuat: 0, target: jumlah });
    const gabungan = { dibuat: [], gagal: [] };
    let terakhir = null;
    try {
      for (let putaran = 0; putaran < 50; putaran += 1) {
        let res;
        try {
          res = await api.post(
            "/bidang/akun-desa/generate",
            { ...badanPermintaan(), gelombang: UKURAN_GELOMBANG },
            { timeout: 120000 },
          );
        } catch (error) {
          // 409 = tidak ada lagi desa yang perlu dibuatkan akun: selesai.
          if (error.response?.status === 409 && gabungan.dibuat.length > 0) break;
          throw error;
        }
        terakhir = res.data?.data || null;
        gabungan.dibuat.push(...(terakhir?.dibuat || []));
        gabungan.gagal.push(...(terakhir?.gagal || []));
        setProgres({ dibuat: gabungan.dibuat.length, target: jumlah });
        // Berhenti bila sudah habis, atau gelombang ini tidak menghasilkan
        // apa pun (mencegah berputar pada kegagalan yang sama).
        if (!terakhir?.sisa || (terakhir?.dibuat || []).length === 0) break;
      }
      setHasil({
        ...(terakhir || {}),
        dibuat: gabungan.dibuat,
        gagal: gabungan.gagal,
        ringkasan: { ...(terakhir?.ringkasan || {}), dibuat: gabungan.dibuat.length, gagal: gabungan.gagal.length },
      });
      onSelesai();
    } catch (error) {
      if (gabungan.dibuat.length > 0) {
        // Sebagian sudah jadi: tampilkan yang sudah dibuat supaya kredensialnya
        // tidak hilang, lalu beri tahu bahwa sisanya bisa dilanjutkan.
        setHasil({
          ...(terakhir || {}),
          dibuat: gabungan.dibuat,
          gagal: gabungan.gagal,
          ringkasan: { ...(terakhir?.ringkasan || {}), dibuat: gabungan.dibuat.length, gagal: gabungan.gagal.length },
        });
        onSelesai();
      }
      Swal.fire({
        icon: "error",
        title: gabungan.dibuat.length > 0 ? "Proses terhenti di tengah jalan" : "Gagal membuat akun",
        text:
          gabungan.dibuat.length > 0
            ? `${gabungan.dibuat.length} akun sudah dibuat. Jalankan Generate lagi untuk melanjutkan desa yang tersisa — desa yang sudah punya akun otomatis dilewati.`
            : pesanError(error, "Terjadi kesalahan."),
      });
    } finally {
      setMenjalankan(false);
      setProgres(null);
    }
  };

  // Email + sandi hanya berkumpul di layar ini sekali. Sesudah modal ditutup,
  // sandinya tidak ditampilkan lagi di mana pun, jadi keduanya harus bisa
  // dibawa keluar dengan mudah.
  const barisKredensial = () =>
    (hasil?.dibuat || [])
      .map((d) => `${d.desa.kecamatan?.nama || "-"};${d.desa.nama};${d.email};${hasil.sandi_default}`)
      .join("\n");

  const salin = async () => {
    try {
      await navigator.clipboard.writeText(`Kecamatan;Desa;Email;Sandi\n${barisKredensial()}`);
      toast.success("Daftar akun disalin");
    } catch {
      toast.error("Gagal menyalin. Pakai tombol unduh.");
    }
  };

  const unduh = () => {
    const isi = `Kecamatan;Desa;Email;Sandi\n${barisKredensial()}`;
    const url = URL.createObjectURL(new Blob([`\uFEFF${isi}`], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `akun-operator-${modulSlug}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Desa yang sudah punya operator fitur ini TETAP dibuatkan akun (satu desa
  // boleh punya beberapa operator). Yang dilewati hanya akun template yang
  // sudah pernah dibuat, jadi Generate aman ditekan berulang.
  const KELAS_STATUS = {
    baru: "bg-emerald-50 text-emerald-700 border-emerald-200",
    sudah_dibuat: "bg-slate-50 text-slate-500 border-slate-200",
    email_terpakai: "bg-rose-50 text-rose-700 border-rose-200",
    email_bentrok: "bg-rose-50 text-rose-700 border-rose-200",
  };

  const LABEL_STATUS = {
    baru: "Akan dibuat",
    sudah_dibuat: "Sudah dibuat",
    email_terpakai: "Email terpakai",
    email_bentrok: "Email bentrok",
  };

  return (
    <motion.div
      variants={varianLatarModal}
      initial="awal"
      animate="tampil"
      exit="keluar"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <motion.div
        variants={varianPanelModal}
        className="relative flex w-full max-h-[92vh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-3xl sm:rounded-2xl"
        style={{ maxHeight: "92dvh" }}
      >
        {/* Bilah progres di tepi atas selama gelombang demi gelombang berjalan. */}
        {menjalankan && (
          <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-slate-100">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500"
              initial={{ width: "4%" }}
              animate={{
                width: `${Math.max(4, Math.round(((progres?.dibuat || 0) / Math.max(progres?.target || 1, 1)) * 100))}%`,
              }}
              transition={PEGAS}
            />
          </div>
        )}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <motion.span
              animate={menjalankan ? { rotate: [0, -12, 12, 0], scale: [1, 1.12, 1] } : { rotate: 0, scale: 1 }}
              transition={menjalankan ? { repeat: Infinity, duration: 1.1 } : PEGAS}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                hasil ? "bg-emerald-100 text-emerald-600" : "bg-indigo-100 text-indigo-600"
              }`}
            >
              {hasil ? <FiCheck className="h-5 w-5" /> : <FiZap className="h-5 w-5" />}
            </motion.span>
            <div className="min-w-0">
            <h2 className="font-bold text-slate-900">
              {hasil ? "Akun Selesai Dibuat" : "Generate Akun Operator Otomatis"}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {hasil
                ? "Sampaikan email dan sandi di bawah ke masing-masing desa."
                : `Untuk semua desa — termasuk yang sudah punya operator ${meta?.modul?.label || "fitur ini"}. Akun yang sudah pernah dibuat dilewati.`}
            </p>
            </div>
          </div>
          <button
            onClick={onTutup}
            className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Tutup"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {hasil ? (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={PEGAS}
                className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4"
              >
                <p className="text-sm font-bold text-emerald-900">
                  <AngkaBergerak nilai={hasil.dibuat.length} /> akun berhasil dibuat
                </p>
                <p className="mt-1 text-[12.5px] text-emerald-800">
                  Semuanya memakai sandi{" "}
                  <span className="rounded bg-white px-1.5 py-0.5 font-mono font-bold">
                    {hasil.sandi_default}
                  </span>{" "}
                  dan akan diminta mengganti sandi sekaligus mengisi identitas petugas saat login
                  pertama.
                </p>
                {hasil.gagal.length > 0 && (
                  <p className="mt-2 text-[12.5px] font-semibold text-rose-700">
                    {hasil.gagal.length} desa gagal dibuat — lihat daftar di bawah.
                  </p>
                )}
              </motion.div>

              <div className="flex gap-2">
                <button
                  onClick={salin}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <FiCopy className="h-4 w-4" /> Salin daftar
                </button>
                <button
                  onClick={unduh}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <FiDownload className="h-4 w-4" /> Unduh CSV
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                {hasil.dibuat.map((d) => (
                  <div
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 last:border-b-0"
                  >
                    <span className="text-[13px] font-semibold text-slate-700">
                      {d.desa.status_pemerintahan === "kelurahan" ? "Kel." : "Desa"} {d.desa.nama}
                      <span className="ml-1.5 text-[11.5px] font-normal text-slate-400">
                        Kec. {d.desa.kecamatan?.nama || "-"}
                      </span>
                    </span>
                    <span className="break-all font-mono text-[12px] text-slate-600">{d.email}</span>
                  </div>
                ))}
              </div>

              {hasil.gagal.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-rose-200">
                  {hasil.gagal.map((g, i) => (
                    <div key={i} className="border-b border-rose-100 px-3 py-2 last:border-b-0">
                      <p className="text-[13px] font-semibold text-rose-800">{g.desa.nama}</p>
                      <p className="text-[11.5px] text-rose-700">{g.alasan}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Template Username (Email Login)
                </label>
                <input
                  type="text"
                  value={template}
                  onChange={(e) => {
                    setTemplate(e.target.value);
                    setPratinjau(null);
                  }}
                  placeholder="bumdes.{kecamatan}.{desa}@dpmd.bogorkab.go.id"
                  className={`${KELAS_INPUT} font-mono`}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(meta?.token_template || []).map((t) => (
                    <button
                      key={t.token}
                      type="button"
                      title={t.keterangan}
                      onClick={() => {
                        setTemplate((v) => v + t.token);
                        setPratinjau(null);
                      }}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-600 transition-colors hover:bg-slate-100"
                    >
                      {t.token}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Klik token untuk menyisipkannya. Template wajib memuat {"{desa}"} atau {"{kode}"},
                  supaya tiap desa mendapat alamat yang berbeda.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Cakupan</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={!kecamatanTerpilih}
                    onClick={() => {
                      setSeKabupaten(false);
                      setPratinjau(null);
                    }}
                    className={`rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      !seKabupaten ? "border-slate-900 bg-slate-900/[0.04]" : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-slate-800">
                      Kecamatan terpilih
                    </span>
                    <span className="block text-[11.5px] text-slate-500">
                      {kecamatanTerpilih ? `Kec. ${kecamatanTerpilih.nama}` : "Pilih kecamatan dulu di atas"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSeKabupaten(true);
                      setPratinjau(null);
                    }}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      seKabupaten ? "border-slate-900 bg-slate-900/[0.04]" : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-slate-800">Seluruh kabupaten</span>
                    <span className="block text-[11.5px] text-slate-500">
                      Semua desa & kelurahan (±416)
                    </span>
                  </button>
                </div>
              </div>

              {pratinjau && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(LABEL_STATUS).map(([kunci, label]) => {
                      const jumlah = pratinjau.ringkasan[kunci] || 0;
                      if (!jumlah) return null;
                      return (
                        <span
                          key={kunci}
                          className={`rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold ${KELAS_STATUS[kunci]}`}
                        >
                          {label}: {jumlah}
                        </span>
                      );
                    })}
                  </div>

                  <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200">
                    {pratinjau.kandidat.map((k) => (
                      <div
                        key={k.desa.id}
                        className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 px-3 py-2 last:border-b-0"
                      >
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-slate-700">
                            {k.desa.status_pemerintahan === "kelurahan" ? "Kel." : "Desa"} {k.desa.nama}
                            <span className="ml-1.5 text-[11.5px] font-normal text-slate-400">
                              Kec. {k.desa.kecamatan?.nama || "-"}
                            </span>
                          </p>
                          <p className="break-all font-mono text-[11.5px] text-slate-500">{k.email}</p>
                          {k.alasan && <p className="text-[11px] text-slate-400">{k.alasan}</p>}
                        </div>
                        <span
                          className={`shrink-0 rounded-lg border px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${KELAS_STATUS[k.status]}`}
                        >
                          {LABEL_STATUS[k.status]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div
          className="flex shrink-0 gap-3 border-t border-slate-100 bg-white px-5 py-3"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          {hasil ? (
            <button
              type="button"
              onClick={onTutup}
              className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Selesai
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onTutup}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Batal
              </button>
              {!pratinjau ? (
                <button
                  type="button"
                  onClick={ambilPratinjau}
                  disabled={memuat || !template.trim()}
                  className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                >
                  {memuat ? "Menyusun…" : "Lihat Pratinjau"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={jalankan}
                  disabled={menjalankan || !(pratinjau.ringkasan.baru > 0)}
                  className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                >
                  {menjalankan
                    ? progres
                      ? `Membuat akun… ${progres.dibuat}/${progres.target}`
                      : "Membuat akun…"
                    : pratinjau.ringkasan.baru > 0
                      ? `Buat ${pratinjau.ringkasan.baru} Akun`
                      : "Tidak ada yang perlu dibuat"}
                </button>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const ManajemenAkunDesaPage = ({ modul = null, tersemat = false }) => {
	/**
	 * Modul yang sedang dibuka — "bankeu", "bumdes", atau null untuk halaman penuh.
	 *
	 * Dibaca dari prop (saat disematkan di dalam tab halaman bidang) maupun dari
	 * query URL (saat dibuka sebagai halaman sendiri), supaya satu komponen ini
	 * tetap melayani PMD dan Pemdes yang tidak memakai modul sama sekali.
	 *
	 * Nilainya dikirim pada SETIAP permintaan, bukan hanya saat memuat katalog:
	 * server memakainya untuk mempersempit wewenang, jadi permintaan tanpa slug
	 * akan tersimpan dengan cakupan bidang penuh — akun yang dibuat dari tab
	 * Bankeu ikut membawa hak akses BUMDes.
	 */
	const [searchParams] = useSearchParams();
	const modulSlug = modul || searchParams.get("modul") || null;
	const paramModul = useMemo(() => (modulSlug ? { modul: modulSlug } : {}), [modulSlug]);

	const [meta, setMeta] = useState(null);
	// "desa" = akun operator desa; "kecamatan" = satu akun per kecamatan, lihat/reset sandi saja.
	const [tampilan, setTampilan] = useState("desa");
	const [modalGenerate, setModalGenerate] = useState(false);
	const [desas, setDesas] = useState([]);
	const [memuatAwal, setMemuatAwal] = useState(true);
	const [galatAwal, setGalatAwal] = useState(null);

	const [kecamatanId, setKecamatanId] = useState("");
	const [desaId, setDesaId] = useState("");
	const [cari, setCari] = useState("");

	const [akun, setAkun] = useState([]);
	const [memuatAkun, setMemuatAkun] = useState(false);
	const [saringStatus, setSaringStatus] = useState("semua");
	const [batasTampil, setBatasTampil] = useState(UKURAN_HALAMAN);

	const jumlahPerStatus = useMemo(() => {
		const hasil = {};
		SARING_STATUS.forEach((s) => {
			hasil[s.id] = akun.filter(s.cocok).length;
		});
		return hasil;
	}, [akun]);

	const akunTersaring = useMemo(() => {
		const aturan = SARING_STATUS.find((s) => s.id === saringStatus) || SARING_STATUS[0];
		return akun.filter(aturan.cocok);
	}, [akun, saringStatus]);

	// Ganti saringan → mulai lagi dari halaman pertama. Sengaja tidak ikut
	// `akun`: daftar dimuat ulang setiap kali satu akun diubah, dan staf yang
	// sedang di kartu ke-60 tidak boleh terlempar kembali ke atas.
	useEffect(() => {
		setBatasTampil(UKURAN_HALAMAN);
	}, [saringStatus, kecamatanId, desaId, cari]);

	// Kondisi desa terpilih: siapa yang sudah memegang fitur bidang ini.
	const [ringkasan, setRingkasan] = useState(null);
	const [memuatRingkasan, setMemuatRingkasan] = useState(false);

	const [modalTerbuka, setModalTerbuka] = useState(false);
	const [akunDiubah, setAkunDiubah] = useState(null); // null = mode tambah
	const [form, setForm] = useState(formKosong);
	const [tampilSandi, setTampilSandi] = useState(false);
	const [menyimpan, setMenyimpan] = useState(false);

	const katalog = meta?.catalog || [];
	const katalogKunci = useMemo(() => (meta?.catalog || []).map((p) => p.key), [meta]);
	const labelPermission = useMemo(() => {
		const peta = new Map();
		(meta?.catalog_lengkap || []).forEach((p) => peta.set(p.key, p.label));
		return peta;
	}, [meta]);

	// ── Muat data awal ────────────────────────────────────────────────────────
	useEffect(() => {
		let batal = false;

		(async () => {
			try {
				// Daftar desa dipakai bersama seluruh aplikasi (location.routes.js).
				// include_kelurahan wajib: kelurahan juga memakai halaman desa.
				const [metaRes, desaRes] = await Promise.all([
					api.get("/bidang/akun-desa/meta", { params: paramModul }),
					api.get("/desas", { params: { include_kelurahan: 1 } }),
				]);
				if (batal) return;
				setMeta(metaRes.data?.data || null);
				setDesas(desaRes.data?.data || []);
			} catch (error) {
				if (batal) return;
				setGalatAwal(pesanError(error, "Tidak dapat memuat data awal."));
			} finally {
				if (!batal) setMemuatAwal(false);
			}
		})();

		return () => {
			batal = true;
		};
	}, [paramModul]);

	const kecamatans = useMemo(() => {
		const peta = new Map();
		desas.forEach((d) => {
			if (d.kecamatans && !peta.has(String(d.kecamatan_id))) {
				peta.set(String(d.kecamatan_id), { id: String(d.kecamatan_id), nama: d.kecamatans.nama });
			}
		});
		return [...peta.values()].sort((a, b) => a.nama.localeCompare(b.nama));
	}, [desas]);

	const desaTerpilih = useMemo(
		() => desas.find((d) => String(d.id) === String(desaId)) || null,
		[desas, desaId],
	);

	const kecamatanTerpilih = useMemo(
		() => kecamatans.find((k) => String(k.id) === String(kecamatanId)) || null,
		[kecamatans, kecamatanId],
	);

	const desaSeKecamatan = useMemo(
		() => desas.filter((d) => String(d.kecamatan_id) === String(kecamatanId)),
		[desas, kecamatanId],
	);

	const adaPenyaring = Boolean(kecamatanId || desaId || cari.trim());

	// ── Muat akun ─────────────────────────────────────────────────────────────
	const muatAkun = useCallback(async () => {
		setMemuatAkun(true);
		try {
			const params = { ...paramModul };
			if (desaId) params.desa_id = desaId;
			else if (kecamatanId) params.kecamatan_id = kecamatanId;
			if (cari.trim()) params.q = cari.trim();

			const res = await api.get("/bidang/akun-desa/users", { params });
			setAkun(res.data?.data || []);
		} catch (error) {
			Swal.fire({
				icon: "error",
				title: "Gagal memuat akun",
				text: pesanError(error, "Terjadi kesalahan."),
			});
		} finally {
			setMemuatAkun(false);
		}
	}, [desaId, kecamatanId, cari, paramModul]);

	useEffect(() => {
		if (memuatAwal || galatAwal) return;
		// Tunda sebentar supaya mengetik di kotak cari tidak memicu request per huruf.
		const timer = setTimeout(muatAkun, cari ? 400 : 0);
		return () => clearTimeout(timer);
	}, [muatAkun, memuatAwal, galatAwal, cari]);

	/**
	 * Tarik kondisi desa terpilih.
	 *
	 * Inilah langkah "lihat dulu, baru buat": selama ini belum dijalankan,
	 * tombol Tambah Akun tidak boleh dipakai — kalau tidak, staf bisa membuat
	 * operator kedua untuk desa yang sebenarnya sudah punya.
	 */
	const muatRingkasan = useCallback(async () => {
		if (!desaId) {
			setRingkasan(null);
			return;
		}
		setMemuatRingkasan(true);
		try {
			const res = await api.get(`/bidang/akun-desa/desa/${desaId}/ringkasan`, {
				params: paramModul,
			});
			setRingkasan(res.data?.data || null);
		} catch (error) {
			setRingkasan(null);
			Swal.fire({
				icon: "error",
				title: "Gagal memeriksa desa",
				text: pesanError(error, "Tidak dapat memastikan apakah desa ini sudah punya operator."),
			});
		} finally {
			setMemuatRingkasan(false);
		}
	}, [desaId, paramModul]);

	useEffect(() => {
		if (memuatAwal || galatAwal) return;
		muatRingkasan();
	}, [muatRingkasan, memuatAwal, galatAwal]);

	/**
	 * Ekspor akun operator fitur ini ke Excel, untuk dibagikan ke penanggung
	 * jawab di desa. Sandi HANYA terisi untuk akun yang masih memakai sandi
	 * default (diperiksa server dengan bcrypt); akun yang sandinya sudah diganti
	 * pemiliknya ditandai "sudah diganti" tanpa sandi.
	 */
	const [mengekspor, setMengekspor] = useState(false);
	const eksporAkun = async () => {
		const cakupan = kecamatanTerpilih ? `Kec. ${kecamatanTerpilih.nama}` : "seluruh kabupaten";
		const ok = await Swal.fire({
			icon: "question",
			title: "Ekspor akun operator?",
			html:
				`<div style="text-align:left;font-size:14px">` +
				`<p style="margin:0 0 8px">Cakupan: <b>${escapeHtml(cakupan)}</b>.</p>` +
				`<p style="margin:0 0 6px">Berkas memuat <b>sandi</b> akun yang <b>masih memakai sandi default</b>. Akun yang sandinya sudah diganti tidak ikut sandinya.</p>` +
				`<p style="margin:0;color:#b45309;font-size:12.5px">Bagikan hanya ke penanggung jawab BUMDes/desa yang bersangkutan.</p>` +
				`</div>`,
			showCancelButton: true,
			confirmButtonText: "Ekspor Excel",
			cancelButtonText: "Batal",
			confirmButtonColor: "#0f172a",
		});
		if (!ok.isConfirmed) return;

		setMengekspor(true);
		try {
			const params = { ...paramModul };
			if (kecamatanId) params.kecamatan_id = kecamatanId;
			const res = await api.get("/bidang/akun-desa/ekspor", { params, timeout: 120000 });
			const baris = res.data?.data || [];
			if (baris.length === 0) {
				toast.error("Belum ada akun operator untuk diekspor");
				return;
			}
			const XLSX = await import("xlsx");
			const lembar = XLSX.utils.json_to_sheet(baris.map((b, i) => ({
				No: i + 1,
				Kecamatan: b.kecamatan,
				"Desa/Kelurahan": b.desa,
				"Nama Petugas": b.nama,
				Jabatan: b.jabatan,
				"No. HP": b.no_hp,
				"Email / Username": b.email,
				Sandi: b.sandi_default ? b.sandi : "— sudah diganti pemilik",
				"Status Sandi": b.sandi_default ? "Masih default (wajib diganti saat login)" : "Sudah diganti",
				"Status Akun": b.aktif ? "Aktif" : "Nonaktif",
				"Terakhir Aktif": b.terakhir_aktif ? new Date(b.terakhir_aktif).toLocaleString("id-ID") : "Belum pernah",
			})));
			lembar["!cols"] = [5, 20, 22, 28, 24, 16, 42, 24, 36, 12, 20].map((wch) => ({ wch }));
			const buku = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(buku, lembar, "Akun Operator");
			const slug = meta?.modul?.slug || modulSlug || "desa";
			const wilayah = kecamatanTerpilih ? `-${kecamatanTerpilih.nama.toLowerCase().replace(/\s+/g, "-")}` : "";
			XLSX.writeFile(buku, `akun-operator-${slug}${wilayah}-${new Date().toISOString().slice(0, 10)}.xlsx`);

			const r = res.data?.ringkasan || {};
			toast.success(`${baris.length} akun diekspor · ${r.sandi_default ?? 0} masih sandi default`);
		} catch (error) {
			Swal.fire({ icon: "error", title: "Gagal mengekspor", text: pesanError(error, "Terjadi kesalahan.") });
		} finally {
			setMengekspor(false);
		}
	};

	// ── Aksi ──────────────────────────────────────────────────────────────────
	const bukaTambah = async () => {
		if (!desaId) {
			Swal.fire({
				icon: "info",
				title: "Pilih desa dulu",
				text: "Akun operator selalu melekat pada satu desa, jadi desanya harus ditentukan lebih dulu.",
			});
			return;
		}

		// Kondisi desa belum selesai ditarik — jangan biarkan form terbuka, karena
		// justru pemeriksaan inilah yang mencegah akun ganda.
		if (memuatRingkasan || !ringkasan) {
			Swal.fire({
				icon: "info",
				title: "Sedang memeriksa desa ini",
				text: "Tunggu sebentar sampai daftar operator yang sudah ada selesai dimuat.",
			});
			return;
		}

		// Sudah ada operator aktif: tahan di sini, tawarkan mengubah yang ada.
		// Penjaga sebenarnya tetap di server (409) — ini supaya staf tidak perlu
		// mengisi form panjang lebih dulu untuk kemudian ditolak.
		const aktifSudahPegang = ringkasan.sudah_pegang.filter((u) => u.is_active);
		if (aktifSudahPegang.length > 0) {
			const lanjut = await Swal.fire({
				icon: "warning",
				title: "Desa ini sudah punya operator",
				html:
					`<div style="text-align:left;font-size:14px">` +
					aktifSudahPegang
						.map((u) => `<p style="margin:0 0 4px"><b>${escapeHtml(u.name)}</b> — ${escapeHtml(u.email)}</p>`)
						.join("") +
					`<p style="margin:10px 0 0;color:#64748b;font-size:12.5px">Sebaiknya ubah akun yang ada daripada menambah akun kedua untuk pekerjaan yang sama.</p>` +
					`</div>`,
				showCancelButton: true,
				confirmButtonText: "Tetap buat baru",
				cancelButtonText: "Batal",
				confirmButtonColor: "#b45309",
			});
			if (!lanjut.isConfirmed) return;
		}

		setAkunDiubah(null);
		// Seluruh fitur bidang dicentang sejak awal: itu memang alasan staf
		// membuat akun ini. Mengosongkannya hanya menambah satu langkah wajib.
		setForm({ ...formKosong, password: buatSandi(), permissions: katalog.map((p) => p.key) });
		setTampilSandi(true);
		setModalTerbuka(true);
	};

	/**
	 * Tambahkan fitur bidang ini ke akun desa yang SUDAH ADA.
	 *
	 * Ini jalan yang benar ketika desa sudah menunjuk petugas tapi belum diberi
	 * akses kelembagaan: satu orang, satu akun, satu sandi yang sudah ia hafal —
	 * bukan akun kedua yang harus ia ingat terpisah.
	 */
	const beriAkses = async (user) => {
		const fitur = (ringkasan?.fitur_inti || []).map((k) => labelPermission.get(k) || k);
		const konfirmasi = await Swal.fire({
			icon: "question",
			title: "Beri akses ke akun ini?",
			html:
				`<div style="text-align:left;font-size:14px">` +
				`<p style="margin:0 0 8px"><b>${escapeHtml(user.name)}</b><br/>${escapeHtml(user.email)}</p>` +
				`<p style="margin:0">Akan mendapat tambahan akses: <b>${escapeHtml(fitur.join(", "))}</b>.</p>` +
				`<p style="margin:8px 0 0;color:#64748b;font-size:12.5px">Akses lamanya tidak berubah, dan tidak ada akun baru yang dibuat.</p>` +
				`</div>`,
			showCancelButton: true,
			confirmButtonText: "Ya, beri akses",
			cancelButtonText: "Batal",
			confirmButtonColor: "#0f172a",
		});
		if (!konfirmasi.isConfirmed) return;

		try {
			await api.put(`/bidang/akun-desa/users/${user.id}/permissions`, {
				...paramModul,
				// Kirim hak akses yang sudah ia punya dari bidang ini DITAMBAH fitur
				// intinya. Yang di luar wewenang bidang tidak perlu ikut — server
				// mempertahankannya sendiri lewat mergePermissions().
				permissions: [
					...new Set([...(user.permissions_dikelola || []), ...(ringkasan?.fitur_inti || [])]),
				],
			});
			await Promise.all([muatAkun(), muatRingkasan()]);
			Swal.fire({
				icon: "success",
				title: "Akses ditambahkan",
				timer: 1600,
				showConfirmButton: false,
			});
		} catch (error) {
			Swal.fire({
				icon: "error",
				title: "Gagal memberi akses",
				text: pesanError(error, "Terjadi kesalahan."),
			});
		}
	};

	const bukaUbah = (user) => {
		setAkunDiubah(user);
		setForm({
			name: user.name || "",
			email: user.email || "",
			password: "",
			jabatan_desa: user.jabatan_desa || "",
			no_hp: user.no_hp || "",
			is_active: user.is_active !== false,
			permissions: [...(user.permissions_dikelola || [])],
		});
		setTampilSandi(false);
		setModalTerbuka(true);
	};

	const togglePermission = (key) =>
		setForm((prev) => ({
			...prev,
			permissions: prev.permissions.includes(key)
				? prev.permissions.filter((k) => k !== key)
				: [...prev.permissions, key],
		}));

	const simpan = async (e, tetapBuat = false) => {
		if (e?.preventDefault) e.preventDefault();
		if (menyimpan) return;

		if (!form.name.trim()) return Swal.fire({ icon: "error", title: "Nama wajib diisi" });
		if (!form.email.trim()) return Swal.fire({ icon: "error", title: "Email wajib diisi" });
		if (!akunDiubah && form.password.length < 6)
			return Swal.fire({ icon: "error", title: "Password minimal 6 karakter" });
		if (akunDiubah && form.password && form.password.length < 6)
			return Swal.fire({ icon: "error", title: "Password baru minimal 6 karakter" });
		if (!akunDiubah && form.permissions.length === 0)
			return Swal.fire({ icon: "error", title: "Pilih minimal satu hak akses" });

		setMenyimpan(true);
		try {
			const payload = {
				...paramModul,
				name: form.name.trim(),
				email: form.email.trim(),
				jabatan_desa: form.jabatan_desa.trim(),
				no_hp: form.no_hp.trim(),
				is_active: form.is_active,
				permissions: form.permissions,
			};
			if (form.password) payload.password = form.password;

			if (akunDiubah) {
				await api.put(`/bidang/akun-desa/users/${akunDiubah.id}`, payload);
			} else {
				await api.post("/bidang/akun-desa/users", {
					...payload,
					desa_id: desaId,
					tetap_buat: tetapBuat,
				});
			}

			setModalTerbuka(false);
			await Promise.all([muatAkun(), muatRingkasan()]);

			// Sandi hanya bisa dibacakan sekali di sini; setelah ini tidak
			// ditampilkan lagi di mana pun, jadi tampilkan dengan jelas.
			if (!akunDiubah) {
				Swal.fire({
					icon: "success",
					title: "Akun dibuat",
					html:
						`<div style="text-align:left;font-size:14px">` +
						`<p style="margin:0 0 8px">Sampaikan ke petugas desa:</p>` +
						`<div style="background:#f1f5f9;border-radius:10px;padding:10px 12px;font-family:monospace">` +
						`<div><b>Email</b>: ${escapeHtml(payload.email)}</div>` +
						`<div><b>Sandi</b>: ${escapeHtml(form.password)}</div>` +
						`</div></div>`,
				});
			} else {
				Swal.fire({
					icon: "success",
					title: "Akun diperbarui",
					timer: 1500,
					showConfirmButton: false,
				});
			}
		} catch (error) {
			// Server menolak karena desa ini sudah punya operator aktif untuk
			// fitur yang sama. Tawarkan jalan keluarnya, jangan sekadar melarang.
			if (error?.response?.status === 409 && error.response.data?.code === "AKUN_FITUR_SUDAH_ADA") {
				const sudahAda = error.response.data?.data?.akun_sudah_ada || [];
				const daftar = sudahAda.map((u) => `<li><b>${escapeHtml(u.name)}</b> — ${escapeHtml(u.email)}</li>`).join("");

				const pilihan = await Swal.fire({
					icon: "warning",
					title: "Desa ini sudah punya operator",
					html:
						`<div style="text-align:left;font-size:14px">` +
						`<p style="margin:0 0 8px">Akun yang sudah memegang fitur ini:</p>` +
						`<ul style="margin:0 0 10px;padding-left:18px">${daftar}</ul>` +
						`<p style="margin:0;color:#64748b;font-size:12.5px">Membuat akun baru berarti desa ini punya dua akun untuk pekerjaan yang sama.</p>` +
						`</div>`,
					showCancelButton: true,
					showDenyButton: true,
					confirmButtonText: "Batal, pakai yang ada",
					denyButtonText: "Tetap buat baru",
					cancelButtonText: "Kembali ke form",
					confirmButtonColor: "#0f172a",
					denyButtonColor: "#b45309",
				});

				if (pilihan.isConfirmed) {
					setModalTerbuka(false);
					await Promise.all([muatAkun(), muatRingkasan()]);
				} else if (pilihan.isDenied) {
					setMenyimpan(false);
					return simpan(null, true);
				}
			} else {
				Swal.fire({
					icon: "error",
					title: "Gagal menyimpan",
					text: pesanError(error, "Terjadi kesalahan saat menyimpan akun."),
				});
			}
		} finally {
			setMenyimpan(false);
		}
	};

	const ubahStatus = async (user) => {
		const jadiAktif = !user.is_active;
		const konfirmasi = await Swal.fire({
			icon: "warning",
			title: jadiAktif ? "Aktifkan akun ini?" : "Nonaktifkan akun ini?",
			html: `<b>${escapeHtml(user.name)}</b><br/><span style="font-size:13px">${escapeHtml(user.email)}</span>`,
			showCancelButton: true,
			confirmButtonText: jadiAktif ? "Ya, aktifkan" : "Ya, nonaktifkan",
			cancelButtonText: "Batal",
			confirmButtonColor: jadiAktif ? "#059669" : "#dc2626",
		});
		if (!konfirmasi.isConfirmed) return;

		try {
			await api.patch(`/bidang/akun-desa/users/${user.id}/status`, {
				...paramModul,
				is_active: jadiAktif,
			});
			await muatAkun();
		} catch (error) {
			Swal.fire({
				icon: "error",
				title: "Gagal mengubah status",
				text: pesanError(error, "Terjadi kesalahan."),
			});
		}
	};

	const bersihkanPenyaring = () => {
		setKecamatanId("");
		setDesaId("");
		setCari("");
		setSaringStatus("semua");
	};

	// Langkah alur "pilih desa dulu, baru kelola akunnya", untuk penunjuk di
	// bawah bilah kendali.
	const LANGKAH = [
		{ judul: "Pilih kecamatan", selesai: Boolean(kecamatanId) },
		{ judul: "Pilih desa", selesai: Boolean(desaId) },
		{ judul: "Periksa & kelola akun", selesai: Boolean(desaId && ringkasan) },
	];
	const langkahAktif = LANGKAH.findIndex((l) => !l.selesai);

	// ── Render ────────────────────────────────────────────────────────────────
	if (memuatAwal) {
		return (
			<div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
				<div className="h-32 animate-pulse rounded-3xl bg-slate-200" />
				<div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
				<div className="grid gap-3 xl:grid-cols-2">
					<KerangkaKartu />
					<KerangkaKartu />
					<KerangkaKartu />
					<KerangkaKartu />
				</div>
			</div>
		);
	}

	if (galatAwal) return <KotakGalat pesan={galatAwal} />;

	return (
		<MotionConfig reducedMotion="user">
		{/* Saat disematkan di dalam tab halaman bidang, lebar dan jarak tepi sudah
		    diatur halaman induknya — menambahkannya lagi membuat konten menyempit
		    dua kali. */}
		<div
			className={
				tersemat
					? "w-full space-y-4 p-4 sm:p-5"
					: "mx-auto w-full max-w-6xl space-y-4 px-4 py-5 sm:px-6 sm:py-6 lg:px-8"
			}
		>
			{/* ── Kepala halaman ──────────────────────────────────────────────── */}
			<motion.header
				initial={{ opacity: 0, y: -12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={PEGAS}
				className="relative overflow-hidden rounded-3xl bg-slate-950 px-5 py-5 text-white shadow-xl sm:px-7 sm:py-6"
			>
				{/* Cahaya latar yang melayang pelan — cukup lambat untuk tidak
				    mengganggu membaca, cukup hidup untuk tidak terasa statis. */}
				<motion.span
					aria-hidden
					animate={{ x: [0, -40, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
					transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
					className="pointer-events-none absolute -right-16 -top-28 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl"
				/>
				<motion.span
					aria-hidden
					animate={{ x: [0, 50, 0], y: [0, -20, 0], scale: [1, 1.2, 1] }}
					transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
					className="pointer-events-none absolute -bottom-32 -left-20 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl"
				/>
				<motion.span
					aria-hidden
					animate={{ opacity: [0.15, 0.35, 0.15] }}
					transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
					className="pointer-events-none absolute left-1/3 top-0 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl"
				/>
				{/* Kisi titik halus sebagai tekstur. */}
				<span
					aria-hidden
					className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:18px_18px]"
				/>

				<div className="relative flex flex-wrap items-start justify-between gap-4">
					<div className="flex min-w-0 items-start gap-3.5">
						<motion.span
							initial={{ scale: 0, rotate: -45 }}
							animate={{ scale: 1, rotate: 0 }}
							transition={{ ...PEGAS, delay: 0.1 }}
							className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 to-sky-500 shadow-lg shadow-indigo-500/30 sm:flex"
						>
							<FiUsers className="h-6 w-6" />
						</motion.span>
						<div className="min-w-0">
						<h1 className="text-xl font-bold tracking-tight sm:text-2xl">
							{meta?.modul ? `Akun Operator ${meta.modul.label}` : "Akun Operator Desa"}
						</h1>
						<p className="mt-1 text-[13px] text-slate-400">
							{meta?.modul
								? `Petugas desa yang mengurus ${meta.modul.label}${meta?.bidang?.nama ? ` — ${meta.bidang.nama}` : ""}`
								: meta?.bidang?.nama
									? `Dibuat atas nama ${meta.bidang.nama}`
									: "Buatkan akun petugas desa untuk fitur bidang Anda"}
						</p>
						</div>
					</div>
					<motion.div
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ ...PEGAS, delay: 0.15 }}
						className="shrink-0 rounded-2xl bg-white/[0.07] px-4 py-2.5 text-center ring-1 ring-inset ring-white/10 backdrop-blur-sm"
					>
						<div className="text-2xl font-bold leading-none">
							<AngkaBergerak nilai={meta?.total_akun_dikelola ?? 0} />
						</div>
						<div className="mt-1 text-[10.5px] font-medium uppercase tracking-wider text-slate-400">
							Akun dikelola
						</div>
					</motion.div>
				</div>

				<div className="relative mt-5 border-t border-white/10 pt-4">
					<span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-500">
						<FiShield className="h-3.5 w-3.5" />
						Fitur yang bisa Anda berikan
					</span>
					<div className="mt-2.5 flex flex-wrap gap-1.5">
						{katalog.map((p, i) => (
							<motion.span
								key={p.key}
								title={p.description}
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								whileHover={{ y: -2, backgroundColor: "rgba(255,255,255,0.16)" }}
								transition={{ ...PEGAS, delay: 0.2 + i * 0.05 }}
								className="cursor-default rounded-lg bg-white/[0.08] px-2.5 py-1 text-[11.5px] font-semibold text-slate-100 ring-1 ring-inset ring-white/10"
							>
								{p.label}
							</motion.span>
						))}
					</div>
				</div>
			</motion.header>

			{/* ── Akun desa / akun kecamatan ──────────────────────────────────── */}
			<div role="tablist" aria-label="Jenis akun" className="inline-flex rounded-xl bg-slate-100 p-1">
				{[
					{ id: "desa", label: "Akun Desa", icon: FiUsers },
					{ id: "kecamatan", label: "Akun Kecamatan", icon: FiMapPin },
				].map((t) => {
					const aktif = tampilan === t.id;
					const Ikon = t.icon;
					return (
						<button
							key={t.id}
							type="button"
							role="tab"
							aria-selected={aktif}
							onClick={() => setTampilan(t.id)}
							className={`relative inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors ${
								aktif ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
							}`}
						>
							{aktif && (
								<motion.span
									layoutId="sorot-jenis-akun"
									transition={PEGAS}
									className="absolute inset-0 rounded-lg bg-white shadow-sm"
								/>
							)}
							<Ikon className="relative h-4 w-4" />
							<span className="relative">{t.label}</span>
						</button>
					);
				})}
			</div>

			{tampilan === "kecamatan" ? (
				<AkunKecamatanPanel params={paramModul} />
			) : (
			<>
			{/* ── Bilah kendali ───────────────────────────────────────────────────
			    Pemilih wilayah, pencarian, dan tombol tambah disatukan dalam satu
			    bilah. Sebelumnya ketiganya jadi tiga blok bertumpuk, sehingga daftar
			    akun baru mulai jauh di bawah lipatan layar. Lengket di atas supaya
			    penyaring tetap terjangkau saat menelusuri ratusan akun. */}
			{/* Saat disematkan, "lengket" dimatikan: induknya punya overflow-hidden
			    sehingga position:sticky tidak pernah menempel ke layar, dan yang
			    tersisa hanya bilah yang ikut tergulung dengan z-index tinggi. */}
			<div
				className={`${
					tersemat ? "" : "sticky top-0 z-30 "
				}-mx-4 border-y border-slate-200 bg-white/85 px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-2xl sm:border sm:px-4 sm:shadow-sm`}
			>
				{/* Bertumpuk sampai xl: dengan Ekspor + Generate + Tambah, bilah
				    kanan butuh ±30rem — di layar lg pemilih wilayah jadi gepeng. */}
				<div className="flex flex-col gap-2.5 xl:flex-row xl:items-center">
					<div className="grid min-w-0 flex-1 gap-2.5 sm:grid-cols-2">
						<label className="relative block">
							<span className="sr-only">Kecamatan</span>
							<FiMapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
							<select
								value={kecamatanId}
								onChange={(e) => {
									setKecamatanId(e.target.value);
									setDesaId("");
								}}
								className={`${KELAS_INPUT} cursor-pointer appearance-none pl-9 pr-8 font-medium`}
							>
								<option value="">Semua kecamatan</option>
								{kecamatans.map((k) => (
									<option key={k.id} value={k.id}>
										{k.nama}
									</option>
								))}
							</select>
							<FiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
						</label>

						<label className="relative block">
							<span className="sr-only">Desa atau kelurahan</span>
							<select
								value={desaId}
								onChange={(e) => setDesaId(e.target.value)}
								disabled={!kecamatanId}
								className={`${KELAS_INPUT} cursor-pointer appearance-none pr-8 font-medium disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
							>
								<option value="">
									{kecamatanId ? "Semua desa di kecamatan ini" : "Pilih kecamatan dulu"}
								</option>
								{desaSeKecamatan.map((d) => (
									<option key={d.id} value={d.id}>
										{sebutanDesa(d)}
									</option>
								))}
							</select>
							<FiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
						</label>
					</div>

					{/* Lebar mengikuti isi, bukan dipatok: jumlah tombolnya berbeda
					    antara halaman penuh (1) dan halaman modul (3). */}
					<div className="flex flex-wrap gap-2.5 sm:flex-nowrap xl:shrink-0">
						<div className="relative min-w-[12rem] flex-1 xl:w-64 xl:flex-none">
							<FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
							<input
								type="text"
								value={cari}
								onChange={(e) => setCari(e.target.value)}
								placeholder="Cari nama, email, atau desa…"
								className={`${KELAS_INPUT} pl-9 ${cari ? "pr-9" : ""}`}
							/>
							{cari && (
								<button
									type="button"
									onClick={() => setCari("")}
									aria-label="Hapus pencarian"
									className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
								>
									<FiX className="h-3.5 w-3.5" />
								</button>
							)}
						</div>
						{/* Generate massal hanya untuk halaman yang terikat satu fitur: tanpa
						    modul, "sudah punya operator" tidak punya arti tunggal dan akun
						    yang lahir akan membawa seluruh wewenang bidang sekaligus. */}
						{modulSlug && (
							<motion.button
								whileHover={{ y: -1 }}
								whileTap={{ scale: 0.96 }}
								onClick={eksporAkun}
								disabled={mengekspor}
								title="Ekspor akun operator ke Excel (sandi hanya untuk yang masih default)"
								className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-900/10 bg-slate-100 px-3.5 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-200 disabled:opacity-60"
							>
								<FiDownload className={`h-4 w-4 ${mengekspor ? "animate-bounce" : ""}`} />
								<span className="hidden sm:inline">{mengekspor ? "Mengekspor…" : "Ekspor"}</span>
							</motion.button>
						)}
						{modulSlug && (
							<motion.button
								whileHover={{ y: -1 }}
								whileTap={{ scale: 0.96 }}
								onClick={() => setModalGenerate(true)}
								title="Buatkan akun operator untuk semua desa"
								className="group/gen inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2.5 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
							>
								<FiZap className="h-4 w-4 transition-transform group-hover/gen:rotate-12 group-hover/gen:scale-125" />
								<span className="hidden sm:inline">Generate</span>
							</motion.button>
						)}
						<motion.button
							whileHover={{ y: -1, boxShadow: "0 10px 24px -8px rgba(15,23,42,0.45)" }}
							whileTap={{ scale: 0.96 }}
							onClick={bukaTambah}
							className="group/tambah relative inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
						>
							<span
								aria-hidden
								className="pointer-events-none absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-white/20 transition-all duration-700 group-hover/tambah:left-[150%]"
							/>
							<FiPlus className="relative h-4 w-4 transition-transform duration-300 group-hover/tambah:rotate-90" />
							<span className="relative">Tambah Akun</span>
						</motion.button>
					</div>
				</div>

				{/* Penyaring aktif dirangkum jadi satu baris: tanpa ini, jumlah yang
				    tampil di daftar mudah disalahartikan sebagai jumlah se-kabupaten. */}
				<AnimatePresence initial={false}>
					{adaPenyaring && (
						<motion.div {...LIPATAN} className="overflow-hidden">
							<div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-slate-100 pt-2.5 text-[11.5px]">
								<FiFilter className="h-3 w-3 text-slate-400" />
								<AnimatePresence initial={false}>
									{[
										kecamatanTerpilih && { k: "kec", teks: `Kec. ${kecamatanTerpilih.nama}`, hapus: () => { setKecamatanId(""); setDesaId(""); } },
										desaTerpilih && { k: "desa", teks: sebutanDesa(desaTerpilih), hapus: () => setDesaId("") },
										cari.trim() && { k: "cari", teks: `“${cari.trim()}”`, hapus: () => setCari("") },
									]
										.filter(Boolean)
										.map((c) => (
											<motion.span
												key={c.k}
												layout
												initial={{ opacity: 0, scale: 0.8 }}
												animate={{ opacity: 1, scale: 1 }}
												exit={{ opacity: 0, scale: 0.8 }}
												transition={PEGAS}
												className="inline-flex items-center gap-1 rounded-md bg-slate-100 py-0.5 pl-2 pr-1 font-semibold text-slate-600"
											>
												{c.teks}
												<button
													type="button"
													onClick={c.hapus}
													aria-label={`Hapus penyaring ${c.teks}`}
													className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
												>
													<FiX className="h-3 w-3" />
												</button>
											</motion.span>
										))}
								</AnimatePresence>
								<button
									onClick={bersihkanPenyaring}
									className="ml-auto font-semibold text-slate-400 underline-offset-2 hover:text-slate-700 hover:underline"
								>
									Bersihkan
								</button>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{/* ── Penunjuk langkah ────────────────────────────────────────────────
			    Alur halaman ini bertahap, tapi sebelumnya tahapnya hanya tersirat
			    dari select yang dinonaktifkan. Hilang begitu desa dipilih: panel
			    kondisi desa di bawah mengambil alih perannya. */}
			<AnimatePresence initial={false}>
				{!desaTerpilih && (
					<motion.div {...LIPATAN} className="overflow-hidden">
						<ol className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
							{LANGKAH.map((l, i) => {
								const aktif = i === langkahAktif;
								return (
									<li
										key={l.judul}
										className={`relative flex items-center gap-2 overflow-hidden rounded-xl px-2.5 py-2 transition-colors sm:px-3 ${
											aktif ? "text-slate-900" : l.selesai ? "text-emerald-700" : "text-slate-400"
										}`}
									>
										{aktif && (
											<motion.span
												layoutId="sorot-langkah-akun"
												transition={PEGAS}
												className="absolute inset-0 rounded-xl bg-slate-100"
											/>
										)}
										<motion.span
											animate={aktif ? { scale: [1, 1.12, 1] } : { scale: 1 }}
											transition={aktif ? { repeat: Infinity, duration: 1.8 } : PEGAS}
											className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
												l.selesai
													? "bg-emerald-500 text-white"
													: aktif
														? "bg-slate-900 text-white"
														: "bg-slate-100 text-slate-400"
											}`}
										>
											{l.selesai ? <FiCheck className="h-3.5 w-3.5" /> : i + 1}
										</motion.span>
										<span className="relative truncate text-[12px] font-semibold sm:text-[13px]">{l.judul}</span>
									</li>
								);
							})}
						</ol>
					</motion.div>
				)}
			</AnimatePresence>

			{/* ── Kondisi desa terpilih ───────────────────────────────────────────
			    Ditarik sebelum akun boleh dibuat; inilah yang mencegah akun ganda. */}
			<AnimatePresence mode="wait" initial={false}>
			{desaTerpilih && (
				<motion.section
					key={desaTerpilih.id}
					initial={{ opacity: 0, y: 12, scale: 0.99 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
					transition={PEGAS}
					className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
				>
					{memuatRingkasan ? (
						<div className="flex items-center gap-3 px-4 py-4 text-sm text-slate-500">
							<motion.span
								animate={{ rotate: 360 }}
								transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
								className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-200 border-t-slate-700"
							/>
							Memeriksa akun yang sudah ada di {sebutanDesa(desaTerpilih)}…
						</div>
					) : !ringkasan ? (
						<p className="px-4 py-4 text-sm text-slate-500">
							Kondisi desa ini belum bisa dipastikan.
						</p>
					) : (
						<>
							{ringkasan.sudah_pegang.length > 0 ? (
								<div className="flex items-start gap-2.5 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50/40 px-4 py-3">
									<motion.span
										initial={{ scale: 0, rotate: -90 }}
										animate={{ scale: 1, rotate: 0 }}
										transition={{ ...PEGAS, delay: 0.1 }}
										className="mt-0.5 shrink-0"
									>
										<FiUserCheck className="h-4 w-4 text-emerald-600" />
									</motion.span>
									<div className="min-w-0">
										<p className="text-[13.5px] font-bold text-emerald-900">
											{sebutanDesa(desaTerpilih)} sudah punya operator untuk fitur ini
										</p>
										<p className="mt-0.5 text-[12px] text-emerald-800">
											Tidak perlu membuat akun baru — ubah akun yang ada bila perlu.
										</p>
									</div>
								</div>
							) : (
								<div className="flex items-start gap-2.5 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50/40 px-4 py-3">
									<motion.span
										animate={{ rotate: [0, -10, 10, -6, 0] }}
										transition={{ duration: 0.7, delay: 0.2 }}
										className="mt-0.5 shrink-0"
									>
										<FiAlertCircle className="h-4 w-4 text-amber-600" />
									</motion.span>
									<div className="min-w-0">
										<p className="text-[13.5px] font-bold text-amber-900">
											{sebutanDesa(desaTerpilih)} belum punya operator untuk fitur ini
										</p>
										<p className="mt-0.5 text-[12px] text-amber-800">
											{ringkasan.bisa_diberi.length > 0
												? "Beri akses ke akun yang sudah ada di bawah, atau buat akun baru."
												: "Silakan buat akun operator untuk desa ini."}
										</p>
									</div>
								</div>
							)}

							<div className="space-y-4 px-4 py-3.5">
								{ringkasan.sudah_pegang.length > 0 && (
									<div>
										<p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-slate-400">
											Sudah memegang fitur bidang ini
										</p>
										<div className="space-y-2">
											{ringkasan.sudah_pegang.map((u) => (
												<BarisAkunRingkas
													key={u.id}
													user={u}
													aksi={
														<button
															onClick={() => bukaUbah(u)}
															className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
														>
															Ubah
														</button>
													}
												/>
											))}
										</div>
									</div>
								)}

								{/* Akun desa yang sudah ada tapi belum punya fitur bidang ini.
								    Memberi akses ke sini selalu lebih baik daripada akun baru:
								    satu orang, satu sandi yang sudah ia hafal. */}
								{ringkasan.bisa_diberi.length > 0 && (
									<div>
										<p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-slate-400">
											Akun desa yang sudah ada — bisa langsung diberi akses
										</p>
										<div className="space-y-2">
											{ringkasan.bisa_diberi.map((u) => (
												<BarisAkunRingkas
													key={u.id}
													user={u}
													aksi={
														<button
															onClick={() => beriAkses(u)}
															className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-slate-800"
														>
															<FiPlus className="h-3.5 w-3.5" />
															Beri akses
														</button>
													}
												/>
											))}
										</div>
									</div>
								)}

								{/* Siapa yang berwenang di desa ini — supaya staf bisa
								    menghubunginya alih-alih diam-diam mengambil alih. */}
								{ringkasan.admin_desa.length > 0 && (
									<p className="text-[12px] text-slate-500">
										<span className="font-semibold text-slate-600">Admin Desa:</span>{" "}
										{ringkasan.admin_desa
											.map((a) => `${a.name}${a.no_hp ? ` (${a.no_hp})` : ""}`)
											.join(", ")}
									</p>
								)}
							</div>
						</>
					)}
				</motion.section>
			)}
			</AnimatePresence>

			{/* ── Daftar akun ─────────────────────────────────────────────────── */}
			{!memuatAkun && akun.length > 0 && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="flex flex-col gap-2.5 px-1 sm:flex-row sm:items-center sm:justify-between"
				>
					<h2 className="text-[13px] font-bold text-slate-700">
						<AngkaBergerak nilai={akunTersaring.length} />
						{saringStatus !== "semua" ? ` dari ${akun.length.toLocaleString("id-ID")}` : ""} akun
						{desaTerpilih
							? ` di ${sebutanDesa(desaTerpilih)}`
							: kecamatanTerpilih
								? ` di Kec. ${kecamatanTerpilih.nama}`
								: ""}
					</h2>

					{/* Saring cepat bergaya segmen. Pilihan berangka nol disembunyikan
					    (kecuali "Semua" dan yang sedang dipilih) supaya bilahnya hanya
					    menawarkan pertanyaan yang ada jawabannya. */}
					<div className="-mx-1 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 [scrollbar-width:none]">
						{SARING_STATUS.filter(
							(s) => s.id === "semua" || s.id === saringStatus || jumlahPerStatus[s.id] > 0,
						).map((s) => {
							const dipilih = saringStatus === s.id;
							return (
								<button
									key={s.id}
									type="button"
									onClick={() => setSaringStatus(s.id)}
									className={`relative shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
										dipilih ? "text-slate-900" : "text-slate-500 hover:text-slate-800"
									}`}
								>
									{dipilih && (
										<motion.span
											layoutId="sorot-saring-akun"
											transition={PEGAS}
											className="absolute inset-0 rounded-lg bg-white shadow-sm ring-1 ring-slate-900/5"
										/>
									)}
									<span className="relative">
										{s.label}
										<span
											className={`ml-1.5 rounded-md px-1.5 py-px text-[10.5px] tabular-nums ${
												dipilih ? "bg-slate-900 text-white" : "bg-white/70 text-slate-500"
											}`}
										>
											{jumlahPerStatus[s.id] ?? 0}
										</span>
									</span>
								</button>
							);
						})}
					</div>
				</motion.div>
			)}

			{memuatAkun ? (
				<div className="grid gap-3 xl:grid-cols-2">
					<KerangkaKartu />
					<KerangkaKartu />
					<KerangkaKartu />
					<KerangkaKartu />
				</div>
			) : akunTersaring.length === 0 ? (
				<motion.div
					initial={{ opacity: 0, scale: 0.98 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={PEGAS}
					className="relative overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-gradient-to-b from-white to-slate-50 px-6 py-12 text-center"
				>
					<motion.span
						animate={{ y: [0, -6, 0] }}
						transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
						className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-slate-200"
					>
						<span className="absolute inset-0 animate-ping rounded-2xl bg-slate-200/50 [animation-duration:2.5s]" />
						<FiUsers className="relative h-6 w-6 text-slate-400" />
					</motion.span>
					<p className="mt-4 font-semibold text-slate-700">
						{akun.length > 0
							? "Tidak ada akun yang cocok dengan saringan ini"
							: desaTerpilih
								? `Belum ada akun di ${sebutanDesa(desaTerpilih)}`
								: "Belum ada akun"}
					</p>
					<p className="mx-auto mt-1 max-w-sm text-[13px] text-slate-500">
						{akun.length > 0
							? "Pilih saringan lain di atas daftar."
							: desaTerpilih
								? "Buatkan operator untuk desa ini lewat tombol Tambah di atas."
								: "Pilih kecamatan dan desa di atas untuk melihat atau membuat akunnya."}
					</p>
					{akun.length > 0 ? (
						<button
							onClick={() => setSaringStatus("semua")}
							className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
						>
							Tampilkan semua akun
						</button>
					) : (
						desaTerpilih && (
							<motion.button
								whileHover={{ y: -2 }}
								whileTap={{ scale: 0.96 }}
								onClick={bukaTambah}
								className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-colors hover:bg-slate-800"
							>
								<FiPlus className="h-4 w-4" />
								Tambah akun {desaTerpilih.nama}
							</motion.button>
						)
					)}
				</motion.div>
			) : (
				<>
					{/* Dua kolom di layar lebar: kartu akun tidak butuh lebar penuh, dan
					    satu kolom membuat daftar 400+ akun jadi gulungan yang sangat panjang. */}
					<div className="grid items-start gap-3 xl:grid-cols-2">
						<AnimatePresence mode="popLayout">
							{akunTersaring.slice(0, batasTampil).map((user, i) => (
								<KartuAkun
									key={user.id}
									user={user}
									// Kartu yang ditambahkan lewat "Tampilkan lagi" mulai
									// bergelombang dari awal lagi, bukan menunggu giliran ke-25.
									urutan={i % UKURAN_HALAMAN}
									katalogKunci={katalogKunci}
									labelPermission={labelPermission}
									onUbah={bukaUbah}
									onUbahStatus={ubahStatus}
								/>
							))}
						</AnimatePresence>
					</div>

					{akunTersaring.length > batasTampil && (
						<div className="flex flex-col items-center gap-2 pt-1">
							<div className="h-1 w-48 overflow-hidden rounded-full bg-slate-200">
								<motion.div
									className="h-full rounded-full bg-slate-900"
									animate={{ width: `${(batasTampil / akunTersaring.length) * 100}%` }}
									transition={PEGAS}
								/>
							</div>
							<p className="text-[11.5px] text-slate-500">
								Menampilkan {batasTampil.toLocaleString("id-ID")} dari{" "}
								{akunTersaring.length.toLocaleString("id-ID")} akun
							</p>
							<motion.button
								whileHover={{ y: -2 }}
								whileTap={{ scale: 0.96 }}
								onClick={() => setBatasTampil((b) => b + UKURAN_HALAMAN)}
								className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
							>
								<FiChevronDown className="h-4 w-4" />
								Tampilkan {Math.min(UKURAN_HALAMAN, akunTersaring.length - batasTampil)} lagi
							</motion.button>
						</div>
					)}
				</>
			)}
			</>
			)}

			{/* ── Modal generate massal ───────────────────────────────────────── */}
			<AnimatePresence>
				{modalGenerate && (
					<ModalGenerateAkun
						key="modal-generate"
						meta={meta}
						modulSlug={modulSlug}
						kecamatanTerpilih={kecamatanTerpilih}
						onSelesai={() => {
							muatAkun();
							muatRingkasan();
						}}
						onTutup={() => setModalGenerate(false)}
					/>
				)}
			</AnimatePresence>

			{/* ── Modal tambah/ubah ───────────────────────────────────────────── */}
			<AnimatePresence>
			{modalTerbuka && (
				<motion.div
					key="modal-akun"
					variants={varianLatarModal}
					initial="awal"
					animate="tampil"
					exit="keluar"
					className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
				>
					{/* dvh, bukan vh: di HP, vh mengabaikan bilah alamat browser sehingga
					    dasar modal — tempat tombol simpan — jatuh di luar layar. */}
					<motion.div
						variants={varianPanelModal}
						className="flex w-full max-h-[92vh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl"
						style={{ maxHeight: "92dvh" }}
					>
						<div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
							<div className="flex min-w-0 items-center gap-3">
								<motion.span
									initial={{ scale: 0, rotate: -30 }}
									animate={{ scale: 1, rotate: 0 }}
									transition={{ ...PEGAS, delay: 0.08 }}
									className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold ${
										akunDiubah ? warnaAvatar(form.name || akunDiubah.name) : "bg-slate-900 text-white"
									}`}
								>
									{akunDiubah ? inisialNama(form.name || akunDiubah.name) : <FiPlus className="h-5 w-5" />}
								</motion.span>
								<div className="min-w-0">
								<h2 className="font-bold text-slate-900">
									{akunDiubah ? "Ubah Akun" : "Tambah Akun Operator"}
								</h2>
								{!akunDiubah && desaTerpilih && (
									<p className="mt-0.5 text-xs text-slate-500">
										{sebutanDesa(desaTerpilih)}
										{desaTerpilih.kecamatans ? ` — Kec. ${desaTerpilih.kecamatans.nama}` : ""}
									</p>
								)}
								{akunDiubah && (
									<p className="mt-0.5 truncate text-xs text-slate-500">{akunDiubah.email}</p>
								)}
								</div>
							</div>
							<button
								onClick={() => setModalTerbuka(false)}
								className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
								aria-label="Tutup"
							>
								<FiX className="h-5 w-5" />
							</button>
						</div>

						<form onSubmit={simpan} className="flex min-h-0 flex-1 flex-col">
							<div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
								<div className="grid gap-4 sm:grid-cols-2">
									<div>
										<label className="mb-1.5 block text-sm font-semibold text-slate-700">
											Nama Petugas <span className="text-red-500">*</span>
										</label>
										<input
											type="text"
											value={form.name}
											onChange={(e) => setForm({ ...form, name: e.target.value })}
											placeholder="Contoh: Rahmat Ramadan"
											className={KELAS_INPUT}
										/>
									</div>
									<div>
										<label className="mb-1.5 block text-sm font-semibold text-slate-700">
											Jabatan / Bagian
										</label>
										<input
											type="text"
											list="saran-jabatan-desa"
											value={form.jabatan_desa}
											onChange={(e) => setForm({ ...form, jabatan_desa: e.target.value })}
											placeholder="Contoh: Kesejahteraan"
											className={KELAS_INPUT}
										/>
										<datalist id="saran-jabatan-desa">
											{JABATAN_SARAN.map((opt) => (
												<option key={opt} value={opt} />
											))}
										</datalist>
									</div>
								</div>

								<div className="grid gap-4 sm:grid-cols-2">
									<div>
										<label className="mb-1.5 block text-sm font-semibold text-slate-700">
											Email (dipakai untuk login) <span className="text-red-500">*</span>
										</label>
										<input
											type="email"
											value={form.email}
											onChange={(e) => setForm({ ...form, email: e.target.value })}
											placeholder="nama@contoh.com"
											autoComplete="off"
											className={KELAS_INPUT}
										/>
									</div>
									<div>
										<label className="mb-1.5 block text-sm font-semibold text-slate-700">
											Nomor HP
										</label>
										<input
											type="tel"
											value={form.no_hp}
											onChange={(e) => setForm({ ...form, no_hp: e.target.value })}
											placeholder="081234567890"
											className={KELAS_INPUT}
										/>
									</div>
								</div>

								<div>
									<label className="mb-1.5 block text-sm font-semibold text-slate-700">
										Password {akunDiubah ? "" : <span className="text-red-500">*</span>}
									</label>
									<div className="flex gap-2">
										<div className="relative flex-1">
											<input
												type={tampilSandi ? "text" : "password"}
												value={form.password}
												onChange={(e) => setForm({ ...form, password: e.target.value })}
												placeholder={
													akunDiubah ? "Kosongkan bila tidak diganti" : "Minimal 6 karakter"
												}
												autoComplete="new-password"
												className={`${KELAS_INPUT} pr-11 font-mono tracking-wide`}
											/>
											<button
												type="button"
												onClick={() => setTampilSandi((s) => !s)}
												className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
												aria-label={tampilSandi ? "Sembunyikan password" : "Tampilkan password"}
											>
												{tampilSandi ? (
													<FiEyeOff className="h-4 w-4" />
												) : (
													<FiEye className="h-4 w-4" />
												)}
											</button>
										</div>
										<button
											type="button"
											onClick={() => {
												setForm((f) => ({ ...f, password: buatSandi() }));
												setTampilSandi(true);
											}}
											className="whitespace-nowrap rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
										>
											Acak
										</button>
									</div>
									<p className="mt-1 text-[11px] text-slate-500">
										Sandi acak dibuat tanpa huruf/angka yang mudah tertukar, supaya aman dibacakan
										lewat telepon.
									</p>
								</div>

								<div>
									<label className="mb-2 block text-sm font-semibold text-slate-700">
										Hak Akses Fitur
									</label>
									<div className="grid gap-2 sm:grid-cols-2">
										{katalog.map((permission) => {
											const dicentang = form.permissions.includes(permission.key);
											return (
												<motion.label
													key={permission.key}
													whileTap={{ scale: 0.98 }}
													className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-colors focus-within:ring-4 focus-within:ring-slate-900/10 ${
														dicentang
															? "border-slate-900 bg-slate-900/[0.04]"
															: "border-slate-200 hover:bg-slate-50"
													}`}
												>
													<input
														type="checkbox"
														checked={dicentang}
														onChange={() => togglePermission(permission.key)}
														className="sr-only"
													/>
													<motion.span
														aria-hidden
														animate={{
															backgroundColor: dicentang ? "#0f172a" : "#ffffff",
															borderColor: dicentang ? "#0f172a" : "#cbd5e1",
														}}
														transition={{ duration: 0.15 }}
														className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border-2"
													>
														<AnimatePresence initial={false}>
															{dicentang && (
																<motion.span
																	initial={{ scale: 0, rotate: -45 }}
																	animate={{ scale: 1, rotate: 0 }}
																	exit={{ scale: 0 }}
																	transition={PEGAS}
																	className="block"
																>
																	<FiCheck className="h-3 w-3 text-white" strokeWidth={3.5} />
																</motion.span>
															)}
														</AnimatePresence>
													</motion.span>
													<span className="min-w-0">
														<span className="block text-sm font-semibold text-slate-800">
															{permission.label}
														</span>
														<span className="block text-[11px] leading-snug text-slate-500">
															{permission.description}
														</span>
													</span>
												</motion.label>
											);
										})}
									</div>

									{/* Saat mengubah akun yang juga dipakai bidang lain, tunjukkan apa
									    yang TIDAK ikut tersimpan — supaya staf tidak mengira ia baru
									    saja mencabutnya. */}
									{akunDiubah?.permissions_bidang_lain?.length > 0 && (
										<div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
											<p className="mb-1.5 text-[11px] font-semibold text-slate-600">
												Akun ini juga memegang fitur bidang lain:
											</p>
											<div className="flex flex-wrap gap-1.5">
												{akunDiubah.permissions_bidang_lain.map((key) => (
													<span
														key={key}
														className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-500"
													>
														<FiLock className="h-3 w-3" />
														{labelPermission.get(key) || key}
													</span>
												))}
											</div>
											<p className="mt-1.5 text-[11px] text-slate-500">
												Tidak akan berubah saat Anda menyimpan.
											</p>
										</div>
									)}

									<p className="mt-2 text-[11px] text-slate-500">
										Dashboard dan Pengaturan selalu bisa diakses semua akun desa.
									</p>
								</div>

								<label className="flex cursor-pointer items-center justify-between gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5 focus-within:ring-4 focus-within:ring-slate-900/10">
									<span className="min-w-0">
										<span className="block text-sm font-medium text-slate-700">Akun aktif</span>
										<span className="block text-[11px] text-slate-500">
											{form.is_active ? "Petugas bisa login." : "Petugas tidak bisa login sampai diaktifkan lagi."}
										</span>
									</span>
									<input
										type="checkbox"
										checked={form.is_active}
										onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
										className="sr-only"
									/>
									<span
										aria-hidden
										className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ${
											form.is_active ? "justify-end bg-emerald-500" : "justify-start bg-slate-300"
										}`}
									>
										<motion.span layout transition={PEGAS} className="h-5 w-5 rounded-full bg-white shadow" />
									</span>
								</label>
							</div>

							<div
								className="flex shrink-0 gap-3 border-t border-slate-100 bg-white px-5 py-3"
								style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
							>
								<button
									type="button"
									onClick={() => setModalTerbuka(false)}
									className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
								>
									Batal
								</button>
								<button
									type="submit"
									disabled={menyimpan}
									className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
								>
									{menyimpan ? "Menyimpan…" : akunDiubah ? "Simpan Perubahan" : "Buat Akun"}
								</button>
							</div>
						</form>
					</motion.div>
				</motion.div>
			)}
			</AnimatePresence>
		</div>
		</MotionConfig>
	);
};

export default ManajemenAkunDesaPage;
