// src/pages/superadmin/ActivityLogsPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
	FiActivity, FiRefreshCw, FiSearch, FiDownload,
	FiChevronLeft, FiChevronRight, FiX,
} from 'react-icons/fi';
import api from '../../api';
import toast from 'react-hot-toast';

const MODULE_LABELS = {
	bankeu: 'Bantuan Keuangan',
	kelembagaan: 'Kelembagaan',
	produk_hukum: 'Produk Hukum',
	jadwal_kegiatan: 'Jadwal Kegiatan',
	video_meeting: 'Video Meeting',
	disposisi: 'Disposisi',
	informasi: 'Informasi',
	bhprd: 'BHPRD',
	perjadin: 'Perjalanan Dinas',
	surat_masuk: 'Surat Masuk',
	bumdes: 'BUMDes',
	berita: 'Berita',
	dd: 'Dana Desa',
	add: 'Alokasi Dana Desa',
	pegawai: 'Pegawai',
	user: 'User Management',
	dana_desa: 'Dana Desa',
	manajemen_akun_desa: 'Manajemen Akun Desa',
};

const ACTION_OPTIONS = [
	'create', 'update', 'delete', 'approve', 'submit', 'verify', 'upload',
	'read', 'toggle_status', 'revision', 'resubmit', 'cancel_approval',
	'reopen_submission', 'update_status', 'verify_pengurus',
];

// Satu-satunya warna di halaman ini: titik penanda sifat aksi.
const ACTION_TONE = {
	create: 'bg-emerald-500',
	approve: 'bg-emerald-500',
	verify: 'bg-emerald-500',
	verify_pengurus: 'bg-emerald-500',
	submit: 'bg-emerald-500',
	resubmit: 'bg-emerald-500',
	delete: 'bg-rose-500',
	reject: 'bg-rose-500',
	cancel_approval: 'bg-rose-500',
	revision: 'bg-amber-500',
	reopen_submission: 'bg-amber-500',
};

const actionTone = (action) => ACTION_TONE[action?.toLowerCase()] || 'bg-slate-400';

const formatNumber = (value) => Number(value || 0).toLocaleString('id-ID');

