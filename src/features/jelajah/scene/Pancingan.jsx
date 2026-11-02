import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, Float32BufferAttribute, Line, LineBasicMaterial, MeshBasicMaterial, Object3D, RingGeometry, SphereGeometry, Vector3 } from "three";
import { posisi } from "../jelajahStore";
import { IKAN, joranKini, panjangCm, pancing, tickPancing, useKoleksi } from "../pancing";
import { TANAH } from "./layout";
import ModelIkan from "./ModelIkan";
import { AIR_Y, perahuBebas } from "./situ";

// Tampilan 3D memancing (koordinat dunia): joran yang melengkung, senar, pelampung,
// penanda bidikan, ikan yang melawan/melompat, ikan hasil yang diangkat, dan cipratan.
// Logika permainannya di pancing.js; komponen ini juga yang menjalankan tick-nya.

const AIR = TANAH + AIR_Y;
const N_SENAR = 18;
const N_PERCIK = 10;
const N_TETES = 60;
const detik = () => performance.now() / 1000;
const dekati = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

const GEO_CINCIN = new RingGeometry(0.82, 1, 28).rotateX(-Math.PI / 2);
const GEO_TETES = new SphereGeometry(0.035, 5, 4);
const BAHAN_TETES = new MeshBasicMaterial({ color: "#e6f4ff", transparent: true, opacity: 0.85 });

function Cipratan() {
	const cincin = useRef([]);
	const tetes = useRef();
	const data = useMemo(() => ({ dilihat: new Set(), tetes: Array.from({ length: N_TETES }, () => ({ x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0 })), berikut: 0 }), []);
	const o = useMemo(() => new Object3D(), []);

	useFrame((_, dt) => {
		const kini = detik();
		const daftar = pancing.cipratan.filter((c) => kini - c.t0 < 1.1);
		pancing.cipratan = daftar;
		cincin.current.forEach((m, i) => {
			const c = daftar[i];
			if (!m) return;
			m.visible = !!c;
			if (!c) return;
			const umur = kini - c.t0;
			const s = c.besar * (0.35 + umur * 2.4);
			m.position.set(c.x, AIR + 0.012, c.z);
			m.scale.set(s, 1, s);
			m.material.opacity = Math.max(0, 0.75 * (1 - umur / 1.1));
		});
		// tiap cipratan baru melontarkan beberapa tetes air
		for (const c of daftar) {
			if (data.dilihat.has(c)) continue;
			data.dilihat.add(c);
			const n = Math.min(14, Math.round(5 + c.besar * 6));
			for (let k = 0; k < n; k++) {
				const t = data.tetes[data.berikut++ % N_TETES];
				const a = Math.random() * Math.PI * 2;
				const v = (0.6 + Math.random()) * Math.min(2.2, 0.8 + c.besar);
				Object.assign(t, { x: c.x, y: AIR + 0.05, z: c.z, vx: Math.cos(a) * v * 0.6, vy: 1.5 + Math.random() * 2 * Math.min(1.6, c.besar), vz: Math.sin(a) * v * 0.6 });
			}
		}
		if (data.dilihat.size > 40) data.dilihat = new Set(daftar);
		data.tetes.forEach((t, i) => {
			if (t.y > AIR - 0.1) {
				t.vy -= 9.8 * dt;
				t.x += t.vx * dt;
				t.y += t.vy * dt;
				t.z += t.vz * dt;
			}
			o.position.set(t.x, t.y, t.z);
			o.scale.setScalar(t.y > AIR - 0.05 ? 1 : 0);
			o.updateMatrix();
			tetes.current.setMatrixAt(i, o.matrix);
		});
		tetes.current.instanceMatrix.needsUpdate = true;
	});

	return (
		<>
			{Array.from({ length: N_PERCIK }, (_, i) => (
				<mesh key={i} ref={(el) => (cincin.current[i] = el)} geometry={GEO_CINCIN} visible={false} renderOrder={2}>
					<meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} />
				</mesh>
			))}
			<instancedMesh ref={tetes} args={[GEO_TETES, BAHAN_TETES, N_TETES]} frustumCulled={false} />
		</>
	);
}

