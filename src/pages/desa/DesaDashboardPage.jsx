import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
	LuBuilding2,
	LuHouse,
	LuUsers,
	LuMapPin,
	LuActivity,
	LuShield,
	LuHeart,
	LuUsersRound,
	LuTrendingUp,
	LuDollarSign,
	LuCircleAlert,
	LuCircleCheck,
	LuLoader,
	LuChevronDown,
	LuChevronUp,
} from "react-icons/lu";
import api from "../../api";

const DesaDashboardPage = () => {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [dashboardData, setDashboardData] = useState(null);
	const [expandedCards, setExpandedCards] = useState({});

	const toggleCard = (index) => {
		setExpandedCards(prev => ({
			...prev,
			[index]: !prev[index]
		}));
	};

	useEffect(() => {
		fetchDashboardData();
	}, []);

	const fetchDashboardData = async () => {
		try {
			setLoading(true);
			setError(null);
			
			// Debug: Check token
			const token = localStorage.getItem('expressToken');
			console.log('🔍 Fetching dashboard data with token:', token ? 'Token exists' : 'No token');
			
			const response = await api.get("/desa/dashboard/summary");
			console.log('✅ Dashboard data received:', response.data);
			
			setDashboardData(response.data.data);
		} catch (err) {
			console.error("❌ Error fetching dashboard data:", err);
			console.error("Response:", err.response?.data);
			setError(err.response?.data?.message || "Gagal memuat data dashboard");
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="flex flex-col items-center gap-3">
					<LuLoader className="w-8 h-8 animate-spin text-blue-600" />
					<p className="text-gray-600">Memuat data dashboard...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-50 border border-red-200 rounded-lg p-6">
				<div className="flex items-center gap-3">
					<LuCircleAlert className="w-6 h-6 text-red-600" />
					<div>
						<h3 className="font-semibold text-red-900">Terjadi Kesalahan</h3>
						<p className="text-red-700">{error}</p>
					</div>
				</div>
			</div>
		);
	}

	const { desa, kelembagaan, keuangan } = dashboardData || {};

	// Card data untuk kelembagaan
	const kelembagaanCards = [
		{
			title: "RW",
			value: kelembagaan?.rw || 0,
			icon: LuBuilding2,
			color: "from-blue-400 to-blue-600",
			bgColor: "bg-blue-50",
			textColor: "text-blue-700",
			link: "/desa/kelembagaan?type=rw",
		},
		{
			title: "RT",
			value: kelembagaan?.rt || 0,
			icon: LuHouse,
			color: "from-green-400 to-green-600",
			bgColor: "bg-green-50",
			textColor: "text-green-700",
			link: "/desa/kelembagaan",
		},
		{
			title: "Posyandu",
			value: kelembagaan?.posyandu || 0,
			icon: LuHeart,
			color: "from-pink-400 to-pink-600",
			bgColor: "bg-pink-50",
			textColor: "text-pink-700",
			link: "/desa/kelembagaan?type=posyandu",
		},
		{
			title: "Karang Taruna",
			value: kelembagaan?.karang_taruna || 0,
			icon: LuUsers,
			color: "from-purple-400 to-purple-600",
			bgColor: "bg-purple-50",
			textColor: "text-purple-700",
			link: "/desa/kelembagaan?type=karang_taruna",
		},
		{
			title: "LPM",
			value: kelembagaan?.lpm || 0,
			icon: LuUsersRound,
			color: "from-indigo-400 to-indigo-600",
			bgColor: "bg-indigo-50",
			textColor: "text-indigo-700",
			link: "/desa/kelembagaan?type=lpm",
		},
		{
			title: "PKK",
			value: kelembagaan?.pkk || 0,
			icon: LuActivity,
			color: "from-orange-400 to-orange-600",
			bgColor: "bg-orange-50",
			textColor: "text-orange-700",
			link: "/desa/kelembagaan?type=pkk",
		},
		{
			title: "Satlinmas",
			value: kelembagaan?.satlinmas || 0,
			icon: LuShield,
			color: "from-red-400 to-red-600",
			bgColor: "bg-red-50",
			textColor: "text-red-700",
			link: "/desa/kelembagaan?type=satlinmas",
		},
	];

	// Card data untuk keuangan - dengan detail tahap
	const keuanganCards = [
		{
			title: "ADD 2025",
			status: keuangan?.add?.status,
			realisasi: keuangan?.add?.realisasiFormatted || "0",
			hasData: keuangan?.add?.hasData,
			color: "from-emerald-400 to-emerald-600",
			bgColor: "bg-emerald-50",
			borderColor: "border-emerald-200",
			isSingleTahap: true,
		},
		{
			title: "BHPRD 2025",
			totalFormatted: keuangan?.bhprd?.totalFormatted || "Rp 0",
			hasData: keuangan?.bhprd?.tahap1?.hasData || keuangan?.bhprd?.tahap2?.hasData || keuangan?.bhprd?.tahap3?.hasData,
			color: "from-blue-400 to-blue-600",
			bgColor: "bg-blue-50",
			borderColor: "border-blue-200",
			tahapan: [
				{
					label: "Tahap 1",
					status: keuangan?.bhprd?.tahap1?.status,
					realisasi: keuangan?.bhprd?.tahap1?.realisasiFormatted || "0",
					hasData: keuangan?.bhprd?.tahap1?.hasData,
				},
				{
					label: "Tahap 2",
					status: keuangan?.bhprd?.tahap2?.status,
					realisasi: keuangan?.bhprd?.tahap2?.realisasiFormatted || "0",
					hasData: keuangan?.bhprd?.tahap2?.hasData,
				},
				{
					label: "Tahap 3",
					status: keuangan?.bhprd?.tahap3?.status,
					realisasi: keuangan?.bhprd?.tahap3?.realisasiFormatted || "0",
					hasData: keuangan?.bhprd?.tahap3?.hasData,
				},
			],
		},
		{
			title: "DD 2025",
			totalFormatted: keuangan?.dd?.totalFormatted || "Rp 0",
			hasData: keuangan?.dd?.earmarked?.tahap1?.hasData || keuangan?.dd?.earmarked?.tahap2?.hasData || 
			         keuangan?.dd?.nonearmarked?.tahap1?.hasData || keuangan?.dd?.nonearmarked?.tahap2?.hasData,
			color: "from-violet-400 to-violet-600",
			bgColor: "bg-violet-50",
			borderColor: "border-violet-200",
			tahapan: [
				{
					label: "Earmarked T1",
					status: keuangan?.dd?.earmarked?.tahap1?.status,
					realisasi: keuangan?.dd?.earmarked?.tahap1?.realisasiFormatted || "0",
					hasData: keuangan?.dd?.earmarked?.tahap1?.hasData,
				},
				{
					label: "Earmarked T2",
					status: keuangan?.dd?.earmarked?.tahap2?.status,
					realisasi: keuangan?.dd?.earmarked?.tahap2?.realisasiFormatted || "0",
					hasData: keuangan?.dd?.earmarked?.tahap2?.hasData,
				},
				{
					label: "Non-Earmarked T1",
					status: keuangan?.dd?.nonearmarked?.tahap1?.status,
					realisasi: keuangan?.dd?.nonearmarked?.tahap1?.realisasiFormatted || "0",
					hasData: keuangan?.dd?.nonearmarked?.tahap1?.hasData,
				},
				{
					label: "Non-Earmarked T2",
					status: keuangan?.dd?.nonearmarked?.tahap2?.status,
					realisasi: keuangan?.dd?.nonearmarked?.tahap2?.realisasiFormatted || "0",
					hasData: keuangan?.dd?.nonearmarked?.tahap2?.hasData,
				},
			],
		},
		{
			title: "Bankeu 2025",
			totalFormatted: keuangan?.bankeu?.totalFormatted || "Rp 0",
			hasData: keuangan?.bankeu?.tahap1?.hasData || keuangan?.bankeu?.tahap2?.hasData,
			color: "from-amber-400 to-amber-600",
			bgColor: "bg-amber-50",
			borderColor: "border-amber-200",
			tahapan: [
				{
					label: "Tahap 1",
					status: keuangan?.bankeu?.tahap1?.status,
					realisasi: keuangan?.bankeu?.tahap1?.realisasiFormatted || "0",
					hasData: keuangan?.bankeu?.tahap1?.hasData,
				},
				{
					label: "Tahap 2",
					status: keuangan?.bankeu?.tahap2?.status,
					realisasi: keuangan?.bankeu?.tahap2?.realisasiFormatted || "0",
					hasData: keuangan?.bankeu?.tahap2?.hasData,
				},
			],
		},
	];

	const getStatusBadge = (status) => {
		if (status === "Dana Telah Dicairkan") {
			return (
				<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full border border-green-200">
					<LuCircleCheck className="w-3 h-3" />
					Dicairkan
				</span>
			);
		}
		return (
			<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full border border-gray-200">
				<LuCircleAlert className="w-3 h-3" />
				{status}
			</span>
		);
	};

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-6 text-white">
				<div className="flex items-center gap-3 mb-2">
					<LuMapPin className="w-6 h-6" />
					<h1 className="text-2xl font-bold">Dashboard {desa?.status_pemerintahan === "kelurahan" ? "Kelurahan" : "Desa"}</h1>
				</div>
				<p className="text-blue-100 text-lg">
					{desa?.status_pemerintahan === "kelurahan" ? "Kelurahan" : "Desa"} {desa?.nama} - Kecamatan {desa?.kecamatan}
				</p>
			</div>

			{/* Keuangan Section */}
			<div>
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
						<LuDollarSign className="w-5 h-5 text-green-600" />
						Data Keuangan 2025
					</h2>
				</div>

				{/* Total Realisasi */}
				<div className="mb-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-xl p-6 text-white">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div className="h-14 w-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
								<LuDollarSign className="h-7 w-7 text-white" />
							</div>
							<div>
								<p className="text-sm text-green-100 mb-1">Total Realisasi Keuangan 2025</p>
								<p className="text-3xl font-bold">
									{keuangan?.total_realisasi_formatted || "Rp 0"}
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Cards Layout - Vertical Stack */}
				<div className="space-y-4">
					{keuanganCards.map((card, index) => (
						<div
							key={index}
							className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200"
						>
							{/* Card Header */}
							<div className={`${card.bgColor} border-b-2 ${card.borderColor} p-5`}>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-4 flex-1">
										<div className={`h-12 w-12 bg-gradient-to-r ${card.color} rounded-xl flex items-center justify-center shadow-md`}>
											<LuDollarSign className="h-6 w-6 text-white" />
										</div>
										<div className="flex-1">
											<h3 className="text-lg font-bold text-gray-900 mb-1">
												{card.title}
											</h3>
											{card.isSingleTahap && card.status && (
												<div className="mt-2">
													{getStatusBadge(card.status)}
												</div>
											)}
										</div>
									</div>
									
									{/* Total Realisasi */}
									<div className="text-right">
										<p className="text-xs text-gray-600 mb-1">Total Realisasi</p>
										<p className="text-2xl font-bold text-gray-900">
											{card.isSingleTahap ? (
												card.hasData ? `Rp ${card.realisasi}` : <span className="text-gray-400 text-base">Tidak ada data</span>
											) : (
												card.hasData ? card.totalFormatted : <span className="text-gray-400 text-base">Tidak ada data</span>
											)}
										</p>
									</div>
								</div>
							</div>

							{/* Accordion Content - Only for multi-tahap */}
							{!card.isSingleTahap && card.tahapan && (
								<>
									{/* Accordion Toggle Button */}
									<button
										onClick={() => toggleCard(index)}
										className="w-full px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors duration-200 flex items-center justify-between text-sm font-medium text-gray-700"
									>
										<span className="flex items-center gap-2">
											<span className="h-1.5 w-1.5 rounded-full bg-gray-400"></span>
											Detail Pencairan Per Tahap
										</span>
										{expandedCards[index] ? (
											<LuChevronUp className="h-5 w-5" />
										) : (
											<LuChevronDown className="h-5 w-5" />
										)}
									</button>

									{/* Accordion Panel */}
									{expandedCards[index] && (
										<div className="px-5 py-4 bg-gray-50 border-t border-gray-200">
											<div className="space-y-3">
												{card.tahapan.map((tahap, idx) => (
													<div 
														key={idx} 
														className="bg-white rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors duration-200"
													>
														{/* Tahap Header */}
														<div className="flex items-center justify-between mb-3">
															<div className="flex items-center gap-3">
																<div className={`h-8 w-8 rounded-lg bg-gradient-to-r ${card.color} flex items-center justify-center`}>
																	<span className="text-white text-xs font-bold">{idx + 1}</span>
																</div>
																<h4 className="font-semibold text-gray-900">{tahap.label}</h4>
															</div>
															{tahap.hasData && (
																<span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full border border-green-200">
																	Data Available From Sipanda
																</span>
															)}
														</div>

														{/* Status Badge */}
														{tahap.status && (
															<div className="mb-3">
																{getStatusBadge(tahap.status)}
															</div>
														)}

														{/* Realisasi Amount */}
														<div className="bg-gray-50 rounded-lg p-3">
															<p className="text-xs text-gray-600 mb-1">Realisasi</p>
															<p className="text-lg font-bold text-gray-900">
																{tahap.hasData ? `Rp ${tahap.realisasi}` : <span className="text-gray-400 text-sm">Tidak ada data</span>}
															</p>
														</div>
													</div>
												))}
											</div>
										</div>
									)}
								</>
							)}
						</div>
					))}
				</div>

				
			</div>

			{/* Kelembagaan Section */}
			<div>
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
						<LuBuilding2 className="w-5 h-5 text-blue-600" />
						Data Kelembagaan
					</h2>
					<Link
						to="/desa/kelembagaan"
						className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
					>
						Lihat Semua
						<LuTrendingUp className="w-4 h-4" />
					</Link>
				</div>

				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{kelembagaanCards.map((card, index) => {
						const IconComponent = card.icon;
						return (
							<Link
								key={index}
								to={card.link}
								className={`${card.bgColor} rounded-lg border-2 ${card.textColor.replace('text-', 'border-').replace('-700', '-200')} p-5 hover:shadow-lg transition-all duration-200 hover:scale-105`}
							>
								<div className="flex items-center justify-between mb-3">
									<div className={`h-12 w-12 bg-gradient-to-r ${card.color} rounded-lg flex items-center justify-center shadow-md`}>
										<IconComponent className="h-6 w-6 text-white" />
									</div>
									<div className="text-right">
										<div className={`text-3xl font-bold ${card.textColor}`}>
											{card.value}
										</div>
									</div>
								</div>
								<h3 className={`text-sm font-semibold ${card.textColor}`}>
									{card.title}
								</h3>
							</Link>
						);
					})}
				</div>

				{/* Total Lembaga */}
				<div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 p-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
								<LuBuilding2 className="h-5 w-5 text-white" />
							</div>
							<div>
								<p className="text-sm text-gray-600">Total Lembaga</p>
								<p className="text-2xl font-bold text-blue-900">
									{kelembagaan?.total_lembaga || 0} Lembaga
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			
		</div>
	);
};

export default DesaDashboardPage;
