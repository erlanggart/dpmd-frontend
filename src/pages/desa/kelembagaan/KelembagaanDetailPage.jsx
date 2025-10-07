import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import {
	getRw,
	getRt,
	updateRw,
	updateRt,
	listRt,
	createRt,
	getPosyandu,
	updatePosyandu,
	// For singleton-like types fetchers below might not exist; we will fetch list and pick by id as fallback
	listKarangTaruna,
	updateKarangTaruna,
	listLpm,
	updateLpm,
	listPkk,
	updatePkk,
	listSatlinmas,
	updateSatlinmas,
	toggleKelembagaanStatus,
	toggleKelembagaanVerification,
} from "../../../services/kelembagaan";
import PengurusKelembagaan from "../../../components/kelembagaan/PengurusKelembagaan";
import { FaArrowLeft } from "react-icons/fa";
import {
	LuHospital,
	LuHouse,
	LuSettings,
	LuTent,
	LuUsers,
	LuBuilding,
	LuHeartHandshake,
	LuShield,
	LuPlus,
	LuChevronRight,
	LuMapPin,
	LuUserCheck,
	LuUserX,
	LuSave,
	LuX,
	LuCrown,
	LuBadgeCheck,
} from "react-icons/lu";

// Simple Modal for editing alamat and name/nomor
const SimpleModal = ({
	title,
	isOpen,
	onClose,
	children,
	onSubmit,
	submitLabel = "Simpan",
}) => {
	if (!isOpen) return null;
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
			<div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-4">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-lg font-semibold">{title}</h3>
					<button
						onClick={onClose}
						className="text-gray-500 hover:text-gray-700"
					>
						✕
					</button>
				</div>
				<div className="space-y-3">{children}</div>
				<div className="mt-4 flex justify-end gap-2">
					<button className="px-3 py-2 bg-gray-100 rounded" onClick={onClose}>
						Batal
					</button>
					<button
						className="px-3 py-2 bg-indigo-600 text-white rounded"
						onClick={onSubmit}
					>
						{submitLabel}
					</button>
				</div>
			</div>
		</div>
	);
};

