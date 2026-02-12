import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "../../api";
import StatCard from "./StatCard";
import { FiLoader } from "react-icons/fi";
import { useInView } from "react-intersection-observer";

const StatsSection = () => {
	const [stats, setStats] = useState(null);
	const [loading, setLoading] = useState(true);

	const { ref, inView } = useInView({
		threshold: 0.2,
		triggerOnce: false,
	});

	useEffect(() => {
		const fetchStats = async () => {
			try {
				const response = await api.get("/public/stats");
				if (response.data.success) {
					setStats(response.data.data);
				} else {
					setStats({ kecamatan: 40, desa: 416, kelurahan: 19 });
				}
			} catch (error) {
				setStats({ kecamatan: 40, desa: 416, kelurahan: 19 });
			} finally {
				setLoading(false);
			}
		};
		fetchStats();
	}, []);

	if (loading) {
		return (
			<div className="flex justify-center py-24 bg-[rgb(var(--color-primary))]">
				<div className="w-10 h-10 border-3 border-white/20 border-t-[rgb(var(--color-secondary))] rounded-full animate-spin" />
			</div>
		);
	}

	const statItems = [
		{ count: stats?.kecamatan, label: "Kecamatan", suffix: "", icon: "grid" },
		{ count: stats?.desa, label: "Desa", suffix: "+", icon: "home" },
		{ count: stats?.kelurahan, label: "Kelurahan", suffix: "", icon: "building" },
	];

	return (
		<section ref={ref} className="relative py-24 bg-[rgb(var(--color-primary))] overflow-hidden">
			{/* Background Decoration */}
			<div className="absolute inset-0 opacity-[0.04]" style={{
				backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 1px)`,
				backgroundSize: '40px 40px'
			}} />
			<div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[rgb(var(--color-secondary))]/30 to-transparent" />
			<div className="absolute -top-40 -right-40 w-80 h-80 bg-[rgb(var(--color-secondary))]/5 rounded-full blur-[100px]" />
			<div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px]" />

			<div className="container max-w-6xl mx-auto px-4 relative z-10">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					animate={inView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.7 }}
					className="text-center mb-16"
				>
					<div className="inline-flex items-center space-x-2 bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] rounded-full px-5 py-2 mb-6">
						<span className="w-1.5 h-1.5 bg-[rgb(var(--color-secondary))] rounded-full" />
						<span className="text-white/70 text-sm font-medium tracking-wider uppercase">Data Wilayah</span>
					</div>
					<h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
						Wilayah Administratif
					</h2>
					<p className="text-white/50 text-lg max-w-lg mx-auto">
						Cakupan wilayah kerja Dinas Pemberdayaan Masyarakat dan Desa Kabupaten Bogor
					</p>
				</motion.div>

				{/* Stats Grid */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
					{statItems.map((item, index) => (
						<motion.div
							key={index}
							initial={{ opacity: 0, y: 40 }}
							animate={inView ? { opacity: 1, y: 0 } : {}}
							transition={{ duration: 0.6, delay: index * 0.15 }}
						>
							<StatCard
								finalCount={item.count}
								label={item.label}
								suffix={item.suffix}
								icon={item.icon}
								startAnimation={inView}
							/>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
};

export default StatsSection;
