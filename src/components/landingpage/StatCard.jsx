// File: src/components/StatCard.jsx
import React from "react";
import { useCountUp } from "../../hooks/useCountUp";

// Tambahkan prop 'startAnimation'
const StatCard = ({ icon, finalCount, label, startAnimation }) => {
	// Teruskan prop 'startAnimation' ke hook
	const count = useCountUp(finalCount, 2000, startAnimation);

	return (
		<div className="rounded-xl bg-primary text-white p-6 text-center shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
			<p className="text-5xl font-bold ">{count.toLocaleString("id-ID")}</p>
			<h3 className="mt-2 text-lg font-semibold text-secondary">{label}</h3>
		</div>
	);
};

export default StatCard;
