// src/layouts/DPMDStaffLayout.jsx
// Unified layout for all internal DPMD staff roles
// Supports both mobile (bottom nav) and desktop (sidebar) modes
import React from "react";
import { Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { 
	FiHome, FiUser, FiLogOut, FiMenu, FiMail, FiBell, 
	FiCalendar, FiBarChart2, FiFileText, FiDollarSign, 
	FiUsers, FiBriefcase, FiChevronRight,
	FiSettings, FiX, FiVideo, FiClock, FiGrid
} from "react-icons/fi";
import { Landmark, ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import AnimatedIcon from '../components/AnimatedIcon';
import ChatBot from '../components/chatbot/ChatBot';
import { performFullLogout } from "../utils/sessionPersistence";
import { useConfirm } from "../hooks/useConfirm.jsx";
import { subscribeToPushNotifications } from "../utils/pushNotifications";
import toast from 'react-hot-toast';
import api from "../api";
import { getAvatarUrl } from '../utils/avatarUtils';

// ============================================
// RESPONSIVE HOOK
// ============================================
const useResponsive = () => {
	const [isDesktop, setIsDesktop] = React.useState(window.innerWidth >= 1024);
	const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false); // default open

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
				3: 'Kepala Bidang SPKED',
				4: 'Kepala Bidang Kekayaan dan Keuangan Desa',
				5: 'Kepala Bidang Pemberdayaan Masyarakat Desa',
				6: 'Kepala Bidang Pemerintahan Desa'
			};
			return bidangMap[user.bidang_id] || 'Kepala Bidang';
		},
		shortDisplayName: (user) => {
			const bidangMap = {
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
		showBidangNav: true,
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
			gradientTo: 'to-teal-801',
			badgeBg: 'bg-teal-100',
			badgeText: 'text-teal-700',
			menuBorder: 'border-teal-100',
		},
		basePath: '/dpmd',
		displayName: (user) => user.sub_bidang ? `Ketua Tim ${user.sub_bidang}` : 'Ketua Tim',
		shortDisplayName: (user) => user.sub_bidang ? `Ketim ${user.sub_bidang}` : 'Ketua Tim',
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
		displayName: (user) => user.sub_bidang ? `Sekretaris Dinas - ${user.sub_bidang}` : 'Sekretaris Dinas',
		shortDisplayName: (user) => user.sub_bidang ? `Sekdis - ${user.sub_bidang}` : 'Sekdis DPMD',
		allowedRoles: ['sekretaris_dinas'],
		showBidangNav: true,
	},
};

// Bidang routes configuration
export const BIDANG_ROUTES = {
	2: { name: 'Sekretariat', path: '/bidang/sekretariat', icon: 'file', gradient: 'from-gray-500 to-slate-600', color: 'text-gray-600' },
	3: { name: 'SPKED', path: '/bidang/spked', icon: 'landmark', gradient: 'from-cyan-500 to-teal-600', color: 'text-cyan-600' },
	4: { name: 'KKD', path: '/bidang/kkd', icon: 'dollar', gradient: 'from-emerald-500 to-teal-600', color: 'text-emerald-600' },
	5: { name: 'PMD', path: '/bidang/pmd', icon: 'users', gradient: 'from-purple-500 to-indigo-600', color: 'text-purple-600' },
	6: { name: 'Pemdes', path: '/bidang/pemdes', icon: 'briefcase', gradient: 'from-amber-500 to-orange-600', color: 'text-amber-600' }
};

// Bidang submenu configuration
const BIDANG_SUBMENUS = {
	3: [],
	4: [
		{ label: 'Alokasi Dana Desa', path: '/bidang/kkd/add', icon: 'dollar' },
		{ label: 'Dana Desa', path: '/bidang/kkd/dd', icon: 'banknote' },
		{ label: 'BHPRD', path: '/bidang/kkd/bhprd', icon: 'file' },
	],
	5: [
		{ label: 'LKD', path: '/bidang/pmd/kelembagaan', icon: 'users' },
		{ label: 'Kelembagaan Lainnya', path: '/bidang/pmd/kelembagaan/lainnya', icon: 'file' },
		{ label: 'Pengurus', path: '/bidang/pmd/pengurus', icon: 'user' },
		{ label: 'Produk Hukum', path: '/bidang/pmd/produk-hukum', icon: 'file' },
	],
	6: [
		{ label: 'Aparatur Desa', path: '/bidang/pemdes/aparatur-desa', icon: 'users' },
		{ label: 'Produk Hukum', path: '/bidang/pemdes/produk-hukum', icon: 'file' },
	],
};

