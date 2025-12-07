// src/pages/pegawai/PegawaiDashboard.jsx
import React, { useState, useEffect } from "react";
import { FiUser, FiBriefcase, FiMail, FiCalendar, FiCheckCircle } from "react-icons/fi";
import api from "../../api";

const PegawaiDashboard = () => {
	const [pegawaiData, setPegawaiData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		fetchPegawaiProfile();
	}, []);

	const fetchPegawaiProfile = async () => {
		try {
			setLoading(true);
			const user = JSON.parse(localStorage.getItem("user"));
			
			if (!user || !user.pegawai_id) {
				setError("Data pegawai tidak ditemukan");
				return;
			}

			const response = await api.get(`/pegawai/${user.pegawai_id}`);
			setPegawaiData(response.data.data);
		} catch (err) {
			console.error("Error fetching pegawai data:", err);
			setError("Gagal memuat data pegawai");
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-50 border border-red-200 rounded-lg p-6">
				<p className="text-red-600">{error}</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Welcome Banner */}
			<div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-8 text-white">
				<h1 className="text-3xl font-bold mb-2">
					Selamat Datang, {pegawaiData?.nama_pegawai || "Pegawai"}!
				</h1>
				<p className="text-blue-100">
					Portal Dashboard Pegawai DPMD Kabupaten Bogor
				</p>
			</div>

			{/* Profile Card */}
			<div className="bg-white rounded-lg shadow-lg p-6">
				<div className="flex items-center gap-4 mb-6">
					<div className="h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center">
						<FiUser className="h-10 w-10 text-blue-600" />
					</div>
					<div>
						<h2 className="text-2xl font-bold text-gray-800">
							{pegawaiData?.nama_pegawai}
						</h2>
						<p className="text-gray-600">
							{pegawaiData?.bidangs?.nama || "Bidang tidak tersedia"}
						</p>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
						<FiBriefcase className="h-5 w-5 text-gray-600" />
						<div>
							<p className="text-sm text-gray-600">NIP</p>
							<p className="font-semibold text-gray-800">
								{pegawaiData?.nip || "-"}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
						<FiMail className="h-5 w-5 text-gray-600" />
						<div>
							<p className="text-sm text-gray-600">Email</p>
							<p className="font-semibold text-gray-800">
								{pegawaiData?.users?.[0]?.email || "-"}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
						<FiCalendar className="h-5 w-5 text-gray-600" />
						<div>
							<p className="text-sm text-gray-600">Status</p>
							<p className="font-semibold text-gray-800 flex items-center gap-2">
								<FiCheckCircle className="h-4 w-4 text-green-500" />
								{pegawaiData?.users?.[0]?.is_active ? "Aktif" : "Tidak Aktif"}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
						<FiBriefcase className="h-5 w-5 text-gray-600" />
						<div>
							<p className="text-sm text-gray-600">Role</p>
							<p className="font-semibold text-gray-800 capitalize">
								{pegawaiData?.users?.[0]?.role || "Pegawai"}
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Info Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="bg-white rounded-lg shadow p-6">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-semibold text-gray-800">Perjalanan Dinas</h3>
						<FiCalendar className="h-6 w-6 text-blue-600" />
					</div>
					<p className="text-gray-600 text-sm">
						Data perjalanan dinas Anda akan ditampilkan di sini
					</p>
				</div>

				<div className="bg-white rounded-lg shadow p-6">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-semibold text-gray-800">Kegiatan</h3>
						<FiBriefcase className="h-6 w-6 text-green-600" />
					</div>
					<p className="text-gray-600 text-sm">
						Daftar kegiatan yang Anda ikuti akan ditampilkan di sini
					</p>
				</div>

				<div className="bg-white rounded-lg shadow p-6">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-semibold text-gray-800">Notifikasi</h3>
						<FiCheckCircle className="h-6 w-6 text-purple-600" />
					</div>
					<p className="text-gray-600 text-sm">
						Notifikasi terkait tugas Anda akan ditampilkan di sini
					</p>
				</div>
			</div>

			{/* Quick Actions */}
			<div className="bg-white rounded-lg shadow p-6">
				<h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left">
						<FiUser className="h-6 w-6 text-blue-600 mb-2" />
						<p className="font-semibold text-gray-800">Edit Profil</p>
						<p className="text-sm text-gray-600">Update data pribadi</p>
					</button>

					<button className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-left">
						<FiCalendar className="h-6 w-6 text-green-600 mb-2" />
						<p className="font-semibold text-gray-800">Jadwal</p>
						<p className="text-sm text-gray-600">Lihat jadwal kegiatan</p>
					</button>

					<button className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-left">
						<FiBriefcase className="h-6 w-6 text-purple-600 mb-2" />
						<p className="font-semibold text-gray-800">Laporan</p>
						<p className="text-sm text-gray-600">Submit laporan tugas</p>
					</button>

					<button className="p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all text-left">
						<FiMail className="h-6 w-6 text-orange-600 mb-2" />
						<p className="font-semibold text-gray-800">Pesan</p>
						<p className="text-sm text-gray-600">Lihat pesan masuk</p>
					</button>
				</div>
			</div>
		</div>
	);
};

export default PegawaiDashboard;
