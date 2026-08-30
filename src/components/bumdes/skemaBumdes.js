// src/components/bumdes/skemaBumdes.js
//
// SATU daftar kolom BUM Desa, dipakai halaman Desa maupun Bidang SPKED.
//
// Sebelum ini ada dua formulir yang ditulis terpisah: BumdesDesaPage (85 kolom)
// dan BumdesForm milik SPKED (69 kolom). Keduanya menyunting tabel yang sama,
// tapi setiap kali kolom baru ditambahkan hanya salah satu yang menyusul —
// sampai SPKED tertinggal tiga puluh kolom, termasuk Omset/Laba 2025, seluruh
// blok MBG, dan ketahanan pangan. Kolom yang tidak ada di formulir bukan cuma
// tak bisa diisi; ia juga tak terlihat, jadi tidak ada yang sadar hilang.
//
// Karena itu daftarnya dipisah dari tampilannya. Menambah kolom cukup di sini,
// dan kedua halaman langsung ikut.
//
// BEDA SATU-SATUNYA antara kedua halaman ada di dokumen dasar hukum:
//   • Desa  memilih Perdes/SK dari modul Produk Hukum Desa (berkasnya sudah
//     diunggah di sana), sehingga yang disimpan adalah id-nya.
//   • SPKED mengunggah berkasnya langsung dari sini.
// Itu diatur `mode` di FormulirBumdes, bukan dengan menyalin daftar kolom.

const JK = [
	{ value: 'Laki-laki', label: 'Laki-laki' },
	{ value: 'Perempuan', label: 'Perempuan' },
];

const PERAN_PANGAN = [
	{ value: 'Pengelola', label: 'Pengelola' },
	{ value: 'Distribusi', label: 'Distribusi' },
	{ value: 'Pemasaran', label: 'Pemasaran' },
	{ value: 'Tidak ada peran', label: 'Tidak ada peran' },
];

/** Satu blok pengurus: nama, jenis kelamin, nomor HP. */
const pengurus = (jabatan, kunciNama, kunciJk, kunciHp) => [
	{ jenis: 'teks', label: `Nama ${jabatan}`, kunci: kunciNama, contoh: `Masukkan nama ${jabatan.toLowerCase()}` },
	{ jenis: 'pilih', label: 'Jenis Kelamin', kunci: kunciJk, opsi: JK },
	{ jenis: 'teks', label: `No HP ${jabatan}`, kunci: kunciHp, contoh: 'Contoh: 08123456789' },
];

/** Deret kolom rupiah bertahun, supaya tidak ditulis satu per satu. */
const rupiahTahunan = (labelPola, kunciPola, tahun) =>
	tahun.map((th) => ({
		jenis: 'angka',
		label: labelPola.replace('%s', th),
		kunci: kunciPola.replace('%s', th),
		contoh: '0',
	}));

