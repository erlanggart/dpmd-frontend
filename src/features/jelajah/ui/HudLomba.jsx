import { AnimatePresence, motion } from "framer-motion";
import { LOMBA, lombaKini, namaIkan, tiketAktif, tutupHasilLomba, useDetik, useKolam } from "../kolamMonster";
import { useMultipemain } from "../multipemain";
import { pancing, usePancing } from "../pancing";

// HUD Kolam Monster: sisa waktu tiket, papan klasemen lomba galatama yang berjalan,
// dan podium saat lomba usai.

const angka = (n) => n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
const jam = (ms) => {
	const d = Math.max(0, Math.ceil(ms / 1000));
	return `${Math.floor(d / 60)}:${String(d % 60).padStart(2, "0")}`;
};
const MEDALI = ["🥇", "🥈", "🥉"];

function Podium({ hasil }) {
	const juara = hasil.urut.slice(0, 3);
	// susunan podium: 2 – 1 – 3
	const susun = [juara[1], juara[0], juara[2]].filter(Boolean);
	const tinggi = { 0: "h-24", 1: "h-16", 2: "h-12" };
	return (
		<div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-4">
			<motion.section
				initial={{ scale: 0.85, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				role="dialog"
				aria-label="Hasil lomba galatama"
				className="max-h-[calc(100dvh-1.5rem)] w-full max-w-sm overflow-y-auto rounded-3xl bg-slate-900 text-white shadow-2xl ring-2 ring-amber-400/70"
			>
				<div className="bg-gradient-to-b from-amber-500/30 to-transparent px-5 pb-2 pt-5 text-center">
					<p className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-300">Lomba Galatama selesai</p>
					<p className="mt-1 text-2xl font-black">
						{hasil.peringkat <= 3 && hasil.hadiah ? `${MEDALI[hasil.peringkat - 1]} Juara ${hasil.peringkat}!` : hasil.urut.find((p) => p.saya)?.ikan ? `Peringkat ${hasil.peringkat}` : "Tanpa tangkapan"}
					</p>
					<p className="mt-1 text-sm text-slate-300">{hasil.hadiah ? `Hadiah 🪙 ${angka(hasil.hadiah)} masuk ke koinmu` : "Belum beruntung — coba lagi, babon menanti!"}</p>
				</div>
				<div className="flex items-end justify-center gap-2 px-5 pt-2">
					{susun.map((p) => {
						const i = hasil.urut.indexOf(p);
						return (
							<div key={p.id} className="flex w-24 flex-col items-center">
								<span className="text-2xl">{p.ikon}</span>
								<span className={`max-w-full truncate text-xs font-bold ${p.saya ? "text-amber-300" : ""}`}>{p.nama}</span>
								<span className="text-[10px] tabular-nums text-slate-400">{p.babon ? `${angka(p.babon)} kg` : "—"}</span>
								<div className={`mt-1 flex w-full items-start justify-center rounded-t-xl bg-gradient-to-b from-amber-400 to-amber-600 pt-1 text-xl ${tinggi[i]}`}>{MEDALI[i]}</div>
							</div>
						);
					})}
				</div>
				<ol className="space-y-1 border-t border-white/10 px-5 py-3">
					{hasil.urut.map((p, i) => (
						<li key={p.id} className={`flex items-center gap-2 rounded-xl px-2 py-1 text-xs ${p.saya ? "bg-amber-400/20 font-black" : ""}`}>
							<span className="w-5 text-center">{i + 1}</span>
							<span className="flex-1 truncate">
								{p.ikon} {p.nama}
							</span>
							<span className="hidden truncate text-slate-400 sm:inline">{p.babonIkan ? namaIkan(p.babonIkan) : ""}</span>
							<span className="w-16 text-right tabular-nums">{p.babon ? `${angka(p.babon)} kg` : "—"}</span>
						</li>
					))}
				</ol>
				<div className="px-5 pb-5">
					<button autoFocus onClick={tutupHasilLomba} className="w-full rounded-2xl bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-300">
						Tutup
					</button>
				</div>
			</motion.section>
		</div>
	);
}

// posisi: di bawah bar tenaga; saat memancing di HP turun di bawah kartu & pesan pancing,
// di HP mendatar (layar pendek) naik dan diringkas supaya tidak menabrak joystick
export default function HudLomba({ mancing = false }) {
	const kolam = useKolam();
	useMultipemain();
	usePancing();
	const kini = useDetik();
	// saat ikan melawan, di HP klasemen diringkas (panel tarik butuh tempat)
	const ringkas = mancing && ["gigit", "tarik", "dapat"].includes(pancing.fase);
	const k = lombaKini();
	if (k?.hasil) return <Podium hasil={k.hasil} />;
	const tiket = tiketAktif(kini);
	const pos = mancing ? "top-[13.5rem] sm:top-[10.5rem] [@media(max-height:520px)]:top-[7rem]" : "top-[11rem] [@media(max-height:520px)]:top-[10.25rem]";
	const chip = (teks, warna) => <p className={`pointer-events-none absolute left-3 ${pos} z-20 max-w-[14rem] rounded-2xl px-3 py-1 text-[11px] font-black text-white shadow-lg sm:left-4 sm:max-w-xs ${warna}`}>{teks}</p>;
	const manusia = k ? k.peserta.filter((p) => p.npc === false || p.saya).length : 0;
	if (k?.fase === "daftar")
		return chip(k.ikut ? `🏆 Galatama mulai ${jam(k.sampai - kini)} · ${manusia} tamu terdaftar` : `🏆 Lomba Galatama dibuka! Daftar di loket Kolam Monster · ${jam(k.sampai - kini)}`, "bg-gradient-to-r from-amber-500 to-orange-500 animate-pulse");
	if (k?.fase === "jalan" && !k.ikut) {
		const p1 = k.peserta[0];
		return chip(`🏆 Galatama berlangsung · ${jam(k.sampai - kini)}${p1?.babon ? ` · ${p1.ikon} ${p1.nama} ${angka(p1.babon)} kg` : ""}`, "bg-slate-900/75");
	}
	if (k?.fase !== "jalan") return tiket ? chip(`🎟️ Kolam Monster · ${jam(kolam.tiketSampai - kini)}`, "bg-emerald-600/90") : null;
	const urut = k.peserta;
	const saya = urut.findIndex((p) => p.saya);
	const sisa = k.sampai - kini;
	return (
		<div className={`pointer-events-none absolute left-3 ${pos} z-20 w-48 overflow-hidden rounded-2xl bg-slate-950/75 text-white shadow-lg ring-1 ring-amber-400/50 backdrop-blur sm:left-4 sm:w-56 [@media(max-height:520px)]:w-44`}>
			<div className="flex items-center justify-between bg-gradient-to-r from-amber-500/80 to-orange-500/80 px-2.5 py-1">
				<span className="text-[10px] font-black uppercase tracking-widest">🏆 Galatama{k.bersama ? " 🌐" : ""}</span>
				<span className={`text-xs font-black tabular-nums ${sisa < 30000 ? "animate-pulse text-rose-100" : ""}`}>⏱ {jam(sisa)}</span>
			</div>
			<div className="h-0.5 bg-white/10">
				<div className="h-full bg-amber-400" style={{ width: `${Math.max(0, Math.min(100, (sisa / (LOMBA.menit * 60000)) * 100))}%` }} />
			</div>
			<ol className="px-1.5 py-1">
				{urut.map((p, i) => (
					<li key={p.id} className={`items-center gap-1.5 rounded-lg px-1 py-[1px] text-[11px] ${p.saya ? "bg-amber-400/25 font-black" : p.npc === false ? "text-sky-100" : "text-white/85"} ${i > 2 && !p.saya && Math.abs(i - saya) > 1 ? "hidden sm:flex" : "flex"} ${i > 7 && !p.saya ? "!hidden" : ""} ${i > 0 && !p.saya ? `[@media(max-height:520px)]:!hidden ${ringkas ? "max-sm:!hidden" : ""}` : ""}`}>
						<span className="w-4 text-center">{MEDALI[i] || i + 1}</span>
						<span className="flex-1 truncate">
							{p.ikon} {p.nama}
						</span>
						<span className="tabular-nums">{p.babon ? angka(p.babon) : "—"}</span>
					</li>
				))}
			</ol>
			<AnimatePresence initial={false}>
				{k.kabar?.[0] && (
					<motion.p key={k.kabar[0].id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`border-t border-white/10 px-2.5 py-1 text-[10px] leading-snug text-amber-100 [@media(max-height:520px)]:hidden ${ringkas ? "max-sm:hidden" : ""}`}>
						{k.kabar[0].teks}
					</motion.p>
				)}
			</AnimatePresence>
		</div>
	);
}
