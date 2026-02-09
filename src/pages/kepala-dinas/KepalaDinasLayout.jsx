// src/pages/kepala-dinas/KepalaDinasLayout.jsx
import React from "react";
import { Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import { FiHome, FiMail, FiBarChart2, FiMenu, FiLogOut, FiTrendingUp, FiUser, FiBell, FiCalendar } from "react-icons/fi";
import { performFullLogout } from "../../utils/sessionPersistence";
import { useConfirm } from "../../hooks/useConfirm.jsx";
import { subscribeToPushNotifications } from "../../utils/pushNotifications";
import { toast } from 'react-hot-toast';
import api from "../../api";

const KepalaDinasLayout = () => {
	const [showMenu, setShowMenu] = React.useState(false);
	const [showNotifications, setShowNotifications] = React.useState(false);
	const [notifications, setNotifications] = React.useState([]);
	const [unreadCount, setUnreadCount] = React.useState(0);
	const [user, setUser] = React.useState(JSON.parse(localStorage.getItem("user") || "{}"));
	const navigate = useNavigate();
	const location = useLocation();
	const { confirmDialog, showConfirm } = useConfirm();

	// Check if user is logged in and has kepala_dinas role
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

	// Load notifications from backend
	React.useEffect(() => {
		const fetchNotifications = async () => {
			try {
				const response = await api.get('/push-notification/notifications?limit=10');
				if (response.data.success) {
					setNotifications(response.data.data || []);
					setUnreadCount(response.data.unreadCount || 0);
				}
			} catch (error) {
				console.error('Error fetching notifications:', error);
				setNotifications([]);
				setUnreadCount(0);
			}
		};

		fetchNotifications();
		
		// Refresh notifications every 30 seconds
		const interval = setInterval(fetchNotifications, 30000);
		
		return () => clearInterval(interval);
	}, []);

	const handleNotificationClick = () => {
		setShowNotifications(!showNotifications);
		// Mark all as read when opened
		if (!showNotifications) {
			setNotifications(prev => prev.map(n => ({ ...n, read: true })));
			setUnreadCount(0);
		}
	};

	const handleNotificationItemClick = (notification) => {
		// Navigate based on notification type
		if (notification.type === 'disposisi') {
			navigate('/kepala-dinas/disposisi');
		} else if (notification.type === 'kegiatan') {
			navigate('/core-dashboard/kegiatan');
		}
		setShowNotifications(false);
	};

	// Initialize push notifications for kepala_dinas
	React.useEffect(() => {
		const initPushNotifications = async () => {
			if (token && user.role === 'kepala_dinas') {
				const permission = Notification.permission;
				
				if (permission === 'granted') {
					console.log('[KepalaDinas] Initializing push notifications...');
					try {
						const subscription = await subscribeToPushNotifications();
						if (subscription) {
							console.log('✅ [KepalaDinas] Push notification subscription successful');
						}
					} catch (err) {
						console.warn('[KepalaDinas] Push notification subscription failed:', err);
					}
				} else {
					console.log('[KepalaDinas] Notification permission not granted:', permission);
				}
			}
		};

		initPushNotifications();
	}, [token, user.role]);

	// Listen for push notifications from Service Worker
	React.useEffect(() => {
		const handlePushMessage = (event) => {
			console.log('[KepalaDinas] 🔔 Push message received from SW:', event.data);
			
			if (event.data && event.data.type === 'PUSH_NOTIFICATION_RECEIVED') {
				const { payload } = event.data;
				console.log('[KepalaDinas] Notification payload:', payload);
				
				// Show toast notification (pop-up on screen)
				const title = payload.title || 'Notifikasi Baru';
				const body = payload.body || 'Anda memiliki notifikasi baru';
				
				toast.success(
					<div className="flex flex-col gap-1">
						<div className="font-bold text-sm">{title}</div>
						<div className="text-xs text-gray-700">{body}</div>
					</div>,
					{
						duration: 5000,
						position: 'top-right',
						icon: '🔔',
						style: {
							background: '#10b981',
							color: '#fff',
							minWidth: '300px'
						}
					}
				);

				// Update notification badge (optional)
				setUnreadCount(prev => prev + 1);
				
				// Add to notifications list
				const newNotification = {
					id: Date.now(),
					title: title,
					message: body,
					time: 'Baru saja',
					read: false,
					type: payload.type || 'disposisi'
				};
				setNotifications(prev => [newNotification, ...prev]);
			}
		};

		// Add message listener
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.addEventListener('message', handlePushMessage);
			console.log('[KepalaDinas] ✅ Push notification listener attached');
		}

		return () => {
			if ('serviceWorker' in navigator) {
				navigator.serviceWorker.removeEventListener('message', handlePushMessage);
			}
		};
	}, []);

	if (!token || !user.role || user.role !== "kepala_dinas") {
		return <Navigate to="/" replace />;
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
			await performFullLogout();
			window.location.href = "/";
		}
	};

	const bottomNavItems = [
		{ path: "/kepala-dinas/dashboard", label: "Dashboard", icon: FiHome },
		{ path: "/core-dashboard/dashboard", label: "Statistik", icon: FiBarChart2 },
		{ path: "/kepala-dinas/jadwal-kegiatan", label: "Kegiatan", icon: FiCalendar },
		{ path: "/kepala-dinas/disposisi", label: "Disposisi", icon: FiMail },
		{ path: "/kepala-dinas/menu", label: "Menu", icon: FiMenu, action: () => setShowMenu(true) },
	];

	return (
		<div className="min-h-screen bg-gray-50 pb-20">
			{/* Main Content */}
			<main className="min-h-screen">
				<Outlet />
			</main>

			{/* Bottom Navigation - Blue Theme for Kepala Dinas */}
			<nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-blue-200 shadow-lg z-50">
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
											? "text-blue-700 bg-blue-50 scale-110" 
											: "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
									}`}
								>
									<Icon className="h-6 w-6" />
								</button>
							);
						})}
					</div>
				</div>
			</nav>

			{/* Notification Panel - Slide from top */}
			{showNotifications && (
				<>
					<div 
						className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-fadeIn"
						onClick={() => setShowNotifications(false)}
					></div>
					<div className="fixed top-16 left-0 right-0 bg-white rounded-b-3xl shadow-2xl z-50 animate-slideDown max-h-96 overflow-hidden">
						<div className="max-w-lg mx-auto">
							{/* Notification Header */}
							<div className="px-6 py-4 border-b border-gray-200">
								<h3 className="font-bold text-gray-800 text-lg">Notifikasi</h3>
							</div>

							{/* Notification List */}
							<div className="overflow-y-auto max-h-80">
								{notifications.length > 0 ? (
									notifications.map((notification) => (
										<button
											key={notification.id}
											onClick={() => handleNotificationItemClick(notification)}
											className={`w-full flex gap-3 p-4 border-b border-gray-100 hover:bg-blue-50 transition-colors text-left ${
												!notification.read ? 'bg-blue-50/50' : ''
											}`}
										>
											<div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
												notification.type === 'disposisi' ? 'bg-blue-100' :
												notification.type === 'laporan' ? 'bg-green-100' :
												'bg-purple-100'
											}`}>
												{notification.type === 'disposisi' ? <FiMail className="h-5 w-5 text-blue-600" /> :
												 notification.type === 'laporan' ? <FiBarChart2 className="h-5 w-5 text-green-600" /> :
												 <FiCalendar className="h-5 w-5 text-purple-600" />}
											</div>
											<div className="flex-1 min-w-0">
												<div className="flex items-start justify-between gap-2">
													<h4 className={`font-semibold text-sm ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
														{notification.title}
													</h4>
													{!notification.read && (
														<span className="h-2 w-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></span>
													)}
												</div>
												<p className="text-sm text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
												<p className="text-xs text-gray-400 mt-1">{notification.time}</p>
											</div>
										</button>
									))
								) : (
									<div className="flex flex-col items-center justify-center py-12 text-gray-400">
										<FiBell className="h-12 w-12 mb-2" />
										<p className="text-sm">Tidak ada notifikasi</p>
									</div>
								)}
							</div>

							{/* Close Button */}
							<div className="px-6 py-3 border-t border-gray-200">
								<button
									onClick={() => setShowNotifications(false)}
									className="w-full py-2 text-gray-600 font-medium hover:text-gray-800 transition-colors text-sm"
								>
									Tutup
								</button>
							</div>
						</div>
					</div>
				</>
			)}

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
									</div>
									<div className="flex-1">
										<h3 className="font-bold text-gray-800 text-lg">{user.name || "Kepala Dinas"}</h3>
										<p className="text-sm text-gray-500">{user.email}</p>
										<span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
											Kepala Dinas
										</span>
									</div>
								</div>
							</div>

							{/* Menu Items */}
							<div className="px-6 py-4 space-y-2 max-h-96 overflow-y-auto">
								<button
									onClick={() => {
										setShowMenu(false);
										navigate("/kepala-dinas/profile");
									}}
									className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-blue-50 transition-colors text-left"
								>
									<div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
										<FiUser className="h-6 w-6 text-blue-600" />
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
				@keyframes slideDown {
					from { transform: translateY(-100%); opacity: 0; }
					to { transform: translateY(0); opacity: 1; }
				}
				.animate-fadeIn {
					animation: fadeIn 0.3s ease-out;
				}
				.animate-slideUp {
					animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
				}
				.animate-slideDown {
					animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
				}
			`}</style>
		</div>
	);
};

export default KepalaDinasLayout;
