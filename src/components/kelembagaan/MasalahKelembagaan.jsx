import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LuArrowRight, LuTriangleAlert, LuX } from "react-icons/lu";

/**
 * Dua panel dashboard kelembagaan desa, keduanya dari GET /desa/kelembagaan/masalah:
 * - PetaLembaga: satu kotak untuk satu lembaga aktif, diwarnai status verifikasinya
 * - VerifikasiDitolak, PeringatanNik, PeringatanBpjs: masing-masing satu kotak
 */

const KOTAK = {
	verified: "bg-emerald-500",
	unverified: "ring-1 ring-inset ring-slate-400",
	ditolak: "bg-brand-400",
	nonaktif: "bg-slate-700",
	belum: "border border-dashed border-slate-500",
};
const KATA = {
	verified: "terverifikasi",
	unverified: "menunggu verifikasi",
	ditolak: "ditolak",
	nonaktif: "nonaktif",
	belum: "belum dibentuk",
};

const pad = (n, len) => String(n ?? "").padStart(len, "0");

const bulanTahun = (yyyyMm) => {
	if (!yyyyMm) return "";
	const [y, m] = String(yyyyMm).split("-").map(Number);
	if (!y || !m) return yyyyMm;
	return new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
};

const tanggalPendek = (iso) =>
	iso ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "";

function Kotak({ status, nama, size = "h-3.5 w-3.5" }) {
	const s = status || "belum";
	return <span title={`${nama}, ${KATA[s]}`} className={`inline-block flex-shrink-0 rounded-[2px] ${size} ${KOTAK[s]}`} />;
}

/** Hitungan dari peta: hanya lembaga aktif (bukan nonaktif / belum dibentuk). */
function hitungPeta(peta) {
	const semua = [
		...(peta?.rw || []).flatMap((g) => [...(g.id ? [g.status] : []), ...g.rts.map((r) => r.status)]),
		...(peta?.posyandu || []).map((p) => p.status),
		...(peta?.tunggal || []).map((t) => t.status),
		...(peta?.lainnya || []).map((l) => l.status),
	].filter((s) => s && s !== "nonaktif");
	const n = (x) => semua.filter((s) => s === x).length;
	return { total: semua.length, verified: n("verified"), unverified: n("unverified"), ditolak: n("ditolak") };
}

function jumlahMasalah(masalah) {
	if (!masalah) return 0;
	return masalah.ditolak.length + masalah.nik.length + (masalah.bpjs?.items?.length || 0);
}

// ─────────────────────────────────────────────── Peta lembaga

