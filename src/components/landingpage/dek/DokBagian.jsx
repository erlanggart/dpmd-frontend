import { useLayoutEffect, useRef, useState } from "react";

/*
 * Navbar landing page (pola Simpaskor): pil di tengah atas, penanda aktif satu
 * elemen yang bergeser ke bagian yang sedang tampil, supaya perpindahannya
 * terbaca sebagai satu gerakan. Lebar penanda diukur dari DOM karena panjang
 * label tiap bagian berbeda.
 */
export default function DokBagian({ bagian, aktif, onPilih }) {
	const daftar = useRef(null);
	const item = useRef([]);
	const [sorot, setSorot] = useState(null);

	useLayoutEffect(() => {
		const ukur = () => {
			const el = item.current[aktif];
			if (el) setSorot({ left: el.offsetLeft, width: el.offsetWidth });
		};
		ukur();
		// lebar berubah saat font selesai dimuat atau jendela diubah ukurannya
		const pengamat = new ResizeObserver(ukur);
		if (daftar.current) pengamat.observe(daftar.current);
		return () => pengamat.disconnect();
	}, [aktif, bagian.length]);

	return (
		<nav aria-label="Navigasi bagian halaman">
			<div ref={daftar} className="relative flex items-center gap-0.5 rounded-full border border-[#eef2f7]/10 bg-[#eef2f7]/[0.04] p-1 backdrop-blur-xl">
				{sorot && (
					<span
						aria-hidden
						className="absolute bottom-1 top-1 rounded-full bg-[#e3b23c]"
						style={{
							transform: `translateX(${sorot.left - 4}px)`,
							width: sorot.width,
							left: 4,
							transition: "transform 450ms cubic-bezier(0.33, 1, 0.68, 1), width 450ms cubic-bezier(0.33, 1, 0.68, 1)",
						}}
					/>
				)}
				{bagian.map((b, i) => {
					const Ikon = b.ikon;
					const ini = i === aktif;
					return (
						<button
							key={b.id}
							type="button"
							ref={(el) => { item.current[i] = el; item.current.length = bagian.length; }}
							onClick={() => onPilih(i)}
							aria-current={ini ? "true" : undefined}
							aria-label={b.label}
							title={b.label}
							className={`relative z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-[#e3b23c]/60 ${
								ini ? "text-[#0a1220]" : "text-[#eef2f7]/65 hover:text-[#eef2f7]"
							}`}
						>
							<Ikon className="h-4 w-4 shrink-0" aria-hidden />
							<span className="hidden whitespace-nowrap xl:inline">{b.label}</span>
						</button>
					);
				})}
			</div>
		</nav>
	);
}
