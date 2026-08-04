// src/constants/prolapOutputs.js
// Katalog output Prolap, DIKAMARKAN PER BIDANG PEMILIKNYA.
//
// Prolap (Sekretariat) hanya merekap; yang menghasilkan outputnya tetap bidang
// teknis. Jalan terbangun milik SPKED, penyaluran dana milik KKD, dan
// seterusnya. Pengelompokan ini yang dipakai halaman Sekretariat supaya
// daftarnya tidak menumpuk jadi satu tumpukan kartu tanpa asal-usul.
//
// Identitas bidang (id, nama, warna) TIDAK ditulis ulang di sini — diambil dari
// `constants/bidang.js` supaya satu bidang berwarna sama di halaman navigasi
// bidang maupun di sini.
import { Route, DollarSign, Users2, Landmark, Store, ClipboardList } from 'lucide-react';
import { bidangBySlug } from './bidang';

// Urutan sengaja bidang teknis dulu, Sekretariat terakhir — outputnya sendiri
// belum siap, jadi tidak elok jadi yang pertama terbaca.
const URUTAN_BIDANG = ['spked', 'kkd', 'pmd', 'pemdes', 'sekretariat'];

export const PROLAP_BIDANG = URUTAN_BIDANG.map((slug) => {
	const bidang = bidangBySlug(slug);
	return { key: bidang.slug, id: bidang.id, short: bidang.short, label: bidang.label, accent: bidang.accent };
});

// `siap: false` = outputnya sudah dipetakan tapi datanya belum layak
// ditampilkan. Kartunya tetap muncul dalam keadaan mati beserta alasannya,
// supaya yang belum ada tidak tampak seperti tidak pernah dipikirkan.
export const PROLAP_OUTPUTS = [
	{
		key: 'output-infrastruktur',
		bidang: 'spked',
		title: 'Output Pembangunan Bankeu',
		description: 'Panjang jalan terbangun & sebarannya di peta',
		icon: Route,
		path: '/sekretariat/prolap/output-infrastruktur',
		siap: true,
		accent: '#eb6834',
	},
	{
		key: 'output-bumdes',
		bidang: 'spked',
		title: 'Output BUMDes',
		description: 'Badan hukum, penyertaan modal & kontribusi PADes',
		icon: Store,
		path: '/sekretariat/prolap/output-bumdes',
		siap: true,
		accent: '#eda100',
	},
	{
		key: 'output-keuangan',
		bidang: 'kkd',
		title: 'Output Penyaluran Keuangan Desa',
		description: 'ADD, DD, BHPRD, Bankeu & BP — cair sampai tahap berapa',
		icon: DollarSign,
		path: '/sekretariat/prolap/output-keuangan',
		siap: true,
		accent: '#2a78d6',
	},
	{
		key: 'output-kelembagaan',
		bidang: 'pmd',
		title: 'Output Kelembagaan Desa',
		description: 'Posyandu, RT/RW, LPM, PKK, Karang Taruna & pengurusnya',
		icon: Users2,
		path: '/sekretariat/prolap/output-kelembagaan',
		siap: true,
		accent: '#1baf7a',
	},
	{
		key: 'output-pemerintahan',
		bidang: 'pemdes',
		title: 'Output Pemerintahan Desa',
		description: 'Aparatur, produk hukum & kelengkapan profil desa',
		icon: Landmark,
		path: '/sekretariat/prolap/output-pemerintahan',
		siap: true,
		accent: '#4a3aa7',
	},
	{
		key: 'output-layanan-internal',
		bidang: 'sekretariat',
		title: 'Output Layanan Internal',
		description: 'Surat, disposisi, kegiatan & realisasi anggaran',
		icon: ClipboardList,
		path: '/sekretariat/prolap/output-layanan-internal',
		siap: false,
		alasan:
			'Modul pencairan, perjadin, dan arsip barang belum terisi data. Grafik kosong lebih menyesatkan daripada tidak ada grafik.',
		accent: '#898781',
	},
];

/** Output dikelompokkan per bidang, urut sesuai PROLAP_BIDANG. */
export const prolapOutputsPerBidang = () =>
	PROLAP_BIDANG.map((bidang) => ({
		...bidang,
		outputs: PROLAP_OUTPUTS.filter((output) => output.bidang === bidang.key),
	})).filter((bidang) => bidang.outputs.length > 0);

export const jumlahOutputSiap = () => PROLAP_OUTPUTS.filter((output) => output.siap).length;

/** Berapa output siap yang dimiliki satu bidang — dipakai halaman navigasi bidang. */
export const jumlahOutputBidang = (slug) =>
	PROLAP_OUTPUTS.filter((output) => output.bidang === slug && output.siap).length;
