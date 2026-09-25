// src/components/bumdes/KatalogProdukUI.jsx
//
// Potongan tampilan marketplace produk & wisata BUM Desa, dipakai bersama oleh
// halaman katalog (dasbor operator BUMDes) dan pengelola produk.
//
// TANPA transaksi di aplikasi: tombol "Pesan" membuka WhatsApp langsung ke
// nomor pemilik produk (whatsapp produk → telepon BUM Desa → HP Direktur,
// ditentukan backend), dengan pesan yang sudah terisi.
import React, { useEffect, useState } from 'react';
import {
	Beef, Box, Cookie, Coffee, ExternalLink, Fish, Heart, HeartPulse, Image as ImageIcon,
	Instagram, Leaf, MapPin, MessageCircle, Mountain, Package, Palette, Shirt, Sprout,
	Store, Tag, Wheat, Wrench, X,
} from 'lucide-react';
import API_CONFIG from '../../config/api';

export const urlFotoProduk = (foto) => (foto ? `${API_CONFIG.STORAGE_URL}/${foto}` : null);

export const hargaProduk = (p) =>
	p?.harga === null || p?.harga === undefined ? 'Hubungi penjual' : `Rp ${Number(p.harga).toLocaleString('id-ID')}`;

export const adaHarga = (p) => p?.harga !== null && p?.harga !== undefined;

export const isWisata = (p) => p?.jenis === 'wisata' || ['Wisata Desa', 'Wisata'].includes(p?.kategori);

/** Nomor HP → tautan WhatsApp (08xx / 62xx / +62xx). */
export const tautanWhatsapp = (nomor, pesan) => {
	let d = String(nomor || '').replace(/[^\d]/g, '');
	if (!d) return null;
	if (d.startsWith('0')) d = `62${d.slice(1)}`;
	else if (d.startsWith('8')) d = `62${d}`;
	return `https://wa.me/${d}${pesan ? `?text=${encodeURIComponent(pesan)}` : ''}`;
};

/** Pesan WhatsApp yang sudah terisi — pembeli tinggal mengirim. */
export const pesanWhatsapp = (p) => {
	const lokasi = p.bumdes ? ` (${p.bumdes.nama}, Desa ${p.bumdes.desa})` : '';
	const harga = adaHarga(p) ? ` seharga ${hargaProduk(p)}${p.satuan ? `/${p.satuan}` : ''}` : '';
	return isWisata(p)
		? `Halo ${p.bumdes?.nama || 'BUM Desa'}, saya ingin memesan paket wisata "${p.nama}"${harga}${lokasi}. Apakah masih tersedia dan bagaimana cara pemesanannya?`
		: `Halo ${p.bumdes?.nama || 'BUM Desa'}, saya tertarik dengan produk "${p.nama}"${harga}${lokasi}. Apakah stoknya tersedia?`;
};

export const tautanPesan = (p) => tautanWhatsapp(p?.whatsapp, pesanWhatsapp(p));

