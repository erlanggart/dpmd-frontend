import React, { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import api from "../../api";
import {
	DESA_JABATAN_OPTIONS,
	DESA_PERMISSIONS,
	getDesaPermissionLabel,
} from "../../constants/desaPermissions";
import {
	FiEdit2,
	FiEye,
	FiEyeOff,
	FiPlus,
	FiSearch,
	FiTrash2,
	FiUsers,
	FiX,
} from "react-icons/fi";

const emptyForm = {
	name: "",
	email: "",
	password: "",
	jabatan_desa: "",
	no_hp: "",
	is_active: true,
	permissions: [],
};

const errorMessage = (error, fallback) =>
	error?.response?.data?.message || error?.message || fallback;

const ManajemenAkunPage = () => {
	const [info, setInfo] = useState(null);
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingUser, setEditingUser] = useState(null); // null = mode tambah
	const [form, setForm] = useState(emptyForm);
	const [showPassword, setShowPassword] = useState(false);
	const [saving, setSaving] = useState(false);

	const loadUsers = useCallback(async () => {
		setLoading(true);
		try {
			const [usersRes, infoRes] = await Promise.all([
				api.get("/desa-admin/users"),
				api.get("/desa-admin/info"),
			]);
			setUsers(usersRes.data?.data || []);
			setInfo(infoRes.data?.data || null);
		} catch (error) {
			Swal.fire({
				icon: "error",
				title: "Gagal memuat data",
				text: errorMessage(error, "Tidak dapat memuat daftar akun."),
			});
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadUsers();
	}, [loadUsers]);

	const filteredUsers = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return users;
		return users.filter((u) =>
			[u.name, u.email, u.jabatan_desa].some((v) => String(v || "").toLowerCase().includes(q)),
		);
	}, [users, search]);

	const openCreate = () => {
		setEditingUser(null);
		setForm(emptyForm);
		setShowPassword(false);
		setIsModalOpen(true);
	};

	const openEdit = (user) => {
		setEditingUser(user);
		setForm({
			name: user.name || "",
			email: user.email || "",
			password: "",
			jabatan_desa: user.jabatan_desa || "",
			no_hp: user.no_hp || "",
			is_active: user.is_active !== false,
			permissions: [...(user.permissions || [])],
		});
		setShowPassword(false);
		setIsModalOpen(true);
	};

	const togglePermission = (key) => {
		setForm((prev) => ({
			...prev,
			permissions: prev.permissions.includes(key)
				? prev.permissions.filter((p) => p !== key)
				: [...prev.permissions, key],
		}));
	};

	const toggleAllPermissions = () => {
		setForm((prev) => ({
			...prev,
			permissions:
				prev.permissions.length === DESA_PERMISSIONS.length
					? []
					: DESA_PERMISSIONS.map((p) => p.key),
		}));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (saving) return;

		if (!form.name.trim()) {
			Swal.fire({ icon: "error", title: "Nama wajib diisi" });
			return;
		}
		if (!form.email.trim()) {
			Swal.fire({ icon: "error", title: "Email wajib diisi" });
			return;
		}
		if (!editingUser && form.password.length < 6) {
			Swal.fire({ icon: "error", title: "Password minimal 6 karakter" });
			return;
		}
		if (editingUser && form.password && form.password.length < 6) {
			Swal.fire({ icon: "error", title: "Password baru minimal 6 karakter" });
			return;
		}

		setSaving(true);
		try {
			const payload = {
				name: form.name.trim(),
				email: form.email.trim(),
				jabatan_desa: form.jabatan_desa.trim(),
				no_hp: form.no_hp.trim(),
				is_active: form.is_active,
				permissions: form.permissions,
			};
			if (form.password) payload.password = form.password;

			if (editingUser) {
				await api.put(`/desa-admin/users/${editingUser.id}`, payload);
			} else {
				await api.post("/desa-admin/users", payload);
			}

			setIsModalOpen(false);
			await loadUsers();
			Swal.fire({
				icon: "success",
				title: editingUser ? "Akun diperbarui" : "Akun dibuat",
				timer: 1600,
				showConfirmButton: false,
			});
		} catch (error) {
			Swal.fire({
				icon: "error",
				title: "Gagal menyimpan",
				text: errorMessage(error, "Terjadi kesalahan saat menyimpan akun."),
			});
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (user) => {
		const confirm = await Swal.fire({
			icon: "warning",
			title: "Hapus akun ini?",
			html: `<b>${user.name}</b><br/><span class="text-sm">${user.email}</span>`,
			showCancelButton: true,
			confirmButtonText: "Ya, hapus",
			cancelButtonText: "Batal",
			confirmButtonColor: "#dc2626",
		});
		if (!confirm.isConfirmed) return;

		try {
			await api.delete(`/desa-admin/users/${user.id}`);
			await loadUsers();
			Swal.fire({ icon: "success", title: "Akun dihapus", timer: 1500, showConfirmButton: false });
		} catch (error) {
			Swal.fire({
				icon: "error",
				title: "Gagal menghapus",
				text: errorMessage(error, "Akun tidak dapat dihapus."),
			});
		}
	};

	const desaLabel = info?.desa?.status_pemerintahan === "desa" ? "Desa" : "Kelurahan";

	return (
		<div className="max-w-6xl mx-auto space-y-5">
			{/* Header */}
			<div className="rounded-2xl bg-slate-900 text-white p-5 shadow-lg">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<h1 className="text-xl font-bold">Manajemen Akun</h1>
						<p className="text-slate-300 text-sm mt-1">
							{info?.desa
								? `${desaLabel} ${info.desa.nama}${
										info.desa.kecamatan ? ` — Kec. ${info.desa.kecamatan.nama}` : ""
								  }`
								: "Kelola akun pengguna di desa Anda"}
						</p>
					</div>
					<div className="flex gap-3">
						<div className="rounded-xl bg-white/10 px-4 py-2 text-center">
							<div className="text-lg font-bold">{info?.total_akun ?? users.length}</div>
							<div className="text-[11px] text-slate-300">Total Akun</div>
						</div>
						<div className="rounded-xl bg-white/10 px-4 py-2 text-center">
							<div className="text-lg font-bold">{info?.akun_aktif ?? 0}</div>
							<div className="text-[11px] text-slate-300">Aktif</div>
						</div>
					</div>
				</div>
			</div>

			{/* Toolbar */}
			<div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
				<div className="relative flex-1 max-w-md">
					<FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
					<input
						type="text"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Cari nama, email, atau bagian..."
						className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
					/>
				</div>
				<button
					onClick={openCreate}
					className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
				>
					<FiPlus className="h-4 w-4" />
					Tambah Akun
				</button>
			</div>

			{/* Daftar akun */}
			{loading ? (
				<div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 text-sm">
					Memuat data akun...
				</div>
			) : filteredUsers.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
					<FiUsers className="mx-auto h-8 w-8 text-slate-300" />
					<p className="mt-3 font-semibold text-slate-700">
						{users.length === 0 ? "Belum ada akun" : "Tidak ada akun yang cocok"}
					</p>
					<p className="text-sm text-slate-500 mt-1">
						{users.length === 0
							? 'Klik "Tambah Akun" untuk membuat akun pengguna pertama di desa Anda.'
							: "Coba kata kunci lain."}
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{filteredUsers.map((user) => (
						<div
							key={user.id}
							className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
						>
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div className="min-w-0">
									<div className="flex items-center gap-2 flex-wrap">
										<h3 className="font-bold text-slate-800">{user.name}</h3>
										{user.jabatan_desa && (
											<span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
												{user.jabatan_desa}
											</span>
										)}
										<span
											className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
												user.is_active
													? "bg-emerald-100 text-emerald-700"
													: "bg-slate-200 text-slate-600"
											}`}
										>
											{user.is_active ? "Aktif" : "Nonaktif"}
										</span>
									</div>
									<p className="text-sm text-slate-500 mt-0.5 break-all">{user.email}</p>
									{user.no_hp && (
										<p className="text-sm text-slate-500 mt-0.5">HP: {user.no_hp}</p>
									)}
								</div>

								<div className="flex items-center gap-2">
									<button
										onClick={() => openEdit(user)}
										className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
									>
										<FiEdit2 className="h-3.5 w-3.5" />
										Ubah
									</button>
									<button
										onClick={() => handleDelete(user)}
										className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50"
									>
										<FiTrash2 className="h-3.5 w-3.5" />
										Hapus
									</button>
								</div>
							</div>

							<div className="mt-3 pt-3 border-t border-slate-100">
								<p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-1.5">
									Hak Akses
								</p>
								{user.permissions?.length ? (
									<div className="flex flex-wrap gap-1.5">
										{user.permissions.map((key) => (
											<span
												key={key}
												className="px-2 py-1 rounded-lg bg-slate-900/5 text-slate-700 text-[11px] font-medium"
											>
												{getDesaPermissionLabel(key)}
											</span>
										))}
									</div>
								) : (
									<p className="text-xs text-amber-600">
										Belum ada hak akses — akun ini hanya bisa melihat dashboard.
									</p>
								)}
							</div>
						</div>
					))}
				</div>
			)}

			{/* Modal tambah/ubah akun */}
			{isModalOpen && (
				<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
					{/* Tinggi dibatasi dvh, bukan vh: di HP, vh mengabaikan bilah alamat
					    browser sehingga dasar modal — tempat tombol simpan — jatuh di luar
					    layar. Kelas vh tetap dipakai sebagai cadangan untuk peramban lama
					    yang membuang nilai dvh. */}
					<div
						className="flex w-full max-h-[92vh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl"
						style={{ maxHeight: "92dvh" }}
					>
						<div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
							<h2 className="font-bold text-slate-800">
								{editingUser ? "Ubah Akun" : "Tambah Akun"}
							</h2>
							<button
								onClick={() => setIsModalOpen(false)}
								className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
								aria-label="Tutup"
							>
								<FiX className="h-5 w-5" />
							</button>
						</div>

						{/* Hanya bagian isian yang menggulung; tombol aksi tinggal di footer
						    supaya selalu terlihat, termasuk saat papan ketik terbuka. */}
						<form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
							<div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
								<div>
									<label className="block text-sm font-semibold text-slate-700 mb-1.5">
										Nama <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										value={form.name}
										onChange={(e) => setForm({ ...form, name: e.target.value })}
										placeholder="Contoh: Rahmat Ramadan"
										className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
									/>
								</div>

								<div>
									<label className="block text-sm font-semibold text-slate-700 mb-1.5">
										Email (dipakai untuk login) <span className="text-red-500">*</span>
									</label>
									<input
										type="email"
										value={form.email}
										onChange={(e) => setForm({ ...form, email: e.target.value })}
										placeholder="nama@contoh.com"
										autoComplete="off"
										className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
									/>
								</div>

								<div>
									<label className="block text-sm font-semibold text-slate-700 mb-1.5">
										Password {editingUser ? "" : <span className="text-red-500">*</span>}
									</label>
									<div className="relative">
										<input
											type={showPassword ? "text" : "password"}
											value={form.password}
											onChange={(e) => setForm({ ...form, password: e.target.value })}
											placeholder={
												editingUser ? "Kosongkan bila tidak diganti" : "Minimal 6 karakter"
											}
											autoComplete="new-password"
											className="w-full px-3 py-2.5 pr-11 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
										/>
										<button
											type="button"
											onClick={() => setShowPassword((s) => !s)}
											className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
											aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
										>
											{showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
										</button>
									</div>
								</div>

								<div>
									<label className="block text-sm font-semibold text-slate-700 mb-1.5">
										Jabatan / Bagian
									</label>
									<input
										type="text"
										list="desa-jabatan-options"
										value={form.jabatan_desa}
										onChange={(e) => setForm({ ...form, jabatan_desa: e.target.value })}
										placeholder="Contoh: Keuangan"
										className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
									/>
									<datalist id="desa-jabatan-options">
										{DESA_JABATAN_OPTIONS.map((opt) => (
											<option key={opt} value={opt} />
										))}
									</datalist>
								</div>

								<div>
									<label className="block text-sm font-semibold text-slate-700 mb-1.5">
										Nomor HP
									</label>
									<input
										type="tel"
										value={form.no_hp}
										onChange={(e) => setForm({ ...form, no_hp: e.target.value })}
										placeholder="Contoh: 081234567890"
										className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
									/>
									<p className="text-[11px] text-slate-500 mt-1">
										Opsional. Memudahkan DPMD dan kecamatan menghubungi petugas ini.
									</p>
								</div>

								<div>
									<div className="flex items-center justify-between mb-2">
										<label className="block text-sm font-semibold text-slate-700">
											Hak Akses Fitur
										</label>
										<button
											type="button"
											onClick={toggleAllPermissions}
											className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
										>
											{form.permissions.length === DESA_PERMISSIONS.length
												? "Kosongkan semua"
												: "Pilih semua"}
										</button>
									</div>
									<div className="grid gap-2 sm:grid-cols-2">
										{DESA_PERMISSIONS.map((permission) => {
											const checked = form.permissions.includes(permission.key);
											return (
												<label
													key={permission.key}
													className={`flex gap-2.5 items-start rounded-xl border p-3 cursor-pointer transition-colors ${
														checked
															? "border-slate-900 bg-slate-900/5"
															: "border-slate-200 hover:bg-slate-50"
													}`}
												>
													<input
														type="checkbox"
														checked={checked}
														onChange={() => togglePermission(permission.key)}
														className="mt-0.5 h-4 w-4 accent-slate-900"
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
									<p className="text-[11px] text-slate-500 mt-2">
										Dashboard dan Pengaturan selalu bisa diakses semua akun.
									</p>
								</div>

								<label className="flex items-center gap-2.5 cursor-pointer">
									<input
										type="checkbox"
										checked={form.is_active}
										onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
										className="h-4 w-4 accent-slate-900"
									/>
									<span className="text-sm font-medium text-slate-700">Akun aktif</span>
								</label>
							</div>

							{/* Padding bawah ikut menghindari batang gestur iOS. */}
							<div
								className="flex shrink-0 gap-3 border-t border-slate-100 bg-white px-5 py-3"
								style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
							>
								<button
									type="button"
									onClick={() => setIsModalOpen(false)}
									className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
								>
									Batal
								</button>
								<button
									type="submit"
									disabled={saving}
									className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
								>
									{saving ? "Menyimpan..." : editingUser ? "Simpan Perubahan" : "Simpan Akun"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};

export default ManajemenAkunPage;
