import { useState } from "react";
import { IKAN, KELAS, joranKini, useKoleksi } from "../pancing";
import { LOMBA, TIKET, beliTiket, daftarLomba, lombaKini, namaIkan, tiketAktif, useDetik, useKolam } from "../kolamMonster";
import { modeBersama, useMultipemain } from "../multipemain";
import IkonIkan from "./IkonIkan";

// Loket Kolam Monster DPMD: beli tiket memancing bebas, daftar lomba galatama, rekor.

const angka = (n) => n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
const jam = (ms) => {
	const d = Math.max(0, Math.ceil(ms / 1000));
	return `${Math.floor(d / 60)}:${String(d % 60).padStart(2, "0")}`;
};
const PENGHUNI = IKAN.filter((i) => i.kelas >= 3 && i.id !== "raja");
const MEDALI = ["🥇", "🥈", "🥉"];

function DaftarPeserta({ peserta }) {
	return (
		<ol className="mt-2 space-y-1">
			{peserta.map((p, i) => (
				<li key={p.id} className={`flex items-center gap-2 rounded-xl px-2 py-1 text-xs ${p.saya ? "bg-amber-100 font-black" : ""}`}>
					<span className="w-5 text-center">{MEDALI[i] || i + 1}</span>
					<span className="flex-1 truncate">
						{p.ikon} {p.nama}
						{p.npc === false && !p.saya && <span className="ml-1 rounded bg-sky-100 px-1 text-[9px] font-bold text-sky-700">TAMU</span>}
					</span>
					<span className="tabular-nums text-slate-600">{p.babon ? `${angka(p.babon)} kg` : "—"}</span>
				</li>
			))}
		</ol>
	);
}

