// src/pages/kepala-bidang/KepalaBidangLayout.jsx
import React from "react";
import { Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import { FiHome, FiMail, FiTrendingUp, FiMenu, FiLogOut } from "react-icons/fi";
import './KepalaBidangLayout.css';

const KepalaBidangLayout = () => {
	const [showMenu, setShowMenu] = React.useState(false);
	const navigate = useNavigate();
	const location = useLocation();

	// Check if user is logged in and has kepala bidang role
	const user = JSON.parse(localStorage.getItem("user") || "{}");
	const token = localStorage.getItem("expressToken");

	const isKepalaBidang = user.role && [
		'kabid_sekretariat',
		'kabid_pemerintahan_desa', 
		'kabid_spked',
		'kabid_kekayaan_keuangan_desa',
		'kabid_pemberdayaan_masyarakat_desa'
	].includes(user.role);

	if (!token || !isKepalaBidang) {
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
		{ path: "/kepala-bidang/dashboard", label: "Dashboard", icon: FiHome },
		{ path: "/kepala-bidang/disposisi", label: "Disposisi", icon: FiMail },
		{ path: "/core-dashboard/dashboard", label: "Core", icon: FiTrendingUp },
		{ path: "/kepala-bidang/menu", label: "Menu", icon: FiMenu, action: () => setShowMenu(true) },
	];

	return (
		<div className="min-h-screen bg-gray-50 pb-20">
			{/* Main Content */}
			<main className="min-h-screen">
				<Outlet />
			</main>

			{/* Bottom Navigation - Blue Theme for Kepala Bidang */}
			<nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-blue-200 shadow-lg z-50">
				<div className="max-w-lg mx-auto px-2">
					<div className="flex items-center justify-around py-2">
						{bottomNavItems.map((item, index) => {
							const isActive = location.pathname === item.path;
							const Icon = item.icon;
							
							return (
								<button
									key={index}
									onClick={() => {
										if (item.action) {
											item.action();
										} else {
											navigate(item.path);
										}
									}}
									className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all ${
										isActive 
											? "text-blue-700" 
											: "text-blue-400 hover:text-blue-600"
									}`}
								>
									<Icon className={`h-6 w-6 mb-1 ${isActive ? "animate-bounce" : ""}`} />
									<span className={`text-xs font-medium ${isActive ? "font-bold" : ""}`}>
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
							<div className="px-6 py-4 border-b border-blue-100">
								<div className="flex items-center gap-3">
									<div className="h-14 w-14 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center shadow-md">
										<span className="text-white font-bold text-xl">
											{user.name?.charAt(0) || "K"}
										</span>
									</div>
									<div className="flex-1">
										<h3 className="font-bold text-gray-800 text-lg">{user.name || "Kepala Bidang"}</h3>
										<p className="text-sm text-gray-500">{user.email}</p>
										<span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium capitalize">
											{user.role?.replace(/_/g, ' ')}
										</span>
									</div>
								</div>
							</div>

							{/* Menu Items */}
							<div className="px-6 py-4 space-y-2 max-h-96 overflow-y-auto">
								<button
									onClick={() => {
										setShowMenu(false);
										navigate("/kepala-bidang/dashboard");
									}}
									className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-blue-50 transition-colors text-left"
								>
									<div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
										<FiHome className="h-6 w-6 text-blue-600" />
									</div>
									<div>
										<h4 className="font-semibold text-gray-800">Dashboard</h4>
										<p className="text-sm text-gray-500">Lihat ringkasan data</p>
									</div>
								</button>

								<button
									onClick={() => {
										setShowMenu(false);
										navigate("/kepala-bidang/disposisi");
									}}
									className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-blue-50 transition-colors text-left"
								>
									<div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
										<FiMail className="h-6 w-6 text-blue-600" />
									</div>
									<div>
										<h4 className="font-semibold text-gray-800">Disposisi Surat</h4>
										<p className="text-sm text-gray-500">Kelola disposisi</p>
									</div>
								</button>

								<button
									onClick={() => {
										setShowMenu(false);
										navigate("/core-dashboard/dashboard");
									}}
									className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-indigo-50 transition-colors text-left"
								>
									<div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center">
										<FiTrendingUp className="h-6 w-6 text-indigo-600" />
									</div>
									<div>
										<h4 className="font-semibold text-gray-800">Core Dashboard</h4>
										<p className="text-sm text-gray-500">Analisis mendalam</p>
									</div>
								</button>

								<div className="border-t border-gray-200 my-2"></div>

								<button
									onClick={handleLogout}
									className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-red-50 transition-colors text-left"
								>
									<div className="h-12 w-12 bg-red-100 rounded-xl flex items-center justify-center">
										<FiLogOut className="h-6 w-6 text-red-600" />
									</div>
									<div>
										<h4 className="font-semibold text-red-600">Keluar</h4>
										<p className="text-sm text-gray-500">Logout dari sistem</p>
									</div>
								</button>
							</div>

							{/* Close Button */}
							<div className="px-6 py-4 border-t border-gray-200">
								<button
									onClick={() => setShowMenu(false)}
									className="w-full py-3 text-gray-600 font-medium hover:text-gray-800 transition-colors"
								>
									Tutup
								</button>
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	);
};

export default KepalaBidangLayout;
