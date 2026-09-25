// src/pages/desa/bumdes/KatalogProdukBumdesPage.jsx
//
// Katalog produk & wisata seluruh BUM Desa Kabupaten Bogor. Seperti etalase
// toko, TANPA transaksi di aplikasi: tombol Pesan membuka WhatsApp langsung ke
// nomor pemilik produk.
//
// Untuk akun operator yang hanya memegang BUMDes, halaman ini sekaligus
// menjadi Dashboard (lihat DesaBerandaPage).
//
// Desainnya sengaja tenang: produk yang menjadi pusat perhatian. Satu warna
// aksen (hijau tua) hanya untuk tindakan; sisanya netral.
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MapPin, Plus, Search, X } from 'lucide-react';
import api from '../../../api';
import { KartuProduk, ModalDetailProduk, useFavorit } from '../../../components/bumdes/KatalogProdukUI';

const nf = new Intl.NumberFormat('id-ID');

const TAB_JENIS = [
	{ id: '', label: 'Semua' },
	{ id: 'produk', label: 'Produk' },
	{ id: 'wisata', label: 'Wisata' },
];

const Kerangka = () => (
	<div>
		<div className="aspect-[4/3] animate-pulse rounded-2xl bg-stone-100" />
		<div className="mt-3 h-3 w-1/3 animate-pulse rounded bg-stone-100" />
		<div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-stone-100" />
		<div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-stone-100" />
	</div>
);

const Grid = ({ children, redup = false }) => (
	<div className={`grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 ${redup ? 'opacity-50 transition-opacity' : ''}`}>
		{children}
	</div>
);

