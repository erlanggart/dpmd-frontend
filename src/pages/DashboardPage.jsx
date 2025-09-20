// src/pages/DashboardPage.jsx
import React from "react";
import { useAuth } from "../context/AuthContext";
import DesaDashboard from "../components/desa/DesaDashboard";

// Anda bisa membuat komponen dashboard lain untuk peran lain
const SuperAdminDashboard = () => (
	<h1 className="text-white text-3xl">Dashboard Super Admin</h1>
);
const KecamatanDashboard = () => (
	<h1 className="text-white text-3xl">Dashboard Kecamatan</h1>
);

const DashboardPage = () => {
	const { user } = useAuth();

	// Jika data user belum dimuat, tampilkan pesan loading
	if (!user) {
		return <p className="text-white">Memuat...</p>;
	}

	// Tampilkan komponen dashboard berdasarkan peran pertama user
	if (user.roles.includes("admin desa")) {
		return <DesaDashboard />;
	}

	if (user.roles.includes("admin kecamatan")) {
		return <KecamatanDashboard />;
	}

	if (user.roles.includes("superadmin")) {
		return <SuperAdminDashboard />;
	}

	// Tampilan default jika tidak ada peran yang cocok
	return <h1 className="text-white">Selamat Datang, {user.name}</h1>;
};

export default DashboardPage;
