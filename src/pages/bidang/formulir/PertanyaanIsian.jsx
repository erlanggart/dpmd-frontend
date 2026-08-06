import React from "react";
import { AlertCircle, ChevronDown, Paperclip, UploadCloud, X } from "lucide-react";
import { NILAI_LAINNYA, formatUkuran } from "./formulirUtils";

/**
 * Satu pertanyaan beserta kolom isiannya.
 *
 * Dipakai halaman pengisian publik DAN pratinjau di editor. Sengaja satu
 * komponen: kalau editor menggambar sendiri tiruannya, pratinjau akan pelan-pelan
 * berbeda dari yang benar-benar dilihat responden — dan itu justru menghapus
 * gunanya pratinjau.
 *
 * Catatan tampilan: pilihan ganda, kotak centang, dan skala digambar sebagai
 * kartu yang bisa ditekan, bukan lingkaran radio kecil di samping teks. Formulir
 * ini paling sering dibuka dari ponsel di ruang pelayanan — sasaran sentuh yang
 * cuma 16px membuat responden salah pilih, dan kesalahan itu tidak kelihatan
 * sampai rekapnya aneh.
 */

const TEKS_ISIAN =
	"w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] leading-6 text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/10 disabled:bg-slate-50 disabled:text-slate-400";

// Baris pilihan. Dua kelas utuh, bukan rangkaian yang disusun saat berjalan —
// Tailwind hanya memindai kelas yang tertulis lengkap di berkas.
const OPSI_DASAR =
	"flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-[15px] leading-6 transition-colors";
const OPSI_MATI = "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50";
const OPSI_AKTIF = "border-slate-900 bg-slate-50 text-slate-900 ring-1 ring-slate-900";

const SKALA_DASAR =
	"flex h-12 w-12 cursor-pointer select-none items-center justify-center rounded-xl border text-sm font-semibold transition-colors";
const SKALA_MATI = "border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50";
const SKALA_AKTIF = "border-slate-900 bg-slate-900 text-white";

