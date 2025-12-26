import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Activity, ArrowLeft, Clock, UserCheck } from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';

const PMDPage = () => {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState(null);

	useEffect(() => {
		fetchDashboard();
	}, []);

	const fetchDashboard = async () => {
		try {
			setLoading(true);
			const response = await api.get('/bidang/5/dashboard');
			if (response.data.success) {
				setData(response.data.data);
			}
		} catch (error) {
			console.error('Error fetching dashboard:', error);
			toast.error('Gagal memuat data bidang');
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
					<p className="mt-4 text-gray-600">Memuat data...</p>
				</div>
			</div>
		);
	}

	const stats = data?.stats || {};
	const activityLogs = data?.activityLogs || [];

	const statsCards = [
		{ title: 'Total RW', value: stats.total_rw || 0, icon: Users, color: 'from-orange-500 to-orange-600' },
		{ title: 'RW Aktif', value: stats.aktif_rw || 0, icon: UserCheck, color: 'from-green-500 to-green-600' },
		{ title: 'Total RT', value: stats.total_rt || 0, icon: Users, color: 'from-blue-500 to-blue-600' },
		{ title: 'RT Aktif', value: stats.aktif_rt || 0, icon: UserCheck, color: 'from-emerald-500 to-emerald-600' },
		{ title: 'Total Posyandu', value: stats.total_posyandu || 0, icon: Users, color: 'from-pink-500 to-pink-600' },
		{ title: 'Total Karang Taruna', value: stats.total_karang_taruna || 0, icon: Users, color: 'from-purple-500 to-purple-600' },
		{ title: 'Total LPM', value: stats.total_lpm || 0, icon: Users, color: 'from-indigo-500 to-indigo-600' },
		{ title: 'Total PKK', value: stats.total_pkk || 0, icon: Users, color: 'from-red-500 to-red-600' }
	];

	const getActionColor = (action) => {
		const colors = {
			create: 'text-green-600 bg-green-50',
			update: 'text-blue-600 bg-blue-50',
			delete: 'text-red-600 bg-red-50',
			approve: 'text-purple-600 bg-purple-50',
			reject: 'text-orange-600 bg-orange-50',
			upload: 'text-teal-600 bg-teal-50',
			download: 'text-gray-600 bg-gray-50'
		};
		return colors[action] || 'text-gray-600 bg-gray-50';
	};

	const formatTime = (dateString) => {
		const date = new Date(dateString);
		const now = new Date();
		const diff = Math.floor((now - date) / 1000);

		if (diff < 60) return 'Baru saja';
		if (diff < 3600) return `${Math.floor(diff / 60)} menit yang lalu`;
		if (diff < 86400) return `${Math.floor(diff / 3600)} jam yang lalu`;
		if (diff < 604800) return `${Math.floor(diff / 86400)} hari yang lalu`;
		
		return date.toLocaleDateString('id-ID', { 
			day: 'numeric', 
			month: 'short', 
			year: 'numeric' 
		});
	};

	return (
		<div className="min-h-screen bg-gray-50 pb-6">
			<div className="bg-gradient-to-br from-orange-600 via-orange-700 to-orange-800 text-white">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
					<button 
						onClick={() => navigate(-1)}
						className="mb-4 flex items-center gap-2 text-orange-100 hover:text-white transition-colors"
					>
						<ArrowLeft className="h-5 w-5" />
						Kembali
					</button>
					<div className="flex items-center gap-4">
						<div className="h-16 w-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
							<Users className="h-8 w-8" />
						</div>
						<div>
							<h1 className="text-2xl font-bold">Bidang PMD</h1>
							<p className="text-orange-100 mt-1">Pemberdayaan Masyarakat Desa</p>
						</div>
					</div>
				</div>
			</div>

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
					{statsCards.map((stat, index) => (
						<div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
							<div className="flex items-center gap-3 mb-3">
								<div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
									<stat.icon className="h-5 w-5 text-white" />
								</div>
							</div>
							<p className="text-xs text-gray-600 mb-1">{stat.title}</p>
							<p className="text-xl font-bold text-gray-800">{stat.value}</p>
						</div>
					))}
				</div>

				{/* Quick Actions - Fitur Utama */}
				<div className="mb-6">
					<button
						onClick={() => navigate('/pmd/kelembagaan')}
						className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-orange-300 transition-all text-left group"
					>
						<div className="flex items-center gap-4">
							<div className="h-14 w-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
								<Users className="h-7 w-7 text-white" />
							</div>
							<div>
								<h3 className="font-bold text-gray-800 text-lg mb-1">Kelola Kelembagaan</h3>
								<p className="text-sm text-gray-500">Data RW, RT, Posyandu, Karang Taruna, LPM, PKK, Satlinmas</p>
							</div>
						</div>
					</button>
				</div>

				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<div className="flex items-center gap-3 mb-6">
						<Activity className="h-6 w-6 text-orange-600" />
						<h2 className="text-xl font-bold text-gray-800">Aktivitas Terkini</h2>
					</div>

					{activityLogs.length === 0 ? (
						<div className="text-center py-12">
							<Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
							<p className="text-gray-500">Belum ada aktivitas</p>
						</div>
					) : (
						<div className="space-y-4">
							{activityLogs.map((log) => (
								<div key={log.id} className="flex gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
									<div className="flex-shrink-0">
										<div className={`h-10 w-10 rounded-full ${getActionColor(log.action)} flex items-center justify-center font-semibold text-sm uppercase`}>
											{log.action.substring(0, 2)}
										</div>
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm text-gray-800 font-medium">{log.description}</p>
										<div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
											<span className="font-medium">{log.userName}</span>
											<span>•</span>
											<span className="capitalize">{log.module}</span>
											<span>•</span>
											<div className="flex items-center gap-1">
												<Clock className="h-3 w-3" />
												{formatTime(log.createdAt)}
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default PMDPage;
