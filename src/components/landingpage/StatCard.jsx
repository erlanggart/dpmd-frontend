import React from "react";
import { useCountUp } from "../../hooks/useCountUp";
import { FiGrid, FiHome, FiMapPin } from "react-icons/fi";

const iconMap = {
	grid: FiGrid,
	home: FiHome,
	building: FiMapPin,
};

const StatCard = ({ finalCount, label, suffix = "", icon = "grid", startAnimation }) => {
	const count = useCountUp(finalCount, 2000, startAnimation);
	const IconComponent = iconMap[icon] || FiGrid;

	return (
		<div className="group relative">
			{/* Glow effect */}
			<div className="absolute -inset-0.5 bg-gradient-to-r from-[rgb(var(--color-secondary))]/20 to-blue-400/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
			
			<div className="relative bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-8 text-center hover:bg-white/[0.1] transition-all duration-500 hover:-translate-y-1">
				{/* Icon */}
				<div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[rgb(var(--color-secondary))]/10 border border-[rgb(var(--color-secondary))]/20 mb-6">
					<IconComponent className="w-6 h-6 text-[rgb(var(--color-secondary))]" />
				</div>
				
				{/* Counter */}
				<p className="text-5xl md:text-6xl font-extrabold text-white mb-2 tracking-tight">
					{count.toLocaleString("id-ID")}
					{suffix && <span className="text-[rgb(var(--color-secondary))] text-4xl">{suffix}</span>}
				</p>
				
				{/* Label */}
				<h3 className="text-lg font-medium text-white/60">{label}</h3>
				
				{/* Decorative line */}
				<div className="mt-6 mx-auto w-12 h-0.5 bg-gradient-to-r from-transparent via-[rgb(var(--color-secondary))]/40 to-transparent" />
			</div>
		</div>
	);
};

export default StatCard;
