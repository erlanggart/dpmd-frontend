// src/pages/bidang/sekretariat/prolap/OutputPemerintahanPage.jsx
// Prolap — output pemerintahan desa. Pemilik output: bidang Pemdes.
//
// Tiga output dibaca berdampingan karena menggambarkan kesiapan administrasi
// yang sama: aparatur desa, produk hukum desa, dan kelengkapan profil desa.
// Angka kelengkapan yang masih rendah ditampilkan apa adanya sebagai pekerjaan
// rumah — bukan disembunyikan karena jelek.
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Users, Scale, ClipboardCheck, Building2 } from 'lucide-react';
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

/** Grafik batang tegak untuk deret tahunan produk hukum. */
const BatangTahun = ({ rows, warna }) => {
	const max = Math.max(...rows.map((row) => row.jumlah), 1);
	if (!rows.length) return <p className="text-sm text-slate-400">Belum ada data.</p>;
	return (
		<div className="flex items-end gap-2 overflow-x-auto pb-1">
			{rows.map((row) => (
				<div key={row.tahun} className="flex min-w-[44px] flex-1 flex-col items-center gap-1.5">
					<span className="text-[11px] font-semibold tabular-nums text-slate-900">{fmt(row.jumlah)}</span>
					<div
						className="w-full rounded-t-[4px] transition-[height] duration-700"
						style={{ height: `${Math.max((row.jumlah / max) * 120, 3)}px`, backgroundColor: warna }}
					/>
					<span className="text-[11px] text-slate-500">{row.tahun}</span>
				</div>
			))}
		</div>
	);
};

