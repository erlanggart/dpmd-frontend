import React, { useState, useEffect } from 'react';
import {
	Users,
	UserCheck,
	Building2,
	GraduationCap,
	RefreshCw,
	Loader2,
	AlertCircle,
	TrendingUp,
	Calendar,
	ArrowRight
} from 'lucide-react';
import {
	PieChart,
	Pie,
	Cell,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer
} from 'recharts';
import api from '../../api';

// Color palettes
const GENDER_COLORS = ['#0ea5e9', '#ec4899']; // Blue for male, Pink for female
const EDUCATION_COLORS = [
	'#ef4444', // SD
	'#f97316', // SMP
	'#eab308', // SMA
	'#84cc16', // D1/D2
	'#22c55e', // D3
	'#14b8a6', // S1
	'#0ea5e9', // S2
	'#8b5cf6'  // S3
];
const AGE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

const StatistikAparaturDesa = () => {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [activeTab, setActiveTab] = useState('kepala_desa'); // kepala_desa, perangkat_desa, bpd

	useEffect(() => {
		fetchDashboardData();
	}, []);

	const fetchDashboardData = async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await api.get('/external/dashboard');
			
			if (response.data.success) {
				setData(response.data.data);
			} else {
				throw new Error(response.data.message || 'Gagal mengambil data');
			}
		} catch (err) {
			console.error('Error fetching dashboard:', err);
			setError(err.message || 'Gagal mengambil data statistik. Silakan coba lagi.');
		} finally {
			setLoading(false);
		}
	};

	// Format age data for chart (handle array in y field)
	const formatAgeData = (ageData) => {
		if (!ageData) return [];
		return ageData.map((item, index) => ({
			name: item.name,
			value: Array.isArray(item.y) ? item.y[0] : item.y,
			fill: AGE_COLORS[index % AGE_COLORS.length]
		}));
	};

	// Format education data
	const formatEducationData = (eduData) => {
		if (!eduData) return [];
		return eduData.map((item, index) => ({
			name: item.name,
			value: item.y,
			fill: EDUCATION_COLORS[index % EDUCATION_COLORS.length]
		}));
	};

	// Custom tooltip for pie charts
	const CustomTooltip = ({ active, payload }) => {
		if (active && payload && payload.length) {
			return (
				<div className="bg-white px-4 py-2 shadow-lg rounded-lg border border-gray-200">
					<p className="font-semibold text-gray-800">{payload[0].name}</p>
					<p className="text-gray-600">
						Jumlah: <span className="font-bold text-gray-900">{payload[0].value.toLocaleString('id-ID')}</span>
					</p>
				</div>
			);
		}
		return null;
	};

	// Get current tab data
	const getCurrentTabData = () => {
		if (!data) return null;
		
		switch (activeTab) {
			case 'kepala_desa':
				return {
					pendidikan: data.kepala_desa_pendidikan,
					gender: data.kepala_desa_gender,
					usia: data.kepala_desa_usia,
					title: 'Kepala Desa',
					icon: <UserCheck className="h-6 w-6" />,
					color: 'teal'
				};
			case 'perangkat_desa':
				return {
					pendidikan: data.perangkat_desa_pendidikan,
					gender: data.perangkat_desa_gender,
					usia: data.perangkat_desa_usia,
					title: 'Perangkat Desa',
					icon: <Users className="h-6 w-6" />,
					color: 'blue'
				};
			case 'bpd':
				return {
					pendidikan: data.bpd_pendidikan,
					gender: data.bpd_gender,
					usia: data.bpd_usia,
					title: 'BPD',
					icon: <Building2 className="h-6 w-6" />,
					color: 'purple'
				};
			default:
				return null;
		}
	};

	// Calculate totals for summary
	const calculateTotals = () => {
		if (!data) return { kepalaDesa: 0, perangkatDesa: 0, bpd: 0 };
		
		const sumGender = (genderData) => {
			if (!genderData) return 0;
			return genderData.reduce((acc, item) => acc + (item.y || 0), 0);
		};

		return {
			kepalaDesa: sumGender(data.kepala_desa_gender),
			perangkatDesa: sumGender(data.perangkat_desa_gender),
			bpd: sumGender(data.bpd_gender)
		};
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="flex flex-col items-center gap-4">
					<Loader2 className="h-12 w-12 text-teal-600 animate-spin" />
					<p className="text-gray-600 font-medium">Memuat data statistik...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
				<div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
					<div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<AlertCircle className="h-8 w-8 text-red-600" />
					</div>
					<h2 className="text-xl font-bold text-gray-800 mb-2">Gagal Memuat Data</h2>
					<p className="text-gray-600 mb-4">{error}</p>
					<button
						onClick={fetchDashboardData}
						className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 mx-auto"
					>
						<RefreshCw className="h-4 w-4" />
						Coba Lagi
					</button>
				</div>
			</div>
		);
	}

	const currentData = getCurrentTabData();
	const totals = calculateTotals();
	const totalAll = totals.kepalaDesa + totals.perangkatDesa + totals.bpd;

	return (
		<div className="min-h-screen bg-gray-50 p-4 md:p-6">
			{/* Header */}
			<div className="bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 text-white rounded-2xl p-6 mb-6 shadow-lg">
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
					<div className="flex items-center gap-4">
						<div className="h-16 w-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
							<Users className="h-8 w-8" />
						</div>
						<div>
							<h1 className="text-2xl md:text-3xl font-bold">Statistik Aparatur Desa</h1>
							<p className="text-teal-100 mt-1">Data dari Dapur Desa DPMD Kabupaten Bogor</p>
						</div>
					</div>
					<button
						onClick={fetchDashboardData}
						className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-colors backdrop-blur-sm"
					>
						<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
						Refresh
					</button>
				</div>
			</div>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
					<div className="flex items-center gap-3">
						<div className="h-12 w-12 bg-gradient-to-br from-teal-100 to-teal-200 rounded-xl flex items-center justify-center">
							<UserCheck className="h-6 w-6 text-teal-600" />
						</div>
						<div>
							<p className="text-sm text-gray-500">Kepala Desa</p>
							<p className="text-2xl font-bold text-gray-900">{totals.kepalaDesa.toLocaleString('id-ID')}</p>
						</div>
					</div>
				</div>
				
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
					<div className="flex items-center gap-3">
						<div className="h-12 w-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
							<Users className="h-6 w-6 text-blue-600" />
						</div>
						<div>
							<p className="text-sm text-gray-500">Perangkat Desa</p>
							<p className="text-2xl font-bold text-gray-900">{totals.perangkatDesa.toLocaleString('id-ID')}</p>
						</div>
					</div>
				</div>
				
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
					<div className="flex items-center gap-3">
						<div className="h-12 w-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
							<Building2 className="h-6 w-6 text-purple-600" />
						</div>
						<div>
							<p className="text-sm text-gray-500">Anggota BPD</p>
							<p className="text-2xl font-bold text-gray-900">{totals.bpd.toLocaleString('id-ID')}</p>
						</div>
					</div>
				</div>
				
				<div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl shadow-sm p-5 text-white">
					<div className="flex items-center gap-3">
						<div className="h-12 w-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
							<TrendingUp className="h-6 w-6" />
						</div>
						<div>
							<p className="text-sm text-teal-100">Total Aparatur</p>
							<p className="text-2xl font-bold">{totalAll.toLocaleString('id-ID')}</p>
						</div>
					</div>
				</div>
			</div>

			{/* Category Tabs */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1.5 mb-6">
				<div className="flex">
					<button
						onClick={() => setActiveTab('kepala_desa')}
						className={`flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
							activeTab === 'kepala_desa'
								? 'bg-teal-600 text-white shadow-sm'
								: 'text-gray-600 hover:bg-gray-100'
						}`}
					>
						<UserCheck className="h-4 w-4" />
						<span className="hidden sm:inline">Kepala Desa</span>
						<span className="sm:hidden">Kades</span>
					</button>
					<button
						onClick={() => setActiveTab('perangkat_desa')}
						className={`flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
							activeTab === 'perangkat_desa'
								? 'bg-blue-600 text-white shadow-sm'
								: 'text-gray-600 hover:bg-gray-100'
						}`}
					>
						<Users className="h-4 w-4" />
						<span className="hidden sm:inline">Perangkat Desa</span>
						<span className="sm:hidden">Perangkat</span>
					</button>
					<button
						onClick={() => setActiveTab('bpd')}
						className={`flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
							activeTab === 'bpd'
								? 'bg-purple-600 text-white shadow-sm'
								: 'text-gray-600 hover:bg-gray-100'
						}`}
					>
						<Building2 className="h-4 w-4" />
						BPD
					</button>
				</div>
			</div>

			{currentData && (
				<>
					{/* Charts Grid */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
						{/* Gender Distribution */}
						<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
							<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
								<Users className="h-5 w-5 text-gray-500" />
								Distribusi Jenis Kelamin - {currentData.title}
							</h3>
							<div className="h-72">
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={currentData.gender}
											cx="50%"
											cy="50%"
											innerRadius={60}
											outerRadius={100}
											paddingAngle={5}
											dataKey="y"
											nameKey="name"
											label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
										>
											{currentData.gender?.map((entry, index) => (
												<Cell key={`cell-${index}`} fill={entry.color || GENDER_COLORS[index % GENDER_COLORS.length]} />
											))}
										</Pie>
										<Tooltip content={<CustomTooltip />} />
									</PieChart>
								</ResponsiveContainer>
							</div>
							{/* Legend */}
							<div className="flex justify-center gap-6 mt-4">
								{currentData.gender?.map((item, index) => (
									<div key={index} className="flex items-center gap-2">
										<div 
											className="w-3 h-3 rounded-full" 
											style={{ backgroundColor: item.color || GENDER_COLORS[index % GENDER_COLORS.length] }}
										/>
										<span className="text-sm text-gray-600">{item.name}: {item.y.toLocaleString('id-ID')}</span>
									</div>
								))}
							</div>
						</div>

						{/* Age Distribution */}
						<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
							<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
								<Calendar className="h-5 w-5 text-gray-500" />
								Distribusi Usia - {currentData.title}
							</h3>
							<div className="h-72">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={formatAgeData(currentData.usia)} layout="vertical">
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis type="number" tickFormatter={(value) => value.toLocaleString('id-ID')} />
										<YAxis type="category" dataKey="name" width={80} />
										<Tooltip 
											formatter={(value) => [value.toLocaleString('id-ID'), 'Jumlah']}
											labelStyle={{ color: '#374151' }}
										/>
										<Bar dataKey="value" radius={[0, 4, 4, 0]}>
											{formatAgeData(currentData.usia).map((entry, index) => (
												<Cell key={`cell-${index}`} fill={entry.fill} />
											))}
										</Bar>
									</BarChart>
								</ResponsiveContainer>
							</div>
						</div>
					</div>

					{/* Education Distribution - Full Width */}
					<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
							<GraduationCap className="h-5 w-5 text-gray-500" />
							Distribusi Pendidikan - {currentData.title}
						</h3>
						<div className="h-80">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={formatEducationData(currentData.pendidikan)}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis 
										dataKey="name" 
										angle={-45} 
										textAnchor="end" 
										height={80}
										tick={{ fontSize: 11 }}
									/>
									<YAxis tickFormatter={(value) => value.toLocaleString('id-ID')} />
									<Tooltip 
										formatter={(value) => [value.toLocaleString('id-ID'), 'Jumlah']}
										labelStyle={{ color: '#374151' }}
									/>
									<Bar dataKey="value" radius={[4, 4, 0, 0]}>
										{formatEducationData(currentData.pendidikan).map((entry, index) => (
											<Cell key={`cell-${index}`} fill={entry.fill} />
										))}
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						</div>
						
						{/* Education Summary Table */}
						<div className="mt-6 overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-gray-200">
										<th className="text-left py-2 px-3 font-medium text-gray-600">Tingkat Pendidikan</th>
										<th className="text-right py-2 px-3 font-medium text-gray-600">Jumlah</th>
										<th className="text-right py-2 px-3 font-medium text-gray-600">Persentase</th>
									</tr>
								</thead>
								<tbody>
									{currentData.pendidikan?.map((item, index) => {
										const total = currentData.pendidikan.reduce((acc, i) => acc + i.y, 0);
										const percentage = ((item.y / total) * 100).toFixed(1);
										return (
											<tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
												<td className="py-2 px-3 flex items-center gap-2">
													<div 
														className="w-3 h-3 rounded-full" 
														style={{ backgroundColor: EDUCATION_COLORS[index % EDUCATION_COLORS.length] }}
													/>
													{item.name}
												</td>
												<td className="text-right py-2 px-3 font-medium">{item.y.toLocaleString('id-ID')}</td>
												<td className="text-right py-2 px-3 text-gray-500">{percentage}%</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>
				</>
			)}

			{/* Footer Info */}
			<div className="mt-6 text-center text-sm text-gray-500">
				<p>Data bersumber dari Dapur Desa DPMD Kabupaten Bogor</p>
			</div>
		</div>
	);
};

export default StatistikAparaturDesa;
