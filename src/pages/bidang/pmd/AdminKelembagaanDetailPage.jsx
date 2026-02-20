import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Swal from "sweetalert2";
import {
	LuArrowLeft,
	LuBuilding2,
	LuUsers,
	LuHeart,
	LuShield,
	LuSprout,
	LuMapPin,
	LuLoader,
	LuChevronRight,
	LuEye,
	LuUserCheck,
	LuPlus,
	LuCircleAlert,
	LuX,
	LuLock,
	LuLockOpen,
} from "react-icons/lu";
import { useAuth } from "../../../context/AuthContext";
import { useEditMode } from "../../../context/EditModeContext";
import { getDesaKelembagaanAll } from "../../../api/kelembagaanApi";
import { FaChevronRight, FaHome } from "react-icons/fa";

/**
 * AdminKelembagaanDetailPage - Admin PMD mengakses detail kelembagaan desa
 * Role protection sudah dilakukan di App.jsx routing
 */
const AdminKelembagaanDetailPage = () => {
	const { desaId } = useParams();
	const navigate = useNavigate();
	const { user } = useAuth();
	const { isEditMode, toggleEditMode } = useEditMode();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [desaInfo, setDesaInfo] = useState(null);
	const [kelembagaanList, setKelembagaanList] = useState([]);
	const [modalConfig, setModalConfig] = useState({
		isOpen: false,
		type: null,
		name: "",
		icon: null,
		color: "",
	});
	const [creatingLembaga, setCreatingLembaga] = useState(false);

	// Check if user can toggle edit mode
	const canToggleEdit = ["superadmin"].includes(user?.role);

	const fetchDesaKelembagaan = React.useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			
			const response = await getDesaKelembagaanAll(desaId);
			
			console.log("API Response:", response); // Debug

			setDesaInfo(response.data.desa);

			// Buat list kelembagaan yang tersedia untuk navigasi
			const kelembagaanItems = [];
			const rwData = response.data.kelembagaan.rw || [];
			const posyanduData = response.data.kelembagaan.posyandu || [];

			// RW - Tampilkan card summary
			kelembagaanItems.push({
				type: "rw",
				id: null,
				name: "RW / RT",
				count: rwData.length,
				totalRT: rwData.reduce((sum, rw) => sum + (rw.rt_count || 0), 0),
				isCollection: true,
				isEmpty: rwData.length === 0,
				icon: LuBuilding2,
				color: "from-blue-500 to-indigo-600",
				data: rwData,
			});

			// Posyandu - Tampilkan card summary
			kelembagaanItems.push({
				type: "posyandu",
				id: null,
				name: "Posyandu",
				count: posyanduData.length,
				isCollection: true,
				isEmpty: posyanduData.length === 0,
				icon: LuHeart,
				color: "from-pink-500 to-red-600",
				data: posyanduData,
			});

			// Karang Taruna - Single entity
			const karangTaruna = response.data.kelembagaan.karang_taruna;
			kelembagaanItems.push({
				type: "karang-taruna",
				id: karangTaruna?.id || null,
				name: karangTaruna?.nama || "Karang Taruna",
				isCollection: false,
				isEmpty: !karangTaruna,
				icon: LuUsers,
				color: "from-purple-500 to-indigo-600",
				data: karangTaruna,
			});

			// LPM - Single entity
			const lpm = response.data.kelembagaan.lpm;
			kelembagaanItems.push({
				type: "lpm",
				id: lpm?.id || null,
				name: lpm?.nama || "LPM (Lembaga Pemberdayaan Masyarakat)",
				isCollection: false,
				isEmpty: !lpm,
				icon: LuUserCheck,
				color: "from-gray-500 to-gray-700",
				data: lpm,
			});

			// Satlinmas - Single entity
			const satlinmas = response.data.kelembagaan.satlinmas;
			kelembagaanItems.push({
				type: "satlinmas",
				id: satlinmas?.id || null,
				name: satlinmas?.nama || "Satlinmas",
				isCollection: false,
				isEmpty: !satlinmas,
				icon: LuShield,
				color: "from-green-500 to-emerald-600",
				data: satlinmas,
			});

			// PKK - Single entity
			const pkk = response.data.kelembagaan.pkk;
			kelembagaanItems.push({
				type: "pkk",
				id: pkk?.id || null,
				name: pkk?.nama || "PKK (Pemberdayaan Kesejahteraan Keluarga)",
				isCollection: false,
				isEmpty: !pkk,
				icon: LuSprout,
				color: "from-emerald-500 to-green-600",
				data: pkk,
			});

			setKelembagaanList(kelembagaanItems);
		} catch (err) {
			console.error("Error fetching kelembagaan data:", err);
			setError(err.message || "Gagal memuat data kelembagaan");
		} finally {
			setLoading(false);
		}
	}, [desaId]);

	useEffect(() => {
		fetchDesaKelembagaan();
	}, [fetchDesaKelembagaan]);
	
	// Helper function to get base path based on user role
	const getBasePath = () => {
		if (user?.role === "desa") {
			return "/desa";
		} else if (
			user?.role === "superadmin" ||
			user?.role === "kepala_dinas" ||
			(user?.role === "kepala_bidang" && user?.bidang_id === 5) ||
			(user?.role === "pegawai" && user?.bidang_id === 5)
		) {
			return "/bidang/pmd";
		}
		return "/desa"; // Default fallback
	};

	const basePath = getBasePath();

	const handleToggleEditMode = async () => {
		try {
			// Show loading
			Swal.fire({
				title: 'Memproses...',
				text: 'Mengubah mode edit',
				allowOutsideClick: false,
				allowEscapeKey: false,
				didOpen: () => {
					Swal.showLoading();
				}
			});

			await toggleEditMode();

			// Show success
			Swal.fire({
				icon: 'success',
				title: 'Berhasil!',
				text: `Mode edit ${!isEditMode ? 'diaktifkan' : 'dinonaktifkan'}`,
				timer: 2000,
				showConfirmButton: false
			});
		} catch (error) {
			console.error('Error toggling edit mode:', error);
			Swal.fire({
				icon: 'error',
				title: 'Gagal!',
				text: error.response?.data?.message || error.message || 'Gagal mengubah mode edit. Silakan coba lagi.',
				confirmButtonColor: '#3b82f6'
			});
		}
	};

	const handleKelembagaanClick = (item) => {
		// Untuk collection (RW, Posyandu), selalu bisa diklik - navigate ke list page
		if (item.isCollection) {
			// Navigate ke list page dengan filter desaId
			navigate(`/bidang/pmd/kelembagaan/admin/${desaId}/${item.type}`);
			return;
		}

		// Untuk single entity yang belum terbentuk, buka modal pembentukan
		if (item.isEmpty && !item.isCollection) {
			handleOpenModal(item);
			return;
		}

		// Untuk single entity yang sudah terbentuk, navigate ke detail page
		if (!item.isCollection && item.id) {
			navigate(`/bidang/pmd/kelembagaan/${item.type}/${item.id}`);
		}
	};

	const handleOpenModal = (item) => {
		setModalConfig({
			isOpen: true,
			type: item.type,
			name: item.name,
			icon: item.icon,
			color: item.color,
		});
	};

	const handleCloseModal = () => {
		setModalConfig({
			isOpen: false,
			type: null,
			name: "",
			icon: null,
			color: "",
		});
	};

	const handleConfirmCreate = async () => {
		try {
			setCreatingLembaga(true);
			
			// Import dynamic based on type
			let createFunction;
			switch (modalConfig.type) {
				case 'karang-taruna': {
					const { createKarangTarunaByAdmin } = await import("../../../api/kelembagaanApi");
					createFunction = createKarangTarunaByAdmin;
					break;
				}
				case 'lpm': {
					const { createLpmByAdmin } = await import("../../../api/kelembagaanApi");
					createFunction = createLpmByAdmin;
					break;
				}
				case 'satlinmas': {
					const { createSatlinmasByAdmin } = await import("../../../api/kelembagaanApi");
					createFunction = createSatlinmasByAdmin;
					break;
				}
				case 'pkk': {
					const { createPkkByAdmin } = await import("../../../api/kelembagaanApi");
					createFunction = createPkkByAdmin;
					break;
				}
				default:
					throw new Error('Tipe lembaga tidak dikenali');
			}

			// Call API dengan desaId
			await createFunction(desaId, {
				nama: modalConfig.name,
			});

			// Refresh data
			await fetchDesaKelembagaan();
			
			handleCloseModal();
		} catch (err) {
			console.error("Error creating lembaga:", err);
			alert(err.message || "Gagal membentuk lembaga");
		} finally {
			setCreatingLembaga(false);
		}
	};

	const handleBackToList = () => {
		navigate("/bidang/pmd/kelembagaan");
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<LuLoader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
					<p className="text-gray-600">Memuat data kelembagaan...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center max-w-md">
					<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
						<h3 className="text-lg font-medium text-red-800 mb-2">
							Error Loading Data
						</h3>
						<p className="text-red-600">{error}</p>
					</div>
					<div className="space-x-3">
						<button
							onClick={fetchDesaKelembagaan}
							className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
						>
							Coba Lagi
						</button>
						<button
							onClick={handleBackToList}
							className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
						>
							Kembali
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
			<div className=" px-4 sm:px-6 lg:px-8 py-6">
				{/* Breadcrumb */}
				<div className=" p-2  mb-6">
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
							<span className="text-gray-900 font-medium">
								{desaInfo?.nama || "Detail Desa"}
							</span>
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

				{/* Main Header Card */}
				<div className="mb-8">
					<div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
						{/* Gradient Top Border */}
						<div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
						
						<div className="p-6 lg:p-8">
							<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
								<div className="flex items-start space-x-4">
									<div className="flex-shrink-0">
										<div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-200">
											<LuMapPin className="w-10 h-10 text-white" />
										</div>
									</div>
									<div className="flex-1">
										<h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
											{desaInfo?.status_pemerintahan == 'desa' ? "Desa " : "Kelurahan "}
											{desaInfo?.nama}
										</h1>
										<p className="text-base lg:text-lg text-gray-600 mb-1 flex items-center gap-2">
											<span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
											Kecamatan {desaInfo?.nama_kecamatan}
										</p>
										<div className="flex items-center gap-2 mt-2">
											<span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-700 capitalize">
												{desaInfo?.status_pemerintahan}
											</span>
										</div>
									</div>
								</div>
								
								{/* Toggle Edit Mode Button - Only for superadmin */}
								{canToggleEdit && (
									<div className="flex-shrink-0">
										<button
											onClick={handleToggleEditMode}
											className={`flex items-center gap-2.5 px-5 py-3 rounded-xl transition-all duration-200 font-semibold shadow-md hover:shadow-lg transform hover:scale-105 ${
												isEditMode
													? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
													: "bg-gradient-to-r from-gray-300 to-gray-400 text-gray-700 hover:from-gray-400 hover:to-gray-500"
											}`}
											title={isEditMode ? "Mode edit aktif - Klik untuk menonaktifkan" : "Mode edit nonaktif - Klik untuk mengaktifkan"}
										>
											{isEditMode ? (
												<>
													<LuLockOpen className="h-5 w-5" />
													<span>Edit Mode: ON</span>
												</>
											) : (
												<>
													<LuLock className="h-5 w-5" />
													<span>Edit Mode: OFF</span>
												</>
											)}
										</button>
									</div>
								)}
							</div>
							
							{/* Info message about edit mode */}
							{canToggleEdit && (
								<div className={`mt-6 p-4 rounded-xl border-2 ${
									isEditMode 
										? "bg-green-50 border-green-300" 
										: "bg-amber-50 border-amber-300"
								}`}>
									<p className="text-sm font-semibold flex items-start gap-2">
										{isEditMode ? (
											<>
												<span className="text-green-600 text-lg">✓</span>
												<span className="text-green-800">
													Mode Edit Aktif - Desa dapat menambah dan mengedit data kelembagaan & pengurus
												</span>
											</>
										) : (
											<>
												<span className="text-amber-600 text-lg">⚠</span>
												<span className="text-amber-800">
													Mode Edit Nonaktif - Tombol tambah dan edit tidak akan ditampilkan untuk desa
												</span>
											</>
										)}
									</p>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Grid Kelembagaan */}
				<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6">
					{kelembagaanList.map((item) => (
						<KelembagaanCard
							key={`${item.type}-${item.id || 'empty'}`}
							item={item}
							onClick={() => handleKelembagaanClick(item)}
						/>
					))}
				</div>

				

				
			</div>

			{/* Confirmation Modal */}
			<ConfirmationModal
				isOpen={modalConfig.isOpen}
				onClose={handleCloseModal}
				onConfirm={handleConfirmCreate}
				title={modalConfig.name}
				icon={modalConfig.icon}
				color={modalConfig.color}
				loading={creatingLembaga}
				desaName={desaInfo?.nama}
			/>
		</div>
	);
};

