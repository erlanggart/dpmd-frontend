import React, { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import SelectBox from '../../../components/ui/SelectBox';
import AparaturDesaForm from '../../../components/aparatur-desa/AparaturDesaForm';
import { jenjangKey } from '../../../utils/jenjangPendidikan';
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
	Paperclip,
	ExternalLink,
	Scale,
	Clock,
	Pencil,
	Save,
	BadgeCheck,
	Plus,
	UserPlus,
	UserCog,
	AlertTriangle,
	Download,
	FileSpreadsheet,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../api';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';

// Halaman akun operator ikut dimuat malas: hanya staf yang membuka tab Akun
// Operator yang perlu membayarnya.
const ManajemenAkunDesaPage = lazy(() => import('../ManajemenAkunDesaPage'));

// ============================================================
// Palet chart (tervalidasi CVD — jangan diganti asal)
// blue = slot 1, orange = slot 2, aqua = slot 3, violet = slot 7
// ============================================================
const GENDER_COLORS = ['#2a78d6', '#eb6834'];
const AGE_RAMP = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281'];
const EDU_COLOR = '#1baf7a';
const AKSEN_JABATAN = '#4a3aa7'; // aksen bidang Pemdes
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
	'bg-slate-100 text-slate-700',
	'bg-slate-100 text-slate-700',
	'bg-slate-100 text-slate-700',
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

const berkasUrl = (nama) =>
	nama ? `${getBaseHost()}/uploads/aparatur_desa_files/${nama}` : null;

const pasFotoUrl = (person) => berkasUrl(person?.file_pas_foto);

/** Berkas yang bisa dilampirkan ke satu aparatur, sesuai kolom tabelnya. */
const BERKAS = [
	{ kunci: 'file_sk_terakhir', label: 'SK Terakhir' },
	{ kunci: 'file_pas_foto', label: 'Pas Foto' },
	{ kunci: 'file_ktp', label: 'KTP' },
	{ kunci: 'file_kk', label: 'Kartu Keluarga' },
	{ kunci: 'file_akta_kelahiran', label: 'Akta Kelahiran' },
	{ kunci: 'file_ijazah_terakhir', label: 'Ijazah Terakhir' },
	{ kunci: 'file_bpjs_kesehatan', label: 'Kartu BPJS Kesehatan' },
	{ kunci: 'file_bpjs_ketenagakerjaan', label: 'Kartu BPJS Ketenagakerjaan' },
];

/** Selisih tahun-bulan dari sebuah tanggal sampai sekarang. */
const rentangSejak = (tanggal) => {
	if (!tanggal) return null;
	const mulai = new Date(tanggal);
	if (Number.isNaN(mulai.getTime())) return null;
	const kini = new Date();
	let bulan = (kini.getFullYear() - mulai.getFullYear()) * 12 + (kini.getMonth() - mulai.getMonth());
	if (kini.getDate() < mulai.getDate()) bulan -= 1;
	if (bulan < 0) return null;
	const tahun = Math.floor(bulan / 12);
	const sisa = bulan % 12;
	if (tahun === 0) return `${sisa} bulan`;
	return sisa === 0 ? `${tahun} tahun` : `${tahun} tahun ${sisa} bulan`;
};

const formatWaktu = (nilai) => {
	if (!nilai) return '-';
	const d = new Date(nilai);
	return Number.isNaN(d.getTime())
		? '-'
		: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) +
			', ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

const LABEL_SUMBER = { desa: 'Diisi sendiri oleh desa', dapur_desa: 'Impor arsip Dapur Desa' };

/**
 * NIPD 20 digit dikelompokkan sesuai susunannya supaya terbaca:
 * tgl lahir (8) · kab (2) · kec (2) · desa (4) · JK (1) · jabatan (3).
 * NIPD hanya terisi setelah data dinyatakan valid oleh Bidang Pemdes.
 */
const formatNipd = (nipd) => {
	const s = String(nipd || '');
	if (!/^\d{20}$/.test(s)) return s || null;
	return [s.slice(0, 8), s.slice(8, 10), s.slice(10, 12), s.slice(12, 16), s.slice(16, 17), s.slice(17)].join(' ');
};

/** "32.01.40.2007" → { kab: '01', kec: '40', desa: '2007' } — kode lokasi tugas. */
const kodeLokasi = (kodeDesa) => {
	const bagian = String(kodeDesa || '').split('.');
	return bagian.length === 4 ? { kab: '01', kec: bagian[2], desa: bagian[3] } : null;
};

/** Chip kode lokasi tugas: Kab 01 · Kec 40 · Desa 2007. */
const ChipKodeLokasi = ({ kodeDesa, gelap = false }) => {
	const kode = kodeLokasi(kodeDesa);
	if (!kode) return null;
	const kelas = gelap ? 'bg-white/10 text-slate-200 ring-white/10' : 'bg-slate-100 text-slate-600 ring-slate-200';
	return (
		<span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] ring-1 ${kelas}`}>
			<span title="Kode kabupaten">Kab {kode.kab}</span>
			<span className="opacity-40">·</span>
			<span title="Kode kecamatan">Kec {kode.kec}</span>
			<span className="opacity-40">·</span>
			<span title="Kode desa">Desa {kode.desa}</span>
		</span>
	);
};

// ============================================================
// Blok UI kecil
// ============================================================
const StatCard = ({ label, value, hint, icon: Icon, iconClass, share, barClass, onClick }) => (
	<div
		role={onClick ? 'button' : undefined}
		tabIndex={onClick ? 0 : undefined}
		onClick={onClick}
		onKeyDown={onClick ? (event) => (event.key === 'Enter' || event.key === ' ') && onClick() : undefined}
		title={onClick ? 'Klik untuk melihat datanya' : undefined}
		className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md ${
			onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:border-slate-300' : ''
		}`}
	>
		<div className="flex items-start justify-between gap-3">
			<div className="min-w-0">
				<p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600">{label}</p>
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

/**
 * Tombol "Ekspor" dengan pilihan Excel/PDF. `onEkspor(format)` boleh async;
 * selama berjalan tombolnya terkunci supaya tidak terunduh dua kali.
 */
const TombolEkspor = ({ onEkspor, disabled = false, kecil = false }) => {
	const [buka, setBuka] = useState(false);
	const [sibuk, setSibuk] = useState(null);
	const wadah = useRef(null);

	useEffect(() => {
		if (!buka) return undefined;
		const tutup = (event) => {
			if (wadah.current && !wadah.current.contains(event.target)) setBuka(false);
		};
		document.addEventListener('mousedown', tutup);
		return () => document.removeEventListener('mousedown', tutup);
	}, [buka]);

	const jalankan = async (format) => {
		setBuka(false);
		setSibuk(format);
		try {
			await onEkspor(format);
		} finally {
			setSibuk(null);
		}
	};

	return (
		<div ref={wadah} className="relative">
			<button
				type="button"
				disabled={disabled || Boolean(sibuk)}
				onClick={() => setBuka((v) => !v)}
				className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 ${
					kecil ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'
				}`}
				aria-haspopup="menu"
				aria-expanded={buka}
			>
				{sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
				<span className={kecil ? '' : 'hidden sm:inline'}>{sibuk ? 'Menyiapkan…' : 'Ekspor'}</span>
			</button>
			{buka && (
				<div role="menu" className="absolute right-0 z-30 mt-1.5 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
					<button type="button" role="menuitem" onClick={() => jalankan('excel')} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
						<FileSpreadsheet className="h-4 w-4 text-emerald-600" />
						Excel (.xlsx)
					</button>
					<button type="button" role="menuitem" onClick={() => jalankan('pdf')} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
						<FileText className="h-4 w-4 text-rose-600" />
						PDF
					</button>
				</div>
			)}
		</div>
	);
};

const JUDUL_JENIS = { perangkat: 'Perangkat Desa', bpd: 'BPD' };

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
	onPilih,
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
				// Baris "Lainnya" gabungan beberapa nilai — tidak bisa dibuka satu daftar.
				const bisaDiklik = onPilih && !row.isOther && value > 0;

				return (
					<div
						key={row.name}
						role={bisaDiklik ? 'button' : undefined}
						tabIndex={bisaDiklik ? 0 : undefined}
						onClick={bisaDiklik ? () => onPilih(row) : undefined}
						onKeyDown={bisaDiklik ? (event) => event.key === 'Enter' && onPilih(row) : undefined}
						title={`${row.name}: ${fmt(value)} orang (${share}%)${bisaDiklik ? ' — klik untuk melihat datanya' : ''}`}
						className={`group flex items-center gap-3 rounded-lg px-1.5 py-1 transition-colors hover:bg-slate-50 ${bisaDiklik ? 'cursor-pointer' : ''}`}
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

/** Batang tegak — cocok untuk deret yang berurut seperti rentang usia. */
const BarVertikal = ({ items = [], ramp = AGE_RAMP, onPilih }) => {
	if (!items.length) return <EmptyChart />;

	const max = Math.max(1, ...items.map((item) => Number(item.value ?? 0)));
	const jumlah = items.reduce((total, item) => total + Number(item.value ?? 0), 0);

	return (
		<div>
			{/* Dua baris flex sejajar: batang di atas, keterangan di bawah. Label
			    dikeluarkan dari kotak setinggi tetap supaya tinggi batang tetap
			    sebanding dan tidak ikut terpotong teks. */}
			<div className="flex h-44 items-end gap-2 sm:gap-3">
				{items.map((item, index) => {
					const nilai = Number(item.value ?? 0);
					return (
						<div
							key={item.name}
							role={onPilih && nilai > 0 ? 'button' : undefined}
							onClick={onPilih && nilai > 0 ? () => onPilih(item) : undefined}
							className={`group flex h-full flex-1 flex-col justify-end gap-1.5 ${onPilih && nilai > 0 ? 'cursor-pointer' : ''}`}
						>
							<span className="text-center text-xs font-semibold tabular-nums text-slate-700">{fmt(nilai)}</span>
							<div
								title={`${item.name}: ${fmt(nilai)} orang (${pct(nilai, jumlah)}%)${onPilih ? ' — klik untuk melihat datanya' : ''}`}
								className="rounded-t-lg transition-[height,filter] duration-500 group-hover:brightness-110"
								style={{
									height: `${Math.max((nilai / max) * 100, nilai > 0 ? 2 : 0)}%`,
									backgroundColor: ramp[index % ramp.length],
								}}
							/>
						</div>
					);
				})}
			</div>

			<div className="mt-2 flex gap-2 border-t border-slate-100 pt-2 sm:gap-3">
				{items.map((item) => (
					<div key={item.name} className="flex-1 text-center">
						<p className="truncate text-[11px] font-medium text-slate-600">{item.name}</p>
						<p className="text-[10px] tabular-nums text-slate-400">{pct(item.value, jumlah)}%</p>
					</div>
				))}
			</div>
		</div>
	);
};

/** Rekap jabatan sebagai kartu — angkanya yang dibaca, bukan perbandingannya. */
const KomposisiJabatan = ({ items = [], onPilih }) => {
	if (!items.length) return <EmptyChart />;

	const jumlah = items.reduce((total, item) => total + Number(item.value ?? 0), 0);

	return (
		<div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
			{items.map((item) => (
				<div
					key={item.name}
					role={onPilih ? 'button' : undefined}
					tabIndex={onPilih ? 0 : undefined}
					onClick={onPilih ? () => onPilih(item) : undefined}
					onKeyDown={onPilih ? (event) => event.key === 'Enter' && onPilih(item) : undefined}
					className={`rounded-xl border border-slate-200 p-3 transition-all hover:border-slate-300 hover:bg-slate-50 ${
						onPilih ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-sm' : ''
					}`}
				>
					<p className="text-xl font-bold leading-none tabular-nums text-slate-900">{fmt(item.value)}</p>
					<p className="mt-1.5 text-[11px] font-medium leading-snug text-slate-600" title={item.name}>
						{item.name}
					</p>
					<p className="mt-1 text-[10px] tabular-nums text-slate-400">{pct(item.value, jumlah)}% dari total</p>
				</div>
			))}
		</div>
	);
};

const GenderDonut = ({ lakiLaki = 0, perempuan = 0, onPilih }) => {
	const total = Number(lakiLaki) + Number(perempuan);
	const data = [
		{ name: 'Laki-laki', value: Number(lakiLaki), kunci: 'Laki_laki' },
		{ name: 'Perempuan', value: Number(perempuan), kunci: 'Perempuan' },
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
						onClick={onPilih ? (irisan) => onPilih(irisan?.payload || irisan) : undefined}
						style={onPilih ? { cursor: 'pointer' } : undefined}
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
					<div
						key={item.name}
						role={onPilih ? 'button' : undefined}
						onClick={onPilih ? () => onPilih(item) : undefined}
						className={`flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50 ${onPilih ? 'cursor-pointer' : ''}`}
					>
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

// Tiga keadaan verifikasi: belum diperiksa (tanpa cap), disetujui, ditolak.
// Dipakai bersama cap kecil di daftar dan panel besar di halaman detail.
const RUPA_VERIFIKASI = {
	terverifikasi: {
		label: 'Terverifikasi Bidang Pemdes',
		singkat: 'Terverifikasi',
		icon: BadgeCheck,
		warna: 'text-emerald-600',
		panel: 'border-emerald-200 bg-emerald-50/60',
		pill: 'bg-emerald-50 text-emerald-700',
	},
	ditolak: {
		label: 'Verifikasi ditolak',
		singkat: 'Ditolak',
		icon: XCircle,
		warna: 'text-rose-600',
		panel: 'border-rose-200 bg-rose-50/60',
		pill: 'bg-rose-50 text-rose-700',
	},
};

const BELUM_VERIFIKASI = {
	singkat: 'Belum diverifikasi',
	icon: Clock,
	pill: 'bg-slate-100 text-slate-600',
};

/** Badge status verifikasi sejajar badge jabatan & status di kartu profil. */
const BadgeVerifikasi = ({ status }) => {
	const rupa = RUPA_VERIFIKASI[status] || BELUM_VERIFIKASI;
	const Icon = rupa.icon;
	return (
		<span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${rupa.pill}`}>
			<Icon className="h-3.5 w-3.5" />
			{rupa.singkat}
		</span>
	);
};

/** Cap kecil status verifikasi — dipakai tabel, kartu, dan daftar wilayah. */
const TandaVerifikasi = ({ status }) => {
	const rupa = RUPA_VERIFIKASI[status];
	if (!rupa) return null;
	const Icon = rupa.icon;
	return <Icon className={`h-4 w-4 shrink-0 ${rupa.warna}`} aria-label={rupa.singkat}><title>{rupa.singkat}</title></Icon>;
};

const JabatanBadge = ({ jabatan }) => (
	<span
		className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
			isBpd(jabatan) ? 'bg-slate-100 text-slate-700' : 'bg-slate-100 text-slate-700'
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
// Kelengkapan data & riwayat (kolom kanan halaman detail)
// ============================================================
// Kolom yang dihitung sebagai "harus terisi". Tanggal/SK pemberhentian dan
// keterangan sengaja tidak ikut: itu hanya relevan bagi yang sudah berhenti,
// jadi menghitungnya akan membuat aparatur aktif selamanya tidak pernah 100%.
const KOLOM_KELENGKAPAN = [
	{ key: 'nama_lengkap', label: 'Nama lengkap' },
	{ key: 'jabatan', label: 'Jabatan' },
	{ key: 'tempat_lahir', label: 'Tempat lahir' },
	{ key: 'tanggal_lahir', label: 'Tanggal lahir' },
	{ key: 'jenis_kelamin', label: 'Jenis kelamin' },
	{ key: 'agama', label: 'Agama' },
	{ key: 'pendidikan_terakhir', label: 'Pendidikan terakhir' },
	{ key: 'tanggal_pengangkatan', label: 'Tanggal pengangkatan' },
	{ key: 'nomor_sk_pengangkatan', label: 'No. SK pengangkatan' },
	{ key: 'produk_hukum_id', label: 'Dasar hukum' },
	{ key: 'bpjs_kesehatan_nomor', label: 'No. BPJS Kesehatan' },
	{ key: 'bpjs_ketenagakerjaan_nomor', label: 'No. BPJS Ketenagakerjaan' },
	...BERKAS.map((berkas) => ({ key: berkas.kunci, label: `Berkas ${berkas.label}` })),
];

/** Berapa persen kolom yang sudah terisi, dan mana saja yang belum. */
const KelengkapanData = ({ aparatur }) => {
	const kosong = KOLOM_KELENGKAPAN.filter((kolom) => {
		const nilai = aparatur[kolom.key];
		return nilai === null || nilai === undefined || String(nilai).trim() === '';
	});
	const terisi = KOLOM_KELENGKAPAN.length - kosong.length;
	const persen = Math.round((terisi / KOLOM_KELENGKAPAN.length) * 100);
	const nada = persen === 100 ? 'bg-emerald-500' : persen >= 60 ? 'bg-amber-500' : 'bg-rose-500';

	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-4">
			<div className="flex items-baseline justify-between gap-2">
				<h3 className="text-sm font-semibold text-slate-900">Kelengkapan Data</h3>
				<span className="text-lg font-bold tabular-nums text-slate-900">{persen}%</span>
			</div>
			<p className="mt-0.5 text-xs text-slate-500">
				{terisi} dari {KOLOM_KELENGKAPAN.length} kolom terisi
			</p>
			<div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
				<div className={`h-full rounded-full ${nada}`} style={{ width: `${persen}%` }} />
			</div>

			{/* Yang ditampilkan cuma yang belum terisi — itulah pertanyaannya.
			    Menampilkan semua kolom hanya memindahkan pekerjaan memeriksa. */}
			{kosong.length === 0 ? (
				<p className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
					<CheckCircle2 className="h-4 w-4" />
					Semua kolom sudah terisi
				</p>
			) : (
				<ul className="mt-3 space-y-1.5">
					{kosong.map((kolom) => (
						<li key={kolom.key} className="flex items-start gap-2 text-sm text-slate-600">
							<XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
							{kolom.label}
						</li>
					))}
				</ul>
			)}
		</div>
	);
};

