import React, { useState } from "react";
import { Link } from "react-router-dom";
import { LuChevronDown, LuChevronRight, LuCircleAlert } from "react-icons/lu";

const BATAS_AWAL = 3;

const formatTanggal = (value) => {
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date);
};

/**
 * Peringatan hasil verifikasi yang ditolak Bidang PMD.
 *
 * Sebelum ini, desa hanya tahu datanya ditolak kalau kebetulan membuka halaman
 * modulnya satu per satu — di dashboard tidak ada tandanya sama sekali. Yang
 * dibutuhkan desa bukan cuma angka, tapi catatan penolakannya, karena di situ
 * tertulis apa yang harus dibetulkan.
 */
const PeringatanVerifikasiDitolak = ({ data }) => {
	const [terbuka, setTerbuka] = useState(false);
	const items = data?.items || [];

	if (items.length === 0) return null;

	const tampil = terbuka ? items : items.slice(0, BATAS_AWAL);
	const sisa = items.length - tampil.length;

	const ringkas = [
		data.totalLembaga > 0 ? `${data.totalLembaga} lembaga` : null,
		data.totalPengurus > 0 ? `${data.totalPengurus} pengurus` : null,
	]
		.filter(Boolean)
		.join(" dan ");

	return (
		<section className="overflow-hidden rounded-xl border border-rose-200 bg-rose-50">
			<div className="flex items-start gap-3 p-4 sm:p-5">
				<span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-rose-600 text-white">
					<LuCircleAlert className="h-5 w-5" />
				</span>
				<div className="min-w-0 flex-1">
					<h2 className="text-base font-semibold text-rose-900">
						Verifikasi ditolak
					</h2>
					<p className="mt-0.5 text-sm text-rose-800">
						{ringkas} perlu dibetulkan lalu diajukan ulang. Baca catatan dari
						verifikator di bawah ini.
					</p>

					<ul className="mt-3 space-y-2">
						{tampil.map((item) => (
							<li
								key={`${item.kategori}-${item.id}`}
								className="rounded-lg border border-rose-200 bg-white p-3"
							>
								<div className="flex flex-wrap items-center gap-2">
									<span className="rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-rose-700">
										{item.jenis}
									</span>
									<span className="text-sm font-semibold text-slate-900">
										{item.label}
									</span>
									{item.keterangan && (
										<span className="text-xs text-slate-500">
											{item.keterangan}
										</span>
									)}
								</div>

								{item.catatan && (
									<p className="mt-1.5 text-sm leading-relaxed text-slate-700">
										{item.catatan}
									</p>
								)}

								<div className="mt-2 flex flex-wrap items-center justify-between gap-2">
									<p className="text-[11px] text-slate-500">
										{[item.verifikator, formatTanggal(item.ditolakPada)]
											.filter(Boolean)
											.join(" · ") || "Tanpa keterangan verifikator"}
									</p>
									{item.href && (
										<Link
											to={item.href}
											className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:text-rose-900 hover:underline"
										>
											Perbaiki
											<LuChevronRight className="h-3.5 w-3.5" />
										</Link>
									)}
								</div>
							</li>
						))}
					</ul>

					{items.length > BATAS_AWAL && (
						<button
							type="button"
							onClick={() => setTerbuka((nilai) => !nilai)}
							className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:text-rose-900"
						>
							<LuChevronDown
								className={`h-3.5 w-3.5 transition-transform ${terbuka ? "rotate-180" : ""}`}
							/>
							{terbuka ? "Tampilkan lebih sedikit" : `Lihat ${sisa} lainnya`}
						</button>
					)}
				</div>
			</div>
		</section>
	);
};

export default PeringatanVerifikasiDitolak;
