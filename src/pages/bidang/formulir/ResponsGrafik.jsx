import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BarChart3, Table2 } from "lucide-react";
import { SKALA_DIVERGEN, WARNA_BATANG, bolehDivergen, tintaDiAtas } from "./responsWarna";

/**
 * Grafik-grafik halaman respons.
 *
 * Semuanya digambar dengan div dan SVG biasa, tanpa pustaka bagan. Halaman ini
 * hanya butuh tiga bentuk, dan menariknya pustaka bagan ke dalam rute ini
 * berarti menambah ratusan kilobyte untuk satu kurva — sementara aturan tampilan
 * yang dipakai (batang tipis, garis bantu setipis rambut, label secukupnya)
 * justru lebih mudah dipatuhi kalau digambar sendiri.
 *
 * Tiap grafik punya kembaran tabel: warna dan panjang batang tidak pernah jadi
 * satu-satunya cara membaca angkanya.
 */

// ---------- Peralatan kecil ----------

/** Lebar wadah yang selalu mutakhir — dipakai grafik SVG supaya tidak terdistorsi. */
const useLebar = () => {
	const acuan = useRef(null);
	const [lebar, setLebar] = useState(0);

	useLayoutEffect(() => {
		const simpul = acuan.current;
		if (!simpul) return undefined;
		const pengamat = new ResizeObserver(([masuk]) => setLebar(masuk.contentRect.width));
		pengamat.observe(simpul);
		setLebar(simpul.getBoundingClientRect().width);
		return () => pengamat.disconnect();
	}, []);

	return [acuan, lebar];
};

/** Batas atas sumbu yang jatuh di angka bulat, bukan angka acak hasil data. */
const puncakBulat = (n) => {
	if (n <= 5) return Math.max(n, 1);
	const orde = 10 ** Math.floor(Math.log10(n));
	return Math.ceil(n / (orde / 2)) * (orde / 2);
};

const persenBulat = (bagian, total) => (total ? Math.round((bagian / total) * 100) : 0);

/** Sakelar grafik ↔ tabel. Tabelnya bukan pelengkap: di sanalah angka dijamin terbaca. */
const SakelarTampilan = ({ tabel, onUbah }) => (
	<div className="flex flex-shrink-0 rounded-lg border border-slate-200 p-0.5">
		<button
			onClick={() => onUbah(false)}
			className={
				tabel
					? "rounded-md p-1.5 text-slate-400 transition-colors hover:text-slate-700"
					: "rounded-md bg-slate-900 p-1.5 text-white"
			}
			aria-label="Tampilkan grafik"
			aria-pressed={!tabel}
		>
			<BarChart3 className="h-3.5 w-3.5" />
		</button>
		<button
			onClick={() => onUbah(true)}
			className={
				tabel
					? "rounded-md bg-slate-900 p-1.5 text-white"
					: "rounded-md p-1.5 text-slate-400 transition-colors hover:text-slate-700"
			}
			aria-label="Tampilkan tabel"
			aria-pressed={tabel}
		>
			<Table2 className="h-3.5 w-3.5" />
		</button>
	</div>
);

const TabelSebaran = ({ data, total, kepala = "Jawaban" }) => (
	<table className="w-full text-sm">
		<thead>
			<tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
				<th className="py-2 pr-3 font-medium">{kepala}</th>
				<th className="w-20 py-2 text-right font-medium">Jumlah</th>
				<th className="w-16 py-2 text-right font-medium">Persen</th>
			</tr>
		</thead>
		<tbody>
			{data.map((d) => (
				<tr key={d.label} className="border-b border-slate-100 last:border-0">
					<td className="py-2 pr-3 text-slate-700">{d.label}</td>
					<td className="py-2 text-right tabular-nums text-slate-900">{d.jumlah}</td>
					<td className="py-2 text-right tabular-nums text-slate-500">{persenBulat(d.jumlah, total)}%</td>
				</tr>
			))}
		</tbody>
	</table>
);

