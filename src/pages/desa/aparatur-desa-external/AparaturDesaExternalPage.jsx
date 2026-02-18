import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
	Users, 
	Search, 
	Filter, 
	RefreshCw, 
	ArrowLeft, 
	MapPin, 
	Briefcase, 
	ChevronDown,
	AlertCircle,
	Loader2,
	UserCircle,
	Building,
	CheckCircle,
	XCircle,
	Eye,
	LayoutGrid,
	List
} from 'lucide-react';
import api from '../../../api';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';

const AparaturDesaExternalPage = () => {
	const navigate = useNavigate();
	const { user } = useAuth();
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState([]);
	const [pagination, setPagination] = useState({
		page: 1,
		limit: 20,
		totalPages: 1,
		totalItems: 0
	});
	const [filters, setFilters] = useState({
		name: '',
		gender: '',
		status_pns: '',
		min_age: '',
		max_age: ''
	});
	const [connectionStatus, setConnectionStatus] = useState(null);
	const [showFilters, setShowFilters] = useState(false);
	const [selectedAparatur, setSelectedAparatur] = useState(null);
	const [showDetail, setShowDetail] = useState(false);
	const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
	const [activeCategory, setActiveCategory] = useState('Perangkat Desa'); // 'Perangkat Desa' or 'BPD'

	// Get user's village code - remove dots for external API
	const userVillageCode = user?.desa?.kode?.replace(/\./g, '') || '';
	const userVillageName = user?.desa?.nama || 'Desa Anda';

	useEffect(() => {
		if (userVillageCode) {
			checkConnectionStatus();
		}
	}, [userVillageCode]);

	useEffect(() => {
		if (connectionStatus?.connected && userVillageCode) {
			fetchAparaturDesa();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [connectionStatus, pagination.page, filters, userVillageCode, activeCategory]);

	const checkConnectionStatus = async () => {
		try {
			const response = await api.get('/external/status');
			setConnectionStatus(response.data.data);
		} catch (error) {
			console.error('Connection check failed:', error);
			setConnectionStatus({ connected: false, error: error.message });
		}
	};

	const fetchAparaturDesa = async () => {
		if (!userVillageCode) {
			toast.error('Kode desa tidak ditemukan');
			return;
		}

		try {
			setLoading(true);
			const params = new URLSearchParams();
			
			// Always send all params (even empty) as per API requirement
			params.append('name', filters.name || '');
			params.append('job_type', activeCategory); // Use active category tab
			params.append('master_district_id', ''); // Not filtering by district
			params.append('master_village_id', userVillageCode); // Use user's village code
			params.append('gender', filters.gender || '');
			params.append('status_pns', filters.status_pns || '');
			params.append('min_age', filters.min_age || '');
			params.append('max_age', filters.max_age || '');
			params.append('page', pagination.page);
			params.append('limit', pagination.limit);

			const response = await api.get(`/external/aparatur-desa?${params.toString()}`);
			
			if (response.data.success) {
				setData(response.data.data || []);
				// Handle meta pagination from external API
				if (response.data.meta) {
					const meta = response.data.meta;
					const totalPages = meta.totalPage || Math.ceil((meta.totalData || 0) / pagination.limit);
					setPagination(prev => ({
						...prev,
						totalPages: totalPages,
						totalItems: meta.totalData || 0
					}));
				}
			}
		} catch (error) {
			console.error('Failed to fetch aparatur desa:', error);
			toast.error('Gagal memuat data aparatur desa');
		} finally {
			setLoading(false);
		}
	};

	const handleSearch = (e) => {
		e.preventDefault();
		setPagination(prev => ({ ...prev, page: 1 }));
		fetchAparaturDesa();
	};

	const handleFilterChange = (key, value) => {
		setFilters(prev => ({ ...prev, [key]: value }));
		setPagination(prev => ({ ...prev, page: 1 }));
	};

	const resetFilters = () => {
		setFilters({
			name: '',
			gender: '',
			status_pns: '',
			min_age: '',
			max_age: ''
		});
		setPagination(prev => ({ ...prev, page: 1 }));
	};

	const viewDetail = (id) => {
		const aparatur = data.find(a => a.id === id);
		if (aparatur) {
			setSelectedAparatur(aparatur);
			setShowDetail(true);
		} else {
			toast.error('Data aparatur tidak ditemukan');
		}
	};

	// Gender options
	const genderOptions = [
		{ value: 'L', label: 'Laki-laki' },
		{ value: 'P', label: 'Perempuan' }
	];

	// Status PNS options
	const statusPnsOptions = [
		{ value: 'PNS', label: 'PNS' },
		{ value: 'NON PNS', label: 'Non PNS' }
	];

	// No village code
	if (!userVillageCode) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
				<div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
					<div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<AlertCircle className="h-8 w-8 text-yellow-600" />
					</div>
					<h2 className="text-xl font-bold text-gray-800 mb-2">Kode Desa Tidak Ditemukan</h2>
					<p className="text-gray-600 mb-4">
						Akun Anda tidak memiliki kode desa yang valid. Silakan hubungi administrator.
					</p>
					<button
						onClick={() => navigate('/desa/dashboard')}
						className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
					>
						Kembali ke Dashboard
					</button>
				</div>
			</div>
		);
	}

	// Connection Error State
	if (connectionStatus && !connectionStatus.connected) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
				<div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
					<div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<AlertCircle className="h-8 w-8 text-red-600" />
					</div>
					<h2 className="text-xl font-bold text-gray-800 mb-2">Koneksi Gagal</h2>
					<p className="text-gray-600 mb-4">
						Tidak dapat terhubung ke External API DPMD Kabupaten Bogor.
					</p>
					{connectionStatus.error && (
						<p className="text-sm text-red-500 mb-4 bg-red-50 p-3 rounded-lg">
							{connectionStatus.error}
						</p>
					)}
					<div className="flex gap-3 justify-center">
						<button
							onClick={() => navigate('/desa/dashboard')}
							className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
						>
							Kembali
						</button>
						<button
							onClick={checkConnectionStatus}
							className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
						>
							<RefreshCw className="h-4 w-4" />
							Coba Lagi
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 pb-6">
			{/* Header */}
			<div className="bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 text-white rounded-md">
				<div className="px-4 sm:px-6 lg:px-8 py-6">
					<div className="flex items-center gap-4">
						<div className="h-16 w-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
							<Users className="h-8 w-8" />
						</div>
						<div>
							<h1 className="text-2xl font-bold">Aparatur Desa</h1>
							<p className="text-teal-100 mt-1">{userVillageName} - Data dari Dapur Desa DPMD Kab. Bogor</p>
						</div>
					</div>
					
					{/* Connection Status */}
					<div className="mt-4 flex items-center gap-2 text-sm">
						{connectionStatus?.connected ? (
							<>
								<CheckCircle className="h-4 w-4 text-green-300" />
								<span className="text-green-200">Terhubung ke Dapur Desa</span>
							</>
						) : (
							<>
								<Loader2 className="h-4 w-4 animate-spin text-teal-200" />
								<span className="text-teal-200">Memeriksa koneksi...</span>
							</>
						)}
					</div>
				</div>
			</div>

			<div className="py-6">
				{/* Search & Filter Section */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
					<form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4">
						{/* Search Input */}
						<div className="flex-1 relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
							<input
								type="text"
								placeholder="Cari nama aparatur..."
								value={filters.name}
								onChange={(e) => setFilters(prev => ({ ...prev, name: e.target.value }))}
								className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
							/>
						</div>

						{/* Filter Toggle */}
						<button
							type="button"
							onClick={() => setShowFilters(!showFilters)}
							className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
						>
							<Filter className="h-4 w-4" />
							Filter
							<ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
						</button>

						{/* Search Button */}
						<button
							type="submit"
							className="px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
						>
							<Search className="h-4 w-4" />
							Cari
						</button>

						{/* Refresh Button */}
						<button
							type="button"
							onClick={fetchAparaturDesa}
							className="px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
						>
							<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
						</button>
					</form>

					{/* Filter Panel */}
					{showFilters && (
						<div className="mt-4 pt-4 border-t border-gray-200">
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
								{/* Gender Select */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Jenis Kelamin</label>
									<select
										value={filters.gender}
										onChange={(e) => handleFilterChange('gender', e.target.value)}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
									>
										<option value="">Semua</option>
										{genderOptions.map(opt => (
											<option key={opt.value} value={opt.value}>{opt.label}</option>
										))}
									</select>
								</div>

								{/* Status PNS Select */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Status Kepegawaian</label>
									<select
										value={filters.status_pns}
										onChange={(e) => handleFilterChange('status_pns', e.target.value)}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
									>
										<option value="">Semua</option>
										{statusPnsOptions.map(opt => (
											<option key={opt.value} value={opt.value}>{opt.label}</option>
										))}
									</select>
								</div>

								{/* Min Age */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Usia Min</label>
									<input
										type="number"
										placeholder="Min"
										value={filters.min_age}
										onChange={(e) => handleFilterChange('min_age', e.target.value)}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
										min="0"
									/>
								</div>

								{/* Max Age */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Usia Max</label>
									<input
										type="number"
										placeholder="Max"
										value={filters.max_age}
										onChange={(e) => handleFilterChange('max_age', e.target.value)}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
										min="0"
									/>
								</div>
							</div>
							
							<div className="mt-4 flex justify-end">
								<button
									onClick={resetFilters}
									className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
								>
									Reset Filter
								</button>
							</div>
						</div>
					)}
				</div>

				{/* Category Tabs */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1.5 mb-4">
					<div className="flex">
						<button
							onClick={() => { setActiveCategory('Perangkat Desa'); setPagination(prev => ({ ...prev, page: 1 })); }}
							className={`flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
								activeCategory === 'Perangkat Desa'
									? 'bg-teal-600 text-white shadow-sm'
									: 'text-gray-600 hover:bg-gray-100'
							}`}
						>
							<Users className="h-4 w-4" />
							Perangkat Desa
						</button>
						<button
							onClick={() => { setActiveCategory('BPD'); setPagination(prev => ({ ...prev, page: 1 })); }}
							className={`flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
								activeCategory === 'BPD'
									? 'bg-teal-600 text-white shadow-sm'
									: 'text-gray-600 hover:bg-gray-100'
							}`}
						>
							<Building className="h-4 w-4" />
							BPD
						</button>
					</div>
				</div>

				{/* Summary Card with View Toggle */}
				<div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl shadow-sm p-4 mb-6 text-white">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center">
								{activeCategory === 'BPD' ? <Building className="h-6 w-6" /> : <Users className="h-6 w-6" />}
							</div>
							<div>
								<p className="text-teal-100 text-sm">Total {activeCategory}</p>
								<p className="text-2xl font-bold">{pagination.totalItems}</p>
							</div>
						</div>
						<div className="flex items-center gap-4">
							{/* View Mode Toggle */}
							<div className="hidden sm:flex items-center bg-white/20 rounded-lg p-1">
								<button
									onClick={() => setViewMode('table')}
									className={`p-2 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white text-teal-600' : 'text-white hover:bg-white/20'}`}
									title="Tampilan Tabel"
								>
									<List className="h-4 w-4" />
								</button>
								<button
									onClick={() => setViewMode('grid')}
									className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white text-teal-600' : 'text-white hover:bg-white/20'}`}
									title="Tampilan Grid"
								>
									<LayoutGrid className="h-4 w-4" />
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* Data Display */}
				{loading ? (
					<div className="bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center py-12">
						<Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
					</div>
				) : data.length === 0 ? (
					<div className="bg-white rounded-xl shadow-sm border border-gray-200 text-center py-12">
						{activeCategory === 'BPD' ? (
							<Building className="h-12 w-12 text-gray-300 mx-auto mb-3" />
						) : (
							<Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
						)}
						<p className="text-gray-500">Tidak ada data {activeCategory}</p>
						<p className="text-sm text-gray-400 mt-1">Kode desa: {userVillageCode}</p>
					</div>
				) : viewMode === 'grid' ? (
					/* Grid Card View */
					<>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
							{data.map((aparatur) => (
								<div 
									key={aparatur.id} 
									className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer group"
									onClick={() => viewDetail(aparatur.id)}
								>
									{/* Card Header with Photo */}
									<div className="flex flex-col items-center text-center mb-4">
										{aparatur.photo ? (
											<img 
												src={aparatur.photo} 
												alt={aparatur.name}
												className="h-20 w-20 rounded-full object-cover mb-3 border-4 border-teal-100 group-hover:border-teal-200 transition-colors"
												onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
											/>
										) : null}
										<div className={`h-20 w-20 bg-gradient-to-br from-teal-100 to-teal-200 rounded-full flex items-center justify-center mb-3 ${aparatur.photo ? 'hidden' : ''}`}>
											<UserCircle className="h-10 w-10 text-teal-600" />
										</div>
										<h3 className="font-bold text-gray-900 line-clamp-1">{aparatur.name}</h3>
										<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800 mt-2">
											<Briefcase className="h-3 w-3" />
											{aparatur.master_job_level_name || '-'}
										</span>
									</div>

									{/* Card Info */}
									<div className="space-y-2 text-sm border-t border-gray-100 pt-3">
										<div className="flex items-center justify-between">
											<span className="text-gray-500">Jenis Kelamin</span>
											<span className="font-medium text-gray-700">
												{aparatur.gender === 'L' ? 'Laki-laki' : aparatur.gender === 'P' ? 'Perempuan' : '-'}
											</span>
										</div>
										<div className="flex items-center justify-between">
											<span className="text-gray-500">Usia</span>
											<span className="font-medium text-gray-700">{aparatur.usia ? `${aparatur.usia} tahun` : '-'}</span>
										</div>
										<div className="flex items-center justify-between">
											<span className="text-gray-500">Status</span>
											<span className={`px-2 py-0.5 rounded text-xs font-medium ${aparatur.status_pns === 'PNS' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
												{aparatur.status_pns || '-'}
											</span>
										</div>
									</div>

									{/* View Detail Button */}
									<div className="mt-4 pt-3 border-t border-gray-100">
										<button
											className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors text-sm font-medium"
										>
											<Eye className="h-4 w-4" />
											Lihat Detail
										</button>
									</div>
								</div>
							))}
						</div>

						{/* Grid Pagination */}
						{(pagination.totalPages > 1 || pagination.totalItems > 0) && (
							<div className="bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
								<p className="text-sm text-gray-500">
									Menampilkan {data.length} dari {pagination.totalItems} data | Halaman {pagination.page} dari {pagination.totalPages || 1}
								</p>
								<div className="flex gap-2">
									<button
										onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
										disabled={pagination.page <= 1}
										className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										Sebelumnya
									</button>
									<button
										onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
										disabled={pagination.page >= pagination.totalPages}
										className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										Selanjutnya
									</button>
								</div>
							</div>
						)}
					</>
				) : (
					/* Table List View */
					<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
						{/* Desktop Table */}
						<div className="hidden md:block overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
									<thead className="bg-gray-50">
										<tr>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Nama
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Jabatan
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Jenis Kelamin
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Status
											</th>
											<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
												Aksi
											</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{data.map((aparatur) => (
											<tr key={aparatur.id} className="hover:bg-gray-50 transition-colors">
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="flex items-center gap-3">
														{aparatur.photo ? (
															<img 
																src={aparatur.photo} 
																alt={aparatur.name}
																className="h-10 w-10 rounded-full object-cover"
																onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
															/>
														) : null}
														<div className={`h-10 w-10 bg-teal-100 rounded-full flex items-center justify-center ${aparatur.photo ? 'hidden' : ''}`}>
															<UserCircle className="h-6 w-6 text-teal-600" />
														</div>
														<div>
															<p className="font-medium text-gray-900">{aparatur.name}</p>
															{aparatur.usia && (
																<p className="text-xs text-gray-500">{aparatur.usia} tahun</p>
															)}
														</div>
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
														<Briefcase className="h-3 w-3" />
														{aparatur.master_job_level_name || '-'}
													</span>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<span className="text-gray-600">
														{aparatur.gender === 'L' ? 'Laki-laki' : aparatur.gender === 'P' ? 'Perempuan' : '-'}
													</span>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<span className={`px-2 py-0.5 rounded text-xs ${aparatur.status_pns === 'PNS' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
														{aparatur.status_pns || '-'}
													</span>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right">
													<button
														onClick={() => viewDetail(aparatur.id)}
														className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
														title="Lihat Detail"
													>
														<Eye className="h-4 w-4" />
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
						</div>

						{/* Mobile Cards */}
						<div className="md:hidden divide-y divide-gray-200">
								{data.map((aparatur) => (
									<div key={aparatur.id} className="p-4">
										<div className="flex items-start gap-3">
											{aparatur.photo ? (
												<img 
													src={aparatur.photo} 
													alt={aparatur.name}
													className="h-12 w-12 rounded-full object-cover flex-shrink-0"
													onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
												/>
											) : null}
											<div className={`h-12 w-12 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0 ${aparatur.photo ? 'hidden' : ''}`}>
												<UserCircle className="h-7 w-7 text-teal-600" />
											</div>
											<div className="flex-1 min-w-0">
												<h3 className="font-semibold text-gray-900">{aparatur.name}</h3>
												<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800 mt-1">
													<Briefcase className="h-3 w-3" />
													{aparatur.master_job_level_name || '-'}
												</span>
												<div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
													<span className="text-gray-500">
														{aparatur.gender === 'L' ? 'Laki-laki' : aparatur.gender === 'P' ? 'Perempuan' : '-'}
													</span>
													<span className={`px-2 py-0.5 rounded text-xs ${aparatur.status_pns === 'PNS' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
														{aparatur.status_pns || '-'}
													</span>
													{aparatur.usia && <span className="text-gray-500">• {aparatur.usia} thn</span>}
												</div>
											</div>
											<button
												onClick={() => viewDetail(aparatur.id)}
												className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
											>
											<Eye className="h-5 w-5" />
											</button>
										</div>
									</div>
								))}
						</div>

						{/* Pagination */}
						{(pagination.totalPages > 1 || pagination.totalItems > 0) && (
							<div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2">
								<p className="text-sm text-gray-500">
									Menampilkan {data.length} dari {pagination.totalItems} data | Halaman {pagination.page} dari {pagination.totalPages || 1}
								</p>
								<div className="flex gap-2">
									<button
										onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
										disabled={pagination.page <= 1}
										className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										Sebelumnya
									</button>
									<button
										onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
										disabled={pagination.page >= pagination.totalPages}
										className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										Selanjutnya
									</button>
								</div>
							</div>
						)}
					</div>
				)}
			</div>

			{/* Detail Modal */}
			{showDetail && selectedAparatur && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
						<div className="p-6 border-b border-gray-200">
							<div className="flex items-center justify-between">
								<h2 className="text-xl font-bold text-gray-900">Detail Aparatur</h2>
								<button
									onClick={() => setShowDetail(false)}
									className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
								>
									<XCircle className="h-5 w-5 text-gray-500" />
								</button>
							</div>
						</div>
						<div className="p-6">
							{/* Header with Photo */}
							<div className="flex flex-col items-center mb-6">
								{selectedAparatur.photo ? (
									<img 
										src={selectedAparatur.photo} 
										alt={selectedAparatur.name}
										className="h-24 w-24 rounded-full object-cover mb-3 border-4 border-teal-100"
										onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
									/>
								) : null}
								<div className={`h-24 w-24 bg-teal-100 rounded-full flex items-center justify-center mb-3 ${selectedAparatur.photo ? 'hidden' : ''}`}>
									<UserCircle className="h-14 w-14 text-teal-600" />
								</div>
								<h3 className="text-xl font-bold text-gray-900 text-center">{selectedAparatur.name || '-'}</h3>
								<span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-teal-100 text-teal-800 mt-2">
									<Briefcase className="h-4 w-4" />
									{selectedAparatur.master_job_level_name || '-'}
								</span>
								{selectedAparatur.status === 1 && (
									<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-2">
										<CheckCircle className="h-3 w-3" />
										Aktif
									</span>
								)}
							</div>

							{/* Detail Info */}
							<div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
								{/* Lokasi Section */}
								<div className="bg-gray-50 rounded-lg p-4">
									<h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
										<MapPin className="h-4 w-4" />
										Lokasi Tugas
									</h4>
									<div className="grid grid-cols-2 gap-3 text-sm">
										<div>
											<p className="text-gray-500">Desa</p>
											<p className="font-medium text-gray-900">{selectedAparatur.master_village_name || '-'}</p>
										</div>
										<div>
											<p className="text-gray-500">Kecamatan</p>
											<p className="font-medium text-gray-900">{selectedAparatur.master_district_name || '-'}</p>
										</div>
									</div>
								</div>

								{/* Data Pribadi Section */}
								<div className="bg-gray-50 rounded-lg p-4">
									<h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
										<UserCircle className="h-4 w-4" />
										Data Pribadi
									</h4>
									<div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
										<div>
											<p className="text-gray-500">Jenis Kelamin</p>
											<p className="font-medium text-gray-900">
												{selectedAparatur.gender === 'L' ? 'Laki-laki' : selectedAparatur.gender === 'P' ? 'Perempuan' : '-'}
											</p>
										</div>
										<div>
											<p className="text-gray-500">Usia</p>
											<p className="font-medium text-gray-900">{selectedAparatur.usia ? `${selectedAparatur.usia} tahun` : '-'}</p>
										</div>
										<div>
											<p className="text-gray-500">Agama</p>
											<p className="font-medium text-gray-900">{selectedAparatur.agama || '-'}</p>
										</div>
										<div>
											<p className="text-gray-500">Status Pernikahan</p>
											<p className="font-medium text-gray-900">{selectedAparatur.marital_status || '-'}</p>
										</div>
										<div>
											<p className="text-gray-500">Pendidikan</p>
											<p className="font-medium text-gray-900">{selectedAparatur.master_degree_name || '-'}</p>
										</div>
										{selectedAparatur.tahun_lulus && selectedAparatur.tahun_lulus !== 'null' && (
											<div>
												<p className="text-gray-500">Tahun Lulus</p>
												<p className="font-medium text-gray-900">{selectedAparatur.tahun_lulus}</p>
											</div>
										)}
									</div>
								</div>

								{/* Kepegawaian Section - Full width on desktop */}
								<div className="bg-gray-50 rounded-lg p-4 md:col-span-2">
									<h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
										<Briefcase className="h-4 w-4" />
										Data Kepegawaian
									</h4>
									<div className="space-y-3 text-sm">
										<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
											<div>
												<p className="text-gray-500">Status</p>
												<span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${selectedAparatur.status_pns === 'PNS' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
													{selectedAparatur.status_pns || '-'}
												</span>
											</div>
											<div>
												<p className="text-gray-500">Jabatan</p>
												<p className="font-medium text-gray-900">{selectedAparatur.master_job_level_name || '-'}</p>
											</div>
										</div>
										
										{/* SK Section - Grid on desktop */}
										<div className="border-t border-gray-200 pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
											{/* SK Saat Ini */}
											<div>
												<p className="text-xs text-gray-400 mb-2">SK Saat Ini</p>
												<div className="grid grid-cols-2 gap-3">
													<div>
														<p className="text-gray-500">No. SK</p>
														<p className="font-medium text-gray-900 text-xs">{selectedAparatur.no_sk || '-'}</p>
													</div>
													<div>
														<p className="text-gray-500">Tanggal SK</p>
														<p className="font-medium text-gray-900">
															{selectedAparatur.sk_date ? new Date(selectedAparatur.sk_date).toLocaleDateString('id-ID', {
																day: 'numeric',
																month: 'short',
																year: 'numeric'
															}) : '-'}
														</p>
													</div>
												</div>
											</div>

											{/* SK Pertama */}
											{selectedAparatur.no_sk_pertama && (
												<div>
													<p className="text-xs text-gray-400 mb-2">SK Pertama</p>
													<div className="grid grid-cols-2 gap-3">
														<div>
															<p className="text-gray-500">No. SK</p>
															<p className="font-medium text-gray-900 text-xs">{selectedAparatur.no_sk_pertama}</p>
														</div>
														<div>
															<p className="text-gray-500">Tanggal SK</p>
															<p className="font-medium text-gray-900">
																{selectedAparatur.sk_date_pertama ? new Date(selectedAparatur.sk_date_pertama).toLocaleDateString('id-ID', {
																	day: 'numeric',
																	month: 'short',
																	year: 'numeric'
																}) : '-'}
															</p>
														</div>
													</div>
												</div>
											)}
										</div>
									</div>
								</div>
							</div>
						</div>
						<div className="p-6 border-t border-gray-200">
							<button
								onClick={() => setShowDetail(false)}
								className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
							>
								Tutup
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default AparaturDesaExternalPage;
