// src/pages/superadmin/ActivityLogsPage.jsx
import React, { useState, useEffect } from 'react';
import { 
	FiActivity, FiFilter, FiRefreshCw, FiClock, FiUser, 
	FiLayers, FiAlertCircle, FiCheckCircle, FiSearch,
	FiDownload, FiCalendar
} from 'react-icons/fi';
import api from '../../api';
import toast from 'react-hot-toast';

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
		limit: 50
	});
	const [stats, setStats] = useState({
		total: 0,
		today: 0,
		thisWeek: 0,
		thisMonth: 0
	});
	const [bidangList, setBidangList] = useState([
		{ id: 2, nama: 'Sekretariat' },
		{ id: 3, nama: 'SPKED' },
		{ id: 4, nama: 'KKD' },
		{ id: 5, nama: 'PMD' },
		{ id: 6, nama: 'Pemdes' }
	]);

	useEffect(() => {
		fetchBidangList();
		fetchLogs();
	}, []);

	useEffect(() => {
		fetchLogs();
	}, [filters.bidang_id, filters.module, filters.action]);

	const fetchBidangList = async () => {
		try {
			const response = await api.get('/bidang');
			if (response.data.success && response.data.data) {
				setBidangList(response.data.data);
			}
		} catch (error) {
			console.error('Error fetching bidang list:', error);
			// Keep default bidang list if API fails
		}
	};

	const fetchLogs = async () => {
		try {
			setLoading(true);
			
			// Use new unified API endpoint for superadmin
			const params = {
				limit: filters.limit,
				module: filters.module || undefined,
				action: filters.action || undefined,
				bidang_id: filters.bidang_id || undefined,
				search: filters.search || undefined
			};
			
			// Remove undefined params
			Object.keys(params).forEach(key => 
				params[key] === undefined && delete params[key]
			);
			
			const response = await api.get('/activity-logs', { params });
			
			if (response.data.success && response.data.data) {
				const allLogs = response.data.data;
				setLogs(allLogs);
				
				// Calculate stats
				const now = new Date();
				const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
				const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
				const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

				setStats({
					total: allLogs.length,
					today: allLogs.filter(log => new Date(log.createdAt) >= today).length,
					thisWeek: allLogs.filter(log => new Date(log.createdAt) >= weekAgo).length,
					thisMonth: allLogs.filter(log => new Date(log.createdAt) >= monthStart).length
				});
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
			limit: 50
		});
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
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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

			{/* Content */}
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
								<option value="disposisi">Disposisi</option>
								<option value="perjadin">Perjalanan Dinas</option>
								<option value="pegawai">Pegawai</option>
								<option value="bumdes">BUMDes</option>
								<option value="dana_desa">Dana Desa</option>
								<option value="kelembagaan">Kelembagaan</option>
								<option value="user">User Management</option>
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
								<option value="reject">Reject</option>
								<option value="upload">Upload</option>
								<option value="download">Download</option>
								<option value="toggle_status">Toggle Status</option>
								<option value="verify">Verify</option>
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

					<div className="flex gap-3 mt-4">
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
																<span className="capitalize">{log.module}</span>
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

				{/* Footer Info */}
				{!loading && logs.length > 0 && (
					<div className="mt-6 text-center text-sm text-gray-500">
						Menampilkan {logs.length} activity logs terbaru
					</div>
				)}
			</div>
		</div>
	);
};

export default ActivityLogsPage;
