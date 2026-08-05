import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useBidangPath } from '../../hooks/useBidangPath';
import {
	Building2,
	Activity,
	TrendingUp,
	ArrowLeft,
	CheckCircle2,
	XCircle,
	FileText,
	BarChart3,
	DollarSign,
	Hammer,
	ArrowRight,
	ShieldCheck,
	BadgeCheck,
	CalendarOff,
	HardDrive,
} from 'lucide-react';
import api from '../../api';
import AnggaranBidangSection from '../../components/bidang/AnggaranBidangSection';
import toast from 'react-hot-toast';
import { bidangBySlug } from '../../constants/bidang';
import {
	BidangHeader,
	StatChip,
	StatTile,
	TabBar,
	SubTabs,
	AksiCard,
	PanelMemuat,
	LogAktivitas,
} from '../../components/bidang/BidangUI';
import { angka } from '../../components/bidang/bidangFormat';

// Lazy load BUMDes components
const BumdesForm = lazy(() => import('./spked/bumdes/BumdesForm'));
const BumdesDashboardModern = lazy(() => import('./spked/bumdes/BumdesDashboardModern'));
const BumdesDokumenManager = lazy(() => import('./spked/bumdes/BumdesDokumenManager'));

// Lazy load Bankeu component
const BankeuDashboard = lazy(() => import('./spked/bankeu/BankeuDashboard'));
const DpmdVerificationPage = lazy(() => import('./spked/bankeu/DpmdVerificationPage'));
const BankeuLpjMonitoringPage = lazy(() => import('./spked/bankeu/BankeuLpjMonitoringPage'));
// Bankeu Perubahan 2026 (DPMD final verification)
const DpmdBankeuPerubahanPage = lazy(() => import('./spked/bankeu-perubahan/DpmdBankeuPerubahanPage'));
// Pengelolaan hari libur (tanggal merah) untuk blokir BA & Surat Pengantar
const HariLiburManager = lazy(() => import('./spked/HariLiburManager'));

const LoadingFallback = () => <PanelMemuat pesan="Menyiapkan modul…" />;

const AKSEN = bidangBySlug('spked').accent;

// Tahun anggaran Bankeu ditulis sebagai data, bukan tiga blok markup kembar —
// menambah tahun berikutnya cukup satu baris di sini.
const TAHUN_BANKEU = [
	{ tahun: 2025, icon: DollarSign, keterangan: 'Penyaluran T1 & T2 + LPJ', accent: '#2a78d6' },
	{ tahun: 2026, icon: ShieldCheck, keterangan: 'Verifikasi proposal', accent: '#1baf7a' },
	{ tahun: 2027, icon: BadgeCheck, keterangan: 'Verifikasi proposal', accent: '#4a3aa7' },
];

const TABS = [
	{ id: 'overview', label: 'Ikhtisar', icon: BarChart3 },
	{ id: 'bumdes', label: 'BUMDes', icon: Building2 },
	{ id: 'bankeu', label: 'Bantuan Keuangan', icon: DollarSign },
	{ id: 'bankeu-perubahan', label: 'Bankeu Perubahan', icon: DollarSign },
	{ id: 'bantuan-provinsi-lpj', label: 'LPJ Bantuan Provinsi', icon: FileText },
	{ id: 'hari-libur', label: 'Hari Libur', icon: CalendarOff },
	{ id: 'activity', label: 'Aktivitas', icon: Activity },
];

const SUB_BUMDES = [
	{ id: 'dashboard', label: 'Dashboard' },
	{ id: 'form', label: 'Tambah Data' },
	{ id: 'dokumen', label: 'Dokumen' },
];

const SUB_BANKEU_2025 = [
	{ id: 'penyaluran', label: 'Penyaluran T1 & T2' },
	{ id: 'lpj', label: 'LPJ Bantuan Keuangan' },
];

const OPSI_AKTIVITAS = [
	{ value: 'all', label: 'Semua Aktivitas' },
	{ value: 'bumdes', label: 'BUMDes' },
	{ value: 'bankeu', label: 'Bantuan Keuangan' },
];

