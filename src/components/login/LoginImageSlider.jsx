// File: src/components/LoginImageSlider.jsx

import React, { useEffect, useState } from "react";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-fade";

import { FiLoader } from "react-icons/fi";
import api from "../../api";

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const LoginImageSlider = () => {
	const [gallery, setGallery] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const response = await api.get("/public/hero-gallery");
				setGallery(response.data.data || response.data);
			} catch (err) {
				console.error("Gagal mengambil galeri:", err);
				// Use fallback images if API fails
				setGallery([
					{
						id: 1,
						image_path: 'placeholder.jpg',
						title: 'Government Office',
						description: 'Default image'
					}
				]);
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, []);

	if (loading) {
		return (
			<div className="flex h-full w-full items-center justify-center bg-gray-900">
				<FiLoader className="animate-spin text-2xl text-white" />
			</div>
		);
	}

	return (
		<Swiper
			modules={[Autoplay, EffectFade]}
			effect="fade"
			autoplay={{ delay: 4000, disableOnInteraction: false }}
			loop={gallery.length > 1}
			className="h-full w-full rounded-2xl"
		>
			{gallery.map((image) => (
				<SwiperSlide key={image.id}>
					<img
						src={`http://127.0.0.1:3001/uploads/${encodeURIComponent(image.image_path).replace(/%2F/g, '/')}`}
						alt={image.title || "Login Image"}
						className="h-full w-full object-cover rounded-2xl"
						onError={(e) => {
							console.error('Failed to load image:', image.image_path);
							e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23374151" width="100" height="100"/%3E%3Ctext fill="%239CA3AF" x="50%" y="50%" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
						}}
					/>
				</SwiperSlide>
			))}
			{/* Fallback jika galeri kosong */}
			{gallery.length === 0 && (
				<SwiperSlide>
					<div className="h-full w-full bg-gray-800" />
				</SwiperSlide>
			)}
		</Swiper>
	);
};

export default LoginImageSlider;
