import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, ConeGeometry, Float32BufferAttribute } from "three";
import { posisi } from "../jelajahStore";
import { pancing } from "../pancing";
import { dermagaDi, diSitu } from "./situ";

// Payung: titik asal di genggaman, batang naik ke +y. Kanopi 8 panel berselang warna,
// dibangun sebagai 2 geometri (warna & warna2) berlapis dua sisi di dalam geometrinya
// sendiri, jadi bahannya polos satu sisi dan aman dibungkus <Gabung>.

// sudut lengan pemain saat memegang payung (dipakai Tokoh.jsx)
export const SUDUT_BAHU_PAYUNG = -0.7;
export const SUDUT_SIKU_PAYUNG = -1.1;

const R = 0.85;
const TINGGI_KANOPI = 0.28;
const PANEL = 8;

// kubah dari kerucut 8 sisi; paritas 0/1 memilih panel selang-seling
function bangunKanopi(paritas) {
	const k = new ConeGeometry(R, 0.3, PANEL, 3, true).toNonIndexed();
	const p = k.attributes.position;
	for (let i = 0; i < p.count; i++) {
		const t = Math.hypot(p.getX(i), p.getZ(i)) / R;
		p.setY(i, TINGGI_KANOPI * (1 - t * t));
	}
	const keluar = [];
	for (let i = 0; i < p.count; i += 3) {
		const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3;
		const cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
		const sudut = (Math.atan2(cx, cz) + Math.PI * 2) % (Math.PI * 2);
		if (Math.floor(sudut / ((Math.PI * 2) / PANEL)) % 2 !== paritas) continue;
		const a = [0, 1, 2].map((n) => [p.getX(i + n), p.getY(i + n), p.getZ(i + n)]);
		keluar.push(...a[0], ...a[1], ...a[2]); // sisi luar
		keluar.push(...a[0], ...a[2], ...a[1]); // sisi dalam (urutan dibalik)
	}
	k.dispose();
	const g = new BufferGeometry();
	g.setAttribute("position", new Float32BufferAttribute(keluar, 3));
	g.computeVertexNormals();
	return g;
}
const KANOPI = [bangunKanopi(0), bangunKanopi(1)];

export default function ModelPayung({ warna = "#dc2626", warna2 = "#f8fafc", kanopi }) {
	return (
		<group>
			{/* gagang melengkung bentuk J */}
			<mesh position={[0, -0.06, 0]}>
				<cylinderGeometry args={[0.018, 0.018, 0.12, 8]} />
				<meshStandardMaterial color="#5b3a1e" roughness={0.8} />
			</mesh>
			<mesh position={[0.04, -0.12, 0]} rotation-z={Math.PI}>
				<torusGeometry args={[0.04, 0.018, 6, 10, Math.PI]} />
				<meshStandardMaterial color="#5b3a1e" roughness={0.8} />
			</mesh>
			{/* batang logam & pucuk */}
			<mesh position={[0, 0.55, 0]}>
				<cylinderGeometry args={[0.012, 0.012, 1.1, 6]} />
				<meshStandardMaterial color="#9ca3af" metalness={0.6} roughness={0.4} />
			</mesh>
			<mesh position={[0, 1.13, 0]}>
				<coneGeometry args={[0.014, 0.08, 6]} />
				<meshStandardMaterial color="#9ca3af" metalness={0.6} roughness={0.4} />
			</mesh>
			<group ref={kanopi} position-y={0.82}>
				<mesh geometry={KANOPI[0]}>
					<meshStandardMaterial color={warna} flatShading roughness={0.7} />
				</mesh>
				<mesh geometry={KANOPI[1]}>
					<meshStandardMaterial color={warna2} flatShading roughness={0.7} />
				</mesh>
			</group>
		</group>
	);
}

// Payung di tangan pemain: terbuka bertahap sesuai gerak.current.payung (0 tutup … 1 buka).
// Diletakkan di `alat` Tokoh; rotasi membatalkan tekukan lengan dan memiringkan batang ke kepala.
export function PayungTangan({ gerak }) {
	const grup = useRef();
	const kanopi = useRef();
	useFrame(() => {
		const g = gerak.current;
		const p = g.payung ?? 0;
		grup.current.visible = p > 0.01 && !g.isyarat;
		const s = 0.12 + 0.88 * p;
		kanopi.current.scale.set(s, 1, s);
	});
	return (
		<group ref={grup} rotation={[1.43, 0, 0.17]} visible={false}>
			<ModelPayung kanopi={kanopi} />
		</group>
	);
}

// Jarak tiang dari pemancing, sisi kiri lebih dulu: kamera adu tarik bergeser ke kanan, jadi
// kanopi tidak menutupi joran (penanda tegangan). Perahu terlalu sempit: tiang rapat ke pemain.
const JARAK_TANCAP = [1.25, 0.8, -1.25];
const JARAK_PERAHU = 0.5;
function jarakTancap({ x, z, rot }) {
	for (const j of JARAK_TANCAP) {
		const wx = x + Math.cos(rot) * j;
		const wz = z - Math.sin(rot) * j;
		if (!diSitu(wx, wz) || dermagaDi(wx, wz, 0.15)) return j;
	}
	return JARAK_PERAHU;
}

// Saat mancing kedua tangan di joran: payung ditancap di samping pemain dan diam di tempat
// walau badan berputar mengikuti bidikan. Diperbesar supaya kanopinya setinggi di atas kepala.
export function PayungTancap({ gerak }) {
	const grup = useRef();
	const kanopi = useRef();
	const tancap = useRef({ asal: null, j: 0 });
	useFrame(() => {
		const g = gerak.current;
		const p = g.payung ?? 0;
		const tampak = p > 0.01 && !!g.gayaPancing;
		grup.current.visible = tampak;
		if (!tampak) return;
		const t = tancap.current;
		const { asal } = pancing;
		if (t.asal !== asal) {
			t.asal = asal;
			t.j = jarakTancap(asal);
		}
		grup.current.position.set(asal.x + Math.cos(asal.rot) * t.j, posisi.y, asal.z - Math.sin(asal.rot) * t.j);
		grup.current.rotation.set(0, asal.rot, 0.12 * Math.sign(t.j));
		const s = 0.09 + 0.56 * p;
		kanopi.current.scale.set(s, 1, s);
	});
	return (
		<group ref={grup} scale={2} visible={false}>
			<ModelPayung kanopi={kanopi} />
		</group>
	);
}
