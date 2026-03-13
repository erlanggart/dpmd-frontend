// src/components/RoleManagementModal.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
	LuX,
	LuShield,
	LuPlus,
	LuPencil,
	LuTrash2,
	LuSave,
	LuLock,
	LuCheck,
	LuChevronDown,
} from "react-icons/lu";
import api from "../api";
import Swal from "sweetalert2";

const CATEGORY_OPTIONS = [
	{ value: "admin", label: "Administrator" },
	{ value: "pimpinan", label: "Pimpinan Dinas" },
	{ value: "struktural", label: "Struktural" },
	{ value: "bidang", label: "Bidang-Bidang DPMD" },
	{ value: "pegawai", label: "Pegawai" },
	{ value: "wilayah", label: "Wilayah" },
	{ value: "other", label: "Lainnya" },
];

const COLOR_OPTIONS = [
	{ value: "red", label: "Merah", class: "bg-red-500" },
	{ value: "blue", label: "Biru", class: "bg-blue-500" },
	{ value: "indigo", label: "Indigo", class: "bg-indigo-500" },
	{ value: "green", label: "Hijau", class: "bg-green-500" },
	{ value: "teal", label: "Teal", class: "bg-teal-500" },
	{ value: "gray", label: "Abu-abu", class: "bg-gray-500" },
	{ value: "purple", label: "Ungu", class: "bg-purple-500" },
	{ value: "cyan", label: "Cyan", class: "bg-cyan-500" },
	{ value: "pink", label: "Pink", class: "bg-pink-500" },
	{ value: "yellow", label: "Kuning", class: "bg-yellow-500" },
	{ value: "emerald", label: "Emerald", class: "bg-emerald-500" },
	{ value: "violet", label: "Violet", class: "bg-violet-500" },
	{ value: "amber", label: "Amber", class: "bg-amber-500" },
	{ value: "orange", label: "Oranye", class: "bg-orange-500" },
];

