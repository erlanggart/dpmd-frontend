import { useState } from "react";
import { FiX } from "react-icons/fi";
import { JORAN, SENAR, joranKini, pakaiJoran, punyaJoran, senarKini, tingkatSenar, upgradeSenar, useKoleksi } from "../pancing";

const angka = (n) => n.toLocaleString("id-ID");
const persen = (x) => `${x >= 0 ? "+" : ""}${Math.round(x * 100)}%`;

// Bilah statistik: nilai 0..1, diwarnai sesuai jenis.
function Bilah({ label, nilai, teks, warna }) {
	return (
		<div>
			<div className="flex justify-between text-[10px] font-semibold text-slate-400">
				<span>{label}</span>
				<span className="text-slate-200">{teks}</span>
			</div>
			<div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/10">
				<div className="h-full rounded-full" style={{ width: `${Math.max(4, Math.min(100, nilai * 100))}%`, background: warna }} />
			</div>
		</div>
	);
}

// Toko pancing: pilih jenis joran (tiap jenis unggul di kecepatan sambaran atau peluang ikan
// premium) dan upgrade senar (lebih kuat & lebih panjang) pakai koin.
export default function PanelJoran({ onTutup }) {
	const { poin: koin } = useKoleksi();
	const [tab, setTab] = useState("joran");
	const [kabar, setKabar] = useState(null);
	const dipakai = joranKini();
	const senar = senarKini();
	const tSenar = tingkatSenar();

	return (
		<div className="pointer-events-auto fixed inset-0 z-40 flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-6" onClick={onTutup}>
			<div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-slate-900 p-5 text-white shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
				<div className="mb-3 flex items-center justify-between">
					<div>
						<p className="text-lg font-black">🎣 Toko Pancing</p>
						<p className="text-xs text-slate-400">
							Dipakai: <b className="text-amber-300">{dipakai.nama}</b> · <b className="text-sky-300">{senar.nama}</b>
						</p>
					</div>
					<div className="flex items-center gap-2">
						<span className="rounded-full bg-amber-400/15 px-3 py-1 text-sm font-black text-amber-300">🪙 {angka(koin)}</span>
						<button onClick={onTutup} aria-label="Tutup" className="rounded-full bg-white/10 p-2 hover:bg-white/20">
							<FiX />
						</button>
					</div>
				</div>
				<div className="mb-3 grid grid-cols-2 gap-1.5 rounded-2xl bg-white/5 p-1">
					{[
						["joran", "🎣 Jenis Joran"],
						["senar", "🧵 Upgrade Senar"],
					].map(([id, judul]) => (
						<button
							key={id}
							onClick={() => {
								setTab(id);
								setKabar(null);
							}}
							className={`rounded-xl py-2 text-sm font-black ${tab === id ? "bg-amber-400 text-slate-950" : "text-slate-300 hover:bg-white/10"}`}
						>
							{judul}
						</button>
					))}
				</div>
				{kabar && <p className={`mb-3 rounded-xl px-3 py-2 text-sm font-semibold ${kabar.ok ? "bg-emerald-500/20 text-emerald-200" : "bg-rose-500/20 text-rose-200"}`}>{kabar.teks}</p>}

				{tab === "joran" && (
					<ul className="space-y-2">
						{JORAN.map((j) => {
							const punya = punyaJoran(j.id);
							const pakai = dipakai.id === j.id;
							return (
								<li key={j.id} className={`rounded-2xl p-3 ring-1 ${pakai ? "bg-amber-400/10 ring-amber-400/70" : "bg-white/5 ring-white/10"}`}>
									<div className="flex items-start gap-3">
										<span className="mt-1 h-12 w-2 shrink-0 rounded-full" style={{ background: `linear-gradient(${j.ujung}, ${j.warna})` }} />
										<div className="min-w-0 flex-1">
											<p className="font-black">
												{j.nama} {pakai && <span className="ml-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] text-slate-950">DIPAKAI</span>}
											</p>
											<p className="text-xs text-slate-400">{j.ket}</p>
											<div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
												<Bilah label="⚡ Sambaran cepat" nilai={(1 / j.cepat - 0.8) / 1.3} teks={persen(1 / j.cepat - 1)} warna="#38bdf8" />
												<Bilah label="💎 Peluang premium" nilai={(j.hoki - 0.8) / 1.6} teks={persen(j.hoki - 1)} warna="#f59e0b" />
												<Bilah label="🌀 Tenaga gulung" nilai={(j.gulung - 0.9) / 0.45} teks={persen(j.gulung - 1)} warna="#34d399" />
												<Bilah label="🎯 Zona aman" nilai={j.lebar / 0.08 + 0.05} teks={`+${Math.round(j.lebar * 200)}%`} warna="#a78bfa" />
											</div>
										</div>
										{!pakai && (
											<button
												disabled={!punya && koin < j.harga}
												onClick={() => {
													const baru = !punya;
													const gagal = pakaiJoran(j.id);
													setKabar(gagal ? { ok: false, teks: gagal } : { ok: true, teks: `${j.nama} ${baru ? "dibeli & " : ""}dipakai!` });
												}}
												className="shrink-0 self-center rounded-xl bg-amber-400 px-3 py-2 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:bg-slate-700 disabled:text-slate-400"
											>
												{punya ? "Pakai" : `🪙 ${angka(j.harga)}`}
											</button>
										)}
									</div>
								</li>
							);
						})}
					</ul>
				)}

				{tab === "senar" && (
					<ul className="space-y-2">
						{SENAR.map((s, i) => {
							const sudah = i <= tSenar;
							const berikut = i === tSenar + 1;
							return (
								<li key={s.nama} className={`flex items-center gap-3 rounded-2xl p-3 ring-1 ${i === tSenar ? "bg-sky-400/10 ring-sky-400/70" : "bg-white/5 ring-white/10"} ${!sudah && !berikut ? "opacity-60" : ""}`}>
									<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ring-2 ring-white/20" style={{ background: s.warna, color: "#0f172a" }}>
										🧵
									</span>
									<div className="min-w-0 flex-1">
										<p className="font-black">
											Lv {i + 1} · {s.nama} {i === tSenar && <span className="ml-1 rounded-full bg-sky-400 px-2 py-0.5 text-[10px] text-slate-950">DIPAKAI</span>}
										</p>
										<p className="text-xs text-slate-400">
											Kuat {persen(s.kuat - 1)} sebelum putus · panjang {s.panjang} m
										</p>
									</div>
									{berikut && (
										<button
											disabled={koin < s.harga}
											onClick={() => {
												const gagal = upgradeSenar();
												setKabar(gagal ? { ok: false, teks: gagal } : { ok: true, teks: `Senar di-upgrade: ${s.nama}!` });
											}}
											className="shrink-0 rounded-xl bg-sky-400 px-3 py-2 text-sm font-black text-slate-950 hover:bg-sky-300 disabled:bg-slate-700 disabled:text-slate-400"
										>
											Upgrade 🪙 {angka(s.harga)}
										</button>
									)}
									{sudah && i < tSenar && <span className="shrink-0 text-xs font-bold text-slate-500">✓</span>}
								</li>
							);
						})}
					</ul>
				)}
				<p className="mt-3 text-center text-[11px] text-slate-400">Senar kuat = tidak gampang putus saat ikan monster melawan. Joran menentukan seberapa cepat & seberapa premium ikan yang datang.</p>
			</div>
		</div>
	);
}
