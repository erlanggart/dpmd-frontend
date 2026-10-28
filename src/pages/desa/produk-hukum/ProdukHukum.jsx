import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import api, { createProdukHukum } from "../../../api";
import ProdukHukumForm from "../../../components/produk-hukum/ProdukHukumForm";
import {
	LuArrowUpRight,
	LuBan,
	LuCalendarDays,
	LuCircleCheck,
	LuFileText,
	LuHash,
	LuLandmark,
	LuLayers,
	LuLayoutGrid,
	LuList,
	LuLoader,
	LuMapPin,
	LuPlus,
	LuScale,
	LuScrollText,
	LuSearch,
	LuStamp,
	LuTag,
	LuX,
} from "react-icons/lu";

// Satu tema per jenis: warna + ikon dipakai konsisten di chip filter, kartu, dan list.
const JENIS = [
	{
		value: "Peraturan Desa",
		label: "PERDES",
		icon: LuLandmark,
		badge: "bg-sky-50 text-sky-700 ring-sky-200",
		solid: "bg-sky-600",
		soft: "from-sky-50 via-white to-white",
		text: "text-sky-600",
	},
	{
		value: "Peraturan Kepala Desa",
		label: "PERKADES",
		icon: LuScrollText,
		badge: "bg-violet-50 text-violet-700 ring-violet-200",
		solid: "bg-violet-600",
		soft: "from-violet-50 via-white to-white",
		text: "text-violet-600",
	},
	{
		value: "Keputusan Kepala Desa",
		label: "SK KADES",
		icon: LuStamp,
		badge: "bg-amber-50 text-amber-700 ring-amber-200",
		solid: "bg-amber-500",
		soft: "from-amber-50 via-white to-white",
		text: "text-amber-600",
	},
];

const DEFAULT_THEME = {
	label: "",
	icon: LuFileText,
	badge: "bg-slate-50 text-slate-700 ring-slate-200",
	solid: "bg-slate-600",
	soft: "from-slate-50 via-white to-white",
	text: "text-slate-600",
};

const STATUS = [
	{ value: "berlaku", label: "Berlaku", icon: LuCircleCheck, active: "border-emerald-500 text-emerald-700", pill: "bg-emerald-100 text-emerald-700" },
	{ value: "dicabut", label: "Dicabut", icon: LuBan, active: "border-rose-500 text-rose-700", pill: "bg-rose-100 text-rose-700" },
];

const getTheme = (jenis) => JENIS.find((j) => j.value === jenis) || DEFAULT_THEME;

const formatDate = (value) =>
	value
		? new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
		: "-";

const StatTile = ({ icon: Icon, label, value, hint }) => (
	<div className="rounded-xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm">
		<div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-white/70">
			<Icon className="h-4 w-4" /> {label}
		</div>
		<p className="mt-2 text-3xl font-bold tabular-nums text-white">{value}</p>
		<p className="mt-0.5 truncate text-xs text-white/70">{hint}</p>
	</div>
);

