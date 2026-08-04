// src/pages/bidang/sekretariat/prolap/OutputInfrastrukturPage.jsx
// Prolap — rekap OUTPUT pembangunan hasil Bankeu (reguler + perubahan),
// digabung per desa lalu dipetakan.
//
// Dua batasan sumber data ditampilkan terang-terangan di halaman, bukan
// disembunyikan: panjang diurai dari kolom volume yang berupa teks bebas,
// dan titik peta memakai koordinat DESA (kolom `lokasi` tidak menyimpan
// koordinat) sehingga desa yang belum mengisi Profil Desa tidak muncul.
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
	ArrowLeft,
	RefreshCw,
	Route,
	MapPin,
	Landmark,
	Wallet,
	Search,
	Download,
	AlertTriangle,
	Info,
	Layers,
	Building2,
	ChevronDown,
	Trophy,
	Ruler,
} from 'lucide-react';
import api from '../../../../api';

// ============================================================
// Konstanta
// ============================================================
// Palet kategorikal tervalidasi; nomor slot dikirim backend supaya warna
// menempel ke kategorinya, bukan ke urutan tampil.
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
const INK = { grid: '#e1e0d9', muted: '#898781' };

const BOGOR_CENTER = [-6.5971, 106.806];

// ============================================================
// Format
// ============================================================
const fmt = (n) => Number(n ?? 0).toLocaleString('id-ID');

const km = (meter) => {
	const value = Number(meter ?? 0) / 1000;
	if (value >= 100) return `${Math.round(value).toLocaleString('id-ID')} km`;
	return `${value.toFixed(1).replace('.', ',')} km`;
};

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

/** Luas lingkaran sebanding dengan nilainya → jari-jari pakai akar. */
const radiusFor = (meter) => {
	const r = Math.sqrt(Number(meter ?? 0)) * 0.3;
	return Math.max(5, Math.min(26, r));
};

// ============================================================
// Potongan UI
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

const BarList = ({ rows, valueFormatter, captionFor, colorFor }) => {
	const max = Math.max(...rows.map((row) => row.value), 1);
	return (
		<div className="space-y-2.5">
			{rows.map((row) => (
				<div key={row.key}>
					<div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
						<span className="truncate font-medium text-slate-700">{row.label}</span>
						<span className="shrink-0 font-semibold tabular-nums text-slate-900">{valueFormatter(row.value)}</span>
					</div>
					<div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
						<div
							className="h-full rounded-full transition-[width] duration-700"
							style={{
								width: `${Math.max((row.value / max) * 100, row.value > 0 ? 2 : 0)}%`,
								backgroundColor: colorFor ? colorFor(row) : PRIMARY,
							}}
						/>
					</div>
					{captionFor && <p className="mt-1 text-[11px] text-slate-400">{captionFor(row)}</p>}
				</div>
			))}
		</div>
	);
};

/** Sesuaikan tampilan peta setiap kali kumpulan titiknya berubah. */
const FitBounds = ({ points }) => {
	const map = useMap();
	useEffect(() => {
		if (!points.length) return;
		const bounds = points.map((point) => [point.lat, point.lng]);
		map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
	}, [points, map]);
	return null;
};

const MapLegend = () => (
	<div className="absolute bottom-4 left-4 z-[400] rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2.5 shadow-lg backdrop-blur">
		<p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Panjang per desa</p>
		<div className="mt-2 flex items-end gap-3">
			{[500, 2000, 6000].map((meter) => (
				<div key={meter} className="flex flex-col items-center gap-1">
					<svg width={radiusFor(meter) * 2 + 4} height={radiusFor(meter) * 2 + 4}>
						<circle
							cx={radiusFor(meter) + 2}
							cy={radiusFor(meter) + 2}
							r={radiusFor(meter)}
							fill={PRIMARY}
							fillOpacity="0.35"
							stroke={PRIMARY}
							strokeWidth="1.5"
						/>
					</svg>
					<span className="text-[10px] tabular-nums text-slate-500">{km(meter)}</span>
				</div>
			))}
		</div>
	</div>
);

