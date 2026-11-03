import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Pencil, Plus, RefreshCw, Trash2, UserPlus, Images } from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { buatWajah, getWajah, hapusWajah, recomputeEmbeddings, tambahFotoWajah, ubahWajah } from "../../../api/smartCctvApi";
import { urlServer } from "../../../utils/asalServer";

/**
 * Enrollment wajah untuk pengenalan. Embedding dihitung layanan AI dari foto
 * yang diunggah; server menyimpannya sebagai JSON vektor 128-dimensi.
 * Beberapa foto per wajah = beberapa embedding = pengenalan lebih stabil.
 */

const KOSONG = { nama: "", kode_pegawai: "", departemen: "" };

const CctvFacesPage = () => {
	const [wajah, setWajah] = useState([]);
	const [memuat, setMemuat] = useState(true);
	const [modal, setModal] = useState(null); // null | 'baru' | objek wajah
	const [form, setForm] = useState(KOSONG);
	const [foto, setFoto] = useState(null);
	const [menyimpan, setMenyimpan] = useState(false);
	const [prosesId, setProsesId] = useState(null);
	const fotoInputRef = useRef(null);
	const [targetFoto, setTargetFoto] = useState(null);

	const muat = useCallback(async () => {
		setMemuat(true);
		try {
			const r = await getWajah();
			setWajah(r.data.data || []);
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal memuat daftar wajah.");
		} finally {
			setMemuat(false);
		}
	}, []);

	useEffect(() => {
		muat();
	}, [muat]);

	const simpan = async (e) => {
		e.preventDefault();
		if (!form.nama.trim()) return toast.error("Nama wajah wajib diisi.");
		setMenyimpan(true);
		try {
			if (modal === "baru") {
				const fd = new FormData();
				fd.append("nama", form.nama.trim());
				if (form.kode_pegawai) fd.append("kode_pegawai", form.kode_pegawai.trim());
				if (form.departemen) fd.append("departemen", form.departemen.trim());
				if (foto) fd.append("foto", foto);
				await buatWajah(fd);
				toast.success(
					foto
						? "Wajah ditambahkan dan embedding dihitung."
						: "Wajah ditambahkan. Unggah foto agar bisa dikenali."
				);
			} else {
				await ubahWajah(modal.id, {
					nama: form.nama.trim(),
					kode_pegawai: form.kode_pegawai || null,
					departemen: form.departemen || null,
				});
				toast.success("Wajah diperbarui.");
			}
			setModal(null);
			setFoto(null);
			muat();
		} catch (err) {
			toast.error(err.response?.data?.message || "Gagal menyimpan wajah.");
		} finally {
			setMenyimpan(false);
		}
	};

	const unggahFoto = async (w, berkas) => {
		setProsesId(w.id);
		try {
			await tambahFotoWajah(w.id, berkas);
			toast.success("Foto ditambahkan dan embedding tersimpan.");
			muat();
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal menambahkan foto.");
		} finally {
			setProsesId(null);
		}
	};

	const recompute = async (w) => {
		setProsesId(w.id);
		try {
			const r = await recomputeEmbeddings(w.id);
			const { total, berhasil } = r.data.data || {};
			toast.success(`Embedding dihitung ulang: ${berhasil}/${total} berhasil.`);
			muat();
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal menghitung ulang embedding.");
		} finally {
			setProsesId(null);
		}
	};

	const hapus = async (w) => {
		const ok = await Swal.fire({
			title: "Hapus wajah?",
			text: `"${w.nama}" beserta seluruh embedding-nya dihapus dan tidak akan dikenali lagi.`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Hapus",
			cancelButtonText: "Batal",
			confirmButtonColor: "#e11d48",
		});
		if (!ok.isConfirmed) return;
		try {
			await hapusWajah(w.id);
			toast.success("Wajah dihapus.");
			muat();
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal menghapus.");
		}
	};

	const inputKelas =
		"w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none";

	return (
		<div className="rounded-xl border border-slate-200 bg-white p-5">
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="text-base font-semibold text-slate-900">Basis data wajah</h2>
					<p className="text-sm text-slate-500">
						{wajah.length} wajah terdaftar · pastikan layanan AI berjalan saat menambah foto (untuk ekstraksi embedding)
					</p>
				</div>
				<button
					onClick={() => {
						setForm(KOSONG);
						setFoto(null);
						setModal("baru");
					}}
					className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
				>
					<UserPlus className="h-4 w-4" />
					Tambah wajah
				</button>
			</div>

			{memuat ? (
				<div className="space-y-2">
					{[1, 2, 3].map((n) => (
						<div key={n} className="h-16 animate-pulse rounded-lg bg-slate-100" />
					))}
				</div>
			) : wajah.length === 0 ? (
				<div className="rounded-xl border border-dashed border-slate-200 py-14 text-center">
					<UserPlus className="mx-auto h-10 w-10 text-slate-300" />
					<p className="mt-3 text-sm font-medium text-slate-600">Belum ada wajah terdaftar</p>
				</div>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead>
							<tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
								<th className="py-2 pr-3">Foto</th>
								<th className="py-2 pr-3">Nama</th>
								<th className="py-2 pr-3">Kode</th>
								<th className="py-2 pr-3">Departemen</th>
								<th className="py-2 pr-3">Embedding</th>
								<th className="py-2 pr-3">Peristiwa</th>
								<th className="py-2 pr-3 text-right">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{wajah.map((w) => (
								<tr key={w.id} className="border-b border-slate-50 hover:bg-slate-50/60">
									<td className="py-2 pr-3">
										{w.foto_path ? (
											<img
												src={urlServer(w.foto_path)}
												alt={w.nama}
												className="h-10 w-10 rounded-lg border border-slate-200 object-cover"
											/>
										) : (
											<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-300">
												<Plus className="h-4 w-4" />
											</div>
										)}
									</td>
									<td className="py-2.5 pr-3 font-medium text-slate-900">{w.nama}</td>
									<td className="py-2.5 pr-3 text-slate-600">{w.kode_pegawai || "—"}</td>
									<td className="py-2.5 pr-3 text-slate-600">{w.departemen || "—"}</td>
									<td className="py-2.5 pr-3 tabular-nums text-slate-600">{w._count?.embeddings ?? 0}</td>
									<td className="py-2.5 pr-3 tabular-nums text-slate-600">{w._count?.events ?? 0}</td>
									<td className="py-2.5 text-right">
										<div className="inline-flex items-center gap-1">
											<button
												onClick={() => {
													setTargetFoto(w);
													fotoInputRef.current?.click();
												}}
												title="Tambah foto"
												className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
											>
												{prosesId === w.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Images className="h-4 w-4" />}
											</button>
											<button
												onClick={() => recompute(w)}
												title="Hitung ulang embedding"
												className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
											>
												<RefreshCw className="h-4 w-4" />
											</button>
											<button
												onClick={() => {
													setForm({
														nama: w.nama || "",
														kode_pegawai: w.kode_pegawai || "",
														departemen: w.departemen || "",
													});
													setFoto(null);
													setModal(w);
												}}
												title="Ubah"
												className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
											>
												<Pencil className="h-4 w-4" />
											</button>
											<button
												onClick={() => hapus(w)}
												title="Hapus"
												className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
											>
												<Trash2 className="h-4 w-4" />
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			<input
				ref={fotoInputRef}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={(e) => {
					const berkas = e.target.files?.[0];
					e.target.value = "";
					if (berkas && targetFoto) unggahFoto(targetFoto, berkas);
					setTargetFoto(null);
				}}
			/>

			{modal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={() => setModal(null)}>
					<form
						onSubmit={simpan}
						onClick={(e) => e.stopPropagation()}
						className="w-full max-w-md rounded-xl bg-white p-6"
					>
						<h3 className="text-lg font-semibold text-slate-900">
							{modal === "baru" ? "Tambah wajah" : `Ubah — ${modal.nama}`}
						</h3>
						<div className="mt-4 space-y-3">
							<div>
								<label className="mb-1 block text-sm font-medium text-slate-700">Nama</label>
								<input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className={inputKelas} required />
							</div>
							<div>
								<label className="mb-1 block text-sm font-medium text-slate-700">Kode pegawai (opsional)</label>
								<input value={form.kode_pegawai} onChange={(e) => setForm({ ...form, kode_pegawai: e.target.value })} className={inputKelas} />
							</div>
							<div>
								<label className="mb-1 block text-sm font-medium text-slate-700">Departemen (opsional)</label>
								<input value={form.departemen} onChange={(e) => setForm({ ...form, departemen: e.target.value })} className={inputKelas} />
							</div>
							{modal === "baru" && (
								<div>
									<label className="mb-1 block text-sm font-medium text-slate-700">Foto wajah (opsional, JPG/PNG)</label>
									<input
										type="file"
										accept="image/*"
										onChange={(e) => setFoto(e.target.files?.[0] || null)}
										className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
									/>
									<p className="mt-1 text-xs text-slate-400">
										Foto diproses mesin AI (port 8001) untuk ekstraksi embedding; bila AI mati, wajah tetap tersimpan
										tanpa embedding.
									</p>
								</div>
							)}
						</div>
						<div className="mt-6 flex justify-end gap-2">
							<button
								type="button"
								onClick={() => setModal(null)}
								className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
							>
								Batal
							</button>
							<button
								type="submit"
								disabled={menyimpan}
								className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
							>
								{menyimpan && <Loader2 className="h-4 w-4 animate-spin" />}
								Simpan
							</button>
						</div>
					</form>
				</div>
			)}
		</div>
	);
};

export default CctvFacesPage;
