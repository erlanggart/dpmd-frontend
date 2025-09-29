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
				setGallery(response.data);
			} catch (err) {
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
			<main className="flex min-h-screen items-center justify-center bg-gray-900 text-white px-4">
				<div className="text-center">
					<FiLoader className="animate-spin text-2xl sm:text-3xl lg:text-4xl mx-auto mb-4" />
					<span className="text-lg sm:text-xl lg:text-2xl">Memuat...</span>
				</div>
			</main>
		);
	}

	// Tampilkan pesan error jika ada
	if (error) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-gray-900 text-white px-4">
				<div className="text-center">
					<span className="text-lg sm:text-xl lg:text-2xl text-red-400">{error}</span>
				</div>
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
								src={`${imageBaseUrl}/uploads/${image.image_path}`}
								alt={image.title || "Hero Image"}
								className="absolute inset-0 h-full w-full object-cover"
							/>
						</SwiperSlide>
					))}
					{gallery.length === 0 && (
						<SwiperSlide>
							<div className="h-full w-full bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
								<div className="flex h-full items-center justify-center">
									<div className="text-center text-white px-4">
										<div className="mb-4">
											<svg className="mx-auto h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
											</svg>
										</div>
										<h3 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-2">Dinas Pemberdayaan Masyarakat dan Desa</h3>
										<p className="text-sm sm:text-base text-blue-200">Kabupaten Bogor</p>
									</div>
								</div>
							</div>
						</SwiperSlide>
					)}
				</Swiper>
			</div>

			<div className="absolute inset-0 z-10 bg-black/60"></div>

			<div className="container relative z-20 mx-auto px-4 sm:px-6 lg:px-8 text-center">
				<h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-extrabold tracking-tight text-white mb-2 sm:mb-4">
					Dinas Pemberdayaan Masyarakat dan Desa
				</h2>
				<h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-white mb-4 sm:mb-6">
					Kabupaten Bogor
				</h2>
				<p className="mx-auto max-w-2xl text-sm sm:text-base lg:text-lg text-gray-200 px-4">
					Satu platform untuk mengelola, memonitor, dan menganalisis semua data
					terkait Dinas Pemberdayaan Masyarakat dan Desa Kabupaten Bogor.
				</p>
				<div className="mt-6 sm:mt-8 flex justify-center">
					<Link
						to="/login"
						className="rounded-lg bg-[rgb(var(--color-secondary))] px-6 sm:px-8 py-3 sm:py-3.5 text-base sm:text-lg font-bold text-white transition-colors hover:bg-[rgb(var(--color-primary))] shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 duration-200"
					>
						Masuk ke Sistem
					</Link>
				</div>
			</div>
		</main>
	);
};

export default HeroSection;
