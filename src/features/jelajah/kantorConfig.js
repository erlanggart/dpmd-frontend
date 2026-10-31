// Sumber konten tunggal tur "Jelajah Kantor DPMD". Versi 3D dan Denah 2D sama-sama
// membaca dari sini, jadi mengubah teks layanan cukup di berkas ini.
//
// Koordinat dalam meter, dilihat dari atas: x ke kanan, z ke arah halaman depan.
// Pintu masuk gedung ada di z = 12, dinding belakang di z = -13. Gedung dua lantai;
// `lantai` 0 = lantai 1 (dasar), 1 = lantai 2. `npc.arah` = arah hadap petugas.
//
// Denah mengikuti sketsa kantor:
// - Lantai 1: KKD – lobi (resepsionis diapit dua pintu kaca) – SPKED di depan; lorong
//   lebar untuk lalu lalang dengan toilet di ujung kanan; tangga depan (memanjang
//   depan–belakang) di sisi kiri tembok tengah yang berpintu; di belakang Ruang Rapat
//   Pangrango, Ruang Arsip, Mushola + kolam ikan koki, tangga belakang, Ruang Rapat Salak.
// - Lantai 2: Ruang Kepala Dinas – Prolap – Keuangan – toilet di depan; PMD di tengah;
//   Ruang Rapat Halimun, dapur, Sekretariat, dan Pemdes di belakang.
//
// Daftar layanan disimpulkan dari modul yang ada di aplikasi. Sebelum dianggap
// final, isi tiap bidang perlu dicek ke bidang yang bersangkutan.

export const TINGGI_LANTAI = 3.3;

export const LOBI = {
	id: "lobi",
	labelPeta: "LOBI",
	nama: "Lobi & Resepsionis",
	singkatan: "LOBI",
	warna: "#b8862b",
	lantai: 0,
	rect: { x0: -8, x1: 8, z0: 6, z1: 12 },
	npc: { x: 0, z: 6.6, arah: [0, 1] },
	petugas: "Resepsionis",
	sapaan:
		"Selamat datang di DPMD Kabupaten Bogor! KKD dan SPKED ada di lantai 1 lewat pintu kaca kiri dan kanan. Bidang lainnya di lantai 2 — tangganya di lorong, sebelah kiri tembok tengah.",
	tugas:
		"Dinas Pemberdayaan Masyarakat dan Desa membina pemerintahan, keuangan, pembangunan sarana, dan pemberdayaan masyarakat di seluruh desa Kabupaten Bogor.",
};