const RUPA_AKSI = {
	dibuat: { label: 'Data dibuat', titik: 'bg-slate-400' },
	diubah: { label: 'Data diperbarui', titik: 'bg-blue-500' },
	terverifikasi: { label: 'Terverifikasi', titik: 'bg-emerald-500' },
	ditolak: { label: 'Verifikasi ditolak', titik: 'bg-rose-500' },
	verifikasi_dibatalkan: { label: 'Keputusan verifikasi dibatalkan', titik: 'bg-amber-500' },
};

/** Riwayat satu aparatur: dibuat, diubah, dan keputusan verifikasinya. */
const RiwayatAparatur = ({ aparatur }) => {
	const entri = [...(aparatur.riwayat || [])];

	// Baris yang sudah ada sebelum riwayat mulai dicatat tidak punya entri
	// "dibuat". Stempel waktu di barisnya sendiri dipakai sebagai gantinya,
	// dan ditandai apa adanya supaya tidak terbaca seperti catatan asli.
	if (!entri.some((item) => item.aksi === 'dibuat') && aparatur.created_at) {
		entri.push({
			id: 'awal',
			aksi: 'dibuat',
			created_at: aparatur.created_at,
			keterangan: 'Sebelum riwayat mulai dicatat',
		});
	}
	if (entri.length === 1 && aparatur.updated_at && aparatur.updated_at !== aparatur.created_at) {
		entri.unshift({
			id: 'awal-ubah',
			aksi: 'diubah',
			created_at: aparatur.updated_at,
			keterangan: 'Sebelum riwayat mulai dicatat',
		});
	}

	entri.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-4">
			<h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
				<Clock className="h-4 w-4 text-slate-400" />
				Riwayat
			</h3>

			<ol className="mt-3 space-y-3">
				{entri.map((item) => {
					const rupa = RUPA_AKSI[item.aksi] || { label: item.aksi, titik: 'bg-slate-400' };
					return (
						<li key={item.id} className="relative pl-5">
							<span className={`absolute left-0 top-1.5 h-2 w-2 rounded-full ${rupa.titik}`} />
							<p className="text-sm font-medium text-slate-900">{rupa.label}</p>
							<p className="text-xs text-slate-500">{formatWaktu(item.created_at)}</p>
							{item.oleh_nama && (
								<p className="text-xs text-slate-500">
									oleh {item.oleh_nama}
									{item.oleh_peran ? ` (${item.oleh_peran})` : ''}
								</p>
							)}
							{item.keterangan && (
								<p className="mt-1 rounded-lg bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
									{item.keterangan}
								</p>
							)}
						</li>
					);
				})}
			</ol>
		</div>
	);
};

/** Foto ukuran penuh. Satu gambar saja — tidak perlu galeri. */
const LightboxFoto = ({ src, alt, onClose }) => {
	useEffect(() => {
		const onKey = (event) => {
			if (event.key === 'Escape') onClose();
		};
		document.addEventListener('keydown', onKey);
		const overflowSemula = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.removeEventListener('keydown', onKey);
			document.body.style.overflow = overflowSemula;
		};
	}, [onClose]);

	return (
		<div
			className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-4"
			onClick={onClose}
			role="presentation"
		>
			<button
				type="button"
				onClick={onClose}
				aria-label="Tutup"
				className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
			>
				<X className="h-5 w-5" />
			</button>
			<img
				src={src}
				alt={alt}
				onClick={(event) => event.stopPropagation()}
				className="max-h-[90vh] max-w-full rounded-xl object-contain shadow-2xl"
			/>
		</div>
	);
};

// ============================================================
// Penyuntingan oleh Bidang Pemerintahan Desa
// ============================================================
// Hanya akun ber-bidang Pemdes yang boleh menyunting & memverifikasi. Gerbang
// sebenarnya ada di server (routes memakai checkRole 'pemerintahan_desa');
// yang di sini cuma menyembunyikan tombol yang pasti ditolak.
const bolehKelolaAparatur = (user) =>
	user?.role === 'superadmin' || Number(user?.bidang_id) === 6;

const nilaiForm = (nilai, tipe) => {
	if (nilai === null || nilai === undefined) return '';
	return tipe === 'date' ? String(nilai).slice(0, 10) : String(nilai);
};

const KELAS_INPUT =
	'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none';

const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

/**
 * Isian lengkap oleh bidang — tambah untuk desa terpilih, atau ubah satu orang.
 *
 * Formulirnya SAMA dengan milik desa (AparaturDesaForm), termasuk unggah berkas
 * dan BPJS, jadi bidang tidak pernah mengisi lebih sedikit atau lebih banyak
 * kolom daripada desa. Server menulisnya atas nama desa tujuan.
 *
 * `desa` = { id, nama, kecamatan_id, kecamatan } bila desanya sudah dipilih
 * dari luar (mode per wilayah). Tanpa `desa` dan tanpa `aparatur`, panel ini
 * meminta kecamatan & desa dulu.
 *
 * Penutupan lewat state `terbuka` sendiri, bukan langsung memanggil induk:
 * induk melepas panel dari pohon, dan tanpa jeda itu animasi keluarnya tidak
 * pernah sempat diputar.
 */
const PanelIsianAparatur = ({ desa: desaAwal, aparatur, onTutup, onTersimpan }) => {
	const mengubah = Boolean(aparatur);
	const perluPilihDesa = !mengubah && !desaAwal;
	const [terbuka, setTerbuka] = useState(true);
	const hasilSimpan = useRef(undefined);
	const [kecamatanList, setKecamatanList] = useState([]);
	const [desaList, setDesaList] = useState([]);
	const [kecamatanId, setKecamatanId] = useState('');
	const [desaId, setDesaId] = useState('');
	const [ubahLokasi, setUbahLokasi] = useState(true);
	const [produkHukum, setProdukHukum] = useState([]);

	const desaTujuanId = mengubah ? String(aparatur.desa_id ?? aparatur.desas?.id ?? '') : desaAwal ? String(desaAwal.id) : desaId;
	const desaTujuanNama = mengubah
		? aparatur.desas?.nama
		: desaAwal
			? desaAwal.nama
			: desaList.find((item) => String(item.id) === String(desaId))?.nama;
	const desaTujuanKode = mengubah
		? aparatur.desas?.kode
		: desaAwal
			? desaAwal.kode
			: desaList.find((item) => String(item.id) === String(desaId))?.kode;
	const kecamatanNama = mengubah
		? aparatur.desas?.kecamatans?.nama
		: desaAwal
			? desaAwal.kecamatan
			: (() => {
					const kecamatan = kecamatanList.find((item) => String(item.id || item.id_kecamatan) === String(kecamatanId));
					return kecamatan?.nama || kecamatan?.name;
				})();

	const tutup = useCallback(() => setTerbuka(false), []);

	useEffect(() => {
		const onKey = (event) => {
			if (event.key === 'Escape') tutup();
		};
		document.addEventListener('keydown', onKey);
		const overflowSemula = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.removeEventListener('keydown', onKey);
			document.body.style.overflow = overflowSemula;
		};
	}, [tutup]);

	useEffect(() => {
		if (!perluPilihDesa) return;
		api.get('/kecamatans')
			.then((response) => setKecamatanList(response.data?.data || []))
			.catch((error) => console.error('Failed to fetch kecamatan:', error));
	}, [perluPilihDesa]);

	useEffect(() => {
		setDesaList([]);
		setDesaId('');
		if (!kecamatanId) return;
		api.get(`/desas/kecamatan/${kecamatanId}`)
			.then((response) => setDesaList(response.data?.data || []))
			.catch((error) => console.error('Failed to fetch desa:', error));
	}, [kecamatanId]);

	// Pilihan SK pengangkatan = produk hukum milik desa tujuan saja.
	useEffect(() => {
		setProdukHukum([]);
		if (!desaTujuanId) return;
		let batal = false;
		api.get('/pemdes/produk-hukum', { params: { desa_id: desaTujuanId, limit: 100 } })
			.then((response) => { if (!batal) setProdukHukum(response.data?.data || []); })
			.catch((error) => console.error('Failed to fetch produk hukum desa:', error));
		return () => { batal = true; };
	}, [desaTujuanId]);

	const pilihDesa = (nilai) => {
		setDesaId(nilai);
		if (nilai) setUbahLokasi(false);
	};

	const simpan = async (formData) => {
		try {
			const response = mengubah
				? await api.post(`/pemdes/aparatur-desa/${aparatur.id}/lengkap`, formData, MULTIPART)
				: await api.post(`/pemdes/aparatur-desa?desa_id=${desaTujuanId}`, formData, MULTIPART);
			toast.success(mengubah ? 'Perubahan disimpan' : `Aparatur ditambahkan ke Desa ${desaTujuanNama || ''}`.trim());
			hasilSimpan.current = response.data?.data || {};
			setTerbuka(false);
		} catch (error) {
			toast.error(error.response?.data?.message || 'Gagal menyimpan data aparatur');
		}
	};

	const selesaiKeluar = () => {
		if (hasilSimpan.current !== undefined) onTersimpan?.(hasilSimpan.current);
		else onTutup();
	};

	const lokasiTerkunci = !perluPilihDesa || (desaId && !ubahLokasi);
	const IconKepala = mengubah ? Pencil : UserPlus;

	return (
		<AnimatePresence onExitComplete={selesaiKeluar}>
			{terbuka && (
				// z-[90]: bilah navigasi bawah layout pegawai memakai z-50.
				<motion.div
					key="panel-isian"
					className="fixed inset-0 z-[90] flex flex-col bg-slate-950/50 backdrop-blur-sm sm:pt-4"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0, transition: { duration: 0.2, delay: 0.05 } }}
					role="dialog"
					aria-modal="true"
					aria-label={mengubah ? 'Ubah data aparatur' : 'Tambah aparatur'}
				>
					<motion.div
						className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50 shadow-2xl sm:mx-4 sm:rounded-t-[1.75rem]"
						initial={{ y: 48, opacity: 0, scale: 0.985 }}
						animate={{ y: 0, opacity: 1, scale: 1 }}
						exit={{ y: 32, opacity: 0, transition: { duration: 0.2 } }}
						transition={{ type: 'spring', stiffness: 260, damping: 30 }}
					>
						{/* ---------- Kepala ---------- */}
						<div className="relative shrink-0 overflow-hidden bg-slate-950 px-4 py-4 text-white sm:px-8 sm:py-5">
							<span className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand-600/30 blur-3xl" />
							<span className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-indigo-500/15 blur-3xl" />
							<div className="relative mx-auto flex max-w-6xl items-center gap-4">
								<motion.span
									initial={{ rotate: -12, scale: 0.6, opacity: 0 }}
									animate={{ rotate: 0, scale: 1, opacity: 1 }}
									transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
									className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 sm:flex"
								>
									<IconKepala className="h-6 w-6" />
								</motion.span>
								<div className="min-w-0 flex-1">
									<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-300">
										{mengubah ? 'Ubah data aparatur' : 'Tambah aparatur'} · Bidang Pemdes
									</p>
									<h2 className="mt-0.5 truncate text-lg font-semibold tracking-tight sm:text-xl">
										{mengubah ? aparatur.nama_lengkap : desaTujuanNama ? `Desa ${desaTujuanNama}` : 'Pilih desa tujuan'}
									</h2>
									<AnimatePresence>
										{(kecamatanNama || mengubah) && (
											<motion.div
												initial={{ opacity: 0, y: -4 }}
												animate={{ opacity: 1, y: 0 }}
												className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-300"
											>
												{kecamatanNama && (
													<span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 ring-1 ring-white/10">
														<MapPin className="h-3 w-3" />
														Kec. {kecamatanNama}
													</span>
												)}
												{mengubah && desaTujuanNama && (
													<span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 ring-1 ring-white/10">
														<Building2 className="h-3 w-3" />
														Desa {desaTujuanNama}
													</span>
												)}
												<ChipKodeLokasi kodeDesa={desaTujuanKode} gelap />
											<span className="hidden text-slate-500 sm:inline">· Tekan Esc untuk menutup</span>
											</motion.div>
										)}
									</AnimatePresence>
								</div>
								<motion.button
									type="button"
									onClick={tutup}
									aria-label="Tutup"
									whileHover={{ rotate: 90 }}
									transition={{ type: 'spring', stiffness: 300, damping: 15 }}
									className="shrink-0 rounded-xl bg-white/10 p-2.5 text-slate-300 ring-1 ring-white/10 transition-colors hover:bg-white/20 hover:text-white"
								>
									<X className="h-5 w-5" />
								</motion.button>
							</div>
						</div>

						{/* ---------- Isi ---------- */}
						<div className="flex-1 overflow-y-auto">
							<div className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-8 sm:py-7">
								{perluPilihDesa && (
									<motion.section
										layout
										initial={{ opacity: 0, y: 12 }}
										animate={{ opacity: 1, y: 0 }}
										className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]"
									>
										<AnimatePresence mode="wait" initial={false}>
											{lokasiTerkunci ? (
												<motion.div
													key="ringkas"
													initial={{ opacity: 0 }}
													animate={{ opacity: 1 }}
													exit={{ opacity: 0 }}
													className="flex items-center gap-3 px-5 py-3.5"
												>
													<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
														<CheckCircle2 className="h-5 w-5" />
													</span>
													<div className="min-w-0 flex-1">
														<p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Lokasi tugas</p>
														<p className="truncate text-sm font-semibold text-slate-900">
															Desa {desaTujuanNama}
															<span className="font-normal text-slate-500"> · Kec. {kecamatanNama}</span>
														</p>
														<div className="mt-1">
															<ChipKodeLokasi kodeDesa={desaTujuanKode} />
														</div>
													</div>
													<button
														type="button"
														onClick={() => setUbahLokasi(true)}
														className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
													>
														Ganti desa
													</button>
												</motion.div>
											) : (
												<motion.div
													key="pilih"
													initial={{ opacity: 0 }}
													animate={{ opacity: 1 }}
													exit={{ opacity: 0 }}
													className="p-5"
												>
													<div className="mb-4 flex items-center gap-3">
														<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
															<MapPin className="h-[18px] w-[18px]" />
														</span>
														<div>
															<h3 className="text-[15px] font-semibold tracking-tight text-slate-900">Lokasi tugas</h3>
															<p className="text-xs text-slate-500">Pilih desa tempat aparatur ini bertugas</p>
														</div>
													</div>
													<div className="grid gap-3 sm:grid-cols-2">
														<SelectBox
															label="Kecamatan"
															value={kecamatanId}
															onChange={setKecamatanId}
															placeholder="Pilih kecamatan"
															emptyText="Kecamatan tidak ditemukan"
															options={kecamatanList.map((kecamatan) => ({
																value: String(kecamatan.id || kecamatan.id_kecamatan),
																label: kecamatan.nama || kecamatan.name,
															}))}
														/>
														<SelectBox
															label="Desa"
															value={desaId}
															onChange={pilihDesa}
															disabled={!kecamatanId}
															placeholder={kecamatanId ? 'Pilih desa' : 'Pilih kecamatan dulu'}
															emptyText="Desa tidak ditemukan"
															options={desaList.map((desa) => ({ value: String(desa.id), label: desa.nama }))}
														/>
													</div>
												</motion.div>
											)}
										</AnimatePresence>
									</motion.section>
								)}

								<AnimatePresence mode="wait">
									{desaTujuanId ? (
										<motion.div
											key={`form-${desaTujuanId}`}
											initial={{ opacity: 0, y: 16 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: -8 }}
											transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
										>
											<AparaturDesaForm
												// Ganti desa = formulir baru; isian desa sebelumnya tidak terbawa.
												key={desaTujuanId}
												onSubmit={simpan}
												initialData={aparatur || null}
												produkHukumList={produkHukum}
												onCancel={tutup}
												denganNavigasi
											/>
										</motion.div>
									) : (
										<motion.div
											key="kosong"
											initial={{ opacity: 0, scale: 0.98 }}
											animate={{ opacity: 1, scale: 1 }}
											exit={{ opacity: 0 }}
											className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"
										>
											<span className="relative flex h-16 w-16 items-center justify-center">
												<span className="absolute inset-0 animate-ping rounded-full bg-brand-100 opacity-60" />
												<span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-600">
													<MapPin className="h-7 w-7" />
												</span>
											</span>
											<p className="mt-5 text-base font-semibold text-slate-900">Mulai dari lokasi tugas</p>
											<p className="mt-1 max-w-sm text-sm text-slate-500">
												Pilih kecamatan lalu desa di atas. Formulir biodata, kepegawaian, BPJS, dan lampiran akan muncul di sini.
											</p>
										</motion.div>
									)}
								</AnimatePresence>
							</div>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

