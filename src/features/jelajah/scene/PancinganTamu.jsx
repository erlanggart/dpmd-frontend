import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, Float32BufferAttribute, Line, LineBasicMaterial, Vector3 } from "three";
import { FASE_PANCING, IKAN, IKAN_PER_ID, pancing, panjangCm } from "../pancing";
import { TANAH } from "./layout";
import ModelIkan from "./ModelIkan";
import { SUDUT_JORAN_TAMU, PANGKAL_JORAN, lenturkanJoran } from "./joranLentur";
import ModelJoran from "./ModelJoran";
import { AIR_Y } from "./situ";
import { AIR_KOLAM_Y, diAirKolam } from "./kolamMonsterData";

// Pancingan milik tamu lain (jelajah bersama): joran di tangannya, senar ke pelampung
// atau ke ikan yang sedang melawan, dan ikan hasil tangkapan yang ia angkat tinggi.
// Datanya `s.pc` dari server (lihat dataPancing di multipemain.js).

// permukaan air mengikuti tempat pelampungnya: situ atau Kolam Monster
let AIR = TANAH + AIR_Y;
const N = 12;

export default function PancinganTamu({ sumber, tampil }) {
	const akar = useRef();
	const ruas = useRef([]);
	const ujung = useRef();
	const pelampung = useRef();
	const ikanG = useRef();
	const v = useMemo(() => ({ u: new Vector3(), e: new Vector3(), c: new Vector3() }), []);
	// lompatan ikan tamu saat adu tarik: { mulai, arah } — diatur dari waktu, bukan dari server
	const lompat = useRef({ berikut: 0, mulai: -9, lama: 0.9 });
	const senar = useMemo(() => {
		const g = new BufferGeometry();
		g.setAttribute("position", new Float32BufferAttribute(new Float32Array(N * 3), 3));
		const l = new Line(g, new LineBasicMaterial({ color: "#f1f5f9", transparent: true, opacity: 0.8 }));
		l.frustumCulled = false;
		return l;
	}, []);

	useFrame(({ clock }) => {
		const s = sumber();
		const pc = s?.pc;
		const tampak = !!pc && (s.pose === "mancing" || s.pose === "perahu" || s.pose === "duduk");
		akar.current.visible = tampak;
		senar.visible = false;
		pelampung.current.visible = false;
		ikanG.current.visible = false;
		if (!tampak) return;
		const t = clock.elapsedTime;
		const fase = FASE_PANCING[pc.f] || "siap";
		const p = tampil.current;
		AIR = TANAH + (diAirKolam(pc.x, pc.z, -0.2) ? AIR_KOLAM_Y : AIR_Y);
		const duduk = s.pose !== "mancing";

		// joran: tegak saat menunggu, melengkung saat ikan melawan
		const a = akar.current;
		a.position.set(p.x + Math.cos(pc.a) * PANGKAL_JORAN.x + Math.sin(pc.a) * PANGKAL_JORAN.z, p.y + (duduk ? 0.78 : 1.12), p.z - Math.sin(pc.a) * PANGKAL_JORAN.x + Math.cos(pc.a) * PANGKAL_JORAN.z);
		const lentur = fase === "tarik" ? 0.12 + Math.min(1.15, pc.t) * 1.15 : fase === "gigit" ? 0.75 : 0.06;
		a.rotation.set(fase === "tarik" ? 0.3 + Math.sin(t * 17) * 0.02 * pc.t : fase === "dapat" ? 0.15 : SUDUT_JORAN_TAMU, pc.a, 0, "YXZ");
		lenturkanJoran(ruas.current, 0, lentur);
		a.updateMatrixWorld(true);
		ujung.current.getWorldPosition(v.u);

		// ujung senar & pelampung
		let akhir = null;
		if (fase === "lempar" || fase === "tunggu" || fase === "gigit") {
			const pl = pelampung.current;
			const dip = fase === "gigit" ? -0.15 : 0;
			pl.position.set(pc.x, AIR + (fase === "lempar" ? pc.y : Math.sin(t * 2.2) * 0.012 + dip), pc.z);
			pl.visible = true;
			akhir = pl.position;
		} else if (fase === "tarik") {
			v.e.set(pc.x, AIR + 0.02, pc.z);
			akhir = v.e;
		}
		if (akhir) {
			senar.visible = true;
			const jarak = v.u.distanceTo(akhir);
			v.c.lerpVectors(v.u, akhir, 0.5);
			// senar lawan tamu ikut kendur/kencang sesuai tegangannya
			v.c.y -= fase === "tarik" ? jarak * Math.max(0, 0.16 * (1 - pc.t * 1.65)) : jarak * 0.1;
			const getar = fase === "tarik" ? Math.min(1.2, pc.t) ** 2 * 0.016 : 0;
			const pos = senar.geometry.attributes.position;
			for (let i = 0; i < N; i++) {
				const u = i / (N - 1);
				const a1 = (1 - u) * (1 - u);
				const b1 = 2 * (1 - u) * u;
				const c1 = u * u;
				pos.setXYZ(i, a1 * v.u.x + b1 * v.c.x + c1 * akhir.x, a1 * v.u.y + b1 * v.c.y + c1 * akhir.y + Math.sin(u * Math.PI) * Math.sin(t * 74 + u * 11) * getar, a1 * v.u.z + b1 * v.c.z + c1 * akhir.z);
			}
			pos.needsUpdate = true;
		}

		// ikan: melawan di permukaan, atau dipamerkan di atas kepala
		const ikan = pc.i && IKAN_PER_ID[pc.i];
		if (ikan && (fase === "tarik" || fase === "dapat")) {
			const ig = ikanG.current;
			ig.visible = true;
			ig.children.forEach((c) => (c.visible = c.userData.id === ikan.id));
			const L = panjangCm(ikan, pc.kg || ikan.kg[0]) / 100;
			ig.scale.setScalar(L);
			if (fase === "tarik") {
				// Meronta di permukaan (punggung & sirip terlihat), sesekali melompat keluar
				// air dengan cipratan — sama seperti yang dilihat pemancingnya sendiri.
				const lp = lompat.current;
				if (t > lp.berikut) {
					lp.mulai = t;
					lp.lama = 0.8 + Math.min(0.6, L * 0.25);
					lp.berikut = t + 2.5 + Math.random() * 3.5;
					pancing.cipratan.push({ x: pc.x, z: pc.z, besar: 0.6 + Math.min(1.4, L), t0: performance.now() / 1000 });
				}
				const fl = (t - lp.mulai) / lp.lama;
				const naik = fl >= 0 && fl <= 1 ? Math.sin(fl * Math.PI) * (0.5 + Math.min(1.2, L * 0.6)) : 0;
				if (fl > 1 && fl < 1.05) pancing.cipratan.push({ x: pc.x, z: pc.z, besar: 0.5 + Math.min(1.2, L), t0: performance.now() / 1000 });
				ig.position.set(pc.x, AIR - 0.015 * L + naik + Math.sin(t * 9) * 0.02, pc.z);
				ig.rotation.set(naik > 0 ? -(fl - 0.5) * 1.8 : Math.sin(t * 6) * 0.1, Math.atan2(pc.x - p.x, pc.z - p.z) + Math.sin(t * 7) * 0.35, Math.sin(t * 9) * 0.25);
			} else {
				// dipegang di depan dada (joran diletakkan); ikut arah badan yang berbalik, bukan pc.a
				ig.position.set(p.x + Math.sin(p.rot) * 0.45, p.y + (duduk ? 0.8 : 1.12) + Math.abs(Math.sin(t * 7)) * 0.06, p.z + Math.cos(p.rot) * 0.45);
				ig.rotation.set(0, p.rot + Math.PI / 2, Math.sin(t * 11) * 0.12);
				akar.current.visible = false;
			}
		}
	});

	return (
		<>
			<group ref={akar} visible={false}>
				<ModelJoran ruas={ruas} ujung={ujung} warna="#1f2937" warnaUjung="#dc2626" />
			</group>
			<primitive object={senar} />
			<group ref={pelampung} visible={false}>
				<mesh position-y={0.04}>
					<sphereGeometry args={[0.065, 8, 6]} />
					<meshStandardMaterial color="#ef4444" emissive="#7f1d1d" />
				</mesh>
			</group>
			<group ref={ikanG} visible={false}>
				{IKAN.map((ik) => (
					<group key={ik.id} userData={{ id: ik.id }} visible={false}>
						<ModelIkan ikan={ik} />
					</group>
				))}
			</group>
		</>
	);
}
