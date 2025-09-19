import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
	FiGrid,
	FiUsers,
	FiLogOut,
	FiFileText,
	FiImage,
	FiBriefcase,
} from "react-icons/fi";

const MainLayout = () => {
	const [user, setUser] = useState(null);
	const navigate = useNavigate();

	useEffect(() => {
		const storedUser = localStorage.getItem("user");
		if (storedUser) {
			setUser(JSON.parse(storedUser));
		}
	}, []);

	const handleLogout = () => {
		localStorage.removeItem("authToken");
		localStorage.removeItem("user");
		navigate("/login");
	};

	const linkClasses =
		"flex items-center p-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors";
	const activeLinkClasses = "bg-gray-700 text-white";

	return (
		<div className="flex h-screen bg-gray-900">
			<aside className="flex w-64 flex-shrink-0 flex-col bg-gray-800 text-white">
				<div className="flex h-16 flex-shrink-0 items-center justify-center px-4 font-bold text-2xl">
					DPMD App
				</div>
				<nav className="flex-1 space-y-2 overflow-y-auto p-4">
					<NavLink
						to="/dashboard"
						className={({ isActive }) =>
							`${linkClasses} ${isActive ? activeLinkClasses : ""}`
						}
						end
					>
						<FiGrid className="mr-3 h-5 w-5" />
						<span>Dashboard</span>
					</NavLink>
					{user?.roles.includes("superadmin") && (
						<>
							<NavLink
								to="/dashboard/users"
								className={({ isActive }) =>
									`${linkClasses} ${isActive ? activeLinkClasses : ""}`
								}
							>
								<FiUsers className="mr-3 h-5 w-5" />
								<span>Manajemen User</span>
							</NavLink>
							<NavLink
								to="/dashboard/hero-gallery"
								className={({ isActive }) =>
									`${linkClasses} ${isActive ? activeLinkClasses : ""}`
								}
							>
								<FiImage className="mr-3 h-5 w-5" />
								<span>Galeri Hero</span>
							</NavLink>
						</>
					)}
					{user?.roles.includes("admin desa") && (
						<NavLink
							to="/dashboard/pemerintahan-desa"
							className={({ isActive }) =>
								`${linkClasses} ${isActive ? activeLinkClasses : ""}`
							}
						>
							<FiBriefcase className="mr-3 h-5 w-5" />
							<span>Pemerintahan Desa</span>
						</NavLink>
					)}
				</nav>
			</aside>
			<div className="flex flex-1 flex-col overflow-hidden">
				<header className="flex h-16 flex-shrink-0 items-center justify-end border-b border-gray-700 bg-gray-800 px-6">
					<div className="flex items-center">
						<span className="mr-4 text-gray-300">Halo, {user?.name}</span>
						<button
							onClick={handleLogout}
							className="text-gray-400 hover:text-white"
							title="Logout"
						>
							<FiLogOut className="h-6 w-6" />
						</button>
					</div>
				</header>
				<main className="flex-1 overflow-y-auto p-8">
					<Outlet />
				</main>
			</div>
		</div>
	);
};

export default MainLayout;