/** Ringkasan keputusan verifikasi + NIPD. Tombolnya ada di bilah atas halaman. */
const PanelVerifikasi = ({ aparatur }) => {
	const rupa = RUPA_VERIFIKASI[aparatur.status_verifikasi];
	const Icon = rupa?.icon || BadgeCheck;
	const daftar = aparatur.item_verifikasi || [];
	const keputusan = aparatur.verifikasi_item || {};
	const nipd = formatNipd(aparatur.nipd);

	return (
		<div className={`rounded-2xl border p-4 ${rupa ? rupa.panel : 'border-slate-200 bg-slate-50'}`}>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
						<Icon className={`h-4 w-4 ${rupa ? rupa.warna : 'text-slate-400'}`} />
						{rupa ? rupa.label : 'Belum diverifikasi'}
					</p>
					{aparatur.dpmd_verified_at && (
						<p className="mt-1 text-xs text-slate-500">
							{aparatur.dpmd_verified_nama ? `Oleh ${aparatur.dpmd_verified_nama} · ` : ''}
							{formatWaktu(aparatur.dpmd_verified_at)}
						</p>
					)}
				</div>
				<div className="text-right">
					<p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">NIPD</p>
					{nipd ? (
						<p className="font-mono text-sm font-semibold tracking-wide text-slate-900">{nipd}</p>
					) : (
						<p className="text-xs text-slate-500">
							{aparatur.nipd_info?.berhak === false ? 'Jabatan ini tidak mendapat NIPD' : 'Terbit setelah data valid'}
						</p>
					)}
				</div>
			</div>

			{daftar.length > 0 && (
				<ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
					{daftar.map((item) => {
						const k = keputusan[item.key];
						const [teks, nada] = !item.ada
							? ['Belum diunggah', 'text-amber-700']
							: k?.status === 'sesuai'
								? ['Sesuai', 'text-emerald-700']
								: k?.status === 'tidak_sesuai'
									? ['Tidak sesuai', 'text-rose-700']
									: ['Belum diperiksa', 'text-slate-400'];
						return (
							<li key={item.key} className="rounded-lg bg-white/70 px-2.5 py-1.5 text-xs ring-1 ring-slate-200/70">
								<span className="flex items-center justify-between gap-2">
									<span className="truncate font-medium text-slate-700">{item.label}</span>
									<span className={`shrink-0 font-semibold ${nada}`}>{teks}</span>
								</span>
								{k?.status === 'tidak_sesuai' && k.catatan && <span className="mt-0.5 block text-rose-700">{k.catatan}</span>}
							</li>
						);
					})}
				</ul>
			)}

			{aparatur.nipd_info?.kendala && (
				<p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
					NIPD belum bisa diterbitkan: {aparatur.nipd_info.kendala}.
				</p>
			)}
		</div>
	);
};

// Alasan penonaktifan yang lazim dipakai desa. Disediakan sebagai pilihan
// supaya isinya seragam dan bisa dihitung, dengan jalan keluar "Lainnya"
// untuk kasus yang tidak masuk daftar.
const ALASAN_NONAKTIF = [
	'Pensiun / Purna Tugas',
	'Meninggal Dunia',
	'Mengundurkan Diri',
	'Habis Masa Jabatan',
	'Mutasi / Pindah Tugas',
	'Diberhentikan',
];

/**
 * Ubah status kepegawaian. Dipisah dari mode edit karena ini keputusan
 * tersendiri — dan menonaktifkan tanpa alasan membuat datanya tidak bisa
 * dipertanggungjawabkan.
 */
