import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
	AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, Color, DoubleSide, Fog, MeshBasicMaterial, MeshStandardMaterial, RingGeometry, ShaderMaterial, Vector3,
} from "three";
import Gabung from "../scene/Gabung";
import Papan from "../scene/Papan";
import { kebun } from "../kebun";
import {
	BALE_WARUNG, BAMBU, BATAS_DUNIA, GAPURA_DESA, JALAN_EW, JALAN_NS, KANDANG_AYAM, KEBUN, KELAPA, KOLAM_IKAN, LADANG, LAPANGAN, MEJA_WARUNG, MUSHOLA,
	POS_RONDA, RUMAH, RUTE_BAJAK, RUTE_TANDUR, SALURAN, SAUNG_KEBUN, SAWAH, TATA, WARUNG,
} from "../scene/kebunDesaData";
import { bahanAngin, kuatAngin, waktuAngin } from "./angin";
import { pemainWilayah } from "./uiWilayah";
import { desa, malamDari } from "./desaHidup";
import { bahanBangunan, teksturJalan, teksturRumput } from "./tekstur";
import Banyak from "./banyak";
import KhasUsaha from "./KhasUsaha";

/*
 * Lingkungan dunia kecamatan untuk bertani: langit bergradasi dengan awan,
 * cuaca (mendung, hujan, pelangi), matahari yang mengikuti pemain (bayangan
 * tajam di mana pun), gunung sesuai letak kecamatan, hamparan sawah yang
 * bergoyang tertiup angin, kampung dengan warung, rumah panggung, mushola,
 * pos ronda, kandang ayam, kolam ikan, lapangan bola, dan rumpun bambu.
 */

// gunung latar per wilayah: barat (Halimun-Salak), selatan (Salak-Gede), timur (perbukitan Jonggol-Sukamakmur)
const BARAT = ["Nanggung", "Leuwiliang", "Leuwisadeng", "Pamijahan", "Cibungbulang", "Ciampea", "Tenjolaya", "Dramaga", "Rumpin", "Cigudeg", "Sukajaya", "Jasinga", "Tenjo", "Parung Panjang"];
const TIMUR = ["Sukamakmur", "Cariu", "Tanjungsari", "Jonggol", "Cileungsi", "Klapanunggal", "Gunung Putri", "Citeureup", "Babakan Madang"];
function gunungUntuk(kecamatan) {
	if (BARAT.includes(kecamatan)) return { nama: "Gunung Halimun & Salak", puncak: [[-140, 250, 95, 120], [60, 280, 78, 90], [190, 260, 60, 70]] };
	if (TIMUR.includes(kecamatan)) return { nama: "Perbukitan timur", puncak: [[-160, 260, 45, 60], [10, 270, 55, 75], [170, 250, 40, 55]] };
	return { nama: "Gunung Salak & Gede-Pangrango", puncak: [[-120, 260, 85, 110], [110, 270, 105, 130], [230, 280, 70, 80]] };
}

/** salinan tekstur dengan ulangan sendiri (gambar dipakai bersama) */
const ulangi = (t, rx, ry) => { const c = t.clone(); c.repeat.set(rx, ry); c.needsUpdate = true; return c; };
const acak = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ---------------------------------------------------------------- langit & cuaca

// palet langit per jam: [jam, atas, cakrawala, kabut, warna cahaya, kuat cahaya, kuat langit]
const PALET = [
	[0, "#0a1430", "#1b2a4c", "#141f3a", "#9db4ff", 0.38, 0.28],
	[4.8, "#0a1430", "#1b2a4c", "#141f3a", "#9db4ff", 0.38, 0.28],
	[6, "#46679c", "#f6b48a", "#e9bc98", "#ffb070", 1.25, 0.55],
	[7.6, "#3b82c4", "#cfe6f5", "#cfe2ee", "#fff1d6", 2.3, 0.75],
	[16.6, "#3b82c4", "#cfe6f5", "#cfe2ee", "#fff1d6", 2.3, 0.75],
	[18, "#3a4c88", "#f59a68", "#e7a37c", "#ff8a4c", 1.3, 0.5],
	[19.2, "#0a1430", "#1b2a4c", "#141f3a", "#9db4ff", 0.38, 0.28],
	[24, "#0a1430", "#1b2a4c", "#141f3a", "#9db4ff", 0.38, 0.28],
].map(([j, a, b, k, c, i, h]) => ({ j, atas: new Color(a), bawah: new Color(b), kabut: new Color(k), cahaya: new Color(c), kuat: i, langit: h }));
const HUJAN = { atas: new Color("#5b6b7c"), bawah: new Color("#a9b4bf"), kabut: new Color("#9aa6b2") };
const WARNA_PUTIH = new Color("#ffffff");

/** suasana langit saat ini (dihitung sekali per frame, dipakai bersama) */
const suasana = { atas: new Color(), bawah: new Color(), kabut: new Color(), cahaya: new Color(), kuat: 1, langit: 0.7, malam: 0, hujan: 0, arah: new Vector3(0.45, 0.55, -0.35), arahBulan: new Vector3() };
let frameSuasana = -1;
function hitungSuasana(frame) {
	if (frame === frameSuasana) return suasana;
	frameSuasana = frame;
	const j = desa.jam;
	let a = PALET[0], b = PALET[1];
	for (let i = 0; i < PALET.length - 1; i++) if (j >= PALET[i].j && j <= PALET[i + 1].j) { a = PALET[i]; b = PALET[i + 1]; break; }
	const u = (j - a.j) / Math.max(0.001, b.j - a.j);
	const h = Math.min(1, kebun.cuaca.hujan + (kebun.cuaca.jenis === "mendung" ? 0.35 : 0) * (1 - kebun.cuaca.hujan));
	const m = malamDari(j);
	for (const k of ["atas", "bawah", "kabut", "cahaya"]) suasana[k].copy(a[k]).lerp(b[k], u);
	// hujan: abu-abu (redup di malam hari)
	suasana.atas.lerp(HUJAN.atas, h * (1 - m) * 0.9);
	suasana.bawah.lerp(HUJAN.bawah, h * (1 - m) * 0.9);
	suasana.kabut.lerp(HUJAN.kabut, h * (1 - m) * 0.9);
	suasana.kuat = (a.kuat + (b.kuat - a.kuat) * u) * (1 - h * 0.6);
	suasana.langit = a.langit + (b.langit - a.langit) * u + h * 0.15;
	suasana.malam = m;
	suasana.hujan = h;
	// matahari terbit di timur (+x) pukul 6, terbenam di barat pukul 18
	const t = ((j - 6) / 12) * Math.PI;
	suasana.arah.set(Math.cos(t), Math.max(0.12, Math.sin(t)), -0.45).normalize();
	const tb = (((j - 18 + 24) % 24) / 12) * Math.PI;
	suasana.arahBulan.set(Math.cos(tb) * 0.8, Math.max(0.15, Math.sin(tb)), 0.5).normalize();
	return suasana;
}

function Langit() {
	const { scene, camera } = useThree();
	const bahan = useMemo(() => new ShaderMaterial({
		side: BackSide, depthWrite: false, fog: false,
		uniforms: { uAtas: { value: new Color() }, uBawah: { value: new Color() }, uMatahari: { value: 1 }, uArah: { value: new Vector3(0.45, 0.55, -0.35) } },
		vertexShader: "varying vec3 vArah; void main(){ vArah = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
		fragmentShader: `uniform vec3 uAtas; uniform vec3 uBawah; uniform float uMatahari; uniform vec3 uArah; varying vec3 vArah;
			void main(){
				float h = clamp(vArah.y, 0.0, 1.0);
				vec3 w = mix(uBawah, uAtas, pow(h, 0.55));
				float m = max(dot(normalize(vArah), normalize(uArah)), 0.0);
				w += vec3(1.0, 0.85, 0.6) * (pow(m, 700.0) * 2.2 + pow(m, 10.0) * 0.28) * uMatahari;
				gl_FragColor = vec4(w, 1.0);
			}`,
	}), []);
	const bola = useRef();
	useEffect(() => {
		scene.fog = new Fog(new Color("#cfe2ee"), 70, 320);
		scene.background = new Color("#cfe6f5");
		return () => { scene.fog = null; scene.background = null; };
	}, [scene]);
	useFrame((st) => {
		const s = hitungSuasana(st.clock.elapsedTime);
		bahan.uniforms.uAtas.value.copy(s.atas);
		bahan.uniforms.uBawah.value.copy(s.bawah);
		bahan.uniforms.uMatahari.value = (1 - s.hujan) * (1 - s.malam);
		bahan.uniforms.uArah.value.copy(s.arah);
		if (scene.fog) {
			scene.fog.color.copy(s.kabut);
			scene.fog.far = 320 - s.hujan * 150 - s.malam * 90;
		}
		bola.current.position.copy(camera.position);
	});
	return <mesh ref={bola} material={bahan} renderOrder={-1}><sphereGeometry args={[450, 24, 12]} /></mesh>;
}

