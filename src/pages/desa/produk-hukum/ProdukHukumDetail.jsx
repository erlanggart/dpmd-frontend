import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../api";
import Swal from "sweetalert2";
import {
	LuArrowLeft,
	LuPencil,
	LuScale,
	LuFileText,
	LuHash,
	LuCalendar,
	LuMapPin,
	LuBookOpen,
	LuGlobe,
	LuTag,
	LuLoader,
	LuCircleAlert,
	LuCheck,
	LuX,
} from "react-icons/lu";

const JENIS_COLOR = {
	"Peraturan Desa": { bg: "bg-blue-50", text: "text-blue-700" },
	"Peraturan Kepala Desa": { bg: "bg-violet-50", text: "text-violet-700" },
	"Keputusan Kepala Desa": { bg: "bg-amber-50", text: "text-amber-700" },
};

const ProdukHukumDetail = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const [produkHukum, setProdukHukum] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [isUpdating, setIsUpdating] = useState(false);
	const [pdfBlobUrl, setPdfBlobUrl] = useState(null);

	useEffect(() => {
		let isActive = true;

		const fetchProdukHukum = async () => {
			setLoading(true);
			setError(null);
			setProdukHukum(null);
			setPdfBlobUrl((currentBlobUrl) => {
				if (currentBlobUrl) {
					URL.revokeObjectURL(currentBlobUrl);
				}
				return null;
			});

			try {
				const response = await api.get(`/produk-hukum/${id}`);
				if (!isActive) return;

				if (response.data && response.data.success) {
					const detail = response.data.data;
					setProdukHukum(detail);

					if (detail.file) {
						try {
							const token = localStorage.getItem("expressToken");
							const apiUrl =
								import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3001/api";

							const pdfResponse = await fetch(
								`${apiUrl}/produk-hukum/${detail.id}/download`,
								{
									method: "GET",
									headers: {
										Authorization: `Bearer ${token}`,
									},
								}
							);

							if (!isActive) return;

							if (pdfResponse.ok) {
								const blob = await pdfResponse.blob();
								if (!isActive) return;
								const blobUrl = URL.createObjectURL(blob);
								setPdfBlobUrl(blobUrl);
							} else {
								console.error("Failed to fetch PDF:", pdfResponse.statusText);
							}
						} catch (fetchError) {
							console.error("Error fetching PDF file:", fetchError);
						}
					}
				} else {
					setError("Gagal mengambil data produk hukum.");
				}
			} catch (err) {
				if (!isActive) return;
				setError("Gagal memuat data produk hukum.");
				console.error(err);
			} finally {
				if (isActive) {
					setLoading(false);
				}
			}
		};

		fetchProdukHukum();

		return () => {
			isActive = false;
		};
	}, [id]);

	useEffect(() => {
		return () => {
			if (pdfBlobUrl) {
				URL.revokeObjectURL(pdfBlobUrl);
			}
		};
	}, [pdfBlobUrl]);

	const handleStatusChange = async () => {
		const newStatus =
			produkHukum.status_peraturan === "berlaku" ? "dicabut" : "berlaku";

		Swal.fire({
			title: "Konfirmasi Perubahan Status",
			text: `Anda yakin ingin mengubah status menjadi "${newStatus}"?`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#3085d6",
			cancelButtonColor: "#d33",
			confirmButtonText: "Ya, ubah!",
			cancelButtonText: "Batal",
		}).then(async (result) => {
			if (result.isConfirmed) {
				setIsUpdating(true);
				try {
					const response = await api.put(`/produk-hukum/${id}/status`, {
						status_peraturan: newStatus,
					});
					if (response.data && response.data.success) {
						setProdukHukum(response.data.data);
						Swal.fire("Berhasil!", "Status produk hukum telah diubah.", "success");
					} else {
						throw new Error("Gagal memperbarui status.");
					}
				} catch (err) {
					console.error("Error updating status:", err);
					Swal.fire("Gagal!", "Terjadi kesalahan saat mengubah status.", "error");
				} finally {
					setIsUpdating(false);
				}
			}
		});
	};

	const handleEdit = () => {
		navigate("/desa/produk-hukum", { state: { editingProduk: produkHukum } });
	};

	const formatDate = (dateStr) => {
		if (!dateStr) return "-";
		return new Date(dateStr).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-32">
				<LuLoader className="w-6 h-6 animate-spin text-slate-400" />
			</div>
		);
	}

	if (error || !produkHukum) {
		return (
			<div className="flex flex-col items-center justify-center py-32 text-slate-500">
				<LuCircleAlert className="w-8 h-8 mb-2" />
				<p className="text-sm">{error || "Produk hukum tidak ditemukan."}</p>
			</div>
		);
	}

	const jc = JENIS_COLOR[produkHukum.jenis] || { bg: "bg-slate-50", text: "text-slate-700" };
	const isBerlaku = produkHukum.status_peraturan === "berlaku";

	const InfoRow = ({ icon, label, children }) => {
		const IconComponent = icon;

		return (
			<div className="flex items-start gap-3 py-2.5">
				{IconComponent ? (
					<IconComponent className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
				) : null}
				<div className="min-w-0">
					<p className="text-xs text-slate-500 mb-0.5">{label}</p>
					<div className="text-sm text-slate-800">{children}</div>
				</div>
			</div>
		);
	};

	return (
		<div className="space-y-5">
			{/* Top Bar */}
			<div className="flex items-center justify-between gap-3">
				<button
					onClick={() => navigate(-1)}
					className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
				>
					<LuArrowLeft className="w-4 h-4" />
					Kembali
				</button>
				<div className="flex items-center gap-2">
					<button
						onClick={handleEdit}
						className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
					>
						<LuPencil className="w-3.5 h-3.5" />
						Edit
					</button>
					<button
						onClick={handleStatusChange}
						disabled={isUpdating}
						className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium text-white transition disabled:opacity-50 ${
							isBerlaku
								? "bg-amber-500 hover:bg-amber-600"
								: "bg-emerald-500 hover:bg-emerald-600"
						}`}
					>
						{isUpdating ? (
							<LuLoader className="w-3.5 h-3.5 animate-spin" />
						) : isBerlaku ? (
							<LuX className="w-3.5 h-3.5" />
						) : (
							<LuCheck className="w-3.5 h-3.5" />
						)}
						{isUpdating
							? "Memproses..."
							: isBerlaku
								? "Cabut Peraturan"
								: "Berlakukan"}
					</button>
				</div>
			</div>

			{/* Title */}
			<div className="rounded-xl border border-slate-200 bg-white p-5">
				<div className="flex items-center gap-2 mb-2 flex-wrap">
					<span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${jc.bg} ${jc.text}`}>
						{produkHukum.singkatan_jenis || produkHukum.jenis}
					</span>
					<span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
						isBerlaku ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
					}`}>
						{isBerlaku ? "Berlaku" : "Dicabut"}
					</span>
					<span className="text-xs text-slate-400">No. {produkHukum.nomor} &middot; Tahun {produkHukum.tahun}</span>
				</div>
				<h1 className="text-lg font-semibold text-slate-800 leading-snug">
					{produkHukum.judul}
				</h1>
			</div>

			{/* Two Column: Info Left, PDF Right */}
			<div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
				{/* Left — Info */}
				<div className="lg:col-span-2 space-y-4">
					<div className="rounded-xl border border-slate-200 bg-white p-5">
						<h2 className="text-sm font-semibold text-slate-700 mb-1">Informasi Dokumen</h2>
						<div className="divide-y divide-slate-100">
							<InfoRow icon={LuFileText} label="Tipe Dokumen">
								{produkHukum.tipe_dokumen}
							</InfoRow>
							<InfoRow icon={LuScale} label="Jenis">
								{produkHukum.jenis} ({produkHukum.singkatan_jenis})
							</InfoRow>
							<InfoRow icon={LuHash} label="Nomor">
								{produkHukum.nomor}
							</InfoRow>
							<InfoRow icon={LuCalendar} label="Tahun">
								{produkHukum.tahun}
							</InfoRow>
							<InfoRow icon={LuMapPin} label="Tempat Penetapan">
								{produkHukum.tempat_penetapan}
							</InfoRow>
							<InfoRow icon={LuCalendar} label="Tanggal Penetapan">
								{formatDate(produkHukum.tanggal_penetapan)}
							</InfoRow>
						</div>
					</div>

					<div className="rounded-xl border border-slate-200 bg-white p-5">
						<h2 className="text-sm font-semibold text-slate-700 mb-1">Detail Tambahan</h2>
						<div className="divide-y divide-slate-100">
							{produkHukum.subjek && (
								<InfoRow icon={LuBookOpen} label="Subjek">
									{produkHukum.subjek}
								</InfoRow>
							)}
							{produkHukum.sumber && (
								<InfoRow icon={LuTag} label="Sumber">
									{produkHukum.sumber}
								</InfoRow>
							)}
							<InfoRow icon={LuScale} label="Status Peraturan">
								<span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
									isBerlaku ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
								}`}>
									{produkHukum.status_peraturan}
								</span>
							</InfoRow>
							{produkHukum.keterangan_status && (
								<InfoRow icon={LuCircleAlert} label="Keterangan Status">
									{produkHukum.keterangan_status}
								</InfoRow>
							)}
							<InfoRow icon={LuGlobe} label="Bahasa">
								{produkHukum.bahasa}
							</InfoRow>
							<InfoRow icon={LuBookOpen} label="Bidang Hukum">
								{produkHukum.bidang_hukum}
							</InfoRow>
						</div>
					</div>
				</div>

				{/* Right — PDF Viewer */}
				<div className="lg:col-span-3">
					<div className="sticky top-4 rounded-xl border border-slate-200 bg-white overflow-hidden">
						<div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
							<LuFileText className="w-4 h-4 text-slate-500" />
							<span className="text-sm font-medium text-slate-700">Dokumen</span>
							{produkHukum.file && (
								<span className="ml-auto text-xs text-slate-400 truncate max-w-[200px]">{produkHukum.file}</span>
							)}
						</div>
						{pdfBlobUrl ? (
							<iframe
								src={pdfBlobUrl}
								title={produkHukum.judul}
								className="w-full border-0"
								style={{ height: "calc(100vh - 200px)", minHeight: "500px" }}
							/>
						) : produkHukum.file ? (
							<div className="flex items-center justify-center py-32">
								<div className="flex items-center gap-2 text-slate-400">
									<LuLoader className="w-5 h-5 animate-spin" />
									<span className="text-sm">Memuat PDF...</span>
								</div>
							</div>
						) : (
							<div className="flex flex-col items-center justify-center py-32 text-slate-400">
								<LuFileText className="w-8 h-8 mb-2" />
								<p className="text-sm">Tidak ada file tersedia</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default ProdukHukumDetail;
