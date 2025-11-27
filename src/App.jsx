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

// Halaman utama di-import langsung untuk performa awal yang lebih cepat
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import BeritaDetailPage from "./pages/BeritaDetailPage";
import BankeuPublicPage from "./pages/BankeuPublicPage";
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
const DesaDashboard = lazy(() => import("./components/desa/DesaDashboard"));
const BumdesDesaPage = lazy(() =>
	import("./pages/desa/bumdes/BumdesDesaPage")
);
const KelembagaanDesaPage = lazy(() =>
	import("./pages/desa/kelembagaan/KelembagaanDesaPage")
);
const KelembagaanList = lazy(() =>
	import("./pages/desa/kelembagaan/KelembagaanList")
);
const KelembagaanDetailPage = lazy(() =>
	import("./pages/desa/kelembagaan/KelembagaanDetailPage")
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
const KepalaDinasLayout = lazy(() =>
	import("./pages/kepala-dinas/KepalaDinasLayout")
);
const DashboardOverview = lazy(() =>
	import("./pages/kepala-dinas/DashboardOverview")
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
	if (allowedRoles && !allowedRoles.includes(user?.role)) {
		return <Navigate to="/dashboard" replace />;
	}

	return children || <Outlet />;
};

// Component wrapper untuk theme color hook
const ThemeColorWrapper = ({ children }) => {
	const location = useLocation();
	useThemeColor();
	
	// Dismiss all toasts on route change to prevent stuck toasts
	useEffect(() => {
		toast.dismiss();
	}, [location.pathname]);
	
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
					<Route path="/login" element={<LoginPage />} />

					{/* Rute Admin/Dashboard dengan lazy loading */}
					<Route
						path="/dashboard"
						element={
							<ProtectedRoute>
								<MainLayout />
							</ProtectedRoute>
						}
					>
					{/* Public dashboard routes - accessible by all authenticated users */}
					<Route index element={<DashboardPage />} />
					<Route path="hero-gallery" element={<HeroGalleryManagement />} />
					<Route path="berita" element={<BeritaManagement />} />
					<Route path="bumdes" element={<BumdesApp />} />
					<Route path="bankeu" element={<BankeuDashboard />} />
					<Route path="add" element={<AddDashboard />} />
					<Route path="bhprd" element={<BhprdDashboard />} />
					<Route path="dd" element={<DdDashboard />} />
					<Route path="kelembagaan" element={<Kelembagaan />} />
					<Route path="kelembagaan/admin/:desaId" element={<AdminKelembagaanDetailPage />} />
					<Route path="kelembagaan/admin/:desaId/:type/:id" element={<KelembagaanDetailPage />} />
					<Route path="perjalanan-dinas" element={<PerjalananDinas />} />
					<Route path="user" element={<UserManagementPage />} />
					</Route>

					{/* Rute Desa dengan lazy loading */}
					<Route
						path="/desa"
						element={
							<ProtectedRoute>
								<DesaLayout />
							</ProtectedRoute>
						}
					>
						<Route path="dashboard" element={<DesaDashboard />} />
						<Route path="bumdes" element={<BumdesDesaPage />} />
						<Route path="kelembagaan" element={<KelembagaanDesaPage />} />
						<Route path="kelembagaan/:type" element={<KelembagaanList />} />
						<Route path="kelembagaan/:type/:id" element={<KelembagaanDetailPage />} />
						<Route path="pengurus/:id" element={<PengurusDetailPage />} />
						<Route path="pengurus/:id/edit" element={<PengurusEditPage />} />
						<Route path="produk-hukum" element={<ProdukHukum />} />
						<Route path="produk-hukum/:id" element={<ProdukHukumDetail />} />
					</Route>

					{/* Rute Core Dashboard - Multi Role Access */}
					<Route
						path="/core-dashboard"
						element={
							<ProtectedRoute>
								<KepalaDinasLayout />
							</ProtectedRoute>
						}
					>
					<Route index element={<Navigate to="dashboard" replace />} />
					<Route path="dashboard" element={<DashboardOverview />} />
					<Route path="statistik-bumdes" element={<StatistikBumdes />} />
					<Route path="statistik-perjadin" element={<StatistikPerjadin />} />
					<Route path="statistik-bankeu" element={<StatistikBankeuDashboard />} />
					<Route path="statistik-add" element={<StatistikAddDashboard />} />
					<Route path="statistik-bhprd" element={<BhprdDashboard />} />
					<Route path="statistik-dd" element={<StatistikDdDashboard />} />
					<Route path="trends" element={<TrendsPage />} />
					</Route>
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
