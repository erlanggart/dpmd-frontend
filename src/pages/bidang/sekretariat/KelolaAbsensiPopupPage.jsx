import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
	FiArrowLeft, FiImage, FiEdit2, FiSave, FiX, FiTrash2,
	FiToggleLeft, FiToggleRight, FiUpload, FiCheck,
} from "react-icons/fi";
import api from "../../../api";
import API_CONFIG from "../../../config/api";
import { showAlert } from "../../../components/AlertPopup";
import { useAuth } from "../../../context/AuthContext";

const TYPE_LABELS = {
	masuk: "Absen Masuk",
	pulang: "Absen Pulang",
	wfh: "WFH",
	dinas_luar: "Dinas Luar",
	wfa: "WFA",
	izin: "Izin",
	sakit: "Sakit",
	cuti: "Cuti",
};

const TYPE_COLORS = {
	masuk: "from-emerald-500 to-emerald-600",
	pulang: "from-blue-500 to-blue-600",
	wfh: "from-teal-500 to-teal-600",
	dinas_luar: "from-violet-500 to-violet-600",
	wfa: "from-indigo-500 to-indigo-600",
	izin: "from-amber-500 to-amber-600",
	sakit: "from-rose-500 to-rose-600",
	cuti: "from-sky-500 to-sky-600",
};

const getStorageUrl = (imagePath) => {
	if (!imagePath) return null;
	const base = import.meta.env.VITE_IMAGE_BASE_URL || "http://127.0.0.1:3001";
	return `${base}/storage/${imagePath}`;
};

