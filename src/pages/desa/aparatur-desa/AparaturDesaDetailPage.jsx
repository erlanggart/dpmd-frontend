import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
	getAparaturDesaById,
	updateAparaturDesa,
} from "../../../api/aparaturDesaApi";
import { FaArrowAltCircleLeft, FaArrowLeft } from "react-icons/fa";
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

const Row = ({ label, value }) => (
	<div className="grid grid-cols-3 gap-4 py-2 border-b">
		<div className="text-gray-500">{label}</div>
		<div className="col-span-2">{value ?? "-"}</div>
	</div>
);

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
			} catch (e) {
				setError("Gagal memuat detail aparatur.");
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [id]);

	if (loading) return <p>Memuat...</p>;
	if (error) return <p className="text-red-600">{error}</p>;
	if (!data) return <p>Data tidak ditemukan.</p>;

	const masaJabat = () => {
		if (!data?.tanggal_pengangkatan) return "-";
		const start = new Date(data.tanggal_pengangkatan);
		const end = data.tanggal_pemberhentian
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
		<div className="space-y-6">
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<button
						className="bg-white p-3 rounded-full shadow hover:bg-slate-100 border border-slate-200"
						onClick={() => nav("/desa/aparatur-desa")}
					>
						<FaArrowLeft />
					</button>
					<h1 className="text-2xl font-bold">Detail Aparatur Desa</h1>
				</div>
				<button
					className="px-3 py-1.5 rounded-md bg-primary text-white"
					onClick={() => nav(`/desa/aparatur-desa/${id}/edit`)}
				>
					Edit Data
				</button>
			</div>

			<div className="bg-white rounded-lg shadow p-6">
				<div className="flex items-start gap-6">
					<img
						src={fotoUrl(data)}
						onError={(e) => (e.currentTarget.src = "/user-default.svg")}
						alt={data.nama_lengkap || "Foto"}
						className="w-24 h-24 rounded-full object-cover border"
					/>
					<div>
						<div className="text-xl font-semibold">
							{data.nama_lengkap || "-"}
						</div>
						<div className="text-gray-600">{data.jabatan || "-"}</div>
						<div className="mt-1 text-sm">
							Status: <span className="font-medium">{data.status || "-"}</span>
						</div>
						<div className="text-sm mt-1">
							Masa Jabatan : <strong>{masaJabat()}</strong>
						</div>
					</div>
				</div>

				<div className="mt-6">
					<Row
						label="Tempat, Tanggal Lahir"
						value={`${data.tempat_lahir ?? "-"}, ${data.tanggal_lahir ?? "-"}`}
					/>
					<Row label="Jenis Kelamin" value={data.jenis_kelamin} />
					<Row label="Pendidikan Terakhir" value={data.pendidikan_terakhir} />
					<Row label="Agama" value={data.agama} />
					<Row label="NIPD" value={data.nipd} />
					<Row label="Pangkat/Golongan" value={data.pangkat_golongan} />
					<Row label="Tanggal Pengangkatan" value={data.tanggal_pengangkatan} />
					<Row
						label="Nomor SK Pengangkatan"
						value={data.nomor_sk_pengangkatan}
					/>
					<Row
						label="Tanggal Pemberhentian"
						value={data.tanggal_pemberhentian}
					/>
					<Row
						label="Nomor SK Pemberhentian"
						value={data.nomor_sk_pemberhentian}
					/>
					<Row label="BPJS Kesehatan" value={data.bpjs_kesehatan_nomor} />
					<Row
						label="BPJS Ketenagakerjaan"
						value={data.bpjs_ketenagakerjaan_nomor}
					/>
					<Row label="Keterangan" value={data.keterangan} />
					{/* Produk Hukum (klik untuk detail) */}
					{(() => {
						const ph = data.produk_hukum || data.produkHukum;
						const phId = data.produk_hukum_id || ph?.id;
						const phTitle = ph?.judul || "-";
						return (
							<div className="grid grid-cols-3 gap-4 py-2 border-b">
								<div className="text-gray-500">Produk Hukum</div>
								<div className="col-span-2">
									{phId ? (
										<button
											type="button"
											className="text-primary text-start hover:underline"
											onClick={() => nav(`/desa/produk-hukum/${phId}`)}
										>
											{phTitle}
										</button>
									) : (
										<span>-</span>
									)}
								</div>
							</div>
						);
					})()}
				</div>

				{/* Lampiran File */}
				<div className="mt-8">
					<h3 className="text-lg font-semibold mb-3">Lampiran File</h3>
					<div className="space-y-2">
						{[
							{ key: "file_ktp", label: "KTP" },
							{ key: "file_kk", label: "Kartu Keluarga" },
							{ key: "file_akta_kelahiran", label: "Akta Kelahiran" },
							{ key: "file_ijazah_terakhir", label: "Ijazah Terakhir" },
							{ key: "file_bpjs_kesehatan", label: "BPJS Kesehatan" },
							{
								key: "file_bpjs_ketenagakerjaan",
								label: "BPJS Ketenagakerjaan",
							},
						].map(({ key, label }) => {
							const fname = data?.[key];
							const url = fileUrl(fname);
							return (
								<div
									key={key}
									className="flex items-center justify-between border rounded px-3 py-2"
								>
									<div className="text-gray-700">{label}</div>
									{url ? (
										<a
											href={url}
											target="_blank"
											rel="noopener noreferrer"
											className="text-primary hover:underline"
										>
											Lihat
										</a>
									) : (
										<span className="text-gray-400">Tidak ada</span>
									)}
								</div>
							);
						})}
					</div>
				</div>

				{/* Ubah Status */}
				<div className="mt-8">
					<h3 className="text-lg font-semibold mb-3">Ubah Status</h3>
					<form onSubmit={handleStatusSave} className="space-y-3">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div>
								<label className="block text-sm mb-1">Status</label>
								<select
									className="w-full border rounded px-3 py-2"
									value={statusForm.status}
									onChange={(e) =>
										setStatusForm((s) => ({ ...s, status: e.target.value }))
									}
								>
									<option value="Aktif">Aktif</option>
									<option value="Tidak Aktif">Tidak Aktif</option>
								</select>
							</div>
							{statusForm.status === "Tidak Aktif" && (
								<>
									<div>
										<label className="block text-sm mb-1">
											Tanggal Dinonaktifkan
										</label>
										<input
											type="date"
											className="w-full border rounded px-3 py-2"
											value={statusForm.tanggal_pemberhentian || ""}
											onChange={(e) =>
												setStatusForm((s) => ({
													...s,
													tanggal_pemberhentian: e.target.value,
												}))
											}
										/>
									</div>
									<div className="md:col-span-1">
										<label className="block text-sm mb-1">Keterangan</label>
										<input
											type="text"
											className="w-full border rounded px-3 py-2"
											placeholder="Alasan/keterangan"
											value={statusForm.keterangan || ""}
											onChange={(e) =>
												setStatusForm((s) => ({
													...s,
													keterangan: e.target.value,
												}))
											}
										/>
									</div>
								</>
							)}
						</div>
						<div className="flex justify-end">
							<button
								type="submit"
								disabled={saving}
								className="bg-primary text-white px-4 py-2 rounded disabled:opacity-60"
							>
								{saving ? "Menyimpan..." : "Simpan Status"}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
};

export default AparaturDesaDetailPage;
