// src/components/bidang/BidangUI.jsx
// Potongan tampilan bersama untuk halaman bidang (SPKED, KKD, PMD, Pemdes,
// Sekretariat). Dikumpulkan di satu tempat supaya kepala halaman, bilah tab,
// dan log aktivitas tidak ditulis ulang — dan berubah seragam sekali edit.
//
// Warna identitas bidang diambil dari `constants/bidang.js`, sumber yang sama
// dengan halaman navigasi bidang dan pengelompokan output Prolap.
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Activity, Clock } from 'lucide-react';
import { bidangBySlug } from '../../constants/bidang';
import { warnaAksi, waktuRelatif, angka, tanggalPanjang, toneAksi } from './bidangFormat';

/** Kepala halaman bidang: identitas, penjelasan, dan slot angka ringkas. */
export const BidangHeader = ({ slug, icon: Icon, deskripsi, children }) => {
	const navigate = useNavigate();
	const bidang = bidangBySlug(slug);
	if (!bidang) return null;

	return (
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
					<div
						className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
						style={{ backgroundColor: `${bidang.accent}1a`, color: bidang.accent }}
					>
						{Icon ? <Icon className="h-6 w-6" /> : null}
					</div>
					<div>
						<div className="flex flex-wrap items-center gap-2">
							<h1 className="text-2xl font-bold tracking-tight text-slate-900">Bidang {bidang.short}</h1>
							{/* Warna bidang dibawa titik, bukan warna huruf: aksen terang
							    seperti amber tidak cukup kontras sebagai teks. */}
							<span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
								<span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: bidang.accent }} />
								{bidang.label}
							</span>
						</div>
						<p className="mt-1.5 max-w-2xl text-sm text-slate-500">{deskripsi || bidang.description}</p>
					</div>
				</div>
				{children && <div className="flex flex-wrap gap-2.5">{children}</div>}
			</div>
		</div>
	);
};

export const StatTile = ({ icon: Icon, label, value, caption, accent = '#2a78d6' }) => (
	<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
		<div className="flex items-center gap-2">
			{Icon && (
				<span
					className="flex h-8 w-8 items-center justify-center rounded-lg"
					style={{ backgroundColor: `${accent}1f`, color: accent }}
				>
					<Icon className="h-4 w-4" />
				</span>
			)}
			<p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
		</div>
		<p className="mt-3 text-3xl font-bold tracking-tight tabular-nums text-slate-900">{value}</p>
		{caption && <p className="mt-1 text-xs text-slate-500">{caption}</p>}
	</div>
);

/** Angka ringkas untuk slot kanan kepala halaman. */
export const StatChip = ({ label, value }) => (
	<div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2">
		<p className="text-lg font-bold leading-none tabular-nums text-slate-900">{value}</p>
		<p className="mt-1 text-[11px] font-medium text-slate-500">{label}</p>
	</div>
);

/**
 * Bilah tab utama. Bisa memuat banyak tab, jadi menggulung mendatar alih-alih
 * memampatkan labelnya sampai tak terbaca.
 */
export const TabBar = ({ tabs, aktif, onPilih }) => (
	<div className="scrollbar-hide -mx-1 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
		{tabs.map((tab) => {
			const Icon = tab.icon;
			const dipilih = aktif === tab.id;
			return (
				<button
					key={tab.id}
					onClick={() => onPilih(tab.id)}
					aria-current={dipilih ? 'page' : undefined}
					className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
						dipilih ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
					}`}
				>
					{Icon && <Icon className="h-4 w-4" />}
					{tab.label}
				</button>
			);
		})}
	</div>
);

/** Tab tingkat dua di dalam sebuah panel. */
export const SubTabs = ({ items, aktif, onPilih }) => (
	<div className="flex flex-wrap gap-1 border-b border-slate-100 bg-slate-50/70 p-3">
		{items.map((item) => {
			const dipilih = aktif === item.id;
			return (
				<button
					key={item.id}
					onClick={() => onPilih(item.id)}
					className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-all duration-200 ${
						dipilih ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-white/70 hover:text-slate-700'
					}`}
				>
					{item.label}
				</button>
			);
		})}
	</div>
);

/** Kartu aksi ringkas di ikhtisar bidang. */
export const AksiCard = ({ icon: Icon, judul, deskripsi, accent, onClick }) => (
	<button
		onClick={onClick}
		style={{ '--aksen': accent }}
		className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
	>
		<span
			className="absolute inset-y-0 left-0 w-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
			style={{ backgroundColor: accent }}
		/>
		<span
			className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105"
			style={{ backgroundColor: `${accent}1a`, color: accent }}
		>
			<Icon className="h-5 w-5" />
		</span>
		<span className="min-w-0 flex-1">
			<span className="block truncate text-sm font-bold text-slate-900">{judul}</span>
			<span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{deskripsi}</span>
		</span>
	</button>
);

export const PanelMemuat = ({ pesan = 'Memuat…' }) => (
	<div className="flex items-center justify-center gap-3 py-16 text-slate-500">
		<RefreshCw className="h-5 w-5 animate-spin" />
		<span className="text-sm font-medium">{pesan}</span>
	</div>
);

