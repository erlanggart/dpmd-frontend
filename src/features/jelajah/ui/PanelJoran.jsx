import { useState } from "react";
import { FiCheck, FiX } from "react-icons/fi";
import { AnimatePresence, motion } from "framer-motion";
import { JORAN, PELAMPUNG, SENAR, joranKini, pakaiJoran, pakaiPelampung, pakaiSenar, pelampungKini, punyaJoran, punyaPelampung, punyaSenar, senarKini, tingkatSenar, useKoleksi } from "../pancing";
import JoranGambar from "./JoranGambar";

const angka = (n) => n.toLocaleString("id-ID");
const persen = (x) => `${x >= 0 ? "+" : ""}${Math.round(x * 100)}%`;

// Nilai statistik joran (0..1 untuk bilah) & teksnya.
const STAT = [
	["Sambaran cepat", "⚡", (j) => (1 / j.cepat - 0.8) / 1.3, (j) => persen(1 / j.cepat - 1), "#0ea5e9"],
	["Peluang premium", "💎", (j) => (j.hoki - 0.8) / 1.6, (j) => persen(j.hoki - 1), "#f59e0b"],
	["Tenaga gulung", "🌀", (j) => (j.gulung - 0.9) / 0.45, (j) => persen(j.gulung - 1), "#10b981"],
	["Zona aman", "🎯", (j) => j.lebar / 0.08 + 0.05, (j) => `+${Math.round(j.lebar * 200)}%`, "#8b5cf6"],
];

function Statistik({ joran, banding }) {
	return (
		<div className="grid grid-cols-2 gap-x-4 gap-y-2">
			{STAT.map(([label, ikon, nilai, teks, warna]) => {
				const v = Math.max(0.04, Math.min(1, nilai(joran)));
				const lebih = banding && nilai(joran) - nilai(banding) > 0.01;
				return (
					<div key={label}>
						<div className="flex items-baseline justify-between gap-2 text-[11px]">
							<span className="truncate text-slate-500">
								{ikon} {label}
							</span>
							<span className={`shrink-0 font-bold tabular-nums ${lebih ? "text-emerald-600" : "text-slate-800"}`}>{teks(joran)}</span>
						</div>
						<div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
							<div className="h-full rounded-full" style={{ width: `${v * 100}%`, background: warna }} />
						</div>
					</div>
				);
			})}
		</div>
	);
}

// Gulungan senar kecil: pola lilitan mengikuti jenisnya (polos, anyaman silang, bening, emas).
function Gulungan({ senar, tingkat }) {
	const w = senar.warna === "#f1f5f9" ? "#cbd5e1" : senar.warna;
	const tebal = 0.8 + tingkat * 0.25;
	return (
		<svg viewBox="0 0 48 48" className="h-12 w-12 shrink-0">
			<circle cx="24" cy="24" r="21" fill="#f1f5f9" stroke="#cbd5e1" />
			{Array.from({ length: 6 }, (_, i) => {
				const r = 9 + i * 1.8;
				return (
					<g key={i} fill="none">
						{senar.pola === "fluoro" ? (
							<circle cx="24" cy="24" r={r} stroke={w} strokeOpacity="0.5" strokeWidth={tebal} strokeDasharray="1 1.5" />
						) : (
							<circle cx="24" cy="24" r={r} stroke={senar.pola === "pusaka" && i % 2 ? "#f59e0b" : w} strokeWidth={tebal} />
						)}
						{senar.pola === "anyam" && <circle cx="24" cy="24" r={r} stroke={senar.warna2} strokeWidth={tebal} strokeDasharray="2.2 3.4" strokeDashoffset={i % 2 ? 2.8 : 0} />}
					</g>
				);
			})}
			{senar.pola === "pusaka" && <circle cx="24" cy="24" r="21" fill="none" stroke="#f59e0b" strokeWidth="1.2" />}
			<circle cx="24" cy="24" r="6.5" fill="#334155" />
			<circle cx="24" cy="24" r="2.2" fill="#e2e8f0" />
		</svg>
	);
}