// ---------- Sebaran pilihan ----------

/**
 * Sebaran jawaban sebagai batang mendatar.
 *
 * Label opsi ditulis penuh di kiri: memutar teks di sumbu (yang terjadi pada
 * batang tegak) membuat opsi panjang tak terbaca. Angka dan persennya ditulis
 * langsung di tiap baris, jadi tidak ada nilai yang cuma bisa diraih lewat hover.
 */
export const Sebaran = ({ data, total }) => {
	const puncak = Math.max(...data.map((d) => d.jumlah), 1);

	return (
		<div className="space-y-2.5">
			{data.map((d) => (
				<div
					key={d.label}
					className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 sm:grid-cols-[11rem_minmax(0,1fr)_auto]"
				>
					<span className="truncate text-sm text-slate-700 sm:order-1" title={d.label}>
						{d.label}
						{d.lainnya && <span className="ml-1.5 text-xs text-slate-400">(lainnya)</span>}
					</span>
					<span className="order-3 text-right text-sm tabular-nums text-slate-500 sm:order-3">
						<span className="font-semibold text-slate-900">{d.jumlah}</span>
						<span className="ml-1.5 text-xs">{persenBulat(d.jumlah, total)}%</span>
					</span>
					{/* col-span-2 di layar sempit: batang pindah ke baris sendiri supaya
					    label opsi tidak terjepit jadi dua huruf. */}
					<div className="order-4 col-span-2 h-2.5 overflow-hidden rounded-full bg-slate-100 sm:order-2 sm:col-span-1">
						<div
							className="h-full rounded-full transition-all"
							style={{ width: `${(d.jumlah / puncak) * 100}%`, background: WARNA_BATANG }}
						/>
					</div>
				</div>
			))}
		</div>
	);
};

// ---------- Skala ----------

/**
 * Satu baris batang bertumpuk divergen: kutub "tidak setuju" merah di kiri,
 * "setuju" biru di kanan. Dipakai untuk satu pertanyaan maupun berderet untuk
 * seluruh pertanyaan berskala sekaligus.
 */
const BatangDivergen = ({ sebaran, total, onSorot, onLepas }) => (
	<div className="flex h-7 w-full overflow-hidden rounded-md bg-slate-100">
		{sebaran.map((d, i) => {
			const persen = total ? (d.jumlah / total) * 100 : 0;
			if (!persen) return null;
			const warna = SKALA_DIVERGEN[i];
			// Label hanya ditulis di dalam segmen yang benar-benar muat; yang sempit
			// dibiarkan polos supaya angkanya tidak terpotong separuh.
			const muat = persen >= 11;
			return (
				<div
					key={d.label}
					className="flex items-center justify-center text-[11px] font-semibold tabular-nums transition-opacity hover:opacity-90"
					style={{
						width: `${persen}%`,
						background: warna,
						color: tintaDiAtas(warna),
						// Jarak 2px berlatar kartu memisahkan segmen — bukan garis tepi,
						// yang hanya menambah tinta yang bukan data.
						boxShadow: i ? "inset 2px 0 0 #ffffff" : undefined,
					}}
					onMouseEnter={(e) =>
						onSorot?.({
							teks: `${d.label} · ${d.jumlah} jawaban · ${persenBulat(d.jumlah, total)}%`,
							x: e.currentTarget.getBoundingClientRect().left,
						})
					}
					onMouseLeave={onLepas}
				>
					{muat && `${persenBulat(d.jumlah, total)}%`}
				</div>
			);
		})}
	</div>
);

const LegendaSkala = ({ label }) => (
	<div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
		{label.map((teks, i) => (
			<span key={teks} className="flex items-center gap-1.5 text-xs text-slate-600">
				<span
					className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
					style={{ background: SKALA_DIVERGEN[i] }}
					aria-hidden="true"
				/>
				{teks}
			</span>
		))}
	</div>
);

