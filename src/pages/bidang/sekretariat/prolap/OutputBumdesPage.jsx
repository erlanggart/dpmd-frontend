// src/pages/bidang/sekretariat/prolap/OutputBumdesPage.jsx
// Prolap — output BUMDes. Pemilik output: bidang SPKED.
//
// Angka keuangan di basis data tersimpan sebagai kolom per tahun; backend sudah
// membalikkannya jadi deret waktu. Dua hal ditampilkan terang-terangan: berapa
// BUMDes yang benar-benar mengisi tiap angka, dan nilai mana yang dikecualikan
// karena besarnya tidak masuk akal.
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Store, BadgeCheck, Users, MapPin } from 'lucide-react';
import api from '../../../../api';
import {
	StatTile,
	BarList,
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
	rupiahRingkas,
	rupiahPenuh,
	unduhCsv,
} from '../../../../components/prolap/prolapFormat';

/**
 * Satu deret keuangan sebagai batang per tahun. Jumlah pengisi ditulis di bawah
 * tiap batang — tanpa itu, kenaikan nilai bisa terbaca sebagai pertumbuhan
 * padahal hanya bertambahnya BUMDes yang mengisi.
 */
const DeretTahun = ({ deret, warna }) => {
	const max = Math.max(...deret.per_tahun.map((tahun) => tahun.nilai), 1);
	return (
		<div className="rounded-xl border border-slate-100 p-4">
			<div className="flex items-baseline justify-between gap-2">
				<span className="flex min-w-0 items-center gap-2">
					<span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: warna }} />
					<span className="truncate text-sm font-bold text-slate-900">{deret.label}</span>
				</span>
				<span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">
					{rupiahRingkas(deret.tahun_terakhir?.nilai)}
					<span className="ml-1 text-xs font-normal text-slate-400">{deret.tahun_terakhir?.tahun}</span>
				</span>
			</div>
			<div className="mt-4 flex items-end gap-2">
				{deret.per_tahun.map((tahun) => (
					<div key={tahun.tahun} className="flex min-w-0 flex-1 flex-col items-center gap-1.5" title={rupiahPenuh(tahun.nilai)}>
						<span className="text-[10px] font-semibold tabular-nums text-slate-700">
							{tahun.nilai > 0 ? rupiahRingkas(tahun.nilai).replace('Rp ', '') : '–'}
						</span>
						<div
							className="w-full rounded-t-[4px] transition-[height] duration-700"
							style={{ height: `${Math.max((tahun.nilai / max) * 96, 3)}px`, backgroundColor: warna }}
						/>
						<span className="text-[10px] text-slate-500">{tahun.tahun}</span>
						<span className="text-[10px] text-slate-400">{tahun.pengisi} isi</span>
					</div>
				))}
			</div>
		</div>
	);
};

