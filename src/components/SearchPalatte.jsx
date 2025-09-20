// File: src/components/SearchPalette.jsx
import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiSearch, FiCornerDownLeft } from "react-icons/fi";

const SearchPalette = ({ menuItems, adminMenuItems, closePalette }) => {
	const [query, setQuery] = useState("");
	const [activeIndex, setActiveIndex] = useState(0);
	const navigate = useNavigate();

	// Gabungkan dan ratakan semua item menu menjadi satu daftar untuk pencarian
	const allLinks = useMemo(() => {
		const flattened = [];
		[...menuItems, ...adminMenuItems].forEach((parent) => {
			parent.children.forEach((child) => {
				flattened.push({ ...child, parentLabel: parent.label });
			});
		});
		return flattened;
	}, [menuItems, adminMenuItems]);

	// Filter hasil berdasarkan query
	const filteredResults = useMemo(() => {
		if (!query) return allLinks;
		return allLinks.filter(
			(link) =>
				link.label.toLowerCase().includes(query.toLowerCase()) ||
				link.parentLabel.toLowerCase().includes(query.toLowerCase())
		);
	}, [query, allLinks]);

	// Efek untuk menangani navigasi keyboard (atas, bawah, enter) dan escape
	useEffect(() => {
		const handleKeyDown = (e) => {
			if (e.key === "Escape") {
				closePalette();
			} else if (e.key === "ArrowDown") {
				e.preventDefault();
				setActiveIndex((prev) => (prev + 1) % filteredResults.length);
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setActiveIndex(
					(prev) => (prev - 1 + filteredResults.length) % filteredResults.length
				);
			} else if (e.key === "Enter") {
				e.preventDefault();
				if (filteredResults[activeIndex]) {
					navigate(filteredResults[activeIndex].to);
					closePalette();
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [activeIndex, filteredResults, navigate, closePalette]);

	// Reset active index saat query berubah
	useEffect(() => {
		setActiveIndex(0);
	}, [query]);

	return (
		<div
			className="fixed inset-0 z-50 flex justify-center items-start pt-20 bg-black/50 backdrop-blur-sm"
			onClick={closePalette}
		>
			<div
				className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Input Pencarian */}
				<div className="flex items-center p-4 border-b">
					<FiSearch className="h-6 w-6 text-gray-500" />
					<input
						type="text"
						placeholder="Cari menu... (cth: profil desa, pegawai)"
						className="w-full text-lg ml-4 bg-transparent focus:outline-none"
						autoFocus
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
				</div>
				{/* Hasil Pencarian */}
				<ul className="max-h-96 overflow-y-auto p-2">
					{filteredResults.length > 0 ? (
						filteredResults.map((item, index) => (
							<li key={item.to}>
								<Link
									to={item.to}
									onClick={closePalette}
									className={`flex items-center justify-between p-3 rounded-lg text-gray-700 ${
										activeIndex === index
											? "bg-primary text-white"
											: "hover:bg-gray-100"
									}`}
								>
									<div>
										<span className="text-sm text-gray-400">
											{item.parentLabel}
										</span>
										<p
											className={`${
												activeIndex === index
													? "text-white"
													: "text-primary font-semibold"
											}`}
										>
											{item.label}
										</p>
									</div>
									{activeIndex === index && (
										<FiCornerDownLeft className="h-5 w-5" />
									)}
								</Link>
							</li>
						))
					) : (
						<li className="p-4 text-center text-gray-500">
							Menu tidak ditemukan.
						</li>
					)}
				</ul>
			</div>
		</div>
	);
};

export default SearchPalette;
