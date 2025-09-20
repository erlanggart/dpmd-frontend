// src/components/dashboards/DesaDashboard.jsx
import React, { useEffect, useState } from "react";
import api from "../../api";
import { FiUsers, FiDollarSign } from "react-icons/fi";
import ProfilDesaPage from "./ProfileDesaPage";

// Komponen kartu statistik
const StatCard = ({ icon, label, value, color }) => (
	<div className={`bg-gray-800 p-6 rounded-lg flex items-center gap-4`}>
		<div className={`p-3 rounded-full bg-${color}-500/20 text-${color}-400`}>
			{icon}
		</div>
		<div>
			<p className="text-gray-400 text-sm">{label}</p>
			<p className="text-2xl font-bold text-white">{value}</p>
		</div>
	</div>
);

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

			<ProfilDesaPage />

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<StatCard
					icon={<FiUsers size={24} />}
					label="Jumlah Aparatur"
					value={data.jumlah_aparatur}
					color="sky"
				/>
				<StatCard
					icon={<FiDollarSign size={24} />}
					label="Anggaran Dana Desa"
					value={`Rp ${new Intl.NumberFormat("id-ID").format(
						data.anggaran_dana_desa_contoh
					)}`}
					color="green"
				/>
				{/* Tambahkan kartu statistik lainnya di sini */}
			</div>

			{/* Anda bisa menambahkan komponen lain seperti grafik atau tabel di bawah ini */}
		</div>
	);
};

export default DesaDashboard;