const RoleManagementModal = ({ isOpen, onClose }) => {
	const [roles, setRoles] = useState([]);
	const [loading, setLoading] = useState(true);
	const [editingRole, setEditingRole] = useState(null);
	const [showForm, setShowForm] = useState(false);
	const [formData, setFormData] = useState({
		name: "",
		label: "",
		color: "gray",
		description: "",
		category: "other",
		needs_entity: false,
	});
	const [formErrors, setFormErrors] = useState({});
	const [saving, setSaving] = useState(false);

	const fetchRoles = useCallback(async () => {
		setLoading(true);
		try {
			const response = await api.get("/roles");
			setRoles(response.data.data || []);
		} catch (error) {
			console.error("Error fetching roles:", error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (isOpen) {
			fetchRoles();
		}
	}, [isOpen, fetchRoles]);

	const resetForm = () => {
		setFormData({
			name: "",
			label: "",
			color: "gray",
			description: "",
			category: "other",
			needs_entity: false,
		});
		setFormErrors({});
		setEditingRole(null);
		setShowForm(false);
	};

	const handleAddNew = () => {
		resetForm();
		setShowForm(true);
	};

	const handleEdit = (role) => {
		setEditingRole(role);
		setFormData({
			name: role.name,
			label: role.label,
			color: role.color || "gray",
			description: role.description || "",
			category: role.category || "other",
			needs_entity: role.needs_entity || false,
		});
		setFormErrors({});
		setShowForm(true);
	};

	const validateForm = () => {
		const errors = {};
		if (!editingRole && !formData.name.trim()) {
			errors.name = "Name (kode) harus diisi";
		} else if (!editingRole && !/^[a-z][a-z0-9_]*$/.test(formData.name)) {
			errors.name = "Gunakan huruf kecil dan underscore (contoh: kepala_bidang)";
		}
		if (!formData.label.trim()) {
			errors.label = "Label harus diisi";
		}
		setFormErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!validateForm()) return;

		setSaving(true);
		try {
			if (editingRole) {
				await api.put(`/roles/${editingRole.id}`, {
					label: formData.label,
					color: formData.color,
					description: formData.description || null,
					category: formData.category,
					needs_entity: formData.needs_entity,
				});
				Swal.fire({
					title: "Berhasil!",
					text: "Role berhasil diupdate",
					icon: "success",
					timer: 1500,
					showConfirmButton: false,
				});
			} else {
				await api.post("/roles", formData);
				Swal.fire({
					title: "Berhasil!",
					text: "Role baru berhasil ditambahkan",
					icon: "success",
					timer: 1500,
					showConfirmButton: false,
				});
			}
			resetForm();
			fetchRoles();
		} catch (error) {
			Swal.fire({
				title: "Gagal!",
				text: error.response?.data?.message || "Terjadi kesalahan",
				icon: "error",
			});
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (role) => {
		const result = await Swal.fire({
			title: "Hapus Role?",
			html: `Apakah yakin ingin menghapus role <b>"${role.label}"</b>?`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#d33",
			cancelButtonColor: "#6b7280",
			confirmButtonText: "Ya, Hapus!",
			cancelButtonText: "Batal",
		});

		if (result.isConfirmed) {
			try {
				await api.delete(`/roles/${role.id}`);
				Swal.fire({
					title: "Terhapus!",
					text: "Role berhasil dihapus",
					icon: "success",
					timer: 1500,
					showConfirmButton: false,
				});
				fetchRoles();
			} catch (error) {
				Swal.fire({
					title: "Gagal!",
					text: error.response?.data?.message || "Gagal menghapus role",
					icon: "error",
				});
			}
		}
	};

	// Group roles by category
	const groupedRoles = roles.reduce((acc, role) => {
		const cat = role.category || "other";
		if (!acc[cat]) acc[cat] = [];
		acc[cat].push(role);
		return acc;
	}, {});

	const getCategoryLabel = (cat) => {
		return CATEGORY_OPTIONS.find((c) => c.value === cat)?.label || cat;
	};

	const getColorClass = (color) => {
		return COLOR_OPTIONS.find((c) => c.value === color)?.class || "bg-gray-500";
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-2xl">
					<div className="flex items-center gap-3">
						<div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
							<LuShield className="h-6 w-6 text-white" />
						</div>
						<div>
							<h3 className="text-xl font-bold text-gray-900">Kelola Role</h3>
							<p className="text-sm text-gray-600">
								Tambah, edit, atau hapus role pengguna
							</p>
						</div>
					</div>
					<button
						onClick={onClose}
						className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-white/50 transition-colors"
					>
						<LuX className="h-5 w-5 text-gray-500" />
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-6">
					{/* Add Role Button */}
					{!showForm && (
						<button
							onClick={handleAddNew}
							className="w-full mb-6 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-indigo-300 text-indigo-600 rounded-xl hover:bg-indigo-50 hover:border-indigo-400 transition-all font-semibold"
						>
							<LuPlus className="h-5 w-5" />
							Tambah Role Baru
						</button>
					)}

					{/* Add/Edit Form */}
					{showForm && (
						<div className="mb-6 p-5 bg-gray-50 rounded-xl border border-gray-200">
							<h4 className="font-bold text-gray-800 mb-4">
								{editingRole ? `Edit Role: ${editingRole.label}` : "Tambah Role Baru"}
							</h4>
							<form onSubmit={handleSubmit} className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{/* Name (only for new roles) */}
									{!editingRole && (
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">
												Kode Role *
											</label>
											<input
												type="text"
												value={formData.name}
												onChange={(e) =>
													setFormData({
														...formData,
														name: e.target.value.toLowerCase().replace(/\s/g, "_"),
													})
												}
												placeholder="contoh: koordinator_lapangan"
												className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
													formErrors.name ? "border-red-500" : "border-gray-300"
												}`}
											/>
											{formErrors.name && (
												<p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
											)}
										</div>
									)}

									{/* Label */}
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Label Tampilan *
										</label>
										<input
											type="text"
											value={formData.label}
											onChange={(e) =>
												setFormData({ ...formData, label: e.target.value })
											}
											placeholder="contoh: Koordinator Lapangan"
											className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
												formErrors.label ? "border-red-500" : "border-gray-300"
											}`}
										/>
										{formErrors.label && (
											<p className="text-red-500 text-xs mt-1">{formErrors.label}</p>
										)}
									</div>

									{/* Category */}
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Kategori
										</label>
										<select
											value={formData.category}
											onChange={(e) =>
												setFormData({ ...formData, category: e.target.value })
											}
											className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										>
											{CATEGORY_OPTIONS.map((cat) => (
												<option key={cat.value} value={cat.value}>
													{cat.label}
												</option>
											))}
										</select>
									</div>

									{/* Color */}
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Warna
										</label>
										<div className="flex flex-wrap gap-2">
											{COLOR_OPTIONS.map((color) => (
												<button
													key={color.value}
													type="button"
													onClick={() =>
														setFormData({ ...formData, color: color.value })
													}
													className={`w-7 h-7 rounded-full ${color.class} transition-all ${
														formData.color === color.value
															? "ring-2 ring-offset-2 ring-indigo-500 scale-110"
															: "hover:scale-110 opacity-70 hover:opacity-100"
													}`}
													title={color.label}
												/>
											))}
										</div>
									</div>
								</div>

								{/* Description */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Deskripsi
									</label>
									<input
										type="text"
										value={formData.description}
										onChange={(e) =>
											setFormData({ ...formData, description: e.target.value })
										}
										placeholder="Deskripsi singkat tentang role ini"
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
									/>
								</div>

								{/* Needs Entity */}
								<div className="flex items-center gap-2">
									<input
										type="checkbox"
										id="needs_entity"
										checked={formData.needs_entity}
										onChange={(e) =>
											setFormData({ ...formData, needs_entity: e.target.checked })
										}
										className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
									/>
									<label htmlFor="needs_entity" className="text-sm text-gray-700">
										Memerlukan pemilihan wilayah (Kecamatan/Desa) saat membuat user
									</label>
								</div>

								{/* Actions */}
								<div className="flex gap-3 pt-2">
									<button
										type="button"
										onClick={resetForm}
										className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
									>
										Batal
									</button>
									<button
										type="submit"
										disabled={saving}
										className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all font-medium flex items-center gap-2"
									>
										{saving ? (
											<>
												<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
												Menyimpan...
											</>
										) : (
											<>
												<LuSave className="h-4 w-4" />
												{editingRole ? "Update" : "Tambah"}
											</>
										)}
									</button>
								</div>
							</form>
						</div>
					)}

					{/* Roles List */}
					{loading ? (
						<div className="flex justify-center py-12">
							<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
						</div>
					) : (
						<div className="space-y-6">
							{Object.entries(groupedRoles).map(([category, categoryRoles]) => (
								<div key={category}>
									<h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
										{getCategoryLabel(category)}
									</h4>
									<div className="space-y-2">
										{categoryRoles.map((role) => (
											<div
												key={role.id}
												className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all"
											>
												<div className="flex items-center gap-3">
													<div
														className={`w-3 h-3 rounded-full ${getColorClass(role.color)}`}
													/>
													<div>
														<div className="flex items-center gap-2">
															<span className="font-semibold text-gray-900">
																{role.label}
															</span>
															<span className="text-xs text-gray-400 font-mono">
																{role.name}
															</span>
															{role.is_system && (
																<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">
																	<LuLock className="h-3 w-3" />
																	Sistem
																</span>
															)}
															{role.needs_entity && (
																<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs">
																	Wilayah
																</span>
															)}
														</div>
														{role.description && (
															<p className="text-xs text-gray-500 mt-0.5">
																{role.description}
															</p>
														)}
													</div>
												</div>
												<div className="flex items-center gap-1">
													<button
														onClick={() => handleEdit(role)}
														className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
														title="Edit role"
													>
														<LuPencil className="h-4 w-4" />
													</button>
													{!role.is_system && (
														<button
															onClick={() => handleDelete(role)}
															className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
															title="Hapus role"
														>
															<LuTrash2 className="h-4 w-4" />
														</button>
													)}
												</div>
											</div>
										))}
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
					<div className="flex items-center justify-between">
						<p className="text-sm text-gray-500">
							Total: {roles.length} role ({roles.filter((r) => r.is_system).length} sistem)
						</p>
						<button
							onClick={onClose}
							className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
						>
							Tutup
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default RoleManagementModal;