/** bintang & bulan di malam hari */
function LangitMalam() {
	const { camera } = useThree();
	const geo = useMemo(() => {
		const g = new BufferGeometry();
		const pos = new Float32Array(1100 * 3);
		for (let i = 0; i < 1100; i++) {
			const t = acak(i * 1.7) * Math.PI * 2, y = 0.08 + acak(i * 3.3 + 1) * 0.92, r = Math.sqrt(1 - y * y);
			pos.set([Math.cos(t) * r * 400, y * 400, Math.sin(t) * r * 400], i * 3);
		}
		g.setAttribute("position", new BufferAttribute(pos, 3));
		return g;
	}, []);
	const grup = useRef();
	const bintang = useRef();
	const bulan = useRef();
	useFrame((st) => {
		const s = hitungSuasana(st.clock.elapsedTime);
		grup.current.position.copy(camera.position);
		grup.current.visible = s.malam > 0.05;
		bintang.current.material.opacity = s.malam * (1 - s.hujan);
		bulan.current.position.copy(s.arahBulan).multiplyScalar(360);
		bulan.current.material.opacity = s.malam * (1 - s.hujan * 0.7);
	});
	return (
		<group ref={grup} visible={false}>
			<points ref={bintang} geometry={geo}>
				<pointsMaterial color="#f8fafc" size={1.8} sizeAttenuation={false} transparent opacity={0} fog={false} depthWrite={false} />
			</points>
			<mesh ref={bulan}>
				<sphereGeometry args={[9, 20, 14]} />
				<meshBasicMaterial color="#f1f5f9" transparent opacity={0} fog={false} />
			</mesh>
		</group>
	);
}

/** kunang-kunang di tepi sawah & kebun saat malam */
function KunangKunang() {
	const N = 160;
	const data = useMemo(() => Array.from({ length: N }, (_, i) => {
		const sawah = acak(i * 5.1) < 0.6;
		return { x: sawah ? -60 + acak(i * 2.3) * 120 : -24 + acak(i * 4.7) * 48, z: sawah ? 20 + acak(i * 6.1) * 14 : -15 + acak(i * 7.9) * 32, f: acak(i) * 10 };
	}), []);
	const geo = useMemo(() => { const g = new BufferGeometry(); g.setAttribute("position", new BufferAttribute(new Float32Array(N * 3), 3)); return g; }, []);
	const ref = useRef();
	useFrame((st) => {
		const s = hitungSuasana(st.clock.elapsedTime);
		ref.current.visible = s.malam > 0.3;
		if (!ref.current.visible) return;
		ref.current.material.opacity = Math.min(1, (s.malam - 0.3) * 1.4) * (1 - s.hujan);
		const t = st.clock.elapsedTime;
		const pos = geo.attributes.position.array;
		data.forEach((d, i) => {
			pos[i * 3] = d.x + Math.sin(t * 0.3 + d.f) * 2;
			pos[i * 3 + 1] = 1.1 + Math.sin(t * 0.9 + d.f * 3) * 0.5;
			pos[i * 3 + 2] = d.z + Math.cos(t * 0.25 + d.f) * 2;
		});
		geo.attributes.position.needsUpdate = true;
		ref.current.material.size = 0.24 + Math.sin(t * 6) * 0.05;
	});
	return (
		<points ref={ref} geometry={geo} frustumCulled={false} visible={false}>
			<pointsMaterial color="#d9f99d" size={0.24} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} />
		</points>
	);
}

// jendela rumah & bohlam yang menyala di malam hari (dipakai bersama)
const bahanJendela = new MeshStandardMaterial({ color: "#1f2937", emissive: "#fbbf24", emissiveIntensity: 0, roughness: 0.6 });
const titikLampu = () => [[MEJA_WARUNG.x - 0.4, 2.7, MEJA_WARUNG.z], [(SAUNG_KEBUN.x0 + SAUNG_KEBUN.x1) / 2, 2.6, (SAUNG_KEBUN.z0 + SAUNG_KEBUN.z1) / 2], [POS_RONDA.x, 2.2, POS_RONDA.z]];

/** matahari / bulan mengikuti pemain supaya bayangan tetap tajam di mana pun */
function Matahari() {
	const ref = useRef();
	const hemi = useRef();
	const lampu = useRef([]);
	const titik = useMemo(titikLampu, []);
	useFrame((st) => {
		const s = hitungSuasana(st.clock.elapsedTime);
		const l = ref.current;
		const px = Math.round(pemainWilayah.x / 4) * 4, pz = Math.round(pemainWilayah.z / 4) * 4;
		const arah = s.malam > 0.5 ? s.arahBulan : s.arah;
		l.position.set(px + arah.x * 70, arah.y * 70, pz + arah.z * 70);
		l.target.position.set(px, 0, pz);
		l.target.updateMatrixWorld();
		l.intensity = s.kuat;
		l.color.copy(s.cahaya);
		hemi.current.intensity = s.langit;
		hemi.current.color.copy(s.atas).lerp(WARNA_PUTIH, 0.55);
		bahanJendela.emissiveIntensity = Math.max(0, s.malam * 1.6 - 0.1);
		lampu.current.forEach((p) => { if (p) p.intensity = s.malam * 14; });
	});
	return (
		<>
			<hemisphereLight ref={hemi} args={["#dbeafe", "#5b7a34", 0.75]} />
			<directionalLight
				ref={ref} color="#fff1d6" intensity={2.3} castShadow
				shadow-mapSize={[2048, 2048]} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={30} shadow-camera-bottom={-30}
				shadow-camera-far={160} shadow-bias={-0.0004} shadow-normalBias={0.03}
			/>
			<ambientLight intensity={0.12} />
			{titik.map(([x, y, z], i) => (
				<group key={i} position={[x, y, z]}>
					<pointLight ref={(r) => (lampu.current[i] = r)} color="#ffcf7a" intensity={0} distance={16} decay={1.6} />
					<mesh material={bahanJendela}><sphereGeometry args={[0.12, 8, 6]} /></mesh>
				</group>
			))}
		</>
	);
}

