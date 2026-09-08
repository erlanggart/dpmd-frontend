// src/pages/superadmin/BackupPage.jsx
//
// Unduh cadangan sistem: basis data, berkas, foto, atau semuanya sekaligus.
//
// Unduhannya TIDAK lewat axios/blob. Cadangan produksi bisa berukuran giga, dan
// blob menahan seluruhnya di memori peramban sebelum satu byte pun sampai ke
// disk — tab bisa mati sebelum berkasnya jadi. Jadi polanya: minta tiket
// berumur pendek lewat API biasa, lalu serahkan URL-nya ke peramban supaya ia
// mengunduh sendiri dengan bilah progres dan menulis langsung ke disk.

import React, { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import api from "../../api";
import {
	FiAlertTriangle,
	FiArchive,
	FiDatabase,
	FiDownload,
	FiFileText,
	FiImage,
	FiRefreshCw,
} from "react-icons/fi";

const pesanError = (error, cadangan) =>
	error?.response?.data?.message || error?.message || cadangan;

const JENIS = [
	{
		key: "database",
		judul: "Backup Database",
		ringkas: "Seluruh isi basis data sebagai berkas .sql",
		detail:
			"Struktur tabel, data, trigger, dan stored routine. Tinggal diimpor ke MySQL localhost.",
		icon: FiDatabase,
		warna: "indigo",
		ekstensi: ".sql",
	},
	{
		key: "berkas",
		judul: "Backup File",
		ringkas: "Dokumen unggahan (.pdf, Office, dan lainnya)",
		detail:
			"Semua berkas non-gambar di folder storage: produk hukum, LPJ, proposal, surat, lampiran.",
		icon: FiFileText,
		warna: "amber",
		ekstensi: ".zip",
	},
	{
		key: "foto",
		judul: "Backup Foto",
		ringkas: "Seluruh gambar (.jpg, .png, .webp, dan lainnya)",
		detail: "Avatar, foto berita, hero gallery, status, dan gambar lampiran pesan.",
		icon: FiImage,
		warna: "emerald",
		ekstensi: ".zip",
	},
	{
		key: "semua",
		judul: "Backup Semua",
		ringkas: "Database + file + foto dalam satu arsip",
		detail:
			"Satu .zip berisi database.sql, seluruh berkas, seluruh foto, dan petunjuk cara memulihkannya.",
		icon: FiArchive,
		warna: "slate",
		ekstensi: ".zip",
	},
];

const WARNA = {
	indigo: { bg: "bg-indigo-50", text: "text-indigo-600", ring: "ring-indigo-200/60" },
	amber: { bg: "bg-amber-50", text: "text-amber-600", ring: "ring-amber-200/60" },
	emerald: { bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-200/60" },
	slate: { bg: "bg-slate-100", text: "text-slate-600", ring: "ring-slate-200/60" },
};

const BackupPage = () => {
	const [ringkasan, setRingkasan] = useState(null);
	const [memuat, setMemuat] = useState(true);
	const [galat, setGalat] = useState(null);
	const [sedangUnduh, setSedangUnduh] = useState(null);

	const muatRingkasan = useCallback(async () => {
		setMemuat(true);
		setGalat(null);
		try {
			const res = await api.get("/superadmin/backup/ringkasan");
			setRingkasan(res.data?.data || null);
		} catch (error) {
			setGalat(pesanError(error, "Tidak dapat membaca isi penyimpanan."));
		} finally {
			setMemuat(false);
		}
	}, []);

	useEffect(() => {
		muatRingkasan();
	}, [muatRingkasan]);

	const unduh = async (jenis) => {
		if (sedangUnduh) return;

		const info = JENIS.find((j) => j.key === jenis);
		const ukuran = ringkasan?.[jenis]?.ukuran_teks;

		// Cadangan besar butuh waktu lama dan membebani server. Konfirmasi dulu
		// supaya tidak terpicu karena salah klik.
		const konfirmasi = await Swal.fire({
			icon: "question",
			title: info.judul,
			html:
				`<div style="text-align:left;font-size:14px">` +
				`<p style="margin:0 0 8px">${info.detail}</p>` +
				(ukuran
					? `<p style="margin:0"><b>Perkiraan ukuran:</b> ${ukuran}</p>`
					: "") +
				`<p style="margin:8px 0 0;color:#64748b;font-size:12.5px">Unduhan berjalan di latar peramban. Jangan tutup tab ini sampai selesai.</p>` +
				`</div>`,
			showCancelButton: true,
			confirmButtonText: "Unduh sekarang",
			cancelButtonText: "Batal",
			confirmButtonColor: "#0f172a",
		});
		if (!konfirmasi.isConfirmed) return;

		setSedangUnduh(jenis);
		try {
			const res = await api.post("/superadmin/backup/tiket", { jenis });
			const tiket = res.data?.data?.tiket;
			if (!tiket) throw new Error("Server tidak mengembalikan tiket unduhan.");

			// baseURL bisa relatif ('/api'), jadi rangkai lewat URL absolut
			// terhadap origin yang sedang dibuka — ini yang membuatnya tetap benar
			// saat diakses dari HP di jaringan lokal maupun setelah pindah domain.
			const basis = api.defaults.baseURL || "/api";
			const alamat = new URL(
				`${basis.replace(/\/$/, "")}/superadmin/backup/unduh/${jenis}?tiket=${encodeURIComponent(tiket)}`,
				window.location.origin,
			).toString();

			// Navigasi ke URL unduhan lewat iframe tersembunyi, bukan
			// window.location: mengganti location membuat SPA ini ikut berpindah
			// halaman kalau server sempat menjawab galat alih-alih berkas.
			const bingkai = document.createElement("iframe");
			bingkai.style.display = "none";
			bingkai.src = alamat;
			document.body.appendChild(bingkai);
			setTimeout(() => bingkai.remove(), 120000);

			Swal.fire({
				icon: "success",
				title: "Unduhan dimulai",
				text: "Berkas akan muncul di folder unduhan setelah selesai disiapkan server.",
				timer: 2600,
				showConfirmButton: false,
			});
		} catch (error) {
			Swal.fire({
				icon: "error",
				title: "Gagal memulai unduhan",
				text: pesanError(error, "Terjadi kesalahan."),
			});
		} finally {
			// Jeda singkat supaya tombol tidak langsung bisa ditekan berkali-kali;
			// permintaan cadangan beruntun membebani server tanpa guna.
			setTimeout(() => setSedangUnduh(null), 2500);
		}
	};

	const dbBermasalah = ringkasan?.database && ringkasan.database.tersedia === false;

	return (
		<div className="max-w-5xl mx-auto space-y-5">
			{/* Header */}
			<div className="rounded-2xl bg-slate-900 text-white p-5 shadow-lg">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="min-w-0">
						<h1 className="text-xl font-bold">Backup Sistem</h1>
						<p className="text-slate-300 text-sm mt-1">
							Unduh salinan basis data dan berkas unggahan untuk dipasang ulang di localhost.
						</p>
					</div>
					<button
						onClick={muatRingkasan}
						disabled={memuat}
						className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-50"
					>
						<FiRefreshCw className={`h-4 w-4 ${memuat ? "animate-spin" : ""}`} />
						Muat ulang
					</button>
				</div>
			</div>

			{galat && (
				<div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-2.5">
					<FiAlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
					<div>
						<p className="text-sm font-bold text-amber-900">Ringkasan tidak dapat dimuat</p>
						<p className="text-[12.5px] text-amber-800 mt-0.5">{galat}</p>
					</div>
				</div>
			)}

			{dbBermasalah && (
				<div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-2.5">
					<FiAlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
					<div>
						<p className="text-sm font-bold text-red-900">
							Basis data tidak dapat dibaca
						</p>
						<p className="text-[12.5px] text-red-800 mt-0.5">
							{ringkasan.database.catatan} — backup database dan backup semua akan gagal.
						</p>
					</div>
				</div>
			)}

			{/* Kartu jenis backup */}
			<div className="grid gap-4 sm:grid-cols-2">
				{JENIS.map((jenis) => {
					const Icon = jenis.icon;
					const w = WARNA[jenis.warna];
					const info = ringkasan?.[jenis.key];
					const iniDatabase = jenis.key === "database";
					const sibuk = sedangUnduh === jenis.key;

					return (
						<div
							key={jenis.key}
							className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col"
						>
							<div className="flex items-start gap-3">
								<div
									className={`h-11 w-11 rounded-xl ${w.bg} ring-1 ${w.ring} flex items-center justify-center ${w.text} shrink-0`}
								>
									<Icon className="h-5 w-5" />
								</div>
								<div className="min-w-0 flex-1">
									<h3 className="font-bold text-slate-800 leading-tight">{jenis.judul}</h3>
									<p className="text-[12.5px] text-slate-500 mt-0.5">{jenis.ringkas}</p>
								</div>
								<span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-mono font-semibold shrink-0">
									{jenis.ekstensi}
								</span>
							</div>

							<div className="mt-3 pt-3 border-t border-slate-100 flex-1">
								{memuat ? (
									<p className="text-[12.5px] text-slate-400">Menghitung...</p>
								) : iniDatabase ? (
									<p className="text-[12.5px] text-slate-600">
										{ringkasan?.database?.tersedia
											? `Basis data ${ringkasan.database.nama} di ${ringkasan.database.host}`
											: "Tidak tersedia"}
									</p>
								) : info ? (
									<p className="text-[12.5px] text-slate-600">
										<b>{info.jumlah.toLocaleString("id-ID")}</b> berkas ·{" "}
										<b>{info.ukuran_teks}</b>
										{jenis.key === "semua" && " + database"}
									</p>
								) : (
									<p className="text-[12.5px] text-slate-400">—</p>
								)}
							</div>

							<button
								onClick={() => unduh(jenis.key)}
								disabled={sibuk || memuat || (iniDatabase && dbBermasalah)}
								className="mt-3 inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<FiDownload className="h-4 w-4" />
								{sibuk ? "Menyiapkan..." : "Unduh"}
							</button>
						</div>
					);
				})}
			</div>

			{/* Petunjuk pemulihan */}
			<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
				<h2 className="text-sm font-bold text-slate-800">Cara memasang ulang di localhost</h2>
				<ol className="mt-2.5 space-y-2 text-[13px] text-slate-600 list-decimal list-inside">
					<li>
						Buat basis data kosong:{" "}
						<code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[12px]">
							CREATE DATABASE dpmd CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
						</code>
					</li>
					<li>
						Impor berkas .sql:{" "}
						<code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[12px]">
							mysql -u root -p dpmd &lt; dpmd-database-....sql
						</code>
					</li>
					<li>
						Ekstrak .zip berkas/foto di dalam folder <b>backend</b>. Struktur foldernya sudah
						sesuai aslinya, jadi folder <code className="font-mono text-[12px]">storage</code>{" "}
						akan jatuh tepat di tempatnya.
					</li>
				</ol>
				<p className="mt-3 text-[12px] text-slate-500">
					Folder <code className="font-mono">storage/uploads/temp</code> dan{" "}
					<code className="font-mono">storage/hls</code> sengaja tidak ikut — isinya berkas
					sementara yang tidak dirujuk basis data.
				</p>
			</div>
		</div>
	);
};

export default BackupPage;
