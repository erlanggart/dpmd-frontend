import React from "react";
import { Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
	FiActivity,
	FiBarChart2,
	FiBell,
	FiBriefcase,
	FiChevronLeft,
	FiChevronRight,
	FiFileText,
	FiGrid,
	FiHome,
	FiImage,
	FiLayers,
	FiLogOut,
	FiMenu,
	FiSettings,
	FiShield,
	FiUser,
	FiUsers,
	FiX,
} from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../hooks/useConfirm.jsx";
import { getAvatarUrl } from "../utils/avatarUtils";
import { performFullLogout } from "../utils/sessionPersistence";

const useResponsive = () => {
	const [isDesktop, setIsDesktop] = React.useState(window.innerWidth >= 1024);
	const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

	React.useEffect(() => {
		const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	return { isDesktop, isSidebarCollapsed, setIsSidebarCollapsed };
};

const MENU_ITEMS = [
	{
		path: "/superadmin/dashboard",
		label: "Dashboard",
		description: "Ringkasan sistem dan status layanan",
		icon: FiHome,
		gradient: "from-blue-500 to-indigo-600",
		accent: "text-blue-600",
	},
	{
		path: "/superadmin/users",
		label: "User Management",
		description: "Kelola akun, role, dan akses pengguna",
		icon: FiUsers,
		gradient: "from-sky-500 to-cyan-600",
		accent: "text-sky-600",
	},
	{
		path: "/superadmin/kepegawaian",
		label: "Kepegawaian",
		description: "Data pegawai dan profil internal",
		icon: FiBriefcase,
		gradient: "from-emerald-500 to-teal-600",
		accent: "text-emerald-600",
	},
	{
		path: "/superadmin/bidang",
		label: "Bidang & Program",
		description: "Akses modul per bidang dan program",
		icon: FiLayers,
		gradient: "from-violet-500 to-indigo-600",
		accent: "text-violet-600",
	},
	{
		path: "/superadmin/berita",
		label: "Berita",
		description: "Kelola konten publik dan publikasi",
		icon: FiFileText,
		gradient: "from-amber-500 to-orange-600",
		accent: "text-amber-600",
	},
	{
		path: "/superadmin/hero-gallery",
		label: "Hero Gallery",
		description: "Atur galeri hero dan visual homepage",
		icon: FiImage,
		gradient: "from-pink-500 to-rose-600",
		accent: "text-pink-600",
	},
	{
		path: "/core-dashboard",
		label: "Core Dashboard",
		description: "Masuk ke dashboard publik inti",
		icon: FiBarChart2,
		gradient: "from-cyan-500 to-blue-600",
		accent: "text-cyan-600",
	},
	{
		path: "/superadmin/activity-logs",
		label: "Activity Logs",
		description: "Pantau log aktivitas sistem",
		icon: FiActivity,
		gradient: "from-slate-500 to-slate-700",
		accent: "text-slate-600",
	},
	{
		path: "/superadmin/musdesus",
		label: "Musdesus",
		description: "Monitor pelaksanaan musdesus",
		icon: FiBriefcase,
		gradient: "from-fuchsia-500 to-purple-600",
		accent: "text-fuchsia-600",
	},
	{
		path: "/superadmin/settings",
		label: "Settings",
		description: "Konfigurasi global aplikasi",
		icon: FiSettings,
		gradient: "from-gray-500 to-gray-700",
		accent: "text-gray-600",
	},
];

const isMenuItemActive = (pathname, path) =>
	pathname === path || pathname.startsWith(`${path}/`);

const CORE_DASHBOARD_PATH = "/core-dashboard";

const getNotificationTarget = (notification) => {
	if (notification?.data?.url) {
		return notification.data.url;
	}

	const notificationType = notification?.data?.type || notification?.type;
	if (notificationType === "today_schedule" || notificationType === "tomorrow_schedule" || notificationType === "kegiatan") {
		return "/superadmin/bidang/sekretariat/jadwal-kegiatan";
	}

	if (notificationType === "disposisi") {
		return "/superadmin/bidang/sekretariat/disposisi";
	}

	return null;
};

const getNotificationTime = (notification) =>
	notification.time || notification.created_at || notification.timestamp || "Baru saja";

const SuperadminLayout = () => {
	const { user: authUser, isCheckingSession } = useAuth();
	const [showMenu, setShowMenu] = React.useState(false);
	const [showNotifications, setShowNotifications] = React.useState(false);
	const [notifications, setNotifications] = React.useState([]);
	const [unreadCount, setUnreadCount] = React.useState(0);
	const [user, setUser] = React.useState(() => JSON.parse(localStorage.getItem("user") || "{}"));
	const navigate = useNavigate();
	const location = useLocation();
	const { confirmDialog, showConfirm } = useConfirm();
	const { isDesktop, isSidebarCollapsed, setIsSidebarCollapsed } = useResponsive();
	const coreDashboardItem = React.useMemo(
		() => MENU_ITEMS.find((item) => item.path === CORE_DASHBOARD_PATH),
		[],
	);
	const mainMenuItems = React.useMemo(
		() => MENU_ITEMS.filter((item) => item.path !== CORE_DASHBOARD_PATH),
		[],
	);

	const token = localStorage.getItem("expressToken");
	const avatarUrl = getAvatarUrl(user.avatar || user.avatar_url);

	React.useEffect(() => {
		const syncUser = () => {
			const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
			setUser(storedUser);
		};

		window.addEventListener("storage", syncUser);
		window.addEventListener("userProfileUpdated", syncUser);

		return () => {
			window.removeEventListener("storage", syncUser);
			window.removeEventListener("userProfileUpdated", syncUser);
		};
	}, []);

	React.useEffect(() => {
		if (authUser) {
			setUser((prev) => ({ ...prev, ...authUser }));
		}
	}, [authUser]);

	const fetchNotifications = React.useCallback(async () => {
		try {
			const response = await api.get("/push-notification/notifications?limit=20");
			if (response.data.success) {
				setNotifications(response.data.data || []);
				setUnreadCount(response.data.unreadCount || 0);
			}
		} catch (error) {
			console.error("Error fetching notifications:", error);
			setNotifications([]);
			setUnreadCount(0);
		}
	}, []);

	React.useEffect(() => {
		fetchNotifications();
		const interval = setInterval(fetchNotifications, 30000);

		const handleNewNotification = () => fetchNotifications();
		window.addEventListener("newNotification", handleNewNotification);

		return () => {
			clearInterval(interval);
			window.removeEventListener("newNotification", handleNewNotification);
		};
	}, [fetchNotifications]);

	React.useEffect(() => {
		setShowMenu(false);
		setShowNotifications(false);
	}, [location.pathname]);

	if (isCheckingSession) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
				<div className="text-center">
					<div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white"></div>
					<p className="text-sm font-medium text-white/85">Memuat...</p>
				</div>
			</div>
		);
	}

	const effectiveRole = authUser?.role || user?.role;
	if (!token || effectiveRole !== "superadmin") {
		return <Navigate to="/" replace />;
	}

	const handleLogout = async () => {
		const confirmed = await showConfirm({
			title: "Keluar dari Superadmin",
			message: "Apakah Anda yakin ingin keluar dari sistem?",
			type: "warning",
			confirmText: "Ya, Keluar",
			cancelText: "Batal",
		});

		if (confirmed) {
			await performFullLogout();
			toast.success("Berhasil logout");
			window.location.href = "/";
		}
	};

	const openNotifications = async () => {
		setShowMenu(false);
		setShowNotifications(true);

		if (unreadCount > 0) {
			try {
				await api.post("/push-notification/notifications/mark-read", { all: true });
				setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
				setUnreadCount(0);
			} catch (error) {
				console.error("Error marking notifications as read:", error);
			}
		}
	};

	const handleNotificationItemClick = async (notification) => {
		if (!notification.read) {
			try {
				await api.post("/push-notification/notifications/mark-read", { ids: [notification.id] });
				setNotifications((prev) =>
					prev.map((item) =>
						item.id === notification.id ? { ...item, read: true } : item,
					),
				);
				setUnreadCount((prev) => Math.max(0, prev - 1));
			} catch (error) {
				console.error("Error marking notification as read:", error);
			}
		}

		const targetPath = getNotificationTarget(notification);
		setShowNotifications(false);
		if (targetPath) {
			navigate(targetPath);
		}
	};

	const mobileNavItems = [
		{ label: "Home", icon: FiHome, path: "/superadmin/dashboard" },
		{ label: "Menu", icon: FiGrid, isMain: true },
		{ label: "Profil", icon: FiUser, path: "/superadmin/profile" },
	];

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
			{confirmDialog}

			{isDesktop && (
				<aside
					className={`fixed left-0 top-0 z-40 flex h-full flex-col border-r border-slate-100 bg-white shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
						isSidebarCollapsed ? "w-20" : "w-64"
					}`}
				>
					<div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500"></div>

					<div className="relative flex h-24 items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 px-4">
						{!isSidebarCollapsed && (
							<div className="flex flex-1 items-center justify-center">
								<img src="/logo-dpmd.png" alt="DPMD Logo" className="h-20" />
							</div>
						)}
						<button
							onClick={() => setIsSidebarCollapsed((prev) => !prev)}
							className={`group rounded-xl bg-blue-100 p-2 text-blue-700 transition-colors duration-200 hover:bg-blue-200 ${
								isSidebarCollapsed ? "mx-auto" : "flex-shrink-0"
							}`}
							aria-label={isSidebarCollapsed ? "Buka sidebar" : "Tutup sidebar"}
						>
							{isSidebarCollapsed ? (
								<FiMenu className="h-5 w-5 transition-transform group-hover:scale-110" />
							) : (
								<FiChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
							)}
						</button>
					</div>

					<nav className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200" style={{ height: "calc(100vh - 252px)" }}>
						<div className="space-y-3">
							{coreDashboardItem && (() => {
								const item = coreDashboardItem;
								const isActive = isMenuItemActive(location.pathname, item.path);
								const Icon = item.icon;

								return (
									<div className="space-y-2 border-b border-slate-100 pb-3">
										{!isSidebarCollapsed && (
											<p className="px-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
												Akses Cepat
											</p>
										)}
										<button
											key={item.path}
											onClick={() => navigate(item.path)}
											title={isSidebarCollapsed ? item.label : ""}
											className={`group flex w-full items-center rounded-2xl transition-all duration-200 ${
												isSidebarCollapsed ? "justify-center px-3 py-3" : "gap-3 px-3 py-3"
											} ${
												isActive
													? `bg-gradient-to-r ${item.gradient} text-white shadow-lg`
													: "bg-slate-50 text-slate-700 hover:bg-slate-100 hover:shadow-sm"
											}`}
										>
											<Icon className={`h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-white" : item.accent}`} />
											{!isSidebarCollapsed && (
												<div className="min-w-0 flex-1 text-left">
													<p className="truncate text-sm font-semibold">
														{item.label}
													</p>
												</div>
											)}
											{!isSidebarCollapsed && (
												<FiChevronRight className={`h-4 w-4 transition-transform duration-200 ${isActive ? "text-white/90" : "text-slate-300 group-hover:translate-x-0.5 group-hover:text-slate-500"}`} />
											)}
										</button>
									</div>
								);
							})()}

							<div className="space-y-1.5">
								{mainMenuItems.map((item) => {
								const isActive = isMenuItemActive(location.pathname, item.path);
								const Icon = item.icon;

								return (
									<button
										key={item.path}
										onClick={() => navigate(item.path)}
										title={isSidebarCollapsed ? item.label : ""}
										className={`group flex w-full items-center rounded-2xl transition-all duration-200 ${
											isSidebarCollapsed ? "justify-center px-3 py-3" : "gap-3 px-3 py-3"
										} ${
											isActive
												? `bg-gradient-to-r ${item.gradient} text-white shadow-lg`
												: "text-slate-700 hover:bg-slate-100 hover:shadow-sm"
										}`}
									>
										<Icon className={`h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-white" : item.accent}`} />
										{!isSidebarCollapsed && (
											<div className="min-w-0 flex-1 text-left">
												<p className="truncate text-sm font-semibold">
													{item.label}
												</p>
											</div>
										)}
										{!isSidebarCollapsed && (
											<FiChevronRight className={`h-4 w-4 transition-transform duration-200 ${isActive ? "text-white/90" : "text-slate-300 group-hover:translate-x-0.5 group-hover:text-white/70"}`} />
										)}
									</button>
								);
								})}
							</div>
						</div>
					</nav>

					<div className="border-t border-slate-100 bg-white">
						<div className="border-b border-slate-100 p-3">
							<button
								onClick={openNotifications}
								title={isSidebarCollapsed ? "Notifikasi" : ""}
								className={`group flex w-full items-center rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5 transition-all duration-200 hover:border-blue-100 hover:bg-blue-50 ${
									isSidebarCollapsed ? "justify-center" : "gap-3"
								}`}
							>
								<div className="relative">
									<FiBell className="h-5 w-5 text-slate-600 transition-transform duration-200 group-hover:scale-110 group-hover:text-blue-600" />
									{unreadCount > 0 && (
										<span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
											{unreadCount > 9 ? "9+" : unreadCount}
										</span>
									)}
								</div>
								{!isSidebarCollapsed && (
									<div className="min-w-0 flex-1 text-left">
										<p className="text-sm font-semibold text-slate-800">Notifikasi</p>
										<p className="text-xs text-slate-400">{unreadCount > 0 ? `${unreadCount} belum dibaca` : "Semua sudah dibaca"}</p>
									</div>
								)}
							</button>
						</div>

						<div className="border-b border-slate-100 p-3">
							<button
								onClick={() => navigate("/superadmin/profile")}
								title={isSidebarCollapsed ? "Profil" : ""}
								className={`flex w-full items-center rounded-2xl transition-all duration-200 hover:bg-slate-50 ${
									isSidebarCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-2 py-2.5"
								}`}
							>
								{avatarUrl ? (
									<img
										src={avatarUrl}
										alt={user.nama || user.name || "Superadmin"}
										className={`${isSidebarCollapsed ? "h-12 w-12" : "h-11 w-11"} rounded-2xl object-cover shadow-md`}
									/>
								) : (
									<div className={`${isSidebarCollapsed ? "h-12 w-12" : "h-11 w-11"} flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md`}>
										<FiShield className="h-5 w-5" />
									</div>
								)}
								{!isSidebarCollapsed && (
									<div className="min-w-0 flex-1 text-left">
										<p className="truncate text-sm font-semibold text-slate-800">
											{user.nama || user.name || "Superadmin"}
										</p>
										<p className="truncate text-xs text-slate-500">{user.email || "superadmin@dpmd"}</p>
										<span className="mt-1 inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
											Super Admin
										</span>
									</div>
								)}
							</button>
						</div>

						<div className="p-3">
							<button
								onClick={handleLogout}
								title={isSidebarCollapsed ? "Logout" : ""}
								className={`group flex w-full items-center rounded-2xl px-3 py-2.5 text-red-600 transition-all duration-200 hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 hover:text-white hover:shadow-md ${
									isSidebarCollapsed ? "justify-center" : "gap-3"
								}`}
							>
								<FiLogOut className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
								{!isSidebarCollapsed && <span className="text-sm font-semibold">Keluar</span>}
							</button>
						</div>
					</div>
				</aside>
			)}

			<AnimatePresence>
				{showNotifications && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm"
							onClick={() => setShowNotifications(false)}
						/>
						<motion.div
							initial={{ opacity: 0, y: -16, scale: 0.98 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: -16, scale: 0.98 }}
							transition={{ duration: 0.2 }}
							className={`fixed z-50 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl ${
								isDesktop ? "right-6 top-6 w-[26rem]" : "left-4 right-4 top-4"
							}`}
						>
							<div className="flex items-center justify-between bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 px-5 py-4 text-white">
								<div>
									<p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/70">Inbox</p>
									<h3 className="text-lg font-bold">Notifikasi Superadmin</h3>
								</div>
								<button
									onClick={() => setShowNotifications(false)}
									className="rounded-xl bg-white/15 p-2 transition-colors hover:bg-white/25"
								>
									<FiX className="h-5 w-5" />
								</button>
							</div>
							<div className="max-h-[32rem] overflow-y-auto divide-y divide-slate-100">
								{notifications.length === 0 ? (
									<div className="px-6 py-12 text-center text-slate-500">
										<div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
											<FiBell className="h-7 w-7" />
										</div>
										<p className="text-sm font-medium">Belum ada notifikasi</p>
										<p className="mt-1 text-xs text-slate-400">Update sistem akan tampil di sini.</p>
									</div>
								) : (
									notifications.map((notification) => {
										const targetPath = getNotificationTarget(notification);

										return (
											<button
												key={notification.id}
												onClick={() => handleNotificationItemClick(notification)}
												className={`w-full px-5 py-4 text-left transition-colors hover:bg-slate-50 ${
													notification.read ? "" : "bg-blue-50/60"
												}`}
											>
												<div className="flex items-start gap-3">
													<div className={`mt-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${
														notification.read ? "bg-slate-100 text-slate-500" : "bg-blue-100 text-blue-600"
													}`}>
														<FiBell className="h-5 w-5" />
													</div>
													<div className="min-w-0 flex-1">
														<div className="flex items-center gap-2">
															<p className="truncate text-sm font-semibold text-slate-800">{notification.title}</p>
															{!notification.read && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-500"></span>}
														</div>
														<p className="mt-1 line-clamp-2 text-sm text-slate-600">{notification.message}</p>
														<div className="mt-2 flex items-center justify-between gap-3">
															<span className="text-xs text-slate-400">{getNotificationTime(notification)}</span>
															{targetPath && <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">Buka</span>}
														</div>
													</div>
												</div>
											</button>
										);
									})
								)}
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>

			<main
				className={`min-h-screen transition-all duration-300 ${
					isDesktop ? (isSidebarCollapsed ? "lg:ml-20" : "lg:ml-64") : "pb-24"
				}`}
			>
				<div className="">
					<div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
						<Outlet />
					</div>
				</div>
			</main>

			{!isDesktop && (
				<nav className="fixed bottom-4 left-5 right-5 z-40">
					<div className="rounded-full border border-slate-100 bg-white shadow-[0_2px_20px_rgba(15,23,42,0.08)]">
						<div className="mx-auto max-w-lg px-1">
							<div className="flex h-[56px] items-center justify-around">
								{mobileNavItems.map((item) => {
									const Icon = item.icon;
									const isActive = item.path ? isMenuItemActive(location.pathname, item.path) : false;

									if (item.isMain) {
										return (
											<button
												key={item.label}
												onClick={() => setShowMenu(true)}
												className="relative flex flex-col items-center"
											>
												<div className="relative -mt-8 mb-0.5">
													<div className="relative flex h-[52px] w-[52px] items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg ring-[5px] ring-white transition-transform duration-300 hover:scale-110">
														<Icon className="h-6 w-6" />
														{unreadCount > 0 && (
															<span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
																{unreadCount > 9 ? "9+" : unreadCount}
															</span>
														)}
													</div>
												</div>
												<span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
													{item.label}
												</span>
											</button>
										);
									}

									return (
										<button
											key={item.path}
											onClick={() => navigate(item.path)}
											className="relative flex flex-col items-center justify-center py-1 group"
										>
											{isActive && (
												<motion.div
													layoutId="superadminNavDot"
													className="absolute -top-0.5 h-1 w-5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600"
													transition={{ type: "spring", stiffness: 500, damping: 30 }}
												/>
											)}
											<Icon className={`h-[22px] w-[22px] transition-all duration-200 ${
												isActive ? "scale-110 text-blue-700" : "text-slate-400 group-hover:text-slate-600"
											}`} />
											<span className={`mt-1 text-[9px] font-bold uppercase tracking-wider ${
												isActive ? "text-blue-700" : "text-slate-400"
											}`}>
												{item.label}
											</span>
										</button>
									);
								})}
							</div>
						</div>
					</div>
				</nav>
			)}

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
							<div className="mx-auto max-w-lg">
								<div className="flex justify-center pb-2 pt-3">
									<div className="h-1.5 w-12 rounded-full bg-slate-300"></div>
								</div>

								<div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 px-6 py-5">
									<div className="flex items-start gap-4">
										{avatarUrl ? (
											<img
												src={avatarUrl}
												alt={user.nama || user.name || "Superadmin"}
												className="h-14 w-14 rounded-2xl object-cover shadow-md"
											/>
										) : (
											<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md">
												<FiShield className="h-6 w-6" />
											</div>
										)}
										<div className="min-w-0 flex-1">
											<p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-500">Control Center</p>
											<h3 className="truncate text-lg font-bold text-slate-900">
												{user.nama || user.name || "Superadmin"}
											</h3>
											<p className="truncate text-sm text-slate-500">{user.email || "superadmin@dpmd"}</p>
											<span className="mt-2 inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
												Super Admin
											</span>
										</div>
										<button
											onClick={() => setShowMenu(false)}
											className="rounded-2xl bg-white p-2 text-slate-500 shadow-sm transition-colors hover:bg-slate-100"
										>
											<FiX className="h-5 w-5" />
										</button>
									</div>

									<div className="mt-4 grid grid-cols-2 gap-3">
										<button
											onClick={openNotifications}
											className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm"
										>
											<div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
												<FiBell className="h-5 w-5" />
												{unreadCount > 0 && (
													<span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
														{unreadCount > 9 ? "9+" : unreadCount}
													</span>
												)}
											</div>
											<div>
												<p className="text-sm font-semibold text-slate-800">Notifikasi</p>
												<p className="text-xs text-slate-400">Lihat update sistem</p>
											</div>
										</button>

										<button
											onClick={() => {
												setShowMenu(false);
												navigate("/superadmin/profile");
											}}
											className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm"
										>
											<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
												<FiUser className="h-5 w-5" />
											</div>
											<div>
												<p className="text-sm font-semibold text-slate-800">Profil</p>
												<p className="text-xs text-slate-400">Kelola akun superadmin</p>
											</div>
										</button>
									</div>
								</div>

								<div className="max-h-[50vh] space-y-2 overflow-y-auto px-6 py-4">
									{coreDashboardItem && (() => {
										const item = coreDashboardItem;
										const Icon = item.icon;
										const isActive = isMenuItemActive(location.pathname, item.path);

										return (
											<div className="border-b border-slate-100 pb-4">
												<p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
													Akses Cepat
												</p>
												<button
													key={item.path}
													onClick={() => {
														setShowMenu(false);
														navigate(item.path);
													}}
													className={`flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left transition-all duration-200 ${
														isActive
															? `bg-gradient-to-r ${item.gradient} text-white shadow-lg`
															: "bg-slate-50 text-slate-700 hover:bg-slate-100"
													}`}
												>
													<div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
														isActive ? "bg-white/15 text-white" : "bg-white text-slate-600 shadow-sm"
													}`}>
														<Icon className="h-5 w-5" />
													</div>
													<div className="min-w-0 flex-1">
														<p className="truncate text-sm font-semibold">{item.label}</p>
													</div>
													<FiChevronRight className={`h-4 w-4 ${isActive ? "text-white/80" : "text-slate-300"}`} />
												</button>
											</div>
										);
									})()}

									{mainMenuItems.map((item) => {
										const Icon = item.icon;
										const isActive = isMenuItemActive(location.pathname, item.path);

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
														: "bg-slate-50 text-slate-700 hover:bg-slate-100"
												}`}
											>
												<div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
													isActive ? "bg-white/15 text-white" : "bg-white text-slate-600 shadow-sm"
												}`}>
													<Icon className="h-5 w-5" />
												</div>
												<div className="min-w-0 flex-1">
													<p className="truncate text-sm font-semibold">{item.label}</p>
												</div>
												<FiChevronRight className={`h-4 w-4 ${isActive ? "text-white/80" : "text-slate-300"}`} />
											</button>
										);
									})}
								</div>

								<div className="border-t border-slate-100 px-6 py-4">
									<button
										onClick={handleLogout}
										className="flex w-full items-center gap-4 rounded-2xl bg-red-50 px-4 py-3 text-left text-red-600 transition-colors hover:bg-red-100"
									>
										<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-red-500 shadow-sm">
											<FiLogOut className="h-5 w-5" />
										</div>
										<div>
											<p className="text-sm font-semibold">Keluar</p>
											<p className="text-xs text-red-400">Logout dari control panel</p>
										</div>
									</button>
								</div>
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</div>
	);
};

export default SuperadminLayout;