import React, { useState, useEffect, useMemo } from "react";
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
} from "react-icons/fi";

import {
	TbMap,
} from "react-icons/tb";
import SearchPalette from "../components/SearchPalatte";
import RoleSwitcher from "../components/RoleSwitcher";

// Komponen Submenu (Accordion Item)
const SubMenu = ({ item, openMenu, toggleMenu, isMinimized }) => {
	const location = useLocation();
	const isOpen = openMenu === item.key;

	// Cek apakah salah satu submenu aktif - logika yang disederhanakan
	const isChildActive = item.children.some((child) => {
		return location.pathname.startsWith(child.to);
	});

	return (
		<div>
			<button
				onClick={() => !isMinimized && toggleMenu(item.key)}
				className={`flex w-full items-center p-3 rounded-lg transition-colors ${
					isMinimized ? "justify-center" : "justify-between"
				} text-gray-600 hover:bg-gray-100`}
				disabled={isMinimized}
			>
				<div className="flex items-center">
					{React.cloneElement(item.icon, {
						className: `h-5 w-5 flex-shrink-0 ${isMinimized ? "" : "mr-3"}`,
					})}
					<span
						className={`transition-all duration-200 whitespace-nowrap ${
							isMinimized ? "w-0 opacity-0" : "w-auto opacity-100 ml-3"
						}`}
					>
						{item.label}
					</span>
				</div>
				<FiChevronDown
					className={`transform transition-all duration-300 flex-shrink-0 ${
						isOpen ? "rotate-180" : ""
					} ${isMinimized ? "w-0 opacity-0" : "w-auto opacity-100"}`}
				/>
			</button>
			<div
				className={`overflow-hidden transition-all duration-300 ${
					isOpen && !isMinimized ? "max-h-96" : "max-h-0"
				}`}
			>
				<div className="flex flex-col space-y-1 py-2 pl-9">
					{item.children.map((child) => (
						<NavLink
							key={child.to}
							to={child.to}
							className={({ isActive }) =>
								`py-2 px-3 text-sm rounded-md transition-colors ${
									isActive
										? "sidebar-active font-semibold"
										: "text-gray-500 hover:bg-gray-100 hover:text-primary"
								}`
							}
						>
							{child.label}
						</NavLink>
					))}
				</div>
			</div>
		</div>
	);
};