// ============================================================
// Halaman
// ============================================================
const OutputInfrastrukturPage = () => {
	const navigate = useNavigate();
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const [status, setStatus] = useState('disetujui');
	const [tahun, setTahun] = useState('semua');
	const [kategori, setKategori] = useState('jalan');
	const [sumber, setSumber] = useState('semua');
	const [cari, setCari] = useState('');
	const [batasTabel, setBatasTabel] = useState(50);

	const fetchData = useCallback(async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams({ status, tahun, kategori, sumber });
			const response = await api.get(`/prolap/output-infrastruktur?${params}`);
			setData(response.data?.data);
			setError(null);
		} catch (err) {
			console.error('Error fetching output infrastruktur:', err);
			setError(err.response?.data?.message || 'Gagal memuat rekap output');
		} finally {
			setLoading(false);
		}
	}, [status, tahun, kategori, sumber]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	useEffect(() => {
		setBatasTabel(50);
	}, [status, tahun, kategori, sumber, cari]);

	const ringkasan = data?.ringkasan;
	const titik = data?.peta?.titik || [];
	// Referensi stabil — dipakai sebagai dependensi useMemo penyaringan tabel.
	const daftar = useMemo(() => data?.daftar || [], [data]);

	const kategoriMeta = useMemo(() => {
		const map = {};
		(data?.opsi?.kategori || []).forEach((item) => {
			map[item.key] = item;
		});
		return map;
	}, [data]);

	const kategoriTerpilih = kategoriMeta[kategori];
	const diukurPanjang = !kategoriTerpilih || kategoriTerpilih.satuan === 'meter';

	const daftarTersaring = useMemo(() => {
		const keyword = cari.trim().toLowerCase();
		if (!keyword) return daftar;
		return daftar.filter((row) =>
			[row.nama_desa, row.nama_kecamatan, row.nama_kegiatan, row.lokasi]
				.filter(Boolean)
				.some((field) => String(field).toLowerCase().includes(keyword))
		);
	}, [daftar, cari]);

	const cakupanPeta = ringkasan?.desa
		? Math.round((titik.length / ringkasan.desa) * 100)
		: 0;

	const akurasiVolume = ringkasan
		? ringkasan.terbaca + ringkasan.tidak_terbaca > 0
			? Math.round((ringkasan.terbaca / (ringkasan.terbaca + ringkasan.tidak_terbaca)) * 1000) / 10
			: 100
		: 0;

	const exportCsv = useCallback(() => {
		if (!daftarTersaring.length) return;
		const header = [
			'Sumber', 'Tahun', 'Kategori', 'Kecamatan', 'Desa',
			'Nama Kegiatan', 'Lokasi', 'Volume (asli)', 'Panjang (m)', 'Anggaran',
		];
		const rows = daftarTersaring.map((row) => [
			row.sumber === 'reguler' ? 'Bankeu Reguler' : 'Bankeu Perubahan',
			row.tahun,
			kategoriMeta[row.kategori]?.label || row.kategori,
			row.nama_kecamatan,
			row.nama_desa,
			row.nama_kegiatan || '',
			row.lokasi || '',
			row.volume || '',
			row.panjang_m ?? '',
			row.anggaran,
		]);
		const csv = [header, ...rows]
			.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
			.join('\n');
		const blob = new Blob([String.fromCharCode(0xfeff) + csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `output-bankeu-${kategori}-${status}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	}, [daftarTersaring, kategoriMeta, kategori, status]);

	// ---------- Loading ----------
	if (loading && !data) {
		return (
			<div className="min-h-screen bg-gray-50 p-4 sm:p-6">
				<div className="mx-auto max-w-7xl space-y-5">
					<div className="h-40 animate-pulse rounded-3xl bg-slate-200/70" />
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{[0, 1, 2, 3].map((key) => (
							<div key={key} className="h-32 animate-pulse rounded-2xl bg-white" />
						))}
					</div>
					<div className="h-[520px] animate-pulse rounded-3xl bg-white" />
				</div>
			</div>
		);
	}

	// ---------- Error ----------
	if (error) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
				<div className="w-full max-w-md rounded-2xl border border-rose-100 bg-white p-8 text-center shadow-lg">
					<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50">
						<AlertTriangle className="h-7 w-7 text-rose-500" />
					</div>
					<h2 className="text-lg font-bold text-slate-900">Gagal memuat rekap output</h2>
					<p className="mt-2 text-sm text-slate-600">{error}</p>
					<button
						onClick={fetchData}
						className="mt-5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
					>
						Coba Lagi
					</button>
				</div>
			</div>
		);
	}

	const statusLabel =
		data?.opsi?.status?.find((option) => option.key === status)?.label || status;

	return (
		<div className="min-h-screen bg-gray-50 pb-8">
			{/* ---------- Header ---------- */}
			<div className="relative overflow-hidden bg-gradient-to-br from-amber-600 via-orange-600 to-rose-600 text-white">
				<div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-yellow-300/25 blur-3xl" />
				<div className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-rose-400/25 blur-3xl" />
				<div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
					<button
						onClick={() => navigate(-1)}
						className="mb-4 flex items-center gap-2 text-white/75 transition-colors hover:text-white"
					>
						<ArrowLeft className="h-5 w-5" />
						Kembali
					</button>
					<div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
						<div className="flex items-start gap-4">
							<span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
								<Route className="h-7 w-7" />
							</span>
							<div>
								<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
									Sekretariat &middot; Prolap
								</p>
								<h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Output Pembangunan Bankeu</h1>
								<p className="mt-1.5 text-sm text-white/80">
									Gabungan Bankeu Reguler &amp; Bankeu Perubahan &mdash; {statusLabel.toLowerCase()}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<button
								onClick={exportCsv}
								disabled={!daftarTersaring.length}
								className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2.5 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-white/20 disabled:opacity-40"
							>
								<Download className="h-4 w-4" />
								<span className="hidden sm:inline">CSV</span>
							</button>
							<button
								onClick={fetchData}
								disabled={loading}
								className="rounded-xl bg-white/10 p-2.5 backdrop-blur-sm transition-colors hover:bg-white/20 disabled:opacity-50"
								title="Muat ulang"
							>
								<RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
							</button>
						</div>
					</div>
				</div>
			</div>

			<div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
				{/* ---------- Filter ---------- */}
				<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<Select
							label="Status pekerjaan"
							value={status}
							onChange={setStatus}
							options={(data?.opsi?.status || []).map((option) => ({
								value: option.key,
								label: `${option.label} (${fmt(option.jumlah)})`,
							}))}
						/>
						<Select
							label="Kategori output"
							value={kategori}
							onChange={setKategori}
							options={[
								{ value: 'semua', label: 'Semua kategori' },
								...(data?.opsi?.kategori || []).map((option) => ({
									value: option.key,
									label: option.label,
								})),
							]}
						/>
						<Select
							label="Tahun anggaran"
							value={tahun}
							onChange={setTahun}
							options={[
								{ value: 'semua', label: 'Semua tahun' },
								...(data?.opsi?.tahun || []).map((year) => ({ value: String(year), label: String(year) })),
							]}
						/>
						<Select
							label="Sumber"
							value={sumber}
							onChange={setSumber}
							options={[
								{ value: 'semua', label: 'Reguler + Perubahan' },
								...(data?.opsi?.sumber || []).map((option) => ({
									value: option.key,
									label: option.label,
								})),
							]}
						/>
					</div>
				</div>

				{/* ---------- Kosong ---------- */}
				{ringkasan?.ruas === 0 ? (
					<div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
							<Info className="h-8 w-8 text-slate-400" />
						</div>
						<h3 className="text-lg font-bold text-slate-900">Tidak ada data pada saringan ini</h3>
						<p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
							Coba longgarkan status pekerjaan &mdash; misalnya dari &ldquo;Sudah ada LPJ&rdquo; ke
							&ldquo;Disetujui DPMD&rdquo;. Jumlah tiap status tertera di dalam pilihannya.
						</p>
					</div>
				) : (
					<>
						{/* ---------- Angka utama ---------- */}
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
							{diukurPanjang ? (
								<StatTile
									icon={Ruler}
									label="Total panjang"
									value={km(ringkasan?.panjang_m)}
									caption={`dari ${fmt(ringkasan?.terbaca)} ruas yang volumenya terbaca`}
									tone={PRIMARY}
								/>
							) : (
								<StatTile
									icon={Building2}
									label="Total unit"
									value={fmt(ringkasan?.ruas)}
									caption={kategoriTerpilih?.label}
									tone={PRIMARY}
								/>
							)}
							<StatTile
								icon={Layers}
								label={diukurPanjang ? 'Jumlah ruas' : 'Jumlah item'}
								value={fmt(ringkasan?.ruas)}
								caption={`tersebar di ${fmt(ringkasan?.kecamatan)} kecamatan`}
								tone={SLOT_COLOR[2]}
							/>
							<StatTile
								icon={MapPin}
								label="Desa terjangkau"
								value={fmt(ringkasan?.desa)}
								caption={`dari ${fmt(ringkasan?.total_desa_sistem)} desa/kelurahan`}
								tone={SLOT_COLOR[3]}
							/>
							<StatTile
								icon={Wallet}
								label="Nilai anggaran"
								value={rupiahRingkas(ringkasan?.anggaran)}
								caption="akumulasi anggaran usulan"
								tone={SLOT_COLOR[7]}
							/>
						</div>

						{/* ---------- Peta ---------- */}
						<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
							<div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-end sm:justify-between">
								<div>
									<h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
										<MapPin className="h-4 w-4 text-slate-400" />
										Sebaran per Desa
									</h2>
									<p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
										Lingkaran berada di titik desa, luasnya sebanding dengan panjang yang dibangun di desa itu.
										Kolom lokasi pada proposal hanya berisi teks (&ldquo;Kp. Sirnasari RW 06&rdquo;), jadi titik
										persis tiap ruas memang tidak tersedia.
									</p>
								</div>
								{/* Rasio, bukan angka tunggal — "106 desa terpetakan" terbaca seolah itu
								    seluruh desa yang membangun, padahal itu bagian yang punya koordinat. */}
								<div className="shrink-0 sm:text-right">
									<p className="text-sm text-slate-500">
										<span className="text-lg font-bold text-slate-900">{fmt(titik.length)}</span> dari{' '}
										<span className="font-semibold text-slate-700">{fmt(ringkasan?.desa)}</span> desa terpetakan
									</p>
									{cakupanPeta < 100 && (
										<p className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
											<AlertTriangle className="h-3 w-3" />
											cakupan peta {cakupanPeta}%
										</p>
									)}
								</div>
							</div>

							{/* Penjelasan cakupan sengaja DI ATAS peta — kalau ditaruh di bawah,
							    pembaca sudah terlanjur menyimpulkan petanya kurang data. */}
							{data?.peta?.desa_tanpa_koordinat > 0 && (
								<div className="flex items-start gap-3 border-b border-amber-100 bg-amber-50 px-5 py-4">
									<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
									<p className="text-xs leading-5 text-amber-900">
										<span className="font-semibold">
											{fmt(data.peta.desa_tanpa_koordinat)} desa ({fmt(data.peta.ruas_tanpa_koordinat)} ruas)
											tidak muncul sebagai lingkaran
										</span>{' '}
										karena titik koordinatnya belum diisi di Profil Desa &mdash; baru{' '}
										{fmt(data.peta.desa_berkoordinat_sistem)} dari {fmt(ringkasan?.total_desa_sistem)}{' '}
										desa/kelurahan se-Kabupaten yang sudah mengisinya. Ini soal kelengkapan koordinat, bukan
										soal desanya belum mengusulkan. Semua angka di kartu atas dan peringkat kecamatan di bawah
										tetap menghitung {fmt(ringkasan?.desa)} desa secara utuh.
									</p>
								</div>
							)}

							<div className="relative h-[520px] w-full">
								{titik.length > 0 ? (
									<>
										<MapContainer
											center={BOGOR_CENTER}
											zoom={10}
											scrollWheelZoom
											className="h-full w-full"
										>
											<TileLayer
												attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
												url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
											/>
											<FitBounds points={titik} />
											{titik.map((point) => (
												<CircleMarker
													key={point.desa_id}
													center={[point.lat, point.lng]}
													radius={radiusFor(point.panjang_m)}
													pathOptions={{
														color: PRIMARY,
														weight: 1.5,
														fillColor: PRIMARY,
														fillOpacity: 0.35,
													}}
												>
													<Popup>
														<div className="min-w-[190px]">
															<p className="text-sm font-bold text-slate-900">{point.nama_desa}</p>
															<p className="text-xs text-slate-500">Kec. {point.nama_kecamatan}</p>
															<div className="mt-2 space-y-1 text-xs">
																<p className="flex justify-between gap-3">
																	<span className="text-slate-500">Panjang</span>
																	<span className="font-semibold text-slate-900">{km(point.panjang_m)}</span>
																</p>
																<p className="flex justify-between gap-3">
																	<span className="text-slate-500">Jumlah ruas</span>
																	<span className="font-semibold text-slate-900">{fmt(point.ruas)}</span>
																</p>
																<p className="flex justify-between gap-3">
																	<span className="text-slate-500">Anggaran</span>
																	<span className="font-semibold text-slate-900">
																		{rupiahRingkas(point.anggaran)}
																	</span>
																</p>
															</div>
														</div>
													</Popup>
												</CircleMarker>
											))}
										</MapContainer>
										<MapLegend />
									</>
								) : (
									<div className="flex h-full items-center justify-center px-6 text-center">
										<div>
											<MapPin className="mx-auto h-10 w-10 text-slate-300" />
											<p className="mt-3 text-sm text-slate-500">
												Belum ada desa berkoordinat pada saringan ini.
											</p>
										</div>
									</div>
								)}
							</div>

						</div>

						{/* ---------- Rekap kecamatan & kategori ---------- */}
						<div className="grid gap-4 lg:grid-cols-2">
							<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
								<div className="mb-3">
									<h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
										<Trophy className="h-4 w-4 text-slate-400" />
										Peringkat Kecamatan
									</h2>
									<p className="mt-1 text-xs text-slate-500">
										Mencakup seluruh data, termasuk desa yang belum berkoordinat.
									</p>
								</div>
								<div className="max-h-[420px] overflow-y-auto pr-1">
									<BarList
										rows={(data?.per_kecamatan || []).map((row) => ({
											key: row.kecamatan_id,
											label: row.nama,
											value: diukurPanjang ? row.panjang_m : row.ruas,
											...row,
										}))}
										valueFormatter={(value) => (diukurPanjang ? km(value) : fmt(value))}
										captionFor={(row) => `${fmt(row.ruas)} ruas · ${fmt(row.desa)} desa · ${rupiahRingkas(row.anggaran)}`}
									/>
								</div>
							</div>

							<div className="space-y-4">
								<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
									<div className="mb-3">
										<h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
											<Layers className="h-4 w-4 text-slate-400" />
											Komposisi Kategori
										</h2>
										<p className="mt-1 text-xs text-slate-500">
											Kategori bersatuan unit tidak punya panjang &mdash; dihitung per item.
										</p>
									</div>
									<BarList
										rows={(data?.per_kategori || []).map((row) => ({
											key: row.key,
											label: row.label,
											value: row.ruas,
											...row,
										}))}
										valueFormatter={(value) => `${fmt(value)} item`}
										colorFor={(row) => SLOT_COLOR[row.slot] || PRIMARY}
										captionFor={(row) =>
											row.satuan === 'meter'
												? `${km(row.panjang_m)} · ${rupiahRingkas(row.anggaran)}`
												: `satuan unit · ${rupiahRingkas(row.anggaran)}`
										}
									/>
								</div>

								{/* Mutu data */}
								<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
									<h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
										<Info className="h-4 w-4 text-slate-400" />
										Mutu Data
									</h2>
									<dl className="mt-3 space-y-2.5 text-sm">
										<div className="flex items-baseline justify-between gap-3">
											<dt className="text-slate-500">Volume terbaca</dt>
											<dd className="font-bold tabular-nums text-slate-900">
												{akurasiVolume}% ({fmt(ringkasan?.terbaca)} dari{' '}
												{fmt((ringkasan?.terbaca || 0) + (ringkasan?.tidak_terbaca || 0))})
											</dd>
										</div>
										<div className="flex items-baseline justify-between gap-3">
											<dt className="text-slate-500">Volume tidak terbaca</dt>
											<dd className="font-bold tabular-nums text-slate-900">{fmt(ringkasan?.tidak_terbaca)} ruas</dd>
										</div>
										<div className="flex items-baseline justify-between gap-3">
											<dt className="text-slate-500">Desa punya koordinat</dt>
											<dd className="font-bold tabular-nums text-slate-900">
												{fmt(data?.peta?.desa_berkoordinat_sistem)} dari {fmt(ringkasan?.total_desa_sistem)}
											</dd>
										</div>
									</dl>
									<p className="mt-3 border-t border-slate-100 pt-3 text-[11px] leading-5 text-slate-500">
										Panjang diurai dari kolom volume yang formatnya bebas (&ldquo;470 M x 3 M x 0,15 M&rdquo;,
										&ldquo;P = 1219 M&rdquo;). Yang tidak terbaca tidak dianggap nol &mdash; dihitung terpisah
										supaya total panjang tidak dilaporkan lebih rendah dari kenyataannya.
									</p>
								</div>
							</div>
						</div>

						{/* ---------- Daftar rinci ---------- */}
						<div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
							<div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
								<div>
									<h2 className="text-base font-semibold text-slate-900">Daftar Rinci</h2>
									<p className="mt-1 text-xs text-slate-500">
										{fmt(daftarTersaring.length)} baris
										{cari.trim() && ` (disaring dari ${fmt(daftar.length)})`}
									</p>
								</div>
								<div className="relative sm:w-72">
									<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
									<input
										value={cari}
										onChange={(event) => setCari(event.target.value)}
										placeholder="Cari desa, kecamatan, atau lokasi…"
										className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm transition-colors focus:border-slate-900 focus:outline-none"
									/>
								</div>
							</div>

							<div className="overflow-x-auto">
								<table className="w-full min-w-[820px] text-sm">
									<thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
										<tr>
											<th className="px-4 py-3 font-semibold">Desa</th>
											<th className="px-4 py-3 font-semibold">Kegiatan</th>
											<th className="px-4 py-3 font-semibold">Lokasi</th>
											<th className="px-4 py-3 font-semibold">Volume</th>
											<th className="px-4 py-3 text-right font-semibold">Panjang</th>
											<th className="px-4 py-3 text-right font-semibold">Anggaran</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-100">
										{daftarTersaring.slice(0, batasTabel).map((row) => (
											<tr key={row.id} className="hover:bg-slate-50">
												<td className="px-4 py-3">
													<p className="font-semibold text-slate-900">{row.nama_desa}</p>
													<p className="text-xs text-slate-500">Kec. {row.nama_kecamatan}</p>
												</td>
												<td className="max-w-[240px] px-4 py-3">
													<p className="truncate text-slate-700" title={row.nama_kegiatan}>
														{row.nama_kegiatan || '—'}
													</p>
													<p className="text-xs text-slate-400">
														{kategoriMeta[row.kategori]?.label} &middot;{' '}
														{row.sumber === 'reguler' ? 'Reguler' : 'Perubahan'} {row.tahun}
													</p>
												</td>
												<td className="max-w-[180px] px-4 py-3">
													<p className="truncate text-xs text-slate-600" title={row.lokasi}>
														{row.lokasi || '—'}
													</p>
												</td>
												<td className="max-w-[160px] px-4 py-3">
													<p className="truncate text-xs text-slate-500" title={row.volume}>
														{row.volume || '—'}
													</p>
												</td>
												<td className="px-4 py-3 text-right">
													{row.panjang_m === null ? (
														<span className="text-xs text-slate-400">tidak terbaca</span>
													) : (
														<span className="font-semibold tabular-nums text-slate-900">{fmt(row.panjang_m)} m</span>
													)}
												</td>
												<td className="px-4 py-3 text-right tabular-nums text-slate-700">
													{rupiahRingkas(row.anggaran)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

							{daftarTersaring.length > batasTabel && (
								<div className="border-t border-slate-100 p-4 text-center">
									<button
										onClick={() => setBatasTabel((prev) => prev + 100)}
										className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
									>
										Tampilkan 100 lagi ({fmt(daftarTersaring.length - batasTabel)} tersisa)
									</button>
								</div>
							)}
						</div>
					</>
				)}

				<p className="text-center text-xs text-slate-400">
					Diperbarui {data?.generated_at ? new Date(data.generated_at).toLocaleString('id-ID') : '-'}
				</p>
			</div>
		</div>
	);
};

export default OutputInfrastrukturPage;
