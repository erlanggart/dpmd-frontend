// src/components/tabs/WilayahManagement.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
	LuMapPin,
	LuUser,
	LuMail,
	LuCalendar,
	LuBuilding2,
	LuHouse,
	LuPlus,
	LuShield,
	LuChevronLeft,
	LuChevronRight,
} from "react-icons/lu";
import api from "../../api";
import AddUserModal from "../AddUserModal";
import ResetPasswordModal from "../ResetPasswordModal";
import { useAuth } from "../../context/AuthContext";
import Swal from "sweetalert2";

// Custom debounce hook
const useDebounce = (value, delay) => {
	const [debouncedValue, setDebouncedValue] = useState(value);

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]);

	return debouncedValue;
};

const WilayahManagement = () => {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedType, setSelectedType] = useState("all");
	const [showAddModal, setShowAddModal] = useState(false);
	const [resetLoading, setResetLoading] = useState(false);
	const [showResetModal, setShowResetModal] = useState(false);
	const [selectedUser, setSelectedUser] = useState(null);
	const { user: currentUser } = useAuth();
	const [currentPage, setCurrentPage] = useState(1);
	const [totalUsers, setTotalUsers] = useState(0);
	const [totalPages, setTotalPages] = useState(0);
	const itemsPerPage = 9;

	// Debounce search term
	const debouncedSearchTerm = useDebounce(searchTerm, 500);

	// Role-role tingkat wilayah
	const wilayahRoles = useMemo(() => ["kecamatan", "desa"], []);

	// Fetch users with server-side pagination and search
	const fetchUsers = useCallback(async () => {
		setLoading(true);
		try {
			// Build query parameters
			const params = {
				page: currentPage,
				limit: itemsPerPage,
				role: wilayahRoles.join(','), // "kecamatan,desa"
			};
			
			// Add search if exists
			if (debouncedSearchTerm) {
				params.search = debouncedSearchTerm;
			}
			
			// Add type filter if not "all"
			if (selectedType !== 'all') {
				params.role = selectedType;
			}
			
			const response = await api.get("/users", { params });
			
			setUsers(response.data.data || []);
			setTotalUsers(response.data.total || 0);
			setTotalPages(response.data.totalPages || 0);
		} catch (err) {
			setError("Gagal mengambil data user.");
			console.error(err);
		} finally {
			setLoading(false);
		}
	}, [currentPage, debouncedSearchTerm, selectedType, wilayahRoles]);

	useEffect(() => {
		fetchUsers();
	}, [fetchUsers]);

	// Function to handle user added
	const handleUserAdded = () => {
		fetchUsers();
	};

	// Function to open reset password modal
	const handleResetPasswordClick = (user) => {
		setSelectedUser(user);
		setShowResetModal(true);
	};

	// Function to reset user password
	const handleResetPassword = async () => {
		if (!selectedUser) return;

		setResetLoading(true);

		try {
			const token = localStorage.getItem("authToken");
			await api.put(
				`/users/${selectedUser.id}/reset-password`,
				{
					password: "dpmdbogorkab",
				},
				{
					headers: { Authorization: `Bearer ${token}` },
				}
			);

			Swal.fire({
				title: "Berhasil!",
				html: `Password untuk user <strong>"${selectedUser.name}"</strong> berhasil direset!<br><br>Password baru: <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;color:#374151;">dpmdbogorkab</code>`,
				icon: "success",
				confirmButtonText: "OK",
				confirmButtonColor: "#10b981",
			});
			setShowResetModal(false);
			setSelectedUser(null);
		} catch (error) {
			console.error("Error resetting password:", error);
			Swal.fire({
				title: "Gagal!",
				text:
					error.response?.data?.message ||
					"Gagal mereset password. Silakan coba lagi.",
				icon: "error",
				confirmButtonText: "OK",
				confirmButtonColor: "#ef4444",
			});
		} finally {
			setResetLoading(false);
		}
	};

	const handleCloseResetModal = () => {
		if (!resetLoading) {
			setShowResetModal(false);
			setSelectedUser(null);
		}
	};

	// Function to handle add user for specific role

	const getRoleInfo = (role) => {
		const roleMap = {
			kecamatan: {
				label: "Admin Kecamatan",
				icon: LuBuilding2,
				color: "from-violet-400 to-violet-600",
				bgColor: "bg-violet-50",
				textColor: "text-violet-700",
				borderColor: "border-violet-200",
			},
			desa: {
				label: "Admin Desa",
				icon: LuHouse,
				color: "from-emerald-400 to-emerald-600",
				bgColor: "bg-emerald-50",
				textColor: "text-emerald-700",
				borderColor: "border-emerald-200",
			},
		};
		return (
			roleMap[role] || {
				label: role,
				icon: LuUser,
				color: "from-gray-400 to-gray-600",
				bgColor: "bg-gray-50",
				textColor: "text-gray-700",
				borderColor: "border-gray-200",
			}
		);
	};

	// Reset ke halaman pertama saat search atau filter berubah
	useEffect(() => {
		setCurrentPage(1);
	}, [debouncedSearchTerm, selectedType]);

	// Statistik - gunakan totalUsers dari server response
	const stats = {
		total: totalUsers,
		kecamatan: users.filter((u) => u.role === "kecamatan").length,
		desa: users.filter(
			(u) =>
				u.role === "desa" &&
				(!u.desa?.status_pemerintahan || u.desa?.status_pemerintahan === "desa")
		).length,
		kelurahan: users.filter(
			(u) => u.role === "desa" && u.desa?.status_pemerintahan === "kelurahan"
		).length,
	};

	if (loading)
		return (
			<div className="flex justify-center items-center p-8">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
			</div>
		);

	if (error)
		return (
			<div className="p-4 text-center text-red-500 bg-red-50 rounded-lg">
				{error}
			</div>
		);

	return (
		<div className="space-y-6">
			{/* Header dan Statistik */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
				<div className="flex items-center gap-3">
					<LuMapPin className="h-6 w-6 text-blue-500" />
					<h2 className="text-xl font-semibold text-gray-800">
						Manajemen User Wilayah ({stats.total})
					</h2>
				</div>

				<div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
					

					{/* Add User Button */}
					<div className="flex gap-2">
						<button
							onClick={() => setShowAddModal(true)}
							className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
						>
							<LuPlus className="h-4 w-4" />
							Tambah User
						</button>
					</div>
				</div>
			</div>

			{/* Filter dan Search */}
			<div className="flex flex-col sm:flex-row gap-4 mb-6">
				<div className="flex-1">
					<input
						type="text"
						placeholder="Cari berdasarkan nama atau email..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
				</div>
				<select
					value={selectedType}
					onChange={(e) => setSelectedType(e.target.value)}
					className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				>
					<option value="all">Semua Role</option>
					<option value="kecamatan">Kecamatan</option>
					<option value="desa">Desa</option>
					<option value="kelurahan">Kelurahan</option>
				</select>
			</div>

			{/* User List - Gabungan Kecamatan dan Desa */}
			{users.length === 0 && !loading ? (
				<div className="text-center p-8 bg-gray-50 rounded-lg">
					<LuMapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
					<p className="text-gray-500">
						{debouncedSearchTerm
							? `Tidak ada user wilayah yang sesuai dengan pencarian`
							: "Tidak ada user wilayah yang ditemukan"}
					</p>
				</div>
			) : (
				<>
					<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
						{users.map((user) => {
							const roleInfo = getRoleInfo(user.role);
							const IconComponent = roleInfo.icon;

							return (
										<div
											key={user.id}
											className={`bg-white rounded-lg shadow-sm border-2 p-4 hover:shadow-md transition-all duration-200 hover:scale-105 ${
												user.role === 'kecamatan' 
													? 'border-violet-300 hover:border-violet-400' 
													: 'border-emerald-300 hover:border-emerald-400'
											}`}
										>
											<div className="flex items-center gap-3 mb-3">
												<div
													className={`h-10 w-10 bg-gradient-to-r ${roleInfo.color} rounded-full flex items-center justify-center`}
												>
													<IconComponent className="h-5 w-5 text-white" />
												</div>
												<div className="flex-1 min-w-0">
													<h4 className="font-medium text-gray-900 truncate">
														{user.name}
													</h4>
													<div className="flex items-center gap-2">
														<p
															className={`text-xs font-medium ${roleInfo.textColor}`}
														>
															{roleInfo.label}
														</p>
														{/* Badge untuk Desa/Kelurahan */}
														{user.role === "desa" && user.desa && (
															<span
																className={`px-2 py-0.5 text-xs font-medium rounded-full ${
																	user.desa.status_pemerintahan === "kelurahan"
																		? "bg-purple-100 text-purple-700 border border-purple-200"
																		: "bg-green-100 text-green-700 border border-green-200"
																}`}
															>
																{user.desa.status_pemerintahan === "kelurahan"
																	? "Kelurahan"
																	: "Desa"}
															</span>
														)}
													</div>
												</div>
											</div>

											<div className="space-y-2 text-sm mb-3">
												<div className="flex items-center gap-2 text-gray-600">
													<LuMail className="h-3 w-3 flex-shrink-0" />
													<span className="truncate text-xs">{user.email}</span>
												</div>

												{/* Informasi Desa/Kelurahan untuk user desa */}
												{user.role === "desa" && user.desa && (
													<div className="flex items-center gap-2 text-gray-600">
														<LuHouse className="h-3 w-3 flex-shrink-0" />
														<span className="text-xs">
															{user.desa.status_pemerintahan === "kelurahan"
																? "Kelurahan"
																: "Desa"}{" "}
															{user.desa.nama}
														</span>
													</div>
												)}

												{/* Informasi Kecamatan untuk user kecamatan */}
												{user.role === "kecamatan" && user.kecamatan && (
													<div className="flex items-center gap-2 text-gray-600">
														<LuBuilding2 className="h-3 w-3 flex-shrink-0" />
														<span className="text-xs">
															Kecamatan {user.kecamatan.nama}
														</span>
													</div>
												)}

												{user.created_at && (
													<div className="flex items-center gap-2 text-gray-600">
														<LuCalendar className="h-3 w-3 flex-shrink-0" />
														<span className="text-xs">
															{new Date(user.created_at).toLocaleDateString(
																"id-ID"
															)}
														</span>
													</div>
												)}
											</div>

											{/* Action Buttons - Only for superadmin */}
											{currentUser?.roles?.includes("superadmin") && (
												<div className="pt-3 border-t border-gray-100">
													<button
														onClick={() => handleResetPasswordClick(user)}
														disabled={resetLoading}
														className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
														title="Reset Password"
													>
														<LuShield className="h-3 w-3" />
														Reset Password
													</button>
												</div>
											)}
										</div>
						);
						})}
					</div>

					{/* Global Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-center gap-2 mt-6">
							<button
								onClick={() => setCurrentPage(currentPage - 1)}
								disabled={currentPage === 1}
								className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								<LuChevronLeft className="w-4 h-4" />
							</button>

							{[...Array(Math.min(5, totalPages))].map((_, idx) => {
								let pageNum;
								if (totalPages <= 5) {
									pageNum = idx + 1;
								} else if (currentPage <= 3) {
									pageNum = idx + 1;
								} else if (currentPage >= totalPages - 2) {
									pageNum = totalPages - 4 + idx;
								} else {
									pageNum = currentPage - 2 + idx;
								}

								return (
									<button
										key={pageNum}
										onClick={() => setCurrentPage(pageNum)}
										className={`px-3 py-2 rounded-lg border transition-colors ${
											pageNum === currentPage
												? "bg-blue-600 text-white border-blue-600"
												: "border-gray-300 hover:bg-gray-50"
										}`}
									>
										{pageNum}
									</button>
								);
							})}

							<button
								onClick={() => setCurrentPage(currentPage + 1)}
								disabled={currentPage === totalPages}
								className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								<LuChevronRight className="w-4 h-4" />
							</button>

							<span className="ml-4 text-sm text-gray-600">
								Halaman {currentPage} dari {totalPages}
							</span>
						</div>
					)}
				</>
			)}



			{/* Add User Modal */}
			<AddUserModal
				isOpen={showAddModal}
				onClose={() => setShowAddModal(false)}
				onUserAdded={handleUserAdded}
			/>

			{/* Reset Password Modal */}
			<ResetPasswordModal
				isOpen={showResetModal}
				onClose={handleCloseResetModal}
				onConfirm={handleResetPassword}
				userName={selectedUser?.name || ""}
				isLoading={resetLoading}
			/>
		</div>
	);
};

export default WilayahManagement;
