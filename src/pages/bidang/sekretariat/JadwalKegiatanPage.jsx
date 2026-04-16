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
	LuEye,
	LuShare2,
	LuSmile,
	LuHeart,
	LuMessageCircle,
	LuSend,
} from 'react-icons/lu';
import { useSearchParams } from 'react-router-dom';
import api from '../../../api';
import Swal from 'sweetalert2';
import JadwalKegiatanModal, { singkatBidang } from '../../../components/JadwalKegiatanModal';
import JadwalKalenderView from '../../../components/JadwalKalenderView';

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '👏', '💪', '✨'];

const JadwalKegiatanPage = () => {
	const [searchParams] = useSearchParams();
	// Get user from localStorage
	const user = JSON.parse(localStorage.getItem('user') || '{}');
	
	// Check if user can manage jadwal (Sekretariat or Superadmin)
	const canManageJadwal = Number(user?.bidang_id) === 2 || user?.role === 'superadmin';

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

	// Cek URL query param ?tanggal= (dari klik notifikasi)
	const getInitialDate = () => {
		const params = new URLSearchParams(window.location.search);
		const tanggal = params.get('tanggal');
		return tanggal && /^\d{4}-\d{2}-\d{2}$/.test(tanggal) ? tanggal : getTodayDate();
	};
	
	const [filterTanggal, setFilterTanggal] = useState(getInitialDate());
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalData, setTotalData] = useState(0);
	
	// Default view: grid (table view removed)
	const getDefaultViewMode = () => 'grid';
	
	const [viewMode, setViewMode] = useState(getDefaultViewMode()); // 'grid' or 'calendar'
	const [showMobileFilters, setShowMobileFilters] = useState(false); // Toggle filter visibility on mobile
	const [showViewersModal, setShowViewersModal] = useState(false);
	const [viewersList, setViewersList] = useState([]);
	const [viewersJadwalId, setViewersJadwalId] = useState(null);
	const [showEmojiPicker, setShowEmojiPicker] = useState(null); // jadwal id or null
	const [comments, setComments] = useState([]);
	const [commentText, setCommentText] = useState('');
	const [loadingComments, setLoadingComments] = useState(false);
	const [sendingComment, setSendingComment] = useState(false);
	const itemsPerPage = 5;

	// Form state
	const [formData, setFormData] = useState({
		judul: '',
		deskripsi: '-',
		bidang_id: '',
		tanggal_mulai: '',
		tanggal_selesai: '',
		jam: '08:00',
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

	// Handle bidang multi-select change
	const handleBidangChange = (ids) => {
		setFormData(prev => ({ ...prev, bidang_ids: ids }));
	};

	// Reset form data
	const resetFormData = () => {
		setFormData({
			judul: '',
			deskripsi: '-',
			bidang_id: '',
			tanggal_mulai: '',
			tanggal_selesai: '',
			jam: '08:00',
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

	// Saat navigasi dari notifikasi (React Router), update filter tanggal dari URL
	useEffect(() => {
		const tanggal = searchParams.get('tanggal');
		if (tanggal && /^\d{4}-\d{2}-\d{2}$/.test(tanggal) && tanggal !== filterTanggal) {
			setFilterTanggal(tanggal);
		}
	}, [searchParams]);

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
			const combinedMulai = formData.tanggal_mulai
				? `${formData.tanggal_mulai}T${formData.jam || '00:00'}:00`
				: '';
			const { jam, ...restForm } = formData;
			const dataToSend = {
				...restForm,
				tanggal_mulai: combinedMulai,
				bidang_ids: formData.bidang_ids || [],
			};
			const res = await api.post('/jadwal-kegiatan', dataToSend);
			const newId = res.data?.data?.id;
			setShowAddModal(false);
			// Pindah filter ke tanggal jadwal baru agar langsung terlihat
			if (formData.tanggal_mulai) {
				setFilterTanggal(formData.tanggal_mulai);
			}
			// Selalu refresh list—jika tanggal filter tidak berubah, setFilterTanggal tidak memicu refetch
			fetchJadwal();

			// Format tanggal untuk pesan WA
			const fmtTgl = (dt) => {
				if (!dt) return '-';
				return new Date(dt).toLocaleString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
			};
			const appUrl = `${window.location.origin}/sekretariat/jadwal-kegiatan${newId ? `?highlight=${newId}` : ''}`;
			const waText = [
				`📅 *JADWAL KEGIATAN BARU*`,
				``,
				`📌 *${formData.judul}*`,
				formData.lokasi ? `📍 Lokasi: ${formData.lokasi}` : '',
				`🕐 Mulai: ${fmtTgl(combinedMulai)}`,
				`🕑 Selesai: ${fmtTgl(formData.tanggal_selesai)}`,
				formData.asal_kegiatan ? `🏛️ Asal: ${formData.asal_kegiatan}` : '',
				formData.pic_name ? `👤 PIC: ${formData.pic_name}${formData.pic_contact ? ` (${formData.pic_contact})` : ''}` : '',
				``,
				`🔗 Buka di Aplikasi DPMD:`,
				appUrl,
			].filter(Boolean).join('\n');

			const waUrl = `https://wa.me/?text=${encodeURIComponent(waText)}`;

			await Swal.fire({
				icon: 'success',
				title: 'Berhasil!',
				html: `
					<p class="text-gray-600 mb-4">Jadwal kegiatan berhasil ditambahkan</p>
					<a href="${waUrl}" target="_blank" rel="noopener noreferrer"
						class="inline-flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold text-sm transition-all shadow-md hover:shadow-lg"
						style="text-decoration:none">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
						Share ke WhatsApp
					</a>
				`,
				showConfirmButton: true,
				confirmButtonText: 'Tutup',
				confirmButtonColor: '#6366f1',
			});

			resetFormData();
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
			const combinedMulai = formData.tanggal_mulai
				? `${formData.tanggal_mulai}T${formData.jam || '00:00'}:00`
				: '';
			const { jam, ...restForm } = formData;
			const dataToSend = {
				...restForm,
				tanggal_mulai: combinedMulai,
				bidang_ids: formData.bidang_ids || [],
			};
			await api.put(`/jadwal-kegiatan/${selectedJadwal.id}`, dataToSend);
			setShowEditModal(false);
			setSelectedJadwal(null);
			// Pindah filter ke tanggal jadwal yang diedit
			if (formData.tanggal_mulai) {
				setFilterTanggal(formData.tanggal_mulai);
			}
			resetFormData();
			// Selalu refresh list—jika tanggal filter tidak berubah, setFilterTanggal tidak memicu refetch
			fetchJadwal();
			Swal.fire('Berhasil', 'Jadwal kegiatan berhasil diperbarui', 'success');
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
		const formatDateOnly = (dateString) => {
			if (!dateString) return '';
			const date = new Date(dateString);
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			return `${year}-${month}-${day}`;
		};
		const formatTimeOnly = (dateString) => {
			if (!dateString) return '08:00';
			const date = new Date(dateString);
			return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
		};
		
		setFormData({
			judul: jadwal.judul || '',
			deskripsi: jadwal.deskripsi || '-',
			bidang_ids: jadwal.bidang_ids?.map(Number) || (jadwal.bidang_id ? [Number(jadwal.bidang_id)] : []),
			tanggal_mulai: formatDateOnly(jadwal.tanggal_mulai),
			tanggal_selesai: formatDateOnly(jadwal.tanggal_selesai),
			jam: formatTimeOnly(jadwal.tanggal_mulai),
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
		setComments([]);
		setCommentText('');
		trackView(jadwal.id);
		loadComments(jadwal.id);
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

	// Track view when detail modal opens
	const trackView = useCallback(async (jadwalId) => {
		try {
			const res = await api.post(`/jadwal-kegiatan/${jadwalId}/view`);
			if (res.data.success) {
				setJadwals(prev => prev.map(j => j.id === jadwalId ? { ...j, view_count: res.data.data.view_count } : j));
			}
		} catch (error) {
			console.error('Error tracking view:', error);
		}
	}, []);

	// Open viewers modal
	const openViewers = useCallback(async (jadwalId) => {
		try {
			setViewersJadwalId(jadwalId);
			setShowViewersModal(true);
			const res = await api.get(`/jadwal-kegiatan/${jadwalId}/viewers`);
			if (res.data.success) setViewersList(res.data.data);
		} catch (error) {
			console.error('Error loading viewers:', error);
		}
	}, []);

	// Toggle emoji reaction
	const toggleReaction = useCallback(async (jadwalId, emoji) => {
		try {
			const jadwal = jadwals.find(j => j.id === jadwalId);
			const existing = jadwal?.reactions?.find(r => r.emoji === emoji && r.reacted);
			
			let res;
			if (existing) {
				res = await api.delete(`/jadwal-kegiatan/${jadwalId}/reactions`, { data: { emoji } });
			} else {
				res = await api.post(`/jadwal-kegiatan/${jadwalId}/reactions`, { emoji });
			}
			
			if (res.data.success) {
				const userId = JSON.parse(localStorage.getItem('user') || '{}').id;
				const updatedReactions = res.data.data.map(r => ({
					...r, reacted: r.users.some(u => String(u.id) === String(userId))
				}));
				setJadwals(prev => prev.map(j => j.id === jadwalId ? { ...j, reactions: updatedReactions } : j));
				setSelectedJadwal(prev => prev && prev.id === jadwalId ? { ...prev, reactions: updatedReactions } : prev);
			}
			setShowEmojiPicker(null);
		} catch (error) {
			console.error('Error toggling reaction:', error);
		}
	}, [jadwals]);

	// ── Comments ────────────────────────────────────────────
	const loadComments = useCallback(async (jadwalId) => {
		setLoadingComments(true);
		try {
			const res = await api.get(`/jadwal-kegiatan/${jadwalId}/comments`);
			if (res.data.success) setComments(res.data.data);
		} catch (error) { console.error('Error loading comments:', error); }
		finally { setLoadingComments(false); }
	}, []);

	const addComment = useCallback(async (jadwalId) => {
		if (!commentText.trim() || sendingComment) return;
		setSendingComment(true);
		try {
			const res = await api.post(`/jadwal-kegiatan/${jadwalId}/comments`, { content: commentText.trim() });
			if (res.data.success) {
				setComments(prev => [...prev, res.data.data]);
				setCommentText('');
			}
		} catch (error) { console.error('Error adding comment:', error); }
		finally { setSendingComment(false); }
	}, [commentText, sendingComment]);

	const deleteComment = useCallback(async (jadwalId, commentId) => {
		try {
			const res = await api.delete(`/jadwal-kegiatan/${jadwalId}/comments/${commentId}`);
			if (res.data.success) setComments(prev => prev.filter(c => c.id !== commentId));
		} catch (error) { console.error('Error deleting comment:', error); }
	}, []);

	// Format date
	const formatDate = (dateString) => {
		const date = new Date(dateString);
		return date.toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	};

	const formatTime = (dateString) => {
		if (!dateString) return '';
		const date = new Date(dateString);
		const h = date.getHours();
		const m = date.getMinutes();
		return `${String(h).padStart(2, '0')}.${String(m).padStart(2, '0')}`;
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

							<div className="flex items-center gap-2">
								{/* Share Jadwal Harian Button */}
								<button
									onClick={() => {
										const shareDate = filterTanggal || getTodayDate();
										const publicUrl = `${window.location.origin}/dpmd/jadwal-kegiatan?tanggal=${shareDate}`;
										const fmtDate = new Date(shareDate + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
										const waText = [
											`📅 *JADWAL KEGIATAN DPMD*`,
											`📆 ${fmtDate}`,
											``,
											`🔗 Lihat selengkapnya:`,
											publicUrl,
										].join('\n');
										const waUrl = `https://wa.me/?text=${encodeURIComponent(waText)}`;

										Swal.fire({
											title: 'Bagikan Jadwal Harian',
											html: `
												<p class="text-gray-600 mb-2 text-sm">Jadwal kegiatan tanggal:</p>
												<p class="font-semibold text-gray-800 mb-4">${fmtDate}</p>
												<div class="bg-gray-50 rounded-lg p-3 mb-4">
													<p class="text-xs text-gray-500 mb-1">Link jadwal:</p>
													<p class="text-sm text-teal-700 font-mono break-all">${publicUrl}</p>
												</div>
												<div class="flex flex-col sm:flex-row gap-2 justify-center">
													<button id="swal-copy-link" class="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm transition-all">
														📋 Salin Link
													</button>
													<a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold text-sm transition-all" style="text-decoration:none">
														💬 Share WhatsApp
													</a>
												</div>
											`,
											showConfirmButton: true,
											confirmButtonText: 'Tutup',
											confirmButtonColor: '#6366f1',
											didOpen: () => {
												const copyBtn = document.getElementById('swal-copy-link');
												if (copyBtn) {
													copyBtn.addEventListener('click', () => {
														navigator.clipboard.writeText(publicUrl);
														copyBtn.innerHTML = '✅ Tersalin!';
														setTimeout(() => { copyBtn.innerHTML = '📋 Salin Link'; }, 2000);
													});
												}
											}
										});
									}}
									className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-teal-200 text-teal-700 rounded-xl hover:bg-teal-50 hover:border-teal-300 font-semibold shadow-sm hover:shadow transition-all"
									title="Bagikan jadwal kegiatan hari ini"
								>
									<LuShare2 className="w-5 h-5" />
									<span className="hidden sm:inline">Bagikan Harian</span>
								</button>

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
														<p className="text-xs text-indigo-600 font-semibold">{formatTime(jadwal.tanggal_mulai)}</p>
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
								{(jadwal.bidang_names?.length > 0 || jadwal.bidang_nama) && (
									<div className="flex items-start gap-2.5 text-sm">
										<div className="p-1.5 bg-purple-100 rounded-lg flex-shrink-0">
											<LuUser className="w-4 h-4 text-purple-600" />
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-xs text-gray-500 font-medium">Bidang</p>
											<div className="flex flex-wrap gap-1 mt-0.5">
												{(jadwal.bidang_names?.length > 0 ? jadwal.bidang_names : [jadwal.bidang_nama]).map((n, i) => (
													<span key={i} title={n} className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">{singkatBidang(n)}</span>
												))}
											</div>
										</div>
									</div>
								)}

												{/* Deskripsi Preview */}
												{jadwal.deskripsi && jadwal.deskripsi !== '-' && (
													<div className="pt-2 border-t border-gray-100">
														<p className="text-xs text-gray-500 line-clamp-2">{jadwal.deskripsi}</p>
													</div>
												)}

												{/* Reactions & Views Bar */}
												<div className="pt-2 border-t border-gray-100">
													<div className="flex items-center justify-between gap-2">
														<div className="flex items-center gap-1 flex-wrap">
															{(jadwal.reactions || []).map(r => (
																<div key={r.emoji} className="relative group">
																	<button onClick={() => toggleReaction(jadwal.id, r.emoji)}
																		className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-all ${
																			r.reacted ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
																		}`}>
																		<span>{r.emoji}</span>
																		<span className="font-medium">{r.count}</span>
																	</button>
																	{r.users?.length > 0 && (
																		<div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-50 min-w-max">
																			<div className="bg-gray-800 text-white text-[10px] rounded-lg px-2 py-1 shadow-lg">
																				{r.users.map(u => (
																					<div key={u.id} className="whitespace-nowrap">{u.name}</div>
																				))}
																				<div className="absolute top-full left-2 w-0 h-0 border-l-[3px] border-r-[3px] border-t-[3px] border-l-transparent border-r-transparent border-t-gray-800" />
																			</div>
																		</div>
																	)}
																</div>
															))}
															<div className="relative">
																<button onClick={() => setShowEmojiPicker(showEmojiPicker === jadwal.id ? null : jadwal.id)}
																	className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors" title="Tambah reaksi">
																	<LuSmile className="w-3.5 h-3.5" />
																</button>
																{showEmojiPicker === jadwal.id && (
																	<div className="absolute bottom-full left-0 mb-1 bg-white rounded-xl shadow-lg border border-gray-200 p-2 flex gap-1 z-50">
																		{QUICK_EMOJIS.map(e => (
																			<button key={e} onClick={() => toggleReaction(jadwal.id, e)}
																				className="hover:bg-gray-100 rounded-lg p-1.5 text-base transition-colors">{e}</button>
																		))}
																	</div>
																)}
															</div>
														</div>
														{jadwal.view_count > 0 && (
															<button onClick={() => openViewers(jadwal.id)}
																className="flex items-center gap-1 text-xs text-gray-400 hover:text-teal-600 transition-colors flex-shrink-0">
																<LuEye className="w-3.5 h-3.5" />
																<span>{jadwal.view_count}</span>
															</button>
														)}
													</div>
												</div>
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
					onBidangChange={handleBidangChange}
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
					onBidangChange={handleBidangChange}
					bidangList={bidangList}
					isEdit={true}
				/>
			)}

			{/* Detail Modal */}
			{showDetailModal && selectedJadwal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
						{/* Header */}
						<div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-4 sm:p-6 rounded-t-2xl sticky top-0 z-10">
							<div className="flex items-start justify-between">
								<div className="flex-1 pr-4 min-w-0">
									<h2 className="text-base sm:text-xl md:text-2xl font-bold text-white mb-1 sm:mb-2 break-words leading-snug">{selectedJadwal.judul}</h2>
									<p className="text-teal-100 text-xs sm:text-sm">Detail Lengkap Jadwal Kegiatan</p>
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
											<p className="text-sm font-bold text-indigo-600">{formatTime(selectedJadwal.tanggal_mulai)}</p>
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
											<p className="text-xs text-purple-700 font-bold uppercase tracking-wide mb-1">Bidang Pelaksana</p>
											<div className="flex flex-wrap gap-1.5 mt-0.5">
												{(selectedJadwal.bidang_names?.length > 0 ? selectedJadwal.bidang_names : selectedJadwal.bidang_nama ? [selectedJadwal.bidang_nama] : []).map((n, i) => (
													<span key={i} title={n} className="inline-block px-2.5 py-0.5 bg-purple-200 text-purple-800 rounded-full text-xs font-bold">{singkatBidang(n)}</span>
												))}
												{(!selectedJadwal.bidang_names?.length && !selectedJadwal.bidang_nama) && <span className="text-sm font-semibold text-gray-500">Semua Pegawai</span>}
											</div>
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

						{/* Reactions with user names */}
						<div className="px-6 py-4 border-t border-gray-100">
							<div className="flex items-center gap-2 flex-wrap">
								{(selectedJadwal.reactions || []).map(r => (
									<div key={r.emoji} className="relative group">
										<button onClick={() => toggleReaction(selectedJadwal.id, r.emoji)}
											className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-sm border transition-all ${
												r.reacted ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
											}`}>
											<span>{r.emoji}</span>
											<span className="font-semibold">{r.count}</span>
										</button>
										{r.users?.length > 0 && (
											<div className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block z-50 min-w-max">
												<div className="bg-gray-800 text-white text-xs rounded-lg px-2.5 py-1.5 shadow-lg">
													{r.users.map(u => (
														<div key={u.id} className="whitespace-nowrap">{u.name}</div>
													))}
													<div className="absolute top-full left-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800" />
												</div>
											</div>
										)}
									</div>
								))}
								{QUICK_EMOJIS.filter(e => !(selectedJadwal.reactions || []).some(r => r.emoji === e)).slice(0, 3).map(e => (
									<button key={e} onClick={() => toggleReaction(selectedJadwal.id, e)}
										className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-sm border border-dashed border-gray-300 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all">
										<span>{e}</span>
									</button>
								))}
								{selectedJadwal.view_count > 0 && (
									<button onClick={() => openViewers(selectedJadwal.id)}
										className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-teal-600 ml-auto transition-colors">
										<LuEye className="w-4 h-4" /><span>{selectedJadwal.view_count} dilihat</span>
									</button>
								)}
							</div>
							{/* Show who reacted */}
							{(selectedJadwal.reactions || []).some(r => r.users?.length > 0) && (
								<div className="mt-2 flex flex-wrap gap-1 text-xs text-gray-500">
									{(() => {
										const allReactors = [];
										const seen = new Set();
										for (const r of (selectedJadwal.reactions || [])) {
											for (const u of (r.users || [])) {
												if (!seen.has(u.id)) { seen.add(u.id); allReactors.push(u); }
											}
										}
										const display = allReactors.slice(0, 5);
										const remaining = allReactors.length - display.length;
										return (
											<span>
												{display.map(u => u.name).join(', ')}
												{remaining > 0 && ` dan ${remaining} lainnya`}
												{' '}mereaksi
											</span>
										);
									})()}
								</div>
							)}
						</div>

						{/* Comments Section */}
						<div className="px-6 py-4 border-t border-gray-100">
							<p className="text-xs text-gray-700 font-bold uppercase tracking-wide mb-3 flex items-center gap-2">
								<LuMessageCircle className="w-4 h-4 text-teal-500" />
								Komentar ({comments.length})
							</p>
							
							{/* Comment list */}
							<div className="space-y-3 max-h-60 overflow-y-auto mb-3">
								{loadingComments ? (
									<div className="text-center py-4 text-gray-400 text-sm">Memuat komentar...</div>
								) : comments.length === 0 ? (
									<div className="text-center py-4 text-gray-400 text-sm">Belum ada komentar</div>
								) : comments.map(c => (
									<div key={c.id} className="flex gap-2.5">
										<div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
											{c.user?.name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || '?'}
										</div>
										<div className="flex-1 min-w-0">
											<div className="bg-gray-50 rounded-xl px-3 py-2">
												<div className="flex items-center gap-2 mb-0.5">
													<span className="text-xs font-bold text-gray-800">{c.user?.name || 'Unknown'}</span>
													<span className="text-[10px] text-gray-400">
														{c.created_at ? new Date(c.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
													</span>
													{(String(c.user?.id) === String(user?.id) || user?.role === 'superadmin') && (
														<button onClick={() => deleteComment(selectedJadwal.id, c.id)}
															className="ml-auto text-gray-300 hover:text-red-500 transition-colors">
															<LuTrash2 className="w-3 h-3" />
														</button>
													)}
												</div>
												<p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{c.content}</p>
											</div>
										</div>
									</div>
								))}
							</div>

							{/* Add comment input */}
							<div className="flex gap-2">
								<input
									type="text"
									value={commentText}
									onChange={e => setCommentText(e.target.value)}
									onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(selectedJadwal.id); } }}
									placeholder="Tulis komentar..."
									className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
									maxLength={2000}
								/>
								<button
									onClick={() => addComment(selectedJadwal.id)}
									disabled={!commentText.trim() || sendingComment}
									className="px-3 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors flex-shrink-0"
								>
									<LuSend className="w-4 h-4" />
								</button>
							</div>
						</div>

						{/* Footer */}
						<div className="bg-gray-50 p-6 rounded-b-2xl flex flex-col sm:flex-row gap-3 justify-end border-t border-gray-200">
							<div className="flex gap-3 flex-shrink-0">
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
				</div>
			)}

			{/* Viewers Modal */}
			{showViewersModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowViewersModal(false)}>
					<div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[70vh] overflow-hidden" onClick={e => e.stopPropagation()}>
						<div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-5 py-4 flex items-center justify-between">
							<div className="flex items-center gap-2 text-white">
								<LuEye className="w-5 h-5" />
								<h3 className="font-bold text-lg">Dilihat oleh</h3>
								<span className="bg-white/20 rounded-full px-2 py-0.5 text-sm">{viewersList.length}</span>
							</div>
							<button onClick={() => setShowViewersModal(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
								<LuX className="w-5 h-5 text-white" />
							</button>
						</div>
						<div className="overflow-y-auto max-h-[50vh] divide-y divide-gray-100">
							{viewersList.length === 0 ? (
								<div className="text-center py-10 text-gray-400 text-sm">Belum ada yang melihat</div>
							) : viewersList.map(v => (
								<div key={v.id} className="flex items-center gap-3 px-5 py-3">
									<div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
										{v.name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-semibold text-gray-800 truncate">{v.name}</p>
										<p className="text-xs text-gray-400">{v.role} · {v.viewed_at ? new Date(v.viewed_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</p>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default JadwalKegiatanPage;
