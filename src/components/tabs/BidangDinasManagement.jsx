// src/components/tabs/BidangDinasManagement.jsx
import React, { useEffect, useState } from "react";
import api from "../../api";

const BidangDinasManagement = ({ type }) => {
	const [entities, setEntities] = useState([]);
	const [newName, setNewName] = useState("");

	const getApiUrl = (type) => {
		// Jika tipenya 'dinas', URL-nya tidak jamak
		if (type === "dinas") {
			return `/dinas`;
		}
		// Untuk 'bidang', URL-nya jamak ('bidangs')
		return `/bidangs`;
	};

	const apiUrl = getApiUrl(type);
	const token = localStorage.getItem("authToken");

	useEffect(() => {
		api
			.get(apiUrl, { headers: { Authorization: `Bearer ${token}` } })
			.then((response) => setEntities(response.data))
			.catch((err) => {
				console.error(`Gagal memuat data ${type}:`, err);
				// Anda bisa menambahkan state error di sini jika diperlukan
			});
	}, [type, apiUrl, token]);

	const handleAddEntity = async (e) => {
		e.preventDefault();
		try {
			const response = await api.post(
				apiUrl,
				{ nama: newName },
				{
					headers: { Authorization: `Bearer ${token}` },
				}
			);
			setEntities([...entities, response.data]);
			setNewName("");
		} catch (error) {
			console.error(`Gagal menambahkan ${type}`, error);
			alert(`Gagal menambahkan ${type}. Pastikan namanya unik.`);
		}
	};

	return (
		<div>
			<h2 className="mb-4 text-xl font-semibold capitalize ">{type}</h2>
			{/* Form untuk menambah Bidang/Dinas baru */}
			<form
				onSubmit={handleAddEntity}
				className="mb-6 flex gap-4 rounded-lg bg-gray-800 p-4"
			>
				<input
					type="text"
					value={newName}
					onChange={(e) => setNewName(e.target.value)}
					placeholder={`Nama ${type} baru...`}
					className="flex-grow rounded-md border-gray-700 bg-gray-700 p-2 text-white placeholder-gray-400 focus:border-sky-500 focus:ring-sky-500"
					required
				/>
				<button
					type="submit"
					className="rounded-md bg-sky-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-sky-700"
				>
					Tambah
				</button>
			</form>

			{/* Daftar Bidang/Dinas yang sudah ada */}
			<div className="space-y-3">
				{entities.map((entity) => (
					<div
						key={entity.id}
						className="flex items-center justify-between rounded-lg bg-gray-800 p-4"
					>
						<h3 className="font-medium text-gray-200">{entity.nama}</h3>
						<button className="text-sm text-sky-400 hover:underline">
							+ Tambah User
						</button>
					</div>
				))}
			</div>
		</div>
	);
};

export default BidangDinasManagement;
