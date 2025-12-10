import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import AparaturDesaList from "../../../components/aparatur-desa/AparaturDesaList";
import AparaturDesaOrgChart from "../../../components/aparatur-desa/AparaturDesaOrgChart";
import AparaturDesaForm from "../../../components/aparatur-desa/AparaturDesaForm";
import {
	getAparaturDesa,
	createAparaturDesa,
	updateAparaturDesa,
	
	getProdukHukumList,
} from "../../../../src/api/aparaturDesaApi";
import { FiPlus } from "react-icons/fi";
import { FaBars, FaGripHorizontal } from "react-icons/fa";

const AparaturDesaPage = () => {
	const [aparatur, setAparatur] = useState([]);
	const [produkHukum, setProdukHukum] = useState([]);
	const [loading, setLoading] = useState(true);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingData, setEditingData] = useState(null);
	const [viewMode, setViewMode] = useState("orgchart"); // orgchart | table

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

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-bold">Manajemen Aparatur Desa</h1>
				{!isFormOpen && (
					<div className="flex items-center gap-2">
						<div className="inline-flex p-1 bg-white rounded-md border border-slate-200 overflow-hidden space-x-1">
							<button
								className={`px-3 py-3 text-sm  rounded ${
									viewMode === "orgchart" ? "bg-primary text-white" : "bg-white"
								}`}
								onClick={() => setViewMode("orgchart")}
							>
								<FaGripHorizontal />
							</button>
							<button
								className={`px-3 py-1.5 text-sm rounded ${
									viewMode === "table" ? "bg-primary text-white" : "bg-white"
								}`}
								onClick={() => setViewMode("table")}
							>
								<FaBars />
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
				<p>Memuat...</p>
			) : viewMode === "orgchart" ? (
				aparatur && aparatur.length > 0 ? (
					<AparaturDesaOrgChart aparatur={aparatur} />
				) : (
					<div className="bg-white rounded-md border p-6 text-center text-gray-500">
						Belum ada data aparatur desa.
					</div>
				)
			) : (
				<AparaturDesaList aparatur={aparatur} />
			)}
		</div>
	);
};

export default AparaturDesaPage;
