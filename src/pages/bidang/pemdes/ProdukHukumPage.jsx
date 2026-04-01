import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	Search,
	Filter,
	RefreshCw,
	ChevronDown,
	AlertCircle,
	Loader2,
	Eye,
	FileText,
	CheckCircle,
	XCircle,
	ChevronLeft,
	ChevronRight,
	Scale,
} from 'lucide-react';
import {
	PieChart,
	Pie,
	Cell,
	ResponsiveContainer,
	Legend as RechartsLegend,
	Tooltip as RechartsTooltip,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
} from 'recharts';
import api from '../../../api';
import toast from 'react-hot-toast';

const JENIS_COLORS = ['#3b82f6', '#f59e0b', '#22c55e'];
const STATUS_COLORS = ['#22c55e', '#ef4444'];
const TAHUN_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81'];

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
	if (percent < 0.04) return null;
	const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
	const x = cx + radius * Math.cos(-midAngle * RADIAN);
	const y = cy + radius * Math.sin(-midAngle * RADIAN);
	return (
		<text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
			{`${(percent * 100).toFixed(0)}%`}
		</text>
	);
};

const ProdukHukumPage = () => {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState([]);
	const [stats, setStats] = useState(null);
	const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1, totalItems: 0 });
	const [filters, setFilters] = useState({
		search: '',
		kecamatan_id: '',
		desa_id: '',
		singkatan_jenis: '',
		tahun: '',
		status_peraturan: '',
	});
	const [kecamatanList, setKecamatanList] = useState([]);
	const [desaList, setDesaList] = useState([]);
	const [showFilters, setShowFilters] = useState(false);

	useEffect(() => {
		fetchKecamatanList();
		fetchStats();
	}, []);

	useEffect(() => {
		fetchData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pagination.page, filters]);

	useEffect(() => {
		if (filters.kecamatan_id) {
			fetchDesaByKecamatan(filters.kecamatan_id);
		} else {
			setDesaList([]);
			setFilters((prev) => ({ ...prev, desa_id: '' }));
		}
	}, [filters.kecamatan_id]);

	const fetchKecamatanList = async () => {
		try {
			const response = await api.get('/kecamatans');
			if (response.data.success) {
				setKecamatanList(response.data.data || []);
			}
		} catch (error) {
			console.error('Failed to fetch kecamatan:', error);
		}
	};

	const fetchDesaByKecamatan = async (kecamatanId) => {
		try {
			const response = await api.get(`/desas/kecamatan/${kecamatanId}`);
			if (response.data.success) {
				setDesaList(response.data.data || []);
			}
		} catch (error) {
			console.error('Failed to fetch desa:', error);
		}
	};

	const fetchStats = async () => {
		try {
			const response = await api.get('/pemdes/produk-hukum/stats');
			if (response.data.success) {
				setStats(response.data.data);
			}
		} catch (error) {
			console.error('Failed to fetch stats:', error);
		}
	};

	const fetchData = async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams();
			if (filters.search) params.append('search', filters.search);
			if (filters.kecamatan_id) params.append('kecamatan_id', filters.kecamatan_id);
			if (filters.desa_id) params.append('desa_id', filters.desa_id);
			if (filters.singkatan_jenis) params.append('singkatan_jenis', filters.singkatan_jenis);
			if (filters.tahun) params.append('tahun', filters.tahun);
			if (filters.status_peraturan) params.append('status_peraturan', filters.status_peraturan);
			params.append('page', pagination.page);
			params.append('limit', pagination.limit);

			const response = await api.get(`/pemdes/produk-hukum?${params.toString()}`);
			if (response.data.success) {
				setData(response.data.data || []);
				if (response.data.pagination) {
					setPagination((prev) => ({
						...prev,
						totalPages: response.data.pagination.totalPages || 1,
						totalItems: response.data.pagination.totalItems || 0,
					}));
				}
			}
		} catch (error) {
			console.error('Failed to fetch produk hukum:', error);
			toast.error('Gagal memuat data produk hukum');
		} finally {
			setLoading(false);
		}
	};

	const handleSearch = (e) => {
		e.preventDefault();
		setPagination((prev) => ({ ...prev, page: 1 }));
	};

	const handleFilterChange = (key, value) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
		setPagination((prev) => ({ ...prev, page: 1 }));
	};

	const resetFilters = () => {
		setFilters({ search: '', kecamatan_id: '', desa_id: '', singkatan_jenis: '', tahun: '', status_peraturan: '' });
		setPagination((prev) => ({ ...prev, page: 1 }));
	};

	const viewDetail = (item) => {
		navigate(`/pemdes/produk-hukum/${item.id}`);
	};

	const getJenisLabel = (singkatan) => {
		const map = { PERDES: 'Peraturan Desa', PERKADES: 'Peraturan Kepala Desa', SK_KADES: 'SK Kepala Desa' };
		return map[singkatan] || singkatan;
	};

	const getJenisBadgeColor = (singkatan) => {
		const map = {
			PERDES: 'bg-blue-100 text-blue-700',
			PERKADES: 'bg-amber-100 text-amber-700',
			SK_KADES: 'bg-green-100 text-green-700',
		};
		return map[singkatan] || 'bg-gray-100 text-gray-700';
	};

	return (
		<div className="min-h-screen p-8">
			{/* Header */}
			<div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-6 mb-6 text-white">
				<div className="flex items-center gap-3 mb-2">
					<Scale className="h-7 w-7" />
					<h1 className="text-2xl font-bold">Produk Hukum Desa</h1>
				</div>
				<p className="text-teal-100 mt-1">Data produk hukum dari seluruh desa</p>
			</div>

			{/* Stats Cards */}
			{stats && (
				<>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
						<div className="bg-white rounded-xl border border-gray-200 p-4">
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
									<FileText className="h-5 w-5 text-blue-600" />
								</div>
								<div>
									<p className="text-xs text-gray-500">Total Produk Hukum</p>
									<p className="text-2xl font-bold text-gray-900">{stats.total}</p>
								</div>
							</div>
						</div>
						<div className="bg-white rounded-xl border border-gray-200 p-4">
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
									<CheckCircle className="h-5 w-5 text-green-600" />
								</div>
								<div>
									<p className="text-xs text-gray-500">Berlaku</p>
									<p className="text-2xl font-bold text-green-700">{stats.berlaku}</p>
								</div>
							</div>
						</div>
						<div className="bg-white rounded-xl border border-gray-200 p-4">
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
									<XCircle className="h-5 w-5 text-red-600" />
								</div>
								<div>
									<p className="text-xs text-gray-500">Dicabut</p>
									<p className="text-2xl font-bold text-red-700">{stats.dicabut}</p>
								</div>
							</div>
						</div>
						<div className="bg-white rounded-xl border border-gray-200 p-4">
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
									<Scale className="h-5 w-5 text-purple-600" />
								</div>
								<div>
									<p className="text-xs text-gray-500">Jenis</p>
									<p className="text-2xl font-bold text-purple-700">{stats.jenis?.length || 0}</p>
								</div>
							</div>
						</div>
					</div>

					{/* Charts */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
						{/* Pie Chart - Jenis */}
						<div className="bg-white rounded-xl border border-gray-200 p-4">
							<h3 className="text-sm font-semibold text-gray-700 mb-3">Distribusi Jenis Produk Hukum</h3>
							{stats.jenis?.length > 0 ? (
								<ResponsiveContainer width="100%" height={250}>
									<PieChart>
										<Pie
											data={stats.jenis}
											cx="50%"
											cy="50%"
											outerRadius={90}
											dataKey="value"
											nameKey="name"
											labelLine={false}
											label={renderCustomLabel}
										>
											{stats.jenis.map((_, index) => (
												<Cell key={`cell-jenis-${index}`} fill={JENIS_COLORS[index % JENIS_COLORS.length]} />
											))}
										</Pie>
										<RechartsTooltip formatter={(value, name) => [value, getJenisLabel(name)]} />
										<RechartsLegend
											formatter={(value) => getJenisLabel(value)}
											wrapperStyle={{ fontSize: '12px' }}
										/>
									</PieChart>
								</ResponsiveContainer>
							) : (
								<p className="text-gray-400 text-sm text-center py-10">Tidak ada data</p>
							)}
						</div>

						{/* Doughnut Chart - Status */}
						<div className="bg-white rounded-xl border border-gray-200 p-4">
							<h3 className="text-sm font-semibold text-gray-700 mb-3">Status Peraturan</h3>
							{stats.status?.length > 0 ? (
								<ResponsiveContainer width="100%" height={250}>
									<PieChart>
										<Pie
											data={stats.status}
											cx="50%"
											cy="50%"
											innerRadius={50}
											outerRadius={90}
											dataKey="value"
											nameKey="name"
											labelLine={false}
											label={renderCustomLabel}
										>
											{stats.status.map((_, index) => (
												<Cell key={`cell-status-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
											))}
										</Pie>
										<RechartsTooltip />
										<RechartsLegend wrapperStyle={{ fontSize: '12px' }} />
									</PieChart>
								</ResponsiveContainer>
							) : (
								<p className="text-gray-400 text-sm text-center py-10">Tidak ada data</p>
							)}
						</div>

						{/* Bar Chart - Per Tahun */}
						<div className="bg-white rounded-xl border border-gray-200 p-4">
							<h3 className="text-sm font-semibold text-gray-700 mb-3">Produk Hukum per Tahun</h3>
							{stats.tahun?.length > 0 ? (
								<ResponsiveContainer width="100%" height={250}>
									<BarChart data={stats.tahun} layout="vertical">
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis type="number" allowDecimals={false} />
										<YAxis type="category" dataKey="name" width={50} tick={{ fontSize: 11 }} />
										<RechartsTooltip />
										<Bar dataKey="value" name="Jumlah" radius={[0, 4, 4, 0]}>
											{stats.tahun.map((_, index) => (
												<Cell key={`cell-tahun-${index}`} fill={TAHUN_COLORS[index % TAHUN_COLORS.length]} />
											))}
										</Bar>
									</BarChart>
								</ResponsiveContainer>
							) : (
								<p className="text-gray-400 text-sm text-center py-10">Tidak ada data</p>
							)}
						</div>
					</div>
				</>
			)}

			{/* Search & Filters */}
			<div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
				<form onSubmit={handleSearch} className="flex gap-3 mb-3">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
						<input
							type="text"
							value={filters.search}
							onChange={(e) => handleFilterChange('search', e.target.value)}
							placeholder="Cari judul, nomor, atau subjek..."
							className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
						/>
					</div>
					<button
						type="button"
						onClick={() => setShowFilters(!showFilters)}
						className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition ${
							showFilters ? 'bg-teal-50 border-teal-300 text-teal-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
						}`}
					>
						<Filter className="h-4 w-4" />
						Filter
						<ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
					</button>
					<button
						type="button"
						onClick={() => {
							resetFilters();
							fetchStats();
						}}
						className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50"
					>
						<RefreshCw className="h-4 w-4" />
						Reset
					</button>
				</form>

				{showFilters && (
					<div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-gray-200">
						<select
							value={filters.kecamatan_id}
							onChange={(e) => handleFilterChange('kecamatan_id', e.target.value)}
							className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
						>
							<option value="">Semua Kecamatan</option>
							{kecamatanList.map((k) => (
								<option key={k.id} value={k.id}>
									{k.nama}
								</option>
							))}
						</select>
						<select
							value={filters.desa_id}
							onChange={(e) => handleFilterChange('desa_id', e.target.value)}
							className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
							disabled={!filters.kecamatan_id}
						>
							<option value="">Semua Desa</option>
							{desaList.map((d) => (
								<option key={d.id} value={d.id}>
									{d.nama}
								</option>
							))}
						</select>
						<select
							value={filters.singkatan_jenis}
							onChange={(e) => handleFilterChange('singkatan_jenis', e.target.value)}
							className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
						>
							<option value="">Semua Jenis</option>
							<option value="PERDES">PERDES</option>
							<option value="PERKADES">PERKADES</option>
							<option value="SK_KADES">SK KADES</option>
						</select>
						<select
							value={filters.status_peraturan}
							onChange={(e) => handleFilterChange('status_peraturan', e.target.value)}
							className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
						>
							<option value="">Semua Status</option>
							<option value="berlaku">Berlaku</option>
							<option value="dicabut">Dicabut</option>
						</select>
						<input
							type="number"
							value={filters.tahun}
							onChange={(e) => handleFilterChange('tahun', e.target.value)}
							placeholder="Tahun"
							className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
						/>
					</div>
				)}
			</div>

			{/* Data Table */}
			<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
				<div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
					<p className="text-sm text-gray-600">
						Menampilkan <span className="font-semibold">{data.length}</span> dari{' '}
						<span className="font-semibold">{pagination.totalItems}</span> produk hukum
					</p>
				</div>

				{loading ? (
					<div className="flex items-center justify-center py-20">
						<Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
						<span className="ml-3 text-gray-500">Memuat data...</span>
					</div>
				) : data.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-20">
						<AlertCircle className="h-12 w-12 text-gray-300 mb-3" />
						<p className="text-gray-500">Tidak ada data produk hukum</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Judul</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nomor</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jenis</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tahun</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Desa</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
									<th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{data.map((item, index) => (
									<tr key={item.id} className="hover:bg-gray-50">
										<td className="px-4 py-3 text-sm text-gray-500">
											{(pagination.page - 1) * pagination.limit + index + 1}
										</td>
										<td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{item.judul}</td>
										<td className="px-4 py-3 text-sm text-gray-600">{item.nomor}</td>
										<td className="px-4 py-3">
											<span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getJenisBadgeColor(item.singkatan_jenis)}`}>
												{item.singkatan_jenis}
											</span>
										</td>
										<td className="px-4 py-3 text-sm text-gray-600">{item.tahun}</td>
										<td className="px-4 py-3 text-sm text-gray-600">
											<div>
												<p className="font-medium">{item.desa?.nama || '-'}</p>
												<p className="text-xs text-gray-400">{item.desa?.kecamatan?.nama || ''}</p>
											</div>
										</td>
										<td className="px-4 py-3">
											<span
												className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
													item.status_peraturan === 'berlaku'
														? 'bg-green-100 text-green-700'
														: 'bg-red-100 text-red-700'
												}`}
											>
												{item.status_peraturan === 'berlaku' ? 'Berlaku' : 'Dicabut'}
											</span>
										</td>
										<td className="px-4 py-3 text-center">
											<button
												onClick={() => viewDetail(item)}
												className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition"
											>
												<Eye className="h-3.5 w-3.5" />
												Detail
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				{/* Pagination */}
				{pagination.totalPages > 1 && (
					<div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
						<p className="text-sm text-gray-600">
							Halaman {pagination.page} dari {pagination.totalPages}
						</p>
						<div className="flex gap-2">
							<button
								disabled={pagination.page <= 1}
								onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
								className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<ChevronLeft className="h-4 w-4" />
								Prev
							</button>
							<button
								disabled={pagination.page >= pagination.totalPages}
								onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
								className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Next
								<ChevronRight className="h-4 w-4" />
							</button>
						</div>
					</div>
				)}
			</div>

		</div>
	);
};

export default ProdukHukumPage;
