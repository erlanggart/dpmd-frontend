import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import {
	listRw,
	listPosyandu,
	createRw,
	createPosyandu,
} from "../../services/kelembagaan";
import { useAuth } from "../../context/AuthContext";
import { useEditMode } from "../../context/EditModeContext";
import AktivitasLog from "./AktivitasLog";
// Removed listPengurus import for performance optimization
import { FaArrowLeft, FaHome, FaChevronRight } from "react-icons/fa";
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
	LuClock,
	LuUser,
	LuCalendar,
	LuActivity,
	LuFileText,
	LuInfo,
	LuLock,
	LuLockOpen,
} from "react-icons/lu";
import Swal from "sweetalert2";

export default function KelembagaanList() {
	const { type, desaId: routeDesaId } = useParams(); // Get desaId from route params
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const queryDesaId = searchParams.get('desaId'); // Get desaId from query params
	const desaId = routeDesaId || queryDesaId; // Prioritize route param over query param
	const { user, isSuperAdmin, isAdminBidang, isUserDesa } = useAuth(); // Get user for role-based navigation
	const { isEditMode } = useEditMode();
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [addForm, setAddForm] = useState({ nomor: "", nama: "" });
	const [showAddModal, setShowAddModal] = useState(false);
	const [activeTab, setActiveTab] = useState("aktif"); // aktif | nonaktif
	const [submitting, setSubmitting] = useState(false);

	// Determine if add button should show
	// For admin (superadmin/admin bidang): always show
	// For desa: only show if edit mode is ON
	const showAddButton = (isSuperAdmin() || isAdminBidang()) || (isUserDesa() && isEditMode);

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
					case "posyandu":
						res = await listPosyandu();
						break;
					default:
						res = { data: { data: [] } };
				}

				if (mounted) {
					setItems(res?.data?.data || []);
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

	
	// Helper function to get base path based on user role
	const getBasePath = () => {
		if (user?.role === 'desa') {
			return '/desa';
		} else if (user?.role === 'superadmin' || user?.role === 'kepala_dinas' || user?.role === 'kepala_bidang' && user?.bidang_id === 5 || (user?.role === 'pegawai' && user?.bidang_id === 5)) {
			return '/bidang/pmd';
		}
		return '/desa'; // Default fallback
	};

	const basePath = getBasePath();

	const filteredItems = useMemo(() => {
		return (items || []).filter((item) => {
			// Filter by status
			const status = (item.status_kelembagaan || "aktif").toLowerCase();
			const statusMatch = activeTab === "aktif" ? status === "aktif" : status !== "aktif";
			
			// Filter by desaId if provided (for admin view)
			const desaMatch = !desaId || String(item.desa_id) === String(desaId);
			
			return statusMatch && desaMatch;
		});
	}, [items, activeTab, desaId]);

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

		const isRwModal = type === "rw";
		const isPosyanduModal = type === "posyandu";

		return (
			<div
				className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
				role="dialog"
				aria-modal="true"
				onClick={handleBackdropClick}
			>
				<div className={`bg-white rounded-2xl shadow-2xl w-full ${(isRwModal || isPosyanduModal) ? 'max-w-5xl' : 'max-w-md'} mx-4 transform transition-all max-h-[90vh] overflow-y-auto`}>
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
					
					{/* Informasi Pembentukan RW */}
					{isRwModal && (
						<div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-blue-100">
							<div className="flex items-start space-x-3 mb-4">
								<div className="p-2 bg-blue-500 rounded-lg flex-shrink-0">
									<LuFileText className="w-5 h-5 text-white" />
								</div>
								<div className="flex-1">
									<h4 className="font-semibold text-blue-900 mb-2">
										Ketentuan Pembentukan Rukun Warga
									</h4>
									<p className="text-sm text-blue-800 mb-3">
										Pembentukan Rukun Warga diatur dengan tata cara sebagai berikut:
									</p>
								</div>
							</div>
							
							<div className="space-y-3">
								<div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100">
									<div className="flex items-start space-x-3">
										<div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
											1
										</div>
										<p className="text-sm text-gray-700 leading-relaxed">
											Pembentukan RW dapat berasal dari <strong>Pembentukan RW baru</strong>, <strong>Pemekaran</strong> dari 1 (satu) RW menjadi 2 (dua) RW atau lebih dan/atau <strong>penggabungan</strong> dari beberapa RW atau bagian RW yang bersandingan.
										</p>
									</div>
								</div>
								
								<div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100">
									<div className="flex items-start space-x-3">
										<div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
											2
										</div>
										<p className="text-sm text-gray-700 leading-relaxed">
											Pembentukan RW dapat berasal dari <strong>prakarsa masyarakat</strong> setelah mendapatkan pertimbangan dari Kepala Desa/Lurah.
										</p>
									</div>
								</div>
								
								<div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100">
									<div className="flex items-start space-x-3">
										<div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
											3
										</div>
										<p className="text-sm text-gray-700 leading-relaxed">
											Setiap RW paling sedikit terdiri dari <strong>3 (tiga) RT untuk desa</strong> dan <strong>5 (lima) RT untuk kelurahan</strong>.
										</p>
									</div>
								</div>
								
								<div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100">
									<div className="flex items-start space-x-3">
										<div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
											4
										</div>
										<p className="text-sm text-gray-700 leading-relaxed">
											Bagi wilayah pemukiman tertentu yang tidak memenuhi ketentuan di atas, tetapi mempunyai jarak yang cukup jauh dari RW terdekat, dapat dibentuk RW baru yang terdiri dari sekurang-kurangnya <strong>2 (dua) RT</strong>.
										</p>
									</div>
								</div>
							</div>
							
							<div className="mt-4 flex items-start space-x-2 bg-blue-100 rounded-lg p-3">
								<LuInfo className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
								<div>

								<p className="text-md font-semibold">
									Sesuai Dengan Peraturan Bupati Bogor Nomor 31 Tahun 2012
								</p>
								<p className="text-xs text-blue-800">
									Tentang Tata Cara Pembentukan, Pengangkatan, dan Pemberhentian Pengurus Lembaga Pemberdayaan Masyarakat Desa/Kelurahan (LPMD/LPMK), Rukun Warga (RW), dan Rukun Tetangga (RT)
								</p>
								</div>
							</div>
						</div>
					)}
					
					{/* Informasi Pembentukan Posyandu */}
					{isPosyanduModal && (
						<div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-b border-purple-100">
							<div className="flex items-start space-x-3 mb-4">
								<div className="p-2 bg-purple-600 rounded-lg flex-shrink-0">
									<LuFileText className="w-5 h-5 text-white" />
								</div>
								<div className="flex-1">
									<h4 className="font-semibold text-purple-900 mb-2">
										Kedudukan dan Pembentukan Posyandu
									</h4>
								</div>
							</div>
							
							{/* Kedudukan dan Pembentukan */}
							<div className="space-y-3 mb-4">
								<div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
									<div className="flex items-start space-x-3">
										<div className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
											1
										</div>
										<p className="text-sm text-gray-700 leading-relaxed">
											Posyandu <strong>berkedudukan di Desa/Kelurahan</strong> setempat.
										</p>
									</div>
								</div>
								
								<div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
									<div className="flex items-start space-x-3">
										<div className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
											2
										</div>
										<p className="text-sm text-gray-700 leading-relaxed">
											Posyandu dibentuk atas <strong>prakarsa Pemerintah Desa/Kelurahan dan masyarakat</strong>.
										</p>
									</div>
								</div>
								
								<div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
									<div className="flex items-start space-x-3">
										<div className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
											3
										</div>
										<p className="text-sm text-gray-700 leading-relaxed">
											Pembentukan Posyandu disertai/diikuti dengan pemberian <strong>nomor registrasi</strong> yang ditetapkan oleh Menteri melalui Direktorat Jenderal Bina Pemerintahan Desa.
										</p>
									</div>
								</div>
								
								<div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
									<div className="flex items-start space-x-3">
										<div className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
											4
										</div>
										<p className="text-sm text-gray-700 leading-relaxed">
											Tata cara pemberian nomor registrasi ditetapkan oleh Menteri.
										</p>
									</div>
								</div>
							</div>
							
							{/* Syarat Pembentukan */}
							<div className="mt-5 pt-4 border-t border-purple-200">
								<h5 className="font-semibold text-purple-900 mb-3 flex items-center">
									<LuCheck className="w-5 h-5 mr-2" />
									Syarat Pembentukan
								</h5>
								<div className="space-y-3">
									<div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
										<div className="flex items-start space-x-3">
										<div className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
												1
											</div>
										<p className="text-sm text-gray-700 font-medium mb-2">
											Pembentukan Posyandu dengan memenuhi persyaratan:
										</p>
										</div>
										<ol className="space-y-2 ml-4">
											<li className="flex items-start space-x-2 text-sm text-gray-700">
												<span className="text-purple-600 font-bold">a.</span>
												<span>Keberadaannya <strong>bermanfaat dan dibutuhkan</strong> masyarakat Desa/Kelurahan</span>
											</li>
											<li className="flex items-start space-x-2 text-sm text-gray-700">
												<span className="text-purple-600 font-bold">b.</span>
												<span>Memiliki <strong>kepengurusan yang tetap</strong></span>
											</li>
											<li className="flex items-start space-x-2 text-sm text-gray-700">
												<span className="text-purple-600 font-bold">c.</span>
												<span>Memiliki <strong>sekretariat, tempat pelayanan, dan sarana pendukung lainnya</strong> yang bersifat tetap</span>
											</li>
											<li className="flex items-start space-x-2 text-sm text-gray-700">
												<span className="text-purple-600 font-bold">d.</span>
												<span><strong>Tidak berafiliasi kepada partai politik</strong></span>
											</li>
										</ol>
									</div>
									
									<div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
										<div className="flex items-start space-x-3">
											<div className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
												2
											</div>
											<p className="text-sm text-gray-700 leading-relaxed">
												Sekretariat, tempat pelayanan, dan sarana pendukung lainnya merupakan <strong>aset Desa/Kelurahan</strong>.
											</p>
										</div>
									</div>
									
									<div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
										<div className="flex items-start space-x-3">
											<div className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
												3
											</div>
											<p className="text-sm text-gray-700 leading-relaxed">
												Dalam hal Pemerintah Desa/Kelurahan tidak memiliki sekretariat, tempat pelayanan, dan sarana pendukung lainnya, dapat <strong>menggunakan fasilitas lainnya</strong>.
											</p>
										</div>
									</div>
								</div>
							</div>
							
							<div className="mt-4 flex items-start space-x-2 bg-blue-100 rounded-lg p-3">
								<LuInfo className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
								<div>

								<p className="text-md font-semibold">
									Sesuai Dengan Peratuuran Menteri Dalam Negeri Nomor 13 Tahun 2024
								</p>
								<p className="text-xs text-blue-800">
									Tentang Pos Pelayanan Terpadu								
								</p>
								</div>
							</div>
						</div>
					)}
					
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

	// Validasi type parameter - RT tidak tersedia di sini, hanya di detail RW
	const validTypes = ["rw", "posyandu"];
	if (!validTypes.includes(type)) {
		return (
			<div className="p-4">
				<div className="text-red-500">Jenis kelembagaan tidak valid</div>
				<button
					className="mt-2 px-3 py-1 bg-blue-600 text-white rounded"
					onClick={() => navigate(`${basePath}/kelembagaan`)}
				>
					Kembali
				</button>
			</div>
		);
	}

	const title = type === "rw" ? "RW" : "Posyandu";

	// RT should only be managed from RW detail page via AnakLembagaCard
	if (type === "rt") {
		// Redirect to kelembagaan page if someone tries to access RT list directly
		navigate(`${basePath}/kelembagaan`);
		return null;
	}

	// Back navigation - handle admin route
	const handleBack = () => {
		if (desaId) {
			// If viewing specific desa (admin mode), go back to that desa's detail page
			navigate(`/bidang/pmd/kelembagaan/admin/${desaId}`);
		} else {
			// Normal mode, go back to kelembagaan index
			navigate(`${basePath}/kelembagaan`);
		}
	};

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
				return "from-purple-500 to-purple-700";
			case "pkk":
				return "from-pink-500 to-rose-500";
			default:
				return "from-gray-500 to-gray-600";
		}
	};

	const IconComponent = getIcon();

	return (
		<div className="space-y-4  min-h-screen">
			{/* Breadcrumb */}
			<div className="bg-white p-2 rounded-md shadow-sm">
				<div className="flex items-center justify-between">
					<nav className="flex items-center space-x-2 text-sm">
						<Link
							to={`${basePath}/kelembagaan`}
							className="flex items-center text-gray-500 hover:text-indigo-600 transition-colors"
						>
							<FaHome className="mr-1" />
							Dashboard
						</Link>
						<FaChevronRight className="text-gray-400 text-xs" />
						<Link
							to={`${basePath}/kelembagaan`}
							className="text-gray-500 hover:text-indigo-600 transition-colors"
						>
							Kelembagaan
						</Link>
						<FaChevronRight className="text-gray-400 text-xs" />
						
						{/* Admin: Show Desa name and link */}
						{desaId && filteredItems.length > 0 && (
							<>
								<Link
									to={`/bidang/pmd/kelembagaan/admin/${desaId}`}
									className="text-gray-500 hover:text-indigo-600 transition-colors"
								>
									{filteredItems[0]?.desas?.nama || filteredItems[0]?.desa?.nama || "Desa"}
								</Link>
								<FaChevronRight className="text-gray-400 text-xs" />
							</>
						)}
						
						<span className="text-gray-900 font-medium">{title}</span>
					</nav>
					
					{/* Status Badge */}
					<span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
						isEditMode 
							? "bg-green-100 text-green-700 border border-green-300" 
							: "bg-red-100 text-red-700 border border-red-300"
					}`}>
						{isEditMode ? (
							<>
								<LuLockOpen className="w-3 h-3" />
								<span>Dibuka</span>
							</>
						) : (
							<>
								<LuLock className="w-3 h-3" />
								<span>Ditutup</span>
							</>
						)}
					</span>
				</div>
			</div>

			{/* Header */}
			<div className="bg-white p-4 rounded-md shadow-md flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
				<div className="flex items-center space-x-4">
					<button
						className="flex items-center justify-center w-12 h-12 bg-white hover:bg-blue-600 rounded-xl shadow-md hover:text-white transition-all duration-200 hover:shadow-lg"
						onClick={handleBack}
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
					{/* Filter Tabs - Only Aktif/Nonaktif */}
					<div className="flex items-center bg-white rounded-xl shadow-sm overflow-hidden">
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
					</div>

					{/* Add Button */}
					{showAddButton && (type === "rw" || type === "posyandu") && (
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

			{/* Main Content - 2 Column Layout */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Left Column - Data List (2/3 width) */}
				<div className="lg:col-span-2 space-y-6">
					{loading ? (
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
								{activeTab === "aktif"
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



							{/* Cards Grid */}
							<div className="space-y-4">
								{filteredItems.map((item) => {
									const status = (item.status_kelembagaan || "aktif").toLowerCase();

									return (
										<>

										<div
											key={item.id}
											className="bg-white flex flex-col rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 hover:border-blue-200 group overflow-hidden"
											onClick={() =>
												navigate(`${basePath}/kelembagaan/${type}/${item.id}`)
											}
										>
											{/* Gradient Bar */}
											<div className={`h-1.5 bg-gradient-to-r ${
												type === "rw" 
													? "from-blue-400 to-blue-500" 
													: type === "posyandu"
													? "from-purple-500 to-purple-700"
													: type === "pkk"
													? "from-pink-500 to-rose-500"
													: "from-gray-400 to-gray-500"
											} rounded-t-2xl`}></div>
											
											{/* Card Content Wrapper */}
											<div className="flex justify-between p-6">
											{/* Card Header */}
											
											<div className="flex items-center justify-between ">
												
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
												
											</div>

											{/* Card Content */}
											<div className="flex flex-col items-end space-y-3 ">
												{item.ketua_nama || item.nama_ketua ? (
													<div className="flex items-center space-x-2">
														<span className="text-sm text-gray-600">
															{item.ketua_nama || item.nama_ketua}
														</span>
														<div className="flex bg-yellow-500 items-center space-x-2 rounded-md p-1"> 

														<LuCrown className="w-4 h-4 text-white" />
														<span className="text-sm text-white">Ketua</span>
														</div>
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
											</div>
											{/* End Card Content Wrapper */}
											
										</div>
										</>
									);
								})}
							</div>
							
						</div>
					)}
				</div>

				{/* Right Column - Activity Log (1/3 width) */}
				<div className="lg:col-span-1">
					<div className="sticky top-6">
						<AktivitasLog 
							lembagaType={type}
							mode="list"
							title={title}
						/>
					</div>
				</div>
			</div>

			<SimpleModal
				isOpen={showAddModal}
				title={type === "rw" ? "Pembentukan RW" : "Pembentukan Posyandu"}
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
