// src/pages/desa/bumdes/KatalogProdukBumdesPage.jsx
//
// Marketplace Produk & Wisata Desa Kabupaten Bogor — etalase produk dan paket
// wisata seluruh BUM Desa. Seperti e-commerce, TANPA transaksi di aplikasi:
// tombol Pesan membuka WhatsApp langsung ke nomor pemilik produk.
//
// Untuk akun operator yang hanya memegang BUMDes, halaman ini sekaligus
// menjadi Dashboard (lihat DesaBerandaPage).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
	ArrowRight, Box, ChevronLeft, ChevronRight, Compass, LayoutGrid, Leaf, Loader2,
	MapPin, Mountain, Search, ShieldCheck, ShoppingBag, Sparkles, Star, Store,
	TrendingUp, Users, X,
} from 'lucide-react';
import api from '../../../api';
import {
	KartuProduk, ModalDetailProduk, metaKategori, urlFotoProduk, useFavorit,
} from '../../../components/bumdes/KatalogProdukUI';

const nf = new Intl.NumberFormat('id-ID');

const TAB_JENIS = [
	{ id: '', label: 'Semua', ikon: LayoutGrid },
	{ id: 'produk', label: 'Produk Desa', ikon: ShoppingBag },
	{ id: 'wisata', label: 'Wisata Desa', ikon: Mountain },
];

/* ───────────────────────────── Hero ───────────────────────────── */

/** Siluet bukit berlapis — nuansa perdesaan Bogor, murni SVG. */
const Perbukitan = () => (
	<svg className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full" viewBox="0 0 1440 200" preserveAspectRatio="none" aria-hidden="true">
		<path d="M0 120 C 180 60, 320 60, 480 105 S 820 170, 1000 110 S 1300 40, 1440 90 L1440 200 L0 200 Z" fill="#cfe3c4" opacity="0.55" />
		<path d="M0 150 C 220 100, 420 120, 640 150 S 1040 190, 1240 140 S 1400 120, 1440 130 L1440 200 L0 200 Z" fill="#b6d4a6" opacity="0.55" />
		<path d="M0 178 C 260 150, 520 170, 760 182 S 1200 196, 1440 170 L1440 200 L0 200 Z" fill="#9cc58b" opacity="0.5" />
	</svg>
);

