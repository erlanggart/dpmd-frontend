// src/App.jsx
import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
	useLocation,
} from "react-router-dom";
import { Suspense, lazy } from "react";

// Halaman utama di-import langsung untuk performa awal yang lebih cepat
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import Spinner from "./components/ui/Spinner";

// Komponen lain di-lazy load untuk code-splitting
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const MainLayout = lazy(() => import("./layouts/MainLayout"));
const HeroGalleryManagement = lazy(() =>
	import("./pages/dashboard/HeroGalleryManagement")
);
const UserManagementPage = lazy(() =>
	import("./pages/dashboard/UserManagementPage")
);
const Kelembagaan = lazy(() => import("./pages/PMD/Kelembagaan"));
const BumdesApp = lazy(() => import("./pages/sarpras/Bumdes-app"));
const BidangLoginPage = lazy(() => import("./pages/bidang/BidangLoginPage"));
const DesaLayout = lazy(() => import("./layouts/DesaLayout"));
const DesaDashboard = lazy(() => import("./components/desa/DesaDashboard"));
const ProdukHukum = lazy(() => import("./pages/desa/ProdukHukum"));
const ProfilDesaPage = lazy(() => import("./pages/desa/ProfilDesaPage"));
const ProdukHukumDetail = lazy(() => import("./pages/desa/ProdukHukumDetail"));
const PublicLayout = lazy(() => import("./layouts/PublicLayout"));

const ProtectedRoute = ({ children }) => {
	const token = localStorage.getItem("authToken");
	const bidangToken = localStorage.getItem("bidangAuthToken");
	const location = useLocation();

	if (!token && !bidangToken) {
		// Simpan lokasi yang dituju agar bisa redirect kembali setelah login
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	return children;
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
					<Route path="/login" element={<LoginPage />} />
					<Route path="/login/bidang" element={<BidangLoginPage />} />

					{/* Rute Publik dengan lazy loading */}
					<Route element={<PublicLayout />}>
						<Route path="/produk-hukum/:id" element={<ProdukHukumDetail />} />
					</Route>

					{/* Rute Admin/Dashboard dengan lazy loading */}
					<Route
						path="/dashboard"
						element={
							<ProtectedRoute>
								<MainLayout />
							</ProtectedRoute>
						}
					>
						<Route index element={<DashboardPage />} />
						<Route path="users" element={<UserManagementPage />} />
						<Route path="hero-gallery" element={<HeroGalleryManagement />} />
						<Route path="kelembagaan" element={<Kelembagaan />} />
						<Route path="bumdes" element={<BumdesApp />} />
						{/* Route untuk bidang - akan diarahkan ke dashboard index */}
						<Route path="sekretariat" element={<Navigate to="/dashboard" replace />} />
						<Route path="sarana-prasarana" element={<Navigate to="/dashboard" replace />} />
						<Route path="kekayaan-keuangan" element={<Navigate to="/dashboard" replace />} />
						<Route path="pemberdayaan-masyarakat" element={<Navigate to="/dashboard" replace />} />
						<Route path="pemerintahan-desa" element={<Navigate to="/dashboard" replace />} />
						{/* Tambahkan rute admin lainnya di sini */}
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
						<Route path="produk-hukum" element={<ProdukHukum />} />
						<Route path="profil-desa" element={<ProfilDesaPage />} />
						<Route path="produk-hukum/:id" element={<ProdukHukumDetail />} />
						{/* Tambahkan rute modul desa lain di sini nanti, contoh: */}
						{/* <Route path="aparatur" element={<AparaturPage />} /> */}
					</Route>
				</Routes>
			</Suspense>
		</Router>
	);
}

export default App;