const KatalogProdukBumdesPage = () => {
	const [saring, setSaring] = useState({ q: '', kategori: '', kecamatan: '', jenis: '' });
	const [cari, setCari] = useState('');
	const [halaman, setHalaman] = useState(1);
	const [data, setData] = useState(null);
	const [memuat, setMemuat] = useState(true);
	const [galat, setGalat] = useState(null);
	const [dibuka, setDibuka] = useState(null);
	const { favorit, ubahFavorit } = useFavorit();

	useEffect(() => {
		const t = setTimeout(() => { setSaring((s) => ({ ...s, q: cari })); setHalaman(1); }, 350);
		return () => clearTimeout(t);
	}, [cari]);

	const muat = useCallback(async () => {
		setMemuat(true);
		setGalat(null);
		try {
			const params = { page: halaman, limit: 20 };
			if (saring.q.trim()) params.q = saring.q.trim();
			if (saring.kategori) params.kategori = saring.kategori;
			if (saring.kecamatan) params.kecamatan = saring.kecamatan;
			if (saring.jenis) params.jenis = saring.jenis;
			const res = await api.get('/desa/bumdes/katalog-produk', { params });
			setData(res.data?.data || null);
		} catch (err) {
			setGalat(err.response?.data?.message || 'Gagal memuat katalog');
		} finally {
			setMemuat(false);
		}
	}, [saring, halaman]);

	useEffect(() => { muat(); }, [muat]);

	const ubahSaring = (baru) => { setSaring((s) => ({ ...s, ...baru })); setHalaman(1); };
	const adaSaring = Boolean(saring.q || saring.kategori || saring.kecamatan || saring.jenis);
	const reset = () => { setCari(''); ubahSaring({ q: '', kategori: '', kecamatan: '', jenis: '' }); };

	const r = data?.ringkasan || {};
	const hlm = data?.halaman || { page: 1, total_halaman: 1, total: 0 };
	const produk = data?.produk || [];
	const unggulan = data?.unggulan || [];

	const ringkasan = [
		[r.total_produk, 'produk'],
		[r.jumlah_wisata, 'wisata'],
		[r.bumdes_berproduk, 'BUM Desa'],
		[r.jumlah_kecamatan, 'kecamatan'],
	].filter(([n]) => n !== undefined);

	return (
		<div className="mx-auto max-w-[1400px] space-y-8 pb-10">
			{/* ── Kepala ─────────────────────────────────────────── */}
			<header className="flex flex-col gap-5 pt-2 md:flex-row md:items-end md:justify-between">
				<div>
					<p className="text-sm font-medium text-emerald-800">Katalog BUM Desa · Kabupaten Bogor</p>
					<h1 className="mt-1 text-3xl font-semibold tracking-tight text-stone-900 sm:text-[2.1rem]">Produk &amp; Wisata Desa</h1>
					{ringkasan.length > 0 && (
						<p className="mt-2 text-sm text-stone-500">
							{ringkasan.map(([n, label], i) => (
								<span key={label}>
									{i > 0 && <span className="mx-2 text-stone-300">·</span>}
									<span className="font-semibold text-stone-800">{nf.format(n ?? 0)}</span> {label}
								</span>
							))}
						</p>
					)}
				</div>
				<Link to="/desa/bumdes#produk"
					className="inline-flex w-fit items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-800">
					<Plus className="h-4 w-4" /> Kelola produk
				</Link>
			</header>

			{/* ── Bilah alat ─────────────────────────────────────── */}
			<div className="space-y-4">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
					<div className="relative flex-1">
						<Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
						<input
							value={cari}
							onChange={(e) => setCari(e.target.value)}
							placeholder="Cari produk, wisata, BUM Desa, atau desa"
							className="h-11 w-full rounded-xl border border-stone-200 bg-white pl-11 pr-10 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-400 focus:ring-4 focus:ring-stone-900/5"
						/>
						{cari && (
							<button type="button" onClick={() => setCari('')} aria-label="Hapus pencarian"
								className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700">
								<X className="h-4 w-4" />
							</button>
						)}
					</div>
					<div className="flex gap-3">
						<div className="inline-flex h-11 rounded-xl border border-stone-200 bg-white p-1">
							{TAB_JENIS.map((t) => (
								<button key={t.id || 'semua'} type="button" onClick={() => ubahSaring({ jenis: t.id, kategori: '' })}
									className={`rounded-lg px-4 text-sm font-medium transition-colors ${saring.jenis === t.id ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900'}`}>
									{t.label}
								</button>
							))}
						</div>
						<div className="relative flex-1 lg:w-52 lg:flex-none">
							<MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
							<select value={saring.kecamatan} onChange={(e) => ubahSaring({ kecamatan: e.target.value })}
								className="h-11 w-full appearance-none rounded-xl border border-stone-200 bg-white pl-10 pr-4 text-sm text-stone-700 outline-none focus:border-stone-400">
								<option value="">Semua kecamatan</option>
								{(data?.kecamatan || []).map((k) => <option key={k} value={k}>{k}</option>)}
							</select>
						</div>
					</div>
				</div>

				{/* Kategori */}
				{(data?.kategori || []).length > 0 && (
					<div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
						{[{ nama: '', jumlah: r.total_produk }, ...data.kategori].map((k) => {
							const aktif = saring.kategori === k.nama;
							return (
								<button key={k.nama || 'semua'} type="button" onClick={() => ubahSaring({ kategori: k.nama, jenis: '' })}
									className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
										aktif ? 'bg-stone-900 font-medium text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
									}`}>
									{k.nama || 'Semua kategori'}
									<span className={`ml-1.5 tabular-nums ${aktif ? 'text-white/60' : 'text-stone-400'}`}>{nf.format(k.jumlah ?? 0)}</span>
								</button>
							);
						})}
					</div>
				)}
			</div>

			{galat && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{galat}</p>}

			{/* ── Unggulan (hanya tanpa saringan) ──────────────────── */}
			{!adaSaring && unggulan.length > 0 && (
				<section>
					<h2 className="mb-4 text-lg font-semibold tracking-tight text-stone-900">Unggulan</h2>
					<Grid>
						{unggulan.slice(0, 5).map((p) => (
							<KartuProduk key={p.id} produk={p} onBuka={setDibuka} favorit={favorit.has(String(p.id))} onFavorit={ubahFavorit} />
						))}
					</Grid>
				</section>
			)}

			{/* ── Katalog ────────────────────────────────────────── */}
			<section>
				<div className="mb-4 flex items-baseline justify-between gap-3">
					<h2 className="text-lg font-semibold tracking-tight text-stone-900">
						{adaSaring ? 'Hasil' : 'Semua'}
						{!memuat && <span className="ml-2 text-sm font-normal text-stone-400">{nf.format(hlm.total)}</span>}
					</h2>
					{adaSaring && (
						<button type="button" onClick={reset} className="text-sm text-stone-500 underline-offset-4 hover:text-stone-900 hover:underline">
							Hapus saringan
						</button>
					)}
				</div>

				{memuat && !data ? (
					<Grid>{Array.from({ length: 10 }).map((_, i) => <Kerangka key={i} />)}</Grid>
				) : produk.length === 0 ? (
					<div className="rounded-2xl border border-dashed border-stone-200 px-6 py-16 text-center">
						<p className="font-medium text-stone-800">{adaSaring ? 'Tidak ada yang cocok' : 'Belum ada produk'}</p>
						<p className="mt-1 text-sm text-stone-500">
							{adaSaring ? 'Coba kata kunci atau saringan lain.' : 'Produk dan paket wisata BUM Desa akan tampil di sini.'}
						</p>
						{adaSaring ? (
							<button type="button" onClick={reset} className="mt-4 text-sm font-medium text-emerald-800 hover:underline">Tampilkan semua</button>
						) : (
							<Link to="/desa/bumdes#produk" className="mt-4 inline-block text-sm font-medium text-emerald-800 hover:underline">Tambah produk pertama</Link>
						)}
					</div>
				) : (
					<Grid redup={memuat}>
						{produk.map((p) => (
							<KartuProduk key={p.id} produk={p} onBuka={setDibuka} favorit={favorit.has(String(p.id))} onFavorit={ubahFavorit} />
						))}
					</Grid>
				)}

				{hlm.total_halaman > 1 && (
					<div className="mt-10 flex items-center justify-center gap-3 text-sm">
						<button type="button" disabled={hlm.page <= 1} onClick={() => setHalaman((h) => h - 1)} aria-label="Sebelumnya"
							className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40">
							<ChevronLeft className="h-4 w-4" />
						</button>
						<span className="text-stone-500"><span className="font-medium text-stone-900">{hlm.page}</span> / {hlm.total_halaman}</span>
						<button type="button" disabled={hlm.page >= hlm.total_halaman} onClick={() => setHalaman((h) => h + 1)} aria-label="Berikutnya"
							className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40">
							<ChevronRight className="h-4 w-4" />
						</button>
					</div>
				)}
			</section>

			{dibuka && (
				<ModalDetailProduk produk={dibuka} onTutup={() => setDibuka(null)}
					favorit={favorit.has(String(dibuka.id))} onFavorit={ubahFavorit} />
			)}
		</div>
	);
};

export default KatalogProdukBumdesPage;