const tautanLuar = (v) => (!v ? null : /^https?:\/\//i.test(v) ? v : `https://${v}`);

/* ───────────────────────── Kategori: ikon & warna ───────────────────────── */

export const META_KATEGORI = {
	'Makanan & Minuman': { ikon: Coffee, warna: 'bg-orange-100 text-orange-700', lencana: 'bg-orange-500' },
	'Makanan Ringan': { ikon: Cookie, warna: 'bg-amber-100 text-amber-700', lencana: 'bg-amber-500' },
	'Hasil Pertanian': { ikon: Wheat, warna: 'bg-lime-100 text-lime-700', lencana: 'bg-lime-600' },
	Pertanian: { ikon: Wheat, warna: 'bg-lime-100 text-lime-700', lencana: 'bg-lime-600' },
	Perkebunan: { ikon: Sprout, warna: 'bg-green-100 text-green-700', lencana: 'bg-green-600' },
	Peternakan: { ikon: Beef, warna: 'bg-rose-100 text-rose-700', lencana: 'bg-rose-500' },
	Perikanan: { ikon: Fish, warna: 'bg-sky-100 text-sky-700', lencana: 'bg-sky-500' },
	'Produk Olahan': { ikon: Package, warna: 'bg-pink-100 text-pink-700', lencana: 'bg-pink-500' },
	'Kerajinan Tangan': { ikon: Palette, warna: 'bg-violet-100 text-violet-700', lencana: 'bg-violet-500' },
	Kerajinan: { ikon: Palette, warna: 'bg-violet-100 text-violet-700', lencana: 'bg-violet-500' },
	'Fashion & Aksesoris': { ikon: Shirt, warna: 'bg-fuchsia-100 text-fuchsia-700', lencana: 'bg-fuchsia-500' },
	'Fashion & Tekstil': { ikon: Shirt, warna: 'bg-fuchsia-100 text-fuchsia-700', lencana: 'bg-fuchsia-500' },
	'Produk Herbal': { ikon: Leaf, warna: 'bg-emerald-100 text-emerald-700', lencana: 'bg-emerald-600' },
	'Kesehatan & Kecantikan': { ikon: HeartPulse, warna: 'bg-teal-100 text-teal-700', lencana: 'bg-teal-600' },
	Jasa: { ikon: Wrench, warna: 'bg-indigo-100 text-indigo-700', lencana: 'bg-indigo-500' },
	'Wisata Desa': { ikon: Mountain, warna: 'bg-emerald-100 text-emerald-800', lencana: 'bg-emerald-700' },
	Wisata: { ikon: Mountain, warna: 'bg-emerald-100 text-emerald-800', lencana: 'bg-emerald-700' },
};
export const metaKategori = (k) => META_KATEGORI[k] || { ikon: Tag, warna: 'bg-slate-100 text-slate-600', lencana: 'bg-slate-600' };

export const LencanaKategori = ({ kategori, padat = false }) => {
	if (!kategori) return null;
	const m = metaKategori(kategori);
	return (
		<span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold text-white shadow-sm ${m.lencana} ${padat ? '' : 'ring-2 ring-white/70'}`}>
			<m.ikon className="h-3 w-3" /> {kategori}
		</span>
	);
};

/* ───────────────────────────── Favorit ─────────────────────────────── */

// Favorit hanya kenyamanan per perangkat, jadi cukup di localStorage.
const KUNCI_FAVORIT = 'dpmd_katalog_favorit';
const bacaFavorit = () => {
	try { return new Set(JSON.parse(localStorage.getItem(KUNCI_FAVORIT) || '[]')); } catch { return new Set(); }
};

export const useFavorit = () => {
	const [favorit, setFavorit] = useState(bacaFavorit);
	const ubah = (id) => setFavorit((lama) => {
		const baru = new Set(lama);
		if (baru.has(String(id))) baru.delete(String(id)); else baru.add(String(id));
		try { localStorage.setItem(KUNCI_FAVORIT, JSON.stringify([...baru])); } catch { /* mode privat */ }
		return baru;
	});
	return { favorit, ubahFavorit: ubah };
};

/* ───────────────────────────── Foto ─────────────────────────────── */

export const FotoProduk = ({ foto, nama, kelas = 'aspect-square', kategori }) => {
	const url = urlFotoProduk(foto);
	const m = metaKategori(kategori);
	return (
		<div className={`${kelas} relative w-full overflow-hidden bg-gradient-to-br from-emerald-50 via-stone-50 to-amber-50`}>
			{url ? (
				<img src={url} alt={nama} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]" />
			) : (
				<div className="flex h-full w-full flex-col items-center justify-center gap-2">
					<span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${m.warna}`}>
						{kategori ? <m.ikon className="h-7 w-7" /> : <ImageIcon className="h-7 w-7" />}
					</span>
					<span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Foto belum ada</span>
				</div>
			)}
		</div>
	);
};

/* ───────────────────────────── Kartu ─────────────────────────────── */

/**
 * Kartu produk/wisata. Klik kartu = detail; tombol bawah = pesan WhatsApp
 * langsung ke pemilik. `tanpaPenjual` untuk pengelola produk milik sendiri.
 */
