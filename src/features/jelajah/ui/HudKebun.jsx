import { KOMODITAS, aksiPetak, kapasitasGembor, kebun, peningkatanKebun, tingkatKebun, useKebun } from "../kebun";
import { useKoleksi } from "../pancing";
import { infoGame } from "../rekorWilayah";
import { pesananHariIni, useBangun } from "../bangunWilayah";
import { usahaKini } from "../usahaWilayah";
import { TENAGA_LARI, useTenaga } from "../tenaga";
import { uiWilayah, useUiWilayah } from "../wilayah/uiWilayah";

/*
 * HUD kebun di dunia kecamatan: tenaga, komoditas & tingkat (dengan XP menuju
 * tingkat berikutnya), isi gembor, pupuk, bawaan, pesanan pengepul, dan
 * keadaan petak di depan tokoh (mis. "Padi tumbuh 64% · ★★★").
 */
export default function HudKebun() {
	useKebun();
	useBangun();
	useUiWilayah();
	const tenaga = useTenaga();
	const koin = useKoleksi().poin;
	const depan = uiWilayah.depan;

	const k = KOMODITAS[kebun.komoditas];
	const kap = kapasitasGembor();
	const tingkat = tingkatKebun();
	const u = usahaKini();
	const info = infoGame(u.id, kebun.kecamatan);
	const berikut = peningkatanKebun().find((p) => p.tingkat > tingkat);
	const bawa = Object.entries(kebun.bawa).filter(([, n]) => n > 0);
	const ps = kebun.pesanan;
	const punya = ps ? kebun.bawa[ps.komoditas] || 0 : 0;
	const pesananKab = pesananHariIni().filter((x) => !x.selesai && x.kom === kebun.komoditas);
	const aksi = depan != null ? aksiPetak(depan) : null;
	const warnaTenaga = tenaga < TENAGA_LARI ? "#ef4444" : tenaga < 50 ? "#f59e0b" : "#22c55e";

	return (
		<div className="pointer-events-none absolute left-3 top-[3.5rem] w-[calc(100%-1.5rem)] space-y-1.5 sm:left-4 sm:top-[4.5rem] sm:w-[16rem] sm:space-y-2">
			{/* HP: satu baris tipis supaya layar tetap lapang; rincian di layar lebar */}
			<div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-white sm:hidden">
				<span className="flex h-6 items-center gap-1.5 rounded-full bg-slate-950/60 px-2 backdrop-blur">
					❤
					<span className="h-1.5 w-10 overflow-hidden rounded-full bg-black/40"><span className="block h-full rounded-full" style={{ width: `${tenaga}%`, background: warnaTenaga }} /></span>
					<span className="tabular-nums">{tenaga}</span>
				</span>
				<span className="flex h-6 items-center rounded-full bg-amber-400 px-2 text-slate-900">🪙 {koin}</span>
				<span className="flex h-6 items-center rounded-full bg-slate-950/60 px-2 backdrop-blur" title={`${k.nama} tingkat ${tingkat}`}>{k.ikon} {tingkat}</span>
				<span className="flex h-6 items-center rounded-full bg-slate-950/60 px-2 tabular-nums backdrop-blur" title={u.wadah.nama}>{u.wadah.ikon} {kebun.gembor}/{kap}</span>
				<span className="flex h-6 items-center rounded-full bg-slate-950/60 px-2 tabular-nums backdrop-blur" title={u.panen.hasil}>🧺 {bawa.reduce((a, [, n]) => a + n, 0)}</span>
			</div>
			{tenaga < TENAGA_LARI && tenaga > 0 && <p className="m-0 text-[10.5px] font-semibold text-rose-200 [text-shadow:0_1px_2px_#000] sm:hidden">Lemas! Makan di Warung Bu Imas</p>}
			<div className="hidden rounded-2xl bg-slate-950/75 px-3 py-2 text-white shadow-lg ring-1 ring-white/10 backdrop-blur sm:block">
				<div className="mb-1 flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider">
					<span>❤ Tenaga</span>
					<span className="tabular-nums">{tenaga}</span>
				</div>
				<div className="h-2 overflow-hidden rounded-full bg-black/40">
					<div className={`h-full rounded-full transition-all duration-300 ${tenaga < TENAGA_LARI ? "animate-pulse" : ""}`} style={{ width: `${tenaga}%`, background: warnaTenaga }} />
				</div>
				{tenaga < TENAGA_LARI && tenaga > 0 && <p className="m-0 mt-1 text-[10.5px] font-semibold text-rose-200">Lemas! Makan di Warung Bu Imas</p>}
			</div>
			<div className="hidden rounded-2xl bg-slate-950/75 p-3 text-white shadow-lg ring-1 ring-white/10 backdrop-blur sm:block">
				<p className="m-0 hidden text-[11px] font-semibold text-emerald-300 sm:block">{u.tempat} · Kec. {kebun.kecamatan}{info.bintang ? ` · ${"★".repeat(info.bintang)}` : ""}</p>
				<p className="m-0 text-[13px] font-extrabold sm:text-[15px]">{k.ikon} {k.nama} · Tingkat {tingkat}</p>
				{berikut && (
					<span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/15">
						<span className="block h-full rounded-full bg-lime-400" style={{ width: `${Math.min(100, info.kemajuan * 100)}%` }} />
					</span>
				)}
				<div className="mt-2 flex items-center gap-2 text-[12px]">
					<span title={u.wadah.nama}>{u.wadah.ikon}</span>
					<span className="h-2 flex-1 overflow-hidden rounded-full bg-white/15">
						<span className="block h-full rounded-full bg-sky-400 transition-[width]" style={{ width: `${(kebun.gembor / kap) * 100}%` }} />
					</span>
					<span className="tabular-nums">{kebun.gembor}/{kap}</span>
					<span className="ml-1" title={u.pupuk.nama}>{u.pupuk.ikon} {kebun.pupuk}</span>
				</div>
				{kebun.gembor === 0 && <p className="m-0 mt-1 text-[11px] font-semibold text-sky-300">{u.rawat.habis}</p>}
				<p className="m-0 mt-2 text-[12px] text-white/80">
					🧺 {bawa.length ? bawa.map(([kom, n]) => `${KOMODITAS[kom].ikon} ${n} ${KOMODITAS[kom].satuan}`).join(" · ") : `Belum ada ${u.panen.hasil}`}
				</p>
				{ps && (
					<div className="mt-2 hidden rounded-xl bg-white/10 p-2 sm:block">
						<p className="m-0 text-[11px] font-semibold text-amber-300">📋 Pesanan {u.pembeli.peran.toLowerCase()}</p>
						<p className="m-0 text-[12px]">{ps.jumlah} {KOMODITAS[ps.komoditas].satuan} {KOMODITAS[ps.komoditas].nama.toLowerCase()} · bonus 🪙 {ps.bonus}</p>
						<span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-white/15"><span className="block h-full rounded-full bg-amber-400" style={{ width: `${Math.min(1, punya / ps.jumlah) * 100}%` }} /></span>
					</div>
				)}
				{pesananKab.map((x) => (
					<div key={x.id} className="mt-2 hidden rounded-xl bg-white/10 p-2 sm:block">
						<p className="m-0 text-[11px] font-semibold text-sky-300">📦 Pesanan kabupaten</p>
						<p className="m-0 text-[12px]">{x.jumlah} {KOMODITAS[x.kom].satuan} → Kec. {x.tujuan} · 🪙 {x.koin}</p>
						<span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-white/15"><span className="block h-full rounded-full bg-sky-400" style={{ width: `${Math.min(1, (kebun.bawa[x.kom] || 0) / x.jumlah) * 100}%` }} /></span>
					</div>
				))}
				<p className="m-0 mt-2 hidden text-[11px] font-semibold text-amber-200 sm:block">
					🔥 Panen beruntun terbaik {info.rekor}{info.ambangBerikut ? ` · ${"★".repeat(info.bintang + 1)} di ${info.ambangBerikut}` : " · bintang penuh"}
				</p>
				{berikut && <p className="m-0 mt-1 hidden text-[11px] text-white/55 sm:block">Tingkat {berikut.tingkat}: {berikut.teks}</p>}
			</div>
			{aksi && !aksi.jenis && (
				<div className="rounded-xl bg-slate-950/70 px-3 py-2 text-[12px] font-semibold text-white backdrop-blur">{aksi.label}</div>
			)}
		</div>
	);
}
