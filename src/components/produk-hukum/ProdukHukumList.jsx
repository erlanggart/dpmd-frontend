import React from "react";
import { Link } from "react-router-dom";
import {
	LuBookOpen,
	LuCalendar,
	LuChevronRight,
	LuFileText,
	LuHash,
	LuMapPin,
} from "react-icons/lu";

const truncateText = (text, maxLength) => {
	if (!text) return "";
	if (text.length <= maxLength) return text;
	return `${text.substring(0, maxLength)}...`;
};

const JENIS_TONE = {
	"Peraturan Desa": {
		badge: "bg-sky-50 text-sky-700 ring-sky-200",
		card: "bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)]",
		glow: "bg-sky-200/40",
		icon: "bg-sky-100 text-sky-700",
	},
	"Peraturan Kepala Desa": {
		badge: "bg-violet-50 text-violet-700 ring-violet-200",
		card: "bg-[linear-gradient(180deg,#ffffff_0%,#fbf7ff_100%)]",
		glow: "bg-violet-200/40",
		icon: "bg-violet-100 text-violet-700",
	},
	"Keputusan Kepala Desa": {
		badge: "bg-amber-50 text-amber-700 ring-amber-200",
		card: "bg-[linear-gradient(180deg,#ffffff_0%,#fffaf2_100%)]",
		glow: "bg-amber-200/40",
		icon: "bg-amber-100 text-amber-700",
	},
};

const STATUS_TONE = {
	berlaku: {
		badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
		accent: "from-emerald-400 to-teal-500",
	},
	dicabut: {
		badge: "bg-rose-50 text-rose-700 ring-rose-200",
		accent: "from-rose-400 to-orange-500",
	},
};

