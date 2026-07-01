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
	RotateCcw,
	Trash2,
	Pencil,
	History,
} from "lucide-react";
import api from "../../api";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import { INSTRUKSI_OPTIONS } from "../../constants/disposisiInstruksi";
import useDisposisiAutoReload from "../../hooks/useDisposisiAutoReload";
import SuratMasuk from "../bidang/sekretariat/disposisi/SuratMasuk";

const EXECUTIVE_ROLES = ["kepala_dinas", "sekretaris_dinas"];

const ExecutiveDisposisiView = ({
	user,
	activeTab,
	setActiveTab,
	statistik,
	loading,
	searchQuery,
	setSearchQuery,
	filterStatus,
	setFilterStatus,
	items,
	totalItems,
	currentPage,
	setCurrentPage,
	itemsPerPage,
	totalPages,
	getStatusBadge,
	formatTanggal,
	handleBacaDisposisi,
	navigate,
}) => {
	const isKepalaDinas = user.role === "kepala_dinas";
	const roleLabel = isKepalaDinas ? "Kepala Dinas" : "Sekretaris Dinas";
	const accent = isKepalaDinas
		? {
				soft: "bg-blue-50",
				text: "text-blue-700",
				button: "bg-blue-600 hover:bg-blue-700",
				ring: "focus:ring-blue-500",
				border: "border-blue-200",
			}
		: {
				soft: "bg-indigo-50",
				text: "text-indigo-700",
				button: "bg-indigo-600 hover:bg-indigo-700",
				ring: "focus:ring-indigo-500",
				border: "border-indigo-200",
			};

	const incomingStats = statistik?.masuk || {};
	const summary = [
		{ label: "Perlu dibaca", value: incomingStats.pending || 0, icon: Mail, color: "text-amber-600", bg: "bg-amber-50" },
		{ label: "Sudah dibaca", value: incomingStats.dibaca || 0, icon: Eye, color: "text-sky-600", bg: "bg-sky-50" },
		{ label: "Dalam proses", value: incomingStats.proses || 0, icon: Clock, color: "text-violet-600", bg: "bg-violet-50" },
		{ label: "Selesai", value: incomingStats.selesai || 0, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
	];

	return (
		<div className="min-h-screen bg-slate-50 pb-24 lg:pb-10">
			<div className="border-b border-slate-200 bg-white">
				<div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
					<div className="flex items-start justify-between gap-4">
						<div className="flex min-w-0 items-center gap-3 sm:gap-4">
							<div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent.soft} ${accent.text}`}>
								<Mail className="h-5 w-5" />
							</div>
							<div className="min-w-0">
								<p className={`mb-1 text-xs font-semibold uppercase tracking-[0.16em] ${accent.text}`}>
									{roleLabel}
								</p>
								<h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
									Disposisi Surat
								</h1>
								<p className="mt-1 text-sm text-slate-500">
									Pantau dan tindak lanjuti surat secara ringkas.
								</p>
							</div>
						</div>
						<div className="hidden rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-right sm:block">
							<p className="text-xs text-slate-500">Total disposisi masuk</p>
							<p className="text-lg font-bold text-slate-900">{incomingStats.total || 0}</p>
						</div>
					</div>
				</div>
			</div>

			<main className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
				<section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
					{summary.map(({ label, value, icon: Icon, color, bg }) => (
						<div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
							<div className="flex items-center justify-between gap-3">
								<div>
									<p className="text-xs font-medium text-slate-500">{label}</p>
									<p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
								</div>
								<div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg} ${color}`}>
									<Icon className="h-4 w-4" />
								</div>
							</div>
						</div>
					))}
				</section>

				<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
					<div className="border-b border-slate-200 p-3 sm:p-4">
						<div className="flex rounded-xl bg-slate-100 p-1">
							{[
								{ id: "masuk", label: "Disposisi Masuk", icon: Inbox, count: incomingStats.total || 0 },
								{ id: "keluar", label: "Disposisi Keluar", icon: Send, count: statistik?.keluar?.total || 0 },
							].map(({ id, label, icon: Icon, count }) => (
								<button
									key={id}
									type="button"
									onClick={() => {
										setActiveTab(id);
										setCurrentPage(1);
									}}
									className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
										activeTab === id
											? `bg-white ${accent.text} shadow-sm`
											: "text-slate-500 hover:text-slate-800"
									}`}
								>
									<Icon className="h-4 w-4" />
									<span>{label}</span>
									<span className={`rounded-full px-2 py-0.5 text-[11px] ${activeTab === id ? accent.soft : "bg-slate-200 text-slate-600"}`}>
										{count}
									</span>
								</button>
							))}
						</div>
					</div>

					<div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row">
						<div className="relative flex-1">
							<Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
							<input
								type="search"
								value={searchQuery}
								onChange={(event) => {
									setSearchQuery(event.target.value);
									setCurrentPage(1);
								}}
								placeholder="Cari nomor atau perihal surat"
								className={`w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:bg-white focus:ring-2 ${accent.ring}`}
							/>
						</div>
						<select
							value={filterStatus}
							onChange={(event) => {
								setFilterStatus(event.target.value);
								setCurrentPage(1);
							}}
							className={`rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:bg-white focus:ring-2 ${accent.ring}`}
						>
							<option value="all">Semua status</option>
							<option value="pending">Belum dibaca</option>
							<option value="dibaca">Sudah dibaca</option>
							<option value="proses">Dalam proses</option>
							<option value="selesai">Selesai</option>
							<option value="teruskan">Diteruskan</option>
						</select>
					</div>

					{loading ? (
						<div className="flex min-h-72 flex-col items-center justify-center gap-3">
							<div className={`h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-current ${accent.text}`} />
							<p className="text-sm text-slate-500">Memuat disposisi...</p>
						</div>
					) : items.length === 0 ? (
						<div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
							<div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
								<Inbox className="h-6 w-6" />
							</div>
							<h2 className="font-semibold text-slate-800">Belum ada disposisi</h2>
							<p className="mt-1 max-w-sm text-sm text-slate-500">
								{searchQuery || filterStatus !== "all"
									? "Tidak ada data yang cocok dengan pencarian atau filter."
									: `Belum ada disposisi ${activeTab} saat ini.`}
							</p>
						</div>
					) : (
						<div className="divide-y divide-slate-100">
							{items.map((disposisi) => {
								const statusConfig = getStatusBadge(disposisi.status);
								const StatusIcon = statusConfig.icon;
								const person = activeTab === "masuk"
									? disposisi.dari_user?.name
									: disposisi.ke_user?.name || disposisi.kepada_user?.name;

								return (
									<article
										key={disposisi.id}
										onClick={() => navigate(`/dpmd/disposisi/${disposisi.id}`)}
										className="group cursor-pointer p-4 transition hover:bg-slate-50 sm:p-5"
									>
										<div className="flex items-start gap-3 sm:gap-4">
											<div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent.soft} ${accent.text}`}>
												<FileText className="h-5 w-5" />
											</div>
											<div className="min-w-0 flex-1">
												<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
													<div className="min-w-0">
														<h3 className="line-clamp-2 text-sm font-semibold leading-5 text-slate-900 group-hover:text-slate-700 sm:text-base">
															{disposisi.surat?.perihal || "Tanpa perihal"}
														</h3>
														<p className="mt-1 text-xs font-medium text-slate-500">
															{disposisi.surat?.nomor_surat || "Nomor surat tidak tersedia"}
														</p>
													</div>
													<span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
														<StatusIcon className="h-3 w-3" />
														{statusConfig.label}
													</span>
												</div>

												<div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
													<span className="inline-flex items-center gap-1.5">
														<User className="h-3.5 w-3.5" />
														{activeTab === "masuk" ? "Dari" : "Kepada"}: {person || "-"}
													</span>
													<span className="inline-flex items-center gap-1.5">
														<Calendar className="h-3.5 w-3.5" />
														{formatTanggal(disposisi.tanggal_disposisi)}
													</span>
												</div>

												{disposisi.catatan && (
													<p className="mt-3 line-clamp-2 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
														{disposisi.catatan}
													</p>
												)}

												<div className="mt-3 flex items-center justify-end gap-2">
													{activeTab === "masuk" && disposisi.status === "pending" && (
														<button
															type="button"
															onClick={(event) => {
																event.stopPropagation();
																handleBacaDisposisi(disposisi.id);
															}}
															className={`rounded-lg px-3 py-2 text-xs font-semibold text-white transition ${accent.button}`}
														>
															Tandai dibaca
														</button>
													)}
													<span className={`inline-flex items-center gap-1 text-xs font-semibold ${accent.text}`}>
														Lihat detail <ChevronRight className="h-3.5 w-3.5" />
													</span>
												</div>
											</div>
										</div>
									</article>
								);
							})}
						</div>
					)}

					{!loading && totalItems > itemsPerPage && (
						<div className="flex flex-col gap-3 border-t border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
							<p className="text-xs text-slate-500">
								Halaman {currentPage} dari {totalPages}
							</p>
							<div className="flex gap-2">
								<button
									type="button"
									onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
									disabled={currentPage === 1}
									className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
								>
									Sebelumnya
								</button>
								<button
									type="button"
									onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
									disabled={currentPage >= totalPages}
									className={`rounded-lg px-3 py-2 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${accent.button}`}
								>
									Berikutnya
								</button>
							</div>
						</div>
					)}
				</section>
			</main>
		</div>
	);
};

