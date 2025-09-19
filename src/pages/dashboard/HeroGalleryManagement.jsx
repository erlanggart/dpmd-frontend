import React, { useEffect, useState } from "react";
import api from "../../api";
import {
	FiUpload,
	FiTrash2,
	FiToggleLeft,
	FiToggleRight,
} from "react-icons/fi";

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const HeroGalleryManagement = () => {
	const [gallery, setGallery] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	// State untuk form upload
	const [selectedFile, setSelectedFile] = useState(null);
	const [title, setTitle] = useState("");
	const [isUploading, setIsUploading] = useState(false);

	const fetchGallery = async () => {
		try {
			const response = await api.get("/admin/hero-gallery");
			setGallery(response.data);
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
			alert("Pilih file gambar terlebih dahulu.");
			return;
		}
		setIsUploading(true);
		const formData = new FormData();
		formData.append("image", selectedFile);
		formData.append("title", title);

		try {
			await api.post("/admin/hero-gallery", formData, {
				headers: { "Content-Type": "multipart/form-data" },
			});
			setSelectedFile(null);
			setTitle("");
			document.getElementById("file-input").value = ""; // Reset input file
			fetchGallery(); // Refresh galeri
		} catch (err) {
			alert(
				"Upload gagal. Pastikan file adalah gambar dan ukurannya di bawah 2MB."
			);
		} finally {
			setIsUploading(false);
		}
	};

	const handleDelete = async (id) => {
		if (window.confirm("Anda yakin ingin menghapus gambar ini?")) {
			try {
				await api.delete(`/admin/hero-gallery/${id}`);
				setGallery(gallery.filter((item) => item.id !== id));
			} catch (err) {
				alert("Gagal menghapus gambar.");
			}
		}
	};

	const handleToggleActive = async (image) => {
		try {
			const response = await api.put(`/admin/hero-gallery/${image.id}`, {
				is_active: !image.is_active,
			});
			setGallery(
				gallery.map((item) => (item.id === image.id ? response.data : item))
			);
		} catch (err) {
			alert("Gagal mengubah status.");
		}
	};

	if (loading) return <p className="text-white">Memuat galeri...</p>;
	if (error) return <p className="text-red-500">{error}</p>;

	return (
		<div>
			<h1 className="text-3xl font-bold text-white mb-6">
				Manajemen Galeri Hero
			</h1>

			{/* Form Upload */}
			<form onSubmit={handleUpload} className="bg-gray-800 p-6 rounded-lg mb-8">
				<h2 className="text-xl font-semibold text-white mb-4">
					Tambah Gambar Baru
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<input
						type="text"
						placeholder="Judul/Deskripsi (Opsional)"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						className="col-span-1 rounded-md border-gray-700 bg-gray-700 p-2 text-white placeholder-gray-400 focus:ring-primary"
					/>
					<input
						id="file-input"
						type="file"
						onChange={handleFileChange}
						required
						className="col-span-1 self-center text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-white hover:file:bg-primary/90"
					/>
					<button
						type="submit"
						disabled={isUploading}
						className="col-span-1 rounded-md bg-sky-600 px-4 py-2 font-semibold text-white transition hover:bg-sky-700 disabled:bg-sky-800 disabled:cursor-not-allowed"
					>
						{isUploading ? "Mengunggah..." : "Upload Gambar"}
					</button>
				</div>
			</form>

			{/* Daftar Gambar */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
				{gallery.map((image) => (
					<div
						key={image.id}
						className="bg-gray-800 rounded-lg overflow-hidden group"
					>
						<img
							src={`${imageBaseUrl}/uploads/${image.image_path}`}
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
