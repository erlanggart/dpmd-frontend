// src/pages/bidang/sekretariat/JadwalKegiatanPage.jsx
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
	const [selectedJadwal, setSelectedJadwal] = useState(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [filterStatus, setFilterStatus] = useState('all');
	const [filterPrioritas, setFilterPrioritas] = useState('all');
	const [filterTanggalMulai, setFilterTanggalMulai] = useState('');
	const [filterTanggalSelesai, setFilterTanggalSelesai] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'calendar'
	const itemsPerPage = 12;

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
	});

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
				start_date: filterTanggalMulai || undefined,
				end_date: filterTanggalSelesai || undefined,
			};

			const response = await api.get('/jadwal-kegiatan', { params });
			
			setJadwals(response.data.data || []);
			setTotalPages(response.data.pagination?.totalPages || 1);
		} catch (error) {
			console.error('Error fetching jadwal:', error);
			Swal.fire('Error', 'Gagal mengambil data jadwal kegiatan', 'error');
		} finally {
			setLoading(false);
		}
	}, [currentPage, searchTerm, filterStatus, filterPrioritas, filterTanggalMulai, filterTanggalSelesai]);

	useEffect(() => {
		fetchJadwal();
	}, [fetchJadwal]);

	useEffect(() => {
		fetchBidangList();
	}, [fetchBidangList]);

	// Handle create
	const handleCreate = async (data) => {
		try {
			await api.post('/jadwal-kegiatan', data);
			Swal.fire('Berhasil', 'Jadwal kegiatan berhasil ditambahkan', 'success');
			setShowAddModal(false);
			fetchJadwal();
		} catch (error) {
			console.error('Error creating jadwal:', error);
			Swal.fire('Error', error.response?.data?.message || 'Gagal menambahkan jadwal kegiatan', 'error');
		}
	};

	// Handle update
	const handleUpdate = async (id, data) => {
		try {
			await api.put(`/jadwal-kegiatan/${id}`, data);
			Swal.fire('Berhasil', 'Jadwal kegiatan berhasil diperbarui', 'success');
			setShowEditModal(false);
			setSelectedJadwal(null);
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
		setShowEditModal(true);
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
		setFilterTanggalMulai('');
		setFilterTanggalSelesai('');
		setCurrentPage(1);
	};

	// Get status badge
	const getStatusBadge = (status) => {
		const badges = {
			draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
			scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Terjadwal' },
			ongoing: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Berlangsung' },
			completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Selesai' },
			cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Dibatalkan' }
		};
		return badges[status] || badges.draft;
	};

	// Get prioritas badge
	const getPrioritasBadge = (prioritas) => {
		const badges = {
			rendah: { bg: 'bg-green-100', text: 'text-green-700', label: 'Rendah' },
			sedang: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Sedang' },
			tinggi: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Tinggi' },
			urgent: { bg: 'bg-red-100', text: 'text-red-700', label: 'Urgent' }
		};
		return badges[prioritas] || badges.sedang;
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
								<label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Mulai</label>
								<input
									type="date"
									value={filterTanggalMulai}
									onChange={(e) => setFilterTanggalMulai(e.target.value)}
									className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Selesai</label>
								<input
									type="date"
									value={filterTanggalSelesai}
									onChange={(e) => setFilterTanggalSelesai(e.target.value)}
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
									onClick={() => setViewMode('grid')}
									className={`p-2 rounded-lg transition-colors ${
										viewMode === 'grid'
											? 'bg-teal-100 text-teal-700'
											: 'bg-gray-100 text-gray-600 hover:bg-gray-200'
									}`}
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
									const statusBadge = getStatusBadge(jadwal.status);
									const prioritasBadge = getPrioritasBadge(jadwal.prioritas);

									return (
										<div
											key={jadwal.id}
											className="bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg transition-all overflow-hidden"
										>
											<div className="p-6">
												{/* Header */}
												<div className="flex items-start justify-between mb-4">
													<div className="flex-1">
														<h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">
															{jadwal.judul}
														</h3>
														<div className="flex flex-wrap gap-2">
															<span className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
																{statusBadge.label}
															</span>
															<span className={`px-3 py-1 rounded-full text-xs font-medium ${prioritasBadge.bg} ${prioritasBadge.text}`}>
																{prioritasBadge.label}
															</span>
														</div>
													</div>
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

												{/* Actions - Only show for Sekretariat and Superadmin */}
												{canManageJadwal && (
													<div className="flex gap-2 pt-4 border-t">
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
													</div>
												)}
											</div>
										</div>
									);
								})}
							</div>
						)}

						{/* Pagination */}
						{totalPages > 1 && (
							<div className="flex items-center justify-center gap-2">
								<button
									onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
									disabled={currentPage === 1}
									className="p-2 rounded-lg bg-white border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
								>
									<LuChevronLeft className="w-5 h-5" />
								</button>

								<span className="px-4 py-2 text-sm text-gray-700">
									Halaman {currentPage} dari {totalPages}
								</span>

								<button
									onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
									disabled={currentPage === totalPages}
									className="p-2 rounded-lg bg-white border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
								>
									<LuChevronRight className="w-5 h-5" />
								</button>
							</div>
						)}
					</>
				)}
			</div>

			{/* Add Modal */}
			{showAddModal && (
				<JadwalKegiatanModal
					show={showAddModal}
					onClose={() => setShowAddModal(false)}
					onSubmit={handleCreate}
					bidangList={bidangList}
				/>
			)}

			{/* Edit Modal */}
			{showEditModal && selectedJadwal && (
				<JadwalKegiatanModal
					show={showEditModal}
					onClose={() => {
						setShowEditModal(false);
						setSelectedJadwal(null);
					}}
					onSubmit={(data) => handleUpdate(selectedJadwal.id, data)}
					initialData={selectedJadwal}
					bidangList={bidangList}
					isEdit
				/>
			)}
		</div>
	);
};

export default JadwalKegiatanPage;

