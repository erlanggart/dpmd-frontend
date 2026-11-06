import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshStandardMaterial } from "three";
import Tokoh from "../scene/Tokoh";
import { Cangkul } from "../scene/AlatTani";
import { BALE_WARUNG, JALAN_NS, KANDANG_AYAM, MEJA_WARUNG, TATA } from "../scene/kebunDesaData";
import { posWarga, wargaAktif } from "./wargaDesa";
import { pemainWilayah } from "./uiWilayah";
import { desa, malam, useDesa } from "./desaHidup";

/*
 * Kehidupan desa: warga dengan kegiatan masing-masing (menoleh & melambai saat
 * pemain mendekat, berhenti saat diajak ngobrol) serta hewan: kerbau yang
 * membajak, ayam yang kabur bila didekati, kuntul di sawah, kupu-kupu, kawanan
 * burung di langit, dan kucing tidur di bale warung.
 */

const sudutDekat = (dari, ke) => dari + Math.atan2(Math.sin(ke - dari), Math.cos(ke - dari));
const putarKe = (g, tuju, dt, k = 6) => { g.rotation.y += (sudutDekat(g.rotation.y, tuju) - g.rotation.y) * (1 - Math.exp(-k * dt)); };
const jarakPemain = (x, z) => Math.hypot(pemainWilayah.x - x, pemainWilayah.z - z);

const B = {
	kerbau: new MeshStandardMaterial({ color: "#4b4f57", roughness: 0.9 }),
	tanduk: new MeshStandardMaterial({ color: "#d6d3d1", roughness: 0.6 }),
	kayu: new MeshStandardMaterial({ color: "#7c5a35", roughness: 1 }),
	putih: new MeshStandardMaterial({ color: "#f8fafc", roughness: 0.8 }),
	jengger: new MeshStandardMaterial({ color: "#dc2626", roughness: 0.7 }),
	paruh: new MeshStandardMaterial({ color: "#f59e0b", roughness: 0.7 }),
	hitam: new MeshStandardMaterial({ color: "#111827", roughness: 0.6 }),
};

function Kerbau({ langkah }) {
	const kaki = useRef([]);
	const kepala = useRef();
	useFrame(({ clock }) => {
		const t = clock.elapsedTime;
		const v = langkah.current;
		kaki.current.forEach((k, i) => { if (k) k.rotation.x = Math.sin(t * 4 + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * 0.35 * v; });
		if (kepala.current) kepala.current.rotation.x = 0.25 + Math.sin(t * 2) * 0.06;
	});
	return (
		<group>
			<mesh material={B.kerbau} position-y={1.05} castShadow><boxGeometry args={[0.95, 0.85, 1.9]} /></mesh>
			<mesh material={B.kerbau} position={[0, 1.2, -0.55]} castShadow><sphereGeometry args={[0.52, 10, 8]} /></mesh>
			<group ref={kepala} position={[0, 1.2, 1.05]}>
				<mesh material={B.kerbau} position={[0, -0.1, 0.25]} castShadow><boxGeometry args={[0.48, 0.5, 0.62]} /></mesh>
				<mesh material={B.hitam} position={[0, -0.25, 0.58]}><boxGeometry args={[0.36, 0.22, 0.1]} /></mesh>
				{[-1, 1].map((s) => (
					<mesh key={s} material={B.tanduk} position={[s * 0.42, 0.16, 0.05]} rotation={[0, 0, s * -1.2]}><coneGeometry args={[0.07, 0.62, 6]} /></mesh>
				))}
			</group>
			{[[-0.32, 0.65], [0.32, 0.65], [-0.32, -0.65], [0.32, -0.65]].map(([x, z], i) => (
				<group key={i} ref={(r) => (kaki.current[i] = r)} position={[x, 0.68, z]}>
					<mesh material={B.kerbau} position-y={-0.34}><boxGeometry args={[0.2, 0.68, 0.22]} /></mesh>
				</group>
			))}
			<mesh material={B.kerbau} position={[0, 1.05, -1.02]} rotation-x={0.35}><cylinderGeometry args={[0.03, 0.03, 0.7, 4]} /></mesh>
			{/* kuk & bajak kayu di belakang */}
			<mesh material={B.kayu} position={[0, 1.55, 0.7]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.05, 0.05, 1.3, 6]} /></mesh>
			<mesh material={B.kayu} position={[0, 0.85, -1.55]} rotation-x={1.1}><cylinderGeometry args={[0.04, 0.04, 2.6, 5]} /></mesh>
			<mesh material={B.kayu} position={[0, 0.25, -2.35]} rotation-x={-0.5}><boxGeometry args={[0.12, 0.5, 0.35]} /></mesh>
		</group>
	);
}

