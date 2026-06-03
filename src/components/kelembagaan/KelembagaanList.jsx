import { useEffect, useMemo, useState } from "react";
import {
	useNavigate,
	useParams,
	useSearchParams,
	Link,
} from "react-router-dom";
import {
	listRw,
	listPosyandu,
	listLembagaLainnya,
	createRw,
	createPosyandu,
	createLembagaLainnya,
	deleteRw,
	deleteRt,
	deletePosyandu,
	deleteLembagaLainnya,
} from "../../services/kelembagaan";
import { getProdukHukums } from "../../services/api";
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
	LuShieldCheck,
	LuTriangleAlert,
	LuChevronDown,
	LuChevronUp,
	LuSearch,
	LuTrash2,
} from "react-icons/lu";
import Swal from "sweetalert2";

// Modal component defined at module scope to prevent focus loss on re-renders
const SimpleModal = ({ isOpen, title, children, onClose, onSubmit, type, submitting, showKetentuan, setShowKetentuan, gradient, IconComponent }) => {
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

	const handleBackdropClick = (e) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
			role="dialog"
			aria-modal="true"
			onClick={handleBackdropClick}
		>
			<div
				className={`bg-white rounded-2xl shadow-2xl w-full ${isRwModal || isPosyanduModal ? "max-w-5xl" : "max-w-md"} mx-4 transform transition-all max-h-[90vh] overflow-y-auto`}
			>
				<div
					className={`flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r ${gradient} rounded-t-2xl`}
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
					<div className="border-b border-blue-100">
						<button
							type="button"
							className="w-full flex items-center justify-between p-4 bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors"
							onClick={() => setShowKetentuan((v) => !v)}
						>
							<div className="flex items-center space-x-3">
								<div className="p-1.5 bg-blue-500 rounded-lg flex-shrink-0">
									<LuFileText className="w-4 h-4 text-white" />
								</div>
								<div className="text-left">
									<h4 className="font-semibold text-blue-900 text-sm">
										Ketentuan Pembentukan Rukun Warga
									</h4>
									<p className="text-xs text-blue-600">Perbup Bogor No. 31 Tahun 2012</p>
								</div>
							</div>
							{showKetentuan ? (
								<LuChevronUp className="w-5 h-5 text-blue-500" />
							) : (
								<LuChevronDown className="w-5 h-5 text-blue-500" />
							)}
						</button>

						{showKetentuan && (
							<div className="p-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 space-y-3">
								<div className="space-y-2">
									{[
										<>Pembentukan RW dapat berasal dari <strong>Pembentukan RW baru</strong>, <strong>Pemekaran</strong> dari 1 (satu) RW menjadi 2 (dua) RW atau lebih dan/atau <strong>penggabungan</strong> dari beberapa RW atau bagian RW yang bersandingan.</>,
										<>Pembentukan RW dapat berasal dari <strong>prakarsa masyarakat</strong> setelah mendapatkan pertimbangan dari Kepala Desa/Lurah.</>,
										<>Setiap RW paling sedikit terdiri dari <strong>3 (tiga) RT untuk desa</strong> dan <strong>5 (lima) RT untuk kelurahan</strong>.</>,
										<>Bagi wilayah pemukiman tertentu yang tidak memenuhi ketentuan di atas, tetap mempunyai jarak yang cukup jauh dari RW terdekat, dapat dibentuk RW baru yang terdiri dari sekurang-kurangnya <strong>2 (dua) RT</strong>.</>,
									].map((text, i) => (
										<div key={i} className="bg-white rounded-lg p-3 shadow-sm border border-blue-100">
											<div className="flex items-start space-x-2.5">
												<div className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
													{i + 1}
												</div>
												<p className="text-sm text-gray-700 leading-relaxed">{text}</p>
											</div>
										</div>
									))}
								</div>
								<div className="flex items-start space-x-2 bg-blue-100 rounded-lg p-3">
									<LuInfo className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
									<div>
										<p className="text-sm font-semibold text-blue-900">Peraturan Bupati Bogor Nomor 31 Tahun 2012</p>
										<p className="text-xs text-blue-700">Tentang Tata Cara Pembentukan, Pengangkatan, dan Pemberhentian Pengurus LPMD/LPMK, RW, dan RT</p>
									</div>
								</div>
							</div>
						)}
					</div>
				)}

				{/* Informasi Pembentukan Posyandu */}
				{isPosyanduModal && (
					<div className="border-b border-purple-100">
						<button
							type="button"
							className="w-full flex items-center justify-between p-4 bg-gradient-to-br from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-colors"
							onClick={() => setShowKetentuan((v) => !v)}
						>
							<div className="flex items-center space-x-3">
								<div className="p-1.5 bg-purple-600 rounded-lg flex-shrink-0">
									<LuFileText className="w-4 h-4 text-white" />
								</div>
								<div className="text-left">
									<h4 className="font-semibold text-purple-900 text-sm">
										Kedudukan dan Pembentukan Posyandu
									</h4>
									<p className="text-xs text-purple-600">Permendagri No. 13 Tahun 2024</p>
								</div>
							</div>
							{showKetentuan ? (
								<LuChevronUp className="w-5 h-5 text-purple-500" />
							) : (
								<LuChevronDown className="w-5 h-5 text-purple-500" />
							)}
						</button>

						{showKetentuan && (
							<div className="p-4 bg-gradient-to-br from-purple-50/50 to-pink-50/50 space-y-4">
								{/* Kedudukan dan Pembentukan */}
								<div className="space-y-2">
									{[
										<>Posyandu <strong>berkedudukan di Desa/Kelurahan</strong> setempat.</>,
										<>Posyandu dibentuk atas <strong>prakarsa Pemerintah Desa/Kelurahan dan masyarakat</strong>.</>,
										<>Pembentukan Posyandu disertai/diikuti dengan pemberian <strong>nomor registrasi</strong> yang ditetapkan oleh Menteri melalui Direktorat Jenderal Bina Pemerintahan Desa.</>,
										<>Tata cara pemberian nomor registrasi ditetapkan oleh Menteri.</>,
									].map((text, i) => (
										<div key={i} className="bg-white rounded-lg p-3 shadow-sm border border-purple-100">
											<div className="flex items-start space-x-2.5">
												<div className="flex-shrink-0 w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
													{i + 1}
												</div>
												<p className="text-sm text-gray-700 leading-relaxed">{text}</p>
											</div>
										</div>
									))}
								</div>

								{/* Syarat Pembentukan */}
								<div className="pt-3 border-t border-purple-200">
									<h5 className="font-semibold text-purple-900 mb-2 flex items-center text-sm">
										<LuCheck className="w-4 h-4 mr-1.5" />
										Syarat Pembentukan
									</h5>
									<div className="space-y-2">
										<div className="bg-white rounded-lg p-3 shadow-sm border border-purple-100">
											<p className="text-sm text-gray-700 font-medium mb-2">Pembentukan Posyandu dengan memenuhi persyaratan:</p>
											<ol className="space-y-1 ml-3">
												{["Keberadaannya bermanfaat dan dibutuhkan masyarakat Desa/Kelurahan", "Memiliki kepengurusan yang tetap", "Memiliki sekretariat, tempat pelayanan, dan sarana pendukung lainnya yang bersifat tetap", "Tidak berafiliasi kepada partai politik"].map((s, i) => (
													<li key={i} className="flex items-start space-x-2 text-sm text-gray-700">
														<span className="text-purple-600 font-bold">{String.fromCharCode(97 + i)}.</span>
														<span>{s}</span>
													</li>
												))}
											</ol>
										</div>
										<div className="bg-white rounded-lg p-3 shadow-sm border border-purple-100">
											<div className="flex items-start space-x-2.5">
												<div className="flex-shrink-0 w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
												<p className="text-sm text-gray-700 leading-relaxed">Sekretariat, tempat pelayanan, dan sarana pendukung lainnya merupakan <strong>aset Desa/Kelurahan</strong>.</p>
											</div>
										</div>
										<div className="bg-white rounded-lg p-3 shadow-sm border border-purple-100">
											<div className="flex items-start space-x-2.5">
												<div className="flex-shrink-0 w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
												<p className="text-sm text-gray-700 leading-relaxed">Dalam hal Pemerintah Desa/Kelurahan tidak memiliki sekretariat, tempat pelayanan, dan sarana pendukung lainnya, dapat <strong>menggunakan fasilitas lainnya</strong>.</p>
											</div>
										</div>
									</div>
								</div>

								<div className="flex items-start space-x-2 bg-blue-100 rounded-lg p-3">
									<LuInfo className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
									<div>
										<p className="text-sm font-semibold text-blue-900">Peraturan Menteri Dalam Negeri Nomor 13 Tahun 2024</p>
										<p className="text-xs text-blue-700">Tentang Pos Pelayanan Terpadu</p>
									</div>
								</div>
							</div>
						)}
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
						className={`px-6 py-2 bg-gradient-to-r ${gradient} text-white rounded-lg hover:shadow-md disabled:opacity-50 transition-all flex items-center space-x-2`}
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

export default function KelembagaanList() {
	const { type, desaId: routeDesaId } = useParams(); // Get desaId from route params
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const queryDesaId = searchParams.get("desaId"); // Get desaId from query params
	const desaId = routeDesaId || queryDesaId; // Prioritize route param over query param
	const { user, isSuperAdmin, isAdminBidangPMD, isUserDesa, isKecamatan } = useAuth(); // Get user for role-based navigation
	const { isEditMode } = useEditMode();
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [addForm, setAddForm] = useState({ nomor: "", nama: "", alamat: "", produk_hukum_id: "" });
	const [showAddModal, setShowAddModal] = useState(false);
	const [activeTab, setActiveTab] = useState("aktif"); // aktif | nonaktif
	const [submitting, setSubmitting] = useState(false);
	const [expandedRwIds, setExpandedRwIds] = useState(new Set());
	const [showKetentuan, setShowKetentuan] = useState(false);
	const [produkHukumOptions, setProdukHukumOptions] = useState([]);
	const [phSearchTerm, setPhSearchTerm] = useState("");
	const [loadingPh, setLoadingPh] = useState(false);
	const [showPhDropdown, setShowPhDropdown] = useState(false);
	const [deletingId, setDeletingId] = useState(null);

	// Determine if add button should show
	// Kecamatan: view-only, no add
	const showAddButton =
		!isKecamatan?.() && (isSuperAdmin() || isAdminBidangPMD() || (isUserDesa() && isEditMode));

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
					case "lembaga-lainnya":
						res = await listLembagaLainnya();
						break;
					default:
						res = { data: { data: [] } };
				}

				if (mounted) {
					const data = res?.data?.data || [];
					setItems(data);
					// Default expand all RWs
					if (type === 'rw') {
						setExpandedRwIds(new Set(data.map(item => item.id)));
					}
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

	// Fetch produk hukum options when modal opens (for RW and Posyandu)
	useEffect(() => {
		if (!showAddModal || (type !== "rw" && type !== "posyandu" && type !== "lembaga-lainnya")) return;
		let mounted = true;
		const fetchProdukHukum = async () => {
			setLoadingPh(true);
			try {
				const res = await getProdukHukums({
					all: true,
					jenis: "Peraturan Desa,Peraturan Kepala Desa",
					status_peraturan: "berlaku",
				});
				if (mounted) {
					setProdukHukumOptions(res?.data?.data || []);
				}
			} catch (err) {
				console.error("Error fetching produk hukum:", err);
			} finally {
				if (mounted) setLoadingPh(false);
			}
		};
		fetchProdukHukum();
		return () => { mounted = false; };
	}, [showAddModal, type]);

	const handleCreate = async () => {
		if (submitting) return;

		setSubmitting(true);
		try {
			if (type === "rw") {
				if (!addForm.nomor.trim()) {
					alert("Nomor RW wajib diisi");
					return;
				}
				if (!/^\d{3}$/.test(addForm.nomor.trim())) {
					alert("Nomor RW harus 3 digit angka (contoh: 001)");
					return;
				}
				if (!addForm.produk_hukum_id) {
					alert("Produk Hukum Lembaga wajib dipilih");
					return;
				}
				await createRw({ nomor: addForm.nomor.trim(), alamat: addForm.alamat.trim(), produk_hukum_id: addForm.produk_hukum_id });
			} else if (type === "posyandu") {
				if (!addForm.nama.trim()) {
					alert("Nama Posyandu wajib diisi");
					return;
				}
				if (!addForm.produk_hukum_id) {
					alert("Produk Hukum Lembaga wajib dipilih");
					return;
				}
				await createPosyandu({ nama: addForm.nama.trim(), alamat: addForm.alamat.trim(), produk_hukum_id: addForm.produk_hukum_id });
			} else if (type === "lembaga-lainnya") {
				if (!addForm.produk_hukum_id) {
					alert("Produk Hukum Lembaga wajib dipilih");
					return;
				}
				if (!addForm.nama.trim()) {
					alert("Nama Lembaga wajib diisi");
					return;
				}
				await createLembagaLainnya({ nama: addForm.nama.trim(), alamat: addForm.alamat.trim(), produk_hukum_id: addForm.produk_hukum_id });
			}

			setShowAddModal(false);
			setAddForm({ nomor: "", nama: "", alamat: "", produk_hukum_id: "" });
			setPhSearchTerm("");
			setShowKetentuan(false);
			setShowPhDropdown(false);

			// Reload list
			let res;
			if (type === "rw") res = await listRw();
			else if (type === "posyandu") res = await listPosyandu();
			else if (type === "lembaga-lainnya") res = await listLembagaLainnya();
			setItems(res?.data?.data || []);
		} catch (error) {
			console.error("Error creating data:", error);
			alert("Gagal menyimpan data");
		} finally {
			setSubmitting(false);
		}
	};

	const handleDeleteKelembagaan = async (item, event) => {
		event.stopPropagation();

		if (!isSuperAdmin()) return;

		const itemName = type === "rw" ? `RW ${item.nomor}` : item.nama;
		const relatedText =
			type === "rw"
				? "RT dan pengurus yang terkait juga akan dihapus."
				: "Pengurus yang terkait juga akan dihapus.";

		const result = await Swal.fire({
			title: `Hapus ${itemName}?`,
			text: `Data akan dihapus permanen. ${relatedText}`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Ya, hapus",
			cancelButtonText: "Batal",
			confirmButtonColor: "#dc2626",
		});

		if (!result.isConfirmed) return;

		setDeletingId(item.id);
		try {
			if (type === "rw") {
				await deleteRw(item.id);
			} else if (type === "posyandu") {
				await deletePosyandu(item.id);
			} else if (type === "lembaga-lainnya") {
				await deleteLembagaLainnya(item.id);
			}

			setItems((prev) => prev.filter((current) => current.id !== item.id));

			await Swal.fire({
				icon: "success",
				title: "Berhasil",
				text: `${itemName} berhasil dihapus`,
				timer: 2000,
				showConfirmButton: false,
			});
		} catch (error) {
			console.error("Error deleting kelembagaan:", error);
			Swal.fire({
				icon: "error",
				title: "Gagal",
				text: error?.response?.data?.message || "Gagal menghapus kelembagaan",
			});
		} finally {
			setDeletingId(null);
		}
	};

	const handleDeleteRt = async (rt, rwId, event) => {
		event.stopPropagation();

		if (!isSuperAdmin()) return;

		const itemName = `RT ${rt.nomor}`;
		const result = await Swal.fire({
			title: `Hapus ${itemName}?`,
			text: "Data RT dan pengurus yang terkait akan dihapus permanen.",
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Ya, hapus",
			cancelButtonText: "Batal",
			confirmButtonColor: "#dc2626",
		});

		if (!result.isConfirmed) return;

		setDeletingId(rt.id);
		try {
			await deleteRt(rt.id);

			setItems((prev) =>
				prev.map((item) => {
					if (item.id !== rwId) return item;
					const rts = (item.rts || []).filter((current) => current.id !== rt.id);
					return {
						...item,
						rts,
						jumlah_rt: rts.length,
						rt_count: rts.length,
					};
				}),
			);

			await Swal.fire({
				icon: "success",
				title: "Berhasil",
				text: `${itemName} berhasil dihapus`,
				timer: 2000,
				showConfirmButton: false,
			});
		} catch (error) {
			console.error("Error deleting RT:", error);
			Swal.fire({
				icon: "error",
				title: "Gagal",
				text: error?.response?.data?.message || "Gagal menghapus RT",
			});
		} finally {
			setDeletingId(null);
		}
	};

	// Helper function to get base path based on user role
	const getBasePath = () => {
		if (user?.role === "desa") return "/desa";
		if (user?.role === "kecamatan") return "/kecamatan";
		return "/bidang/pmd"; // All internal DPMD staff
	};

	const basePath = getBasePath();

	const filteredItems = useMemo(() => {
		return (items || []).filter((item) => {
			// Filter by status
			const status = (item.status_kelembagaan || "aktif").toLowerCase();
			const statusMatch =
				activeTab === "aktif" ? status === "aktif" : status !== "aktif";

			// Filter by desaId if provided (for admin view)
			const desaMatch = !desaId || String(item.desa_id) === String(desaId);

			return statusMatch && desaMatch;
		});
	}, [items, activeTab, desaId]);

	// Validasi type parameter - RT tidak tersedia di sini, hanya di detail RW
	const validTypes = ["rw", "posyandu", "lembaga-lainnya"];
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

	const title = type === "rw" ? "RW" : type === "posyandu" ? "Posyandu" : "Lembaga Lainnya";

	// RT should only be managed from RW detail page via AnakLembagaCard
	if (type === "rt") {
		// Redirect to kelembagaan page if someone tries to access RT list directly
		navigate(`${basePath}/kelembagaan`);
		return null;
	}

	// Back navigation - handle admin & kecamatan routes
	const handleBack = () => {
		if (isKecamatan && isKecamatan()) {
			navigate("/kecamatan/kelembagaan");
		} else if (desaId) {
			navigate(`/bidang/pmd/kelembagaan/admin/${desaId}`);
		} else {
			navigate(`${basePath}/kelembagaan`);
		}
	};

	const getIcon = () => {
		switch (type) {
			case "rw":
				return LuBuilding;
			case "posyandu":
				return LuHeart;
			case "lembaga-lainnya":
				return LuBuilding;
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
			case "lembaga-lainnya":
				return "from-slate-500 to-slate-700";
			default:
				return "from-gray-500 to-gray-600";
		}
	};

	const IconComponent = getIcon();

	return (
		<div className="p-6 space-y-4  min-h-screen">
			{/* Breadcrumb */}
			<div className="sticky top-0 z-10 p-2 bg-white rounded-md shadow-md">
				<div className="flex items-center justify-between">
					<nav className="flex items-center space-x-2 text-sm">
						<Link
							to={`${basePath}/kelembagaan`}
							className="flex items-center text-gray-500 hover:text-indigo-600 transition-colors"
						>
							<FaHome className="mr-1" />
							Dashboard Kelembagaan
						</Link>
						
						<FaChevronRight className="text-gray-400 text-xs" />

						{/* Admin/Kecamatan: Show Desa name and link */}
						{desaId && filteredItems.length > 0 && (
							<>
								<Link
									to={isKecamatan?.() ? "/kecamatan/kelembagaan" : `/bidang/pmd/kelembagaan/admin/${desaId}`}
									className="text-gray-500 hover:text-indigo-600 transition-colors"
								>
									{filteredItems[0]?.desas?.nama ||
										filteredItems[0]?.desa?.nama ||
										"Desa"}
								</Link>
								<FaChevronRight className="text-gray-400 text-xs" />
							</>
						)}

						<span className="text-gray-900 font-medium">{title}</span>
					</nav>

					{/* Status Badge */}
					<span
						className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
							isEditMode
								? "bg-green-100 text-green-700 border border-green-300"
								: "bg-red-100 text-red-700 border border-red-300"
						}`}
					>
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
								: type === "posyandu"
									? "Kelola Pos Pelayanan Terpadu"
									: "Kelola Lembaga Kemasyarakatan Lainnya"}
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
									const status = (
										item.status_kelembagaan || "aktif"
									).toLowerCase();
								const isVerified = item.status_verifikasi === "verified";
								const isDitolak = item.status_verifikasi === "ditolak";
								const isRwType = type === "rw";
								const isExpanded = isRwType && expandedRwIds.has(item.id);
								const hasRts = isRwType && item.rts && item.rts.length > 0;

								return (
								<div
									key={item.id}
									className={`bg-white flex flex-col rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border group overflow-hidden ${
										isVerified
											? "border-gray-100 hover:border-blue-200"
											: isDitolak
												? "border-red-100 hover:border-red-200"
												: "border-gray-200 hover:border-gray-300"
									}`}
								>
											{/* Gradient Bar */}
											<div
												className={`h-1.5 bg-gradient-to-r ${
													isDitolak
														? "from-red-400 to-red-500"
														: !isVerified
															? "from-gray-300 to-gray-400"
															: type === "rw"
																? "from-blue-400 to-blue-500"
																: type === "posyandu"
																	? "from-purple-500 to-purple-700"
																	: type === "pkk"
																		? "from-pink-500 to-rose-500"
																		: "from-gray-400 to-gray-500"
												} rounded-t-2xl`}
											></div>

											{/* Card Content Wrapper */}
											<div
												className="flex justify-between p-6 cursor-pointer"
												onClick={() =>
													navigate(
														isKecamatan?.()
															? `/kecamatan/kelembagaan/${desaId}/${type}/${item.id}`
															: `${basePath}/kelembagaan/${type}/${item.id}`
													)
												}
											>
												{/* Card Header */}

												<div className="flex items-center justify-between ">
													<div className="flex items-center space-x-3">
														<div
															className={`p-3 bg-gradient-to-br ${isVerified ? getGradient() : "from-gray-400 to-gray-500"} rounded-xl group-hover:scale-110 transition-transform`}
														>
															<IconComponent className="w-6 h-6 text-white" />
														</div>
														<div>
															<h4 className="font-bold text-lg text-gray-800">
																{type === "rw"
																	? `RW ${item.nomor}`
																	: item.nama}
															</h4>
															<div className="flex items-center space-x-2 flex-wrap gap-1">
																<span
																	className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
																		status === "aktif"
																			? "bg-green-100 text-green-700"
																			: "bg-red-100 text-red-700"
																	}`}
																>
																	{status === "aktif" ? "Aktif" : "Nonaktif"}
																</span>
																{isVerified ? (
																	<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">
																		<LuShieldCheck className="w-3 h-3" />
																		Terverifikasi
																	</span>
																) : isDitolak ? (
																	<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
																		<LuX className="w-3 h-3" />
																		Verifikasi Ditolak
																	</span>
																) : (
																	<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
																		<LuTriangleAlert className="w-3 h-3" />
																		Belum Terverifikasi
																	</span>
																)}
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
																	<span className="text-sm text-white">
																		Ketua
																	</span>
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

														{isSuperAdmin() && (
															<button
																type="button"
																onClick={(event) => handleDeleteKelembagaan(item, event)}
																disabled={deletingId === item.id}
																className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
																title={`Hapus ${title}`}
															>
																<LuTrash2 className="w-3.5 h-3.5" />
																<span>{deletingId === item.id ? "Menghapus..." : "Hapus"}</span>
															</button>
														)}
													</div>
												</div>
												{/* End Card Content Wrapper */}

											{/* RW Accordion Toggle & RT List */}
											{isRwType && hasRts && (
												<>
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															setExpandedRwIds(prev => {
														const next = new Set(prev);
														if (isExpanded) next.delete(item.id);
														else next.add(item.id);
														return next;
													});
														}}
														className="w-full flex items-center justify-between px-6 py-2.5 bg-gray-50 border-t border-gray-100 hover:bg-blue-50 transition-colors text-sm text-gray-600"
													>
														<span className="flex items-center gap-2">
															<LuBuilding2 className="w-4 h-4 text-blue-500" />
															<span className="font-medium">{item.rts.length} RT</span>
														</span>
														<LuChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
													</button>

													{isExpanded && (
														<div className="border-t border-gray-100 bg-gray-50/50 divide-y divide-gray-100">
															{item.rts.map((rt) => {
																const rtVerified = rt.status_verifikasi === "verified";
																const rtDitolak = rt.status_verifikasi === "ditolak";
																const rtStatus = (rt.status_kelembagaan || "aktif").toLowerCase();
																return (
																	<div
																		key={rt.id}
																		className="flex items-center justify-between px-6 py-3 hover:bg-blue-50 cursor-pointer transition-colors"
																		onClick={() =>
																			navigate(
																				isKecamatan?.()
																					? `/kecamatan/kelembagaan/${desaId}/rt/${rt.id}`
																					: `${basePath}/kelembagaan/rt/${rt.id}`
																			)
																		}
																	>
																		<div className="flex items-center gap-3">
																			<div className={`w-8 h-8 rounded-lg flex items-center justify-center ${rtVerified ? "bg-blue-100" : rtDitolak ? "bg-red-100" : "bg-gray-100"}`}>
																				<LuUser className={`w-4 h-4 ${rtVerified ? "text-blue-600" : rtDitolak ? "text-red-600" : "text-gray-500"}`} />
																			</div>
																			<div>
																				<span className="text-sm font-semibold text-gray-800">RT {rt.nomor}</span>
																				<div className="flex items-center gap-1.5 mt-0.5">
																					<span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
																						rtStatus === "aktif" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
																					}`}>
																						{rtStatus === "aktif" ? "Aktif" : "Nonaktif"}
																					</span>
																					{rtVerified ? (
																						<span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-emerald-100 text-emerald-700">
																							<LuShieldCheck className="w-2.5 h-2.5" />
																							Terverifikasi
																						</span>
																					) : rtDitolak ? (
																						<span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-red-100 text-red-700">
																							<LuX className="w-2.5 h-2.5" />
																							Ditolak
																						</span>
																					) : (
																						<span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 text-amber-700">
																							<LuTriangleAlert className="w-2.5 h-2.5" />
																							Belum
																						</span>
																					)}
																				</div>
																			</div>
																		</div>
																		<div className="flex items-center gap-2">
																			{rt.ketua_nama ? (
																				<span className="text-xs text-gray-500">{rt.ketua_nama}</span>
																			) : (
																				<span className="text-xs text-gray-400 italic">Belum ada ketua</span>
																			)}
																			{isSuperAdmin() && (
																				<button
																					type="button"
																					onClick={(event) => handleDeleteRt(rt, item.id, event)}
																					disabled={deletingId === rt.id}
																					className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-red-200 bg-red-50 text-[10px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
																					title="Hapus RT"
																				>
																					<LuTrash2 className="w-3 h-3" />
																					<span>{deletingId === rt.id ? "..." : "Hapus"}</span>
																				</button>
																			)}
																			<FaChevronRight className="w-3 h-3 text-gray-400" />
																		</div>
																	</div>
																);
															})}
														</div>
													)}
												</>
											)}
											</div>
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
						desaId={desaId ? parseInt(desaId) : null}
					/>
					</div>
				</div>
			</div>

			<SimpleModal
				isOpen={showAddModal}
				title={type === "rw" ? "Pembentukan RW" : type === "posyandu" ? "Pembentukan Posyandu" : "Tambah Lembaga Lainnya"}
				onClose={() => {
					if (!submitting) {
						setShowAddModal(false);
						setShowKetentuan(false);
						setPhSearchTerm("");
						setShowPhDropdown(false);
					}
				}}
				onSubmit={handleCreate}
				type={type}
				submitting={submitting}
				showKetentuan={showKetentuan}
				setShowKetentuan={setShowKetentuan}
				gradient={getGradient()}
				IconComponent={IconComponent}
			>
				{type === "rw" ? (
					<div className="space-y-4">
						{/* Produk Hukum Lembaga - Paling Atas */}
						<div>
							<label className="block text-sm font-medium mb-1 text-gray-700">
								Produk Hukum Lembaga <span className="text-red-500">*</span>
							</label>
							<p className="text-xs text-gray-500 mb-2">
								Pilih Perdes/Perkades yang masih berlaku sebagai dasar hukum pembentukan RW
							</p>
							<div className="relative">
								<button
									type="button"
									className={`w-full text-left border rounded-lg px-3 py-2.5 text-sm flex items-center justify-between transition-colors ${addForm.produk_hukum_id ? "border-blue-300 bg-blue-50" : "border-gray-300 bg-white"} ${submitting ? "opacity-50 cursor-not-allowed" : "hover:border-blue-400"}`}
									onClick={() => !submitting && setShowPhDropdown((v) => !v)}
									disabled={submitting}
								>
									{addForm.produk_hukum_id ? (
										<div className="flex-1 min-w-0">
											<p className="font-medium text-blue-700 truncate">{produkHukumOptions.find((p) => p.id === addForm.produk_hukum_id)?.judul || "—"}</p>
											<p className="text-xs text-blue-500 mt-0.5">{(produkHukumOptions.find((p) => p.id === addForm.produk_hukum_id)?.jenis || "").replace(/_/g, " ")} — No. {produkHukumOptions.find((p) => p.id === addForm.produk_hukum_id)?.nomor}</p>
										</div>
									) : (
										<span className="text-gray-400">Pilih produk hukum...</span>
									)}
									<LuChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 ml-2 transition-transform ${showPhDropdown ? "rotate-180" : ""}`} />
								</button>
								{showPhDropdown && (
									<div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
										<div className="p-2 border-b border-gray-100">
											<div className="relative">
												<LuSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
												<input
													className="w-full border border-gray-200 rounded-md pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
													placeholder="Cari judul atau nomor..."
													value={phSearchTerm}
													onChange={(e) => setPhSearchTerm(e.target.value)}
													autoFocus
												/>
											</div>
										</div>
										<div className="max-h-48 overflow-y-auto">
											{loadingPh ? (
												<div className="p-3 text-center text-sm text-gray-500">
													<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mx-auto mb-1"></div>
													Memuat...
												</div>
											) : produkHukumOptions.filter((ph) =>
												!phSearchTerm || (ph.judul || "").toLowerCase().includes(phSearchTerm.toLowerCase()) || (ph.nomor || "").toLowerCase().includes(phSearchTerm.toLowerCase())
											).length === 0 ? (
												<div className="p-3 text-center text-sm text-gray-500">
													{phSearchTerm ? "Tidak ditemukan" : "Belum ada Perdes/Perkades berlaku"}
												</div>
											) : (
												produkHukumOptions
													.filter((ph) =>
														!phSearchTerm || (ph.judul || "").toLowerCase().includes(phSearchTerm.toLowerCase()) || (ph.nomor || "").toLowerCase().includes(phSearchTerm.toLowerCase())
													)
													.map((ph) => (
														<button
															key={ph.id}
															type="button"
															className={`w-full text-left px-3 py-2 border-b border-gray-50 last:border-b-0 hover:bg-blue-50 transition-colors ${addForm.produk_hukum_id === ph.id ? "bg-blue-50" : ""}`}
															onClick={() => {
																setAddForm((f) => ({ ...f, produk_hukum_id: ph.id }));
																setShowPhDropdown(false);
																setPhSearchTerm("");
															}}
														>
															<div className="flex items-center justify-between">
																<div className="flex-1 min-w-0">
																	<p className={`text-sm font-medium truncate ${addForm.produk_hukum_id === ph.id ? "text-blue-700" : "text-gray-900"}`}>{ph.judul}</p>
																	<p className="text-xs text-gray-500">{(ph.jenis || "").replace(/_/g, " ")} — No. {ph.nomor}</p>
																</div>
																{addForm.produk_hukum_id === ph.id && <LuCheck className="w-4 h-4 text-blue-600 ml-2 flex-shrink-0" />}
															</div>
														</button>
													))
											)}
										</div>
									</div>
								)}
							</div>
							{!addForm.produk_hukum_id && (
								<p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
									<LuLock className="w-3.5 h-3.5" />
									Pilih produk hukum terlebih dahulu untuk mengisi data di bawah
								</p>
							)}
						</div>

						{/* Nomor RW */}
						<div className={!addForm.produk_hukum_id ? "opacity-50 pointer-events-none" : ""}>
							<label htmlFor="modal-rw-nomor" className="block text-sm font-medium mb-1 text-gray-700">
								Nomor RW <span className="text-red-500">*</span>
							</label>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<LuBuilding className="w-5 h-5 text-gray-400" />
								</div>
								<input
									className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
									name="nomor"
									id="modal-rw-nomor"
									autoComplete="off"
									inputMode="numeric"
									maxLength={3}
									value={addForm.nomor}
									onChange={(e) => {
										const val = e.target.value.replace(/\D/g, "").slice(0, 3);
										setAddForm((f) => ({ ...f, nomor: val }));
									}}
									placeholder="Contoh: 001"
									disabled={submitting || !addForm.produk_hukum_id}
								/>
							</div>
							<p className="text-xs text-gray-500 mt-1">Hanya 3 digit angka (contoh: 001, 012, 100)</p>
						</div>

						{/* Alamat */}
						<div className={!addForm.produk_hukum_id ? "opacity-50 pointer-events-none" : ""}>
							<label htmlFor="modal-rw-alamat" className="block text-sm font-medium mb-1 text-gray-700">
								Alamat Kelembagaan
							</label>
							<div className="relative">
								<div className="absolute top-2.5 left-0 pl-3 pointer-events-none">
									<LuMapPin className="w-5 h-5 text-gray-400" />
								</div>
								<textarea
									className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 resize-none uppercase"
									name="alamat"
									id="modal-rw-alamat"
									autoComplete="off"
									rows={2}
									value={addForm.alamat}
									onChange={(e) => setAddForm((f) => ({ ...f, alamat: e.target.value.toUpperCase() }))}
									placeholder="Masukkan alamat sekretariat memuat dusun/kampung/jalan/gang atau sebutan lain"
									disabled={submitting || !addForm.produk_hukum_id}
								/>
							</div>
						</div>
					</div>
				) : type === "lembaga-lainnya" ? (
					<div className="space-y-4">
						{/* Produk Hukum Lembaga */}
						<div>
							<label className="block text-sm font-medium mb-1 text-gray-700">
								Produk Hukum Lembaga <span className="text-red-500">*</span>
							</label>
							<p className="text-xs text-gray-500 mb-2">
								Pilih Perdes/Perkades yang masih berlaku sebagai dasar hukum pembentukan lembaga
							</p>
							<div className="relative">
								<button
									type="button"
									className={`w-full text-left border rounded-lg px-3 py-2.5 text-sm flex items-center justify-between transition-colors ${addForm.produk_hukum_id ? "border-slate-300 bg-slate-50" : "border-gray-300 bg-white"} ${submitting ? "opacity-50 cursor-not-allowed" : "hover:border-slate-400"}`}
									onClick={() => !submitting && setShowPhDropdown((v) => !v)}
									disabled={submitting}
								>
									{addForm.produk_hukum_id ? (
										<div className="flex-1 min-w-0">
											<p className="font-medium text-slate-700 truncate">{produkHukumOptions.find((p) => p.id === addForm.produk_hukum_id)?.judul || "—"}</p>
											<p className="text-xs text-slate-500 mt-0.5">{(produkHukumOptions.find((p) => p.id === addForm.produk_hukum_id)?.jenis || "").replace(/_/g, " ")} — No. {produkHukumOptions.find((p) => p.id === addForm.produk_hukum_id)?.nomor}</p>
										</div>
									) : (
										<span className="text-gray-400">Pilih produk hukum...</span>
									)}
									<LuChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 ml-2 transition-transform ${showPhDropdown ? "rotate-180" : ""}`} />
								</button>
								{showPhDropdown && (
									<div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
										<div className="p-2 border-b border-gray-100">
											<div className="relative">
												<LuSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
												<input
													className="w-full border border-gray-200 rounded-md pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
													placeholder="Cari judul atau nomor..."
													value={phSearchTerm}
													onChange={(e) => setPhSearchTerm(e.target.value)}
													autoFocus
												/>
											</div>
										</div>
										<div className="max-h-48 overflow-y-auto">
											{loadingPh ? (
												<div className="p-3 text-center text-sm text-gray-500">
													<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-500 mx-auto mb-1"></div>
													Memuat...
												</div>
											) : produkHukumOptions.filter((ph) =>
												!phSearchTerm || (ph.judul || "").toLowerCase().includes(phSearchTerm.toLowerCase()) || (ph.nomor || "").toLowerCase().includes(phSearchTerm.toLowerCase())
											).length === 0 ? (
												<div className="p-3 text-center text-sm text-gray-500">
													{phSearchTerm ? "Tidak ditemukan" : "Belum ada Perdes/Perkades berlaku"}
												</div>
											) : (
												produkHukumOptions
													.filter((ph) =>
														!phSearchTerm || (ph.judul || "").toLowerCase().includes(phSearchTerm.toLowerCase()) || (ph.nomor || "").toLowerCase().includes(phSearchTerm.toLowerCase())
													)
													.map((ph) => (
														<button
															key={ph.id}
															type="button"
															className={`w-full text-left px-3 py-2 border-b border-gray-50 last:border-b-0 hover:bg-slate-50 transition-colors ${addForm.produk_hukum_id === ph.id ? "bg-slate-50" : ""}`}
															onClick={() => {
																setAddForm((f) => ({ ...f, produk_hukum_id: ph.id }));
																setShowPhDropdown(false);
																setPhSearchTerm("");
															}}
														>
															<div className="flex items-center justify-between">
																<div className="flex-1 min-w-0">
																	<p className={`text-sm font-medium truncate ${addForm.produk_hukum_id === ph.id ? "text-slate-700" : "text-gray-900"}`}>{ph.judul}</p>
																	<p className="text-xs text-gray-500">{(ph.jenis || "").replace(/_/g, " ")} — No. {ph.nomor}</p>
																</div>
																{addForm.produk_hukum_id === ph.id && <LuCheck className="w-4 h-4 text-slate-600 ml-2 flex-shrink-0" />}
															</div>
														</button>
													))
											)}
										</div>
									</div>
								)}
							</div>
							{!addForm.produk_hukum_id && (
								<p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
									<LuLock className="w-3.5 h-3.5" />
									Pilih produk hukum terlebih dahulu untuk mengisi data di bawah
								</p>
							)}
						</div>

						{/* Nama Lembaga */}
						<div className={!addForm.produk_hukum_id ? "opacity-50 pointer-events-none" : ""}>
							<label
								htmlFor="modal-lembaga-nama"
								className="block text-sm font-medium mb-1 text-gray-700"
							>
								Nama Lembaga <span className="text-red-500">*</span>
							</label>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<LuBuilding className="w-5 h-5 text-gray-400" />
								</div>
								<input
									className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 disabled:bg-gray-50 uppercase"
									name="nama"
									id="modal-lembaga-nama"
									autoComplete="off"
									value={addForm.nama}
									onChange={(e) =>
										setAddForm((f) => ({ ...f, nama: e.target.value.toUpperCase() }))
									}
									placeholder="Contoh: Forum Komunikasi Desa, Kelompok Tani"
									disabled={submitting || !addForm.produk_hukum_id}
								/>
							</div>
						</div>

						{/* Alamat */}
						<div className={!addForm.produk_hukum_id ? "opacity-50 pointer-events-none" : ""}>
							<label htmlFor="modal-lembaga-alamat" className="block text-sm font-medium mb-1 text-gray-700">
								Alamat Kelembagaan
							</label>
							<div className="relative">
								<div className="absolute top-2.5 left-0 pl-3 pointer-events-none">
									<LuMapPin className="w-5 h-5 text-gray-400" />
								</div>
								<textarea
									className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 disabled:bg-gray-50 resize-none uppercase"
									name="alamat"
									id="modal-lembaga-alamat"
									autoComplete="off"
									rows={2}
									value={addForm.alamat}
									onChange={(e) => setAddForm((f) => ({ ...f, alamat: e.target.value.toUpperCase() }))}
									placeholder="Masukkan alamat sekretariat memuat dusun/kampung/jalan/gang atau sebutan lain"
									disabled={submitting || !addForm.produk_hukum_id}
								/>
							</div>
						</div>
					</div>
				) : (
					<div className="space-y-4">
						{/* Produk Hukum Lembaga - Paling Atas */}
						<div>
							<label className="block text-sm font-medium mb-1 text-gray-700">
								Produk Hukum Lembaga <span className="text-red-500">*</span>
							</label>
							<p className="text-xs text-gray-500 mb-2">
								Pilih Perdes/Perkades yang masih berlaku sebagai dasar hukum pembentukan Posyandu
							</p>
							<div className="relative">
								<button
									type="button"
									className={`w-full text-left border rounded-lg px-3 py-2.5 text-sm flex items-center justify-between transition-colors ${addForm.produk_hukum_id ? "border-purple-300 bg-purple-50" : "border-gray-300 bg-white"} ${submitting ? "opacity-50 cursor-not-allowed" : "hover:border-purple-400"}`}
									onClick={() => !submitting && setShowPhDropdown((v) => !v)}
									disabled={submitting}
								>
									{addForm.produk_hukum_id ? (
										<div className="flex-1 min-w-0">
											<p className="font-medium text-purple-700 truncate">{produkHukumOptions.find((p) => p.id === addForm.produk_hukum_id)?.judul || "—"}</p>
											<p className="text-xs text-purple-500 mt-0.5">{(produkHukumOptions.find((p) => p.id === addForm.produk_hukum_id)?.jenis || "").replace(/_/g, " ")} — No. {produkHukumOptions.find((p) => p.id === addForm.produk_hukum_id)?.nomor}</p>
										</div>
									) : (
										<span className="text-gray-400">Pilih produk hukum...</span>
									)}
									<LuChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 ml-2 transition-transform ${showPhDropdown ? "rotate-180" : ""}`} />
								</button>
								{showPhDropdown && (
									<div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
										<div className="p-2 border-b border-gray-100">
											<div className="relative">
												<LuSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
												<input
													className="w-full border border-gray-200 rounded-md pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
													placeholder="Cari judul atau nomor..."
													value={phSearchTerm}
													onChange={(e) => setPhSearchTerm(e.target.value)}
													autoFocus
												/>
											</div>
										</div>
										<div className="max-h-48 overflow-y-auto">
											{loadingPh ? (
												<div className="p-3 text-center text-sm text-gray-500">
													<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500 mx-auto mb-1"></div>
													Memuat...
												</div>
											) : produkHukumOptions.filter((ph) =>
												!phSearchTerm || (ph.judul || "").toLowerCase().includes(phSearchTerm.toLowerCase()) || (ph.nomor || "").toLowerCase().includes(phSearchTerm.toLowerCase())
											).length === 0 ? (
												<div className="p-3 text-center text-sm text-gray-500">
													{phSearchTerm ? "Tidak ditemukan" : "Belum ada Perdes/Perkades berlaku"}
												</div>
											) : (
												produkHukumOptions
													.filter((ph) =>
														!phSearchTerm || (ph.judul || "").toLowerCase().includes(phSearchTerm.toLowerCase()) || (ph.nomor || "").toLowerCase().includes(phSearchTerm.toLowerCase())
													)
													.map((ph) => (
														<button
															key={ph.id}
															type="button"
															className={`w-full text-left px-3 py-2 border-b border-gray-50 last:border-b-0 hover:bg-purple-50 transition-colors ${addForm.produk_hukum_id === ph.id ? "bg-purple-50" : ""}`}
															onClick={() => {
																setAddForm((f) => ({ ...f, produk_hukum_id: ph.id }));
																setShowPhDropdown(false);
																setPhSearchTerm("");
															}}
														>
															<div className="flex items-center justify-between">
																<div className="flex-1 min-w-0">
																	<p className={`text-sm font-medium truncate ${addForm.produk_hukum_id === ph.id ? "text-purple-700" : "text-gray-900"}`}>{ph.judul}</p>
																	<p className="text-xs text-gray-500">{(ph.jenis || "").replace(/_/g, " ")} — No. {ph.nomor}</p>
																</div>
																{addForm.produk_hukum_id === ph.id && <LuCheck className="w-4 h-4 text-purple-600 ml-2 flex-shrink-0" />}
															</div>
														</button>
													))
											)}
										</div>
									</div>
								)}
							</div>
							{!addForm.produk_hukum_id && (
								<p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
									<LuLock className="w-3.5 h-3.5" />
									Pilih produk hukum terlebih dahulu untuk mengisi data di bawah
								</p>
							)}
						</div>

						{/* Nama Posyandu */}
						<div className={!addForm.produk_hukum_id ? "opacity-50 pointer-events-none" : ""}>
							<label htmlFor="modal-posyandu-nama" className="block text-sm font-medium mb-1 text-gray-700">
								Nama Posyandu <span className="text-red-500">*</span>
							</label>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<LuHeart className="w-5 h-5 text-gray-400" />
								</div>
								<input
									className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-50 uppercase"
									name="nama"
									id="modal-posyandu-nama"
									autoComplete="off"
									value={addForm.nama}
									onChange={(e) => setAddForm((f) => ({ ...f, nama: e.target.value.toUpperCase() }))}
									placeholder="Masukkan nama Posyandu (contoh: Posyandu Mawar)"
									disabled={submitting || !addForm.produk_hukum_id}
								/>
							</div>
							<p className="text-xs text-gray-500 mt-1">Boleh huruf dan angka</p>
						</div>

						{/* Alamat */}
						<div className={!addForm.produk_hukum_id ? "opacity-50 pointer-events-none" : ""}>
							<label htmlFor="modal-posyandu-alamat" className="block text-sm font-medium mb-1 text-gray-700">
								Alamat Kelembagaan
							</label>
							<div className="relative">
								<div className="absolute top-2.5 left-0 pl-3 pointer-events-none">
									<LuMapPin className="w-5 h-5 text-gray-400" />
								</div>
								<textarea
									className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-50 resize-none uppercase"
									name="alamat"
									id="modal-posyandu-alamat"
									autoComplete="off"
									rows={2}
									value={addForm.alamat}
									onChange={(e) => setAddForm((f) => ({ ...f, alamat: e.target.value.toUpperCase() }))}
									placeholder="Masukkan alamat sekretariat / lokasi Posyandu memuat dusun/kampung/jalan/gang atau sebutan lain"
									disabled={submitting || !addForm.produk_hukum_id}
								/>
							</div>
						</div>
					</div>
				)}
			</SimpleModal>
		</div>
	);
}