const StatusBadge = ({ status }) => {
	const dicabut = status === "dicabut";
	const Icon = dicabut ? LuBan : LuCircleCheck;

	return (
		<span
			className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
				dicabut ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"
			}`}
		>
			<Icon className="h-3.5 w-3.5" />
			{dicabut ? "Dicabut" : "Berlaku"}
		</span>
	);
};

const MetaItem = ({ icon: Icon, children }) => (
	<span className="inline-flex min-w-0 items-center gap-1.5">
		<Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
		<span className="truncate">{children}</span>
	</span>
);

const Card = ({ item }) => {
	const theme = getTheme(item.jenis);
	const Icon = theme.icon;

	return (
		<Link
			to={`/desa/produk-hukum/${item.id}`}
			className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"
		>
			<div className={`relative overflow-hidden bg-gradient-to-br ${theme.soft} px-5 pb-4 pt-5`}>
				<Icon className={`pointer-events-none absolute -bottom-4 -right-3 h-24 w-24 opacity-[0.07] ${theme.text}`} />
				<div className="relative flex items-start justify-between gap-3">
					<div className="flex items-center gap-3">
						<span className={`flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-md ${theme.solid}`}>
							<Icon className="h-5 w-5" />
						</span>
						<div className="min-w-0">
							<p className={`text-sm font-bold tracking-wide ${theme.text}`}>{item.singkatan_jenis || theme.label}</p>
							<p className="truncate text-xs text-slate-500">{item.jenis}</p>
						</div>
					</div>
					<StatusBadge status={item.status_peraturan} />
				</div>
				<div className="relative mt-5 flex items-baseline gap-2">
					<LuHash className="h-4 w-4 self-center text-slate-300" />
					<span className="text-3xl font-bold leading-none tabular-nums text-slate-900">{item.nomor || "-"}</span>
					<span className="text-lg font-semibold tabular-nums text-slate-400">/ {item.tahun || "-"}</span>
				</div>
			</div>

			<div className="flex flex-1 flex-col gap-3 px-5 py-4">
				<p className="line-clamp-3 text-sm font-semibold leading-6 text-slate-800">{item.judul}</p>
				<div className="mt-auto grid gap-1.5 text-xs text-slate-500">
					<MetaItem icon={LuCalendarDays}>Ditetapkan {formatDate(item.tanggal_penetapan)}</MetaItem>
					{item.tempat_penetapan ? <MetaItem icon={LuMapPin}>{item.tempat_penetapan}</MetaItem> : null}
					{item.subjek ? <MetaItem icon={LuTag}>{item.subjek}</MetaItem> : null}
				</div>
			</div>

			<div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm">
				<span className="inline-flex items-center gap-1.5 font-medium text-slate-500 group-hover:text-slate-900">
					<LuFileText className="h-4 w-4" /> Lihat dokumen
				</span>
				<span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition group-hover:bg-slate-900 group-hover:text-white">
					<LuArrowUpRight className="h-4 w-4" />
				</span>
			</div>
		</Link>
	);
};

const Row = ({ item }) => {
	const theme = getTheme(item.jenis);
	const Icon = theme.icon;

	return (
		<Link
			to={`/desa/produk-hukum/${item.id}`}
			className="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-slate-200 bg-white py-3.5 pl-5 pr-4 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:gap-5"
		>
			<span className={`absolute inset-y-0 left-0 w-1 ${theme.solid}`} />

			<div className="flex w-12 shrink-0 items-center gap-3 md:w-40">
				<span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md ${theme.solid}`}>
					<Icon className="h-5 w-5" />
				</span>
				<div className="hidden min-w-0 md:block">
					<p className={`text-sm font-bold tracking-wide ${theme.text}`}>{item.singkatan_jenis || theme.label}</p>
					<p className="truncate text-xs text-slate-500">{item.jenis}</p>
				</div>
			</div>

			<div className="w-24 shrink-0 border-r border-slate-100 pr-4 sm:w-28">
				<p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
					<LuHash className="h-3 w-3" /> Nomor
				</p>
				<p className="truncate text-2xl font-bold leading-tight tabular-nums text-slate-900">{item.nomor || "-"}</p>
				<p className="text-sm font-semibold tabular-nums text-slate-500">Tahun {item.tahun || "-"}</p>
			</div>

			<div className="min-w-0 flex-1">
				<p className="line-clamp-2 text-sm font-semibold leading-6 text-slate-800 group-hover:text-slate-900">
					{item.judul}
				</p>
				<div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
					<MetaItem icon={LuCalendarDays}>{formatDate(item.tanggal_penetapan)}</MetaItem>
					{item.tempat_penetapan ? <MetaItem icon={LuMapPin}>{item.tempat_penetapan}</MetaItem> : null}
					{item.subjek ? (
						<span className="hidden max-w-xs lg:inline-flex">
							<MetaItem icon={LuTag}>{item.subjek}</MetaItem>
						</span>
					) : null}
				</div>
			</div>

			<span className="hidden sm:inline-flex">
				<StatusBadge status={item.status_peraturan} />
			</span>
			<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition group-hover:bg-slate-900 group-hover:text-white">
				<LuArrowUpRight className="h-4 w-4" />
			</span>
		</Link>
	);
};

