/**
 * Hak akses fitur halaman Kecamatan untuk akun OPERATOR kecamatan.
 *
 * Key HARUS sama persis dengan backend `src/config/kecamatanPermissions.js`.
 * Akun utama kecamatan tidak memakai daftar ini — semua fiturnya terbuka.
 * Dashboard, Pengaturan, dan Ganti Password selalu terbuka untuk semua akun.
 */

export const KECAMATAN_PERMISSIONS = [
	{
		key: "bankeu",
		label: "Bantuan Keuangan",
		description: "Verifikasi proposal, berita acara, surat desa, dan tim verifikasi Bankeu.",
	},
	{
		key: "bankeu-perubahan",
		label: "Bankeu Perubahan",
		description: "Verifikasi proposal dan berita acara Bantuan Keuangan Perubahan.",
	},
	{
		key: "kelembagaan",
		label: "Kelembagaan",
		description: "Verifikasi data kelembagaan dan pengurus desa di wilayah kecamatan.",
	},
	{
		key: "aparatur-desa",
		label: "Aparatur Desa",
		description: "Memantau data aparatur desa (lihat saja).",
	},
	{
		key: "bumdes",
		label: "BUMDes",
		description: "Memantau data BUMDes (lihat saja).",
	},
	{
		key: "pesan",
		label: "Pesan",
		description: "Percakapan dengan DPMD, desa, dan dinas terkait.",
	},
];

/** Contoh bagian/seksi untuk mempercepat pengisian (tetap boleh diketik bebas). */
export const KECAMATAN_BAGIAN_SARAN = [
	"Seksi PMD",
	"Seksi Pemerintahan",
	"Seksi Ekonomi & Pembangunan",
	"Seksi Kesejahteraan Sosial",
	"Sekretariat",
	"Operator",
];
