// File: src/hooks/useCountUp.js
import { useState, useEffect } from "react";

// Tambahkan parameter 'start' untuk mengontrol kapan animasi dimulai
export const useCountUp = (end, duration = 2000, start = false) => {
	const [count, setCount] = useState(0);

	useEffect(() => {
		// Jika tidak disuruh mulai, reset angka ke 0 dan berhenti
		if (!start) {
			setCount(0);
			return;
		}

		let startValue = 0;
		const endValue = parseInt(end, 10);
		if (startValue === endValue) return;

		const totalFrames = duration / (1000 / 60);
		const increment = endValue / totalFrames;

		const counter = () => {
			startValue += increment;
			if (startValue < endValue) {
				setCount(Math.ceil(startValue));
				requestAnimationFrame(counter);
			} else {
				setCount(endValue);
			}
		};

		requestAnimationFrame(counter);
		// Tambahkan 'start' ke dependency array
	}, [end, duration, start]);

	return count;
};
