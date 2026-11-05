import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, ConeGeometry, Float32BufferAttribute, IcosahedronGeometry, Matrix4, MeshLambertMaterial } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { SUDUT_UTARA } from "./kawasanData";
import { suasana } from "./suasana";

// Hiasan langit kawasan kantor: awan berhembus pelan (satu InstancedMesh) dan gunung di
// cakrawala (satu mesh gabungan). Keduanya mengikuti kamera sehingga tak pernah terkejar,
// tanpa tekstur dan bayangan: total dua draw call. Dunia kecamatan punya langit sendiri.

const KOTAK = 560; // sisi kotak awan di sekeliling kamera (±280 m)
const TEPI_PUDAR = 70;
const N_GUMPAL = 24;
const N_BOLA = 6;
const KECEPATAN = 1.2; // m/dtk
const ARAH = [0.94, 0.34];
const AWAN_HUJAN = new Color("#64748b");
const AWAN_MALAM = new Color("#334155");
const GUNUNG_SIANG = new Color("#ffffff");
const GUNUNG_HUJAN = new Color("#a3b3c2");
const GUNUNG_MALAM = new Color("#27324a");
const WARNA_KAKI = new Color("#c3d8e4"); // menyatu dengan kabut cakrawala
const WARNA_PUNCAK = new Color("#6d8ca6");
const JANGKAU = 395; // kamera kantor far=400: semua titik gunung harus di dalamnya

