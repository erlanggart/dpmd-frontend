// src/pages/kepala-dinas/components/bumdesEksporExcel.js
//
// Excel Direktori BUMDes yang enak dibaca TANPA kehilangan kegunaannya sebagai
// spreadsheet: angka tetap bertipe angka (bisa dijumlah/diurutkan) tetapi
// tampil sebagai "Rp 1.250.000", teks panjang membungkus, kepala tabel dan
// kolom identitas membeku saat digulir, dan baris "Jumlah" memakai SUBTOTAL
// sehingga ikut menyesuaikan saat filter Excel dipakai.
//
// Pakai exceljs, bukan xlsx: xlsx versi komunitas tidak bisa memberi gaya sel.
// Kolom dibaca dari KOLOM_EKSPOR di BumdesDirectory.jsx; atribut tambahan
// `kelompok`, `lebar`, dan `format` hanya dipakai di sini (PDF mengabaikannya).

const WARNA = {
	tinta: 'FF0F172A',
	abu: 'FF64748B',
	garis: 'FFE2E8F0',
	belang: 'FFF8FAFC',
	kepala: 'FF1E293B',
	jumlah: 'FFF1F5F9',
};

// Pita kelompok: warna lembut supaya kelompok kolom terbaca tanpa berisik.
const WARNA_KELOMPOK = ['FFE0F2FE', 'FFEDE9FE', 'FFDCFCE7', 'FFFEF3C7', 'FFFCE7F3'];

const FORMAT_ANGKA = {
	rupiah: '"Rp" #,##0;-"Rp" #,##0',
	angka: '#,##0',
	tahun: '0',
};

const tipis = (argb) => ({ style: 'thin', color: { argb } });

/** Angka yang tersimpan sebagai teks ("12", "2019") dijadikan angka; selain itu apa adanya. */
const rapikanNilai = (nilai, format) => {
	if (nilai === null || nilai === undefined || nilai === '') return null;
	if (typeof nilai === 'boolean') return nilai ? 'Ya' : 'Tidak';
	if (format && FORMAT_ANGKA[format]) {
		if (typeof nilai === 'number') return Number.isFinite(nilai) ? nilai : null;
		const s = String(nilai).trim();
		if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
	}
	return typeof nilai === 'number' ? nilai : String(nilai).trim() || null;
};

/** Perkiraan tinggi baris untuk teks yang membungkus (Excel tidak menghitungnya untuk berkas buatan). */
const tinggiBaris = (sel) => {
	let baris = 1;
	for (const { teks, lebar } of sel) {
		const muat = Math.max(Math.floor(lebar * 1.15), 8);
		const n = String(teks)
			.split('\n')
			.reduce((t, potong) => t + Math.max(1, Math.ceil(potong.length / muat)), 0);
		baris = Math.max(baris, n);
	}
	return Math.min(15 * baris + 3, 160);
};

const hurufKolom = (n) => {
	let s = '';
	for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
	return s;
};

/**
 * Susun buku kerja. Dipisah dari pengunduhan supaya bisa diuji di Node.
 *
 * @param ExcelJS  modul exceljs
 * @param kolom    [{ label, nilai, kelompok?, lebar?, format?: 'rupiah'|'angka'|'tahun'|'panjang' }]
 * @param baris    data yang SUDAH tersaring, urutan sesuai layar
 */
