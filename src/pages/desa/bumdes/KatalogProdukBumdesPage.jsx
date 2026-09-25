// src/pages/desa/bumdes/KatalogProdukBumdesPage.jsx
//
// Katalog Produk BUMDes Kabupaten Bogor — etalase produk seluruh BUM Desa,
// seperti e-commerce tetapi TANPA transaksi di aplikasi: pembeli menghubungi
// BUM Desa lewat WhatsApp atau toko daringnya.
//
// Untuk akun operator yang hanya memegang BUMDes, halaman ini sekaligus
// menjadi Dashboard (lihat DesaBerandaPage).
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
	FiArrowRight, FiBox, FiChevronLeft, FiChevronRight, FiHome, FiLoader, FiMapPin,
	FiSearch, FiStar, FiTag, FiX, FiZap,
} from 'react-icons/fi';
import api from '../../../api';
import {
	KartuProduk, ModalDetailProduk, FotoProduk, hargaProduk,
} from '../../../components/bumdes/KatalogProdukUI';

const Statistik = ({ ikon: Ikon, label, nilai, sub }) => (
	<div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
		<div className="flex items-center gap-2 text-slate-400">
			<Ikon className="h-4 w-4" />
			<span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
		</div>
		<p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-white">{nilai}</p>
		<p className="mt-0.5 truncate text-xs text-slate-400">{sub}</p>
	</div>
);

const ChipSaring = ({ aktif, onClick, children, jumlah }) => (
	<button
		type="button"
		onClick={onClick}
		className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-all ${
			aktif
				? 'border-slate-900 bg-slate-900 text-white shadow-sm'
				: 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900'
		}`}
	>
		{children}
		{jumlah !== undefined && (
			<span className={`rounded-full px-1.5 text-[10.5px] font-semibold tabular-nums ${aktif ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>{jumlah}</span>
		)}
	</button>
);

const KerangkaKartu = () => (
	<div className="rounded-2xl border border-slate-200/80 bg-white p-2.5">
		<div className="aspect-square animate-pulse rounded-xl bg-slate-100" />
		<div className="space-y-2 px-1.5 pb-1 pt-3">
			<div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
			<div className="h-3 w-full animate-pulse rounded bg-slate-100" />
			<div className="h-5 w-1/3 animate-pulse rounded bg-slate-100" />
		</div>
	</div>
);

