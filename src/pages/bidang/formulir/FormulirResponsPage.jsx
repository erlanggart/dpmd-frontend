import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	ArrowLeft,
	ChevronLeft,
	ChevronRight,
	Download,
	FileSpreadsheet,
	Inbox,
	Loader2,
	Paperclip,
	Pencil,
	Trash2,
	Users,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import {
	eksporRespons,
	getRespons,
	getRingkasan,
	hapusRespons,
	unduhBerkasFormulir,
} from "../../../api/formulirApi";
import { formatUkuran, formatWaktu, jawabanKeTeks } from "./formulirUtils";

const TAB = [
	{ kunci: "ringkasan", label: "Ringkasan" },
	{ kunci: "responden", label: "Per responden" },
	{ kunci: "tabel", label: "Tabel" },
];

/**
 * Sebaran jawaban sebagai batang mendatar.
 *
 * Satu seri, satu warna — batangnya membandingkan besaran antar-opsi, bukan
 * membedakan identitas, jadi memberi tiap opsi warna sendiri justru menyiratkan
 * pengelompokan yang tidak ada. Label opsi ditulis penuh di kiri: memutar teks
 * di sumbu (yang terjadi pada batang tegak) membuat opsi panjang tak terbaca.
 */
const Sebaran = ({ data, total }) => {
	const puncak = Math.max(...data.map((d) => d.jumlah), 1);

	return (
		<div className="space-y-2.5">
			{data.map((d) => {
				const persen = total ? Math.round((d.jumlah / total) * 100) : 0;
				return (
					<div key={d.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[11rem_minmax(0,1fr)_auto]">
						<span className="truncate text-sm text-slate-700 sm:order-1" title={d.label}>
							{d.label}
							{d.lainnya && <span className="ml-1.5 text-xs text-slate-400">(lainnya)</span>}
						</span>
						<span className="order-3 text-right text-sm tabular-nums text-slate-500 sm:order-3">
							<span className="font-semibold text-slate-900">{d.jumlah}</span>
							<span className="ml-1.5 text-xs">{persen}%</span>
						</span>
						{/* col-span-2 di layar sempit: batang pindah ke baris sendiri supaya
						    label opsi tidak terjepit jadi dua huruf. */}
						<div className="order-4 col-span-2 h-2 overflow-hidden rounded-full bg-slate-100 sm:order-2 sm:col-span-1">
							<div
								className="h-full rounded-full bg-slate-900 transition-all"
								style={{ width: `${(d.jumlah / puncak) * 100}%` }}
							/>
						</div>
					</div>
				);
			})}
		</div>
	);
};

const KartuAngka = ({ label, nilai, keterangan }) => (
	<div className="rounded-xl border border-slate-200 bg-white p-4">
		<p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
		<p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{nilai}</p>
		{keterangan && <p className="mt-0.5 text-xs text-slate-400">{keterangan}</p>}
	</div>
);

const KosongRespons = () => (
	<div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
		<div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100">
			<Inbox className="h-6 w-6 text-slate-400" />
		</div>
		<p className="text-sm font-semibold text-slate-900">Belum ada respons</p>
		<p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
			Bagikan tautan formulir supaya jawaban mulai masuk ke sini.
		</p>
	</div>
);

const FormulirResponsPage = () => {
	const { id } = useParams();
	const navigate = useNavigate();

	const [tab, setTab] = useState("ringkasan");
	const [memuat, setMemuat] = useState(true);
	const [ringkasan, setRingkasan] = useState(null);
	const [isi, setIsi] = useState(null);
	const [indeks, setIndeks] = useState(0);

	const muat = useCallback(async () => {
		setMemuat(true);
		try {
			const [a, b] = await Promise.all([getRingkasan(id), getRespons(id)]);
			setRingkasan(a.data.data);
			setIsi(b.data.data);
			setIndeks(0);
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal memuat respons.");
		} finally {
			setMemuat(false);
		}
	}, [id]);

	useEffect(() => {
		muat();
	}, [muat]);

	const pertanyaanDijawab = useMemo(
		() => (isi?.pertanyaan || []).filter((p) => p.tipe !== "bagian"),
		[isi]
	);

	const aksiHapusRespons = async (respons) => {
		const konfirmasi = await Swal.fire({
			title: "Hapus respons ini?",
			text: `Jawaban ${respons.nama_responden || "responden ini"} akan dihapus permanen.`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Hapus",
			cancelButtonText: "Batal",
			confirmButtonColor: "#e11d48",
		});
		if (!konfirmasi.isConfirmed) return;

		try {
			await hapusRespons(respons.id);
			toast.success("Respons dihapus.");
			muat();
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal menghapus respons.");
		}
	};

	const aksiEkspor = async () => {
		try {
			await eksporRespons(id, isi?.formulir?.judul);
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal mengekspor.");
		}
	};

	const unduh = async (berkas) => {
		try {
			await unduhBerkasFormulir(berkas.id, berkas.nama);
		} catch {
			toast.error("Gagal mengunduh berkas.");
		}
	};

	if (memuat || !isi || !ringkasan) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50">
				<Loader2 className="h-6 w-6 animate-spin text-slate-900" />
			</div>
		);
	}

	const total = ringkasan.total_respons;
	const responsAktif = isi.respons[indeks];

	return (
		<div className="min-h-screen bg-slate-50">
			<div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
				{/* ---------- Kepala ---------- */}
				<div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
					<button
						onClick={() => navigate(-1)}
						className="mb-4 flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-900"
					>
						<ArrowLeft className="h-4 w-4" />
						Kembali
					</button>

					<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
						<div className="min-w-0">
							<h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
								{isi.formulir.judul}
							</h1>
							<p className="mt-1 text-sm text-slate-500">
								{total} respons masuk · {pertanyaanDijawab.length} pertanyaan
							</p>
						</div>

						<div className="flex flex-shrink-0 flex-wrap gap-2">
							<button
								onClick={() => navigate(`/formulir/${id}`)}
								className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
							>
								<Pencil className="h-4 w-4" />
								Sunting formulir
							</button>
							<button
								onClick={aksiEkspor}
								disabled={!total}
								className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:bg-slate-300"
							>
								<FileSpreadsheet className="h-4 w-4" />
								Ekspor CSV
							</button>
						</div>
					</div>

					<div className="mt-5 flex flex-wrap gap-1 border-t border-slate-100 pt-5">
						{TAB.map((t) => (
							<button
								key={t.kunci}
								onClick={() => setTab(t.kunci)}
								className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
									tab === t.kunci
										? "bg-slate-900 text-white"
										: "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
								}`}
							>
								{t.label}
							</button>
						))}
					</div>
				</div>

				{total === 0 ? (
					<KosongRespons />
				) : tab === "ringkasan" ? (
					/* ---------- Ringkasan ---------- */
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
							<KartuAngka label="Total respons" nilai={total} />
							<KartuAngka
								label="Responden dikenal"
								nilai={isi.respons.filter((r) => r.nama_responden).length}
								keterangan="mengisi nama atau login"
							/>
							<KartuAngka
								label="Terakhir masuk"
								nilai={
									<span className="text-base">
										{formatWaktu(isi.respons[0]?.dikirim_pada).replace(", ", " · ")}
									</span>
								}
							/>
						</div>

						{ringkasan.pertanyaan.map((p) => (
							<div key={p.id} className="rounded-xl border border-slate-200 bg-white p-5">
								<p className="text-sm font-semibold text-slate-900">{p.label}</p>
								<p className="mt-0.5 text-xs text-slate-400">
									{p.jumlah_jawab} dari {total} responden menjawab
								</p>

								<div className="mt-4">
									{p.sebaran ? (
										<>
											{p.rata_rata !== undefined && p.rata_rata !== null && (
												<p className="mb-3 text-sm text-slate-500">
													Rata-rata{" "}
													<span className="font-semibold tabular-nums text-slate-900">{p.rata_rata}</span>
												</p>
											)}
											<Sebaran data={p.sebaran} total={p.jumlah_jawab} />
										</>
									) : p.jawaban ? (
										p.jawaban.length ? (
											<div className="space-y-1.5">
												{p.jawaban.slice(0, 20).map((j, i) => (
													<p
														key={i}
														className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
													>
														{j}
													</p>
												))}
												{p.jawaban.length > 20 && (
													<p className="pt-1 text-xs text-slate-400">
														+{p.jawaban.length - 20} jawaban lain — lihat tab Tabel atau ekspor CSV.
													</p>
												)}
											</div>
										) : (
											<p className="text-sm text-slate-400">Belum ada jawaban.</p>
										)
									) : (
										<p className="text-sm text-slate-500">
											{p.jumlah_jawab} berkas terkumpul — buka tab "Per responden" untuk mengunduh.
										</p>
									)}
								</div>
							</div>
						))}
					</div>
				) : tab === "responden" ? (
					/* ---------- Per responden ---------- */
					<div className="space-y-3">
						<div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
							<button
								onClick={() => setIndeks((i) => Math.max(0, i - 1))}
								disabled={indeks === 0}
								className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 disabled:text-slate-300"
								aria-label="Respons sebelumnya"
							>
								<ChevronLeft className="h-4 w-4" />
							</button>
							<div className="min-w-0 text-center">
								<p className="truncate text-sm font-semibold text-slate-900">
									{responsAktif?.nama_responden || "Tanpa nama"}
								</p>
								<p className="text-xs text-slate-400">
									{indeks + 1} dari {isi.respons.length} · {formatWaktu(responsAktif?.dikirim_pada)}
								</p>
							</div>
							<button
								onClick={() => setIndeks((i) => Math.min(isi.respons.length - 1, i + 1))}
								disabled={indeks >= isi.respons.length - 1}
								className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 disabled:text-slate-300"
								aria-label="Respons berikutnya"
							>
								<ChevronRight className="h-4 w-4" />
							</button>
						</div>

						{responsAktif && (
							<div className="rounded-xl border border-slate-200 bg-white">
								{responsAktif.email && (
									<div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 text-sm text-slate-500">
										<Users className="h-4 w-4 text-slate-400" />
										{responsAktif.email}
									</div>
								)}

								{pertanyaanDijawab.map((p) => {
									const lampiran = responsAktif.berkas?.[p.id] || [];
									const nilai = responsAktif.jawaban?.[p.id];
									return (
										<div key={p.id} className="border-b border-slate-100 px-5 py-4 last:border-0">
											<p className="text-sm font-medium text-slate-900">{p.label}</p>
											{lampiran.length ? (
												<div className="mt-2 space-y-1.5">
													{lampiran.map((b) => (
														<button
															key={b.id}
															onClick={() => unduh(b)}
															className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left transition-colors hover:bg-slate-50"
														>
															<Paperclip className="h-4 w-4 flex-shrink-0 text-slate-400" />
															<span className="min-w-0 flex-1 truncate text-sm text-slate-700">{b.nama}</span>
															<span className="flex-shrink-0 text-xs text-slate-400">
																{formatUkuran(b.ukuran)}
															</span>
															<Download className="h-4 w-4 flex-shrink-0 text-slate-400" />
														</button>
													))}
												</div>
											) : jawabanKeTeks(nilai) ? (
												<p className="mt-1 whitespace-pre-line text-sm text-slate-600">
													{jawabanKeTeks(nilai)}
												</p>
											) : (
												<p className="mt-1 text-sm italic text-slate-300">Tidak dijawab</p>
											)}
										</div>
									);
								})}

								<div className="flex justify-end border-t border-slate-100 px-5 py-3">
									<button
										onClick={() => aksiHapusRespons(responsAktif)}
										className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
									>
										<Trash2 className="h-4 w-4" />
										Hapus respons
									</button>
								</div>
							</div>
						)}
					</div>
				) : (
					/* ---------- Tabel ---------- */
					<div className="rounded-xl border border-slate-200 bg-white">
						{/* Tabelnya digulir di dalam kotaknya sendiri; formulir dengan 20
						    pertanyaan kalau tidak begini akan membuat seluruh halaman
						    bergeser ke samping. */}
						<div className="overflow-x-auto">
							<table className="w-full min-w-[40rem] text-sm">
								<thead>
									<tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
										<th className="whitespace-nowrap px-4 py-2.5">Waktu</th>
										<th className="whitespace-nowrap px-4 py-2.5">Nama</th>
										{pertanyaanDijawab.map((p) => (
											<th key={p.id} className="min-w-[10rem] px-4 py-2.5">
												{p.label}
											</th>
										))}
										<th className="w-10 px-4 py-2.5" />
									</tr>
								</thead>
								<tbody>
									{isi.respons.map((r) => (
										<tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
											<td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500">
												{formatWaktu(r.dikirim_pada)}
											</td>
											<td className="whitespace-nowrap px-4 py-2.5 text-slate-700">
												{r.nama_responden || <span className="text-slate-300">—</span>}
											</td>
											{pertanyaanDijawab.map((p) => {
												const lampiran = r.berkas?.[p.id] || [];
												const teks = lampiran.length
													? lampiran.map((b) => b.nama).join(", ")
													: jawabanKeTeks(r.jawaban?.[p.id]);
												return (
													<td key={p.id} className="px-4 py-2.5 text-slate-600">
														{teks || <span className="text-slate-300">—</span>}
													</td>
												);
											})}
											<td className="px-4 py-2.5">
												<button
													onClick={() => aksiHapusRespons(r)}
													className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
													aria-label="Hapus respons"
												>
													<Trash2 className="h-4 w-4" />
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default FormulirResponsPage;
