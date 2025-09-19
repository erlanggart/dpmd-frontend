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
				console.error("Gagal mengambil galeri:", err);
				setError("Tidak dapat memuat gambar. Silakan coba lagi nanti.");
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
								src={`${imageBaseUrl}/uploads/${image.image_path}`}
								alt={image.title || "Hero Image"}
								className="absolute inset-0 h-full w-full object-cover"
							/>
						</SwiperSlide>
					))}
					{gallery.length === 0 && (
						<SwiperSlide>
							<div className="h-full w-full bg-gray-800">
								<div className="flex h-full items-center justify-center text-white">
									<p>Tidak ada gambar tersedia.</p>
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
				<div className="mt-8">
					<Link
						to="/login"
						className="rounded-lg bg-[rgb(var(--color-secondary))] px-8 py-3.5 text-lg font-bold text-white transition-colors hover:bg-[rgb(var(--color-primary))]"
					>
						Masuk ke Sistem
					</Link>
				</div>
			</div>
		</main>
	);
};

export default HeroSection;
