import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBidangPath } from '../../hooks/useBidangPath';
import {
	FileText,
	Mail,
	Plane,
	Users,
	Activity,
	ArrowLeft,
	Clock,
	ChevronRight,
	Calendar,
	Bell,
	Image,
	Newspaper,
	RefreshCw,
	ClipboardCheck,
	ClipboardList,
	IdCard,
	DollarSign,
	HardDrive,
	Package,
	LayoutGrid,
	Search,
	X,
	Lock,
} from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';
import { prolapOutputsPerBidang, jumlahOutputSiap } from '../../constants/prolapOutputs';
import DaftarPegawaiBidang from '../../components/bidang/DaftarPegawaiBidang';
import OptimizedLottie from '../../components/OptimizedLottie';
import movieLoadingAnimation from '../../assets/lottie/movie-loading.json';

// ============================================================
// Sub bagian & fitur
// ============================================================
// Warna identitas fitur disimpan sebagai satu nilai heksa (`accent`), bukan
// rangkaian kelas gradien. Alasannya dua: kelas Tailwind yang dirangkai dari
// variabel akan terbuang saat purge, dan satu nilai jauh lebih mudah dijaga
// konsistensinya daripada empat kelas per kartu.
const SUB_BAGIAN = [
	{
		key: 'umpeg',
		short: 'Umpeg',
		label: 'Umum & Kepegawaian',
		description: 'Persuratan, kepegawaian, sarana prasarana, dan operasional harian dinas.',
		icon: Users,
		accent: '#4a3aa7',
	},
	{
		key: 'prolap',
		short: 'Prolap',
		label: 'Program & Pelaporan',
		description: 'Rekap output kegiatan lintas bidang — apa yang sudah terbangun, di mana, dan berapa nilainya.',
		icon: ClipboardList,
		accent: '#eda100',
	},
];

const UMPEG_FEATURES = [
	{
		key: 'disposisi',
		title: 'Disposisi Surat',
		description: 'Kelola surat masuk & disposisi',
		icon: Mail,
		path: '/sekretariat/disposisi',
		accent: '#2a78d6',
	},
	{
		key: 'perjadin',
		title: 'Perjalanan Dinas',
		description: 'Kelola perjadin & tugas',
		icon: Plane,
		path: '/sekretariat/perjadin',
		accent: '#1baf7a',
	},
	{
		// Halaman ini mengelola AKUN (user, role, device absensi) — bukan data
		// kepegawaiannya. Dibedakan tegas dari kartu "Data Kepegawaian" di bawah
		// supaya tidak dikira fitur yang sama.
		key: 'pegawai',
		title: 'Manajemen Pengguna',
		description: 'Akun, role, & device absensi',
		icon: Users,
		path: '/sekretariat/pegawai',
		accent: '#4a3aa7',
	},
	{
		key: 'kepegawaian',
		title: 'Data Kepegawaian',
		description: 'NIP, pangkat, golongan, & jabatan ASN',
		icon: IdCard,
		path: '/sekretariat/kepegawaian',
		restricted: true,
		accent: '#b45309',
	},
	{
		key: 'jadwal-kegiatan',
		title: 'Jadwal Kegiatan',
		description: 'Kelola jadwal & agenda',
		icon: Calendar,
		path: '/sekretariat/jadwal-kegiatan',
		accent: '#8b5cf6',
	},
	{
		key: 'notifikasi',
		title: 'Kelola Notifikasi',
		description: 'Push notification & pengumuman',
		icon: Bell,
		path: '/sekretariat/notifikasi',
		restricted: true,
		accent: '#eb6834',
	},
	{
		key: 'informasi',
		title: 'Kelola Informasi',
		description: 'Banner informasi di dashboard',
		icon: Image,
		path: '/sekretariat/informasi',
		restricted: true,
		accent: '#0d9488',
	},
	{
		key: 'berita',
		title: 'Manajemen Berita',
		description: 'Publikasi artikel & lampiran PDF',
		icon: Newspaper,
		path: '/sekretariat/berita',
		restricted: true,
		accent: '#0284c7',
	},
	{
		key: 'absensi-management',
		title: 'Kelola Absensi',
		description: 'Rekap presensi & pengaturan jam kerja',
		icon: ClipboardCheck,
		path: '/sekretariat/absensi-management',
		restricted: true,
		accent: '#0891b2',
	},
	{
		key: 'video-meeting',
		title: 'Video Meeting',
		description: 'Rapat online & konferensi video',
		lottie: movieLoadingAnimation,
		path: '/sekretariat/video-meeting',
		restricted: true,
		accent: '#e11d48',
	},
	{
		key: 'anggaran',
		title: 'Anggaran Bidang',
		description: 'Program kegiatan & rincian RKA',
		icon: DollarSign,
		path: '/sekretariat/anggaran',
		accent: '#059669',
	},
	{
		key: 'arsip-barang',
		title: 'Arsip Barang',
		description: 'Inventaris aset & label QR',
		icon: Package,
		path: '/sekretariat/arsip-barang',
		accent: '#c026d3',
	},
	{
		key: 'drive',
		title: 'Drive Bidang',
		description: 'Penyimpanan berkas internal bidang',
		icon: HardDrive,
		path: '/sekretariat/drive',
		accent: '#475569',
	},
	{
		key: 'formulir',
		title: 'Formulir',
		description: 'Survei & pendataan, rekap jawaban otomatis',
		icon: ClipboardList,
		path: '/sekretariat/formulir',
		accent: '#475569',
	},
];