export default function DisposisiSuratModern() {
	const navigate = useNavigate();
	const location = useLocation();

	// Get user first before using in state
	const user = JSON.parse(localStorage.getItem("user") || "{}");
	const isSecretariat =
		user.role === "sekretariat" ||
		user.role === "superadmin" ||
		Number(user.bidang_id) === 2;

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

	// Executive roles (kepala_dinas / sekretaris_dinas) memakai ExecutiveDisposisiView
	// yang hanya punya tab "masuk" & "keluar". Jangan set default "surat-masuk" untuk
	// mereka walau bidang_id === 2, karena tab itu tidak ada → data masuk tidak ter-fetch.
	const [activeTab, setActiveTab] = useState(
		EXECUTIVE_ROLES.includes(user.role)
			? "masuk"
			: isSecretariat
				? "surat-masuk"
				: "masuk",
	);
	const [suratMasuk, setSuratMasuk] = useState([]);
	const [disposisiMasuk, setDisposisiMasuk] = useState([]);
	const [disposisiKeluar, setDisposisiKeluar] = useState([]);
	const [riwayatData, setRiwayatData] = useState([]);
	const [statistik, setStatistik] = useState(null);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
	const [filterStatus, setFilterStatus] = useState("all");
	const [serverPagination, setServerPagination] = useState({
		total: 0,
		page: 1,
		limit: 10,
		totalPages: 0,
	});

	const itemsPerPage = 10;
	const [currentPageDisposisiMasuk, setCurrentPageDisposisiMasuk] = useState(1);
	const isExecutive = EXECUTIVE_ROLES.includes(user.role);

	useEffect(() => {
		const timeoutId = setTimeout(() => {
			setDebouncedSearchQuery(searchQuery.trim());
		}, 300);

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
							page: currentPageDisposisiMasuk,
							limit: itemsPerPage,
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
						limit: itemsPerPage,
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
	}, [
		activeTab,
		currentPageDisposisiMasuk,
		debouncedSearchQuery,
		filterStatus,
		isExecutive,
	]);

	useDisposisiAutoReload(fetchData, {
		enabled: true,
		debounceMs: 2000,
		notificationTypes: ["new_disposisi", "disposisi_update"],
	});

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	useEffect(() => {
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

	// ─── Riwayat: Tarik Kembali ─────────────────────────────────────
	const handleTarikDisposisi = async (disposisi) => {
		const result = await Swal.fire({
			title: 'Tarik Kembali Disposisi?',
			html: `<p class="text-sm text-gray-600">Surat: <strong>${disposisi.surat?.perihal || '-'}</strong></p>
			       <p class="text-sm text-gray-600 mt-1">Kepada: <strong>${disposisi.ke_user?.nama_lengkap || '-'}</strong></p>
			       <p class="text-xs text-amber-600 mt-3">Disposisi hanya bisa ditarik jika belum dibaca penerima.</p>`,
			icon: 'warning',
			showCancelButton: true,
			confirmButtonColor: '#f59e0b',
			cancelButtonColor: '#6b7280',
			confirmButtonText: 'Ya, Tarik Kembali',
			cancelButtonText: 'Batal',
		});

		if (result.isConfirmed) {
			try {
				await api.put(`/disposisi/${disposisi.id}/tarik`);
				toast.success('Disposisi berhasil ditarik kembali');
				fetchData();
			} catch (error) {
				const msg = error.response?.data?.message || 'Gagal menarik disposisi';
				toast.error(msg);
			}
		}
	};

	// ─── Riwayat: Hapus Disposisi ───────────────────────────────────
	const handleHapusDisposisi = async (disposisi) => {
		const result = await Swal.fire({
			title: 'Hapus Disposisi?',
			html: `<p class="text-sm text-gray-600">Surat: <strong>${disposisi.surat?.perihal || '-'}</strong></p>
			       <p class="text-xs text-red-500 mt-2">Tindakan ini tidak dapat dibatalkan!</p>`,
			icon: 'error',
			showCancelButton: true,
			confirmButtonColor: '#ef4444',
			cancelButtonColor: '#6b7280',
			confirmButtonText: 'Ya, Hapus',
			cancelButtonText: 'Batal',
		});

		if (result.isConfirmed) {
			try {
				await api.delete(`/disposisi/${disposisi.id}`);
				toast.success('Disposisi berhasil dihapus');
				fetchData();
			} catch (error) {
				const msg = error.response?.data?.message || 'Gagal menghapus disposisi';
				toast.error(msg);
			}
		}
	};

	// ─── Riwayat: Edit & Kirim Ulang ────────────────────────────────
	const handleEditDisposisi = async (disposisi) => {
		// Parse existing instructions if they are JSON string
		let existingInstruksi = [];
		try {
			existingInstruksi = JSON.parse(disposisi.instruksi);
			if (!Array.isArray(existingInstruksi)) existingInstruksi = [disposisi.instruksi];
		} catch {
			existingInstruksi = [disposisi.instruksi];
		}

		const { value: formValues } = await Swal.fire({
			title: 'Edit & Kirim Ulang Disposisi',
			width: '450px',
			html: `
				<div class="text-left space-y-4">
					<div class="p-3 bg-blue-50 rounded-lg border border-blue-100 mb-4">
						<label class="block text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Surat</label>
						<p class="text-sm font-bold text-gray-800 line-clamp-2">${disposisi.surat?.perihal || '-'}</p>
					</div>

					<div>
						<label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Instruksi Disposisi</label>
						<div class="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
							${INSTRUKSI_OPTIONS.map(i => `
								<label class="flex items-center gap-2 p-2 hover:bg-white rounded-lg cursor-pointer transition-all border border-transparent hover:border-blue-100 group">
									<input type="checkbox" name="swal-instruksi" value="${i.value}" 
										${existingInstruksi.includes(i.value) ? 'checked' : ''} 
										class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500">
									<span class="text-xs font-medium text-gray-700 group-hover:text-blue-600">${i.label}</span>
								</label>
							`).join('')}
						</div>
					</div>

					<div>
						<label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Catatan Tambahan</label>
						<textarea id="swal-catatan" class="w-full px-4 py-3 border-2 border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50/50" rows="3" placeholder="Masukkan catatan disposisi...">${disposisi.catatan || ''}</textarea>
					</div>
				</div>
			`,
			showCancelButton: true,
			confirmButtonColor: '#3b82f6',
			cancelButtonColor: '#6b7280',
			confirmButtonText: 'Kirim Ulang',
			cancelButtonText: 'Batal',
			focusConfirm: false,
			preConfirm: () => {
				const checkedInstruksi = Array.from(document.querySelectorAll('input[name="swal-instruksi"]:checked'))
					.map(input => input.value);
				
				if (checkedInstruksi.length === 0) {
					Swal.showValidationMessage('Pilih setidaknya satu instruksi');
					return false;
				}

				return {
					catatan: document.getElementById('swal-catatan').value,
					instruksi: checkedInstruksi,
				};
			},
		});

		if (formValues) {
			try {
				await api.put(`/disposisi/${disposisi.id}/edit`, formValues);
				toast.success('Disposisi berhasil diedit dan dikirim ulang');
				fetchData();
			} catch (error) {
				const msg = error.response?.data?.message || 'Gagal mengedit disposisi';
				toast.error(msg);
			}
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
			ditarik: {
				bg: "bg-gradient-to-r from-red-100 to-orange-100",
				text: "text-red-800",
				icon: RotateCcw,
				label: "Ditarik",
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

	if (isExecutive) {
		const executiveItems =
			activeTab === "masuk"
				? disposisiMasuk
				: disposisiKeluar;

		return (
			<ExecutiveDisposisiView
				user={user}
				activeTab={activeTab}
				setActiveTab={setActiveTab}
				statistik={statistik}
				loading={loading}
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				filterStatus={filterStatus}
				setFilterStatus={setFilterStatus}
				items={executiveItems}
				totalItems={serverPagination.total}
				currentPage={currentPageDisposisiMasuk}
				setCurrentPage={setCurrentPageDisposisiMasuk}
				itemsPerPage={itemsPerPage}
				totalPages={serverPagination.totalPages}
				getStatusBadge={getStatusBadge}
				formatTanggal={formatTanggal}
				handleBacaDisposisi={handleBacaDisposisi}
				navigate={navigate}
			/>
		);
	}

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
								onClick={() => setActiveTab("surat-masuk")}
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

						{/* Riwayat Tab - visible for sekretariat bidang users */}
						{(user.bidang_id === 2 || user.bidang_id === '2' || user.role === 'superadmin') && (
						<button
							onClick={() => setActiveTab("riwayat")}
							className={`group relative flex-1 flex flex-col items-center justify-center px-4 py-3 rounded-xl font-semibold transition-all duration-300 overflow-hidden ${
								activeTab === "riwayat"
									? "bg-white text-amber-600 shadow-md"
									: "text-gray-500 hover:text-gray-700 hover:bg-white/50"
							}`}
						>
							<div
								className={`absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${activeTab === "riwayat" ? "opacity-100" : ""}`}
							></div>

							<div className="relative flex items-center gap-2">
								<div
									className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
										activeTab === "riwayat"
											? "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md"
											: "bg-gray-200 text-gray-500 group-hover:bg-gray-300"
									}`}
								>
									<History className="h-4 w-4" />
								</div>
								<div className="flex items-center gap-2">
									<span className="text-sm font-bold">Riwayat</span>
									{riwayatData.length > 0 && (
										<span
											className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
												activeTab === "riwayat"
													? "bg-amber-100 text-amber-700"
													: "bg-gray-200 text-gray-600"
											}`}
										>
											{riwayatData.length}
										</span>
									)}
								</div>
							</div>
						</button>
						)}
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

						{/* ─── Riwayat Tab Content ─────────────────── */}
						{activeTab === "riwayat" && (
							<>
								{riwayatData.length === 0 ? (
									<div className="bg-white rounded-2xl shadow-lg p-12 text-center">
										<div className="mx-auto h-24 w-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
											<History className="h-12 w-12 text-gray-400" />
										</div>
										<h3 className="text-xl font-bold text-gray-800 mb-2">
											Belum Ada Riwayat
										</h3>
										<p className="text-gray-500">
											Belum ada disposisi yang pernah dikirim
										</p>
									</div>
								) : (
									<div className="grid gap-3">
										{riwayatData.map((disposisi) => {
											const statusConfig = getStatusBadge(disposisi.status);
											const StatusIcon = statusConfig.icon;
											const canRecall = disposisi.can_recall;
											const isDitarik = disposisi.status === 'ditarik';

											return (
												<div
													key={disposisi.id}
													className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden"
												>
													{/* Color bar based on status */}
													<div className={`h-1 ${
														isDitarik ? 'bg-gradient-to-r from-red-400 to-orange-400' :
														canRecall ? 'bg-gradient-to-r from-amber-400 to-yellow-400' :
														'bg-gradient-to-r from-emerald-400 to-green-400'
													}`}></div>

													<div className="p-3">
														{/* Header */}
														<div className="flex items-start gap-2 mb-2">
															<div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${
																isDitarik ? 'bg-gradient-to-br from-red-400 to-orange-500' :
																'bg-gradient-to-br from-amber-500 to-orange-500'
															}`}>
																<FileText className="h-5 w-5 text-white" />
															</div>
															<div className="flex-1 min-w-0">
																<h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-1">
																	{disposisi.surat?.perihal || "Tanpa Perihal"}
																</h3>
																<p className="text-xs text-gray-500 mt-0.5">
																	{disposisi.surat?.nomor_surat || "-"}
																</p>
															</div>
															<span className={`flex items-center gap-1 px-2 py-1 ${statusConfig.bg} ${statusConfig.text} rounded-lg text-[10px] font-bold whitespace-nowrap`}>
																<StatusIcon className="h-3 w-3" />
																{statusConfig.label}
															</span>
														</div>

														{/* Info */}
														<div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
															<div className="flex items-center gap-1">
																<User className="h-3 w-3" />
																<span>Kepada: {disposisi.ke_user?.nama_lengkap || "-"}</span>
															</div>
															<div className="flex items-center gap-1">
																<Calendar className="h-3 w-3" />
																<span>
																	{new Date(disposisi.tanggal_disposisi).toLocaleDateString("id-ID", {
																		day: "numeric",
																		month: "short",
																		year: "numeric",
																	})}
																</span>
															</div>
														</div>

														{disposisi.catatan && (
															<div className="bg-gray-50 rounded-lg p-2 mb-2">
																<p className="text-xs text-gray-700 line-clamp-2">{disposisi.catatan}</p>
															</div>
														)}

														{/* Actions */}
														<div className="flex items-center justify-between pt-2 border-t border-gray-100">
															<div className="flex items-center gap-2">
																{canRecall && (
																	<button
																		onClick={(e) => { e.stopPropagation(); handleTarikDisposisi(disposisi); }}
																		className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold transition-colors"
																		title="Tarik kembali disposisi"
																	>
																		<RotateCcw className="h-3 w-3" />
																		Tarik
																	</button>
																)}
																{isDitarik && (
																	<>
																		<button
																			onClick={(e) => { e.stopPropagation(); handleEditDisposisi(disposisi); }}
																			className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors"
																			title="Edit dan kirim ulang"
																		>
																			<Pencil className="h-3 w-3" />
																			Edit & Kirim
																		</button>
																		<button
																			onClick={(e) => { e.stopPropagation(); handleHapusDisposisi(disposisi); }}
																			className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold transition-colors"
																			title="Hapus disposisi"
																		>
																			<Trash2 className="h-3 w-3" />
																			Hapus
																		</button>
																	</>
																)}
															</div>
															<button
																onClick={() => navigate(`/dpmd/disposisi/${disposisi.id}`)}
																className="flex items-center gap-0.5 text-amber-600 font-semibold text-xs hover:gap-1 transition-all"
															>
																Detail
																<ChevronRight className="h-3 w-3" />
															</button>
														</div>
													</div>
												</div>
											);
										})}
									</div>
								)}
							</>
						)}

						{activeTab === "surat-masuk" && isSecretariat && (
							<SuratMasuk />
						)}
					</div>
				)}
			</div>
		</div>
	);
}
