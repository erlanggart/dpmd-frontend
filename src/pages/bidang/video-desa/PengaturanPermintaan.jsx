import React, { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { LABEL_ORIENTASI, keInputWaktu } from "./videoDesaUtils";

const KOSONG = {
	judul: "",
	deskripsi: "",
	orientasi: "lanskap",
	maks_durasi_detik: "",
	maks_per_desa: 2,
	tutup_pada: "",
};

const Label = ({ children, keterangan }) => (
	<label className="block">
		<span className="text-sm font-semibold text-slate-900">{children}</span>
		{keterangan && <span className="mt-0.5 block text-xs text-slate-500">{keterangan}</span>}
	</label>
);

const kelasMasukan =
	"mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900";

/**
 * Modal buat/ubah permintaan video. `awal` null = permintaan baru.
 * `onSimpan(data)` mengembalikan promise; modal menutup sendiri bila berhasil.
 */
const PengaturanPermintaan = ({ buka, awal, onTutup, onSimpan }) => {
	const [isi, setIsi] = useState(KOSONG);
	const [menyimpan, setMenyimpan] = useState(false);

	useEffect(() => {
		if (!buka) return;
		setIsi(
			awal
				? {
						judul: awal.judul || "",
						deskripsi: awal.deskripsi || "",
						orientasi: awal.orientasi || "bebas",
						maks_durasi_detik: awal.maks_durasi_detik ?? "",
						maks_per_desa: awal.maks_per_desa ?? 2,
						tutup_pada: keInputWaktu(awal.tutup_pada),
					}
				: KOSONG
		);
	}, [buka, awal]);

	if (!buka) return null;

	const ubah = (k) => (e) => setIsi((s) => ({ ...s, [k]: e.target.value }));

	const simpan = async (e) => {
		e.preventDefault();
		setMenyimpan(true);
		try {
			await onSimpan({
				judul: isi.judul,
				deskripsi: isi.deskripsi,
				orientasi: isi.orientasi,
				maks_durasi_detik: isi.maks_durasi_detik === "" ? null : Number(isi.maks_durasi_detik),
				maks_per_desa: Number(isi.maks_per_desa),
				tutup_pada: isi.tutup_pada ? new Date(isi.tutup_pada).toISOString() : null,
			});
			onTutup();
		} catch {
			// Pesan galat ditampilkan pemanggil; modal tetap terbuka.
		} finally {
			setMenyimpan(false);
		}
	};

	return (
		// z-[60]: bilah navigasi bawah memakai z-50 dan akan menelan klik.
		<div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-6">
			<form
				onSubmit={simpan}
				className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
			>
				<div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
					<h2 className="text-base font-semibold text-slate-900">
						{awal ? "Pengaturan permintaan video" : "Permintaan video baru"}
					</h2>
					<button type="button" onClick={onTutup} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup">
						<X className="h-5 w-5" />
					</button>
				</div>

				<div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
					<div>
						<Label keterangan="Tampil sebagai judul di halaman unggah desa.">Judul video</Label>
						<input value={isi.judul} onChange={ubah("judul")} required maxLength={255} placeholder="mis. Profil Potensi Desa untuk Videotron" className={kelasMasukan} />
					</div>

					<div>
						<Label keterangan="Tema, apa yang harus tampil, durasi, larangan — dibaca desa sebelum merekam.">Arahan konten</Label>
						<textarea value={isi.deskripsi} onChange={ubah("deskripsi")} rows={4} maxLength={5000} placeholder="mis. Tampilkan kegiatan unggulan desa, tanpa musik berhak cipta, sertakan logo desa di awal." className={kelasMasukan} />
					</div>

					<div>
						<Label keterangan="Arahan untuk desa. Video yang tidak sesuai tetap diterima, tapi ditandai.">Orientasi</Label>
						<div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
							{Object.entries(LABEL_ORIENTASI).map(([k, label]) => (
								<button
									key={k}
									type="button"
									onClick={() => setIsi((s) => ({ ...s, orientasi: k }))}
									className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
										isi.orientasi === k ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50"
									}`}
								>
									{label}
								</button>
							))}
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label keterangan="Kosongkan bila bebas.">Durasi maks (detik)</Label>
							<input type="number" min={5} max={3600} value={isi.maks_durasi_detik} onChange={ubah("maks_durasi_detik")} placeholder="mis. 60" className={kelasMasukan} />
						</div>
						<div>
							<Label keterangan="Video ditolak tidak dihitung.">Video per desa</Label>
							<input type="number" min={1} max={10} required value={isi.maks_per_desa} onChange={ubah("maks_per_desa")} className={kelasMasukan} />
						</div>
					</div>

					<div>
						<Label keterangan="Setelah lewat, tautan menolak unggahan baru. Kosongkan bila tanpa batas.">Batas waktu unggah</Label>
						<input type="datetime-local" value={isi.tutup_pada} onChange={ubah("tutup_pada")} className={kelasMasukan} />
					</div>
				</div>

				<div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
					<button type="button" onClick={onTutup} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
						Batal
					</button>
					<button type="submit" disabled={menyimpan} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300">
						{menyimpan && <Loader2 className="h-4 w-4 animate-spin" />}
						{awal ? "Simpan" : "Buat & dapatkan tautan"}
					</button>
				</div>
			</form>
		</div>
	);
};

export default PengaturanPermintaan;
