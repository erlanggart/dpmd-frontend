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
import HeaderSearchBot from "../components/chatbot/HeaderSearchBot";
import MessageLottieIcon from "../components/MessageLottieIcon";

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

const MENU_GROUPS = [
	{
		title: "Utama",
		items: [
			{ path: "/superadmin/dashboard", label: "Dashboard", icon: FiHome },
			{ path: "/core-dashboard", label: "Core Dashboard", icon: FiBarChart2 },
		],
	},
	{
		title: "Manajemen",
		items: [
			{ path: "/superadmin/users", label: "User Management", icon: FiUsers },
			{ path: "/superadmin/kepegawaian", label: "Kepegawaian", icon: FiBriefcase },
			{ path: "/superadmin/bidang", label: "Bidang & Program", icon: FiLayers },
		],
	},
	{
		title: "Konten",
		items: [
			{ path: "/superadmin/berita", label: "Berita", icon: FiFileText },
			{ path: "/superadmin/hero-gallery", label: "Hero Gallery", icon: FiImage },
		],
	},
	{
		title: "Sistem",
		items: [
			{ path: "/superadmin/activity-logs", label: "Activity Logs", icon: FiActivity },
			{ path: "/superadmin/pesan", label: "Pesan", icon: MessageLottieIcon },
			{ path: "/superadmin/settings", label: "Settings", icon: FiSettings },
		],
	},
];

