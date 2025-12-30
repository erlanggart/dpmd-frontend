import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
	LuChevronDown,
	LuChevronUp,
	LuBuilding2,
	LuHouse,
	LuUsers,
	LuMapPin,
	LuShield,
	LuHeart,
	LuUserCheck,
	LuCheck,
	LuX,
	LuLoader,
	LuLock,
	LuLockOpen,
} from "react-icons/lu";
import kelembagaanApi from "../../../api/kelembagaan";

const Kelembagaan = () => {
	const { user } = useAuth();
	const { isEditMode, toggleEditMode } = useEditMode();
	const [kecamatanData, setKecamatanData] = useState([]);
	const [summaryData, setSummaryData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState(null);
	const [expandedKecamatan, setExpandedKecamatan] = useState({});
	const navigate = useNavigate();

	// Check if user can toggle edit mode
	const canToggleEdit = ["superadmin", "pemberdayaan_masyarakat"].includes(user?.role);

	// Fetch data kecamatan dan desa dengan kelembagaan menggunakan service API
	const fetchKelembagaanData = async () => {
		try {
			setLoading(true);
			setError(null);

			// Fetch data kelembagaan dan summary secara bersamaan menggunakan service API
			const results = await Promise.allSettled([
				kelembagaanApi.getKelembagaanData(),
				kelembagaanApi.getSummary(),
			]);

			// Handle kelembagaan response
			const kelembagaanResult = results[0];
			if (
				kelembagaanResult.status === "fulfilled" &&
				kelembagaanResult.value.success
			) {
				setKecamatanData(kelembagaanResult.value.data || []);
			} else {
				const errorMsg =
					kelembagaanResult.status === "rejected"
						? kelembagaanResult.reason.message
						: kelembagaanResult.value?.message ||
						  "Gagal mengambil data kelembagaan";
				throw new Error(errorMsg);
			}

			// Handle summary response
			const summaryResult = results[1];
			if (summaryResult.status === "fulfilled" && summaryResult.value.success) {
				setSummaryData(summaryResult.value.data);
			} else {
				console.warn(
					"Gagal mengambil summary data:",
					summaryResult.status === "rejected"
						? summaryResult.reason.message
						: summaryResult.value?.message || "Error tidak dikenal"
				);
				// Summary error tidak menghentikan aplikasi
			}
		} catch (err) {
			console.error("Error fetching kelembagaan data:", err);
			setError(
				err.message || "Gagal mengambil data kelembagaan. Silakan coba lagi."
			);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchKelembagaanData();
	}, []);

	const toggleKecamatan = (kecamatanId) => {
		setExpandedKecamatan((prev) => ({
			...prev,
			[kecamatanId]: !prev[kecamatanId],
		}));
	};

	const handleDesaClick = (desaId) => {
		// Navigate ke admin kelembagaan detail dengan list RW/kelembagaan
		navigate(`/dashboard/kelembagaan/admin/${desaId}`);
	};

	const handleRefresh = async () => {
		setRefreshing(true);
		try {
			await fetchKelembagaanData();
		} finally {
			setRefreshing(false);
		}
	};

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

	// Render status badge
	const StatusBadge = ({ status }) => {
		const isFormed = status === "Terbentuk";
		return (
			<span
				className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
					isFormed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
				}`}
			>
				{isFormed ? (
					<LuCheck className="h-3 w-3" />
				) : (
					<LuX className="h-3 w-3" />
				)}
				{status}
			</span>
		);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-96">
				<div className="flex items-center gap-2">
					<LuLoader className="h-6 w-6 animate-spin text-blue-600" />
					<span className="text-gray-600">Memuat data kelembagaan...</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
				<LuX className="h-12 w-12 text-red-500 mx-auto mb-4" />
				<h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
				<p className="text-red-600">{error}</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-3">
						<LuBuilding2 className="h-6 w-6 text-blue-600" />
						<h1 className="text-2xl font-bold text-gray-900">
							Data Kelembagaan Desa
						</h1>
					</div>
					<div className="flex items-center gap-3">
						{/* Toggle Edit Mode Button - Only for superadmin/pemberdayaan_masyarakat */}
						{canToggleEdit && (
							<button
								onClick={handleToggleEditMode}
								className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
									isEditMode
										? "bg-green-600 text-white hover:bg-green-700 shadow-md"
										: "bg-gray-200 text-gray-700 hover:bg-gray-300"
								}`}
							>
								{isEditMode ? (
									<>
										<LuLockOpen className="h-4 w-4" />
										<span>Mode Edit: ON</span>
									</>
								) : (
									<>
										<LuLock className="h-4 w-4" />
										<span>Mode Edit: OFF</span>
									</>
								)}
							</button>
						)}
						<button
							onClick={handleRefresh}
							disabled={refreshing}
							className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							<LuLoader
								className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
							/>
							<span>{refreshing ? "Memuat..." : "Refresh"}</span>
						</button>
					</div>
				</div>
				<p className="text-gray-600">
					Informasi lengkap kelembagaan di setiap desa meliputi RW, RT,
					Posyandu, Karang Taruna, LPM, dan Satlinmas (hanya kelembagaan dan
					pengurus yang aktif)
				</p>
				{canToggleEdit && (
					<div className={`mt-3 p-3 rounded-lg border ${
						isEditMode 
							? "bg-green-50 border-green-200" 
							: "bg-gray-50 border-gray-200"
					}`}>
						<p className="text-sm font-medium">
							{isEditMode ? (
								<span className="text-green-700">
									✓ Mode Edit Aktif - Desa dapat menambah dan mengedit data kelembagaan & pengurus
								</span>
							) : (
								<span className="text-gray-700">
									⚠ Mode Edit Nonaktif - Tombol tambah dan edit tidak akan ditampilkan untuk desa
								</span>
							)}
						</p>
					</div>
				)}
			</div>

			{/* Summary Cards */}
			{summaryData && (
				<div className="space-y-6">
					{/* Overview Cards */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						<div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm p-6 text-white">
							<div className="flex items-center justify-between">
								<div>
									<div className="text-2xl font-bold">
										{summaryData.overview.kecamatan}
									</div>
									<div className="text-blue-100">Total Kecamatan</div>
								</div>
								<LuBuilding2 className="h-8 w-8 text-blue-200" />
							</div>
						</div>

						<div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-sm p-6 text-white">
							<div className="flex items-center justify-between">
								<div>
									<div className="text-2xl font-bold">
										{summaryData.overview.desa}
									</div>
									<div className="text-green-100">Total Desa</div>
								</div>
								<LuHouse className="h-8 w-8 text-green-200" />
							</div>
						</div>

						<div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-sm p-6 text-white">
							<div className="flex items-center justify-between">
								<div>
									<div className="text-2xl font-bold">
										{summaryData.overview.kelurahan}
									</div>
									<div className="text-purple-100">Total Kelurahan</div>
								</div>
								<LuBuilding2 className="h-8 w-8 text-purple-200" />
							</div>
						</div>

						<div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-sm p-6 text-white">
							<div className="flex items-center justify-between">
								<div>
									<div className="text-2xl font-bold">
										{summaryData.overview.desa_kelurahan_total}
									</div>
									<div className="text-indigo-100">Total Desa & Kelurahan</div>
								</div>
								<LuMapPin className="h-8 w-8 text-indigo-200" />
							</div>
						</div>
					</div>

					{/* Kelembagaan Statistics */}
					<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
							<LuUsers className="h-5 w-5 text-blue-600" />
							Statistik Kelembagaan Kabupaten
						</h2>

						<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
							<div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
								<div className="text-2xl font-bold text-purple-600">
									{summaryData.total_kelembagaan.rw}
								</div>
								<div className="text-sm text-purple-700 font-medium">
									Total RW
								</div>
								{summaryData.total_pengurus && (
									<div className="text-xs text-purple-600 mt-1">
										{summaryData.total_pengurus.rw} Pengurus
									</div>
								)}
							</div>
							<div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
								<div className="text-2xl font-bold text-green-600">
									{summaryData.total_kelembagaan.rt}
								</div>
								<div className="text-sm text-green-700 font-medium">
									Total RT
								</div>
								{summaryData.total_pengurus && (
									<div className="text-xs text-green-600 mt-1">
										{summaryData.total_pengurus.rt} Pengurus
									</div>
								)}
							</div>
							<div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
								<div className="text-2xl font-bold text-red-600">
									{summaryData.total_kelembagaan.posyandu}
								</div>
								<div className="text-sm text-red-700 font-medium">
									Total Posyandu
								</div>
								{summaryData.total_pengurus && (
									<div className="text-xs text-red-600 mt-1">
										{summaryData.total_pengurus.posyandu} Pengurus
									</div>
								)}
							</div>
							<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
								<div className="text-2xl font-bold text-blue-600">
									{summaryData.total_kelembagaan.karangTaruna}
								</div>
								<div className="text-sm text-blue-700 font-medium">
									Karang Taruna
								</div>
								<div className="text-xs text-blue-600 mt-1">
									{summaryData.formation_stats.karangTaruna.persentase}%
									Terbentuk
								</div>
								{summaryData.total_pengurus && (
									<div className="text-xs text-blue-500 font-semibold">
										{summaryData.total_pengurus.karangTaruna} Pengurus
									</div>
								)}
							</div>
							<div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-center">
								<div className="text-2xl font-bold text-indigo-600">
									{summaryData.total_kelembagaan.lpm}
								</div>
								<div className="text-sm text-indigo-700 font-medium">LPM</div>
								<div className="text-xs text-indigo-600 mt-1">
									{summaryData.formation_stats.lpm.persentase}% Terbentuk
								</div>
								{summaryData.total_pengurus && (
									<div className="text-xs text-indigo-500 font-semibold">
										{summaryData.total_pengurus.lpm} Pengurus
									</div>
								)}
							</div>
							<div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
								<div className="text-2xl font-bold text-orange-600">
									{summaryData.total_kelembagaan.satlinmas}
								</div>
								<div className="text-sm text-orange-700 font-medium">
									Satlinmas
								</div>
								<div className="text-xs text-orange-600 mt-1">
									{summaryData.formation_stats.satlinmas.persentase}% Terbentuk
								</div>
								{summaryData.total_pengurus && (
									<div className="text-xs text-orange-500 font-semibold">
										{summaryData.total_pengurus.satlinmas} Pengurus
									</div>
								)}
							</div>
						</div>

						{/* Breakdown by Desa vs Kelurahan */}
						<div className="grid md:grid-cols-2 gap-6">
							{/* Desa Statistics */}
							<div className="bg-green-50 border border-green-200 rounded-lg p-4">
								<h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
									<LuHouse className="h-5 w-5" />
									Statistik Desa ({summaryData.by_status.desa.count})
								</h3>
								<div className="grid grid-cols-2 gap-3">
									<div className="text-center p-2 bg-white rounded border">
										<div className="text-lg font-bold text-green-700">
											{summaryData.by_status.desa.rw}
										</div>
										<div className="text-xs text-green-600 mb-1">RW</div>
										{summaryData.by_status.desa.pengurus && (
											<div className="text-xs text-green-500 font-semibold">
												{summaryData.by_status.desa.pengurus.rw} Pengurus
											</div>
										)}
									</div>
									<div className="text-center p-2 bg-white rounded border">
										<div className="text-lg font-bold text-green-700">
											{summaryData.by_status.desa.rt}
										</div>
										<div className="text-xs text-green-600 mb-1">RT</div>
										{summaryData.by_status.desa.pengurus && (
											<div className="text-xs text-green-500 font-semibold">
												{summaryData.by_status.desa.pengurus.rt} Pengurus
											</div>
										)}
									</div>
									<div className="text-center p-2 bg-white rounded border">
										<div className="text-lg font-bold text-green-700">
											{summaryData.by_status.desa.posyandu}
										</div>
										<div className="text-xs text-green-600 mb-1">Posyandu</div>
										{summaryData.by_status.desa.pengurus && (
											<div className="text-xs text-green-500 font-semibold">
												{summaryData.by_status.desa.pengurus.posyandu} Pengurus
											</div>
										)}
									</div>
									<div className="text-center p-2 bg-white rounded border">
										<div className="text-lg font-bold text-green-700">
											{summaryData.by_status.desa.karangTaruna}
										</div>
										<div className="text-xs text-green-600 mb-1">
											Karang Taruna
										</div>
										{summaryData.by_status.desa.pengurus && (
											<div className="text-xs text-green-500 font-semibold">
												{summaryData.by_status.desa.pengurus.karangTaruna}{" "}
												Pengurus
											</div>
										)}
									</div>
									<div className="text-center p-2 bg-white rounded border">
										<div className="text-lg font-bold text-green-700">
											{summaryData.by_status.desa.lpm}
										</div>
										<div className="text-xs text-green-600 mb-1">LPM</div>
										{summaryData.by_status.desa.pengurus && (
											<div className="text-xs text-green-500 font-semibold">
												{summaryData.by_status.desa.pengurus.lpm} Pengurus
											</div>
										)}
									</div>
									<div className="text-center p-2 bg-white rounded border">
										<div className="text-lg font-bold text-green-700">
											{summaryData.by_status.desa.satlinmas}
										</div>
										<div className="text-xs text-green-600 mb-1">Satlinmas</div>
										{summaryData.by_status.desa.pengurus && (
											<div className="text-xs text-green-500 font-semibold">
												{summaryData.by_status.desa.pengurus.satlinmas} Pengurus
											</div>
										)}
									</div>
								</div>
							</div>

							{/* Kelurahan Statistics */}
							<div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
								<h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
									<LuBuilding2 className="h-5 w-5" />
									Statistik Kelurahan ({summaryData.by_status.kelurahan.count})
								</h3>
								<div className="grid grid-cols-2 gap-3">
									<div className="text-center p-2 bg-white rounded border">
										<div className="text-lg font-bold text-purple-700">
											{summaryData.by_status.kelurahan.rw}
										</div>
										<div className="text-xs text-purple-600 mb-1">RW</div>
										{summaryData.by_status.kelurahan.pengurus && (
											<div className="text-xs text-purple-500 font-semibold">
												{summaryData.by_status.kelurahan.pengurus.rw} Pengurus
											</div>
										)}
									</div>
									<div className="text-center p-2 bg-white rounded border">
										<div className="text-lg font-bold text-purple-700">
											{summaryData.by_status.kelurahan.rt}
										</div>
										<div className="text-xs text-purple-600 mb-1">RT</div>
										{summaryData.by_status.kelurahan.pengurus && (
											<div className="text-xs text-purple-500 font-semibold">
												{summaryData.by_status.kelurahan.pengurus.rt} Pengurus
											</div>
										)}
									</div>
									<div className="text-center p-2 bg-white rounded border">
										<div className="text-lg font-bold text-purple-700">
											{summaryData.by_status.kelurahan.posyandu}
										</div>
										<div className="text-xs text-purple-600 mb-1">Posyandu</div>
										{summaryData.by_status.kelurahan.pengurus && (
											<div className="text-xs text-purple-500 font-semibold">
												{summaryData.by_status.kelurahan.pengurus.posyandu}{" "}
												Pengurus
											</div>
										)}
									</div>
									<div className="text-center p-2 bg-white rounded border">
										<div className="text-lg font-bold text-purple-700">
											{summaryData.by_status.kelurahan.karangTaruna}
										</div>
										<div className="text-xs text-purple-600 mb-1">
											Karang Taruna
										</div>
										{summaryData.by_status.kelurahan.pengurus && (
											<div className="text-xs text-purple-500 font-semibold">
												{summaryData.by_status.kelurahan.pengurus.karangTaruna}{" "}
												Pengurus
											</div>
										)}
									</div>
									<div className="text-center p-2 bg-white rounded border">
										<div className="text-lg font-bold text-purple-700">
											{summaryData.by_status.kelurahan.lpm}
										</div>
										<div className="text-xs text-purple-600 mb-1">LPM</div>
										{summaryData.by_status.kelurahan.pengurus && (
											<div className="text-xs text-purple-500 font-semibold">
												{summaryData.by_status.kelurahan.pengurus.lpm} Pengurus
											</div>
										)}
									</div>
									<div className="text-center p-2 bg-white rounded border">
										<div className="text-lg font-bold text-purple-700">
											{summaryData.by_status.kelurahan.satlinmas}
										</div>
										<div className="text-xs text-purple-600 mb-1">
											Satlinmas
										</div>
										{summaryData.by_status.kelurahan.pengurus && (
											<div className="text-xs text-purple-500 font-semibold">
												{summaryData.by_status.kelurahan.pengurus.satlinmas}{" "}
												Pengurus
											</div>
										)}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Kecamatan Accordion */}
			<div className="space-y-4">
				{kecamatanData.map((kecamatan) => (
					<div
						key={kecamatan.id}
						className="bg-white rounded-lg shadow-sm border border-gray-200"
					>
						{/* Kecamatan Header */}
						<button
							onClick={() => toggleKecamatan(kecamatan.id)}
							className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
						>
							<div className="flex items-center gap-4">
								<LuBuilding2 className="h-5 w-5 text-blue-600" />
								<div>
									<h3 className="text-lg font-semibold text-gray-900">
										Kecamatan {kecamatan.nama}
									</h3>
									<p className="text-sm text-gray-600">
										{kecamatan.desas.length} Desa/Kelurahan
									</p>
								</div>
							</div>
							<div className="flex items-center gap-6">
								{/* Summary Stats */}
								<div className="hidden md:flex items-center gap-4 text-sm">
									<div className="flex items-center gap-1">
										<LuUsers className="h-4 w-4 text-purple-600" />
										<span>RW: {kecamatan.totalKelembagaan.rw}</span>
									</div>
									<div className="flex items-center gap-1">
										<LuMapPin className="h-4 w-4 text-green-600" />
										<span>RT: {kecamatan.totalKelembagaan.rt}</span>
									</div>
									<div className="flex items-center gap-1">
										<LuHeart className="h-4 w-4 text-red-600" />
										<span>Posyandu: {kecamatan.totalKelembagaan.posyandu}</span>
									</div>
								</div>
								{expandedKecamatan[kecamatan.id] ? (
									<LuChevronUp className="h-5 w-5 text-gray-500" />
								) : (
									<LuChevronDown className="h-5 w-5 text-gray-500" />
								)}
							</div>
						</button>

						{/* Kecamatan Content */}
						{expandedKecamatan[kecamatan.id] && (
							<div className="border-t border-gray-200">
								{/* Summary Table for Kecamatan */}
								<div className="p-6 bg-gray-50">
									<h4 className="text-md font-semibold text-gray-800 mb-4">
										Ringkasan Kelembagaan Kecamatan
									</h4>
									<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
										<div className="bg-white p-4 rounded-lg border text-center">
											<div className="text-2xl font-bold text-purple-600">
												{kecamatan.totalKelembagaan.rw}
											</div>
											<div className="text-sm text-gray-600 mb-1">RW</div>
											{kecamatan.totalPengurus && (
												<div className="text-xs text-purple-500 font-semibold">
													{kecamatan.totalPengurus.rw} Pengurus
												</div>
											)}
										</div>
										<div className="bg-white p-4 rounded-lg border text-center">
											<div className="text-2xl font-bold text-green-600">
												{kecamatan.totalKelembagaan.rt}
											</div>
											<div className="text-sm text-gray-600 mb-1">RT</div>
											{kecamatan.totalPengurus && (
												<div className="text-xs text-green-500 font-semibold">
													{kecamatan.totalPengurus.rt} Pengurus
												</div>
											)}
										</div>
										<div className="bg-white p-4 rounded-lg border text-center">
											<div className="text-2xl font-bold text-red-600">
												{kecamatan.totalKelembagaan.posyandu}
											</div>
											<div className="text-sm text-gray-600 mb-1">Posyandu</div>
											{kecamatan.totalPengurus && (
												<div className="text-xs text-red-500 font-semibold">
													{kecamatan.totalPengurus.posyandu} Pengurus
												</div>
											)}
										</div>
										<div className="bg-white p-4 rounded-lg border text-center">
											<div className="text-2xl font-bold text-blue-600">
												{kecamatan.totalKelembagaan.karangTaruna}
											</div>
											<div className="text-sm text-gray-600 mb-1">
												Karang Taruna
											</div>
											{kecamatan.totalPengurus && (
												<div className="text-xs text-blue-500 font-semibold">
													{kecamatan.totalPengurus.karangTaruna} Pengurus
												</div>
											)}
										</div>
										<div className="bg-white p-4 rounded-lg border text-center">
											<div className="text-2xl font-bold text-indigo-600">
												{kecamatan.totalKelembagaan.lpm}
											</div>
											<div className="text-sm text-gray-600 mb-1">LPM</div>
											{kecamatan.totalPengurus && (
												<div className="text-xs text-indigo-500 font-semibold">
													{kecamatan.totalPengurus.lpm} Pengurus
												</div>
											)}
										</div>
										<div className="bg-white p-4 rounded-lg border text-center">
											<div className="text-2xl font-bold text-orange-600">
												{kecamatan.totalKelembagaan.satlinmas}
											</div>
											<div className="text-sm text-gray-600 mb-1">
												Satlinmas
											</div>
											{kecamatan.totalPengurus && (
												<div className="text-xs text-orange-500 font-semibold">
													{kecamatan.totalPengurus.satlinmas} Pengurus
												</div>
											)}
										</div>
									</div>
								</div>

								{/* Desa Table */}
								<div className="p-6">
									<h4 className="text-md font-semibold text-gray-800 mb-4">
										Detail Per Desa/Kelurahan
									</h4>
									<div className="overflow-x-auto">
										<table className="w-full border-collapse border border-gray-300">
											<thead>
												<tr className="bg-gray-100">
													<th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-800">
														Desa/Kelurahan
													</th>
													<th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-800">
														Status
													</th>
													<th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-800">
														RW
													</th>
													<th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-800">
														RT
													</th>
													<th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-800">
														Posyandu
													</th>
													<th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-800">
														Karang Taruna
													</th>
													<th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-800">
														LPM
													</th>
													<th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-800">
														Satlinmas
													</th>
												</tr>
											</thead>
											<tbody>
												{kecamatan.desas.map((desa) => (
													<tr
														key={desa.id}
														className="hover:bg-blue-50 cursor-pointer transition-colors"
														onClick={() => handleDesaClick(desa.id)}
														title={`Klik untuk melihat detail kelembagaan ${desa.nama}`}
													>
														<td className="border border-gray-300 px-4 py-3">
															<div className="flex items-center gap-2">
																<LuHouse className="h-4 w-4 text-gray-500" />
																<span className="font-medium text-blue-600 hover:text-blue-800">
																	{desa.nama}
																</span>
															</div>
														</td>
														<td className="border border-gray-300 px-4 py-3 text-center">
															<span
																className={`px-2 py-1 text-xs rounded-full ${
																	desa.status === "kelurahan"
																		? "bg-purple-100 text-purple-800"
																		: "bg-green-100 text-green-800"
																}`}
															>
																{desa.status === "kelurahan"
																	? "Kelurahan"
																	: "Desa"}
															</span>
														</td>
														<td className="border border-gray-300 px-4 py-3 text-center font-semibold text-purple-600">
															{desa.kelembagaan?.rw || 0}
														</td>
														<td className="border border-gray-300 px-4 py-3 text-center font-semibold text-green-600">
															{desa.kelembagaan?.rt || 0}
														</td>
														<td className="border border-gray-300 px-4 py-3 text-center font-semibold text-red-600">
															{desa.kelembagaan?.posyandu || 0}
														</td>
														<td className="border border-gray-300 px-4 py-3 text-center">
															<StatusBadge
																status={desa.kelembagaan?.karangTaruna || "Belum Terbentuk"}
															/>
														</td>
														<td className="border border-gray-300 px-4 py-3 text-center">
															<StatusBadge status={desa.kelembagaan?.lpm || "Belum Terbentuk"} />
														</td>
														<td className="border border-gray-300 px-4 py-3 text-center">
															<StatusBadge
																status={desa.kelembagaan?.satlinmas || "Belum Terbentuk"}
															/>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</div>
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
};

export default Kelembagaan;