const formatDate = (dateStr) => {
	if (!dateStr) return "-";
	return new Date(dateStr).toLocaleDateString("id-ID", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
};

const MetaItem = ({ icon, children }) => {
	const IconComponent = icon;

	return (
		<div className="flex items-center gap-2 text-xs text-slate-500">
			{IconComponent ? <IconComponent className="h-3.5 w-3.5 shrink-0" /> : null}
			<span className="truncate">{children}</span>
		</div>
	);
};

const GridCard = ({ item }) => {
	const jenisTone =
		JENIS_TONE[item.jenis] || {
			badge: "bg-slate-50 text-slate-700 ring-slate-200",
			card: "bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]",
			glow: "bg-slate-200/40",
			icon: "bg-slate-100 text-slate-700",
		};
	const statusTone = STATUS_TONE[item.status_peraturan] || STATUS_TONE.berlaku;
	const summaryText =
		item.subjek || item.keterangan_status || "Dokumen hukum desa dengan metadata resmi dan siap ditelusuri kembali.";

	return (
		<Link
			to={`/desa/produk-hukum/${item.id}`}
			className={`group relative overflow-hidden rounded-lg border border-slate-200/80 ${jenisTone.card} transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_28px_60px_-40px_rgba(15,23,42,0.4)]`}
		>
			<div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${statusTone.accent}`} />
			<div className={`absolute right-0 top-0 h-32 w-32 rounded-full ${jenisTone.glow} blur-3xl opacity-70 transition group-hover:opacity-100`} />

			<div className="relative z-10 flex h-full flex-col p-5">
				<div className="flex flex-wrap items-center gap-2">
					<span className={`inline-flex items-center rounded-lg px-3 py-1 text-[11px] font-semibold ring-1 ring-inset ${jenisTone.badge}`}>
						{item.singkatan_jenis || item.jenis}
					</span>
					<span className={`inline-flex items-center rounded-lg px-3 py-1 text-[11px] font-semibold ring-1 ring-inset ${statusTone.badge}`}>
						{item.status_peraturan === "berlaku" ? "Berlaku" : "Dicabut"}
					</span>
				</div>

				<h3 className="mt-4 text-base font-black leading-7 tracking-tight text-slate-900 transition-colors group-hover:text-sky-700">
					{truncateText(item.judul, 96)}
				</h3>

				<p className="mt-3 text-sm leading-6 text-slate-500">
					{truncateText(summaryText, 120)}
				</p>

				<div className="mt-5 grid gap-3 rounded-lg border border-white/70 bg-white/80 p-4 shadow-sm">
					<MetaItem icon={LuHash}>No. {item.nomor || "-"}</MetaItem>
					<MetaItem icon={LuCalendar}>
						{formatDate(item.tanggal_penetapan)} • {item.tahun || "-"}
					</MetaItem>
					<MetaItem icon={LuMapPin}>{item.tempat_penetapan || "Tempat penetapan belum diisi"}</MetaItem>
					<MetaItem icon={LuBookOpen}>{item.subjek || "Subjek belum ditambahkan"}</MetaItem>
				</div>

				<div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
							Detail dokumen
						</p>
						<p className="mt-1 text-sm font-medium text-slate-600">
							Buka arsip dan lihat metadata lengkap
						</p>
					</div>
					<span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition group-hover:translate-x-1 group-hover:text-sky-600">
						<LuChevronRight className="h-5 w-5" />
					</span>
				</div>
			</div>
		</Link>
	);
};

const ListRow = ({ item }) => {
	const jenisTone =
		JENIS_TONE[item.jenis] || {
			badge: "bg-slate-50 text-slate-700 ring-slate-200",
			card: "bg-white",
			glow: "bg-slate-200/40",
			icon: "bg-slate-100 text-slate-700",
		};
	const statusTone = STATUS_TONE[item.status_peraturan] || STATUS_TONE.berlaku;

	return (
		<Link
			to={`/desa/produk-hukum/${item.id}`}
			className="group relative overflow-hidden rounded-lg border border-slate-200/80 bg-white p-4 transition duration-200 hover:border-slate-300 hover:shadow-[0_24px_50px_-40px_rgba(15,23,42,0.35)] sm:p-5"
		>
			<div className={`absolute inset-y-3 left-0 w-1 rounded-r-lg bg-gradient-to-b ${statusTone.accent}`} />

			<div className="ml-2 flex items-start gap-4">
				<div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${jenisTone.icon} shadow-sm`}>
					<LuFileText className="h-5 w-5" />
				</div>

				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<span className={`inline-flex items-center rounded-lg px-3 py-1 text-[11px] font-semibold ring-1 ring-inset ${jenisTone.badge}`}>
							{item.singkatan_jenis || item.jenis}
						</span>
						<span className={`inline-flex items-center rounded-lg px-3 py-1 text-[11px] font-semibold ring-1 ring-inset ${statusTone.badge}`}>
							{item.status_peraturan === "berlaku" ? "Berlaku" : "Dicabut"}
						</span>
					</div>

					<h3 className="mt-3 text-base font-black leading-7 tracking-tight text-slate-900 transition-colors group-hover:text-sky-700">
						{item.judul}
					</h3>

					<div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
						<div className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5">
							<LuHash className="h-3.5 w-3.5" />
							<span>No. {item.nomor || "-"}</span>
						</div>
						<div className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5">
							<LuCalendar className="h-3.5 w-3.5" />
							<span>
								{formatDate(item.tanggal_penetapan)} • {item.tahun || "-"}
							</span>
						</div>
						<div className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5">
							<LuMapPin className="h-3.5 w-3.5" />
							<span>{item.tempat_penetapan || "Tempat belum diisi"}</span>
						</div>
						{item.subjek ? (
							<div className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5">
								<LuBookOpen className="h-3.5 w-3.5" />
								<span>{truncateText(item.subjek, 54)}</span>
							</div>
						) : null}
					</div>
				</div>

				<div className="hidden shrink-0 items-center gap-3 sm:flex">
					<div className="text-right">
						<p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
							Lihat detail
						</p>
						<p className="mt-1 text-sm font-medium text-slate-600">
							Buka dokumen
						</p>
					</div>
					<span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 transition group-hover:translate-x-1 group-hover:text-sky-600">
						<LuChevronRight className="h-5 w-5" />
					</span>
				</div>
			</div>
		</Link>
	);
};

const ProdukHukumList = ({ produkHukums, viewMode = "grid" }) => {
	if (viewMode === "list") {
		return (
			<div className="space-y-3">
				{produkHukums.map((item) => (
					<ListRow key={item.id} item={item} />
				))}
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
			{produkHukums.map((item) => (
				<GridCard key={item.id} item={item} />
			))}
		</div>
	);
};

export default ProdukHukumList;