function Awan() {
	const ref = useRef();
	const awan = useMemo(() => Array.from({ length: 16 }, (_, i) => ({
		x: (acak(i) - 0.5) * 520, y: 70 + acak(i * 3) * 40, z: (acak(i * 7) - 0.5) * 520, s: 8 + acak(i * 11) * 10,
		gumpal: Array.from({ length: 5 }, (_, j) => [(j - 2) * 0.9 + (acak(i + j) - 0.5), (acak(i * j + 3) - 0.3) * 0.6, (acak(i + j * 5) - 0.5) * 0.9, 0.7 + acak(i * 5 + j) * 0.6]),
	})), []);
	const bahan = useMemo(() => ({ hujan: new Color("#8b95a1"), m: new MeshBasicMaterial({ color: "#ffffff", fog: false }) }), []);
	useFrame((st, dt) => {
		const s = hitungSuasana(st.clock.elapsedTime);
		ref.current.children.forEach((g, i) => {
			g.position.x += dt * (1.2 + (i % 3) * 0.4) * (1 + s.hujan);
			if (g.position.x > 280) g.position.x = -280;
		});
		// awan diterangi warna langit: putih siang, jingga senja, kelabu malam & hujan
		bahan.m.color.copy(s.bawah).lerp(WARNA_PUTIH, 0.55 * (1 - s.malam)).lerp(bahan.hujan, s.hujan * 0.8);
		if (s.malam > 0.5) bahan.m.color.multiplyScalar(0.55);
	});
	return (
		<group ref={ref}>
			{awan.map((a, i) => (
				<group key={i} position={[a.x, a.y, a.z]} scale={a.s}>
					{a.gumpal.map(([x, y, z, s], j) => (
						<mesh key={j} material={bahan.m} position={[x, y, z]} scale={[s * 1.3, s * 0.7, s]}>
							<icosahedronGeometry args={[1, 1]} />
						</mesh>
					))}
				</group>
			))}
		</group>
	);
}

/** tetes hujan di sekitar kamera */
function Hujan() {
	const { camera } = useThree();
	const N = 1400;
	const geo = useMemo(() => {
		const g = new BufferGeometry();
		g.setAttribute("position", new BufferAttribute(new Float32Array(N * 6), 3));
		return g;
	}, []);
	const tetes = useMemo(() => Array.from({ length: N }, () => [(Math.random() - 0.5) * 50, Math.random() * 26, (Math.random() - 0.5) * 50]), []);
	const ref = useRef();
	useFrame((_, dtMentah) => {
		const dt = Math.min(0.05, dtMentah);
		const h = kebun.cuaca.hujan;
		ref.current.visible = h > 0.03;
		if (!ref.current.visible) return;
		ref.current.material.opacity = 0.55 * h;
		const pos = geo.attributes.position.array;
		const n = Math.floor(N * Math.min(1, h * 1.3));
		for (let i = 0; i < N; i++) {
			const t = tetes[i];
			t[1] -= dt * 22;
			if (t[1] < 0) { t[1] = 26; t[0] = (Math.random() - 0.5) * 50; t[2] = (Math.random() - 0.5) * 50; }
			const x = camera.position.x + t[0], z = camera.position.z + t[2], y = i < n ? t[1] : -50;
			const o = i * 6;
			pos[o] = x; pos[o + 1] = y; pos[o + 2] = z;
			pos[o + 3] = x + 0.06; pos[o + 4] = y - 0.7; pos[o + 5] = z;
		}
		geo.attributes.position.needsUpdate = true;
	});
	return (
		<lineSegments ref={ref} geometry={geo} frustumCulled={false} visible={false}>
			<lineBasicMaterial color="#dbe4ee" transparent opacity={0.4} depthWrite={false} />
		</lineSegments>
	);
}

function Pelangi() {
	const geo = useMemo(() => {
		const g = new RingGeometry(50, 57, 64, 6, 0, Math.PI);
		const warna = ["#7c3aed", "#4f46e5", "#0ea5e9", "#22c55e", "#facc15", "#f97316", "#ef4444"];
		const pos = g.attributes.position;
		const col = new Float32Array(pos.count * 3);
		const c = new Color();
		for (let i = 0; i < pos.count; i++) {
			const r = Math.hypot(pos.getX(i), pos.getY(i));
			const u = Math.min(0.999, Math.max(0, (r - 50) / 7));
			c.set(warna[Math.floor(u * warna.length)]);
			col.set([c.r, c.g, c.b], i * 3);
		}
		g.setAttribute("color", new BufferAttribute(col, 3));
		return g;
	}, []);
	const ref = useRef();
	useFrame(() => {
		const p = kebun.cuaca.pelangi;
		ref.current.visible = p > 0;
		ref.current.material.opacity = Math.min(1, p / 4, (24 - p) / 3) * 0.55;
	});
	return (
		<mesh ref={ref} geometry={geo} position={[6, -40, 64]} visible={false} renderOrder={1}>
			<meshBasicMaterial vertexColors transparent opacity={0} side={DoubleSide} depthWrite={false} fog={false} blending={AdditiveBlending} />
		</mesh>
	);
}

// ---------------------------------------------------------------- tanah, jalan, air

function Tanah() {
	// rumput liar bergoyang di mana-mana kecuali jalan, sawah, kebun & lapangan
	const rumput = useMemo(() => {
		const hasil = [];
		for (let i = 0; hasil.length < 2200 && i < 9000; i++) {
			const x = (acak(i * 1.3) - 0.5) * 136, z = (acak(i * 2.7 + 5) - 0.5) * 138;
			if (Math.abs(z - JALAN_EW.z) < 3 || (Math.abs(x - JALAN_NS.x) < 2.6 && z < -14)) continue;
			if (x > LADANG.x0 - 1 && x < LADANG.x1 + 1 && z > LADANG.z0 - 1 && z < LADANG.z1 + 1) continue;
			if (z > KEBUN.z1 + 4 || (x * -TATA.sisiLapangan > 29 && z > -15 && z < KEBUN.z1 + 1)) continue; // sawah
			if (x > LAPANGAN.x0 && x < LAPANGAN.x1 && z > LAPANGAN.z0 && z < LAPANGAN.z1) continue;
			hasil.push([x, 0.18, z, 0.7 + acak(i) * 0.7, acak(i * 9) * 6]);
		}
		return hasil;
	}, []);
	const bunga = useMemo(() => rumput.filter((_, i) => i % 9 === 0).map(([x, , z], i) => [x + 0.2, 0.36, z, 0.8 + acak(i) * 0.5]), [rumput]);
	const bahanRumput = useMemo(() => bahanAngin({ roughness: 1 }, { kuat: 0.14, tinggi: 0.36 }), []);
	const jalur = (x, z, lx, lz, warna = "#b8955e", y = 0.012, tekstur = false) => (
		<mesh rotation-x={-Math.PI / 2} position={[x, y, z]} receiveShadow>
			<planeGeometry args={[lx, lz]} />
			{tekstur ? <meshStandardMaterial map={ulangi(teksturJalan(1), lx / 5, lz / 5)} roughness={1} /> : <meshStandardMaterial color={warna} roughness={1} />}
		</mesh>
	);
	return (
		<group>
			<mesh rotation-x={-Math.PI / 2} position-y={-0.02} receiveShadow>
				<planeGeometry args={[800, 800]} />
				<meshStandardMaterial map={teksturRumput(200)} roughness={1} />
			</mesh>
			{/* jalan desa (tanah padat) dengan bekas roda */}
			{jalur(0, JALAN_EW.z, 136, JALAN_EW.lebar, null, 0.012, true)}
			{jalur(0, JALAN_EW.z - 0.9, 136, 0.35, "#a5824f", 0.016)}
			{jalur(0, JALAN_EW.z + 0.9, 136, 0.35, "#a5824f", 0.016)}
			{jalur(JALAN_NS.x, (JALAN_NS.z0 + JALAN_NS.z1) / 2, JALAN_NS.lebar, JALAN_NS.z1 - JALAN_NS.z0, null, 0.012, true)}
			{/* lapangan bola */}
			{jalur((LAPANGAN.x0 + LAPANGAN.x1) / 2, (LAPANGAN.z0 + LAPANGAN.z1) / 2, LAPANGAN.x1 - LAPANGAN.x0, LAPANGAN.z1 - LAPANGAN.z0, "#9fb55a")}
			{/* saluran irigasi */}
			{SALURAN.map((s, i) => (
				<group key={i}>
					{s.arah === "z"
						? <>{jalur(s.x, (s.z0 + s.z1) / 2, 2.6, s.z1 - s.z0, "#5b7f3a", 0.006)}{jalur(s.x, (s.z0 + s.z1) / 2, 1.8, s.z1 - s.z0, "#4f8fa6", 0.02)}</>
						: <>{jalur((s.x0 + s.x1) / 2, s.z, s.x1 - s.x0, 2.6, "#5b7f3a", 0.006)}{jalur((s.x0 + s.x1) / 2, s.z, s.x1 - s.x0, 1.8, "#4f8fa6", 0.02)}</>}
				</group>
			))}
			<Banyak titik={rumput} material={bahanRumput} bayangan={false} warna={["#6f9e3c", "#7fae45", "#5e8f33", "#8ab84e"]}>
				<coneGeometry args={[0.09, 0.36, 3]} />
			</Banyak>
			<Banyak titik={bunga} bayangan={false} warna={["#facc15", "#f8fafc", "#f472b6", "#a78bfa"]}>
				<sphereGeometry args={[0.06, 5, 4]} />
				<meshStandardMaterial roughness={0.8} />
			</Banyak>
		</group>
	);
}

