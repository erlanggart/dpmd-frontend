import React, { useState, useEffect, useMemo } from "react";
import Swal from "sweetalert2";
import { useLocation, useNavigate } from "react-router-dom";
import {
	getProdukHukums,
	createProdukHukum,
	updateProdukHukum,
} from "../../../api";
import ProdukHukumList from "../../../components/produk-hukum/ProdukHukumList";
import ProdukHukumForm from "../../../components/produk-hukum/ProdukHukumForm";
import {
	LuSearch,
	LuPlus,
	LuLayoutGrid,
	LuList,
	LuFileText,
	LuFilter,
	LuX,
	LuCalendar,
	LuScale,
	LuLoader,
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

const ProdukHukum = () => {
	const [produkHukums, setProdukHukums] = useState([]);
	const [editingProduk, setEditingProduk] = useState(null);
	const [isFormVisible, setIsFormVisible] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [searchTerm, setSearchTerm] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [viewMode, setViewMode] = useState("list"); // grid | list
	const [filterJenis, setFilterJenis] = useState("");
	const [filterStatus, setFilterStatus] = useState("");
	const [filterTahun, setFilterTahun] = useState("");
	const [showFilters, setShowFilters] = useState(false);

	const location = useLocation();
	const navigate = useNavigate();

	const fetchProdukHukums = async (page, search = "") => {
		try {
			setIsLoading(true);
			const response = await getProdukHukums(page, search);
			
			// Handle different response structures
			if (response?.data?.data?.data) {
				// Paginated response
				setProdukHukums(response.data.data.data);
				setCurrentPage(response.data.data.current_page);
				setTotalPages(response.data.data.last_page);
			} else if (response?.data?.data) {
				// Direct data response
				const data = Array.isArray(response.data.data) ? response.data.data : [];
				setProdukHukums(data);
				setCurrentPage(1);
				setTotalPages(1);
			} else if (response?.data) {
				// Fallback: data in root
				const data = Array.isArray(response.data) ? response.data : [];
				setProdukHukums(data);
				setCurrentPage(1);
				setTotalPages(1);
			} else {
				// No data found
				setProdukHukums([]);
				setCurrentPage(1);
				setTotalPages(1);
			}
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
	};

	useEffect(() => {
		const delayDebounceFn = setTimeout(() => {
			// Selalu reset ke halaman 1 saat melakukan pencarian baru
			if (currentPage !== 1) {
				setCurrentPage(1);
			}
			fetchProdukHukums(1, searchTerm);
		}, 500); // 500ms delay

		return () => clearTimeout(delayDebounceFn);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchTerm]);

	useEffect(() => {
		// Hanya fetch jika tidak ada pencarian, karena pencarian ditangani oleh effect di atas
		if (!searchTerm) {
			fetchProdukHukums(currentPage);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentPage]);

	useEffect(() => {
		if (location.state?.editingProduk) {
			setEditingProduk(location.state.editingProduk);
			setIsFormVisible(true);
			// Membersihkan state dari location agar tidak memicu lagi
			navigate(location.pathname, { replace: true });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [location.state]);

	const handleFormSubmit = async (formData) => {
		try {
			const action = editingProduk ? "diperbarui" : "ditambahkan";

			// Show loading toast
			const loadingToast = Swal.fire({
				title: `${editingProduk ? "Memperbarui" : "Menyimpan"} produk hukum...`,
				text: "Mohon tunggu, sedang memproses data.",
				allowOutsideClick: false,
				didOpen: () => {
					Swal.showLoading();
				},
			});

			if (editingProduk) {
				await updateProdukHukum(editingProduk.id, formData);
			} else {
				await createProdukHukum(formData);
			}

			// Close loading toast
			loadingToast.close();

			setSearchTerm(""); // Reset pencarian setelah submit
			await fetchProdukHukums(1); // Kembali ke halaman 1
			setIsFormVisible(false);
			setEditingProduk(null);

			Swal.fire({
				icon: "success",
				title: "Berhasil!",
				text: `Produk hukum berhasil ${action}.`,
				timer: 2000,
				showConfirmButton: false,
			});
		} catch (error) {
			console.error("Error submitting form:", error.response?.data);
			Swal.fire({
				icon: "error",
				title: "Gagal!",
				text:
					"Terjadi kesalahan saat menyimpan data. " +
					(error.response?.data?.message || "Silakan coba lagi."),
			});
			// Re-throw error so form component can handle it
			throw error;
		}
	};

	const showAddForm = () => {
		setEditingProduk(null);
		setIsFormVisible(true);
	};

	const handleCancelForm = () => {
		setIsFormVisible(false);
		setEditingProduk(null);
	};

	// Extract unique years from data for filter
	const tahunOptions = useMemo(() => {
		const years = [...new Set(produkHukums.map((p) => p.tahun))].sort((a, b) => b - a);
		return [{ value: "", label: "Semua Tahun" }, ...years.map((y) => ({ value: String(y), label: String(y) }))];
	}, [produkHukums]);

	// Client-side filtering (jenis, status, tahun)
	const filteredItems = useMemo(() => {
		return produkHukums.filter((item) => {
			if (filterJenis && item.jenis !== filterJenis) return false;
			if (filterStatus && item.status_peraturan !== filterStatus) return false;
			if (filterTahun && String(item.tahun) !== filterTahun) return false;
			return true;
		});
	}, [produkHukums, filterJenis, filterStatus, filterTahun]);

	const hasActiveFilters = filterJenis || filterStatus || filterTahun;

	const clearFilters = () => {
		setFilterJenis("");
		setFilterStatus("");
		setFilterTahun("");
	};

	// Stats
	const stats = useMemo(() => {
		const berlaku = produkHukums.filter((p) => p.status_peraturan === "berlaku").length;
		const dicabut = produkHukums.filter((p) => p.status_peraturan === "dicabut").length;
		return { total: produkHukums.length, berlaku, dicabut };
	}, [produkHukums]);

	return (
		<div className="space-y-5">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-xl font-semibold text-slate-800">Produk Hukum Desa</h1>
					<p className="mt-0.5 text-sm text-slate-500">
						Kelola dokumen peraturan dan keputusan desa
					</p>
				</div>
				{!isFormVisible && (
					<button
						onClick={showAddForm}
						className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
					>
						<LuPlus className="w-4 h-4" />
						Tambah
					</button>
				)}
			</div>

			{isFormVisible ? (
				<div className="rounded-xl border border-slate-200 bg-white p-6">
					<div className="mb-5 flex items-center justify-between">
						<h2 className="text-lg font-semibold text-slate-800">
							{editingProduk ? "Edit" : "Tambah"} Produk Hukum
						</h2>
						<button
							onClick={handleCancelForm}
							className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-100"
						>
							<LuX className="w-3.5 h-3.5" />
							Batal
						</button>
					</div>
					<ProdukHukumForm
						onSubmit={handleFormSubmit}
						initialData={editingProduk}
					/>
				</div>
			) : (
				<>
					{/* Stats Cards */}
					<div className="grid grid-cols-3 gap-3">
						<div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
							<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
								<LuFileText className="w-4 h-4 text-blue-600" />
							</div>
							<div>
								<p className="text-xs text-slate-500">Total</p>
								<p className="text-lg font-semibold text-slate-800">{stats.total}</p>
							</div>
						</div>
						<div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
							<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
								<LuScale className="w-4 h-4 text-emerald-600" />
							</div>
							<div>
								<p className="text-xs text-slate-500">Berlaku</p>
								<p className="text-lg font-semibold text-emerald-700">{stats.berlaku}</p>
							</div>
						</div>
						<div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
							<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
								<LuX className="w-4 h-4 text-red-500" />
							</div>
							<div>
								<p className="text-xs text-slate-500">Dicabut</p>
								<p className="text-lg font-semibold text-red-600">{stats.dicabut}</p>
							</div>
						</div>
					</div>

					{/* Toolbar: Search + Filters + View Toggle */}
					<div className="space-y-3">
						<div className="flex items-center gap-2">
							{/* Search */}
							<div className="relative flex-1">
								<LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
								<input
									type="text"
									placeholder="Cari berdasarkan judul..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									disabled={isLoading}
									className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
								/>
							</div>

							{/* Filter Toggle */}
							<button
								onClick={() => setShowFilters(!showFilters)}
								className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
									showFilters || hasActiveFilters
										? "border-blue-200 bg-blue-50 text-blue-700"
										: "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
								}`}
							>
								<LuFilter className="w-4 h-4" />
								Filter
								{hasActiveFilters && (
									<span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
										{[filterJenis, filterStatus, filterTahun].filter(Boolean).length}
									</span>
								)}
							</button>

							{/* View Toggle */}
							<div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
								<button
									onClick={() => setViewMode("grid")}
									className={`rounded-md p-2 transition ${
										viewMode === "grid"
											? "bg-slate-100 text-slate-800"
											: "text-slate-400 hover:text-slate-600"
									}`}
									title="Grid view"
								>
									<LuLayoutGrid className="w-4 h-4" />
								</button>
								<button
									onClick={() => setViewMode("list")}
									className={`rounded-md p-2 transition ${
										viewMode === "list"
											? "bg-slate-100 text-slate-800"
											: "text-slate-400 hover:text-slate-600"
									}`}
									title="List view"
								>
									<LuList className="w-4 h-4" />
								</button>
							</div>
						</div>

						{/* Filter Row */}
						{showFilters && (
							<div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
								<select
									value={filterJenis}
									onChange={(e) => setFilterJenis(e.target.value)}
									className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-300"
								>
									{JENIS_OPTIONS.map((opt) => (
										<option key={opt.value} value={opt.value}>{opt.label}</option>
									))}
								</select>
								<select
									value={filterStatus}
									onChange={(e) => setFilterStatus(e.target.value)}
									className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-300"
								>
									{STATUS_OPTIONS.map((opt) => (
										<option key={opt.value} value={opt.value}>{opt.label}</option>
									))}
								</select>
								<select
									value={filterTahun}
									onChange={(e) => setFilterTahun(e.target.value)}
									className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-300"
								>
									{tahunOptions.map((opt) => (
										<option key={opt.value} value={opt.value}>{opt.label}</option>
									))}
								</select>
								{hasActiveFilters && (
									<button
										onClick={clearFilters}
										className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
									>
										<LuX className="w-3.5 h-3.5" />
										Hapus filter
									</button>
								)}
							</div>
						)}
					</div>

					{/* Content */}
					{isLoading ? (
						<div className="flex items-center justify-center py-16">
							<div className="flex items-center gap-3 text-slate-500">
								<LuLoader className="w-5 h-5 animate-spin" />
								<span className="text-sm">Memuat data...</span>
							</div>
						</div>
					) : filteredItems.length > 0 ? (
						<ProdukHukumList produkHukums={filteredItems} viewMode={viewMode} />
					) : (
						<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-16">
							<LuFileText className="w-10 h-10 text-slate-300 mb-3" />
							<p className="text-sm font-medium text-slate-500">
								{hasActiveFilters
									? "Tidak ada produk hukum yang cocok dengan filter"
									: "Belum ada produk hukum"}
							</p>
							{hasActiveFilters && (
								<button
									onClick={clearFilters}
									className="mt-2 text-xs font-medium text-blue-600 hover:underline"
								>
									Hapus semua filter
								</button>
							)}
						</div>
					)}

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
							<button
								onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
								disabled={currentPage === 1 || isLoading}
								className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
							>
								Sebelumnya
							</button>
							<span className="text-sm text-slate-500">
								Halaman {currentPage} dari {totalPages}
							</span>
							<button
								onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
								disabled={currentPage === totalPages || isLoading}
								className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
							>
								Selanjutnya
							</button>
						</div>
					)}
				</>
			)}
		</div>
	);
};

export default ProdukHukum;
