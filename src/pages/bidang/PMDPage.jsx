import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Activity, ArrowLeft, Clock, UserCheck, RefreshCw, Info, Zap, ChevronRight, FileText } from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';

const PMDPage = () => {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState(null);
	const [activeTab, setActiveTab] = useState('overview');
	const [activityLogs, setActivityLogs] = useState([]);
	const [activityLoading, setActivityLoading] = useState(false);
	const [activityFilter, setActivityFilter] = useState('');

	useEffect(() => {
		fetchDashboard();
	}, []);

	useEffect(() => {
		if (activeTab === 'activity') {
			fetchActivityLogs();
		}
	}, [activeTab, activityFilter]);

	const fetchActivityLogs = async () => {
		try {
			setActivityLoading(true);
			const params = activityFilter ? { module: activityFilter } : {};
			const response = await api.get('/bidang/5/activity-logs', { params });
			if (response.data.success) {
				setActivityLogs(response.data.data || []);
			}
		} catch (error) {
			console.error('Error fetching activity logs:', error);
			toast.error('Gagal memuat log aktivitas');
		} finally {
			setActivityLoading(false);
		}
	};

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
					
					{/* Tab Navigation */}
					<div className="flex gap-2 mt-6">
						<button
							onClick={() => setActiveTab('overview')}
							className={`px-6 py-2.5 rounded-xl font-medium transition-all ${
								activeTab === 'overview'
									? 'bg-white text-orange-700 shadow-lg'
									: 'bg-white/10 text-white hover:bg-white/20'
							}`}
						>
							📊 Overview
						</button>
						<button
							onClick={() => setActiveTab('activity')}
							className={`px-6 py-2.5 rounded-xl font-medium transition-all ${
								activeTab === 'activity'
									? 'bg-white text-orange-700 shadow-lg'
									: 'bg-white/10 text-white hover:bg-white/20'
							}`}
						>
							⚡ Aktivitas
						</button>
					</div>
				</div>
			</div>

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				{activeTab === 'overview' && (
					<div className="relative bg-gradient-to-br from-white via-white to-teal-50/30 rounded-2xl shadow-xl border border-gray-200/50 p-8 overflow-hidden">
						{/* Decorative Elements */}
						<div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-teal-400/10 to-emerald-500/10 rounded-full blur-3xl -z-0"></div>
						<div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-orange-400/10 to-yellow-500/10 rounded-full blur-3xl -z-0"></div>

						<div className="relative z-10">
							{/* Welcome Section */}
							<div className="text-center mb-10">
								<div className="inline-flex h-20 w-20 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-3xl items-center justify-center mb-6 shadow-2xl shadow-teal-500/30 animate-pulse">
									<Users className="h-10 w-10 text-white" />
								</div>
								<h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 via-teal-700 to-emerald-600 bg-clip-text text-transparent mb-3">
									Selamat Datang di Bidang PMD
								</h2>
								<p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
									<strong>Pemberdayaan Masyarakat Desa</strong><br />
									Kelola data kelembagaan desa, Dana Desa, dan pemberdayaan masyarakat dengan mudah dan terstruktur
								</p>
							</div>

							{/* Features Info */}
							<div className="bg-gradient-to-br from-teal-50/50 to-emerald-50/50 rounded-3xl p-8 mb-10 border border-teal-100/50 shadow-lg">
								<h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
									<Info className="h-6 w-6 text-teal-600" />
									Apa yang Bisa Dilakukan di Halaman Ini?
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="flex gap-4">
										<div className="h-14 w-14 bg-orange-100 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
											<Users className="h-7 w-7 text-orange-600" />
										</div>
										<div>
											<h4 className="font-bold text-gray-800 mb-2 text-base">Kelola Kelembagaan Desa</h4>
											<p className="text-sm text-gray-600 leading-relaxed">Data RW, RT, Posyandu, Karang Taruna, LPM, PKK, dan Satlinmas</p>
										</div>
									</div>
									<div className="flex gap-4">
										<div className="h-14 w-14 bg-green-100 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
											<FileText className="h-7 w-7 text-green-600" />
										</div>
										<div>
											<h4 className="font-bold text-gray-800 mb-2 text-base">Laporan Kelembagaan</h4>
											<p className="text-sm text-gray-600 leading-relaxed">Buat dan kelola laporan kelembagaan desa secara berkala</p>
										</div>
									</div>
									<div className="flex gap-4">
										<div className="h-14 w-14 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
											<Activity className="h-7 w-7 text-blue-600" />
										</div>
										<div>
											<h4 className="font-bold text-gray-800 mb-2 text-base">Monitor Aktivitas</h4>
											<p className="text-sm text-gray-600 leading-relaxed">Pantau semua aktivitas terkini pemberdayaan masyarakat secara real-time</p>
										</div>
									</div>
								</div>
							</div>

							{/* Quick Actions */}
							<div>
								<h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
									<Zap className="h-5 w-5 text-yellow-500" />
									Aksi Cepat
								</h3>
								<div className="grid grid-cols-1 gap-4">
									<button
										onClick={() => navigate('/bidang/pmd/kelembagaan')}
										className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 p-6 hover:border-orange-300 transition-all duration-300 text-left overflow-hidden hover:-translate-y-1"
									>
										<div className="absolute inset-0 bg-gradient-to-br from-orange-400/5 to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
										<div className="relative flex items-center gap-5">
											<div className="h-16 w-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-orange-500/25">
												<Users className="h-8 w-8 text-white" />
											</div>
											<div className="flex-1">
												<h3 className="font-bold text-gray-800 text-lg mb-1">Kelola Kelembagaan</h3>
												<p className="text-sm text-gray-500">Data RW, RT, Posyandu, Karang Taruna, LPM, PKK, Satlinmas</p>
											</div>
											<ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
										</div>
									</button>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Activity Tab */}
				{activeTab === 'activity' && (
					<div className="space-y-6">
						{/* Filter */}
						<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
							<div className="flex items-center justify-between flex-wrap gap-4">
								<div className="flex items-center gap-3">
									<Activity className="h-5 w-5 text-orange-600" />
									<h2 className="text-lg font-bold text-gray-800">Log Aktivitas</h2>
								</div>
								<div className="flex items-center gap-3">
									<select
										value={activityFilter}
										onChange={(e) => setActivityFilter(e.target.value)}
										className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
									>
										<option value="">Semua Modul</option>
										<option value="kelembagaan">Kelembagaan</option>
									</select>
									<button
										onClick={fetchActivityLogs}
										className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
									>
										<RefreshCw className="h-4 w-4" />
										Refresh
									</button>
								</div>
							</div>
						</div>

						{/* Activity List */}
						<div className="bg-white rounded-xl shadow-sm border border-gray-200">
							{activityLoading ? (
								<div className="flex items-center justify-center py-12">
									<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
								</div>
							) : activityLogs.length === 0 ? (
								<div className="text-center py-12">
									<Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
									<p className="text-gray-500">Belum ada aktivitas</p>
								</div>
							) : (
								<div className="divide-y divide-gray-100">
									{activityLogs.map((log) => (
										<div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
											<div className="flex gap-4">
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
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default PMDPage;
