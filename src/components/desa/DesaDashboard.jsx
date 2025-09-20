// src/components/dashboards/DesaDashboard.jsx
import React, { useEffect, useState } from "react";
import api from "../../api";
import { FiUsers, FiDollarSign } from "react-icons/fi";
import ProfilDesaPage from "./ProfileDesaPage";

const DesaDashboard = () => {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const response = await api.get("/dashboard/desa");
				setData(response.data);
			} catch (error) {
				console.error("Gagal mengambil data dashboard desa:", error);
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, []);

	if (loading) {
		return <p className="text-white">Memuat data dashboard...</p>;
	}

	if (!data) {
		return <p className="text-red-500">Gagal memuat data dashboard.</p>;
	}

	return (
		<div>
			<h1 className="text-3xl font-bold text-primary">
				Dashboard Desa {data.nama_desa}
			</h1>
			<p className="text-lg text-slate-400 mb-6">
				Kecamatan {data.nama_kecamatan}
			</p>

			<section className="mb-6 ">
				<ProfilDesaPage />
			</section>
		</div>
	);
};

export default DesaDashboard;
