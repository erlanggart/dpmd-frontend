// src/pages/superadmin/KepegawaianPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
	LuUsers,
	LuUser,
	LuPlus,
	LuSearch,
	LuBuilding2,
	LuChevronDown,
	LuChevronLeft,
	LuChevronRight,
	LuPencil,
	LuTrash2,
	LuX,
	LuCheck,
	LuDownload,
	LuFileSpreadsheet,
	LuUserCircle,
} from "react-icons/lu";
import * as XLSX from "xlsx";
import api from "../../api";
import Swal from "sweetalert2";

// ===================== Add/Edit Modal =====================
const PegawaiFormModal = ({ isOpen, onClose, onSaved, pegawai, bidangList }) => {
	const [nama, setNama] = useState("");
	const [bidangId, setBidangId] = useState("");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (pegawai) {
			setNama(pegawai.nama_pegawai || "");
			setBidangId(pegawai.id_bidang?.toString() || "");
		} else {
			setNama("");
			setBidangId("");
		}
	}, [pegawai]);

	if (!isOpen) return null;

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!nama.trim() || !bidangId) return;

		setSaving(true);
		try {
			if (pegawai) {
				await api.put(`/pegawai/${pegawai.id_pegawai}`, {
					nama_pegawai: nama.trim(),
					id_bidang: parseInt(bidangId),
				});
			} else {
				await api.post("/pegawai", {
					nama_pegawai: nama.trim(),
					id_bidang: parseInt(bidangId),
				});
			}
			onSaved();
		} catch (err) {
			Swal.fire("Gagal!", err.response?.data?.message || "Gagal menyimpan data pegawai.", "error");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
			<div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
				<div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white flex items-center justify-between">
					<h3 className="text-lg font-bold">{pegawai ? "Edit Pegawai" : "Tambah Pegawai"}</h3>
					<button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
						<LuX className="w-5 h-5" />
					</button>
				</div>
				<form onSubmit={handleSubmit} className="p-6 space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Nama Pegawai</label>
						<input
							type="text"
							value={nama}
							onChange={(e) => setNama(e.target.value)}
							placeholder="Masukkan nama pegawai..."
							className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
							required
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Bidang</label>
						<div className="relative">
							<select
								value={bidangId}
								onChange={(e) => setBidangId(e.target.value)}
								className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none bg-white"
								required
							>
								<option value="">Pilih Bidang</option>
								{bidangList.map((b) => (
									<option key={b.id} value={b.id}>{b.nama}</option>
								))}
							</select>
							<LuChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
						</div>
					</div>
					<div className="flex gap-3 pt-2">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all"
						>
							Batal
						</button>
						<button
							type="submit"
							disabled={saving || !nama.trim() || !bidangId}
							className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
						>
							{saving ? (
								<div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
							) : (
								<>
									<LuCheck className="w-5 h-5" />
									{pegawai ? "Simpan" : "Tambah"}
								</>
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

// ===================== Main Page =====================
const KepegawaianPage = () => {
	const [pegawaiList, setPegawaiList] = useState([]);
	const [bidangList, setBidangList] = useState([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [filterBidang, setFilterBidang] = useState("all");
	const [currentPage, setCurrentPage] = useState(1);
	const [showModal, setShowModal] = useState(false);
	const [editPegawai, setEditPegawai] = useState(null);
	const itemsPerPage = 12;

	// Fetch pegawai
	const fetchPegawai = useCallback(async () => {
		setLoading(true);
		try {
			const res = await api.get("/pegawai", { params: { include_users: "true" } });
			setPegawaiList(res.data.data || []);
		} catch (err) {
			console.error("Error fetching pegawai:", err);
		} finally {
			setLoading(false);
		}
	}, []);

	// Fetch bidang
	const fetchBidang = useCallback(async () => {
		try {
			const res = await api.get("/bidang");
			setBidangList(res.data.data || []);
		} catch (err) {
			console.error("Error fetching bidang:", err);
		}
	}, []);

	useEffect(() => {
		fetchPegawai();
		fetchBidang();
	}, [fetchPegawai, fetchBidang]);

	// Filter
	const filtered = useMemo(() => {
		return pegawaiList.filter((p) => {
			const matchSearch =
				p.nama_pegawai?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				p.bidangs?.nama?.toLowerCase().includes(searchTerm.toLowerCase());
			const matchBidang = filterBidang === "all" || p.id_bidang === parseInt(filterBidang);
			return matchSearch && matchBidang;
		});
	}, [pegawaiList, searchTerm, filterBidang]);

	// Pagination
	const totalPages = Math.ceil(filtered.length / itemsPerPage);
	const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm, filterBidang]);

	// Stats by bidang
	const statsByBidang = useMemo(() => {
		const stats = {};
		pegawaiList.forEach((p) => {
			const key = p.bidangs?.nama || "Tidak Diketahui";
			stats[key] = (stats[key] || 0) + 1;
		});
		return stats;
	}, [pegawaiList]);

	// Delete
	const handleDelete = async (pegawai) => {
		const result = await Swal.fire({
			title: "Hapus Pegawai?",
			text: `Apakah Anda yakin ingin menghapus ${pegawai.nama_pegawai}?`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#d33",
			cancelButtonColor: "#3085d6",
			confirmButtonText: "Ya, Hapus!",
			cancelButtonText: "Batal",
		});
		if (result.isConfirmed) {
			try {
				await api.delete(`/pegawai/${pegawai.id_pegawai}`);
				Swal.fire({ title: "Terhapus!", text: "Pegawai berhasil dihapus.", icon: "success", timer: 2000, showConfirmButton: false });
				fetchPegawai();
			} catch (err) {
				Swal.fire("Error!", err.response?.data?.message || "Gagal menghapus pegawai.", "error");
			}
		}
	};

	// Edit
	const handleEdit = (pegawai) => {
		setEditPegawai(pegawai);
		setShowModal(true);
	};

	// Saved
	const handleSaved = () => {
		setShowModal(false);
		setEditPegawai(null);
		fetchPegawai();
		Swal.fire({ title: "Berhasil!", text: "Data pegawai berhasil disimpan.", icon: "success", timer: 2000, showConfirmButton: false });
	};

	// Export Excel
	const handleExport = () => {
		const rows = filtered.map((p, idx) => ({
			No: idx + 1,
			"Nama Pegawai": p.nama_pegawai || "",
			Bidang: p.bidangs?.nama || "-",
			"Akun Terhubung": p.users?.length
				? p.users.map((u) => `${u.name} (${u.email})`).join(", ")
				: "Belum ada",
		}));
		const ws = XLSX.utils.json_to_sheet(rows);
		if (rows.length > 0) {
			ws["!cols"] = Object.keys(rows[0]).map((key) => ({
				wch: Math.max(key.length, ...rows.map((r) => String(r[key] || "").length)) + 2,
			}));
		}
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Data Pegawai");
		const today = new Date().toISOString().split("T")[0];
		XLSX.writeFile(wb, `Data_Pegawai_DPMD_${today}.xlsx`);
		Swal.fire({ title: "Berhasil!", text: `Data pegawai berhasil diekspor (${filtered.length} data)`, icon: "success", timer: 2000, showConfirmButton: false });
	};

	// Bidang color map
	const getBidangColor = (bidangName) => {
		const colorMap = {
			Sekretariat: "from-gray-500 to-slate-600",
			"Sarana Prasarana Kewilayahan dan Ekonomi Desa": "from-blue-500 to-cyan-600",
			"Kekayaan dan Keuangan Desa": "from-green-500 to-emerald-600",
			"Pemberdayaan Masyarakat Desa": "from-purple-500 to-violet-600",
			"Pemerintahan Desa": "from-orange-500 to-red-600",
			"Tenaga Alih Daya": "from-teal-500 to-cyan-600",
			"Tenaga Keamanan": "from-amber-500 to-yellow-600",
			"Tenaga Kebersihan": "from-lime-500 to-green-600",
		};
		return colorMap[bidangName] || "from-indigo-500 to-blue-600";
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center p-12">
				<div className="flex flex-col items-center gap-3">
					<div className="animate-spin rounded-full h-12 w-12 border-b-3 border-indigo-500" />
					<p className="text-gray-600 text-sm">Memuat data kepegawaian...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6 lg:p-8">
			{/* Header */}
			<div className="mb-6">
				<div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 rounded-2xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden">
					<div className="absolute inset-0 bg-black opacity-5" />
					<div className="relative z-10">
						<h1 className="text-3xl md:text-4xl font-bold mb-3 flex items-center gap-3">
							<div className="h-10 w-10 md:h-12 md:w-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
								<LuUsers className="w-6 h-6 md:w-7 md:h-7" />
							</div>
							Manajemen Kepegawaian
						</h1>
						<p className="text-white/90 text-base md:text-lg">
							Kelola data pegawai DPMD Kabupaten Bogor per bidang
						</p>
					</div>
				</div>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
				<div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center">
							<LuUsers className="w-5 h-5 text-indigo-600" />
						</div>
						<div>
							<p className="text-2xl font-bold text-gray-800">{pegawaiList.length}</p>
							<p className="text-xs text-gray-500">Total Pegawai</p>
						</div>
					</div>
				</div>
				{Object.entries(statsByBidang)
					.sort(([, a], [, b]) => b - a)
					.slice(0, 4)
					.map(([bidang, count]) => (
						<div key={bidang} className="bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center">
									<LuBuilding2 className="w-5 h-5 text-blue-600" />
								</div>
								<div className="min-w-0">
									<p className="text-2xl font-bold text-gray-800">{count}</p>
									<p className="text-xs text-gray-500 truncate">{bidang}</p>
								</div>
							</div>
						</div>
					))}
			</div>

			{/* Filters & Actions */}
			<div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="relative">
						<LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
						<input
							type="text"
							placeholder="Cari nama pegawai..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
						/>
					</div>
					<div className="relative">
						<LuBuilding2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
						<select
							value={filterBidang}
							onChange={(e) => setFilterBidang(e.target.value)}
							className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none bg-white"
						>
							<option value="all">Semua Bidang</option>
							{bidangList.map((b) => (
								<option key={b.id} value={b.id}>{b.nama}</option>
							))}
						</select>
						<LuChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
					</div>
				</div>
				<div className="mt-4 flex justify-between items-center">
					<p className="text-sm text-gray-600">
						Menampilkan <span className="font-semibold text-gray-900">{filtered.length}</span> dari{" "}
						<span className="font-semibold text-gray-900">{pegawaiList.length}</span> pegawai
					</p>
					<div className="flex gap-3">
						<button
							onClick={handleExport}
							className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl"
						>
							<LuDownload className="h-5 w-5" />
							<span className="font-semibold hidden sm:inline">Ekspor Excel</span>
						</button>
						<button
							onClick={() => {
								setEditPegawai(null);
								setShowModal(true);
							}}
							className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
						>
							<LuPlus className="h-5 w-5" />
							<span className="font-semibold">Tambah Pegawai</span>
						</button>
					</div>
				</div>
			</div>

			{/* Pegawai Grid */}
			{filtered.length === 0 ? (
				<div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
					<div className="flex flex-col items-center gap-4">
						<div className="h-20 w-20 bg-gray-100 rounded-2xl flex items-center justify-center">
							<LuUsers className="h-10 w-10 text-gray-400" />
						</div>
						<div>
							<p className="text-gray-700 font-semibold text-lg mb-1">
								{searchTerm || filterBidang !== "all" ? "Tidak ada pegawai yang sesuai" : "Belum ada data pegawai"}
							</p>
							<p className="text-sm text-gray-500">
								{searchTerm || filterBidang !== "all"
									? "Coba ubah filter atau kata kunci pencarian"
									: 'Klik "Tambah Pegawai" untuk menambahkan data baru'}
							</p>
						</div>
					</div>
				</div>
			) : (
				<>
					{/* Pagination Info */}
					<div className="mb-4 flex justify-between items-center text-sm text-gray-600">
						<div>
							Menampilkan <span className="font-semibold text-indigo-600">{(currentPage - 1) * itemsPerPage + 1}</span> -{" "}
							<span className="font-semibold text-indigo-600">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> dari{" "}
							<span className="font-semibold text-indigo-600">{filtered.length}</span> pegawai
						</div>
						<div className="text-gray-500">
							Halaman {currentPage} dari {totalPages}
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
						{paginated.map((pegawai) => (
							<div
								key={pegawai.id_pegawai}
								className="bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 group"
							>
								{/* Header */}
								<div className={`p-5 bg-gradient-to-br ${getBidangColor(pegawai.bidangs?.nama)}`}>
									<div className="flex items-center gap-3">
										<div className="h-14 w-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
											<LuUser className="h-7 w-7 text-white" />
										</div>
										<div className="flex-1 min-w-0">
											<h4 className="font-bold text-white text-lg truncate">{pegawai.nama_pegawai}</h4>
											<span className="inline-block px-3 py-1 text-xs bg-white/20 backdrop-blur-sm text-white rounded-full font-medium truncate max-w-full">
												{pegawai.bidangs?.nama || "-"}
											</span>
										</div>
									</div>
								</div>

								{/* Body */}
								<div className="p-5 space-y-3">
									<div className="flex items-center gap-3 text-gray-600">
										<div className="h-9 w-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
											<LuBuilding2 className="h-4 w-4 text-purple-600" />
										</div>
										<span className="text-sm truncate">{pegawai.bidangs?.nama || "-"}</span>
									</div>

									{/* Linked User Account */}
									<div className="flex items-start gap-3 text-gray-600">
										<div className="h-9 w-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
											<LuUserCircle className="h-4 w-4 text-blue-600" />
										</div>
										<div className="flex-1 min-w-0">
											{pegawai.users?.length > 0 ? (
												pegawai.users.map((u) => (
													<div key={u.id} className="text-sm">
														<span className="font-medium text-gray-700">{u.name}</span>
														<span className="text-gray-400 text-xs ml-1">({u.role})</span>
													</div>
												))
											) : (
												<span className="text-sm text-gray-400 italic">Belum terhubung akun</span>
											)}
										</div>
									</div>

									{/* Actions */}
									<div className="flex gap-2 pt-3 border-t border-gray-100">
										<button
											onClick={() => handleEdit(pegawai)}
											className="flex-1 flex items-center justify-center gap-2 p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all text-sm font-medium"
										>
											<LuPencil className="h-4 w-4" />
											Edit
										</button>
										<button
											onClick={() => handleDelete(pegawai)}
											className="flex-1 flex items-center justify-center gap-2 p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all text-sm font-medium"
										>
											<LuTrash2 className="h-4 w-4" />
											Hapus
										</button>
									</div>
								</div>
							</div>
						))}
					</div>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="mt-8 flex justify-center items-center gap-2">
							<button
								onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
								disabled={currentPage === 1}
								className={`p-3 rounded-xl transition-all ${
									currentPage === 1
										? "bg-gray-100 text-gray-400 cursor-not-allowed"
										: "bg-white text-indigo-600 hover:bg-indigo-50 shadow-md hover:shadow-lg"
								}`}
							>
								<LuChevronLeft className="h-5 w-5" />
							</button>
							<div className="flex gap-2">
								{Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
									const show =
										page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1);
									const showEllipsisBefore = page === currentPage - 2 && currentPage > 3;
									const showEllipsisAfter = page === currentPage + 2 && currentPage < totalPages - 2;
									if (!show && !showEllipsisBefore && !showEllipsisAfter) return null;
									if (showEllipsisBefore || showEllipsisAfter) {
										return (
											<span key={page} className="px-3 py-2 text-gray-400">...</span>
										);
									}
									return (
										<button
											key={page}
											onClick={() => setCurrentPage(page)}
											className={`min-w-[44px] h-[44px] rounded-xl font-medium transition-all ${
												currentPage === page
													? "bg-indigo-600 text-white shadow-lg scale-105"
													: "bg-white text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 shadow-md"
											}`}
										>
											{page}
										</button>
									);
								})}
							</div>
							<button
								onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
								disabled={currentPage === totalPages}
								className={`p-3 rounded-xl transition-all ${
									currentPage === totalPages
										? "bg-gray-100 text-gray-400 cursor-not-allowed"
										: "bg-white text-indigo-600 hover:bg-indigo-50 shadow-md hover:shadow-lg"
								}`}
							>
								<LuChevronRight className="h-5 w-5" />
							</button>
						</div>
					)}
				</>
			)}

			{/* Modal */}
			<PegawaiFormModal
				isOpen={showModal}
				onClose={() => {
					setShowModal(false);
					setEditPegawai(null);
				}}
				onSaved={handleSaved}
				pegawai={editPegawai}
				bidangList={bidangList}
			/>
		</div>
	);
};

export default KepegawaianPage;
