import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { KECAMATAN_DATA, BOGOR_BOUNDARY } from "./dataWilayah";
import { useSlideAktif } from "./dek/slideAktif";

/*
 * Relief 3D Kabupaten Bogor untuk hero landing page.
 *
 * Dilihat dari utara (arah Jakarta) ke selatan, sehingga Salak, Halimun, dan
 * Gede-Pangrango menjadi latar belakang. Ketinggian adalah pendekatan dari
 * puncak-puncak utama (bukan DEM), dibesarkan 4,5x supaya terbaca. Batas
 * kecamatan dihitung di shader sebagai Voronoi dari titik pusat kecamatan,
 * sama seperti peta interaktif di bawahnya. Titik = desa/kelurahan, jumlahnya
 * sesuai data per kecamatan; letaknya sebaran di sekitar pusat kecamatan.
 * Medan di luar kabupaten tetap digambar redup supaya gunung di perbatasan
 * (puncak Gede-Pangrango ada di luar batas) terlihat utuh.
 */

const LNG0 = 106.8;
const LAT0 = -6.545;
const S = 100; // unit per derajat
const SKALA_Y = (0.9 * 4.5) / 1000; // unit per meter (dibesarkan 4,5x)
const BATAS = { lngMin: 106.3, lngMax: 107.28, latMin: -6.95, latMax: -6.24 };
// sRGB mentah, sama persis dengan latar CSS #0a1220 (shader tidak mengonversi warna)
const WARNA_LATAR = new THREE.Vector3(10 / 255, 18 / 255, 32 / 255);

const PUNCAK = [
	{ lat: -6.716, lng: 106.733, m: 1700, s: 0.05 }, // Salak
	{ lat: -6.77, lng: 106.963, m: 1900, s: 0.05 }, // Pangrango
	{ lat: -6.787, lng: 106.984, m: 700, s: 0.025 }, // Gede
	{ lat: -6.705, lng: 106.47, m: 1350, s: 0.07 }, // Halimun
	{ lat: -6.665, lng: 106.535, m: 900, s: 0.045 },
	{ lat: -6.605, lng: 107.05, m: 850, s: 0.06 }, // Sukamakmur
	{ lat: -6.625, lng: 107.155, m: 650, s: 0.05 },
	{ lat: -6.56, lng: 106.93, m: 330, s: 0.04 }, // Hambalang
	{ lat: -6.5, lng: 106.47, m: 280, s: 0.06 },
];

const LABEL_RELIEF = [
	{ nama: "Gunung Salak", ket: "2.211 mdpl", lat: -6.716, lng: 106.733 },
	{ nama: "Gede-Pangrango", ket: "3.019 mdpl", lat: -6.775, lng: 106.97 },
	{ nama: "Halimun", ket: "taman nasional", lat: -6.705, lng: 106.47 },
	{ nama: "Cibinong", ket: "pusat pemerintahan", lat: -6.4806, lng: 106.8338, kota: true },
];

const ke3d = (lat, lng) => [(lng - LNG0) * S, -(lat - LAT0) * S];

const hash = (i, j) => {
	const x = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
	return x - Math.floor(x);
};
const halus = (t) => t * t * (3 - 2 * t);
function derau(x, y) {
	const i = Math.floor(x), j = Math.floor(y);
	const fx = halus(x - i), fy = halus(y - j);
	const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
	return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** Ketinggian perkiraan (meter) di satu titik. */
function tinggiM(lat, lng) {
	const t = Math.min(1, Math.max(0, (-6.42 - lat) / 0.3));
	let h = 60 + 450 * t * t;
	for (const p of PUNCAK) {
		const d2 = (lat - p.lat) ** 2 + (lng - p.lng) ** 2;
		h += p.m * Math.exp(-d2 / (2 * p.s * p.s));
	}
	const f = 1 / 0.03;
	const n = derau(lng * f, lat * f) * 0.6 + derau(lng * f * 2.3, lat * f * 2.3) * 0.3 + derau(lng * f * 5.1, lat * f * 5.1) * 0.1;
	return h + (n - 0.5) * 2 * 90 * (0.3 + t);
}

const POLI = BOGOR_BOUNDARY.map(([lat, lng]) => [lng, lat]);
function diDalam(lng, lat) {
	let dalam = false;
	for (let i = 0, j = POLI.length - 1; i < POLI.length; j = i++) {
		const [xi, yi] = POLI[i], [xj, yj] = POLI[j];
		if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) dalam = !dalam;
	}
	return dalam;
}

