// src/pages/pegawai/PegawaiLayout.jsx
import React from "react";
import { Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import { FiHome, FiUser, FiLogOut, FiMenu, FiMail, FiBell, FiCalendar, FiBarChart2 } from "react-icons/fi";
import { useConfirm } from "../../hooks/useConfirm.jsx";
import { subscribeToPushNotifications } from "../../utils/pushNotifications";
import toast from 'react-hot-toast';
import './PegawaiLayout.css';

const PegawaiLayout = () => {
	const [showMenu, setShowMenu] = React.useState(false);
	const [showNotifications, setShowNotifications] = React.useState(false);
	const [notifications, setNotifications] = React.useState([]);
	const [unreadCount, setUnreadCount] = React.useState(0);
	const [user, setUser] = React.useState(JSON.parse(localStorage.getItem("user") || "{}"));
	const navigate = useNavigate();
	const location = useLocation();
	const { confirmDialog, showConfirm } = useConfirm();

	// Check if user is logged in and has pegawai role
	const token = localStorage.getItem("expressToken");

	// Update user data when localStorage changes
	React.useEffect(() => {
		const handleStorageChange = () => {
			const updatedUser = JSON.parse(localStorage.getItem("user") || "{}");
			setUser(updatedUser);
		};

		window.addEventListener('storage', handleStorageChange);
		// Also listen for custom event when profile is updated
		window.addEventListener('userProfileUpdated', handleStorageChange);

		return () => {
			window.removeEventListener('storage', handleStorageChange);
			window.removeEventListener('userProfileUpdated', handleStorageChange);
		};
	}, []);

	// Load dummy notifications
	React.useEffect(() => {
		const dummyNotifications = [
			{
				id: 1,
				title: 'Disposisi Baru',
				message: 'Anda mendapat disposisi baru dari Kepala Bidang',
				time: '2 jam yang lalu',
				read: false,
				type: 'disposisi'
			},
			{
				id: 2,
				title: 'Jadwal Kegiatan',
				message: 'Rapat Koordinasi Tim besok pukul 09.00 WIB',
				time: '5 jam yang lalu',
				read: false,
				type: 'kegiatan'
			},
			{
				id: 3,
				title: 'Update Sistem',
				message: 'Sistem telah diperbarui dengan fitur terbaru',
				time: '1 hari yang lalu',
				read: true,
				type: 'system'
			}
		];
		setNotifications(dummyNotifications);
		setUnreadCount(dummyNotifications.filter(n => !n.read).length);
	}, []);

	const handleNotificationClick = () => {
		setShowNotifications(!showNotifications);
		if (!showNotifications) {
			// Mark all as read
			setNotifications(prev => prev.map(n => ({ ...n, read: true })));
			setUnreadCount(0);
		}
	};

	const handleNotificationItemClick = (notification) => {
		if (notification.type === 'disposisi') {
			navigate('/pegawai/disposisi');
		} else if (notification.type === 'kegiatan') {
			navigate('/core-dashboard/kegiatan');
		}
		setShowNotifications(false);
	};

	// Initialize push notifications for pegawai
	React.useEffect(() => {
		const initPushNotifications = async () => {
			if (token && user.role === 'pegawai') {
				const permission = Notification.permission;
				
				if (permission === 'granted') {
					console.log('[Pegawai] Initializing push notifications...');
					try {
						const subscription = await subscribeToPushNotifications();
						if (subscription) {
							console.log('✅ [Pegawai] Push notification subscription successful');
						}
					} catch (err) {
						console.warn('[Pegawai] Push notification subscription failed:', err);
					}
				}
			}
		};

		initPushNotifications();
	}, [token, user.role]);

	if (!token || !user.role || user.role !== "pegawai") {
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
		{ path: "/core-dashboard/dashboard", label: "Core Dashboard", icon: FiBarChart2 },
		{ path: "/core-dashboard/kegiatan", label: "Jadwal Kegiatan", icon: FiCalendar },
		{ path: "/pegawai/disposisi", label: "Disposisi", icon: FiMail },
		{ path: "/pegawai/menu", label: "Menu", icon: FiMenu, action: () => setShowMenu(true) },
	];

	return (
		<div className="min-h-screen bg-gray-50 pb-20">
			{/* Fixed Header - Orange Theme */}
			<header className="fixed top-0 left-0 right-0 bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg z-40">
				<div className="max-w-lg mx-auto px-4 py-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							{user.avatar ? (
								<img 
									src={`${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://127.0.0.1:3001'}${user.avatar}`}
									alt={user.name}
									className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-md"
									onError={(e) => {
										e.target.style.display = 'none';
										e.target.nextElementSibling.style.display = 'flex';
									}}
								/>
							) : null}
							<div className={`h-10 w-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white shadow-md ${user.avatar ? 'hidden' : ''}`}>
								<span className="text-white font-bold text-lg">
									{user.name?.charAt(0) || "P"}
								</span>
							</div>
							<div>
								<h2 className="font-bold text-sm leading-tight">{user.name || "Pegawai"}</h2>
								<p className="text-xs text-orange-100 capitalize">{user.role?.replace(/_/g, ' ')}</p>
							</div>
						</div>
						
						{/* Notification Bell */}
						<button
							onClick={handleNotificationClick}
							className="relative p-2 hover:bg-white/10 rounded-full transition-colors"
						>
							<FiBell className="h-6 w-6" />
							{unreadCount > 0 && (
								<span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
									{unreadCount}
								</span>
							)}
						</button>
					</div>
				</div>
			</header>

			{/* Notification Panel */}
			{showNotifications && (
				<>
					<div 
						className="fixed inset-0 bg-black bg-opacity-50 z-40 animate-fadeIn"
						onClick={() => setShowNotifications(false)}
					></div>
					<div className="fixed top-16 left-0 right-0 bg-white shadow-xl z-50 animate-slideDown max-h-96 overflow-y-auto">
						<div className="max-w-lg mx-auto">
							<div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100">
								<h3 className="font-bold text-gray-800 flex items-center gap-2">
									<FiBell className="text-orange-600" />
									Notifikasi
								</h3>
							</div>
							<div className="divide-y divide-gray-100">
								{notifications.length === 0 ? (
									<div className="px-4 py-8 text-center text-gray-500">
										<FiBell className="h-12 w-12 mx-auto mb-2 text-gray-300" />
										<p>Tidak ada notifikasi</p>
									</div>
								) : (
									notifications.map((notification) => (
										<button
											key={notification.id}
											onClick={() => handleNotificationItemClick(notification)}
											className={`w-full px-4 py-3 text-left hover:bg-orange-50 transition-colors ${
												!notification.read ? 'bg-orange-50/50' : ''
											}`}
										>
											<div className="flex items-start gap-3">
												<div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
													notification.type === 'disposisi' ? 'bg-orange-100' : 'bg-blue-100'
												}`}>
													{notification.type === 'disposisi' ? (
														<FiMail className="h-5 w-5 text-orange-600" />
													) : (
														<FiCalendar className="h-5 w-5 text-blue-600" />
													)}
												</div>
												<div className="flex-1 min-w-0">
													<h4 className="font-semibold text-gray-800 text-sm">{notification.title}</h4>
													<p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{notification.message}</p>
													<span className="text-xs text-gray-400 mt-1 inline-block">{notification.time}</span>
												</div>
												{!notification.read && (
													<div className="h-2 w-2 bg-orange-500 rounded-full flex-shrink-0 mt-2"></div>
												)}
											</div>
										</button>
									))
								)}
							</div>
						</div>
					</div>
				</>
			)}

			{/* Main Content */}
			<main className="min-h-screen pt-16">
				<Outlet />
			</main>

			{/* Bottom Navigation - Orange Theme */}
			<nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-orange-200 shadow-lg z-50">
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
											? "text-orange-700" 
											: "text-orange-400 hover:text-orange-600"
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
							<div className="px-6 py-4 border-b border-orange-100">
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
								<div className={`h-14 w-14 bg-gradient-to-br from-orange-600 to-orange-800 rounded-full flex items-center justify-center shadow-md ${user.avatar ? 'hidden' : ''}`}>
										<span className="text-white font-bold text-xl">
											{user.name?.charAt(0) || "P"}
										</span>
									</div>
									<div className="flex-1">
										<h3 className="font-bold text-gray-800 text-lg">{user.name || "Pegawai"}</h3>
										<p className="text-sm text-gray-500">{user.email}</p>
										<span className="inline-block mt-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium capitalize">
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
										navigate("/core-dashboard/dashboard");
									}}
									className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-orange-50 transition-colors text-left"
								>
									<div className="h-12 w-12 bg-orange-100 rounded-xl flex items-center justify-center">
										<FiBarChart2 className="h-6 w-6 text-orange-600" />
									</div>
									<div>
										<h4 className="font-semibold text-gray-800">Core Dashboard</h4>
										<p className="text-sm text-gray-500">Dashboard utama analisis</p>
									</div>
								</button>

								<button
									onClick={() => {
										setShowMenu(false);
										navigate("/core-dashboard/kegiatan");
									}}
									className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-orange-50 transition-colors text-left"
								>
									<div className="h-12 w-12 bg-orange-100 rounded-xl flex items-center justify-center">
										<FiCalendar className="h-6 w-6 text-orange-600" />
									</div>
									<div>
										<h4 className="font-semibold text-gray-800">Jadwal Kegiatan</h4>
										<p className="text-sm text-gray-500">Lihat jadwal kegiatan</p>
									</div>
								</button>

								<button
									onClick={() => {
										setShowMenu(false);
										navigate("/pegawai/disposisi");
									}}
									className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-orange-50 transition-colors text-left"
								>
									<div className="h-12 w-12 bg-orange-100 rounded-xl flex items-center justify-center">
										<FiMail className="h-6 w-6 text-orange-600" />
									</div>
									<div>
										<h4 className="font-semibold text-gray-800">Disposisi</h4>
										<p className="text-sm text-gray-500">Kelola disposisi surat</p>
									</div>
								</button>

								<div className="border-t border-gray-200 my-2"></div>

								<button 
									onClick={() => {
										setShowMenu(false);
										navigate("/pegawai/profile");
									}}
									className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-orange-50 transition-colors text-left"
								>
									<div className="h-12 w-12 bg-orange-100 rounded-xl flex items-center justify-center">
										<FiUser className="h-6 w-6 text-orange-600" />
									</div>
									<div>
										<h4 className="font-semibold text-gray-800">Profil Saya</h4>
										<p className="text-sm text-gray-500">Lihat dan edit profil</p>
									</div>
								</button>

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

export default PegawaiLayout;
