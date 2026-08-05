import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
	getAparaturDesaById,
	updateAparaturDesa,
} from "../../../api/aparaturDesaApi";
import { 
	FaArrowLeft, 
	FaEdit, 
	FaUser, 
	FaBriefcase, 
	FaCalendarAlt,
	FaMapMarkerAlt,
	FaVenusMars,
	FaGraduationCap,
	FaPray,
	FaIdCard,
	FaMedal,
	FaFileAlt,
	FaCheckCircle,
	FaTimesCircle,
	FaClock,
	FaShieldAlt,
	FaFilePdf,
	FaFileImage,
	FaExternalLinkAlt,
	FaLink
} from "react-icons/fa";
import Swal from "sweetalert2";

const getBaseHost = () => {
	const apiBase =
		import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
	return apiBase.replace(/\/?api\/?$/, "");
};

const fotoUrl = (person) => {
	if (person?.file_pas_foto) {
		return `${getBaseHost()}/uploads/aparatur_desa_files/${
			person.file_pas_foto
		}`;
	}
	return "/user-default.svg";
};

const fileUrl = (filename) =>
	filename ? `${getBaseHost()}/uploads/aparatur_desa_files/${filename}` : null;

const InfoCard = ({ icon, label, value, color = "text-slate-600" }) => {
	const IconComp = icon;
	return (
		<div className="bg-slate-50 p-4 rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
			<div className="flex items-start gap-3">
				<div className={`mt-1 ${color}`}>
					<IconComp className="w-5 h-5" />
				</div>
				<div className="flex-1 min-w-0">
					<p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
					<p className="text-sm font-semibold text-slate-900 break-words">{value || "-"}</p>
				</div>
			</div>
		</div>
	);
};

