// src/pages/sekretaris-dinas/SekretarisDinasLayout.jsx
import React from "react";
import { Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import { FiHome, FiMail, FiTrendingUp, FiMenu, FiLogOut, FiUser } from "react-icons/fi";
import { useConfirm } from "../../hooks/useConfirm.jsx";
import { subscribeToPushNotifications } from "../../utils/pushNotifications";

const SekretarisDinasLayout = () => {
	const [showMenu, setShowMenu] = React.useState(false);
	const [user, setUser] = React.useState(JSON.parse(localStorage.getItem("user") || "{}"));
	const navigate = useNavigate();
	const location = useLocation();
	const { confirmDialog, showConfirm } = useConfirm();

	// Check if user is logged in and has sekretaris_dinas role
	const token = localStorage.getItem("expressToken");

	// Update user data when profile changes
	React.useEffect(() => {
		const handleProfileUpdate = () => {
			const updatedUser = JSON.parse(localStorage.getItem("user") || "{}");
			setUser(updatedUser);
		};
		window.addEventListener('userProfileUpdated', handleProfileUpdate);
		return () => window.removeEventListener('userProfileUpdated', handleProfileUpdate);
	}, []);

	// Initialize push notifications for sekretaris_dinas
	React.useEffect(() => {
		const initPushNotifications = async () => {
			if (token && user.role === 'sekretaris_dinas') {
				const permission = Notification.permission;
				
				if (permission === 'granted') {
					console.log('[SekretarisDinas] Initializing push notifications...');
					try {
						const subscription = await subscribeToPushNotifications();
						if (subscription) {
							console.log('✅ [SekretarisDinas] Push notification subscription successful');
						}
					} catch (err) {
						console.warn('[SekretarisDinas] Push notification subscription failed:', err);
					}
				}
			}
		};

		initPushNotifications();
	}, [token, user.role]);

	if (!token || !user.role || user.role !== "sekretaris_dinas") {
		return <Navigate to="/login" replace />;
	}

	const handleLogout = async () => {
		const confirmed = await showConfirm({
			title: 'Keluar dari Aplikasi',
			message: 'Apakah Anda yakin ingin keluar?',
			type: 'warning',
			confirmText: 'Ya, Keluar',
			cancelText: 'Batal'
		});
		if (confirmed) {
			localStorage.removeItem("user");
			localStorage.removeItem("expressToken");
			window.location.href = "/login";
		}
	};

	const bottomNavItems = [
		{ path: "/sekretaris-dinas/dashboard", label: "Dashboard", icon: FiHome },
		{ path: "/sekretaris-dinas/disposisi", label: "Disposisi", icon: FiMail },
		{ path: "/core-dashboard/dashboard", label: "Core", icon: FiTrendingUp },
		{ path: "/sekretaris-dinas/menu", label: "Menu", icon: FiMenu, action: () => setShowMenu(true) },
	];

	return (
		<div className="min-h-screen bg-gray-50 pb-20">
			{/* Main Content */}
			<main className="min-h-screen">
				<Outlet />
			</main>

			{/* Bottom Navigation - Purple Theme for Sekretaris Dinas */}
			<nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-purple-200 shadow-lg z-50">
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
											? "text-purple-700" 
											: "text-purple-400 hover:text-purple-600"
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
							<div className="px-6 py-4 border-b border-purple-100">
								<div className="flex items-center gap-3">
									{user.avatar ? (
										<img 
											src={`${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://127.0.0.1:3001'}${user.avatar}`}
											alt={user.name}
											className="h-14 w-14 rounded-full object-cover shadow-md"
											onError={(e) => {
												e.target.style.display = 'none';
												e.target.nextElementSibling.style.display = 'flex';
											}}
										/>
									) : null}
									<div className={`h-14 w-14 bg-gradient-to-br from-purple-600 to-purple-800 rounded-full flex items-center justify-center shadow-md ${user.avatar ? 'hidden' : ''}`}>
										<span className="text-white font-bold text-xl">
											{user.name?.charAt(0) || "S"}
										</span>
									</div>
									<div className="flex-1">
										<h3 className="font-bold text-gray-800 text-lg">{user.name || "Sekretaris Dinas"}</h3>
										<p className="text-sm text-gray-500">{user.email}</p>
										<span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
											Sekretaris Dinas
										</span>
									</div>
								</div>
							</div>

							{/* Menu Items */}
							<div className="px-6 py-4 space-y-2 max-h-96 overflow-y-auto">
								<button
									onClick={() => {
										setShowMenu(false);
										navigate("/sekretaris-dinas/dashboard");
									}}
									className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-purple-50 transition-colors text-left"
								>
									<div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center">
										<FiHome className="h-6 w-6 text-purple-600" />
									</div>
									<div>
										<h4 className="font-semibold text-gray-800">Dashboard</h4>
										<p className="text-sm text-gray-500">Lihat ringkasan data</p>
									</div>
								</button>

								<button
									onClick={() => {
										setShowMenu(false);
										navigate("/sekretaris-dinas/disposisi");
									}}
									className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-purple-50 transition-colors text-left"
								>
									<div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center">
										<FiMail className="h-6 w-6 text-purple-600" />
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

								<button								onClick={() => {
									setShowMenu(false);
									navigate("/sekretaris-dinas/profile");
								}}
								className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-purple-50 transition-colors text-left"
							>
								<div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center">
									<FiUser className="h-6 w-6 text-purple-600" />
								</div>
								<div>
									<h4 className="font-semibold text-gray-800">Profil Saya</h4>
									<p className="text-sm text-gray-500">Lihat dan edit profil</p>
								</div>
							</button>

							<button									onClick={handleLogout}
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
			{confirmDialog}

			<style>{`
				@keyframes fadeIn {
					from { opacity: 0; }
					to { opacity: 1; }
				}
				@keyframes slideUp {
					from { transform: translateY(100%); }
					to { transform: translateY(0); }
				}
				.animate-fadeIn {
					animation: fadeIn 0.3s ease-out;
				}
				.animate-slideUp {
					animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
				}
			`}</style>
		</div>
	);
};

export default SekretarisDinasLayout;
