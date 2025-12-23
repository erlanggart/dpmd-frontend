// src/components/tabs/BidangManagement.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
	LuUsers,
	LuUser,
	LuMail,
	LuCalendar,
	LuBriefcase,
	LuPlus,
	LuChevronDown,
	LuChevronUp,
	LuShield,
} from "react-icons/lu";
import api from "../../api";
import AddUserModal from "../AddUserModal";
import ResetPasswordModal from "../ResetPasswordModal";
import { useAuth } from "../../context/AuthContext";
import Swal from "sweetalert2";

const BidangManagement = () => {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [showAddModal, setShowAddModal] = useState(false);
	const [expandedSections, setExpandedSections] = useState({});
	const [resetLoading, setResetLoading] = useState(false);
	const [showResetModal, setShowResetModal] = useState(false);
	const [selectedUser, setSelectedUser] = useState(null);
	const { user: currentUser } = useAuth();

	// Role-role untuk 4 bidang dan 3 departemen di DPMD
	const bidangRoles = useMemo(() => [
		// 4 Bidang
		"sarana_prasarana",
		"pemerintahan_desa",
		"pemberdayaan_masyarakat",
		"kekayaan_keuangan",
		// 3 Departemen
		"sekretariat",
		"prolap",
		"keuangan",
	], []);

	// Urutan kategori berdasarkan 4 bidang dan 3 departemen DPMD
	const categoryOrder = useMemo(() => [
		// 4 Bidang
		"Bidang Pemerintahan Desa",
		"Bidang Sarana Prasarana",
		"Bidang Kekayaan Keuangan",
		"Bidang Pemberdayaan Masyarakat",
		// 3 Departemen
		"Departemen Sekretariat",
		"Departemen Program dan Pelaporan",
		"Departemen Keuangan",
	], []);

	// Function to fetch users
	const fetchUsers = useCallback(async () => {
		setLoading(true);
		try {
			const response = await api.get("/users", {
				params: {
					limit: 200, // Cukup untuk user bidang & pegawai
				},
			});

			// Filter user dengan role tingkat bidang
			const bidangUsers = response.data.data.filter((user) =>
				bidangRoles.includes(user.role)
			);
			setUsers(bidangUsers);
		} catch (err) {
			setError("Gagal mengambil data user.");
			console.error(err);
		} finally {
			setLoading(false);
		}
	}, [bidangRoles]);

	useEffect(() => {
		fetchUsers();
		// Initialize all sections as expanded by default
		const initialExpanded = {};
		categoryOrder.forEach((category) => {
			initialExpanded[category] = true;
		});
		setExpandedSections(initialExpanded);
	}, [fetchUsers, categoryOrder]);

	// Function to handle user added
	const handleUserAdded = () => {
		fetchUsers();
	};

	// Function to toggle accordion sections
	const toggleSection = (category) => {
		setExpandedSections((prev) => ({
			...prev,
			[category]: !prev[category],
		}));
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

	const getRoleInfo = (role) => {
		const roleMap = {
			sarana_prasarana: {
				label: "Sarana Prasarana",
				category: "Bidang Sarana Prasarana",
				color: "from-emerald-400 to-emerald-600",
				bgColor: "bg-emerald-50",
				textColor: "text-emerald-700",
			},
			pemerintahan_desa: {
				label: "Pemerintahan Desa",
				category: "Bidang Pemerintahan Desa",
				color: "from-blue-400 to-blue-600",
				bgColor: "bg-blue-50",
				textColor: "text-blue-700",
			},
			pemberdayaan_masyarakat: {
				label: "Pemberdayaan Masyarakat",
				category: "Bidang Pemberdayaan Masyarakat",
				color: "from-purple-400 to-purple-600",
				bgColor: "bg-purple-50",
				textColor: "text-purple-700",
			},
			kekayaan_keuangan: {
				label: "Kekayaan Keuangan",
				category: "Bidang Kekayaan Keuangan",
				color: "from-orange-400 to-orange-600",
				bgColor: "bg-orange-50",
				textColor: "text-orange-700",
			},
			// 3 Departemen
			sekretariat: {
				label: "Sekretariat",
				category: "Departemen Sekretariat",
				color: "from-gray-400 to-gray-600",
				bgColor: "bg-gray-50",
				textColor: "text-gray-700",
			},
			prolap: {
				label: "Program dan Pelaporan",
				category: "Departemen Program dan Pelaporan",
				color: "from-indigo-400 to-indigo-600",
				bgColor: "bg-indigo-50",
				textColor: "text-indigo-700",
			},
			keuangan: {
				label: "Keuangan",
				category: "Departemen Keuangan",
				color: "from-green-400 to-green-600",
				bgColor: "bg-green-50",
				textColor: "text-green-700",
			},
		};
		return (
			roleMap[role] || {
				label: role,
				category: "Lainnya",
				color: "from-gray-400 to-gray-600",
				bgColor: "bg-gray-50",
				textColor: "text-gray-700",
			}
		);
	};

	// Grup user berdasarkan kategori
	const groupedByCategory = users.reduce((acc, user) => {
		const roleInfo = getRoleInfo(user.role);
		const category = roleInfo.category;

		if (!acc[category]) {
			acc[category] = [];
		}
		acc[category].push({ ...user, roleInfo });
		return acc;
	}, {});

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
		<div className="space-y-8">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<LuUsers className="h-6 w-6 text-blue-500" />
					<h2 className="text-xl font-semibold text-gray-800">
						Manajemen User Bidang ({users.length})
					</h2>
				</div>
				<button
					onClick={() => setShowAddModal(true)}
					className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
				>
					<LuPlus className="h-4 w-4" />
					Tambah User
				</button>
			</div>

			{categoryOrder.map((category) => {
				const categoryUsers = groupedByCategory[category] || [];
				const isExpanded = expandedSections[category];

				if (categoryUsers.length === 0) return null;

				return (
					<div
						key={category}
						className="border border-gray-200 rounded-lg bg-white"
					>
						{/* Accordion Header */}
						<button
							onClick={() => toggleSection(category)}
							className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
						>
							<div className="flex items-center gap-3">
								<LuBriefcase className="h-5 w-5 text-gray-600" />
								<h3 className="font-semibold text-gray-800">
									{category} ({categoryUsers.length})
								</h3>
							</div>
							{isExpanded ? (
								<LuChevronUp className="h-5 w-5 text-gray-500" />
							) : (
								<LuChevronDown className="h-5 w-5 text-gray-500" />
							)}
						</button>

						{/* Accordion Content */}
						<div
							className={`overflow-hidden transition-all duration-300 ${
								isExpanded ? "max-h-full opacity-100" : "max-h-0 opacity-0"
							}`}
						>
							<div className="px-4 pb-4">
								<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
									{categoryUsers.map((user) => (
										<div
											key={user.id}
											className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200"
										>
											<div className="flex items-center gap-3 mb-3">
												<div
													className={`h-10 w-10 bg-gradient-to-r ${user.roleInfo.color} rounded-full flex items-center justify-center`}
												>
													<LuUser className="h-5 w-5 text-white" />
												</div>
												<div className="flex-1 min-w-0">
													<h4 className="font-medium text-gray-900 truncate">
														{user.name}
													</h4>
													<p
														className={`text-xs font-medium ${user.roleInfo.textColor} truncate`}
													>
														{user.roleInfo.label}
													</p>
												</div>
											</div>

											<div className="space-y-2 text-sm mb-3">
												<div className="flex items-center gap-2 text-gray-600">
													<LuMail className="h-3 w-3 flex-shrink-0" />
													<span className="truncate">{user.email}</span>
												</div>
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
									))}
								</div>
							</div>
						</div>
					</div>
				);
			})}

			{Object.keys(groupedByCategory).length === 0 && (
				<div className="text-center p-8 bg-gray-50 rounded-lg">
					<LuUsers className="h-12 w-12 text-gray-400 mx-auto mb-4" />
					<p className="text-gray-500">
						Tidak ada user bidang & departemen yang ditemukan
					</p>
				</div>
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

export default BidangManagement;