// Log aktivitas dulu ikut jadi kartu di dalam Umpeg lalu menimpa isinya. Kini
// ia tab tersendiri — sejajar, bukan tersembunyi satu tingkat di dalam.
const TABS = [
	{ key: 'ikhtisar', label: 'Ikhtisar', icon: LayoutGrid },
	{ key: 'umpeg', label: 'Umpeg', icon: Users },
	{ key: 'prolap', label: 'Prolap', icon: ClipboardList },
	{ key: 'aktivitas', label: 'Aktivitas', icon: Activity },
];

// ============================================================
// Potongan UI
// ============================================================
/** Ikon fitur: warna aksen di atas latar lembut warna yang sama. */
const IconChip = ({ icon: Icon, lottie, accent, size = 'md' }) => {
	const dimensi = size === 'lg' ? 'h-12 w-12' : 'h-11 w-11';
	const ikon = size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
	if (lottie) {
		return (
			<div
				role="img"
				aria-hidden="true"
				className={`${dimensi} shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-white`}
			>
				<OptimizedLottie animationData={lottie} className="h-full w-full scale-125" />
			</div>
		);
	}
	return (
		<div
			className={`${dimensi} shrink-0 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105`}
			style={{ backgroundColor: `${accent}1a`, color: accent }}
		>
			<Icon className={ikon} />
		</div>
	);
};

const FeatureCard = ({ feature, onClick }) => (
	<button
		onClick={onClick}
		className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
	>
		{/* Garis aksen tipis di tepi kiri — penanda identitas yang tidak berisik. */}
		<span
			className="absolute inset-y-0 left-0 w-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
			style={{ backgroundColor: feature.accent }}
		/>
		<IconChip icon={feature.icon} lottie={feature.lottie} accent={feature.accent} />
		<div className="min-w-0 flex-1">
			<h3 className="truncate text-sm font-bold text-slate-900">{feature.title}</h3>
			<p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">{feature.description}</p>
		</div>
		<ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-slate-500" />
	</button>
);

/**
 * Output yang sudah dipetakan tapi datanya belum layak ditampilkan. Sengaja
 * tetap muncul — beserta alasannya — supaya terlihat sudah dipikirkan, bukan
 * terlewat.
 */
