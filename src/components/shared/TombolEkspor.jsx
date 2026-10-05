// src/components/shared/TombolEkspor.jsx
//
// Sepasang tombol unduh: Excel dan PDF, dari satu definisi kolom.
//
// Dibuat sebagai komponen, bukan dua tombol yang ditulis ulang di setiap
// halaman, karena bagian yang mudah salah bukan tombolnya melainkan keadaan di
// sekelilingnya: menonaktifkan tombol saat tidak ada baris, menahan klik kedua
// selama pustaka masih dimuat, dan memberi tahu kalau gagal. Tiga hal itu
// dilupakan di hampir setiap tombol unduh yang ditulis sendiri.
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { LuFileSpreadsheet, LuFileText, LuLoader } from 'react-icons/lu';
import { eksporExcel, eksporPdf } from '../../utils/eksporTabel';

const TOMBOL =
	'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * @param kolom      [{ label, nilai: (baris) => any }]
 * @param baris      data yang sudah ada di klien — SUDAH tersaring
 * @param ambilBaris async () => baris[]; dipakai bila datanya berhalaman di
 *                   server dan harus dikumpulkan dulu saat tombol ditekan
 * @param jumlah     jumlah baris yang akan terunduh, untuk keterangan dan untuk
 *                   menonaktifkan tombol saat `ambilBaris` dipakai (saat itu
 *                   `baris` belum ada di klien, jadi panjangnya tidak diketahui)
 * @param namaBerkas dasar nama berkas, tanpa tanggal dan tanpa ekstensi
 * @param judul      judul di kepala PDF
 * @param subjudul   satu baris keterangan di bawah judul (mis. penyaring aktif)
 *
 * Yang diekspor harus persis yang sedang dilihat: `baris` menerima data yang
 * SUDAH tersaring, dan `ambilBaris` diharapkan memakai penyaring yang sama
 * dengan layarnya. Ekspor yang diam-diam mengirim seluruh data padahal layarnya
 * tersaring adalah cara paling halus membuat orang salah mengambil kesimpulan.
 */
const TombolEkspor = ({
	kolom,
	baris = null,
	ambilBaris = null,
	jumlah = null,
	namaBerkas,
	judul,
	subjudul,
	keterangan = true,
}) => {
	const [sibuk, setSibuk] = useState(null); // 'excel' | 'pdf' | null

	// Dengan `ambilBaris`, jumlahnya hanya diketahui dari `jumlah` yang dikirim
	// pemanggil (biasanya meta paginasi dari server). Tanpa keduanya tombolnya
	// mati — lebih baik mati daripada menghasilkan berkas berisi nol baris.
	const banyak = jumlah ?? baris?.length ?? 0;
	const kosong = banyak === 0;

	const jalankan = async (jenis) => {
		if (kosong || sibuk) return;
		setSibuk(jenis);
		try {
			const isi = ambilBaris ? await ambilBaris() : baris;
			if (!isi?.length) {
				toast.error('Tidak ada baris untuk diekspor.');
				return;
			}
			const argumen = { kolom, baris: isi, namaBerkas, judul, subjudul };
			if (jenis === 'excel') await eksporExcel({ ...argumen, namaSheet: judul });
			else await eksporPdf(argumen);
		} catch (error) {
			console.error('[TombolEkspor] gagal mengekspor:', error);
			toast.error(
				error?.response?.data?.message || 'Berkas gagal dibuat. Coba lagi.',
			);
		} finally {
			setSibuk(null);
		}
	};

	const judulTombol = (format) =>
		kosong ? 'Tidak ada baris untuk diekspor' : `Unduh sebagai ${format}`;

	return (
		<div className="flex flex-wrap items-center gap-2">
			<button
				type="button"
				onClick={() => jalankan('excel')}
				disabled={kosong || Boolean(sibuk)}
				title={judulTombol('Excel')}
				className={TOMBOL}
			>
				{sibuk === 'excel' ? (
					<LuLoader className="h-4 w-4 animate-spin" />
				) : (
					<LuFileSpreadsheet className="h-4 w-4" />
				)}
				Excel
			</button>

			<button
				type="button"
				onClick={() => jalankan('pdf')}
				disabled={kosong || Boolean(sibuk)}
				title={judulTombol('PDF')}
				className={TOMBOL}
			>
				{sibuk === 'pdf' ? (
					<LuLoader className="h-4 w-4 animate-spin" />
				) : (
					<LuFileText className="h-4 w-4" />
				)}
				PDF
			</button>

			{/* Jumlah baris disebut di samping tombol supaya jelas bahwa yang
			    terunduh adalah seluruh hasil penyaringan — bukan satu halaman
			    yang kebetulan terlihat, dan bukan pula seluruh data. */}
			{keterangan && !kosong && (
				<span className="text-[11.5px] tabular-nums text-slate-400">
					{banyak.toLocaleString('id-ID')} baris
				</span>
			)}
		</div>
	);
};

export default TombolEkspor;
