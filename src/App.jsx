// src/App.jsx
import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
	useLocation,
} from "react-router-dom";
import { Suspense, lazy } from "react";
import { Toaster } from 'react-hot-toast';

// Halaman utama di-import langsung untuk performa awal yang lebih cepat
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import MusdesusStatsPage from "./pages/MusdesusStatsPage";
import MusdesusUploadPage from "./pages/MusdesusUploadPage";
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
const PerjalananDinas = lazy(() => import("./pages/sekretariat/perjadin"));
const DisposisiPersuratan = lazy(() => import("./pages/sekretariat/disposisi"));
const KepalaDinas = lazy(() => import("./pages/sekretariat/disposisi/KepalaDinas"));
const SekretarisDinas = lazy(() => import("./pages/sekretariat/disposisi/SekretarisDinas"));
const KepalaBidang = lazy(() => import("./pages/sekretariat/disposisi/KepalaBidang"));
const RoleGuard = lazy(() => import("./components/guards/RoleGuard"));
const DesaLayout = lazy(() => import("./layouts/DesaLayout"));
const DesaDashboard = lazy(() => import("./components/desa/DesaDashboard"));
const KecamatanDashboard = lazy(() => import("./components/kecamatan/KecamatanDashboard"));
const DinasDashboard = lazy(() => import("./components/dinas/DinasDashboard"));
const ProdukHukum = lazy(() => import("./pages/desa/ProdukHukum"));
const ProfilDesaPage = lazy(() => import("./pages/desa/ProfilDesaPage"));
const ProdukHukumDetail = lazy(() => import("./pages/desa/ProdukHukumDetail"));
const PublicLayout = lazy(() => import("./layouts/PublicLayout"));
const AparaturDesaPage = lazy(() =>
	import("./pages/desa/aparatur-desa/AparaturDesaPage")
);

const ProtectedRoute = ({ children }) => {
	const token = localStorage.getItem("authToken");
	const location = useLocation();

	if (!token) {
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
					<Route path="/musdesus-stats" element={<MusdesusStatsPage />} />
					<Route path="/musdesus-upload" element={<MusdesusUploadPage />} />

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
						<Route path="perjalanan-dinas" element={<PerjalananDinas />} />
						<Route path="disposisi-persuratan" element={<DisposisiPersuratan />} />
						{/* Routes untuk role-based disposisi dengan protection */}
						<Route path="disposisi/kepala-dinas" element={
							<RoleGuard requiredRole="kepala_dinas">
								<KepalaDinas />
							</RoleGuard>
						} />
						<Route path="disposisi/sekretaris-dinas" element={
							<RoleGuard requiredRole="sekretaris_dinas">
								<SekretarisDinas />
							</RoleGuard>
						} />
						<Route path="disposisi/kepala-bidang" element={
							<RoleGuard allowedRoles={['kepala_bidang_pemerintahan', 'kepala_bidang_kesra', 'kepala_bidang_ekonomi', 'kepala_bidang_fisik']}>
								<KepalaBidang />
							</RoleGuard>
						} />
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
						<Route path="aparatur-desa" element={<AparaturDesaPage />} />
						{/* Tambahkan rute modul desa lain di sini nanti, contoh: */}
						{/* <Route path="aparatur" element={<AparaturPage />} /> */}
					</Route>

					{/* Rute Kecamatan */}
					<Route path="/kecamatan/dashboard" element={
						<ProtectedRoute>
							<KecamatanDashboard />
						</ProtectedRoute>
					} />

					{/* Rute Dinas */}
					<Route path="/dinas/dashboard" element={
						<ProtectedRoute>
							<DinasDashboard />
						</ProtectedRoute>
					} />
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
					className: '',
					duration: 4000,
					style: {
						background: '#363636',
						color: '#fff',
					},
					// Default options for specific types
					success: {
						duration: 3000,
						theme: {
							primary: 'green',
							secondary: 'black',
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