const OutputBelumSiapCard = ({ output }) => {
	const Icon = output.icon;
	return (
		<div className="flex items-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4">
			<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
				<Icon className="h-5 w-5" />
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<h3 className="truncate text-sm font-bold text-slate-500">{output.title}</h3>
					<span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
						Belum siap
					</span>
				</div>
				<p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-400">
					{output.alasan || output.description}
				</p>
			</div>
			<Lock className="h-4 w-4 shrink-0 text-slate-300" />
		</div>
	);
};

const SubBagianCard = ({ sub, count, onClick }) => (
	<button
		onClick={onClick}
		className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
	>
		{/* Cahaya lembut di sudut, memakai warna sub bagian. Sangat tipis supaya
		    tetap jadi latar, bukan hiasan yang bersaing dengan isinya. */}
		<span
			className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-[0.07] blur-2xl transition-opacity duration-300 group-hover:opacity-[0.14]"
			style={{ backgroundColor: sub.accent }}
		/>
		<div className="relative flex items-start gap-4">
			<IconChip icon={sub.icon} accent={sub.accent} size="lg" />
			<div className="min-w-0 flex-1">
				<p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Sub Bagian</p>
				<h3 className="mt-0.5 text-lg font-bold text-slate-900">{sub.short}</h3>
				<p className="text-sm text-slate-500">{sub.label}</p>
			</div>
			<ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-slate-500" />
		</div>
		<p className="relative mt-4 text-sm leading-relaxed text-slate-500">{sub.description}</p>
		{/* Identitas warna dibawa titik, bukan warna teksnya: aksen terang seperti
		    amber tidak cukup kontras dipakai sebagai warna huruf. */}
		<span className="relative mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
			<span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sub.accent }} />
			{count === 0 ? 'Belum ada fitur' : `${count} fitur`}
		</span>
	</button>
);

const StatChip = ({ label, value }) => (
	<div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2">
		<p className="text-lg font-bold leading-none tabular-nums text-slate-900">{value}</p>
		<p className="mt-1 text-[11px] font-medium text-slate-500">{label}</p>
	</div>
);

const KotakCari = ({ nilai, onChange, placeholder }) => (
	<div className="relative w-full sm:w-72">
		<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
		<input
			value={nilai}
			onChange={(event) => onChange(event.target.value)}
			placeholder={placeholder}
			className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm text-slate-700 transition-colors focus:border-slate-900 focus:outline-none"
		/>
		{nilai && (
			<button
				onClick={() => onChange('')}
				aria-label="Hapus pencarian"
				className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
			>
				<X className="h-3.5 w-3.5" />
			</button>
		)}
	</div>
);

const TanpaHasil = ({ kata }) => (
	<div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 py-12 text-center">
		<Search className="mx-auto h-8 w-8 text-slate-300" />
		<p className="mt-3 text-sm font-medium text-slate-600">Tidak ada yang cocok dengan “{kata}”</p>
		<p className="mt-1 text-xs text-slate-400">Coba kata lain, atau kosongkan pencarian.</p>
	</div>
);