// ---------------------------------------------------------------- sawah & kebun

function petakSawah() {
	const petak = [];
	const s = -TATA.sisiLapangan; // sisi seberang lapangan
	for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) petak.push({ x: s * (61 - c * 11), z: -9 + r * 10.5, lx: 10.4, lz: 9.9 }); // samping
	const u = SAWAH.uk;
	for (let r = 0; r < SAWAH.baris; r++) for (let c = 0; c < SAWAH.kolom; c++) petak.push({ x: SAWAH.x0 + c * u, z: SAWAH.z0 + r * u, lx: u - 0.6, lz: u - 0.6 }); // utara
	return petak;
}

// tempat kerja Pak Darsa & Ceu Enok tidak boleh tertutup tanaman
const diRuteBajak = (x, z, m = 3) => Math.abs(z - RUTE_BAJAK.z) < m && x > RUTE_BAJAK.x0 - 5 && x < RUTE_BAJAK.x1 + 5;
const diRuteTandur = (x, z, m = 2) => Math.abs(z - RUTE_TANDUR.z) < m && x > RUTE_TANDUR.x0 - 1 && x < RUTE_TANDUR.x1 + 1;

function Sawah({ utara = true, kolam = false }) {
	const petak = useMemo(() => petakSawah().filter((p) => utara || p.z < KEBUN.z1 + 3), [utara]);
	const { rumpun, warna } = useMemo(() => {
		const rumpun = [], warna = [];
		const TAHAP = [["#8fd35a", "#9bd862"], ["#5ea83a", "#6fb342", "#4f9a30"], ["#5ea83a", "#6fb342"], ["#cfae45", "#d9b44a", "#c49a3a"]];
		if (!kolam) petak.forEach((p, i) => {
			// tiap petak di tahap berbeda: baru tandur, menghijau, bunting, menguning
			const tahap = Math.floor(acak(i * 3.3) * 4);
			const tinggi = [0.35, 0.8, 1, 0.95][tahap];
			if (diRuteBajak(p.x, p.z, SAWAH.uk / 2)) return; // petak yang sedang dibajak Pak Darsa
			const nx = 7, nz = 7;
			for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
				if (a > 3 && diRuteTandur(p.x, p.z, SAWAH.uk / 2)) continue; // tandur Ceu Enok belum selesai
				rumpun.push([p.x - p.lx / 2 + 0.8 + a * ((p.lx - 1.6) / (nx - 1)) + (acak(i * 99 + a * 7 + b) - 0.5) * 0.25, 0.1 + tinggi * 0.42, p.z - p.lz / 2 + 0.8 + b * ((p.lz - 1.6) / (nz - 1)) + (acak(i * 13 + a + b * 3) - 0.5) * 0.25, 1, acak(i + a * b) * 6, tinggi * (0.9 + acak(i + a + b) * 0.2)]);
				warna.push(TAHAP[tahap][(a + b) % TAHAP[tahap].length]);
			}
		});
		return { rumpun, warna };
	}, [petak, kolam]);
	const bahanPadi = useMemo(() => bahanAngin({ roughness: 0.9 }, { kuat: 0.22, tinggi: 0.85 }), []);
	return (
		<group>
			<Gabung bayangan>
				{petak.map((p, i) => (
					<group key={i} position={[p.x, 0, p.z]}>
						<mesh position-y={0.04}><boxGeometry args={[p.lx, 0.08, p.lz]} /><meshStandardMaterial color={i % 5 === 2 ? "#5d8b91" : "#628f95"} roughness={0.12} metalness={0.3} /></mesh>
						{[-1, 1].map((s) => <mesh key={`x${s}`} position={[(s * (p.lx + 0.6)) / 2, 0.17, 0]}><boxGeometry args={[0.6, 0.34, p.lz + 0.6]} /><meshStandardMaterial color="#6b8f3a" roughness={1} /></mesh>)}
						{[-1, 1].map((s) => <mesh key={`z${s}`} position={[0, 0.17, (s * (p.lz + 0.6)) / 2]}><boxGeometry args={[p.lx + 0.6, 0.34, 0.6]} /><meshStandardMaterial color="#6b8f3a" roughness={1} /></mesh>)}
					</group>
				))}
				{/* saung di tengah sawah utara */}
				<group position={[SAWAH.x0 + Math.round(SAWAH.kolom / 2) * SAWAH.uk - SAWAH.uk / 2, 0, SAWAH.z0 + 1.5 * SAWAH.uk]}>
					{[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <mesh key={`${sx}${sz}`} position={[sx * 1.4, 1.1, sz * 1.1]}><cylinderGeometry args={[0.07, 0.07, 2.2, 6]} /><meshStandardMaterial color="#c9a95a" /></mesh>))}
					<mesh position-y={0.6}><boxGeometry args={[3, 0.1, 2.4]} /><meshStandardMaterial color="#a8834a" /></mesh>
					<mesh position-y={2.6} rotation-y={Math.PI / 4}><coneGeometry args={[2.5, 1, 4]} /><meshStandardMaterial color="#5b4a32" /></mesh>
				</group>
			</Gabung>
			<Banyak titik={rumpun} warna={warna} material={bahanPadi}>
				<coneGeometry args={[0.24, 0.85, 5]} />
			</Banyak>
			{/* bendera pengusir burung di pematang */}
			{!kolam && petak.filter((_, i) => i % 7 === 3).map((p, i) => <Bendera key={i} x={p.x + p.lx / 2 + 0.3} z={p.z} warna={i % 2 ? "#ef4444" : "#f8fafc"} />)}
		</group>
	);
}

function Bendera({ x, z, warna }) {
	const ref = useRef();
	useFrame(({ clock }) => { ref.current.rotation.y = Math.sin(clock.elapsedTime * 3 + x) * 0.5; });
	return (
		<group position={[x, 0, z]}>
			<mesh position-y={1.1}><cylinderGeometry args={[0.025, 0.025, 2.2, 4]} /><meshStandardMaterial color="#c9a95a" /></mesh>
			<group ref={ref} position-y={2}>
				<mesh position-x={0.3}><planeGeometry args={[0.6, 0.35]} /><meshStandardMaterial color={warna} side={DoubleSide} /></mesh>
			</group>
		</group>
	);
}

function KebunBuah({ warnaBuah = "#f59e0b" }) {
	const pohon = useMemo(() => {
		const p = [];
		for (let r = 0; r < 4; r++) for (let c = 0; c < 14; c++) p.push([-60 + c * 9.2 + acak(r * 4 + c + TATA.warna) * 2, 0, SAWAH.z0 + 1 + r * 10 + acak(c * 7 + r) * 2]);
		return p.filter(([x, , z]) => !diRuteBajak(x, z) && !diRuteTandur(x, z));
	}, []);
	const bahanDaun = useMemo(() => bahanAngin({ roughness: 0.9, flatShading: true }, { kuat: 0.12, tinggi: 3 }), []);
	return (
		<group>
			<Banyak titik={pohon.map(([x, , z]) => [x, 1, z, 1])}><cylinderGeometry args={[0.16, 0.24, 2, 7]} /><meshStandardMaterial color="#6b4a2b" /></Banyak>
			<Banyak titik={pohon.map(([x, , z], i) => [x, 2.9, z, 1 + acak(i) * 0.35])} material={bahanDaun} warna={["#3f7d2a", "#4a8a30", "#356f24"]}><icosahedronGeometry args={[1.5, 1]} /></Banyak>
			<Banyak titik={pohon.flatMap(([x, , z], i) => [0, 1, 2, 3, 4].map((j) => [x + Math.cos(j * 1.3 + i) * 1.35, 2.4 + (j % 2) * 0.7, z + Math.sin(j * 1.3 + i) * 1.35, 1]))}><sphereGeometry args={[0.17, 7, 5]} /><meshStandardMaterial color={warnaBuah} /></Banyak>
		</group>
	);
}

