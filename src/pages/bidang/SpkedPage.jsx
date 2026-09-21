// src/pages/bidang/SpkedPage.jsx
//
// Ikhtisar Bidang SPKED: Bantuan Keuangan (2025–2027), Bankeu Perubahan, LPJ
// Bantuan Provinsi, dan pembinaan BUMDes.
//
// ATURAN TAMPILAN HALAMAN INI — ditulis supaya tidak pelan-pelan luntur:
//
//  1. SATU warna aksen saja, dan hanya di tempat yang mengukur sesuatu (bilah
//     proporsi BUMDes). Ikon modul monokrom. Versi sebelumnya memakai enam
//     warna aksen untuk sepuluh kartu yang sederajat — warna yang tidak
//     membedakan apa pun hanya jadi bising.
//  2. Pemisah berupa GARIS RAMBUT, bukan jarak antar kartu melayang. Panel
//     dibagi dengan `gap-px` di atas latar slate-200, sehingga selnya berbagi
//     satu garis presisi alih-alih masing-masing punya bingkai dan bayangan.
//  3. Hierarki dari TIPOGRAFI: angka besar bertabular, label kecil berhuruf
//     kapital renggang. Bukan dari kotak ikon berwarna di setiap sudut.
//  4. Angka yang tidak punya isi TIDAK ditampilkan. `total_unit_usaha` dikirim
//     backend sebagai 0 mati (bidang.controller.js case 3: "field removed") dan
//     `total_bankeu` tidak pernah dikirim sama sekali — keduanya dibuang, bukan
//     dipajang sebagai nol. Bagian Anggaran juga tidak ada di sini: bidang ini
//     belum punya pagu, sehingga panelnya hanya menampilkan "Rp 0" berulang.
import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBidangPath } from '../../hooks/useBidangPath';
import {
	Building2,
	Activity,
	ArrowLeft,
	ArrowRight,
	ChevronRight,
	FileText,
	BarChart3,
	DollarSign,
	Hammer,
	ShieldCheck,
	CalendarOff,
	HardDrive,
	ClipboardList,
	Gavel,
	Handshake,
	UserPlus,
	RotateCcw,
} from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';
import { bidangBySlug } from '../../constants/bidang';
import { BidangHeader, TabBar, SubTabs, PanelMemuat, LogAktivitas } from '../../components/bidang/BidangUI';
import { angka, rupiahRingkas } from '../../components/bidang/bidangFormat';
import BarKomposisi from '../../components/bidang/BarKomposisi';

// Lazy load BUMDes components
// Statistik BUMDes dipakai ULANG dari Core Dashboard, bukan disalin. Halaman
// itu menghitung seluruh isinya dari satu daftar (/kepala-dinas/bumdes) dan
// satu irisan filter; menyalin logikanya ke sini berarti membuat sumber kedua
// yang pasti akan menyimpang. Rutenya cukup `auth`, jadi pegawai SPKED boleh
// memanggilnya, dan cache-nya sama sehingga datanya hanya diambil sekali.
const StatistikBumdes = lazy(() => import('../kepala-dinas/StatistikBumdes'));

// Lazy load Bankeu component
const BankeuDashboard = lazy(() => import('./spked/bankeu/BankeuDashboard'));
const DpmdVerificationPage = lazy(() => import('./spked/bankeu/DpmdVerificationPage'));
const BankeuLpjMonitoringPage = lazy(() => import('./spked/bankeu/BankeuLpjMonitoringPage'));
const BankeuProposal2025MonitoringPage = lazy(() => import('./spked/bankeu/BankeuProposal2025MonitoringPage'));
// Bankeu Perubahan 2026 (DPMD final verification)
const DpmdBankeuPerubahanPage = lazy(() => import('./spked/bankeu-perubahan/DpmdBankeuPerubahanPage'));
// Pengelolaan hari libur (tanggal merah) untuk blokir BA & Surat Pengantar
const HariLiburManager = lazy(() => import('./spked/HariLiburManager'));
// Akun operator desa. Satu komponen yang sama dipakai PMD dan Pemdes; yang
// membedakan hanya prop `modul`, yang menyempitkan hak akses yang bisa
// diberikan menjadi satu fitur saja (lihat config/bidangDesaPermissions.js).
const ManajemenAkunDesaPage = lazy(() => import('./ManajemenAkunDesaPage'));
// Monitoring Kerja Sama Desa. Hanya baca — rutenya pun tidak menyediakan tulis.
const KerjasamaMonitoringPage = lazy(() => import('./spked/kerjasama/KerjasamaMonitoringPage'));

