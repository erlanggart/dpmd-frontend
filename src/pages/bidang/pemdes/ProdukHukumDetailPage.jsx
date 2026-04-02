import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import api from '../../../api';
import toast from 'react-hot-toast';

const ProdukHukumDetailPage = ({ backPath }) => {
	const { id } = useParams();
	const navigate = useNavigate();
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
	const [pdfLoading, setPdfLoading] = useState(false);

	const handleBack = () => {
		if (backPath) {
			navigate(backPath);
			return;
		}

		navigate(-1);
	};

	useEffect(() => {
		fetchDetail();
		return () => {
			if (pdfBlobUrl) {
				URL.revokeObjectURL(pdfBlobUrl);
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id]);

	const fetchDetail = async () => {
		try {
			setLoading(true);
			const response = await api.get(`/pemdes/produk-hukum/${id}`);
			if (response.data.success) {
				setData(response.data.data);
				if (response.data.data.file) {
					fetchPdfFile(response.data.data.id);
				}
			} else {
				setError('Gagal mengambil data produk hukum.');
			}
		} catch (err) {
			console.error(err);
			setError('Gagal memuat data produk hukum.');
			toast.error('Gagal memuat data produk hukum');
		} finally {
			setLoading(false);
		}
	};

	const fetchPdfFile = async (produkHukumId) => {
		try {
			setPdfLoading(true);
			const token = localStorage.getItem('expressToken');
			const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api';

			const response = await fetch(`${apiUrl}/produk-hukum/${produkHukumId}/download`, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			if (response.ok) {
				const blob = await response.blob();
				const blobUrl = URL.createObjectURL(blob);
				setPdfBlobUrl(blobUrl);
			} else {
				console.error('Failed to fetch PDF:', response.statusText);
			}
		} catch (error) {
			console.error('Error fetching PDF file:', error);
		} finally {
			setPdfLoading(false);
		}
	};

	const formatDate = (dateStr) => {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
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

	if (loading) {
		return (
			<div className="min-h-screen p-8 flex items-center justify-center">
				<div className="flex items-center gap-3">
					<Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
					<span className="text-gray-500 text-lg">Memuat data...</span>
				</div>
			</div>
		);
	}

	if (error || !data) {
		return (
			<div className="min-h-screen p-8">
				<div className="flex flex-col items-center justify-center py-20">
					<AlertCircle className="h-16 w-16 text-red-300 mb-4" />
					<p className="text-gray-600 text-lg mb-4">{error || 'Data tidak ditemukan'}</p>
					<button
						onClick={handleBack}
						className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
					>
						<ArrowLeft className="h-4 w-4" />
						Kembali
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen p-8">
			{/* Header */}
			<div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-6 mb-6 text-white">
				<div className="flex items-center gap-4 mb-3">
					<button
						onClick={handleBack}
						className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition"
					>
						<ArrowLeft className="h-4 w-4" />
						Kembali
					</button>
				</div>
				<div className="flex items-center gap-3 mb-2">
					<Scale className="h-7 w-7" />
					<h1 className="text-2xl font-bold">Detail Produk Hukum</h1>
				</div>
				<p className="text-teal-100 mt-1">{data.judul}</p>
			</div>

			{/* Info Cards */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
				{/* Left column - Details */}
				<div className="lg:col-span-1 space-y-6">
					{/* Informasi Umum */}
					<div className="bg-white rounded-xl border border-gray-200 p-5">
						<h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
							<FileText className="h-4 w-4 text-teal-600" />
							Informasi Umum
						</h3>
						<div className="space-y-3">
							<DetailRow label="Judul" value={data.judul} />
							<DetailRow label="Nomor" value={data.nomor} />
							<DetailRow
								label="Jenis"
								value={
									<span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getJenisBadgeColor(data.singkatan_jenis)}`}>
										{data.jenis_label || getJenisLabel(data.singkatan_jenis)}
									</span>
								}
							/>
							<DetailRow label="Tahun" value={data.tahun} />
							<DetailRow label="Tipe Dokumen" value={data.tipe_dokumen || '-'} />
						</div>
					</div>

					{/* Penetapan */}
					<div className="bg-white rounded-xl border border-gray-200 p-5">
						<h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
							<Calendar className="h-4 w-4 text-teal-600" />
							Penetapan
						</h3>
						<div className="space-y-3">
							<DetailRow label="Tanggal Penetapan" value={formatDate(data.tanggal_penetapan)} />
							<DetailRow label="Tempat Penetapan" value={data.tempat_penetapan || '-'} />
						</div>
					</div>

					{/* Status & Hukum */}
					<div className="bg-white rounded-xl border border-gray-200 p-5">
						<h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
							<BookOpen className="h-4 w-4 text-teal-600" />
							Status & Hukum
						</h3>
						<div className="space-y-3">
							<DetailRow
								label="Status"
								value={
									<span
										className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
											data.status_peraturan === 'berlaku'
												? 'bg-green-100 text-green-700'
												: 'bg-red-100 text-red-700'
										}`}
									>
										{data.status_peraturan === 'berlaku' ? (
											<CheckCircle className="h-3 w-3" />
										) : (
											<XCircle className="h-3 w-3" />
										)}
										{data.status_peraturan === 'berlaku' ? 'Berlaku' : 'Dicabut'}
									</span>
								}
							/>
							{data.keterangan_status && <DetailRow label="Keterangan Status" value={data.keterangan_status} />}
							<DetailRow label="Bidang Hukum" value={data.bidang_hukum || '-'} />
							<DetailRow label="Bahasa" value={data.bahasa || '-'} />
							<DetailRow label="Sumber" value={data.sumber || '-'} />
						</div>
					</div>

					{/* Desa */}
					<div className="bg-white rounded-xl border border-gray-200 p-5">
						<h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
							<MapPin className="h-4 w-4 text-teal-600" />
							Asal Desa
						</h3>
						<div className="space-y-3">
							<DetailRow label="Desa" value={data.desa?.nama || '-'} />
							<DetailRow label="Kecamatan" value={data.desa?.kecamatan?.nama || '-'} />
						</div>
					</div>

					{/* Subjek */}
					{data.subjek && (
						<div className="bg-white rounded-xl border border-gray-200 p-5">
							<h3 className="text-sm font-semibold text-gray-700 mb-3">Subjek</h3>
							<p className="text-sm text-gray-800">{data.subjek}</p>
						</div>
					)}
				</div>

				{/* Right column - PDF Viewer */}
				<div className="lg:col-span-2">
					<div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-4">
						<div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
							<h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
								<FileText className="h-4 w-4 text-teal-600" />
								Dokumen
							</h3>
							{pdfBlobUrl && (
								<a
									href={pdfBlobUrl}
									download={`${data.nomor || 'dokumen'}.pdf`}
									className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs hover:bg-teal-700 transition"
								>
									<Download className="h-3.5 w-3.5" />
									Download
								</a>
							)}
						</div>
						<div className="p-0">
							{pdfLoading ? (
								<div className="flex items-center justify-center h-[75vh] bg-gray-50">
									<div className="flex flex-col items-center gap-3">
										<Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
										<p className="text-gray-500 text-sm">Memuat dokumen PDF...</p>
									</div>
								</div>
							) : pdfBlobUrl ? (
								<iframe
									src={pdfBlobUrl}
									title={data.judul}
									className="w-full border-0"
									style={{ height: '75vh' }}
								/>
							) : data.file ? (
								<div className="flex items-center justify-center h-[75vh] bg-gray-50">
									<div className="flex flex-col items-center gap-3">
										<AlertCircle className="h-10 w-10 text-gray-300" />
										<p className="text-gray-500 text-sm">Gagal memuat dokumen PDF</p>
									</div>
								</div>
							) : (
								<div className="flex items-center justify-center h-[75vh] bg-gray-50 border-2 border-dashed border-gray-200 m-4 rounded-lg">
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
		</div>
	);
};

const DetailRow = ({ label, value }) => (
	<div>
		<p className="text-xs text-gray-500 mb-0.5">{label}</p>
		<div className="text-sm font-medium text-gray-900">{value || '-'}</div>
	</div>
);

export default ProdukHukumDetailPage;
