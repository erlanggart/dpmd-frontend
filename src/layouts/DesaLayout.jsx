// src/components/DesaLayout.jsx
import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FiLogOut } from "react-icons/fi";

const DesaLayout = () => {
	const { user, logout } = useAuth();
	const navigate = useNavigate();

	const handleLogout = () => {
		logout();
		navigate("/login");
	};

	return (
		<div className="min-h-screen bg-gray-100">
			{/* Header untuk Dashboard Desa */}
			<header className="bg-white shadow-md m-4 rounded-lg border border-slate-200">
				<div className="container mx-auto flex h-16 items-center justify-between px-6">
					<div className="flex items-center space-x-4">
						<img src="/logo-kab.png" alt="Logo" className="h-10" />
						<div>
							<h1 className="font-bold text-gray-800">
								Dashboard Desa {user?.desa?.nama || ""}
							</h1>
							<p className="text-sm text-gray-500">
								Kecamatan {user?.desa?.kecamatan?.nama || ""}
							</p>
						</div>
					</div>
					<div className="flex items-center">
						<span className="mr-4 text-gray-600 hidden md:block">
							Halo, {user?.name}
						</span>
						<button
							onClick={handleLogout}
							className="text-gray-500 hover:text-primary"
							title="Logout"
						>
							<FiLogOut className="h-6 w-6" />
						</button>
					</div>
				</div>
			</header>

			{/* Konten utama dari setiap halaman modul desa akan dirender di sini */}
			<main className="container mx-auto p-6">
				<Outlet />
			</main>
		</div>
	);
};

export default DesaLayout;
