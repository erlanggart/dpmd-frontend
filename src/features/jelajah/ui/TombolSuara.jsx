import { useEffect, useState } from "react";
import { FiVolume2, FiVolumeX } from "react-icons/fi";
import { aturSuara, dengarMati, suaraMati } from "../suaraPancing";

// Saklar semua suara game, di bilah atas kantor maupun dunia kecamatan.
export default function TombolSuara() {
	const [mati, setMati] = useState(suaraMati.nilai);
	useEffect(() => dengarMati(setMati), []);
	const label = mati ? "Nyalakan suara" : "Matikan suara";
	return (
		<button
			type="button"
			onClick={() => aturSuara(!mati)}
			aria-label={label}
			aria-pressed={mati}
			title={label}
			className="pointer-events-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/90 text-slate-700 shadow-md ring-1 ring-black/5 backdrop-blur hover:bg-white"
		>
			{mati ? <FiVolumeX className="text-rose-600" /> : <FiVolume2 />}
		</button>
	);
}
