// src/components/bumdes/UnggahProdukHukumBumdes.jsx
//
// Unggah Perdes / SK BUM Desa langsung dari formulir BUM Desa.
//
// KENAPA ADA DI SINI, BUKAN DI MODUL PRODUK HUKUM SAJA. Hak akses halaman desa
// diberikan per fitur oleh Admin Desa, dan operator BUM Desa sering tidak
// dipegangi akses "produk-hukum". Sebelumnya dasar hukum BUM Desa hanya bisa
// DIPILIH dari dokumen yang sudah ada di modul itu — jadi bagi operator tersebut
// dropdown-nya kosong dan tidak ada cara mengisinya sendiri. Dokumennya ada,
// pintunya yang tidak.
//
// Yang dibuat lewat sini tetap produk hukum desa yang penuh: baris yang sama,
// folder berkas yang sama, jenis dan singkatan yang sama dengan unggahan Bidang
// SPKED. Ia ikut muncul di modul Produk Hukum bagi petugas yang memegang
// aksesnya — bukan salinan terpisah yang hidup sendiri di BUM Desa.

import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { FiUploadCloud, FiX, FiFileText } from 'react-icons/fi';
import BumdesDesaService from '../../services/bumdesDesaService';

const KELAS_INPUT =
	'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900';

const UKURAN_MAKS = 10 * 1024 * 1024; // sama dengan batas multer di server

const hariIni = () => new Date().toISOString().slice(0, 10);

/**
 * @param {'Perdes'|'SK_BUM_Desa'} fieldName  slot dasar hukum yang diisi
 * @param {string}   label        nama dokumen untuk teks di layar
 * @param {string}   nomorAwal    isian awal nomor (mis. dari kolom Nomor Perdes)
 * @param {boolean}  bisaSunting  formulir sedang dalam mode sunting
 * @param {function} onSelesai    (produkHukum) => void — dipanggil setelah tersimpan
 */
