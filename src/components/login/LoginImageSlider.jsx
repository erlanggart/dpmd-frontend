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
						src={`http://127.0.0.1:3001/uploads/${image.image_path}`}
						alt={image.title || "Login Image"}
						className="h-full w-full object-cover rounded-2xl"
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