// Enhanced ProfilCard with modern design and visual appeal
const ProfilCard = ({
	profil,
	type,
	onEdit,
	role,
	rtCount,
	pengurusCount,
	onToggleStatus,
	onToggleVerification,
}) => {
	const { user } = useAuth();

	const adminDesa = user?.role === "desa";
	const isAdmin = user?.role === "superadmin";
	const adminBidang = user?.role === "pemberdayaan_masyarakat";

	const title = useMemo(() => {
		if (type === "rt") return `RT ${profil?.nomor ?? "-"}`;
		if (type === "rw") return `RW ${profil?.nomor ?? "-"}`;
		return profil?.nama || profil?.nama_lembaga || "-";
	}, [type, profil]);

	// Enhanced status colors with gradients and shadows
	const statusConfig = {
		aktif: {
			badge:
				"bg-gradient-to-r from-emerald-400 to-green-500 text-white shadow-lg",
			indicator: "bg-emerald-500",
			text: "✓ Aktif",
		},
		"tidak aktif": {
			badge: "bg-gradient-to-r from-red-400 to-red-500 text-white shadow-lg",
			indicator: "bg-red-500",
			text: "✗ Tidak Aktif",
		},
	};

	const verificationConfig = {
		verified: {
			badge:
				"bg-gradient-to-r from-blue-400 to-indigo-500 text-white shadow-lg",
			indicator: "bg-blue-500",
			text: "✓ Terverifikasi",
		},
		pending: {
			badge:
				"bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-lg",
			indicator: "bg-yellow-500",
			text: "⏳ Menunggu",
		},
	};

	// Icon mapping for different types
	const typeIcons = {
		rt: {
			icon: <LuTent className="w-8 h-8" />,
			color: "from-blue-400 to-blue-600",
			bg: "from-blue-50 to-blue-100",
		},
		rw: {
			icon: <LuHouse className="w-8 h-8" />,
			color: "from-indigo-400 to-indigo-600",
			bg: "from-indigo-50 to-indigo-100",
		},
		posyandu: {
			icon: <LuHospital className="w-8 h-8" />,
			color: "from-red-400 to-red-600",
			bg: "from-red-50 to-red-100",
		},
		"karang-taruna": {
			icon: <LuUsers className="w-8 h-8" />,
			color: "from-purple-400 to-purple-600",
			bg: "from-purple-50 to-purple-100",
		},
		lpm: {
			icon: <LuBuilding className="w-8 h-8" />,
			color: "from-gray-400 to-gray-600",
			bg: "from-gray-50 to-gray-100",
		},
		pkk: {
			icon: <LuHeartHandshake className="w-8 h-8" />,
			color: "from-pink-400 to-pink-600",
			bg: "from-pink-50 to-pink-100",
		},
		satlinmas: {
			icon: <LuShield className="w-8 h-8" />,
			color: "from-green-400 to-green-600",
			bg: "from-green-50 to-green-100",
		},
		default: {
			icon: "🏢",
			color: "from-slate-400 to-slate-600",
			bg: "from-slate-50 to-slate-100",
		},
	};

	const currentType = typeIcons[type] || typeIcons.default;
	const currentStatus =
		statusConfig[profil?.status_kelembagaan] || statusConfig["tidak aktif"];
	const currentVerification =
		verificationConfig[profil?.status_verifikasi] || verificationConfig.pending;

	return (
		<div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-slate-50 to-gray-100 border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1">
			{/* Animated background pattern */}
			<div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

			{/* Decorative top border */}
			<div className={`h-1.5 bg-gradient-to-r ${currentType.color}`}></div>

			{/* Floating decoration */}
			<div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
				<div className="text-6xl transform rotate-12">{currentType.icon}</div>
			</div>

			<div className="relative p-6 space-y-6">
				{/* Header Section */}
				<div className="flex items-start justify-between">
					<div className="flex items-center space-x-4">
						{/* Icon Avatar */}
						<div
							className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${currentType.color} flex items-center justify-center text-white text-2xl shadow-lg transform group-hover:scale-110 transition-transform duration-300`}
						>
							{currentType.icon}
						</div>

						{/* Title and Status */}
						<div className="space-y-2">
							<div className="flex items-center space-x-3">
								<h2 className="text-2xl font-bold text-gray-800 group-hover:text-gray-900 transition-colors">
									{title}
								</h2>

								{type === "rt" && profil?.rw && (
									<div className="text-sm font-semibold text-gray-600">
										/ RW {profil?.rw.nomor}
									</div>
								)}
							</div>

							{/* Status Badges */}
							<div className="flex flex-wrap gap-2">
								<span
									className={`px-3 py-1.5 text-xs font-semibold rounded-full ${currentStatus.badge} transform hover:scale-105 transition-transform`}
								>
									{currentStatus.text}
								</span>

								{profil?.status_verifikasi && (
									<span
										className={`px-3 py-1.5 text-xs font-semibold rounded-full ${currentVerification.badge} transform hover:scale-105 transition-transform`}
									>
										{currentVerification.text}
									</span>
								)}
							</div>
						</div>
					</div>

					{/* Action Button */}
					<button
						onClick={onEdit}
						className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 font-medium"
					>
						<svg
							className="w-5 h-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
							/>
						</svg>
						<span>Edit</span>
					</button>
				</div>

				{/* Info Section */}
				<div className="space-y-4">
					{/* Address Card */}
					<div
						className={`p-4 rounded-xl bg-gradient-to-r ${currentType.bg} border border-gray-200 hover:shadow-md transition-shadow duration-300`}
					>
						<div className="flex items-start space-x-3">
							<div className="mt-1">
								<LuMapPin className="w-5 h-5 text-gray-600" />
							</div>
							<div className="flex-1">
								<h4 className="font-semibold text-gray-800 text-sm mb-1">
									Alamat
								</h4>
								<p className="text-gray-600 text-sm leading-relaxed">
									{profil?.alamat || "Belum diatur"}
								</p>
							</div>
						</div>
					</div>

					{console.log(type)}
					{/* RW Induk Card - khusus untuk RT */}
					{type === "rt" && profil?.rw && (
						<div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-100 border border-indigo-200 hover:shadow-md transition-shadow duration-300">
							<div className="flex items-start space-x-3">
								<div className="mt-1">
									<LuHouse className="w-5 h-5 text-indigo-600" />
								</div>
								<div className="flex-1">
									<h4 className="font-semibold text-gray-800 text-sm mb-1">
										RW Induk
									</h4>
									<div className="flex items-center space-x-2">
										<span className="text-indigo-700 font-semibold">
											RW {profil.rw.nomor}
										</span>
										{profil.rw.ketua_nama && (
											<>
												<span className="text-gray-400">•</span>
												<div className="flex items-center space-x-1">
													<LuCrown className="w-3 h-3 text-yellow-600" />
													<span className="text-sm text-gray-600">
														{profil.rw.ketua_nama}
													</span>
												</div>
											</>
										)}
									</div>
									{profil.rw.alamat && (
										<div className="mt-1 flex items-center space-x-1">
											<LuMapPin className="w-3 h-3 text-gray-500" />
											<span className="text-xs text-gray-500">
												{profil.rw.alamat}
											</span>
										</div>
									)}
								</div>
							</div>
						</div>
					)}

					{/* Statistics Grid */}
					<div className="grid grid-cols-2 gap-4">
						{type === "rw" && (
							<div className="group/stat p-4 bg-gradient-to-br from-emerald-50 to-green-100 rounded-xl border border-emerald-200 hover:shadow-lg transition-all duration-300 hover:scale-105">
								<div className="text-center">
									<div className="text-3xl font-bold text-emerald-700 mb-1">
										{rtCount ?? 0}
									</div>
									<div className="text-sm font-medium text-emerald-600">RT</div>
									<div className="w-8 h-1 bg-emerald-400 rounded-full mx-auto mt-2 transform group-hover/stat:w-12 transition-all duration-300"></div>
								</div>
							</div>
						)}

						<div className="group/stat p-4 bg-gradient-to-br from-violet-50 to-purple-100 rounded-xl border border-violet-200 hover:shadow-lg transition-all duration-300 hover:scale-105">
							<div className="text-center">
								<div className="text-3xl font-bold text-violet-700 mb-1">
									{pengurusCount ?? 0}
								</div>
								<div className="text-sm font-medium text-violet-600">
									Pengurus
								</div>
								<div className="w-8 h-1 bg-violet-400 rounded-full mx-auto mt-2 transform group-hover/stat:w-12 transition-all duration-300"></div>
							</div>
						</div>
					</div>
				</div>

				{/* Admin Controls */}
				{(adminDesa || adminBidang || isAdmin) && (
					<div className="pt-4 border-t border-gray-200 space-y-4">
						<h4 className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
							<LuSettings className="w-5 h-5 text-gray-600" />
							<span>Kontrol Admin</span>
						</h4>

						<div className="grid gap-3">
							{/* Status Control */}
							{adminDesa && (
								<div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
									<div className="flex items-center space-x-3">
										<div
											className={`w-3 h-3 rounded-full ${currentStatus.indicator} animate-pulse`}
										></div>
										<span className="font-medium text-gray-700">
											Status Kelembagaan
										</span>
									</div>
									<button
										onClick={() =>
											onToggleStatus(profil?.id, profil?.status_kelembagaan)
										}
										className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-lg hover:shadow-xl transform hover:scale-105 ${
											profil?.status_kelembagaan === "aktif"
												? "bg-emerald-500 focus:ring-emerald-500"
												: "bg-gray-300 focus:ring-gray-300"
										}`}
									>
										<span
											className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
												profil?.status_kelembagaan === "aktif"
													? "translate-x-7"
													: "translate-x-1"
											}`}
										/>
									</button>
								</div>
							)}

							{/* Verification Control */}
							{(adminBidang || isAdmin) && (
								<div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
									<div className="flex items-center space-x-3">
										<div
											className={`w-3 h-3 rounded-full ${currentVerification.indicator} animate-pulse`}
										></div>
										<span className="font-medium text-gray-700">
											Status Verifikasi
										</span>
									</div>
									<button
										onClick={() =>
											onToggleVerification(
												profil?.id,
												profil?.status_verifikasi
											)
										}
										className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-lg hover:shadow-xl transform hover:scale-105 ${
											profil?.status_verifikasi === "verified"
												? "bg-blue-500 focus:ring-blue-500"
												: "bg-gray-300 focus:ring-gray-300"
										}`}
									>
										<span
											className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
												profil?.status_verifikasi === "verified"
													? "translate-x-7"
													: "translate-x-1"
											}`}
										/>
									</button>
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

const AnakLembagaCard = ({
	list = [],
	label = "Daftar Anak Lembaga",
	onClickItem,
	onAddRT,
	rwId,
}) => {
	const [isAddingRT, setIsAddingRT] = useState(false);
	const [nomorRT, setNomorRT] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleAddRT = async () => {
		if (!nomorRT.trim()) {
			alert("Nomor RT harus diisi");
			return;
		}

		setIsLoading(true);
		try {
			await onAddRT(nomorRT.trim());
			setNomorRT("");
			setIsAddingRT(false);
		} catch (error) {
			console.error("Error adding RT:", error);
			alert("Gagal menambahkan RT");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
			{/* Header dengan gradient accent */}
			<div className="h-1.5 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-t-2xl"></div>

			<div className="p-6">
				{/* Enhanced Header Section */}
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center space-x-4">
						{/* Animated icon dengan pulse effect */}
						<div className="relative">
							<div className="w-14 h-14 bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
								<LuHouse className="w-7 h-7" />
							</div>
							{/* Pulse animation ring */}
							<div className="absolute inset-0 rounded-2xl bg-emerald-400 opacity-25 animate-pulse"></div>
						</div>
						<div>
							<h3 className="text-2xl font-bold text-gray-800 mb-1">{label}</h3>
							<div className="flex items-center space-x-2 text-sm">
								<span className="text-gray-500">Total:</span>
								<span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full font-semibold">
									{list.length} {list.length === 1 ? "RT" : "RT"}
								</span>
							</div>
						</div>
					</div>

					{rwId && (
						<div className="flex items-center space-x-3">
							<button
								onClick={() => setIsAddingRT(true)}
								className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
							>
								<LuPlus className="w-5 h-5" />
								<span className="font-semibold">Tambah RT</span>
							</button>
						</div>
					)}
				</div>

				{/* Add RT Form */}
				{isAddingRT && (
					<div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
						<div className="flex items-center space-x-3 mb-3">
							<div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white">
								<LuPlus className="w-4 h-4" />
							</div>
							<h4 className="font-semibold text-gray-800">Tambah RT Baru</h4>
						</div>

						<div className="flex items-center gap-3">
							<div className="flex-1">
								<input
									type="text"
									placeholder="Nomor RT (contoh: 001)"
									value={nomorRT}
									onChange={(e) => setNomorRT(e.target.value)}
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
									disabled={isLoading}
								/>
							</div>
							<button
								onClick={handleAddRT}
								disabled={isLoading || !nomorRT.trim()}
								className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md"
							>
								<LuSave className="w-4 h-4" />
								<span>{isLoading ? "..." : "Simpan"}</span>
							</button>
							<button
								onClick={() => {
									setIsAddingRT(false);
									setNomorRT("");
								}}
								className="flex items-center space-x-2 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
							>
								<LuX className="w-4 h-4" />
								<span>Batal</span>
							</button>
						</div>
					</div>
				)}

				{/* Enhanced Content */}
				{list.length === 0 ? (
					<div className="text-center py-16">
						{/* Animated empty state */}
						<div className="relative mx-auto mb-6 w-32 h-32">
							{/* Background circles for depth */}
							<div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full opacity-50"></div>
							<div className="absolute inset-2 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full opacity-30"></div>
							<div className="absolute inset-4 bg-gradient-to-br from-emerald-100 to-green-200 rounded-full flex items-center justify-center">
								<LuHouse className="w-12 h-12 text-gray-400" />
							</div>
							{/* Floating dots animation */}
							<div className="absolute top-0 right-0 w-3 h-3 bg-blue-300 rounded-full animate-bounce"></div>
							<div
								className="absolute bottom-0 left-0 w-2 h-2 bg-green-300 rounded-full animate-bounce"
								style={{ animationDelay: "0.5s" }}
							></div>
						</div>

						<h4 className="text-xl font-bold text-gray-700 mb-3">
							{rwId ? "Belum ada RT" : "Belum ada anak lembaga"}
						</h4>
						<p className="text-gray-500 mb-6 max-w-md mx-auto">
							{rwId
								? "Mulai dengan menambahkan RT pertama untuk RW ini. Setiap RT akan memiliki struktur pengurus sendiri."
								: "Tidak ada data anak lembaga yang tersedia saat ini."}
						</p>

						{rwId && (
							<button
								onClick={() => setIsAddingRT(true)}
								className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
							>
								<LuPlus className="w-5 h-5" />
								<span className="font-semibold">Tambah RT Pertama</span>
							</button>
						)}
					</div>
				) : (
					<div className="space-y-4">
						{/* Header statistik mini */}

						{/* Enhanced RT List */}
						<div className="grid gap-4">
							{list.map((it, index) => (
								<div
									key={it.id}
									className="group relative overflow-hidden rounded-2xl bg-white border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
									style={{
										animationDelay: `${index * 100}ms`,
									}}
								>
									{/* Gradient border effect on hover */}
									<div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl"></div>

									{onClickItem ? (
										<button
											onClick={() => onClickItem(it)}
											className="w-full p-5 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-2xl"
										>
											<RTItemContent item={it} />
										</button>
									) : (
										<div className="p-5">
											<RTItemContent item={it} />
										</div>
									)}

									{/* Bottom border accent */}
									<div
										className={`h-1 bg-gradient-to-r ${
											it.ketua_nama
												? "from-green-400 to-emerald-500"
												: "from-yellow-400 to-amber-500"
										} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
									></div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

