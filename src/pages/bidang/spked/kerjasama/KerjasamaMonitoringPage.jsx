// src/pages/bidang/spked/kerjasama/KerjasamaMonitoringPage.jsx
//
// Dashboard monitoring Kerja Sama Desa — sisi Bidang SPKED.
//
// HANYA MEMANTAU. Tidak ada tombol yang mengubah data desa di halaman ini, dan
// rutenya pun tidak menyediakannya (dpmdKerjasamaDesa.routes.js hanya GET).
//
// CATATAN WARNA — jangan diganti tanpa menjalankan ulang validatornya.
// Empat warna donat di bawah bukan pilihan selera: keempatnya diuji dengan
// validator palet pada daftar pasangan `all` (benar untuk donat, karena tiap
// juring dibandingkan dengan semua juring lain, bukan hanya tetangganya).
// Kombinasi bawaan biru–oranye–aqua–KUNING gagal di sana: kuning #eda100 dan
// oranye #eb6834 hanya terpisah ΔE 13,7 untuk penglihatan normal, di bawah
// lantai 15. Kuning ditukar violet #4a3aa7 sehingga pasangan terburuk menjadi
// ΔE 16,3 normal dan 9,2 untuk buta warna deutan.
//
// Aqua juga membawa peringatan kontras terhadap latar putih (2,74:1), yang
// mewajibkan label terbaca — karena itu legendanya membawa angka dan persen,
// dan tabel di bawah menampilkan bidang sebagai teks. Identitas tidak pernah
// bergantung pada warna saja.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	Bar,
	BarChart,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import Swal from 'sweetalert2';
import api from '../../../../api';
import {
	LuChartPie,
	LuDownload,
	LuFileText,
	LuLoader,
	LuSearch,
	LuTriangleAlert,
} from 'react-icons/lu';

const PANEL = 'overflow-hidden rounded-2xl border border-slate-200 bg-white';
const KEPALA = 'flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 px-5 py-4';
const KICKER = 'text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400';
const KISI_GARIS = 'grid gap-px bg-slate-200';
const INPUT =
	'rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900';

/** Slot kategori, urut tetap mengikuti bidang 1–4. Lihat catatan warna di atas. */
const WARNA_BIDANG = ['#2a78d6', '#eb6834', '#1baf7a', '#4a3aa7'];
// Peringkat kecamatan satu deret tunggal: warnanya tidak membawa identitas apa
// pun, jadi satu warna netral — bukan sepuluh warna yang seolah berarti sesuatu.
const WARNA_BATANG = '#334155';

const BASIS_BERKAS = import.meta.env.VITE_IMAGE_BASE_URL || 'http://127.0.0.1:3001';
const urlDokumen = (berkas) => `${BASIS_BERKAS}/uploads/kerjasama_desa/${encodeURIComponent(berkas)}`;

const angka = (n) => Number(n || 0).toLocaleString('id-ID');
const pesanGalat = (e, cadangan) => e?.response?.data?.message || e?.message || cadangan;

/** Satu angka dalam kisi bergaris — tanpa ikon, tanpa kotak warna. */
const Angka = ({ label, nilai, keterangan, tekan, aksi }) => {
	const isi = (
		<>
			<p className={KICKER}>{label}</p>
			<p
				className={`mt-2.5 font-bold leading-none tracking-tight tabular-nums text-slate-900 ${
					tekan ? 'text-[38px]' : 'text-[26px]'
				}`}
			>
				{nilai}
			</p>
			{keterangan && <p className="mt-2 text-[11.5px] leading-snug text-slate-500">{keterangan}</p>}
		</>
	);

	if (aksi) {
		return (
			<button
				onClick={aksi}
				className="bg-white px-5 py-5 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50"
			>
				{isi}
			</button>
		);
	}
	return <div className="bg-white px-5 py-5">{isi}</div>;
};