const OutputBumdesPage = () => {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [cari, setCari] = useState('');
	const [batasTabel, setBatasTabel] = useState(50);

	const fetchData = useCallback(async () => {
		try {
			setLoading(true);
			const response = await api.get('/prolap/output-bumdes');
			setData(response.data?.data);
			setError(null);
		} catch (err) {
			console.error('Error fetching output bumdes:', err);
			setError(err.response?.data?.message || 'Gagal memuat rekap output BUMDes');
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

	const daftar = useMemo(() => data?.daftar || [], [data]);
	const daftarTersaring = useMemo(() => {
		const kata = cari.trim().toLowerCase();
		if (!kata) return daftar;
		return daftar.filter((item) =>
			[item.nama, item.nama_desa, item.nama_kecamatan, item.jenis_usaha]
				.filter(Boolean)
				.some((teks) => String(teks).toLowerCase().includes(kata))
		);
	}, [daftar, cari]);

	const exportCsv = useCallback(() => {
		unduhCsv(
			'output-bumdes.csv',
			['Kecamatan', 'Desa', 'Nama BUMDes', 'Status', 'Badan Hukum', 'Tahun Pendirian', 'Jenis Usaha', 'Tenaga Kerja', 'Aset', 'Omset 2024', 'Laba 2024', 'Kontribusi PADes 2024'],
			daftarTersaring.map((item) => [
				item.nama_kecamatan,
				item.nama_desa,
				item.nama,
				item.status,
				item.badan_hukum ? 'Ya' : 'Belum',
				item.tahun_pendirian,
				item.jenis_usaha,
				item.tenaga_kerja,
				Math.round(item.aset),
				Math.round(item.omset_terakhir),
				Math.round(item.laba_terakhir),
				Math.round(item.kontribusi_pades_terakhir),
			])
		);
	}, [daftarTersaring]);

	if (loading && !data) return <MemuatLayar pesan="Menghitung BUMDes…" />;

	const ringkasan = data?.ringkasan;
	const catatan = data?.catatan_data;

	return (
		<div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-7xl space-y-6">
				<ProlapHeader
					judul="Output BUMDes"
					bidang="SPKED"
					deskripsi="Badan usaha milik desa: berapa yang berbadan hukum dan aktif, berapa modal yang disertakan desa, dan berapa yang kembali sebagai pendapatan asli desa."
					generatedAt={data?.generated_at}
					loading={loading}
					onRefresh={fetchData}
				/>

				<PesanGalat pesan={error} />

				{ringkasan && (
					<>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
							<StatTile
								icon={Store}
								label="BUMDes Terdata"
								value={fmt(ringkasan.terdata)}
								caption={`${fmt(ringkasan.aktif)} aktif · ${fmt(ringkasan.tidak_aktif)} tidak aktif`}
								tone={PRIMARY}
							/>
							<StatTile
								icon={BadgeCheck}
								label="Berbadan Hukum"
								value={persenTeks(ringkasan.persen_badan_hukum)}
								caption={`${fmt(ringkasan.badan_hukum)} dari ${fmt(ringkasan.terdata)} BUMDes terdata`}
								tone={SLOT_COLOR[3]}
							/>
							<StatTile
								icon={Users}
								label="Tenaga Kerja"
								value={fmt(ringkasan.tenaga_kerja)}
								caption={`dilaporkan oleh ${fmt(ringkasan.pengisi_tenaga_kerja)} BUMDes`}
								tone={SLOT_COLOR[4]}
							/>
							<StatTile
								icon={MapPin}
								label="Desa Belum Terdata"
								value={fmt(ringkasan.desa_belum_terdata)}
								caption={`dari ${fmt(ringkasan.desa_sistem)} desa — belum tentu tidak punya BUMDes`}
								tone={SLOT_COLOR[2]}
							/>
						</div>

						{/* Deret keuangan */}
						<SectionCard
							title="Keuangan BUMDes per Tahun"
							subtitle="Angka di bawah tiap batang adalah jumlah BUMDes yang mengisinya — kenaikan nilai bisa berarti bertambahnya pengisi, bukan tumbuhnya usaha."
						>
							<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
								{data.deret.map((deret) => (
									<DeretTahun key={deret.key} deret={deret} warna={SLOT_COLOR[deret.slot] || SLOT_COLOR[8]} />
								))}
							</div>
						</SectionCard>

						<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
							<SectionCard
								title="Kelengkapan Legalitas & Dokumen"
								subtitle="Bagian dari BUMDes yang sudah terdata."
							>
								<BarList
									rows={data.kelengkapan.map((item) => ({
										key: item.key,
										label: item.label,
										value: item.persen,
										jumlah: item.jumlah,
									}))}
									valueFormatter={(nilai) => persenTeks(nilai)}
									captionFor={(row) => `${fmt(row.jumlah)} BUMDes`}
									warna={SLOT_COLOR[3]}
								/>
							</SectionCard>

							<SectionCard title="Jenis Usaha Utama" subtitle="Sebagaimana diisi BUMDes, teks bebas.">
								<BarList
									rows={data.jenis_usaha.slice(0, 8).map((item) => ({
										key: item.jenis,
										label: item.jenis,
										value: item.jumlah,
									}))}
									valueFormatter={(nilai) => `${fmt(nilai)} BUMDes`}
									warna={SLOT_COLOR[4]}
								/>
							</SectionCard>
						</div>

						<SectionCard title="Sebaran per Kecamatan" subtitle="Kecamatan dengan BUMDes terdata terbanyak.">
							<BarList
								rows={data.per_kecamatan.slice(0, 12).map((kecamatan) => ({
									key: kecamatan.nama,
									label: kecamatan.nama,
									value: kecamatan.total,
									aktif: kecamatan.aktif,
									badanHukum: kecamatan.badan_hukum,
								}))}
								valueFormatter={(nilai) => `${fmt(nilai)} BUMDes`}
								captionFor={(row) => `${fmt(row.aktif)} aktif · ${fmt(row.badanHukum)} berbadan hukum`}
								warna={PRIMARY}
							/>
						</SectionCard>

						{/* Tabel */}
						<div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
							<div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
								<div>
									<h3 className="text-sm font-bold text-slate-900">Daftar BUMDes</h3>
									<p className="mt-0.5 text-xs text-slate-500">
										{fmt(daftarTersaring.length)} ditampilkan, urut dari omset terbesar
										{cari.trim() ? ` (disaring dari ${fmt(daftar.length)})` : ''}
									</p>
								</div>
								<AlatTabel
									cari={cari}
									setCari={setCari}
									onExport={exportCsv}
									placeholder="Cari BUMDes / desa / usaha…"
								/>
							</div>
							<div className="overflow-x-auto">
								<table className="w-full min-w-[820px] text-sm">
									<thead>
										<tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-500">
											<th className="px-5 py-3 font-semibold">BUMDes</th>
											<th className="px-5 py-3 font-semibold">Desa</th>
											<th className="px-5 py-3 font-semibold">Kecamatan</th>
											<th className="px-5 py-3 text-right font-semibold">Omset 2024</th>
											<th className="px-5 py-3 text-right font-semibold">Laba 2024</th>
											<th className="px-5 py-3 text-right font-semibold">PADes 2024</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-50">
										{daftarTersaring.slice(0, batasTabel).map((item) => (
											<tr key={item.id} className="transition-colors hover:bg-slate-50">
												<td className="px-5 py-3">
													<span className="font-medium text-slate-900">{item.nama}</span>
													{!item.badan_hukum && (
														<span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
															belum badan hukum
														</span>
													)}
													{item.status !== 'aktif' && (
														<span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
															{item.status}
														</span>
													)}
												</td>
												<td className="px-5 py-3 text-slate-600">{item.nama_desa}</td>
												<td className="px-5 py-3 text-slate-600">{item.nama_kecamatan}</td>
												<td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-900">
													{item.omset_terakhir > 0 ? rupiahRingkas(item.omset_terakhir) : '–'}
												</td>
												<td className="px-5 py-3 text-right tabular-nums text-slate-600">
													{item.laba_terakhir > 0 ? rupiahRingkas(item.laba_terakhir) : '–'}
												</td>
												<td className="px-5 py-3 text-right tabular-nums text-slate-600">
													{item.kontribusi_pades_terakhir > 0 ? rupiahRingkas(item.kontribusi_pades_terakhir) : '–'}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
							{daftarTersaring.length > batasTabel && (
								<div className="border-t border-slate-100 p-4 text-center">
									<button
										onClick={() => setBatasTabel((batas) => batas + 100)}
										className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
									>
										Tampilkan {Math.min(100, daftarTersaring.length - batasTabel)} lagi
									</button>
								</div>
							)}
						</div>

						<CatatanData
							butir={[
								<>
									<strong>{fmt(ringkasan.desa_belum_terdata)} desa</strong> tidak punya baris BUMDes. Itu berarti{' '}
									<strong>belum terdata</strong>, bukan bukti desanya tidak punya BUMDes — dua hal yang tidak bisa
									dibedakan dari data sekarang.
								</>,
								catatan?.nilai_janggal?.length > 0 && (
									<>
										<strong>{fmt(catatan.nilai_janggal.length)} nilai dikecualikan</strong> dari penjumlahan karena
										besarnya tidak masuk akal (lebih dari 100× nilai tengah), hampir pasti salah ketik:{' '}
										{catatan.nilai_janggal
											.slice(0, 3)
											.map((item) => `${item.nama} — ${item.deret_label} ${item.tahun} ${rupiahPenuh(item.nilai)}`)
											.join('; ')}
										. Perlu diperbaiki di sumbernya.
									</>
								),
								<>
									Nilai aset Rp {fmt(Math.round(ringkasan.aset))} hanya dilaporkan{' '}
									<strong>{fmt(ringkasan.pengisi_aset)} BUMDes</strong>, dan tenaga kerja oleh{' '}
									<strong>{fmt(ringkasan.pengisi_tenaga_kerja)}</strong>. Sisanya mengosongkan kolomnya.
								</>,
								catatan?.tahun_tersedia?.length > 0 && (
									<>
										Rentang tahun yang tersedia mengikuti struktur tabel, bukan isinya:{' '}
										{catatan.tahun_tersedia.map((item) => `${item.label} ${item.dari}–${item.sampai}`).join('; ')}.
										Menambah tahun baru berarti menambah kolom di basis data.
									</>
								),
							]}
						/>
					</>
				)}
			</div>
		</div>
	);
};

export default OutputBumdesPage;
