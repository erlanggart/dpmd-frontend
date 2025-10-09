import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
	LuArrowLeft,
	LuBuilding2,
	LuUsers,
	LuHeart,
	LuShield,
	LuSprout,
	LuMapPin,
	LuLoader,
	LuHouse,
	LuChevronRight,
	LuEye,
	LuUserCheck,
} from "react-icons/lu";
import { getDesaKelembagaanAll } from "../../api/kelembagaanApi";

// Import komponen yang sudah ada dari desa kelembagaan
import KelembagaanDetailPage from "../desa/kelembagaan/KelembagaanDetailPage";

/**
 * AdminKelembagaanDetailPage - Wrapper untuk admin PMD mengakses detail kelembagaan desa
 *
 * Komponen ini memungkinkan admin PMD untuk melihat detail kelembagaan dari desa tertentu
 * dengan menggunakan komponen KelembagaanDetailPage yang sudah ada tetapi dengan konteks admin
 */
const AdminKelembagaanDetailPage = () => {
	const { desaId } = useParams();
	const navigate = useNavigate();
	const { user } = useAuth();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [desaInfo, setDesaInfo] = useState(null);
	const [selectedKelembagaan, setSelectedKelembagaan] = useState(null);
	const [kelembagaanList, setKelembagaanList] = useState([]);

	// Check admin access
	const isAdmin = ["superadmin", "pemberdayaan_masyarakat", "pmd"].includes(
		user?.role
	);

	useEffect(() => {
		if (!isAdmin) {
			navigate("/dashboard");
			return;
		}
		fetchDesaKelembagaan();
	}, [desaId, isAdmin]);

	const fetchDesaKelembagaan = async () => {
		try {
			setLoading(true);
			const response = await getDesaKelembagaanAll(desaId);

			setDesaInfo(response.desa.data);

			// Buat list kelembagaan yang tersedia untuk navigasi
			const kelembagaanItems = [];

			// RW List
			if (response.kelembagaan.rw && response.kelembagaan.rw.length > 0) {
				response.kelembagaan.rw.forEach((rw) => {
					kelembagaanItems.push({
						type: "rw",
						id: rw.id,
						name: `RW ${rw.nomor}`,
						data: rw,
						count: rw.rt_count || 0,
						icon: LuBuilding2,
						color: "from-blue-500 to-indigo-600",
					});
				});
			}

			// Posyandu List
			if (
				response.kelembagaan.posyandu &&
				response.kelembagaan.posyandu.length > 0
			) {
				response.kelembagaan.posyandu.forEach((posyandu) => {
					kelembagaanItems.push({
						type: "posyandu",
						id: posyandu.id,
						name: posyandu.nama,
						data: posyandu,
						icon: LuHeart,
						color: "from-pink-500 to-red-600",
					});
				});
			}

			// Single entities
			if (response.kelembagaan.karangTaruna) {
				kelembagaanItems.push({
					type: "karang-taruna",
					id: response.kelembagaan.karangTaruna.id,
					name: response.kelembagaan.karangTaruna.nama,
					data: response.kelembagaan.karangTaruna,
					icon: LuUsers,
					color: "from-purple-500 to-indigo-600",
				});
			}

			if (response.kelembagaan.lpm) {
				kelembagaanItems.push({
					type: "lpm",
					id: response.kelembagaan.lpm.id,
					name: response.kelembagaan.lpm.nama,
					data: response.kelembagaan.lpm,
					icon: LuUserCheck,
					color: "from-gray-500 to-gray-700",
				});
			}

			if (response.kelembagaan.satlinmas) {
				kelembagaanItems.push({
					type: "satlinmas",
					id: response.kelembagaan.satlinmas.id,
					name: response.kelembagaan.satlinmas.nama,
					data: response.kelembagaan.satlinmas,
					icon: LuShield,
					color: "from-green-500 to-emerald-600",
				});
			}

			if (response.kelembagaan.pkk) {
				kelembagaanItems.push({
					type: "pkk",
					id: response.kelembagaan.pkk.id,
					name: response.kelembagaan.pkk.nama,
					data: response.kelembagaan.pkk,
					icon: LuSprout,
					color: "from-emerald-500 to-green-600",
				});
			}

			setKelembagaanList(kelembagaanItems);
		} catch (err) {
			console.error("Error fetching kelembagaan data:", err);
			setError(err.message || "Gagal memuat data kelembagaan");
		} finally {
			setLoading(false);
		}
	};

	const handleKelembagaanClick = (item) => {
		// Navigate to detail kelembagaan dengan role admin
		navigate(`/dashboard/kelembagaan/admin/${desaId}/${item.type}/${item.id}`);
	};

	const handleBackToList = () => {
		navigate("/dashboard/kelembagaan");
	};

	if (!isAdmin) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<h2 className="text-xl font-bold text-red-600">Akses Ditolak</h2>
					<p className="text-gray-600 mt-2">
						Anda tidak memiliki akses ke halaman ini.
					</p>
				</div>
			</div>
		);
	}

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

	// If selectedKelembagaan is set, show the detail page
	if (selectedKelembagaan) {
		return <KelembagaanDetailPage />;
	}

	return (
		<div className="min-h-screen bg-gray-50 p-6">
			<div className="max-w-7xl mx-auto">
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

					<div className="bg-white rounded-xl shadow-sm p-6 border">
						<div className="flex items-center space-x-4">
							<div className="p-3 bg-blue-100 rounded-full">
								<LuMapPin className="w-8 h-8 text-blue-600" />
							</div>
							<div>
								<h1 className="text-3xl font-bold text-gray-800">
									{desaInfo?.nama_desa}
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
					{kelembagaanList.map((item, index) => (
						<KelembagaanCard
							key={`${item.type}-${item.id}`}
							item={item}
							onClick={() => handleKelembagaanClick(item)}
						/>
					))}
				</div>

				{kelembagaanList.length === 0 && (
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
								{kelembagaanList.filter((item) => item.type === "rw").length}
							</div>
							<div className="text-sm text-gray-600">Total RW</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-pink-600">
								{
									kelembagaanList.filter((item) => item.type === "posyandu")
										.length
								}
							</div>
							<div className="text-sm text-gray-600">Total Posyandu</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-green-600">
								{
									kelembagaanList.filter((item) =>
										["karang-taruna", "lpm", "satlinmas", "pkk"].includes(
											item.type
										)
									).length
								}
							</div>
							<div className="text-sm text-gray-600">Kelembagaan Lain</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-gray-600">
								{kelembagaanList.length}
							</div>
							<div className="text-sm text-gray-600">Total Kelembagaan</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

// Komponen card untuk menampilkan kelembagaan
const KelembagaanCard = ({ item, onClick }) => {
	const Icon = item.icon;

	const handleCardClick = (e) => {
		// Prevent event if clicking on the eye button
		if (e.target.closest(".eye-button")) {
			return;
		}
		onClick();
	};

	const handleEyeClick = (e) => {
		e.preventDefault();
		e.stopPropagation();
		onClick();
	};

	return (
		<div
			onClick={handleCardClick}
			className="group cursor-pointer bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border border-gray-200 hover:border-blue-300"
		>
			<div
				className={`h-1.5 bg-gradient-to-r ${item.color} rounded-t-xl`}
			></div>

			<div className="p-6">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center space-x-3">
						<div
							className={`w-12 h-12 bg-gradient-to-r ${item.color} rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}
						>
							<Icon className="w-6 h-6" />
						</div>
						<div>
							<h3 className="text-lg font-semibold text-gray-800 group-hover:text-blue-800 transition-colors">
								{item.name}
							</h3>
							<p className="text-sm text-gray-500 capitalize">
								{item.type.replace("-", " ")}
							</p>
						</div>
					</div>

					<button
						onClick={handleEyeClick}
						className="eye-button p-2 rounded-full hover:bg-blue-50 transition-colors group/btn"
						title="Lihat Detail"
					>
						<LuEye className="w-5 h-5 text-gray-400 group-hover/btn:text-blue-500 transition-colors" />
					</button>
				</div>

				{item.data?.alamat && (
					<div className="flex items-center space-x-2 text-sm text-gray-500 mb-3">
						<LuMapPin className="w-4 h-4" />
						<span className="truncate">{item.data.alamat}</span>
					</div>
				)}

				{item.count !== undefined && (
					<div className="text-sm">
						<span className="text-gray-600">Memiliki: </span>
						<span className="font-semibold text-blue-600">{item.count} RT</span>
					</div>
				)}
			</div>
		</div>
	);
};

export default AdminKelembagaanDetailPage;
