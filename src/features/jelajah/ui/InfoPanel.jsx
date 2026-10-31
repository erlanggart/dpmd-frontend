import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiArrowRight, FiCheck, FiLock, FiLogIn, FiNavigation, FiX } from "react-icons/fi";
import { RUANGAN } from "../kantorConfig";

const WARNA_UNTUK = {
	Umum: "bg-emerald-50 text-emerald-700 ring-emerald-200",
	Desa: "bg-amber-50 text-amber-800 ring-amber-200",
	Kecamatan: "bg-sky-50 text-sky-700 ring-sky-200",
	Pegawai: "bg-slate-100 text-slate-700 ring-slate-200",
};

function Statistik({ statistik }) {
	const isi = [
		["Kecamatan", statistik?.kecamatan],
		["Desa", statistik?.desa],
		["Kelurahan", statistik?.kelurahan],
	];
	return (
		<div className="grid grid-cols-3 gap-2">
			{isi.map(([label, nilai]) => (
				<div key={label} className="rounded-2xl bg-amber-50 px-3 py-3 text-center ring-1 ring-amber-100">
					<p className="text-2xl font-bold text-slate-900 tabular-nums">{nilai ?? "—"}</p>
					<p className="text-xs text-slate-600">{label}</p>
				</div>
			))}
		</div>
	);
}

