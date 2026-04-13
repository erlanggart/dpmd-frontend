import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
	getProdukHukums,
	createProdukHukum,
} from "../../../api";
import ProdukHukumList from "../../../components/produk-hukum/ProdukHukumList";
import ProdukHukumForm from "../../../components/produk-hukum/ProdukHukumForm";
import {
	LuArrowRight,
	LuBadgeCheck,
	LuBookOpen,
	LuCalendar,
	LuFileText,
	LuFilter,
	LuLayoutGrid,
	LuList,
	LuLoader,
	LuPlus,
	LuScale,
	LuSearch,
	LuX,
} from "react-icons/lu";

const JENIS_OPTIONS = [
	{ value: "", label: "Semua Jenis" },
	{ value: "Peraturan Desa", label: "PERDES" },
	{ value: "Peraturan Kepala Desa", label: "PERKADES" },
	{ value: "Keputusan Kepala Desa", label: "SK KADES" },
];

const STATUS_OPTIONS = [
	{ value: "", label: "Semua Status" },
	{ value: "berlaku", label: "Berlaku" },
	{ value: "dicabut", label: "Dicabut" },
];

const SURFACE_CLASS =
	"rounded-lg border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.55)] backdrop-blur-sm";

const INPUT_CLASS =
	"w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-50";

const SELECT_CLASS =
	"w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";

const numberFormatter = new Intl.NumberFormat("id-ID");

const formatCount = (value) => numberFormatter.format(Number(value || 0));

const getOptionLabel = (options, value, fallback = value) => {
	const match = options.find((option) => option.value === value);
	return match?.label || fallback;
};

const StatCard = ({ icon, label, value, hint, accentClass }) => {
	const IconComponent = icon;

	return (
		<div className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
			<div className="flex items-start justify-between gap-4">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">
						{label}
					</p>
					<p className="mt-3 text-2xl font-black tracking-tight text-white">{value}</p>
					<p className="mt-2 text-xs leading-5 text-white/70">{hint}</p>
				</div>
				<div className={`flex h-12 w-12 items-center justify-center rounded-lg ${accentClass}`}>
					{IconComponent ? <IconComponent className="h-5 w-5" /> : null}
				</div>
			</div>
		</div>
	);
};

const FilterChip = ({ label, onRemove }) => (
	<button
		type="button"
		onClick={onRemove}
		className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
	>
		<span>{label}</span>
		<LuX className="h-3.5 w-3.5" />
	</button>
);

const InsightRow = ({ icon, label, value, helper }) => {
	const IconComponent = icon;

	return (
		<div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
			<div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-sky-600 shadow-sm">
				{IconComponent ? <IconComponent className="h-4.5 w-4.5" /> : null}
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
					{label}
				</p>
				<p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
				<p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
			</div>
		</div>
	);
};

const EmptyState = ({ hasScopedView, onResetScope, onAdd }) => (
	<div className="flex min-h-[340px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.12),transparent_35%),linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-6 text-center">
		<div className="flex h-16 w-16 items-center justify-center rounded-lg bg-sky-100 text-sky-600 shadow-lg shadow-sky-100">
			<LuFileText className="h-8 w-8" />
		</div>
		<h3 className="mt-5 text-2xl font-black tracking-tight text-slate-900">
			{hasScopedView ? "Tidak ada arsip yang sesuai" : "Arsip produk hukum masih kosong"}
		</h3>
		<p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
			{hasScopedView
				? "Ubah kata kunci pencarian atau longgarkan filter agar lebih banyak dokumen muncul."
				: "Mulai bangun arsip hukum desa yang rapi dengan menambahkan produk hukum pertama Anda."}
		</p>
		<button
			type="button"
			onClick={hasScopedView ? onResetScope : onAdd}
			className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
		>
			{hasScopedView ? <LuX className="h-4 w-4" /> : <LuPlus className="h-4 w-4" />}
			{hasScopedView ? "Reset pencarian & filter" : "Tambah Produk Hukum"}
		</button>
	</div>
);

