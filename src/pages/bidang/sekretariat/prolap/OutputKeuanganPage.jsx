// src/pages/bidang/sekretariat/prolap/OutputKeuanganPage.jsx
// Prolap — rekap OUTPUT penyaluran keuangan desa, diolah dari SIPANDA.
// Tiap sumber dana (ADD, DD, BHPRD, Bankeu, BP) dibaca sebagai satu output
// tersendiri: berapa cair, di desa mana, sampai tahap berapa, secepat apa.
//
// Tiga batasan sumber data ditampilkan terang-terangan di halaman, bukan
// disembunyikan: sumbu waktu memakai tanggal SP2D karena tanggal pencairan
// kosong pada sebagian baris, lama proses hanya terhitung untuk baris yang
// punya tanggal persetujuan, dan SIPANDA adalah sistem pihak lain sehingga
// waktu pengambilan data selalu disebut.
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	ArrowLeft,
	RefreshCw,
	Wallet,
	Banknote,
	Building2,
	Search,
	Download,
	AlertTriangle,
	Info,
	CheckCircle2,
	CircleDashed,
	Clock,
	ChevronDown,
	TrendingUp,
	Landmark,
} from 'lucide-react';
import api from '../../../../api';

// ============================================================
// Konstanta
// ============================================================
// Palet kategorikal tervalidasi (sama dengan Output Infrastruktur). Nomor slot
// dikirim backend supaya warna menempel ke sumber dananya, bukan ke urutan
// tampil — menyaring satu sumber tidak mengecat ulang sisanya.
const SLOT_COLOR = {
	1: '#2a78d6',
	2: '#eb6834',
	3: '#1baf7a',
	4: '#eda100',
	5: '#e87ba4',
	6: '#008300',
	7: '#4a3aa7',
	8: '#e34948',
};
const PRIMARY = '#2a78d6';

// Warna status dipisah dari palet seri, dan selalu dipasangkan ikon + label —
// tidak pernah warna saja.
const STATUS_TAHAP = {
	tuntas: { warna: '#0ca30c', label: 'Tuntas', Icon: CheckCircle2 },
	berjalan: { warna: '#fab219', label: 'Berjalan', Icon: Clock },
	belum: { warna: '#c9c7c0', label: 'Belum mulai', Icon: CircleDashed },
};

const BULAN_SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// Geometri grafik tren — di luar komponen supaya acuannya tetap antar render.
const TREN = { W: 720, H: 220, atas: 16, kanan: 16, bawah: 28, kiri: 56 };

// ============================================================
// Format
// ============================================================
const fmt = (n) => Number(n ?? 0).toLocaleString('id-ID');

const rupiahRingkas = (n) => {
	const value = Number(n ?? 0);
	const abs = Math.abs(value);
	const cut = (d, s) => `Rp ${(value / d).toFixed(1).replace('.', ',')} ${s}`;
	if (abs >= 1e12) return cut(1e12, 'T');
	if (abs >= 1e9) return cut(1e9, 'M');
	if (abs >= 1e6) return cut(1e6, 'Jt');
	if (abs >= 1e3) return `Rp ${Math.round(value / 1e3)} Rb`;
	return `Rp ${fmt(value)}`;
};

const rupiahPenuh = (n) => `Rp ${fmt(Math.round(Number(n ?? 0)))}`;

const persenTeks = (n) => `${String(Number(n ?? 0)).replace('.', ',')}%`;

/** "2026-02" -> "Feb 2026" */
const labelBulan = (kode) => {
	if (!kode) return '-';
	const [tahun, bulan] = kode.split('-');
	return `${BULAN_SINGKAT[Number(bulan) - 1] || bulan} ${tahun}`;
};

const waktuAmbil = (iso) => {
	if (!iso) return '-';
	const tanggal = new Date(iso);
	if (Number.isNaN(tanggal.getTime())) return '-';
	return tanggal.toLocaleString('id-ID', {
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
	});
};

