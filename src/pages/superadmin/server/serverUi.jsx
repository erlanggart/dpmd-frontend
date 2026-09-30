// src/pages/superadmin/server/serverUi.jsx
//
// Komponen & format bersama halaman Manajemen Server. Warna seri grafik
// mengikuti palet kategorikal tervalidasi (biru, ungu, aqua, oranye), dan
// warna status (baik/waspada/kritis) dicadangkan khusus untuk kondisi —
// selalu disertai ikon + label, tidak pernah warna saja.

import React from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { FiAlertOctagon, FiAlertTriangle, FiCheckCircle, FiHelpCircle, FiInfo } from "react-icons/fi";

export const SERI = {
	biru: "#2a78d6",
	oranye: "#eb6834",
	aqua: "#1baf7a",
	kuning: "#eda100",
	magenta: "#e87ba4",
	hijau: "#008300",
	ungu: "#4a3aa7",
	merah: "#e34948",
};

export const STATUS_WARNA = {
	baik: { dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", icon: FiCheckCircle, label: "Normal" },
	waspada: { dot: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-800", ring: "ring-amber-200", icon: FiAlertTriangle, label: "Waspada" },
	kritis: { dot: "bg-red-500", bg: "bg-red-50", text: "text-red-700", ring: "ring-red-200", icon: FiAlertOctagon, label: "Kritis" },
	info: { dot: "bg-sky-500", bg: "bg-sky-50", text: "text-sky-700", ring: "ring-sky-200", icon: FiInfo, label: "Info" },
	netral: { dot: "bg-slate-400", bg: "bg-slate-100", text: "text-slate-600", ring: "ring-slate-200", icon: FiHelpCircle, label: "Tidak diketahui" },
};

export const SEVERITY = {
	critical: { label: "Kritis", warna: "#c62828", kelas: "bg-red-100 text-red-800 ring-red-200" },
	high: { label: "Tinggi", warna: "#eb6834", kelas: "bg-orange-100 text-orange-800 ring-orange-200" },
	medium: { label: "Sedang", warna: "#eda100", kelas: "bg-amber-100 text-amber-800 ring-amber-200" },
	low: { label: "Rendah", warna: "#94a3b8", kelas: "bg-slate-100 text-slate-700 ring-slate-200" },
};

export const pesanError = (error, cadangan = "Terjadi kesalahan.") =>
	error?.response?.data?.message || error?.message || cadangan;

export const formatBytes = (b, d = 1) => {
	if (b === null || b === undefined || Number.isNaN(Number(b))) return "-";
	const n = Number(b);
	if (n < 1024) return `${n} B`;
	const satuan = ["KB", "MB", "GB", "TB", "PB"];
	let v = n / 1024;
	let i = 0;
	while (v >= 1024 && i < satuan.length - 1) {
		v /= 1024;
		i += 1;
	}
	return `${v.toFixed(v >= 100 ? 0 : d)} ${satuan[i]}`;
};

export const formatRate = (b) => `${formatBytes(b)}/s`;

export const formatAngka = (n) =>
	n === null || n === undefined ? "-" : Number(n).toLocaleString("id-ID");

export const formatDurasi = (detik) => {
	if (detik === null || detik === undefined) return "-";
	const s = Math.max(0, Math.floor(detik));
	const h = Math.floor(s / 86400);
	const j = Math.floor((s % 86400) / 3600);
	const m = Math.floor((s % 3600) / 60);
	if (h) return `${h} hari ${j} jam`;
	if (j) return `${j} jam ${m} mnt`;
	if (m) return `${m} mnt`;
	return `${s} dtk`;
};

export const sejak = (tanggal) => {
	if (!tanggal) return "-";
	const t = new Date(tanggal).getTime();
	if (Number.isNaN(t)) return "-";
	return formatDurasi((Date.now() - t) / 1000);
};

export const formatWaktu = (t, opsi = {}) => {
	if (!t) return "-";
	const d = new Date(t);
	if (Number.isNaN(d.getTime())) return "-";
	return d.toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", ...opsi });
};

export const jamSaja = (t) =>
	new Date(t).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

/** Tingkat status dari persen & ambang. */
export const tingkatDari = (persen, ambang = 85) => {
	if (persen === null || persen === undefined) return "netral";
	if (persen >= Math.min(97, ambang + 10)) return "kritis";
	if (persen >= ambang) return "waspada";
	return "baik";
};

export const Card = ({ title, subtitle, icon: Icon, actions, children, className = "", bodyClass = "p-4 sm:p-5" }) => (
	<section className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm ${className}`}>
		{(title || actions) && (
			<header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
				<div className="flex min-w-0 items-start gap-2.5">
					{Icon && (
						<span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
							<Icon className="h-4 w-4" />
						</span>
					)}
					<div className="min-w-0">
						<h3 className="text-[15px] font-bold text-slate-800">{title}</h3>
						{subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
					</div>
				</div>
				{actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
			</header>
		)}
		<div className={bodyClass}>{children}</div>
	</section>
);

export const StatusBadge = ({ tingkat = "netral", label, className = "" }) => {
	const w = STATUS_WARNA[tingkat] || STATUS_WARNA.netral;
	const Icon = w.icon;
	return (
		<span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ring-1 ${w.bg} ${w.text} ${w.ring} ${className}`}>
			<Icon className="h-3 w-3" />
			{label || w.label}
		</span>
	);
};