function Pembibitan() {
	const pot = useMemo(() => {
		const p = [];
		for (let r = 0; r < 8; r++) for (let c = 0; c < 30; c++) p.push([-30 + c * 2, 0.2, SAWAH.z0 + 3 + r * 2.4 + (c > 14 ? 14 : 0)]);
		return p.filter(([x, , z]) => !diRuteBajak(x, z) && !diRuteTandur(x, z));
	}, []);
	const rumahKaca = [[-40, 50], [-12, 52], [16, 52], [44, 50]];
	return (
		<group>
			<Gabung bayangan>
				{rumahKaca.map(([x, z], i) => (
					<group key={i} position={[x, 0, z]}>
						{[-1, 0, 1].flatMap((sx) => [-1, 1].map((sz) => <mesh key={`${sx}${sz}`} position={[sx * 6, 1.6, sz * 4.5]}><boxGeometry args={[0.15, 3.2, 0.15]} /><meshStandardMaterial color="#e5e7eb" /></mesh>))}
						{[-1, 1].map((sz) => <mesh key={sz} position={[0, 3.25, sz * 4.5]}><boxGeometry args={[12.2, 0.12, 0.12]} /><meshStandardMaterial color="#e5e7eb" /></mesh>)}
					</group>
				))}
			</Gabung>
			{rumahKaca.map(([x, z], i) => (
				<group key={i} position={[x, 0, z]}>
					<mesh position-y={3.6} rotation-z={Math.PI / 2}><cylinderGeometry args={[4.6, 4.6, 12.2, 16, 1, true, 0, Math.PI]} /><meshStandardMaterial color="#dcfce7" transparent opacity={0.35} side={DoubleSide} depthWrite={false} /></mesh>
				</group>
			))}
			<Banyak titik={pot}><cylinderGeometry args={[0.25, 0.18, 0.4, 8]} /><meshStandardMaterial color="#b45f3c" /></Banyak>
			<Banyak titik={pot.map(([x, , z]) => [x, 0.6, z, 1])} warna={["#ec4899", "#f97316", "#a855f7", "#facc15", "#22c55e", "#ef4444"]}><icosahedronGeometry args={[0.28, 0]} /><meshStandardMaterial roughness={0.8} /></Banyak>
		</group>
	);
}

// ---------------------------------------------------------------- kampung

const DINDING = ["#e8d9b5", "#f1e4c8", "#e2cfa4", "#f5ecd7", "#dccaa0"];
const ATAP = ["#9a3412", "#7c2d12", "#b45309", "#8a3a1a"];
const KAIN = ["#ef4444", "#3b82f6", "#facc15", "#f8fafc", "#22c55e", "#ec4899"];

/** rumah panggung Sunda: kolong bertiang, dinding bilik, atap genteng pelana, teras & tangga */
function RumahPanggung({ x, z, rot, i }) {
	const dinding = DINDING[(i + TATA.warna) % DINDING.length], atap = ATAP[(i + TATA.warna) % ATAP.length];
	return (
		<group position={[x, 0, z]} rotation-y={rot}>
			{[-1, 0, 1].flatMap((sx) => [-1, 1].map((sz) => (
				<group key={`${sx}${sz}`} position={[sx * 2.5, 0, sz * 1.9]}>
					<mesh position-y={0.1}><boxGeometry args={[0.36, 0.2, 0.36]} /><meshStandardMaterial color="#9ca3af" /></mesh>
					<mesh position-y={0.5}><boxGeometry args={[0.18, 0.8, 0.18]} /><meshStandardMaterial color="#5b3a1f" /></mesh>
				</group>
			)))}
			<mesh position-y={0.95} material={bahanBangunan("papan", "#8b5e34", 3, 1)}><boxGeometry args={[5.6, 0.14, 4.4]} /></mesh>
			<mesh position-y={2.1} material={bahanBangunan("bilik", dinding, 5, 2.2)}><boxGeometry args={[5.2, 2.2, 4]} /></mesh>
			{/* anyaman bilik: garis-garis tipis */}
			{[-1.9, -0.95, 0.95, 1.9].map((dx) => <mesh key={dx} position={[dx, 2.1, 2.01]}><boxGeometry args={[0.06, 2.2, 0.02]} /><meshStandardMaterial color="#8b6a35" /></mesh>)}
			<mesh position={[0, 3.2, 2.01]}><boxGeometry args={[5.2, 0.08, 0.03]} /><meshStandardMaterial color="#6b4a2b" /></mesh>
			{/* atap pelana genteng */}
			{[-1, 1].map((s) => (
				<mesh key={s} position={[0, 3.85, s * 1.15]} rotation-x={s * 0.62} material={bahanBangunan("genteng", atap, 6, 3)}><boxGeometry args={[6.2, 0.12, 2.9]} /></mesh>
			))}
			<mesh position={[0, 4.62, 0]}><boxGeometry args={[6.3, 0.16, 0.2]} /><meshStandardMaterial color="#57230f" /></mesh>
			{[-1, 1].map((s) => <mesh key={s} position={[s * 2.6, 3.75, 0]} rotation-x={Math.PI / 4} material={bahanBangunan("bilik", dinding, 1.6, 1.6)}><boxGeometry args={[0.04, 1.65, 1.65]} /></mesh>)}
			{/* pintu, jendela berdaun, teras, tangga */}
			<mesh position={[0, 1.95, 2.03]}><boxGeometry args={[0.95, 1.75, 0.04]} /><meshStandardMaterial color="#5b3a1f" /></mesh>
			{[-1.6, 1.6].map((wx) => (
				<group key={wx} position={[wx, 2.25, 2.03]}>
					<mesh material={bahanJendela}><boxGeometry args={[0.9, 0.75, 0.03]} /></mesh>
					{[-1, 1].map((s) => <mesh key={s} position={[s * 0.62, 0, 0.05]} rotation-y={s * 0.5}><boxGeometry args={[0.42, 0.75, 0.03]} /><meshStandardMaterial color="#2f6b4f" /></mesh>)}
				</group>
			))}
			<mesh position={[0, 0.95, 2.75]} material={bahanBangunan("papan", "#a0703f", 2, 1)}><boxGeometry args={[2.6, 0.12, 1.3]} /></mesh>
			{[-1.2, 1.2].map((dx) => <mesh key={dx} position={[dx, 1.6, 3.3]}><boxGeometry args={[0.08, 1.2, 0.08]} /><meshStandardMaterial color="#5b3a1f" /></mesh>)}
			{[0.3, 0.6].map((h, j) => <mesh key={h} position={[0, h, 3.55 + j * -0.25]}><boxGeometry args={[1, 0.08, 0.3]} /><meshStandardMaterial color="#8b5e34" /></mesh>)}
			{/* jemuran di samping rumah */}
			<group position={[3.8, 0, 1]}>
				{[-1, 1].map((s) => <mesh key={s} position={[0, 0.9, s * 1.4]}><cylinderGeometry args={[0.04, 0.04, 1.8, 5]} /><meshStandardMaterial color="#c9a95a" /></mesh>)}
				<mesh position-y={1.75} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.01, 0.01, 2.8, 3]} /><meshStandardMaterial color="#e5e7eb" /></mesh>
				{[-0.9, -0.3, 0.35, 0.95].map((dz, j) => <mesh key={dz} position={[0, 1.42, dz]}><boxGeometry args={[0.03, 0.62, 0.5]} /><meshStandardMaterial color={KAIN[(i + j) % KAIN.length]} /></mesh>)}
			</group>
			{/* pot bunga & tanaman di halaman */}
			{[-2.3, 2.3].map((dx) => (
				<group key={dx} position={[dx, 0, 3.4]}>
					<mesh position-y={0.2}><cylinderGeometry args={[0.25, 0.2, 0.4, 8]} /><meshStandardMaterial color="#b45f3c" /></mesh>
					<mesh position-y={0.55}><icosahedronGeometry args={[0.35, 0]} /><meshStandardMaterial color="#3f7d2a" flatShading /></mesh>
				</group>
			))}
		</group>
	);
}

