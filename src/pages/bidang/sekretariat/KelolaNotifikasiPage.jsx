import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
	Bell, Send, History, Users, Clock, CheckCircle, AlertTriangle, 
	Play, Search, X, ChevronDown, ChevronUp, RefreshCw, 
	UserCheck, Radio, Filter, FileText, Zap, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api';
import { toast } from 'react-hot-toast';

// Role labels for display
const ROLE_LABELS = {
	superadmin: 'Superadmin',
	kepala_dinas: 'Kepala Dinas',
	sekretaris_dinas: 'Sekretaris Dinas',
	kepala_bidang: 'Kepala Bidang',
	ketua_tim: 'Ketua Tim',
	pegawai: 'Pegawai',
	verifikator_dinas: 'Verifikator Dinas'
};

// Quick templates
const TEMPLATES = [
	{
		id: 'jadwal-hari-ini',
		label: 'Reminder Jadwal Hari Ini',
		title: '📅 Reminder Jadwal Hari Ini',
		message: 'Jangan lupa cek jadwal kegiatan hari ini. Tap untuk melihat detail.',
		url: '/jadwal-kegiatan',
		roles: ['kepala_dinas', 'sekretaris_dinas', 'kepala_bidang', 'ketua_tim', 'pegawai']
	},
	{
		id: 'info-penting',
		label: 'Informasi Penting',
		title: '⚠️ Informasi Penting',
		message: '',
		url: '/',
		roles: ['kepala_dinas', 'sekretaris_dinas', 'kepala_bidang', 'ketua_tim', 'pegawai']
	},
	{
		id: 'rapat',
		label: 'Undangan Rapat',
		title: '🏛️ Undangan Rapat',
		message: 'Anda diundang untuk menghadiri rapat. Silakan cek detail waktu dan lokasi.',
		url: '/jadwal-kegiatan',
		roles: ['kepala_dinas', 'sekretaris_dinas', 'kepala_bidang', 'ketua_tim', 'pegawai']
	},
	{
		id: 'pengumuman',
		label: 'Pengumuman Umum',
		title: '📢 Pengumuman DPMD',
		message: '',
		url: '/',
		roles: ['kepala_dinas', 'sekretaris_dinas', 'kepala_bidang', 'ketua_tim', 'pegawai']
	}
];