function Bola({ lingkar }) {
	const ref = useRef();
	useFrame(({ clock }) => {
		const a = clock.elapsedTime * lingkar.laju + 0.7;
		ref.current.position.set(lingkar.x + Math.cos(a) * lingkar.r * 0.9, 0.13 + Math.abs(Math.sin(clock.elapsedTime * 5)) * 0.18, lingkar.z + Math.sin(a) * lingkar.r * 0.9);
		ref.current.rotation.x = clock.elapsedTime * 6;
	});
	return (
		<mesh ref={ref} castShadow>
			<icosahedronGeometry args={[0.13, 1]} />
			<meshStandardMaterial color="#f8fafc" flatShading />
		</mesh>
	);
}

/** Satu warga beserta tingkah lakunya. */
function SatuWarga({ w }) {
	const grup = useRef();
	const gerak = useRef({ laju: 0, fase: 0, isyarat: null, taniU: 0 });
	const keadaan = useRef({ i: 0, tunggu: 0, arah: 1, lambai: 0, sudahLambai: false, x: 0 });
	const langkahKerbau = useRef(0);
	const kerbau = useRef();
	const awal = w.tetap || (w.rute ? { x: w.rute.x0, z: w.rute.z, rot: Math.PI / 2 } : w.titik ? { x: w.titik[0][0], z: w.titik[0][1], rot: 0 } : { x: w.lingkar.x + w.lingkar.r, z: w.lingkar.z, rot: 0 });

	useFrame(({ clock }, dtMentah) => {
		const dt = Math.min(0.05, dtMentah);
		const g = grup.current;
		const p = g.position;
		const gr = gerak.current;
		const s = keadaan.current;
		const t = clock.elapsedTime;
		const pos = posWarga.get(w.id);
		const kini = performance.now();
		const ngobrol = pos.ngobrol > kini;
		const jarak = jarakPemain(p.x, p.z);
		const keArahPemain = Math.atan2(pemainWilayah.x - p.x, pemainWilayah.z - p.z);
		let laju = 0;
		gr.isyarat = null;
		// anak-anak pulang ke rumah saat malam
		if (w.kegiatan === "bola") {
			const pulang = malam() > 0.55;
			g.visible = !pulang;
			if (pulang) { pos.x = 999; return; }
		}

		// melambai sekali tiap kali pemain datang mendekat
		if (jarak < 5 && !s.sudahLambai) { s.sudahLambai = true; s.lambai = 1.6; }
		if (jarak > 8) s.sudahLambai = false;
		if (s.lambai > 0) s.lambai -= dt;

		if (ngobrol || (jarak < 2.6 && w.kegiatan !== "bola" && w.kegiatan !== "bajak")) {
			// berhenti & menghadap pemain
			putarKe(g, keArahPemain, dt);
			if (ngobrol) gr.isyarat = Math.sin(t * 2) > 0.6 ? "lambai" : null;
		} else if (w.kegiatan === "jaga") {
			putarKe(g, jarak < 7 ? keArahPemain : w.tetap.rot, dt, 3);
		} else if (w.kegiatan === "cangkul") {
			gr.isyarat = "cangkul";
			gr.taniU = (t % 1.4) / 1.4;
			putarKe(g, w.tetap.rot, dt, 3);
		} else if (w.kegiatan === "tandur") {
			// tandur berjalan mundur sambil menanam bibit
			const r = w.rute;
			gr.isyarat = "tanam";
			gr.taniU = (t % 1.2) / 1.2;
			p.x -= s.arah * r.laju * dt;
			if (p.x < r.x0) s.arah = -1;
			if (p.x > r.x1) s.arah = 1;
			putarKe(g, s.arah > 0 ? Math.PI / 2 : -Math.PI / 2, dt, 2);
		} else if (w.kegiatan === "bajak") {
			const r = w.rute;
			const tuju = s.arah > 0 ? Math.PI / 2 : -Math.PI / 2;
			putarKe(kerbau.current, tuju, dt, 1.5);
			const lurus = Math.abs(sudutDekat(kerbau.current.rotation.y, tuju) - kerbau.current.rotation.y) < 0.2;
			if (lurus) {
				kerbau.current.position.x += s.arah * r.laju * dt;
				laju = 0.45;
			}
			if (kerbau.current.position.x > r.x1) s.arah = -1;
			if (kerbau.current.position.x < r.x0) s.arah = 1;
			langkahKerbau.current += ((lurus ? 1 : 0.3) - langkahKerbau.current) * dt * 3;
			// petani mengikuti 3,4 m di belakang kerbau, memegang bajak
			const kr = kerbau.current;
			const bx = kr.position.x - Math.sin(kr.rotation.y) * 3.4;
			const bz = kr.position.z - Math.cos(kr.rotation.y) * 3.4;
			p.x += (bx - p.x) * (1 - Math.exp(-4 * dt));
			p.z += (bz - p.z) * (1 - Math.exp(-4 * dt));
			putarKe(g, kr.rotation.y, dt, 3);
			gr.isyarat = "siram"; // lengan terjulur memegang gagang bajak
			laju = Math.max(laju, 0.35);
		} else if (w.kegiatan === "jalan") {
			const [tx, tz, jeda = 0] = w.titik[s.i];
			const dx = tx - p.x, dz = tz - p.z;
			const d = Math.hypot(dx, dz);
			if (s.tunggu > 0) {
				s.tunggu -= dt;
			} else if (d < 0.3) {
				s.tunggu = jeda;
				s.i = (s.i + 1) % w.titik.length;
			} else {
				p.x += (dx / d) * w.laju * dt;
				p.z += (dz / d) * w.laju * dt;
				putarKe(g, Math.atan2(dx, dz), dt, 8);
				laju = 0.6;
			}
		} else if (w.kegiatan === "bola") {
			const L = w.lingkar;
			const a = t * L.laju + L.fase;
			const nx = L.x + Math.cos(a) * L.r, nz = L.z + Math.sin(a) * L.r;
			putarKe(g, Math.atan2(nx - p.x, nz - p.z), dt, 10);
			p.x = nx; p.z = nz;
			laju = 1;
		}
		if (s.lambai > 0 && !gr.isyarat) gr.isyarat = "lambai";

		gr.laju += (laju - gr.laju) * (1 - Math.exp(-8 * dt));
		gr.fase += dt * (laju > 0.8 ? 11 : 7) * gr.laju;
		pos.x = p.x;
		pos.z = p.z;
	});

	return (
		<>
			<group ref={grup} position={[awal.x, 0, awal.z]} rotation-y={awal.rot} scale={w.kecil ? 0.7 : 1}>
				<Tokoh penampilan={w.rupa} pose="jalan" gerak={gerak} alat={w.kegiatan === "cangkul" ? <Cangkul /> : null} />
			</group>
			{w.kegiatan === "bajak" && (
				<group ref={kerbau} position={[awal.x + 3.4, 0, awal.z]} rotation-y={Math.PI / 2}>
					<Kerbau langkah={langkahKerbau} />
				</group>
			)}
			{w.id === "rafi" && <Bola lingkar={w.lingkar} />}
		</>
	);
}

