import React from "react";
import { FiUsers, FiDollarSign, FiMap, FiBriefcase } from "react-icons/fi";
import FeatureCard from "./FeatureCard";

const FeatureSection = () => {
	const features = [
		{
			icon: <FiUsers size={32} />,
			title: "Pemerintahan Desa",
			description:
				"Manajemen terpusat untuk profil desa dan data aparatur desa.",
		},
		{
			icon: <FiDollarSign size={32} />,
			title: "Keuangan & Aset Desa",
			description: "Monitoring alokasi dana transfer desa secara transparan.",
		},
		{
			icon: <FiMap size={32} />,
			title: "Sarana & Prasarana",
			description:
				"Pelacakan dan pelaporan program-program unggulan kewilayahan.",
		},
		{
			icon: <FiBriefcase size={32} />,
			title: "Pemberdayaan Masyarakat",
			description: "Pendataan dan pemantauan kelembagaan masyarakat desa.",
		},
	];
	return (
		<div className="container mx-auto px-4 sm:px-6 lg:px-8">
			<div className="text-center">
				<h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
					Modul Utama Aplikasi
				</h3>
				<p className="text-base sm:text-lg font-semibold text-secondary">
					Data terintegrasi dari empat bidang utama.
				</p>
			</div>
			<div className="mt-8 sm:mt-10 lg:mt-12 grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-4">
				{features.map((feature, index) => (
					<FeatureCard key={index} {...feature} />
				))}
			</div>
		</div>
	);
};

export default FeatureSection;