const LoadingFallback = () => <PanelMemuat pesan="Menyiapkan modul…" />;

const AKSEN = bidangBySlug('spked').accent;

// Lebar kerja disamakan dengan Bankeu Perubahan untuk SELURUH tab, bukan hanya
// tab itu. Isi halaman ini tabel dan daftar desa se-kabupaten; memampatkannya ke
// max-w-7xl berarti setengah layar dibiarkan kosong sementara tabelnya menggulung.
const LEBAR = 'mx-auto w-full max-w-[1800px]';

// Kelas berulang. Dikumpulkan supaya satu panel tidak diam-diam berbeda radius
// atau ketebalan garis dari panel sebelahnya.
const PANEL = 'overflow-hidden rounded-2xl border border-slate-200 bg-white';
const KEPALA_PANEL = 'flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 px-6 py-4';
const KICKER = 'text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400';
// Garis rambut antar sel: latar slate-200 yang tersingkap 1px lewat gap.
const KISI_GARIS = 'grid gap-px bg-slate-200';

/**
 * Ramp ORDINAL satu rona untuk kedua grafik komposisi — gelap = tahap paling
 * tuntas, terang = paling jauh dari selesai. Bukan warna kategori.
 *
 * Keduanya sudah divalidasi pada latar terang: lightness monoton, jarak antar
 * langkah >= 0.06, dan ujung teringan tetap di atas 2:1 terhadap latar
 * (#86b6ef 2,06:1 untuk lima langkah; #6da7ec 2,44:1 untuk empat). Jangan
 * ditukar warna kategori — sebaran tahapan akan berhenti terbaca sebagai urutan.
 */
const RAMP_5 = ['#104281', '#1c5cab', '#2a78d6', '#5598e7', '#86b6ef'];
const RAMP_4 = ['#104281', '#1c5cab', '#2a78d6', '#6da7ec'];

/**
 * Modul dikelompokkan menurut urusan, bukan dijejer sederajat.
 *
 * Sepuluh pintu yang sama besarnya memaksa mata membaca semuanya untuk
 * menemukan satu. Dikelompokkan begini, pembacanya cukup melompat ke urusan
 * yang sedang dikerjakannya. Isinya menunjuk id di daftar modul supaya judul
 * dan aksinya tidak ditulis dua kali.
 */
const KELOMPOK_MODUL = [
	{ judul: 'Pembinaan Desa', isi: ['bumdes', 'kerjasama'] },
	{ judul: 'Bantuan Keuangan', isi: ['bankeu', 'bankeu-perubahan', 'lpj-provinsi'] },
	{ judul: 'Akun Operator Desa', isi: ['akun-bankeu', 'akun-bumdes', 'akun-kerjasama'] },
	{ judul: 'Alat Bidang', isi: ['hari-libur', 'produk-hukum', 'drive', 'formulir'] },
];

const TABS = [
	{ id: 'overview', label: 'Ikhtisar', icon: BarChart3 },
	{ id: 'bumdes', label: 'BUMDes', icon: Building2 },
	{ id: 'kerjasama', label: 'Kerja Sama Desa', icon: Handshake },
	{ id: 'bankeu', label: 'Bantuan Keuangan', icon: DollarSign },
	{ id: 'bankeu-perubahan', label: 'Bankeu Perubahan', icon: DollarSign },
	{ id: 'bantuan-provinsi-lpj', label: 'LPJ Bantuan Provinsi', icon: FileText },
	{ id: 'hari-libur', label: 'Hari Libur', icon: CalendarOff },
	{ id: 'activity', label: 'Aktivitas', icon: Activity },
];

// Dua pintu di dalam tab Bantuan Keuangan: berkas bankeu-nya sendiri, dan
// akun petugas desa yang mengunggahnya. Keduanya pekerjaan bidang ini, tapi
// yang kedua tidak terikat tahun anggaran — jadi ia duduk di atas pemilih tahun,
// bukan di dalamnya.
const SUB_BANKEU = [
	{ id: 'berkas', label: 'Tahun Anggaran' },
	{ id: 'akun', label: 'Akun Operator' },
];

