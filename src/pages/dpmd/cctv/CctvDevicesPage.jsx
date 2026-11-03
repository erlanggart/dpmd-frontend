import React, { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Power, Trash2, PlugZap, Loader2, Camera } from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import {
	buatKamera,
	hapusKamera,
	getKamera,
	testKoneksiKamera,
	toggleKamera,
	ubahKamera,
} from "../../../api/smartCctvApi";

/**
 * Kelola perangkat kamera: tambah, ubah, uji koneksi, aktif/nonaktif, hapus.
 * Kredensial RTSP dienkripsi di server — formulir hanya mengirim kata sandi
 * mentah, dan tidak pernah menerimanya kembali.
 */

const KOSONG = {
	name: "",
	lokasi: "",
	rtsp_url: "",
	username: "",
	password: "",
	recognition_enabled: true,
	fall_detection_enabled: true,
};

const StatusLencana = ({ status }) => {
	const gaya = {
		active: "border-emerald-200 bg-emerald-50 text-emerald-700",
		inactive: "border-slate-200 bg-slate-50 text-slate-600",
		maintenance: "border-amber-200 bg-amber-50 text-amber-700",
		offline: "border-red-200 bg-red-50 text-red-700",
	};
	const label = { active: "Aktif", inactive: "Nonaktif", maintenance: "Pemeliharaan", offline: "Offline" };
	return (
		<span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${gaya[status] || gaya.inactive}`}>
			{label[status] || status}
		</span>
	);
};

const CctvDevicesPage = () => {
	const [kamera, setKamera] = useState([]);
	const [memuat, setMemuat] = useState(true);
	const [modal, setModal] = useState(null); // null | 'baru' | objek kamera
	const [form, setForm] = useState(KOSONG);
	const [menyimpan, setMenyimpan] = useState(false);
	const [menguji, setMenguji] = useState(null);

	const muat = useCallback(async () => {
		setMemuat(true);
		try {
			const r = await getKamera();
			setKamera(r.data.data || []);
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal memuat daftar kamera.");
		} finally {
			setMemuat(false);
		}
	}, []);

	useEffect(() => {
		muat();
	}, [muat]);

	const bukaModalBaru = () => {
		setForm(KOSONG);
		setModal("baru");
	};

	const bukaModalUbah = (k) => {
		setForm({
			name: k.name || "",
			lokasi: k.lokasi || "",
			rtsp_url: k.rtsp_url || "",
			username: k.username || "",
			password: "", // sengaja kosong — sandi tersimpan terenkripsi
			recognition_enabled: !!k.recognition_enabled,
			fall_detection_enabled: !!k.fall_detection_enabled,
		});
		setModal(k);
	};

	const simpan = async (e) => {
		e.preventDefault();
		if (!form.name.trim() || !form.rtsp_url.trim()) {
			toast.error("Nama dan URL RTSP wajib diisi.");
			return;
		}
		setMenyimpan(true);
		try {
			const payload = { ...form, name: form.name.trim(), rtsp_url: form.rtsp_url.trim() };
			if (!payload.password) delete payload.password;
			if (modal === "baru") {
				await buatKamera(payload);
				toast.success("Kamera ditambahkan dan didaftarkan ke go2rtc.");
			} else {
				await ubahKamera(modal.id, payload);
				toast.success("Kamera diperbarui.");
			}
			setModal(null);
			muat();
		} catch (err) {
			toast.error(err.response?.data?.message || "Gagal menyimpan kamera.");
		} finally {
			setMenyimpan(false);
		}
	};

	const alihkan = async (k) => {
		try {
			await toggleKamera(k.id, k.status !== "active");
			toast.success(k.status === "active" ? "Kamera dinonaktifkan." : "Kamera diaktifkan.");
			muat();
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal mengubah status.");
		}
	};

	const uji = async (k) => {
		setMenguji(k.id);
		try {
			const r = await testKoneksiKamera(k.id);
			if (r.data.success) toast.success("Koneksi berhasil.");
			else toast.error(r.data.message || "Koneksi gagal.");
		} catch (e) {
			toast.error(e.response?.data?.message || "Koneksi gagal.");
		} finally {
			setMenguji(null);
		}
	};

	const hapus = async (k) => {
		const ok = await Swal.fire({
			title: "Hapus kamera?",
			text: `"${k.name}" beserta stream go2rtc-nya akan dihapus. Riwayat peristiwa tetap tersimpan.`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Hapus",
			cancelButtonText: "Batal",
			confirmButtonColor: "#e11d48",
		});
		if (!ok.isConfirmed) return;
		try {
			await hapusKamera(k.id);
			toast.success("Kamera dihapus.");
			muat();
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal menghapus.");
		}
	};

	const inputKelas =
		"w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none";

	return (
		<div className="rounded-xl border border-slate-200 bg-white p-5">
			<div className="mb-4 flex items-center justify-between">
				<div>
					<h2 className="text-base font-semibold text-slate-900">Perangkat kamera</h2>
					<p className="text-sm text-slate-500">{kamera.length} kamera terdaftar</p>
				</div>
				<button
					onClick={bukaModalBaru}
					className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
				>
					<Plus className="h-4 w-4" />
					Tambah kamera
				</button>
			</div>

			{memuat ? (
				<div className="space-y-2">
					{[1, 2, 3].map((n) => (
						<div key={n} className="h-16 animate-pulse rounded-lg bg-slate-100" />
					))}
				</div>
			) : kamera.length === 0 ? (
				<div className="rounded-xl border border-dashed border-slate-200 py-14 text-center">
					<Camera className="mx-auto h-10 w-10 text-slate-300" />
					<p className="mt-3 text-sm font-medium text-slate-600">Belum ada kamera</p>
				</div>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead>
							<tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
								<th className="py-2 pr-3">Nama</th>
								<th className="py-2 pr-3">Lokasi</th>
								<th className="py-2 pr-3">Status</th>
								<th className="py-2 pr-3">Deteksi</th>
								<th className="py-2 pr-3">go2rtc</th>
								<th className="py-2 pr-3 text-right">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{kamera.map((k) => (
								<tr key={k.id} className="border-b border-slate-50 hover:bg-slate-50/60">
									<td className="py-2.5 pr-3 font-medium text-slate-900">{k.name}</td>
									<td className="py-2.5 pr-3 text-slate-600">{k.lokasi || "—"}</td>
									<td className="py-2.5 pr-3">
										<StatusLencana status={k.status} />
									</td>
									<td className="py-2.5 pr-3 text-xs text-slate-600">
										{k.recognition_enabled ? "Wajah" : "—"}
										{k.fall_detection_enabled ? " · Jatuh" : ""}
									</td>
									<td className="py-2.5 pr-3 font-mono text-xs text-slate-500">{k.go2rtc_src || "—"}</td>
									<td className="py-2.5 text-right">
										<div className="inline-flex items-center gap-1">
											<button
												onClick={() => uji(k)}
												title="Uji koneksi RTSP"
												className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
											>
												{menguji === k.id ? (
													<Loader2 className="h-4 w-4 animate-spin" />
												) : (
													<PlugZap className="h-4 w-4" />
												)}
											</button>
											<button
												onClick={() => alihkan(k)}
												title={k.status === "active" ? "Nonaktifkan" : "Aktifkan"}
												className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
											>
												<Power className="h-4 w-4" />
											</button>
											<button
												onClick={() => bukaModalUbah(k)}
												title="Ubah"
												className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
											>
												<Pencil className="h-4 w-4" />
											</button>
											<button
												onClick={() => hapus(k)}
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

			{modal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={() => setModal(null)}>
					<form
						onSubmit={simpan}
						onClick={(e) => e.stopPropagation()}
						className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6"
					>
						<h3 className="text-lg font-semibold text-slate-900">
							{modal === "baru" ? "Tambah kamera" : `Ubah kamera — ${modal.name}`}
						</h3>
						<p className="mt-1 text-sm text-slate-500">
							URL RTSP dapat memuat kredensial (rtsp://user:sandi@host/…); kredensial akan dipisahkan dan dienkripsi
							otomatis di server.
						</p>
						<div className="mt-4 space-y-3">
							<div>
								<label className="mb-1 block text-sm font-medium text-slate-700">Nama kamera</label>
								<input
									value={form.name}
									onChange={(e) => setForm({ ...form, name: e.target.value })}
									className={inputKelas}
									placeholder="mis. Gerbang Utama"
									required
								/>
							</div>
							<div>
								<label className="mb-1 block text-sm font-medium text-slate-700">Lokasi</label>
								<input
									value={form.lokasi}
									onChange={(e) => setForm({ ...form, lokasi: e.target.value })}
									className={inputKelas}
									placeholder="mis. Parkiran"
								/>
							</div>
							<div>
								<label className="mb-1 block text-sm font-medium text-slate-700">URL RTSP (utama)</label>
								<input
									value={form.rtsp_url}
									onChange={(e) => setForm({ ...form, rtsp_url: e.target.value })}
									className={inputKelas}
									placeholder="rtsp://192.168.1.10:554/stream1"
									required
								/>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="mb-1 block text-sm font-medium text-slate-700">Nama pengguna RTSP</label>
									<input
										value={form.username}
										onChange={(e) => setForm({ ...form, username: e.target.value })}
										className={inputKelas}
										autoComplete="off"
									/>
								</div>
								<div>
									<label className="mb-1 block text-sm font-medium text-slate-700">
										Kata sandi RTSP{modal !== "baru" ? " (kosongkan bila tetap)" : ""}
									</label>
									<input
										type="password"
										value={form.password}
										onChange={(e) => setForm({ ...form, password: e.target.value })}
										className={inputKelas}
										autoComplete="new-password"
									/>
								</div>
							</div>
							<div className="flex flex-wrap gap-4 pt-1">
								<label className="flex items-center gap-2 text-sm text-slate-700">
									<input
										type="checkbox"
										checked={form.recognition_enabled}
										onChange={(e) => setForm({ ...form, recognition_enabled: e.target.checked })}
										className="h-4 w-4 rounded border-slate-300"
									/>
									Pengenalan wajah
								</label>
								<label className="flex items-center gap-2 text-sm text-slate-700">
									<input
										type="checkbox"
										checked={form.fall_detection_enabled}
										onChange={(e) => setForm({ ...form, fall_detection_enabled: e.target.checked })}
										className="h-4 w-4 rounded border-slate-300"
									/>
									Deteksi jatuh
								</label>
							</div>
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

export default CctvDevicesPage;