export const SEKSI_BUMDES = [
	{
		id: 'identitas',
		judul: 'Identitas BUM Desa',
		kolom: [
			{ jenis: 'teks', label: 'Nama BUMDes', kunci: 'namabumdesa', contoh: 'Masukkan nama BUMDes', wajib: true },
			// Di halaman desa ketiganya terisi otomatis dari akun; di SPKED
			// dipilih lewat penunjuk desa di atas formulir.
			{ jenis: 'teks', label: 'Nama Desa', kunci: 'desa', dariAkunDesa: true },
			{ jenis: 'teks', label: 'Kecamatan', kunci: 'kecamatan', dariAkunDesa: true },
			{ jenis: 'teks', label: 'Kode Desa', kunci: 'kode_desa', dariAkunDesa: true },
			{ jenis: 'angka', label: 'Tahun Pendirian', kunci: 'TahunPendirian', contoh: 'Contoh: 2020' },
			{
				jenis: 'pilih', label: 'Status BUMDes', kunci: 'status',
				opsi: [
					{ value: 'aktif', label: 'Aktif' },
					{ value: 'tidak_aktif', label: 'Tidak Aktif' },
				],
			},
			{
				jenis: 'teksPanjang', label: 'Keterangan Tidak Aktif', kunci: 'keterangan_tidak_aktif',
				contoh: 'Jelaskan alasan tidak aktif', baris: 2, lebar: 'penuh',
				// Hanya bermakna kalau statusnya memang tidak aktif.
				tampilBila: (d) => String(d.status || '').startsWith('tidak'),
			},
			{ jenis: 'teks', label: 'No. HP BUMDes', kunci: 'TelfonBumdes', contoh: 'Contoh: 08123456789' },
			{ jenis: 'teksPanjang', label: 'Alamat BUMDes', kunci: 'AlamatBumdesa', contoh: 'Masukkan alamat lengkap BUMDes', baris: 2, lebar: 'penuh' },
			{ jenis: 'teks', label: 'Email BUMDes', kunci: 'Alamatemail', tipeInput: 'email', contoh: 'contoh@email.com' },
		],
	},

	{
		id: 'legalitas',
		judul: 'Dasar Hukum & Legalitas',
		// Blok Perdes/SK disisipkan FormulirBumdes sesuai `mode` — lihat
		// keterangan di kepala berkas ini.
		slotDokumenDasarHukum: true,
		kolom: [
			{ jenis: 'teks', label: 'Nomor Perdes', kunci: 'NomorPerdes', contoh: 'Contoh: 05 Tahun 2024' },
			{ jenis: 'teks', label: 'NIB (Nomor Induk Berusaha)', kunci: 'NIB', contoh: 'Masukkan NIB' },
			{ jenis: 'teks', label: 'LKPP (Lembaga Kebijakan Pengadaan)', kunci: 'LKPP', contoh: 'Masukkan LKPP' },
			{ jenis: 'teks', label: 'NPWP', kunci: 'NPWP', contoh: 'Masukkan NPWP' },
			{
				jenis: 'pilih', label: 'Status Badan Hukum', kunci: 'badanhukum',
				opsi: [
					{ value: 'Terbit Sertifikat Badan Hukum', label: 'Terbit Sertifikat Badan Hukum' },
					{ value: 'Nama Terverifikasi', label: 'Nama Terverifikasi' },
					{ value: 'Perbaikan Dokumen', label: 'Perbaikan Dokumen' },
					{ value: 'Belum Melakukan Proses', label: 'Belum Melakukan Proses' },
				],
			},
		],
	},

	{
		id: 'kepengurusan',
		judul: 'Kepengurusan',
		kolom: [
			...pengurus('Penasihat', 'NamaPenasihat', 'JenisKelaminPenasihat', 'HPPenasihat'),
			...pengurus('Pengawas', 'NamaPengawas', 'JenisKelaminPengawas', 'HPPengawas'),
			...pengurus('Direktur', 'NamaDirektur', 'JenisKelaminDirektur', 'HPDirektur'),
			...pengurus('Sekretaris', 'NamaSekretaris', 'JenisKelaminSekretaris', 'HPSekretaris'),
			...pengurus('Bendahara', 'NamaBendahara', 'JenisKelaminBendahara', 'HPBendahara'),
			...pengurus('Staf Lainnya', 'NamaStafLainnya', 'JenisKelaminStafLainnya', 'HPStafLainnya'),
		],
	},

	{
		id: 'usaha',
		judul: 'Tenaga Kerja & Bidang Usaha',
		kolom: [
			{ jenis: 'angka', label: 'Total Tenaga Kerja', kunci: 'TotalTenagaKerja', contoh: 'Jumlah total pekerja' },
			{ jenis: 'teks', label: 'Kategori Usaha', kunci: 'JenisUsaha', contoh: 'Contoh: Perdagangan dan Jasa Umum' },
			{ jenis: 'teks', label: 'Jenis Usaha Utama', kunci: 'JenisUsahaUtama', contoh: 'Usaha yang paling utama dijalankan' },
			{ jenis: 'teks', label: 'Jenis Usaha Lainnya', kunci: 'JenisUsahaLainnya', contoh: 'Usaha lain di luar usaha utama' },
			{ jenis: 'teks', label: 'Jenis Usaha 2021', kunci: 'JenisUsaha2021', contoh: 'Usaha yang tercatat pada 2021' },
		],
	},

	{
		id: 'modal',
		judul: 'Permodalan & Aset',
		kolom: [
			...rupiahTahunan('Penyertaan Modal %s (Rp)', 'PenyertaanModal%s', ['2019', '2020', '2021', '2022', '2023', '2024']),
			{ jenis: 'angka', label: 'Penganggaran Penyertaan Modal 2025 (Rp)', kunci: 'PenganggaranPenyertaanModal2025', contoh: '0' },
			{ jenis: 'angka', label: 'Penyertaan Modal TPKK/Kelompok (Rp)', kunci: 'PenyertaanModalTPKK', contoh: '0' },
			{ jenis: 'angka', label: 'Total Realisasi 2019-2025 (Rp)', kunci: 'TotalRealisasiPenyertaanModal20192025', contoh: '0' },
			{ jenis: 'angka', label: 'Jumlah Modal Awal (Rp)', kunci: 'JumlahModalAwal', contoh: '0' },
			{ jenis: 'angka', label: 'Modal dari Sumber Lain (Rp)', kunci: 'SumberLain', contoh: '0' },
			{ jenis: 'teks', label: 'Jenis Aset', kunci: 'JenisAset', contoh: 'Contoh: Tanah, bangunan, kendaraan' },
			{ jenis: 'angka', label: 'Nilai Aset (Rp)', kunci: 'NilaiAset', contoh: '0' },
		],
	},

	{
		id: 'omset',
		judul: 'Omset & Laba',
		kolom: [
			{ jenis: 'angka', label: 'Omset 2023 (Rp)', kunci: 'Omset2023', contoh: '0' },
			{ jenis: 'angka', label: 'Laba 2023 (Rp)', kunci: 'Laba2023', contoh: '0' },
			{ jenis: 'angka', label: 'Omset 2024 Semester 1 (Rp)', kunci: 'Omset2024Sem1', contoh: '0' },
			{ jenis: 'angka', label: 'Laba 2024 Semester 1 (Rp)', kunci: 'Laba2024Sem1', contoh: '0' },
			{ jenis: 'angka', label: 'Omset 2024 Setahun (Rp)', kunci: 'Omset2024', contoh: '0' },
			{ jenis: 'angka', label: 'Laba 2024 Setahun (Rp)', kunci: 'Laba2024', contoh: '0' },
			{ jenis: 'angka', label: 'Omset 2025 (Rp)', kunci: 'Omset2025', contoh: '0' },
			{ jenis: 'angka', label: 'Laba 2025 (Rp)', kunci: 'Laba2025', contoh: '0' },
		],
	},

	{
		id: 'pangan',
		judul: 'Ketahanan Pangan',
		kolom: [
			{ jenis: 'teks', label: 'Jenis Usaha Ketahanan Pangan', kunci: 'JenisUsahaKetahananPangan', contoh: 'Contoh: Peternakan, Pertanian' },
			{ jenis: 'teks', label: 'Volume Ketahanan Pangan', kunci: 'VolumeKetahananPangan', contoh: 'Contoh: 1000 ekor' },
			{ jenis: 'teksPanjang', label: 'Keterangan Usaha Ketahanan Pangan', kunci: 'KeteranganUsahaKetahananPangan', contoh: 'Rincian usaha ketahanan pangan yang dijalankan', baris: 2, lebar: 'penuh' },
			{ jenis: 'angka', label: 'Anggaran Penyertaan Modal Ketahanan Pangan (Rp)', kunci: 'AnggaranModalKetahananPangan', contoh: '0' },
		],
	},

	{
		id: 'pades',
		judul: 'Kontribusi terhadap PADes',
		kolom: rupiahTahunan('Kontribusi PADes %s (Rp)', 'KontribusiTerhadapPADes%s', ['2021', '2022', '2023', '2024', '2025']),
	},

	{
		id: 'kemitraan',
		judul: 'Kemitraan',
		kolom: [
			{ jenis: 'teksPanjang', label: 'Mitra / Kerja Sama Pihak Ketiga', kunci: 'KerjasamaPihakKetiga', contoh: 'Contoh: PT Solusi Limbah Abadi', baris: 2, lebar: 'penuh' },
			// Kolom basis datanya bertanda hubung; Prisma menamainya dengan
			// garis bawah lewat @map, dan backend menerima kedua ejaan lewat
			// peta alias. Yang dipakai di sini bentuk garis bawah.
			{ jenis: 'teks', label: 'Tahun Mulai - Tahun Berakhir', kunci: 'TahunMulai_TahunBerakhir', contoh: 'Contoh: 2022-2025' },
			{ jenis: 'angka', label: 'Kontribusi Kemitraan ke PADes 2024 (Rp)', kunci: 'KontribusiKemitraanPADes2024', contoh: '0' },
			{ jenis: 'angka', label: 'Kontribusi Kemitraan ke PADes 2025 (Rp)', kunci: 'KontribusiKemitraanPADes2025', contoh: '0' },
		],
	},

	{
		id: 'program',
		judul: 'Peran dalam Program Pemerintah',
		kolom: [
			{ jenis: 'pilih', label: 'Peran Ketahanan Pangan 2024', kunci: 'Ketapang2024', opsi: PERAN_PANGAN },
			{ jenis: 'pilih', label: 'Peran Ketahanan Pangan 2025', kunci: 'Ketapang2025', opsi: PERAN_PANGAN },
			{
				jenis: 'pilih', label: 'Termasuk Desa Wisata', kunci: 'DesaWisataStatus',
				opsi: [
					{ value: 'Ya', label: 'Ya' },
					{ value: 'Tidak', label: 'Tidak' },
				],
			},
			{ jenis: 'teks', label: 'Peran pada Desa Wisata', kunci: 'DesaWisata', contoh: 'Contoh: Pengelola Utama' },
			{ jenis: 'teks', label: 'Peran dalam MBG', kunci: 'PeranMBG', contoh: 'Contoh: Pemasok Bahan Baku' },
			{ jenis: 'teks', label: 'Mekanisme Kerja Sama', kunci: 'MekanismeKerjaSamaMBG', contoh: 'Contoh: Langsung dengan SPPG/Yayasan' },
			{ jenis: 'angka', label: 'Jumlah SPPG', kunci: 'JumlahSPPG', contoh: '0' },
			{ jenis: 'teks', label: 'Tahun Kerja Sama', kunci: 'TahunKerjaSamaMBG', contoh: 'Contoh: 2025' },
		],
	},

	{
		id: 'bantuan',
		judul: 'Bantuan',
		kolom: [
			{ jenis: 'teks', label: 'Bantuan Pengembangan Kemendesa', kunci: 'BantuanKementrian', contoh: 'Contoh: Tahap 1' },
			{ jenis: 'teks', label: 'Bantuan Laptop Shopee', kunci: 'BantuanLaptopShopee', contoh: 'Contoh: Tahap 2' },
			{ jenis: 'teksPanjang', label: 'Bantuan Lainnya', kunci: 'BantuanLainnya', contoh: 'Bantuan lain di luar dua program di atas', baris: 2, lebar: 'penuh' },
		],
	},

	{
		id: 'tambahan',
		judul: 'Tambahan',
		kolom: [
			{ jenis: 'teks', label: 'E-Commerce', kunci: 'ECommerce', contoh: 'Contoh: Shopee, Tokopedia' },
			{ jenis: 'teks', label: 'Tautan SK', kunci: 'LinkSK', contoh: 'Tautan dokumen SK' },
			{ jenis: 'teks', label: 'Tautan Laporan Keuangan 2021', kunci: 'LinkLapKeuangan2021', contoh: 'Tautan dokumen' },
			{ jenis: 'teks', label: 'Tautan SK Kepengurusan 2021', kunci: 'LinkSKKepengurusan2021', contoh: 'Tautan dokumen' },
			{ jenis: 'teksPanjang', label: 'Catatan Tambahan', kunci: 'CatatanTambahan', contoh: 'Catatan lain tentang BUMDes ini', baris: 3, lebar: 'penuh' },
		],
	},
];