// ============================================
// MAIN COMPONENT
// ============================================
const DPMDStaffLayout = () => {
	const { user: authUser, isCheckingSession } = useAuth();
	const [showMenu, setShowMenu] = React.useState(false);
	const [showNotifications, setShowNotifications] = React.useState(false);
	const [notifications, setNotifications] = React.useState([]);
	const [unreadCount, setUnreadCount] = React.useState(0);
	const [hoveredItem, setHoveredItem] = React.useState(null);
	const [showQuickAction, setShowQuickAction] = React.useState(false);
	const [bidangSubmenuOpen, setBidangSubmenuOpen] = React.useState(false);
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

	// Auto-open submenu when on a bidang page
	React.useEffect(() => {
		if (user.bidang_id) {
			const bidangNav = BIDANG_ROUTES[user.bidang_id];
			if (bidangNav && location.pathname.startsWith(bidangNav.path)) {
				setBidangSubmenuOpen(true);
			}
		}
	}, [location.pathname, user.bidang_id]);

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

	// Sync user state when authUser updates (e.g., after login or token verify)
	React.useEffect(() => {
		if (authUser && authUser.status_kepegawaian && !user.status_kepegawaian) {
			setUser(prev => ({ ...prev, status_kepegawaian: authUser.status_kepegawaian }));
		}
	}, [authUser]);

	// Close quick action popup on navigation
	React.useEffect(() => {
		setShowQuickAction(false);
	}, [location.pathname]);

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

	// CRITICAL: Wait for session restore before deciding to redirect
	if (isCheckingSession) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-4 border-white/30 border-t-white mx-auto mb-4"></div>
					<p className="text-white/80 text-sm font-medium">Memuat...</p>
				</div>
			</div>
		);
	}

	// Check authorization - use authUser from context (more reliable than localStorage)
	const effectiveRole = authUser?.role || user?.role;
	if (!token || !effectiveRole || !config.allowedRoles.includes(effectiveRole)) {
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
		const notifType = notification.data?.type || '';
		if (notifType === 'today_schedule' || notifType === 'tomorrow_schedule') {
			const targetDate = notification.data?.targetDate || '';
			const dateParam = targetDate ? `?tanggal=${targetDate}` : '';
			navigate(`/dpmd/jadwal-kegiatan${dateParam}`);
		} else if (notification.data?.url) {
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
		{ path: "/dpmd/dashboard", label: "Dashboard", icon: 'dashboard', color: 'text-orange-600', gradient: 'from-orange-500 to-orange-600' },
		{ path: "/core-dashboard/dashboard", label: "Statistik", icon: 'chart', color: 'text-blue-600', gradient: 'from-blue-500 to-blue-700' },
		{ path: "/dpmd/jadwal-kegiatan", label: "Kegiatan", icon: 'calendar', color: 'text-emerald-600', gradient: 'from-emerald-500 to-teal-600' },
		{ path: "/dpmd/perjadin", label: "Perjadin", icon: 'briefcase', color: 'text-amber-600', gradient: 'from-amber-500 to-orange-600' },
		{ path: "/dpmd/disposisi", label: "Disposisi", icon: 'mail', color: 'text-purple-600', gradient: 'from-purple-500 to-indigo-600' },
		{ path: "/dpmd/video-meeting", label: "Video Meeting", icon: 'video', color: 'text-cyan-600', gradient: 'from-cyan-500 to-teal-600' },
		{ path: "/dpmd/pesan", label: "Pesan", icon: 'mail', color: 'text-indigo-600', gradient: 'from-indigo-500 to-purple-600' },
		{ path: "/dpmd/bank-surat", label: "Bank Surat", icon: 'archive', color: 'text-teal-600', gradient: 'from-teal-500 to-cyan-600' },
	];

	// Mobile bottom nav - 3 items: Home, Aksi Cepat (FAB), Profil
	const userBidang = BIDANG_ROUTES[user.bidang_id];
	const ABSENSI_ELIGIBLE_STATUS = ['PPPK Paruh Waktu', 'Tenaga Alih Daya', 'Tenaga Keamanan', 'Tenaga Kebersihan'];
	const userStatus = user.status_kepegawaian || authUser?.status_kepegawaian;
	const isAbsensiEligible = ABSENSI_ELIGIBLE_STATUS.includes(userStatus);
	const bottomNavItems = [
		{ path: "/dpmd/dashboard", label: "Home", icon: FiHome },
		{ label: "Aksi Cepat", isMain: true, isQuickAction: true },
		{ path: `${config.basePath}/profile`, label: "Profil", icon: FiUser },
	];

	// Sidebar nav items (includes profile and bidang)
	const getSidebarNavItems = () => {
		const items = [...navItems];
		
		// Add bidang navigation if applicable
		if (config.showBidangNav && user.bidang_id) {
			const bidangNav = BIDANG_ROUTES[user.bidang_id];
			if (bidangNav) {
				const submenus = BIDANG_SUBMENUS[user.bidang_id] || [];
				items.push({
					path: bidangNav.path,
					label: `Bidang ${bidangNav.name}`,
					icon: bidangNav.icon,
					gradient: bidangNav.gradient,
					color: bidangNav.color,
					submenus: submenus.length > 0 ? submenus : undefined,
				});
			}
		}
		
		// Add profile
		items.push({
			path: `${config.basePath}/profile`,
			label: "Profil Saya",
			icon: 'user',
			gradient: 'from-blue-500 to-indigo-600',
			color: 'text-blue-600'
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
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
			{/* Desktop Sidebar */}
			{isDesktop && (
				<aside 
					className={`fixed top-0 left-0 h-full bg-white shadow-2xl z-40 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] border-r border-gray-100 ${
						isSidebarCollapsed ? 'w-20' : 'w-64'
					}`}
				>
					{/* Gradient Accent Line */}
					<div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${theme.gradientFrom} ${theme.gradientTo}`}></div>

					{/* Sidebar Header */}
					<div className={`relative p-4 h-20 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-gradient-to-r from-blue-50 to-purple-50`}>
						{!isSidebarCollapsed && (
							<div className="flex items-center justify-center flex-1">
								<img 
									src="/logo-dpmd.png" 
									alt="DPMD Logo" 
									className="h-20 transition-opacity duration-300"
								/>
							</div>
						)}
						<button
							onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
							className={`p-2 bg-${theme.primary}-100 hover:bg-${theme.primary}-200 rounded-lg transition-colors duration-200 flex-shrink-0 group ${!isSidebarCollapsed ? '' : 'mx-auto'}`}
							aria-label={isSidebarCollapsed ? 'Buka Sidebar' : 'Tutup Sidebar'}
							title={isSidebarCollapsed ? 'Buka Sidebar' : 'Tutup Sidebar'}
						>
							{!isSidebarCollapsed ? (
								<PanelLeftClose className={`w-5 h-5 ${theme.activeText} group-hover:scale-110 transition-transform`} />
							) : (
								<PanelLeftOpen className={`w-5 h-5 ${theme.activeText} group-hover:scale-110 transition-transform`} />
							)}
						</button>
					</div>

					{/* Navigation Items */}
					<nav className="relative p-3 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent" style={{ height: 'calc(100vh - 320px)' }}>
						{sidebarNavItems.map((item, index) => {
							const isActive = location.pathname === item.path;
							const hasSubmenus = item.submenus && item.submenus.length > 0;
							const isSubmenuActive = hasSubmenus && item.submenus.some(sub => location.pathname.startsWith(sub.path));
							const isBidangActive = isActive || isSubmenuActive || (hasSubmenus && location.pathname.startsWith(item.path));
							
							return (
								<div key={index}>
									<div
										onMouseEnter={() => setHoveredItem(item.label)}
										onMouseLeave={() => setHoveredItem(null)}
										className={`group relative w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : ''} rounded-xl transition-all duration-200 ${
											(hasSubmenus ? isBidangActive : isActive)
												? `bg-gradient-to-r ${item.gradient || theme.gradientFrom + ' ' + theme.gradientTo} text-white shadow-md` 
												: `${item.color || theme.activeText} hover:bg-gradient-to-r ${item.gradient || theme.gradientFrom + ' ' + theme.gradientTo} hover:text-white hover:shadow-md`
										}`}
										title={isSidebarCollapsed ? item.label : ''}
									>
										<button
											onClick={() => navigate(item.path)}
											className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 flex-1 min-w-0`}
										>
											<div className={`relative ${isSidebarCollapsed ? 'mx-auto' : 'flex-shrink-0'}`}>
												<AnimatedIcon 
													type={item.icon} 
													isActive={hasSubmenus ? isBidangActive : isActive} 
													isHovered={hoveredItem === item.label}
													className="w-5 h-5"
												/>
											</div>
											{!isSidebarCollapsed && (
												<span className="relative font-semibold truncate text-sm flex-1 text-left">{item.label}</span>
											)}
										</button>
										{hasSubmenus && !isSidebarCollapsed && (
											<button
												onClick={(e) => {
													e.stopPropagation();
													setBidangSubmenuOpen(!bidangSubmenuOpen);
												}}
												className="px-2.5 py-2.5 flex-shrink-0 hover:opacity-70 transition-opacity"
												title={bidangSubmenuOpen ? 'Tutup submenu' : 'Buka submenu'}
											>
												<ChevronDown className={`w-4 h-4 transition-transform duration-200 ${bidangSubmenuOpen ? 'rotate-180' : ''}`} />
											</button>
										)}
									</div>

									{/* Submenu items */}
									{hasSubmenus && !isSidebarCollapsed && bidangSubmenuOpen && (
										<div className="mt-1 ml-3 pl-3 border-l-2 border-gray-200 space-y-0.5">
											{item.submenus.map((sub, subIndex) => {
												const exactMatch = location.pathname === sub.path;
												const prefixMatch = location.pathname.startsWith(sub.path + '/');
												// Avoid false active when a sibling submenu has a more specific path match
												const moreSpecific = prefixMatch && item.submenus.some(
													s => s !== sub && s.path.startsWith(sub.path + '/') &&
													(location.pathname === s.path || location.pathname.startsWith(s.path + '/'))
												);
												const isSubActive = exactMatch || (prefixMatch && !moreSpecific);
												return (
													<button
														key={subIndex}
														onClick={() => navigate(sub.path)}
														className={`group w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
															isSubActive
																? `${item.color || theme.activeText} ${theme.activeBg} font-semibold`
																: `text-gray-500 hover:text-gray-700 ${theme.hoverBg}`
														}`}
													>
														<AnimatedIcon 
															type={sub.icon} 
															isActive={isSubActive} 
															isHovered={false}
															className="w-4 h-4"
														/>
														<span className="truncate">{sub.label}</span>
													</button>
												);
											})}
										</div>
									)}
								</div>
							);
						})}
					</nav>

					{/* User Profile & Logout at bottom */}
					<div className="absolute bottom-0 left-0 right-0">
						{/* User Profile Card - Premium Design */}
						<div className={`${isSidebarCollapsed ? 'p-2' : 'p-3'}`}>
							<div className={`relative overflow-hidden rounded-2xl ${isSidebarCollapsed ? '' : `bg-gradient-to-br ${theme.gradientFrom} ${theme.gradientTo}`}`}>
								{/* Decorative pattern overlay */}
								{!isSidebarCollapsed && (
									<div className="absolute inset-0 opacity-10">
										<div className="absolute -right-6 -top-6 w-24 h-24 rounded-full border-[3px] border-white/40" />
										<div className="absolute -left-4 -bottom-4 w-20 h-20 rounded-full border-[3px] border-white/30" />
										<div className="absolute right-8 bottom-2 w-8 h-8 rounded-full bg-white/20" />
									</div>
								)}
								
								<div className={`relative ${isSidebarCollapsed ? 'flex flex-col items-center gap-2 py-2' : 'p-4'}`}>
									{/* Avatar */}
									<div className={`relative ${isSidebarCollapsed ? '' : 'flex items-center gap-3 mb-3'}`}>
										<div className="relative">
											{user.avatar ? (
												<img 
													src={getAvatarUrl(user.avatar)}
													alt={user.name}
													className={`${isSidebarCollapsed ? 'h-11 w-11' : 'h-12 w-12'} rounded-xl object-cover shadow-lg ring-2 ring-white/30`}
													onError={(e) => {
														e.target.style.display = 'none';
														e.target.nextElementSibling.style.display = 'flex';
													}}
												/>
											) : null}
											<div className={`${isSidebarCollapsed ? 'h-11 w-11' : 'h-12 w-12'} bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg ring-2 ring-white/30 ${user.avatar ? 'hidden' : ''}`}>
												<span className="text-white font-bold text-lg">
													{user.name?.charAt(0) || "U"}
												</span>
											</div>
											{/* Online indicator */}
											<div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 ${isSidebarCollapsed ? 'border-white' : 'border-white/50'}`} />
										</div>
										{!isSidebarCollapsed && (
											<div className="flex-1 min-w-0">
												<h3 className="font-bold text-white text-sm truncate leading-tight">{user.name || getDisplayName()}</h3>
												{user.jabatan && (
													<p className="text-white/70 text-[11px] truncate mt-0.5">{user.jabatan}</p>
												)}
											</div>
										)}
									</div>
									
									{/* Badges & NIP */}
									{!isSidebarCollapsed && (
										<div className="space-y-2">
											<div className="flex items-center gap-1.5 flex-wrap">
												<span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white rounded-lg text-[11px] font-semibold shadow-sm">
													<span className="w-1.5 h-1.5 rounded-full bg-white/80" />
													{getShortDisplayName()}
												</span>
												{user.status_kepegawaian && (
													<span className="inline-flex items-center px-2 py-1 bg-white/15 backdrop-blur-sm text-white/90 rounded-lg text-[10px] font-medium">
														{user.status_kepegawaian}
													</span>
												)}
											</div>
											{user.nip && (
												<div className="flex items-center gap-2 px-2.5 py-1.5 bg-black/10 backdrop-blur-sm rounded-lg">
													<FiUser className="w-3 h-3 text-white/60 flex-shrink-0" />
													<p className="text-[10px] text-white/80 font-mono tracking-wide truncate">{user.nip}</p>
												</div>
											)}
										</div>
									)}
								</div>
							</div>
						</div>
						
						{/* Logout Button */}
						<div className={`${isSidebarCollapsed ? 'px-2 pb-3' : 'px-3 pb-3'}`}>
							<button
								onClick={handleLogout}
								className={`group relative w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200 active:scale-[0.98]`}
								title={isSidebarCollapsed ? 'Keluar' : ''}
							>
								<div className={`relative ${isSidebarCollapsed ? 'mx-auto' : 'flex-shrink-0'}`}>
									<FiLogOut className="h-5 w-5" />
								</div>
								{!isSidebarCollapsed && (
									<span className="relative font-semibold text-sm">Keluar</span>
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

			{/* Bottom Navigation - Mobile Only - Premium Floating Pill */}
			{!isDesktop && (() => {
				const isMessagingPage = location.pathname.startsWith('/dpmd/pesan');
				return (
				<nav className="fixed bottom-4 left-5 right-5 z-50">
					{/* Main navigation container */}
					<div className="relative bg-white border border-gray-100 shadow-[0_2px_20px_rgba(0,0,0,0.08)] rounded-full">
						<div className="max-w-lg mx-auto px-1">
							<div className="flex items-center justify-around h-[56px]">
							{bottomNavItems.map((item, index) => {
								const itemPath = item.path ? item.path.split('?')[0] : '';
								const itemQuery = item.path && item.path.includes('?') ? item.path.split('?')[1] : null;
								const isActive = item.path
									? itemQuery
										? location.pathname === itemPath && location.search === `?${itemQuery}`
										: location.pathname === item.path ||
											(item.isMain && location.pathname.startsWith(item.path))
									: false;
								const Icon = item.icon;
								
								// Aksi Cepat FAB - opens full menu bottom sheet
								if (item.isQuickAction) {
									// On messaging page: compact icon aligned with other nav items
									if (isMessagingPage) {
										return (
											<button
												key={index}
												onClick={() => setShowMenu(true)}
												className="relative flex flex-col items-center justify-center py-1 group"
											>
												<FiGrid className="h-[22px] w-[22px] text-slate-400 group-hover:text-slate-600 transition-all duration-200" />
												<span className="text-[9px] mt-1 font-bold tracking-wider uppercase text-slate-400">
													{item.label}
												</span>
												{unreadCount > 0 && (
													<span className="absolute -right-2 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
														{unreadCount > 9 ? '9+' : unreadCount}
													</span>
												)}
											</button>
										);
									}
									return (
										<button
											key={index}
											onClick={() => setShowMenu(true)}
											className="relative flex flex-col items-center"
										>
											<div className="relative -mt-8 mb-0.5">
												<div className="relative flex items-center justify-center h-[52px] w-[52px] rounded-full shadow-lg ring-[5px] ring-white transition-all duration-300 bg-gradient-to-br from-blue-600 to-indigo-700 hover:scale-110">
													<FiGrid className="h-6 w-6 text-white" />
													{unreadCount > 0 && (
														<span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
															{unreadCount > 9 ? '9+' : unreadCount}
														</span>
													)}
												</div>
											</div>
											<span className="text-[9px] font-bold tracking-wider uppercase text-slate-400">
												{item.label}
											</span>
										</button>
									);
								}

								// Regular nav items
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
										className="relative flex flex-col items-center justify-center py-1 group"
									>
										{isActive && (
											<motion.div
												layoutId="navDot"
												className={`absolute -top-0.5 w-5 h-1 rounded-full bg-gradient-to-r ${theme.gradientFrom} ${theme.gradientTo}`}
												transition={{ type: "spring", stiffness: 500, damping: 30 }}
											/>
										)}
										<Icon className={`h-[22px] w-[22px] transition-all duration-200 ${
											isActive ? `${theme.activeText} scale-110` : 'text-slate-400 group-hover:text-slate-600'
										}`} />
										<span className={`text-[9px] mt-1 font-bold tracking-wider uppercase ${
											isActive ? theme.activeText : 'text-slate-400'
										}`}>{item.label}</span>
									</button>
								);
							})}
							</div>
						</div>
					</div>
				</nav>
				);
			})()}

			{/* Aksi Cepat Menu - Mobile Only, Slide from bottom (superadmin-style) */}
			<AnimatePresence>
			{showMenu && !isDesktop && (
				<>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-50 bg-black/70"
						onClick={() => setShowMenu(false)}
					/>
					<motion.div
						initial={{ y: "100%" }}
						animate={{ y: 0 }}
						exit={{ y: "100%" }}
						transition={{ type: "spring", stiffness: 320, damping: 28 }}
						className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[2rem] bg-white shadow-2xl"
					>
						<div className="max-w-lg mx-auto">
							{/* Handle Bar */}
							<div className="flex justify-center pt-3 pb-2">
								<div className="w-12 h-1.5 bg-slate-300 rounded-full"></div>
							</div>

							{/* User Header */}
							<div className={`border-b ${theme.menuBorder} bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 px-6 py-5`}>
								<div className="flex items-start gap-4">
									{user.avatar ? (
										<img
											src={getAvatarUrl(user.avatar)}
											alt={user.name}
											className="h-14 w-14 rounded-2xl object-cover shadow-md"
											onError={(e) => {
												e.target.style.display = 'none';
												e.target.nextElementSibling.style.display = 'flex';
											}}
										/>
									) : null}
									<div className={`h-14 w-14 bg-gradient-to-br ${theme.gradientFrom} ${theme.gradientTo} rounded-2xl flex items-center justify-center shadow-md ${user.avatar ? 'hidden' : ''}`}>
										<span className="text-white font-bold text-xl">
											{user.name?.charAt(0) || "U"}
										</span>
									</div>
									<div className="min-w-0 flex-1">
										<p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 mb-0.5">Aksi Cepat</p>
										<h3 className="truncate text-lg font-bold text-slate-900">{user.name || getDisplayName()}</h3>
										<p className="truncate text-sm text-slate-500">{user.email}</p>
										<span className={`mt-1.5 inline-flex rounded-full ${theme.badgeBg} px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${theme.badgeText}`}>
											{getShortDisplayName()}
										</span>
									</div>
									<button
										onClick={() => setShowMenu(false)}
										className="rounded-2xl bg-white p-2 text-slate-500 shadow-sm transition-colors hover:bg-slate-100"
									>
										<FiX className="h-5 w-5" />
									</button>
								</div>

								{/* Quick Access: Profil */}
								<div className="mt-4">
									<button
										onClick={() => {
											setShowMenu(false);
											navigate(`${config.basePath}/profile`);
										}}
										className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm"
									>
										<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
											<FiUser className="h-5 w-5" />
										</div>
										<div>
											<p className="text-sm font-semibold text-slate-800">Profil</p>
											<p className="text-xs text-slate-400">Lihat & edit profil</p>
										</div>
									</button>
								</div>
							</div>

							{/* All Menu Items */}
							<div className="max-h-[50vh] space-y-1.5 overflow-y-auto px-6 py-4">
								{/* Bidang Navigation - prioritized at top */}
								{config.showBidangNav && userBidang && (
									<div className="border-b border-slate-100 pb-3 mb-3">
										<p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Bidang</p>
										<button
											onClick={() => {
												setShowMenu(false);
												navigate(userBidang.path);
											}}
											className={`flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left transition-all duration-200 ${
												location.pathname.startsWith(userBidang.path)
													? `bg-gradient-to-r ${userBidang.gradient} text-white shadow-lg`
													: 'bg-slate-50 text-slate-700 hover:bg-slate-100'
											}`}
										>
											<div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
												location.pathname.startsWith(userBidang.path) ? 'bg-white/15 text-white' : 'bg-white text-slate-600 shadow-sm'
											}`}>
												<AnimatedIcon type={userBidang.icon} isActive={location.pathname.startsWith(userBidang.path)} className="w-5 h-5" />
											</div>
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm font-semibold">Bidang {userBidang.name}</p>
											</div>
											<FiChevronRight className={`h-4 w-4 ${
												location.pathname.startsWith(userBidang.path) ? 'text-white/80' : 'text-slate-300'
											}`} />
										</button>
									</div>
								)}

								{/* Nav Items */}
								{navItems.map((item) => {
									const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
									return (
										<button
											key={item.path}
											onClick={() => {
												setShowMenu(false);
												navigate(item.path);
											}}
											className={`flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left transition-all duration-200 ${
												isActive
													? `bg-gradient-to-r ${item.gradient} text-white shadow-lg`
													: 'text-slate-700 hover:bg-slate-100'
											}`}
										>
											<div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
												isActive ? 'bg-white/15 text-white' : 'bg-white text-slate-600 shadow-sm'
											}`}>
												<AnimatedIcon type={item.icon} isActive={isActive} className="w-5 h-5" />
											</div>
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm font-semibold">{item.label}</p>
											</div>
											<FiChevronRight className={`h-4 w-4 ${isActive ? 'text-white/80' : 'text-slate-300'}`} />
										</button>
									);
								})}

								{/* Presensi - for absensi-eligible users */}
								{isAbsensiEligible && (
									<button
										onClick={() => {
											setShowMenu(false);
											navigate('/dpmd/absensi');
										}}
										className={`flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left transition-all duration-200 ${
											location.pathname.startsWith('/dpmd/absensi')
												? 'bg-gradient-to-r from-emerald-400 to-teal-600 text-white shadow-lg'
												: 'text-slate-700 hover:bg-slate-100'
										}`}
									>
										<div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
											location.pathname.startsWith('/dpmd/absensi') ? 'bg-white/15 text-white' : 'bg-white text-slate-600 shadow-sm'
										}`}>
											<FiClock className="w-5 h-5" />
										</div>
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-semibold">Presensi</p>
										</div>
										<FiChevronRight className={`h-4 w-4 ${
											location.pathname.startsWith('/dpmd/absensi') ? 'text-white/80' : 'text-slate-300'
										}`} />
									</button>
								)}
							</div>

							{/* Logout */}
							<div className="border-t border-slate-100 px-6 py-4">
								<button
									onClick={handleLogout}
									className="flex w-full items-center gap-4 rounded-2xl bg-red-50 px-4 py-3 text-left text-red-600 border border-red-200"
								>
									<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-red-500 shadow-sm">
										<FiLogOut className="h-5 w-5" />
									</div>
									<div>
										<p className="text-sm font-semibold">Keluar</p>
										<p className="text-xs text-red-400">Logout dari aplikasi</p>
									</div>
								</button>
							</div>
						</div>
					</motion.div>
				</>
			)}
			</AnimatePresence>
			{confirmDialog}

			{/* Smart Search ChatBot - only on dashboard */}
			{location.pathname.endsWith('/dashboard') && <ChatBot isDesktop={isDesktop} />}

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
