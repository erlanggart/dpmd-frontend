import { FiX } from "react-icons/fi";
import { IKAN, KELAS, panjangCm, syaratTeks, useKoleksi } from "../pancing";
import IkonIkan from "./IkonIkan";

const angka = (n) => n.toLocaleString("id-ID", { maximumFractionDigits: 2 });

// Buku koleksi ikan: yang sudah ditangkap tampil berwarna dengan rekor terberat,
// yang belum tampil sebagai bayangan beserta petunjuk tempat munculnya.
export default function AlbumIkan({ onTutup }) {
	const { koleksi, poin, tangkapan } = useKoleksi();
	const dapat = IKAN.filter((i) => koleksi[i.id]).length;

	return (
		<div className="pointer-events-auto fixed inset-0 z-40 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onTutup}>
			<div
				role="dialog"
				aria-label="Album ikan Situ Pemda"
				className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-gradient-to-b from-sky-950 to-slate-950 text-white shadow-2xl ring-1 ring-white/10 sm:rounded-3xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
					<div>
						<p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-300">Album Ikan Situ Pemda</p>
						<p className="mt-1 text-2xl font-black">
							{dapat}/{IKAN.length} <span className="text-base font-semibold text-slate-300">jenis ditemukan</span>
						</p>
						<p className="mt-0.5 text-xs text-slate-400">
							{angka(tangkapan)} tangkapan · {angka(poin)} poin
						</p>
					</div>
					<button onClick={onTutup} aria-label="Tutup album" className="rounded-full bg-white/10 p-2 hover:bg-white/20">
						<FiX className="h-5 w-5" />
					</button>
				</div>
				<div className="grid min-h-0 auto-rows-max grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-3">
					{IKAN.map((ikan) => {
						const k = KELAS[ikan.kelas];
						const c = koleksi[ikan.id];
						const syarat = syaratTeks(ikan);
						return (
							<div key={ikan.id} className="relative overflow-hidden rounded-2xl bg-white/5 p-3 ring-1" style={{ "--tw-ring-color": c ? `${k.warna}88` : "rgba(255,255,255,0.08)" }}>
								<span className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider" style={{ background: `${k.warna}33`, color: k.warna }}>
									{k.nama}
								</span>
								<IkonIkan ikan={ikan} siluet={!c} className="mx-auto mt-3 h-14 w-full" />
								<p className="mt-2 truncate text-sm font-bold">{c ? ikan.nama : "???"}</p>
								{c ? (
									<p className="text-[11px] leading-snug text-slate-300">
										Terberat <b className="text-white">{angka(c.terberat)} kg</b> · {panjangCm(ikan, c.terberat)} cm
										<br />
										Ditangkap {c.jumlah}×
									</p>
								) : (
									<p className="text-[11px] leading-snug text-slate-400">{syarat ? `Muncul ${syarat}` : "Bisa muncul di mana saja di situ"}</p>
								)}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
