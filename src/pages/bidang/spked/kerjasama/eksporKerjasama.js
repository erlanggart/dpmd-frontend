// src/pages/bidang/spked/kerjasama/eksporKerjasama.js
//
// Ekspor Monitoring Kerja Sama Desa ke Excel (.xlsx) dan PDF.
//
// Dipakai tab Kerja Sama Desa di Bidang SPKED, Core Dashboard, dan portal
// Tenaga Ahli — ketiganya memakai KerjasamaMonitoringPage yang sama, jadi
// berkasnya pun sama.
//
// DUA BERKAS, SATU SUMBER ANGKA. Ringkasan, rekap bidang, dan rekap kecamatan
// dihitung di sini dari BARIS YANG SAMA yang ikut terunduh, bukan dari
// /statistik. Kalau tidak, ringkasan di halaman pertama bisa menyebut angka
// yang tidak bisa dijumlahkan ulang dari tabel di belakangnya. Satu-satunya
// angka dari luar baris adalah cakupan Perdes, karena penyebutnya (jumlah desa)
// memang tidak ada di baris kerja sama.
//
// Pembagian isinya yang berbeda:
//   - Excel = bahan olah. Satu lembar per tabel, data rinci memuat SEMUA kolom
//     (ruang lingkup, pelaksanaan, tautan tiap dokumen), angka tetap angka,
//     tanggal tetap tanggal, dengan penyaring otomatis di baris kepala.
//   - PDF = dokumen rapat. Kop, angka kunci, rekap, rincian yang dipadatkan,
//     dan lampiran desa yang belum mengunggah Perdes — dikelompokkan per
//     kecamatan supaya 400-an desa tidak menjadi sepuluh halaman.
//
// Pustakanya dimuat saat tombol ditekan, pola yang sama dengan utils/eksporTabel.js.

const INSTANSI = 'DINAS PEMBERDAYAAN MASYARAKAT DAN DESA KABUPATEN BOGOR';
const BIDANG_DINAS = 'Bidang Sarana Prasarana Kewilayahan dan Ekonomi Desa (SPKED)';
const JUDUL = 'Laporan Monitoring Kerja Sama Desa';
const NAMA_BERKAS = 'kerjasama-desa';

// Batas teks panjang di PDF. Excel membawa teks utuhnya.
const POTONG_PDF = 160;

// Warna PDF — sama dengan kepala tabel di eksporTabel.js supaya seluruh berkas
// unduhan aplikasi ini terlihat satu keluarga.
const GELAP = [15, 23, 42];
const ABU = [100, 116, 139];
const GARIS = [226, 232, 240];
const LATAR_SELANG = [248, 250, 252];
const LATAR_PERINGATAN = [255, 247, 237];
const TEKS_PERINGATAN = [180, 83, 9];

// ── Penolong umum ───────────────────────────────────────────────────────────

const angka = (n) => Number(n || 0).toLocaleString('id-ID');
const pecahan = (a, b) => (b > 0 ? a / b : 0);
const teksPersen = (a, b) =>
	b > 0 ? `${(Math.round(pecahan(a, b) * 1000) / 10).toLocaleString('id-ID')}%` : '—';

/**
 * Cap waktu ekspor, dipakai nama berkas DAN isinya supaya keduanya menyebut
 * menit yang sama. Zona waktu dipaksa WIB: laptop yang jamnya salah zona tidak
 * boleh membuat lampiran rapat bertanggal kemarin.
 */
const capEkspor = () => {
	const pada = new Date();
	const zona = { timeZone: 'Asia/Jakarta' };
	const tanggal = pada.toLocaleDateString('id-ID', { ...zona, day: 'numeric', month: 'long', year: 'numeric' });
	const jam = pada.toLocaleTimeString('id-ID', { ...zona, hour: '2-digit', minute: '2-digit' });
	const p = Object.fromEntries(
		new Intl.DateTimeFormat('en-CA', {
			...zona,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23',
		})
			.formatToParts(pada)
			.map((x) => [x.type, x.value]),
	);
	return {
		pada,
		penuh: `${tanggal} pukul ${jam} WIB`,
		kode: `${p.year}${p.month}${p.day}-${p.hour}${p.minute}`,
	};
};

/**
 * Tanggal dari API (`2026-10-26T00:00:00.000Z`, kolom DATE) menjadi tengah
 * malam WAKTU SETEMPAT. `new Date(iso)` akan menghasilkan 07.00 WIB, dan
 * SheetJS menulisnya sebagai pecahan hari — sel Excel berisi 26/10/2026 07:00.
 */