// ============================================================
// Halaman
// ============================================================
const SekretariatPage = () => {
	const navigate = useNavigate();
	const { getPath } = useBidangPath();
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState('ikhtisar');
	const [activityLogs, setActivityLogs] = useState([]);
	const [activityLoading, setActivityLoading] = useState(false);
	const [activityFilter, setActivityFilter] = useState('all');
	const [cari, setCari] = useState('');
	const user = JSON.parse(localStorage.getItem('user') || '{}');

	const canManage = user?.role === 'superadmin' || Number(user?.bidang_id) === 2;

	const umpegFeatures = useMemo(
		() => UMPEG_FEATURES.filter((feature) => !feature.restricted || canManage),
		[canManage]
	);

	const kelompokOutput = useMemo(() => prolapOutputsPerBidang(), []);

	// Hanya output yang datanya sudah layak tampil ikut dihitung.
	const featureCount = useMemo(
		() => ({ umpeg: umpegFeatures.length, prolap: jumlahOutputSiap() }),
		[umpegFeatures]
	);

	const cocok = (teks) => String(teks || '').toLowerCase().includes(cari.trim().toLowerCase());

	const umpegTersaring = useMemo(() => {
		if (!cari.trim()) return umpegFeatures;
		return umpegFeatures.filter((feature) => cocok(feature.title) || cocok(feature.description));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [umpegFeatures, cari]);

	const outputTersaring = useMemo(() => {
		if (!cari.trim()) return kelompokOutput;
		return kelompokOutput
			.map((bidang) => ({
				...bidang,
				outputs: bidang.outputs.filter(
					(output) => cocok(output.title) || cocok(output.description) || cocok(bidang.short)
				),
			}))
			.filter((bidang) => bidang.outputs.length > 0);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [kelompokOutput, cari]);

	useEffect(() => {
		fetchDashboard();
	}, []);

	// Fetch activity logs when activity tab is active
	useEffect(() => {
		if (activeTab === 'aktivitas') {
			fetchActivityLogs();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeTab, activityFilter]);

	// Pencarian hanya bermakna di daftar fitur; jangan terbawa antar tab.
	useEffect(() => {
		setCari('');
	}, [activeTab]);

	// Dipanggil untuk menahan tampilan sampai data bidang siap (dan memunculkan
	// toast kalau aksesnya bermasalah); isinya sendiri tidak dirender di sini.
	const fetchDashboard = async () => {
		try {
			setLoading(true);
			await api.get('/bidang/2/dashboard');
		} catch (error) {
			console.error('Error fetching dashboard:', error);
			toast.error('Gagal memuat data bidang');
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

			const response = await api.get('/bidang/2/activity-logs', { params });

			if (response.data.success) {
				setActivityLogs(response.data.data || []);
			}
		} catch (error) {
			console.error('Error fetching activity logs:', error);
			toast.error('Gagal memuat aktivitas');
		} finally {
			setActivityLoading(false);
		}
	};

	const openFeature = (feature) => {
		// Disposisi punya jalur sendiri untuk pimpinan.
		if (feature.key === 'disposisi' && ['kepala_dinas', 'sekretaris_dinas'].includes(user.role)) {
			navigate('/dpmd/disposisi');
			return;
		}
		navigate(getPath(feature.path));
	};

	const getActionColor = (action) => {
		const colors = {
			create: 'text-emerald-700 bg-emerald-50',
			update: 'text-blue-700 bg-blue-50',
			delete: 'text-red-700 bg-red-50',
			approve: 'text-violet-700 bg-violet-50',
			reject: 'text-orange-700 bg-orange-50',
			upload: 'text-teal-700 bg-teal-50',
			download: 'text-slate-700 bg-slate-100',
		};
		return colors[action] || 'text-slate-700 bg-slate-100';
	};

	const formatTime = (dateString) => {
		const date = new Date(dateString);
		const now = new Date();
		const diff = Math.floor((now - date) / 1000); // seconds

		if (diff < 60) return 'Baru saja';
		if (diff < 3600) return `${Math.floor(diff / 60)} menit yang lalu`;
		if (diff < 86400) return `${Math.floor(diff / 3600)} jam yang lalu`;
		if (diff < 604800) return `${Math.floor(diff / 86400)} hari yang lalu`;

		return date.toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		});
	};

	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50">
				<div className="flex items-center gap-3 text-slate-500">
					<RefreshCw className="h-5 w-5 animate-spin" />
					<span className="text-sm font-medium">Memuat data bidang…</span>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-slate-50">
			<div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
				{/* ---------- Kepala ---------- */}
				<div>
					<button
						onClick={() => navigate(-1)}
						className="mb-3 flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-900"
					>
						<ArrowLeft className="h-4 w-4" />
						Kembali
					</button>

					<div className="flex flex-wrap items-start justify-between gap-4">
						<div className="flex items-start gap-4">
							<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
								<FileText className="h-6 w-6" />
							</div>
							<div>
								<h1 className="text-2xl font-bold tracking-tight text-slate-900">Bidang Sekretariat</h1>
								<p className="mt-1 max-w-2xl text-sm text-slate-500">
									Umum &amp; Kepegawaian (Umpeg) untuk operasional harian, Program &amp; Pelaporan (Prolap) untuk
									rekap output lintas bidang.
								</p>
							</div>
						</div>
						<div className="flex gap-2.5">
							<StatChip label="Fitur Umpeg" value={featureCount.umpeg} />
							<StatChip label="Output siap" value={featureCount.prolap} />
							<StatChip label="Sub bagian" value={SUB_BAGIAN.length} />
						</div>
					</div>
				</div>

				{/* ---------- Tab ---------- */}
				{/* Menggantikan pola turun-naik dengan tombol "kembali ke sub bagian":
				    keempat bagian kini sejajar dan bisa dilompati langsung. */}
				<div className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
					{TABS.map((tab) => {
						const Icon = tab.icon;
						const aktif = activeTab === tab.key;
						return (
							<button
								key={tab.key}
								onClick={() => setActiveTab(tab.key)}
								aria-current={aktif ? 'page' : undefined}
								className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
									aktif
										? 'bg-slate-900 text-white shadow-sm'
										: 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
								}`}
							>
								<Icon className="h-4 w-4" />
								{tab.label}
							</button>
						);
					})}
				</div>

				{/* ---------- Ikhtisar ---------- */}
				{activeTab === 'ikhtisar' && (
					<div key="ikhtisar" className="animate-fadeIn space-y-6">
						<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
							{SUB_BAGIAN.map((sub) => (
								<SubBagianCard
									key={sub.key}
									sub={sub}
									count={featureCount[sub.key]}
									onClick={() => setActiveTab(sub.key)}
								/>
							))}
						</div>
						<DaftarPegawaiBidang bidangId={2} bidangName="Bidang Sekretariat" />
					</div>
				)}

				{/* ---------- Umpeg ---------- */}
				{activeTab === 'umpeg' && (
					<div key="umpeg" className="animate-fadeIn space-y-4">
						<div className="flex flex-wrap items-end justify-between gap-3">
							<div>
								<h2 className="text-lg font-bold text-slate-900">Umum &amp; Kepegawaian</h2>
								<p className="mt-0.5 text-sm text-slate-500">
									{umpegTersaring.length === umpegFeatures.length
										? `${umpegFeatures.length} fitur operasional harian`
										: `${umpegTersaring.length} dari ${umpegFeatures.length} fitur`}
								</p>
							</div>
							<KotakCari nilai={cari} onChange={setCari} placeholder="Cari fitur…" />
						</div>

						{umpegTersaring.length === 0 ? (
							<TanpaHasil kata={cari} />
						) : (
							<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
								{umpegTersaring.map((feature) => (
									<FeatureCard key={feature.key} feature={feature} onClick={() => openFeature(feature)} />
								))}
							</div>
						)}
					</div>
				)}

				{/* ---------- Prolap ---------- */}
				{activeTab === 'prolap' && (
					<div key="prolap" className="animate-fadeIn space-y-6">
						<div className="flex flex-wrap items-end justify-between gap-3">
							<div>
								<h2 className="text-lg font-bold text-slate-900">Program &amp; Pelaporan</h2>
								<p className="mt-0.5 max-w-2xl text-sm text-slate-500">
									Prolap hanya merekap — outputnya tetap milik bidang masing-masing, jadi daftarnya dikelompokkan
									menurut bidang pemiliknya.
								</p>
							</div>
							<KotakCari nilai={cari} onChange={setCari} placeholder="Cari output…" />
						</div>

						{outputTersaring.length === 0 ? (
							<TanpaHasil kata={cari} />
						) : (
							<div className="space-y-7">
								{outputTersaring.map((bidang) => (
									<div key={bidang.key}>
										<div className="mb-3 flex items-center gap-3">
											<span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
												<span
													className="h-1.5 w-1.5 rounded-full"
													style={{ backgroundColor: bidang.accent }}
												/>
												{bidang.short}
											</span>
											<span className="truncate text-sm text-slate-500">{bidang.label}</span>
											<span className="hidden h-px flex-1 bg-slate-200 sm:block" />
											<span className="shrink-0 text-xs tabular-nums text-slate-400">
												{bidang.outputs.filter((output) => output.siap).length}/{bidang.outputs.length} siap
											</span>
										</div>
										<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
											{bidang.outputs.map((output) =>
												output.siap ? (
													<FeatureCard key={output.key} feature={output} onClick={() => openFeature(output)} />
												) : (
													<OutputBelumSiapCard key={output.key} output={output} />
												)
											)}
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				)}

				{/* ---------- Aktivitas ---------- */}
				{activeTab === 'aktivitas' && (
					<div key="aktivitas" className="animate-fadeIn space-y-4">
						<div className="flex flex-wrap items-end justify-between gap-3">
							<div>
								<h2 className="text-lg font-bold text-slate-900">Log Aktivitas</h2>
								<p className="mt-0.5 text-sm text-slate-500">
									{activityLogs.length > 0 ? `${activityLogs.length} aktivitas terkini` : 'Aktivitas terkini bidang'}
								</p>
							</div>
							<div className="flex items-center gap-2">
								<select
									value={activityFilter}
									onChange={(event) => setActivityFilter(event.target.value)}
									className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:border-slate-900 focus:outline-none"
								>
									<option value="all">Semua Modul</option>
									<option value="disposisi">Disposisi</option>
									<option value="perjadin">Perjalanan Dinas</option>
									<option value="pegawai">Pegawai</option>
								</select>
								<button
									onClick={fetchActivityLogs}
									disabled={activityLoading}
									className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
								>
									<RefreshCw className={`h-4 w-4 ${activityLoading ? 'animate-spin' : ''}`} />
									Perbarui
								</button>
							</div>
						</div>

						<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
							{activityLoading ? (
								<div className="flex items-center justify-center gap-3 py-16 text-slate-500">
									<RefreshCw className="h-5 w-5 animate-spin" />
									<span className="text-sm font-medium">Memuat aktivitas…</span>
								</div>
							) : activityLogs.length === 0 ? (
								<div className="py-16 text-center">
									<Activity className="mx-auto h-8 w-8 text-slate-300" />
									<p className="mt-3 text-sm font-medium text-slate-600">Belum ada aktivitas</p>
									<p className="mt-1 text-xs text-slate-400">
										Aktivitas akan muncul di sini setelah ada perubahan data di modul bidang.
									</p>
								</div>
							) : (
								<div className="divide-y divide-slate-100">
									{activityLogs.map((log) => (
										<div key={log.id} className="flex gap-4 p-4 transition-colors hover:bg-slate-50">
											<div
												className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold uppercase ${getActionColor(
													log.action
												)}`}
											>
												{log.action.substring(0, 2)}
											</div>
											<div className="min-w-0 flex-1">
												<p className="text-sm font-medium text-slate-800">{log.description}</p>
												<div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
													<span className="font-medium text-slate-600">{log.userName}</span>
													<span className="text-slate-300">•</span>
													<span className="capitalize">{log.module}</span>
													<span className="text-slate-300">•</span>
													<span className="flex items-center gap-1">
														<Clock className="h-3 w-3" />
														{formatTime(log.createdAt)}
													</span>
												</div>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default SekretariatPage;
