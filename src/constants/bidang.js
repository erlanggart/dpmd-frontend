// src/constants/bidang.js
// Identitas bidang DPMD — SATU sumber kebenaran untuk id, nama, dan warnanya.
//
// `id` mengikuti tabel `bidangs` di basis data, sama dengan yang dipakai
// `BIDANG_ROLE_MAP` di backend. `accent` adalah satu-satunya penanda warna
// bidang: dipakai halaman navigasi bidang maupun pengelompokan output Prolap,
// jadi satu bidang selalu berwarna sama di mana pun ia muncul.
export const BIDANG = [
	{
		id: 2,
		slug: 'sekretariat',
		short: 'Sekretariat',
		label: 'Sekretariat',
		description: 'Persuratan, kepegawaian, anggaran, dan rekap output lintas bidang (Prolap).',
		accent: '#eda100',
	},
	{
		id: 3,
		slug: 'spked',
		short: 'SPKED',
		label: 'Sarana Prasarana Kewilayahan & Ekonomi Desa',
		description: 'Bantuan Keuangan, Bankeu Perubahan, LPJ, dan BUMDes.',
		accent: '#eb6834',
	},
	{
		id: 4,
		slug: 'kkd',
		short: 'KKD',
		label: 'Kekayaan & Keuangan Desa',
		description: 'Penyaluran ADD, Dana Desa, BHPRD, Bankeu, dan Bantuan Provinsi.',
		accent: '#2a78d6',
	},
	{
		id: 5,
		slug: 'pmd',
		short: 'PMD',
		label: 'Pemberdayaan Masyarakat Desa',
		description: 'Kelembagaan desa, pengurus, dan pembanding data RT/RW & Posyandu.',
		accent: '#1baf7a',
	},
	{
		id: 6,
		slug: 'pemdes',
		short: 'Pemdes',
		label: 'Pemerintahan Desa',
		description: 'Profil desa, aparatur desa, dan produk hukum desa.',
		accent: '#4a3aa7',
	},
];

export const bidangBySlug = (slug) => BIDANG.find((bidang) => bidang.slug === slug);
