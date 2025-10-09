import React, { useContext, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import KelembagaanDetailPage from "../desa/kelembagaan/KelembagaanDetailPage";

/**
 * AdminKelembagaanDetailWrapper - Wrapper untuk memungkinkan admin mengakses KelembagaanDetailPage
 *
 * Komponen ini memungkinkan admin PMD untuk mengakses detail kelembagaan (RW, RT, dll)
 * yang sebenarnya adalah komponen untuk user desa, tetapi dengan konteks admin
 */
const AdminKelembagaanDetailWrapper = () => {
	const { desaId, type, id } = useParams();
	const navigate = useNavigate();
	const { user } = useAuth();

	// Check admin access
	const isAdmin = ["superadmin", "pemberdayaan_masyarakat", "pmd"].includes(
		user?.role
	);

	useEffect(() => {
		if (!isAdmin) {
			navigate("/dashboard");
			return;
		}
	}, [isAdmin, navigate]);

	if (!isAdmin) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<h2 className="text-xl font-bold text-red-600">Akses Ditolak</h2>
					<p className="text-gray-600 mt-2">
						Anda tidak memiliki akses ke halaman ini.
					</p>
				</div>
			</div>
		);
	}

	// Render KelembagaanDetailPage dengan parameter yang sesuai
	return <KelembagaanDetailPage />;
};

export default AdminKelembagaanDetailWrapper;
