import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Swal from "sweetalert2";
import {
	LuBuilding2,
	LuUsers,
	LuHeart,
	LuShield,
	LuSprout,
	LuMapPin,
	LuLoader,
	LuChevronDown,
	LuUserCheck,
	LuPlus,
	LuCircleAlert,
	LuX,
	LuLock,
	LuLockOpen,
	LuShieldCheck,
	LuTriangleAlert,
	LuCheck,
	LuBuilding,
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
			const lembagaLainnyaData = response.data.kelembagaan.lembaga_lainnya || [];

			// RW - Collection
			kelembagaanItems.push({
				type: "rw",
				id: null,
				name: "RW / RT",
				count: rwData.length,
				totalRT: rwData.reduce((sum, rw) => sum + (rw.rt_count || 0), 0),
				isCollection: true,
				isEmpty: rwData.length === 0,
				icon: LuBuilding2,
				color: "blue",
				data: rwData,
			});

			// Posyandu - Collection
			kelembagaanItems.push({
				type: "posyandu",
				id: null,
				name: "Posyandu",
				count: posyanduData.length,
				isCollection: true,
				isEmpty: posyanduData.length === 0,
				icon: LuHeart,
				color: "pink",
				data: posyanduData,
			});

			// Karang Taruna
			const karangTaruna = response.data.kelembagaan.karang_taruna;
			kelembagaanItems.push({
				type: "karang-taruna",
				id: karangTaruna?.id || null,
				name: "Karang Taruna",
				isCollection: false,
				isEmpty: !karangTaruna,
				icon: LuUsers,
				color: "purple",
				data: karangTaruna,
			});

			// LPM
			const lpm = response.data.kelembagaan.lpm;
			kelembagaanItems.push({
				type: "lpm",
				id: lpm?.id || null,
				name: "LPM",
				isCollection: false,
				isEmpty: !lpm,
				icon: LuUserCheck,
				color: "indigo",
				data: lpm,
			});

			// Satlinmas
			const satlinmas = response.data.kelembagaan.satlinmas;
			kelembagaanItems.push({
				type: "satlinmas",
				id: satlinmas?.id || null,
				name: "Satlinmas",
				isCollection: false,
				isEmpty: !satlinmas,
				icon: LuShield,
				color: "emerald",
				data: satlinmas,
			});

			// PKK
			const pkk = response.data.kelembagaan.pkk;
			kelembagaanItems.push({
				type: "pkk",
				id: pkk?.id || null,
				name: "PKK",
				isCollection: false,
				isEmpty: !pkk,
				icon: LuSprout,
				color: "green",
				data: pkk,
			});

			// Lembaga Lainnya - Collection
			kelembagaanItems.push({
				type: "lembaga-lainnya",
				id: null,
				name: "Lembaga Kemasyarakatan Lainnya",
				count: lembagaLainnyaData.length,
				isCollection: true,
				isEmpty: lembagaLainnyaData.length === 0,
				icon: LuBuilding,
				color: "slate",
				data: lembagaLainnyaData,
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

				{/* Main Header */}
				<div className="mb-6 space-y-3">
					<div className="flex items-center justify-between gap-4">
						<div className="flex items-center gap-3 min-w-0">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
								<LuMapPin className="w-5 h-5 text-slate-600" />
							</div>
							<div className="min-w-0">
								<h1 className="text-lg font-semibold text-slate-800 truncate">
									{desaInfo?.status_pemerintahan == 'desa' ? "Desa " : "Kelurahan "}
									{desaInfo?.nama}
								</h1>
								<p className="text-sm text-slate-500 truncate">
									Kecamatan {desaInfo?.nama_kecamatan}
								</p>
							</div>
						</div>

						{canToggleEdit && (
							<button
								onClick={handleToggleEditMode}
								className={`shrink-0 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
									isEditMode
										? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
										: "bg-slate-100 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-200"
								}`}
								title={isEditMode ? "Mode edit aktif" : "Mode edit nonaktif"}
							>
								{isEditMode ? <LuLockOpen className="h-4 w-4" /> : <LuLock className="h-4 w-4" />}
								<span>Edit Mode: {isEditMode ? "ON" : "OFF"}</span>
							</button>
						)}
					</div>

					{canToggleEdit && (
						<div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
							isEditMode
								? "bg-emerald-50 text-emerald-700"
								: "bg-amber-50 text-amber-700"
						}`}>
							{isEditMode ? (
								<>
									<LuCheck className="w-3.5 h-3.5 shrink-0" />
									<span>Mode Edit Aktif - Desa dapat menambah dan mengedit data kelembagaan & pengurus</span>
								</>
							) : (
								<>
									<LuTriangleAlert className="w-3.5 h-3.5 shrink-0" />
									<span>Mode Edit Nonaktif - Tombol tambah dan edit tidak akan ditampilkan untuk desa</span>
								</>
							)}
						</div>
					)}
				</div>

				{/* Kelembagaan List */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
					<div className="divide-y divide-gray-100">
						{kelembagaanList.map((item) => (
							<KelembagaanRow
								key={`${item.type}-${item.id || 'empty'}`}
								item={item}
								basePath={basePath}
								desaId={desaId}
								navigate={navigate}
								onCreateClick={() => handleOpenModal(item)}
							/>
						))}
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

// Color map for consistent styling
const COLOR_MAP = {
	blue: { bg: "bg-blue-50", text: "text-blue-600", icon: "bg-blue-100 text-blue-600", border: "border-blue-200", gradient: "from-blue-500 to-indigo-600" },
	pink: { bg: "bg-pink-50", text: "text-pink-600", icon: "bg-pink-100 text-pink-600", border: "border-pink-200", gradient: "from-pink-500 to-red-600" },
	purple: { bg: "bg-purple-50", text: "text-purple-600", icon: "bg-purple-100 text-purple-600", border: "border-purple-200", gradient: "from-purple-500 to-indigo-600" },
	indigo: { bg: "bg-indigo-50", text: "text-indigo-600", icon: "bg-indigo-100 text-indigo-600", border: "border-indigo-200", gradient: "from-indigo-500 to-indigo-700" },
	emerald: { bg: "bg-emerald-50", text: "text-emerald-600", icon: "bg-emerald-100 text-emerald-600", border: "border-emerald-200", gradient: "from-green-500 to-emerald-600" },
	green: { bg: "bg-green-50", text: "text-green-600", icon: "bg-green-100 text-green-600", border: "border-green-200", gradient: "from-emerald-500 to-green-600" },
	slate: { bg: "bg-slate-50", text: "text-slate-600", icon: "bg-slate-100 text-slate-600", border: "border-slate-200", gradient: "from-slate-500 to-slate-700" },
};

const VerifBadge = ({ status }) => {
	if (status === "verified") {
		return (
			<span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-100 text-emerald-700">
				<LuShieldCheck className="w-2.5 h-2.5" /> Terverifikasi
			</span>
		);
	}
	if (status === "ditolak") {
		return (
			<span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-red-100 text-red-700">
				<LuX className="w-2.5 h-2.5" /> Ditolak
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-700">
			<LuTriangleAlert className="w-2.5 h-2.5" /> Belum
		</span>
	);
};

// Row-based kelembagaan item
const KelembagaanRow = ({ item, basePath, desaId, navigate, onCreateClick }) => {
	const Icon = item.icon;
	const colors = COLOR_MAP[item.color] || COLOR_MAP.slate;
	const [expanded, setExpanded] = useState(true);

	// For collections (RW, Posyandu, Lembaga Lainnya)
	if (item.isCollection) {
		const hasChildren = item.data && item.data.length > 0;

		return (
			<div>
				{/* Section Header */}
				<div
					className={`flex items-center justify-between px-5 py-3.5 ${colors.bg} cursor-pointer hover:brightness-95 transition-all`}
					onClick={() => setExpanded(!expanded)}
				>
					<div className="flex items-center gap-3">
						<div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.icon}`}>
							<Icon className="w-4 h-4" />
						</div>
						<div>
							<h3 className="text-sm font-bold text-gray-900">{item.name}</h3>
							<span className="text-xs text-gray-500">
								{item.count} {item.type === "rw" ? `RW • ${item.totalRT} RT` : "terdaftar"}
							</span>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<button
							onClick={(e) => {
								e.stopPropagation();
								navigate(`/bidang/pmd/kelembagaan/admin/${desaId}/${item.type}`);
							}}
							className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline px-2 py-1"
						>
							Kelola
						</button>
						<LuChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
					</div>
				</div>

				{/* Children */}
				{expanded && hasChildren && (
					<div className="divide-y divide-gray-50">
						{item.data.map((child) => {
							if (item.type === "rw") {
								return <RwRow key={child.id} rw={child} basePath={basePath} navigate={navigate} />;
							}
							// Posyandu or Lembaga Lainnya
							return (
								<div
									key={child.id}
									className="flex items-center justify-between px-5 py-2.5 pl-16 hover:bg-gray-50 cursor-pointer transition-colors"
									onClick={() => navigate(`${basePath}/kelembagaan/${item.type}/${child.id}`)}
								>
									<div className="flex items-center gap-3 min-w-0">
										<div className={`w-6 h-6 rounded flex items-center justify-center ${colors.icon}`}>
											<Icon className="w-3 h-3" />
										</div>
										<span className="text-sm font-medium text-gray-800 truncate">{child.nama}</span>
										<VerifBadge status={child.status_verifikasi} />
									</div>
									<FaChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
								</div>
							);
						})}
					</div>
				)}

				{/* Empty state */}
				{expanded && !hasChildren && (
					<div className="px-5 py-4 pl-16 text-xs text-gray-400 italic">
						Belum ada data. Klik "Kelola" untuk menambahkan.
					</div>
				)}
			</div>
		);
	}

	// Single entity (Karang Taruna, LPM, Satlinmas, PKK)
	if (item.isEmpty) {
		return (
			<div
				className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer"
				onClick={onCreateClick}
			>
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 text-gray-400">
						<Icon className="w-4 h-4" />
					</div>
					<div>
						<span className="text-sm font-medium text-gray-500">{item.name}</span>
						<span className="ml-2 inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-gray-100 text-gray-500">
							Belum Terbentuk
						</span>
					</div>
				</div>
				<button className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50">
					<LuPlus className="w-3 h-3" />
					Bentuk
				</button>
			</div>
		);
	}

	return (
		<div
			className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer"
			onClick={() => navigate(`${basePath}/kelembagaan/${item.type}/${item.id}`)}
		>
			<div className="flex items-center gap-3">
				<div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.icon}`}>
					<Icon className="w-4 h-4" />
				</div>
				<span className="text-sm font-semibold text-gray-800">{item.name}</span>
				<VerifBadge status={item.data?.status_verifikasi} />
			</div>
			<FaChevronRight className="w-3 h-3 text-gray-300" />
		</div>
	);
};

// RW row with nested RT
const RwRow = ({ rw, basePath, navigate }) => {
	const rts = rw.rts || [];

	return (
		<div>
			<div
				className="flex items-center justify-between px-5 py-2.5 pl-10 hover:bg-blue-50/50 cursor-pointer transition-colors"
				onClick={() => navigate(`${basePath}/kelembagaan/rw/${rw.id}`)}
			>
				<div className="flex items-center gap-3 min-w-0">
					<div className="w-6 h-6 rounded flex items-center justify-center bg-blue-100 text-blue-600">
						<LuBuilding2 className="w-3 h-3" />
					</div>
					<span className="text-sm font-semibold text-gray-800">RW {rw.nomor}</span>
					<VerifBadge status={rw.status_verifikasi} />
					{rts.length > 0 && (
						<span className="text-[10px] font-medium text-gray-400">{rts.length} RT</span>
					)}
				</div>
				<FaChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
			</div>

			{/* Nested RT */}
			{rts.length > 0 && (
				<div className="divide-y divide-gray-50">
					{rts.map((rt) => (
						<div
							key={rt.id}
							className="flex items-center justify-between px-5 py-2 pl-20 hover:bg-gray-50 cursor-pointer transition-colors"
							onClick={() => navigate(`${basePath}/kelembagaan/rt/${rt.id}`)}
						>
							<div className="flex items-center gap-2.5 min-w-0">
								<div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0"></div>
								<span className="text-xs font-medium text-gray-600">RT {rt.nomor}</span>
								<VerifBadge status={rt.status_verifikasi} />
							</div>
							<FaChevronRight className="w-2.5 h-2.5 text-gray-300 flex-shrink-0" />
						</div>
					))}
				</div>
			)}
		</div>
	);
};

// Confirmation Modal Component
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, icon: Icon, color, loading, desaName }) => {
	if (!isOpen) return null;
	const colors = COLOR_MAP[color] || COLOR_MAP.slate;

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
			<div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
				{/* Header */}
				<div className={`bg-gradient-to-br ${colors.gradient} rounded-t-2xl p-6 text-white relative`}>
					<button
						onClick={onClose}
						disabled={loading}
						className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-all disabled:opacity-50"
					>
						<LuX className="w-5 h-5" />
					</button>
					<div className="flex items-center space-x-4">
						<div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
							{Icon && <Icon className="w-8 h-8" />}
						</div>
						<div>
							<h3 className="text-xl font-bold">Bentuk Lembaga</h3>
							<p className="text-white/80 text-sm">{title}</p>
						</div>
					</div>
				</div>

				{/* Body */}
				<div className="p-6">
					<div className="flex items-start gap-3 mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
						<LuCircleAlert className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
						<div className="text-sm text-blue-900">
							<p className="font-bold mb-1">Konfirmasi Pembentukan</p>
							<p>
								Anda akan membentuk <strong>{title}</strong> untuk <strong>{desaName}</strong>.
							</p>
							<p className="text-xs text-blue-700 mt-2">
								Setelah dibentuk, data kelembagaan dapat dikelola oleh admin desa.
							</p>
						</div>
					</div>

					<div className="flex gap-3">
						<button
							onClick={onClose}
							disabled={loading}
							className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
						>
							Batal
						</button>
						<button
							onClick={onConfirm}
							disabled={loading}
							className={`flex-1 px-4 py-2.5 bg-gradient-to-r ${colors.gradient} rounded-lg text-white font-medium hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2`}
						>
							{loading ? (
								<><LuLoader className="w-4 h-4 animate-spin" /><span>Membentuk...</span></>
							) : (
								<><LuPlus className="w-4 h-4" /><span>Bentuk Lembaga</span></>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default AdminKelembagaanDetailPage;