export function PetaLembaga({ masalah, loading, error }) {
	const peta = masalah?.peta;
	const hitung = useMemo(() => hitungPeta(peta), [peta]);
	const todo = jumlahMasalah(masalah);
	const jumlahRtRw = (peta?.rw || []).reduce((s, g) => s + g.rts.length + (g.id ? 1 : 0), 0);

	return (
		<section className="flex flex-wrap gap-10 rounded-lg bg-slate-900 p-6 text-slate-50 sm:p-8">
			<div className="flex min-w-0 flex-[1_1_280px] flex-col justify-between gap-6">
				<div className="flex flex-col gap-3">
					<p className="text-sm text-slate-400">Verifikasi kabupaten</p>
					{loading ? (
						<div className="h-16 w-40 animate-pulse rounded bg-slate-800" />
					) : (
						<p className="font-medium leading-none tabular-nums">
							<span className="text-6xl">{hitung.verified}</span>
							<span className="text-3xl text-slate-500"> / {hitung.total}</span>
						</p>
					)}
					<p className="text-sm text-slate-300">lembaga sudah diverifikasi DPMD</p>
				</div>

				<dl className="grid grid-cols-3 gap-4 border-t border-slate-800 pt-5 tabular-nums">
					{[
						["verified", "Terverifikasi", hitung.verified],
						["unverified", "Menunggu", hitung.unverified],
						["ditolak", "Ditolak", hitung.ditolak],
					].map(([s, label, n]) => (
						<div key={s}>
							<dt className="flex items-center gap-2 text-xs text-slate-400">
								<span className={`inline-block h-2.5 w-2.5 rounded-[2px] ${KOTAK[s]}`} />
								{label}
							</dt>
							<dd className="mt-1 text-xl font-medium">{loading ? "–" : n}</dd>
						</div>
					))}
				</dl>

				{!loading && !error && (todo > 0 ? (
					<a
						href={masalah?.ditolak?.length ? "#verifikasi-ditolak" : "#peringatan"}
						className="flex min-h-12 items-center justify-between gap-3 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
					>
						<span>{todo} data perlu diperbaiki</span>
						<LuArrowRight className="h-[18px] w-[18px]" />
					</a>
				) : (
					<p className="text-sm text-slate-400">Tidak ada data yang perlu diperbaiki</p>
				))}
			</div>

			<div className="flex min-w-0 flex-[2_1_480px] flex-col gap-6">
				<p className="text-sm text-slate-400">Peta lembaga, satu kotak satu lembaga</p>

				{error ? (
					<p className="text-sm text-slate-400">Peta lembaga tidak dapat dimuat. Muat ulang halaman untuk mencoba lagi</p>
				) : loading ? (
					<div className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-3">
						{Array.from({ length: 8 }).map((_, i) => (
							<div key={i} className="h-10 animate-pulse rounded bg-slate-800" />
						))}
					</div>
				) : (
					<>
						{peta.rw.length > 0 && (
							<div className="flex flex-col gap-3">
								<p className="text-[13px] font-medium text-slate-200">
									RW dan RT <span className="font-normal text-slate-500 tabular-nums">{jumlahRtRw}</span>
								</p>
								<div className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-x-3 gap-y-4">
									{peta.rw.map((g) => {
										const rwNama = g.id ? `RW ${pad(g.nomor, 2)}` : "Tanpa RW";
										return (
											<div key={g.id || "tanpa-rw"} className="flex flex-col gap-2">
												<span className="font-mono text-[11px] text-slate-400">{rwNama}</span>
												<div className="flex flex-wrap gap-1">
													{g.id && <Kotak status={g.status} nama={rwNama} />}
													{g.rts.map((rt) => (
														<Kotak key={rt.id} status={rt.status} nama={`RT ${pad(rt.nomor, 3)} / ${rwNama}`} />
													))}
												</div>
											</div>
										);
									})}
								</div>
							</div>
						)}

						<div className="flex flex-wrap gap-x-10 gap-y-6 border-t border-slate-800 pt-5">
							{peta.posyandu.length > 0 && (
								<div className="flex flex-col gap-2">
									<p className="text-[13px] font-medium text-slate-200">
										Posyandu <span className="font-normal text-slate-500 tabular-nums">{peta.posyandu.length}</span>
									</p>
									<div className="flex flex-wrap gap-1">
										{peta.posyandu.map((p) => <Kotak key={p.id} status={p.status} nama={p.nama} />)}
									</div>
								</div>
							)}
							<div className="flex flex-col gap-2">
								<p className="text-[13px] font-medium text-slate-200">Lembaga tunggal</p>
								<div className="flex flex-wrap gap-4">
									{peta.tunggal.map((t) => (
										<span key={t.jenis} className="inline-flex items-center gap-2 text-xs text-slate-300">
											<Kotak status={t.status} nama={t.jenis} />
											{t.jenis}
										</span>
									))}
								</div>
							</div>
							{peta.lainnya.length > 0 && (
								<div className="flex flex-col gap-2">
									<p className="text-[13px] font-medium text-slate-200">
										Lainnya <span className="font-normal text-slate-500 tabular-nums">{peta.lainnya.length}</span>
									</p>
									<div className="flex flex-wrap gap-1">
										{peta.lainnya.map((l) => <Kotak key={l.id} status={l.status} nama={l.nama} />)}
									</div>
								</div>
							)}
						</div>
					</>
				)}
			</div>
		</section>
	);
}

// ─────────────────────────────────────────────── Perlu diperbaiki

