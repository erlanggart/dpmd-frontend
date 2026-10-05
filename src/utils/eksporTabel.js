// src/utils/eksporTabel.js
//
// Ekspor satu tabel ke Excel (.xlsx) dan PDF.
//
// KENAPA BERKAS INI ADA. Sebelumnya setiap halaman menulis sendiri perakit CSV
// sepuluh baris, dan hasilnya tidak pernah sama: ada yang memisah dengan ';'
// ada yang ',', ada yang lupa BOM sehingga nama desa berhuruf non-ASCII rusak
// di Excel, dan tidak satu pun bisa menghasilkan PDF. Satu definisi kolom
// dipakai kedua format supaya "ekspor Excel" dan "ekspor PDF" mustahil berbeda
// isinya.
//
// BENTUK KOLOM. Satu daftar `[{ label, nilai }]`, di mana `nilai` adalah fungsi
// yang menerima satu baris. Bukan nama properti, karena hampir semua kolom di
// aplikasi ini perlu diturunkan (`b.desa?.kecamatan?.nama`, label dari peta
// kode, rupiah) — menyimpan nama properti berarti pemanggil tetap harus
// memetakan barisnya dulu, jadi dua langkah untuk satu hasil.
//
// Pustakanya dimuat MALAS, pola yang sama dengan formulirEkspor.js: xlsx +
// jspdf + autotable berjumlah ratusan kilobyte, dan halaman yang hanya ditonton
// tidak perlu mengunduhnya sampai tombolnya benar-benar ditekan.

/** Teks untuk sel: null/undefined jadi string kosong, bukan "null". */
const keTeks = (nilai) => {
	if (nilai === null || nilai === undefined) return '';
	if (typeof nilai === 'boolean') return nilai ? 'Ya' : 'Tidak';
	return String(nilai);
};

/** `kerjasama-desa` + hari ini -> `kerjasama-desa-2026-10-05`. */
const namaBerkasBertanggal = (dasar) => `${dasar}-${new Date().toISOString().slice(0, 10)}`;

const tanggalIndonesia = () =>
	new Date().toLocaleString('id-ID', {
		day: '2-digit',
		month: 'long',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});

/**
 * Susun matriks [kepala, ...isi] sekali, lalu dipakai kedua format.
 *
 * Nomor urut ditambahkan di sini, bukan diserahkan ke pemanggil: tanpa itu
 * setiap halaman menuliskan kolom "No" sendiri dan separuhnya lupa, sehingga
 * baris di PDF tidak bisa dirujuk saat dibahas di rapat.
 */
const susunMatriks = (kolom, baris, { angkaMentah = false } = {}) => {
	const kepala = ['No', ...kolom.map((k) => k.label)];
	const isi = baris.map((b, i) => [
		i + 1,
		...kolom.map((k) => {
			const nilai = k.nilai(b, i);
			// Di Excel angka harus tetap bertipe angka: kalau diubah menjadi teks,
			// kolom aset dan omset tidak bisa dijumlahkan atau diurutkan di sana —
			// dan menjumlahkan kolom itu adalah alasan orang meminta Excel, bukan
			// PDF. Di PDF semuanya teks, karena autoTable hanya menggambar.
			if (angkaMentah && typeof nilai === 'number' && Number.isFinite(nilai)) return nilai;
			return keTeks(nilai);
		}),
	]);
	return { kepala, isi };
};

/**
 * Unduh sebagai .xlsx.
 *
 * Lebar kolom dihitung dari isi terpanjang (dibatasi 48 karakter) karena lebar
 * bawaan Excel memotong hampir semua nama BUM Desa menjadi "BUM Desa Suka...".
 */
export const eksporExcel = async ({ kolom, baris, namaBerkas, namaSheet = 'Data' }) => {
	const XLSX = await import('xlsx');
	const { kepala, isi } = susunMatriks(kolom, baris, { angkaMentah: true });

	const sheet = XLSX.utils.aoa_to_sheet([kepala, ...isi]);
	sheet['!cols'] = kepala.map((judul, i) => ({
		wch: Math.min(Math.max(judul.length, ...isi.map((r) => keTeks(r[i]).length), 4) + 2, 48),
	}));

	const buku = XLSX.utils.book_new();
	// Nama sheet Excel maksimal 31 karakter; lebih dari itu berkasnya ditolak.
	XLSX.utils.book_append_sheet(buku, sheet, namaSheet.slice(0, 31));
	XLSX.writeFile(buku, `${namaBerkasBertanggal(namaBerkas)}.xlsx`);
};

/**
 * Unduh sebagai PDF berorientasi lanskap.
 *
 * Lanskap, bukan portrait: tabel di aplikasi ini jarang berkolom kurang dari
 * tujuh, dan di portrait autoTable memampatkannya sampai setiap sel memecah
 * menjadi empat baris.
 */
export const eksporPdf = async ({ kolom, baris, namaBerkas, judul, subjudul }) => {
	const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
		import('jspdf'),
		import('jspdf-autotable'),
	]);
	const { kepala, isi } = susunMatriks(kolom, baris);

	const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
	const lebar = doc.internal.pageSize.getWidth();
	const tinggi = doc.internal.pageSize.getHeight();

	doc.setFontSize(13);
	doc.setFont('helvetica', 'bold');
	doc.text(judul, 14, 14);

	doc.setFontSize(9);
	doc.setFont('helvetica', 'normal');
	doc.setTextColor(100);
	doc.text('DINAS PEMBERDAYAAN MASYARAKAT DAN DESA KABUPATEN BOGOR', 14, 19.5);
	if (subjudul) doc.text(subjudul, 14, 24.5);
	// Jumlah baris dan waktu cetak ditaruh di kepala, bukan footer: berkas ini
	// beredar sebagai lampiran rapat, dan pembacanya perlu tahu potret kapan
	// yang sedang dipegangnya tanpa menggulir ke halaman terakhir.
	doc.text(`${isi.length} baris - dicetak ${tanggalIndonesia()}`, lebar - 14, 19.5, {
		align: 'right',
	});
	doc.setTextColor(0);

	autoTable(doc, {
		head: [kepala],
		body: isi,
		startY: subjudul ? 29 : 24,
		margin: { left: 14, right: 14, top: 16 },
		styles: { fontSize: 7.5, cellPadding: 1.6, overflow: 'linebreak' },
		headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 7.5 },
		alternateRowStyles: { fillColor: [248, 250, 252] },
		columnStyles: { 0: { cellWidth: 10, halign: 'right' } },
	});

	// Nomor halaman digambar SETELAH tabel selesai, dalam lintasan sendiri.
	// Di dalam didDrawPage, getNumberOfPages() baru menghitung halaman yang
	// sudah digambar, sehingga halaman pertama dari lima tertulis "1 dari 1".
	const jumlahHalaman = doc.internal.getNumberOfPages();
	for (let h = 1; h <= jumlahHalaman; h += 1) {
		doc.setPage(h);
		doc.setFontSize(7.5);
		doc.setTextColor(120);
		doc.text(`Halaman ${h} dari ${jumlahHalaman}`, lebar - 14, tinggi - 8, { align: 'right' });
	}
	doc.setTextColor(0);

	doc.save(`${namaBerkasBertanggal(namaBerkas)}.pdf`);
};
