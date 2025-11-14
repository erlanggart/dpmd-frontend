// File: src/components/StatsSection.jsx
import React, { useEffect, useState } from "react";
import api from "../../api";
import StatCard from "./StatCard";

// Impor ikon yang relevan
import { FiGrid, FiHome, FiArchive, FiLoader } from "react-icons/fi";

import { useInView } from "react-intersection-observer";

const StatsSection = () => {
	const [stats, setStats] = useState(null);
	const [loading, setLoading] = useState(true);

	// --- GUNAKAN HOOK useInView ---
	const { ref, inView } = useInView({
		// Opsi: animasi akan terpicu saat 10% bagian section terlihat
		threshold: 0.1,
		// Opsi: animasi akan diulang setiap kali masuk/keluar viewport
		triggerOnce: false,
	});

	useEffect(() => {
		const fetchStats = async () => {
			try {
				// Coba ambil data dari API
				const response = await api.get("/public/stats");
				if (response.data.success) {
					setStats(response.data.data);
				} else {
					// Jika API response tidak success, gunakan data default
					setStats({ kecamatan: 40, desa: 416, kelurahan: 19 });
				}
			} catch (error) {
				// Jika API gagal, gunakan data default tanpa log error di console
				setStats({ kecamatan: 40, desa: 416, kelurahan: 19 });
			} finally {
				setLoading(false);
			}
		};
		fetchStats();
	}, []);

	if (loading) {
		return (
			<div className="flex justify-center py-20">
				<FiLoader className="animate-spin text-4xl text-primary" />
			</div>
		);
	}

	const statItems = [
		{ count: stats?.kecamatan, label: "Kecamatan" },
		{ count: stats?.desa, label: "Desa" },
		{
			count: stats?.kelurahan,
			label: "Kelurahan",
		},
	];

	return (
		<section ref={ref} className="bg-gray-50 py-20">
			<div className="container max-w-7xl mx-auto px-4">
				<div className="text-center">
					<h2 className="text-3xl font-bold text-gray-900">
						Wilayah Administratif Kabupaten Bogor
					</h2>
					<p className="mt-2 text-lg text-gray-600">
						Data terpadu dari seluruh wilayah di bawah naungan DPMD.
					</p>
				</div>
				<div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
					{statItems.map((item, index) => (
						<StatCard
							key={index}
							finalCount={item.count}
							label={item.label}
							startAnimation={inView}
						/>
					))}
				</div>
			</div>
		</section>
	);
};

export default StatsSection;