// Komponen card untuk menampilkan kelembagaan
const KelembagaanCard = ({ item, onClick }) => {
	const Icon = item.icon;

	const handleCardClick = (e) => {
		// Prevent event if clicking on buttons
		if (e.target.closest(".action-button")) {
			return;
		}
		
		// Collection (RW, Posyandu) selalu bisa diklik
		if (item.isCollection) {
			onClick();
			return;
		}
		
		// Single entity yang sudah terbentuk bisa diklik
		if (!item.isEmpty) {
			onClick();
		}
	};

	const handleActionClick = (e) => {
		e.preventDefault();
		e.stopPropagation();
		onClick();
	};

	return (
		<div
			onClick={handleCardClick}
			className={`group bg-white rounded-2xl shadow-md transition-all duration-300 border-2 overflow-hidden ${
				item.isEmpty && !item.isCollection
					? 'border-gray-200 hover:border-gray-300' 
					: 'cursor-pointer hover:shadow-xl transform hover:-translate-y-2 border-gray-200 hover:border-blue-400'
			}`}
		>
			{/* Gradient Top Border */}
			<div
				className={`h-2 bg-gradient-to-r ${item.color} ${
					item.isEmpty && !item.isCollection ? 'opacity-40' : ''
				}`}
			></div>

			<div className="p-6">
				{/* Header Section */}
				<div className="flex items-start justify-between mb-5">
					<div className="flex items-start space-x-4 flex-1">
						<div
							className={`flex-shrink-0 w-14 h-14 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center text-white shadow-lg transition-all duration-300 ${
								item.isEmpty && !item.isCollection ? 'opacity-50' : 'group-hover:scale-110 group-hover:rotate-3'
							}`}
						>
							<Icon className="w-7 h-7" />
						</div>
						<div className="flex-1 min-w-0">
							<h3 className={`text-lg font-bold transition-colors mb-1 ${
								item.isEmpty && !item.isCollection
									? 'text-gray-600' 
									: 'text-gray-800 group-hover:text-blue-700'
							}`}>
								{item.name}
							</h3>
							<p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
								{item.type.replace("-", " ")}
							</p>
						</div>
					</div>

					{/* Action Button */}
					<button
						onClick={handleActionClick}
						className="action-button flex-shrink-0 p-2.5 rounded-xl hover:bg-blue-50 transition-all duration-200 group/btn border border-transparent hover:border-blue-200"
						title={item.isEmpty && !item.isCollection ? "Bentuk Lembaga" : "Lihat Detail"}
					>
						{item.isEmpty && !item.isCollection ? (
							<LuPlus className="w-5 h-5 text-blue-500 group-hover/btn:text-blue-700 group-hover/btn:scale-110 transition-all" />
						) : (
							<LuEye className="w-5 h-5 text-gray-400 group-hover/btn:text-blue-500 group-hover/btn:scale-110 transition-all" />
						)}
					</button>
				</div>

				{/* Status Badge */}
				<div className="mb-4">
					{item.isEmpty && !item.isCollection ? (
						<span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
							<span className="w-2 h-2 bg-gray-400 rounded-full mr-2 animate-pulse"></span>
							Belum Terbentuk
						</span>
					) : (
						<span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200">
							<span className="w-2 h-2 bg-green-500 rounded-full mr-2 shadow-md"></span>
							{item.isCollection ? 'Tersedia' : 'Sudah Terbentuk'}
						</span>
					)}
				</div>

				{/* Collection Info (for RW, Posyandu) */}
				{item.isCollection && (
					<div className="space-y-3 pt-3 border-t border-gray-100">
						<div className="flex items-center justify-between">
							<span className="text-sm font-semibold text-gray-600">Total {item.type.toUpperCase()}:</span>
							<span className={`font-bold text-2xl ${
								item.count > 0 ? 'text-blue-600' : 'text-gray-400'
							}`}>
								{item.count}
							</span>
						</div>
						{item.type === "rw" && (
							<div className="flex items-center justify-between">
								<span className="text-sm font-semibold text-gray-600">Total RT:</span>
								<span className={`font-bold text-xl ${
									item.totalRT > 0 ? 'text-cyan-600' : 'text-gray-400'
								}`}>
									{item.totalRT}
								</span>
							</div>
						)}
					</div>
				)}

				{/* Single Entity Info */}
				{!item.isCollection && item.data?.alamat && (
					<div className="flex items-start space-x-2 text-sm text-gray-600 mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
						<LuMapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
						<span className="line-clamp-2">{item.data.alamat}</span>
					</div>
				)}

				{/* Empty State Message */}
				{item.isEmpty && !item.isCollection && (
					<div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
						<p className="text-xs text-blue-700 font-medium">
							💡 Klik untuk membentuk kelembagaan ini
						</p>
					</div>
				)}
				
				{/* Empty Collection Message */}
				{item.isEmpty && item.isCollection && (
					<div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
						<p className="text-xs text-blue-700 font-medium">
							💡 Klik untuk melihat dan menambahkan {item.type}
						</p>
					</div>
				)}
			</div>
		</div>
	);
};

