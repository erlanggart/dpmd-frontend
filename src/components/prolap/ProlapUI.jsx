// src/components/prolap/ProlapUI.jsx
// Potongan tampilan yang dipakai bersama seluruh halaman output Prolap.
// Dikumpulkan di satu tempat supaya angka, warna, dan cara menyebut
// keterbatasan data tampil seragam di semua bidang.
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Info, AlertTriangle, ChevronDown, Search, Download } from 'lucide-react';
import { PRIMARY, fmt, waktuAmbil } from './prolapFormat';

// ============================================================
// Komponen
// ============================================================
export const StatTile = ({ icon: Icon, label, value, caption, tone = PRIMARY }) => (
	<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
		<div className="flex items-center gap-2">
			<span
				className="flex h-8 w-8 items-center justify-center rounded-lg"
				style={{ backgroundColor: `${tone}1f`, color: tone }}
			>
				<Icon className="h-4 w-4" />
			</span>
			<p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
		</div>
		<p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
		{caption && <p className="mt-1 text-xs text-slate-500">{caption}</p>}
	</div>
);

export const Select = ({ label, value, onChange, options }) => (
	<label className="flex flex-col gap-1">
		<span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
		<div className="relative">
			<select
				value={value}
				onChange={(event) => onChange(event.target.value)}
				className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:border-slate-900 focus:outline-none"
			>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
			<ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
		</div>
	</label>
);

/** Daftar batang mendatar. Nilai selalu diberi label langsung. */
export const BarList = ({ rows, valueFormatter, captionFor, warna = PRIMARY, colorFor }) => {
	const max = Math.max(...rows.map((row) => row.value), 1);
	return (
		<div className="space-y-2.5">
			{rows.map((row) => (
				<div key={row.key}>
					<div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
						<span className="truncate font-medium text-slate-700">{row.label}</span>
						<span className="shrink-0 font-semibold tabular-nums text-slate-900">{valueFormatter(row.value, row)}</span>
					</div>
					<div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
						<div
							className="h-full rounded-full transition-[width] duration-700"
							style={{
								width: `${Math.max((row.value / max) * 100, row.value > 0 ? 2 : 0)}%`,
								backgroundColor: colorFor ? colorFor(row) : warna,
							}}
						/>
					</div>
					{captionFor && <p className="mt-1 text-[11px] text-slate-400">{captionFor(row)}</p>}
				</div>
			))}
		</div>
	);
};

/**
 * Batang dua bagian untuk membedakan asal data (input sendiri vs impor massal).
 * Ada jarak 2px antar segmen supaya batasnya terbaca tanpa mengandalkan warna.
 */
export const BarSumber = ({ utama, sekunder, labelUtama, labelSekunder, warnaUtama = PRIMARY }) => {
	const total = utama + sekunder;
	if (total === 0) return <div className="h-2.5 w-full rounded-full bg-slate-100" />;
	return (
		<div>
			<div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full bg-slate-100">
				<div className="h-full rounded-l-full" style={{ width: `${(utama / total) * 100}%`, backgroundColor: warnaUtama }} />
				<div
					className="h-full rounded-r-full"
					style={{ width: `${(sekunder / total) * 100}%`, backgroundColor: '#c9c7c0' }}
				/>
			</div>
			<div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-500">
				<span className="flex items-center gap-1.5">
					<span className="h-2 w-2 rounded-full" style={{ backgroundColor: warnaUtama }} />
					{labelUtama} {fmt(utama)}
				</span>
				<span className="flex items-center gap-1.5">
					<span className="h-2 w-2 rounded-full bg-[#c9c7c0]" />
					{labelSekunder} {fmt(sekunder)}
				</span>
			</div>
		</div>
	);
};

export const SectionCard = ({ title, subtitle, aside, children, className = '' }) => (
	<div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
		<div className="flex flex-wrap items-baseline justify-between gap-2">
			<div>
				<h3 className="text-sm font-bold text-slate-900">{title}</h3>
				{subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
			</div>
			{aside}
		</div>
		<div className="mt-4">{children}</div>
	</div>
);

/** Kepala halaman: judul, penjelasan, bidang pemilik output, tombol perbarui. */
export const ProlapHeader = ({ judul, deskripsi, bidang, generatedAt, loading, onRefresh, children }) => {
	const navigate = useNavigate();
	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					{/* Kembali ke riwayat, bukan path tetap: halaman Prolap terdaftar di
					    dua awalan (/sekretariat dan /superadmin/bidang/sekretariat). */}
					<button
						onClick={() => navigate(-1)}
						className="mb-2 flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-900"
					>
						<ArrowLeft className="h-4 w-4" />
						Kembali
					</button>
					<div className="flex flex-wrap items-center gap-2">
						<h1 className="text-2xl font-bold tracking-tight text-slate-900">{judul}</h1>
						{bidang && (
							<span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600">
								Output {bidang}
							</span>
						)}
					</div>
					<p className="mt-1 max-w-3xl text-sm text-slate-500">{deskripsi}</p>
				</div>
				<div className="flex items-end gap-3">
					{children}
					<button
						onClick={onRefresh}
						disabled={loading}
						className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
					>
						<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
						Perbarui
					</button>
				</div>
			</div>
			{generatedAt && <p className="text-xs text-slate-400">Data dihitung {waktuAmbil(generatedAt)}</p>}
		</div>
	);
};

/** Panel keterbatasan data — selalu di bawah, selalu tampil apa adanya. */
export const CatatanData = ({ butir }) => {
	const isi = butir.filter(Boolean);
	if (!isi.length) return null;
	return (
		<div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
			<div className="flex items-center gap-2">
				<Info className="h-4 w-4 text-amber-600" />
				<h3 className="text-sm font-bold text-amber-900">Yang perlu diketahui tentang data ini</h3>
			</div>
			<ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-amber-800">
				{isi.map((teks, index) => (
					<li key={index}>{teks}</li>
				))}
			</ul>
		</div>
	);
};

export const PesanGalat = ({ pesan }) =>
	pesan ? (
		<div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
			<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
			<p className="text-sm font-semibold text-red-800">{pesan}</p>
		</div>
	) : null;

export const MemuatLayar = ({ pesan = 'Menghitung output…' }) => (
	<div className="flex min-h-[60vh] items-center justify-center">
		<div className="flex items-center gap-3 text-slate-500">
			<RefreshCw className="h-5 w-5 animate-spin" />
			<span className="text-sm font-medium">{pesan}</span>
		</div>
	</div>
);

/** Kotak pencarian + tombol unduh CSV untuk tabel rincian. */
export const AlatTabel = ({ cari, setCari, onExport, placeholder = 'Cari desa / kecamatan…' }) => (
	<div className="flex items-center gap-2">
		<div className="relative">
			<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
			<input
				value={cari}
				onChange={(event) => setCari(event.target.value)}
				placeholder={placeholder}
				className="w-56 rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-slate-900 focus:outline-none"
			/>
		</div>
		<button
			onClick={onExport}
			className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
		>
			<Download className="h-4 w-4" />
			CSV
		</button>
	</div>
);

