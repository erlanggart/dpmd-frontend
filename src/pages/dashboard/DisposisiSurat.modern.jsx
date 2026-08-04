// Disposisi Surat — tampilan tunggal untuk seluruh role internal DPMD.
// Desain netral (tanpa tema warna per role) supaya konsisten dengan sidebar.

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
	Mail,
	Send,
	Clock,
	Eye,
	Search,
	ChevronRight,
	ChevronLeft,
	CheckCircle2,
	Inbox,
	ArrowRight,
	RotateCcw,
	Trash2,
	Pencil,
	History,
	FileText,
	X,
} from "lucide-react";
import api from "../../api";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import { INSTRUKSI_OPTIONS } from "../../constants/disposisiInstruksi";
import useDisposisiAutoReload from "../../hooks/useDisposisiAutoReload";
import SuratMasuk from "../bidang/sekretariat/disposisi/SuratMasuk";

const EXECUTIVE_ROLES = ["kepala_dinas", "sekretaris_dinas"];
const ITEMS_PER_PAGE = 10;

// Satu-satunya warna di halaman ini: titik status. Sisanya netral.
const STATUS_CONFIG = {
	pending: { label: "Belum dibaca", dot: "bg-amber-500", icon: Clock },
	dibaca: { label: "Sudah dibaca", dot: "bg-sky-500", icon: Eye },
	proses: { label: "Diproses", dot: "bg-slate-500", icon: Send },
	selesai: { label: "Selesai", dot: "bg-emerald-500", icon: CheckCircle2 },
	teruskan: { label: "Diteruskan", dot: "bg-slate-400", icon: ArrowRight },
	ditarik: { label: "Ditarik", dot: "bg-rose-500", icon: RotateCcw },
};

const getStatusConfig = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.pending;

const StatusBadge = ({ status }) => {
	const config = getStatusConfig(status);
	return (
		<span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
			<span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
			{config.label}
		</span>
	);
};

const EmptyState = ({ icon: Icon, title, description }) => (
	<div className="flex min-h-[20rem] flex-col items-center justify-center px-6 text-center">
		<div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
			<Icon className="h-6 w-6" />
		</div>
		<p className="font-medium text-slate-800">{title}</p>
		<p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
	</div>
);

