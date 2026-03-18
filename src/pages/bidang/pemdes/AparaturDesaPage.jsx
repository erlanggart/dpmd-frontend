import React, { useState, useEffect } from 'react';
import { 
Users, 
Search, 
Filter, 
RefreshCw, 
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
Database,
Globe,
FileText,
Shield
} from 'lucide-react';
import {
	BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
	PieChart, Pie, Cell, ResponsiveContainer, Legend as RechartsLegend
} from 'recharts';
import api from '../../../api';
import toast from 'react-hot-toast';

const GENDER_COLORS = ['#3b82f6', '#ec4899'];
const AGE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'];
const EDUCATION_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#0ea5e9', '#8b5cf6', '#a855f7', '#6366f1'];

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

// ============================================================
// Tab: Database Lokal
// ============================================================
const DatabaseTab = () => {
const [loading, setLoading] = useState(true);
const [data, setData] = useState([]);
const [stats, setStats] = useState(null);
const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1, totalItems: 0 });
const [filters, setFilters] = useState({ search: '', kecamatan_id: '', desa_id: '', jabatan: '', jenis_kelamin: '', status: '' });
const [kecamatanList, setKecamatanList] = useState([]);
const [desaList, setDesaList] = useState([]);
const [showFilters, setShowFilters] = useState(false);
const [selectedAparatur, setSelectedAparatur] = useState(null);
const [showDetail, setShowDetail] = useState(false);

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
setFilters(prev => ({ ...prev, desa_id: '' }));
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
const response = await api.get('/pemdes/aparatur-desa/stats');
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
if (filters.jabatan) params.append('jabatan', filters.jabatan);
if (filters.jenis_kelamin) params.append('jenis_kelamin', filters.jenis_kelamin);
if (filters.status) params.append('status', filters.status);
params.append('page', pagination.page);
params.append('limit', pagination.limit);

