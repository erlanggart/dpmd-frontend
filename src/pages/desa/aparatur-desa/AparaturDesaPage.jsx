import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import AparaturDesaList from "../../../components/aparatur-desa/AparaturDesaList";
import AparaturDesaForm from "../../../components/aparatur-desa/AparaturDesaForm";
import {
	getAparaturDesa,
	createAparaturDesa,
	updateAparaturDesa,
	deleteAparaturDesa,
	getProdukHukumList,
} from "../../../../src/api/aparaturDesaApi";
import { FiPlus } from "react-icons/fi";

const AparaturDesaPage = () => {
	const [aparatur, setAparatur] = useState([]);
	const [produkHukum, setProdukHukum] = useState([]);
	const [loading, setLoading] = useState(true);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingData, setEditingData] = useState(null);

	const fetchAparatur = async () => {
		try {
			setLoading(true);
			const response = await getAparaturDesa();
			setAparatur(response.data.data.data); // Adjust based on your API pagination structure
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
			setProdukHukum(response.data.data);
		} catch (error) {
			console.error("Failed to fetch produk hukum:", error);
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

	const handleEdit = (data) => {
		setEditingData(data);
		setIsFormOpen(true);
	};

	const handleDelete = (id) => {
		Swal.fire({
			title: "Anda yakin?",
			text: "Data yang dihapus tidak dapat dikembalikan!",
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#3085d6",
			cancelButtonColor: "#d33",
			confirmButtonText: "Ya, hapus!",
		}).then(async (result) => {
			if (result.isConfirmed) {
				try {
					await deleteAparaturDesa(id);
					Swal.fire("Dihapus!", "Data telah berhasil dihapus.", "success");
					fetchAparatur(); // Refresh list
				} catch (error) {
					console.error("Delete error:", error);
					Swal.fire("Error", "Gagal menghapus data.", "error");
				}
			}
		});
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
					<button
						onClick={handleAddNew}
						className="bg-primary text-white px-4 py-2 rounded-lg flex items-center space-x-2"
					>
						<FiPlus />
						<span>Tambah Baru</span>
					</button>
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
			) : (
				<AparaturDesaList
					aparatur={aparatur}
					onEdit={handleEdit}
					onDelete={handleDelete}
				/>
			)}
		</div>
	);
};

export default AparaturDesaPage;
