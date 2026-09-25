// src/components/bumdes/ProdukBumdesManager.jsx
//
// Kelola produk milik BUM Desa sendiri. Produknya tampil di Katalog Produk
// BUMDes se-kabupaten (dasbor operator BUMDes) — etalase TANPA transaksi:
// pembeli menghubungi BUM Desa langsung atau lewat tautan toko daringnya.
//
// Berbeda dengan formulir BUM Desa, setiap perubahan produk langsung
// tersimpan (tidak menunggu tombol Simpan halaman).
import React, { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { FiEdit3, FiImage, FiLoader, FiPlus, FiStar, FiTrash2, FiX } from 'react-icons/fi';
import api from '../../api';
import { KartuProduk, urlFotoProduk } from './KatalogProdukUI';

const KELAS_INPUT =
	'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-900';

const kosong = { nama: '', kategori: '', harga: '', satuan: '', deskripsi: '', tautan: '', unggulan: false, is_active: true };

const FormProduk = ({ awal, kategoriOpsi, bumdesId, onTutup, onTersimpan }) => {
	const [isian, setIsian] = useState(() => (awal
		? { ...kosong, ...awal, harga: awal.harga ?? '', tautan: awal.tautan || '', deskripsi: awal.deskripsi || '', satuan: awal.satuan || '', kategori: awal.kategori || '' }
		: kosong));
	const [foto, setFoto] = useState(null);
	const [pratinjau, setPratinjau] = useState(null);
	const [hapusFoto, setHapusFoto] = useState(false);
	const [menyimpan, setMenyimpan] = useState(false);
	const [galat, setGalat] = useState(null);

	useEffect(() => () => { if (pratinjau) URL.revokeObjectURL(pratinjau); }, [pratinjau]);

	const ubah = (k, v) => setIsian((s) => ({ ...s, [k]: v }));
	const fotoLama = !hapusFoto ? urlFotoProduk(awal?.foto) : null;

	const simpan = async (e) => {
		e.preventDefault();
		if (!isian.nama.trim()) { setGalat('Nama produk wajib diisi'); return; }
		setMenyimpan(true);
		setGalat(null);
		try {
			const fd = new FormData();
			['nama', 'kategori', 'harga', 'satuan', 'deskripsi', 'tautan'].forEach((k) => fd.append(k, isian[k] ?? ''));
			fd.append('unggulan', isian.unggulan ? '1' : '0');
			fd.append('is_active', isian.is_active ? '1' : '0');
			if (foto) fd.append('foto', foto);
			// SPKED mengelola produk BUMDes mana pun; akun desa selalu miliknya sendiri.
			if (bumdesId) fd.append('bumdes_id', String(bumdesId));
			if (hapusFoto && !foto) fd.append('hapus_foto', '1');
			const konfig = { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 };
			if (awal?.id) await api.put(`/desa/bumdes/produk/${awal.id}`, fd, konfig);
			else await api.post('/desa/bumdes/produk', fd, konfig);
			onTersimpan();
		} catch (err) {
			setGalat(err.response?.data?.message || 'Gagal menyimpan produk');
		} finally {
			setMenyimpan(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
			<form onSubmit={simpan} className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl">
				<div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
					<h2 className="font-bold text-slate-900">{awal?.id ? 'Ubah Produk' : 'Tambah Produk'}</h2>
					<button type="button" onClick={onTutup} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><FiX className="h-5 w-5" /></button>
				</div>

				<div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto px-5 py-4 sm:grid-cols-2">
					<div className="sm:col-span-2 flex items-start gap-4">
						<div className="flex h-28 w-28 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
							{pratinjau || fotoLama
								? <img src={pratinjau || fotoLama} alt="" className="h-full w-full object-cover" />
								: <FiImage className="h-8 w-8 text-slate-300" />}
						</div>
						<div className="space-y-2">
							<p className="text-sm font-medium text-slate-700">Foto Produk</p>
							<p className="text-xs text-slate-500">JPG / PNG / WEBP, maks. 8 MB. Gunakan foto yang terang dan jelas.</p>
							<div className="flex flex-wrap gap-2">
								<label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
									<FiImage className="h-3.5 w-3.5" /> {pratinjau || fotoLama ? 'Ganti foto' : 'Pilih foto'}
									<input type="file" accept="image/*" className="hidden" onChange={(e) => {
										const f = e.target.files?.[0];
										e.target.value = '';
										if (!f) return;
										if (f.size > 8 * 1024 * 1024) { setGalat('Ukuran foto maksimal 8 MB'); return; }
										setFoto(f);
										setPratinjau(URL.createObjectURL(f));
										setHapusFoto(false);
									}} />
								</label>
								{(pratinjau || fotoLama) && (
									<button type="button" onClick={() => { setFoto(null); setPratinjau(null); setHapusFoto(true); }}
										className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">Hapus foto</button>
								)}
							</div>
						</div>
					</div>

					<div className="sm:col-span-2">
						<label className="mb-1.5 block text-sm font-medium text-slate-700">Nama Produk <span className="text-rose-500">*</span></label>
						<input className={KELAS_INPUT} value={isian.nama} onChange={(e) => ubah('nama', e.target.value)} placeholder="Contoh: Kopi Robusta Cijeruk" />
					</div>
					<div>
						<label className="mb-1.5 block text-sm font-medium text-slate-700">Kategori</label>
						<select className={KELAS_INPUT} value={isian.kategori} onChange={(e) => ubah('kategori', e.target.value)}>
							<option value="">Pilih kategori</option>
							{kategoriOpsi.map((k) => <option key={k} value={k}>{k}</option>)}
						</select>
					</div>
					<div className="grid grid-cols-2 gap-2">
						<div>
							<label className="mb-1.5 block text-sm font-medium text-slate-700">Harga (Rp)</label>
							<input className={KELAS_INPUT} inputMode="numeric"
								value={isian.harga === '' || isian.harga === null ? '' : Number(isian.harga).toLocaleString('id-ID')}
								onChange={(e) => ubah('harga', e.target.value.replace(/[^\d]/g, ''))} placeholder="35.000" />
						</div>
						<div>
							<label className="mb-1.5 block text-sm font-medium text-slate-700">Satuan</label>
							<input className={KELAS_INPUT} value={isian.satuan} onChange={(e) => ubah('satuan', e.target.value)} placeholder="250 gr" />
						</div>
					</div>
					<div className="sm:col-span-2">
						<label className="mb-1.5 block text-sm font-medium text-slate-700">Deskripsi</label>
						<textarea className={`${KELAS_INPUT} resize-none`} rows={3} value={isian.deskripsi} onChange={(e) => ubah('deskripsi', e.target.value)}
							placeholder="Keunggulan produk, bahan, cara pemesanan, dll." />
					</div>
					<div className="sm:col-span-2">
						<label className="mb-1.5 block text-sm font-medium text-slate-700">Tautan Toko Daring (opsional)</label>
						<input className={KELAS_INPUT} value={isian.tautan} onChange={(e) => ubah('tautan', e.target.value)} placeholder="shopee.co.id/nama-toko/produk" />
						<p className="mt-1 text-xs text-slate-500">Tidak ada transaksi di aplikasi — pembeli diarahkan ke tautan ini atau ke nomor telepon BUM Desa.</p>
					</div>
					<label className="flex items-center gap-2 text-sm text-slate-700">
						<input type="checkbox" checked={isian.unggulan} onChange={(e) => ubah('unggulan', e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
						Jadikan produk unggulan (maks. 3)
					</label>
					<label className="flex items-center gap-2 text-sm text-slate-700">
						<input type="checkbox" checked={isian.is_active} onChange={(e) => ubah('is_active', e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
						Tampilkan di katalog
					</label>
				</div>

				{galat && <p className="mx-5 mb-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{galat}</p>}
				<div className="flex gap-3 border-t border-slate-100 px-5 py-4">
					<button type="button" onClick={onTutup} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Batal</button>
					<button type="submit" disabled={menyimpan}
						className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
						{menyimpan && <FiLoader className="h-4 w-4 animate-spin" />} Simpan Produk
					</button>
				</div>
			</form>
		</div>
	);
};

/**
 * @param {boolean} adaBumdes  BUMDes sudah tersimpan (produk butuh id-nya)
 * @param {number}  bumdesId   untuk SPKED: BUMDes yang dikelola. Kosong = milik desa yang login.
 */
const ProdukBumdesManager = ({ adaBumdes, bumdesId = null }) => {
	const [produk, setProduk] = useState([]);
	const [kategoriOpsi, setKategoriOpsi] = useState([]);
	const [memuat, setMemuat] = useState(true);
	const [galat, setGalat] = useState(null);
	const [form, setForm] = useState(null); // null | {} (baru) | produk

	const muat = useCallback(async () => {
		setMemuat(true);
		setGalat(null);
		try {
			const res = await api.get('/desa/bumdes/produk', { params: bumdesId ? { bumdes_id: bumdesId } : {} });
			setProduk(res.data?.data || []);
			setKategoriOpsi(res.data?.kategori_opsi || []);
		} catch (err) {
			setProduk([]);
			setGalat(err.response?.data?.message || 'Gagal memuat produk');
		} finally {
			setMemuat(false);
		}
	}, [bumdesId]);

	useEffect(() => { if (adaBumdes) muat(); else setMemuat(false); }, [adaBumdes, muat]);

	// Datang dari "Kelola produk" di katalog (/desa/bumdes#produk): halaman
	// dimuat asinkron, jadi gulir setelah bagian ini benar-benar ada.
	useEffect(() => {
		if (memuat || window.location.hash !== '#produk') return;
		document.getElementById('produk')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}, [memuat]);

	const hapus = async (p) => {
		const ok = await Swal.fire({
			icon: 'warning', title: `Hapus ${p.nama}?`, text: 'Produk akan hilang dari katalog.',
			showCancelButton: true, confirmButtonText: 'Hapus', cancelButtonText: 'Batal', confirmButtonColor: '#e11d48',
		});
		if (!ok.isConfirmed) return;
		try {
			await api.delete(`/desa/bumdes/produk/${p.id}`);
			muat();
		} catch (err) {
			Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus produk', 'error');
		}
	};

	if (!adaBumdes) {
		return <p className="text-sm text-slate-500">Simpan data BUM Desa terlebih dahulu, lalu tambahkan produknya di sini.</p>;
	}

	return (
		<div id="produk" className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<p className="text-sm text-slate-600">{produk.length} produk terdaftar</p>
				<button type="button" onClick={() => setForm({})}
					className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow-md">
					<FiPlus className="h-4 w-4" /> Tambah Produk
				</button>
			</div>

			{galat && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{galat}</p>}

			{memuat ? (
				<div className="flex justify-center py-8"><FiLoader className="h-6 w-6 animate-spin text-slate-400" /></div>
			) : produk.length === 0 ? (
				<button type="button" onClick={() => setForm({})}
					className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 px-4 py-10 text-center transition-colors hover:border-slate-400 hover:bg-slate-50">
					<span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200"><FiPlus className="h-5 w-5" /></span>
					<span className="mt-3 text-sm font-semibold text-slate-700">Tambahkan produk pertama</span>
					<span className="mt-1 max-w-sm text-xs text-slate-500">Produk dengan foto yang menarik lebih mudah ditemukan pembeli di katalog se-Kabupaten Bogor.</span>
				</button>
			) : (
				<div className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-4">
					{produk.map((p) => (
						<div key={p.id} className="flex flex-col">
							<div className={p.is_active ? '' : 'opacity-60 grayscale-[40%]'}>
								<KartuProduk produk={p} tanpaPenjual />
							</div>
							<div className="mt-2 flex items-center gap-1.5">
								{p.unggulan && (
									<span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800"><FiStar className="h-3 w-3" /> Unggulan</span>
								)}
								{!p.is_active && (
									<span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Disembunyikan</span>
								)}
								<div className="ml-auto flex gap-0.5">
									<button type="button" onClick={() => setForm(p)}
										className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900">
										<FiEdit3 className="h-3.5 w-3.5" /> Ubah
									</button>
									<button type="button" onClick={() => hapus(p)}
										className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">
										<FiTrash2 className="h-3.5 w-3.5" /> Hapus
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			{form && (
				<FormProduk
					awal={form.id ? form : null}
					kategoriOpsi={kategoriOpsi}
					bumdesId={bumdesId}
					onTutup={() => setForm(null)}
					onTersimpan={() => { setForm(null); muat(); }}
				/>
			)}
		</div>
	);
};

export default ProdukBumdesManager;
