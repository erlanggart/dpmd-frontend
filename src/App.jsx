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
					<Route path="hero-gallery" element={<HeroGalleryManagement />} />
					{/* Tambahkan rute admin lainnya di sini */}
				</Route>
			</Routes>
		</Router>
	);
}

export default App;