const DialogStatus = ({ aparatur, sibuk, onSimpan, onTutup }) => {
	const menonaktifkan = aparatur.status === 'Aktif';
	const [alasan, setAlasan] = useState(ALASAN_NONAKTIF[0]);
	const [alasanLain, setAlasanLain] = useState('');
	const [tanggal, setTanggal] = useState(nilaiForm(aparatur.tanggal_pemberhentian, 'date'));

	const alasanAkhir = alasan === 'Lainnya' ? alasanLain.trim() : alasan;
	const belumLengkap = menonaktifkan && !alasanAkhir;

	return (
		<div
			className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
			onClick={onTutup}
			role="presentation"
		>
			<div
				className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-2xl"
				onClick={(event) => event.stopPropagation()}
				role="dialog"
				aria-modal="true"
				aria-label="Ubah status kepegawaian"
			>
				<h3 className="text-base font-semibold text-slate-900">
					{menonaktifkan ? 'Nonaktifkan aparatur' : 'Aktifkan kembali aparatur'}
				</h3>
				<p className="mt-1 text-sm text-slate-500">{aparatur.nama_lengkap}</p>

				{menonaktifkan ? (
					<>
						<label className="mt-4 block">
							<span className="mb-1 block text-xs font-medium text-slate-500">Alasan penonaktifan</span>
							<select value={alasan} onChange={(event) => setAlasan(event.target.value)} className={KELAS_INPUT}>
								{ALASAN_NONAKTIF.map((pilihan) => (
									<option key={pilihan} value={pilihan}>
										{pilihan}
									</option>
								))}
								<option value="Lainnya">Lainnya…</option>
							</select>
						</label>

						{alasan === 'Lainnya' && (
							<input
								value={alasanLain}
								onChange={(event) => setAlasanLain(event.target.value)}
								placeholder="Tulis alasannya"
								className={`mt-2 ${KELAS_INPUT}`}
							/>
						)}

						<label className="mt-3 block">
							<span className="mb-1 block text-xs font-medium text-slate-500">
								Tanggal pemberhentian (opsional)
							</span>
							<input
								type="date"
								value={tanggal}
								onChange={(event) => setTanggal(event.target.value)}
								className={KELAS_INPUT}
							/>
						</label>
					</>
				) : (
					<p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
						Status kembali menjadi Aktif. Tanggal pemberhentian dan alasannya akan dikosongkan.
					</p>
				)}

				<div className="mt-4 flex gap-2">
					<button
						type="button"
						onClick={onTutup}
						disabled={sibuk}
						className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
					>
						Batal
					</button>
					<button
						type="button"
						disabled={sibuk || belumLengkap}
						onClick={() =>
							onSimpan(
								menonaktifkan
									? { status: 'Tidak_Aktif', keterangan: alasanAkhir, tanggal_pemberhentian: tanggal || '' }
									: { status: 'Aktif', keterangan: '', tanggal_pemberhentian: '' }
							)
						}
						className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-60 ${
							menonaktifkan ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
						}`}
					>
						{sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
						{menonaktifkan ? 'Nonaktifkan' : 'Aktifkan'}
					</button>
				</div>
			</div>
		</div>
	);
};

/**
 * Verifikasi satu item, langsung di dalam kartunya — bukan pop-up.
 *
 * Tiap kartu data (biodata, kepegawaian, BPJS) dan tiap baris berkas memuat
 * keputusannya sendiri, jadi pemeriksa menilai tepat di samping data yang ia
 * baca. Klik "Sesuai" langsung tersimpan; "Tidak sesuai" meminta alasan
 * dulu karena alasan itulah yang dibaca desa.
 *
 * Daftar item berlaku & wajib datang dari server (aparatur.item_verifikasi).
 * Item yang tidak berlaku (mis. BPJS tanpa nomor) tidak digambar.
 */
const VerifikasiItem = ({ itemKey, aparatur, bolehKelola, onSimpan, ringkas = false }) => {
	const item = (aparatur.item_verifikasi || []).find((i) => i.key === itemKey);
	const k = aparatur.verifikasi_item?.[itemKey] || null;
	const [menulis, setMenulis] = useState(false);
	const [alasan, setAlasan] = useState(k?.catatan || '');
	const [sibuk, setSibuk] = useState(false);

	if (!item) return null;
	// Baris berkas sudah bertuliskan "Belum diunggah" — chip yang sama tidak
	// perlu diulang di sebelahnya.
	if (ringkas && !item.ada) return null;

	const simpan = async (status, catatan = null) => {
		setSibuk(true);
		const berhasil = await onSimpan(itemKey, status, catatan);
		setSibuk(false);
		if (berhasil) setMenulis(false);
	};

	const rupa = !item.ada
		? { teks: 'Belum diunggah', kelas: 'bg-amber-50 text-amber-700 ring-amber-200', Icon: Clock }
		: k?.status === 'sesuai'
			? { teks: 'Sesuai', kelas: 'bg-emerald-50 text-emerald-700 ring-emerald-200', Icon: CheckCircle2 }
			: k?.status === 'tidak_sesuai'
				? { teks: 'Tidak sesuai', kelas: 'bg-rose-50 text-rose-700 ring-rose-200', Icon: XCircle }
				: { teks: 'Belum diperiksa', kelas: 'bg-white text-slate-500 ring-slate-200', Icon: Clock };

	const Chip = (
		<span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${rupa.kelas}`}>
			<rupa.Icon className="h-3 w-3" />
			{rupa.teks}
		</span>
	);

	const Tombol = bolehKelola && item.ada && (
		<div className="flex shrink-0 items-center gap-1">
			<button
				type="button"
				disabled={sibuk}
				onClick={() => (k?.status === 'sesuai' ? simpan(null) : simpan('sesuai'))}
				title={k?.status === 'sesuai' ? 'Batalkan keputusan' : 'Tandai sesuai'}
				className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
					k?.status === 'sesuai' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50'
				}`}
			>
				{sibuk ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
				{!ringkas && 'Sesuai'}
			</button>
			<button
				type="button"
				disabled={sibuk}
				onClick={() => {
					if (k?.status === 'tidak_sesuai' && !menulis) return simpan(null);
					setAlasan(k?.catatan || '');
					setMenulis((x) => !x);
				}}
				title={k?.status === 'tidak_sesuai' ? 'Batalkan keputusan' : 'Tandai tidak sesuai'}
				className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
					k?.status === 'tidak_sesuai' || menulis ? 'bg-rose-600 text-white shadow-sm' : 'bg-white text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50'
				}`}
			>
				<XCircle className="h-3.5 w-3.5" />
				{!ringkas && 'Tidak sesuai'}
			</button>
		</div>
	);

	const Alasan = (
		<AnimatePresence initial={false}>
			{menulis && (
				<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
					<div className="mt-2 flex gap-2">
						<input
							autoFocus
							value={alasan}
							onChange={(event) => setAlasan(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === 'Enter' && alasan.trim()) simpan('tidak_sesuai', alasan.trim());
								if (event.key === 'Escape') setMenulis(false);
							}}
							placeholder="Alasan untuk desa, mis. tanggal lahir berbeda dengan KTP"
							className={`${KELAS_INPUT} min-w-0 flex-1 bg-white`}
						/>
						<button
							type="button"
							disabled={sibuk || !alasan.trim()}
							onClick={() => simpan('tidak_sesuai', alasan.trim())}
							className="shrink-0 rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
						>
							Simpan
						</button>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);

	const Catatan = k?.status === 'tidak_sesuai' && k.catatan && !menulis && (
		<p className="mt-1 text-xs text-rose-700">{k.catatan}</p>
	);

	// Baris berkas: chip + tombol ikon, menempel di kanan baris.
	if (ringkas) {
		return (
			<div className="min-w-0">
				<div className="flex items-center justify-end gap-2">
					{Chip}
					{Tombol}
				</div>
				{Alasan}
				{Catatan}
			</div>
		);
	}

	// Kaki kartu data.
	return (
		<div
			className={`mt-4 rounded-xl border-t border-dashed px-3 pb-2.5 pt-3 transition-colors ${
				k?.status === 'sesuai' ? 'border-emerald-300 bg-emerald-50/50' : k?.status === 'tidak_sesuai' ? 'border-rose-300 bg-rose-50/50' : 'border-slate-300 bg-white/60'
			}`}
		>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex min-w-0 items-center gap-2">
					<BadgeCheck className="h-4 w-4 shrink-0 text-slate-400" />
					<span className="truncate text-xs font-semibold text-slate-700">
						Verifikasi {item.label.toLowerCase()}
						{item.wajib && <span className="ml-1 text-[10px] font-bold uppercase tracking-wide text-brand-600">wajib</span>}
					</span>
					{Chip}
				</div>
				{Tombol}
			</div>
			{k?.oleh && k?.status && (
				<p className="mt-1 text-[11px] text-slate-400">
					{k.oleh} · {formatWaktu(k.pada)}
				</p>
			)}
			{Alasan}
			{Catatan}
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

/** Satu baris berkas: tautan bila ada, keterangan jujur bila belum diunggah. */
const BarisBerkas = ({ label, nama, verifikasi, onBuka }) => {
	const url = berkasUrl(nama);
	return (
		<div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
			<span className="min-w-0 truncate text-sm text-slate-700">{label}</span>
			{url ? (
				// Pratinjau di pop-up — tidak meninggalkan halaman pemeriksaan.
				<button
					type="button"
					onClick={() => onBuka?.({ label, nama })}
					className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-slate-900 transition-colors hover:bg-white"
				>
					<Eye className="h-3.5 w-3.5" />
					Lihat
				</button>
			) : (
				<span className="flex-shrink-0 text-xs text-slate-400">Belum diunggah</span>
			)}
			{/* Keputusan verifikasi berkas ini — di baris yang sama dengan berkasnya. */}
			{verifikasi && <div className="col-span-2 sm:col-span-1">{verifikasi}</div>}
		</div>
	);
};

export const AparaturDesaDetailPage = ({ backPath }) => {
	const { id } = useParams();
	const navigate = useNavigate();
	const { user } = useAuth();
	const bolehKelola = bolehKelolaAparatur(user);
	const [a, setA] = useState(null);
	const [memuat, setMemuat] = useState(true);
	const [menyunting, setMenyunting] = useState(false);
	const [sibuk, setSibuk] = useState(false);
	const [fotoBesar, setFotoBesar] = useState(false);
	const [pratinjau, setPratinjau] = useState(null); // { label, nama } berkas yang sedang dilihat
	const [dialogStatus, setDialogStatus] = useState(false);

	useEffect(() => {
		let batal = false;
		setMemuat(true);
		api.get(`/pemdes/aparatur-desa/${id}`)
			.then((response) => { if (!batal) setA(response.data?.data || null); })
			.catch((error) => {
				console.error('Failed to fetch aparatur detail:', error);
				if (!batal) toast.error('Gagal memuat detail aparatur');
			})
			.finally(() => { if (!batal) setMemuat(false); });
		return () => { batal = true; };
	}, [id]);

	const kembali = () => (backPath ? navigate(backPath) : navigate(-1));

	// Balasan simpan/verifikasi tidak membawa relasi desa & produk hukum, jadi
	// ditimpakan ke data yang sudah ada, bukan menggantikannya.
	const serap = (baru) => setA((sebelumnya) => ({ ...(sebelumnya || {}), ...baru }));

	// Riwayat, daftar item verifikasi, info NIPD, dan kode lokasi dihitung
	// server dan tidak ikut di balasan simpan — jadi detailnya diambil ulang
	// utuh. Gagal memuat ulang tidak boleh menutupi keberhasilan menyimpan,
	// karena itu kegagalannya didiamkan.
	const muatRiwayat = async () => {
		try {
			const response = await api.get(`/pemdes/aparatur-desa/${id}`);
			if (response.data?.data) setA(response.data.data);
		} catch (error) {
			console.error('Failed to refresh detail aparatur:', error);
		}
	};

	// Balasan simpan lengkap membawa relasi desa & produk hukum, tapi bukan
	// riwayat — jadi tetap ditimpakan lalu riwayatnya diambil menyusul.
	const selesaiSunting = (baru) => {
		// `desas` di balasan tanpa kecamatan — digabung, bukan ditimpa.
		setA((sebelumnya) => ({
			...(sebelumnya || {}),
			...(baru || {}),
			desas: { ...(sebelumnya?.desas || {}), ...(baru?.desas || {}) },
		}));
		setMenyunting(false);
		muatRiwayat();
	};

	const ubahStatus = async (perubahan) => {
		setSibuk(true);
		try {
			const response = await api.put(`/pemdes/aparatur-desa/${a.id}`, perubahan);
			serap(response.data?.data || {});
			toast.success('Status kepegawaian diperbarui');
			setDialogStatus(false);
			muatRiwayat();
		} catch (error) {
			toast.error(error.response?.data?.message || 'Gagal memperbarui status');
		} finally {
			setSibuk(false);
		}
	};

	// payload: { items } untuk keputusan per item, atau { status: 'batal' }.
	// Mengembalikan true bila tersimpan, supaya kartu bisa menutup isian alasannya.
	const ubahVerifikasi = async (payload, { senyap = false } = {}) => {
		setSibuk(true);
		const statusSebelum = a.status_verifikasi;
		try {
			const response = await api.post(`/pemdes/aparatur-desa/${a.id}/verifikasi`, payload);
			const baru = response.data?.data || {};
			serap({ ...baru, dpmd_verified_nama: payload?.status === 'batal' ? null : user?.name });
			// Tiap klik item tidak perlu toast berpesan panjang; yang diumumkan
			// hanya perubahan status ringkas (valid / dikembalikan / dibatalkan).
			if (!senyap || baru.status_verifikasi !== statusSebelum) toast.success(response.data?.message || 'Status verifikasi diperbarui');
			else toast.success('Keputusan disimpan', { duration: 1500 });
			if (response.data?.peringatan) toast(response.data.peringatan, { icon: '⚠️', duration: 6000 });
			await muatRiwayat();
			return true;
		} catch (error) {
			toast.error(error.response?.data?.message || 'Gagal memperbarui verifikasi');
			return false;
		} finally {
			setSibuk(false);
		}
	};

	// Tanggal lahir taksiran impor Dapur Desa ternyata memang sesuai KTP.
	const konfirmasiTanggalLahir = async () => {
		setSibuk(true);
		try {
			const response = await api.put(`/pemdes/aparatur-desa/${a.id}`, { konfirmasi_tanggal_lahir: true });
			toast.success(response.data?.data?.nipd ? `Tanggal lahir dikonfirmasi — NIPD ${response.data.data.nipd}` : 'Tanggal lahir dikonfirmasi');
			await muatRiwayat();
		} catch (error) {
			toast.error(error.response?.data?.message || 'Gagal mengonfirmasi tanggal lahir');
		} finally {
			setSibuk(false);
		}
	};

	const simpanItem = (key, status, catatan) =>
		ubahVerifikasi({ items: { [key]: { status, catatan } } }, { senyap: true });

	// Semua item yang ada isinya & belum ditolak → sesuai, dalam satu kiriman.
	const tandaiSemuaSesuai = () =>
		ubahVerifikasi({
			items: Object.fromEntries(
				(a.item_verifikasi || [])
					.filter((item) => item.ada && a.verifikasi_item?.[item.key]?.status !== 'tidak_sesuai')
					.map((item) => [item.key, { status: 'sesuai' }])
			),
		});

	const batalkanVerifikasi = () => {
		if (!window.confirm('Batalkan semua keputusan verifikasi? NIPD yang sudah terbit ikut dicabut.')) return;
		ubahVerifikasi({ status: 'batal' });
	};

	// Satu pemanggil untuk semua kartu — kartu cukup menyebut kunci itemnya.
	const verif = (key, ringkas = false) => (
		<VerifikasiItem key={`${key}-${a.updated_at}`} itemKey={key} aparatur={a} bolehKelola={bolehKelola} onSimpan={simpanItem} ringkas={ringkas} />
	);

	if (memuat) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50">
				<Loader2 className="h-6 w-6 animate-spin text-slate-400" />
			</div>
		);
	}

	if (!a) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center">
				<UserCircle className="h-10 w-10 text-slate-300" />
				<p className="text-sm font-medium text-slate-900">Data aparatur tidak ditemukan</p>
				<button
					onClick={kembali}
					className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
				>
					Kembali
				</button>
			</div>
		);
	}

	const usia = rentangSejak(a.tanggal_lahir);
	const masaKerja = a.tanggal_pemberhentian ? null : rentangSejak(a.tanggal_pengangkatan);
	const jumlahBerkas = BERKAS.filter((b) => a[b.kunci]).length;
	const foto = pasFotoUrl(a);

	return (
		<div className="min-h-screen bg-slate-50 p-4 pt-20 sm:p-6 lg:pt-6">
			<div>
				<div className="mb-4 flex flex-wrap items-center justify-between gap-2">
					<button
						onClick={kembali}
						className="flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
					>
						<ChevronLeft className="h-4 w-4" />
						Kembali
					</button>

					<div className="flex flex-wrap gap-2">
						{bolehKelola && (
								<>
									<button
										onClick={() => setMenyunting(true)}
										className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
									>
										<Pencil className="h-4 w-4" />
										Edit
									</button>
									<button
										onClick={() => setDialogStatus(true)}
										className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
											a.status === 'Aktif'
												? 'border-rose-200 bg-white text-rose-700 hover:bg-rose-50'
												: 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50'
										}`}
									>
										{a.status === 'Aktif' ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
										{a.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}
									</button>
									{/* Verifikasi dilakukan di tiap kartu; di sini hanya jalan pintas. */}
									<button
										onClick={tandaiSemuaSesuai}
										disabled={sibuk}
										title="Tandai semua item yang ada isinya sebagai sesuai"
										className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
									>
										{sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
										Semua sesuai
									</button>
									{(a.status_verifikasi || Object.keys(a.verifikasi_item || {}).length > 0) && (
										<button
											onClick={batalkanVerifikasi}
											disabled={sibuk}
											className="rounded-xl px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-white hover:text-slate-800 disabled:opacity-60"
										>
											Batalkan verifikasi
										</button>
									)}
								</>
						)}
					</div>
				</div>

				<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
				<div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
					{/* --- Kartu profil --- */}
					<div className="relative">
						<div className="relative h-32 overflow-hidden bg-slate-900">
							<div className="absolute -right-6 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
							<div className="absolute -bottom-8 left-8 h-28 w-28 rounded-full bg-slate-900/20 blur-2xl" />
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
							{foto ? (
								<button
									type="button"
									onClick={() => setFotoBesar(true)}
									title="Perbesar foto"
									aria-label="Perbesar foto"
									className="-mt-16 cursor-zoom-in rounded-full transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
								>
									<Avatar person={a} className="h-28 w-28 text-3xl ring-4 ring-white shadow-sm" />
								</button>
							) : (
								<Avatar
									person={a}
									className="-mt-16 h-28 w-28 text-3xl ring-4 ring-white shadow-sm"
								/>
							)}
							<h2 className="mt-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
								{a.nama_lengkap}
							</h2>
							<div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
								<span
									className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
										isBpd(a.jabatan) ? 'bg-slate-100 text-slate-700' : 'bg-slate-100 text-slate-700'
									}`}
								>
									<Briefcase className="h-3.5 w-3.5" />
									{a.jabatan}
								</span>
								<span
									className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
										a.status === 'Aktif' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
									}`}
								>
									{a.status === 'Aktif' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
									{a.status === 'Aktif' ? 'Aktif' : 'Tidak Aktif'}
								</span>
								<BadgeVerifikasi status={a.status_verifikasi} />
							</div>
							<p className="mt-2.5 inline-flex items-center gap-1.5 text-sm text-slate-500">
								<MapPin className="h-3.5 w-3.5 text-slate-400" />
								{a.desas?.nama || '-'} &middot; Kec. {a.desas?.kecamatans?.nama || '-'}
							</p>
							<div className="mt-1.5">
								<ChipKodeLokasi kodeDesa={a.desas?.kode} />
							</div>
							{a.nipd && (
								<p className="mt-2 inline-flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-1.5 text-sm ring-1 ring-sky-200">
									<span className="text-[11px] font-semibold uppercase tracking-wider text-sky-700">NIPD</span>
									<span className="font-mono font-semibold tracking-wide text-slate-900">{formatNipd(a.nipd)}</span>
								</p>
							)}
						</div>
					</div>

					{/* --- Rincian --- */}
					{/* Seluruh kolom yang dimiliki satu aparatur ditampilkan, termasuk
					    yang masih kosong. Menyembunyikan kolom kosong membuat pembaca
					    tidak bisa membedakan "tidak ada kolomnya" dari "belum diisi" —
					    padahal justru yang belum diisi itulah yang perlu ditagih. */}
					<div className="space-y-4 px-5 pb-6 sm:px-6">
					<div className="grid gap-4 md:grid-cols-2">
						<DetailSection title="Data Pribadi" icon={UserCircle}>
							<div className="grid grid-cols-2 gap-3">
								<DetailField
									label="Jenis Kelamin"
									value={
										a.jenis_kelamin === 'Laki_laki'
											? 'Laki-laki'
											: a.jenis_kelamin === 'Perempuan'
											? 'Perempuan'
											: '-'
									}
								/>
								<DetailField label="Agama" value={a.agama} />
								<DetailField label="Tempat Lahir" value={a.tempat_lahir} />
								<DetailField label="Tanggal Lahir" value={formatDate(a.tanggal_lahir)} />
								<DetailField label="Usia" value={usia} />
								<DetailField label="Pendidikan Terakhir" value={a.pendidikan_terakhir} />
							</div>
							{/* Tanggal lahir taksiran impor Dapur Desa: masuk ke 8 digit
							    pertama NIPD, jadi NIPD ditahan sampai dikoreksi / dikonfirmasi. */}
							{a.tanggal_lahir_taksiran && (
								<div className="mt-4 flex flex-wrap items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
									<CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
									<p className="min-w-0 flex-1 text-xs text-amber-800">
										<span className="font-semibold">Tanggal lahir masih taksiran arsip Dapur Desa.</span> NIPD tidak
										diterbitkan sampai tanggalnya dikoreksi lewat Edit, atau dikonfirmasi bila memang sesuai KTP.
									</p>
									{bolehKelola && (
										<button
											type="button"
											onClick={konfirmasiTanggalLahir}
											disabled={sibuk}
											className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-300 transition-colors hover:bg-amber-100 disabled:opacity-60"
										>
											Sesuai KTP
										</button>
									)}
								</div>
							)}
							{verif('biodata')}
						</DetailSection>

						<DetailSection title="Jabatan & Lokasi Tugas" icon={MapPin}>
							<div className="grid grid-cols-2 gap-3">
								<DetailField label="Jabatan" value={a.jabatan} />
								<DetailField label="Status" value={a.status} />
								<DetailField label="Desa" value={a.desas?.nama} />
								<DetailField label="Kecamatan" value={a.desas?.kecamatans?.nama} />
								<DetailField label="Kode Kabupaten" value={kodeLokasi(a.desas?.kode)?.kab} />
								<DetailField
									label="Kode Kecamatan · Desa"
									value={kodeLokasi(a.desas?.kode) ? `${kodeLokasi(a.desas?.kode).kec} · ${kodeLokasi(a.desas?.kode).desa}` : null}
								/>
							</div>
						</DetailSection>
					</div>

					<DetailSection title="Data Kepegawaian" icon={IdCard}>
						<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
							<DetailField
								label="NIPD"
								value={
									formatNipd(a.nipd) ||
									(a.nipd_info?.berhak === false ? 'Tidak mendapat NIPD' : 'Terbit setelah data valid')
								}
							/>
							<DetailField label="Kode Jabatan" value={a.nipd_info?.kode_jabatan || (a.nipd_info?.berhak === false ? '—' : null)} />
							<DetailField label="Masa Kerja" value={masaKerja} />
							<DetailField label="Tgl. Pengangkatan" value={formatDate(a.tanggal_pengangkatan)} />
							<DetailField label="No. SK Pengangkatan" value={a.nomor_sk_pengangkatan} />
							<DetailField label="Tgl. Pemberhentian" value={formatDate(a.tanggal_pemberhentian)} />
							<DetailField label="No. SK Pemberhentian" value={a.nomor_sk_pemberhentian} />
						</div>
						<div className="mt-3 border-t border-slate-200 pt-3">
							<DetailField label="Keterangan" value={a.keterangan} />
						</div>
						{verif('jabatan_sk')}
					</DetailSection>

					<div className="grid gap-4 md:grid-cols-2">
						<DetailSection title="BPJS" icon={Shield}>
							<div className="grid grid-cols-1 gap-3">
								<DetailField label="No. BPJS Kesehatan" value={a.bpjs_kesehatan_nomor} />
								<DetailField label="No. BPJS Ketenagakerjaan" value={a.bpjs_ketenagakerjaan_nomor} />
							</div>
							{verif('bpjs')}
						</DetailSection>

						<DetailSection title="Dasar Hukum" icon={Scale}>
							{a.produk_hukums ? (
								<div className="grid grid-cols-1 gap-3">
									<DetailField label="Produk Hukum" value={a.produk_hukums.judul} />
									<div className="grid grid-cols-2 gap-3">
										<DetailField label="Nomor" value={a.produk_hukums.nomor} />
										<DetailField label="Tahun" value={a.produk_hukums.tahun} />
									</div>
								</div>
							) : (
								<p className="text-sm text-slate-400">
									Belum ditautkan ke produk hukum desa.
								</p>
							)}
						</DetailSection>
					</div>

					<DetailSection title={`Berkas (${jumlahBerkas} dari ${BERKAS.length} terunggah)`} icon={Paperclip}>
						<div className="divide-y divide-slate-200">
							{BERKAS.map((b) => (
								<BarisBerkas key={b.kunci} label={b.label} nama={a[b.kunci]} verifikasi={verif(b.kunci, true)} onBuka={setPratinjau} />
							))}
						</div>
					</DetailSection>

					<DetailSection title="Sumber & Rekam Data" icon={Clock}>
						<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
							<DetailField label="Sumber Data" value={LABEL_SUMBER[a.sumber_data] || a.sumber_data} />
							<DetailField label="ID Dapur Desa" value={a.dapur_id} />
							<DetailField label="Dibuat" value={formatWaktu(a.created_at)} />
							<DetailField label="Diperbarui" value={formatWaktu(a.updated_at)} />
						</div>
					</DetailSection>
					</div>

					<div className="border-t border-slate-200 p-5 sm:p-6">
						<PanelVerifikasi aparatur={a} />
					</div>
				</div>

				{/* Kolom kanan: kelengkapan dulu, riwayat di bawahnya. */}
				<aside className="space-y-4 lg:sticky lg:top-6">
					<KelengkapanData aparatur={a} />
					<RiwayatAparatur aparatur={a} />
				</aside>
				</div>
			</div>

			{pratinjau && (
				<PratinjauBerkas label={pratinjau.label} nama={pratinjau.nama} onTutup={() => setPratinjau(null)} />
			)}

			{fotoBesar && foto && (
				<LightboxFoto src={foto} alt={a.nama_lengkap} onClose={() => setFotoBesar(false)} />
			)}

			{menyunting && (
				<PanelIsianAparatur
					aparatur={a}
					onTutup={() => setMenyunting(false)}
					onTersimpan={selesaiSunting}
				/>
			)}

			{dialogStatus && (
				<DialogStatus
					aparatur={a}
					sibuk={sibuk}
					onSimpan={ubahStatus}
					onTutup={() => setDialogStatus(false)}
				/>
			)}

		</div>
	);
};

// ============================================================
// Tab: Database Lokal
// ============================================================
// Pengelompokan ejaan jenjang pendidikan: lihat utils/jenjangPendidikan.js.

const EMPTY_FILTERS = { search: '', kecamatan_id: '', desa_id: '', jabatan: '', jenis_kelamin: '', status: '', pendidikan: '' };

// ============================================================
// Ringkasan kabupaten
// ============================================================
// Berdiri di luar tab: angka se-kabupaten tidak berubah oleh mode yang sedang
// dibuka, jadi menyembunyikannya saat pindah ke mode per wilayah cuma memaksa
// orang bolak-balik untuk melihat angka yang sama.
/**
 * Cakupan pengisian per desa. Menjawab "kenapa KEPALA DESA 414 dan PJ 3 kalau
 * desanya 416": setiap desa masuk tepat satu kelompok pimpinan, dan desa yang
 * belum mengisi apa pun langsung terlihat.
 */
const CakupanDesa = ({ cakupan, bpd }) => {
	const [rinci, setRinci] = useState(false);
	const { total_desa, sudah_input, belum_input, pimpinan, desa_belum_input = [], pimpinan_perlu_dicek = [] } = cakupan;
	const kelompok = bpd
		? []
		: [
				{ label: 'Kepala desa definitif', nilai: pimpinan.definitif, kelas: 'text-emerald-700' },
				{ label: 'Dipimpin PJ', nilai: pimpinan.pj, kelas: 'text-sky-700' },
				{ label: 'Tanpa kades / PJ aktif', nilai: pimpinan.kosong, kelas: pimpinan.kosong ? 'text-rose-700' : 'text-slate-400' },
				{ label: 'Pimpinan aktif ganda', nilai: pimpinan.ganda, kelas: pimpinan.ganda ? 'text-amber-700' : 'text-slate-400' },
		  ];
	const daftar = [
		...desa_belum_input.map((d) => ({ ...d, keadaan: 'Belum input aparatur', nama: '-' })),
		...(bpd ? [] : pimpinan_perlu_dicek),
	];

	return (
		<div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h3 className="text-sm font-semibold text-slate-900">Cakupan Desa</h3>
					<p className="text-xs text-slate-500">
						{fmt(sudah_input)} dari {fmt(total_desa)} desa sudah menginput {bpd ? 'BPD' : 'aparatur'}
						{belum_input > 0 && <span className="font-semibold text-rose-600"> &middot; {fmt(belum_input)} belum</span>}
					</p>
				</div>
				{daftar.length > 0 && (
					<button
						type="button"
						onClick={() => setRinci((v) => !v)}
						className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
					>
						{rinci ? 'Tutup rincian' : `Lihat ${fmt(daftar.length)} desa perlu perhatian`}
						<ChevronDown className={`h-3.5 w-3.5 transition-transform ${rinci ? 'rotate-180' : ''}`} />
					</button>
				)}
			</div>

			<div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
				<div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct(sudah_input, total_desa)}%` }} />
			</div>

			{kelompok.length > 0 && (
				<div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
					{kelompok.map((k) => (
						<div key={k.label} className="rounded-xl border border-slate-200 p-3">
							<p className={`text-xl font-bold leading-none tabular-nums ${k.kelas}`}>{fmt(k.nilai)}</p>
							<p className="mt-1.5 text-[11px] font-medium text-slate-600">{k.label}</p>
						</div>
					))}
				</div>
			)}

			{rinci && (
				<div className="mt-4 max-h-80 overflow-auto rounded-xl border border-slate-200">
					<table className="w-full text-left text-xs">
						<thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
							<tr>
								<th className="px-3 py-2 font-semibold">Kecamatan</th>
								<th className="px-3 py-2 font-semibold">Desa</th>
								<th className="px-3 py-2 font-semibold">Keadaan</th>
								<th className="px-3 py-2 font-semibold">Nama</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{daftar.map((d) => (
								<tr key={`${d.kecamatan}-${d.desa}-${d.keadaan}`}>
									<td className="px-3 py-2 text-slate-600">{d.kecamatan}</td>
									<td className="px-3 py-2 font-medium text-slate-900">{d.desa}</td>
									<td className="px-3 py-2 text-slate-600">{d.keadaan}</td>
									<td className="px-3 py-2 text-slate-600">{d.nama}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
};

const EMPTY_SARING = { kecamatan_id: '', desa_id: '', status: '', jenis_kelamin: '' };

const RingkasanAparatur = ({ jenis, stats: statsKabupaten, statsLoading: loadingKabupaten, onBuka: onBukaInduk }) => {
	const [showSummary, setShowSummary] = useState(true);

	// Penyaring milik ringkasan sendiri — terpisah dari filter tabel, karena
	// yang dicari di sini "angka satu kecamatan", bukan "daftar orang".
	// Tanpa penyaring, angka kabupaten dari induk halaman dipakai apa adanya.
	const [saring, setSaring] = useState(EMPTY_SARING);
	const [statsSaring, setStatsSaring] = useState(null);
	const [loadingSaring, setLoadingSaring] = useState(false);
	const [kecamatanList, setKecamatanList] = useState([]);
	const [desaList, setDesaList] = useState([]);
	const adaSaring = Object.values(saring).some(Boolean);

	useEffect(() => {
		api.get('/kecamatans')
			.then((response) => { if (response.data.success) setKecamatanList(response.data.data || []); })
			.catch((error) => console.error('Failed to fetch kecamatan:', error));
	}, []);

	useEffect(() => {
		if (!saring.kecamatan_id) {
			setDesaList([]);
			return;
		}
		api.get(`/desas/kecamatan/${saring.kecamatan_id}`)
			.then((response) => { if (response.data.success) setDesaList(response.data.data || []); })
			.catch((error) => console.error('Failed to fetch desa:', error));
	}, [saring.kecamatan_id]);

	// statsKabupaten ikut jadi pemicu: tombol muat ulang di kepala halaman
	// memperbarui angka kabupaten, dan angka tersaring ikut diperbarui.
	useEffect(() => {
		if (!adaSaring) {
			setStatsSaring(null);
			return undefined;
		}
		let batal = false;
		setLoadingSaring(true);
		const params = new URLSearchParams(Object.entries({ ...saring, jenis: jenis || '' }).filter(([, v]) => v));
		api.get(`/pemdes/aparatur-desa/stats?${params.toString()}`)
			.then((response) => { if (!batal && response.data.success) setStatsSaring(response.data.data); })
			.catch(() => toast.error('Gagal memuat statistik tersaring'))
			.finally(() => { if (!batal) setLoadingSaring(false); });
		return () => { batal = true; };
	}, [saring, jenis, adaSaring, statsKabupaten]);

	const stats = adaSaring ? statsSaring : statsKabupaten;
	const statsLoading = adaSaring ? loadingSaring : loadingKabupaten;
	const saringAktif = useMemo(() => Object.fromEntries(Object.entries(saring).filter(([, v]) => v)), [saring]);
	// Pop-up di balik grafik memakai penyaring yang sama, kalau tidak jumlah
	// orang di pop-up berbeda dari angka yang diklik.
	const onBuka = onBukaInduk && ((filter, judul) => onBukaInduk({ ...saringAktif, ...filter }, judul));

	const ubahSaring = (kunci, nilai) =>
		setSaring((prev) => ({ ...prev, [kunci]: nilai, ...(kunci === 'kecamatan_id' ? { desa_id: '' } : {}) }));

	const labelSaring = useMemo(() => {
		const label = [];
		if (saring.kecamatan_id) {
			const kec = kecamatanList.find((k) => String(k.id || k.id_kecamatan) === String(saring.kecamatan_id));
			label.push(`Kecamatan: ${kec?.nama || kec?.name || saring.kecamatan_id}`);
		}
		if (saring.desa_id) {
			const desa = desaList.find((d) => String(d.id) === String(saring.desa_id));
			label.push(`Desa: ${desa?.nama || desa?.name || saring.desa_id}`);
		}
		if (saring.status) label.push(`Status: ${saring.status === 'Aktif' ? 'Aktif' : 'Tidak Aktif'}`);
		if (saring.jenis_kelamin) label.push(`Kelamin: ${saring.jenis_kelamin === 'Laki_laki' ? 'Laki-laki' : 'Perempuan'}`);
		return label;
	}, [saring, kecamatanList, desaList]);

	// Ejaan jenjang dari dua sumber data disatukan jadi satu label sebelum
	// digambar, kalau tidak "S1" dan "STRATA I" jadi dua batang berbeda.
	const pendidikanChart = useMemo(() => {
		const peta = new Map();
		for (const item of stats?.pendidikan || []) {
			const { label, order } = jenjangKey(item.name);
			// `values` = ejaan mentah dalam satu jenjang — dipakai saat batangnya
			// diklik, supaya daftar yang muncul memuat semua ejaan itu.
			const sebelumnya = peta.get(label) || { name: label, value: 0, order, values: [] };
			sebelumnya.value += Number(item.value ?? 0);
			sebelumnya.values.push(item.name);
			peta.set(label, sebelumnya);
		}
		return [...peta.values()].sort((a, b) => b.order - a.order);
	}, [stats]);

	const total = Number(stats?.total ?? 0);

	const eksporStatistik = async (format) => {
		if (!stats) return;
		try {
			const { eksporStatistikExcel, eksporStatistikPdf } = await import('./aparaturEkspor');
			const opsi = { judul: `Statistik ${JUDUL_JENIS[jenis] || 'Aparatur Desa'}`, penyaring: labelSaring, bpd: jenis === 'bpd' };
			await (format === 'pdf' ? eksporStatistikPdf(stats, pendidikanChart, opsi) : eksporStatistikExcel(stats, pendidikanChart, opsi));
		} catch (error) {
			console.error('Gagal mengekspor statistik:', error);
			toast.error('Gagal mengekspor statistik');
		}
	};

	return (
		<section>
			<div className="mb-3 flex items-center justify-between gap-3">
				<div>
					<h2 className="text-base font-semibold text-slate-900">{adaSaring ? 'Ringkasan Tersaring' : 'Ringkasan Kabupaten'}</h2>
					<p className="text-xs text-slate-500">
						{adaSaring ? labelSaring.join(' · ') : 'Statistik seluruh aparatur terdata'} &mdash; penyaringnya terpisah dari filter tabel.
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-2">
				<TombolEkspor kecil onEkspor={eksporStatistik} disabled={!stats || statsLoading} />
				<button
					type="button"
					onClick={() => setShowSummary((prev) => !prev)}
					className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
				>
					{showSummary ? 'Sembunyikan' : 'Tampilkan'}
					<ChevronDown className={`h-3.5 w-3.5 transition-transform ${showSummary ? 'rotate-180' : ''}`} />
				</button>
				</div>
			</div>

			{showSummary && (
				<>
					<div className="mb-4 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end">
						<SelectBox
							label="Kecamatan"
							value={saring.kecamatan_id}
							onChange={(value) => ubahSaring('kecamatan_id', value)}
							placeholder="Semua Kecamatan"
							emptyText="Kecamatan tidak ditemukan"
							options={[
								{ value: '', label: 'Semua Kecamatan' },
								...kecamatanList.map((kecamatan) => ({
									value: String(kecamatan.id || kecamatan.id_kecamatan),
									label: kecamatan.nama || kecamatan.name,
								})),
							]}
						/>
						<SelectBox
							label="Desa"
							value={saring.desa_id}
							onChange={(value) => ubahSaring('desa_id', value)}
							disabled={!saring.kecamatan_id}
							placeholder={saring.kecamatan_id ? 'Semua Desa' : 'Pilih kecamatan dulu'}
							emptyText="Desa tidak ditemukan"
							options={[
								{ value: '', label: 'Semua Desa' },
								...desaList.map((desa) => ({ value: String(desa.id), label: desa.nama || desa.name })),
							]}
						/>
						<SelectBox
							label="Status"
							value={saring.status}
							onChange={(value) => ubahSaring('status', value)}
							placeholder="Semua"
							options={[
								{ value: '', label: 'Semua' },
								{ value: 'Aktif', label: 'Aktif' },
								{ value: 'Tidak_Aktif', label: 'Tidak Aktif' },
							]}
						/>
						<SelectBox
							label="Jenis Kelamin"
							value={saring.jenis_kelamin}
							onChange={(value) => ubahSaring('jenis_kelamin', value)}
							placeholder="Semua"
							options={[
								{ value: '', label: 'Semua' },
								{ value: 'Laki_laki', label: 'Laki-laki' },
								{ value: 'Perempuan', label: 'Perempuan' },
							]}
						/>
						<button
							type="button"
							onClick={() => setSaring(EMPTY_SARING)}
							disabled={!adaSaring}
							className="h-11 rounded-xl px-3 text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline disabled:invisible"
						>
							Reset
						</button>
					</div>

					{statsLoading && !stats ? (
						<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
							{Array.from({ length: 4 }).map((_, index) => (
								<div key={index} className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white" />
							))}
						</div>
					) : (
						stats && (
							<>
								{/* Halaman yang sudah tersaring (Perangkat Desa / BPD) tidak
								    memajang pecahan Pemdes vs BPD: salah satunya pasti nol. */}
								<div className={`grid grid-cols-2 gap-4 ${jenis ? 'lg:grid-cols-2' : 'lg:grid-cols-4'}`}>
									<StatCard
										label="Total Aparatur"
										value={fmt(stats.total)}
										hint={stats.desa_count ? `Tersebar di ${fmt(stats.desa_count)} desa` : null}
										icon={Users}
										iconClass="bg-slate-100 text-brand-600"
										onClick={onBuka && (() => onBuka({}, 'Semua aparatur'))}
									/>
									{!jenis && (
										<>
											<StatCard
												label="Perangkat Desa"
												value={fmt(stats.total_pemdes)}
												icon={Building2}
												iconClass="bg-slate-100 text-slate-600"
												share={pct(stats.total_pemdes, total)}
												barClass="bg-slate-500"
												onClick={onBuka && (() => onBuka({ jenis: 'perangkat' }, 'Perangkat desa'))}
											/>
											<StatCard
												label="BPD"
												value={fmt(stats.total_bpd)}
												icon={Shield}
												iconClass="bg-slate-100 text-brand-600"
												share={pct(stats.total_bpd, total)}
												barClass="bg-slate-800"
												onClick={onBuka && (() => onBuka({ jenis: 'bpd' }, 'BPD'))}
											/>
										</>
									)}
									<StatCard
										label="Aparatur Aktif"
										value={fmt(stats.aktif)}
										hint={`${fmt(stats.tidak_aktif)} tidak aktif`}
										icon={CheckCircle2}
										iconClass="bg-emerald-50 text-emerald-600"
										share={pct(stats.aktif, total)}
										barClass="bg-emerald-500"
										onClick={onBuka && (() => onBuka({ status: 'Aktif' }, 'Aparatur aktif'))}
									/>
								</div>

								{stats.cakupan_desa && <CakupanDesa cakupan={stats.cakupan_desa} bpd={jenis === 'bpd'} />}

								{/* 5 kolom: donut butuh ruang persegi, bar butuh ruang lebar */}
								<div className="mt-4 grid gap-4 lg:grid-cols-5">
									<ChartCard
										title="Jenis Kelamin"
										subtitle="Komposisi laki-laki dan perempuan"
										className="lg:col-span-2"
									>
										<GenderDonut lakiLaki={stats.laki_laki} perempuan={stats.perempuan} onPilih={onBuka && ((item) => onBuka({ jenis_kelamin: item.kunci }, item.name))} />
									</ChartCard>

									<ChartCard
										title="Rentang Usia"
										subtitle="Sebaran umur aparatur saat ini"
										className="lg:col-span-3"
									>
										<BarVertikal items={stats.rentang_usia || []} onPilih={onBuka && ((item) => onBuka({ usia: item.name }, `Usia ${item.name} tahun`))} />
									</ChartCard>

									<ChartCard
										title="Komposisi Jabatan"
										subtitle="Aparatur aktif, urut susunan jabatan, ejaan disatukan"
										className="lg:col-span-5"
									>
										<KomposisiJabatan items={stats.jabatan || []} onPilih={onBuka && ((item) => onBuka({ jabatan_baku: item.name, status: 'Aktif' }, item.name))} />
									</ChartCard>

									<ChartCard
										title="Pendidikan Terakhir"
										subtitle="Dikelompokkan per jenjang"
										className="lg:col-span-5"
									>
										<BarList
											items={pendidikanChart}
											onPilih={onBuka && ((item) => onBuka({ pendidikan: (item.values || []).join(',') }, `Pendidikan ${item.name}`))}
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
	);
};

// ============================================================
// Pop-up data di balik grafik
// ============================================================
// Klik batang, irisan, atau kartu → daftar orang yang dihitungnya. Penyaring
// yang dipakai sama dengan endpoint daftar (bangunWhere di server), jadi
// jumlah di pop-up selalu sama dengan angka grafiknya.
const PopupDataAparatur = ({ judul, filter, jenis, detailBasePath, onTutup }) => {
	const navigate = useNavigate();
	const [data, setData] = useState([]);
	const [meta, setMeta] = useState({ totalItems: 0, totalPages: 1 });
	const [halaman, setHalaman] = useState(1);
	const [cari, setCari] = useState('');
	const [kata, setKata] = useState('');
	const [memuat, setMemuat] = useState(true);

	useEffect(() => {
		const t = setTimeout(() => {
			setKata(cari.trim());
			setHalaman(1);
		}, 350);
		return () => clearTimeout(t);
	}, [cari]);

	useEffect(() => {
		const onKey = (event) => event.key === 'Escape' && onTutup();
		document.addEventListener('keydown', onKey);
		const semula = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.removeEventListener('keydown', onKey);
			document.body.style.overflow = semula;
		};
	}, [onTutup]);

	useEffect(() => {
		let batal = false;
		setMemuat(true);
		const params = { ...(jenis ? { jenis } : {}), ...filter, page: halaman, limit: 20, ...(kata ? { search: kata } : {}) };
		api.get('/pemdes/aparatur-desa', { params })
			.then((response) => {
				if (batal) return;
				setData(response.data?.data || []);
				setMeta(response.data?.meta || { totalItems: 0, totalPages: 1 });
			})
			.catch((error) => {
				console.error('Failed to fetch data pop-up:', error);
				if (!batal) toast.error('Gagal memuat data');
			})
			.finally(() => !batal && setMemuat(false));
		return () => { batal = true; };
	}, [filter, jenis, halaman, kata]);

	return (
		<motion.div
			className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			onClick={onTutup}
			role="presentation"
		>
			<motion.div
				initial={{ opacity: 0, y: 28, scale: 0.98 }}
				animate={{ opacity: 1, y: 0, scale: 1 }}
				transition={{ type: 'spring', stiffness: 320, damping: 30 }}
				onClick={(event) => event.stopPropagation()}
				role="dialog"
				aria-modal="true"
				aria-label={judul}
				className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl"
			>
				<div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
					<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
						<Users className="h-5 w-5" />
					</span>
					<div className="min-w-0 flex-1">
						<h3 className="truncate text-base font-semibold text-slate-900">{judul}</h3>
						<p className="text-xs text-slate-500">
							{memuat ? 'Memuat…' : `${fmt(meta.totalItems)} aparatur`}
							{kata && ` · cocok dengan "${kata}"`}
						</p>
					</div>
					<button type="button" onClick={onTutup} aria-label="Tutup" className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
						<X className="h-5 w-5" />
					</button>
				</div>

				<div className="border-b border-slate-100 px-5 py-3">
					<div className="relative">
						<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
						<input
							value={cari}
							onChange={(event) => setCari(event.target.value)}
							placeholder="Cari nama atau jabatan di daftar ini…"
							className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm focus:border-slate-400 focus:bg-white focus:outline-none"
						/>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto">
					{memuat && data.length === 0 ? (
						<TableSkeleton rows={6} />
					) : data.length === 0 ? (
						<p className="py-16 text-center text-sm text-slate-500">Tidak ada data.</p>
					) : (
						<ul className={`divide-y divide-slate-100 transition-opacity ${memuat ? 'opacity-50' : ''}`}>
							{data.map((orang) => (
								<li key={orang.id}>
									<button
										type="button"
										onClick={() => navigate(`${detailBasePath}/${orang.id}`)}
										className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-slate-50"
									>
										<Avatar person={orang} className="h-10 w-10 text-sm" />
										<span className="min-w-0 flex-1">
											<span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
												<span className="truncate">{orang.nama_lengkap}</span>
												<TandaVerifikasi status={orang.status_verifikasi} />
											</span>
											<span className="block truncate text-xs text-slate-500">
												{orang.jabatan} · Ds. {orang.desas?.nama || '-'} · Kec. {orang.desas?.kecamatans?.nama || '-'}
											</span>
										</span>
										<span className="hidden shrink-0 sm:block">
											<BadgeVerifikasi status={orang.status_verifikasi} />
										</span>
										<StatusBadge status={orang.status} />
									</button>
								</li>
							))}
						</ul>
					)}
				</div>

				{meta.totalPages > 1 && (
					<div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
						<span>
							Halaman <span className="font-semibold text-slate-800">{halaman}</span> dari {fmt(meta.totalPages)}
						</span>
						<div className="flex gap-1">
							<button
								type="button"
								onClick={() => setHalaman((h) => Math.max(1, h - 1))}
								disabled={halaman <= 1 || memuat}
								className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
								aria-label="Halaman sebelumnya"
							>
								<ChevronLeft className="h-4 w-4" />
							</button>
							<button
								type="button"
								onClick={() => setHalaman((h) => Math.min(meta.totalPages, h + 1))}
								disabled={halaman >= meta.totalPages || memuat}
								className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
								aria-label="Halaman berikutnya"
							>
								<ChevronRight className="h-4 w-4" />
							</button>
						</div>
					</div>
				)}
			</motion.div>
		</motion.div>
	);
};

/**
 * Pratinjau berkas di pop-up — gambar ditampilkan langsung, PDF disematkan.
 * Tab baru tetap tersedia sebagai pilihan, bukan satu-satunya jalan.
 */
const PratinjauBerkas = ({ label, nama, onTutup }) => {
	const url = berkasUrl(nama);
	const ext = String(nama || '').split('.').pop().toLowerCase();
	const gambar = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
	const pdf = ext === 'pdf';

	useEffect(() => {
		const onKey = (event) => event.key === 'Escape' && onTutup();
		document.addEventListener('keydown', onKey);
		const semula = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.removeEventListener('keydown', onKey);
			document.body.style.overflow = semula;
		};
	}, [onTutup]);

	return (
		<motion.div
			className="fixed inset-0 z-[100] flex flex-col bg-slate-950/90 backdrop-blur-sm"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			onClick={onTutup}
			role="presentation"
		>
			<div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 text-white sm:px-6" onClick={(event) => event.stopPropagation()}>
				<div className="min-w-0">
					<p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Pratinjau berkas</p>
					<p className="truncate text-sm font-semibold">{label}</p>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<a
						href={url}
						target="_blank"
						rel="noreferrer"
						className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold ring-1 ring-white/15 transition-colors hover:bg-white/20"
					>
						<ExternalLink className="h-3.5 w-3.5" />
						<span className="hidden sm:inline">Tab baru</span>
					</a>
					<button type="button" onClick={onTutup} aria-label="Tutup" className="rounded-lg bg-white/10 p-2 ring-1 ring-white/15 transition-colors hover:bg-white/20">
						<X className="h-5 w-5" />
					</button>
				</div>
			</div>
			<motion.div
				initial={{ opacity: 0, scale: 0.97 }}
				animate={{ opacity: 1, scale: 1 }}
				className="flex min-h-0 flex-1 items-center justify-center px-4 pb-4 sm:px-6 sm:pb-6"
				onClick={(event) => event.stopPropagation()}
			>
				{gambar ? (
					<img src={url} alt={label} className="max-h-full max-w-full rounded-xl object-contain shadow-2xl" />
				) : pdf ? (
					<iframe src={url} title={label} className="h-full w-full max-w-5xl rounded-xl bg-white shadow-2xl" />
				) : (
					<div className="rounded-2xl bg-white p-8 text-center">
						<FileText className="mx-auto h-10 w-10 text-slate-300" />
						<p className="mt-3 text-sm text-slate-600">Jenis berkas ini tidak bisa dipratinjau.</p>
						<a href={url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-slate-900 underline">
							Buka di tab baru
						</a>
					</div>
				)}
			</motion.div>
		</motion.div>
	);
};

// ============================================================
// Capaian verifikasi (setara Capaian Verifikasi di kelembagaan)
// ============================================================
// Warna bermakna, bukan kategori: hijau = sudah, kuning = menunggu, merah =
// dikembalikan ke desa. Sama dengan ringkasan status kelembagaan.
const WARNA_VERIFIKASI = { terverifikasi: '#16a34a', belum: '#eab308', ditolak: '#e11d48' };

const CapaianVerifikasiAparatur = ({ stats, loading, onBuka }) => {
	const [semua, setSemua] = useState(false);
	const v = stats?.verifikasi;
	const daftar = stats?.verifikasi_per_kecamatan || [];

	if (loading && !stats) {
		return <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />;
	}
	if (!v) return null;

	const donat = [
		{ key: 'terverifikasi', name: 'Terverifikasi', value: v.terverifikasi },
		{ key: 'belum', name: 'Belum diverifikasi', value: v.belum },
		{ key: 'ditolak', name: 'Dikembalikan ke desa', value: v.ditolak },
	];
	const tampil = semua ? daftar : daftar.slice(0, 8);

	return (
		<section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-3">
			<div className="lg:col-span-2">
				<div className="mb-1 flex items-start justify-between gap-3">
					<div>
						<h3 className="text-base font-bold text-slate-900">Capaian Verifikasi per Kecamatan</h3>
						<p className="text-xs text-slate-500">Aparatur yang datanya dinyatakan valid oleh Bidang Pemdes</p>
					</div>
					{daftar.length > 8 && (
						<button
							type="button"
							onClick={() => setSemua((x) => !x)}
							className="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200"
						>
							{semua ? 'Ringkas' : `Semua ${daftar.length} kecamatan`}
						</button>
					)}
				</div>
				<div className="mt-3 divide-y divide-slate-100">
					{tampil.map((k) => {
						const persen = k.total ? Math.round((k.terverifikasi / k.total) * 100) : 0;
						return (
							<div key={k.id} role="button" tabIndex={0} title="Klik untuk melihat aparatur kecamatan ini" onClick={() => onBuka?.({ kecamatan_id: k.id }, `Kecamatan ${k.nama}`)} onKeyDown={(event) => event.key === "Enter" && onBuka?.({ kecamatan_id: k.id }, `Kecamatan ${k.nama}`)} className="-mx-1.5 flex cursor-pointer items-center gap-3 rounded-lg px-1.5 py-2 transition-colors hover:bg-slate-50">
								<div className="w-36 shrink-0 truncate text-sm font-medium text-slate-700" title={k.nama}>
									{k.nama}
								</div>
								<div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
									<div className="h-full transition-all duration-700" style={{ width: `${pct(k.terverifikasi, k.total)}%`, backgroundColor: WARNA_VERIFIKASI.terverifikasi }} />
									<div className="h-full transition-all duration-700" style={{ width: `${pct(k.ditolak, k.total)}%`, backgroundColor: WARNA_VERIFIKASI.ditolak }} />
								</div>
								<div className="w-20 text-right text-sm tabular-nums">
									<span className="font-bold text-slate-900">{fmt(k.terverifikasi)}</span>
									<span className="text-slate-400">/{fmt(k.total)}</span>
								</div>
								<div className="w-11 text-right text-xs font-semibold tabular-nums text-emerald-700">{persen}%</div>
							</div>
						);
					})}
				</div>
				<div className="mt-2 flex items-center gap-3 border-t-2 border-slate-200 pt-3">
					<div className="w-36 shrink-0 text-sm font-bold text-slate-900">Total kabupaten</div>
					<div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
						<div className="h-full rounded-full bg-slate-800 transition-all duration-700" style={{ width: `${v.persen}%` }} />
					</div>
					<div className="w-20 text-right text-sm tabular-nums">
						<span className="font-bold text-slate-900">{fmt(v.terverifikasi)}</span>
						<span className="text-slate-400">/{fmt(v.total)}</span>
					</div>
					<div className="w-11 text-right text-xs font-bold tabular-nums text-slate-900">{v.persen}%</div>
				</div>
			</div>

			<div className="flex flex-col items-center border-t border-slate-100 pt-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
				<h3 className="self-start text-base font-bold text-slate-900">Status Verifikasi</h3>
				<p className="self-start text-xs text-slate-500">Komposisi seluruh aparatur terdata</p>
				<div className="relative mt-3 h-44 w-44">
					<PieChart width={176} height={176}>
						<Pie data={donat} dataKey="value" innerRadius={54} outerRadius={80} paddingAngle={v.total ? 2 : 0} stroke="#fff" strokeWidth={2}>
							{donat.map((d) => (
								<Cell key={d.key} fill={WARNA_VERIFIKASI[d.key]} />
							))}
						</Pie>
						<RechartsTooltip
							formatter={(nilai, nama) => [`${fmt(nilai)} orang (${pct(nilai, v.total)}%)`, nama]}
							contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
						/>
					</PieChart>
					<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
						<span className="text-2xl font-bold text-slate-900">{v.persen}%</span>
						<span className="text-[11px] text-slate-500">terverifikasi</span>
					</div>
				</div>
				<div className="mt-3 w-full space-y-1.5">
					{donat.map((d) => (
						<div key={d.key} role="button" onClick={() => onBuka?.({ verifikasi: d.key }, d.name)} className="-mx-1.5 flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1 text-sm transition-colors hover:bg-slate-50">
							<span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: WARNA_VERIFIKASI[d.key] }} />
							<span className="flex-1 text-slate-600">{d.name}</span>
							<span className="font-semibold tabular-nums text-slate-900">{fmt(d.value)}</span>
						</div>
					))}
				</div>
			</div>
		</section>
	);
};

const DatabaseTab = ({ refreshKey = 0, jenis, stats, statsLoading, detailBasePath, onLoadingChange, onUpdated, onTambah, onBuka }) => {
	const navigate = useNavigate();
	const bukaDetail = (idAparatur) => navigate(`${detailBasePath}/${idAparatur}`);
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState([]);
	const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1, totalItems: 0 });
	const [filters, setFilters] = useState(EMPTY_FILTERS);
	const [searchInput, setSearchInput] = useState('');
	const [kecamatanList, setKecamatanList] = useState([]);
	const [desaList, setDesaList] = useState([]);
	const [showFilters, setShowFilters] = useState(false);
	const isFirstRefresh = useRef(true);

	const fetchData = useCallback(async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams();
			Object.entries(filters).forEach(([key, value]) => {
				if (value) params.append(key, value);
			});
			if (jenis) params.append('jenis', jenis);
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
	}, [filters, jenis, pagination.page, pagination.limit, onUpdated]);

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
	}, []);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	useEffect(() => {
		onLoadingChange?.(loading);
	}, [loading, onLoadingChange]);

	// Refresh dari header halaman
	useEffect(() => {
		if (isFirstRefresh.current) {
			isFirstRefresh.current = false;
			return;
		}
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

	// Isi kolom pendidikan datang dari dua sumber dengan ejaan berbeda
	// ("S1" vs "STRATA I / DIPLOMA IV", "SMA/SMK" vs "SLTA/Sederajat"), jadi
	// ejaan yang setara digabung jadi satu jenjang. Hasil pengelompokan ini
	// dipakai bersama oleh grafik dan filter supaya angkanya tidak berbeda.
	const pendidikanOptions = useMemo(() => {
		const buckets = new Map();
		for (const item of stats?.pendidikan || []) {
			const raw = String(item?.name || '').trim();
			if (!raw) continue;
			const key = raw === 'Tidak Diketahui' ? { label: 'Tidak Diketahui', order: 100 } : jenjangKey(raw);
			const bucket = buckets.get(key.label) || { label: key.label, order: key.order, total: 0, values: [] };
			bucket.total += Number(item.value) || 0;
			bucket.values.push(raw);
			buckets.set(key.label, bucket);
		}
		return [...buckets.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'id'));
	}, [stats]);

	// Filter: "Tidak Diketahui" bukan jenjang, jadi tidak ditawarkan sebagai pilihan.
	const pendidikanFilterOptions = useMemo(
		() => pendidikanOptions.filter((item) => item.label !== 'Tidak Diketahui'),
		[pendidikanOptions]
	);

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
				case 'pendidikan': {
					const bucket = pendidikanFilterOptions.find((item) => item.values.join(',') === value);
					return `Pendidikan: ${bucket?.label || value}`;
				}
				case 'jenis_kelamin':
					return `Kelamin: ${value === 'Laki_laki' ? 'Laki-laki' : 'Perempuan'}`;
				case 'status':
					return `Status: ${value === 'Aktif' ? 'Aktif' : 'Tidak Aktif'}`;
				default:
					return value;
			}
		},
		[kecamatanList, desaList, pendidikanFilterOptions]
	);

	const activeFilters = useMemo(
		() => Object.entries(filters).filter(([, value]) => Boolean(value)),
		[filters]
	);

	const removeFilter = (key) => {
		if (key === 'search') setSearchInput('');
		handleFilterChange(key, '');
	};

	// Ekspor memakai penyaring yang sama dengan tabel, tapi tanpa halaman:
	// berkasnya berisi semua baris yang cocok, bukan hanya 20 di layar.
	const eksporTabel = async (format) => {
		try {
			const params = new URLSearchParams();
			Object.entries(filters).forEach(([key, value]) => {
				if (value) params.append(key, value);
			});
			if (jenis) params.append('jenis', jenis);
			const response = await api.get(`/pemdes/aparatur-desa/ekspor?${params.toString()}`);
			const baris = response.data?.data || [];
			if (!baris.length) {
				toast.error('Tidak ada data yang cocok dengan penyaring');
				return;
			}
			const { eksporTabelExcel, eksporTabelPdf } = await import('./aparaturEkspor');
			const opsi = {
				judul: `Data ${JUDUL_JENIS[jenis] || 'Aparatur Desa'}`,
				penyaring: activeFilters.map(([key, value]) => labelFor(key, value)),
			};
			await (format === 'pdf' ? eksporTabelPdf(baris, opsi) : eksporTabelExcel(baris, opsi));
			toast.success(`${baris.length.toLocaleString('id-ID')} baris diekspor`);
		} catch (error) {
			console.error('Gagal mengekspor aparatur:', error);
			toast.error(error.response?.data?.message || 'Gagal mengekspor data');
		}
	};

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
			{/* Statistik hanya milik mode ini. Dulu ringkasannya berdiri di atas
			    kedua tab, sehingga berpindah tab nyaris tidak mengubah layar. */}
			<RingkasanAparatur jenis={jenis} stats={stats} statsLoading={statsLoading} onBuka={onBuka} />

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
							className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-50"
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
									? 'border-slate-200 bg-slate-100 text-slate-700'
									: 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
							}`}
						>
							<SlidersHorizontal className="h-4 w-4" />
							Filter
							{activeFilters.length > 0 && (
								<span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-slate-900 px-1 text-[11px] font-bold text-white">
									{activeFilters.length}
								</span>
							)}
						</button>
						<TombolEkspor onEkspor={eksporTabel} disabled={loading || pagination.totalItems === 0} />
						<button
							type="button"
							onClick={fetchData}
							className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
							title="Muat ulang data"
						>
							<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
						</button>
						{onTambah && (
							<button
								type="button"
								onClick={() => onTambah(null)}
								className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
							>
								<Plus className="h-4 w-4" />
								<span className="hidden sm:inline">Tambah</span>
							</button>
						)}
					</div>
				</div>

				{showFilters && (
					<div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
						<SelectBox
							label="Kecamatan"
							value={filters.kecamatan_id}
							onChange={(value) => handleFilterChange('kecamatan_id', value)}
							placeholder="Semua Kecamatan"
							emptyText="Kecamatan tidak ditemukan"
							options={[
								{ value: '', label: 'Semua Kecamatan' },
								...kecamatanList.map((kecamatan) => ({
									value: String(kecamatan.id || kecamatan.id_kecamatan),
									label: kecamatan.nama || kecamatan.name,
								})),
							]}
						/>

						<SelectBox
							label="Desa"
							value={filters.desa_id}
							onChange={(value) => handleFilterChange('desa_id', value)}
							disabled={!filters.kecamatan_id}
							placeholder={filters.kecamatan_id ? 'Semua Desa' : 'Pilih kecamatan dulu'}
							emptyText="Desa tidak ditemukan"
							options={[
								{ value: '', label: 'Semua Desa' },
								...desaList.map((desa) => ({ value: String(desa.id), label: desa.nama || desa.name })),
							]}
						/>

						<label className="block">
							<span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-600">Jabatan</span>
							<input
								type="text"
								placeholder="Contoh: Kepala Desa"
								value={filters.jabatan}
								onChange={(event) => handleFilterChange('jabatan', event.target.value)}
								className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-900 shadow-sm transition-colors placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
							/>
						</label>

						<SelectBox
							label="Pendidikan"
							value={filters.pendidikan}
							onChange={(value) => handleFilterChange('pendidikan', value)}
							placeholder="Semua Pendidikan"
							options={[
								{ value: '', label: 'Semua Pendidikan' },
								...pendidikanFilterOptions.map((item) => ({
									value: item.values.join(','),
									label: item.label,
									hint: `(${item.total.toLocaleString('id-ID')})`,
								})),
							]}
						/>

						<SelectBox
							label="Jenis Kelamin"
							value={filters.jenis_kelamin}
							onChange={(value) => handleFilterChange('jenis_kelamin', value)}
							placeholder="Semua"
							options={[
								{ value: '', label: 'Semua' },
								{ value: 'Laki_laki', label: 'Laki-laki' },
								{ value: 'Perempuan', label: 'Perempuan' },
							]}
						/>

						<SelectBox
							label="Status"
							value={filters.status}
							onChange={(value) => handleFilterChange('status', value)}
							placeholder="Semua"
							options={[
								{ value: '', label: 'Semua' },
								{ value: 'Aktif', label: 'Aktif' },
								{ value: 'Tidak_Aktif', label: 'Tidak Aktif' },
							]}
						/>
					</div>
				)}

				{activeFilters.length > 0 && (
					<div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
						{activeFilters.map(([key, value]) => (
							<span
								key={key}
								className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-3 pr-1.5 text-xs font-medium text-brand-700"
							>
								{labelFor(key, value)}
								<button
									type="button"
									onClick={() => removeFilter(key)}
									className="rounded-full p-0.5 transition-colors hover:bg-slate-50"
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
					<div className="flex items-center gap-2 text-xs text-slate-500">
						<span>Tampilkan</span>
						<SelectBox
							size="sm"
							className="w-24"
							value={String(pagination.limit)}
							onChange={(value) => setPagination((prev) => ({ ...prev, limit: Number(value), page: 1 }))}
							options={[20, 50, 100].map((size) => ({ value: String(size), label: String(size) }))}
						/>
						<span>baris</span>
					</div>
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
										<th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-brand-600">
											Aparatur
										</th>
										<th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-brand-600">
											NIPD
										</th>
										<th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-brand-600">
											Jabatan
										</th>
										<th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-brand-600">
											Wilayah
										</th>
										<th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-brand-600">
											Status
										</th>
										<th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-brand-600">
											Aksi
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100">
									{data.map((aparatur) => (
										<tr
											key={aparatur.id}
											onClick={() => bukaDetail(aparatur.id)}
											className="cursor-pointer transition-colors hover:bg-slate-50"
										>
											<td className="px-5 py-3.5">
												<div className="flex items-center gap-3">
													<Avatar person={aparatur} />
													<div className="min-w-0">
														<p className="flex items-center gap-1.5 truncate font-medium text-slate-900">
															<span className="truncate">{aparatur.nama_lengkap}</span>
															<TandaVerifikasi status={aparatur.status_verifikasi} />
														</p>
														<p className="truncate text-xs text-slate-500">
															{aparatur.jenis_kelamin === 'Laki_laki' ? 'Laki-laki' : 'Perempuan'}
															{aparatur.pendidikan_terakhir ? ` · ${aparatur.pendidikan_terakhir}` : ''}
														</p>
													</div>
												</div>
											</td>
											<td className="px-5 py-3.5">
												{aparatur.nipd ? (
													<span className="font-mono text-xs tracking-wide text-slate-800">{formatNipd(aparatur.nipd)}</span>
												) : (
													<span className="text-xs text-slate-400">Belum terbit</span>
												)}
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
												<span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-600 transition-colors hover:bg-slate-50">
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
									onClick={() => bukaDetail(aparatur.id)}
									onKeyDown={(event) => {
										if (event.key === 'Enter' || event.key === ' ') {
											event.preventDefault();
											bukaDetail(aparatur.id);
										}
									}}
									className="flex w-full items-start gap-3 p-4 text-left transition-colors active:bg-slate-50"
								>
									<Avatar person={aparatur} />
									<div className="min-w-0 flex-1">
										<div className="flex items-start justify-between gap-2">
											<h3 className="flex min-w-0 items-center gap-1.5 font-semibold text-slate-900">
												<span className="truncate">{aparatur.nama_lengkap}</span>
												<TandaVerifikasi status={aparatur.status_verifikasi} />
											</h3>
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
		</div>
	);
};

// ============================================================
// Tab: Per Wilayah
// ============================================================
// Peta kelengkapan isian: Kecamatan → Desa → aparatur. Pertanyaan yang dijawab
// mode ini berbeda dari mode tabel — bukan "siapa saja orangnya", melainkan
// "desa mana yang sudah terisi, siapa pimpinannya, dan mana yang masih kosong".
// Server ikut mengirim desa tanpa aparatur, supaya yang kosong kelihatan dan
// bisa langsung diisikan. Urutan jabatan dihitung server.
const POLA_PIMPINAN = {
	perangkat: /kepala\s*desa|^\s*kades\b/i,
	bpd: /^\s*ketua\b(?!.*wakil)/i,
};

/** Kepala desa (atau ketua BPD) aktif — orang pertama yang dicari di desa. */
const pimpinanDesa = (desa, jenis) => {
	const pola = POLA_PIMPINAN[jenis === 'bpd' ? 'bpd' : 'perangkat'];
	return desa.aparatur.find((orang) => orang.status === 'Aktif' && pola.test(orang.jabatan || '')) || null;
};

const SARINGAN_WILAYAH = [
	{ id: 'semua', label: 'Semua desa' },
	{ id: 'kosong', label: 'Belum ada data' },
	{ id: 'belum-verifikasi', label: 'Ada yang belum diverifikasi' },
];

/**
 * Batang tipis rasio terverifikasi. Hijau penuh hanya di 100%; di bawahnya
 * hijau muda — bukan merah, karena "belum diverifikasi" itu antrean kerja
 * bidang, bukan kesalahan desa.
 */
const BatangTerisi = ({ terisi, total }) => {
	const persen = total > 0 ? Math.round((terisi / total) * 100) : 0;
	const nada = persen === 100 ? 'bg-emerald-500' : 'bg-emerald-300';
	return (
		<div className="flex items-center gap-2">
			<div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
				<div className={`h-full rounded-full ${nada}`} style={{ width: `${persen}%` }} />
			</div>
			<span className="w-9 shrink-0 text-right text-[11px] font-semibold tabular-nums text-slate-600">{persen}%</span>
		</div>
	);
};

const BarisAparatur = ({ person, nomor, onBuka, onUbah }) => (
	<div className="group flex items-center gap-1 rounded-xl transition-colors hover:bg-white">
		<button type="button" onClick={onBuka} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left">
			<span className="w-5 shrink-0 text-right text-xs tabular-nums text-slate-400">{nomor}</span>
			<Avatar person={person} className="h-9 w-9 text-xs" />
			<span className="min-w-0 flex-1">
				<span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
					<span className="truncate">{person.nama_lengkap}</span>
					<TandaVerifikasi status={person.status_verifikasi} />
				</span>
				<span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
					<span className="truncate">{person.jabatan}</span>
					<span className="shrink-0 text-slate-400">
						NIPD{' '}
						{person.nipd ? (
							<span className="font-mono tracking-wide text-slate-700">{formatNipd(person.nipd)}</span>
						) : (
							<span className="text-slate-400">belum terbit</span>
						)}
					</span>
				</span>
			</span>
			<StatusBadge status={person.status} />
		</button>
		{onUbah && (
			<button
				type="button"
				onClick={onUbah}
				title="Ubah data"
				aria-label={`Ubah data ${person.nama_lengkap}`}
				className="mr-1.5 shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
			>
				<Pencil className="h-4 w-4" />
			</button>
		)}
	</div>
);

const KartuDesa = ({ desa, jenis, terbuka, onToggle, onBuka, onTambah, onUbah }) => {
	const kosong = desa.aparatur.length === 0;
	const pimpinan = pimpinanDesa(desa, jenis);
	const belumVerifikasi = desa.aparatur.length - desa.aparatur.filter((orang) => orang.status_verifikasi === 'terverifikasi').length;
	const labelPimpinan = jenis === 'bpd' ? 'Ketua BPD' : 'Kepala Desa';

	return (
		<div className={`overflow-hidden rounded-xl border bg-white ${kosong ? 'border-amber-200' : 'border-slate-200'}`}>
			<div className="flex items-center gap-2 px-3 py-2.5">
				<button
					type="button"
					onClick={kosong ? undefined : onToggle}
					disabled={kosong}
					className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
				>
					<ChevronDown
						className={`h-3.5 w-3.5 shrink-0 transition-transform ${kosong ? 'text-slate-200' : 'text-slate-400'} ${
							terbuka ? '' : '-rotate-90'
						}`}
					/>
					<span className="min-w-0 flex-1">
						<span className="flex items-baseline gap-2 truncate text-sm font-semibold text-slate-900">{desa.nama}{kodeLokasi(desa.kode) && <span className="font-mono text-[10px] font-medium text-slate-400">{kodeLokasi(desa.kode).desa}</span>}</span>
						{kosong ? (
							<span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-amber-700">
								<AlertTriangle className="h-3.5 w-3.5" />
								Belum ada data {jenis === 'bpd' ? 'BPD' : 'perangkat'}
							</span>
						) : (
							<span className="mt-0.5 block truncate text-xs text-slate-500">
								{labelPimpinan}:{' '}
								{pimpinan ? (
									<span className="font-medium text-slate-700">{pimpinan.nama_lengkap}</span>
								) : (
									<span className="font-medium text-rose-600">belum tercatat</span>
								)}
							</span>
						)}
					</span>
					{!kosong && (
						<span className="hidden shrink-0 text-right sm:block">
							<span className="block text-sm font-semibold tabular-nums text-slate-900">
								{fmt(desa.aktif)}
								<span className="font-normal text-slate-400">/{fmt(desa.total)}</span>
							</span>
							<span className="block text-[11px] text-slate-500">aktif</span>
						</span>
					)}
					{!kosong && (
						<span
							className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium md:inline-flex ${
								belumVerifikasi === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
							}`}
						>
							{belumVerifikasi === 0 ? 'Semua terverifikasi' : `${fmt(belumVerifikasi)} belum diverifikasi`}
						</span>
					)}
				</button>

				{onTambah && (
					<button
						type="button"
						onClick={onTambah}
						title={`Tambah aparatur Desa ${desa.nama}`}
						className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
							kosong
								? 'bg-slate-900 text-white hover:bg-slate-800'
								: 'border border-slate-200 text-slate-600 hover:bg-slate-50'
						}`}
					>
						<Plus className="h-3.5 w-3.5" />
						{kosong ? 'Isi sekarang' : <span className="hidden sm:inline">Tambah</span>}
					</button>
				)}
			</div>

			{terbuka && !kosong && (
				<div className="space-y-0.5 border-t border-slate-100 bg-slate-50/70 p-1.5">
					{desa.aparatur.map((person, index) => (
						<BarisAparatur
							key={person.id}
							person={person}
							nomor={index + 1}
							onBuka={() => onBuka(person.id)}
							onUbah={onUbah ? () => onUbah(person.id) : undefined}
						/>
					))}
				</div>
			)}
		</div>
	);
};

const WilayahTab = ({ refreshKey = 0, jenis, detailBasePath, onLoadingChange, onUpdated, onTambah, onUbah }) => {
	const navigate = useNavigate();
	const bukaDetail = (idAparatur) => navigate(`${detailBasePath}/${idAparatur}`);
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState([]);
	const [cari, setCari] = useState('');
	const [saringan, setSaringan] = useState('semua');
	const [kecamatanTerbuka, setKecamatanTerbuka] = useState(() => new Set());
	const [desaTerbuka, setDesaTerbuka] = useState(() => new Set());

	useEffect(() => {
		let batal = false;
		setLoading(true);
		onLoadingChange?.(true);
		api.get(`/pemdes/aparatur-desa/grouped${jenis ? `?jenis=${jenis}` : ''}`)
			.then((response) => {
				if (batal) return;
				setData(response.data?.data || []);
				onUpdated?.(new Date());
			})
			.catch((error) => {
				console.error('Failed to fetch aparatur per wilayah:', error);
				if (!batal) toast.error('Gagal memuat data per wilayah');
			})
			.finally(() => {
				if (batal) return;
				setLoading(false);
				onLoadingChange?.(false);
			});
		return () => { batal = true; };
	}, [jenis, refreshKey, onLoadingChange, onUpdated]);

	// Angka kabupaten dihitung dari data mentah — tidak ikut berubah oleh saringan.
	const ringkasan = useMemo(() => {
		const semuaDesa = data.flatMap((kecamatan) => kecamatan.desa);
		const orang = semuaDesa.reduce((total, desa) => total + desa.total, 0);
		const terverifikasi = semuaDesa.reduce((total, desa) => total + (desa.terverifikasi || 0), 0);
		const terisi = semuaDesa.filter((desa) => desa.total > 0).length;
		const tanpaPimpinan = semuaDesa.filter((desa) => desa.total > 0 && !pimpinanDesa(desa, jenis)).length;
		return { desa: semuaDesa.length, terisi, kosong: semuaDesa.length - terisi, orang, terverifikasi, tanpaPimpinan };
	}, [data, jenis]);

	// Penyaringan di sisi klien: seluruh pohon sudah ada di memori, jadi tidak
	// ada gunanya bolak-balik ke server untuk mengetik kata kunci.
	const kata = cari.trim().toLowerCase();
	const hasil = useMemo(() => {
		const cocok = (teks) => String(teks || '').toLowerCase().includes(kata);
		const lolosSaringan = (desa) => {
			if (saringan === 'kosong') return desa.aparatur.length === 0;
			if (saringan === 'belum-verifikasi') return desa.aparatur.some((orang) => orang.status_verifikasi !== 'terverifikasi');
			return true;
		};
		return data
			.map((kecamatan) => {
				const kecamatanCocok = !kata || cocok(kecamatan.nama);
				const desa = kecamatan.desa
					.filter(lolosSaringan)
					.map((item) => {
						if (kecamatanCocok || cocok(item.nama)) return item;
						const aparatur = item.aparatur.filter((a) => cocok(a.nama_lengkap) || cocok(a.jabatan));
						return aparatur.length ? { ...item, aparatur } : null;
					})
					.filter(Boolean);
				return desa.length ? { ...kecamatan, desa } : null;
			})
			.filter(Boolean);
	}, [data, kata, saringan]);

	// Sedang mencari = semua yang lolos saring dibuka; kalau tidak, hasilnya
	// cuma tumpukan baris tertutup yang harus diklik satu per satu.
	const sedangMencari = kata.length > 0;

	const toggle = (setter) => (id) =>
		setter((sebelumnya) => {
			const berikutnya = new Set(sebelumnya);
			if (berikutnya.has(id)) berikutnya.delete(id);
			else berikutnya.add(id);
			return berikutnya;
		});
	const toggleKecamatan = toggle(setKecamatanTerbuka);
	const toggleDesa = toggle(setDesaTerbuka);

	const angkaRingkas = [
		{ label: 'Desa terisi', nilai: `${fmt(ringkasan.terisi)}/${fmt(ringkasan.desa)}`, hint: `${pct(ringkasan.terisi, ringkasan.desa)}% desa` },
		{ label: 'Belum ada data', nilai: fmt(ringkasan.kosong), hint: 'desa perlu diisi', nada: ringkasan.kosong ? 'text-amber-600' : 'text-slate-900' },
		{
			label: jenis === 'bpd' ? 'Tanpa ketua BPD' : 'Tanpa kepala desa',
			nilai: fmt(ringkasan.tanpaPimpinan),
			hint: 'dari desa yang terisi',
			nada: ringkasan.tanpaPimpinan ? 'text-rose-600' : 'text-slate-900',
		},
		{ label: 'Terverifikasi', nilai: fmt(ringkasan.terverifikasi), hint: `dari ${fmt(ringkasan.orang)} orang` },
	];

	return (
		<div className="space-y-3">
			<section className="rounded-2xl border border-slate-200 bg-white p-4">
				<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
					{angkaRingkas.map((item) => (
						<div key={item.label} className="rounded-xl bg-slate-50 px-3.5 py-3">
							<p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{item.label}</p>
							<p className={`mt-1 text-xl font-bold tabular-nums ${item.nada || 'text-slate-900'}`}>
								{loading ? '…' : item.nilai}
							</p>
							<p className="text-[11px] text-slate-500">{item.hint}</p>
						</div>
					))}
				</div>

				<div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 lg:flex-row lg:items-center lg:justify-between">
					<div className="relative w-full lg:max-w-sm">
						<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
						<input
							value={cari}
							onChange={(event) => setCari(event.target.value)}
							placeholder="Cari nama, jabatan, desa, atau kecamatan…"
							className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
						/>
					</div>
					<div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
						{SARINGAN_WILAYAH.map((item) => (
							<button
								key={item.id}
								type="button"
								onClick={() => setSaringan(item.id)}
								className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
									saringan === item.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
								}`}
							>
								{item.label}
							</button>
						))}
					</div>
				</div>
			</section>

			{loading ? (
				<TableSkeleton rows={8} />
			) : hasil.length === 0 ? (
				<div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
					<UserCircle className="mx-auto h-10 w-10 text-slate-300" />
					<p className="mt-3 text-sm font-medium text-slate-900">Tidak ada desa yang cocok</p>
					<p className="mt-1 text-sm text-slate-500">Coba ubah kata kunci atau saringan.</p>
				</div>
			) : (
				<div className="space-y-2">
					{hasil.map((kecamatan) => {
						const bukaKecamatan = sedangMencari || saringan !== 'semua' || kecamatanTerbuka.has(kecamatan.id);
						const jumlahDesa = kecamatan.desa.length;
						const terisi = kecamatan.desa.filter((desa) => desa.aparatur.length > 0).length;
						const orang = kecamatan.desa.reduce((total, desa) => total + desa.aparatur.length, 0);
						// Progres = orang terverifikasi, bukan desa terisi: "terisi"
						// cuma berarti ada datanya, belum tentu benar.
						const terverifikasi = kecamatan.desa.reduce(
							(total, desa) => total + desa.aparatur.filter((a) => a.status_verifikasi === 'terverifikasi').length,
							0
						);
						const semuaValid = orang > 0 && terverifikasi === orang && terisi === jumlahDesa;
						return (
							<div key={kecamatan.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
								<button
									type="button"
									onClick={() => toggleKecamatan(kecamatan.id)}
									className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 sm:grid-cols-[auto_minmax(0,1fr)_12rem_auto]"
								>
									<ChevronDown
										className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${bukaKecamatan ? '' : '-rotate-90'}`}
									/>
									<span className="min-w-0">
										<span className="block truncate text-sm font-semibold text-slate-900">Kecamatan {kecamatan.nama}{kecamatan.kode && <span className="ml-2 font-mono text-[11px] font-medium text-slate-400">{String(kecamatan.kode).split(".")[2]}</span>}</span>
										<span className="block text-xs text-slate-500">
											{fmt(terisi)}/{fmt(jumlahDesa)} desa terisi · {fmt(terverifikasi)}/{fmt(orang)} orang terverifikasi
										</span>
									</span>
									<span className="col-span-2 sm:col-span-1">
										<BatangTerisi terisi={terverifikasi} total={orang} />
									</span>
									{semuaValid ? (
										<span className="hidden shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 sm:inline-flex">
											Semua terverifikasi
										</span>
									) : jumlahDesa - terisi > 0 ? (
										<span className="hidden shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 sm:inline-flex">
											{fmt(jumlahDesa - terisi)} desa kosong
										</span>
									) : (
										<span className="hidden shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 sm:inline-flex">
											{fmt(orang - terverifikasi)} belum diverifikasi
										</span>
									)}
								</button>

								{bukaKecamatan && (
									<div className="grid gap-1.5 border-t border-slate-100 bg-slate-50/70 p-2.5 xl:grid-cols-2 xl:items-start">
										{kecamatan.desa.map((desa) => (
											<KartuDesa
												key={desa.id}
												desa={desa}
												jenis={jenis}
												terbuka={sedangMencari || desaTerbuka.has(desa.id)}
												onToggle={() => toggleDesa(desa.id)}
												onBuka={bukaDetail}
												onTambah={
													onTambah
														? () => onTambah({ id: desa.id, nama: desa.nama, kode: desa.kode, kecamatan_id: kecamatan.id, kecamatan: kecamatan.nama })
														: undefined
												}
												onUbah={onUbah}
											/>
										))}
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};

// ============================================================
// Notifikasi & aktivitas (kolom kanan halaman daftar)
// ============================================================
/** Satu butir notifikasi: angka, lalu beberapa contoh nama yang bisa dibuka. */
const ButirNotifikasi = ({ icon: Icon, nada, judul, total, contoh, onBuka, keterangan }) => (
	<div className="rounded-xl border border-slate-200 p-3">
		<div className="flex items-start gap-2.5">
			<span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${nada}`}>
				<Icon className="h-4 w-4" />
			</span>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-semibold text-slate-900">{judul}</p>
				<p className="text-xs text-slate-500">{keterangan}</p>
			</div>
			<span className="shrink-0 text-lg font-bold tabular-nums text-slate-900">{fmt(total)}</span>
		</div>

		{contoh.length > 0 && (
			<ul className="mt-2 space-y-1 border-t border-slate-100 pt-2">
				{contoh.map((orang) => (
					<li key={orang.id}>
						<button
							type="button"
							onClick={() => onBuka(orang.id)}
							className="block w-full truncate text-left text-xs text-slate-600 hover:text-slate-900 hover:underline"
						>
							{orang.nama_lengkap}
							<span className="text-slate-400">
								{' · '}
								{[orang.jabatan, orang.desa && `Ds. ${orang.desa}`].filter(Boolean).join(' · ')}
							</span>
						</button>
					</li>
				))}
				{total > contoh.length && (
					<li className="text-xs text-slate-400">+{fmt(total - contoh.length)} lainnya</li>
				)}
			</ul>
		)}
	</div>
);

const PanelNotifikasi = ({ jenis, detailBasePath }) => {
	const navigate = useNavigate();
	const [data, setData] = useState(null);

	useEffect(() => {
		let batal = false;
		api.get(`/pemdes/aparatur-desa/notifikasi${jenis ? `?jenis=${jenis}` : ''}`)
			.then((response) => { if (!batal) setData(response.data?.data || null); })
			.catch((error) => console.error('Failed to fetch notifikasi aparatur:', error));
		return () => { batal = true; };
	}, [jenis]);

	if (!data) return null;

	const buka = (id) => navigate(`${detailBasePath}/${id}`);
	const kosong = data.usia_lanjut.total === 0 && data.menunggu_verifikasi.total === 0;

	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-4">
			<div className="flex items-center gap-2">
				<Info className="h-4 w-4 text-slate-400" />
				<h3 className="text-sm font-bold text-slate-900">Perlu Perhatian</h3>
			</div>
			<p className="mt-0.5 text-xs text-slate-500">Hanya menghitung yang berstatus aktif.</p>

			{kosong ? (
				<p className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
					<CheckCircle2 className="h-4 w-4" />
					Tidak ada yang perlu ditindaklanjuti
				</p>
			) : (
				<div className="mt-3 space-y-2.5">
					<ButirNotifikasi
						icon={CalendarDays}
						nada="bg-amber-50 text-amber-600"
						judul={`Usia di atas ${data.batas_usia} tahun`}
						keterangan="Diurutkan dari yang tertua"
						total={data.usia_lanjut.total}
						contoh={data.usia_lanjut.contoh}
						onBuka={buka}
					/>
					<ButirNotifikasi
						icon={Clock}
						nada="bg-slate-100 text-slate-600"
						judul="Menunggu verifikasi"
						keterangan="Belum diputus setujui atau tolak"
						total={data.menunggu_verifikasi.total}
						contoh={data.menunggu_verifikasi.contoh}
						onBuka={buka}
					/>
				</div>
			)}
		</div>
	);
};

// ============================================================
// Aktivitas (kolom kanan halaman daftar)
// ============================================================
// Riwayat aparatur disimpan di tabelnya sendiri, bukan `activity_logs`, jadi
// panel ini tidak bisa digantikan TimelineAktivitas milik halaman bidang.
const AktivitasAparatur = ({ jenis, detailBasePath }) => {
	const navigate = useNavigate();
	const [riwayat, setRiwayat] = useState([]);
	const [memuat, setMemuat] = useState(true);
	const [cursor, setCursor] = useState(null);
	const [adaLagi, setAdaLagi] = useState(false);

	// Halaman berikutnya diminta lewat penunjuk baris terakhir, jadi server
	// tidak pernah menelusuri ulang catatan yang sudah dikirim.
	const muat = useCallback(
		async (penunjuk = null) => {
			setMemuat(true);
			try {
				const parameter = new URLSearchParams({ limit: '20' });
				if (jenis) parameter.append('jenis', jenis);
				if (penunjuk) parameter.append('cursor', penunjuk);

				const response = await api.get(`/pemdes/aparatur-desa/riwayat-terbaru?${parameter.toString()}`);
				const baru = response.data?.data || [];
				setRiwayat((sebelumnya) => (penunjuk ? [...sebelumnya, ...baru] : baru));
				setCursor(response.data?.meta?.nextCursor || null);
				setAdaLagi(Boolean(response.data?.meta?.hasMore));
			} catch (error) {
				console.error('Failed to fetch riwayat aparatur:', error);
			} finally {
				setMemuat(false);
			}
		},
		[jenis]
	);

	useEffect(() => {
		muat();
	}, [muat]);

	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-4">
			<div className="flex items-center gap-2">
				<Clock className="h-4 w-4 text-slate-400" />
				<h3 className="text-sm font-bold text-slate-900">Aktivitas Terbaru</h3>
			</div>
			<p className="mt-0.5 text-xs text-slate-500">Perubahan data dan keputusan verifikasi.</p>

			{memuat && riwayat.length === 0 ? (
				<div className="mt-3 space-y-2">
					{Array.from({ length: 4 }).map((_, index) => (
						<div key={index} className="h-14 animate-pulse rounded-xl bg-slate-100" />
					))}
				</div>
			) : riwayat.length === 0 ? (
				<p className="mt-4 text-sm text-slate-400">Belum ada aktivitas tercatat.</p>
			) : (
				<ol className="mt-3 space-y-3">
					{riwayat.map((item) => {
						const rupa = RUPA_AKSI[item.aksi] || { label: item.aksi, titik: 'bg-slate-400' };
						return (
							<li key={item.id} className="relative pl-5">
								<span className={`absolute left-0 top-1.5 h-2 w-2 rounded-full ${rupa.titik}`} />
								<button
									type="button"
									onClick={() => navigate(`${detailBasePath}/${item.aparatur_id}`)}
									className="block w-full text-left"
								>
									<p className="truncate text-sm font-semibold text-slate-900 hover:underline">
										{item.nama_lengkap || 'Data sudah dihapus'}
									</p>
									<p className="truncate text-xs text-slate-500">
										{[item.jabatan, item.desa && `Ds. ${item.desa}`].filter(Boolean).join(' · ') || '—'}
									</p>
									<p className="mt-0.5 text-xs text-slate-500">
										{rupa.label} · {formatWaktu(item.created_at)}
										{item.oleh_nama ? ` · ${item.oleh_nama}` : ''}
									</p>
									{item.keterangan && (
										<p className="mt-1 truncate rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-600">
											{item.keterangan}
										</p>
									)}
								</button>
							</li>
						);
					})}
				</ol>
			)}

			{adaLagi && (
				<button
					type="button"
					onClick={() => muat(cursor)}
					disabled={memuat}
					className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
				>
					{memuat ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
					{memuat ? 'Memuat…' : 'Muat lebih banyak'}
				</button>
			)}
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
		accent: 'bg-slate-900',
	},
	'core-dashboard': {
		eyebrow: 'Core Dashboard DPMD',
		title: 'Aparatur Desa',
		description: 'Sebaran dan komposisi aparatur desa dari database aplikasi untuk monitoring wilayah.',
		badge: 'Database Aplikasi',
		accent: 'bg-slate-800',
	},
};

// Perangkat desa dan BPD dipisah jadi dua menu sendiri. Halamannya tetap satu
// komponen — bedanya cuma judul dan penyaringan yang dikirim ke API.
const JENIS_VARIANTS = {
	perangkat: {
		title: 'Perangkat Desa',
		description: 'Monitoring dan audit data perangkat desa se-Kabupaten Bogor, di luar BPD.',
	},
	bpd: {
		title: 'BPD',
		description: 'Monitoring dan audit data Badan Permusyawaratan Desa se-Kabupaten Bogor.',
	},
};

const TAB_DEFINITIONS = [
	{
		id: 'wilayah',
		label: 'Per Wilayah',
		icon: MapPin,
		desc: 'Kelengkapan isian tiap kecamatan dan desa, termasuk desa yang belum terisi.',
	},
	{
		id: 'database',
		label: 'Tabel & Statistik',
		icon: Database,
		desc: 'Statistik kabupaten dan tabel seluruh aparatur dengan penyaring.',
	},
	{
		id: 'akun',
		label: 'Akun Operator',
		icon: UserCog,
		desc: 'Akun petugas desa yang ditugaskan untuk fitur Aparatur Desa.',
		// Hanya staf yang berwenang mengelola; pengunjung Core Dashboard tidak.
		khususPengelola: true,
	},
];

const AparaturDesaPage = ({
	mode = 'pemdes',
	jenis,
	// Halaman ini dipasang di beberapa layout dengan awalan URL berbeda, jadi
	// alamat halaman detailnya ikut diantar dari rute — bukan ditebak di sini.
	detailBasePath = '/bidang/pemdes/aparatur',
	allowedTabs = ['wilayah', 'database', 'akun'],
	initialTab,
}) => {
	const { user } = useAuth();
	// Menambah, mengubah, dan mengurus akun operator hanya untuk halaman bidang
	// Pemdes. Core Dashboard memakai komponen yang sama untuk membaca saja.
	const bolehKelola = mode === 'pemdes' && bolehKelolaAparatur(user);
	const variant = { ...(PAGE_VARIANTS[mode] || PAGE_VARIANTS.pemdes), ...(JENIS_VARIANTS[jenis] || {}) };
	const filteredTabs = TAB_DEFINITIONS.filter(
		(tab) => allowedTabs.includes(tab.id) && (!tab.khususPengelola || bolehKelola)
	);
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

	// Statistik diambil di sini, bukan di dalam tab: ringkasannya berdiri di
	// luar tab, sementara pilihan filter pendidikan di mode tabel memakai
	// daftar yang sama. Satu panggilan untuk dua pemakai.
	const [stats, setStats] = useState(null);
	const [statsLoading, setStatsLoading] = useState(true);

	useEffect(() => {
		let batal = false;
		setStatsLoading(true);
		api.get(`/pemdes/aparatur-desa/stats${jenis ? `?jenis=${jenis}` : ''}`)
			.then((response) => { if (!batal && response.data.success) setStats(response.data.data); })
			.catch((error) => console.error('Failed to fetch stats:', error))
			.finally(() => { if (!batal) setStatsLoading(false); });
		return () => { batal = true; };
	}, [jenis, refreshKey]);

	const handleUpdated = useCallback((date) => setLastUpdated(date), []);
	const handleLoading = useCallback((value) => setBusy(value), []);

	// Panel isian: { desa } untuk tambah, { aparatur } untuk ubah, {} untuk
	// tambah dengan memilih desa dulu.
	const [panel, setPanel] = useState(null);
	const [memuatUbah, setMemuatUbah] = useState(false);

	// Pop-up data di balik grafik: { filter, judul }.
	const [popup, setPopup] = useState(null);
	const bukaPopup = useCallback((filter, judul) => setPopup({ filter, judul }), []);
	const tutupPopup = useCallback(() => setPopup(null), []);
	const bukaTambah = useCallback((desa) => setPanel({ desa: desa || null }), []);
	// Baris per wilayah hanya membawa kolom ringkas; formulir butuh baris utuh
	// (berkas, BPJS, produk hukum), jadi diambil ulang dulu.
	const bukaUbah = useCallback(async (idAparatur) => {
		setMemuatUbah(true);
		try {
			const response = await api.get(`/pemdes/aparatur-desa/${idAparatur}`);
			setPanel({ aparatur: response.data?.data });
		} catch (error) {
			toast.error(error.response?.data?.message || 'Gagal memuat data untuk diubah');
		} finally {
			setMemuatUbah(false);
		}
	}, []);
	const tutupPanel = useCallback(() => setPanel(null), []);
	const selesaiSimpan = useCallback(() => {
		setPanel(null);
		setRefreshKey((key) => key + 1);
	}, []);

	return (
		<div className="min-h-screen bg-slate-50 p-4 pt-20 sm:p-6 lg:pt-6">
			{/* Header */}
			<header className="relative mb-5 overflow-hidden rounded-2xl bg-slate-950 p-5 sm:p-6">
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_120%_at_92%_0%,_rgba(185,28,28,0.22)_0%,_transparent_62%)]" />
				<div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-start gap-4">
						<div
							className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15"
						>
							<Users className="h-6 w-6" />
						</div>
						<div className="min-w-0">
							<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-400">{variant.eyebrow}</p>
							<h1 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">{variant.title}</h1>
							<p className="mt-1.5 text-sm leading-relaxed text-slate-400">{variant.description}</p>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
						<span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-300 ring-1 ring-white/15">
							<Shield className="h-3.5 w-3.5" />
							{variant.badge}
						</span>
						<div className="flex flex-wrap items-center justify-end gap-2">
							{lastUpdated && (
								<span className="hidden items-center gap-1 text-xs text-slate-500 sm:inline-flex">
									<CalendarDays className="h-3.5 w-3.5" />
									{lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
								</span>
							)}
							<button
								type="button"
								onClick={() => setRefreshKey((key) => key + 1)}
								disabled={busy}
								className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-sm font-medium text-white ring-1 ring-white/15 transition-colors hover:bg-white/20 disabled:opacity-60"
							>
								<RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
								Refresh
							</button>
							{/* Pintu tambah utama — terlihat di tab mana pun, supaya bidang
							    tidak perlu mencari tombolnya di dalam tabel atau kecamatan. */}
							{bolehKelola && (
								<button
									type="button"
									onClick={() => bukaTambah(null)}
									className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
								>
									<Plus className="h-4 w-4" />
									{jenis === 'bpd' ? 'Tambah Anggota BPD' : jenis === 'perangkat' ? 'Tambah Perangkat Desa' : 'Tambah Aparatur'}
								</button>
							)}
						</div>
					</div>
				</div>

				{tabs.length > 1 && (
					<div className="relative mt-5 flex gap-1 rounded-xl bg-white/10 p-1 ring-1 ring-white/10">
						{tabs.map((tab) => {
							const TabIcon = tab.icon || GraduationCap;
							const isActive = activeTab === tab.id;
							return (
								<button
									key={tab.id}
									type="button"
									onClick={() => setActiveTab(tab.id)}
									className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
										isActive ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'
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

			{/* Capaian verifikasi berlaku untuk kedua mode baca, jadi berdiri di
			    luar tab — tapi tidak di tab akun, yang urusannya lain. */}
			{activeTab !== 'akun' && (
				<div className="mb-4">
					<CapaianVerifikasiAparatur stats={stats} loading={statsLoading} onBuka={bukaPopup} />
				</div>
			)}

			{activeTab === 'akun' ? (
				// Akun operator memakai halaman akun desa bersama, dikunci ke modul
				// "aparatur-desa": hanya hak akses Aparatur Desa yang diberikan, dan
				// "desa ini sudah punya operator?" dihitung untuk fitur ini saja.
				<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
					<Suspense
						fallback={
							<div className="flex items-center justify-center gap-3 py-24 text-sm text-slate-500">
								<Loader2 className="h-4 w-4 animate-spin" />
								Memuat akun operator…
							</div>
						}
					>
						<ManajemenAkunDesaPage tersemat modul="aparatur-desa" />
					</Suspense>
				</section>
			) : (
				<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
					<div className="min-w-0">
						{activeTab === 'wilayah' && (
							<WilayahTab
								refreshKey={refreshKey}
								jenis={jenis}
								detailBasePath={detailBasePath}
								onLoadingChange={handleLoading}
								onUpdated={handleUpdated}
								onTambah={bolehKelola ? bukaTambah : undefined}
								onUbah={bolehKelola ? bukaUbah : undefined}
							/>
						)}

						{activeTab === 'database' && (
							<DatabaseTab
								refreshKey={refreshKey}
								jenis={jenis}
								stats={stats}
								statsLoading={statsLoading}
								detailBasePath={detailBasePath}
								onLoadingChange={handleLoading}
								onUpdated={handleUpdated}
								onTambah={bolehKelola ? bukaTambah : undefined}
								onBuka={bukaPopup}
							/>
						)}
					</div>

					<aside className="space-y-4 lg:sticky lg:top-6">
						<PanelNotifikasi jenis={jenis} detailBasePath={detailBasePath} />
						<AktivitasAparatur jenis={jenis} detailBasePath={detailBasePath} />
					</aside>
				</div>
			)}

			{memuatUbah && (
				<div className="fixed bottom-6 left-1/2 z-[80] inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
					<Loader2 className="h-4 w-4 animate-spin" />
					Memuat data untuk diubah…
				</div>
			)}

			{popup && (
				<PopupDataAparatur
					judul={popup.judul}
					filter={popup.filter}
					jenis={jenis}
					detailBasePath={detailBasePath}
					onTutup={tutupPopup}
				/>
			)}

			{panel && (
				<PanelIsianAparatur
					desa={panel.desa}
					aparatur={panel.aparatur}
					onTutup={tutupPanel}
					onTersimpan={selesaiSimpan}
				/>
			)}
		</div>
	);
};

export default AparaturDesaPage;