const tanggalLokal = (nilai) => {
	const m = String(nilai || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
	return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

/** Cap waktu (updated_at) menjadi tanggal setempat — di sini zona memang perlu dikonversi. */
const tanggalDariWaktu = (nilai) => {
	if (!nilai) return null;
	const d = new Date(nilai);
	return Number.isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const teksTanggal = (tanggal) =>
	tanggal ? tanggal.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/** Status masa kerja sama, dari tanggal mulai/selesai terhadap hari ini. */
const statusMasa = (baris) => {
	const mulai = tanggalLokal(baris.tanggal_mulai);
	const selesai = tanggalLokal(baris.tanggal_selesai);
	if (!mulai && !selesai) return 'Tanggal belum diisi';
	const hariIni = new Date();
	hariIni.setHours(0, 0, 0, 0);
	if (selesai && selesai < hariIni) return 'Berakhir';
	if (mulai && mulai > hariIni) return 'Belum mulai';
	return 'Berjalan';
};

const potong = (teks, batas = POTONG_PDF) => {
	const bersih = String(teks || '').replace(/\s+/g, ' ').trim();
	return bersih.length > batas ? `${bersih.slice(0, batas - 1)}…` : bersih;
};

/** Tautan mutlak ke berkas. Hyperlink Excel tidak mengenal jalur relatif. */
const tautanMutlak = (urlDokumen, berkas) => {
	try {
		return new URL(urlDokumen(berkas), window.location.origin).href;
	} catch {
		return null;
	}
};

/** Penyaring aktif dalam satu kalimat — ditulis di kop kedua berkas. */
export const kalimatPenyaring = (saring, meta) => {
	const bagian = [];
	if (saring.tahun) bagian.push(`Tahun ${saring.tahun}`);
	if (saring.kecamatan_id) {
		const kec = (meta?.kecamatan || []).find((k) => String(k.id) === String(saring.kecamatan_id));
		bagian.push(`Kecamatan ${kec?.nama || saring.kecamatan_id}`);
	}
	if (saring.jenis) {
		const j = (meta?.jenis || []).find((x) => x.key === saring.jenis);
		bagian.push(j ? `${j.label} (${j.kode})` : saring.jenis);
	}
	if (saring.bidang) {
		const b = (meta?.bidang || []).find((x) => x.key === saring.bidang);
		bagian.push(`Bidang ${b ? b.label : saring.bidang}`);
	}
	if (saring.q?.trim()) bagian.push(`Pencarian "${saring.q.trim()}"`);
	return bagian.length ? bagian.join(' · ') : 'Seluruh data se-Kabupaten Bogor (tanpa penyaring)';
};

// ── Penyusun angka (dipakai Excel DAN PDF) ──────────────────────────────────

const susunRekap = (baris, meta) => {
	const jenis = meta?.jenis || [];
	const bidang = meta?.bidang || [];

	const desaTerlibat = new Set(baris.map((b) => b.desa?.id).filter(Boolean)).size;
	const lengkap = baris.filter((b) => b.dokumen_lengkap).length;

	const perJenis = jenis.map((j) => ({ ...j, jumlah: baris.filter((b) => b.jenis === j.key).length }));
	const perBidang = bidang.map((bd) => ({ ...bd, jumlah: baris.filter((b) => b.bidang === bd.key).length }));

	const peta = new Map();
	baris.forEach((b) => {
		const nama = b.desa?.kecamatan?.nama || '(Tanpa kecamatan)';
		const r = peta.get(nama) || { nama, desa: new Set(), total: 0, lengkap: 0, perJenis: {} };
		r.total += 1;
		if (b.desa?.id) r.desa.add(b.desa.id);
		if (b.dokumen_lengkap) r.lengkap += 1;
		r.perJenis[b.jenis] = (r.perJenis[b.jenis] || 0) + 1;
		peta.set(nama, r);
	});
	const perKecamatan = [...peta.values()]
		.map((r) => ({ ...r, desa: r.desa.size }))
		.sort((a, b) => b.total - a.total || a.nama.localeCompare(b.nama, 'id'));

	return { total: baris.length, desaTerlibat, lengkap, perJenis, perBidang, perKecamatan };
};

/** Desa belum ber-Perdes, dikelompokkan per kecamatan (untuk PDF). */
const kelompokkanDesaBelum = (desaBelum) => {
	const peta = new Map();
	desaBelum.forEach((d) => {
		const nama = d.kecamatan?.nama || '(Tanpa kecamatan)';
		const r = peta.get(nama) || { nama, desa: [], adaNomor: 0 };
		r.desa.push(d.nomor_perdes ? `${d.nama}*` : d.nama);
		if (d.nomor_perdes) r.adaNomor += 1;
		peta.set(nama, r);
	});
	return [...peta.values()].sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
};

const CATATAN = (cakupan) => [
	'Data kerja sama diisi oleh desa melalui aplikasi; DPMD memantau, tidak memverifikasi isinya.',
	'Dokumen wajib — Antar Desa (KAD): Peraturan Bersama Kepala Desa dan SK Badan Kerja Sama Desa; ' +
		'Pihak Ketiga (KDPK): Perjanjian Kerja Sama / MoU.',
	`Cakupan Perdes payung menghitung desa yang berkas Perdes-nya sudah terunggah, dari ${angka(
		cakupan?.total_desa,
	)} desa (kelurahan tidak menerbitkan Perdes). Angka ini mengikuti penyaring kecamatan, ` +
		'tetapi tidak dipengaruhi penyaring tahun, jenis, atau bidang.',
];

// ── Excel ───────────────────────────────────────────────────────────────────

const selPersen = (a, b) => ({ t: 'n', v: pecahan(a, b), z: '0.0%' });

/**
 * Sel tanggal dengan nomor seri yang dihitung sendiri dari UTC. Konversi
 * bawaan SheetJS membawa selisih zona waktu historis Jakarta tahun 1899
 * (+07:07:12), sehingga 15/01/2025 tersimpan sebagai 15/01/2025 00:00:12 —
 * tampak benar, tetapi gagal saat dibandingkan dengan tanggal lain.
 */
const selTanggal = (tanggal) =>
	tanggal
		? {
				t: 'n',
				v: Math.round(
					(Date.UTC(tanggal.getFullYear(), tanggal.getMonth(), tanggal.getDate()) - Date.UTC(1899, 11, 30)) /
						86400000,
				),
				z: 'dd/mm/yyyy',
				w: tanggal.toLocaleDateString('en-GB'),
			}
		: null;

const lebarKolom = (aoa, batas = 60) => {
	const lebar = [];
	aoa.slice(0, 400).forEach((r) =>
		(r || []).forEach((sel, i) => {
			const nilai = sel && typeof sel === 'object' && !(sel instanceof Date) ? sel.w ?? sel.v : sel;
			const panjang = nilai instanceof Date ? 11 : String(nilai ?? '').length;
			lebar[i] = Math.max(lebar[i] || 4, Math.min(panjang + 2, batas));
		}),
	);
	return lebar.map((wch) => ({ wch }));
};

/**
 * Satu lembar. `kepalaBaris` = indeks baris kepala tabel untuk autofilter;
 * `gabung` = baris judul yang dibentangkan selebar tabel.
 */
const tambahLembar = (XLSX, buku, nama, aoa, { kepalaBaris = null, gabung = [], lebar = null } = {}) => {
	const sheet = XLSX.utils.aoa_to_sheet(aoa);
	const jumlahKolom = Math.max(...aoa.map((r) => r?.length || 0), 1);
	sheet['!cols'] = lebar || lebarKolom(aoa.filter((_, i) => !gabung.includes(i)));
	if (gabung.length) {
		sheet['!merges'] = gabung.map((r) => ({ s: { r, c: 0 }, e: { r, c: jumlahKolom - 1 } }));
	}
	if (kepalaBaris !== null) {
		sheet['!autofilter'] = {
			ref: XLSX.utils.encode_range({ s: { r: kepalaBaris, c: 0 }, e: { r: aoa.length - 1, c: jumlahKolom - 1 } }),
		};
	}
	XLSX.utils.book_append_sheet(buku, sheet, nama.slice(0, 31));
};

/** Tiga baris kop yang sama di setiap lembar, supaya lembar mana pun yang dibuka tetap jelas asalnya. */
const kopLembar = (judul, penyaring, cap) => [
	[judul.toUpperCase()],
	[`${INSTANSI} — ${BIDANG_DINAS}`],
	[`Penyaring: ${penyaring} · Diekspor ${cap.penuh}`],
	[],
];

export const eksporKerjasamaExcel = async ({ baris, meta, saring, cakupan, desaBelum = [], urlDokumen }) => {
	const XLSX = await import('xlsx');
	const cap = capEkspor();
	const penyaring = kalimatPenyaring(saring, meta);
	const rekap = susunRekap(baris, meta);
	const petaJenis = new Map((meta?.jenis || []).map((j) => [j.key, j]));
	const petaBidang = new Map((meta?.bidang || []).map((b) => [b.key, b]));
	const semuaDokumen = (meta?.jenis || []).flatMap((j) => j.dokumen);
	const buku = XLSX.utils.book_new();

	// 1. Ringkasan
	const ringkasan = [
		[JUDUL.toUpperCase()],
		[INSTANSI],
		[BIDANG_DINAS],
		[],
		['Penyaring', penyaring],
		['Diekspor', cap.penuh],
		[],
		['ANGKA KUNCI', 'Jumlah', '% dari total'],
		['Total kerja sama', rekap.total, selPersen(rekap.total, rekap.total)],
		['Desa terlibat', rekap.desaTerlibat, ''],
		...rekap.perJenis.map((j) => [`${j.label} (${j.kode})`, j.jumlah, selPersen(j.jumlah, rekap.total)]),
		['Dokumen wajib lengkap', rekap.lengkap, selPersen(rekap.lengkap, rekap.total)],
		['Dokumen wajib belum lengkap', rekap.total - rekap.lengkap, selPersen(rekap.total - rekap.lengkap, rekap.total)],
		[],
		['CAKUPAN PERDES PAYUNG', 'Desa', '% dari desa'],
		['Sudah mengunggah Perdes', cakupan?.sudah ?? 0, selPersen(cakupan?.sudah ?? 0, cakupan?.total_desa ?? 0)],
		['Belum mengunggah Perdes', cakupan?.belum ?? 0, selPersen(cakupan?.belum ?? 0, cakupan?.total_desa ?? 0)],
		['Jumlah desa', cakupan?.total_desa ?? 0, ''],
		[],
		['CATATAN'],
		...CATATAN(cakupan).map((c, i) => [`${i + 1}. ${c}`]),
	];
	const barisCatatan = ringkasan.length - 3;
	tambahLembar(XLSX, buku, 'Ringkasan', ringkasan, {
		gabung: [0, 1, 2, barisCatatan, barisCatatan + 1, barisCatatan + 2],
		lebar: [{ wch: 34 }, { wch: 14 }, { wch: 14 }],
	});

	// 2. Data rinci — semua kolom, satu baris per kerja sama.
	const kepalaData = [
		'No',
		'Kecamatan',
		'Desa',
		'Tahun',
		'Kode Jenis',
		'Jenis Kerja Sama',
		'Mitra',
		'Bidang',
		'Sub-bidang',
		'Ruang Lingkup',
		'Tanggal Mulai',
		'Tanggal Selesai',
		'Status Masa',
		...semuaDokumen.map((d) => d.label),
		'Dokumen Wajib',
		'Pelaksanaan & Evaluasi',
		'Terakhir Diperbarui',
	];
	const isiData = baris.map((b, i) => {
		const jenis = petaJenis.get(b.jenis);
		const bidang = petaBidang.get(b.bidang);
		const berkas = new Map((b.dokumen || []).map((d) => [d.field, d.file]));
		return [
			i + 1,
			b.desa?.kecamatan?.nama || '',
			b.desa?.nama || '',
			b.tahun,
			jenis?.kode || b.jenis,
			jenis?.label || b.jenis,
			b.mitra || '',
			bidang ? `${bidang.nomor}. ${bidang.label}` : b.bidang,
			b.sub_bidang || '',
			b.ruang_lingkup || '',
			// null, bukan '': sel kosong sungguhan, supaya kolom tanggal tidak
			// tercampur teks dan tetap bisa diurutkan sebagai tanggal.
			selTanggal(tanggalLokal(b.tanggal_mulai)),
			selTanggal(tanggalLokal(b.tanggal_selesai)),
			statusMasa(b),
			// Kolom dokumen: "Tidak berlaku" untuk dokumen milik jenis lain, supaya
			// sel kosong tidak terbaca sebagai "belum diunggah". Yang sudah ada
			// berisi tautan yang bisa diklik langsung dari Excel.
			...semuaDokumen.map((d) => {
				if (!berkas.has(d.field)) return 'Tidak berlaku';
				const file = berkas.get(d.field);
				if (!file) return 'Belum';
				const tautan = tautanMutlak(urlDokumen, file);
				return tautan ? { t: 's', v: 'Ada (buka)', l: { Target: tautan, Tooltip: d.label } } : 'Ada';
			}),
			b.dokumen_lengkap ? 'Lengkap' : 'Belum lengkap',
			b.pelaksanaan || '',
			selTanggal(tanggalDariWaktu(b.updated_at)),
		];
	});
	const kop = kopLembar('Data Kerja Sama Desa', penyaring, cap);
	const lebarData = lebarKolom([kepalaData, ...isiData], 48);
	tambahLembar(XLSX, buku, 'Data Kerja Sama', [...kop, kepalaData, ...isiData], {
		kepalaBaris: kop.length,
		gabung: [0, 1, 2],
		lebar: lebarData,
	});

	// 3. Rekap kecamatan + bidang
	const kodeJenis = meta?.jenis || [];
	const kepalaKec = [
		'No',
		'Kecamatan',
		'Desa Terlibat',
		...kodeJenis.map((j) => `${j.kode} (${j.label})`),
		'Total Kerja Sama',
		'Dokumen Lengkap',
		'% Lengkap',
	];
	const isiKec = rekap.perKecamatan.map((r, i) => [
		i + 1,
		r.nama,
		r.desa,
		...kodeJenis.map((j) => r.perJenis[j.key] || 0),
		r.total,
		r.lengkap,
		selPersen(r.lengkap, r.total),
	]);
	const jumlahKec = [
		'',
		'JUMLAH',
		rekap.desaTerlibat,
		...rekap.perJenis.map((j) => j.jumlah),
		rekap.total,
		rekap.lengkap,
		selPersen(rekap.lengkap, rekap.total),
	];
	const kopKec = kopLembar('Rekap per Kecamatan', penyaring, cap);
	tambahLembar(XLSX, buku, 'Rekap Kecamatan', [...kopKec, kepalaKec, ...isiKec, jumlahKec], {
		kepalaBaris: kopKec.length,
		gabung: [0, 1, 2],
		lebar: lebarKolom([kepalaKec, ...isiKec], 40),
	});

	const kopBidang = kopLembar('Rekap per Bidang', penyaring, cap);
	const isiBidang = rekap.perBidang.map((bd, i) => [i + 1, bd.label, bd.jumlah, selPersen(bd.jumlah, rekap.total)]);
	tambahLembar(
		XLSX,
		buku,
		'Rekap Bidang',
		[...kopBidang, ['No', 'Bidang', 'Jumlah', '% dari Total'], ...isiBidang, ['', 'JUMLAH', rekap.total, selPersen(rekap.total, rekap.total)]],
		{ gabung: [0, 1, 2], lebar: [{ wch: 5 }, { wch: 34 }, { wch: 10 }, { wch: 13 }] },
	);

	// 4. Desa belum ber-Perdes — bahan penagihan, satu baris per desa.
	const kopBelum = kopLembar(
		'Desa Belum Mengunggah Perdes Kerja Sama',
		saring.kecamatan_id ? kalimatPenyaring({ kecamatan_id: saring.kecamatan_id }, meta) : 'Seluruh kecamatan',
		cap,
	);
	const kepalaBelum = ['No', 'Kecamatan', 'Desa', 'Keterangan', 'Kerja Sama Tercatat'];
	const isiBelum = desaBelum.map((d, i) => [
		i + 1,
		d.kecamatan?.nama || '',
		d.nama,
		d.nomor_perdes ? `Nomor ${d.nomor_perdes} tercatat, berkas belum diunggah` : 'Belum mengisi sama sekali',
		d.jumlah_kerjasama ?? 0,
	]);
	tambahLembar(
		XLSX,
		buku,
		'Desa Belum Perdes',
		[...kopBelum, kepalaBelum, ...(isiBelum.length ? isiBelum : [['', 'Seluruh desa sudah mengunggah Perdes']])],
		{ kepalaBaris: isiBelum.length ? kopBelum.length : null, gabung: [0, 1, 2], lebar: lebarKolom([kepalaBelum, ...isiBelum], 50) },
	);

	buku.Props = {
		Title: JUDUL,
		Subject: penyaring,
		Author: INSTANSI,
		Company: INSTANSI,
		Comments: `Diekspor ${cap.penuh}`,
		CreatedDate: cap.pada,
	};
	XLSX.writeFile(buku, `${NAMA_BERKAS}-${cap.kode}.xlsx`);
};

// ── PDF ─────────────────────────────────────────────────────────────────────

const GAYA_TABEL = {
	theme: 'grid',
	styles: { fontSize: 7.5, cellPadding: 1.6, overflow: 'linebreak', lineColor: GARIS, lineWidth: 0.1, textColor: 30 },
	headStyles: { fillColor: GELAP, textColor: 255, fontStyle: 'bold', fontSize: 7.5, valign: 'middle' },
	alternateRowStyles: { fillColor: LATAR_SELANG },
	footStyles: { fillColor: [241, 245, 249], textColor: 30, fontStyle: 'bold' },
	// Baris "Jumlah" hanya di ujung tabel; berulang di tiap halaman ia terbaca
	// sebagai subtotal halaman itu.
	showFoot: 'lastPage',
	// Satu kerja sama tidak boleh terbelah di dua halaman — separuh baris di
	// halaman berikutnya terbaca sebagai entri tanpa desa.
	rowPageBreak: 'avoid',
};

/** Kop halaman pertama. Mengembalikan posisi Y sesudahnya. */
const kopDokumen = (doc, { penyaring, cap }) => {
	const lebar = doc.internal.pageSize.getWidth();
	doc.setFillColor(...GELAP);
	doc.rect(0, 0, lebar, 3, 'F');

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(9);
	doc.setTextColor(...GELAP);
	doc.text(INSTANSI, 14, 11);
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(8);
	doc.setTextColor(...ABU);
	doc.text(BIDANG_DINAS, 14, 15.5);

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(15);
	doc.setTextColor(...GELAP);
	doc.text(JUDUL, 14, 25);

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(8.5);
	doc.setTextColor(...ABU);
	const baris = doc.splitTextToSize(`Penyaring: ${penyaring}`, lebar - 28 - 70);
	doc.text(baris, 14, 30.5);
	doc.text(`Dicetak ${cap.penuh}`, lebar - 14, 30.5, { align: 'right' });

	const y = 30.5 + baris.length * 3.8 + 1;
	doc.setDrawColor(...GARIS);
	doc.setLineWidth(0.3);
	doc.line(14, y, lebar - 14, y);
	doc.setTextColor(0);
	return y + 5;
};

/** Judul bagian; pindah halaman dulu bila sisa ruangnya tidak cukup untuk judul + beberapa baris. */
const judulBagian = (doc, teks, y, sisaMinimal = 30) => {
	const tinggi = doc.internal.pageSize.getHeight();
	let posisi = y;
	if (posisi + sisaMinimal > tinggi - 14) {
		doc.addPage();
		posisi = 16;
	}
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(10);
	doc.setTextColor(...GELAP);
	doc.text(teks, 14, posisi);
	doc.setTextColor(0);
	doc.setFont('helvetica', 'normal');
	return posisi + 3;
};

/** Deret kotak angka kunci di bawah kop. */
const kotakAngka = (doc, y, isi) => {
	const lebarHalaman = doc.internal.pageSize.getWidth();
	const jarak = 3;
	const lebar = (lebarHalaman - 28 - jarak * (isi.length - 1)) / isi.length;
	const tinggi = 19;
	isi.forEach((k, i) => {
		const x = 14 + i * (lebar + jarak);
		doc.setDrawColor(...GARIS);
		doc.setLineWidth(0.3);
		doc.setFillColor(255, 255, 255);
		doc.roundedRect(x, y, lebar, tinggi, 1.5, 1.5, 'FD');

		doc.setFont('helvetica', 'bold');
		doc.setFontSize(6.5);
		doc.setTextColor(...ABU);
		doc.text(k.label.toUpperCase(), x + 3, y + 5);

		doc.setFontSize(14);
		doc.setTextColor(...GELAP);
		doc.text(k.nilai, x + 3, y + 12.5);

		if (k.keterangan) {
			doc.setFont('helvetica', 'normal');
			doc.setFontSize(6.8);
			doc.setTextColor(...ABU);
			doc.text(doc.splitTextToSize(k.keterangan, lebar - 6)[0], x + 3, y + 16.5);
		}
	});
	doc.setTextColor(0);
	doc.setFont('helvetica', 'normal');
	return y + tinggi + 7;
};

const kakiHalaman = (doc, cap) => {
	const lebar = doc.internal.pageSize.getWidth();
	const tinggi = doc.internal.pageSize.getHeight();
	const jumlah = doc.internal.getNumberOfPages();
	for (let h = 1; h <= jumlah; h += 1) {
		doc.setPage(h);
		doc.setDrawColor(...GARIS);
		doc.setLineWidth(0.2);
		doc.line(14, tinggi - 11, lebar - 14, tinggi - 11);
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(7);
		doc.setTextColor(...ABU);
		doc.text(`${JUDUL} · ${INSTANSI} · dicetak ${cap.penuh}`, 14, tinggi - 7);
		doc.text(`Halaman ${h} dari ${jumlah}`, lebar - 14, tinggi - 7, { align: 'right' });
	}
	doc.setTextColor(0);
};

export const eksporKerjasamaPdf = async ({ baris, meta, saring, cakupan, desaBelum = [] }) => {
	const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
		import('jspdf'),
		import('jspdf-autotable'),
	]);
	const cap = capEkspor();
	const penyaring = kalimatPenyaring(saring, meta);
	const rekap = susunRekap(baris, meta);
	const petaJenis = new Map((meta?.jenis || []).map((j) => [j.key, j]));
	const petaBidang = new Map((meta?.bidang || []).map((b) => [b.key, b]));

	const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
	doc.setProperties({ title: JUDUL, subject: penyaring, author: INSTANSI, creator: INSTANSI });
	const margin = { left: 14, right: 14, top: 16, bottom: 16 };
	const tabel = (opsi) => {
		autoTable(doc, {
			...GAYA_TABEL,
			margin,
			...opsi,
			// Kepala dan kaki ikut perataan kolomnya: judul "Jumlah" yang rata kiri
			// di atas angka rata kanan membuat kolom angka tampak bergeser.
			didParseCell: (data) => {
				const rata = opsi.columnStyles?.[data.column.index]?.halign;
				if (rata && data.section !== 'body') data.cell.styles.halign = rata;
				opsi.didParseCell?.(data);
			},
		});
		return doc.lastAutoTable.finalY + 8;
	};

	let y = kopDokumen(doc, { penyaring, cap });

	// Angka kunci
	y = kotakAngka(doc, y, [
		{ label: 'Total kerja sama', nilai: angka(rekap.total), keterangan: `di ${angka(rekap.desaTerlibat)} desa` },
		...rekap.perJenis.map((j) => ({
			label: `${j.label} (${j.kode})`,
			nilai: angka(j.jumlah),
			keterangan: `${teksPersen(j.jumlah, rekap.total)} dari total`,
		})),
		{
			label: 'Dokumen wajib lengkap',
			nilai: teksPersen(rekap.lengkap, rekap.total),
			keterangan: `${angka(rekap.lengkap)} dari ${angka(rekap.total)} kerja sama`,
		},
		{
			label: 'Cakupan Perdes payung',
			nilai: cakupan?.persen === null || cakupan?.persen === undefined ? '—' : `${cakupan.persen}%`,
			keterangan: `${angka(cakupan?.sudah)} dari ${angka(cakupan?.total_desa)} desa`,
		},
	]);

	y = judulBagian(doc, 'A. Sebaran Bidang Kerja Sama', y);
	y = tabel({
		startY: y,
		head: [['No', 'Bidang', 'Jumlah', '% dari Total']],
		body: rekap.perBidang.map((bd) => [bd.nomor, bd.label, angka(bd.jumlah), teksPersen(bd.jumlah, rekap.total)]),
		foot: [['', 'Jumlah', angka(rekap.total), rekap.total ? '100%' : '—']],
		tableWidth: 150,
		columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 2: { halign: 'right', cellWidth: 22 }, 3: { halign: 'right', cellWidth: 26 } },
	});

	// Rekap kecamatan
	y = judulBagian(doc, 'B. Rekap per Kecamatan', y);
	const jenisUrut = meta?.jenis || [];
	y = tabel({
		startY: y,
		head: [['No', 'Kecamatan', 'Desa Terlibat', ...jenisUrut.map((j) => j.kode), 'Total', 'Dokumen Lengkap', '% Lengkap']],
		body: rekap.perKecamatan.map((r, i) => [
			i + 1,
			r.nama,
			angka(r.desa),
			...jenisUrut.map((j) => angka(r.perJenis[j.key] || 0)),
			angka(r.total),
			angka(r.lengkap),
			teksPersen(r.lengkap, r.total),
		]),
		foot: [[
			'',
			'Jumlah',
			angka(rekap.desaTerlibat),
			...rekap.perJenis.map((j) => angka(j.jumlah)),
			angka(rekap.total),
			angka(rekap.lengkap),
			teksPersen(rekap.lengkap, rekap.total),
		]],
		columnStyles: Object.fromEntries([
			[0, { cellWidth: 10, halign: 'center' }],
			...Array.from({ length: jenisUrut.length + 4 }, (_, i) => [i + 2, { halign: 'right' }]),
		]),
	});

	// Rincian
	y = judulBagian(doc, `C. Rincian Kerja Sama (${angka(rekap.total)})`, y);
	y = tabel({
		startY: y,
		head: [['No', 'Kecamatan / Desa', 'Thn', 'Jenis', 'Mitra & Ruang Lingkup', 'Bidang', 'Masa Kerja Sama', 'Dokumen Wajib']],
		body: baris.map((b, i) => {
			const jenis = petaJenis.get(b.jenis);
			const bidang = petaBidang.get(b.bidang);
			const mulai = tanggalLokal(b.tanggal_mulai);
			const selesai = tanggalLokal(b.tanggal_selesai);
			const lingkup = potong(b.ruang_lingkup);
			const dokumen = (b.dokumen || []).map((d) => `${d.singkat}: ${d.file ? 'Ada' : 'Belum'}`).join('\n');
			return [
				i + 1,
				`${b.desa?.nama || '—'}\nKec. ${b.desa?.kecamatan?.nama || '—'}`,
				b.tahun,
				jenis?.kode || b.jenis,
				lingkup ? `${b.mitra}\n${lingkup}` : b.mitra,
				`${bidang ? `${bidang.nomor}. ${bidang.label}` : b.bidang}${b.sub_bidang ? `\n${potong(b.sub_bidang, 80)}` : ''}`,
				mulai || selesai
					? `${teksTanggal(mulai)} s.d.\n${teksTanggal(selesai)}\n(${statusMasa(b)})`
					: 'Tanggal belum diisi',
				`${dokumen}\n${b.dokumen_lengkap ? 'LENGKAP' : 'BELUM LENGKAP'}`,
			];
		}),
		columnStyles: {
			0: { cellWidth: 9, halign: 'center' },
			1: { cellWidth: 38 },
			2: { cellWidth: 11, halign: 'center' },
			3: { cellWidth: 13, halign: 'center', fontStyle: 'bold' },
			4: { cellWidth: 'auto' },
			5: { cellWidth: 44 },
			6: { cellWidth: 30 },
			7: { cellWidth: 34 },
		},
		// Entri yang dokumennya belum lengkap diberi latar jingga muda di kolom
		// dokumen — yang perlu ditindaklanjuti harus terlihat tanpa membaca
		// setiap sel.
		didParseCell: (data) => {
			if (data.section !== 'body' || data.column.index !== 7) return;
			if (!baris[data.row.index]?.dokumen_lengkap) {
				data.cell.styles.fillColor = LATAR_PERINGATAN;
				data.cell.styles.textColor = TEKS_PERINGATAN;
			}
		},
	});

	// Lampiran: desa belum ber-Perdes, per kecamatan
	const kelompok = kelompokkanDesaBelum(desaBelum);
	y = judulBagian(
		doc,
		`D. Desa Belum Mengunggah Perdes Kerja Sama (${angka(desaBelum.length)} desa${
			saring.kecamatan_id ? '' : ', seluruh kecamatan'
		})`,
		y,
	);
	if (kelompok.length === 0) {
		doc.setFontSize(8.5);
		doc.text('Seluruh desa pada cakupan ini sudah mengunggah Perdes payung kerja sama.', 14, y + 3);
		y += 10;
	} else {
		y = tabel({
			startY: y,
			head: [['No', 'Kecamatan', 'Jumlah', 'Desa']],
			body: kelompok.map((k, i) => [i + 1, k.nama, angka(k.desa.length), k.desa.join(', ')]),
			columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 40 }, 2: { cellWidth: 16, halign: 'right' } },
		});
		if (kelompok.some((k) => k.adaNomor > 0)) {
			doc.setFontSize(7.5);
			doc.setTextColor(...ABU);
			doc.text('* nomor Perdes sudah dicatat desa, tetapi berkasnya belum diunggah.', 14, y - 3.5);
			doc.setTextColor(0);
			y += 3;
		}
	}

	// Catatan
	y = judulBagian(doc, 'Catatan', y, 24);
	doc.setFontSize(7.8);
	doc.setTextColor(60);
	const lebarTeks = doc.internal.pageSize.getWidth() - 28 - 6;
	CATATAN(cakupan).forEach((c, i) => {
		const pecah = doc.splitTextToSize(c, lebarTeks);
		doc.text(`${i + 1}.`, 14, y + 3);
		doc.text(pecah, 20, y + 3);
		y += pecah.length * 3.6 + 1.2;
	});
	doc.setTextColor(0);

	kakiHalaman(doc, cap);
	doc.save(`${NAMA_BERKAS}-${cap.kode}.pdf`);
};
