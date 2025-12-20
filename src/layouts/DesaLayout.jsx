import React, { useState, useRef, useEffect } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../hooks/useUserProfile";
import {
	FiLogOut,
	FiGrid,
	FiMenu,
	FiUser,
	FiSettings,
	FiChevronDown,
} from "react-icons/fi";

import {
	LuStore,
	LuFileText,
	LuUsers,
	LuUserCheck,
} from "react-icons/lu";
import Footer from "../components/landingpage/Footer";
import InstallPWA from "../components/InstallPWA";

// Menu items configuration
const menuItems = [
	{
		id: 'dashboard',
		label: 'Dashboard',
		path: '/desa/dashboard',
		icon: FiGrid,
	},
	{
		id: 'aparatur-desa',
		label: 'Aparatur Desa',
		path: '/desa/aparatur-desa',
		icon: LuUserCheck,
	},
	{
		id: 'produk-hukum',
		label: 'Produk Hukum',
		path: '/desa/produk-hukum',
		icon: LuFileText,
	},
	{
		id: 'bumdes',
		label: 'BUMDES',
		path: '/desa/bumdes',
		icon: LuStore,
	},
	{
		id: 'kelembagaan',
		label: 'Kelembagaan',
		path: '/desa/kelembagaan',
		icon: LuUsers,
	},
	
];

const DesaLayout = () => {
	const { logout } = useAuth();
	const user = useUserProfile(); // Fetch and update profile with desa data
	const navigate = useNavigate();
	const [sidebarOpen, setSidebarOpen] = useState(false); // Default to closed on mobile
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const dropdownRef = useRef(null);

	const handleLogout = () => {
		logout();
		navigate("/login");
	};

	const handleSettings = () => {
		setDropdownOpen(false);
		navigate("/desa/settings");
	};

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setDropdownOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

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
						<img src="/logo-bogor.png" alt="Logo" className="h-10" />
						<div>
							<h1 className="font-bold text-xs lg:text-lg text-gray-800">
								Dinas Pemberdayaan Masyarakat dan Desa Kabupaten Bogor
								
							</h1>
							<p className="text-xs md:text-sm text-gray-500 hidden md:block">
								Dashboard  <strong> {user?.desa?.status_pemerintahan == "desa" ? "Desa" : "Kelurahan"} {user?.desa?.nama || ""}</strong> Kecamatan {user?.desa?.kecamatan?.nama || ""}
							
							</p>
						</div>
					</div>
					<div className="flex items-center">
						<span className="mr-4 text-gray-600 hidden md:block">
							Halo, {user?.name}
						</span>
						
						{/* User Dropdown */}
						<div className="relative" ref={dropdownRef}>
							<button
								onClick={() => setDropdownOpen(!dropdownOpen)}
								className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
								title="Menu User"
							>
								<FiUser className="h-5 w-5" />
								
								<FiChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
							</button>

							{/* Dropdown Menu */}
							{dropdownOpen && (
								<div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
									<button
										onClick={handleSettings}
										className="flex items-center w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors"
									>
										<FiSettings className="h-5 w-5 mr-3" />
										<span>Pengaturan</span>
									</button>
									<hr className="my-1 border-gray-200" />
									<button
										onClick={() => {
											setDropdownOpen(false);
											handleLogout();
										}}
										className="flex items-center w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors"
									>
										<FiLogOut className="h-5 w-5 mr-3" />
										<span>Logout</span>
									</button>
								</div>
							)}
						</div>
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
					{/* Install PWA Button */}
					{sidebarOpen && (
						<div className="mb-4 px-2">
							<InstallPWA />
						</div>
					)}

					<nav>
						<ul>
							{menuItems.map((item) => {
								const IconComponent = item.icon;
								return (
									<li key={item.id} className="mb-2">
										<NavLink
											to={item.path}
											className={({ isActive }) =>
												`${baseLinkClass} ${
													isActive ? activeLinkClass : inactiveLinkClass
												}`
											}
											onClick={() =>
												window.innerWidth < 1024 && setSidebarOpen(false)
											}
											title={item.label}
										>
											<IconComponent className="h-6 w-6" />
											<span
												className={`ml-3 whitespace-nowrap ${
													!sidebarOpen && "lg:hidden"
												}`}
											>
												{item.label}
											</span>
										</NavLink>
									</li>
								);
							})}
						</ul>
					</nav>
				</aside>				{/* Konten utama */}
				<main className="flex-1 min-h-screen">
					<Outlet />
				</main>
			</div>

			<Footer />
		</div>
	);
};

export default DesaLayout;