export const RUANGAN = [
	{
		id: "kkd",
		labelPeta: "KKD",
		nama: "Bidang Kekayaan & Keuangan Desa",
		singkatan: "KKD",
		warna: "#7c3aed",
		lantai: 0,
		rect: { x0: -15, x1: -8, z0: 7.3, z1: 12 },
		pintu: { x: -11.5, z: 7.3 },
		npc: { x: -11.5, z: 11.1, arah: [0, -1] },
		petugas: "Petugas Bidang KKD",
		sapaan:
			"Di ruang ini kami memantau dana yang mengalir ke desa, supaya tepat waktu dan tepat sasaran.",
		tugas:
			"Memantau penyaluran dana ke desa — Dana Desa, ADD, BHPRD, dan bantuan provinsi — serta membina pengelolaan kekayaan desa.",
		kalimat: [
			"Sedang merekap penyaluran Dana Desa.",
			"Laporan BHPRD sedang saya cocokkan.",
			"LPJ bantuan provinsi dari desa sudah masuk.",
		],
		layanan: [
			{
				judul: "Dana Desa",
				uraian: "Pemantauan penyaluran Dana Desa per tahap untuk setiap desa.",
				untuk: ["Desa"],
				perluAkun: true,
			},
			{
				judul: "Alokasi Dana Desa (ADD)",
				uraian: "Penetapan dan penyaluran ADD dari APBD Kabupaten Bogor ke desa.",
				untuk: ["Desa"],
				perluAkun: true,
			},
			{
				judul: "BHPRD",
				uraian: "Bagi Hasil Pajak dan Retribusi Daerah yang menjadi hak desa, dari penetapan hingga penyaluran.",
				untuk: ["Desa"],
				perluAkun: true,
			},
			{
				judul: "Bantuan Keuangan Provinsi",
				uraian: "Pendampingan penyaluran dan laporan pertanggungjawaban (LPJ) bantuan dari Provinsi Jawa Barat.",
				untuk: ["Desa"],
				perluAkun: true,
			},
		],
	},
	{
		id: "spked",
		labelPeta: "SPKED",
		nama: "Bidang Sarana Prasarana Kewilayahan & Ekonomi Desa",
		singkatan: "SPKED",
		warna: "#d97706",
		lantai: 0,
		rect: { x0: 8, x1: 15, z0: 7.3, z1: 12 },
		pintu: { x: 11.5, z: 7.3 },
		npc: { x: 11.5, z: 11.1, arah: [0, -1] },
		petugas: "Petugas Bidang SPKED",
		sapaan:
			"Ingin tahu desa mana yang mendapat bantuan pembangunan, atau mencari produk BUM Desa? Di sinilah tempatnya.",
		tugas:
			"Mendukung pembangunan sarana prasarana desa dan penguatan ekonomi desa melalui bantuan keuangan, BUM Desa, dan kerja sama desa.",
		kalimat: [
			"Sedang verifikasi proposal bantuan keuangan.",
			"Produk BUM Desa ini cocok masuk Pasar BUM Desa!",
			"Dokumen kerja sama desa sedang saya cek.",
		],
		layanan: [
			{
				judul: "Bantuan keuangan infrastruktur desa",
				uraian:
					"Daftar desa penerima dan nilai bantuan keuangan untuk pembangunan sarana prasarana, terbuka untuk umum.",
				untuk: ["Umum", "Desa"],
				tautan: { ke: "/bantuan-keuangan", label: "Lihat data bantuan" },
			},
			{
				judul: "Bantuan keuangan perubahan",
				uraian: "Data bantuan keuangan pada anggaran perubahan, juga terbuka untuk umum.",
				untuk: ["Umum", "Desa"],
				tautan: { ke: "/bantuan-keuangan-perubahan", label: "Lihat data perubahan" },
			},
			{
				judul: "BUM Desa & Pasar BUM Desa",
				uraian:
					"Etalase produk dan wisata BUM Desa se-Kabupaten Bogor. Data BUM Desa-nya dibina oleh bidang ini.",
				untuk: ["Umum"],
				tautan: { ke: "/pasar-bumdes", label: "Kunjungi Pasar BUM Desa" },
			},
			{
				judul: "Kerja sama desa",
				uraian: "Pencatatan dan fasilitasi kerja sama antardesa maupun dengan pihak ketiga.",
				untuk: ["Desa"],
				perluAkun: true,
			},
		],
	},
	{
		id: "prolap",
		labelPeta: "PROLAP",
		nama: "Bidang Prolap (Program & Pelaporan)",
		singkatan: "PROLAP",
		warna: "#0891b2",
		lantai: 1,
		rect: { x0: -8.4, x1: 4, z0: 7.3, z1: 12 },
		pintu: { x: 0, z: 7.3 },
		npc: { x: 0, z: 11.1, arah: [0, -1] },
		petugas: "Petugas Prolap",
		sapaan: "Halo! Rencana kerja dan laporan kinerja seluruh bidang dirangkum di ruang ini.",
		tugas: "Menyusun perencanaan program dan anggaran dinas serta merangkum pelaporan kinerja seluruh bidang.",
		kalimat: [
			"Sedang menyusun rencana kerja tahun depan.",
			"Laporan kinerja triwulan ini hampir rampung.",
			"Capaian program tiap bidang sedang saya rekap.",
		],
		layanan: [
			{
				judul: "Perencanaan program",
				uraian: "Penyusunan rencana kerja dan anggaran dinas bersama seluruh bidang.",
				untuk: ["Pegawai"],
				perluAkun: true,
			},
			{
				judul: "Pelaporan kinerja",
				uraian: "Rekap capaian program dan kegiatan seluruh bidang secara berkala.",
				untuk: ["Pegawai"],
				perluAkun: true,
			},
		],
	},
	{
		id: "keuangan",
		labelPeta: "KEU",
		nama: "Bidang Keuangan",
		singkatan: "KEUANGAN",
		warna: "#16a34a",
		lantai: 1,
		rect: { x0: 4, x1: 12.8, z0: 7.3, z1: 12 },
		pintu: { x: 8.4, z: 7.3 },
		npc: { x: 8.4, z: 11.1, arah: [0, -1] },
		petugas: "Petugas Keuangan",
		sapaan: "Selamat datang! Anggaran dan pencairan kegiatan dinas diurus di sini.",
		tugas: "Mengelola anggaran dinas, pencairan kegiatan, dan penatausahaan keuangan DPMD.",
		kalimat: [
			"Berkas pencairan kegiatan ini sedang saya verifikasi.",
			"Realisasi anggaran bulan ini sedang direkap.",
			"SPJ kegiatan minggu lalu sudah lengkap.",
		],
		layanan: [
			{
				judul: "Anggaran dinas",
				uraian: "Penatausahaan anggaran dinas dan pemantauan realisasinya.",
				untuk: ["Pegawai"],
				perluAkun: true,
			},
			{
				judul: "Pencairan kegiatan",
				uraian: "Pengajuan dan verifikasi pencairan dana kegiatan bidang.",
				untuk: ["Pegawai"],
				perluAkun: true,
			},
		],
	},
	{
		id: "pmd",
		labelPeta: "PMD",
		nama: "Bidang Pemberdayaan Masyarakat Desa",
		singkatan: "PMD",
		warna: "#db2777",
		lantai: 1,
		// bentuk ㄱ: rect = bagian belakang, rect2 = kaki kanan
		rect: { x0: -6.95, x1: 3.1, z0: -4, z1: -1 },
		rect2: { x0: -4.05, x1: 3.1, z0: -1, z1: 3.8 },
		pintu: { x: -0.9, z: 3.8 },
		npc: { x: 1.2, z: -0.2, arah: [0, 1] },
		poster: { x: 2.93, z: 1.0, rot: -Math.PI / 2 },
		petugas: "Petugas Bidang PMD",
		sapaan:
			"Desa kuat karena warganya aktif. Kami mendampingi lembaga-lembaga kemasyarakatan di setiap desa.",
		tugas:
			"Membina lembaga kemasyarakatan desa dan mendorong partisipasi warga dalam pembangunan desa.",
		kalimat: [
			"Sedang memverifikasi data pengurus Posyandu.",
			"Rapat koordinasi kelembagaan sebentar lagi.",
			"Data RT/RW desa ini sudah lengkap.",
		],
		layanan: [
			{
				judul: "Kelembagaan desa",
				uraian:
					"Pendataan RT, RW, Posyandu, PKK, LPM, Karang Taruna, dan Satlinmas di setiap desa.",
				untuk: ["Desa"],
				perluAkun: true,
			},
			{
				judul: "Data pengurus lembaga",
				uraian: "Susunan pengurus tiap lembaga beserta masa baktinya, bisa diimpor sekaligus dari berkas.",
				untuk: ["Desa"],
				perluAkun: true,
			},
			{
				judul: "Capaian & verifikasi data",
				uraian: "Memantau desa mana yang datanya sudah lengkap dan sudah diverifikasi.",
				untuk: ["Kecamatan", "Pegawai"],
				perluAkun: true,
			},
		],
	},
	{
		id: "sekretariat",
		labelPeta: "SEKRE",
		nama: "Sekretariat",
		singkatan: "SEKRETARIAT",
		warna: "#2563eb",
		lantai: 1,
		rect: { x0: -1.4, x1: 6, z0: -13, z1: -6 },
		pintu: { x: 4.6, z: -6 },
		npc: { x: 2.3, z: -12.5, arah: [0, 1] },
		petugas: "Petugas Sekretariat",
		sapaan:
			"Halo! Semua urusan administrasi dinas bermuara di sini, mulai dari surat masuk sampai data kepegawaian.",
		tugas: "Mengoordinasikan administrasi umum, persuratan, kepegawaian, dan aset di lingkungan DPMD.",
		kalimat: [
			"Sedang menyusun agenda rapat minggu ini.",
			"Surat masuk pagi ini sudah saya disposisikan.",
			"Rekap absensi bulan ini hampir selesai.",
			"Data aset barang sedang saya perbarui.",
		],
		layanan: [
			{
				judul: "Persuratan & disposisi",
				uraian:
					"Surat yang masuk ke DPMD dicatat secara digital lalu diteruskan ke bidang yang berwenang, sehingga alurnya bisa dipantau sampai selesai.",
				untuk: ["Umum", "Desa"],
			},
			{
				judul: "Jadwal kegiatan dinas",
				uraian: "Agenda rapat dan kegiatan DPMD tersusun dalam satu kalender bersama.",
				untuk: ["Pegawai"],
				perluAkun: true,
			},
			{
				judul: "Kepegawaian & absensi",
				uraian: "Kehadiran pegawai tercatat lewat aplikasi, lengkap dengan rekap bulanan.",
				untuk: ["Pegawai"],
				perluAkun: true,
			},
			{
				judul: "Arsip & aset barang",
				uraian:
					"Barang milik dinas tercatat dan diberi label QR; pindai labelnya untuk melihat data barang.",
				untuk: ["Pegawai"],
				perluAkun: true,
			},
		],
	},
	{
		id: "pemdes",
		labelPeta: "PEMDES",
		nama: "Bidang Pemerintahan Desa",
		singkatan: "PEMDES",
		warna: "#0f766e",
		lantai: 1,
		rect: { x0: 6, x1: 15, z0: -13, z1: 4.5 },
		pintu: { x: 9, z: 4.5 },
		npc: { x: 10.5, z: 0.5, arah: [0, 1] },
		petugas: "Petugas Bidang Pemdes",
		sapaan:
			"Selamat datang! Kami menjaga agar data dan tata kelola pemerintahan di setiap desa tetap rapi dan sah.",
		tugas:
			"Membina penyelenggaraan pemerintahan desa: profil desa, perangkat desa dan BPD, serta produk hukum desa.",
		kalimat: [
			"Sedang memeriksa perdes yang baru diunggah.",
			"Data aparatur desa ini perlu dilengkapi.",
			"Profil desa sudah diperbarui operatornya.",
		],
		layanan: [
			{
				judul: "Profil desa",
				uraian:
					"Data umum tiap desa — wilayah, kontak, dan kondisi desa — diperbarui langsung oleh operator desa.",
				untuk: ["Desa"],
				perluAkun: true,
			},
			{
				judul: "Data aparatur desa",
				uraian: "Pendataan kepala desa, perangkat desa, dan anggota BPD beserta masa jabatannya.",
				untuk: ["Desa"],
				perluAkun: true,
			},
			{
				judul: "Produk hukum desa",
				uraian:
					"Peraturan desa dan peraturan kepala desa diunggah, diperiksa, lalu diarsipkan secara digital.",
				untuk: ["Desa", "Kecamatan"],
				perluAkun: true,
			},
		],
	},
];

