import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBidangPath } from '../../hooks/useBidangPath';
import { FileText, Mail, Plane, Users, Activity, TrendingUp, ArrowLeft, Clock, Zap, ChevronRight, Building, BarChart, Calendar, Bell, Image, RefreshCw, Video, ClipboardCheck } from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';
import DaftarPegawaiBidang from '../../components/bidang/DaftarPegawaiBidang';

const SekretariatPage = () => {
	const navigate = useNavigate();
	const { getPath } = useBidangPath();
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState(null);
	const [activeTab, setActiveTab] = useState('overview'); // overview, activity
	const [activityLogs, setActivityLogs] = useState([]);
	const [activityLoading, setActivityLoading] = useState(false);
	const [activityFilter, setActivityFilter] = useState('all');
	const user = JSON.parse(localStorage.getItem('user') || '{}');

	useEffect(() => {
		fetchDashboard();
	}, []);

	// Fetch activity logs when activity tab is active
	useEffect(() => {
		if (activeTab === 'activity') {
			fetchActivityLogs();
		}
	}, [activeTab, activityFilter]);

	const fetchDashboard = async () => {
		try {
			setLoading(true);
			const response = await api.get('/bidang/2/dashboard');
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

	const fetchActivityLogs = async () => {
		try {
			setActivityLoading(true);
			const params = {};
			if (activityFilter !== 'all') {
				params.module = activityFilter;
			}
			
			const response = await api.get('/bidang/2/activity-logs', { params });
			
			if (response.data.success) {
				setActivityLogs(response.data.data || []);
			}
		} catch (error) {
			console.error('Error fetching activity logs:', error);
			toast.error('Gagal memuat aktivitas');
		} finally {
			setActivityLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
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
		const diff = Math.floor((now - date) / 1000); // seconds

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
			{/* Header */}
			<div className="bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 text-white">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
					<button 
						onClick={() => navigate(-1)}
						className="mb-4 flex items-center gap-2 text-purple-100 hover:text-white transition-colors"
					>
						<ArrowLeft className="h-5 w-5" />
						Kembali
					</button>
					<div className="flex items-center gap-4">
						<div className="h-16 w-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
							<FileText className="h-8 w-8" />
						</div>
						<div>
							<h1 className="text-2xl font-bold">Bidang Sekretariat</h1>
							<p className="text-purple-100 mt-1">Kelola disposisi surat, perjalanan dinas, dan kepegawaian</p>
						</div>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
			{activeTab === 'overview' && (
					<div className="relative bg-gradient-to-br from-white via-white to-gray-50/30 rounded-2xl shadow-xl border border-gray-200/50 p-8 overflow-hidden">
						{/* Decorative Elements */}
						<div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-gray-400/10 to-slate-500/10 rounded-full blur-3xl -z-0"></div>
						<div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-400/10 to-indigo-500/10 rounded-full blur-3xl -z-0"></div>

						<div className="relative z-10">
							{/* Quick Actions */}
							<div>
								<h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
									<Zap className="h-5 w-5 text-yellow-500" />
									Aksi Cepat
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
									<button
										onClick={() => navigate(getPath('/sekretariat/disposisi'))}
										className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 p-6 hover:border-blue-300 transition-all duration-300 text-left overflow-hidden hover:-translate-y-1"
									>
										<div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
										<div className="relative flex items-center gap-5">
											<div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-blue-500/25">
												<Mail className="h-8 w-8 text-white" />
											</div>
											<div className="flex-1">
												<h3 className="font-bold text-gray-800 text-lg mb-1">Disposisi Surat</h3>
												<p className="text-sm text-gray-500">Kelola surat masuk & disposisi</p>
											</div>
											<ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
										</div>
									</button>

									<button
										onClick={() => navigate(getPath('/sekretariat/perjadin'))}
										className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 p-6 hover:border-green-300 transition-all duration-300 text-left overflow-hidden hover:-translate-y-1"
									>
										<div className="absolute inset-0 bg-gradient-to-br from-green-400/5 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
										<div className="relative flex items-center gap-5">
											<div className="h-16 w-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-green-500/25">
												<Plane className="h-8 w-8 text-white" />
											</div>
											<div className="flex-1">
												<h3 className="font-bold text-gray-800 text-lg mb-1">Perjalanan Dinas</h3>
												<p className="text-sm text-gray-500">Kelola perjadin & tugas</p>
											</div>
											<ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all" />
										</div>
									</button>

									<button
										onClick={() => navigate(getPath('/sekretariat/pegawai'))}
										className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 p-6 hover:border-indigo-300 transition-all duration-300 text-left overflow-hidden hover:-translate-y-1"
									>
										<div className="absolute inset-0 bg-gradient-to-br from-indigo-400/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
										<div className="relative flex items-center gap-5">
											<div className="h-16 w-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-indigo-500/25">
												<Users className="h-8 w-8 text-white" />
											</div>
											<div className="flex-1">
												<h3 className="font-bold text-gray-800 text-lg mb-1">Manajemen Pegawai</h3>
												<p className="text-sm text-gray-500">Data pegawai & kepegawaian</p>
											</div>
											<ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
										</div>
									</button>

									<button
										onClick={() => navigate(getPath('/sekretariat/jadwal-kegiatan'))}
										className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 p-6 hover:border-purple-300 transition-all duration-300 text-left overflow-hidden hover:-translate-y-1"
									>
										<div className="absolute inset-0 bg-gradient-to-br from-purple-400/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
										<div className="relative flex items-center gap-5">
											<div className="h-16 w-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-purple-500/25">
												<Calendar className="h-8 w-8 text-white" />
											</div>
											<div className="flex-1">
												<h3 className="font-bold text-gray-800 text-lg mb-1">Jadwal Kegiatan</h3>
												<p className="text-sm text-gray-500">Kelola jadwal & agenda</p>
											</div>
											<ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
										</div>
									</button>

								{(user?.role === 'superadmin' || Number(user?.bidang_id) === 2) && (
										<button
											onClick={() => navigate(getPath('/sekretariat/notifikasi'))}
											className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 p-6 hover:border-orange-300 transition-all duration-300 text-left overflow-hidden hover:-translate-y-1"
										>
											<div className="absolute inset-0 bg-gradient-to-br from-orange-400/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
											<div className="relative flex items-center gap-5">
												<div className="h-16 w-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-orange-500/25">
													<Bell className="h-8 w-8 text-white" />
												</div>
												<div className="flex-1">
													<h3 className="font-bold text-gray-800 text-lg mb-1">Kelola Notifikasi</h3>
													<p className="text-sm text-gray-500">Push notification & pengumuman</p>
												</div>
												<ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
											</div>
										</button>
									)}

									{/* Kelola Informasi - Banner untuk dashboard pegawai */}
								{(user?.role === 'superadmin' || Number(user?.bidang_id) === 2) && (
										<button
											onClick={() => navigate(getPath('/sekretariat/informasi'))}
											className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 p-6 hover:border-teal-300 transition-all duration-300 text-left overflow-hidden hover:-translate-y-1"
										>
											<div className="absolute inset-0 bg-gradient-to-br from-teal-400/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
											<div className="relative flex items-center gap-5">
												<div className="h-16 w-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-teal-500/25">
													<Image className="h-8 w-8 text-white" />
												</div>
												<div className="flex-1">
													<h3 className="font-bold text-gray-800 text-lg mb-1">Kelola Informasi</h3>
													<p className="text-sm text-gray-500">Banner informasi di dashboard</p>
												</div>
												<ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
											</div>
										</button>
									)}

									{/* Video Meeting */}
								{(user?.role === 'superadmin' || Number(user?.bidang_id) === 2) && (
										<button
											onClick={() => navigate(getPath('/sekretariat/absensi-management'))}
											className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 p-6 hover:border-cyan-300 transition-all duration-300 text-left overflow-hidden hover:-translate-y-1"
										>
											<div className="absolute inset-0 bg-gradient-to-br from-cyan-400/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
											<div className="relative flex items-center gap-5">
												<div className="h-16 w-16 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-cyan-500/25">
													<ClipboardCheck className="h-8 w-8 text-white" />
												</div>
												<div className="flex-1">
													<h3 className="font-bold text-gray-800 text-lg mb-1">Kelola Absensi</h3>
													<p className="text-sm text-gray-500">Rekap presensi & pengaturan jam kerja</p>
												</div>
												<ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-cyan-600 group-hover:translate-x-1 transition-all" />
											</div>
										</button>
									)}

									{/* Video Meeting - original */}
								{(user?.role === 'superadmin' || Number(user?.bidang_id) === 2) && (
										<button
											onClick={() => navigate(getPath('/sekretariat/video-meeting'))}
											className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 p-6 hover:border-rose-300 transition-all duration-300 text-left overflow-hidden hover:-translate-y-1"
										>
											<div className="absolute inset-0 bg-gradient-to-br from-rose-400/5 to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
											<div className="relative flex items-center gap-5">
												<div className="h-16 w-16 bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-rose-500/25">
													<Video className="h-8 w-8 text-white" />
												</div>
												<div className="flex-1">
													<h3 className="font-bold text-gray-800 text-lg mb-1">Video Meeting</h3>
													<p className="text-sm text-gray-500">Rapat online & konferensi video</p>
												</div>
												<ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-rose-600 group-hover:translate-x-1 transition-all" />
											</div>
										</button>
									)}

									{/* Aktivitas Button */}
									<button
										onClick={() => setActiveTab('activity')}
										className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 p-6 hover:border-amber-300 transition-all duration-300 text-left overflow-hidden hover:-translate-y-1"
									>
										<div className="absolute inset-0 bg-gradient-to-br from-amber-400/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
										<div className="relative flex items-center gap-5">
											<div className="h-16 w-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-amber-500/25">
												<Activity className="h-8 w-8 text-white" />
											</div>
											<div className="flex-1">
												<h3 className="font-bold text-gray-800 text-lg mb-1">Log Aktivitas</h3>
												<p className="text-sm text-gray-500">Pantau aktivitas terkini</p>
											</div>
											<ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
										</div>
									</button>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Daftar Pegawai */}
				{activeTab === 'overview' && (
					<div className="mt-6">
						<DaftarPegawaiBidang bidangId={2} bidangName="Bidang Sekretariat" />
					</div>
				)}

				{/* Activity Tab */}
				{activeTab === 'activity' && (
					<div className="space-y-6">
						{/* Back Button */}
						<button
							onClick={() => setActiveTab('overview')}
							className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors mb-4"
						>
							<ArrowLeft className="h-5 w-5" />
							Kembali ke Menu
						</button>

						{/* Filter */}
						<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
							<div className="flex items-center justify-between flex-wrap gap-4">
								<div className="flex items-center gap-3">
									<Activity className="h-5 w-5 text-purple-600" />
									<h2 className="text-lg font-bold text-gray-800">Log Aktivitas</h2>
								</div>
								<div className="flex items-center gap-3">
									<select
										value={activityFilter}
										onChange={(e) => setActivityFilter(e.target.value)}
										className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
									>
										<option value="">Semua Modul</option>
										<option value="disposisi">Disposisi</option>
										<option value="perjadin">Perjalanan Dinas</option>
										<option value="pegawai">Pegawai</option>
									</select>
									<button
										onClick={fetchActivityLogs}
										className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
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
									<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
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

export default SekretariatPage;
