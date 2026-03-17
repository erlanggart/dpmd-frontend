import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import AparaturDesaList from "../../../components/aparatur-desa/AparaturDesaList";
import AparaturDesaOrgChart from "../../../components/aparatur-desa/AparaturDesaOrgChart";
import AparaturDesaForm from "../../../components/aparatur-desa/AparaturDesaForm";
import {
	getAparaturDesa,
	createAparaturDesa,
	updateAparaturDesa,
	importAparaturFromExternal,
	getProdukHukumList,
} from "../../../../src/api/aparaturDesaApi";
import { FiPlus } from "react-icons/fi";
import { FaBars, FaGripHorizontal } from "react-icons/fa";
import { Download, ExternalLink, Loader2, Database, Users } from "lucide-react";

const AparaturDesaPage = () => {
	const navigate = useNavigate();
	const [aparatur, setAparatur] = useState([]);
	const [produkHukum, setProdukHukum] = useState([]);
	const [loading, setLoading] = useState(true);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingData, setEditingData] = useState(null);
	const [viewMode, setViewMode] = useState("table"); // table | orgchart
	const [importing, setImporting] = useState(false);

	const fetchAparatur = async () => {
		try {
			setLoading(true);
			const response = await getAparaturDesa();
			// API returns { success: true, data: [...] }
			setAparatur(response.data.data || []);
		} catch (error) {
			console.error("Failed to fetch aparatur desa:", error);
			Swal.fire("Error", "Gagal memuat data aparatur desa.", "error");
		} finally {
			setLoading(false);
		}
	};

	const fetchProdukHukum = async () => {
		try {
			// Fetch all produk hukum without pagination for the select list
			const response = await getProdukHukumList({ all: true });
			// Handle both paginated and non-paginated responses
			const data = response.data.data;
			setProdukHukum(Array.isArray(data) ? data : data?.data || []);
		} catch (error) {
			console.error("Failed to fetch produk hukum:", error);
			setProdukHukum([]); // Set empty array as fallback
		}
	};

	useEffect(() => {
		fetchAparatur();
		fetchProdukHukum();
	}, []);

	const handleFormSubmit = async (data) => {
		try {
			if (editingData) {
				await updateAparaturDesa(editingData.id, data);
				Swal.fire("Sukses", "Data berhasil diperbarui.", "success");
			} else {
				await createAparaturDesa(data);
				Swal.fire("Sukses", "Data berhasil ditambahkan.", "success");
			}
			fetchAparatur(); // Refresh list
			setIsFormOpen(false);
			setEditingData(null);
		} catch (error) {
			console.error("Form submission error:", error);
			Swal.fire("Error", "Terjadi kesalahan saat menyimpan data.", "error");
		}
	};

	const handleAddNew = () => {
		setEditingData(null);
		setIsFormOpen(true);
	};

	const handleImportExternal = async () => {
		const confirm = await Swal.fire({
			title: "Import dari Dapur Desa?",
			text: "Data aparatur desa akan diimpor dari API Dapur Desa DPMD Kab. Bogor ke database lokal. Data yang sudah ada tidak akan ditimpa.",
			icon: "question",
			showCancelButton: true,
			confirmButtonText: "Ya, Import",
			cancelButtonText: "Batal",
			confirmButtonColor: "#0d9488",
		});

		if (!confirm.isConfirmed) return;

		try {
			setImporting(true);
			const response = await importAparaturFromExternal();
			const result = response.data;
			await Swal.fire({
				title: "Import Selesai",
				html: `<div class="text-left">
					<p><strong>${result.imported}</strong> data berhasil diimpor</p>
					${result.skipped > 0 ? `<p><strong>${result.skipped}</strong> data sudah ada (dilewati)</p>` : ''}
					<p>Total data dari Dapur Desa: <strong>${result.total}</strong></p>
				</div>`,
				icon: result.imported > 0 ? "success" : "info",
			});
			fetchAparatur();
		} catch (error) {
			console.error("Import error:", error);
			Swal.fire("Error", error.response?.data?.message || "Gagal mengimpor data dari Dapur Desa.", "error");
		} finally {
			setImporting(false);
		}
	};

	return (
		<div className="space-y-6 px-6 py-4">
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
				<h1 className="text-2xl font-bold">Manajemen Aparatur Desa</h1>
				{!isFormOpen && (
					<div className="flex items-center gap-2 flex-wrap">
						<button
							onClick={() => navigate("/desa/aparatur-desa-external")}
							className="bg-teal-600 text-white px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm hover:bg-teal-700 transition-colors"
						>
							<ExternalLink className="w-4 h-4" />
							<span>Dapur Desa</span>
						</button>
						<div className="inline-flex p-1 bg-white rounded-md border border-slate-200 overflow-hidden space-x-1">
							<button
								className={`px-3 py-1.5 text-sm rounded ${
									viewMode === "table" ? "bg-primary text-white" : "bg-white"
								}`}
								onClick={() => setViewMode("table")}
							>
								<FaBars />
							</button>
							<button
								className={`px-3 py-3 text-sm  rounded ${
									viewMode === "orgchart" ? "bg-primary text-white" : "bg-white"
								}`}
								onClick={() => setViewMode("orgchart")}
							>
								<FaGripHorizontal />
							</button>
						</div>
						<button
							onClick={handleAddNew}
							className="bg-primary text-white px-4 py-2 rounded-lg flex items-center space-x-2"
						>
							<FiPlus />
							<span>Tambah Baru</span>
						</button>
					</div>
				)}
			</div>

			{isFormOpen ? (
				<AparaturDesaForm
					onSubmit={handleFormSubmit}
					initialData={editingData}
					produkHukumList={produkHukum}
					onCancel={() => {
						setIsFormOpen(false);
						setEditingData(null);
					}}
				/>
			) : loading ? (
				<div className="bg-white rounded-xl border p-12 flex items-center justify-center">
					<Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
				</div>
			) : aparatur.length === 0 && !isFormOpen ? (
				<div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
					<div className="p-8 text-center">
						<div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
							<Users className="h-8 w-8 text-gray-400" />
						</div>
						<h3 className="text-lg font-semibold text-gray-900 mb-2">Belum Ada Data Aparatur Desa</h3>
						<p className="text-gray-500 mb-6 max-w-md mx-auto">
							Data aparatur desa Anda masih kosong. Anda dapat mengimpor data dari Dapur Desa DPMD Kab. Bogor atau menambahkan data secara manual.
						</p>
						<div className="flex flex-col sm:flex-row items-center justify-center gap-3">
							<button
								onClick={handleImportExternal}
								disabled={importing}
								className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg hover:from-teal-600 hover:to-teal-700 transition-all shadow-sm disabled:opacity-50"
							>
								{importing ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									<Download className="w-4 h-4" />
								)}
								{importing ? "Mengimpor..." : "Import dari Dapur Desa"}
							</button>
							<button
								onClick={() => navigate("/desa/aparatur-desa-external")}
								className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-teal-300 text-teal-700 rounded-lg hover:bg-teal-50 transition-colors"
							>
								<ExternalLink className="w-4 h-4" />
								Lihat Data Dapur Desa
							</button>
							<button
								onClick={handleAddNew}
								className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
							>
								<FiPlus className="w-4 h-4" />
								Tambah Manual
							</button>
						</div>
					</div>
					<div className="bg-teal-50 border-t border-teal-100 px-6 py-4">
						<div className="flex items-start gap-3">
							<Database className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
							<div className="text-sm">
								<p className="font-medium text-teal-800">Rekomendasi: Import dari Dapur Desa</p>
								<p className="text-teal-600 mt-1">
									Dengan mengimpor data dari Dapur Desa, data aparatur desa akan otomatis terisi berdasarkan data resmi DPMD Kab. Bogor.
									Kolom yang cocok akan dipetakan secara otomatis (nama, jabatan, jenis kelamin, pendidikan, agama, SK pengangkatan).
								</p>
							</div>
						</div>
					</div>
				</div>
			) : viewMode === "table" ? (
				<AparaturDesaList aparatur={aparatur} />
			) : (
				<AparaturDesaOrgChart aparatur={aparatur} />
			)}
		</div>
	);
};

export default AparaturDesaPage;