const UnggahProdukHukumBumdes = ({
	fieldName,
	label,
	nomorAwal = '',
	bisaSunting = true,
	onSelesai,
}) => {
	const [terbuka, setTerbuka] = useState(false);
	const [menyimpan, setMenyimpan] = useState(false);
	const [berkas, setBerkas] = useState(null);
	const [form, setForm] = useState({
		nomor: nomorAwal || '',
		tahun: String(new Date().getFullYear()),
		tanggal_penetapan: hariIni(),
		judul: '',
	});

	const ubah = (kunci, nilai) => setForm((prev) => ({ ...prev, [kunci]: nilai }));

	const pilihBerkas = (e) => {
		const file = e.target.files?.[0];
		if (!file) return;
		// Dua batas ini juga dijaga server; diperiksa di sini supaya berkas besar
		// tidak dikirim dulu lewat jaringan desa untuk kemudian ditolak.
		if (file.type !== 'application/pdf') {
			Swal.fire('Berkas harus PDF', 'Modul Produk Hukum hanya menerima PDF.', 'warning');
			e.target.value = '';
			return;
		}
		if (file.size > UKURAN_MAKS) {
			Swal.fire('Berkas terlalu besar', 'Ukuran maksimal 10MB.', 'warning');
			e.target.value = '';
			return;
		}
		setBerkas(file);
	};

	const simpan = async () => {
		if (!berkas) return Swal.fire('Berkas belum dipilih', 'Pilih berkas PDF dulu.', 'warning');
		if (!form.nomor.trim()) return Swal.fire('Nomor belum diisi', `Isi nomor ${label}.`, 'warning');
		if (!form.tahun) return Swal.fire('Tahun belum diisi', 'Isi tahun dokumen.', 'warning');
		if (!form.tanggal_penetapan)
			return Swal.fire('Tanggal belum diisi', 'Isi tanggal penetapan.', 'warning');

		setMenyimpan(true);
		try {
			const data = new FormData();
			data.append('file', berkas);
			data.append('field_name', fieldName);
			data.append('nomor', form.nomor.trim());
			data.append('tahun', form.tahun);
			data.append('tanggal_penetapan', form.tanggal_penetapan);
			if (form.judul.trim()) data.append('judul', form.judul.trim());

			const hasil = await BumdesDesaService.createProdukHukum(data);
			const produkHukum = hasil?.data?.produk_hukum;

			if (!produkHukum) throw new Error('Server tidak mengembalikan dokumen yang dibuat');

			setTerbuka(false);
			setBerkas(null);
			setForm({ nomor: '', tahun: String(new Date().getFullYear()), tanggal_penetapan: hariIni(), judul: '' });
			onSelesai?.(produkHukum);

			Swal.fire({
				icon: 'success',
				title: `${label} tersimpan`,
				text: 'Dokumen langsung terpasang sebagai dasar hukum dan tercatat di Produk Hukum Desa.',
				timer: 2600,
				showConfirmButton: false,
			});
		} catch (error) {
			Swal.fire(
				'Gagal menyimpan',
				error?.response?.data?.message || error.message || 'Terjadi kesalahan.',
				'error',
			);
		} finally {
			setMenyimpan(false);
		}
	};

	if (!bisaSunting) return null;

	if (!terbuka) {
		return (
			<button
				type="button"
				onClick={() => setTerbuka(true)}
				className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50"
			>
				<FiUploadCloud className="h-4 w-4" />
				Belum ada di daftar? Unggah {label} di sini
			</button>
		);
	}

	return (
		<div className="rounded-xl border border-slate-300 bg-white p-4">
			<div className="mb-3 flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="text-sm font-semibold text-slate-900">Unggah {label}</p>
					<p className="mt-0.5 text-[11.5px] leading-snug text-slate-500">
						Dokumen ini sekalian tercatat di Produk Hukum Desa, jadi tidak perlu diunggah dua
						kali.
					</p>
				</div>
				<button
					type="button"
					onClick={() => setTerbuka(false)}
					className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
					aria-label="Tutup"
				>
					<FiX className="h-4 w-4" />
				</button>
			</div>

			<div className="space-y-3">
				<div>
					<label className="mb-1 block text-xs font-medium text-slate-700">
						Berkas PDF <span className="text-rose-500">*</span>
					</label>
					<input
						type="file"
						accept="application/pdf"
						onChange={pilihBerkas}
						className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
					/>
					{berkas && (
						<p className="mt-1 flex items-center gap-1 text-[11.5px] text-slate-600">
							<FiFileText className="h-3 w-3" /> {berkas.name}
						</p>
					)}
				</div>

				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<div>
						<label className="mb-1 block text-xs font-medium text-slate-700">
							Nomor <span className="text-rose-500">*</span>
						</label>
						<input
							type="text"
							value={form.nomor}
							onChange={(e) => ubah('nomor', e.target.value)}
							placeholder="Contoh: 05"
							className={KELAS_INPUT}
						/>
					</div>
					<div>
						<label className="mb-1 block text-xs font-medium text-slate-700">
							Tahun <span className="text-rose-500">*</span>
						</label>
						<input
							type="number"
							value={form.tahun}
							onChange={(e) => ubah('tahun', e.target.value)}
							placeholder="2024"
							className={KELAS_INPUT}
						/>
					</div>
					<div>
						<label className="mb-1 block text-xs font-medium text-slate-700">
							Tanggal Penetapan <span className="text-rose-500">*</span>
						</label>
						<input
							type="date"
							value={form.tanggal_penetapan}
							onChange={(e) => ubah('tanggal_penetapan', e.target.value)}
							className={KELAS_INPUT}
						/>
					</div>
				</div>

				<div>
					<label className="mb-1 block text-xs font-medium text-slate-700">
						Judul <span className="font-normal text-slate-400">(boleh dikosongkan)</span>
					</label>
					<input
						type="text"
						value={form.judul}
						onChange={(e) => ubah('judul', e.target.value)}
						placeholder={`Dikosongkan = dibuat otomatis dari nama BUM Desa`}
						className={KELAS_INPUT}
					/>
				</div>

				<div className="flex gap-2 pt-1">
					<button
						type="button"
						onClick={() => setTerbuka(false)}
						className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
					>
						Batal
					</button>
					<button
						type="button"
						onClick={simpan}
						disabled={menyimpan}
						className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
					>
						{menyimpan ? 'Menyimpan…' : 'Simpan & Pakai'}
					</button>
				</div>
			</div>
		</div>
	);
};

export default UnggahProdukHukumBumdes;
