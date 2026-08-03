import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
	Users,
	Search,
	SlidersHorizontal,
	RefreshCw,
	MapPin,
	Briefcase,
	Loader2,
	UserCircle,
	Building2,
	CheckCircle2,
	XCircle,
	Eye,
	Database,
	FileText,
	Shield,
	X,
	ChevronLeft,
	ChevronRight,
	GraduationCap,
	CalendarDays,
	IdCard,
	Info,
	ChevronDown,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';
import api from '../../../api';
import toast from 'react-hot-toast';

// ============================================================
// Palet chart (tervalidasi CVD — jangan diganti asal)
// blue = slot 1, orange = slot 2, aqua = slot 3, violet = slot 7
// ============================================================
const GENDER_COLORS = ['#2a78d6', '#eb6834'];
const AGE_RAMP = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281'];
const EDU_COLOR = '#1baf7a';
const DONUT_SIZE = 192; // px — harus sama dengan h-48/w-48 pada wrapper donut

const fmt = (n) => Number(n ?? 0).toLocaleString('id-ID');
const pct = (value, total) => (total > 0 ? Math.round((Number(value ?? 0) / total) * 1000) / 10 : 0);

const formatDate = (dateStr) => {
	if (!dateStr) return '-';
	return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const isBpd = (jabatan = '') => {
	const jab = String(jabatan).toLowerCase();
	return jab.includes('bpd') || jab.includes('badan permusyawaratan');
};

const AVATAR_TONES = [
	'bg-blue-100 text-blue-700',
	'bg-teal-100 text-teal-700',
	'bg-violet-100 text-violet-700',
	'bg-amber-100 text-amber-700',
	'bg-rose-100 text-rose-700',
	'bg-emerald-100 text-emerald-700',
];

const initialsOf = (name = '') =>
	String(name)
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((word) => word[0] || '')
		.join('')
		.toUpperCase() || '?';

const toneOf = (name = '') => {
	let hash = 0;
	for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 997;
	return AVATAR_TONES[hash % AVATAR_TONES.length];
};

const getBaseHost = () => {
	const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';
	return apiBase.replace(/\/?api\/?$/, '');
};

const pasFotoUrl = (person) =>
	person?.file_pas_foto ? `${getBaseHost()}/uploads/aparatur_desa_files/${person.file_pas_foto}` : null;

// ============================================================
// Blok UI kecil
// ============================================================
const StatCard = ({ label, value, hint, icon: Icon, iconClass, share, barClass }) => (
	<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
		<div className="flex items-start justify-between gap-3">
			<div className="min-w-0">
				<p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
				<p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{value}</p>
				{hint && <p className="mt-1 truncate text-xs text-slate-500">{hint}</p>}
			</div>
			<span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
				<Icon className="h-5 w-5" />
			</span>
		</div>
		{typeof share === 'number' && (
			<div className="mt-3">
				<div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
					<div className={`h-full rounded-full ${barClass}`} style={{ width: `${Math.min(share, 100)}%` }} />
				</div>
				<p className="mt-1.5 text-[11px] font-medium text-slate-500">{share}% dari total aparatur</p>
			</div>
		)}
	</div>
);

const ChartCard = ({ title, subtitle, children, actions, className = '' }) => (
	<div className={`flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
		<div className="mb-4 flex items-start justify-between gap-3">
			<div>
				<h3 className="text-sm font-semibold text-slate-900">{title}</h3>
				{subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
			</div>
			{actions}
		</div>
		<div className="flex flex-1 flex-col justify-center">{children}</div>
	</div>
);

const EmptyChart = ({ message = 'Belum ada data' }) => (
	<div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-center">
		<Info className="mb-2 h-5 w-5 text-slate-300" />
		<p className="text-sm text-slate-400">{message}</p>
	</div>
);

/**
 * Bar chart horizontal berbasis HTML — label & nilai selalu terbaca,
 * tidak ada tabrakan teks seperti pie/legend recharts.
 */
const BarList = ({
	items = [],
	color,
	ramp,
	total,
	maxRows = 8,
	otherLabel = 'Lainnya',
	labelClass = 'w-24 sm:w-32',
}) => {
	const rows = useMemo(() => {
		if (!items.length) return [];
		if (items.length <= maxRows) return items;
		const head = items.slice(0, maxRows - 1);
		const restValue = items.slice(maxRows - 1).reduce((sum, item) => sum + Number(item.value ?? 0), 0);
		return [...head, { name: otherLabel, value: restValue, isOther: true }];
	}, [items, maxRows, otherLabel]);

	const max = useMemo(() => Math.max(1, ...rows.map((row) => Number(row.value ?? 0))), [rows]);
	const sum = total ?? rows.reduce((acc, row) => acc + Number(row.value ?? 0), 0);

	if (!rows.length) return <EmptyChart />;

	return (
		<div className="space-y-2">
			{rows.map((row, index) => {
				const value = Number(row.value ?? 0);
				const share = pct(value, sum);
				const fill = row.isOther ? '#94a3b8' : ramp ? ramp[index % ramp.length] : color;

				return (
					<div
						key={row.name}
						title={`${row.name}: ${fmt(value)} orang (${share}%)`}
						className="group flex items-center gap-3 rounded-lg px-1.5 py-1 transition-colors hover:bg-slate-50"
					>
						<span className={`${labelClass} shrink-0 truncate text-xs font-medium text-slate-600`} title={row.name}>
							{row.name}
						</span>
						<div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
							<div
								className="h-full rounded-full transition-[width] duration-500"
								style={{ width: `${Math.max((value / max) * 100, value > 0 ? 3 : 0)}%`, backgroundColor: fill }}
							/>
						</div>
						<span className="w-20 shrink-0 text-right text-xs tabular-nums text-slate-700">
							<span className="font-semibold">{fmt(value)}</span>
							<span className="ml-1 text-slate-400">{share}%</span>
						</span>
					</div>
				);
			})}
		</div>
	);
};

const GenderDonut = ({ lakiLaki = 0, perempuan = 0 }) => {
	const total = Number(lakiLaki) + Number(perempuan);
	const data = [
		{ name: 'Laki-laki', value: Number(lakiLaki) },
		{ name: 'Perempuan', value: Number(perempuan) },
	];

	if (total === 0) return <EmptyChart />;

	return (
		<div className="flex flex-col items-center gap-4">
			{/* Ukuran SVG dipatok (bukan ResponsiveContainer) supaya donut tidak pernah
			    terpotong saat recharts salah mengukur tinggi kontainer flex. */}
			<div className="relative h-48 w-48 shrink-0">
				<PieChart width={DONUT_SIZE} height={DONUT_SIZE} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
					<Pie
						data={data}
						cx="50%"
						cy="50%"
						innerRadius={56}
						outerRadius={84}
						paddingAngle={2}
						dataKey="value"
						stroke="#ffffff"
						strokeWidth={2}
					>
						{GENDER_COLORS.map((color) => (
							<Cell key={color} fill={color} />
						))}
					</Pie>
					<RechartsTooltip
						formatter={(value, name) => [`${fmt(value)} orang (${pct(value, total)}%)`, name]}
						contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
					/>
				</PieChart>
				<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
					<span className="text-xl font-bold text-slate-900">{fmt(total)}</span>
					<span className="text-[11px] text-slate-500">aparatur</span>
				</div>
			</div>

			<div className="w-full max-w-sm space-y-2">
				{data.map((item, index) => (
					<div key={item.name} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50">
						<span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: GENDER_COLORS[index] }} />
						<span className="flex-1 text-sm text-slate-600">{item.name}</span>
						<span className="text-sm font-semibold tabular-nums text-slate-900">{fmt(item.value)}</span>
						<span className="w-12 text-right text-xs tabular-nums text-slate-400">{pct(item.value, total)}%</span>
					</div>
				))}
			</div>
		</div>
	);
};

const TableSkeleton = ({ rows = 6 }) => (
	<div className="divide-y divide-slate-100">
		{Array.from({ length: rows }).map((_, index) => (
			<div key={index} className="flex items-center gap-4 px-5 py-4">
				<div className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
				<div className="flex-1 space-y-2">
					<div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
					<div className="h-2.5 w-24 animate-pulse rounded bg-slate-100" />
				</div>
				<div className="hidden h-6 w-28 animate-pulse rounded-full bg-slate-100 md:block" />
				<div className="hidden h-3 w-32 animate-pulse rounded bg-slate-100 lg:block" />
				<div className="h-6 w-16 animate-pulse rounded-full bg-slate-100" />
			</div>
		))}
	</div>
);

const StatusBadge = ({ status }) => {
	const aktif = status === 'Aktif';
	return (
		<span
			className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
				aktif ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
			}`}
		>
			{aktif ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
			{aktif ? 'Aktif' : 'Tidak Aktif'}
		</span>
	);
};

const JabatanBadge = ({ jabatan }) => (
	<span
		className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
			isBpd(jabatan) ? 'bg-violet-50 text-violet-700' : 'bg-teal-50 text-teal-700'
		}`}
		title={jabatan}
	>
		<Briefcase className="h-3 w-3 shrink-0" />
		<span className="truncate">{jabatan || '-'}</span>
	</span>
);

/** Foto pas kalau ada, kalau tidak inisial berwarna. */
const Avatar = ({ person, className = 'h-10 w-10 text-sm' }) => {
	const [broken, setBroken] = useState(false);
	const name = person?.nama_lengkap || '';
	const src = broken ? null : pasFotoUrl(person);

	if (src) {
		return (
			<img
				src={src}
				alt={name}
				loading="lazy"
				onError={() => setBroken(true)}
				className={`${className} shrink-0 rounded-full object-cover object-top ring-1 ring-slate-200`}
			/>
		);
	}

	return (
		<div className={`flex ${className} shrink-0 items-center justify-center rounded-full font-bold ${toneOf(name)}`}>
			{initialsOf(name)}
		</div>
	);
};

// ============================================================
// Modal detail
// ============================================================
const DetailField = ({ label, value }) => (
	<div>
		<p className="text-xs text-slate-500">{label}</p>
		<p className="mt-0.5 break-words text-sm font-medium text-slate-900">{value || '-'}</p>
	</div>
);

const DetailSection = ({ title, icon: Icon, children, className = '' }) => (
	<div className={`rounded-2xl border border-slate-200 bg-slate-50/70 p-4 ${className}`}>
		<h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
			<Icon className="h-4 w-4 text-slate-400" />
			{title}
		</h4>
		{children}
	</div>
);

const DetailModal = ({ aparatur, onClose }) => {
	useEffect(() => {
		const onKey = (event) => {
			if (event.key === 'Escape') onClose();
		};
		document.addEventListener('keydown', onKey);
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.removeEventListener('keydown', onKey);
			document.body.style.overflow = previousOverflow;
		};
	}, [onClose]);

	if (!aparatur) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
			onClick={onClose}
			role="presentation"
		>
			<div
				className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
				onClick={(event) => event.stopPropagation()}
				role="dialog"
				aria-modal="true"
				aria-label="Detail aparatur desa"
			>
				<button
					onClick={onClose}
					className="absolute right-4 top-4 z-20 rounded-full bg-black/20 p-2 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/30 hover:text-white"
					aria-label="Tutup"
				>
					<X className="h-5 w-5" />
				</button>

				{/* Body (header profil ikut ter-scroll supaya muat di layar kecil) */}
				<div className="flex-1 overflow-y-auto">
					{/* --- Kartu profil --- */}
					<div className="relative">
						<div className="relative h-32 overflow-hidden bg-gradient-to-br from-teal-700 via-emerald-700 to-slate-800">
							<div className="absolute -right-6 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
							<div className="absolute -bottom-8 left-8 h-28 w-28 rounded-full bg-cyan-300/20 blur-2xl" />
							<svg
								viewBox="0 0 500 40"
								preserveAspectRatio="none"
								className="absolute inset-x-0 bottom-0 h-7 w-full"
								aria-hidden="true"
							>
								<path d="M0,22 C130,46 340,-6 500,18 L500,40 L0,40 Z" fill="#ffffff" />
							</svg>
						</div>

						{/* relative z-10 wajib: wave & blob di banner itu absolute, tanpa ini
						    mereka menimpa separuh atas foto (avatar static = layer bawah). */}
						<div className="relative z-10 flex flex-col items-center px-6 pb-5 text-center">
							<Avatar
								person={aparatur}
								className="-mt-16 h-28 w-28 text-3xl ring-4 ring-white shadow-xl"
							/>
							<h2 className="mt-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
								{aparatur.nama_lengkap}
							</h2>
							<div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
								<span
									className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
										isBpd(aparatur.jabatan) ? 'bg-violet-50 text-violet-700' : 'bg-teal-50 text-teal-700'
									}`}
								>
									<Briefcase className="h-3.5 w-3.5" />
									{aparatur.jabatan}
								</span>
								<span
									className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
										aparatur.status === 'Aktif' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
									}`}
								>
									{aparatur.status === 'Aktif' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
									{aparatur.status === 'Aktif' ? 'Aktif' : 'Tidak Aktif'}
								</span>
							</div>
							<p className="mt-2.5 inline-flex items-center gap-1.5 text-sm text-slate-500">
								<MapPin className="h-3.5 w-3.5 text-slate-400" />
								{aparatur.desas?.nama || '-'} &middot; Kec. {aparatur.desas?.kecamatans?.nama || '-'}
							</p>
						</div>
					</div>

					{/* --- Rincian --- */}
					<div className="space-y-4 px-5 pb-6 sm:px-6">
					<div className="grid gap-4 md:grid-cols-2">
						<DetailSection title="Data Pribadi" icon={UserCircle}>
							<div className="grid grid-cols-2 gap-3">
								<DetailField
									label="Jenis Kelamin"
									value={
										aparatur.jenis_kelamin === 'Laki_laki'
											? 'Laki-laki'
											: aparatur.jenis_kelamin === 'Perempuan'
											? 'Perempuan'
											: '-'
									}
								/>
								<DetailField label="Agama" value={aparatur.agama} />
								<DetailField label="Tempat Lahir" value={aparatur.tempat_lahir} />
								<DetailField label="Tanggal Lahir" value={formatDate(aparatur.tanggal_lahir)} />
								<DetailField label="Pendidikan Terakhir" value={aparatur.pendidikan_terakhir} />
							</div>
						</DetailSection>

						<DetailSection title="Lokasi Tugas" icon={MapPin}>
							<div className="grid grid-cols-2 gap-3">
								<DetailField label="Desa" value={aparatur.desas?.nama} />
								<DetailField label="Kecamatan" value={aparatur.desas?.kecamatans?.nama} />
							</div>
						</DetailSection>
					</div>

					<DetailSection title="Data Kepegawaian" icon={IdCard}>
						<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
							{aparatur.nipd && <DetailField label="NIPD" value={aparatur.nipd} />}
							{aparatur.niap && <DetailField label="NIAP" value={aparatur.niap} />}
							{aparatur.pangkat_golongan && <DetailField label="Pangkat/Golongan" value={aparatur.pangkat_golongan} />}
							<DetailField label="Tgl. Pengangkatan" value={formatDate(aparatur.tanggal_pengangkatan)} />
							<DetailField label="No. SK Pengangkatan" value={aparatur.nomor_sk_pengangkatan} />
							{aparatur.tanggal_pemberhentian && (
								<DetailField label="Tgl. Pemberhentian" value={formatDate(aparatur.tanggal_pemberhentian)} />
							)}
							{aparatur.nomor_sk_pemberhentian && (
								<DetailField label="No. SK Pemberhentian" value={aparatur.nomor_sk_pemberhentian} />
							)}
						</div>
						{aparatur.keterangan && (
							<div className="mt-3 border-t border-slate-200 pt-3">
								<DetailField label="Keterangan" value={aparatur.keterangan} />
							</div>
						)}
					</DetailSection>

					{(aparatur.bpjs_kesehatan_nomor || aparatur.bpjs_ketenagakerjaan_nomor) && (
						<DetailSection title="BPJS" icon={FileText}>
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								{aparatur.bpjs_kesehatan_nomor && (
									<DetailField label="BPJS Kesehatan" value={aparatur.bpjs_kesehatan_nomor} />
								)}
								{aparatur.bpjs_ketenagakerjaan_nomor && (
									<DetailField label="BPJS Ketenagakerjaan" value={aparatur.bpjs_ketenagakerjaan_nomor} />
								)}
							</div>
						</DetailSection>
					)}
					</div>
				</div>

				{/* Footer */}
				<div className="shrink-0 border-t border-slate-200 bg-white p-4">
					<button
						onClick={onClose}
						className="w-full rounded-xl bg-slate-900 px-4 py-2.5 font-medium text-white transition-colors hover:bg-slate-800"
					>
						Tutup
					</button>
				</div>
			</div>
		</div>
	);
};

// ============================================================
// Tab: Database Lokal
// ============================================================
const EMPTY_FILTERS = { search: '', kecamatan_id: '', desa_id: '', jabatan: '', jenis_kelamin: '', status: '' };

const DatabaseTab = ({ refreshKey = 0, onLoadingChange, onUpdated }) => {
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState([]);
	const [stats, setStats] = useState(null);
	const [statsLoading, setStatsLoading] = useState(true);
	const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1, totalItems: 0 });
	const [filters, setFilters] = useState(EMPTY_FILTERS);
	const [searchInput, setSearchInput] = useState('');
	const [kecamatanList, setKecamatanList] = useState([]);
	const [desaList, setDesaList] = useState([]);
	const [showFilters, setShowFilters] = useState(false);
	const [showSummary, setShowSummary] = useState(true);
	const [selectedAparatur, setSelectedAparatur] = useState(null);
	const isFirstRefresh = useRef(true);

	const fetchStats = useCallback(async () => {
		try {
			setStatsLoading(true);
			const response = await api.get('/pemdes/aparatur-desa/stats');
			if (response.data.success) setStats(response.data.data);
		} catch (error) {
			console.error('Failed to fetch stats:', error);
		} finally {
			setStatsLoading(false);
		}
	}, []);

	const fetchData = useCallback(async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams();
			Object.entries(filters).forEach(([key, value]) => {
				if (value) params.append(key, value);
			});
			params.append('page', pagination.page);
			params.append('limit', pagination.limit);

			const response = await api.get(`/pemdes/aparatur-desa?${params.toString()}`);
			if (response.data.success) {
				setData(response.data.data || []);
				if (response.data.meta) {
					setPagination((prev) => ({
						...prev,
						totalPages: response.data.meta.totalPages || 1,
						totalItems: response.data.meta.totalItems || 0,
					}));
				}
				onUpdated?.(new Date());
			}
		} catch (error) {
			console.error('Failed to fetch aparatur desa:', error);
			toast.error('Gagal memuat data aparatur desa');
		} finally {
			setLoading(false);
		}
	}, [filters, pagination.page, pagination.limit, onUpdated]);

	useEffect(() => {
		const fetchKecamatanList = async () => {
			try {
				const response = await api.get('/kecamatans');
				if (response.data.success) setKecamatanList(response.data.data || []);
			} catch (error) {
				console.error('Failed to fetch kecamatan:', error);
			}
		};
		fetchKecamatanList();
		fetchStats();
	}, [fetchStats]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	useEffect(() => {
		onLoadingChange?.(loading || statsLoading);
	}, [loading, statsLoading, onLoadingChange]);

	// Refresh dari header halaman
	useEffect(() => {
		if (isFirstRefresh.current) {
			isFirstRefresh.current = false;
			return;
		}
		fetchStats();
		fetchData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [refreshKey]);

	// Debounce pencarian
	useEffect(() => {
		const timer = setTimeout(() => {
			setFilters((prev) => (prev.search === searchInput ? prev : { ...prev, search: searchInput }));
			setPagination((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
		}, 400);
		return () => clearTimeout(timer);
	}, [searchInput]);

	useEffect(() => {
		if (!filters.kecamatan_id) {
			setDesaList([]);
			return;
		}
		const fetchDesaByKecamatan = async () => {
			try {
				const response = await api.get(`/desas/kecamatan/${filters.kecamatan_id}`);
				if (response.data.success) setDesaList(response.data.data || []);
			} catch (error) {
				console.error('Failed to fetch desa:', error);
			}
		};
		fetchDesaByKecamatan();
	}, [filters.kecamatan_id]);

	const handleFilterChange = (key, value) => {
		setFilters((prev) => {
			const next = { ...prev, [key]: value };
			if (key === 'kecamatan_id') next.desa_id = '';
			return next;
		});
		setPagination((prev) => ({ ...prev, page: 1 }));
	};

	const resetFilters = () => {
		setFilters(EMPTY_FILTERS);
		setSearchInput('');
		setPagination((prev) => ({ ...prev, page: 1 }));
	};

	const labelFor = useCallback(
		(key, value) => {
			switch (key) {
				case 'search':
					return `Cari: "${value}"`;
				case 'kecamatan_id': {
					const kecamatan = kecamatanList.find((item) => String(item.id || item.id_kecamatan) === String(value));
					return `Kecamatan: ${kecamatan?.nama || kecamatan?.name || value}`;
				}
				case 'desa_id': {
					const desa = desaList.find((item) => String(item.id) === String(value));
					return `Desa: ${desa?.nama || desa?.name || value}`;
				}
				case 'jabatan':
					return `Jabatan: ${value}`;
				case 'jenis_kelamin':
					return `Kelamin: ${value === 'Laki_laki' ? 'Laki-laki' : 'Perempuan'}`;
				case 'status':
					return `Status: ${value === 'Aktif' ? 'Aktif' : 'Tidak Aktif'}`;
				default:
					return value;
			}
		},
		[kecamatanList, desaList]
	);

	const activeFilters = useMemo(
		() => Object.entries(filters).filter(([, value]) => Boolean(value)),
		[filters]
	);

	const removeFilter = (key) => {
		if (key === 'search') setSearchInput('');
		handleFilterChange(key, '');
	};

	const total = Number(stats?.total ?? 0);
	const pageNumbers = useMemo(() => {
		const totalPages = pagination.totalPages || 1;
		const current = pagination.page;
		const pages = new Set([1, totalPages, current, current - 1, current + 1]);
		return [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
	}, [pagination.page, pagination.totalPages]);

	const goToPage = (page) => {
		setPagination((prev) => ({ ...prev, page: Math.min(Math.max(page, 1), prev.totalPages || 1) }));
	};

	return (
		<div className="space-y-5">
			{/* ---------- Ringkasan ---------- */}
			<section>
				<div className="mb-3 flex items-center justify-between gap-3">
					<div>
						<h2 className="text-base font-semibold text-slate-900">Ringkasan Kabupaten</h2>
						<p className="text-xs text-slate-500">Statistik seluruh aparatur terdata &mdash; tidak terpengaruh filter tabel.</p>
					</div>
					<button
						type="button"
						onClick={() => setShowSummary((prev) => !prev)}
						className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
					>
						{showSummary ? 'Sembunyikan' : 'Tampilkan'}
						<ChevronDown className={`h-3.5 w-3.5 transition-transform ${showSummary ? 'rotate-180' : ''}`} />
					</button>
				</div>

				{showSummary && (
					<>
						{statsLoading && !stats ? (
							<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
								{Array.from({ length: 4 }).map((_, index) => (
									<div key={index} className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white" />
								))}
							</div>
						) : (
							stats && (
								<>
									<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
										<StatCard
											label="Total Aparatur"
											value={fmt(stats.total)}
											hint={stats.desa_count ? `Tersebar di ${fmt(stats.desa_count)} desa` : null}
											icon={Users}
											iconClass="bg-blue-50 text-blue-600"
										/>
										<StatCard
											label="Perangkat Desa"
											value={fmt(stats.total_pemdes)}
											icon={Building2}
											iconClass="bg-teal-50 text-teal-600"
											share={pct(stats.total_pemdes, total)}
											barClass="bg-teal-500"
										/>
										<StatCard
											label="BPD"
											value={fmt(stats.total_bpd)}
											icon={Shield}
											iconClass="bg-violet-50 text-violet-600"
											share={pct(stats.total_bpd, total)}
											barClass="bg-violet-500"
										/>
										<StatCard
											label="Aparatur Aktif"
											value={fmt(stats.aktif)}
											hint={`${fmt(stats.tidak_aktif)} tidak aktif`}
											icon={CheckCircle2}
											iconClass="bg-emerald-50 text-emerald-600"
											share={pct(stats.aktif, total)}
											barClass="bg-emerald-500"
										/>
									</div>

									{/* 5 kolom: donut butuh ruang persegi, bar butuh ruang lebar */}
									<div className="mt-4 grid gap-4 lg:grid-cols-5">
										<ChartCard
											title="Jenis Kelamin"
											subtitle="Komposisi laki-laki dan perempuan"
											className="lg:col-span-2"
										>
											<GenderDonut lakiLaki={stats.laki_laki} perempuan={stats.perempuan} />
										</ChartCard>

										<ChartCard
											title="Rentang Usia"
											subtitle="Sebaran umur aparatur saat ini"
											className="lg:col-span-3"
										>
											<BarList items={stats.rentang_usia || []} ramp={AGE_RAMP} maxRows={6} />
										</ChartCard>

										<ChartCard
											title="Pendidikan Terakhir"
											subtitle="8 jenjang terbanyak"
											className="lg:col-span-5"
										>
											<BarList
												items={stats.pendidikan || []}
												color={EDU_COLOR}
												maxRows={9}
												labelClass="w-32 sm:w-52 lg:w-64"
											/>
										</ChartCard>
									</div>
								</>
							)
						)}
					</>
				)}
			</section>

			{/* ---------- Toolbar ---------- */}
			<section className="sticky top-2 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
					<div className="relative flex-1">
						<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
						<input
							type="text"
							placeholder="Cari nama atau jabatan aparatur..."
							value={searchInput}
							onChange={(event) => setSearchInput(event.target.value)}
							className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
						/>
						{searchInput && (
							<button
								type="button"
								onClick={() => setSearchInput('')}
								className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
								aria-label="Hapus pencarian"
							>
								<X className="h-4 w-4" />
							</button>
						)}
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setShowFilters((prev) => !prev)}
							className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
								showFilters || activeFilters.length
									? 'border-blue-200 bg-blue-50 text-blue-700'
									: 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
							}`}
						>
							<SlidersHorizontal className="h-4 w-4" />
							Filter
							{activeFilters.length > 0 && (
								<span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-blue-600 px-1 text-[11px] font-bold text-white">
									{activeFilters.length}
								</span>
							)}
						</button>
						<button
							type="button"
							onClick={fetchData}
							className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
							title="Muat ulang data"
						>
							<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
						</button>
					</div>
				</div>

				{showFilters && (
					<div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-5">
						<label className="block">
							<span className="mb-1 block text-xs font-medium text-slate-600">Kecamatan</span>
							<select
								value={filters.kecamatan_id}
								onChange={(event) => handleFilterChange('kecamatan_id', event.target.value)}
								className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
							>
								<option value="">Semua Kecamatan</option>
								{kecamatanList.map((kecamatan) => (
									<option key={kecamatan.id || kecamatan.id_kecamatan} value={kecamatan.id || kecamatan.id_kecamatan}>
										{kecamatan.nama || kecamatan.name}
									</option>
								))}
							</select>
						</label>

						<label className="block">
							<span className="mb-1 block text-xs font-medium text-slate-600">Desa</span>
							<select
								value={filters.desa_id}
								onChange={(event) => handleFilterChange('desa_id', event.target.value)}
								disabled={!filters.kecamatan_id}
								className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
							>
								<option value="">{filters.kecamatan_id ? 'Semua Desa' : 'Pilih kecamatan dulu'}</option>
								{desaList.map((desa) => (
									<option key={desa.id} value={desa.id}>
										{desa.nama || desa.name}
									</option>
								))}
							</select>
						</label>

						<label className="block">
							<span className="mb-1 block text-xs font-medium text-slate-600">Jabatan</span>
							<input
								type="text"
								placeholder="Contoh: Kepala Desa"
								value={filters.jabatan}
								onChange={(event) => handleFilterChange('jabatan', event.target.value)}
								className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
							/>
						</label>

						<label className="block">
							<span className="mb-1 block text-xs font-medium text-slate-600">Jenis Kelamin</span>
							<select
								value={filters.jenis_kelamin}
								onChange={(event) => handleFilterChange('jenis_kelamin', event.target.value)}
								className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
							>
								<option value="">Semua</option>
								<option value="Laki_laki">Laki-laki</option>
								<option value="Perempuan">Perempuan</option>
							</select>
						</label>

						<label className="block">
							<span className="mb-1 block text-xs font-medium text-slate-600">Status</span>
							<select
								value={filters.status}
								onChange={(event) => handleFilterChange('status', event.target.value)}
								className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
							>
								<option value="">Semua</option>
								<option value="Aktif">Aktif</option>
								<option value="Tidak_Aktif">Tidak Aktif</option>
							</select>
						</label>
					</div>
				)}

				{activeFilters.length > 0 && (
					<div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
						{activeFilters.map(([key, value]) => (
							<span
								key={key}
								className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 py-1 pl-3 pr-1.5 text-xs font-medium text-blue-700"
							>
								{labelFor(key, value)}
								<button
									type="button"
									onClick={() => removeFilter(key)}
									className="rounded-full p-0.5 transition-colors hover:bg-blue-100"
									aria-label={`Hapus filter ${key}`}
								>
									<X className="h-3 w-3" />
								</button>
							</span>
						))}
						<button
							type="button"
							onClick={resetFilters}
							className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
						>
							Reset semua
						</button>
					</div>
				)}
			</section>

			{/* ---------- Tabel ---------- */}
			<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
				<div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
					<p className="text-sm text-slate-600">
						{loading ? (
							<span className="inline-flex items-center gap-2 text-slate-400">
								<Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat data...
							</span>
						) : (
							<>
								<span className="font-semibold text-slate-900">{fmt(pagination.totalItems)}</span> aparatur ditemukan
								{activeFilters.length > 0 && <span className="text-slate-400"> (terfilter)</span>}
							</>
						)}
					</p>
					<label className="flex items-center gap-2 text-xs text-slate-500">
						Tampilkan
						<select
							value={pagination.limit}
							onChange={(event) =>
								setPagination((prev) => ({ ...prev, limit: Number(event.target.value), page: 1 }))
							}
							className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
						>
							{[20, 50, 100].map((size) => (
								<option key={size} value={size}>
									{size}
								</option>
							))}
						</select>
						baris
					</label>
				</div>

				{loading ? (
					<TableSkeleton rows={Math.min(pagination.limit, 8)} />
				) : data.length === 0 ? (
					<div className="px-6 py-16 text-center">
						<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
							<Users className="h-7 w-7 text-slate-300" />
						</div>
						<p className="font-medium text-slate-700">Tidak ada data aparatur desa</p>
						<p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
							{activeFilters.length > 0
								? 'Coba longgarkan filter atau ubah kata kunci pencarian.'
								: 'Data aparatur diinput oleh masing-masing desa atau berasal dari arsip yang sudah disuntikkan.'}
						</p>
						{activeFilters.length > 0 && (
							<button
								type="button"
								onClick={resetFilters}
								className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
							>
								Reset filter
							</button>
						)}
					</div>
				) : (
					<>
						{/* Desktop */}
						<div className="hidden overflow-x-auto md:block">
							<table className="min-w-full">
								<thead>
									<tr className="border-b border-slate-100 bg-slate-50/80">
										<th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
											Aparatur
										</th>
										<th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
											Jabatan
										</th>
										<th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
											Wilayah
										</th>
										<th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
											Status
										</th>
										<th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
											Aksi
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100">
									{data.map((aparatur) => (
										<tr
											key={aparatur.id}
											onClick={() => setSelectedAparatur(aparatur)}
											className="cursor-pointer transition-colors hover:bg-slate-50"
										>
											<td className="px-5 py-3.5">
												<div className="flex items-center gap-3">
													<Avatar person={aparatur} />
													<div className="min-w-0">
														<p className="truncate font-medium text-slate-900">{aparatur.nama_lengkap}</p>
														<p className="truncate text-xs text-slate-500">
															{aparatur.jenis_kelamin === 'Laki_laki' ? 'Laki-laki' : 'Perempuan'}
															{aparatur.pendidikan_terakhir ? ` · ${aparatur.pendidikan_terakhir}` : ''}
														</p>
													</div>
												</div>
											</td>
											<td className="max-w-[220px] px-5 py-3.5">
												<JabatanBadge jabatan={aparatur.jabatan} />
											</td>
											<td className="px-5 py-3.5">
												<p className="text-sm font-medium text-slate-800">{aparatur.desas?.nama || '-'}</p>
												<p className="text-xs text-slate-500">
													Kec. {aparatur.desas?.kecamatans?.nama || '-'}
												</p>
											</td>
											<td className="px-5 py-3.5">
												<StatusBadge status={aparatur.status} />
											</td>
											<td className="px-5 py-3.5 text-right">
												<span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50">
													<Eye className="h-4 w-4" />
													Detail
												</span>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{/* Mobile */}
						<div className="divide-y divide-slate-100 md:hidden">
							{data.map((aparatur) => (
								<div
									key={aparatur.id}
									role="button"
									tabIndex={0}
									onClick={() => setSelectedAparatur(aparatur)}
									onKeyDown={(event) => {
										if (event.key === 'Enter' || event.key === ' ') {
											event.preventDefault();
											setSelectedAparatur(aparatur);
										}
									}}
									className="flex w-full items-start gap-3 p-4 text-left transition-colors active:bg-slate-50"
								>
									<Avatar person={aparatur} />
									<div className="min-w-0 flex-1">
										<div className="flex items-start justify-between gap-2">
											<h3 className="truncate font-semibold text-slate-900">{aparatur.nama_lengkap}</h3>
											<StatusBadge status={aparatur.status} />
										</div>
										<div className="mt-1.5">
											<JabatanBadge jabatan={aparatur.jabatan} />
										</div>
										<div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
											<span className="inline-flex items-center gap-1">
												<Building2 className="h-3.5 w-3.5" />
												{aparatur.desas?.nama || '-'}
											</span>
											<span className="inline-flex items-center gap-1">
												<MapPin className="h-3.5 w-3.5" />
												{aparatur.desas?.kecamatans?.nama || '-'}
											</span>
										</div>
									</div>
								</div>
							))}
						</div>

						{/* Pagination */}
						<div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 sm:flex-row">
							<p className="text-xs text-slate-500">
								Menampilkan <span className="font-medium text-slate-700">{data.length}</span> dari{' '}
								<span className="font-medium text-slate-700">{fmt(pagination.totalItems)}</span> data
							</p>
							<div className="flex items-center gap-1">
								<button
									type="button"
									onClick={() => goToPage(pagination.page - 1)}
									disabled={pagination.page <= 1}
									className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
									aria-label="Halaman sebelumnya"
								>
									<ChevronLeft className="h-4 w-4" />
								</button>
								{pageNumbers.map((page, index) => (
									<React.Fragment key={page}>
										{index > 0 && page - pageNumbers[index - 1] > 1 && (
											<span className="px-1 text-xs text-slate-400">&hellip;</span>
										)}
										<button
											type="button"
											onClick={() => goToPage(page)}
											className={`min-w-[2rem] rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
												page === pagination.page
													? 'bg-slate-900 text-white'
													: 'border border-slate-200 text-slate-600 hover:bg-slate-50'
											}`}
										>
											{page}
										</button>
									</React.Fragment>
								))}
								<button
									type="button"
									onClick={() => goToPage(pagination.page + 1)}
									disabled={pagination.page >= pagination.totalPages}
									className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
									aria-label="Halaman berikutnya"
								>
									<ChevronRight className="h-4 w-4" />
								</button>
							</div>
						</div>
					</>
				)}
			</section>

			{selectedAparatur && <DetailModal aparatur={selectedAparatur} onClose={() => setSelectedAparatur(null)} />}
		</div>
	);
};

// ============================================================
// Halaman utama
// ============================================================
const PAGE_VARIANTS = {
	pemdes: {
		eyebrow: 'Bidang Pemerintahan Desa',
		title: 'Aparatur Desa',
		description: 'Monitoring dan audit data perangkat desa serta BPD se-Kabupaten Bogor.',
		badge: 'Database Aplikasi',
		accent: 'from-sky-600 to-blue-700',
	},
	'core-dashboard': {
		eyebrow: 'Core Dashboard DPMD',
		title: 'Aparatur Desa',
		description: 'Sebaran dan komposisi aparatur desa dari database aplikasi untuk monitoring wilayah.',
		badge: 'Database Aplikasi',
		accent: 'from-emerald-600 to-teal-700',
	},
};

const TAB_DEFINITIONS = [
	{
		id: 'database',
		label: 'Database Lokal',
		icon: Database,
		desc: 'Data aparatur yang tersimpan di aplikasi DPMD.',
	},
];

const AparaturDesaPage = ({ mode = 'pemdes', allowedTabs = ['database'], initialTab }) => {
	const variant = PAGE_VARIANTS[mode] || PAGE_VARIANTS.pemdes;
	const filteredTabs = TAB_DEFINITIONS.filter((tab) => allowedTabs.includes(tab.id));
	const tabs = filteredTabs.length > 0 ? filteredTabs : TAB_DEFINITIONS;
	const fallbackTab = tabs[0]?.id || 'database';
	const defaultTab = initialTab && tabs.some((tab) => tab.id === initialTab) ? initialTab : fallbackTab;
	const [activeTab, setActiveTab] = useState(defaultTab);
	const [refreshKey, setRefreshKey] = useState(0);
	const [busy, setBusy] = useState(false);
	const [lastUpdated, setLastUpdated] = useState(null);
	const hasActiveTab = tabs.some((tab) => tab.id === activeTab);

	useEffect(() => {
		if (!hasActiveTab) setActiveTab(fallbackTab);
	}, [fallbackTab, hasActiveTab]);

	const handleUpdated = useCallback((date) => setLastUpdated(date), []);
	const handleLoading = useCallback((value) => setBusy(value), []);

	return (
		<div className="min-h-screen p-4 sm:p-6">
			{/* Header */}
			<header className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-start gap-4">
						<div
							className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${variant.accent} text-white shadow-sm`}
						>
							<Users className="h-6 w-6" />
						</div>
						<div className="min-w-0">
							<p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{variant.eyebrow}</p>
							<h1 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{variant.title}</h1>
							<p className="mt-1 text-sm text-slate-500">{variant.description}</p>
						</div>
					</div>

					<div className="flex items-center gap-2 sm:flex-col sm:items-end">
						<span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
							<Shield className="h-3.5 w-3.5" />
							{variant.badge}
						</span>
						<div className="flex items-center gap-2">
							{lastUpdated && (
								<span className="hidden items-center gap-1 text-xs text-slate-400 sm:inline-flex">
									<CalendarDays className="h-3.5 w-3.5" />
									{lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
								</span>
							)}
							<button
								type="button"
								onClick={() => setRefreshKey((key) => key + 1)}
								disabled={busy}
								className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
							>
								<RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
								Refresh
							</button>
						</div>
					</div>
				</div>

				{tabs.length > 1 && (
					<div className="mt-4 flex gap-1 rounded-xl bg-slate-100 p-1">
						{tabs.map((tab) => {
							const TabIcon = tab.icon || GraduationCap;
							const isActive = activeTab === tab.id;
							return (
								<button
									key={tab.id}
									type="button"
									onClick={() => setActiveTab(tab.id)}
									className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
										isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
									}`}
									title={tab.desc}
								>
									<TabIcon className="h-4 w-4" />
									{tab.label}
								</button>
							);
						})}
					</div>
				)}
			</header>

			{activeTab === 'database' && (
				<DatabaseTab refreshKey={refreshKey} onLoadingChange={handleLoading} onUpdated={handleUpdated} />
			)}
		</div>
	);
};

export default AparaturDesaPage;
