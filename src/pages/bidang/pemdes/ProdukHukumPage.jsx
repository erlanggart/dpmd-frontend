import React, { useState, useEffect, useRef } from 'react';
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
	Plus,
	X,
	Upload,
	MapPin,
	Building2,
} from 'lucide-react';
import {
	PieChart, Pie, Cell, ResponsiveContainer,
	Legend as RechartsLegend, Tooltip as RechartsTooltip,
	BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import api from '../../../api';
import SelectBox from '../../../components/ui/SelectBox';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';

const JENIS_COLORS = ['#3b82f6', '#f59e0b', '#22c55e'];
const STATUS_COLORS = ['#22c55e', '#ef4444'];
const TAHUN_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81'];
const LS_KEY = 'admin_ph_selected_desa';

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

const getTodayDate = () => new Date().toISOString().split('T')[0];

const JENIS_OPTIONS = [
	{ value: 'Peraturan Desa', label: 'Peraturan Desa', singkatan: 'PERDES' },
	{ value: 'Peraturan Kepala Desa', label: 'Peraturan Kepala Desa', singkatan: 'PERKADES' },
	{ value: 'Keputusan Kepala Desa', label: 'Keputusan Kepala Desa', singkatan: 'SK_KADES' },
];

const EMPTY_FORM = {
	judul: '', nomor: '', tahun: '', jenis: 'Peraturan Desa', singkatan_jenis: 'PERDES',
	tempat_penetapan: '', tanggal_penetapan: getTodayDate(),
	sumber: '', subjek: '', status_peraturan: 'berlaku', keterangan_status: '',
};

// ── Modal Tambah Produk Hukum ────────────────────────────────────────────────
const TambahModal = ({ open, onClose, onSuccess, kecamatanList }) => {
	const fileRef = useRef(null);

	// Desa selection — baca dari localStorage
	const [sel, setSel] = useState(() => {
		try { return JSON.parse(localStorage.getItem(LS_KEY)) || { kecamatan_id: '', kecamatan_nama: '', desa_id: '', desa_nama: '' };
		} catch { return { kecamatan_id: '', kecamatan_nama: '', desa_id: '', desa_nama: '' }; }
	});
	const [desaList, setDesaList] = useState([]);
	const [loadingDesa, setLoadingDesa] = useState(false);

	// Form state
	const [form, setForm] = useState(EMPTY_FORM);
	const [file, setFile] = useState(null);
	const [submitting, setSubmitting] = useState(false);
	const [errors, setErrors] = useState({});

	// Load desa when kecamatan selected
	useEffect(() => {
		if (!sel.kecamatan_id) { setDesaList([]); return; }
		setLoadingDesa(true);
		api.get(`/desas/kecamatan/${sel.kecamatan_id}`)
			.then(r => setDesaList(r.data.data || []))
			.catch(() => setDesaList([]))
			.finally(() => setLoadingDesa(false));
	}, [sel.kecamatan_id]);

	// Auto-singkatan from jenis
	useEffect(() => {
		const found = JENIS_OPTIONS.find(j => j.value === form.jenis);
		if (found) setForm(f => ({ ...f, singkatan_jenis: found.singkatan }));
	}, [form.jenis]);

	const saveSel = (next) => {
		setSel(next);
		localStorage.setItem(LS_KEY, JSON.stringify(next));
	};

	const handleKecamatanChange = (e) => {
		const id = e.target.value;
		const nama = kecamatanList.find(k => String(k.id) === id)?.nama || '';
		saveSel({ kecamatan_id: id, kecamatan_nama: nama, desa_id: '', desa_nama: '' });
	};

	const handleDesaChange = (e) => {
		const id = e.target.value;
		const nama = desaList.find(d => String(d.id) === id)?.nama || '';
		saveSel({ ...sel, desa_id: id, desa_nama: nama });
	};

	const handleField = (e) => {
		const { name, value } = e.target;
		setForm(f => ({ ...f, [name]: value }));
		if (errors[name]) setErrors(er => ({ ...er, [name]: null }));
	};

	const validate = () => {
		const err = {};
		if (!sel.desa_id) err.desa = 'Pilih desa terlebih dahulu';
		if (!form.judul.trim()) err.judul = 'Judul wajib diisi';
		if (!form.nomor.trim()) err.nomor = 'Nomor wajib diisi';
		if (!form.tahun || !/^\d{4}$/.test(form.tahun)) err.tahun = 'Tahun harus 4 digit angka';
		if (!form.tempat_penetapan.trim()) err.tempat_penetapan = 'Tempat penetapan wajib diisi';
		if (!form.tanggal_penetapan) err.tanggal_penetapan = 'Tanggal penetapan wajib diisi';
		setErrors(err);
		return Object.keys(err).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!validate()) return;
		setSubmitting(true);
		try {
			const fd = new FormData();
			Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ''));
			if (file) fd.append('file', file);
			await api.post(`/produk-hukum?desa_id=${sel.desa_id}`, fd, {
				headers: { 'Content-Type': 'multipart/form-data' },
			});
			toast.success(`Produk hukum berhasil ditambahkan untuk ${sel.desa_nama}`);
			// Reset form tapi PERTAHANKAN pilihan desa/kecamatan di localStorage
			setForm(EMPTY_FORM);
			setFile(null);
			if (fileRef.current) fileRef.current.value = '';
			setErrors({});
			onSuccess();
		} catch (err) {
			const msg = err.response?.data?.message || 'Gagal menyimpan produk hukum';
			toast.error(msg);
		} finally {
			setSubmitting(false);
		}
	};

	if (!open) return null;

	const desaSelected = !!sel.desa_id;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={e => e.target === e.currentTarget && !submitting && onClose()}>
			<div className="bg-white rounded-2xl shadow-sm w-full max-w-2xl max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-900 rounded-t-2xl">
					<div className="flex items-center gap-3">
						<div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
							<Scale className="w-4 h-4 text-white" />
						</div>
						<h3 className="text-base font-semibold text-white">Tambah Produk Hukum</h3>
					</div>
					<button onClick={onClose} disabled={submitting} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition">
						<X className="w-5 h-5" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="p-6 space-y-5">
					{/* ── Pilihan Desa (tersimpan di localStorage) ── */}
					<div className="bg-slate-100 border border-slate-200 rounded-xl p-4 space-y-3">
						<p className="text-xs font-semibold text-brand-700 flex items-center gap-1.5 uppercase tracking-wide">
							<MapPin className="w-3.5 h-3.5" />
							Pilih Desa — tersimpan otomatis
						</p>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="block text-xs font-medium text-slate-600 mb-1">Kecamatan <span className="text-red-500">*</span></label>
								<SelectBox
									value={sel.kecamatan_id}
									onChange={(value) => handleKecamatanChange({ target: { value } })}
									placeholder="Pilih Kecamatan"
									emptyText="Kecamatan tidak ditemukan"
									options={kecamatanList.map((k) => ({ value: String(k.id), label: k.nama }))}
								/>
							</div>
							<div>
								<label className="block text-xs font-medium text-slate-600 mb-1">Desa <span className="text-red-500">*</span></label>
								<SelectBox
									value={sel.desa_id}
									onChange={(value) => handleDesaChange({ target: { value } })}
									disabled={!sel.kecamatan_id || loadingDesa}
									placeholder={loadingDesa ? 'Memuat…' : 'Pilih Desa'}
									emptyText="Desa tidak ditemukan"
									options={desaList.map((d) => ({ value: String(d.id), label: d.nama }))}
								/>
								{errors.desa && <p className="text-red-500 text-xs mt-1">{errors.desa}</p>}
							</div>
						</div>
						{desaSelected && (
							<div className="flex items-center gap-2 text-xs text-brand-700 bg-slate-100 rounded-lg px-3 py-2">
								<Building2 className="w-3.5 h-3.5 flex-shrink-0" />
								<span>Input akan disimpan untuk: <strong>{sel.desa_nama}</strong> · Kec. {sel.kecamatan_nama}</span>
							</div>
						)}
					</div>

					{/* ── Form fields — hanya tampil jika desa sudah dipilih ── */}
					{desaSelected ? (
						<>
							{/* Judul */}
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-1">Judul <span className="text-red-500">*</span></label>
								<input name="judul" value={form.judul} onChange={handleField}
									placeholder="Judul produk hukum"
									className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${errors.judul ? 'border-red-400 bg-red-50' : 'border-slate-300'}`} />
								{errors.judul && <p className="text-red-500 text-xs mt-1">{errors.judul}</p>}
							</div>

							{/* Nomor + Tahun */}
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-sm font-medium text-slate-700 mb-1">Nomor <span className="text-red-500">*</span></label>
									<input name="nomor" value={form.nomor} onChange={handleField}
										placeholder="contoh: 01/2024"
										className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${errors.nomor ? 'border-red-400 bg-red-50' : 'border-slate-300'}`} />
									{errors.nomor && <p className="text-red-500 text-xs mt-1">{errors.nomor}</p>}
								</div>
								<div>
									<label className="block text-sm font-medium text-slate-700 mb-1">Tahun <span className="text-red-500">*</span></label>
									<input name="tahun" value={form.tahun} onChange={handleField}
										placeholder="2024" maxLength={4}
										className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${errors.tahun ? 'border-red-400 bg-red-50' : 'border-slate-300'}`} />
									{errors.tahun && <p className="text-red-500 text-xs mt-1">{errors.tahun}</p>}
								</div>
							</div>

							{/* Jenis */}
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-1">Jenis <span className="text-red-500">*</span></label>
								<SelectBox
									name="jenis"
									value={form.jenis}
									onChange={(value) => handleField({ target: { name: 'jenis', value } })}
									options={JENIS_OPTIONS.map((j) => ({ value: j.value, label: j.label, hint: `(${j.singkatan})` }))}
								/>
							</div>

							{/* Tempat + Tanggal Penetapan */}
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-sm font-medium text-slate-700 mb-1">Tempat Penetapan <span className="text-red-500">*</span></label>
									<input name="tempat_penetapan" value={form.tempat_penetapan} onChange={handleField}
										placeholder="Nama tempat"
										className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${errors.tempat_penetapan ? 'border-red-400 bg-red-50' : 'border-slate-300'}`} />
									{errors.tempat_penetapan && <p className="text-red-500 text-xs mt-1">{errors.tempat_penetapan}</p>}
								</div>
								<div>
									<label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Penetapan <span className="text-red-500">*</span></label>
									<input type="date" name="tanggal_penetapan" value={form.tanggal_penetapan} onChange={handleField}
										className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${errors.tanggal_penetapan ? 'border-red-400 bg-red-50' : 'border-slate-300'}`} />
									{errors.tanggal_penetapan && <p className="text-red-500 text-xs mt-1">{errors.tanggal_penetapan}</p>}
								</div>
							</div>

							{/* Subjek + Sumber */}
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-sm font-medium text-slate-700 mb-1">Subjek</label>
									<input name="subjek" value={form.subjek} onChange={handleField}
										placeholder="Subjek (opsional)"
										className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent" />
								</div>
								<div>
									<label className="block text-sm font-medium text-slate-700 mb-1">Sumber</label>
									<input name="sumber" value={form.sumber} onChange={handleField}
										placeholder="Sumber (opsional)"
										className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent" />
								</div>
							</div>

							{/* Status */}
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-1">Status Peraturan</label>
								<SelectBox
									name="status_peraturan"
									value={form.status_peraturan}
									onChange={(value) => handleField({ target: { name: 'status_peraturan', value } })}
									options={[
										{ value: 'berlaku', label: 'Berlaku' },
										{ value: 'dicabut', label: 'Dicabut' },
									]}
								/>
							</div>

							{/* File PDF */}
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-1">File PDF <span className="text-slate-400 font-normal">(opsional, maks 10MB)</span></label>
								<label className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition ${file ? 'border-brand-400 bg-slate-100' : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'}`}>
									<Upload className={`w-4 h-4 flex-shrink-0 ${file ? 'text-brand-600' : 'text-slate-400'}`} />
									<span className={`text-sm truncate ${file ? 'text-brand-700 font-medium' : 'text-slate-500'}`}>
										{file ? file.name : 'Pilih file PDF...'}
									</span>
									<input ref={fileRef} type="file" accept=".pdf" className="hidden"
										onChange={e => setFile(e.target.files[0] || null)} />
								</label>
								{file && (
									<button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}
										className="mt-1 text-xs text-red-500 hover:underline">Hapus file</button>
								)}
							</div>

							{/* Buttons */}
							<div className="flex gap-3 pt-2 border-t border-slate-100">
								<button type="button" onClick={onClose} disabled={submitting}
									className="flex-1 px-4 py-2 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition">
									Batal
								</button>
								<button type="submit" disabled={submitting}
									className="flex-1 px-4 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition flex items-center justify-center gap-2">
									{submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : <><Plus className="w-4 h-4" /> Simpan & Input Lagi</>}
								</button>
							</div>
						</>
					) : (
						<div className="text-center py-8 text-slate-400 text-sm">
							<MapPin className="w-8 h-8 mx-auto mb-2 text-slate-300" />
							Pilih kecamatan dan desa untuk mulai input
						</div>
					)}
				</form>
			</div>
		</div>
	);
};

