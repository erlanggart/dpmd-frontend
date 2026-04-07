// src/pages/superadmin/KepegawaianPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
	LuUsers,
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
	LuEye,
	LuCircleUser,
} from "react-icons/lu";
import * as XLSX from "xlsx";
import api from "../../api";
import Swal from "sweetalert2";
import { getAvatarUrl } from "../../utils/avatarUtils";

// ===================== Add/Edit Modal =====================
const PegawaiFormModal = ({ isOpen, onClose, onSaved, pegawai, bidangList }) => {
	const [form, setForm] = useState({
		nama_pegawai: "", id_bidang: "", nip: "", jabatan: "", golongan: "", pangkat: "", eselon: "",
		jenis_kelamin: "", tempat_lahir: "", tanggal_lahir: "", pendidikan_terakhir: "",
		status_kepegawaian: "", no_hp: "", alamat: "", tmt_jabatan: "", unit_kerja: "",
	});
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (pegawai) {
			setForm({
				nama_pegawai: pegawai.nama_pegawai || "",
				id_bidang: pegawai.id_bidang?.toString() || "",
				nip: pegawai.nip || "",
				jabatan: pegawai.jabatan || "",
				golongan: pegawai.golongan || "",
				pangkat: pegawai.pangkat || "",
				eselon: pegawai.eselon || "",
				jenis_kelamin: pegawai.jenis_kelamin || "",
				tempat_lahir: pegawai.tempat_lahir || "",
				tanggal_lahir: pegawai.tanggal_lahir ? pegawai.tanggal_lahir.substring(0, 10) : "",
				pendidikan_terakhir: pegawai.pendidikan_terakhir || "",
				status_kepegawaian: pegawai.status_kepegawaian || "",
				no_hp: pegawai.no_hp || "",
				alamat: pegawai.alamat || "",
				tmt_jabatan: pegawai.tmt_jabatan ? pegawai.tmt_jabatan.substring(0, 10) : "",
				unit_kerja: pegawai.unit_kerja || "",
			});
		} else {
			setForm({
				nama_pegawai: "", id_bidang: "", nip: "", jabatan: "", golongan: "", pangkat: "", eselon: "",
				jenis_kelamin: "", tempat_lahir: "", tanggal_lahir: "", pendidikan_terakhir: "",
				status_kepegawaian: "", no_hp: "", alamat: "", tmt_jabatan: "", unit_kerja: "",
			});
		}
	}, [pegawai]);

	if (!isOpen) return null;

	const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!form.nama_pegawai.trim() || !form.id_bidang) return;

		setSaving(true);
		try {
			const payload = {
				...form,
				id_bidang: parseInt(form.id_bidang),
				nama_pegawai: form.nama_pegawai.trim(),
			};
			if (pegawai) {
				await api.put(`/pegawai/${pegawai.id_pegawai}`, payload);
			} else {
				await api.post("/pegawai", payload);
			}
			onSaved();
		} catch (err) {
			Swal.fire("Gagal!", err.response?.data?.message || "Gagal menyimpan data pegawai.", "error");
		} finally {
			setSaving(false);
		}
	};

	const inputClass = "w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm";
	const labelClass = "block text-xs font-medium text-gray-600 mb-1";

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
			<div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
				<div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white flex items-center justify-between">
					<h3 className="text-lg font-bold">{pegawai ? "Edit Pegawai" : "Tambah Pegawai"}</h3>
					<button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
						<LuX className="w-5 h-5" />
					</button>
				</div>
				<form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
					{/* Row 1: Nama & NIP */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className={labelClass}>Nama Pegawai <span className="text-red-500">*</span></label>
							<input type="text" value={form.nama_pegawai} onChange={(e) => handleChange("nama_pegawai", e.target.value)} placeholder="Nama lengkap..." className={inputClass} required />
						</div>
						<div>
							<label className={labelClass}>NIP</label>
							<input type="text" value={form.nip} onChange={(e) => handleChange("nip", e.target.value)} placeholder="18 digit NIP..." maxLength={18} className={inputClass} />
						</div>
					</div>

					{/* Row 2: Bidang & Status */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className={labelClass}>Bidang <span className="text-red-500">*</span></label>
							<div className="relative">
								<select value={form.id_bidang} onChange={(e) => handleChange("id_bidang", e.target.value)} className={`${inputClass} appearance-none bg-white`} required>
									<option value="">Pilih Bidang</option>
									{bidangList.map((b) => <option key={b.id} value={b.id}>{b.nama}</option>)}
								</select>
								<LuChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
							</div>
						</div>
						<div>
							<label className={labelClass}>Status Kepegawaian</label>
							<div className="relative">
								<select value={form.status_kepegawaian} onChange={(e) => handleChange("status_kepegawaian", e.target.value)} className={`${inputClass} appearance-none bg-white`}>
									<option value="">Pilih Status</option>
									<option value="PNS">PNS</option>
									<option value="PPPK">PPPK</option>
									<option value="Honorer">Honorer</option>
									<option value="THL">THL</option>
									<option value="Kontrak">Kontrak</option>
								</select>
								<LuChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
							</div>
						</div>
					</div>

					{/* Row 3: Jabatan & Unit Kerja */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className={labelClass}>Jabatan</label>
							<input type="text" value={form.jabatan} onChange={(e) => handleChange("jabatan", e.target.value)} placeholder="Jabatan..." className={inputClass} />
						</div>
						<div>
							<label className={labelClass}>Unit Kerja</label>
							<input type="text" value={form.unit_kerja} onChange={(e) => handleChange("unit_kerja", e.target.value)} placeholder="Unit kerja..." className={inputClass} />
						</div>
					</div>

					{/* Row 4: Golongan, Pangkat, Eselon */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label className={labelClass}>Golongan</label>
							<input type="text" value={form.golongan} onChange={(e) => handleChange("golongan", e.target.value)} placeholder="Misal: III/a" className={inputClass} />
						</div>
						<div>
							<label className={labelClass}>Pangkat</label>
							<input type="text" value={form.pangkat} onChange={(e) => handleChange("pangkat", e.target.value)} placeholder="Misal: Penata Muda" className={inputClass} />
						</div>
						<div>
							<label className={labelClass}>Eselon</label>
							<input type="text" value={form.eselon} onChange={(e) => handleChange("eselon", e.target.value)} placeholder="Misal: III.a" className={inputClass} />
						</div>
					</div>

					{/* Row 5: Jenis Kelamin, Tempat Lahir, Tanggal Lahir */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label className={labelClass}>Jenis Kelamin</label>
							<div className="relative">
								<select value={form.jenis_kelamin} onChange={(e) => handleChange("jenis_kelamin", e.target.value)} className={`${inputClass} appearance-none bg-white`}>
									<option value="">Pilih</option>
									<option value="L">Laki-laki</option>
									<option value="P">Perempuan</option>
								</select>
								<LuChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
							</div>
						</div>
						<div>
							<label className={labelClass}>Tempat Lahir</label>
							<input type="text" value={form.tempat_lahir} onChange={(e) => handleChange("tempat_lahir", e.target.value)} placeholder="Kota..." className={inputClass} />
						</div>
						<div>
							<label className={labelClass}>Tanggal Lahir</label>
							<input type="date" value={form.tanggal_lahir} onChange={(e) => handleChange("tanggal_lahir", e.target.value)} className={inputClass} />
						</div>
					</div>

					{/* Row 6: Pendidikan, TMT Jabatan */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className={labelClass}>Pendidikan Terakhir</label>
							<div className="relative">
								<select value={form.pendidikan_terakhir} onChange={(e) => handleChange("pendidikan_terakhir", e.target.value)} className={`${inputClass} appearance-none bg-white`}>
									<option value="">Pilih Pendidikan</option>
									<option value="SD">SD</option>
									<option value="SMP">SMP</option>
									<option value="SMA/SMK">SMA/SMK</option>
									<option value="D1">D1</option>
									<option value="D2">D2</option>
									<option value="D3">D3</option>
									<option value="D4/S1">D4/S1</option>
									<option value="S2">S2</option>
									<option value="S3">S3</option>
								</select>
								<LuChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
							</div>
						</div>
						<div>
							<label className={labelClass}>TMT Jabatan</label>
							<input type="date" value={form.tmt_jabatan} onChange={(e) => handleChange("tmt_jabatan", e.target.value)} className={inputClass} />
						</div>
					</div>

					{/* Row 7: No HP */}
					<div>
						<label className={labelClass}>No. HP</label>
						<input type="text" value={form.no_hp} onChange={(e) => handleChange("no_hp", e.target.value)} placeholder="08xxxxxxxxxx" className={inputClass} />
					</div>

					{/* Row 8: Alamat */}
					<div>
						<label className={labelClass}>Alamat</label>
						<textarea value={form.alamat} onChange={(e) => handleChange("alamat", e.target.value)} placeholder="Alamat lengkap..." rows={2} className={`${inputClass} resize-none`} />
					</div>

					{/* Actions */}
					<div className="flex gap-3 pt-2">
						<button type="button" onClick={onClose} className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all">
							Batal
						</button>
						<button type="submit" disabled={saving || !form.nama_pegawai.trim() || !form.id_bidang} className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
							{saving ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" /> : <><LuCheck className="w-5 h-5" />{pegawai ? "Simpan" : "Tambah"}</>}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

// ===================== Main Page =====================
const KepegawaianPage = () => {
	const navigate = useNavigate();
	const [pegawaiList, setPegawaiList] = useState([]);
	const [bidangList, setBidangList] = useState([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [filterBidang, setFilterBidang] = useState("all");
	const [currentPage, setCurrentPage] = useState(1);
	const [showModal, setShowModal] = useState(false);
	const [editPegawai, setEditPegawai] = useState(null);
	const itemsPerPage = 15;

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

	const filtered = useMemo(() => {
		return pegawaiList.filter((p) => {
			const q = searchTerm.toLowerCase();
			const matchSearch =
				p.nama_pegawai?.toLowerCase().includes(q) ||
				p.nip?.toLowerCase().includes(q) ||
				p.jabatan?.toLowerCase().includes(q) ||
				p.bidangs?.nama?.toLowerCase().includes(q);
			const matchBidang = filterBidang === "all" || p.id_bidang === parseInt(filterBidang);
			return matchSearch && matchBidang;
		});
	}, [pegawaiList, searchTerm, filterBidang]);

	const totalPages = Math.ceil(filtered.length / itemsPerPage);
	const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

	useEffect(() => { setCurrentPage(1); }, [searchTerm, filterBidang]);

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

	const handleSaved = () => {
		setShowModal(false);
		setEditPegawai(null);
		fetchPegawai();
		Swal.fire({ title: "Berhasil!", text: "Data pegawai berhasil disimpan.", icon: "success", timer: 2000, showConfirmButton: false });
	};

	const handleOpenDetail = (pegawai) => {
		navigate(`/superadmin/kepegawaian/${pegawai.id_pegawai}`, {
			state: { pegawai },
		});
	};

	const handleExport = () => {
		const rows = filtered.map((p, idx) => ({
			No: idx + 1,
			"Nama Pegawai": p.nama_pegawai || "",
			NIP: p.nip || "-",
			Bidang: p.bidangs?.nama || "-",
			Jabatan: p.jabatan || "-",
			Golongan: p.golongan || "-",
			Pangkat: p.pangkat || "-",
			Eselon: p.eselon || "-",
			"Jenis Kelamin": p.jenis_kelamin === "L" ? "Laki-laki" : p.jenis_kelamin === "P" ? "Perempuan" : "-",
			"Tempat Lahir": p.tempat_lahir || "-",
			"Tanggal Lahir": p.tanggal_lahir ? new Date(p.tanggal_lahir).toLocaleDateString("id-ID") : "-",
			"Pendidikan Terakhir": p.pendidikan_terakhir || "-",
			"Status Kepegawaian": p.status_kepegawaian || "-",
			"No. HP": p.no_hp || "-",
			"Unit Kerja": p.unit_kerja || "-",
			Email: p.users?.[0]?.email || "-",
		}));
		const ws = XLSX.utils.json_to_sheet(rows);
		if (rows.length > 0) {
			ws["!cols"] = Object.keys(rows[0]).map((key) => ({
				wch: Math.max(key.length, ...rows.map((r) => String(r[key] || "").length)) + 2,
			}));
		}
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Data Pegawai");
		XLSX.writeFile(wb, `Data_Pegawai_DPMD_${new Date().toISOString().split("T")[0]}.xlsx`);
		Swal.fire({ title: "Berhasil!", text: `Data berhasil diekspor (${filtered.length} data)`, icon: "success", timer: 2000, showConfirmButton: false });
	};

	const getRoleBadge = (role) => {
		const map = {
			kepala_dinas: { label: "Kepala Dinas", color: "bg-red-100 text-red-700" },
			sekretaris_dinas: { label: "Sekretaris", color: "bg-orange-100 text-orange-700" },
			kepala_bidang: { label: "Kabid", color: "bg-purple-100 text-purple-700" },
			ketua_tim: { label: "Ketua Tim", color: "bg-blue-100 text-blue-700" },
			pegawai: { label: "Pegawai", color: "bg-green-100 text-green-700" },
		};
		return map[role] || { label: role, color: "bg-gray-100 text-gray-700" };
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
					<div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
						<div>
							<h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
								<div className="h-10 w-10 md:h-12 md:w-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
									<LuUsers className="w-6 h-6 md:w-7 md:h-7" />
								</div>
								Manajemen Kepegawaian
							</h1>
							<p className="text-white/90">Kelola data pegawai DPMD Kabupaten Bogor</p>
						</div>
						<div className="flex items-center gap-3 text-sm">
							<div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2">
								<span className="font-bold text-xl">{pegawaiList.length}</span>
								<span className="text-white/80 ml-1">Pegawai</span>
							</div>
							<div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2">
								<span className="font-bold text-xl">{bidangList.length}</span>
								<span className="text-white/80 ml-1">Bidang</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Filters & Actions */}
			<div className="bg-white rounded-2xl shadow-lg p-5 mb-6">
				<div className="flex flex-col md:flex-row gap-4">
					<div className="relative flex-1">
						<LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
						<input
							type="text"
							placeholder="Cari nama, NIP, atau jabatan..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
						/>
					</div>
					<div className="relative w-full md:w-64">
						<LuBuilding2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
						<select
							value={filterBidang}
							onChange={(e) => setFilterBidang(e.target.value)}
							className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none bg-white"
						>
							<option value="all">Semua Bidang</option>
							{bidangList.map((b) => <option key={b.id} value={b.id}>{b.nama}</option>)}
						</select>
						<LuChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
					</div>
					<div className="flex gap-3">
						<button onClick={handleExport} className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl whitespace-nowrap">
							<LuDownload className="h-5 w-5" />
							<span className="font-semibold hidden sm:inline">Ekspor</span>
						</button>
						<button
							onClick={() => { setEditPegawai(null); setShowModal(true); }}
							className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl whitespace-nowrap"
						>
							<LuPlus className="h-5 w-5" />
							<span className="font-semibold">Tambah</span>
						</button>
					</div>
				</div>
				<div className="mt-3 text-sm text-gray-500">
					Menampilkan <span className="font-semibold text-gray-700">{filtered.length}</span> dari <span className="font-semibold text-gray-700">{pegawaiList.length}</span> pegawai
				</div>
			</div>

			{/* Table */}
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
								{searchTerm || filterBidang !== "all" ? "Coba ubah filter atau kata kunci pencarian" : 'Klik "Tambah" untuk menambahkan data baru'}
							</p>
						</div>
					</div>
				</div>
			) : (
				<div className="bg-white rounded-2xl shadow-lg overflow-hidden">
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 text-xs uppercase tracking-wider">
									<th className="px-4 py-4 text-left font-semibold w-12">No</th>
									<th className="px-4 py-4 text-left font-semibold min-w-[200px]">Nama Pegawai</th>
									<th className="px-4 py-4 text-left font-semibold min-w-[160px]">NIP</th>
									<th className="px-4 py-4 text-left font-semibold min-w-[150px]">Bidang</th>
									<th className="px-4 py-4 text-left font-semibold min-w-[140px]">Jabatan</th>
									<th className="px-4 py-4 text-left font-semibold w-24">Gol</th>
									<th className="px-4 py-4 text-left font-semibold w-20">JK</th>
									<th className="px-4 py-4 text-left font-semibold w-24">Status</th>
									<th className="px-4 py-4 text-left font-semibold w-24">Role</th>
									<th className="px-4 py-4 text-center font-semibold w-32">Aksi</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100">
								{paginated.map((p, idx) => {
									const user = p.users?.[0];
									const avatarUrl = getAvatarUrl(user?.avatar);
									const roleBadge = user ? getRoleBadge(user.role) : null;
									return (
										<tr key={p.id_pegawai} className="hover:bg-indigo-50/40 transition-colors">
											<td className="px-4 py-3.5 text-gray-500 font-medium">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
											<td className="px-4 py-3.5">
												<div className="flex items-center gap-3">
													<div className="h-9 w-9 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
														{avatarUrl ? (
															<img src={avatarUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />
														) : (
															<LuCircleUser className="w-5 h-5 text-indigo-600" />
														)}
													</div>
													<div className="min-w-0">
														<p className="font-semibold text-gray-800 truncate">{p.nama_pegawai}</p>
														{user?.email && <p className="text-xs text-gray-400 truncate">{user.email}</p>}
													</div>
												</div>
											</td>
											<td className="px-4 py-3.5 text-gray-600 font-mono text-xs">{p.nip || <span className="text-gray-300">-</span>}</td>
											<td className="px-4 py-3.5">
												<span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium truncate max-w-[140px]">
													{p.bidangs?.nama || "-"}
												</span>
											</td>
											<td className="px-4 py-3.5 text-gray-600 text-xs truncate max-w-[140px]">{p.jabatan || <span className="text-gray-300">-</span>}</td>
											<td className="px-4 py-3.5 text-gray-600 text-xs">{p.golongan || <span className="text-gray-300">-</span>}</td>
											<td className="px-4 py-3.5 text-gray-600 text-xs">{p.jenis_kelamin === "L" ? "L" : p.jenis_kelamin === "P" ? "P" : <span className="text-gray-300">-</span>}</td>
											<td className="px-4 py-3.5">
												{p.status_kepegawaian ? (
													<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
														{p.status_kepegawaian}
													</span>
												) : <span className="text-gray-300 text-xs">-</span>}
											</td>
											<td className="px-4 py-3.5">
												{roleBadge ? (
													<span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${roleBadge.color}`}>
														{roleBadge.label}
													</span>
												) : <span className="text-gray-300 text-xs">-</span>}
											</td>
											<td className="px-4 py-3.5">
												<div className="flex items-center justify-center gap-1">
													<button onClick={() => handleOpenDetail(p)} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Detail">
														<LuEye className="h-4 w-4" />
													</button>
													<button onClick={() => { setEditPegawai(p); setShowModal(true); }} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Edit">
														<LuPencil className="h-4 w-4" />
													</button>
													<button onClick={() => handleDelete(p)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Hapus">
														<LuTrash2 className="h-4 w-4" />
													</button>
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
							<p className="text-sm text-gray-500">
								Halaman <span className="font-semibold text-gray-700">{currentPage}</span> dari <span className="font-semibold text-gray-700">{totalPages}</span>
							</p>
							<div className="flex items-center gap-2">
								<button
									onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
									disabled={currentPage === 1}
									className={`p-2.5 rounded-xl transition-all ${currentPage === 1 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-indigo-600 hover:bg-indigo-50 shadow-md hover:shadow-lg border border-gray-200"}`}
								>
									<LuChevronLeft className="h-4 w-4" />
								</button>
								<div className="flex gap-1">
									{Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
										const show = page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1);
										const showEllipsis = (page === currentPage - 2 && currentPage > 3) || (page === currentPage + 2 && currentPage < totalPages - 2);
										if (!show && !showEllipsis) return null;
										if (showEllipsis) return <span key={page} className="px-2 py-1 text-gray-400">...</span>;
										return (
											<button key={page} onClick={() => setCurrentPage(page)} className={`min-w-[36px] h-[36px] rounded-xl text-sm font-medium transition-all ${currentPage === page ? "bg-indigo-600 text-white shadow-lg" : "bg-white text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-200"}`}>
												{page}
											</button>
										);
									})}
								</div>
								<button
									onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
									disabled={currentPage === totalPages}
									className={`p-2.5 rounded-xl transition-all ${currentPage === totalPages ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-indigo-600 hover:bg-indigo-50 shadow-md hover:shadow-lg border border-gray-200"}`}
								>
									<LuChevronRight className="h-4 w-4" />
								</button>
							</div>
						</div>
					)}
				</div>
			)}

			{/* Modals */}
			<PegawaiFormModal
				isOpen={showModal}
				onClose={() => { setShowModal(false); setEditPegawai(null); }}
				onSaved={handleSaved}
				pegawai={editPegawai}
				bidangList={bidangList}
			/>
		</div>
	);
};

export default KepegawaianPage;