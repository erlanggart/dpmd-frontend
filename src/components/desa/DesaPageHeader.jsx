import React from "react";

/**
 * Header standar untuk semua halaman modul desa.
 *
 * Bahasa desain: permukaan putih di atas bg-slate-50, border slate-200,
 * aksi utama slate-900. Warna lain hanya dipakai sebagai penanda status kecil.
 *
 * Props:
 * - icon        komponen ikon (lucide/react-icons), dirender di kotak slate-900
 * - eyebrow     label kecil di atas judul (opsional)
 * - title       judul halaman
 * - description kalimat penjelas singkat (opsional)
 * - actions     node tombol aksi di kanan (opsional)
 * - stats       array { label, value, hint } untuk strip ringkasan (opsional)
 * - children    konten tambahan di bawah header, mis. filter (opsional)
 */
const DesaPageHeader = ({
	icon: Icon,
	eyebrow,
	title,
	description,
	actions,
	stats,
	children,
}) => {
	return (
		<section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div className="flex min-w-0 items-start gap-3.5">
					{Icon && (
						<div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
							<Icon className="h-5 w-5" />
							{/* Aksen merah bata tipis — identitas, bukan latar kartu */}
							<span className="absolute -bottom-0.5 left-1/2 h-1 w-5 -translate-x-1/2 rounded-full bg-brand-500" />
						</div>
					)}
					<div className="min-w-0">
						{eyebrow && (
							<p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
								{eyebrow}
							</p>
						)}
						<h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
							{title}
						</h1>
						{description && (
							<p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
								{description}
							</p>
						)}
					</div>
				</div>

				{actions && (
					<div className="flex flex-shrink-0 flex-wrap items-center gap-2">{actions}</div>
				)}
			</div>

			{stats?.length > 0 && (
				<div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 lg:grid-cols-4">
					{stats.map((stat) => (
						<div
							key={stat.label}
							className="rounded-lg border border-slate-200 bg-slate-50 p-4"
						>
							<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
								{stat.label}
							</p>
							<p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
								{stat.value}
							</p>
							{stat.hint && (
								<p className="mt-1 truncate text-xs text-slate-500">{stat.hint}</p>
							)}
						</div>
					))}
				</div>
			)}

			{children && <div className="mt-5 border-t border-slate-100 pt-5">{children}</div>}
		</section>
	);
};

export default DesaPageHeader;