const KelolaNotifikasiPage = () => {
	const navigate = useNavigate();
	const user = JSON.parse(localStorage.getItem('user') || '{}');
	const SEKRETARIAT_BIDANG_ID = 2;
	const hasPermission = user?.role === 'superadmin' || user?.bidang_id === SEKRETARIAT_BIDANG_ID;

	useEffect(() => {
		if (!hasPermission) {
			toast.error('Akses ditolak');
			navigate('/');
		}
	}, [hasPermission, navigate]);

	// Tab state
	const [activeTab, setActiveTab] = useState('send');
	const [loading, setLoading] = useState(false);

	// Statistics
	const [statistics, setStatistics] = useState({
		totalSent: 0,
		totalSubscribers: 0,
		uniqueSubscribedUsers: 0,
		todaySchedules: 0,
		tomorrowSchedules: 0
	});

	// Send mode: 'role' | 'user' | 'broadcast'
	const [sendMode, setSendMode] = useState('role');

	// Form state
	const [form, setForm] = useState({
		title: '',
		message: '',
		targetRoles: [],
		targetUserIds: [],
		url: '/jadwal-kegiatan'
	});

	// User picker state
	const [userList, setUserList] = useState([]);
	const [userSearch, setUserSearch] = useState('');
	const [userRoleFilter, setUserRoleFilter] = useState('');
	const [userListLoading, setUserListLoading] = useState(false);
	const [showUserPicker, setShowUserPicker] = useState(false);

	// History state
	const [history, setHistory] = useState([]);
	const [historyLoading, setHistoryLoading] = useState(false);
	const [historyPage, setHistoryPage] = useState(1);
	const [historyPagination, setHistoryPagination] = useState({ total: 0, totalPages: 0 });

	// Template dropdown
	const [showTemplates, setShowTemplates] = useState(false);

	const roleOptions = Object.entries(ROLE_LABELS).filter(([key]) => key !== 'superadmin');

	// Load statistics on mount
	useEffect(() => {
		loadStatistics();
	}, []);

	// Load history when tab active
	useEffect(() => {
		if (activeTab === 'history') loadHistory();
	}, [activeTab, historyPage]);

	// Load user list when user mode active
	useEffect(() => {
		if (sendMode === 'user') loadUserList();
	}, [sendMode]);

	const loadStatistics = async () => {
		try {
			const res = await api.get('/push-notification/statistics');
			if (res.data.success) setStatistics(res.data.data);
		} catch (err) {
			console.error('Error loading statistics:', err);
		}
	};

	const loadHistory = async () => {
		setHistoryLoading(true);
		try {
			const res = await api.get(`/push-notification/history?page=${historyPage}&limit=15`);
			if (res.data.success) {
				setHistory(res.data.data);
				setHistoryPagination(res.data.pagination || { total: 0, totalPages: 0 });
			}
		} catch (err) {
			console.error('Error loading history:', err);
		} finally {
			setHistoryLoading(false);
		}
	};

	const loadUserList = async () => {
		setUserListLoading(true);
		try {
			const res = await api.get('/push-notification/users-list');
			if (res.data.success) setUserList(res.data.data);
		} catch (err) {
			console.error('Error loading users:', err);
		} finally {
			setUserListLoading(false);
		}
	};

	// Filtered users for picker
	const filteredUsers = useMemo(() => {
		let filtered = userList;
		if (userSearch) {
			const q = userSearch.toLowerCase();
			filtered = filtered.filter(u =>
				u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
			);
		}
		if (userRoleFilter) {
			filtered = filtered.filter(u => u.role === userRoleFilter);
		}
		return filtered;
	}, [userList, userSearch, userRoleFilter]);

	const handleRoleToggle = (roleValue) => {
		setForm(prev => ({
			...prev,
			targetRoles: prev.targetRoles.includes(roleValue)
				? prev.targetRoles.filter(r => r !== roleValue)
				: [...prev.targetRoles, roleValue]
		}));
	};

	const handleUserToggle = (userId) => {
		setForm(prev => ({
			...prev,
			targetUserIds: prev.targetUserIds.includes(userId)
				? prev.targetUserIds.filter(id => id !== userId)
				: [...prev.targetUserIds, userId]
		}));
	};

	const handleSelectAllFilteredUsers = () => {
		const allIds = filteredUsers.map(u => u.id);
		const allSelected = allIds.every(id => form.targetUserIds.includes(id));
		setForm(prev => ({
			...prev,
			targetUserIds: allSelected
				? prev.targetUserIds.filter(id => !allIds.includes(id))
				: [...new Set([...prev.targetUserIds, ...allIds])]
		}));
	};

	const handleApplyTemplate = (template) => {
		setForm(prev => ({
			...prev,
			title: template.title,
			message: template.message,
			targetRoles: template.roles,
			url: template.url
		}));
		setSendMode('role');
		setShowTemplates(false);
		toast.success(`Template "${template.label}" diterapkan`);
	};

	const handleSendNotification = async () => {
		if (!form.title.trim() || !form.message.trim()) {
			toast.error('Judul dan pesan harus diisi');
			return;
		}

		if (sendMode === 'role' && form.targetRoles.length === 0) {
			toast.error('Pilih minimal satu role penerima');
			return;
		}

		if (sendMode === 'user' && form.targetUserIds.length === 0) {
			toast.error('Pilih minimal satu pegawai penerima');
			return;
		}

		setLoading(true);
		try {
			const body = {
				title: form.title,
				body: form.message,
				data: { url: form.url, type: 'manual' }
			};

			if (sendMode === 'role') {
				body.roles = form.targetRoles;
			} else if (sendMode === 'user') {
				body.userIds = form.targetUserIds;
			} else {
				body.broadcast = true;
			}

			const res = await api.post('/push-notification/send', body);

			if (res.data.success) {
				toast.success(`Notifikasi berhasil dikirim ke ${res.data.sentTo} pengguna`);
				setForm({ title: '', message: '', targetRoles: [], targetUserIds: [], url: '/jadwal-kegiatan' });
				loadStatistics();
			}
		} catch (err) {
			toast.error(err.response?.data?.message || 'Gagal mengirim notifikasi');
		} finally {
			setLoading(false);
		}
	};

	const handleTestCron = async (type) => {
		setLoading(true);
		try {
			const endpoint = type === 'morning' ? '/cron/test-morning-reminder' : '/cron/test-evening-reminder';
			const res = await api.get(endpoint);
			if (res.data.success) {
				toast.success(`Test ${type === 'morning' ? 'pagi' : 'malam'} berhasil! Dikirim ke ${res.data.sentTo} pengguna`);
				loadStatistics();
			}
		} catch (err) {
			toast.error('Gagal mengirim test notifikasi');
		} finally {
			setLoading(false);
		}
	};

	const handleTestSelf = async () => {
		setLoading(true);
		try {
			const res = await api.post('/push-notification/test');
			if (res.data.success) {
				toast.success('Test notification terkirim ke device kamu!');
			}
		} catch (err) {
			toast.error('Gagal mengirim test notification');
		} finally {
			setLoading(false);
		}
	};

	// Stats card component
	const StatCard = ({ icon: Icon, label, value, color, delay = 0 }) => (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay }}
			className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
		>
			<div className="flex items-center justify-between">
				<div>
					<p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</p>
					<p className={`text-2xl font-bold ${color}`}>{value}</p>
				</div>
				<div className={`p-3 rounded-xl ${color.replace('text-', 'bg-').replace('600', '50')}`}>
					<Icon className={`w-6 h-6 ${color.replace('600', '500')}`} />
				</div>
			</div>
		</motion.div>
	);

	// Target type badge
	const TargetBadge = ({ type, value }) => {
		const config = {
			broadcast: { label: 'Broadcast', bg: 'bg-purple-100 text-purple-700' },
			roles: { label: Array.isArray(value) ? value.map(r => ROLE_LABELS[r] || r).join(', ') : 'Roles', bg: 'bg-blue-100 text-blue-700' },
			users: { label: `${Array.isArray(value) ? value.length : 0} user`, bg: 'bg-green-100 text-green-700' }
		};
		const c = config[type] || config.broadcast;
		return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.bg}`}>{c.label}</span>;
	};

	const tabs = [
		{ id: 'send', label: 'Kirim Notifikasi', icon: Send },
		{ id: 'test', label: 'Test Notifikasi', icon: Zap },
		{ id: 'history', label: 'Riwayat', icon: History }
	];

	return (
		<div className="min-h-screen bg-gray-50/50 p-4 md:p-6">
			<div className="max-w-7xl mx-auto space-y-6">
				{/* Header */}
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
					<div>
						<div className="flex items-center gap-3 mb-1">
							<div className="p-2 bg-blue-600 rounded-xl">
								<Bell className="w-6 h-6 text-white" />
							</div>
							<h1 className="text-2xl font-bold text-gray-800">Push Notification Center</h1>
						</div>
						<p className="text-sm text-gray-500 ml-12">Kelola & kirim notifikasi push ke pengguna DPMD</p>
					</div>
					<button
						onClick={() => { loadStatistics(); if (activeTab === 'history') loadHistory(); }}
						className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all self-start"
					>
						<RefreshCw className="w-4 h-4" />
						Refresh
					</button>
				</div>

				{/* Statistics */}
				<div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
					<StatCard icon={Send} label="Total Terkirim" value={statistics.totalSent} color="text-blue-600" delay={0} />
					<StatCard icon={Users} label="Subscriber" value={statistics.totalSubscribers} color="text-green-600" delay={0.05} />
					<StatCard icon={UserCheck} label="User Aktif" value={statistics.uniqueSubscribedUsers || 0} color="text-teal-600" delay={0.1} />
					<StatCard icon={Clock} label="Jadwal Hari Ini" value={statistics.todaySchedules} color="text-purple-600" delay={0.15} />
					<StatCard icon={Clock} label="Jadwal Besok" value={statistics.tomorrowSchedules} color="text-orange-600" delay={0.2} />
				</div>

				{/* Tabs */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
					<div className="flex border-b border-gray-100">
						{tabs.map(tab => (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 text-sm font-medium transition-all ${
									activeTab === tab.id
										? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
										: 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
								}`}
							>
								<tab.icon className="w-4 h-4" />
								<span className="hidden sm:inline">{tab.label}</span>
							</button>
						))}
					</div>

					<div className="p-5 md:p-6">
						{/* ===== TAB: SEND ===== */}
						{activeTab === 'send' && (
							<div className="space-y-6">
								{/* Template Selector */}
								<div className="relative">
									<button
										onClick={() => setShowTemplates(!showTemplates)}
										className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all"
									>
										<FileText className="w-4 h-4" />
										Template Cepat
										{showTemplates ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
									</button>
									<AnimatePresence>
										{showTemplates && (
											<motion.div
												initial={{ opacity: 0, y: -8 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0, y: -8 }}
												className="absolute z-10 mt-2 w-full sm:w-96 bg-white rounded-xl shadow-lg border border-gray-200 p-2"
											>
												{TEMPLATES.map(t => (
													<button
														key={t.id}
														onClick={() => handleApplyTemplate(t)}
														className="w-full text-left px-4 py-3 rounded-lg hover:bg-blue-50 transition-colors"
													>
														<p className="text-sm font-medium text-gray-800">{t.label}</p>
														<p className="text-xs text-gray-500 mt-0.5">{t.title}</p>
													</button>
												))}
											</motion.div>
										)}
									</AnimatePresence>
								</div>

								{/* Send Mode Selector */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Mode Pengiriman</label>
									<div className="flex gap-2">
										{[
											{ id: 'role', label: 'Per Role', icon: Users },
											{ id: 'user', label: 'Per Pegawai', icon: UserCheck },
											{ id: 'broadcast', label: 'Broadcast', icon: Radio }
										].map(mode => (
											<button
												key={mode.id}
												onClick={() => setSendMode(mode.id)}
												className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border-2 ${
													sendMode === mode.id
														? 'border-blue-500 bg-blue-50 text-blue-700'
														: 'border-gray-200 text-gray-600 hover:border-gray-300'
												}`}
											>
												<mode.icon className="w-4 h-4" />
												{mode.label}
											</button>
										))}
									</div>
								</div>

								{/* Form Fields */}
								<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
									<div className="space-y-4">
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1.5">Judul Notifikasi</label>
											<input
												type="text"
												value={form.title}
												onChange={e => setForm({ ...form, title: e.target.value })}
												className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
												placeholder="Contoh: Informasi Penting"
												maxLength={200}
											/>
											<p className="text-xs text-gray-400 mt-1">{form.title.length}/200</p>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1.5">Pesan</label>
											<textarea
												value={form.message}
												onChange={e => setForm({ ...form, message: e.target.value })}
												rows={4}
												className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
												placeholder="Tulis pesan notifikasi..."
												maxLength={500}
											/>
											<p className="text-xs text-gray-400 mt-1">{form.message.length}/500</p>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1.5">URL Tujuan (opsional)</label>
											<input
												type="text"
												value={form.url}
												onChange={e => setForm({ ...form, url: e.target.value })}
												className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
												placeholder="/jadwal-kegiatan"
											/>
										</div>
									</div>

									<div>
										{/* Role Picker */}
										{sendMode === 'role' && (
											<div>
												<label className="block text-sm font-medium text-gray-700 mb-2">Target Role Penerima</label>
												<div className="grid grid-cols-1 gap-2">
													{roleOptions.map(([value, label]) => (
														<button
															key={value}
															onClick={() => handleRoleToggle(value)}
															className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-sm transition-all text-left ${
																form.targetRoles.includes(value)
																	? 'border-blue-500 bg-blue-50 text-blue-700'
																	: 'border-gray-200 hover:border-gray-300 text-gray-600'
															}`}
														>
															{form.targetRoles.includes(value) ? (
																<CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
															) : (
																<div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
															)}
															{label}
														</button>
													))}
												</div>
												<button
													onClick={() => setForm(prev => ({
														...prev,
														targetRoles: prev.targetRoles.length === roleOptions.length ? [] : roleOptions.map(([v]) => v)
													}))}
													className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
												>
													{form.targetRoles.length === roleOptions.length ? 'Hapus semua' : 'Pilih semua'}
												</button>
											</div>
										)}

										{/* User Picker */}
										{sendMode === 'user' && (
											<div>
												<div className="flex items-center justify-between mb-2">
													<label className="text-sm font-medium text-gray-700">
														Pilih Pegawai ({form.targetUserIds.length} dipilih)
													</label>
													<button
														onClick={loadUserList}
														className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
													>
														<RefreshCw className="w-3 h-3" /> Refresh
													</button>
												</div>

												{/* Search & Filter */}
												<div className="flex gap-2 mb-3">
													<div className="relative flex-1">
														<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
														<input
															type="text"
															value={userSearch}
															onChange={e => setUserSearch(e.target.value)}
															className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
															placeholder="Cari nama/email..."
														/>
														{userSearch && (
															<button
																onClick={() => setUserSearch('')}
																className="absolute right-3 top-1/2 -translate-y-1/2"
															>
																<X className="w-4 h-4 text-gray-400" />
															</button>
														)}
													</div>
													<select
														value={userRoleFilter}
														onChange={e => setUserRoleFilter(e.target.value)}
														className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
													>
														<option value="">Semua Role</option>
														{Object.entries(ROLE_LABELS).map(([val, lbl]) => (
															<option key={val} value={val}>{lbl}</option>
														))}
													</select>
												</div>

												{/* Select All */}
												{filteredUsers.length > 0 && (
													<button
														onClick={handleSelectAllFilteredUsers}
														className="w-full text-xs text-left text-blue-600 hover:text-blue-800 font-medium mb-2 px-1"
													>
														{filteredUsers.every(u => form.targetUserIds.includes(u.id))
															? `Hapus semua (${filteredUsers.length})`
															: `Pilih semua ditampilkan (${filteredUsers.length})`}
													</button>
												)}

												{/* User List */}
												<div className="border border-gray-200 rounded-lg max-h-72 overflow-y-auto">
													{userListLoading ? (
														<div className="flex items-center justify-center py-8">
															<div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
														</div>
													) : filteredUsers.length === 0 ? (
														<p className="text-center text-gray-500 text-sm py-6">Tidak ada pegawai ditemukan</p>
													) : (
														filteredUsers.map(u => (
															<button
																key={u.id}
																onClick={() => handleUserToggle(u.id)}
																className={`w-full flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors text-left ${
																	form.targetUserIds.includes(u.id) ? 'bg-blue-50' : ''
																}`}
															>
																{form.targetUserIds.includes(u.id) ? (
																	<CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
																) : (
																	<div className="w-4 h-4 rounded border-2 border-gray-300 flex-shrink-0" />
																)}
																<div className="flex-1 min-w-0">
																	<p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
																	<p className="text-xs text-gray-500 truncate">{u.email} · {ROLE_LABELS[u.role] || u.role}{u.bidang ? ` · ${u.bidang}` : ''}</p>
																</div>
																{u.subscribed ? (
																	<span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs flex-shrink-0">Sub</span>
																) : (
																	<span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs flex-shrink-0">No sub</span>
																)}
															</button>
														))
													)}
												</div>
											</div>
										)}

										{/* Broadcast Info */}
										{sendMode === 'broadcast' && (
											<div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
												<div className="flex gap-3">
													<AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
													<div>
														<p className="text-sm font-medium text-amber-800">Mode Broadcast</p>
														<p className="text-xs text-amber-700 mt-1">
															Notifikasi akan dikirim ke <strong>semua pengguna</strong> yang memiliki subscription aktif
															({statistics.totalSubscribers} subscriber).
														</p>
													</div>
												</div>
											</div>
										)}
									</div>
								</div>

								{/* Preview & Send Button */}
								{(form.title || form.message) && (
									<div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
										<p className="text-xs font-medium text-gray-500 mb-2">PREVIEW</p>
										<div className="flex items-start gap-3 bg-white rounded-lg p-3 shadow-sm border border-gray-100">
											<img src="/logo-96.png" alt="" className="w-10 h-10 rounded-lg" onError={e => { e.target.style.display = 'none'; }} />
											<div className="flex-1 min-w-0">
												<p className="text-sm font-semibold text-gray-800 truncate">{form.title || 'Judul notifikasi'}</p>
												<p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{form.message || 'Pesan notifikasi...'}</p>
											</div>
										</div>
									</div>
								)}

								<button
									onClick={handleSendNotification}
									disabled={loading || !form.title.trim() || !form.message.trim()}
									className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 shadow-sm"
								>
									{loading ? (
										<>
											<div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
											Mengirim...
										</>
									) : (
										<>
											<Send className="w-4 h-4" />
											Kirim Notifikasi
										</>
									)}
								</button>
							</div>
						)}

						{/* ===== TAB: TEST ===== */}
						{activeTab === 'test' && (
							<div className="space-y-6">
								<div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
									<div className="flex gap-3">
										<AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
										<p className="text-sm text-amber-800">
											<strong>Test Mode:</strong> Tombol di bawah akan mengirim notifikasi nyata. Gunakan untuk testing fitur notifikasi.
										</p>
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
									{/* Test Self */}
									<div className="border border-gray-200 rounded-xl p-5">
										<div className="flex items-center gap-3 mb-4">
											<div className="p-3 bg-blue-100 rounded-xl">
												<Bell className="w-6 h-6 text-blue-600" />
											</div>
											<div>
												<h3 className="font-semibold text-sm">Test ke Saya</h3>
												<p className="text-xs text-gray-500">Kirim ke device saya</p>
											</div>
										</div>
										<button
											onClick={handleTestSelf}
											disabled={loading}
											className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 text-sm font-medium"
										>
											{loading ? 'Mengirim...' : 'Test Notification'}
										</button>
									</div>

									{/* Morning Reminder */}
									<div className="border border-gray-200 rounded-xl p-5">
										<div className="flex items-center gap-3 mb-4">
											<div className="p-3 bg-orange-100 rounded-xl">
												<Clock className="w-6 h-6 text-orange-600" />
											</div>
											<div>
												<h3 className="font-semibold text-sm">Morning (07:00)</h3>
												<p className="text-xs text-gray-500">Jadwal hari ini</p>
											</div>
										</div>
										<button
											onClick={() => handleTestCron('morning')}
											disabled={loading}
											className="w-full bg-orange-600 text-white px-4 py-2.5 rounded-lg hover:bg-orange-700 transition-all disabled:opacity-50 text-sm font-medium"
										>
											{loading ? 'Mengirim...' : 'Test Morning'}
										</button>
									</div>

									{/* Evening Reminder */}
									<div className="border border-gray-200 rounded-xl p-5">
										<div className="flex items-center gap-3 mb-4">
											<div className="p-3 bg-purple-100 rounded-xl">
												<Clock className="w-6 h-6 text-purple-600" />
											</div>
											<div>
												<h3 className="font-semibold text-sm">Evening (21:00)</h3>
												<p className="text-xs text-gray-500">Jadwal besok</p>
											</div>
										</div>
										<button
											onClick={() => handleTestCron('evening')}
											disabled={loading}
											className="w-full bg-purple-600 text-white px-4 py-2.5 rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50 text-sm font-medium"
										>
											{loading ? 'Mengirim...' : 'Test Evening'}
										</button>
									</div>
								</div>

								<div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
									<p className="text-sm text-blue-800">
										<strong>Jadwal Otomatis:</strong> Sistem otomatis mengirim notifikasi pada jam 07:00 (jadwal hari ini) dan 21:00 (jadwal besok) setiap hari kerja.
									</p>
								</div>
							</div>
						)}

						{/* ===== TAB: HISTORY ===== */}
						{activeTab === 'history' && (
							<div>
								{historyLoading ? (
									<div className="text-center py-12">
										<div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto" />
										<p className="text-gray-500 text-sm mt-3">Memuat riwayat...</p>
									</div>
								) : history.length === 0 ? (
									<div className="text-center py-12">
										<History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
										<p className="text-gray-500 text-sm">Belum ada riwayat notifikasi</p>
										<p className="text-gray-400 text-xs mt-1">Riwayat akan muncul setelah Anda mengirim notifikasi</p>
									</div>
								) : (
									<>
										<div className="space-y-3">
											{history.map((item, idx) => (
												<motion.div
													key={item.id || idx}
													initial={{ opacity: 0, y: 10 }}
													animate={{ opacity: 1, y: 0 }}
													transition={{ delay: idx * 0.03 }}
													className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow"
												>
													<div className="flex items-start justify-between gap-3">
														<div className="flex-1 min-w-0">
															<h4 className="text-sm font-semibold text-gray-800 truncate">{item.title}</h4>
															<p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.body}</p>
															<div className="flex items-center flex-wrap gap-3 mt-2">
																<TargetBadge type={item.targetType} value={item.targetValue} />
																<span className="text-xs text-gray-400 flex items-center gap-1">
																	<Users className="w-3 h-3" />
																	{item.sentTo} terkirim{item.failedCount > 0 ? `, ${item.failedCount} gagal` : ''}
																</span>
																<span className="text-xs text-gray-400 flex items-center gap-1">
																	<Clock className="w-3 h-3" />
																	{new Date(item.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
																</span>
																<span className="text-xs text-gray-400">oleh {item.sender}</span>
															</div>
														</div>
														<div className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
															item.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
														}`}>
															{item.success ? 'Berhasil' : 'Gagal'}
														</div>
													</div>
												</motion.div>
											))}
										</div>

										{/* Pagination */}
										{historyPagination.totalPages > 1 && (
											<div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
												<p className="text-xs text-gray-500">
													Hal. {historyPagination.page} dari {historyPagination.totalPages} ({historyPagination.total} total)
												</p>
												<div className="flex gap-2">
													<button
														onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
														disabled={historyPage === 1}
														className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-all"
													>
														<ChevronLeft className="w-4 h-4" />
													</button>
													<button
														onClick={() => setHistoryPage(p => Math.min(historyPagination.totalPages, p + 1))}
														disabled={historyPage >= historyPagination.totalPages}
														className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-all"
													>
														<ChevronRight className="w-4 h-4" />
													</button>
												</div>
											</div>
										)}
									</>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default KelolaNotifikasiPage;
