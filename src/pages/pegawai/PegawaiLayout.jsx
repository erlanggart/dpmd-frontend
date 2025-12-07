// src/pages/pegawai/PegawaiLayout.jsx
import React from "react";
import { Outlet, Navigate, Link, useLocation } from "react-router-dom";
import { FiHome, FiUser, FiLogOut, FiMenu, FiX } from "react-icons/fi";

const PegawaiLayout = () => {
	const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
	const location = useLocation();

	// Check if user is logged in and has pegawai role
	const user = JSON.parse(localStorage.getItem("user") || "{}");
	const token = localStorage.getItem("expressToken");

	if (!token || !user.role || user.role !== "pegawai") {
		return <Navigate to="/login" replace />;
	}

	const handleLogout = () => {
		localStorage.removeItem("user");
		localStorage.removeItem("expressToken");
		window.location.href = "/login";
	};

	const toggleSidebar = () => {
		setIsSidebarOpen(!isSidebarOpen);
	};

	const menuItems = [
		{ path: "/pegawai/dashboard", label: "Dashboard", icon: <FiHome /> },
		{ path: "/pegawai/profile", label: "Profil Saya", icon: <FiUser /> },
	];

	return (
		<div className="flex h-screen bg-gray-100">
			{/* Sidebar */}
			<aside
				className={`${
					isSidebarOpen ? "translate-x-0" : "-translate-x-full"
				} md:translate-x-0 fixed md:static inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out`}
			>
				<div className="flex flex-col h-full">
					{/* Logo */}
					<div className="flex items-center justify-between p-6 border-b">
						<div>
							<h1 className="text-xl font-bold text-blue-600">DPMD Bogor</h1>
							<p className="text-xs text-gray-600">Portal Pegawai</p>
						</div>
						<button
							onClick={toggleSidebar}
							className="md:hidden text-gray-600 hover:text-gray-800"
						>
							<FiX className="h-6 w-6" />
						</button>
					</div>

					{/* User Info */}
					<div className="p-6 border-b bg-gradient-to-r from-blue-50 to-blue-100">
						<div className="flex items-center gap-3">
							<div className="h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
								{user.name?.charAt(0) || "P"}
							</div>
							<div className="flex-1 min-w-0">
								<p className="font-semibold text-gray-800 truncate">{user.name}</p>
								<p className="text-xs text-gray-600 truncate">{user.email}</p>
							</div>
						</div>
					</div>

					{/* Menu */}
					<nav className="flex-1 p-4 overflow-y-auto">
						<ul className="space-y-2">
							{menuItems.map((item) => {
								const isActive = location.pathname === item.path;
								return (
									<li key={item.path}>
										<Link
											to={item.path}
											onClick={() => setIsSidebarOpen(false)}
											className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
												isActive
													? "bg-blue-600 text-white"
													: "text-gray-700 hover:bg-gray-100"
											}`}
										>
											<span className="text-xl">{item.icon}</span>
											<span className="font-medium">{item.label}</span>
										</Link>
									</li>
								);
							})}
						</ul>
					</nav>

					{/* Logout Button */}
					<div className="p-4 border-t">
						<button
							onClick={handleLogout}
							className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-all"
						>
							<FiLogOut className="text-xl" />
							<span className="font-medium">Keluar</span>
						</button>
					</div>
				</div>
			</aside>

			{/* Main Content */}
			<div className="flex-1 flex flex-col overflow-hidden">
				{/* Top Bar */}
				<header className="bg-white shadow-sm z-10">
					<div className="flex items-center justify-between px-6 py-4">
						<button
							onClick={toggleSidebar}
							className="md:hidden text-gray-600 hover:text-gray-800"
						>
							<FiMenu className="h-6 w-6" />
						</button>
						<h2 className="text-xl font-semibold text-gray-800">
							{menuItems.find((item) => item.path === location.pathname)?.label ||
								"Dashboard"}
						</h2>
						<div className="flex items-center gap-4">
							<span className="text-sm text-gray-600 hidden sm:inline">
								{new Date().toLocaleDateString("id-ID", {
									weekday: "long",
									year: "numeric",
									month: "long",
									day: "numeric",
								})}
							</span>
						</div>
					</div>
				</header>

				{/* Main Content Area */}
				<main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
					<Outlet />
				</main>
			</div>

			{/* Overlay for mobile sidebar */}
			{isSidebarOpen && (
				<div
					className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
					onClick={toggleSidebar}
				></div>
			)}
		</div>
	);
};

export default PegawaiLayout;
