// src/components/bumdes/FormulirBumdes.jsx
//
// Penampil formulir BUM Desa. Kolomnya datang dari skemaBumdes.js — berkas ini
// hanya tahu cara menggambar, bukan kolom apa saja yang ada.
//
// Satu-satunya percabangan adalah `mode`:
//   'desa'  → Perdes/SK dipilih dari modul Produk Hukum Desa (berkas sudah
//             diunggah di sana; yang disimpan id-nya). Bagian `hanyaSpked`
//             (bantuan, data lama) tidak tampil.
//   'spked' → Perdes/SK dan dokumen lain diunggah langsung di sini
//
// Selain itu keduanya identik, dan memang harus identik: dua formulir yang
// ditulis terpisah untuk tabel yang sama sudah pernah menyimpang tiga puluh
// kolom.
//
// Tata letak: navigasi bagian yang menempel di kiri (layar lebar) dengan
// kelengkapan per bagian, lalu kartu-kartu bagian di kanan.
import React, { useEffect, useMemo, useState } from 'react';
import {
	FiAward, FiBriefcase, FiCheck, FiDollarSign, FiEdit3, FiFileText, FiGift, FiGlobe,
	FiInfo, FiLayers, FiLoader, FiPaperclip, FiPlus, FiShield, FiTrash2, FiTrendingUp,
	FiUpload, FiUsers, FiX, FiArchive, FiHeart, FiLink, FiBookOpen, FiShoppingBag, FiFolder,
} from 'react-icons/fi';
import api from '../../api';
import API_CONFIG from '../../config/api';
import { SEKSI_BUMDES, SEKSI_BACA_SAJA, bacaDaftar } from './skemaBumdes';

/* ───────────────────────────── Gaya dasar ───────────────────────────── */

const kelasKolom = (mati) =>
	`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all duration-150 ${
		mati
			? 'cursor-default border-transparent bg-slate-50 text-slate-700 placeholder:text-slate-300'
			: 'border-slate-200 bg-white text-slate-900 shadow-sm shadow-slate-900/[0.02] placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-400 focus:ring-4 focus:ring-slate-900/[0.06]'
	}`;

const rupiah = (n) =>
	n === null || n === undefined || n === '' || !Number.isFinite(Number(n))
		? '—'
		: `Rp ${Number(n).toLocaleString('id-ID')}`;

const rupiahRingkas = (n) => {
	const v = Number(n) || 0;
	const abs = Math.abs(v);
	if (abs >= 1e9) return `Rp ${(v / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 2 })} M`;
	if (abs >= 1e6) return `Rp ${(v / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
	return rupiah(v);
};

export const tautanBerkas = (path) =>
	path ? `${API_CONFIG.STORAGE_URL}/${String(path).split('/').map(encodeURIComponent).join('/')}` : null;

const IKON_SEKSI = {
	identitas: FiBriefcase,
	legalitas: FiShield,
	kepengurusan: FiUsers,
	usaha: FiLayers,
	modal: FiDollarSign,
	omset: FiTrendingUp,
	pangan: FiHeart,
	pades: FiGift,
	kemitraan: FiLink,
	program: FiAward,
	bantuan: FiBookOpen,
	tambahan: FiGlobe,
	lama: FiArchive,
	lpj: FiFileText,
	pendirian: FiFolder,
	produk: FiShoppingBag,
};

/* ───────────────────────────── Kelengkapan ───────────────────────────── */

const terisi = (def, data) => {
	const v = data[def.kunci];
	if (['centang', 'daftarTeks', 'daftarTahunan'].includes(def.jenis)) {
		return bacaDaftar(v).some((x) => (typeof x === 'string' ? x.trim() : x));
	}
	if (def.jenis === 'objek') {
		const o = bacaDaftar(v, 'objek');
		return def.isian.some((s) => String(o[s.kunci] || '').trim());
	}
	return v !== null && v !== undefined && String(v).trim() !== '';
};

const kolomDinilai = (seksi, data) =>
	seksi.kolom.filter((k) => !k.dariAkunDesa && (!k.tampilBila || k.tampilBila(data)));

/** { terisi, total, persen } untuk satu seksi skema. */
export const kelengkapanSeksi = (seksi, data) => {
	const kolom = kolomDinilai(seksi, data);
	const n = kolom.filter((k) => terisi(k, data)).length;
	return { terisi: n, total: kolom.length, persen: kolom.length ? Math.round((n / kolom.length) * 100) : 100 };
};

/** Kelengkapan seluruh formulir untuk mode tertentu. */
export const kelengkapanFormulir = (data, mode = 'desa') => {
	let n = 0;
	let total = 0;
	SEKSI_BUMDES.filter((s) => !s.hanyaSpked || mode === 'spked').forEach((s) => {
		const k = kelengkapanSeksi(s, data);
		n += k.terisi;
		total += k.total;
	});
	return { terisi: n, total, persen: total ? Math.round((n / total) * 100) : 0 };
};

const warnaStatus = (persen) =>
	persen >= 100 ? 'bg-emerald-500' : persen > 0 ? 'bg-amber-400' : 'bg-slate-300';

/* ───────────────────────────── Potongan UI ───────────────────────────── */

/*
 * Catatan: dulu komponen ini membaca prop `anak` padahal dipanggil dengan
 * children — akibatnya SELURUH label formulir tidak pernah tampil dan desa
 * hanya melihat kotak-kotak berisi placeholder atau "0".
 */
const Label = ({ children, wajib, catatan }) => (
	<label className="mb-1.5 flex items-center gap-1 text-[13px] font-semibold text-slate-700">
		{children}
		{wajib && <span className="text-brand-600">*</span>}
		{catatan && <span className="ml-1 text-xs font-normal text-slate-400">{catatan}</span>}
	</label>
);

const Keterangan = ({ children, atas = false }) =>
	children ? (
		<p className={`flex items-start gap-1.5 text-xs leading-5 text-slate-500 ${atas ? '-mt-0.5 mb-2.5' : 'mt-1.5'}`}>
			<FiInfo className="mt-[3px] h-3 w-3 flex-shrink-0 text-slate-400" />
			<span>{children}</span>
		</p>
	) : null;

const TombolKecil = ({ children, bahaya = false, ...props }) => (
	<button
		type="button"
		{...props}
		className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
			bahaya ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
		}`}
	>
		{children}
	</button>
);

