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

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import api from "../../api";
import {
	FiAlertCircle,
	FiCheck,
	FiChevronDown,
	FiCopy,
	FiDownload,
	FiEdit2,
	FiEye,
	FiEyeOff,
	FiFilter,
	FiLock,
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

// ── Potongan tampilan ───────────────────────────────────────────────────────

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

/** Hak akses yang diberikan bidang ini → pekat, karena inilah yang bisa diubah. */
const ChipMilikBidang = ({ children }) => (
	<span className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white">
		<FiCheck className="h-3 w-3" />
		{children}
	</span>
);

const KotakGalat = ({ pesan }) => (
	<div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
		<FiAlertCircle className="mx-auto h-8 w-8 text-amber-500" />
		<p className="mt-3 font-semibold text-amber-900">Halaman tidak dapat dibuka</p>
		<p className="mt-1 text-sm text-amber-800">{pesan}</p>
	</div>
);

/** Kerangka kartu selama akun dimuat — menahan tinggi daftar supaya tidak melompat. */
const KerangkaKartu = () => (
	<div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4">
		<div className="flex gap-3">
			<div className="h-10 w-10 shrink-0 rounded-xl bg-slate-200" />
			<div className="min-w-0 flex-1 space-y-2">
				<div className="h-3.5 w-2/5 rounded bg-slate-200" />
				<div className="h-3 w-3/5 rounded bg-slate-100" />
				<div className="h-3 w-1/2 rounded bg-slate-100" />
			</div>
		</div>
		<div className="mt-4 flex gap-1.5 border-t border-slate-100 pt-3">
			<div className="h-6 w-24 rounded-lg bg-slate-100" />
			<div className="h-6 w-20 rounded-lg bg-slate-100" />
			<div className="h-6 w-28 rounded-lg bg-slate-100" />
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
 * Satu akun operator.
 *
 * Hak akses dari bidang LAIN sengaja diringkas jadi satu lencana berpenghitung,
 * bukan satu chip per fitur. Di lapangan sebagian besar akun desa memegang
 * hampir seluruh katalog, sehingga menampilkan semuanya membuat tiap kartu
 * setinggi dua baris chip dan mengubur satu-satunya hal yang bisa diubah staf
 * di halaman ini: fitur bidangnya sendiri. Rinciannya tetap ada, tinggal diklik.
 */
const KartuAkun = ({ user, labelPermission, onUbah, onUbahStatus }) => {
	const [rincianTerbuka, setRincianTerbuka] = useState(false);

	const milikBidang = user.permissions_dikelola || [];
	const milikBidangLain = user.permissions_bidang_lain || [];
	const tanpaAkses = !user.permissions?.length;

	return (
		<article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
			{/* Pita status di tepi kiri: keadaan akun terbaca sebelum teksnya dibaca. */}
			<span
				aria-hidden
				className={`absolute inset-y-0 left-0 w-1 ${user.is_active ? "bg-emerald-500" : "bg-slate-300"}`}
			/>

			<div className="p-4 pl-5">
				<div className="flex items-start gap-3">
					<span
						className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold ${warnaAvatar(user.name)} ${user.is_active ? "" : "opacity-50 grayscale"}`}
						aria-hidden
					>
						{inisialNama(user.name)}
					</span>

					<div className="min-w-0 flex-1">
						<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
							<h3 className="text-[14.5px] font-bold leading-tight text-slate-900">{user.name}</h3>
							{user.jabatan_desa && (
								<span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-600">
									{user.jabatan_desa}
								</span>
							)}
							{!user.is_active && (
								<span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-slate-600">
									Nonaktif
								</span>
							)}
						</div>

						<p className="mt-1 break-all text-[12.5px] leading-snug text-slate-500">{user.email}</p>

						{user.desa && (
							<p className="mt-1 flex items-start gap-1 text-[11.5px] leading-snug text-slate-400">
								<FiMapPin className="mt-[2px] h-3 w-3 shrink-0" />
								<span className="min-w-0">
									{sebutanDesa(user.desa)}
									{user.desa.kecamatan ? ` · Kec. ${user.desa.kecamatan.nama}` : ""}
								</span>
							</p>
						)}
					</div>

					<div className="flex shrink-0 items-center gap-1.5">
						<button
							onClick={() => onUbah(user)}
							className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
						>
							<FiEdit2 className="h-3.5 w-3.5" />
							<span className="hidden sm:inline">Ubah</span>
						</button>
						{/* Menonaktifkan akun jarang dilakukan dan memutus kerja satu desa,
						    jadi tombolnya ikon saja — tetap terjangkau, tapi tidak bersaing
						    perhatian dengan Ubah seperti pada tata letak sebelumnya. */}
						<button
							onClick={() => onUbahStatus(user)}
							title={user.is_active ? "Nonaktifkan akun" : "Aktifkan akun"}
							aria-label={user.is_active ? "Nonaktifkan akun" : "Aktifkan akun"}
							className={`inline-flex h-[30px] w-[30px] items-center justify-center rounded-lg border transition-colors ${
								user.is_active
									? "border-slate-200 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
									: "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
							}`}
						>
							<FiPower className="h-3.5 w-3.5" />
						</button>
					</div>
				</div>

				<div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
					{milikBidang.map((key) => (
						<ChipMilikBidang key={key}>{labelPermission.get(key) || key}</ChipMilikBidang>
					))}

					{milikBidangLain.length > 0 && (
						<button
							type="button"
							onClick={() => setRincianTerbuka((t) => !t)}
							aria-expanded={rincianTerbuka}
							className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-100"
						>
							<FiLock className="h-3 w-3" />
							{milikBidangLain.length} fitur bidang lain
							<FiChevronDown
								className={`h-3 w-3 transition-transform ${rincianTerbuka ? "rotate-180" : ""}`}
							/>
						</button>
					)}

					{tanpaAkses && (
						<span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
							<FiAlertCircle className="h-3 w-3" />
							Belum ada hak akses — hanya bisa melihat dashboard
						</span>
					)}
				</div>

				{/* Hak akses bidang lain ditampilkan tapi tidak bisa disentuh — supaya
				    staf tahu akun ini juga dipakai untuk urusan di luar bidangnya. */}
				{rincianTerbuka && milikBidangLain.length > 0 && (
					<div className="mt-2 rounded-xl bg-slate-50 p-2.5">
						<p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
							Diberikan bidang lain atau Admin Desa — tidak dapat Anda ubah
						</p>
						<div className="flex flex-wrap gap-1.5">
							{milikBidangLain.map((key) => (
								<span
									key={key}
									className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-500"
								>
									<FiLock className="h-3 w-3" />
									{labelPermission.get(key) || key}
								</span>
							))}
						</div>
					</div>
				)}
			</div>
		</article>
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
        `<p style="margin:0 0 8px">Semua akun memakai sandi <b>${pratinjau?.sandi_default}</b> dan wajib menggantinya saat login pertama.</p>` +
        `<p style="margin:0;color:#64748b;font-size:12.5px">Desa yang sudah punya operator tidak akan disentuh.</p>` +
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

  const KELAS_STATUS = {
    baru: "bg-emerald-50 text-emerald-700 border-emerald-200",
    sudah_punya: "bg-slate-50 text-slate-500 border-slate-200",
    sudah_punya_nonaktif: "bg-amber-50 text-amber-700 border-amber-200",
    email_terpakai: "bg-rose-50 text-rose-700 border-rose-200",
    email_bentrok: "bg-rose-50 text-rose-700 border-rose-200",
  };

  const LABEL_STATUS = {
    baru: "Akan dibuat",
    sudah_punya: "Sudah ada operator",
    sudah_punya_nonaktif: "Ada tapi nonaktif",
    email_terpakai: "Email terpakai",
    email_bentrok: "Email bentrok",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        className="flex w-full max-h-[92vh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-3xl sm:rounded-2xl"
        style={{ maxHeight: "92dvh" }}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-bold text-slate-900">
              {hasil ? "Akun Selesai Dibuat" : "Generate Akun Operator Otomatis"}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {hasil
                ? "Sampaikan email dan sandi di bawah ke masing-masing desa."
                : `Hanya untuk desa yang belum punya operator ${meta?.modul?.label || "fitur ini"}.`}
            </p>
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
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-bold text-emerald-900">
                  {hasil.dibuat.length} akun berhasil dibuat
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
              </div>

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
                      Semua desa & kelurahan yang belum punya operator
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
      </div>
    </div>
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
	const [modalGenerate, setModalGenerate] = useState(false);
	const [desas, setDesas] = useState([]);
	const [memuatAwal, setMemuatAwal] = useState(true);
	const [galatAwal, setGalatAwal] = useState(null);

	const [kecamatanId, setKecamatanId] = useState("");
	const [desaId, setDesaId] = useState("");
	const [cari, setCari] = useState("");

	const [akun, setAkun] = useState([]);
	const [memuatAkun, setMemuatAkun] = useState(false);

	// Kondisi desa terpilih: siapa yang sudah memegang fitur bidang ini.
	const [ringkasan, setRingkasan] = useState(null);
	const [memuatRingkasan, setMemuatRingkasan] = useState(false);

	const [modalTerbuka, setModalTerbuka] = useState(false);
	const [akunDiubah, setAkunDiubah] = useState(null); // null = mode tambah
	const [form, setForm] = useState(formKosong);
	const [tampilSandi, setTampilSandi] = useState(false);
	const [menyimpan, setMenyimpan] = useState(false);

	const katalog = meta?.catalog || [];
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
						.map((u) => `<p style="margin:0 0 4px"><b>${u.name}</b> — ${u.email}</p>`)
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
				`<p style="margin:0 0 8px"><b>${user.name}</b><br/>${user.email}</p>` +
				`<p style="margin:0">Akan mendapat tambahan akses: <b>${fitur.join(", ")}</b>.</p>` +
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
						`<div><b>Email</b>: ${payload.email}</div>` +
						`<div><b>Sandi</b>: ${form.password}</div>` +
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
				const daftar = sudahAda.map((u) => `<li><b>${u.name}</b> — ${u.email}</li>`).join("");

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
			html: `<b>${user.name}</b><br/><span style="font-size:13px">${user.email}</span>`,
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
	};

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
		// Saat disematkan di dalam tab halaman bidang, lebar dan jarak tepi sudah
		// diatur halaman induknya — menambahkannya lagi membuat konten menyempit
		// dua kali.
		<div
			className={
				tersemat
					? "w-full space-y-4 p-4 sm:p-5"
					: "mx-auto w-full max-w-6xl space-y-4 px-4 py-5 sm:px-6 sm:py-6 lg:px-8"
			}
		>
			{/* ── Kepala halaman ──────────────────────────────────────────────── */}
			<header className="relative overflow-hidden rounded-3xl bg-slate-950 px-5 py-5 text-white shadow-xl sm:px-7 sm:py-6">
				<span
					aria-hidden
					className="pointer-events-none absolute -right-16 -top-28 h-64 w-64 rounded-full bg-indigo-500/25 blur-3xl"
				/>
				<span
					aria-hidden
					className="pointer-events-none absolute -bottom-32 -left-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl"
				/>

				<div className="relative flex flex-wrap items-start justify-between gap-4">
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
					<div className="shrink-0 rounded-2xl bg-white/[0.07] px-4 py-2.5 text-center ring-1 ring-inset ring-white/10">
						<div className="text-2xl font-bold leading-none tabular-nums">
							{meta?.total_akun_dikelola ?? 0}
						</div>
						<div className="mt-1 text-[10.5px] font-medium uppercase tracking-wider text-slate-400">
							Akun dikelola
						</div>
					</div>
				</div>

				<div className="relative mt-5 border-t border-white/10 pt-4">
					<span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-500">
						<FiShield className="h-3.5 w-3.5" />
						Fitur yang bisa Anda berikan
					</span>
					<div className="mt-2.5 flex flex-wrap gap-1.5">
						{katalog.map((p) => (
							<span
								key={p.key}
								title={p.description}
								className="rounded-lg bg-white/[0.08] px-2.5 py-1 text-[11.5px] font-semibold text-slate-100 ring-1 ring-inset ring-white/10"
							>
								{p.label}
							</span>
						))}
					</div>
				</div>
			</header>

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
				<div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
					<div className="grid flex-1 gap-2.5 sm:grid-cols-2">
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

					<div className="flex gap-2.5 lg:w-[22rem]">
						<div className="relative flex-1">
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
							<button
								onClick={() => setModalGenerate(true)}
								title="Buatkan akun untuk desa yang belum punya operator"
								className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-900/10 bg-slate-100 px-3.5 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-200"
							>
								<FiZap className="h-4 w-4" />
								<span className="hidden sm:inline">Generate</span>
							</button>
						)}
						<button
							onClick={bukaTambah}
							className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
						>
							<FiPlus className="h-4 w-4" />
							Tambah
						</button>
					</div>
				</div>

				{/* Penyaring aktif dirangkum jadi satu baris: tanpa ini, jumlah yang
				    tampil di daftar mudah disalahartikan sebagai jumlah se-kabupaten. */}
				{adaPenyaring && (
					<div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-slate-100 pt-2.5 text-[11.5px]">
						<FiFilter className="h-3 w-3 text-slate-400" />
						{kecamatanTerpilih && (
							<span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
								Kec. {kecamatanTerpilih.nama}
							</span>
						)}
						{desaTerpilih && (
							<span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
								{sebutanDesa(desaTerpilih)}
							</span>
						)}
						{cari.trim() && (
							<span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
								“{cari.trim()}”
							</span>
						)}
						<button
							onClick={bersihkanPenyaring}
							className="ml-auto font-semibold text-slate-400 underline-offset-2 hover:text-slate-700 hover:underline"
						>
							Bersihkan
						</button>
					</div>
				)}
			</div>

			{/* ── Kondisi desa terpilih ───────────────────────────────────────────
			    Ditarik sebelum akun boleh dibuat; inilah yang mencegah akun ganda. */}
			{desaTerpilih && (
				<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
					{memuatRingkasan ? (
						<p className="px-4 py-4 text-sm text-slate-500">
							Memeriksa akun yang sudah ada di {sebutanDesa(desaTerpilih)}…
						</p>
					) : !ringkasan ? (
						<p className="px-4 py-4 text-sm text-slate-500">
							Kondisi desa ini belum bisa dipastikan.
						</p>
					) : (
						<>
							{ringkasan.sudah_pegang.length > 0 ? (
								<div className="flex items-start gap-2.5 border-b border-emerald-100 bg-emerald-50 px-4 py-3">
									<FiUserCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
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
								<div className="flex items-start gap-2.5 border-b border-amber-100 bg-amber-50 px-4 py-3">
									<FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
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
				</section>
			)}

			{/* ── Daftar akun ─────────────────────────────────────────────────── */}
			{!memuatAkun && akun.length > 0 && (
				<div className="flex items-baseline justify-between px-1">
					<h2 className="text-[13px] font-bold text-slate-700">
						{akun.length} akun
						{desaTerpilih
							? ` di ${sebutanDesa(desaTerpilih)}`
							: kecamatanTerpilih
								? ` di Kec. ${kecamatanTerpilih.nama}`
								: ""}
					</h2>
				</div>
			)}

			{memuatAkun ? (
				<div className="grid gap-3 xl:grid-cols-2">
					<KerangkaKartu />
					<KerangkaKartu />
					<KerangkaKartu />
					<KerangkaKartu />
				</div>
			) : akun.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
					<span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
						<FiUsers className="h-6 w-6 text-slate-400" />
					</span>
					<p className="mt-3.5 font-semibold text-slate-700">
						{desaTerpilih ? `Belum ada akun di ${sebutanDesa(desaTerpilih)}` : "Belum ada akun"}
					</p>
					<p className="mx-auto mt-1 max-w-sm text-[13px] text-slate-500">
						{desaTerpilih
							? "Buatkan operator untuk desa ini lewat tombol Tambah di atas."
							: "Pilih kecamatan dan desa di atas untuk melihat atau membuat akunnya."}
					</p>
					{desaTerpilih && (
						<button
							onClick={bukaTambah}
							className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
						>
							<FiPlus className="h-4 w-4" />
							Tambah akun {desaTerpilih.nama}
						</button>
					)}
				</div>
			) : (
				// Dua kolom di layar lebar: kartu akun tidak butuh lebar penuh, dan
				// satu kolom membuat daftar 400+ akun jadi gulungan yang sangat panjang.
				<div className="grid gap-3 xl:grid-cols-2">
					{akun.map((user) => (
						<KartuAkun
							key={user.id}
							user={user}
							labelPermission={labelPermission}
							onUbah={bukaUbah}
							onUbahStatus={ubahStatus}
						/>
					))}
				</div>
			)}

			{/* ── Modal generate massal ───────────────────────────────────────── */}
			{modalGenerate && (
				<ModalGenerateAkun
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

			{/* ── Modal tambah/ubah ───────────────────────────────────────────── */}
			{modalTerbuka && (
				<div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
					{/* dvh, bukan vh: di HP, vh mengabaikan bilah alamat browser sehingga
					    dasar modal — tempat tombol simpan — jatuh di luar layar. */}
					<div
						className="flex w-full max-h-[92vh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl"
						style={{ maxHeight: "92dvh" }}
					>
						<div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
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
												<label
													key={permission.key}
													className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-colors ${
														dicentang
															? "border-slate-900 bg-slate-900/[0.04]"
															: "border-slate-200 hover:bg-slate-50"
													}`}
												>
													<input
														type="checkbox"
														checked={dicentang}
														onChange={() => togglePermission(permission.key)}
														className="mt-0.5 h-4 w-4 accent-slate-900"
													/>
													<span className="min-w-0">
														<span className="block text-sm font-semibold text-slate-800">
															{permission.label}
														</span>
														<span className="block text-[11px] leading-snug text-slate-500">
															{permission.description}
														</span>
													</span>
												</label>
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

								<label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5">
									<input
										type="checkbox"
										checked={form.is_active}
										onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
										className="h-4 w-4 accent-slate-900"
									/>
									<span className="text-sm font-medium text-slate-700">Akun aktif</span>
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
					</div>
				</div>
			)}
		</div>
	);
};

export default ManajemenAkunDesaPage;