function Warung() {
	const W = WARUNG;
	const cx = (W.x0 + W.x1) / 2, cz = (W.z0 + W.z1) / 2, lz = W.z1 - W.z0, lx = W.x1 - W.x0;
	const jajan = ["#ef4444", "#facc15", "#22c55e", "#3b82f6", "#f97316", "#ec4899", "#a855f7"];
	return (
		<group>
			<Gabung bayangan tekstur>
				{/* lantai semen, dinding belakang & samping bilik, atap seng miring */}
				<mesh position={[cx, 0.08, cz]}><boxGeometry args={[lx, 0.16, lz]} /><meshStandardMaterial color="#a8a29e" /></mesh>
				<mesh position={[W.x1 - 0.1, 1.5, cz]} material={bahanBangunan("bilik", "#e2cfa4", 6, 3)}><boxGeometry args={[0.2, 3, lz]} /></mesh>
				{[W.z0, W.z1].map((z) => <mesh key={z} position={[cx, 1.5, z]} material={bahanBangunan("bilik", "#e2cfa4", 6, 3)}><boxGeometry args={[lx, 3, 0.2]} /></mesh>)}
				{[W.z0 + 0.1, W.z1 - 0.1].map((z) => <mesh key={z} position={[W.x0 - 0.7, 1.5, z]}><boxGeometry args={[0.14, 3, 0.14]} /><meshStandardMaterial color="#6b4a2b" /></mesh>)}
				<mesh position={[cx - 0.4, 3.25, cz]} rotation-z={-0.16} material={bahanBangunan("seng", "#b6c2cf", 1, 6, { metalness: 0.45, roughness: 0.45 })}><boxGeometry args={[lx + 2.2, 0.08, lz + 0.8]} /></mesh>
				{/* meja etalase di depan */}
				<mesh position={[MEJA_WARUNG.x + 0.2, 0.55, MEJA_WARUNG.z]} material={bahanBangunan("papan", "#a0703f", 3, 1.2)}><boxGeometry args={[0.9, 1.1, lz - 1]} /></mesh>
				<mesh position={[MEJA_WARUNG.x + 0.2, 1.12, MEJA_WARUNG.z]}><boxGeometry args={[1, 0.06, lz - 0.8]} /><meshStandardMaterial color="#6b4a2b" /></mesh>
				{/* toples kerupuk di meja */}
				{[-1.8, -0.9, 0, 0.9, 1.8].map((dz, i) => (
					<group key={dz} position={[MEJA_WARUNG.x + 0.2, 1.3, MEJA_WARUNG.z + dz]}>
						<mesh><cylinderGeometry args={[0.17, 0.17, 0.32, 10]} /><meshStandardMaterial color="#e0f2fe" roughness={0.2} /></mesh>
						<mesh position-y={0.2}><cylinderGeometry args={[0.18, 0.18, 0.06, 10]} /><meshStandardMaterial color={jajan[i]} /></mesh>
					</group>
				))}
				{/* rak barang di dinding belakang */}
				{[0.9, 1.6, 2.3].map((h) => (
					<group key={h}>
						<mesh position={[W.x1 - 0.5, h, cz]}><boxGeometry args={[0.6, 0.05, lz - 1]} /><meshStandardMaterial color="#6b4a2b" /></mesh>
						{Array.from({ length: 9 }, (_, j) => <mesh key={j} position={[W.x1 - 0.5, h + 0.17, W.z0 + 0.9 + j * 0.6]}><boxGeometry args={[0.3, 0.3, 0.35]} /><meshStandardMaterial color={jajan[(j + Math.round(h * 3)) % jajan.length]} /></mesh>)}
					</group>
				))}
				{/* bale-bale bambu & galon air */}
				<mesh position={[(BALE_WARUNG.x0 + BALE_WARUNG.x1) / 2, 0.5, (BALE_WARUNG.z0 + BALE_WARUNG.z1) / 2]}><boxGeometry args={[1, 0.1, 2]} /><meshStandardMaterial color="#c9a95a" /></mesh>
				{[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <mesh key={`${sx}${sz}`} position={[(BALE_WARUNG.x0 + BALE_WARUNG.x1) / 2 + sx * 0.4, 0.25, (BALE_WARUNG.z0 + BALE_WARUNG.z1) / 2 + sz * 0.9]}><boxGeometry args={[0.07, 0.5, 0.07]} /><meshStandardMaterial color="#a8834a" /></mesh>))}
				<mesh position={[W.x0 + 0.6, 0.45, W.z0 + 0.6]}><cylinderGeometry args={[0.2, 0.2, 0.6, 10]} /><meshStandardMaterial color="#38bdf8" roughness={0.2} /></mesh>
				{/* gerobak gorengan */}
				<group position={[W.x0 - 1.6, 0, W.z0 + 0.4]}>
					<mesh position-y={0.85}><boxGeometry args={[0.8, 0.6, 1.6]} /><meshStandardMaterial color="#f8fafc" /></mesh>
					<mesh position-y={1.2}><boxGeometry args={[0.82, 0.08, 1.62]} /><meshStandardMaterial color="#ef4444" /></mesh>
					{[-0.6, 0.6].map((z) => <mesh key={z} position={[0.45, 0.3, z]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.28, 0.28, 0.08, 12]} /><meshStandardMaterial color="#1f2937" /></mesh>)}
				</group>
			</Gabung>
			{/* renceng kopi & jajanan bergantung di depan */}
			{Array.from({ length: 10 }, (_, j) => <Renceng key={j} x={W.x0 - 0.45} z={W.z0 + 0.6 + j * 0.58} warna={jajan[j % jajan.length]} />)}
			<Papan
				posisi={[W.x0 - 0.75, 3.05, (W.z0 + W.z1) / 2]}
				rotasi={-Math.PI / 2}
				lebar={4.4}
				tinggi={0.8}
				latar="#b91c1c"
				aksen="#fde047"
				baris={[
					{ teks: "WARUNG BU IMAS", ukuran: 0.3, tebal: true, warna: "#fef9c3", y: 0.45 },
					{ teks: "Kopi · Gorengan · Nasi timbel · Alat & bahan", ukuran: 0.11, warna: "#fde68a", y: 0.82 },
				]}
			/>
		</group>
	);
}

function Renceng({ x, z, warna }) {
	const ref = useRef();
	useFrame(({ clock }) => { ref.current.rotation.x = Math.sin(clock.elapsedTime * 2 + z * 3) * 0.08; });
	return (
		<group ref={ref} position={[x, 2.95, z]}>
			{[0, 1, 2, 3].map((k) => <mesh key={k} position-y={-0.15 - k * 0.2}><boxGeometry args={[0.03, 0.17, 0.22]} /><meshStandardMaterial color={warna} /></mesh>)}
		</group>
	);
}

