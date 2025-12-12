import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
	listRw,
	listRt,
	listPosyandu,
	createRw,
	createRt,
	createPosyandu,
	updateRw,
	updatePosyandu,
} from "../../../services/kelembagaan";
import { getListActivityLogs } from "../../../services/activityLogs";
import { useAuth } from "../../../context/AuthContext";
// Removed listPengurus import for performance optimization
import { FaArrowLeft } from "react-icons/fa";
import {
	LuBuilding,
	LuBuilding2,
	LuHeart,
	LuUsers,
	LuMapPin,
	LuCrown,
	LuPlus,
	LuSettings,
	LuEye,
	LuCheck,
	LuX,
	LuFilter,
	LuClock,
	LuUser,
	LuCalendar,
	LuActivity,
	LuList,
} from "react-icons/lu";
import Swal from "sweetalert2";

export default function KelembagaanList() {
	const { type } = useParams();
	const navigate = useNavigate();
	const { user } = useAuth();
	const [items, setItems] = useState([]);
	const [rwOptions, setRwOptions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [form, setForm] = useState({ nomor: "", nama: "", rw_id: "" });
	const [addForm, setAddForm] = useState({ nomor: "", nama: "" });
	const [showAddModal, setShowAddModal] = useState(false);
	const [activeTab, setActiveTab] = useState("list"); // list | aktif | nonaktif | activity
	const [activityLogs, setActivityLogs] = useState([]);
	const [loadingLogs, setLoadingLogs] = useState(false);
	// Removed pengurus and rtList states for better performance
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		let mounted = true;

		const fetchData = async () => {
			setLoading(true);
			try {
				let res;
				switch (type) {
					case "rw":
						res = await listRw();
						break;
					case "rt":
						res = await listRt();
						break;
					case "posyandu":
						res = await listPosyandu();
						break;
					default:
						res = { data: { data: [] } };
				}

				if (mounted) {
					setItems(res?.data?.data || []);
				}

				// Fetch additional data based on type - only what's necessary
				if (type === "rt" && mounted) {
					const rwRes = await listRw();
					setRwOptions(rwRes?.data?.data || []);
				}
			} catch (error) {
				console.error("Error fetching data:", error);
				if (mounted) {
					alert("Gagal memuat data");
				}
			} finally {
				if (mounted) {
					setLoading(false);
				}
			}
		};

		fetchData();

		return () => {
			mounted = false;
		};
	}, [type]);

	const handleCreate = async () => {
		if (submitting) return;

		setSubmitting(true);
		try {
			if (type === "rw") {
				if (!addForm.nomor.trim()) {
					alert("Nomor RW wajib diisi");
					return;
				}
				await createRw({ nomor: addForm.nomor.trim() });
			} else if (type === "posyandu") {
				if (!addForm.nama.trim()) {
					alert("Nama Posyandu wajib diisi");
					return;
				}
				await createPosyandu({ nama: addForm.nama.trim() });
			}

			setShowAddModal(false);
			setAddForm({ nomor: "", nama: "" });

			// Reload list
			const res = type === "rw" ? await listRw() : await listPosyandu();
			setItems(res?.data?.data || []);
		} catch (error) {
			console.error("Error creating data:", error);
			alert("Gagal menyimpan data");
		} finally {
			setSubmitting(false);
		}
	};

	const toggleStatus = async (item, event) => {
		if (event) {
			event.stopPropagation();
		}

		if (submitting) return;

		const current = (item.status_kelembagaan || "aktif").toLowerCase();
		const next = current === "aktif" ? "nonaktif" : "aktif";

		// Confirm only when deactivating
		if (next === "nonaktif") {
			const result = await Swal.fire({
				title: "Nonaktifkan?",
				text: `Anda akan menonaktifkan ${
					type === "rw" ? `RW ${item.nomor}` : item.nama || type
				}. Tindakan ini dapat dibatalkan dengan mengaktifkannya kembali.`,
				icon: "warning",
				showCancelButton: true,
				confirmButtonText: "Ya, nonaktifkan",
				cancelButtonText: "Batal",
				confirmButtonColor: "#dc2626",
				cancelButtonColor: "#6b7280",
			});

			if (!result.isConfirmed) return;
		}

		setSubmitting(true);
		try {
			const payload = { ...item, status_kelembagaan: next };
			if (type === "rw") {
				await updateRw(item.id, payload);
			} else if (type === "posyandu") {
				await updatePosyandu(item.id, payload);
			}

			// Refresh data
			const res = type === "rw" ? await listRw() : await listPosyandu();
			setItems(res?.data?.data || []);

			// Feedback
			await Swal.fire({
				icon: "success",
				title: next === "nonaktif" ? "Dinonaktifkan" : "Diaktifkan",
				text: `${
					type === "rw" ? `RW ${item.nomor}` : item.nama || type
				} berhasil ${next === "nonaktif" ? "dinonaktifkan" : "diaktifkan"}.`,
				toast: false,
				position: "center",
				showConfirmButton: true,
			});
		} catch (error) {
			console.error("Error updating status:", error);
			await Swal.fire({
				icon: "error",
				title: "Gagal",
				text: "Gagal mengubah status",
			});
		} finally {
			setSubmitting(false);
		}
	};

	// Removed ketuaLookup and rtCountByRw for performance optimization
	// These will be loaded on demand in detail pages

	// Fetch activity logs when activity tab is active
	useEffect(() => {
		const fetchActivityLogs = async () => {
			if (activeTab !== 'activity' || !type || !user?.desa_id) return;
			
			// Only for RW, RT, Posyandu
			if (!['rw', 'rt', 'posyandu'].includes(type)) return;
			
			setLoadingLogs(true);
			try {
				const response = await getListActivityLogs(type, user.desa_id, 50);
				setActivityLogs(response?.data?.logs || []);
			} catch (error) {
				console.error('Error fetching activity logs:', error);
				setActivityLogs([]);
			} finally {
				setLoadingLogs(false);
			}
		};

		fetchActivityLogs();
	}, [activeTab, type, user?.desa_id]);

	const filteredItems = useMemo(() => {
		if (activeTab === 'activity') return [];
		if (activeTab === 'list') return items || [];
		
		return (items || []).filter((item) => {
			const status = (item.status_kelembagaan || "aktif").toLowerCase();
			return activeTab === "aktif" ? status === "aktif" : status !== "aktif";
		});
	}, [items, activeTab]);

	const SimpleModal = ({ isOpen, title, children, onClose, onSubmit }) => {
		const handleBackdropClick = (e) => {
			if (e.target === e.currentTarget) {
				onClose();
			}
		};

		useEffect(() => {
			if (!isOpen) return;

			const handleKeyDown = (e) => {
				if (e.key === "Escape") {
					onClose();
				}
			};

			document.addEventListener("keydown", handleKeyDown);
			return () => document.removeEventListener("keydown", handleKeyDown);
		}, [isOpen, onClose]);

		if (!isOpen) return null;

		return (
			<div
				className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
				role="dialog"
				aria-modal="true"
				onClick={handleBackdropClick}
			>
				<div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 transform transition-all">
					<div
						className={`flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r ${getGradient()} rounded-t-2xl`}
					>
						<div className="flex items-center space-x-3">
							<div className="p-2 bg-white/20 rounded-lg">
								<IconComponent className="w-5 h-5 text-white" />
							</div>
							<h3 className="text-lg font-semibold text-white">{title}</h3>
						</div>
						<button
							type="button"
							className="text-white/80 hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
							onClick={onClose}
							disabled={submitting}
						>
							✕
						</button>
					</div>
					<div className="p-6 space-y-4">{children}</div>
					<div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
						<button
							type="button"
							className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
							onClick={onClose}
							disabled={submitting}
						>
							Batal
						</button>
						<button
							type="button"
							className={`px-6 py-2 bg-gradient-to-r ${getGradient()} text-white rounded-lg hover:shadow-md disabled:opacity-50 transition-all flex items-center space-x-2`}
							onClick={onSubmit}
							disabled={submitting}
						>
							{submitting ? (
								<>
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
									<span>Menyimpan...</span>
								</>
							) : (
								<>
									<LuPlus className="w-4 h-4" />
									<span>Simpan</span>
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		);
	};

	// Validasi type parameter
	const validTypes = ["rw", "rt", "posyandu"];
	if (!validTypes.includes(type)) {
		return (
			<div className="p-4">
				<div className="text-red-500">Jenis kelembagaan tidak valid</div>
				<button
					className="mt-2 px-3 py-1 bg-blue-600 text-white rounded"
					onClick={() => navigate("/desa/kelembagaan")}
				>
					Kembali
				</button>
			</div>
		);
	}

	const title = type === "rw" ? "RW" : type === "rt" ? "RT" : "Posyandu";

	// Helper functions for activity logs
	const formatDate = (dateString) => {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	};

	const getActivityIcon = (activityType) => {
		switch (activityType) {
			case 'create':
				return '🎉';
			case 'update':
				return '✏️';
			case 'toggle_status':
				return '🔄';
			case 'verify':
				return '✅';
			default:
				return '📝';
		}
	};

	// RT: keep old behavior
	if (type === "rt") {
		const handleRtSubmit = async (e) => {
			e.preventDefault();
			if (submitting) return;

			setSubmitting(true);
			try {
				if (!form.rw_id) {
					alert("Pilih RW terlebih dahulu");
					return;
				}
				if (!form.nomor.trim()) {
					alert("Nomor RT wajib diisi");
					return;
				}

				await createRt({
					rw_id: form.rw_id,
					nomor: form.nomor.trim(),
				});

				setForm({ nomor: "", nama: "", rw_id: "" });
				const res = await listRt();
				setItems(res?.data?.data || []);
			} catch (error) {
				console.error("Error creating RT:", error);
				alert("Gagal menyimpan data");
			} finally {
				setSubmitting(false);
			}
		};

		return (
			<div className="p-6 space-y-6 bg-gray-50 min-h-screen">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-4">
						<button
							className="flex items-center justify-center w-12 h-12 bg-white hover:bg-blue-600 rounded-xl shadow-md hover:text-white transition-all duration-200 hover:shadow-lg"
							onClick={() => navigate(-1)}
							title="Kembali"
						>
							<FaArrowLeft className="w-5 h-5" />
						</button>
						<div>
							<h1 className="text-3xl font-bold text-gray-800">Daftar RT</h1>
							<p className="text-gray-600">
								Kelola Rukun Tetangga di desa Anda
							</p>
						</div>
					</div>
					<div className="flex items-center space-x-2">
						<LuBuilding2 className="w-8 h-8 text-blue-600" />
					</div>
				</div>

				{/* Form Pembentukan RT */}
				<div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
					<h2 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
						<LuPlus className="w-5 h-5 mr-2" />
						Bentuk RT Baru
					</h2>
					<form
						onSubmit={handleRtSubmit}
						className="flex flex-wrap gap-4 items-end"
					>
						<div className="flex-1 min-w-[200px]">
							<label
								htmlFor="rt-form-rw-id"
								className="block text-sm font-medium mb-1"
							>
								RW
							</label>
							<select
								className="w-full border rounded px-3 py-2"
								name="rw_id"
								id="rt-form-rw-id"
								value={form.rw_id}
								onChange={(e) =>
									setForm((f) => ({ ...f, rw_id: e.target.value }))
								}
								required
							>
								<option value="">Pilih RW</option>
								{rwOptions.map((rw) => (
									<option key={rw.id} value={rw.id}>
										RW {rw.nomor}
									</option>
								))}
							</select>
						</div>

						<div className="flex-1 min-w-[120px]">
							<label
								htmlFor="rt-form-nomor"
								className="block text-sm font-medium mb-1"
							>
								Nomor RT
							</label>
							<input
								className="w-full border rounded px-3 py-2"
								name="nomor"
								id="rt-form-nomor"
								placeholder="Nomor RT"
								autoComplete="off"
								value={form.nomor}
								onChange={(e) =>
									setForm((f) => ({ ...f, nomor: e.target.value }))
								}
								required
							/>
						</div>

						<button
							className="px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2 font-medium shadow-md hover:shadow-lg transition-all duration-200"
							disabled={submitting}
						>
							<LuPlus className="w-4 h-4" />
							<span>{submitting ? "Membentuk..." : "Bentuk RT"}</span>
						</button>
					</form>
				</div>

				{loading ? (
					<div className="text-center py-12">
						<div className="inline-flex items-center px-4 py-2 bg-blue-50 rounded-lg">
							<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
							<span className="text-blue-700">Memuat data RT...</span>
						</div>
					</div>
				) : items.length === 0 ? (
					<div className="text-center py-12">
						<div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
							<LuBuilding2 className="w-8 h-8 text-gray-400" />
						</div>
						<p className="text-gray-500 text-lg">Belum ada data RT</p>
						<p className="text-gray-400 text-sm">
							Mulai bentuk RT pertama dengan form di atas
						</p>
					</div>
				) : (
					<div>
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-xl font-semibold text-gray-800">
								Daftar RT ({items.length})
							</h3>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{items.map((item) => {
								const status = (
									item.status_kelembagaan || "aktif"
								).toLowerCase();
								return (
									<div
										key={item.id}
										className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 hover:border-blue-200 group"
										onClick={() => navigate(`/desa/kelembagaan/rt/${item.id}`)}
									>
										<div className="flex items-center justify-between mb-4">
											<div className="flex items-center space-x-3">
												<div className="p-3 bg-blue-100 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
													<LuBuilding2 className="w-6 h-6" />
												</div>
												<div>
													<h4 className="font-bold text-xl text-gray-800">
														RT {item.nomor}
													</h4>
													<div className="flex items-center space-x-2">
														<span
															className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
																status === "aktif"
																	? "bg-green-100 text-green-700"
																	: "bg-red-100 text-red-700"
															}`}
														>
															{status === "aktif" ? "Aktif" : "Nonaktif"}
														</span>
													</div>
												</div>
											</div>
											<LuEye className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
										</div>

										{item.alamat && (
											<div className="flex items-start space-x-2 mb-4">
												<LuMapPin className="w-4 h-4 text-gray-400 mt-0.5" />
												<span className="text-sm text-gray-600 leading-relaxed">
													{item.alamat}
												</span>
											</div>
										)}

										<div className="flex items-center justify-between pt-4 border-t border-gray-100">
											<div className="text-xs text-gray-500">
												Verifikasi: {item.status_verifikasi || "Belum"}
											</div>
											<button
												className="text-blue-600 text-sm font-medium hover:text-blue-800 flex items-center space-x-1 group-hover:translate-x-1 transition-transform"
												onClick={(e) => {
													e.stopPropagation();
													navigate(`/desa/kelembagaan/rt/${item.id}`);
												}}
											>
												<span>Lihat Detail</span>
												<LuEye className="w-3 h-3" />
											</button>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>
		);
	}

	const getIcon = () => {
		switch (type) {
			case "rw":
				return LuBuilding;
			case "posyandu":
				return LuHeart;
			default:
				return LuBuilding2;
		}
	};

	const getGradient = () => {
		switch (type) {
			case "rw":
				return "from-blue-500 to-indigo-600";
			case "posyandu":
				return "from-pink-500 to-rose-500";
			default:
				return "from-gray-500 to-gray-600";
		}
	};

	const IconComponent = getIcon();

	return (
		<div className="p-6 space-y-6 bg-white rounded-md shadow-md min-h-screen">
			{/* Header */}
			<div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
				<div className="flex items-center space-x-4">
					<button
						className="flex items-center justify-center w-12 h-12 bg-white hover:bg-blue-600 rounded-xl shadow-md hover:text-white transition-all duration-200 hover:shadow-lg"
						onClick={() => navigate("/desa/kelembagaan")}
						title="Kembali"
					>
						<FaArrowLeft className="w-5 h-5" />
					</button>
					<div>
						<h1 className="text-3xl font-bold text-gray-800">Daftar {title}</h1>
						<p className="text-gray-600">
							{type === "rw"
								? "Kelola Rukun Warga di desa Anda"
								: "Kelola Pos Pelayanan Terpadu"}
						</p>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-3">
					{/* Filter Tabs */}
					<div className="flex items-center bg-white rounded-xl shadow-sm overflow-hidden">
						<button
							className={`px-4 py-2 text-sm font-medium transition-colors ${
								activeTab === "list"
									? "bg-blue-100 text-blue-700"
									: "text-gray-600 hover:bg-gray-100"
							}`}
							onClick={() => setActiveTab("list")}
						>
							<div className="flex items-center space-x-2">
								<LuList className="w-4 h-4" />
								<span>Semua</span>
							</div>
						</button>
						<button
							className={`px-4 py-2 text-sm font-medium transition-colors ${
								activeTab === "aktif"
									? "bg-green-100 text-green-700"
									: "text-gray-600 hover:bg-gray-100"
							}`}
							onClick={() => setActiveTab("aktif")}
						>
							<div className="flex items-center space-x-2">
								<LuCheck className="w-4 h-4" />
								<span>Aktif</span>
							</div>
						</button>
						<button
							className={`px-4 py-2 text-sm font-medium transition-colors ${
								activeTab === "nonaktif"
									? "bg-red-100 text-red-700"
									: "text-gray-600 hover:bg-gray-100"
							}`}
							onClick={() => setActiveTab("nonaktif")}
						>
							<div className="flex items-center space-x-2">
								<LuX className="w-4 h-4" />
								<span>Nonaktif</span>
							</div>
						</button>
						<button
							className={`px-4 py-2 text-sm font-medium transition-colors ${
								activeTab === "activity"
									? "bg-purple-100 text-purple-700"
									: "text-gray-600 hover:bg-gray-100"
							}`}
							onClick={() => setActiveTab("activity")}
						>
							<div className="flex items-center space-x-2">
								<LuActivity className="w-4 h-4" />
								<span>Log Aktivitas</span>
							</div>
						</button>
					</div>

					{/* Add Button */}
					{(type === "rw" || type === "posyandu") && (
						<button
							className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2"
							onClick={() => setShowAddModal(true)}
						>
							<LuPlus className="w-4 h-4" />
							<span>{type === "rw" ? "Tambah RW" : "Tambah Posyandu"}</span>
						</button>
					)}
				</div>
			</div>

			{/* Activity Logs Tab */}
			{activeTab === "activity" ? (
				<div className="bg-white rounded-xl shadow-md p-6">
					<div className="flex items-center space-x-3 mb-6 pb-4 border-b border-gray-200">
						<div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
							<LuActivity className="w-6 h-6 text-white" />
						</div>
						<div>
							<h3 className="text-xl font-semibold text-gray-800">
								Riwayat Aktivitas {title}
							</h3>
							<p className="text-gray-600 text-sm">
								Log aktivitas untuk semua {title} di desa ini
							</p>
						</div>
					</div>

					{loadingLogs ? (
						<div className="text-center py-12">
							<div className="inline-flex items-center px-4 py-2 bg-purple-50 rounded-lg">
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
								<span className="text-purple-700">Memuat riwayat aktivitas...</span>
							</div>
						</div>
					) : activityLogs.length === 0 ? (
						<div className="text-center py-12">
							<LuClock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
							<p className="text-gray-500 text-lg">Belum ada aktivitas</p>
							<p className="text-gray-400 text-sm">
								Aktivitas akan muncul ketika ada perubahan data
							</p>
						</div>
					) : (
						<div className="space-y-4 max-h-[600px] overflow-y-auto">
							{activityLogs.map((log) => (
								<div
									key={log.id}
									className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
								>
									<div className="text-3xl">{getActivityIcon(log.activity_type)}</div>
									<div className="flex-1 min-w-0">
										<p className="text-gray-800 font-medium">
											{log.action_description}
										</p>
										<div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
											<div className="flex items-center space-x-1">
												<span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold">
													{log.kelembagaan_nama}
												</span>
											</div>
											<div className="flex items-center space-x-1">
												<LuUser className="w-3 h-3" />
												<span>{log.user_name}</span>
											</div>
											<div className="flex items-center space-x-1">
												<LuCalendar className="w-3 h-3" />
												<span>{formatDate(log.created_at)}</span>
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			) : loading ? (
				<div className="text-center py-12">
					<div className="inline-flex items-center px-4 py-2 bg-blue-50 rounded-lg">
						<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
						<span className="text-blue-700">Memuat data...</span>
					</div>
				</div>
			) : filteredItems.length === 0 ? (
				<div className="text-center py-12">
					<div
						className={`bg-gradient-to-br ${getGradient()} rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 opacity-20`}
					>
						<IconComponent className="w-8 h-8 text-white" />
					</div>
					<p className="text-gray-500 text-lg">
						{activeTab === "list"
							? `Tidak ada data ${title}`
							: activeTab === "aktif"
							? `Tidak ada ${title} yang aktif`
							: `Tidak ada ${title} yang nonaktif`}
					</p>
					<p className="text-gray-400 text-sm">
						{type === "rw" || type === "posyandu"
							? "Gunakan tombol 'Tambah' untuk menambahkan data baru"
							: "Data akan muncul setelah ditambahkan"}
					</p>
				</div>
			) : (
				<div>
					{/* Stats Header */}
					<div className="bg-gradient-to-r from-white to-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-3">
								<div
									className={`p-3 bg-gradient-to-br ${getGradient()} rounded-xl`}
								>
									<IconComponent className="w-6 h-6 text-white" />
								</div>
								<div>
									<h3 className="text-xl font-semibold text-gray-800">
										{title} {activeTab === "aktif" ? "Aktif" : "Nonaktif"}
									</h3>
									<p className="text-gray-600">
										{filteredItems.length} {title}{" "}
										{activeTab === "aktif" ? "aktif" : "nonaktif"}
									</p>
								</div>
							</div>
							<div className="text-right">
								<div className="text-2xl font-bold text-gray-800">
									{filteredItems.length}
								</div>
								<div className="text-sm text-gray-500">Total {title}</div>
							</div>
						</div>
					</div>

					{/* Cards Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{filteredItems.map((item) => {
							const status = (item.status_kelembagaan || "aktif").toLowerCase();

							return (
								<div
									key={item.id}
									className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 hover:border-blue-200 group"
									onClick={() =>
										navigate(`/desa/kelembagaan/${type}/${item.id}`)
									}
								>
									{/* Card Header */}
									<div className="flex items-center justify-between mb-4">
										<div className="flex items-center space-x-3">
											<div
												className={`p-3 bg-gradient-to-br ${getGradient()} rounded-xl group-hover:scale-110 transition-transform`}
											>
												<IconComponent className="w-6 h-6 text-white" />
											</div>
											<div>
												<h4 className="font-bold text-lg text-gray-800">
													{type === "rw" ? `RW ${item.nomor}` : item.nama}
												</h4>
												<div className="flex items-center space-x-2">
													<span
														className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
															status === "aktif"
																? "bg-green-100 text-green-700"
																: "bg-red-100 text-red-700"
														}`}
													>
														{status === "aktif" ? "Aktif" : "Nonaktif"}
													</span>
												</div>
											</div>
										</div>
										<LuEye className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
									</div>

									{/* Card Content */}
									<div className="space-y-3 mb-4">
										{item.ketua_nama || item.nama_ketua ? (
											<div className="flex items-center space-x-2">
												<LuCrown className="w-4 h-4 text-yellow-500" />
												<span className="text-sm text-gray-600">
													Ketua: {item.ketua_nama || item.nama_ketua}
												</span>
											</div>
										) : (
											<div className="flex items-center space-x-2">
												<LuUsers className="w-4 h-4 text-gray-400" />
												<span className="text-sm text-gray-400">
													Belum ada ketua
												</span>
											</div>
										)}

										{type === "rw" && (
											<div className="flex items-center space-x-2">
												<LuBuilding2 className="w-4 h-4 text-blue-500" />
												<span className="text-sm text-gray-600">
													{item.jumlah_rt || item.rt_count || 0} RT
												</span>
											</div>
										)}
									</div>

									{/* Card Footer */}
									<div className="flex items-center justify-between pt-4 border-t border-gray-100">
										<button
											className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
												status === "aktif"
													? "bg-red-50 text-red-700 hover:bg-red-100"
													: "bg-green-50 text-green-700 hover:bg-green-100"
											} disabled:opacity-50`}
											onClick={(e) => toggleStatus(item, e)}
											disabled={submitting}
										>
											{status === "aktif" ? "Nonaktifkan" : "Aktifkan"}
										</button>

										<button
											className="text-blue-600 text-sm font-medium hover:text-blue-800 flex items-center space-x-1 group-hover:translate-x-1 transition-transform"
											onClick={(e) => {
												e.stopPropagation();
												navigate(`/desa/kelembagaan/${type}/${item.id}`);
											}}
										>
											<span>Lihat Detail</span>
											<LuEye className="w-3 h-3" />
										</button>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

			<SimpleModal
				isOpen={showAddModal}
				title={type === "rw" ? "Tambah RW" : "Tambah Posyandu"}
				onClose={() => !submitting && setShowAddModal(false)}
				onSubmit={handleCreate}
			>
				{type === "rw" ? (
					<div>
						<label
							htmlFor="modal-rw-nomor"
							className="block text-sm font-medium mb-2 text-gray-700"
						>
							Nomor RW
						</label>
						<div className="relative">
							<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<LuBuilding className="w-5 h-5 text-gray-400" />
							</div>
							<input
								className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
								name="nomor"
								id="modal-rw-nomor"
								autoComplete="off"
								value={addForm.nomor}
								onChange={(e) =>
									setAddForm((f) => ({ ...f, nomor: e.target.value }))
								}
								placeholder="Masukkan nomor RW (contoh: 001)"
								disabled={submitting}
								autoFocus
							/>
						</div>
					</div>
				) : (
					<div>
						<label
							htmlFor="modal-posyandu-nama"
							className="block text-sm font-medium mb-2 text-gray-700"
						>
							Nama Posyandu
						</label>
						<div className="relative">
							<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<LuHeart className="w-5 h-5 text-gray-400" />
							</div>
							<input
								className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-50"
								name="nama"
								id="modal-posyandu-nama"
								autoComplete="off"
								value={addForm.nama}
								onChange={(e) =>
									setAddForm((f) => ({ ...f, nama: e.target.value }))
								}
								placeholder="Masukkan nama Posyandu (contoh: Posyandu Mawar)"
								disabled={submitting}
								autoFocus
							/>
						</div>
					</div>
				)}
			</SimpleModal>
		</div>
	);
}
