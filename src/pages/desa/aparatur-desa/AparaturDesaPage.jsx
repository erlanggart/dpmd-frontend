import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import AparaturDesaList from "../../../components/aparatur-desa/AparaturDesaList";
import AparaturDesaOrgChart from "../../../components/aparatur-desa/AparaturDesaOrgChart";
import AparaturDesaForm from "../../../components/aparatur-desa/AparaturDesaForm";
import RekonsiliasiDapurDesa from "../../../components/aparatur-desa/RekonsiliasiDapurDesa";
import {
	getAparaturDesa,
	createAparaturDesa,
	updateAparaturDesa,
	getProdukHukumList,
} from "../../../../src/api/aparaturDesaApi";
import DesaPageHeader from "../../../components/desa/DesaPageHeader";
import { FiPlus } from "react-icons/fi";
import { FaBars, FaGripHorizontal } from "react-icons/fa";
import { Loader2, Database, Users } from "lucide-react";

const AparaturDesaPage = () => {
	const [aparatur, setAparatur] = useState([]);
	const [produkHukum, setProdukHukum] = useState([]);
	const [loading, setLoading] = useState(true);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingData, setEditingData] = useState(null);
	const [viewMode, setViewMode] = useState("table"); // table | orgchart

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

	const totalAktif = aparatur.filter(
		(item) => String(item.status || "").toLowerCase() === "aktif",
	).length;

	return (
		<div className="space-y-5">
			<DesaPageHeader
				icon={Users}
				eyebrow="Data Desa"
				title="Aparatur Desa"
				description="Kelola data perangkat desa, jabatan, dan dasar hukum pengangkatannya."
				actions={
					!isFormOpen && (
						<>
							<div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
								<button
									type="button"
									aria-label="Tampilan tabel"
									className={`rounded-md px-3 py-2 text-sm transition-colors ${
										viewMode === "table"
											? "bg-slate-900 text-white"
											: "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
									}`}
									onClick={() => setViewMode("table")}
								>
									<FaBars />
								</button>
								<button
									type="button"
									aria-label="Tampilan bagan struktur"
									className={`rounded-md px-3 py-2 text-sm transition-colors ${
										viewMode === "orgchart"
											? "bg-slate-900 text-white"
											: "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
									}`}
									onClick={() => setViewMode("orgchart")}
								>
									<FaGripHorizontal />
								</button>
							</div>
							<button
								onClick={handleAddNew}
								className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
							>
								<FiPlus className="h-4 w-4" />
								<span>Tambah Aparatur</span>
							</button>
						</>
					)
				}
				stats={
					!isFormOpen && !loading && aparatur.length > 0
						? [
								{ label: "Total aparatur", value: aparatur.length, hint: "seluruh data terinput" },
								{ label: "Aktif", value: totalAktif, hint: "sedang menjabat" },
								{
									label: "Nonaktif",
									value: aparatur.length - totalAktif,
									hint: "sudah tidak menjabat",
								},
								{
									label: "Produk hukum",
									value: produkHukum.length,
									hint: "dasar hukum tersedia",
								},
							]
						: undefined
				}
			/>

			{/* Sisa arsip Dapur Desa yang masih menunggu keputusan desa. Panel menyembunyikan
			    dirinya sendiri kalau semuanya sudah beres, jadi aman dipasang permanen. */}
			{!isFormOpen && <RekonsiliasiDapurDesa onSelesai={fetchAparatur} />}

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
				<div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-12">
					<Loader2 className="h-6 w-6 animate-spin text-slate-900" />
				</div>
			) : aparatur.length === 0 && !isFormOpen ? (
				<div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
					<div className="p-10 text-center">
						<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100">
							<Users className="h-6 w-6 text-slate-400" />
						</div>
						<h3 className="mb-2 text-base font-semibold text-slate-900">Belum ada data aparatur desa</h3>
						<p className="mx-auto mb-6 max-w-md text-sm leading-6 text-slate-500">
							Data aparatur desa Anda masih kosong. Silakan tambahkan data aparatur secara manual.
						</p>
						<div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
							<button
								onClick={handleAddNew}
								className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
							>
								<FiPlus className="h-4 w-4" />
								Tambah Manual
							</button>
						</div>
					</div>
					<div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
						<div className="flex items-start gap-3">
							<Database className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-400" />
							<div className="text-sm">
								<p className="font-medium text-slate-900">Data Dapur Desa sudah dimuat DPMD</p>
								<p className="mt-1 leading-6 text-slate-500">
									Arsip Dapur Desa dimuat sekali oleh DPMD, bukan lagi ditarik per desa. Kalau desa Anda
									ada di arsip itu, datanya sudah masuk sendiri atau muncul sebagai daftar tinjauan di
									atas. Halaman ini kosong berarti desa Anda memang tidak ada di arsip tersebut.
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
