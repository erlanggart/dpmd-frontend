import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshStandardMaterial } from "three";
import { posisi } from "../jelajahStore";
import Gabung from "./Gabung";
import Papan from "./Papan";
import Tokoh from "./Tokoh";
import { Mobil, Motor } from "./Parkiran";
import { MODEL_MOBIL, MODEL_MOTOR } from "./modelKendaraan";
import {
	HALAMAN_SHOWROOM as H,
	MEJA_SALES_MOBIL,
	MEJA_SALES_MOTOR,
	PAJANGAN_MOBIL,
	PAJANGAN_MOTOR,
	PINTU_MOBIL,
	PINTU_MOTOR,
	R_PANGGUNG,
	SHOWROOM_MOBIL,
	SHOWROOM_MOTOR,
} from "./showroomData";
import { suasana } from "./suasana";

// Showroom mobil & motor: gedung berdinding kaca, tiap model berputar pelan di atas
// panggung bundar dengan papan harga, sales di meja dekat pintu (tekan E untuk membeli).
// Dipasang di grup kawasan (y relatif tanah).

const BAHAN_KACA = new MeshStandardMaterial({ color: "#bfe3f2", transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.4, depthWrite: false });
const BAHAN_SOROT = new MeshStandardMaterial({ color: "#ffffff", emissive: "#fff7e6", emissiveIntensity: 0.8 });
const RANGKA = "#1f2937";
const rp = (n) => `🪙 ${n.toLocaleString("id-ID")}`;

function Gedung({ s, pintu, nama, sub, aksen, daftarDinding }) {
	const atap = useRef();
	useEffect(() => {
		const m = atap.current;
		if (!daftarDinding || !m) return;
		m.userData.bahan = [m.material];
		const daftar = daftarDinding.current[0];
		daftar.push(m);
		return () => daftar.splice(daftar.indexOf(m), 1);
	}, [daftarDinding]);
	const lx = s.x1 - s.x0;
	const lz = s.z1 - s.z0;
	const cx = (s.x0 + s.x1) / 2;
	const cz = (s.z0 + s.z1) / 2;
	const tiangX = [];
	for (let x = s.x0; x <= s.x1 + 0.01; x += lx / Math.round(lx / 3)) tiangX.push(x);
	const tiangZ = [];
	for (let z = s.z0; z <= s.z1 + 0.01; z += lz / Math.round(lz / 3)) tiangZ.push(z);
	const kacaDepan = [
		[s.x0, pintu.x0],
		[pintu.x1, s.x1],
	];
	return (
		<group>
			<Gabung>
				{/* lantai granit putih */}
				<mesh position={[cx, 0.06, cz]}>
					<boxGeometry args={[lx, 0.12, lz]} />
					<meshStandardMaterial color="#f1f5f9" roughness={0.15} metalness={0.1} />
				</mesh>
				{/* dinding belakang masif berwarna aksen */}
				<mesh position={[cx, s.tinggi / 2, s.z0 + 0.1]}>
					<boxGeometry args={[lx, s.tinggi, 0.2]} />
					<meshStandardMaterial color={aksen} />
				</mesh>
				{/* rangka tiang kaca */}
				{tiangX.flatMap((x) => [s.z1].map((z) => (
					<mesh key={`d${x}`} position={[x, s.tinggi / 2, z]}>
						<boxGeometry args={[0.12, s.tinggi, 0.12]} />
						<meshStandardMaterial color={RANGKA} metalness={0.5} />
					</mesh>
				)))}
				{tiangZ.flatMap((z) =>
					[s.x0, s.x1].map((x) => (
						<mesh key={`s${x}:${z}`} position={[x, s.tinggi / 2, z]}>
							<boxGeometry args={[0.12, s.tinggi, 0.12]} />
							<meshStandardMaterial color={RANGKA} metalness={0.5} />
						</mesh>
					)),
				)}
				{/* kanopi pintu */}
				<mesh position={[cx, s.tinggi - 0.2, s.z1 + 0.8]}>
					<boxGeometry args={[pintu.x1 - pintu.x0 + 2, 0.12, 1.6]} />
					<meshStandardMaterial color={RANGKA} metalness={0.5} />
				</mesh>
			</Gabung>
			{/* atap: dipudarkan saat menghalangi kamera */}
			<mesh ref={atap} position={[cx, s.tinggi + 0.1, cz]}>
				<boxGeometry args={[lx + 0.6, 0.2, lz + 0.6]} />
				<meshStandardMaterial color="#e5e7eb" transparent opacity={1} />
			</mesh>
			{/* dinding kaca */}
			{[s.x0, s.x1].map((x) => (
				<mesh key={x} position={[x, s.tinggi / 2, cz]} material={BAHAN_KACA}>
					<boxGeometry args={[0.04, s.tinggi, lz]} />
				</mesh>
			))}
			{kacaDepan.map(([a, b]) => (
				<mesh key={a} position={[(a + b) / 2, s.tinggi / 2, s.z1]} material={BAHAN_KACA}>
					<boxGeometry args={[b - a, s.tinggi, 0.04]} />
				</mesh>
			))}
			{/* lampu sorot plafon */}
			{tiangX.slice(1, -1).flatMap((x) =>
				tiangZ.slice(1, -1).map((z) => (
					<mesh key={`l${x}:${z}`} position={[x, s.tinggi - 0.05, z]} material={BAHAN_SOROT}>
						<boxGeometry args={[0.8, 0.04, 0.8]} />
					</mesh>
				)),
			)}
			<Papan
				posisi={[cx, s.tinggi - 0.9, s.z1 + 0.08]}
				lebar={Math.min(lx - 1, 9)}
				tinggi={1.0}
				latar="#0f172a"
				aksen={aksen}
				diterangi
				baris={[
					{ teks: nama, ukuran: 0.34, tebal: true, warna: "#f8fafc", y: 0.42 },
					{ teks: sub, ukuran: 0.13, warna: "#cbd5e1", y: 0.76 },
				]}
			/>
		</group>
	);
}

