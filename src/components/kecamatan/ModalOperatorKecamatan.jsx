// src/components/kecamatan/ModalOperatorKecamatan.jsx
//
// Pembungkus modal + kartu kredensial untuk akun operator kecamatan. Kartu
// kredensial ditampilkan SEKALI setelah akun dibuat: sandinya perlu dicatat
// dan diserahkan ke petugasnya sebelum modal ditutup.

import React, { useEffect } from "react";
import { Copy, KeyRound, X } from "lucide-react";
import toast from "react-hot-toast";

const salin = async (teks, label) => {
	try {
		await navigator.clipboard.writeText(teks);
		toast.success(`${label} disalin`);
	} catch {
		toast.error(`Gagal menyalin ${label.toLowerCase()}`);
	}
};

export const ModalOperatorKecamatan = ({ judul, keterangan, onTutup, children, lebar = "max-w-2xl" }) => {
	// Esc menutup — kecuali modal yang memang tidak boleh ditutup (onTutup kosong).
	useEffect(() => {
		if (!onTutup) return undefined;
		const tekan = (e) => e.key === "Escape" && onTutup();
		window.addEventListener("keydown", tekan);
		return () => window.removeEventListener("keydown", tekan);
	}, [onTutup]);

	return (
		<div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
			<div
				role="dialog"
				aria-modal="true"
				className={`max-h-[92vh] w-full ${lebar} overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl`}
			>
				<div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4">
					<div className="min-w-0">
						<h2 className="text-[16px] font-bold text-slate-900">{judul}</h2>
						{keterangan && <p className="mt-0.5 text-[12.5px] text-slate-500">{keterangan}</p>}
					</div>
					{onTutup && (
						<button
							type="button"
							onClick={onTutup}
							aria-label="Tutup"
							className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
						>
							<X className="h-5 w-5" />
						</button>
					)}
				</div>
				<div className="px-5 py-4">{children}</div>
			</div>
		</div>
	);
};

export const KartuKredensialOperator = ({ email, sandi, onSelesai }) => (
	<div className="space-y-4">
		<div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-900">
			Akun operator berhasil dibuat. <b>Catat sandinya sekarang</b> dan serahkan ke petugasnya — saat login
			pertama ia akan diminta mengganti sandi bila memakai sandi default.
		</div>
		{[
			["Email / username", email],
			["Sandi", sandi],
		].map(([label, nilai]) => (
			<div key={label} className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
				<KeyRound className="h-4 w-4 shrink-0 text-slate-400" />
				<div className="min-w-0 flex-1">
					<p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
					<p className="truncate font-mono text-[14px] font-semibold text-slate-900">{nilai}</p>
				</div>
				<button
					type="button"
					onClick={() => salin(nilai, label === "Sandi" ? "Sandi" : "Email")}
					className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
					aria-label={`Salin ${label}`}
				>
					<Copy className="h-4 w-4" />
				</button>
			</div>
		))}
		<div className="flex justify-end border-t border-slate-100 pt-4">
			<button
				type="button"
				onClick={onSelesai}
				className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
			>
				Selesai
			</button>
		</div>
	</div>
);