const ActivityLogsPage = () => {
	const [logs, setLogs] = useState([]);
	const [loading, setLoading] = useState(true);
	const [filters, setFilters] = useState({
		bidang_id: '',
		module: '',
		action: '',
		search: '',
		page: 1,
		limit: 100,
	});
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [stats, setStats] = useState({ total: 0, today: 0, thisWeek: 0, thisMonth: 0 });
	const [moduleStats, setModuleStats] = useState([]);
	const [bidangList, setBidangList] = useState([
		{ id: 2, nama: 'Sekretariat' },
		{ id: 3, nama: 'SPKED' },
		{ id: 4, nama: 'KKD' },
		{ id: 5, nama: 'PMD' },
		{ id: 6, nama: 'Pemdes' },
	]);

	const fetchBidangList = useCallback(async () => {
		try {
			const response = await api.get('/bidang');
			if (response.data.success && response.data.data) {
				setBidangList(response.data.data);
			}
		} catch (error) {
			console.error('Error fetching bidang list:', error);
		}
	}, []);

	const fetchStats = useCallback(async () => {
		try {
			const response = await api.get('/activity-logs/stats');
			if (response.data.success && response.data.data) {
				setStats(response.data.data);
			}
		} catch (error) {
			console.error('Error fetching stats:', error);
		}
	}, []);

	const fetchModuleStats = useCallback(async () => {
		try {
			const response = await api.get('/activity-logs/module-stats');
			if (response.data.success && response.data.data) {
				setModuleStats(response.data.data);
			}
		} catch (error) {
			console.error('Error fetching module stats:', error);
		}
	}, []);

	const fetchLogs = useCallback(async () => {
		try {
			setLoading(true);

			const params = {
				limit: filters.limit,
				page: filters.page,
				module: filters.module || undefined,
				action: filters.action || undefined,
				bidang_id: filters.bidang_id || undefined,
				search: debouncedSearch || undefined,
			};

			Object.keys(params).forEach((key) => params[key] === undefined && delete params[key]);

			const response = await api.get('/activity-logs', { params });

			if (response.data.success && response.data.data) {
				setLogs(response.data.data);
			}
		} catch (error) {
			console.error('Error fetching logs:', error);
			toast.error('Gagal memuat activity logs');
		} finally {
			setLoading(false);
		}
	}, [filters.bidang_id, filters.module, filters.action, filters.limit, filters.page, debouncedSearch]);

	useEffect(() => {
		fetchBidangList();
		fetchStats();
		fetchModuleStats();
	}, [fetchBidangList, fetchStats, fetchModuleStats]);

	useEffect(() => {
		const timeoutId = setTimeout(() => {
			setDebouncedSearch(filters.search.trim());
			setFilters((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
		}, 350);
		return () => clearTimeout(timeoutId);
	}, [filters.search]);

	useEffect(() => {
		fetchLogs();
	}, [fetchLogs]);

	const handleFilterChange = (key, value) => {
		setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
	};

	const handleReset = () => {
		setFilters({ bidang_id: '', module: '', action: '', search: '', page: 1, limit: 100 });
		setDebouncedSearch('');
		fetchStats();
		fetchModuleStats();
	};

	const handleRefresh = () => {
		fetchStats();
		fetchModuleStats();
		fetchLogs();
	};

	const getBidangName = useCallback(
		(bidangId) => {
			if (bidangId === null || bidangId === undefined || bidangId === '') return 'Non-Bidang';
			const bidang = bidangList.find((b) => Number(b.id) === Number(bidangId));
			return bidang?.nama || `Bidang ${bidangId}`;
		},
		[bidangList],
	);

	const formatTime = (dateString) => {
		const date = new Date(dateString);
		const diff = Math.floor((Date.now() - date.getTime()) / 1000);

		if (diff < 60) return 'Baru saja';
		if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
		if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
		if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;

		return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
	};

	const formatFullTime = (dateString) =>
		new Date(dateString).toLocaleString('id-ID', {
			day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
		});

	const exportLogs = () => {
		const csv = [
			['Waktu', 'User', 'Role', 'Bidang', 'Module', 'Action', 'Deskripsi'].join(','),
			...logs.map((log) => [
				new Date(log.createdAt).toLocaleString('id-ID'),
				log.userName || '-',
				log.userRole || '-',
				getBidangName(log.bidangId),
				log.module || '-',
				log.action || '-',
				`"${(log.description || '-').replace(/"/g, '""')}"`,
			].join(',')),
		].join('\n');

		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
		a.click();
		window.URL.revokeObjectURL(url);

		toast.success('Log berhasil diexport');
	};

	const moduleTotal = useMemo(
		() => moduleStats.reduce((sum, m) => sum + Number(m.count || 0), 0),
		[moduleStats],
	);

	const activeFilters = useMemo(() => {
		const chips = [];
		if (filters.bidang_id) {
			chips.push({
				key: 'bidang_id',
				label: filters.bidang_id === 'null' ? 'Non-Bidang' : getBidangName(filters.bidang_id),
			});
		}
		if (filters.module) {
			chips.push({ key: 'module', label: MODULE_LABELS[filters.module] || filters.module });
		}
		if (filters.action) chips.push({ key: 'action', label: filters.action });
		if (debouncedSearch) chips.push({ key: 'search', label: `"${debouncedSearch}"` });
		return chips;
	}, [filters.bidang_id, filters.module, filters.action, debouncedSearch, getBidangName]);

	const summaryTiles = [
		{ label: 'Total', value: stats.total },
		{ label: 'Hari ini', value: stats.today },
		{ label: 'Minggu ini', value: stats.thisWeek },
		{ label: 'Bulan ini', value: stats.thisMonth },
	];

	const selectClass =
		'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10';

	return (
		<div className="min-h-screen bg-slate-50">
			{/* Header */}
			<header className="border-b border-slate-200 bg-white">
				<div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
					<div className="flex flex-wrap items-start justify-between gap-4">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
								<FiActivity className="h-5 w-5" />
							</div>
							<div>
								<h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
									Activity Logs
								</h1>
								<p className="mt-0.5 text-sm text-slate-500">
									Rekam jejak seluruh aktivitas sistem DPMD
								</p>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<button
								onClick={handleRefresh}
								className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
							>
								<FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
								<span className="hidden sm:inline">Refresh</span>
							</button>
							<button
								onClick={exportLogs}
								disabled={logs.length === 0}
								className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
							>
								<FiDownload className="h-4 w-4" />
								Export CSV
							</button>
						</div>
					</div>

					{/* Ringkasan */}
					<div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-4">
						{summaryTiles.map((tile) => (
							<div key={tile.label} className="bg-white px-4 py-3.5">
								<p className="text-xs font-medium uppercase tracking-wide text-slate-400">
									{tile.label}
								</p>
								<p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
									{formatNumber(tile.value)}
								</p>
							</div>
						))}
					</div>
				</div>
			</header>

			<div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
				<div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
					{/* Distribusi modul */}
					<aside className="lg:col-span-4 xl:col-span-3">
						<div className="rounded-xl border border-slate-200 bg-white lg:sticky lg:top-6">
							<div className="flex items-baseline justify-between border-b border-slate-100 px-4 py-3">
								<h2 className="text-sm font-semibold text-slate-900">Distribusi Modul</h2>
								<span className="text-xs tabular-nums text-slate-400">{formatNumber(moduleTotal)}</span>
							</div>

							{moduleStats.length === 0 ? (
								<p className="px-4 py-10 text-center text-sm text-slate-400">
									Belum ada data statistik
								</p>
							) : (
								<div className="max-h-[calc(100vh-16rem)] overflow-y-auto p-2">
									{moduleStats.map((item) => {
										const percentage = moduleTotal ? (item.count / moduleTotal) * 100 : 0;
										const isSelected = filters.module === item.module;

										return (
											<button
												key={item.module}
												onClick={() =>
													handleFilterChange('module', isSelected ? '' : item.module)
												}
												className={`group block w-full rounded-lg px-2.5 py-2 text-left transition ${
													isSelected ? 'bg-slate-100' : 'hover:bg-slate-50'
												}`}
											>
												<div className="flex items-baseline justify-between gap-3">
													<span
														className={`truncate text-sm ${
															isSelected ? 'font-semibold text-slate-900' : 'text-slate-600'
														}`}
													>
														{MODULE_LABELS[item.module] || item.module}
													</span>
													<span className="shrink-0 text-xs tabular-nums text-slate-500">
														{formatNumber(item.count)}
														<span className="ml-1.5 text-slate-300">{percentage.toFixed(1)}%</span>
													</span>
												</div>
												<div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-100">
													<div
														className={`h-full rounded-full transition-all duration-500 ${
															isSelected ? 'bg-slate-900' : 'bg-slate-300 group-hover:bg-slate-400'
														}`}
														style={{ width: `${Math.max(percentage, 1.5)}%` }}
													/>
												</div>
											</button>
										);
									})}
								</div>
							)}
						</div>
					</aside>

					{/* Filter + daftar log */}
					<section className="space-y-4 lg:col-span-8 xl:col-span-9">
						<div className="rounded-xl border border-slate-200 bg-white p-4">
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
								<div className="relative sm:col-span-2 lg:col-span-2">
									<FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
									<input
										type="search"
										value={filters.search}
										onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
										placeholder="Cari deskripsi atau nama user..."
										className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10"
									/>
								</div>

								<select
									value={filters.bidang_id}
									onChange={(e) => handleFilterChange('bidang_id', e.target.value)}
									className={selectClass}
								>
									<option value="">Semua bidang</option>
									<option value="null">Non-Bidang</option>
									{bidangList.map((bidang) => (
										<option key={bidang.id} value={bidang.id}>
											{bidang.nama}
										</option>
									))}
								</select>

								<select
									value={filters.action}
									onChange={(e) => handleFilterChange('action', e.target.value)}
									className={selectClass}
								>
									<option value="">Semua aksi</option>
									{ACTION_OPTIONS.map((action) => (
										<option key={action} value={action}>
											{action.replace(/_/g, ' ')}
										</option>
									))}
								</select>
							</div>

							{activeFilters.length > 0 && (
								<div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
									{activeFilters.map((chip) => (
										<span
											key={chip.key}
											className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-2.5 pr-1.5 text-xs font-medium capitalize text-slate-700"
										>
											{chip.label}
											<button
												onClick={() =>
													chip.key === 'search'
														? setFilters((prev) => ({ ...prev, search: '', page: 1 }))
														: handleFilterChange(chip.key, '')
												}
												className="rounded-full p-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
												aria-label={`Hapus filter ${chip.label}`}
											>
												<FiX className="h-3 w-3" />
											</button>
										</span>
									))}
									<button
										onClick={handleReset}
										className="text-xs font-medium text-slate-500 underline-offset-2 transition hover:text-slate-900 hover:underline"
									>
										Reset semua
									</button>
								</div>
							)}
						</div>

						<div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
							{loading ? (
								<div className="flex min-h-[24rem] flex-col items-center justify-center gap-3">
									<div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
									<p className="text-sm text-slate-500">Memuat activity logs...</p>
								</div>
							) : logs.length === 0 ? (
								<div className="flex min-h-[24rem] flex-col items-center justify-center px-6 text-center">
									<div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
										<FiActivity className="h-6 w-6" />
									</div>
									<p className="font-medium text-slate-800">Tidak ada activity log</p>
									<p className="mt-1 text-sm text-slate-500">
										Ubah filter atau reset pencarian untuk melihat data lain.
									</p>
								</div>
							) : (
								<ul className="divide-y divide-slate-100">
									{logs.map((log, index) => (
										<li
											key={log.id || index}
											className="flex gap-3 px-4 py-3 transition hover:bg-slate-50"
										>
											<span
												className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${actionTone(log.action)}`}
												aria-hidden="true"
											/>
											<div className="min-w-0 flex-1">
												<div className="flex items-start justify-between gap-4">
													<p className="text-sm leading-5 text-slate-800">
														{log.description || 'Activity log'}
													</p>
													<time
														className="shrink-0 whitespace-nowrap text-xs text-slate-400"
														title={formatFullTime(log.createdAt)}
													>
														{formatTime(log.createdAt)}
													</time>
												</div>
												<div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
													<span className="font-medium text-slate-700">
														{log.userName || 'Unknown'}
													</span>
													<span className="text-slate-300">/</span>
													<span className="capitalize">{(log.userRole || '-').replace(/_/g, ' ')}</span>
													<span className="text-slate-300">/</span>
													<span>{getBidangName(log.bidangId)}</span>
													{log.module && (
														<>
															<span className="text-slate-300">/</span>
															<span>{MODULE_LABELS[log.module] || log.module}</span>
														</>
													)}
													<span className="ml-1 rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-slate-500">
														{(log.action || 'action').replace(/_/g, ' ')}
													</span>
												</div>
											</div>
										</li>
									))}
								</ul>
							)}
						</div>

						{!loading && logs.length > 0 && (
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<div className="flex items-center gap-2 text-sm text-slate-500">
									<span>
										<strong className="font-semibold text-slate-800">{logs.length}</strong> log
										ditampilkan
									</span>
									<span className="text-slate-300">·</span>
									<select
										value={filters.limit}
										onChange={(e) =>
											setFilters((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 }))
										}
										className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 outline-none focus:border-slate-400"
									>
										{[50, 100, 200, 500, 1000].map((option) => (
											<option key={option} value={option}>
												{option} / halaman
											</option>
										))}
									</select>
								</div>

								<div className="flex items-center gap-1">
									<button
										onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
										disabled={filters.page <= 1}
										className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
										aria-label="Halaman sebelumnya"
									>
										<FiChevronLeft className="h-4 w-4" />
									</button>
									<span className="px-3 text-sm tabular-nums text-slate-600">Hal. {filters.page}</span>
									<button
										onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
										disabled={logs.length < filters.limit}
										className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
										aria-label="Halaman berikutnya"
									>
										<FiChevronRight className="h-4 w-4" />
									</button>
								</div>
							</div>
						)}
					</section>
				</div>
			</div>
		</div>
	);
};

export default ActivityLogsPage;
