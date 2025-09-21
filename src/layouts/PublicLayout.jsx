import React from "react";
import { Outlet } from "react-router-dom";

// Komponen Header Publik Sederhana
const PublicHeader = () => (
	<header className="bg-white shadow">
		<div className="container mx-auto px-4 py-6">
			<h1 className="text-2xl font-bold text-gray-800">
				DPMD - Informasi Publik
			</h1>
		</div>
	</header>
);

// Komponen Footer Publik Sederhana
const PublicFooter = () => (
	<footer className="bg-gray-100 mt-8">
		<div className="container mx-auto px-4 py-6 text-center text-gray-600">
			<p>&copy; {new Date().getFullYear()} DPMD. Semua Hak Cipta Dilindungi.</p>
		</div>
	</footer>
);

const PublicLayout = () => {
	return (
		<div className="min-h-screen bg-gray-50">
			<PublicHeader />
			<main>
				<Outlet />
			</main>
			<PublicFooter />
		</div>
	);
};

export default PublicLayout;
