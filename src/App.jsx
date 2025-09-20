// src/App.jsx
import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
} from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import MainLayout from "./layouts/MainLayout";
import HeroGalleryManagement from "./pages/dashboard/HeroGalleryManagement";
import UserManagementPage from "./pages/dashboard/UserManagementPage";
import Kelembagaan from "./pages/PMD/Kelembagaan";
import DesaLayout from "./layouts/DesaLayout";
import DesaDashboard from "./components/desa/DesaDashboard";
// Tambahkan import halaman lain di sini nanti

const ProtectedRoute = ({ children }) => {
	const token = localStorage.getItem("authToken");
	return token ? children : <Navigate to="/login" />;
};

function App() {
	return (
		<Router>
			<Routes>
				<Route path="/" element={<LandingPage />} />
				<Route path="/login" element={<LoginPage />} />
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
					{/* Tambahkan rute admin lainnya di sini */}
				</Route>
				<Route
					path="/desa"
					element={
						<ProtectedRoute>
							<DesaLayout />
						</ProtectedRoute>
					}
				>
					<Route path="dashboard" element={<DesaDashboard />} />
					{/* Tambahkan rute modul desa lain di sini nanti, contoh: */}
					{/* <Route path="aparatur" element={<AparaturPage />} /> */}
				</Route>
			</Routes>
		</Router>
	);
}

export default App;