// ============================================================
// Komponen kecil
// ============================================================
const StatTile = ({ icon: Icon, label, value, caption, tone = PRIMARY }) => (
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

const Select = ({ label, value, onChange, options }) => (
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

const BarList = ({ rows, valueFormatter, captionFor, warna = PRIMARY }) => {
	const max = Math.max(...rows.map((row) => row.value), 1);
	return (
		<div className="space-y-2.5">
			{rows.map((row) => (
				<div key={row.key} title={captionFor ? captionFor(row) : undefined}>
					<div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
						<span className="truncate font-medium text-slate-700">{row.label}</span>
						<span className="shrink-0 font-semibold tabular-nums text-slate-900">{valueFormatter(row.value)}</span>
					</div>
					<div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
						<div
							className="h-full rounded-full transition-[width] duration-700"
							style={{
								width: `${Math.max((row.value / max) * 100, row.value > 0 ? 2 : 0)}%`,
								backgroundColor: warna,
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
 * Kartu satu sumber dana — inilah "output" per item. Bisa dipilih untuk
 * membuka rinciannya di bawah.
 */
const KartuSumber = ({ item, aktif, onPilih }) => {
	const warna = SLOT_COLOR[item.slot] || SLOT_COLOR[8];
	const desaSudah = item.desa.total - item.desa.belum;
	return (
		<button
			type="button"
			onClick={() => onPilih(item.key)}
			aria-pressed={aktif}
			className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
				aktif ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'
			}`}
		>
			<div className="flex items-center gap-2">
				<span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: warna }} />
				<span className="truncate text-sm font-bold text-slate-900">{item.singkat}</span>
				{!item.dikenali && (
					<span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">baru</span>
				)}
			</div>
			<p className="mt-0.5 truncate text-[11px] text-slate-500">{item.label}</p>

			<p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-slate-900">
				{rupiahRingkas(item.realisasi)}
			</p>
			<p className="text-[11px] text-slate-500">cair dari {rupiahRingkas(item.alokasi)}</p>

			<div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
				<div
					className="h-full rounded-full transition-[width] duration-700"
					style={{ width: `${Math.max(item.persen_serapan, item.realisasi > 0 ? 2 : 0)}%`, backgroundColor: warna }}
				/>
			</div>
			<div className="mt-1.5 flex items-baseline justify-between text-[11px]">
				<span className="font-semibold tabular-nums" style={{ color: warna }}>
					{persenTeks(item.persen_serapan)}
				</span>
				<span className="text-slate-400">
					{item.tahap_tuntas}/{item.tahap.length} tahap · {fmt(desaSudah)} desa
				</span>
			</div>
		</button>
	);
};

/**
 * Tren realisasi bulanan. Sumbu waktu memakai tanggal SP2D — lihat catatan
 * keterbatasan data di bawah halaman.
 */
const TrenChart = ({ tren, warna }) => {
	const [aktif, setAktif] = useState(null);

	const { W, H } = TREN;

	const titik = useMemo(() => {
		if (!tren.length) return [];
		const max = Math.max(...tren.map((t) => t.realisasi), 1);
		const lebar = TREN.W - TREN.kiri - TREN.kanan;
		const tinggi = TREN.H - TREN.atas - TREN.bawah;
		return tren.map((t, i) => ({
			...t,
			x: TREN.kiri + (tren.length === 1 ? lebar / 2 : (i / (tren.length - 1)) * lebar),
			y: TREN.atas + tinggi - (t.realisasi / max) * tinggi,
		}));
	}, [tren]);

	if (!tren.length) {
		return (
			<div className="flex h-40 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-400">
				Belum ada pencairan pada tahun ini
			</div>
		);
	}

	const garis = titik.map((t) => `${t.x},${t.y}`).join(' ');
	const area = `${TREN.kiri},${H - TREN.bawah} ${garis} ${titik[titik.length - 1].x},${H - TREN.bawah}`;
	const maxNilai = Math.max(...tren.map((t) => t.realisasi), 1);

	return (
		<div className="relative">
			<svg
				viewBox={`0 0 ${W} ${H}`}
				className="w-full"
				role="img"
				aria-label="Realisasi pencairan per bulan"
				onMouseLeave={() => setAktif(null)}
			>
				{/* Garis bantu — recessive, tidak bersaing dengan data */}
				{[0, 0.5, 1].map((rasio) => {
					const y = TREN.atas + (H - TREN.atas - TREN.bawah) * (1 - rasio);
					return (
						<g key={rasio}>
							<line x1={TREN.kiri} x2={W - TREN.kanan} y1={y} y2={y} stroke="#e1e0d9" strokeWidth="1" />
							<text x={TREN.kiri - 8} y={y + 4} textAnchor="end" className="fill-slate-400 text-[10px]">
								{rupiahRingkas(maxNilai * rasio)}
							</text>
						</g>
					);
				})}

				<polygon points={area} fill={warna} opacity="0.1" />
				<polyline points={garis} fill="none" stroke={warna} strokeWidth="2" strokeLinejoin="round" />

				{titik.map((t) => (
					<g key={t.bulan}>
						<circle cx={t.x} cy={t.y} r="4.5" fill={warna} stroke="#ffffff" strokeWidth="2" />
						<text x={t.x} y={H - TREN.bawah + 16} textAnchor="middle" className="fill-slate-500 text-[10px]">
							{labelBulan(t.bulan).split(' ')[0]}
						</text>
						{/* Sasaran hover lebih besar dari titiknya */}
						<rect
							x={t.x - 18}
							y={TREN.atas}
							width="36"
							height={H - TREN.atas - TREN.bawah}
							fill="transparent"
							onMouseEnter={() => setAktif(t)}
						/>
					</g>
				))}

				{aktif && (
					<line
						x1={aktif.x}
						x2={aktif.x}
						y1={TREN.atas}
						y2={H - TREN.bawah}
						stroke={warna}
						strokeWidth="1"
						strokeDasharray="3 3"
					/>
				)}
			</svg>

			{aktif && (
				<div
					className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
					style={{ left: `${(aktif.x / W) * 100}%`, top: 0 }}
				>
					<p className="font-semibold text-slate-900">{labelBulan(aktif.bulan)}</p>
					<p className="tabular-nums text-slate-600">{rupiahPenuh(aktif.realisasi)}</p>
					<p className="text-slate-400">{fmt(aktif.baris)} pencairan</p>
				</div>
			)}
		</div>
	);
};

// ============================================================
// Halaman
// ============================================================
const OutputKeuanganPage = () => {
	const navigate = useNavigate();
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const tahunIni = new Date().getFullYear();
	const [tahun, setTahun] = useState(String(tahunIni));
	const [sumberAktif, setSumberAktif] = useState(null);
	const [cari, setCari] = useState('');
	const [batasTabel, setBatasTabel] = useState(50);

	const fetchData = useCallback(
		async (force = false) => {
			try {
				setLoading(true);
				const params = new URLSearchParams({ tahun });
				if (force) params.set('force', '1');
				const response = await api.get(`/prolap/output-keuangan?${params}`);
				setData(response.data?.data);
				setError(null);
			} catch (err) {
				console.error('Error fetching output keuangan:', err);
				setError(err.response?.data?.message || 'Gagal memuat rekap output penyaluran');
			} finally {
				setLoading(false);
			}
		},
		[tahun]
	);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	useEffect(() => {
		setBatasTabel(50);
	}, [sumberAktif, cari, tahun]);

	const daftarSumber = useMemo(() => data?.sumber_dana || [], [data]);

	// Pilihan awal: sumber dana dengan realisasi terbesar — yang paling ada
	// isinya untuk dibaca, bukan sekadar yang pertama.
	useEffect(() => {
		if (!daftarSumber.length) return;
		const masihAda = daftarSumber.some((item) => item.key === sumberAktif);
		if (masihAda) return;
		const terbesar = [...daftarSumber].sort((a, b) => b.realisasi - a.realisasi)[0];
		setSumberAktif(terbesar.key);
	}, [daftarSumber, sumberAktif]);

	const item = useMemo(
		() => daftarSumber.find((sumber) => sumber.key === sumberAktif) || null,
		[daftarSumber, sumberAktif]
	);
	const warna = item ? SLOT_COLOR[item.slot] || SLOT_COLOR[8] : PRIMARY;

	const desaTersaring = useMemo(() => {
		if (!item) return [];
		const kata = cari.trim().toLowerCase();
		if (!kata) return item.per_desa;
		return item.per_desa.filter((desa) =>
			[desa.nama_desa, desa.nama_kecamatan].filter(Boolean).some((teks) => String(teks).toLowerCase().includes(kata))
		);
	}, [item, cari]);

	const exportCsv = useCallback(() => {
		if (!item || !desaTersaring.length) return;
		const header = ['Sumber Dana', 'Tahun', 'Kecamatan', 'Desa', 'Alokasi', 'Realisasi', 'Serapan (%)', 'Tahap Cair', 'Tahap Total'];
		const baris = desaTersaring.map((desa) => [
			item.sumber_dana,
			data?.filter?.tahun,
			desa.nama_kecamatan,
			desa.nama_desa,
			Math.round(desa.alokasi),
			Math.round(desa.realisasi),
			desa.persen_serapan,
			desa.baris_cair,
			desa.baris,
		]);
		const csv = [header, ...baris]
			.map((row) => row.map((sel) => `"${String(sel ?? '').replace(/"/g, '""')}"`).join(','))
			.join('\n');
		// BOM di depan supaya Excel membaca UTF-8, bukan ANSI.
		const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
		const tautan = document.createElement('a');
		tautan.href = url;
		tautan.download = `output-penyaluran-${item.key}-${data?.filter?.tahun}.csv`;
		tautan.click();
		URL.revokeObjectURL(url);
	}, [item, desaTersaring, data]);

	const catatan = data?.catatan_data;
	const adaCatatan =
		catatan &&
		(catatan.cair_tanpa_tanggal_pencairan > 0 ||
			catatan.cair_tanpa_approved_at > 0 ||
			catatan.desa_tidak_dikenal.length > 0 ||
			catatan.sumber_belum_dikenali.length > 0);

	const opsiTahun = useMemo(
		() => [0, 1, 2].map((mundur) => ({ value: String(tahunIni - mundur), label: String(tahunIni - mundur) })),
		[tahunIni]
	);

	// ---------- Keadaan awal ----------
	if (loading && !data) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center">
				<div className="flex items-center gap-3 text-slate-500">
					<RefreshCw className="h-5 w-5 animate-spin" />
					<span className="text-sm font-medium">Mengambil data SIPANDA…</span>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-7xl space-y-6">
				{/* ---------- Kepala ---------- */}
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						{/* Kembali ke riwayat, bukan path tetap: halaman ini terdaftar di
						    tiga awalan (/sekretariat, /bidang, /superadmin/bidang). */}
						<button
							onClick={() => navigate(-1)}
							className="mb-2 flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-900"
						>
							<ArrowLeft className="h-4 w-4" />
							Kembali
						</button>
						<h1 className="text-2xl font-bold tracking-tight text-slate-900">Output Penyaluran Keuangan Desa</h1>
						<p className="mt-1 text-sm text-slate-500">
							Diolah dari SIPANDA — tiap sumber dana dibaca sebagai satu output: berapa cair, di desa mana, sampai
							tahap berapa.
						</p>
					</div>
					<div className="flex items-end gap-3">
						<div className="w-32">
							<Select label="Tahun" value={tahun} onChange={setTahun} options={opsiTahun} />
						</div>
						<button
							onClick={() => fetchData(true)}
							disabled={loading}
							className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
						>
							<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
							Perbarui
						</button>
					</div>
				</div>

				{/* ---------- Asal data ---------- */}
				<div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-500">
					<span className="flex items-center gap-1.5 font-medium text-slate-700">
						<Landmark className="h-3.5 w-3.5" />
						Sumber: SIPANDA Kab. Bogor
					</span>
					<span>Tahun {data?.sumber_data?.tahun || tahun}</span>
					<span>Diambil {waktuAmbil(data?.generated_at)}</span>
					<span className="text-slate-400">SIPANDA menyegarkan paling cepat tiap 5 menit</span>
				</div>

				{error && (
					<div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
						<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
						<div className="text-sm">
							<p className="font-semibold text-red-800">{error}</p>
							<p className="mt-0.5 text-red-600">
								SIPANDA adalah sistem di luar DPMD. Angka yang tampil (bila ada) berasal dari pengambilan
								sebelumnya — bukan data terbaru.
							</p>
						</div>
					</div>
				)}

				{data?.kosong && (
					<div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
						<Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
						<p className="text-sm text-amber-800">{data.pesan}</p>
					</div>
				)}

				{/* ---------- Ringkasan seluruh sumber ---------- */}
				{data?.ringkasan && !data?.kosong && (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<StatTile
							icon={Banknote}
							label="Realisasi Cair"
							value={rupiahRingkas(data.ringkasan.realisasi)}
							caption={`${persenTeks(data.ringkasan.persen_serapan)} dari alokasi ${rupiahRingkas(data.ringkasan.alokasi)}`}
							tone={PRIMARY}
						/>
						<StatTile
							icon={Wallet}
							label="Belum Cair"
							value={rupiahRingkas(data.ringkasan.sisa)}
							caption="sisa alokasi tahun berjalan"
							tone={SLOT_COLOR[2]}
						/>
						<StatTile
							icon={Building2}
							label="Desa Terdata"
							value={fmt(data.ringkasan.desa)}
							caption={`dari ${fmt(data.ringkasan.desa_sistem)} desa di sistem DPMD`}
							tone={SLOT_COLOR[3]}
						/>
						<StatTile
							icon={TrendingUp}
							label="Sumber Dana"
							value={fmt(data.ringkasan.sumber_dana)}
							caption="masing-masing dibaca sebagai satu output"
							tone={SLOT_COLOR[4]}
						/>
					</div>
				)}

				{/* ---------- Output per sumber dana ---------- */}
				{daftarSumber.length > 0 && (
					<section className="space-y-3">
						<div className="flex items-baseline justify-between">
							<h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Output per Sumber Dana</h2>
							<span className="text-xs text-slate-400">pilih satu untuk melihat rinciannya</span>
						</div>
						<div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
							{daftarSumber.map((sumber) => (
								<KartuSumber
									key={sumber.key}
									item={sumber}
									aktif={sumber.key === sumberAktif}
									onPilih={setSumberAktif}
								/>
							))}
						</div>
					</section>
				)}

				{/* ---------- Rincian sumber terpilih ---------- */}
				{item && (
					<div className="space-y-6">
						<div className="flex items-center gap-2 border-t border-slate-200 pt-6">
							<span className="h-3 w-3 rounded-full" style={{ backgroundColor: warna }} />
							<h2 className="text-lg font-bold text-slate-900">{item.label}</h2>
							<span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
								{item.sumber_dana}
							</span>
						</div>

						{/* Tahap + lama proses */}
						<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
							<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
								<h3 className="text-sm font-bold text-slate-900">Kemajuan per Tahap</h3>
								<p className="mt-0.5 text-xs text-slate-500">
									Tahap disebut tuntas bila seluruh desa pada tahap itu sudah cair.
								</p>
								<div className="mt-4 space-y-3">
									{item.tahap.map((tahap) => {
										const status = STATUS_TAHAP[tahap.status];
										const StatusIcon = status.Icon;
										return (
											<div key={tahap.nama}>
												<div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs">
													<span className="flex items-center gap-1.5 font-medium text-slate-700">
														<StatusIcon className="h-3.5 w-3.5" style={{ color: status.warna }} />
														{tahap.nama}
														<span className="font-normal text-slate-400">{status.label}</span>
														{tahap.persen_alokasi > 0 && (
															<span className="rounded bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-500">
																{tahap.persen_alokasi}% alokasi
															</span>
														)}
													</span>
													<span className="shrink-0 tabular-nums text-slate-500">
														<span className="font-semibold text-slate-900">{fmt(tahap.desa_cair)}</span>
														/{fmt(tahap.desa_total)} desa · {rupiahRingkas(tahap.realisasi)}
													</span>
												</div>
												<div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
													<div
														className="h-full rounded-full transition-[width] duration-700"
														style={{
															width: `${Math.max(tahap.persen_desa, tahap.desa_cair > 0 ? 2 : 0)}%`,
															backgroundColor: status.warna,
														}}
													/>
												</div>
											</div>
										);
									})}
								</div>
							</div>

							<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
								<h3 className="text-sm font-bold text-slate-900">Lama Proses</h3>
								<p className="mt-0.5 text-xs text-slate-500">Dari disetujui sampai dana cair.</p>
								{item.lama_proses.median_hari === null ? (
									<p className="mt-6 text-sm text-slate-400">Belum ada pencairan yang bisa dihitung.</p>
								) : (
									<>
										<p className="mt-4 text-4xl font-bold tabular-nums tracking-tight text-slate-900">
											{fmt(item.lama_proses.median_hari)}
											<span className="ml-1 text-base font-medium text-slate-400">hari</span>
										</p>
										<p className="text-xs text-slate-500">median</p>
										<dl className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs">
											<div className="flex justify-between">
												<dt className="text-slate-500">Tercepat</dt>
												<dd className="font-semibold tabular-nums text-slate-900">
													{fmt(item.lama_proses.tercepat_hari)} hari
												</dd>
											</div>
											<div className="flex justify-between">
												<dt className="text-slate-500">Terlama</dt>
												<dd className="font-semibold tabular-nums text-slate-900">
													{fmt(item.lama_proses.terlama_hari)} hari
												</dd>
											</div>
											<div className="flex justify-between">
												<dt className="text-slate-500">Terhitung</dt>
												<dd className="font-semibold tabular-nums text-slate-900">
													{fmt(item.lama_proses.terhitung)} dari {fmt(item.baris.cair)}
												</dd>
											</div>
										</dl>
										{item.lama_proses.tidak_terhitung > 0 && (
											<p className="mt-2 text-[11px] leading-relaxed text-amber-600">
												{fmt(item.lama_proses.tidak_terhitung)} pencairan tidak punya tanggal persetujuan di
												SIPANDA, jadi tidak ikut dihitung.
											</p>
										)}
									</>
								)}
							</div>
						</div>

						{/* Tren bulanan */}
						<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
							<div className="flex flex-wrap items-baseline justify-between gap-2">
								<div>
									<h3 className="text-sm font-bold text-slate-900">Realisasi per Bulan</h3>
									<p className="mt-0.5 text-xs text-slate-500">
										Dikelompokkan menurut tanggal SP2D — lihat catatan data di bawah.
									</p>
								</div>
								<span className="text-xs tabular-nums text-slate-400">
									total {rupiahRingkas(item.realisasi)} · {fmt(item.baris.cair)} pencairan
								</span>
							</div>
							<div className="mt-4">
								<TrenChart tren={item.tren} warna={warna} />
							</div>
						</div>

						{/* Kecamatan + status */}
						<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
							<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
								<h3 className="text-sm font-bold text-slate-900">Kecamatan dengan Serapan Terendah</h3>
								<p className="mt-0.5 mb-4 text-xs text-slate-500">
									Yang paling perlu didorong, bukan yang paling bagus.
								</p>
								<BarList
									warna={warna}
									rows={[...item.per_kecamatan]
										.sort((a, b) => a.persen_serapan - b.persen_serapan)
										.slice(0, 10)
										.map((kecamatan) => ({
											key: kecamatan.nama,
											label: kecamatan.nama,
											value: kecamatan.persen_serapan,
											desa: kecamatan.desa_cair,
											desaTotal: kecamatan.desa,
											realisasi: kecamatan.realisasi,
										}))}
									valueFormatter={(nilai) => persenTeks(nilai)}
									captionFor={(row) => `${fmt(row.desa)}/${fmt(row.desaTotal)} desa cair · ${rupiahRingkas(row.realisasi)}`}
								/>
							</div>

							<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
								<h3 className="text-sm font-bold text-slate-900">Yang Belum Cair Ada di Mana</h3>
								<p className="mt-0.5 mb-4 text-xs text-slate-500">
									Posisi {fmt(item.baris.belum)} berkas yang belum cair menurut status SIPANDA.
								</p>
								{item.status_belum_cair.length === 0 ? (
									<p className="text-sm text-slate-400">Seluruh berkas sudah cair.</p>
								) : (
									<BarList
										warna={SLOT_COLOR[2]}
										rows={item.status_belum_cair.map((status) => ({
											key: status.label,
											label: status.label,
											value: status.jumlah,
										}))}
										valueFormatter={(nilai) => `${fmt(nilai)} berkas`}
									/>
								)}
							</div>
						</div>

						{/* Tabel per desa */}
						<div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
							<div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
								<div>
									<h3 className="text-sm font-bold text-slate-900">Rincian per Desa</h3>
									<p className="mt-0.5 text-xs text-slate-500">
										{fmt(desaTersaring.length)} desa ditampilkan
										{cari.trim() ? ` (disaring dari ${fmt(item.per_desa.length)})` : ''}
									</p>
								</div>
								<div className="flex items-center gap-2">
									<div className="relative">
										<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
										<input
											value={cari}
											onChange={(event) => setCari(event.target.value)}
											placeholder="Cari desa / kecamatan…"
											className="w-56 rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-slate-900 focus:outline-none"
										/>
									</div>
									<button
										onClick={exportCsv}
										className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
									>
										<Download className="h-4 w-4" />
										CSV
									</button>
								</div>
							</div>

							<div className="overflow-x-auto">
								<table className="w-full min-w-[720px] text-sm">
									<thead>
										<tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-500">
											<th className="px-5 py-3 font-semibold">Desa</th>
											<th className="px-5 py-3 font-semibold">Kecamatan</th>
											<th className="px-5 py-3 text-right font-semibold">Alokasi</th>
											<th className="px-5 py-3 text-right font-semibold">Realisasi</th>
											<th className="px-5 py-3 text-right font-semibold">Serapan</th>
											<th className="px-5 py-3 text-right font-semibold">Tahap Cair</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-50">
										{desaTersaring.slice(0, batasTabel).map((desa) => (
											<tr key={desa.kode} className="transition-colors hover:bg-slate-50">
												<td className="px-5 py-3 font-medium text-slate-900">
													{desa.nama_desa}
													{!desa.dikenali && (
														<span
															className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
															title="Kode desa dari SIPANDA tidak ditemukan di data DPMD"
														>
															tak dikenal
														</span>
													)}
												</td>
												<td className="px-5 py-3 text-slate-600">{desa.nama_kecamatan}</td>
												<td className="px-5 py-3 text-right tabular-nums text-slate-600">
													{rupiahRingkas(desa.alokasi)}
												</td>
												<td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-900">
													{rupiahRingkas(desa.realisasi)}
												</td>
												<td className="px-5 py-3 text-right tabular-nums" style={{ color: warna }}>
													{persenTeks(desa.persen_serapan)}
												</td>
												<td className="px-5 py-3 text-right tabular-nums text-slate-600">
													{fmt(desa.baris_cair)}/{fmt(desa.baris)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

							{desaTersaring.length > batasTabel && (
								<div className="border-t border-slate-100 p-4 text-center">
									<button
										onClick={() => setBatasTabel((batas) => batas + 100)}
										className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
									>
										Tampilkan {Math.min(100, desaTersaring.length - batasTabel)} desa lagi
									</button>
								</div>
							)}
						</div>
					</div>
				)}

				{/* ---------- Batasan data ---------- */}
				{adaCatatan && (
					<div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
						<div className="flex items-center gap-2">
							<Info className="h-4 w-4 text-amber-600" />
							<h3 className="text-sm font-bold text-amber-900">Yang perlu diketahui tentang data ini</h3>
						</div>
						<ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-amber-800">
							{catatan.cair_tanpa_tanggal_pencairan > 0 && (
								<li>
									<strong>{fmt(catatan.cair_tanpa_tanggal_pencairan)} pencairan</strong> tidak punya tanggal
									pencairan di SIPANDA. Grafik bulanan karena itu memakai <strong>tanggal SP2D</strong>, yang selalu
									terisi — bukan tanggal uang diterima desa.
								</li>
							)}
							{catatan.cair_tanpa_approved_at > 0 && (
								<li>
									<strong>{fmt(catatan.cair_tanpa_approved_at)} pencairan</strong> tidak punya tanggal persetujuan,
									jadi lama proses dihitung dari sebagian data saja.
								</li>
							)}
							{catatan.desa_tidak_dikenal.length > 0 && (
								<li>
									<strong>{fmt(catatan.desa_tidak_dikenal.length)} desa</strong> di SIPANDA tidak cocok dengan data
									desa DPMD dan tetap ditampilkan apa adanya: {catatan.desa_tidak_dikenal.slice(0, 5).join('; ')}
									{catatan.desa_tidak_dikenal.length > 5 ? '; …' : ''}
								</li>
							)}
							{catatan.sumber_belum_dikenali.length > 0 && (
								<li>
									Sumber dana baru yang belum dikenali aplikasi:{' '}
									<strong>{catatan.sumber_belum_dikenali.join(', ')}</strong>. Tetap dihitung, tapi nama panjang dan
									warnanya belum ditetapkan.
								</li>
							)}
							<li className="text-amber-700">
								Angka menyusul SIPANDA. Bila SIPANDA berubah setelah waktu pengambilan di atas, halaman ini belum
								ikut berubah sampai diperbarui.
							</li>
						</ul>
					</div>
				)}
			</div>
		</div>
	);
};

export default OutputKeuanganPage;