const MainLayout = () => {
	const [user, setUser] = useState(null);
	const [openMenu, setOpenMenu] = useState(null);
	const navigate = useNavigate();
	const location = useLocation();

	const [isSearchOpen, setSearchOpen] = useState(false);
	const [isSidebarOpen, setSidebarOpen] = useState(false);
	// --- STATE BARU untuk sidebar desktop ---
	const [isSidebarMinimized, setSidebarMinimized] = useState(false);

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

	useEffect(() => {
		const storedUser = localStorage.getItem("user");
		
		if (storedUser) {
			const userData = JSON.parse(storedUser);
			setUser(userData);
		}
	}, []);

	// Secara otomatis membuka menu yang relevan saat halaman dimuat
	useEffect(() => {
		if (!menuItems) return;
		
		const currentMenu = menuItems.find((item) =>
			item.children.some((child) => location.pathname.startsWith(child.to))
		);
		if (currentMenu) {
			setOpenMenu(currentMenu.key);
		}
	}, [location.pathname, user]); // Ganti menuItems dengan user untuk menghindari circular dependency

	const handleLogout = () => {
		localStorage.removeItem("expressToken");
		localStorage.removeItem("user");
		navigate("/login");
	};

	const toggleMenu = (key) => {
		setOpenMenu(openMenu === key ? null : key);
	};

	// Definisikan menu berdasarkan role user menggunakan useMemo
	const menuItems = useMemo(() => {
		const baseMenuItems = [
			{
				key: "sarpras",
				label: "SPKED",
				icon: <TbMap />,
				children: [
					{ to: "/dashboard/bumdes", label: "BUMDes" },
				],
			},
		];

		// Menu admin yang akan ditambahkan jika user adalah superadmin atau bidang
		const adminMenuItems = [
			{
				key: "sekretariat",
				label: "Sekretariat",
				icon: <FiClipboard />,
				children: [
					{ to: "/dashboard/perjalanan-dinas", label: "Perjalanan Dinas" },
				],
			},
			{
				key: "landing",
				label: "Landing Page",
				icon: <FiLayout />,
				children: [
					{ to: "/dashboard/hero-gallery", label: "Galeri Hero" },
				],
			},
		];

		// Gabungkan menu berdasarkan role user
		if (!user) {
			return baseMenuItems;
		}

		const userRoles = user.roles || [];
		const userRole = user.role; // Role langsung dari database
		const bidangRoles = ['sekretariat', 'sarana_prasarana', 'kekayaan_keuangan', 'pemberdayaan_masyarakat', 'pemerintahan_desa'];
		
		const isSuperAdmin = userRoles.includes("superadmin") || userRole === 'superadmin';
		const isBidangUser = userRoles.includes("bidang") || Boolean(user.bidangRole) || bidangRoles.includes(userRole);
		
		if (isSuperAdmin || isBidangUser) {
			const finalMenu = [...baseMenuItems, ...adminMenuItems];
			return finalMenu;
		}
		
		return baseMenuItems;
	}, [user]); // Dependency hanya pada user

	return (
		<div className="flex h-screen bg-slate-100">
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
				<div
					className={`flex h-16 flex-shrink-0 items-center border-b border-slate-200 transition-all duration-300 ${
						isSidebarMinimized ? "justify-center px-2" : "justify-start px-4"
					}`}
				>
					<div className="flex items-center overflow-hidden">
						<img
							src="/logo-kab.png"
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
					<div className="flex items-center">
						<button
							onClick={() => {
								setSidebarOpen(false);
								setSidebarMinimized(false);
							}}
							className="text-gray-500 hover:text-primary lg:hidden"
						>
							<FiX size={24} />
						</button>
					</div>
				</div>

				<nav
					className={`flex-1 space-y-1 ${
						isSidebarMinimized ? "overflow-y-hidden" : "overflow-y-auto"
					} p-4`}
				>
					{/* Link Dashboard Utama */}
					<NavLink
						to="/dashboard"
						className={({ isActive }) =>
							`flex items-center p-3 rounded-lg transition-colors ${
								isSidebarMinimized ? "justify-center" : ""
							} ${
								isActive
									? "sidebar-active font-semibold"
									: "text-gray-600 hover:bg-gray-100"
							}`
						}
						end
					>
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
							Dashboard
						</span>
					</NavLink>

					{/* Render Menu - Semua menu dalam satu sidebar tanpa pemisahan */}
					{menuItems.map((item) => (
						<SubMenu
							key={item.key}
							item={item}
							openMenu={openMenu}
							toggleMenu={toggleMenu}
							isMinimized={isSidebarMinimized}
						/>
					))}
				</nav>
			</aside>
			<div className="flex flex-1 flex-col overflow-hidden ">
				<header className="flex h-16 flex-shrink-0 items-center justify-between bg-white m-4 px-6 rounded-lg shadow-md border border-slate-200">
					<div className="flex space-x-2 w-full justify-between items-center">
						<div className="flex items-center space-x-2">
							<button
								onClick={() => setSidebarOpen(true)}
								className="mr-4 text-gray-600 hover:text-primary lg:hidden"
							>
								<FiMenu size={24} />
							</button>

							{/* --- Tombol untuk minimize sidebar (hanya di desktop) --- */}
							<button
								onClick={() => setSidebarMinimized(!isSidebarMinimized)}
								className="hidden text-gray-600 hover:text-primary lg:block"
								aria-label="Toggle Sidebar"
							>
								{isSidebarMinimized ? (
									<FiChevronsRight size={24} />
								) : (
									<FiChevronsLeft size={24} />
								)}
							</button>
							<span className="mr-4 text-gray-700">
								Halo, <span className="font-semibold">{user?.name}</span>
								
							</span>
						</div>

						<button
							onClick={() => setSearchOpen(true)}
							className="flex w-xs items-center justify-between text-gray-500 bg-slate-200 hover:bg-gray-200/50 px-3 py-1.5 rounded-lg border border-slate-300 text-sm"
						>
							<FiSearch className="mr-2 h-4 " />
							Cari...
							{/* <span className="ml-4 text-xs border rounded px-1.5 py-0.5">
								Ctrl+K
							</span> */}
						</button>
						<button
							onClick={handleLogout}
							className="text-gray-500 hover:text-red-500"
							title="Logout"
						>
							<FiLogOut className="h-6 w-6" />
						</button>
					</div>
					<div className="flex items-center"></div>
				</header>
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
			
			{/* Role Switcher untuk development */}
			<RoleSwitcher />
		</div>
	);
};

export default MainLayout;
