// File: src/components/FeatureCard.jsx
import React from "react";

const FeatureCard = ({ icon, title, description }) => (
	<div className="transform rounded-lg bg-[rgb(var(--color-primary))] p-8 text-center text-white shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
		{/* Lingkaran ikon dengan latar belakang putih transparan */}
		<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/20 bg-white/10">
			{/* Mengubah warna ikon menjadi putih */}
			{React.cloneElement(icon, { className: "text-white" })}
		</div>

		{/* Mengubah warna teks menjadi putih */}
		<h3 className="mt-6 text-xl font-bold">{title}</h3>
		<p className="mt-2 text-base text-white/80">{description}</p>
	</div>
);

export default FeatureCard;
