import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-fade";

import { FiArrowRight, FiChevronDown } from "react-icons/fi";

const HeroSection = () => {
	const [gallery, setGallery] = useState([]);
	const [loading, setLoading] = useState(true);
	const [activeSlide, setActiveSlide] = useState(0);
	const swiperRef = useRef(null);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const response = await api.get("/public/hero-gallery");
				const galleryData = response.data.data || response.data;
				setGallery(Array.isArray(galleryData) ? galleryData : []);
			} catch (err) {
				setGallery([]);
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, []);

	if (loading) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-[rgb(var(--color-primary))]">
				<div className="relative">
					<div className="w-16 h-16 border-4 border-white/20 border-t-[rgb(var(--color-secondary))] rounded-full animate-spin" />
					<div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-white/40 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
				</div>
			</main>
		);
	}

	return (
		<main className="relative min-h-screen overflow-hidden">
			{/* Background Swiper */}
			<div className="absolute inset-0 z-0">
				<Swiper
					ref={swiperRef}
					modules={[Autoplay, EffectFade]}
					effect="fade"
					autoplay={{ delay: 6000, disableOnInteraction: false }}
					loop={gallery.length > 1}
					speed={1500}
					onSlideChange={(swiper) => setActiveSlide(swiper.realIndex)}
					className="h-full w-full"
				>
					{gallery.map((image) => (
						<SwiperSlide key={image.id}>
							<div className="relative h-full w-full">
								<img
									src={`${import.meta.env.VITE_IMAGE_BASE_URL || 'http://127.0.0.1:3001'}/storage/uploads/${encodeURIComponent(image.image_path).replace(/%2F/g, '/')}`}
									alt={image.title || "Hero Image"}
									className="absolute inset-0 h-full w-full object-cover scale-105"
									style={{ animation: 'hero-zoom 8s ease-in-out infinite alternate' }}
									onError={(e) => {
										e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23112642" width="100" height="100"/%3E%3C/svg%3E';
									}}
								/>
							</div>
						</SwiperSlide>
					))}
					{gallery.length === 0 && (
						<SwiperSlide>
							<div className="h-full w-full bg-gradient-to-br from-[rgb(var(--color-primary))] via-slate-800 to-[rgb(var(--color-primary))]" />
						</SwiperSlide>
					)}
				</Swiper>
			</div>

			{/* Overlay Layers */}
			<div className="absolute inset-0 z-10 bg-gradient-to-b from-black/70 via-black/50 to-[rgb(var(--color-primary))]" />
			<div className="absolute inset-0 z-10 bg-gradient-to-r from-[rgb(var(--color-primary))]/60 to-transparent" />
			
			{/* Decorative Grid Pattern */}
			<div className="absolute inset-0 z-10 opacity-[0.03]" style={{
				backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
				backgroundSize: '60px 60px'
			}} />

			{/* Floating Orbs */}
			<div className="absolute top-1/4 -left-32 w-96 h-96 bg-[rgb(var(--color-secondary))]/10 rounded-full blur-[120px] z-10 animate-pulse" />
			<div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] z-10" style={{ animation: 'float 8s ease-in-out infinite' }} />

			{/* Main Content */}
			<div className="relative z-20 min-h-screen flex items-center">
				<div className="container max-w-7xl mx-auto px-6 lg:px-8">
					<div className="max-w-3xl">
						{/* Badge */}
						<motion.div
							initial={{ opacity: 0, y: 30 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.8, delay: 0.2 }}
						>
							<div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md border border-white/15 rounded-full px-5 py-2 mb-8">
								<span className="w-2 h-2 bg-[rgb(var(--color-secondary))] rounded-full animate-pulse" />
								<span className="text-white/90 text-sm font-medium tracking-wide">Sistem Informasi Pemberdayaan Desa</span>
							</div>
						</motion.div>

						{/* Title */}
						<motion.h1
							initial={{ opacity: 0, y: 40 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.8, delay: 0.4 }}
							className="text-white leading-tight mb-6"
						>
							<span className="block text-2xl md:text-3xl font-medium text-white/80 mb-2">
								Dinas Pemberdayaan Masyarakat dan Desa
							</span>
							<span className="block text-5xl md:text-7xl font-extrabold tracking-tight">
								Kabupaten
							</span>
							<span className="block text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-[rgb(var(--color-secondary))] via-amber-400 to-[rgb(var(--color-secondary))] bg-clip-text text-transparent pb-2">
								Bogor
							</span>
						</motion.h1>

						{/* Description */}
						<motion.p
							initial={{ opacity: 0, y: 30 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.8, delay: 0.6 }}
							className="text-lg md:text-xl text-white/70 max-w-xl mb-10 leading-relaxed"
						>
							Platform digital terpadu untuk mengelola, memonitor, dan menganalisis data pemberdayaan masyarakat dan desa.
						</motion.p>

						{/* CTA Buttons */}
						<motion.div
							initial={{ opacity: 0, y: 30 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.8, delay: 0.8 }}
							className="flex flex-col sm:flex-row gap-4"
						>
							<Link
								to="/login"
								className="group inline-flex items-center justify-center gap-2 sm:gap-3 bg-gradient-to-r from-[rgb(var(--color-secondary))] to-amber-500 text-white font-bold px-5 py-2.5 sm:px-8 sm:py-4 text-sm sm:text-base rounded-xl sm:rounded-2xl shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 transform hover:-translate-y-0.5 transition-all duration-300"
							>
								Masuk ke Sistem
								<FiArrowRight className="group-hover:translate-x-1 transition-transform" />
							</Link>
						</motion.div>
					</div>
				</div>
			</div>

			{/* Slide Indicators */}
			{gallery.length > 1 && (
				<div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
					{gallery.map((_, i) => (
						<button
							key={i}
							onClick={() => swiperRef.current?.swiper?.slideTo(i)}
							className={`transition-all duration-500 rounded-full ${
								i === activeSlide
									? "w-8 h-2 bg-[rgb(var(--color-secondary))]"
									: "w-2 h-2 bg-white/40 hover:bg-white/60"
							}`}
						/>
					))}
				</div>
			)}

			{/* Scroll Down Indicator */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 1.5, duration: 1 }}
				className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
			>
				<div className="flex flex-col items-center gap-2 text-white/50">
					<span className="text-xs tracking-[0.3em] uppercase">Scroll</span>
					<motion.div
						animate={{ y: [0, 8, 0] }}
						transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
					>
						<FiChevronDown className="w-5 h-5" />
					</motion.div>
				</div>
			</motion.div>
		</main>
	);
};

export default HeroSection;
