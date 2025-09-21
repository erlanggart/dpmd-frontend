import React, { useState } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FiLogOut, FiGrid, FiBook, FiUser, FiMenu } from "react-icons/fi";
import Footer from "../components/landingpage/Footer";

const DesaLayout = () => {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const [sidebarOpen, setSidebarOpen] = useState(true);

	const handleLogout = () => {
		logout();
		navigate("/login");
	};

	const baseLinkClass = "flex items-center p-2 text-gray-700 rounded-lg";
	const activeLinkClass = "bg-primary text-white";
	const inactiveLinkClass = "hover:bg-gray-100";

	return (
		<div className="min-h-screen bg-gray-100 space-y-6 px-6">
			{/* Header untuk Dashboard Desa */}
			<header className="bg-white shadow-md m-4 rounded-lg border border-slate-200 w-full lg:w-7xl mx-auto ">
				<div className="container mx-auto flex h-16 items-center justify-between px-6">
					<div className="flex items-center space-x-4">
						<button
							onClick={() => setSidebarOpen(!sidebarOpen)}
							className="text-gray-500 hover:text-primary"
						>
							<FiMenu className="h-6 w-6" />
						</button>
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
							className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded"
							title="Logout"
						>
							<FiLogOut className="h-6 w-6" /> <span>Logout</span>
						</button>
					</div>
				</div>
			</header>

			<div className="w-full lg:w-7xl mx-auto flex space-x-6">
				<aside
					className={`bg-white p-4 rounded-sm shadow-md border border-slate-200 transition-all duration-300 ${
						sidebarOpen ? "w-64" : "w-20"
					}`}
				>
					<nav>
						<ul>
							<li className="mb-2">
								<NavLink
									to="/desa/dashboard"
									className={({ isActive }) =>
										`${baseLinkClass} ${
											isActive ? activeLinkClass : inactiveLinkClass
										}`
									}
								>
									<FiGrid className="h-6 w-6" />
									<span className={`ml-3 ${!sidebarOpen && "hidden"}`}>
										Dashboard
									</span>
								</NavLink>
							</li>
							<li className="mb-2">
								<NavLink
									to="/desa/profil-desa"
									className={({ isActive }) =>
										`${baseLinkClass} ${
											isActive ? activeLinkClass : inactiveLinkClass
										}`
									}
								>
									<FiUser className="h-6 w-6" />
									<span className={`ml-3 ${!sidebarOpen && "hidden"}`}>
										Profil Desa
									</span>
								</NavLink>
							</li>
							<li className="mb-2">
								<NavLink
									to="/desa/produk-hukum"
									className={({ isActive }) =>
										`${baseLinkClass} ${
											isActive ? activeLinkClass : inactiveLinkClass
										}`
									}
								>
									<FiBook className="h-6 w-6" />
									<span className={`ml-3 ${!sidebarOpen && "hidden"}`}>
										Produk Hukum
									</span>
								</NavLink>
							</li>
							{/* Tambahkan link menu lain di sini */}
						</ul>
					</nav>
				</aside>

				{/* Konten utama dari setiap halaman modul desa akan dirender di sini */}
				<main className="flex-1 min-h-screen">
					<Outlet />
				</main>
			</div>

			<Footer />
		</div>
	);
};

export default DesaLayout;
