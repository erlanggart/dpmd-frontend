import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
} from "react-icons/lu";
import { getDesaKelembagaanAll } from "../../api/kelembagaanApi";

/**
 * AdminKelembagaanDetailPage - Admin PMD mengakses detail kelembagaan desa
 * Role protection sudah dilakukan di App.jsx routing
 */
const AdminKelembagaanDetailPage = () => {
	const { desaId } = useParams();
	const navigate = useNavigate();
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
				name: "RW (Rukun Warga)",
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

	const handleKelembagaanClick = (item) => {
		// Untuk collection (RW, Posyandu), selalu bisa diklik - navigate ke list page
		if (item.isCollection) {
			// Navigate ke list page dengan filter desaId
			navigate(`/dashboard/kelembagaan/admin/${desaId}/${item.type}`);
			return;
		}

		// Untuk single entity yang belum terbentuk, buka modal pembentukan
		if (item.isEmpty && !item.isCollection) {
			handleOpenModal(item);
			return;
		}

		// Untuk single entity yang sudah terbentuk, navigate ke detail page
		if (!item.isCollection && item.id) {
			navigate(`/dashboard/kelembagaan/${item.type}/${item.id}`);
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
					const { createKarangTarunaByAdmin } = await import("../../api/kelembagaanApi");
					createFunction = createKarangTarunaByAdmin;
					break;
				}
				case 'lpm': {
					const { createLpmByAdmin } = await import("../../api/kelembagaanApi");
					createFunction = createLpmByAdmin;
					break;
				}
				case 'satlinmas': {
					const { createSatlinmasByAdmin } = await import("../../api/kelembagaanApi");
					createFunction = createSatlinmasByAdmin;
					break;
				}
				case 'pkk': {
					const { createPkkByAdmin } = await import("../../api/kelembagaanApi");
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
		navigate("/dashboard/kelembagaan");
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
		<div className="min-h-screen">
			<div className="">
				{/* Header dengan Breadcrumb */}
				<div className="mb-6">
					<div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
						<button
							onClick={handleBackToList}
							className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
						>
							<LuArrowLeft className="w-4 h-4" />
							<span>PMD Kelembagaan</span>
						</button>
						<LuChevronRight className="w-4 h-4" />
						<span className="text-gray-800 font-medium">
							{desaInfo?.nama_desa || "Detail Desa"}
						</span>
					</div>

					<div className="bg-white rounded-xl shadow-sm p-6 ">
						<div className="flex items-center space-x-4">
							<div className="p-3 bg-blue-100 rounded-full">
								<LuMapPin className="w-8 h-8 text-blue-600" />
							</div>
							<div>
								<h1 className="text-3xl font-bold text-gray-800">
									{desaInfo?.status_pemerintahan == 'desa' ? "Desa " : "Kelurahan"}{desaInfo?.nama}
								</h1>
								<p className="text-lg text-gray-600">
									Kecamatan {desaInfo?.nama_kecamatan}
								</p>
								<p className="text-sm text-gray-500 capitalize">
									Status: {desaInfo?.status_pemerintahan}
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Grid Kelembagaan */}
				<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
					{kelembagaanList.map((item) => (
						<KelembagaanCard
							key={`${item.type}-${item.id || 'empty'}`}
							item={item}
							onClick={() => handleKelembagaanClick(item)}
						/>
					))}
				</div>

				{/* Empty state jika tidak ada data sama sekali */}
				{kelembagaanList.every(item => item.isEmpty) && (
					<div className="text-center py-16">
						<div className="text-gray-400 mb-4">
							<LuBuilding2 className="w-16 h-16 mx-auto" />
						</div>
						<h3 className="text-xl font-medium text-gray-600 mb-2">
							Belum Ada Kelembagaan
						</h3>
						<p className="text-gray-500">
							Desa ini belum memiliki data kelembagaan yang terdaftar.
						</p>
					</div>
				)}

				{/* Summary Statistics */}
				<div className="mt-8 bg-white rounded-xl shadow-sm p-6 border">
					<h2 className="text-xl font-semibold text-gray-800 mb-4">
						Ringkasan Kelembagaan
					</h2>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div className="text-center">
							<div className="text-2xl font-bold text-blue-600">
								{kelembagaanList.find((item) => item.type === "rw")?.count || 0}
							</div>
							<div className="text-sm text-gray-600">Total RW</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-blue-400">
								{kelembagaanList.find((item) => item.type === "rw")?.totalRT || 0}
							</div>
							<div className="text-sm text-gray-600">Total RT</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-pink-600">
								{kelembagaanList.find((item) => item.type === "posyandu")?.count || 0}
							</div>
							<div className="text-sm text-gray-600">Total Posyandu</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-green-600">
								{
									kelembagaanList.filter((item) =>
										["karang-taruna", "lpm", "satlinmas", "pkk"].includes(item.type) && !item.isEmpty
									).length
								}
							</div>
							<div className="text-sm text-gray-600">Kelembagaan Lain Terbentuk</div>
						</div>
					</div>
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
			className={`group bg-white rounded-xl shadow-sm transition-all duration-300 border ${
				item.isEmpty && !item.isCollection
					? 'border-gray-300 opacity-75' 
					: 'cursor-pointer hover:shadow-lg transform hover:-translate-y-1 border-gray-200 hover:border-blue-300'
			}`}
		>
			<div
				className={`h-1.5 bg-gradient-to-r ${item.color} rounded-t-xl ${
					item.isEmpty && !item.isCollection ? 'opacity-50' : ''
				}`}
			></div>

			<div className="p-6">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center space-x-3">
						<div
							className={`w-12 h-12 bg-gradient-to-r ${item.color} rounded-xl flex items-center justify-center text-white shadow-lg transition-transform duration-300 ${
								item.isEmpty && !item.isCollection ? 'opacity-50' : 'group-hover:scale-110'
							}`}
						>
							<Icon className="w-6 h-6" />
						</div>
						<div className="flex-1">
							<h3 className={`text-lg font-semibold transition-colors ${
								item.isEmpty && !item.isCollection
									? 'text-gray-600' 
									: 'text-gray-800 group-hover:text-blue-800'
							}`}>
								{item.name}
							</h3>
							<p className="text-sm text-gray-500 capitalize">
								{item.type.replace("-", " ")}
							</p>
						</div>
					</div>

					{/* Action Button */}
					<button
						onClick={handleActionClick}
						className="action-button p-2 rounded-full hover:bg-blue-50 transition-colors group/btn"
						title={item.isEmpty && !item.isCollection ? "Bentuk Lembaga" : "Lihat Detail"}
					>
						{item.isEmpty && !item.isCollection ? (
							<LuPlus className="w-5 h-5 text-blue-500 group-hover/btn:text-blue-700 transition-colors" />
						) : (
							<LuEye className="w-5 h-5 text-gray-400 group-hover/btn:text-blue-500 transition-colors" />
						)}
					</button>
				</div>

				{/* Status Badge */}
				<div className="mb-3">
					{item.isEmpty && !item.isCollection ? (
						<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
							<span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
							Belum Terbentuk
						</span>
					) : (
						<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
							<span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
							{item.isCollection ? 'Tersedia' : 'Sudah Terbentuk'}
						</span>
					)}
				</div>

				{/* Collection Info (for RW, Posyandu) */}
				{item.isCollection && (
					<div className="space-y-2">
						<div className="flex items-center justify-between text-sm">
							<span className="text-gray-600">Total {item.type.toUpperCase()}:</span>
							<span className={`font-bold text-lg ${
								item.count > 0 ? 'text-blue-600' : 'text-gray-400'
							}`}>
								{item.count}
							</span>
						</div>
						{item.type === "rw" && (
							<div className="flex items-center justify-between text-sm">
								<span className="text-gray-600">Total RT:</span>
								<span className={`font-semibold ${
									item.totalRT > 0 ? 'text-blue-500' : 'text-gray-400'
								}`}>
									{item.totalRT}
								</span>
							</div>
						)}
					</div>
				)}

				{/* Single Entity Info */}
				{!item.isCollection && item.data?.alamat && (
					<div className="flex items-center space-x-2 text-sm text-gray-500 mt-3">
						<LuMapPin className="w-4 h-4 flex-shrink-0" />
						<span className="truncate">{item.data.alamat}</span>
					</div>
				)}

				{/* Empty State Message */}
				{item.isEmpty && !item.isCollection && (
					<p className="text-sm text-gray-500 mt-2 italic">
						Klik untuk membentuk kelembagaan ini
					</p>
				)}
				
				{/* Empty Collection Message */}
				{item.isEmpty && item.isCollection && (
					<p className="text-sm text-gray-500 mt-2 italic">
						Klik untuk melihat dan menambahkan {item.type}
					</p>
				)}
			</div>
		</div>
	);
};

