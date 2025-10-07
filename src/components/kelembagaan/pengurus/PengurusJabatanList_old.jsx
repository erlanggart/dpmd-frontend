import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
	getPengurusByKelembagaan,
	getPengurusHistory,
} from "../../../services/pengurus";
import { useAuth } from "../../../context/AuthContext";
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
} from "react-icons/lu";

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

// Komponen untuk kartu jabatan individual
const JabatanCard = ({ jabatan, pengurusList, getDisplayJabatan }) => {
	const [isExpanded, setIsExpanded] = useState(true);
	
	const getJabatanIcon = (jabatanName) => {
		const lowerJabatan = jabatanName.toLowerCase();
		if (lowerJabatan.includes('ketua')) return <LuCrown className="w-5 h-5" />;
		if (lowerJabatan.includes('sekretaris')) return <LuUser className="w-5 h-5" />;
		if (lowerJabatan.includes('bendahara')) return <LuUser className="w-5 h-5" />;
		if (lowerJabatan.includes('koordinator') || lowerJabatan.includes('komandan')) return <LuUser className="w-5 h-5" />;
		return <LuUser className="w-5 h-5" />;
	};

	const getJabatanColor = (jabatanName) => {
		const lowerJabatan = jabatanName.toLowerCase();
		if (lowerJabatan.includes('ketua')) return 'from-yellow-400 to-orange-500';
		if (lowerJabatan.includes('wakil')) return 'from-blue-400 to-indigo-500';
		if (lowerJabatan.includes('sekretaris')) return 'from-green-400 to-emerald-500';
		if (lowerJabatan.includes('bendahara')) return 'from-purple-400 to-violet-500';
		return 'from-gray-400 to-slate-500';
	};

	return (
		<div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
			{/* Header Jabatan */}
			<div 
				className="flex items-center justify-between p-4 cursor-pointer"
				onClick={() => setIsExpanded(!isExpanded)}
			>
				<div className="flex items-center space-x-3">
					<div className={`w-10 h-10 bg-gradient-to-br ${getJabatanColor(jabatan)} rounded-lg flex items-center justify-center text-white shadow-md`}>
						{getJabatanIcon(jabatan)}
					</div>
					<div>
						<h5 className="font-semibold text-gray-900">
							{getDisplayJabatan(jabatan)}
						</h5>
						<p className="text-sm text-gray-500">
							{pengurusList.length > 0 ? `${pengurusList.length} Pengurus` : 'Belum ada pengurus'}
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
								<PengurusItem key={pengurus.id || index} pengurus={pengurus} />
							))}
						</div>
					) : (
						<div className="p-6 text-center">
							<div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
								<LuUserX className="w-6 h-6 text-gray-400" />
							</div>
							<p className="text-sm text-gray-500">Belum ada pengurus untuk jabatan ini</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

// Komponen untuk item pengurus individual
const PengurusItem = ({ pengurus }) => {
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
									<span>Mulai {new Date(pengurus.tanggal_mulai_jabatan).getFullYear()}</span>
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
					to={`/desa/pengurus/${pengurus.id}`}
					className="flex items-center space-x-2 px-4 py-2 text-sm text-blue-600 hover:text-white bg-blue-50 hover:bg-gradient-to-r hover:from-blue-500 hover:to-indigo-600 rounded-lg border border-blue-200 hover:border-blue-500 transform hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md"
				>
					<LuEye className="w-4 h-4" />
					<span className="font-medium">Detail</span>
				</Link>
			</div>
		</div>
	);
};

// Default jabatan untuk setiap tipe kelembagaan
const getDefaultJabatan = (kelembagaanType) => {
	const jabatanMap = {
		"karang-taruna": [
			"Ketua Karang Taruna",
			"Wakil Ketua Karang Taruna",
			"Sekretaris Karang Taruna",
			"Bendahara Karang Taruna",
			"Koordinator Bidang Olahraga",
			"Koordinator Bidang Seni dan Budaya",
			"Koordinator Bidang Usaha",
			"Koordinator Bidang Lingkungan",
		],
		lpm: [
			"Ketua LPM",
			"Wakil Ketua LPM",
			"Sekretaris LPM",
			"Bendahara LPM",
			"Koordinator Ekonomi",
			"Koordinator Sosial Budaya",
			"Koordinator Lingkungan Hidup",
		],
		pkk: [
			"Ketua PKK",
			"Wakil Ketua PKK",
			"Sekretaris PKK",
			"Bendahara PKK",
			"Koordinator Pokja I",
			"Koordinator Pokja II",
			"Koordinator Pokja III",
			"Koordinator Pokja IV",
		],
		satlinmas: [
			"Komandan Satlinmas",
			"Wakil Komandan Satlinmas",
			"Sekretaris Satlinmas",
			"Bendahara Satlinmas",
			"Koordinator Operasional",
			"Koordinator Logistik",
			"Anggota Satlinmas",
		],
		rw: ["Ketua RW", "Wakil Ketua RW", "Sekretaris RW", "Bendahara RW"],
		rt: ["Ketua RT", "Wakil Ketua RT", "Sekretaris RT", "Bendahara RT"],
		posyandu: [
			"Ketua Posyandu",
			"Wakil Ketua Posyandu",
			"Sekretaris Posyandu",
			"Bendahara Posyandu",
			"Kader Posyandu",
			"Koordinator Kesehatan",
		],
	};

	return (
		jabatanMap[kelembagaanType] || [
			"Ketua",
			"Wakil Ketua",
			"Sekretaris",
			"Bendahara",
		]
	);
};

