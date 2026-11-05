import { useState } from "react";
import { kodeSaya, pulihkanDariKode, simpanKeKode } from "../simpanKode";

// Simpan kemajuan ke server (kode 12 karakter) dan pulihkan dari kode di perangkat lain.
export default function PanelSimpan() {
	const [kode, setKode] = useState(kodeSaya);
	const [sibuk, setSibuk] = useState(false);
	const [pesan, setPesan] = useState(null);
	const [salin, setSalin] = useState(false);
	const [input, setInput] = useState("");
	const [yakin, setYakin] = useState(false);

	const jalankan = async (kerja) => {
		setSibuk(true);
		setPesan(null);
		try {
			await kerja();
		} catch (e) {
			setPesan({ buruk: true, teks: e.message });
		}
		setSibuk(false);
	};
	const simpan = () =>
		jalankan(async () => {
			setKode(await simpanKeKode());
			setPesan({ teks: "Kemajuan tersimpan." });
		});
	const salinKode = () => navigator.clipboard?.writeText(kode).then(() => setSalin(true), () => {});

	return (
		<div className="space-y-5 text-slate-800">
			<section>
				<h3 className="text-sm font-bold">Simpan kemajuan</h3>
				{kode && (
					<div className="mt-2 flex items-center gap-2">
						<p className="m-0 flex-1 rounded-xl bg-slate-100 px-3 py-2 text-center font-mono text-xl font-black tracking-wider">{kode}</p>
						<button onClick={salinKode} className="shrink-0 rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800">
							{salin ? "Tersalin" : "Salin"}
						</button>
					</div>
				)}
				<button onClick={simpan} disabled={sibuk} className="mt-2 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-500 disabled:opacity-50">
					{kode ? "Perbarui kode" : "Buat kode"}
				</button>
				<p className="mt-2 text-xs leading-relaxed text-slate-500">
					Siapa pun yang tahu kode ini bisa memakai dan menimpa simpanan Anda. Simpanan dihapus bila tidak dipakai 180 hari.
				</p>
			</section>

			<section>
				<h3 className="text-sm font-bold">Pakai kode</h3>
				<input
					value={input}
					onChange={(e) => {
						setInput(e.target.value.toUpperCase());
						setYakin(false);
					}}
					placeholder="XXXX-XXXX-XXXX"
					aria-label="Kode simpan"
					maxLength={14}
					className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-center font-mono text-lg tracking-wider"
				/>
				{!yakin ? (
					<button onClick={() => setYakin(true)} disabled={sibuk || input.trim().length < 12} className="mt-2 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-40">
						Pakai kode ini
					</button>
				) : (
					<div className="mt-2 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
						<p className="m-0 text-sm font-bold text-amber-900">Kemajuan di perangkat ini akan diganti</p>
						<p className="m-0 mt-1 text-xs text-amber-900/80">Kemajuan yang belum disimpan ke kode akan hilang.</p>
						<div className="mt-2 flex gap-2">
							<button onClick={() => setYakin(false)} className="flex-1 rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200">
								Batal
							</button>
							<button onClick={() => jalankan(() => pulihkanDariKode(input))} disabled={sibuk} className="flex-1 rounded-lg bg-rose-600 px-3 py-2 text-sm font-black text-white hover:bg-rose-500 disabled:opacity-50">
								Ya, ganti
							</button>
						</div>
					</div>
				)}
			</section>

			{pesan && <p className={`rounded-xl px-3 py-2 text-sm ${pesan.buruk ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800"}`}>{pesan.teks}</p>}
		</div>
	);
}