// Ikon pelampung: siluet sesuai bentuknya di air (garis air di y 28, bagian bawahnya tenggelam).
function IkonPelampung({ p }) {
	const { warna: w, warna2: w2 } = p;
	const emas = "#facc15";
	let bentuk;
	switch (p.id) {
		case "pena":
			bentuk = (
				<>
					<rect x="23.4" y="3" width="1.2" height="12" rx="0.6" fill={w2} stroke="#64748b" strokeWidth="0.5" />
					<rect x="21" y="14" width="6" height="28" rx="3" fill={w} />
					<rect x="21" y="20" width="6" height="4" fill={w2} />
				</>
			);
			break;
		case "peluru":
			bentuk = (
				<>
					<rect x="22.8" y="7" width="2.4" height="7" rx="1.2" fill={w2} />
					<path d="M24 13 C32 15 35 24 31 34 L24 43 L17 34 C13 24 16 15 24 13 Z" fill={w} />
				</>
			);
			break;
		case "tembaga":
			bentuk = (
				<>
					<circle cx="24" cy="26" r="14" fill={w2} opacity="0.25" />
					<rect x="22.8" y="6" width="2.4" height="9" rx="1.2" fill={w2} />
					<rect x="18" y="14" width="12" height="28" rx="6" fill={w} />
					<rect x="20" y="16" width="2.5" height="24" rx="1.2" fill="#fff" opacity="0.35" />
					<rect x="17.5" y="24" width="13" height="3" fill={w2} />
				</>
			);
			break;
		case "neon":
			bentuk = (
				<>
					<circle cx="24" cy="6" r="5" fill={w} opacity="0.35" />
					<circle cx="24" cy="6" r="2.8" fill={w} />
					<rect x="23" y="7" width="2" height="22" fill={w} />
					<rect x="20.5" y="26" width="7" height="14" rx="3.5" fill={w2} />
					<rect x="20" y="29" width="8" height="2" fill={w} />
				</>
			);
			break;
		case "kristal":
			bentuk = (
				<>
					<rect x="23" y="5" width="2" height="9" fill={w2} />
					<polygon points="24,12 32,19 32,33 24,43 16,33 16,19" fill={w} fillOpacity="0.55" stroke={w2} strokeWidth="1" />
					<path d="M24 12 V43 M16 19 L32 33 M32 19 L16 33" stroke="#fff" strokeOpacity="0.6" strokeWidth="0.7" fill="none" />
				</>
			);
			break;
		case "giok":
			bentuk = (
				<>
					<rect x="22.8" y="6" width="2.4" height="9" rx="1.2" fill={emas} />
					<ellipse cx="24" cy="28" rx="10" ry="14" fill={w} />
					<ellipse cx="21" cy="22" rx="2.5" ry="5" fill="#fff" opacity="0.3" />
					<ellipse cx="24" cy="28" rx="10.6" ry="3" fill="none" stroke={emas} strokeWidth="2" />
				</>
			);
			break;
		case "naga":
			bentuk = (
				<>
					<circle cx="24" cy="6" r="4.5" fill={w2} opacity="0.35" />
					<circle cx="24" cy="6" r="2.6" fill={w2} />
					<rect x="22.8" y="7" width="2.4" height="8" rx="1.2" fill={w} />
					<ellipse cx="24" cy="28" rx="10" ry="14" fill={w} />
					{[20, 28, 36].map((y) => (
						<path key={y} d={`M14.5 ${y} Q24 ${y + 5} 33.5 ${y}`} fill="none" stroke={w2} strokeWidth="2.2" strokeLinecap="round" />
					))}
				</>
			);
			break;
		default:
			bentuk = (
				<>
					<rect x="22.5" y="4" width="3" height="11" rx="1.5" fill="#fde047" stroke="#a16207" strokeWidth="0.8" />
					<path d="M10 28 A14 14 0 0 1 38 28 Z" fill={w} />
					<path d="M10 28 A14 14 0 0 0 38 28 Z" fill={w2} stroke="#cbd5e1" strokeWidth="0.6" />
					<circle cx="24" cy="28" r="14" fill="none" stroke="#0f172a" strokeOpacity="0.25" />
				</>
			);
	}
	return (
		<svg viewBox="0 0 48 48" className="h-12 w-12 shrink-0">
			{bentuk}
			<path d="M3 28 H45" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 2" opacity="0.7" />
		</svg>
	);
}

// Teks efek pelampung: hanya pengali yang bukan 1.
const efekPelampung = (p) =>
	[
		p.cepat !== 1 && `Sambaran ${persen(1 / p.cepat - 1)}`,
		p.reaksi !== 1 && `Waktu sentak ${persen(p.reaksi - 1)}`,
		p.hoki !== 1 && `Peluang premium ${persen(p.hoki - 1)}`,
	].filter(Boolean);

