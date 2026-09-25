// src/components/bumdes/KatalogProdukUI.jsx
//
// Potongan tampilan katalog produk BUM Desa yang dipakai bersama oleh halaman
// katalog (dasbor operator BUMDes) dan pengelola produk di halaman BUMDes.
// Etalase TANPA transaksi: tombolnya hanya menghubungi penjual atau membuka
// toko daringnya.
import React, { useEffect } from 'react';
import { FiExternalLink, FiHome, FiImage, FiInstagram, FiMapPin, FiMessageCircle, FiPackage, FiX } from 'react-icons/fi';
import API_CONFIG from '../../config/api';

export const urlFotoProduk = (foto) => (foto ? `${API_CONFIG.STORAGE_URL}/${foto}` : null);

export const hargaProduk = (p) =>
	p?.harga === null || p?.harga === undefined ? 'Hubungi penjual' : `Rp ${Number(p.harga).toLocaleString('id-ID')}`;

/** Nomor HP → tautan WhatsApp (08xx / 62xx / +62xx). */
export const tautanWhatsapp = (telepon, pesan) => {
	let d = String(telepon || '').replace(/[^\d]/g, '');
	if (!d) return null;
	if (d.startsWith('0')) d = `62${d.slice(1)}`;
	else if (d.startsWith('8')) d = `62${d}`;
	return `https://wa.me/${d}${pesan ? `?text=${encodeURIComponent(pesan)}` : ''}`;
};

