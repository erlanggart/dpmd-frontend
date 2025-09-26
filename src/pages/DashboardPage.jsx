// src/pages/DashboardPage.jsx
import React from "react";
import { useAuth } from "../context/AuthContext";
import DesaDashboard from "../components/desa/DesaDashboard";
import UniversalDashboard from "../components/UniversalDashboard";

const DashboardPage = () => {
	const { user } = useAuth();

	// Jika data user belum dimuat, tampilkan pesan loading
	if (!user) {
		return <p className="text-white">Memuat...</p>;
	}

	// Jika admin desa, gunakan dashboard khusus desa
	if (user.roles?.includes("admin desa")) {
		return <DesaDashboard />;
	}

	// Untuk semua role lainnya (superadmin, bidang, dll), gunakan UniversalDashboard
	return <UniversalDashboard />;
};

export default DashboardPage;
