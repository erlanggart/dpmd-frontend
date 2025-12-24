// src/App.jsx
import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
	useLocation,
	Outlet,
} from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import { useAuth } from "./context/AuthContext";
import { useThemeColor } from "./hooks/useThemeColor";
import { DataCacheProvider } from "./context/DataCacheContext";
import { registerServiceWorker, subscribeToPushNotifications } from "./utils/pushNotifications";

// Halaman utama di-import langsung untuk performa awal yang lebih cepat
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import BeritaDetailPage from "./pages/BeritaDetailPage";
import BankeuPublicPage from "./pages/BankeuPublicPage";
import NotFound from "./pages/NotFound";
import Forbidden from "./pages/Forbidden";
import Spinner from "./components/ui/Spinner";

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
const BumdesApp = lazy(() => import("./pages/sarpras/Bumdes-app"));
const Kelembagaan = lazy(() => import("./pages/PMD/Kelembagaan"));
const PerjalananDinas = lazy(() => import("./pages/sekretariat/perjadin"));
const DesaLayout = lazy(() => import("./layouts/DesaLayout"));
const DesaDashboard = lazy(() => import("./pages/desa/DesaDashboardPage"));
const BumdesDesaPage = lazy(() =>
	import("./pages/desa/bumdes/BumdesDesaPage")
);

