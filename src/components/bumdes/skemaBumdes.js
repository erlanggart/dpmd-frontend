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
// Perbaikan 2026-09 (dokumen "PERBAIKAN APLIKASI BUMDESA"):
//   • Setiap isian punya label + `keterangan` yang menjelaskan apa yang diisi.
//   • Bagian bertahun (permodalan, aset, omset & laba, kontribusi PADes,
//     kemitraan, laporan pertanggungjawaban) menjadi `daftarTahunan`: pilih
//     tahun → isi → simpan → muncul sebagai baris, lalu bisa ditambah lagi.
//     Tersimpan sebagai daftar JSON; kolom tahunan lama diisi ulang backend
//     dari daftar ini (sinkronKolomLama di bumdesFields.js).
//   • Bantuan, pemeringkatan, riwayat badan hukum, pembinaan & pendataan
//     hanya tampil untuk DPMD/SPKED (`hanyaSpked`).
//
// BEDA antara kedua halaman ada di dokumen dasar hukum:
//   • Desa  memilih Perdes/SK dari modul Produk Hukum Desa (berkasnya sudah
//     diunggah di sana), sehingga yang disimpan adalah id-nya.
//   • SPKED mengunggah berkasnya langsung dari sini.
// Itu diatur `mode` di FormulirBumdes, bukan dengan menyalin daftar kolom.
//
// Pilihan tetap (kategori usaha, program, peran) HARUS sama dengan
// KOLOM_DAFTAR di backend src/config/bumdesFields.js.

const JK = [
	{ value: 'Laki-laki', label: 'Laki-laki' },
	{ value: 'Perempuan', label: 'Perempuan' },
];

const opsi = (daftar) => daftar.map((v) => ({ value: v, label: v }));

export const KATEGORI_USAHA = [
	'Pertanian', 'Perkebunan', 'Peternakan', 'Perikanan', 'Perdagangan',
	'Jasa Umum', 'Pengolahan dan Manufaktur',
	'Pariwisata, Rekreasi dan Ekonomi Kreatif', 'Akomodasi dan Kuliner',
	'Pelayanan Publik', 'Air Bersih, Sanitasi dan Pengelolaan Lingkungan',
	'Keuangan/LKD', 'Transportasi dan Logistik',
	'Penyewaan dan Pengelolaan Aset Desa', 'Konstruksi dan Infrastruktur',
	'Energi dan Ketenagalistrikan', 'Digital, Informasi dan Komunikasi',
	'Pendidikan dan Pelatihan', 'Kesehatan dan Sosial',
	'Pertambangan dan Penggalian', 'Jasa Profesional dan Jasa Usaha Lainnya',
	'Usaha Lainnya',
];
export const KATEGORI_PANGAN = ['Perikanan', 'Peternakan', 'Pertanian', 'Perkebunan', 'Lumbung Pangan', 'Lainnya'];
export const PROGRAM_PEMERINTAH = ['Ketahanan Pangan', 'Desa Wisata', 'MBG', 'Lainnya'];
export const PERAN_PROGRAM = ['Pengelola', 'Distribusi', 'Pemasaran', 'Pemasok'];

const SUMBER_MODAL = [
	{ value: 'desa', label: 'Penyertaan Modal Desa' },
	{ value: 'lain', label: 'Penyertaan Modal Lain' },
];

/** Satu blok pengurus bernomor: nama, nomor HP, jenis kelamin. */
const pengurus = (nomor, jabatan, catatan, kunciNama, kunciJk, kunciHp) => {
	const grup = `${nomor}. ${jabatan}`;
	return [
		{ jenis: 'teks', grup, catatanGrup: catatan, label: 'Nama', kunci: kunciNama, contoh: `Nama lengkap ${jabatan.toLowerCase()}` },
		{ jenis: 'teks', grup, label: 'Nomor HP', kunci: kunciHp, contoh: 'Contoh: 08123456789', tipeInput: 'tel' },
		{ jenis: 'pilih', grup, label: 'Jenis Kelamin', kunci: kunciJk, opsi: JK },
	];
};

