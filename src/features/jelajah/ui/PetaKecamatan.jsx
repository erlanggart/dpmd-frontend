import { useEffect, useMemo, useState } from "react";
import { useGeoWilayah } from "../../../components/landingpage/petaWilayah";
import { GAME, POTENSI, potensiKecamatan } from "../potensiWilayah";
import { infoGame, semuaBintang } from "../rekorWilayah";
import { useKoleksi } from "../pancing";
import { KOMODITAS, USAHA } from "../usahaWilayah";
import {
	BONUS_KUNJUNGAN, KAS_MAKS_JAM, ambilKas, ambilSemuaKas, bangunKec, daftarPencapaian, kasTersedia, naikBumdes, pesananHariIni, ringkasBangun,
	saranBerikut, statusSemuaKebun, syaratNaik, teksPesanan, useBangun,
} from "../bangunWilayah";

/*
 * Peta "Bangun Kabupaten": 40 kecamatan Kabupaten Bogor (batas asli ASTA DESA)
 * diwarnai menurut jenis game potensinya. Diklik = kartu kecamatan (potensi, status
 * kebun, BUMDes, tombol main). Ada juga tab pesanan kabupaten harian dan pencapaian.
 */

const BATAS = { lngMin: 106.39, lngMax: 107.24, latMin: -6.8, latMax: -6.29 };
const L = 1000;
const T = Math.round((L * (BATAS.latMax - BATAS.latMin)) / (BATAS.lngMax - BATAS.lngMin));
const proyeksi = ([lng, lat]) => [((lng - BATAS.lngMin) / (BATAS.lngMax - BATAS.lngMin)) * L, ((BATAS.latMax - lat) / (BATAS.latMax - BATAS.latMin)) * T];
const normNama = (s) => String(s).toLowerCase().replace(/[^a-z]/g, "");

function pathPoli(poli) {
	let d = "";
	for (const p of poli) for (const cincin of p) {
		cincin.forEach((t, i) => {
			const [x, y] = proyeksi(t);
			d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
		});
		d += "Z";
	}
	return d;
}

function pusat(poli) {
	let terbaik = [0, 0], luas = 0;
	for (const p of poli) {
		const t = p[0].map(proyeksi);
		let a = 0, cx = 0, cy = 0;
		for (let i = 0, j = t.length - 1; i < t.length; j = i++) {
			const f = t[j][0] * t[i][1] - t[i][0] * t[j][1];
			a += f; cx += (t[j][0] + t[i][0]) * f; cy += (t[j][1] + t[i][1]) * f;
		}
		if (Math.abs(a) > luas) { luas = Math.abs(a); terbaik = [cx / (3 * a), cy / (3 * a)]; }
	}
	return terbaik;
}

const TEKS_SVG = { pointerEvents: "none", stroke: "#0f1d33", strokeWidth: 3, paintOrder: "stroke" };

