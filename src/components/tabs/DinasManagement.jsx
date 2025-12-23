// src/components/tabs/DinasManagement.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
	LuBuilding,
	LuUser,
	LuMail,
	LuCalendar,
	LuUserCheck,
	LuPlus,
} from "react-icons/lu";
import api from "../../api";
import AddUserModal from "../AddUserModal";

const DinasManagement = () => {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [showAddModal, setShowAddModal] = useState(false);

	// Role-role tingkat dinas
	const dinasRoles = useMemo(() => ["dinas", "kepala_dinas", "sekretaris_dinas"], []);

	// Function to fetch users
	const fetchUsers = useCallback(async () => {
		setLoading(true);
		try {
			const response = await api.get("/users", {
				params: {
					limit: 100, // Cukup untuk user dinas yang sedikit
				},
			});

			// Filter user dengan role tingkat dinas
			const dinasUsers = response.data.data.filter((user) =>
				dinasRoles.includes(user.role)
			);
			setUsers(dinasUsers);
		} catch (err) {
			setError("Gagal mengambil data user.");
			console.error(err);
		} finally {
			setLoading(false);
		}
	}, [dinasRoles]);

	useEffect(() => {
		fetchUsers();
	}, [fetchUsers]);

	// Function to handle user added
	const handleUserAdded = () => {
		fetchUsers();
	};

	const getRoleInfo = (role) => {
		const roleMap = {
			dinas: {
				label: "Staff Dinas",
				color: "from-blue-400 to-blue-600",
				bgColor: "bg-blue-50",
				textColor: "text-blue-700",
			},
			kepala_dinas: {
				label: "Kepala Dinas",
				color: "from-purple-400 to-purple-600",
				bgColor: "bg-purple-50",
				textColor: "text-purple-700",
			},
			sekretaris_dinas: {
				label: "Sekretaris Dinas",
				color: "from-indigo-400 to-indigo-600",
				bgColor: "bg-indigo-50",
				textColor: "text-indigo-700",
			},
		};
		return (
			roleMap[role] || {
				label: role,
				color: "from-gray-400 to-gray-600",
				bgColor: "bg-gray-50",
				textColor: "text-gray-700",
			}
		);
	};

	// Grup user berdasarkan role
	const groupedUsers = dinasRoles.reduce((acc, role) => {
		acc[role] = users.filter((user) => user.role === role);
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
					<LuBuilding className="h-6 w-6 text-blue-500" />
					<h2 className="text-xl font-semibold text-gray-800">
						Manajemen User Dinas ({users.length})
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

			{dinasRoles.map((role) => {
				const roleUsers = groupedUsers[role];
				const roleInfo = getRoleInfo(role);

				return (
					<div key={role} className="space-y-4">
						<div className={`p-4 rounded-lg ${roleInfo.bgColor}`}>
							<div className="flex items-center gap-3 mb-4">
								<LuUserCheck className={`h-5 w-5 ${roleInfo.textColor}`} />
								<h3 className={`font-semibold ${roleInfo.textColor}`}>
									{roleInfo.label} ({roleUsers.length})
								</h3>
							</div>

							{roleUsers.length === 0 ? (
								<p className={`text-sm ${roleInfo.textColor} opacity-70`}>
									Belum ada user dengan role {roleInfo.label}
								</p>
							) : (
								<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
									{roleUsers.map((user) => (
										<div
											key={user.id}
											className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200"
										>
											<div className="flex items-center gap-3 mb-3">
												<div
													className={`h-10 w-10 bg-gradient-to-r ${roleInfo.color} rounded-full flex items-center justify-center`}
												>
													<LuUser className="h-5 w-5 text-white" />
												</div>
												<div>
													<h4 className="font-medium text-gray-900">
														{user.name}
													</h4>
													<p
														className={`text-xs font-medium ${roleInfo.textColor}`}
													>
														{roleInfo.label}
													</p>
												</div>
											</div>

											<div className="space-y-2 text-sm">
												<div className="flex items-center gap-2 text-gray-600">
													<LuMail className="h-3 w-3" />
													<span className="truncate">{user.email}</span>
												</div>
												{user.created_at && (
													<div className="flex items-center gap-2 text-gray-600">
														<LuCalendar className="h-3 w-3" />
														<span>
															Bergabung{" "}
															{new Date(user.created_at).toLocaleDateString(
																"id-ID"
															)}
														</span>
													</div>
												)}
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				);
			})}

			{/* Add User Modal */}
			<AddUserModal
				isOpen={showAddModal}
				onClose={() => setShowAddModal(false)}
				onUserAdded={handleUserAdded}
			/>
		</div>
	);
};

export default DinasManagement;