/**
 * Kolom yang diisi DPMD, bukan desa maupun SPKED lewat formulir ini —
 * ditampilkan sebagai bacaan saja supaya keduanya melihat hasil penilaian
 * tanpa bisa mengarangnya.
 */
export const SEKSI_BACA_SAJA = [
	{
		id: 'pemeringkatan',
		judul: 'Pemeringkatan',
		kolom: [
			{ label: 'Pemeringkatan 2024', kunci: 'Pemeringkatan2024' },
			{ label: 'Pemeringkatan 2024 (Semester 1)', kunci: 'Pemeringkatan2024Sem1' },
			{ label: 'Pemeringkatan 2026 (dari penilaian 2025)', kunci: 'Pemeringkatan2026' },
		],
	},
	{
		id: 'status-badan-hukum',
		judul: 'Riwayat Status Badan Hukum',
		kolom: [
			{ label: 'Status 2026', kunci: 'StatusBadanHukum2026' },
			{ label: 'Status 2025', kunci: 'StatusBadanHukum2025' },
			{ label: 'Status 2024', kunci: 'StatusBadanHukum2024' },
		],
	},
	{
		id: 'pembinaan',
		judul: 'Pembinaan & Pendataan',
		kolom: [
			{ label: 'Pembinaan 2024', kunci: 'Pembinaan2024' },
			{ label: 'Desk Pendataan 2025', kunci: 'DeskPendataan2025' },
			{ label: 'Kehadiran Desk 2026', kunci: 'KehadiranDesk2026' },
		],
	},
];