export const HALAMAN = { id: "luar", nama: "Halaman Kantor", lantai: 0 };
export const TANGGA_AREA = { id: "tangga", nama: "Tangga" };

// Ruang pendukung. Urutan penting: yang lebih spesifik di atas, area luas
// (lorong/aula) di bawah sebagai penampung sisa.
export const AREA_LAIN = [
	{ id: "toilet1", nama: "Toilet", lantai: 0, rect: { x0: 13.2, x1: 15, z0: 1, z1: 4.8 } },
	{ id: "pangrango", nama: "Ruang Rapat Pangrango", lantai: 0, rect: { x0: -15, x1: -8.3, z0: -6.6, z1: 0 } },
	{ id: "arsip", nama: "Ruang Arsip", lantai: 0, rect: { x0: -8, x1: -2.8, z0: -6.4, z1: -1.5 } },
	{ id: "kolam", nama: "Kolam Ikan Koki", lantai: 0, rect: { x0: -15, x1: -11.4, z0: -13, z1: -9.6 } },
	{ id: "mushola", nama: "Mushola", lantai: 0, rect: { x0: -11.4, x1: -4.6, z0: -13, z1: -9.6 } },
	{ id: "salak", nama: "Ruang Rapat Salak", lantai: 0, rect: { x0: 2.8, x1: 15, z0: -13, z1: 1 } },
	{ id: "lorong1", nama: "Lorong Lantai 1", lantai: 0, rect: { x0: -15, x1: 15, z0: 1, z1: 7.3 } },
	{ id: "belakang1", nama: "Area Belakang", lantai: 0, rect: { x0: -15, x1: 2.8, z0: -13, z1: 1 } },
	{ id: "kadis", nama: "Ruang Kepala Dinas", lantai: 1, rect: { x0: -15, x1: -8.4, z0: 3.8, z1: 12 } },
	{ id: "toilet2", nama: "Toilet", lantai: 1, rect: { x0: 12.8, x1: 15, z0: 4.5, z1: 12 } },
	{ id: "halimun", nama: "Ruang Rapat Halimun", lantai: 1, rect: { x0: -15, x1: -6.95, z0: -5.6, z1: 3.8 } },
	{ id: "gudang2", nama: "Gudang Arsip Lt. 2", lantai: 1, rect: { x0: -15, x1: -9.5, z0: -9.6, z1: -5.6 } },
	{ id: "dapur", nama: "Dapur", lantai: 1, rect: { x0: -15, x1: -4.6, z0: -13, z1: -9.6 } },
	{ id: "aula2", nama: "Lantai 2", lantai: 1, rect: { x0: -15, x1: 15, z0: -13, z1: 12 } },
];

