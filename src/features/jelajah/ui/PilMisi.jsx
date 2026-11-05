import { useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import { aturIkutMisi, useIkutMisi } from "../ikutMisi";

// Misi di layar hanya sebutir pil kecil; rinciannya dibuka bila tamu mau. `aktif`: ada urusan yang
// sedang dijalani tamu (tiket, lomba), jadi tetap terlihat walau misi tidak diikuti.
export default function PilMisi({ judul, kompas, aktif = false, children }) {
	const ikut = useIkutMisi();
	const [buka, setBuka] = useState(false);
	const tampil = ikut || aktif;
	return (
		<div className="pointer-events-auto flex flex-col items-end">
			<button
				type="button"
				onClick={() => setBuka((v) => !v)}
				aria-expanded={buka}
				aria-label={tampil ? `Misi: ${judul}` : "Misi, tidak diikuti"}
				className={`flex !min-h-0 h-8 max-w-[11rem] items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-bold text-white shadow ring-1 backdrop-blur sm:max-w-[16rem] ${tampil ? "bg-slate-950/75 ring-amber-300/40" : "bg-slate-950/45 ring-white/15"}`}
			>
				<span aria-hidden="true">📜</span>
				<span className="min-w-0 truncate">{tampil ? judul : "Misi"}</span>
				{tampil && kompas}
				<FiChevronDown className={`shrink-0 transition-transform ${buka ? "rotate-180" : ""}`} aria-hidden="true" />
			</button>
			{buka && (
				<div className="mt-1.5 max-h-[55vh] w-[15rem] max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-2xl bg-slate-950/85 p-2.5 text-white shadow-lg ring-1 ring-white/15 backdrop-blur">
					{children}
					{!ikut && <p className="m-0 mt-2 text-[11px] text-white/60">Misi tidak wajib. Ikuti bila ingin dipandu dan mendapat hadiah.</p>}
					<button
						type="button"
						onClick={() => aturIkutMisi(!ikut)}
						className={`mt-2 w-full rounded-lg py-1.5 text-[12px] font-bold ${ikut ? "bg-white/10 text-white/80 hover:bg-white/20" : "bg-amber-400 text-slate-900 hover:bg-amber-300"}`}
					>
						{ikut ? "Berhenti mengikuti misi" : "Ikuti misi"}
					</button>
				</div>
			)}
		</div>
	);
}
