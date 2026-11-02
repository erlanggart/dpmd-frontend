import { useEffect, useMemo, useRef } from "react";
import { posisi } from "../jelajahStore";
import { AIR, AREA, GEDUNG, JENIS_AREA, JENIS_JALAN, LABEL, SUDUT_UTARA } from "../scene/kawasanData";
import { JALAN_TAMPIL } from "../scene/kawasanBantu";

// Peta mini kawasan Pemda saat pengunjung berada di luar halaman kantor. Sumbunya sama
// dengan denah mini kantor (x ke kanan, z ke bawah: jalan depan kantor di bawah),
// jendela pandang ikut bergeser bersama pemain.
const LEBAR = 110;
const TINGGI = 150;

const garis = (f, tutup) => {
	let d = "";
	for (let i = 0; i < f.length; i += 2) d += `${i ? "L" : "M"}${f[i]} ${f[i + 1]}`;
	return tutup ? `${d}Z` : d;
};

const WARNA_AREA = { taman: "#9cc77a", lapangan: "#7fb85f", stadion: "#cf7a5f", plaza: "#e4ddd0", parkir: "#cfccc4", lapanganKeras: "#79aea9" };
const WARNA_JALAN = { utama: "#ffffff", sedang: "#ffffff", kecil: "#f4f1ea", gang: "#ece8df", setapak: "#e8e1d2" };

// Arah utara di peta: (x, z) = (-sin θ, cos θ) → derajat putaran dari "atas" SVG.
const UTARA = (Math.atan2(-Math.sin(SUDUT_UTARA), -Math.cos(SUDUT_UTARA)) * 180) / Math.PI;

export default function MinimapKawasan({ className = "" }) {
	const svg = useRef(null);
	const penanda = useRef(null);

	const peta = useMemo(
		() => ({
			gedung: GEDUNG.map(([, , f]) => garis(f, true)).join(""),
			air: AIR.map((f) => garis(f, true)).join(""),
			area: AREA.map(([j, f]) => ({ d: garis(f, true), w: WARNA_AREA[JENIS_AREA[j]] })),
			jalan: JALAN_TAMPIL.map(([j, lebar, f]) => ({ d: garis(f, false), w: WARNA_JALAN[JENIS_JALAN[j]], lebar })),
			label: LABEL.map(([teks, x, z]) => ({ teks, x, z })),
		}),
		[],
	);

	useEffect(() => {
		let id;
		let akhir = null;
		const putar = () => {
			const { x, z } = posisi;
			if (!akhir || Math.hypot(akhir.x - x, akhir.z - z) > 0.4) {
				svg.current?.setAttribute("viewBox", `${x - LEBAR / 2} ${z - TINGGI / 2} ${LEBAR} ${TINGGI}`);
				akhir = { x, z };
			}
			penanda.current?.setAttribute("transform", `translate(${x} ${z}) rotate(${(-posisi.rot * 180) / Math.PI}) scale(2.2)`);
			id = requestAnimationFrame(putar);
		};
		id = requestAnimationFrame(putar);
		return () => cancelAnimationFrame(id);
	}, []);

	return (
		<div className={`rounded-2xl bg-white/90 p-2 shadow-lg ring-1 ring-black/5 backdrop-blur ${className}`}>
			<p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Kawasan Pemda</p>
			<div className="relative overflow-hidden rounded-lg">
				<svg ref={svg} viewBox={`${-LEBAR / 2} ${-TINGGI / 2} ${LEBAR} ${TINGGI}`} className="block h-auto w-full bg-[#b5cc94]" role="img" aria-label="Peta mini kawasan perkantoran Pemda Kabupaten Bogor">
					{peta.area.map((a, i) => (
						<path key={i} d={a.d} fill={a.w} />
					))}
					<path d={peta.air} fill="#6fb2dd" />
					{peta.jalan.map((j, i) => (
						<path key={i} d={j.d} fill="none" stroke={j.w} strokeWidth={j.lebar} strokeLinecap="round" strokeLinejoin="round" />
					))}
					{/* jalan & kantor DPMD buatan tangan (tidak ada di data kawasan) */}
					<rect x={-60} y={31.6} width={120} height={8} fill="#ffffff" />
					<rect x={-34} y={-22} width={68} height={53} fill="#ddd3bf" />
					<path d={peta.gedung} fill="#ece6d8" stroke="#a39b8c" strokeWidth={0.4} />
					<rect x={-15} y={-13} width={30} height={25} fill="#f0a774" stroke="#c2622d" strokeWidth={0.5} />
					{/* toko & warung di seberang jalan */}
					<rect x={10} y={47} width={12} height={9} fill="#dc2626" stroke="#7f1d1d" strokeWidth={0.5} />
					<text x={16} y={52} textAnchor="middle" dominantBaseline="middle" fontSize={3} fontWeight={800} fill="#ffffff">
						Koperasi
					</text>
					<rect x={-32} y={47} width={10.4} height={8.5} fill="#7c3aed" stroke="#4c1d95" strokeWidth={0.5} />
					<text x={-26.8} y={51.2} textAnchor="middle" dominantBaseline="middle" fontSize={3} fontWeight={800} fill="#ffffff">
						Distro
					</text>
					<rect x={-19.2} y={44.8} width={9.8} height={8} fill="#f97316" stroke="#9a3412" strokeWidth={0.5} />
					<text x={-14.3} y={49} textAnchor="middle" dominantBaseline="middle" fontSize={3} fontWeight={800} fill="#ffffff">
						Mie Ayam
					</text>
					<rect x={-6} y={47} width={12} height={9} fill="#ef4444" stroke="#991b1b" strokeWidth={0.5} />
					<text x={0} y={52} textAnchor="middle" dominantBaseline="middle" fontSize={3.6} fontWeight={800} fill="#ffffff">
						Alfamart
					</text>
					<text x={0} y={0} textAnchor="middle" dominantBaseline="middle" fontSize={6} fontWeight={800} fill="#7c2d12">
						DPMD
					</text>
					{peta.label.map((l, i) => (
						<text
							key={i}
							x={l.x}
							y={l.z}
							textAnchor="middle"
							dominantBaseline="middle"
							fontSize={3.6}
							fontWeight={700}
							fill="#1f2937"
							stroke="#ffffff"
							strokeWidth={0.9}
							paintOrder="stroke"
						>
							{l.teks}
						</text>
					))}
					<g ref={penanda}>
						<circle r={0.9} fill="#e0703a" stroke="#fff" strokeWidth={0.3} />
						<polygon points="0,1.8 -0.65,0.6 0.65,0.6" fill="#e0703a" />
					</g>
				</svg>
				{/* penunjuk arah utara */}
				<div className="pointer-events-none absolute right-1 top-1 flex items-center gap-0.5 rounded-full bg-white/90 py-0.5 pl-1.5 pr-0.5 shadow" title="Arah utara">
					<span className="text-[9px] font-extrabold text-slate-700">U</span>
					<svg viewBox="-10 -10 20 20" className="h-4 w-4" style={{ transform: `rotate(${UTARA}deg)` }}>
						<polygon points="0,-9 5,6 0,2.5 -5,6" fill="#dc2626" />
					</svg>
				</div>
				<p className="pointer-events-none absolute bottom-0.5 left-1 text-[8px] text-slate-600/80">© OpenStreetMap</p>
			</div>
		</div>
	);
}