function Mushola() {
	const M = MUSHOLA;
	return (
		<group position={[M.x, 0, M.z]}>
			<mesh position-y={0.25} material={bahanBangunan("batu", "#d6d3d1", 6, 0.5)}><boxGeometry args={[7.4, 0.5, 7.4]} /></mesh>
			<mesh position-y={2} material={bahanBangunan("tembok", "#ffffff", 2, 1)}><boxGeometry args={[6.2, 3, 6.2]} /></mesh>
			<mesh position-y={3.7} rotation-y={Math.PI / 4} material={bahanBangunan("genteng", "#3f9a5c", 10, 3)}><coneGeometry args={[5.2, 1.8, 4]} /></mesh>
			<mesh position-y={4.9}><sphereGeometry args={[1.1, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#15803d" metalness={0.3} roughness={0.4} /></mesh>
			<mesh position-y={6.25}><cylinderGeometry args={[0.04, 0.04, 0.7, 5]} /><meshStandardMaterial color="#facc15" metalness={0.6} /></mesh>
			<mesh position-y={6.65}><torusGeometry args={[0.16, 0.035, 5, 12, Math.PI * 1.5]} /><meshStandardMaterial color="#facc15" metalness={0.6} /></mesh>
			<mesh position={[0, 1.6, 3.11]}><boxGeometry args={[1.6, 2.2, 0.04]} /><meshStandardMaterial color="#78350f" /></mesh>
			{[-2.2, 2.2].map((dx) => <mesh key={dx} material={bahanJendela} position={[dx, 2.2, 3.11]}><boxGeometry args={[1, 1.2, 0.04]} /></mesh>)}
			{/* bedug di teras */}
			<mesh position={[2.9, 1.1, 4.1]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.45, 0.45, 0.9, 14]} /><meshStandardMaterial color="#92400e" /></mesh>
		</group>
	);
}

function KampungLain() {
	const P = POS_RONDA, K = KANDANG_AYAM, KL = KOLAM_IKAN;
	return (
		<Gabung bayangan tekstur>
			{/* pos ronda dengan kentongan */}
			<group position={[P.x, 0, P.z]}>
				{[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <mesh key={`${sx}${sz}`} position={[sx * 1.1, 1.2, sz * 0.8]}><boxGeometry args={[0.12, 2.4, 0.12]} /><meshStandardMaterial color="#6b4a2b" /></mesh>))}
				<mesh position-y={0.6}><boxGeometry args={[2.4, 0.1, 1.8]} /><meshStandardMaterial color="#a8834a" /></mesh>
				<mesh position-y={2.55} rotation-y={Math.PI / 4} material={bahanBangunan("genteng", "#b4532a", 4, 1.5)}><coneGeometry args={[1.9, 0.8, 4]} /></mesh>
				<mesh position={[1.1, 1.6, -0.95]}><cylinderGeometry args={[0.1, 0.1, 0.7, 8]} /><meshStandardMaterial color="#a16207" /></mesh>
			</group>
			{/* kandang ayam panggung */}
			<group position={[K.x, 0, K.z]}>
				{[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <mesh key={`${sx}${sz}`} position={[sx * 1.4, 0.4, sz * 1]}><boxGeometry args={[0.1, 0.8, 0.1]} /><meshStandardMaterial color="#6b4a2b" /></mesh>))}
				<mesh position-y={1.2} material={bahanBangunan("bilik", "#d9bf7a", 3, 1)}><boxGeometry args={[3, 1, 2.2]} /></mesh>
				<mesh position-y={1.95} rotation-y={Math.PI / 4}><coneGeometry args={[2.3, 0.6, 4]} /><meshStandardMaterial color="#7c2d12" /></mesh>
				<mesh position={[0.6, 0.55, 1.4]} rotation-x={-0.6}><boxGeometry args={[0.5, 0.05, 1.2]} /><meshStandardMaterial color="#8b5e34" /></mesh>
			</group>
			{/* kolam ikan berbatu */}
			<group position={[KL.x, 0, KL.z]}>
				{Array.from({ length: 18 }, (_, i) => {
					const a = (i / 18) * Math.PI * 2;
					return <mesh key={i} position={[Math.cos(a) * KL.r, 0.15, Math.sin(a) * KL.r]} rotation-y={a}><dodecahedronGeometry args={[0.45 + acak(i) * 0.25, 0]} /><meshStandardMaterial color="#78716c" flatShading /></mesh>;
				})}
			</group>
			{/* gawang lapangan bola */}
			{[LAPANGAN.x0 + 1, LAPANGAN.x1 - 1].map((x) => (
				<group key={x} position={[x, 0, (LAPANGAN.z0 + LAPANGAN.z1) / 2]}>
					{[-1.5, 1.5].map((dz) => <mesh key={dz} position={[0, 0.9, dz]}><cylinderGeometry args={[0.06, 0.06, 1.8, 6]} /><meshStandardMaterial color="#f8fafc" /></mesh>)}
					<mesh position-y={1.8}><boxGeometry args={[0.1, 0.1, 3.1]} /><meshStandardMaterial color="#f8fafc" /></mesh>
				</group>
			))}
		</Gabung>
	);
}

function GapuraDesa({ kecamatan, gunung }) {
	const G = GAPURA_DESA;
	return (
		<group>
			<Gabung bayangan>
				{[-1, 1].map((s) => (
					<group key={s} position={[G.x + s * 2.6, 0, G.z]}>
						<mesh position-y={2.2}><boxGeometry args={[0.6, 4.4, 0.6]} /><meshStandardMaterial color="#f8fafc" /></mesh>
						<mesh position-y={4.6}><boxGeometry args={[0.8, 0.4, 0.8]} /><meshStandardMaterial color="#b91c1c" /></mesh>
						<mesh position-y={5.05}><coneGeometry args={[0.55, 0.6, 4]} /><meshStandardMaterial color="#b91c1c" /></mesh>
						{[0.6, 1.4, 2.2, 3, 3.8].map((h) => <mesh key={h} position-y={h}><boxGeometry args={[0.64, 0.08, 0.64]} /><meshStandardMaterial color="#dc2626" /></mesh>)}
					</group>
				))}
				<mesh position={[G.x, 4.3, G.z]}><boxGeometry args={[5.8, 0.25, 0.4]} /><meshStandardMaterial color="#b91c1c" /></mesh>
			</Gabung>
			<Papan
				posisi={[G.x, 3.55, G.z - 0.22]}
				rotasi={Math.PI}
				lebar={4.4}
				tinggi={1.1}
				latar="#0f172a"
				aksen="#facc15"
				baris={[
					{ teks: "WILUJENG SUMPING", ukuran: 0.2, tebal: true, warna: "#fde68a", y: 0.3 },
					{ teks: `KECAMATAN ${String(kecamatan).toUpperCase()}`, ukuran: 0.25, tebal: true, warna: "#f8fafc", y: 0.6 },
					{ teks: `Latar: ${gunung.nama}`, ukuran: 0.1, warna: "#94a3b8", y: 0.86 },
				]}
			/>
			{/* umbul-umbul di tepi jalan kampung */}
			{[-30, -40, -46, -52, -58].filter((z) => z < WARUNG.z0 - 2 || z > BALE_WARUNG.z1 + 1).flatMap((z) => [-1, 1].map((s) => <Umbul key={`${z}${s}`} x={JALAN_NS.x + s * 2.8} z={z} warna={s > 0 ? "#dc2626" : "#f8fafc"} />))}
		</group>
	);
}

function Umbul({ x, z, warna }) {
	const ref = useRef();
	useFrame(({ clock }) => { ref.current.rotation.y = Math.sin(clock.elapsedTime * 2.2 + z) * 0.3; });
	return (
		<group position={[x, 0, z]}>
			<mesh position-y={2.5}><cylinderGeometry args={[0.04, 0.05, 5, 5]} /><meshStandardMaterial color="#c9a95a" /></mesh>
			<group ref={ref} position-y={4.6}>
				<mesh position={[0.18, -1, 0]}><planeGeometry args={[0.36, 2]} /><meshStandardMaterial color={warna} side={DoubleSide} /></mesh>
			</group>
		</group>
	);
}