export const SeverityBadge = ({ severity }) => {
	const s = SEVERITY[severity] || SEVERITY.low;
	return <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-bold ring-1 ${s.kelas}`}>{s.label}</span>;
};

/** Meter setengah lingkaran untuk persen (CPU/RAM/Disk). */
export const Gauge = ({ value, label, detail, ambang = 85, warna = SERI.biru }) => {
	const v = Math.max(0, Math.min(100, Number(value) || 0));
	const tingkat = tingkatDari(value, ambang);
	const warnaIsi = tingkat === "kritis" ? "#e34948" : tingkat === "waspada" ? "#eda100" : warna;
	const r = 52;
	const keliling = Math.PI * r;
	return (
		<div className="flex flex-col items-center text-center">
			<svg viewBox="0 0 128 74" className="w-full max-w-[170px]" role="img" aria-label={`${label} ${v}%`}>
				<path d="M12 66 A52 52 0 0 1 116 66" fill="none" stroke="#e2e8f0" strokeWidth="11" strokeLinecap="round" />
				<path
					d="M12 66 A52 52 0 0 1 116 66"
					fill="none"
					stroke={warnaIsi}
					strokeWidth="11"
					strokeLinecap="round"
					strokeDasharray={`${(v / 100) * keliling} ${keliling}`}
					style={{ transition: "stroke-dasharray .6s ease" }}
				/>
				<text x="64" y="58" textAnchor="middle" className="fill-slate-800" style={{ fontSize: 22, fontWeight: 800 }}>
					{value === null || value === undefined ? "–" : `${Math.round(v)}%`}
				</text>
			</svg>
			<div className="mt-1 flex items-center gap-1.5">
				<span className="text-sm font-bold text-slate-700">{label}</span>
				{tingkat !== "baik" && tingkat !== "netral" && <StatusBadge tingkat={tingkat} />}
			</div>
			{detail && <p className="mt-0.5 text-[11.5px] text-slate-500">{detail}</p>}
		</div>
	);
};

export const Stat = ({ label, value, hint, icon: Icon, tone = "slate" }) => {
	const tones = {
		slate: "bg-slate-100 text-slate-600",
		blue: "bg-blue-50 text-blue-600",
		green: "bg-emerald-50 text-emerald-600",
		amber: "bg-amber-50 text-amber-600",
		red: "bg-red-50 text-red-600",
		violet: "bg-violet-50 text-violet-600",
	};
	return (
		<div className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5">
			{Icon && (
				<span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tones[tone] || tones.slate}`}>
					<Icon className="h-4 w-4" />
				</span>
			)}
			<div className="min-w-0">
				<p className="text-[11.5px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
				<p className="mt-0.5 truncate text-lg font-extrabold text-slate-800">{value}</p>
				{hint && <p className="mt-0.5 text-[11.5px] text-slate-500">{hint}</p>}
			</div>
		</div>
	);
};

export const Bar = ({ percent, tingkat, className = "h-2" }) => {
	const p = Math.max(0, Math.min(100, Number(percent) || 0));
	const t = tingkat || tingkatDari(p);
	const warna = t === "kritis" ? "bg-red-500" : t === "waspada" ? "bg-amber-500" : "bg-blue-600";
	return (
		<div className={`w-full overflow-hidden rounded-full bg-slate-100 ${className}`}>
			<div className={`h-full rounded-full ${warna}`} style={{ width: `${p}%`, transition: "width .5s ease" }} />
		</div>
	);
};

export const Toggle = ({ checked, onChange, label, hint, disabled }) => (
	<label className={`flex items-start justify-between gap-4 py-2 ${disabled ? "opacity-50" : "cursor-pointer"}`}>
		<span className="min-w-0">
			<span className="block text-sm font-semibold text-slate-700">{label}</span>
			{hint && <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>}
		</span>
		<button
			type="button"
			role="switch"
			aria-checked={!!checked}
			disabled={disabled}
			onClick={() => onChange(!checked)}
			className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-blue-600" : "bg-slate-300"}`}
		>
			<span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
		</button>
	</label>
);

export const Kosong = ({ icon: Icon = FiInfo, title, text }) => (
	<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
		<Icon className="h-6 w-6 text-slate-400" />
		<p className="mt-2 text-sm font-semibold text-slate-600">{title}</p>
		{text && <p className="mt-1 max-w-md text-xs text-slate-500">{text}</p>}
	</div>
);

export const Memuat = ({ teks = "Memuat data server…" }) => (
	<div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
		<span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
		{teks}
	</div>
);

