// Modern Mobile-First Design for Disposisi Surat
// This is a preview of the new design - will replace DisposisiSurat.jsx

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
	Mail,
	Send,
	Clock,
	Check,
	Eye,
	Plus,
	Upload,
	X,
	FileText,
	Calendar,
	Search,
	Filter,
	ChevronRight,
	Download,
	AlertCircle,
	CheckCircle2,
	XCircle,
	Inbox,
	ArrowRight,
	User,
	Building2,
} from "lucide-react";
import api from "../../api";
import { toast } from "react-hot-toast";
import useDisposisiAutoReload from "../../hooks/useDisposisiAutoReload";

export default function DisposisiSuratModern() {
	const navigate = useNavigate();
	const location = useLocation();

	// Get user first before using in state
	const user = JSON.parse(localStorage.getItem("user") || "{}");
	const isSecretariat =
		user.role === "sekretariat" || user.role === "superadmin";

	// Get theme color based on user role
	const getThemeColors = () => {
		const themes = {
			sekretariat: {
				gradient: "from-purple-600 via-purple-500 to-indigo-600",
				primary: "purple",
				textLight: "text-purple-100",
			},
			superadmin: {
				gradient: "from-purple-600 via-purple-500 to-indigo-600",
				primary: "purple",
				textLight: "text-purple-100",
			},
			kepala_dinas: {
				gradient: "from-blue-600 via-blue-500 to-cyan-600",
				primary: "blue",
				textLight: "text-blue-100",
			},
			kepala_bidang: {
				gradient: "from-green-600 via-green-500 to-emerald-600",
				primary: "green",
				textLight: "text-green-100",
			},
			pegawai: {
				gradient: "from-orange-600 via-orange-500 to-amber-600",
				primary: "orange",
				textLight: "text-orange-100",
			},
			ketua_tim: {
				gradient: "from-teal-600 via-teal-500 to-cyan-600",
				primary: "teal",
				textLight: "text-teal-100",
			},
		};
		return themes[user.role] || themes.pegawai;
	};

	const themeColors = getThemeColors();

	const [activeTab, setActiveTab] = useState(
		isSecretariat ? "surat-masuk" : "masuk",
	);
	const [suratMasuk, setSuratMasuk] = useState([]);
	const [disposisiMasuk, setDisposisiMasuk] = useState([]);
	const [disposisiKeluar, setDisposisiKeluar] = useState([]);
	const [statistik, setStatistik] = useState(null);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [filterStatus, setFilterStatus] = useState("all");

	const itemsPerPage = 10;
	const [currentPageDisposisiMasuk, setCurrentPageDisposisiMasuk] = useState(1);

	const fetchData = useCallback(async () => {
		setLoading(true);
		try {
			console.log("[DisposisiSurat] Fetching data for activeTab:", activeTab);

			if (activeTab === "surat-masuk") {
				const suratRes = await api.get("/surat-masuk?status=draft");
				setSuratMasuk(suratRes.data.data || []);
			} else {
				const [statsRes, disposisiRes] = await Promise.all([
					api.get("/disposisi/statistik"),
					api.get(`/disposisi/${activeTab}`),
				]);

				setStatistik(statsRes.data.data);

				if (activeTab === "masuk") {
					setDisposisiMasuk(disposisiRes.data.data);
				} else {
					setDisposisiKeluar(disposisiRes.data.data);
				}
			}
		} catch (error) {
			console.error("Error fetching data:", error);
			toast.error("Gagal memuat data");
		} finally {
			setLoading(false);
		}
	}, [activeTab]);

	useDisposisiAutoReload(fetchData, {
		enabled: true,
		debounceMs: 2000,
		notificationTypes: ["new_disposisi", "disposisi_update"],
	});

	useEffect(() => {
		fetchData();
		setCurrentPageDisposisiMasuk(1);
	}, [activeTab]);

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

	const getStatusBadge = (status) => {
		const config = {
			pending: {
				bg: "bg-gradient-to-r from-yellow-100 to-amber-100",
				text: "text-yellow-800",
				icon: Clock,
				label: "Pending",
			},
			dibaca: {
				bg: "bg-gradient-to-r from-blue-100 to-cyan-100",
				text: "text-blue-800",
				icon: Eye,
				label: "Dibaca",
			},
			proses: {
				bg: "bg-gradient-to-r from-indigo-100 to-purple-100",
				text: "text-indigo-800",
				icon: Send,
				label: "Diproses",
			},
			selesai: {
				bg: "bg-gradient-to-r from-green-100 to-emerald-100",
				text: "text-green-800",
				icon: CheckCircle2,
				label: "Selesai",
			},
			teruskan: {
				bg: "bg-gradient-to-r from-purple-100 to-pink-100",
				text: "text-purple-800",
				icon: ArrowRight,
				label: "Diteruskan",
			},
		};
		return config[status] || config.pending;
	};

	const formatTanggal = (tanggal) => {
		return new Date(tanggal).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Filter data based on search and status
	const getFilteredData = (data) => {
		return data.filter((item) => {
			const matchSearch =
				searchQuery === "" ||
				item.perihal?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.surat?.perihal
					?.toLowerCase()
					.includes(searchQuery.toLowerCase()) ||
				item.nomor_surat?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.surat?.nomor_surat
					?.toLowerCase()
					.includes(searchQuery.toLowerCase());

			const matchStatus =
				filterStatus === "all" || item.status === filterStatus;

			return matchSearch && matchStatus;
		});
	};

	// Pagination helpers
	const getPaginatedData = (data, currentPage) => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		const endIndex = startIndex + itemsPerPage;
		return data.slice(startIndex, endIndex);
	};

	const getTotalPages = (data) => {
		return Math.ceil(data.length / itemsPerPage);
	};

	// Get filtered and paginated data
	const filteredDisposisiMasuk = getFilteredData(disposisiMasuk);
	const filteredDisposisiKeluar = getFilteredData(disposisiKeluar);
	const paginatedDisposisiMasuk = getPaginatedData(
		filteredDisposisiMasuk,
		currentPageDisposisiMasuk,
	);
	const paginatedDisposisiKeluar = getPaginatedData(
		filteredDisposisiKeluar,
		currentPageDisposisiMasuk,
	);

	return (
		<div className="min-h-screen bg-gray-50 pb-20 lg:pb-8">
			{/* Modern Header dengan Gradient - Dynamic Color Based on Role */}
			<div className={`bg-gradient-to-r ${themeColors.gradient} shadow-xl`}>
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div className="flex items-center gap-4">
							<div className="h-14 w-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0">
								<Mail className="h-7 w-7 text-white" />
							</div>
							<div>
								<h1 className="text-2xl sm:text-3xl font-bold text-white">
									Disposisi Surat
								</h1>
								<p className={`text-sm ${themeColors.textLight} mt-1`}>
									Kelola surat masuk dan disposisi Anda
								</p>
							</div>
						</div>

						{/* Action Button - Only for Sekretariat */}
						{isSecretariat && (
							<button
								className={`flex items-center justify-center gap-2 px-6 py-3 bg-white text-${themeColors.primary}-600 rounded-xl hover:bg-${themeColors.primary}-50 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all`}
							>
								<Plus className="h-5 w-5" />
								<span className="hidden sm:inline">Input Surat</span>
								<span className="sm:hidden">Tambah</span>
							</button>
						)}
					</div>
				</div>
			</div>

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				{/* Statistik Cards - Ultra Compact Design - Dynamic based on activeTab */}
				{statistik && activeTab !== "surat-masuk" && (
					<div className="grid grid-cols-5 gap-2 mb-4">
						{/* Pending Card */}
						<div className="group bg-white rounded-lg p-2.5 shadow-sm hover:shadow-md transition-all duration-200 border border-yellow-100 hover:border-yellow-300">
							<div className="flex flex-col items-center">
								<div className="h-8 w-8 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg flex items-center justify-center mb-1.5">
									<Clock className="h-4 w-4 text-white" />
								</div>
								<p className="text-xl font-bold text-gray-800">
									{activeTab === "masuk"
										? statistik.masuk.pending
										: statistik.keluar.pending}
								</p>
								<p className="text-[10px] text-gray-500 font-medium">Pending</p>
							</div>
						</div>

						{/* Dibaca Card */}
						<div className="group bg-white rounded-lg p-2.5 shadow-sm hover:shadow-md transition-all duration-200 border border-blue-100 hover:border-blue-300">
							<div className="flex flex-col items-center">
								<div className="h-8 w-8 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-lg flex items-center justify-center mb-1.5">
									<Eye className="h-4 w-4 text-white" />
								</div>
								<p className="text-xl font-bold text-gray-800">
									{activeTab === "masuk"
										? statistik.masuk.dibaca
										: statistik.keluar.dibaca}
								</p>
								<p className="text-[10px] text-gray-500 font-medium">Dibaca</p>
							</div>
						</div>

						{/* Proses Card */}
						<div className="group bg-white rounded-lg p-2.5 shadow-sm hover:shadow-md transition-all duration-200 border border-purple-100 hover:border-purple-300">
							<div className="flex flex-col items-center">
								<div className="h-8 w-8 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-lg flex items-center justify-center mb-1.5">
									<Send className="h-4 w-4 text-white" />
								</div>
								<p className="text-xl font-bold text-gray-800">
									{activeTab === "masuk"
										? statistik.masuk.proses
										: statistik.keluar.proses}
								</p>
								<p className="text-[10px] text-gray-500 font-medium">Proses</p>
							</div>
						</div>

						{/* Teruskan Card */}
						<div className="group bg-white rounded-lg p-2.5 shadow-sm hover:shadow-md transition-all duration-200 border border-orange-100 hover:border-orange-300">
							<div className="flex flex-col items-center">
								<div className="h-8 w-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center mb-1.5">
									<ArrowRight className="h-4 w-4 text-white" />
								</div>
								<p className="text-xl font-bold text-gray-800">
									{activeTab === "masuk"
										? statistik.masuk.teruskan || 0
										: statistik.keluar.teruskan || 0}
								</p>
								<p className="text-[10px] text-gray-500 font-medium">
									Teruskan
								</p>
							</div>
						</div>

						{/* Selesai Card */}
						<div className="group bg-white rounded-lg p-2.5 shadow-sm hover:shadow-md transition-all duration-200 border border-green-100 hover:border-green-300">
							<div className="flex flex-col items-center">
								<div className="h-8 w-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center mb-1.5">
									<CheckCircle2 className="h-4 w-4 text-white" />
								</div>
								<p className="text-xl font-bold text-gray-800">
									{activeTab === "masuk"
										? statistik.masuk.selesai
										: statistik.keluar.selesai}
								</p>
								<p className="text-[10px] text-gray-500 font-medium">Selesai</p>
							</div>
						</div>
					</div>
				)}

				{/* Tab Navigation - Ultra Modern Design */}
				<div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl shadow-lg p-1.5 mb-6 border border-gray-200">
					<div className="flex gap-1.5">
						{isSecretariat && (
							<button
								onClick={() => setActiveTab("surat-masuk")}
								className={`group relative flex-1 flex flex-col items-center justify-center px-4 py-3 rounded-xl font-semibold transition-all duration-300 overflow-hidden ${
									activeTab === "surat-masuk"
										? "bg-white text-blue-600 shadow-md"
										: "text-gray-500 hover:text-gray-700 hover:bg-white/50"
								}`}
							>
								{/* Background Gradient on Hover */}
								<div
									className={`absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${activeTab === "surat-masuk" ? "opacity-100" : ""}`}
								></div>

								<div className="relative flex items-center gap-2">
									<div
										className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
											activeTab === "surat-masuk"
												? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-md"
												: "bg-gray-200 text-gray-500 group-hover:bg-gray-300"
										}`}
									>
										<Inbox className="h-4 w-4" />
									</div>
									<div className="flex items-center gap-2">
										<span className="text-sm font-bold">Surat</span>
										{suratMasuk.length > 0 && (
											<span
												className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
													activeTab === "surat-masuk"
														? "bg-blue-100 text-blue-700"
														: "bg-gray-200 text-gray-600"
												}`}
											>
												{suratMasuk.length}
											</span>
										)}
									</div>
								</div>
							</button>
						)}

						<button
							onClick={() => setActiveTab("masuk")}
							className={`group relative flex-1 flex flex-col items-center justify-center px-4 py-3 rounded-xl font-semibold transition-all duration-300 overflow-hidden ${
								activeTab === "masuk"
									? "bg-white text-green-600 shadow-md"
									: "text-gray-500 hover:text-gray-700 hover:bg-white/50"
							}`}
						>
							{/* Background Gradient on Hover */}
							<div
								className={`absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${activeTab === "masuk" ? "opacity-100" : ""}`}
							></div>

							<div className="relative flex items-center gap-2">
								<div
									className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
										activeTab === "masuk"
											? "bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-md"
											: "bg-gray-200 text-gray-500 group-hover:bg-gray-300"
									}`}
								>
									<Mail className="h-4 w-4" />
								</div>
								<div className="flex items-center gap-2">
									<span className="text-sm font-bold">Masuk</span>
									{statistik && (
										<span
											className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
												activeTab === "masuk"
													? "bg-green-100 text-green-700"
													: "bg-gray-200 text-gray-600"
											}`}
										>
											{statistik.masuk.total}
										</span>
									)}
								</div>
							</div>
						</button>

						<button
							onClick={() => setActiveTab("keluar")}
							className={`group relative flex-1 flex flex-col items-center justify-center px-4 py-3 rounded-xl font-semibold transition-all duration-300 overflow-hidden ${
								activeTab === "keluar"
									? "bg-white text-purple-600 shadow-md"
									: "text-gray-500 hover:text-gray-700 hover:bg-white/50"
							}`}
						>
							{/* Background Gradient on Hover */}
							<div
								className={`absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${activeTab === "keluar" ? "opacity-100" : ""}`}
							></div>

							<div className="relative flex items-center gap-2">
								<div
									className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
										activeTab === "keluar"
											? "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-md"
											: "bg-gray-200 text-gray-500 group-hover:bg-gray-300"
									}`}
								>
									<Send className="h-4 w-4" />
								</div>
								<div className="flex items-center gap-2">
									<span className="text-sm font-bold">Keluar</span>
									{statistik && (
										<span
											className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
												activeTab === "keluar"
													? "bg-purple-100 text-purple-700"
													: "bg-gray-200 text-gray-600"
											}`}
										>
											{statistik.keluar.total}
										</span>
									)}
								</div>
							</div>
						</button>
					</div>
				</div>

				{/* Search & Filter Bar */}
				<div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
					<div className="flex flex-col sm:flex-row gap-3">
						{/* Search Input */}
						<div className="flex-1 relative">
							<Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
							<input
								type="text"
								placeholder="Cari nomor surat, perihal..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
							/>
						</div>

						{/* Filter Status */}
						<div className="relative">
							<Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
							<select
								value={filterStatus}
								onChange={(e) => setFilterStatus(e.target.value)}
								className="w-full sm:w-48 pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer transition-all"
							>
								<option value="all">Semua Status</option>
								<option value="pending">Pending</option>
								<option value="dibaca">Dibaca</option>
								<option value="proses">Diproses</option>
								<option value="selesai">Selesai</option>
								<option value="teruskan">Diteruskan</option>
							</select>
						</div>
					</div>

					{/* Active Filters Display */}
					{(searchQuery || filterStatus !== "all") && (
						<div className="flex items-center gap-2 mt-3 pt-3 border-t">
							<span className="text-sm text-gray-600">Filter aktif:</span>
							{searchQuery && (
								<span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium flex items-center gap-1">
									"{searchQuery}"
									<button
										onClick={() => setSearchQuery("")}
										className="hover:bg-blue-200 rounded-full p-0.5"
									>
										<X className="h-3 w-3" />
									</button>
								</span>
							)}
							{filterStatus !== "all" && (
								<span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium flex items-center gap-1">
									Status: {filterStatus}
									<button
										onClick={() => setFilterStatus("all")}
										className="hover:bg-purple-200 rounded-full p-0.5"
									>
										<X className="h-3 w-3" />
									</button>
								</span>
							)}
						</div>
					)}
				</div>

				{/* Content Area */}
				{loading ? (
					<div className="flex flex-col items-center justify-center py-20">
						<div className="relative">
							<div className="h-16 w-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
							<Mail className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-blue-600" />
						</div>
						<p className="text-gray-600 mt-4 font-medium">
							Memuat data disposisi...
						</p>
					</div>
				) : (
					<div className="space-y-4">
						{/* Disposisi Masuk Tab Content */}
						{activeTab === "masuk" && (
							<>
								{filteredDisposisiMasuk.length === 0 ? (
									<div className="bg-white rounded-2xl shadow-lg p-12 text-center">
										<div className="mx-auto h-24 w-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
											<Inbox className="h-12 w-12 text-gray-400" />
										</div>
										<h3 className="text-xl font-bold text-gray-800 mb-2">
											Tidak Ada Disposisi Masuk
										</h3>
										<p className="text-gray-500">
											{searchQuery || filterStatus !== "all"
												? "Tidak ada hasil yang sesuai dengan pencarian Anda"
												: "Belum ada disposisi masuk saat ini"}
										</p>
									</div>
								) : (
									<div className="grid gap-3">
										{paginatedDisposisiMasuk.map((disposisi) => {
											const statusConfig = getStatusBadge(disposisi.status);
											const StatusIcon = statusConfig.icon;

											return (
												<div
													key={disposisi.id}
													onClick={() => {
														const basePath = location.pathname.includes(
															"/kepala-dinas",
														)
															? "/kepala-dinas"
															: location.pathname.includes("/kepala-bidang")
																? "/kepala-bidang"
																: location.pathname.includes(
																			"/sekretaris-dinas",
																	  )
																	? "/sekretaris-dinas"
																	: location.pathname.includes("/ketua-tim")
																		? "/ketua-tim"
																		: location.pathname.includes("/pegawai")
																			? "/pegawai"
																			: location.pathname.includes("/bidang")
																				? "/bidang"
																				: location.pathname.includes(
																							"/sekretariat",
																					  )
																					? "/sekretariat"
																					: "/dashboard";
														navigate(`${basePath}/disposisi/${disposisi.id}`);
													}}
													className="group bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100 hover:border-blue-400 cursor-pointer overflow-hidden"
												>
													{/* Color Accent Bar */}
													<div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

													<div className="p-3">
														{/* Header Row */}
														<div className="flex items-start gap-2 mb-2">
															<div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
																<FileText className="h-5 w-5 text-white" />
															</div>
															<div className="flex-1 min-w-0">
																<h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-1 group-hover:text-blue-600 transition-colors">
																	{disposisi.surat?.perihal || "Tanpa Perihal"}
																</h3>
																<p className="text-xs text-gray-500 mt-0.5">
																	{disposisi.surat?.nomor_surat || "-"}
																</p>
															</div>
															<span
																className={`flex items-center gap-1 px-2 py-1 ${statusConfig.bg} ${statusConfig.text} rounded-lg text-[10px] font-bold whitespace-nowrap`}
															>
																<StatusIcon className="h-3 w-3" />
																{statusConfig.label}
															</span>
														</div>

														{/* Info Row */}
														<div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
															<div className="flex items-center gap-1">
																<User className="h-3 w-3" />
																<span className="truncate max-w-[120px]">
																	{disposisi.dari_user?.name || "Unknown"}
																</span>
															</div>
															<div className="flex items-center gap-1">
																<Calendar className="h-3 w-3" />
																<span>
																	{new Date(
																		disposisi.tanggal_disposisi,
																	).toLocaleDateString("id-ID", {
																		day: "numeric",
																		month: "short",
																	})}
																</span>
															</div>
														</div>

														{/* Catatan */}
														{disposisi.catatan && (
															<div className="bg-gray-50 rounded-lg p-2 mb-2">
																<p className="text-xs text-gray-700 line-clamp-2">
																	{disposisi.catatan}
																</p>
															</div>
														)}

														{/* Action Footer */}
														<div className="flex items-center justify-between pt-2 border-t border-gray-100">
															{disposisi.status === "pending" && (
																<button
																	onClick={(e) => {
																		e.stopPropagation();
																		handleBacaDisposisi(disposisi.id);
																	}}
																	className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 font-medium text-xs shadow-sm hover:shadow transition-all"
																>
																	<Eye className="h-3 w-3" />
																	Baca
																</button>
															)}
															<div className="ml-auto flex items-center gap-0.5 text-blue-600 font-semibold text-xs group-hover:gap-1 transition-all">
																Detail
																<ChevronRight className="h-3 w-3" />
															</div>
														</div>
													</div>
												</div>
											);
										})}
									</div>
								)}

								{/* Pagination */}
								{filteredDisposisiMasuk.length > itemsPerPage && (
									<div className="flex items-center justify-between bg-white rounded-2xl shadow-lg p-4 mt-6">
										<p className="text-sm text-gray-600">
											Menampilkan{" "}
											{(currentPageDisposisiMasuk - 1) * itemsPerPage + 1} -{" "}
											{Math.min(
												currentPageDisposisiMasuk * itemsPerPage,
												filteredDisposisiMasuk.length,
											)}{" "}
											dari {filteredDisposisiMasuk.length} data
										</p>
										<div className="flex items-center gap-2">
											<button
												onClick={() =>
													setCurrentPageDisposisiMasuk((prev) =>
														Math.max(1, prev - 1),
													)
												}
												disabled={currentPageDisposisiMasuk === 1}
												className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
											>
												Prev
											</button>
											<span className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">
												{currentPageDisposisiMasuk}
											</span>
											<button
												onClick={() =>
													setCurrentPageDisposisiMasuk((prev) => prev + 1)
												}
												disabled={
													currentPageDisposisiMasuk >=
													getTotalPages(filteredDisposisiMasuk)
												}
												className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
											>
												Next
											</button>
										</div>
									</div>
								)}
							</>
						)}

						{/* Disposisi Keluar Tab Content */}
						{activeTab === "keluar" && (
							<>
								{filteredDisposisiKeluar.length === 0 ? (
									<div className="bg-white rounded-2xl shadow-lg p-12 text-center">
										<div className="mx-auto h-24 w-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
											<Send className="h-12 w-12 text-gray-400" />
										</div>
										<h3 className="text-xl font-bold text-gray-800 mb-2">
											Tidak Ada Disposisi Keluar
										</h3>
										<p className="text-gray-500">
											{searchQuery || filterStatus !== "all"
												? "Tidak ada hasil yang sesuai dengan pencarian Anda"
												: "Belum ada disposisi keluar saat ini"}
										</p>
									</div>
								) : (
									<div className="grid gap-3">
										{paginatedDisposisiKeluar.map((disposisi) => {
											const statusConfig = getStatusBadge(disposisi.status);
											const StatusIcon = statusConfig.icon;

											return (
												<div
													key={disposisi.id}
													onClick={() => {
														const basePath = location.pathname.includes(
															"/kepala-dinas",
														)
															? "/kepala-dinas"
															: location.pathname.includes("/kepala-bidang")
																? "/kepala-bidang"
																: location.pathname.includes(
																			"/sekretaris-dinas",
																	  )
																	? "/sekretaris-dinas"
																	: location.pathname.includes("/ketua-tim")
																		? "/ketua-tim"
																		: location.pathname.includes("/pegawai")
																			? "/pegawai"
																			: location.pathname.includes("/bidang")
																				? "/bidang"
																				: location.pathname.includes(
																							"/sekretariat",
																					  )
																					? "/sekretariat"
																					: "/dashboard";
														navigate(`${basePath}/disposisi/${disposisi.id}`);
													}}
													className="group bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100 hover:border-purple-400 cursor-pointer overflow-hidden"
												>
													{/* Color Accent Bar */}
													<div className="h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500"></div>

													<div className="p-3">
														{/* Header Row */}
														<div className="flex items-start gap-2 mb-2">
															<div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
																<FileText className="h-5 w-5 text-white" />
															</div>
															<div className="flex-1 min-w-0">
																<h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-1 group-hover:text-purple-600 transition-colors">
																	{disposisi.surat?.perihal || "Tanpa Perihal"}
																</h3>
																<p className="text-xs text-gray-500 mt-0.5">
																	{disposisi.surat?.nomor_surat || "-"}
																</p>
															</div>
															<span
																className={`flex items-center gap-1 px-2 py-1 ${statusConfig.bg} ${statusConfig.text} rounded-lg text-[10px] font-bold whitespace-nowrap`}
															>
																<StatusIcon className="h-3 w-3" />
																{statusConfig.label}
															</span>
														</div>

														{/* Info Row - Showing recipient */}
														<div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
															<div className="flex items-center gap-1">
																<User className="h-3 w-3" />
																<span className="truncate max-w-[120px]">
																	Kepada:{" "}
																	{disposisi.kepada_user?.name || "Unknown"}
																</span>
															</div>
															<div className="flex items-center gap-1">
																<Calendar className="h-3 w-3" />
																<span>
																	{new Date(
																		disposisi.tanggal_disposisi,
																	).toLocaleDateString("id-ID", {
																		day: "numeric",
																		month: "short",
																	})}
																</span>
															</div>
														</div>

														{/* Catatan */}
														{disposisi.catatan && (
															<div className="bg-gray-50 rounded-lg p-2 mb-2">
																<p className="text-xs text-gray-700 line-clamp-2">
																	{disposisi.catatan}
																</p>
															</div>
														)}

														{/* Action Footer */}
														<div className="flex items-center justify-end pt-2 border-t border-gray-100">
															<div className="flex items-center gap-0.5 text-purple-600 font-semibold text-xs group-hover:gap-1 transition-all">
																Detail
																<ChevronRight className="h-3 w-3" />
															</div>
														</div>
													</div>
												</div>
											);
										})}
									</div>
								)}

								{/* Pagination */}
								{filteredDisposisiKeluar.length > itemsPerPage && (
									<div className="flex items-center justify-between bg-white rounded-2xl shadow-lg p-4 mt-6">
										<p className="text-sm text-gray-600">
											Menampilkan{" "}
											{(currentPageDisposisiMasuk - 1) * itemsPerPage + 1} -{" "}
											{Math.min(
												currentPageDisposisiMasuk * itemsPerPage,
												filteredDisposisiKeluar.length,
											)}{" "}
											dari {filteredDisposisiKeluar.length} data
										</p>
										<div className="flex items-center gap-2">
											<button
												onClick={() =>
													setCurrentPageDisposisiMasuk((prev) =>
														Math.max(1, prev - 1),
													)
												}
												disabled={currentPageDisposisiMasuk === 1}
												className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
											>
												Prev
											</button>
											<span className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold">
												{currentPageDisposisiMasuk}
											</span>
											<button
												onClick={() =>
													setCurrentPageDisposisiMasuk((prev) => prev + 1)
												}
												disabled={
													currentPageDisposisiMasuk >=
													getTotalPages(filteredDisposisiKeluar)
												}
												className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
											>
												Next
											</button>
										</div>
									</div>
								)}
							</>
						)}

						{activeTab === "surat-masuk" && isSecretariat && (
							<div className="bg-white rounded-2xl shadow-lg p-12 text-center">
								<Inbox className="mx-auto h-16 w-16 text-blue-400 mb-4" />
								<h3 className="text-xl font-bold text-gray-800 mb-2">
									Surat Masuk
								</h3>
								<p className="text-gray-500">
									Menampilkan surat masuk yang belum didisposisi
								</p>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
