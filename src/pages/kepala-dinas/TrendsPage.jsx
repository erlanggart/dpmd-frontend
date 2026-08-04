// src/pages/kepala-dinas/TrendsPage.jsx
// Analisis Trend Core Dashboard — deret waktu ASLI dari tanggal kejadian di
// database (GET /kepala-dinas/trends), bukan total yang dibagi rata per bulan.
//
// Modul yang memang tidak punya dimensi waktu (rekap penyaluran KKD/Bankeu,
// pendirian BUMDes, kelengkapan profil desa) sengaja dipisah ke bagiannya
// sendiri dan diberi label apa adanya — bukan dipaksa jadi grafik bulanan.
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	AreaChart,
	Area,
	ComposedChart,
	Line,
	BarChart,
	Bar,
	Cell,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ReferenceLine,
	ResponsiveContainer,
} from 'recharts';
import {
	TrendingUp,
	TrendingDown,
	ArrowLeft,
	RefreshCw,
	Activity,
	Users,
	UserCheck,
	Building2,
	Scale,
	Plane,
	Store,
	Wallet,
	FileStack,
	FileCheck2,
	Landmark,
	Sparkles,
	Flame,
	Minus,
	GitCompareArrows,
	AlertCircle,
	CalendarRange,
	Table2,
	Download,
	LineChart as LineChartIcon,
	BarChart3,
	Layers,
	Gauge,
	Sprout,
	Info,
} from 'lucide-react';
import api from '../../api';

// ============================================================
// Konstanta tampilan
// ============================================================
// Palet kategorikal tervalidasi (CVD-safe pada urutan slot ini) — nomor slot
// datang dari backend supaya warna menempel ke modulnya, bukan ke urutan
// tampil. Jangan diacak.
const SLOT_COLOR = {
	1: '#2a78d6', // blue
	2: '#eb6834', // orange
	3: '#1baf7a', // aqua
	4: '#eda100', // yellow
	5: '#e87ba4', // magenta
	6: '#008300', // green
	7: '#4a3aa7', // violet
	8: '#e34948', // red
};
const FALLBACK_COLOR = '#2a78d6';

// Ramp biru ordinal (tahapan berurutan). Langkah paling terang tetap >= 2:1
// terhadap permukaan putih.
const ORDINAL_BLUE = ['#86b6ef', '#6da7ec', '#5598e7', '#3987e5', '#2a78d6', '#256abf', '#1c5cab', '#184f95'];

const INK = {
	grid: '#e1e0d9',
	axis: '#c3c2b7',
	muted: '#898781',
	ghost: '#c3c2b7',
	trend: '#52514e',
};

const SERIES_ICON = {
	aparatur: Users,
	produk_hukum: Scale,
	perjadin: Plane,
	kelembagaan: Building2,
	pengurus: UserCheck,
	bankeu: Wallet,
	bankeu_perubahan: FileStack,
	bankeu_lpj: FileCheck2,
	bumdes: Store,
	aparatur_tahunan: Users,
	produk_hukum_tahunan: Scale,
};

const MODULES = [
	{ key: 'all', label: 'Semua Modul', icon: Layers },
	{ key: 'pemerintahan', label: 'Pemerintahan Desa', icon: Landmark },
	{ key: 'kelembagaan', label: 'Kelembagaan', icon: Building2 },
	{ key: 'keuangan', label: 'Keuangan Desa', icon: Wallet },
	{ key: 'internal', label: 'Internal DPMD', icon: Plane },
];

