// src/pages/bidang/sekretariat/prolap/OutputKelembagaanPage.jsx
// Prolap — output kelembagaan desa. Pemilik output: bidang PMD.
//
// Yang disebut output di sini adalah lembaga TERDATA & AKTIF, bukan
// "terverifikasi": proses verifikasi belum pernah dijalankan sama sekali, jadi
// memakainya sebagai ukuran hanya akan menghasilkan angka nol yang menyesatkan.
// Keadaan itu ditampilkan terang-terangan, bukan disembunyikan.
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Users2, Building2, FileCheck2, MapPin, AlertTriangle } from 'lucide-react';
import api from '../../../../api';
import {
	StatTile,
	BarList,
	BarSumber,
	SectionCard,
	ProlapHeader,
	CatatanData,
	PesanGalat,
	MemuatLayar,
	AlatTabel,
} from '../../../../components/prolap/ProlapUI';
import {
	SLOT_COLOR,
	PRIMARY,
	fmt,
	persenTeks,
	unduhCsv,
} from '../../../../components/prolap/prolapFormat';

const OutputKelembagaanPage = () => {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [cari, setCari] = useState('');
	const [batasTabel, setBatasTabel] = useState(50);

	const fetchData = useCallback(async () => {
		try {
			setLoading(true);
			const response = await api.get('/prolap/output-kelembagaan');
			setData(response.data?.data);
			setError(null);
		} catch (err) {
			console.error('Error fetching output kelembagaan:', err);
			setError(err.response?.data?.message || 'Gagal memuat rekap output kelembagaan');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	useEffect(() => {
		setBatasTabel(50);
	}, [cari]);

	const perDesa = useMemo(() => data?.per_desa || [], [data]);
	const desaTersaring = useMemo(() => {
		const kata = cari.trim().toLowerCase();
		if (!kata) return perDesa;
		return perDesa.filter((desa) =>
			[desa.nama_desa, desa.nama_kecamatan].filter(Boolean).some((teks) => String(teks).toLowerCase().includes(kata))
		);
	}, [perDesa, cari]);

	const exportCsv = useCallback(() => {
		unduhCsv(
			'output-kelembagaan-desa.csv',
			['Kecamatan', 'Desa', 'Lembaga', 'Aktif', 'Input Desa', 'Impor Massal', 'Ber-SK', 'Pengurus'],
			desaTersaring.map((desa) => [
				desa.nama_kecamatan,
				desa.nama_desa,
				desa.total,
				desa.aktif,
				desa.input_desa,
				desa.impor,
				desa.ber_sk,
				desa.pengurus,
			])
		);
	}, [desaTersaring]);

	if (loading && !data) return <MemuatLayar pesan="Menghitung kelembagaan desa…" />;

	const ringkasan = data?.ringkasan;
	const catatan = data?.catatan_data;
	const verifikasi = data?.verifikasi;

	return (
		<div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-7xl space-y-6">
				<ProlapHeader
					judul="Output Kelembagaan Desa"
					bidang="PMD"
					deskripsi="Posyandu, RT, RW, LPM, PKK, Karang Taruna, Satlinmas dan lembaga lainnya beserta pengurusnya — berapa yang terdata dan aktif, di desa mana, dan berapa yang sudah punya dasar hukum."
					generatedAt={data?.generated_at}
					loading={loading}
					onRefresh={fetchData}
				/>

				<PesanGalat pesan={error} />

				{ringkasan && (
					<>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
							<StatTile
								icon={Building2}
								label="Lembaga Aktif"
								value={fmt(ringkasan.aktif)}
								caption={`dari ${fmt(ringkasan.total)} terdata di ${fmt(ringkasan.jenis)} jenis lembaga`}
								tone={PRIMARY}
							/>
							<StatTile
								icon={Users2}
								label="Pengurus Terdata"
								value={fmt(ringkasan.pengurus)}
								caption={`${fmt(ringkasan.pengurus_aktif)} berstatus jabatan aktif`}
								tone={SLOT_COLOR[3]}
							/>
							<StatTile
								icon={FileCheck2}
								label="Lembaga Ber-SK"
								value={persenTeks(ringkasan.persen_ber_sk)}
								caption={`${fmt(ringkasan.ber_sk)} lembaga punya produk hukum terlampir`}
								tone={SLOT_COLOR[4]}
							/>
							<StatTile
								icon={MapPin}
								label="Desa Terjangkau"
								value={fmt(ringkasan.desa_terjangkau)}
								caption={`dari ${fmt(ringkasan.desa_sistem)} desa`}
								tone={SLOT_COLOR[5]}
							/>
						</div>

						{/* Keadaan verifikasi disebut lebih dulu supaya pembaca tidak
						    menyimpulkan sendiri bahwa angka nol berarti data gagal dibaca. */}
						{verifikasi && !verifikasi.pernah_dipakai && (
							<div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
								<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
								<div className="text-sm">
									<p className="font-semibold text-amber-900">Verifikasi kelembagaan belum pernah dijalankan</p>
									<p className="mt-0.5 text-amber-800">
										Tidak ada satu pun dari {fmt(ringkasan.total)} lembaga dan {fmt(ringkasan.pengurus)} pengurus
										yang berstatus terverifikasi ({fmt(verifikasi.ditolak)} ditolak,{' '}
										{fmt(verifikasi.unverified)} belum diperiksa). Karena itu yang dihitung sebagai output di
										halaman ini adalah lembaga <strong>terdata &amp; aktif</strong>, bukan terverifikasi.
									</p>
								</div>
							</div>
						)}

						{/* Per jenis lembaga */}
						<SectionCard
							title="Output per Jenis Lembaga"
							subtitle="Batang menunjukkan asal data: diinput desa sendiri atau hasil impor massal."
						>
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								{data.per_jenis.map((jenis) => {
									const warna = SLOT_COLOR[jenis.slot] || SLOT_COLOR[8];
									return (
										<div key={jenis.key} className="rounded-xl border border-slate-100 p-4">
											<div className="flex items-baseline justify-between gap-2">
												<span className="flex min-w-0 items-center gap-2">
													<span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: warna }} />
													<span className="truncate text-sm font-bold text-slate-900">{jenis.label}</span>
												</span>
												<span className="shrink-0 text-lg font-bold tabular-nums text-slate-900">
													{fmt(jenis.total)}
												</span>
											</div>
											<div className="mt-3">
												<BarSumber
													utama={jenis.input_desa}
													sekunder={jenis.impor}
													labelUtama="Input desa"
													labelSekunder="Impor massal"
													warnaUtama={warna}
												/>
											</div>
											<dl className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
												<div>
													<dt className="text-[11px] text-slate-500">Ber-SK</dt>
													<dd className="text-sm font-bold tabular-nums text-slate-900">
														{persenTeks(jenis.persen_ber_sk)}
													</dd>
												</div>
												<div>
													<dt className="text-[11px] text-slate-500">Pengurus</dt>
													<dd className="text-sm font-bold tabular-nums text-slate-900">{fmt(jenis.pengurus)}</dd>
												</div>
												<div>
													<dt className="text-[11px] text-slate-500">Cakupan desa</dt>
													<dd className="text-sm font-bold tabular-nums text-slate-900">
														{persenTeks(jenis.persen_desa)}
													</dd>
												</div>
											</dl>
										</div>
									);
								})}
							</div>
						</SectionCard>

						{/* Sebaran */}
						<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
							<SectionCard
								title="Kecamatan dengan Lembaga Terbanyak"
								subtitle="Jumlah lembaga terdata, bukan kepadatan penduduk."
							>
								<BarList
									rows={data.per_kecamatan.slice(0, 10).map((kecamatan) => ({
										key: kecamatan.nama,
										label: kecamatan.nama,
										value: kecamatan.total,
										desa: kecamatan.desa,
										berSk: kecamatan.ber_sk,
									}))}
									valueFormatter={(nilai) => fmt(nilai)}
									captionFor={(row) => `${fmt(row.desa)} desa · ${fmt(row.berSk)} ber-SK`}
								/>
							</SectionCard>

							<SectionCard
								title="Cakupan Desa per Jenis"
								subtitle={`Berapa persen dari ${fmt(ringkasan.desa_sistem)} desa yang sudah punya lembaga jenis ini.`}
							>
								<BarList
									rows={[...data.per_jenis]
										.sort((a, b) => a.persen_desa - b.persen_desa)
										.map((jenis) => ({
											key: jenis.key,
											label: jenis.label,
											value: jenis.persen_desa,
											desa: jenis.desa,
											slot: jenis.slot,
										}))}
									valueFormatter={(nilai) => persenTeks(nilai)}
									captionFor={(row) => `${fmt(row.desa)} desa`}
									colorFor={(row) => SLOT_COLOR[row.slot] || SLOT_COLOR[8]}
								/>
							</SectionCard>
						</div>

						{/* Tabel per desa */}
						<div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
							<div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
								<div>
									<h3 className="text-sm font-bold text-slate-900">Rincian per Desa</h3>
									<p className="mt-0.5 text-xs text-slate-500">
										{fmt(desaTersaring.length)} desa ditampilkan
										{cari.trim() ? ` (disaring dari ${fmt(perDesa.length)})` : ''}
									</p>
								</div>
								<AlatTabel cari={cari} setCari={setCari} onExport={exportCsv} />
							</div>
							<div className="overflow-x-auto">
								<table className="w-full min-w-[720px] text-sm">
									<thead>
										<tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-500">
											<th className="px-5 py-3 font-semibold">Desa</th>
											<th className="px-5 py-3 font-semibold">Kecamatan</th>
											<th className="px-5 py-3 text-right font-semibold">Lembaga</th>
											<th className="px-5 py-3 text-right font-semibold">Input Desa</th>
											<th className="px-5 py-3 text-right font-semibold">Ber-SK</th>
											<th className="px-5 py-3 text-right font-semibold">Pengurus</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-50">
										{desaTersaring.slice(0, batasTabel).map((desa) => (
											<tr key={desa.desa_id} className="transition-colors hover:bg-slate-50">
												<td className="px-5 py-3 font-medium text-slate-900">{desa.nama_desa}</td>
												<td className="px-5 py-3 text-slate-600">{desa.nama_kecamatan}</td>
												<td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-900">
													{fmt(desa.total)}
												</td>
												<td className="px-5 py-3 text-right tabular-nums text-slate-600">
													{fmt(desa.input_desa)}
													<span className="ml-1 text-xs text-slate-400">
														({persenTeks(desa.persen_input_desa)})
													</span>
												</td>
												<td className="px-5 py-3 text-right tabular-nums text-slate-600">{fmt(desa.ber_sk)}</td>
												<td className="px-5 py-3 text-right tabular-nums text-slate-600">{fmt(desa.pengurus)}</td>
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

						<CatatanData
							butir={[
								catatan?.impor_massal > 0 && (
									<>
										<strong>{persenTeks(catatan.persen_impor)}</strong> data ({fmt(catatan.impor_massal)} lembaga)
										berasal dari <strong>impor massal</strong>, bukan diinput desa. Angka "terdata" karena itu
										belum tentu mencerminkan pendataan aktif oleh desa.
									</>
								),
								catatan?.rt_total > 0 && (
									<>
										Jumlah jiwa dan KK per RT hanya terisi di{' '}
										<strong>
											{fmt(catatan.rt_dengan_jiwa)} dari {fmt(catatan.rt_total)} RT
										</strong>{' '}
										({persenTeks(catatan.persen_rt_dengan_jiwa)}), jadi <strong>tidak dijadikan output</strong> —
										total jiwa dari data ini akan jauh di bawah kenyataan.
									</>
								),
								verifikasi && !verifikasi.pernah_dipakai && (
									<>
										Kolom status verifikasi tersedia di basis data, tetapi belum pernah dipakai sama sekali. Bila
										verifikasi mulai dijalankan, halaman ini bisa menampilkannya tanpa perubahan.
									</>
								),
								<>
									<strong>{fmt(ringkasan.desa_sistem - ringkasan.desa_terjangkau)} desa</strong> belum punya satu
									pun lembaga terdata di sistem.
								</>,
							]}
						/>
					</>
				)}
			</div>
		</div>
	);
};

export default OutputKelembagaanPage;