/** Ayam kampung yang mematuk-matuk dan kabur bila pemain mendekat. */
const WARNA_AYAM = ["#b45309", "#f8fafc", "#7c2d12", "#1f2937", "#d97706"];
const WARNA_KUPU = ["#facc15", "#f472b6", "#fb923c", "#f8fafc", "#60a5fa"];

function Ayam({ pusat, n = 8, sebar = 5, warnaAwal = 0 }) {
	const ayam = useMemo(() => Array.from({ length: n }, (_, i) => ({
		x: pusat.x + (Math.random() - 0.5) * sebar * 2, z: pusat.z + (Math.random() - 0.5) * sebar * 2,
		tx: pusat.x, tz: pusat.z, tunggu: Math.random() * 2, kabur: 0, fase: Math.random() * 9,
		bahan: new MeshStandardMaterial({ color: WARNA_AYAM[(i + warnaAwal) % WARNA_AYAM.length], roughness: 0.85 }),
	})), [pusat, n, sebar, warnaAwal]);
	const ref = useRef([]);
	useFrame(({ clock }, dtMentah) => {
		const dt = Math.min(0.05, dtMentah);
		const t = clock.elapsedTime;
		ayam.forEach((a, i) => {
			const g = ref.current[i];
			if (!g) return;
			const jp = jarakPemain(a.x, a.z);
			if (jp < 2.8 && a.kabur <= 0) {
				// kabur menjauhi pemain
				const ax = a.x - pemainWilayah.x, az = a.z - pemainWilayah.z;
				const d = Math.hypot(ax, az) || 1;
				a.tx = a.x + (ax / d) * 5; a.tz = a.z + (az / d) * 5;
				a.kabur = 1.2;
			}
			let v = 0;
			if (a.kabur > 0) { a.kabur -= dt; v = 3.6; }
			else if (a.tunggu > 0) a.tunggu -= dt;
			else v = 0.8;
			const dx = a.tx - a.x, dz = a.tz - a.z;
			const d = Math.hypot(dx, dz);
			if (v && d > 0.15) {
				a.x += (dx / d) * v * dt; a.z += (dz / d) * v * dt;
				g.rotation.y = Math.atan2(dx, dz);
			} else if (v && a.kabur <= 0) {
				a.tunggu = 1 + Math.random() * 3;
				a.tx = pusat.x + (Math.random() - 0.5) * sebar * 2;
				a.tz = pusat.z + (Math.random() - 0.5) * sebar * 2;
			}
			g.position.set(a.x, v > 2 ? Math.abs(Math.sin(t * 18 + a.fase)) * 0.12 : 0, a.z);
			const kepala = g.children[1];
			kepala.rotation.x = v === 0 ? Math.max(0, Math.sin(t * 5 + a.fase)) * 1.1 : 0; // mematuk
		});
	});
	return ayam.map((a, i) => (
		<group key={i} ref={(r) => (ref.current[i] = r)} position={[a.x, 0, a.z]}>
			<group>
				<mesh material={a.bahan} position={[0, 0.24, 0]} scale={[0.8, 0.85, 1.1]} castShadow><sphereGeometry args={[0.16, 8, 6]} /></mesh>
				<mesh material={a.bahan} position={[0, 0.36, -0.17]} rotation-x={-0.6}><coneGeometry args={[0.07, 0.2, 5]} /></mesh>
				{[-0.05, 0.05].map((x) => <mesh key={x} material={B.paruh} position={[x, 0.06, 0]}><boxGeometry args={[0.02, 0.12, 0.02]} /></mesh>)}
			</group>
			<group position={[0, 0.34, 0.12]}>
				<mesh material={a.bahan} position={[0, 0.06, 0.03]}><sphereGeometry args={[0.075, 8, 6]} /></mesh>
				<mesh material={B.jengger} position={[0, 0.14, 0.03]}><boxGeometry args={[0.025, 0.06, 0.08]} /></mesh>
				<mesh material={B.paruh} position={[0, 0.06, 0.11]} rotation-x={Math.PI / 2}><coneGeometry args={[0.025, 0.06, 4]} /></mesh>
			</group>
		</group>
	));
}

