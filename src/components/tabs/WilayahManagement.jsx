// src/components/tabs/WilayahManagement.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	LuMapPin,
	LuUser,
	LuMail,
	LuCalendar,
	LuBuilding2,
	LuHouse,
	LuPlus,
	LuShield,
	LuRefreshCw,
} from "react-icons/lu";
import api from "../../api";
import AddUserModal from "../AddUserModal";
import ResetPasswordModal from "../ResetPasswordModal";
import { useAuth } from "../../context/AuthContext";
import Swal from "sweetalert2";

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
	const navigate = useNavigate();
	const { user: currentUser } = useAuth();

	// Role-role tingkat wilayah
	const wilayahRoles = ["kecamatan", "desa"];

	// Function to fetch users
	const fetchUsers = async () => {
		const token = localStorage.getItem("authToken");
		if (!token) {
			navigate("/login");
			return;
		}

		setLoading(true);
		try {
			const response = await api.get("/users", {
				headers: { Authorization: `Bearer ${token}` },
			});

			// Filter user dengan role tingkat wilayah
			const wilayahUsers = response.data.data.filter((user) =>
				wilayahRoles.includes(user.role)
			);
			setUsers(wilayahUsers);
		} catch (err) {
			setError("Gagal mengambil data user.");
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchUsers();
	}, [navigate]);

	// Function to handle user added
	const handleUserAdded = (newUser) => {
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

	// Filter dan search
	const filteredUsers = users.filter((user) => {
		const matchesSearch =
			user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			user.email.toLowerCase().includes(searchTerm.toLowerCase());

		let matchesType = false;
		if (selectedType === "all") {
			matchesType = true;
		} else if (selectedType === "kelurahan") {
			matchesType =
				user.role === "desa" && user.desa?.status_pemerintahan === "kelurahan";
		} else if (selectedType === "desa") {
			matchesType =
				user.role === "desa" &&
				(!user.desa?.status_pemerintahan ||
					user.desa?.status_pemerintahan === "desa");
		} else {
			matchesType = user.role === selectedType;
		}

		return matchesSearch && matchesType;
	});

	// Grup user berdasarkan role
	const groupedUsers = wilayahRoles.reduce((acc, role) => {
		acc[role] = filteredUsers.filter((user) => user.role === role);
		return acc;
	}, {});

	// Statistik
	const stats = {
		total: users.length,
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
					{/* Statistik Cards */}
					<div className="flex gap-4">
						<div className="bg-violet-50 px-4 py-2 rounded-lg border border-violet-200">
							<div className="text-sm text-violet-600">Kecamatan</div>
							<div className="font-semibold text-violet-700">
								{stats.kecamatan}
							</div>
						</div>
						<div className="bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200">
							<div className="text-sm text-emerald-600">Desa</div>
							<div className="font-semibold text-emerald-700">{stats.desa}</div>
						</div>
						<div className="bg-purple-50 px-4 py-2 rounded-lg border border-purple-200">
							<div className="text-sm text-purple-600">Kelurahan</div>
							<div className="font-semibold text-purple-700">
								{stats.kelurahan}
							</div>
						</div>
					</div>

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

			{/* User Lists */}
			{wilayahRoles.map((role) => {
				const roleUsers = groupedUsers[role];
				const roleInfo = getRoleInfo(role);
				const IconComponent = roleInfo.icon;

				if (
					roleUsers.length === 0 &&
					selectedType !== "all" &&
					selectedType !== role
				) {
					return null;
				}

				return (
					<div key={role} className="space-y-4">
						<div
							className={`p-4 rounded-lg ${roleInfo.bgColor} ${roleInfo.borderColor} border`}
						>
							<div className="flex items-center gap-3 mb-4">
								<IconComponent className={`h-5 w-5 ${roleInfo.textColor}`} />
								<h3 className={`font-semibold ${roleInfo.textColor}`}>
									{roleInfo.label} ({roleUsers.length})
								</h3>
							</div>

							{roleUsers.length === 0 ? (
								<p className={`text-sm ${roleInfo.textColor} opacity-70`}>
									{searchTerm
										? `Tidak ada ${roleInfo.label} yang sesuai dengan pencarian "${searchTerm}"`
										: `Belum ada user dengan role ${roleInfo.label}`}
								</p>
							) : (
								<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
									{roleUsers.map((user) => (
										<div
											key={user.id}
											className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200 hover:scale-105"
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
									))}
								</div>
							)}
						</div>
					</div>
				);
			})}

			{filteredUsers.length === 0 && (
				<div className="text-center p-8 bg-gray-50 rounded-lg">
					<LuMapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
					<p className="text-gray-500">
						{searchTerm
							? `Tidak ada user wilayah yang sesuai dengan pencarian "${searchTerm}"`
							: "Tidak ada user wilayah yang ditemukan"}
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

export default WilayahManagement;