const PertanyaanIsian = ({ pertanyaan: p, nilai, onUbah, berkas = [], onBerkas, galat, mati = false, nomor }) => {
	const set = p.pengaturan || {};
	const opsi = Array.isArray(p.opsi) ? p.opsi : [];

	// ---------- Pemisah bagian ----------
	if (p.tipe === "bagian") {
		return (
			<div className="bg-slate-900 px-5 py-5 sm:px-7">
				<h2 className="text-base font-semibold tracking-tight text-white sm:text-lg">{p.label}</h2>
				{p.deskripsi && (
					<p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-slate-300">{p.deskripsi}</p>
				)}
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
							<label key={o} className={`${OPSI_DASAR} ${nilai === o ? OPSI_AKTIF : OPSI_MATI}`}>
								<input
									type="radio"
									name={`p${p.id}`}
									disabled={mati}
									checked={nilai === o}
									onChange={() => onUbah(o)}
									className="mt-1 h-4 w-4 flex-shrink-0 border-slate-300 text-slate-900 focus:ring-slate-900"
								/>
								<span className="min-w-0">{o}</span>
							</label>
						))}
						{set.opsi_lainnya && (
							<label className={`${OPSI_DASAR} ${memakaiLainnya ? OPSI_AKTIF : OPSI_MATI}`}>
								<input
									type="radio"
									name={`p${p.id}`}
									disabled={mati}
									checked={memakaiLainnya}
									onChange={() => onUbah("")}
									className="mt-1 h-4 w-4 flex-shrink-0 border-slate-300 text-slate-900 focus:ring-slate-900"
								/>
								<span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
									<span>Lainnya:</span>
									<input
										type="text"
										disabled={mati}
										value={memakaiLainnya ? nilai : ""}
										onChange={(e) => onUbah(e.target.value)}
										placeholder="Tulis di sini"
										className="min-w-[8rem] flex-1 border-b border-slate-300 bg-transparent py-1 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
									/>
								</span>
							</label>
						)}
					</div>
				);

			case "kotak_centang":
				return (
					<div className="space-y-2">
						{opsi.map((o) => {
							const dipilih = terpilihCentang.includes(o);
							return (
								<label key={o} className={`${OPSI_DASAR} ${dipilih ? OPSI_AKTIF : OPSI_MATI}`}>
									<input
										type="checkbox"
										disabled={mati}
										checked={dipilih}
										onChange={(e) => ubahCentang(o, e.target.checked)}
										className="mt-1 h-4 w-4 flex-shrink-0 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
									/>
									<span className="min-w-0">{o}</span>
								</label>
							);
						})}
						{set.opsi_lainnya && (
							<label className={`${OPSI_DASAR} ${lainnyaCentang ? OPSI_AKTIF : OPSI_MATI}`}>
								<input
									type="checkbox"
									disabled={mati}
									checked={Boolean(lainnyaCentang)}
									onChange={(e) => {
										if (e.target.checked) onUbah([...terpilihCentang, NILAI_LAINNYA]);
										else onUbah(terpilihCentang.filter((v) => opsi.includes(v)));
									}}
									className="mt-1 h-4 w-4 flex-shrink-0 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
								/>
								<span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
									<span>Lainnya:</span>
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
										placeholder="Tulis di sini"
										className="min-w-[8rem] flex-1 border-b border-slate-300 bg-transparent py-1 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
									/>
								</span>
							</label>
						)}
						{(set.min_pilih > 0 || set.maks_pilih > 0) && (
							<p className="pt-0.5 text-xs text-slate-500">
								{set.min_pilih > 0 && `Minimal ${set.min_pilih} pilihan`}
								{set.min_pilih > 0 && set.maks_pilih > 0 && " · "}
								{set.maks_pilih > 0 && `Maksimal ${set.maks_pilih} pilihan`}
							</p>
						)}
					</div>
				);

			case "dropdown":
				return (
					<div className="relative">
						<select
							disabled={mati}
							value={nilai || ""}
							onChange={(e) => onUbah(e.target.value)}
							className={`${TEKS_ISIAN} appearance-none pr-11`}
						>
							<option value="">Pilih…</option>
							{opsi.map((o) => (
								<option key={o} value={o}>
									{o}
								</option>
							))}
						</select>
						<ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
					</div>
				);

			case "skala_linier": {
				const min = Number(set.min ?? 1);
				const maks = Number(set.maks ?? 5);
				const angka = [];
				for (let n = min; n <= maks; n += 1) angka.push(n);
				return (
					<div className="space-y-2">
						<div className="flex flex-wrap gap-2">
							{angka.map((n) => {
								const dipilih = String(nilai) === String(n);
								return (
									<label key={n} className={`${SKALA_DASAR} ${dipilih ? SKALA_AKTIF : SKALA_MATI}`}>
										<input
											type="radio"
											name={`p${p.id}`}
											disabled={mati}
											checked={dipilih}
											onChange={() => onUbah(String(n))}
											className="sr-only"
										/>
										{n}
									</label>
								);
							})}
						</div>
						{(set.label_min || set.label_maks) && (
							<div className="flex items-start justify-between gap-4 text-xs text-slate-500">
								<span>{set.label_min}</span>
								<span className="text-right">{set.label_maks}</span>
							</div>
						)}
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
						className={`${TEKS_ISIAN} sm:w-60`}
					/>
				);

			case "waktu":
				return (
					<input
						type="time"
						disabled={mati}
						value={nilai || ""}
						onChange={(e) => onUbah(e.target.value)}
						className={`${TEKS_ISIAN} sm:w-44`}
					/>
				);

			case "unggah_berkas": {
				const maks = Number(set.maks_berkas) || 1;
				const penuh = mati || berkas.length >= maks;
				return (
					<div className="space-y-2">
						<label
							className={
								penuh
									? "flex cursor-not-allowed flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-7 text-center opacity-60"
									: "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-7 text-center transition-colors hover:border-slate-900 hover:bg-slate-100"
							}
						>
							<UploadCloud className="h-6 w-6 text-slate-400" />
							<span className="mt-2 text-sm font-semibold text-slate-700">
								{penuh ? "Batas berkas tercapai" : "Pilih berkas"}
							</span>
							<span className="mt-0.5 text-xs text-slate-500">
								Maksimal {maks} berkas, masing-masing 25 MB
							</span>
							<input
								type="file"
								multiple={maks > 1}
								disabled={penuh}
								className="hidden"
								onChange={(e) => {
									onBerkas?.([...berkas, ...Array.from(e.target.files || [])].slice(0, maks));
									e.target.value = "";
								}}
							/>
						</label>
						{berkas.map((f, i) => (
							<div
								key={`${f.name}-${i}`}
								className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5"
							>
								<Paperclip className="h-4 w-4 flex-shrink-0 text-slate-400" />
								<span className="min-w-0 flex-1 truncate text-sm text-slate-700">{f.name}</span>
								<span className="flex-shrink-0 text-xs text-slate-400">{formatUkuran(f.size)}</span>
								<button
									type="button"
									onClick={() => onBerkas?.(berkas.filter((_, j) => j !== i))}
									className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
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
			className={`border-l-4 px-5 py-5 sm:px-7 sm:py-6 ${galat ? "border-rose-500 bg-rose-50/30" : "border-transparent"}`}
		>
			<div className="flex gap-3">
				{nomor != null && (
					<span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold tabular-nums text-slate-500">
						{nomor}
					</span>
				)}
				<div className="min-w-0 flex-1">
					<p className="text-[15px] font-semibold leading-6 text-slate-900">
						{p.label}
						{p.wajib && (
							<span className="ml-1 text-rose-600" aria-label="wajib diisi">
								*
							</span>
						)}
					</p>
					{p.deskripsi && (
						<p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-500">{p.deskripsi}</p>
					)}
					<div className="mt-4">{isian()}</div>
					{galat && (
						<p className="mt-2.5 flex items-start gap-1.5 text-sm font-medium text-rose-600">
							<AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
							{galat}
						</p>
					)}
				</div>
			</div>
		</div>
	);
};

export default PertanyaanIsian;
