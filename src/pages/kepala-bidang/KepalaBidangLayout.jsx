// src/pages/kepala-bidang/KepalaBidangLayout.jsx
import React from "react";
import { Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import { FiHome, FiMail, FiBarChart2, FiMenu, FiLogOut, FiUser, FiBell, FiCalendar } from "react-icons/fi";
import { useConfirm } from "../../hooks/useConfirm.jsx";
import { subscribeToPushNotifications } from "../../utils/pushNotifications";
import { toast } from 'react-hot-toast';
import './KepalaBidangLayout.css';

const KepalaBidangLayout = () => {
	const [showMenu, setShowMenu] = React.useState(false);
	const [showNotifications, setShowNotifications] = React.useState(false);
	const [notifications, setNotifications] = React.useState([]);
	const [unreadCount, setUnreadCount] = React.useState(0);
	const [user, setUser] = React.useState(JSON.parse(localStorage.getItem("user") || "{}"));
	const navigate = useNavigate();
	const location = useLocation();
	const { confirmDialog, showConfirm } = useConfirm();

	// Check if user is logged in and has kepala bidang role
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

	// Load notifications
	React.useEffect(() => {
		const dummyNotifications = [
			{
				id: 1,
				title: 'Disposisi Baru',
				message: 'Anda memiliki disposisi surat baru yang perlu ditinjau',
				time: '10 menit lalu',
				read: false,
				type: 'disposisi'
			},
			{
				id: 2,
				title: 'Rapat Koordinasi',
				message: 'Rapat koordinasi akan dimulai besok pukul 09.00',
				time: '3 jam lalu',
				read: true,
				type: 'kegiatan'
			}
		];
		setNotifications(dummyNotifications);
		setUnreadCount(dummyNotifications.filter(n => !n.read).length);
	}, []);

	const handleNotificationClick = () => {
		setShowNotifications(!showNotifications);
		if (!showNotifications) {
			setNotifications(prev => prev.map(n => ({ ...n, read: true })));
			setUnreadCount(0);
		}
	};

	const handleNotificationItemClick = (notification) => {
		if (notification.type === 'disposisi') {
			navigate('/kepala-bidang/disposisi');
		} else if (notification.type === 'kegiatan') {
			navigate('/core-dashboard/kegiatan');
		}
		setShowNotifications(false);
	};

	const isKepalaBidang = user.role && [
		'kabid_sekretariat',
		'kabid_pemerintahan_desa', 
		'kabid_spked',
		'kabid_kekayaan_keuangan_desa',
		'kabid_pemberdayaan_masyarakat_desa'
	].includes(user.role);

	// Initialize push notifications for kepala_bidang
	React.useEffect(() => {
		const initPushNotifications = async () => {
			if (token && isKepalaBidang) {
				const permission = Notification.permission;
				
				if (permission === 'granted') {
					console.log('[KepalaBidang] Initializing push notifications...');
					try {
						const subscription = await subscribeToPushNotifications();
						if (subscription) {
							console.log('✅ [KepalaBidang] Push notification subscription successful');
						}
					} catch (err) {
						console.warn('[KepalaBidang] Push notification subscription failed:', err);
					}
				}
			}
		};

		initPushNotifications();
	}, [token, isKepalaBidang]);

	if (!token || !isKepalaBidang) {
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
		{ path: "/kepala-bidang/dashboard", label: "Dashboard", icon: FiHome },
		{ path: "/core-dashboard/dashboard", label: "Statistik", icon: FiBarChart2 },
		{ path: "/core-dashboard/kegiatan", label: "Kegiatan", icon: FiCalendar },
		{ path: "/kepala-bidang/disposisi", label: "Disposisi", icon: FiMail },
		{ path: "/kepala-bidang/menu", label: "Menu", icon: FiMenu, action: () => setShowMenu(true) },
	];

	return (
		<div className="min-h-screen bg-gray-50 pb-20">
			{/* Notification Panel */}
			{showNotifications && (
				<>
					<div 
						className="fixed inset-0 bg-black bg-opacity-50 z-40 animate-fadeIn"
						onClick={() => setShowNotifications(false)}
					></div>
					<div className="fixed top-16 left-0 right-0 bg-white shadow-xl z-50 animate-slideDown max-h-96 overflow-y-auto">
						<div className="max-w-lg mx-auto">
							<div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-green-50 to-green-100">
								<h3 className="font-bold text-gray-800 flex items-center gap-2">
									<FiBell className="text-green-600" />
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
											className={`w-full px-4 py-3 text-left hover:bg-green-50 transition-colors ${
												!notification.read ? 'bg-green-50/50' : ''
											}`}
										>
											<div className="flex items-start gap-3">
												<div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
													notification.type === 'disposisi' ? 'bg-green-100' : 'bg-blue-100'
												}`}>
													{notification.type === 'disposisi' ? (
														<FiMail className="h-5 w-5 text-green-600" />
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
													<div className="h-2 w-2 bg-green-500 rounded-full flex-shrink-0 mt-2"></div>
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
			<main className="min-h-screen">
				<Outlet />
			</main>

			{/* Bottom Navigation - Green Theme for Kepala Bidang */}
			<nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-green-200 shadow-lg z-50">
				<div className="max-w-lg mx-auto px-2">
					<div className="flex items-center justify-around py-3">
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
									className={`flex items-center justify-center p-3 rounded-xl transition-all duration-200 ${
										isActive 
											? "text-green-700 bg-green-50 scale-110" 
											: "text-gray-400 hover:text-green-600 hover:bg-green-50"
									}`}
								>
									<Icon className="h-6 w-6" />
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
								<div className={`h-14 w-14 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center shadow-md ${user.avatar ? 'hidden' : ''}`}>
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
										navigate("/core-dashboard/dashboard");
									}}
									className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-green-50 transition-colors text-left"
								>
									<div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center">
										<FiBarChart2 className="h-6 w-6 text-green-600" />
									</div>
									<div>
										<h4 className="font-semibold text-gray-800">Statistik</h4>
										<p className="text-sm text-gray-500">Dashboard utama analisis</p>
									</div>
								</button>

								<button
									onClick={() => {
										setShowMenu(false);
										navigate("/core-dashboard/kegiatan");
									}}
									className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-green-50 transition-colors text-left"
								>
									<div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center">
										<FiCalendar className="h-6 w-6 text-green-600" />
									</div>
									<div>
										<h4 className="font-semibold text-gray-800">Kegiatan</h4>
										<p className="text-sm text-gray-500">Lihat jadwal kegiatan</p>
									</div>
								</button>

								<button
									onClick={() => {
										setShowMenu(false);
										navigate("/kepala-bidang/disposisi");
									}}
									className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-green-50 transition-colors text-left"
								>
									<div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center">
										<FiMail className="h-6 w-6 text-green-600" />
									</div>
									<div>
										<h4 className="font-semibold text-gray-800">Disposisi</h4>
										<p className="text-sm text-gray-500">Kelola disposisi surat</p>
									</div>
								</button>

								<div className="border-t border-gray-200 my-2"></div>

								<button								onClick={() => {
									setShowMenu(false);
									navigate("/kepala-bidang/profile");
								}}
								className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-green-50 transition-colors text-left"
							>
								<div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center">
									<FiUser className="h-6 w-6 text-green-600" />
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
		</div>
	);
};

export default KepalaBidangLayout;