export const susunBukuDirektori = (ExcelJS, { kolom, baris, judul, subjudul, dicetak = new Date() }) => {
	const wb = new ExcelJS.Workbook();
	wb.creator = 'DPMD Kabupaten Bogor';
	wb.created = dicetak;
	wb.calcProperties = { fullCalcOnLoad: true };

	const semua = [{ label: 'No', lebar: 6, format: 'angka', kelompok: kolom[0]?.kelompok }, ...kolom];
	const n = semua.length;
	const akhir = hurufKolom(n);

	const ws = wb.addWorksheet('Direktori BUMDes', {
		properties: { defaultRowHeight: 18 },
		pageSetup: {
			paperSize: 9,
			orientation: 'landscape',
			fitToPage: true,
			fitToWidth: 1,
			fitToHeight: 0,
			margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
			printTitlesRow: '5:6',
		},
		headerFooter: { oddFooter: '&L&8Direktori BUMDes — DPMD Kabupaten Bogor&R&8Halaman &P dari &N' },
	});
	ws.columns = semua.map((k) => ({ width: k.lebar || 16 }));

	// ── Kop: judul, instansi, keterangan saringan + waktu cetak ──
	const tanggal = dicetak.toLocaleString('id-ID', {
		day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
	});
	const kop = [
		[judul, { size: 15, bold: true, color: { argb: WARNA.tinta } }, 24],
		['Dinas Pemberdayaan Masyarakat dan Desa Kabupaten Bogor', { size: 10, color: { argb: WARNA.abu } }, 16],
		[[subjudul, `Dicetak ${tanggal}`].filter(Boolean).join('   •   '), { size: 10, italic: true, color: { argb: WARNA.abu } }, 16],
	];
	kop.forEach(([teks, font, tinggi], i) => {
		const r = i + 1;
		ws.mergeCells(`A${r}:${akhir}${r}`);
		const c = ws.getCell(`A${r}`);
		c.value = teks;
		c.font = { name: 'Calibri', ...font };
		c.alignment = { vertical: 'middle' };
		ws.getRow(r).height = tinggi;
	});
	ws.getRow(4).height = 8;

	// ── Baris 5: pita kelompok kolom ──
	const BARIS_KELOMPOK = 5;
	const BARIS_KEPALA = 6;
	let mulai = 1;
	let warnaKe = 0;
	for (let i = 1; i <= n; i += 1) {
		const sekarang = semua[i - 1].kelompok || '';
		const berikut = i < n ? semua[i].kelompok || '' : null;
		if (berikut === sekarang) continue;
		if (i > mulai) ws.mergeCells(BARIS_KELOMPOK, mulai, BARIS_KELOMPOK, i);
		const c = ws.getCell(BARIS_KELOMPOK, mulai);
		c.value = sekarang.toUpperCase();
		const warna = WARNA_KELOMPOK[warnaKe % WARNA_KELOMPOK.length];
		for (let j = mulai; j <= i; j += 1) {
			const s = ws.getCell(BARIS_KELOMPOK, j);
			s.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: warna } };
			s.border = { top: tipis(WARNA.garis), left: tipis('FFFFFFFF'), right: tipis('FFFFFFFF') };
		}
		c.font = { name: 'Calibri', size: 9, bold: true, color: { argb: WARNA.tinta } };
		c.alignment = { horizontal: 'center', vertical: 'middle' };
		warnaKe += 1;
		mulai = i + 1;
	}
	ws.getRow(BARIS_KELOMPOK).height = 18;

	// ── Baris 6: kepala kolom ──
	const kepala = ws.getRow(BARIS_KEPALA);
	semua.forEach((k, i) => {
		const c = kepala.getCell(i + 1);
		c.value = k.label;
		c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
		c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: WARNA.kepala } };
		c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
		c.border = { left: tipis('FF334155'), right: tipis('FF334155') };
	});
	kepala.height = 32;

	// ── Isi ──
	const awalIsi = BARIS_KEPALA + 1;
	baris.forEach((d, idx) => {
		const nilai = [idx + 1, ...kolom.map((k) => rapikanNilai(k.nilai(d, idx), k.format))];
		const r = ws.getRow(awalIsi + idx);
		const bungkus = [];
		nilai.forEach((v, i) => {
			const k = semua[i];
			const c = r.getCell(i + 1);
			c.value = v;
			const angka = typeof v === 'number';
			c.font = { name: 'Calibri', size: 10, color: { argb: WARNA.tinta } };
			c.alignment = {
				vertical: 'top',
				horizontal: k.format === 'tahun' ? 'center' : angka ? 'right' : 'left',
				wrapText: k.format === 'panjang',
			};
			if (angka && FORMAT_ANGKA[k.format]) c.numFmt = FORMAT_ANGKA[k.format];
			if (idx % 2 === 1) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: WARNA.belang } };
			c.border = { bottom: tipis(WARNA.garis) };
			if (k.format === 'panjang' && v) bungkus.push({ teks: v, lebar: k.lebar || 16 });
		});
		if (bungkus.length) r.height = tinggiBaris(bungkus);
	});

	// ── Baris jumlah: SUBTOTAL(109) mengabaikan baris yang disembunyikan filter ──
	const akhirIsi = awalIsi + baris.length - 1;
	const rJumlah = ws.getRow(akhirIsi + 1);
	rJumlah.getCell(2).value = 'Jumlah (mengikuti filter)';
	semua.forEach((k, i) => {
		const c = rJumlah.getCell(i + 1);
		if (i > 0 && (k.format === 'rupiah' || k.format === 'angka')) {
			const huruf = hurufKolom(i + 1);
			const hasil = baris.reduce((t, d) => {
				const v = rapikanNilai(k.nilai(d), k.format);
				return typeof v === 'number' ? t + v : t;
			}, 0);
			c.value = { formula: `SUBTOTAL(109,${huruf}${awalIsi}:${huruf}${akhirIsi})`, result: hasil };
			c.numFmt = FORMAT_ANGKA[k.format];
			c.alignment = { horizontal: 'right' };
		}
		c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: WARNA.tinta } };
		c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: WARNA.jumlah } };
		c.border = { top: { style: 'medium', color: { argb: WARNA.kepala } } };
	});
	rJumlah.height = 20;

	// Kepala + kolom No s.d. Nama BUMDes tetap terlihat saat digulir.
	const xSplit = Math.max(1, semua.findIndex((k) => /^Nama BUM ?Des/i.test(k.label)) + 1);
	ws.views = [{ state: 'frozen', xSplit, ySplit: BARIS_KEPALA, activeCell: `A${awalIsi}`, showGridLines: false }];
	ws.autoFilter = { from: { row: BARIS_KEPALA, column: 1 }, to: { row: akhirIsi, column: n } };

	return wb;
};

/** Susun lalu unduh sebagai `<namaBerkas>-YYYY-MM-DD.xlsx`. */
export const eksporDirektoriExcel = async ({ namaBerkas, ...argumen }) => {
	const modul = await import('exceljs');
	const ExcelJS = modul.default ?? modul;
	const wb = susunBukuDirektori(ExcelJS, argumen);
	const buffer = await wb.xlsx.writeBuffer();
	const url = URL.createObjectURL(
		new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
	);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${namaBerkas}-${new Date().toISOString().slice(0, 10)}.xlsx`;
	a.click();
	URL.revokeObjectURL(url);
};