const formatTanggal = (tanggal) => {
	if (!tanggal) return "-";
	return new Date(tanggal).toLocaleDateString("id-ID", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

const DisposisiRow = ({ disposisi, mode, onOpen, onBaca }) => {
	const isMasuk = mode === "masuk";
	const person = isMasuk
		? disposisi.dari_user?.name || disposisi.dari_user?.nama_lengkap
		: disposisi.ke_user?.name ||
			disposisi.ke_user?.nama_lengkap ||
			disposisi.kepada_user?.name;

	return (
		<article
			onClick={() => onOpen(disposisi.id)}
			className="group cursor-pointer px-4 py-3.5 transition hover:bg-slate-50 sm:px-5"
		>
			<div className="flex items-start gap-3">
				<div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
					<FileText className="h-4 w-4" />
				</div>

				<div className="min-w-0 flex-1">
					<div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
						<div className="min-w-0">
							<h3 className="line-clamp-2 text-sm font-semibold leading-5 text-slate-900">
								{disposisi.surat?.perihal || "Tanpa perihal"}
							</h3>
							<p className="mt-0.5 truncate text-xs text-slate-400">
								{disposisi.surat?.nomor_surat || "Nomor surat tidak tersedia"}
							</p>
						</div>
						<StatusBadge status={disposisi.status} />
					</div>

					<div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
						<span className="text-slate-400">{isMasuk ? "Dari" : "Kepada"}</span>
						<span className="font-medium text-slate-700">{person || "-"}</span>
						<span className="text-slate-300">·</span>
						<span>{formatTanggal(disposisi.tanggal_disposisi)}</span>
					</div>

					{disposisi.catatan && (
						<p className="mt-2 line-clamp-2 border-l-2 border-slate-200 pl-3 text-xs leading-5 text-slate-500">
							{disposisi.catatan}
						</p>
					)}

					<div className="mt-2.5 flex items-center justify-end gap-3">
						{isMasuk && disposisi.status === "pending" && (
							<button
								type="button"
								onClick={(event) => {
									event.stopPropagation();
									onBaca(disposisi.id);
								}}
								className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700"
							>
								Tandai dibaca
							</button>
						)}
						<span className="inline-flex items-center gap-0.5 text-xs font-medium text-slate-500 transition group-hover:text-slate-900">
							Detail
							<ChevronRight className="h-3.5 w-3.5" />
						</span>
					</div>
				</div>
			</div>
		</article>
	);
};

export default function DisposisiSuratModern() {
	const navigate = useNavigate();
	const location = useLocation();

	const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
	const isExecutive = EXECUTIVE_ROLES.includes(user.role);
	const isSecretariat =
		!isExecutive &&
		(user.role === "sekretariat" ||
			user.role === "superadmin" ||
			Number(user.bidang_id) === 2);
	const showRiwayat =
		!isExecutive && (Number(user.bidang_id) === 2 || user.role === "superadmin");

	const [activeTab, setActiveTab] = useState(isSecretariat ? "surat-masuk" : "masuk");
	const [suratMasuk, setSuratMasuk] = useState([]);
	const [disposisiMasuk, setDisposisiMasuk] = useState([]);
	const [disposisiKeluar, setDisposisiKeluar] = useState([]);
	const [riwayatData, setRiwayatData] = useState([]);
	const [statistik, setStatistik] = useState(null);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
	const [filterStatus, setFilterStatus] = useState("all");
	const [currentPage, setCurrentPage] = useState(1);
	const [serverPagination, setServerPagination] = useState({
		total: 0,
		page: 1,
		limit: ITEMS_PER_PAGE,
		totalPages: 0,
	});

	useEffect(() => {
		const timeoutId = setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), 300);
		return () => clearTimeout(timeoutId);
	}, [searchQuery]);

	const fetchData = useCallback(async () => {
		setLoading(true);
		try {
			if (activeTab === "surat-masuk") {
				const suratRes = await api.get("/surat-masuk?status=draft");
				setSuratMasuk(suratRes.data.data || []);
			} else if (activeTab === "riwayat") {
				const riwayatRes = await api.get("/disposisi/riwayat-sekretariat");
				setRiwayatData(riwayatRes.data.data || []);
			} else {
				const params = isExecutive
					? {
							page: currentPage,
							limit: ITEMS_PER_PAGE,
							...(filterStatus !== "all" && { status: filterStatus }),
							...(debouncedSearchQuery && { search: debouncedSearchQuery }),
						}
					: { page: 1, limit: 100 };

				const [statsRes, disposisiRes] = await Promise.all([
					api.get("/disposisi/statistik"),
					api.get(`/disposisi/${activeTab}`, { params }),
				]);

				setStatistik(statsRes.data.data);
				setServerPagination(
					disposisiRes.data.pagination || {
						total: disposisiRes.data.data?.length || 0,
						page: 1,
						limit: ITEMS_PER_PAGE,
						totalPages: 1,
					},
				);

				if (activeTab === "masuk") {
					setDisposisiMasuk(disposisiRes.data.data || []);
				} else {
					setDisposisiKeluar(disposisiRes.data.data || []);
				}
			}
		} catch (error) {
			console.error("Error fetching data:", error);
			toast.error("Gagal memuat data");
		} finally {
			setLoading(false);
		}
	}, [activeTab, currentPage, debouncedSearchQuery, filterStatus, isExecutive]);

	useDisposisiAutoReload(fetchData, {
		enabled: true,
		debounceMs: 2000,
		notificationTypes: ["new_disposisi", "disposisi_update"],
	});

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	useEffect(() => {
		setCurrentPage(1);
	}, [activeTab]);

	// Detail disposisi: pertahankan resolusi base path agar tetap benar
	// saat halaman ini di-mount dari prefix route lain.
	const goToDetail = (id) => {
		const { pathname } = location;
		const prefixes = [
			"/dpmd",
			"/kepala-dinas",
			"/kepala-bidang",
			"/sekretaris-dinas",
			"/ketua-tim",
			"/pegawai",
			"/bidang",
			"/sekretariat",
		];
		const basePath = prefixes.find((prefix) => pathname.includes(prefix)) || "/dashboard";
		navigate(`${basePath}/disposisi/${id}`);
	};

	const handleBacaDisposisi = async (id) => {
		try {
			await api.put(`/disposisi/${id}/baca`);
			fetchData();
			toast.success("Disposisi ditandai sudah dibaca");
		} catch (error) {
			console.error("Error:", error);
			toast.error("Gagal menandai sebagai dibaca");
		}
	};

	// ─── Riwayat: Tarik Kembali ─────────────────────────────────────
	const handleTarikDisposisi = async (disposisi) => {
		const result = await Swal.fire({
			title: "Tarik Kembali Disposisi?",
			html: `<p class="text-sm text-slate-600">Surat: <strong>${disposisi.surat?.perihal || "-"}</strong></p>
			       <p class="text-sm text-slate-600 mt-1">Kepada: <strong>${disposisi.ke_user?.nama_lengkap || "-"}</strong></p>
			       <p class="text-xs text-slate-500 mt-3">Disposisi hanya bisa ditarik jika belum dibaca penerima.</p>`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#0f172a",
			cancelButtonColor: "#94a3b8",
			confirmButtonText: "Ya, Tarik Kembali",
			cancelButtonText: "Batal",
		});

		if (result.isConfirmed) {
			try {
				await api.put(`/disposisi/${disposisi.id}/tarik`);
				toast.success("Disposisi berhasil ditarik kembali");
				fetchData();
			} catch (error) {
				toast.error(error.response?.data?.message || "Gagal menarik disposisi");
			}
		}
	};

	// ─── Riwayat: Hapus Disposisi ───────────────────────────────────
	const handleHapusDisposisi = async (disposisi) => {
		const result = await Swal.fire({
			title: "Hapus Disposisi?",
			html: `<p class="text-sm text-slate-600">Surat: <strong>${disposisi.surat?.perihal || "-"}</strong></p>
			       <p class="text-xs text-rose-500 mt-2">Tindakan ini tidak dapat dibatalkan.</p>`,
			icon: "error",
			showCancelButton: true,
			confirmButtonColor: "#e11d48",
			cancelButtonColor: "#94a3b8",
			confirmButtonText: "Ya, Hapus",
			cancelButtonText: "Batal",
		});

		if (result.isConfirmed) {
			try {
				await api.delete(`/disposisi/${disposisi.id}`);
				toast.success("Disposisi berhasil dihapus");
				fetchData();
			} catch (error) {
				toast.error(error.response?.data?.message || "Gagal menghapus disposisi");
			}
		}
	};

	// ─── Riwayat: Edit & Kirim Ulang ────────────────────────────────
	const handleEditDisposisi = async (disposisi) => {
		let existingInstruksi = [];
		try {
			existingInstruksi = JSON.parse(disposisi.instruksi);
			if (!Array.isArray(existingInstruksi)) existingInstruksi = [disposisi.instruksi];
		} catch {
			existingInstruksi = [disposisi.instruksi];
		}

		const { value: formValues } = await Swal.fire({
			title: "Edit & Kirim Ulang",
			width: "460px",
			html: `
				<div class="text-left space-y-4">
					<div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
						<label class="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Surat</label>
						<p class="text-sm font-semibold text-slate-800 line-clamp-2">${disposisi.surat?.perihal || "-"}</p>
					</div>

					<div>
						<label class="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Instruksi Disposisi</label>
						<div class="grid grid-cols-2 gap-1 p-2 bg-slate-50 rounded-xl border border-slate-200">
							${INSTRUKSI_OPTIONS.map((i) => `
								<label class="flex items-center gap-2 p-2 hover:bg-white rounded-lg cursor-pointer transition-all">
									<input type="checkbox" name="swal-instruksi" value="${i.value}"
										${existingInstruksi.includes(i.value) ? "checked" : ""}
										class="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400">
									<span class="text-xs font-medium text-slate-700">${i.label}</span>
								</label>
							`).join("")}
						</div>
					</div>

					<div>
						<label class="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Catatan Tambahan</label>
						<textarea id="swal-catatan" class="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all" rows="3" placeholder="Masukkan catatan disposisi...">${disposisi.catatan || ""}</textarea>
					</div>
				</div>
			`,
			showCancelButton: true,
			confirmButtonColor: "#0f172a",
			cancelButtonColor: "#94a3b8",
			confirmButtonText: "Kirim Ulang",
			cancelButtonText: "Batal",
			focusConfirm: false,
			preConfirm: () => {
				const checkedInstruksi = Array.from(
					document.querySelectorAll('input[name="swal-instruksi"]:checked'),
				).map((input) => input.value);

				if (checkedInstruksi.length === 0) {
					Swal.showValidationMessage("Pilih setidaknya satu instruksi");
					return false;
				}

				return {
					catatan: document.getElementById("swal-catatan").value,
					instruksi: checkedInstruksi,
				};
			},
		});

		if (formValues) {
			try {
				await api.put(`/disposisi/${disposisi.id}/edit`, formValues);
				toast.success("Disposisi berhasil diedit dan dikirim ulang");
				fetchData();
			} catch (error) {
				toast.error(error.response?.data?.message || "Gagal mengedit disposisi");
			}
		}
	};

	// ─── Data turunan ───────────────────────────────────────────────
	const filterClientSide = (data) =>
		data.filter((item) => {
			const query = searchQuery.toLowerCase();
			const matchSearch =
				searchQuery === "" ||
				item.perihal?.toLowerCase().includes(query) ||
				item.surat?.perihal?.toLowerCase().includes(query) ||
				item.nomor_surat?.toLowerCase().includes(query) ||
				item.surat?.nomor_surat?.toLowerCase().includes(query);

			const matchStatus = filterStatus === "all" || item.status === filterStatus;
			return matchSearch && matchStatus;
		});

	const rawItems = activeTab === "keluar" ? disposisiKeluar : disposisiMasuk;
	const filteredItems = isExecutive ? rawItems : filterClientSide(rawItems);
	const visibleItems = isExecutive
		? filteredItems
		: filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
	const totalItems = isExecutive ? serverPagination.total : filteredItems.length;
	const totalPages = isExecutive
		? serverPagination.totalPages || 1
		: Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));

	const currentStats =
		(activeTab === "keluar" ? statistik?.keluar : statistik?.masuk) || {};

	const summaryTiles = [
		{ label: "Belum dibaca", value: currentStats.pending || 0 },
		{ label: "Dibaca", value: currentStats.dibaca || 0 },
		{ label: "Diproses", value: currentStats.proses || 0 },
		{ label: "Diteruskan", value: currentStats.teruskan || 0 },
		{ label: "Selesai", value: currentStats.selesai || 0 },
	];

	const tabs = [
		...(isSecretariat
			? [{ id: "surat-masuk", label: "Surat", icon: Inbox, count: suratMasuk.length }]
			: []),
		{ id: "masuk", label: "Masuk", icon: Mail, count: statistik?.masuk?.total },
		{ id: "keluar", label: "Keluar", icon: Send, count: statistik?.keluar?.total },
		...(showRiwayat
			? [{ id: "riwayat", label: "Riwayat", icon: History, count: riwayatData.length }]
			: []),
	];

	const isListTab = activeTab === "masuk" || activeTab === "keluar";
	const hasActiveFilter = searchQuery !== "" || filterStatus !== "all";

	return (
		<div className="min-h-screen bg-slate-50 pb-24 lg:pb-10">
			{/* Header */}
			<header className="border-b border-slate-200 bg-white">
				<div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
					<div className="flex items-start justify-between gap-4">
						<div className="flex min-w-0 items-center gap-3">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
								<Mail className="h-5 w-5" />
							</div>
							<div className="min-w-0">
								<h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
									Disposisi Surat
								</h1>
								<p className="mt-0.5 truncate text-sm text-slate-500">
									Kelola surat masuk dan tindak lanjut disposisi
								</p>
							</div>
						</div>

						{statistik && (
							<div className="hidden shrink-0 rounded-xl border border-slate-200 px-4 py-2 text-right sm:block">
								<p className="text-xs text-slate-500">Total disposisi masuk</p>
								<p className="text-lg font-semibold tabular-nums text-slate-900">
									{statistik.masuk?.total || 0}
								</p>
							</div>
						)}
					</div>

					{/* Tab */}
					<nav className="mt-5 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
						{tabs.map(({ id, label, icon: Icon, count }) => {
							const isActive = activeTab === id;
							return (
								<button
									key={id}
									type="button"
									onClick={() => {
										setActiveTab(id);
										setCurrentPage(1);
									}}
									className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
										isActive
											? "bg-white text-slate-900 shadow-sm"
											: "text-slate-500 hover:text-slate-800"
									}`}
								>
									<Icon className="h-4 w-4" />
									{label}
									{count > 0 && (
										<span
											className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
												isActive ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-600"
											}`}
										>
											{count}
										</span>
									)}
								</button>
							);
						})}
					</nav>
				</div>
			</header>

			<main className="mx-auto max-w-6xl space-y-4 px-4 py-5 sm:px-6 lg:px-8">
				{/* Ringkasan status */}
				{isListTab && statistik && (
					<section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-5">
						{summaryTiles.map((tile) => (
							<div key={tile.label} className="bg-white px-4 py-3">
								<p className="truncate text-xs text-slate-400">{tile.label}</p>
								<p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-slate-900">
									{tile.value}
								</p>
							</div>
						))}
					</section>
				)}

				{/* Pencarian & filter */}
				{isListTab && (
					<section className="rounded-xl border border-slate-200 bg-white p-3">
						<div className="flex flex-col gap-2 sm:flex-row">
							<div className="relative flex-1">
								<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
								<input
									type="search"
									value={searchQuery}
									onChange={(event) => {
										setSearchQuery(event.target.value);
										setCurrentPage(1);
									}}
									placeholder="Cari nomor atau perihal surat"
									className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10"
								/>
							</div>
							<select
								value={filterStatus}
								onChange={(event) => {
									setFilterStatus(event.target.value);
									setCurrentPage(1);
								}}
								className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 sm:w-52"
							>
								<option value="all">Semua status</option>
								<option value="pending">Belum dibaca</option>
								<option value="dibaca">Sudah dibaca</option>
								<option value="proses">Diproses</option>
								<option value="selesai">Selesai</option>
								<option value="teruskan">Diteruskan</option>
							</select>
						</div>

						{hasActiveFilter && (
							<div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5">
								{searchQuery && (
									<span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-2.5 pr-1.5 text-xs font-medium text-slate-700">
										"{searchQuery}"
										<button
											onClick={() => setSearchQuery("")}
											className="rounded-full p-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
											aria-label="Hapus pencarian"
										>
											<X className="h-3 w-3" />
										</button>
									</span>
								)}
								{filterStatus !== "all" && (
									<span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-2.5 pr-1.5 text-xs font-medium text-slate-700">
										{getStatusConfig(filterStatus).label}
										<button
											onClick={() => setFilterStatus("all")}
											className="rounded-full p-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
											aria-label="Hapus filter status"
										>
											<X className="h-3 w-3" />
										</button>
									</span>
								)}
							</div>
						)}
					</section>
				)}

				{/* Konten */}
				{activeTab === "surat-masuk" && isSecretariat ? (
					<SuratMasuk />
				) : loading ? (
					<div className="flex min-h-[20rem] flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white">
						<div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
						<p className="text-sm text-slate-500">Memuat disposisi...</p>
					</div>
				) : activeTab === "riwayat" ? (
					<div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
						{riwayatData.length === 0 ? (
							<EmptyState
								icon={History}
								title="Belum ada riwayat"
								description="Belum ada disposisi yang pernah dikirim dari bidang ini."
							/>
						) : (
							<div className="divide-y divide-slate-100">
								{riwayatData.map((disposisi) => (
									<div key={disposisi.id} className="px-4 py-3.5 sm:px-5">
										<div className="flex items-start gap-3">
											<div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
												<FileText className="h-4 w-4" />
											</div>
											<div className="min-w-0 flex-1">
												<div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
													<div className="min-w-0">
														<h3 className="line-clamp-2 text-sm font-semibold leading-5 text-slate-900">
															{disposisi.surat?.perihal || "Tanpa perihal"}
														</h3>
														<p className="mt-0.5 truncate text-xs text-slate-400">
															{disposisi.surat?.nomor_surat || "-"}
														</p>
													</div>
													<StatusBadge status={disposisi.status} />
												</div>

												<div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
													<span className="text-slate-400">Kepada</span>
													<span className="font-medium text-slate-700">
														{disposisi.ke_user?.nama_lengkap || "-"}
													</span>
													<span className="text-slate-300">·</span>
													<span>{formatTanggal(disposisi.tanggal_disposisi)}</span>
												</div>

												{disposisi.catatan && (
													<p className="mt-2 line-clamp-2 border-l-2 border-slate-200 pl-3 text-xs leading-5 text-slate-500">
														{disposisi.catatan}
													</p>
												)}

												<div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
													<div className="flex items-center gap-1.5">
														{disposisi.can_recall && (
															<button
																onClick={() => handleTarikDisposisi(disposisi)}
																className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
															>
																<RotateCcw className="h-3.5 w-3.5" />
																Tarik
															</button>
														)}
														{disposisi.status === "ditarik" && (
															<>
																<button
																	onClick={() => handleEditDisposisi(disposisi)}
																	className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
																>
																	<Pencil className="h-3.5 w-3.5" />
																	Edit & Kirim
																</button>
																<button
																	onClick={() => handleHapusDisposisi(disposisi)}
																	className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-rose-600 transition hover:border-rose-200 hover:bg-rose-50"
																>
																	<Trash2 className="h-3.5 w-3.5" />
																	Hapus
																</button>
															</>
														)}
													</div>
													<button
														onClick={() => goToDetail(disposisi.id)}
														className="inline-flex items-center gap-0.5 text-xs font-medium text-slate-500 transition hover:text-slate-900"
													>
														Detail
														<ChevronRight className="h-3.5 w-3.5" />
													</button>
												</div>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				) : (
					<>
						<div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
							{visibleItems.length === 0 ? (
								<EmptyState
									icon={activeTab === "keluar" ? Send : Inbox}
									title={`Belum ada disposisi ${activeTab}`}
									description={
										hasActiveFilter
											? "Tidak ada data yang cocok dengan pencarian atau filter."
											: `Belum ada disposisi ${activeTab} saat ini.`
									}
								/>
							) : (
								<div className="divide-y divide-slate-100">
									{visibleItems.map((disposisi) => (
										<DisposisiRow
											key={disposisi.id}
											disposisi={disposisi}
											mode={activeTab}
											onOpen={goToDetail}
											onBaca={handleBacaDisposisi}
										/>
									))}
								</div>
							)}
						</div>

						{totalItems > ITEMS_PER_PAGE && (
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<p className="text-xs text-slate-500">
									Halaman <strong className="font-semibold text-slate-800">{currentPage}</strong> dari{" "}
									{totalPages} · {totalItems} disposisi
								</p>
								<div className="flex items-center gap-1">
									<button
										type="button"
										onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
										disabled={currentPage === 1}
										className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
										aria-label="Halaman sebelumnya"
									>
										<ChevronLeft className="h-4 w-4" />
									</button>
									<button
										type="button"
										onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
										disabled={currentPage >= totalPages}
										className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
										aria-label="Halaman berikutnya"
									>
										<ChevronRight className="h-4 w-4" />
									</button>
								</div>
							</div>
						)}
					</>
				)}
			</main>
		</div>
	);
}
