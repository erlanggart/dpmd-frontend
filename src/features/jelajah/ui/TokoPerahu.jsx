import { Suspense, lazy, useState } from "react";
import { useKoleksi } from "../pancing";
import { MODEL, beliKendaraan, catUlang, milikSaya, panggilKendaraan, useGarasi } from "../garasi";

// Toko Perahu: kiri pratinjau 3D perahu terpilih (warna langsung terlihat), kanan daftar
// model & spesifikasinya. Pola tata letak seperti PanelGaya.

const PratinjauKapal = lazy(() => import("./PratinjauKapal"));
const angka = (n) => n.toLocaleString("id-ID");

function Bilah({ label, nilai, warna }) {
	return (
		<div>
			<div className="text-[10px] text-slate-500">{label}</div>
			<div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
				<div className="h-full rounded-full" style={{ width: `${Math.max(8, Math.min(100, nilai * 100))}%`, background: warna }} />
			</div>
		</div>
	);
}

export default function TokoPerahu({ onTutup }) {
	useGarasi();
	const { poin } = useKoleksi();
	const [id, setId] = useState(MODEL.perahu[0].id);
	const [pilihWarna, setPilihWarna] = useState({});
	const [pesan, setPesan] = useState(null);
	const m = MODEL.perahu.find((x) => x.id === id);
	const punya = milikSaya("perahu", m.id);
	const warna = pilihWarna[m.id] || punya?.warna || m.warna[0];
	return (
		<div className="sm:grid sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] sm:gap-5">
			<aside className="sm:sticky sm:top-0 sm:self-start">
				<div className="relative h-[40dvh] overflow-hidden rounded-2xl bg-gradient-to-b from-sky-300 via-sky-100 to-sky-100 ring-1 ring-slate-200 sm:h-[min(60dvh,30rem)]">
					<Suspense fallback={<div className="flex h-full items-center justify-center text-xs text-slate-400">Memuat pratinjau…</div>}>
						<PratinjauKapal model={m} warna={warna} />
					</Suspense>
				</div>
				<p className="mt-1 text-center text-[11px] text-slate-400">Seret untuk memutar</p>
			</aside>
			<div className="mt-3 space-y-3 sm:mt-0">
				<div className="flex items-center justify-between rounded-2xl bg-amber-50 px-3 py-2 ring-1 ring-amber-200">
					<span className="text-xs font-bold text-amber-700">Koin kamu</span>
					<span className="text-base font-black tabular-nums text-amber-900">🪙 {angka(poin)}</span>
				</div>
				<p className="rounded-2xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 ring-1 ring-sky-200">⚓ Perahu dayung gratis tersedia di tiap dermaga. Naik tingkat ke perahu bermesin sampai jetski!</p>
				<ul className="space-y-1.5">
					{MODEL.perahu.map((x) => (
						<li key={x.id}>
							<button
								onClick={() => setId(x.id)}
								className={`flex w-full items-center gap-2 rounded-2xl border px-3 py-2 text-left text-sm transition ${x.id === id ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
							>
								<span className="text-xl">{x.ikon}</span>
								<span className="min-w-0 flex-1 truncate font-bold text-slate-900">{x.nama}</span>
								{milikSaya("perahu", x.id) && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">DIMILIKI</span>}
								<span className="shrink-0 text-xs font-black tabular-nums text-amber-700">🪙 {angka(x.harga)}</span>
							</button>
						</li>
					))}
				</ul>
				<div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-3">
					<div>
						<p className="text-sm font-black text-slate-900">{m.nama}</p>
						<p className="text-xs leading-snug text-slate-500">{m.ket}</p>
					</div>
					<div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
						<Bilah label="Kecepatan" nilai={m.laju} warna="#0ea5e9" />
						<Bilah label="Akselerasi" nilai={m.gas / 1.4} warna="#f59e0b" />
					</div>
					<p className="text-[11px] text-slate-500">
						👥 {m.kursi} kursi · {m.bermesin ? "⚙️ Bermesin" : "🛶 Didayung"}
					</p>
					<div className="flex flex-wrap items-center gap-1.5">
						{m.warna.map((w) => (
							<button
								key={w}
								onClick={() => {
									setPilihWarna((p) => ({ ...p, [m.id]: w }));
									if (punya) catUlang("perahu", m.id, w);
								}}
								aria-label={`Warna ${w}`}
								className={`h-7 w-7 rounded-full ring-2 transition ${warna === w ? "scale-110 ring-slate-900" : "ring-slate-200"}`}
								style={{ background: w }}
							/>
						))}
					</div>
					{pesan && <p className={`rounded-2xl px-3 py-2 text-sm font-semibold ${pesan.startsWith("✅") ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>{pesan}</p>}
					{punya ? (
						<button
							onClick={() => {
								const galat = panggilKendaraan("perahu", m.id);
								setPesan(galat);
								if (galat === null) onTutup?.();
							}}
							className="w-full rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-500"
						>
							Panggil ke dekatku
						</button>
					) : (
						<button
							onClick={() => setPesan(beliKendaraan("perahu", m.id, warna) ?? `✅ ${m.nama} sudah di air dekatmu!`)}
							disabled={poin < m.harga}
							className="w-full rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
						>
							Beli · 🪙 {angka(m.harga)}
						</button>
					)}
					<p className="text-xs leading-relaxed text-slate-500">Dibeli sekali, lalu dipanggil kapan saja dari menu ☰ → Garasi saya (dari dekat situ). Warna bisa diganti gratis.</p>
				</div>
			</div>
		</div>
	);
}