/**
 * Sebaran satu pertanyaan berskala. Empat titik digambar divergen; panjang lain
 * kembali ke batang satu warna — lihat alasannya di responsWarna.js.
 */
export const SebaranSkala = ({ sebaran, total, rataRata, labelSkala }) => {
	const [tabel, setTabel] = useState(false);
	const [sorot, setSorot] = useState(null);

	// Titik tertinggi diambil dari label terakhir, bukan dari banyaknya titik:
	// skala 0–10 punya 11 titik tapi nilai maksimumnya 10.
	const maksSkala = Number(sebaran[sebaran.length - 1]?.label) || sebaran.length;

	if (!bolehDivergen(sebaran.length)) {
		return (
			<div className="space-y-3">
				{rataRata != null && <RataRata nilai={rataRata} maks={maksSkala} />}
				<Sebaran data={sebaran} total={total} />
			</div>
		);
	}

	const teksLegenda = sebaran.map((d, i) => labelSkala?.[i] || d.label);

	return (
		<div className="space-y-3">
			<div className="flex items-start justify-between gap-3">
				{rataRata != null ? <RataRata nilai={rataRata} maks={maksSkala} /> : <span />}
				<SakelarTampilan tabel={tabel} onUbah={setTabel} />
			</div>

			{tabel ? (
				<TabelSebaran
					data={sebaran.map((d, i) => ({ ...d, label: teksLegenda[i] }))}
					total={total}
					kepala="Nilai"
				/>
			) : (
				<>
					<div className="relative">
						<BatangDivergen
							sebaran={sebaran}
							total={total}
							onSorot={(s) => setSorot(s.teks)}
							onLepas={() => setSorot(null)}
						/>
						{sorot && (
							<div className="pointer-events-none absolute -top-9 left-0 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg">
								{sorot}
							</div>
						)}
					</div>
					<LegendaSkala label={teksLegenda} />
				</>
			)}
		</div>
	);
};

/** Rata-rata sebagai angka + meteran; jarum yang bergerak lebih cepat dibaca daripada desimal. */
const RataRata = ({ nilai, maks }) => (
	<div className="flex items-center gap-2.5">
		<span className="text-2xl font-semibold leading-none text-slate-900">{nilai}</span>
		<div className="pb-0.5">
			<p className="text-xs text-slate-500">rata-rata dari {maks}</p>
			<div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
				<div
					className="h-full rounded-full"
					style={{ width: `${(nilai / maks) * 100}%`, background: WARNA_BATANG }}
				/>
			</div>
		</div>
	</div>
);

/**
 * Perbandingan seluruh pertanyaan berskala dalam satu tumpukan.
 *
 * Ini bagian yang paling dicari saat membaca SKM: pertanyaan mana yang paling
 * banyak dijawab "tidak setuju". Berderet dalam satu kartu, urutannya langsung
 * kelihatan tanpa harus menggulir 14 kartu terpisah.
 */
