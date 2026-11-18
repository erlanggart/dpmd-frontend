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
		key: "kerjasama-desa",
		label: "Kerja Sama Desa",
		description: "Perdes payung kerja sama, kerja sama antardesa, dan dengan pihak ketiga.",
	},
	{
		key: "pesan",
		label: "Pesan",
		description: "Percakapan dengan DPMD, kecamatan, dan dinas terkait.",
	},
];

export const DESA_PERMISSION_KEYS = DESA_PERMISSIONS.map((p) => p.key);

const IZIN_RUTE_LAIN = { kerjasama: "kerjasama-desa", "katalog-bumdes": "bumdes", pengurus: "kelembagaan" };

/** Izin yang dibutuhkan satu alamat `/desa/...`; null bila alamat itu terbuka untuk semua. */
export const izinRuteDesa = (url) => {
	const bagian = /^\/desa\/([^/?#]+)/.exec(url || "")?.[1];
	if (!bagian) return null;
	return IZIN_RUTE_LAIN[bagian] || (DESA_PERMISSION_KEYS.includes(bagian) ? bagian : null);
};

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

/** Jabatan pada BUM Desa — dipakai akun operator BUMDes. */
export const JABATAN_BUMDES_OPTIONS = [
	"Penasehat BUM Desa (Kepala Desa)",
	"Pengawas BUM Desa",
	"Direktur BUM Desa",
	"Sekretaris BUM Desa",
	"Bendahara BUM Desa",
];

/**
 * Akun operator yang HANYA memegang fitur BUMDes (selain Pesan), mis. hasil
 * generate massal dari tab BUMDes. Akun seperti ini melihat jabatan BUM Desa
 * saat melengkapi identitas dan katalog produk BUMDes sebagai dasbornya.
 */
export const isOperatorBumdes = (user) => {
	if (String(user?.role || "").toLowerCase() !== "desa") return false;
	const izin = Array.isArray(user?.desa_permissions) ? user.desa_permissions : [];
	return izin.includes("bumdes") && izin.every((k) => k === "bumdes" || k === "pesan");
};

export const getDesaPermissionLabel = (key) =>
	DESA_PERMISSIONS.find((p) => p.key === key)?.label || key;

// Keluarga Bantuan Keuangan: akun yang hanya memegang fitur-fitur ini satu kategori.
const IZIN_BANKEU = ["bankeu", "bankeu-perubahan", "bantuan-provinsi-lpj"];

/**
 * Kategori akun di tab Akun Desa (Manajemen Akun), dari peran + hak akses fiturnya.
 * Pesan diabaikan karena hampir semua akun memilikinya. Akun satu fitur (mis. hasil
 * generate massal BUMDes / Kerja Sama) berkategori fitur itu; lebih dari satu fitur
 * = operator multi-fitur.
 */
export const kategoriAkunDesa = (user) => {
	if (String(user?.role || "").toLowerCase() === "admin_desa") return { id: "admin_desa", label: "Admin Desa" };
	const fitur = (Array.isArray(user?.desa_permissions) ? user.desa_permissions : []).filter((k) => k !== "pesan");
	if (!fitur.length) return { id: "tanpa_fitur", label: "Tanpa akses fitur" };
	if (fitur.every((k) => IZIN_BANKEU.includes(k))) return { id: "bankeu", label: "Bantuan Keuangan" };
	if (fitur.length === 1) return { id: fitur[0], label: getDesaPermissionLabel(fitur[0]) };
	return { id: "operator", label: "Operator multi-fitur" };
};