const response = await api.get(`/pemdes/aparatur-desa?${params.toString()}`);
if (response.data.success) {
setData(response.data.data || []);
if (response.data.meta) {
setPagination(prev => ({
...prev,
totalPages: response.data.meta.totalPages || 1,
totalItems: response.data.meta.totalItems || 0
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
};

const handleFilterChange = (key, value) => {
setFilters(prev => ({ ...prev, [key]: value }));
setPagination(prev => ({ ...prev, page: 1 }));
};

const resetFilters = () => {
setFilters({ search: '', kecamatan_id: '', desa_id: '', jabatan: '', jenis_kelamin: '', status: '' });
setPagination(prev => ({ ...prev, page: 1 }));
};

const viewDetail = (aparatur) => {
setSelectedAparatur(aparatur);
setShowDetail(true);
};

const formatDate = (dateStr) => {
if (!dateStr) return '-';
return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

return (
<>
{/* Stats Cards */}
{stats && (
<>
{/* Summary Cards - Pemdes vs BPD */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
<div className="bg-white rounded-xl border border-gray-200 p-4">
<div className="flex items-center gap-3">
<div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
<Users className="h-5 w-5 text-blue-600" />
</div>
<div>
<p className="text-xs text-gray-500">Total Aparatur</p>
<p className="text-2xl font-bold text-gray-900">{stats.total}</p>
</div>
</div>
</div>
<div className="bg-white rounded-xl border border-gray-200 p-4">
<div className="flex items-center gap-3">
<div className="h-10 w-10 bg-teal-100 rounded-lg flex items-center justify-center">
<Briefcase className="h-5 w-5 text-teal-600" />
</div>
<div>
<p className="text-xs text-gray-500">Perangkat Desa</p>
<p className="text-2xl font-bold text-teal-700">{stats.total_pemdes ?? '-'}</p>
</div>
</div>
</div>
<div className="bg-white rounded-xl border border-gray-200 p-4">
<div className="flex items-center gap-3">
<div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
<Shield className="h-5 w-5 text-purple-600" />
</div>
<div>
<p className="text-xs text-gray-500">BPD</p>
<p className="text-2xl font-bold text-purple-700">{stats.total_bpd ?? '-'}</p>
</div>
</div>
</div>
<div className="bg-white rounded-xl border border-gray-200 p-4">
<div className="flex items-center gap-3">
<div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
<CheckCircle className="h-5 w-5 text-green-600" />
</div>
<div>
<p className="text-xs text-gray-500">Aktif / Tidak Aktif</p>
<p className="text-2xl font-bold text-green-700">{stats.aktif} <span className="text-sm font-normal text-red-500">/ {stats.tidak_aktif}</span></p>
</div>
</div>
</div>
</div>

{/* Charts Row */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
{/* 1. Rentang Usia - Horizontal Bar Chart */}
<div className="bg-white rounded-xl border border-gray-200 p-5">
<h3 className="text-sm font-semibold text-gray-700 mb-4">Rentang Usia Aparatur</h3>
{stats.rentang_usia && stats.rentang_usia.length > 0 ? (
<ResponsiveContainer width="100%" height={220}>
<BarChart data={stats.rentang_usia} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
<CartesianGrid strokeDasharray="3 3" horizontal={false} />
<XAxis type="number" fontSize={12} />
<YAxis type="category" dataKey="name" fontSize={12} width={45} />
<RechartsTooltip formatter={(value) => [`${value} orang`, 'Jumlah']} />
<Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
{stats.rentang_usia.map((_, index) => (
<Cell key={`age-${index}`} fill={AGE_COLORS[index % AGE_COLORS.length]} />
))}
</Bar>
</BarChart>
</ResponsiveContainer>
) : <p className="text-sm text-gray-400 text-center py-10">Belum ada data</p>}
</div>

{/* 2. Pendidikan - Pie Chart */}
<div className="bg-white rounded-xl border border-gray-200 p-5">
<h3 className="text-sm font-semibold text-gray-700 mb-4">Pendidikan Aparatur</h3>
{stats.pendidikan && stats.pendidikan.length > 0 ? (
<ResponsiveContainer width="100%" height={220}>
<PieChart>
<Pie data={stats.pendidikan} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={renderCustomLabel} labelLine={false}>
{stats.pendidikan.map((_, index) => (
<Cell key={`edu-${index}`} fill={EDUCATION_COLORS[index % EDUCATION_COLORS.length]} />
))}
</Pie>
<RechartsTooltip formatter={(value, name) => [`${value} orang`, name]} />
<RechartsLegend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
</PieChart>
</ResponsiveContainer>
) : <p className="text-sm text-gray-400 text-center py-10">Belum ada data</p>}
</div>

{/* 3. Jenis Kelamin - Doughnut Chart */}
<div className="bg-white rounded-xl border border-gray-200 p-5">
<h3 className="text-sm font-semibold text-gray-700 mb-4">Jenis Kelamin Aparatur</h3>
{(stats.laki_laki > 0 || stats.perempuan > 0) ? (
<ResponsiveContainer width="100%" height={220}>
<PieChart>
<Pie
data={[{ name: 'Laki-laki', value: stats.laki_laki }, { name: 'Perempuan', value: stats.perempuan }]}
cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={renderCustomLabel} labelLine={false}
>
{GENDER_COLORS.map((color, index) => (
<Cell key={`gender-${index}`} fill={color} />
))}
</Pie>
<RechartsTooltip formatter={(value, name) => [`${value} orang`, name]} />
<RechartsLegend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
</PieChart>
</ResponsiveContainer>
) : <p className="text-sm text-gray-400 text-center py-10">Belum ada data</p>}
</div>
</div>
</>
)}

{/* Search & Filter */}
<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
<form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4">
<div className="flex-1 relative">
<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
<input
type="text"
placeholder="Cari nama atau jabatan..."
value={filters.search}
onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
/>
</div>
<button type="button" onClick={() => setShowFilters(!showFilters)}
className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2">
<Filter className="h-4 w-4" /> Filter
<ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
</button>
<button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
<Search className="h-4 w-4" /> Cari
</button>
<button type="button" onClick={fetchData}
className="px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2">
<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
</button>
</form>

{showFilters && (
<div className="mt-4 pt-4 border-t border-gray-200">
<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">Kecamatan</label>
<select value={filters.kecamatan_id} onChange={(e) => handleFilterChange('kecamatan_id', e.target.value)}
className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
<option value="">Semua Kecamatan</option>
{kecamatanList.map(kec => (
<option key={kec.id || kec.id_kecamatan} value={kec.id || kec.id_kecamatan}>{kec.nama || kec.name}</option>
))}
</select>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">Desa</label>
<select value={filters.desa_id} onChange={(e) => handleFilterChange('desa_id', e.target.value)}
className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
disabled={!filters.kecamatan_id}>
<option value="">Semua Desa</option>
{desaList.map(desa => (
<option key={desa.id} value={desa.id}>{desa.nama || desa.name}</option>
))}
</select>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">Jabatan</label>
<input
type="text"
placeholder="Contoh: Kepala Desa"
value={filters.jabatan}
onChange={(e) => handleFilterChange('jabatan', e.target.value)}
className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
/>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">Jenis Kelamin</label>
<select value={filters.jenis_kelamin} onChange={(e) => handleFilterChange('jenis_kelamin', e.target.value)}
className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
<option value="">Semua</option>
<option value="Laki_laki">Laki-laki</option>
<option value="Perempuan">Perempuan</option>
</select>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
<select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}
className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
<option value="">Semua</option>
<option value="Aktif">Aktif</option>
<option value="Tidak_Aktif">Tidak Aktif</option>
</select>
</div>
<div className="flex items-end">
<button onClick={resetFilters} className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">
Reset Filter
</button>
</div>
</div>
</div>
)}
</div>

{/* Data Table */}
<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
{loading ? (
<div className="flex items-center justify-center py-12">
<Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
</div>
) : data.length === 0 ? (
<div className="text-center py-12">
<Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
<p className="text-gray-500">Tidak ada data aparatur desa</p>
<p className="text-sm text-gray-400 mt-1">Data aparatur diinput oleh masing-masing desa atau diimpor dari Dapur Desa</p>
</div>
) : (
<>
{/* Desktop Table */}
<div className="hidden md:block overflow-x-auto">
<table className="min-w-full divide-y divide-gray-200">
<thead className="bg-gray-50">
<tr>
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jabatan</th>
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Desa</th>
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kecamatan</th>
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
</tr>
</thead>
<tbody className="bg-white divide-y divide-gray-200">
{data.map((aparatur) => (
<tr key={aparatur.id} className="hover:bg-gray-50 transition-colors">
<td className="px-6 py-4 whitespace-nowrap">
<div className="flex items-center gap-3">
<div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
<UserCircle className="h-6 w-6 text-blue-600" />
</div>
<div>
<p className="font-medium text-gray-900">{aparatur.nama_lengkap}</p>
<p className="text-xs text-gray-500">
{aparatur.jenis_kelamin === 'Laki_laki' ? 'L' : 'P'}
{aparatur.tempat_lahir && ` \u2022 ${aparatur.tempat_lahir}`}
</p>
</div>
</div>
</td>
<td className="px-6 py-4 whitespace-nowrap">
<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
<Briefcase className="h-3 w-3" />
{aparatur.jabatan}
</span>
</td>
<td className="px-6 py-4 whitespace-nowrap text-gray-600">
{aparatur.desas?.nama || '-'}
</td>
<td className="px-6 py-4 whitespace-nowrap text-gray-600">
{aparatur.desas?.kecamatans?.nama || '-'}
</td>
<td className="px-6 py-4 whitespace-nowrap">
<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
aparatur.status === 'Aktif' 
? 'bg-green-100 text-green-800' 
: 'bg-red-100 text-red-800'
}`}>
{aparatur.status === 'Aktif' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
{aparatur.status === 'Aktif' ? 'Aktif' : 'Tidak Aktif'}
</span>
</td>
<td className="px-6 py-4 whitespace-nowrap text-right">
<button onClick={() => viewDetail(aparatur)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Lihat Detail">
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
<div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
<UserCircle className="h-7 w-7 text-blue-600" />
</div>
<div className="flex-1 min-w-0">
<h3 className="font-semibold text-gray-900">{aparatur.nama_lengkap}</h3>
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800 mt-1">
<Briefcase className="h-3 w-3" />
{aparatur.jabatan}
</span>
<div className="mt-2 space-y-1 text-sm text-gray-600">
<div className="flex items-center gap-2">
<Building className="h-3.5 w-3.5" />
<span>{aparatur.desas?.nama || '-'}</span>
</div>
<div className="flex items-center gap-2">
<MapPin className="h-3.5 w-3.5" />
<span>{aparatur.desas?.kecamatans?.nama || '-'}</span>
</div>
<span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
aparatur.status === 'Aktif' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
}`}>
{aparatur.status === 'Aktif' ? 'Aktif' : 'Tidak Aktif'}
</span>
</div>
</div>
<button onClick={() => viewDetail(aparatur)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
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
<button onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
disabled={pagination.page <= 1}
className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
Sebelumnya
</button>
<button onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
disabled={pagination.page >= pagination.totalPages}
className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
Selanjutnya
</button>
</div>
</div>
)}
</>
)}
</div>

{/* Detail Modal */}
{showDetail && selectedAparatur && (
<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
<div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
<div className="p-6 border-b border-gray-200">
<div className="flex items-center justify-between">
<h2 className="text-xl font-bold text-gray-900">Detail Aparatur Desa</h2>
<button onClick={() => setShowDetail(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
<XCircle className="h-5 w-5 text-gray-500" />
</button>
</div>
</div>
<div className="p-6">
<div className="flex flex-col items-center mb-6">
<div className="h-24 w-24 bg-blue-100 rounded-full flex items-center justify-center mb-3">
<UserCircle className="h-14 w-14 text-blue-600" />
</div>
<h3 className="text-xl font-bold text-gray-900 text-center">{selectedAparatur.nama_lengkap}</h3>
<span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-teal-100 text-teal-800 mt-2">
<Briefcase className="h-4 w-4" />
{selectedAparatur.jabatan}
</span>
<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium mt-2 ${
selectedAparatur.status === 'Aktif' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
}`}>
{selectedAparatur.status === 'Aktif' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
{selectedAparatur.status === 'Aktif' ? 'Aktif' : 'Tidak Aktif'}
</span>
</div>

<div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
<div className="bg-gray-50 rounded-lg p-4">
<h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
<MapPin className="h-4 w-4" /> Lokasi Tugas
</h4>
<div className="grid grid-cols-2 gap-3 text-sm">
<div>
<p className="text-gray-500">Desa</p>
<p className="font-medium text-gray-900">{selectedAparatur.desas?.nama || '-'}</p>
</div>
<div>
<p className="text-gray-500">Kecamatan</p>
<p className="font-medium text-gray-900">{selectedAparatur.desas?.kecamatans?.nama || '-'}</p>
</div>
</div>
</div>

<div className="bg-gray-50 rounded-lg p-4">
<h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
<UserCircle className="h-4 w-4" /> Data Pribadi
</h4>
<div className="grid grid-cols-2 gap-3 text-sm">
<div>
<p className="text-gray-500">Jenis Kelamin</p>
<p className="font-medium text-gray-900">
{selectedAparatur.jenis_kelamin === 'Laki_laki' ? 'Laki-laki' : selectedAparatur.jenis_kelamin === 'Perempuan' ? 'Perempuan' : '-'}
</p>
</div>
<div>
<p className="text-gray-500">Tempat Lahir</p>
<p className="font-medium text-gray-900">{selectedAparatur.tempat_lahir || '-'}</p>
</div>
<div>
<p className="text-gray-500">Tanggal Lahir</p>
<p className="font-medium text-gray-900">{formatDate(selectedAparatur.tanggal_lahir)}</p>
</div>
<div>
<p className="text-gray-500">Agama</p>
<p className="font-medium text-gray-900">{selectedAparatur.agama || '-'}</p>
</div>
<div>
<p className="text-gray-500">Pendidikan</p>
<p className="font-medium text-gray-900">{selectedAparatur.pendidikan_terakhir || '-'}</p>
</div>
</div>
</div>

<div className="bg-gray-50 rounded-lg p-4 md:col-span-2">
<h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
<Briefcase className="h-4 w-4" /> Data Kepegawaian
</h4>
<div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
{selectedAparatur.nipd && (
<div>
<p className="text-gray-500">NIPD</p>
<p className="font-medium text-gray-900">{selectedAparatur.nipd}</p>
</div>
)}
{selectedAparatur.niap && (
<div>
<p className="text-gray-500">NIAP</p>
<p className="font-medium text-gray-900">{selectedAparatur.niap}</p>
</div>
)}
{selectedAparatur.pangkat_golongan && (
<div>
<p className="text-gray-500">Pangkat/Golongan</p>
<p className="font-medium text-gray-900">{selectedAparatur.pangkat_golongan}</p>
</div>
)}
<div>
<p className="text-gray-500">Tgl. Pengangkatan</p>
<p className="font-medium text-gray-900">{formatDate(selectedAparatur.tanggal_pengangkatan)}</p>
</div>
<div>
<p className="text-gray-500">No. SK Pengangkatan</p>
<p className="font-medium text-gray-900 text-xs">{selectedAparatur.nomor_sk_pengangkatan || '-'}</p>
</div>
{selectedAparatur.tanggal_pemberhentian && (
<div>
<p className="text-gray-500">Tgl. Pemberhentian</p>
<p className="font-medium text-gray-900">{formatDate(selectedAparatur.tanggal_pemberhentian)}</p>
</div>
)}
{selectedAparatur.nomor_sk_pemberhentian && (
<div>
<p className="text-gray-500">No. SK Pemberhentian</p>
<p className="font-medium text-gray-900 text-xs">{selectedAparatur.nomor_sk_pemberhentian}</p>
</div>
)}
</div>
{selectedAparatur.keterangan && (
<div className="mt-3 pt-3 border-t border-gray-200 text-sm">
<p className="text-gray-500">Keterangan</p>
<p className="font-medium text-gray-900">{selectedAparatur.keterangan}</p>
</div>
)}
</div>

{(selectedAparatur.bpjs_kesehatan_nomor || selectedAparatur.bpjs_ketenagakerjaan_nomor) && (
<div className="bg-gray-50 rounded-lg p-4 md:col-span-2">
<h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
<FileText className="h-4 w-4" /> BPJS
</h4>
<div className="grid grid-cols-2 gap-3 text-sm">
{selectedAparatur.bpjs_kesehatan_nomor && (
<div>
<p className="text-gray-500">BPJS Kesehatan</p>
<p className="font-medium text-gray-900">{selectedAparatur.bpjs_kesehatan_nomor}</p>
</div>
)}
{selectedAparatur.bpjs_ketenagakerjaan_nomor && (
<div>
<p className="text-gray-500">BPJS Ketenagakerjaan</p>
<p className="font-medium text-gray-900">{selectedAparatur.bpjs_ketenagakerjaan_nomor}</p>
</div>
)}
</div>
</div>
)}
</div>
</div>
<div className="p-6 border-t border-gray-200">
<button onClick={() => setShowDetail(false)}
className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
Tutup
</button>
</div>
</div>
</div>
)}
</>
);
};

// ============================================================
// Tab: Data Dapur Desa (External API)
// ============================================================
const ExternalTab = () => {
const [loading, setLoading] = useState(true);
const [data, setData] = useState([]);
const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1, totalItems: 0 });
const [filters, setFilters] = useState({
name: '', job_type: '', master_district_id: '', master_village_id: '',
gender: '', status_pns: '', min_age: '', max_age: ''
});
const [kecamatanList, setKecamatanList] = useState([]);
const [desaList, setDesaList] = useState([]);
const [connectionStatus, setConnectionStatus] = useState(null);
const [showFilters, setShowFilters] = useState(false);
const [selectedAparatur, setSelectedAparatur] = useState(null);
const [showDetail, setShowDetail] = useState(false);

useEffect(() => {
checkConnectionStatus();
fetchKecamatanList();
}, []);

useEffect(() => {
if (connectionStatus?.connected) {
fetchAparaturDesa();
}
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [connectionStatus, pagination.page, filters]);

useEffect(() => {
if (filters.master_district_id) {
fetchDesaByKecamatan(filters.master_district_id);
} else {
setDesaList([]);
setFilters(prev => ({ ...prev, master_village_id: '' }));
}
}, [filters.master_district_id]);

const checkConnectionStatus = async () => {
try {
const response = await api.get('/external/status');
setConnectionStatus(response.data.data);
} catch (error) {
console.error('Connection check failed:', error);
setConnectionStatus({ connected: false, error: error.message });
}
};

const fetchKecamatanList = async () => {
try {
const response = await api.get('/external/kecamatan');
if (response.data.success) {
setKecamatanList(response.data.data || []);
}
} catch (error) {
console.error('Failed to fetch kecamatan:', error);
}
};

const fetchDesaByKecamatan = async (districtId) => {
try {
const response = await api.get(`/external/desa?master_district_id=${districtId}`);
if (response.data.success) {
setDesaList(response.data.data || []);
}
} catch (error) {
console.error('Failed to fetch desa:', error);
}
};

const fetchAparaturDesa = async () => {
try {
setLoading(true);
const params = new URLSearchParams();
params.append('name', filters.name || '');
params.append('job_type', filters.job_type || '');
params.append('master_district_id', filters.master_district_id || '');
params.append('master_village_id', filters.master_village_id || '');
params.append('gender', filters.gender || '');
params.append('status_pns', filters.status_pns || '');
params.append('min_age', filters.min_age || '');
params.append('max_age', filters.max_age || '');
params.append('page', pagination.page);
params.append('limit', pagination.limit);

const response = await api.get(`/external/aparatur-desa?${params.toString()}`);
if (response.data.success) {
setData(response.data.data || []);
if (response.data.meta) {
const meta = response.data.meta;
setPagination(prev => ({
...prev,
totalPages: meta.totalPage || Math.ceil((meta.totalData || 0) / pagination.limit),
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
setFilters({ name: '', job_type: '', master_district_id: '', master_village_id: '', gender: '', status_pns: '', min_age: '', max_age: '' });
setPagination(prev => ({ ...prev, page: 1 }));
};

const viewDetail = (aparatur) => {
setSelectedAparatur(aparatur);
setShowDetail(true);
};

const jobTypeOptions = [
{ value: 'Perangkat Desa', label: 'Perangkat Desa' },
{ value: 'BPD', label: 'BPD' }
];

// Connection Error
if (connectionStatus && !connectionStatus.connected) {
return (
<div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
<div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
<AlertCircle className="h-8 w-8 text-red-600" />
</div>
<h2 className="text-xl font-bold text-gray-800 mb-2">Koneksi Gagal</h2>
<p className="text-gray-600 mb-4">Tidak dapat terhubung ke External API DPMD Kabupaten Bogor.</p>
{connectionStatus.error && (
<p className="text-sm text-red-500 mb-4 bg-red-50 p-3 rounded-lg">{connectionStatus.error}</p>
)}
<button onClick={checkConnectionStatus}
className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors inline-flex items-center gap-2">
<RefreshCw className="h-4 w-4" /> Coba Lagi
</button>
</div>
);
}

return (
<>
{/* Connection Status Banner */}
<div className="mb-4 flex items-center gap-2 text-sm bg-green-50 border border-green-200 rounded-lg px-4 py-2">
<CheckCircle className="h-4 w-4 text-green-600" />
<span className="text-green-700">Terhubung ke Dapur Desa (External API DPMD Bogorkab)</span>
</div>

{/* Search & Filter */}
<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
<form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4">
<div className="flex-1 relative">
<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
<input type="text" placeholder="Cari nama aparatur..."
value={filters.name}
onChange={(e) => setFilters(prev => ({ ...prev, name: e.target.value }))}
className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
</div>
<button type="button" onClick={() => setShowFilters(!showFilters)}
className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2">
<Filter className="h-4 w-4" /> Filter
<ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
</button>
<button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
<Search className="h-4 w-4" /> Cari
</button>
<button type="button" onClick={fetchAparaturDesa}
className="px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2">
<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
</button>
</form>

{showFilters && (
<div className="mt-4 pt-4 border-t border-gray-200">
<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">Kecamatan</label>
<select value={filters.master_district_id} onChange={(e) => handleFilterChange('master_district_id', e.target.value)}
className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
<option value="">Semua Kecamatan</option>
{kecamatanList.map(kec => (
<option key={kec.id || kec.code} value={kec.code || kec.id}>{kec.name || kec.nama}</option>
))}
</select>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">Desa</label>
<select value={filters.master_village_id} onChange={(e) => handleFilterChange('master_village_id', e.target.value)}
className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
disabled={!filters.master_district_id}>
<option value="">Semua Desa</option>
{desaList.map(desa => (
<option key={desa.id || desa.code} value={desa.code || desa.id}>{desa.name || desa.nama}</option>
))}
</select>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
<select value={filters.job_type} onChange={(e) => handleFilterChange('job_type', e.target.value)}
className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
<option value="">Semua Kategori</option>
{jobTypeOptions.map(opt => (
<option key={opt.value} value={opt.value}>{opt.label}</option>
))}
</select>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">Jenis Kelamin</label>
<select value={filters.gender} onChange={(e) => handleFilterChange('gender', e.target.value)}
className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
<option value="">Semua</option>
<option value="L">Laki-laki</option>
<option value="P">Perempuan</option>
</select>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">Status Kepegawaian</label>
<select value={filters.status_pns} onChange={(e) => handleFilterChange('status_pns', e.target.value)}
className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
<option value="">Semua</option>
<option value="PNS">PNS</option>
<option value="NON PNS">Non PNS</option>
</select>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">Usia Min</label>
<input type="number" placeholder="Min" value={filters.min_age}
onChange={(e) => handleFilterChange('min_age', e.target.value)}
className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" min="0" />
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">Usia Max</label>
<input type="number" placeholder="Max" value={filters.max_age}
onChange={(e) => handleFilterChange('max_age', e.target.value)}
className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" min="0" />
</div>
</div>
<div className="mt-4 flex justify-end">
<button onClick={resetFilters} className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">Reset Filter</button>
</div>
</div>
)}
</div>

{/* Data Table */}
<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
{loading ? (
<div className="flex items-center justify-center py-12">
<Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
</div>
) : data.length === 0 ? (
<div className="text-center py-12">
<Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
<p className="text-gray-500">Tidak ada data aparatur desa</p>
</div>
) : (
<>
{/* Desktop Table */}
<div className="hidden md:block overflow-x-auto">
<table className="min-w-full divide-y divide-gray-200">
<thead className="bg-gray-50">
<tr>
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jabatan</th>
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Desa</th>
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kecamatan</th>
<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
</tr>
</thead>
<tbody className="bg-white divide-y divide-gray-200">
{data.map((aparatur) => (
<tr key={aparatur.id} className="hover:bg-gray-50 transition-colors">
<td className="px-6 py-4 whitespace-nowrap">
<div className="flex items-center gap-3">
{aparatur.photo ? (
<img src={aparatur.photo} alt={aparatur.name}
className="h-10 w-10 rounded-full object-cover"
onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
) : null}
<div className={`h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center ${aparatur.photo ? 'hidden' : ''}`}>
<UserCircle className="h-6 w-6 text-blue-600" />
</div>
<div>
<p className="font-medium text-gray-900">{aparatur.name}</p>
{aparatur.no_sk && <p className="text-xs text-gray-500">SK: {aparatur.no_sk}</p>}
</div>
</div>
</td>
<td className="px-6 py-4 whitespace-nowrap">
<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
<Briefcase className="h-3 w-3" />
{aparatur.master_job_level_name || '-'}
</span>
</td>
<td className="px-6 py-4 whitespace-nowrap text-gray-600">{aparatur.master_village_name || '-'}</td>
<td className="px-6 py-4 whitespace-nowrap text-gray-600">{aparatur.master_district_name || '-'}</td>
<td className="px-6 py-4 whitespace-nowrap text-right">
<button onClick={() => viewDetail(aparatur)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Lihat Detail">
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
<img src={aparatur.photo} alt={aparatur.name}
className="h-12 w-12 rounded-full object-cover flex-shrink-0"
onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
) : null}
<div className={`h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 ${aparatur.photo ? 'hidden' : ''}`}>
<UserCircle className="h-7 w-7 text-blue-600" />
</div>
<div className="flex-1 min-w-0">
<h3 className="font-semibold text-gray-900">{aparatur.name}</h3>
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800 mt-1">
<Briefcase className="h-3 w-3" />
{aparatur.master_job_level_name || '-'}
</span>
<div className="mt-2 space-y-1 text-sm text-gray-600">
<div className="flex items-center gap-2">
<Building className="h-3.5 w-3.5" />
<span>{aparatur.master_village_name || '-'}</span>
</div>
<div className="flex items-center gap-2">
<MapPin className="h-3.5 w-3.5" />
<span>{aparatur.master_district_name || '-'}</span>
</div>
<div className="flex items-center gap-2">
<span className={`px-2 py-0.5 rounded text-xs ${aparatur.status_pns === 'PNS' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
{aparatur.status_pns || '-'}
</span>
{aparatur.usia && <span className="text-gray-500">{'\u2022'} {aparatur.usia} thn</span>}
</div>
</div>
</div>
<button onClick={() => viewDetail(aparatur)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
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
<button onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
disabled={pagination.page <= 1}
className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
Sebelumnya
</button>
<button onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
disabled={pagination.page >= pagination.totalPages}
className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
Selanjutnya
</button>
</div>
</div>
)}
</>
)}
</div>

{/* Detail Modal - External */}
{showDetail && selectedAparatur && (
<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
<div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
<div className="p-6 border-b border-gray-200">
<div className="flex items-center justify-between">
<h2 className="text-xl font-bold text-gray-900">Detail Aparatur (Dapur Desa)</h2>
<button onClick={() => setShowDetail(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
<XCircle className="h-5 w-5 text-gray-500" />
</button>
</div>
</div>
<div className="p-6">
<div className="flex flex-col items-center mb-6">
{selectedAparatur.photo ? (
<img src={selectedAparatur.photo} alt={selectedAparatur.name}
className="h-24 w-24 rounded-full object-cover mb-3 border-4 border-blue-100"
onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
) : null}
<div className={`h-24 w-24 bg-blue-100 rounded-full flex items-center justify-center mb-3 ${selectedAparatur.photo ? 'hidden' : ''}`}>
<UserCircle className="h-14 w-14 text-blue-600" />
</div>
<h3 className="text-xl font-bold text-gray-900 text-center">{selectedAparatur.name || '-'}</h3>
<span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-teal-100 text-teal-800 mt-2">
<Briefcase className="h-4 w-4" />
{selectedAparatur.master_job_level_name || '-'}
</span>
</div>

<div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
<div className="bg-gray-50 rounded-lg p-4">
<h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
<MapPin className="h-4 w-4" /> Lokasi Tugas
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

<div className="bg-gray-50 rounded-lg p-4">
<h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
<UserCircle className="h-4 w-4" /> Data Pribadi
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
</div>
</div>

<div className="bg-gray-50 rounded-lg p-4 md:col-span-2">
<h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
<Briefcase className="h-4 w-4" /> Data Kepegawaian
</h4>
<div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
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
{(selectedAparatur.no_sk || selectedAparatur.no_sk_pertama) && (
<div className="border-t border-gray-200 pt-3 mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
{selectedAparatur.no_sk && (
<div>
<p className="text-xs text-gray-400 mb-2">SK Saat Ini</p>
<div className="grid grid-cols-2 gap-3">
<div>
<p className="text-gray-500">No. SK</p>
<p className="font-medium text-gray-900 text-xs">{selectedAparatur.no_sk}</p>
</div>
<div>
<p className="text-gray-500">Tanggal SK</p>
<p className="font-medium text-gray-900">
{selectedAparatur.sk_date ? new Date(selectedAparatur.sk_date).toLocaleDateString('id-ID', {
day: 'numeric', month: 'short', year: 'numeric'
}) : '-'}
</p>
</div>
</div>
</div>
)}
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
day: 'numeric', month: 'short', year: 'numeric'
}) : '-'}
</p>
</div>
</div>
</div>
)}
</div>
)}
</div>
</div>
</div>
<div className="p-6 border-t border-gray-200">
<button onClick={() => setShowDetail(false)}
className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
Tutup
</button>
</div>
</div>
</div>
)}
</>
);
};

// ============================================================
// Main Page Component
// ============================================================
const AparaturDesaPage = () => {
const [activeTab, setActiveTab] = useState('database');

const tabs = [
{ id: 'database', label: 'Database Lokal', icon: Database, desc: 'Data yang diinput desa' },
{ id: 'external', label: 'Dapur Desa', icon: Globe, desc: 'Data dari API External' },
];

return (
<div className="min-h-screen bg-gray-50 pb-6">
{/* Header */}
<div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white">
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
<div className="flex items-center gap-4">
<div className="h-16 w-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
<Users className="h-8 w-8" />
</div>
<div>
<h1 className="text-2xl font-bold">Aparatur Desa</h1>
<p className="text-blue-100 mt-1">Bidang Pemerintahan Desa</p>
</div>
</div>
</div>
</div>

<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
{/* Tab Switcher */}
<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1.5 mb-6 inline-flex gap-1">
{tabs.map(tab => (
<button
key={tab.id}
onClick={() => setActiveTab(tab.id)}
className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
activeTab === tab.id
? 'bg-blue-600 text-white shadow-sm'
: 'text-gray-600 hover:bg-gray-100'
}`}
>
<tab.icon className="h-4 w-4" />
<span>{tab.label}</span>
<span className={`hidden sm:inline text-xs ${activeTab === tab.id ? 'text-blue-200' : 'text-gray-400'}`}>
- {tab.desc}
</span>
</button>
))}
</div>

{/* Tab Content */}
{activeTab === 'database' && <DatabaseTab />}
{activeTab === 'external' && <ExternalTab />}
</div>
</div>
);
};

export default AparaturDesaPage;
