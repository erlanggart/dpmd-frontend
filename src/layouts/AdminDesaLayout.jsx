import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../hooks/useUserProfile";
import { FiLogOut, FiShield } from "react-icons/fi";
import { ChevronLeft, Menu } from "lucide-react";
import AnimatedIcon from "../components/AnimatedIcon";

// Admin Desa hanya mengelola akun — tidak ada menu operasional desa di sini.
const menuItems = [
	{ id: "akun", label: "Manajemen Akun", path: "/admin-desa/akun", icon: "users" },
	{ id: "pesan", label: "Pesan", path: "/admin-desa/pesan", icon: "chatbot" },
	{ id: "settings", label: "Pengaturan", path: "/admin-desa/settings", icon: "settings" },
];

const useIsDesktop = () => {
	const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
	React.useEffect(() => {
		const onResize = () => setIsDesktop(window.innerWidth >= 1024);
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);
	return isDesktop;
};

const AdminDesaLayout = () => {
	const { logout } = useAuth();
	const user = useUserProfile();
	const navigate = useNavigate();
	const location = useLocation();
	const isDesktop = useIsDesktop();
	const [isCollapsed, setIsCollapsed] = useState(false);

	const handleLogout = () => {
		logout();
		window.location.href = "/";
	};

	const desaLabel = user?.desa?.status_pemerintahan === "desa" ? "Desa" : "Kelurahan";

	const renderNav = (collapsed) =>
		menuItems.map((item) => {
			const isActive =
				location.pathname === item.path || location.pathname.startsWith(item.path + "/");
			return (
				<button
					key={item.id}
					onClick={() => navigate(item.path)}
					className={`group relative w-full flex items-center ${
						collapsed ? "justify-center" : "gap-3"
					} px-3 py-2.5 rounded-xl transition-all duration-200 ${
						isActive
							? "bg-white text-slate-900 shadow-lg"
							: "text-slate-300 hover:bg-white/10 hover:text-white"
					}`}
					title={collapsed ? item.label : ""}
				>
					<AnimatedIcon type={item.icon} isActive={isActive} className="w-5 h-5" />
					{!collapsed && (
						<span className="font-semibold truncate text-sm">{item.label}</span>
					)}
				</button>
			);
		});

	return (
		<div className="min-h-screen bg-slate-50">
			{isDesktop && (
				<aside
					className={`fixed top-0 left-0 h-full bg-slate-900 text-white shadow-2xl z-40 transition-all duration-300 border-r border-slate-800 ${
						isCollapsed ? "w-20" : "w-64"
					}`}
				>
					<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-300 via-white to-slate-400" />

					<div className="relative p-4 h-20 border-b border-slate-800 flex items-center justify-between bg-slate-950">
						{!isCollapsed && (
							<div className="flex items-center justify-center flex-1">
								<img src="/logo-dpmd.png" alt="DPMD Logo" className="h-20" />
							</div>
						)}
						<button
							onClick={() => setIsCollapsed(!isCollapsed)}
							className={`p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0 ${
								isCollapsed ? "mx-auto" : ""
							}`}
							aria-label={isCollapsed ? "Buka sidebar" : "Tutup sidebar"}
						>
							{isCollapsed ? (
								<Menu className="w-5 h-5 text-slate-200" />
							) : (
								<ChevronLeft className="w-5 h-5 text-slate-200" />
							)}
						</button>
					</div>

					{!isCollapsed && (
						<div className="px-4 pt-4">
							<div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-400/30 px-3 py-2">
								<FiShield className="h-4 w-4 text-amber-300 flex-shrink-0" />
								<p className="text-[11px] leading-tight text-amber-100">
									Akun ini khusus mengelola akun desa, bukan fitur operasional.
								</p>
							</div>
						</div>
					)}

					<nav className="relative p-3 space-y-1.5 mt-2">{renderNav(isCollapsed)}</nav>

					<div className="absolute bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950">
						<div className="p-3 border-b border-slate-800">
							<div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
								<div className="h-10 w-10 bg-slate-700 ring-1 ring-white/15 rounded-full flex items-center justify-center">
									<span className="text-white font-bold text-sm">
										{user?.name?.charAt(0)?.toUpperCase() || "A"}
									</span>
								</div>
								{!isCollapsed && (
									<div className="flex-1 min-w-0">
										<h3 className="font-semibold text-white text-sm truncate">{user?.name}</h3>
										<span className="inline-block px-2 py-0.5 bg-white/10 text-slate-200 rounded-full text-xs font-medium mt-1 truncate max-w-full">
											Admin {desaLabel} {user?.desa?.nama}
										</span>
									</div>
								)}
							</div>
						</div>
						<div className="p-3">
							<button
								onClick={handleLogout}
								className={`w-full flex items-center ${
									isCollapsed ? "justify-center" : "gap-3"
								} px-3 py-2.5 rounded-xl transition-all duration-200 text-red-300 hover:bg-red-500 hover:text-white`}
							>
								<FiLogOut className="h-5 w-5" />
								{!isCollapsed && <span className="font-semibold text-sm">Keluar</span>}
							</button>
						</div>
					</div>
				</aside>
			)}

			<main
				className={`min-h-screen transition-all duration-300 ${
					isDesktop ? (isCollapsed ? "ml-20" : "ml-64") : "pb-24"
				}`}
			>
				<div className="p-4">
					<Outlet />
				</div>
			</main>

			{!isDesktop && (
				<nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 shadow-lg z-50">
					<div className="max-w-lg mx-auto px-2 py-2 flex items-center justify-around gap-1">
						{menuItems.map((item) => {
							const isActive =
								location.pathname === item.path ||
								location.pathname.startsWith(item.path + "/");
							return (
								<button
									key={item.id}
									onClick={() => navigate(item.path)}
									className={`flex flex-col items-center px-3 py-1 rounded-xl ${
										isActive ? "text-white" : "text-slate-400"
									}`}
								>
									<AnimatedIcon type={item.icon} isActive={isActive} className="w-6 h-6" />
									<span className="text-[11px] mt-1 font-medium">{item.label}</span>
								</button>
							);
						})}
						<button
							onClick={handleLogout}
							className="flex flex-col items-center px-3 py-1 rounded-xl text-red-300"
						>
							<FiLogOut className="w-6 h-6" />
							<span className="text-[11px] mt-1 font-medium">Keluar</span>
						</button>
					</div>
				</nav>
			)}
		</div>
	);
};

export default AdminDesaLayout;