const SUB_BUMDES = [
	{ id: 'data', label: 'Data BUMDes' },
	{ id: 'akun', label: 'Akun Operator' },
];

const SUB_KERJASAMA = [
	{ id: 'monitor', label: 'Monitoring' },
	{ id: 'akun', label: 'Akun Operator' },
];

const SUB_BANKEU_2025 = [
	{ id: 'penyaluran', label: 'Penyaluran T1 & T2' },
	{ id: 'proposal', label: 'Proposal Bantuan Keuangan' },
	{ id: 'lpj', label: 'LPJ Bantuan Keuangan' },
];

const OPSI_AKTIVITAS = [
	{ value: 'all', label: 'Semua Aktivitas' },
	{ value: 'bumdes', label: 'BUMDes' },
	{ value: 'bankeu', label: 'Bantuan Keuangan' },
];

/**
 * Tahun anggaran Bankeu sebagai data, bukan tiga blok markup kembar.
 *
 * `berkas` menyebut flag yang MEMANG dikirim backend (bankeu_tahap1_uploaded
 * dan kawan-kawan). Tahun tanpa flag tidak diberi penanda karangan — daftarnya
 * kosong dan barisnya memang tidak menampilkan apa pun.
 */
const TAHUN_BANKEU = [
	{
		tahun: 2025,
		keterangan: 'Penyaluran T1 & T2, proposal, dan LPJ',
		berkas: [
			{ kunci: 'bankeu_tahap1_uploaded', label: 'Tahap 1' },
			{ kunci: 'bankeu_tahap2_uploaded', label: 'Tahap 2' },
			{ kunci: 'bankeu_2025_uploaded', label: 'Rekap' },
		],
	},
	{ tahun: 2026, keterangan: 'Verifikasi proposal desa', berkas: [] },
	{ tahun: 2027, keterangan: 'Verifikasi proposal desa', berkas: [] },
];

/** Pembungkus panel modul yang dimuat malas (lazy). */
const PanelModul = ({ children }) => (
	<div className={`${PANEL} shadow-sm`}>
		<Suspense fallback={<LoadingFallback />}>{children}</Suspense>
	</div>
);

/** Satu angka dalam kisi bergaris. Tanpa ikon, tanpa kotak warna. */
const Angka = ({ label, nilai, keterangan, tekan }) => (
	<div className="bg-white px-6 py-5">
		<p className={KICKER}>{label}</p>
		<p
			className={`mt-2.5 font-bold leading-none tracking-tight tabular-nums text-slate-900 ${
				tekan ? 'text-[42px]' : 'text-[28px]'
			}`}
		>
			{nilai}
		</p>
		{keterangan && <p className="mt-2 text-[12px] leading-snug text-slate-500">{keterangan}</p>}
	</div>
);

/**
 * Tiga tahun anggaran dalam satu panel bergaris — dipakai ikhtisar maupun tab.
 *
 * Didefinisikan di lingkup modul, bukan di dalam badan SpkedPage: komponen yang
 * dibuat ulang setiap render adalah tipe baru bagi React, sehingga seluruh
 * isinya dilepas dan dipasang lagi tiap kali state halaman berubah.
 */
