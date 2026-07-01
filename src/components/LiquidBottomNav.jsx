// src/components/LiquidBottomNav.jsx
// Bottom nav "liquid": permukaan bar punya CEKUNGAN (notch) di bawah menu aktif,
// dan sebuah BOLA indikator bergulir ke menu tujuan. Saat berpindah, notch +
// bola bergerak dengan spring (overshoot) → terasa seperti menekan air lalu
// memantul kembali normal.
//
// Dipakai mobile-only. Item bisa berupa route (punya `active`) atau launcher
// menu (mis. Aksi Cepat) — bola tetap bergulir ke item yang ditekan.
import React, { useRef, useState, useLayoutEffect, useEffect } from "react";
import { motion } from "framer-motion";

const BAR_H = 62;         // tinggi badan bar
const CORNER = 22;        // radius sudut bar
const NOTCH_HALF = 40;    // setengah lebar cekungan
const NOTCH_DEPTH = 28;   // kedalaman cekungan
const BALL = 52;          // diameter bola indikator

// Gerak "mengalir": spring lembut, hampir tanpa overshoot → meluncur halus.
const flow = { type: "spring", stiffness: 130, damping: 24, mass: 1 };

// Bangun path bar dengan cekungan halus di posisi x = cx.
function buildPath(W, cx) {
	if (!W) return "";
	const d = NOTCH_DEPTH;
	const nw = NOTCH_HALF;
	const R = CORNER;
	const l = cx - nw;
	const r = cx + nw;
	return [
		`M ${R} 0`,
		`L ${l} 0`,
		`C ${l + nw * 0.42} 0 ${cx - nw * 0.5} ${d} ${cx} ${d}`,
		`C ${cx + nw * 0.5} ${d} ${r - nw * 0.42} 0 ${r} 0`,
		`L ${W - R} 0`,
		`Q ${W} 0 ${W} ${R}`,
		`L ${W} ${BAR_H - R}`,
		`Q ${W} ${BAR_H} ${W - R} ${BAR_H}`,
		`L ${R} ${BAR_H}`,
		`Q 0 ${BAR_H} 0 ${BAR_H - R}`,
		`L 0 ${R}`,
		`Q 0 0 ${R} 0`,
		"Z",
	].join(" ");
}

const LiquidBottomNav = ({ items = [] }) => {
	const containerRef = useRef(null);
	const [W, setW] = useState(0);

	// index route yang sedang aktif (dari prop items[].active)
	const routeActiveIndex = items.findIndex((it) => it.active);
	const [activeIndex, setActiveIndex] = useState(routeActiveIndex >= 0 ? routeActiveIndex : 0);
	const [pressKey, setPressKey] = useState(0); // memicu efek "tekan air" tiap pindah

	// Ukur lebar bar (responsif) untuk hitung posisi notch/bola dalam px.
	useLayoutEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const measure = () => setW(el.clientWidth);
		measure();
		if (typeof ResizeObserver === "undefined") return;
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	// Sinkronkan bola dengan route saat route berubah (mis. navigasi dari tempat lain).
	useEffect(() => {
		if (routeActiveIndex >= 0 && routeActiveIndex !== activeIndex) {
			setActiveIndex(routeActiveIndex);
			setPressKey((k) => k + 1);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [routeActiveIndex]);

	const n = items.length || 1;
	const itemW = W / n;
	const cx = itemW * (activeIndex + 0.5);

	// Aksi ditunda sampai bola tiba di tujuan (dipanggil di onAnimationComplete).
	const pendingActionRef = useRef(null);

	const handleClick = (i) => {
		const action = items[i]?.onClick;
		// Kalau sudah di posisi ini, bola tak bergerak → langsung jalankan.
		if (i === activeIndex) {
			action?.();
			return;
		}
		pendingActionRef.current = action || null;
		setActiveIndex(i);
		setPressKey((k) => k + 1);
	};

	const handleBallArrived = () => {
		if (pendingActionRef.current) {
			const fn = pendingActionRef.current;
			pendingActionRef.current = null;
			fn();
		}
	};

	const ActiveIcon = items[activeIndex]?.icon;

	return (
		<nav className="fixed bottom-4 left-4 right-4 z-50 font-[Poppins]">
			<div ref={containerRef} className="relative max-w-lg mx-auto" style={{ height: BAR_H }}>
				{/* Permukaan bar + cekungan (SVG) */}
				<svg
					className="absolute inset-x-0 bottom-0"
					width="100%"
					height={BAR_H}
					viewBox={`0 0 ${W || 1} ${BAR_H}`}
					preserveAspectRatio="none"
					style={{ filter: "drop-shadow(0 10px 22px rgba(15,23,42,0.16))" }}
				>
					<motion.path
						d={buildPath(W, cx)}
						fill="#334155"
						initial={false}
						animate={{ d: buildPath(W, cx) }}
						transition={flow}
					/>
				</svg>

				{/* Bola indikator yang bergulir ke menu aktif */}
				{W > 0 && (
					<motion.div
						className="absolute top-0"
						style={{ width: BALL, height: BALL, left: 0, marginTop: -BALL / 2 + NOTCH_DEPTH / 2 }}
						initial={false}
						animate={{ x: cx - BALL / 2 }}
						transition={flow}
						onAnimationComplete={handleBallArrived}
					>
						{/* efek "mengalir di atas air": bola turun sedikit lalu naik halus, tanpa mantul keras */}
						<motion.div
							key={pressKey}
							className="w-full h-full rounded-full bg-slate-900 ring-1 ring-white/10 shadow-lg shadow-black/40 flex items-center justify-center"
							animate={{ y: [0, 3, 0], scale: [1, 1.02, 1] }}
							transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
						>
							{ActiveIcon && <ActiveIcon size={22} className="text-teal-300" />}
						</motion.div>
					</motion.div>
				)}

				{/* Tombol-tombol (transparan, di atas bar) */}
				<div className="absolute inset-0 flex">
					{items.map((item, i) => {
						const Icon = item.icon;
						const isActive = i === activeIndex;
						return (
							<button
								key={i}
								onClick={() => handleClick(i)}
								className="relative flex-1 flex flex-col items-center justify-end pb-2 bg-transparent border-none cursor-pointer"
							>
								{/* icon in-bar disembunyikan saat aktif (sudah tampil di bola) */}
								<span
									className="mb-1 transition-opacity duration-200"
									style={{ opacity: isActive ? 0 : 1 }}
								>
									{Icon && <Icon size={20} className="text-slate-400" />}
								</span>
								<span
									className={`text-[10px] font-semibold truncate max-w-full transition-colors ${
										isActive ? "text-white" : "text-slate-400"
									}`}
								>
									{item.label}
								</span>
								{item.badge > 0 && (
									<span className="absolute top-1 right-[22%] flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
										{item.badge > 9 ? "9+" : item.badge}
									</span>
								)}
							</button>
						);
					})}
				</div>
			</div>
		</nav>
	);
};

export default LiquidBottomNav;