// Toko pancing: pilih jenis joran (tiap jenis unggul di kecepatan sambaran atau peluang ikan
// premium), senar (lebih kuat & lebih panjang) dan pelampung, semuanya dibeli pakai koin.
export default function PanelJoran({ onTutup }) {
	const { poin: koin } = useKoleksi();
	const [tab, setTab] = useState("joran");
	const [kabar, setKabar] = useState(null);
	const dipakai = joranKini();
	const senar = senarKini();
	const pelampung = pelampungKini();
	const tSenar = tingkatSenar();
	const umumkan = (k) => {
		setKabar({ ...k, id: Date.now() });
		setTimeout(() => setKabar((x) => (x && Date.now() - x.id > 2400 ? null : x)), 2600);
	};

	return (
		<div className="pointer-events-auto fixed inset-0 z-40 flex items-end justify-center bg-slate-950/45 backdrop-blur-[2px] sm:items-center sm:p-6" onClick={onTutup}>
			<motion.div
				initial={{ y: 40, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{ type: "spring", stiffness: 380, damping: 34 }}
				className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-[28px] bg-white text-slate-900 shadow-2xl sm:rounded-[28px]"
				onClick={(e) => e.stopPropagation()}
			>
				{/* kepala */}
				<div className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
					<div className="min-w-0">
						<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Situ Pemda</p>
						<h2 className="text-xl font-black tracking-tight">Toko Pancing</h2>
					</div>
					<div className="flex items-center gap-2">
						<span className="rounded-full bg-amber-50 px-3 py-1.5 text-sm font-bold tabular-nums text-amber-700 ring-1 ring-amber-200">🪙 {angka(koin)}</span>
						<button onClick={onTutup} aria-label="Tutup" className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200">
							<FiX />
						</button>
					</div>
				</div>

				<div className="overflow-y-auto px-5 pb-5">
					{/* joran yang dipakai */}
					<div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 p-4 ring-1 ring-slate-200/70">
						<div className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-25 blur-2xl" style={{ background: dipakai.ujung }} />
						<p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Sedang dipakai</p>
						<JoranGambar joran={dipakai} className="my-1 h-16 w-full" />
						<div className="flex flex-wrap items-center gap-2">
							<span className="text-base font-black">{dipakai.nama}</span>
							<span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-200">🧵 {senar.nama}</span>
							<span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200">🔴 {pelampung.nama}</span>
						</div>
					</div>

					{/* tab bersegmen */}
					<div className="mt-4 grid grid-cols-3 rounded-2xl bg-slate-100 p-1">
						{[
							["joran", "Joran"],
							["senar", "Senar"],
							["pelampung", "Pelampung"],
						].map(([id, judul]) => (
							<button key={id} onClick={() => setTab(id)} className={`rounded-xl py-2 text-sm font-bold transition ${tab === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
								{judul}
							</button>
						))}
					</div>

					<AnimatePresence>
						{kabar && (
							<motion.p
								key={kabar.id}
								initial={{ opacity: 0, y: -6 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0 }}
								className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold ${kabar.ok ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"}`}
							>
								{kabar.teks}
							</motion.p>
						)}
					</AnimatePresence>

					{tab === "joran" && (
						<ul className="mt-3 space-y-3">
							{JORAN.map((j) => {
								const punya = punyaJoran(j.id);
								const pakai = dipakai.id === j.id;
								const kurang = !punya && koin < j.harga;
								return (
									<li key={j.id} className={`overflow-hidden rounded-3xl border bg-white transition ${pakai ? "border-amber-300 shadow-[0_0_0_3px_rgba(251,191,36,0.15)]" : "border-slate-200 hover:border-slate-300 hover:shadow-sm"}`}>
										<div className="relative px-3 pt-2" style={{ background: `linear-gradient(135deg, ${j.ujung}14, ${j.warna}10)` }}>
											<JoranGambar joran={j} className="h-14 w-full" />
										</div>
										<div className="space-y-3 p-4 pt-3">
											<div className="flex items-start justify-between gap-3">
												<div className="min-w-0">
													<p className="flex flex-wrap items-center gap-2 font-black">
														{j.nama}
														{pakai && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">Dipakai</span>}
														{punya && !pakai && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">Dimiliki</span>}
														{j.auto && <span title="Mode AUTO: memancing otomatis (koin ×0,3, ikan besar lebih jarang)" className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">🤖 Auto</span>}
													</p>
													<p className="mt-0.5 text-xs leading-relaxed text-slate-500">{j.ket}</p>
												</div>
												{pakai ? (
													<span className="flex h-9 shrink-0 items-center gap-1 rounded-xl bg-amber-50 px-3 text-xs font-bold text-amber-700">
														<FiCheck /> Terpasang
													</span>
												) : (
													<button
														disabled={kurang}
														onClick={() => {
															const baru = !punya;
															const gagal = pakaiJoran(j.id);
															umumkan(gagal ? { ok: false, teks: gagal } : { ok: true, teks: `${j.nama} ${baru ? "dibeli & " : ""}dipakai!` });
														}}
														className={`h-9 shrink-0 rounded-xl px-3.5 text-sm font-bold transition ${punya ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-amber-400 text-slate-950 hover:bg-amber-300"} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
													>
														{punya ? "Pakai" : `🪙 ${angka(j.harga)}`}
													</button>
												)}
											</div>
											<Statistik joran={j} banding={pakai ? null : dipakai} />
										</div>
									</li>
								);
							})}
						</ul>
					)}

					{tab === "senar" && (
						<ul className="mt-3 space-y-2.5">
							{SENAR.map((s, i) => {
								const punya = punyaSenar(i);
								const aktif = i === tSenar;
								return (
									<li key={s.nama} className={`flex items-center gap-3 rounded-2xl border p-3 transition ${aktif ? "border-sky-300 bg-sky-50/50" : "border-slate-200 bg-white"}`}>
										<Gulungan senar={s} tingkat={i} />
										<div className="min-w-0 flex-1">
											<p className="flex flex-wrap items-center gap-2 text-sm font-black">
												<span className="rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] text-white">Lv {i + 1}</span>
												{s.nama}
											</p>
											<p className="mt-0.5 text-[11px] text-slate-500">{s.tebal}</p>
											<div className="mt-1.5 flex items-center gap-2">
												<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
													<div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.min(100, Math.max(4, ((s.kuat - 0.9) / 1.5) * 100))}%` }} />
												</div>
												<span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-500">
													kuat {persen(s.kuat - 1)} · {s.panjang} m
												</span>
											</div>
										</div>
										{aktif ? (
											<span className="flex h-9 shrink-0 items-center gap-1 rounded-xl bg-sky-100 px-3 text-xs font-bold text-sky-700">
												<FiCheck /> Terpasang
											</span>
										) : (
											<button
												disabled={!punya && koin < s.harga}
												onClick={() => {
													const baru = !punya;
													const gagal = pakaiSenar(i);
													umumkan(gagal ? { ok: false, teks: gagal } : { ok: true, teks: `${s.nama} ${baru ? "dibeli & " : ""}dipakai!` });
												}}
												className={`h-9 shrink-0 rounded-xl px-3.5 text-sm font-bold transition ${punya ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-sky-500 text-white hover:bg-sky-600"} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
											>
												{punya ? "Pakai" : `🪙 ${angka(s.harga)}`}
											</button>
										)}
									</li>
								);
							})}
						</ul>
					)}

					{tab === "pelampung" && (
						<ul className="mt-3 space-y-2.5">
							{PELAMPUNG.map((p) => {
								const punya = punyaPelampung(p.id);
								const aktif = pelampung.id === p.id;
								const efek = efekPelampung(p);
								return (
									<li key={p.id} className={`flex items-center gap-3 rounded-2xl border p-3 transition ${aktif ? "border-rose-300 bg-rose-50/50" : "border-slate-200 bg-white"}`}>
										<IkonPelampung p={p} />
										<div className="min-w-0 flex-1">
											<p className="text-sm font-black">{p.nama}</p>
											<p className="mt-0.5 text-xs leading-relaxed text-slate-500">{p.ket}</p>
											<div className="mt-1.5 flex flex-wrap gap-1">
												{efek.length ? efek.map((e) => <span key={e} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{e}</span>) : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">Standar</span>}
											</div>
										</div>
										{aktif ? (
											<span className="flex h-9 shrink-0 items-center gap-1 rounded-xl bg-rose-100 px-3 text-xs font-bold text-rose-700">
												<FiCheck /> Terpasang
											</span>
										) : (
											<button
												disabled={!punya && koin < p.harga}
												onClick={() => {
													const baru = !punya;
													const gagal = pakaiPelampung(p.id);
													umumkan(gagal ? { ok: false, teks: gagal } : { ok: true, teks: `${p.nama} ${baru ? "dibeli & " : ""}dipakai!` });
												}}
												className={`h-9 shrink-0 rounded-xl px-3.5 text-sm font-bold transition ${punya ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-rose-500 text-white hover:bg-rose-600"} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
											>
												{punya ? "Pakai" : `🪙 ${angka(p.harga)}`}
											</button>
										)}
									</li>
								);
							})}
						</ul>
					)}
					<p className="mt-4 text-center text-[11px] leading-relaxed text-slate-400">Joran menentukan seberapa cepat & seberapa premium ikan yang datang. Senar kuat tidak gampang putus saat ikan monster melawan. Pelampung memengaruhi sambaran, waktu menyentak, dan peluang ikan premium.</p>
				</div>
			</motion.div>
		</div>
	);
}
