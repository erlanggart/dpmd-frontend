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
	const [showAddModal, setShowAddModal] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false);
	const [showDetailModal, setShowDetailModal] = useState(false);
	const [selectedJadwal, setSelectedJadwal] = useState(null);
	const [searchTerm, setSearchTerm] = useState('');
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
				search: searchTerm || undefined,
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
		}
	}, [currentPage, searchTerm, filterStatus, filterPrioritas, filterTanggal]);

	useEffect(() => {
		fetchJadwal();
	}, [fetchJadwal]);

	useEffect(() => {
		fetchBidangList();
	}, [fetchBidangList]);

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

	// Handle search
	const handleSearch = (e) => {
		e.preventDefault();
		setCurrentPage(1);
		fetchJadwal();
	};

	// Reset filters
	const handleResetFilters = () => {
		setSearchTerm('');
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

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-16 w-16 border-b-4 border-teal-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Memuat data...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 p-4 sm:p-6">
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<div className="mb-6">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div>
							<h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
								<div className="p-2 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl">
									<LuCalendar className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
								</div>
								Jadwal Kegiatan
							</h1>
							<p className="text-gray-600 mt-1">Kelola dan pantau jadwal kegiatan DPMD</p>
						</div>

						{/* Tambah Jadwal Button - Only for Sekretariat and Superadmin */}
						{canManageJadwal && (
							<button
								onClick={() => setShowAddModal(true)}
								className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl hover:from-teal-700 hover:to-cyan-700 font-medium shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
							>
								<LuPlus className="w-5 h-5" />
								Tambah Jadwal
							</button>
						)}
					</div>
				</div>

				{/* Search and Filters */}
				<div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
					<form onSubmit={handleSearch} className="space-y-4">
						{/* Search Bar */}
						<div className="relative">
							<LuSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
							<input
								type="text"
								placeholder="Cari jadwal kegiatan..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
							/>
						</div>

						{/* Filters */}
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
								<select
									value={filterStatus}
									onChange={(e) => setFilterStatus(e.target.value)}
									className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
								>
									<option value="all">Semua Status</option>
									<option value="draft">Draft</option>
									<option value="scheduled">Terjadwal</option>
									<option value="ongoing">Berlangsung</option>
									<option value="completed">Selesai</option>
									<option value="cancelled">Dibatalkan</option>
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Prioritas</label>
								<select
									value={filterPrioritas}
									onChange={(e) => setFilterPrioritas(e.target.value)}
									className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
								>
									<option value="all">Semua Prioritas</option>
									<option value="rendah">Rendah</option>
									<option value="sedang">Sedang</option>
									<option value="tinggi">Tinggi</option>
									<option value="urgent">Urgent</option>
								</select>
							</div>

							<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Tanggal</label>
						<input
							type="date"
							value={filterTanggal}
							onChange={(e) => setFilterTanggal(e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
						/>
					</div>
				</div>

				{/* Action Buttons */}
				<div className="flex flex-wrap gap-3">
							<button
								type="submit"
								className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors"
							>
								<LuSearch className="w-4 h-4" />
								Cari
							</button>
							<button
								type="button"
								onClick={handleResetFilters}
								className="flex items-center gap-2 px-6 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
							>
								<LuX className="w-4 h-4" />
								Reset
							</button>

							{/* View Mode Toggle */}
							<div className="ml-auto flex gap-2">
								<button
									type="button"
									onClick={() => setViewMode('table')}
									className={`p-2 rounded-lg transition-colors ${
										viewMode === 'table'
											? 'bg-teal-100 text-teal-700'
											: 'bg-gray-100 text-gray-600 hover:bg-gray-200'
									}`}
									title="Tampilan Tabel"
								>
									<LuList className="w-5 h-5" />
								</button>
								<button
									type="button"
									onClick={() => setViewMode('grid')}
									className={`p-2 rounded-lg transition-colors ${
										viewMode === 'grid'
											? 'bg-teal-100 text-teal-700'
											: 'bg-gray-100 text-gray-600 hover:bg-gray-200'
									}`}
									title="Tampilan Grid"
								>
									<LuLayoutGrid className="w-5 h-5" />
								</button>
								<button
									type="button"
									onClick={() => setViewMode('calendar')}
									className={`p-2 rounded-lg transition-colors ${
										viewMode === 'calendar'
											? 'bg-teal-100 text-teal-700'
											: 'bg-gray-100 text-gray-600 hover:bg-gray-200'
									}`}
									title="Tampilan Kalender"
								>
									<LuCalendarDays className="w-5 h-5" />
								</button>
							</div>
						</div>
					</form>
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
								<p className="text-gray-600">Tidak ada jadwal kegiatan</p>
							</div>
						) : (
							<div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
								<div className="overflow-x-auto">
									<table className="w-full">
										<thead className="bg-gradient-to-r from-teal-50 to-cyan-50">
											<tr>
												<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Judul Kegiatan</th>
												<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Tanggal</th>
												<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Lokasi</th>
												<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Bidang</th>

											<th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Aksi</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-gray-200">
											{jadwals.map((jadwal) => {

												return (
													<tr key={jadwal.id} className="hover:bg-gray-50 transition-colors">
														<td className="px-6 py-4">
															<div className="font-medium text-gray-900">{jadwal.judul}</div>
															{jadwal.deskripsi && jadwal.deskripsi !== '-' && (
																<div className="text-sm text-gray-500 mt-1 line-clamp-1">{jadwal.deskripsi}</div>
															)}
														</td>
														<td className="px-6 py-4 whitespace-nowrap">
															<div className="flex items-center gap-2 text-sm text-gray-600">
																<LuClock className="w-4 h-4 text-teal-500 flex-shrink-0" />
																<div>
																	<div>{formatDate(jadwal.tanggal_mulai)}</div>
																	<div className="text-xs text-gray-400">s/d {formatDate(jadwal.tanggal_selesai)}</div>
																</div>
															</div>
														</td>
														<td className="px-6 py-4">
															<div className="flex items-center gap-2 text-sm text-gray-600">
																<LuMapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
																<span className="line-clamp-1">{jadwal.lokasi || '-'}</span>
															</div>
														</td>
														<td className="px-6 py-4">
															<div className="flex items-center gap-2 text-sm text-gray-600">
																<LuUser className="w-4 h-4 text-purple-500 flex-shrink-0" />
																<span className="line-clamp-1">{jadwal.bidang_nama || '-'}</span>
															</div>
														</td>
														<td className="px-6 py-4">
															<div className="flex items-center justify-center gap-2">
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
								<p className="text-gray-600">Tidak ada jadwal kegiatan</p>
							</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
								{jadwals.map((jadwal) => {
										return (
											<div
												key={jadwal.id}
												className="bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg transition-all overflow-hidden"
											>
												<div className="p-6">
													{/* Header */}
													<div className="mb-4">
														<h3 className="font-bold text-lg text-gray-900 line-clamp-2">
															{jadwal.judul}
														</h3>
												</div>

												{/* Details */}
												<div className="space-y-3 mb-4">
													<div className="flex items-center gap-2 text-gray-600 text-sm">
														<LuClock className="w-4 h-4 text-teal-500" />
														<span>
															{formatDate(jadwal.tanggal_mulai)} - {formatDate(jadwal.tanggal_selesai)}
														</span>
													</div>

													{jadwal.lokasi && jadwal.lokasi !== '-' && (
														<div className="flex items-center gap-2 text-gray-600 text-sm">
															<LuMapPin className="w-4 h-4 text-red-500" />
															<span>{jadwal.lokasi}</span>
														</div>
													)}

													{jadwal.bidang_nama && (
														<div className="flex items-center gap-2 text-gray-600 text-sm">
															<LuUser className="w-4 h-4 text-purple-500" />
															<span>{jadwal.bidang_nama}</span>
														</div>
													)}
												</div>

												{/* Actions - All users can view detail; Only Sekretariat can Edit/Delete */}
												<div className="flex gap-2 pt-4 border-t">
													<button
														onClick={() => handleViewDetail(jadwal)}
														className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-50 text-teal-600 rounded-xl hover:bg-teal-100 transition-all"
													>
														<LuEye className="w-4 h-4" />
														Detail
													</button>
													{canManageJadwal && (
														<>
															<button
																onClick={() => handleEdit(jadwal)}
																className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all"
															>
																<LuPencil className="w-4 h-4" />
																Edit
															</button>
															<button
																onClick={() => handleDelete(jadwal.id)}
																className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all"
															>
																<LuTrash2 className="w-4 h-4" />
																Hapus
															</button>
														</>
													)}
												</div>
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
					<div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mt-6">
						{/* Data Info */}
						<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
							<div className="text-sm text-gray-600">
								Menampilkan <span className="font-semibold text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-semibold text-gray-900">{Math.min(currentPage * itemsPerPage, totalData)}</span> dari <span className="font-semibold text-gray-900">{totalData}</span> data
							</div>

							{/* Pagination Controls */}
							<div className="flex items-center gap-2">
								{/* Previous Button */}
								<button
									onClick={() => setCurrentPage(1)}
									disabled={currentPage === 1}
									className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
									title="Halaman Pertama"
								>
									First
								</button>
								<button
									onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
									disabled={currentPage === 1}
									className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									title="Halaman Sebelumnya"
								>
									<LuChevronLeft className="w-5 h-5 text-gray-700" />
								</button>

								{/* Page Numbers */}
								<div className="flex items-center gap-1">
									{(() => {
										const pageNumbers = [];
										const maxVisible = 5;
										let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
										let endPage = Math.min(totalPages, startPage + maxVisible - 1);
										
										if (endPage - startPage + 1 < maxVisible) {
											startPage = Math.max(1, endPage - maxVisible + 1);
										}

										for (let i = startPage; i <= endPage; i++) {
											pageNumbers.push(
												<button
													key={i}
													onClick={() => setCurrentPage(i)}
													className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
														i === currentPage
															? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md'
															: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
													}`}
												>
													{i}
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
									className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									title="Halaman Selanjutnya"
								>
									<LuChevronRight className="w-5 h-5 text-gray-700" />
								</button>
								<button
									onClick={() => setCurrentPage(totalPages)}
									disabled={currentPage === totalPages}
									className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
									title="Halaman Terakhir"
								>
									Last
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
					<div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
						{/* Header */}
						<div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-6 rounded-t-2xl">
							<div className="flex items-start justify-between">
								<div className="flex-1">
									<h2 className="text-2xl font-bold text-white mb-2">Detail Jadwal Kegiatan</h2>
									<p className="text-teal-100 text-sm">Informasi lengkap jadwal kegiatan</p>
								</div>
								<button
									onClick={() => {
										setShowDetailModal(false);
										setSelectedJadwal(null);
									}}
									className="p-2 hover:bg-white/20 rounded-lg transition-colors"
								>
									<LuX className="w-6 h-6 text-white" />
								</button>
							</div>
						</div>

						{/* Content */}
						<div className="p-6 space-y-6">
							{/* Title Section */}
							<div>
								<h3 className="text-xl font-bold text-gray-900">{selectedJadwal.judul}</h3>
							</div>

							{/* Details Grid */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{/* Tanggal Mulai */}
								<div className="bg-teal-50 p-4 rounded-xl">
									<div className="flex items-center gap-3">
										<div className="p-2 bg-teal-100 rounded-lg">
											<LuCalendar className="w-5 h-5 text-teal-600" />
										</div>
										<div>
											<p className="text-xs text-gray-600 font-medium">Tanggal Mulai</p>
											<p className="text-sm font-bold text-gray-900">{formatDate(selectedJadwal.tanggal_mulai)}</p>
										</div>
									</div>
								</div>

								{/* Tanggal Selesai */}
								<div className="bg-cyan-50 p-4 rounded-xl">
									<div className="flex items-center gap-3">
										<div className="p-2 bg-cyan-100 rounded-lg">
											<LuCalendar className="w-5 h-5 text-cyan-600" />
										</div>
										<div>
											<p className="text-xs text-gray-600 font-medium">Tanggal Selesai</p>
											<p className="text-sm font-bold text-gray-900">{formatDate(selectedJadwal.tanggal_selesai)}</p>
										</div>
									</div>
								</div>

								{/* Lokasi */}
								<div className="bg-red-50 p-4 rounded-xl">
									<div className="flex items-center gap-3">
										<div className="p-2 bg-red-100 rounded-lg">
											<LuMapPin className="w-5 h-5 text-red-600" />
										</div>
										<div>
											<p className="text-xs text-gray-600 font-medium">Lokasi</p>
											<p className="text-sm font-bold text-gray-900">{selectedJadwal.lokasi || '-'}</p>
										</div>
									</div>
								</div>

								{/* Bidang */}
								<div className="bg-purple-50 p-4 rounded-xl">
									<div className="flex items-center gap-3">
										<div className="p-2 bg-purple-100 rounded-lg">
											<LuUser className="w-5 h-5 text-purple-600" />
										</div>
										<div>
											<p className="text-xs text-gray-600 font-medium">Bidang</p>
											<p className="text-sm font-bold text-gray-900">{selectedJadwal.bidang_nama || '-'}</p>
										</div>
									</div>
								</div>
							</div>

							{/* Asal Kegiatan */}
							{selectedJadwal.asal_kegiatan && selectedJadwal.asal_kegiatan !== '-' && (
								<div className="bg-gray-50 p-4 rounded-xl">
									<p className="text-xs text-gray-600 font-medium mb-2">Asal Kegiatan</p>
									<p className="text-sm text-gray-900">{selectedJadwal.asal_kegiatan}</p>
								</div>
							)}

							{/* Deskripsi */}
							{selectedJadwal.deskripsi && selectedJadwal.deskripsi !== '-' && (
								<div className="bg-gray-50 p-4 rounded-xl">
									<p className="text-xs text-gray-600 font-medium mb-2">Deskripsi</p>
									<p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedJadwal.deskripsi}</p>
								</div>
							)}

							{/* Kategori */}
							<div className="bg-blue-50 p-4 rounded-xl">
								<p className="text-xs text-gray-600 font-medium mb-2">Kategori</p>
								<p className="text-sm font-semibold text-blue-900 capitalize">{selectedJadwal.kategori || 'lainnya'}</p>
							</div>
						</div>

						{/* Footer */}
						<div className="bg-gray-50 p-6 rounded-b-2xl flex gap-3 justify-end">
							<button
								onClick={() => {
									setShowDetailModal(false);
									setSelectedJadwal(null);
								}}
								className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
							>
								Tutup
							</button>
							{canManageJadwal && (
								<button
									onClick={() => {
										setShowDetailModal(false);
										handleEdit(selectedJadwal);
									}}
									className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-medium shadow-md"
								>
									Edit Jadwal
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