// Enhanced komponen untuk konten item RT dengan desain modern
const RTItemContent = ({ item }) => {
	const hasKetua = item.ketua_nama && item.ketua_nama.trim();

	return (
		<div className="relative">
			{/* Background gradient untuk hover effect */}
			<div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-300"></div>

			<div className="relative flex items-center justify-between p-1">
				<div className="flex items-center space-x-4 flex-1">
					{/* Enhanced RT Icon dengan status indicator */}
					<div className="relative">
						<div className="w-14 h-14 bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
							<LuHouse className="w-7 h-7" />
						</div>
						{/* Status indicator dot */}
						<div
							className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-md ${
								hasKetua ? "bg-green-500" : "bg-yellow-500"
							} flex items-center justify-center`}
						>
							{hasKetua ? (
								<LuUserCheck className="w-2.5 h-2.5 text-white" />
							) : (
								<LuUserX className="w-2.5 h-2.5 text-white" />
							)}
						</div>
					</div>

					{/* Enhanced RT Info */}
					<div className="flex-1 space-y-2">
						{/* Header dengan RT number dan status */}
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-3">
								<h4 className="text-xl font-bold text-gray-800 group-hover:text-blue-800 transition-colors">
									RT {item.nomor}
								</h4>
								{hasKetua ? (
									<span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 text-xs font-semibold rounded-full shadow-sm">
										<LuBadgeCheck className="w-3 h-3 mr-1" />
										Aktif
									</span>
								) : (
									<span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 text-xs font-semibold rounded-full shadow-sm">
										<LuUserX className="w-3 h-3 mr-1" />
										Perlu Ketua
									</span>
								)}
							</div>
						</div>

						{/* Informasi detail */}
						<div className="space-y-1">
							<div className="flex items-center space-x-2 text-sm">
								<LuCrown className="w-4 h-4 text-yellow-600" />
								<span className="text-gray-600">Ketua:</span>
								<span
									className={`font-semibold ${
										hasKetua ? "text-green-700" : "text-gray-500"
									}`}
								>
									{hasKetua ? item.ketua_nama : "Belum ada"}
								</span>
							</div>

							{/* Additional info bisa ditambah di sini */}
							{item.alamat && (
								<div className="flex items-center space-x-2 text-sm text-gray-500">
									<LuMapPin className="w-4 h-4" />
									<span className="truncate">{item.alamat}</span>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Enhanced arrow indicator dengan action hint */}
				<div className="flex flex-col items-center space-y-1 text-gray-400 group-hover:text-blue-500 transition-all duration-300 group-hover:translate-x-1">
					<LuChevronRight className="w-6 h-6" />
					<div className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
						Lihat Detail
					</div>
				</div>
			</div>
		</div>
	);
};

const AktivitasLog = ({ lembagaType, lembagaId }) => (
	<div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
		{/* Header dengan gradient accent */}
		<div className="h-1.5 bg-gradient-to-r from-purple-400 to-pink-500 rounded-t-2xl"></div>

		<div className="p-6">
			{/* Header Section */}
			<div className="flex items-center space-x-3 mb-6">
				<div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-600 rounded-xl flex items-center justify-center text-white shadow-lg">
					<LuSettings className="w-6 h-6" />
				</div>
				<div>
					<h3 className="text-xl font-bold text-gray-800">Log Aktivitas</h3>
					<p className="text-sm text-gray-500">
						Riwayat perubahan dan aktivitas
					</p>
				</div>
			</div>

			{/* Content */}
			<div className="text-center py-12">
				<div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
					<LuSettings className="w-8 h-8 text-gray-400" />
				</div>
				<h4 className="text-lg font-medium text-gray-600 mb-2">
					Belum ada aktivitas
				</h4>
				<p className="text-sm text-gray-500">
					Riwayat aktivitas untuk {lembagaType?.toUpperCase()} ID {lembagaId}{" "}
					akan tampil di sini.
				</p>
			</div>
		</div>
	</div>
);

export default function KelembagaanDetailPage() {
	const { user } = useAuth();

	const { type, id } = useParams();
	const navigate = useNavigate();

	const [detail, setDetail] = useState(null);
	const [loading, setLoading] = useState(true);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [editForm, setEditForm] = useState({ nama: "", nomor: "", alamat: "" });
	const [anak, setAnak] = useState([]);

	const loadDetail = useCallback(async () => {
		setLoading(true);
		try {
			let data = null;
			if (type === "rw") {
				const res = await getRw(id);
				data = res?.data?.data;
				// also load anak RT under this RW
				const rts = await listRt();
				const list = (rts?.data?.data || []).filter(
					(r) => String(r.rw_id) === String(id)
				);
				setAnak(list);
			} else if (type === "rt") {
				const res = await getRt(id);
				data = res?.data?.data;
			} else if (type === "posyandu") {
				// try get single if available, else list and find
				if (typeof getPosyandu === "function") {
					try {
						const res = await getPosyandu(id);
						data = res?.data?.data;
					} catch (_) {}
				}
				if (!data) {
					const svc = await import("../../../services/kelembagaan");
					const res = await svc.listPosyandu();
					data = (res?.data?.data || []).find(
						(p) => String(p.id) === String(id)
					);
				}
			} else if (["karang-taruna", "lpm", "pkk", "satlinmas"].includes(type)) {
				// fetch list and pick by id
				const svc = await import("../../../services/kelembagaan");
				let res;
				if (type === "karang-taruna") res = await listKarangTaruna();
				if (type === "lpm") res = await listLpm();
				if (type === "pkk") res = await listPkk();
				if (type === "satlinmas") res = await listSatlinmas();
				data =
					(res?.data?.data || []).find((x) => String(x.id) === String(id)) ||
					(res?.data?.data || [])[0] ||
					null;
			}
			setDetail(data);
		} catch (err) {
			console.error("Gagal memuat detail kelembagaan:", err);
			setDetail(null);
		} finally {
			setLoading(false);
		}
	}, [type, id]);

	useEffect(() => {
		loadDetail();
	}, [loadDetail]);

	const pageTitle = useMemo(() => {
		if (!detail) return "Detail Kelembagaan";
		const name =
			type === "rw"
				? detail.nomor
				: type === "rt"
				? detail.nomor
				: detail.nama || detail.nama_lembaga || "";
		const noPrefix = ["satlinmas", "karang-taruna", "lpm", "pkk"];
		if (noPrefix.includes(type)) return name;
		return `${type.toUpperCase().replace("_", " ")} ${name}`;
	}, [type, detail]);

	const handleOpenEdit = () => {
		setEditForm({
			nama: detail?.nama || detail?.nama_lembaga || "",
			nomor: detail?.nomor || "",
			alamat: detail?.alamat || "",
		});
		setIsEditOpen(true);
	};

	const handleSaveEdit = async () => {
		try {
			const payload = { ...detail };
			// Update only allowed fields for now
			if (type === "rw" || type === "rt") payload.nomor = editForm.nomor;
			if (type !== "rw" && type !== "rt")
				payload.nama = editForm.nama || payload.nama;
			payload.alamat = editForm.alamat;

			if (type === "rw") await updateRw(detail.id, payload);
			else if (type === "rt") await updateRt(detail.id, payload);
			else if (type === "posyandu") await updatePosyandu(detail.id, payload);
			else if (type === "karang-taruna")
				await updateKarangTaruna(detail.id, payload);
			else if (type === "lpm") await updateLpm(detail.id, payload);
			else if (type === "pkk") await updatePkk(detail.id, payload);
			else if (type === "satlinmas") await updateSatlinmas(detail.id, payload);

			setIsEditOpen(false);
			await loadDetail();
		} catch (err) {
			console.error("Gagal menyimpan perubahan:", err);
			alert("Gagal menyimpan perubahan.");
		}
	};

	const handleToggleStatus = async (kelembagaanId, currentStatus) => {
		try {
			const newStatus = currentStatus === "aktif" ? "tidak_aktif" : "aktif";

			console.log("Toggle Status - Data being sent:", {
				id: kelembagaanId,
				type: type,
				currentStatus,
				newStatus,
			});

			// Menggunakan function toggle khusus
			const response = await toggleKelembagaanStatus(
				type,
				kelembagaanId,
				newStatus
			);

			console.log("Toggle Status - Response:", response);
			await loadDetail();
		} catch (err) {
			console.error("Gagal mengubah status kelembagaan:", err);
			console.error("Error response:", err.response);
			console.error("Error data:", err.response?.data);
			console.error("Error status:", err.response?.status);

			const errorMessage =
				err.response?.data?.message || err.response?.data?.errors
					? Object.values(err.response.data.errors).flat().join(", ")
					: err.message;

			alert(`Gagal mengubah status kelembagaan: ${errorMessage}`);
		}
	};

	const handleToggleVerification = async (kelembagaanId, currentStatus) => {
		try {
			const newStatus =
				currentStatus === "verified" ? "unverified" : "verified";

			console.log("Toggle Verification - Data being sent:", {
				id: kelembagaanId,
				type: type,
				currentStatus,
				newStatus,
			});

			// Menggunakan function toggle khusus
			const response = await toggleKelembagaanVerification(
				type,
				kelembagaanId,
				newStatus
			);

			console.log("Toggle Verification - Response:", response);
			await loadDetail();
		} catch (err) {
			console.error("Gagal mengubah status verifikasi:", err);
			console.error("Error response:", err.response);
			console.error("Error data:", err.response?.data);
			console.error("Error status:", err.response?.status);

			const errorMessage =
				err.response?.data?.message || err.response?.data?.errors
					? Object.values(err.response.data.errors).flat().join(", ")
					: err.message;

			alert(`Gagal mengubah status verifikasi: ${errorMessage}`);
		}
	};

	const handleAddRT = async (nomorRT) => {
		try {
			const payload = {
				nomor: nomorRT,
				rw_id: detail.id,
				desa_id: user.desa_id || detail.desa_id,
				alamat: detail.alamat || "", // Use RW address as default
			};

			await createRt(payload);

			// Reload anak data to show new RT
			const rts = await listRt();
			const list = (rts?.data?.data || []).filter(
				(r) => String(r.rw_id) === String(detail.id)
			);
			setAnak(list);
		} catch (error) {
			console.error("Error creating RT:", error);
			throw error;
		}
	};

	if (loading) return <p className="p-6 text-center">Memuat...</p>;
	if (!detail)
		return (
			<p className="p-6 text-center text-red-500">Data tidak ditemukan.</p>
		);

	return (
		<div className="min-h-full p-4">
			<div className="flex items-center mb-4">
				<button
					onClick={() =>
						type === "rt" && detail.rw_id
							? navigate(`/desa/kelembagaan/rw/${detail.rw_id}`)
							: navigate(`/desa/kelembagaan`)
					}
					className="bg-white p-2 mr-3 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-full"
					title={type === "rt" && detail.rw_id ? "Kembali ke RW" : "Kembali"}
				>
					<FaArrowLeft />
				</button>
				<div>
					<h1 className="text-3xl font-bold text-gray-800">{pageTitle}</h1>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				<div className="col-span-1 lg:col-span-2 space-y-4">
					<ProfilCard
						profil={detail}
						type={type}
						onEdit={handleOpenEdit}
						role={user?.role}
						rtCount={type === "rw" ? anak.length : 0}
						pengurusCount={undefined}
						onToggleStatus={handleToggleStatus}
						onToggleVerification={handleToggleVerification}
					/>

					<PengurusKelembagaan
						kelembagaanType={type}
						kelembagaanId={detail.id}
					/>
				</div>
				<div className="space-y-4">
					{type === "rw" && (
						<AnakLembagaCard
							list={anak}
							label="Daftar RT"
							onClickItem={(rt) => navigate(`/desa/kelembagaan/rt/${rt.id}`)}
							onAddRT={handleAddRT}
							rwId={detail.id}
						/>
					)}
					<AktivitasLog lembagaType={type} lembagaId={id} />
				</div>
			</div>

			<SimpleModal
				title="Edit Kelembagaan"
				isOpen={isEditOpen}
				onClose={() => setIsEditOpen(false)}
				onSubmit={handleSaveEdit}
			>
				{type !== "rw" && type !== "rt" ? (
					<div>
						<label className="block text-sm font-medium">Nama</label>
						<input
							className="mt-1 w-full border rounded px-3 py-2"
							value={editForm.nama}
							onChange={(e) =>
								setEditForm((f) => ({ ...f, nama: e.target.value }))
							}
							placeholder="Nama lembaga"
						/>
					</div>
				) : (
					<div>
						<label className="block text-sm font-medium">Nomor</label>
						<input
							className="mt-1 w-full border rounded px-3 py-2"
							value={editForm.nomor}
							onChange={(e) =>
								setEditForm((f) => ({ ...f, nomor: e.target.value }))
							}
							placeholder="Nomor"
						/>
					</div>
				)}
				<div>
					<label className="block text-sm font-medium">Alamat</label>
					<input
						className="mt-1 w-full border rounded px-3 py-2"
						value={editForm.alamat}
						onChange={(e) =>
							setEditForm((f) => ({ ...f, alamat: e.target.value }))
						}
						placeholder="Alamat"
					/>
				</div>
			</SimpleModal>
		</div>
	);
}
