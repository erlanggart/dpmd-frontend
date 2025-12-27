// src/components/tabs/PegawaiManagement.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
	LuUsers,
	LuUser,
	LuMail,
	LuBriefcase,
	LuPlus,
	LuShield,
	LuCheck,
	LuX,
	LuKey,
	LuTrash2,
	LuCalendar,
	LuUserCheck,
	LuSearch,
	LuChevronLeft,
	LuChevronRight,
	LuFilter,
	LuArrowRight,
} from "react-icons/lu";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import Swal from "sweetalert2";

const PegawaiManagement = () => {
	const [pegawaiList, setPegawaiList] = useState([]);
	const [pegawaiUsers, setPegawaiUsers] = useState([]);
	const [bidangs, setBidangs] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [showAddModal, setShowAddModal] = useState(false);
	const [showRoleModal, setShowRoleModal] = useState(false);
	const [selectedUserForRole, setSelectedUserForRole] = useState(null);
	const [selectedRole, setSelectedRole] = useState('');
	const { user: currentUser } = useAuth();
	const navigate = useNavigate();

	// Search and filter states
	const [searchWithAccount, setSearchWithAccount] = useState("");
	const [searchWithoutAccount, setSearchWithoutAccount] = useState("");
	const [filterBidang, setFilterBidang] = useState("");
	const [filterStatus, setFilterStatus] = useState("all"); // all, active, inactive

	// Pagination states
	const [currentPageWithAccount, setCurrentPageWithAccount] = useState(1);
	const [currentPageWithoutAccount, setCurrentPageWithoutAccount] = useState(1);
	const itemsPerPage = 9;

	// Fetch pegawai list with users
	const fetchPegawai = useCallback(async () => {
		setLoading(true);
		try {
			const response = await api.get("/pegawai");
			const allPegawai = response.data.data || [];
			
			// Separate pegawai with and without accounts
			const withAccounts = [];
			const withoutAccounts = [];
			
			allPegawai.forEach((pegawai) => {
				if (pegawai.users && pegawai.users.length > 0) {
					// Pegawai has user account(s)
					pegawai.users.forEach((user) => {
						withAccounts.push({
							...user,
							pegawai_data: {
								id_pegawai: pegawai.id_pegawai,
								nama_pegawai: pegawai.nama_pegawai,
								id_bidang: pegawai.id_bidang,
								bidangs: pegawai.bidangs
							}
						});
					});
				} else {
					// Pegawai doesn't have user account
					withoutAccounts.push(pegawai);
				}
			});
			
			setPegawaiList(withoutAccounts); // Pegawai without accounts
			setPegawaiUsers(withAccounts);   // Pegawai with accounts
		} catch (err) {
			setError("Gagal mengambil data pegawai.");
			console.error("Error fetching pegawai:", err);
		} finally {
			setLoading(false);
		}
	}, []);

	// Fetch pegawai users - REMOVED (now handled in fetchPegawai)

	// Fetch bidangs
	const fetchBidangs = useCallback(async () => {
		try {
			const response = await api.get("/bidang");
			setBidangs(response.data.data || []);
		} catch (err) {
			console.error("Error fetching bidangs:", err);
		}
	}, []);

	useEffect(() => {
		fetchPegawai();
		fetchBidangs();
	}, [fetchPegawai, fetchBidangs]);

	// Create pegawai account
	const handleCreateAccount = async (pegawai) => {
		const result = await Swal.fire({
			title: "Buat Akun Pegawai",
			html: `
				<p>Buat akun untuk: <strong>${pegawai.nama_pegawai}</strong></p>
				<div style="margin-top: 20px; text-align: left;">
					<label style="display: block; margin-bottom: 8px; font-weight: 500;">Email:</label>
					<input type="email" id="email" class="swal2-input" placeholder="Masukkan email" style="margin: 0; width: 100%;">
				</div>
			`,
			icon: "question",
			showCancelButton: true,
			confirmButtonText: "Buat Akun",
			cancelButtonText: "Batal",
			confirmButtonColor: "#3b82f6",
			cancelButtonColor: "#6b7280",
			preConfirm: () => {
				const email = document.getElementById("email").value;
				if (!email) {
					Swal.showValidationMessage("Email harus diisi!");
					return false;
				}
				if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
					Swal.showValidationMessage("Format email tidak valid!");
					return false;
				}
				return { email };
			},
		});

		if (!result.isConfirmed) return;

		try {
			const payload = {
				name: pegawai.nama_pegawai,
				email: result.value.email,
				password: "dpmd2025", // Default password
				role: "pegawai",
				pegawai_id: pegawai.id_pegawai,
				bidang_id: pegawai.id_bidang,
			};

			await api.post("/users", payload);

			Swal.fire({
				title: "Berhasil!",
				html: `
					Akun untuk <strong>${pegawai.nama_pegawai}</strong> berhasil dibuat!<br><br>
					Email: <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">${result.value.email}</code><br>
					Password: <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">dpmd2025</code>
				`,
				icon: "success",
				confirmButtonText: "OK",
				confirmButtonColor: "#10b981",
			});

			fetchPegawai(); // Refresh data
		} catch (error) {
			console.error("Error creating account:", error);
			Swal.fire({
				title: "Gagal!",
				text: error.response?.data?.message || "Gagal membuat akun. Silakan coba lagi.",
				icon: "error",
				confirmButtonText: "OK",
				confirmButtonColor: "#ef4444",
			});
		}
	};

	// Reset password
	const handleResetPassword = async (user) => {
		const result = await Swal.fire({
			title: "Reset Password",
			html: `Reset password untuk: <strong>${user.name}</strong>?<br><br>Password akan direset ke: <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">dpmd2025</code>`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Reset",
			cancelButtonText: "Batal",
			confirmButtonColor: "#f59e0b",
			cancelButtonColor: "#6b7280",
		});

		if (!result.isConfirmed) return;

		try {
			await api.put(`/users/${user.id}/reset-password`, {
				password: "dpmd2025",
			});

			Swal.fire({
				title: "Berhasil!",
				text: `Password untuk ${user.name} berhasil direset!`,
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
		}
	};

	// Toggle active status
	const handleToggleActive = async (user) => {
		const newStatus = !user.is_active;
		const action = newStatus ? "mengaktifkan" : "menonaktifkan";

		const result = await Swal.fire({
			title: `${newStatus ? "Aktifkan" : "Nonaktifkan"} Akun`,
			text: `Yakin ${action} akun ${user.name}?`,
			icon: "question",
			showCancelButton: true,
			confirmButtonText: "Ya",
			cancelButtonText: "Batal",
			confirmButtonColor: newStatus ? "#10b981" : "#ef4444",
			cancelButtonColor: "#6b7280",
		});

		if (!result.isConfirmed) return;

		try {
			await api.put(`/users/${user.id}`, {
				is_active: newStatus,
			});

			Swal.fire({
				title: "Berhasil!",
				text: `Akun ${user.name} berhasil ${newStatus ? "diaktifkan" : "dinonaktifkan"}!`,
				icon: "success",
				confirmButtonText: "OK",
				confirmButtonColor: "#10b981",
			});

			fetchPegawai(); // Refresh data
		} catch (error) {
			console.error("Error toggling active:", error);
			Swal.fire({
				title: "Gagal!",
				text: error.response?.data?.message || `Gagal ${action} akun.`,
				icon: "error",
				confirmButtonText: "OK",
				confirmButtonColor: "#ef4444",
			});
		}
	};

	// Delete account
	const handleDeleteAccount = async (user) => {
		const result = await Swal.fire({
			title: "Hapus Akun",
			html: `Yakin hapus akun <strong>${user.name}</strong>?<br><br><span style="color:#ef4444;">Tindakan ini tidak dapat dibatalkan!</span>`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Hapus",
			cancelButtonText: "Batal",
			confirmButtonColor: "#ef4444",
			cancelButtonColor: "#6b7280",
		});

		if (!result.isConfirmed) return;

		try {
			await api.delete(`/users/${user.id}`);

			Swal.fire({
				title: "Berhasil!",
				text: `Akun ${user.name} berhasil dihapus!`,
				icon: "success",
				confirmButtonText: "OK",
				confirmButtonColor: "#10b981",
			});

			fetchPegawai(); // Refresh data
		} catch (error) {
			console.error("Error deleting account:", error);
			Swal.fire({
				title: "Gagal!",
				text: error.response?.data?.message || "Gagal menghapus akun.",
				icon: "error",
				confirmButtonText: "OK",
				confirmButtonColor: "#ef4444",
			});
		}
	};

	// Handle edit role
	const handleEditRole = (user) => {
		setSelectedUserForRole(user);
		setSelectedRole(user.role || '');
		setShowRoleModal(true);
	};

	// Handle update role
	const handleUpdateRole = async () => {
		if (!selectedUserForRole || !selectedRole) return;

		try {
			await api.put(`/users/${selectedUserForRole.id}`, {
				role: selectedRole
			});

			Swal.fire({
				title: "Berhasil!",
				text: `Role untuk ${selectedUserForRole.name} berhasil diupdate!`,
				icon: "success",
				confirmButtonText: "OK",
				confirmButtonColor: "#10b981",
			});

			setShowRoleModal(false);
			setSelectedUserForRole(null);
			setSelectedRole('');
			fetchPegawai(); // Refresh data
		} catch (error) {
			console.error("Error updating role:", error);
			Swal.fire({
				title: "Gagal!",
				text: error.response?.data?.message || "Gagal mengupdate role.",
				icon: "error",
				confirmButtonText: "OK",
				confirmButtonColor: "#ef4444",
			});
		}
	};

	// Get bidang name
	const getBidangName = (bidangId) => {
		const bidang = bidangs.find((b) => String(b.id) === String(bidangId));
		return bidang?.nama || "N/A";
	};

	// Get role display name and color
	const getRoleInfo = (role) => {
		const roleMap = {
			superadmin: { label: 'Super Admin', color: 'bg-red-100 text-red-700 border-red-200' },
			kepala_dinas: { label: 'Kepala Dinas', color: 'bg-blue-100 text-blue-700 border-blue-200' },
			sekretaris_dinas: { label: 'Sekretaris Dinas', color: 'bg-purple-100 text-purple-700 border-purple-200' },
			kepala_bidang: { label: 'Kepala Bidang', color: 'bg-green-100 text-green-700 border-green-200' },
			pegawai: { label: 'Pegawai', color: 'bg-teal-100 text-teal-700 border-teal-200' },
			ketua_tim: { label: 'Ketua Tim', color: 'bg-orange-100 text-orange-700 border-orange-200' },
			sekretariat: { label: 'Sekretariat', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
			sarana_prasarana: { label: 'Sarana Prasarana', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
			kekayaan_keuangan: { label: 'Kekayaan Keuangan', color: 'bg-pink-100 text-pink-700 border-pink-200' }
		};
		return roleMap[role] || { label: role, color: 'bg-gray-100 text-gray-700 border-gray-200' };
	};

	// Get dashboard URL based on bidang_id
	const getBidangDashboardUrl = (bidangId) => {
		// Map bidang_id to dashboard URLs based on actual database
		const bidangMap = {
			2: '/dashboard/perjalanan-dinas', // Sekretariat
			3: '/dashboard/bankeu',           // Sarana Prasarana Kewilayahan dan Ekonomi Desa (SPKED)
			4: '/dashboard/add',              // Kekayaan dan Keuangan Desa (KKD)
			5: '/dashboard/kelembagaan',      // Pemberdayaan Masyarakat Desa
			6: '/dashboard/kelembagaan',      // Pemerintahan Desa
		};
		return bidangMap[bidangId] || null;
	};

	// Get bidang dashboard name
	const getBidangDashboardName = (bidangId) => {
		const bidangNames = {
			2: 'Dashboard Sekretariat',
			3: 'Dashboard Sarpras',
			4: 'Dashboard KKD',
			5: 'Dashboard Pemmas',
			6: 'Dashboard Pemdes',
		};
		return bidangNames[bidangId] || null;
	};

	// Filter and search logic for pegawai with accounts
	const filteredPegawaiUsers = useMemo(() => {
		let filtered = [...pegawaiUsers];

		// Search filter
		if (searchWithAccount) {
			filtered = filtered.filter(
				(user) =>
					user.name?.toLowerCase().includes(searchWithAccount.toLowerCase()) ||
					user.email?.toLowerCase().includes(searchWithAccount.toLowerCase())
			);
		}

		// Bidang filter
		if (filterBidang) {
			filtered = filtered.filter((user) => String(user.bidang_id) === String(filterBidang));
		}

		// Status filter
		if (filterStatus !== "all") {
			filtered = filtered.filter((user) => {
				if (filterStatus === "active") return user.is_active;
				if (filterStatus === "inactive") return !user.is_active;
				return true;
			});
		}

		return filtered;
	}, [pegawaiUsers, searchWithAccount, filterBidang, filterStatus]);

	// Filter and search logic for pegawai without accounts
	const filteredPegawaiList = useMemo(() => {
		let filtered = [...pegawaiList];

		// Search filter
		if (searchWithoutAccount) {
			filtered = filtered.filter((pegawai) =>
				pegawai.nama_pegawai?.toLowerCase().includes(searchWithoutAccount.toLowerCase())
			);
		}

		// Bidang filter
		if (filterBidang) {
			filtered = filtered.filter((pegawai) => String(pegawai.id_bidang) === String(filterBidang));
		}

		return filtered;
	}, [pegawaiList, searchWithoutAccount, filterBidang]);

	// Pagination for pegawai with accounts
	const paginatedPegawaiUsers = useMemo(() => {
		const startIndex = (currentPageWithAccount - 1) * itemsPerPage;
		const endIndex = startIndex + itemsPerPage;
		return filteredPegawaiUsers.slice(startIndex, endIndex);
	}, [filteredPegawaiUsers, currentPageWithAccount]);

	const totalPagesWithAccount = Math.ceil(filteredPegawaiUsers.length / itemsPerPage);

	// Pagination for pegawai without accounts
	const paginatedPegawaiList = useMemo(() => {
		const startIndex = (currentPageWithoutAccount - 1) * itemsPerPage;
		const endIndex = startIndex + itemsPerPage;
		return filteredPegawaiList.slice(startIndex, endIndex);
	}, [filteredPegawaiList, currentPageWithoutAccount]);

	const totalPagesWithoutAccount = Math.ceil(filteredPegawaiList.length / itemsPerPage);

	// Reset pagination when filters change
	useEffect(() => {
		setCurrentPageWithAccount(1);
	}, [searchWithAccount, filterBidang, filterStatus]);

	useEffect(() => {
		setCurrentPageWithoutAccount(1);
	}, [searchWithoutAccount, filterBidang]);

	if (loading) {
		return (
			<div className="flex justify-center items-center min-h-[400px]">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-center text-red-600 p-4">
				<p>{error}</p>
			</div>
		);
	}

	// Pagination Component
	const Pagination = ({ currentPage, totalPages, onPageChange }) => {
		const pages = [];
		const maxVisiblePages = 5;
		
		let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
		let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
		
		if (endPage - startPage < maxVisiblePages - 1) {
			startPage = Math.max(1, endPage - maxVisiblePages + 1);
		}

		for (let i = startPage; i <= endPage; i++) {
			pages.push(i);
		}

		if (totalPages <= 1) return null;

		return (
			<div className="flex items-center justify-center gap-2 mt-6">
				<button
					onClick={() => onPageChange(currentPage - 1)}
					disabled={currentPage === 1}
					className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					<LuChevronLeft className="w-4 h-4" />
				</button>

				{startPage > 1 && (
					<>
						<button
							onClick={() => onPageChange(1)}
							className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
						>
							1
						</button>
						{startPage > 2 && <span className="px-2 text-gray-500">...</span>}
					</>
				)}

				{pages.map((page) => (
					<button
						key={page}
						onClick={() => onPageChange(page)}
						className={`px-3 py-2 rounded-lg border transition-colors ${
							page === currentPage
								? "bg-blue-600 text-white border-blue-600"
								: "border-gray-300 hover:bg-gray-50"
						}`}
					>
						{page}
					</button>
				))}

				{endPage < totalPages && (
					<>
						{endPage < totalPages - 1 && <span className="px-2 text-gray-500">...</span>}
						<button
							onClick={() => onPageChange(totalPages)}
							className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
						>
							{totalPages}
						</button>
					</>
				)}

				<button
					onClick={() => onPageChange(currentPage + 1)}
					disabled={currentPage === totalPages}
					className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					<LuChevronRight className="w-4 h-4" />
				</button>

				<span className="ml-4 text-sm text-gray-600">
					Halaman {currentPage} dari {totalPages}
				</span>
			</div>
		);
	};

	return (
		<div className="space-y-6">
			{/* Filters */}
			<div className="bg-white rounded-lg shadow p-4">
				<div className="flex items-center gap-2 mb-4">
					<LuFilter className="w-5 h-5 text-gray-600" />
					<h3 className="text-lg font-semibold text-gray-800">Filter & Pencarian</h3>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Filter Bidang
						</label>
						<select
							value={filterBidang}
							onChange={(e) => setFilterBidang(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
							<option value="">Semua Bidang</option>
							{bidangs.map((bidang) => (
								<option key={bidang.id} value={bidang.id}>
									{bidang.nama}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Filter Status
						</label>
						<select
							value={filterStatus}
							onChange={(e) => setFilterStatus(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
							<option value="all">Semua Status</option>
							<option value="active">Aktif</option>
							<option value="inactive">Nonaktif</option>
						</select>
					</div>
					<div className="flex items-end">
						<button
							onClick={() => {
								setFilterBidang("");
								setFilterStatus("all");
								setSearchWithAccount("");
								setSearchWithoutAccount("");
							}}
							className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
						>
							Reset Filter
						</button>
					</div>
				</div>
			</div>

			{/* Statistics */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-blue-100 text-sm font-medium mb-1">Total Pegawai</p>
							<p className="text-3xl font-bold">{pegawaiUsers.length + pegawaiList.length}</p>
						</div>
						<div className="bg-white/20 p-3 rounded-lg">
							<LuUsers className="w-8 h-8" />
						</div>
					</div>
				</div>

				<div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-green-100 text-sm font-medium mb-1">Punya Akun</p>
							<p className="text-3xl font-bold">{pegawaiUsers.length}</p>
						</div>
						<div className="bg-white/20 p-3 rounded-lg">
							<LuCheck className="w-8 h-8" />
						</div>
					</div>
				</div>

				<div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white shadow-lg">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-orange-100 text-sm font-medium mb-1">Belum Punya Akun</p>
							<p className="text-3xl font-bold">{pegawaiList.length}</p>
						</div>
						<div className="bg-white/20 p-3 rounded-lg">
							<LuUser className="w-8 h-8" />
						</div>
					</div>
				</div>
			</div>

			{/* Pegawai with Accounts */}
			<div className="bg-white rounded-lg shadow">
				<div className="px-6 py-4 border-b border-gray-200">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
							<LuShield className="w-5 h-5 text-blue-600" />
							Pegawai dengan Akun ({filteredPegawaiUsers.length})
						</h3>
					</div>
					{/* Search Bar */}
					<div className="relative">
						<LuSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
						<input
							type="text"
							placeholder="Cari nama atau email..."
							value={searchWithAccount}
							onChange={(e) => setSearchWithAccount(e.target.value)}
							className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
					</div>
				</div>
				<div className="p-6">
					{filteredPegawaiUsers.length === 0 ? (
						<div className="text-center p-8 bg-gray-50 rounded-lg">
							<LuUser className="h-12 w-12 text-gray-400 mx-auto mb-4" />
							<p className="text-gray-500">
								{searchWithAccount || filterBidang || filterStatus !== "all"
									? "Tidak ada pegawai yang sesuai dengan filter"
									: "Belum ada pegawai dengan akun"}
							</p>
						</div>
					) : (
						<>
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
								{paginatedPegawaiUsers.map((user) => {
								return (
									<div
										key={user.id}
										className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-200"
									>
										<div className="flex items-center gap-3 mb-4">
											<div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
												<LuUser className="h-6 w-6 text-white" />
											</div>
											<div className="flex-1 min-w-0">
												<h3 className="font-semibold text-gray-900 truncate">{user.name}</h3>
												<p className="text-sm text-blue-600 font-medium">Pegawai</p>
											</div>
										</div>

										<div className="space-y-2 text-sm mb-4">
											<div className="flex items-center gap-2 text-gray-600">
												<LuMail className="h-4 w-4 flex-shrink-0" />
												<span className="truncate">{user.email}</span>
											</div>
											<div className="flex items-center gap-2 text-gray-600">
												<LuBriefcase className="h-4 w-4 flex-shrink-0" />
												<span className="truncate">
													{user.pegawai_data?.bidangs?.nama || getBidangName(user.bidang_id)}
												</span>
											</div>
											
											{/* Role Display */}
											<div className="flex items-center gap-2">
												<LuShield className="h-4 w-4 flex-shrink-0 text-purple-600" />
												{user.role ? (
													<span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getRoleInfo(user.role).color}`}>
														{getRoleInfo(user.role).label}
													</span>
												) : (
													<span className="text-gray-400 text-xs italic">Belum ada role</span>
												)}
											</div>

											<div className="flex items-center gap-2">
												<LuUserCheck className="h-4 w-4 flex-shrink-0" />
												{user.is_active ? (
													<span className="text-green-600 font-medium">Aktif</span>
												) : (
													<span className="text-red-600 font-medium">Nonaktif</span>
												)}
											</div>
											{user.created_at && (
												<div className="flex items-center gap-2 text-gray-500">
													<LuCalendar className="h-4 w-4 flex-shrink-0" />
													<span className="text-xs">
														Dibuat: {new Date(user.created_at).toLocaleDateString("id-ID")}
													</span>
												</div>
											)}
										</div>

										<div className="space-y-2">
											{/* Dashboard Bidang Button - BARU */}
											{user.bidang_id && getBidangDashboardUrl(user.bidang_id) && (
												<button
													onClick={() => navigate(getBidangDashboardUrl(user.bidang_id))}
													className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm hover:shadow font-medium"
													title={`Buka ${getBidangDashboardName(user.bidang_id)}`}
												>
													<LuBriefcase className="w-4 h-4" />
													{getBidangDashboardName(user.bidang_id)}
													<LuArrowRight className="w-4 h-4" />
												</button>
											)}

											{/* Role Management Button */}
											<button
												onClick={() => handleEditRole(user)}
												className="w-full flex items-center justify-center gap-1 px-3 py-2 text-xs bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
												title="Edit Role"
											>
												<LuShield className="w-3 h-3" />
												Edit Role
											</button>

											{/* Account Management Buttons */}
											<div className="flex items-center gap-2 pt-2 border-t border-gray-100">
												<button
													onClick={() => handleResetPassword(user)}
													className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors"
													title="Reset Password"
												>
													<LuKey className="w-3 h-3" />
													Reset
												</button>
												<button
													onClick={() => handleToggleActive(user)}
													className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs rounded-lg transition-colors ${
														user.is_active
															? "bg-red-50 text-red-700 hover:bg-red-100"
															: "bg-green-50 text-green-700 hover:bg-green-100"
													}`}
													title={user.is_active ? "Nonaktifkan" : "Aktifkan"}
												>
													{user.is_active ? (
														<>
															<LuX className="w-3 h-3" />
															Nonaktif
														</>
													) : (
														<>
															<LuCheck className="w-3 h-3" />
															Aktifkan
														</>
													)}
												</button>
												<button
													onClick={() => handleDeleteAccount(user)}
													className="flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
													title="Hapus Akun"
												>
													<LuTrash2 className="w-4 h-4" />
												</button>
											</div>
										</div>
									</div>
								);
							})}
						</div>
						
						{/* Pagination */}
						<Pagination
							currentPage={currentPageWithAccount}
							totalPages={totalPagesWithAccount}
							onPageChange={setCurrentPageWithAccount}
						/>
						</>
					)}
				</div>
			</div>

			{/* Pegawai without Accounts */}
			<div className="bg-white rounded-lg shadow">
				<div className="px-6 py-4 border-b border-gray-200">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
							<LuPlus className="w-5 h-5 text-orange-600" />
							Pegawai Belum Punya Akun ({filteredPegawaiList.length})
						</h3>
					</div>
					{/* Search Bar */}
					<div className="relative">
						<LuSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
						<input
							type="text"
							placeholder="Cari nama pegawai..."
							value={searchWithoutAccount}
							onChange={(e) => setSearchWithoutAccount(e.target.value)}
							className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
					</div>
				</div>
				<div className="p-6">
					{filteredPegawaiList.length === 0 ? (
						<div className="text-center p-8 bg-gray-50 rounded-lg">
							<LuCheck className="h-12 w-12 text-green-500 mx-auto mb-4" />
							<p className="text-gray-600 font-medium">
								{searchWithoutAccount || filterBidang
									? "Tidak ada pegawai yang sesuai dengan filter"
									: "Semua pegawai sudah punya akun!"}
							</p>
							<p className="text-sm text-gray-500 mt-1">
								{searchWithoutAccount || filterBidang ? "" : "Tidak ada akun yang perlu dibuat"}
							</p>
						</div>
					) : (
						<>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{paginatedPegawaiList.map((pegawai) => (
								<div
									key={pegawai.id_pegawai}
									className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-lg p-4 hover:shadow-md transition-all hover:border-orange-300"
								>
									<div className="flex items-start justify-between mb-3">
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 mb-2">
												<div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
													<LuUser className="h-5 w-5 text-orange-600" />
												</div>
												<h4 className="font-semibold text-gray-900 text-sm leading-tight">
													{pegawai.nama_pegawai}
												</h4>
											</div>
											<p className="text-sm text-gray-600 flex items-center gap-1 ml-12">
												<LuBriefcase className="w-3 h-3 flex-shrink-0" />
												<span className="truncate">{pegawai.bidangs?.nama || getBidangName(pegawai.id_bidang)}</span>
											</p>
										</div>
									</div>
									<button
										onClick={() => handleCreateAccount(pegawai)}
										className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all text-sm font-medium shadow-sm hover:shadow"
									>
										<LuPlus className="w-4 h-4" />
										Buat Akun
									</button>
								</div>
							))}
							</div>
							<Pagination
								currentPage={currentPageWithoutAccount}
								totalPages={totalPagesWithoutAccount}
								onPageChange={setCurrentPageWithoutAccount}
							/>
						</>
					)}
				</div>
			</div>

			{/* Edit Role Modal */}
			{showRoleModal && selectedUserForRole && (
				<>
					<div 
						className="fixed inset-0 bg-black bg-opacity-60 z-50 backdrop-blur-sm transition-opacity"
						onClick={() => setShowRoleModal(false)}
					/>
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
						<div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
							{/* Header */}
							<div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-5 rounded-t-2xl">
								<div className="flex items-center justify-between">
									<h3 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
										<LuShield className="w-6 h-6" />
										Update Role
									</h3>
									<button
										onClick={() => setShowRoleModal(false)}
										className="text-white/80 hover:text-white transition-colors"
									>
										<LuX className="w-6 h-6" />
									</button>
								</div>
							</div>

							<div className="p-6 space-y-6">
								{/* User Info Card */}
								<div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
									<div className="flex items-center gap-4">
										<div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
											<LuUser className="h-7 w-7 text-white" />
										</div>
										<div className="flex-1 min-w-0">
											<h4 className="font-semibold text-gray-900 text-base sm:text-lg truncate">
												{selectedUserForRole.name}
											</h4>
											<p className="text-sm text-gray-600 truncate">{selectedUserForRole.email}</p>
											{selectedUserForRole.role && (
												<div className="mt-2">
													<span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${getRoleInfo(selectedUserForRole.role).color}`}>
														Saat ini: {getRoleInfo(selectedUserForRole.role).label}
													</span>
												</div>
											)}
										</div>
									</div>
								</div>

								{/* Role Selection */}
								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-3">
										Pilih Role Baru <span className="text-red-500">*</span>
									</label>
									<div className="relative">
										<select
											value={selectedRole}
											onChange={(e) => setSelectedRole(e.target.value)}
											className="w-full appearance-none px-4 py-3 pr-10 bg-white border-2 border-gray-200 rounded-xl text-gray-900 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-sm sm:text-base"
										>
											<option value="" className="text-gray-500">-- Pilih Role --</option>
											<option value="pegawai">Pegawai</option>
											<option value="kepala_bidang">Kepala Bidang</option>
											<option value="sekretaris_dinas">Sekretaris Dinas</option>
											<option value="ketua_tim">Ketua Tim</option>
											<option value="sekretariat">Sekretariat</option>
											<option value="sarana_prasarana">Sarana Prasarana</option>
											<option value="kekayaan_keuangan">Kekayaan Keuangan</option>
										</select>
										<div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
											<svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
											</svg>
										</div>
									</div>
									
									{/* Role Info */}
									{selectedRole && (
										<div className="mt-3 p-3 bg-purple-50 border border-purple-100 rounded-lg">
											<div className="flex items-start gap-2">
												<LuShield className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
												<div className="text-xs text-purple-700">
													<span className="font-medium">Info:</span> Role menentukan akses dan hak akses pegawai dalam sistem DPMD
												</div>
											</div>
										</div>
									)}
								</div>

								{/* Action Buttons */}
								<div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
									<button
										onClick={() => setShowRoleModal(false)}
										className="flex-1 px-5 py-3 border-2 border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all"
									>
										Batal
									</button>
									<button
										onClick={handleUpdateRole}
										disabled={!selectedRole}
										className="flex-1 px-5 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-purple-600 disabled:hover:to-purple-700"
									>
										Simpan Perubahan
									</button>
								</div>
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	);
};

export default PegawaiManagement;
