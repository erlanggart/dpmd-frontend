// src/App.jsx
import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
	useLocation,
	Outlet,
} from "react-router-dom";
import { Suspense, lazy, useEffect, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { useAuth } from "./context/AuthContext";
import { useThemeColor } from "./hooks/useThemeColor";
import { DataCacheProvider } from "./context/DataCacheContext";
import { EditModeProvider } from "./context/EditModeContext.jsx";
import PushNotificationInitializer from "./components/PushNotificationInitializer";
import { registerServiceWorker, subscribeToPushNotifications } from "./utils/pushNotifications";
import { 
	initSessionPersistence,
	setupPeriodicBackup,
	syncSessionAcrossTabs 
} from "./utils/sessionPersistence";
import { setupPeriodicVersionCheck, forceUpdate } from "./utils/versionCheck";
import UpdateNotificationModal from "./components/UpdateNotificationModal";

// Halaman utama di-import langsung untuk performa awal yang lebih cepat
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import BeritaDetailPage from "./pages/BeritaDetailPage";
import BankeuPublicPage from "./pages/BankeuPublicPage";
import NotFound from "./pages/NotFound";
import Forbidden from "./pages/Forbidden";
import Spinner from "./components/ui/Spinner";

// HomeRedirect component - smart redirect based on user state and navigation context
function HomeRedirect() {
	const { user, isCheckingSession } = useAuth();
	const location = useLocation();
	const token = localStorage.getItem('expressToken');
	
	// Wait for session restore before deciding
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
	
	// Not logged in, always show landing page
	if (!token || !user) {
		return <LandingPage />;
	}
	
	// Check if user explicitly navigated to home (e.g., clicked "Back to Home" button)
	const isExplicitNavigation = location.state?.fromNavigation === true;
	
	if (isExplicitNavigation) {
		// User wants to see landing page even if logged in
		return <LandingPage />;
	}
	
	// User is logged in and accessing root - redirect to appropriate dashboard
	if (user && user.role) {
		// Map role to dashboard path
		const roleDashboardMap = {
			'superadmin': '/superadmin/dashboard',
			'kepala_dinas': '/kepala-dinas/dashboard',
			'sekretaris_dinas': '/sekretaris-dinas/dashboard',
			'kepala_bidang': '/kepala-bidang/dashboard',
			'ketua_tim': '/ketua-tim/dashboard',
			'pegawai': '/pegawai/dashboard',
			'desa': '/desa/dashboard',
			'kecamatan': '/kecamatan/dashboard',
			'dinas_terkait': '/dinas/dashboard',
			'verifikator_dinas': '/dinas/dashboard'
		};
		
		const dashboardPath = roleDashboardMap[user.role] || '/dashboard';
		return <Navigate to={dashboardPath} replace />;
	}
	
	// Fallback: show landing page
	return <LandingPage />;
}

// Role constants for better maintainability
const ROLES = {
	SUPERADMIN: "superadmin",
	PMD: "pemberdayaan_masyarakat",
	PMD_ALT: "pmd",
	DESA: "desa",
	KECAMATAN: "kecamatan",
};

// Role groups
const ADMIN_ROLES = [ROLES.SUPERADMIN, ROLES.PMD, ROLES.PMD_ALT];

// Komponen lain di-lazy load untuk code-splitting
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const MainLayout = lazy(() => import("./layouts/MainLayout"));
const HeroGalleryManagement = lazy(() =>
	import("./pages/dashboard/HeroGalleryManagement")
);
const BeritaManagement = lazy(() =>
	import("./pages/dashboard/BeritaManagement")
);
// Admin management pages
const MusdesusMonitoringPage = lazy(() =>
	import("./pages/admin/MusdesusMonitoringPage")
);
// Bidang apps
const BumdesApp = lazy(() => import("./pages/bidang/spked/bumdes"));
const Kelembagaan = lazy(() => import("./pages/bidang/pmd/Kelembagaan"));
const DisposisiRouter = lazy(() => import("./pages/bidang/sekretariat/disposisi/DisposisiRouter"));
const JadwalKegiatanPage = lazy(() => import("./pages/bidang/sekretariat/JadwalKegiatanPage"));
const KelolaNotifikasiPage = lazy(() => import("./pages/bidang/sekretariat/KelolaNotifikasiPage"));
const PerjadinMain = lazy(() => import("./pages/pegawai/perjadin/PerjadinMain"));
const PerjadinDetail = lazy(() => import("./pages/pegawai/perjadin/PerjadinDetail"));
const DesaLayout = lazy(() => import("./layouts/DesaLayout"));
const DesaDashboard = lazy(() => import("./pages/desa/DesaDashboardPage"));
const BumdesDesaPage = lazy(() =>
	import("./pages/desa/bumdes/BumdesDesaPage")
);

// Pegawai routes
const PegawaiLayout = lazy(() => import("./pages/pegawai/PegawaiLayout"));
const PegawaiDashboard = lazy(() => import("./pages/pegawai/PegawaiDashboard"));

// Bidang pages
const SekretariatPage = lazy(() => import("./pages/bidang/SekretariatPage"));
const SpkedPage = lazy(() => import("./pages/bidang/SpkedPage"));
const KKDPage = lazy(() => import("./pages/bidang/KKDPage"));
const PMDPage = lazy(() => import("./pages/bidang/PMDPage"));
const PemdesPage = lazy(() => import("./pages/bidang/PemdesPage"));

const KelembagaanDesaPage = lazy(() =>
	import("./pages/desa/kelembagaan/KelembagaanDesaPage")
);
const KelembagaanList = lazy(() =>
	import("./components/kelembagaan/KelembagaanList")
);
const KelembagaanDetailPage = lazy(() =>
	import("./components/kelembagaan/KelembagaanDetailPage")
);
const AdminKelembagaanDetailPage = lazy(() =>
	import("./pages/bidang/pmd/AdminKelembagaanDetailPage")
);
const PengurusDetailPage = lazy(() =>
	import("./components/kelembagaan/pengurus/PengurusDetailPage")
);
const ProdukHukum = lazy(() =>
	import("./pages/desa/produk-hukum/ProdukHukum")
);
const ProdukHukumDetail = lazy(() =>
	import("./pages/desa/produk-hukum/ProdukHukumDetail")
);
const PengurusEditPage = lazy(() =>
	import("./components/kelembagaan/pengurus/PengurusEditPage")
);
const SettingsPage = lazy(() => import("./pages/dashboard/SettingsPage"));
const DisposisiSurat = lazy(() =>
	import("./pages/dashboard/DisposisiSurat.modern")
);
const DisposisiDetail = lazy(() =>
	import("./pages/dashboard/DisposisiDetail")
);
const CoreDashboardPublic = lazy(() =>
	import("./pages/public/CoreDashboardPublic")
);
const AparaturDesaPage = lazy(() =>
	import("./pages/desa/aparatur-desa/AparaturDesaPage")
);
const AparaturDesaDetailPage = lazy(() =>
	import("./pages/desa/aparatur-desa/AparaturDesaDetailPage")
);
const AparaturDesaEditPage = lazy(() =>
	import("./pages/desa/aparatur-desa/AparaturDesaEditPage")
);
const ProfilDesaPage = lazy(() =>
	import("./pages/desa/ProfilDesaPage")
);
const DesaSettings = lazy(() => import("./pages/desa/DesaSettings"));
const BankeuProposalPage = lazy(() =>
	import("./pages/desa/bankeu/BankeuProposalPage")
);
const KepalaDinasLayout = lazy(() =>
	import("./pages/kepala-dinas/KepalaDinasLayout")
);
const KepalaBidangLayout = lazy(() =>
	import("./pages/kepala-bidang/KepalaBidangLayout")
);
const SekretarisDinasLayout = lazy(() =>
	import("./pages/sekretaris-dinas/SekretarisDinasLayout")
);
const KetuaTimLayout = lazy(() =>
	import("./pages/ketua-tim/KetuaTimLayout")
);
const KetuaTimDashboard = lazy(() =>
	import("./pages/ketua-tim/KetuaTimDashboard")
);
const SuperadminLayout = lazy(() =>
	import("./pages/superadmin/SuperadminLayout")
);
const SuperadminDashboard = lazy(() =>
	import("./pages/superadmin/SuperadminDashboard")
);
const BidangNavigationPage = lazy(() =>
	import("./pages/superadmin/BidangNavigationPage")
);
const ActivityLogsPage = lazy(() =>
	import("./pages/superadmin/ActivityLogsPage")
);
const KecamatanDashboardPage = lazy(() =>
	import("./pages/kecamatan/KecamatanDashboardPage")
);
const KecamatanLayout = lazy(() =>
	import("./layouts/KecamatanLayout")
);
const DinasLayout = lazy(() =>
	import("./layouts/DinasLayout")
);
const BankeuVerificationPage = lazy(() =>
	import("./pages/kecamatan/bankeu/BankeuVerificationPage")
);
const BankeuVerificationDetailPage = lazy(() =>
	import("./pages/kecamatan/bankeu/BankeuVerificationDetailPage")
);
const KecamatanTimVerifikasiPage = lazy(() =>
	import("./pages/kecamatan/bankeu/KecamatanTimVerifikasiPage")
);
const DinasVerificationPage = lazy(() =>
	import("./pages/dinas/DinasVerificationPage")
);
const DinasVerificationDetailPage = lazy(() =>
	import("./pages/dinas/DinasVerificationDetailPage")
);
const DinasConfigPage = lazy(() =>
	import("./pages/dinas/DinasConfigPage")
);
const DinasVerifikatorPage = lazy(() =>
	import("./pages/dinas/DinasVerifikatorPage")
);
const VerifikatorProfilePage = lazy(() =>
	import("./pages/dinas/VerifikatorProfilePage")
);
const DinasDashboardPage = lazy(() =>
	import("./pages/dinas/DinasDashboardPage")
);
const CoreDashboardLayout = lazy(() =>
	import("./layouts/CoreDashboardLayout")
);
const WelcomeDashboard = lazy(() =>
	import("./pages/core-dashboard/WelcomeDashboard")
);
const KepalaDinasDashboard = lazy(() =>
	import("./pages/kepala-dinas/KepalaDinasDashboard")
);
const ProfilePage = lazy(() =>
	import("./pages/common/ProfilePage")
);
const KepalaBidangDashboard = lazy(() =>
	import("./pages/kepala-bidang/KepalaBidangDashboard")
);
const SekretarisDinasDashboard = lazy(() =>
	import("./pages/sekretaris-dinas/SekretarisDinasDashboard")
);
const DashboardOverview = lazy(() =>
	import("./pages/kepala-dinas/DashboardOverview")
);
const LaporanDesa = lazy(() =>
	import("./pages/kepala-dinas/LaporanDesa")
);
const StatistikBumdes = lazy(() =>
	import("./pages/kepala-dinas/StatistikBumdes")
);
const StatistikKelembagaan = lazy(() =>
	import("./pages/core-dashboard/StatistikKelembagaan")
);
const StatistikAdd = lazy(() =>
	import("./pages/kepala-dinas/StatistikAdd")
);
// DD Statistik Sub-categories
const StatistikDdDashboard = lazy(() =>
	import("./pages/kepala-dinas/StatistikDdDashboard")
);
const TrendsPage = lazy(() =>
	import("./pages/kepala-dinas/TrendsPage")
);
const BankeuDashboard = lazy(() =>
	import("./pages/bidang/spked/bankeu/BankeuDashboard")
);
const StatistikBankeuDashboard = lazy(() =>
	import("./pages/kepala-dinas/StatistikBankeuDashboard")
);
const AddDashboard = lazy(() =>
	import("./pages/bidang/kkd/add/AddDashboard")
);
const BhprdDashboard = lazy(() =>
	import("./pages/bidang/kkd/BhprdDashboard")
);
// DD Sub-categories
const DdDashboard = lazy(() =>
	import("./pages/bidang/kkd/dd/DdDashboard")
);
// Statistik untuk Core Dashboard
const StatistikAddDashboard = lazy(() =>
	import("./pages/kepala-dinas/StatistikAddDashboard")
);
// BHPRD Submenu Components
const StatistikBhprdT1 = lazy(() =>
	import("./pages/kepala-dinas/StatistikBhprdT1")
);
const StatistikBhprdT2 = lazy(() =>
	import("./pages/kepala-dinas/StatistikBhprdT2")
);
const StatistikBhprdT3 = lazy(() =>
	import("./pages/kepala-dinas/StatistikBhprdT3")
);
// DD Submenu Components
const StatistikDdEarmarkedT1 = lazy(() =>
	import("./pages/kepala-dinas/StatistikDdEarmarkedT1")
);
const StatistikDdEarmarkedT2 = lazy(() =>
	import("./pages/kepala-dinas/StatistikDdEarmarkedT2")
);
const StatistikDdNonEarmarkedT1 = lazy(() =>
	import("./pages/kepala-dinas/StatistikDdNonEarmarkedT1")
);
const StatistikDdNonEarmarkedT2 = lazy(() =>
	import("./pages/kepala-dinas/StatistikDdNonEarmarkedT2")
);
const StatistikInsentifDd = lazy(() =>
	import("./pages/kepala-dinas/StatistikInsentifDd")
);
const UserManagementPage = lazy(() =>
	import("./pages/dashboard/UserManagementPage")
);
const ManageRolesPage = lazy(() =>
	import("./pages/admin/ManageRolesPage")
);

const ProtectedRoute = ({ children }) => {
	const token = localStorage.getItem("expressToken");
	const { isCheckingSession } = useAuth();
	const location = useLocation();

	// CRITICAL: Wait for session restore (IndexedDB) before deciding to redirect
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

	if (!token) {
		// Simpan lokasi yang dituju agar bisa redirect kembali setelah login
		return <Navigate to="/" state={{ from: location }} replace />;
	}

	return children;
};

const RoleProtectedRoute = ({ children, allowedRoles }) => {
	const { user, isCheckingSession } = useAuth();
	const location = useLocation();

	// CRITICAL: Wait for session restore (IndexedDB) before deciding to redirect
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

	const token = localStorage.getItem("expressToken");

	if (!token) {
		return <Navigate to="/" state={{ from: location }} replace />;
	}

	// Check if user role is allowed
	if (allowedRoles) {
		const userRole = user?.role;
		
		// Check if user role is in allowed roles
		const hasAccess = userRole && allowedRoles.includes(userRole);
		
		if (!hasAccess) {
			// Access denied - redirect to forbidden page
			return <Navigate to="/forbidden" replace />;
		}
	}

	return children || <Outlet />;
};

// Component wrapper untuk theme color hook
const ThemeColorWrapper = ({ children }) => {
	const location = useLocation();
	const { user } = useAuth();
	useThemeColor();
	
	// Dismiss all toasts on route change to prevent stuck toasts
	useEffect(() => {
		toast.dismiss();
	}, [location.pathname]);

	// Initialize PWA and Push Notifications on mount (only for logged in users)
	useEffect(() => {
		let isInitialized = false;
		
		const initPWA = async () => {
			if (isInitialized) return;
			isInitialized = true;
			
			try {
				// Register service worker
				await registerServiceWorker();

				// Message handler function
				const handleServiceWorkerMessage = (event) => {
					
					// Handle push notification received (from SW push event)
					if (event.data && event.data.type === 'PUSH_NOTIFICATION_RECEIVED') {
						const notifData = event.data.payload;
						
						// Play notification sound - ALWAYS play regardless of message flag
						try {
						const audio = new Audio('/dpmd.mp3');
							audio.volume = 1.0; // Full volume
							const playPromise = audio.play();
							if (playPromise !== undefined) {
								playPromise
									.then(() => {
										console.log('🔊 Notification sound played successfully');
									})
									.catch(err => {
										console.warn('⚠️ Could not play notification sound:', err.message);
									});
							}
						} catch (err) {
							console.error('❌ Error creating audio:', err);
						}
						
					// Show toast ONLY if app is visible (foreground)
					// Browser notification already shown by service worker for background
					if (document.visibilityState === 'visible') {
						toast.success(
							<div className="flex flex-col gap-1">
								<div className="font-bold">{notifData.title || 'Notifikasi Baru'}</div>
								<div className="text-sm">{notifData.body || 'Anda memiliki notifikasi baru'}</div>
							</div>,
							{
								duration: 6000,
								icon: '🔔',
								style: {
									background: '#1e40af',
									color: '#fff',
									maxWidth: '450px',
									padding: '16px'
								}
							}
						);
					}
					
					// Trigger notification event for layouts to refresh notification count
					window.dispatchEvent(new CustomEvent('newNotification', { detail: notifData }));
				}
					
					// Handle notification click navigation
					if (event.data && event.data.type === 'NOTIFICATION_CLICK_NAVIGATE') {
						const { url, notificationData } = event.data;
						const notifType = notificationData?.type || '';
						
						// Smart routing based on notification type and user role
						if (notifType.includes('disposisi') || notifType === 'new_disposisi' || notifType === 'disposisi_update') {
							// Get user role from localStorage to determine correct disposisi route
							const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
							const userRole = storedUser.role || '';
							
							const roleRouteMap = {
								'kepala_dinas': '/kepala-dinas/disposisi',
								'sekretaris_dinas': '/sekretaris-dinas/disposisi',
								'kepala_bidang': '/kepala-bidang/disposisi',
								'ketua_tim': '/ketua-tim/disposisi',
								'pegawai': '/pegawai/disposisi',
								'superadmin': '/kepala-dinas/disposisi',
							};
							
							let targetUrl = roleRouteMap[userRole] || '/pegawai/disposisi';
							
							// If notification has a specific disposisi ID, navigate to detail
							if (notificationData?.disposisi_id) {
								targetUrl = `${targetUrl}/${notificationData.disposisi_id}`;
							}
							
							console.log(`[App] Navigating to disposisi: ${targetUrl} (role: ${userRole})`);
							window.location.href = targetUrl;
						} else if (url && url !== '/') {
							window.location.href = url;
						}
					}
					
					// Legacy handler for backward compatibility
					if (event.data && event.data.type === 'NEW_NOTIFICATION') {
						const notifData = event.data.payload;
						
						// Play notification sound
						try {
						const audio = new Audio('/dpmd.mp3');
							audio.volume = 1.0; // Full volume
							const playPromise = audio.play();
							if (playPromise !== undefined) {
								playPromise
									.then(() => console.log('🔊 Legacy notification sound played'))
									.catch(err => console.warn('⚠️ Could not play sound:', err.message));
							}
						} catch (err) {
							console.error('❌ Error creating audio:', err);
						}
						
					// Show toast only if app is visible (foreground)
					if (document.visibilityState === 'visible') {
						toast.success(
							<div className="flex flex-col gap-1">
								<div className="font-bold">{notifData.title || 'Notifikasi Baru'}</div>
								<div className="text-sm">{notifData.body || 'Anda memiliki notifikasi baru'}</div>
							</div>,
							{
								duration: 5000,
								icon: '🔔',
								style: {
									background: '#1e40af',
									color: '#fff',
									maxWidth: '400px'
								}
							}
						);
					}
					}
				};

				// Listen for messages from service worker (untuk auto-refresh data)
				if ('serviceWorker' in navigator) {
					navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
				}

				// Auto-initialize push notifications for logged in users
				if (user && localStorage.getItem('expressToken')) {
					// Wait a bit for SW to be ready
					setTimeout(async () => {
						const permission = Notification.permission;
						
						// Only auto-init if already granted (from login page)
						if (permission === 'granted') {
							try {
								await subscribeToPushNotifications();
							} catch (err) {
								console.error('Background push subscription failed:', err);
							}
						}
					}, 1000);
				}
			} catch (error) {
				console.error('Error initializing PWA:', error);
			}
		};

		initPWA();
	}, [user]);
	
	return children;
};

function App() {
	const [showUpdateModal, setShowUpdateModal] = useState(false);

	// Initialize session persistence on app start
	useEffect(() => {
		// Initialize IndexedDB for session backup
		initSessionPersistence();
		
		// Setup periodic backup to IndexedDB (every 5 minutes + before unload)
		setupPeriodicBackup();
		
		// Sync session across tabs
		syncSessionAcrossTabs();
	}, []);

	// Setup version checking
	useEffect(() => {
		
		// Setup periodic version check
		const cleanup = setupPeriodicVersionCheck(() => {
			// New version detected
			setShowUpdateModal(true);
		});
		
		return cleanup;
	}, []);

	const handleUpdate = async () => {
		// User initiated update
		setShowUpdateModal(false);
		await forceUpdate();
	};

	const handleDismissUpdate = () => {
		// User dismissed update
		setShowUpdateModal(false);
	};

	return (
		<Router>
			<DataCacheProvider>
			<EditModeProvider>
			<ThemeColorWrapper>
				<Suspense
					fallback={
						<div className="flex h-screen items-center justify-center">
							<Spinner />
						</div>
					}
				>
					<Routes>
					{/* Rute yang di-load secara statis */}
					<Route path="/" element={<HomeRedirect />} />
					<Route path="/berita/:slug" element={<BeritaDetailPage />} />
					<Route path="/bantuan-keuangan" element={<BankeuPublicPage />} />
					<Route path="/public-dashboard" element={<CoreDashboardPublic />} />
				<Route path="/login" element={<LoginPage />} />
				
				{/* Rute Desa - Exclusive untuk role: desa */}
					<Route
						path="/desa"
						element={
							<RoleProtectedRoute allowedRoles={['desa']}>
								<DesaLayout />
							</RoleProtectedRoute>
						}
					>
					<Route path="dashboard" element={<DesaDashboard />} />
					<Route path="profil-desa" element={<ProfilDesaPage />} />
					<Route path="bumdes" element={<BumdesDesaPage />} />
					<Route path="kelembagaan" element={<KelembagaanDesaPage />} />
					<Route path="kelembagaan/:type" element={<KelembagaanList />} />
					<Route path="kelembagaan/:type/:id" element={<KelembagaanDetailPage />} />
					<Route path="pengurus/:id" element={<PengurusDetailPage />} />
					<Route path="pengurus/:id/edit" element={<PengurusEditPage />} />
						<Route path="aparatur-desa" element={<AparaturDesaPage />} />
						<Route path="aparatur-desa/:id" element={<AparaturDesaDetailPage />} />
						<Route path="aparatur-desa/:id/edit" element={<AparaturDesaEditPage />} />
						<Route path="produk-hukum" element={<ProdukHukum />} />
						<Route path="produk-hukum/:id" element={<ProdukHukumDetail />} />
						<Route path="bankeu" element={<BankeuProposalPage />} />
						<Route path="settings" element={<DesaSettings />} />
					</Route>

					{/* Rute Pegawai - Untuk role: pegawai dan kepala bidang */}
					<Route
						path="/pegawai"
						element={
							<RoleProtectedRoute allowedRoles={['pegawai', 'kepala_bidang', 'ketua_tim']}>
								<PegawaiLayout />
							</RoleProtectedRoute>
						}
					>
						<Route index element={<Navigate to="dashboard" replace />} />
						<Route path="dashboard" element={<PegawaiDashboard />} />				<Route path="profile" element={<ProfilePage />} />						<Route path="disposisi" element={<DisposisiSurat />} />
						<Route path="disposisi/:id" element={<DisposisiDetail />} />
						<Route path="jadwal-kegiatan" element={<JadwalKegiatanPage />} />
						<Route path="perjadin" element={<PerjadinMain />} />
							<Route path="perjadin/detail/:id" element={<PerjadinDetail />} />
					</Route>

					{/* Rute Bidang - Accessible by pegawai/kepala_bidang/ketua_tim (their own bidang) & kepala_dinas/superadmin (all) */}
					<Route
						path="/bidang"
						element={
							<RoleProtectedRoute allowedRoles={['pegawai', 'kepala_bidang', 'ketua_tim', 'kepala_dinas', 'superadmin']}>
								<PegawaiLayout />
							</RoleProtectedRoute>
						}
				>
					{/* Sekretariat */}
					<Route path="sekretariat" element={<SekretariatPage />} />
					
					{/* SPKED (Sarana Prasarana Kewilayahan dan Ekonomi Desa) */}
					<Route path="spked" element={<SpkedPage />} />
					
					{/* KKD (Kekayaan dan Keuangan Desa) */}
					<Route path="kkd" element={<KKDPage />} />
					
					{/* Pemdes (Pemerintahan Desa) */}
					<Route path="pemdes" element={<PemdesPage />} />
					
					{/* Detail Disposisi - Accessible dari semua bidang */}
					<Route path="disposisi/:id" element={<DisposisiDetail />} />
				</Route>

					{/* Rute Bidang PMD - Menggunakan MainLayout (dipisah dari bidang lainnya) */}
					<Route
						path="/bidang/pmd"
						element={
							<RoleProtectedRoute allowedRoles={['pegawai', 'kepala_bidang', 'ketua_tim', 'kepala_dinas', 'superadmin']}>
								<MainLayout />
							</RoleProtectedRoute>
						}
					>
						{/* PMD (Pemberdayaan Masyarakat Desa) */}
						<Route index element={<PMDPage />} />
						<Route path="core-dashboard" element={<WelcomeDashboard />} />
						<Route path="kelembagaan" element={<Kelembagaan />} />
						<Route path="kelembagaan/admin/:desaId" element={<AdminKelembagaanDetailPage />} />
						<Route path="kelembagaan/admin/:desaId/:type" element={<KelembagaanList />} />
						<Route path="kelembagaan/:type" element={<KelembagaanList />} />
						<Route path="kelembagaan/:type/:id" element={<KelembagaanDetailPage />} />
						<Route path="pengurus/:id" element={<PengurusDetailPage />} />
						<Route path="pengurus/:id/edit" element={<PengurusEditPage />} />
					</Route>					{/* Routes KKD - Nested under /kkd */}
					<Route
						path="/kkd"
						element={
							<RoleProtectedRoute allowedRoles={['pegawai', 'kepala_bidang', 'ketua_tim', 'kepala_dinas', 'superadmin']}>
								<PegawaiLayout />
							</RoleProtectedRoute>
						}
					>
						<Route path="add" element={<AddDashboard />} />
						<Route path="bhprd" element={<BhprdDashboard />} />
						<Route path="dd" element={<DdDashboard />} />
					</Route>

					{/* Routes Sekretariat - Nested under /sekretariat (moved from /pegawai) */}
					<Route
						path="/sekretariat"
						element={
							<RoleProtectedRoute allowedRoles={['pegawai', 'kepala_bidang', 'ketua_tim', 'kepala_dinas', 'superadmin', 'sekretaris_dinas']}>
								<PegawaiLayout />
							</RoleProtectedRoute>
						}
					>
						<Route path="disposisi" element={<DisposisiRouter />} />
						<Route path="disposisi/:id" element={<DisposisiDetail />} />
						<Route path="pegawai" element={<UserManagementPage />} />
						<Route path="jadwal-kegiatan" element={<JadwalKegiatanPage />} />
						<Route path="perjadin" element={<PerjadinMain />} />
							<Route path="perjadin/detail/:id" element={<PerjadinDetail />} />
						<Route path="notifikasi" element={<KelolaNotifikasiPage />} />
					</Route>

					{/* Rute Ketua Tim - Untuk role: ketua_tim */}
					<Route
						path="/ketua-tim"
						element={
							<RoleProtectedRoute allowedRoles={['ketua_tim']}>
								<KetuaTimLayout />
							</RoleProtectedRoute>
						}
					>
						<Route index element={<Navigate to="dashboard" replace />} />
						<Route path="dashboard" element={<KetuaTimDashboard />} />
						<Route path="profile" element={<ProfilePage />} />
						<Route path="disposisi" element={<DisposisiSurat />} />
						<Route path="disposisi/:id" element={<DisposisiDetail />} />
						<Route path="jadwal-kegiatan" element={<JadwalKegiatanPage />} />
					</Route>

					{/* Rute Superadmin - Full System Control */}
					<Route
						path="/superadmin"
						element={
							<RoleProtectedRoute allowedRoles={['superadmin']}>
								<SuperadminLayout />
						</RoleProtectedRoute>
					}
				>
					<Route index element={<Navigate to="dashboard" replace />} />
					<Route path="dashboard" element={<SuperadminDashboard />} />
					<Route path="users" element={<UserManagementPage />} />
					{/* Role Management removed - already in User Management tabs */}
					<Route path="bidang" element={<BidangNavigationPage />} />
					<Route path="activity-logs" element={<ActivityLogsPage />} />
					<Route path="berita" element={<BeritaManagement />} />
					<Route path="hero-gallery" element={<HeroGalleryManagement />} />
					<Route path="musdesus" element={<MusdesusMonitoringPage />} />
					<Route path="settings" element={<SettingsPage />} />
					<Route path="profile" element={<ProfilePage />} />
				</Route>

				{/* Rute Kecamatan - Exclusive untuk Admin Kecamatan */}
				<Route
					path="/kecamatan"
					element={
						<RoleProtectedRoute allowedRoles={['kecamatan']}>
							<KecamatanLayout />
						</RoleProtectedRoute>
					}
				>
					<Route index element={<Navigate to="dashboard" replace />} />
					<Route path="dashboard" element={<KecamatanDashboardPage />} />
					<Route path="bankeu" element={<BankeuVerificationPage />} />
					<Route path="bankeu/verifikasi/:desaId" element={<BankeuVerificationDetailPage />} />
					<Route path="bankeu/tim-verifikasi/:desaId" element={<KecamatanTimVerifikasiPage />} />
				</Route>

				{/* Rute Dinas Terkait - Untuk verifikasi teknis */}
				<Route
					path="/dinas"
					element={
						<RoleProtectedRoute allowedRoles={['dinas_terkait', 'verifikator_dinas']}>
							<DinasLayout />
						</RoleProtectedRoute>
					}
				>
				<Route index element={<Navigate to="dashboard" replace />} />
				<Route path="dashboard" element={<DinasDashboardPage />} />
				<Route path="bankeu" element={<DinasVerificationPage />} />
				<Route path="bankeu/verifikasi/:proposalId" element={<DinasVerificationDetailPage />} />
				<Route path="konfigurasi" element={<DinasConfigPage />} />
				<Route path="verifikator" element={<DinasVerifikatorPage />} />
				<Route path="profil" element={<VerifikatorProfilePage />} />
			</Route>

				{/* Rute Kepala Dinas - Exclusive untuk Kepala Dinas */}
				<Route
					path="/kepala-dinas"
					element={
						<RoleProtectedRoute allowedRoles={['superadmin', 'kepala_dinas']}>						<KepalaDinasLayout />
					</RoleProtectedRoute>
				}
			>
				<Route index element={<Navigate to="dashboard" replace />} />
				<Route path="dashboard" element={<KepalaDinasDashboard />} />
				<Route path="profile" element={<ProfilePage />} />
				<Route path="disposisi" element={<DisposisiSurat />} />
				<Route path="disposisi/:id" element={<DisposisiDetail />} />
				<Route path="jadwal-kegiatan" element={<JadwalKegiatanPage />} />
				<Route path="perjadin" element={<PerjadinMain />} />
				<Route path="perjadin/detail/:id" element={<PerjadinDetail />} />
			</Route>
					{/* Rute Kepala Bidang - Exclusive untuk Kepala Bidang */}
					<Route
						path="/kepala-bidang"
						element={
							<RoleProtectedRoute allowedRoles={['superadmin', 'kepala_bidang']}>
								<KepalaBidangLayout />
							</RoleProtectedRoute>
						}
					>
						<Route index element={<Navigate to="dashboard" replace />} />
						<Route path="dashboard" element={<KepalaBidangDashboard />} />				<Route path="profile" element={<ProfilePage />} />						<Route path="disposisi" element={<DisposisiSurat />} />
						<Route path="disposisi/:id" element={<DisposisiDetail />} />
						<Route path="jadwal-kegiatan" element={<JadwalKegiatanPage />} />
					</Route>

					{/* Rute Sekretaris Dinas - Exclusive untuk Sekretaris Dinas */}
					<Route
						path="/sekretaris-dinas"
						element={
							<RoleProtectedRoute allowedRoles={['superadmin', 'sekretaris_dinas']}>
								<SekretarisDinasLayout />
							</RoleProtectedRoute>
						}
					>
						<Route index element={<Navigate to="dashboard" replace />} />
						<Route path="dashboard" element={<SekretarisDinasDashboard />} />				<Route path="profile" element={<ProfilePage />} />						<Route path="disposisi" element={<DisposisiSurat />} />
						<Route path="disposisi/:id" element={<DisposisiDetail />} />
						<Route path="jadwal-kegiatan" element={<JadwalKegiatanPage />} />
						<Route path="perjadin" element={<PerjadinMain />} />
							<Route path="perjadin/detail/:id" element={<PerjadinDetail />} />
					</Route>

					{/* Rute Core Dashboard - DPMD Internal Only */}
					{/* HANYA untuk: Super Admin, Kepala Dinas, Sekretaris Dinas, Kepala Bidang, Ketua Tim, Pegawai */}
					{/* TIDAK BOLEH diakses oleh: desa, kecamatan */}
					<Route
						path="/core-dashboard"
						element={
							<RoleProtectedRoute allowedRoles={['superadmin', 'kepala_dinas', 'sekretaris_dinas', 'kepala_bidang', 'ketua_tim', 'pegawai']}>
								<CoreDashboardLayout />
							</RoleProtectedRoute>
						}
					>
					<Route index element={<Navigate to="dashboard" replace />} />
					<Route path="dashboard" element={<WelcomeDashboard />} />
					<Route path="laporan-desa" element={<LaporanDesa />} />
					<Route path="statistik-bumdes" element={<StatistikBumdes />} />
					<Route path="statistik-kelembagaan" element={<StatistikKelembagaan />} />
					<Route path="statistik-bankeu" element={<StatistikBankeuDashboard />} />
					<Route path="statistik-add" element={<StatistikAddDashboard />} />
					<Route path="statistik-bhprd" element={<BhprdDashboard />} />
					{/* BHPRD Submenu Routes */}
					<Route path="statistik-bhprd-tahap1" element={<StatistikBhprdT1 />} />
					<Route path="statistik-bhprd-tahap2" element={<StatistikBhprdT2 />} />
					<Route path="statistik-bhprd-tahap3" element={<StatistikBhprdT3 />} />
					<Route path="statistik-dd" element={<StatistikDdDashboard />} />
					{/* DD Submenu Routes */}
					<Route path="statistik-dd-earmarked-tahap1" element={<StatistikDdEarmarkedT1 />} />
					<Route path="statistik-dd-earmarked-tahap2" element={<StatistikDdEarmarkedT2 />} />
					<Route path="statistik-dd-nonearmarked-tahap1" element={<StatistikDdNonEarmarkedT1 />} />
					<Route path="statistik-dd-nonearmarked-tahap2" element={<StatistikDdNonEarmarkedT2 />} />
					<Route path="statistik-insentif-dd" element={<StatistikInsentifDd />} />
					<Route path="trends" element={<TrendsPage />} />
					</Route>

					{/* Error Pages */}
					<Route path="/forbidden" element={<Forbidden />} />
					<Route path="/404" element={<NotFound />} />
					<Route path="*" element={<NotFound />} />
				</Routes>

			</Suspense>
			<Toaster
				position="top-right"
				reverseOrder={false}
				gutter={8}
				containerClassName=""
				containerStyle={{}}
				toastOptions={{
					// Define default options
					className: "",
					duration: 4000,
					style: {
						background: "#363636",
						color: "#fff",
					},
					// Default options for specific types
					success: {
						duration: 3000,
						theme: {
							primary: "green",
							secondary: "black",
						},
					},
					error: {
						duration: 4000,
					},
				}}
			/>

			{/* Update Notification Modal */}
			<UpdateNotificationModal
				isOpen={showUpdateModal}
				onUpdate={handleUpdate}
				onDismiss={handleDismissUpdate}
			/>

			</ThemeColorWrapper>
			</EditModeProvider>
			</DataCacheProvider>
		</Router>
	);
}

export default App;