/** NIK dengan bagian yang salah disorot, sesuai sebab dari utils/nikAnomali (backend). */
function NikSorot({ nik, sebab }) {
	const d = String(nik || "").replace(/\D/g, "");
	const salah = "rounded-[2px] bg-brand-50 px-0.5 text-brand-700";
	const ringan = "rounded-[2px] bg-amber-50 px-0.5 text-amber-800";
	if (!d) return <span className="text-slate-400">Kosong</span>;
	if (sebab === "digit_kurang") return <>{d}<mark className={salah}>{"·".repeat(16 - d.length)}</mark></>;
	if (sebab === "digit_lebih") return <>{d.slice(0, 16)}<mark className={salah}>{d.slice(16)}</mark></>;
	if (sebab === "nol_belakang") return <>{d.slice(0, 10)}<mark className={salah}>{d.slice(10)}</mark></>;
	if (sebab === "tgl_lahir" || sebab === "tgl_lahir_tertukar")
		return <>{d.slice(0, 6)}<mark className={ringan}>{d.slice(6, 12)}</mark>{d.slice(12)}</>;
	return d;
}

function keteranganNik(item) {
	const d = String(item.nik || "").replace(/\D/g, "");
	if (item.sebab === "kosong") return "NIK belum diisi";
	if (item.sebab === "digit_kurang" || item.sebab === "digit_lebih") return `NIK harus 16 digit, tercatat ${d.length}`;
	if (item.sebab === "nol_belakang") return "Biasanya NIK belum lengkap saat diinput";
	if ((item.sebab === "tgl_lahir" || item.sebab === "tgl_lahir_tertukar") && item.tanggal_lahir) {
		const hari = pad(Number(d.slice(6, 8)) % 40, 2); // perempuan: tanggal + 40
		const data = new Date(item.tanggal_lahir).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).replaceAll("/", "-");
		return `NIK: ${hari}-${d.slice(8, 10)}-${d.slice(10, 12)}, data: ${data}`;
	}
	return "";
}

const NIK_RINGAN = new Set(["tgl_lahir", "tgl_lahir_tertukar"]);

/** NIK versi BPJS dengan digit yang berbeda dari NIK di database disorot. */
function NikBeda({ nikDb, nikBpjs }) {
	const a = String(nikDb || "").replace(/\D/g, "");
	const b = String(nikBpjs || "").replace(/\D/g, "");
	return (
		<span className="font-mono tabular-nums">
			{[...b].map((ch, i) => (ch === a[i]
				? <span key={i}>{ch}</span>
				: <mark key={i} className="rounded-[2px] bg-brand-50 px-px text-brand-700">{ch}</mark>))}
		</span>
	);
}

function temuanBpjs(item, periode) {
	switch (item.temuan) {
		case "nik_dipakai_lain":
			return { judul: "NIK dipakai orang lain", ket: <>Terdaftar atas nama {item.nama_bpjs}</> };
		case "nik_berbeda":
			return { judul: "NIK berbeda", ket: <>Nama sama, NIK <NikBeda nikDb={item.nik} nikBpjs={item.nik_bpjs} /></> };
		case "belum_terdaftar":
			return { judul: "Belum terdaftar", ket: "NIK tidak ditemukan" };
		case "tidak_tercover":
			return {
				judul: `Tidak tercover ${bulanTahun(periode).split(" ")[0]}`,
				ket: item.blth_terakhir ? `Terakhir tercover ${bulanTahun(String(item.blth_terakhir).slice(0, 7))}` : "Belum pernah tercover",
			};
		default:
			return { judul: item.temuan, ket: "" };
	}
}

const Kosong = ({ children }) => <p className="px-6 py-10 text-center text-sm text-slate-500">{children}</p>;

const LinkAksi = ({ to, children = "Perbaiki" }) => (
	<Link to={to} className="text-[13px] font-medium text-slate-900 underline-offset-4 hover:underline">
		{children}
	</Link>
);


