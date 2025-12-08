// src/pages/pegawai/PegawaiDashboard.jsx
import React, { useState, useEffect } from "react";
import { 
	FiUser, FiBriefcase, FiMail, FiCalendar, FiCheckCircle, 
	FiPhone, FiMapPin, FiAward, FiTrendingUp, FiFileText,
	FiClock, FiSettings, FiHelpCircle
} from "react-icons/fi";
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
			
			if (!user) {
				setError("User tidak ditemukan. Silakan login kembali.");
				return;
			}

			// Cari pegawai berdasarkan email user
			const allPegawaiResponse = await api.get('/pegawai');
			const pegawaiList = allPegawaiResponse.data.data;
			
			// Find pegawai by matching user email
			const pegawai = pegawaiList.find(p => 
				p.users && p.users.length > 0 && p.users[0].email === user.email
			);

			if (!pegawai) {
				setError("Data pegawai tidak ditemukan untuk user ini");
				return;
			}

			setPegawaiData(pegawai);
		} catch (err) {
			console.error("Error fetching pegawai data:", err);
			setError("Gagal memuat data pegawai: " + (err.response?.data?.message || err.message));
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
					<p className="text-white font-semibold">Memuat data...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-4 flex items-center justify-center">
				<div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
					<div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<FiHelpCircle className="h-8 w-8 text-red-600" />
					</div>
					<h3 className="text-center font-bold text-gray-800 mb-2">Oops!</h3>
					<p className="text-center text-gray-600 text-sm">{error}</p>
				</div>
			</div>
		);
	}

	const firstName = pegawaiData?.nama_pegawai?.split(' ')[0] || "Pegawai";

	return (
		<div className="min-h-screen bg-slate-50">
			{/* Header Section - Navy Slate Style */}
			<div className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 rounded-b-3xl shadow-lg">
				<div className="px-4 pt-6 pb-8">
					{/* Top Bar */}
					<div className="flex items-center justify-between mb-6">
						<div className="flex items-center gap-3">
							<div className="h-12 w-12 bg-white rounded-full flex items-center justify-center shadow-md">
								<FiUser className="h-6 w-6 text-slate-700" />
							</div>
							<div>
								<p className="text-slate-300 text-xs">Halo,</p>
								<h2 className="text-white text-lg font-bold">{firstName}</h2>
							</div>
						</div>
						<button className="h-10 w-10 bg-white bg-opacity-10 rounded-full flex items-center justify-center backdrop-blur-sm hover:bg-opacity-20 transition-all">
							<FiSettings className="h-5 w-5 text-white" />
						</button>
					</div>

					{/* Main Info Card */}
					<div className="bg-white rounded-2xl shadow-lg p-4">
						<div className="flex items-center gap-3 mb-3">
							<div className="h-14 w-14 bg-gradient-to-br from-slate-500 to-slate-700 rounded-xl flex items-center justify-center shadow-md">
								<FiBriefcase className="h-7 w-7 text-white" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-xs text-slate-500 mb-0.5">Bidang</p>
								<h3 className="font-bold text-slate-800 text-sm leading-tight">
									{pegawaiData?.bidangs?.nama || "N/A"}
								</h3>
							</div>
							<div className="px-3 py-1.5 bg-green-100 rounded-full">
								<span className="text-xs font-bold text-green-700 flex items-center gap-1">
									<FiCheckCircle className="h-3 w-3" />
									Aktif
								</span>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
							<div className="text-center">
								<p className="text-xs text-slate-500">NIP</p>
								<p className="text-sm font-bold text-slate-800 truncate">
									{pegawaiData?.nip || "-"}
								</p>
							</div>
							<div className="text-center border-l border-slate-100">
								<p className="text-xs text-slate-500">Status</p>
								<p className="text-sm font-bold text-slate-700">Pegawai</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Content Section */}
			<div className="px-4 -mt-2 pb-6">
				{/* Quick Stats - Navy Style Icons */}
				<div className="grid grid-cols-4 gap-3 mb-6">
					<button className="bg-white rounded-2xl shadow-md p-3 text-center hover:shadow-lg transition-shadow active:scale-95">
						<div className="h-12 w-12 bg-gradient-to-br from-slate-500 to-slate-700 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-md">
							<FiCalendar className="h-6 w-6 text-white" />
						</div>
						<p className="text-xs font-semibold text-slate-700">Jadwal</p>
					</button>

					<button className="bg-white rounded-2xl shadow-md p-3 text-center hover:shadow-lg transition-all active:scale-95">
						<div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-md">
							<FiTrendingUp className="h-6 w-6 text-white" />
						</div>
						<p className="text-xs font-semibold text-slate-700">Perjadin</p>
					</button>

					<button className="bg-white rounded-2xl shadow-md p-3 text-center hover:shadow-lg transition-all active:scale-95">
						<div className="h-12 w-12 bg-gradient-to-br from-slate-600 to-slate-800 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-md">
							<FiFileText className="h-6 w-6 text-white" />
						</div>
						<p className="text-xs font-semibold text-slate-700">Laporan</p>
					</button>

					<button className="bg-white rounded-2xl shadow-md p-3 text-center hover:shadow-lg transition-all active:scale-95">
						<div className="h-12 w-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-md">
							<FiHelpCircle className="h-6 w-6 text-white" />
						</div>
						<p className="text-xs font-semibold text-slate-700">Bantuan</p>
					</button>
				</div>

				{/* Activity Summary */}
				<div className="bg-white rounded-2xl shadow-md p-4 mb-4">
					<h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
						<FiClock className="h-5 w-5 text-slate-600" />
						Aktivitas Bulan Ini
					</h3>
					<div className="grid grid-cols-3 gap-3">
						<div className="text-center p-3 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
							<p className="text-2xl font-bold text-slate-700">0</p>
							<p className="text-xs text-slate-600 mt-1">Kegiatan</p>
						</div>
						<div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
							<p className="text-2xl font-bold text-blue-700">0</p>
							<p className="text-xs text-slate-600 mt-1">Perjadin</p>
						</div>
						<div className="text-center p-3 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200">
							<p className="text-2xl font-bold text-amber-700">0</p>
							<p className="text-xs text-slate-600 mt-1">Laporan</p>
						</div>
					</div>
				</div>

				{/* Profile Details */}
				<div className="bg-white rounded-2xl shadow-md p-4 mb-4">
					<h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
						<FiUser className="h-5 w-5 text-slate-600" />
						Informasi Profil
					</h3>
					<div className="space-y-3">
						<div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
							<div className="h-10 w-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
								<FiUser className="h-5 w-5 text-slate-600" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-xs text-slate-500">Nama Lengkap</p>
								<p className="text-sm font-semibold text-slate-800">
									{pegawaiData?.nama_pegawai}
								</p>
							</div>
						</div>

						<div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
							<div className="h-10 w-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center flex-shrink-0">
								<FiMail className="h-5 w-5 text-blue-600" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-xs text-slate-500">Email</p>
								<p className="text-sm font-semibold text-slate-800 truncate">
									{pegawaiData?.users?.[0]?.email || "-"}
								</p>
							</div>
						</div>

						{pegawaiData?.no_hp && (
							<div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
								<div className="h-10 w-10 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center flex-shrink-0">
									<FiPhone className="h-5 w-5 text-green-600" />
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-xs text-slate-500">No. Telepon</p>
									<p className="text-sm font-semibold text-slate-800">
										{pegawaiData.no_hp}
									</p>
								</div>
							</div>
						)}

						{pegawaiData?.alamat && (
							<div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
								<div className="h-10 w-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
									<FiMapPin className="h-5 w-5 text-slate-600" />
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-xs text-slate-500">Alamat</p>
									<p className="text-sm font-semibold text-slate-800">
										{pegawaiData.alamat}
									</p>
								</div>
							</div>
						)}

						{pegawaiData?.jabatan && (
							<div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
								<div className="h-10 w-10 bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg flex items-center justify-center flex-shrink-0">
									<FiAward className="h-5 w-5 text-amber-600" />
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-xs text-slate-500">Jabatan</p>
									<p className="text-sm font-semibold text-slate-800">
										{pegawaiData.jabatan}
									</p>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Help Banner */}
				<div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-2xl shadow-lg p-4 mb-4">
					<div className="flex items-start gap-3">
						<div className="h-12 w-12 bg-white bg-opacity-10 rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
							<FiHelpCircle className="h-6 w-6 text-white" />
						</div>
						<div className="flex-1">
							<h3 className="text-white font-bold mb-1">Butuh Bantuan?</h3>
							<p className="text-slate-300 text-xs mb-3">
								Hubungi tim IT untuk bantuan teknis sistem
							</p>
							<button className="bg-white text-slate-700 px-4 py-2 rounded-xl text-xs font-bold hover:shadow-lg transition-all active:scale-95">
								Hubungi IT Support
							</button>
						</div>
					</div>
				</div>

				{/* Footer Info */}
				<div className="text-center py-4">
					<p className="text-xs text-slate-400">
						DPMD Kabupaten Bogor © 2025
					</p>
					<p className="text-xs text-slate-400 mt-1">
						Portal Pegawai v1.0
					</p>
				</div>
			</div>
		</div>
	);
};

export default PegawaiDashboard;
