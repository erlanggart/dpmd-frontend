import { Volume2, VolumeX } from "lucide-react";
import { aturSuara, useSuaraAktif } from "../../utils/suaraUi";

/**
 * Sakelar efek suara antarmuka (berlaku di seluruh aplikasi, diingat browser).
 * varian "ikon": tombol bulat kecil untuk header; "baris": selebar menu sidebar, dengan label.
 * className menimpa/menambah gaya bawaan agar cocok dengan layout pemakainya.
 */
export default function TombolSuara({ varian = "ikon", className = "", ringkas = false }) {
	const nyala = useSuaraAktif();
	const Ikon = nyala ? Volume2 : VolumeX;
	const label = nyala ? "Matikan efek suara" : "Nyalakan efek suara";

	if (varian === "baris") {
		return (
			<button type="button" onClick={() => aturSuara(!nyala)} aria-pressed={nyala} title={label}
				className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${className}`}>
				<Ikon className={`h-5 w-5 shrink-0 ${nyala ? "" : "opacity-60"}`} />
				{!ringkas && <span className="truncate">{nyala ? "Suara aktif" : "Suara mati"}</span>}
			</button>
		);
	}
	return (
		<button type="button" onClick={() => aturSuara(!nyala)} aria-pressed={nyala} title={label} aria-label={label}
			className={`inline-flex items-center justify-center rounded-xl p-2 transition-colors ${className}`}>
			<Ikon className={`h-5 w-5 ${nyala ? "" : "opacity-60"}`} />
		</button>
	);
}
