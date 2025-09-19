// src/hooks/useScrollPosition.js
import { useState, useEffect } from "react";

export const useScrollPosition = () => {
	const [scrollY, setScrollY] = useState(0);

	useEffect(() => {
		const handleScroll = () => {
			setScrollY(window.scrollY);
		};

		// Tambahkan event listener saat komponen dimuat
		window.addEventListener("scroll", handleScroll);

		// Hapus event listener saat komponen dilepas untuk mencegah memory leak
		return () => {
			window.removeEventListener("scroll", handleScroll);
		};
	}, []); // Array dependensi kosong berarti efek ini hanya berjalan sekali

	return scrollY;
};
