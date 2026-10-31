import { useRef } from "react";
import { FiChevronDown, FiChevronLeft, FiChevronRight, FiChevronUp } from "react-icons/fi";
import { kendali } from "../jelajahStore";

const JARI_JARI = 52;
const PANAH = [
	{ arah: "atas", Ikon: FiChevronUp, kelas: "left-1/2 top-1.5", dasar: "translate(-50%, 0)" },
	{ arah: "bawah", Ikon: FiChevronDown, kelas: "bottom-1.5 left-1/2", dasar: "translate(-50%, 0)" },
	{ arah: "kiri", Ikon: FiChevronLeft, kelas: "left-1.5 top-1/2", dasar: "translate(0, -50%)" },
	{ arah: "kanan", Ikon: FiChevronRight, kelas: "right-1.5 top-1/2", dasar: "translate(0, -50%)" },
];

// Analog arah jalan untuk layar sentuh. Panah yang searah dorongan menyala;
// didorong penuh ke tepi = berlari.
export default function Joystick() {
	const kenop = useRef(null);
	const pusat = useRef(null);
	const idPointer = useRef(null);
	const panah = useRef({});

	const nyalakan = (x, y) => {
		const aktif = {
			atas: y > 0.35,
			bawah: y < -0.35,
			kiri: x < -0.35,
			kanan: x > 0.35,
		};
		for (const [k, el] of Object.entries(panah.current)) {
			if (!el) continue;
			el.style.opacity = aktif[k] ? "1" : "0.55";
			el.style.transform = `${el.dataset.dasar} scale(${aktif[k] ? 1.25 : 1})`;
		}
	};

	const atur = (e) => {
		const c = pusat.current;
		let dx = e.clientX - c.x;
		let dy = e.clientY - c.y;
		const d = Math.hypot(dx, dy);
		if (d > JARI_JARI) {
			dx = (dx / d) * JARI_JARI;
			dy = (dy / d) * JARI_JARI;
		}
		kenop.current.style.transform = `translate(${dx}px, ${dy}px)`;
		kendali.arah.x = dx / JARI_JARI;
		kendali.arah.y = -dy / JARI_JARI;
		kendali.lariAnalog = d > JARI_JARI * 1.15;
		nyalakan(kendali.arah.x, kendali.arah.y);
	};

	const lepas = (e) => {
		if (e.pointerId !== idPointer.current) return;
		idPointer.current = null;
		kenop.current.style.transform = "";
		kendali.arah.x = 0;
		kendali.arah.y = 0;
		kendali.lariAnalog = false;
		nyalakan(0, 0);
	};

	return (
		<div
			className="relative h-36 w-36 touch-none select-none rounded-full bg-slate-900/35 shadow-2xl ring-1 ring-white/35 backdrop-blur-md"
			role="presentation"
			onPointerDown={(e) => {
				if (idPointer.current !== null) return;
				idPointer.current = e.pointerId;
				e.currentTarget.setPointerCapture(e.pointerId);
				const r = e.currentTarget.getBoundingClientRect();
				pusat.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
				atur(e);
			}}
			onPointerMove={(e) => e.pointerId === idPointer.current && atur(e)}
			onPointerUp={lepas}
			onPointerCancel={lepas}
		>
			<div className="pointer-events-none absolute inset-5 rounded-full border border-dashed border-white/30" />
			{PANAH.map(({ arah, Ikon, kelas, dasar }) => (
				<span
					key={arah}
					ref={(el) => {
						if (el) {
							el.dataset.dasar = dasar;
							panah.current[arah] = el;
						}
					}}
					className={`pointer-events-none absolute text-white opacity-55 transition-all duration-100 ${kelas}`}
					style={{ transform: dasar }}
				>
					<Ikon className="h-6 w-6 drop-shadow" />
				</span>
			))}
			<div
				ref={kenop}
				className="pointer-events-none absolute left-1/2 top-1/2 -ml-8 -mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-b from-white to-slate-200 shadow-xl ring-2 ring-white/70 transition-transform duration-75"
			>
				<div className="h-5 w-5 rounded-full bg-[rgb(var(--color-primary))]/80" />
			</div>
		</div>
	);
}