export const Galat = ({ pesan, onRetry }) => (
	<div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4">
		<FiAlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
		<div className="min-w-0 flex-1">
			<p className="text-sm font-bold text-red-800">Data tidak dapat dimuat</p>
			<p className="mt-0.5 text-[12.5px] text-red-700">{pesan}</p>
		</div>
		{onRetry && (
			<button onClick={onRetry} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100">
				Coba lagi
			</button>
		)}
	</div>
);

const TooltipGrafik = ({ active, payload, label, format, satuan, labelFormat }) => {
	if (!active || !payload?.length) return null;
	return (
		<div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
			<p className="mb-1 font-semibold text-slate-500">{labelFormat ? labelFormat(label) : jamSaja(label)}</p>
			{payload.map((p) => (
				<p key={p.dataKey} className="flex items-center gap-1.5 text-slate-700">
					<span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
					<span>{p.name}:</span>
					<b className="text-slate-900">{format ? format(p.value) : `${p.value}${satuan || ""}`}</b>
				</p>
			))}
		</div>
	);
};

/**
 * Grafik area satu seri (atau beberapa, bertumpuk) dengan tooltip crosshair.
 * `series` = [{ key, name, color }]. Satu sumbu Y saja.
 */
export const GrafikArea = ({
	data,
	series,
	height = 180,
	format,
	satuan,
	domain,
	stacked = false,
	labelFormat,
	tickFormat,
}) => {
	const idUnik = React.useId().replace(/:/g, "");
	return (
		<div style={{ height }} className="w-full">
			<ResponsiveContainer width="100%" height="100%">
				<AreaChart data={data} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
					<defs>
						{series.map((s) => (
							<linearGradient key={s.key} id={`g-${idUnik}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stopColor={s.color} stopOpacity={stacked ? 0.85 : 0.28} />
								<stop offset="100%" stopColor={s.color} stopOpacity={stacked ? 0.65 : 0.02} />
							</linearGradient>
						))}
					</defs>
					<CartesianGrid stroke="#eef2f6" vertical={false} />
					<XAxis
						dataKey="t"
						tickFormatter={tickFormat || jamSaja}
						tick={{ fontSize: 10.5, fill: "#64748b" }}
						axisLine={false}
						tickLine={false}
						minTickGap={36}
					/>
					<YAxis
						tick={{ fontSize: 10.5, fill: "#64748b" }}
						axisLine={false}
						tickLine={false}
						width={52}
						domain={domain || [0, "auto"]}
						tickFormatter={(v) => (format ? format(v) : `${v}${satuan || ""}`)}
					/>
					<Tooltip
						cursor={{ stroke: "#94a3b8", strokeDasharray: "3 3" }}
						content={<TooltipGrafik format={format} satuan={satuan} labelFormat={labelFormat} />}
					/>
					{series.map((s) => (
						<Area
							key={s.key}
							type="monotone"
							dataKey={s.key}
							name={s.name}
							stroke={s.color}
							strokeWidth={2}
							fill={`url(#g-${idUnik}-${s.key})`}
							stackId={stacked ? "1" : undefined}
							isAnimationActive={false}
							dot={false}
							activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
							connectNulls
						/>
					))}
				</AreaChart>
			</ResponsiveContainer>
		</div>
	);
};

export const Legenda = ({ items }) => (
	<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
		{items.map((i) => (
			<span key={i.label} className="inline-flex items-center gap-1.5">
				<span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />
				{i.label}
			</span>
		))}
	</div>
);

export const PilihRentang = ({ value, onChange, opsi }) => (
	<div className="inline-flex rounded-lg bg-slate-100 p-0.5">
		{opsi.map((o) => (
			<button
				key={o.value}
				onClick={() => onChange(o.value)}
				className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
					value === o.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
				}`}
			>
				{o.label}
			</button>
		))}
	</div>
);

/** Polling yang berhenti saat tab peramban tidak terlihat. */
export const usePolling = (fn, intervalMs, deps = []) => {
	const ref = React.useRef(fn);
	ref.current = fn;
	React.useEffect(() => {
		let aktif = true;
		const jalan = () => {
			if (aktif && document.visibilityState === "visible") ref.current();
		};
		ref.current();
		const id = intervalMs ? setInterval(jalan, intervalMs) : null;
		const onVis = () => document.visibilityState === "visible" && ref.current();
		document.addEventListener("visibilitychange", onVis);
		return () => {
			aktif = false;
			if (id) clearInterval(id);
			document.removeEventListener("visibilitychange", onVis);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [intervalMs, ...deps]);
};

export const Tombol = ({ children, onClick, variant = "light", disabled, icon: Icon, className = "", type = "button", title }) => {
	const v = {
		light: "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",
		dark: "bg-slate-900 text-white hover:bg-slate-800",
		primary: "bg-blue-600 text-white hover:bg-blue-700",
		danger: "bg-red-600 text-white hover:bg-red-700",
		dangerLight: "bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100",
		ghost: "text-slate-600 hover:bg-slate-100",
	};
	return (
		<button
			type={type}
			title={title}
			onClick={onClick}
			disabled={disabled}
			className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${v[variant]} ${className}`}
		>
			{Icon && <Icon className="h-3.5 w-3.5" />}
			{children}
		</button>
	);
};