// Helper function untuk normalisasi jabatan untuk display
const getDisplayJabatan = (jabatan) => {
	// Mapping jabatan dari database ke display name
	const jabatanDisplayMap = {
		// Karang Taruna
		"Ketua Karang Taruna": "Ketua",
		"Wakil Ketua Karang Taruna": "Wakil Ketua",
		"Sekretaris Karang Taruna": "Sekretaris",
		"Bendahara Karang Taruna": "Bendahara",

		// LPM
		"Ketua LPM": "Ketua",
		"Wakil Ketua LPM": "Wakil Ketua",
		"Sekretaris LPM": "Sekretaris",
		"Bendahara LPM": "Bendahara",

		// PKK
		"Ketua PKK": "Ketua",
		"Wakil Ketua PKK": "Wakil Ketua",
		"Sekretaris PKK": "Sekretaris",
		"Bendahara PKK": "Bendahara",

		// Satlinmas
		"Komandan Satlinmas": "Komandan",
		"Wakil Komandan Satlinmas": "Wakil Komandan",
		"Sekretaris Satlinmas": "Sekretaris",
		"Bendahara Satlinmas": "Bendahara",
		"Anggota Satlinmas": "Anggota",

		// Posyandu
		"Ketua Posyandu": "Ketua",
		"Wakil Ketua Posyandu": "Wakil Ketua",
		"Sekretaris Posyandu": "Sekretaris",
		"Bendahara Posyandu": "Bendahara",
	};

	return jabatanDisplayMap[jabatan] || jabatan;
};

