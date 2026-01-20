import React, { useState, useEffect, useMemo, useRef } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
	FiGrid,
	FiLogOut,
	FiClipboard,
	FiLayout,
	FiChevronDown,
	FiSearch,
	FiX,
	FiMenu,
	FiChevronsRight,
	FiChevronsLeft,
	FiFileText,
	FiDollarSign,
	FiSettings,
} from "react-icons/fi";

import {
	TbBuildingBank,
} from "react-icons/tb";
import { Landmark } from "lucide-react";
import SearchPalette from "../components/SearchPalatte";
import InstallPWA from "../components/InstallPWA";

const MainLayout = () => {
	const [user, setUser] = useState(null);
	const navigate = useNavigate();
	const location = useLocation();

	const [isSearchOpen, setSearchOpen] = useState(false);
	const [isSidebarOpen, setSidebarOpen] = useState(false);
	// --- STATE BARU untuk sidebar desktop ---
	const [isSidebarMinimized, setSidebarMinimized] = useState(false);
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const dropdownRef = useRef(null);

	useEffect(() => {
		const handleKeyDown = (e) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "k") {
				e.preventDefault();
				setSearchOpen(true);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

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

	useEffect(() => {
		const storedUser = localStorage.getItem("user");
		
		if (storedUser) {
			const userData = JSON.parse(storedUser);
			setUser(userData);
		}
	}, []);

	const handleLogout = () => {
		localStorage.removeItem("expressToken");
		localStorage.removeItem("user");
		navigate("/login");
	};

	// Definisikan menu berdasarkan role user menggunakan useMemo
	const menuItems = useMemo(() => {
		// Mapping bidang_id ke bidang type
		const bidangMapping = {
			1: 'sekretariat', // Sekretariat
			2: 'pemerintahan_desa', // Pemerintahan Desa
			3: 'kekayaan_keuangan', // Kekayaan dan Keuangan Desa (KKD)
			4: 'sarana_prasarana', // Sarana Prasarana dan Kekayaan Desa (SPKED)
			5: 'pemberdayaan_masyarakat', // Pemberdayaan Masyarakat Desa
		};

		// Flat menu items untuk semua user (tanpa dropdown)
		const flatMenuItems = [
			{ to: "/dashboard/bumdes", label: "BUMDes", icon: <Landmark size={20} />, bidangId: 4 },
			{ to: "/dashboard/bankeu", label: "Bantuan Keuangan", icon: <Landmark size={20} />, bidangId: 4 },
			{ to: "/dashboard/add", label: "ADD", icon: <FiDollarSign />, bidangId: 3 },
			{ to: "/dashboard/bhprd", label: "BHPRD", icon: <FiDollarSign />, bidangId: 3 },
			{ to: "/dashboard/dd", label: "DD", icon: <FiDollarSign />, bidangId: 3 },
			{ to: "/bidang/pmd/kelembagaan", label: "Kelembagaan", icon: <TbBuildingBank />, bidangId: 5 },
			{ to: "/dashboard/user", label: "Manajemen Pegawai", icon: <FiClipboard />, bidangId: 1, superadminOnly: true },
			{ to: "/dashboard/perjalanan-dinas", label: "Perjalanan Dinas", icon: <FiClipboard />, bidangId: 1 },
			{ to: "/dashboard/disposisi", label: "Disposisi Surat", icon: <FiClipboard />, bidangId: 1 },
			{ to: "/dashboard/hero-gallery", label: "Galeri Hero", icon: <FiLayout />, superadminOnly: true },
			{ to: "/dashboard/berita", label: "Manajemen Berita", icon: <FiLayout />, superadminOnly: true },
			{ to: "/dashboard/user", label: "Manajemen User", icon: <FiSettings />, superadminOnly: true },
		];

		if (!user) {
			return [];
		}

		// console.log("User Role:", user);
		const userRole = user.role;
		const userBidangId = user.bidang_id;
		
		const isSuperAdmin = userRole === 'superadmin';
		
		// Superadmin melihat semua menu
		if (isSuperAdmin) {
			return flatMenuItems;
		}
		
		// Pegawai/Bidang user hanya melihat menu sesuai bidang_id mereka
		return flatMenuItems.filter(item => {
			// Skip menu yang hanya untuk superadmin
			if (item.superadminOnly) return false;
			
			// Filter berdasarkan bidang_id
			if (userBidangId && item.bidangId === userBidangId) {
				return true;
			}
			
			return false;
		});
	}, [user]);

	return (
		<div className="flex h-screen bg-indigo-200">
			{isSidebarOpen && (
				<div
					onClick={() => {
						setSidebarOpen(false);
						setSidebarMinimized(false);
					}}
					className="fixed inset-0 z-30 bg-black/50 lg:hidden"
				></div>
			)}
			
			<aside
				className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-white shadow-lg border border-slate-200 transition-all duration-300 ease-in-out lg:static lg:translate-x-0 lg:m-4 rounded-xl ${
					isSidebarOpen ? "translate-x-0" : "-translate-x-full"
				} ${isSidebarMinimized ? "w-24" : "w-72"}`}
			>
				<div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200 transition-all duration-300">
					<div className="flex items-center overflow-hidden px-4">
						<img
							src="/logo-bogor.png"
							alt="Logo"
							className="h-10 flex-shrink-0"
						/>
						<div
							className={`transition-all duration-300 whitespace-nowrap ${
								isSidebarMinimized ? "w-0 opacity-0" : "w-full opacity-100 ml-3"
							}`}
						>
							<p className="text-sm font-bold text-primary">DPMD</p>
							<p className="text-xs text-gray-500">Kabupaten Bogor</p>
						</div>
					</div>
					
					{/* Toggle Sidebar Button - Desktop only */}
					<button
						onClick={() => setSidebarMinimized(!isSidebarMinimized)}
						className="hidden lg:flex bg-purple-700 w-7 h-full items-center justify-center text-white rounded-tr-xl hover:bg-purple-800 transition-colors"
						aria-label="Toggle Sidebar"
					>
						{isSidebarMinimized ? (
							<FiChevronsRight size={18} />
						) : (
							<FiChevronsLeft size={18} />
						)}
					</button>
					
					{/* Close Button - Mobile only */}
					<button
						onClick={() => {
							setSidebarOpen(false);
							setSidebarMinimized(false);
						}}
						className="lg:hidden text-gray-500 hover:text-primary px-4"
					>
						<FiX size={24} />
					</button>
				</div>

				<nav
					className={`flex-1 space-y-1 p-4 ${
						isSidebarMinimized ? "overflow-hidden" : "overflow-y-auto"
					}`}
				>
	

					{/* Link Core Dashboard Analytics - Available for all roles */}
					<NavLink
						to="/bidang/pmd/core-dashboard"
						className={({ isActive }) =>
							`flex items-center p-3 rounded-lg transition-colors relative ${
								isSidebarMinimized ? "justify-center" : ""
							} ${
								isActive
									? "text-purple-700 font-semibold"
									: "text-gray-600 hover:bg-gray-100"
							}`
						}
					>
						{({ isActive }) => (
							<>
								<FiLayout
									className={`h-5 w-5 flex-shrink-0 ${
										isSidebarMinimized ? "" : "mr-3"
									}`}
								/>
								<span
									className={`transition-all duration-200 ${
										isSidebarMinimized ? "w-0 opacity-0" : "w-auto opacity-100"
									}`}
								>
									Core Dashboard
								</span>
								{isActive && (
									<div className="absolute right-0 top-0 bottom-0 w-1 bg-purple-700 rounded-l-lg"></div>
								)}
							</>
						)}
					</NavLink>

					{/* Link Dashboard Bidang - Show based on bidang_id */}
					{user && user.bidang_id && (() => {
						// Mapping bidang_id ke path dashboard bidang
						const bidangPathMapping = {
							1: '/bidang/sekretariat', // Sekretariat
							2: '/bidang/pemdes', // Pemerintahan Desa
							3: '/bidang/kkd', // Kekayaan dan Keuangan Desa (KKD)
							4: '/bidang/spked', // Sarana Prasarana dan Kekayaan Desa (SPKED)
							5: '/bidang/pmd', // Pemberdayaan Masyarakat Desa
						};
						
						const dashboardPath = bidangPathMapping[user.bidang_id];
						
						if (!dashboardPath) return null;
						
						return (
							<NavLink
								to={dashboardPath}
								end
								className={({ isActive }) =>
									`flex items-center p-3 rounded-lg transition-colors relative ${
										isSidebarMinimized ? "justify-center" : ""
									} ${
										isActive
											? "text-purple-700 font-semibold"
											: "text-gray-600 hover:bg-gray-100"
									}`
								}
							>
								{({ isActive }) => (
									<>
										<FiGrid
											className={`h-5 w-5 flex-shrink-0 ${
												isSidebarMinimized ? "" : "mr-3"
											}`}
										/>
										<span
											className={`transition-all duration-200 ${
												isSidebarMinimized ? "w-0 opacity-0" : "w-auto opacity-100"
											}`}
										>
											Dashboard Bidang
										</span>
										{isActive && (
											<div className="absolute right-0 top-0 bottom-0 w-1 bg-purple-700 rounded-l-lg"></div>
										)}
									</>
								)}
							</NavLink>
						);
					})()}

					{/* Render Flat Menu Items */}
					{menuItems.map((item) => (
						<NavLink
							key={item.to}
							to={item.to}
							className={({ isActive }) =>
								`flex items-center p-3 rounded-lg transition-colors relative ${
									isSidebarMinimized ? "justify-center" : ""
								} ${
									isActive
										? "text-purple-700 font-semibold"
										: "text-gray-600 hover:bg-gray-100"
								}`
							}
						>
							{({ isActive }) => (
								<>
									{React.cloneElement(item.icon, {
										className: `h-5 w-5 flex-shrink-0 ${
											isSidebarMinimized ? "" : "mr-3"
										}`,
									})}
									<span
										className={`transition-all duration-200 ${
											isSidebarMinimized ? "w-0 opacity-0" : "w-auto opacity-100"
										}`}
									>
										{item.label}
									</span>
									{isActive && (
										<div className="absolute right-0 top-0 bottom-0 w-1 bg-purple-700 rounded-l-lg"></div>
									)}
								</>
							)}
						</NavLink>
					))}
				</nav>
				
				{/* User Profile Bubble */}
				<div className="p-4 border-t border-gray-200">
					<div className="relative" ref={dropdownRef}>
						{/* User Profile Button */}
						<button
							onClick={() => setDropdownOpen(!dropdownOpen)}
							className={`flex items-center w-full p-3 rounded-lg transition-colors hover:bg-gray-100 ${
								isSidebarMinimized ? "justify-center" : ""
							}`}
							title={user?.name}
						>
							{/* User Avatar */}
							<div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold shadow-md flex-shrink-0">
								{user?.name?.charAt(0).toUpperCase() || "U"}
							</div>
							
							{/* User Info */}
							{!isSidebarMinimized && (
								<div className="flex-1 flex flex-col ml-3 text-left overflow-hidden">
									<span className="text-sm font-semibold text-gray-800 truncate">
										{user?.name}
									</span>
									<span className="text-xs text-gray-500 truncate">
										{user?.role === 'superadmin' ? 'Super Admin' : user?.bidang?.nama || 'User'}
									</span>
								</div>
							)}
							
							{/* Chevron */}
							{!isSidebarMinimized && (
								<FiChevronDown
									className={`h-4 w-4 transition-transform text-gray-600 ${
										dropdownOpen ? "rotate-180" : ""
									}`}
								/>
							)}
						</button>

					{/* Bubble Menu - Muncul di samping kanan saat minimized, di atas saat expanded */}
					{dropdownOpen && (
						<div 
							className={`absolute bg-white rounded-xl shadow-2xl border border-gray-200 z-50 ${
								isSidebarMinimized 
									? "left-full ml-2 bottom-0 w-64" 
									: "bottom-full mb-2 left-0 right-0"
							}`}
						>
							{/* User Profile Info di dalam bubble */}
							<div className="p-4 border-b border-gray-200">
								<div className="flex items-center space-x-3">
									<div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
										{user?.name?.charAt(0).toUpperCase() || "U"}
									</div>
									<div className="flex-1 overflow-hidden">
										<p className="text-sm font-bold text-gray-800 truncate">
											{user?.name}
										</p>
										<p className="text-xs text-gray-500 truncate">
											{user?.role === 'superadmin' ? 'Super Admin' : user?.bidang?.nama || 'User'}
										</p>
									</div>
								</div>
							</div>
							
							{/* Menu Actions */}
							<div className="py-1">
								<button
									onClick={() => {
										setDropdownOpen(false);
										handleLogout();
									}}
									className="flex items-center w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 transition-colors"
								>
									<FiLogOut className="h-5 w-5 mr-3" />
									<span className="font-medium">Logout</span>
								</button>
							</div>
						</div>
					)}
					</div>
				</div>

				{/* Install PWA Button */}
				{!isSidebarMinimized && (
					<div className="px-4 pb-4">
						<InstallPWA />
					</div>
				)}
			</aside>
			
			<div className="flex flex-1 flex-col overflow-hidden">
				{/* Mobile Menu Button - Only visible on mobile */}
				<div className="lg:hidden fixed top-4 left-4 z-50">
					<button
						onClick={() => setSidebarOpen(true)}
						className="p-3 bg-white rounded-lg shadow-md border border-slate-200 text-gray-600 hover:text-primary"
					>
						<FiMenu size={24} />
					</button>
				</div>
				
				<main className="flex-1 overflow-y-auto p-4">
					<Outlet />
				</main>
			</div>
			{/* --- RENDER KOMPONEN SEARCH PALETTE SECARA KONDISIONAL --- */}
			{isSearchOpen && (
				<SearchPalette
					menuItems={menuItems}
					adminMenuItems={[]} // Admin menu sudah digabung dalam menuItems
					closePalette={() => setSearchOpen(false)}
				/>
			)}
		</div>
	);
};

export default MainLayout;