/** Kerangka kotak masalah: judul, keterangan, dan jumlah besar di kanan. */
function PanelMasalah({ id, judul, ket, jumlah, berat = true, onClose, children }) {
	const ada = typeof jumlah === "number" && jumlah > 0;
	return (
		<section id={id} className="flex min-w-0 scroll-mt-4 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
			<div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
				<div className="min-w-0">
					<h2 className="text-base font-semibold text-slate-900">{judul}</h2>
					<p className="mt-1 text-[13px] text-slate-500">{ket}</p>
				</div>
				<div className="flex items-start gap-4">
					<span
						className={`text-[28px] font-medium leading-none tabular-nums ${
							ada ? (berat ? "text-brand-700" : "text-amber-800") : "text-slate-300"
						}`}
					>
						{jumlah ?? "–"}
					</span>
					{onClose && (
						<button
							type="button"
							onClick={onClose}
							aria-label="Tutup"
							className="-mr-2 -mt-1 flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
						>
							<LuX className="h-5 w-5" />
						</button>
					)}
				</div>
			</div>
			<div className="flex-1">{children}</div>
		</section>
	);
}

const Memuat = () => <div className="h-48 animate-pulse rounded-lg border border-slate-200 bg-slate-50" />;

// Satu desa bisa punya puluhan temuan (Susukan: 62 peringatan NIK), jadi tiap
// kotak hanya menampilkan beberapa baris pertama sampai diminta semuanya.
const BATAS = 8;
const potong = (items, terbuka) => (terbuka ? items : items.slice(0, BATAS));

function TombolSemua({ total, terbuka, onToggle }) {
	if (total <= BATAS) return null;
	return (
		<button
			type="button"
			onClick={onToggle}
			aria-expanded={terbuka}
			className="flex min-h-11 w-full items-center justify-center border-t border-slate-100 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
		>
			{terbuka ? "Tampilkan lebih sedikit" : `Tampilkan ${total - BATAS} lainnya`}
		</button>
	);
}

// Urutan tampil peringatan NIK: cacat bentuk dulu, ketidakcocokan tanggal lahir belakangan.
const URUTAN_NIK = ["kosong", "digit_kurang", "digit_lebih", "nol_belakang", "tgl_lahir", "tgl_lahir_tertukar"];
const urutNik = (s) => (URUTAN_NIK.indexOf(s) + 1 || URUTAN_NIK.length + 1);

// ─────────────────────────────────────────────── Verifikasi ditolak (utama)

export function VerifikasiDitolak({ masalah, loading, error }) {
	const [terbuka, setTerbuka] = useState(false);
	if (error) return null;
	if (loading) return <Memuat />;
	const items = masalah.ditolak;
	// Tidak ada yang ditolak: kotaknya tidak perlu tampil sama sekali.
	if (items.length === 0) return null;

	return (
		<PanelMasalah
			id="verifikasi-ditolak"
			judul="Verifikasi ditolak"
			ket="Lembaga dan pengurus yang dikembalikan verifikator, perbaiki lalu ajukan ulang"
			jumlah={items.length}
		>
			{items.length === 0 ? (
				<Kosong>Tidak ada lembaga atau pengurus yang ditolak</Kosong>
			) : (
				<>
				<ul className="grid grid-cols-1 divide-y divide-slate-100 lg:grid-cols-2 lg:divide-y-0 lg:[&>li]:border-b lg:[&>li]:border-slate-100 lg:[&>li:nth-child(odd)]:border-r">
					{potong(items, terbuka).map((d) => (
						<li key={`${d.jenis}-${d.id}`} className="flex items-start gap-4 p-5 sm:px-6">
							<div className="flex min-w-0 flex-1 flex-col gap-2">
								<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
									<p className="font-medium text-slate-900">{d.nama}</p>
									<span className="text-[13px] text-slate-500">
										{d.jenis === "pengurus" ? `Pengurus, ${d.konteks}` : d.konteks}
									</span>
								</div>
								<blockquote className="border-l-2 border-brand-200 pl-3 text-sm leading-relaxed text-slate-700">
									{d.catatan || "Verifikator tidak menuliskan catatan"}
								</blockquote>
								{(d.verifikator || d.tanggal) && (
									<p className="text-xs text-slate-500">
										Ditolak{d.verifikator ? ` oleh ${d.verifikator}` : ""}
										{d.tanggal ? ` · ${tanggalPendek(d.tanggal)}` : ""}
									</p>
								)}
							</div>
							<Link
								to={d.link}
								className="inline-flex min-h-9 flex-shrink-0 items-center rounded-md border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-900 transition-colors hover:border-slate-400 hover:bg-slate-50"
							>
								Perbaiki
							</Link>
						</li>
					))}
				</ul>
				<TombolSemua total={items.length} terbuka={terbuka} onToggle={() => setTerbuka((x) => !x)} />
				</>
			)}
		</PanelMasalah>
	);
}