export default function InfoPanel({
	area,
	statistik,
	dikunjungi,
	onTutup,
	onPindah,
	labelPindah = "Antar ke sana",
	antrean,
	onAmbilAntrean,
	petugasData,
}) {
	const tombolTutup = useRef(null);
	const lobi = area.id === "lobi";
	const adaPerluAkun = area.layanan?.some((l) => l.perluAkun);

	useEffect(() => {
		const sebelumnya = document.activeElement;
		tombolTutup.current?.focus();
		return () => sebelumnya?.focus?.();
	}, []);

	return (
		<div className="fixed inset-0 z-40 flex items-end md:items-stretch md:justify-end">
			<div className="absolute inset-0 bg-slate-900/40 md:bg-slate-900/20" onClick={onTutup} aria-hidden="true" />
			<motion.section
				role="dialog"
				aria-modal="true"
				aria-labelledby="judul-panel-jelajah"
				initial={{ opacity: 0, y: 32 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.25, ease: "easeOut" }}
				className="relative flex max-h-[86vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl md:h-full md:max-h-none md:w-[440px] md:rounded-none md:rounded-l-3xl"
			>
				<header className="relative shrink-0 px-5 pb-5 pt-5 text-white md:pt-8" style={{ background: area.warna }}>
					<button
						ref={tombolTutup}
						onClick={onTutup}
						aria-label="Tutup panel"
						className="absolute right-4 top-4 md:top-8 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
					>
						<FiX className="h-5 w-5" />
					</button>
					<p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
						{lobi ? "Lobi" : "Ruang bidang"}
					</p>
					<h2 id="judul-panel-jelajah" className="mt-1 pr-10 text-xl font-bold leading-snug">
						{area.nama}
					</h2>
				</header>

				<div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
					<div className="flex gap-3">
						<div
							className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
							style={{ background: area.warna }}
							aria-hidden="true"
						>
							{area.labelPeta}
						</div>
						<div className="rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3">
							<p className="text-xs font-semibold text-slate-500">
								{petugasData ? (
									<>
										<span className="text-slate-800">{petugasData.nama}</span> · {petugasData.jabatan}
									</>
								) : (
									area.petugas
								)}
							</p>
							<p className="mt-0.5 text-[15px] leading-relaxed text-slate-800">{area.sapaan}</p>
						</div>
					</div>

					<div>
						<h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
							{lobi ? "Tentang DPMD" : "Tugas bidang"}
						</h3>
						<p className="mt-2 text-[15px] leading-relaxed text-slate-700">{area.tugas}</p>
					</div>

					{lobi ? (
						<>
							<div className="flex items-center gap-3 rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 px-4 py-3">
								{antrean ? (
									<>
										<div className="rounded-xl bg-white px-3 py-2 text-center shadow-sm ring-1 ring-amber-200">
											<p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Nomor antrean</p>
											<p className="text-2xl font-bold tabular-nums text-slate-900">A-{String(antrean).padStart(3, "0")}</p>
										</div>
										<p className="text-sm text-slate-600">Silakan menuju ruang bidang yang Anda tuju. Nomor Anda akan dipanggil petugas.</p>
									</>
								) : (
									<>
										<p className="flex-1 text-sm text-slate-600">Ambil nomor antrean sebelum menuju ruang bidang.</p>
										<button
											onClick={onAmbilAntrean}
											className="shrink-0 rounded-xl bg-[#b8862b] px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
										>
											Ambil nomor
										</button>
									</>
								)}
							</div>
							<Statistik statistik={statistik} />
							<div>
								<h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
									Ruang bidang di kantor ini
								</h3>
								<ul className="mt-3 space-y-2">
									{RUANGAN.map((r) => (
										<li key={r.id}>
											<button
												onClick={() => onPindah(r.id)}
												className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-left hover:border-slate-300 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
											>
												<span className="h-3 w-3 shrink-0 rounded-full" style={{ background: r.warna }} />
												<span className="min-w-0 flex-1">
													<span className="block text-sm font-semibold text-slate-900">{r.singkatan}</span>
													<span className="block truncate text-xs text-slate-500">
														Lt. {r.lantai + 1} · {r.nama}
													</span>
												</span>
												{dikunjungi.has(r.id) && (
													<FiCheck className="h-4 w-4 text-emerald-600" aria-label="Sudah dikunjungi" />
												)}
												<span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
													<FiNavigation className="h-3.5 w-3.5" /> {labelPindah}
												</span>
											</button>
										</li>
									))}
								</ul>
							</div>
						</>
					) : (
						<div>
							<h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
								Layanan ({area.layanan.length})
							</h3>
							<ul className="mt-3 space-y-3">
								{area.layanan.map((l) => (
									<li key={l.judul} className="rounded-2xl border border-slate-200 p-4">
										<div className="flex items-start justify-between gap-3">
											<h4 className="font-semibold text-slate-900">{l.judul}</h4>
											{l.perluAkun && (
												<span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
													<FiLock className="h-3 w-3" /> Perlu akun
												</span>
											)}
										</div>
										<p className="mt-1.5 text-sm leading-relaxed text-slate-600">{l.uraian}</p>
										<div className="mt-3 flex flex-wrap items-center gap-1.5">
											<span className="text-[11px] text-slate-500">Untuk:</span>
											{l.untuk.map((u) => (
												<span key={u} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${WARNA_UNTUK[u]}`}>
													{u}
												</span>
											))}
										</div>
										{l.tautan && (
											<Link
												to={l.tautan.ke}
												className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
												style={{ color: area.warna }}
											>
												{l.tautan.label} <FiArrowRight className="h-4 w-4" />
											</Link>
										)}
									</li>
								))}
							</ul>
						</div>
					)}
				</div>

				<footer className="shrink-0 space-y-3 border-t border-slate-100 px-5 py-4">
					{adaPerluAkun && (
						<p className="text-xs leading-relaxed text-slate-500">
							Layanan bertanda “Perlu akun” dipakai lewat akun desa, kecamatan, atau pegawai DPMD.
						</p>
					)}
					<div className="flex flex-col-reverse gap-2 sm:flex-row">
						<button
							onClick={onTutup}
							className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
						>
							Lanjut menjelajah
						</button>
						{adaPerluAkun && (
							<Link
								to="/login"
								className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
								style={{ background: area.warna }}
							>
								<FiLogIn className="h-4 w-4" /> Masuk ke Sistem
							</Link>
						)}
					</div>
				</footer>
			</motion.section>
		</div>
	);
}