const PengurusJabatanList = ({
	kelembagaanType,
	kelembagaanId,
	onAddPengurus,
	onViewHistory,
}) => {
	const { user } = useAuth();
	const [activePengurus, setActivePengurus] = useState([]);
	const [historyPengurus, setHistoryPengurus] = useState([]);
	const [loading, setLoading] = useState(true);
	const [showHistory, setShowHistory] = useState(false);

	// Pagination state for history
	const [currentHistoryPage, setCurrentHistoryPage] = useState(1);
	const historyPerPage = 5; // Show 5 history items per page

	const isAdmin = user?.role === "admin_kabupaten";
	const isUserDesa = user?.role === "desa";
	const isAdminBidang = user?.role === "pemberdayaan_masyarakat";
	const isSuperAdmin = user?.role === "superadmin";

	const canManagePengurus =
		isAdmin || isUserDesa || isAdminBidang || isSuperAdmin;

	useEffect(() => {
		loadPengurusData();
	}, [kelembagaanType, kelembagaanId]);

	const loadPengurusData = async () => {
		if (!kelembagaanId || !kelembagaanType) return;

		setLoading(true);
		try {
			const [activeRes, historyRes] = await Promise.all([
				getPengurusByKelembagaan(kelembagaanType, kelembagaanId),
				getPengurusHistory(kelembagaanType, kelembagaanId),
			]);

			setActivePengurus(activeRes?.data?.data || []);
			setHistoryPengurus(historyRes?.data?.data || []);
		} catch (error) {
			console.error("Error loading pengurus data:", error);
			setActivePengurus([]);
			setHistoryPengurus([]);
		} finally {
			setLoading(false);
		}
	};

	const defaultJabatan = getDefaultJabatan(kelembagaanType);

	// Create jabatan map with pengurus data - support multiple pengurus per jabatan
	const jabatanMap = {};
	defaultJabatan.forEach((jabatan) => {
		const pengurusWithJabatan = activePengurus.filter(
			(p) => p.jabatan === jabatan
		);
		jabatanMap[jabatan] =
			pengurusWithJabatan.length > 0 ? pengurusWithJabatan : [];
	});

	// Add any extra jabatan not in default list
	activePengurus.forEach((pengurus) => {
		if (!defaultJabatan.includes(pengurus.jabatan)) {
			if (!jabatanMap[pengurus.jabatan]) {
				jabatanMap[pengurus.jabatan] = [];
			}
			jabatanMap[pengurus.jabatan].push(pengurus);
		}
	});

	// Group history pengurus by jabatan
	const historyByJabatan = {};
	historyPengurus.forEach((pengurus) => {
		if (!historyByJabatan[pengurus.jabatan]) {
			historyByJabatan[pengurus.jabatan] = [];
		}
		historyByJabatan[pengurus.jabatan].push(pengurus);
	});

	// Pagination logic for history
	const totalHistoryPages = Math.ceil(historyPengurus.length / historyPerPage);
	const startHistoryIndex = (currentHistoryPage - 1) * historyPerPage;
	const endHistoryIndex = startHistoryIndex + historyPerPage;
	const currentHistoryData = historyPengurus.slice(
		startHistoryIndex,
		endHistoryIndex
	);

	const goToHistoryPage = (pageNumber) => {
		setCurrentHistoryPage(pageNumber);
	};

	const nextHistoryPage = () => {
		if (currentHistoryPage < totalHistoryPages) {
			setCurrentHistoryPage(currentHistoryPage + 1);
		}
	};

	const prevHistoryPage = () => {
		if (currentHistoryPage > 1) {
			setCurrentHistoryPage(currentHistoryPage - 1);
		}
	};

	// Reset pagination when history visibility changes
	const toggleHistory = () => {
		setShowHistory(!showHistory);
		setCurrentHistoryPage(1); // Reset to first page
	};

	if (loading) {
		return (
			<div className="bg-white rounded-lg shadow-sm border p-6">
				<div className="animate-pulse">
					<div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
					<div className="space-y-3">
						{[1, 2, 3, 4].map((i) => (
							<div key={i} className="flex items-center space-x-4">
								<div className="w-12 h-12 bg-gray-200 rounded-full"></div>
								<div className="flex-1">
									<div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
									<div className="h-3 bg-gray-200 rounded w-1/4"></div>
								</div>
							</div>
						))}
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
								Daftar jabatan dan pengurus aktif • {Object.keys(jabatanMap).length} Jabatan
							</p>
						</div>
					</div>
					<div className="flex space-x-3">
						{historyPengurus.length > 0 && (
							<button
								onClick={toggleHistory}
								className="flex items-center space-x-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 shadow-sm"
							>
								{showHistory ? <LuEyeOff className="w-4 h-4" /> : <LuEye className="w-4 h-4" />}
								<span className="text-sm font-medium">
									{showHistory ? "Sembunyikan" : "Lihat"} History
								</span>
							</button>
						)}
						{canManagePengurus && (
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
							getDisplayJabatan={getDisplayJabatan}
						/>
					))}
				</div>

				{/* History Section */}
								{showHistory &&
									historyByJabatan[jabatan] &&
									historyByJabatan[jabatan].length > 0 && (
										<div className="bg-gray-50 border-t border-gray-200">
											<div className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 border-b border-gray-200">
												Riwayat Pengurus ({historyByJabatan[jabatan].length})
											</div>
											{historyByJabatan[jabatan].map((pengurus, index) => (
												<div
													key={`history-${pengurus.id || index}`}
													className="flex items-center justify-between p-3 hover:bg-gray-100"
												>
													<div className="flex items-center space-x-3">
														{pengurus.avatar ? (
															<img
																src={`${imageBaseUrl}/uploads/${pengurus.avatar}`}
																alt={pengurus.nama_lengkap}
																className="w-10 h-10 rounded-full object-cover border border-gray-300 opacity-75"
															/>
														) : (
															<div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center opacity-75">
																<span className="text-white font-medium text-sm">
																	{pengurus.nama_lengkap
																		.charAt(0)
																		.toUpperCase()}
																</span>
															</div>
														)}
														<div>
															<div className="font-medium text-gray-700">
																{pengurus.nama_lengkap}
															</div>
															<div className="text-sm text-gray-500">
																<span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">
																	Selesai
																</span>
																{pengurus.tanggal_mulai_jabatan &&
																	pengurus.tanggal_akhir_jabatan && (
																		<span className="ml-2">
																			•{" "}
																			{new Date(
																				pengurus.tanggal_mulai_jabatan
																			).getFullYear()}{" "}
																			-{" "}
																			{new Date(
																				pengurus.tanggal_akhir_jabatan
																			).getFullYear()}
																		</span>
																	)}
															</div>
														</div>
													</div>
													<div className="flex items-center space-x-2">
														<Link
															to={`/desa/pengurus/${pengurus.id}`}
															className="text-xs text-blue-600 hover:text-blue-800 underline"
														>
															Detail
														</Link>
													</div>
												</div>
											))}
										</div>
									)}
							</div>
						</div>
					))}
				</div>

				{/* Summary History Section */}
				{showHistory && historyPengurus.length > 0 && (
					<div className="mt-8 pt-6 border-t border-gray-200">
						<div className="bg-blue-50 rounded-lg p-4">
							<h4 className="text-md font-semibold text-blue-900 mb-2">
								Ringkasan Riwayat Pengurus
							</h4>
							<p className="text-sm text-blue-700">
								Total {historyPengurus.length} pengurus yang pernah menjabat
								telah ditampilkan di atas berdasarkan jabatan masing-masing.
								Anda dapat melihat perbandingan pengurus aktif dan yang sudah
								selesai menjabat.
							</p>
							<div className="mt-3 grid grid-cols-2 gap-4 text-sm">
								<div className="flex items-center">
									<span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 mr-2">
										Aktif
									</span>
									<span className="text-gray-700">
										{activePengurus.length} orang
									</span>
								</div>
								<div className="flex items-center">
									<span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-700 mr-2">
										Selesai
									</span>
									<span className="text-gray-700">
										{historyPengurus.length} orang
									</span>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default PengurusJabatanList;