const PERIOD_OPTIONS = [
	{ months: 6, label: '6 Bulan' },
	{ months: 12, label: '12 Bulan' },
	{ months: 24, label: '24 Bulan' },
];

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTH_LONG = [
	'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
	'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

// ============================================================
// Format & hitung
// ============================================================
const fmt = (n) => Number(n ?? 0).toLocaleString('id-ID');

/** Rupiah ringkas untuk sumbu & kartu: Rp 405,6 M */
const rupiahRingkas = (n) => {
	const value = Number(n ?? 0);
	const abs = Math.abs(value);
	const cut = (divisor, suffix) => `Rp ${(value / divisor).toFixed(1).replace('.', ',')} ${suffix}`;
	if (abs >= 1e12) return cut(1e12, 'T');
	if (abs >= 1e9) return cut(1e9, 'M');
	if (abs >= 1e6) return cut(1e6, 'Jt');
	if (abs >= 1e3) return `Rp ${Math.round(value / 1e3)} Rb`;
	return `Rp ${fmt(value)}`;
};

const rupiahPenuh = (n) => `Rp ${fmt(Math.round(Number(n ?? 0)))}`;

/** '2026-01' -> 'Jan 26' */
const shortMonth = (value = '') => {
	const [year, month] = String(value).split('-');
	const index = Number(month) - 1;
	if (Number.isNaN(index) || !MONTH_SHORT[index]) return value;
	return `${MONTH_SHORT[index]} ${String(year).slice(2)}`;
};

/** '2026-01' -> 'Januari 2026' */
const longMonth = (value = '') => {
	const [year, month] = String(value).split('-');
	const index = Number(month) - 1;
	if (Number.isNaN(index) || !MONTH_LONG[index]) return value;
	return `${MONTH_LONG[index]} ${year}`;
};

const growth = (current, previous) => {
	if (!previous) return current > 0 ? 100 : 0;
	return Math.round(((current - previous) / previous) * 1000) / 10;
};

const colorOf = (item) => SLOT_COLOR[item?.slot] || FALLBACK_COLOR;

/** Rata-rata bergerak; jendela memendek di awal deret agar tidak bolong. */
const movingAverage = (values, window = 3) =>
	values.map((_, index) => {
		const slice = values.slice(Math.max(0, index - window + 1), index + 1);
		return Math.round(slice.reduce((sum, value) => sum + value, 0) / slice.length);
	});

/** Ramp ordinal sepanjang `count` langkah, disebar merata. */
const ordinalRamp = (count) =>
	Array.from({ length: count }, (_, index) =>
		ORDINAL_BLUE[Math.round((index * (ORDINAL_BLUE.length - 1)) / Math.max(count - 1, 1))]
	);

// ============================================================
// Hooks kecil
// ============================================================
const usePrefersReducedMotion = () => {
	const [reduced, setReduced] = useState(
		() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
	);
	useEffect(() => {
		const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
		if (!query) return undefined;
		const onChange = (event) => setReduced(event.matches);
		query.addEventListener('change', onChange);
		return () => query.removeEventListener('change', onChange);
	}, []);
	return reduced;
};

/** Angka yang menghitung naik saat muncul / berubah. */
const useCountUp = (target = 0, duration = 900) => {
	const reduced = usePrefersReducedMotion();
	const [value, setValue] = useState(reduced ? target : 0);
	const fromRef = useRef(0);

	useEffect(() => {
		if (reduced) {
			setValue(target);
			return undefined;
		}
		const from = fromRef.current;
		const start = performance.now();
		let frame;
		const tick = (now) => {
			const progress = Math.min((now - start) / duration, 1);
			const eased = 1 - Math.pow(1 - progress, 3);
			setValue(Math.round(from + (target - from) * eased));
			if (progress < 1) frame = requestAnimationFrame(tick);
			else fromRef.current = target;
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [target, duration, reduced]);

	return value;
};

// ============================================================
// Potongan UI kecil
// ============================================================
const SectionHeading = ({ icon: Icon, title, hint, children }) => (
	<div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
				{Icon && <Icon className="h-4 w-4 text-slate-400" />}
				{title}
			</h2>
			{hint && <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">{hint}</p>}
		</div>
		{children}
	</div>
);

const DeltaBadge = ({ value, hasBaseline = true, size = 'sm' }) => {
	const big = size === 'lg';

	if (!hasBaseline) {
		return (
			<span
				className={`inline-flex items-center gap-1 rounded-full bg-slate-100 font-semibold text-slate-600 ${
					big ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-[11px]'
				}`}
				title="Modul ini belum punya data pada periode pembanding, jadi persentasenya tidak bermakna."
			>
				<Sparkles className={big ? 'h-4 w-4' : 'h-3 w-3'} />
				data baru
			</span>
		);
	}

	const flat = Math.abs(value) < 0.05;
	const up = value > 0;
	const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
	const tone = flat
		? 'bg-slate-100 text-slate-600'
		: up
		? 'bg-emerald-50 text-emerald-700'
		: 'bg-rose-50 text-rose-700';

	return (
		<span
			className={`inline-flex items-center gap-1 rounded-full font-semibold ${tone} ${
				big ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-[11px]'
			}`}
		>
			<Icon className={big ? 'h-4 w-4' : 'h-3 w-3'} />
			{flat ? 'stabil' : `${up ? '+' : ''}${value}%`}
		</span>
	);
};

/** Sparkline SVG murni — garis + area gradient, dengan animasi gambar. */
const Sparkline = ({ points = [], color = FALLBACK_COLOR, width = 132, height = 40, animate = true, id }) => {
	const values = points.map((point) => (typeof point === 'number' ? point : point.value));
	const path = useMemo(() => {
		if (values.length < 2) return null;
		const max = Math.max(...values, 1);
		const min = Math.min(...values, 0);
		const span = max - min || 1;
		const stepX = width / (values.length - 1);
		const coords = values.map((value, index) => [
			index * stepX,
			height - ((value - min) / span) * (height - 6) - 3,
		]);
		const line = coords.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
		return { line, area: `${line} L${width},${height} L0,${height} Z`, last: coords[coords.length - 1] };
	}, [values, width, height]);

	if (!path) return <div className="h-10" />;

	return (
		<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden="true">
			<defs>
				<linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={color} stopOpacity="0.28" />
					<stop offset="100%" stopColor={color} stopOpacity="0" />
				</linearGradient>
			</defs>
			<path d={path.area} fill={`url(#spark-${id})`} />
			<path
				d={path.line}
				fill="none"
				stroke={color}
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className={animate ? 'trend-draw' : ''}
			/>
			<circle cx={path.last[0]} cy={path.last[1]} r="3" fill={color} stroke="#fff" strokeWidth="1.5" />
		</svg>
	);
};

const TooltipShell = ({ title, children }) => (
	<div className="rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2.5 shadow-sm backdrop-blur">
		<p className="text-xs font-semibold text-slate-900">{title}</p>
		<div className="mt-1 space-y-1">{children}</div>
	</div>
);

const TooltipRow = ({ swatch, label, value, dashed = false }) => (
	<p className="flex items-center gap-2 text-xs text-slate-500">
		<span
			className="h-2 w-2 shrink-0 rounded-full"
			style={{ backgroundColor: swatch, opacity: dashed ? 0.6 : 1 }}
		/>
		{label}
		<span className="ml-auto font-bold text-slate-900">{value}</span>
	</p>
);

// ============================================================
// Kartu metrik
// ============================================================
const MetricCard = ({ series, active, onSelect, index }) => {
	const Icon = SERIES_ICON[series.key] || Activity;
	const color = colorOf(series);
	const animatedTotal = useCountUp(series.total);

	return (
		<button
			type="button"
			onClick={onSelect}
			aria-pressed={active}
			style={{ animationDelay: `${index * 60}ms` }}
			className={`trend-enter group relative overflow-hidden rounded-2xl border bg-white p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
				active ? 'border-slate-900/10 shadow-lg ring-2 ring-slate-900/70' : 'border-slate-200 shadow-sm'
			}`}
		>
			<span
				className="absolute inset-x-0 top-0 h-1 origin-left transition-transform duration-300"
				style={{ backgroundColor: color, transform: active ? 'scaleX(1)' : 'scaleX(0)' }}
			/>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<span
							className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
							style={{ backgroundColor: `${color}1f`, color }}
						>
							<Icon className="h-4 w-4" />
						</span>
						<p className="truncate text-xs font-semibold uppercase tracking-wider text-brand-600">
							{series.short_label || series.label}
						</p>
					</div>
					<p className="mt-2.5 text-3xl font-bold tracking-tight text-slate-900">{fmt(animatedTotal)}</p>
					<p className="mt-0.5 text-xs text-slate-500">
						{series.unit} &middot; rata-rata {fmt(series.average)}/bulan
					</p>
					{series.amount_total > 0 && (
						<p className="mt-0.5 text-xs font-semibold text-slate-600">{rupiahRingkas(series.amount_total)}</p>
					)}
				</div>
				<Sparkline points={series.points} color={color} id={series.key} width={96} height={38} />
			</div>
			<div className="mt-3 flex items-center gap-2">
				<DeltaBadge value={series.growth} hasBaseline={series.has_baseline} />
				<span className="text-[11px] text-slate-400">vs periode sebelumnya</span>
			</div>
		</button>
	);
};

// ============================================================
// Small multiple
// ============================================================
const MiniTrendCard = ({ series, active, onSelect, index, normalized }) => {
	const Icon = SERIES_ICON[series.key] || Activity;
	const color = colorOf(series);
	const max = Math.max(...series.points.map((point) => point.value), 1);

	const data = series.points.map((point) => ({
		label: shortMonth(point.month),
		month: point.month,
		raw: point.value,
		value: normalized ? Math.round((point.value / max) * 1000) / 10 : point.value,
	}));

	return (
		<button
			type="button"
			onClick={onSelect}
			aria-pressed={active}
			style={{ animationDelay: `${index * 60}ms` }}
			className={`trend-enter rounded-2xl border bg-white p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
				active ? 'border-slate-300 shadow-md' : 'border-slate-200 shadow-sm'
			}`}
		>
			<div className="mb-2 flex items-center justify-between gap-2">
				<span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-700">
					<Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
					<span className="truncate">{series.short_label || series.label}</span>
				</span>
				<span className="shrink-0 text-xs font-bold text-slate-900">{fmt(series.total)}</span>
			</div>
			<div className="h-[74px]">
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart data={data} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
						<defs>
							<linearGradient id={`mini-${series.key}`} x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stopColor={color} stopOpacity={0.3} />
								<stop offset="100%" stopColor={color} stopOpacity={0} />
							</linearGradient>
						</defs>
						{normalized && <YAxis domain={[0, 100]} hide />}
						<Tooltip
							cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '3 3' }}
							content={({ active: hovered, payload, label }) =>
								hovered && payload?.length ? (
									<TooltipShell title={longMonth(payload[0].payload.month) || label}>
										<TooltipRow
											swatch={color}
											label={series.unit}
											value={fmt(payload[0].payload.raw)}
										/>
										{normalized && (
											<TooltipRow
												swatch={INK.ghost}
												label="dari puncak"
												value={`${payload[0].payload.value}%`}
											/>
										)}
									</TooltipShell>
								) : null
							}
						/>
						<Area
							type="monotone"
							dataKey="value"
							stroke={color}
							strokeWidth={2}
							fill={`url(#mini-${series.key})`}
							animationDuration={900}
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>
			<p className="mt-1 text-[11px] text-slate-400">
				Puncak {shortMonth(series.peak.month)} &middot; {fmt(series.peak.value)} {series.unit}
			</p>
		</button>
	);
};

// ============================================================
// Progresi penyaluran per tahap
// ============================================================
const StageGroupCard = ({ group, index }) => {
	const ramp = ordinalRamp(group.stages.length);
	const maxAmount = Math.max(...group.stages.map((stage) => stage.amount), 1);

	return (
		<div
			style={{ animationDelay: `${index * 70}ms` }}
			className="trend-enter rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
		>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<h3 className="truncate text-sm font-semibold text-slate-900">{group.label}</h3>
					<p className="mt-0.5 text-xs text-slate-500">
						{group.stages.length} tahap &middot; {fmt(group.total_desa)} baris rekap desa
					</p>
				</div>
				<div className="shrink-0 text-right">
					<p className="text-lg font-bold text-slate-900">{rupiahRingkas(group.total_amount)}</p>
					<p className="text-[11px] text-slate-400">total realisasi</p>
				</div>
			</div>

			<div className="mt-4 space-y-3">
				{group.stages.map((stage, stageIndex) => {
					const width = Math.max((stage.amount / maxAmount) * 100, stage.amount > 0 ? 2 : 0);
					const persen = stage.desa ? Math.round((stage.cair / stage.desa) * 100) : 0;
					return (
						<div key={stage.label}>
							<div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
								<span className="truncate font-medium text-slate-700">{stage.label}</span>
								<span className="shrink-0 font-semibold tabular-nums text-slate-900">
									{rupiahRingkas(stage.amount)}
								</span>
							</div>
							<div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
								<div
									className="h-full rounded-full transition-[width] duration-700"
									style={{ width: `${width}%`, backgroundColor: ramp[stageIndex] }}
								/>
							</div>
							<p className="mt-1 text-[11px] text-slate-400">
								{fmt(stage.cair)} dari {fmt(stage.desa)} desa sudah dicairkan ({persen}%)
							</p>
						</div>
					);
				})}
			</div>

			<div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
				<Gauge className="h-4 w-4 text-slate-400" />
				<p className="text-xs text-slate-500">
					Pencairan keseluruhan <span className="font-bold text-slate-900">{group.persen_cair}%</span>
				</p>
			</div>
		</div>
	);
};

// ============================================================
// Deret tahunan
// ============================================================
const YearlyCard = ({ series, index }) => {
	const Icon = SERIES_ICON[series.key] || Activity;
	const color = colorOf(series);
	const [hovered, setHovered] = useState(null);
	const total = series.points.reduce((sum, point) => sum + point.value, 0);
	const peak = series.points.reduce((best, point) => (point.value > (best?.value ?? -1) ? point : best), null);

	return (
		<div
			style={{ animationDelay: `${index * 70}ms` }}
			className="trend-enter rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
		>
			<div className="mb-3 flex items-start justify-between gap-3">
				<div className="min-w-0">
					<h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
						<Icon className="h-4 w-4 shrink-0" style={{ color }} />
						<span className="truncate">{series.label}</span>
					</h3>
					<p className="mt-1 text-xs leading-5 text-slate-500">{series.description}</p>
				</div>
				<div className="shrink-0 text-right">
					<p className="text-lg font-bold text-slate-900">{fmt(total)}</p>
					<p className="text-[11px] text-slate-400">{series.unit}</p>
				</div>
			</div>

			<div className="h-[190px] w-full">
				<ResponsiveContainer width="100%" height="100%">
					<BarChart
						data={series.points}
						margin={{ top: 8, right: 6, bottom: 0, left: -18 }}
						onMouseLeave={() => setHovered(null)}
					>
						<CartesianGrid strokeDasharray="3 3" stroke={INK.grid} vertical={false} />
						<XAxis
							dataKey="year"
							tick={{ fontSize: 11, fill: INK.muted }}
							tickLine={false}
							axisLine={{ stroke: INK.axis }}
							interval="preserveStartEnd"
							minTickGap={4}
						/>
						<YAxis tick={{ fontSize: 11, fill: INK.muted }} tickLine={false} axisLine={false} width={44} />
						<Tooltip
							cursor={{ fill: `${color}0f` }}
							content={({ active, payload, label }) =>
								active && payload?.length ? (
									<TooltipShell title={`Tahun ${label}`}>
										<TooltipRow swatch={color} label={series.unit} value={fmt(payload[0].value)} />
									</TooltipShell>
								) : null
							}
						/>
						<Bar
							dataKey="value"
							radius={[4, 4, 0, 0]}
							maxBarSize={40}
							animationDuration={900}
							onMouseEnter={(_, barIndex) => setHovered(barIndex)}
						>
							{series.points.map((point, barIndex) => (
								<Cell
									key={point.year}
									fill={color}
									fillOpacity={hovered === null || hovered === barIndex ? 1 : 0.35}
								/>
							))}
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			</div>

			{peak && (
				<p className="mt-2 text-[11px] text-slate-400">
					Tertinggi tahun <span className="font-semibold text-slate-600">{peak.year}</span> dengan {fmt(peak.value)}{' '}
					{series.unit}
				</p>
			)}
		</div>
	);
};

// ============================================================
// Daftar batang (komposisi & kelengkapan)
// ============================================================
const BarList = ({ rows, color = FALLBACK_COLOR, valueFormatter = fmt, captionFor }) => {
	const max = Math.max(...rows.map((row) => row.value), 1);
	return (
		<div className="space-y-2.5">
			{rows.map((row) => (
				<div key={row.label}>
					<div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
						<span className="truncate font-medium text-slate-700">{row.label}</span>
						<span className="shrink-0 font-semibold tabular-nums text-slate-900">
							{valueFormatter(row.value)}
						</span>
					</div>
					<div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
						<div
							className="h-full rounded-full transition-[width] duration-700"
							style={{ width: `${Math.max((row.value / max) * 100, row.value > 0 ? 2 : 0)}%`, backgroundColor: color }}
						/>
					</div>
					{captionFor && <p className="mt-1 text-[11px] text-slate-400">{captionFor(row)}</p>}
				</div>
			))}
		</div>
	);
};

const InsightCard = ({ icon: Icon, tone, title, children, index = 0 }) => (
	<div
		style={{ animationDelay: `${index * 70}ms` }}
		className="trend-enter rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
	>
		<div className="flex items-center gap-3">
			<span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
				<Icon className="h-4 w-4" />
			</span>
			<h3 className="text-sm font-semibold text-slate-900">{title}</h3>
		</div>
		<p className="mt-3 text-sm leading-6 text-slate-600">{children}</p>
	</div>
);

// ============================================================
// Halaman
// ============================================================
const TrendsPage = () => {
	const navigate = useNavigate();
	const [months, setMonths] = useState(12);
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [activeKey, setActiveKey] = useState(null);
	const [moduleFilter, setModuleFilter] = useState('all');
	const [comparing, setComparing] = useState(false);
	const [showAverageLine, setShowAverageLine] = useState(true);
	const [chartKind, setChartKind] = useState('area'); // 'area' | 'bar'
	const [metric, setMetric] = useState('count'); // 'count' | 'amount'
	const [showTable, setShowTable] = useState(false);
	const [normalizedMini, setNormalizedMini] = useState(false);

	const fetchTrends = useCallback(async () => {
		try {
			setLoading(true);
			const response = await api.get(`/kepala-dinas/trends?months=${months}`);
			const payload = response.data?.data;
			setData(payload);
			setActiveKey((prev) => {
				if (prev && payload?.series?.some((item) => item.key === prev)) return prev;
				return payload?.series?.[0]?.key || null;
			});
			setError(null);
		} catch (err) {
			console.error('Error fetching trends:', err);
			setError(err.response?.data?.message || 'Gagal memuat data trend');
		} finally {
			setLoading(false);
		}
	}, [months]);

	useEffect(() => {
		fetchTrends();
	}, [fetchTrends]);

	// Referensi stabil — dipakai sebagai dependensi beberapa useMemo di bawah.
	const series = useMemo(() => data?.series || [], [data]);
	const active = series.find((item) => item.key === activeKey) || series[0] || null;
	const activeColor = colorOf(active);
	const hasAmount = Boolean(active?.amount_points?.length);
	const showAmount = metric === 'amount' && hasAmount;

	// Modul yang benar-benar ada datanya — chip modul kosong tidak ditampilkan.
	const availableModules = useMemo(() => {
		const present = new Set(series.map((item) => item.module));
		return MODULES.filter((module) => module.key === 'all' || present.has(module.key));
	}, [series]);

	const visibleSeries = useMemo(
		() => (moduleFilter === 'all' ? series : series.filter((item) => item.module === moduleFilter)),
		[series, moduleFilter]
	);

	// Saat filter modul berubah, pindahkan seleksi kalau grafik utama ikut tersembunyi.
	useEffect(() => {
		if (!visibleSeries.length) return;
		if (!visibleSeries.some((item) => item.key === activeKey)) {
			setActiveKey(visibleSeries[0].key);
		}
	}, [visibleSeries, activeKey]);

	useEffect(() => {
		if (!hasAmount && metric === 'amount') setMetric('count');
	}, [hasAmount, metric]);

	const chartData = useMemo(() => {
		if (!active) return [];
		const values = active.points.map((point) => point.value);
		const smoothed = movingAverage(values, 3);
		return active.points.map((point, index) => ({
			month: point.month,
			label: shortMonth(point.month),
			value: showAmount ? active.amount_points[index]?.value ?? 0 : point.value,
			count: point.value,
			amount: active.amount_points?.[index]?.value ?? null,
			prev: active.previous_points?.[index] ?? 0,
			ma: smoothed[index],
		}));
	}, [active, showAmount]);

	const chartAverage = useMemo(() => {
		if (!chartData.length) return 0;
		return Math.round(chartData.reduce((sum, row) => sum + row.value, 0) / chartData.length);
	}, [chartData]);

	const momentum = useMemo(() => {
		if (!active || active.points.length < 6) return null;
		const values = active.points.map((point) => point.value);
		const half = Math.floor(values.length / 2);
		const recent = values.slice(-half).reduce((sum, value) => sum + value, 0);
		const earlier = values.slice(0, values.length - half).reduce((sum, value) => sum + value, 0);
		return { recent, earlier, delta: growth(recent, earlier), half, earlierMonths: values.length - half };
	}, [active]);

	const busiest = useMemo(() => {
		if (!series.length) return null;
		return series.reduce((best, item) => (item.total > (best?.total ?? -1) ? item : best), null);
	}, [series]);

	const fastestGrowing = useMemo(() => {
		const withBaseline = series.filter((item) => item.has_baseline);
		if (!withBaseline.length) return null;
		return withBaseline.reduce((best, item) => (item.growth > (best?.growth ?? -Infinity) ? item : best), null);
	}, [series]);

	const stages = data?.stages || [];
	const totalRealisasi = stages.reduce((sum, group) => sum + group.total_amount, 0);
	const yearly = data?.yearly || [];
	const kelembagaan = data?.composition?.kelembagaan || [];
	const profil = data?.composition?.profil_desa || null;
	const totalKelembagaan = kelembagaan.reduce((sum, row) => sum + row.total, 0);

	const formatValue = useCallback(
		(value) => (showAmount ? rupiahRingkas(value) : fmt(value)),
		[showAmount]
	);

	const exportCsv = useCallback(() => {
		if (!series.length) return;
		const header = ['Bulan', ...series.map((item) => `${item.label} (${item.unit})`)];
		const rows = (data?.labels || []).map((month, index) => [
			longMonth(month),
			...series.map((item) => item.points[index]?.value ?? 0),
		]);
		const csv = [header, ...rows]
			.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
			.join('\n');
		// BOM di depan supaya Excel membaca UTF-8 dengan benar.
		const blob = new Blob([String.fromCharCode(0xfeff) + csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `analisis-trend-${data?.range?.start}-sd-${data?.range?.end}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	}, [series, data]);

	// ---------- Loading ----------
	if (loading && !data) {
		return (
			<div className="p-4 sm:p-6">
				<div className="mx-auto max-w-7xl space-y-5">
					<div className="h-44 animate-pulse rounded-2xl bg-slate-200/70" />
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{[0, 1, 2, 3].map((key) => (
							<div key={key} className="h-40 animate-pulse rounded-2xl bg-white/80" />
						))}
					</div>
					<div className="h-96 animate-pulse rounded-2xl bg-white/80" />
				</div>
			</div>
		);
	}

	// ---------- Error ----------
	if (error) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center p-4">
				<div className="w-full max-w-md rounded-2xl border border-rose-100 bg-white p-8 text-center shadow-lg">
					<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50">
						<AlertCircle className="h-7 w-7 text-rose-500" />
					</div>
					<h2 className="text-lg font-bold text-slate-900">Gagal memuat data trend</h2>
					<p className="mt-2 text-sm text-slate-600">{error}</p>
					<button
						onClick={fetchTrends}
						className="mt-5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
					>
						Coba Lagi
					</button>
				</div>
			</div>
		);
	}

	const toggleClass = (isOn) =>
		`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
			isOn ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
		}`;

	return (
		<div className="p-4 sm:p-6">
			{/* Animasi lokal halaman ini */}
			<style>{`
				@keyframes trend-enter { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
				@keyframes trend-draw { from { stroke-dashoffset: 260; } to { stroke-dashoffset: 0; } }
				@keyframes trend-aurora { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(18px,-14px,0) scale(1.15); } }
				.trend-enter { animation: trend-enter .55s cubic-bezier(.22,1,.36,1) both; }
				.trend-draw { stroke-dasharray: 260; animation: trend-draw 1.1s ease-out both; }
				.trend-aurora { animation: trend-aurora 9s ease-in-out infinite; }
				@media (prefers-reduced-motion: reduce) {
					.trend-enter, .trend-draw, .trend-aurora { animation: none !important; }
					.trend-draw { stroke-dasharray: none; }
				}
			`}</style>

			<div className="mx-auto max-w-7xl space-y-6">
				{/* ---------- Header ---------- */}
				<header className="trend-enter relative overflow-hidden rounded-2xl bg-slate-900 p-6 text-white shadow-sm sm:p-8">
					<div className="trend-aurora pointer-events-none absolute -right-10 -top-24 h-64 w-64 rounded-full bg-slate-800/30 blur-3xl" />
					<div
						className="trend-aurora pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-white/25 blur-3xl"
						style={{ animationDelay: '1.6s' }}
					/>

					<button
						onClick={() => navigate('/core-dashboard/dashboard')}
						className="relative mb-5 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white"
					>
						<ArrowLeft className="h-4 w-4" />
						Kembali ke Dashboard
					</button>

					<div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
						<div className="flex items-start gap-4">
							<span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
								<Activity className="h-7 w-7" />
							</span>
							<div>
								<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
									Core Dashboard DPMD
								</p>
								<h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Analisis Trend</h1>
								<p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/75">
									<CalendarRange className="h-4 w-4" />
									{longMonth(data?.range?.start)} &ndash; {longMonth(data?.range?.end)}
									<span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium">
										{series.length} modul &middot; data aktual dari tanggal kejadian
									</span>
								</p>
							</div>
						</div>

						<div className="flex flex-wrap items-center gap-2">
							<div className="flex rounded-xl bg-white/10 p-1 backdrop-blur-sm">
								{PERIOD_OPTIONS.map((option) => (
									<button
										key={option.months}
										type="button"
										onClick={() => setMonths(option.months)}
										className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
											months === option.months
												? 'bg-white text-brand-700 shadow'
												: 'text-white/75 hover:text-white'
										}`}
									>
										{option.label}
									</button>
								))}
							</div>
							<button
								type="button"
								onClick={exportCsv}
								className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-white/20"
								title="Unduh deret bulanan seluruh modul sebagai CSV"
							>
								<Download className="h-4 w-4" />
								<span className="hidden sm:inline">CSV</span>
							</button>
							<button
								type="button"
								onClick={fetchTrends}
								disabled={loading}
								className="rounded-xl bg-white/10 p-2.5 backdrop-blur-sm transition-colors hover:bg-white/20 disabled:opacity-50"
								title="Muat ulang"
							>
								<RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
							</button>
						</div>
					</div>
				</header>

				{/* ---------- Filter modul ---------- */}
				{availableModules.length > 2 && (
					<div className="flex flex-wrap items-center gap-2">
						{availableModules.map((module) => {
							const Icon = module.icon;
							const isOn = moduleFilter === module.key;
							const count =
								module.key === 'all'
									? series.length
									: series.filter((item) => item.module === module.key).length;
							return (
								<button
									key={module.key}
									type="button"
									onClick={() => setModuleFilter(module.key)}
									aria-pressed={isOn}
									className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${
										isOn
											? 'border-slate-900 bg-slate-900 text-white shadow-sm'
											: 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
									}`}
								>
									<Icon className="h-4 w-4" />
									{module.label}
									<span className={`text-[11px] ${isOn ? 'text-white/60' : 'text-slate-400'}`}>{count}</span>
								</button>
							);
						})}
					</div>
				)}

				{/* ---------- Kartu metrik ---------- */}
				<section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{visibleSeries.map((item, index) => (
						<MetricCard
							key={item.key}
							series={item}
							active={item.key === activeKey}
							onSelect={() => setActiveKey(item.key)}
							index={index}
						/>
					))}
				</section>

				{/* ---------- Grafik utama ---------- */}
				{active && (
					<section className="trend-enter rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
						<div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
							<div className="min-w-0">
								<div className="flex flex-wrap items-center gap-2">
									<span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: activeColor }} />
									<h2 className="text-lg font-bold text-slate-900">{active.label}</h2>
									<DeltaBadge value={active.growth} hasBaseline={active.has_baseline} />
								</div>
								<p className="mt-1 max-w-2xl text-sm text-slate-500">{active.description}</p>
								<p className="mt-1 text-xs text-slate-400">Basis perhitungan: {active.basis}</p>
							</div>

							<div className="flex flex-wrap items-center gap-2">
								{hasAmount && (
									<div className="flex rounded-xl border border-slate-200 bg-white p-1">
										{[
											{ key: 'count', label: 'Jumlah' },
											{ key: 'amount', label: 'Rupiah' },
										].map((option) => (
											<button
												key={option.key}
												type="button"
												onClick={() => setMetric(option.key)}
												className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
													metric === option.key
														? 'bg-slate-900 text-white'
														: 'text-slate-500 hover:text-slate-900'
												}`}
											>
												{option.label}
											</button>
										))}
									</div>
								)}
								<button
									type="button"
									onClick={() => setChartKind((prev) => (prev === 'area' ? 'bar' : 'area'))}
									className={toggleClass(false)}
									title="Ganti bentuk grafik"
								>
									{chartKind === 'area' ? (
										<>
											<BarChart3 className="h-4 w-4" /> Batang
										</>
									) : (
										<>
											<LineChartIcon className="h-4 w-4" /> Area
										</>
									)}
								</button>
								<button
									type="button"
									onClick={() => setShowAverageLine((prev) => !prev)}
									className={toggleClass(showAverageLine)}
								>
									<Activity className="h-4 w-4" />
									Rata-rata &amp; tren
								</button>
								<button
									type="button"
									onClick={() => setComparing((prev) => !prev)}
									disabled={!active.has_baseline}
									className={`${toggleClass(comparing)} disabled:cursor-not-allowed disabled:opacity-40`}
									title={
										active.has_baseline
											? 'Tumpangkan deret periode sebelumnya'
											: 'Modul ini belum punya data pada periode pembanding'
									}
								>
									<GitCompareArrows className="h-4 w-4" />
									Periode lalu
								</button>
								<button
									type="button"
									onClick={() => setShowTable((prev) => !prev)}
									className={toggleClass(showTable)}
								>
									<Table2 className="h-4 w-4" />
									Tabel
								</button>
							</div>
						</div>

						{/* Legenda — identitas tidak pernah hanya lewat warna */}
						<div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
							<span className="inline-flex items-center gap-1.5">
								<span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: activeColor }} />
								{showAmount ? active.amount_label || 'Nilai (Rupiah)' : `${active.label} (${active.unit})`}
							</span>
							{showAverageLine && (
								<span className="inline-flex items-center gap-1.5">
									<svg width="20" height="8" aria-hidden="true">
										<line x1="0" y1="4" x2="20" y2="4" stroke={INK.trend} strokeWidth="2" strokeDasharray="6 3" />
									</svg>
									Rata-rata bergerak 3 bulan
								</span>
							)}
							{comparing && active.has_baseline && !showAmount && (
								<span className="inline-flex items-center gap-1.5">
									<svg width="20" height="8" aria-hidden="true">
										<line x1="0" y1="4" x2="20" y2="4" stroke={INK.ghost} strokeWidth="2" strokeDasharray="5 4" />
									</svg>
									Periode sebelumnya
								</span>
							)}
							{comparing && active.has_baseline && showAmount && (
								<span className="text-slate-400">
									Pembanding periode lalu hanya tersedia dalam jumlah, bukan rupiah.
								</span>
							)}
						</div>

						<div className="h-[340px] w-full">
							<ResponsiveContainer width="100%" height="100%">
								<ComposedChart data={chartData} margin={{ top: 10, right: 12, bottom: 0, left: showAmount ? 8 : -12 }}>
									<defs>
										<linearGradient id="main-area" x1="0" y1="0" x2="0" y2="1">
											<stop offset="0%" stopColor={activeColor} stopOpacity={0.35} />
											<stop offset="100%" stopColor={activeColor} stopOpacity={0.02} />
										</linearGradient>
									</defs>
									<CartesianGrid strokeDasharray="3 3" stroke={INK.grid} vertical={false} />
									<XAxis
										dataKey="label"
										tick={{ fontSize: 11, fill: INK.muted }}
										tickLine={false}
										axisLine={{ stroke: INK.axis }}
										interval="preserveStartEnd"
										minTickGap={12}
									/>
									<YAxis
										tick={{ fontSize: 11, fill: INK.muted }}
										tickLine={false}
										axisLine={false}
										width={showAmount ? 72 : 48}
										tickFormatter={(value) => (showAmount ? rupiahRingkas(value) : fmt(value))}
									/>
									<Tooltip
										cursor={
											chartKind === 'bar'
												? { fill: `${activeColor}0f` }
												: { stroke: activeColor, strokeWidth: 1, strokeDasharray: '4 4' }
										}
										content={({ active: hovered, payload }) => {
											if (!hovered || !payload?.length) return null;
											const row = payload[0].payload;
											return (
												<TooltipShell title={longMonth(row.month)}>
													<TooltipRow
														swatch={activeColor}
														label={showAmount ? 'Nilai' : active.unit}
														value={formatValue(row.value)}
													/>
													{showAmount && (
														<TooltipRow swatch={INK.ghost} label={active.unit} value={fmt(row.count)} />
													)}
													{showAverageLine && (
														<TooltipRow swatch={INK.trend} label="Rata-rata 3 bln" value={fmt(row.ma)} dashed />
													)}
													{comparing && active.has_baseline && !showAmount && (
														<TooltipRow swatch={INK.ghost} label="Periode lalu" value={fmt(row.prev)} dashed />
													)}
												</TooltipShell>
											);
										}}
									/>
									{showAverageLine && (
										<ReferenceLine
											y={chartAverage}
											stroke={INK.axis}
											strokeDasharray="5 5"
											label={{
												value: `rata-rata ${formatValue(chartAverage)}`,
												position: 'insideTopRight',
												fill: INK.muted,
												fontSize: 11,
											}}
										/>
									)}
									{comparing && active.has_baseline && !showAmount && (
										<Line
											type="monotone"
											dataKey="prev"
											stroke={INK.ghost}
											strokeWidth={2}
											strokeDasharray="5 4"
											dot={false}
											animationDuration={700}
										/>
									)}
									{chartKind === 'area' ? (
										<Area
											type="monotone"
											dataKey="value"
											stroke={activeColor}
											strokeWidth={2.5}
											fill="url(#main-area)"
											dot={{ r: 3, fill: '#fff', stroke: activeColor, strokeWidth: 2 }}
											activeDot={{ r: 6, fill: activeColor, stroke: '#fff', strokeWidth: 2 }}
											animationDuration={1100}
										/>
									) : (
										<Bar
											dataKey="value"
											fill={activeColor}
											radius={[4, 4, 0, 0]}
											maxBarSize={38}
											animationDuration={900}
										/>
									)}
									{showAverageLine && (
										<Line
											type="monotone"
											dataKey="ma"
											stroke={INK.trend}
											strokeWidth={2}
											strokeDasharray="6 3"
											dot={false}
											animationDuration={900}
										/>
									)}
								</ComposedChart>
							</ResponsiveContainer>
						</div>

						<div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-5">
							{[
								{
									label: showAmount ? 'Total nilai periode ini' : 'Total periode ini',
									value: showAmount ? rupiahRingkas(active.amount_total) : fmt(active.total),
								},
								{
									label: showAmount ? 'Rata-rata nilai / bulan' : 'Rata-rata / bulan',
									value: showAmount ? rupiahRingkas(chartAverage) : fmt(active.average),
								},
								{
									label: 'Bulan tertinggi',
									value: `${shortMonth(active.peak.month)} (${fmt(active.peak.value)})`,
								},
								{ label: 'Bulan berjalan', value: fmt(active.latest) },
								{
									label: 'Bulan ada aktivitas',
									value: `${active.active_months}/${active.points.length}`,
								},
							].map((item) => (
								<div key={item.label}>
									<p className="text-[11px] uppercase tracking-wider text-brand-600">{item.label}</p>
									<p className="mt-0.5 text-sm font-bold text-slate-900">{item.value}</p>
								</div>
							))}
						</div>

						{/* Tabel — pendamping grafik agar angka tetap terbaca tanpa warna */}
						{showTable && (
							<div className="mt-4 max-h-72 overflow-auto rounded-xl border border-slate-200">
								<table className="w-full text-sm">
									<thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wider text-brand-600">
										<tr>
											<th className="px-3 py-2 font-semibold">Bulan</th>
											<th className="px-3 py-2 text-right font-semibold">{active.unit}</th>
											{hasAmount && <th className="px-3 py-2 text-right font-semibold">Nilai</th>}
											<th className="px-3 py-2 text-right font-semibold">Rata-rata 3 bln</th>
											{active.has_baseline && (
												<th className="px-3 py-2 text-right font-semibold">Periode lalu</th>
											)}
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-100">
										{chartData.map((row) => (
											<tr key={row.month} className="hover:bg-slate-50">
												<td className="px-3 py-2 text-slate-700">{longMonth(row.month)}</td>
												<td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900">
													{fmt(row.count)}
												</td>
												{hasAmount && (
													<td className="px-3 py-2 text-right tabular-nums text-slate-600">
														{rupiahPenuh(row.amount)}
													</td>
												)}
												<td className="px-3 py-2 text-right tabular-nums text-slate-600">{fmt(row.ma)}</td>
												{active.has_baseline && (
													<td className="px-3 py-2 text-right tabular-nums text-slate-600">{fmt(row.prev)}</td>
												)}
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</section>
				)}

				{/* ---------- Small multiples ---------- */}
				{visibleSeries.length > 1 && (
					<section>
						<SectionHeading
							icon={Layers}
							title="Semua Modul Berdampingan"
							hint="Skala tiap modul berbeda jauh — sengaja dipisah per kartu agar tidak menyesatkan. Samakan skala untuk membandingkan bentuk kurvanya."
						>
							<button
								type="button"
								onClick={() => setNormalizedMini((prev) => !prev)}
								className={toggleClass(normalizedMini)}
							>
								<Gauge className="h-4 w-4" />
								{normalizedMini ? 'Skala asli' : 'Samakan skala (% dari puncak)'}
							</button>
						</SectionHeading>
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
							{visibleSeries.map((item, index) => (
								<MiniTrendCard
									key={item.key}
									series={item}
									active={item.key === activeKey}
									onSelect={() => setActiveKey(item.key)}
									index={index}
									normalized={normalizedMini}
								/>
							))}
						</div>
					</section>
				)}

				{/* ---------- Progresi penyaluran ---------- */}
				{stages.length > 0 && (moduleFilter === 'all' || moduleFilter === 'keuangan') && (
					<section>
						<SectionHeading
							icon={Wallet}
							title="Progresi Penyaluran Keuangan Desa"
							hint="ADD, BHPRD, DD dan Bankeu direkap per tahap tanpa kolom tanggal — jadi yang bisa dibaca progresinya antar tahap, bukan deret bulanan."
						>
							<p className="text-sm text-slate-500">
								Total realisasi <span className="font-bold text-slate-900">{rupiahRingkas(totalRealisasi)}</span>
							</p>
						</SectionHeading>
						<div className="grid gap-4 sm:grid-cols-2">
							{stages.map((group, index) => (
								<StageGroupCard key={group.key} group={group} index={index} />
							))}
						</div>
					</section>
				)}

				{/* ---------- Deret tahunan ---------- */}
				{yearly.length > 0 && moduleFilter === 'all' && (
					<section>
						<SectionHeading
							icon={Sprout}
							title="Pandangan Jangka Panjang (per Tahun)"
							hint="Sepuluh tahun terakhir. BUMDes hanya menyimpan tahun pendirian, bukan tanggal, jadi memang hanya bisa tahunan."
						/>
						<div className="grid gap-4 lg:grid-cols-3">
							{yearly.map((item, index) => (
								<YearlyCard key={item.key} series={item} index={index} />
							))}
						</div>
					</section>
				)}

				{/* ---------- Komposisi & kelengkapan ---------- */}
				{moduleFilter === 'all' && (kelembagaan.length > 0 || profil?.fields?.length > 0) && (
					<section className="grid gap-4 lg:grid-cols-2">
						{kelembagaan.length > 0 && (
							<div className="trend-enter rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
								<SectionHeading
									icon={Building2}
									title="Komposisi Lembaga Desa"
									hint={`${fmt(totalKelembagaan)} lembaga terdata di seluruh Kabupaten Bogor.`}
								/>
								<BarList
									rows={kelembagaan.map((row) => ({ label: row.label, value: row.total, ...row }))}
									color={SLOT_COLOR[4]}
									captionFor={(row) =>
										`${fmt(row.aktif)} aktif · ${fmt(row.terverifikasi)} terverifikasi`
									}
								/>
							</div>
						)}

						{profil?.fields?.length > 0 && (
							<div className="trend-enter rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
								<SectionHeading
									icon={Landmark}
									title="Kelengkapan Profil Desa"
									hint={`${fmt(profil.total_profil)} dari ${fmt(profil.total_desa)} desa/kelurahan sudah membuat profil. Profil desa tidak menyimpan riwayat perubahan, jadi yang bisa diukur kelengkapannya hari ini.`}
								/>
								<BarList
									rows={profil.fields.map((field) => ({ label: field.label, value: field.terisi, ...field }))}
									color={SLOT_COLOR[1]}
									captionFor={(row) => `${row.persen}% dari ${fmt(profil.total_desa)} desa`}
								/>
							</div>
						)}
					</section>
				)}

				{/* ---------- Insight otomatis ---------- */}
				{active && (
					<section>
						<SectionHeading icon={Sparkles} title="Bacaan Otomatis" />
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
							<InsightCard icon={Flame} tone="bg-orange-50 text-orange-600" title="Bulan Paling Sibuk" index={0}>
								Aktivitas <strong>{(active.short_label || active.label).toLowerCase()}</strong> memuncak pada{' '}
								<strong>{longMonth(active.peak.month)}</strong> dengan {fmt(active.peak.value)} {active.unit} &mdash;{' '}
								{active.average > 0
									? `${Math.round((active.peak.value / active.average) * 10) / 10}×`
									: '—'}{' '}
								lipat dari rata-rata bulanan.
							</InsightCard>

							<InsightCard
								icon={GitCompareArrows}
								tone="bg-slate-100 text-brand-600"
								title="Dibanding Periode Lalu"
								index={1}
							>
								{active.has_baseline ? (
									<>
										{fmt(active.total)} {active.unit} pada {months} bulan terakhir, dibanding{' '}
										{fmt(active.previous_total)} pada {months} bulan sebelumnya (
										{longMonth(data?.range?.previous_start)} &ndash; {longMonth(data?.range?.previous_end)}).
										Selisihnya <strong>{active.growth}%</strong>.
									</>
								) : (
									<>
										Modul ini belum punya data sama sekali pada {longMonth(data?.range?.previous_start)} &ndash;{' '}
										{longMonth(data?.range?.previous_end)}, jadi angkanya belum bisa dibandingkan &mdash;{' '}
										{fmt(active.total)} {active.unit} periode ini adalah basis awalnya.
									</>
								)}
							</InsightCard>

							{momentum && (
								<InsightCard icon={Activity} tone="bg-emerald-50 text-emerald-600" title="Momentum Terkini" index={2}>
									{momentum.half} bulan terakhir mencatat {fmt(momentum.recent)} {active.unit}, sementara{' '}
									{momentum.earlierMonths} bulan sebelumnya {fmt(momentum.earlier)}. Momentumnya{' '}
									<strong>
										{momentum.delta > 0 ? 'menguat' : momentum.delta < 0 ? 'melemah' : 'datar'}
									</strong>{' '}
									({momentum.delta}%).
								</InsightCard>
							)}

							{busiest && (
								<InsightCard icon={Layers} tone="bg-slate-100 text-brand-600" title="Modul Tersibuk" index={3}>
									Dari {series.length} modul yang dipantau, <strong>{busiest.label}</strong> paling banyak bergerak
									dengan {fmt(busiest.total)} {busiest.unit} dalam {months} bulan terakhir.
									{fastestGrowing && fastestGrowing.key !== busiest.key && (
										<>
											{' '}
											Pertumbuhan tercepat dipegang <strong>{fastestGrowing.label}</strong> ({fastestGrowing.growth}
											%).
										</>
									)}
								</InsightCard>
							)}

							{totalRealisasi > 0 && (
								<InsightCard icon={Wallet} tone="bg-slate-100 text-brand-600" title="Uang yang Sudah Jalan" index={4}>
									Rekap penyaluran ADD, BHPRD, DD dan Bankeu menunjukkan{' '}
									<strong>{rupiahRingkas(totalRealisasi)}</strong> realisasi di seluruh tahap. Persentase pencairan
									tertinggi ada di{' '}
									<strong>
										{stages.reduce((best, group) => (group.persen_cair > (best?.persen_cair ?? -1) ? group : best), null)
											?.label}
									</strong>
									.
								</InsightCard>
							)}

							<InsightCard icon={Info} tone="bg-slate-100 text-slate-600" title="Cara Membaca Halaman Ini" index={5}>
								Deret bulanan dihitung dari tanggal kejadian aslinya &mdash; SK pengangkatan aparatur, tanggal
								penetapan produk hukum, tanggal mulai perjalanan dinas, tanggal usulan bankeu, tanggal pendataan
								lembaga. Modul yang sumbernya tidak menyimpan tanggal (rekap penyaluran, BUMDes, profil desa)
								ditampilkan pada bagiannya sendiri, bukan dipaksa jadi grafik bulanan.
							</InsightCard>
						</div>
					</section>
				)}

				<p className="pb-2 text-center text-xs text-slate-400">
					Diperbarui {data?.generated_at ? new Date(data.generated_at).toLocaleString('id-ID') : '-'}
				</p>
			</div>
		</div>
	);
};

export default TrendsPage;