// Joran 3 ruas: pangkal (gagang gabus + gulungan), tengah, dan ujung yang paling lentur.
function Joran({ akar, ruas, ujung }) {
	useKoleksi(); // warna ikut berganti saat joran di-upgrade
	const { warna, ujung: warnaUjung } = joranKini();
	return (
		<group ref={akar}>
			<mesh position={[0, -0.1, 0]}>
				<cylinderGeometry args={[0.025, 0.028, 0.45, 6]} />
				<meshStandardMaterial color="#b8895a" />
			</mesh>
			<mesh position={[0.06, 0.12, 0]} rotation-z={Math.PI / 2}>
				<cylinderGeometry args={[0.055, 0.055, 0.06, 10]} />
				<meshStandardMaterial color="#334155" metalness={0.6} roughness={0.3} />
			</mesh>
			<group ref={(el) => (ruas.current[0] = el)}>
				<mesh position-y={0.55}>
					<cylinderGeometry args={[0.014, 0.02, 1.1, 5]} />
					<meshStandardMaterial color={warna} metalness={0.3} roughness={0.4} />
				</mesh>
				<group ref={(el) => (ruas.current[1] = el)} position-y={1.1}>
					<mesh position-y={0.5}>
						<cylinderGeometry args={[0.009, 0.014, 1.0, 5]} />
						<meshStandardMaterial color={warna} metalness={0.3} roughness={0.4} />
					</mesh>
					<group ref={(el) => (ruas.current[2] = el)} position-y={1.0}>
						<mesh position-y={0.4}>
							<cylinderGeometry args={[0.005, 0.009, 0.8, 4]} />
							<meshStandardMaterial color={warnaUjung} />
						</mesh>
						<object3D ref={ujung} position-y={0.8} />
					</group>
				</group>
			</group>
		</group>
	);
}

