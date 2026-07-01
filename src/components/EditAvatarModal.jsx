import React, { useState, useEffect, useRef } from "react";
import { LuX, LuCamera, LuSave, LuUpload, LuTrash2, LuImagePlus } from "react-icons/lu";
import api from "../api";
import { getAvatarUrl } from "../utils/avatarUtils";
import { convertAvatarToWebp, validateAvatarInput } from "../utils/avatarImage";
import Swal from "sweetalert2";

const MAX_SIZE_MB = 20;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

const EditAvatarModal = ({ isOpen, onClose, onUpdated, userData }) => {
	const [preview, setPreview] = useState(null);
	const [file, setFile] = useState(null);
	const [loading, setLoading] = useState(false);
	const [dragOver, setDragOver] = useState(false);
	const fileRef = useRef(null);

	const currentAvatarUrl = userData?.avatar ? getAvatarUrl(userData.avatar) : null;

	useEffect(() => {
		if (isOpen) {
			setPreview(null);
			setFile(null);
			setDragOver(false);
		}
	}, [isOpen]);

	const validateFile = (f) => {
		if (!ALLOWED_TYPES.includes(f.type)) {
			Swal.fire({ icon: "error", title: "Format tidak didukung", text: "Hanya file JPG, PNG, GIF, atau WebP yang diperbolehkan." });
			return false;
		}
		const validation = validateAvatarInput(f);
		if (!validation.valid) {
			Swal.fire({ icon: "error", title: "File tidak valid", text: validation.message });
			return false;
		}
		return true;
	};

	const handleFileSelect = async (f) => {
		if (!validateFile(f)) return;
		setLoading(true);
		try {
			const webpFile = await convertAvatarToWebp(f, { outputName: "avatar" });
			setFile(webpFile);
			const reader = new FileReader();
			reader.onloadend = () => setPreview(reader.result);
			reader.readAsDataURL(webpFile);
		} catch (error) {
			Swal.fire({ icon: "error", title: "Gagal mengonversi foto", text: error.message || "Silakan coba foto lain." });
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (e) => {
		const f = e.target.files?.[0];
		if (f) handleFileSelect(f);
	};

	const handleDrop = (e) => {
		e.preventDefault();
		setDragOver(false);
		const f = e.dataTransfer.files?.[0];
		if (f) handleFileSelect(f);
	};

	const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
	const handleDragLeave = () => setDragOver(false);

	const handleRemovePreview = () => {
		setFile(null);
		setPreview(null);
		if (fileRef.current) fileRef.current.value = "";
	};

	const handleSubmit = async () => {
		if (!file) {
			Swal.fire({ icon: "warning", title: "Pilih foto", text: "Silakan pilih foto terlebih dahulu." });
			return;
		}

		setLoading(true);
		try {
			const formData = new FormData();
			formData.append("avatar", file);

			await api.post(`/users/${userData.id}/avatar`, formData, {
				headers: { "Content-Type": "multipart/form-data" },
			});

			Swal.fire({
				title: "Berhasil!",
				text: `Foto profil ${userData.name} berhasil diperbarui!`,
				icon: "success",
				timer: 2000,
				showConfirmButton: false,
			});

			onUpdated();
		} catch (error) {
			console.error("Error uploading avatar:", error);
			Swal.fire({
				title: "Gagal!",
				text: error.response?.data?.message || "Gagal mengupload foto profil.",
				icon: "error",
				confirmButtonText: "OK",
			});
		} finally {
			setLoading(false);
		}
	};

	if (!isOpen) return null;

	const displayUrl = preview || currentAvatarUrl;
	const initials = userData?.name?.charAt(0)?.toUpperCase() || "U";

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-pink-50 to-rose-50">
					<div className="flex items-center gap-3">
						<div className="h-12 w-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
							<LuCamera className="h-6 w-6 text-white" />
						</div>
						<div>
							<h3 className="text-xl font-bold text-gray-900">Edit Foto Profil</h3>
							<p className="text-sm text-gray-600">Upload atau ganti foto profil pegawai</p>
						</div>
					</div>
					<button
						onClick={onClose}
						disabled={loading}
						className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-white/50 transition-colors disabled:opacity-50"
					>
						<LuX className="h-5 w-5 text-gray-500" />
					</button>
				</div>

				{/* Content */}
				<div className="p-6">
					{/* User Info */}
					<div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
						<p className="text-sm text-gray-600 mb-1">Pegawai</p>
						<p className="font-bold text-gray-900 text-lg">{userData?.name}</p>
						<p className="text-sm text-gray-500">{userData?.email}</p>
					</div>

					{/* Avatar Preview */}
					<div className="flex flex-col items-center mb-6">
						<div className="relative group">
							<div className="w-32 h-32 rounded-2xl ring-4 ring-gray-100 ring-offset-2 shadow-lg overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300">
								{displayUrl ? (
									<img
										src={displayUrl}
										alt={userData?.name}
										className="w-full h-full object-cover"
										onError={(e) => {
											e.target.style.display = "none";
											e.target.nextElementSibling.style.display = "flex";
										}}
									/>
								) : null}
								<div
									className={`w-full h-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center ${displayUrl ? "hidden" : ""}`}
								>
									<span className="text-white font-bold text-4xl drop-shadow-sm">{initials}</span>
								</div>
							</div>

							{/* Overlay click-to-change */}
							<button
								type="button"
								onClick={() => fileRef.current?.click()}
								className="absolute inset-0 rounded-2xl bg-black/0 hover:bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-all duration-200 cursor-pointer"
							>
								<div className="flex flex-col items-center text-white">
									<LuCamera className="h-6 w-6 mb-1" />
									<span className="text-xs font-medium">Ganti Foto</span>
								</div>
							</button>
						</div>

						{/* Remove preview button */}
						{preview && (
							<button
								onClick={handleRemovePreview}
								className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
							>
								<LuTrash2 className="h-3.5 w-3.5" />
								Hapus Pilihan
							</button>
						)}
					</div>

					{/* Drop Zone */}
					<div
						onDrop={handleDrop}
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onClick={() => fileRef.current?.click()}
						className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
							dragOver
								? "border-pink-400 bg-pink-50 scale-[1.02]"
								: "border-gray-300 hover:border-pink-400 hover:bg-pink-50/50"
						}`}
					>
						<input
							ref={fileRef}
							type="file"
							accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
							onChange={handleInputChange}
							className="hidden"
						/>
						<div className="flex flex-col items-center gap-2">
							<div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
								dragOver ? "bg-pink-100" : "bg-gray-100"
							}`}>
								<LuImagePlus className={`h-6 w-6 ${dragOver ? "text-pink-600" : "text-gray-400"}`} />
							</div>
							<div>
								<p className="text-sm font-semibold text-gray-700">
									{dragOver ? "Lepaskan file di sini" : "Klik atau seret foto ke sini"}
								</p>
								<p className="text-xs text-gray-500 mt-1">
									JPG, PNG, GIF, atau WebP • Maks {MAX_SIZE_MB}MB
								</p>
							</div>
						</div>
					</div>

					{/* File info */}
					{file && (
						<div className="mt-3 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
							<LuUpload className="h-4 w-4 text-green-600 flex-shrink-0" />
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium text-green-800 truncate">{file.name}</p>
								<p className="text-xs text-green-600">{(file.size / 1024).toFixed(1)} KB</p>
							</div>
						</div>
					)}

					{/* Action Buttons */}
					<div className="flex gap-3 mt-6">
						<button
							type="button"
							onClick={onClose}
							disabled={loading}
							className="flex-1 px-5 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
						>
							Batal
						</button>
						<button
							type="button"
							onClick={handleSubmit}
							disabled={loading || !file}
							className="flex-1 px-5 py-3 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-xl hover:from-pink-700 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-pink-500/30 font-semibold flex items-center justify-center gap-2"
						>
							{loading ? (
								<>
									<div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
									Mengupload...
								</>
							) : (
								<>
									<LuSave className="h-5 w-5" />
									Simpan Foto
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default EditAvatarModal;