/** Kuntul putih berdiri di sawah, sesekali mencari makan. */
function Kuntul({ titik }) {
	const ref = useRef([]);
	useFrame(({ clock }) => {
		const t = clock.elapsedTime;
		titik.forEach((_, i) => {
			const g = ref.current[i];
			if (g) g.children[1].rotation.x = Math.max(0, Math.sin(t * 0.7 + i * 1.9)) ** 6 * 1.4;
		});
	});
	return titik.map(([x, z, ry], i) => (
		<group key={i} ref={(r) => (ref.current[i] = r)} position={[x, 0.1, z]} rotation-y={ry}>
			<mesh material={B.putih} position-y={0.55} scale={[0.7, 0.75, 1.3]} castShadow><sphereGeometry args={[0.2, 8, 6]} /></mesh>
			<group position={[0, 0.65, 0.18]}>
				<mesh material={B.putih} position={[0, 0.18, 0.02]} rotation-x={0.25}><cylinderGeometry args={[0.03, 0.04, 0.4, 5]} /></mesh>
				<mesh material={B.putih} position={[0, 0.4, 0.06]}><sphereGeometry args={[0.06, 6, 5]} /></mesh>
				<mesh material={B.paruh} position={[0, 0.39, 0.16]} rotation-x={Math.PI / 2}><coneGeometry args={[0.02, 0.16, 4]} /></mesh>
			</group>
			{[-0.05, 0.05].map((dx) => <mesh key={dx} material={B.hitam} position={[dx, 0.2, 0]}><cylinderGeometry args={[0.012, 0.012, 0.4, 4]} /></mesh>)}
		</group>
	));
}

