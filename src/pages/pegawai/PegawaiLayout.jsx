// src/pages/pegawai/PegawaiLayout.jsx
import React from "react";
import { Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import { FiHome, FiUser, FiLogOut, FiBell, FiMenu } from "react-icons/fi";

const PegawaiLayout = () => {
	const [showMenu, setShowMenu] = React.useState(false);
	const navigate = useNavigate();
	const location = useLocation();

	// Check if user is logged in and has pegawai role
	const user = JSON.parse(localStorage.getItem("user") || "{}");
	const token = localStorage.getItem("expressToken");

	if (!token || !user.role || user.role !== "pegawai") {
		return <Navigate to="/login" replace />;
	}

	const handleLogout = () => {
		if (window.confirm("Yakin ingin keluar?")) {
			localStorage.removeItem("user");
			localStorage.removeItem("expressToken");
			window.location.href = "/login";
		}
	};

	const bottomNavItems = [
		{ path: "/pegawai/dashboard", label: "Beranda", icon: FiHome },
		{ path: "#", label: "Notifikasi", icon: FiBell, disabled: true },
		{ path: "#", label: "Profil", icon: FiUser, disabled: true },
		{ path: "/pegawai/menu", label: "Menu", icon: FiMenu, action: () => setShowMenu(true) },
	];

	return (
		<div className="min-h-screen bg-gray-50 pb-20">
			{/* Main Content */}
			<main className="min-h-screen">
				<Outlet />
			</main>

			{/* Bottom Navigation - Navy Slate Style */}
			<nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-50">
				<div className="max-w-lg mx-auto px-2">
					<div className="flex items-center justify-around py-2">
						{bottomNavItems.map((item, index) => {
							const isActive = location.pathname === item.path;
							const Icon = item.icon;
							
							return (
								<button
									key={index}
									onClick={() => {
										if (item.disabled) return;
										if (item.action) {
											item.action();
										} else {
											navigate(item.path);
										}
									}}
									disabled={item.disabled}
									className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-all ${
										item.disabled
											? "text-slate-300 cursor-not-allowed"
											: isActive 
												? "text-slate-700" 
												: "text-slate-400 hover:text-slate-600"
									}`}
								>
									<Icon className={`h-6 w-6 mb-1 ${isActive && !item.disabled ? "animate-bounce" : ""}`} />
									<span className={`text-xs font-medium ${isActive && !item.disabled ? "font-bold" : ""}`}>
										{item.label}
									</span>
								</button>
							);
						})}
					</div>
				</div>
			</nav>

			{/* Menu Modal - Slide from bottom */}
			{showMenu && (
				<>
					<div 
						className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-fadeIn"
						onClick={() => setShowMenu(false)}
					></div>
					<div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 animate-slideUp">
						<div className="max-w-lg mx-auto">
							{/* Handle Bar */}
							<div className="flex justify-center pt-3 pb-2">
								<div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
							</div>

							{/* Menu Header */}
							<div className="px-6 py-4 border-b border-slate-100">
								<div className="flex items-center gap-3">
									<div className="h-14 w-14 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center shadow-md">
										<span className="text-white font-bold text-xl">
											{user.name?.charAt(0) || "P"}
										</span>
									</div>
									<div>
										<p className="font-bold text-slate-800">{user.name}</p>
										<p className="text-sm text-slate-500">{user.email}</p>
									</div>
								</div>
							</div>

							{/* Menu Items */}
							<div className="px-6 py-4 space-y-2">
								<button 
									onClick={() => {
										setShowMenu(false);
										navigate("/pegawai/dashboard");
									}}
									className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-slate-50 transition-colors text-left"
								>
									<div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center">
										<FiHome className="h-5 w-5 text-slate-700" />
									</div>
									<div>
										<p className="font-semibold text-slate-800">Beranda</p>
										<p className="text-xs text-slate-500">Dashboard utama</p>
									</div>
								</button>

								<button 
									onClick={() => {
										setShowMenu(false);
										navigate("/pegawai/profil");
									}}
									disabled
									className="w-full flex items-center gap-3 p-4 rounded-xl bg-slate-50 transition-colors text-left opacity-50 cursor-not-allowed"
								>
									<div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
										<FiUser className="h-5 w-5 text-blue-600" />
									</div>
									<div>
										<p className="font-semibold text-slate-800">Profil Saya</p>
										<p className="text-xs text-slate-500">Segera hadir</p>
									</div>
								</button>

								<button 
									onClick={handleLogout}
									className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-red-50 transition-colors text-left"
								>
									<div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
										<FiLogOut className="h-5 w-5 text-red-600" />
									</div>
									<div>
										<p className="font-semibold text-red-600">Keluar</p>
										<p className="text-xs text-slate-500">Logout dari akun</p>
									</div>
								</button>
							</div>

							{/* Close Button */}
							<div className="px-6 py-4 border-t border-slate-100">
								<button
									onClick={() => setShowMenu(false)}
									className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
								>
									Tutup
								</button>
							</div>

							<div className="pb-6"></div>
						</div>
					</div>
				</>
			)}
		</div>
	);
};

export default PegawaiLayout;
