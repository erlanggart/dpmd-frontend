// src/pages/superadmin/ActivityLogsPage.jsx
import React, { useState, useEffect } from 'react';
import { 
	FiActivity, FiFilter, FiRefreshCw, FiClock, FiUser, 
	FiLayers, FiAlertCircle, FiCheckCircle, FiSearch,
	FiDownload, FiCalendar, FiBarChart2, FiTrendingUp
} from 'react-icons/fi';
import api from '../../api';
import toast from 'react-hot-toast';

const MODULE_LABELS = {
	bankeu: 'Bantuan Keuangan',
	kelembagaan: 'Kelembagaan',
	produk_hukum: 'Produk Hukum',
	jadwal_kegiatan: 'Jadwal Kegiatan',
	video_meeting: 'Video Meeting',
	disposisi: 'Disposisi',
	informasi: 'Informasi',
	bhprd: 'BHPRD',
	perjadin: 'Perjalanan Dinas',
	surat_masuk: 'Surat Masuk',
	bumdes: 'BUMDes',
	berita: 'Berita',
	dd: 'Dana Desa',
	add: 'Alokasi Dana Desa',
	pegawai: 'Pegawai',
	user: 'User Management',
	dana_desa: 'Dana Desa',
};

const MODULE_COLORS = [
	'bg-purple-500',
	'bg-blue-500',
	'bg-emerald-500',
	'bg-orange-500',
	'bg-pink-500',
	'bg-cyan-500',
	'bg-yellow-500',
	'bg-red-500',
	'bg-indigo-500',
	'bg-teal-500',
	'bg-lime-500',
	'bg-amber-500',
	'bg-violet-500',
	'bg-fuchsia-500',
	'bg-rose-500',
	'bg-sky-500',
];

