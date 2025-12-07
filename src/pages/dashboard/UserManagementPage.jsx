import SuperAdminUsers from "../../components/tabs/SuperAdminUsers";
import DinasManagement from "../../components/tabs/DinasManagement";
import BidangManagement from "../../components/tabs/BidangManagement";
import WilayahManagement from "../../components/tabs/WilayahManagement";
import PegawaiManagement from "../../components/tabs/PegawaiManagement";
import UserStatsCard from "../../components/UserStatsCard";
import React, { useState } from "react";

const UserManagementPage = () => {
	// 1. Menentukan daftar tab beserta komponen yang akan dirender
	const tabs = [
		{ key: "superadmin", label: "Super Admin", Component: SuperAdminUsers },
		{ key: "dinas", label: "User Dinas", Component: DinasManagement },
		{
			key: "bidang",
			label: "Bidang & Departemen",
			Component: BidangManagement,
		},
		{ key: "wilayah", label: "Kecamatan & Desa", Component: WilayahManagement },
		{ key: "pegawai", label: "Pegawai", Component: PegawaiManagement },
	];

	// 2. State untuk melacak tab aktif, dimulai dari tab pertama
	const [activeTab, setActiveTab] = useState(tabs[0].key);

	// 3. Mencari data tab yang sedang aktif untuk mendapatkan komponennya
	const ActiveComponentData = tabs.find((tab) => tab.key === activeTab);

	return (
		<div className="min-h-screen bg-gray-50 p-6 md:p-8">
			{/* Header Section */}
			<div className="mb-8">
				<div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
					<h1 className="text-3xl font-bold mb-2">Manajemen Pengguna</h1>
					<p className="text-blue-100 opacity-90">
						Kelola pengguna sistem DPMD berdasarkan hierarki organisasi dan
						wilayah kerja
					</p>
				</div>
			</div>

			{/* Statistics Cards */}
			<UserStatsCard />

			{/* Content Card */}
			<div className="bg-white rounded-lg shadow-lg overflow-hidden">
				{/* Navigasi Tab */}
				<div className="border-b border-gray-200 bg-gray-50">
					<div className="flex overflow-x-auto">
						{tabs.map((tab) => (
							<button
								key={tab.key}
								onClick={() => setActiveTab(tab.key)}
								className={`whitespace-nowrap px-6 py-4 text-sm font-medium transition-all duration-200 focus:outline-none flex-shrink-0 ${
									activeTab === tab.key
										? "border-b-3 border-blue-500 text-blue-600 bg-white -mb-px"
										: "border-b-3 border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100"
								}`}
							>
								{tab.label}
							</button>
						))}
					</div>
				</div>

				{/* Konten Tab yang Dirender Secara Dinamis */}
				<div className="p-6">
					{ActiveComponentData && <ActiveComponentData.Component />}
				</div>
			</div>
		</div>
	);
};

export default UserManagementPage;
