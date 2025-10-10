import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { useLocation, useNavigate } from "react-router-dom";
import {
	getProdukHukums,
	createProdukHukum,
	updateProdukHukum,
} from "../../../api";
import ProdukHukumList from "../../../components/produk-hukum/ProdukHukumList";
import ProdukHukumForm from "../../../components/produk-hukum/ProdukHukumForm";

const ProdukHukum = () => {
	const [produkHukums, setProdukHukums] = useState([]);
	const [editingProduk, setEditingProduk] = useState(null);
	const [isFormVisible, setIsFormVisible] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [searchTerm, setSearchTerm] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const location = useLocation();
	const navigate = useNavigate();

	const fetchProdukHukums = async (page, search = "") => {
		try {
			setIsLoading(true);
			const response = await getProdukHukums(page, search);
			setProdukHukums(response.data.data.data);
			setCurrentPage(response.data.data.current_page);
			setTotalPages(response.data.data.last_page);
		} catch (error) {
			console.error("Error fetching produk hukum:", error);
			Swal.fire({
				icon: "error",
				title: "Oops...",
				text: "Gagal memuat data produk hukum!",
			});
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		const delayDebounceFn = setTimeout(() => {
			// Selalu reset ke halaman 1 saat melakukan pencarian baru
			if (currentPage !== 1) {
				setCurrentPage(1);
			}
			fetchProdukHukums(1, searchTerm);
		}, 500); // 500ms delay

		return () => clearTimeout(delayDebounceFn);
	}, [searchTerm]);

	useEffect(() => {
		// Hanya fetch jika tidak ada pencarian, karena pencarian ditangani oleh effect di atas
		if (!searchTerm) {
			fetchProdukHukums(currentPage);
		}
	}, [currentPage]);

	useEffect(() => {
		if (location.state?.editingProduk) {
			setEditingProduk(location.state.editingProduk);
			setIsFormVisible(true);
			// Membersihkan state dari location agar tidak memicu lagi
			navigate(location.pathname, { replace: true });
		}
	}, [location.state, navigate]);

	const handleFormSubmit = async (formData) => {
		try {
			const action = editingProduk ? "diperbarui" : "ditambahkan";

			// Show loading toast
			const loadingToast = Swal.fire({
				title: `${editingProduk ? "Memperbarui" : "Menyimpan"} produk hukum...`,
				text: "Mohon tunggu, sedang memproses data.",
				allowOutsideClick: false,
				didOpen: () => {
					Swal.showLoading();
				},
			});

			if (editingProduk) {
				await updateProdukHukum(editingProduk.id, formData);
			} else {
				await createProdukHukum(formData);
			}

			// Close loading toast
			loadingToast.close();

			setSearchTerm(""); // Reset pencarian setelah submit
			await fetchProdukHukums(1); // Kembali ke halaman 1
			setIsFormVisible(false);
			setEditingProduk(null);

			Swal.fire({
				icon: "success",
				title: "Berhasil!",
				text: `Produk hukum berhasil ${action}.`,
				timer: 2000,
				showConfirmButton: false,
			});
		} catch (error) {
			console.error("Error submitting form:", error.response?.data);
			Swal.fire({
				icon: "error",
				title: "Gagal!",
				text:
					"Terjadi kesalahan saat menyimpan data. " +
					(error.response?.data?.message || "Silakan coba lagi."),
			});
			// Re-throw error so form component can handle it
			throw error;
		}
	};

	const showAddForm = () => {
		setEditingProduk(null);
		setIsFormVisible(true);
	};

	const handleCancelForm = () => {
		setIsFormVisible(false);
		setEditingProduk(null);
	};

	return (
		<div className="bg-white p-4 rounded-lg shadow-lg">
			<div className="flex items-center justify-between mb-4">
				<h1 className="text-2xl font-bold ">Produk Hukum Desa</h1>
				{!isFormVisible && (
					<button
						onClick={showAddForm}
						className="bg-primary text-white px-4 py-2 rounded mb-4"
					>
						Tambah Produk Hukum
					</button>
				)}
			</div>

			{isFormVisible ? (
				<div className="mb-4 p-4 rounded ">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-xl font-bold ">
							{editingProduk ? "Edit" : "Tambah"} Produk Hukum
						</h2>
						<button
							onClick={handleCancelForm}
							className=" bg-red-500 text-white px-4 py-2 rounded-md"
						>
							Batal
						</button>
					</div>
					<ProdukHukumForm
						onSubmit={handleFormSubmit}
						initialData={editingProduk}
					/>
				</div>
			) : (
				<>
					<div className="mb-4">
						<input
							type="text"
							placeholder="Cari peraturan berdasarkan judul..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							disabled={isLoading}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
						/>
					</div>

					{isLoading ? (
						<div className="text-center py-10">
							<div className="flex justify-center items-center gap-3">
								<svg
									className="animate-spin h-6 w-6 text-blue-500"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										className="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										strokeWidth="4"
									></circle>
									<path
										className="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								<p className="text-gray-500">Memuat data produk hukum...</p>
							</div>
						</div>
					) : produkHukums.length > 0 ? (
						<ProdukHukumList produkHukums={produkHukums} />
					) : (
						<div className="text-center py-10">
							<p className="text-gray-500">
								Tidak ada produk hukum yang ditemukan.
							</p>
						</div>
					)}

					{totalPages > 1 && (
						<div className="mt-4 flex justify-between">
							<button
								onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
								disabled={currentPage === 1 || isLoading}
								className="bg-gray-300 px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Previous
							</button>
							<span>
								Page {currentPage} of {totalPages}
							</span>
							<button
								onClick={() =>
									setCurrentPage((p) => Math.min(p + 1, totalPages))
								}
								disabled={currentPage === totalPages || isLoading}
								className="bg-gray-300 px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Next
							</button>
						</div>
					)}
				</>
			)}
		</div>
	);
};

export default ProdukHukum;
