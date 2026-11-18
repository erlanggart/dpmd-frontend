// Tab SOC — antrean insiden keamanan yang dikelompokkan otomatis oleh backend,
// lengkap dengan detail, linimasa, analisis AI Gema, tindakan, dan dokumentasi.

import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
	FiActivity,
	FiAlertTriangle,
	FiCheckCircle,
	FiCpu,
	FiCrosshair,
	FiDownload,
	FiEdit3,
	FiFileText,
	FiFlag,
	FiMessageSquare,
	FiRefreshCw,
	FiSlash,
	FiTrendingUp,
	FiUnlock,
} from "react-icons/fi";
import api from "../../../../api";
import {
	Card,
	Galat,
	Kosong,
	Memuat,
	PilihRentang,
	SeverityBadge,
	Stat,
	StatusBadge,
	Tombol,
	formatWaktu,
	pesanError,
	sejak,
	usePolling,
} from "../serverUi";

const POLL_MS = 15000;
const PER_HALAMAN = 30;

const STATUS_FILTER = [
	{ value: "terbuka", label: "Terbuka" },
	{ value: "selesai", label: "Selesai" },
	{ value: "positif_palsu", label: "Positif palsu" },
	{ value: "semua", label: "Semua" },
];

const SEVERITY_FILTER = [
	{ value: "", label: "Semua severity" },
	{ value: "critical", label: "Kritis" },
	{ value: "high", label: "Tinggi" },
	{ value: "medium", label: "Sedang" },
	{ value: "low", label: "Rendah" },
];

const STATUS_LABEL = { baru: "Baru", ditangani: "Ditangani", selesai: "Selesai", positif_palsu: "Positif palsu" };
const STATUS_TINGKAT = { baru: "kritis", ditangani: "waspada", selesai: "baik", positif_palsu: "netral" };
const TUTUP = ["selesai", "positif_palsu"];

const IKON_LOG = {
	dibuat: FiFlag,
	event: FiActivity,
	eskalasi: FiTrendingUp,
	tindakan: FiSlash,
	catatan: FiMessageSquare,
	status: FiCheckCircle,
	analisis: FiCpu,
	dokumentasi: FiFileText,
};

const kelasOleh = (oleh) => {
	const o = String(oleh || "").toLowerCase();
	if (o === "sistem") return "bg-slate-100 text-slate-700 ring-slate-200";
	if (o.includes("gema")) return "bg-violet-100 text-violet-700 ring-violet-200";
	return "bg-blue-100 text-blue-700 ring-blue-200";
};

const formatMenit = (m) => {
	if (m === null || m === undefined) return "-";
	const n = Math.round(m);
	if (n < 60) return `${n} mnt`;
	return `${Math.floor(n / 60)} jam ${n % 60} mnt`;
};

const BLOKIR = [
	{ menit: 60, label: "60 menit" },
	{ menit: 1440, label: "24 jam" },
	{ menit: null, label: "Permanen" },
];

