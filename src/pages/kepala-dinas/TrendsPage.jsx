// src/pages/kepala-dinas/TrendsPage.jsx
// Analisis Trend — deret waktu ASLI dari tanggal kejadian di database
// (GET /kepala-dinas/trends). Bukan total yang dibagi rata per bulan.
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
	Scale,
	Plane,
	Store,
	Sparkles,
	Flame,
	Minus,
	GitCompareArrows,
	AlertCircle,
	CalendarRange,
} from 'lucide-react';
import api from '../../api';

// ============================================================
// Konstanta tampilan
// ============================================================
// Palet tervalidasi CVD-safe (slot 1/2/3/7) — jangan diganti asal.
const SERIES_META = {
	aparatur: { color: '#2a78d6', soft: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-500', icon: Users },
	produk_hukum: { color: '#eb6834', soft: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-500', icon: Scale },
	perjadin: { color: '#1baf7a', soft: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-500', icon: Plane },
};
const BUMDES_COLOR = '#4a3aa7';
const FALLBACK_META = { color: '#2a78d6', soft: 'bg-slate-50', text: 'text-slate-700', ring: 'ring-slate-400', icon: Activity };

const PERIOD_OPTIONS = [
	{ months: 6, label: '6 Bulan' },
	{ months: 12, label: '12 Bulan' },
	{ months: 24, label: '24 Bulan' },
];

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const fmt = (n) => Number(n ?? 0).toLocaleString('id-ID');

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
	const names = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
	const index = Number(month) - 1;
	if (Number.isNaN(index) || !names[index]) return value;
	return `${names[index]} ${year}`;
};

const growth = (current, previous) => {
	if (!previous) return current > 0 ? 100 : 0;
	return Math.round(((current - previous) / previous) * 1000) / 10;
};

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
			const next = Math.round(from + (target - from) * eased);
			setValue(next);
			if (progress < 1) frame = requestAnimationFrame(tick);
			else fromRef.current = target;
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [target, duration, reduced]);

	return value;
};

