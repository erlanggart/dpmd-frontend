// src/pages/desa/bumdes/KatalogProdukBumdesPage.jsx
//
// Marketplace produk & wisata seluruh BUM Desa Kabupaten Bogor, bergaya toko
// daring (banner ringkas → kategori → grid produk rapat). TANPA transaksi di
// aplikasi: tombol Pesan membuka WhatsApp langsung ke nomor pemilik produk.
//
// Untuk akun operator yang hanya memegang BUMDes, halaman ini sekaligus
// menjadi Dashboard (lihat DesaBerandaPage).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
	ChevronLeft, ChevronRight, MapPin, MessageCircle, Mountain,
	Search, ShoppingBag, Star, Store, X,
} from 'lucide-react';
import api from '../../../api';
import {
	ModalDetailProduk, hargaProduk, adaHarga, metaKategori, tautanPesan, urlFotoProduk, useFavorit,
} from '../../../components/bumdes/KatalogProdukUI';

const nf = new Intl.NumberFormat('id-ID');

const TAB_JENIS = [
	{ id: '', label: 'Semua' },
	{ id: 'produk', label: 'Produk Desa' },
	{ id: 'wisata', label: 'Wisata Desa' },
];

/* ───────────────────────────── Banner ───────────────────────────── */

/** Banner utama bergeser otomatis; foto produk asli dipakai bila ada. */
const BannerUtama = ({ slides }) => {
	const [aktif, setAktif] = useState(0);
	const jumlah = slides.length;
	useEffect(() => {
		if (jumlah < 2) return undefined;
		const t = setInterval(() => setAktif((i) => (i + 1) % jumlah), 5000);
		return () => clearInterval(t);
	}, [jumlah]);

	return (
		<div className="group relative h-full overflow-hidden rounded-xl">
			{slides.map((s, i) => (
				<div key={s.id} className={`absolute inset-0 transition-opacity duration-700 ${i === aktif ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
					<div className={`absolute inset-0 ${s.latar}`} />
					{s.foto && (
						<img src={s.foto} alt="" className="absolute inset-y-0 right-0 h-full w-1/2 object-cover [mask-image:linear-gradient(to_right,transparent,black_35%)]" />
					)}
					<div className="relative flex h-full max-w-[60%] flex-col justify-center px-6 sm:px-8">
						<p className="text-xs font-semibold uppercase tracking-wider text-white/75">{s.kecil}</p>
						<h2 className="mt-1 text-xl font-bold leading-tight text-white sm:text-2xl">{s.judul}</h2>
						<p className="mt-1.5 hidden text-sm text-white/85 sm:block">{s.teks}</p>
						<button type="button" onClick={s.aksi}
							className="mt-3 w-fit rounded-lg bg-white px-3.5 py-1.5 text-xs font-bold text-stone-900 shadow-sm transition-transform hover:scale-[1.03]">
							{s.tombol}
						</button>
					</div>
				</div>
			))}
			{jumlah > 1 && (
				<>
					<button type="button" onClick={() => setAktif((i) => (i - 1 + jumlah) % jumlah)} aria-label="Sebelumnya"
						className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/25 text-white opacity-0 transition-opacity hover:bg-black/40 group-hover:opacity-100">
						<ChevronLeft className="h-4 w-4" />
					</button>
					<button type="button" onClick={() => setAktif((i) => (i + 1) % jumlah)} aria-label="Berikutnya"
						className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/25 text-white opacity-0 transition-opacity hover:bg-black/40 group-hover:opacity-100">
						<ChevronRight className="h-4 w-4" />
					</button>
					<div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
						{slides.map((s, i) => (
							<button key={s.id} type="button" onClick={() => setAktif(i)} aria-label={`Banner ${i + 1}`}
								className={`h-1.5 rounded-full transition-all ${i === aktif ? 'w-5 bg-white' : 'w-1.5 bg-white/55'}`} />
						))}
					</div>
				</>
			)}
		</div>
	);
};

const BannerKecil = ({ latar, ikon: Ikon, kecil, judul, foto, onClick }) => (
	<button type="button" onClick={onClick} className="group relative h-full overflow-hidden rounded-xl text-left">
		<div className={`absolute inset-0 ${latar}`} />
		{foto && <img src={foto} alt="" className="absolute inset-y-0 right-0 h-full w-2/5 object-cover opacity-90 [mask-image:linear-gradient(to_right,transparent,black_45%)]" />}
		<div className="relative flex h-full items-center gap-3 px-4">
			<span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-white"><Ikon className="h-5 w-5" /></span>
			<div className="min-w-0">
				<p className="text-[11px] font-semibold uppercase tracking-wider text-white/75">{kecil}</p>
				<p className="truncate text-sm font-bold text-white group-hover:underline">{judul}</p>
			</div>
		</div>
	</button>
);

/* ───────────────────────────── Kartu produk ───────────────────────────── */

/** Kartu gaya marketplace: rapat, foto persegi, harga menonjol. */
const KartuToko = ({ p, onBuka, favorit, onFavorit }) => {
	const wa = tautanPesan(p);
	const foto = urlFotoProduk(p.foto);
	const m = metaKategori(p.kategori);
	return (
		<article className="group relative flex flex-col overflow-hidden rounded-lg border border-stone-200/80 bg-white transition-all hover:-translate-y-0.5 hover:border-emerald-600 hover:shadow-md">
			<button type="button" onClick={() => onBuka(p)} className="relative block aspect-square w-full overflow-hidden bg-stone-100">
				{foto ? (
					<img src={foto} alt={p.nama} loading="lazy" className="h-full w-full object-cover" />
				) : (
					<span className="flex h-full w-full items-center justify-center text-stone-300"><m.ikon className="h-9 w-9" strokeWidth={1.5} /></span>
				)}
				{p.unggulan && (
					<span className="absolute left-0 top-2 rounded-r-md bg-emerald-700 px-1.5 py-0.5 text-[10px] font-bold text-white">Unggulan</span>
				)}
				{p.jenis === 'wisata' && (
					<span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/55 to-transparent px-2 pb-1.5 pt-4 text-[10px] font-semibold text-white">Paket Wisata</span>
				)}
			</button>
			<button type="button" onClick={() => onFavorit(p.id)} aria-label={favorit ? 'Hapus dari favorit' : 'Tambah ke favorit'}
				className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-sm shadow-sm">
				<span className={favorit ? 'text-rose-500' : 'text-stone-400'}>{favorit ? '♥' : '♡'}</span>
			</button>

			<div className="flex flex-1 flex-col p-2.5">
				<button type="button" onClick={() => onBuka(p)} className="text-left">
					<h3 className="line-clamp-2 min-h-[2.5rem] text-[13px] leading-5 text-stone-800">{p.nama}</h3>
				</button>
				<p className="mt-1.5 truncate">
					<span className="text-base font-semibold text-emerald-700">{hargaProduk(p)}</span>
					{adaHarga(p) && p.satuan && <span className="text-[11px] text-stone-400"> /{p.satuan}</span>}
				</p>
				<div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
					<p className="flex min-w-0 items-center gap-1 truncate text-[11px] text-stone-500">
						<MapPin className="h-3 w-3 flex-shrink-0" /> <span className="truncate">{p.bumdes?.kecamatan || '-'}</span>
					</p>
					{wa && (
						<a href={wa} target="_blank" rel="noreferrer" title="Pesan via WhatsApp"
							className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-700 hover:text-white">
							<MessageCircle className="h-3.5 w-3.5" />
						</a>
					)}
				</div>
			</div>
		</article>
	);
};

const KerangkaKartu = () => (
	<div className="overflow-hidden rounded-lg border border-stone-200/80 bg-white">
		<div className="aspect-square animate-pulse bg-stone-100" />
		<div className="space-y-2 p-2.5">
			<div className="h-3 w-full animate-pulse rounded bg-stone-100" />
			<div className="h-3 w-2/3 animate-pulse rounded bg-stone-100" />
			<div className="h-4 w-1/2 animate-pulse rounded bg-stone-100" />
		</div>
	</div>
);

const Kartu = ({ judul, kanan, children, kelas = '' }) => (
	<section className={`rounded-xl bg-white shadow-sm ring-1 ring-stone-200/70 ${kelas}`}>
		{judul && (
			<div className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-3">
				<h2 className="text-[15px] font-semibold uppercase tracking-wide text-stone-500">{judul}</h2>
				{kanan}
			</div>
		)}
		{children}
	</section>
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
	const refProduk = useRef(null);
	// Foto banner diambil sekali dari muatan pertama, supaya tidak berganti
	// setiap saringan berubah.
	const [fotoBanner, setFotoBanner] = useState(null);

	const muat = useCallback(async () => {
		setMemuat(true);
		setGalat(null);
		try {
			const params = { page: halaman, limit: 24 };
			if (saring.q.trim()) params.q = saring.q.trim();
			if (saring.kategori) params.kategori = saring.kategori;
			if (saring.kecamatan) params.kecamatan = saring.kecamatan;
			if (saring.jenis) params.jenis = saring.jenis;
			if (saring.unggulan) params.unggulan = '1';
			const res = await api.get('/desa/bumdes/katalog-produk', { params });
			const d = res.data?.data || null;
			setData(d);
			setFotoBanner((lama) => lama || [...(d?.unggulan || []), ...(d?.produk || [])]);
		} catch (err) {
			setGalat(err.response?.data?.message || 'Gagal memuat katalog');
		} finally {
			setMemuat(false);
		}
	}, [saring, halaman]);

	useEffect(() => { muat(); }, [muat]);

	const keProduk = () => refProduk.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	const ubahSaring = (baru, gulir = false) => {
		setSaring((s) => ({ ...s, ...baru }));
		setHalaman(1);
		if (gulir) setTimeout(keProduk, 50);
	};
	const kirimCari = (e) => { e.preventDefault(); ubahSaring({ q: cari }, true); };
	const adaSaring = Boolean(saring.q || saring.kategori || saring.kecamatan || saring.jenis || saring.unggulan);
	const reset = () => { setCari(''); ubahSaring({ q: '', kategori: '', kecamatan: '', jenis: '', unggulan: false }); };

	const r = data?.ringkasan || {};
	const hlm = data?.halaman || { page: 1, total_halaman: 1, total: 0 };
	const produk = data?.produk || [];

	// Foto untuk banner: produk berfoto; wisata dipisah untuk banner wisata.
	const foto = useMemo(() => {
		const berfoto = (fotoBanner || []).filter((p) => urlFotoProduk(p.foto));
		const wisata = berfoto.find((p) => p.jenis === 'wisata');
		const lain = berfoto.filter((p) => p.jenis !== 'wisata');
		return {
			a: urlFotoProduk(lain[0]?.foto), b: urlFotoProduk(lain[1]?.foto || lain[0]?.foto),
			wisata: urlFotoProduk(wisata?.foto), unggulan: urlFotoProduk((fotoBanner || []).find((p) => p.unggulan && p.foto)?.foto),
		};
	}, [fotoBanner]);

	const slides = [
		{
			id: 'belanja', latar: 'bg-gradient-to-r from-emerald-800 to-emerald-600', foto: foto.a,
			kecil: 'Katalog BUM Desa', judul: 'Produk Asli Desa Kabupaten Bogor',
			teks: `${nf.format(r.total_produk ?? 0)} produk dari ${nf.format(r.bumdes_berproduk ?? 0)} BUM Desa — pesan langsung ke penjualnya.`,
			tombol: 'Belanja sekarang', aksi: () => ubahSaring({ jenis: 'produk' }, true),
		},
		{
			id: 'wisata', latar: 'bg-gradient-to-r from-teal-800 to-cyan-600', foto: foto.wisata,
			kecil: 'Wisata Desa', judul: 'Jelajahi Wisata Desa',
			teks: 'Alam, budaya, dan kearifan lokal desa-desa di Bogor.',
			tombol: 'Lihat paket wisata', aksi: () => ubahSaring({ jenis: 'wisata' }, true),
		},
		{
			id: 'jual', latar: 'bg-gradient-to-r from-amber-700 to-orange-500', foto: foto.b,
			kecil: 'Untuk BUM Desa', judul: 'Jual Produk BUM Desa Anda',
			teks: 'Tambahkan foto, harga, dan nomor WhatsApp — gratis.',
			tombol: 'Kelola produk', aksi: () => { window.location.href = '/desa/bumdes#produk'; },
		},
	];

	const jumlahKategori = new Map((data?.kategori || []).map((k) => [k.nama, k.jumlah]));
	const opsiKategori = data?.kategori_opsi || [];

	return (
		<div className="mx-auto max-w-[1280px] space-y-4 pb-10">
			{/* ── Bilah atas: pencarian ─────────────────────────── */}
			<div className="rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-700 px-4 py-4 shadow-sm sm:px-5">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
					<div className="flex flex-shrink-0 items-center gap-2.5 text-white lg:w-60">
						<span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15"><ShoppingBag className="h-5 w-5" /></span>
						<div className="leading-tight">
							<p className="text-base font-bold">Pasar BUM Desa</p>
							<p className="text-xs text-emerald-100/80">Kabupaten Bogor</p>
						</div>
					</div>
					<form onSubmit={kirimCari} className="flex flex-1 overflow-hidden rounded-lg bg-white p-1 shadow-sm">
						<input
							value={cari}
							onChange={(e) => setCari(e.target.value)}
							placeholder="Cari produk, paket wisata, atau nama desa"
							className="min-w-0 flex-1 px-3 text-sm text-stone-900 outline-none placeholder:text-stone-400"
						/>
						{cari && (
							<button type="button" onClick={() => { setCari(''); ubahSaring({ q: '' }); }} aria-label="Hapus pencarian" className="px-2 text-stone-400 hover:text-stone-700">
								<X className="h-4 w-4" />
							</button>
						)}
						<button type="submit" className="flex items-center gap-1.5 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
							<Search className="h-4 w-4" /> <span className="hidden sm:inline">Cari</span>
						</button>
					</form>
					<div className="relative lg:w-52">
						<MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-100" />
						<select value={saring.kecamatan} onChange={(e) => ubahSaring({ kecamatan: e.target.value }, true)}
							className="h-11 w-full appearance-none rounded-lg bg-white/15 pl-9 pr-3 text-sm text-white outline-none ring-1 ring-white/20 focus:ring-white/50 [&>option]:text-stone-900">
							<option value="">Semua kecamatan</option>
							{(data?.kecamatan || []).map((k) => <option key={k} value={k}>Kec. {k}</option>)}
						</select>
					</div>
				</div>
			</div>

			{/* ── Banner ─────────────────────────────────────────── */}
			<div className="grid h-[150px] grid-cols-1 gap-2 sm:h-[200px] lg:grid-cols-3">
				<div className="lg:col-span-2"><BannerUtama slides={slides} /></div>
				<div className="hidden grid-rows-2 gap-2 lg:grid">
					<BannerKecil latar="bg-gradient-to-r from-amber-600 to-yellow-500" ikon={Star} kecil="Pilihan"
						judul={`${nf.format(r.produk_unggulan ?? 0)} Produk Unggulan`} foto={foto.unggulan}
						onClick={() => ubahSaring({ unggulan: true, jenis: '' }, true)} />
					<BannerKecil latar="bg-gradient-to-r from-teal-700 to-emerald-600" ikon={Mountain} kecil="Jelajah"
						judul={`${nf.format(r.jumlah_wisata ?? 0)} Paket Wisata Desa`} foto={foto.wisata}
						onClick={() => ubahSaring({ jenis: 'wisata', unggulan: false }, true)} />
				</div>
			</div>

			{/* ── Kategori ───────────────────────────────────────── */}
			<Kartu judul="Kategori" kanan={<Link to="/desa/bumdes#produk" className="text-xs font-semibold text-emerald-700 hover:underline">+ Jual produk</Link>}>
				<div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-[repeat(14,minmax(0,1fr))]">
					{opsiKategori.map((nama) => {
						const m = metaKategori(nama);
						const aktif = saring.kategori === nama;
						const jumlah = jumlahKategori.get(nama) || 0;
						return (
							<button key={nama} type="button" onClick={() => ubahSaring({ kategori: aktif ? '' : nama, jenis: '' }, true)}
								className={`flex flex-col items-center gap-2 border-b border-r border-stone-100 px-1.5 py-3.5 text-center transition-colors hover:bg-stone-50 ${aktif ? 'bg-emerald-50' : ''}`}>
								<span className={`flex h-11 w-11 items-center justify-center rounded-full ${aktif ? 'bg-emerald-700 text-white' : m.warna}`}>
									<m.ikon className="h-5 w-5" />
								</span>
								<span className={`line-clamp-2 text-[11.5px] leading-4 ${aktif ? 'font-semibold text-emerald-800' : 'text-stone-700'}`}>{nama}</span>
								{jumlah > 0 && <span className="-mt-1 text-[10px] text-stone-400">{nf.format(jumlah)}</span>}
							</button>
						);
					})}
				</div>
			</Kartu>

			{/* ── Produk ─────────────────────────────────────────── */}
			<section ref={refProduk} className="scroll-mt-4">
				<div className="sticky top-0 z-10 mb-3 flex items-center justify-between gap-3 rounded-xl bg-white px-2 shadow-sm ring-1 ring-stone-200/70">
					<div className="flex overflow-x-auto">
						{TAB_JENIS.map((t) => {
							const aktif = saring.jenis === t.id && !saring.unggulan;
							return (
								<button key={t.id || 'semua'} type="button" onClick={() => ubahSaring({ jenis: t.id, unggulan: false })}
									className={`relative flex-shrink-0 px-4 py-3.5 text-sm transition-colors ${aktif ? 'font-semibold text-emerald-700' : 'text-stone-600 hover:text-stone-900'}`}>
									{t.label}
									{aktif && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-emerald-700" />}
								</button>
							);
						})}
						{saring.unggulan && (
							<span className="relative flex-shrink-0 px-4 py-3.5 text-sm font-semibold text-emerald-700">
								Unggulan <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-emerald-700" />
							</span>
						)}
					</div>
					<p className="hidden flex-shrink-0 pr-2 text-xs text-stone-500 sm:block">
						{memuat && !data ? 'Memuat…' : `${nf.format(hlm.total)} hasil`}
					</p>
				</div>

				{/* Saringan aktif */}
				{adaSaring && (
					<div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
						{saring.q && <Chip onHapus={() => { setCari(''); ubahSaring({ q: '' }); }}>“{saring.q}”</Chip>}
						{saring.kategori && <Chip onHapus={() => ubahSaring({ kategori: '' })}>{saring.kategori}</Chip>}
						{saring.kecamatan && <Chip onHapus={() => ubahSaring({ kecamatan: '' })}>Kec. {saring.kecamatan}</Chip>}
						<button type="button" onClick={reset} className="text-stone-500 hover:text-emerald-700">Hapus semua</button>
					</div>
				)}

				{galat && <p className="mb-3 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{galat}</p>}

				{memuat && !data ? (
					<div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
						{Array.from({ length: 12 }).map((_, i) => <KerangkaKartu key={i} />)}
					</div>
				) : produk.length === 0 ? (
					<Kartu>
						<div className="flex flex-col items-center px-6 py-14 text-center">
							<span className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-stone-400"><Store className="h-6 w-6" /></span>
							<p className="mt-3 font-semibold text-stone-800">{adaSaring ? 'Produk tidak ditemukan' : 'Belum ada produk'}</p>
							<p className="mt-1 text-sm text-stone-500">{adaSaring ? 'Coba kata kunci atau kategori lain.' : 'Produk BUM Desa akan tampil di sini.'}</p>
							{adaSaring
								? <button type="button" onClick={reset} className="mt-4 rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">Lihat semua produk</button>
								: <Link to="/desa/bumdes#produk" className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Tambah produk</Link>}
						</div>
					</Kartu>
				) : (
					<div className={`grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 ${memuat ? 'opacity-50' : ''}`}>
						{produk.map((p) => (
							<KartuToko key={p.id} p={p} onBuka={setDibuka} favorit={favorit.has(String(p.id))} onFavorit={ubahFavorit} />
						))}
					</div>
				)}

				{hlm.total_halaman > 1 && (
					<div className="mt-6 flex items-center justify-center gap-1.5">
						<button type="button" disabled={hlm.page <= 1} onClick={() => { setHalaman((h) => h - 1); keProduk(); }} aria-label="Sebelumnya"
							className="flex h-9 w-9 items-center justify-center rounded-md text-stone-600 hover:bg-white disabled:opacity-30">
							<ChevronLeft className="h-4 w-4" />
						</button>
						{Array.from({ length: hlm.total_halaman }, (_, i) => i + 1)
							.filter((n) => n === 1 || n === hlm.total_halaman || Math.abs(n - hlm.page) <= 1)
							.map((n, i, arr) => (
								<React.Fragment key={n}>
									{i > 0 && n - arr[i - 1] > 1 && <span className="px-1 text-stone-400">…</span>}
									<button type="button" onClick={() => { setHalaman(n); keProduk(); }}
										className={`h-9 min-w-9 rounded-md px-2 text-sm ${n === hlm.page ? 'bg-emerald-700 font-semibold text-white' : 'text-stone-600 hover:bg-white'}`}>
										{n}
									</button>
								</React.Fragment>
							))}
						<button type="button" disabled={hlm.page >= hlm.total_halaman} onClick={() => { setHalaman((h) => h + 1); keProduk(); }} aria-label="Berikutnya"
							className="flex h-9 w-9 items-center justify-center rounded-md text-stone-600 hover:bg-white disabled:opacity-30">
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

const Chip = ({ children, onHapus }) => (
	<span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 py-1 pl-2.5 pr-1 font-medium text-emerald-800">
		{children}
		<button type="button" onClick={onHapus} className="rounded-full p-0.5 hover:bg-emerald-100" aria-label="Hapus saringan"><X className="h-3 w-3" /></button>
	</span>
);

export default KatalogProdukBumdesPage;