function terdekat(lng, lat) {
	let terbaik = -1, jarak = Infinity;
	KECAMATAN_DATA.forEach((k, i) => {
		const d = (k.lng - lng) ** 2 + (k.lat - lat) ** 2;
		if (d < jarak) { jarak = d; terbaik = i; }
	});
	return terbaik;
}

function bangunMedan(nx, nz) {
	const jumlah = (nx + 1) * (nz + 1);
	const posisi = new Float32Array(jumlah * 3);
	const tinggi = new Float32Array(jumlah);
	const ll = new Float32Array(jumlah * 2);
	for (let iz = 0; iz <= nz; iz++) {
		const lat = BATAS.latMax - (iz / nz) * (BATAS.latMax - BATAS.latMin);
		for (let ix = 0; ix <= nx; ix++) {
			const lng = BATAS.lngMin + (ix / nx) * (BATAS.lngMax - BATAS.lngMin);
			const i = iz * (nx + 1) + ix;
			const tepi = Math.min(lng - BATAS.lngMin, BATAS.lngMax - lng, lat - BATAS.latMin, BATAS.latMax - lat);
			const h = tinggiM(lat, lng) * halus(Math.min(1, tepi / 0.12));
			const [x, z] = ke3d(lat, lng);
			posisi.set([x, h * SKALA_Y, z], i * 3);
			tinggi[i] = h;
			ll.set([lng, lat], i * 2);
		}
	}
	const indeks = [];
	for (let iz = 0; iz < nz; iz++) {
		for (let ix = 0; ix < nx; ix++) {
			const a = iz * (nx + 1) + ix, b = a + 1, c = a + nx + 1, d = c + 1;
			indeks.push(a, c, b, b, c, d);
		}
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute("position", new THREE.BufferAttribute(posisi, 3));
	g.setAttribute("aTinggi", new THREE.BufferAttribute(tinggi, 1));
	g.setAttribute("aLL", new THREE.BufferAttribute(ll, 2));
	g.setIndex(indeks);
	g.computeVertexNormals();
	return g;
}

function bangunDesa() {
	const pusat = KECAMATAN_DATA.find((k) => k.name === "Cibinong");
	const pos = [], tunda = [], kec = [], jenis = [];
	KECAMATAN_DATA.forEach((k, ki) => {
		const n = k.desa + k.kelurahan;
		let ditaruh = 0;
		for (let coba = 0; ditaruh < n && coba < 600; coba++) {
			const r = Math.sqrt(hash(ki * 7.3 + coba, coba * 1.7)) * 0.045;
			const a = hash(coba * 3.1, ki * 11.9) * Math.PI * 2;
			const lat = k.lat + Math.sin(a) * r, lng = k.lng + Math.cos(a) * r;
			if (terdekat(lng, lat) !== ki || !diDalam(lng, lat)) continue;
			const [x, z] = ke3d(lat, lng);
			pos.push(x, tinggiM(lat, lng) * SKALA_Y + 0.18, z);
			const jauh = Math.hypot(lat - pusat.lat, lng - pusat.lng) / 0.55;
			tunda.push(Math.min(1, jauh) * 0.85 + hash(ki, coba) * 0.12);
			kec.push(ki);
			jenis.push(ditaruh < k.kelurahan ? 1 : 0);
			ditaruh++;
		}
	});
	const g = new THREE.BufferGeometry();
	g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute("aTunda", new THREE.Float32BufferAttribute(tunda, 1));
	g.setAttribute("aKec", new THREE.Float32BufferAttribute(kec, 1));
	g.setAttribute("aJenis", new THREE.Float32BufferAttribute(jenis, 1));
	return g;
}

const VERT_MEDAN = /* glsl */ `
	attribute float aTinggi;
	attribute vec2 aLL;
	uniform float uNaik;
	varying float vTinggi;
	varying vec2 vLL;
	varying vec3 vNormal;
	varying vec3 vDunia;
	void main() {
		vec3 p = position;
		p.y *= uNaik;
		vTinggi = aTinggi;
		vLL = aLL;
		// normal untuk geometri yang diskalakan di sumbu y
		vNormal = normalize(vec3(normal.x * uNaik, normal.y, normal.z * uNaik));
		vec4 dunia = modelMatrix * vec4(p, 1.0);
		vDunia = dunia.xyz;
		gl_Position = projectionMatrix * viewMatrix * dunia;
	}
`;

const FRAG_MEDAN = /* glsl */ `
	uniform float uNaik;
	uniform float uKontur;
	uniform int uSorot;
	uniform vec2 uKec[${KECAMATAN_DATA.length}];
	uniform vec3 uLatar;
	uniform vec2 uKabut;
	uniform vec2 uBatas[${POLI.length}];
	varying float vTinggi;
	varying vec2 vLL;
	varying vec3 vNormal;
	varying vec3 vDunia;

	vec3 tanjakan(float h) {
		vec3 c = mix(vec3(0.063, 0.106, 0.180), vec3(0.090, 0.145, 0.235), smoothstep(0.0, 450.0, h));
		c = mix(c, vec3(0.145, 0.208, 0.310), smoothstep(450.0, 1100.0, h));
		c = mix(c, vec3(0.255, 0.318, 0.420), smoothstep(1100.0, 1900.0, h));
		return mix(c, vec3(0.447, 0.502, 0.588), smoothstep(1900.0, 2800.0, h));
	}

	void main() {
		// batas kabupaten: uji titik-dalam-poligon dan jarak ke garis tepi
		bool dalam = false;
		float tepiKab = 1e9;
		for (int i = 0; i < ${POLI.length - 1}; i++) {
			vec2 a = uBatas[i], b = uBatas[i + 1];
			if ((a.y > vLL.y) != (b.y > vLL.y) && vLL.x < (b.x - a.x) * (vLL.y - a.y) / (b.y - a.y) + a.x) dalam = !dalam;
			vec2 pa = vLL - a, ba = b - a;
			tepiKab = min(tepiKab, length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)));
		}
		float luar = dalam ? 0.0 : 1.0;
		vec3 n = normalize(vNormal);
		float cahaya = 0.42 + 0.7 * max(dot(n, normalize(vec3(0.35, 0.85, -0.45))), 0.0);
		vec3 warna = tanjakan(vTinggi) * cahaya;

		// garis kontur: tiap 100 m tipis, tiap 500 m lebih tegas
		float k1 = vTinggi / 100.0;
		float g1 = 1.0 - smoothstep(0.0, fwidth(k1) * 1.1, min(fract(k1), 1.0 - fract(k1)));
		float k5 = vTinggi / 500.0;
		float g5 = 1.0 - smoothstep(0.0, fwidth(k5) * 1.6, min(fract(k5), 1.0 - fract(k5)));
		vec3 emas = vec3(0.890, 0.698, 0.235);
		warna = mix(warna, emas, (g1 * 0.16 + g5 * 0.42) * uKontur * (1.0 - luar * 0.7));

		// batas kecamatan (Voronoi dari titik pusat)
		float d1 = 1e9, d2 = 1e9;
		int i1 = -1;
		for (int i = 0; i < ${KECAMATAN_DATA.length}; i++) {
			vec2 q = vLL - uKec[i];
			float d = dot(q, q);
			if (d < d1) { d2 = d1; d1 = d; i1 = i; } else if (d < d2) { d2 = d; }
		}
		float tepi = sqrt(d2) - sqrt(d1);
		float px = length(fwidth(vLL));
		float garis = 1.0 - smoothstep(px * 0.5, px * 1.4, tepi);
		warna = mix(warna, vec3(0.886, 0.910, 0.941), garis * 0.5 * uKontur * (1.0 - luar));
		if (i1 == uSorot && luar < 0.5) warna = mix(warna, emas, 0.22);
		// di luar kabupaten hanya gunung yang tampil (siluet), dataran larut ke latar
		vec3 redup = mix(uLatar, max(warna, uLatar), 0.5 * smoothstep(600.0, 1600.0, vTinggi));
		warna = mix(warna, redup, luar);
		float pantai = 1.0 - smoothstep(px * 0.8, px * 2.0, tepiKab);
		warna = mix(warna, vec3(0.886, 0.910, 0.941), pantai * 0.85);

		// kabut: Bogor jarang terlihat tanpa kabut di kejauhan
		float jauh = smoothstep(uKabut.x, uKabut.y, distance(vDunia, cameraPosition));
		warna = mix(warna, uLatar, jauh * 0.75);
		// tepi kotak medan larut ke latar
		float tepiKotak = min(min(vLL.x - ${BATAS.lngMin.toFixed(3)}, ${BATAS.lngMax.toFixed(3)} - vLL.x), min(vLL.y - (${BATAS.latMin.toFixed(3)}), ${BATAS.latMax.toFixed(3)} - vLL.y));
		gl_FragColor = vec4(mix(uLatar, warna, smoothstep(0.0, 0.16, tepiKotak)), 1.0);
	}
`;

const VERT_DESA = /* glsl */ `
	attribute float aTunda;
	attribute float aKec;
	attribute float aJenis;
	uniform float uNaik;
	uniform float uMuncul;
	uniform float uSkala;
	uniform int uSorot;
	varying float vNyala;
	varying float vJenis;
	void main() {
		vec3 p = position;
		p.y = (p.y - 0.18) * uNaik + 0.18;
		vec4 mv = modelViewMatrix * vec4(p, 1.0);
		vNyala = smoothstep(aTunda, aTunda + 0.12, uMuncul);
		vJenis = aJenis;
		float sorot = int(aKec + 0.5) == uSorot ? 1.7 : 1.0;
		gl_PointSize = uSkala * sorot * vNyala * (120.0 / -mv.z);
		gl_Position = projectionMatrix * mv;
	}
`;

const FRAG_DESA = /* glsl */ `
	varying float vNyala;
	varying float vJenis;
	void main() {
		float d = length(gl_PointCoord - 0.5);
		float a = 1.0 - smoothstep(0.32, 0.5, d);
		vec3 c = mix(vec3(0.957, 0.780, 0.325), vec3(0.973, 0.980, 0.988), vJenis);
		gl_FragColor = vec4(c, a * vNyala);
	}
`;

const ringan = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
const tenang = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Adegan({ penanda, tip }) {
	const { camera, size, gl } = useThree();
	const medan = useMemo(() => (ringan ? bangunMedan(160, 116) : bangunMedan(290, 210)), []);
	const desa = useMemo(bangunDesa, []);
	const seragam = useMemo(() => ({
		uNaik: { value: tenang ? 1 : 0 },
		uKontur: { value: tenang ? 1 : 0 },
		uMuncul: { value: tenang ? 1.2 : 0 },
		uSorot: { value: -1 },
		uSkala: { value: (ringan ? 4.2 : 5.2) * Math.min(gl.getPixelRatio(), 2) },
		uKec: { value: KECAMATAN_DATA.map((k) => new THREE.Vector2(k.lng, k.lat)) },
		uLatar: { value: WARNA_LATAR },
		uKabut: { value: new THREE.Vector2(120, 200) },
		uBatas: { value: POLI.map(([lng, lat]) => new THREE.Vector2(lng, lat)) },
	}), [gl]);
	const mulai = useRef(null);
	const matMedan = useRef(null);
	const matDesa = useRef(null);
	const arah = useRef({ x: 0, y: 0 });
	const v = useMemo(() => new THREE.Vector3(), []);
	const target = useMemo(() => new THREE.Vector3(0, 0, 3), []);

	useEffect(() => {
		const gerak = (e) => {
			arah.current.x = (e.clientX / window.innerWidth) * 2 - 1;
			arah.current.y = (e.clientY / window.innerHeight) * 2 - 1;
		};
		window.addEventListener("pointermove", gerak, { passive: true });
		return () => window.removeEventListener("pointermove", gerak);
	}, []);

	useFrame((state) => {
		const t = state.clock.elapsedTime;
		if (mulai.current === null) mulai.current = t;
		const jalan = t - mulai.current;
		if (!tenang) {
			const naik = Math.min(1, jalan / 2.4);
			seragam.uNaik.value = 1 - (1 - naik) ** 3;
			seragam.uKontur.value = Math.min(1, Math.max(0, (jalan - 1.4) / 1.2));
			seragam.uMuncul.value = Math.min(1.2, Math.max(0, (jalan - 1.2) / 2.2) * 1.2);
		}
		const goyang = tenang ? 0 : Math.sin(t * 0.07) * 0.08;
		const az = Math.PI + goyang + arah.current.x * 0.05;
		const kutub = 1.1 - arah.current.y * 0.03;
		const aspek = size.width / Math.max(1, size.height);
		const porsi = 0.74; // bagian lebar kanvas yang dipakai peta (sisi depan tampak lebih lebar)
		const r = Math.min(280, Math.max(100, (83 / porsi / (2 * Math.tan((15 * Math.PI) / 180) * aspek)) * 0.9));
		camera.position.set(
			target.x + r * Math.sin(kutub) * Math.sin(az),
			target.y + r * Math.cos(kutub),
			target.z + r * Math.sin(kutub) * Math.cos(az),
		);
		camera.lookAt(target);
		seragam.uKabut.value.set(r * 1.05, r * 1.75);
		// titik desa tetap seukuran di layar walau kamera menjauh
		seragam.uSkala.value = (ringan ? 4.2 : 5.2) * Math.min(gl.getPixelRatio(), 2) * (r / 115);

		// label gunung mengikuti proyeksi ke layar
		penanda.current.forEach((el, i) => {
			if (!el) return;
			const l = LABEL_RELIEF[i];
			const [x, z] = ke3d(l.lat, l.lng);
			v.set(x, tinggiM(l.lat, l.lng) * SKALA_Y * seragam.uNaik.value + 0.6, z).project(camera);
			el.style.transform = `translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px)`;
			el.style.opacity = String(seragam.uKontur.value);
		});

		/* R3F memasang salinan objek uniforms ke material, jadi nilai animasi
		   disalin ke uniforms milik material itu sendiri tiap frame. */
		for (const m of [matMedan.current, matDesa.current]) {
			if (!m) continue;
			for (const nama of ["uNaik", "uKontur", "uMuncul", "uSorot", "uSkala"]) if (m.uniforms[nama]) m.uniforms[nama].value = seragam[nama].value;
			if (m.uniforms.uKabut) m.uniforms.uKabut.value.copy(seragam.uKabut.value);
		}
	});

	const sorot = (e) => {
		const lng = e.point.x / S + LNG0;
		const lat = -e.point.z / S + LAT0;
		if (!diDalam(lng, lat)) { lepas(); return; }
		const i = terdekat(lng, lat);
		seragam.uSorot.value = i;
		const k = KECAMATAN_DATA[i];
		if (tip.current) {
			const kotak = gl.domElement.getBoundingClientRect();
			tip.current.style.opacity = "1";
			tip.current.style.transform = `translate(${e.clientX - kotak.left + 14}px, ${e.clientY - kotak.top + 14}px)`;
			tip.current.firstChild.textContent = `Kecamatan ${k.name}`;
			tip.current.lastChild.textContent = [k.desa && `${k.desa} desa`, k.kelurahan && `${k.kelurahan} kelurahan`].filter(Boolean).join(", ");
		}
	};
	const lepas = () => {
		seragam.uSorot.value = -1;
		if (tip.current) tip.current.style.opacity = "0";
	};

	return (
		<>
			<mesh geometry={medan} onPointerMove={sorot} onPointerOut={lepas}>
				<shaderMaterial ref={matMedan} vertexShader={VERT_MEDAN} fragmentShader={FRAG_MEDAN} uniforms={seragam} />
			</mesh>
			<points geometry={desa} raycast={() => null}>
				<shaderMaterial ref={matDesa} vertexShader={VERT_DESA} fragmentShader={FRAG_DESA} uniforms={seragam} transparent depthWrite={false} />
			</points>
		</>
	);
}

export default function ReliefBogor({ className = "relative h-full w-full" }) {
	const wadah = useRef(null);
	const penanda = useRef([]);
	const tip = useRef(null);
	const [tampak, setTampak] = useState(true);
	const slideAktif = useSlideAktif();

	useEffect(() => {
		const io = new IntersectionObserver(([e]) => setTampak(e.isIntersecting), { threshold: 0 });
		if (wadah.current) io.observe(wadah.current);
		return () => io.disconnect();
	}, []);

	return (
		<div ref={wadah} className={className}>
			<Canvas
				dpr={[1, ringan ? 1.5 : 1.75]}
				frameloop={tampak && slideAktif ? "always" : "never"}
				camera={{ fov: 30, near: 1, far: 500, position: [0, 60, -60] }}
				gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
				aria-hidden
			>
				<Adegan penanda={penanda} tip={tip} />
			</Canvas>

			<div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
				{LABEL_RELIEF.map((l, i) => (
					<div key={l.nama} ref={(el) => (penanda.current[i] = el)} className="absolute left-0 top-0 opacity-0" style={{ willChange: "transform" }}>
						<div className="-translate-x-1/2 -translate-y-full pb-1.5 text-center">
							<p className="m-0 whitespace-nowrap text-[12px] font-semibold leading-tight text-[#e2e8f0]">{l.nama}</p>
							<p className="m-0 whitespace-nowrap text-[11px] leading-tight text-[#e2e8f0]/60">{l.ket}</p>
							<span className={`mx-auto mt-1 block w-px ${l.kota ? "h-5 bg-[#e3b23c]" : "h-3 bg-[#e2e8f0]/50"}`} />
						</div>
					</div>
				))}
				<div ref={tip} className="absolute left-0 top-0 rounded-md bg-[#eef2f7] px-2.5 py-1.5 opacity-0 shadow-lg transition-opacity duration-150">
					<p className="m-0 text-[12px] font-bold text-[#0a1220]" />
					<p className="m-0 text-[11px] text-[#0a1220]/70" />
				</div>
			</div>
		</div>
	);
}
