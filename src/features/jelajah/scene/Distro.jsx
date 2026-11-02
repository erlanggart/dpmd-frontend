import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshStandardMaterial } from "three";
import { penampilanAvatar } from "../avatar";
import { posisi } from "../jelajahStore";
import { GAYA, kenakanGaya } from "../lemari";
import Gabung from "./Gabung";
import { BILIK_COBA, DISTRO, MANEKIN, MEJA_DISTRO, bilikDi } from "./layout";
import Papan from "./Papan";
import { usePudar } from "./pudar";
import { suasana } from "./suasana";
import Tokoh from "./Tokoh";

// Toko aksesoris "Distro Gaya" di timur warung mie ayam: etalase kaca, manekin berbusana
// koleksi, rak gantung penuh baju warna-warni, dinding topi, kasir, dan dua bilik ruang coba
// bertirai yang menutup sendiri saat ada yang masuk. Dipasang di grup halaman (y = TANAH).

const BAHAN_KACA = new MeshStandardMaterial({ color: "#c4b5fd", transparent: true, opacity: 0.3, roughness: 0.1, metalness: 0.3 });
const BAHAN_NEON = new MeshStandardMaterial({ color: "#f0abfc", emissive: "#e879f9", emissiveIntensity: 0.6 });
const PRAMUNIAGA = { seragam: "warga", perempuan: true, jilbab: "#7c3aed", kulit: "#d9ad85", baju: "#111827", celana: "#111827", motif: "jaket" };

function Cangkang({ daftarDinding }) {
	const d = DISTRO;
	const lebar = d.x1 - d.x0;
	const dalam = d.z1 - d.z0;
	const cx = (d.x0 + d.x1) / 2;
	const cz = (d.z0 + d.z1) / 2;
	const grup = usePudar(daftarDinding);
	return (
		<group ref={grup}>
			<mesh position={[cx, d.tinggi / 2, d.z1 - 0.1]}>
				<boxGeometry args={[lebar, d.tinggi, 0.2]} />
				<meshStandardMaterial color="#f5f3ff" />
			</mesh>
			{[d.x0 + 0.1, d.x1 - 0.1].map((x) => (
				<mesh key={x} position={[x, d.tinggi / 2, cz]}>
					<boxGeometry args={[0.2, d.tinggi, dalam]} />
					<meshStandardMaterial color="#ede9fe" />
				</mesh>
			))}
			<mesh position={[cx, d.tinggi + 0.12, cz]}>
				<boxGeometry args={[lebar + 0.3, 0.24, dalam + 0.3]} />
				<meshStandardMaterial color="#3f3f46" />
			</mesh>
			<mesh position={[cx, 3.3, d.z0 + 0.02]}>
				<boxGeometry args={[lebar, 1.0, 0.24]} />
				<meshStandardMaterial color="#18181b" />
			</mesh>
		</group>
	);
}

// Tirai bilik: tergeser menutup saat pemain ada di dalam biliknya; ikut dipudarkan bila
// menghalangi kamera (supaya pemain tetap melihat dirinya berganti baju).
function Tirai({ b, i, daftarDinding }) {
	const grup = usePudar(daftarDinding);
	const kain = useRef();
	const tutup = useRef(0);
	const panjang = b.z1 - b.z0;
	useFrame((_, dt) => {
		const di = bilikDi(posisi.x, posisi.z) === i && posisi.y < 0.9;
		tutup.current += ((di ? 1 : 0.15) - tutup.current) * (1 - Math.exp(-5 * dt));
		kain.current.scale.z = tutup.current;
		kain.current.position.z = b.z0 + (panjang * tutup.current) / 2;
	});
	return (
		<group ref={grup}>
			<mesh ref={kain} position={[b.x1, 1.2, b.z0]}>
				<boxGeometry args={[0.04, 2.1, panjang]} />
				<meshStandardMaterial color={i ? "#be185d" : "#6d28d9"} />
			</mesh>
		</group>
	);
}