export const SEKSI_BUMDES = [
	{
		id: 'identitas',
		judul: 'Identitas BUM Desa',
		kolom: [
			{
				jenis: 'teks', label: 'Nama BUM Desa', kunci: 'namabumdesa', contoh: 'Contoh: BUM Desa Maju Jaya', wajib: true, lebar: 'penuh',
				keterangan: 'Nama BUM Desa sesuai pada Sertifikat Badan Hukum atau Aplikasi Pendaftaran Badan Hukum.',
			},
			// Di halaman desa ketiganya terisi otomatis dari akun; di SPKED
			// dipilih lewat penunjuk desa di atas formulir.
			{ jenis: 'teks', label: 'Nama Desa', kunci: 'desa', dariAkunDesa: true, keterangan: 'Terisi otomatis dari akun desa.' },
			{ jenis: 'teks', label: 'Kecamatan', kunci: 'kecamatan', dariAkunDesa: true, keterangan: 'Terisi otomatis dari akun desa.' },
			{ jenis: 'teks', label: 'Kode Desa', kunci: 'kode_desa', dariAkunDesa: true, keterangan: 'Kode wilayah desa (Kemendagri).' },
			{
				jenis: 'angka', label: 'Tahun Pendirian BUM Desa', kunci: 'TahunPendirian', contoh: 'Contoh: 2020',
				keterangan: 'Tahun BUM Desa didirikan, sesuai Perdes Pendirian.',
			},
			{
				jenis: 'pilih', label: 'Status Keaktifan BUM Desa', kunci: 'status',
				keterangan: 'Pilih "Tidak Aktif" bila BUM Desa sudah tidak menjalankan usaha.',
				opsi: [
					{ value: 'aktif', label: 'Aktif' },
					{ value: 'tidak_aktif', label: 'Tidak Aktif' },
				],
			},
			{
				jenis: 'teksPanjang', label: 'Alasan Tidak Aktif', kunci: 'keterangan_tidak_aktif',
				contoh: 'Jelaskan alasan BUM Desa tidak aktif', baris: 2, lebar: 'penuh',
				// Hanya bermakna kalau statusnya memang tidak aktif.
				tampilBila: (d) => String(d.status || '').startsWith('tidak'),
			},
			{
				jenis: 'teks', label: 'Nomor Telepon BUM Desa', kunci: 'TelfonBumdes', contoh: 'Contoh: 08123456789', tipeInput: 'tel',
				keterangan: 'Nomor telepon / WhatsApp resmi BUM Desa yang bisa dihubungi.',
			},
			{
				jenis: 'teks', label: 'Email BUM Desa', kunci: 'Alamatemail', tipeInput: 'email', contoh: 'contoh@email.com',
				keterangan: 'Alamat email resmi BUM Desa (bila ada).',
			},
			{
				jenis: 'teksPanjang', label: 'Alamat Kantor BUM Desa', kunci: 'AlamatBumdesa', contoh: 'Contoh: Jl. Raya Desa No. 1, RT 01/RW 02', baris: 2, lebar: 'penuh',
				keterangan: 'Alamat lengkap kantor / sekretariat BUM Desa.',
			},
		],
	},

	{
		id: 'legalitas',
		judul: 'Dasar Hukum & Legalitas',
		// Blok Perdes/SK disisipkan FormulirBumdes sesuai `mode` — lihat
		// keterangan di kepala berkas ini.
		slotDokumenDasarHukum: true,
		kolom: [
			{
				jenis: 'teks', label: 'Nomor Perdes Pendirian', kunci: 'NomorPerdes', contoh: 'Contoh: 05 Tahun 2020',
				keterangan: 'Nomor Peraturan Desa tentang pendirian BUM Desa.',
			},
			{
				jenis: 'teks', label: 'Nomor LKPP', kunci: 'LKPP', contoh: 'Masukkan nomor LKPP',
				keterangan: 'Nomor registrasi penyedia di LKPP / e-Katalog. Kosongkan bila belum terdaftar.',
			},
			{
				jenis: 'teks', label: 'Nomor NIB', kunci: 'NIB', contoh: 'Contoh: 1234567890123',
				keterangan: 'Nomor Induk Berusaha dari sistem OSS (13 digit).',
			},
			{
				jenis: 'teks', label: 'Nomor NPWP', kunci: 'NPWP', contoh: 'Contoh: 01.234.567.8-901.000',
				keterangan: 'Nomor Pokok Wajib Pajak atas nama BUM Desa.',
			},
			{
				jenis: 'pilih', label: 'Status Badan Hukum', kunci: 'badanhukum',
				keterangan: 'Tahapan pendaftaran badan hukum BUM Desa di sistem Kemendes PDT.',
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
		keterangan: 'Isi nama, nomor HP, dan jenis kelamin setiap pengurus BUM Desa.',
		kolom: [
			...pengurus(1, 'Penasihat', 'Dijabat Kepala Desa', 'NamaPenasihat', 'JenisKelaminPenasihat', 'HPPenasihat'),
			...pengurus(2, 'Pengawas', null, 'NamaPengawas', 'JenisKelaminPengawas', 'HPPengawas'),
			...pengurus(3, 'Direktur', null, 'NamaDirektur', 'JenisKelaminDirektur', 'HPDirektur'),
			...pengurus(4, 'Sekretaris', null, 'NamaSekretaris', 'JenisKelaminSekretaris', 'HPSekretaris'),
			...pengurus(5, 'Bendahara', null, 'NamaBendahara', 'JenisKelaminBendahara', 'HPBendahara'),
			...pengurus(6, 'Staf Lainnya', 'Opsional', 'NamaStafLainnya', 'JenisKelaminStafLainnya', 'HPStafLainnya'),
		],
	},

	{
		id: 'usaha',
		judul: 'Tenaga Kerja & Bidang Usaha',
		kolom: [
			{
				jenis: 'angka', label: 'Jumlah Tenaga Kerja', kunci: 'TotalTenagaKerja', contoh: 'Contoh: 12',
				keterangan: 'Jumlah seluruh pekerja BUM Desa (orang), termasuk pengurus yang bekerja harian.',
			},
			{
				jenis: 'centang', label: 'Kategori Usaha Utama', kunci: 'KategoriUsaha', opsi: KATEGORI_USAHA, lebar: 'penuh',
				keterangan: 'Centang semua kategori usaha yang dijalankan BUM Desa (boleh lebih dari satu).',
				kunciLama: 'JenisUsaha',
			},
			{
				jenis: 'teks', label: 'Keterangan Jenis Usaha Utama', kunci: 'JenisUsahaUtama', contoh: 'Contoh: Ternak ayam petelur', lebar: 'penuh',
				keterangan: 'Sebutkan usaha utama yang paling banyak dijalankan.',
			},
			{
				jenis: 'centang', label: 'Kategori Usaha Ketahanan Pangan', kunci: 'KategoriUsahaPangan', opsi: KATEGORI_PANGAN, lebar: 'penuh',
				keterangan: 'Centang kategori usaha ketahanan pangan yang dijalankan (boleh lebih dari satu).',
				kunciLama: 'JenisUsahaKetahananPangan',
			},
			{
				jenis: 'teksPanjang', label: 'Keterangan Jenis Usaha Ketahanan Pangan', kunci: 'KeteranganUsahaKetahananPangan',
				contoh: 'Contoh: Budidaya ikan lele 5 kolam, kapasitas 1.000 ekor', baris: 2, lebar: 'penuh',
				keterangan: 'Jelaskan usaha ketahanan pangan yang dijalankan beserta skalanya.',
			},
			{
				jenis: 'daftarTeks', label: 'Unit Usaha BUM Desa', kunci: 'UnitUsaha', jumlahAwal: 5, maks: 20, lebar: 'penuh',
				contoh: 'Nama unit usaha, mis. Unit Simpan Pinjam',
				keterangan: 'Tuliskan setiap unit usaha yang dimiliki BUM Desa.',
			},
		],
	},

	{
		id: 'modal',
		judul: 'Permodalan & Aset',
		kolom: [
			{
				jenis: 'daftarTahunan', label: 'Penyertaan Modal', kunci: 'RiwayatPermodalan', lebar: 'penuh',
				keterangan: 'Pilih tahun dan sumber modal, isi nilainya, lalu simpan. Ulangi untuk tahun atau sumber lain.',
				tombolTambah: 'Tambah Penyertaan Modal',
				kolom: [
					{ kunci: 'tahun', label: 'Tahun', jenis: 'tahun', wajib: true },
					{ kunci: 'sumber', label: 'Sumber Modal', jenis: 'pilih', opsi: SUMBER_MODAL, wajib: true, bawaan: 'desa' },
					{
						kunci: 'keterangan', label: 'Asal Modal Lain', jenis: 'teks', contoh: 'Contoh: CSR PT ABC, hibah provinsi',
						tampilBila: (b) => b.sumber === 'lain',
					},
					{ kunci: 'jumlah', label: 'Nilai Penyertaan Modal (Rp)', jenis: 'uang', wajib: true },
				],
			},
			{
				jenis: 'daftarTahunan', label: 'Nilai & Jenis Aset', kunci: 'RiwayatAset', lebar: 'penuh',
				keterangan: 'Catat nilai aset BUM Desa per tahun beserta jenis asetnya.',
				tombolTambah: 'Tambah Data Aset',
				kolom: [
					{ kunci: 'tahun', label: 'Tahun', jenis: 'tahun', wajib: true },
					{ kunci: 'nilai', label: 'Nilai Aset (Rp)', jenis: 'uang', wajib: true },
					{ kunci: 'jenis', label: 'Jenis Aset', jenis: 'teks', contoh: 'Contoh: Tanah, bangunan, kendaraan' },
				],
			},
		],
	},

	{
		id: 'omset',
		judul: 'Omset & Laba',
		kolom: [
			{
				jenis: 'daftarTahunan', label: 'Omset & Laba per Tahun', kunci: 'RiwayatOmsetLaba', lebar: 'penuh',
				keterangan: 'Omset = total pendapatan usaha setahun. Laba = omset dikurangi seluruh biaya; isi dengan tanda minus bila rugi.',
				tombolTambah: 'Tambah Omset & Laba',
				kolom: [
					{ kunci: 'tahun', label: 'Tahun', jenis: 'tahun', wajib: true },
					{ kunci: 'omset', label: 'Omset (Rp)', jenis: 'uang', wajib: true },
					{ kunci: 'laba', label: 'Laba (Rp)', jenis: 'uang' },
				],
			},
		],
	},

	{
		id: 'pangan',
		judul: 'Ketahanan Pangan',
		keterangan: 'Unggah dokumen pendukung usaha ketahanan pangan BUM Desa (PDF/DOC/XLS atau foto, maks. 5 MB).',
		kolom: [
			{ jenis: 'berkas', label: 'Studi Kelayakan Usaha', kunci: 'StudiKelayakanUsaha', keterangan: 'Dokumen studi kelayakan usaha ketahanan pangan.' },
			{ jenis: 'berkas', label: 'RAB (Rencana Anggaran Biaya)', kunci: 'RABKetahananPangan', keterangan: 'Rencana anggaran biaya kegiatan ketahanan pangan.' },
			{ jenis: 'berkas', label: 'Dokumentasi Geotagging', kunci: 'DokumentasiGeotagging', keterangan: 'Foto lokasi usaha yang memuat titik koordinat (geotag).' },
		],
	},

	{
		id: 'pades',
		judul: 'Kontribusi terhadap PADes',
		kolom: [
			{
				jenis: 'daftarTahunan', label: 'Kontribusi PADes per Tahun', kunci: 'RiwayatKontribusiPADes', lebar: 'penuh',
				keterangan: 'Bagian laba BUM Desa yang disetorkan ke Pendapatan Asli Desa. Lampirkan bukti penyerahannya.',
				tombolTambah: 'Tambah Kontribusi PADes',
				kolom: [
					{ kunci: 'tahun', label: 'Tahun', jenis: 'tahun', wajib: true },
					{ kunci: 'jumlah', label: 'Nilai Kontribusi (Rp)', jenis: 'uang', wajib: true },
					{ kunci: 'bukti', label: 'Bukti Penyerahan PADes', jenis: 'berkas' },
				],
			},
		],
	},

	{
		id: 'kemitraan',
		judul: 'Kemitraan',
		kolom: [
			{
				jenis: 'daftarTahunan', label: 'Kerja Sama dengan Pihak Ketiga', kunci: 'RiwayatKemitraan', lebar: 'penuh',
				keterangan: 'Catat setiap kerja sama BUM Desa dengan pihak ketiga dan unggah dokumen MoU / perjanjiannya.',
				tombolTambah: 'Tambah Kemitraan',
				kolom: [
					{ kunci: 'tahun', label: 'Tahun', jenis: 'tahun', wajib: true },
					{ kunci: 'mitra', label: 'Nama Mitra', jenis: 'teks', contoh: 'Contoh: PT Solusi Limbah Abadi', wajib: true },
					{ kunci: 'periode', label: 'Jangka Waktu Kerja Sama', jenis: 'teks', contoh: 'Contoh: 2024-2026' },
					{ kunci: 'kontribusi', label: 'Kontribusi ke PADes (Rp)', jenis: 'uang' },
					{ kunci: 'mou', label: 'Dokumen MoU / Perjanjian', jenis: 'berkas' },
				],
			},
		],
	},

	{
		id: 'program',
		judul: 'Peran dalam Program Pemerintah',
		kolom: [
			{
				jenis: 'daftarTahunan', label: 'Program & Peran BUM Desa', kunci: 'PeranProgram', lebar: 'penuh', tanpaTahun: true,
				keterangan: 'Pilih program pemerintah yang diikuti dan peran BUM Desa di dalamnya. Bisa diisi lebih dari satu.',
				tombolTambah: 'Tambah Program',
				kolom: [
					{ kunci: 'program', label: 'Program', jenis: 'pilih', opsi: opsi(PROGRAM_PEMERINTAH), wajib: true },
					{ kunci: 'program_lain', label: 'Nama Program Lainnya', jenis: 'teks', contoh: 'Sebutkan programnya', tampilBila: (b) => b.program === 'Lainnya' },
					{ kunci: 'peran', label: 'Peran BUM Desa', jenis: 'pilih', opsi: opsi(PERAN_PROGRAM), wajib: true },
					{
						kunci: 'produk', label: 'Produk yang Dipasok ke MBG', jenis: 'teks', contoh: 'Contoh: Telur, sayur, beras',
						tampilBila: (b) => b.program === 'MBG' && b.peran === 'Pemasok',
					},
					{ kunci: 'keterangan', label: 'Keterangan (opsional)', jenis: 'teks', contoh: 'Contoh: bermitra langsung dengan SPPG' },
				],
			},
		],
	},

	{
		id: 'bantuan',
		judul: 'Bantuan Pemerintah',
		hanyaSpked: true,
		kolom: [
			{ jenis: 'teks', label: 'Bantuan Pengembangan Kemendesa', kunci: 'BantuanKementrian', contoh: 'Contoh: Tahap 1' },
			{ jenis: 'teks', label: 'Bantuan Laptop Shopee', kunci: 'BantuanLaptopShopee', contoh: 'Contoh: Tahap 2' },
			{ jenis: 'teksPanjang', label: 'Bantuan Lainnya', kunci: 'BantuanLainnya', contoh: 'Bantuan lain di luar dua program di atas', baris: 2, lebar: 'penuh' },
		],
	},

	{
		id: 'tambahan',
		judul: 'Media Sosial & Toko Daring',
		kolom: [
			{
				jenis: 'objek', label: 'Media Sosial', kunci: 'MediaSosial', lebar: 'penuh',
				keterangan: 'Isi nama akun atau tautan. Kosongkan yang tidak dimiliki.',
				isian: [
					{ kunci: 'instagram', label: 'Instagram', contoh: '@bumdes.majujaya' },
					{ kunci: 'facebook', label: 'Facebook', contoh: 'facebook.com/bumdesmajujaya' },
					{ kunci: 'tiktok', label: 'TikTok', contoh: '@bumdesmajujaya' },
					{ kunci: 'website', label: 'Website', contoh: 'https://bumdesmajujaya.id' },
				],
			},
			{
				jenis: 'objek', label: 'E-Commerce', kunci: 'MediaSosial', lebar: 'penuh', kunciTampilan: 'MediaSosial-ecommerce',
				keterangan: 'Tautan toko BUM Desa di marketplace.',
				isian: [
					{ kunci: 'shopee', label: 'Shopee', contoh: 'shopee.co.id/nama-toko' },
					{ kunci: 'tokopedia', label: 'Tokopedia', contoh: 'tokopedia.com/nama-toko' },
					{ kunci: 'ecommerce_lain', label: 'Lainnya', contoh: 'Marketplace lain, mis. Lazada / Blibli' },
				],
			},
			{ jenis: 'teksPanjang', label: 'Catatan Tambahan', kunci: 'CatatanTambahan', contoh: 'Catatan lain tentang BUM Desa ini', baris: 3, lebar: 'penuh' },
		],
	},

	{
		// Kolom hasil impor rekap lama yang tidak lagi ada di formulir baru.
		// Tetap ditampilkan untuk SPKED supaya datanya tidak "hilang dari
		// pandangan" — kolom yang tak terlihat tidak pernah diperiksa.
		id: 'lama',
		judul: 'Data Lama (Impor Rekap)',
		hanyaSpked: true,
		keterangan: 'Kolom dari rekap lama. Nilainya tetap tersimpan; isi baru sebaiknya lewat bagian di atas.',
		kolom: [
			{ jenis: 'teks', label: 'Jenis Usaha 2021', kunci: 'JenisUsaha2021' },
			{ jenis: 'angka', label: 'Penyertaan Modal TPKK/Kelompok (Rp)', kunci: 'PenyertaanModalTPKK' },
			{ jenis: 'angka', label: 'Penganggaran Penyertaan Modal 2025 (Rp)', kunci: 'PenganggaranPenyertaanModal2025' },
			{ jenis: 'angka', label: 'Total Realisasi 2019-2025 (Rp)', kunci: 'TotalRealisasiPenyertaanModal20192025' },
			{ jenis: 'angka', label: 'Jumlah Modal Awal (Rp)', kunci: 'JumlahModalAwal' },
			{ jenis: 'angka', label: 'Omset 2024 Semester 1 (Rp)', kunci: 'Omset2024Sem1' },
			{ jenis: 'angka', label: 'Laba 2024 Semester 1 (Rp)', kunci: 'Laba2024Sem1' },
			{ jenis: 'teks', label: 'Volume Ketahanan Pangan', kunci: 'VolumeKetahananPangan' },
			{ jenis: 'angka', label: 'Anggaran Penyertaan Modal Ketahanan Pangan (Rp)', kunci: 'AnggaranModalKetahananPangan' },
			{ jenis: 'teks', label: 'Peran Ketahanan Pangan 2024', kunci: 'Ketapang2024' },
			{ jenis: 'teks', label: 'Mekanisme Kerja Sama MBG', kunci: 'MekanismeKerjaSamaMBG' },
			{ jenis: 'angka', label: 'Jumlah SPPG', kunci: 'JumlahSPPG' },
			{ jenis: 'teks', label: 'Tahun Kerja Sama MBG', kunci: 'TahunKerjaSamaMBG' },
			{ jenis: 'teks', label: 'Tautan SK', kunci: 'LinkSK' },
			{ jenis: 'teks', label: 'Tautan Laporan Keuangan 2021', kunci: 'LinkLapKeuangan2021' },
			{ jenis: 'teks', label: 'Tautan SK Kepengurusan 2021', kunci: 'LinkSKKepengurusan2021' },
		],
	},
];

/**
 * Kolom yang diisi DPMD, bukan desa maupun SPKED lewat formulir ini. Sesuai
 * permintaan, bagian ini TIDAK lagi tampil di halaman desa — hanya di DPMD.
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

/** Dokumen pendirian BUM Desa yang diunggah langsung oleh SPKED. */
export const DOKUMEN_BADAN_HUKUM = [
	{ kunci: 'Perdes', label: 'Perdes Pendirian' },
	{ kunci: 'ProfilBUMDesa', label: 'Profil BUM Desa' },
	{ kunci: 'BeritaAcara', label: 'Berita Acara' },
	{ kunci: 'AnggaranDasar', label: 'Anggaran Dasar (AD)' },
	{ kunci: 'AnggaranRumahTangga', label: 'Anggaran Rumah Tangga (ART)' },
	{ kunci: 'ProgramKerja', label: 'Program Kerja' },
	{ kunci: 'SK_BUM_Desa', label: 'SK Pendirian BUM Desa' },
];

/** Laporan keuangan tahun lama (kolom tetap). Tahun baru lewat LaporanPertanggungjawaban. */
export const DOKUMEN_LAPORAN_KEUANGAN = ['2021', '2022', '2023', '2024'].map((th) => ({
	kunci: `LaporanKeuangan${th}`,
	label: `Laporan Pertanggungjawaban ${th}`,
}));

/**
 * Laporan Pertanggungjawaban (dulu "Laporan Keuangan") untuk tahun berapa pun:
 * pilih tahun → unggah → simpan, bisa ditambah lagi. Berkas 2021–2024 yang
 * sudah ada di kolom lama tetap ditampilkan terpisah oleh halaman.
 */
export const DEF_LAPORAN_PERTANGGUNGJAWABAN = {
	jenis: 'daftarTahunan',
	kunci: 'LaporanPertanggungjawaban',
	label: 'Laporan Pertanggungjawaban',
	tombolTambah: 'Tambah Laporan Pertanggungjawaban',
	kolom: [
		{ kunci: 'tahun', label: 'Tahun', jenis: 'tahun', wajib: true },
		{ kunci: 'berkas', label: 'Berkas Laporan', jenis: 'berkas', wajib: true },
	],
};

/** Dokumen ketahanan pangan (kolom berkas biasa, diunggah lewat /upload-file). */
export const DOKUMEN_KETAHANAN_PANGAN = SEKSI_BUMDES
	.find((s) => s.id === 'pangan').kolom
	.map((k) => ({ kunci: k.kunci, label: k.label }));

/* ───────────────────── Daftar JSON: baca & turunkan ───────────────────── */

/** Kolom daftar di skema beserta bentuknya ('daftar' | 'objek'). */
const KOLOM_DAFTAR = {};
for (const seksi of SEKSI_BUMDES) {
	for (const k of seksi.kolom) {
		if (['centang', 'daftarTeks', 'daftarTahunan'].includes(k.jenis)) KOLOM_DAFTAR[k.kunci] = 'daftar';
		if (k.jenis === 'objek') KOLOM_DAFTAR[k.kunci] = 'objek';
	}
}
KOLOM_DAFTAR.LaporanPertanggungjawaban = 'daftar';

/** Nilai kolom daftar dari server bisa string JSON, array/objek, atau null. */
export const bacaDaftar = (nilai, bentuk = 'daftar') => {
	let v = nilai;
	if (typeof v === 'string') {
		try { v = JSON.parse(v); } catch { v = null; }
	}
	if (bentuk === 'objek') return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
	return Array.isArray(v) ? v : [];
};

const angkaAda = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
const pecahTeks = (teks) =>
	String(teks || '').split(/[;\n]+|,(?![^(]*\))/).map((s) => s.trim()).filter(Boolean);

/** Cocokkan teks lama ke pilihan tetap (tanpa peduli huruf besar). */
const cocokkanPilihan = (teks, pilihan) => {
	const bagian = pecahTeks(teks).map((s) => s.toLowerCase());
	return pilihan.filter((p) => bagian.includes(p.toLowerCase()));
};

const cocokPeran = (teks) => PERAN_PROGRAM.find((p) => new RegExp(p, 'i').test(String(teks || ''))) || '';

/**
 * Baris lama belum punya daftar JSON — isinya masih di kolom tahunan
 * (PenyertaanModal2024, Omset2025, dst.). Susun daftar dari kolom itu supaya
 * data lama tampil sebagai baris, dan supaya menyimpan formulir tidak
 * menghapusnya (backend mengisi ulang kolom lama dari daftar yang dikirim).
 *
 * Kolom daftar yang sudah pernah tersimpan (termasuk "[]") tidak disentuh.
 */
export const lengkapiDaftarDariKolomLama = (data) => {
	const d = { ...data };
	// Daftar yang pernah TERSIMPAN datang dari server sebagai string ("[]"
	// termasuk), jadi tidak ikut diturunkan ulang. Array kosong di sini berasal
	// dari nilaiAwalBumdes(), bukan dari server — memperlakukannya sebagai
	// "sudah ada" akan mengirim [] dan menghapus kolom tahunan lama.
	const kosong = (k) =>
		d[k] === null || d[k] === undefined || d[k] === '' ||
		(Array.isArray(d[k]) && d[k].length === 0) ||
		(d[k] && typeof d[k] === 'object' && !Array.isArray(d[k]) && Object.keys(d[k]).length === 0);

	if (kosong('KategoriUsaha')) {
		const cocok = cocokkanPilihan(d.JenisUsaha, KATEGORI_USAHA);
		// Teks lama yang tak cocok pilihan mana pun dibiarkan null: tidak
		// dikirim, sehingga kolom JenisUsaha lama tidak tertimpa kosong.
		d.KategoriUsaha = cocok.length ? cocok : null;
	}
	if (kosong('KategoriUsahaPangan')) {
		const cocok = cocokkanPilihan(d.JenisUsahaKetahananPangan, KATEGORI_PANGAN);
		d.KategoriUsahaPangan = cocok.length ? cocok : null;
	}
	if (kosong('UnitUsaha')) d.UnitUsaha = pecahTeks(d.JenisUsahaLainnya);

	if (kosong('RiwayatPermodalan')) {
		const baris = [2019, 2020, 2021, 2022, 2023, 2024]
			.filter((th) => angkaAda(d[`PenyertaanModal${th}`]))
			.map((th) => ({ tahun: th, sumber: 'desa', jumlah: Number(d[`PenyertaanModal${th}`]) }));
		if (angkaAda(d.SumberLain)) baris.push({ sumber: 'lain', keterangan: 'Data lama', jumlah: Number(d.SumberLain) });
		d.RiwayatPermodalan = baris;
	}

	if (kosong('RiwayatAset')) {
		d.RiwayatAset = angkaAda(d.NilaiAset) || d.JenisAset
			? [{ nilai: angkaAda(d.NilaiAset) ? Number(d.NilaiAset) : undefined, jenis: d.JenisAset || undefined }]
			: [];
	}

	if (kosong('RiwayatOmsetLaba')) {
		d.RiwayatOmsetLaba = [2023, 2024, 2025]
			.filter((th) => angkaAda(d[`Omset${th}`]) || angkaAda(d[`Laba${th}`]))
			.map((th) => ({
				tahun: th,
				omset: angkaAda(d[`Omset${th}`]) ? Number(d[`Omset${th}`]) : undefined,
				laba: angkaAda(d[`Laba${th}`]) ? Number(d[`Laba${th}`]) : undefined,
			}));
	}

	if (kosong('RiwayatKontribusiPADes')) {
		d.RiwayatKontribusiPADes = [2021, 2022, 2023, 2024, 2025]
			.filter((th) => angkaAda(d[`KontribusiTerhadapPADes${th}`]))
			.map((th) => ({ tahun: th, jumlah: Number(d[`KontribusiTerhadapPADes${th}`]) }));
	}

	if (kosong('RiwayatKemitraan')) {
		const mitra = d.KerjasamaPihakKetiga ? String(d.KerjasamaPihakKetiga).trim() : '';
		const periode = d.TahunMulai_TahunBerakhir || undefined;
		const perTahun = [2024, 2025].filter((th) => angkaAda(d[`KontribusiKemitraanPADes${th}`]));
		if (perTahun.length) {
			d.RiwayatKemitraan = perTahun.map((th) => ({
				tahun: th, mitra: mitra || undefined, periode, kontribusi: Number(d[`KontribusiKemitraanPADes${th}`]),
			}));
		} else {
			d.RiwayatKemitraan = mitra ? [{ mitra, periode }] : [];
		}
	}

	if (kosong('PeranProgram')) {
		const baris = [];
		if (d.Ketapang2025 && !/tidak/i.test(d.Ketapang2025)) {
			baris.push({ program: 'Ketahanan Pangan', peran: cocokPeran(d.Ketapang2025) || undefined, keterangan: cocokPeran(d.Ketapang2025) ? undefined : d.Ketapang2025 });
		}
		if (String(d.DesaWisataStatus || '').toLowerCase() === 'ya' || d.DesaWisata) {
			baris.push({ program: 'Desa Wisata', peran: cocokPeran(d.DesaWisata) || undefined, keterangan: d.DesaWisata || undefined });
		}
		if (d.PeranMBG) {
			baris.push({ program: 'MBG', peran: cocokPeran(d.PeranMBG) || undefined, keterangan: d.PeranMBG });
		}
		d.PeranProgram = baris;
	}

	if (kosong('MediaSosial')) {
		d.MediaSosial = d.ECommerce ? { ecommerce_lain: d.ECommerce } : {};
	}

	if (kosong('LaporanPertanggungjawaban')) d.LaporanPertanggungjawaban = [];

	// Normalisasi: string JSON dari server → array/objek.
	for (const [k, bentuk] of Object.entries(KOLOM_DAFTAR)) {
		if (d[k] !== null && d[k] !== undefined) d[k] = bacaDaftar(d[k], bentuk);
	}
	return d;
};

/** Nilai awal formulir: seluruh kunci di skema, dikosongkan. */
export const nilaiAwalBumdes = () => {
	const awal = {};
	for (const seksi of SEKSI_BUMDES) {
		for (const k of seksi.kolom) {
			if (k.jenis === 'berkas') continue;
			awal[k.kunci] = KOLOM_DAFTAR[k.kunci] === 'objek' ? {} : KOLOM_DAFTAR[k.kunci] ? [] : '';
		}
	}
	for (const d of [...DOKUMEN_BADAN_HUKUM, ...DOKUMEN_LAPORAN_KEUANGAN, ...DOKUMEN_KETAHANAN_PANGAN]) awal[d.kunci] = '';
	awal.LaporanPertanggungjawaban = [];
	awal.status = 'aktif';
	awal.produk_hukum_perdes_id = '';
	awal.produk_hukum_sk_bumdes_id = '';
	return awal;
};

/** Semua kunci yang disunting formulir — dipakai saat menyusun kiriman. */
export const KUNCI_BUMDES = Object.keys(nilaiAwalBumdes());