// ─────────────────────────────────────────────── Peringatan NIK

function PeringatanNik({ masalah, loading, error, onClose }) {
	const [sebab, setSebab] = useState(null);
	const [terbuka, setTerbuka] = useState(false);
	const semua = useMemo(
		() => [...(masalah?.nik || [])].sort((a, b) => urutNik(a.sebab) - urutNik(b.sebab)),
		[masalah],
	);
	// Satu chip per jenis masalah yang benar-benar ada, berurutan dari yang terberat.
	const jenis = useMemo(() => {
		const m = new Map();
		for (const n of semua) m.set(n.sebab, { sebab: n.sebab, label: n.label, jumlah: (m.get(n.sebab)?.jumlah || 0) + 1 });
		return [...m.values()];
	}, [semua]);
	if (error) return null;
	if (loading) return <Memuat />;
	const items = sebab ? semua.filter((n) => n.sebab === sebab) : semua;
	const semuaRingan = semua.length > 0 && semua.every((n) => NIK_RINGAN.has(n.sebab));
	const pilih = (s) => {
		setSebab(s);
		setTerbuka(false);
	};
	const chip = (aktif) =>
		`inline-flex min-h-8 items-center gap-2 rounded-md border px-2.5 text-[13px] transition-colors ${
			aktif ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
		}`;

	return (
		<PanelMasalah
			id="peringatan-nik"
			judul="Peringatan NIK pengurus"
			ket="Bentuk NIK tidak wajar, bagian yang bermasalah disorot"
			jumlah={semua.length}
			berat={!semuaRingan}
			onClose={onClose}
		>
			{semua.length === 0 ? (
				<Kosong>Semua NIK pengurus aktif berformat wajar</Kosong>
			) : (
				<>
				{jenis.length > 1 && (
					<div className="flex flex-wrap gap-2 px-6 pt-4" role="group" aria-label="Saring jenis masalah NIK">
						<button type="button" aria-pressed={!sebab} onClick={() => pilih(null)} className={chip(!sebab)}>
							Semua <span className="tabular-nums opacity-70">{semua.length}</span>
						</button>
						{jenis.map((j) => (
							<button key={j.sebab} type="button" aria-pressed={sebab === j.sebab} onClick={() => pilih(j.sebab)} className={chip(sebab === j.sebab)}>
								{j.label} <span className="tabular-nums opacity-70">{j.jumlah}</span>
							</button>
						))}
					</div>
				)}
				<div className="mt-2 overflow-x-auto">
					<table className="w-full min-w-[600px] text-sm">
						<thead>
							<tr className="text-left text-[13px] text-slate-500">
								<th className="px-6 py-3 font-medium">Pengurus</th>
								<th className="px-2 py-3 font-medium">NIK</th>
								<th className="px-2 py-3 font-medium">Masalah</th>
								<th className="w-20 px-6 py-3"><span className="sr-only">Aksi</span></th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 border-t border-slate-100">
							{potong(items, terbuka).map((n) => (
								<tr key={n.id}>
									<td className="px-6 py-4">
										<p className="font-medium text-slate-900">{n.nama}</p>
										<p className="mt-0.5 text-[13px] text-slate-500">{n.konteks}</p>
									</td>
									<td className="whitespace-nowrap px-2 py-4 font-mono tabular-nums text-slate-800">
										<NikSorot nik={n.nik} sebab={n.sebab} />
									</td>
									<td className="px-2 py-4">
										<p className={NIK_RINGAN.has(n.sebab) ? "text-amber-800" : "text-brand-700"}>{n.label}</p>
										<p className="mt-0.5 text-[13px] text-slate-500">{keteranganNik(n)}</p>
									</td>
									<td className="px-6 py-4 text-right"><LinkAksi to={n.link} /></td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<TombolSemua total={items.length} terbuka={terbuka} onToggle={() => setTerbuka((x) => !x)} />
				</>
			)}
		</PanelMasalah>
	);
}

// ─────────────────────────────────────────────── Data BPJS

/** Ringkasan cakupan BPJS satu kalimat, dipakai di tombol dan di kepala modal. */
function ringkasBpjs(bpjs) {
	const ketua = bpjs.jumlah_ketua || 0;
	if (ketua === 0) return "Belum ada Ketua RT/RW aktif";
	if (!bpjs.tersedia) return `${ketua} Ketua RT/RW, data BPJS belum dimuat`;
	return `${bpjs.items.length} dari ${ketua} Ketua RT/RW belum tercover`;
}

function PeringatanBpjs({ masalah, loading, error, onClose }) {
	const [terbuka, setTerbuka] = useState(false);
	if (error) return null;
	if (loading) return <Memuat />;
	const { tersedia, periode, items, jumlah_ketua: jumlahKetua = 0, ketua_tanpa_nik: tanpaNik = 0 } = masalah.bpjs;
	const adaBerat = items.some((b) => b.berat);

	return (
		<PanelMasalah
			id="peringatan-bpjs"
			judul="Data BPJS Ketenagakerjaan"
			ket={`${ringkasBpjs(masalah.bpjs)}. Hanya Ketua RT dan RW yang ditanggung BPJS${tersedia ? `, periode ${bulanTahun(periode)}` : ""}`}
			jumlah={tersedia ? items.length : null}
			berat={adaBerat}
			onClose={onClose}
		>
			{!tersedia ? (
				<Kosong>
					Data master BPJS Ketenagakerjaan belum dapat dimuat, jadi {jumlahKetua} Ketua RT/RW di desa ini belum bisa dicek.
					{tanpaNik > 0 && ` ${tanpaNik} di antaranya belum mengisi NIK.`} Coba lagi nanti
				</Kosong>
			) : items.length === 0 ? (
				<Kosong>Data Ketua RT/RW sesuai dengan data BPJS Ketenagakerjaan</Kosong>
			) : (
				<>
				<div className="overflow-x-auto">
					<table className="w-full min-w-[600px] text-sm">
						<thead>
							<tr className="text-left text-[13px] text-slate-500">
								<th className="px-6 py-3 font-medium">Ketua RT/RW</th>
								<th className="px-2 py-3 font-medium">Temuan</th>
								<th className="px-2 py-3 font-medium">Di data BPJS</th>
								<th className="w-20 px-6 py-3"><span className="sr-only">Aksi</span></th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 border-t border-slate-100">
							{potong(items, terbuka).map((b) => {
								const t = temuanBpjs(b, periode);
								return (
									<tr key={b.id}>
										<td className="px-6 py-4">
											<p className="font-medium text-slate-900">{b.nama}</p>
											<p className="mt-0.5 text-[13px] text-slate-500">{b.konteks}</p>
										</td>
										<td className={`px-2 py-4 ${b.berat ? "text-brand-700" : "text-amber-800"}`}>{t.judul}</td>
										<td className="px-2 py-4 text-[13px] text-slate-700">{t.ket}</td>
										<td className="px-6 py-4 text-right"><LinkAksi to={b.link}>Cek</LinkAksi></td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
				<TombolSemua total={items.length} terbuka={terbuka} onToggle={() => setTerbuka((x) => !x)} />
				</>
			)}
		</PanelMasalah>
	);
}

// ─────────────────────────────────────────────── Tombol peringatan + modal

/** Modal memakai <dialog> bawaan: fokus, Esc, dan lapisan belakang ditangani browser. */
function Modal({ open, onClose, label, children }) {
	const ref = useRef(null);
	useEffect(() => {
		const d = ref.current;
		if (!d) return;
		if (open && !d.open) d.showModal();
		if (!open && d.open) d.close();
	}, [open]);
	return (
		<dialog
			ref={ref}
			aria-label={label}
			onClose={onClose}
			// Klik di lapisan gelap (di luar panel) menutup modal.
			onClick={(e) => e.target === ref.current && onClose()}
			className="m-auto max-h-[calc(100dvh-2rem)] w-[min(1100px,calc(100vw-2rem))] overflow-y-auto rounded-lg bg-transparent p-0 backdrop:bg-slate-900/50"
		>
			{open && children}
		</dialog>
	);
}

function TombolSegitiga({ judul, ket, jumlah, berat, onClick }) {
	const ada = typeof jumlah === "number" && jumlah > 0;
	const warna = !ada ? "text-slate-400" : berat ? "text-brand-600" : "text-amber-600";
	return (
		<button
			type="button"
			onClick={onClick}
			aria-haspopup="dialog"
			className="flex min-w-0 flex-[1_1_320px] items-center gap-4 rounded-lg border border-slate-200 bg-white px-5 py-4 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
		>
			<LuTriangleAlert className={`h-6 w-6 flex-shrink-0 ${warna}`} />
			<span className="min-w-0 flex-1">
				<span className="block text-sm font-medium text-slate-900">{judul}</span>
				<span className="block truncate text-[13px] text-slate-500">{ket}</span>
			</span>
			<span className={`text-2xl font-medium tabular-nums ${ada ? (berat ? "text-brand-700" : "text-amber-800") : "text-slate-300"}`}>
				{jumlah ?? "–"}
			</span>
		</button>
	);
}

/**
 * Dua tombol ringkas untuk peringatan NIK dan data BPJS. Daftarnya dibuka di
 * modal supaya register lembaga tetap langsung terlihat di dashboard.
 */
export function TombolPeringatan({ masalah, loading, error }) {
	const [buka, setBuka] = useState(null); // 'nik' | 'bpjs' | null
	if (error) return null;
	if (loading) {
		return (
			<div className="flex flex-wrap gap-4">
				<div className="h-[74px] flex-[1_1_320px] animate-pulse rounded-lg border border-slate-200 bg-slate-50" />
				<div className="h-[74px] flex-[1_1_320px] animate-pulse rounded-lg border border-slate-200 bg-slate-50" />
			</div>
		);
	}
	const { nik, bpjs } = masalah;
	const nikRingan = nik.length > 0 && nik.every((n) => NIK_RINGAN.has(n.sebab));
	const tutup = () => setBuka(null);

	return (
		<>
			<div id="peringatan" className="flex scroll-mt-4 flex-wrap gap-4">
				<TombolSegitiga
					judul="Peringatan NIK pengurus"
					ket={nik.length ? "Bentuk NIK tidak wajar, buka untuk melihat daftarnya" : "Semua NIK pengurus aktif berformat wajar"}
					jumlah={nik.length}
					berat={!nikRingan}
					onClick={() => setBuka("nik")}
				/>
				<TombolSegitiga
					judul="Data BPJS Ketenagakerjaan"
					ket={ringkasBpjs(bpjs)}
					jumlah={bpjs.tersedia ? bpjs.items.length : null}
					berat={bpjs.items.some((b) => b.berat)}
					onClick={() => setBuka("bpjs")}
				/>
			</div>
			<Modal open={buka === "nik"} onClose={tutup} label="Peringatan NIK pengurus">
				<PeringatanNik masalah={masalah} onClose={tutup} />
			</Modal>
			<Modal open={buka === "bpjs"} onClose={tutup} label="Data BPJS Ketenagakerjaan">
				<PeringatanBpjs masalah={masalah} onClose={tutup} />
			</Modal>
		</>
	);
}
