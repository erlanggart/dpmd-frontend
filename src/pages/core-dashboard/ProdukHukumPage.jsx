// src/pages/core-dashboard/ProdukHukumPage.jsx
//
// Produk Hukum di Core Dashboard — dulu khusus desa, sekarang menampung
// seluruhnya:
//
//   Desa       — Perdes, Perkades, SK Kades dari 416 desa
//   Kabupaten  — Perda, Perbup, SK, Surat Edaran yang diunggah tiap bidang DPMD
//   Referensi  — rujukan peraturan luar (UU, PP, Permendagri, Perda Provinsi)
//
// Ketiganya TIDAK dilebur jadi satu tabel. Kolom pembedanya berbeda — yang satu
// ditelusuri per kecamatan, yang lain per bidang, yang ketiga per topik — dan
// satu tabel dengan separuh kolom kosong lebih sulit dibaca, bukan lebih mudah.
// Yang disatukan adalah ANGKA-nya, di baris ringkasan paling atas, sehingga
// pembaca tahu ketiganya bagian dari satu himpunan.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	Scale, Building2, Landmark, BookMarked, FileText, AlertCircle, Loader2,
	Search, ExternalLink, RefreshCw, ChevronLeft, ChevronRight,
} from 'lucide-react';
import api from '../../api';
import API_CONFIG from '../../config/api';
import ProdukHukumDesaPage from '../bidang/pemdes/ProdukHukumPage';

const nf = new Intl.NumberFormat('id-ID');

