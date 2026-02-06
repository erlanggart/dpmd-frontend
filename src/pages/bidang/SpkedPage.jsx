import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Activity, TrendingUp, ArrowLeft, Clock, CheckCircle2, XCircle, FileText, BarChart3, Landmark, DollarSign, Zap, Info, ChevronRight, Menu, X } from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';

// Lazy load BUMDes components
const BumdesForm = lazy(() => import('./spked/bumdes/BumdesForm'));
const BumdesDashboardModern = lazy(() => import('./spked/bumdes/BumdesDashboardModern'));
const BumdesDokumenManager = lazy(() => import('./spked/bumdes/BumdesDokumenManager'));

// Lazy load Bankeu component
const BankeuDashboard = lazy(() => import('./spked/bankeu/BankeuDashboard'));
const DpmdVerificationPage = lazy(() => import('./spked/bankeu/DpmdVerificationPage'));

// Loading component
const LoadingFallback = () => (
	<div className="flex items-center justify-center py-12">
		<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
	</div>
);

const SpkedPage = () => {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState(null);
	const [activeTab, setActiveTab] = useState('overview'); // overview, bumdes, bankeu, activity
	const [bumdesView, setBumdesView] = useState('dashboard'); // dashboard, form, dokumen
	const [bankeuYear, setBankeuYear] = useState(null); // null (picker), 2025, or 2026
	const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar state
	
	// Activity logs state
	const [activityLogs, setActivityLogs] = useState([]);
	const [activityLoading, setActivityLoading] = useState(false);
	const [activityFilter, setActivityFilter] = useState('all'); // all, bumdes, bankeu
	
	// Ref to prevent duplicate logs
	const loggedRef = useRef({ userInfo: false, dashboard: false });
	
	// Get user info for debugging (log only once)
	const user = JSON.parse(localStorage.getItem('user') || '{}');
	if (!loggedRef.current.userInfo) {
		console.log('🔍 [SpkedPage] User Info:', {
			id: user.id,
			name: user.name,
			role: user.role,
			bidang_id: user.bidang_id
		});
		loggedRef.current.userInfo = true;
	}

	useEffect(() => {
		fetchDashboard();
	}, []);

	// Fetch activity logs when activity tab is active
	useEffect(() => {
		if (activeTab === 'activity') {
			fetchActivityLogs();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeTab, activityFilter]);

	const fetchDashboard = async () => {
		try {
			setLoading(true);
			if (!loggedRef.current.dashboard) {
				console.log('📡 [SpkedPage] Fetching dashboard for bidang 3...');
			}
			const response = await api.get('/bidang/3/dashboard');
			if (response.data.success) {
				setData(response.data.data);
				if (!loggedRef.current.dashboard) {
					console.log('✅ [SpkedPage] Dashboard data loaded');
					loggedRef.current.dashboard = true;
				}
			}
		} catch (error) {
			console.error('❌ [SpkedPage] Error fetching dashboard:', error);
			console.error('Error response:', error.response?.data);
			toast.error(error.response?.data?.message || 'Gagal memuat data bidang');
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
			
			console.log('📡 Fetching activity logs with params:', params);
			const response = await api.get('/bidang/3/activity-logs', { params });
			console.log('📊 Activity logs response:', response.data);
			
			if (response.data.success) {
				setActivityLogs(response.data.data || []);
				console.log('✅ Activity logs loaded:', response.data.data?.length || 0, 'items');
			}
		} catch (error) {
			console.error('❌ [SpkedPage] Error fetching activity logs:', error);
			console.error('Error response:', error.response?.data);
			toast.error('Gagal memuat aktivitas');
		} finally {
			setActivityLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
					<p className="mt-4 text-gray-600">Memuat data...</p>
				</div>
			</div>
		);
	}

	const stats = data?.stats || {};

	const statsCards = [
		{
			title: 'Total BUMDes',
			value: stats.total_bumdes || 0,
			icon: Building2,
			color: 'from-green-500 to-green-600'
		},
		{
			title: 'BUMDes Aktif',
			value: stats.active_bumdes || 0,
			icon: CheckCircle2,
			color: 'from-emerald-500 to-emerald-600'
		},
		{
			title: 'BUMDes Tidak Aktif',
			value: stats.inactive_bumdes || 0,
			icon: XCircle,
			color: 'from-red-500 to-red-600'
		},
		{
			title: 'Total Unit Usaha',
			value: stats.total_unit_usaha || 0,
			icon: TrendingUp,
			color: 'from-blue-500 to-blue-600'
		}
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
		<div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-green-50/20">
			{/* Header */}
			<div className="bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg">
				<div className="container mx-auto px-4 py-4">
					<button 
						onClick={() => navigate(-1)}
						className="flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-3"
					>
						<ArrowLeft className="h-4 w-4" />
						<span className="text-sm">Kembali</span>
					</button>
					
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
								<Building2 className="h-8 w-8" />
							</div>
							<div>
								<h1 className="text-2xl font-bold mb-1">Bidang SPKED</h1>
								<p className="text-white/90 text-sm">Sarana Prasarana Kewilayahan dan Ekonomi Desa</p>
							</div>
						</div>
						
						{/* Mobile Hamburger Menu */}
						<button
							onClick={() => setSidebarOpen(!sidebarOpen)}
							className="lg:hidden h-10 w-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all"
						>
							{sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
						</button>
					</div>
				</div>
			</div>

			{/* Mobile Sidebar Overlay */}
			{sidebarOpen && (
				<div 
					className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
					onClick={() => setSidebarOpen(false)}
				/>
			)}

			{/* Mobile Sidebar Drawer */}
			<aside className={`fixed top-0 left-0 h-full w-80 bg-gradient-to-b from-gray-50 to-white z-50 lg:hidden transform transition-transform duration-300 ease-in-out ${
				sidebarOpen ? 'translate-x-0' : '-translate-x-full'
			} overflow-y-auto shadow-2xl`}>
				<div className="p-6 space-y-4">
					{/* Close Button */}
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
							Menu SPKED
						</h2>
						<button
							onClick={() => setSidebarOpen(false)}
							className="h-10 w-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors"
						>
							<X className="h-6 w-6 text-gray-600" />
						</button>
					</div>

					{/* Overview */}
					<button
						onClick={() => {
							setActiveTab('overview');
							setSidebarOpen(false);
						}}
						className={`w-full group relative flex items-center gap-4 px-5 py-4 rounded-2xl font-semibold transition-all duration-300 ${
							activeTab === 'overview'
								? 'bg-gradient-to-br from-green-600 to-emerald-600 text-white shadow-xl shadow-green-500/40'
								: 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-lg border border-gray-200'
						}`}
					>
						<div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all ${
							activeTab === 'overview' 
								? 'bg-white/20 backdrop-blur-sm' 
								: 'bg-gradient-to-br from-gray-100 to-gray-200'
						}`}>
							<BarChart3 className={`h-6 w-6 ${activeTab === 'overview' ? 'text-white' : 'text-gray-600'}`} />
						</div>
						<div className="flex-1 text-left">
							<div className="font-bold">Overview</div>
							<div className={`text-xs ${activeTab === 'overview' ? 'text-green-100' : 'text-gray-500'}`}>
								Ringkasan data
							</div>
						</div>
					</button>

					{/* BUMDes */}
					<button
						onClick={() => {
							setActiveTab('bumdes');
							setSidebarOpen(false);
						}}
						className={`w-full group relative flex items-center gap-4 px-5 py-4 rounded-2xl font-semibold transition-all duration-300 ${
							activeTab === 'bumdes'
								? 'bg-gradient-to-br from-green-600 to-emerald-600 text-white shadow-xl shadow-green-500/40'
								: 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-lg border border-gray-200'
						}`}
					>
						<div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all ${
							activeTab === 'bumdes' 
								? 'bg-white/20 backdrop-blur-sm' 
								: 'bg-gradient-to-br from-gray-100 to-gray-200'
						}`}>
							<Building2 className={`h-6 w-6 ${activeTab === 'bumdes' ? 'text-white' : 'text-gray-600'}`} />
						</div>
						<div className="flex-1 text-left">
							<div className="font-bold">BUMDes</div>
							<div className={`text-xs ${activeTab === 'bumdes' ? 'text-green-100' : 'text-gray-500'}`}>
								Data BUMDes desa
							</div>
						</div>
					</button>

					{/* Bantuan Keuangan */}
					<button
						onClick={() => {
							setActiveTab('bankeu');
							setBankeuYear(null);
							setSidebarOpen(false);
						}}
						className={`w-full group relative flex items-center gap-4 px-5 py-4 rounded-2xl font-semibold transition-all duration-300 ${
							activeTab === 'bankeu'
								? 'bg-gradient-to-br from-green-600 to-emerald-600 text-white shadow-xl shadow-green-500/40'
								: 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-lg border border-gray-200'
						}`}
					>
						<div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all ${
							activeTab === 'bankeu' 
								? 'bg-white/20 backdrop-blur-sm' 
								: 'bg-gradient-to-br from-gray-100 to-gray-200'
						}`}>
							<DollarSign className={`h-6 w-6 ${activeTab === 'bankeu' ? 'text-white' : 'text-gray-600'}`} />
						</div>
						<div className="flex-1 text-left">
							<div className="font-bold">Bantuan Keuangan</div>
							<div className={`text-xs ${activeTab === 'bankeu' ? 'text-green-100' : 'text-gray-500'}`}>
								Bankeu & Verifikasi
							</div>
						</div>
					</button>

					{/* Aktivitas */}
					<button
						onClick={() => {
							setActiveTab('activity');
							setSidebarOpen(false);
						}}
						className={`w-full group relative flex items-center gap-4 px-5 py-4 rounded-2xl font-semibold transition-all duration-300 ${
							activeTab === 'activity'
								? 'bg-gradient-to-br from-green-600 to-emerald-600 text-white shadow-xl shadow-green-500/40'
								: 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-lg border border-gray-200'
						}`}
					>
						<div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all ${
							activeTab === 'activity' 
								? 'bg-white/20 backdrop-blur-sm' 
								: 'bg-gradient-to-br from-gray-100 to-gray-200'
						}`}>
							<Activity className={`h-6 w-6 ${activeTab === 'activity' ? 'text-white' : 'text-gray-600'}`} />
						</div>
						<div className="flex-1 text-left">
							<div className="font-bold">Aktivitas</div>
							<div className={`text-xs ${activeTab === 'activity' ? 'text-green-100' : 'text-gray-500'}`}>
								Log aktivitas
							</div>
						</div>
					</button>
				</div>
			</aside>

			{/* Layout with Sidebar */}
			<div className="container mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-12 py-6 lg:py-8 xl:py-12">
				<div className="flex gap-6">
					{/* Desktop Sidebar Navigation */}
					<aside className="hidden lg:block w-64 flex-shrink-0">
						<div className="sticky top-8 space-y-3">
							{/* Overview */}
							<button
								onClick={() => setActiveTab('overview')}
								className={`w-full group relative flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
									activeTab === 'overview'
										? 'bg-gradient-to-br from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/30'
										: 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md border border-gray-200'
								}`}
							>
								<div className={`h-10 w-10 rounded-lg flex items-center justify-center transition-all ${
									activeTab === 'overview' 
										? 'bg-white/20 backdrop-blur-sm' 
										: 'bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-green-100 group-hover:to-green-200'
								}`}>
									<BarChart3 className={`h-5 w-5 ${activeTab === 'overview' ? 'text-white' : 'text-gray-600 group-hover:text-green-600'}`} />
								</div>
								<div className="flex-1 text-left min-w-0">
									<div className="font-semibold truncate">Overview</div>
									<div className={`text-xs ${activeTab === 'overview' ? 'text-green-100' : 'text-gray-500'}`}>
										Ringkasan data
									</div>
								</div>
								{activeTab === 'overview' && (
									<div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-l-full"></div>
								)}
							</button>

							{/* BUMDes */}
							<button
								onClick={() => setActiveTab('bumdes')}
								className={`w-full group relative flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
									activeTab === 'bumdes'
										? 'bg-gradient-to-br from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/30'
										: 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md border border-gray-200'
								}`}
							>
								<div className={`h-10 w-10 rounded-lg flex items-center justify-center transition-all ${
									activeTab === 'bumdes' 
										? 'bg-white/20 backdrop-blur-sm' 
										: 'bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-green-100 group-hover:to-green-200'
								}`}>
									<Building2 className={`h-5 w-5 ${activeTab === 'bumdes' ? 'text-white' : 'text-gray-600 group-hover:text-green-600'}`} />
								</div>
								<div className="flex-1 text-left min-w-0">
									<div className="font-semibold truncate">BUMDes</div>
									<div className={`text-xs ${activeTab === 'bumdes' ? 'text-green-100' : 'text-gray-500'}`}>
										Data BUMDes desa
									</div>
								</div>
								{activeTab === 'bumdes' && (
									<div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-l-full"></div>
								)}
							</button>

							{/* Bantuan Keuangan */}
							<button
								onClick={() => { setActiveTab('bankeu'); setBankeuYear(null); }}
								className={`w-full group relative flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
									activeTab === 'bankeu'
										? 'bg-gradient-to-br from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/30'
										: 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md border border-gray-200'
								}`}
							>
								<div className={`h-10 w-10 rounded-lg flex items-center justify-center transition-all ${
									activeTab === 'bankeu' 
										? 'bg-white/20 backdrop-blur-sm' 
										: 'bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-blue-100 group-hover:to-blue-200'
								}`}>
									<DollarSign className={`h-5 w-5 ${activeTab === 'bankeu' ? 'text-white' : 'text-gray-600 group-hover:text-blue-600'}`} />
								</div>
								<div className="flex-1 text-left min-w-0">
									<div className="font-semibold truncate">Bantuan Keuangan</div>
									<div className={`text-xs ${activeTab === 'bankeu' ? 'text-green-100' : 'text-gray-500'}`}>
										Bankeu & Verifikasi
									</div>
								</div>
								{activeTab === 'bankeu' && (
									<div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-l-full"></div>
								)}
							</button>

							{/* Aktivitas */}
							<button
								onClick={() => setActiveTab('activity')}
								className={`w-full group relative flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
									activeTab === 'activity'
										? 'bg-gradient-to-br from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/30'
										: 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md border border-gray-200'
								}`}
							>
								<div className={`h-10 w-10 rounded-lg flex items-center justify-center transition-all ${
									activeTab === 'activity' 
										? 'bg-white/20 backdrop-blur-sm' 
										: 'bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-orange-100 group-hover:to-orange-200'
								}`}>
									<Activity className={`h-5 w-5 ${activeTab === 'activity' ? 'text-white' : 'text-gray-600 group-hover:text-orange-600'}`} />
								</div>
								<div className="flex-1 text-left min-w-0">
									<div className="font-semibold truncate">Aktivitas</div>
									<div className={`text-xs ${activeTab === 'activity' ? 'text-green-100' : 'text-gray-500'}`}>
										Log aktivitas
									</div>
								</div>
								{activeTab === 'activity' && (
									<div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-l-full"></div>
								)}
							</button>
						</div>
					</aside>

					{/* Main Content */}
					<main className="flex-1 min-w-0 lg:pb-8">
				{/* Tab Content */}
				{activeTab === 'overview' && (
					<div className="relative bg-gradient-to-br from-white via-white to-green-50/30 rounded-2xl shadow-xl border border-gray-200/50 p-8 overflow-hidden">
						{/* Decorative Elements */}
						<div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-green-400/10 to-emerald-500/10 rounded-full blur-3xl -z-0"></div>
						<div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-400/10 to-purple-500/10 rounded-full blur-3xl -z-0"></div>

						<div className="relative z-10">
							{/* Welcome Section */}
							<div className="text-center mb-10">
								<div className="inline-flex h-20 w-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl items-center justify-center mb-6 shadow-2xl shadow-green-500/30 animate-pulse">
									<Landmark className="h-10 w-10 text-white" />
								</div>
								<h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 via-green-700 to-emerald-600 bg-clip-text text-transparent mb-3">
									Selamat Datang di Bidang SPKED
								</h2>
								<p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
									<strong>Sarana Prasarana Kewilayahan dan Ekonomi Desa</strong><br />
									Kelola data BUMDes dan Bantuan Keuangan Desa dengan mudah dan terstruktur
								</p>
							</div>

							{/* Stats Overview */}
							<div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
								{stats && stats.total_bumdes !== undefined && (
									<>
										<div className="group relative bg-white rounded-3xl shadow-xl hover:shadow-2xl border border-gray-100 p-8 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
											<div className="absolute inset-0 bg-gradient-to-br from-green-400 to-green-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
											<div className="relative">
												<div className="flex items-center justify-between mb-6">
													<div className="h-16 w-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-xl shadow-green-500/30 group-hover:scale-110 transition-transform duration-300">
														<Building2 className="h-8 w-8 text-white" />
													</div>
												</div>
												<div>
													<p className="text-base font-semibold text-gray-600 mb-2">Total BUMDes</p>
													<p className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
														{stats.total_bumdes || 0}
													</p>
												</div>
											</div>
										</div>

										<div className="group relative bg-white rounded-3xl shadow-xl hover:shadow-2xl border border-gray-100 p-8 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
											<div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
											<div className="relative">
												<div className="flex items-center justify-between mb-6">
													<div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
														<TrendingUp className="h-8 w-8 text-white" />
													</div>
												</div>
												<div>
													<p className="text-base font-semibold text-gray-600 mb-2">Unit Usaha</p>
													<p className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
														{stats.total_unit_usaha || 0}
													</p>
												</div>
											</div>
										</div>

										<div className="group relative bg-white rounded-3xl shadow-xl hover:shadow-2xl border border-gray-100 p-8 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
											<div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-purple-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
											<div className="relative">
												<div className="flex items-center justify-between mb-6">
													<div className="h-16 w-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300">
														<DollarSign className="h-8 w-8 text-white" />
													</div>
												</div>
												<div>
													<p className="text-base font-semibold text-gray-600 mb-2">Data Bankeu</p>
													<p className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
														{stats.total_bankeu || 0}
													</p>
												</div>
											</div>
										</div>
									</>
								)}
							</div>

							{/* Features Info */}
							<div className="bg-gradient-to-br from-blue-50/50 to-green-50/50 rounded-3xl p-8 mb-10 border border-blue-100/50 shadow-lg">
								<h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
									<Info className="h-6 w-6 text-blue-600" />
									Apa yang Bisa Dilakukan di Halaman Ini?
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="flex gap-4">
										<div className="h-14 w-14 bg-green-100 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
											<Building2 className="h-7 w-7 text-green-600" />
										</div>
										<div>
											<h4 className="font-bold text-gray-800 mb-2 text-base">Kelola Data BUMDes</h4>
											<p className="text-sm text-gray-600 leading-relaxed">Tambah, edit, dan pantau data BUMDes beserta unit usahanya di seluruh desa</p>
										</div>
									</div>
									<div className="flex gap-4">
										<div className="h-14 w-14 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
											<DollarSign className="h-7 w-7 text-blue-600" />
										</div>
										<div>
											<h4 className="font-bold text-gray-800 mb-2 text-base">Bantuan Keuangan Desa</h4>
											<p className="text-sm text-gray-600 leading-relaxed">Kelola data penyaluran Bantuan Keuangan Tahap 1 dan Tahap 2 untuk setiap desa</p>
										</div>
									</div>
									<div className="flex gap-4">
										<div className="h-14 w-14 bg-purple-100 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
											<FileText className="h-7 w-7 text-purple-600" />
										</div>
										<div>
											<h4 className="font-bold text-gray-800 mb-2 text-base">Upload Dokumen</h4>
											<p className="text-sm text-gray-600 leading-relaxed">Upload dokumen pendukung BUMDes seperti SK, proposal, dan laporan keuangan</p>
										</div>
									</div>
									<div className="flex gap-4">
										<div className="h-14 w-14 bg-orange-100 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
											<Activity className="h-7 w-7 text-orange-600" />
										</div>
										<div>
											<h4 className="font-semibold text-gray-800 mb-1">Monitor Aktivitas</h4>
											<p className="text-sm text-gray-600">Pantau semua aktivitas terkini terkait BUMDes dan Bantuan Keuangan secara real-time</p>
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
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<button
										onClick={() => setActiveTab('bumdes')}
										className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 p-6 hover:border-green-300 transition-all duration-300 text-left overflow-hidden hover:-translate-y-1"
									>
										<div className="absolute inset-0 bg-gradient-to-br from-green-400/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
										<div className="relative flex items-center gap-5">
											<div className="h-16 w-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-green-500/25">
												<Building2 className="h-8 w-8 text-white" />
											</div>
											<div className="flex-1">
												<h3 className="font-bold text-gray-800 text-lg mb-1">Kelola BUMDes</h3>
												<p className="text-sm text-gray-500">Data BUMDes & unit usaha</p>
											</div>
											<ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all" />
										</div>
									</button>

									<button
										onClick={() => { setActiveTab('bankeu'); setBankeuYear(null); }}
										className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 p-6 hover:border-blue-300 transition-all duration-300 text-left overflow-hidden hover:-translate-y-1"
									>
										<div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
										<div className="relative flex items-center gap-5">
											<div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-blue-500/25">
												<DollarSign className="h-8 w-8 text-white" />
											</div>
											<div className="flex-1">
												<h3 className="font-bold text-gray-800 text-lg mb-1">Bantuan Keuangan</h3>
												<p className="text-sm text-gray-500">Data penyaluran bankeu</p>
											</div>
											<ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
										</div>
									</button>
								</div>
							</div>
						</div>
					</div>
				)}

				{activeTab === 'bumdes' && (
					<div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
						<Suspense fallback={<LoadingFallback />}>
							{/* BUMDes Sub-Navigation */}
							<div className="border-b border-gray-200 bg-gray-50 p-4">
								<div className="flex gap-2">
									<button
										onClick={() => setBumdesView('dashboard')}
										className={`px-4 py-2 rounded-lg font-medium transition-all ${
											bumdesView === 'dashboard'
												? 'bg-white text-green-600 shadow-sm'
												: 'text-gray-600 hover:bg-white/50'
										}`}
									>
										📊 Dashboard
									</button>
									<button
										onClick={() => setBumdesView('form')}
										className={`px-4 py-2 rounded-lg font-medium transition-all ${
											bumdesView === 'form'
												? 'bg-white text-green-600 shadow-sm'
												: 'text-gray-600 hover:bg-white/50'
										}`}
									>
										➕ Tambah Data
									</button>
									<button
										onClick={() => setBumdesView('dokumen')}
										className={`px-4 py-2 rounded-lg font-medium transition-all ${
											bumdesView === 'dokumen'
												? 'bg-white text-green-600 shadow-sm'
												: 'text-gray-600 hover:bg-white/50'
										}`}
									>
										📁 Dokumen
									</button>
								</div>
							</div>

							<div className="p-6">
								{bumdesView === 'dashboard' && <BumdesDashboardModern />}
								{bumdesView === 'form' && <BumdesForm onSwitchToDashboard={() => setBumdesView('dashboard')} />}
								{bumdesView === 'dokumen' && <BumdesDokumenManager />}
							</div>
						</Suspense>
					</div>
				)}

				{activeTab === 'bankeu' && (
					<div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
						{!bankeuYear ? (
							/* Year Selection Screen */
							<div className="flex flex-col items-center justify-center py-20 px-6">
								<div className="inline-flex h-20 w-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl items-center justify-center mb-6 shadow-2xl shadow-blue-500/30">
									<DollarSign className="h-10 w-10 text-white" />
								</div>
								<h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 via-blue-700 to-blue-600 bg-clip-text text-transparent mb-2">
									Bantuan Keuangan Desa
								</h2>
								<p className="text-gray-500 mb-10 text-center max-w-md">
									Pilih tahun anggaran terlebih dahulu untuk melihat data
								</p>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-lg">
									<button
										onClick={() => setBankeuYear(2025)}
										className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border-2 border-gray-200 hover:border-blue-400 p-8 transition-all duration-300 text-center overflow-hidden hover:-translate-y-1"
									>
										<div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
										<div className="relative">
											<div className="h-16 w-16 mx-auto bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-blue-500/25">
												<span className="text-2xl">📋</span>
											</div>
											<h3 className="text-xl font-bold text-gray-800 mb-2">TA 2025</h3>
											<p className="text-sm text-gray-500 leading-relaxed">Bantuan Keuangan<br/>Tahap 1 & Tahap 2</p>
										</div>
									</button>

									<button
										onClick={() => setBankeuYear(2026)}
										className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border-2 border-gray-200 hover:border-green-400 p-8 transition-all duration-300 text-center overflow-hidden hover:-translate-y-1"
									>
										<div className="absolute inset-0 bg-gradient-to-br from-green-400/5 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
										<div className="relative">
											<div className="h-16 w-16 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-green-500/25">
												<span className="text-2xl">📝</span>
											</div>
											<h3 className="text-xl font-bold text-gray-800 mb-2">TA 2026</h3>
											<p className="text-sm text-gray-500 leading-relaxed">Verifikasi Proposal<br/>Bantuan Keuangan</p>
										</div>
									</button>
								</div>
							</div>
						) : (
							<Suspense fallback={<LoadingFallback />}>
								{bankeuYear === 2025 ? (
									<BankeuDashboard />
								) : (
									<DpmdVerificationPage />
								)}
							</Suspense>
						)}
					</div>
				)}

				{activeTab === 'activity' && (
					<div className="relative bg-gradient-to-br from-white via-white to-green-50/30 rounded-2xl shadow-xl border border-gray-200/50 p-8 overflow-hidden">
						{/* Decorative Elements */}
						<div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-400/5 to-emerald-500/5 rounded-full blur-3xl -z-0"></div>
						<div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-400/5 to-purple-500/5 rounded-full blur-3xl -z-0"></div>
						
						<div className="relative z-10">
							<div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
								<div className="flex items-center gap-3">
									<div className="h-12 w-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/25">
										<Activity className="h-6 w-6 text-white" />
									</div>
									<div>
										<h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
											Aktivitas Terkini
										</h2>
										<p className="text-sm text-gray-500">Pantau semua aktivitas terbaru</p>
									</div>
								</div>
								
								<div className="flex items-center gap-3">
									{/* Filter */}
									<select
										value={activityFilter}
										onChange={(e) => setActivityFilter(e.target.value)}
										className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all"
									>
										<option value="all">🔍 Semua Aktivitas</option>
										<option value="bumdes">🏢 BUMDes</option>
										<option value="bankeu">💰 Bantuan Keuangan</option>
									</select>
									
									{/* Refresh Button */}
									<button
										onClick={fetchActivityLogs}
										disabled={activityLoading}
										className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 font-medium"
									>
										<Activity className={`h-4 w-4 ${activityLoading ? 'animate-spin' : ''}`} />
										<span>{activityLoading ? 'Memuat...' : 'Refresh'}</span>
									</button>
								</div>
							</div>

							{activityLoading ? (
								<div className="text-center py-16">
									<div className="relative inline-flex">
										<div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200"></div>
										<div className="animate-spin rounded-full h-16 w-16 border-4 border-green-600 border-t-transparent absolute top-0 left-0"></div>
									</div>
									<p className="mt-6 text-gray-600 font-medium">Memuat aktivitas...</p>
								</div>
							) : activityLogs.length === 0 ? (
								<div className="text-center py-16 bg-gradient-to-br from-gray-50 to-green-50/20 rounded-2xl border-2 border-dashed border-gray-200">
									<div className="inline-flex h-20 w-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl items-center justify-center mb-4 shadow-inner">
										<Activity className="h-10 w-10 text-gray-400" />
									</div>
									<p className="text-gray-600 font-medium text-lg">Belum ada aktivitas</p>
									<p className="text-gray-400 text-sm mt-1">Aktivitas akan muncul di sini</p>
								</div>
							) : (
								<div className="space-y-3">
									{activityLogs.map((log) => (
										<div key={log.id} className="group flex gap-4 p-5 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 hover:border-green-200 hover:shadow-lg transition-all duration-300">
											<div className="flex-shrink-0">
												<div className={`h-12 w-12 rounded-xl ${getActionColor(log.action)} flex items-center justify-center font-bold text-sm uppercase shadow-md group-hover:scale-110 transition-transform`}>
													{log.action.substring(0, 2)}
												</div>
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-sm text-gray-800 font-semibold mb-1.5">{log.description}</p>
												<div className="flex items-center gap-3 text-xs text-gray-500">
													<span className="font-medium">{log.userName}</span>
													<span>•</span>
													<span className="capitalize bg-gray-100 px-2 py-1 rounded-md">{log.module}</span>
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
				)}
					</main>
				</div>
			</div>
		</div>
	);
};

export default SpkedPage;
