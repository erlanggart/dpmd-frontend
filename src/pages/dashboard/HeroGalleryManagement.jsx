import React, { useCallback, useEffect, useState } from "react";
import api from "../../api";
import {
	FiCheckCircle,
	FiGrid,
	FiImage,
	FiTrash2,
	FiToggleLeft,
	FiToggleRight,
	FiUploadCloud,
} from "react-icons/fi";

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
			setPreview((currentPreview) => {
				if (currentPreview) {
					URL.revokeObjectURL(currentPreview);
				}
				return previewUrl;
			});
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

	useEffect(() => {
		return () => {
			if (preview) {
				URL.revokeObjectURL(preview);
			}
		};
	}, [preview]);

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
			setPreview((currentPreview) => {
				if (currentPreview) {
					URL.revokeObjectURL(currentPreview);
				}
				return null;
			});
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

	const activeCount = gallery.filter((image) => image.is_active).length;
	const inactiveCount = gallery.length - activeCount;
	const selectedFileSize = selectedFile
		? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
		: null;

	if (loading) {
		return (
			<div className="rounded-xl border border-slate-200 bg-white p-10 shadow-sm">
				<div className="flex items-center gap-4">
					<div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg">
						<FiImage className="h-7 w-7" />
					</div>
					<div>
						<p className="text-sm font-semibold uppercase tracking-[0.24em] text-pink-500">Hero Gallery</p>
						<h1 className="text-2xl font-bold text-slate-900">Memuat studio galeri...</h1>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="rounded-xl border border-red-200 bg-red-50 p-8 text-red-600 shadow-sm">
				<h1 className="text-xl font-bold">Gagal memuat Hero Gallery</h1>
				<p className="mt-2 text-sm">{error}</p>
			</div>
		);
	}

	return (
		<div className="space-y-6 p-6">
			<div>
				<h1 className="text-3xl font-black text-slate-900">Hero Gallery</h1>
			</div>

			<section>
				<form
					onSubmit={handleUpload}
					className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
				>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
						<div>
							<h2 className="text-xl font-bold text-slate-900">Tambah gambar hero baru</h2>
						</div>
						<div className="rounded-xl bg-slate-100 px-4 py-3 text-xs text-slate-500">
							Format: JPG, PNG, WEBP
						</div>
					</div>

					<div className="mt-6 space-y-5">
						<div
							{...getRootProps()}
							className={`relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200 ${
								isDragActive
									? "border-pink-400 bg-gradient-to-br from-pink-50 via-white to-rose-50"
									: "border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 hover:border-pink-300 hover:shadow-md"
							}`}
						>
							<input {...getInputProps()} id="file-input" />
							{preview ? (
								<div className="relative min-h-[320px] sm:min-h-[380px]">
									<img
										src={preview}
										alt="Preview"
										className="h-full w-full object-cover"
									/>
									<div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 bg-gradient-to-b from-slate-950/70 via-slate-900/30 to-transparent p-4 text-white">
										<span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] backdrop-blur-sm">
											{title || "Tanpa judul"}
										</span>
										{selectedFileSize && (
											<span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] backdrop-blur-sm">
												{selectedFileSize}
											</span>
										)}
									</div>
									<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-900/45 to-transparent p-5 text-white">
										<p className="text-sm font-semibold">Klik atau drop gambar baru untuk mengganti preview</p>
										<p className="mt-1 text-xs text-white/70">Preview dan dropzone sekarang menyatu di area ini.</p>
									</div>
								</div>
							) : (
								<div className="relative flex min-h-[320px] flex-col items-center justify-center px-6 py-10 text-center sm:min-h-[380px]">
									<div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-pink-200/40 blur-2xl"></div>
									<div className="relative flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg">
										<FiUploadCloud className="h-8 w-8" />
									</div>
									<h3 className="mt-4 text-lg font-bold text-slate-900">
										{isDragActive ? "Lepaskan gambar di sini" : "Tarik gambar ke area ini"}
									</h3>
									<p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
										Klik untuk memilih file atau drag and drop langsung dari folder Anda.
									</p>
								</div>
							)}
						</div>

						<div className="grid gap-4 lg:grid-cols-[1fr_auto]">
							<div className="space-y-2">
								<label className="text-sm font-semibold text-slate-700">Judul gambar</label>
								<input
									type="text"
									placeholder="Contoh: Suasana pelayanan DPMD"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-pink-400 focus:bg-white focus:ring-4 focus:ring-pink-100"
								/>
							</div>
							<button
								type="submit"
								disabled={isUploading || !selectedFile}
								className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-500/20 transition hover:scale-[1.01] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
							>
								{isUploading ? "Mengunggah..." : "Upload Gambar"}
							</button>
						</div>
					</div>
				</form>
			</section>

			<section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Gallery Assets</p>
						<h2 className="mt-2 text-2xl font-black text-slate-900">Daftar gambar hero</h2>
					</div>
					<div className="flex flex-wrap gap-2">
						<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
							<FiGrid className="mr-1 inline-block h-3.5 w-3.5" />
							{gallery.length} item
						</span>
						<span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
							<FiCheckCircle className="mr-1 inline-block h-3.5 w-3.5" />
							{activeCount} aktif
						</span>
						<span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
							{inactiveCount} nonaktif
						</span>
					</div>
				</div>

				{gallery.length === 0 ? (
					<div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
						<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
							<FiImage className="h-8 w-8" />
						</div>
						<h3 className="text-xl font-bold text-slate-900">Belum ada gambar hero</h3>
						<p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
							Unggah gambar pertama Anda dari panel di atas untuk mulai menyusun tampilan utama halaman depan.
						</p>
					</div>
				) : (
					<div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
						{gallery.map((image) => (
							<div
								key={image.id}
								className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
							>
								<div className="relative overflow-hidden">
									<img
										src={`${imageBaseUrl}/storage/uploads/${image.image_path}`}
										alt={image.title || "Hero Image"}
										className="h-60 w-full object-cover transition-transform duration-500 group-hover:scale-105"
									/>
									<div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
										<span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] backdrop-blur-sm ${
											image.is_active
												? "bg-emerald-400/90 text-white"
												: "bg-slate-900/70 text-white"
										}`}>
											{image.is_active ? "Tayang" : "Arsip"}
										</span>
										<button
											onClick={() => handleDelete(image.id)}
											className="rounded-xl bg-white/90 p-2 text-red-500 shadow-sm transition hover:bg-white"
										>
											<FiTrash2 className="h-4 w-4" />
										</button>
									</div>
								</div>

								<div className="space-y-4 p-5">
									<div>
										<p className="text-lg font-bold text-slate-900" title={image.title || ""}>
											{image.title || "Tanpa Judul"}
										</p>
										<p className="mt-1 text-sm text-slate-500">
											Siap digunakan pada area hero halaman depan.
										</p>
									</div>

									<div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
										<div>
											<p className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</p>
											<p className={`mt-1 text-sm font-semibold ${
												image.is_active ? "text-emerald-600" : "text-slate-500"
											}`}>
												{image.is_active ? "Sedang aktif" : "Tidak aktif"}
											</p>
										</div>
										<button
											onClick={() => handleToggleActive(image)}
											className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:shadow-md"
										>
											{image.is_active ? (
												<FiToggleRight className="h-5 w-5 text-emerald-500" />
											) : (
												<FiToggleLeft className="h-5 w-5 text-slate-400" />
											)}
											{image.is_active ? "Nonaktifkan" : "Aktifkan"}
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</section>
		</div>
	);
};

export default HeroGalleryManagement;
