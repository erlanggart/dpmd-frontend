import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, MeshBasicMaterial, Object3D, RingGeometry, SphereGeometry, Vector3 } from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { posisi } from "../jelajahStore";
import { IKAN, arahJoran, bebasLempar, joranKini, panjangCm, pancing, pelampungKini, senarKini, tickPancing, useKoleksi, zonaKini } from "../pancing";
import { aturSenar } from "../suaraPancing";
import { TANAH } from "./layout";
import ModelIkan from "./ModelIkan";
import ModelPelampung from "./ModelPelampung";
import { lenturkanJoran } from "./joranLentur";
import ModelJoran from "./ModelJoran";
import { AIR_Y } from "./situ";
import { AIR_KOLAM_Y, diAirKolam } from "./kolamMonsterData";

// Tampilan 3D memancing (koordinat dunia): joran yang melengkung, senar, pelampung,
// penanda bidikan, ikan yang melawan/melompat, ikan hasil yang diangkat, dan cipratan.
// Logika permainannya di pancing.js; komponen ini juga yang menjalankan tick-nya.

const AIR_SITU = TANAH + AIR_Y;
const AIR_KOLAM = TANAH + AIR_KOLAM_Y;
// permukaan air tempat pemain memancing: situ, atau Kolam Monster yang lebih tinggi
let AIR = AIR_SITU;
const airDi = (x, z) => (diAirKolam(x, z, -0.2) ? AIR_KOLAM : AIR_SITU);
const N_SENAR = 48;
const N_PERCIK = 10;
const N_TETES = 60;
const detik = () => performance.now() / 1000;
const dekati = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const MERAH_TEGANG = new Color("#ef4444");
const C1 = new Color();
const C2 = new Color();

// Tanpa meteran, tegangan dibaca dari joran & senar. Nilainya relatif pada rentang "pas" ikan
// dan joran saat ini, supaya tampak "pas" sama untuk semua ikan:
// 0 kendor total, 1/3 batas bawah pas, 2/3 batas atas pas, 1 akan putus.
function rasaTegang(p) {
	const [zb, za] = zonaKini(p.ikan.kelas);
	const t = p.tegang + (p.geleng || 0);
	if (t < zb) return Math.max(0, t / zb) / 3;
	if (t <= za) return 1 / 3 + (t - zb) / (za - zb) / 3;
	return 2 / 3 + Math.min(1, (t - za) / Math.max(0.01, 1 - za)) / 3;
}

// satu titik senar dipakai bersama akhir ruas sebelumnya dan awal ruas berikutnya
function tulis(arr, i, x, y, z) {
	if (i > 0) {
		const o = (i - 1) * 6 + 3;
		arr[o] = x;
		arr[o + 1] = y;
		arr[o + 2] = z;
	}
	if (i < N_SENAR - 1) {
		const o = i * 6;
		arr[o] = x;
		arr[o + 1] = y;
		arr[o + 2] = z;
	}
}

const GEO_CINCIN = new RingGeometry(0.82, 1, 28).rotateX(-Math.PI / 2);
const GEO_TETES = new SphereGeometry(0.035, 5, 4);
const BAHAN_TETES = new MeshBasicMaterial({ color: "#e6f4ff", transparent: true, opacity: 0.85 });

