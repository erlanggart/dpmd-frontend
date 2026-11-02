import { Suspense, lazy, useMemo, useState } from "react";
import { GAYA, JENIS_GAYA, cobaGaya, kenakanGaya, pakaiGaya, punya, useLemari } from "../lemari";
import { useKoleksi } from "../pancing";

const angka = (n) => n.toLocaleString("id-ID");
const PratinjauAvatar = lazy(() => import("./PratinjauAvatar"));

// Panel gaya dalam tiga mode:
// - "toko"  : di Distro Gaya — pilih barang, lihat di pratinjau, lalu beli & pakai;
// - "coba"  : di bilik ruang coba — barang yang dipilih langsung dicoba di badan (gratis,
//             dilepas saat keluar bilik), lalu beli yang cocok;
// - "lemari": dari HUD di mana saja — hanya ganti dengan yang sudah dimiliki.
// Kiri: pratinjau avatar 3D (bisa diputar) + barang terpilih dengan satu tombol aksi.
// Kanan: tab jenis & kisi kartu barang.
export default function PanelGaya({ mode = "lemari", dasar }) {
	const l = useLemari();
	const { poin: koin } = useKoleksi();
	const [jenis, setJenis] = useState("t");
	const tampil = l.coba || l.pakai;
	const [pilih, setPilih] = useState({ k: "t", i: tampil.t });
	const [kabar, setKabar] = useState(null);

	const gayaPratinjau = { ...tampil, [pilih.k]: pilih.i };
	const kunci = JSON.stringify(gayaPratinjau);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const penampilan = useMemo(() => dasar && kenakanGaya(dasar, gayaPratinjau), [dasar, kunci]);

	const item = GAYA[pilih.k].isi[pilih.i];
	const dipakai = l.pakai[pilih.k] === pilih.i;
	const milik = punya(pilih.k, pilih.i);
	const kurang = item.harga - koin;

	const pilihBarang = (k, i) => {
		setPilih({ k, i });
		setKabar(null);
		if (mode === "coba") cobaGaya(k, i);
	};
	const gantiJenis = (k) => {
		setJenis(k);
		pilihBarang(k, tampil[k]);
	};
	const aksi = () => {
		const baru = !milik;
		const gagal = pakaiGaya(pilih.k, pilih.i);
		setKabar(gagal ? { ok: false, teks: gagal } : { ok: true, teks: `${item.nama} ${baru ? "dibeli & " : ""}dipakai ✨` });
	};

	let tombol;
	if (dipakai) tombol = { teks: "✓ Sedang dipakai", nonaktif: true };
	else if (milik) tombol = { teks: "Pakai sekarang" };
	else if (mode === "lemari") tombol = { teks: "Beli dulu di Distro Gaya", nonaktif: true };
	else if (kurang > 0) tombol = { teks: `Koin kurang 🪙 ${angka(kurang)}`, nonaktif: true };
	else tombol = { teks: `Beli & pakai · 🪙 ${angka(item.harga)}` };

	return (
		<div className="sm:grid sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] sm:gap-5">
			{/* --- pratinjau & barang terpilih --- */}
			<aside className="sm:sticky sm:top-0 sm:self-start">
				{penampilan && (
					<div className="relative h-56 overflow-hidden rounded-2xl bg-gradient-to-b from-violet-100 via-slate-50 to-slate-200 ring-1 ring-slate-200 sm:h-80">
						<Suspense fallback={<div className="flex h-full items-center justify-center text-xs text-slate-400">Memuat pratinjau…</div>}>
							<PratinjauAvatar penampilan={penampilan} />
						</Suspense>
						<span className="pointer-events-none absolute right-2 top-2 rounded-full bg-amber-100/95 px-2.5 py-1 text-xs font-black text-amber-800 shadow">🪙 {angka(koin)}</span>
						<span className="pointer-events-none absolute left-2 top-2 whitespace-nowrap rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-slate-500">⟲ seret untuk memutar</span>
					</div>
				)}
				<div className="mt-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
					<div className="flex items-center gap-3">
						<span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl shadow-inner ring-1 ring-black/10" style={{ background: item.warna || "#f1f5f9" }}>
							{item.ikon}
						</span>
						<div className="min-w-0 flex-1">
							<p className="truncate font-black text-slate-900">{item.nama}</p>
							<p className="text-xs text-slate-500">
								{GAYA[pilih.k].judul} · {dipakai ? "sedang dipakai" : milik ? "sudah dimiliki" : item.harga ? `🪙 ${angka(item.harga)}` : "gratis"}
							</p>
						</div>
					</div>
					<button
						onClick={aksi}
						disabled={tombol.nonaktif}
						className="mt-3 w-full rounded-xl bg-violet-600 py-3 text-sm font-black text-white shadow hover:bg-violet-500 disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
					>
						{tombol.teks}
					</button>
					{kurang > 0 && !milik && mode !== "lemari" && <p className="mt-2 text-center text-[11px] text-slate-500">Cari koin dari memancing, peti hadiah, dan misi harian.</p>}
					{kabar && <p className={`mt-2 rounded-lg px-3 py-1.5 text-center text-xs font-semibold ${kabar.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>{kabar.teks}</p>}
				</div>
				{mode === "coba" && <p className="mt-2 text-center text-[11px] text-violet-700">🪞 Barang yang dipilih langsung dicoba di badan Anda. Keluar bilik = pakaian coba dilepas.</p>}
				{mode === "lemari" && <p className="mt-2 text-center text-[11px] text-slate-500">Koleksi baru dibeli di 👕 Distro Gaya, sebelah warung mie ayam seberang kantor.</p>}
			</aside>

			{/* --- jenis & kisi barang --- */}
			<div className="mt-4 sm:mt-0">
				<div className="mb-3 grid grid-cols-4 gap-1.5">
					{JENIS_GAYA.map((k) => {
						const dimiliki = GAYA[k].isi.filter((_, i) => punya(k, i)).length;
						return (
							<button
								key={k}
								onClick={() => gantiJenis(k)}
								className={`rounded-xl px-1 py-2 text-xs font-bold transition ${jenis === k ? "bg-slate-900 text-white shadow" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
							>
								<span className="block text-lg leading-none">{GAYA[k].ikon}</span>
								<span className="mt-1 block">{GAYA[k].judul}</span>
								<span className={`block text-[10px] font-semibold ${jenis === k ? "text-slate-300" : "text-slate-400"}`}>
									{dimiliki}/{GAYA[k].isi.length}
								</span>
							</button>
						);
					})}
				</div>
				<ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
					{GAYA[jenis].isi.map((b, i) => {
						const dipilih = pilih.k === jenis && pilih.i === i;
						const sedangDipakai = l.pakai[jenis] === i;
						const sudahPunya = punya(jenis, i);
						const mampu = koin >= b.harga;
						if (mode === "lemari" && !sudahPunya) return null;
						return (
							<li key={i}>
								<button
									onClick={() => pilihBarang(jenis, i)}
									className={`flex h-full w-full flex-col items-center gap-1.5 rounded-2xl p-3 text-center ring-1 transition ${
										dipilih ? "bg-violet-50 ring-2 ring-violet-500" : "bg-white ring-slate-200 hover:bg-slate-50"
									}`}
								>
									<span className="flex h-14 w-14 items-center justify-center rounded-full text-3xl shadow-inner ring-1 ring-black/10" style={{ background: b.warna || "#f1f5f9" }}>
										{b.ikon}
									</span>
									<span className="line-clamp-2 min-h-[2.5em] text-xs font-bold leading-tight text-slate-800">{b.nama}</span>
									{sedangDipakai ? (
										<span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">✓ Dipakai</span>
									) : sudahPunya ? (
										<span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-black text-sky-700">Dimiliki</span>
									) : (
										<span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${mampu ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-400"}`}>🪙 {angka(b.harga)}</span>
									)}
								</button>
							</li>
						);
					})}
				</ul>
				{mode === "lemari" && GAYA[jenis].isi.every((_, i) => i === 0 || !punya(jenis, i)) && (
					<p className="mt-3 rounded-xl bg-slate-50 p-3 text-center text-xs text-slate-500">Belum punya {GAYA[jenis].judul.toLowerCase()} lain. Belanja di Distro Gaya!</p>
				)}
			</div>
		</div>
	);
}