// Benda yang bisa dipakai pengunjung (tekan E / tombol Pakai di dekatnya).
export const BENDA = [
	{
		id: "dispenser",
		label: "Ambil air minum",
		lantai: 0,
		x: 7.2,
		z: 11.5,
		aksi: { jenis: "pesan", judul: "Dispenser air", teks: "Segelas air dingin untuk Anda. Silakan — gratis untuk tamu!" },
	},
	{
		id: "kopi",
		label: "Seduh kopi tamu",
		lantai: 0,
		x: 9.5,
		z: 2.1,
		aksi: { jenis: "pesan", judul: "Pojok kopi tamu", teks: "Kopi hangat sudah siap. Nikmati sambil menunggu giliran dilayani." },
	},
	{
		id: "arsip",
		label: "Lihat ruang arsip",
		lantai: 0,
		x: -4.4,
		z: -4,
		aksi: { jenis: "pesan", judul: "Ruang Arsip", teks: "Dokumen dan surat dinas disimpan berurutan di rak arsip, dan setiap berkas tercatat di aplikasi arsip DPMD." },
	},
	{
		id: "kolam",
		label: "Lihat kolam ikan koki",
		lantai: 0,
		x: -12.6,
		z: -8.9,
		aksi: { jenis: "pesan", judul: "Kolam ikan koki", teks: "Kolam kecil berisi ikan koki di sudut belakang — tempat pegawai melepas penat sejenak." },
	},
	{ id: "kios", label: "Buka denah digital", lantai: 0, x: -7.1, z: 11.4, aksi: { jenis: "pindah" } },
	{
		id: "panduan",
		label: "Baca panduan pengunjung",
		lantai: 0,
		x: -7.2,
		z: 10.4,
		aksi: {
			jenis: "pesan",
			judul: "Panduan pengunjung",
			teks: [
				"1. Sapa resepsionis di tengah lobi dan ambil nomor antrean.",
				"2. KKD lewat pintu kaca kiri, SPKED lewat pintu kaca kanan.",
				"3. Ke lantai 2 (Sekretariat, Pemdes, PMD, Prolap, Keuangan): naik tangga di lorong, sebelah kiri tembok tengah.",
				"4. Banyak layanan juga bisa diurus daring lewat aplikasi DPMD.",
			],
		},
	},
	{
		id: "wastafel1",
		label: "Cuci tangan",
		lantai: 0,
		x: 14,
		z: 4.1,
		aksi: { jenis: "pesan", judul: "Toilet", teks: "Tangan sudah bersih dan segar. Jangan lupa matikan keran, ya." },
	},
	{
		id: "mushola",
		label: "Lihat mushola",
		lantai: 0,
		x: -8.3,
		z: -8.8,
		aksi: { jenis: "pesan", judul: "Mushola", teks: "Tempat salat untuk pegawai dan tamu. Mohon lepas alas kaki sebelum masuk area sajadah." },
	},
	{
		id: "videotron-salak",
		label: "Lihat videotron",
		lantai: 0,
		x: 8.9,
		z: -12.2,
		aksi: { jenis: "pesan", judul: "Ruang Rapat Salak", teks: "Ruang rapat dengan meja rapat besar, kursi eksekutif, dan videotron untuk presentasi." },
	},
	{
		id: "videotron-pangrango",
		label: "Lihat videotron",
		lantai: 0,
		x: -12.2,
		z: -6.0,
		aksi: { jenis: "pesan", judul: "Ruang Rapat Pangrango", teks: "Ruang rapat dengan fasilitas yang sama seperti Ruang Rapat Halimun, lengkap dengan videotron." },
	},
	{
		id: "videotron-halimun",
		label: "Lihat videotron",
		lantai: 1,
		x: -11.0,
		z: -4.8,
		aksi: { jenis: "pesan", judul: "Ruang Rapat Halimun", teks: "Ruang rapat utama dengan fasilitas rapat mewah dan videotron. Rapat sedang berlangsung — mohon tidak mengganggu." },
	},
	{
		id: "pimpinan",
		label: "Lihat meja pimpinan",
		lantai: 1,
		x: -11.4,
		z: 8.3,
		aksi: { jenis: "pesan", judul: "Ruang Kepala Dinas", teks: "Pimpinan sedang memimpin rapat di Ruang Rapat Halimun. Silakan sampaikan keperluan Anda lewat Sekretariat." },
	},
	{
		id: "teh",
		label: "Buat teh",
		lantai: 1,
		x: -6.6,
		z: -11.6,
		aksi: { jenis: "pesan", judul: "Dapur", teks: "Teh manis hangat sudah siap. Dapur ini dipakai bersama oleh pegawai lantai 2." },
	},
	{
		id: "wastafel2",
		label: "Cuci tangan",
		lantai: 1,
		x: 14.3,
		z: 10.8,
		aksi: { jenis: "pesan", judul: "Toilet", teks: "Tangan sudah bersih dan segar. Jangan lupa matikan keran, ya." },
	},
];