function Cipratan() {
	const cincin = useRef([]);
	const tetes = useRef();
	const data = useMemo(() => ({ dilihat: new Set(), tetes: Array.from({ length: N_TETES }, () => ({ air: 0, x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0 })), berikut: 0 }), []);
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
			m.position.set(c.x, airDi(c.x, c.z) + 0.012, c.z);
			m.scale.set(s, 1, s);
			m.material.opacity = Math.max(0, 0.75 * (1 - umur / 1.1));
		});
		// tiap cipratan baru melontarkan beberapa tetes air
		for (const c of daftar) {
			if (data.dilihat.has(c)) continue;
			data.dilihat.add(c);
			const n = Math.min(14, Math.round(5 + c.besar * 6));
			const air = airDi(c.x, c.z);
			for (let k = 0; k < n; k++) {
				const t = data.tetes[data.berikut++ % N_TETES];
				const a = Math.random() * Math.PI * 2;
				const v = (0.6 + Math.random()) * Math.min(2.2, 0.8 + c.besar);
				Object.assign(t, { air, x: c.x, y: air + 0.05, z: c.z, vx: Math.cos(a) * v * 0.6, vy: 1.5 + Math.random() * 2 * Math.min(1.6, c.besar), vz: Math.sin(a) * v * 0.6 });
			}
		}
		if (data.dilihat.size > 40) data.dilihat = new Set(daftar);
		data.tetes.forEach((t, i) => {
			if (t.y > t.air - 0.1) {
				t.vy -= 9.8 * dt;
				t.x += t.vx * dt;
				t.y += t.vy * dt;
				t.z += t.vz * dt;
			}
			o.position.set(t.x, t.y, t.z);
			o.scale.setScalar(t.y > t.air - 0.05 ? 1 : 0);
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

function Joran({ akar, ruas, ujung, engkol }) {
	useKoleksi(); // warna ikut berganti saat joran diganti
	const { warna, ujung: warnaUjung } = joranKini();
	return (
		<group ref={akar}>
			<ModelJoran ruas={ruas} ujung={ujung} engkol={engkol} warna={warna} warnaUjung={warnaUjung} />
		</group>
	);
}

function Pelampung({ g }) {
	useKoleksi(); // warna & ukuran ikut pelampung yang dipakai
	const { id, warna, warna2, ukuran } = pelampungKini();
	return (
		<group ref={g}>
				<group scale={ukuran}>
				<ModelPelampung id={id} warna={warna} warna2={warna2} />
			</group>
		</group>
	);
}

// Gaya tubuh pemancing per fase (dibaca Tokoh.jsx lewat gerak.gayaPancing):
// condong (+ ke depan / − ke belakang), lengan (+ terangkat), engkol (fase putaran gulungan)
// & putar (besarnya), lutut (kuda-kuda), lompat (girang saat dapat ikan).
function aturGaya(p, dt) {
	const g = p.gaya;
	let condong = 0;
	let lengan = 0;
	let putar = 0;
	let lutut = 0;
	let lompat = 0;
	let balik = 0;
	p.hentakT += dt;
	if (p.fase === "siap" && p.tahan) {
		// ancang-ancang: joran & lengan ditarik ke belakang kepala, badan condong ke belakang
		condong = -0.2 * p.tenaga;
		lengan = 0.95 * p.tenaga;
		lutut = 0.15 * p.tenaga;
	} else if (p.fase === "lempar") {
		// ayunan melempar: lengan menyabet ke depan, badan ikut maju
		const f = Math.min(1, p.t / 0.18);
		condong = 0.24 * f;
		lengan = 0.9 * (1 - f) - 0.35 * f;
		lutut = 0.2;
	} else if (p.fase === "tunggu") condong = 0.04;
	else if (p.fase === "gigit") {
		condong = 0.14;
		lengan = 0.1;
		lutut = 0.2;
	} else if (p.fase === "tarik") {
		// badan ikut bercerita: makin tegang makin condong ke belakang dengan lutut menekuk
		const tg = rasaTegang(p) * 1.1;
		condong = -(0.08 + tg * 0.3) + (p.sentak > 0 ? 0.13 : 0) - (p.lari > 0 ? 0.07 : 0) - (p.amuk > 0 ? 0.05 : 0);
		lengan = 0.12 + tg * 0.4;
		putar = Math.min(1, p.gulung) * (p.habisi ? 1.3 : 1);
		lutut = 0.2 + tg * 0.25;
		// mengengkol gulungan: makin cepat mengetuk makin cepat berputar
		g.engkol += dt * (6 + 14 * Math.min(1.3, p.gulung)) * (p.habisi ? 1.5 : 1);
	} else if (p.fase === "gagal") {
		condong = 0.2;
		lengan = -0.45;
	} else if (p.fase === "dapat") {
		// berbalik menghadap kamera sambil mengangkat ikan, lalu melompat girang
		const b = Math.min(1, Math.max(0, (p.t - 0.05) / 0.55));
		balik = b * b * (3 - 2 * b);
		const u = (p.t - 0.75) / 0.45;
		lompat = u > 0 && u < 1 ? Math.sin(u * Math.PI) : 0;
	}
	// TARIKAN SAKTI: sentakan besar ke belakang dengan joran terangkat tinggi
	if (p.hentakT < 0.8) {
		const k = p.hentakT < 0.12 ? p.hentakT / 0.12 : Math.max(0, 1 - (p.hentakT - 0.12) / 0.68);
		condong -= 0.32 * k;
		lengan += 1.3 * k;
		lutut += 0.25 * k;
	}
	g.condong = dekati(g.condong, condong, p.fase === "lempar" || p.hentakT < 0.15 ? 30 : 10, dt);
	g.lengan = dekati(g.lengan, lengan, p.fase === "lempar" || p.hentakT < 0.15 ? 30 : 10, dt);
	g.putar = dekati(g.putar, putar, 8, dt);
	g.lutut = dekati(g.lutut, lutut, 8, dt);
	g.lompat = lompat;
	// kembali menghadap air dengan halus setelah lanjut memancing
	g.balik = balik >= g.balik ? balik : dekati(g.balik, balik, 6, dt);
}

export default function Pancingan() {
	const akar = useRef();
	const ruas = useRef([]);
	const ujung = useRef();
	const engkol = useRef();
	const pelampung = useRef();
	const bidik = useRef();
	const ikanG = useRef();
	const percik = useRef([]);
	const st = useRef({ sudut: 0.5, lentur: 0, ikanId: null, lendut: 0.1, sentakan: 0, faseLalu: null });
	// riak melingkar di permukaan air (pelampung mendarat/dicolek/disambar, ikan melawan)
	const riak = useRef([]);
	const riakData = useRef(Array.from({ length: 8 }, () => ({ t: 99, x: 0, z: 0, besar: 1 })));
	const riakSt = useRef({ fase: null, colek: false, jeda: 0, urut: 0 });
	const v = useMemo(() => ({ ujung: new Vector3(), akhir: new Vector3(), kontrol: new Vector3(), p: new Vector3() }), []);
	const senar = useMemo(() => {
		// Line2, bukan Line: garis WebGL biasa selalu 1 piksel, padahal tebal senar kini tanda tegangan
		const g = new LineGeometry();
		g.setPositions(new Float32Array(N_SENAR * 3));
		g.setColors(new Float32Array(N_SENAR * 3).fill(1));
		const l = new Line2(g, new LineMaterial({ vertexColors: true, transparent: true, opacity: 0.85, linewidth: 1 }));
		l.frustumCulled = false;
		return l;
	}, []);

	useFrame(({ clock, camera, gl }, dtMentah) => {
		let dt = Math.min(dtMentah, 0.1);
		const p = pancing;
		const t = clock.elapsedTime;
		const aktif = p.aktif;
		AIR = p.kolam ? AIR_KOLAM : AIR_SITU;
		akar.current.visible = aktif;
		senar.visible = false;
		pelampung.current.visible = false;
		bidik.current.visible = false;
		const s0 = st.current;
		if (!aktif) {
			ikanG.current.visible = false;
			if (s0.fov0 && camera.fov !== s0.fov0) {
				camera.fov = s0.fov0;
				camera.updateProjectionMatrix();
			}
			return;
		}
		// gerak lambat sesaat (tarikan sakti, ikan terangkat)
		if (p.lambat > 0) {
			p.lambat -= dt;
			dt *= 0.3;
		}
		// logika permainan berjalan di sini, satu kali per frame
		tickPancing(dt);
		aturGaya(p, dt);
		// strike: senar tersentak tegang & bergetar kencang, lalu mereda
		const sk = st.current;
		if (p.fase !== sk.faseLalu) {
			if (p.fase === "tarik") sk.sentakan = 1;
			else if (p.fase === "gigit") sk.sentakan = Math.max(sk.sentakan, 0.45);
			sk.faseLalu = p.fase;
		}
		if (p.fase === "tarik" && (p.sentak > 0 || p.lari > 0)) sk.sentakan = Math.max(sk.sentakan, 0.35);
		sk.sentakan = Math.max(0, sk.sentakan - dt * 2.4);
		const tegangan = p.fase === "tarik" ? Math.min(1.2, p.tegang) : p.fase === "gigit" ? 0.8 : 0;
		const rasa = p.fase === "tarik" ? rasaTegang(p) : 0;
		// lewat batas atas "pas": joran gemetar (0 di batas, 1 saat akan putus)
		const gemetar = Math.max(0, rasa - 2 / 3) * 3;
		// hampir putus: kamera ikut bergetar (p.getar dikurangi sendiri tiap tick)
		if (gemetar > 0) p.getar = Math.max(p.getar, gemetar * 0.45);
		// senar mendengung makin nyaring dan makin tinggi nadanya sebelum putus
		aturSenar((rasa - 0.45) / 0.55);
		// lewat batas atas "pas", senar makin merah
		// warna dipasang per titik (vertexColors) sesuai pola senar; merahnya ikut ke kedua warna
		const sn = senarKini();
		C1.set(sn.warna).lerp(MERAH_TEGANG, gemetar);
		C2.set(sn.warna2).lerp(MERAH_TEGANG, gemetar);
		senar.material.opacity = Math.min(1, (sn.opacity * (0.7 + Math.min(1, tegangan) * 0.3)) / 0.85);
		// makin tegang makin tebal, kalau tidak merahnya tak terlihat. Lebar dalam piksel perangkat, jadi dikali rasio layar
		senar.material.linewidth = (1.2 + Math.max(0, rasa - 1 / 3) * 3.6) * gl.getPixelRatio();

		// --- joran di tangan kanan pemancing ---
		const arah = arahJoran();
		const tinggiTangan = p.perahu || p.duduk ? 0.78 : 1.12;
		const a = akar.current;
		a.position.set(posisi.x + Math.cos(arah) * 0.24 + Math.sin(arah) * 0.28, (posisi.yTampil ?? posisi.y) + tinggiTangan, posisi.z - Math.sin(arah) * 0.24 + Math.cos(arah) * 0.28);
		const s = st.current;
		let sudut = 0.5;
		let lentur = 0.06;
		if (p.fase === "siap") sudut = p.tahan ? 0.5 - p.tenaga * 1.5 : 0.55;
		else if (p.fase === "lempar") sudut = 1.2;
		else if (p.fase === "tunggu") sudut = (p.menggulung ? 0.72 + Math.sin(t * 14) * 0.03 : 0.95) + (p.colek ? Math.sin(t * 40) * 0.05 : 0);
		else if (p.fase === "gigit") {
			// joran tertarik ke depan & melengkung berat
			sudut = 0.8 + Math.sin(t * 30) * 0.05;
			lentur = 0.75 + Math.sin(t * 19) * 0.07;
		} else if (p.fase === "tarik") {
			// joran ikut terangkat tinggi saat tarikan sakti
			// hampir putus: joran ikut terseret turun ke arah ikan
			sudut = 0.3 + (p.sentak > 0 ? 0.3 : 0) + Math.sin(t * 17) * 0.02 * p.tegang - Math.max(0, p.gaya.lengan - 0.4) * 0.55 - gemetar * 0.14;
			// kendor: joran nyaris lurus; pas: melengkung; hampir putus: membungkuk dalam
			lentur = 0.08 + rasa ** 1.5 * 1.75 + sk.sentakan * Math.sin(t * 24) * 0.22;
		} else if (p.fase === "dapat") sudut = 0.15;
		s.sudut = dekati(s.sudut, sudut, p.fase === "lempar" ? 22 : 9, dt);
		s.lentur = dekati(s.lentur, lentur, 10, dt);
		// gemetar dipasang setelah penghalusan, kalau tidak getarannya teredam
		a.rotation.set(0, arah, 0);
		// saat adu tarik ujung joran ikut tertarik ke arah ikan di samping
		let sisi = 0;
		if (p.fase === "tarik") {
			const dx = p.ikanPos.x - a.position.x;
			const dz = p.ikanPos.z - a.position.z;
			sisi = Math.max(-0.7, Math.min(0.7, Math.atan2(dx * Math.cos(arah) - dz * Math.sin(arah), dx * Math.sin(arah) + dz * Math.cos(arah)))) * Math.min(1, p.tegang);
		}
		s.sisi = dekati(s.sisi ?? 0, sisi, 8, dt);
		lenturkanJoran(ruas.current, s.sudut + Math.sin(t * 41) * 0.05 * gemetar, s.lentur + Math.sin(t * 38) * 0.16 * gemetar, s.sisi);
		if (engkol.current) engkol.current.rotation.x = p.fase === "tarik" ? p.gaya.engkol : engkol.current.rotation.x + (p.menggulung ? dt * 9 : 0);
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
			lendut = gigit ? 0 : 0.11;
		} else if (p.fase === "tarik") {
			v.akhir.set(p.ikanPos.x, AIR - 0.05, p.ikanPos.z);
			ujungSenar = v.akhir;
			// di bawah rentang pas senar melendut makin dalam; di rentang pas ke atas lurus
			lendut = rasa < 1 / 3 ? 0.02 + (1 / 3 - rasa) * 0.9 : 0;
		}

		// --- riak air ---
		{
			const rs = riakSt.current;
			const tambahRiak = (x, z, besar) => {
				const r = riakData.current[rs.urut++ % riakData.current.length];
				Object.assign(r, { t: 0, x, z, besar });
			};
			if (p.fase !== rs.fase && p.fase === "tunggu") tambahRiak(p.pelampung.x, p.pelampung.z, 1.2);
			if (p.fase === "tunggu" && p.colek && !rs.colek) tambahRiak(pl.position.x, pl.position.z, 0.6);
			rs.colek = p.fase === "tunggu" && p.colek;
			rs.jeda -= dt;
			if (rs.jeda <= 0) {
				if (p.fase === "gigit") {
					tambahRiak(pl.position.x, pl.position.z, 1);
					rs.jeda = 0.3;
				} else if (p.fase === "tarik") {
					tambahRiak(p.ikanPos.x, p.ikanPos.z, 0.8 + Math.min(1, p.tegang) * 0.8);
					rs.jeda = 0.5 - Math.min(0.3, p.tegang * 0.25);
				} else if (p.fase === "tunggu") {
					tambahRiak(pl.position.x, pl.position.z, 0.35);
					rs.jeda = 2.2;
				}
			}
			rs.fase = p.fase;
			riakData.current.forEach((r, i) => {
				const m = riak.current[i];
				if (!m) return;
				r.t += dt;
				const f = r.t / 1.6;
				m.visible = f < 1;
				if (!m.visible) return;
				m.position.set(r.x, AIR + 0.012, r.z);
				m.scale.setScalar((0.3 + f * 2.2) * r.besar);
				m.material.opacity = 0.55 * (1 - f);
			});
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
			b.material.color.set(!bebasLempar(x, z, 0.2) ? "#ef4444" : p.tenaga > 0.93 ? "#fbbf24" : "#4ade80");
		}

		// --- senar melendut antara ujung joran dan ujungnya ---
		if (ujungSenar) {
			senar.visible = true;
			const jarak = v.ujung.distanceTo(ujungSenar);
			// menegang seketika, mengendur pelan
			s.lendut = dekati(s.lendut, lendut, lendut < s.lendut ? 30 : 5, dt);
			v.kontrol.lerpVectors(v.ujung, ujungSenar, 0.5);
			v.kontrol.y -= jarak * s.lendut;
			// senar kendor rebah di permukaan air, tidak menembus ke bawahnya (tengah kurva = 1/4 ujung + 1/2 kontrol + 1/4 akhir)
			if (p.fase === "tarik") v.kontrol.y = Math.max(v.kontrol.y, AIR - (v.ujung.y - AIR) * 0.5);
			// getar senar kencang: gelombang berdiri, terbesar di tengah bentangan
			const getar = s.sentakan * 0.14 + (p.fase === "gigit" ? 0.01 : Math.max(0, rasa - 1 / 3) ** 2 * 0.24);
			// senar kencang merontokkan butir air: titik jatuhnya tampak sebagai riak kecil di permukaan
			s.rontok = (s.rontok ?? 0) - dt;
			if (rasa > 0.55 && s.rontok <= 0) {
				s.rontok = 0.34 - gemetar * 0.14;
				const u = 0.25 + Math.random() * 0.6;
				p.cipratan.push({ x: v.ujung.x + (ujungSenar.x - v.ujung.x) * u, z: v.ujung.z + (ujungSenar.z - v.ujung.z) * u, besar: 0.18 + gemetar * 0.32, t0: detik() });
			}
			// Line2 menyimpan per ruas [awal, akhir]: tulis langsung, setPositions membuat buffer baru tiap frame
			const pos = senar.geometry.attributes.instanceStart.data;
			const warnaV = senar.geometry.attributes.instanceColorStart.data;
			for (let i = 0; i < N_SENAR; i++) {
				const u = i / (N_SENAR - 1);
				const a1 = (1 - u) * (1 - u);
				const b1 = 2 * (1 - u) * u;
				const c1 = u * u;
				const cv = sn.pola === "anyam" ? ((i >> 1) & 1 ? C2 : C1) : sn.pola === "pusaka" ? (i & 1 ? C2 : C1) : C1;
				tulis(warnaV.array, i, cv.r, cv.g, cv.b);
				const g = Math.sin(u * Math.PI) * Math.sin(t * 74 + u * 11) * getar;
				tulis(pos.array, i, a1 * v.ujung.x + b1 * v.kontrol.x + c1 * ujungSenar.x + g * 0.6, a1 * v.ujung.y + b1 * v.kontrol.y + c1 * ujungSenar.y + g, a1 * v.ujung.z + b1 * v.kontrol.z + c1 * ujungSenar.z);
			}
			pos.needsUpdate = true;
			warnaV.needsUpdate = true;
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
				const hadap = arahJoran() + Math.PI * p.gaya.balik;
				const tangan = {
					x: posisi.x + Math.sin(hadap) * 0.45,
					y: (posisi.yTampil ?? posisi.y) + (p.perahu || p.duduk ? 0.8 : 1.12) + Math.abs(Math.sin(t * 7)) * 0.06 + p.gaya.lompat * 0.32,
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

		// --- zoom: sedikit mendekat selama adu tarik, "dorongan" melebar sesaat di momen besar ---
		s0.fov0 ??= camera.fov;
		const fovTuju = s0.fov0 - (p.fase === "tarik" ? 5 + Math.min(1, p.tegang) * 3 : 0) + p.dorong * 10;
		if (Math.abs(camera.fov - fovTuju) > 0.05) {
			camera.fov += (fovTuju - camera.fov) * (1 - Math.exp(-(p.dorong > 0.05 ? 18 : 4) * dtMentah));
			camera.updateProjectionMatrix();
		}

		// --- guncangan kamera saat sentakan/amukan ---
		if (p.getar > 0.01) {
			const g = p.getar * 0.12;
			camera.position.x += (Math.random() - 0.5) * g;
			camera.position.y += (Math.random() - 0.5) * g;
		}
	});

	return (
		<>
			<Joran akar={akar} ruas={ruas} ujung={ujung} engkol={engkol} />
			<primitive object={senar} />
			<Pelampung g={pelampung} />
			{riakData.current.map((_, i) => (
				<mesh key={i} ref={(m) => (riak.current[i] = m)} geometry={GEO_CINCIN} visible={false}>
					<meshBasicMaterial color="#e0f2fe" transparent opacity={0} depthWrite={false} />
				</mesh>
			))}
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