const KatalogProdukBumdesPage = () => {
	const [saring, setSaring] = useState({ q: '', kategori: '', kecamatan: '', unggulan: false });
	const [cari, setCari] = useState('');
	const [halaman, setHalaman] = useState(1);
	const [data, setData] = useState(null);
	const [memuat, setMemuat] = useState(true);
	const [galat, setGalat] = useState(null);
	const [dibuka, setDibuka] = useState(null);

	// Pencarian diketik bebas; permintaan baru dikirim setelah jeda singkat.
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
			if (saring.unggulan) params.unggulan = '1';
			const res = await api.get('/desa/bumdes/katalog-produk', { params });
			setData(res.data?.data || null);
		} catch (err) {
			setGalat(err.response?.data?.message || 'Gagal memuat katalog produk');
		} finally {
			setMemuat(false);
		}
	}, [saring, halaman]);

	useEffect(() => { muat(); }, [muat]);

	const ubahSaring = (k, v) => { setSaring((s) => ({ ...s, [k]: v })); setHalaman(1); };
	const adaSaring = Boolean(saring.q || saring.kategori || saring.kecamatan || saring.unggulan);
	const reset = () => { setCari(''); setSaring({ q: '', kategori: '', kecamatan: '', unggulan: false }); setHalaman(1); };

	const r = data?.ringkasan || {};
	const hlm = data?.halaman || { page: 1, total_halaman: 1, total: 0 };
	const tanggal = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
	const produk = data?.produk || [];

	return (
		<div className="space-y-6">
			{/* Hero */}
			<section className="relative overflow-hidden rounded-3xl bg-slate-950 px-5 py-7 sm:px-8 sm:py-9">
				{/* Ornamen cahaya */}
				<div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-600/30 blur-3xl" />
				<div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:22px_22px]" />

				<div className="relative">
					<div className="flex flex-wrap items-center gap-2">
						<span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-200 ring-1 ring-white/10">
							<FiZap className="h-3 w-3" /> Katalog Produk BUMDes
						</span>
						<span className="text-xs text-slate-400">{tanggal}</span>
					</div>
					<h1 className="mt-4 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
						Produk unggulan BUMDes <span className="bg-gradient-to-r from-brand-300 to-amber-300 bg-clip-text text-transparent">Kabupaten Bogor</span>
					</h1>
					<p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
						Temukan produk dari BUM Desa di seluruh Kabupaten Bogor. Dukung produk lokal, majukan ekonomi desa.
					</p>

					{/* Pencarian utama */}
					<div className="mt-6 flex max-w-3xl flex-col gap-2 sm:flex-row">
						<div className="relative flex-1">
							<FiSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
							<input
								value={cari}
								onChange={(e) => setCari(e.target.value)}
								placeholder="Cari produk, nama BUMDes, atau desa…"
								className="h-12 w-full rounded-2xl border-0 bg-white pl-12 pr-10 text-sm text-slate-900 shadow-xl shadow-black/20 outline-none ring-4 ring-transparent transition-all placeholder:text-slate-400 focus:ring-brand-500/30"
							/>
							{cari && (
								<button type="button" onClick={() => setCari('')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Hapus pencarian">
									<FiX className="h-4 w-4" />
								</button>
							)}
						</div>
						<div className="relative sm:w-56">
							<FiMapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
							<select
								value={saring.kecamatan}
								onChange={(e) => ubahSaring('kecamatan', e.target.value)}
								className="h-12 w-full appearance-none rounded-2xl border-0 bg-white/10 pl-10 pr-4 text-sm font-medium text-white outline-none ring-1 ring-white/15 transition-colors hover:bg-white/15 focus:ring-2 focus:ring-white/30 [&>option]:text-slate-900"
							>
								<option value="">Semua kecamatan</option>
								{(data?.kecamatan || []).map((k) => <option key={k} value={k}>Kec. {k}</option>)}
							</select>
						</div>
					</div>

					{/* Statistik */}
					<div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
						<Statistik ikon={FiBox} label="Total Produk" nilai={r.total_produk ?? '—'} sub="produk dari BUMDes" />
						<Statistik ikon={FiHome} label="BUMDes Berproduk" nilai={r.bumdes_berproduk ?? '—'} sub={`dari ${r.total_bumdes ?? '—'} BUMDes terdata`} />
						<Statistik ikon={FiTag} label="Kategori" nilai={r.jumlah_kategori ?? '—'} sub="kategori produk" />
						<Statistik ikon={FiStar} label="Unggulan" nilai={r.produk_unggulan ?? '—'} sub="produk pilihan" />
					</div>
				</div>
			</section>

			<div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
				{/* Katalog */}
				<section className="min-w-0 space-y-4">
					<div className="flex flex-wrap items-end justify-between gap-2">
						<div>
							<h2 className="text-lg font-bold tracking-tight text-slate-900">Katalog Produk</h2>
							<p className="text-sm text-slate-500">
								{memuat && !data ? 'Memuat…' : `${hlm.total} produk${adaSaring ? ' sesuai saringan' : ''}`}
							</p>
						</div>
						{adaSaring && (
							<button type="button" onClick={reset} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900">
								<FiX className="h-3.5 w-3.5" /> Hapus saringan
							</button>
						)}
					</div>

					{/* Chip kategori */}
					<div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
						<ChipSaring aktif={!saring.kategori && !saring.unggulan} onClick={() => { ubahSaring('kategori', ''); ubahSaring('unggulan', false); }}>
							Semua
						</ChipSaring>
						<ChipSaring aktif={saring.unggulan} onClick={() => ubahSaring('unggulan', !saring.unggulan)}>
							<FiStar className="h-3.5 w-3.5" /> Unggulan
						</ChipSaring>
						{(data?.kategori || []).map((k) => (
							<ChipSaring key={k.nama} aktif={saring.kategori === k.nama} jumlah={k.jumlah}
								onClick={() => ubahSaring('kategori', saring.kategori === k.nama ? '' : k.nama)}>
								{k.nama}
							</ChipSaring>
						))}
					</div>

					{galat && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{galat}</p>}

					{memuat && !data ? (
						<div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
							{Array.from({ length: 6 }).map((_, i) => <KerangkaKartu key={i} />)}
						</div>
					) : produk.length === 0 ? (
						<div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
							<span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 ring-1 ring-slate-200"><FiBox className="h-6 w-6" /></span>
							<p className="mt-4 text-sm font-semibold text-slate-700">
								{adaSaring ? 'Tidak ada produk yang cocok' : 'Katalog masih kosong'}
							</p>
							<p className="mt-1 max-w-sm text-xs text-slate-500">
								{adaSaring ? 'Coba kata kunci lain atau hapus saringan.' : 'Jadilah BUMDes pertama yang menampilkan produknya di sini.'}
							</p>
						</div>
					) : (
						<div className={`grid grid-cols-2 gap-4 transition-opacity lg:grid-cols-3 ${memuat ? 'opacity-50' : ''}`}>
							{produk.map((p) => <KartuProduk key={p.id} produk={p} onBuka={setDibuka} />)}
						</div>
					)}

					{hlm.total_halaman > 1 && (
						<div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm">
							<span className="text-slate-500">Halaman <strong className="text-slate-900">{hlm.page}</strong> dari {hlm.total_halaman}</span>
							<div className="flex gap-1.5">
								<button type="button" disabled={hlm.page <= 1} onClick={() => setHalaman((h) => h - 1)}
									className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40" aria-label="Sebelumnya">
									<FiChevronLeft />
								</button>
								<button type="button" disabled={hlm.page >= hlm.total_halaman} onClick={() => setHalaman((h) => h + 1)}
									className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40" aria-label="Berikutnya">
									<FiChevronRight />
								</button>
							</div>
						</div>
					)}
				</section>

				{/* Produk unggulan + ajakan */}
				<aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
					<section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.03]">
						<div className="flex items-center justify-between">
							<h2 className="font-bold tracking-tight text-slate-900">Produk Unggulan</h2>
							<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700"><FiStar className="h-3.5 w-3.5" /></span>
						</div>
						<p className="mb-4 mt-0.5 text-xs text-slate-500">Pilihan terbaik dari BUMDes Kabupaten Bogor.</p>
						{(data?.unggulan || []).length === 0 ? (
							<p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-xs text-slate-400">Belum ada produk unggulan.</p>
						) : (
							<div className="space-y-2">
								{data.unggulan.map((p, i) => (
									<button key={p.id} type="button" onClick={() => setDibuka(p)}
										className="group flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-slate-50">
										<div className="relative w-[72px] flex-shrink-0">
											<FotoProduk foto={p.foto} nama={p.nama} />
											<span className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white ring-2 ring-white">{i + 1}</span>
										</div>
										<div className="min-w-0 flex-1">
											<p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">{p.nama}</p>
											<p className="truncate text-xs text-slate-400">{p.bumdes?.nama}</p>
											<p className="mt-0.5 text-sm font-bold text-brand-600">{hargaProduk(p)}</p>
										</div>
										<FiArrowRight className="h-4 w-4 flex-shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-600" />
									</button>
								))}
							</div>
						)}
					</section>

					<section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white">
						<div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
						<p className="relative text-base font-bold">Promosikan produk BUMDes Anda</p>
						<p className="relative mt-1 text-sm leading-6 text-white/80">Tambahkan foto yang menarik dan harga yang jelas agar mudah ditemukan pembeli.</p>
						<Link to="/desa/bumdes#produk"
							className="relative mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 shadow-sm transition-all hover:gap-2.5">
							Kelola produk <FiArrowRight className="h-4 w-4" />
						</Link>
					</section>
				</aside>
			</div>

			{dibuka && <ModalDetailProduk produk={dibuka} onTutup={() => setDibuka(null)} />}
		</div>
	);
};

export default KatalogProdukBumdesPage;