const OutputPemerintahanPage = () => {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [cari, setCari] = useState('');
	const [batasTabel, setBatasTabel] = useState(50);

	const fetchData = useCallback(async () => {
		try {
			setLoading(true);
			const response = await api.get('/prolap/output-pemerintahan');
			setData(response.data?.data);
			setError(null);
		} catch (err) {
			console.error('Error fetching output pemerintahan desa:', err);
			setError(err.response?.data?.message || 'Gagal memuat rekap output pemerintahan desa');
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
			'output-pemerintahan-desa.csv',
			['Kecamatan', 'Desa', 'Aparatur', 'Aparatur Aktif', 'Input Desa', 'Produk Hukum', 'Kelengkapan Profil (%)'],
			desaTersaring.map((desa) => [
				desa.nama_kecamatan,
				desa.nama_desa,
				desa.aparatur,
				desa.aparatur_aktif,
				desa.aparatur_input_desa,
				desa.produk_hukum,
				desa.persen_profil,
			])
		);
	}, [desaTersaring]);

	if (loading && !data) return <MemuatLayar pesan="Menghitung pemerintahan desa…" />;

	const ringkasan = data?.ringkasan;
	const aparatur = data?.aparatur;
	const produkHukum = data?.produk_hukum;
	const profil = data?.profil_desa;
	const catatan = data?.catatan_data;

	return (
		<div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-7xl space-y-6">
				<ProlapHeader
					judul="Output Pemerintahan Desa"
					bidang="Pemdes"
					deskripsi="Aparatur desa, produk hukum desa, dan kelengkapan profil desa — tiga hal yang bersama-sama menunjukkan kesiapan administrasi tiap desa."
					generatedAt={data?.generated_at}
					loading={loading}
					onRefresh={fetchData}
				/>

				<PesanGalat pesan={error} />

				{ringkasan && (
					<>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
							<StatTile
								icon={Users}
								label="Aparatur Aktif"
								value={fmt(ringkasan.aparatur_aktif)}
								caption={`dari ${fmt(aparatur.total)} tercatat`}
								tone={PRIMARY}
							/>
							<StatTile
								icon={Scale}
								label="Produk Hukum Berlaku"
								value={fmt(ringkasan.produk_hukum_berlaku)}
								caption={`tersebar di ${fmt(produkHukum.desa_terjangkau)} desa (${persenTeks(produkHukum.persen_desa)})`}
								tone={SLOT_COLOR[2]}
							/>
							<StatTile
								icon={ClipboardCheck}
								label="Kelengkapan Profil"
								value={persenTeks(ringkasan.rata_kelengkapan_profil)}
								caption={`${fmt(profil.lengkap_penuh)} desa lengkap, ${fmt(profil.kosong_sama_sekali)} kosong`}
								tone={SLOT_COLOR[3]}
							/>
							<StatTile
								icon={Building2}
								label="Desa"
								value={fmt(ringkasan.desa_sistem)}
								caption="pembagi seluruh persentase di halaman ini"
								tone={SLOT_COLOR[5]}
							/>
						</div>

						{/* ---------- Aparatur ---------- */}
						<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
							<SectionCard
								title="Asal Data Aparatur"
								subtitle="Diinput desa sendiri atau hasil suntikan arsip Dapur Desa."
							>
								<BarSumber
									utama={aparatur.input_desa}
									sekunder={aparatur.dari_arsip}
									labelUtama="Input desa"
									labelSekunder="Arsip Dapur Desa"
									warnaUtama={PRIMARY}
								/>
								<p className="mt-3 text-xs leading-relaxed text-slate-500">
									Hanya <strong>{persenTeks(aparatur.persen_input_desa)}</strong> yang benar-benar diinput desa.
									Sisanya berasal dari arsip dan belum tentu sudah dikonfirmasi ulang.
								</p>
							</SectionCard>

							<SectionCard
								title="Jaminan Sosial & Dasar Hukum"
								subtitle="Bagian dari seluruh aparatur tercatat."
								className="lg:col-span-2"
							>
								<BarList
									rows={[
										{ key: 'bpjs_kes', label: 'BPJS Kesehatan', value: aparatur.persen_bpjs_kesehatan, jumlah: aparatur.bpjs_kesehatan },
										{ key: 'bpjs_tk', label: 'BPJS Ketenagakerjaan', value: aparatur.persen_bpjs_ketenagakerjaan, jumlah: aparatur.bpjs_ketenagakerjaan },
										{ key: 'sk', label: 'SK pengangkatan terlampir', value: aparatur.persen_ber_sk, jumlah: aparatur.ber_sk },
									]}
									valueFormatter={(nilai) => persenTeks(nilai)}
									captionFor={(row) => `${fmt(row.jumlah)} dari ${fmt(aparatur.total)} aparatur`}
									warna={SLOT_COLOR[4]}
								/>
							</SectionCard>
						</div>

						<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
							<SectionCard title="Kelengkapan Berkas Aparatur" subtitle="Berkas yang sudah diunggah, per jenis.">
								<BarList
									rows={aparatur.berkas.map((berkas) => ({
										key: berkas.key,
										label: berkas.label,
										value: berkas.persen,
										jumlah: berkas.jumlah,
									}))}
									valueFormatter={(nilai) => persenTeks(nilai)}
									captionFor={(row) => `${fmt(row.jumlah)} berkas`}
									warna={SLOT_COLOR[7]}
								/>
							</SectionCard>

							<SectionCard title="Jabatan Terbanyak" subtitle="Aparatur berstatus aktif.">
								<BarList
									rows={aparatur.per_jabatan.slice(0, 8).map((jabatan) => ({
										key: jabatan.jabatan,
										label: jabatan.jabatan,
										value: jabatan.jumlah,
									}))}
									valueFormatter={(nilai) => fmt(nilai)}
									warna={PRIMARY}
								/>
							</SectionCard>
						</div>

						{/* ---------- Produk hukum ---------- */}
						<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
							<SectionCard
								title="Produk Hukum Desa Ditetapkan per Tahun"
								subtitle="Menurut tahun penetapan dokumen."
								className="lg:col-span-2"
								aside={
									<span className="text-xs tabular-nums text-slate-400">
										{fmt(produkHukum.total)} dokumen · {fmt(produkHukum.berlaku)} berlaku
									</span>
								}
							>
								<BatangTahun rows={produkHukum.per_tahun} warna={SLOT_COLOR[2]} />
							</SectionCard>

							<SectionCard title="Jenis Dokumen" subtitle="Komposisi produk hukum desa.">
								<BarList
									rows={produkHukum.per_jenis.map((jenis) => ({
										key: jenis.jenis,
										label: jenis.jenis,
										value: jenis.jumlah,
									}))}
									valueFormatter={(nilai) => fmt(nilai)}
									warna={SLOT_COLOR[2]}
								/>
							</SectionCard>
						</div>

						{/* ---------- Profil desa ---------- */}
						<SectionCard
							title="Kelengkapan Profil Desa"
							subtitle={`Dihitung terhadap seluruh ${fmt(ringkasan.desa_sistem)} desa — desa tanpa baris profil dihitung sebagai belum terisi.`}
							aside={
								<span className="text-xs tabular-nums text-slate-400">
									rata-rata {persenTeks(profil.rata_kelengkapan)}
								</span>
							}
						>
							<BarList
								rows={profil.kolom.map((kolom) => ({
									key: kolom.key,
									label: kolom.label,
									value: kolom.persen,
									jumlah: kolom.jumlah,
								}))}
								valueFormatter={(nilai) => persenTeks(nilai)}
								captionFor={(row) => `${fmt(row.jumlah)} desa terisi`}
								warna={SLOT_COLOR[3]}
							/>
						</SectionCard>

						{/* ---------- Tabel per desa ---------- */}
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
											<th className="px-5 py-3 text-right font-semibold">Aparatur Aktif</th>
											<th className="px-5 py-3 text-right font-semibold">Input Desa</th>
											<th className="px-5 py-3 text-right font-semibold">Produk Hukum</th>
											<th className="px-5 py-3 text-right font-semibold">Profil</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-50">
										{desaTersaring.slice(0, batasTabel).map((desa) => (
											<tr key={desa.desa_id} className="transition-colors hover:bg-slate-50">
												<td className="px-5 py-3 font-medium text-slate-900">{desa.nama_desa}</td>
												<td className="px-5 py-3 text-slate-600">{desa.nama_kecamatan}</td>
												<td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-900">
													{fmt(desa.aparatur_aktif)}
												</td>
												<td className="px-5 py-3 text-right tabular-nums text-slate-600">
													{fmt(desa.aparatur_input_desa)}
												</td>
												<td className="px-5 py-3 text-right tabular-nums text-slate-600">
													{fmt(desa.produk_hukum)}
												</td>
												<td className="px-5 py-3 text-right tabular-nums text-slate-600">
													{desa.profil_terisi}/{desa.profil_total}
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

						<CatatanData
							butir={[
								<>
									<strong>{persenTeks(catatan.persen_aparatur_dari_arsip)}</strong> aparatur (
									{fmt(catatan.aparatur_dari_arsip)} orang) berasal dari arsip Dapur Desa, bukan input desa.
								</>,
								<>
									Kelengkapan berkas dan BPJS aparatur masih di angka satu digit sampai belasan persen. Angka ini
									ditampilkan apa adanya — bukan berarti aparaturnya tidak punya, melainkan belum diunggah ke
									sistem.
								</>,
								catatan.desa_tanpa_baris_profil > 0 && (
									<>
										<strong>{fmt(catatan.desa_tanpa_baris_profil)} desa</strong> belum punya baris profil sama
										sekali, dan dihitung sebagai belum terisi — bukan dikeluarkan dari pembagi.
									</>
								),
								<>
									Produk hukum baru tercatat di <strong>{fmt(produkHukum.desa_terjangkau)} desa</strong> (
									{persenTeks(produkHukum.persen_desa)}). Sebagian besar desa belum mengunggah dokumen apa pun.
								</>,
							]}
						/>
					</>
				)}
			</div>
		</div>
	);
};

export default OutputPemerintahanPage;
