// src/components/tabs/WilayahUsers.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";

const WilayahUsers = ({ type }) => {
	const [allUsers, setAllUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const navigate = useNavigate();

	useEffect(() => {
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
				setAllUsers(response.data.data);
			} catch (err) {
				setError("Gagal mengambil data user.");
				console.error(err);
			} finally {
				setLoading(false);
			}
		};

		fetchUsers();
	}, [navigate]);

	// useMemo untuk memfilter user secara efisien
	const filteredUsers = useMemo(() => {
		const roleToFilter = `admin ${type}`; // menjadi "admin kecamatan" atau "admin desa"
		return allUsers.filter(
			(user) => user.roles && user.roles.includes(roleToFilter)
		);
	}, [allUsers, type]);

	if (loading)
		return <p className="p-4 text-center text-gray-400">Memuat data user...</p>;
	if (error) return <p className="p-4 text-center text-red-500">{error}</p>;

	return (
		<div className="overflow-x-auto rounded-lg bg-gray-800 shadow-lg">
			<table className="min-w-full text-left text-sm text-gray-300">
				<thead className="bg-gray-700 text-xs uppercase text-gray-400">
					<tr>
						<th scope="col" className="px-6 py-3">
							Nama
						</th>
						<th scope="col" className="px-6 py-3">
							Email
						</th>
						<th scope="col" className="px-6 py-3">
							Role
						</th>
						<th scope="col" className="px-6 py-3">
							Tanggal Bergabung
						</th>
						<th scope="col" className="px-6 py-3">
							<span className="sr-only">Aksi</span>
						</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-gray-700">
					{filteredUsers.length > 0 ? (
						filteredUsers.map((user) => (
							<tr key={user.id} className="hover:bg-gray-600">
								<td className="px-6 py-4 font-medium text-white">
									{user.name}
								</td>
								<td className="px-6 py-4">{user.email}</td>
								<td className="px-6 py-4">
									{user.roles.map((role) => (
										<span
											key={role}
											className="mr-2 rounded-full bg-sky-900 px-2.5 py-0.5 text-xs font-medium text-sky-300"
										>
											{role}
										</span>
									))}
								</td>
								<td className="px-6 py-4">
									{new Date(user.created_at).toLocaleDateString("id-ID", {
										year: "numeric",
										month: "long",
										day: "numeric",
									})}
								</td>
								<td className="px-6 py-4 text-right">
									<button className="font-medium text-sky-500 hover:underline">
										Edit
									</button>
								</td>
							</tr>
						))
					) : (
						<tr>
							<td colSpan="5" className="px-6 py-4 text-center text-gray-400">
								Tidak ada data untuk user {type}.
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
};

export default WilayahUsers;
