import React from "react";

const DashboardPage = () => {
	const user = JSON.parse(localStorage.getItem("user") || "{}");

	return (
		<div>
			<h1 className="mb-4 text-3xl font-bold text-white">Dashboard Utama</h1>
			<div className="rounded-lg bg-gray-800 p-6 text-white">
				<p className="text-lg">
					Selamat datang kembali, <span className="font-bold">{user.name}</span>
					!
				</p>
				<p className="mt-2 text-gray-400">
					Peran Anda: {user.roles?.join(", ")}
				</p>
			</div>
		</div>
	);
};

export default DashboardPage;
