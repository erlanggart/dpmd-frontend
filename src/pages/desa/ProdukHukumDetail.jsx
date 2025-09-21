import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../../api";
import Swal from "sweetalert2";
import { FaArrowLeft } from "react-icons/fa";

const ProdukHukumDetail = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const [produkHukum, setProdukHukum] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [isUpdating, setIsUpdating] = useState(false);

	const fetchProdukHukum = async () => {
		setLoading(true);
		try {
			const response = await api.get(`/produk-hukum/${id}`);
			if (response.data && response.data.success) {
				setProdukHukum(response.data.data);
			} else {
				setError("Gagal mengambil data produk hukum.");
			}
		} catch (err) {
			setError("Gagal memuat data produk hukum.");
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchProdukHukum();
	}, [id]);

	const handleStatusChange = async () => {
		const newStatus =
			produkHukum.status_peraturan === "berlaku" ? "dicabut" : "berlaku";
		const confirmationText = `Anda yakin ingin mengubah status menjadi "${newStatus}"?`;

		Swal.fire({
			title: "Konfirmasi Perubahan Status",
			text: confirmationText,
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
					// Panggil API untuk update status
					const response = await api.put(`/produk-hukum/${id}/status`, {
						status_peraturan: newStatus,
					});

					if (response.data && response.data.success) {
						// Perbarui state lokal untuk mencerminkan perubahan
						setProdukHukum(response.data.data);
						Swal.fire(
							"Berhasil!",
							"Status produk hukum telah diubah.",
							"success"
						);
					} else {
						throw new Error("Gagal memperbarui status dari server.");
					}
				} catch (err) {
					console.error("Error updating status:", err);
					Swal.fire(
						"Gagal!",
						"Terjadi kesalahan saat mengubah status.",
						"error"
					);
				} finally {
					setIsUpdating(false);
				}
			}
		});
	};

	if (loading) {
		return <p>Memuat...</p>;
	}

	if (error) {
		return <p>{error}</p>;
	}

	if (!produkHukum) {
		return <p>Produk hukum tidak ditemukan.</p>;
	}

	const baseUrl = import.meta.env.VITE_IMAGE_BASE_URL;
	const fileUrl = `${baseUrl}/uploads/produk_hukum/${produkHukum.file}`;

	const handleEdit = () => {
		navigate("/desa/produk-hukum", { state: { editingProduk: produkHukum } });
	};

	const DetailItem = ({ label, children }) => (
		<div className="flex flex-col sm:flex-row mb-2">
			<p className="w-full  font-semibold text-gray-700">{label}</p>
			<p className="w-full sm:w-auto font-semibold text-gray-700 sm:px-4">:</p>
			<div className="w-full text-gray-800">{children}</div>
		</div>
	);

	return (
		<div className="container mx-auto">
			<div className="bg-white p-6 rounded-lg shadow-md">
				<div className="flex justify-between items-center mb-4">
					<button
						onClick={() => navigate(-1)}
						className="flex items-center space-x-2 bg-white text-slate-500 p-2 shadow-md border-2 border-slate-200 rounded hover:bg-gray-600"
					>
						<FaArrowLeft /> <span>Kembali</span>
					</button>
					<div className="flex items-center space-x-4">
						<button
							onClick={handleEdit}
							className="py-2 px-4 rounded bg-blue-500 hover:bg-blue-600 text-white"
						>
							Edit
						</button>
						<button
							onClick={handleStatusChange}
							disabled={isUpdating}
							className={`py-2 px-4 rounded ${
								produkHukum.status_peraturan === "berlaku"
									? "bg-yellow-500 hover:bg-yellow-600"
									: "bg-green-500 hover:bg-green-600"
							} text-white`}
						>
							{isUpdating
								? "Memperbarui..."
								: ` ${
										produkHukum.status_peraturan === "berlaku"
											? "Cabut Peraturan"
											: "Berlakukan Peraturan"
								  }`}
						</button>
					</div>
				</div>

				<h1 className="text-2xl font-bold mb-4 text-center py-10">
					{produkHukum.judul}
				</h1>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
					<div>
						<DetailItem label="Tipe Dokumen">
							{produkHukum.tipe_dokumen}
						</DetailItem>
						<DetailItem label="Nomor">{produkHukum.nomor}</DetailItem>
						<DetailItem label="Tahun">{produkHukum.tahun}</DetailItem>
						<DetailItem label="Jenis">
							{produkHukum.jenis} ({produkHukum.singkatan_jenis})
						</DetailItem>
						<DetailItem label="Tempat Penetapan">
							{produkHukum.tempat_penetapan}
						</DetailItem>
						<DetailItem label="Tanggal Penetapan">
							{new Date(produkHukum.tanggal_penetapan).toLocaleDateString(
								"id-ID",
								{
									day: "numeric",
									month: "long",
									year: "numeric",
								}
							)}
						</DetailItem>
					</div>
					<div>
						<DetailItem label="Sumber">{produkHukum.sumber}</DetailItem>
						<DetailItem label="Subjek">{produkHukum.subjek}</DetailItem>
						<DetailItem label="Status Peraturan">
							<span
								className={`px-2 py-1 rounded-full text-white text-sm ${
									produkHukum.status_peraturan === "berlaku"
										? "bg-green-500"
										: "bg-red-500"
								}`}
							>
								{produkHukum.status_peraturan}
							</span>
						</DetailItem>
						{produkHukum.keterangan_status && (
							<DetailItem label="Keterangan Status">
								{produkHukum.keterangan_status}
							</DetailItem>
						)}
						<DetailItem label="Bidang Hukum">
							{produkHukum.bidang_hukum}
						</DetailItem>
						<DetailItem label="Bahasa">{produkHukum.bahasa}</DetailItem>
					</div>
				</div>

				<div className="mt-6">
					<h2 className="text-xl font-bold mb-2">Dokumen</h2>
					{produkHukum.file ? (
						<iframe
							src={fileUrl}
							title={produkHukum.judul}
							className="w-full h-screen"
							style={{ minHeight: "75vh" }}
						></iframe>
					) : (
						<p>Tidak ada file yang tersedia untuk ditampilkan.</p>
					)}
				</div>
			</div>
		</div>
	);
};

export default ProdukHukumDetail;
