// src/components/DesaPermissionsModal.jsx
import React, { useEffect, useState } from "react";
import { LuX, LuShieldCheck, LuSave } from "react-icons/lu";
import api from "../api";
import Swal from "sweetalert2";
import { DESA_PERMISSIONS } from "../constants/desaPermissions";

/**
 * Panel hak akses fitur untuk akun operasional desa (role `desa`), dipakai staf DPMD
 * agar bisa membantu desa tanpa harus impersonate Admin Desa-nya.
 *
 * Katalog diambil dari server supaya tetap sinkron kalau daftar fitur berubah;
 * konstanta lokal hanya dipakai sebagai cadangan bila request katalog gagal.
 */
const DesaPermissionsModal = ({ isOpen, onClose, userData, onUpdated }) => {
	const [catalog, setCatalog] = useState(DESA_PERMISSIONS);
	const [selected, setSelected] = useState([]);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!isOpen || !userData?.id) return;

		let cancelled = false;
		setLoading(true);

		(async () => {
			try {
				const res = await api.get(`/users/${userData.id}/desa-permissions`);
				if (cancelled) return;
				const data = res.data?.data;
				if (Array.isArray(data?.catalog) && data.catalog.length > 0) setCatalog(data.catalog);
				setSelected(Array.isArray(data?.permissions) ? data.permissions : []);
			} catch (error) {
				if (cancelled) return;
				Swal.fire({
					icon: "error",
					title: "Gagal memuat hak akses",
					text: error.response?.data?.message || "Terjadi kesalahan.",
				});
				onClose();
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [isOpen, userData?.id, onClose]);

	if (!isOpen) return null;

	const toggle = (key) =>
		setSelected((prev) =>
			prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
		);

	const toggleAll = () =>
		setSelected((prev) => (prev.length === catalog.length ? [] : catalog.map((p) => p.key)));

	const handleSave = async () => {
		setSaving(true);
		try {
			await api.put(`/users/${userData.id}/desa-permissions`, { permissions: selected });
			onUpdated?.();
			onClose();
			Swal.fire({
				icon: "success",
				title: "Hak akses diperbarui",
				timer: 1600,
				showConfirmButton: false,
			});
		} catch (error) {
			Swal.fire({
				icon: "error",
				title: "Gagal menyimpan",
				text: error.response?.data?.message || "Terjadi kesalahan.",
			});
		} finally {
			setSaving(false);
		}
	};

	// z-[70]: di atas panel rincian pengguna (z-[60]) dan bilah nav HP (z-50)
	return (
		<div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
			<div className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl">
				<div className="sticky top-0 flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4">
					<div className="flex items-center gap-3 min-w-0">
						<div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
							<LuShieldCheck className="h-5 w-5 text-emerald-600" />
						</div>
						<div className="min-w-0">
							<h2 className="font-bold text-slate-800">Hak Akses Fitur</h2>
							<p className="text-xs text-slate-500 truncate">
								{userData?.name} — {userData?.desa?.nama || "Desa tidak diketahui"}
							</p>
						</div>
					</div>
					<button
						onClick={onClose}
						className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 flex-shrink-0"
						aria-label="Tutup"
					>
						<LuX className="h-5 w-5" />
					</button>
				</div>

				<div className="px-5 py-4 space-y-4">
					{loading ? (
						<div className="py-10 text-center text-sm text-slate-500">Memuat hak akses...</div>
					) : (
						<>
							<div className="flex items-center justify-between">
								<p className="text-xs text-slate-500">
									Dashboard dan Pengaturan selalu terbuka untuk semua akun desa.
								</p>
								<button
									type="button"
									onClick={toggleAll}
									className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline flex-shrink-0 ml-3"
								>
									{selected.length === catalog.length ? "Kosongkan semua" : "Pilih semua"}
								</button>
							</div>

							<div className="grid gap-2 sm:grid-cols-2">
								{catalog.map((permission) => {
									const checked = selected.includes(permission.key);
									return (
										<label
											key={permission.key}
											className={`flex gap-2.5 items-start rounded-xl border p-3 cursor-pointer transition-colors ${
												checked
													? "border-emerald-600 bg-emerald-50"
													: "border-slate-200 hover:bg-slate-50"
											}`}
										>
											<input
												type="checkbox"
												checked={checked}
												onChange={() => toggle(permission.key)}
												className="mt-0.5 h-4 w-4 accent-emerald-600"
											/>
											<span className="min-w-0">
												<span className="block text-sm font-semibold text-slate-800">
													{permission.label}
												</span>
												<span className="block text-[11px] text-slate-500 leading-snug">
													{permission.description}
												</span>
											</span>
										</label>
									);
								})}
							</div>

							<div className="flex gap-3 pt-2">
								<button
									type="button"
									onClick={onClose}
									className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
								>
									Batal
								</button>
								<button
									type="button"
									onClick={handleSave}
									disabled={saving}
									className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
								>
									<LuSave className="h-4 w-4" />
									{saving ? "Menyimpan..." : "Simpan"}
								</button>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
};

export default DesaPermissionsModal;
