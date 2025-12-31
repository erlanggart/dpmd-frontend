// src/components/tabs/KepalaDinasManagement.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
	LuBuilding,
	LuUser,
	LuMail,
	LuCalendar,
	LuPlus,
	LuKey,
	LuTrash2,
	LuShield,
	LuSearch,
} from "react-icons/lu";
import api from "../../api";
import AddUserModal from "../AddUserModal";
import ResetPasswordModal from "../ResetPasswordModal";
import EditRoleModal from "../EditRoleModal";
import { useAuth } from "../../context/AuthContext";
import Swal from "sweetalert2";

const KepalaDinasManagement = () => {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [showAddModal, setShowAddModal] = useState(false);
	const [showResetModal, setShowResetModal] = useState(false);
	const [showRoleModal, setShowRoleModal] = useState(false);
	const [selectedUser, setSelectedUser] = useState(null);
	const [isResettingPassword, setIsResettingPassword] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");

	const { user: currentUser } = useAuth();
	const canManage =
		currentUser?.role === "superadmin" ||
		currentUser?.role === "sekretaris_dinas";

	// Function to fetch users
	const fetchUsers = useCallback(async () => {
		setLoading(true);
		try {
			const response = await api.get("/users", {
				params: {
					role: "kepala_dinas",
					limit: 100,
				},
			});

			const kepaladinasUsers = response.data.data.filter(
				(user) => user.role === "kepala_dinas"
			);
			setUsers(kepaladinasUsers);
		} catch (err) {
			setError("Gagal mengambil data user.");
			console.error("Error fetching users:", err?.message || String(err));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchUsers();
	}, [fetchUsers]);

	// Function to handle user added
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

	// Handle reset password with modal
	const handleResetPassword = (user) => {
		setSelectedUser(user);
		setShowResetModal(true);
	};

	// Confirm reset password
	const handleConfirmResetPassword = async () => {
		if (!selectedUser) return;

		setIsResettingPassword(true);
		try {
			await api.put(`/users/${selectedUser.id}/reset-password`, {
				password: "dpmdbogorkab",
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

	// Handle role updated
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

	if (loading)
		return (
			<div className="flex justify-center items-center p-12">
				<div className="flex flex-col items-center gap-3">
					<div className="animate-spin rounded-full h-12 w-12 border-b-3 border-blue-500"></div>
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

	// Filter users based on search
	const filteredUsers = users.filter((user) => {
		const searchLower = searchTerm.toLowerCase();
		return (
			user.name?.toLowerCase().includes(searchLower) ||
			user.email?.toLowerCase().includes(searchLower)
		);
	});

	return (
		<div className="space-y-6">
			{/* Header Section */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
						<LuBuilding className="h-7 w-7 text-white" />
					</div>
					<div>
						<h3 className="text-2xl font-bold text-gray-800">
							Kepala Dinas
						</h3>
						<p className="text-sm text-gray-600">
							{filteredUsers.length} dari {users.length} user
						</p>
					</div>
				</div>
				<button
					onClick={() => setShowAddModal(true)}
					className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
				>
					<LuPlus className="h-5 w-5" />
					<span className="font-semibold">Tambah User</span>
				</button>
			</div>

			{/* Search Bar */}
			<div className="relative">
				<LuSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
				<input
					type="text"
					placeholder="Cari user berdasarkan nama atau email..."
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
				/>
			</div>

			{/* Users Grid */}
			{filteredUsers.length === 0 ? (
				<div className="text-center py-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-dashed border-blue-200">
					<div className="flex flex-col items-center gap-4">
						<div className="h-20 w-20 bg-white rounded-2xl flex items-center justify-center shadow-lg">
							<LuBuilding className="h-10 w-10 text-blue-400" />
						</div>
						<div>
							<p className="text-blue-700 font-semibold text-lg mb-1">
								{searchTerm ? "Tidak ada hasil" : "Belum ada user Kepala Dinas"}
							</p>
							<p className="text-sm text-blue-500">
								{searchTerm
									? "Coba kata kunci pencarian yang lain"
									: 'Klik tombol "Tambah User" untuk menambahkan user baru'}
							</p>
						</div>
					</div>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{filteredUsers.map((user) => (
						<div
							key={user.id}
							className="bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 group"
						>
							<div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-5">
								<div className="flex items-center gap-3">
									<div className="h-14 w-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
										<LuUser className="h-7 w-7 text-white" />
									</div>
									<div className="flex-1 min-w-0">
										<h4 className="font-bold text-white text-lg truncate">
											{user.name}
										</h4>
										<span className="inline-block px-3 py-1 text-xs bg-white/20 backdrop-blur-sm text-white rounded-full font-medium">
											Kepala Dinas
										</span>
									</div>
								</div>
							</div>

							<div className="p-5 space-y-4">
								<div className="space-y-3">
									<div className="flex items-center gap-3 text-gray-600">
										<div className="h-9 w-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
											<LuMail className="h-4 w-4" />
										</div>
										<span className="text-sm truncate flex-1">{user.email}</span>
									</div>
									<div className="flex items-center gap-3 text-gray-600">
										<div className="h-9 w-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
											<LuCalendar className="h-4 w-4 text-blue-600" />
										</div>
										<span className="text-sm">
											{new Date(user.created_at).toLocaleDateString("id-ID", {
												day: "numeric",
												month: "long",
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

								{/* Action Buttons */}
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
					))}
				</div>
			)}

			{/* Add User Modal */}
			{showAddModal && (
				<AddUserModal
					isOpen={showAddModal}
					onClose={() => setShowAddModal(false)}
					onUserAdded={handleUserAdded}
					defaultRole="kepala_dinas"
				/>
			)}

			{/* Reset Password Modal */}
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

			{/* Edit Role Modal */}
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

export default KepalaDinasManagement;
