// src/pages/bidang/sekretariat/JadwalKegiatanPage.jsx
// Updated: Simplified date filter to single date
import React, { useState, useEffect, useCallback } from 'react';
import {
	LuCalendar,
	LuPlus,
	LuSearch,
	LuFilter,
	LuPencil,
	LuTrash2,
	LuCheck,
	LuX,
	LuClock,
	LuMapPin,
	LuUser,
	LuPhone,
	LuChevronLeft,
	LuChevronRight,
	LuLayoutGrid,
	LuCalendarDays,
	LuList,
	LuEye,
} from 'react-icons/lu';
import api from '../../../api';
import Swal from 'sweetalert2';
import JadwalKegiatanModal from '../../../components/JadwalKegiatanModal';
import JadwalKalenderView from '../../../components/JadwalKalenderView';

const JadwalKegiatanPage = () => {
	// Get user from localStorage
	const user = JSON.parse(localStorage.getItem('user') || '{}');
	
	// Check if user can manage jadwal (Sekretariat or Superadmin)
	const canManageJadwal = user?.bidang_id === 2 || user?.role === 'superadmin';

	const [jadwals, setJadwals] = useState([]);
	const [loading, setLoading] = useState(true);
	const [isInitialLoad, setIsInitialLoad] = useState(true);
	const [showAddModal, setShowAddModal] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false);
	const [showDetailModal, setShowDetailModal] = useState(false);
	const [selectedJadwal, setSelectedJadwal] = useState(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
	const [filterStatus, setFilterStatus] = useState('all');
	const [filterPrioritas, setFilterPrioritas] = useState('all');
	
	// Get today's date in YYYY-MM-DD format for default filter
	const getTodayDate = () => {
		const today = new Date();
		return today.toISOString().split('T')[0];
	};
	
	const [filterTanggal, setFilterTanggal] = useState(getTodayDate());
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalData, setTotalData] = useState(0);
	
	// Responsive default view: 'table' for desktop/tablet, 'grid' for mobile
	const getDefaultViewMode = () => {
		if (typeof window !== 'undefined') {
			return window.innerWidth >= 768 ? 'table' : 'grid';
		}
		return 'table';
	};
	
	const [viewMode, setViewMode] = useState(getDefaultViewMode()); // 'table', 'grid', or 'calendar'
	const [showMobileFilters, setShowMobileFilters] = useState(false); // Toggle filter visibility on mobile
	const itemsPerPage = 5;

	// Form state
	const [formData, setFormData] = useState({
		judul: '',
		deskripsi: '-',
		bidang_id: '',
		tanggal_mulai: '',
		tanggal_selesai: '',
		lokasi: '',
		asal_kegiatan: '',
		prioritas: 'sedang',
		kategori: 'lainnya',
		pic_name: '',
		pic_contact: ''
	});

	// Handle form change
	const handleFormChange = (e) => {
		const { name, value } = e.target;
		setFormData(prev => ({
			...prev,
			[name]: value
		}));
	};

	// Reset form data
	const resetFormData = () => {
		setFormData({
			judul: '',
			deskripsi: '-',
			bidang_id: '',
			tanggal_mulai: '',
			tanggal_selesai: '',
			lokasi: '',
			asal_kegiatan: '',
			prioritas: 'sedang',
			kategori: 'lainnya',
			pic_name: '',
			pic_contact: ''
		});
	};

	const [bidangList, setBidangList] = useState([]);

	// Fetch bidang list
	const fetchBidangList = useCallback(async () => {
		try {
			const response = await api.get('/bidang');
			setBidangList(response.data.data || []);
		} catch (error) {
			console.error('Error fetching bidang:', error);
		}
	}, []);

	// Fetch jadwal kegiatan
	const fetchJadwal = useCallback(async () => {
		setLoading(true);
		try {
			const params = {
				page: currentPage,
				limit: itemsPerPage,
				search: debouncedSearchTerm || undefined,
				status: filterStatus !== 'all' ? filterStatus : undefined,
				prioritas: filterPrioritas !== 'all' ? filterPrioritas : undefined,
				tanggal: filterTanggal || undefined,
			};

			const response = await api.get('/jadwal-kegiatan', { params });
			
			setJadwals(response.data.data || []);
			setTotalPages(response.data.pagination?.totalPages || 1);
			setTotalData(response.data.pagination?.total || 0);
		} catch (error) {
			console.error('Error fetching jadwal:', error);
			Swal.fire('Error', 'Gagal mengambil data jadwal kegiatan', 'error');
		} finally {
			setLoading(false);
			setIsInitialLoad(false);
		}
	}, [currentPage, debouncedSearchTerm, filterStatus, filterPrioritas, filterTanggal]);

	useEffect(() => {
		fetchJadwal();
	}, [fetchJadwal]);

	useEffect(() => {
		fetchBidangList();
	}, [fetchBidangList]);

	// Debounce search term - trigger search 500ms after user stops typing
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearchTerm(searchTerm);
		}, 500);

		return () => clearTimeout(timer);
	}, [searchTerm]);

	// Handle create
	const handleCreate = async (e) => {
		e.preventDefault();
		try {
			await api.post('/jadwal-kegiatan', formData);
			Swal.fire('Berhasil', 'Jadwal kegiatan berhasil ditambahkan', 'success');
			setShowAddModal(false);
			resetFormData();
			fetchJadwal();
		} catch (error) {
			console.error('Error creating jadwal:', error);
			Swal.fire('Error', error.response?.data?.message || 'Gagal menambahkan jadwal kegiatan', 'error');
		}
	};

	// Handle update
	const handleUpdate = async (e) => {
		e.preventDefault();
		if (!selectedJadwal) return;
		
		try {
			await api.put(`/jadwal-kegiatan/${selectedJadwal.id}`, formData);
			Swal.fire('Berhasil', 'Jadwal kegiatan berhasil diperbarui', 'success');
			setShowEditModal(false);
			setSelectedJadwal(null);
			resetFormData();
			fetchJadwal();
		} catch (error) {
			console.error('Error updating jadwal:', error);
			Swal.fire('Error', error.response?.data?.message || 'Gagal memperbarui jadwal kegiatan', 'error');
		}
	};

	// Handle delete
	const handleDelete = async (id) => {
		const result = await Swal.fire({
			title: 'Hapus Jadwal?',
			text: 'Jadwal kegiatan yang dihapus tidak dapat dikembalikan',
			icon: 'warning',
			showCancelButton: true,
			confirmButtonColor: '#ef4444',
			cancelButtonColor: '#6b7280',
			confirmButtonText: 'Ya, Hapus',
			cancelButtonText: 'Batal'
		});

		if (result.isConfirmed) {
			try {
				await api.delete(`/jadwal-kegiatan/${id}`);
				Swal.fire('Terhapus!', 'Jadwal kegiatan berhasil dihapus', 'success');
				fetchJadwal();
			} catch (error) {
				console.error('Error deleting jadwal:', error);
				Swal.fire('Error', error.response?.data?.message || 'Gagal menghapus jadwal kegiatan', 'error');
			}
		}
	};

	// Handle edit
	const handleEdit = (jadwal) => {
		setSelectedJadwal(jadwal);
		// Populate form with jadwal data
		const formatDateTime = (dateString) => {
			if (!dateString) return '';
			const date = new Date(dateString);
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			const hours = String(date.getHours()).padStart(2, '0');
			const minutes = String(date.getMinutes()).padStart(2, '0');
			return `${year}-${month}-${day}T${hours}:${minutes}`;
		};
		
		setFormData({
			judul: jadwal.judul || '',
			deskripsi: jadwal.deskripsi || '-',
			bidang_id: jadwal.bidang_id || '',
			tanggal_mulai: formatDateTime(jadwal.tanggal_mulai),
			tanggal_selesai: formatDateTime(jadwal.tanggal_selesai),
			lokasi: jadwal.lokasi || '',
			asal_kegiatan: jadwal.asal_kegiatan || '',
			prioritas: jadwal.prioritas || 'sedang',
			kategori: jadwal.kategori || 'lainnya',
			pic_name: jadwal.pic_name || '',
			pic_contact: jadwal.pic_contact || ''
		});
		setShowEditModal(true);
	};

	// Handle view detail
	const handleViewDetail = (jadwal) => {
		setSelectedJadwal(jadwal);
		setShowDetailModal(true);
	};

	// Handle apply filters - immediately apply all filters when button clicked
	const handleApplyFilters = () => {
		// Only apply dropdown filters, not search term (search uses debounce)
		setCurrentPage(1);
		fetchJadwal();
	};

	// Reset filters
	const handleResetFilters = () => {
		setSearchTerm('');
		setDebouncedSearchTerm('');
		setFilterStatus('all');
		setFilterPrioritas('all');
		setFilterTanggal(getTodayDate());
		setCurrentPage(1);
	};

	// Format date
	const formatDate = (dateString) => {
		const date = new Date(dateString);
		return date.toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	};

	// Get status badge
	const getStatusBadge = (status) => {
		const badges = {
			draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft', icon: '📝' },
			scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Terjadwal', icon: '📅' },
			ongoing: { bg: 'bg-green-100', text: 'text-green-700', label: 'Berlangsung', icon: '▶️' },
			completed: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Selesai', icon: '✅' },
			cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Dibatalkan', icon: '❌' }
		};
		const badge = badges[status] || badges.draft;
		return (
			<span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
				<span>{badge.icon}</span>
				{badge.label}
			</span>
		);
	};

	// Get priority badge
	const getPriorityBadge = (prioritas) => {
		const badges = {
			rendah: { bg: 'bg-green-100', text: 'text-green-700', label: 'Rendah', icon: '🟢' },
			sedang: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Sedang', icon: '🟡' },
			tinggi: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Tinggi', icon: '🟠' },
			urgent: { bg: 'bg-red-100', text: 'text-red-700', label: 'Urgent', icon: '🔴' }
		};
		const badge = badges[prioritas] || badges.sedang;
		return (
			<span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
				<span>{badge.icon}</span>
				{badge.label}
			</span>
		);
	};

	if (isInitialLoad) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
				<div className="text-center">
					<div className="relative">
						<div className="animate-spin rounded-full h-20 w-20 border-4 border-gray-200 mx-auto mb-4"></div>
						<div className="absolute top-0 left-1/2 -translate-x-1/2 animate-spin rounded-full h-20 w-20 border-4 border-t-teal-600 border-r-cyan-600"></div>
					</div>
					<div className="mt-4 space-y-2">
						<p className="text-gray-900 font-semibold text-lg">Memuat Jadwal Kegiatan</p>
						<p className="text-gray-500 text-sm">Harap tunggu sebentar...</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 sm:p-4 md:p-6">
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<div className="mb-4 sm:mb-6">
					<div className="flex flex-col gap-4">
						<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
							<div className="flex-1">
								<div className="flex items-center gap-3 mb-2">
									<div className="p-2.5 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl shadow-lg">
										<LuCalendar className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
									</div>
									<div>
										<h1 className="text-sm lg:text-2xl font-bold text-gray-900">
											Jadwal Kegiatan
										</h1>
										<p className="text-xs lg:text-md text-gray-600 mt-0.5">
											Kelola dan pantau jadwal kegiatan DPMD
										</p>
									</div>
								</div>
								{/* Result count */}
								{!loading && viewMode !== 'calendar' && (
									<div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-lg">
										<div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div>
										<span className="text-sm font-semibold text-teal-700">
											{totalData} kegiatan ditemukan
										</span>
									</div>
								)}
							</div>

							{/* Tambah Jadwal Button */}
							{canManageJadwal && (
								<button
									onClick={() => setShowAddModal(true)}
									className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl hover:from-teal-700 hover:to-cyan-700 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95"
								>
									<LuPlus className="w-5 h-5" />
									<span className="hidden sm:inline">Tambah Jadwal</span>
									<span className="sm:hidden">Tambah</span>
								</button>
							)}
						</div>
					</div>
				</div>

				{/* Search and Filters */}
				<div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
					{/* Search Bar with Filter Button */}
					<div className="flex gap-2 mb-4">
						<div className="relative flex-1">
							<LuSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
							<input
								type="text"
								placeholder="Cari berdasarkan judul, lokasi, atau asal kegiatan..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
							/>
						</div>
						{/* Filter Toggle Button - Mobile Only */}
						<button
							type="button"
							onClick={() => setShowMobileFilters(!showMobileFilters)}
							className={`md:hidden flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-medium text-sm transition-all ${
								showMobileFilters
									? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							}`}
						>
							<LuFilter className="w-5 h-5" />
							<span className="sr-only">Filter</span>
						</button>
					</div>

					{/* Filters Row - Hidden on mobile unless toggled */}
					<div className={`space-y-4 ${showMobileFilters ? 'block' : 'hidden md:block'}`}>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
							<div>
								<label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
									<LuFilter className="w-3.5 h-3.5" />
									Status
								</label>
								<select
									value={filterStatus}
									onChange={(e) => setFilterStatus(e.target.value)}
									className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
								>
									<option value="all">Semua Status</option>
									<option value="draft">📝 Draft</option>
									<option value="scheduled">📅 Terjadwal</option>
									<option value="ongoing">▶️ Berlangsung</option>
									<option value="completed">✅ Selesai</option>
									<option value="cancelled">❌ Dibatalkan</option>
								</select>
							</div>

							<div>
								<label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
									<LuFilter className="w-3.5 h-3.5" />
									Prioritas
								</label>
								<select
									value={filterPrioritas}
									onChange={(e) => setFilterPrioritas(e.target.value)}
									className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
								>
									<option value="all">Semua Prioritas</option>
									<option value="rendah">🟢 Rendah</option>
									<option value="sedang">🟡 Sedang</option>
									<option value="tinggi">🟠 Tinggi</option>
									<option value="urgent">🔴 Urgent</option>
								</select>
							</div>

							<div>
								<label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
									<LuCalendar className="w-3.5 h-3.5" />
									Tanggal
								</label>
								<input
									type="date"
									value={filterTanggal}
									onChange={(e) => setFilterTanggal(e.target.value)}
									className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
								/>
							</div>
						</div>

						{/* Action Buttons */}
						<div className="flex flex-wrap gap-2 pt-2">
							<button
								type="button"
								onClick={handleApplyFilters}
								disabled={loading}
								className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700 transition-all shadow-sm hover:shadow font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{loading ? (
									<>
										<div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
										<span>Memuat...</span>
									</>
								) : (
									<>
										<LuFilter className="w-4 h-4" />
										Terapkan
									</>
								)}
							</button>
								<button
									type="button"
									onClick={handleResetFilters}
									className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
								>
								<LuX className="w-4 h-4" />
								Reset
							</button>
						</div>
					</div>
				</div>

				{/* View Mode Toggle */}
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-bold text-gray-900">Daftar Kegiatan</h2>
					<div className="flex gap-1.5 bg-white border border-gray-200 p-1 rounded-lg shadow-sm">
								<button
									type="button"
									onClick={() => setViewMode('table')}
									className={`flex items-center gap-1.5 px-3 py-2 rounded-md transition-all text-sm font-medium ${
										viewMode === 'table'
											? 'bg-white text-teal-700 shadow-sm'
											: 'text-gray-600 hover:text-gray-900'
									}`}
									title="Tampilan Tabel"
								>
									<LuList className="w-4 h-4" />
									<span className="hidden sm:inline">Tabel</span>
								</button>
								<button
									type="button"
									onClick={() => setViewMode('grid')}
									className={`flex items-center gap-1.5 px-3 py-2 rounded-md transition-all text-sm font-medium ${
										viewMode === 'grid'
											? 'bg-white text-teal-700 shadow-sm'
											: 'text-gray-600 hover:text-gray-900'
									}`}
									title="Tampilan Grid"
								>
									<LuLayoutGrid className="w-4 h-4" />
									<span className="hidden sm:inline">Grid</span>
								</button>
								<button
									type="button"
									onClick={() => setViewMode('calendar')}
									className={`flex items-center gap-1.5 px-3 py-2 rounded-md transition-all text-sm font-medium ${
										viewMode === 'calendar'
											? 'bg-white text-teal-700 shadow-sm'
											: 'text-gray-600 hover:text-gray-900'
									}`}
									title="Tampilan Kalender"
								>
							<LuCalendarDays className="w-4 h-4" />
							<span className="hidden sm:inline">Kalender</span>
						</button>
					</div>
				</div>

				{/* Content */}
				{viewMode === 'calendar' ? (
					<JadwalKalenderView
						jadwals={jadwals}
						onEventClick={canManageJadwal ? handleEdit : undefined}
					/>
				) : viewMode === 'table' ? (
					<>
						{/* Table View */}
						{jadwals.length === 0 ? (
							<div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
								<LuCalendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
								<p className="text-gray-600 font-medium">Tidak ada jadwal kegiatan</p>
								<p className="text-gray-400 text-sm mt-1">Coba ubah filter pencarian</p>
							</div>
						) : (
							<div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
								<div className="overflow-x-auto">
									<table className="w-full">
										<thead className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-gray-200">
											<tr>
												<th className="px-4 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
													Kegiatan
												</th>
												<th className="px-4 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">
													Tanggal
												</th>
												<th className="px-4 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden lg:table-cell">
													Lokasi
												</th>
												<th className="px-4 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden xl:table-cell">
													Bidang
												</th>
												<th className="px-4 py-3.5 text-center text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
													Status
												</th>
												<th className="px-4 py-3.5 text-center text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
													Prioritas
												</th>
												<th className="px-4 py-3.5 text-center text-xs font-bold text-gray-700 uppercase tracking-wider sticky right-0 bg-gradient-to-r from-teal-50 to-cyan-50">
													Aksi
												</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-gray-100">
											{jadwals.map((jadwal) => {
												return (
													<tr key={jadwal.id} className="hover:bg-teal-50/50 transition-colors">
														<td className="px-4 py-4">
															<div className="max-w-xs">
																<div className="font-semibold text-gray-900 text-sm line-clamp-2">
																	{jadwal.judul}
																</div>
																{jadwal.deskripsi && jadwal.deskripsi !== '-' && (
																	<div className="text-xs text-gray-500 mt-1 line-clamp-1">
																		{jadwal.deskripsi}
																	</div>
																)}
																{/* Show badges on mobile */}
																<div className="flex flex-wrap gap-1.5 mt-2 md:hidden">
																	{getStatusBadge(jadwal.status)}
																	{getPriorityBadge(jadwal.prioritas)}
																</div>
															</div>
														</td>
														<td className="px-4 py-4 whitespace-nowrap">
															<div className="flex items-start gap-2 text-sm">
																<LuClock className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
																<div>
																	<div className="font-medium text-gray-900">{formatDate(jadwal.tanggal_mulai)}</div>
																	<div className="text-xs text-gray-500">s/d {formatDate(jadwal.tanggal_selesai)}</div>
																</div>
															</div>
														</td>
														<td className="px-4 py-4 hidden lg:table-cell">
															<div className="flex items-center gap-2 text-sm text-gray-600 max-w-xs">
																<LuMapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
																<span className="line-clamp-2">{jadwal.lokasi || '-'}</span>
															</div>
														</td>
														<td className="px-4 py-4 hidden xl:table-cell">
															<div className="flex items-center gap-2 text-sm text-gray-600">
																<LuUser className="w-4 h-4 text-purple-500 flex-shrink-0" />
																<span className="line-clamp-1">{jadwal.bidang_nama || '-'}</span>
															</div>
														</td>
														<td className="px-4 py-4 text-center hidden md:table-cell">
															{getStatusBadge(jadwal.status)}
														</td>
														<td className="px-4 py-4 text-center hidden md:table-cell">
															{getPriorityBadge(jadwal.prioritas)}
														</td>
														<td className="px-4 py-4 sticky right-0 bg-white">
															<div className="flex items-center justify-center gap-1.5">
																<button
																	onClick={() => handleViewDetail(jadwal)}
																	className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
																	title="Lihat Detail"
																>
																	<LuEye className="w-4 h-4" />
																</button>
																{canManageJadwal && (
																	<>
																		<button
																			onClick={() => handleEdit(jadwal)}
																			className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
																			title="Edit"
																		>
																			<LuPencil className="w-4 h-4" />
																		</button>
																		<button
																			onClick={() => handleDelete(jadwal.id)}
																			className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
																			title="Hapus"
																		>
																			<LuTrash2 className="w-4 h-4" />
																		</button>
																	</>
																)}
															</div>
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							</div>
						)}
					</>
				) : (
					<>
						{/* Grid View */}
						{jadwals.length === 0 ? (
							<div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
								<LuCalendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
								<p className="text-gray-600 font-medium">Tidak ada jadwal kegiatan</p>
								<p className="text-gray-400 text-sm mt-1">Coba ubah filter pencarian</p>
							</div>
						) : (
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
								{jadwals.map((jadwal) => {
									return (
										<div
											key={jadwal.id}
											className="bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-teal-200 transition-all overflow-hidden group"
										>
											{/* Card Header with Gradient */}
											<div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-4 border-b border-gray-100">
												<div className="flex items-start justify-between gap-3 mb-3">
													<h3 className="font-bold text-base text-gray-900 line-clamp-2 flex-1">
														{jadwal.judul}
													</h3>
													<div className="flex-shrink-0">
														{getPriorityBadge(jadwal.prioritas)}
													</div>
												</div>
												<div className="flex items-center gap-2">
													{getStatusBadge(jadwal.status)}
													{jadwal.kategori && jadwal.kategori !== 'lainnya' && (
														<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 capitalize">
															{jadwal.kategori}
														</span>
													)}
												</div>
											</div>

											{/* Card Body */}
											<div className="p-4 space-y-3">
												{/* Tanggal */}
												<div className="flex items-start gap-2.5 text-sm">
													<div className="p-1.5 bg-teal-100 rounded-lg flex-shrink-0">
														<LuClock className="w-4 h-4 text-teal-600" />
													</div>
													<div className="flex-1 min-w-0">
														<p className="text-xs text-gray-500 font-medium">Waktu Pelaksanaan</p>
														<p className="font-semibold text-gray-900 text-sm">
															{formatDate(jadwal.tanggal_mulai)}
														</p>
														<p className="text-xs text-gray-600">
															s/d {formatDate(jadwal.tanggal_selesai)}
														</p>
													</div>
												</div>

												{/* Lokasi */}
												{jadwal.lokasi && jadwal.lokasi !== '-' && (
													<div className="flex items-start gap-2.5 text-sm">
														<div className="p-1.5 bg-red-100 rounded-lg flex-shrink-0">
															<LuMapPin className="w-4 h-4 text-red-600" />
														</div>
														<div className="flex-1 min-w-0">
															<p className="text-xs text-gray-500 font-medium">Lokasi</p>
															<p className="text-gray-900 font-medium line-clamp-2">{jadwal.lokasi}</p>
														</div>
													</div>
												)}

												{/* Bidang */}
												{jadwal.bidang_nama && (
													<div className="flex items-start gap-2.5 text-sm">
														<div className="p-1.5 bg-purple-100 rounded-lg flex-shrink-0">
															<LuUser className="w-4 h-4 text-purple-600" />
														</div>
														<div className="flex-1 min-w-0">
															<p className="text-xs text-gray-500 font-medium">Bidang</p>
															<p className="text-gray-900 font-medium">{jadwal.bidang_nama}</p>
														</div>
													</div>
												)}

												{/* Deskripsi Preview */}
												{jadwal.deskripsi && jadwal.deskripsi !== '-' && (
													<div className="pt-2 border-t border-gray-100">
														<p className="text-xs text-gray-500 line-clamp-2">{jadwal.deskripsi}</p>
													</div>
												)}
											</div>

											{/* Card Footer - Actions */}
											<div className="px-4 pb-4 flex gap-2">
												<button
													onClick={() => handleViewDetail(jadwal)}
													className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-700 rounded-xl hover:from-teal-100 hover:to-cyan-100 transition-all font-medium text-sm border border-teal-200"
												>
													<LuEye className="w-4 h-4" />
													Detail
												</button>
												{canManageJadwal && (
													<>
														<button
															onClick={() => handleEdit(jadwal)}
															className="px-3 py-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all border border-blue-200"
															title="Edit"
														>
															<LuPencil className="w-4 h-4" />
														</button>
														<button
															onClick={() => handleDelete(jadwal.id)}
															className="px-3 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all border border-red-200"
															title="Hapus"
														>
															<LuTrash2 className="w-4 h-4" />
														</button>
													</>
												)}
											</div>
										</div>
									);
								})}
							</div>
						)}
					</>
				)}

				{/* Pagination */}
				{viewMode !== 'calendar' && totalPages > 1 && (
					<div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-5">
						{/* Data Info & Pagination Controls */}
						<div className="flex flex-col gap-4">
							{/* Data Info */}
							<div className="text-center sm:text-left">
								<p className="text-sm text-gray-600">
									Menampilkan{' '}
									<span className="font-bold text-teal-700">{(currentPage - 1) * itemsPerPage + 1}</span>
									{' '}-{' '}
									<span className="font-bold text-teal-700">{Math.min(currentPage * itemsPerPage, totalData)}</span>
									{' '}dari{' '}
									<span className="font-bold text-gray-900">{totalData}</span>
									{' '}kegiatan
								</p>
							</div>

							{/* Pagination Controls */}
							<div className="flex flex-wrap items-center justify-center gap-2">
								{/* First Button */}
								<button
									onClick={() => setCurrentPage(1)}
									disabled={currentPage === 1}
									className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-medium"
									title="Halaman Pertama"
								>
									<LuChevronLeft className="w-4 h-4" />
									<LuChevronLeft className="w-4 h-4 -ml-3" />
								</button>

								{/* Previous Button */}
								<button
									onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
									disabled={currentPage === 1}
									className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-medium"
									title="Halaman Sebelumnya"
								>
									<LuChevronLeft className="w-4 h-4 text-gray-700" />
									<span className="hidden sm:inline text-gray-700">Prev</span>
								</button>

								{/* Page Numbers */}
								<div className="flex items-center gap-1">
									{(() => {
										const pageNumbers = [];
										const maxVisible = window.innerWidth < 640 ? 3 : 5;
										let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
										let endPage = Math.min(totalPages, startPage + maxVisible - 1);
										
										if (endPage - startPage + 1 < maxVisible) {
											startPage = Math.max(1, endPage - maxVisible + 1);
										}

										// Show first page if not in range
										if (startPage > 1) {
											pageNumbers.push(
												<button
													key="first"
													onClick={() => setCurrentPage(1)}
													className="hidden sm:flex items-center justify-center w-10 h-10 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all text-sm font-medium"
												>
													1
												</button>
											);
											if (startPage > 2) {
												pageNumbers.push(
													<span key="dots1" className="hidden sm:inline px-2 text-gray-400">...</span>
												);
											}
										}

										for (let i = startPage; i <= endPage; i++) {
											pageNumbers.push(
												<button
													key={i}
													onClick={() => setCurrentPage(i)}
													className={`flex items-center justify-center w-10 h-10 rounded-lg text-sm font-bold transition-all ${
														i === currentPage
															? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md scale-110'
															: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-teal-300'
													}`}
												>
													{i}
												</button>
											);
										}

										// Show last page if not in range
										if (endPage < totalPages) {
											if (endPage < totalPages - 1) {
												pageNumbers.push(
													<span key="dots2" className="hidden sm:inline px-2 text-gray-400">...</span>
												);
											}
											pageNumbers.push(
												<button
													key="last"
													onClick={() => setCurrentPage(totalPages)}
													className="hidden sm:flex items-center justify-center w-10 h-10 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all text-sm font-medium"
												>
													{totalPages}
												</button>
											);
										}

										return pageNumbers;
									})()}
								</div>

								{/* Next Button */}
								<button
									onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
									disabled={currentPage === totalPages}
									className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-medium"
									title="Halaman Selanjutnya"
								>
									<span className="hidden sm:inline text-gray-700">Next</span>
									<LuChevronRight className="w-4 h-4 text-gray-700" />
								</button>

								{/* Last Button */}
								<button
									onClick={() => setCurrentPage(totalPages)}
									disabled={currentPage === totalPages}
									className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-medium"
									title="Halaman Terakhir"
								>
									<LuChevronRight className="w-4 h-4" />
									<LuChevronRight className="w-4 h-4 -ml-3" />
								</button>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Add Modal */}
			{showAddModal && (
				<JadwalKegiatanModal
					isOpen={showAddModal}
					onClose={() => {
						setShowAddModal(false);
						resetFormData();
					}}
					onSubmit={handleCreate}
					formData={formData}
					onChange={handleFormChange}
					bidangList={bidangList}
					isEdit={false}
				/>
			)}

			{/* Edit Modal */}
			{showEditModal && selectedJadwal && (
				<JadwalKegiatanModal
					isOpen={showEditModal}
					onClose={() => {
						setShowEditModal(false);
						setSelectedJadwal(null);
						resetFormData();
					}}
					onSubmit={handleUpdate}
					formData={formData}
					onChange={handleFormChange}
					bidangList={bidangList}
					isEdit={true}
				/>
			)}

			{/* Detail Modal */}
			{showDetailModal && selectedJadwal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
						{/* Header */}
						<div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-6 rounded-t-2xl sticky top-0 z-10">
							<div className="flex items-start justify-between">
								<div className="flex-1 pr-4">
									<h2 className="text-2xl font-bold text-white mb-2">{selectedJadwal.judul}</h2>
									<p className="text-teal-100 text-sm">Detail Lengkap Jadwal Kegiatan</p>
								</div>
								<button
									onClick={() => {
										setShowDetailModal(false);
										setSelectedJadwal(null);
									}}
									className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
								>
									<LuX className="w-6 h-6 text-white" />
								</button>
							</div>
							{/* Badges in Header */}
							<div className="flex flex-wrap gap-2 mt-4">
								{getStatusBadge(selectedJadwal.status)}
								{getPriorityBadge(selectedJadwal.prioritas)}
								{selectedJadwal.kategori && selectedJadwal.kategori !== 'lainnya' && (
									<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white capitalize">
										📋 {selectedJadwal.kategori}
									</span>
								)}
							</div>
						</div>

						{/* Content */}
						<div className="p-6 space-y-6">
							{/* Time & Location Section */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								{/* Tanggal Mulai */}
								<div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-xl border border-teal-200">
									<div className="flex items-start gap-3">
										<div className="p-2.5 bg-teal-600 rounded-lg">
											<LuCalendar className="w-5 h-5 text-white" />
										</div>
										<div>
											<p className="text-xs text-teal-700 font-bold uppercase tracking-wide mb-1">Mulai</p>
											<p className="text-base font-bold text-gray-900">{formatDate(selectedJadwal.tanggal_mulai)}</p>
										</div>
									</div>
								</div>

								{/* Tanggal Selesai */}
								<div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 rounded-xl border border-cyan-200">
									<div className="flex items-start gap-3">
										<div className="p-2.5 bg-cyan-600 rounded-lg">
											<LuCalendar className="w-5 h-5 text-white" />
										</div>
										<div>
											<p className="text-xs text-cyan-700 font-bold uppercase tracking-wide mb-1">Selesai</p>
											<p className="text-base font-bold text-gray-900">{formatDate(selectedJadwal.tanggal_selesai)}</p>
										</div>
									</div>
								</div>
							</div>

							{/* Lokasi & Bidang */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								{/* Lokasi */}
								<div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
									<div className="flex items-start gap-3">
										<div className="p-2.5 bg-red-600 rounded-lg">
											<LuMapPin className="w-5 h-5 text-white" />
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-xs text-red-700 font-bold uppercase tracking-wide mb-1">Lokasi</p>
											<p className="text-sm font-semibold text-gray-900 break-words">{selectedJadwal.lokasi || '-'}</p>
										</div>
									</div>
								</div>

								{/* Bidang */}
								<div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
									<div className="flex items-start gap-3">
										<div className="p-2.5 bg-purple-600 rounded-lg">
											<LuUser className="w-5 h-5 text-white" />
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-xs text-purple-700 font-bold uppercase tracking-wide mb-1">Bidang</p>
											<p className="text-sm font-semibold text-gray-900">{selectedJadwal.bidang_nama || '-'}</p>
										</div>
									</div>
								</div>
							</div>

							{/* PIC Information */}
							{(selectedJadwal.pic_name || selectedJadwal.pic_contact) && (
								<div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
									<div className="flex items-start gap-3">
										<div className="p-2.5 bg-blue-600 rounded-lg">
											<LuPhone className="w-5 h-5 text-white" />
										</div>
										<div className="flex-1">
											<p className="text-xs text-blue-700 font-bold uppercase tracking-wide mb-2">Penanggung Jawab</p>
											{selectedJadwal.pic_name && (
												<p className="text-sm font-semibold text-gray-900 mb-1">👤 {selectedJadwal.pic_name}</p>
											)}
											{selectedJadwal.pic_contact && (
												<p className="text-sm text-gray-700">📞 {selectedJadwal.pic_contact}</p>
											)}
										</div>
									</div>
								</div>
							)}

							{/* Asal Kegiatan */}
							{selectedJadwal.asal_kegiatan && selectedJadwal.asal_kegiatan !== '-' && (
								<div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200">
									<p className="text-xs text-amber-700 font-bold uppercase tracking-wide mb-2 flex items-center gap-2">
										<span className="text-base">📤</span> Asal Kegiatan
									</p>
									<p className="text-sm text-gray-900 font-medium">{selectedJadwal.asal_kegiatan}</p>
								</div>
							)}

							{/* Deskripsi */}
							{selectedJadwal.deskripsi && selectedJadwal.deskripsi !== '-' && (
								<div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
									<p className="text-xs text-gray-700 font-bold uppercase tracking-wide mb-3 flex items-center gap-2">
										<span className="text-base">📝</span> Deskripsi Kegiatan
									</p>
									<p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{selectedJadwal.deskripsi}</p>
								</div>
							)}
						</div>

						{/* Footer */}
						<div className="bg-gray-50 p-6 rounded-b-2xl flex flex-col sm:flex-row gap-3 justify-end border-t border-gray-200">
							<button
								onClick={() => {
									setShowDetailModal(false);
									setSelectedJadwal(null);
								}}
								className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
							>
								Tutup
							</button>
							{canManageJadwal && (
								<button
									onClick={() => {
										setShowDetailModal(false);
										handleEdit(selectedJadwal);
									}}
									className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-semibold shadow-md hover:shadow-lg"
								>
									✏️ Edit Jadwal
								</button>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default JadwalKegiatanPage;

