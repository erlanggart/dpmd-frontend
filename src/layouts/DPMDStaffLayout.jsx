// src/layouts/DPMDStaffLayout.jsx
// Unified layout for all internal DPMD staff roles
// Supports both mobile (bottom nav) and desktop (sidebar) modes
import React from "react";
import { Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
	FiHome, FiUser, FiLogOut, FiMenu, FiMail, FiBell, 
	FiCalendar, FiBarChart2, FiFileText, FiDollarSign, 
	FiUsers, FiBriefcase, FiChevronLeft, FiChevronRight,
	FiSettings, FiX
} from "react-icons/fi";
import { Landmark } from "lucide-react";
import { performFullLogout } from "../utils/sessionPersistence";
import { useConfirm } from "../hooks/useConfirm.jsx";
import { subscribeToPushNotifications } from "../utils/pushNotifications";
import toast from 'react-hot-toast';
import api from "../api";

// ============================================
// RESPONSIVE HOOK
// ============================================
const useResponsive = () => {
	const [isDesktop, setIsDesktop] = React.useState(window.innerWidth >= 1024);
	const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(true);

	React.useEffect(() => {
		const handleResize = () => {
			setIsDesktop(window.innerWidth >= 1024);
		};

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	return { isDesktop, isSidebarCollapsed, setIsSidebarCollapsed };
};

// ============================================
// ROLE CONFIGURATION
// ============================================
const ROLE_CONFIG = {
	pegawai: {
		theme: {
			primary: 'orange',
			borderColor: 'border-orange-200',
			activeText: 'text-orange-700',
			activeBg: 'bg-orange-50',
			hoverText: 'hover:text-orange-600',
			hoverBg: 'hover:bg-orange-50',
			gradientFrom: 'from-orange-600',
			gradientTo: 'to-orange-800',
			badgeBg: 'bg-orange-100',
			badgeText: 'text-orange-700',
			menuBorder: 'border-orange-100',
		},
		basePath: '/dpmd',
		displayName: 'Pegawai',
		allowedRoles: ['pegawai', 'kepala_bidang', 'ketua_tim', 'kepala_dinas', 'superadmin', 'sekretaris_dinas'],
		showBidangNav: true,
	},
	kepala_bidang: {
		theme: {
			primary: 'blue',
			borderColor: 'border-blue-200',
			activeText: 'text-blue-700',
			activeBg: 'bg-blue-50',
			hoverText: 'hover:text-blue-600',
			hoverBg: 'hover:bg-blue-50',
			gradientFrom: 'from-blue-600',
			gradientTo: 'to-blue-800',
			badgeBg: 'bg-blue-100',
			badgeText: 'text-blue-700',
			menuBorder: 'border-blue-100',
		},
		basePath: '/dpmd',
		displayName: (user) => {
			const bidangMap = {
				2: 'Kepala Sub Bagian Sekretariat',
				3: 'Kepala Bidang SPKED',
				4: 'Kepala Bidang Kekayaan dan Keuangan Desa',
				5: 'Kepala Bidang Pemberdayaan Masyarakat Desa',
				6: 'Kepala Bidang Pemerintahan Desa'
			};
			return bidangMap[user.bidang_id] || 'Kepala Bidang';
		},
		shortDisplayName: (user) => {
			const bidangMap = {
				2: 'Kasubag Sekretariat',
				3: 'Kabid SPKED',
				4: 'Kabid KKD',
				5: 'Kabid PMD',
				6: 'Kabid Pemdes'
			};
			return bidangMap[user.bidang_id] || 'Kepala Bidang';
		},
		allowedRoles: ['kepala_bidang'],
		showBidangNav: true,
	},
	kepala_dinas: {
		theme: {
			primary: 'blue',
			borderColor: 'border-blue-200',
			activeText: 'text-blue-700',
			activeBg: 'bg-blue-50',
			hoverText: 'hover:text-blue-600',
			hoverBg: 'hover:bg-blue-50',
			gradientFrom: 'from-blue-600',
			gradientTo: 'to-blue-800',
			badgeBg: 'bg-blue-100',
			badgeText: 'text-blue-700',
			menuBorder: 'border-blue-100',
		},
		basePath: '/dpmd',
		displayName: 'Kepala Dinas',
		shortDisplayName: 'Kadis DPMD',
		allowedRoles: ['kepala_dinas'],
		showBidangNav: false,
	},
	ketua_tim: {
		theme: {
			primary: 'teal',
			borderColor: 'border-teal-200',
			activeText: 'text-teal-700',
			activeBg: 'bg-teal-50',
			hoverText: 'hover:text-teal-600',
			hoverBg: 'hover:bg-teal-50',
			gradientFrom: 'from-teal-600',
			gradientTo: 'to-teal-800',
			badgeBg: 'bg-teal-100',
			badgeText: 'text-teal-700',
			menuBorder: 'border-teal-100',
		},
		basePath: '/dpmd',
		displayName: 'Ketua Tim',
		allowedRoles: ['ketua_tim'],
		showBidangNav: true,
	},
	sekretaris_dinas: {
		theme: {
			primary: 'purple',
			borderColor: 'border-purple-200',
			activeText: 'text-purple-700',
			activeBg: 'bg-purple-50',
			hoverText: 'hover:text-purple-600',
			hoverBg: 'hover:bg-purple-50',
			gradientFrom: 'from-purple-600',
			gradientTo: 'to-purple-800',
			badgeBg: 'bg-purple-100',
			badgeText: 'text-purple-700',
			menuBorder: 'border-purple-100',
		},
		basePath: '/dpmd',
		displayName: 'Sekretaris Dinas',
		shortDisplayName: 'Sekdis DPMD',
		allowedRoles: ['sekretaris_dinas'],
		showBidangNav: false,
	},
};

// Bidang routes configuration
const BIDANG_ROUTES = {
	2: { name: 'Sekretariat', path: '/bidang/sekretariat', icon: FiFileText },
	3: { name: 'SPKED', path: '/bidang/spked', icon: Landmark },
	4: { name: 'KKD', path: '/bidang/kkd', icon: FiDollarSign },
	5: { name: 'PMD', path: '/bidang/pmd', icon: FiUsers },
	6: { name: 'Pemdes', path: '/bidang/pemdes', icon: FiBriefcase }
};

// ============================================
// MAIN COMPONENT
// ============================================
const DPMDStaffLayout = () => {
	const { user: authUser } = useAuth();
	const [showMenu, setShowMenu] = React.useState(false);
	const [showNotifications, setShowNotifications] = React.useState(false);
	const [notifications, setNotifications] = React.useState([]);
	const [unreadCount, setUnreadCount] = React.useState(0);
	const [user, setUser] = React.useState(JSON.parse(localStorage.getItem("user") || "{}"));
	
	// Auto-detect roleType from user's actual role
	const roleType = authUser?.role || user?.role || 'pegawai';
	const navigate = useNavigate();
	const location = useLocation();
	const { confirmDialog, showConfirm } = useConfirm();
	const { isDesktop, isSidebarCollapsed, setIsSidebarCollapsed } = useResponsive();

	const token = localStorage.getItem("expressToken");
	const config = ROLE_CONFIG[roleType] || ROLE_CONFIG.pegawai;
	const theme = config.theme;

	// Get display name (can be string or function)
	const getDisplayName = () => {
		if (typeof config.displayName === 'function') {
			return config.displayName(user);
		}
		return config.displayName;
	};

	// Get short display name for badges
	const getShortDisplayName = () => {
		if (typeof config.shortDisplayName === 'function') {
			return config.shortDisplayName(user);
		}
		return config.shortDisplayName || getDisplayName();
	};

	// Update user data when localStorage changes
	React.useEffect(() => {
		const handleStorageChange = () => {
			const updatedUser = JSON.parse(localStorage.getItem("user") || "{}");
			setUser(updatedUser);
		};

		window.addEventListener('storage', handleStorageChange);
		window.addEventListener('userProfileUpdated', handleStorageChange);

		return () => {
			window.removeEventListener('storage', handleStorageChange);
			window.removeEventListener('userProfileUpdated', handleStorageChange);
		};
	}, []);

	// Load notifications from backend
	const fetchNotifications = React.useCallback(async () => {
		try {
			const response = await api.get('/push-notification/notifications?limit=20');
			if (response.data.success) {
				setNotifications(response.data.data || []);
				setUnreadCount(response.data.unreadCount || 0);
			}
		} catch (error) {
			console.error('Error fetching notifications:', error);
			setNotifications([]);
			setUnreadCount(0);
		}
	}, []);

	React.useEffect(() => {
		fetchNotifications();
		const interval = setInterval(fetchNotifications, 30000);
		
		const handleNewNotification = () => fetchNotifications();
		window.addEventListener('newNotification', handleNewNotification);
		
		return () => {
			clearInterval(interval);
			window.removeEventListener('newNotification', handleNewNotification);
		};
	}, [fetchNotifications]);

	// Initialize push notifications
	React.useEffect(() => {
		const initPushNotifications = async () => {
			if (token && config.allowedRoles.includes(user.role)) {
				const permission = Notification.permission;
				if (permission === 'granted') {
					try {
						await subscribeToPushNotifications();
					} catch (err) {
						console.warn(`[${roleType}] Push notification subscription failed:`, err);
					}
				}
			}
		};
		initPushNotifications();
	}, [token, user.role, roleType, config.allowedRoles]);

	// Listen for push notifications from Service Worker
	React.useEffect(() => {
		if (!('serviceWorker' in navigator)) return;

		const handlePushMessage = (event) => {
			if (event.data && event.data.type === 'PUSH_NOTIFICATION_RECEIVED') {
				const { payload } = event.data;
				
				toast.success(
					<div className="flex items-start space-x-3">
						<div className="flex-shrink-0 mt-1">
							<div className={`w-10 h-10 bg-gradient-to-br ${theme.gradientFrom} ${theme.gradientTo} rounded-lg flex items-center justify-center`}>
								<FiBell className="w-6 h-6 text-white" />
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

				setUnreadCount(prev => prev + 1);
				setNotifications(prev => [{
					id: Date.now(),
					title: payload.title || 'Notifikasi Baru',
					message: payload.body || payload.message || 'Anda memiliki notifikasi baru',
					timestamp: new Date().toISOString(),
					read: false,
					data: payload.data
				}, ...prev]);
			}
		};

		navigator.serviceWorker.addEventListener('message', handlePushMessage);
		return () => navigator.serviceWorker.removeEventListener('message', handlePushMessage);
	}, [theme]);

	// Check authorization
	if (!token || !user.role || !config.allowedRoles.includes(user.role)) {
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

	const handleNotificationClick = async () => {
		setShowNotifications(!showNotifications);
		if (!showNotifications && unreadCount > 0) {
			// Mark all notifications as read via API
			try {
				await api.post('/push-notification/notifications/mark-read', { all: true });
				setNotifications(prev => prev.map(n => ({ ...n, read: true })));
				setUnreadCount(0);
			} catch (error) {
				console.error('Error marking notifications as read:', error);
			}
		}
	};

	const handleNotificationItemClick = async (notification) => {
		// Mark this notification as read via API
		if (!notification.read) {
			try {
				await api.post('/push-notification/notifications/mark-read', { ids: [notification.id] });
				setNotifications(prev => prev.map(n => 
					n.id === notification.id ? { ...n, read: true } : n
				));
				setUnreadCount(prev => Math.max(0, prev - 1));
			} catch (error) {
				console.error('Error marking notification as read:', error);
			}
		}
		
		// Navigate based on notification type/data
		if (notification.data?.url) {
			navigate(notification.data.url);
		} else if (notification.type === 'disposisi') {
			navigate(`${config.basePath}/disposisi`);
		} else if (notification.type === 'kegiatan') {
			navigate('/core-dashboard/kegiatan');
		}
		setShowNotifications(false);
	};

	// Navigation items
	const navItems = [
		{ path: "/dpmd/dashboard", label: "Dashboard", icon: FiHome },
		{ path: "/core-dashboard/dashboard", label: "Statistik", icon: FiBarChart2 },
		{ path: "/dpmd/jadwal-kegiatan", label: "Kegiatan", icon: FiCalendar },
		{ path: "/dpmd/perjadin", label: "Perjadin", icon: FiBriefcase },
		{ path: "/dpmd/disposisi", label: "Disposisi", icon: FiMail },
	];

	// Mobile bottom nav includes menu button
	const bottomNavItems = [
		...navItems,
		{ path: `${config.basePath}/menu`, label: "Menu", icon: FiMenu, action: () => setShowMenu(true) },
	];

	// Sidebar nav items (includes profile and bidang)
	const getSidebarNavItems = () => {
		const items = [...navItems];
		
		// Add bidang navigation if applicable
		if (config.showBidangNav && user.bidang_id) {
			const bidangNav = BIDANG_ROUTES[user.bidang_id];
			if (bidangNav) {
				items.push({
					path: bidangNav.path,
					label: `Bidang ${bidangNav.name}`,
					icon: bidangNav.icon,
				});
			}
		}
		
		// Add profile
		items.push({
			path: `${config.basePath}/profile`,
			label: "Profil Saya",
			icon: FiUser,
		});
		
		return items;
	};

	// Render bidang navigation menu item
	const renderBidangNavItem = () => {
		if (!config.showBidangNav || !user.bidang_id) return null;
		
		const bidangNav = BIDANG_ROUTES[user.bidang_id];
		if (!bidangNav) return null;

		const BidangIcon = bidangNav.icon;
		
		return (
			<button
				onClick={() => {
					setShowMenu(false);
					navigate(bidangNav.path);
				}}
				className={`w-full flex items-center gap-4 p-4 rounded-xl ${theme.hoverBg} transition-colors text-left`}
			>
				<div className={`h-12 w-12 bg-gradient-to-br ${theme.gradientFrom} ${theme.gradientTo} rounded-xl flex items-center justify-center`}>
					<BidangIcon className="h-6 w-6 text-white" />
				</div>
				<div>
					<h4 className="font-semibold text-gray-800">Bidang {bidangNav.name}</h4>
					<p className="text-sm text-gray-500">Kelola data bidang</p>
				</div>
			</button>
		);
	};

	const sidebarNavItems = getSidebarNavItems();

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Desktop Sidebar */}
			{isDesktop && (
				<aside 
					className={`fixed top-0 left-0 h-full bg-white shadow-lg z-40 transition-all duration-300 ${
						isSidebarCollapsed ? 'w-20' : 'w-64'
					}`}
				>
					{/* Sidebar Header */}
					<div className={`h-16 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between px-4'} border-b ${theme.menuBorder}`}>
						{!isSidebarCollapsed && (
							<div className="flex items-center gap-2">
								<img 
									src="/logo-dpmd.png" 
									alt="DPMD Logo" 
									className="h-10 w-10 object-contain"
								/>
								<span className={`font-bold ${theme.activeText}`}>DPMD</span>
							</div>
						)}
						{isSidebarCollapsed && (
							<img 
								src="/logo-dpmd.png" 
								alt="DPMD Logo" 
								className="h-8 w-8 object-contain"
							/>
						)}
						<button
							onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
							className={`p-2 rounded-lg ${theme.hoverBg} transition-colors ${isSidebarCollapsed ? 'absolute top-4 right-2' : ''}`}
						>
							{isSidebarCollapsed ? (
								<FiChevronRight className="h-5 w-5 text-gray-600" />
							) : (
								<FiChevronLeft className="h-5 w-5 text-gray-600" />
							)}
						</button>
					</div>

					{/* Navigation Items */}
					<nav className="p-3 space-y-1">
						{sidebarNavItems.map((item, index) => {
							const isActive = location.pathname === item.path;
							const Icon = item.icon;
							
							return (
								<button
									key={index}
									onClick={() => navigate(item.path)}
									className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} p-3 rounded-xl transition-all duration-200 ${
										isActive 
											? `${theme.activeText} ${theme.activeBg}` 
											: `text-gray-600 ${theme.hoverBg} ${theme.hoverText}`
									}`}
									title={isSidebarCollapsed ? item.label : ''}
								>
									<Icon className="h-5 w-5 flex-shrink-0" />
									{!isSidebarCollapsed && (
										<span className="text-sm font-medium">{item.label}</span>
									)}
								</button>
							);
						})}

						{/* Notifications */}
						<button
							onClick={handleNotificationClick}
							className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} p-3 rounded-xl transition-all duration-200 text-gray-600 ${theme.hoverBg} ${theme.hoverText}`}
							title={isSidebarCollapsed ? 'Notifikasi' : ''}
						>
							<div className="relative">
								<FiBell className="h-5 w-5" />
								{unreadCount > 0 && (
									<span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">
										{unreadCount > 9 ? '9+' : unreadCount}
									</span>
								)}
							</div>
							{!isSidebarCollapsed && (
								<span className="text-sm font-medium">Notifikasi</span>
							)}
						</button>
					</nav>

					{/* User Profile & Logout at bottom */}
					<div className="absolute bottom-0 left-0 right-0 border-t border-gray-200">
						{/* User Profile Section */}
						<div className={`p-3 ${theme.menuBorder}`}>
							<div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
								{user.avatar ? (
									<img 
										src={`${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://127.0.0.1:3001'}${user.avatar}`}
										alt={user.name}
										className={`${isSidebarCollapsed ? 'h-10 w-10' : 'h-10 w-10'} rounded-full object-cover shadow-md`}
										onError={(e) => {
											e.target.style.display = 'none';
											e.target.nextElementSibling.style.display = 'flex';
										}}
									/>
								) : null}
								<div className={`${isSidebarCollapsed ? 'h-10 w-10' : 'h-10 w-10'} bg-gradient-to-br ${theme.gradientFrom} ${theme.gradientTo} rounded-full flex items-center justify-center shadow-md ${user.avatar ? 'hidden' : ''}`}>
									<span className="text-white font-bold text-sm">
										{user.name?.charAt(0) || "U"}
									</span>
								</div>
								{!isSidebarCollapsed && (
									<div className="flex-1 min-w-0">
										<h3 className="font-semibold text-gray-800 text-sm truncate">{user.name || getDisplayName()}</h3>
									<span className={`inline-block px-2 py-0.5 ${theme.badgeBg} ${theme.badgeText} rounded-full text-xs font-medium`}>
										{getShortDisplayName()}
										</span>
									</div>
								)}
							</div>
						</div>
						
						{/* Logout Button */}
						<div className="p-3 pt-0">
							<button
								onClick={handleLogout}
								className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} p-3 rounded-xl transition-colors hover:bg-red-50 text-red-600`}
								title={isSidebarCollapsed ? 'Keluar' : ''}
							>
								<FiLogOut className="h-5 w-5 flex-shrink-0" />
								{!isSidebarCollapsed && (
									<span className="text-sm font-medium">Keluar</span>
								)}
							</button>
						</div>
					</div>
				</aside>
			)}

			{/* Notification Panel */}
			{showNotifications && (
				<>
					<div 
						className="fixed inset-0 bg-black/50 z-40 animate-fadeIn"
						onClick={() => setShowNotifications(false)}
					></div>
					{/* Desktop: Dropdown dari sidebar */}
					{isDesktop ? (
						<div className={`fixed right-10 top-4 w-96 bg-white rounded-xl shadow-2xl z-50 animate-slideDown max-h-[32rem] overflow-hidden`}>
							<div className={`px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-${theme.primary}-50 to-${theme.primary}-100 rounded-t-xl`}>
								<h3 className="font-bold text-gray-800 flex items-center gap-2">
									<FiBell className={`text-${theme.primary}-600`} />
									Notifikasi
								</h3>
							</div>
							<div className="divide-y divide-gray-100 overflow-y-auto max-h-[28rem]">
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
											className={`w-full px-4 py-3 text-left ${theme.hoverBg} transition-colors ${
												!notification.read ? `${theme.activeBg}/50` : ''
											}`}
										>
											<div className="flex items-start gap-3">
												<div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
													notification.type === 'disposisi' ? theme.badgeBg : 'bg-blue-100'
												}`}>
													{notification.type === 'disposisi' ? (
														<FiMail className={`h-5 w-5 ${theme.badgeText}`} />
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
													<div className={`h-2 w-2 bg-${theme.primary}-500 rounded-full flex-shrink-0 mt-2`}></div>
												)}
											</div>
										</button>
									))
								)}
							</div>
						</div>
					) : (
						/* Mobile: Full width tanpa garis putih */
						<div className="fixed top-0 left-0 right-0 bg-white shadow-xl z-50 animate-slideDown max-h-[80vh] overflow-hidden">
							<div className={`px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-${theme.primary}-50 to-${theme.primary}-100`}>
								<h3 className="font-bold text-gray-800 flex items-center gap-2">
									<FiBell className={`text-${theme.primary}-600`} />
									Notifikasi
								</h3>
							</div>
							<div className="divide-y divide-gray-100 overflow-y-auto max-h-[calc(80vh-56px)]">
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
											className={`w-full px-4 py-3 text-left ${theme.hoverBg} transition-colors ${
												!notification.read ? `${theme.activeBg}/50` : ''
											}`}
										>
											<div className="flex items-start gap-3">
												<div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
													notification.type === 'disposisi' ? theme.badgeBg : 'bg-blue-100'
												}`}>
													{notification.type === 'disposisi' ? (
														<FiMail className={`h-5 w-5 ${theme.badgeText}`} />
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
													<div className={`h-2 w-2 bg-${theme.primary}-500 rounded-full flex-shrink-0 mt-2`}></div>
												)}
											</div>
										</button>
									))
								)}
							</div>
						</div>
					)}
				</>
			)}

			{/* Main Content */}
			<main 
				className={`min-h-screen transition-all duration-300 ${
					isDesktop 
						? isSidebarCollapsed ? 'ml-20' : 'ml-64'
						: 'pb-20'
				}`}
			>
				<Outlet />
			</main>

			{/* Bottom Navigation - Mobile Only */}
			{!isDesktop && (
				<nav className={`fixed bottom-0 left-0 right-0 bg-white ${theme.borderColor} border-t shadow-lg z-50`}>
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
										className={`relative flex items-center justify-center p-3 rounded-xl transition-all duration-200 ${
											isActive 
												? `${theme.activeText} ${theme.activeBg} scale-110` 
												: `text-gray-400 ${theme.hoverText} ${theme.hoverBg}`
										}`}
									>
										<Icon className="h-6 w-6" />
										{item.badge > 0 && (
											<span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
												{item.badge > 99 ? '99+' : item.badge}
											</span>
										)}
									</button>
								);
							})}
						</div>
					</div>
				</nav>
			)}

			{/* Menu Modal - Mobile Only, Slide from bottom */}
			{showMenu && !isDesktop && (
				<>
					<div 
						className="fixed inset-0 bg-black/75 z-50 animate-fadeIn"
						onClick={() => setShowMenu(false)}
					></div>
					<div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 animate-slideUp">
						<div className="max-w-lg mx-auto">
							{/* Handle Bar */}
							<div className="flex justify-center pt-3 pb-2">
								<div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
							</div>

							{/* Menu Header */}
							<div className={`px-6 py-4 border-b ${theme.menuBorder}`}>
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
									<div className={`h-14 w-14 bg-gradient-to-br ${theme.gradientFrom} ${theme.gradientTo} rounded-full flex items-center justify-center shadow-md ${user.avatar ? 'hidden' : ''}`}>
										<span className="text-white font-bold text-xl">
											{user.name?.charAt(0) || "U"}
										</span>
									</div>
									<div className="flex-1">
										<h3 className="font-bold text-gray-800 text-lg">{user.name || getDisplayName()}</h3>
										<p className="text-sm text-gray-500">{user.email}</p>
										<span className={`inline-block mt-1 px-2 py-0.5 ${theme.badgeBg} ${theme.badgeText} rounded-full text-xs font-medium`}>
											{getShortDisplayName()}
										</span>
									</div>
								</div>
							</div>

							{/* Menu Items */}
							<div className="px-6 py-4 space-y-2 max-h-96 overflow-y-auto">
								<button 
									onClick={() => {
										setShowMenu(false);
										navigate(`${config.basePath}/profile`);
									}}
									className={`w-full flex items-center gap-4 p-4 rounded-xl ${theme.hoverBg} transition-colors text-left`}
								>
									<div className={`h-12 w-12 ${theme.badgeBg} rounded-xl flex items-center justify-center`}>
										<FiUser className={`h-6 w-6 ${theme.badgeText}`} />
									</div>
									<div>
										<h4 className="font-semibold text-gray-800">Profil Saya</h4>
										<p className="text-sm text-gray-500">Lihat & edit profil</p>
									</div>
								</button>

								{/* Notifications */}
								<button 
									onClick={() => {
										setShowMenu(false);
										handleNotificationClick();
									}}
									className={`w-full flex items-center gap-4 p-4 rounded-xl ${theme.hoverBg} transition-colors text-left`}
								>
									<div className={`h-12 w-12 ${theme.badgeBg} rounded-xl flex items-center justify-center relative`}>
										<FiBell className={`h-6 w-6 ${theme.badgeText}`} />
										{unreadCount > 0 && (
											<span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
												{unreadCount > 99 ? '99+' : unreadCount}
											</span>
										)}
									</div>
									<div>
										<h4 className="font-semibold text-gray-800">Notifikasi</h4>
										<p className="text-sm text-gray-500">
											{unreadCount > 0 ? `${unreadCount} notifikasi baru` : 'Tidak ada notifikasi baru'}
										</p>
									</div>
								</button>

								{/* Bidang Navigation */}
								{renderBidangNavItem()}

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

// ============================================
// EXPORTED WRAPPER COMPONENTS
// For backward compatibility with existing routes
// ============================================
export const PegawaiLayout = () => <DPMDStaffLayout roleType="pegawai" />;
export const KepalaBidangLayout = () => <DPMDStaffLayout roleType="kepala_bidang" />;
export const KepalaDinasLayout = () => <DPMDStaffLayout roleType="kepala_dinas" />;
export const KetuaTimLayout = () => <DPMDStaffLayout roleType="ketua_tim" />;
export const SekretarisDinasLayout = () => <DPMDStaffLayout roleType="sekretaris_dinas" />;

export default DPMDStaffLayout;