function SeksiLomba({ kini, poin, onTutup, jalankan }) {
	useKolam();
	useMultipemain();
	const k = lombaKini();
	const bersama = modeBersama();
	const kurang = poin < LOMBA.biaya;
	const tombolDaftar = (label) => (
		<button
			onClick={() => jalankan(daftarLomba, false)}
			disabled={kurang}
			className="mt-3 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400"
		>
			{label} · 🪙 {angka(LOMBA.biaya)}
		</button>
	);
	const manusia = k?.peserta.filter((p) => p.npc === false || p.saya).length ?? 0;
	let isi;
	if (!k || (k.fase === "selesai" && !k.hasil)) isi = tombolDaftar(bersama ? "Buka lomba bersama" : "Daftar lomba");
	else if (k.fase === "daftar")
		isi = (
			<div className="mt-3 rounded-2xl bg-white p-3 ring-1 ring-amber-200">
				<p className="flex items-center justify-between text-xs font-bold text-slate-700">
					<span>📝 Pendaftaran · {manusia} tamu</span>
					<span className="tabular-nums text-amber-600">mulai {jam(k.sampai - kini)}</span>
				</p>
				<DaftarPeserta peserta={k.peserta} />
				{k.ikut ? <p className="mt-2 text-center text-xs font-bold text-emerald-600">✓ Kamu sudah terdaftar — bersiap di tepi kolam</p> : tombolDaftar("Ikut lomba")}
			</div>
		);
	else if (k.fase === "jalan")
		isi = (
			<div className="mt-3 rounded-2xl bg-white p-3 ring-1 ring-amber-200">
				<p className="flex items-center justify-between text-xs font-bold text-slate-700">
					<span>Lomba berlangsung{k.bersama ? ` · ${manusia} tamu` : ""}</span>
					<span className="tabular-nums text-rose-600">⏱ {jam(k.sampai - kini)}</span>
				</p>
				<DaftarPeserta peserta={k.peserta} />
				{k.ikut ? (
					<button onClick={onTutup} className="mt-3 w-full rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-800">
						Kembali memancing
					</button>
				) : (
					<p className="mt-2 text-center text-xs text-slate-500">Tunggu sesi berikutnya untuk ikut</p>
				)}
			</div>
		);
	else isi = <p className="mt-3 text-center text-xs text-slate-500">Hasil lomba sedang ditampilkan</p>;
	return (
		<section className="rounded-3xl border border-amber-200 bg-amber-50/60 p-4">
			<div className="flex items-center justify-between gap-2">
				<h3 className="font-black text-slate-900">🏆 Lomba Galatama</h3>
				<span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${bersama ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-600"}`}>{bersama ? "🌐 Bersama tamu lain" : "👤 Lawan pemancing kolam"}</span>
			</div>
			<ul className="mt-2 space-y-1 text-xs leading-relaxed text-slate-600">
				{bersama ? (
					<li>• Pendaftaran 30 detik, lalu sesi {LOMBA.menit} menit bersama semua tamu yang ikut; kursi kosong diisi pemancing tetap kolam.</li>
				) : (
					<li>• Sesi {LOMBA.menit} menit melawan 5 pemancing tetap kolam. Pilih jelajah bersama untuk berlomba dengan tamu lain.</li>
				)}
				<li>
					• Juara ditentukan <b>ikan terberat (babon)</b>; bila sama, <b>total berat</b>.
				</li>
				<li>• Mode AUTO dimatikan selama lomba — adu keterampilan murni. Tanpa tangkapan tidak dapat hadiah.</li>
			</ul>
			<div className="mt-3 grid grid-cols-3 gap-2 text-center">
				{LOMBA.hadiah.map((h, i) => (
					<div key={i} className="rounded-2xl bg-white px-2 py-2 ring-1 ring-amber-200">
						<p className="text-lg">{MEDALI[i]}</p>
						<p className="text-xs font-black tabular-nums text-slate-800">🪙 {angka(h)}</p>
					</div>
				))}
			</div>
			{isi}
		</section>
	);
}

export default function PanelKolam({ onTutup }) {
	const kolam = useKolam();
	const { poin } = useKoleksi();
	const kini = useDetik();
	const [galat, setGalat] = useState(null);
	const tiket = tiketAktif(kini);
	const r = kolam.rekor;
	const auto = !!joranKini().auto;

	const [sibuk, setSibuk] = useState(false);
	const jalankan = async (f, tutup = true) => {
		if (sibuk) return;
		setSibuk(true);
		const g = await f();
		setSibuk(false);
		setGalat(g);
		if (!g && tutup) onTutup?.();
	};

	return (
		<div className="space-y-4">
			<div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-900 to-emerald-800 p-4 text-white">
				<div className="pointer-events-none absolute -right-6 -top-4 text-8xl opacity-15">🦈</div>
				<p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-200">Kolam Monster DPMD</p>
				<p className="mt-1 text-sm leading-relaxed text-emerald-50/90">Isinya hanya ikan kelas <b className="text-rose-300">Monster</b> & <b className="text-amber-300">Legenda</b> — tarikannya berat, siapkan joran & senar terbaik.</p>
				<div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
					<span className="rounded-full bg-white/10 px-2.5 py-1 font-bold tabular-nums">🪙 {angka(poin)}</span>
					<span className="rounded-full bg-white/10 px-2.5 py-1">🎣 {joranKini().nama}</span>
					{auto && <span className="rounded-full bg-violet-500/80 px-2.5 py-1 font-bold">🤖 AUTO tersedia (tiket bebas)</span>}
				</div>
			</div>

			{galat && <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{galat}</p>}

			{/* tiket bebas */}
			<section className="rounded-3xl border border-slate-200 p-4">
				<div className="flex items-start justify-between gap-3">
					<div>
						<h3 className="font-black text-slate-900">🎟️ Tiket Mancing Bebas</h3>
						<p className="mt-0.5 text-xs text-slate-500">
							{TIKET.menit} menit memancing di tepi kolam · ikannya dijamin raksasa, tapi koin per tangkapan kecil (ikan milik pengelola) — hadiah besar ada di lomba
						</p>
					</div>
					{tiket && <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black tabular-nums text-emerald-700">⏱ {jam(kolam.tiketSampai - kini)}</span>}
				</div>
				<button
					onClick={() => jalankan(beliTiket)}
					disabled={poin < TIKET.harga}
					className="mt-3 w-full rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
				>
					{tiket ? `Perpanjang +${TIKET.menit} menit` : "Beli tiket"} · 🪙 {angka(TIKET.harga)}
				</button>
			</section>

			<SeksiLomba kini={kini} poin={poin} onTutup={onTutup} jalankan={jalankan} />

			{/* rekor */}
			<section className="grid grid-cols-4 gap-2 text-center">
				{[
					["Lomba", r.lomba],
					["Juara", r.juara],
					["Podium", r.podium],
					["Babon", r.babon ? `${angka(r.babon)} kg` : "—"],
				].map(([l, v]) => (
					<div key={l} className="rounded-2xl bg-slate-50 px-1 py-2 ring-1 ring-slate-200">
						<p className="text-sm font-black tabular-nums text-slate-900">{v}</p>
						<p className="text-[10px] uppercase tracking-wider text-slate-500">{l}</p>
					</div>
				))}
			</section>
			{r.babonIkan && <p className="-mt-2 text-center text-[11px] text-slate-500">Babon terberatmu: {namaIkan(r.babonIkan)}</p>}

			{/* penghuni */}
			<section>
				<h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Penghuni kolam</h3>
				<div className="grid grid-cols-3 gap-2">
					{PENGHUNI.map((i) => (
						<div key={i.id} className="rounded-2xl bg-slate-900 p-2 text-center text-white">
							<IkonIkan ikan={i} className="h-10 w-full" />
							<p className="mt-1 truncate text-[11px] font-bold">{i.nama}</p>
							<p className="text-[10px] font-bold" style={{ color: KELAS[i.kelas].warna }}>
								{KELAS[i.kelas].nama} · s.d. {angka(i.kg[1])} kg
							</p>
						</div>
					))}
				</div>
			</section>
		</div>
	);
}
