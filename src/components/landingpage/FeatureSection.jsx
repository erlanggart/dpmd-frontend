import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { FiUsers, FiDollarSign, FiMap, FiBriefcase, FiArrowRight } from "react-icons/fi";
import FeatureCard from "./FeatureCard";

const FeatureSection = () => {
	const { ref, inView } = useInView({ threshold: 0.15, triggerOnce: true });

	const features = [
		{
			icon: <FiUsers size={28} />,
			title: "Pemerintahan Desa",
			description: "Manajemen terpusat untuk profil desa, data aparatur, dan struktur pemerintahan desa.",
			gradient: "from-blue-500 to-cyan-400",
			number: "01",
		},
		{
			icon: <FiDollarSign size={28} />,
			title: "Keuangan & Aset",
			description: "Monitoring alokasi dana transfer, bantuan keuangan, dan pengelolaan aset desa secara transparan.",
			gradient: "from-amber-500 to-orange-400",
			number: "02",
		},
		{
			icon: <FiMap size={28} />,
			title: "Sarana & Prasarana",
			description: "Pelacakan dan pelaporan infrastruktur serta program-program unggulan kewilayahan.",
			gradient: "from-emerald-500 to-teal-400",
			number: "03",
		},
		{
			icon: <FiBriefcase size={28} />,
			title: "Pemberdayaan",
			description: "Pendataan dan pemantauan kelembagaan masyarakat, BUMDes, dan pemberdayaan desa.",
			gradient: "from-purple-500 to-violet-400",
			number: "04",
		},
	];

	return (
		<section ref={ref} className="relative py-24 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
			{/* Background Decoration */}
			<div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
			<div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[rgb(var(--color-primary))]/[0.02] rounded-full blur-[100px]" />

			<div className="container max-w-7xl mx-auto px-4 md:px-6">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					animate={inView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.7 }}
					className="text-center mb-16"
				>
					<div className="inline-flex items-center space-x-2 bg-[rgb(var(--color-primary))]/5 border border-[rgb(var(--color-primary))]/10 rounded-full px-5 py-2 mb-6">
						<span className="w-1.5 h-1.5 bg-[rgb(var(--color-secondary))] rounded-full" />
						<span className="text-[rgb(var(--color-primary))] text-sm font-semibold tracking-wide">Modul Utama</span>
					</div>
					<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
						Layanan Terintegrasi
					</h2>
					<p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed">
						Empat bidang utama yang dikelola secara digital untuk efisiensi dan transparansi
					</p>
				</motion.div>

				{/* Features Grid */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
					{features.map((feature, index) => (
						<motion.div
							key={index}
							initial={{ opacity: 0, y: 40 }}
							animate={inView ? { opacity: 1, y: 0 } : {}}
							transition={{ duration: 0.6, delay: index * 0.1 }}
						>
							<FeatureCard {...feature} />
						</motion.div>
					))}
				</div>

				{/* CTA Bantuan Keuangan */}
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					animate={inView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.7, delay: 0.5 }}
					className="mt-14"
				>
					<div className="relative bg-gradient-to-r from-[rgb(var(--color-primary))] via-blue-700 to-indigo-700 rounded-3xl p-8 md:p-10 overflow-hidden shadow-xl">
						<div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] -translate-y-1/3 translate-x-1/4" />
						<div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-400/10 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4" />
						<div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
							<div className="text-center md:text-left">
								<div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-3 py-1 mb-3">
									<span className="w-2 h-2 bg-cyan-300 rounded-full animate-pulse" />
									<span className="text-cyan-200 text-xs font-semibold">Transparansi Publik</span>
								</div>
								<h3 className="text-xl md:text-2xl font-bold text-white mb-2">
									Rekapitulasi Bantuan Keuangan Desa
								</h3>
								<p className="text-blue-100/70 text-sm md:text-base max-w-lg">
									Lihat informasi realisasi dan status pengajuan bantuan keuangan infrastruktur desa di Kabupaten Bogor secara transparan.
								</p>
							</div>
							<Link
								to="/bantuan-keuangan"
								className="flex-shrink-0 group inline-flex items-center gap-2.5 bg-white text-[rgb(var(--color-primary))] font-bold px-7 py-3.5 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300"
							>
								Lihat Bantuan Keuangan
								<FiArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
							</Link>
						</div>
					</div>
				</motion.div>
			</div>
		</section>
	);
};

export default FeatureSection;
