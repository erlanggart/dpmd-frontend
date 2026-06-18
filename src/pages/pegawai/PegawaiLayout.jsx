// src/pages/pegawai/PegawaiLayout.jsx
import React from "react";
import { Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import { FiHome, FiUser, FiLogOut, FiMenu, FiMail, FiBell, FiCalendar, FiBarChart2, FiFileText, FiDollarSign, FiUsers, FiBriefcase } from "react-icons/fi";
import { Landmark } from "lucide-react";
import FaceVerificationLottieIcon from "../../components/FaceVerificationLottieIcon";
import { performFullLogout } from "../../utils/sessionPersistence";
import { useConfirm } from "../../hooks/useConfirm.jsx";
import { subscribeToPushNotifications } from "../../utils/pushNotifications";
import toast from 'react-hot-toast';
import api from "../../api";
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
		
		// Listen for new push notifications to refresh immediately
		const handleNewNotification = () => {
			fetchNotifications();
		};
		window.addEventListener('newNotification', handleNewNotification);
		
		return () => {
			clearInterval(interval);
			window.removeEventListener('newNotification', handleNewNotification);
		};
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
		const notifType = notification.data?.type || notification.type || '';
		if (notifType === 'today_schedule' || notifType === 'tomorrow_schedule') {
			const targetDate = notification.data?.targetDate || '';
			const dateParam = targetDate ? `?tanggal=${targetDate}` : '';
			navigate(`/dpmd/jadwal-kegiatan${dateParam}`);
		} else if (notification.type === 'disposisi') {
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
					try {
						await subscribeToPushNotifications();
					} catch (err) {
						console.warn('[Pegawai] Push notification subscription failed:', err);
					}
				}
			}
		};

		initPushNotifications();
	}, [token, user.role]);

	// Check if user has valid role for PegawaiLayout
	const validRoles = [
		'pegawai', 
		'kepala_bidang',
		'ketua_tim',
		'kepala_dinas',
		'superadmin',
		'sekretaris_dinas'
	];

	if (!token || !user.role || !validRoles.includes(user.role)) {
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

	const isOnAbsensi = location.pathname.startsWith('/pegawai/absensi');
	const bottomNavItems = [
		{ path: "/pegawai/dashboard", label: "Home", icon: FiHome },
		{ path: "/pegawai/absensi", label: "Presensi", icon: FaceVerificationLottieIcon, isMain: true },
		...(isOnAbsensi
			? [{ path: "/pegawai/absensi?tab=riwayat", label: "Riwayat", icon: FiCalendar }]
			: [{ path: "/pegawai/profile", label: "Profil", icon: FiUser }]
		),
	];

	return (
		<div className="min-h-screen bg-gray-50 pb-20">
			{/* Main Content */}
			<main className="min-h-screen">
				<Outlet />
			</main>

			{/* Bottom Navigation - Orange Theme */}
			<nav className="fixed bottom-3 left-3 right-3 bg-white border border-orange-200 shadow-lg z-50 rounded-2xl">
				<div className="max-w-lg mx-auto px-4">
					<div className="flex items-end justify-around py-2">
						{bottomNavItems.map((item, index) => {
							const itemPath = item.path.split('?')[0];
							const itemQuery = item.path.includes('?') ? item.path.split('?')[1] : null;
							const isActive = itemQuery
								? location.pathname === itemPath && location.search === `?${itemQuery}`
								: location.pathname === item.path || 
									(item.path === '/pegawai/absensi' && location.pathname.startsWith('/pegawai/absensi') && !location.search);
							const Icon = item.icon;
							
							// Main button (Jadwal Kegiatan) - larger & elevated
							if (item.isMain) {
								return (
									<button
										key={index}
										onClick={() => navigate(item.path)}
										className="relative flex flex-col items-center -mt-5"
									>
										<div className={`flex items-center justify-center h-14 w-14 rounded-full shadow-lg transition-all duration-200 ${
											isActive
												? "bg-gradient-to-br from-orange-500 to-orange-700 text-white scale-110"
												: "bg-gradient-to-br from-orange-400 to-orange-600 text-white hover:scale-105"
										}`}>
											<Icon className="h-7 w-7" />
										</div>
										<span className={`text-[11px] mt-1 font-semibold ${
											isActive ? "text-orange-700" : "text-gray-500"
										}`}>{item.label}</span>
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
									className={`relative flex flex-col items-center justify-center px-4 py-1 rounded-xl transition-all duration-200 ${
										isActive 
											? "text-orange-700" 
											: "text-gray-400 hover:text-orange-600"
									}`}
								>
									<Icon className="h-6 w-6" />
									<span className={`text-[11px] mt-1 font-medium ${
										isActive ? "text-orange-700" : "text-gray-400"
									}`}>{item.label}</span>
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
										navigate("/pegawai/profile");
									}}
									className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-orange-50 transition-colors text-left"
								>
									<div className="h-12 w-12 bg-orange-100 rounded-xl flex items-center justify-center">
										<FiUser className="h-6 w-6 text-orange-600" />
									</div>
									<div>
										<h4 className="font-semibold text-gray-800">Profil Saya</h4>
										<p className="text-sm text-gray-500">Lihat & edit profil</p>
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
											className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-orange-50 transition-colors text-left"
										>
											<div className="h-12 w-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
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