export const PerbandinganSkala = ({ pertanyaan, labelSkala }) => {
	const [tabel, setTabel] = useState(false);
	const [sorot, setSorot] = useState(null);
	const teksLegenda = pertanyaan[0].sebaran.map((d, i) => labelSkala?.[i] || d.label);

	return (
		<div className="space-y-4">
			<div className="flex items-start justify-between gap-3">
				<LegendaSkala label={teksLegenda} />
				<SakelarTampilan tabel={tabel} onUbah={setTabel} />
			</div>

			{tabel ? (
				<div className="overflow-x-auto">
					<table className="w-full min-w-[32rem] text-sm">
						<thead>
							<tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
								<th className="py-2 pr-3 font-medium">Pertanyaan</th>
								{teksLegenda.map((t) => (
									<th key={t} className="w-20 py-2 text-right font-medium">
										{t}
									</th>
								))}
								<th className="w-20 py-2 text-right font-medium">Rata-rata</th>
							</tr>
						</thead>
						<tbody>
							{pertanyaan.map((p) => (
								<tr key={p.id} className="border-b border-slate-100 last:border-0">
									<td className="py-2 pr-3 text-slate-700">{p.label}</td>
									{p.sebaran.map((d) => (
										<td key={d.label} className="py-2 text-right tabular-nums text-slate-900">
											{d.jumlah}
										</td>
									))}
									<td className="py-2 text-right tabular-nums font-semibold text-slate-900">
										{p.rata_rata ?? "—"}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<div className="relative space-y-3">
					{pertanyaan.map((p) => (
						<div key={p.id} className="grid gap-1.5 sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_auto] sm:items-center sm:gap-3">
							<span className="truncate text-sm text-slate-700" title={p.label}>
								{p.label}
							</span>
							<BatangDivergen
								sebaran={p.sebaran}
								total={p.jumlah_jawab}
								onSorot={(s) => setSorot(`${p.label} — ${s.teks}`)}
								onLepas={() => setSorot(null)}
							/>
							<span className="text-right text-sm font-semibold tabular-nums text-slate-900">
								{p.rata_rata ?? "—"}
							</span>
						</div>
					))}
					{sorot && (
						<div className="pointer-events-none sticky bottom-2 mx-auto w-fit rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
							{sorot}
						</div>
					)}
				</div>
			)}
		</div>
	);
};

// ---------- Tren waktu ----------

const TINGGI = 168;
const TEPI = { kiri: 34, kanan: 14, atas: 12, bawah: 24 };

export const TrenRespons = ({ data }) => {
	const [acuan, lebar] = useLebar();
	const [tabel, setTabel] = useState(false);
	const [aktif, setAktif] = useState(null);

	useEffect(() => setAktif(null), [data]);

	const puncak = puncakBulat(Math.max(...data.map((d) => d.jumlah), 1));
	const lebarPlot = Math.max(lebar - TEPI.kiri - TEPI.kanan, 10);
	const tinggiPlot = TINGGI - TEPI.atas - TEPI.bawah;

	const x = (i) => TEPI.kiri + (data.length === 1 ? lebarPlot / 2 : (i / (data.length - 1)) * lebarPlot);
	const y = (v) => TEPI.atas + (1 - v / puncak) * tinggiPlot;

	const titik = data.map((d, i) => `${x(i)},${y(d.jumlah)}`).join(" L ");
	const garis = `M ${titik}`;
	const area = `${garis} L ${x(data.length - 1)},${TEPI.atas + tinggiPlot} L ${x(0)},${TEPI.atas + tinggiPlot} Z`;
	const sumbuY = [0, puncak / 2, puncak].filter((v, i, a) => a.indexOf(v) === i && Number.isInteger(v));

	const dariPosisi = (klienX, kotak) => {
		const relatif = klienX - kotak.left - TEPI.kiri;
		const langkah = data.length > 1 ? lebarPlot / (data.length - 1) : lebarPlot;
		return Math.min(data.length - 1, Math.max(0, Math.round(relatif / langkah)));
	};

	const disorot = aktif != null ? data[aktif] : null;

	return (
		<div className="space-y-3">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-sm font-semibold text-slate-900">Respons masuk per hari</p>
					<p className="mt-0.5 text-xs text-slate-500">
						{data[0].label} – {data[data.length - 1].label} · puncak {Math.max(...data.map((d) => d.jumlah))} dalam sehari
					</p>
				</div>
				<SakelarTampilan tabel={tabel} onUbah={setTabel} />
			</div>

			{tabel ? (
				<div className="max-h-64 overflow-y-auto">
					<table className="w-full text-sm">
						<thead className="sticky top-0 bg-white">
							<tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
								<th className="py-2 font-medium">Tanggal</th>
								<th className="w-24 py-2 text-right font-medium">Respons</th>
							</tr>
						</thead>
						<tbody>
							{data.map((d) => (
								<tr key={d.kunci} className="border-b border-slate-100 last:border-0">
									<td className="py-2 text-slate-700">{d.label}</td>
									<td className="py-2 text-right tabular-nums text-slate-900">{d.jumlah}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<div ref={acuan} className="relative">
					{lebar > 0 && (
						<svg
							width={lebar}
							height={TINGGI}
							role="img"
							aria-label={`Grafik respons masuk per hari, ${data.length} hari, tertinggi ${Math.max(
								...data.map((d) => d.jumlah)
							)} respons`}
							tabIndex={0}
							className="touch-none focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
							onMouseMove={(e) => setAktif(dariPosisi(e.clientX, e.currentTarget.getBoundingClientRect()))}
							onMouseLeave={() => setAktif(null)}
							onKeyDown={(e) => {
								if (e.key === "ArrowRight") setAktif((i) => Math.min(data.length - 1, (i ?? -1) + 1));
								else if (e.key === "ArrowLeft") setAktif((i) => Math.max(0, (i ?? data.length) - 1));
								else if (e.key === "Escape") setAktif(null);
								else return;
								e.preventDefault();
							}}
						>
							{sumbuY.map((v) => (
								<g key={v}>
									<line
										x1={TEPI.kiri}
										x2={lebar - TEPI.kanan}
										y1={y(v)}
										y2={y(v)}
										stroke="#e2e8f0"
										strokeWidth="1"
									/>
									<text x={TEPI.kiri - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
										{v}
									</text>
								</g>
							))}

							<path d={area} fill={WARNA_BATANG} fillOpacity="0.08" />
							<path d={garis} fill="none" stroke={WARNA_BATANG} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

							{/* Label hanya di titik terakhir: nilai di setiap titik jadi kekacauan
							    dan tidak terbaca; sisanya lewat sumbu, sorot, dan tabel. */}
							<circle cx={x(data.length - 1)} cy={y(data[data.length - 1].jumlah)} r="4" fill={WARNA_BATANG} stroke="#ffffff" strokeWidth="2" />

							{[0, Math.floor((data.length - 1) / 2), data.length - 1]
								.filter((i, k, a) => a.indexOf(i) === k)
								.map((i) => (
									<text
										key={i}
										x={x(i)}
										y={TINGGI - 6}
										textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
										fontSize="11"
										fill="#94a3b8"
									>
										{data[i].label}
									</text>
								))}

							{disorot && (
								<g>
									<line
										x1={x(aktif)}
										x2={x(aktif)}
										y1={TEPI.atas}
										y2={TEPI.atas + tinggiPlot}
										stroke="#94a3b8"
										strokeWidth="1"
									/>
									<circle cx={x(aktif)} cy={y(disorot.jumlah)} r="4.5" fill={WARNA_BATANG} stroke="#ffffff" strokeWidth="2" />
								</g>
							)}
						</svg>
					)}

					{disorot && (
						<div
							className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg"
							style={{ left: Math.min(Math.max(x(aktif), 56), Math.max(lebar - 56, 56)) }}
						>
							{disorot.label} · {disorot.jumlah} respons
						</div>
					)}
				</div>
			)}
		</div>
	);
};

// ---------- Kartu angka ----------

export const KartuAngka = ({ label, nilai, keterangan, utama = false }) => (
	<div className="rounded-xl border border-slate-200 bg-white p-4">
		<p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
		{/* Angka besar memakai angka proporsional; tabular-nums hanya untuk kolom
		    yang harus lurus ke bawah, di sini justru bikin renggang. */}
		<p
			className={
				utama
					? "mt-1.5 text-4xl font-semibold leading-none tracking-tight text-slate-900"
					: "mt-1.5 text-2xl font-semibold leading-none tracking-tight text-slate-900"
			}
		>
			{nilai}
		</p>
		{keterangan && <p className="mt-1.5 text-xs text-slate-400">{keterangan}</p>}
	</div>
);
