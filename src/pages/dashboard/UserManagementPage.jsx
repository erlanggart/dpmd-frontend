// src/pages/dashboard/UserManagementPage.jsx
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
	LuChevronLeft,
	LuChevronRight,
} from "react-icons/lu";
import api from "../../api";
import AddUserModal from "../../components/AddUserModal";
import ResetPasswordModal from "../../components/ResetPasswordModal";
import EditRoleModal from "../../components/EditRoleModal";
import EditBidangModal from "../../components/EditBidangModal";
import UserStatsCard from "../../components/UserStatsCard";
import { useAuth } from "../../context/AuthContext";
import Swal from "sweetalert2";

const UserManagementPage = () => {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [showAddModal, setShowAddModal] = useState(false);
	const [showResetModal, setShowResetModal] = useState(false);
	const [showRoleModal, setShowRoleModal] = useState(false);
	const [showBidangModal, setShowBidangModal] = useState(false);
	const [selectedUser, setSelectedUser] = useState(null);
	const [isResettingPassword, setIsResettingPassword] = useState(false);
	
	// Filters
	const [searchTerm, setSearchTerm] = useState("");
	const [filterBidang, setFilterBidang] = useState("all"); // Filter bidang untuk tab Pegawai DPMD
	const [filterDinas, setFilterDinas] = useState("all"); // Filter dinas untuk tab Dinas Terkait
	const [activeTab, setActiveTab] = useState("superadmin"); // Tab aktif
	const [bidangList, setBidangList] = useState([]); // List bidang untuk dropdown
	const [dinasList, setDinasList] = useState([]); // List dinas untuk dropdown

	// Pagination
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage] = useState(12); // 12 items per page untuk grid 3 kolom

	const { user: currentUser } = useAuth();
	const canManage =
		currentUser?.role === "superadmin" ||
		currentUser?.role === "sekretaris_dinas";

	// Tab configuration
	const tabs = [
		{ id: "superadmin", label: "Super Admin", role: "superadmin", icon: LuShield, color: "red" },
		{ 
			id: "pegawai", 
			label: "Pegawai DPMD", 
			roles: ["kepala_dinas", "sekretaris_dinas", "kepala_bidang", "ketua_tim", "pegawai"], 
			icon: LuBriefcase, 
			color: "blue" 
		},
		{ id: "desa", label: "Admin Desa", role: "desa", icon: LuHouse, color: "emerald" },
		{ id: "kecamatan", label: "Admin Kecamatan", role: "kecamatan", icon: LuMapPin, color: "violet" },
		{ id: "dinas_terkait", label: "Dinas Terkait", role: "dinas_terkait", icon: LuBuilding2, color: "amber" },
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

	// Fetch bidang list
	const fetchBidangList = useCallback(async () => {
		try {
			const response = await api.get("/bidang");
			setBidangList(response.data.data || []);
		} catch (err) {
			console.error("Error fetching bidang:", err);
		}
	}, []);

	// Fetch dinas list
	const fetchDinasList = useCallback(async () => {
		try {
			const response = await api.get("/api/dinas/list");
			setDinasList(response.data.data || []);
		} catch (err) {
			console.error("Error fetching dinas:", err);
		}
	}, []);

	useEffect(() => {
		fetchUsers();
		fetchBidangList();
		fetchDinasList();
	}, [fetchUsers, fetchBidangList, fetchDinasList]);

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

	// Handle edit bidang
	const handleEditBidang = (user) => {
		setSelectedUser(user);
		setShowBidangModal(true);
	};

	const handleBidangUpdated = () => {
		setShowBidangModal(false);
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
			dinas_terkait: { label: "Dinas Terkait", color: "bg-amber-100 text-amber-700 border-amber-200" },
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
				user.kecamatan?.nama?.toLowerCase().includes(searchLower) ||
				user.bidang?.nama?.toLowerCase().includes(searchLower);

			// Filter berdasarkan bidang (hanya untuk tab Pegawai DPMD)
			const matchBidang = 
				activeTab !== "pegawai" ||
				filterBidang === "all" ||
				user.bidang_id === parseInt(filterBidang);

			// Filter berdasarkan dinas (hanya untuk tab Dinas Terkait)
			const matchDinas = 
				activeTab !== "dinas_terkait" ||
				filterDinas === "all" ||
				user.dinas_id === parseInt(filterDinas);

			return matchTab && matchSearch && matchBidang && matchDinas;
		});
	}, [users, searchTerm, activeTab, filterBidang, filterDinas, tabs]);

	// Pagination calculations
	const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

	// Reset to page 1 when filters change
	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm, activeTab, filterBidang, filterDinas]);

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
									setFilterBidang('all'); // Reset filter bidang
									setFilterDinas('all'); // Reset filter dinas
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
				<div className={`grid grid-cols-1 gap-4 ${(activeTab === "pegawai" || activeTab === "dinas_terkait") ? "md:grid-cols-3" : "md:grid-cols-1"}`}>
					{/* Search */}
					<div className={(activeTab === "pegawai" || activeTab === "dinas_terkait") ? "" : "md:col-span-1"}>
						<div className="relative">
							<LuSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
							<input
								type="text"
								placeholder="Cari nama, email, atau wilayah..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
							/>
						</div>
					</div>

					{/* Filter Bidang - Hanya muncul di tab Pegawai DPMD */}
					{activeTab === "pegawai" && (
						<div className="relative">
							<LuBuilding2 className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
							<select
								value={filterBidang}
								onChange={(e) => setFilterBidang(e.target.value)}
								className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none bg-white"
							>
								<option value="all">Semua Bidang</option>
								{bidangList.map((bidang) => (
									<option key={bidang.id} value={bidang.id}>
										{bidang.nama}
									</option>
								))}
							</select>
							<LuChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
						</div>
					)}

					{/* Filter Dinas - Hanya muncul di tab Dinas Terkait */}
					{activeTab === "dinas_terkait" && (
						<div className="relative">
							<LuBuilding2 className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
							<select
								value={filterDinas}
								onChange={(e) => setFilterDinas(e.target.value)}
								className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none bg-white"
							>
								<option value="all">Semua Dinas</option>
								{dinasList.map((dinas) => (
									<option key={dinas.id} value={dinas.id}>
										{dinas.nama_dinas}
									</option>
								))}
							</select>
							<LuChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
						</div>
					)}
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
								{searchTerm || filterBidang !== "all" || filterDinas !== "all"
									? "Tidak ada user yang sesuai"
									: "Belum ada user"}
							</p>
							<p className="text-sm text-gray-500">
								{searchTerm || filterBidang !== "all" || filterDinas !== "all"
									? "Coba ubah filter atau kata kunci pencarian"
									: 'Klik tombol "Tambah User" untuk menambahkan user baru'}
							</p>
						</div>
					</div>
				</div>
			) : (
				<>
					{/* Pagination Info */}
					<div className="mb-4 flex justify-between items-center text-sm text-gray-600">
						<div>
							Menampilkan <span className="font-semibold text-indigo-600">{startIndex + 1}</span> - <span className="font-semibold text-indigo-600">{Math.min(endIndex, filteredUsers.length)}</span> dari <span className="font-semibold text-indigo-600">{filteredUsers.length}</span> user
						</div>
						<div className="text-gray-500">
							Halaman {currentPage} dari {totalPages}
						</div>
					</div>

					{/* Users Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
						{paginatedUsers.map((user) => {
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
									user.role === "dinas_terkait" ? "bg-gradient-to-br from-amber-500 to-orange-600" :
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

										{user.bidang && (
											<div className="flex items-center gap-3 text-gray-600">
												<div className="h-9 w-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
													<LuBuilding2 className="h-4 w-4 text-purple-600" />
												</div>
												<span className="text-sm truncate flex-1">{user.bidang.nama}</span>
											</div>
										)}

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
													<LuMapPin className="h-4 w-4 text-violet-600" />
												</div>
												<span className="text-sm truncate flex-1">{user.kecamatan.nama}</span>
											</div>
										)}

										{user.dinas && (
											<div className="flex items-center gap-3 text-gray-600">
												<div className="h-9 w-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
													<LuBuilding2 className="h-4 w-4 text-amber-600" />
												</div>
												<span className="text-sm truncate flex-1">{user.dinas.nama_dinas}</span>
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

									{/* Actions */}
									<div className={`grid ${
										['superadmin', 'desa', 'kecamatan', 'dinas_terkait'].includes(user.role) 
											? 'grid-cols-2' 
											: 'grid-cols-4'
									} gap-2 pt-3 border-t border-gray-100`}>
										{!['superadmin', 'desa', 'kecamatan', 'dinas_terkait'].includes(user.role) && (
											<>
												<button
													onClick={() => handleEditRole(user)}
													className="flex flex-col items-center justify-center gap-1 p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all group/btn"
													title="Ubah Role"
												>
													<LuShield className="h-5 w-5 group-hover/btn:scale-110 transition-transform" />
													<span className="text-xs font-medium">Role</span>
												</button>
												<button
													onClick={() => handleEditBidang(user)}
													className="flex flex-col items-center justify-center gap-1 p-3 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-all group/btn"
													title="Ubah Bidang"
												>
													<LuBuilding2 className="h-5 w-5 group-hover/btn:scale-110 transition-transform" />
													<span className="text-xs font-medium">Bidang</span>
												</button>
											</>
										)}
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

				{/* Pagination Controls */}
				{totalPages > 1 && (
					<div className="mt-8 flex justify-center items-center gap-2">
						<button
							onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
							disabled={currentPage === 1}
							className={`p-3 rounded-xl transition-all ${
								currentPage === 1
									? 'bg-gray-100 text-gray-400 cursor-not-allowed'
									: 'bg-white text-indigo-600 hover:bg-indigo-50 shadow-md hover:shadow-lg'
							}`}
							title="Halaman Sebelumnya"
						>
							<LuChevronLeft className="h-5 w-5" />
						</button>

						{/* Page Numbers */}
						<div className="flex gap-2">
							{Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
								// Show first page, last page, current page, and pages around current
								const showPage =
									page === 1 ||
									page === totalPages ||
									(page >= currentPage - 1 && page <= currentPage + 1);

								// Show ellipsis
								const showEllipsisBefore = page === currentPage - 2 && currentPage > 3;
								const showEllipsisAfter = page === currentPage + 2 && currentPage < totalPages - 2;

								if (!showPage && !showEllipsisBefore && !showEllipsisAfter) {
									return null;
								}

								if (showEllipsisBefore || showEllipsisAfter) {
									return (
										<span key={page} className="px-3 py-2 text-gray-400">
											...
										</span>
									);
								}

								return (
									<button
										key={page}
										onClick={() => setCurrentPage(page)}
										className={`min-w-[44px] h-[44px] rounded-xl font-medium transition-all ${
											currentPage === page
												? 'bg-indigo-600 text-white shadow-lg scale-105'
												: 'bg-white text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 shadow-md'
										}`}
									>
										{page}
									</button>
								);
							})}
						</div>

						<button
							onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
							disabled={currentPage === totalPages}
							className={`p-3 rounded-xl transition-all ${
								currentPage === totalPages
									? 'bg-gray-100 text-gray-400 cursor-not-allowed'
									: 'bg-white text-indigo-600 hover:bg-indigo-50 shadow-md hover:shadow-lg'
							}`}
							title="Halaman Berikutnya"
						>
							<LuChevronRight className="h-5 w-5" />
						</button>
					</div>
				)}
				</>
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

			{showBidangModal && selectedUser && (
				<EditBidangModal
					isOpen={showBidangModal}
					onClose={() => {
						setShowBidangModal(false);
						setSelectedUser(null);
					}}
					onBidangUpdated={handleBidangUpdated}
					userData={selectedUser}
				/>
			)}
		</div>
	);
};

export default UserManagementPage;