const PanelTahun = ({ stats, judul, keterangan, onPilih }) => (
	<section className={PANEL}>
		<div className={KEPALA_PANEL}>
			<div>
				<p className={KICKER}>Bantuan Keuangan</p>
				<h2 className="mt-1 text-[15px] font-bold tracking-tight text-slate-900">{judul}</h2>
			</div>
			{keterangan && <p className="text-[12px] text-slate-500">{keterangan}</p>}
		</div>

		<div className={`${KISI_GARIS} sm:grid-cols-3`}>
			{TAHUN_BANKEU.map((item) => (
				<button
					key={item.tahun}
					onClick={() => onPilih(item.tahun)}
					className="group bg-white px-6 py-5 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50"
				>
					<div className="flex items-center justify-between">
						<p className={KICKER}>Tahun Anggaran</p>
						<ArrowRight className="h-4 w-4 text-slate-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-slate-900" />
					</div>
					<p className="mt-2.5 text-[34px] font-bold leading-none tracking-tight tabular-nums text-slate-900">
						{item.tahun}
					</p>
					<p className="mt-2 text-[12px] leading-snug text-slate-500">{item.keterangan}</p>

					{item.berkas.length > 0 && (
						<div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 pt-3.5">
							{item.berkas.map((berkas) => {
								const ada = Boolean(stats[berkas.kunci]);
								return (
									<span
										key={berkas.kunci}
										title={ada ? 'Berkas data sudah diunggah' : 'Berkas data belum diunggah'}
										className={`inline-flex items-center gap-1.5 text-[11.5px] ${
											ada ? 'font-medium text-slate-700' : 'text-slate-400'
										}`}
									>
										<span
											className={`h-1.5 w-1.5 rounded-full ${
												ada ? 'bg-slate-900' : 'border border-slate-300 bg-transparent'
											}`}
										/>
										{berkas.label}
									</span>
								);
							})}
						</div>
					)}
				</button>
			))}
		</div>
	</section>
);

