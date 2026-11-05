import { MEDALI_JETSKI } from "../scene/acaraData";
import { kantor, useKantor } from "../kantorHidup";

// Pendaftaran Lomba Jetski di stand panitia: aturan, tabel medali, rekor pribadi.
export default function PanelAcara({ onMulai }) {
	useKantor();
	const medali = MEDALI_JETSKI.find((m) => m.id === kantor.hari.medali);
	return (
		<div className="space-y-4">
			<p className="m-0 text-[15px] leading-relaxed text-slate-700">Lewati 7 gerbang di Situ Pemda secepat mungkin. Jetski disediakan panitia.</p>
			<table className="w-full overflow-hidden rounded-2xl text-left text-sm ring-1 ring-slate-200">
				<thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
					<tr><th className="px-3 py-2">Medali</th><th className="px-3 py-2">Waktu</th><th className="px-3 py-2 text-right">Hadiah</th></tr>
				</thead>
				<tbody>
					{MEDALI_JETSKI.map((m) => (
						<tr key={m.id} className="border-t border-slate-100">
							<td className="px-3 py-2 font-semibold">{m.ikon} {m.nama}</td>
							<td className="px-3 py-2 tabular-nums">≤ {m.batas} dtk</td>
							<td className="px-3 py-2 text-right font-bold tabular-nums text-amber-600">🪙 {m.koin}</td>
						</tr>
					))}
				</tbody>
			</table>
			<div className="grid grid-cols-2 gap-2 text-center">
				<div className="rounded-2xl bg-amber-50 px-3 py-3 ring-1 ring-amber-100">
					<p className="m-0 text-xs text-slate-600">Rekor Anda</p>
					<p className="m-0 text-xl font-bold tabular-nums text-slate-900">{kantor.rekor != null ? `${kantor.rekor.toFixed(1)} dtk` : "—"}</p>
				</div>
				<div className="rounded-2xl bg-amber-50 px-3 py-3 ring-1 ring-amber-100">
					<p className="m-0 text-xs text-slate-600">Medali hari ini</p>
					<p className="m-0 text-xl font-bold text-slate-900">{medali ? `${medali.ikon} ${medali.nama}` : "—"}</p>
				</div>
			</div>
			<button onClick={onMulai} className="w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:brightness-110">Mulai lomba</button>
		</div>
	);
}