export default function Distro({ daftarDinding }) {
	const d = DISTRO;
	const lebar = d.x1 - d.x0;
	const dalam = d.z1 - d.z0;
	const cx = (d.x0 + d.x1) / 2;
	const cz = (d.z0 + d.z1) / 2;
	const m = MEJA_DISTRO;
	const manekin = useMemo(
		() => MANEKIN.map((mk, i) => ({ ...mk, penampilan: { ...kenakanGaya(penampilanAvatar({ jk: i === 1 ? "P" : "L", avatar: 0, kulit: 0 }), mk.gaya), kulit: "#e7e5e4", rambut: "#e7e5e4", jilbab: null } })),
		[],
	);
	// baju tergantung di rak belakang: warna dari katalog lemari
	const warnaBaju = useMemo(() => GAYA.b.isi.filter((b) => b.warna).flatMap((b) => [b.warna, b.warna]), []);

	useFrame(() => {
		BAHAN_NEON.emissiveIntensity = 0.6 + suasana.malam * 1.6;
	});

	return (
		<group>
			<Gabung>
				{/* lantai kayu & teras */}
				<mesh position={[cx, 0.03, cz]}>
					<boxGeometry args={[lebar - 0.4, 0.06, dalam - 0.2]} />
					<meshStandardMaterial color="#b08968" />
				</mesh>
				<mesh position={[cx, 0.04, d.z0 - 0.7]}>
					<boxGeometry args={[lebar + 0.4, 0.08, 1.4]} />
					<meshStandardMaterial color="#3f3f46" />
				</mesh>
				{/* bingkai muka */}
				{[d.x0 + 0.12, d.pintu.x0, d.pintu.x1, d.x1 - 0.12].map((x) => (
					<mesh key={x} position={[x, 1.4, d.z0 + 0.05]}>
						<boxGeometry args={[0.18, 2.8, 0.18]} />
						<meshStandardMaterial color="#18181b" />
					</mesh>
				))}
				{/* sekat bilik ruang coba & cermin di dalamnya */}
				{[52.3, 53.92].map((z) => (
					<mesh key={z} position={[(d.x0 + -30.1) / 2, 1.2, z]}>
						<boxGeometry args={[-30.1 - d.x0, 2.4, 0.08]} />
						<meshStandardMaterial color="#f5f5f4" />
					</mesh>
				))}
				{BILIK_COBA.map((b) => (
					<mesh key={b.z0} position={[d.x0 + 0.22, 1.25, (b.z0 + b.z1) / 2]}>
						<boxGeometry args={[0.03, 1.7, 0.8]} />
						<meshStandardMaterial color="#dbeafe" metalness={0.9} roughness={0.05} />
					</mesh>
				))}
				{/* rel tirai */}
				<mesh position={[-30.2, 2.3, (52.3 + d.z1) / 2]}>
					<boxGeometry args={[0.04, 0.04, d.z1 - 52.3]} />
					<meshStandardMaterial color="#a1a1aa" metalness={0.6} />
				</mesh>
				{/* rak gantung di dinding belakang */}
				<mesh position={[-26.25, 1.75, 55.05]}>
					<boxGeometry args={[6.6, 0.04, 0.04]} />
					<meshStandardMaterial color="#d4d4d8" metalness={0.7} />
				</mesh>
				{warnaBaju.map((w, i) => (
					<mesh key={i} position={[-29.3 + i * 0.5, 1.3, 55.0]} rotation-y={0.3}>
						<boxGeometry args={[0.42, 0.75, 0.06]} />
						<meshStandardMaterial color={w} />
					</mesh>
				))}
				{/* papan topi di dinding barat (sisi kasir) */}
				{GAYA.t.isi
					.filter((t) => t.warna)
					.map((t, i) => (
						<mesh key={i} position={[d.x1 - 0.26, 1.4 + (i % 2) * 0.5, 47.9 + Math.floor(i / 2) * 0.55]}>
							<sphereGeometry args={[0.13, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
							<meshStandardMaterial color={t.warna} />
						</mesh>
					))}
				{/* kasir & podium manekin */}
				<mesh position={[(m.x0 + m.x1) / 2, 0.5, (m.z0 + m.z1) / 2]}>
					<boxGeometry args={[m.x1 - m.x0, 1.0, m.z1 - m.z0]} />
					<meshStandardMaterial color="#7c3aed" />
				</mesh>
				{MANEKIN.map((mk) => (
					<mesh key={mk.x + ":" + mk.z} position={[mk.x, 0.08, mk.z]}>
						<cylinderGeometry args={[0.38, 0.4, 0.12, 16]} />
						<meshStandardMaterial color="#e4e4e7" />
					</mesh>
				))}
			</Gabung>

			<Cangkang daftarDinding={daftarDinding} />
			{BILIK_COBA.map((b, i) => (
				<Tirai key={i} b={b} i={i} daftarDinding={daftarDinding} />
			))}
			{manekin.map((mk) => (
				<group key={mk.x + ":" + mk.z} position={[mk.x, 0.14, mk.z]} rotation-y={mk.rot}>
					<Tokoh penampilan={mk.penampilan} pose="diam" bayangan={false} />
				</group>
			))}
			<group position={[-22.25, 0.06, (m.z0 + m.z1) / 2]} rotation-y={-Math.PI / 2}>
				<Tokoh penampilan={PRAMUNIAGA} pose="diam" asal={{ x: -22.25, z: (m.z0 + m.z1) / 2, rot: -Math.PI / 2, lantai: 0 }} />
			</group>

			{/* kaca etalase & pintu */}
			{[
				[d.x0 + 0.12, d.pintu.x0],
				[d.pintu.x1, d.x1 - 0.12],
			].map(([a, b]) => (
				<mesh key={a} position={[(a + b) / 2, 1.4, d.z0 + 0.05]} material={BAHAN_KACA}>
					<boxGeometry args={[b - a - 0.18, 2.6, 0.05]} />
				</mesh>
			))}
			<mesh position={[cx, 3.05, d.z0 - 0.13]} material={BAHAN_NEON}>
				<boxGeometry args={[lebar - 0.6, 0.05, 0.04]} />
			</mesh>
			<Papan posisi={[cx, 3.4, d.z0 - 0.12]} rotasi={Math.PI} lebar={6} tinggi={0.7} latar="#18181b" baris={[{ teks: "DISTRO GAYA", ukuran: 0.42, tebal: true, warna: "#f0abfc", y: 0.42 }, { teks: "topi · baju · celana · sepatu", ukuran: 0.13, warna: "#e4e4e7", y: 0.82 }]} />
			<Papan posisi={[-31, 2.55, 52.3 - 0.06]} rotasi={Math.PI} lebar={1.4} tinggi={0.3} latar="#6d28d9" baris={[{ teks: "🪞 RUANG COBA", ukuran: 0.15, tebal: true, warna: "#ffffff", y: 0.55 }]} />
			<Papan posisi={[(m.x0 + m.x1) / 2, 2.2, m.z0 - 0.05]} rotasi={Math.PI} lebar={0.9} tinggi={0.32} latar="#7c3aed" baris={[{ teks: "KASIR", ukuran: 0.17, tebal: true, warna: "#ffffff", y: 0.52 }]} />
		</group>
	);
}