const ActivityLogsPage = () => {
	const [logs, setLogs] = useState([]);
	const [loading, setLoading] = useState(true);
	const [filters, setFilters] = useState({
		bidang_id: '',
		module: '',
		action: '',
		search: '',
		startDate: '',
		endDate: '',
		page: 1,
		limit: 100
	});
	const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
	const [stats, setStats] = useState({
		total: 0,
		today: 0,
		thisWeek: 0,
		thisMonth: 0
	});
	const [moduleStats, setModuleStats] = useState([]);
	const [bidangList, setBidangList] = useState([
		{ id: 2, nama: 'Sekretariat' },
		{ id: 3, nama: 'SPKED' },
		{ id: 4, nama: 'KKD' },
		{ id: 5, nama: 'PMD' },
		{ id: 6, nama: 'Pemdes' }
	]);

	useEffect(() => {
		fetchBidangList();
		fetchStats();
		fetchModuleStats();
		fetchLogs();
	}, []);

	useEffect(() => {
		fetchLogs();
	}, [filters.bidang_id, filters.module, filters.action, filters.limit, filters.page]);

	const fetchBidangList = async () => {
		try {
			const response = await api.get('/bidang');
			if (response.data.success && response.data.data) {
				setBidangList(response.data.data);
			}
		} catch (error) {
			console.error('Error fetching bidang list:', error);
		}
	};

	const fetchStats = async () => {
		try {
			const response = await api.get('/activity-logs/stats');
			if (response.data.success && response.data.data) {
				setStats(response.data.data);
			}
		} catch (error) {
			console.error('Error fetching stats:', error);
		}
	};

	const fetchModuleStats = async () => {
		try {
			const response = await api.get('/activity-logs/module-stats');
			if (response.data.success && response.data.data) {
				setModuleStats(response.data.data);
			}
		} catch (error) {
			console.error('Error fetching module stats:', error);
		}
	};

	const fetchLogs = async () => {
		try {
			setLoading(true);
			
			const params = {
				limit: filters.limit,
				page: filters.page,
				module: filters.module || undefined,
				action: filters.action || undefined,
				bidang_id: filters.bidang_id || undefined,
				search: filters.search || undefined
			};
			
			Object.keys(params).forEach(key => 
				params[key] === undefined && delete params[key]
			);
			
			const response = await api.get('/activity-logs', { params });
			
			if (response.data.success && response.data.data) {
				setLogs(response.data.data);
				// Update pagination from response meta if available
				if (response.data.meta) {
					setPagination(response.data.meta);
				} else {
					setPagination(prev => ({ ...prev, total: response.data.data.length }));
				}
			}

		} catch (error) {
			console.error('Error fetching logs:', error);
			toast.error('Gagal memuat activity logs');
		} finally {
			setLoading(false);
		}
	};

	const handleFilterChange = (key, value) => {
		setFilters(prev => ({ ...prev, [key]: value }));
	};

	const handleSearch = () => {
		setFilters(prev => ({ ...prev, page: 1 }));
		fetchLogs();
	};

	const handleReset = () => {
		setFilters({
			bidang_id: '',
			module: '',
			action: '',
			search: '',
			startDate: '',
			endDate: '',
			page: 1,
			limit: 100
		});
		fetchStats();
		fetchModuleStats();
		setTimeout(() => fetchLogs(), 100);
	};

	const getActionColor = (action) => {
		const colors = {
			create: 'bg-green-100 text-green-700 border-green-200',
			update: 'bg-blue-100 text-blue-700 border-blue-200',
			delete: 'bg-red-100 text-red-700 border-red-200',
			approve: 'bg-purple-100 text-purple-700 border-purple-200',
			reject: 'bg-orange-100 text-orange-700 border-orange-200',
			upload: 'bg-teal-100 text-teal-700 border-teal-200',
			download: 'bg-gray-100 text-gray-700 border-gray-200',
			view: 'bg-indigo-100 text-indigo-700 border-indigo-200',
			login: 'bg-cyan-100 text-cyan-700 border-cyan-200'
		};
		return colors[action?.toLowerCase()] || 'bg-gray-100 text-gray-700 border-gray-200';
	};

	const getBidangName = (bidangId) => {
		const bidang = bidangList.find(b => Number(b.id) === Number(bidangId));
		return bidang?.nama || `Bidang ${bidangId}`;
	};

	const formatTime = (dateString) => {
		const date = new Date(dateString);
		const now = new Date();
		const diff = Math.floor((now - date) / 1000);

		if (diff < 60) return 'Baru saja';
		if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
		if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
		if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
		
		return date.toLocaleDateString('id-ID', { 
			day: 'numeric', 
			month: 'short', 
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	};

	const exportLogs = () => {
		// Simple CSV export
		const csv = [
			['Waktu', 'User', 'Role', 'Bidang', 'Module', 'Action', 'Deskripsi'].join(','),
			...logs.map(log => [
				new Date(log.createdAt).toLocaleString('id-ID'),
				log.userName || '-',
				log.userRole || '-',
				getBidangName(log.bidangId),
				log.module || '-',
				log.action || '-',
				`"${log.description || '-'}"`
			].join(','))
		].join('\n');

		const blob = new Blob([csv], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
		a.click();
		
		toast.success('Log berhasil diexport');
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
			{/* Header */}
			<div className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-800 text-white shadow-2xl">
				<div className=" px-4 sm:px-6 lg:px-8 py-12">
					<div className="flex items-center justify-between">
						<div>
							<div className="flex items-center gap-4 mb-4">
								<div className="h-16 w-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg">
									<FiActivity className="h-8 w-8 text-white" />
								</div>
								<div>
									<h1 className="text-4xl font-bold">Activity Logs</h1>
									<p className="text-purple-100 text-lg mt-1">
										Monitor semua aktivitas di sistem DPMD
									</p>
								</div>
							</div>
						</div>
						<button
							onClick={exportLogs}
							disabled={logs.length === 0}
							className="flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-md hover:bg-white/30 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<FiDownload className="h-5 w-5" />
							Export CSV
						</button>
					</div>

					{/* Stats */}
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
						<div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
							<div className="text-purple-100 text-sm mb-1">Total Logs</div>
							<div className="text-3xl font-bold">{stats.total}</div>
						</div>
						<div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
							<div className="text-purple-100 text-sm mb-1">Hari Ini</div>
							<div className="text-3xl font-bold">{stats.today}</div>
						</div>
						<div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
							<div className="text-purple-100 text-sm mb-1">Minggu Ini</div>
							<div className="text-3xl font-bold">{stats.thisWeek}</div>
						</div>
						<div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
							<div className="text-purple-100 text-sm mb-1">Bulan Ini</div>
							<div className="text-3xl font-bold">{stats.thisMonth}</div>
						</div>
					</div>
				</div>
			</div>

			{/* Content - Two Column Layout */}
			<div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
					{/* Left Column - Module Statistics */}
					<div className="lg:col-span-4">
						<div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sticky top-6">
							<div className="flex items-center gap-3 mb-6">
								<FiBarChart2 className="h-5 w-5 text-purple-600" />
								<h2 className="text-lg font-bold text-gray-800">Statistik Modul</h2>
							</div>

							{moduleStats.length === 0 ? (
								<div className="text-center py-8 text-gray-400">
									<FiBarChart2 className="h-10 w-10 mx-auto mb-2" />
									<p className="text-sm">Memuat statistik...</p>
								</div>
							) : (
								<>
									{/* Total */}
									<div className="mb-4 p-3 bg-purple-50 rounded-xl border border-purple-100">
										<div className="flex items-center justify-between">
											<span className="text-sm font-medium text-purple-700">Total Semua Modul</span>
											<span className="text-lg font-bold text-purple-800">
												{moduleStats.reduce((sum, m) => sum + m.count, 0).toLocaleString('id-ID')}
											</span>
										</div>
									</div>

									{/* Module List */}
									<div className="space-y-3">
										{moduleStats.map((item, index) => {
											const total = moduleStats.reduce((sum, m) => sum + m.count, 0);
											const percentage = ((item.count / total) * 100).toFixed(1);
											const colorClass = MODULE_COLORS[index % MODULE_COLORS.length];
											return (
												<div key={item.module} className="group">
													<div className="flex items-center justify-between mb-1">
														<button
															onClick={() => {
																setFilters(prev => ({ 
																	...prev, 
																	module: prev.module === item.module ? '' : item.module,
																	page: 1 
																}));
															}}
															className={`text-sm font-medium transition-colors text-left ${
																filters.module === item.module
																	? 'text-purple-700 underline'
																	: 'text-gray-700 hover:text-purple-600'
															}`}
														>
															{MODULE_LABELS[item.module] || item.module}
														</button>
														<div className="flex items-center gap-2">
															<span className="text-xs text-gray-500">{percentage}%</span>
															<span className="text-sm font-semibold text-gray-800">
																{item.count.toLocaleString('id-ID')}
															</span>
														</div>
													</div>
													<div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
														<div
															className={`h-full rounded-full ${colorClass} transition-all duration-500`}
															style={{ width: `${percentage}%` }}
														/>
													</div>
												</div>
											);
										})}
									</div>

									{/* Top 3 Highlight */}
									{moduleStats.length >= 3 && (
										<div className="mt-6 pt-4 border-t border-gray-100">
											<div className="flex items-center gap-2 mb-3">
												<FiTrendingUp className="h-4 w-4 text-purple-600" />
												<span className="text-sm font-semibold text-gray-700">Top 3 Modul Teraktif</span>
											</div>
											<div className="space-y-2">
												{moduleStats.slice(0, 3).map((item, index) => (
													<div key={item.module} className="flex items-center gap-3">
														<span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
															index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-700'
														}`}>
															{index + 1}
														</span>
														<span className="text-sm text-gray-700 flex-1">
															{MODULE_LABELS[item.module] || item.module}
														</span>
														<span className="text-sm font-bold text-gray-800">
															{item.count.toLocaleString('id-ID')}
														</span>
													</div>
												))}
											</div>
										</div>
									)}
								</>
							)}
						</div>
					</div>

					{/* Right Column - Filters + Activity List */}
					<div className="lg:col-span-8">
						{/* Filters */}
						<div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
							<div className="flex items-center gap-3 mb-6">
								<FiFilter className="h-5 w-5 text-purple-600" />
								<h2 className="text-lg font-bold text-gray-800">Filter & Search</h2>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
								{/* Bidang Filter */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Bidang
									</label>
									<select
										value={filters.bidang_id}
										onChange={(e) => handleFilterChange('bidang_id', e.target.value)}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
									>
										<option value="">Semua Bidang</option>
										<option value="null">Kelembagaan (Non-Bidang)</option>
										{bidangList.map(bidang => (
											<option key={bidang.id} value={bidang.id}>
												{bidang.nama}
											</option>
										))}
									</select>
								</div>

								{/* Module Filter */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Module
									</label>
									<select
										value={filters.module}
										onChange={(e) => handleFilterChange('module', e.target.value)}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
									>
										<option value="">Semua Module</option>
										{moduleStats.map(m => (
											<option key={m.module} value={m.module}>
												{MODULE_LABELS[m.module] || m.module}
											</option>
										))}
									</select>
								</div>

								{/* Action Filter */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Action
									</label>
									<select
										value={filters.action}
										onChange={(e) => handleFilterChange('action', e.target.value)}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
									>
										<option value="">Semua Action</option>
										<option value="create">Create</option>
										<option value="update">Update</option>
										<option value="delete">Delete</option>
										<option value="approve">Approve</option>
										<option value="submit">Submit</option>
										<option value="verify">Verify</option>
										<option value="upload">Upload</option>
										<option value="read">Read</option>
										<option value="toggle_status">Toggle Status</option>
										<option value="revision">Revision</option>
										<option value="resubmit">Resubmit</option>
										<option value="cancel_approval">Cancel Approval</option>
										<option value="reopen_submission">Reopen Submission</option>
										<option value="update_status">Update Status</option>
										<option value="verify_pengurus">Verify Pengurus</option>
									</select>
								</div>

								{/* Search */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Search
									</label>
									<div className="relative">
										<input
											type="text"
											value={filters.search}
											onChange={(e) => handleFilterChange('search', e.target.value)}
											onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
											placeholder="Cari deskripsi, user..."
											className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
										/>
										<FiSearch className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
									</div>
								</div>
							</div>

							<div className="flex flex-wrap gap-3 mt-4">
								<button
									onClick={handleSearch}
									className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
								>
									<FiSearch className="h-4 w-4" />
									Search
								</button>
								<button
									onClick={handleReset}
									className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
								>
									<FiRefreshCw className="h-4 w-4" />
									Reset
								</button>
								<button
									onClick={fetchLogs}
									className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
								>
									<FiRefreshCw className="h-4 w-4" />
									Refresh
								</button>
								<div className="ml-auto flex items-center gap-2">
									<label className="text-sm text-gray-600">Tampilkan:</label>
									<select
										value={filters.limit}
										onChange={(e) => setFilters(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
										className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
									>
										<option value={50}>50</option>
										<option value={100}>100</option>
										<option value={200}>200</option>
										<option value={500}>500</option>
										<option value={1000}>1000</option>
									</select>
									<span className="text-sm text-gray-500">per halaman</span>
								</div>
							</div>
						</div>

						{/* Logs List */}
						<div className="bg-white rounded-2xl shadow-lg border border-gray-200">
							{loading ? (
								<div className="flex items-center justify-center py-20">
									<div className="text-center">
										<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
										<p className="text-gray-600">Memuat activity logs...</p>
									</div>
								</div>
							) : logs.length === 0 ? (
								<div className="text-center py-20">
									<FiActivity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
									<p className="text-gray-500 text-lg">Tidak ada activity log</p>
									<p className="text-gray-400 text-sm mt-2">Coba ubah filter atau refresh halaman</p>
								</div>
							) : (
								<div className="divide-y divide-gray-100">
									{logs.map((log, index) => (
										<div key={log.id || index} className="p-4 hover:bg-gray-50 transition-colors">
											<div className="flex gap-4">
												{/* Icon */}
												<div className="flex-shrink-0">
													<div className={`h-10 w-10 rounded-full ${getActionColor(log.action)} flex items-center justify-center font-semibold text-sm uppercase border`}>
														{log.action?.substring(0, 2) || 'AC'}
													</div>
												</div>

												{/* Content */}
												<div className="flex-1 min-w-0">
													<div className="flex items-start justify-between gap-4">
														<div className="flex-1">
															<p className="text-sm font-medium text-gray-800 mb-1">
																{log.description || 'Activity log'}
															</p>
															<div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
																<div className="flex items-center gap-1">
																	<FiUser className="h-3 w-3" />
																	<span className="font-medium">{log.userName || 'Unknown'}</span>
																</div>
																<span>•</span>
																<span className="capitalize">{log.userRole || '-'}</span>
																<span>•</span>
																<div className="flex items-center gap-1">
																	<FiLayers className="h-3 w-3" />
																	<span>{getBidangName(log.bidangId)}</span>
																</div>
																{log.module && (
																	<>
																		<span>•</span>
																		<span className="capitalize">{MODULE_LABELS[log.module] || log.module}</span>
																	</>
																)}
																<span>•</span>
																<div className="flex items-center gap-1">
																	<FiClock className="h-3 w-3" />
																	<span>{formatTime(log.createdAt)}</span>
																</div>
															</div>
														</div>
														<span className={`px-3 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)} border`}>
															{log.action || 'action'}
														</span>
													</div>
												</div>
											</div>
										</div>
									))}
								</div>
							)}
						</div>

						{/* Footer / Pagination */}
						{!loading && logs.length > 0 && (
							<div className="mt-6 flex items-center justify-between text-sm text-gray-500">
								<span>
									Menampilkan <strong className="text-gray-700">{logs.length}</strong> logs
									{stats.total > 0 && <> dari total <strong className="text-gray-700">{stats.total.toLocaleString('id-ID')}</strong></>}
								</span>
								<div className="flex items-center gap-2">
									<button
										onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
										disabled={filters.page <= 1}
										className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
									>
										← Prev
									</button>
									<span className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg font-medium">
										Hal. {filters.page}
									</span>
									<button
										onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
										disabled={logs.length < filters.limit}
										className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
									>
										Next →
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default ActivityLogsPage;