// Confirmation Modal Component
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, icon: Icon, color, loading, desaName }) => {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
			<div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full transform transition-all">
				{/* Header with Gradient */}
				<div className={`bg-gradient-to-br ${color} rounded-t-2xl p-6 text-white relative`}>
					<button
						onClick={onClose}
						disabled={loading}
						className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<LuX className="w-5 h-5" />
					</button>
					
					<div className="flex items-center space-x-4">
						<div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg">
							{Icon && <Icon className="w-9 h-9" />}
						</div>
						<div className="flex-1">
							<h3 className="text-2xl font-bold mb-1">Bentuk Lembaga</h3>
							<p className="text-white/90 text-sm">{title}</p>
						</div>
					</div>
				</div>

				{/* Body */}
				<div className="p-6">
					<div className="flex items-start space-x-3 mb-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
						<LuCircleAlert className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
						<div className="text-sm text-blue-900 flex-1">
							<p className="font-bold mb-2 text-base">Konfirmasi Pembentukan</p>
							<p className="mb-2">
								Anda akan membentuk <span className="font-bold text-blue-700">{title}</span> untuk{" "}
								<span className="font-bold text-blue-700">{desaName}</span>.
							</p>
							<p className="text-blue-700 bg-blue-100 px-3 py-2 rounded-lg border border-blue-200 mt-3">
								<strong>ℹ️ Info:</strong> Setelah dibentuk, data kelembagaan dapat dikelola oleh admin desa.
							</p>
						</div>
					</div>

					{/* Action Buttons */}
					<div className="flex space-x-3">
						<button
							onClick={onClose}
							disabled={loading}
							className="flex-1 px-5 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Batal
						</button>
						<button
							onClick={onConfirm}
							disabled={loading}
							className={`flex-1 px-5 py-3 bg-gradient-to-r ${color} rounded-xl text-white font-bold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transform hover:scale-105`}
						>
							{loading ? (
								<>
									<LuLoader className="w-5 h-5 animate-spin" />
									<span>Membentuk...</span>
								</>
							) : (
								<>
									<LuPlus className="w-5 h-5" />
									<span>Bentuk Lembaga</span>
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default AdminKelembagaanDetailPage;