/** Kolase foto produk asli; ilustrasi ikon bila belum ada foto sama sekali. */
const Kolase = ({ produk }) => {
	const berfoto = produk.filter((p) => urlFotoProduk(p.foto)).slice(0, 5);
	if (berfoto.length >= 3) {
		const [a, b, c, d, e] = berfoto;
		const Kotak = ({ p, kelas }) => (
			<div className={`absolute overflow-hidden rounded-3xl border-4 border-white bg-white shadow-2xl shadow-emerald-950/20 ${kelas}`}>
				<img src={urlFotoProduk(p.foto)} alt={p.nama} className="h-full w-full object-cover" loading="lazy" />
			</div>
		);
		return (
			<div className="relative h-full min-h-[18rem] w-full">
				<Kotak p={a} kelas="left-[6%] top-[8%] h-[62%] w-[46%] -rotate-3" />
				<Kotak p={b} kelas="right-[4%] top-[2%] h-[48%] w-[40%] rotate-3" />
				<Kotak p={c} kelas="right-[12%] bottom-[4%] h-[44%] w-[38%] -rotate-2" />
				{d && <Kotak p={d} kelas="left-[26%] bottom-[2%] h-[34%] w-[28%] rotate-2" />}
				{e && <Kotak p={e} kelas="left-0 bottom-[30%] h-[22%] w-[18%] -rotate-6 hidden 2xl:block" />}
			</div>
		);
	}
	// Belum ada foto: ilustrasi kategori yang tetap hidup.
	const ilustrasi = ['Makanan & Minuman', 'Hasil Pertanian', 'Kerajinan Tangan', 'Wisata Desa', 'Produk Herbal', 'Perikanan'];
	return (
		<div className="grid h-full min-h-[16rem] grid-cols-3 content-center gap-3 p-4">
			{ilustrasi.map((k, i) => {
				const m = metaKategori(k);
				return (
					<div key={k} className={`flex aspect-square flex-col items-center justify-center gap-2 rounded-3xl border border-white/70 bg-white/70 shadow-lg shadow-emerald-900/5 backdrop-blur ${i % 2 ? 'translate-y-4' : ''}`}>
						<span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${m.warna}`}><m.ikon className="h-6 w-6" /></span>
						<span className="px-2 text-center text-[10.5px] font-semibold text-stone-600">{k}</span>
					</div>
				);
			})}
		</div>
	);
};

const Kepercayaan = ({ ikon: Ikon, judul, sub }) => (
	<div className="flex items-center gap-2.5">
		<span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100">
			<Ikon className="h-[18px] w-[18px]" />
		</span>
		<div className="leading-tight">
			<p className="text-[12.5px] font-bold text-stone-800">{judul}</p>
			<p className="text-[11px] text-stone-500">{sub}</p>
		</div>
	</div>
);

/* ───────────────────────────── Statistik ───────────────────────────── */

const KartuStatistik = ({ ikon: Ikon, warna, nilai, label, sub, tren }) => (
	<div className="group relative overflow-hidden rounded-3xl border border-stone-200/80 bg-white p-5 shadow-sm shadow-stone-900/[0.03] transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-900/[0.06]">
		<div className="flex items-start gap-4">
			<span className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-white shadow-lg ${warna}`}>
				<Ikon className="h-6 w-6" />
			</span>
			<div className="min-w-0 flex-1">
				<div className="flex items-start justify-between gap-2">
					<p className="text-[28px] font-extrabold leading-none tracking-tight text-stone-900 tabular-nums">{nilai}</p>
					{tren && (
						<span className="inline-flex flex-shrink-0 items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700">
							<TrendingUp className="h-3 w-3" /> {tren}
						</span>
					)}
				</div>
				<p className="mt-1.5 text-sm font-bold text-stone-800">{label}</p>
				<p className="truncate text-xs text-stone-400">{sub}</p>
			</div>
		</div>
	</div>
);

const KerangkaKartu = () => (
	<div className="overflow-hidden rounded-[1.35rem] border border-stone-200/80 bg-white">
		<div className="aspect-square animate-pulse bg-stone-100" />
		<div className="space-y-2 p-3.5">
			<div className="h-4 w-3/4 animate-pulse rounded bg-stone-100" />
			<div className="h-3 w-1/2 animate-pulse rounded bg-stone-100" />
			<div className="h-5 w-1/3 animate-pulse rounded bg-stone-100" />
			<div className="h-9 w-full animate-pulse rounded-xl bg-stone-100" />
		</div>
	</div>
);

/* ───────────────────────────── Halaman ───────────────────────────── */

const KatalogProdukBumdesPage = () => {
	const [saring, setSaring] = useState({ q: '', kategori: '', kecamatan: '', jenis: '', unggulan: false });
	const [cari, setCari] = useState('');
	const [halaman, setHalaman] = useState(1);
	const [data, setData] = useState(null);
	const [memuat, setMemuat] = useState(true);
	const [galat, setGalat] = useState(null);
	const [dibuka, setDibuka] = useState(null);
	const { favorit, ubahFavorit } = useFavorit();
	const refKatalog = useRef(null);
	// Kolase hero diambil sekali dari muatan pertama, supaya tidak berganti-ganti
	// setiap kali saringan berubah.
	const [fotoHero, setFotoHero] = useState(null);

	useEffect(() => {
		const t = setTimeout(() => { setSaring((s) => ({ ...s, q: cari })); setHalaman(1); }, 400);
		return () => clearTimeout(t);
	}, [cari]);

	const muat = useCallback(async () => {
		setMemuat(true);
		setGalat(null);
		try {
			const params = { page: halaman, limit: 12 };
			if (saring.q.trim()) params.q = saring.q.trim();
			if (saring.kategori) params.kategori = saring.kategori;
			if (saring.kecamatan) params.kecamatan = saring.kecamatan;
			if (saring.jenis) params.jenis = saring.jenis;
			if (saring.unggulan) params.unggulan = '1';
			const res = await api.get('/desa/bumdes/katalog-produk', { params });
			const d = res.data?.data || null;
			setData(d);
			setFotoHero((lama) => lama || [...(d?.unggulan || []), ...(d?.produk || [])]);
		} catch (err) {
			setGalat(err.response?.data?.message || 'Gagal memuat katalog');
		} finally {
			setMemuat(false);
		}
	}, [saring, halaman]);

	useEffect(() => { muat(); }, [muat]);

	const ubahSaring = (baru) => { setSaring((s) => ({ ...s, ...baru })); setHalaman(1); };
	const keKatalog = () => refKatalog.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	const adaSaring = Boolean(saring.q || saring.kategori || saring.kecamatan || saring.jenis || saring.unggulan);
	const reset = () => { setCari(''); ubahSaring({ q: '', kategori: '', kecamatan: '', jenis: '', unggulan: false }); };

	const r = data?.ringkasan || {};
	const hlm = data?.halaman || { page: 1, total_halaman: 1, total: 0 };
	const produk = data?.produk || [];
	const unggulan = data?.unggulan || [];
	const wisataPromo = useMemo(
		() => (fotoHero || []).find((p) => p.jenis === 'wisata' && urlFotoProduk(p.foto)),
		[fotoHero],
	);

	const judulKatalog = saring.jenis === 'wisata' ? 'Wisata Desa' : saring.jenis === 'produk' ? 'Produk Desa' : 'Produk & Wisata Desa';

	return (
		<div className="space-y-6">
			{/* ── Hero ─────────────────────────────────────────────── */}
			<section className="relative overflow-hidden rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-[#f6f9f1] via-[#eef5e8] to-[#e3efd9]">
				<div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl" />
				<div className="pointer-events-none absolute -right-20 top-10 h-96 w-96 rounded-full bg-emerald-300/25 blur-3xl" />
				<Perbukitan />

				<div className="relative grid grid-cols-1 gap-6 px-6 pb-10 pt-7 sm:px-9 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:pb-12 lg:pt-9">
					<div className="flex flex-col justify-center">
						<span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm backdrop-blur">
							<Leaf className="h-3.5 w-3.5" /> Produk Lokal, Wisata Desa, Dampak Global
						</span>
						<h1 className="mt-5 text-[2rem] font-extrabold leading-[1.1] tracking-tight text-emerald-950 sm:text-[2.6rem] xl:text-[3rem]">
							Marketplace Produk <br className="hidden sm:block" />
							dan Wisata <span className="bg-gradient-to-r from-amber-700 to-amber-900 bg-clip-text text-transparent">Desa Kabupaten Bogor</span>
						</h1>
						<p className="mt-4 max-w-xl text-[15px] leading-7 text-stone-600">
							Dukung produk unggulan desa, tingkatkan ekonomi masyarakat, sekaligus jelajahi keindahan wisata desa
							di Kabupaten Bogor yang lebih sejahtera.
						</p>

						{/* Pencarian utama */}
						<div className="mt-6 flex max-w-xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-xl shadow-emerald-900/10 ring-1 ring-emerald-100 sm:flex-row">
							<div className="relative flex-1">
								<Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
								<input
									value={cari}
									onChange={(e) => setCari(e.target.value)}
									onKeyDown={(e) => { if (e.key === 'Enter') keKatalog(); }}
									placeholder="Cari kopi, madu, paket wisata, nama desa…"
									className="h-12 w-full rounded-xl bg-transparent pl-11 pr-9 text-sm text-stone-900 outline-none placeholder:text-stone-400"
								/>
								{cari && (
									<button type="button" onClick={() => setCari('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-stone-400 hover:bg-stone-100" aria-label="Hapus pencarian">
										<X className="h-4 w-4" />
									</button>
								)}
							</div>
							<button type="button" onClick={keKatalog}
								className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 text-sm font-bold text-white shadow-lg shadow-emerald-900/25 transition-all hover:bg-emerald-900">
								<ShoppingBag className="h-4 w-4" /> Jelajahi Produk &amp; Wisata <ArrowRight className="h-4 w-4" />
							</button>
						</div>

						<div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
							<Kepercayaan ikon={Leaf} judul="100% Produk Lokal" sub="Dari desa terbaik" />
							<Kepercayaan ikon={Users} judul="Dukung Ekonomi Desa" sub="dan UMKM" />
							<Kepercayaan ikon={ShieldCheck} judul="Aman & Terpercaya" sub="Dikelola DPMD Kab. Bogor" />
						</div>
					</div>

					<div className="relative hidden lg:block">
						<div className="absolute right-0 top-0 z-10 flex items-center gap-2.5 rounded-2xl bg-white/85 px-3 py-2 shadow-sm backdrop-blur">
							<img src="/logo-bogor.png" alt="" className="h-9 w-auto" />
							<div className="leading-tight">
								<p className="text-sm font-extrabold text-emerald-950">DPMD</p>
								<p className="text-[10.5px] font-medium text-stone-500">Kabupaten Bogor</p>
							</div>
						</div>
						<Kolase produk={fotoHero || []} />
						<p className="absolute bottom-2 left-2 z-10 rotate-[-4deg] font-serif text-lg italic leading-snug text-emerald-900/80 drop-shadow-sm">
							Produk Lokal · Jelajah Wisata Desa<br />Kebanggaan Bersama
						</p>
					</div>
				</div>
			</section>

			{/* ── Statistik ───────────────────────────────────────── */}
			<section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<KartuStatistik ikon={Box} warna="bg-gradient-to-br from-emerald-600 to-emerald-800 shadow-emerald-700/25"
					nilai={nf.format(r.total_produk ?? 0)} label="Total Produk" sub="Dari seluruh BUM Desa"
					tren={r.produk_baru_30_hari ? `+${nf.format(r.produk_baru_30_hari)} bulan ini` : null} />
				<KartuStatistik ikon={Store} warna="bg-gradient-to-br from-amber-700 to-amber-900 shadow-amber-800/25"
					nilai={nf.format(r.bumdes_berproduk ?? 0)} label="BUM Desa Aktif"
					sub={`Dari ${nf.format(r.jumlah_kecamatan ?? 0)} kecamatan · ${nf.format(r.total_bumdes ?? 0)} terdata`} />
				<KartuStatistik ikon={LayoutGrid} warna="bg-gradient-to-br from-teal-600 to-emerald-800 shadow-teal-700/25"
					nilai={nf.format(r.jumlah_kategori ?? 0)} label="Kategori Produk"
					sub={`${nf.format(r.jumlah_wisata ?? 0)} paket wisata desa`} />
				<KartuStatistik ikon={Star} warna="bg-gradient-to-br from-yellow-500 to-amber-600 shadow-amber-500/25"
					nilai={nf.format(r.produk_unggulan ?? 0)} label="Produk Unggulan" sub="Produk terbaik pilihan" />
			</section>

			{/* ── Pilihan unggulan (tanpa saringan) ─────────────────── */}
			{!adaSaring && unggulan.length > 0 && (
				<section className="rounded-[1.75rem] border border-amber-200/70 bg-gradient-to-r from-amber-50 via-white to-emerald-50 p-5">
					<div className="mb-4 flex items-end justify-between gap-3">
						<div>
							<p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-700"><Sparkles className="h-3.5 w-3.5" /> Pilihan unggulan</p>
							<h2 className="text-lg font-extrabold tracking-tight text-stone-900">Produk Unggulan BUM Desa</h2>
						</div>
						<button type="button" onClick={() => { ubahSaring({ unggulan: true }); keKatalog(); }}
							className="inline-flex items-center gap-1 text-sm font-bold text-emerald-800 hover:text-emerald-950">
							Lihat semua <ArrowRight className="h-4 w-4" />
						</button>
					</div>
					<div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2">
						{unggulan.map((p) => (
							<div key={p.id} className="w-[210px] flex-shrink-0 snap-start">
								<KartuProduk produk={p} onBuka={setDibuka} favorit={favorit.has(String(p.id))} onFavorit={ubahFavorit} />
							</div>
						))}
					</div>
				</section>
			)}

			<div ref={refKatalog} className="grid scroll-mt-4 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
				{/* ── Katalog ──────────────────────────────────────── */}
				<section className="min-w-0 space-y-4">
					<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
						<div>
							<h2 className="text-2xl font-extrabold tracking-tight text-stone-900">{judulKatalog}</h2>
							<p className="text-sm text-stone-500">
								{memuat && !data ? 'Memuat…' : `${nf.format(hlm.total)} pilihan dari BUM Desa di Kabupaten Bogor`}
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<div className="inline-flex rounded-full border border-stone-200 bg-white p-1 shadow-sm">
								{TAB_JENIS.map((t) => (
									<button key={t.id || 'semua'} type="button" onClick={() => ubahSaring({ jenis: t.id, kategori: '' })}
										className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-bold transition-all ${
											saring.jenis === t.id ? 'bg-emerald-800 text-white shadow' : 'text-stone-600 hover:text-emerald-800'
										}`}>
										<t.ikon className="h-3.5 w-3.5" /> {t.label}
									</button>
								))}
							</div>
							<div className="relative">
								<MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
								<select value={saring.kecamatan} onChange={(e) => ubahSaring({ kecamatan: e.target.value })}
									className="h-10 appearance-none rounded-full border border-stone-200 bg-white pl-9 pr-8 text-[13px] font-semibold text-stone-700 shadow-sm outline-none focus:border-emerald-400">
									<option value="">Semua kecamatan</option>
									{(data?.kecamatan || []).map((k) => <option key={k} value={k}>Kec. {k}</option>)}
								</select>
							</div>
						</div>
					</div>

					{/* Saringan aktif */}
					{adaSaring && (
						<div className="flex flex-wrap items-center gap-2">
							{saring.q && <Chip onHapus={() => setCari('')}>“{saring.q}”</Chip>}
							{saring.kategori && <Chip onHapus={() => ubahSaring({ kategori: '' })}>{saring.kategori}</Chip>}
							{saring.kecamatan && <Chip onHapus={() => ubahSaring({ kecamatan: '' })}>Kec. {saring.kecamatan}</Chip>}
							{saring.unggulan && <Chip onHapus={() => ubahSaring({ unggulan: false })}>★ Unggulan</Chip>}
							<button type="button" onClick={reset} className="text-xs font-bold text-stone-500 underline-offset-2 hover:text-stone-900 hover:underline">Hapus semua</button>
						</div>
					)}

					{galat && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{galat}</p>}

					{memuat && !data ? (
						<div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-4">
							{Array.from({ length: 8 }).map((_, i) => <KerangkaKartu key={i} />)}
						</div>
					) : produk.length === 0 ? (
						<div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
							<span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600"><Compass className="h-8 w-8" /></span>
							<p className="mt-4 text-base font-bold text-stone-800">{adaSaring ? 'Belum ada yang cocok' : 'Katalog masih kosong'}</p>
							<p className="mt-1 max-w-sm text-sm text-stone-500">
								{adaSaring ? 'Coba kata kunci lain atau hapus saringan.' : 'Jadilah BUM Desa pertama yang menampilkan produk atau paket wisatanya di sini.'}
							</p>
							{adaSaring
								? <button type="button" onClick={reset} className="mt-4 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-900">Tampilkan semua</button>
								: <Link to="/desa/bumdes#produk" className="mt-4 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-900">Tambah produk</Link>}
						</div>
					) : (
						<div className={`grid grid-cols-2 gap-4 transition-opacity md:grid-cols-3 2xl:grid-cols-4 ${memuat ? 'opacity-50' : ''}`}>
							{produk.map((p) => (
								<KartuProduk key={p.id} produk={p} onBuka={setDibuka} favorit={favorit.has(String(p.id))} onFavorit={ubahFavorit} />
							))}
						</div>
					)}

					{hlm.total_halaman > 1 && (
						<div className="flex items-center justify-center gap-2 pt-2">
							<button type="button" disabled={hlm.page <= 1} onClick={() => { setHalaman((h) => h - 1); keKatalog(); }}
								className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 shadow-sm hover:bg-stone-50 disabled:opacity-40" aria-label="Sebelumnya">
								<ChevronLeft className="h-4 w-4" />
							</button>
							<span className="rounded-full bg-white px-4 py-2 text-sm text-stone-600 shadow-sm ring-1 ring-stone-200">
								Halaman <strong className="text-stone-900">{hlm.page}</strong> dari {hlm.total_halaman}
							</span>
							<button type="button" disabled={hlm.page >= hlm.total_halaman} onClick={() => { setHalaman((h) => h + 1); keKatalog(); }}
								className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 shadow-sm hover:bg-stone-50 disabled:opacity-40" aria-label="Berikutnya">
								<ChevronRight className="h-4 w-4" />
							</button>
						</div>
					)}
				</section>

				{/* ── Sisi kanan ───────────────────────────────────── */}
				<aside className="space-y-5 xl:sticky xl:top-4 xl:self-start">
					<section className="rounded-[1.75rem] border border-stone-200/80 bg-white p-5 shadow-sm shadow-stone-900/[0.03]">
						<div className="mb-3 flex items-center justify-between">
							<h3 className="text-base font-extrabold tracking-tight text-stone-900">Kategori Populer</h3>
							{saring.kategori && (
								<button type="button" onClick={() => ubahSaring({ kategori: '' })} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800">
									Lihat semua <ArrowRight className="h-3.5 w-3.5" />
								</button>
							)}
						</div>
						{(data?.kategori || []).length === 0 ? (
							<p className="rounded-2xl bg-stone-50 px-4 py-5 text-center text-xs text-stone-400">Belum ada kategori.</p>
						) : (
							<div className="space-y-1">
								{data.kategori.slice(0, 8).map((k) => {
									const m = metaKategori(k.nama);
									const aktif = saring.kategori === k.nama;
									return (
										<button key={k.nama} type="button"
											onClick={() => { ubahSaring({ kategori: aktif ? '' : k.nama, jenis: '' }); keKatalog(); }}
											className={`group flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-colors ${aktif ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'hover:bg-stone-50'}`}>
											<span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${m.warna}`}><m.ikon className="h-5 w-5" /></span>
											<span className="min-w-0 flex-1">
												<span className="block truncate text-sm font-bold text-stone-800">{k.nama}</span>
												<span className="block text-[11px] text-stone-400">{nf.format(k.jumlah)} produk</span>
											</span>
											<ChevronRight className={`h-4 w-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5 ${aktif ? 'text-emerald-700' : 'text-stone-300'}`} />
										</button>
									);
								})}
							</div>
						)}
					</section>

					{/* Promosi wisata desa */}
					<section className="relative overflow-hidden rounded-[1.75rem] bg-emerald-950 text-white shadow-xl shadow-emerald-950/20">
						{wisataPromo ? (
							<img src={urlFotoProduk(wisataPromo.foto)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
						) : (
							<svg className="absolute inset-x-0 bottom-0 h-32 w-full opacity-40" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true">
								<path d="M0 90 L70 40 L120 75 L190 20 L260 80 L320 45 L400 85 L400 120 L0 120 Z" fill="#34d399" />
								<path d="M0 105 L90 70 L170 100 L250 65 L330 95 L400 80 L400 120 L0 120 Z" fill="#065f46" />
							</svg>
						)}
						<div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/70 to-emerald-900/30" />
						<div className="relative p-5 pt-24">
							<p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Jelajah</p>
							<h3 className="text-xl font-extrabold leading-tight">Wisata Desa Kabupaten Bogor</h3>
							<p className="mt-1.5 text-sm leading-6 text-emerald-100/85">Nikmati keindahan alam, budaya, dan kearifan lokal desa-desa di Bogor.</p>
							<button type="button" onClick={() => { ubahSaring({ jenis: 'wisata', kategori: '' }); keKatalog(); }}
								className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-900 shadow-sm transition-all hover:gap-2.5">
								Rencanakan Perjalanan <ArrowRight className="h-4 w-4" />
							</button>
						</div>
					</section>

					<section className="rounded-[1.75rem] border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5">
						<p className="flex items-center gap-2 font-extrabold text-stone-900"><Store className="h-4 w-4 text-amber-700" /> Jual produk BUM Desa Anda</p>
						<p className="mt-1 text-sm leading-6 text-stone-600">Tambahkan foto menarik, harga jelas, dan nomor WhatsApp agar pembeli langsung memesan.</p>
						<Link to="/desa/bumdes#produk" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-amber-800 hover:gap-2 transition-all">
							Kelola produk <ArrowRight className="h-4 w-4" />
						</Link>
					</section>
				</aside>
			</div>

			{dibuka && (
				<ModalDetailProduk produk={dibuka} onTutup={() => setDibuka(null)}
					favorit={favorit.has(String(dibuka.id))} onFavorit={ubahFavorit} />
			)}
			{memuat && data && (
				<div className="pointer-events-none fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-full bg-emerald-950/90 px-4 py-2 text-xs font-semibold text-white shadow-lg">
					<Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" /> Memuat…
				</div>
			)}
		</div>
	);
};

const Chip = ({ children, onHapus }) => (
	<span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800 py-1 pl-3 pr-1.5 text-xs font-semibold text-white">
		{children}
		<button type="button" onClick={onHapus} className="rounded-full p-0.5 hover:bg-white/20" aria-label="Hapus saringan"><X className="h-3 w-3" /></button>
	</span>
);

export default KatalogProdukBumdesPage;