/** Kawanan burung terbang berputar di langit. */
function KawananBurung() {
	const ref = useRef();
	const sayap = useRef([]);
	useFrame(({ clock }) => {
		const t = clock.elapsedTime * 0.05;
		ref.current.position.set(Math.cos(t) * 75, 32 + Math.sin(t * 3) * 3, Math.sin(t) * 60);
		ref.current.rotation.y = -t + Math.PI;
		sayap.current.forEach((s, i) => { if (s) s.rotation.z = Math.sin(clock.elapsedTime * 9 + i) * 0.6; });
	});
	const posisi = [[0, 0], [-1.6, -1.4], [1.6, -1.4], [-3.2, -2.8], [3.2, -2.8], [-4.8, -4.2], [4.8, -4.2]];
	return (
		<group ref={ref}>
			{posisi.map(([x, z], i) => (
				<group key={i} position={[x, 0, z]}>
					<mesh material={B.hitam}><boxGeometry args={[0.12, 0.1, 0.5]} /></mesh>
					{[-1, 1].map((s) => (
						<group key={s} ref={(r) => (sayap.current[i * 2 + (s > 0 ? 1 : 0)] = r)} scale-x={s}>
							<mesh material={B.hitam} position={[0.4, 0, 0]}><boxGeometry args={[0.8, 0.02, 0.24]} /></mesh>
						</group>
					))}
				</group>
			))}
		</group>
	);
}

/** Kupu-kupu beterbangan di atas kebun. */
const PUSAT_KUPU = [0, 0];
function KupuKupu({ n = 10, pusat = PUSAT_KUPU, sebar = 18 }) {
	const data = useMemo(() => Array.from({ length: n }, (_, i) => ({
		x: pusat[0] + (Math.random() - 0.5) * sebar * 2, z: pusat[1] + (Math.random() - 0.5) * sebar * 2, f: Math.random() * 10,
		bahan: new MeshStandardMaterial({ color: WARNA_KUPU[i % WARNA_KUPU.length], side: 2, emissive: WARNA_KUPU[i % WARNA_KUPU.length], emissiveIntensity: 0.15 }),
	})), [n, pusat, sebar]);
	const ref = useRef([]);
	useFrame(({ clock }) => {
		const t = clock.elapsedTime;
		data.forEach((d, i) => {
			const g = ref.current[i];
			if (!g) return;
			g.position.set(d.x + Math.sin(t * 0.4 + d.f) * 3, 0.8 + Math.sin(t * 1.3 + d.f) * 0.4, d.z + Math.cos(t * 0.33 + d.f * 2) * 3);
			g.rotation.y = t * 0.4 + d.f;
			const k = Math.sin(t * 14 + d.f) * 1.1;
			g.children[0].rotation.z = k;
			g.children[1].rotation.z = -k;
		});
	});
	return data.map((d, i) => (
		<group key={i} ref={(r) => (ref.current[i] = r)}>
			<group><mesh material={d.bahan} position-x={0.06}><planeGeometry args={[0.12, 0.1]} /></mesh></group>
			<group><mesh material={d.bahan} position-x={-0.06}><planeGeometry args={[0.12, 0.1]} /></mesh></group>
		</group>
	));
}

function Kucing() {
	const ekor = useRef();
	useFrame(({ clock }) => { ekor.current.rotation.y = Math.sin(clock.elapsedTime * 1.3) * 0.5; });
	const b = useMemo(() => new MeshStandardMaterial({ color: "#f59e0b", roughness: 0.9 }), []);
	return (
		<group position={[(BALE_WARUNG.x0 + BALE_WARUNG.x1) / 2, 0.55, BALE_WARUNG.z0 + 0.6]} rotation-y={0.4}>
			<mesh material={b} scale={[1, 0.55, 1.3]} position-y={0.1}><sphereGeometry args={[0.17, 10, 8]} /></mesh>
			<mesh material={b} position={[0, 0.14, 0.2]}><sphereGeometry args={[0.1, 8, 6]} /></mesh>
			{[-1, 1].map((s) => <mesh key={s} material={b} position={[s * 0.05, 0.24, 0.2]}><coneGeometry args={[0.03, 0.07, 4]} /></mesh>)}
			<group ref={ekor} position={[0, 0.06, -0.2]}>
				<mesh material={b} position={[0.12, 0, -0.06]} rotation-z={Math.PI / 2}><capsuleGeometry args={[0.025, 0.22, 3, 5]} /></mesh>
			</group>
		</group>
	);
}