/** Tujuh dokumen badan hukum yang diunggah langsung oleh SPKED. */
export const DOKUMEN_BADAN_HUKUM = [
	{ kunci: 'Perdes', label: 'Perdes Pendirian' },
	{ kunci: 'ProfilBUMDesa', label: 'Profil BUM Desa' },
	{ kunci: 'BeritaAcara', label: 'Berita Acara' },
	{ kunci: 'AnggaranDasar', label: 'Anggaran Dasar' },
	{ kunci: 'AnggaranRumahTangga', label: 'Anggaran Rumah Tangga' },
	{ kunci: 'ProgramKerja', label: 'Program Kerja' },
	{ kunci: 'SK_BUM_Desa', label: 'SK BUM Desa' },
];

export const DOKUMEN_LAPORAN_KEUANGAN = ['2021', '2022', '2023', '2024'].map((th) => ({
	kunci: `LaporanKeuangan${th}`,
	label: `Laporan Keuangan ${th}`,
}));

/** Nilai awal formulir: seluruh kunci di skema, dikosongkan. */
export const nilaiAwalBumdes = () => {
	const awal = {};
	for (const seksi of SEKSI_BUMDES) {
		for (const k of seksi.kolom) awal[k.kunci] = '';
	}
	for (const d of [...DOKUMEN_BADAN_HUKUM, ...DOKUMEN_LAPORAN_KEUANGAN]) awal[d.kunci] = '';
	awal.status = 'aktif';
	awal.produk_hukum_perdes_id = '';
	awal.produk_hukum_sk_bumdes_id = '';
	return awal;
};

/** Semua kunci yang disunting formulir — dipakai saat menyusun kiriman. */
export const KUNCI_BUMDES = Object.keys(nilaiAwalBumdes());
