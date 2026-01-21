import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-fade";

// --- IMPOR BARU UNTUK LOADING ICON ---
import { FiLoader } from "react-icons/fi";

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const HeroSection = () => {
	// --- STATE BARU ---
	const [gallery, setGallery] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const response = await api.get("/public/hero-gallery");
				const galleryData = response.data.data || response.data;
				// Pastikan gallery selalu array
				setGallery(Array.isArray(galleryData) ? galleryData : []);
			} catch (err) {
				console.error('Error fetching hero gallery:', err);
				// Jika gagal memuat galeri, gunakan array kosong tanpa menampilkan error
				setGallery([]);
				setError(null); // Reset error state
			} finally {
				// Hentikan loading terlepas dari berhasil atau gagal
				setLoading(false);
			}
		};
		fetchData();
	}, []);

	// --- RENDER KONTEN BERDASARKAN STATE ---
	if (loading) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
				<FiLoader className="animate-spin text-4xl" />
				<span className="ml-4 text-2xl">Memuat...</span>
			</main>
		);
	}

	// Tampilkan pesan error jika ada
	if (error) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
				<span className="text-2xl text-red-400">{error}</span>
			</main>
		);
	}

	return (
		<main className="relative flex min-h-screen items-center justify-center overflow-hidden">
			<div className="absolute inset-0 z-0 h-full w-full">
				<Swiper
					modules={[Autoplay, EffectFade]}
					effect="fade"
					autoplay={{ delay: 5000, disableOnInteraction: false }}
					loop={gallery.length > 1}
					className="h-full w-full"
				>
				{gallery.map((image) => (
					<SwiperSlide key={image.id}>
						<img
							src={`${import.meta.env.VITE_IMAGE_BASE_URL || 'http://127.0.0.1:3001'}/storage/uploads/${encodeURIComponent(image.image_path).replace(/%2F/g, '/')}`}
							alt={image.title || "Hero Image"}
							className="absolute inset-0 h-full w-full object-cover"
							onError={(e) => {
								console.error('Failed to load image:', image.image_path);
								e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%" y="50%" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
							}}
						/>
						</SwiperSlide>
					))}
					{gallery.length === 0 && (
						<SwiperSlide>
							<div className="h-full w-full bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
								<div className="flex h-full items-center justify-center">
									<div className="text-center text-white">
										<div className="mb-4">
											<svg className="mx-auto h-24 w-24 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
											</svg>
										</div>
										<h3 className="text-2xl font-semibold mb-2">Dinas Pemberdayaan Masyarakat dan Desa</h3>
										<p className="text-blue-200">Kabupaten Bogor</p>
									</div>
								</div>
							</div>
						</SwiperSlide>
					)}
				</Swiper>
			</div>

			<div className="absolute inset-0 z-10 bg-black/60"></div>

			<div className="container relative z-20 mx-auto px-6 text-center">
				<h2 className="text-2xl font-extrabold tracking-tight text-white md:text-4xl">
					Dinas Pemberdayaan Masyarakat dan Desa
				</h2>
				<h2 className="text-4xl font-extrabold tracking-tight text-white md:text-6xl">
					Kabupaten Bogor
				</h2>
				<p className="mx-auto mt-4 max-w-2xl text-lg text-gray-200">
					Satu platform untuk mengelola, memonitor, dan menganalisis semua data
					terkait Dinas Pemberdayaan Masyarakat dan Desa Kabupaten Bogor.
				</p>
				<div className="mt-8 flex justify-center">
					<Link
						to="/login"
						className="rounded-lg bg-[rgb(var(--color-secondary))] px-8 py-3.5 text-lg font-bold text-white transition-colors hover:bg-[rgb(var(--color-primary))] shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 duration-200"
					>
						Masuk ke Sistem
					</Link>
				</div>
			</div>
		</main>
	);
};

export default HeroSection;