// ── Main Page ─────────────────────────────────────────────────────────────────
// `tersemat` dipakai saat halaman ini menjadi salah satu tab di Core Dashboard
// "Produk Hukum": kepala halaman gelapnya dilepas supaya tidak ada dua judul
// bertumpuk, dan tombol Tambah pindah ke baris tindakan yang ringkas.
const ProdukHukumPage = ({ detailBasePath = '/pemdes/produk-hukum', tersemat = false }) => {
	const navigate = useNavigate();
	const { isSuperAdmin, isAdminBidangPMD, user } = useAuth();

	const isAdmin = isSuperAdmin?.() || isAdminBidangPMD?.() ||
		['kepala_dinas', 'ketua_tim', 'bendahara', 'sekretaris_dinas'].includes(user?.role);

	const [loading, setLoading] = useState(true);
	const [data, setData] = useState([]);
	const [stats, setStats] = useState(null);
	const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1, totalItems: 0 });
	const [filters, setFilters] = useState({
		search: '', kecamatan_id: '', desa_id: '', singkatan_jenis: '', tahun: '', status_peraturan: '',
	});
	const [kecamatanList, setKecamatanList] = useState([]);
	const [desaList, setDesaList] = useState([]);
	const [showFilters, setShowFilters] = useState(false);
	const [showTambah, setShowTambah] = useState(false);

	useEffect(() => {
		fetchKecamatanList();
		fetchStats();
	}, []);

	useEffect(() => { fetchData(); }, [pagination.page, filters]); // eslint-disable-line

	useEffect(() => {
		if (filters.kecamatan_id) {
			api.get(`/desas/kecamatan/${filters.kecamatan_id}`)
				.then(r => setDesaList(r.data.data || []))
				.catch(() => setDesaList([]));
		} else {
			setDesaList([]);
			setFilters(p => ({ ...p, desa_id: '' }));
		}
	}, [filters.kecamatan_id]);

	const fetchKecamatanList = async () => {
		try {
			const r = await api.get('/kecamatans');
			if (r.data.success) setKecamatanList(r.data.data || []);
		} catch (e) { console.error(e); }
	};

	const fetchStats = async () => {
		try {
			const r = await api.get('/pemdes/produk-hukum/stats');
			if (r.data.success) setStats(r.data.data);
		} catch (e) { console.error(e); }
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
			const r = await api.get(`/pemdes/produk-hukum?${params.toString()}`);
			if (r.data.success) {
				setData(r.data.data || []);
				if (r.data.pagination) setPagination(p => ({ ...p, totalPages: r.data.pagination.totalPages || 1, totalItems: r.data.pagination.totalItems || 0 }));
			}
		} catch (e) {
			console.error(e);
			toast.error('Gagal memuat data produk hukum');
		} finally {
			setLoading(false);
		}
	};

	const handleFilterChange = (key, value) => {
		setFilters(p => ({ ...p, [key]: value }));
		setPagination(p => ({ ...p, page: 1 }));
	};

	const resetFilters = () => {
		setFilters({ search: '', kecamatan_id: '', desa_id: '', singkatan_jenis: '', tahun: '', status_peraturan: '' });
		setPagination(p => ({ ...p, page: 1 }));
	};

	const getJenisLabel = (s) => ({ PERDES: 'Peraturan Desa', PERKADES: 'Peraturan Kepala Desa', SK_KADES: 'SK Kepala Desa' }[s] || s);
	const getJenisBadgeColor = (s) => ({ PERDES: 'bg-slate-100 text-slate-700', PERKADES: 'bg-amber-100 text-amber-700', SK_KADES: 'bg-green-100 text-green-700' }[s] || 'bg-slate-100 text-slate-700');

	return (
		<div className={tersemat ? '' : 'min-h-screen bg-slate-50 p-4 pt-20 sm:p-6 lg:p-8 lg:pt-8'}>
			{tersemat ? (
				isAdmin && (
					<div className="mb-5 flex justify-end">
						<button onClick={() => setShowTambah(true)}
							className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800">
							<Plus className="w-4 h-4" />
							Tambah Produk Hukum Desa
						</button>
					</div>
				)
			) : (
				<div className="bg-slate-900 rounded-xl p-6 mb-6 text-white">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<Scale className="h-7 w-7" />
							<div>
								<h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Produk Hukum Desa</h1>
								<p className="text-white/80 mt-0.5 text-sm">Data produk hukum dari seluruh desa</p>
							</div>
						</div>
						{isAdmin && (
							<button onClick={() => setShowTambah(true)}
								className="flex items-center gap-2 px-4 py-2 bg-white text-brand-700 rounded-lg font-medium text-sm hover:bg-slate-50 transition shadow-sm">
								<Plus className="w-4 h-4" />
								Tambah Produk Hukum
							</button>
						)}
					</div>
				</div>
			)}

			{/* Stats Cards */}
			{stats && (
				<>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
						{[
							{ label: 'Total Produk Hukum', value: stats.total, icon: FileText, cls: 'bg-slate-100 text-brand-600' },
							{ label: 'Berlaku', value: stats.berlaku, icon: CheckCircle, cls: 'bg-green-100 text-green-600', textCls: 'text-green-700' },
							{ label: 'Dicabut', value: stats.dicabut, icon: XCircle, cls: 'bg-red-100 text-red-600', textCls: 'text-red-700' },
							{ label: 'Jenis', value: stats.jenis?.length || 0, icon: Scale, cls: 'bg-slate-100 text-brand-600', textCls: 'text-brand-700' },
						].map(({ label, value, icon: Icon, cls, textCls }) => (
							<div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
								<div className="flex items-center gap-3">
									<div className={`h-10 w-10 rounded-lg flex items-center justify-center ${cls}`}>
										<Icon className="h-5 w-5" />
									</div>
									<div>
										<p className="text-xs text-slate-500">{label}</p>
										<p className={`text-2xl font-bold ${textCls || 'text-slate-900'}`}>{value}</p>
									</div>
								</div>
							</div>
						))}
					</div>

					{/* Charts */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
						<div className="bg-white rounded-xl border border-slate-200 p-4">
							<h3 className="text-sm font-semibold text-slate-700 mb-3">Distribusi Jenis Produk Hukum</h3>
							{stats.jenis?.length > 0 ? (
								<ResponsiveContainer width="100%" height={250}>
									<PieChart>
										<Pie data={stats.jenis} cx="50%" cy="50%" outerRadius={90} dataKey="value" nameKey="name" labelLine={false} label={renderCustomLabel}>
											{stats.jenis.map((_, i) => <Cell key={i} fill={JENIS_COLORS[i % JENIS_COLORS.length]} />)}
										</Pie>
										<RechartsTooltip formatter={(v, n) => [v, getJenisLabel(n)]} />
										<RechartsLegend formatter={v => getJenisLabel(v)} wrapperStyle={{ fontSize: '12px' }} />
									</PieChart>
								</ResponsiveContainer>
							) : <p className="text-slate-400 text-sm text-center py-10">Tidak ada data</p>}
						</div>

						<div className="bg-white rounded-xl border border-slate-200 p-4">
							<h3 className="text-sm font-semibold text-slate-700 mb-3">Status Peraturan</h3>
							{stats.status?.length > 0 ? (
								<ResponsiveContainer width="100%" height={250}>
									<PieChart>
										<Pie data={stats.status} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" nameKey="name" labelLine={false} label={renderCustomLabel}>
											{stats.status.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
										</Pie>
										<RechartsTooltip />
										<RechartsLegend wrapperStyle={{ fontSize: '12px' }} />
									</PieChart>
								</ResponsiveContainer>
							) : <p className="text-slate-400 text-sm text-center py-10">Tidak ada data</p>}
						</div>

						<div className="bg-white rounded-xl border border-slate-200 p-4">
							<h3 className="text-sm font-semibold text-slate-700 mb-3">Produk Hukum per Tahun</h3>
							{stats.tahun?.length > 0 ? (
								<ResponsiveContainer width="100%" height={250}>
									<BarChart data={stats.tahun} layout="vertical">
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis type="number" allowDecimals={false} />
										<YAxis type="category" dataKey="name" width={50} tick={{ fontSize: 11 }} />
										<RechartsTooltip />
										<Bar dataKey="value" name="Jumlah" radius={[0, 4, 4, 0]}>
											{stats.tahun.map((_, i) => <Cell key={i} fill={TAHUN_COLORS[i % TAHUN_COLORS.length]} />)}
										</Bar>
									</BarChart>
								</ResponsiveContainer>
							) : <p className="text-slate-400 text-sm text-center py-10">Tidak ada data</p>}
						</div>
					</div>
				</>
			)}

			{/* Search & Filters */}
			<div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
				<form onSubmit={e => { e.preventDefault(); setPagination(p => ({ ...p, page: 1 })); }} className="flex gap-3 mb-3">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
						<input type="text" value={filters.search} onChange={e => handleFilterChange('search', e.target.value)}
							placeholder="Cari judul, nomor, atau subjek..."
							className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent" />
					</div>
					<button type="button" onClick={() => setShowFilters(!showFilters)}
						className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition ${showFilters ? 'bg-slate-100 border-slate-300 text-brand-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
						<Filter className="h-4 w-4" />Filter
						<ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
					</button>
					<button type="button" onClick={() => { resetFilters(); fetchStats(); }}
						className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-slate-300 text-slate-600 hover:bg-slate-50">
						<RefreshCw className="h-4 w-4" />Reset
					</button>
				</form>

				{showFilters && (
					<div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-slate-200">
						<SelectBox
							size="sm"
							value={filters.kecamatan_id}
							onChange={(value) => handleFilterChange('kecamatan_id', value)}
							placeholder="Semua Kecamatan"
							emptyText="Kecamatan tidak ditemukan"
							options={[
								{ value: '', label: 'Semua Kecamatan' },
								...kecamatanList.map((k) => ({ value: String(k.id), label: k.nama })),
							]}
						/>
						<SelectBox
							size="sm"
							value={filters.desa_id}
							onChange={(value) => handleFilterChange('desa_id', value)}
							disabled={!filters.kecamatan_id}
							placeholder={filters.kecamatan_id ? 'Semua Desa' : 'Pilih kecamatan dulu'}
							emptyText="Desa tidak ditemukan"
							options={[
								{ value: '', label: 'Semua Desa' },
								...desaList.map((d) => ({ value: String(d.id), label: d.nama })),
							]}
						/>
						<SelectBox
							size="sm"
							value={filters.singkatan_jenis}
							onChange={(value) => handleFilterChange('singkatan_jenis', value)}
							placeholder="Semua Jenis"
							options={[
								{ value: '', label: 'Semua Jenis' },
								{ value: 'PERDES', label: 'PERDES' },
								{ value: 'PERKADES', label: 'PERKADES' },
								{ value: 'SK_KADES', label: 'SK KADES' },
							]}
						/>
						<SelectBox
							size="sm"
							value={filters.status_peraturan}
							onChange={(value) => handleFilterChange('status_peraturan', value)}
							placeholder="Semua Status"
							options={[
								{ value: '', label: 'Semua Status' },
								{ value: 'berlaku', label: 'Berlaku' },
								{ value: 'dicabut', label: 'Dicabut' },
							]}
						/>
						<input type="number" value={filters.tahun} onChange={e => handleFilterChange('tahun', e.target.value)}
							placeholder="Tahun"
							className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900" />
					</div>
				)}
			</div>

			{/* Data Table */}
			<div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
				<div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
					<p className="text-sm text-slate-600">
						Menampilkan <span className="font-semibold">{data.length}</span> dari <span className="font-semibold">{pagination.totalItems}</span> produk hukum
					</p>
				</div>

				{loading ? (
					<div className="flex items-center justify-center py-20">
						<Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
						<span className="ml-3 text-slate-500">Memuat data...</span>
					</div>
				) : data.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-20">
						<AlertCircle className="h-12 w-12 text-slate-300 mb-3" />
						<p className="text-slate-500">Tidak ada data produk hukum</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-slate-200">
							<thead className="bg-slate-50">
								<tr>
									{['No', 'Judul', 'Nomor', 'Jenis', 'Tahun', 'Desa', 'Status', 'Aksi'].map(h => (
										<th key={h} className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600 ${h === 'Aksi' ? 'text-center' : ''}`}>{h}</th>
									))}
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-slate-200">
								{data.map((item, i) => (
									<tr key={item.id} className="hover:bg-slate-50">
										<td className="px-4 py-3 text-sm text-slate-500">{(pagination.page - 1) * pagination.limit + i + 1}</td>
										<td className="px-4 py-3 text-sm text-slate-900 max-w-xs truncate">{item.judul}</td>
										<td className="px-4 py-3 text-sm text-slate-600">{item.nomor}</td>
										<td className="px-4 py-3">
											<span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getJenisBadgeColor(item.singkatan_jenis)}`}>
												{item.singkatan_jenis}
											</span>
										</td>
										<td className="px-4 py-3 text-sm text-slate-600">{item.tahun}</td>
										<td className="px-4 py-3 text-sm text-slate-600">
											<p className="font-medium">{item.desa?.nama || '-'}</p>
											<p className="text-xs text-slate-400">{item.desa?.kecamatan?.nama || ''}</p>
										</td>
										<td className="px-4 py-3">
											<span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${item.status_peraturan === 'berlaku' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
												{item.status_peraturan === 'berlaku' ? 'Berlaku' : 'Dicabut'}
											</span>
										</td>
										<td className="px-4 py-3 text-center">
											<button onClick={() => navigate(`${detailBasePath}/${item.id}`)}
												className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-brand-700 bg-slate-100 rounded-lg hover:bg-slate-100 transition">
												<Eye className="h-3.5 w-3.5" />Detail
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				{pagination.totalPages > 1 && (
					<div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
						<p className="text-sm text-slate-600">Halaman {pagination.page} dari {pagination.totalPages}</p>
						<div className="flex gap-2">
							<button disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
								className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
								<ChevronLeft className="h-4 w-4" />Prev
							</button>
							<button disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
								className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
								Next<ChevronRight className="h-4 w-4" />
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Modal Tambah */}
			<TambahModal
				open={showTambah}
				onClose={() => setShowTambah(false)}
				onSuccess={() => { fetchData(); fetchStats(); }}
				kecamatanList={kecamatanList}
			/>
		</div>
	);
};

export default ProdukHukumPage;