/** Log aktivitas bidang — bentuknya sama untuk semua bidang. */
export const LogAktivitas = ({ logs, loading, filter, onFilter, opsiFilter, onRefresh }) => (
	<div className="space-y-4">
		<div className="flex flex-wrap items-end justify-between gap-3">
			<div>
				<h2 className="text-lg font-bold text-slate-900">Log Aktivitas</h2>
				<p className="mt-0.5 text-sm text-slate-500">
					{logs.length > 0 ? `${angka(logs.length)} aktivitas terkini` : 'Aktivitas terkini bidang'}
				</p>
			</div>
			<div className="flex items-center gap-2">
				<select
					value={filter}
					onChange={(event) => onFilter(event.target.value)}
					className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:border-slate-900 focus:outline-none"
				>
					{opsiFilter.map((opsi) => (
						<option key={opsi.value} value={opsi.value}>
							{opsi.label}
						</option>
					))}
				</select>
				<button
					onClick={onRefresh}
					disabled={loading}
					className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
				>
					<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
					Perbarui
				</button>
			</div>
		</div>

		<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
			{loading ? (
				<PanelMemuat pesan="Memuat aktivitas…" />
			) : logs.length === 0 ? (
				<div className="py-16 text-center">
					<Activity className="mx-auto h-8 w-8 text-slate-300" />
					<p className="mt-3 text-sm font-medium text-slate-600">Belum ada aktivitas</p>
					<p className="mt-1 text-xs text-slate-400">
						Aktivitas muncul di sini setelah ada perubahan data di modul bidang.
					</p>
				</div>
			) : (
				<div className="divide-y divide-slate-100">
					{logs.map((log) => (
						<div key={log.id} className="flex gap-4 p-4 transition-colors hover:bg-slate-50">
							<div
								className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold uppercase ${warnaAksi(
									log.action
								)}`}
							>
								{String(log.action || '').substring(0, 2)}
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
										{waktuRelatif(log.createdAt)}
									</span>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	</div>
);

/**
 * Log aktivitas versi jalur waktu — dikelompokkan per tanggal. Dipakai di kolom
 * samping halaman bidang yang sempit, sementara `LogAktivitas` untuk tab lebar.
 *
 * Pilihan penyaringnya diturunkan dari modul yang benar-benar ada di data,
 * bukan daftar tetap yang bisa saja tidak pernah cocok dengan apa pun.
 */
export const TimelineAktivitas = ({ logs, loading, onRefresh }) => {
	const [modul, setModul] = React.useState('semua');

	const opsi = React.useMemo(() => {
		const daftar = [...new Set(logs.map((log) => log.module).filter(Boolean))].sort();
		return ['semua', ...daftar];
	}, [logs]);

	const tersaring = React.useMemo(
		() => (modul === 'semua' ? logs : logs.filter((log) => log.module === modul)),
		[logs, modul]
	);

	const perTanggal = React.useMemo(() => {
		const peta = new Map();
		tersaring.forEach((log) => {
			const kunci = tanggalPanjang(log.createdAt);
			if (!peta.has(kunci)) peta.set(kunci, []);
			peta.get(kunci).push(log);
		});
		return [...peta.entries()];
	}, [tersaring]);

	return (
		<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
			<div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3.5">
				<div className="flex min-w-0 items-center gap-2.5">
					<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
						<Activity className="h-4 w-4" />
					</span>
					<div className="min-w-0">
						<p className="text-sm font-bold leading-tight text-slate-900">Log Aktivitas</p>
						<p className="mt-0.5 text-[11px] text-slate-500">{angka(logs.length)} kejadian terbaru</p>
					</div>
				</div>
				<button
					onClick={onRefresh}
					disabled={loading}
					aria-label="Perbarui aktivitas"
					className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
				>
					<RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
				</button>
			</div>

			{opsi.length > 2 && (
				<div className="border-b border-slate-100 px-4 py-3">
					<div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-0.5">
						{opsi.map((item) => (
							<button
								key={item}
								onClick={() => setModul(item)}
								className={`h-7 shrink-0 rounded-md px-3 text-[11px] font-semibold capitalize transition-colors ${
									modul === item ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
								}`}
							>
								{item}
							</button>
						))}
					</div>
				</div>
			)}

			<div className="max-h-[520px] overflow-y-auto px-4 py-3">
				{loading ? (
					<PanelMemuat pesan="Memuat aktivitas…" />
				) : tersaring.length === 0 ? (
					<div className="py-10 text-center">
						<Activity className="mx-auto h-8 w-8 text-slate-200" />
						<p className="mt-2 text-xs text-slate-400">Belum ada aktivitas</p>
					</div>
				) : (
					perTanggal.map(([tanggal, items], indeks) => (
						<div key={tanggal} className={indeks > 0 ? 'mt-4' : ''}>
							<div className="mb-2 flex items-center gap-2">
								<Clock className="h-3 w-3 text-slate-400" />
								<span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{tanggal}</span>
								<span className="h-px flex-1 bg-slate-100" />
							</div>
							<div className="relative pl-5">
								<span className="absolute bottom-1 left-[7px] top-1 w-px bg-slate-200" />
								{items.map((log) => {
									const tone = toneAksi(log.action);
									return (
										<div key={log.id} className="relative pb-3 last:pb-0">
											<span
												className="absolute -left-5 top-1.5 h-3 w-3 rounded-full ring-4 ring-white"
												style={{ backgroundColor: tone.dot }}
											/>
											<div className="mb-1 flex flex-wrap items-center gap-1.5">
												<span
													className={`inline-flex h-4 items-center rounded px-1.5 text-[9.5px] font-bold ring-1 ${tone.chip}`}
												>
													{tone.label}
												</span>
												{log.module && (
													<span className="rounded bg-slate-50 px-1 text-[9.5px] text-slate-400">{log.module}</span>
												)}
											</div>
											<p className="text-xs leading-snug text-slate-800">{log.description}</p>
											<p className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px] text-slate-500">
												<span className="font-medium">{log.userName}</span>
												<span className="text-slate-300">·</span>
												<span>{waktuRelatif(log.createdAt)}</span>
											</p>
										</div>
									);
								})}
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
};