const AparaturDesaDetailPage = () => {
	const { id } = useParams();
	const nav = useNavigate();
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [saving, setSaving] = useState(false);
	const [statusForm, setStatusForm] = useState({
		status: "Aktif",
		tanggal_pemberhentian: "",
		keterangan: "",
	});

	useEffect(() => {
		const load = async () => {
			try {
				setLoading(true);
				const res = await getAparaturDesaById(id);
				setData(res.data.data);
				const d = res.data.data || {};
				setStatusForm({
					status: d.status || "Aktif",
					tanggal_pemberhentian: d.tanggal_pemberhentian || "",
					keterangan: d.keterangan || "",
				});
			} catch (err) {
				console.error("Error loading aparatur detail:", err);
				setError("Gagal memuat detail aparatur.");
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [id]);

	if (loading) return <p>Memuat...</p>;
	if (error) return <p className="text-rose-600">{error}</p>;
	if (!data) return <p>Data tidak ditemukan.</p>;

	const formatDate = (dateString) => {
		if (!dateString) return "-";
		const date = new Date(dateString);
		return date.toLocaleDateString("id-ID", {
			day: "2-digit",
			month: "long",
			year: "numeric",
		});
	};

	const masaJabat = () => {
		if (!data?.tanggal_pengangkatan) return "-";
		const start = new Date(data.tanggal_pengangkatan);
		const end = data?.tanggal_pemberhentian
			? new Date(data.tanggal_pemberhentian)
			: new Date();
		const diffMs = Math.max(0, end - start);
		const years = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));
		const months = Math.floor(
			(diffMs % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30)
		);
		return `${years} th ${months} bln`;
	};

	const handleStatusSave = async (e) => {
		e.preventDefault();

		// Confirm first
		const result = await Swal.fire({
			title: "Ubah Status Aparatur?",
			text:
				statusForm.status === "Tidak Aktif"
					? "Aparatur akan dinonaktifkan. Lanjutkan?"
					: "Aparatur akan diaktifkan kembali. Lanjutkan?",
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Ya, simpan",
			cancelButtonText: "Batal",
		});
		if (!result.isConfirmed) return;

		try {
			setSaving(true);

			// Backend validate requires full payload; reuse existing data for required fields
			const d = data || {};
			const formData = new FormData();

			// Required fields according to backend validation
			const required = {
				nama_lengkap: d.nama_lengkap ?? "",
				jabatan: d.jabatan ?? "",
				tempat_lahir: d.tempat_lahir ?? "",
				tanggal_lahir: d.tanggal_lahir ?? "",
				jenis_kelamin: d.jenis_kelamin ?? "",
				pendidikan_terakhir: d.pendidikan_terakhir ?? "",
				agama: d.agama ?? "",
				tanggal_pengangkatan: d.tanggal_pengangkatan ?? "",
				nomor_sk_pengangkatan: d.nomor_sk_pengangkatan ?? "",
				status: statusForm.status,
			};

			// Optional-but-useful fields to keep existing values intact
			const optional = {
				nipd: d.nipd ?? "",
				pangkat_golongan: d.pangkat_golongan ?? "",
				bpjs_kesehatan_nomor: d.bpjs_kesehatan_nomor ?? "",
				bpjs_ketenagakerjaan_nomor: d.bpjs_ketenagakerjaan_nomor ?? "",
				produk_hukum_id:
					d.produk_hukum_id ?? (d.produk_hukum?.id || d.produkHukum?.id || ""),
				nomor_sk_pemberhentian: d.nomor_sk_pemberhentian ?? "",
				keterangan:
					statusForm.status === "Tidak Aktif"
						? statusForm.keterangan || ""
						: "",
			};

			Object.entries({ ...required, ...optional }).forEach(([k, v]) => {
				formData.append(k, v == null ? "" : v);
			});

			if (statusForm.status === "Tidak Aktif") {
				formData.append(
					"tanggal_pemberhentian",
					statusForm.tanggal_pemberhentian || ""
				);
			} else {
				// Reactivate clears tanggal_pemberhentian
				formData.append("tanggal_pemberhentian", "");
			}

			// Use POST alias for update (backend expects multipart)
			await updateAparaturDesa(id, formData);

			// Refresh
			const res = await getAparaturDesaById(id);
			setData(res.data.data);

			await Swal.fire({
				icon: "success",
				title: "Berhasil",
				text: "Status aparatur berhasil diperbarui.",
				timer: 1300,
				showConfirmButton: false,
			});
		} catch (e) {
			console.error(e);
			const msg = e?.response?.data?.message || "Gagal menyimpan status.";
			setError(msg);
			await Swal.fire({ icon: "error", title: "Gagal", text: msg });
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="space-y-5">
			{/* Header Section */}
			
				<div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
					<div className="flex items-center justify-between gap-4">
						<div className="flex min-w-0 items-center gap-3.5">
							<button
								className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
								onClick={() => nav("/desa/aparatur-desa")}
							>
								<FaArrowLeft className="h-4 w-4" />
							</button>
							<div className="min-w-0">
								<p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
									Aparatur Desa
								</p>
								<h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
									Detail Aparatur Desa
								</h1>
								<p className="mt-0.5 text-sm text-slate-500">Informasi lengkap aparatur pemerintahan desa.</p>
							</div>
						</div>
						<button
							className="inline-flex flex-shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
							onClick={() => nav(`/desa/aparatur-desa/${id}/edit`)}
						>
							<FaEdit className="h-4 w-4" />
							<span className="hidden sm:inline">Edit Data</span>
						</button>
					</div>
				</div>
			

			<div className="space-y-5">
				{/* Profile Card */}
				<div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
					<div className="border-b border-slate-100 bg-slate-50 p-6 sm:p-8">
						<div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
							<div className="relative">
								<img
									src={fotoUrl(data)}
									onError={(e) => (e.currentTarget.src = "/user-default.svg")}
									alt={data.nama_lengkap || "Foto"}
									className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border-4 border-white shadow-lg"
								/>
								<div className={`absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-xs font-semibold shadow-md ${
									data.status === 'Aktif' 
										? 'bg-emerald-600 text-white'
										: 'bg-slate-500 text-white'
								}`}>
									{data.status === 'Aktif' ? (
										<div className="flex items-center gap-1">
											<FaCheckCircle className="w-3 h-3" />
											<span>Aktif</span>
										</div>
									) : (
										<div className="flex items-center gap-1">
											<FaTimesCircle className="w-3 h-3" />
											<span>Tidak Aktif</span>
										</div>
									)}
								</div>
							</div>
							<div className="flex-1">
								<h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
									{data.nama_lengkap || "-"}
								</h2>
								<div className="mb-3 flex items-center gap-2 text-brand-600">
									<FaBriefcase className="w-5 h-5" />
									<span className="text-lg font-semibold">{data.jabatan || "-"}</span>
								</div>
								<div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
									<div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg">
										<FaClock className="w-4 h-4 text-slate-400" />
										<span>Masa Jabatan: <strong className="text-slate-900">{masaJabat()}</strong></span>
									</div>
									{data.nipd && (
										<div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg">
											<FaIdCard className="w-4 h-4 text-slate-400" />
											<span>NIPD: <strong className="text-slate-900">{data.nipd}</strong></span>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Informasi Pribadi */}
				<div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
					<h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
						<FaUser className="text-brand-600" />
						Informasi Pribadi
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						<InfoCard 
							icon={FaMapMarkerAlt}
							label="Tempat, Tanggal Lahir"
							value={`${data.tempat_lahir ?? "-"}, ${formatDate(data.tanggal_lahir)}`}
							color="text-slate-500"
						/>
						<InfoCard 
							icon={FaVenusMars}
							label="Jenis Kelamin"
							value={data.jenis_kelamin}
							color="text-slate-500"
						/>
						<InfoCard 
							icon={FaGraduationCap}
							label="Pendidikan Terakhir"
							value={data.pendidikan_terakhir}
							color="text-slate-500"
						/>
						<InfoCard 
							icon={FaPray}
							label="Agama"
							value={data.agama}
							color="text-amber-500"
						/>
						<InfoCard 
							icon={FaMedal}
							label="Pangkat/Golongan"
							value={data.pangkat_golongan}
							color="text-rose-500"
						/>
						<InfoCard 
							icon={FaIdCard}
							label="NIAP"
							value={data.niap}
							color="text-slate-500"
						/>
					</div>
				</div>

				{/* Informasi Kepegawaian */}
				<div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
					<h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
						<FaBriefcase className="text-brand-600" />
						Informasi Kepegawaian
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<InfoCard 
							icon={FaCalendarAlt}
							label="Tanggal Pengangkatan"
							value={formatDate(data.tanggal_pengangkatan)}
							color="text-slate-600"
						/>
						<InfoCard 
							icon={FaFileAlt}
							label="Nomor SK Pengangkatan"
							value={data.nomor_sk_pengangkatan}
							color="text-slate-600"
						/>
						{data.tanggal_pemberhentian && (
							<InfoCard 
								icon={FaCalendarAlt}
								label="Tanggal Pemberhentian"
								value={formatDate(data.tanggal_pemberhentian)}
								color="text-rose-600"
							/>
						)}
						{data.nomor_sk_pemberhentian && (
							<InfoCard 
								icon={FaFileAlt}
								label="Nomor SK Pemberhentian"
								value={data.nomor_sk_pemberhentian}
								color="text-rose-600"
							/>
						)}
					</div>
				</div>

				{/* BPJS & Jaminan Sosial */}
				<div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
					<h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
						<FaShieldAlt className="text-brand-600" />
						BPJS & Jaminan Sosial
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<InfoCard 
							icon={FaShieldAlt}
							label="BPJS Kesehatan"
							value={data.bpjs_kesehatan_nomor}
							color="text-slate-600"
						/>
						<InfoCard 
							icon={FaShieldAlt}
							label="BPJS Ketenagakerjaan"
							value={data.bpjs_ketenagakerjaan_nomor}
							color="text-slate-600"
						/>
					</div>
				</div>

				{/* Produk Hukum & Keterangan */}
				{(() => {
					const ph = data.produk_hukums || data.produk_hukum || data.produkHukum;
					const phId = data.produk_hukum_id || ph?.id;
					const phTitle = ph?.judul || null;
					
					if (phId || data.keterangan) {
						return (
							<div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
								<h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
									<FaFileAlt className="text-brand-600" />
									Dokumen & Catatan
								</h3>
								<div className="space-y-4">
									{phId && phTitle && (
										<div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
											<p className="text-xs font-medium text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-2">
												<FaLink className="w-3 h-3" />
												Produk Hukum Terkait
											</p>
											<button
												type="button"
												className="text-slate-600 hover:text-slate-700 font-semibold flex items-center gap-2 group"
												onClick={() => nav(`/desa/produk-hukum/${phId}`)}
											>
												<span>{phTitle}</span>
												<FaExternalLinkAlt className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
											</button>
										</div>
									)}
									{data.keterangan && (
										<InfoCard 
											icon={FaFileAlt}
											label="Keterangan"
											value={data.keterangan}
											color="text-slate-600"
										/>
									)}
								</div>
							</div>
						);
					}
					return null;
				})()}

				{/* Lampiran Dokumen */}
				<div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
					<h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
						<FaFilePdf className="text-brand-600" />
						Lampiran Dokumen
					</h3>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
						{[
							{ key: "file_ktp", label: "KTP", icon: FaIdCard, color: "blue" },
							{ key: "file_kk", label: "Kartu Keluarga", icon: FaFileAlt, color: "green" },
							{ key: "file_akta_kelahiran", label: "Akta Kelahiran", icon: FaFileAlt, color: "purple" },
							{ key: "file_ijazah_terakhir", label: "Ijazah Terakhir", icon: FaGraduationCap, color: "amber" },
							{ key: "file_bpjs_kesehatan", label: "BPJS Kesehatan", icon: FaShieldAlt, color: "emerald" },
							{ key: "file_bpjs_ketenagakerjaan", label: "BPJS Ketenagakerjaan", icon: FaShieldAlt, color: "cyan" },
						].map(({ key, label, icon, color }) => {
							const fname = data?.[key];
							const url = fileUrl(fname);
							const isPdf = fname?.toLowerCase().endsWith('.pdf');
							const FileIcon = isPdf ? FaFilePdf : FaFileImage;
							const DocIcon = icon;
							
							return (
								<div
									key={key}
									className={`relative p-4 rounded-lg border-2 transition-all ${
										url 
											? `border-${color}-200 bg-${color}-50 hover:shadow-md hover:border-${color}-300` 
											: 'border-slate-200 bg-slate-50'
									}`}
								>
									<div className="flex items-start gap-3">
										<div className={`p-2 rounded-lg ${
											url ? `bg-${color}-100` : 'bg-slate-200'
										}`}>
											<DocIcon className={`w-5 h-5 ${
												url ? `text-${color}-600` : 'text-slate-400'
											}`} />
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-semibold text-slate-900 mb-1">
												{label}
											</p>
											{url ? (
												<a
													href={url}
													target="_blank"
													rel="noopener noreferrer"
													className={`inline-flex items-center gap-1.5 text-xs font-medium text-${color}-600 hover:text-${color}-700 group`}
												>
													<FileIcon className="w-3.5 h-3.5" />
													<span>Lihat Dokumen</span>
													<FaExternalLinkAlt className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
												</a>
											) : (
												<p className="text-xs text-slate-400 flex items-center gap-1">
													<FaTimesCircle className="w-3 h-3" />
													<span>Belum upload</span>
												</p>
											)}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* Ubah Status Aparatur */}
				<div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
					<h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
						<FaCheckCircle className="text-brand-600" />
						Kelola Status Aparatur
					</h3>
					<form onSubmit={handleStatusSave} className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-2">
									Status Kepegawaian
								</label>
								<div className="relative">
									<select
										className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:border-slate-900 focus:ring-1 focus:ring-slate-900 appearance-none bg-white"
										value={statusForm.status}
										onChange={(e) =>
											setStatusForm((s) => ({ ...s, status: e.target.value }))
										}
									>
										<option value="Aktif">Aktif</option>
										<option value="Tidak Aktif">Tidak Aktif</option>
									</select>
									<div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
										{statusForm.status === 'Aktif' ? (
											<FaCheckCircle className="w-5 h-5 text-slate-500" />
										) : (
											<FaTimesCircle className="w-5 h-5 text-rose-500" />
										)}
									</div>
								</div>
							</div>
							{statusForm.status === "Tidak Aktif" && (
								<>
									<div>
										<label className="block text-sm font-medium text-slate-700 mb-2">
											Tanggal Pemberhentian
										</label>
										<div className="relative">
											<input
												type="date"
												className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
												value={statusForm.tanggal_pemberhentian || ""}
												onChange={(e) =>
													setStatusForm((s) => ({
														...s,
														tanggal_pemberhentian: e.target.value,
													}))
												}
											/>
											<FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
										</div>
									</div>
									<div className="md:col-span-1">
										<label className="block text-sm font-medium text-slate-700 mb-2">
											Alasan Pemberhentian
										</label>
										<div className="relative">
											<input
												type="text"
												className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
												placeholder="Contoh: Pensiun, Mutasi, dll"
												value={statusForm.keterangan || ""}
												onChange={(e) =>
													setStatusForm((s) => ({
														...s,
														keterangan: e.target.value,
													}))
												}
											/>
											<FaFileAlt className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
										</div>
									</div>
								</>
							)}
						</div>
						
						{statusForm.status === "Tidak Aktif" && (
							<div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
								<div className="flex gap-3">
									<FaTimesCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
									<div className="text-sm text-amber-800">
										<p className="font-semibold mb-1">Perhatian!</p>
										<p>Menonaktifkan status aparatur akan mengubah data kepegawaian. Pastikan informasi yang Anda masukkan sudah benar.</p>
									</div>
								</div>
							</div>
						)}

						<div className="flex justify-end pt-2">
							<button
								type="submit"
								disabled={saving}
								className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
							>
								{saving ? (
									<>
										<svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
											<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
											<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
										</svg>
										<span>Menyimpan...</span>
									</>
								) : (
									<>
										<FaCheckCircle className="w-5 h-5" />
										<span>Simpan Perubahan</span>
									</>
								)}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
};

export default AparaturDesaDetailPage;
