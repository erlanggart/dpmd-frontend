import React from "react";
import { Paperclip, X } from "lucide-react";
import { NILAI_LAINNYA, formatUkuran } from "./formulirUtils";

/**
 * Satu pertanyaan beserta kolom isiannya.
 *
 * Dipakai halaman pengisian publik DAN pratinjau di editor. Sengaja satu
 * komponen: kalau editor menggambar sendiri tiruannya, pratinjau akan pelan-pelan
 * berbeda dari yang benar-benar dilihat responden — dan itu justru menghapus
 * gunanya pratinjau.
 */

const TEKS_ISIAN =
	"w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900";

const PertanyaanIsian = ({ pertanyaan: p, nilai, onUbah, berkas = [], onBerkas, galat, mati = false }) => {
	const set = p.pengaturan || {};
	const opsi = Array.isArray(p.opsi) ? p.opsi : [];

	// ---------- Pemisah bagian ----------
	if (p.tipe === "bagian") {
		return (
			<div className="border-t-4 border-slate-900 bg-white px-5 py-4 sm:px-6">
				<h2 className="text-base font-semibold text-slate-900">{p.label}</h2>
				{p.deskripsi && <p className="mt-1 whitespace-pre-line text-sm text-slate-500">{p.deskripsi}</p>}
			</div>
		);
	}

	// ---------- "Lainnya" pada pilihan ganda ----------
	// Nilai lainnya tidak punya penanda tersendiri di data: yang tersimpan hanya
	// teksnya. Jadi "sedang memakai lainnya" disimpulkan dari nilai yang terisi
	// tapi tidak ada di daftar opsi.
	const memakaiLainnya =
		p.tipe === "pilihan_ganda" && set.opsi_lainnya && nilai !== "" && nilai != null && !opsi.includes(nilai);

	const terpilihCentang = Array.isArray(nilai) ? nilai : [];
	const lainnyaCentang = terpilihCentang.find((v) => !opsi.includes(v));

	const ubahCentang = (opsiNilai, aktif) => {
		const berikut = aktif
			? [...terpilihCentang, opsiNilai]
			: terpilihCentang.filter((v) => v !== opsiNilai);
		onUbah(berikut);
	};

	const isian = () => {
		switch (p.tipe) {
			case "paragraf":
				return (
					<textarea
						rows={4}
						disabled={mati}
						value={nilai || ""}
						onChange={(e) => onUbah(e.target.value)}
						placeholder="Jawaban Anda"
						className={TEKS_ISIAN}
					/>
				);

			case "pilihan_ganda":
				return (
					<div className="space-y-2">
						{opsi.map((o) => (
							<label key={o} className="flex cursor-pointer items-center gap-3 text-sm text-slate-700">
								<input
									type="radio"
									name={`p${p.id}`}
									disabled={mati}
									checked={nilai === o}
									onChange={() => onUbah(o)}
									className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-900"
								/>
								{o}
							</label>
						))}
						{set.opsi_lainnya && (
							<div className="flex items-center gap-3">
								<input
									type="radio"
									name={`p${p.id}`}
									disabled={mati}
									checked={memakaiLainnya}
									onChange={() => onUbah("")}
									className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-900"
								/>
								<span className="text-sm text-slate-700">Lainnya:</span>
								<input
									type="text"
									disabled={mati}
									value={memakaiLainnya ? nilai : ""}
									onChange={(e) => onUbah(e.target.value)}
									className="flex-1 border-b border-slate-300 py-1 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
								/>
							</div>
						)}
					</div>
				);

			case "kotak_centang":
				return (
					<div className="space-y-2">
						{opsi.map((o) => (
							<label key={o} className="flex cursor-pointer items-center gap-3 text-sm text-slate-700">
								<input
									type="checkbox"
									disabled={mati}
									checked={terpilihCentang.includes(o)}
									onChange={(e) => ubahCentang(o, e.target.checked)}
									className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
								/>
								{o}
							</label>
						))}
						{set.opsi_lainnya && (
							<div className="flex items-center gap-3">
								<input
									type="checkbox"
									disabled={mati}
									checked={Boolean(lainnyaCentang)}
									onChange={(e) => {
										if (e.target.checked) onUbah([...terpilihCentang, NILAI_LAINNYA]);
										else onUbah(terpilihCentang.filter((v) => opsi.includes(v)));
									}}
									className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
								/>
								<span className="text-sm text-slate-700">Lainnya:</span>
								<input
									type="text"
									disabled={mati}
									value={lainnyaCentang && lainnyaCentang !== NILAI_LAINNYA ? lainnyaCentang : ""}
									onChange={(e) =>
										onUbah([
											...terpilihCentang.filter((v) => opsi.includes(v)),
											e.target.value || NILAI_LAINNYA,
										])
									}
									className="flex-1 border-b border-slate-300 py-1 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
								/>
							</div>
						)}
						{(set.min_pilih > 0 || set.maks_pilih > 0) && (
							<p className="text-xs text-slate-400">
								{set.min_pilih > 0 && `Minimal ${set.min_pilih} pilihan`}
								{set.min_pilih > 0 && set.maks_pilih > 0 && " · "}
								{set.maks_pilih > 0 && `Maksimal ${set.maks_pilih} pilihan`}
							</p>
						)}
					</div>
				);

			case "dropdown":
				return (
					<select
						disabled={mati}
						value={nilai || ""}
						onChange={(e) => onUbah(e.target.value)}
						className={TEKS_ISIAN}
					>
						<option value="">Pilih…</option>
						{opsi.map((o) => (
							<option key={o} value={o}>
								{o}
							</option>
						))}
					</select>
				);

			case "skala_linier": {
				const min = Number(set.min ?? 1);
				const maks = Number(set.maks ?? 5);
				const angka = [];
				for (let n = min; n <= maks; n += 1) angka.push(n);
				return (
					<div className="flex flex-wrap items-center gap-x-4 gap-y-3">
						{set.label_min && <span className="text-sm text-slate-500">{set.label_min}</span>}
						{angka.map((n) => (
							<label key={n} className="flex cursor-pointer flex-col items-center gap-1.5">
								<span className="text-xs text-slate-500">{n}</span>
								<input
									type="radio"
									name={`p${p.id}`}
									disabled={mati}
									checked={String(nilai) === String(n)}
									onChange={() => onUbah(String(n))}
									className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-900"
								/>
							</label>
						))}
						{set.label_maks && <span className="text-sm text-slate-500">{set.label_maks}</span>}
					</div>
				);
			}

			case "tanggal":
				return (
					<input
						type="date"
						disabled={mati}
						value={nilai || ""}
						onChange={(e) => onUbah(e.target.value)}
						className={`${TEKS_ISIAN} sm:w-56`}
					/>
				);

			case "waktu":
				return (
					<input
						type="time"
						disabled={mati}
						value={nilai || ""}
						onChange={(e) => onUbah(e.target.value)}
						className={`${TEKS_ISIAN} sm:w-40`}
					/>
				);

			case "unggah_berkas": {
				const maks = Number(set.maks_berkas) || 1;
				return (
					<div className="space-y-2">
						<label
							className={`inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors ${
								mati || berkas.length >= maks ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-slate-50"
							}`}
						>
							<Paperclip className="h-4 w-4" />
							Pilih berkas
							<input
								type="file"
								multiple={maks > 1}
								disabled={mati || berkas.length >= maks}
								className="hidden"
								onChange={(e) => {
									onBerkas?.([...berkas, ...Array.from(e.target.files || [])].slice(0, maks));
									e.target.value = "";
								}}
							/>
						</label>
						<p className="text-xs text-slate-400">Maksimal {maks} berkas, masing-masing 25 MB.</p>
						{berkas.map((f, i) => (
							<div
								key={`${f.name}-${i}`}
								className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"
							>
								<span className="min-w-0 flex-1 truncate text-sm text-slate-700">{f.name}</span>
								<span className="flex-shrink-0 text-xs text-slate-400">{formatUkuran(f.size)}</span>
								<button
									type="button"
									onClick={() => onBerkas?.(berkas.filter((_, j) => j !== i))}
									className="flex-shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
									aria-label={`Hapus ${f.name}`}
								>
									<X className="h-4 w-4" />
								</button>
							</div>
						))}
					</div>
				);
			}

			default:
				return (
					<input
						type={set.validasi === "angka" ? "number" : "text"}
						disabled={mati}
						value={nilai || ""}
						onChange={(e) => onUbah(e.target.value)}
						placeholder="Jawaban Anda"
						className={TEKS_ISIAN}
					/>
				);
		}
	};

	return (
		<div
			className={`border-l-4 bg-white px-5 py-4 sm:px-6 ${galat ? "border-rose-500" : "border-transparent"}`}
		>
			<p className="text-sm font-medium text-slate-900">
				{p.label}
				{p.wajib && <span className="ml-1 text-rose-600">*</span>}
			</p>
			{p.deskripsi && <p className="mt-1 whitespace-pre-line text-sm text-slate-500">{p.deskripsi}</p>}
			<div className="mt-3">{isian()}</div>
			{galat && <p className="mt-2 text-sm font-medium text-rose-600">{galat}</p>}
		</div>
	);
};

export default PertanyaanIsian;
