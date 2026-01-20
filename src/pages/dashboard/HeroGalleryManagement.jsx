import React, { useCallback, useEffect, useState } from "react";
import api from "../../api";
import { FiImage, FiTrash2, FiToggleLeft, FiToggleRight } from "react-icons/fi";

import { useDropzone } from "react-dropzone";
import Swal from "sweetalert2";

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const HeroGalleryManagement = () => {
	const [gallery, setGallery] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	// State untuk form upload
	// State untuk form upload
	const [selectedFile, setSelectedFile] = useState(null);
	const [title, setTitle] = useState("");
	const [isUploading, setIsUploading] = useState(false);
	const [preview, setPreview] = useState(null);

	// --- Konfigurasi Dropzone ---
	const onDrop = useCallback((acceptedFiles) => {
		const file = acceptedFiles[0];
		if (file) {
			setSelectedFile(file);
			const previewUrl = URL.createObjectURL(file);
			setPreview(previewUrl);
		}
	}, []);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp"] },
		maxFiles: 1,
	});

	const fetchGallery = async () => {
		try {
			const response = await api.get("/hero-gallery");
			setGallery(response.data.data || []);
		} catch (err) {
			setError("Gagal memuat galeri.");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchGallery();
	}, []);

	const handleFileChange = (e) => {
		if (e.target.files) {
			setSelectedFile(e.target.files[0]);
		}
	};
	const handleUpload = async (e) => {
		e.preventDefault();
		if (!selectedFile) {
			Swal.fire({
				icon: "warning",
				title: "Oops...",
				text: "Pilih file gambar terlebih dahulu!",
			});
			return;
		}
		setIsUploading(true);
		const formData = new FormData();
		formData.append("image", selectedFile);
		formData.append("title", title);

		try {
			await api.post("/hero-gallery", formData, {
				headers: { "Content-Type": "multipart/form-data" },
			});
			setSelectedFile(null);
			setTitle("");
			setPreview(null);
			fetchGallery();
			// 2. Tampilkan notifikasi sukses
			Swal.fire({
				icon: "success",
				title: "Berhasil!",
				text: "Gambar berhasil diunggah.",
				timer: 1500,
				showConfirmButton: false,
			});
		} catch (err) {
			// 3. Tampilkan notifikasi error
			const errorMessage =
				err.response?.data?.message ||
				"Pastikan file adalah gambar dan ukurannya di bawah 2MB.";
			Swal.fire({
				icon: "error",
				title: "Upload Gagal",
				text: errorMessage,
			});
		} finally {
			setIsUploading(false);
		}
	};

	const handleDelete = async (id) => {
		// 4. Gunakan konfirmasi dari SweetAlert2
		Swal.fire({
			title: "Anda yakin?",
			text: "Gambar yang dihapus tidak bisa dikembalikan!",
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#3085d6",
			cancelButtonColor: "#d33",
			confirmButtonText: "Ya, hapus!",
			cancelButtonText: "Batal",
		}).then(async (result) => {
			if (result.isConfirmed) {
				try {
					await api.delete(`/hero-gallery/${id}`);
					setGallery(gallery.filter((item) => item.id !== id));
					Swal.fire("Dihapus!", "Gambar Anda telah dihapus.", "success");
				} catch (err) {
					Swal.fire(
						"Gagal!",
						"Terjadi kesalahan saat menghapus gambar.",
						"error"
					);
				}
			}
		});
	};

	const handleToggleActive = async (image) => {
		try {
			const response = await api.patch(`/hero-gallery/${image.id}/toggle-status`);
			setGallery(
				gallery.map((item) => (item.id === image.id ? response.data.data : item))
			);
		} catch (err) {
			// 5. Tampilkan notifikasi error
			Swal.fire({
				icon: "error",
				title: "Gagal",
				text: "Gagal mengubah status gambar.",
			});
		}
	};

	if (loading) return <p className="text-white">Memuat galeri...</p>;
	if (error) return <p className="text-red-500">{error}</p>;

	return (
		<div>
			<h1 className="text-3xl font-bold text-primary mb-6">
				Manajemen Galeri Hero
			</h1>

			{/* Form Upload */}
			<form
				onSubmit={handleUpload}
				className="bg-white p-6 rounded-lg mb-8 shadow-md"
			>
				<h2 className="text-xl font-semibold text-primary mb-4">
					Tambah Gambar Baru
				</h2>
				<div className=" gap-6 items-center space-y-4">
					{/* Kolom Kiri: Dropzone & Input Judul */}
					<div className="space-y-4">
						<div
							{...getRootProps()}
							className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors
                ${
									isDragActive
										? "border-sky-500 bg-sky-900/30"
										: "border-gray-600 hover:border-sky-500 hover:bg-gray-300/50 bg-slate-200"
								}`}
						>
							<input {...getInputProps()} id="file-input" />
							<FiImage className="h-10 w-10 text-gray-400 mb-3" />
							{isDragActive ? (
								<p className="text-sky-400">Lepaskan file di sini...</p>
							) : (
								<p className="text-gray-400">
									Seret & lepas gambar di sini, atau klik untuk memilih
								</p>
							)}
						</div>
						<input
							type="text"
							placeholder="Judul/Deskripsi (Opsional)"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							className="w-full rounded-md border-2 border-slate-400 bg-slate-200 p-3 text-primaryplaceholder-gray-400 focus:ring-primary shadow-md"
						/>
					</div>

					{/* Kolom Kanan: Preview & Tombol Upload */}
					<div className="flex flex-col items-center justify-center">
						{preview ? (
							<div className="w-full text-center">
								<p className="text-gray-400 mb-2 text-sm">Preview Gambar:</p>
								<img
									src={preview}
									alt="Preview"
									className="w-full object-cover rounded-lg"
									onLoad={() => URL.revokeObjectURL(preview)} // Membersihkan memory
								/>
							</div>
						) : (
							<div className="flex items-center justify-center w-full  h-40 bg-gray-700 rounded-lg">
								<p className="text-gray-500">Preview akan tampil di sini</p>
							</div>
						)}
						<button
							type="submit"
							disabled={isUploading || !selectedFile}
							className="mt-4 w-full max-w-xs rounded-md bg-sky-600 px-4 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:bg-sky-800 disabled:cursor-not-allowed"
						>
							{isUploading ? "Mengunggah..." : "Upload Gambar"}
						</button>
					</div>
				</div>
			</form>

			{/* Daftar Gambar */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
				{gallery.map((image) => (
					<div
						key={image.id}
						className="bg-primary rounded-lg overflow-hidden group"
					>
						<img
							src={`${imageBaseUrl}/storage/uploads/${image.image_path}`}
							alt={image.title || "Hero Image"}
							className="w-full h-48 object-cover"
						/>
						<div className="p-4">
							<p className="text-white truncate" title={image.title || ""}>
								{image.title || "Tanpa Judul"}
							</p>
							<div className="flex justify-between items-center mt-4">
								<button
									onClick={() => handleToggleActive(image)}
									className="flex items-center gap-2 text-sm"
								>
									{image.is_active ? (
										<FiToggleRight className="text-green-500 h-6 w-6" />
									) : (
										<FiToggleLeft className="text-gray-500 h-6 w-6" />
									)}
									<span
										className={
											image.is_active ? "text-green-400" : "text-gray-400"
										}
									>
										{image.is_active ? "Aktif" : "Nonaktif"}
									</span>
								</button>
								<button
									onClick={() => handleDelete(image.id)}
									className="text-red-500 hover:text-red-400"
								>
									<FiTrash2 />
								</button>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

export default HeroGalleryManagement;
