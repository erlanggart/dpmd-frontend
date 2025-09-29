// File: src/components/FeatureCard.jsx
import React from "react";

const FeatureCard = ({ icon, title, description }) => (
	<div className="transform rounded-lg bg-[rgb(var(--color-primary))] p-4 sm:p-6 lg:p-8 text-center text-white shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
		{/* Lingkaran ikon dengan latar belakang putih transparan */}
		<div className="mx-auto flex h-16 w-16 sm:h-18 sm:w-18 lg:h-20 lg:w-20 items-center justify-center rounded-full border-2 border-white/20 bg-white/10">
			{/* Mengubah warna ikon menjadi putih */}
			<div className="text-white text-2xl sm:text-3xl lg:text-4xl">
				{icon}
			</div>
		</div>

		{/* Mengubah warna teks menjadi putih dengan ukuran responsif */}
		<h3 className="mt-4 sm:mt-5 lg:mt-6 text-lg sm:text-xl font-bold">{title}</h3>
		<p className="mt-2 text-sm sm:text-base text-white/80">{description}</p>
	</div>
);

export default FeatureCard;
