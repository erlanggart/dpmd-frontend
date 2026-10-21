/**
 * Ekspor aparatur desa ke Excel dan PDF — untuk tabel dan untuk ringkasan
 * statistik.
 *
 * Datanya selalu yang sedang dilihat: tabel memakai penyaring tabel (diambil
 * utuh tanpa halaman dari /pemdes/aparatur-desa/ekspor), statistik memakai
 * angka yang sedang tergambar. Jadi isi berkas tidak pernah berbeda dari layar.
 *
 * Pustakanya (`xlsx`, `jspdf`) dimuat saat tombol ditekan, bukan saat halaman
 * dibuka — keduanya berat dan sebagian besar kunjungan tidak mengunduh apa pun.
 *
 * Pembagian isi yang disengaja:
 * - Excel = data lengkap untuk diolah lagi (semua kolom, satu baris satu orang).
 * - PDF   = dokumen untuk dibaca/dilampirkan: kolom secukupnya agar muat di A4
 *           mendatar. Yang butuh NIPD/SK/agama memakai Excel.
 */

const INSTANSI = 'Dinas Pemberdayaan Masyarakat dan Desa Kabupaten Bogor';

const capTanggal = () => {
	const d = new Date();
	const p = (n) => String(n).padStart(2, '0');
	return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
};

