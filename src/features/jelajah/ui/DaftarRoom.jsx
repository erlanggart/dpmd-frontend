import { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";
import { posisi } from "../jelajahStore";
import { beriHadiah, pemainLain, sapaPemain } from "../multipemain";
import { ubahTenaga } from "../tenaga";

// Daftar tamu yang sedang berada di room jelajah bersama: nama, sedang apa, dan jaraknya.
// Diperbarui tiap detik selama terbuka.

const KEGIATAN = {
	mancing: "🎣 Memancing",
	perahu: "🚣 Di perahu",
	mobil: "🚗 Mengemudi mobil",
	motor: "🏍️ Naik motor",
	duduk: "🪑 Duduk",
	jalan: "🚶 Berjalan-jalan",
};

function kegiatan(s) {
	if (!s) return "Baru masuk";
	if (s.pc && s.pc.f === 5) return "🐟 Baru dapat ikan!";
	if (s.pc && s.pc.f === 4) return "🎣 Sedang adu tarik ikan";
	const k = KEGIATAN[s.pose] || KEGIATAN.jalan;
	return s.kend && (s.kend.kursi ?? 0) > 0 && s.pose !== "perahu" ? `${k} (penumpang)` : k;
}

const inisial = (n) => (n || "?").trim().charAt(0).toUpperCase();

export default function DaftarRoom({ namaSaya, ruang, onTutup }) {
	const [, setDetak] = useState(0);
	useEffect(() => {
		const t = setInterval(() => setDetak((d) => d + 1), 1000);
		return () => clearInterval(t);
	}, []);

	const daftar = [...pemainLain.entries()]
		.map(([id, p]) => ({ id, nama: p.profil?.nama || "Tamu", s: p.s, jarak: p.s ? Math.hypot(p.s.x - posisi.x, p.s.z - posisi.z) : null }))
		.sort((a, b) => (a.jarak ?? 1e9) - (b.jarak ?? 1e9));

	return (
		<div className="absolute right-0 top-12 z-40 w-72 overflow-hidden rounded-2xl bg-white text-slate-800 shadow-2xl ring-1 ring-black/10">
			<div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
				<div>
					<p className="text-sm font-black">{daftar.length + 1} orang di room</p>
					{ruang && <p className="text-[11px] text-slate-500">Kantor #{ruang}</p>}
				</div>
				<button onClick={onTutup} aria-label="Tutup daftar" className="rounded-full bg-slate-100 p-1.5 hover:bg-slate-200">
					<FiX />
				</button>
			</div>
			<ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
				<li className="flex items-center gap-3 bg-emerald-50/60 px-4 py-2.5">
					<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-black text-white">{inisial(namaSaya)}</span>
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-bold">
							{namaSaya} <span className="font-medium text-emerald-700">(Anda)</span>
						</p>
					</div>
				</li>
				{daftar.map((t) => (
					<li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
						<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-600 text-sm font-black text-white">{inisial(t.nama)}</span>
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-bold">{t.nama}</p>
							<p className="truncate text-[11px] text-slate-500">
								{kegiatan(t.s)}
								{t.jarak != null && ` · ${t.jarak < 1000 ? Math.round(t.jarak) : "> 1000"} m`}
							</p>
						</div>
						<button onClick={() => sapaPemain(t.id)} className="shrink-0 rounded-lg bg-sky-50 px-2 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100" aria-label={`Sapa ${t.nama}`}>
							👋
						</button>
						<button
							onClick={() => {
								const gagal = beriHadiah(t.id, 20);
								ubahTenaga(0, gagal ? { teks: gagal, jenis: "buruk" } : { teks: `🎁 20 koin terkirim ke ${t.nama}`, jenis: "baik" });
							}}
							className="shrink-0 rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 hover:bg-amber-100"
							aria-label={`Beri 20 koin ke ${t.nama}`}
							title="Beri 20 koin"
						>
							🎁20
						</button>
					</li>
				))}
				{!daftar.length && <li className="px-4 py-4 text-center text-xs text-slate-500">Belum ada tamu lain. Ajak rekan membuka Jelajah Kantor mode Bersama!</li>}
			</ul>
		</div>
	);
}
