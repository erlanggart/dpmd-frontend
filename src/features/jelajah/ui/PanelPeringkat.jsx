import { useEffect, useState } from "react";
import { mintaPeringkat, useMultipemain } from "../multipemain";
import { IKAN_PER_ID } from "../pancing";

const TAB = [
	{ id: "level", judul: "⭐ Level", nilai: (c) => `Lv ${c.level}` },
	{ id: "ikan", judul: "🐟 Terberat", nilai: (c) => `${c.kg.toLocaleString("id-ID")} kg${c.ikan ? ` · ${IKAN_PER_ID[c.ikan]?.nama ?? ""}` : ""}` },
	{ id: "jenis", judul: "📖 Koleksi", nilai: (c) => `${c.jenis} jenis` },
	{ id: "balap", judul: "🏍️ Balap", nilai: (c) => `${c.balap.toFixed(2)} dtk` },
];
const MEDALI = ["🥇", "🥈", "🥉"];

// Papan peringkat semua tamu jelajah bersama (disimpan server, bertahan antar kunjungan).
export default function PanelPeringkat({ namaSaya }) {
	const { status } = useMultipemain();
	const [tab, setTab] = useState("level");
	const [data, setData] = useState(null);
	const [galat, setGalat] = useState(null);

	useEffect(() => {
		if (status !== "tersambung") return;
		let batal = false;
		const muat = () =>
			mintaPeringkat()
				.then((d) => !batal && (setData(d), setGalat(null)))
				.catch(() => !batal && setGalat("Gagal memuat papan peringkat."));
		muat();
		const t = setInterval(muat, 15000);
		return () => {
			batal = true;
			clearInterval(t);
		};
	}, [status]);

	if (status !== "tersambung")
		return <p className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-600">Papan peringkat tersedia di mode <b>Bersama</b>. Masuk lagi lewat layar awal dan pilih mode Bersama.</p>;

	const t = TAB.find((x) => x.id === tab);
	const daftar = data?.[tab] || [];
	return (
		<div>
			<div className="mb-3 grid grid-cols-4 gap-1.5">
				{TAB.map((x) => (
					<button key={x.id} onClick={() => setTab(x.id)} className={`rounded-xl px-1 py-2 text-xs font-bold ${tab === x.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
						{x.judul}
					</button>
				))}
			</div>
			{galat && <p className="mb-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{galat}</p>}
			{!data && !galat && <p className="py-6 text-center text-sm text-slate-500">Memuat…</p>}
			{data && !daftar.length && <p className="py-6 text-center text-sm text-slate-500">Belum ada catatan. Jadilah yang pertama!</p>}
			<ol className="space-y-1.5">
				{daftar.map((c, i) => {
					const saya = c.nama.toLowerCase() === namaSaya?.toLowerCase();
					return (
						<li key={c.nama + i} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${saya ? "bg-amber-50 ring-1 ring-amber-300" : i < 3 ? "bg-slate-50" : ""}`}>
							<span className="w-7 text-center text-lg font-black text-slate-500">{MEDALI[i] || i + 1}</span>
							<span className="min-w-0 flex-1 truncate font-bold text-slate-900">
								{c.nama} {saya && <span className="text-xs font-semibold text-amber-700">(Anda)</span>}
							</span>
							<span className="shrink-0 text-sm font-black tabular-nums text-slate-700">{t.nilai(c)}</span>
						</li>
					);
				})}
			</ol>
			<p className="mt-3 text-center text-xs text-slate-500">Diperbarui tiap 15 detik · peringkat milik semua tamu Jelajah Kantor.</p>
		</div>
	);
}