const ProdukHukum = () => {
	const [produkHukums, setProdukHukums] = useState([]);
	const [isFormVisible, setIsFormVisible] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [searchTerm, setSearchTerm] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [viewMode, setViewMode] = useState("list");
	const [filterJenis, setFilterJenis] = useState("");
	const [filterStatus, setFilterStatus] = useState("");
	const [filterTahun, setFilterTahun] = useState("");
	const [showFilters, setShowFilters] = useState(false);

	const previousSearchRef = useRef("");

	const fetchProdukHukums = useCallback(async (page, search = "") => {
		try {
			setIsLoading(true);
			const normalizedSearch = search.trim();
			const response = await getProdukHukums(page, normalizedSearch);

			if (response?.data?.data?.data) {
				setProdukHukums(response.data.data.data);
				setCurrentPage(response.data.data.current_page);
				setTotalPages(response.data.data.last_page);
				return;
			}

			if (response?.data?.data) {
				const data = Array.isArray(response.data.data) ? response.data.data : [];
				setProdukHukums(data);
				setCurrentPage(1);
				setTotalPages(1);
				return;
			}

			if (response?.data) {
				const data = Array.isArray(response.data) ? response.data : [];
				setProdukHukums(data);
				setCurrentPage(1);
				setTotalPages(1);
				return;
			}

			setProdukHukums([]);
			setCurrentPage(1);
			setTotalPages(1);
		} catch (error) {
			console.error("Error fetching produk hukum:", error);
			setProdukHukums([]);
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
		const delayDebounce = setTimeout(() => {
			setDebouncedSearch(searchTerm.trim());
		}, 400);

		return () => clearTimeout(delayDebounce);
	}, [searchTerm]);

	useEffect(() => {
		const searchChanged = previousSearchRef.current !== debouncedSearch;

		if (searchChanged) {
			previousSearchRef.current = debouncedSearch;

			if (currentPage !== 1) {
				setCurrentPage(1);
				return;
			}
		}

		fetchProdukHukums(currentPage, debouncedSearch);
	}, [currentPage, debouncedSearch, fetchProdukHukums]);

	const handleFormSubmit = async (formData) => {
		try {
			Swal.fire({
				title: "Menyimpan produk hukum...",
				text: "Mohon tunggu, sedang memproses data.",
				allowOutsideClick: false,
				allowEscapeKey: false,
				showConfirmButton: false,
				didOpen: () => {
					Swal.showLoading();
				},
			});

			await createProdukHukum(formData);

			Swal.close();
			setSearchTerm("");
			setCurrentPage(1);
			await fetchProdukHukums(1, "");
			setIsFormVisible(false);

			Swal.fire({
				icon: "success",
				title: "Berhasil!",
				text: "Produk hukum berhasil ditambahkan.",
				timer: 2000,
				showConfirmButton: false,
			});
		} catch (error) {
			Swal.close();
			console.error("Error submitting form:", error.response?.data || error);
			Swal.fire({
				icon: "error",
				title: "Gagal!",
				text:
					"Terjadi kesalahan saat menyimpan data. " +
					(error.response?.data?.message || "Silakan coba lagi."),
			});
			throw error;
		}
	};

	const showAddForm = () => {
		setIsFormVisible(true);
	};

	const handleCancelForm = () => {
		setIsFormVisible(false);
	};

	const clearFilters = () => {
		setFilterJenis("");
		setFilterStatus("");
		setFilterTahun("");
	};

	const resetScope = () => {
		setSearchTerm("");
		clearFilters();
	};

	const tahunOptions = useMemo(() => {
		const years = [...new Set(produkHukums.map((item) => item.tahun).filter(Boolean))].sort(
			(a, b) => Number(b) - Number(a)
		);

		return [
			{ value: "", label: "Semua Tahun" },
			...years.map((year) => ({ value: String(year), label: String(year) })),
		];
	}, [produkHukums]);

	const filteredItems = useMemo(() => {
		return produkHukums.filter((item) => {
			if (filterJenis && item.jenis !== filterJenis) return false;
			if (filterStatus && item.status_peraturan !== filterStatus) return false;
			if (filterTahun && String(item.tahun) !== filterTahun) return false;
			return true;
		});
	}, [produkHukums, filterJenis, filterStatus, filterTahun]);

	const stats = useMemo(() => {
		const berlaku = produkHukums.filter((item) => item.status_peraturan === "berlaku").length;
		const dicabut = produkHukums.filter((item) => item.status_peraturan === "dicabut").length;
		return { total: produkHukums.length, berlaku, dicabut };
	}, [produkHukums]);

	const latestYear = useMemo(() => {
		const years = produkHukums
			.map((item) => Number(item.tahun))
			.filter((year) => Number.isFinite(year) && year > 0);

		return years.length ? Math.max(...years) : null;
	}, [produkHukums]);

	const jenisStats = useMemo(() => {
		return [
			{
				label: "PERDES",
				description: "Peraturan Desa",
				value: produkHukums.filter((item) => item.jenis === "Peraturan Desa").length,
				tone: {
					bg: "bg-sky-50",
					border: "border-sky-100",
					text: "text-sky-700",
					bar: "from-sky-400 to-blue-500",
				},
			},
			{
				label: "PERKADES",
				description: "Peraturan Kepala Desa",
				value: produkHukums.filter((item) => item.jenis === "Peraturan Kepala Desa").length,
				tone: {
					bg: "bg-violet-50",
					border: "border-violet-100",
					text: "text-violet-700",
					bar: "from-violet-400 to-fuchsia-500",
				},
			},
			{
				label: "SK KADES",
				description: "Keputusan Kepala Desa",
				value: produkHukums.filter((item) => item.jenis === "Keputusan Kepala Desa").length,
				tone: {
					bg: "bg-amber-50",
					border: "border-amber-100",
					text: "text-amber-700",
					bar: "from-amber-400 to-orange-500",
				},
			},
		];
	}, [produkHukums]);

	const dominantJenis = useMemo(() => {
		const sortedJenis = [...jenisStats].sort((left, right) => right.value - left.value);
		const topItem = sortedJenis[0];

		return topItem && topItem.value > 0 ? topItem.description : "Belum ada data";
	}, [jenisStats]);

	const searchQuery = searchTerm.trim();
	const activeFilterCount = [filterJenis, filterStatus, filterTahun].filter(Boolean).length;
	const activeScopeCount = activeFilterCount + (searchQuery ? 1 : 0);
	const hasScopedView = activeScopeCount > 0;

	const activeChips = useMemo(() => {
		const chips = [];

		if (searchQuery) {
			chips.push({ key: "search", label: `Cari: ${searchQuery}` });
		}

		if (filterJenis) {
			chips.push({
				key: "jenis",
				label: `Jenis: ${getOptionLabel(JENIS_OPTIONS, filterJenis, filterJenis)}`,
			});
		}

		if (filterStatus) {
			chips.push({
				key: "status",
				label: `Status: ${getOptionLabel(STATUS_OPTIONS, filterStatus, filterStatus)}`,
			});
		}

		if (filterTahun) {
			chips.push({ key: "tahun", label: `Tahun: ${filterTahun}` });
		}

		return chips;
	}, [filterJenis, filterStatus, filterTahun, searchQuery]);

	const handleRemoveChip = (key) => {
		if (key === "search") setSearchTerm("");
		if (key === "jenis") setFilterJenis("");
		if (key === "status") setFilterStatus("");
		if (key === "tahun") setFilterTahun("");
	};

	return (
		<div className="relative overflow-hidden rounded-lg border border-slate-200/70 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] p-4 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.45)] sm:p-6 lg:p-8">
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-sky-200/30 blur-3xl" />
				<div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-blue-200/30 blur-3xl" />
			</div>

			<div className="relative z-10 space-y-6 lg:space-y-8">
				<section className="overflow-hidden rounded-lg bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 p-6 text-white shadow-[0_32px_90px_-40px_rgba(14,116,144,0.9)] sm:p-8">
						<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-center">
							<div className="space-y-5">
							<div className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/75 backdrop-blur-sm">
								<LuFileText className="h-4 w-4" />
								Arsip regulasi desa
							</div>

							<div className="max-w-3xl">
								<h1 className="text-3xl font-black tracking-tight sm:text-4xl">
									Produk Hukum Desa
								</h1>
								<p className="mt-3 text-sm leading-7 text-white/80 sm:text-base">
									Kelola PERDES, PERKADES, dan SK KADES dalam satu ruang arsip yang lebih rapi, cepat ditelusuri, dan nyaman dipakai saat verifikasi maupun publikasi internal.
								</p>
							</div>

							<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
								<StatCard
									icon={LuFileText}
									label="Total arsip"
									value={formatCount(stats.total)}
									hint="Jumlah seluruh produk hukum yang tersimpan"
									accentClass="bg-white/10 text-white"
								/>
								<StatCard
									icon={LuBadgeCheck}
									label="Berlaku"
									value={formatCount(stats.berlaku)}
									hint="Dokumen yang masih aktif digunakan"
									accentClass="bg-emerald-400/20 text-emerald-100"
								/>
								<StatCard
									icon={LuX}
									label="Dicabut"
									value={formatCount(stats.dicabut)}
									hint="Dokumen yang sudah tidak berlaku"
									accentClass="bg-rose-400/20 text-rose-100"
								/>
								<StatCard
									icon={LuCalendar}
									label="Arsip terbaru"
									value={latestYear || "-"}
									hint="Tahun dokumen terbaru yang tersedia"
									accentClass="bg-amber-400/20 text-amber-100"
								/>
							</div>
						</div>

						<div className="flex self-end rounded-lg border border-white/15 bg-white/10 p-5 backdrop-blur-sm xl:flex-col">
							{isFormVisible ? (
								<>
									<p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">
										Mode editor aktif
									</p>
									<h2 className="mt-3 text-2xl font-black tracking-tight text-white">
										Tambah produk hukum baru
									</h2>
									<p className="mt-3 text-sm leading-6 text-white/75">
										Lengkapi metadata dokumen, pastikan file PDF sudah final, lalu simpan agar arsip langsung terstruktur dengan baik.
									</p>

									<div className="mt-5 rounded-lg border border-white/10 bg-slate-950/15 p-4 text-sm text-white/80">
										<p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
											Dokumen yang sedang diproses
										</p>
										<p className="mt-2 text-base font-semibold text-white">
											Produk hukum baru
										</p>
										<p className="mt-2 text-xs leading-5 text-white/65">
											Setelah disimpan, dokumen akan langsung masuk ke daftar arsip desa.
										</p>
									</div>

									<button
										type="button"
										onClick={handleCancelForm}
										className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
									>
										<LuX className="h-4 w-4" />
										Batal dan kembali ke arsip
									</button>
								</>
							) : (
								<>
									<p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">
										Aksi cepat
									</p>
									<h2 className="mt-3 text-2xl font-black tracking-tight text-white">
										Bangun arsip hukum yang rapi
									</h2>
									<p className="mt-3 text-sm leading-6 text-white/75">
										Tambahkan dokumen baru dengan metadata yang lengkap agar mudah ditemukan kembali saat dibutuhkan.
									</p>

									<button
										type="button"
										onClick={showAddForm}
										className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
									>
										<LuPlus className="h-4 w-4" />
										Tambah produk hukum
										<LuArrowRight className="h-4 w-4" />
									</button>
								</>
							)}
						</div>
					</div>
				</section>

				{isFormVisible ? (
					<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
						<section className={SURFACE_CLASS}>
							<div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
								<div>
									<p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">
										Editor dokumen
									</p>
									<h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
									Tambah produk hukum desa
									</h2>
									<p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
										Lengkapi judul, nomor, tahun, status, dan file PDF agar arsip mudah ditemukan dan siap digunakan pada proses administrasi desa.
									</p>
								</div>

								<button
									type="button"
									onClick={handleCancelForm}
									className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
								>
									<LuX className="h-4 w-4" />
									Batal
								</button>
							</div>

							<div className="mt-6">
								<ProdukHukumForm onSubmit={handleFormSubmit} />
							</div>
						</section>

						<aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
							<section className={SURFACE_CLASS}>
								<p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">
									Checklist input
								</p>
								<h3 className="mt-2 text-xl font-black tracking-tight text-slate-900">
									Sebelum disimpan
								</h3>
								<div className="mt-5 space-y-3">
									<div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
										Judul dokumen harus jelas dan mudah dikenali.
									</div>
									<div className="rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-700">
										Nomor, tahun, dan tanggal penetapan harus konsisten.
									</div>
									<div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
										Upload file final dalam format PDF dengan ukuran wajar.
									</div>
								</div>
							</section>

							<section className={SURFACE_CLASS}>
								<p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">
									Ringkasan mode
								</p>
								<h3 className="mt-2 text-xl font-black tracking-tight text-slate-900">
									Dokumen baru akan ditambahkan
								</h3>
								<div className="mt-5 space-y-3">
									<InsightRow
										icon={LuFileText}
										label="Judul"
										value="Produk hukum baru"
										helper="Pastikan judul singkat, formal, dan deskriptif."
									/>
									<InsightRow
										icon={LuScale}
										label="Jenis"
										value="Belum dipilih"
										helper="Jenis dokumen akan menentukan singkatan dan konteks arsipnya."
									/>
									<InsightRow
										icon={LuCalendar}
										label="Arah pengarsipan"
										value="Simpan ke repositori desa"
										helper="Setelah berhasil, dokumen langsung muncul di daftar arsip desa."
									/>
								</div>
							</section>
						</aside>
					</div>
				) : (
					<>
						<section className={SURFACE_CLASS}>
							<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start">
								<div className="space-y-5">
									<div>
										<p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">
											Pencarian arsip
										</p>
										<h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
											Temukan dokumen hukum lebih cepat
										</h2>
										<p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
											Cari berdasarkan judul, lalu sempitkan hasil berdasarkan jenis, status, dan tahun sesuai kebutuhan Anda.
										</p>
									</div>

									<div className="relative">
										<LuSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
										<input
											type="text"
											placeholder="Cari berdasarkan judul produk hukum..."
											value={searchTerm}
											onChange={(event) => setSearchTerm(event.target.value)}
											disabled={isLoading}
											className={`${INPUT_CLASS} pl-11 pr-11`}
										/>
										{searchQuery ? (
											<button
												type="button"
												onClick={() => setSearchTerm("")}
												className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
											>
												<LuX className="h-4 w-4" />
											</button>
										) : null}
									</div>

									{activeChips.length > 0 ? (
										<div className="flex flex-wrap gap-2">
											{activeChips.map((chip) => (
												<FilterChip
													key={chip.key}
													label={chip.label}
													onRemove={() => handleRemoveChip(chip.key)}
												/>
											))}
										</div>
									) : (
										<p className="text-sm text-slate-500">
											Belum ada filter aktif. Anda sedang melihat keseluruhan arsip hukum desa.
										</p>
									)}

									{showFilters ? (
										<div className="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
											<div className="grid gap-3 md:grid-cols-3">
												<select
													value={filterJenis}
													onChange={(event) => setFilterJenis(event.target.value)}
													className={SELECT_CLASS}
												>
													{JENIS_OPTIONS.map((option) => (
														<option key={option.value} value={option.value}>
															{option.label}
														</option>
													))}
												</select>

												<select
													value={filterStatus}
													onChange={(event) => setFilterStatus(event.target.value)}
													className={SELECT_CLASS}
												>
													{STATUS_OPTIONS.map((option) => (
														<option key={option.value} value={option.value}>
															{option.label}
														</option>
													))}
												</select>

												<select
													value={filterTahun}
													onChange={(event) => setFilterTahun(event.target.value)}
													className={SELECT_CLASS}
												>
													{tahunOptions.map((option) => (
														<option key={option.value} value={option.value}>
															{option.label}
														</option>
													))}
												</select>

											</div>

											{activeFilterCount > 0 ? (
												<div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
													<p className="text-xs text-slate-500">
														Filter jenis, status, dan tahun sedang membatasi hasil tampilan.
													</p>
													<button
														type="button"
														onClick={clearFilters}
														className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
													>
														<LuX className="h-3.5 w-3.5" />
														Hapus filter dropdown
													</button>
												</div>
											) : null}
										</div>
									) : null}
								</div>

								<div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1 xl:self-start">
									<button
										type="button"
										onClick={() => setShowFilters((current) => !current)}
										className={`flex items-center justify-between rounded-lg border px-4 py-4 text-left transition ${
											showFilters || activeFilterCount > 0
												? "border-sky-200 bg-sky-50 text-sky-700"
												: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
										}`}
									>
										<div>
											<p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">
												Panel filter
											</p>
											<p className="mt-2 text-sm font-semibold">
												{showFilters ? "Sembunyikan filter" : "Atur jenis, status, tahun"}
											</p>
										</div>
										<div className="flex items-center gap-2">
											{activeFilterCount > 0 ? (
												<span className="flex h-6 min-w-6 items-center justify-center rounded-lg bg-sky-600 px-2 text-[11px] font-bold text-white">
													{activeFilterCount}
												</span>
											) : null}
											<LuFilter className="h-4 w-4" />
										</div>
									</button>

									<div className="rounded-lg border border-slate-200 bg-white p-4">
										<p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
											Mode tampilan
										</p>
										<div className="mt-3 inline-flex w-full items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
											<button
												type="button"
												onClick={() => setViewMode("grid")}
												className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
													viewMode === "grid"
														? "bg-white text-slate-900 shadow-sm"
														: "text-slate-500 hover:text-slate-700"
												}`}
											>
												<LuLayoutGrid className="h-4 w-4" />
												Grid
											</button>
											<button
												type="button"
												onClick={() => setViewMode("list")}
												className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
													viewMode === "list"
														? "bg-white text-slate-900 shadow-sm"
														: "text-slate-500 hover:text-slate-700"
												}`}
											>
												<LuList className="h-4 w-4" />
												List
											</button>
										</div>
										<p className="mt-3 text-xs leading-5 text-slate-500">
											Gunakan grid untuk eksplorasi cepat, atau list untuk membaca detail dengan lebih ringkas.
										</p>
									</div>

									
								</div>
							</div>
						</section>

						<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
							<section className={SURFACE_CLASS}>
								<div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
									<div>
										<p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">
											Daftar arsip
										</p>
										<h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
											{isLoading
												? "Memuat arsip produk hukum..."
												: filteredItems.length > 0
													? `${formatCount(filteredItems.length)} arsip siap ditelusuri`
													: "Belum ada arsip yang tampil"}
										</h2>
										<p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
											{hasScopedView
												? "Hasil di bawah ini mengikuti kata kunci pencarian dan filter yang sedang aktif."
												: "Semua dokumen hukum desa ditampilkan di satu tempat agar lebih mudah dicermati dan dikelola."}
										</p>
									</div>

									<div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
										<p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
											Ringkasan tampilan
										</p>
										<p className="mt-2 font-semibold text-slate-800">
											{viewMode === "grid" ? "Kartu grid aktif" : "Daftar ringkas aktif"}
										</p>
										<p className="mt-1 text-xs leading-5 text-slate-500">
											{totalPages > 1
												? `Halaman ${currentPage} dari ${totalPages}`
												: "Seluruh hasil tampil pada satu halaman"}
										</p>
									</div>
								</div>

								<div className="mt-6">
									{isLoading ? (
										<div className="flex min-h-[320px] items-center justify-center rounded-lg border border-slate-100 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)]">
											<div className="flex items-center gap-3 text-slate-500">
												<LuLoader className="h-5 w-5 animate-spin" />
												<span className="text-sm font-medium">Memuat data produk hukum...</span>
											</div>
										</div>
									) : filteredItems.length > 0 ? (
										<ProdukHukumList produkHukums={filteredItems} viewMode={viewMode} />
									) : (
										<EmptyState hasScopedView={hasScopedView} onResetScope={resetScope} onAdd={showAddForm} />
									)}
								</div>

								{!isLoading && totalPages > 1 ? (
									<div className="mt-6 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
										<button
											type="button"
											onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
											disabled={currentPage === 1 || isLoading}
											className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
										>
											Sebelumnya
										</button>

										<p className="text-sm font-medium text-slate-600">
											Halaman {currentPage} dari {totalPages}
										</p>

										<button
											type="button"
											onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
											disabled={currentPage === totalPages || isLoading}
											className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
										>
											Selanjutnya
										</button>
									</div>
								) : null}
							</section>

							<aside className="space-y-6">
								<section className={SURFACE_CLASS}>
									<p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">
										Komposisi arsip
									</p>
									<h3 className="mt-2 text-xl font-black tracking-tight text-slate-900">
										Sebaran jenis produk hukum
									</h3>
									<div className="mt-5 space-y-3">
										{jenisStats.map((item) => {
											const percentage =
												stats.total > 0 ? Math.round((item.value / stats.total) * 100) : 0;

											return (
												<div
													key={item.label}
													className={`rounded-lg border ${item.tone.border} ${item.tone.bg} p-4`}
												>
													<div className="flex items-start justify-between gap-3">
														<div>
															<p className={`text-xs font-semibold uppercase tracking-[0.16em] ${item.tone.text}`}>
																{item.label}
															</p>
															<p className="mt-2 text-sm font-semibold text-slate-800">{item.description}</p>
														</div>
														<p className="text-lg font-black tracking-tight text-slate-900">
															{formatCount(item.value)}
														</p>
													</div>

													<div className="mt-4 h-2 overflow-hidden rounded-lg bg-white/80">
														<div
															className={`h-full rounded-lg bg-gradient-to-r ${item.tone.bar}`}
															style={{ width: `${Math.max(percentage, percentage > 0 ? 8 : 0)}%` }}
														/>
													</div>

													<p className="mt-3 text-xs text-slate-500">
														{stats.total > 0 ? `${percentage}% dari keseluruhan arsip` : "Belum ada arsip pada kategori ini"}
													</p>
												</div>
											);
										})}
									</div>
								</section>

								<section className={SURFACE_CLASS}>
									<p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">
										Sorotan arsip
									</p>
									<h3 className="mt-2 text-xl font-black tracking-tight text-slate-900">
										Status pengelolaan dokumen
									</h3>
									<div className="mt-5 space-y-3">
										<InsightRow
											icon={LuCalendar}
											label="Tahun terbaru"
											value={latestYear || "Belum ada arsip"}
											helper="Dokumen terbaru membantu melihat ritme pembaruan regulasi desa."
										/>
										<InsightRow
											icon={LuScale}
											label="Dokumen berlaku"
											value={`${formatCount(stats.berlaku)} arsip`}
											helper="Status ini menunjukkan dokumen yang masih aktif digunakan."
										/>
										<InsightRow
											icon={LuFilter}
											label="Pencarian & filter"
											value={activeScopeCount > 0 ? `${activeScopeCount} parameter aktif` : "Tampilan global"}
											helper={
												hasScopedView
													? "Gunakan reset jika ingin kembali melihat keseluruhan arsip desa."
													: "Belum ada penyaring aktif, sehingga seluruh data sedang ditampilkan."
											}
										/>
										<InsightRow
											icon={LuBookOpen}
											label="Jenis dominan"
											value={dominantJenis}
											helper="Jenis yang paling banyak bisa menjadi acuan pola regulasi desa yang sedang terbentuk."
										/>
									</div>
								</section>
							</aside>
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default ProdukHukum;