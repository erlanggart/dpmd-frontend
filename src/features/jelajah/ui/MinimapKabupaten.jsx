import { useEffect, useMemo, useRef, useState } from "react";
import { useGeoWilayah } from "../../../components/landingpage/petaWilayah";
import { posisi } from "../jelajahStore";
import { SUDUT_UTARA } from "../scene/kawasanData";

// Peta mini Kabupaten Bogor saat pengunjung di luar gedung: batas kecamatan & desa asli,
// utara di atas, diperbesar sedang dan berpusat pada posisi pemain.

// Kebalikan proyeksi scripts/jelajah-kawasan.mjs: koordinat adegan → meter timur/utara
// dari titik presensi kantor (ACUAN di skrip itu).
const ACUAN = { lat: -6.47553948391432, lng: 106.8276556221009 };
const GESER_X = 22;
const GESER_Z = 47;
const M_LAT = 110574;
const M_LNG = 111320 * Math.cos((ACUAN.lat * Math.PI) / 180);
const COS = Math.cos(SUDUT_UTARA);
const SIN = Math.sin(SUDUT_UTARA);
const arahPeta = (dx, dz) => [COS * -dx - SIN * dz, -(SIN * -dx + COS * dz)];
const adeganKePeta =(x, z) => arahPeta(x - GESER_X, z - GESER_Z);
const lngLatKePeta = ([lng, lat]) => [(lng - ACUAN.lng) * M_LNG, -(lat - ACUAN.lat) * M_LAT];

// Jendela pandang "zoom sedang" (meter): sekitar 3–4 kecamatan
const LEBAR = 13000;
const TINGGI = 15000;
// Kawasan jelajah hanya ±3 km dari kantor: wilayah lebih jauh dari ini tak pernah terlihat
const JANGKAU = 20000;
const TEKS = 720;

const titikDekat = (t) => Math.abs(t[0]) < JANGKAU && Math.abs(t[1]) < JANGKAU;

function rangkai(poli) {
	const titik = poli.flatMap((p) => p.map((c) => c.map(lngLatKePeta)));
	if (!titik.some((c) => c.some(titikDekat))) return null;
	return { d: titik.map((c) => `M${c.map((t) => `${Math.round(t[0])} ${Math.round(t[1])}`).join("L")}Z`).join(""), titik };
}

function pusatCincin(c) {
	let a = 0, cx = 0, cy = 0;
	for (let i = 0, j = c.length - 1; i < c.length; j = i++) {
		const f = c[j][0] * c[i][1] - c[i][0] * c[j][1];
		a += f;
		cx += (c[j][0] + c[i][0]) * f;
		cy += (c[j][1] + c[i][1]) * f;
	}
	return { x: cx / (3 * a), y: cy / (3 * a), luas: Math.abs(a) };
}

function dalamCincin([x, y], c) {
	let ya = false;
	for (let i = 0, j = c.length - 1; i < c.length; j = i++) {
		if (c[i][1] > y !== c[j][1] > y && x < ((c[j][0] - c[i][0]) * (y - c[i][1])) / (c[j][1] - c[i][1]) + c[i][0]) ya = !ya;
	}
	return ya;
}

export default function MinimapKabupaten({ className = "", onPeta, perhatian = 0 }) {
	const geo = useGeoWilayah();
	const svg = useRef(null);
	const penanda = useRef(null);
	const [kecamatanKini, setKecamatanKini] = useState(null);

	const peta = useMemo(() => {
		if (!geo) return null;
		const kecamatan = geo.kecamatan.flatMap((k) => {
			const r = rangkai(k.poli);
			if (!r) return [];
			const pusat = r.titik.map(pusatCincin).sort((a, b) => b.luas - a.luas)[0];
			return [{ nama: k.nama, d: r.d, titik: r.titik, pusat }];
		});
		const desa = geo.desa.map((d) => rangkai(d.poli)?.d || "").join("");
		return { kecamatan, desa };
	}, [geo]);

	useEffect(() => {
		let id;
		let akhir = null;
		const putar = () => {
			const [x, y] = adeganKePeta(posisi.x, posisi.z);
			if (!akhir || Math.hypot(akhir[0] - x, akhir[1] - y) > 15) {
				svg.current?.setAttribute("viewBox", `${x - LEBAR / 2} ${y - TINGGI / 2} ${LEBAR} ${TINGGI}`);
				if (peta) setKecamatanKini(peta.kecamatan.find((k) => k.titik.some((c) => dalamCincin([x, y], c)))?.nama ?? null);
				akhir = [x, y];
			}
			const [ax, ay] = arahPeta(Math.sin(posisi.rot), Math.cos(posisi.rot));
			penanda.current?.setAttribute("transform", `translate(${x} ${y}) rotate(${(Math.atan2(ax, -ay) * 180) / Math.PI})`);
			id = requestAnimationFrame(putar);
		};
		id = requestAnimationFrame(putar);
		return () => cancelAnimationFrame(id);
	}, [peta]);

	return (
		<button type="button" onClick={onPeta} title="Buka peta kecamatan" aria-label={`Buka peta kecamatan${perhatian > 0 ? `, ${perhatian} perlu perhatian` : ""}`} className={`relative block w-full cursor-pointer rounded-2xl bg-white/90 p-1.5 text-left shadow-lg ring-1 ring-black/5 backdrop-blur hover:ring-2 hover:ring-slate-400 sm:p-2 ${className}`}>
			{perhatian > 0 && <span className="absolute -right-1 -top-1 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold leading-none text-white">{perhatian}</span>}
			<p className="mb-1 truncate text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">{kecamatanKini ? `Kec. ${kecamatanKini}` : "Kabupaten Bogor"}</p>
			<div className="relative overflow-hidden rounded-lg">
				<svg ref={svg} viewBox={`${-LEBAR / 2} ${-TINGGI / 2} ${LEBAR} ${TINGGI}`} className="block h-auto w-full bg-slate-200" role="img" aria-label={`Peta mini Kabupaten Bogor${kecamatanKini ? `, posisi Anda di Kecamatan ${kecamatanKini}` : ""}`}>
					{peta?.kecamatan.map((k) => (
						<path key={k.nama} d={k.d} fill={k.nama === kecamatanKini ? "#f7dfa8" : "#bcd8a0"} fillRule="evenodd" />
					))}
					{peta && <path d={peta.desa} fill="none" stroke="#ffffff" strokeOpacity={0.55} strokeWidth={35} />}
					{peta?.kecamatan.map((k) => (
						<path key={k.nama} d={k.d} fill="none" stroke="#4d7c5a" strokeWidth={80} strokeLinejoin="round" />
					))}
					{peta?.kecamatan.map((k) => (
						<text key={k.nama} x={k.pusat.x} y={k.pusat.y} textAnchor="middle" dominantBaseline="middle" fontSize={TEKS} fontWeight={800} fill="#1f2937" stroke="#ffffff" strokeWidth={170} paintOrder="stroke">
							{k.nama}
						</text>
					))}
					<g ref={penanda}>
						<circle r={330} fill="#e0703a" stroke="#ffffff" strokeWidth={110} />
						<polygon points="0,-720 -270,-360 270,-360" fill="#e0703a" stroke="#ffffff" strokeWidth={70} strokeLinejoin="round" />
					</g>
				</svg>
				{/* bangunan di dunia 3D bersumber dari OpenStreetMap: atribusi ODbL tetap wajib tampil */}
				<p className="pointer-events-none absolute bottom-0.5 left-1 text-[8px] text-slate-600/80">© OpenStreetMap</p>
			</div>
		</button>
	);
}