/** Pembungkus panel modul yang dimuat malas (lazy). */
const PanelModul = ({ children }) => (
	<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
		<Suspense fallback={<LoadingFallback />}>{children}</Suspense>
	</div>
);

const SpkedPage = () => {
	const navigate = useNavigate();
	const { getPath } = useBidangPath();
	const { user } = useAuth();
	const isBendahara = user?.role === 'bendahara' || user?.role === 'superadmin';
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState(null);
	const [activeTab, setActiveTab] = useState('overview');
	const [bumdesView, setBumdesView] = useState('dashboard');
	const [bankeuYear, setBankeuYear] = useState(null); // null = layar pilih tahun
	const [bankeu2025View, setBankeu2025View] = useState('penyaluran');

	// Activity logs state
	const [activityLogs, setActivityLogs] = useState([]);
	const [activityLoading, setActivityLoading] = useState(false);
	const [activityFilter, setActivityFilter] = useState('all');

	// Ref to prevent duplicate logs
	const loggedRef = useRef({ dashboard: false });

	useEffect(() => {
		fetchDashboard();
	}, []);

	// Fetch activity logs when activity tab is active
	useEffect(() => {
		if (activeTab === 'activity') {
			fetchActivityLogs();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeTab, activityFilter]);

	const fetchDashboard = async () => {
		try {
			setLoading(true);
			const response = await api.get('/bidang/3/dashboard');
			if (response.data.success) {
				setData(response.data.data);
				loggedRef.current.dashboard = true;
			}
		} catch (error) {
			console.error('[SpkedPage] Error fetching dashboard:', error);
			toast.error(error.response?.data?.message || 'Gagal memuat data bidang');
		} finally {
			setLoading(false);
		}
	};

	const fetchActivityLogs = async () => {
		try {
			setActivityLoading(true);
			const params = {};
			if (activityFilter !== 'all') {
				params.module = activityFilter;
			}

			const response = await api.get('/bidang/3/activity-logs', { params });
			if (response.data.success) {
				setActivityLogs(response.data.data || []);
			}
		} catch (error) {
			console.error('[SpkedPage] Error fetching activity logs:', error);
			toast.error('Gagal memuat aktivitas');
		} finally {
			setActivityLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50">
				<PanelMemuat pesan="Memuat data bidang…" />
			</div>
		);
	}

	const stats = data?.stats || {};
	const persenAktif = stats.total_bumdes
		? Math.round(((stats.active_bumdes || 0) / stats.total_bumdes) * 100)
		: null;

	return (
		<div className="min-h-screen bg-slate-50">
			<div
				className={`mx-auto space-y-6 px-4 py-6 sm:px-6 lg:px-8 ${
					activeTab === 'bankeu-perubahan' ? 'max-w-[1800px]' : 'max-w-7xl'
				}`}
			>
				<BidangHeader
					slug="spked"
					icon={Hammer}
					deskripsi="Bantuan Keuangan desa dari proposal sampai LPJ, Bankeu Perubahan, dan pembinaan BUMDes."
				>
					<StatChip label="BUMDes" value={angka(stats.total_bumdes)} />
					<StatChip label="Unit usaha" value={angka(stats.total_unit_usaha)} />
					<StatChip label="Data Bankeu" value={angka(stats.total_bankeu)} />
				</BidangHeader>

				<TabBar
					tabs={TABS}
					aktif={activeTab}
					onPilih={(id) => {
						setActiveTab(id);
						if (id === 'bankeu') {
							setBankeuYear(null);
							setBankeu2025View('penyaluran');
						}
					}}
				/>

				{/* ---------- Ikhtisar ---------- */}
				{activeTab === 'overview' && (
					<div key="overview" className="animate-fadeIn space-y-6">
						{/* Empat angka, bukan tiga: status aktif/tidak aktif BUMDes sudah
						    dikirim API tapi selama ini tidak pernah ditampilkan. */}
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
							<StatTile
								icon={Building2}
								label="Total BUMDes"
								value={angka(stats.total_bumdes)}
								caption="terdata di sistem"
								accent={AKSEN}
							/>
							<StatTile
								icon={CheckCircle2}
								label="BUMDes Aktif"
								value={angka(stats.active_bumdes)}
								caption={persenAktif === null ? 'belum ada data' : `${persenAktif}% dari yang terdata`}
								accent="#1baf7a"
							/>
							<StatTile
								icon={XCircle}
								label="Tidak Aktif"
								value={angka(stats.inactive_bumdes)}
								caption="perlu pembinaan"
								accent="#e34948"
							/>
							<StatTile
								icon={TrendingUp}
								label="Unit Usaha"
								value={angka(stats.total_unit_usaha)}
								caption="dari seluruh BUMDes"
								accent="#2a78d6"
							/>
						</div>

						<div>
							<h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Aksi Cepat</h2>
							<div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
								<AksiCard
									icon={Building2}
									judul="Kelola BUMDes"
									deskripsi="Data BUMDes, unit usaha, dan dokumen badan hukum"
									accent={AKSEN}
									onClick={() => setActiveTab('bumdes')}
								/>
								<AksiCard
									icon={DollarSign}
									judul="Bantuan Keuangan"
									deskripsi="Verifikasi proposal, penyaluran, dan LPJ per tahun anggaran"
									accent="#2a78d6"
									onClick={() => {
										setActiveTab('bankeu');
										setBankeuYear(null);
									}}
								/>
								<AksiCard
									icon={HardDrive}
									judul="Drive Bidang"
									deskripsi="Penyimpanan berkas internal bidang, bisa dibagikan ke bidang lain"
									accent="#475569"
									onClick={() => navigate(getPath('/bidang/spked/drive'))}
								/>
							</div>
						</div>

						{/* Anggaran — hanya tampil untuk Bendahara */}
						{isBendahara && <AnggaranBidangSection bidangId={3} />}
					</div>
				)}

				{/* ---------- BUMDes ---------- */}
				{activeTab === 'bumdes' && (
					<div key="bumdes" className="animate-fadeIn">
						<PanelModul>
							<SubTabs items={SUB_BUMDES} aktif={bumdesView} onPilih={setBumdesView} />
							<div className="p-5">
								{bumdesView === 'dashboard' && <BumdesDashboardModern />}
								{bumdesView === 'form' && <BumdesForm onSwitchToDashboard={() => setBumdesView('dashboard')} />}
								{bumdesView === 'dokumen' && <BumdesDokumenManager />}
							</div>
						</PanelModul>
					</div>
				)}

				{/* ---------- Bantuan Keuangan ---------- */}
				{activeTab === 'bankeu' && (
					<div key="bankeu" className="animate-fadeIn">
						{!bankeuYear ? (
							<div>
								<h2 className="text-lg font-bold text-slate-900">Bantuan Keuangan</h2>
								<p className="mt-0.5 text-sm text-slate-500">Pilih tahun anggaran yang ingin dibuka.</p>
								<div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
									{TAHUN_BANKEU.map((item) => {
										const Icon = item.icon;
										return (
											<button
												key={item.tahun}
												onClick={() => setBankeuYear(item.tahun)}
												className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
											>
												<span
													className="absolute inset-y-0 left-0 w-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
													style={{ backgroundColor: item.accent }}
												/>
												<span
													className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105"
													style={{ backgroundColor: `${item.accent}1a`, color: item.accent }}
												>
													<Icon className="h-6 w-6" />
												</span>
												<span className="min-w-0 flex-1">
													<span className="block text-lg font-bold tabular-nums text-slate-900">
														TA {item.tahun}
													</span>
													<span className="mt-0.5 block text-xs text-slate-500">{item.keterangan}</span>
												</span>
												<ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-slate-500" />
											</button>
										);
									})}
								</div>
							</div>
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
											{bankeu2025View === 'penyaluran' ? (
												<BankeuDashboard />
											) : (
												<BankeuLpjMonitoringPage tahun={2025} />
											)}
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
								tahun={2026}
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