export default function PetaKecamatan({ onMain, kiniDi = null }) {
	const geo = useGeoWilayah();
	const [pilih, setPilih] = useState(kiniDi);
	const [sorot, setSorot] = useState(null);
	const [tab, setTab] = useState("peta");
	const [pesanNaik, setPesanNaik] = useState(null);
	const [, setDetak] = useState(0);
	useBangun();
	const koin = useKoleksi().poin;

	// kas berjalan terus: segarkan tampilan tiap 30 detik
	useEffect(() => {
		const t = setInterval(() => setDetak((n) => n + 1), 30000);
		return () => clearInterval(t);
	}, []);

	// sekali per render (bukan per kecamatan)
	const r = ringkasBangun();
	const status = statusSemuaKebun();
	const bintang = semuaBintang();
	const pesanan = pesananHariIni();
	const sumberPesanan = new Set(pesanan.filter((p) => !p.selesai).flatMap((p) => p.sumber));
	const totalKas = Object.keys(POTENSI).reduce((a, n) => a + kasTersedia(n), 0);
	const saran = saranBerikut(kiniDi, status);
	const capai = daftarPencapaian();
	const belumSelesai = pesanan.filter((p) => !p.selesai).length;

	const wilayah = useMemo(() => (geo ? geo.kecamatan.map((k) => ({ nama: k.nama, d: pathPoli(k.poli), c: pusat(k.poli), potensi: potensiKecamatan(k.nama) })) : []), [geo]);
	const terpilih = wilayah.find((w) => w.nama === pilih);
	const game = terpilih?.potensi && GAME[terpilih.potensi.game];
	const catatan = terpilih?.potensi ? infoGame(terpilih.potensi.game, terpilih.nama) : null;
	const desaTerpilih = terpilih && geo?.desa ? geo.desa.filter((d) => normNama(d.kec) === normNama(terpilih.nama)) : [];

	const pilihKec = (nama) => { setPilih(nama); setPesanNaik(null); };
	const keKec = (nama) => { setTab("peta"); pilihKec(nama); };

	const bangun = terpilih ? bangunKec(terpilih.nama) : null;
	const syarat = terpilih ? syaratNaik(terpilih.nama) : null;
	const kas = terpilih ? kasTersedia(terpilih.nama) : 0;
	const stKebun = terpilih ? status[terpilih.nama] : null;
	const usahaTerpilih = terpilih?.potensi ? USAHA[terpilih.potensi.game] : null;

	return (
		<div className="min-w-0">
			{/* gelar & kemajuan */}
			<div className="rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 p-4 text-white">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<p className="m-0 text-lg font-extrabold">🎖️ {r.gelar.nama}</p>
						<p className="m-0 text-[12px] text-white/70">{r.poin} poin</p>
					</div>
					<span className="shrink-0 rounded-xl bg-amber-400 px-2.5 py-1 text-[13px] font-extrabold text-slate-900">🪙 {koin}</span>
				</div>
				<div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
					<div className="h-full rounded-full bg-lime-400 transition-all" style={{ width: `${r.kemajuan * 100}%` }} />
				</div>
				<p className="m-0 mt-1 text-[11px] text-white/70">{r.gelarBerikut ? `→ ${r.gelarBerikut.nama} di ${r.gelarBerikut.poin}` : "Gelar tertinggi tercapai"}</p>
				<p className="m-0 mt-2 break-words text-[13px] font-semibold">📍 {r.dikunjungi}/40 · ★ {r.bintang}/120 · 🏛️ {r.bumdes} · 🎆 {r.mandiri}</p>
			</div>

			{totalKas > 0 && (
				<button type="button" onClick={() => ambilSemuaKas()}
					className="mt-2 w-full rounded-xl bg-amber-500 px-4 py-2.5 text-[14px] font-extrabold text-slate-900 hover:bg-amber-400">
					💰 Ambil semua kas · 🪙 {totalKas}
				</button>
			)}
			{saran && (
				<button type="button" onClick={() => keKec(saran.nama)}
					className="mt-2 w-full break-words rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50">
					🎯 <b>{saran.nama}</b>: {saran.alasan}
				</button>
			)}

			<div className="mt-3 grid grid-cols-3 gap-1.5">
				{[["peta", "🗺️ Peta"], ["pesanan", `📦 Pesanan (${belumSelesai})`], ["capai", `🏅 Pencapaian (${capai.filter((c) => c.selesai).length}/${capai.length})`]].map(([id, judul]) => (
					<button key={id} type="button" onClick={() => setTab(id)}
						className={`min-w-0 rounded-xl px-1.5 py-2 text-[12px] font-bold leading-tight sm:text-[13px] ${tab === id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
						{judul}
					</button>
				))}
			</div>

			{tab === "peta" && (
				<>
					<p className="m-0 mt-3 text-[13px] text-slate-500">Ketuk kecamatan untuk melihat potensi wilayahnya, lalu mainkan game-nya.</p>

					<div className="relative mt-2 overflow-hidden rounded-2xl bg-[#0f1d33]">
						{!geo && <div className="flex aspect-[1000/600] items-center justify-center text-sm text-white/60">Memuat peta…</div>}
						{geo && (
							<svg viewBox={`0 0 ${L} ${T}`} className="block h-auto w-full" role="img" aria-label="Peta kecamatan Kabupaten Bogor">
								{wilayah.map((w) => {
									const g = w.potensi ? GAME[w.potensi.game] : null;
									const aktif = w.nama === pilih;
									const b = bangunKec(w.nama);
									return (
										<path
											key={w.nama}
											d={w.d}
											fillRule="evenodd"
											fill={g?.warna || "#64748b"}
											fillOpacity={aktif ? 0.95 : sorot === w.nama ? 0.75 : b.dikunjungi ? 0.55 : 0.2}
											stroke={aktif ? "#fff" : b.lv > 0 ? "#fde047" : "#0f1d33"}
											strokeWidth={aktif ? 3 : b.lv > 0 ? 1 + b.lv * 0.5 : 1.2}
											strokeLinejoin="round"
											className="cursor-pointer outline-none transition-[fill-opacity] duration-150"
											tabIndex={0}
											role="button"
											aria-label={`Kecamatan ${w.nama}${g ? `, potensi ${g.nama.toLowerCase()}` : ""}`}
											onClick={() => pilihKec(w.nama)}
											onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), pilihKec(w.nama))}
											onMouseEnter={() => setSorot(w.nama)}
											onMouseLeave={() => setSorot(null)}
										/>
									);
								})}
								{wilayah.map((w) => {
									if (!w.potensi) return null;
									const bt = bintang[w.nama] || 0;
									const siap = status[w.nama]?.siap || 0;
									return (
										<g key={`i-${w.nama}`} pointerEvents="none">
											<text x={w.c[0]} y={w.c[1] + 7} textAnchor="middle" fontSize="20">{GAME[w.potensi.game].ikon}</text>
											{bt > 0 && (
												<text x={w.c[0]} y={w.c[1] + 24} textAnchor="middle" fontSize="13" fontWeight="700" fill="#fde047" stroke="#0f1d33" strokeWidth="3" paintOrder="stroke">{"★".repeat(bt)}</text>
											)}
											{sumberPesanan.has(w.nama) && <text x={w.c[0] + 17} y={w.c[1] - 4} textAnchor="middle" fontSize="13" style={TEKS_SVG}>📦</text>}
											{siap > 0 && <text x={w.c[0]} y={w.c[1] + 38} textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff" style={TEKS_SVG}>🧺{siap}</text>}
											{kiniDi === w.nama && <text x={w.c[0] - 17} y={w.c[1] - 4} textAnchor="middle" fontSize="13" style={TEKS_SVG}>📍</text>}
										</g>
									);
								})}
								{sorot && (() => {
									const w = wilayah.find((x) => x.nama === sorot);
									return w && (
										<text x={w.c[0]} y={w.c[1] - 16} textAnchor="middle" fontSize="17" fontWeight="700" fill="#fff" stroke="#0f1d33" strokeWidth="4" paintOrder="stroke" pointerEvents="none">
											{w.nama}
										</text>
									);
								})()}
							</svg>
						)}
					</div>

					<ul className="m-0 mt-3 flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0 text-[12px] text-slate-600">
						{Object.entries(GAME).map(([id, g]) => (
							<li key={id} className="flex items-center gap-1.5">
								<span className="h-2.5 w-2.5 rounded-full" style={{ background: g.warna }} />{g.ikon} {g.nama}
							</li>
						))}
					</ul>
					<p className="m-0 mt-1.5 text-[11px] text-slate-500">Redup = belum dikunjungi · garis emas = ada BUMDes · 📦 penghasil pesanan hari ini · 🧺 siap dipanen</p>

					{terpilih && game && (
						<div className="mt-4 rounded-2xl border border-slate-200 p-4">
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0">
									<p className="m-0 text-[12px] font-semibold text-slate-500">Kecamatan</p>
									<p className="m-0 break-words text-lg font-bold text-slate-900">{terpilih.nama}</p>
								</div>
								<span className="shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold text-slate-900" style={{ background: game.warna }}>
									{game.ikon} {game.nama}
								</span>
							</div>
							<p className="m-0 mt-2 text-[14px] text-slate-700">{terpilih.potensi.ringkas}</p>
							{desaTerpilih.length > 0 && (
								<p className="m-0 mt-2 break-words text-[12px] text-slate-500">
									{desaTerpilih.length} desa/kelurahan: {desaTerpilih.slice(0, 6).map((d) => d.nama).join(", ")}
									{desaTerpilih.length > 6 ? ` dan ${desaTerpilih.length - 6} lainnya` : ""}
								</p>
							)}
							{catatan?.bintang > 0 && (
								<p className="m-0 mt-2 text-[13px] font-semibold text-slate-700">
									<span className="text-amber-500">{"★".repeat(catatan.bintang)}{"☆".repeat(3 - catatan.bintang)}</span> · Panen beruntun terbaik {catatan.rekor.toLocaleString("id-ID")} · Tingkat {catatan.tingkat}
								</p>
							)}
							{stKebun?.siap > 0 && usahaTerpilih && (
								<p className="m-0 mt-2 text-[13px] font-semibold text-emerald-700">🧺 {stKebun.siap} {usahaTerpilih.unit} siap {usahaTerpilih.panen.kata.toLowerCase()}</p>
							)}
							{terpilih.potensi.terverifikasi === false && (
								<p className="m-0 mt-1.5 text-[12px] text-amber-700">Potensi kecamatan ini belum terverifikasi dan masih perlu dikonfirmasi DPMD.</p>
							)}

							{/* BUMDes */}
							<div className="mt-3 rounded-xl bg-amber-50 p-3 text-[13px] text-amber-950">
								<p className="m-0 font-bold">🏛️ BUMDes: {bangun.tingkat.nama} ({bangun.lv}/4)</p>
								{bangun.lv > 0 && (
									<>
										<p className="m-0 mt-1 text-[12px]">kas 🪙 {bangun.tingkat.kas}/jam · harga jual +{Math.round(bangun.tingkat.bonus * 100)}%</p>
										<div className="mt-1.5 flex items-center justify-between gap-2">
											<span className="min-w-0 text-[12px]">Kas: 🪙 {kas} <span className="text-amber-800/70">(maks {KAS_MAKS_JAM} jam)</span></span>
											<button type="button" disabled={kas < 1} onClick={() => ambilKas(terpilih.nama)}
												className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-[12px] font-bold text-slate-900 hover:bg-amber-400 disabled:opacity-40">Ambil</button>
										</div>
									</>
								)}
								{syarat && (
									<div className="mt-2">
										<button type="button"
											disabled={!syarat.cukupBintang || koin < syarat.berikut.biaya}
											onClick={() => setPesanNaik(naikBumdes(terpilih.nama).pesan)}
											className="w-full break-words rounded-lg bg-slate-900 px-3 py-2 text-[13px] font-bold text-white hover:bg-slate-800 disabled:opacity-40">
											{bangun.lv === 0 ? "Dirikan" : `Tingkatkan ke ${syarat.berikut.nama}`} · 🪙 {syarat.berikut.biaya} · {"★".repeat(syarat.berikut.bintang)}
										</button>
										{!syarat.cukupBintang && (
											<p className="m-0 mt-1 text-[11px] text-amber-900">Raih {"★".repeat(syarat.berikut.bintang)} dulu: panen beruntun di kecamatan ini</p>
										)}
										{syarat.cukupBintang && koin < syarat.berikut.biaya && (
											<p className="m-0 mt-1 text-[11px] text-amber-900">Koin kurang {syarat.berikut.biaya - koin}</p>
										)}
										<p className="m-0 mt-1 text-[11px] text-amber-900/80">{syarat.berikut.teks} · kas 🪙 {syarat.berikut.kas}/jam · harga jual +{Math.round(syarat.berikut.bonus * 100)}%</p>
									</div>
								)}
								{pesanNaik && <p className="m-0 mt-1.5 text-[12px] font-semibold">{pesanNaik}</p>}
								<p className="m-0 mt-2 text-[11px] text-slate-500">Tingkat BUMDes adalah kemajuan permainan, bukan data resmi desa.</p>
							</div>
							{!bangun.dikunjungi && <p className="m-0 mt-2 text-[12px] text-slate-500">Belum pernah dikunjungi · bonus 🪙 {BONUS_KUNJUNGAN}</p>}

							{kiniDi === terpilih.nama ? (
								<button type="button" disabled className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-[15px] font-bold text-white disabled:opacity-40">
									Anda sedang di sini
								</button>
							) : (
								<button
									type="button"
									onClick={() => onMain({ kecamatan: terpilih.nama, ...terpilih.potensi })}
									className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-[15px] font-bold text-white hover:bg-slate-800"
								>
									Main {game.nama.toLowerCase()} di {terpilih.nama}
								</button>
							)}
						</div>
					)}
				</>
			)}

			{tab === "pesanan" && (
				<div className="mt-3">
					<p className="m-0 text-[15px] font-bold text-slate-900">Pesanan kabupaten hari ini</p>
					<p className="m-0 text-[12px] text-slate-500">berganti tengah malam, sama untuk semua pemain</p>
					<ul className="m-0 mt-3 list-none space-y-2.5 p-0">
						{pesanan.map((p) => (
							<li key={p.id} className={`rounded-xl border border-slate-200 p-3 ${p.selesai ? "opacity-50" : ""}`}>
								<div className="flex items-start gap-2.5">
									<span className="text-2xl">{KOMODITAS[p.kom].ikon}</span>
									<div className="min-w-0 flex-1">
										<p className="m-0 break-words text-[14px] font-semibold text-slate-900">{teksPesanan(p)}</p>
										<p className="m-0 text-[12px] text-slate-600">Hadiah 🪙 {p.koin}{p.selesai ? " · ✅ Terkirim" : ""}</p>
									</div>
									{p.selesai && <span className="text-xl">✅</span>}
								</div>
								<div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] text-slate-600">
									<span>Dihasilkan di:</span>
									{p.sumber.map((n) => (
										<button key={n} type="button" onClick={() => keKec(n)} className="rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-semibold text-slate-800 hover:bg-slate-200">{n}</button>
									))}
								</div>
							</li>
						))}
					</ul>
					<p className="m-0 mt-3 text-[12px] text-slate-500">Kirim dari meja pembeli di kecamatan penghasil saat bawaanmu cukup.</p>
				</div>
			)}

			{tab === "capai" && (
				<ul className="m-0 mt-3 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
					{capai.map((c) => (
						<li key={c.id} className={`flex items-center gap-2.5 rounded-xl p-2.5 text-[13px] ${c.selesai ? "bg-emerald-50 text-emerald-900" : "bg-slate-100 text-slate-500"}`}>
							<span className="text-xl">{c.ikon}</span>
							<span className="min-w-0 flex-1 break-words font-semibold">{c.teks}</span>
							<span className="shrink-0 text-[12px] font-bold">🪙 {c.koin}</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