const tautanLuar = (v) => (!v ? null : /^https?:\/\//i.test(v) ? v : `https://${v}`);

export const WARNA_KATEGORI = {
	'Makanan & Minuman': 'bg-rose-50 text-rose-700',
	Pertanian: 'bg-emerald-50 text-emerald-700',
	Perkebunan: 'bg-lime-50 text-lime-700',
	Peternakan: 'bg-amber-50 text-amber-700',
	Perikanan: 'bg-sky-50 text-sky-700',
	Kerajinan: 'bg-violet-50 text-violet-700',
	'Fashion & Tekstil': 'bg-fuchsia-50 text-fuchsia-700',
	'Kesehatan & Kecantikan': 'bg-teal-50 text-teal-700',
	Jasa: 'bg-indigo-50 text-indigo-700',
	Wisata: 'bg-cyan-50 text-cyan-700',
};

export const LencanaKategori = ({ kategori }) =>
	kategori ? (
		<span className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold shadow-sm ring-1 ring-white/60 backdrop-blur ${WARNA_KATEGORI[kategori] || 'bg-slate-100 text-slate-600'}`}>
			{kategori}
		</span>
	) : null;

export const FotoProduk = ({ foto, nama, kelas = 'aspect-square' }) => {
	const url = urlFotoProduk(foto);
	return (
		<div className={`${kelas} relative w-full overflow-hidden rounded-xl bg-gradient-to-br from-slate-100 to-slate-50`}>
			{url ? (
				<img src={url} alt={nama} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]" />
			) : (
				<div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-300">
					<FiImage className="h-9 w-9" />
					<span className="text-[10px] font-medium uppercase tracking-wider">Belum ada foto</span>
				</div>
			)}
		</div>
	);
};

/** Kartu produk ringkas. */
export const KartuProduk = ({ produk: p, onBuka, tanpaPenjual = false }) => (
	<button
		type="button"
		onClick={onBuka ? () => onBuka(p) : undefined}
		className={`group relative flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-2.5 text-left shadow-sm shadow-slate-900/[0.03] transition-all duration-300 ${
			onBuka ? 'hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-900/[0.08]' : 'cursor-default'
		}`}
	>
		<div className="relative">
			<FotoProduk foto={p.foto} nama={p.nama} />
			{p.kategori && (
				<span className="absolute left-2 top-2"><LencanaKategori kategori={p.kategori} /></span>
			)}
			{p.unggulan && !tanpaPenjual && (
				<span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10.5px] font-bold text-amber-950 shadow-sm">
					★ Unggulan
				</span>
			)}
		</div>
		<div className="flex min-w-0 flex-1 flex-col gap-1 px-1.5 pb-1 pt-3">
			<h3 className="line-clamp-2 text-[14.5px] font-semibold leading-snug tracking-tight text-slate-900">{p.nama}</h3>
			{p.deskripsi && <p className="line-clamp-2 text-xs leading-5 text-slate-500">{p.deskripsi}</p>}
			<p className="mt-auto pt-2">
				<span className="text-[17px] font-bold tracking-tight text-brand-600">{hargaProduk(p)}</span>
				{p.harga !== null && p.harga !== undefined && p.satuan && <span className="text-xs text-slate-400"> / {p.satuan}</span>}
			</p>
			{!tanpaPenjual && p.bumdes && (
				<div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-2.5">
					<div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[10px] font-bold text-white">
						{(p.bumdes.nama || 'B').replace(/^bum\s*des(a)?\s*/i, '').charAt(0).toUpperCase() || 'B'}
					</div>
					<div className="min-w-0 text-[11.5px] leading-4">
						<p className="truncate font-semibold text-slate-700">{p.bumdes.nama}</p>
						<p className="flex items-center gap-1 truncate text-slate-400"><FiMapPin className="h-3 w-3 flex-shrink-0" /> {p.bumdes.desa}, Kec. {p.bumdes.kecamatan}</p>
					</div>
				</div>
			)}
		</div>
	</button>
);

/** Rincian produk + cara menghubungi penjual. Tanpa keranjang/pembayaran. */
export const ModalDetailProduk = ({ produk: p, onTutup }) => {
	useEffect(() => {
		const tutup = (e) => { if (e.key === 'Escape') onTutup(); };
		window.addEventListener('keydown', tutup);
		return () => window.removeEventListener('keydown', tutup);
	}, [onTutup]);

	if (!p) return null;
	const b = p.bumdes || {};
	const sosmed = b.media_sosial || {};
	const wa = tautanWhatsapp(b.telepon, `Halo ${b.nama || 'BUM Desa'}, saya tertarik dengan produk "${p.nama}".`);
	const tokoLain = [
		p.tautan && { label: 'Toko daring produk', url: tautanLuar(p.tautan) },
		sosmed.shopee && { label: 'Shopee', url: tautanLuar(sosmed.shopee) },
		sosmed.tokopedia && { label: 'Tokopedia', url: tautanLuar(sosmed.tokopedia) },
	].filter(Boolean);

	return (
		<div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onTutup}>
			<div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-3xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
				<div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
					<LencanaKategori kategori={p.kategori} />
					<button type="button" onClick={onTutup} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Tutup"><FiX className="h-5 w-5" /></button>
				</div>
				<div className="grid flex-1 grid-cols-1 gap-5 overflow-y-auto p-5 sm:grid-cols-2">
					<FotoProduk foto={p.foto} nama={p.nama} kelas="aspect-square" />
					<div className="flex flex-col gap-3">
						<h2 className="text-xl font-bold text-slate-900">{p.nama}</h2>
						<p>
							<span className="text-2xl font-bold tracking-tight text-brand-600">{hargaProduk(p)}</span>
							{p.harga !== null && p.harga !== undefined && p.satuan && <span className="text-sm text-slate-400"> / {p.satuan}</span>}
						</p>
						{p.deskripsi && <p className="whitespace-pre-line text-sm leading-6 text-slate-600">{p.deskripsi}</p>}

						<div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm">
							<p className="flex items-center gap-2 font-semibold text-slate-800"><FiHome className="h-4 w-4" /> {b.nama}</p>
							<p className="mt-1 flex items-center gap-2 text-slate-500"><FiMapPin className="h-4 w-4" /> Desa {b.desa}, Kec. {b.kecamatan}, Kab. Bogor</p>
							{sosmed.instagram && (
								<p className="mt-1 flex items-center gap-2 text-slate-500"><FiInstagram className="h-4 w-4" /> {sosmed.instagram}</p>
							)}
						</div>

						<div className="mt-auto space-y-2">
							{wa && (
								<a href={wa} target="_blank" rel="noreferrer"
									className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
									<FiMessageCircle className="h-4 w-4" /> Hubungi via WhatsApp
								</a>
							)}
							{tokoLain.map((t) => (
								<a key={t.label} href={t.url} target="_blank" rel="noreferrer"
									className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
									<FiExternalLink className="h-4 w-4" /> {t.label}
								</a>
							))}
							{!wa && tokoLain.length === 0 && (
								<p className="flex items-center gap-2 text-xs text-slate-500"><FiPackage className="h-4 w-4" /> Kontak penjual belum diisi BUM Desa ini.</p>
							)}
							<p className="text-[11px] text-slate-400">Transaksi dilakukan langsung dengan BUM Desa, tidak melalui aplikasi ini.</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