// Titik mulai: di halaman depan, menghadap pintu masuk.
export const TITIK_MULAI = { x: 0, z: 30, rot: Math.PI, yaw: 0, lantai: 0 };

export const SEMUA_AREA = [...RUANGAN, LOBI, ...AREA_LAIN];
export const AREA_PER_ID = Object.fromEntries([...SEMUA_AREA, HALAMAN, TANGGA_AREA].map((a) => [a.id, a]));

export const GEDUNG = { x0: -15, x1: 15, z0: -13, z1: 12 };

// Area di titik (x, z) pada lantai tertentu. Di luar gedung → halaman; di dalam
// gedung tetapi di ruang tertutup (tak bisa dimasuki) → null.
export function cariArea(x, z, lantai = 0) {
	for (const a of SEMUA_AREA) {
		if (a.lantai !== lantai) continue;
		// ruang berbentuk L punya kotak kedua (rect2)
		for (const r of a.rect2 ? [a.rect, a.rect2] : [a.rect]) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return a;
	}
	const g = GEDUNG;
	const diDalam = x > g.x0 && x < g.x1 && z > g.z0 && z < g.z1;
	return !diDalam && lantai === 0 ? HALAMAN : null;
}

// Titik berdiri untuk "pindah cepat": beberapa langkah di depan petugas,
// menghadap ke arahnya, dengan kamera di belakang pengunjung.
export function titikDepanPetugas(area) {
	const [dx, dz] = area.npc.arah;
	return {
		x: area.npc.x + dx * 3.2,
		z: area.npc.z + dz * 3.2,
		rot: Math.atan2(-dx, -dz),
		yaw: Math.atan2(dx, dz),
		lantai: area.lantai,
	};
}
