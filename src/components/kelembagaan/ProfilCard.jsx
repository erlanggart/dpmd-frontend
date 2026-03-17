import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useEditMode } from "../../context/EditModeContext";
import {
	LuMapPin,
	LuBadgeCheck,
	LuChevronRight,
	LuHouse,
	LuCrown,
	LuSettings,
	LuTent,
	LuHospital,
	LuUsers,
	LuBuilding,
	LuHeartHandshake,
	LuShield,
	LuShieldCheck,
	LuShieldOff,
	LuPower,
	LuPowerOff,
	LuTriangleAlert,
	LuPencil,
} from "react-icons/lu";
import Swal from "sweetalert2";

const ProfilCard = ({
	profil,
	type,
	onEdit,
	rtCount,
	rtList = [],
	pengurusCount,
	onToggleStatus,
	onToggleVerification,
	produkHukumList = [],
	onUpdatePenduduk,
}) => {
	const { isSuperAdmin, isAdminBidangPMD, isUserDesa } = useAuth();
	const { isEditMode } = useEditMode();
	const navigate = useNavigate();

	// Determine if edit button should be shown
	// For admin (superadmin/admin bidang PMD): always show
	// For desa: only show if edit mode is ON AND kelembagaan is not verified
	const showEditButton =
		isSuperAdmin() || isAdminBidangPMD() || (isUserDesa() && isEditMode && profil?.status_verifikasi !== "verified");

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
			text: "Aktif",
		},
		nonaktif: {
			badge: "bg-gradient-to-r from-red-400 to-red-500 text-white shadow-lg",
			indicator: "bg-red-500",
			text: "idak Aktif",
		},
		tidak_aktif: {
			// Backward compatibility
			badge: "bg-gradient-to-r from-red-400 to-red-500 text-white shadow-lg",
			indicator: "bg-red-500",
			text: "idak Aktif",
		},
		"tidak aktif": {
			// Backward compatibility
			badge: "bg-gradient-to-r from-red-400 to-red-500 text-white shadow-lg",
			indicator: "bg-red-500",
			text: "idak Aktif",
		},
	};

	const verificationConfig = {
		verified: {
			badge:
				"bg-gradient-to-r from-blue-400 to-indigo-500 text-white shadow-lg",
			indicator: "bg-blue-500",
			text: "Terverifikasi",
		},
		pending: {
			badge:
				"bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-lg",
			indicator: "bg-yellow-500",
			text: "Menunggu Verifikasi",
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
			color: "from-purple-500 to-purple-700",
			bg: "from-purple-50 to-purple-100",
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
			color: "from-pink-500 to-rose-500",
			bg: "from-pink-50 to-rose-100",
		},
		satlinmas: {
			icon: <LuShield className="w-8 h-8" />,
			color: "from-green-400 to-green-600",
			bg: "from-green-50 to-green-100",
		},
		"lembaga-lainnya": {
			icon: <LuBuilding className="w-8 h-8" />,
			color: "from-slate-500 to-slate-700",
			bg: "from-slate-50 to-slate-100",
		},
		default: {
			icon: "🏢",
			color: "from-slate-400 to-slate-600",
			bg: "from-slate-50 to-slate-100",
		},
	};

	const currentType = typeIcons[type] || typeIcons.default;
	const currentStatus =
		statusConfig[profil?.status_kelembagaan] || statusConfig["nonaktif"];
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

					{/* Action Button - Only show if conditions are met */}
					{showEditButton && (
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
					)}
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

					{/* SK Pembentukan Card */}
					<div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-100 border border-emerald-200 hover:shadow-md transition-shadow duration-300">
						<div className="flex items-start space-x-3">
							<div className="mt-1">
								<LuBadgeCheck className="w-5 h-5 text-emerald-600" />
							</div>
							<div className="flex-1">
								<h4 className="font-semibold text-gray-800 text-sm mb-1">
									SK Pembentukan Lembaga
								</h4>
								{profil?.produk_hukum_id &&
								produkHukumList &&
								produkHukumList.find(
									(ph) => ph.id === profil.produk_hukum_id,
								) ? (
									<button
										onClick={() =>
											navigate(`/desa/produk-hukum/${profil.produk_hukum_id}`)
										}
										className="w-full text-left hover:bg-emerald-100 rounded-lg p-2 -m-2 transition-colors duration-200 group"
									>
										<div className="text-sm">
											{(() => {
												const ph = produkHukumList.find(
													(ph) => ph.id === profil.produk_hukum_id,
												);
												return (
													<div className="space-y-1">
														<div className="flex items-center justify-between">
															<p className="text-emerald-700 font-medium group-hover:text-emerald-800">
																Nomor {ph.nomor} Tahun {ph.tahun}
															</p>
															<LuChevronRight className="w-4 h-4 text-emerald-600 group-hover:text-emerald-800 transform group-hover:translate-x-1 transition-all duration-200" />
														</div>
														<p className="text-gray-600 leading-relaxed group-hover:text-gray-700">
															{ph.judul}
														</p>
														<p className="text-xs text-emerald-600 group-hover:text-emerald-700 font-medium mt-1">
															Klik untuk melihat detail SK →
														</p>
													</div>
												);
											})()}
										</div>
									</button>
								) : (
									<p className="text-gray-500 text-sm italic">
										Belum terhubung dengan SK pembentukan
									</p>
								)}
							</div>
						</div>
					</div>

					{/* SK Penonaktifan Card - tampil saat kelembagaan nonaktif */}
					{profil?.status_kelembagaan === "nonaktif" && profil?.produk_hukum_penonaktifan_id &&
					produkHukumList?.find((ph) => ph.id === profil.produk_hukum_penonaktifan_id) && (
						<div className="p-4 rounded-xl bg-gradient-to-r from-red-50 to-rose-100 border border-red-200 hover:shadow-md transition-shadow duration-300">
							<div className="flex items-start space-x-3">
								<div className="mt-1">
									<LuPowerOff className="w-5 h-5 text-red-600" />
								</div>
								<div className="flex-1">
									<h4 className="font-semibold text-gray-800 text-sm mb-1">
										SK Penonaktifan Lembaga
									</h4>
									<button
										onClick={() =>
											navigate(`/desa/produk-hukum/${profil.produk_hukum_penonaktifan_id}`)
										}
										className="w-full text-left hover:bg-red-100 rounded-lg p-2 -m-2 transition-colors duration-200 group"
									>
										<div className="text-sm">
											{(() => {
												const ph = produkHukumList.find(
													(ph) => ph.id === profil.produk_hukum_penonaktifan_id,
												);
												return (
													<div className="space-y-1">
														<div className="flex items-center justify-between">
															<p className="text-red-700 font-medium group-hover:text-red-800">
																Nomor {ph.nomor} Tahun {ph.tahun}
															</p>
															<LuChevronRight className="w-4 h-4 text-red-600 group-hover:text-red-800 transform group-hover:translate-x-1 transition-all duration-200" />
														</div>
														<p className="text-gray-600 leading-relaxed group-hover:text-gray-700">
															{ph.judul}
														</p>
														<p className="text-xs text-red-600 group-hover:text-red-700 font-medium mt-1">
															Klik untuk melihat detail SK →
														</p>
													</div>
												);
											})()}
										</div>
									</button>
								</div>
							</div>
						</div>
					)}

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
				{(type === "rw" && rtCount > 0) || pengurusCount > 0 ? (
					<div className="flex gap-3">
						{type === "rw" && rtCount > 0 && (
							<div className="flex items-center gap-3 flex-1 bg-emerald-50 rounded-lg px-3 py-2.5 border border-emerald-200 shadow-sm">
								<div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
									<LuHouse className="w-4 h-4 text-emerald-600" />
								</div>
								<div>
									<div className="text-base font-bold text-emerald-700 leading-none">{rtCount}</div>
									<div className="text-xs text-emerald-500 mt-0.5">Jumlah RT</div>
								</div>
							</div>
						)}
						{pengurusCount > 0 && (
							<div className="flex items-center gap-3 flex-1 bg-violet-50 rounded-lg px-3 py-2.5 border border-violet-200 shadow-sm">
								<div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
									<LuUsers className="w-4 h-4 text-violet-600" />
								</div>
								<div>
									<div className="text-base font-bold text-violet-700 leading-none">{pengurusCount}</div>
									<div className="text-xs text-violet-500 mt-0.5">Pengurus</div>
								</div>
							</div>
						)}
					</div>
				) : null}
				</div>

				{/* Data Penduduk - RT */}
				{type === "rt" && (
					<div className="p-4 rounded-xl bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200">
						<div className="flex items-center justify-between mb-3">
							<h4 className="text-xs font-semibold text-sky-700 uppercase tracking-wide flex items-center gap-2">
								<LuUsers className="w-3.5 h-3.5" /> Data Penduduk
							</h4>
							{(isSuperAdmin() || isAdminBidangPMD() || (isUserDesa() && isEditMode)) && onUpdatePenduduk && (
								<button
									onClick={onUpdatePenduduk}
									className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-sky-700 bg-white border border-sky-200 rounded-lg hover:bg-sky-50 transition-colors"
								>
									<LuPencil className="w-3 h-3" />
									Perbarui
								</button>
							)}
						</div>
						{profil?.jumlah_jiwa != null || profil?.jumlah_kk != null ? (
							<div className="flex gap-3">
								<div className="flex items-center gap-3 flex-1 bg-white rounded-lg px-3 py-2.5 border border-sky-100 shadow-sm">
									<div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
										<LuUsers className="w-4 h-4 text-sky-600" />
									</div>
									<div>
										<div className="text-base font-bold text-sky-700 leading-none">{profil?.jumlah_jiwa != null ? profil.jumlah_jiwa.toLocaleString('id-ID') : '-'}</div>
										<div className="text-xs text-sky-500 mt-0.5">Jumlah Jiwa</div>
									</div>
								</div>
								<div className="flex items-center gap-3 flex-1 bg-white rounded-lg px-3 py-2.5 border border-amber-100 shadow-sm">
									<div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
										<LuHouse className="w-4 h-4 text-amber-600" />
									</div>
									<div>
										<div className="text-base font-bold text-amber-700 leading-none">{profil?.jumlah_kk != null ? profil.jumlah_kk.toLocaleString('id-ID') : '-'}</div>
										<div className="text-xs text-amber-500 mt-0.5">Kepala Keluarga</div>
									</div>
								</div>
							</div>
						) : (
							<p className="text-sm text-sky-500 italic">Belum ada data penduduk</p>
						)}
					</div>
				)}

				{/* Data Penduduk Agregat - RW (dari semua RT) */}
				{type === "rw" && rtList.length > 0 && (() => {
					const totalJiwa = rtList.reduce((sum, rt) => sum + (rt.jumlah_jiwa || 0), 0);
					const totalKK = rtList.reduce((sum, rt) => sum + (rt.jumlah_kk || 0), 0);
					if (totalJiwa === 0 && totalKK === 0) return null;
					return (
						<div className="p-4 rounded-xl bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200">
							<h4 className="text-xs font-semibold text-sky-700 uppercase tracking-wide mb-3 flex items-center gap-2">
								<LuUsers className="w-3.5 h-3.5" /> Data Penduduk
								<span className="font-normal text-sky-500 normal-case">(akumulasi {rtList.length} RT)</span>
							</h4>
							<div className="flex gap-3">
								{totalJiwa > 0 && (
									<div className="flex items-center gap-3 flex-1 bg-white rounded-lg px-3 py-2.5 border border-sky-100 shadow-sm">
										<div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
											<LuUsers className="w-4 h-4 text-sky-600" />
										</div>
										<div>
											<div className="text-base font-bold text-sky-700 leading-none">{totalJiwa.toLocaleString('id-ID')}</div>
											<div className="text-xs text-sky-500 mt-0.5">Jumlah Jiwa</div>
										</div>
									</div>
								)}
								{totalKK > 0 && (
									<div className="flex items-center gap-3 flex-1 bg-white rounded-lg px-3 py-2.5 border border-amber-100 shadow-sm">
										<div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
											<LuHouse className="w-4 h-4 text-amber-600" />
										</div>
										<div>
											<div className="text-base font-bold text-amber-700 leading-none">{totalKK.toLocaleString('id-ID')}</div>
											<div className="text-xs text-amber-500 mt-0.5">Kepala Keluarga</div>
										</div>
									</div>
								)}
							</div>
						</div>
					);
				})()}

				{/* Catatan Verifikasi - Feedback dari Admin */}
				{profil?.catatan_verifikasi && profil?.status_verifikasi !== "verified" && (
					<div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
						<div className="flex items-start space-x-3">
							<div className="mt-0.5">
								<LuTriangleAlert className="w-5 h-5 text-amber-600" />
							</div>
							<div className="flex-1">
								<h4 className="font-semibold text-amber-800 text-sm mb-1">
									Catatan Verifikasi
								</h4>
								<p className="text-sm text-amber-700 leading-relaxed whitespace-pre-line">
									{profil.catatan_verifikasi}
								</p>
								{profil?.verifikator_nama && (
									<p className="text-xs text-amber-500 mt-2">
										Oleh: {profil.verifikator_nama}
										{profil?.verified_at && ` — ${new Date(profil.verified_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`}
									</p>
								)}
							</div>
						</div>
					</div>
				)}

				{/* Admin Controls */}
				{(isUserDesa() || isAdminBidangPMD() || isSuperAdmin()) && (
					<div className="pt-4 border-t border-gray-200 space-y-3">
						<div className="flex flex-wrap gap-2">
							{/* Status Toggle Button */}
							<button
								onClick={() =>
									onToggleStatus(profil?.id, profil?.status_kelembagaan)
								}
								className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
									profil?.status_kelembagaan === "aktif"
										? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
										: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
								}`}
							>
								{profil?.status_kelembagaan === "aktif" ? (
									<>
										<LuPowerOff className="w-4 h-4" />
										Nonaktifkan
									</>
								) : (
									<>
										<LuPower className="w-4 h-4" />
										Aktifkan
									</>
								)}
							</button>

							{/* Verification Toggle Button */}
							{(isAdminBidangPMD() || isSuperAdmin()) && (
								<button
									onClick={() => onToggleVerification(profil?.id, profil?.status_verifikasi)}
									className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
										profil?.status_verifikasi === "verified"
											? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
											: "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
									}`}
								>
									{profil?.status_verifikasi === "verified" ? (
										<>
											<LuShieldOff className="w-4 h-4" />
											Batal Verifikasi
										</>
									) : (
										<>
											<LuShieldCheck className="w-4 h-4" />
											Verifikasi
										</>
									)}
								</button>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default ProfilCard;
