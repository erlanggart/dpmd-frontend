import React, { useState } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
	FiLogOut,
	FiGrid,
	FiBook,
	FiUser,
	FiMenu,
	FiUserCheck,
} from "react-icons/fi";

import {
<<<<<<< Updated upstream
	LuBookMarked,
	LuIdCard,
	LuLandmark,
	LuTrello,
	LuUserCheck,
=======
	LuStore,
	LuFileText,
	LuUsers,
>>>>>>> Stashed changes
} from "react-icons/lu";
import Footer from "../components/landingpage/Footer";

const DesaLayout = () => {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const [sidebarOpen, setSidebarOpen] = useState(false); // Default to closed on mobile

	const handleLogout = () => {
		logout();
		navigate("/login");
	};

	const baseLinkClass = "flex items-center p-2 text-gray-700 rounded-lg";
	const activeLinkClass = "bg-primary text-white";
	const inactiveLinkClass = "hover:bg-gray-100";

	return (
		<div className="min-h-screen bg-slate-200 pt-1  ">
			{/* Backdrop for mobile */}
			{sidebarOpen && (
				<div
					className="fixed inset-0 z-20 bg-black/50 lg:hidden"
					onClick={() => setSidebarOpen(false)}
				></div>
			)}

			{/* Header untuk Dashboard Desa */}
			<header className="bg-white mx-4 px-4 my-4 shadow-md rounded lg:mx-20">
				<div className=" mx-auto flex h-16 items-center justify-between">
					<div className="flex items-center space-x-4">
						<button
							onClick={() => setSidebarOpen(!sidebarOpen)}
							className="text-gray-500 hover:text-primary hidden lg:block" // Only show on desktop
						>
							<FiMenu className="h-6 w-6" />
						</button>
						<button
							onClick={() => setSidebarOpen(!sidebarOpen)}
							className="text-gray-500 hover:text-primary lg:hidden" // Only show on mobile
						>
							<FiMenu className="h-6 w-6" />
						</button>
						<img src="/logo-kab.png" alt="Logo" className="h-10" />
						<div>
							<h1 className="font-bold text-xs lg:text-lg text-gray-800">
								Dashboard Desa {user?.desa?.nama || ""}
							</h1>
							<p className="text-xs md:text-sm text-gray-500">
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
							<FiLogOut className="h-5 w-5 md:h-6 md:w-6" />
							<span className="hidden md:inline">Logout</span>
						</button>
					</div>
				</div>
			</header>

			<div className=" mx-4 flex space-x-0 lg:mx-20  lg:space-x-6 mb-6">
				{/* Sidebar */}
				<aside
					className={`fixed top-0 left-0 h-full bg-white p-4 shadow-lg border-r border-slate-200 transform transition-all duration-300 ease-in-out z-30 lg:relative lg:translate-x-0 lg:shadow-md lg:border lg:rounded-lg ${
						sidebarOpen ? "translate-x- w-64" : "-translate-x-full w-64 lg:w-20"
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
									onClick={() =>
										window.innerWidth < 1024 && setSidebarOpen(false)
									}
								>
									<FiGrid className="h-6 w-6" />
									<span
										className={`ml-3 whitespace-nowrap ${
											!sidebarOpen && "lg:hidden"
										}`}
									>
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
									onClick={() =>
										window.innerWidth < 1024 && setSidebarOpen(false)
									}
								>
									<LuIdCard className="h-6 w-6" />
									<span
										className={`ml-3 whitespace-nowrap ${
											!sidebarOpen && "lg:hidden"
										}`}
									>
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
									onClick={() =>
										window.innerWidth < 1024 && setSidebarOpen(false)
									} // Close on mobile click
								>
									<LuBookMarked className="h-6 w-6" />
									<span
										className={`ml-3 whitespace-nowrap ${
											!sidebarOpen && "lg:hidden"
										}`}
									>
										Produk Hukum
									</span>
								</NavLink>
							</li>
							<li className="mb-2">
								<NavLink
									to="/desa/aparatur-desa"
									className={({ isActive }) =>
										`${baseLinkClass} ${
											isActive ? activeLinkClass : inactiveLinkClass
										}`
									}
									onClick={() =>
										window.innerWidth < 1024 && setSidebarOpen(false)
									} // Close on mobile click
								>
									<LuUserCheck className="h-6 w-6" />
									<span
										className={`ml-3 whitespace-nowrap ${
											!sidebarOpen && "lg:hidden"
										}`}
									>
										Aparatur Desa
									</span>
								</NavLink>
							</li>
							<li className="mb-2">
								<NavLink
									to="/desa/kelembagaan"
									className={({ isActive }) =>
										`${baseLinkClass} ${
											isActive ? activeLinkClass : inactiveLinkClass
										}`
									}
									onClick={() =>
										window.innerWidth < 1024 && setSidebarOpen(false)
									} // Close on mobile click
								>
									<LuLandmark className="h-6 w-6" />
									<span
										className={`ml-3 whitespace-nowrap ${
											!sidebarOpen && "lg:hidden"
										}`}
									>
										Kelembagaan Desa
									</span>
								</NavLink>
							</li>
							<li className="mb-2">
								<NavLink
									to="/desa/kelembagaan"
									className={({ isActive }) =>
										`${baseLinkClass} ${
											isActive ? activeLinkClass : inactiveLinkClass
										}`
									}
									onClick={() =>
										window.innerWidth < 1024 && setSidebarOpen(false)
									}
								>
									<LuUsers className="h-6 w-6" />
									<span
										className={`ml-3 whitespace-nowrap ${
											!sidebarOpen && "lg:hidden"
										}`}
									>
										Kelembagaan
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
									onClick={() =>
										window.innerWidth < 1024 && setSidebarOpen(false)
									}
								>
									<LuFileText className="h-6 w-6" />
									<span
										className={`ml-3 whitespace-nowrap ${
											!sidebarOpen && "lg:hidden"
										}`}
									>
										Produk Hukum
									</span>
								</NavLink>
							</li>
							{/* Tambahkan link menu lain di sini */}
						</ul>
					</nav>
				</aside>

				{/* Konten utama */}
				<main className="flex-1 min-h-screen">
					<Outlet />
				</main>
			</div>

			<Footer />
		</div>
	);
};

export default DesaLayout;