const Detail = ({ id, aiTersedia, onBerubah }) => {
	const [data, setData] = useState(null);
	const [galat, setGalat] = useState("");
	const [sibuk, setSibuk] = useState(false);
	const [pesan, setPesan] = useState("");
	const [tutupStatus, setTutupStatus] = useState(null);
	const [catatanTutup, setCatatanTutup] = useState("");
	const [catatan, setCatatan] = useState("");
	const [draf, setDraf] = useState(null);
	const [menitBlokir, setMenitBlokir] = useState("60");

	// Ganti insiden: bersihkan isian lokal.
	useEffect(() => {
		setData(null);
		setGalat("");
		setPesan("");
		setTutupStatus(null);
		setCatatanTutup("");
		setCatatan("");
		setDraf(null);
	}, [id]);

	const muat = useCallback(async () => {
		try {
			const r = await api.get(`/superadmin/server/soc/insiden/${id}`);
			setData(r.data?.data || null);
			setGalat("");
		} catch (e) {
			setGalat(pesanError(e, "Gagal memuat detail insiden."));
		}
	}, [id]);

	usePolling(muat, POLL_MS, [id]);

	// Jalankan aksi: tampilkan galat, lalu muat ulang detail & daftar.
	const jalankan = async (fn) => {
		setSibuk(true);
		setPesan("");
		try {
			await fn();
			await muat();
			onBerubah();
		} catch (e) {
			setPesan(pesanError(e, "Aksi gagal."));
		} finally {
			setSibuk(false);
		}
	};

	const dasar = `/superadmin/server/soc/insiden/${id}`;

	const ubahStatus = (status) => {
		if (TUTUP.includes(status)) {
			setTutupStatus(status);
			return;
		}
		setTutupStatus(null);
		jalankan(() => api.patch(dasar, { status, catatan: "" }));
	};

	const simpanTutup = () =>
		jalankan(async () => {
			await api.patch(dasar, { status: tutupStatus, catatan: catatanTutup.trim() });
			setTutupStatus(null);
			setCatatanTutup("");
		});

	const blokir = (menit) => {
		const ip = data.insiden.ip_address;
		const lama = menit === null ? "permanen" : `${menit} menit`;
		if (!window.confirm(`Blokir IP ${ip} (${lama})?`)) return;
		jalankan(() => api.post(`${dasar}/tindakan`, { aksi: "blokir_ip", menit }));
	};

	const bukaBlokir = () => {
		if (!window.confirm(`Buka blokir IP ${data.insiden.ip_address}?`)) return;
		jalankan(() => api.post(`${dasar}/tindakan`, { aksi: "buka_blokir", menit: null }));
	};

	const analisisUlang = () => jalankan(() => api.post(`${dasar}/analisis`));

	const tambahCatatan = () =>
		jalankan(async () => {
			await api.post(`${dasar}/catatan`, { isi: catatan.trim() });
			setCatatan("");
		});

	const ambilDokumentasi = async () => {
		const r = await api.get(`${dasar}/dokumentasi`);
		return r.data?.data || {};
	};

	const unduh = () =>
		jalankan(async () => {
			const { markdown } = await ambilDokumentasi();
			const url = URL.createObjectURL(new Blob([markdown || ""], { type: "text/markdown" }));
			const a = document.createElement("a");
			a.href = url;
			a.download = `${data.insiden.kode}.md`;
			a.click();
			URL.revokeObjectURL(url);
		});

	const lihatDraf = () =>
		jalankan(async () => {
			const d = await ambilDokumentasi();
			setDraf(d.markdown || "");
		});

	if (galat && !data) return <Galat pesan={galat} onRetry={muat} />;
	if (!data) return <Memuat teks="Memuat insiden…" />;

	const { insiden: i, log = [], event = [] } = data;
	const tertutup = TUTUP.includes(i.status);

	return (
		<div className="space-y-4">
			<Card
				title={
					<span className="flex flex-wrap items-center gap-2">
						<span className="font-mono text-[11px] text-slate-500">{i.kode}</span>
						<span>{i.judul}</span>
					</span>
				}
				icon={FiCrosshair}
				actions={
					<>
						<SeverityBadge severity={i.severity} />
						<StatusBadge tingkat={STATUS_TINGKAT[i.status] || "netral"} label={STATUS_LABEL[i.status] || i.status} />
					</>
				}
			>
				<dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-[12.5px] sm:grid-cols-2">
					<div><dt className="text-slate-500">Kategori</dt><dd className="font-semibold text-slate-800">{i.kategori}</dd></div>
					<div>
						<dt className="text-slate-500">IP</dt>
						<dd className="font-mono font-semibold text-slate-800">{i.ip_address || "-"}{i.negara ? ` (${i.negara})` : ""}</dd>
					</div>
					<div><dt className="text-slate-500">Akun</dt><dd className="font-semibold text-slate-800">{i.user_nama || (i.user_id ? `#${i.user_id}` : "-")}</dd></div>
					<div><dt className="text-slate-500">Jumlah event</dt><dd className="font-semibold text-slate-800">{i.jumlah_event}</dd></div>
					<div className="sm:col-span-2">
						<dt className="text-slate-500">Periode</dt>
						<dd className="font-semibold text-slate-800">{formatWaktu(i.pertama_at)} – {formatWaktu(i.terakhir_at)}</dd>
					</div>
					{i.catatan_tutup && (
						<div className="sm:col-span-2">
							<dt className="text-slate-500">Catatan penutup{i.ditutup_oleh ? ` (${i.ditutup_oleh})` : ""}</dt>
							<dd className="text-slate-800">{i.catatan_tutup}</dd>
						</div>
					)}
				</dl>

				<div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
					<label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
						Status
						<select
							value={tutupStatus || i.status}
							disabled={sibuk}
							onChange={(e) => ubahStatus(e.target.value)}
							className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
						>
							{Object.entries(STATUS_LABEL).map(([v, l]) => (
								<option key={v} value={v}>{l}</option>
							))}
						</select>
					</label>
					{i.ip_address && (
						<>
							<select
								aria-label="Lama blokir"
								value={menitBlokir}
								disabled={sibuk}
								onChange={(e) => setMenitBlokir(e.target.value)}
								className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
							>
								{BLOKIR.map((b) => (
									<option key={b.label} value={b.menit === null ? "" : String(b.menit)}>{b.label}</option>
								))}
							</select>
							<Tombol variant="dangerLight" icon={FiSlash} disabled={sibuk} onClick={() => blokir(menitBlokir === "" ? null : Number(menitBlokir))}>
								Blokir IP
							</Tombol>
							<Tombol icon={FiUnlock} disabled={sibuk} onClick={bukaBlokir}>Buka blokir</Tombol>
						</>
					)}
					<Tombol icon={FiRefreshCw} disabled={sibuk} onClick={analisisUlang}>Minta analisis ulang</Tombol>
					<Tombol icon={FiDownload} disabled={sibuk} onClick={unduh}>Unduh dokumentasi</Tombol>
				</div>

				{tutupStatus && (
					<div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
						<label className="block text-xs font-semibold text-slate-600" htmlFor="soc-catatan-tutup">
							Catatan penutup ({STATUS_LABEL[tutupStatus]}) — wajib, minimal 5 karakter
						</label>
						<textarea
							id="soc-catatan-tutup"
							value={catatanTutup}
							onChange={(e) => setCatatanTutup(e.target.value)}
							rows={2}
							maxLength={2000}
							className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
						/>
						<div className="mt-2 flex gap-2">
							<Tombol variant="dark" icon={FiCheckCircle} disabled={sibuk || catatanTutup.trim().length < 5} onClick={simpanTutup}>Simpan</Tombol>
							<Tombol variant="ghost" disabled={sibuk} onClick={() => setTutupStatus(null)}>Batal</Tombol>
						</div>
					</div>
				)}
				{pesan && <p className="mt-3 text-xs font-semibold text-red-700" role="alert">{pesan}</p>}
			</Card>

			<Card title="Analisis AI Gema" subtitle="Ditulis AI lokal — tinjau sebelum dijadikan dasar keputusan" icon={FiCpu}>
				{i.analisis_ai ? (
					<>
						<pre className="whitespace-pre-wrap break-words font-sans text-[12.5px] text-slate-800">{i.analisis_ai}</pre>
						<p className="mt-2 text-[11px] text-slate-500">Dianalisis {formatWaktu(i.analisis_ai_at)}</p>
					</>
				) : (
					<p className="text-xs text-slate-500">{aiTersedia ? "Menunggu giliran analisis AI…" : "AI tidak tersedia"}</p>
				)}
			</Card>

			<Card title="Linimasa" icon={FiActivity}>
				{log.length === 0 ? (
					<p className="text-xs text-slate-500">Belum ada catatan.</p>
				) : (
					<ol className="space-y-2.5">
						{log.map((l) => {
							const Ikon = IKON_LOG[l.jenis] || FiActivity;
							return (
								<li key={l.id} className="flex items-start gap-2.5 text-[12.5px]">
									<span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600" title={l.jenis}>
										<Ikon className="h-3 w-3" />
									</span>
									<div className="min-w-0">
										<div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
											<span>{formatWaktu(l.at)}</span>
											<span className={`rounded-md px-1.5 py-0.5 text-[10.5px] font-bold ring-1 ${kelasOleh(l.oleh)}`}>{l.oleh}</span>
										</div>
										<p className="whitespace-pre-wrap break-words text-slate-800">{l.isi}</p>
									</div>
								</li>
							);
						})}
					</ol>
				)}
				<div className="mt-3 border-t border-slate-200 pt-3">
					<textarea
						aria-label="Catatan baru"
						value={catatan}
						onChange={(e) => setCatatan(e.target.value)}
						rows={2}
						maxLength={2000}
						placeholder="Tulis catatan penanganan…"
						className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
					/>
					<div className="mt-2">
						<Tombol variant="dark" icon={FiEdit3} disabled={sibuk || catatan.trim().length < 1} onClick={tambahCatatan}>Tambah catatan</Tombol>
					</div>
				</div>
			</Card>

			<Card title="Bukti" subtitle={`${Math.min(event.length, 200)} dari ${i.jumlah_event} event`} icon={FiAlertTriangle} bodyClass="p-0">
				{event.length === 0 ? (
					<p className="p-4 text-xs text-slate-500">Tidak ada event.</p>
				) : (
					<div className="max-h-96 overflow-auto">
						<table className="w-full text-left text-[12px]">
							<thead className="sticky top-0 bg-slate-50 text-[10.5px] uppercase tracking-wider text-slate-500">
								<tr>
									<th className="px-3 py-2">Waktu</th>
									<th className="px-3 py-2">Tipe</th>
									<th className="px-3 py-2">Path / detail</th>
									<th className="px-3 py-2">Ditolak</th>
									<th className="px-3 py-2">Sumber</th>
								</tr>
							</thead>
							<tbody>
								{event.slice(0, 200).map((e) => {
									const teks = e.path || e.detail || "-";
									const penuh = [e.path, e.detail].filter(Boolean).join(" — ") || "-";
									return (
										<tr key={`${e.sumber}-${e.id}`} className="border-t border-slate-100 align-top">
											<td className="whitespace-nowrap px-3 py-1.5 text-slate-600">{formatWaktu(e.at, { second: "2-digit" })}</td>
											<td className="px-3 py-1.5">
												<span className="mr-1.5 text-slate-800">{e.label || e.tipe}</span>
												<SeverityBadge severity={e.severity} />
											</td>
											<td className="max-w-[16rem] px-3 py-1.5"><span className="block truncate font-mono text-slate-700" title={penuh}>{teks}</span></td>
											<td className="px-3 py-1.5 text-slate-700">{e.blocked ? "ditolak" : "-"}</td>
											<td className="px-3 py-1.5 text-slate-500">{e.sumber}</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</Card>

			<Card title="Dokumentasi" icon={FiFileText}>
				{tertutup ? (
					i.dokumentasi ? (
						<>
							<pre className="whitespace-pre-wrap break-words font-sans text-[12.5px] text-slate-800">{i.dokumentasi}</pre>
							<p className="mt-2 text-[11px] text-slate-500">Disusun {formatWaktu(i.dokumentasi_at)}</p>
						</>
					) : (
						<p className="text-xs text-slate-500">Dokumentasi sedang disusun AI Gema…</p>
					)
				) : (
					<>
						<Tombol icon={FiFileText} disabled={sibuk} onClick={lihatDraf}>Lihat draf dokumentasi</Tombol>
						{draf !== null && (
							<div className="mt-3">
								<span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10.5px] font-bold text-amber-800 ring-1 ring-amber-200">DRAF</span>
								<pre className="mt-2 whitespace-pre-wrap break-words font-sans text-[12.5px] text-slate-800">{draf}</pre>
							</div>
						)}
					</>
				)}
			</Card>
		</div>
	);
};

const SocTab = () => {
	const [params, setParams] = useSearchParams();
	const terpilih = params.get("insiden");
	const [status, setStatus] = useState("terbuka");
	const [severity, setSeverity] = useState("");
	const [qInput, setQInput] = useState("");
	const [q, setQ] = useState("");
	const [halaman, setHalaman] = useState(1);
	const [daftar, setDaftar] = useState(null);
	const [ringkasan, setRingkasan] = useState(null);
	const [galat, setGalat] = useState("");

	useEffect(() => {
		const t = setTimeout(() => {
			setQ(qInput.trim());
			setHalaman(1);
		}, 400);
		return () => clearTimeout(t);
	}, [qInput]);

	const muat = useCallback(async () => {
		try {
			const [d, r] = await Promise.all([
				api.get("/superadmin/server/soc/insiden", { params: { status, severity, q, halaman } }),
				api.get("/superadmin/server/soc/ringkasan"),
			]);
			setDaftar(d.data?.data || { items: [], total: 0 });
			setRingkasan(r.data?.data || null);
			setGalat("");
		} catch (e) {
			setGalat(pesanError(e, "Gagal memuat data SOC."));
		}
	}, [status, severity, q, halaman]);

	usePolling(muat, POLL_MS, [status, severity, q, halaman]);

	const pilih = useCallback(
		(id) => {
			const p = new URLSearchParams(params);
			p.set("insiden", String(id));
			setParams(p, { replace: true });
		},
		[params, setParams],
	);

	// Pilih insiden pertama otomatis bila belum ada yang dipilih.
	useEffect(() => {
		if (!terpilih && daftar?.items?.length) pilih(daftar.items[0].id);
	}, [terpilih, daftar, pilih]);

	const ubahFilter = (set) => (v) => {
		set(v);
		setHalaman(1);
	};

	if (galat && !daftar) return <Galat pesan={galat} onRetry={muat} />;
	if (!daftar) return <Memuat teks="Memuat data SOC…" />;

	const r = ringkasan;
	const ai = r?.ai;
	const items = daftar.items || [];
	const totalHalaman = Math.max(1, Math.ceil(daftar.total / PER_HALAMAN));

	return (
		<div className="space-y-4">
			{galat && <Galat pesan={galat} onRetry={muat} />}
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
				<Stat icon={FiCrosshair} tone="blue" label="Insiden terbuka" value={r?.terbuka ?? "-"} hint={r ? `baru ${r.baru} · ditangani ${r.ditangani}` : undefined} />
				<Stat icon={FiAlertTriangle} tone={r?.kritis_terbuka > 0 ? "red" : "slate"} label="Kritis terbuka" value={r?.kritis_terbuka ?? "-"} />
				<Stat icon={FiCheckCircle} tone="green" label="Selesai 30 hari" value={r?.selesai_30h ?? "-"} />
				<Stat icon={FiTrendingUp} tone="amber" label="Rata-rata penanganan" value={formatMenit(r?.mttr_menit)} />
				<Stat
					icon={FiCpu}
					tone="violet"
					label="AI Gema"
					value={ai ? (ai.tersedia ? (ai.sedang ? `Menganalisis ${ai.sedang}` : "Siaga") : "Tidak tersedia") : "-"}
					hint={ai ? `antrean ${ai.antrean}` : undefined}
				/>
			</div>

			<div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
				<div className="space-y-3">
					<div className="flex flex-wrap items-center gap-2">
						<PilihRentang value={status} onChange={ubahFilter(setStatus)} opsi={STATUS_FILTER} />
						<select
							aria-label="Filter severity"
							value={severity}
							onChange={(e) => ubahFilter(setSeverity)(e.target.value)}
							className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
						>
							{SEVERITY_FILTER.map((s) => (
								<option key={s.value} value={s.value}>{s.label}</option>
							))}
						</select>
					</div>
					<input
						type="search"
						aria-label="Cari insiden"
						value={qInput}
						onChange={(e) => setQInput(e.target.value)}
						placeholder="Cari kode, judul, IP, akun…"
						className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
					/>
					{items.length === 0 ? (
						<Kosong
							icon={FiCrosshair}
							title={status === "terbuka" ? "Tidak ada insiden terbuka" : "Tidak ada insiden"}
							text="Mesin SOC memantau event keamanan, login, dan perubahan akun superadmin setiap 30 detik."
						/>
					) : (
						<ul className="space-y-1.5">
							{items.map((it) => {
								const aktif = String(it.id) === terpilih;
								return (
									<li key={it.id}>
										<button
											type="button"
											aria-pressed={aktif}
											onClick={() => pilih(it.id)}
											className={`w-full rounded-xl border p-2.5 text-left transition ${
												aktif ? "border-blue-400 bg-blue-50 ring-1 ring-blue-300" : "border-slate-200 bg-white hover:bg-slate-50"
											}`}
										>
											<div className="flex items-center gap-2">
												<SeverityBadge severity={it.severity} />
												<span className="font-mono text-[10.5px] text-slate-500">{it.kode}</span>
												<span className="ml-auto flex items-center gap-1 text-slate-400">
													{it.ada_analisis && <FiCpu className="h-3 w-3" title="Ada analisis AI" aria-label="Ada analisis AI" />}
													{it.ada_dokumentasi && <FiFileText className="h-3 w-3" title="Ada dokumentasi" aria-label="Ada dokumentasi" />}
												</span>
											</div>
											<p className="mt-1 truncate text-[13px] font-semibold text-slate-800">{it.judul}</p>
											<p className="mt-0.5 truncate text-[11px] text-slate-500">
												{it.kategori} · {it.ip_address || it.user_nama || "-"} · {it.jumlah_event} event · {sejak(it.terakhir_at)} lalu
											</p>
										</button>
									</li>
								);
							})}
						</ul>
					)}
					{daftar.total > PER_HALAMAN && (
						<div className="flex items-center justify-between text-xs text-slate-600">
							<Tombol disabled={halaman <= 1} onClick={() => setHalaman((h) => h - 1)}>Sebelumnya</Tombol>
							<span>Halaman {halaman} / {totalHalaman}</span>
							<Tombol disabled={halaman >= totalHalaman} onClick={() => setHalaman((h) => h + 1)}>Berikutnya</Tombol>
						</div>
					)}
				</div>

				<div className="min-w-0">
					{terpilih ? (
						<Detail id={terpilih} aiTersedia={!!ai?.tersedia} onBerubah={muat} />
					) : (
						<Kosong icon={FiCrosshair} title="Pilih insiden" text="Pilih insiden di daftar untuk melihat detailnya." />
					)}
				</div>
			</div>
		</div>
	);
};

export default SocTab;