// Satu pajangan: panggung bundar berputar + model + papan nama & harga.
function Pajangan({ p, model, jenis }) {
	const k = useMemo(() => ({ id: `pajang-${jenis}-${p.i}`, jenis, model: model.id, warna: model.warna[0], x: 0, z: 0, rot: p.i * 0.9, laju: 0, setir: 0, pintu: 0, roda: 0, miring: 0 }), [p.i, jenis, model]);
	const putar = useRef();
	const r = R_PANGGUNG[jenis];
	useFrame((_, dt) => {
		if (Math.abs(posisi.x - p.x) > 60 || Math.abs(posisi.z - p.z) > 60) return;
		k.rot += dt * 0.3;
		if (putar.current) putar.current.rotation.y = k.rot;
	});
	return (
		<group position={[p.x, 0, p.z]}>
			<mesh position-y={0.18}>
				<cylinderGeometry args={[r, r + 0.08, 0.24, 32]} />
				<meshStandardMaterial color="#111827" metalness={0.6} roughness={0.25} />
			</mesh>
			<mesh ref={putar} position-y={0.31}>
				<cylinderGeometry args={[r - 0.12, r - 0.12, 0.02, 32]} />
				<meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.2} />
			</mesh>
			<group position-y={0.32}>{jenis === "mobil" ? <Mobil k={k} /> : <Motor k={k} />}</group>
			<Papan
				posisi={[r * 0.55, 0.65, r + 0.25]}
				lebar={jenis === "mobil" ? 1.7 : 1.25}
				tinggi={0.5}
				latar="#f8fafc"
				aksen="#0ea5e9"
				bingkai={RANGKA}
				baris={[
					{ teks: `${model.ikon} ${model.nama}`, ukuran: jenis === "mobil" ? 0.12 : 0.1, tebal: true, warna: "#0f172a", y: 0.24 },
					{ teks: rp(model.harga), ukuran: 0.11, tebal: true, warna: "#b45309", y: 0.4 },
				]}
			/>
		</group>
	);
}

const SALES = { seragam: "warga", kulit: "#d9ad85", baju: "#f8fafc", celana: "#1e293b", rambut: "#141010", motif: "jas" };
const SALES_MOTOR = { seragam: "warga", kulit: "#c68d5e", baju: "#0f172a", celana: "#111827", rambut: "#20160f", perempuan: true, jilbab: "#0ea5e9" };

function Meja({ m, penampilan }) {
	return (
		<group position={[m.x, 0, m.z]}>
			<Gabung>
				<mesh position-y={0.55}>
					<boxGeometry args={[m.lx, 1.0, m.lz]} />
					<meshStandardMaterial color="#0f172a" />
				</mesh>
				<mesh position-y={1.07}>
					<boxGeometry args={[m.lx + 0.1, 0.05, m.lz + 0.1]} />
					<meshStandardMaterial color="#e2e8f0" roughness={0.2} />
				</mesh>
				<mesh position={[0.35, 1.25, 0]}>
					<boxGeometry args={[0.45, 0.3, 0.03]} />
					<meshStandardMaterial color="#1e293b" />
				</mesh>
			</Gabung>
			<group position={[0, 0.12, -0.75]}>
				<Tokoh penampilan={penampilan} pose="diam" asal={{ x: m.x, z: m.z - 0.75, rot: 0, lantai: 0 }} />
			</group>
		</group>
	);
}

export default function Showroom({ daftarDinding }) {
	useFrame(() => {
		BAHAN_SOROT.emissiveIntensity = 0.6 + suasana.malam * 1.8;
	});
	return (
		<group name="showroom">
			{/* halaman serah terima berpaving + marka parkir */}
			<Gabung>
				<mesh position={[(H.x0 + H.x1) / 2, 0.02, (H.z0 + H.z1) / 2]}>
					<boxGeometry args={[H.x1 - H.x0, 0.04, H.z1 - H.z0]} />
					<meshStandardMaterial color="#9ca3af" roughness={0.95} />
				</mesh>
				{[54, 58, 62, 66, 74, 76.5, 79, 81.5].map((x) => (
					<mesh key={x} position={[x, 0.045, 14]}>
						<boxGeometry args={[0.1, 0.01, 4.6]} />
						<meshStandardMaterial color="#f8fafc" />
					</mesh>
				))}
			</Gabung>
			<Gedung s={SHOWROOM_MOBIL} pintu={PINTU_MOBIL} nama="SHOWROOM MOBIL" sub="Hatchback · MPV · SUV · Pikap · Angkot · Listrik · Jip" aksen="#1d4ed8" daftarDinding={daftarDinding} />
			<Gedung s={SHOWROOM_MOTOR} pintu={PINTU_MOTOR} nama="SHOWROOM MOTOR" sub="Matik · Bebek · Sport · Trail · Retro · Listrik" aksen="#dc2626" daftarDinding={daftarDinding} />
			{PAJANGAN_MOBIL.map((p) => MODEL_MOBIL[p.i] && <Pajangan key={`m${p.i}`} p={p} model={MODEL_MOBIL[p.i]} jenis="mobil" />)}
			{PAJANGAN_MOTOR.map((p) => MODEL_MOTOR[p.i] && <Pajangan key={`r${p.i}`} p={p} model={MODEL_MOTOR[p.i]} jenis="motor" />)}
			<Meja m={MEJA_SALES_MOBIL} penampilan={SALES} />
			<Meja m={MEJA_SALES_MOTOR} penampilan={SALES_MOTOR} />
		</group>
	);
}
