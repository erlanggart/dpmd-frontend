// src/App.jsx
import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
	useLocation,
	Outlet,
} from "react-router-dom";
import { Suspense, lazy } from "react";
import { Toaster } from "react-hot-toast";
import { useAuth } from "./context/AuthContext";

// Halaman utama di-import langsung untuk performa awal yang lebih cepat
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import BeritaDetailPage from "./pages/BeritaDetailPage";
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
const PerjalananDinas = lazy(() => import("./pages/sekretariat/perjadin"));
const DesaLayout = lazy(() => import("./layouts/DesaLayout"));
const DesaDashboard = lazy(() => import("./components/desa/DesaDashboard"));
const BumdesDesaPage = lazy(() =>
	import("./pages/desa/bumdes/BumdesDesaPage")
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
const TrendsPage = lazy(() =>
	import("./pages/kepala-dinas/TrendsPage")
);

const ProtectedRoute = ({ children }) => {
	const token = localStorage.getItem("expressToken");
	const location = useLocation();

	if (!token) {
		// Simpan lokasi yang dituju agar bisa redirect kembali setelah login
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

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

function App() {
	return (
		<Router>
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
						<Route path="perjalanan-dinas" element={<PerjalananDinas />} />
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
		</Router>
	);
}

export default App;
