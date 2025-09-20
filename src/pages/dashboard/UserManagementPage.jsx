import BidangDinasManagement from "../../components/tabs/BidangDinasManagement";
import WilayahUsers from "../../components/tabs/WilayahUsers";
import React, { useState } from "react";

const UserManagementPage = () => {
	// 1. Menentukan daftar tab beserta komponen yang akan dirender
	const tabs = [
		{ key: "bidang", label: "User Bidang", Component: BidangDinasManagement },
		{ key: "dinas", label: "User Dinas", Component: BidangDinasManagement },
		{ key: "kecamatan", label: "User Kecamatan", Component: WilayahUsers },
		{ key: "desa", label: "User Desa", Component: WilayahUsers },
	];

	// 2. State untuk melacak tab aktif, dimulai dari tab pertama
	const [activeTab, setActiveTab] = useState(tabs[0].key);

	// 3. Mencari data tab yang sedang aktif untuk mendapatkan komponennya
	const ActiveComponentData = tabs.find((tab) => tab.key === activeTab);

	return (
		<div className="min-h-screen bg-white p-6 md:p-8 rounded-lg">
			<h1 className="mb-6 text-3xl font-bold">Manajemen Pengguna</h1>

			{/* Navigasi Tab */}
			<div className="mb-8 flex border-b border-gray-700">
				{tabs.map((tab) => (
					<button
						key={tab.key}
						onClick={() => setActiveTab(tab.key)}
						className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none ${
							activeTab === tab.key
								? "border-b-2 border-sky-500 text-sky-500"
								: "border-b-2 border-transparent text-gray-400 hover:border-gray-500 hover:text-gray-300"
						}`}
					>
						{tab.label}
					</button>
				))}
			</div>

			{/* Konten Tab yang Dirender Secara Dinamis */}
			<div>
				{ActiveComponentData && (
					<ActiveComponentData.Component type={ActiveComponentData.key} />
				)}
			</div>
		</div>
	);
};

export default UserManagementPage;