export const KartuProduk = ({ produk: p, onBuka, tanpaPenjual = false, favorit, onFavorit }) => {
	const wisata = isWisata(p);
	const wa = tautanPesan(p);
	return (
		<article
			className={`group relative flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-stone-200/80 bg-white shadow-sm shadow-stone-900/[0.04] transition-all duration-300 ${
				onBuka ? 'hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-900/[0.08]' : ''
			}`}
		>
			<button type="button" onClick={onBuka ? () => onBuka(p) : undefined} className={`relative block text-left ${onBuka ? '' : 'cursor-default'}`}>
				<FotoProduk foto={p.foto} nama={p.nama} kategori={p.kategori} />
				{/* Gradasi bawah foto supaya lencana tetap terbaca di foto terang */}
				<div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent" />
				<span className="absolute bottom-2.5 left-2.5"><LencanaKategori kategori={p.kategori} /></span>
				{p.unggulan && !tanpaPenjual && (
					<span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950 shadow">
						★ Unggulan
					</span>
				)}
			</button>

			{onFavorit && (
				<button
					type="button"
					onClick={() => onFavorit(p.id)}
					aria-label={favorit ? 'Hapus dari favorit' : 'Tambah ke favorit'}
					className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition-transform hover:scale-110"
				>
					<Heart className={`h-4 w-4 ${favorit ? 'fill-rose-500 text-rose-500' : 'text-stone-500'}`} />
				</button>
			)}

			<div className="flex flex-1 flex-col px-3.5 pb-3.5 pt-3">
				<button type="button" onClick={onBuka ? () => onBuka(p) : undefined} className="text-left">
					<h3 className="line-clamp-2 text-[14.5px] font-bold leading-snug tracking-tight text-stone-900 group-hover:text-emerald-800">{p.nama}</h3>
				</button>
				{!tanpaPenjual && p.bumdes && (
					<div className="mt-1.5 space-y-0.5 text-[11.5px] leading-4 text-stone-500">
						<p className="flex items-center gap-1 truncate"><Store className="h-3 w-3 flex-shrink-0" /> {p.bumdes.nama}</p>
						<p className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3 flex-shrink-0" /> Kec. {p.bumdes.kecamatan}</p>
					</div>
				)}
				{tanpaPenjual && p.deskripsi && <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">{p.deskripsi}</p>}

				<div className="mt-auto flex items-baseline justify-between gap-2 pt-3">
					<span className="text-[17px] font-extrabold tracking-tight text-emerald-800">{hargaProduk(p)}</span>
					{adaHarga(p) && p.satuan && <span className="truncate text-[11px] text-stone-400">/ {p.satuan}</span>}
				</div>

				{!tanpaPenjual && (
					wa ? (
						<a
							href={wa}
							target="_blank"
							rel="noreferrer"
							className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-800 py-2.5 text-xs font-bold text-white shadow-sm shadow-emerald-900/20 transition-all hover:bg-emerald-900 hover:shadow-md"
						>
							<MessageCircle className="h-4 w-4" /> {wisata ? 'Pesan Sekarang' : 'Pesan via WhatsApp'}
						</a>
					) : (
						<button type="button" onClick={onBuka ? () => onBuka(p) : undefined}
							className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-stone-200 py-2.5 text-xs font-bold text-stone-600 hover:bg-stone-50">
							<Box className="h-4 w-4" /> Lihat Detail
						</button>
					)
				)}
			</div>
		</article>
	);
};

/* ───────────────────────────── Detail ─────────────────────────────── */

/** Rincian produk + pesan WhatsApp langsung ke pemilik. Tanpa keranjang. */
export const ModalDetailProduk = ({ produk: p, onTutup, favorit, onFavorit }) => {
	useEffect(() => {
		const tutup = (e) => { if (e.key === 'Escape') onTutup(); };
		window.addEventListener('keydown', tutup);
		const sebelum = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => { window.removeEventListener('keydown', tutup); document.body.style.overflow = sebelum; };
	}, [onTutup]);

	if (!p) return null;
	const b = p.bumdes || {};
	const sosmed = b.media_sosial || {};
	const wa = tautanPesan(p);
	const wisata = isWisata(p);
	const tokoLain = [
		p.tautan && { label: 'Toko daring produk', url: tautanLuar(p.tautan) },
		sosmed.shopee && { label: 'Shopee', url: tautanLuar(sosmed.shopee) },
		sosmed.tokopedia && { label: 'Tokopedia', url: tautanLuar(sosmed.tokopedia) },
	].filter(Boolean);

	return (
		<div className="fixed inset-0 z-[70] flex items-end justify-center bg-stone-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onTutup}>
			<div className="relative flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-white shadow-2xl sm:max-w-4xl sm:rounded-[1.75rem]" onClick={(e) => e.stopPropagation()}>
				<button type="button" onClick={onTutup} aria-label="Tutup"
					className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-stone-600 shadow backdrop-blur hover:bg-white">
					<X className="h-5 w-5" />
				</button>
				<div className="grid flex-1 grid-cols-1 overflow-y-auto md:grid-cols-2">
					<div className="relative">
						<FotoProduk foto={p.foto} nama={p.nama} kategori={p.kategori} kelas="aspect-square md:h-full md:aspect-auto md:min-h-[26rem]" />
						<span className="absolute bottom-4 left-4"><LencanaKategori kategori={p.kategori} /></span>
					</div>
					<div className="flex flex-col gap-4 p-6">
						<div>
							{p.unggulan && <span className="mb-2 inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">★ Produk Unggulan</span>}
							<h2 className="text-2xl font-extrabold leading-tight tracking-tight text-stone-900">{p.nama}</h2>
							<p className="mt-2">
								<span className="text-3xl font-extrabold tracking-tight text-emerald-800">{hargaProduk(p)}</span>
								{adaHarga(p) && p.satuan && <span className="text-sm text-stone-400"> / {p.satuan}</span>}
							</p>
						</div>
						{p.deskripsi && <p className="whitespace-pre-line text-sm leading-6 text-stone-600">{p.deskripsi}</p>}

						<div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-sm">
							<p className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-700">{wisata ? 'Pengelola wisata' : 'Penjual'}</p>
							<p className="mt-1 flex items-center gap-2 font-bold text-stone-900"><Store className="h-4 w-4 text-emerald-700" /> {b.nama}</p>
							<p className="mt-1 flex items-center gap-2 text-stone-500"><MapPin className="h-4 w-4" /> Desa {b.desa}, Kec. {b.kecamatan}, Kab. Bogor</p>
							{sosmed.instagram && <p className="mt-1 flex items-center gap-2 text-stone-500"><Instagram className="h-4 w-4" /> {sosmed.instagram}</p>}
						</div>

						<div className="mt-auto space-y-2">
							{wa ? (
								<a href={wa} target="_blank" rel="noreferrer"
									className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition-all hover:brightness-95">
									<MessageCircle className="h-5 w-5" /> {wisata ? 'Pesan Paket Wisata via WhatsApp' : 'Pesan via WhatsApp'}
								</a>
							) : (
								<p className="rounded-2xl bg-stone-50 px-4 py-3 text-center text-xs text-stone-500">Nomor WhatsApp penjual belum diisi.</p>
							)}
							{tokoLain.map((t) => (
								<a key={t.label} href={t.url} target="_blank" rel="noreferrer"
									className="flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 py-3 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50">
									<ExternalLink className="h-4 w-4" /> {t.label}
								</a>
							))}
							{onFavorit && (
								<button type="button" onClick={() => onFavorit(p.id)}
									className="flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold text-stone-500 hover:bg-stone-50">
									<Heart className={`h-4 w-4 ${favorit ? 'fill-rose-500 text-rose-500' : ''}`} /> {favorit ? 'Tersimpan di favorit' : 'Simpan ke favorit'}
								</button>
							)}
							<p className="text-center text-[11px] text-stone-400">Pesan dikirim langsung ke {wisata ? 'pengelola' : 'penjual'}. Transaksi tidak melalui aplikasi ini.</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
