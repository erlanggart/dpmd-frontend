import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import Tokoh from "./Tokoh";
import { LANTAI, RIM, basket, majukanBasket, useBasket } from "../basket";

// Tampilan 3D laga basket 1 lawan 1: bola, jaring, lawan, dan semburan koin.
// Logika & fisika ada di basket.js; di sini hanya membaca state tiap frame (tanpa setState).

const PENAMPILAN_LAWAN = { seragam: "warga", perempuan: false, kulit: "#c08d63", rambut: "#15100c", jilbab: null, baju: "#1d4ed8", celana: "#1e293b", kacamata: false };
const JUMLAH_KOIN = 10;
const LAMA_JARING = 500;
const LAMA_HUJAN = 1.1;

function Jaring({ i, r, jaring }) {
	return (
		<mesh ref={(m) => (jaring.current[i] = m)} position={[r.x, r.y - 0.2, r.z]}>
			<cylinderGeometry args={[0.23, 0.14, 0.4, 10, 2, true]} />
			<meshBasicMaterial color="#f8fafc" wireframe />
		</mesh>
	);
}

export default function MainBasket() {
	const aktif = useBasket().aktif;
	const grupBola = useRef();
	const bayangan = useRef();
	const grupLawan = useRef();
	const jaring = useRef([]);
	const koin = useRef();
	const geraknya = useRef(basket.lawan.gerak);
	const alat = useMemo(() => ({ m: new Matrix4(), e: new Euler(), q: new Quaternion(), p: new Vector3(), s: new Vector3() }), []);

	useFrame((_, dt) => {
		majukanBasket(dt);
		const o = basket.bola;
		const g = grupBola.current;
		if (g) {
			if (basket.aktif) {
				g.position.set(o.x, o.y, o.z);
				g.rotation.x = o.putar;
			} else {
				g.position.set(-58, LANTAI, 19);
				g.rotation.x = 0;
			}
		}
		const by = bayangan.current;
		if (by) {
			const yb = basket.aktif ? o.y : LANTAI;
			by.position.set(g ? g.position.x : -58, 0.08, g ? g.position.z : 19);
			by.scale.setScalar(1 - Math.min(0.5, yb * 0.1));
		}
		// jaring berayun sesaat setelah bola masuk
		const now = performance.now();
		RIM.forEach((r, i) => {
			const m = jaring.current[i];
			if (!m) return;
			const selang = now - basket.jaring[i];
			if (selang < LAMA_JARING) {
				const k = 1 + 0.45 * Math.sin((selang / LAMA_JARING) * Math.PI);
				m.scale.y = k;
				m.position.y = r.y - 0.2 - 0.2 * (k - 1);
			} else {
				m.scale.y = 1;
				m.position.y = r.y - 0.2;
			}
		});
		const gl = grupLawan.current;
		if (gl) {
			const L = basket.lawan;
			gl.position.set(L.x, L.h + 0.02, L.z);
			gl.rotation.y = L.rot;
		}
		// semburan koin
		const ik = koin.current;
		if (ik) {
			const h = basket.hujanKoin;
			const t = h ? (now - h.mulai) / 1000 : Infinity;
			if (h && t >= LAMA_HUJAN) basket.hujanKoin = null;
			const { m, e, q, p, s } = alat;
			for (let k = 0; k < JUMLAH_KOIN; k++) {
				if (t < LAMA_HUJAN) {
					const r = RIM[h.i];
					const a = (k / JUMLAH_KOIN) * Math.PI * 2;
					p.set(r.x + Math.sin(a) * t * 1.5, r.y + 3.4 * t - 4.9 * t * t, r.z + Math.cos(a) * t * 1.5);
					e.set(t * 10 + k, t * 7, 0);
					q.setFromEuler(e);
					s.set(1, 1, 1);
					m.compose(p, q, s);
				} else m.makeScale(0, 0, 0);
				ik.setMatrixAt(k, m);
			}
			ik.instanceMatrix.needsUpdate = true;
		}
	});

	return (
		<group>
			{RIM.map((r, i) => (
				<Jaring key={i} i={i} r={r} jaring={jaring} />
			))}
			<group ref={grupBola} position={[-58, LANTAI, 19]}>
				<mesh>
					<sphereGeometry args={[0.12, 18, 14]} />
					<meshStandardMaterial color="#ea6a1f" roughness={0.65} />
				</mesh>
				{[[0, 0, 0], [0, Math.PI / 2, 0], [Math.PI / 2, 0, 0]].map((rot, i) => (
					<mesh key={i} rotation={rot}>
						<torusGeometry args={[0.1205, 0.0035, 4, 24]} />
						<meshBasicMaterial color="#1f1309" />
					</mesh>
				))}
			</group>
			<mesh ref={bayangan} rotation-x={-Math.PI / 2} position={[-58, 0.08, 19]}>
				<circleGeometry args={[0.14, 12]} />
				<meshBasicMaterial color="#000" transparent opacity={0.28} depthWrite={false} />
			</mesh>
			{aktif && (
				<group ref={grupLawan}>
					<Tokoh penampilan={PENAMPILAN_LAWAN} gerak={geraknya} bayangan />
				</group>
			)}
			<instancedMesh ref={koin} args={[null, null, JUMLAH_KOIN]} frustumCulled={false}>
				<cylinderGeometry args={[0.09, 0.09, 0.02, 12]} />
				<meshStandardMaterial color="#fbbf24" metalness={0.6} roughness={0.3} emissive="#b45309" emissiveIntensity={0.4} />
			</instancedMesh>
		</group>
	);
}
