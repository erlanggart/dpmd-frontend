// src/components/tabs/SuperAdminUsers.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuCalendar, LuCrown, LuUser, LuMail, LuPlus } from "react-icons/lu";
import api from "../../api";
import AddUserModal from "../AddUserModal";

const SuperAdminUsers = () => {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [showAddModal, setShowAddModal] = useState(false);
	const navigate = useNavigate();

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

			console.log(response.data);

			// Filter hanya superadmin
			const superAdmins = response.data.data.filter(
				(user) => user.role === "superadmin"
			);
			setUsers(superAdmins);
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
		// Refresh the user list
		fetchUsers();
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
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<LuCrown className="h-6 w-6 text-yellow-500" />
					<h2 className="text-xl font-semibold text-gray-800">
						Super Administrator ({users.length})
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

			{users.length === 0 ? (
				<div className="text-center p-8 bg-gray-50 rounded-lg">
					<LuUser className="h-12 w-12 text-gray-400 mx-auto mb-4" />
					<p className="text-gray-500">Tidak ada Super Admin yang ditemukan</p>
				</div>
			) : (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{users.map((user) => (
						<div
							key={user.id}
							className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-200"
						>
							<div className="flex items-center gap-3 mb-4">
								<div className="h-12 w-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
									<LuCrown className="h-6 w-6 text-white" />
								</div>
								<div>
									<h3 className="font-semibold text-gray-900">{user.name}</h3>
									<p className="text-sm text-yellow-600 font-medium">
										Super Administrator
									</p>
								</div>
							</div>

							<div className="space-y-2 text-sm">
								<div className="flex items-center gap-2 text-gray-600">
									<LuMail className="h-4 w-4" />
									<span>{user.email}</span>
								</div>
								{user.created_at && (
									<div className="flex items-center gap-2 text-gray-600">
										<LuCalendar className="h-4 w-4" />
										<span>
											Bergabung{" "}
											{new Date(user.created_at).toLocaleDateString("id-ID")}
										</span>
									</div>
								)}
							</div>
						</div>
					))}
				</div>
			)}

			{/* Add User Modal */}
			<AddUserModal
				isOpen={showAddModal}
				onClose={() => setShowAddModal(false)}
				onUserAdded={handleUserAdded}
			/>
		</div>
	);
};

export default SuperAdminUsers;