/* ───────────────────────────── Isian dasar ───────────────────────────── */

/** Input rupiah: ditampilkan berpemisah ribuan, disimpan sebagai angka mentah. */
const InputUang = ({ nilai, onUbah, mati, contoh = '0' }) => {
	const tampil = nilai === null || nilai === undefined || nilai === '' || nilai === '-'
		? (nilai === '-' ? '-' : '')
		: Number(nilai).toLocaleString('id-ID');
	return (
		<div className="relative">
			<span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">Rp</span>
			<input
				type="text"
				inputMode="numeric"
				value={tampil}
				onChange={(e) => {
					const mentah = e.target.value.trim();
					const negatif = mentah.startsWith('-');
					const digit = mentah.replace(/[^\d]/g, '');
					onUbah(digit ? `${negatif ? '-' : ''}${digit}` : negatif ? '-' : '');
				}}
				placeholder={contoh}
				disabled={mati}
				className={`${kelasKolom(mati)} pl-10 tabular-nums`}
			/>
		</div>
	);
};

const pilihanTahun = () => {
	const kini = new Date().getFullYear();
	const daftar = [];
	for (let th = kini + 1; th >= 2015; th -= 1) daftar.push(th);
	return daftar;
};

/** Satu isian di dalam baris daftarTahunan. */
const IsianBaris = ({ def, nilai, onUbah, unggah }) => {
	const [mengunggah, setMengunggah] = useState(false);
	const [galat, setGalat] = useState(null);

	if (def.jenis === 'tahun') {
		return (
			<select value={nilai ?? ''} onChange={(e) => onUbah(e.target.value ? Number(e.target.value) : '')} className={kelasKolom(false)}>
				<option value="">Pilih tahun</option>
				{pilihanTahun().map((th) => <option key={th} value={th}>{th}</option>)}
			</select>
		);
	}
	if (def.jenis === 'pilih') {
		return (
			<select value={nilai ?? ''} onChange={(e) => onUbah(e.target.value)} className={kelasKolom(false)}>
				<option value="">Pilih</option>
				{def.opsi.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
			</select>
		);
	}
	if (def.jenis === 'uang') return <InputUang nilai={nilai} onUbah={onUbah} mati={false} />;
	if (def.jenis === 'berkas') {
		return (
			<div>
				<div className="flex flex-wrap items-center gap-2">
					<label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50">
						{mengunggah ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiUpload className="h-4 w-4" />}
						{mengunggah ? 'Mengunggah…' : nilai ? 'Ganti berkas' : 'Pilih berkas (PDF / foto, maks. 5 MB)'}
						<input
							type="file"
							accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
							className="hidden"
							disabled={mengunggah}
							onChange={async (e) => {
								const file = e.target.files?.[0];
								e.target.value = '';
								if (!file) return;
								if (file.size > 5 * 1024 * 1024) { setGalat('Ukuran berkas maksimal 5 MB'); return; }
								setGalat(null);
								setMengunggah(true);
								try {
									onUbah(await unggah(file));
								} catch (err) {
									setGalat(err.response?.data?.message || 'Gagal mengunggah berkas');
								} finally {
									setMengunggah(false);
								}
							}}
						/>
					</label>
					{nilai && (
						<a href={tautanBerkas(nilai)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
							<FiCheck className="h-3.5 w-3.5" /> Terunggah · lihat
						</a>
					)}
				</div>
				{galat && <p className="mt-1.5 text-xs text-rose-600">{galat}</p>}
			</div>
		);
	}
	return (
		<input type="text" value={nilai ?? ''} onChange={(e) => onUbah(e.target.value)} placeholder={def.contoh} className={kelasKolom(false)} />
	);
};

const tampilNilaiBaris = (def, nilai) => {
	if (nilai === null || nilai === undefined || nilai === '') return null;
	if (def.jenis === 'uang') return <span className="tabular-nums">{rupiah(nilai)}</span>;
	if (def.jenis === 'pilih') return def.opsi.find((o) => o.value === nilai)?.label || nilai;
	if (def.jenis === 'berkas') {
		return (
			<a href={tautanBerkas(nilai)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900">
				<FiPaperclip className="h-3.5 w-3.5" /> Lihat berkas
			</a>
		);
	}
	return String(nilai);
};

/**
 * Daftar bertahun ala Kerja Sama Desa: pilih tahun → isi → simpan → muncul
 * sebagai kartu → tambah lagi. Perubahan baru benar-benar tersimpan saat
 * tombol Simpan halaman ditekan.
 */
export const DaftarTahunan = ({ def, nilai, onUbah, mati }) => {
	const baris = bacaDaftar(nilai);
	const [isian, setIsian] = useState(null);      // baris yang sedang disunting
	const [indeksUbah, setIndeksUbah] = useState(null);
	const [galat, setGalat] = useState(null);

	const unggah = async (file) => {
		const fd = new FormData();
		fd.append('file', file);
		const res = await api.post('/desa/bumdes/lampiran', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
		return res.data?.data?.path;
	};

	const bukaBaru = () => {
		const awal = {};
		def.kolom.forEach((k) => { if (k.bawaan !== undefined) awal[k.kunci] = k.bawaan; });
		setIsian(awal);
		setIndeksUbah(null);
		setGalat(null);
	};

	const kolomTampil = (b) => def.kolom.filter((k) => !k.tampilBila || k.tampilBila(b));

	const simpanBaris = () => {
		const kurang = kolomTampil(isian).filter((k) => k.wajib && (isian[k.kunci] === undefined || isian[k.kunci] === '' || isian[k.kunci] === null));
		if (kurang.length) { setGalat(`Lengkapi: ${kurang.map((k) => k.label).join(', ')}`); return; }
		// Isian yang tersembunyi (tampilBila) tidak ikut tersimpan.
		const bersih = {};
		kolomTampil(isian).forEach((k) => {
			const v = isian[k.kunci];
			if (v !== undefined && v !== null && v !== '') bersih[k.kunci] = v;
		});
		const baru = [...baris];
		if (indeksUbah === null) baru.push(bersih);
		else baru[indeksUbah] = bersih;
		onUbah(def.kunci, baru);
		setIsian(null);
		setIndeksUbah(null);
	};

	const hapus = (i) => {
		if (!window.confirm('Hapus data ini dari daftar?')) return;
		onUbah(def.kunci, baris.filter((_, j) => j !== i));
	};

	// Tampil terurut tahun terbaru, tanpa mengubah urutan simpan.
	const urut = baris
		.map((b, i) => ({ b, i }))
		.sort((x, y) => (Number(y.b.tahun) || 0) - (Number(x.b.tahun) || 0));

	const kolomRingkas = def.kolom.filter((k) => k.kunci !== 'tahun');
	const kolomUang = def.kolom.find((k) => k.jenis === 'uang');
	const total = kolomUang ? baris.reduce((s, b) => s + (Number(b[kolomUang.kunci]) || 0), 0) : null;

	return (
		<div className="space-y-3">
			{/* Ringkasan daftar */}
			{baris.length > 0 && (
				<div className="flex flex-wrap items-center gap-2 text-xs">
					<span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">{baris.length} data</span>
					{kolomUang && (
						<span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
							Total {kolomUang.label.replace(/\s*\(Rp\)/, '').toLowerCase()}: {rupiahRingkas(total)}
						</span>
					)}
				</div>
			)}

			{urut.length === 0 && !isian && (
				<div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-7 text-center">
					<FiLayers className="h-6 w-6 text-slate-300" />
					<p className="mt-2 text-sm text-slate-400">Belum ada data.</p>
				</div>
			)}

			{urut.length > 0 && (
				<div className="grid grid-cols-1 gap-2.5">
					{urut.map(({ b, i }) => (
						<div
							key={i}
							className={`group flex flex-col gap-3 rounded-2xl border p-3.5 transition-colors sm:flex-row sm:items-center ${
								indeksUbah === i ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200 bg-white hover:border-slate-300'
							}`}
						>
							{!def.tanpaTahun && (
								<div className="flex h-12 w-16 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-slate-900 text-white">
									<span className="text-[9px] font-medium uppercase tracking-widest text-slate-400">Tahun</span>
									<span className="text-sm font-bold tabular-nums">{b.tahun || '—'}</span>
								</div>
							)}
							<dl className="grid flex-1 grid-cols-1 gap-x-5 gap-y-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
								{kolomRingkas.map((k) => {
									const isi = tampilNilaiBaris(k, b[k.kunci]);
									if (!isi) return null;
									return (
										<div key={k.kunci} className="min-w-0">
											<dt className="text-[10.5px] font-medium uppercase tracking-wide text-slate-400">{k.label.replace(/\s*\(Rp\)/, '')}</dt>
											<dd className="break-words font-semibold text-slate-800">{isi}</dd>
										</div>
									);
								})}
							</dl>
							{!mati && (
								<div className="flex flex-shrink-0 gap-0.5 sm:opacity-60 sm:transition-opacity sm:group-hover:opacity-100">
									<TombolKecil onClick={() => { setIsian({ ...b }); setIndeksUbah(i); setGalat(null); }}>
										<FiEdit3 className="h-3.5 w-3.5" /> Ubah
									</TombolKecil>
									<TombolKecil bahaya onClick={() => hapus(i)}>
										<FiTrash2 className="h-3.5 w-3.5" /> Hapus
									</TombolKecil>
								</div>
							)}
						</div>
					))}
				</div>
			)}

			{isian && (
				<div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm sm:p-5">
					<div className="mb-4 flex items-center justify-between">
						<p className="text-sm font-bold text-slate-900">
							{indeksUbah === null ? def.tombolTambah || 'Tambah data' : 'Ubah data'}
						</p>
						<button type="button" onClick={() => { setIsian(null); setIndeksUbah(null); }} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup">
							<FiX className="h-4 w-4" />
						</button>
					</div>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						{kolomTampil(isian).map((k) => (
							<div key={k.kunci} className={k.jenis === 'berkas' ? 'sm:col-span-2' : undefined}>
								<Label wajib={k.wajib}>{k.label}</Label>
								<IsianBaris def={k} nilai={isian[k.kunci]} onUbah={(v) => setIsian((s) => ({ ...s, [k.kunci]: v }))} unggah={unggah} />
							</div>
						))}
					</div>
					{galat && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{galat}</p>}
					<div className="mt-5 flex gap-2">
						<button type="button" onClick={simpanBaris}
							className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-800">
							<FiCheck className="h-4 w-4" /> Simpan ke daftar
						</button>
						<button type="button" onClick={() => { setIsian(null); setIndeksUbah(null); }}
							className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100">
							Batal
						</button>
					</div>
				</div>
			)}

			{!mati && !isian && (
				<button type="button" onClick={bukaBaru}
					className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-600 transition-all hover:border-slate-900 hover:bg-slate-900 hover:text-white">
					<FiPlus className="h-4 w-4" /> {def.tombolTambah || 'Tambah'}
				</button>
			)}
			{!mati && baris.length > 0 && (
				<p className="text-[11px] text-slate-400">Perubahan daftar tersimpan setelah Anda menekan tombol Simpan.</p>
			)}
		</div>
	);
};

/** Pilihan ganda berbentuk chip. */
const Centang = ({ def, nilai, onUbah, mati, nilaiLama }) => {
	const terpilih = bacaDaftar(nilai);
	const ubah = (opsi) => {
		if (mati) return;
		const baru = terpilih.includes(opsi) ? terpilih.filter((x) => x !== opsi) : [...terpilih, opsi];
		onUbah(def.kunci, baru);
	};
	return (
		<div>
			<div className="flex flex-wrap gap-2">
				{def.opsi.map((o) => {
					const aktif = terpilih.includes(o);
					return (
						<button
							key={o}
							type="button"
							onClick={() => ubah(o)}
							aria-pressed={aktif}
							disabled={mati && !aktif}
							className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-all ${
								aktif
									? 'border-slate-900 bg-slate-900 text-white shadow-sm'
									: mati
										? 'hidden'
										: 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900'
							} ${mati ? 'cursor-default' : ''}`}
						>
							{aktif && <FiCheck className="h-3.5 w-3.5" />}
							{o}
						</button>
					);
				})}
				{mati && terpilih.length === 0 && <span className="text-sm text-slate-400">Belum dipilih</span>}
			</div>
			{!mati && terpilih.length > 0 && (
				<p className="mt-2 text-xs text-slate-400">{terpilih.length} dipilih</p>
			)}
			{/* Teks bebas dari rekap lama yang tidak cocok dengan pilihan mana pun. */}
			{nilaiLama && terpilih.length === 0 && (
				<p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
					<FiInfo className="h-3.5 w-3.5" /> Data lama: “{nilaiLama}”. Pilih kategori yang sesuai untuk memperbaruinya.
				</p>
			)}
		</div>
	);
};

/** Daftar teks bernomor (Unit Usaha 1, 2, 3, ...). */
const DaftarTeks = ({ def, nilai, onUbah, mati }) => {
	const isi = bacaDaftar(nilai);
	// Kotak kosong ikut disimpan di state supaya urutan & jumlah kotak stabil;
	// backend membuang yang kosong saat menyimpan.
	const jumlahBaris = Math.max(def.jumlahAwal || 1, isi.length);
	const baris = Array.from({ length: jumlahBaris }, (_, i) => isi[i] ?? '');
	const ubah = (i, v) => {
		const baru = [...baris];
		baru[i] = v;
		onUbah(def.kunci, baru);
	};
	return (
		<div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
			{baris.map((v, i) => (
				<div key={i} className="relative">
					<span className="pointer-events-none absolute left-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-bold text-slate-500">
						{i + 1}
					</span>
					<input
						type="text"
						value={v}
						onChange={(e) => ubah(i, e.target.value)}
						placeholder={`Unit usaha ${i + 1}`}
						disabled={mati}
						className={`${kelasKolom(mati)} pl-10`}
					/>
				</div>
			))}
			{!mati && baris.length < (def.maks || 20) && (
				<button type="button" onClick={() => onUbah(def.kunci, [...baris, ''])}
					className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50">
					<FiPlus className="h-3.5 w-3.5" /> Tambah unit usaha
				</button>
			)}
		</div>
	);
};

/** Pemilih berkas untuk kolom berkas biasa (diunggah saat Simpan). */
const PemilihBerkas = ({ def, nilaiLama, fileBaru, onPilih, mati }) => {
	const ada = Boolean(fileBaru || nilaiLama);
	return (
		<div className={`flex items-center gap-3 rounded-2xl border p-3 ${ada ? 'border-emerald-200 bg-emerald-50/40' : 'border-dashed border-slate-300 bg-slate-50/50'}`}>
			<div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${ada ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-400'}`}>
				{ada ? <FiCheck className="h-5 w-5" /> : <FiFileText className="h-5 w-5" />}
			</div>
			<div className="min-w-0 flex-1">
				{fileBaru ? (
					<p className="truncate text-xs font-semibold text-emerald-700">{fileBaru.name} <span className="font-normal text-emerald-600">· diunggah saat Simpan</span></p>
				) : nilaiLama ? (
					<a href={tautanBerkas(nilaiLama)} target="_blank" rel="noreferrer" className="block truncate text-xs font-semibold text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900">
						{String(nilaiLama).split('/').pop()}
					</a>
				) : (
					<p className="text-xs text-slate-400">Belum ada berkas</p>
				)}
			</div>
			{!mati && (
				<label className="inline-flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50">
					<FiUpload className="h-3.5 w-3.5" /> {ada ? 'Ganti' : 'Unggah'}
					<input
						type="file"
						accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
						className="hidden"
						onChange={(e) => {
							const f = e.target.files?.[0];
							e.target.value = '';
							if (!f) return;
							if (f.size > 5 * 1024 * 1024) { window.alert('Ukuran berkas maksimal 5 MB'); return; }
							onPilih(def.kunci, f);
						}}
					/>
				</label>
			)}
		</div>
	);
};

/** Satu kolom, digambar menurut jenisnya. */
const Kolom = ({ def, data, onUbah, matikan, berkasBaru, onPilihBerkas }) => {
	const mati = matikan || def.hanyaBaca;
	const nilai = data[def.kunci];
	const kelasLebar = def.lebar === 'penuh' ? 'sm:col-span-2' : undefined;

	let isi;
	if (def.jenis === 'pilih') {
		isi = (
			<select value={nilai ?? ''} onChange={(e) => onUbah(def.kunci, e.target.value)} disabled={mati} className={`${kelasKolom(mati)} ${mati ? 'appearance-none' : ''}`}>
				<option value="">{mati ? '—' : 'Pilih opsi'}</option>
				{def.opsi.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
			</select>
		);
	} else if (def.jenis === 'teksPanjang') {
		isi = (
			<textarea value={nilai ?? ''} onChange={(e) => onUbah(def.kunci, e.target.value)} placeholder={mati ? '—' : def.contoh}
				rows={def.baris || 3} disabled={mati} className={`${kelasKolom(mati)} resize-none`} />
		);
	} else if (def.jenis === 'centang') {
		isi = <Centang def={def} nilai={nilai} onUbah={onUbah} mati={mati} nilaiLama={def.kunciLama ? data[def.kunciLama] : null} />;
	} else if (def.jenis === 'daftarTeks') {
		isi = <DaftarTeks def={def} nilai={nilai} onUbah={onUbah} mati={mati} />;
	} else if (def.jenis === 'daftarTahunan') {
		isi = <DaftarTahunan def={def} nilai={nilai} onUbah={onUbah} mati={mati} />;
	} else if (def.jenis === 'berkas') {
		isi = (
			<PemilihBerkas def={def} nilaiLama={nilai} fileBaru={berkasBaru?.[def.kunci]}
				onPilih={onPilihBerkas || (() => {})} mati={mati || !onPilihBerkas} />
		);
	} else if (def.jenis === 'objek') {
		const obj = bacaDaftar(nilai, 'objek');
		isi = (
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{def.isian.map((s) => (
					<div key={s.kunci} className={`flex overflow-hidden rounded-xl border transition-all ${mati ? 'border-transparent bg-slate-50' : 'border-slate-200 bg-white shadow-sm shadow-slate-900/[0.02] focus-within:border-slate-400 focus-within:ring-4 focus-within:ring-slate-900/[0.06]'}`}>
						<span className="flex w-24 flex-shrink-0 items-center border-r border-slate-100 bg-slate-50 px-3 text-xs font-semibold text-slate-500">{s.label}</span>
						<input type="text" value={obj[s.kunci] ?? ''} placeholder={mati ? '—' : s.contoh} disabled={mati}
							onChange={(e) => onUbah(def.kunci, { ...bacaDaftar(data[def.kunci], 'objek'), [s.kunci]: e.target.value })}
							className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:text-slate-700" />
					</div>
				))}
			</div>
		);
	} else {
		isi = (
			<input
				type={def.tipeInput || (def.jenis === 'angka' ? 'number' : 'text')}
				value={nilai ?? ''}
				onChange={(e) => onUbah(def.kunci, e.target.value)}
				placeholder={mati ? '—' : def.contoh}
				disabled={mati}
				readOnly={def.hanyaBaca}
				className={kelasKolom(mati)}
			/>
		);
	}

	const keteranganDiAtas = ['centang', 'daftarTahunan', 'daftarTeks', 'objek'].includes(def.jenis);
	return (
		<div className={kelasLebar}>
			<Label wajib={def.wajib} catatan={def.catatanLabel}>{def.label}</Label>
			{keteranganDiAtas && <Keterangan atas>{def.keterangan}</Keterangan>}
			{isi}
			{!keteranganDiAtas && <Keterangan>{def.keterangan}</Keterangan>}
		</div>
	);
};

/** Kartu satu bagian formulir. */
export const Seksi = ({ id, nomor, ikon, judul, keterangan, kelengkapan, children }) => {
	const Ikon = ikon || IKON_SEKSI[id] || FiFileText;
	return (
		<section id={id ? `seksi-${id}` : undefined} className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03]">
			<header className="flex items-start gap-3.5 border-b border-slate-100 px-5 py-4 sm:px-6">
				<div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
					<Ikon className="h-[18px] w-[18px]" />
					{nomor ? (
						<span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
							{nomor}
						</span>
					) : null}
				</div>
				<div className="min-w-0 flex-1">
					<h3 className="text-[15px] font-semibold tracking-tight text-slate-900">{judul}</h3>
					{keterangan && <p className="mt-0.5 text-xs leading-5 text-slate-500">{keterangan}</p>}
				</div>
				{kelengkapan && kelengkapan.total > 0 && (
					<div className="hidden flex-shrink-0 items-center gap-2 sm:flex">
						<div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
							<div className={`h-full rounded-full ${warnaStatus(kelengkapan.persen)}`} style={{ width: `${kelengkapan.persen}%` }} />
						</div>
						<span className="text-xs font-semibold tabular-nums text-slate-500">{kelengkapan.terisi}/{kelengkapan.total}</span>
					</div>
				)}
			</header>
			<div className="px-5 py-5 sm:px-6">{children}</div>
		</section>
	);
};

/** Kelompokkan kolom menurut `grup` (dipakai kepengurusan bernomor). */
const kelompokkan = (kolom) => {
	const urut = [];
	const peta = new Map();
	kolom.forEach((k) => {
		const kunci = k.grup || '';
		if (!peta.has(kunci)) { peta.set(kunci, []); urut.push(kunci); }
		peta.get(kunci).push(k);
	});
	return urut.map((g) => ({ grup: g, kolom: peta.get(g) }));
};

/** Navigasi bagian — menempel di kiri pada layar lebar. */
const NavigasiSeksi = ({ butir, aktif, total }) => (
	<nav className="sticky top-4 space-y-4">
		<div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/[0.03]">
			<div className="flex items-baseline justify-between">
				<p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Kelengkapan</p>
				<p className="text-2xl font-bold tabular-nums tracking-tight text-slate-900">{total.persen}%</p>
			</div>
			<div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
				<div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-700 transition-all duration-500" style={{ width: `${total.persen}%` }} />
			</div>
			<p className="mt-2 text-xs text-slate-500">{total.terisi} dari {total.total} isian terisi</p>
		</div>
		<div className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm shadow-slate-900/[0.03]">
			{butir.map((b) => (
				<a
					key={b.id}
					href={`#seksi-${b.id}`}
					onClick={(e) => {
						e.preventDefault();
						document.getElementById(`seksi-${b.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
					}}
					className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-colors ${
						aktif === b.id ? 'bg-slate-900 font-semibold text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
					}`}
				>
					<span className={`w-5 text-[11px] font-bold tabular-nums ${aktif === b.id ? 'text-slate-400' : 'text-slate-300'}`}>{b.nomor}</span>
					<span className="min-w-0 flex-1 truncate">{b.judul}</span>
					{b.persen !== null && <span className={`h-2 w-2 flex-shrink-0 rounded-full ${warnaStatus(b.persen)}`} />}
				</a>
			))}
		</div>
	</nav>
);

/**
 * @param {object}   data          nilai formulir
 * @param {function} onUbah        (kunci, nilai) => void
 * @param {boolean}  bisaSunting   false = seluruh kolom dimatikan
 * @param {'desa'|'spked'} mode
 * @param {ReactNode} slotDasarHukum  blok Perdes/SK milik pemanggil
 * @param {ReactNode} slotDokumen     blok unggah dokumen (mode SPKED)
 * @param {ReactNode} slotAtas        mis. penunjuk desa di halaman SPKED
 * @param {object}   berkasBaru       kunci -> File untuk kolom berkas biasa
 * @param {function} onPilihBerkas    (kunci, File) => void
 * @param {Array}    seksiTambahan    [{ id, judul, keterangan, konten }] — bagian
 *                                    milik halaman pemanggil, ikut bernomor &
 *                                    masuk navigasi
 * @param {boolean}  navigasi         tampilkan navigasi bagian (layar lebar)
 */
const FormulirBumdes = ({
	data = {},
	onUbah,
	bisaSunting = true,
	mode = 'desa',
	slotDasarHukum = null,
	slotDokumen = null,
	slotAtas = null,
	tampilkanBacaSaja = true,
	berkasBaru = {},
	onPilihBerkas = null,
	seksiTambahan = [],
	navigasi = false,
}) => {
	const seksiTampil = SEKSI_BUMDES.filter((s) => !s.hanyaSpked || mode === 'spked');
	const [aktif, setAktif] = useState(null);

	const butirNavigasi = useMemo(() => [
		...seksiTampil.map((s, i) => ({ id: s.id, nomor: i + 1, judul: s.judul, persen: kelengkapanSeksi(s, data).persen })),
		...seksiTambahan.map((s, i) => ({ id: s.id, nomor: seksiTampil.length + i + 1, judul: s.judul, persen: s.persen ?? null })),
	], [seksiTampil, seksiTambahan, data]);

	const total = useMemo(() => kelengkapanFormulir(data, mode), [data, mode]);

	// Sorot bagian yang sedang terlihat di navigasi.
	useEffect(() => {
		if (!navigasi || typeof IntersectionObserver === 'undefined') return undefined;
		const pengamat = new IntersectionObserver(
			(entri) => {
				const terlihat = entri.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
				if (terlihat) setAktif(terlihat.target.id.replace('seksi-', ''));
			},
			{ rootMargin: '-15% 0px -70% 0px' },
		);
		document.querySelectorAll('[id^="seksi-"]').forEach((el) => pengamat.observe(el));
		return () => pengamat.disconnect();
	}, [navigasi, butirNavigasi.length]);

	const isi = (
		<div className="min-w-0 space-y-5">
			{slotAtas}

			{/* Navigasi ringkas untuk layar kecil */}
			{navigasi && (
				<div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 xl:hidden">
					{butirNavigasi.map((b) => (
						<button key={b.id} type="button"
							onClick={() => document.getElementById(`seksi-${b.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
							className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
							{b.persen !== null && <span className={`h-1.5 w-1.5 rounded-full ${warnaStatus(b.persen)}`} />}
							{b.nomor}. {b.judul}
						</button>
					))}
				</div>
			)}

			{seksiTampil.map((seksi, i) => {
				const kolom = seksi.kolom.filter((k) => !k.tampilBila || k.tampilBila(data));
				return (
					<Seksi key={seksi.id} id={seksi.id} nomor={i + 1} judul={seksi.judul} keterangan={seksi.keterangan}
						kelengkapan={kelengkapanSeksi(seksi, data)}>
						{seksi.slotDokumenDasarHukum && slotDasarHukum && (
							<div className="mb-6">{slotDasarHukum}</div>
						)}
						<div className="space-y-4">
							{kelompokkan(kolom).map(({ grup, kolom: isiGrup }) => {
								if (!grup) return (
									<div key="tanpa-grup" className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
										{isiGrup.map((def) => (
											<Kolom
												key={def.kunciTampilan || def.kunci}
												def={def}
												data={data}
												onUbah={onUbah}
												// Desa dan kecamatan ikut akun di halaman desa, tapi
												// harus bisa disetel dari SPKED lewat penunjuk desa.
												matikan={!bisaSunting || (def.dariAkunDesa && mode === 'desa')}
												berkasBaru={berkasBaru}
												onPilihBerkas={bisaSunting ? onPilihBerkas : null}
											/>
										))}
									</div>
								);
								const nomorGrup = grup.split('.')[0];
								const namaGrup = grup.replace(/^\d+\.\s*/, '');
								return (
									<div key={grup} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5">
										<div className="mb-4 flex items-center gap-3">
											<span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-900 shadow-sm ring-1 ring-slate-200">
												{nomorGrup}
											</span>
											<div>
												<p className="text-sm font-semibold text-slate-900">{namaGrup}</p>
												{isiGrup[0]?.catatanGrup && <p className="text-xs text-slate-500">{isiGrup[0].catatanGrup}</p>}
											</div>
										</div>
										<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
											{isiGrup.map((def) => (
												<Kolom
													key={def.kunci}
													def={{ ...def, lebar: undefined }}
													data={data}
													onUbah={onUbah}
													matikan={!bisaSunting}
													berkasBaru={berkasBaru}
													onPilihBerkas={bisaSunting ? onPilihBerkas : null}
												/>
											))}
										</div>
									</div>
								);
							})}
						</div>
					</Seksi>
				);
			})}

			{seksiTambahan.map((s, i) => (
				<Seksi key={s.id} id={s.id} nomor={seksiTampil.length + i + 1} judul={s.judul} keterangan={s.keterangan}>
					{s.konten}
				</Seksi>
			))}

			{mode === 'spked' && slotDokumen && (
				<Seksi id="dokumen" judul="Dokumen">{slotDokumen}</Seksi>
			)}

			{/* Penilaian DPMD tidak lagi ditampilkan ke desa. */}
			{tampilkanBacaSaja && mode !== 'desa' && SEKSI_BACA_SAJA.map((seksi) => (
				<Seksi key={seksi.id} judul={`${seksi.judul} — diisi DPMD`}>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
						{seksi.kolom.map((k) => (
							<div key={k.kunci}>
								<Label>{k.label}</Label>
								<div className="rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700">
									{data[k.kunci] || <span className="text-slate-400">Belum ada data</span>}
								</div>
							</div>
						))}
					</div>
				</Seksi>
			))}
		</div>
	);

	if (!navigasi) return isi;

	return (
		<div className="grid grid-cols-1 gap-6 xl:grid-cols-[250px_minmax(0,1fr)]">
			<aside className="hidden xl:block">
				<NavigasiSeksi butir={butirNavigasi} aktif={aktif} total={total} />
			</aside>
			{isi}
		</div>
	);
};

export default FormulirBumdes;
