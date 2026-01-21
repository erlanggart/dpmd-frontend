import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
	getPengurusByKelembagaan,
	getPengurusHistory,
} from "../../../services/pengurus";
import { useAuth } from "../../../context/AuthContext";
import { useEditMode } from "../../../context/EditModeContext";
import {
	LuUsers,
	LuPlus,
	LuHistory,
	LuEye,
	LuEyeOff,
	LuCrown,
	LuUser,
	LuMail,
	LuPhone,
	LuMapPin,
	LuChevronDown,
	LuChevronUp,
	LuCalendar,
	LuBadgeCheck,
	LuUserX,
	LuAward,
	LuUserRoundCog,
	LuUserRoundCheck,
} from "react-icons/lu";
import {
	getJabatanList,
	getDisplayJabatan,
	getJabatanColor,
} from "../../../constants/jabatanMapping";

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

// Helper function to determine correct routing based on user role
// Uses same logic pattern as AuthContext helpers
const getPengurusRoutePath = (user, pengurusId) => {
	// Check if user is superadmin
	const isSuperAdminRole = user?.role === "superadmin";

	// Check if user is admin bidang PMD (kepala_bidang or pegawai with bidang_id = 5)
	const isAdminBidangRole =
		(user?.role === "kepala_bidang" || user?.role === "pegawai") &&
		user?.bidang_id === 5;

	if (isSuperAdminRole || isAdminBidangRole) {
		return `/bidang/pmd/pengurus/${pengurusId}`;
	}

	// Default for desa users
	return `/desa/pengurus/${pengurusId}`;
};