const KelolaAbsensiPopupPage = () => {
	const navigate = useNavigate();
	const { user } = useAuth();
	const [messages, setMessages] = useState([]);
	const [loading, setLoading] = useState(true);
	const [editingType, setEditingType] = useState(null);
	const [editForm, setEditForm] = useState({ title: "", message: "", is_active: true });
	const [previewImage, setPreviewImage] = useState(null);
	const [imageBase64, setImageBase64] = useState(null);
	const [saving, setSaving] = useState(false);
	const fileInputRef = useRef(null);

	const fetchMessages = useCallback(async () => {
		try {
			setLoading(true);
			const res = await api.get("/absensi/admin/success-messages");
			setMessages(res.data.data || []);
		} catch (err) {
			console.error("Error fetching messages:", err);
			showAlert({ icon: "error", title: "Gagal", text: "Gagal memuat data popup" });
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchMessages();
	}, [fetchMessages]);

	const startEdit = (msg) => {
		setEditingType(msg.type);
		setEditForm({
			title: msg.title || "",
			message: msg.message || "",
			is_active: msg.is_active,
		});
		setPreviewImage(msg.image_path ? getStorageUrl(msg.image_path) : null);
		setImageBase64(null);
	};

	const cancelEdit = () => {
		setEditingType(null);
		setEditForm({ title: "", message: "", is_active: true });
		setPreviewImage(null);
		setImageBase64(null);
	};

	const handleImageChange = (e) => {
		const file = e.target.files[0];
		if (!file) return;

		if (file.size > 5 * 1024 * 1024) {
			showAlert({ icon: "warning", title: "File Terlalu Besar", text: "Ukuran file melebihi batas maksimal 5MB" });
			return;
		}

		const reader = new FileReader();
		reader.onloadend = () => {
			setImageBase64(reader.result);
			setPreviewImage(reader.result);
		};
		reader.readAsDataURL(file);
	};

	const handleSave = async () => {
		if (!editingType) return;
		setSaving(true);
		try {
			const body = {
				title: editForm.title,
				message: editForm.message,
				is_active: editForm.is_active,
			};
			if (imageBase64) {
				body.image_base64 = imageBase64;
			}

			await api.put(`/absensi/admin/success-messages/${editingType}`, body);
			await fetchMessages();
			cancelEdit();
			showAlert({ icon: "success", title: "Berhasil!", text: "Popup berhasil diupdate", timer: 1500 });
		} catch (err) {
			console.error("Error saving:", err);
			showAlert({ icon: "error", title: "Gagal", text: err.response?.data?.message || "Gagal menyimpan" });
		} finally {
			setSaving(false);
		}
	};

	const handleRemoveImage = async () => {
		if (!editingType) return;
		const result = await showAlert({
			title: "Hapus Gambar?",
			text: "Gambar popup akan dihapus",
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Ya, Hapus",
			cancelButtonText: "Batal",
		});
		if (!result.isConfirmed) return;

		setSaving(true);
		try {
			await api.put(`/absensi/admin/success-messages/${editingType}`, { remove_image: true });
			await fetchMessages();
			setPreviewImage(null);
			setImageBase64(null);
			showAlert({ icon: "success", title: "Berhasil!", text: "Gambar berhasil dihapus", timer: 1500 });
		} catch (err) {
			showAlert({ icon: "error", title: "Gagal", text: "Gagal menghapus gambar" });
		} finally {
			setSaving(false);
		}
	};

	const toggleActive = async (msg) => {
		try {
			await api.put(`/absensi/admin/success-messages/${msg.type}`, {
				is_active: !msg.is_active,
			});
			await fetchMessages();
		} catch (err) {
			showAlert({ icon: "error", title: "Gagal", text: "Gagal mengubah status" });
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
					<p className="mt-4 text-gray-600">Memuat data...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 pb-6">
			{/* Header */}
			<div className="bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 text-white">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
					<button
						onClick={() => navigate(-1)}
						className="mb-4 flex items-center gap-2 text-purple-100 hover:text-white transition-colors"
					>
						<FiArrowLeft className="h-5 w-5" />
						Kembali
					</button>
					<div className="flex items-center gap-4">
						<div className="h-14 w-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
							<FiImage className="h-7 w-7" />
						</div>
						<div>
							<h1 className="text-2xl font-bold">Kelola Popup Absensi</h1>
							<p className="text-purple-200 mt-1">Atur gambar & pesan sukses saat pegawai absen</p>
						</div>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{Object.keys(TYPE_LABELS).map((type) => {
						const msg = messages.find((m) => m.type === type) || {
							type,
							title: TYPE_LABELS[type] + " Berhasil!",
							message: "",
							image_path: null,
							is_active: true,
						};
						const isEditing = editingType === type;
						const colors = TYPE_COLORS[type];

						return (
							<div
								key={type}
								className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 overflow-hidden ${
									isEditing ? "border-purple-300 ring-2 ring-purple-100" : "border-gray-200 hover:shadow-md"
								}`}
							>
								{/* Card Header */}
								<div className={`bg-gradient-to-r ${colors} px-4 py-3 flex items-center justify-between`}>
									<div className="flex items-center gap-2">
										<span className="text-white font-bold text-sm">{TYPE_LABELS[type]}</span>
										{msg.is_active ? (
											<span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">Aktif</span>
										) : (
											<span className="bg-black/20 text-white/70 text-[10px] px-2 py-0.5 rounded-full font-medium">Nonaktif</span>
										)}
									</div>
									<div className="flex items-center gap-1">
										<button
											onClick={() => toggleActive(msg)}
											className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white"
											title={msg.is_active ? "Nonaktifkan" : "Aktifkan"}
										>
											{msg.is_active ? <FiToggleRight className="h-5 w-5" /> : <FiToggleLeft className="h-5 w-5" />}
										</button>
										{!isEditing && (
											<button
												onClick={() => startEdit(msg)}
												className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white"
											>
												<FiEdit2 className="h-4 w-4" />
											</button>
										)}
									</div>
								</div>

								{/* Card Body */}
								<div className="p-4">
									{isEditing ? (
										<div className="space-y-3">
											{/* Image Upload */}
											<div>
												<label className="text-xs font-semibold text-gray-600 mb-1 block">Gambar Popup</label>
												{previewImage ? (
													<div className="relative">
														<img
															src={previewImage}
															alt="Preview"
															className="w-full h-40 object-contain rounded-xl bg-gray-50 border border-gray-100"
														/>
														<button
															onClick={handleRemoveImage}
															className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
														>
															<FiTrash2 className="h-3.5 w-3.5" />
														</button>
													</div>
												) : (
													<button
														onClick={() => fileInputRef.current?.click()}
														className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-purple-400 hover:text-purple-500 transition-colors"
													>
														<FiUpload className="h-6 w-6" />
														<span className="text-xs font-medium">Upload Gambar (max 5MB)</span>
													</button>
												)}
												<input
													ref={fileInputRef}
													type="file"
													accept="image/*"
													onChange={handleImageChange}
													className="hidden"
												/>
												{previewImage && (
													<button
														onClick={() => fileInputRef.current?.click()}
														className="mt-2 text-xs text-purple-600 hover:text-purple-700 font-medium"
													>
														Ganti Gambar
													</button>
												)}
											</div>

											{/* Title */}
											<div>
												<label className="text-xs font-semibold text-gray-600 mb-1 block">Judul</label>
												<input
													type="text"
													value={editForm.title}
													onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
													className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
													placeholder="Judul popup..."
												/>
											</div>

											{/* Message */}
											<div>
												<label className="text-xs font-semibold text-gray-600 mb-1 block">Pesan / Kata-kata</label>
												<textarea
													value={editForm.message}
													onChange={(e) => setEditForm((f) => ({ ...f, message: e.target.value }))}
													rows={3}
													className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
													placeholder="Pesan yang ditampilkan..."
												/>
											</div>

											{/* Actions */}
											<div className="flex gap-2 justify-end pt-1">
												<button
													onClick={cancelEdit}
													className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
												>
													<FiX className="h-4 w-4 inline mr-1" />
													Batal
												</button>
												<button
													onClick={handleSave}
													disabled={saving}
													className="px-4 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-1"
												>
													{saving ? (
														<div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
													) : (
														<FiSave className="h-4 w-4" />
													)}
													Simpan
												</button>
											</div>
										</div>
									) : (
										<div>
											{/* Preview Image */}
											{msg.image_path && (
												<img
													src={getStorageUrl(msg.image_path)}
													alt={msg.title}
													className="w-full h-32 object-contain rounded-xl bg-gray-50 border border-gray-100 mb-3"
												/>
											)}
											{!msg.image_path && (
												<div className="w-full h-20 rounded-xl bg-gray-50 border border-gray-100 mb-3 flex items-center justify-center">
													<FiImage className="h-8 w-8 text-gray-200" />
												</div>
											)}

											{/* Title & Message */}
											<h4 className="font-bold text-gray-800 text-sm mb-1">{msg.title || "-"}</h4>
											<p className="text-gray-500 text-xs leading-relaxed">{msg.message || "Belum ada pesan"}</p>
										</div>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};

export default KelolaAbsensiPopupPage;