// Confirmation Modal Component
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, icon: Icon, color, loading, desaName }) => {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
				{/* Header */}
				<div className={`bg-gradient-to-r ${color} rounded-t-2xl p-6 text-white relative`}>
					<button
						onClick={onClose}
						disabled={loading}
						className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-full transition-colors"
					>
						<LuX className="w-5 h-5" />
					</button>
					
					<div className="flex items-center space-x-4">
						<div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
							{Icon && <Icon className="w-8 h-8" />}
						</div>
						<div>
							<h3 className="text-xl font-bold">Bentuk Lembaga</h3>
							<p className="text-white/80 text-sm mt-1">{title}</p>
						</div>
					</div>
				</div>

				{/* Body */}
				<div className="p-6">
					<div className="flex items-start space-x-3 mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
						<LuCircleAlert className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
						<div className="text-sm text-blue-900">
							<p className="font-semibold mb-1">Konfirmasi Pembentukan</p>
							<p>
								Anda akan membentuk <span className="font-bold">{title}</span> untuk{" "}
								<span className="font-bold">{desaName}</span>.
							</p>
							<p className="mt-2 text-blue-700">
								Setelah dibentuk, data kelembagaan dapat dikelola oleh admin desa.
							</p>
						</div>
					</div>

					{/* Action Buttons */}
					<div className="flex space-x-3">
						<button
							onClick={onClose}
							disabled={loading}
							className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Batal
						</button>
						<button
							onClick={onConfirm}
							disabled={loading}
							className={`flex-1 px-4 py-3 bg-gradient-to-r ${color} rounded-lg text-white font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2`}
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