const SpkedPage = () => {
	const navigate = useNavigate();
	const { getPath } = useBidangPath();
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState(null);
	const [ikhtisar, setIkhtisar] = useState(null);
	const [activeTab, setActiveTab] = useState('overview');
	const [bankeuYear, setBankeuYear] = useState(null); // null = layar pilih tahun
	const [bankeu2025View, setBankeu2025View] = useState('penyaluran');
	const [bankeuView, setBankeuView] = useState('berkas');
	const [bumdesView, setBumdesView] = useState('data');
	const [kerjasamaView, setKerjasamaView] = useState('monitor');

	const [activityLogs, setActivityLogs] = useState([]);
	const [activityLoading, setActivityLoading] = useState(false);
	const [activityFilter, setActivityFilter] = useState('all');

	const fetchDashboard = useCallback(async () => {
		try {
			setLoading(true);
			// Dua permintaan sekaligus: identitas bidang, dan agregat untuk grafik.
			// Agregatnya dihitung server (spkedIkhtisar.controller.js) — 416 baris
			// BUM Desa dan tiga berkas penyaluran tidak perlu melintas jaringan
			// hanya untuk menggambar dua batang.
			const [response, agregat] = await Promise.all([
				api.get('/bidang/3/dashboard'),
				api.get('/spked/ikhtisar').catch(() => null),
			]);
			if (agregat?.data?.success) setIkhtisar(agregat.data.data);
			if (response.data.success) setData(response.data.data);
		} catch (error) {
			console.error('[SpkedPage] Error fetching dashboard:', error);
			toast.error(error.response?.data?.message || 'Gagal memuat data bidang');
		} finally {
			setLoading(false);
		}
	}, []);

	const fetchActivityLogs = useCallback(async () => {
		try {
			setActivityLoading(true);
			const params = {};
			if (activityFilter !== 'all') params.module = activityFilter;

			const response = await api.get('/bidang/3/activity-logs', { params });
			if (response.data.success) setActivityLogs(response.data.data || []);
		} catch (error) {
			console.error('[SpkedPage] Error fetching activity logs:', error);
			toast.error('Gagal memuat aktivitas');
		} finally {
			setActivityLoading(false);
		}
	}, [activityFilter]);

	useEffect(() => {
		fetchDashboard();
	}, [fetchDashboard]);

	// Aktivitas hanya ditarik saat tabnya dibuka — ikhtisar tidak lagi memuatnya.
	useEffect(() => {
		if (activeTab === 'activity') fetchActivityLogs();
	}, [activeTab, fetchActivityLogs]);

	const bukaBankeu = (tahun = null) => {
		setActiveTab('bankeu');
		setBankeuView('berkas');
		setBankeu2025View('penyaluran');
		setBankeuYear(tahun);
	};

	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50">
				<PanelMemuat pesan="Memuat data bidang…" />
			</div>
		);
	}

	const stats = data?.stats || {};
	const totalBumdes = Number(stats.total_bumdes || 0);
	const aktif = Number(stats.active_bumdes || 0);
	const persenAktif = totalBumdes > 0 ? Math.round((aktif / totalBumdes) * 100) : null;

	const modul = [
		{
			id: 'bumdes',
			judul: 'Kelola BUMDes',
			deskripsi: 'Data, pemeringkatan, unit usaha, dan dokumen badan hukum',
			icon: Building2,
			aksi: () => {
				setActiveTab('bumdes');
				setBumdesView('data');
			},
		},
		{
			id: 'kerjasama',
			judul: 'Kerja Sama Desa',
			deskripsi: 'Pantau kerja sama antardesa (KAD) dan dengan pihak ketiga (KDPK)',
			icon: Handshake,
			aksi: () => {
				setActiveTab('kerjasama');
				setKerjasamaView('monitor');
			},
		},
		{
			id: 'akun-kerjasama',
			judul: 'Akun Operator Kerja Sama',
			deskripsi: 'Buatkan akun petugas desa untuk mengisi data kerja sama',
			icon: UserPlus,
			aksi: () => {
				setActiveTab('kerjasama');
				setKerjasamaView('akun');
			},
		},
		{
			id: 'bankeu',
			judul: 'Bantuan Keuangan',
			deskripsi: 'Verifikasi proposal, penyaluran, dan LPJ per tahun anggaran',
			icon: DollarSign,
			aksi: () => bukaBankeu(null),
		},
		{
			id: 'bankeu-perubahan',
			judul: 'Bankeu Perubahan',
			deskripsi: 'Verifikasi akhir DPMD untuk proposal dan LPJ perubahan',
			icon: ShieldCheck,
			aksi: () => setActiveTab('bankeu-perubahan'),
		},
		{
			id: 'lpj-provinsi',
			judul: 'LPJ Bantuan Provinsi',
			deskripsi: 'Pantau dan verifikasi LPJ provinsi yang diunggah desa',
			icon: FileText,
			aksi: () => setActiveTab('bantuan-provinsi-lpj'),
		},
		{
			id: 'akun-bankeu',
			judul: 'Akun Operator Bankeu',
			deskripsi: 'Buatkan akun petugas desa untuk mengurus Bantuan Keuangan',
			icon: UserPlus,
			aksi: () => {
				setActiveTab('bankeu');
				setBankeuView('akun');
			},
		},
		{
			id: 'akun-bumdes',
			judul: 'Akun Operator BUMDes',
			deskripsi: 'Buatkan akun petugas desa untuk mengisi data BUMDes',
			icon: UserPlus,
			aksi: () => {
				setActiveTab('bumdes');
				setBumdesView('akun');
			},
		},
		{
			id: 'hari-libur',
			judul: 'Hari Libur',
			deskripsi: 'Tanggal merah yang memblokir penerbitan BA dan Surat Pengantar',
			icon: CalendarOff,
			aksi: () => setActiveTab('hari-libur'),
		},
		{
			id: 'produk-hukum',
			judul: 'Produk Hukum Kabupaten',
			deskripsi: 'Perda, Perbup, SK, dan Surat Edaran yang dipegang bidang ini',
			icon: Gavel,
			aksi: () => navigate(getPath('/bidang/spked/produk-hukum-kabupaten')),
		},
		{
			id: 'drive',
			judul: 'Drive Bidang',
			deskripsi: 'Penyimpanan berkas internal, bisa dibagikan ke bidang lain',
			icon: HardDrive,
			aksi: () => navigate(getPath('/bidang/spked/drive')),
		},
		{
			id: 'formulir',
			judul: 'Formulir',
			deskripsi: 'Susun formulir sendiri, bagikan tautannya, rekap jawabannya',
			icon: ClipboardList,
			aksi: () => navigate(getPath('/bidang/spked/formulir')),
		},
	];

	return (
		<div className="min-h-screen bg-slate-50">
			<div className={`${LEBAR} space-y-5 px-4 py-6 sm:px-6 lg:px-8`}>
				<BidangHeader
					slug="spked"
					icon={Hammer}
					deskripsi="Bantuan Keuangan desa dari proposal sampai LPJ, Bankeu Perubahan, dan pembinaan BUMDes."
				>
					<button
						onClick={fetchDashboard}
						className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
					>
						<RotateCcw className="h-4 w-4" />
						Sinkronkan
					</button>
				</BidangHeader>

				<TabBar
					tabs={TABS}
					aktif={activeTab}
					onPilih={(id) => {
						setActiveTab(id);
						if (id === 'bankeu') {
							setBankeuYear(null);
							setBankeu2025View('penyaluran');
							setBankeuView('berkas');
						}
						if (id === 'bumdes') setBumdesView('data');
						if (id === 'kerjasama') setKerjasamaView('monitor');
					}}
				/>

				{/* ---------- Ikhtisar ---------- */}
				{activeTab === 'overview' && (
					<div key="overview" className="animate-fadeIn space-y-5">
						{/* Dua grafik komposisi, bukan deretan angka. Keduanya menjawab
						    pertanyaan yang sama untuk dua urusan bidang ini: dari
						    keseluruhan, berapa yang sudah tuntas dan berapa yang belum. */}
						<div className="grid gap-5 xl:grid-cols-2">
							<section className={PANEL}>
								<div className={KEPALA_PANEL}>
									<div>
										<p className={KICKER}>BUM Desa</p>
										<h2 className="mt-1 text-[15px] font-bold tracking-tight text-slate-900">
											Status Badan Hukum
										</h2>
									</div>
									<button
										onClick={() => {
											setActiveTab('bumdes');
											setBumdesView('data');
										}}
										className="group inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-500 transition-colors hover:text-slate-900"
									>
										Kelola data
										<ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
									</button>
								</div>

								<div className="px-6 py-5">
									<div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
										<div>
											<span className="text-[38px] font-bold leading-none tracking-tight tabular-nums text-slate-900">
												{angka(ikhtisar?.bumdes?.total ?? stats.total_bumdes)}
											</span>
											<span className="ml-2 text-[12.5px] text-slate-500">terdata</span>
										</div>
										<div className="text-[12.5px] text-slate-500">
											<span className="font-semibold tabular-nums text-slate-900">
												{angka(ikhtisar?.bumdes?.aktif ?? stats.active_bumdes)}
											</span>{' '}
											aktif
											{persenAktif !== null && <span className="text-slate-400"> · {persenAktif}%</span>}
										</div>
										<div className="text-[12.5px] text-slate-500">
											<span className="font-semibold tabular-nums text-slate-900">
												{angka(ikhtisar?.bumdes?.tidak_aktif ?? stats.inactive_bumdes)}
											</span>{' '}
											tidak aktif
										</div>
									</div>

									<div className="mt-5">
										{ikhtisar?.bumdes?.badan_hukum?.length ? (
											<BarKomposisi data={ikhtisar.bumdes.badan_hukum} warna={RAMP_5} />
										) : (
											<p className="py-6 text-center text-[12.5px] text-slate-400">
												Sebaran status badan hukum belum tersedia
											</p>
										)}
									</div>
								</div>
							</section>

							<section className={PANEL}>
								<div className={KEPALA_PANEL}>
									<div>
										<p className={KICKER}>Bantuan Keuangan · TA {ikhtisar?.bankeu?.tahun || 2025}</p>
										<h2 className="mt-1 text-[15px] font-bold tracking-tight text-slate-900">
											Tahap Penyaluran
										</h2>
									</div>
									<button
										onClick={() => bukaBankeu(ikhtisar?.bankeu?.tahun || 2025)}
										className="group inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-500 transition-colors hover:text-slate-900"
									>
										Buka berkas
										<ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
									</button>
								</div>

								<div className="px-6 py-5">
									{ikhtisar?.bankeu?.rekap?.tersedia ? (
										<>
											<div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
												<div>
													<span className="text-[38px] font-bold leading-none tracking-tight tabular-nums text-slate-900">
														{rupiahRingkas(ikhtisar.bankeu.rekap.realisasi)}
													</span>
													<span className="ml-2 text-[12.5px] text-slate-500">nilai realisasi</span>
												</div>
												<div className="text-[12.5px] text-slate-500">
													<span className="font-semibold tabular-nums text-slate-900">
														{angka(ikhtisar.bankeu.rekap.total)}
													</span>{' '}
													pengajuan desa
												</div>
											</div>

											<div className="mt-5">
												<BarKomposisi data={ikhtisar.bankeu.rekap.status} warna={RAMP_4} />
											</div>

											{/* Dua tahap penyaluran sebagai baris angka, bukan grafik
											    kedua: keduanya bukan bagian dari satu keseluruhan yang
											    sama dengan batang di atas. */}
											<div className="mt-5 grid gap-px border-t border-slate-100 bg-slate-200 pt-px sm:grid-cols-2">
												{ikhtisar.bankeu.tahap.map((t) => (
													<div key={t.label} className="bg-white pr-4 pt-4">
														<p className={KICKER}>{t.label}</p>
														{t.tersedia ? (
															<>
																<p className="mt-2 text-[17px] font-bold leading-none tabular-nums text-slate-900">
																	{rupiahRingkas(t.realisasi)}
																</p>
																<p className="mt-1.5 text-[11.5px] text-slate-500">
																	{angka(t.total)} desa ·{' '}
																	{angka(t.status.find((x) => x.key === 'cair')?.jumlah || 0)} cair
																</p>
															</>
														) : (
															<p className="mt-2 text-[12px] text-slate-400">Berkas belum diunggah</p>
														)}
													</div>
												))}
											</div>
										</>
									) : (
										<div className="py-10 text-center">
											<p className="text-[13px] font-semibold text-slate-700">
												Data penyaluran belum diunggah
											</p>
											<p className="mx-auto mt-1 max-w-xs text-[12px] text-slate-500">
												Unggah berkas penyaluran lewat modul Bantuan Keuangan agar ringkasannya muncul di
												sini.
											</p>
										</div>
									)}
								</div>
							</section>
						</div>

						{/* Tahun anggaran: navigasi, bukan data — jadi satu baris tautan,
						    bukan tiga kartu sebesar panel grafik di atasnya. */}
						<section className={PANEL}>
							<div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4">
								<p className={KICKER}>Buka tahun anggaran</p>
								<div className="flex flex-wrap items-center gap-x-5 gap-y-2">
									{TAHUN_BANKEU.map((item) => (
										<button
											key={item.tahun}
											onClick={() => bukaBankeu(item.tahun)}
											className="group inline-flex items-baseline gap-2 text-left"
										>
											<span className="text-[19px] font-bold leading-none tabular-nums text-slate-900 transition-colors group-hover:text-slate-600">
												{item.tahun}
											</span>
											<span className="text-[11.5px] text-slate-400 transition-colors group-hover:text-slate-600">
												{item.keterangan}
											</span>
										</button>
									))}
								</div>
							</div>
						</section>

						{/* Modul: dikelompokkan menurut urusan, sebagai daftar tautan —
						    bukan sepuluh kotak sederajat yang memaksa mata membaca
						    semuanya untuk menemukan satu. */}
						<section className={PANEL}>
							<div className={KEPALA_PANEL}>
								<div>
									<p className={KICKER}>Modul Bidang</p>
									<h2 className="mt-1 text-[15px] font-bold tracking-tight text-slate-900">Akses & Kelola</h2>
								</div>
							</div>

							<div className="grid gap-x-8 gap-y-7 px-6 py-5 sm:grid-cols-2 xl:grid-cols-4">
								{KELOMPOK_MODUL.map((kelompok) => (
									<div key={kelompok.judul}>
										<p className={KICKER}>{kelompok.judul}</p>
										<ul className="mt-3 space-y-0.5">
											{kelompok.isi.map((id) => {
												const item = modul.find((m) => m.id === id);
												if (!item) return null;
												const Icon = item.icon;
												return (
													<li key={id}>
														<button
															onClick={item.aksi}
															className="group -mx-2 flex w-[calc(100%+1rem)] items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-50"
														>
															<Icon
																className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-slate-900"
																strokeWidth={1.75}
															/>
															<span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-700 transition-colors group-hover:text-slate-900">
																{item.judul}
															</span>
															<ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
														</button>
													</li>
												);
											})}
										</ul>
									</div>
								))}
							</div>
						</section>
					</div>
				)}

				{/* ---------- BUMDes ---------- */}
				{activeTab === 'bumdes' && (
					<div key="bumdes" className="animate-fadeIn">
						<PanelModul>
							<SubTabs items={SUB_BUMDES} aktif={bumdesView} onPilih={setBumdesView} />
							{/* Data BUMDes: satu tampilan saja. Tambah, ubah, dan kelola
							    dokumen berada DI DALAM halaman statistik — dulu tiga sub-tab
							    terpisah yang menghitung angkanya sendiri-sendiri. */}
							{bumdesView === 'data' && (
								<div className="p-5">
									<StatistikBumdes tersemat bisaKelola />
								</div>
							)}
							{bumdesView === 'akun' && <ManajemenAkunDesaPage tersemat modul="bumdes" />}
						</PanelModul>
					</div>
				)}

				{/* ---------- Kerja Sama Desa ---------- */}
				{activeTab === 'kerjasama' && (
					<div key="kerjasama" className="animate-fadeIn">
						<PanelModul>
							<SubTabs items={SUB_KERJASAMA} aktif={kerjasamaView} onPilih={setKerjasamaView} />
							{kerjasamaView === 'monitor' && <KerjasamaMonitoringPage />}
							{kerjasamaView === 'akun' && <ManajemenAkunDesaPage tersemat modul="kerjasama-desa" />}
						</PanelModul>
					</div>
				)}

				{/* ---------- Bantuan Keuangan ---------- */}
				{activeTab === 'bankeu' && (
					<div key="bankeu" className="animate-fadeIn space-y-5">
						<div className={PANEL}>
							<SubTabs items={SUB_BANKEU} aktif={bankeuView} onPilih={setBankeuView} />
						</div>

						{bankeuView === 'akun' ? (
							<PanelModul>
								<ManajemenAkunDesaPage tersemat modul="bankeu" />
							</PanelModul>
						) : !bankeuYear ? (
							<PanelTahun
								stats={stats}
								judul="Pilih tahun anggaran"
								keterangan="Penanda titik menunjukkan berkas data yang sudah diunggah"
								onPilih={setBankeuYear}
							/>
						) : (
							<div className="space-y-4">
								<button
									onClick={() => setBankeuYear(null)}
									className="group inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
								>
									<ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
									Kembali ke pilihan tahun
								</button>

								<PanelModul>
									{bankeuYear === 2025 ? (
										<>
											<SubTabs items={SUB_BANKEU_2025} aktif={bankeu2025View} onPilih={setBankeu2025View} />
											{bankeu2025View === 'penyaluran' && <BankeuDashboard />}
											{bankeu2025View === 'proposal' && <BankeuProposal2025MonitoringPage tahun={2025} />}
											{bankeu2025View === 'lpj' && <BankeuLpjMonitoringPage tahun={2025} />}
										</>
									) : (
										<DpmdVerificationPage tahunAnggaran={bankeuYear} />
									)}
								</PanelModul>
							</div>
						)}
					</div>
				)}

				{/* ---------- Bankeu Perubahan ---------- */}
				{activeTab === 'bankeu-perubahan' && (
					<div key="bankeu-perubahan" className="animate-fadeIn">
						<PanelModul>
							<DpmdBankeuPerubahanPage />
						</PanelModul>
					</div>
				)}

				{/* ---------- LPJ Bantuan Provinsi ---------- */}
				{activeTab === 'bantuan-provinsi-lpj' && (
					<div key="bantuan-provinsi-lpj" className="animate-fadeIn">
						<PanelModul>
							<BankeuLpjMonitoringPage
								tahun={2025}
								programName="Bantuan Provinsi"
								endpointBase="/dpmd/bantuan-provinsi-lpj"
								storageBase="/storage/uploads/bantuan_provinsi_lpj"
								referenceType="bantuan_provinsi_lpj"
								chatTitle="Chat LPJ Bantuan Provinsi"
							/>
						</PanelModul>
					</div>
				)}

				{/* ---------- Hari Libur ---------- */}
				{activeTab === 'hari-libur' && (
					<div key="hari-libur" className="animate-fadeIn">
						<Suspense fallback={<LoadingFallback />}>
							<HariLiburManager />
						</Suspense>
					</div>
				)}

				{/* ---------- Aktivitas ---------- */}
				{activeTab === 'activity' && (
					<div key="activity" className="animate-fadeIn">
						<LogAktivitas
							logs={activityLogs}
							loading={activityLoading}
							filter={activityFilter}
							onFilter={setActivityFilter}
							opsiFilter={OPSI_AKTIVITAS}
							onRefresh={fetchActivityLogs}
						/>
					</div>
				)}
			</div>
		</div>
	);
};

export default SpkedPage;
