import { FiMap, FiX } from "react-icons/fi";

// Lensa peta bundar tembus pandang, supaya dunia di belakangnya tetap terlihat. Tombol di luar
// lingkaran karena isi peta bisa diketuk (pindah ruang).
export default function BingkaiPeta({ label, onPeta, onTutup, perhatian = 0, className = "", children }) {
	return (
		<div className={`relative aspect-square w-full ${className}`}>
			<div className="absolute inset-0 overflow-hidden rounded-full bg-white/25 shadow-lg ring-2 ring-white/60 backdrop-blur-[2px]">{children}</div>
			<p className="pointer-events-none absolute inset-x-0 top-1 m-0 flex justify-center">
				<span className="max-w-[70%] truncate rounded-full bg-slate-950/55 px-1.5 text-[9px] font-bold leading-4 text-white">{label}</span>
			</p>
			{onTutup && (
				<button type="button" onClick={onTutup} aria-label="Tutup peta" title="Tutup peta" className="absolute -right-1 -top-1 flex !min-h-0 h-8 w-8 !min-w-0 items-center justify-center rounded-full bg-slate-950/70 text-[13px] text-white shadow ring-1 ring-white/30 hover:bg-slate-900">
					<FiX />
				</button>
			)}
			<button type="button" onClick={onPeta} aria-label={`Buka peta kecamatan${perhatian > 0 ? `, ${perhatian} perlu perhatian` : ""}`} title="Buka peta kecamatan" className="absolute -bottom-1 -right-1 flex !min-h-0 h-8 w-8 !min-w-0 items-center justify-center rounded-full bg-slate-950/70 text-[13px] text-white shadow ring-1 ring-white/30 hover:bg-slate-900">
				<FiMap />
				{perhatian > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold leading-none text-white">{perhatian}</span>}
			</button>
		</div>
	);
}