// ============================================================
// Potongan UI
// ============================================================
const DeltaBadge = ({ value, size = 'sm' }) => {
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
				size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-[11px]'
			}`}
		>
			<Icon className={size === 'lg' ? 'h-4 w-4' : 'h-3 w-3'} />
			{flat ? 'stabil' : `${up ? '+' : ''}${value}%`}
		</span>
	);
};

/** Sparkline SVG murni — garis + area gradient, dengan animasi gambar. */
const Sparkline = ({ points = [], color = '#2a78d6', width = 132, height = 40, animate = true, id }) => {
	const values = points.map((point) => (typeof point === 'number' ? point : point.value));
	const path = useMemo(() => {
		if (values.length < 2) return null;
		const max = Math.max(...values, 1);
		const min = Math.min(...values, 0);
		const span = max - min || 1;
		const stepX = width / (values.length - 1);
		const coords = values.map((value, index) => {
			const x = index * stepX;
			const y = height - ((value - min) / span) * (height - 6) - 3;
			return [x, y];
		});
		const line = coords.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
		const area = `${line} L${width},${height} L0,${height} Z`;
		return { line, area, last: coords[coords.length - 1] };
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

const ChartTooltip = ({ active, payload, label, unit, comparing }) => {
	if (!active || !payload?.length) return null;
	const current = payload.find((item) => item.dataKey === 'value');
	const previous = payload.find((item) => item.dataKey === 'prev');

	return (
		<div className="rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2.5 shadow-xl backdrop-blur">
			<p className="text-xs font-semibold text-slate-900">{longMonth(label)}</p>
			<p className="mt-1 flex items-center gap-2 text-sm">
				<span className="h-2 w-2 rounded-full" style={{ backgroundColor: current?.color }} />
				<span className="font-bold text-slate-900">{fmt(current?.value)}</span>
				<span className="text-slate-500">{unit}</span>
			</p>
			{comparing && previous && (
				<p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
					<span className="h-2 w-2 rounded-full bg-slate-300" />
					Periode lalu: <span className="font-semibold text-slate-700">{fmt(previous.value)}</span>
				</p>
			)}
		</div>
	);
};

const MetricCard = ({ series, meta, active, onSelect, index }) => {
	const Icon = meta.icon;
	const delta = growth(series.total, series.previous_total);
	const animatedTotal = useCountUp(series.total);

	return (
		<button
			type="button"
			onClick={onSelect}
			style={{ animationDelay: `${index * 70}ms` }}
			className={`trend-enter group relative overflow-hidden rounded-2xl border bg-white p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
				active ? `border-transparent shadow-lg ring-2 ${meta.ring}` : 'border-slate-200 shadow-sm'
			}`}
		>
			<span
				className="absolute inset-x-0 top-0 h-1 origin-left transition-transform duration-300"
				style={{ backgroundColor: meta.color, transform: active ? 'scaleX(1)' : 'scaleX(0)' }}
			/>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<span className={`flex h-8 w-8 items-center justify-center rounded-lg ${meta.soft} ${meta.text}`}>
							<Icon className="h-4 w-4" />
						</span>
						<p className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500">{series.label}</p>
					</div>
					<p className="mt-2.5 text-3xl font-bold tracking-tight text-slate-900">{fmt(animatedTotal)}</p>
					<p className="mt-0.5 text-xs text-slate-500">
						{series.unit} &middot; rata-rata {fmt(series.average)}/bulan
					</p>
				</div>
				<Sparkline points={series.points} color={meta.color} id={series.key} width={96} height={38} />
			</div>
			<div className="mt-3 flex items-center gap-2">
				<DeltaBadge value={delta} />
				<span className="text-[11px] text-slate-400">vs periode sebelumnya</span>
			</div>
		</button>
	);
};

const InsightCard = ({ icon: Icon, tone, title, children, index = 0 }) => (
	<div
		style={{ animationDelay: `${index * 80}ms` }}
		className="trend-enter rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
	>
		<div className="flex items-center gap-3">
			<span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
				<Icon className="h-4.5 w-4.5" />
			</span>
			<h3 className="text-sm font-semibold text-slate-900">{title}</h3>
		</div>
		<p className="mt-3 text-sm leading-6 text-slate-600">{children}</p>
	</div>
);

const MiniTrendCard = ({ series, meta, active, onSelect, index }) => {
	const Icon = meta.icon;
	const data = series.points.map((point) => ({ ...point, label: shortMonth(point.month) }));

	return (
		<button
			type="button"
			onClick={onSelect}
			style={{ animationDelay: `${index * 70}ms` }}
			className={`trend-enter rounded-2xl border bg-white p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
				active ? 'border-slate-300 shadow-md' : 'border-slate-200 shadow-sm'
			}`}
		>
			<div className="mb-2 flex items-center justify-between gap-2">
				<span className="flex items-center gap-2 text-xs font-semibold text-slate-700">
					<Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
					{series.label}
				</span>
				<span className="text-xs font-bold text-slate-900">{fmt(series.total)}</span>
			</div>
			<div className="h-[70px]">
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart data={data} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
						<defs>
							<linearGradient id={`mini-${series.key}`} x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stopColor={meta.color} stopOpacity={0.3} />
								<stop offset="100%" stopColor={meta.color} stopOpacity={0} />
							</linearGradient>
						</defs>
						<Tooltip
							cursor={{ stroke: meta.color, strokeWidth: 1, strokeDasharray: '3 3' }}
							content={<ChartTooltip unit={series.unit} />}
						/>
						<Area
							type="monotone"
							dataKey="value"
							stroke={meta.color}
							strokeWidth={2}
							fill={`url(#mini-${series.key})`}
							animationDuration={900}
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>
			<p className="mt-1 text-[11px] text-slate-400">
				Puncak {shortMonth(series.peak.month)} &middot; {fmt(series.peak.value)}
			</p>
		</button>
	);
};

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
	const [comparing, setComparing] = useState(false);
	const [hoverYear, setHoverYear] = useState(null);

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

	const series = data?.series || [];
	const active = series.find((item) => item.key === activeKey) || series[0] || null;
	const activeMeta = (active && SERIES_META[active.key]) || FALLBACK_META;

	const chartData = useMemo(() => {
		if (!active) return [];
		return active.points.map((point, index) => ({
			month: point.month,
			label: shortMonth(point.month),
			value: point.value,
			prev: active.previous_points?.[index] ?? 0,
		}));
	}, [active]);

	const momentum = useMemo(() => {
		if (!active || active.points.length < 6) return null;
		const values = active.points.map((point) => point.value);
		const half = Math.floor(values.length / 2);
		const recent = values.slice(-half).reduce((sum, value) => sum + value, 0);
		const earlier = values.slice(0, values.length - half).reduce((sum, value) => sum + value, 0);
		return { recent, earlier, delta: growth(recent, earlier), half };
	}, [active]);

	const bumdes = data?.bumdes_per_tahun || [];
	const bumdesTotal = bumdes.reduce((sum, item) => sum + item.value, 0);
	const bumdesPeak = bumdes.reduce((best, item) => (item.value > (best?.value ?? -1) ? item : best), null);

	// ---------- Loading ----------
	if (loading && !data) {
		return (
			<div className="p-4 sm:p-6">
				<div className="mx-auto max-w-7xl space-y-5">
					<div className="h-40 animate-pulse rounded-3xl bg-slate-200/70" />
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{[0, 1, 2].map((key) => (
							<div key={key} className="h-36 animate-pulse rounded-2xl bg-white/80" />
						))}
					</div>
					<div className="h-96 animate-pulse rounded-3xl bg-white/80" />
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

			<div className="mx-auto max-w-7xl space-y-5">
				{/* ---------- Header ---------- */}
				<header className="trend-enter relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 p-6 text-white shadow-xl sm:p-8">
					<div className="trend-aurora pointer-events-none absolute -right-10 -top-24 h-64 w-64 rounded-full bg-cyan-400/30 blur-3xl" />
					<div
						className="trend-aurora pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-fuchsia-400/25 blur-3xl"
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
								<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Core Dashboard DPMD</p>
								<h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Analisis Trend</h1>
								<p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/75">
									<CalendarRange className="h-4 w-4" />
									{longMonth(data?.range?.start)} &ndash; {longMonth(data?.range?.end)}
									<span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium">
										data aktual dari tanggal kejadian
									</span>
								</p>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<div className="flex rounded-xl bg-white/10 p-1 backdrop-blur-sm">
								{PERIOD_OPTIONS.map((option) => (
									<button
										key={option.months}
										type="button"
										onClick={() => setMonths(option.months)}
										className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
											months === option.months
												? 'bg-white text-indigo-700 shadow'
												: 'text-white/75 hover:text-white'
										}`}
									>
										{option.label}
									</button>
								))}
							</div>
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

				{/* ---------- Kartu metrik (klik untuk ganti grafik utama) ---------- */}
				<section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{series.map((item, index) => (
						<MetricCard
							key={item.key}
							series={item}
							meta={SERIES_META[item.key] || FALLBACK_META}
							active={item.key === activeKey}
							onSelect={() => setActiveKey(item.key)}
							index={index}
						/>
					))}
				</section>

				{/* ---------- Grafik utama ---------- */}
				{active && (
					<section className="trend-enter rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
						<div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
							<div>
								<div className="flex items-center gap-2">
									<span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: activeMeta.color }} />
									<h2 className="text-lg font-bold text-slate-900">{active.label}</h2>
									<DeltaBadge value={growth(active.total, active.previous_total)} />
								</div>
								<p className="mt-1 max-w-2xl text-sm text-slate-500">{active.description}</p>
							</div>
							<button
								type="button"
								onClick={() => setComparing((prev) => !prev)}
								className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${
									comparing
										? 'border-slate-900 bg-slate-900 text-white'
										: 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
								}`}
							>
								<GitCompareArrows className="h-4 w-4" />
								Bandingkan periode lalu
							</button>
						</div>

						<div className="h-[340px] w-full">
							<ResponsiveContainer width="100%" height="100%">
								<ComposedChart data={chartData} margin={{ top: 10, right: 12, bottom: 0, left: -12 }}>
									<defs>
										<linearGradient id="main-area" x1="0" y1="0" x2="0" y2="1">
											<stop offset="0%" stopColor={activeMeta.color} stopOpacity={0.35} />
											<stop offset="100%" stopColor={activeMeta.color} stopOpacity={0.02} />
										</linearGradient>
									</defs>
									<CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
									<XAxis
										dataKey="label"
										tick={{ fontSize: 11, fill: '#94a3b8' }}
										tickLine={false}
										axisLine={{ stroke: '#e2e8f0' }}
										interval="preserveStartEnd"
										minTickGap={12}
									/>
									<YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={48} />
									<Tooltip
										cursor={{ stroke: activeMeta.color, strokeWidth: 1, strokeDasharray: '4 4' }}
										content={<ChartTooltip unit={active.unit} comparing={comparing} />}
									/>
									<ReferenceLine
										y={active.average}
										stroke="#cbd5e1"
										strokeDasharray="5 5"
										label={{
											value: `rata-rata ${fmt(active.average)}`,
											position: 'insideTopRight',
											fill: '#94a3b8',
											fontSize: 11,
										}}
									/>
									{comparing && (
										<Line
											type="monotone"
											dataKey="prev"
											stroke="#cbd5e1"
											strokeWidth={2}
											strokeDasharray="5 4"
											dot={false}
											animationDuration={700}
										/>
									)}
									<Area
										type="monotone"
										dataKey="value"
										stroke={activeMeta.color}
										strokeWidth={2.5}
										fill="url(#main-area)"
										dot={{ r: 3, fill: '#fff', stroke: activeMeta.color, strokeWidth: 2 }}
										activeDot={{ r: 6, fill: activeMeta.color, stroke: '#fff', strokeWidth: 2 }}
										animationDuration={1100}
									/>
								</ComposedChart>
							</ResponsiveContainer>
						</div>

						<div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
							{[
								{ label: 'Total periode ini', value: fmt(active.total) },
								{ label: 'Rata-rata / bulan', value: fmt(active.average) },
								{ label: 'Bulan tertinggi', value: `${shortMonth(active.peak.month)} (${fmt(active.peak.value)})` },
								{ label: 'Bulan berjalan', value: fmt(active.latest) },
							].map((item) => (
								<div key={item.label}>
									<p className="text-[11px] uppercase tracking-wider text-slate-400">{item.label}</p>
									<p className="mt-0.5 text-sm font-bold text-slate-900">{item.value}</p>
								</div>
							))}
						</div>
					</section>
				)}

				{/* ---------- Small multiples ---------- */}
				{series.length > 1 && (
					<section>
						<div className="mb-3 flex items-baseline justify-between gap-3">
							<h2 className="text-base font-semibold text-slate-900">Semua Modul Berdampingan</h2>
							<p className="text-xs text-slate-500">Skala tiap modul berbeda — sengaja dipisah agar tidak menyesatkan.</p>
						</div>
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{series.map((item, index) => (
								<MiniTrendCard
									key={item.key}
									series={item}
									meta={SERIES_META[item.key] || FALLBACK_META}
									active={item.key === activeKey}
									onSelect={() => setActiveKey(item.key)}
									index={index}
								/>
							))}
						</div>
					</section>
				)}

				{/* ---------- BUMDes per tahun ---------- */}
				{bumdes.length > 0 && (
					<section className="trend-enter rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
						<div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
							<div>
								<div className="flex items-center gap-2">
									<Store className="h-4 w-4" style={{ color: BUMDES_COLOR }} />
									<h2 className="text-lg font-bold text-slate-900">Pendirian BUMDes per Tahun</h2>
								</div>
								<p className="mt-1 text-sm text-slate-500">
									BUMDes hanya mencatat tahun pendirian, jadi ditampilkan tahunan &mdash; bukan bulanan.
								</p>
							</div>
							<p className="text-sm text-slate-500">
								<span className="font-bold text-slate-900">{fmt(bumdesTotal)}</span> BUMDes pada {bumdes.length} tahun terakhir
							</p>
						</div>

						<div className="h-[260px] w-full">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart
									data={bumdes}
									margin={{ top: 10, right: 8, bottom: 0, left: -16 }}
									onMouseLeave={() => setHoverYear(null)}
								>
									<CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
									<XAxis dataKey="year" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
									<YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={48} />
									<Tooltip
										cursor={{ fill: 'rgba(74,58,167,0.06)' }}
										content={({ active: isActive, payload, label }) =>
											isActive && payload?.length ? (
												<div className="rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2.5 shadow-xl backdrop-blur">
													<p className="text-xs font-semibold text-slate-900">Tahun {label}</p>
													<p className="mt-1 text-sm">
														<span className="font-bold text-slate-900">{fmt(payload[0].value)}</span>{' '}
														<span className="text-slate-500">BUMDes berdiri</span>
													</p>
												</div>
											) : null
										}
									/>
									<Bar
										dataKey="value"
										radius={[6, 6, 0, 0]}
										maxBarSize={46}
										animationDuration={900}
										onMouseEnter={(_, index) => setHoverYear(index)}
									>
										{bumdes.map((item, index) => (
											<Cell
												key={item.year}
												fill={BUMDES_COLOR}
												fillOpacity={hoverYear === null || hoverYear === index ? 1 : 0.35}
											/>
										))}
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						</div>
					</section>
				)}

				{/* ---------- Insight otomatis ---------- */}
				{active && (
					<section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						<InsightCard icon={Flame} tone="bg-orange-50 text-orange-600" title="Bulan Paling Sibuk" index={0}>
							Aktivitas <strong>{active.label.toLowerCase()}</strong> memuncak pada{' '}
							<strong>{longMonth(active.peak.month)}</strong> dengan {fmt(active.peak.value)} {active.unit} &mdash;{' '}
							{active.average > 0 ? `${Math.round((active.peak.value / active.average) * 10) / 10}×` : '—'} lipat dari
							rata-rata bulanan.
						</InsightCard>

						<InsightCard icon={GitCompareArrows} tone="bg-indigo-50 text-indigo-600" title="Dibanding Periode Lalu" index={1}>
							{fmt(active.total)} {active.unit} pada {months} bulan terakhir, dibanding{' '}
							{fmt(active.previous_total)} pada {months} bulan sebelumnya (
							{longMonth(data?.range?.previous_start)} &ndash; {longMonth(data?.range?.previous_end)}). Selisihnya{' '}
							<strong>{growth(active.total, active.previous_total)}%</strong>.
						</InsightCard>

						{momentum && (
							<InsightCard icon={Sparkles} tone="bg-emerald-50 text-emerald-600" title="Momentum Terkini" index={2}>
								{momentum.half} bulan terakhir mencatat {fmt(momentum.recent)} {active.unit}, sementara{' '}
								{active.points.length - momentum.half} bulan sebelumnya {fmt(momentum.earlier)}. Momentumnya{' '}
								<strong>{momentum.delta > 0 ? 'menguat' : momentum.delta < 0 ? 'melemah' : 'datar'}</strong> (
								{momentum.delta}%).
							</InsightCard>
						)}

						{bumdesPeak && (
							<InsightCard icon={Store} tone="bg-violet-50 text-violet-600" title="Puncak Pendirian BUMDes" index={3}>
								Tahun <strong>{bumdesPeak.year}</strong> jadi tahun terbanyak pendirian BUMDes dengan{' '}
								{fmt(bumdesPeak.value)} badan usaha baru.
							</InsightCard>
						)}

						<InsightCard icon={Activity} tone="bg-slate-100 text-slate-600" title="Cara Membaca Halaman Ini" index={4}>
							Setiap angka dihitung dari tanggal kejadian aslinya &mdash; SK pengangkatan aparatur, tanggal penetapan
							produk hukum, dan tanggal mulai perjalanan dinas. Modul dengan skala berbeda sengaja tidak digabung
							dalam satu sumbu.
						</InsightCard>
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
