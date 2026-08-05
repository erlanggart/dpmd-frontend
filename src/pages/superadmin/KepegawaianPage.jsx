// src/pages/superadmin/KepegawaianPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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

	const inputClass = "w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900";
	const labelClass = "mb-1.5 block text-xs font-medium text-slate-600";

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
			<div className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
				<div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
					<h3 className="text-base font-semibold text-slate-900">{pegawai ? "Edit Pegawai" : "Tambah Pegawai"}</h3>
					<button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900">
						<LuX className="w-5 h-5" />
					</button>
				</div>
				<form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
					{/* Row 1: Nama & NIP */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className={labelClass}>Nama Pegawai <span className="text-rose-500">*</span></label>
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
							<label className={labelClass}>Bidang <span className="text-rose-500">*</span></label>
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
						<button type="button" onClick={onClose} className="flex-1 rounded-lg border border-slate-200 px-4 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-50">
							Batal
						</button>
						<button type="submit" disabled={saving || !form.nama_pegawai.trim() || !form.id_bidang} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">
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
	const location = useLocation();
	// Halaman ini dipakai di tiga jalur: /superadmin/kepegawaian,
	// /superadmin/bidang/sekretariat/kepegawaian, dan /sekretariat/kepegawaian.
	// Tautan detail harus tetap di jalur yang sedang dibuka, bukan lompat ke
	// /superadmin dan memicu penolakan akses untuk pegawai Umpeg.
	const basePath = location.pathname.replace(/\/+$/, "");
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
		navigate(`${basePath}/${pegawai.id_pegawai}`, {
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
			kepala_dinas: { label: "Kepala Dinas", color: "bg-brand-50 text-brand-700" },
			sekretaris_dinas: { label: "Sekretaris", color: "bg-brand-50 text-brand-700" },
			kepala_bidang: { label: "Kabid", color: "bg-slate-900 text-white" },
			ketua_tim: { label: "Ketua Tim", color: "bg-slate-100 text-slate-700" },
			pegawai: { label: "Pegawai", color: "bg-slate-100 text-slate-700" },
		};
		return map[role] || { label: role, color: "bg-slate-100 text-slate-700" };
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-12">
				<div className="flex flex-col items-center gap-3">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
					<p className="text-sm text-slate-500">Memuat data kepegawaian...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-slate-50">
			<div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
			{/* Header */}
			<div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
				<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
					<div className="flex min-w-0 items-start gap-3.5">
						<div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
							<LuUsers className="h-5 w-5" />
							<span className="absolute -bottom-0.5 left-1/2 h-1 w-5 -translate-x-1/2 rounded-full bg-brand-500" />
						</div>
						<div className="min-w-0">
							<p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
								Umum &amp; Kepegawaian
							</p>
							<h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
								Data Kepegawaian
							</h1>
							<p className="mt-1 text-sm leading-6 text-slate-500">
								Kelola data pegawai DPMD Kabupaten Bogor — NIP, pangkat, golongan, dan jabatan.
							</p>
						</div>
					</div>
					<div className="flex flex-shrink-0 gap-3">
						<div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
							<p className="text-xl font-semibold leading-none tabular-nums text-slate-900">{pegawaiList.length}</p>
							<p className="mt-1 text-[11px] font-medium text-slate-500">Pegawai</p>
						</div>
						<div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
							<p className="text-xl font-semibold leading-none tabular-nums text-slate-900">{bidangList.length}</p>
							<p className="mt-1 text-[11px] font-medium text-slate-500">Bidang</p>
						</div>
					</div>
				</div>
			</div>

			{/* Filters & Actions */}
			<div className="rounded-xl border border-slate-200 bg-white p-5">
				<div className="flex flex-col md:flex-row gap-4">
					<div className="relative flex-1">
						<LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
						<input
							type="text"
							placeholder="Cari nama, NIP, atau jabatan..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full rounded-lg border border-slate-200 py-2.5 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
						/>
					</div>
					<div className="relative w-full md:w-64">
						<LuBuilding2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
						<select
							value={filterBidang}
							onChange={(e) => setFilterBidang(e.target.value)}
							className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 transition-colors focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
						>
							<option value="all">Semua Bidang</option>
							{bidangList.map((b) => <option key={b.id} value={b.id}>{b.nama}</option>)}
						</select>
						<LuChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
					</div>
					<div className="flex gap-3">
						<button onClick={handleExport} className="flex items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
							<LuDownload className="h-4 w-4" />
							<span className="hidden sm:inline">Ekspor</span>
						</button>
						<button
							onClick={() => { setEditPegawai(null); setShowModal(true); }}
							className="flex items-center gap-2 whitespace-nowrap rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
						>
							<LuPlus className="h-4 w-4" />
							<span>Tambah</span>
						</button>
					</div>
				</div>
				<div className="mt-3 text-sm text-slate-500">
					Menampilkan <span className="font-semibold text-slate-900">{filtered.length}</span> dari <span className="font-semibold text-slate-900">{pegawaiList.length}</span> pegawai
				</div>
			</div>

			{/* Table */}
			{filtered.length === 0 ? (
				<div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
					<div className="flex flex-col items-center gap-4">
						<div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100">
							<LuUsers className="h-6 w-6 text-slate-400" />
						</div>
						<div>
							<p className="mb-1 text-base font-semibold text-slate-900">
								{searchTerm || filterBidang !== "all" ? "Tidak ada pegawai yang sesuai" : "Belum ada data pegawai"}
							</p>
							<p className="text-sm text-slate-500">
								{searchTerm || filterBidang !== "all" ? "Coba ubah filter atau kata kunci pencarian." : 'Klik "Tambah" untuk menambahkan data baru.'}
							</p>
						</div>
					</div>
				</div>
			) : (
				<div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
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
							<tbody className="divide-y divide-slate-100">
								{paginated.map((p, idx) => {
									const user = p.users?.[0];
									const avatarUrl = getAvatarUrl(user?.avatar);
									const roleBadge = user ? getRoleBadge(user.role) : null;
									return (
										<tr key={p.id_pegawai} className="transition-colors hover:bg-slate-50">
											<td className="px-4 py-3.5 font-medium text-slate-400">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
											<td className="px-4 py-3.5">
												<div className="flex items-center gap-3">
													<div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
														{avatarUrl ? (
															<img src={avatarUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />
														) : (
															<LuCircleUser className="h-5 w-5 text-slate-400" />
														)}
													</div>
													<div className="min-w-0">
														<p className="truncate font-semibold text-slate-900">{p.nama_pegawai}</p>
														{user?.email && <p className="truncate text-xs text-slate-400">{user.email}</p>}
													</div>
												</div>
											</td>
											<td className="px-4 py-3.5 font-mono text-xs text-slate-600">{p.nip || <span className="text-slate-300">-</span>}</td>
											<td className="px-4 py-3.5">
												<span className="inline-flex max-w-[140px] items-center truncate rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
													{p.bidangs?.nama || "-"}
												</span>
											</td>
											<td className="max-w-[140px] truncate px-4 py-3.5 text-xs text-slate-600">{p.jabatan || <span className="text-slate-300">-</span>}</td>
											<td className="px-4 py-3.5 text-xs text-slate-600">{p.golongan || <span className="text-slate-300">-</span>}</td>
											<td className="px-4 py-3.5 text-xs text-slate-600">{p.jenis_kelamin === "L" ? "L" : p.jenis_kelamin === "P" ? "P" : <span className="text-slate-300">-</span>}</td>
											<td className="px-4 py-3.5">
												{p.status_kepegawaian ? (
													<span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700">
														{p.status_kepegawaian}
													</span>
												) : <span className="text-xs text-slate-300">-</span>}
											</td>
											<td className="px-4 py-3.5">
												{roleBadge ? (
													<span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${roleBadge.color}`}>
														{roleBadge.label}
													</span>
												) : <span className="text-xs text-slate-300">-</span>}
											</td>
											<td className="px-4 py-3.5">
												<div className="flex items-center justify-center gap-1">
													<button onClick={() => handleOpenDetail(p)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900" title="Detail">
														<LuEye className="h-4 w-4" />
													</button>
													<button onClick={() => { setEditPegawai(p); setShowModal(true); }} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900" title="Edit">
														<LuPencil className="h-4 w-4" />
													</button>
													<button onClick={() => handleDelete(p)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600" title="Hapus">
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
						<div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
							<p className="text-sm text-slate-500">
								Halaman <span className="font-semibold text-slate-900">{currentPage}</span> dari <span className="font-semibold text-slate-900">{totalPages}</span>
							</p>
							<div className="flex items-center gap-2">
								<button
									onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
									disabled={currentPage === 1}
									className={`rounded-lg p-2.5 transition-colors ${currentPage === 1 ? "cursor-not-allowed bg-slate-100 text-slate-300" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
								>
									<LuChevronLeft className="h-4 w-4" />
								</button>
								<div className="flex gap-1">
									{Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
										const show = page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1);
										const showEllipsis = (page === currentPage - 2 && currentPage > 3) || (page === currentPage + 2 && currentPage < totalPages - 2);
										if (!show && !showEllipsis) return null;
										if (showEllipsis) return <span key={page} className="px-2 py-1 text-slate-400">...</span>;
										return (
											<button key={page} onClick={() => setCurrentPage(page)} className={`h-[36px] min-w-[36px] rounded-lg text-sm font-medium transition-colors ${currentPage === page ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
												{page}
											</button>
										);
									})}
								</div>
								<button
									onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
									disabled={currentPage === totalPages}
									className={`rounded-lg p-2.5 transition-colors ${currentPage === totalPages ? "cursor-not-allowed bg-slate-100 text-slate-300" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
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
		</div>
	);
};

export default KepegawaianPage;