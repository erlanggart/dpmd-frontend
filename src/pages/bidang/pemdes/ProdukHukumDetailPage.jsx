import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
	ArrowLeft,
	FileText,
	Scale,
	CheckCircle,
	XCircle,
	Loader2,
	AlertCircle,
	Download,
	MapPin,
	Calendar,
	BookOpen,
	Pencil,
	X,
	Save,
	Upload,
	File as FileIcon,
	Users,
	Building2,
	ChevronRight,
} from 'lucide-react';
import api, { updateProdukHukum } from '../../../api';
import Swal from 'sweetalert2';

const INPUT_CLASS =
	'w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all';

const KELEMBAGAAN_CONFIG = {
	rws: { label: 'RW', route: (id) => `/bidang/pmd/kelembagaan/rw/${id}`, displayName: (item) => `RW ${item.nomor}` },
	rts: { label: 'RT', route: (id) => `/bidang/pmd/kelembagaan/rt/${id}`, displayName: (item) => `RT ${item.nomor}${item.rws ? ` / RW ${item.rws.nomor}` : ''}` },
	posyandus: { label: 'Posyandu', route: (id) => `/bidang/pmd/kelembagaan/posyandu/${id}`, displayName: (item) => item.nama },
	karang_tarunas: { label: 'Karang Taruna', route: (id) => `/bidang/pmd/kelembagaan/karang-taruna/${id}`, displayName: (item) => item.nama },
	lpms: { label: 'LPM', route: (id) => `/bidang/pmd/kelembagaan/lpm/${id}`, displayName: (item) => item.nama },
	pkks: { label: 'PKK', route: (id) => `/bidang/pmd/kelembagaan/pkk/${id}`, displayName: (item) => item.nama },
	satlinmas: { label: 'Satlinmas', route: (id) => `/bidang/pmd/kelembagaan/satlinmas/${id}`, displayName: () => 'Satlinmas' },
	lembaga_lainnyas: { label: 'Lembaga Lainnya', route: (id) => `/bidang/pmd/kelembagaan/lembaga-lainnya/${id}`, displayName: (item) => item.nama },
};

const JENIS_BADGE_COLOR = {
	PERDES: 'bg-blue-100 text-blue-700',
	PERKADES: 'bg-amber-100 text-amber-700',
	SK_KADES: 'bg-green-100 text-green-700',
	'Peraturan Desa': 'bg-blue-100 text-blue-700',
	'Peraturan Kepala Desa': 'bg-amber-100 text-amber-700',
	'Keputusan Kepala Desa': 'bg-green-100 text-green-700',
};

const JENIS_TO_SINGKATAN = {
	'Peraturan Desa': 'PERDES',
	'Peraturan Kepala Desa': 'PERKADES',
	'Keputusan Kepala Desa': 'SK KADES',
};

const getJenisLabel = (key) => {
	const map = {
		PERDES: 'Peraturan Desa',
		PERKADES: 'Peraturan Kepala Desa',
		SK_KADES: 'SK Kepala Desa',
	};
	return map[key] || key;
};

const formatDate = (dateStr) => {
	if (!dateStr) return '-';
	return new Date(dateStr).toLocaleDateString('id-ID', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	});
};