/** Tooltip seragam untuk kedua grafik. */
const Petunjuk = ({ active, payload, satuan = 'kerja sama' }) => {
	if (!active || !payload?.length) return null;
	const titik = payload[0];
	return (
		<div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
			<p className="text-[12px] font-semibold text-slate-900">{titik.payload.nama || titik.payload.label}</p>
			<p className="mt-0.5 text-[11.5px] tabular-nums text-slate-500">
				{angka(titik.value)} {satuan}
			</p>
		</div>
	);
};

const KerjasamaMonitoringPage = () => {
	const [meta, setMeta] = useState(null);
	const [statistik, setStatistik] = useState(null);
	const [baris, setBaris] = useState([]);
	const [halamanMeta, setHalamanMeta] = useState(null);
	const [memuat, setMemuat] = useState(true);
	const [memuatTabel, setMemuatTabel] = useState(false);
	const [galat, setGalat] = useState(null);

	const [saring, setSaring] = useState({ tahun: '', kecamatan_id: '', jenis: '', bidang: '', q: '' });
	const [halaman, setHalaman] = useState(1);

	const petaBidang = useMemo(() => new Map((meta?.bidang || []).map((b) => [b.key, b])), [meta]);
	const petaJenis = useMemo(() => new Map((meta?.jenis || []).map((j) => [j.key, j])), [meta]);

	useEffect(() => {
		(async () => {
			try {
				const res = await api.get('/dpmd/kerjasama-desa/meta');
				setMeta(res.data?.data || null);
			} catch (error) {
				setGalat(pesanGalat(error, 'Tidak dapat memuat data monitoring.'));
			} finally {
				setMemuat(false);
			}
		})();
	}, []);

	const params = useMemo(() => {
		const p = {};
		if (saring.tahun) p.tahun = saring.tahun;
		if (saring.kecamatan_id) p.kecamatan_id = saring.kecamatan_id;
		if (saring.jenis) p.jenis = saring.jenis;
		if (saring.bidang) p.bidang = saring.bidang;
		if (saring.q.trim()) p.q = saring.q.trim();
		return p;
	}, [saring]);

	const muatStatistik = useCallback(async () => {
		try {
			const res = await api.get('/dpmd/kerjasama-desa/statistik', { params });
			setStatistik(res.data?.data || null);
		} catch (error) {
			console.error('[KerjasamaMonitoring] statistik:', error);
		}
	}, [params]);

	const muatTabel = useCallback(async () => {
		setMemuatTabel(true);
		try {
			const res = await api.get('/dpmd/kerjasama-desa', { params: { ...params, page: halaman, per_page: 25 } });
			setBaris(res.data?.data || []);
			setHalamanMeta(res.data?.meta || null);
		} catch (error) {
			console.error('[KerjasamaMonitoring] tabel:', error);
		} finally {
			setMemuatTabel(false);
		}
	}, [params, halaman]);

	useEffect(() => {
		if (memuat || galat) return;
		const timer = setTimeout(() => {
			muatStatistik();
			muatTabel();
		}, saring.q ? 400 : 0);
		return () => clearTimeout(timer);
	}, [memuat, galat, muatStatistik, muatTabel, saring.q]);

	// Mengubah penyaring selalu kembali ke halaman 1: tetap di halaman 7 setelah
	// hasilnya menyusut jadi 2 halaman hanya menampilkan tabel kosong.
	const ubahSaring = (kunci, nilai) => {
		setHalaman(1);
		setSaring((s) => ({ ...s, [kunci]: nilai }));
	};

	const lihatDesaBelum = async () => {
		try {
			const res = await api.get('/dpmd/kerjasama-desa/desa-belum-legalitas', {
				params: saring.kecamatan_id ? { kecamatan_id: saring.kecamatan_id } : {},
			});
			const daftar = res.data?.data || [];
			if (daftar.length === 0) {
				return Swal.fire({ icon: 'success', title: 'Seluruh desa sudah mengunggah Perdes' });
			}

			const isi = daftar
				.slice(0, 200)
				.map(
					(d) =>
						`<tr><td style="padding:4px 8px;border-bottom:1px solid #f1f5f9">${d.kecamatan?.nama || '-'}</td>` +
						`<td style="padding:4px 8px;border-bottom:1px solid #f1f5f9">${d.nama}</td>` +
						`<td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;color:#64748b">${
							d.nomor_perdes ? `nomor ${d.nomor_perdes}, berkas belum` : 'belum sama sekali'
						}</td></tr>`,
				)
				.join('');

			Swal.fire({
				title: `${daftar.length} desa belum mengunggah Perdes`,
				html:
					`<div style="max-height:60vh;overflow:auto"><table style="width:100%;font-size:12.5px;text-align:left">` +
					`<thead><tr><th style="padding:4px 8px">Kecamatan</th><th style="padding:4px 8px">Desa</th><th style="padding:4px 8px">Keterangan</th></tr></thead>` +
					`<tbody>${isi}</tbody></table>` +
					(daftar.length > 200 ? `<p style="margin-top:8px;color:#64748b;font-size:12px">Menampilkan 200 pertama.</p>` : '') +
					`</div>`,
				width: 640,
				confirmButtonText: 'Tutup',
				confirmButtonColor: '#0f172a',
			});
		} catch (error) {
			Swal.fire('Gagal memuat', pesanGalat(error, 'Terjadi kesalahan.'), 'error');
		}
	};

	const unduhCsv = () => {
		const kepala = ['No', 'Kecamatan', 'Desa', 'Tahun', 'Jenis', 'Mitra', 'Bidang', 'Sub-bidang', 'Dokumen lengkap'];
		const isi = baris.map((b, i) =>
			[
				i + 1,
				b.desa?.kecamatan?.nama || '',
				b.desa?.nama || '',
				b.tahun,
				petaJenis.get(b.jenis)?.kode || b.jenis,
				b.mitra,
				petaBidang.get(b.bidang)?.label || b.bidang,
				b.sub_bidang || '',
				b.dokumen_lengkap ? 'ya' : 'belum',
			]
				.map((sel) => `"${String(sel).replace(/"/g, '""')}"`)
				.join(';'),
		);
		const blob = new Blob([`\uFEFF${[kepala.join(';'), ...isi].join('\n')}`], {
			type: 'text/csv;charset=utf-8;',
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `kerjasama-desa-${new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	if (memuat) {
		return (
			<div className="flex items-center justify-center gap-2 py-20 text-slate-500">
				<LuLoader className="h-5 w-5 animate-spin" />
				<span className="text-sm font-medium">Memuat monitoring kerja sama desa…</span>
			</div>
		);
	}

	if (galat) {
		return (
			<div className="mx-auto my-10 max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
				<LuTriangleAlert className="mx-auto h-8 w-8 text-amber-500" />
				<p className="mt-3 font-semibold text-amber-900">Tidak dapat memuat</p>
				<p className="mt-1 text-sm text-amber-800">{galat}</p>
			</div>
		);
	}

	const cakupan = statistik?.cakupan_legalitas;
	const perJenis = statistik?.per_jenis || [];
	const dataBidang = (statistik?.per_bidang || []).map((b) => ({ ...b, nama: b.label }));
	const totalBidang = dataBidang.reduce((jml, b) => jml + b.jumlah, 0);
	const dataKecamatan = (statistik?.top_kecamatan || []).map((k) => ({ ...k, nama: k.nama }));

	return (
		<div className="space-y-5 p-5">
			{/* Penyaring dalam SATU baris di atas grafik, bukan tersebar per panel. */}
			<div className="flex flex-wrap items-center gap-2.5">
				<div className="relative min-w-[220px] flex-1">
					<LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
					<input
						type="text"
						value={saring.q}
						onChange={(e) => ubahSaring('q', e.target.value)}
						placeholder="Cari desa, mitra, atau sub-bidang…"
						className={`${INPUT} w-full pl-9`}
					/>
				</div>
				<select value={saring.tahun} onChange={(e) => ubahSaring('tahun', e.target.value)} className={INPUT}>
					<option value="">Semua tahun</option>
					{(meta?.tahun || []).map((t) => (
						<option key={t} value={t}>
							{t}
						</option>
					))}
				</select>
				<select
					value={saring.kecamatan_id}
					onChange={(e) => ubahSaring('kecamatan_id', e.target.value)}
					className={INPUT}
				>
					<option value="">Semua kecamatan</option>
					{(meta?.kecamatan || []).map((k) => (
						<option key={k.id} value={k.id}>
							{k.nama}
						</option>
					))}
				</select>
				<select value={saring.jenis} onChange={(e) => ubahSaring('jenis', e.target.value)} className={INPUT}>
					<option value="">Semua jenis</option>
					{(meta?.jenis || []).map((j) => (
						<option key={j.key} value={j.key}>
							{j.kode} — {j.label}
						</option>
					))}
				</select>
				<select value={saring.bidang} onChange={(e) => ubahSaring('bidang', e.target.value)} className={INPUT}>
					<option value="">Semua bidang</option>
					{(meta?.bidang || []).map((b) => (
						<option key={b.key} value={b.key}>
							{b.nomor}. {b.label}
						</option>
					))}
				</select>
			</div>

			{/* Empat angka kepala */}
			<section className={PANEL}>
				<div className={`${KISI_GARIS} sm:grid-cols-2 xl:grid-cols-4`}>
					<Angka
						label="Total Kerja Sama"
						nilai={angka(statistik?.total)}
						keterangan={`tersebar di ${angka(statistik?.desa_terlibat)} desa`}
						tekan
					/>
					{perJenis.map((j) => (
						<Angka
							key={j.key}
							label={`${j.label} (${j.kode})`}
							nilai={angka(j.jumlah)}
							keterangan={
								statistik?.total > 0 ? `${Math.round((j.jumlah / statistik.total) * 100)}% dari total` : 'belum ada'
							}
						/>
					))}
					<Angka
						label="Cakupan Perdes Desa"
						nilai={cakupan?.persen === null || cakupan?.persen === undefined ? '—' : `${cakupan.persen}%`}
						keterangan={
							cakupan
								? `${angka(cakupan.sudah)} dari ${angka(cakupan.total_desa)} desa · klik untuk lihat yang belum`
								: null
						}
						aksi={lihatDesaBelum}
					/>
				</div>
			</section>

			{/* Dua grafik */}
			<div className="grid gap-5 xl:grid-cols-2">
				<section className={PANEL}>
					<div className={KEPALA}>
						<div>
							<p className={KICKER}>Grafik A</p>
							<h3 className="mt-1 text-[15px] font-bold tracking-tight text-slate-900">
								Sebaran 4 Bidang Kerja Sama
							</h3>
						</div>
					</div>

					{totalBidang === 0 ? (
						<div className="px-5 py-16 text-center">
							<LuChartPie className="mx-auto h-8 w-8 text-slate-300" strokeWidth={1.5} />
							<p className="mt-3 text-[13px] text-slate-500">Belum ada data pada penyaring ini</p>
						</div>
					) : (
						<div className="flex flex-col items-center gap-5 px-5 py-5 sm:flex-row">
							<div className="relative h-[190px] w-[190px] shrink-0">
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={dataBidang}
											dataKey="jumlah"
											nameKey="nama"
											innerRadius={58}
											outerRadius={88}
											// Jarak 2px antar juring: pemisah permukaan, bukan garis
											// tambahan yang ikut menumpuk warna.
											paddingAngle={2}
											stroke="#ffffff"
											strokeWidth={2}
										>
											{dataBidang.map((b, i) => (
												<Cell key={b.key} fill={WARNA_BIDANG[i % WARNA_BIDANG.length]} />
											))}
										</Pie>
										<Tooltip content={<Petunjuk />} />
									</PieChart>
								</ResponsiveContainer>
								<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
									<span className="text-[26px] font-bold leading-none tabular-nums text-slate-900">
										{angka(totalBidang)}
									</span>
									<span className="mt-1 text-[10.5px] text-slate-400">kerja sama</span>
								</div>
							</div>

							{/* Legenda membawa angka dan persen — aqua di palet ini di bawah
							    3:1 terhadap latar putih, sehingga label terbaca wajib ada dan
							    identitas tidak boleh bergantung pada warna saja. */}
							<ul className="min-w-0 flex-1 space-y-2.5">
								{dataBidang.map((b, i) => (
									<li key={b.key} className="flex items-center gap-2.5">
										<span
											className="h-2.5 w-2.5 shrink-0 rounded-sm"
											style={{ backgroundColor: WARNA_BIDANG[i % WARNA_BIDANG.length] }}
											aria-hidden
										/>
										<span className="min-w-0 flex-1 truncate text-[12.5px] text-slate-700">
											{b.nomor}. {b.label}
										</span>
										<span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-slate-900">
											{angka(b.jumlah)}
										</span>
										<span className="w-10 shrink-0 text-right text-[11.5px] tabular-nums text-slate-400">
											{totalBidang > 0 ? `${Math.round((b.jumlah / totalBidang) * 100)}%` : '—'}
										</span>
									</li>
								))}
							</ul>
						</div>
					)}
				</section>

				<section className={PANEL}>
					<div className={KEPALA}>
						<div>
							<p className={KICKER}>Grafik B</p>
							<h3 className="mt-1 text-[15px] font-bold tracking-tight text-slate-900">
								10 Kecamatan Teraktif
							</h3>
						</div>
						{dataKecamatan.length > 0 && (
							<p className="text-[12px] text-slate-500">jumlah kerja sama tercatat</p>
						)}
					</div>

					{dataKecamatan.length === 0 ? (
						<div className="px-5 py-16 text-center">
							<LuChartPie className="mx-auto h-8 w-8 text-slate-300" strokeWidth={1.5} />
							<p className="mt-3 text-[13px] text-slate-500">Belum ada data pada penyaring ini</p>
						</div>
					) : (
						<div className="px-3 py-4" style={{ height: Math.max(dataKecamatan.length * 30 + 30, 220) }}>
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={dataKecamatan} layout="vertical" margin={{ top: 0, right: 34, left: 8, bottom: 0 }}>
									<XAxis type="number" hide />
									<YAxis
										type="category"
										dataKey="nama"
										width={120}
										tickLine={false}
										axisLine={false}
										tick={{ fontSize: 11.5, fill: '#475569' }}
									/>
									<Tooltip content={<Petunjuk />} cursor={{ fill: '#f1f5f9' }} />
									{/* Ujung data membulat 4px, berjangkar di garis dasar. */}
									<Bar
										dataKey="jumlah"
										fill={WARNA_BATANG}
										radius={[0, 4, 4, 0]}
										barSize={14}
										label={{
											position: 'right',
											fontSize: 11,
											fill: '#64748b',
											formatter: (nilai) => angka(nilai),
										}}
									/>
								</BarChart>
							</ResponsiveContainer>
						</div>
					)}
				</section>
			</div>

			{/* Tabel monitoring — sekaligus pemenuhan "tampilan tabel" yang diwajibkan
			    peringatan kontras pada palet grafik. */}
			<section className={PANEL}>
				<div className={KEPALA}>
					<div>
						<p className={KICKER}>Tabel Monitoring</p>
						<h3 className="mt-1 text-[15px] font-bold tracking-tight text-slate-900">
							Transaksi Kerja Sama
							{halamanMeta && (
								<span className="ml-2 text-[12px] font-medium tabular-nums text-slate-400">
									{angka(halamanMeta.total)} baris
								</span>
							)}
						</h3>
					</div>
					<button
						onClick={unduhCsv}
						disabled={baris.length === 0}
						className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
					>
						<LuDownload className="h-4 w-4" />
						Unduh halaman ini
					</button>
				</div>

				{memuatTabel ? (
					<div className="flex items-center justify-center gap-2 py-16 text-slate-500">
						<LuLoader className="h-5 w-5 animate-spin" />
						<span className="text-sm">Memuat…</span>
					</div>
				) : baris.length === 0 ? (
					<div className="px-5 py-16 text-center">
						<LuFileText className="mx-auto h-8 w-8 text-slate-300" strokeWidth={1.5} />
						<p className="mt-3 text-[13px] font-semibold text-slate-700">Tidak ada data</p>
						<p className="mt-1 text-[12px] text-slate-500">Ubah penyaring di atas.</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-left text-[12.5px]">
							<thead>
								<tr className="border-b border-slate-100 bg-slate-50/70 text-[10.5px] uppercase tracking-wider text-slate-500">
									<th className="px-4 py-2.5 font-semibold">No</th>
									<th className="px-4 py-2.5 font-semibold">Kecamatan</th>
									<th className="px-4 py-2.5 font-semibold">Desa</th>
									<th className="px-4 py-2.5 font-semibold">Tahun</th>
									<th className="px-4 py-2.5 font-semibold">Jenis</th>
									<th className="px-4 py-2.5 font-semibold">Mitra</th>
									<th className="px-4 py-2.5 font-semibold">Bidang</th>
									<th className="px-4 py-2.5 font-semibold">Dokumen</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{baris.map((b, i) => (
									<tr key={b.id} className="transition-colors hover:bg-slate-50">
										<td className="px-4 py-2.5 tabular-nums text-slate-400">
											{((halamanMeta?.page || 1) - 1) * (halamanMeta?.per_page || 25) + i + 1}
										</td>
										<td className="px-4 py-2.5 text-slate-600">{b.desa?.kecamatan?.nama || '—'}</td>
										<td className="px-4 py-2.5 font-medium text-slate-900">{b.desa?.nama || '—'}</td>
										<td className="px-4 py-2.5 tabular-nums text-slate-600">{b.tahun}</td>
										<td className="px-4 py-2.5">
											<span className="rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
												{petaJenis.get(b.jenis)?.kode || b.jenis}
											</span>
										</td>
										<td className="px-4 py-2.5 text-slate-700">{b.mitra}</td>
										<td className="px-4 py-2.5 text-slate-600">
											{petaBidang.get(b.bidang)?.label || b.bidang}
											{b.sub_bidang && <span className="block text-[11px] text-slate-400">{b.sub_bidang}</span>}
										</td>
										<td className="px-4 py-2.5">
											<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
												{b.dokumen.map((d) =>
													d.file ? (
														<a
															key={d.field}
															href={urlDokumen(d.file)}
															target="_blank"
															rel="noreferrer"
															className="inline-flex items-center gap-1 text-[11.5px] font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900"
														>
															<LuFileText className="h-3 w-3" />
															{d.singkat}
														</a>
													) : (
														<span key={d.field} className="inline-flex items-center gap-1.5 text-[11.5px] text-slate-400">
															<span className="h-1.5 w-1.5 rounded-full border border-slate-300" />
															{d.singkat}
														</span>
													),
												)}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				{halamanMeta && halamanMeta.total_halaman > 1 && (
					<div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
						<p className="text-[12px] text-slate-500">
							Halaman <span className="font-semibold tabular-nums text-slate-900">{halamanMeta.page}</span> dari{' '}
							<span className="tabular-nums">{halamanMeta.total_halaman}</span>
						</p>
						<div className="flex gap-2">
							<button
								onClick={() => setHalaman((h) => Math.max(h - 1, 1))}
								disabled={halamanMeta.page <= 1}
								className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12.5px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
							>
								Sebelumnya
							</button>
							<button
								onClick={() => setHalaman((h) => Math.min(h + 1, halamanMeta.total_halaman))}
								disabled={halamanMeta.page >= halamanMeta.total_halaman}
								className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12.5px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
							>
								Berikutnya
							</button>
						</div>
					</div>
				)}
			</section>
		</div>
	);
};

export default KerjasamaMonitoringPage;