const isMenuItemActive = (pathname, path) =>
	pathname === path || pathname.startsWith(`${path}/`);

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
			<div className="flex min-h-screen items-center justify-center bg-slate-900">
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
		<div className="min-h-screen bg-slate-50">
			{confirmDialog}

			{isDesktop && (
				<aside
					className={`fixed left-0 top-0 z-40 flex h-full flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
						isSidebarCollapsed ? "w-20" : "w-64"
					}`}
				>
					<div className="flex h-16 flex-shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-3">
						{!isSidebarCollapsed && (
							<div className="flex min-w-0 flex-1 items-center gap-2.5 pl-1">
								<img src="/logo-dpmd.png" alt="DPMD" className="h-9 w-auto" />
								<div className="min-w-0">
									<p className="truncate text-sm font-semibold leading-tight text-slate-900">DPMD</p>
									<p className="truncate text-[11px] leading-tight text-slate-400">Control Panel</p>
								</div>
							</div>
						)}
						<button
							onClick={() => setIsSidebarCollapsed((prev) => !prev)}
							className={`flex-shrink-0 rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 ${
								isSidebarCollapsed ? "mx-auto" : ""
							}`}
							aria-label={isSidebarCollapsed ? "Buka sidebar" : "Tutup sidebar"}
						>
							{isSidebarCollapsed ? (
								<FiMenu className="h-4 w-4" />
							) : (
								<FiChevronLeft className="h-4 w-4" />
							)}
						</button>
					</div>

					<nav className="flex-1 overflow-y-auto px-2.5 py-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200">
						{MENU_GROUPS.map((group) => (
							<div key={group.title} className="mb-4 last:mb-0">
								{!isSidebarCollapsed && (
									<p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
										{group.title}
									</p>
								)}
								<div className="space-y-0.5">
									{group.items.map((item) => {
										const isActive = isMenuItemActive(location.pathname, item.path);
										const Icon = item.icon;

										return (
											<button
												key={item.path}
												onClick={() => navigate(item.path)}
												title={isSidebarCollapsed ? item.label : ""}
												className={`flex w-full items-center rounded-lg px-2.5 py-2 transition-colors duration-150 ${
													isSidebarCollapsed ? "justify-center" : "gap-3"
												} ${
													isActive
														? "bg-slate-900 text-white"
														: "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
												}`}
											>
												<Icon className="h-5 w-5 flex-shrink-0" />
												{!isSidebarCollapsed && (
													<span className="flex-1 truncate text-left text-sm font-medium">
														{item.label}
													</span>
												)}
											</button>
										);
									})}
								</div>
							</div>
						))}
					</nav>

					<div className="flex-shrink-0 border-t border-slate-200 p-2.5">
						<button
							onClick={() => navigate("/superadmin/profile")}
							title={isSidebarCollapsed ? "Profil" : ""}
							className={`flex w-full items-center rounded-lg py-2 transition-colors hover:bg-slate-100 ${
								isSidebarCollapsed ? "justify-center px-1" : "gap-2.5 px-2"
							}`}
						>
							{avatarUrl ? (
								<img
									src={avatarUrl}
									alt={user.nama || user.name || "Superadmin"}
									className="h-9 w-9 flex-shrink-0 rounded-lg object-cover"
								/>
							) : (
								<div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
									<FiShield className="h-4 w-4" />
								</div>
							)}
							{!isSidebarCollapsed && (
								<div className="min-w-0 flex-1 text-left">
									<p className="truncate text-sm font-medium leading-tight text-slate-900">
										{user.nama || user.name || "Superadmin"}
									</p>
									<p className="truncate text-[11px] leading-tight text-slate-500">Super Admin</p>
								</div>
							)}
						</button>

						<button
							onClick={handleLogout}
							title={isSidebarCollapsed ? "Logout" : ""}
							className={`mt-1 flex w-full items-center rounded-lg px-2.5 py-2 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 ${
								isSidebarCollapsed ? "justify-center" : "gap-3"
							}`}
						>
							<FiLogOut className="h-5 w-5 flex-shrink-0" />
							{!isSidebarCollapsed && <span className="text-sm font-medium">Keluar</span>}
						</button>
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
							<div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
								<div>
									<p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Inbox</p>
									<h3 className="text-base font-semibold text-slate-900">Notifikasi</h3>
								</div>
								<button
									onClick={() => setShowNotifications(false)}
									className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
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
													notification.read ? "" : "bg-slate-50"
												}`}
											>
												<div className="flex items-start gap-3">
													<div className={`mt-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${
														notification.read ? "bg-slate-100 text-slate-400" : "bg-slate-900 text-white"
													}`}>
														<FiBell className="h-5 w-5" />
													</div>
													<div className="min-w-0 flex-1">
														<div className="flex items-center gap-2">
															<p className="truncate text-sm font-semibold text-slate-800">{notification.title}</p>
															{!notification.read && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-900"></span>}
														</div>
														<p className="mt-1 line-clamp-2 text-sm text-slate-600">{notification.message}</p>
														<div className="mt-2 flex items-center justify-between gap-3">
															<span className="text-xs text-slate-400">{getNotificationTime(notification)}</span>
															{targetPath && <span className="text-xs font-medium text-slate-500">Buka</span>}
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
				{/* Desktop Header Bar with Search */}
				{isDesktop && (
					<div className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
						<div className="flex items-center justify-between px-6 py-3">
							<div className="flex items-center gap-4">
								<HeaderSearchBot />
							</div>
							<div className="flex items-center gap-3">
								<span className="hidden text-xs font-medium text-slate-400 xl:inline">
									{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
								</span>
								<button
									onClick={openNotifications}
									aria-label="Notifikasi"
									className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
								>
									<FiBell className="h-4 w-4" />
									{unreadCount > 0 && (
										<span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
											{unreadCount > 9 ? "9+" : unreadCount}
										</span>
									)}
								</button>
							</div>
						</div>
					</div>
				)}
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
													<div className="relative flex h-[52px] w-[52px] items-center justify-center rounded-full bg-slate-900 text-white shadow-lg ring-[5px] ring-white transition-transform duration-300 hover:scale-110">
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
													className="absolute -top-0.5 h-1 w-5 rounded-full bg-slate-900"
													transition={{ type: "spring", stiffness: 500, damping: 30 }}
												/>
											)}
											<Icon className={`h-[22px] w-[22px] transition-all duration-200 ${
												isActive ? "scale-110 text-slate-900" : "text-slate-400 group-hover:text-slate-600"
											}`} />
											<span className={`mt-1 text-[9px] font-bold uppercase tracking-wider ${
												isActive ? "text-slate-900" : "text-slate-400"
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

								<div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
									<div className="flex items-start gap-4">
										{avatarUrl ? (
											<img
												src={avatarUrl}
												alt={user.nama || user.name || "Superadmin"}
												className="h-14 w-14 rounded-2xl object-cover shadow-md"
											/>
										) : (
											<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
												<FiShield className="h-6 w-6" />
											</div>
										)}
										<div className="min-w-0 flex-1">
											<p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Control Center</p>
											<h3 className="truncate text-lg font-bold text-slate-900">
												{user.nama || user.name || "Superadmin"}
											</h3>
											<p className="truncate text-sm text-slate-500">{user.email || "superadmin@dpmd"}</p>
											<span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
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
											<div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
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
											<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
												<FiUser className="h-5 w-5" />
											</div>
											<div>
												<p className="text-sm font-semibold text-slate-800">Profil</p>
												<p className="text-xs text-slate-400">Kelola akun superadmin</p>
											</div>
										</button>
									</div>
								</div>

								<div className="max-h-[50vh] overflow-y-auto px-6 py-4">
									{MENU_GROUPS.map((group) => (
										<div key={group.title} className="mb-4 last:mb-0">
											<p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
												{group.title}
											</p>
											<div className="space-y-1">
												{group.items.map((item) => {
													const Icon = item.icon;
													const isActive = isMenuItemActive(location.pathname, item.path);

													return (
														<button
															key={item.path}
															onClick={() => {
																setShowMenu(false);
																navigate(item.path);
															}}
															className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 ${
																isActive
																	? "bg-slate-900 text-white"
																	: "text-slate-700 hover:bg-slate-100"
															}`}
														>
															<Icon className="h-5 w-5 flex-shrink-0" />
															<span className="min-w-0 flex-1 truncate text-sm font-medium">
																{item.label}
															</span>
															<FiChevronRight
																className={`h-4 w-4 ${isActive ? "text-white/70" : "text-slate-300"}`}
															/>
														</button>
													);
												})}
											</div>
										</div>
									))}
								</div>

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