// pengacak berbiji tetap: awan & gunung sama di semua tamu
function acakBiji(biji) {
	let s = biji >>> 0;
	return () => {
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
const bungkus = (v) => ((((v + KOTAK / 2) % KOTAK) + KOTAK) % KOTAK) - KOTAK / 2;

function Awan() {
	const ref = useRef();
	const sisa = useRef(1);
	const bantu = useMemo(() => ({ m: new Matrix4(), w: new Color() }), []);
	const gumpal = useMemo(() => {
		const r = acakBiji(20241105);
		return Array.from({ length: N_GUMPAL }, () => {
			const lebar = 35 + r() * 45;
			return {
				x: (r() - 0.5) * KOTAK,
				z: (r() - 0.5) * KOTAK,
				// cukup rendah supaya masuk layar pada sudut kamera biasa yang menunduk
				y: 55 + r() * 35,
				bola: Array.from({ length: N_BOLA }, () => {
					const jari = lebar * (0.18 + r() * 0.12);
					return { dx: (r() - 0.5) * lebar * 0.8, dy: (r() - 0.3) * jari * 0.5, dz: (r() - 0.5) * lebar * 0.4, sx: jari, sy: jari * (0.4 + r() * 0.1), sz: jari * 0.85 };
				}),
			};
		});
	}, []);
	// emisif mengangkat sisi bayangan: tanpa ini awan tampak kelabu seperti batu
	const bahan = useMemo(() => new MeshLambertMaterial({ emissiveIntensity: 0.6, fog: false }), []);
	const geo = useMemo(() => new IcosahedronGeometry(1, 1), []);
	useLayoutEffect(() => () => (bahan.dispose(), geo.dispose()), [bahan, geo]);

	useFrame(({ camera, clock }, dt) => {
		// 5× per detik cukup untuk gerak sepelan ini
		sisa.current += dt;
		if (sisa.current < 0.2 || !ref.current) return;
		sisa.current = 0;
		const { m, w } = bantu;
		const t = clock.elapsedTime * KECEPATAN;
		const cx = camera.position.x;
		const cz = camera.position.z;
		let i = 0;
		for (const g of gumpal) {
			const x = cx + bungkus(g.x + ARAH[0] * t - cx);
			const z = cz + bungkus(g.z + ARAH[1] * t - cz);
			// mengecil di tepi kotak, supaya tidak muncul mendadak saat melingkar ke sisi seberang
			const k = Math.max(0.001, Math.min(1, (KOTAK / 2 - Math.max(Math.abs(x - cx), Math.abs(z - cz))) / TEPI_PUDAR));
			for (const b of g.bola) {
				m.makeScale(b.sx * k, b.sy * k, b.sz * k).setPosition(x + b.dx * k, g.y + b.dy * k, z + b.dz * k);
				ref.current.setMatrixAt(i++, m);
			}
		}
		ref.current.instanceMatrix.needsUpdate = true;
		w.set("#ffffff").lerp(AWAN_HUJAN, suasana.hujan).lerp(AWAN_MALAM, suasana.malam);
		bahan.color.copy(w);
		bahan.emissive.copy(w);
	});

	return <instancedMesh ref={ref} args={[geo, bahan, N_GUMPAL * N_BOLA]} frustumCulled={false} />;
}

// Arah (sin a, cos a) di adegan; selaras dengan arahPeta di ui/MinimapKabupaten.jsx. Sudut
// berkurang searah jarum jam pada kompas.
const UTARA = -SUDUT_UTARA;
const SELATAN = UTARA + Math.PI;

function daftarGunung() {
	const r = acakBiji(1710);
	const hasil = [
		{ sudut: SELATAN - 0.6, tinggi: 66, jari: 100 }, // Gunung Salak, barat daya
		{ sudut: SELATAN + 0.52, tinggi: 72, jari: 100 }, // Gede-Pangrango, tenggara
	];
	// perbukitan selatan, lalu bukit rendah jauh di sisi lain supaya cakrawala tidak polos
	for (let i = 0; i < 9; i++) hasil.push({ sudut: SELATAN - 1.75 + (i / 8) * 3.5 + (r() - 0.5) * 0.2, tinggi: 18 + r() * 18, jari: 55 + r() * 30 });
	for (let i = 0; i < 7; i++) hasil.push({ sudut: UTARA - 1.2 + (i / 6) * 2.4 + (r() - 0.5) * 0.2, tinggi: 7 + r() * 8, jari: 40 + r() * 25 });
	return hasil.map((g) => ({ ...g, jarak: JANGKAU - g.jari - r() * 15 }));
}

function Gunung() {
	const ref = useRef();
	// Latar seperti langit: digambar paling dulu dan tanpa depth, jadi kakinya yang lebar tak
	// pernah menutupi gedung walau letaknya lebih dekat daripada gedung itu.
	const bahan = useMemo(() => new MeshLambertMaterial({ flatShading: true, vertexColors: true, fog: false, depthTest: false, depthWrite: false }), []);
	const geo = useMemo(() => {
		const r = acakBiji(4821);
		const w = new Color();
		const bagian = daftarGunung().map((g) => {
			const kerucut = new ConeGeometry(g.jari, g.tinggi, 9, 3, true);
			const pos = kerucut.attributes.position;
			const warna = [];
			for (let i = 0; i < pos.count; i++) {
				const u = pos.getY(i) / g.tinggi + 0.5; // 0 di kaki, 1 di puncak
				// lereng tidak rata; hanya bergeser ke samping supaya kaki tetap di tanah & puncak tetap satu
				const geser = 1 + (r() - 0.5) * 0.3;
				pos.setX(i, pos.getX(i) * geser);
				pos.setZ(i, pos.getZ(i) * geser);
				w.copy(WARNA_KAKI).lerp(WARNA_PUNCAK, Math.min(1, u * 1.5));
				warna.push(w.r, w.g, w.b);
			}
			kerucut.setAttribute("color", new Float32BufferAttribute(warna, 3));
			// sambungan kerucut (+z setempat) dihadapkan menjauhi kamera, supaya celahnya tak terlihat
			kerucut.rotateY(g.sudut);
			kerucut.translate(Math.sin(g.sudut) * g.jarak, -6 + g.tinggi / 2, Math.cos(g.sudut) * g.jarak);
			return kerucut;
		});
		const hasil = mergeGeometries(bagian);
		bagian.forEach((b) => b.dispose());
		return hasil;
	}, []);
	useLayoutEffect(() => () => (bahan.dispose(), geo.dispose()), [bahan, geo]);

	useFrame(({ camera }) => {
		if (!ref.current) return;
		ref.current.position.set(camera.position.x, 0, camera.position.z);
		bahan.color.copy(GUNUNG_SIANG).lerp(GUNUNG_HUJAN, suasana.hujan).lerp(GUNUNG_MALAM, suasana.malam);
	});

	return <mesh ref={ref} geometry={geo} material={bahan} frustumCulled={false} renderOrder={-1} />;
}

export default function Langit() {
	return (
		<>
			<Awan />
			<Gunung />
		</>
	);
}
