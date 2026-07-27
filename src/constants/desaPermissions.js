/**
 * Hak akses (permission) fitur halaman Desa.
 *
 * Key HARUS sama persis dengan backend `src/config/desaPermissions.js`.
 * Dashboard dan Pengaturan sengaja tidak masuk daftar: selalu terbuka untuk
 * semua akun operasional desa.
 */

export const DESA_PERMISSIONS = [
	{
		key: "profil-desa",
		label: "Profil Desa",
		description: "Melihat dan memperbarui data profil desa.",
	},
	{
		key: "produk-hukum",
		label: "Produk Hukum",
		description: "Kelola Perdes, Perkades, dan SK Kepala Desa.",
	},
	{
		key: "bumdes",
		label: "BUMDes",
		description: "Kelola data dan laporan BUMDes.",
	},
	{
		key: "kelembagaan",
		label: "Kelembagaan",
		description: "Kelola RW, RT, Posyandu, LPM, PKK, Karang Taruna, dan pengurusnya.",
	},
	{
		key: "aparatur-desa",
		label: "Aparatur Desa",
		description: "Kelola data perangkat desa.",
	},
	{
		key: "bankeu",
		label: "Bantuan Keuangan",
		description: "Proposal, surat, dan LPJ Bantuan Keuangan.",
	},
	{
		key: "bankeu-perubahan",
		label: "Bankeu Perubahan",
		description: "Proposal dan LPJ Bantuan Keuangan Perubahan.",
	},
	{
		key: "bantuan-provinsi-lpj",
		label: "LPJ Bantuan Provinsi",
		description: "Unggah LPJ bantuan keuangan provinsi.",
	},
	{
		key: "pesan",
		label: "Pesan",
		description: "Percakapan dengan DPMD, kecamatan, dan dinas terkait.",
	},
];

export const DESA_PERMISSION_KEYS = DESA_PERMISSIONS.map((p) => p.key);

/** Contoh bagian/jabatan untuk mempercepat pengisian form (tetap boleh diketik bebas). */
export const DESA_JABATAN_OPTIONS = [
	"Keuangan",
	"Pembangunan",
	"Pemerintahan",
	"Pelayanan",
	"Kesejahteraan",
	"Umum & Tata Usaha",
	"Perencanaan",
	"Operator",
];

export const getDesaPermissionLabel = (key) =>
	DESA_PERMISSIONS.find((p) => p.key === key)?.label || key;
