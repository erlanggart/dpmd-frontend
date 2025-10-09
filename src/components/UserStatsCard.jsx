// src/components/UserStatsCard.jsx
import React, { useEffect, useState } from "react";
import {
	LuCrown,
	LuBuilding,
	LuUsers,
	LuMapPin,
	LuTrendingUp,
} from "react-icons/lu";
import api from "../api";

const UserStatsCard = () => {
	const [stats, setStats] = useState({
		total: 0,
		superadmin: 0,
		dinas: 0,
		bidang: 0,
		wilayah: 0,
		loading: true,
	});

	useEffect(() => {
		const fetchUserStats = async () => {
			try {
				const token = localStorage.getItem("authToken");
				const response = await api.get("/users", {
					headers: { Authorization: `Bearer ${token}` },
				});

				const users = response.data.data;

				// Kategori roles
				const dinasRoles = ["dinas", "kepala_dinas", "sekretaris_dinas"];
				const bidangRoles = [
					"kepala_bidang_pemerintahan",
					"kepala_bidang_kesra",
					"kepala_bidang_ekonomi",
					"kepala_bidang_fisik",
					"sarana_prasarana",
					"kekayaan_keuangan",
					"pemberdayaan_masyarakat",
					"pemerintahan_desa",
					"sekretariat",
					"staff",
				];
				const wilayahRoles = ["kecamatan", "desa"];

				const calculations = {
					total: users.length,
					superadmin: users.filter((u) => u.role === "superadmin").length,
					dinas: users.filter((u) => dinasRoles.includes(u.role)).length,
					bidang: users.filter((u) => bidangRoles.includes(u.role)).length,
					wilayah: users.filter((u) => wilayahRoles.includes(u.role)).length,
					loading: false,
				};

				setStats(calculations);
			} catch (error) {
				console.error("Error fetching user stats:", error);
				setStats((prev) => ({ ...prev, loading: false }));
			}
		};

		fetchUserStats();
	}, []);

	const statCards = [
		{
			title: "Total Pengguna",
			value: stats.total,
			icon: LuTrendingUp,
			color: "from-blue-500 to-purple-600",
			bgColor: "bg-blue-50",
			textColor: "text-blue-700",
		},
		{
			title: "Super Admin",
			value: stats.superadmin,
			icon: LuCrown,
			color: "from-yellow-400 to-orange-500",
			bgColor: "bg-yellow-50",
			textColor: "text-yellow-700",
		},
		{
			title: "User Dinas",
			value: stats.dinas,
			icon: LuBuilding,
			color: "from-indigo-500 to-purple-500",
			bgColor: "bg-indigo-50",
			textColor: "text-indigo-700",
		},
		{
			title: "Bidang & Dept",
			value: stats.bidang,
			icon: LuUsers,
			color: "from-green-500 to-teal-500",
			bgColor: "bg-green-50",
			textColor: "text-green-700",
		},
		{
			title: "Wilayah",
			value: stats.wilayah,
			icon: LuMapPin,
			color: "from-violet-500 to-purple-500",
			bgColor: "bg-violet-50",
			textColor: "text-violet-700",
		},
	];

	if (stats.loading) {
		return (
			<div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
				{[...Array(5)].map((_, i) => (
					<div
						key={i}
						className="bg-white rounded-lg shadow-sm p-4 animate-pulse"
					>
						<div className="h-4 bg-gray-200 rounded mb-2"></div>
						<div className="h-8 bg-gray-200 rounded"></div>
					</div>
				))}
			</div>
		);
	}

	return (
		<div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
			{statCards.map((card, index) => {
				const IconComponent = card.icon;
				return (
					<div
						key={index}
						className={`${card.bgColor} rounded-lg shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow duration-200`}
					>
						<div className="flex items-center justify-between mb-2">
							<div
								className={`h-8 w-8 bg-gradient-to-r ${card.color} rounded-lg flex items-center justify-center`}
							>
								<IconComponent className="h-4 w-4 text-white" />
							</div>
						</div>
						<div className={`text-2xl font-bold ${card.textColor} mb-1`}>
							{card.value.toLocaleString()}
						</div>
						<div className={`text-sm ${card.textColor} opacity-80`}>
							{card.title}
						</div>
					</div>
				);
			})}
		</div>
	);
};

export default UserStatsCard;
