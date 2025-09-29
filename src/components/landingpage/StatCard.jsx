// File: src/components/StatCard.jsx
import React from "react";
import { useCountUp } from "../../hooks/useCountUp";

// Tambahkan prop 'startAnimation'
const StatCard = ({ icon, finalCount, label, startAnimation }) => {
	// Teruskan prop 'startAnimation' ke hook
	const count = useCountUp(finalCount, 2000, startAnimation);

	return (
		<div className="rounded-lg sm:rounded-xl bg-primary text-white p-4 sm:p-6 text-center shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
			<p className="text-3xl sm:text-4xl lg:text-5xl font-bold">{count.toLocaleString("id-ID")}</p>
			<h3 className="mt-1 sm:mt-2 text-sm sm:text-lg font-semibold text-secondary">{label}</h3>
		</div>
	);
};

export default StatCard;