const formatDateInput = (dateStr) => {
	if (!dateStr) return '';
	const d = new Date(dateStr);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const DetailRow = ({ label, value }) => (
	<div>
		<p className="text-xs text-gray-500 mb-0.5">{label}</p>
		<div className="text-sm font-medium text-gray-900">{value || '-'}</div>
	</div>
);

const FormRow = ({ label, required, error, children }) => (
	<div>
		<label className="text-xs text-gray-500 mb-1 block">
			{label} {required && <span className="text-red-500">*</span>}
		</label>
		{children}
		{error && (
			<p className="text-red-500 text-xs mt-1">⚠ {error}</p>
		)}
	</div>
);

const ProdukHukumDetailPage = ({
	backPath,
	apiPrefix = '/pemdes/produk-hukum',
	editable = false,
}) => {
	const { id } = useParams();
	const navigate = useNavigate();

	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
	const [pdfLoading, setPdfLoading] = useState(false);

	const [isEditing, setIsEditing] = useState(false);
	const [formData, setFormData] = useState({});
	const [formErrors, setFormErrors] = useState({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
	const [selectedFile, setSelectedFile] = useState(null);

	const [relatedData, setRelatedData] = useState(null);
	const [relatedLoading, setRelatedLoading] = useState(false);

	const handleBack = () => {
		if (backPath) {
			navigate(backPath);
			return;
		}
		navigate(-1);
	};

	/* ───── Fetch detail ───── */
	useEffect(() => {
		let active = true;
		const fetchDetail = async () => {
			try {
				setLoading(true);
				setError(null);
				const res = await api.get(`${apiPrefix}/${id}`);
				if (!active) return;
				if (res.data.success) {
					setData(res.data.data);
					if (res.data.data.file) fetchPdf(res.data.data.id);
				} else {
					setError('Gagal mengambil data produk hukum.');
				}
			} catch (err) {
				if (!active) return;
				console.error(err);
				setError('Gagal memuat data produk hukum.');
			} finally {
				if (active) setLoading(false);
			}
		};
		fetchDetail();
		return () => {
			active = false;
		};
	}, [id, apiPrefix]);

	/* ───── Fetch related kelembagaan & pengurus ───── */
	useEffect(() => {
		let active = true;
		const fetchRelated = async () => {
			setRelatedLoading(true);
			try {
				const res = await api.get(`${apiPrefix}/${id}/related`);
				if (!active) return;
				if (res.data.success) setRelatedData(res.data.data);
			} catch (err) {
				if (!active) return;
				console.error('Error fetching related:', err);
			} finally {
				if (active) setRelatedLoading(false);
			}
		};
		fetchRelated();
		return () => { active = false; };
	}, [id, apiPrefix]);

	useEffect(() => {
		return () => {
			if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
		};
	}, [pdfBlobUrl]);

	const fetchPdf = async (produkHukumId) => {
		try {
			setPdfLoading(true);
			const token = localStorage.getItem('expressToken');
			const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api';
			const res = await fetch(`${apiUrl}/produk-hukum/${produkHukumId}/download`, {
				method: 'GET',
				headers: { Authorization: `Bearer ${token}` },
			});
			if (res.ok) {
				const blob = await res.blob();
				setPdfBlobUrl(URL.createObjectURL(blob));
			}
		} catch (err) {
			console.error('Error fetching PDF:', err);
		} finally {
			setPdfLoading(false);
		}
	};

	/* ───── Edit mode ───── */
	const enterEdit = () => {
		setFormData({
			judul: data.judul || '',
			nomor: data.nomor || '',
			tahun: data.tahun ? String(data.tahun) : '',
			jenis: data.jenis || 'Peraturan Desa',
			singkatan_jenis: data.singkatan_jenis || 'PERDES',
			tempat_penetapan: data.tempat_penetapan || '',
			tanggal_penetapan: formatDateInput(data.tanggal_penetapan),
			sumber: data.sumber || '',
			subjek: data.subjek || '',
			status_peraturan: data.status_peraturan || 'berlaku',
			keterangan_status: data.keterangan_status || '',
		});
		setSelectedFile(null);
		setFormErrors({});
		setIsEditing(true);
	};

	const cancelEdit = () => {
		setIsEditing(false);
		setFormErrors({});
		setSelectedFile(null);
	};

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => {
			const next = { ...prev, [name]: value };
			if (name === 'jenis') next.singkatan_jenis = JENIS_TO_SINGKATAN[value] || prev.singkatan_jenis;
			return next;
		});
		if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: null }));
	};

	const validate = () => {
		const errs = {};
		if (!formData.judul?.trim()) errs.judul = 'Judul tidak boleh kosong';
		if (!formData.nomor?.trim()) errs.nomor = 'Nomor tidak boleh kosong';
		if (!formData.tahun?.trim() || formData.tahun.length < 4) errs.tahun = 'Tahun harus 4 digit';
		if (!formData.tempat_penetapan?.trim()) errs.tempat_penetapan = 'Tempat penetapan wajib diisi';
		if (!formData.tanggal_penetapan) errs.tanggal_penetapan = 'Tanggal penetapan wajib diisi';
		return errs;
	};

	const handleSave = async () => {
		const errs = validate();
		if (Object.keys(errs).length) {
			setFormErrors(errs);
			return;
		}
		setIsSubmitting(true);
		try {
			Swal.fire({
				title: 'Memperbarui produk hukum...',
				text: 'Mohon tunggu.',
				allowOutsideClick: false,
				allowEscapeKey: false,
				showConfirmButton: false,
				didOpen: () => Swal.showLoading(),
			});
			const payload = { ...formData };
			if (selectedFile) payload.file = selectedFile;
			await updateProdukHukum(data.id, payload);
			const res = await api.get(`${apiPrefix}/${id}`);
			if (res.data.success) {
				setData(res.data.data);
				if (res.data.data.file) {
					if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
					setPdfBlobUrl(null);
					fetchPdf(res.data.data.id);
				}
			}
			setIsEditing(false);
			Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Produk hukum diperbarui.', timer: 2000, showConfirmButton: false });
		} catch (err) {
			console.error(err);
			Swal.fire({ icon: 'error', title: 'Gagal!', text: err.response?.data?.message || 'Terjadi kesalahan.' });
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleStatusChange = async () => {
		const next = data.status_peraturan === 'berlaku' ? 'dicabut' : 'berlaku';
		const result = await Swal.fire({
			title: 'Konfirmasi',
			text: `Ubah status menjadi "${next}"?`,
			icon: 'warning',
			showCancelButton: true,
			confirmButtonText: 'Ya, ubah!',
			cancelButtonText: 'Batal',
		});
		if (!result.isConfirmed) return;
		setIsUpdatingStatus(true);
		try {
			const res = await api.put(`/produk-hukum/${id}/status`, { status_peraturan: next });
			if (res.data?.success) {
				setData(res.data.data);
				Swal.fire('Berhasil!', 'Status telah diubah.', 'success');
			}
		} catch (err) {
			console.error(err);
			Swal.fire('Gagal!', 'Terjadi kesalahan.', 'error');
		} finally {
			setIsUpdatingStatus(false);
		}
	};

	/* ───── Dropzone ───── */
	const onDrop = useCallback(
		(accepted) => {
			if (accepted.length) {
				setSelectedFile(accepted[0]);
				if (formErrors.file) setFormErrors((p) => ({ ...p, file: null }));
			}
		},
		[formErrors.file],
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: { 'application/pdf': ['.pdf'] },
		multiple: false,
		noClick: !isEditing,
		noDrag: !isEditing,
	});

	/* ───── Render gates ───── */
	if (loading) {
		return (
			<div className="min-h-[60vh] flex items-center justify-center">
				<Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
				<span className="text-gray-500 text-lg ml-3">Memuat data...</span>
			</div>
		);
	}

	if (error || !data) {
		return (
			<div className="min-h-[60vh] flex flex-col items-center justify-center">
				<AlertCircle className="h-16 w-16 text-red-300 mb-4" />
				<p className="text-gray-600 text-lg mb-4">{error || 'Data tidak ditemukan'}</p>
				<button onClick={handleBack} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition">
					<ArrowLeft className="h-4 w-4" /> Kembali
				</button>
			</div>
		);
	}

	const isBerlaku = data.status_peraturan === 'berlaku';
	const inputCls = (f) => `${INPUT_CLASS} ${formErrors[f] ? 'border-red-400 bg-red-50' : 'border-gray-300'}`;

	return (
		<div className="space-y-6 p-6">
			{/* ── Header ── */}
			<div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-6 text-white">
				<div className="flex items-center justify-between mb-3">
					<button onClick={handleBack} className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition">
						<ArrowLeft className="h-4 w-4" /> Kembali
					</button>

					{editable && !isEditing && (
						<div className="flex items-center gap-2">
							<button onClick={enterEdit} className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition">
								<Pencil className="h-4 w-4" /> Edit
							</button>
							<button
								onClick={handleStatusChange}
								disabled={isUpdatingStatus}
								className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition disabled:opacity-50 ${isBerlaku ? 'bg-amber-500/80 hover:bg-amber-500' : 'bg-emerald-500/80 hover:bg-emerald-500'}`}
							>
								{isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : isBerlaku ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
								{isUpdatingStatus ? 'Memproses...' : isBerlaku ? 'Cabut Peraturan' : 'Berlakukan'}
							</button>
						</div>
					)}

					{isEditing && (
						<div className="flex items-center gap-2">
							<button onClick={cancelEdit} className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition">
								<X className="h-4 w-4" /> Batal
							</button>
							<button onClick={handleSave} disabled={isSubmitting} className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-gray-100 text-teal-700 rounded-lg text-sm font-medium transition disabled:opacity-50">
								{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
								{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
							</button>
						</div>
					)}
				</div>

				<div className="flex items-center gap-3 mb-2">
					<Scale className="h-7 w-7" />
					<h1 className="text-2xl font-bold">{isEditing ? 'Edit Produk Hukum' : 'Detail Produk Hukum'}</h1>
				</div>
				<p className="text-teal-100 mt-1">{isEditing ? formData.judul || data.judul : data.judul}</p>
			</div>

			{/* ── Content grid ── */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Left column */}
				<div className="lg:col-span-1 space-y-6">
					{/* Informasi Umum */}
					<div className="bg-white rounded-xl border border-gray-200 p-5">
						<h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
							<FileText className="h-4 w-4 text-teal-600" /> Informasi Umum
						</h3>
						<div className="space-y-3">
							{isEditing ? (
								<>
									<FormRow label="Judul" required error={formErrors.judul}>
										<input type="text" name="judul" value={formData.judul} onChange={handleChange} className={inputCls('judul')} placeholder="Masukkan judul" />
									</FormRow>
									<div className="grid grid-cols-2 gap-3">
										<FormRow label="Nomor" required error={formErrors.nomor}>
											<input type="text" name="nomor" value={formData.nomor} onChange={handleChange} className={inputCls('nomor')} placeholder="123/XYZ/2023" />
										</FormRow>
										<FormRow label="Tahun" required error={formErrors.tahun}>
											<input type="text" name="tahun" value={formData.tahun} onChange={handleChange} className={inputCls('tahun')} maxLength="4" placeholder="2025" />
										</FormRow>
									</div>
									<FormRow label="Jenis" required>
										<select name="jenis" value={formData.jenis} onChange={handleChange} className={`${INPUT_CLASS} border-gray-300 bg-white`}>
											<option value="Peraturan Desa">Peraturan Desa</option>
											<option value="Peraturan Kepala Desa">Peraturan Kepala Desa</option>
											<option value="Keputusan Kepala Desa">Keputusan Kepala Desa</option>
										</select>
									</FormRow>
									<FormRow label="Singkatan">
										<input type="text" value={formData.singkatan_jenis} disabled className={`${INPUT_CLASS} border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed`} />
									</FormRow>
								</>
							) : (
								<>
									<DetailRow label="Judul" value={data.judul} />
									<DetailRow label="Nomor" value={data.nomor} />
									<DetailRow
										label="Jenis"
										value={
											<span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${JENIS_BADGE_COLOR[data.singkatan_jenis || data.jenis] || 'bg-gray-100 text-gray-700'}`}>
												{data.jenis_label || getJenisLabel(data.singkatan_jenis) || data.jenis}
											</span>
										}
									/>
									<DetailRow label="Tahun" value={data.tahun} />
									<DetailRow label="Tipe Dokumen" value={data.tipe_dokumen || '-'} />
								</>
							)}
						</div>
					</div>

					{/* Penetapan */}
					<div className="bg-white rounded-xl border border-gray-200 p-5">
						<h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
							<Calendar className="h-4 w-4 text-teal-600" /> Penetapan
						</h3>
						<div className="space-y-3">
							{isEditing ? (
								<>
									<FormRow label="Tempat Penetapan" required error={formErrors.tempat_penetapan}>
										<input type="text" name="tempat_penetapan" value={formData.tempat_penetapan} onChange={handleChange} className={inputCls('tempat_penetapan')} placeholder="Desa Sukamaju" />
									</FormRow>
									<FormRow label="Tanggal Penetapan" required error={formErrors.tanggal_penetapan}>
										<input type="date" name="tanggal_penetapan" value={formData.tanggal_penetapan} onChange={handleChange} className={inputCls('tanggal_penetapan')} />
									</FormRow>
								</>
							) : (
								<>
									<DetailRow label="Tanggal Penetapan" value={formatDate(data.tanggal_penetapan)} />
									<DetailRow label="Tempat Penetapan" value={data.tempat_penetapan || '-'} />
								</>
							)}
						</div>
					</div>

					{/* Status & Info Tambahan */}
					<div className="bg-white rounded-xl border border-gray-200 p-5">
						<h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
							<BookOpen className="h-4 w-4 text-teal-600" /> Status & Informasi Tambahan
						</h3>
						<div className="space-y-3">
							{isEditing ? (
								<>
									<FormRow label="Status Peraturan" required>
										<select name="status_peraturan" value={formData.status_peraturan} onChange={handleChange} className={`${INPUT_CLASS} border-gray-300 bg-white`}>
											<option value="berlaku">Berlaku</option>
											<option value="dicabut">Dicabut</option>
										</select>
									</FormRow>
									<FormRow label="Keterangan Status">
										<input type="text" name="keterangan_status" value={formData.keterangan_status} onChange={handleChange} className={`${INPUT_CLASS} border-gray-300`} placeholder="Opsional" />
									</FormRow>
									<FormRow label="Sumber">
										<input type="text" name="sumber" value={formData.sumber} onChange={handleChange} className={`${INPUT_CLASS} border-gray-300`} placeholder="LDes Tahun 2025 Nomor 5" />
									</FormRow>
									<FormRow label="Subjek">
										<input type="text" name="subjek" value={formData.subjek} onChange={handleChange} className={`${INPUT_CLASS} border-gray-300`} placeholder="Kependudukan, Pembangunan" />
									</FormRow>
								</>
							) : (
								<>
									<DetailRow
										label="Status"
										value={
											<span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${isBerlaku ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
												{isBerlaku ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
												{isBerlaku ? 'Berlaku' : 'Dicabut'}
											</span>
										}
									/>
									{data.keterangan_status && <DetailRow label="Keterangan Status" value={data.keterangan_status} />}
									<DetailRow label="Bidang Hukum" value={data.bidang_hukum || '-'} />
									<DetailRow label="Bahasa" value={data.bahasa || '-'} />
									<DetailRow label="Sumber" value={data.sumber || '-'} />
									{data.subjek && <DetailRow label="Subjek" value={data.subjek} />}
								</>
							)}
						</div>
					</div>

					{/* Asal Desa — always read-only */}
					{data.desa && (
						<div className="bg-white rounded-xl border border-gray-200 p-5">
							<h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
								<MapPin className="h-4 w-4 text-teal-600" /> Asal Desa
							</h3>
							<div className="space-y-3">
								<DetailRow label="Desa" value={data.desa?.nama || '-'} />
								<DetailRow label="Kecamatan" value={data.desa?.kecamatan?.nama || '-'} />
							</div>
						</div>
					)}
				</div>

				{/* Right column — PDF / File upload */}
				<div className="lg:col-span-2">
					<div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-4">
						<div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
							<h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
								<FileText className="h-4 w-4 text-teal-600" />
								{isEditing ? 'Ganti Dokumen' : 'Dokumen'}
							</h3>
							{!isEditing && pdfBlobUrl && (
								<a href={pdfBlobUrl} download={`${data.nomor || 'dokumen'}.pdf`} className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs hover:bg-teal-700 transition">
									<Download className="h-3.5 w-3.5" /> Download
								</a>
							)}
						</div>

						<div className="p-0">
							{/* Upload area (edit mode only) */}
							{isEditing && (
								<div className="p-5 border-b border-gray-200 bg-gray-50">
									<div
										{...getRootProps()}
										className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${isDragActive ? 'border-teal-500 bg-teal-50' : 'border-gray-300 hover:border-teal-400 hover:bg-teal-50'}`}
									>
										<input {...getInputProps()} />
										{selectedFile ? (
											<div className="flex flex-col items-center text-green-600">
												<FileIcon className="h-10 w-10 mb-2" />
												<p className="font-medium text-sm">{selectedFile.name}</p>
												<p className="text-xs text-gray-500 mt-1">({(selectedFile.size / 1024).toFixed(1)} KB)</p>
												<p className="text-xs text-gray-400 mt-2">Klik atau seret file lain untuk mengganti</p>
											</div>
										) : (
											<div className="flex flex-col items-center text-gray-500">
												<Upload className="h-10 w-10 mb-2 text-gray-400" />
												<p className="text-sm font-medium text-gray-700">Seret & lepas file PDF baru, atau klik untuk memilih</p>
												<p className="text-xs text-gray-500 mt-1">Maks 10 MB · Format PDF · Kosongkan jika tidak ingin mengganti</p>
											</div>
										)}
									</div>
									{data.file && !selectedFile && (
										<p className="text-xs text-gray-500 mt-3">
											Dokumen saat ini: <span className="font-medium text-gray-700">{data.file}</span>
										</p>
									)}
								</div>
							)}

							{/* PDF Preview */}
							{pdfLoading ? (
								<div className="flex items-center justify-center bg-gray-50" style={{ height: isEditing ? '50vh' : '75vh' }}>
									<div className="flex flex-col items-center gap-3">
										<Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
										<p className="text-gray-500 text-sm">Memuat dokumen PDF...</p>
									</div>
								</div>
							) : pdfBlobUrl ? (
								<iframe src={pdfBlobUrl} title={data.judul} className="w-full border-0" style={{ height: isEditing ? '50vh' : '75vh' }} />
							) : data.file ? (
								<div className="flex items-center justify-center bg-gray-50" style={{ height: isEditing ? '50vh' : '65vh' }}>
									<div className="flex flex-col items-center gap-3">
										<AlertCircle className="h-10 w-10 text-gray-300" />
										<p className="text-gray-500 text-sm">Gagal memuat dokumen PDF</p>
									</div>
								</div>
							) : (
								<div className="flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 m-4 rounded-lg" style={{ height: isEditing ? '40vh' : '65vh' }}>
									<div className="flex flex-col items-center gap-3">
										<FileText className="h-10 w-10 text-gray-300" />
										<p className="text-gray-500 text-sm">Tidak ada file dokumen</p>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* ── Related Kelembagaan & Pengurus ── */}
			<div className="bg-white rounded-xl border border-gray-200 p-5">
				<h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
					<Users className="h-4 w-4 text-teal-600" />
					Terkait dengan Produk Hukum Ini
					{!relatedLoading && relatedData && (() => {
						const total =
							Object.values(relatedData.kelembagaan).reduce((s, a) => s + a.length, 0) +
							relatedData.pengurus.length +
							relatedData.aparatur_desa.length;
						return total > 0 ? (
							<span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-teal-100 text-teal-700 rounded-full">{total}</span>
						) : null;
					})()}
				</h3>

				{relatedLoading ? (
					<div className="flex items-center gap-2 text-sm text-gray-500 py-4">
						<Loader2 className="h-4 w-4 animate-spin text-teal-500" />
						Memuat data terkait...
					</div>
				) : !relatedData ? null : (() => {
					const kelembagaanEntries = Object.entries(relatedData.kelembagaan).filter(([, arr]) => arr.length > 0);
					const hasKelembagaan = kelembagaanEntries.length > 0;
					const hasPengurus = relatedData.pengurus.length > 0;
					const hasAparatur = relatedData.aparatur_desa.length > 0;
					const hasAny = hasKelembagaan || hasPengurus || hasAparatur;

					if (!hasAny) {
						return (
							<div className="flex items-center gap-3 py-6 text-sm text-gray-400">
								<Building2 className="h-5 w-5 flex-shrink-0" />
								<span>Tidak ada kelembagaan atau pengurus yang terkait dengan produk hukum ini.</span>
							</div>
						);
					}

					return (
						<div className="space-y-5">
							{/* Kelembagaan */}
							{hasKelembagaan && (
								<div>
									<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
										<Building2 className="h-3.5 w-3.5" /> Kelembagaan
									</p>
									<div className="space-y-3">
										{kelembagaanEntries.map(([type, items]) => {
											const config = KELEMBAGAAN_CONFIG[type];
											if (!config) return null;
											return (
												<div key={type}>
													<p className="text-xs text-gray-400 mb-1.5">{config.label}</p>
													<div className="flex flex-wrap gap-2">
														{items.map((item) => (
															<Link
																key={item.id}
																to={config.route(item.id)}
																className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
															>
																{config.displayName(item)}
																{item.desas?.nama && (
																	<span className="text-teal-500">· {item.desas.nama}</span>
																)}
																<span className={`ml-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.status_kelembagaan === 'aktif' ? 'bg-green-500' : 'bg-red-400'}`} />
																<ChevronRight className="h-3 w-3 text-teal-400" />
															</Link>
														))}
													</div>
												</div>
											);
										})}
									</div>
								</div>
							)}

							{/* Pengurus */}
							{hasPengurus && (
								<div>
									<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
										<Users className="h-3.5 w-3.5" /> Pengurus Kelembagaan
									</p>
									<div className="overflow-x-auto">
										<table className="w-full text-xs">
											<thead>
												<tr className="bg-gray-50 text-gray-500">
													<th className="text-left px-3 py-2 font-semibold rounded-l-lg">Nama</th>
													<th className="text-left px-3 py-2 font-semibold">Jabatan</th>
													<th className="text-left px-3 py-2 font-semibold">Desa</th>
													<th className="text-left px-3 py-2 font-semibold">Status</th>
													<th className="px-3 py-2 rounded-r-lg" />
												</tr>
											</thead>
											<tbody className="divide-y divide-gray-100">
												{relatedData.pengurus.map((p) => (
													<tr key={p.id} className="hover:bg-gray-50 transition-colors">
														<td className="px-3 py-2 font-medium text-gray-800">{p.nama_lengkap}</td>
														<td className="px-3 py-2 text-gray-600">{p.jabatan}</td>
														<td className="px-3 py-2 text-gray-500">{p.desas?.nama || '-'}</td>
														<td className="px-3 py-2">
															<span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${p.status_jabatan === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
																{p.status_jabatan === 'aktif' ? 'Aktif' : 'Selesai'}
															</span>
														</td>
														<td className="px-3 py-2">
															<Link to={`/bidang/pmd/pengurus/${p.id}`} className="text-teal-600 hover:text-teal-800 transition-colors">
																<ChevronRight className="h-4 w-4" />
															</Link>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</div>
							)}

							{/* Aparatur Desa */}
							{hasAparatur && (
								<div>
									<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
										<Users className="h-3.5 w-3.5" /> Aparatur Desa
									</p>
									<div className="overflow-x-auto">
										<table className="w-full text-xs">
											<thead>
												<tr className="bg-gray-50 text-gray-500">
													<th className="text-left px-3 py-2 font-semibold rounded-l-lg">Nama</th>
													<th className="text-left px-3 py-2 font-semibold">Jabatan</th>
													<th className="text-left px-3 py-2 font-semibold rounded-r-lg">Desa</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-gray-100">
												{relatedData.aparatur_desa.map((a) => (
													<tr key={a.id} className="hover:bg-gray-50 transition-colors">
														<td className="px-3 py-2 font-medium text-gray-800">{a.nama_lengkap}</td>
														<td className="px-3 py-2 text-gray-600">{a.jabatan}</td>
														<td className="px-3 py-2 text-gray-500">{a.desas?.nama || '-'}</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</div>
							)}
						</div>
					);
				})()}
			</div>
		</div>
	);
};

export default ProdukHukumDetailPage;
