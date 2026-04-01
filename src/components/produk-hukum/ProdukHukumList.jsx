import React from "react";
import { Link } from "react-router-dom";
import {
	LuFileText,
	LuCalendar,
	LuHash,
	LuChevronRight,
	LuScale,
	LuBookOpen,
} from "react-icons/lu";

const truncateText = (text, maxLength) => {
	if (!text) return "";
	if (text.length <= maxLength) return text;
	return text.substring(0, maxLength) + "...";
};

const JENIS_COLOR = {
	"Peraturan Desa": { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-200" },
	"Peraturan Kepala Desa": { bg: "bg-violet-50", text: "text-violet-700", ring: "ring-violet-200" },
	"Keputusan Kepala Desa": { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200" },
};

const formatDate = (dateStr) => {
	if (!dateStr) return "-";
	return new Date(dateStr).toLocaleDateString("id-ID", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
};

// Grid Card
const GridCard = ({ item }) => {
	const jc = JENIS_COLOR[item.jenis] || { bg: "bg-slate-50", text: "text-slate-700", ring: "ring-slate-200" };

	return (
		<Link
			to={`/desa/produk-hukum/${item.id}`}
			className="group flex flex-col rounded-xl border border-slate-200 bg-white transition-all hover:shadow-md hover:border-slate-300 overflow-hidden"
		>
			{/* Top accent */}
			<div className={`h-1 ${item.status_peraturan === "berlaku" ? "bg-emerald-500" : "bg-red-400"}`} />

			<div className="flex flex-col flex-1 p-4">
				{/* Badges */}
				<div className="flex items-center gap-2 flex-wrap mb-3">
					<span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${jc.bg} ${jc.text} ${jc.ring}`}>
						{item.singkatan_jenis || item.jenis}
					</span>
					<span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
						item.status_peraturan === "berlaku"
							? "bg-emerald-50 text-emerald-700 ring-emerald-200"
							: "bg-red-50 text-red-600 ring-red-200"
					}`}>
						{item.status_peraturan === "berlaku" ? "Berlaku" : "Dicabut"}
					</span>
				</div>

				{/* Title */}
				<h3 className="text-sm font-semibold text-slate-800 leading-snug mb-3 line-clamp-2 group-hover:text-blue-700 transition-colors">
					{truncateText(item.judul, 80)}
				</h3>

				{/* Meta */}
				<div className="mt-auto space-y-1.5">
					<div className="flex items-center gap-2 text-xs text-slate-500">
						<LuHash className="w-3.5 h-3.5 shrink-0" />
						<span>No. {item.nomor}</span>
					</div>
					<div className="flex items-center gap-2 text-xs text-slate-500">
						<LuCalendar className="w-3.5 h-3.5 shrink-0" />
						<span>{formatDate(item.tanggal_penetapan)} &middot; {item.tahun}</span>
					</div>
					{item.subjek && (
						<div className="flex items-center gap-2 text-xs text-slate-500">
							<LuBookOpen className="w-3.5 h-3.5 shrink-0" />
							<span className="truncate">{item.subjek}</span>
						</div>
					)}
				</div>
			</div>
		</Link>
	);
};

// List Row
const ListRow = ({ item }) => {
	const jc = JENIS_COLOR[item.jenis] || { bg: "bg-slate-50", text: "text-slate-700", ring: "ring-slate-200" };

	return (
		<Link
			to={`/desa/produk-hukum/${item.id}`}
			className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-all hover:shadow-sm hover:border-slate-300"
		>
			{/* Icon */}
			<div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
				item.status_peraturan === "berlaku" ? "bg-emerald-50" : "bg-red-50"
			}`}>
				<LuFileText className={`w-5 h-5 ${
					item.status_peraturan === "berlaku" ? "text-emerald-600" : "text-red-500"
				}`} />
			</div>

			{/* Content */}
			<div className="flex-1 min-w-0">
				<p className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors">
					{item.judul}
				</p>
				<div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
					<span>No. {item.nomor}</span>
					<span>&middot;</span>
					<span>{item.tahun}</span>
					<span>&middot;</span>
					<span>{formatDate(item.tanggal_penetapan)}</span>
				</div>
			</div>

			{/* Right badges */}
			<div className="hidden sm:flex items-center gap-2 shrink-0">
				<span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${jc.bg} ${jc.text} ${jc.ring}`}>
					{item.singkatan_jenis || item.jenis}
				</span>
				<span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
					item.status_peraturan === "berlaku"
						? "bg-emerald-50 text-emerald-700 ring-emerald-200"
						: "bg-red-50 text-red-600 ring-red-200"
				}`}>
					{item.status_peraturan === "berlaku" ? "Berlaku" : "Dicabut"}
				</span>
			</div>

			<LuChevronRight className="w-4 h-4 text-slate-300 shrink-0 group-hover:text-slate-500 transition-colors" />
		</Link>
	);
};

const ProdukHukumList = ({ produkHukums, viewMode = "grid" }) => {
	if (viewMode === "list") {
		return (
			<div className="space-y-2">
				{produkHukums.map((item) => (
					<ListRow key={item.id} item={item} />
				))}
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			{produkHukums.map((item) => (
				<GridCard key={item.id} item={item} />
			))}
		</div>
	);
};

export default ProdukHukumList;