const waktuCetak = () =>
	new Date().toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const bersihkanNama = (teks) =>
	String(teks || 'Aparatur Desa')
		.replace(/[\\/:*?"<>|]+/g, '-')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 70);

const tanggal = (nilai) => {
	if (!nilai) return '';
	const d = new Date(nilai);
	if (Number.isNaN(d.getTime())) return '';
	return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const usia = (nilai) => {
	if (!nilai) return '';
	const d = new Date(nilai);
	if (Number.isNaN(d.getTime())) return '';
	return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
};

const LABEL_VERIFIKASI = { terverifikasi: 'Terverifikasi', ditolak: 'Ditolak', belum: 'Belum' };
const persen = (bagian, total) => (total ? Math.round((bagian / total) * 1000) / 10 : 0);

// ============================================================
// Tabel aparatur
// ============================================================

const KOLOM_EXCEL = [
	['No', (_, i) => i + 1, 5],
	['Kecamatan', (r) => r.kecamatan, 16],
	['Desa', (r) => r.desa, 18],
	['Kode Desa', (r) => r.kode_desa, 14],
	['Nama Lengkap', (r) => r.nama_lengkap, 30],
	['Jabatan', (r) => r.jabatan, 30],
	['NIPD', (r) => r.nipd || '', 18],
	['NIAP', (r) => r.niap || '', 14],
	['Jenis Kelamin', (r) => r.jenis_kelamin, 12],
	['Tempat Lahir', (r) => r.tempat_lahir || '', 16],
	['Tanggal Lahir', (r) => tanggal(r.tanggal_lahir), 12],
	['Usia', (r) => usia(r.tanggal_lahir), 6],
	['Pendidikan', (r) => r.pendidikan_terakhir || '', 18],
	['Agama', (r) => r.agama || '', 10],
	['Pangkat/Golongan', (r) => r.pangkat_golongan || '', 14],
	['Nomor SK Pengangkatan', (r) => r.nomor_sk_pengangkatan || '', 28],
	['Tanggal Pengangkatan', (r) => tanggal(r.tanggal_pengangkatan), 14],
	['Status', (r) => r.status, 10],
	['Verifikasi DPMD', (r) => LABEL_VERIFIKASI[r.status_verifikasi] || r.status_verifikasi, 14],
];

/** `penyaring` = daftar label filter aktif, mis. ["Kecamatan: Ciawi", "Status: Aktif"]. */
export const eksporTabelExcel = async (baris, { judul, penyaring = [] }) => {
	const XLSX = await import('xlsx');
	const buku = XLSX.utils.book_new();

	const isi = [KOLOM_EXCEL.map(([kepala]) => kepala), ...baris.map((r, i) => KOLOM_EXCEL.map(([, ambil]) => ambil(r, i)))];
	const lembar = XLSX.utils.aoa_to_sheet(isi);
	lembar['!cols'] = KOLOM_EXCEL.map(([, , lebar]) => ({ wch: lebar }));
	lembar['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: isi.length - 1, c: KOLOM_EXCEL.length - 1 } }) };
	XLSX.utils.book_append_sheet(buku, lembar, 'Aparatur');

	const keterangan = XLSX.utils.aoa_to_sheet([
		[judul],
		['Instansi', INSTANSI],
		['Dicetak', waktuCetak()],
		['Jumlah baris', baris.length],
		['Penyaring', penyaring.length ? penyaring.join('; ') : 'Tanpa penyaring (semua data)'],
	]);
	keterangan['!cols'] = [{ wch: 16 }, { wch: 80 }];
	XLSX.utils.book_append_sheet(buku, keterangan, 'Keterangan');

	XLSX.writeFile(buku, `${bersihkanNama(judul)} - ${capTanggal()}.xlsx`, { compression: true });
};

/** Kop dokumen yang sama untuk semua PDF aparatur. Mengembalikan posisi Y berikutnya. */
const kop = (doc, { judul, penyaring, ringkas }) => {
	const tepi = 14;
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(8);
	doc.setTextColor(100);
	doc.text(INSTANSI.toUpperCase(), tepi, 14);
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(14);
	doc.setTextColor(15);
	doc.text(judul, tepi, 21);
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(8);
	doc.setTextColor(90);
	const lebar = doc.internal.pageSize.getWidth() - tepi * 2;
	const baris = doc.splitTextToSize(
		`${ringkas} · Penyaring: ${penyaring.length ? penyaring.join('; ') : 'semua data'} · Dicetak ${waktuCetak()}`,
		lebar
	);
	doc.text(baris, tepi, 27);
	return 27 + baris.length * 3.6 + 2;
};

const nomorHalaman = (doc) => {
	const total = doc.getNumberOfPages();
	const lebar = doc.internal.pageSize.getWidth();
	const tinggi = doc.internal.pageSize.getHeight();
	for (let i = 1; i <= total; i++) {
		doc.setPage(i);
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(7.5);
		doc.setTextColor(130);
		doc.text(INSTANSI, 14, tinggi - 7);
		doc.text(`Halaman ${i} dari ${total}`, lebar - 14, tinggi - 7, { align: 'right' });
	}
};

const muatPdf = async (orientasi) => {
	const [modPdf, modTabel] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
	// Bentuk ekspornya beda antara bundel browser (default) dan Node (bernama).
	const JsPDF = modPdf.jsPDF || modPdf.default;
	const autoTable = modTabel.autoTable || modTabel.default;
	return { doc: new JsPDF({ orientation: orientasi, unit: 'mm', format: 'a4', compress: true }), autoTable };
};

const GAYA_TABEL = {
	theme: 'grid',
	styles: { font: 'helvetica', fontSize: 7, cellPadding: 1.4, textColor: 30, lineColor: 220, lineWidth: 0.1 },
	headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
	alternateRowStyles: { fillColor: [248, 250, 252] },
	margin: { left: 14, right: 14, bottom: 14 },
};

export const eksporTabelPdf = async (baris, { judul, penyaring = [] }) => {
	const { doc, autoTable } = await muatPdf('landscape');
	const awal = kop(doc, { judul, penyaring, ringkas: `${baris.length.toLocaleString('id-ID')} aparatur` });

	autoTable(doc, {
		...GAYA_TABEL,
		startY: awal,
		head: [['No', 'Kecamatan', 'Desa', 'Nama Lengkap', 'Jabatan', 'L/P', 'Tgl Lahir', 'Usia', 'Pendidikan', 'Tgl Angkat', 'Status', 'Verifikasi']],
		body: baris.map((r, i) => [
			i + 1,
			r.kecamatan,
			r.desa,
			r.nama_lengkap,
			r.jabatan,
			r.jenis_kelamin === 'Perempuan' ? 'P' : 'L',
			tanggal(r.tanggal_lahir),
			usia(r.tanggal_lahir),
			r.pendidikan_terakhir || '',
			tanggal(r.tanggal_pengangkatan),
			r.status,
			LABEL_VERIFIKASI[r.status_verifikasi] || r.status_verifikasi,
		]),
		columnStyles: { 0: { halign: 'right', cellWidth: 9 }, 3: { cellWidth: 46 }, 4: { cellWidth: 42 }, 5: { halign: 'center' }, 7: { halign: 'right' } },
	});

	nomorHalaman(doc);
	doc.save(`${bersihkanNama(judul)} - ${capTanggal()}.pdf`);
};

// ============================================================
// Ringkasan statistik
// ============================================================

/**
 * Semua bagian ringkasan dalam bentuk tabel [judul, kepala, baris]. Dipakai
 * bersama Excel (satu lembar per bagian) dan PDF (satu tabel per bagian),
 * supaya keduanya tidak pernah memuat angka yang berbeda.
 * `pendidikan` = hasil pengelompokan jenjang yang sama dengan grafiknya.
 */
const bagianStatistik = (stats, pendidikan, { bpd }) => {
	const total = Number(stats.total || 0);
	const bagian = [];

	const umum = [
		['Total aparatur', stats.total, 100],
		['Aktif', stats.aktif, persen(stats.aktif, total)],
		['Tidak aktif', stats.tidak_aktif, persen(stats.tidak_aktif, total)],
		['Laki-laki', stats.laki_laki, persen(stats.laki_laki, total)],
		['Perempuan', stats.perempuan, persen(stats.perempuan, total)],
	];
	if (stats.total_pemdes && stats.total_bpd) {
		umum.push(['Perangkat desa', stats.total_pemdes, persen(stats.total_pemdes, total)]);
		umum.push(['BPD', stats.total_bpd, persen(stats.total_bpd, total)]);
	}
	if (stats.verifikasi) {
		umum.push(['Terverifikasi DPMD', stats.verifikasi.terverifikasi, persen(stats.verifikasi.terverifikasi, total)]);
	}
	bagian.push(['Ringkasan', ['Uraian', 'Jumlah', '%'], umum]);

	const c = stats.cakupan_desa;
	if (c) {
		const baris = [
			['Jumlah desa', c.total_desa],
			['Sudah input aparatur', c.sudah_input],
			['Belum input aparatur', c.belum_input],
		];
		if (!bpd) {
			baris.push(['Dipimpin kepala desa definitif', c.pimpinan.definitif]);
			baris.push(['Dipimpin PJ kepala desa', c.pimpinan.pj]);
			baris.push(['Tanpa kepala desa / PJ aktif', c.pimpinan.kosong]);
			baris.push(['Pimpinan aktif lebih dari satu', c.pimpinan.ganda]);
		}
		bagian.push(['Cakupan Desa', ['Uraian', 'Jumlah desa'], baris]);
		if (c.desa_belum_input.length) {
			bagian.push(['Desa Belum Input', ['No', 'Kecamatan', 'Desa'], c.desa_belum_input.map((d, i) => [i + 1, d.kecamatan, d.desa])]);
		}
		if (!bpd && c.pimpinan_perlu_dicek.length) {
			bagian.push([
				'Pimpinan Desa Perlu Dicek',
				['No', 'Kecamatan', 'Desa', 'Keadaan', 'Nama'],
				c.pimpinan_perlu_dicek.map((d, i) => [i + 1, d.kecamatan, d.desa, d.keadaan, d.nama]),
			]);
		}
	}

	const jumlahJabatan = (stats.jabatan || []).reduce((t, j) => t + Number(j.value || 0), 0);
	bagian.push(['Komposisi Jabatan (aktif)', ['Jabatan', 'Jumlah', '%'], (stats.jabatan || []).map((j) => [j.name, j.value, persen(j.value, jumlahJabatan)])]);

	const jumlahUsia = (stats.rentang_usia || []).reduce((t, j) => t + Number(j.value || 0), 0);
	bagian.push(['Rentang Usia', ['Usia (tahun)', 'Jumlah', '%'], (stats.rentang_usia || []).map((u) => [u.name, u.value, persen(u.value, jumlahUsia)])]);

	const jumlahPendidikan = pendidikan.reduce((t, j) => t + Number(j.value || 0), 0);
	bagian.push(['Pendidikan Terakhir', ['Jenjang', 'Jumlah', '%'], pendidikan.map((p) => [p.name, p.value, persen(p.value, jumlahPendidikan)])]);

	if (stats.verifikasi_per_kecamatan?.length) {
		bagian.push([
			'Verifikasi per Kecamatan',
			['Kecamatan', 'Total', 'Terverifikasi', 'Ditolak', 'Belum', '% Terverifikasi'],
			stats.verifikasi_per_kecamatan.map((k) => [k.nama, k.total, k.terverifikasi, k.ditolak, k.belum, persen(k.terverifikasi, k.total)]),
		]);
	}
	return bagian;
};

export const eksporStatistikExcel = async (stats, pendidikan, { judul, penyaring = [], bpd = false }) => {
	const XLSX = await import('xlsx');
	const buku = XLSX.utils.book_new();
	for (const [nama, kepala, baris] of bagianStatistik(stats, pendidikan, { bpd })) {
		const lembar = XLSX.utils.aoa_to_sheet([[nama], [], kepala, ...baris]);
		lembar['!cols'] = kepala.map((k, i) => ({ wch: i === 0 && k !== 'No' ? 36 : Math.max(10, k.length + 2) }));
		// Nama lembar Excel maksimal 31 karakter dan tanpa tanda kurung siku.
		XLSX.utils.book_append_sheet(buku, lembar, nama.replace(/[[\]*?/\\:]/g, '').slice(0, 31));
	}
	const keterangan = XLSX.utils.aoa_to_sheet([
		[judul],
		['Instansi', INSTANSI],
		['Dicetak', waktuCetak()],
		['Penyaring', penyaring.length ? penyaring.join('; ') : 'Seluruh kabupaten'],
		['Catatan', 'Komposisi jabatan hanya menghitung aparatur berstatus Aktif.'],
	]);
	keterangan['!cols'] = [{ wch: 16 }, { wch: 80 }];
	XLSX.utils.book_append_sheet(buku, keterangan, 'Keterangan');
	XLSX.writeFile(buku, `${bersihkanNama(judul)} - ${capTanggal()}.xlsx`, { compression: true });
};

export const eksporStatistikPdf = async (stats, pendidikan, { judul, penyaring = [], bpd = false }) => {
	const { doc, autoTable } = await muatPdf('portrait');
	let y = kop(doc, { judul, penyaring, ringkas: `${Number(stats.total || 0).toLocaleString('id-ID')} aparatur` });

	for (const [nama, kepala, baris] of bagianStatistik(stats, pendidikan, { bpd })) {
		if (y > doc.internal.pageSize.getHeight() - 40) {
			doc.addPage();
			y = 16;
		}
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(10);
		doc.setTextColor(15);
		doc.text(nama, 14, y + 4);
		autoTable(doc, {
			...GAYA_TABEL,
			styles: { ...GAYA_TABEL.styles, fontSize: 8 },
			startY: y + 6,
			head: [kepala],
			body: baris.map((b) => b.map((v) => (typeof v === 'number' ? v.toLocaleString('id-ID') : v))),
			columnStyles: Object.fromEntries(
				kepala.map((k, i) => [i, ['Jumlah', 'Total', 'Terverifikasi', 'Ditolak', 'Belum', '%', '% Terverifikasi', 'Jumlah desa', 'No'].includes(k) ? { halign: 'right' } : {}])
			),
		});
		y = doc.lastAutoTable.finalY + 8;
	}

	nomorHalaman(doc);
	doc.save(`${bersihkanNama(judul)} - ${capTanggal()}.pdf`);
};
