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

const DEFAULT_JENIS_TONE = {
	badge: "bg-slate-50 text-slate-700 ring-slate-200",
	card: "bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]",
	glow: "bg-slate-200/40",
	icon: "bg-slate-100 text-slate-700",
};

const formatDate = (dateStr) => {
	if (!dateStr) return "-";
	return new Date(dateStr).toLocaleDateString("id-ID", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
};

const getJenisTone = (jenis) => JENIS_TONE[jenis] || DEFAULT_JENIS_TONE;

const getStatusTone = (status) => STATUS_TONE[status] || STATUS_TONE.berlaku;

const getStatusLabel = (status) => (status === "dicabut" ? "Dicabut" : "Berlaku");

const getSummaryText = (item) =>
	item.subjek ||
	item.keterangan_status ||
	"Dokumen hukum desa dengan metadata resmi dan siap ditelusuri kembali.";

const MetaItem = ({ icon, children }) => {
	const IconComponent = icon;

	return (
		<div className="flex items-center gap-2 text-xs text-slate-500">
			{IconComponent ? <IconComponent className="h-3.5 w-3.5 shrink-0" /> : null}
			<span className="truncate">{children}</span>
		</div>
	);
};

const ListMetaCard = ({ icon, label, value }) => {
	const IconComponent = icon;

	return (
		<div className="rounded-xl border border-slate-200/80 bg-white/85 px-3 py-2.5 shadow-sm">
			<div className="flex items-start gap-2.5">
				<div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
					{IconComponent ? <IconComponent className="h-3.5 w-3.5" /> : null}
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
						{label}
					</p>
					<p className="mt-1 break-words text-sm font-semibold leading-5 text-slate-700">
						{value}
					</p>
				</div>
			</div>
		</div>
	);
};

const GridCard = ({ item }) => {
	const jenisTone = getJenisTone(item.jenis);
	const statusTone = getStatusTone(item.status_peraturan);
	const summaryText = getSummaryText(item);

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
						{getStatusLabel(item.status_peraturan)}
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
	const jenisTone = getJenisTone(item.jenis);
	const statusTone = getStatusTone(item.status_peraturan);
	const summaryText = getSummaryText(item);
	const statusLabel = getStatusLabel(item.status_peraturan);

	return (
		<Link
			to={`/desa/produk-hukum/${item.id}`}
			className={`group relative overflow-hidden rounded-[1.5rem] border border-slate-200/80 ${jenisTone.card} p-4 transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_24px_50px_-36px_rgba(15,23,42,0.35)] sm:p-5`}
		>
			<div className={`absolute inset-y-4 left-0 w-1 rounded-r-full bg-gradient-to-b ${statusTone.accent}`} />
			<div className={`absolute right-4 top-4 h-24 w-24 rounded-full ${jenisTone.glow} blur-3xl opacity-70 transition group-hover:opacity-100`} />

			<div className="relative z-10 ml-2 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(240px,0.8fr)] lg:items-center">
				<div className="flex items-start gap-4">
					<div className={`mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${jenisTone.icon} shadow-sm ring-1 ring-black/5`}>
						<LuFileText className="h-5 w-5" />
					</div>

					<div className="min-w-0 flex-1">
						<div className="flex flex-wrap items-center gap-2">
							<span className={`inline-flex items-center rounded-lg px-3 py-1 text-[11px] font-semibold ring-1 ring-inset ${jenisTone.badge}`}>
								{item.singkatan_jenis || item.jenis}
							</span>
							<span className={`inline-flex items-center rounded-lg px-3 py-1 text-[11px] font-semibold ring-1 ring-inset ${statusTone.badge}`}>
								{statusLabel}
							</span>
							<span className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white/90 shadow-sm">
								{item.tahun || "-"}
							</span>
						</div>

						<h3 className="mt-3 text-lg font-black leading-7 tracking-tight text-slate-900 transition-colors group-hover:text-sky-700">
							{item.judul}
						</h3>

						<p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
							{truncateText(summaryText, 180)}
						</p>

						<div className="mt-4 grid gap-2 sm:grid-cols-2 2xl:grid-cols-4">
							<ListMetaCard icon={LuHash} label="Nomor" value={`No. ${item.nomor || "-"}`} />
							<ListMetaCard
								icon={LuCalendar}
								label="Tanggal penetapan"
								value={`${formatDate(item.tanggal_penetapan)} • ${item.tahun || "-"}`}
							/>
							<ListMetaCard
								icon={LuMapPin}
								label="Tempat"
								value={item.tempat_penetapan || "Tempat penetapan belum diisi"}
							/>
							<ListMetaCard
								icon={LuBookOpen}
								label="Subjek"
								value={item.subjek || "Subjek belum ditambahkan"}
							/>
						</div>
					</div>
				</div>

				<div className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur-sm">
					<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
						Akses cepat
					</p>
					<div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
						<div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
							<p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
								Status dokumen
							</p>
							<p className="mt-2 text-sm font-semibold text-slate-800">{statusLabel}</p>
							<p className="mt-1 text-xs leading-5 text-slate-500">
								{item.singkatan_jenis || item.jenis || "Produk hukum desa"}
							</p>
						</div>

						<div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
							<div>
								<p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
									Lihat detail
								</p>
								<p className="mt-2 text-sm font-semibold text-slate-800">Buka dokumen</p>
								<p className="mt-1 text-xs leading-5 text-slate-500">
									Periksa metadata lengkap dan lampiran PDF arsip ini.
								</p>
							</div>
							<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition group-hover:translate-x-1 group-hover:text-sky-600">
								<LuChevronRight className="h-5 w-5" />
							</span>
						</div>
					</div>
				</div>
			</div>
		</Link>
	);
};

const ProdukHukumList = ({ produkHukums, viewMode = "grid" }) => {
	if (viewMode === "list") {
		return (
			<div className="grid gap-4">
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