const STATUS_LABEL = { berlaku: 'Berlaku', diubah: 'Diubah', dicabut: 'Dicabut' };
const STATUS_KELAS = {
	berlaku: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
	diubah: 'bg-amber-50 text-amber-700 ring-amber-200',
	dicabut: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const urlBerkas = (jalur) => {
	if (!jalur) return null;
	const asal = (API_CONFIG.STORAGE_URL || '').replace(/\/uploads\/?$/, '');
	return `${asal}${jalur}`;
};

/* ------------------------------------------------------- daftar kabupaten -- */

/**
 * Daftar produk hukum kabupaten lintas bidang — hanya baca.
 * Menambah dan mengubah dilakukan di halaman bidang masing-masing; Core
 * Dashboard adalah tempat melihat, bukan tempat menyunting milik orang lain.
 */
const DaftarKabupaten = () => {
	const [data, setData] = useState([]);
	const [bidangOpsi, setBidangOpsi] = useState([]);
	const [memuat, setMemuat] = useState(true);
	const [galat, setGalat] = useState(null);
	const [ketik, setKetik] = useState('');
	const [cari, setCari] = useState('');
	const [bidangId, setBidangId] = useState('');
	const [halaman, setHalaman] = useState(1);
	const [totalHalaman, setTotalHalaman] = useState(1);
	const [totalBaris, setTotalBaris] = useState(0);

	useEffect(() => {
		const t = setTimeout(() => { setCari(ketik); setHalaman(1); }, 400);
		return () => clearTimeout(t);
	}, [ketik]);

	const ambil = useCallback(async () => {
		setMemuat(true);
		try {
			const params = new URLSearchParams({ page: String(halaman), limit: '20' });
			if (cari) params.append('search', cari);
			if (bidangId) params.append('bidang_id', bidangId);

			const r = await api.get(`/produk-hukum-bidang?${params.toString()}`);
			setData(r.data?.data || []);
			setTotalHalaman(r.data?.pagination?.totalPages || 1);
			setTotalBaris(r.data?.pagination?.totalItems || 0);
			setGalat(null);
		} catch (e) {
			setGalat(e.response?.data?.message || 'Gagal memuat produk hukum kabupaten');
		} finally {
			setMemuat(false);
		}
	}, [halaman, cari, bidangId]);

	useEffect(() => { ambil(); }, [ambil]);

	useEffect(() => {
		api.get('/produk-hukum-gabungan/stats')
			.then((r) => setBidangOpsi(r.data?.data?.bidang?.perBidang || []))
			.catch(() => setBidangOpsi([]));
	}, []);

	return (
		<div className="space-y-5">
			<div className="rounded-xl border border-slate-200 bg-white p-4">
				<div className="flex flex-wrap items-center gap-3">
					<div className="relative min-w-0 flex-1">
						<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
						<input
							value={ketik}
							onChange={(e) => setKetik(e.target.value)}
							placeholder="Cari judul, nomor, atau isi peraturan…"
							className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-900"
						/>
					</div>
					<select
						value={bidangId}
						onChange={(e) => { setBidangId(e.target.value); setHalaman(1); }}
						className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
					>
						<option value="">Semua bidang</option>
						{bidangOpsi.map((b) => (
							<option key={b.bidang_id} value={b.bidang_id}>
								{b.name} ({b.value})
							</option>
						))}
					</select>
					<button
						type="button"
						onClick={ambil}
						className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50"
					>
						<RefreshCw className={`h-4 w-4 ${memuat ? 'animate-spin' : ''}`} />
						Muat ulang
					</button>
				</div>
			</div>

			{galat && (
				<div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
					<AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-600" />
					<p className="text-sm text-rose-800">{galat}</p>
				</div>
			)}

			<div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
				{memuat && data.length === 0 ? (
					<div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
						<Loader2 className="h-4 w-4 animate-spin" />
						Memuat produk hukum kabupaten…
					</div>
				) : data.length === 0 ? (
					<div className="px-6 py-16 text-center">
						<p className="text-sm text-slate-500">
							Belum ada produk hukum kabupaten yang diunggah.
						</p>
						<p className="mt-1 text-xs text-slate-400">
							Tiap bidang mengunggahnya lewat menu Produk Hukum Kabupaten di halaman bidangnya.
						</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full min-w-[52rem]">
							<thead>
								<tr className="border-b border-slate-200 bg-slate-50 text-left">
									<th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Dokumen</th>
									<th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Bidang</th>
									<th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Jenis</th>
									<th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tahun</th>
									<th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</th>
									<th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Berkas</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{data.map((baris) => (
									<tr key={baris.id} className="transition-colors hover:bg-slate-50">
										<td className="px-4 py-3">
											<p className="text-sm font-medium text-slate-900">{baris.judul}</p>
											<p className="mt-0.5 text-xs text-slate-500">
												Nomor {baris.nomor}
												{baris.tentang ? ` · ${baris.tentang}` : ''}
											</p>
										</td>
										<td className="px-4 py-3 text-sm text-slate-700">{baris.bidang?.nama || '—'}</td>
										<td className="px-4 py-3">
											<span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
												{baris.singkatan_jenis}
											</span>
										</td>
										<td className="px-4 py-3 text-sm tabular-nums text-slate-700">{baris.tahun}</td>
										<td className="px-4 py-3">
											<span className={`inline-flex rounded-md px-2 py-1 text-[11px] font-medium ring-1 ${STATUS_KELAS[baris.status_peraturan] || ''}`}>
												{STATUS_LABEL[baris.status_peraturan] || baris.status_peraturan}
											</span>
										</td>
										<td className="px-4 py-3">
											{baris.file_url ? (
												<a
													href={urlBerkas(baris.file_url)}
													target="_blank"
													rel="noreferrer"
													className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 underline-offset-2 hover:underline"
												>
													<FileText className="h-3.5 w-3.5" />
													Buka PDF
												</a>
											) : baris.url_sumber ? (
												<a
													href={baris.url_sumber}
													target="_blank"
													rel="noreferrer"
													className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 underline-offset-2 hover:underline"
												>
													<ExternalLink className="h-3.5 w-3.5" />
													JDIH
												</a>
											) : (
												<span className="text-xs text-slate-400">—</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				{totalHalaman > 1 && (
					<div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
						<p className="text-xs text-slate-500">
							Halaman {halaman} dari {totalHalaman} · {nf.format(totalBaris)} dokumen
						</p>
						<div className="flex gap-2">
							<button
								type="button"
								disabled={halaman <= 1}
								onClick={() => setHalaman((h) => h - 1)}
								className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
							>
								<ChevronLeft className="h-4 w-4" />
							</button>
							<button
								type="button"
								disabled={halaman >= totalHalaman}
								onClick={() => setHalaman((h) => h + 1)}
								className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
							>
								<ChevronRight className="h-4 w-4" />
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

/* ------------------------------------------------------------------ utama -- */

const SUMBER = [
	{ id: 'desa', label: 'Desa', icon: Building2 },
	{ id: 'kabupaten', label: 'Kabupaten', icon: Landmark },
	{ id: 'referensi', label: 'Referensi', icon: BookMarked },
];

const CoreProdukHukumPage = ({ detailBasePath = '/core-dashboard/statistik-produk-hukum' }) => {
	const [sumber, setSumber] = useState('desa');
	const [ringkas, setRingkas] = useState(null);

	useEffect(() => {
		api.get('/produk-hukum-gabungan/stats')
			.then((r) => setRingkas(r.data?.data || null))
			.catch(() => setRingkas(null));
	}, []);

	const ubin = useMemo(() => ([
		{
			id: 'total',
			label: 'Total dokumen',
			nilai: ringkas?.total ?? 0,
			keterangan: 'desa + kabupaten',
		},
		{
			id: 'desa',
			label: 'Produk hukum desa',
			nilai: ringkas?.desa?.total ?? 0,
			keterangan: ringkas?.desa
				? `${nf.format(ringkas.desa.desaSudahUnggah)} dari ${nf.format(ringkas.desa.jumlahDesa)} desa sudah mengunggah`
				: '—',
		},
		{
			id: 'kabupaten',
			label: 'Produk hukum kabupaten',
			nilai: ringkas?.bidang?.total ?? 0,
			keterangan: ringkas?.bidang
				? `${ringkas.bidang.bidangSudahUnggah} dari ${ringkas.bidang.jumlahBidang} bidang sudah mengunggah`
				: '—',
		},
		{
			id: 'referensi',
			label: 'Referensi peraturan',
			nilai: ringkas?.referensi?.total ?? 0,
			keterangan: 'rujukan luar, belum diunggah',
		},
	]), [ringkas]);

	return (
		<div className="min-h-screen bg-slate-50 p-4 pt-20 sm:p-6 lg:p-8 lg:pt-8">
			<div className="mx-auto max-w-7xl">
				<div className="mb-6 rounded-xl bg-slate-900 p-6 text-white">
					<div className="flex items-center gap-3">
						<Scale className="h-7 w-7" />
						<div>
							<h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Produk Hukum</h1>
							<p className="mt-0.5 text-sm text-white/80">
								Produk hukum desa, kabupaten, dan rujukan peraturan yang mengikat desa
							</p>
						</div>
					</div>
				</div>

				<div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
					{ubin.map((u) => (
						<div key={u.id} className="rounded-xl border border-slate-200 bg-white p-4">
							<p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
								{u.label}
							</p>
							<p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
								{nf.format(u.nilai)}
							</p>
							<p className="mt-1 text-xs text-slate-500">{u.keterangan}</p>
						</div>
					))}
				</div>

				{/* Pemilih sumber. Satu baris di atas isinya, bukan tersembunyi di
				    dalam salah satu tabel. */}
				<div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
					{SUMBER.map(({ id, label, icon: Icon }) => (
						<button
							key={id}
							type="button"
							onClick={() => setSumber(id)}
							className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
								sumber === id
									? 'bg-slate-900 text-white'
									: 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
							}`}
						>
							<Icon className="h-4 w-4" />
							{label}
						</button>
					))}
				</div>

				{sumber === 'desa' && (
					<ProdukHukumDesaPage tersemat detailBasePath={detailBasePath} />
				)}

				{sumber === 'kabupaten' && <DaftarKabupaten />}

				{sumber === 'referensi' && (
					<div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
						<BookMarked className="mx-auto h-6 w-6 text-slate-300" />
						<p className="mt-3 text-sm text-slate-500">
							Daftar rujukan peraturan belum diisi.
						</p>
						<p className="mt-1 text-xs text-slate-400">
							UU, PP, Permendagri, Permendes, dan Perda Provinsi yang mengikat desa akan
							ditampilkan di sini beserta tautan ke JDIH.
						</p>
					</div>
				)}
			</div>
		</div>
	);
};

export default CoreProdukHukumPage;