// Pegawai routes
const PegawaiLayout = lazy(() => import("./pages/pegawai/PegawaiLayout"));
const PegawaiDashboard = lazy(() => import("./pages/pegawai/PegawaiDashboard"));
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
	import("./pages/PMD/AdminKelembagaanDetailPage")
);
const PengurusDetailPage = lazy(() =>
	import("./pages/desa/pengurus/PengurusDetailPage")
);
const ProdukHukum = lazy(() =>
	import("./pages/desa/produk-hukum/ProdukHukum")
);
const ProdukHukumDetail = lazy(() =>
	import("./pages/desa/produk-hukum/ProdukHukumDetail")
);
const PengurusEditPage = lazy(() =>
	import("./pages/desa/pengurus/PengurusEditPage")
);
const SettingsPage = lazy(() => import("./pages/dashboard/SettingsPage"));
const DisposisiSurat = lazy(() =>
	import("./pages/dashboard/DisposisiSurat")
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
const DesaSettings = lazy(() => import("./pages/desa/DesaSettings"));
const KepalaDinasLayout = lazy(() =>
	import("./pages/kepala-dinas/KepalaDinasLayout")
);
const KepalaBidangLayout = lazy(() =>
	import("./pages/kepala-bidang/KepalaBidangLayout")
);
const SekretarisDinasLayout = lazy(() =>
	import("./pages/sekretaris-dinas/SekretarisDinasLayout")
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
const StatistikPerjadin = lazy(() =>
	import("./pages/kepala-dinas/StatistikPerjadin")
);
const StatistikAdd = lazy(() =>
	import("./pages/kepala-dinas/StatistikAdd")
);
const LottieTest = lazy(() =>
	import("./pages/test/LottieTest")
);
// DD Statistik Sub-categories
const StatistikDdDashboard = lazy(() =>
	import("./pages/kepala-dinas/StatistikDdDashboard")
);
const TrendsPage = lazy(() =>
	import("./pages/kepala-dinas/TrendsPage")
);
const BankeuDashboard = lazy(() =>
	import("./pages/sarana-prasarana/bankeu/BankeuDashboard")
);
const StatistikBankeuDashboard = lazy(() =>
	import("./pages/kepala-dinas/StatistikBankeuDashboard")
);
const AddDashboard = lazy(() =>
	import("./pages/kkd/add/AddDashboard")
);
const BhprdDashboard = lazy(() =>
	import("./pages/kkd/BhprdDashboard")
);
// DD Sub-categories
const DdDashboard = lazy(() =>
	import("./pages/kkd/dd/DdDashboard")
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

const ProtectedRoute = ({ children }) => {
	const token = localStorage.getItem("expressToken");
	const location = useLocation();

	if (!token) {
		console.log("🔒 ProtectedRoute: No token found, redirecting to login");
		// Simpan lokasi yang dituju agar bisa redirect kembali setelah login
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	// Allow VPN access token to bypass normal auth
	if (token === 'VPN_ACCESS_TOKEN') {
		console.log("✅ ProtectedRoute: VPN access token detected, allowing access");
		return children;
	}

	console.log("✅ ProtectedRoute: Token found, allowing access");
	return children;
};

const RoleProtectedRoute = ({ children, allowedRoles }) => {
	const token = localStorage.getItem("expressToken");
	const { user } = useAuth();
	const location = useLocation();

	if (!token) {
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	// Check if user role is allowed
	if (allowedRoles) {
		const userRole = user?.role;
		
		// Check if user role is in allowed roles
		const hasAccess = userRole && allowedRoles.includes(userRole);
		
		if (!hasAccess) {
			console.log(`🚫 Access denied: User role "${userRole}" not in allowed roles:`, allowedRoles);
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
		const initPWA = async () => {
			try {
				// Register service worker
				await registerServiceWorker();
				console.log('✅ [App] PWA Service Worker registered');

				// Message handler function
				const handleServiceWorkerMessage = (event) => {
					console.log('[App] 📨 Message from SW:', event.data);
					
					// Handle push notification received (from SW push event)
					if (event.data && event.data.type === 'PUSH_NOTIFICATION_RECEIVED') {
						const notifData = event.data.payload;
						console.log('[App] 🔔 Showing popup for:', notifData);
						
						// Show toast notification popup on screen
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
						
						// Trigger custom event untuk refresh data tanpa reload
						window.dispatchEvent(new CustomEvent('newNotification', {
							detail: notifData
						}));
						console.log('✅ [App] Notification popup shown & event dispatched');
						
						// Auto-reload current page setelah 2 detik (beri waktu user lihat toast)
						setTimeout(() => {
							console.log('🔄 [App] Auto-reloading page after notification...');
							window.location.reload();
						}, 2000);
					}
					
					// Handle notification click navigation
					if (event.data && event.data.type === 'NOTIFICATION_CLICK_NAVIGATE') {
						const { url } = event.data;
						console.log('📍 Navigating from notification click:', url);
						
						if (url) {
							window.location.href = url;
						}
					}
					
					// Legacy handler for backward compatibility
					if (event.data && event.data.type === 'NEW_NOTIFICATION') {
						const notifData = event.data.payload;
						console.log('[App] 🔔 Legacy notification handler');
						
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
						
						window.dispatchEvent(new CustomEvent('newNotification', {
							detail: notifData
						}));
					}
				};

				// Listen for messages from service worker (untuk auto-refresh data)
				if ('serviceWorker' in navigator) {
					navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
					console.log('✅ [App] Service Worker message listener attached');
				}

				// Auto-initialize push notifications for logged in users
				if (user && localStorage.getItem('expressToken')) {
					// Wait a bit for SW to be ready
					setTimeout(async () => {
						const permission = Notification.permission;
						
						// Only auto-init if already granted (from login page)
						if (permission === 'granted') {
							console.log('Auto-initializing push notifications for logged in user');
							try {
								const subscription = await subscribeToPushNotifications();
								if (subscription) {
									console.log('✅ Background push subscription successful');
								}
							} catch (err) {
								console.warn('Background push subscription failed:', err);
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
	return (
		<Router>
			<DataCacheProvider>
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
					<Route path="/" element={<LandingPage />} />
					<Route path="/berita/:slug" element={<BeritaDetailPage />} />
					<Route path="/bantuan-keuangan" element={<BankeuPublicPage />} />
					<Route path="/public-dashboard" element={<CoreDashboardPublic />} />
				<Route path="/login" element={<LoginPage />} />
				<Route path="/test-lottie" element={<LottieTest />} />
				{/* Rute Admin/Dashboard dengan lazy loading */}
					<Route
						path="/dashboard"
						element={
							<ProtectedRoute allowedRoles={['superadmin', 'admin', 'pegawai', 'kepala_dinas', 'kepala_bidang', 'sekretaris_dinas', 'sarana_prasarana', 'kekayaan_keuangan']}>
								<MainLayout />
							</ProtectedRoute>
						}
					>
						{/* Dashboard Home - Accessible by all authenticated users */}
						<Route index element={<DashboardPage />} />
						
					{/* Data Management - Accessible by all authenticated users */}
				<Route path="bumdes" element={<BumdesApp />} />
				<Route path="kelembagaan" element={<Kelembagaan />} />
				<Route path="kelembagaan/admin/:desaId" element={<AdminKelembagaanDetailPage />} />
				<Route path="kelembagaan/:type" element={<KelembagaanList />} />
				<Route path="kelembagaan/:type/:id" element={<KelembagaanDetailPage />} />
				<Route path="perjalanan-dinas" element={<PerjalananDinas />} />
					
					{/* Admin Only Routes (Super Admin & Admin) */}
						<Route element={<RoleProtectedRoute allowedRoles={['superadmin', 'admin', 'sarana_prasarana', 'kekayaan_keuangan','sekretariat']} />}>
							<Route path="hero-gallery" element={<HeroGalleryManagement />} />
							<Route path="berita" element={<BeritaManagement />} />
							<Route path="user" element={<UserManagementPage />} />
							{/* Financial Data Management */}
							<Route path="bankeu" element={<BankeuDashboard />} />
							<Route path="add" element={<AddDashboard />} />
							<Route path="bhprd" element={<BhprdDashboard />} />
							<Route path="dd" element={<DdDashboard />} />
						</Route>
						
						{/* Disposisi & Settings - DPMD Staff & Admin */}
						<Route element={<RoleProtectedRoute allowedRoles={['superadmin', 'admin', 'pegawai', 'sekretaris_dinas', 'kepala_bidang', 'sekretariat']} />}>
							<Route path="disposisi" element={<DisposisiSurat />} />
							<Route path="disposisi/:id" element={<DisposisiDetail />} />
							<Route path="settings" element={<SettingsPage />} />
						</Route>
					</Route>

					{/* Rute Desa - Exclusive untuk role: desa, TERPISAH dari MainLayout */}
					<Route
						path="/desa"
						element={
							<RoleProtectedRoute allowedRoles={['desa']}>
								<DesaLayout />
							</RoleProtectedRoute>
						}
					>
					<Route path="dashboard" element={<DesaDashboard />} />
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
						<Route path="settings" element={<DesaSettings />} />
					</Route>

					{/* Rute Pegawai - Untuk role: pegawai */}
					<Route
						path="/pegawai"
						element={
							<RoleProtectedRoute allowedRoles={['pegawai']}>
								<PegawaiLayout />
							</RoleProtectedRoute>
						}
					>
						<Route index element={<Navigate to="dashboard" replace />} />
						<Route path="dashboard" element={<PegawaiDashboard />} />				<Route path="profile" element={<ProfilePage />} />						<Route path="disposisi" element={<DisposisiSurat />} />
						<Route path="disposisi/:id" element={<DisposisiDetail />} />
					</Route>

					{/* Rute Kepala Dinas - Exclusive untuk Kepala Dinas */}
					<Route
						path="/kepala-dinas"
						element={
							<RoleProtectedRoute allowedRoles={['superadmin', 'kepala_dinas']}>
								<KepalaDinasLayout />
							</RoleProtectedRoute>
						}
					>
						<Route index element={<Navigate to="dashboard" replace />} />
						<Route path="dashboard" element={<KepalaDinasDashboard />} />				<Route path="profile" element={<ProfilePage />} />						<Route path="disposisi" element={<DisposisiSurat />} />
						<Route path="disposisi/:id" element={<DisposisiDetail />} />
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
					</Route>

					{/* Rute Core Dashboard - DPMD Internal Only */}
					{/* HANYA untuk: Super Admin, Kepala Dinas, Sekretaris Dinas, Kepala Bidang, Pegawai */}
					{/* TIDAK BOLEH diakses oleh: desa, kecamatan */}
					<Route
						path="/core-dashboard"
						element={
							<RoleProtectedRoute allowedRoles={['superadmin', 'kepala_dinas', 'sekretaris_dinas', 'kepala_bidang', 'pegawai', 'sarana_prasarana', 'kekayaan_keuangan', ]}>
								<CoreDashboardLayout />
							</RoleProtectedRoute>
						}
					>
					<Route index element={<Navigate to="dashboard" replace />} />
					<Route path="dashboard" element={<WelcomeDashboard />} />
					<Route path="laporan-desa" element={<LaporanDesa />} />
					<Route path="statistik-bumdes" element={<StatistikBumdes />} />
					<Route path="statistik-perjadin" element={<StatistikPerjadin />} />
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
			</ThemeColorWrapper>
			</DataCacheProvider>
		</Router>
	);
}

export default App;