/** pohon kelapa, rumpun bambu, pohon besar di tepi dunia */
function Pepohonan() {
	const { tepi, kelapa, bambu } = useMemo(() => {
		const B = BATAS_DUNIA;
		const tepi = [];
		for (let i = 0; i < 120; i++) {
			const sisi = i % 4, t = acak(i * 3.1);
			const z1 = Math.max(B.z1, 60); // pepohonan tetap di tepi jauh walau pemain dipagari
			const x = sisi === 0 ? B.x0 - 3 - acak(i) * 14 : sisi === 1 ? B.x1 + 3 + acak(i) * 14 : B.x0 + t * (B.x1 - B.x0);
			const z = sisi === 2 ? B.z0 - 3 - acak(i * 2) * 14 : sisi === 3 ? z1 + 3 + acak(i * 2) * 14 : B.z0 + t * (z1 - B.z0);
			tepi.push([x, 0, z, 1.2 + acak(i * 7) * 1.4]);
		}
		const kelapa = KELAPA.map(([x, z], i) => [x, 0, z, 1 + acak(i) * 0.3, acak(i * 3) * 6]);
		return { tepi, kelapa, bambu: BAMBU };
	}, []);
	const bahanDaun = useMemo(() => bahanAngin({ roughness: 0.95, flatShading: true }, { kuat: 0.25, tinggi: 3.6 }), []);
	const bahanBambu = useMemo(() => bahanAngin({ color: "#7a9a3a", roughness: 0.9 }, { kuat: 0.5, tinggi: 9, tengah: true }), []);
	const daunKelapa = useMemo(() => bahanAngin({ color: "#4d7c2a", roughness: 0.9, side: DoubleSide }, { kuat: 0.25, tinggi: 0.1 }), []);
	return (
		<group>
			<Banyak titik={tepi.map(([x, , z, s]) => [x, 2 * s, z, s])}><cylinderGeometry args={[0.25, 0.38, 4, 7]} /><meshStandardMaterial color="#5b3b22" /></Banyak>
			<Banyak titik={tepi.map(([x, , z, s], i) => [x, 5.3 * s, z, s * 1.6, i])} material={bahanDaun} warna={["#2f6b26", "#3a7d2c", "#285e20", "#447f2f"]}><icosahedronGeometry args={[1.8, 1]} /></Banyak>
			{/* kelapa: batang miring + mahkota daun */}
			{kelapa.map(([x, , z, s, ry], i) => (
				<group key={i} position={[x, 0, z]} rotation-y={ry} scale={s}>
					<mesh position={[0.4, 3.5, 0]} rotation-z={-0.12} castShadow><cylinderGeometry args={[0.16, 0.24, 7, 7]} /><meshStandardMaterial color="#8b7355" /></mesh>
					<group position={[0.85, 7, 0]}>
						{Array.from({ length: 8 }, (_, j) => (
							<mesh key={j} material={daunKelapa} rotation={[0, (j / 8) * Math.PI * 2, 0.55]} position={[Math.cos((j / 8) * Math.PI * 2) * 0.9, -0.3, -Math.sin((j / 8) * Math.PI * 2) * 0.9]} castShadow>
								<boxGeometry args={[2.4, 0.04, 0.5]} />
							</mesh>
						))}
						{[0, 2, 4].map((a) => <mesh key={a} position={[Math.cos(a) * 0.25, -0.35, Math.sin(a) * 0.25]}><sphereGeometry args={[0.2, 7, 5]} /><meshStandardMaterial color="#4d6b1f" /></mesh>)}
					</group>
				</group>
			))}
			{/* rumpun bambu */}
			{bambu.map(([x, z], i) => (
				<Banyak key={i} titik={Array.from({ length: 14 }, (_, j) => [x + Math.cos(j * 2.4) * (0.5 + (j % 3) * 0.5), 4.5, z + Math.sin(j * 2.4) * (0.5 + (j % 3) * 0.5), 1, j, 0.8 + acak(i + j) * 0.4])} material={bahanBambu}>
					<cylinderGeometry args={[0.08, 0.1, 9, 5]} />
				</Banyak>
			))}
			<Banyak titik={bambu.flatMap(([x, z], i) => Array.from({ length: 5 }, (_, j) => [x + (acak(i * 5 + j) - 0.5) * 3, 7.5 + acak(j + i) * 2, z + (acak(i * 3 + j) - 0.5) * 3, 1.6]))} material={bahanDaun} warna={["#6b8f2a", "#7ea33a"]}>
				<icosahedronGeometry args={[1.4, 0]} />
			</Banyak>
		</group>
	);
}

function Pegunungan({ gunung }) {
	const bukit = useMemo(() => Array.from({ length: 22 }, (_, i) => {
		const a = (i / 22) * Math.PI * 2;
		return [Math.cos(a) * (150 + acak(i) * 30), Math.sin(a) * (150 + acak(i * 2) * 30), 14 + acak(i * 5) * 16, 40 + acak(i * 7) * 25];
	}), []);
	return (
		<group>
			{gunung.puncak.map(([x, z, tinggi, jari], i) => (
				<mesh key={i} position={[x, tinggi / 2 - 4, z]}>
					<coneGeometry args={[jari, tinggi, 9]} />
					<meshStandardMaterial color={i % 2 ? "#587a82" : "#66888c"} roughness={1} flatShading />
				</mesh>
			))}
			{bukit.map(([x, z, t, r], i) => (
				<mesh key={i} position={[x, -2, z]} scale={[r, t, r]}>
					<sphereGeometry args={[1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
					<meshStandardMaterial color={i % 3 ? "#5e8a3c" : "#4f7a33"} roughness={1} flatShading />
				</mesh>
			))}
		</group>
	);
}

function JembatanBambu({ x, z, rot = 0 }) {
	return (
		<group position={[x, 0, z]} rotation-y={rot}>
			{Array.from({ length: 7 }, (_, i) => <mesh key={i} position={[0, 0.12, (i - 3) * 0.32]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.09, 0.09, 3.2, 6]} /><meshStandardMaterial color="#c9a95a" /></mesh>)}
			{[-1, 1].map((s) => <mesh key={s} position={[s * 1.4, 0.55, 0]}><boxGeometry args={[0.06, 0.06, 2.4]} /><meshStandardMaterial color="#a8834a" /></mesh>)}
		</group>
	);
}

export default function LingkunganDesa({ kecamatan, model, game, varian }) {
	const gunung = useMemo(() => gunungUntuk(kecamatan), [kecamatan]);
	useFrame((_, dt) => {
		waktuAngin.value += Math.min(0.05, dt);
		kuatAngin.value = 1 + kebun.cuaca.hujan * 1.4;
	});
	const utara = model === "kolam" ? <Sawah kolam />
		: game !== "bertani" ? <Sawah utara={false} />
		: model === "padi" || model === "ubi" ? <Sawah />
		: model === "hias" ? <><Sawah utara={false} /><Pembibitan /></>
		: <><Sawah utara={false} /><KebunBuah /></>;
	return (
		<group>
			<Langit />
			<LangitMalam />
			<KunangKunang />
			<Matahari />
			<Awan />
			<Hujan />
			<Pelangi />
			<Pegunungan gunung={gunung} />
			<Tanah />
			{utara}
			<KhasUsaha game={game} varian={varian} kecamatan={kecamatan} />
			<Gabung bayangan tekstur>
				{RUMAH.map(([x, z, rot], i) => <RumahPanggung key={i} x={x} z={z} rot={rot} i={i} />)}
			</Gabung>
			<Warung />
			<Gabung bayangan tekstur><Mushola /></Gabung>
			<KampungLain />
			<GapuraDesa kecamatan={kecamatan} gunung={gunung} />
			<Pepohonan />
			<JembatanBambu x={SALURAN[0].x} z={0} rot={Math.PI / 2} />
			<JembatanBambu x={(KEBUN.x0 + KEBUN.x1) / 2 - 4} z={SALURAN[1].z} />
			<JembatanBambu x={-TATA.sisiLapangan * 40} z={SALURAN[1].z} />
			<mesh rotation-x={-Math.PI / 2} position={[KOLAM_IKAN.x, 0.05, KOLAM_IKAN.z]}>
				<circleGeometry args={[KOLAM_IKAN.r, 24]} />
				<meshStandardMaterial color="#3f7f8f" roughness={0.1} metalness={0.3} />
			</mesh>
		</group>
	);
}
