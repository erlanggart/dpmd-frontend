// Ikon bergerak "Jelajahi Kantor" untuk Aksi Cepat: gedung bergradasi dengan
// jendela yang menyala bergantian dan pin lokasi melayang. Dibuat dengan
// framer-motion supaya sekelas ikon Lottie di sebelahnya tanpa berkas animasi
// tambahan. Gerak dimatikan bila pengguna memilih kurangi gerakan.
import React, { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

// [x, y] jendela menara (3 kolom x 4 baris) dan sayap rendah.
const JENDELA = [
	...[0, 1, 2, 3].flatMap((r) => [0, 1, 2].map((c) => [22.5 + c * 6, 24 + r * 7])),
	[42, 38], [48, 38], [42, 45], [48, 45],
];

const IkonJelajah = ({ className = "" }) => {
	const diam = useReducedMotion();
	// ID gradien unik per instans: ikon ini bisa tampil dua kali di satu halaman.
	const u = useId().replace(/:/g, "");
	const id = (n) => `ij-${n}-${u}`;
	const ulang = { repeat: Infinity, ease: "easeInOut" };

	return (
		<svg viewBox="0 0 64 64" className={className} aria-hidden="true">
			<defs>
				<linearGradient id={id("menara")} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#2dd4bf" />
					<stop offset="1" stopColor="#0f766e" />
				</linearGradient>
				<linearGradient id={id("sayap")} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#5eead4" />
					<stop offset="1" stopColor="#14b8a6" />
				</linearGradient>
				<linearGradient id={id("pin")} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#fb7185" />
					<stop offset="1" stopColor="#e11d48" />
				</linearGradient>
				<radialGradient id={id("halo")}>
					<stop offset="0" stopColor="#99f6e4" stopOpacity="0.75" />
					<stop offset="1" stopColor="#99f6e4" stopOpacity="0" />
				</radialGradient>
			</defs>

			{/* halo bernapas di belakang gedung */}
			<motion.circle
				cx="32" cy="36" r="27" fill={`url(#${id("halo")})`}
				style={{ transformOrigin: "32px 36px" }}
				animate={diam ? undefined : { scale: [0.92, 1.05, 0.92], opacity: [0.7, 1, 0.7] }}
				transition={{ duration: 3.2, ...ulang }}
			/>

			{/* bayangan tanah */}
			<ellipse cx="33" cy="56" rx="20" ry="2.6" fill="#0f172a" opacity="0.12" />

			{/* sayap rendah + menara */}
			<rect x="38" y="33" width="16" height="22" rx="2.5" fill={`url(#${id("sayap")})`} />
			<rect x="18" y="18" width="22" height="37" rx="3" fill={`url(#${id("menara")})`} />
			<rect x="18" y="18" width="22" height="3.5" rx="1.75" fill="#ccfbf1" opacity="0.55" />
			{/* pintu */}
			<rect x="26" y="47" width="6" height="8" rx="1.2" fill="#134e4a" />

			{/* jendela menyala bergantian */}
			{JENDELA.map(([x, y], i) => (
				<motion.rect
					key={i}
					x={x} y={y} width="4" height="4" rx="1"
					fill="#fde68a"
					initial={{ opacity: 0.35 }}
					animate={diam ? { opacity: 0.85 } : { opacity: [0.3, 1, 0.3] }}
					transition={diam ? undefined : { duration: 2.4, delay: (i * 0.37) % 2.4, ...ulang }}
				/>
			))}

			{/* pin lokasi melayang + bayangannya */}
			<motion.ellipse
				cx="50" cy="29.5" rx="3.6" ry="1.1" fill="#0f172a" opacity="0.18"
				style={{ transformOrigin: "50px 29.5px" }}
				animate={diam ? undefined : { scaleX: [1, 0.6, 1], opacity: [0.2, 0.08, 0.2] }}
				transition={{ duration: 1.8, ...ulang }}
			/>
			<motion.g
				animate={diam ? undefined : { y: [0, -4, 0] }}
				transition={{ duration: 1.8, ...ulang }}
			>
				<path d="M50 28c-.6-1.3-6.5-7.4-6.5-12.2a6.5 6.5 0 0 1 13 0C56.5 20.6 50.6 26.7 50 28z" fill={`url(#${id("pin")})`} />
				<circle cx="50" cy="15.8" r="2.4" fill="#fff" />
			</motion.g>
		</svg>
	);
};

export default IkonJelajah;