// Komponen untuk kartu jabatan individual
const JabatanCard = ({ jabatan, pengurusList, user }) => {
	const [isExpanded, setIsExpanded] = useState(true);

	const getJabatanIcon = (jabatanName) => {
		const lowerJabatan = jabatanName.toLowerCase();
		if (lowerJabatan.includes("bidang"))
			return <LuUserRoundCheck className="w-5 h-5" />;
		if (
			lowerJabatan.includes("ketua") &&
			!lowerJabatan.includes("wakil") &&
			!lowerJabatan.includes("kepala")
		)
			return <LuCrown className="w-5 h-5" />;

		if (lowerJabatan.includes("sekretaris"))
			return <LuUser className="w-5 h-5" />;
		if (lowerJabatan.includes("bendahara"))
			return <LuUser className="w-5 h-5" />;
		if (
			lowerJabatan.includes("koordinator") ||
			lowerJabatan.includes("komandan")
		)
			return <LuUser className="w-5 h-5" />;
		return <LuUser className="w-5 h-5" />;
	};

	return (
		<div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
			{/* Header Jabatan */}
			<div
				className="flex items-center justify-between p-4 cursor-pointer"
				onClick={() => setIsExpanded(!isExpanded)}
			>
				<div className="flex items-center space-x-3">
					<div
						className={`w-10 h-10 bg-gradient-to-br ${getJabatanColor(jabatan)} rounded-lg flex items-center justify-center text-white shadow-md`}
					>
						{getJabatanIcon(jabatan)}
					</div>
					<div>
						<h5 className="font-semibold text-gray-900">
							{getDisplayJabatan(jabatan)}
						</h5>
						<p className="text-sm text-gray-500">
							{pengurusList.length > 0
								? `${pengurusList.length} Pengurus`
								: "Belum ada pengurus"}
						</p>
					</div>
				</div>

				<div className="flex items-center space-x-3">
					{pengurusList.length > 0 && (
						<span className="px-3 py-1 bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 text-xs font-medium rounded-full">
							{pengurusList.length} Aktif
						</span>
					)}
					{isExpanded ? (
						<LuChevronUp className="w-5 h-5 text-gray-400" />
					) : (
						<LuChevronDown className="w-5 h-5 text-gray-400" />
					)}
				</div>
			</div>

			{/* Daftar Pengurus */}
			{isExpanded && (
				<div className="border-t border-gray-100">
					{pengurusList.length > 0 ? (
						<div className="divide-y divide-gray-50">
							{pengurusList.map((pengurus, index) => (
								<PengurusItem
									key={pengurus.id || index}
									pengurus={pengurus}
									user={user}
								/>
							))}
						</div>
					) : (
						<div className="p-6 text-center">
							<div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
								<LuUserX className="w-6 h-6 text-gray-400" />
							</div>
							<p className="text-sm text-gray-500">
								Belum ada pengurus untuk jabatan ini
							</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

// Komponen untuk item pengurus individual
const PengurusItem = ({ pengurus, user }) => {
	return (
		<div className="group p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200">
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-4">
					{/* Avatar */}
					{pengurus.avatar ? (
						<img
							src={`${imageBaseUrl}/uploads/${pengurus.avatar}`}
							alt={pengurus.nama_lengkap}
							className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-200 group-hover:ring-blue-300 transition-all duration-200"
						/>
					) : (
						<div className="w-12 h-12 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center ring-2 ring-gray-200 group-hover:ring-blue-300 transition-all duration-200">
							<span className="text-white font-semibold text-sm">
								{pengurus.nama_lengkap.charAt(0).toUpperCase()}
							</span>
						</div>
					)}

					{/* Info Pengurus */}
					<div className="space-y-1">
						<div className="flex items-center space-x-2">
							<h6 className="font-semibold text-gray-800 group-hover:text-blue-800 transition-colors">
								{pengurus.nama_lengkap}
							</h6>
							<span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 shadow-sm">
								<LuBadgeCheck className="w-3 h-3 mr-1" />
								Aktif
							</span>
						</div>

						<div className="flex items-center space-x-4 text-xs text-gray-500">
							{pengurus.tanggal_mulai_jabatan && (
								<div className="flex items-center space-x-1">
									<LuCalendar className="w-3 h-3" />
									<span>
										Mulai{" "}
										{new Date(pengurus.tanggal_mulai_jabatan).getFullYear()}
									</span>
								</div>
							)}
							{pengurus.email && (
								<div className="flex items-center space-x-1">
									<LuMail className="w-3 h-3" />
									<span>{pengurus.email}</span>
								</div>
							)}
							{pengurus.telepon && (
								<div className="flex items-center space-x-1">
									<LuPhone className="w-3 h-3" />
									<span>{pengurus.telepon}</span>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Action Button */}
				<Link
					to={getPengurusRoutePath(user, pengurus.id)}
					className="flex items-center space-x-2 px-4 py-2 text-sm text-blue-600 hover:text-white bg-blue-50 hover:bg-gradient-to-r hover:from-blue-500 hover:to-indigo-600 rounded-lg border border-blue-200 hover:border-blue-500 transform hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md"
				>
					<LuEye className="w-4 h-4" />
					<span className="font-medium">Detail</span>
				</Link>
			</div>
		</div>
	);
};

// Note: Fungsi getJabatanList, getDisplayJabatan, getJabatanColor sudah diimport dari constants/jabatanMapping.js

const PengurusJabatanList = ({
	kelembagaanType,
	kelembagaanId,
	onAddPengurus,

	desaId,
}) => {
	const { user, isSuperAdmin, isAdminBidangPMD, isUserDesa } = useAuth();
	const { isEditMode } = useEditMode();

	const canManagePengurus =
		isSuperAdmin() || isAdminBidangPMD() || isUserDesa();

	// Determine if add button should be shown
	// For admin (superadmin/admin bidang): always show
	// For desa: only show if edit mode is ON
	const showAddButton =
		isSuperAdmin() || isAdminBidangPMD() || (isUserDesa() && isEditMode);

	const [activePengurus, setActivePengurus] = useState([]);
	const [historyPengurus, setHistoryPengurus] = useState([]);
	const [loading, setLoading] = useState(true);
	const [showHistory, setShowHistory] = useState(false);

	const toggleHistory = () => setShowHistory(!showHistory);

	const defaultJabatan = getJabatanList(kelembagaanType);

	useEffect(() => {
		const loadPengurus = async () => {
			if (!kelembagaanId || !kelembagaanType) return;

			setLoading(true);
			try {
				// Pass desaId for admin access
				const adminDesaId =
					isSuperAdmin() || isAdminBidangPMD() ? desaId : null;
				const [activeResponse, historyResponse] = await Promise.all([
					getPengurusByKelembagaan(kelembagaanType, kelembagaanId, adminDesaId),
					getPengurusHistory(kelembagaanType, kelembagaanId, adminDesaId),
				]);

				setActivePengurus(activeResponse?.data?.data || []);
				setHistoryPengurus(historyResponse?.data?.data || []);
			} catch (error) {
				console.error("Error loading pengurus:", error);
				setActivePengurus([]);
				setHistoryPengurus([]);
			} finally {
				setLoading(false);
			}
		};

		loadPengurus();
	}, [kelembagaanType, kelembagaanId, desaId, isSuperAdmin, isAdminBidangPMD]);
	// Buat mapping jabatan dengan pengurus
	const jabatanMap = {};
	defaultJabatan.forEach((jabatan) => {
		jabatanMap[jabatan] = activePengurus.filter(
			(pengurus) => pengurus.jabatan === jabatan,
		);
	});

	if (loading) {
		return (
			<div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-gray-200 shadow-lg">
				<div className="h-1.5 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-t-2xl"></div>
				<div className="p-6">
					<div className="flex items-center space-x-4 mb-6">
						<div className="w-14 h-14 bg-gray-200 rounded-xl animate-pulse"></div>
						<div>
							<div className="h-6 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
							<div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
						</div>
					</div>
					<div className="text-center py-8 text-gray-500">
						Memuat data pengurus...
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
			{/* Header dengan gradient accent */}
			<div className="h-1.5 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-t-2xl"></div>

			<div className="p-6 border-b border-gray-200">
				<div className="flex justify-between items-center">
					<div className="flex items-center space-x-4">
						<div className="w-14 h-14 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg">
							<LuUsers className="w-7 h-7" />
						</div>
						<div>
							<h3 className="text-2xl font-bold text-gray-800">
								Struktur Pengurus
							</h3>
							<p className="text-sm text-gray-500 mt-1">
								Daftar jabatan dan pengurus aktif •{" "}
								{Object.keys(jabatanMap).length} Jabatan
							</p>
						</div>
					</div>
					<div className="flex space-x-3">
						{historyPengurus.length > 0 && (
							<button
								onClick={toggleHistory}
								className="flex items-center space-x-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 shadow-sm"
							>
								{showHistory ? (
									<LuEyeOff className="w-4 h-4" />
								) : (
									<LuEye className="w-4 h-4" />
								)}
								<span className="text-sm font-medium">
									{showHistory ? "Sembunyikan" : "Lihat"} History
								</span>
							</button>
						)}
						{canManagePengurus && showAddButton && (
							<button
								onClick={() => onAddPengurus?.()}
								className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
							>
								<LuPlus className="w-4 h-4" />
								<span className="font-medium">Tambah Pengurus</span>
							</button>
						)}
					</div>
				</div>
			</div>

			<div className="p-6">
				{/* Active Pengurus */}
				<div className="grid gap-4">
					{Object.entries(jabatanMap).map(([jabatan, pengurusList]) => (
						<JabatanCard
							key={jabatan}
							jabatan={jabatan}
							pengurusList={pengurusList}
							user={user}
						/>
					))}
				</div>

				{/* Summary History Section */}
				{showHistory && historyPengurus.length > 0 && (
					<div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
						<div className="flex items-center space-x-3 mb-4">
							<div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-lg flex items-center justify-center text-white">
								<LuHistory className="w-5 h-5" />
							</div>
							<div>
								<h4 className="text-lg font-bold text-blue-900">
									Ringkasan Riwayat Pengurus
								</h4>
								<p className="text-sm text-blue-700">
									Total riwayat pengurus yang pernah menjabat
								</p>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4 mb-6">
							<div className="p-4 bg-white rounded-lg shadow-sm border border-green-200">
								<div className="flex items-center space-x-2">
									<LuBadgeCheck className="w-5 h-5 text-green-600" />
									<span className="font-semibold text-green-800">
										Pengurus Aktif
									</span>
								</div>
								<div className="text-2xl font-bold text-green-700 mt-2">
									{activePengurus.length}
								</div>
								<div className="text-sm text-green-600">
									Orang sedang menjabat
								</div>
							</div>

							<div className="p-4 bg-white rounded-lg shadow-sm border border-red-200">
								<div className="flex items-center space-x-2">
									<LuHistory className="w-5 h-5 text-red-600" />
									<span className="font-semibold text-red-800">Riwayat</span>
								</div>
								<div className="text-2xl font-bold text-red-700 mt-2">
									{historyPengurus.length}
								</div>
								<div className="text-sm text-red-600">
									Orang pernah menjabat
								</div>
							</div>
						</div>

						{/* Daftar History Pengurus */}
						<div className="bg-white rounded-xl border border-gray-200 shadow-sm">
							<div className="p-4 bg-gray-50 border-b border-gray-200 rounded-t-xl">
								<h5 className="font-semibold text-gray-800 flex items-center space-x-2">
									<LuHistory className="w-5 h-5" />
									<span>Daftar Pengurus Sebelumnya</span>
								</h5>
							</div>
							<div className="divide-y divide-gray-100">
								{historyPengurus.map((pengurus, index) => (
									<div
										key={`history-${pengurus.id || index}`}
										className="p-4 hover:bg-gray-50 transition-colors duration-200"
									>
										<div className="flex items-center justify-between">
											<div className="flex items-center space-x-4">
												{/* Avatar */}
												{pengurus.avatar ? (
													<img
														src={`${imageBaseUrl}/uploads/${pengurus.avatar}`}
														alt={pengurus.nama_lengkap}
														className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 opacity-75"
													/>
												) : (
													<div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center opacity-75">
														<span className="text-white font-semibold text-sm">
															{pengurus.nama_lengkap
																?.charAt(0)
																?.toUpperCase() || "?"}
														</span>
													</div>
												)}

												{/* Info Pengurus */}
												<div className="space-y-1">
													<div className="flex items-center space-x-2">
														<h6 className="font-semibold text-gray-800">
															{pengurus.nama_lengkap}
														</h6>
														<span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gradient-to-r from-red-100 to-red-200 text-red-700 shadow-sm">
															<LuHistory className="w-3 h-3 mr-1" />
															Selesai Menjabat
														</span>
													</div>

													<div className="flex items-center space-x-4 text-xs text-gray-600">
														<div className="flex items-center space-x-1">
															<LuCrown className="w-3 h-3" />
															<span className="font-medium">
																{pengurus.jabatan}
															</span>
														</div>
														{pengurus.tanggal_mulai_jabatan &&
															pengurus.tanggal_akhir_jabatan && (
																<div className="flex items-center space-x-1">
																	<LuCalendar className="w-3 h-3" />
																	<span>
																		{new Date(
																			pengurus.tanggal_mulai_jabatan,
																		).getFullYear()}{" "}
																		-{" "}
																		{new Date(
																			pengurus.tanggal_akhir_jabatan,
																		).getFullYear()}
																	</span>
																</div>
															)}
														{pengurus.email && (
															<div className="flex items-center space-x-1">
																<LuMail className="w-3 h-3" />
																<span>{pengurus.email}</span>
															</div>
														)}
													</div>
												</div>
											</div>

											{/* Action Button */}
											<Link
												to={getPengurusRoutePath(user, pengurus.id)}
												className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 rounded-lg border border-gray-200 hover:border-blue-200 transition-all duration-200"
											>
												<LuEye className="w-4 h-4" />
												<span>Detail</span>
											</Link>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default PengurusJabatanList;