const ProdukHukum = () => {
	const [items, setItems] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isFormVisible, setIsFormVisible] = useState(false);
	const [search, setSearch] = useState("");
	const [jenis, setJenis] = useState("");
	const [status, setStatus] = useState("berlaku");
	const [tahun, setTahun] = useState("");
	const [viewMode, setViewMode] = useState("list");

	// ponytail: ambil semua dokumen desa sekali (all=true) lalu filter di klien —
	// jumlah per desa kecil; pindah ke filter server kalau sudah ribuan dokumen.
	const fetchItems = useCallback(async () => {
		try {
			setIsLoading(true);
			const res = await api.get("/produk-hukum", { params: { all: true } });
			setItems(Array.isArray(res.data?.data) ? res.data.data : []);
		} catch (error) {
			setItems([]);
			Swal.fire({
				icon: "error",
				title: "Oops...",
				text: error.response?.data?.message || "Gagal memuat data produk hukum!",
			});
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchItems();
	}, [fetchItems]);

	const handleFormSubmit = async (formData) => {
		try {
			Swal.fire({
				title: "Menyimpan produk hukum...",
				allowOutsideClick: false,
				showConfirmButton: false,
				didOpen: () => Swal.showLoading(),
			});
			await createProdukHukum(formData);
			Swal.close();
			setIsFormVisible(false);
			await fetchItems();
			Swal.fire({ icon: "success", title: "Berhasil!", text: "Produk hukum berhasil ditambahkan.", timer: 2000, showConfirmButton: false });
		} catch (error) {
			Swal.close();
			Swal.fire({
				icon: "error",
				title: "Gagal!",
				text: "Terjadi kesalahan saat menyimpan data. " + (error.response?.data?.message || "Silakan coba lagi."),
			});
			throw error;
		}
	};

	// Cocokkan item dengan semua filter kecuali `skip`, supaya angka di tiap tombol
	// menunjukkan hasil jika tombol itu dipilih.
	const matches = useCallback(
		(item, skip) => {
			const q = search.trim().toLowerCase();
			if (q && ![item.judul, item.nomor, item.subjek].some((v) => String(v || "").toLowerCase().includes(q))) return false;
			if (skip !== "jenis" && jenis && item.jenis !== jenis) return false;
			if (skip !== "status" && item.status_peraturan !== status) return false;
			if (skip !== "tahun" && tahun && String(item.tahun) !== tahun) return false;
			return true;
		},
		[search, jenis, status, tahun]
	);

	const countBy = (key, skip) => {
		const counts = { "": 0 };
		items.filter((item) => matches(item, skip)).forEach((item) => {
			counts[""] += 1;
			counts[item[key]] = (counts[item[key]] || 0) + 1;
		});
		return counts;
	};
	const jenisCounts = countBy("jenis", "jenis");
	const statusCounts = countBy("status_peraturan", "status");

	const tahunOptions = useMemo(
		() => [...new Set(items.map((item) => item.tahun).filter(Boolean))].sort((a, b) => b - a),
		[items]
	);

	// Kelompokkan per tahun (terbaru di atas), di dalamnya urut tanggal penetapan terbaru.
	const groups = useMemo(() => {
		const byYear = new Map();
		items
			.filter((item) => matches(item))
			.sort((a, b) => new Date(b.tanggal_penetapan || 0) - new Date(a.tanggal_penetapan || 0))
			.forEach((item) => {
				const key = item.tahun || "Tanpa tahun";
				if (!byYear.has(key)) byYear.set(key, []);
				byYear.get(key).push(item);
			});
		return [...byYear.entries()].sort(([a], [b]) => (Number(b) || 0) - (Number(a) || 0));
	}, [items, matches]);

	const stats = useMemo(() => {
		const count = (key, value) => items.filter((item) => item[key] === value).length;
		const percent = (n) => (items.length ? Math.round((n / items.length) * 100) : 0);
		const berlaku = count("status_peraturan", "berlaku");
		const dicabut = count("status_peraturan", "dicabut");
		const latestYear = tahunOptions[0];
		return {
			berlaku,
			dicabut,
			berlakuHint: `${percent(berlaku)}% dari total dokumen`,
			dicabutHint: `${percent(dicabut)}% dari total dokumen`,
			jenisHint: JENIS.map((j) => `${j.label} ${count("jenis", j.value)}`).join(" · "),
			latestYear: latestYear || "-",
			latestHint: latestYear
				? `${items.filter((item) => item.tahun === latestYear).length} dokumen di tahun ini`
				: "Belum ada dokumen",
		};
	}, [items, tahunOptions]);

	const hasFilter = search || jenis || tahun;
	const resetFilter = () => {
		setSearch("");
		setJenis("");
		setTahun("");
	};

	if (isFormVisible) {
		return (
			<section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
				<div className="mb-6 flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
					<h1 className="text-xl font-semibold text-slate-900">Tambah Produk Hukum</h1>
					<button
						type="button"
						onClick={() => setIsFormVisible(false)}
						className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
					>
						<LuX className="h-4 w-4" /> Batal
					</button>
				</div>
				<ProdukHukumForm onSubmit={handleFormSubmit} />
			</section>
		);
	}

	const jenisChips = [{ value: "", label: "Semua jenis", icon: LuLayers }, ...JENIS];

	return (
		<div className="space-y-5">
			<section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 p-5 text-white sm:p-6">
				<LuScale className="pointer-events-none absolute -right-6 -top-6 h-48 w-48 text-white/5" />
				<div className="relative flex flex-wrap items-center justify-between gap-4">
					<div className="flex items-center gap-4">
						<span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
							<LuScale className="h-6 w-6" />
						</span>
						<div>
							<h1 className="text-xl font-semibold sm:text-2xl">Produk Hukum Desa</h1>
							<p className="mt-0.5 text-sm text-white/70">Arsip PERDES, PERKADES, dan SK Kepala Desa</p>
						</div>
					</div>
					<button
						type="button"
						onClick={() => setIsFormVisible(true)}
						className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
					>
						<LuPlus className="h-4 w-4" /> Tambah Produk Hukum
					</button>
				</div>
				<div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<StatTile icon={LuFileText} label="Total dokumen" value={items.length} hint={stats.jenisHint} />
					<StatTile icon={LuCircleCheck} label="Berlaku" value={stats.berlaku} hint={stats.berlakuHint} />
					<StatTile icon={LuBan} label="Dicabut" value={stats.dicabut} hint={stats.dicabutHint} />
					<StatTile icon={LuCalendarDays} label="Tahun terbaru" value={stats.latestYear} hint={stats.latestHint} />
				</div>
			</section>

			<section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
				<div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 px-4 pt-2">
					<div className="flex gap-1">
						{STATUS.map(({ value, label, icon: Icon, active, pill }) => (
							<button
								key={value}
								type="button"
								onClick={() => setStatus(value)}
								aria-pressed={status === value}
								className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
									status === value ? active : "border-transparent text-slate-500 hover:text-slate-800"
								}`}
							>
								<Icon className="h-4 w-4" />
								{label}
								<span className={`rounded-full px-2 py-0.5 text-xs ${status === value ? pill : "bg-slate-100 text-slate-500"}`}>
									{statusCounts[value] || 0}
								</span>
							</button>
						))}
					</div>
					<div className="mb-2 inline-flex rounded-lg bg-slate-100 p-1">
						{[
							{ value: "list", label: "List", icon: LuList },
							{ value: "grid", label: "Grid", icon: LuLayoutGrid },
						].map(({ value, label, icon: Icon }) => (
							<button
								key={value}
								type="button"
								onClick={() => setViewMode(value)}
								aria-pressed={viewMode === value}
								className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
									viewMode === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
								}`}
							>
								<Icon className="h-4 w-4" /> {label}
							</button>
						))}
					</div>
				</div>

				<div className="space-y-3 p-4">
					<div className="flex flex-col gap-3 sm:flex-row">
						<div className="relative flex-1">
							<LuSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
							<input
								type="text"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Cari judul, nomor, atau subjek..."
								className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
							/>
						</div>
						<div className="relative">
							<LuCalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
							<select
								value={tahun}
								onChange={(e) => setTahun(e.target.value)}
								className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-8 text-sm outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
							>
								<option value="">Semua tahun</option>
								{tahunOptions.map((year) => (
									<option key={year} value={String(year)}>
										{year}
									</option>
								))}
							</select>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						{jenisChips.map(({ value, label, icon: Icon, solid }) => {
							const selected = jenis === value;
							return (
								<button
									key={value}
									type="button"
									onClick={() => setJenis(value)}
									aria-pressed={selected}
									className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset transition ${
										selected
											? `${solid || "bg-slate-900"} text-white ring-transparent shadow-sm`
											: "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
									}`}
								>
									<Icon className="h-4 w-4" />
									{label}
									<span className={`text-xs ${selected ? "text-white/80" : "text-slate-400"}`}>{jenisCounts[value] || 0}</span>
								</button>
							);
						})}
						{hasFilter ? (
							<button
								type="button"
								onClick={resetFilter}
								className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
							>
								<LuX className="h-4 w-4" /> Reset filter
							</button>
						) : null}
					</div>
				</div>
			</section>

			{isLoading ? (
				<div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
					<LuLoader className="h-5 w-5 animate-spin" /> Memuat data...
				</div>
			) : groups.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
					<span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
						<LuFileText className="h-7 w-7" />
					</span>
					<p className="mt-4 text-sm font-medium text-slate-700">
						{hasFilter
							? "Tidak ada dokumen yang cocok dengan filter."
							: `Belum ada produk hukum yang ${status === "dicabut" ? "dicabut" : "berlaku"}.`}
					</p>
					{hasFilter ? (
						<button type="button" onClick={resetFilter} className="mt-3 text-sm font-semibold text-sky-700 hover:underline">
							Reset filter
						</button>
					) : status === "berlaku" ? (
						<button
							type="button"
							onClick={() => setIsFormVisible(true)}
							className="mt-3 text-sm font-semibold text-sky-700 hover:underline"
						>
							Tambah produk hukum
						</button>
					) : null}
				</div>
			) : (
				groups.map(([year, rows]) => (
					<section key={year} className="space-y-3">
						<div className="flex items-center gap-3">
							<span className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white">
								<LuCalendarDays className="h-4 w-4" /> Tahun {year}
							</span>
							<span className="text-sm text-slate-500">{rows.length} dokumen</span>
							<span className="h-px flex-1 bg-slate-200" />
						</div>
						{viewMode === "grid" ? (
							<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
								{rows.map((item) => (
									<Card key={item.id} item={item} />
								))}
							</div>
						) : (
							<div className="space-y-2.5">
								{rows.map((item) => (
									<Row key={item.id} item={item} />
								))}
							</div>
						)}
					</section>
				))
			)}
		</div>
	);
};

export default ProdukHukum;
