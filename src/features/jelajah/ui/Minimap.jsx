import { useEffect, useRef } from "react";
import { AREA_LAIN, LOBI, RUANGAN } from "../kantorConfig";
import { KOTAK_DENAH as BATAS, posisi, useDiKawasan } from "../jelajahStore";
import MinimapKabupaten from "./MinimapKabupaten";

// Denah mini dari atas untuk lantai tempat pemain berada. Posisi pemain diperbarui
// langsung ke atribut SVG lewat requestAnimationFrame, tanpa render ulang React.

const persegi = (r) => ({ x: r.x0, y: r.z0, width: r.x1 - r.x0, height: r.z1 - r.z0 });

// Ruang pendukung yang digambar abu-abu (tidak bisa dituju lewat pindah cepat).
const PENDUKUNG = AREA_LAIN.filter((a) => !["lorong1", "belakang1", "aula2"].includes(a.id));
const LABEL_PENDUKUNG = {
	toilet1: "WC",
	toilet2: "WC",
	pangrango: "PANGRANGO",
	salak: "SALAK",
	mushola: "MUSHOLA",
	arsip: "ARSIP",
	kolam: "KOLAM",
	kadis: "KADIS",
	sekdis: "SEKDIS",
	halimun: "HALIMUN",
	dapur: "DAPUR",
};

export default function Minimap({ area, lantai, dikunjungi, onPilih, onPeta, perhatian = 0, className = "" }) {
	const penanda = useRef(null);
	const kawasan = useDiKawasan(lantai);

	useEffect(() => {
		let id;
		const putar = () => {
			const x = Math.min(BATAS.x0 + BATAS.lebar - 1, Math.max(BATAS.x0 + 1, posisi.x));
			const z = Math.min(BATAS.z0 + BATAS.tinggi - 1, Math.max(BATAS.z0 + 1, posisi.z));
			penanda.current?.setAttribute("transform", `translate(${x} ${z}) rotate(${(-posisi.rot * 180) / Math.PI})`);
			id = requestAnimationFrame(putar);
		};
		id = requestAnimationFrame(putar);
		return () => cancelAnimationFrame(id);
	}, []);

	const ruang = [LOBI, ...RUANGAN].filter((r) => r.lantai === lantai);
	if (kawasan) return <MinimapKabupaten className={className} onPeta={onPeta} perhatian={perhatian} />;

	return (
		<div className={`rounded-2xl bg-white/90 p-2 shadow-lg ring-1 ring-black/5 backdrop-blur ${className}`}>
			{/* isi denah dipakai pindah ruang, jadi popup peta kecamatan dibuka dari judulnya */}
			<button type="button" onClick={onPeta} title="Buka peta kecamatan" className="relative mb-1 block w-full text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800">
				Lantai {lantai + 1} · 🗺️
				{perhatian > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold leading-none text-white">{perhatian}</span>}
			</button>
			<svg
				viewBox={`${BATAS.x0} ${BATAS.z0} ${BATAS.lebar} ${BATAS.tinggi}`}
				className="block h-auto w-full"
				role="img"
				aria-label={`Denah mini lantai ${lantai + 1}. Ketuk ruang bidang untuk pindah ke sana.`}
			>
				<rect x={-15} y={-13} width={30} height={25} fill="#e7e1d4" />
				{lantai === 0 && <rect x={-15} y={12.3} width={30} height={10.7} fill="#e2d3bd" />}
				{PENDUKUNG.filter((a) => a.lantai === lantai).map((a) => (
					<g key={a.id}>
						<rect {...persegi(a.rect)} fill="#cbd5e1" fillOpacity={0.5} stroke="#94a3b8" strokeWidth={0.15} />
						<text
							x={(a.rect.x0 + a.rect.x1) / 2}
							y={(a.rect.z0 + a.rect.z1) / 2}
							textAnchor="middle"
							dominantBaseline="middle"
							fontSize={1.1}
							fill="#475569"
						>
							{LABEL_PENDUKUNG[a.id]}
						</text>
					</g>
				))}
				{ruang.map((r) => {
					const aktif = area === r.id;
					const sudah = dikunjungi.has(r.id);
					return (
						<g key={r.id} onClick={() => onPilih(r.id)} className="cursor-pointer">
							<title>{`Pindah ke ${r.nama}`}</title>
							{[r.rect, r.rect2].filter(Boolean).map((k, i) => (
								<rect
									key={i}
									{...persegi(k)}
									fill={r.warna}
									fillOpacity={aktif ? 0.5 : 0.22}
									stroke={r.warna}
									strokeWidth={aktif ? 0.4 : 0.2}
								/>
							))}
							<text
								x={(r.rect.x0 + r.rect.x1) / 2}
								y={(r.rect.z0 + r.rect.z1) / 2}
								textAnchor="middle"
								dominantBaseline="middle"
								fontSize={1.5}
								fontWeight={700}
								fill="#1f2937"
							>
								{r.labelPeta}
								{sudah ? " ✓" : ""}
							</text>
						</g>
					);
				})}
				<g ref={penanda}>
					<circle r={0.9} fill="#e0703a" stroke="#fff" strokeWidth={0.3} />
					<polygon points="0,1.8 -0.65,0.6 0.65,0.6" fill="#e0703a" />
				</g>
			</svg>
		</div>
	);
}
