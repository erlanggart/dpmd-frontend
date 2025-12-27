// src/components/UserStatsCard.jsx
import React, { useEffect, useState } from "react";
import {
	LuCrown,
	LuBuilding,
	LuUsers,
	LuMapPin,
	LuTrendingUp,
	LuUserCheck,
	LuBriefcase,
	LuHouse,
} from "react-icons/lu";
import api from "../api";

const UserStatsCard = () => {
	const [stats, setStats] = useState({
		total: 0,
		superadmin: 0,
		kepala_dinas: 0,
		sekretaris_dinas: 0,
		kepala_bidang: 0,
		ketua_tim: 0,
		pegawai: 0,
		total_pegawai_dpmd: 0, // Total pegawai DPMD
		kecamatan: 0,
		desa: 0,
		kelurahan: 0,
		loading: true,
	});

	// Add animation styles
	useEffect(() => {
		const style = document.createElement('style');
		style.id = 'user-stats-animations';
		style.textContent = `
			@keyframes fadeInUp {
				from {
					opacity: 0;
					transform: translateY(20px);
				}
				to {
					opacity: 1;
					transform: translateY(0);
				}
			}
		`;
		
		// Check if style already exists, remove it first
		const existingStyle = document.getElementById('user-stats-animations');
		if (existingStyle) {
			existingStyle.remove();
		}
		
		document.head.appendChild(style);

		// Cleanup function to remove style when component unmounts
		return () => {
			const styleToRemove = document.getElementById('user-stats-animations');
			if (styleToRemove) {
				styleToRemove.remove();
			}
		};
	}, []);

	useEffect(() => {
		const fetchUserStats = async () => {
			try {
				// Check if token exists
				const token = localStorage.getItem("expressToken");
				if (!token) {
					console.log("No token found, skipping user stats fetch");
					setStats((prev) => ({ ...prev, loading: false }));
					return;
				}

				const response = await api.get("/users/stats");
				const statsData = response.data.data;

				setStats({
					total: statsData.total,
					superadmin: statsData.superadmin,
					kepala_dinas: statsData.kepala_dinas,
					sekretaris_dinas: statsData.sekretaris_dinas,
					kepala_bidang: statsData.kepala_bidang,
					ketua_tim: statsData.ketua_tim,
					pegawai: statsData.pegawai,
					total_pegawai_dpmd: statsData.total_pegawai_dpmd,
					kecamatan: statsData.kecamatan,
					desa: statsData.desa,
					kelurahan: statsData.kelurahan,
					loading: false,
				});
			} catch (error) {
				console.error("Error fetching user stats:", error);
				// Don't redirect on error, just show loading: false
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
			color: "from-red-500 to-pink-600",
			bgColor: "bg-red-50",
			textColor: "text-red-700",
		},
		{
			title: "Pegawai DPMD",
			value: stats.total_pegawai_dpmd,
			icon: LuBriefcase,
			color: "from-blue-500 to-indigo-600",
			bgColor: "bg-blue-50",
			textColor: "text-blue-700",
		},
		{
			title: "Kepala Dinas",
			value: stats.kepala_dinas,
			icon: LuBuilding,
			color: "from-blue-500 to-indigo-600",
			bgColor: "bg-blue-50",
			textColor: "text-blue-700",
		},
		{
			title: "Sekretaris Dinas",
			value: stats.sekretaris_dinas,
			icon: LuBuilding,
			color: "from-indigo-500 to-purple-600",
			bgColor: "bg-indigo-50",
			textColor: "text-indigo-700",
		},
		{
			title: "Kepala Bidang",
			value: stats.kepala_bidang,
			icon: LuUsers,
			color: "from-green-500 to-teal-600",
			bgColor: "bg-green-50",
			textColor: "text-green-700",
		},
		{
			title: "Ketua Tim",
			value: stats.ketua_tim,
			icon: LuUserCheck,
			color: "from-teal-500 to-cyan-600",
			bgColor: "bg-teal-50",
			textColor: "text-teal-700",
		},
		{
			title: "Pegawai/Staff",
			value: stats.pegawai,
			icon: LuUserCheck,
			color: "from-gray-500 to-slate-600",
			bgColor: "bg-gray-50",
			textColor: "text-gray-700",
		},
		{
			title: "Admin Kecamatan",
			value: stats.kecamatan,
			icon: LuMapPin,
			color: "from-violet-500 to-purple-600",
			bgColor: "bg-violet-50",
			textColor: "text-violet-700",
		},
		{
			title: "Admin Desa",
			value: stats.desa,
			icon: LuHouse,
			color: "from-emerald-500 to-green-600",
			bgColor: "bg-emerald-50",
			textColor: "text-emerald-700",
		},
		{
			title: "Admin Kelurahan",
			value: stats.kelurahan,
			icon: LuBuilding,
			color: "from-amber-500 to-orange-600",
			bgColor: "bg-amber-50",
			textColor: "text-amber-700",
		},
	];

	if (stats.loading) {
		return (
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				{[...Array(11)].map((_, i) => (
					<div
						key={i}
						className="bg-white rounded-xl shadow-md p-5 animate-pulse border border-gray-100"
					>
						<div className="h-10 w-10 bg-gray-200 rounded-lg mb-3"></div>
						<div className="h-7 bg-gray-200 rounded mb-2"></div>
						<div className="h-4 bg-gray-200 rounded w-2/3"></div>
					</div>
				))}
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
			{statCards.map((card, index) => {
				const IconComponent = card.icon;
				return (
					<div
						key={index}
						className="relative overflow-hidden bg-white rounded-xl shadow-md p-5 border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
						style={{
							animation: `fadeInUp 0.5s ease-out ${index * 0.08}s forwards`,
							opacity: 0
						}}
					>
						{/* Gradient Background Overlay */}
						<div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
						
						{/* Content */}
						<div className="relative z-10">
							<div className="flex items-center justify-between mb-3">
								<div
									className={`h-10 w-10 bg-gradient-to-br ${card.color} rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}
								>
									<IconComponent className="h-5 w-5 text-white" />
								</div>
							</div>
							<div className={`text-2xl font-bold ${card.textColor} mb-1`}>
								{card.value.toLocaleString()}
							</div>
							<div className="text-xs text-gray-600 font-medium">
								{card.title}
							</div>
						</div>

						{/* Decorative Corner Element */}
						<div className={`absolute -top-6 -right-6 h-20 w-20 bg-gradient-to-br ${card.color} rounded-full opacity-5 blur-xl group-hover:scale-125 transition-transform duration-500`}></div>
					</div>
				);
			})}
		</div>
	);
};

export default UserStatsCard;
