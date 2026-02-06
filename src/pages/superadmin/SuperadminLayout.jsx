// src/pages/superadmin/SuperadminLayout.jsx
import React from "react";
import { Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import { 
	FiHome, FiUsers, FiSettings, FiMenu, FiLogOut, 
	FiBarChart2, FiFileText, FiImage, FiBell, FiUser,
	FiActivity, FiLayers, FiBriefcase, FiX, FiChevronRight
} from "react-icons/fi";
import { performFullLogout } from "../../utils/sessionPersistence";
import { useConfirm } from "../../hooks/useConfirm.jsx";
import { toast } from 'react-hot-toast';
import api from "../../api";

const SuperadminLayout = () => {
	const [sidebarOpen, setSidebarOpen] = React.useState(true); // Desktop sidebar toggle
	const [showMobileMenu, setShowMobileMenu] = React.useState(false); // Mobile menu
	const [showNotifications, setShowNotifications] = React.useState(false);
	const [notifications, setNotifications] = React.useState([]);
	const [unreadCount, setUnreadCount] = React.useState(0);
	const [user, setUser] = React.useState(JSON.parse(localStorage.getItem("user") || "{}"));
	const navigate = useNavigate();
	const location = useLocation();
	const { confirmDialog, showConfirm } = useConfirm();

	const token = localStorage.getItem("expressToken");

	React.useEffect(() => {
		const handleProfileUpdate = () => {
			const updatedUser = JSON.parse(localStorage.getItem("user") || "{}");
			setUser(updatedUser);
		};
		window.addEventListener('userProfileUpdated', handleProfileUpdate);
		return () => window.removeEventListener('userProfileUpdated', handleProfileUpdate);
	}, []);

	// Fetch real notifications from backend
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
				// Fallback to empty notifications if error
				setNotifications([]);
				setUnreadCount(0);
			}
		};

		fetchNotifications();
		
		// Refresh notifications every 30 seconds
		const interval = setInterval(fetchNotifications, 30000);
		
		return () => clearInterval(interval);
	}, []);

	if (!token || user.role !== "superadmin") {
		return <Navigate to="/" replace />;
	}

	const handleLogout = async () => {
		const confirmed = await showConfirm(
			"Logout",
			"Apakah Anda yakin ingin keluar dari sistem?"
		);

		if (confirmed) {
			await performFullLogout();
			toast.success("Berhasil logout");
			window.location.href = "/";
		}
	};

	const handleNotificationClick = () => {
		setShowNotifications(!showNotifications);
		if (!showNotifications) {
			setNotifications(prev => prev.map(n => ({ ...n, read: true })));
			setUnreadCount(0);
		}
	};

	const menuItems = [
		{
			path: "/superadmin/dashboard",
			icon: FiHome,
			label: "Dashboard",
			description: "Overview sistem"
		},
		{
			path: "/superadmin/users",
			icon: FiUsers,
			label: "User Management",
			description: "Kelola pengguna"
		},
		{
			path: "/superadmin/bidang",
			icon: FiLayers,
			label: "Bidang & Program",
			description: "Akses bidang"
		},
		{
			path: "/superadmin/berita",
			icon: FiFileText,
			label: "Berita",
			description: "Kelola konten"
		},
		{
			path: "/superadmin/hero-gallery",
			icon: FiImage,
			label: "Hero Gallery",
			description: "Kelola galeri"
		},
		{
			path: "/core-dashboard",
			icon: FiBarChart2,
			label: "Core Dashboard",
			description: "Dashboard publik"
		},
		{
			path: "/superadmin/activity-logs",
			icon: FiActivity,
			label: "Activity Logs",
			description: "Log aktivitas"
		},
		{
			path: "/superadmin/musdesus",
			icon: FiBriefcase,
			label: "Musdesus",
			description: "Monitor musdesus"
		},
		{
			path: "/superadmin/settings",
			icon: FiSettings,
			label: "Settings",
			description: "Pengaturan"
		}
	];

	const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100">
			{confirmDialog}

			{/* Modern Collapsible Sidebar - Desktop */}
			<aside className={`hidden lg:flex fixed left-0 top-0 h-screen bg-white border-r border-gray-100 shadow-sm flex-col z-40 transition-all duration-300 ease-in-out ${
				sidebarOpen ? 'w-72' : 'w-20'
			}`}>
				{/* Logo & Brand */}
				<div className="p-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-gray-100">
					<div className="flex items-center justify-center overflow-hidden">
						<img 
							src="/logo-dpmd.png" 
							alt="DPMD Logo" 
							className={`transition-all duration-300 ${sidebarOpen ? "h-20" : "h-14"}`}
						/>
					</div>
				</div>

				{/* Toggle Button */}
				<button
					onClick={() => setSidebarOpen(!sidebarOpen)}
					className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors z-50"
				>
					<FiChevronRight className={`w-4 h-4 text-gray-600 transition-transform duration-300 ${
						sidebarOpen ? 'rotate-180' : ''
					}`} />
				</button>

				{/* Navigation */}
				<nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
					{menuItems.map((item) => (
						<button
							key={item.path}
							onClick={() => navigate(item.path)}
							title={!sidebarOpen ? item.label : ''}
							className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
								isActive(item.path)
									? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
									: "text-gray-600 hover:bg-gray-50"
							} ${!sidebarOpen ? 'justify-center' : ''}`}
						>
							<item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${
								isActive(item.path) ? "text-white" : "text-gray-500"
							}`} />
							{sidebarOpen && (
								<div className="flex-1 text-left animate-in fade-in slide-in-from-left duration-200">
									<div className={`font-medium text-sm ${
										isActive(item.path) ? "text-white" : "text-gray-700"
									}`}>
										{item.label}
									</div>
									<div className={`text-xs leading-tight ${
										isActive(item.path) ? "text-blue-100" : "text-gray-400"
									}`}>
										{item.description}
									</div>
								</div>
							)}
						</button>
					))}
				</nav>

				{/* Logout Button */}
				<div className="p-3 border-t border-gray-100">
					<button
						onClick={handleLogout}
						title={!sidebarOpen ? 'Logout' : ''}
						className={`w-full flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-all group ${
							!sidebarOpen ? 'justify-center' : ''
						}`}
					>
						<FiLogOut className="w-5 h-5 group-hover:scale-110 transition-transform flex-shrink-0" />
						{sidebarOpen && <span className="font-medium text-sm animate-in fade-in slide-in-from-left duration-200">Logout</span>}
					</button>
				</div>
			</aside>

			{/* Main Content */}
			<div className={`transition-all duration-300 ease-in-out ${sidebarOpen ? 'lg:pl-72' : 'lg:pl-20'}`}>
				{/* Top Bar - Mobile & Desktop */}
				<header className="sticky top-0 z-30 bg-white/95 backdrop-blur-lg border-b border-gray-200 shadow-sm">
					<div className="px-4 sm:px-6 lg:px-8 py-3.5">
						<div className="flex items-center justify-between">
							{/* Mobile Menu Button */}
							<button
								onClick={() => setShowMobileMenu(true)}
								className="lg:hidden p-2.5 hover:bg-gray-100 rounded-xl transition-colors"
							>
								<FiMenu className="w-5 h-5 text-gray-700" />
							</button>

							{/* Page Title - Desktop */}
							<div className="hidden lg:block">
								<h2 className="text-xl font-bold text-gray-800">
									{menuItems.find(item => isActive(item.path))?.label || 'Dashboard'}
								</h2>
								<p className="text-sm text-gray-500">
									{menuItems.find(item => isActive(item.path))?.description || 'Overview sistem'}
								</p>
							</div>

							{/* Mobile Title */}
							<div className="lg:hidden flex-1 ml-3">
								<h2 className="text-base font-bold text-gray-800">
									{menuItems.find(item => isActive(item.path))?.label || 'Dashboard'}
								</h2>
							</div>

							{/* Actions */}
							<div className="flex items-center gap-2">
								{/* Notifications */}
								<div className="relative">
									<button
										onClick={handleNotificationClick}
										className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors relative"
									>
										<FiBell className="w-5 h-5 text-gray-700" />
										{unreadCount > 0 && (
											<span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold animate-pulse">
												{unreadCount > 9 ? '9+' : unreadCount}
											</span>
										)}
									</button>

									{/* Notifications Dropdown */}
									{showNotifications && (
										<>
											<div 
												className="fixed inset-0 z-40"
												onClick={() => setShowNotifications(false)}
											></div>
											<div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
												<div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
													<h3 className="font-semibold">Notifikasi</h3>
													<span className="text-xs bg-white/20 px-2 py-1 rounded-full">{notifications.length} baru</span>
												</div>
												{notifications.length === 0 ? (
													<div className="p-8 text-center text-gray-500">
														<FiBell className="w-12 h-12 mx-auto mb-2 opacity-30" />
														<p className="text-sm">Tidak ada notifikasi</p>
													</div>
												) : (
													<div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
														{notifications.map((notif) => (
															<div
																key={notif.id}
																className="p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 cursor-pointer"
															>
																<div className="flex items-start gap-3">
																	<div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
																		notif.read ? 'bg-gray-300' : 'bg-blue-500 animate-pulse'
																	}`}></div>
																	<div className="flex-1 min-w-0">
																		<p className="font-medium text-gray-800 text-sm">{notif.title}</p>
																		<p className="text-sm text-gray-600 mt-1 line-clamp-2">{notif.message}</p>
																		<p className="text-xs text-gray-400 mt-2">{notif.time}</p>
																	</div>
																</div>
															</div>
														))}
													</div>
												)}
											</div>
										</>
									)}
								</div>

								{/* Profile - Mobile */}
								<button
									onClick={() => navigate('/superadmin/profile')}
									className="lg:hidden p-1.5 hover:bg-gray-100 rounded-xl transition-colors"
								>
									{user.avatar_url ? (
										<img 
											src={user.avatar_url} 
											alt={user.nama}
											className="w-8 h-8 rounded-lg object-cover"
										/>
									) : (
										<div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
											<FiUser className="w-4 h-4 text-blue-600" />
										</div>
									)}
								</button>
							</div>
						</div>
					</div>
				</header>

				{/* Page Content */}
				<main className="p-4 sm:p-6 lg:p-8">
					<div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
						<Outlet />
					</div>
				</main>
			</div>

			{/* Mobile Sidebar */}
			{showMobileMenu && (
				<>
					{/* Overlay */}
					<div 
						className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200"
						onClick={() => setShowMobileMenu(false)}
					></div>

					{/* Sidebar */}
					<aside className="lg:hidden fixed left-0 top-0 h-screen w-80 max-w-[85vw] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-left duration-300">
						{/* Header */}
						<div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
							<div className="flex items-center justify-between mb-6">
								<div className="flex items-center gap-3">
									<div className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
										<FiLayers className="w-6 h-6" />
									</div>
									<div>
										<h1 className="text-lg font-bold">Super Admin</h1>
										<p className="text-blue-100 text-xs">Full Control</p>
									</div>
								</div>
								<button
									onClick={() => setShowMobileMenu(false)}
									className="p-2 hover:bg-white/20 rounded-lg transition-colors"
								>
									<FiX className="w-5 h-5" />
								</button>
							</div>

							{/* Mobile User Profile */}
							<div className="flex items-center gap-3 p-3.5 bg-white/10 backdrop-blur-md rounded-xl">
								<div className="relative flex-shrink-0">
									{user.avatar_url ? (
										<img 
											src={user.avatar_url} 
											alt={user.nama}
											className="w-11 h-11 rounded-xl object-cover"
										/>
									) : (
										<div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
											<FiUser className="w-5 h-5" />
										</div>
									)}
									<div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-blue-600"></div>
								</div>
								<div className="flex-1 min-w-0">
									<p className="font-semibold text-sm truncate">{user.nama}</p>
									<p className="text-blue-100 text-xs truncate">{user.email}</p>
								</div>
							</div>
						</div>

						{/* Navigation */}
						<nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
							{menuItems.map((item) => (
								<button
									key={item.path}
									onClick={() => {
										navigate(item.path);
										setShowMobileMenu(false);
									}}
									className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
										isActive(item.path)
											? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
											: "text-gray-600 hover:bg-gray-50"
									}`}
								>
									<item.icon className={`w-5 h-5 flex-shrink-0 ${
										isActive(item.path) ? "text-white" : "text-gray-500"
									}`} />
									<div className="flex-1 text-left">
										<div className={`font-medium text-sm ${
											isActive(item.path) ? "text-white" : "text-gray-700"
										}`}>
											{item.label}
										</div>
										<div className={`text-xs ${
											isActive(item.path) ? "text-blue-100" : "text-gray-400"
										}`}>
											{item.description}
										</div>
									</div>
								</button>
							))}
						</nav>

						{/* Logout */}
						<div className="p-3 border-t border-gray-100">
							<button
								onClick={() => {
									setShowMobileMenu(false);
									handleLogout();
								}}
								className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"
							>
								<FiLogOut className="w-5 h-5" />
								<span className="font-medium text-sm">Logout</span>
							</button>
						</div>
					</aside>
				</>
			)}
		</div>
	);
};

export default SuperadminLayout;
