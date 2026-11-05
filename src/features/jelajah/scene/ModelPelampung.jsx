import { CapsuleGeometry, CylinderGeometry, IcosahedronGeometry, LatheGeometry, SphereGeometry, TorusGeometry, Vector2 } from "three";

// Bentuk pelampung per id (titik asal = garis air; bagian bawah tenggelam, antena di atas).
// Geometri dibuat sekali di tingkat modul; tiap komponen hanya memberi warna.

const PI = Math.PI;
const BELAH_ATAS = new SphereGeometry(0.065, 12, 8, 0, PI * 2, 0, PI / 2);
const BELAH_BAWAH = new SphereGeometry(0.065, 12, 8, 0, PI * 2, PI / 2, PI / 2);
const BULAT = new SphereGeometry(0.05, 12, 10);
const BATANG = (r, p) => new CylinderGeometry(r, r, p, 5);
const ANT_PENDEK = BATANG(0.008, 0.1);
const ANT_SEDANG = BATANG(0.007, 0.16);
const ANT_PANJANG = BATANG(0.005, 0.3);
const ANT_NEON = BATANG(0.007, 0.24);
const BADAN_PENA = BATANG(0.018, 0.26);
const PITA_PENA = BATANG(0.0195, 0.05);
const PELURU = new LatheGeometry(
	[[0, -0.13], [0.015, -0.1], [0.04, -0.05], [0.06, 0], [0.065, 0.04], [0.055, 0.08], [0.03, 0.1], [0, 0.105]].map(([x, y]) => new Vector2(x, y)),
	14,
);
const TORPEDO = new CapsuleGeometry(0.035, 0.12, 4, 12);
const WAGGLER = new CapsuleGeometry(0.022, 0.1, 4, 10);
const KRISTAL = new IcosahedronGeometry(0.05, 1);
const CINCIN = (r, t) => new TorusGeometry(r, t, 6, 16).rotateX(PI / 2);
const CINCIN_TEMBAGA = CINCIN(0.037, 0.008);
const CINCIN_NEON = CINCIN(0.024, 0.006);
const CINCIN_GIOK = CINCIN(0.052, 0.01);
const SISIK = [CINCIN(0.055, 0.008), CINCIN(0.062, 0.009), CINCIN(0.052, 0.008)];
const UJUNG = new SphereGeometry(0.016, 8, 6);

export default function ModelPelampung({ id, warna, warna2 }) {
	const A = (extra) => <meshStandardMaterial color={warna} {...extra} />;
	const B = (extra) => <meshStandardMaterial color={warna2} {...extra} />;
	switch (id) {
		case "pena":
			return (
				<>
					<mesh geometry={BADAN_PENA} position-y={0.06}>{A({ emissive: warna, emissiveIntensity: 0.25 })}</mesh>
					<mesh geometry={PITA_PENA} position-y={0.12}>{B()}</mesh>
					<mesh geometry={ANT_PANJANG} position-y={0.34}>{B({ emissive: warna2, emissiveIntensity: 0.3 })}</mesh>
				</>
			);
		case "peluru":
			return (
				<>
					<mesh geometry={PELURU}>{A({ emissive: warna, emissiveIntensity: 0.2 })}</mesh>
					<mesh geometry={ANT_PENDEK} position-y={0.155}>{B()}</mesh>
				</>
			);
		case "tembaga":
			return (
				<>
					<mesh geometry={TORPEDO} position-y={0.03}>{A({ metalness: 0.9, roughness: 0.3, emissive: warna, emissiveIntensity: 0.25 })}</mesh>
					<mesh geometry={CINCIN_TEMBAGA} position-y={0.05}>{B({ emissive: warna2, emissiveIntensity: 0.9 })}</mesh>
					<mesh geometry={ANT_PENDEK} position-y={0.15}>{B({ metalness: 0.8, roughness: 0.3 })}</mesh>
				</>
			);
		case "neon":
			return (
				<>
					<mesh geometry={WAGGLER} position-y={0.02}>{B()}</mesh>
					<mesh geometry={CINCIN_NEON} position-y={0.05}>{A({ emissive: warna, emissiveIntensity: 1.5 })}</mesh>
					<mesh geometry={ANT_NEON} position-y={0.2}>{A({ emissive: warna, emissiveIntensity: 1 })}</mesh>
					<mesh geometry={UJUNG} position-y={0.325}>{A({ emissive: warna, emissiveIntensity: 2.5, toneMapped: false })}</mesh>
				</>
			);
		case "kristal":
			return (
				<>
					<mesh geometry={KRISTAL} position-y={0.03} scale={[1, 1.8, 1]}>
						{A({ transparent: true, opacity: 0.6, roughness: 0.05, metalness: 0.1, flatShading: true, emissive: warna, emissiveIntensity: 0.25 })}
					</mesh>
					<mesh geometry={ANT_SEDANG} position-y={0.2}>{B({ emissive: warna2, emissiveIntensity: 0.4 })}</mesh>
				</>
			);
		case "giok":
			return (
				<>
					<mesh geometry={BULAT} position-y={0.03} scale={[1, 1.5, 1]}>{A({ roughness: 0.25, metalness: 0.1 })}</mesh>
					<mesh geometry={CINCIN_GIOK} position-y={0.03}>
						<meshStandardMaterial color="#facc15" metalness={0.8} roughness={0.3} />
					</mesh>
					<mesh geometry={ANT_SEDANG} position-y={0.17}>
						<meshStandardMaterial color="#facc15" metalness={0.8} roughness={0.3} />
					</mesh>
				</>
			);
		case "naga":
			return (
				<>
					<mesh geometry={BULAT} position-y={0.03} scale={[1, 1.5, 1]}>{A({ metalness: 0.6, roughness: 0.3, emissive: warna, emissiveIntensity: 0.2 })}</mesh>
					{SISIK.map((g, i) => (
						<mesh key={i} geometry={g} position-y={-0.02 + i * 0.055}>{B()}</mesh>
					))}
					<mesh geometry={ANT_SEDANG} position-y={0.185}>{A({ metalness: 0.6, roughness: 0.3 })}</mesh>
					<mesh geometry={UJUNG} position-y={0.275}>{B({ emissive: warna2, emissiveIntensity: 2, toneMapped: false })}</mesh>
				</>
			);
		default:
			// bola: pelampung klasik dua warna dengan batang pendek
			return (
				<>
					<mesh geometry={BELAH_ATAS} position-y={0.02}>{A({ emissive: warna, emissiveIntensity: 0.3 })}</mesh>
					<mesh geometry={BELAH_BAWAH} position-y={0.02}>{B()}</mesh>
					<mesh geometry={ANT_PENDEK} position-y={0.135}>
						<meshStandardMaterial color="#fde047" emissive="#a16207" />
					</mesh>
				</>
			);
	}
}
