// src/pages/dashboard/UserManagementUnified.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
	LuUsers,
	LuUser,
	LuMail,
	LuCalendar,
	LuPlus,
	LuKey,
	LuTrash2,
	LuShield,
	LuSearch,
	LuFilter,
	LuChevronDown,
	LuBuilding2,
	LuMapPin,
	LuHouse,
	LuBriefcase,
} from "react-icons/lu";
import api from "../../api";
import AddUserModal from "../../components/AddUserModal";
import ResetPasswordModal from "../../components/ResetPasswordModal";
import EditRoleModal from "../../components/EditRoleModal";
import UserStatsCard from "../../components/UserStatsCard";
import { useAuth } from "../../context/AuthContext";
import Swal from "sweetalert2";

const UserManagementUnified = () => {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [showAddModal, setShowAddModal] = useState(false);
	const [showResetModal, setShowResetModal] = useState(false);
	const [showRoleModal, setShowRoleModal] = useState(false);
	const [selectedUser, setSelectedUser] = useState(null);
	const [isResettingPassword, setIsResettingPassword] = useState(false);
	
	// Filters
	const [searchTerm, setSearchTerm] = useState("");
	const [filterStatus, setFilterStatus] = useState("all");
	const [activeTab, setActiveTab] = useState("superadmin"); // Tab aktif

	const { user: currentUser } = useAuth();
	const canManage =
		currentUser?.role === "superadmin" ||
		currentUser?.role === "sekretaris_dinas";

	// Tab configuration
	const tabs = [
		{ id: "superadmin", label: "Super Admin", role: "superadmin", icon: LuShield, color: "red" },
		{ id: "kepala_dinas", label: "Kepala Dinas", role: "kepala_dinas", icon: LuBriefcase, color: "blue" },
		{ id: "sekretaris_dinas", label: "Sekretaris Dinas", role: "sekretaris_dinas", icon: LuBriefcase, color: "indigo" },
		{ id: "kepala_bidang", label: "Kepala Bidang", role: "kepala_bidang", icon: LuBuilding2, color: "green" },
		{ id: "ketua_tim", label: "Ketua Tim", role: "ketua_tim", icon: LuUsers, color: "teal" },
		{ id: "pegawai", label: "Pegawai", role: "pegawai", icon: LuUser, color: "gray" },
		{ id: "bidang", label: "Bidang", roles: ["sekretariat", "sarana_prasarana", "kekayaan_keuangan", "pemberdayaan_masyarakat", "pemerintahan_desa"], icon: LuBuilding2, color: "purple" },
		{ id: "desa", label: "Admin Desa", role: "desa", icon: LuHouse, color: "emerald" },
		{ id: "kecamatan", label: "Admin Kecamatan", role: "kecamatan", icon: LuMapPin, color: "violet" },
	];

	// Fetch users
	const fetchUsers = useCallback(async () => {
		setLoading(true);
		try {
			const response = await api.get("/users", {
				params: {
					limit: 1000,
				},
			});
			setUsers(response.data.data || []);
		} catch (err) {
			setError("Gagal mengambil data user.");
			console.error("Error fetching users:", err);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchUsers();
	}, [fetchUsers]);

	// Handle user added
	const handleUserAdded = () => {
		setShowAddModal(false);
		fetchUsers();
		Swal.fire({
			title: "Berhasil!",
			text: "User berhasil ditambahkan",
			icon: "success",
			timer: 2000,
			showConfirmButton: false,
		});
	};

	// Handle reset password
	const handleResetPassword = (user) => {
		setSelectedUser(user);
		setShowResetModal(true);
	};

	const handleConfirmResetPassword = async () => {
		if (!selectedUser) return;

		setIsResettingPassword(true);
		try {
			await api.put(`/users/${selectedUser.id}/reset-password`, {
				password: "password",
			});

			setShowResetModal(false);
			setSelectedUser(null);

			Swal.fire({
				title: "Berhasil!",
				text: `Password untuk ${selectedUser.name} berhasil direset!`,
				icon: "success",
				confirmButtonText: "OK",
				confirmButtonColor: "#10b981",
			});
		} catch (error) {
			console.error("Error resetting password:", error);
			Swal.fire({
				title: "Gagal!",
				text: error.response?.data?.message || "Gagal mereset password.",
				icon: "error",
				confirmButtonText: "OK",
				confirmButtonColor: "#ef4444",
			});
		} finally {
			setIsResettingPassword(false);
		}
	};

	// Handle edit role
	const handleEditRole = (user) => {
		setSelectedUser(user);
		setShowRoleModal(true);
	};

	const handleRoleUpdated = () => {
		setShowRoleModal(false);
		setSelectedUser(null);
		fetchUsers();
	};

	// Handle delete user
	const handleDeleteUser = async (user) => {
		const result = await Swal.fire({
			title: "Hapus User?",
			text: `Apakah Anda yakin ingin menghapus user ${user.name}?`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#d33",
			cancelButtonColor: "#3085d6",
			confirmButtonText: "Ya, Hapus!",
			cancelButtonText: "Batal",
		});

		if (result.isConfirmed) {
			try {
				await api.delete(`/users/${user.id}`);
				Swal.fire("Terhapus!", "User berhasil dihapus.", "success");
				fetchUsers();
			} catch (err) {
				Swal.fire(
					"Error!",
					err.response?.data?.message || "Gagal menghapus user.",
					"error"
				);
			}
		}
	};

	// Get role info
	const getRoleInfo = (role) => {
		const roleMap = {
			superadmin: { label: "Super Admin", color: "bg-red-100 text-red-700 border-red-200" },
			kepala_dinas: { label: "Kepala Dinas", color: "bg-blue-100 text-blue-700 border-blue-200" },
			sekretaris_dinas: { label: "Sekretaris Dinas", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
			kepala_bidang: { label: "Kepala Bidang", color: "bg-green-100 text-green-700 border-green-200" },
			ketua_tim: { label: "Ketua Tim", color: "bg-teal-100 text-teal-700 border-teal-200" },
			pegawai: { label: "Pegawai", color: "bg-gray-100 text-gray-700 border-gray-200" },
			sekretariat: { label: "Sekretariat", color: "bg-purple-100 text-purple-700 border-purple-200" },
			sarana_prasarana: { label: "Sarana Prasarana", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
			kekayaan_keuangan: { label: "Kekayaan Keuangan", color: "bg-pink-100 text-pink-700 border-pink-200" },
			pemberdayaan_masyarakat: { label: "Pemberdayaan Masyarakat", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
			pemerintahan_desa: { label: "Pemerintahan Desa", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
			desa: { label: "Admin Desa", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
			kecamatan: { label: "Admin Kecamatan", color: "bg-violet-100 text-violet-700 border-violet-200" },
		};
		return roleMap[role] || { label: role, color: "bg-gray-100 text-gray-700 border-gray-200" };
	};

	// Get icon for role
	const getRoleIcon = (role) => {
		if (role === "desa") return LuHouse;
		if (role === "kecamatan") return LuMapPin;
		if (["kepala_bidang", "ketua_tim", "pegawai", "sekretariat", "sarana_prasarana", "kekayaan_keuangan", "pemberdayaan_masyarakat", "pemerintahan_desa"].includes(role)) {
			return LuBriefcase;
		}
		return LuUser;
	};

	// Filter users
	const filteredUsers = useMemo(() => {
		return users.filter((user) => {
			// Filter berdasarkan tab aktif
			const activeTabConfig = tabs.find(t => t.id === activeTab);
			let matchTab = false;
			
			if (activeTabConfig.role) {
				matchTab = user.role === activeTabConfig.role;
			} else if (activeTabConfig.roles) {
				matchTab = activeTabConfig.roles.includes(user.role);
			}

			// Filter berdasarkan search
			const searchLower = searchTerm.toLowerCase();
			const matchSearch =
				user.name?.toLowerCase().includes(searchLower) ||
				user.email?.toLowerCase().includes(searchLower) ||
				user.desa?.nama?.toLowerCase().includes(searchLower) ||
				user.kecamatan?.nama?.toLowerCase().includes(searchLower);

			// Filter berdasarkan status
			const matchStatus =
				filterStatus === "all" ||
				(filterStatus === "active" && user.is_active) ||
				(filterStatus === "inactive" && !user.is_active);

			return matchTab && matchSearch && matchStatus;
		});
	}, [users, searchTerm, activeTab, filterStatus, tabs]);

	// Group by role for stats
	const statsByRole = useMemo(() => {
		const stats = {};
		users.forEach((user) => {
			stats[user.role] = (stats[user.role] || 0) + 1;
		});
		return stats;
	}, [users]);

	if (loading)
		return (
			<div className="flex justify-center items-center p-12">
				<div className="flex flex-col items-center gap-3">
					<div className="animate-spin rounded-full h-12 w-12 border-b-3 border-indigo-500"></div>
					<p className="text-gray-600 text-sm">Memuat data...</p>
				</div>
			</div>
		);

	if (error)
		return (
			<div className="p-6 text-center bg-red-50 border border-red-200 rounded-xl">
				<p className="text-red-600 font-medium">{error}</p>
			</div>
		);

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6 lg:p-8">
			{/* Header */}
			<div className="mb-6">
				<div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden">
					<div className="absolute inset-0 bg-black opacity-5"></div>
					<div className="relative z-10">
						<h1 className="text-3xl md:text-4xl font-bold mb-3 flex items-center gap-3">
							<div className="h-10 w-10 md:h-12 md:w-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
								<LuUsers className="w-6 h-6 md:w-7 md:h-7" />
							</div>
							Manajemen Pengguna
						</h1>
						<p className="text-white/90 text-base md:text-lg">
							Kelola semua pengguna sistem DPMD dalam satu halaman
						</p>
					</div>
				</div>
			</div>

			{/* Statistics */}
			<UserStatsCard />

			{/* Tabs untuk Role */}
			<div className="bg-white rounded-2xl shadow-lg p-4 mb-6 overflow-x-auto">
				<div className="flex gap-2 min-w-max">
					{tabs.map((tab) => {
						const Icon = tab.icon;
						const isActive = activeTab === tab.id;
						const count = tab.role 
							? statsByRole[tab.role] || 0
							: tab.roles?.reduce((sum, r) => sum + (statsByRole[r] || 0), 0) || 0;
						
						// Get button color class
						const getButtonClass = () => {
							if (!isActive) return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
							
							const colorMap = {
								red: 'bg-red-500 text-white shadow-lg',
								blue: 'bg-blue-500 text-white shadow-lg',
								indigo: 'bg-indigo-500 text-white shadow-lg',
								green: 'bg-green-500 text-white shadow-lg',
								teal: 'bg-teal-500 text-white shadow-lg',
								gray: 'bg-gray-500 text-white shadow-lg',
								purple: 'bg-purple-500 text-white shadow-lg',
								emerald: 'bg-emerald-500 text-white shadow-lg',
								violet: 'bg-violet-500 text-white shadow-lg',
							};
							return colorMap[tab.color] || 'bg-gray-500 text-white shadow-lg';
						};
						
						return (
							<button
								key={tab.id}
								onClick={() => {
									setActiveTab(tab.id);
									setSearchTerm('');
									setFilterStatus('all');
								}}
								className={`
									flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all
									${getButtonClass()}
								`}
							>
								<Icon className="w-4 h-4" />
								<span>{tab.label}</span>
								<span className={`
									px-2 py-0.5 rounded-full text-xs font-bold
									${isActive ? 'bg-white/20' : 'bg-gray-200 text-gray-600'}
								`}>
									{count}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Filters & Actions */}
			<div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{/* Search */}
					<div className="md:col-span-2 relative">
						<LuSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
						<input
							type="text"
							placeholder="Cari nama, email, atau wilayah..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
						/>
					</div>

					{/* Filter Status */}
					<div className="relative">
						<select
							value={filterStatus}
							onChange={(e) => setFilterStatus(e.target.value)}
							className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none bg-white"
						>
							<option value="all">Semua Status</option>
							<option value="active">Aktif Saja</option>
							<option value="inactive">Nonaktif Saja</option>
						</select>
						<LuChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
					</div>
				</div>

				{/* Add User Button */}
				<div className="mt-4 flex justify-end">
					<button
						onClick={() => setShowAddModal(true)}
						className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
					>
						<LuPlus className="h-5 w-5" />
						<span className="font-semibold">Tambah User</span>
					</button>
				</div>

				{/* Results Info */}
				<div className="mt-4 pt-4 border-t border-gray-200">
					<p className="text-sm text-gray-600">
						Menampilkan <span className="font-semibold text-gray-900">{filteredUsers.length}</span> dari{" "}
						<span className="font-semibold text-gray-900">{users.length}</span> user
					</p>
				</div>
			</div>

			{/* Users Grid */}
			{filteredUsers.length === 0 ? (
				<div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
					<div className="flex flex-col items-center gap-4">
						<div className="h-20 w-20 bg-gray-100 rounded-2xl flex items-center justify-center">
							<LuUsers className="h-10 w-10 text-gray-400" />
						</div>
						<div>
							<p className="text-gray-700 font-semibold text-lg mb-1">
								{searchTerm || filterRole !== "all" || filterStatus !== "all"
									? "Tidak ada user yang sesuai"
									: "Belum ada user"}
							</p>
							<p className="text-sm text-gray-500">
								{searchTerm || filterRole !== "all" || filterStatus !== "all"
									? "Coba ubah filter atau kata kunci pencarian"
									: 'Klik tombol "Tambah User" untuk menambahkan user baru'}
							</p>
						</div>
					</div>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
					{filteredUsers.map((user) => {
						const roleInfo = getRoleInfo(user.role);
						const RoleIcon = getRoleIcon(user.role);

						return (
							<div
								key={user.id}
								className="bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 group"
							>
								{/* Header with gradient based on role */}
								<div className={`p-5 ${
									user.role === "superadmin" ? "bg-gradient-to-br from-red-500 to-pink-600" :
									user.role === "kepala_dinas" ? "bg-gradient-to-br from-blue-500 to-indigo-600" :
									user.role === "sekretaris_dinas" ? "bg-gradient-to-br from-indigo-500 to-purple-600" :
									user.role === "kepala_bidang" ? "bg-gradient-to-br from-green-500 to-teal-600" :
									user.role === "ketua_tim" ? "bg-gradient-to-br from-teal-500 to-cyan-600" :
									user.role === "desa" ? "bg-gradient-to-br from-emerald-500 to-green-600" :
									user.role === "kecamatan" ? "bg-gradient-to-br from-violet-500 to-purple-600" :
									"bg-gradient-to-br from-gray-500 to-slate-600"
								}`}>
									<div className="flex items-center gap-3">
										<div className="h-14 w-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
											<RoleIcon className="h-7 w-7 text-white" />
										</div>
										<div className="flex-1 min-w-0">
											<h4 className="font-bold text-white text-lg truncate">
												{user.name}
											</h4>
											<span className={`inline-block px-3 py-1 text-xs bg-white/20 backdrop-blur-sm text-white rounded-full font-medium`}>
												{roleInfo.label}
											</span>
										</div>
									</div>
								</div>

								{/* Body */}
								<div className="p-5 space-y-4">
									<div className="space-y-3">
										<div className="flex items-center gap-3 text-gray-600">
											<div className="h-9 w-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
												<LuMail className="h-4 w-4" />
											</div>
											<span className="text-sm truncate flex-1">{user.email}</span>
										</div>

										{user.desa && (
											<div className="flex items-center gap-3 text-gray-600">
												<div className="h-9 w-9 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
													<LuHouse className="h-4 w-4 text-emerald-600" />
												</div>
												<span className="text-sm truncate flex-1">{user.desa.nama}</span>
											</div>
										)}

										{user.kecamatan && (
											<div className="flex items-center gap-3 text-gray-600">
												<div className="h-9 w-9 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
													<LuBuilding2 className="h-4 w-4 text-violet-600" />
												</div>
												<span className="text-sm truncate flex-1">{user.kecamatan.nama}</span>
											</div>
										)}

										<div className="flex items-center gap-3 text-gray-600">
											<div className="h-9 w-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
												<LuCalendar className="h-4 w-4 text-blue-600" />
											</div>
											<span className="text-sm">
												{new Date(user.created_at).toLocaleDateString("id-ID", {
													day: "numeric",
													month: "short",
													year: "numeric",
												})}
											</span>
										</div>
									</div>

									<div className="flex items-center justify-between pt-3 border-t border-gray-100">
										<span
											className={`text-xs px-3 py-1.5 rounded-full font-semibold ${
												user.is_active
													? "bg-green-100 text-green-700"
													: "bg-red-100 text-red-700"
											}`}
										>
											{user.is_active ? "● Aktif" : "● Nonaktif"}
										</span>
									</div>

									{/* Actions */}
									<div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
										<button
											onClick={() => handleEditRole(user)}
											className="flex flex-col items-center justify-center gap-1 p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all group/btn"
											title="Ubah Role"
										>
											<LuShield className="h-5 w-5 group-hover/btn:scale-110 transition-transform" />
											<span className="text-xs font-medium">Role</span>
										</button>
										<button
											onClick={() => handleResetPassword(user)}
											className="flex flex-col items-center justify-center gap-1 p-3 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-all group/btn"
											title="Reset Password"
										>
											<LuKey className="h-5 w-5 group-hover/btn:scale-110 transition-transform" />
											<span className="text-xs font-medium">Reset</span>
										</button>
										<button
											onClick={() => handleDeleteUser(user)}
											className="flex flex-col items-center justify-center gap-1 p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all group/btn"
											title="Hapus User"
										>
											<LuTrash2 className="h-5 w-5 group-hover/btn:scale-110 transition-transform" />
											<span className="text-xs font-medium">Hapus</span>
										</button>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Modals */}
			{showAddModal && (
				<AddUserModal
					isOpen={showAddModal}
					onClose={() => setShowAddModal(false)}
					onUserAdded={handleUserAdded}
				/>
			)}

			{showResetModal && selectedUser && (
				<ResetPasswordModal
					isOpen={showResetModal}
					onClose={() => {
						setShowResetModal(false);
						setSelectedUser(null);
					}}
					onConfirm={handleConfirmResetPassword}
					userName={selectedUser.name}
					isLoading={isResettingPassword}
				/>
			)}

			{showRoleModal && selectedUser && (
				<EditRoleModal
					isOpen={showRoleModal}
					onClose={() => {
						setShowRoleModal(false);
						setSelectedUser(null);
					}}
					onRoleUpdated={handleRoleUpdated}
					userData={selectedUser}
				/>
			)}
		</div>
	);
};

export default UserManagementUnified;