/** ayam Mak Asih yang lepas (acara desa): kabur cepat, ditangkap dengan E */
function AyamLepas() {
	useDesa();
	const ref = useRef([]);
	const bahan = useMemo(() => new MeshStandardMaterial({ color: "#f59e0b", emissive: "#f59e0b", emissiveIntensity: 0.25, roughness: 0.8 }), []);
	useFrame(({ clock }, dtMentah) => {
		const dt = Math.min(0.05, dtMentah);
		const t = clock.elapsedTime;
		desa.ayam.forEach((a, i) => {
			const g = ref.current[i];
			if (!g) return;
			g.visible = !a.tertangkap;
			if (a.tertangkap) return;
			const jp = jarakPemain(a.x, a.z);
			if (jp < 3.4 && a.kabur <= 0) {
				const ax = a.x - pemainWilayah.x, az = a.z - pemainWilayah.z;
				const d = Math.hypot(ax, az) || 1;
				const belok = (Math.random() - 0.5) * 1.6;
				a.tx = a.x + (ax / d) * 6 * Math.cos(belok) - (az / d) * 6 * Math.sin(belok);
				a.tz = a.z + (az / d) * 6 * Math.cos(belok) + (ax / d) * 6 * Math.sin(belok);
				a.tx = Math.max(JALAN_NS.x - 30, Math.min(JALAN_NS.x + 30, a.tx));
				a.tz = Math.max(-32, Math.min(-16, a.tz));
				a.kabur = 0.9;
			}
			let v = 0;
			if (a.kabur > 0) { a.kabur -= dt; v = 4.4; } else if ((a.tunggu -= dt) <= 0) { v = 1; }
			const dx = a.tx - a.x, dz = a.tz - a.z;
			const d = Math.hypot(dx, dz);
			if (v && d > 0.2) { a.x += (dx / d) * v * dt; a.z += (dz / d) * v * dt; g.rotation.y = Math.atan2(dx, dz); }
			else if (v) { a.tunggu = 0.6 + Math.random(); a.tx = a.x + (Math.random() - 0.5) * 6; a.tz = Math.max(-32, Math.min(-16, a.z + (Math.random() - 0.5) * 6)); }
			g.position.set(a.x, v > 2 ? Math.abs(Math.sin(t * 20 + i)) * 0.18 : 0, a.z);
		});
	});
	return desa.ayam.map((a, i) => (
		<group key={i} ref={(r) => (ref.current[i] = r)} position={[a.x, 0, a.z]} scale={1.25}>
			<mesh material={bahan} position={[0, 0.24, 0]} scale={[0.8, 0.85, 1.1]} castShadow><sphereGeometry args={[0.16, 8, 6]} /></mesh>
			<mesh material={bahan} position={[0, 0.42, 0.14]}><sphereGeometry args={[0.075, 8, 6]} /></mesh>
			<mesh material={B.jengger} position={[0, 0.5, 0.15]}><boxGeometry args={[0.025, 0.06, 0.08]} /></mesh>
			<mesh material={B.paruh} position={[0, 0.41, 0.23]} rotation-x={Math.PI / 2}><coneGeometry args={[0.025, 0.06, 4]} /></mesh>
			<mesh material={bahan} position={[0, 0.36, -0.17]} rotation-x={-0.6}><coneGeometry args={[0.07, 0.2, 5]} /></mesh>
		</group>
	));
}

export default function WargaDesa({ model }) {
	const kuntul = useMemo(() => [[-40, 40, 0.3], [-36, 44, 2], [-21, 55, 1], [28, 38, -1], [33, 52, 2.6], [-TATA.sisiLapangan * 55, 8, 0.8]], []);
	const kandang = useMemo(() => ({ x: KANDANG_AYAM.x, z: KANDANG_AYAM.z + 3.5 }), []);
	const warung = useMemo(() => ({ x: MEJA_WARUNG.x - 4, z: MEJA_WARUNG.z - 1 }), []);
	return (
		<group>
			{wargaAktif().map((w) => <SatuWarga key={w.id} w={w} />)}
			<Ayam pusat={kandang} n={8} sebar={4.5} />
			<Ayam pusat={warung} n={4} sebar={2.5} warnaAwal={2} />
			{(model === "padi" || model === "ubi") && <Kuntul titik={kuntul} />}
			<KawananBurung />
			<KupuKupu />
			<Kucing />
			<AyamLepas />
		</group>
	);
}