function Pelampung({ g }) {
	return (
		<group ref={g}>
			<mesh position-y={0.04}>
				<sphereGeometry args={[0.065, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
				<meshStandardMaterial color="#ef4444" emissive="#7f1d1d" />
			</mesh>
			<mesh position-y={0.04} rotation-x={Math.PI}>
				<sphereGeometry args={[0.065, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
				<meshStandardMaterial color="#f8fafc" />
			</mesh>
			<mesh position-y={0.17}>
				<cylinderGeometry args={[0.008, 0.008, 0.18, 4]} />
				<meshStandardMaterial color="#fde047" emissive="#a16207" />
			</mesh>
		</group>
	);
}

export default function Pancingan() {
	const akar = useRef();
	const ruas = useRef([]);
	const ujung = useRef();
	const pelampung = useRef();
	const bidik = useRef();
	const ikanG = useRef();
	const percik = useRef([]);
	const st = useRef({ sudut: 0.5, lentur: 0, ikanId: null });
	const v = useMemo(() => ({ ujung: new Vector3(), akhir: new Vector3(), kontrol: new Vector3(), p: new Vector3() }), []);
	const senar = useMemo(() => {
		const g = new BufferGeometry();
		g.setAttribute("position", new Float32BufferAttribute(new Float32Array(N_SENAR * 3), 3));
		const l = new Line(g, new LineBasicMaterial({ color: "#f1f5f9", transparent: true, opacity: 0.85 }));
		l.frustumCulled = false;
		return l;
	}, []);

	useFrame(({ clock, camera }, dtMentah) => {
		const dt = Math.min(dtMentah, 0.1);
		const p = pancing;
		const t = clock.elapsedTime;
		const aktif = p.aktif;
		akar.current.visible = aktif;
		senar.visible = false;
		pelampung.current.visible = false;
		bidik.current.visible = false;
		if (!aktif) {
			ikanG.current.visible = false;
			return;
		}
		// logika permainan berjalan di sini, satu kali per frame
		tickPancing(dt);

		// --- joran di tangan kanan pemancing ---
		const arah = p.asal.rot + p.aim;
		const tinggiTangan = p.perahu ? 0.78 : 1.12;
		const a = akar.current;
		a.position.set(posisi.x + Math.cos(arah) * 0.24 + Math.sin(arah) * 0.28, (posisi.yTampil ?? posisi.y) + tinggiTangan, posisi.z - Math.sin(arah) * 0.24 + Math.cos(arah) * 0.28);
		const s = st.current;
		let sudut = 0.5;
		let lentur = 0.03;
		if (p.fase === "siap") sudut = p.tahan ? 0.5 - p.tenaga * 1.5 : 0.55;
		else if (p.fase === "lempar") sudut = 1.2;
		else if (p.fase === "tunggu") sudut = 0.95 + (p.colek ? Math.sin(t * 40) * 0.05 : 0);
		else if (p.fase === "gigit") {
			// joran tertarik ke depan & melengkung berat
			sudut = 0.8 + Math.sin(t * 30) * 0.05;
			lentur = 0.38 + Math.sin(t * 19) * 0.04;
		} else if (p.fase === "tarik") {
			sudut = 0.3 + (p.sentak > 0 ? 0.3 : 0) + Math.sin(t * 17) * 0.02 * p.tegang;
			lentur = 0.06 + Math.min(1.1, p.tegang) * 0.32;
		} else if (p.fase === "dapat") sudut = 0.15;
		s.sudut = dekati(s.sudut, sudut, p.fase === "lempar" ? 22 : 9, dt);
		s.lentur = dekati(s.lentur, lentur, 10, dt);
		a.rotation.set(0, arah, 0);
		ruas.current[0].rotation.x = s.sudut;
		ruas.current[1].rotation.x = s.lentur;
		ruas.current[2].rotation.x = s.lentur * 1.6;
		a.updateMatrixWorld(true);
		ujung.current.getWorldPosition(v.ujung);

		// --- pelampung & ujung senar ---
		const pl = pelampung.current;
		let ujungSenar = null;
		let lendut = 0;
		if (p.fase === "siap" || p.fase === "gagal") {
			v.akhir.copy(v.ujung).y -= 0.7;
			pl.position.copy(v.akhir);
			pl.visible = true;
			ujungSenar = v.akhir;
		} else if (p.fase === "lempar") {
			pl.position.set(p.pelampung.x, AIR + p.pelampung.y, p.pelampung.z);
			pl.visible = true;
			ujungSenar = pl.position;
		} else if (p.fase === "tunggu" || p.fase === "gigit") {
			const gigit = p.fase === "gigit";
			// ikan menyambar: pelampung ditarik tenggelam & terseret menjauh, senar lurus menegang
			const seret = gigit ? Math.min(1.4, p.t * 1.8) : 0;
			const menjauh = Math.atan2(p.pelampung.x - v.ujung.x, p.pelampung.z - v.ujung.z);
			s.menjauh = menjauh;
			const dip = gigit ? -0.12 - Math.min(0.3, p.t * 0.6) : p.colek ? -0.05 : 0;
			pl.position.set(p.pelampung.x + Math.sin(menjauh) * seret + (gigit ? Math.sin(t * 37) * 0.03 : 0), AIR + Math.sin(t * 2.2) * 0.012 + dip, p.pelampung.z + Math.cos(menjauh) * seret + (gigit ? Math.cos(t * 31) * 0.03 : 0));
			pl.rotation.z = gigit ? Math.sin(t * 25) * 0.4 : Math.sin(t * 1.7) * 0.08;
			pl.visible = true;
			ujungSenar = pl.position;
			lendut = gigit ? 0 : 0.1;
		} else if (p.fase === "tarik") {
			v.akhir.set(p.ikanPos.x, AIR - 0.05, p.ikanPos.z);
			ujungSenar = v.akhir;
			lendut = Math.max(0, 0.08 * (1 - p.tegang));
		}

		// --- penanda bidikan saat mengayun ---
		if (p.fase === "siap" && p.tahan) {
			const d = 4 + p.tenaga * 17;
			const x = v.ujung.x + Math.sin(arah) * d;
			const z = v.ujung.z + Math.cos(arah) * d;
			const b = bidik.current;
			b.visible = true;
			b.position.set(x, AIR + 0.02, z);
			const sk = 0.6 + Math.sin(t * 8) * 0.05;
			b.scale.set(sk, 1, sk);
			b.material.color.set(!perahuBebas(x, z, 0.2) ? "#ef4444" : p.tenaga > 0.93 ? "#fbbf24" : "#4ade80");
		}

		// --- senar melendut antara ujung joran dan ujungnya ---
		if (ujungSenar) {
			senar.visible = true;
			const jarak = v.ujung.distanceTo(ujungSenar);
			v.kontrol.lerpVectors(v.ujung, ujungSenar, 0.5);
			v.kontrol.y -= jarak * lendut;
			const pos = senar.geometry.attributes.position;
			for (let i = 0; i < N_SENAR; i++) {
				const u = i / (N_SENAR - 1);
				const a1 = (1 - u) * (1 - u);
				const b1 = 2 * (1 - u) * u;
				const c1 = u * u;
				pos.setXYZ(i, a1 * v.ujung.x + b1 * v.kontrol.x + c1 * ujungSenar.x, a1 * v.ujung.y + b1 * v.kontrol.y + c1 * ujungSenar.y, a1 * v.ujung.z + b1 * v.kontrol.z + c1 * ujungSenar.z);
			}
			pos.needsUpdate = true;
		}

		// --- ikan: melawan di permukaan, melompat, lalu diangkat tinggi ---
		const ig = ikanG.current;
		const ikan = p.fase === "dapat" ? p.hasil?.ikan : p.fase === "tarik" || p.fase === "gigit" ? p.ikan : null;
		ig.visible = !!ikan;
		if (ikan) {
			if (s.ikanId !== ikan.id) s.ikanId = ikan.id;
			ig.children.forEach((c) => (c.visible = c.userData.id === ikan.id));
			const kg = p.fase === "dapat" ? p.hasil.kg : p.kg;
			const L = panjangCm(ikan, kg) / 100;
			ig.scale.setScalar(L);
			if (p.fase === "gigit") {
				// ikan tersangkut kail di bawah pelampung, berenang menjauh menyeret senar
				const a = s.menjauh ?? 0;
				ig.position.set(pelampung.current.position.x + Math.sin(a) * L * 0.45, AIR - 0.2 - L * 0.08, pelampung.current.position.z + Math.cos(a) * L * 0.45);
				ig.rotation.set(0.15, a + Math.sin(t * 15) * 0.3, Math.sin(t * 11) * 0.15);
			} else if (p.fase === "tarik") {
				const hadap = Math.atan2(p.ikanPos.x - v.ujung.x, p.ikanPos.z - v.ujung.z) + p.arahIkan * 0.7;
				let y = AIR - 0.06 * L - 0.03;
				let condong = 0;
				const e = p.peristiwa;
				if (e?.jenis === "lompat") {
					const f = Math.min(1, e.t / e.dur);
					y = AIR + Math.sin(f * Math.PI) * (0.9 + L * 0.7);
					condong = -(f - 0.5) * 2.4;
					if (f > 0.97 && !e.cebur) {
						e.cebur = true;
						p.cipratan.push({ x: p.ikanPos.x, z: p.ikanPos.z, besar: 1 + L * 0.5, t0: detik() });
					}
				}
				ig.position.set(p.ikanPos.x, y, p.ikanPos.z);
				ig.rotation.set(condong, hadap + Math.sin(t * (6 + p.tegang * 6)) * 0.22, Math.sin(t * 9) * 0.15);
			} else {
				// terangkat dari air ke dekapan pemancing, lalu dipegang di depan dada sambil
				// menggelepar (joran diletakkan dulu)
				const f = Math.min(1, p.t / 0.7);
				const hadap = p.asal.rot + p.aim;
				const tangan = {
					x: posisi.x + Math.sin(hadap) * 0.45,
					y: (posisi.yTampil ?? posisi.y) + (p.perahu ? 0.8 : 1.12) + Math.abs(Math.sin(t * 7)) * 0.06,
					z: posisi.z + Math.cos(hadap) * 0.45,
				};
				const ease = 1 - Math.pow(1 - f, 3);
				ig.position.set(p.ikanPos.x + (tangan.x - p.ikanPos.x) * ease, AIR + (tangan.y - AIR) * ease + Math.sin(f * Math.PI) * 1.6, p.ikanPos.z + (tangan.z - p.ikanPos.z) * ease);
				ig.rotation.set(0, hadap + Math.PI / 2, Math.sin(t * 11) * 0.18 * (1 - f * 0.5));
				akar.current.visible = p.t < 0.3;
			}
		}

		// --- percik setrum (belut listrik) ---
		const setrum = p.fase === "tarik" && p.peristiwa?.jenis === "setrum";
		percik.current.forEach((m) => {
			if (!m) return;
			m.visible = setrum && Math.random() < 0.6;
			if (m.visible) m.position.set(p.ikanPos.x + (Math.random() - 0.5) * 2, AIR + Math.random() * 0.6, p.ikanPos.z + (Math.random() - 0.5) * 2);
		});

		// --- guncangan kamera saat sentakan/amukan ---
		if (p.getar > 0.01) {
			const g = p.getar * 0.12;
			camera.position.x += (Math.random() - 0.5) * g;
			camera.position.y += (Math.random() - 0.5) * g;
		}
	});

	return (
		<>
			<Joran akar={akar} ruas={ruas} ujung={ujung} />
			<primitive object={senar} />
			<Pelampung g={pelampung} />
			<mesh ref={bidik} geometry={GEO_CINCIN} visible={false}>
				<meshBasicMaterial color="#4ade80" transparent opacity={0.9} depthWrite={false} />
			</mesh>
			<group ref={ikanG} visible={false}>
				{IKAN.map((ik) => (
					<group key={ik.id} userData={{ id: ik.id }} visible={false}>
						<ModelIkan ikan={ik} />
					</group>
				))}
			</group>
			{Array.from({ length: 8 }, (_, i) => (
				<mesh key={i} ref={(el) => (percik.current[i] = el)} visible={false}>
					<boxGeometry args={[0.04, 0.5, 0.04]} />
					<meshBasicMaterial color="#7dd3fc" toneMapped={false} />
				</mesh>
			))}
			<Cipratan />
		</>
	);
}
