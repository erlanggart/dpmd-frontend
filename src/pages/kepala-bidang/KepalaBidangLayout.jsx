// src/pages/kepala-bidang/KepalaBidangLayout.jsx
import React from "react";
import { Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import { FiHome, FiMail, FiBarChart2, FiMenu, FiLogOut, FiUser, FiBell, FiCalendar, FiFileText, FiDollarSign, FiUsers, FiBriefcase } from "react-icons/fi";
import { Landmark } from "lucide-react";
import { useConfirm } from "../../hooks/useConfirm.jsx";
import { subscribeToPushNotifications } from "../../utils/pushNotifications";
import { toast } from 'react-hot-toast';
import api from "../../api";
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

	// Helper function to get bidang display name based on bidang_id
	const getBidangDisplayName = (user) => {
		const bidangMap = {
			2: 'Kepala Sub Bagian Sekretariat',
			3: 'Kepala Bidang SPKED',
			4: 'Kepala Bidang Kekayaan dan Keuangan Desa',
			5: 'Kepala Bidang Pemberdayaan Masyarakat Desa',
			6: 'Kepala Bidang Pemerintahan Desa'
		};
		return bidangMap[user.bidang_id] || 'Kepala Bidang';
	};

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

	const isKepalaBidang = user.role === 'kepala_bidang';

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

	// Listen for push notifications from Service Worker
	React.useEffect(() => {
		if (!('serviceWorker' in navigator)) return;

		const handlePushMessage = (event) => {
			if (event.data && event.data.type === 'PUSH_NOTIFICATION_RECEIVED') {
				const { payload } = event.data;
				console.log('🔔 [KepalaBidang] Received push notification:', payload);
				
				// Show toast notification
				toast.success(
					<div className="flex items-start space-x-3">
						<div className="flex-shrink-0 mt-1">
							<div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
								<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
								</svg>
							</div>
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-sm font-semibold text-gray-900">
								{payload.title || 'Notifikasi Baru'}
							</p>
							<p className="text-sm text-gray-600 mt-1 line-clamp-2">
								{payload.body || payload.message || 'Anda memiliki notifikasi baru'}
							</p>
						</div>
					</div>,
					{
						duration: 5000,
						position: 'top-right',
						style: {
							maxWidth: '400px',
							padding: '16px',
							background: 'white',
							boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
							borderRadius: '12px',
						},
					}
				);

				// Update unread count badge
				setUnreadCount(prev => prev + 1);

				// Add to notifications list
				const newNotification = {
					id: Date.now(),
					title: payload.title || 'Notifikasi Baru',
					message: payload.body || payload.message || 'Anda memiliki notifikasi baru',
					timestamp: new Date().toISOString(),
					read: false,
					data: payload.data
				};
				setNotifications(prev => [newNotification, ...prev]);
			}
		};

		navigator.serviceWorker.addEventListener('message', handlePushMessage);

		return () => {
			navigator.serviceWorker.removeEventListener('message', handlePushMessage);
		};
	}, []);

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
		{ path: "/kepala-bidang/jadwal-kegiatan", label: "Kegiatan", icon: FiCalendar },
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

			{/* Bottom Navigation - Blue Theme for Kepala Bidang */}
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
										<span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
											{getBidangDisplayName(user)}
										</span>
									</div>
								</div>
							</div>

							{/* Menu Items */}
							<div className="px-6 py-4 space-y-2 max-h-96 overflow-y-auto">
								<button
									onClick={() => {
										setShowMenu(false);
										navigate("/kepala-bidang/profile");
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

								{/* Bidang Navigation - Only show if user has bidang_id */}
								{user.bidang_id && (() => {
									const bidangRoutes = {
										2: { name: 'Sekretariat', path: '/bidang/sekretariat', icon: FiFileText },
										3: { name: 'SPKED', path: '/bidang/spked', icon: Landmark },
										4: { name: 'KKD', path: '/bidang/kkd', icon: FiDollarSign },
										5: { name: 'PMD', path: '/bidang/pmd', icon: FiUsers },
										6: { name: 'Pemdes', path: '/bidang/pemdes', icon: FiBriefcase }
									};

									const bidangNav = bidangRoutes[user.bidang_id];

									return bidangNav ? (
										<button
											onClick={() => {
												setShowMenu(false);
												navigate(bidangNav.path);
											}}
											className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-blue-50 transition-colors text-left"
										>
											<div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
												<bidangNav.icon className="h-6 w-6 text-white" />
											</div>
											<div>
												<h4 className="font-semibold text-gray-800">Bidang {bidangNav.name}</h4>
												<p className="text-sm text-gray-500">Kelola data bidang</p>
											</div>
										</button>
									) : null;
								})()}

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
			{confirmDialog}
		</div>
	);
};

export default KepalaBidangLayout;
