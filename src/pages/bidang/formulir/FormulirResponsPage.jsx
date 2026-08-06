import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	ArrowLeft,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Download,
	FileSpreadsheet,
	FileText,
	Inbox,
	Loader2,
	Mail,
	Paperclip,
	Pencil,
	Search,
	Trash2,
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
import {
	LABEL_STATUS,
	formatUkuran,
	formatWaktu,
	jawabanKeTeks,
	labelTitikSkala,
	responsPerHari,
} from "./formulirUtils";
import { bolehDivergen } from "./responsWarna";
import { KartuAngka, PerbandinganSkala, Sebaran, SebaranSkala, TrenRespons } from "./ResponsGrafik";
import { eksporExcel, eksporPdf } from "./formulirEkspor";

const TAB = [
	{ kunci: "ringkasan", label: "Ringkasan" },
	{ kunci: "responden", label: "Per responden" },
	{ kunci: "tabel", label: "Tabel" },
];

const Kartu = ({ children, padat = false }) => (
	<div className={padat ? "rounded-xl border border-slate-200 bg-white p-4" : "rounded-xl border border-slate-200 bg-white p-5"}>
		{children}
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

/** Menu unduhan. Tiga bentuk berkas untuk tiga kebutuhan yang berbeda. */
const MenuEkspor = ({ mati, sedang, onExcel, onPdf, onCsv }) => {
	const [buka, setBuka] = useState(false);
	const acuan = useRef(null);

	useEffect(() => {
		if (!buka) return undefined;
		const tutup = (e) => {
			if (!acuan.current?.contains(e.target)) setBuka(false);
		};
		document.addEventListener("mousedown", tutup);
		return () => document.removeEventListener("mousedown", tutup);
	}, [buka]);

	const pilihan = [
		{
			kunci: "excel",
			ikon: FileSpreadsheet,
			label: "Excel (.xlsx)",
			keterangan: "Jawaban mentah + sebaran siap pivot",
			aksi: onExcel,
		},
		{
			kunci: "pdf",
			ikon: FileText,
			label: "PDF",
			keterangan: "Laporan bergrafik untuk dilampirkan",
			aksi: onPdf,
		},
		{
			kunci: "csv",
			ikon: Download,
			label: "CSV",
			keterangan: "Berkas polos untuk diolah aplikasi lain",
			aksi: onCsv,
		},
	];

	return (
		<div ref={acuan} className="relative">
			<button
				onClick={() => setBuka((b) => !b)}
				disabled={mati || Boolean(sedang)}
				className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:bg-slate-300"
			>
				{sedang ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
				{sedang ? "Menyiapkan…" : "Ekspor"}
				<ChevronDown className="h-3.5 w-3.5" />
			</button>

			{buka && (
				// z-[60]: bilah navigasi bawah pada layout pegawai duduk di z-50 dan
				// akan menelan kliknya kalau menu ini lebih rendah.
				<div className="absolute right-0 z-[60] mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
					{pilihan.map((p) => (
						<button
							key={p.kunci}
							onClick={() => {
								setBuka(false);
								p.aksi();
							}}
							className="flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-50"
						>
							<p.ikon className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
							<span className="min-w-0">
								<span className="block text-sm font-semibold text-slate-900">{p.label}</span>
								<span className="mt-0.5 block text-xs text-slate-500">{p.keterangan}</span>
							</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
};

const FormulirResponsPage = () => {
	const { id } = useParams();
	const navigate = useNavigate();

	const [tab, setTab] = useState("ringkasan");
	const [memuat, setMemuat] = useState(true);
	const [ringkasan, setRingkasan] = useState(null);
	const [isi, setIsi] = useState(null);
	const [indeks, setIndeks] = useState(0);
	const [cari, setCari] = useState("");
	const [sedangEkspor, setSedangEkspor] = useState(null);

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

	/** Pengaturan tiap pertanyaan, dicari dari id — ringkasan tidak membawanya. */
	const petaPengaturan = useMemo(
		() => new Map(pertanyaanDijawab.map((p) => [p.id, p.pengaturan || {}])),
		[pertanyaanDijawab]
	);

	const tren = useMemo(() => responsPerHari(isi?.respons || []), [isi]);

	/** Pertanyaan berskala yang bisa dibandingkan berdampingan. */
	const skalaDibandingkan = useMemo(
		() =>
			(ringkasan?.pertanyaan || []).filter(
				(p) => p.tipe === "skala_linier" && p.sebaran && bolehDivergen(p.sebaran.length)
			),
		[ringkasan]
	);

	/**
	 * Nama titik skala untuk grafik perbandingan.
	 *
	 * Legendanya cuma satu untuk semua baris, jadi ia hanya boleh memakai
	 * keterangan ujung kalau seluruh pertanyaan memakai keterangan yang sama;
	 * kalau berbeda, legenda itu akan salah untuk sebagian baris — lebih baik
	 * kembali ke angka polos.
	 */
	const labelSkalaBersama = useMemo(() => {
		if (skalaDibandingkan.length < 2) return undefined;
		const set = skalaDibandingkan.map((p) => petaPengaturan.get(p.id) || {});
		const sama = set.every(
			(s) => s.label_min === set[0].label_min && s.label_maks === set[0].label_maks
		);
		return sama ? labelTitikSkala(set[0], skalaDibandingkan[0].sebaran) : undefined;
	}, [skalaDibandingkan, petaPengaturan]);

	const rataKeseluruhan = useMemo(() => {
		const nilai = (ringkasan?.pertanyaan || [])
			.map((p) => p.rata_rata)
			.filter((n) => n !== null && n !== undefined);
		if (!nilai.length) return null;
		return Number((nilai.reduce((s, n) => s + n, 0) / nilai.length).toFixed(2));
	}, [ringkasan]);

	const responsTersaring = useMemo(() => {
		const kueri = cari.trim().toLowerCase();
		if (!kueri || !isi) return isi?.respons || [];
		return isi.respons.filter((r) => {
			const bahan = [
				r.nama_responden,
				r.email,
				formatWaktu(r.dikirim_pada),
				...pertanyaanDijawab.map((p) => jawabanKeTeks(r.jawaban?.[p.id])),
			];
			return bahan.join(" ").toLowerCase().includes(kueri);
		});
	}, [cari, isi, pertanyaanDijawab]);

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

	/** Pembungkus tiga jalur ekspor: satu penanda sibuk, satu tempat menangani gagal. */
	const jalankanEkspor = async (jenis, kerja) => {
		setSedangEkspor(jenis);
		try {
			await kerja();
		} catch (e) {
			console.error("Ekspor gagal:", e);
			toast.error(e.response?.data?.message || "Gagal menyiapkan berkas ekspor.");
		} finally {
			setSedangEkspor(null);
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
							<div className="mt-2 flex flex-wrap items-center gap-2">
								<span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
									{LABEL_STATUS[isi.formulir.status] || isi.formulir.status}
								</span>
								<span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
									{total} respons
								</span>
								<span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
									{pertanyaanDijawab.length} pertanyaan
								</span>
							</div>
						</div>

						<div className="flex flex-shrink-0 flex-wrap gap-2">
							<button
								onClick={() => navigate(`/formulir/${id}`)}
								className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
							>
								<Pencil className="h-4 w-4" />
								Sunting formulir
							</button>
							<MenuEkspor
								mati={!total}
								sedang={sedangEkspor}
								onExcel={() => jalankanEkspor("excel", () => eksporExcel(isi, ringkasan))}
								onPdf={() => jalankanEkspor("pdf", () => eksporPdf(isi, ringkasan))}
								onCsv={() => jalankanEkspor("csv", () => eksporRespons(id, isi.formulir.judul))}
							/>
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
						<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
							<KartuAngka label="Total respons" nilai={total} utama />
							<KartuAngka
								label="Responden dikenal"
								nilai={isi.respons.filter((r) => r.nama_responden).length}
								keterangan="mengisi nama atau login"
							/>
							{rataKeseluruhan != null ? (
								<KartuAngka
									label="Rata-rata skala"
									nilai={rataKeseluruhan}
									keterangan={`dari ${skalaDibandingkan.length || "semua"} pertanyaan berskala`}
								/>
							) : (
								<KartuAngka label="Pertanyaan" nilai={pertanyaanDijawab.length} keterangan="di formulir ini" />
							)}
							<KartuAngka
								label="Terakhir masuk"
								nilai={
									<span className="text-base font-semibold">
										{formatWaktu(isi.respons[0]?.dikirim_pada).replace(", ", " · ")}
									</span>
								}
							/>
						</div>

						{/* Kurva hanya digambar kalau ada lebih dari satu hari untuk
						    dibandingkan; satu titik bukan tren, itu cuma angka. */}
						{tren.length > 1 && (
							<Kartu>
								<TrenRespons data={tren} />
							</Kartu>
						)}

						{skalaDibandingkan.length > 1 && (
							<Kartu>
								<div className="mb-4">
									<p className="text-sm font-semibold text-slate-900">Perbandingan seluruh pertanyaan berskala</p>
									<p className="mt-0.5 text-xs text-slate-500">
										Merah ke kiri berarti condong tidak setuju, biru ke kanan berarti setuju.
									</p>
								</div>
								<PerbandinganSkala pertanyaan={skalaDibandingkan} labelSkala={labelSkalaBersama} />
							</Kartu>
						)}

						{ringkasan.pertanyaan.map((p) => (
							<Kartu key={p.id}>
								<p className="text-sm font-semibold text-slate-900">{p.label}</p>
								<p className="mt-0.5 text-xs text-slate-400">
									{p.jumlah_jawab} dari {total} responden menjawab
								</p>

								<div className="mt-4">
									{p.tipe === "skala_linier" && p.sebaran ? (
										<SebaranSkala
											sebaran={p.sebaran}
											total={p.jumlah_jawab}
											rataRata={p.rata_rata}
											labelSkala={labelTitikSkala(petaPengaturan.get(p.id), p.sebaran)}
										/>
									) : p.sebaran ? (
										<Sebaran data={p.sebaran} total={p.jumlah_jawab} />
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
														+{p.jawaban.length - 20} jawaban lain — lihat tab Tabel atau unduh rekapnya.
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
							</Kartu>
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
							<div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
								{responsAktif.email && (
									<div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3 text-sm text-slate-600">
										<Mail className="h-4 w-4 text-slate-400" />
										{responsAktif.email}
									</div>
								)}

								{pertanyaanDijawab.map((p) => {
									const lampiran = responsAktif.berkas?.[p.id] || [];
									const nilai = responsAktif.jawaban?.[p.id];
									return (
										<div key={p.id} className="border-b border-slate-100 px-5 py-4 last:border-0">
											<p className="text-xs font-medium uppercase tracking-wide text-slate-400">{p.label}</p>
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
												<p className="mt-1 whitespace-pre-line text-[15px] leading-6 text-slate-900">
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
					<div className="space-y-3">
						<div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
							<div className="relative flex-1">
								<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
								<input
									value={cari}
									onChange={(e) => setCari(e.target.value)}
									placeholder="Cari nama, email, atau isi jawaban…"
									className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
								/>
							</div>
							<p className="flex-shrink-0 text-xs text-slate-500">
								{responsTersaring.length} dari {isi.respons.length} respons
							</p>
						</div>

						<div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
							{/* Tabelnya digulir di dalam kotaknya sendiri; formulir dengan 20
							    pertanyaan kalau tidak begini akan membuat seluruh halaman
							    bergeser ke samping. Kepala tabel ikut menempel supaya nama
							    kolom tidak hilang setelah baris kesepuluh. */}
							<div className="max-h-[70vh] overflow-auto">
								<table className="w-full min-w-[48rem] text-sm">
									<thead className="sticky top-0 z-10">
										<tr className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
											<th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 font-medium">Waktu</th>
											<th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 font-medium">Nama</th>
											{pertanyaanDijawab.map((p) => (
												<th key={p.id} className="min-w-[12rem] border-b border-slate-200 px-4 py-3 font-medium">
													{p.label}
												</th>
											))}
											<th className="w-12 border-b border-slate-200 px-4 py-3" />
										</tr>
									</thead>
									<tbody>
										{responsTersaring.map((r) => (
											<tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
												<td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-slate-500">
													{formatWaktu(r.dikirim_pada)}
												</td>
												<td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
													{r.nama_responden || <span className="font-normal text-slate-300">—</span>}
												</td>
												{pertanyaanDijawab.map((p) => {
													const lampiran = r.berkas?.[p.id] || [];
													const teks = lampiran.length
														? lampiran.map((b) => b.nama).join(", ")
														: jawabanKeTeks(r.jawaban?.[p.id]);
													return (
														<td key={p.id} className="px-4 py-3 align-top text-slate-600">
															{teks || <span className="text-slate-300">—</span>}
														</td>
													);
												})}
												<td className="px-4 py-3 align-top">
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

							{!responsTersaring.length && (
								<p className="px-4 py-10 text-center text-sm text-slate-400">
									Tidak ada respons yang cocok dengan pencarian.
								</p>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default FormulirResponsPage;
